/* LIFE & LEGACY — src/tools/validate-content.js
 * Content validator runner (worker with workspace fs; no DOM, no network).
 *
 * HOW TO RUN:
 *   const code = await fs.readTextFile('src/tools/validate-content.js');
 *   const validateContent = new Function('fs', code + '\nreturn validateContent;')(fs);
 *   const rep = await validateContent({writeReport:true});
 *
 * Checks every src/content/events/*.json (required fields, valid effects via
 * LL.fxValidate + the real fxParse grammar), pack coverage in
 * src/content/index.json (dedup layout, content v4+: each event sits in
 * exactly its home packs — intersecting under-18 buckets, plus either its
 * single exclusive adult bucket or the `mature` overlay), pack BODY integrity
 * (every event embedded in each src/content/packs/*.json deep-equals its
 * src/content/events/*.json source — packs are generated, never hand-edited),
 * and freshness of the generated fallback snapshot
 * (src/engine/content-fallback.js).
 */
"use strict";
async function validateContent(opts) {
  opts = opts || {};
  var window = {};
  var parseSrc = await fs.readTextFile('src/engine/effects-parse.js');
  var runSrc = await fs.readTextFile('src/engine/effects-run.js');
  var valSrc = await fs.readTextFile('src/engine/effects-validate.js');
  var LL = new Function('window',
    'var LL = (window.LL || (window.LL = {v:1,files:[]}));\n' +
    parseSrc + '\nvar LL = window.LL;\n' + runSrc + '\nvar LL = window.LL;\n' + valSrc +
    '\nreturn window.LL;')(window);
  var P = LL.fxParse, CALLS = LL.fxRun.CALL_NAMES, PREDS = LL.fxRun.PRED_NAMES;
  var V = LL.fxValidate;
  var errors = [];
  // Single source of truth: versions live in src/engine/migrate.js (LL.X = N lines).
  var migTxt = await fs.readTextFile('src/engine/migrate.js');
  function migVer(name, fallback) { var m = new RegExp('LL\\.' + name + '\\s*=\\s*(\\d+)').exec(migTxt); return m ? +m[1] : fallback; }
  var wantContent = migVer('CONTENT_VERSION', 3), wantEventSchema = migVer('EVENT_SCHEMA', 1);
  var index = JSON.parse(await fs.readTextFile('src/content/index.json'));
  if (index.contentVersion !== wantContent) errors.push('index: contentVersion is ' + index.contentVersion + ', want ' + wantContent);
  var packRanges = {};
  (index.packs || []).forEach(function (p) { packRanges[p.id] = { min: p.minAge, max: p.maxAge }; });
  // id -> packs listing it
  var listedIn = {};
  (index.packs || []).forEach(function (p) {
    (p.files || []).forEach(function (id) { (listedIn[id] = listedIn[id] || []).push(p.id); });
  });
  var files = (await fs.listFiles()).filter(function (f) { return f.path.indexOf('src/content/events/') === 0; });
  var fileIds = files.map(function (f) { return f.path.split('/').pop().replace(/\.json$/, ''); });
  var evById = {};
  for (var i = 0; i < fileIds.length; i++) {
    var id = fileIds[i];
    var ev;
    try {
      ev = JSON.parse(await fs.readTextFile('src/content/events/' + id + '.json'));
    } catch (e) { errors.push(id + ': unreadable (' + (e && e.message) + ')'); continue; }
    evById[id] = ev;
    if (ev.schema !== undefined && (!Number.isInteger(ev.schema) || ev.schema < 1))
      errors.push(id + ': bad schema (want positive integer, default 1)');
    else if (ev.schema !== undefined && ev.schema > wantEventSchema)
      errors.push(id + ': schema v' + ev.schema + ' is newer than engine EVENT_SCHEMA v' + wantEventSchema);
    var evErrs = V.validateEvent(ev, { expectedId: id, parse: P, calls: CALLS });
    evErrs.forEach(function (e) { errors.push(e); });
  }
  // orphan files (on disk, in no pack) and ghost listings (in pack, no file)
  Object.keys(evById).forEach(function (id) {
    if (!listedIn[id]) errors.push(id + ': in no pack');
  });
  Object.keys(listedIn).forEach(function (id) {
    if (!evById[id]) errors.push(id + ': listed in packs but file missing');
  });
  // range consistency (dedup layout, content v4+): an event must sit in every
  // under-18 bucket its range intersects, and — when maxAge>=18 — in exactly
  // one adult-side home: its single exclusive bucket (range fits entirely
  // inside young/adult/mid/senior) or the `mature` overlay otherwise.
  // (Boundary events spanning the 18 line live in both sides by design.)
  var ADULT = { young: [18, 29], adult: [30, 44], mid: [45, 59], senior: [60, 120] };
  var UNDERIDS = ['baby', 'kid', 'teen'];
  Object.keys(evById).forEach(function (id) {
    var ev = evById[id];
    var exclusiveHome = null;
    Object.keys(ADULT).forEach(function (k) {
      if (ev.minAge >= ADULT[k][0] && ev.maxAge <= ADULT[k][1]) exclusiveHome = k;
    });
    var want = (index.packs || []).filter(function (p) {
      if (p.id === 'mature') return ev.maxAge >= 18 && !exclusiveHome;
      if (UNDERIDS.indexOf(p.id) >= 0) return ev.minAge <= p.maxAge && ev.maxAge >= p.minAge;
      if (ADULT[p.id]) return exclusiveHome === p.id;
      return false;
    }).map(function (p) { return p.id; }).sort();
    var got = (listedIn[id] || []).slice().sort();
    if (JSON.stringify(want) !== JSON.stringify(got))
      errors.push(id + ': pack coverage [' + got.join(',') + '] want [' + want.join(',') + ']');
  });
  // pack body integrity: every event embedded in each pack file must
  // deep-equal its src/content/events/*.json source. Packs are generated
  // artifacts (build-events dedupeAdultPacks) — a hand-edit here would ship
  // silently because the engine reads pack bodies at runtime, never events/.
  for (var pi = 0; pi < (index.packs || []).length; pi++) {
    var pack = index.packs[pi];
    var packBody;
    try {
      packBody = JSON.parse(await fs.readTextFile('src/content/packs/' + pack.id + '.json'));
    } catch (e) { errors.push('pack ' + pack.id + ': unreadable (' + (e && e.message) + ')'); continue; }
    var packArr = Array.isArray(packBody) ? packBody : packBody.events;
    if (!packArr) { errors.push('pack ' + pack.id + ': no event array'); continue; }
    var packById = {};
    packArr.forEach(function (e) {
      if (!e || !e.id) { errors.push('pack ' + pack.id + ': entry without id'); return; }
      if (packById[e.id]) errors.push('pack ' + pack.id + ': duplicate body ' + e.id);
      packById[e.id] = e;
    });
    (pack.files || []).forEach(function (id) {
      if (!packById[id]) errors.push('pack ' + pack.id + ': lists ' + id + ' but body missing');
      else if (evById[id] && JSON.stringify(packById[id]) !== JSON.stringify(evById[id]))
        errors.push('pack ' + pack.id + '/' + id + ': body differs from events file (rebuild via build-events write:true)');
    });
    Object.keys(packById).forEach(function (id) {
      if ((pack.files || []).indexOf(id) < 0) errors.push('pack ' + pack.id + '/' + id + ': body present but not listed in index');
    });
  }
  // fallback freshness: exact deep-equality per event
  try {
    var fb = await fs.readTextFile('src/engine/content-fallback.js');
    var pre = 'window.EVENTS_FALLBACK=';
    var fbArr = JSON.parse(fb.slice(fb.indexOf(pre) + pre.length, fb.lastIndexOf(';')));
    if (!Array.isArray(fbArr)) errors.push('fallback: not an array');
    else {
      if (fbArr.length !== fileIds.length) errors.push('fallback: ' + fbArr.length + ' events vs ' + fileIds.length + ' files');
      var fbById = {};
      fbArr.forEach(function (e) { fbById[e.id] = e; });
      Object.keys(evById).forEach(function (id) {
        if (!fbById[id]) errors.push('fallback: missing ' + id);
        else if (JSON.stringify(fbById[id]) !== JSON.stringify(evById[id]))
          errors.push('fallback: stale ' + id + ' (rebuild via build-events write:true)');
      });
    }
  } catch (e) { errors.push('fallback: unreadable (' + (e && e.message) + ')'); }
  var summary = { events: fileIds.length, errors: errors.length };
  if (opts.writeReport) await fs.writeTextFile('scratch/validate-report.json', JSON.stringify({ summary: summary, errors: errors }, null, 1));
  return { summary: summary, errors: errors.slice(0, 60), errorCount: errors.length };
}
