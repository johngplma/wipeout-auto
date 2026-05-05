# Installation

## Chrome Web Store

> Once published — not yet available.

Install from the Chrome Web Store, click **Add to Chrome**, and confirm the permissions prompt.

## Unpacked (developer install)

Use this if you want to install from source, contribute, or run a fork.

1. Clone or download the repository:
   ```sh
   git clone https://github.com/johngplma/wipeout-auto.git
   ```
2. Open `chrome://extensions/` in Chrome (or any Chromium browser — Edge, Brave, Arc, Vivaldi).
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked**.
5. Select the `wipeout-auto/` folder.

The Wipeout Auto icon will appear in the toolbar. Click it to whitelist the current site or run an immediate cleanup. Right-click the icon → **Options** for full settings.

## Permissions requested

| Permission | Why it's needed |
| --- | --- |
| `storage` | Save the whitelist, settings, and activity log to `chrome.storage.local`. |
| `tabs` | Detect when a tab closes or navigates away from a domain so cleanup can fire. |
| `browsingData` | Clear cookies, localStorage, IndexedDB, cache, service workers, etc. |
| `cookies` | Count cookies for the activity log; enumerate domains during the startup full sweep. |
| `history` | Remove history entries for cleaned domains. |
| `host_permissions: <all_urls>` | Cleanups must work on any domain you visit. The extension never reads page contents. |

No data leaves your machine. See [PRIVACY.md](https://github.com/johngplma/wipeout-auto/blob/main/PRIVACY.md) for details.

## Updating

- **Web Store install** — Chrome auto-updates the extension.
- **Unpacked install** — `git pull` in the project folder, then click the reload icon for Wipeout Auto on `chrome://extensions/`.

## Uninstalling

Right-click the toolbar icon → **Remove from Chrome…**, or remove from `chrome://extensions/`. All stored data (whitelist, settings, logs) is deleted with the extension.
