# FAQ

## I whitelisted `*.google.com` but I still got logged out of YouTube / Gmail / Drive / etc.

Two possibilities:

1. **You restarted the browser before adding `*.google.com`.** The startup full sweep ran first and cleared the auth cookies. Add the entry, then everything will persist on subsequent restarts.
2. **A regional Google TLD got cleaned.** `*.google.com` does not cover `google.com.ph`, `google.co.uk`, etc. Add the regional ccTLDs separately if you use them. See [Whitelist → Country-code TLDs](Whitelist#country-code-tlds-and-regional-sites).

For non-Google sites you visit through Google sign-in (e.g. third-party SaaS), the sign-in flow redirects to `accounts.google.com`, which is covered by `*.google.com`. You don't need to whitelist the third-party site to get auto-signed-in there — closing its tab will still wipe the third-party's local state, but the next visit re-authenticates seamlessly.

## A site keeps logging me out even after I whitelist it.

Check whether it puts auth on a different host than the one you visit. For example:

- `notion.so` redirects auth through `*.notion.com` (a different registered domain).
- Many SaaS apps put auth tokens on `auth.<service>.com` while you visit `app.<service>.com`.

Open the site, watch the **Whitelist Options** in the popup, and whitelist whatever wildcard option covers the auth host. If unsure, whitelist both the apex domain you visit and a `*.<auth-host>.com` for the auth host you see during sign-in.

## Why is the auto-cleanup delay capped at 30 seconds?

MV3 service workers shut down when idle. `setTimeout` keeps the worker alive only as long as the timer is pending, and Chrome can still kill the worker under memory pressure. Capping at 30 seconds keeps cleanups reliable.

## Does the extension work in Incognito?

Not by default. Chrome requires you to explicitly allow extensions in Incognito on a per-extension basis. Open `chrome://extensions/`, find Wipeout Auto, click **Details**, and enable **Allow in Incognito**. Note that Incognito sessions are already cleared when the last Incognito window closes — so the extension is mostly redundant there.

## Will it work in Firefox?

Not currently. The extension is built for Chromium-based browsers (Chrome, Edge, Brave, Arc, Vivaldi, Opera). Firefox uses a different MV3 implementation and has different APIs for `browsingData`. A Firefox port is plausible but not on the roadmap yet.

## Why does the activity log show a domain I never visited?

Cookies travel. A site you visited may have set cookies for an embedded third-party (CDN, analytics, fonts). The startup sweep iterates **every domain you have a cookie on**, not just sites you intentionally visited.

## How do I back up my whitelist?

Open settings → **Whitelist** → **Export**. Save the JSON file somewhere safe. To restore on another machine or after reinstall, use **Import**.

## Does this extension send anything to a server?

No. Wipeout Auto makes zero network requests. All logic runs locally; all data stays in `chrome.storage.local`. See [PRIVACY.md](https://github.com/johngplma/wipeout-auto/blob/main/PRIVACY.md).

## How is this different from Cookie AutoDelete?

Wipeout Auto is built in the same spirit as [Cookie AutoDelete](https://github.com/Cookie-AutoDelete/Cookie-AutoDelete) (CAD), which is no longer maintained for Chromium MV3. Compared to CAD it adds: per-category controls beyond cookies (localStorage, IndexedDB, cacheStorage, service workers, history), separate cleanup profiles for whitelisted vs. non-whitelisted domains, and a browser-restart full sweep. It's MV3-native.

## I broke something. How do I reset?

- Reset advanced settings: **Settings → Reset to defaults**.
- Reset whitelist: remove all entries, or open `chrome://extensions/`, click **Details** on Wipeout Auto → **Extension options** → remove from the list. Or remove and reinstall the extension (this also wipes the activity log).
