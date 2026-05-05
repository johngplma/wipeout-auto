# Activity Log

Every cleanup writes one row to the activity log on the settings page. Use it to verify a domain was cleaned (or wasn't) and why.

## Columns

| Column | Meaning |
| --- | --- |
| **When** | Relative time (`5s ago`, `12m ago`, …). Hover for the absolute timestamp. |
| **Trigger** | What caused the cleanup. See [Triggers](#triggers) below. |
| **Domain** | The cleanup target. `<full-sweep>` and `<global>` are special markers for sweep-level passes. |
| **Whitelist** | `apex-match`, `wildcard-match:<entry>`, or `not-whitelisted`. Adds `(forced)` if the user clicked **Clean Now** to override a whitelist match. |
| **Cleared** | Comma-separated list of categories actually cleared (depends on the active category toggles). |
| **Cookies** | Best-effort cookie count at the moment of cleanup. `0` if cookies weren't a target category. |

## Triggers

| Trigger | Source |
| --- | --- |
| `tab-cleanup` | Last tab on a domain closed or navigated away. |
| `manual-clean` | You clicked **Clean Now** from the popup. |
| `startup-sweep` | Per-domain pass during a browser-startup full sweep. |
| `startup-initial` | The first sweep after install (single global entry). |

## Filtering

Type into the **Filter by domain…** box to narrow the table. Matching is a case-insensitive substring match against the `Domain` column.

## Retention

- **Cap**: 2000 entries.
- **Auto-purge**: entries older than 30 days are dropped on the next write.
- **Manual clear**: the **Clear all logs** button wipes everything.

## Privacy

The log is local-only. It contains domain names and counts, no URLs, no page content, no user data. It's never transmitted off your machine.
