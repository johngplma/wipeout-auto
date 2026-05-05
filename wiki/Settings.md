# Settings

Open the settings page from the popup (**Open Settings**) or by right-clicking the toolbar icon → **Options**.

## Appearance

Theme picker: **System**, **Light**, **Dark**. "System" follows your operating system's appearance.

## Auto-cleanup delay

The grace period between a tab closing (or navigating away from a domain) and the cleanup actually firing. Reopening the domain in a new tab during this window cancels the pending cleanup.

- Range: **0–30 seconds**, default **5 seconds**
- Why the 30-second cap: in MV3, service workers can be killed when idle. `setTimeout` keeps the worker alive only briefly. Capping at 30 s means cleanups always fire reliably.

Set this to `0` if you want cleanups to fire instantly with no grace period — useful for kiosk-style setups.

## Categories to clear

Two columns, each with toggles for the six [storage categories](Categories):

- **Non-whitelisted domains** — applied to any domain not on the whitelist.
- **Whitelisted domains** — applied to domains that match a whitelist entry.

Defaults are described in [Categories](Categories).

## Browser startup full sweep

When enabled, every browser startup triggers a sweep:

1. Enumerate every domain you have cookies for.
2. For each non-whitelisted domain, run the same cleanup as a per-tab cleanup (using the **non-whitelisted** category profile).
3. Run a global pass for HTTP cache, downloads, form data, and history. (These categories are not per-origin clearable, so they can't be selectively skipped.)

> **First run is special.** To avoid spamming the activity log on first install, the very first sweep clears everything globally and writes a single `startup-initial` log entry.

Disable this toggle if you only want per-tab cleanups and no startup pass.

## Reset to defaults

Restores the auto-cleanup delay, full-sweep toggle, and category toggles to their defaults. **Theme is not reset** (it's stored separately) and the **whitelist is not touched**.

## Where settings are stored

All settings live in `chrome.storage.local`:

- `whitelist` — your whitelisted domains
- `settings` — auto-delay, full-sweep toggle, category toggles
- `theme` — appearance preference
- `logs` — the activity log
- `flags.initialSweepComplete` — internal one-shot flag for first-run behavior

Uninstalling the extension deletes all of this. Use the [whitelist export](Whitelist#import--export-json) before uninstalling if you want to keep your list.
