# Categories

Wipeout Auto can clear six categories of site data. Each can be toggled independently for **non-whitelisted** domains and **whitelisted** domains in **Settings → Advanced settings → Categories to clear**.

## Cookies

Small text files that store session tokens, login state, preferences, tracking IDs, etc. Clearing cookies almost always logs you out of a site.

- **Default for non-whitelisted**: cleared
- **Default for whitelisted**: kept

## Local storage

Key/value data the site stores in the browser via `localStorage`. Often holds login tokens, drafts, settings, and feature flags. Many modern apps log you out if local storage is cleared even if cookies are kept.

- **Default for non-whitelisted**: cleared
- **Default for whitelisted**: kept

## IndexedDB

A larger structured-data store — used by web apps for offline caches, message history, attachments, and similar. Gmail, Slack, Discord, Figma, and most "app-like" sites rely on it.

- **Default for non-whitelisted**: cleared
- **Default for whitelisted**: kept

## Cache storage

Per-site request/response cache used by Service Workers (Cache API). Different from the browser's HTTP cache. Clearing it makes the next page load fetch fresh assets but does **not** affect login state.

- **Default for non-whitelisted**: cleared
- **Default for whitelisted**: cleared

## Service workers

Background scripts a site can register to run offline, push notifications, or intercept network requests. Unregistering them is harmless — the site re-registers on the next visit. Clearing this can help if a site behaves oddly or you want to be sure no background script lingers.

- **Default for non-whitelisted**: cleared
- **Default for whitelisted**: cleared

## History

The browser's URL history entries for the domain. Clearing means visited links won't appear purple anymore for that site, and the URLs won't show in autocomplete.

- **Default for non-whitelisted**: cleared
- **Default for whitelisted**: cleared

## Categories not in the per-domain settings

A few categories are **not** per-origin clearable in Chrome's API and are therefore handled only during the [startup full sweep](Settings#browser-startup-full-sweep) as a global pass:

- **HTTP cache** — the browser's standard request cache.
- **Downloads** — your downloads list (the files themselves are not deleted).
- **Form data** — autofill suggestions for forms.

These are also cleared during the very first sweep after install.

## Picking your defaults

| Goal | Recommended |
| --- | --- |
| **Stay logged in everywhere — paranoid about everything else** | Clear cache/SW/history for whitelisted; default for non-whitelisted. |
| **Aggressive — clear everything for non-whitelisted, hands off whitelisted** | Whitelisted: untick all six. Non-whitelisted: tick all six. |
| **Privacy-mode — clear cookies even for whitelisted, but keep app data offline** | Whitelisted: tick cookies, untick localStorage/IndexedDB. (Most apps will still re-prompt to log in.) |

Whatever you pick, the whitelist still controls **which profile** applies to a given domain — the toggles only control **what each profile does**.
