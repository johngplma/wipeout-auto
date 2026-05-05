# Wipeout Auto

A Chromium-based browser extension that automatically clears browsing data when you leave a site or restart your browser. Whitelist domains where you want to stay logged in.

## What it does

Wipeout Auto watches for two events and runs cleanups:

1. **Tab cleanup** — when the last tab on a domain closes (or the only tab navigates away), the site's data is cleared after a short delay.
2. **Startup full sweep** — when the browser starts, every domain that isn't whitelisted gets cleaned, plus a global pass for HTTP cache, downloads, form data, and history.

Whitelisted domains keep their cookies, localStorage, and IndexedDB by default — so you stay logged in. Everything else can be configured per-category.

## Documentation

- **[Installation](Installation)** — how to install from the Chrome Web Store or as an unpacked extension.
- **[Whitelist](Whitelist)** — apex vs. wildcard entries, examples, import/export.
- **[Categories](Categories)** — what each storage category is and why you might or might not want to clear it.
- **[Settings](Settings)** — auto-cleanup delay, startup full sweep, theme.
- **[Activity Log](Activity-Log)** — what gets logged and how to read it.
- **[FAQ](FAQ)** — common questions and troubleshooting.

## Privacy

Wipeout Auto runs entirely locally. No telemetry, no analytics, no network requests. All data (whitelist, settings, logs) lives in `chrome.storage.local` on your machine. See [PRIVACY.md](https://github.com/johngplma/wipeout-auto/blob/main/PRIVACY.md) in the repo for the full policy.
