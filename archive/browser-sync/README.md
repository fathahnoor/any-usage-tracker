# Historical browser-backed collector

These files preserve the earlier minimized-window experiment. They are not imported by `server.js` or `lib/sources.js` and do not run during dashboard refresh.

The active implementation uses direct HTTP provider clients and Windows DPAPI session storage. `lib/neo.js` remains available only for the explicit one-time session import and masked screenshot tooling.
