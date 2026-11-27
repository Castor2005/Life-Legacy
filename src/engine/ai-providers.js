/* LIFE & LEGACY — engine/ai-providers.js
 * AI provider registry: text generation behind one routable adapter.
 *
 * Chain (first success wins, never wedges the game):
 *   1. gemini  — server-side Gemini 4 Hydrogen + Google Search grounding,
 *      via same-origin /api/ai/* (only attempted when the probe succeeds;
 *      dormant on Perchance, Pages, and file:// builds).
 *   2. perchance — the built-in plugin (zero config; the live game's engine).
 *   3. openai  — optional OpenAI-compatible endpoint (BYOK key in localStorage).
 * Every game system already calls aiText() with a deterministic fallback, so a
 * dead provider only costs one fast failure before the next leg or the fallback.
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
/* Config shape: {active:"gemini"|"perchance"|"openai", openai:{base,model,key}} */
var AI_CFG_KEY = "ll_ai_cfg";
function aiCfg() {
  var d = { active: "gemini", openai: { base: "https://api.openai.com/v1", model: "gpt-4o-mini", key: "" } };
  try {
    var raw = window.localStorage && localStorage.getItem(AI_CFG_KEY);
    if (raw) {
      var c = JSON.parse(raw);
      if (c && typeof c === "object") {
        if (c.active === "perchance" || c.active === "openai" || c.active === "gemini") d.active = c.active;
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
  try { if (window.localStorage && cfg) localStorage.setItem(AI_CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  try { renderAiProvider(); } catch (e2) {}
}
/* ---- server probe: is a Gemini backend reachable? (cached per session) ---- */
var serverAiProbe = null, serverAiFlight = null;
function serverAiOk() {
  if (serverAiProbe !== null) return Promise.resolve(serverAiProbe);
  if (serverAiFlight) return serverAiFlight;
  serverAiFlight = (async function () {
    try {
      if (typeof window === "undefined" || typeof window.fetch !== "function") return false;
      var proto = (window.location && window.location.protocol) || "";
      if (proto === "file:") return false; /* static/file builds: no backend */
      var ctrl = null;
      try { ctrl = new AbortController(); } catch (e) { ctrl = null; }
      var timer = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) {} }, 8000);
      var res = null;
      try { res = await fetch("/api/ai/status", { cache: "no-store", signal: ctrl ? ctrl.signal : undefined }); }
      finally { try { clearTimeout(timer); } catch (e) {} }
      return !!(res && res.ok);
    } catch (e) { return false; }
  })().then(function (v) { serverAiProbe = !!v; serverAiFlight = null; return serverAiProbe; },
    function () { serverAiProbe = false; serverAiFlight = null; return false; });
  return serverAiFlight;
}
function aiProviderChain() {
  /* Sync snapshot of the configured order (probe state may add gemini first). */
  var cfg = aiCfg(), chain = [];
  if (serverAiProbe) chain.push("gemini");
  if (cfg.active === "openai") { if (openaiReady(cfg)) chain.push("openai"); chain.push("perchance"); }
  else if (cfg.active === "perchance") { chain.push("perchance"); if (openaiReady(cfg)) chain.push("openai"); }
  else { if (serverAiProbe) chain.push("gemini"); chain.push("perchance"); if (openaiReady(cfg)) chain.push("openai"); }
  return chain;
}
function openaiReady(cfg) {
  cfg = cfg || aiCfg();
  return !!(cfg.openai && cfg.openai.key && cfg.openai.base && cfg.openai.model);
}
function aiProviderStatus() {
  var cfg = aiCfg();
  return { active: cfg.active, geminiServer: serverAiProbe, perchance: true,
    openaiReady: openaiReady(cfg), model: cfg.openai.model, chain: aiProviderChain() };
}
function aiInstrText(instr) {
  if (typeof instr === "string") return instr;
  if (Array.isArray(instr)) {
    for (var i = 0; i < instr.length; i++) {
      if (typeof instr[i] === "string") return instr[i];
    }
    return "";
  }
  return String(instr == null ? "" : instr);
}

/* ---- Server-side Gemini 4 Hydrogen leg ---- */
function aiGeminiText(opts, ms, onStop) {
  return new Promise(function (resolve, reject) {
    var ctrl = null;
    try { ctrl = new AbortController(); } catch (e) { ctrl = null; }
    if (onStop && ctrl) onStop(function () { try { ctrl.abort(); } catch (e) {} });
    var timer = setTimeout(function () {
      if (ctrl) { try { ctrl.abort(); } catch (e) {} }
    }, Math.max(5000, ms || 90000));
    function done(ok, v) {
      try { clearTimeout(timer); } catch (e) {}
      ok ? resolve(v) : reject(v);
    }

    (async function () {
      try {
        var prompt = aiInstrText(opts && opts.instruction);
        var startWith = (opts && typeof opts.startWith === "string") ? opts.startWith : "";
        var endpoint = (opts && typeof opts.endpoint === "string" && opts.endpoint.indexOf("/api/ai/") === 0)
          ? opts.endpoint
          : "/api/ai/generate";
        var useSearch = !!(opts && opts.useSearch);

        var res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt, startWith: startWith, useSearch: useSearch }),
          signal: ctrl ? ctrl.signal : undefined
        });

        var bodyText = "";
        try { bodyText = await res.text(); } catch (e) {}
        var data = null;
        try { data = JSON.parse(bodyText); } catch (e) { data = null; }

        if (!res.ok) {
          var errMsg = (data && data.error) ? data.error : ("AI endpoint " + res.status + " " + bodyText.slice(0, 140));
          var err = new Error(errMsg);
          if (data && data.code) err.code = data.code;
          return done(false, err);
        }

        var out = String((data && data.text) || "");
        var sources = Array.isArray(data && data.sources) ? data.sources : [];
        if (!out) return done(false, new Error("Gemini returned an empty reply."));
        try {
          if (opts && typeof opts.onChunk === "function") {
            opts.onChunk({ textChunk: out, fullTextSoFar: out });
          }
        } catch (e) {}
        return done(true, { text: out, sources: sources });
      } catch (e) {
        return done(false, e && e.name === "AbortError" ? new Error("AI request timed out") : e);
      }
    })();
  });
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
 * with the full text so typing indicators keep working. */
