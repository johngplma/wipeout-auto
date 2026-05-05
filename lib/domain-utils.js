// Shared utilities for parsing URLs and matching domains against the whitelist.
// Loaded by popup.js and settings.js as a regular <script>.
// Loaded by background.js via importScripts() (MV3 service workers support it).

// Extract a hostname from a URL string. Returns null for non-http(s) schemes
// (chrome://, chrome-extension://, about:, file://, etc.) — those pages can't
// be cleaned via browsingData per-origin filters.
function getHostnameFromUrl(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.hostname || null;
}

// True if the hostname is a literal IP (v4 or bracketed v6).
function isIpAddress(hostname) {
  if (!hostname) return false;
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true; // ipv6
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

// Given a hostname, produce the whitelist candidates the popup shows.
// `www.` is treated as a cosmetic prefix and stripped first — so
// www.youtube.com and youtube.com produce the same options. Order shown
// in the popup is broadest match first:
//   1. parent-wildcard (*.<working minus first label>) — only if 3+ labels
//   2. self-wildcard (*.<working-hostname>)
//   3. apex (the working hostname)
// IPs return only the apex (wildcards don't apply).
function getDomainOptions(hostname) {
  if (!hostname) return [];
  if (isIpAddress(hostname)) {
    return [{ value: hostname, type: "apex" }];
  }
  const working = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  const labels = working.split(".");
  const options = [];
  options.push({ value: working, type: "apex" });
  options.push({ value: `*.${working}`, type: "wildcard" });
  if (labels.length > 2) {
    options.push({ value: `*.${labels.slice(1).join(".")}`, type: "wildcard" });
  }
  return options;
}

// The "site" hostname used as the cleanup target — same www-stripping rule
// as getDomainOptions, so cleanups match what the popup shows.
function getCleanupDomain(hostname) {
  if (!hostname || isIpAddress(hostname)) return hostname;
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

// Decide whether a hostname is whitelisted by the stored whitelist object.
// Wildcard entries like *.google.com match any host ending in ".google.com"
// (the leading dot prevents evilgoogle.com from matching) AND the apex
// google.com itself. Apex coverage matters because shared-auth cookies
// (e.g. .google.com SID/HSID) are scoped to the apex; cleaning google.com
// would log the user out of every *.google.com subdomain.
// Returns: { matched: boolean, reason: "apex-match" | "wildcard-match:<entry>" | "not-whitelisted" }
function getWhitelistMatch(hostname, whitelist) {
  if (!hostname || !whitelist)
    return { matched: false, reason: "not-whitelisted" };
  if (Object.prototype.hasOwnProperty.call(whitelist, hostname)) {
    return { matched: true, reason: "apex-match" };
  }
  for (const entry of Object.keys(whitelist)) {
    if (!entry.startsWith("*.")) continue;
    const suffix = entry.slice(1); // ".google.com"
    const apex = suffix.slice(1); // "google.com"
    if (hostname === apex || hostname.endsWith(suffix)) {
      return { matched: true, reason: `wildcard-match:${entry}` };
    }
  }
  return { matched: false, reason: "not-whitelisted" };
}

// Validate a user-typed whitelist entry. Returns { ok: true, value, type } or
// { ok: false, error }. Lowercases the value. Rejects schemes, paths, spaces.
function validateWhitelistInput(raw) {
  if (typeof raw !== "string") return { ok: false, error: "Invalid input." };
  const value = raw.trim().toLowerCase();
  if (!value) return { ok: false, error: "Enter a domain." };
  if (/\s/.test(value)) return { ok: false, error: "No spaces allowed." };
  if (value.includes("://") || value.includes("/")) {
    return { ok: false, error: "Enter a domain only, not a URL." };
  }

  let type = "apex";
  let host = value;
  if (value.startsWith("*.")) {
    type = "wildcard";
    host = value.slice(2);
    if (!host)
      return { ok: false, error: "Wildcard needs a domain after '*.'." };
  } else if (value.includes("*")) {
    return { ok: false, error: "Wildcards must be of the form *.example.com." };
  }

  // IPs are allowed only as apex entries.
  if (isIpAddress(host)) {
    if (type === "wildcard")
      return { ok: false, error: "Wildcards don't apply to IPs." };
    return { ok: true, value: host, type: "apex" };
  }

  // Plausible-domain check: at least one dot, labels of [a-z0-9-], no leading/trailing hyphens.
  const labelRe = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  const labels = host.split(".");
  if (labels.length < 2)
    return { ok: false, error: "Use a full domain like example.com." };
  for (const label of labels) {
    if (!labelRe.test(label))
      return { ok: false, error: `Invalid domain label: "${label}".` };
  }
  return { ok: true, value, type };
}

// Expose for both classic <script> and importScripts() in service worker.
if (typeof self !== "undefined") {
  self.WipeoutDomainUtils = {
    getHostnameFromUrl,
    isIpAddress,
    getDomainOptions,
    getCleanupDomain,
    getWhitelistMatch,
    validateWhitelistInput,
  };
}
