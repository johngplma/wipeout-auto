# Privacy Policy — Wipeout Auto

_Last updated: 2026-05-05_

Wipeout Auto is a browser extension that automatically clears local browsing data on your device. **It does not collect, transmit, sell, or share any personal information.** This document explains what the extension stores locally and why each browser permission is required.

## What Wipeout Auto stores

The extension stores the following data locally on your device, using `chrome.storage.local` and `chrome.storage.session`:

- **Whitelist** — the list of domains and wildcard patterns you have whitelisted.
- **Settings** — your auto-cleanup delay, category preferences, full-sweep toggle, and theme preference.
- **Activity log** — up to 2,000 entries describing each cleanup action (timestamp, domain, what was cleared, cookie count). Entries older than 30 days are automatically purged.
- **Tab → domain map** — an in-memory map (not persisted across browser restarts) used to detect when a domain's last tab is closed.

This data never leaves your device. Wipeout Auto makes no network requests of its own.

## What Wipeout Auto does NOT collect

- No analytics or telemetry
- No personally identifying information
- No browsing history (the extension may *delete* history entries, but it never reads them for any purpose other than matching the domain to delete)
- No cookies content (the extension counts and deletes cookies; it does not read their values)
- No third-party services, SDKs, or tracking scripts

## Permissions used

Wipeout Auto requests the following browser permissions, each strictly required for its core functionality:

| Permission | Why it's needed |
|---|---|
| `storage` | Save your whitelist, settings, and activity log on your device. |
| `tabs` | Detect when the last tab on a domain is closed or navigates away, which is the trigger for per-domain cleanup. |
| `browsingData` | Clear cookies, local storage, IndexedDB, cache, service workers, and downloads — the actual cleanup operation. |
| `cookies` | Count cookies for the current site (shown in the popup) and during cleanup logging. |
| `history` | Clear history entries for a specific domain. The extension does not read your history for any other purpose. |
| `<all_urls>` (host permission) | Required by the APIs above to operate on any site you visit. The extension never injects code into web pages. |

## Local-only by design

Wipeout Auto is intentionally a fully local extension:

- No background server, no cloud sync, no account required
- No update telemetry beyond what Chrome itself sends to the Web Store
- The full source code is published; you can inspect or build it yourself

## Data deletion

To delete all data Wipeout Auto has stored, simply uninstall the extension from `chrome://extensions/`. Chrome removes all extension storage automatically.

You can also clear the activity log at any time from the settings page.

## Contact

For questions or issues, please open an issue on the project's GitHub repository.

## Changes to this policy

Any future changes to this policy will be reflected in this file. Significant changes will be noted in the extension's release notes on the Chrome Web Store.
