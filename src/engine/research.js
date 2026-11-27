/* LIFE & LEGACY — engine/research.js
 * Real-world grounding for the AI game-master.
 *
 * Priority order (first facts win, never throws):
 *   1. Server-side Gemini + Google Search via POST /api/ai/ground — live facts
 *      with clickable sources, when the game is server-hosted (probe-gated,
 *      dormant on Perchance / Pages / file://).
 *   2. Wikipedia summaries via superFetch-plugin (Perchance) or direct fetch
 *      (Pages/file builds — the REST API allows CORS).
 *   3. Empty string: the AI prompt simply runs ungrounded.
 * aiPrompt() (ai-core.js) appends LL.groundingText when set; server grounding
 * additionally fills LL.groundingSources, rendered as citation chips.
 * ensureGrounding() refreshes that string for the character's current job +
 * home place (session-cached, throttled, never throws). All 18 aiText() call
 * sites inherit the context with zero prompt-shape changes.
 * Custom/fictional worlds are labeled as inspiration-only so the AI never
 * confuses Wikipedia facts with the home world's fiction.
 *
 * Split-safe classic script: shared globals (S, LL). Load order = index.html
 * order (right after ai-core.js / ai-providers.js).
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
window.LL.groundingText = (typeof LL.groundingText === "string") ? LL.groundingText : "";
window.LL.groundingSources = Array.isArray(LL.groundingSources) ? LL.groundingSources : [];

var groundCache = {};
var groundingPrevKey = "";
var groundingAt = 0;
var groundingFlight = null;
var groundingMissingKey = false;
window.LL_AI_GROUND_TIMEOUT_MS = window.LL_AI_GROUND_TIMEOUT_MS || 20000;

function superFetchOk() {
  try { return !!((root && typeof root.superFetch === "function") || typeof fetch === "function"); }
  catch (e) { return false; }
}

/* Fetch with a timeout race — resolves a Response, rejects on timeout.
 * fetchOpts (e.g. POST bodies) bypass the superFetch plugin (GET-only). */
function superFetchTimeout(url, ms, fetchOpts) {
  ms = (typeof ms === "number" && ms > 0) ? ms : (window.LL_AI_GROUND_TIMEOUT_MS || 20000);
  var ctrl = null;
  try { ctrl = new AbortController(); } catch (e) { ctrl = null; }
  var timer = null;
  var onTimeout = new Promise(function (_, rej) {
    timer = setTimeout(function () {
      timer = null;
      if (ctrl) { try { ctrl.abort(); } catch (e) {} }
      var err = new Error("grounding fetch timeout after " + Math.round(ms / 1000) + "s");
      err.groundingTimeout = true;
      rej(err);
    }, ms);
  });
  function clear() { if (timer) { clearTimeout(timer); timer = null; } }
  var attempt = null;
  try {
    if (fetchOpts) {
      if (typeof fetch !== "function") return Promise.reject(new Error("fetch unavailable"));
      var fo = Object.assign({}, fetchOpts);
      if (ctrl) fo.signal = ctrl.signal;
      attempt = fetch(url, fo);
    } else if (typeof root !== "undefined" && root && typeof root.superFetch === "function") {
      attempt = Promise.resolve(root.superFetch(url));
    } else if (typeof fetch === "function") {
      var go = {};
      if (ctrl) go.signal = ctrl.signal;
      attempt = fetch(url, go);
    } else {
      return Promise.reject(new Error("grounding fetch unavailable"));
    }
  } catch (e) { return Promise.reject(e); }
  return Promise.race([attempt, onTimeout]).then(
    function (v) { clear(); return v; },
    function (e) { clear(); throw e; });
}

