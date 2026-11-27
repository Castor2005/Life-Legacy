/* LIFE & LEGACY — engine/ai-providers.js
 * AI provider registry: text generation behind one routable adapter.
 *
 * WHY: the game must be both (A) drivable by the most advanced AI the player
 * can reach, and (B) fully playable with no AI at all. Every game system
 * already calls aiText() with a deterministic fallback; this file decides
 * WHERE aiText() goes: the built-in Perchance plugin (default, zero config),
 * an optional OpenAI-compatible endpoint (OpenAI, OpenRouter, local bridges —
 * key + model + base URL, yours to configure), chained so a dead provider
 * falls through to the next instead of wedging the game.
 *
 * Privacy: custom-provider keys live in localStorage only, are never logged,
 * and the settings UI states exactly where your words go. Images always use
 * the built-in art pipeline (requestImage) regardless of text provider.
 *
 * Shared scope: classic scripts, globals (S, LL). Load order = index.html
 * order (right after ai-core.js). Call-time resolution: ai-core delegates
 * here only if aiProviderText exists.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
/* Config shape: {active:"perchance"|"openai", openai:{base,model,key}} */
var AI_CFG_KEY = "ll_ai_cfg";
function aiCfg() {
  var d = { active: "perchance", openai: { base: "https://api.openai.com/v1", model: "gpt-4o-mini", key: "" } };
  try {
    var raw = window.localStorage && localStorage.getItem(AI_CFG_KEY);
    if (raw) {
      var c = JSON.parse(raw);
      if (c && typeof c === "object") {
        if (c.active === "openai" || c.active === "perchance") d.active = c.active;
        if (c.openai && typeof c.openai === "object") {
          if (typeof c.openai.base === "string" && c.openai.base) d.openai.base = c.openai.base.slice(0, 120);
          if (typeof c.openai.model === "string" && c.openai.model) d.openai.model = c.openai.model.slice(0, 80);
          if (typeof c.openai.key === "string") d.openai.key = c.openai.key.slice(0, 300);
        }
      }
    }
  } catch (e) {}
  return d;
}
function aiCfgSave(cfg) {
  try { if (window.localStorage) localStorage.setItem(AI_CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  try { renderAiProvider(); } catch (e) {}
}
function aiProviderChain() {
  /* Ordered provider ids to try. Active first, then the other if configured. */
  var cfg = aiCfg(), chain = [];
  function openaiReady() { return !!(cfg.openai && cfg.openai.key && cfg.openai.base && cfg.openai.model); }
  if (cfg.active === "openai") { if (openaiReady()) chain.push("openai"); chain.push("perchance"); }
  else { chain.push("perchance"); if (openaiReady()) chain.push("openai"); }
  return chain;
}
function aiProviderStatus() {
  var cfg = aiCfg();
  var openaiReady = !!(cfg.openai && cfg.openai.key);
  return { active: cfg.active, perchance: true, openaiReady: openaiReady, model: cfg.openai.model, chain: aiProviderChain() };
}
/* ---- Perchance leg (built-in plugin, zero config) ---- */
function aiPerchanceText(opts, ms, onStop) {
  return new Promise(function (resolve, reject) {
    var p = null;
    try {
      if (!window.root || typeof window.root.generateText !== "function")
        return reject(new Error("AI text unavailable (plugin missing)"));
      p = window.root.generateText(opts);
    } catch (e) { return reject(e); }
    if (onStop) onStop(function () { try { if (p && typeof p.stop === "function") p.stop(); } catch (e) {} });
    Promise.resolve(p).then(resolve, reject);
  });
}
/* ---- OpenAI-compatible leg (custom endpoint, BYOK) ----
 * opts passthrough: instruction (string, or [text, Blob] vision), startWith,
 * onChunk({textChunk, fullTextSoFar}). Non-streaming POST; onChunk fires once
 * with the full text so typing indicators keep working (coarser than plugin
 * streaming — a future upgrade can flip stream:true + SSE). */
function aiOpenaiText(opts, ms, onStop) {
  var cfg = aiCfg().openai;
  return new Promise(function (resolve, reject) {
    var ctrl = null;
    try { ctrl = new AbortController(); } catch (e) { return reject(new Error("abort unsupported")); }
    if (onStop) onStop(function () { try { ctrl.abort(); } catch (e) {} });
    var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, Math.max(5000, ms || 90000));
    function done(ok, v) { try { clearTimeout(timer); } catch (e) {} ok ? resolve(v) : reject(v); }
    function instrText(instr) {
      if (typeof instr === "string") return instr;
      if (Array.isArray(instr)) {
        for (var i = 0; i < instr.length; i++) if (typeof instr[i] === "string") return instr[i];
        return "";
      }
      return String(instr == null ? "" : instr);
    }
    function blobToDataUrl(blob) {
      return new Promise(function (res, rej) {
        try { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(blob); }
        catch (e) { rej(e); }
      });
    }
    (async function () {
      try {
        var instr = (opts && opts.instruction !== undefined) ? opts.instruction : "";
        var startWith = (opts && typeof opts.startWith === "string") ? opts.startWith : "";
        var content = [];
        var txt = instrText(instr) + (startWith ? "\n\nBegin your reply with exactly: " + startWith : "");
        content.push({ type: "text", text: txt });
        if (Array.isArray(instr)) {
          for (var i = 0; i < instr.length; i++) {
            if (typeof window.Blob !== "undefined" && instr[i] instanceof Blob) {
              var du = await blobToDataUrl(instr[i]);
              content.push({ type: "image_url", image_url: { url: String(du).slice(0, 200000) } });
              break; /* single-image cost discipline, mirrors the plugin */
            }
          }
        }
        var base = String(cfg.base || "").replace(/\/+$/, "");
        var res = await fetch(base + "/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: content }], temperature: 0.9 }),
          signal: ctrl.signal
        });
        if (!res.ok) {
          var t = "";
          try { t = await res.text(); } catch (e) {}
          return done(false, new Error("AI endpoint " + res.status + " " + String(t).slice(0, 160)));
        }
        var j = await res.json();
        var out = (((j.choices || [])[0] || {}).message || {}).content || "";
        if (Array.isArray(out)) out = out.map(function (p) { return (p && p.text) || ""; }).join("");
        out = String(out || "");
        if (!out) return done(false, new Error("AI endpoint returned empty reply"));
        try { if (opts && typeof opts.onChunk === "function") opts.onChunk({ textChunk: out, fullTextSoFar: out }); } catch (e) {}
        return done(true, { text: out });
      } catch (e) { return done(false, e && e.name === "AbortError" ? new Error("AI endpoint timed out") : e); }
    })();
  });
}
/* Chain call used by ai-core's aiText: tries providers in order, resolves
 * {provider, result} with the FIRST success. Stoppable: .stop() aborts the
 * in-flight leg and poisons the rest of the chain. Never resolves empty. */
