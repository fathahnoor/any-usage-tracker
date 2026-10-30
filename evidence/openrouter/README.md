# OpenRouter direct HTTP evidence

Scope: account-owned activity totals for the rolling past year, with one-time authorized browser session migration. Credentials are not part of these artifacts. Public JavaScript was acquired through BrowserOS; REA analyzed inert local source. No credentials, private cookies or JWT values were printed or stored in this evidence directory.

## Observed contracts

- Official OpenAPI at https://openrouter.ai/openapi.json: `GET /api/v1/activity` supports the last 30 completed UTC days and requires a management key. `GET /api/v1/credits` is lifetime purchased/used credit. Neither establishes exact annual account spend. The connector does not substitute these values.
- Public website activity chunk: https://openrouter.ai/_next/static/immutable/chunks/0qwalueb7r6v-.js, saved as `data/research/openrouter/analytics-0.js`.
- Account analytics: `POST https://openrouter.ai/api/frontend/v1/private/analytics-query`, JSON with metrics, model dimension, day granularity, `Asia/Jakarta`, explicit annual `time_range`, date ordering and enrichment. No TopN restriction. Authentication uses the OpenRouter session cookie. Response: `{data:{data:[{date__day,model,total_usage,request_count,tokens_total,tokens_prompt,tokens_completion}],metadata:{truncated:false},labels:{model:{...}}}}`. Existing `normalizeOpenRouter` rejects truncated responses.
- Public auth implementation: https://clerk.openrouter.ai/npm/@clerk/clerk-js@6.41.0/dist/clerk.browser.js, saved as `data/research/openrouter/clerk.browser.js`.
- Runtime inspection of `Clerk.session.getToken({skipCache:true})`, with temporary fetch wrapper restored in `finally`, verified `POST https://clerk.openrouter.ai/v1/client/sessions/{sessionId}/tokens?debug=skip_cache&__clerk_api_version=2026-08-20&_clerk_js_version=6.41.0`. Form keys: `organization_id`, `tab_state`, `token`, `force_origin`. SDK source establishes previous JWT as `token`, `hidden` for background state and `true` for `force_origin`. Request uses Clerk-domain cookies. The runtime response shape is exactly top-level `{object,jwt}`. Runtime output was limited to keys, URL with session ID replaced, and status; token values were excluded.
- Runtime JWT claims inspection established a 60-second token lifetime. The client session has a separate longer revocable lifetime. This is not a promise that login remains valid until any particular date.

## Bootstrap and renewal

The vault entry supplied by the caller is `{sessionId,sessionToken,cookies,organizationId?,userAgent?}`. `cookies` contains the authorized CDP cookie objects for both `openrouter.ai` and `clerk.openrouter.ai`, retaining HttpOnly and expiry metadata. `sessionId` comes from `Clerk.session.id`; `sessionToken` comes from `Clerk.session.getToken()`; optional organization is `lastActiveOrganizationId`.

The connector uses an injected fetch implementation and CookieJar, sends renewal only to the fixed Clerk origin, renews when JWT expires within 10 seconds, and synchronizes `__session` plus existing suffixed `__session_*` cookies on the OpenRouter domain. Session rotation goes only to caller-provided `saveSession`. An analytics 401 triggers one renewal/retry. Revocation or client-cookie expiry requires reconnecting the account. Browser access is not part of routine refresh. Private endpoint and Clerk version are undocumented implementation details and can change.

## REA evidence

1. Analytics directory source analysis: parent `ev_2af9c75a4ff1b8a0732b9e36e72e5f4bedaa5628064ff00ad2460321e95bb8cd`, summary `ev_159f976c91f4e518d55e1f038ecfe8fd9eaf1d81b3f0cb937fc046b68232ad71`, artifact SHA256 `bfaec005b8c0c6c315abfcedba6b54c4752e99dcab9486bacf273aa2fdbd3265`. Application coverage complete for selected artifact directory; semantic coverage partial due node ceilings. 1,690 unknowns remain. This is static evidence, not execution proof.
2. Clerk selected-source analysis: parent `ev_c48d14868e0a0ef54223d62d42cda90934f2c7ae4135c9fdf3aeab54507e183e`, summary `ev_dd09c90ae7848abfa2dcdcb186e795bb7e6be1f02d96d0a4da55724b46883f51`, artifact SHA256 `3e8236ba329d5bd8e6b8c3547b40a00f1799698f6490b8f6adaaa5a3f8086e8e`. Parsed one JavaScript source, visited 79,960 AST nodes, 74 findings across 6 modules. Application coverage partial because two files were outside source selection; semantic coverage partial/truncated at configured ceilings. 13,232 unknowns, including 2 application unknowns. Dynamic code paths and unselected dependencies are not established by this analysis.

## Verification

`node --test test/direct-openrouter.test.js`: three passing injected-fetch contract tests covering expired JWT renewal and complete annual normalization, signed-out renewal failure, and truncated-result rejection.

The parent integration subsequently verified live direct HTTP using the authorized session imported into the encrypted vault. Annual analytics returned total spend `66.785008` USD, `3147295304` tokens and `11953` requests. After waiting more than the observed 60-second JWT lifetime, direct Clerk renewal returned HTTP 200 and the connector continued without BrowserOS. These are observations from that live verification, not current account balances or a guarantee of future session validity. Credential values remained excluded from tool output and evidence.
