/* LIFE & LEGACY — src/tools/validate-mods.js
 * Mod validator runner (worker with workspace fs; no DOM, no network).
 *
 * HOW TO RUN:
 *   const code = await fs.readTextFile('src/tools/validate-mods.js');
 *   const validateMods = new Function('fs', code + '\nreturn validateMods;')(fs);
 *   const rep = await validateMods();
 *
 * Checks every mod in src/mods/index.json (+ player-shaped objects passed in):
 * manifest shape/pins, event grammar (same LL.fxValidate gate as core),
 * verb/yearly effect grammar (via pseudo-event wrap), id collisions vs core
 * content + core verbs + across mods, promptBlock/yearly shape sanity.
 */
"use strict";
async function validateMods(opts) {
  opts = opts || {};
  var window = {};
  var parseSrc = await fs.readTextFile('src/engine/effects-parse.js');
  var runSrc = await fs.readTextFile('src/engine/effects-run.js');
  var valSrc = await fs.readTextFile('src/engine/effects-validate.js');
  var LL = new Function('window',
    'var LL = (window.LL || (window.LL = {v:1,files:[]}));\n' +
    parseSrc + '\nvar LL = window.LL;\n' + runSrc + '\nvar LL = window.LL;\n' + valSrc +
    '\nreturn window.LL;')(window);
  var V = LL.fxValidate;
  var errors = [];
  var migTxt = await fs.readTextFile('src/engine/migrate.js');
  function migVer(name, fallback) { var m = new RegExp('LL\\.' + name + '\\s*=\\s*(\\d+)').exec(migTxt); return m ? +m[1] : fallback; }
  var wantContent = migVer('CONTENT_VERSION', 4), wantEventSchema = migVer('EVENT_SCHEMA', 1);
  /* core content ids for collision checks */
  var files = (await fs.listFiles()).filter(function (f) { return f.path.indexOf('src/content/events/') === 0; });
  var coreIds = {};
  for (var i = 0; i < files.length; i++) coreIds[files[i].path.split('/').pop().replace(/\.json$/, '')] = 1;
  /* core verb ids: TABS entries (render.js) + doAct cases (actions.js) */
  var renderSrc = await fs.readTextFile('src/engine/render.js');
  var actionsSrc = await fs.readTextFile('src/engine/actions.js');
  var coreVerbs = {}, m, re1 = /\["([A-Za-z0-9_-]+)","/g, re2 = /case "([^"]+)"\s*:/g;
  var tabsBlock = (/var TABS=\{([\s\S]*?)\n\};/.exec(renderSrc) || [])[1] || renderSrc;
  while ((m = re1.exec(tabsBlock))) coreVerbs[m[1]] = 1;
  re2.lastIndex = 0;
  while ((m = re2.exec(actionsSrc))) coreVerbs[m[1]] = 1;
  while ((m = re2.exec(renderSrc))) coreVerbs[m[1]] = 1;
  function checkFxList(fx, where) {
    var pseudo = { id: "modwrap", title: "mod", minAge: 0, maxAge: 120, tags: ["mod"], weight: 1, text: "x",
      choices: [{ label: "x", effects: fx || [] }] };
    var v = V.validateEvent(pseudo, {});
    (v || []).forEach(function (e) {
      var s = String(e);
      if (s.indexOf("modwrap") === 0) return;
      errors.push(where + ": " + s);
    });
  }
  var seenModIds = {}, seenEvIds = {}, seenVerbIds = {}, modCount = 0, evCount = 0, verbCount = 0;
  function checkMod(obj, where) {
    if (!obj || typeof obj !== "object") { errors.push(where + ": not an object"); return; }
    var id = obj.id;
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) { errors.push(where + ": bad id"); return; }
    if (seenModIds[id]) { errors.push(where + ": duplicate mod id '" + id + "'"); return; }
    seenModIds[id] = 1; modCount++;
    if (obj.eventSchema !== undefined && obj.eventSchema !== wantEventSchema) errors.push(id + ": eventSchema " + obj.eventSchema + " vs engine " + wantEventSchema);
    if (obj.contentVersion !== undefined && obj.contentVersion !== wantContent) errors.push(id + ": contentVersion drift " + obj.contentVersion + " vs " + wantContent + " (warning-level in game)");
    (Array.isArray(obj.events) ? obj.events : []).forEach(function (ev) {
      if (!ev || typeof ev !== "object") { errors.push(id + ": event not an object"); return; }
      if (typeof ev.id !== "string" || !ev.id) { errors.push(id + ": event missing id"); return; }
      if (coreIds[ev.id]) errors.push(id + ": event '" + ev.id + "' collides with CORE content (core wins at runtime)");
      else if (seenEvIds[ev.id]) errors.push(id + ": event '" + ev.id + "' collides with mod '" + seenEvIds[ev.id] + "'");
      else seenEvIds[ev.id] = id;
      evCount++;
      V.validateEvent(ev, {}).forEach(function (e) { errors.push(id + "." + ev.id + ": " + e); });
    });
    (Array.isArray(obj.verbs) ? obj.verbs : []).forEach(function (vb) {
      if (!vb || typeof vb !== "object") { errors.push(id + ": verb not an object"); return; }
      var vid = vb.id;
      if (typeof vid !== "string" || !vid) { errors.push(id + ": verb missing id"); return; }
      if (coreVerbs[vid]) errors.push(id + ": verb '" + vid + "' collides with a CORE action id (core shadows it at runtime)");
      else if (vid.indexOf("dec-") === 0 || vid.indexOf("major-") === 0 || vid.indexOf("focus-") === 0) errors.push(id + ": verb '" + vid + "' uses a reserved prefix (dec-/major-/focus- are core-routed)");
      else if (seenVerbIds[vid]) errors.push(id + ": verb '" + vid + "' collides with mod '" + seenVerbIds[vid] + "'");
      else seenVerbIds[vid] = id;
      verbCount++;
      if (["activities", "social", "family", "education", "money", "health", "crown", "world"].indexOf(vb.tab) < 0) errors.push(id + "." + vid + ": bad tab");
      if (!Array.isArray(vb.effects) || !vb.effects.length) errors.push(id + "." + vid + ": empty effects");
      else checkFxList(vb.effects, id + "." + vid);
    });
    if (obj.yearly !== undefined && obj.yearly !== null) {
      if (!obj.yearly || !Array.isArray(obj.yearly.effects) || !obj.yearly.effects.length) errors.push(id + ": yearly.effects must be non-empty");
      else checkFxList(obj.yearly.effects, id + ".yearly");
    }
    if (obj.promptBlock !== undefined && (typeof obj.promptBlock !== "string" || obj.promptBlock.length > 200)) errors.push(id + ": promptBlock must be a string <=200 chars");
  }
  try {
    var idx = JSON.parse(await fs.readTextFile('src/mods/index.json'));
    var list = (idx && idx.mods) || [];
    for (var k = 0; k < list.length; k++) {
      var e = list[k];
      if (!e || !e.file) { errors.push("index[" + k + "]: missing file"); continue; }
      if (e.js) continue; /* script mods: same trust as engine, skip static JSON checks */
      var txt;
      try { txt = await fs.readTextFile('src/mods/' + e.file); }
      catch (err) { errors.push("index: " + e.file + " unreadable"); continue; }
      try { checkMod(JSON.parse(txt), e.file); }
      catch (err) { errors.push(e.file + ": invalid JSON"); }
    }
  } catch (err) { errors.push("src/mods/index.json unreadable"); }
  (opts.playerMods || []).forEach(function (o, k) { checkMod(o, "player[" + k + "]"); });
  var summary = { mods: modCount, events: evCount, verbs: verbCount, errors: errors.length };
  if (opts.writeReport) await fs.writeTextFile('scratch/mods-report.json', JSON.stringify({ summary: summary, errors: errors }, null, 2));
  return { ok: errors.length === 0, summary: summary, errors: errors };
}
