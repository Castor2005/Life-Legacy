/* LIFE & LEGACY — engine/mods.js
 * Data-mod system: repo mods (src/mods/) + player pasted-JSON mods.
 *
 * DESIGN (opinionated, quarantine-first):
 * - JSON-first. Mods declare events / tab verbs / yearly effects / an AI
 *   prompt flavor line. All of it is validated with the SAME gates as core
 *   content (LL.fxValidate + migrateEvent) and can only ADD (base packs load
 *   first, contentMerge dedups by id, so a mod can never override core ids).
 * - Executable JS exists ONLY for shipped repo mods (same trust boundary as
 *   the engine: a file in src/mods/ loaded by an explicit script entry).
 *   Player-pasted mods are pure JSON — no code, no eval, nothing to XSS.
 * - Loading never throws. A bad mod is quarantined (listed in Help with the
 *   reason) and the game continues without it. Version pins (eventSchema) are
 *   hard gates; contentVersion drift is a warning.
 * - Mods carry NO save shape: events/verbs resolve through the validated
 *   effect executor, yearly effects are stat/log deltas. Disabling a mod
 *   strips its events from the pool; nothing in S dangles.
 * Shared scope: classic script, globals (S, LL, contentMerge, etc.).
 */
window.LL = (window.LL || { v: 1, files: [] });
LL.MOD_SCHEMA = 1;
var MOD_LS_PLAYER = "ll_mods_player", MOD_LS_ENABLED = "ll_mods_enabled";
var modRegistry = [];   /* [{id,name,version,source,enabled,errors[],warnings[],events,verbs,yearly,promptBlock,acts,yearlyFns,promptFns}] */
var modErrors = [];     /* quarantine list: {mod, reason} — session-persistent */
var modEventIds = {};   /* eventId -> modId (for toggle-strip) */
function modLsGet(k, fb) {
  try { var v = window.localStorage && window.localStorage.getItem(k); return v === null || v === undefined ? fb : v; }
  catch (e) { return fb; }
}
function modLsSet(k, v) {
  try { if (window.localStorage) window.localStorage.setItem(k, v); } catch (e) {}
}
function modEnabledMap() {
  try { return JSON.parse(modLsGet(MOD_LS_ENABLED, "{}")) || {}; } catch (e) { return {}; }
}
function modIsEnabled(id) {
  var m = modEnabledMap();
  if (m[id] === undefined || m[id] === null) {
    var r = null, i;
    for (i = 0; i < modRegistry.length; i++) if (modRegistry[i].id === id) { r = modRegistry[i]; break; }
    return r ? !r.defaultOff : true;
  }
  return !!m[id];
}
/* ---- validation (same gates as core content) ---- */
function modCheckEvent(ev) {
  var errs = [];
  try {
    if (!window.LL || !LL.fxValidate) { errs.push("engine validator not loaded"); return errs; }
    var v = LL.fxValidate.validateEvent(ev, {});
    (v || []).forEach(function (e) { errs.push(String(e)); });
  } catch (e) { errs.push("validator threw: " + String(e && e.message || e).slice(0, 120)); }
  return errs;
}
function modCheckFxList(fx, where) {
  var errs = [];
  try {
    if (!window.LL || !LL.fxValidate) return ["engine validator not loaded"];
    /* wrap verb/yearly effects as a pseudo-event choice — same op grammar */
    var pseudo = { id: "modwrap", title: "mod", minAge: 0, maxAge: 120, tags: ["mod"], weight: 1, text: "x",
      choices: [{ label: "x", effects: fx || [] }] };
    var v = LL.fxValidate.validateEvent(pseudo, {});
    (v || []).forEach(function (e) {
      var s = String(e);
      if (s.indexOf("modwrap") === 0) return; /* wrapper id, not the mod's fault */
      errs.push(where + ": " + s);
    });
  } catch (e) { errs.push(where + ": validator threw"); }
  return errs;
}
function modSanitizeStr(s, n) { return String(s === null || s === undefined ? "" : s).slice(0, n); }
/* core action ids shadow mod verbs (doAct's switch + dec-/major-/focus-
 * prefixes run before the mod hook), so colliding verb ids are dead weight.
 * Computed live from TABS so new core verbs are covered automatically. */
