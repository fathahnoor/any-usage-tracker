# Tri direct connector evidence

Acquired on 2026-10-31 through BrowserOS neo page 186. Public script acquisition only; account token values are not included in this directory.

- Source: https://bimatri.ioh.co.id/main.344d2a115e6704f9.js
- Local file: main.js
- SHA256: 5d964b0e8224ef64eb77a2ee5e2d9a90d3cd289e712dd95d154bdc467004b026
- REA analysis Evidence: ev_42a061ca27cf31efc811524eec4afea0b21e4e5dcba1752aaaf3651c43df37c1
- REA summary view Evidence: ev_aeaba8386aa8947de11fb685e7c0626a40d0b7f7c4d4e8ddf03261811858c367

REA parsed the public bundle without executing it. The 60-second analysis timed out after parsing 808108 AST nodes. The retained semantic/application analysis is partial: 12 semantic unknowns, 2 application graph unknowns. Static code and schema inspection establish the connector contract. Root integration subsequently reported HTTP 200 from the direct authenticated request using the authorized DPAPI session migration. No account credential values were returned to this worker.

## Contract recovered from the shipped PWA

The Tri dashboard sends POST https://bimaplus-api.ioh.co.id/api/v2/dashboard/get/v4 with the JSON body `{}`. Reading the dashboard is sufficient for prepaid balance, active period, total quota, and active packages. No purchase, package cancellation, or profile mutation is performed.

The session store prefixes names with `b-` and stores UTF-8 string values as base64. Selected bootstrap keys are b-X-IMI-TOKEN, b-FINGERPRINT, b-MSISDN, b-MSISDNCHILD, b-LANG, and b-FIREBASE_INSTALLATION_ID. The current parent-account session has no b-MSISDNCHILD key. The connector's sessionFromStorage function decodes the transferred map locally. Do not log the map or resulting session.

Source locations are UTF-16 character offsets in main.js:

| Offset | Observation |
| --- | --- |
| 34923 | Default Windows browser OS header is BROWSER |
| 42078, 49026 | Dashboard endpoint /dashboard/get/v4 |
| 838700 | Local-session key prefix and encoded storage |
| 863183 | summary.data.remainingquota is scaled from KB through MB to GB |
| 867531 | Dashboard POST body is an empty object |
| 1236102 | SHA512 signing and salt extraction |
| 1236400 | Storage encoding is base64 |
| 1463000 | API base and public client configuration |
| 1885600 | Package page obtains packdata.packageslist from dashboard |
| 3052600 | Request header interceptor and response signature verification |

Every request signs `REQBODY=<serialized JSON>&SALT=<token characters at indexes 0,2,4,...>` with SHA512. X-IMI-HASH signs `<child ciphertext or parent>$BROWSER$5.2.0$<token>&SALT=<request UID characters at indexes 0,2,4,...>`. The remaining headers mirror the PWA, including the public Authorization and service-key constants, token ID, device ID, language, UID, and optional Firebase installation ID. A nonempty response Oauth header is checked against uppercase SHA512 of `REQBODY=<raw response text>&SALT=<UID salt>`.

Child-line encryption comes from public https://bimatri.ioh.co.id/vendor.c63fb3ad61838a40.js module 2116 at offset 593334. It is RC4 with the shipped key `123`, lowercase hex output, applied after normalizing the selected line to country-code 62. The connector includes the matching header and signature. The algorithm is covered with the standard RC4 Key/Plaintext test vector.

The live cached dashboard was inspected for field names and quota unit names only. Confirmed structure: prepaidinfo.balance/cardactiveuntil, summary.data.remainingquota, packdata.packageslist[*].PackageName/ServiceDescription/EndDate/EndTime/Quotas. Confirmed quota fields: remainingQuota, initialQuota, quotaUnit, benefitType. Current schema units include DATA/MB and VOICE/Menit. Runtime response values are not recorded here.

No refresh-token endpoint was established. The PWA exposes /token/validate, /token/guest, /otp/send/v1, and /otp/validate/v1; these names alone do not establish a complete direct login or renewable-session protocol. The connector requests a new connection when HTTP 401/403 or an expired-session application code is returned. Code 10002 is a special return path in the interceptor with an unproven exact meaning, so the connector treats it conservatively as reconnect required.

Verification: `node --test test/direct-tri.test.js`, 5 tests passing. Tests cover local session decoding, both request signatures, child-line RC4, quota conversion, DATA-first ordering even when VOICE is supplied first, Indonesian expiry formatting, direct POST, optional response signature rejection, and sanitized expiration errors. Amounts are rounded to two decimals after category totals are summed; units remain separate.
