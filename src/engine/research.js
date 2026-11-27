/* LIFE & LEGACY — engine/research.js
 * Real-world grounding for the AI game-master via super-fetch-plugin.
 * Split-safe classic script: shared globals (S, LL, root.superFetch).
 * Load order = index.html order (right after ai-core.js). Registered in
 * LL.files + boot EXPECT_FILES/EXPECT_GLOBALS.
 *
 * What it does: aiPrompt() (ai-core.js) appends LL.groundingText when set.
 * ensureGrounding() refreshes that string from Wikipedia summaries of the
 * character's current job + home place (2 fetches max, ~9s timeout each,
 * session-cached, never throws). All 18 aiText() call sites inherit the
 * context with zero prompt-shape changes, so fallbacks/parity are untouched.
 * Custom/fictional worlds are labeled as inspiration-only so the AI never
 * confuses Wikipedia facts with the home world's fiction.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
window.LL.groundingText = (typeof LL.groundingText === "string") ? LL.groundingText : "";

var wikiCache = {};
var groundingPrevKey = "";
var groundingAt = 0;
var groundingFlight = null;
window.LL_AI_GROUND_TIMEOUT_MS = window.LL_AI_GROUND_TIMEOUT_MS || 9000;

function superFetchOk() {
  try { return !!(root && typeof root.superFetch === "function"); } catch (e) { return false; }
}

/* superFetch with a timeout race — resolves a Response, rejects on timeout. */
function superFetchTimeout(url, ms) {
  ms = (typeof ms === "number" && ms > 0) ? ms : (window.LL_AI_GROUND_TIMEOUT_MS || 9000);
  var p = null;
  try {
    if (!superFetchOk()) return Promise.reject(new Error("superFetch unavailable (plugin missing)"));
    p = root.superFetch(url);
  } catch (e) { return Promise.reject(e); }
  var timer = null;
  var onTimeout = new Promise(function (_, rej) {
    timer = setTimeout(function () {
      timer = null;
      var err = new Error("grounding fetch timeout after " + Math.round(ms / 1000) + "s");
      err.groundingTimeout = true;
      rej(err);
    }, ms);
  });
  function clear() { if (timer) { clearTimeout(timer); timer = null; } }
  return Promise.race([Promise.resolve(p), onTimeout]).then(
    function (v) { clear(); return v; },
    function (e) { clear(); throw e; });
}

/* Short Wikipedia summary for a title. Cached per session. Never throws. */
async function wikiSummary(title) {
  var t = String(title || "").trim();
  if (t.length < 2) return "";
  if (wikiCache[t] !== undefined) return wikiCache[t];
  var out = "";
  try {
    var res = await superFetchTimeout(
      "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t),
      window.LL_AI_GROUND_TIMEOUT_MS || 9000);
    var j = await res.json();
    out = String((j && j.extract) || "").replace(/\s+/g, " ").trim().slice(0, 280);
    if (/refers? to:/i.test(out.slice(0, 80))) out = ""; /* disambiguation page */
  } catch (e) { out = ""; }
  wikiCache[t] = out;
  return out;
}

function groundingKey() {
  if (!S) return "";
  return [(S.jobId || ""), (S.country || ""), (S.city || ""),
    (S.customWorld ? "custom" : "real")].join("|");
}

/* Refresh LL.groundingText (job + place, max ~600 chars). Never throws. */
async function ensureGrounding(force) {
  if (typeof S === "undefined" || !S) return (LL.groundingText || "");
  var key = groundingKey(), now = Date.now();
  if (!force && key === groundingPrevKey && now - groundingAt < 30000)
    return (LL.groundingText || "");
  if (groundingFlight) return groundingFlight;
  groundingFlight = (async function () {
    try {
      var bits = [];
      var job = "";
      try { job = (typeof jobName === "function" ? jobName() : ""); } catch (e) { job = ""; }
      if (job && job !== "—" && job !== "unemployed") {
        var jd = await wikiSummary(job);
        if (jd) bits.push("In real life, " + job + " — " + jd);
      }
      var place = (S.city ? S.city + ", " : "") + (S.country || "");
      if (place && !/^(set dob first|set dob)/i.test(place)) {
        var pd = await wikiSummary(S.city || S.country);
        if (pd) bits.push(place + " — " + pd);
      }
      var txt = bits.join(" ").slice(0, 600).trim();
      if (txt && S.customWorld)
        txt = "(Home world '" + String(S.customWorld).slice(0, 80) +
          "' is fictional — use these real-world facts only as loose inspiration, never as canon.) " + txt;
      if (txt) {
        LL.groundingText = txt;
        groundingPrevKey = key;
        groundingAt = Date.now();
      }
      return (LL.groundingText || "");
    } catch (e) {
      return (LL.groundingText || "");
    } finally {
      groundingFlight = null;
    }
  })();
  return groundingFlight;
}

function refreshGrounding() { return ensureGrounding(true); }

function groundingStatus() {
  var keys = Object.keys(wikiCache);
  return { hasPlugin: superFetchOk(), chars: (LL.groundingText || "").length,
    key: groundingPrevKey, cached: keys.length, text: (LL.groundingText || "").slice(0, 200) };
}

/* Background refresh: once shortly after boot, then every minute (throttled
 * to 30s + no-op when job/place unchanged). Fire-and-forget, never throws. */
try {
  setTimeout(function () { try { ensureGrounding(false); } catch (e) {} }, 4000);
  setInterval(function () { try { ensureGrounding(false); } catch (e) {} }, 60000);
} catch (e) {}

window.superFetchTimeout = superFetchTimeout;
window.wikiSummary = wikiSummary;
window.ensureGrounding = ensureGrounding;
window.refreshGrounding = refreshGrounding;
window.groundingStatus = groundingStatus;

LL.files.push("research"); /* end-of-file registration: counts as loaded only after this file fully ran */