/* LIFE & LEGACY — engine/community.js
 * On-demand community guestbook via dynamic-import-plugin.
 * Split-safe classic script: shared globals (S, LL, root.dynamicImport).
 * Load order = index.html order (after creator.js). Registered in LL.files
 * + boot EXPECT_FILES/EXPECT_GLOBALS.
 *
 * Why dynamic: the comments-plugin is heavy and only wanted by players who
 * open Help → Community. A static import would tax EVERY page load (and every
 * importer) for a feature most sessions never touch — the exact case the
 * dynamic-import-plugin docs recommend. So the guestbook is fetched once,
 * on demand: 'preload' fires in the background when Help opens, and the
 * Load button resolves the cached copy via 'async' (no page freeze, unlike
 * 'sync'). After the first load the module is cached in window.moduleSpace,
 * so re-opens are instant. All failures (offline, missing plugin) degrade
 * to a tap-to-retry note — the game never depends on it.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });

var COMMUNITY_CHANNEL = "life-and-legacy-guestbook";
var communityLoaded = false, communityLoading = false;

function dynamicImportOk() {
  try { return !!(root && typeof root.dynamicImport === "function"); }
  catch (e) { return false; }
}

/* Background fetch so the later 'async' load is already cached. Never throws. */
function preloadCommunity() {
  try {
    if (communityLoaded || communityLoading) return;
    if (!dynamicImportOk()) return;
    root.dynamicImport("comments-plugin", "preload");
  } catch (e) {}
}

/* Resolve the plugin and mount the guestbook into #communityBox. Never throws. */
async function loadCommunityBox() {
  var box = null, btn = null;
  try { box = $("communityBox"); btn = $("communityLoadBtn"); } catch (e) { return; }
  if (!box || communityLoaded || communityLoading) return;
  if (!dynamicImportOk()) {
    box.innerHTML = '<p class="sub">💬 The guestbook needs a connection to load. '
      + '<b><u id="communityRetry" style="cursor:pointer">Tap to retry</u></b>.</p>';
    var r0 = null;
    try { r0 = $("communityRetry"); } catch (e) {}
    if (r0) r0.onclick = function () { loadCommunityBox(); };
    return;
  }
  communityLoading = true;
  if (btn) { btn.disabled = true; btn.textContent = "💬 Loading guestbook…"; }
  box.innerHTML = "<p class=\"sub\">💬 Summoning the guestbook…</p>";
  try {
    var cp = await root.dynamicImport("comments-plugin", "async");
    if (typeof cp !== "function") throw new Error("bad plugin shape");
    box.innerHTML = cp({
      channel: COMMUNITY_CHANNEL,
      channelLabel: "💬 Life & Legacy guestbook",
      width: "100%",
      height: 320,
      commentPlaceholderText: "Share a legendary life, a tip, or a bug report…",
      newestCommentsAtTop: true
    });
    communityLoaded = true;
    if (btn) btn.hidden = true;
  } catch (e) {
    box.innerHTML = '<p class="sub">💬 The guestbook fizzled (offline?). '
      + '<b><u id="communityRetry" style="cursor:pointer">Tap to retry</u></b>.</p>';
    var r1 = null;
    try { r1 = $("communityRetry"); } catch (err) {}
    if (r1) r1.onclick = function () { loadCommunityBox(); };
    if (btn) { btn.disabled = false; btn.textContent = "💬 Load guestbook"; }
  }
  communityLoading = false;
}

function communityStatus() {
  return {
    loaded: communityLoaded, loading: communityLoading,
    hasPlugin: dynamicImportOk(), channel: COMMUNITY_CHANNEL
  };
}

window.preloadCommunity = preloadCommunity;
window.loadCommunityBox = loadCommunityBox;
window.communityStatus = communityStatus;

LL.files.push("community"); /* end-of-file registration: counts as loaded only after this file fully ran */