function aiOpenaiText(opts, ms, onStop) {
  var cfg = aiCfg().openai;
  return new Promise(function (resolve, reject) {
    var ctrl = null;
    try { ctrl = new AbortController(); } catch (e) { return reject(new Error("abort unsupported")); }
    if (onStop) onStop(function () { try { ctrl.abort(); } catch (e) {} });
    var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, Math.max(5000, ms || 90000));
    function done(ok, v) { try { clearTimeout(timer); } catch (e) {} ok ? resolve(v) : reject(v); }
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
        var txt = aiInstrText(instr) + (startWith ? "\n\nBegin your reply with exactly: " + startWith : "");
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

/* ---- Chain: gemini (when hosted) → configured engine → other → throw ---- */
function aiProviderText(opts, ms) {
  var stopped = false, curStop = null;
  function reg(fn) { curStop = fn; }
  var p = (async function () {
    if (stopped) throw new Error("stopped");
    var errs = [], legs = [];
    try { if (await serverAiOk()) legs.push("gemini"); } catch (e) {}
    var cfg = aiCfg();
    if (cfg.active === "openai") { if (openaiReady(cfg)) legs.push("openai"); legs.push("perchance"); }
    else { legs.push("perchance"); if (openaiReady(cfg)) legs.push("openai"); }
    for (var i = 0; i < legs.length; i++) {
      if (stopped) throw new Error("stopped");
      try {
        var r = legs[i] === "gemini" ? await aiGeminiText(opts, ms, reg)
          : legs[i] === "openai" ? await aiOpenaiText(opts, ms, reg)
          : await aiPerchanceText(opts, ms, reg);
        if (stopped) throw new Error("stopped");
        return { provider: legs[i], result: r };
      } catch (e) { errs.push(legs[i] + ": " + ((e && e.message) || e)); }
    }
    throw new Error(errs.length ? errs.join(" | ") : "no AI provider available");
  })();
  p.stop = function () {
    stopped = true;
    try { if (curStop) curStop(); } catch (e) {}
  };
  return p;
}

/* ---- Settings UI (Help modal section) ---- */
function renderAiProvider() {
  try {
    var cfg = aiCfg();
    var sel = $("aiProvSel");
    if (sel) { try { sel.value = cfg.active; } catch (e) {} }
    var row = $("aiProvOpenai");
    if (row) row.style.display = (cfg.active === "openai") ? "grid" : "none";
    if ($("aiProvBase") && document.activeElement !== $("aiProvBase")) $("aiProvBase").value = cfg.openai.base;
    if ($("aiProvModel") && document.activeElement !== $("aiProvModel")) $("aiProvModel").value = cfg.openai.model;
    if ($("aiProvKey") && document.activeElement !== $("aiProvKey") && !$("aiProvKey").value) $("aiProvKey").placeholder = cfg.openai.key ? "•••••••• (saved)" : "sk-…";
    var label = cfg.active === "openai" ? "Custom endpoint" : cfg.active === "perchance" ? "Perchance built-in" : "Server Gemini (with fallbacks)";
    var dot = $("aiProvDot");
    if (dot) dot.textContent = "🤖 AI engine: " + label;
    try {
      var proto = (window.location && window.location.protocol) || "";
      if (proto !== "file:" && typeof fetch === "function") {
        fetch("/api/ai/status").then(function (r) { return r.ok ? r.json() : null; }).then(function (st) {
          if (!dot) return;
          if (st && st.configured === false) {
            dot.textContent = "🤖 AI engine: " + label + " (server key missing — Gemini leg parked)";
          } else if (st) {
            dot.textContent = "🤖 AI engine: Gemini 4 Hydrogen (Google Search Grounding enabled)";
          }
        }).catch(function () {});
      }
    } catch (e) {}
    if (typeof renderGroundingBox === "function") renderGroundingBox();
  } catch (e) {}
}

async function aiProviderTest() {
  var el = $("aiProvTestRes");
  function say(t) { try { if (el) el.textContent = t; } catch (e) {} }
  say("…testing the active AI chain…");
  try {
    var w = await aiProviderText({ instruction: "Reply with exactly: PONG" }, 60000);
    var txt = String((w.result && w.result.text) || "");
    var msg = /PONG/i.test(txt)
      ? "✅ " + w.provider + ": OK (connected)"
      : (w.provider + " responded — " + txt.slice(0, 80));
    say(msg);
    try { toast("🤖 " + msg); } catch (e) {}
  } catch (e) {
    var errMsg = "AI chain: " + String((e && e.message) || e).slice(0, 200);
    say(errMsg);
    try { toast("⚠️ " + errMsg); } catch (e2) {}
  }
}

LL.files.push("ai-providers"); /* end-of-file registration: counts as loaded only after this file fully ran */
