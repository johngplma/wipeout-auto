# Wipeout Auto

A Chromium-based browser extension that automatically clears browsing data when you leave a site or restart your browser. Whitelist domains where you want to stay logged in.

> Inspired by [Cookie AutoDelete](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete) (CAD), which is no longer maintained for Chromium MV3. Wipeout Auto keeps the parts of CAD I loved — auto-clean on tab close, whitelist to stay logged in, manual clean now, activity log — and adds per-category controls beyond cookies (localStorage, IndexedDB, cacheStorage, service workers, history), separate cleanup profiles for whitelisted vs non-whitelisted domains, and a browser-restart full sweep. It's MV3-native.

## What it does

- **Per-site cleanup on leave.** When the last tab on a domain is closed (or the only tab navigates away), Wipeout Auto clears that site's cookies, local storage, IndexedDB, cache storage, service workers, and history entries — after a configurable delay (default 5 seconds).
- **Whitelist to stay logged in.** Whitelisted domains keep their cookies / localStorage / IndexedDB so you don't lose login state. Cache, service workers, and history are still cleared.
- **Wildcard whitelist entries.** Add `*.example.com` to cover the apex `example.com` and every subdomain (`mail.`, `accounts.`, etc.). The leading dot prevents lookalike matches like `evilexample.com`.
- **Full sweep on browser startup.** Optionally, clears all non-whitelisted domains plus a global pass for cache, downloads, form data, and history.
- **Activity log.** Every cleanup is logged with the trigger, domain, whitelist status, categories cleared, and cookie count. Capped at 2000 entries; entries older than 30 days auto-purge.

## Install (developer / unpacked)

1. Clone or download this repository.
2. Open `chrome://extensions/` in Chrome (or any Chromium browser — Edge, Brave, Arc).
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked**.
5. Select the `wipeout-auto/` folder.

The Wipeout Auto icon appears in the toolbar. Click it to whitelist the current site or run an immediate cleanup. Right-click the icon → **Options** for full settings.

## Using it

### Popup (toolbar icon)

- Shows the current site, the live cookie count, and up to three whitelist candidates (parent-wildcard, self-wildcard, apex). Click **Whitelist** / **Remove** to toggle each.
- **Clean Now** clears the current site immediately. If the site is whitelisted, you'll get a confirmation prompt — proceeding overrides the whitelist for that single cleanup.
- "Last cleaned for <site>" line shows the most recent cleanup timestamp.
- **Open Settings** opens the full settings page.

### Settings page

- **Whitelist:** add, remove, or review whitelisted domains. Apex (`example.com`) and wildcard (`*.example.com`) are stored as separate entries. **Export** / **Import** buttons let you back up the whitelist as a plain JSON array of strings, e.g. `["*.google.com", "github.com"]`.
- **Advanced settings:**
  - **Auto-cleanup delay** (0–30 seconds). The grace period between a tab closing and cleanup firing. Reopening the site within this window cancels the cleanup.
  - **Categories to clear**, separately for non-whitelisted vs whitelisted domains. Defaults: non-whitelisted clears everything; whitelisted preserves cookies / localStorage / IndexedDB.
  - **Browser startup full sweep** toggle. The categories cleared at startup are not individually configurable — only the toggle.
  - **Reset to defaults** button restores the original advanced settings.
- **Activity log** with relative timestamps (hover for absolute), trigger, domain, whitelist status, categories cleared, and cookie count. Filter by domain.

## Known limitations

- **30-second max delay.** MV3 service workers shut down after periods of inactivity; `setTimeout` keeps them alive only briefly. We cap the delay at 30 seconds so cleanups always fire reliably.
- **HTTP cache, downloads, and form data are not per-origin clearable.** They get cleared globally during the startup full sweep, never on per-site events.
- **Startup sweep misses cookieless domains.** The sweep iterates domains we have cookies for. Domains with only localStorage / IndexedDB and no cookies aren't enumerated. They still get cleaned when their tabs close during normal browsing.
- **History clearing has a 1000-result cap.** `chrome.history.search` is queried per cleanup — unlikely to be hit in practice unless you have hundreds of visits to a single domain since the last cleanup.
- **First sweep after install is global.** To avoid spamming the log with one entry per domain on the very first browser restart, the initial sweep clears everything globally and writes a single `startup-initial` summary entry.

## Files

- `manifest.json` — MV3 manifest.
- `background.js` — service worker. Handles event listeners, cleanup logic, message bus, full sweep, scheduling.
- `lib/domain-utils.js` — shared utilities (URL parsing, wildcard matching, input validation). Loaded by popup/settings via `<script>` and by the service worker via `importScripts`.
- `popup.html` / `popup.js` / `popup.css` — toolbar popup.
- `settings.html` / `settings.js` / `settings.css` — full settings page.
- `icons/` — placeholder icons (16/48/128 px).

## Documentation

Full user docs live in the [GitHub Wiki](https://github.com/johngplma/wipeout-auto/wiki) — installation, whitelist semantics (apex vs. wildcard, ccTLDs), category reference, settings, activity log, and FAQ. The source for the wiki is in [`wiki/`](wiki/).

## Privacy

Wipeout Auto runs entirely locally. No telemetry, no analytics, no network requests. All data (whitelist, settings, logs) lives in `chrome.storage.local` on your machine. See [PRIVACY.md](PRIVACY.md) for the full policy.

## Publishing to the Chrome Web Store

The repo is structured for direct upload — no build step.

1. **Bundle the extension.** Create a zip of the project root containing `manifest.json`, `background.js`, `popup.{html,js,css}`, `settings.{html,js,css}`, `lib/`, and `icons/`. Exclude `README.md`, `PRIVACY.md`, screenshots, and any `.git` artifacts.
   ```sh
   zip -r wipeout-auto-0.1.0.zip manifest.json background.js \
     popup.html popup.js popup.css \
     settings.html settings.js settings.css \
     lib icons
   ```
2. **Create a developer account** at <https://chrome.google.com/webstore/devconsole> ($5 one-time fee).
3. **Upload the zip** as a new item.
4. **Fill in the listing:**
   - Detailed description (use this README as a starting point).
   - At least one 1280×800 or 640×400 screenshot of the popup or settings page.
   - 128×128 store icon (`icons/icon-128.png` works as a starting point — replace with a higher-fidelity version before launch).
   - Privacy policy URL — paste the URL where you host `PRIVACY.md` (GitHub raw URL works).
   - Single purpose: "Automatically clear browsing data when leaving a site, with a configurable whitelist."
   - Permission justifications — copy the table from `PRIVACY.md`.
5. **Submit for review.** First-time reviews can take several days.