function modCoreVerbIds() {
  var s = {}, t, i;
  try {
    if (typeof TABS === "object" && TABS) for (t in TABS) {
      var L = TABS[t] || [];
      for (i = 0; i < L.length; i++) if (L[i] && L[i][0]) s[L[i][0]] = 1;
    }
  } catch (e) {}
  ["behave", "escape", "yard", "mortality", "direct", "scenerand", "unknown"].forEach(function (k) { s[k] = 1; });
  return s;
}
function modVerbReserved(vid) {
  return vid.indexOf("dec-") === 0 || vid.indexOf("major-") === 0 || vid.indexOf("focus-") === 0;
}
/* ---- registration ---- */
function modFind(id) {
  for (var i = 0; i < modRegistry.length; i++) if (modRegistry[i].id === id) return modRegistry[i];
  return null;
}
/* JS-surface registration for shipped repo script mods (same trust as engine).
 * spec: {id, name?, version?, acts?:{verbId:function}, yearly?:[fn], prompt?:[string|fn]} */
function modRegister(spec) {
  try {
    if (!spec || typeof spec.id !== "string" || !spec.id) return false;
    var r = modFind(spec.id);
    if (!r) { r = { id: spec.id, name: spec.name || spec.id, version: 0, source: "repo-js", defaultOff: true, enabled: true, errors: [], warnings: [], events: [], verbs: [], yearly: null, promptBlock: "", acts: {}, yearlyFns: [], promptFns: [] }; modRegistry.push(r); }
    if (spec.name) r.name = String(spec.name).slice(0, 60);
    if (spec.version) r.version = +spec.version || 0;
    if (spec.acts && typeof spec.acts === "object") {
      var __core = modCoreVerbIds();
      for (var k in spec.acts) {
        if (typeof spec.acts[k] !== "function") continue;
        if (__core[k] || modVerbReserved(k)) { modErrors.push({ mod: spec.id, reason: "act '" + k + "' collides with a core action — skipped (core shadows it)" }); continue; }
        r.acts[k] = spec.acts[k];
      }
    }
    if (spec.yearly && spec.yearly.length) for (var i = 0; i < spec.yearly.length; i++) if (typeof spec.yearly[i] === "function") r.yearlyFns.push(spec.yearly[i]);
    if (spec.prompt && spec.prompt.length) for (var j = 0; j < spec.prompt.length; j++) r.promptFns.push(spec.prompt[j]);
    return true;
  } catch (e) { return false; }
}
/* JSON mod registration (repo files + player imports — no code by construction). */
function modRegisterJSON(obj, source) {
  var errs = [], warns = [];
  if (!obj || typeof obj !== "object") return { ok: false, errors: ["not an object"] };
  var id = typeof obj.id === "string" ? obj.id.trim().slice(0, 40) : "";
  if (!id || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) return { ok: false, errors: ["bad id (lowercase letters/digits/_/-, e.g. my-mod)"] };
  if (modFind(id)) return { ok: false, errors: ["duplicate mod id '" + id + "' (already registered)"] };
  if (obj.modSchema !== undefined && obj.modSchema !== LL.MOD_SCHEMA) errs.push("modSchema " + obj.modSchema + " is not engine MOD_SCHEMA " + LL.MOD_SCHEMA);
  if (obj.eventSchema !== undefined && window.LL && obj.eventSchema > LL.EVENT_SCHEMA) errs.push("eventSchema v" + obj.eventSchema + " is newer than engine EVENT_SCHEMA v" + LL.EVENT_SCHEMA);
  if (obj.contentVersion !== undefined && window.LL && obj.contentVersion !== LL.CONTENT_VERSION) warns.push("contentVersion " + obj.contentVersion + " vs engine " + LL.CONTENT_VERSION + " (loads anyway)");
  var events = Array.isArray(obj.events) ? obj.events : [];
  var verbs = Array.isArray(obj.verbs) ? obj.verbs : [];
  if (events.length + verbs.length === 0 && !obj.yearly && !obj.promptBlock) warns.push("mod adds nothing (no events/verbs/yearly/promptBlock)");
  var seenEv = {};
  events.forEach(function (ev, i) {
    if (!ev || typeof ev !== "object") { errs.push("events[" + i + "]: not an object"); return; }
    if (typeof ev.id !== "string" || !ev.id) { errs.push("events[" + i + "]: missing id"); return; }
    if (seenEv[ev.id]) { errs.push("events[" + i + "]: duplicate id '" + ev.id + "' inside mod"); return; }
    seenEv[ev.id] = 1;
    if (modEventIds[ev.id]) { errs.push("event '" + ev.id + "': id already taken by " + (modEventIds[ev.id] === id ? "this mod" : "mod '" + modEventIds[ev.id] + "'") + " — core/mod ids are first-come"); return; }
    modCheckEvent(ev).forEach(function (e) { errs.push("event '" + ev.id + "': " + e); });
  });
  var seenVb = {};
  var coreVb = modCoreVerbIds();
  var skippedVb = {};
  verbs.forEach(function (vb, i) {
    if (!vb || typeof vb !== "object") { errs.push("verbs[" + i + "]: not an object"); return; }
    var vid = typeof vb.id === "string" ? vb.id.trim() : "";
    if (!vid || !/^[A-Za-z0-9_-]+$/.test(vid)) { errs.push("verbs[" + i + "]: bad id"); return; }
    if (seenVb[vid]) { errs.push("verb '" + vid + "': duplicate inside mod"); return; }
    seenVb[vid] = 1;
    if (coreVb[vid] || modVerbReserved(vid)) { warns.push("verb '" + vid + "' collides with a core action — skipped (core shadows it)"); modErrors.push({ mod: id, reason: "verb '" + vid + "' collides with a core action — skipped" }); skippedVb[vid] = 1; return; }
    if (typeof vb.label !== "string" || !vb.label.trim()) { errs.push("verb '" + vid + "': missing label"); return; }
    if (["activities", "social", "family", "education", "money", "health", "crown", "world"].indexOf(vb.tab) < 0) { errs.push("verb '" + vid + "': bad tab '" + vb.tab + "'"); return; }
    if (!Number.isInteger(vb.minAge) || vb.minAge < 0 || vb.minAge > 120) { errs.push("verb '" + vid + "': bad minAge"); return; }
    if (vb.maxAge !== undefined && (!Number.isInteger(vb.maxAge) || vb.maxAge < vb.minAge || vb.maxAge > 120)) { errs.push("verb '" + vid + "': bad maxAge"); return; }
    if (vb.cost !== undefined && (!(+vb.cost >= 0) || +vb.cost > 1000000000)) { errs.push("verb '" + vid + "': bad cost"); return; }
    if (!Array.isArray(vb.effects) || !vb.effects.length) { errs.push("verb '" + vid + "': effects must be a non-empty array"); return; }
    modCheckFxList(vb.effects, "verb '" + vid + "'").forEach(function (e) { errs.push(e); });
  });
  if (obj.yearly !== undefined && obj.yearly !== null) {
    if (typeof obj.yearly !== "object") errs.push("yearly: must be an object");
    else {
      if (!Array.isArray(obj.yearly.effects) || !obj.yearly.effects.length) errs.push("yearly.effects must be a non-empty array");
      else modCheckFxList(obj.yearly.effects, "yearly").forEach(function (e) { errs.push(e); });
      if (obj.yearly.chance !== undefined && (!(+obj.yearly.chance >= 0) || +obj.yearly.chance > 1)) errs.push("yearly.chance must be 0..1");
    }
  }
  if (obj.promptBlock !== undefined && typeof obj.promptBlock !== "string") errs.push("promptBlock must be a string");
  var rec = { id: id, name: modSanitizeStr(obj.name || id, 60), version: +obj.version || 0,
    source: source || "player", defaultOff: !!obj.defaultOff, enabled: true,
    errors: [], warnings: warns, events: [], verbs: [],
    yearly: obj.yearly || null, promptBlock: typeof obj.promptBlock === "string" ? obj.promptBlock.slice(0, 200) : "",
    acts: {}, yearlyFns: [], promptFns: [] };
  if (errs.length) { modErrors.push({ mod: id, reason: errs[0] + (errs.length > 1 ? " (+" + (errs.length - 1) + " more)" : "") }); rec.errors = errs; }
  else {
    rec.events = events; rec.verbs = verbs.filter(function (vb) { return vb && !skippedVb[vb.id]; });
    events.forEach(function (ev) { modEventIds[ev.id] = id; });
  }
  modRegistry.push(rec);
  return { ok: !errs.length, id: id, errors: errs, warnings: warns };
}
/* ---- runtime surfaces (called by engine hooks, all guarded at call sites) ---- */
function modEventsFor(bucketId) {
  var range = null, i, j;
  try {
    if (typeof CONTENT_BUCKETS !== "undefined") for (i = 0; i < CONTENT_BUCKETS.length; i++) if (CONTENT_BUCKETS[i].id === bucketId) range = CONTENT_BUCKETS[i];
    if (!range && typeof MATURE_PACK_RANGE !== "undefined" && bucketId === "mature") range = MATURE_PACK_RANGE;
  } catch (e) {}
  if (!range) range = { minAge: 0, maxAge: 120 };
  var out = [];
  for (i = 0; i < modRegistry.length; i++) {
    var r = modRegistry[i];
    if (!r.events.length || !modIsEnabled(r.id)) continue;
    for (j = 0; j < r.events.length; j++) {
      var ev = r.events[j];
      if (ev.minAge <= range.maxAge && ev.maxAge >= range.minAge) out.push(ev);
    }
  }
  return out;
}
function modTabButtons(tab) {
  var out = [], i;
  if (!window.S) return out;
  for (i = 0; i < modRegistry.length; i++) {
    var r = modRegistry[i];
    if (!r.verbs.length || !modIsEnabled(r.id)) continue;
    for (var j = 0; j < r.verbs.length; j++) {
      var vb = r.verbs[j];
      if (vb.tab !== tab) continue;
      if (S.age < vb.minAge) continue;
      if (vb.maxAge !== undefined && S.age > vb.maxAge) continue;
      out.push({ id: vb.id, label: "🧩 " + vb.label, sub: (vb.sub || "mod") });
    }
  }
  return out;
}
function modFindVerb(id) {
  for (var i = 0; i < modRegistry.length; i++) {
    var r = modRegistry[i];
    if (!modIsEnabled(r.id)) continue;
    if (r.verbs) for (var j = 0; j < r.verbs.length; j++) if (r.verbs[j].id === id) return r.verbs[j];
  }
  return null;
}
/* returns true when a mod handled the verb (even gated) — doAct must return */
function modRunAct(id) {
  var vb = modFindVerb(id);
  if (!vb) {
    for (var i = 0; i < modRegistry.length; i++) {
      var r = modRegistry[i];
      if (r.acts && r.acts[id] && modIsEnabled(r.id)) {
        try { r.acts[id](); try { autosave(); render(); } catch (e2) {} } catch (e) { try { toast("🧩 Mod verb stumbled — quarantined, game safe."); } catch (e3) {} }
        return true;
      }
    }
    return false;
  }
  try {
    if (!window.S || !S.alive) return true;
    if (typeof needAge === "function" && vb.minAge && S.age < vb.minAge) { toast("🔒 " + vb.minAge + "+ for that one!"); return true; }
    if (vb.maxAge !== undefined && S.age > vb.maxAge) { toast("🌙 That chapter has closed."); return true; }
    if (vb.once && typeof once === "function" && once("mod_" + id)) return true;
    if (vb.cap && typeof capYr === "function" && capYr(vb.cap)) return true;
    if (+vb.cost > 0 && S.money < +vb.cost) { try { toast("💸 Need " + fmt$(+vb.cost) + "!"); } catch (e) {} return true; }
    if (+vb.cost > 0) S.money -= +vb.cost;
    var st = { outcome: "", stopped: false };
    if (window.LL && LL.fxRun) LL.fxRun.execList(vb.effects || [], S, {}, {}, st);
    var line = String(st.outcome || vb.label).slice(0, 300);
    try { gainLog("🧩", line + (+vb.cost > 0 ? " (-" + fmt$(+vb.cost) + ")" : ""), ""); } catch (e) {}
    try { if (window.LL && LL.bus) LL.bus.dispatch({ type: "act", id: id }); } catch (e2) {}
    try { autosave(); render(); } catch (e3) {}
  } catch (e) { try { toast("🧩 Mod verb stumbled — game safe."); } catch (e2) {} }
  return true;
}
function modRunYearly(silent) {
  if (!window.S || !S.alive) return;
  for (var i = 0; i < modRegistry.length; i++) {
    var r = modRegistry[i];
    if (!modIsEnabled(r.id)) continue;
    try {
      var y = r.yearly;
      if (y && y.effects && y.effects.length) {
        var ch = y.chance === undefined ? 1 : +y.chance;
        if ((typeof rnd === "function" ? rnd() : Math.random()) > ch) continue;
        if (y.minAge !== undefined && S.age < y.minAge) continue;
        if (y.maxAge !== undefined && S.age > y.maxAge) continue;
        var st = { outcome: "", stopped: false };
        if (window.LL && LL.fxRun) LL.fxRun.execList(y.effects, S, {}, {}, st);
        if (!silent && st.outcome) { try { pushLog(S.age, "🧩", String(st.outcome).slice(0, 280), ""); } catch (e2) {} }
      }
    } catch (e) {}
    try {
      for (var j = 0; j < r.yearlyFns.length; j++) r.yearlyFns[j](silent);
    } catch (e3) {}
  }
}
function modPromptBlocks() {
  var parts = [], i;
  for (i = 0; i < modRegistry.length; i++) {
    var r = modRegistry[i];
    if (!modIsEnabled(r.id)) continue;
    try {
      if (r.promptBlock) parts.push(String(r.promptBlock).slice(0, 200));
      for (var j = 0; j < r.promptFns.length; j++) {
        var p = typeof r.promptFns[j] === "function" ? r.promptFns[j]() : r.promptFns[j];
        if (p) parts.push(String(p).slice(0, 200));
      }
    } catch (e) {}
  }
  return parts.length ? parts.join(" ").slice(0, 400) : "";
}
/* ---- enable/disable + re-merge ---- */
function modStripDisabled() {
  try {
    if (window.EVENTS && window.EVENTS.length) {
      window.EVENTS = window.EVENTS.filter(function (e) {
        var owner = e && e.id && modEventIds[e.id];
        return !(owner && !modIsEnabled(owner));
      });
    }
  } catch (e) {}
}
function modRemerge() {
  try {
    modStripDisabled();
    if (typeof contentState !== "undefined") { contentState.loaded = {}; contentState.loading = {}; }
    var age = (window.S && typeof S.age === "number") ? S.age : 0;
    if (typeof ensureContentForAge === "function") ensureContentForAge(age).then(function () {
      try { if (typeof render === "function" && window.S) render(); } catch (e) {}
      try { renderModList(); } catch (e2) {}
    });
    else { try { renderModList(); } catch (e3) {} }
  } catch (e) { try { renderModList(); } catch (e2) {} }
}
/* uninstall: drops registry + events + player-store copy + flags, then re-merges */
function modRemove(id) {
  try {
    modRegistry = modRegistry.filter(function (r) { return r.id !== id; });
    for (var k in modEventIds) if (modEventIds[k] === id) delete modEventIds[k];
    try {
      var raw = modLsGet(MOD_LS_PLAYER, "[]"), arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        var kept = arr.filter(function (o) { return !o || o.id !== id; });
        if (kept.length !== arr.length) modLsSet(MOD_LS_PLAYER, JSON.stringify(kept));
      }
    } catch (e) {}
    try {
      var m = modEnabledMap();
      if (m[id] !== undefined) { delete m[id]; modLsSet(MOD_LS_ENABLED, JSON.stringify(m)); }
    } catch (e2) {}
    for (var i = modErrors.length - 1; i >= 0; i--) if (modErrors[i].mod === id) modErrors.splice(i, 1);
    modRemerge();
    try { toast("🧩 Mod removed."); } catch (e3) {}
  } catch (e) {}
}
function modToggle(id) {  try {
    var m = modEnabledMap(); m[id] = !modIsEnabled(id);
    modLsSet(MOD_LS_ENABLED, JSON.stringify(m));
    modRemerge();
    try { toast(m[id] ? "🧩 Mod on — content merging in." : "🧩 Mod off — its events leave the pool."); } catch (e) {}
  } catch (e) {}
}
/* ---- player import (pure JSON — no code by construction) ---- */
function modImportJSON(text) {
  var obj = null;
  try { obj = JSON.parse(String(text)); }
  catch (e) { return { ok: false, errors: ["not valid JSON: " + String(e && e.message || e).slice(0, 100)] }; }
  var res = modRegisterJSON(obj, "player");
  if (!res.ok) return res;
  try {
    var raw = modLsGet(MOD_LS_PLAYER, "[]"), arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [];
    arr.push(obj);
    var s = JSON.stringify(arr);
    if (s.length > 400000) { /* rollback oversized stores */
      modRegistry = modRegistry.filter(function (r) { return r.id !== res.id; });
      delete modEventIds[obj.id];
      return { ok: false, errors: ["mod store full (400KB cap) — remove a mod first"] };
    }
    modLsSet(MOD_LS_PLAYER, s);
  } catch (e) {
    modRegistry = modRegistry.filter(function (r) { return r.id !== res.id; });
    return { ok: false, errors: ["could not persist mod: storage blocked"] };
  }
  modRemerge();
  return res;
}
/* ---- boot loading ---- */
function modPlayerLoad() {
  var arr = [];
  try { arr = JSON.parse(modLsGet(MOD_LS_PLAYER, "[]")) || []; } catch (e) { return; }
  if (!Array.isArray(arr)) return;
  arr.forEach(function (obj) {
    try { modRegisterJSON(obj, "player"); } catch (e) {
      modErrors.push({ mod: (obj && obj.id) || "?", reason: "player mod failed to register" });
    }
  });
}
async function modInit() {
  try {
    var r = await fetch("src/mods/index.json");
    if (r.ok) {
      var idx = await r.json(), list = (idx && idx.mods) || [];
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        try {
          if (!e || !e.file) continue;
          if (e.js) {
            if (typeof loadScriptOnce === "function") await loadScriptOnce("src/mods/" + e.file);
          } else {
            var pr = await fetch("src/mods/" + e.file);
            if (!pr.ok) { modErrors.push({ mod: e.id || e.file, reason: "repo file missing (" + pr.status + ")" }); continue; }
            modRegisterJSON(await pr.json(), "repo");
          }
        } catch (err) { modErrors.push({ mod: (e && (e.id || e.file)) || "?", reason: String(err && err.message || err).slice(0, 140) }); }
      }
    }
  } catch (e) { /* no repo mods (unsaved preview without src/) — player mods still load */ }
  try { modPlayerLoad(); } catch (e) {}
  /* buckets that already merged before mods arrived (baby loads at script parse) */
  try {
    if (typeof contentState !== "undefined" && contentState.loaded && typeof contentMerge === "function") {
      var buckets = [];
      if (typeof CONTENT_BUCKETS !== "undefined") buckets = CONTENT_BUCKETS.map(function (b) { return b.id; });
      buckets.push("mature");
      buckets.forEach(function (b) {
        if (contentState.loaded[b]) { try { contentMerge(modEventsFor(b)); } catch (e2) {} }
      });
    }
  } catch (e3) {}
  try { renderModList(); } catch (e4) {}
}
/* ---- status + Help UI ---- */
function modStatus() {
  return { schema: LL.MOD_SCHEMA, mods: modRegistry.length,
    enabled: modRegistry.filter(function (r) { return modIsEnabled(r.id); }).length,
    quarantined: modErrors.length, eventIds: Object.keys(modEventIds).length };
}
function escMod(s) {
  try { return esc(String(s)); } catch (e) { return String(s).replace(/[<>&"]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]; }); }
}
function renderModList() {
  var box = null;
  try { box = $("modList"); } catch (e) { return; }
  if (!box) return;
  var h = "";
  if (!modRegistry.length && !modErrors.length) h = '<p class="sub">No mods installed. Ship one in <b>src/mods/</b> or paste a mod JSON below.</p>';
  modRegistry.forEach(function (r) {
    var on = modIsEnabled(r.id);
    var errs = r.errors.length ? ' <span style="color:#f66">⛔ ' + escMod(r.errors[0]) + (r.errors.length > 1 ? " (+" + (r.errors.length - 1) + ")" : "") + "</span>" : "";
    var wrn = r.warnings.length ? ' <span style="color:#fa0">⚠️ ' + escMod(r.warnings[0]) + "</span>" : "";
    var bits = [];
    if (r.events.length) bits.push(r.events.length + " events");
    if (r.verbs.length) bits.push(r.verbs.length + " verbs");
    if (r.yearly) bits.push("yearly");
    if (r.promptBlock || r.promptFns.length) bits.push("AI flavor");
    h += '<div class="slot" style="margin-bottom:6px"><div class="grow"><b>🧩 ' + escMod(r.name) + '</b> <small>v' + r.version + " · " + escMod(r.id) + " · " + escMod(r.source) + (bits.length ? " · " + escMod(bits.join(", ")) : "") + "</small>" + errs + wrn + '</div><button class="mini" data-modtoggle="' + escMod(r.id) + '">' + (on ? "Disable" : "Enable") + "</button>" + (r.source === "player" ? ' <button class="mini" data-modremove="' + escMod(r.id) + '">Remove</button>' : "") + "</div>";
  });
  modErrors.forEach(function (q) {
    h += '<div class="slot" style="margin-bottom:6px"><div class="grow"><b>⛔ quarantined: ' + escMod(q.mod) + "</b><small>" + escMod(q.reason) + "</small></div></div>";
  });
  box.innerHTML = h;
  var btns = box.querySelectorAll("[data-modtoggle]");
  for (var i = 0; i < btns.length; i++) (function (b) {
    b.onclick = function () { try { modToggle(b.getAttribute("data-modtoggle")); } catch (e) {} };
  })(btns[i]);
  var rms = box.querySelectorAll("[data-modremove]");
  for (var j = 0; j < rms.length; j++) (function (b) {
    b.onclick = function () { try { modRemove(b.getAttribute("data-modremove")); } catch (e) {} };
  })(rms[j]);
}
LL.files.push("mods"); /* end-of-file registration: counts as loaded only after this file fully ran */
