"use strict";
const fs=require("node:fs"), os=require("node:os"), path=require("node:path");
const {spawn}=require("node:child_process");
const RPC_TIMEOUT_MS=25000;
function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

/** Info akun (email + plan) - dibaca lokal, token tidak pernah dikirim keluar. */
function accountInfo() {
  const out = { email: null, planType: null, authMode: null, accountId: null, authFileOk: false };
  try {
    const auth = JSON.parse(fs.readFileSync(path.join(codexHome(), "auth.json"), "utf8"));
    out.authMode = auth.auth_mode || null;
    out.accountId = (auth.tokens && auth.tokens.account_id) || null;
    const tok = auth.tokens && (auth.tokens.access_token || auth.tokens.id_token);
    if (tok) {
      const claims = decodeJwt(tok);
      out.email = claims.email || out.email;
      out.planType = claims.chatgpt_plan_type || out.planType;
      const authBlock = claims["https://api.openai.com/auth"];
      if (authBlock && authBlock.chatgpt_plan_type) out.planType = authBlock.chatgpt_plan_type;
      const profile = claims["https://api.openai.com/profile"];
      if (profile && profile.email) out.email = profile.email;
    }
    out.authFileOk = true;
  } catch (e) {
    out.error = "auth.json tidak terbaca: " + e.message;
  }
  return out;
}

function decodeJwt(token) {
  try {
    return JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString("utf8"));
  } catch (e) {
    return {};
  }
}

/** Lokasi binary codex.exe / codex. */
function findCodex() {
  const win = process.platform === "win32";
  const candidates = [
    process.env.CODEX_BIN,
    path.join(codexHome(), "packages", "standalone", "current", "bin", win ? "codex.exe" : "codex"),
    win ? path.join(process.env.LOCALAPPDATA || "", "Programs", "OpenAI", "Codex", "bin", "codex.exe") : null,
    "/usr/local/bin/codex",
    "/opt/homebrew/bin/codex",
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch (e) {
      /* lanjut */
    }
  }
  return win ? "codex.exe" : "codex";
}

/* --------------------------- rate limit reader --------------------------- */

/**
 * Panggil `account/rateLimits/read` pada codex app-server.
 * Resolve dengan objek hasil; reject bila gagal/timeout.
 */
function readRateLimits() {
  const bin = findCodex();
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(bin, ["app-server"], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (e) {
      return reject(new Error("gagal menjalankan codex app-server: " + e.message));
    }

    let buf = "";
    let stderr = "";
    let settled = false;
    const startedAt = Date.now();

    const cleanup = (code, payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.stdin.end();
      } catch (e) {}
      try {
        child.kill();
      } catch (e) {}
      code === 0 ? resolve(payload) : reject(new Error(payload));
    };

    const timer = setTimeout(() => cleanup(1, "timeout menunggu codex app-server (" + RPC_TIMEOUT_MS / 1000 + "s)"), RPC_TIMEOUT_MS);

    const send = (msg) => {
      try {
        child.stdin.write(JSON.stringify(msg) + "\n");
      } catch (e) {}
    };

    child.on("error", (e) => cleanup(1, "binary codex tidak ditemukan / tidak bisa dijalankan: " + e.message));

    child.stdout.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch (e) {
          continue;
        }
        if (msg.id === 1) {
          send({ jsonrpc: "2.0", method: "initialized", params: {} });
          send({ jsonrpc: "2.0", id: 2, method: "account/rateLimits/read" });
        } else if (msg.id === 2) {
          if (msg.error) {
            cleanup(1, "RPC error: " + JSON.stringify(msg.error));
          } else {
            const result = msg.result || {};
            cleanup(0, {
              fetchedAt: Date.now(),
              fetchMs: Date.now() - startedAt,
              source: "codex app-server · account/rateLimits/read",
              codexBin: bin,
              ...result,
            });
          }
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    child.on("exit", (code) => {
      if (!settled) cleanup(1, "codex app-server berhenti (exit " + code + ")\n" + stderr.slice(-1200));
    });

    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { clientInfo: { name: "codex-quota", version: "1.0.0" }, capabilities: {} },
    });
  });
}


module.exports={readRateLimits,accountInfo};
