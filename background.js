// Wipeout Auto — service worker
// MV3 service workers can sleep at any time. Don't rely on top-level
// variables to persist; use chrome.storage.local for anything durable.
// (Exception: `pendingCleanups` is in-memory by design — pending setTimeouts
//  keep the SW alive, so the map survives as long as the timers do.)

importScripts("lib/domain-utils.js");

const Utils = self.WipeoutDomainUtils;

const DEFAULT_CATEGORIES = {
  nonWhitelisted: {
    cookies: true,
    localStorage: true,
    indexedDB: true,
    cacheStorage: true,
    serviceWorkers: true,
    history: true,
  },
  whitelisted: {
    cookies: false,
    localStorage: false,
    indexedDB: false,
    cacheStorage: true,
    serviceWorkers: true,
    history: true,
  },
};

const DEFAULT_SETTINGS = {
  autoDelaySeconds: 5,
  fullSweepEnabled: true,
  categories: DEFAULT_CATEGORIES,
};

const DEFAULT_STATE = {
  whitelist: {},
  logs: [],
  flags: { initialSweepComplete: false },
  settings: DEFAULT_SETTINGS,
};

const LOG_CAP = 2000;
const LOG_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_AUTO_DELAY_SECONDS = 30;
const PER_ORIGIN_CATEGORIES = [
  "cookies",
  "localStorage",
  "indexedDB",
  "cacheStorage",
  "serviceWorkers",
];

// In-memory map of pending auto-cleanups: domain -> timeoutId.
// Only used during the (at most 30s) delay window between event and cleanup.
const pendingCleanups = new Map();

// ────────────────────────────────────────────────────────────────────────
// Storage helpers
// ────────────────────────────────────────────────────────────────────────

// Initialize storage on install. Don't overwrite existing keys on update.
// Also patches `settings` shape if a key was added in a later version.
async function initStorage() {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULT_STATE));
  const toSet = {};
  for (const [key, value] of Object.entries(DEFAULT_STATE)) {
    if (existing[key] === undefined) toSet[key] = value;
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return settings || DEFAULT_SETTINGS;
}

// Append a log entry with auto-purge: drop entries older than 30 days, then
// cap at 2000. Newest entries are at the front.
async function appendLog(entry) {
  const { logs = [] } = await chrome.storage.local.get("logs");
  const now = Date.now();
  const fresh = logs.filter((l) => now - l.timestamp < LOG_MAX_AGE_MS);
  fresh.unshift(entry);
  if (fresh.length > LOG_CAP) fresh.length = LOG_CAP;
  await chrome.storage.local.set({ logs: fresh });
}

// ────────────────────────────────────────────────────────────────────────
// Cleanup core
// ────────────────────────────────────────────────────────────────────────

// Build origins for chrome.browsingData.remove. Always include http+https for
// the bare domain. For non-www, non-IP domains we also include the www variant
// — chrome.browsingData matches origins exactly, so cleaning "youtube.com"
// wouldn't otherwise touch "www.youtube.com" data.
function buildOrigins(domain) {
  const origins = [`https://${domain}`, `http://${domain}`];
  if (!Utils.isIpAddress(domain) && !domain.startsWith("www.")) {
    origins.push(`https://www.${domain}`, `http://www.${domain}`);
  }
  return origins;
}

async function clearHistoryForDomain(domain) {
  const results = await chrome.history.search({ text: domain, maxResults: 1000 });
  const targets = new Set([domain, `www.${domain}`]);
  if (domain.startsWith("www.")) targets.add(domain.slice(4));

  for (const item of results) {
    let host;
    try {
      host = new URL(item.url).hostname;
    } catch {
      continue;
    }
    if (targets.has(host)) {
      try {
        await chrome.history.deleteUrl({ url: item.url });
      } catch (e) {
        console.warn("history.deleteUrl failed for", item.url, e);
      }
    }
  }
}