/* ---- Server leg: Gemini + Google Search (probe-gated, null when absent) ---- */
async function serverGround(payload) {
  try {
    if (typeof serverAiOk !== "function") return null;
    if (!(await serverAiOk())) return null;
    var res = await superFetchTimeout("/api/ai/ground", window.LL_AI_GROUND_TIMEOUT_MS || 20000, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    if (!res || !res.ok) return null;
    var j = null;
    try { j = await res.json(); } catch (e) { return null; }
    var summary = String((j && j.summary) || "").trim().slice(0, 600);
    if (!summary) return null;
    var sources = Array.isArray(j && j.sources) ? j.sources : [];
    return { summary: summary, sources: sources };
  } catch (e) { return null; }
}

/* ---- Wikipedia leg (Perchance plugin, else direct CORS fetch) ---- */
async function wikiFetch(title) {
  var t = String(title || "").trim();
  if (t.length < 2) return "";
  var key = "q:" + t;
  if (groundCache[key] !== undefined) return groundCache[key];
  var out = "";
  try {
    var res = await superFetchTimeout(
      "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t),
      window.LL_AI_GROUND_TIMEOUT_MS || 20000);
    if (res && res.ok) {
      var j = await res.json();
      out = String((j && j.extract) || "").replace(/\s+/g, " ").trim().slice(0, 280);
      if (/refers? to:/i.test(out.slice(0, 80))) out = ""; /* disambiguation page */
    }
  } catch (e) { out = ""; }
  groundCache[key] = out;
  return out;
}

/* Kept for compatibility with boot health check & callers. */
async function wikiSummary(title) {
  var t = String(title || "").trim();
  if (t.length < 2) return "";
  try {
    var g = await serverGround({ job: t, city: "", country: "", year: (S && S.year) || new Date().getFullYear() });
    if (g && g.summary) return g.summary.slice(0, 280);
  } catch (e) {}
  return wikiFetch(t);
}

function groundingKey() {
  if (!S) return "";
  return [(S.jobId || ""), (S.country || ""), (S.city || ""), (S.year || ""),
    (S.customWorld ? "custom" : "real")].join("|");
}

function renderGroundingBox() {
  try {
    var box = $("groundingBox");
    if (!box) return;
    var txt = LL.groundingText || "";
    var srcs = Array.isArray(LL.groundingSources) ? LL.groundingSources : [];
    if (!txt) {
      box.innerHTML = '<p class="sub">Start or load a life to ground your career and city with live Search facts.</p>';
      return;
    }
    var srcHtml = (typeof renderSourcesHtml === "function") ? renderSourcesHtml(srcs) : "";
    box.innerHTML = '<p class="sub">' + esc(txt) + "</p>" + srcHtml;
  } catch (e) {}
}

/* Refresh LL.groundingText (+LL.groundingSources on the server leg). Never throws. */
async function ensureGrounding(force) {
  if (typeof S === "undefined" || !S) return (LL.groundingText || "");
  if (!force && groundingMissingKey) return (LL.groundingText || "");
  var key = groundingKey(), now = Date.now();
  if (!force && key === groundingPrevKey && now - groundingAt < 60000)
    return (LL.groundingText || "");
  if (groundCache[key] && !force) {
    LL.groundingText = groundCache[key].summary;
    LL.groundingSources = groundCache[key].sources;
    groundingPrevKey = key;
    groundingAt = now;
    renderGroundingBox();
    return LL.groundingText;
  }
  if (groundingFlight) return groundingFlight;
  groundingFlight = (async function () {
    try {
      var job = "";
      try { job = (typeof jobName === "function" ? jobName() : ""); } catch (e) { job = ""; }
      var city = S.city || "";
      var country = S.country || "";
      if ((!job || job === "—" || job === "unemployed") && (!city && !country)) {
        return (LL.groundingText || "");
      }
      /* Server leg first (live facts + citations). */
      var g = await serverGround({
        job: job, city: city, country: country,
        year: S.year || new Date().getFullYear(), customWorld: S.customWorld || ""
      });
      if (g && g.summary) {
        LL.groundingText = g.summary;
        LL.groundingSources = g.sources;
        groundCache[key] = { summary: g.summary, sources: g.sources };
        groundingPrevKey = key;
        groundingAt = Date.now();
        renderGroundingBox();
        return LL.groundingText;
      }
      /* Wikipedia fallback (works on Perchance + Pages + offline-cached). */
      var bits = [];
      if (job && job !== "—" && job !== "unemployed") {
        var jd = await wikiFetch(job);
        if (jd) bits.push("In real life, " + job + " — " + jd);
      }
      var place = (city ? city + ", " : "") + (country || "");
      if (place && !/^(set dob first|set dob)/i.test(place)) {
        var pd = await wikiFetch(city || country);
        if (pd) bits.push(place + " — " + pd);
      }
      var txt = bits.join(" ").slice(0, 600).trim();
      if (txt && S.customWorld)
        txt = "(Home world '" + String(S.customWorld).slice(0, 80) +
          "' is fictional — use these real-world facts only as loose inspiration, never as canon.) " + txt;
      if (txt) {
        LL.groundingText = txt;
        LL.groundingSources = [];
        groundCache[key] = { summary: txt, sources: [] };
        groundingPrevKey = key;
        groundingAt = Date.now();
        renderGroundingBox();
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
  var keys = Object.keys(groundCache);
  return { hasPlugin: superFetchOk(), server: serverAiProbe, chars: (LL.groundingText || "").length,
    key: groundingPrevKey, cached: keys.length, text: (LL.groundingText || "").slice(0, 200) };
}

/* Background refresh: once shortly after boot, then every minute (throttled
 * to 60s + no-op when job/place unchanged). Fire-and-forget, never throws. */
try {
  setTimeout(function () { try { ensureGrounding(false); } catch (e) {} }, 4000);
  setInterval(function () { try { ensureGrounding(false); } catch (e) {} }, 60000);
} catch (e) {}

LL.files.push("research"); /* end-of-file registration: counts as loaded only after this file fully ran */
