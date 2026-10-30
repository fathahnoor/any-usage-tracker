# Direct API migration

Objective: retrieve Codex, OpenRouter, Telkomsel and Tri data from the local dashboard server without opening provider pages or maintaining a browser window during refresh.

## Questions and evidence

1. Identify data endpoint, HTTP method, request shape and response fields for each web provider from shipped JavaScript and read-only observations.
2. Identify the provider authentication contract, token/session expiry and supported renewal path. Credentials must never appear in tool output or evidence notes.
3. Determine whether login can be implemented locally or uses an official API credential. Do not confuse unauthenticated public HTML with private account data.
4. Build provider-specific clients with injected fetch/auth and meaningful response validation. Validate account-wide annual OpenRouter totals against the existing source, not lifetime/per-key credit totals.
5. Store any newly authorized provider session encrypted for the current Windows user. No plaintext credentials in cache, logs, source, chat or browser responses.
6. Replace browser-backed runtime only after supported direct paths have been demonstrated. Document a specific remaining login/provider limitation if it cannot be verified.

## Work allocation

- OpenRouter API and authentication evidence: provider worker.
- Telkomsel API and authentication evidence: provider worker.
- Tri API and authentication evidence: provider worker.
- Shared server/session storage/setup UI and integration: primary agent.

Preserve the approved compact UI. No purchases, plan changes, credential creation, OTP sending or account modifications occur automatically during investigation.
