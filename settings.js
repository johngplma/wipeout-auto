// Settings page — whitelist, advanced settings, and activity log.
// chrome.storage.local is the source of truth; we re-render on storage changes.

const Utils = self.WipeoutDomainUtils;

// Mirror of the defaults defined in background.js. Kept here so the settings
// page can offer "Reset to defaults" without round-tripping a message.
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

const CATEGORY_LABELS = {
  cookies: "Cookies",
  localStorage: "Local storage",
  indexedDB: "IndexedDB",
  cacheStorage: "Cache storage",
  serviceWorkers: "Service workers",
  history: "History",
};
const CATEGORY_ORDER = [
  "cookies",
  "localStorage",
  "indexedDB",
  "cacheStorage",
  "serviceWorkers",
  "history",
];

const els = {
  form: document.getElementById("add-form"),
  input: document.getElementById("add-input"),
  error: document.getElementById("add-error"),
  list: document.getElementById("whitelist"),
  empty: document.getElementById("whitelist-empty"),
  exportBtn: document.getElementById("export-whitelist"),
  importBtn: document.getElementById("import-whitelist"),
  importFile: document.getElementById("import-file"),
  importStatus: document.getElementById("import-status"),
  // advanced settings
  autoDelay: document.getElementById("auto-delay"),
  catsNon: document.getElementById("cats-non-whitelisted"),
  catsWl: document.getElementById("cats-whitelisted"),
  fullSweepToggle: document.getElementById("full-sweep-toggle"),
  resetSettings: document.getElementById("reset-settings"),
  // theme
  themeRadios: document.querySelectorAll('input[name="theme"]'),
  // logs
  logsBody: document.getElementById("logs-body"),
  logsEmpty: document.getElementById("logs-empty"),
  logFilter: document.getElementById("log-filter"),
  clearLogs: document.getElementById("clear-logs"),
};

let logsFilter = "";

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelative(ts) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatAbsolute(ts) {
  return new Date(ts).toLocaleString();
}

async function getWhitelist() {
  const { whitelist = {} } = await chrome.storage.local.get("whitelist");
  return whitelist;
}

async function setWhitelist(whitelist) {
  await chrome.storage.local.set({ whitelist });
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return settings || DEFAULT_SETTINGS;
}

async function setSettings(patch) {
  const current = await getSettings();
  await chrome.storage.local.set({ settings: { ...current, ...patch } });
}

async function getLogs() {
  const { logs = [] } = await chrome.storage.local.get("logs");
  return logs;
}

// ────────────────────────────────────────────────────────────────────────
// Whitelist
// ────────────────────────────────────────────────────────────────────────

function renderWhitelist(whitelist) {
  const entries = Object.entries(whitelist).sort(
    (a, b) => (b[1].addedAt || 0) - (a[1].addedAt || 0),
  );

  els.list.innerHTML = "";
  els.empty.hidden = entries.length > 0;

  for (const [domain, meta] of entries) {
    const li = document.createElement("li");
    li.className = "whitelist-item";

    const left = document.createElement("div");
    left.className = "whitelist-left";

    const name = document.createElement("span");
    name.className = "domain";
    name.textContent = domain;

    const added = document.createElement("span");
    added.className = "added";
    added.textContent = `added ${formatDate(meta.addedAt)}`;

    left.append(name, added);

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeEntry(domain));

    li.append(left, remove);
    els.list.appendChild(li);
  }
}

async function addEntry(rawValue) {
  els.error.textContent = "";
  const result = Utils.validateWhitelistInput(rawValue);
  if (!result.ok) {
    els.error.textContent = result.error;
    return;
  }
  const whitelist = await getWhitelist();
  if (whitelist[result.value]) {
    els.error.textContent = "Already in whitelist.";
    return;
  }
  whitelist[result.value] = { type: result.type, addedAt: Date.now() };
  await setWhitelist(whitelist);
  els.input.value = "";
}

