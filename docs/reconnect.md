# Reconnect web accounts

Users can reconnect Telkomsel, Tri and OpenRouter from their dashboard cards.
The dialog links to the provider login in BrowserOS neo. After signing in,
users keep that tab open and select "Saya sudah login" in NEXUS.

Acceptance criteria:
- Import only the selected provider, validate it with a real usage read, then
  save the verified session encrypted through the running server's vault.
- Publish fresh data immediately, without a server restart or terminal command.
- Serialize with refreshes, deduplicate repeated requests, and preserve the
  previous session and usage when login verification fails.
- Reject unknown providers and cross-origin mutation requests. Never return
  credentials or raw browser errors to the dashboard.
- Show pending, success and actionable failure messages in an accessible dialog.

Implementation order: importer and source validation, refresh coordination and
HTTP route, dashboard dialog, automated tests and BrowserOS verification.
Use Node's built-in test runner. No dependencies are required.
