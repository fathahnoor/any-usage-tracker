# Telkomsel direct API investigation

Date: 2026-10-31, WIB.

## Evidence

- Public bundle fetched through BrowserOS neo: https://www.telkomsel.com/user/main-ZVXRRHC5.js and imported chunks ATOUOZUY, SBAYYPCN, EXMGW74O, AEZMAUCF, FCZPLFN2. Exact local copies in data/research/telkomsel (no account credentials).
- REA parent Evidence: ev_71ef2e5b7bffd24470f64eb64e9da25e5d616457e3f2847aa00807ada4eefa49. Summary Evidence: ev_fd9c8bbb7a7d03fa436aa5ab41782a2a2c7f39ece6391b79fbdcc9485d51d6fa. Initial artifact digest f9562bbf3f21b53774c39b1bbcd7ab9ceb97effe3a2d90f50f0a5c7193249894 covers five files before FCZPLFN2 was added.
- REA parsed five files, zero parse failures. Static semantic coverage partial, unknown retention limit reached. Static analysis does not establish runtime execution or direct HTTP success.
- Runtime BrowserOS in-page read-only API requests corroborated all three customer routes returned HTTP 200 and code WCUS01001 when device-id was supplied along with the browser cookie session. No credential values were retained or printed by this investigation.

## API contract

Base https://www.telkomsel.com. Private GET requests include device-id, Accept-Language: ID, and cookie session. The device-id source in the public application is localStorage key deviceId. Static auth interceptor adds withCredentials for non-public paths.

- GET /api/customer/v1/profile: data identifier, serviceType, balance, gracedate, canceldate, status.
- GET /api/customer/v1/active-bonuses?serviceType=SIMPATI: data activeBonuses (internet/application/voice/sms), each remaining and total are quantity strings, plus dataUpdated.
- GET /api/customer/v1/active-offers: data.tabs [{label,list}]; list may be null. Offer fields packageName, remaining, total, expiryDate, remainingDays, percentage, isSubscribed, productType.
- POST /api/auth/v1/session/refresh body {}: cookie session, device-id, Accept-Language. Success HTTP 200, code WAUS01001, data.expired is TTL seconds. Default browser TTL is 86400 seconds with minimum 60.
- Browser sessionExpiry cookie uses URLSearchParams fields expiry and sessinToken (typo in public code), falling back to sessionToken. This cookie is not sufficient evidence that it alone authenticates customer endpoints. Preserve scoped HttpOnly session cookies as well.
- Angular default XSRF cookie/header names are XSRF-TOKEN and X-XSRF-TOKEN, if present.

## Implementation

lib/direct-telkomsel.js exposes readTelkomsel(session,{fetchImpl,saveSession}) and normalizeTelkomsel(profile,bonuses,offers). Session shape is {cookies:[cookie objects],deviceId}. Set-Cookie changes are absorbed through shared CookieJar; refreshed state is passed to saveSession. One HTTP 401 refresh and retry is supported. Exhausted sessions raise a clear error instead of returning zero balances.

Three fixture tests pass. Browserless live test requires the root agent's approved DPAPI session migration; this subtask did not export real cookie or device-id values. Browser long-term refresh cookie lifetime remains server-controlled and unknown.

### Browser transport observation

The existing Telkomsel source page resource timing reports nextHopProtocol h2 and responseStatus 200 for profile, active-bonuses and active-offers. A root-agent direct Node fetch probe initially returned HTTP 403. The connector now supplies the migrated browser User-Agent when present, standard JSON Accept and Fetch Metadata headers, and only sends Origin/XSRF headers on POST. Authentication failure versus transport/WAF rejection remains unresolved pending the direct retry; HTTP2 is a bounded next hypothesis, not a proven fix.
