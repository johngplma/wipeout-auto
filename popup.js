// Popup — shown when the toolbar icon is clicked.
// Reads the active tab's URL, derives whitelist candidates, lets the user
// toggle each one, and runs Clean Now on the cleanup-domain (apex form).

const Utils = self.WipeoutDomainUtils;

const hostBlockEl = document.getElementById("host-block");
const hostInfoEl = document.getElementById("host-info");
const contentEl = document.getElementById("content");
const lastCleanedEl = document.getElementById("last-cleaned");
const statusEl = document.getElementById("status");
const cleanNowBtn = document.getElementById("clean-now");

// Tracks the cleanup target for the active tab. Set during render(); used by
// the Clean Now click handler. Null when the tab isn't cleanable.
let cleanupDomain = null;

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

cleanNowBtn.addEventListener("click", async () => {
  if (!cleanupDomain) return;

  // If the cleanup target is whitelisted, confirm the override.
  const whitelist = await getWhitelist();
  const match = Utils.getWhitelistMatch(cleanupDomain, whitelist);
  let overrideWhitelist = false;
  if (match.matched) {
    const proceed = confirm(
      `${cleanupDomain} is whitelisted.\n\n` +
        "Cleaning now will override the whitelist and clear cookies, local storage, " +
        "and other site data — you'll likely be logged out.\n\nContinue?",
    );
    if (!proceed) return;
    overrideWhitelist = true;
  }

  cleanNowBtn.disabled = true;
  showStatus("Cleaning…");
  try {
    const response = await chrome.runtime.sendMessage({
      action: "cleanDomain",
      domain: cleanupDomain,
      trigger: "manual-clean",
      overrideWhitelist,
    });
    if (response && response.ok) {
      const cookies = response.entry?.counts?.cookies ?? 0;
      showStatus(
        `Cleaned ${cleanupDomain} — ${cookies} cookie${cookies === 1 ? "" : "s"} removed`,
      );
      // Refresh "Last cleaned" and cookie count to reflect the new state.
      await render();
    } else {
      showStatus(`Failed: ${response?.error || "unknown error"}`, true);
    }
  } catch (e) {
    showStatus(`Failed: ${String(e)}`, true);
  } finally {
    cleanNowBtn.disabled = false;
  }
});

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.hidden = false;
  statusEl.classList.toggle("status-error", isError);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function getWhitelist() {
  const { whitelist = {} } = await chrome.storage.local.get("whitelist");
  return whitelist;
}

async function getCookieCountForDomain(domain) {
  if (!domain) return null;
  try {
    const cookies = await chrome.cookies.getAll({ domain });
    return cookies.length;
  } catch {
    return null;
  }
}

async function getLastCleanedFor(domain) {
  const { logs = [] } = await chrome.storage.local.get("logs");
  return logs.find((l) => l.domain === domain) || null;
}

function formatRelative(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Renderers ────────────────────────────────────────────

function renderUnsupported(message) {
  hostBlockEl.hidden = true;
  hostInfoEl.innerHTML = "";
  lastCleanedEl.hidden = true;
  lastCleanedEl.innerHTML = "";
  cleanupDomain = null;
  cleanNowBtn.hidden = true;

  contentEl.innerHTML = "";
  const p = document.createElement("p");
  p.className = "unsupported";
  p.textContent = message;
  contentEl.appendChild(p);
}

function renderHostInfo(hostname, cookieCount) {
  hostInfoEl.innerHTML = "";

  const host = document.createElement("p");
  host.className = "host";
  host.textContent = hostname;

  const meta = document.createElement("p");
  meta.className = "host-meta";
  if (cookieCount === null) {
    meta.textContent = "Cookie count unavailable";
  } else {
    meta.textContent = `${cookieCount} cookie${cookieCount === 1 ? "" : "s"}`;
  }

  hostInfoEl.append(host, meta);
  hostBlockEl.hidden = false;
}

function renderOptions(options, whitelist) {
  contentEl.innerHTML = "";

  // Add a header
  const header = document.createElement("h4");
  header.className = "options-header";
  header.textContent = "Whitelist Options"; // or whatever text you want
  contentEl.appendChild(header);

  const list = document.createElement("ul");
  list.className = "options";

  for (const opt of options) {
    const li = document.createElement("li");
    li.className = "option";

    const label = document.createElement("span");
    label.className = "option-label";
    label.textContent = opt.value;

    const button = document.createElement("button");
    button.type = "button";
    const inWhitelist = Boolean(whitelist[opt.value]);
    button.textContent = inWhitelist ? "Remove" : "Whitelist";
    button.className = inWhitelist ? "btn btn-secondary" : "btn btn-primary";
    button.addEventListener("click", () => toggleWhitelist(opt));

    li.append(label, button);
    list.appendChild(li);
  }

  contentEl.appendChild(list);
}

function renderLastCleaned(domain, entry) {
  lastCleanedEl.innerHTML = "";

  const label = document.createElement("span");
  label.className = "lc-label";
  label.textContent = `Last cleaned for ${domain}:`;

  const detail = document.createElement("span");
  detail.className = "lc-detail";
  if (!entry) {
    detail.textContent = "Never";
  } else {
    const cookies = entry.counts?.cookies ?? 0;
    detail.textContent = `${formatRelative(entry.timestamp)}, ${cookies} cookie${cookies === 1 ? "" : "s"} removed`;
    detail.title = new Date(entry.timestamp).toLocaleString();
  }

  lastCleanedEl.append(label, detail);
  lastCleanedEl.hidden = false;
}

async function toggleWhitelist(opt) {
  const whitelist = await getWhitelist();
  if (whitelist[opt.value]) {
    delete whitelist[opt.value];
  } else {
    whitelist[opt.value] = { type: opt.type, addedAt: Date.now() };
  }
  await chrome.storage.local.set({ whitelist });
  await render();
}

async function render() {
  const tab = await getActiveTab();
  if (!tab || !tab.url) {
    renderUnsupported("No active tab.");
    return;
  }
  const hostname = Utils.getHostnameFromUrl(tab.url);
  if (!hostname) {
    renderUnsupported("Wipeout Auto can't clean this kind of page.");
    return;
  }

  cleanupDomain = Utils.getCleanupDomain(hostname);
  const options = Utils.getDomainOptions(hostname);

  const [whitelist, cookieCount, lastCleaned] = await Promise.all([
    getWhitelist(),
    getCookieCountForDomain(cleanupDomain),
    getLastCleanedFor(cleanupDomain),
  ]);

  renderHostInfo(hostname, cookieCount);
  renderOptions(options, whitelist);
  renderLastCleaned(cleanupDomain, lastCleaned);
}

render();
