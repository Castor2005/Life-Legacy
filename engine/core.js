/* LIFE & LEGACY — engine/core.js
 * Namespace + load-order registry + original TOC. No game logic.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============================================================================
 * LIFE & LEGACY — core engine (restructured, same behavior)
 * Single IIFE. Global S is the one mutable save-state (see SECTION 1).
 * Yearly pipeline: SECTION 5 (ageUp -> runYearlySystems -> runYearlyEvents
 * -> endYear). Death flow: checkVitalSigns/checkDeath -> die -> showDeath.
 * TOC: 0 pure helpers / 1 state / 2 appearance / 3 AI core / 4 life creation
 *  / 5 yearly lifecycle / 6 events / 7 director v2 / 8 death+heirs / 9 actions
 *  / 10 living world / 11 rendering / 12 saves+modals / 13 creator+geo+init.
 * FUTURE MODULES (16 biggest, split out first - keep S shape frozen):
 *  1 init(133)->boot.js  2 doAct(125)->actions.js  3 render(84)->render.js
 * DONE (all split into src/engine/*.js, shared classic-script scope):
 *  init->boot.js  doAct+doDecision->actions.js  render->render.js
 *  renderWorldPanel->render.js  wTickNPCs->world.js  newLife->life.js
 *  migrate->migrate.js  openDynasty->dynasty.js  yearly*->yearly.js
 *  applySceneFx+sanitize/fallbackDirectorFx->director.js
 *  fillCreateModal+collectCreateOpts->creator.js  showDeath+obituary+heirs
 *  +crime career + real children + family company->death.js/dynasty.js
 *  chatSend/chatFallback/chatArt->render.js
 * ========================================================================== */
/* ============ console capture (debug): window.__consoleCapture75847 ============
 * Installed FIRST among engine files so uncaught errors / rejections from any
 * later script are recorded instead of vanishing. Call-through wrappers: the
 * original console methods still run, so page logs and tooling are unaffected.
 * ui.js drains this after every 5 auto-mode years and surfaces new entries in
 * the topbar 🐛 icon (with ❌ count) + toast. Session only, capped at 200. */
window.__consoleCapture75847 = window.__consoleCapture75847 || { entries: [] };
(function bugCaptureInstall(){
  /* NOTE: this array is SHARED with the platform's own capture: platform
   * entries look like {n,k,s}, ours like {t,kind,msg}. Either side may be
   * absent (e.g. sandboxed embeds), so we only ADD missing helpers, never
   * replace, and readers (ui.js bugNorm) accept both shapes + dedupe. */
  var C = window.__consoleCapture75847;
  if (!C.entries) C.entries = [];
  if (!C.max) C.max = 200;
  function push(kind, msg){
    try {
      C.entries.push({ t: Date.now(), kind: String(kind || "log"), msg: String(msg == null ? "" : msg).slice(0, 500) });
      while (C.entries.length > C.max) C.entries.shift();
      try { if (window.__llBugNotify) window.__llBugNotify(); } catch (e) {}
    } catch (e) {}
  }
  C.push = C.push || push;
  C.peek = C.peek || function(){ try { return C.entries.slice(); } catch (e) { return []; } };
  C.drain = C.drain || function(){ try { var a = C.entries; C.entries = []; return a; } catch (e) { return []; } };
  if (C.llInstalled) return;
  C.llInstalled = true;
  function fmtArg(a){ try { return typeof a === "string" ? a : JSON.stringify(a); } catch (e) { return String(a); } }
  try {
    ["error", "warn"].forEach(function (k){
      try {
        var orig = console[k];
        if (typeof orig !== "function" || orig.__bugWrapped) return;
        var w = function(){
          try { push("console." + k, Array.prototype.map.call(arguments, fmtArg).join(" ")); } catch (e) {}
          return orig.apply(console, arguments);
        };
        w.__bugWrapped = true;
        console[k] = w;
      } catch (e) {}
    });
  } catch (e) {}
  try {
    window.addEventListener("error", function (ev){
      try { push("uncaught", (ev.message || "Error") + (ev.lineno ? " @" + String(ev.filename || "").split("/").pop() + ":" + ev.lineno : "")); } catch (e) {}
    });
  } catch (e) {}
  try {
    window.addEventListener("unhandledrejection", function (ev){
      try { var r = ev.reason; push("rejection", (r && (r.stack || r.message)) || String(r)); } catch (e) {}
    });
  } catch (e) {}
})();

LL.files.push("core"); /* end-of-file registration: counts as loaded only after this file fully ran */