async function removeEntry(domain) {
  const whitelist = await getWhitelist();
  delete whitelist[domain];
  await setWhitelist(whitelist);
}

// ── Whitelist import/export ───────────────────────────────
// Format: a flat JSON array of domain strings.
// e.g. ["*.google.com", "github.com", "192.168.1.1"]
// `addedAt` and `type` aren't preserved across export/import — `type` is
// re-derived from the string and `addedAt` is set to import-time.

function showImportStatus(message, isError = false) {
  els.importStatus.textContent = message;
  els.importStatus.hidden = false;
  els.importStatus.style.color = isError
    ? "var(--danger)"
    : "var(--text-secondary)";
}

function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function exportWhitelist() {
  const whitelist = await getWhitelist();
  const entries = Object.keys(whitelist).sort();
  const blob = new Blob([JSON.stringify(entries, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wipeout-auto-whitelist-${todayStamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showImportStatus(`Exported ${entries.length} entr${entries.length === 1 ? "y" : "ies"}.`);
}

async function importWhitelistFile(file) {
  let text;
  try {
    text = await file.text();
  } catch (e) {
    showImportStatus(`Failed to read file: ${e}`, true);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    showImportStatus(`Invalid JSON: ${e.message}`, true);
    return;
  }

  if (!Array.isArray(parsed)) {
    showImportStatus("Expected a JSON array of domain strings.", true);
    return;
  }

  const whitelist = await getWhitelist();
  let added = 0;
  let duplicates = 0;
  let invalid = 0;
  const now = Date.now();

  for (const raw of parsed) {
    if (typeof raw !== "string") {
      invalid++;
      continue;
    }
    const result = Utils.validateWhitelistInput(raw);
    if (!result.ok) {
      invalid++;
      continue;
    }
    if (whitelist[result.value]) {
      duplicates++;
      continue;
    }
    whitelist[result.value] = { type: result.type, addedAt: now };
    added++;
  }

  await setWhitelist(whitelist);

  const parts = [`Imported ${added}`];
  if (duplicates) parts.push(`${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped`);
  if (invalid) parts.push(`${invalid} invalid skipped`);
  showImportStatus(parts.join(", ") + ".", invalid > 0 && added === 0);
}

// ────────────────────────────────────────────────────────────────────────
// Advanced settings
// ────────────────────────────────────────────────────────────────────────

function renderCategoryList(ulEl, profile, categoriesObj) {
  ulEl.innerHTML = "";
  for (const key of CATEGORY_ORDER) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    label.className = "toggle-row";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(categoriesObj[key]);
    input.dataset.profile = profile;
    input.dataset.category = key;
    input.addEventListener("change", onCategoryToggle);

    const span = document.createElement("span");
    span.textContent = CATEGORY_LABELS[key];

    label.append(input, span);
    li.appendChild(label);
    ulEl.appendChild(li);
  }
}

function renderAdvanced(settings) {
  els.autoDelay.value = String(settings.autoDelaySeconds ?? 5);
  els.fullSweepToggle.checked = settings.fullSweepEnabled !== false;
  const cats = settings.categories || DEFAULT_CATEGORIES;
  renderCategoryList(els.catsNon, "nonWhitelisted", cats.nonWhitelisted);
  renderCategoryList(els.catsWl, "whitelisted", cats.whitelisted);
}

async function onCategoryToggle(e) {
  const { profile, category } = e.target.dataset;
  const settings = await getSettings();
  const next = {
    ...settings,
    categories: {
      ...(settings.categories || DEFAULT_CATEGORIES),
      [profile]: {
        ...(settings.categories?.[profile] || {}),
        [category]: e.target.checked,
      },
    },
  };
  await chrome.storage.local.set({ settings: next });
}

async function onDelayInput() {
  let val = parseInt(els.autoDelay.value, 10);
  if (!Number.isFinite(val) || val < 0) val = 0;
  if (val > 30) val = 30;
  els.autoDelay.value = String(val);
  await setSettings({ autoDelaySeconds: val });
}

async function onFullSweepToggle() {
  await setSettings({ fullSweepEnabled: els.fullSweepToggle.checked });
}

async function resetSettings() {
  if (!confirm("Reset all advanced settings to defaults?")) return;
  // Theme is stored top-level, not in `settings`, so it stays as-is.
  await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
}

// ────────────────────────────────────────────────────────────────────────
// Theme
// ────────────────────────────────────────────────────────────────────────

function renderTheme(theme) {
  const value = theme === "light" || theme === "dark" ? theme : "system";
  for (const r of els.themeRadios) {
    r.checked = r.value === value;
  }
}

async function onThemeChange(e) {
  if (!e.target.checked) return;
  await chrome.storage.local.set({ theme: e.target.value });
}

// ────────────────────────────────────────────────────────────────────────
// Logs
// ────────────────────────────────────────────────────────────────────────

function renderLogs(logs) {
  const filter = logsFilter.trim().toLowerCase();
  const filtered = filter
    ? logs.filter((l) => (l.domain || "").toLowerCase().includes(filter))
    : logs;

  els.logsBody.innerHTML = "";
  els.logsEmpty.hidden = filtered.length > 0;
  if (filtered.length === 0) {
    els.logsEmpty.textContent = filter
      ? "No matching entries."
      : "No activity yet.";
    return;
  }

  for (const entry of filtered) {
    const tr = document.createElement("tr");

    const when = document.createElement("td");
    when.textContent = formatRelative(entry.timestamp);
    when.title = formatAbsolute(entry.timestamp);

    const trigger = document.createElement("td");
    trigger.textContent = entry.trigger || "";

    const domain = document.createElement("td");
    domain.className = "mono";
    domain.textContent = entry.domain || "";

    const status = document.createElement("td");
    const statusText = entry.whitelistStatus || "";
    status.textContent = entry.override ? `${statusText} (forced)` : statusText;

    const cleared = document.createElement("td");
    cleared.className = "mono small";
    cleared.textContent = (entry.categoriesCleared || []).join(", ");

    const cookies = document.createElement("td");
    cookies.className = "num";
    cookies.textContent = entry.counts?.cookies ?? "";

    tr.append(when, trigger, domain, status, cleared, cookies);
    els.logsBody.appendChild(tr);
  }
}

async function clearAllLogs() {
  if (!confirm("Clear all activity log entries? This can't be undone.")) return;
  await chrome.storage.local.set({ logs: [] });
}

// ────────────────────────────────────────────────────────────────────────
// Wiring
// ────────────────────────────────────────────────────────────────────────

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  addEntry(els.input.value);
});

els.exportBtn.addEventListener("click", exportWhitelist);
els.importBtn.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await importWhitelistFile(file);
  // reset so picking the same file twice still fires `change`
  e.target.value = "";
});

els.autoDelay.addEventListener("change", onDelayInput);
els.fullSweepToggle.addEventListener("change", onFullSweepToggle);
els.resetSettings.addEventListener("click", resetSettings);
els.themeRadios.forEach((r) => r.addEventListener("change", onThemeChange));

els.logFilter.addEventListener("input", async () => {
  logsFilter = els.logFilter.value;
  renderLogs(await getLogs());
});

els.clearLogs.addEventListener("click", clearAllLogs);

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;
  if (changes.whitelist) renderWhitelist(changes.whitelist.newValue || {});
  if (changes.logs) renderLogs(changes.logs.newValue || []);
  if (changes.settings)
    renderAdvanced(changes.settings.newValue || DEFAULT_SETTINGS);
  if (changes.theme) renderTheme(changes.theme.newValue || "system");
});

(async function init() {
  const [{ whitelist = {}, settings, theme = "system", logs = [] }] =
    await Promise.all([
      chrome.storage.local.get(["whitelist", "settings", "theme", "logs"]),
    ]);
  renderWhitelist(whitelist);
  renderAdvanced(settings || DEFAULT_SETTINGS);
  renderTheme(theme);
  renderLogs(logs);
})();