function aiProviderText(opts, ms) {
  var chain = aiProviderChain();
  var stopped = false, curStop = null;
  function reg(fn) { curStop = fn; }
  var p = (async function () {
    var lastErr = null;
    for (var i = 0; i < chain.length; i++) {
      if (stopped) throw new Error("stopped");
      try {
        var r = chain[i] === "openai"
          ? await aiOpenaiText(opts, ms, reg)
          : await aiPerchanceText(opts, ms, reg);
        if (stopped) throw new Error("stopped");
        return { provider: chain[i], result: r };
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("no AI provider available");
  })();
  p.stop = function () { stopped = true; try { if (curStop) curStop(); } catch (e) {} };
  return p;
}
/* ---- settings UI (Help modal section) ---- */
function renderAiProvider() {
  try {
    var st = aiProviderStatus();
    var dot = $("aiProvDot"), sel = $("aiProvSel"), row = $("aiProvOpenai");
    if (dot) {
      var label = st.active === "openai" ? ("custom endpoint" + (st.openaiReady ? "" : " (no key — will fall back)")) : "Perchance built-in";
      dot.textContent = "🤖 AI engine: " + label;
    }
    if (sel && String(sel.value) !== st.active) sel.value = st.active;
    var cfg = aiCfg();
    if (row) row.style.display = (st.active === "openai") ? "grid" : "none";
    if ($("aiProvBase") && document.activeElement !== $("aiProvBase")) $("aiProvBase").value = cfg.openai.base;
    if ($("aiProvModel") && document.activeElement !== $("aiProvModel")) $("aiProvModel").value = cfg.openai.model;
    if ($("aiProvKey") && document.activeElement !== $("aiProvKey") && !$("aiProvKey").value) $("aiProvKey").placeholder = cfg.openai.key ? "key saved ●●●● (enter a new one to replace)" : "sk-… / or-openrouter key";
  } catch (e) {}
}
async function aiProviderTest() {
  var el = $("aiProvTestRes");
  function say(t) { try { if (el) el.textContent = t; } catch (e) {} }
  say("…asking each engine one short question…");
  var cfg = aiCfg(), report = [];
  try {
    var p = aiPerchanceText({ instruction: "Reply with exactly: PONG" }, 60000);
    var r = await p;
    report.push("Perchance: " + (/PONG/.test((r && r.text) || "") ? "OK" : "answered (no PONG)"));
  } catch (e) { report.push("Perchance: FAIL (" + String((e && e.message) || e).slice(0, 80) + ")"); }
  if (cfg.openai && cfg.openai.key) {
    try {
      var q = await aiOpenaiText({ instruction: "Reply with exactly: PONG" }, 60000);
      var t = (q && q.text) || "";
      report.push("Custom (" + cfg.openai.model + "): " + (/PONG/.test(t) ? "OK" : "answered (no PONG): " + t.slice(0, 60)));
    } catch (e) { report.push("Custom: FAIL (" + String((e && e.message) || e).slice(0, 90) + ")"); }
  } else report.push("Custom: no key saved — skipped");
  say(report.join(" · "));
  try { toast("🤖 " + report.join(" | ")); } catch (e) {}
}

LL.files.push("ai-providers"); /* end-of-file registration: counts as loaded only after this file fully ran */