// Heart of the extension. Reads category preferences from settings, applies
// whitelist (or override), writes a log entry. opts.overrideWhitelist forces
// the non-whitelisted profile even when the domain matches the whitelist.
async function cleanDomain(domain, trigger, opts = {}) {
  const startedAt = Date.now();
  const { whitelist = {} } = await chrome.storage.local.get("whitelist");
  const settings = await getSettings();
  const cats = settings.categories || DEFAULT_CATEGORIES;

  const match = Utils.getWhitelistMatch(domain, whitelist);
  const forced = Boolean(opts.overrideWhitelist) && match.matched;
  const useNonWhitelisted = !match.matched || forced;
  const enabled = useNonWhitelisted ? cats.nonWhitelisted : cats.whitelisted;

  // browsingData categories — only the per-origin-clearable ones.
  const browsingDataCats = {};
  for (const c of PER_ORIGIN_CATEGORIES) {
    if (enabled[c]) browsingDataCats[c] = true;
  }

  // Best-effort cookie count for the log (only meaningful when cookies will clear).
  let cookieCount = 0;
  if (enabled.cookies) {
    try {
      const cookies = await chrome.cookies.getAll({ domain });
      cookieCount = cookies.length;
    } catch (e) {
      console.warn("cookies.getAll failed for", domain, e);
    }
  }

  const categoriesCleared = [];
  if (Object.keys(browsingDataCats).length > 0) {
    try {
      await chrome.browsingData.remove({ origins: buildOrigins(domain) }, browsingDataCats);
      categoriesCleared.push(...Object.keys(browsingDataCats));
    } catch (e) {
      console.error("browsingData.remove failed for", domain, e);
    }
  }

  if (enabled.history) {
    try {
      await clearHistoryForDomain(domain);
      categoriesCleared.push("history");
    } catch (e) {
      console.error("history clear failed for", domain, e);
    }
  }

  const entry = {
    id: `log_${startedAt}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: startedAt,
    trigger,
    domain,
    whitelistStatus: match.matched ? match.reason : "not-whitelisted",
    categoriesCleared,
    counts: { cookies: cookieCount },
  };
  if (forced) entry.override = true;

  await appendLog(entry);
  return entry;
}

// ────────────────────────────────────────────────────────────────────────
// Tab → cleanup-domain tracking
// ────────────────────────────────────────────────────────────────────────

const TAB_MAP_KEY = "tabMap";

async function getTabMap() {
  const data = await chrome.storage.session.get(TAB_MAP_KEY);
  return data[TAB_MAP_KEY] || {};
}

async function setTabMap(map) {
  await chrome.storage.session.set({ [TAB_MAP_KEY]: map });
}

async function rebuildTabMap() {
  const tabs = await chrome.tabs.query({});
  const fresh = {};
  for (const t of tabs) {
    const host = Utils.getHostnameFromUrl(t.url);
    if (host) fresh[t.id] = Utils.getCleanupDomain(host);
  }
  await setTabMap(fresh);
  return fresh;
}

async function getOrInitTabMap() {
  const map = await getTabMap();
  if (Object.keys(map).length > 0) return map;
  return rebuildTabMap();
}

async function anyTabOnDomain(domain, excludeTabId) {
  const tabs = await chrome.tabs.query({});
  return tabs.some((t) => {
    if (t.id === excludeTabId) return false;
    const host = Utils.getHostnameFromUrl(t.url);
    return host && Utils.getCleanupDomain(host) === domain;
  });
}

// ────────────────────────────────────────────────────────────────────────
// Auto-cleanup scheduling
//
// Tab close / navigate-away events go through scheduleAutoCleanup, which
// debounces by setTimeout. If the user reopens the domain during the delay,
// cancelPendingCleanup wipes the pending timer.
// ────────────────────────────────────────────────────────────────────────

async function scheduleAutoCleanup(domain) {
  // Cancel any earlier pending timer for the same domain.
  const existing = pendingCleanups.get(domain);
  if (existing) {
    clearTimeout(existing);
    pendingCleanups.delete(domain);
  }

  const settings = await getSettings();
  let delaySec = Number(settings.autoDelaySeconds);
  if (!Number.isFinite(delaySec) || delaySec < 0) delaySec = 0;
  if (delaySec > MAX_AUTO_DELAY_SECONDS) delaySec = MAX_AUTO_DELAY_SECONDS;

  if (delaySec === 0) {
    await runAutoCleanup(domain);
    return;
  }

  const id = setTimeout(async () => {
    pendingCleanups.delete(domain);
    await runAutoCleanup(domain);
  }, delaySec * 1000);
  pendingCleanups.set(domain, id);
}

function cancelPendingCleanup(domain) {
  const id = pendingCleanups.get(domain);
  if (id) {
    clearTimeout(id);
    pendingCleanups.delete(domain);
  }
}

// Re-check that no tab is on the domain just before firing. Belt-and-suspenders
// in case the cancel logic missed something.
async function runAutoCleanup(domain) {
  const stillOpen = await anyTabOnDomain(domain, -1);
  if (stillOpen) return;
  try {
    await cleanDomain(domain, "tab-cleanup");
  } catch (e) {
    console.error("auto cleanDomain failed", e);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Startup full sweep
// ────────────────────────────────────────────────────────────────────────

async function runInitialSweep() {
  const cleared = [
    "cookies", "localStorage", "indexedDB",
    "cacheStorage", "serviceWorkers",
    "cache", "downloads", "formData", "history",
  ];
  try {
    await chrome.browsingData.remove(
      {},
      {
        cookies: true, localStorage: true, indexedDB: true,
        cacheStorage: true, serviceWorkers: true,
        cache: true, downloads: true, formData: true, history: true,
      },
    );
  } catch (e) {
    console.error("initial sweep failed", e);
  }
  await appendLog({
    id: `log_${Date.now()}_initial`,
    timestamp: Date.now(),
    trigger: "startup-initial",
    domain: "<full-sweep>",
    whitelistStatus: "n/a",
    categoriesCleared: cleared,
    counts: { cookies: 0 },
  });
  await chrome.storage.local.set({ flags: { initialSweepComplete: true } });
}

async function fullSweep() {
  const { flags = {}, whitelist = {} } = await chrome.storage.local.get([
    "flags",
    "whitelist",
  ]);

  if (!flags.initialSweepComplete) {
    await runInitialSweep();
    return;
  }

  // Per-domain pass: iterate domains we have cookies for, clean each.
  // Limitation: this misses domains with only localStorage/IndexedDB and no
  // cookies. Acceptable for MVP — those still get hit when their tab closes.
  let cookies = [];
  try {
    cookies = await chrome.cookies.getAll({});
  } catch (e) {
    console.error("cookies.getAll failed during sweep", e);
  }

  const domains = new Set();
  for (const c of cookies) {
    let d = c.domain.startsWith(".") ? c.domain.slice(1) : c.domain;
    d = Utils.getCleanupDomain(d) || d;
    if (d) domains.add(d);
  }

  for (const domain of domains) {
    const match = Utils.getWhitelistMatch(domain, whitelist);
    if (match.matched) continue;
    try {
      await cleanDomain(domain, "startup-sweep");
    } catch (e) {
      console.error("cleanDomain failed during sweep for", domain, e);
    }
  }

  // Categories that aren't per-origin clearable — global pass for everyone.
  try {
    await chrome.browsingData.remove(
      {},
      { cache: true, downloads: true, formData: true, history: true },
    );
    await appendLog({
      id: `log_${Date.now()}_global`,
      timestamp: Date.now(),
      trigger: "startup-sweep",
      domain: "<global>",
      whitelistStatus: "n/a",
      categoriesCleared: ["cache", "downloads", "formData", "history"],
      counts: { cookies: 0 },
    });
  } catch (e) {
    console.error("global startup clear failed", e);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Listeners
// ────────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await initStorage();
  console.log("Wipeout Auto loaded");
});

chrome.runtime.onStartup.addListener(async () => {
  await rebuildTabMap();
  const settings = await getSettings();
  if (settings.fullSweepEnabled === false) return;
  await fullSweep();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.action === "cleanDomain" && typeof msg.domain === "string") {
    cleanDomain(msg.domain, msg.trigger || "manual-clean", {
      overrideWhitelist: Boolean(msg.overrideWhitelist),
    })
      .then((entry) => sendResponse({ ok: true, entry }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the message channel open for the async response
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  if (!changeInfo.url) return;

  const newHost = Utils.getHostnameFromUrl(changeInfo.url);
  const newDomain = newHost ? Utils.getCleanupDomain(newHost) : null;

  const map = await getOrInitTabMap();
  const oldDomain = map[tabId];

  if (oldDomain && oldDomain !== newDomain) {
    const stillOpen = await anyTabOnDomain(oldDomain, tabId);
    if (!stillOpen) {
      await scheduleAutoCleanup(oldDomain);
    }
  }

  // If the user reopened a domain that had a pending cleanup, cancel it.
  if (newDomain) {
    cancelPendingCleanup(newDomain);
    map[tabId] = newDomain;
  } else {
    delete map[tabId];
  }
  await setTabMap(map);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const map = await getOrInitTabMap();
  const domain = map[tabId];
  delete map[tabId];
  await setTabMap(map);
  if (!domain) return;

  const stillOpen = await anyTabOnDomain(domain, tabId);
  if (!stillOpen) {
    await scheduleAutoCleanup(domain);
  }
});
