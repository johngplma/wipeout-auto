// Theme applier — runs in popup and settings page.
// Theme preference is stored top-level in chrome.storage.local.theme:
//   "system" (default) | "light" | "dark"
// Stored at the top level so "Reset to defaults" on advanced settings
// doesn't touch it. Cleanup and full-sweep don't touch chrome.storage.local
// either, so the user's preference is fully durable.
//
// Loaded in <head> before the stylesheet so the synchronous initial apply
// (using prefers-color-scheme) happens before first paint. The stored
// preference is read asynchronously and re-applied if it differs from system.

(function () {
  const root = document.documentElement;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  let currentPref = "system";

  function resolve(pref) {
    if (pref === "dark" || pref === "light") return pref;
    return mql.matches ? "dark" : "light";
  }

  function apply() {
    const resolved = resolve(currentPref);
    root.classList.toggle("theme-dark", resolved === "dark");
    root.classList.toggle("theme-light", resolved === "light");
  }

  // Synchronous: apply system preference before first paint.
  apply();

  // Asynchronous: load the user's stored preference and re-apply.
  chrome.storage.local.get("theme").then(({ theme = "system" }) => {
    currentPref = theme;
    apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.theme) return;
    currentPref = changes.theme.newValue || "system";
    apply();
  });

  // Re-apply when the OS preference changes (only matters in "system" mode,
  // but cheap enough to always run).
  mql.addEventListener("change", apply);
})();
