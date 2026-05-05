# Whitelist

The whitelist is the heart of the extension. Domains on the whitelist keep their cookies, localStorage, and IndexedDB through cleanups — so you stay logged in. Everything not on the whitelist gets cleaned when its last tab closes (and again on browser startup).

## Two kinds of entry

### Apex — `example.com`

Matches **only** the exact host `example.com`. Does not cover subdomains.

| Visit this host | Matched by `example.com`? |
| --- | --- |
| `example.com` | ✅ |
| `www.example.com` | ✅ (the `www.` prefix is treated as cosmetic and stripped) |
| `mail.example.com` | ❌ |
| `app.example.com` | ❌ |

### Wildcard — `*.example.com`

Matches the apex `example.com` **and** every subdomain under it.

| Visit this host | Matched by `*.example.com`? |
| --- | --- |
| `example.com` | ✅ |
| `www.example.com` | ✅ |
| `mail.example.com` | ✅ |
| `accounts.example.com` | ✅ |
| `evilexample.com` | ❌ (the leading dot prevents lookalike matches) |

> **Tip:** for most real-world sites, the wildcard is what you want — auth tokens are usually shared across `accounts.<service>.com`, `api.<service>.com`, and similar.

## Adding entries

### From the popup

Click the toolbar icon while on the site you care about. Up to three suggestions appear:

1. **Parent-wildcard** — e.g. `*.google.com` when you're on `mail.google.com`. Whitelists the whole org.
2. **Self-wildcard** — `*.<current-host>`. Whitelists this host and any of its subdomains.
3. **Apex** — the exact current host.

Click **Whitelist** next to the option you want.

### From the settings page

Open settings (right-click the toolbar icon → **Options**, or **Open Settings** from the popup). Type a domain in the **Whitelist** card and press **Add**.

Validation rules:
- Lowercased automatically
- No schemes (`https://`) or paths
- Wildcards must be of the form `*.example.com`
- IPs are allowed but only as apex entries

## Country-code TLDs and regional sites

`*.google.com` does **not** cover `google.com.ph`, `google.co.uk`, etc. — those are different registered domains. If you want to keep regional Google sessions, add each ccTLD as its own entry:

```
*.google.com
*.google.com.ph
*.google.co.uk
```

Same logic applies to any service that uses regional TLDs.

## Import / export (JSON)

The settings page has **Export** and **Import** buttons in the Whitelist card.

### Format

A plain JSON array of strings:

```json
[
  "*.google.com",
  "github.com",
  "*.youtube.com",
  "192.168.1.1"
]
```

That's the whole format — no metadata, no version field. `addedAt` timestamps are not exported (they're regenerated to "now" on import).

### Import behavior

- **Merges** with the existing whitelist (does not replace).
- Each entry is validated; invalid ones are skipped with a count in the status message.
- Duplicates of already-whitelisted entries are skipped silently.

To replace the whitelist entirely, remove all existing entries first, then import.

## Removing entries

- **Popup**: click **Remove** on the matching option.
- **Settings page**: click **Remove** on any row in the whitelist list.

## What "whitelisted" actually clears

By default, whitelisted domains still get **cache storage**, **service workers**, and **history** cleared — only **cookies**, **localStorage**, and **IndexedDB** are preserved. You can change this per-category in [Settings](Settings).
