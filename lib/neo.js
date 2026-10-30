"use strict";
const fs = require('node:fs');
class Neo {
  constructor(endpoint = process.env.BROWSEROS_MCP_URL || 'http://127.0.0.1:9010/mcp') {
    this.endpoint = endpoint; this.id = 0; this.session = null;
  }
  async rpc(method, params) {
    const headers = {'Content-Type':'application/json', Accept:'application/json, text/event-stream'};
    if (this.session) headers['mcp-session-id'] = this.session;
    const r = await fetch(this.endpoint, {method:'POST', headers, body:JSON.stringify({jsonrpc:'2.0',id:++this.id,method,params}), signal:AbortSignal.timeout(40000)});
    if (!r.ok) {if(r.status===404){this.session=null;this.runName=null;}throw new Error('BrowserOS MCP HTTP ' + r.status);}
    this.session = r.headers.get('mcp-session-id') || this.session;
    const body = await r.text();
    const messages = body.trim().startsWith('{') ? [JSON.parse(body)] : body.split('\n').filter(s=>s.startsWith('data: {')).map(s=>JSON.parse(s.slice(6)));
    const msg = messages.find(x=>x.id===this.id);
    if (!msg) throw new Error('Respons BrowserOS tidak terbaca');
    if (msg.error) throw new Error(msg.error.message);
    return msg.result;
  }
  async init() {
    await this.rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'any-usage-tracker',version:'1.0.0'}});
    const result = await this.rpc('tools/list',{});
    this.toolNames = Object.fromEntries(result.tools.map(t=>[t.name,t.name]));
    this.runName = result.tools.find(t=>t.name==='run' || t.name.endsWith('_run'))?.name;
    if (!this.runName) throw new Error('Tool run BrowserOS tidak tersedia');
  }
  async run(code) {
    return this.tool('run',{code});
  }
  async tool(name,args) {
    if (!this.runName) await this.init();
    const toolName=name==='run'?this.runName:Object.keys(this.toolNames).find(n=>n===name||n.endsWith('_'+name));
    if(!toolName)throw new Error('Tool BrowserOS tidak tersedia: '+name);
    const r = await this.rpc('tools/call',{name:toolName,arguments:{...args, ...(this.logicalSession ? {session:this.logicalSession}: {})}});
    const logical = r._meta?.['com.browseros.neo/session'];
    if(logical) this.logicalSession = logical;
    if(r.isError || r.structuredContent?.ok===false) throw new Error(r.structuredContent?.error || r.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n') || 'BrowserOS gagal');
    if(r.structuredContent) return r.structuredContent.value ?? r.structuredContent;
    const text = r.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n') || '';
    if(name!=='run')return {ok:true,text};
    const start = text.indexOf('return: ');
    if(start>=0) { try { return JSON.parse(text.slice(start+8).split('\nTip:')[0]); } catch {} }
    throw new Error('BrowserOS tidak mengembalikan data terstruktur');
  }
  static value(result) {
    if(result?.writtenToFile && result.path) {
      const text = fs.readFileSync(result.path,'utf8');
      const start = text.indexOf('\n'); const end = text.lastIndexOf('[END_UNTRUSTED_PAGE_CONTENT');
      return JSON.parse(text.slice(start+1,end>0?end:undefined).trim());
    }
    return result?.value ?? result;
  }
}
module.exports = {Neo};
