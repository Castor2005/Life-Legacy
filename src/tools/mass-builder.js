/* LIFE & LEGACY — src/tools/mass-builder.js
 * Mass-content generator: combinatorially expands curated banks
 * (src/tools/mass-banks/*.js) into thousands of validator-clean event JSONs.
 *
 * WHY: hand-authoring 8,000 events is infeasible; this keeps a small curated
 * surface (families with distinct mechanics) and expands flavor slots with a
 * seeded RNG, enforcing uniqueness + real validation before anything is written.
 *
 * HOW TO RUN (worker with workspace fs):
 *   const code = await fs.readTextFile('src/tools/mass-builder.js');
 *   const mb = new Function('fs', code + '\nreturn massBuilder;')(fs);
 *   const rep = await mb.run({write:false});            // dry run: counts + validation
 *   const rep2 = await mb.run({write:true});            // writes src/content/events/*.json
 *   const rep3 = await mb.rebuildPacks();                // layoutAndEmit (packs+index+fallback)
 *
 * Bank file format (plain JS, evaluated with bank()/SLOTS in scope):
 *   bank({ prefix:"bb2", min:0, max:4, deftags:["baby"], families:[ {
 *     slug:"snack", n:24, tags:["baby","joy"], pre:null, age:[0,4],
 *     t:"The {SNACK} incident", x:"...",
 *     slots:{ SNACK:"SNACKS" },            // or inline arrays
 *     choices:[
 *       { l:"Laugh it off", h:"happiness+", fx:[["stat","happiness","6"]], out:"..." },
 *       { l:"Clean blitz", h:"discipline+", fx:[["stat","discipline","5"]], out:"..." }
 *     ] } ]});
 *
 * FX mini-language (each entry maps to one effect op):
 *   ["stat",key,delta]  ["money",amount]  ["set",path,valueExpr]
 *   ["grades",d]  ["perf",d]  ["partnerRel",d]  ["fame",d]  ["prestige",d]
 *   ["flag",key,valueExpr]  ["chance",p,thenFx,elseFx]  ["branchStat",stat,minV,thenFx,elseFx]
 *   ["child"]  -> let n=randName() + addChild(n,0,90); exposes {FRIEND?} no — exposes {{n}}
 *   ["friend"] -> addFriend("PickedName"); exposes {FRIEND}
 *   ["pet",TYPE] -> addPet("PickedPetName",petType); exposes {PET}
 * Jitter: stat deltas get seeded ±1 automatically (hints stay vague, safe).
 */
"use strict";
async function massBuilderRun(opts) {
  opts = opts || {};
  // ---- validator stack (same as validate-content) ----
  var window = {};
  var parseSrc = await fs.readTextFile('src/engine/effects-parse.js');
  var runSrc = await fs.readTextFile('src/engine/effects-run.js');
  var valSrc = await fs.readTextFile('src/engine/effects-validate.js');
  var LL = new Function('window',
    'var LL = (window.LL || (window.LL = {v:1,files:[]}));\n' +
    parseSrc + '\nvar LL = window.LL;\n' + runSrc + '\nvar LL = window.LL;\n' + valSrc +
    '\nreturn window.LL;')(window);
  var V = LL.fxValidate, P = LL.fxParse, CALLS = LL.fxRun.CALL_NAMES;
  // ---- seeded RNG ----
  var seed = (opts.seed || 20260801) >>> 0;
  function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; }
  function pickN(a, n) { var c = a.slice(), o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return o; }
  // ---- existing ids (collision guard) ----
  var existing = {};
  (await fs.listFiles()).filter(function (f) { return f.path.indexOf('src/content/events/') === 0; })
    .forEach(function (f) { existing[f.path.split('/').pop().replace(/\.json$/, '')] = 1; });
  // ---- load banks ----
  var bankFiles = (await fs.listFiles()).filter(function (f) { return f.path.indexOf('src/tools/mass-banks/') === 0 && /\.js$/.test(f.path); }).map(function (f) { return f.path; }).sort();
  var banks = [];
  function bank(b) { banks.push(b); }
  for (var bi = 0; bi < bankFiles.length; bi++) {
    var code = await fs.readTextFile(bankFiles[bi]);
    new Function('bank', 'SLOTS', 'FAMS', code)(bank, SLOTS, FAMS);
  }
  // ---- expansion ----
  var usedTitleText = {}, usedIds = {}, out = [], errors = [], skippedDup = 0;
  var stats = { banks: banks.length, families: 0, made: 0 };
  banks.forEach(function (b, bIdx) {
    (b.families || []).forEach(function (fam, fIdx) {
      stats.families++;
      var wantN = fam.n || 10;
      var famCombos = {};
      for (var i = 0; i < wantN; i++) {
        var combo = null, comboKey = null;
        for (var attempt = 0; attempt < 40 && !combo; attempt++) {
          var c = {}, parts = [];
          var slotDefs = fam.slots || {};
          Object.keys(slotDefs).forEach(function (k) {
            var pool = Array.isArray(slotDefs[k]) ? slotDefs[k] : (SLOTS[slotDefs[k]] || [slotDefs[k]]);
            c[k] = pick(pool); parts.push(k + '=' + c[k]);
          });
          // special picks (only when no slot already provides them)
          if (needsFriend(fam) && c.FRIEND === undefined) { c.FRIEND = pick(SLOTS.NAMES); parts.push('FRIEND=' + c.FRIEND); }
          if (needsPet(fam) && c.PET === undefined) { c.PET = pick(SLOTS.PETS); parts.push('PET=' + c.PET); }
          var key = parts.sort().join('|');
          if (!famCombos[key]) { famCombos[key] = 1; combo = c; comboKey = key; }
        }
        if (!combo) { errors.push((b.prefix || bIdx) + '/' + (fam.slug || fIdx) + ': slot combos exhausted at ' + i + '/' + wantN); break; }
        var ev = buildEvent(b, fam, combo, fIdx, i);
        var evOuts = [];
        (ev.choices || []).forEach(function (ch) { (ch.effects || []).forEach(function (e) { if (e.op === 'outcome') evOuts.push(e.tpl); }); });
        var tt = ev.title + '||' + (typeof ev.text === 'string' ? ev.text : JSON.stringify(ev.text)) + '||' + evOuts.join('||');
        if (usedTitleText[tt]) { skippedDup++; continue; }
        var probe = ev.title + '||' + (typeof ev.text === 'string' ? ev.text : '') + '||' + JSON.stringify((ev.choices || []).map(function (ch) { return ch.label; })) + '||' + JSON.stringify((ev.choices || []).map(function (ch) { return (ch.effects || []).filter(function (e) { return e.op === 'outcome'; }); }));
        var leftover = probe.match(/\{[A-Z][A-Z0-9_]*(?:\.\d+)?\}/g);
        if (leftover) { errors.push((b.prefix || bIdx) + '/' + (fam.slug || fIdx) + ': unfilled slot(s) ' + leftover.slice(0, 3).join(',') + ' in ' + ev.id); continue; }
        usedTitleText[tt] = 1;
        var errs = V.validateEvent(ev, { expectedId: ev.id, parse: P, calls: CALLS });
        if (errs.length) { errors.push(ev.id + ': ' + errs.slice(0, 3).join(' // ')); continue; }
        out.push(ev);
      }
    });
  });
  stats.made = out.length;
  if (opts.write && !errors.length) {
    for (var w = 0; w < out.length; w++)
      await fs.writeTextFile('src/content/events/' + out[w].id + '.json', JSON.stringify(out[w], null, 1));
  }
  return { stats: stats, bankFiles: bankFiles.length, skippedDup: skippedDup, errorCount: errors.length, errors: errors.slice(0, 20), wrote: (opts.write && !errors.length) ? out.length : 0 };
}
function needsFriend(fam) {
  return JSON.stringify(fam.choices || []).indexOf('["friend"]') >= 0;
}
function needsPet(fam) {
  return JSON.stringify(fam.choices || []).indexOf('["pet"') >= 0;
}
function fillStr(s, combo) {
  // {SLOT} -> string entry; {SLOT.0}/{SLOT.1} -> paired-array entry parts
  return String(s).replace(/\{([A-Z0-9_]+)(?:\.(\d+))?\}/g, function (m, k, idx) {
    if (combo[k] === undefined) return m;
    var v = combo[k];
    if (Array.isArray(v)) {
      if (idx === undefined) return m; // paired entry needs .N — leave to surface the mistake
      return v[+idx] !== undefined ? v[+idx] : m;
    }
    return v;
  });
}
function jitDelta(d, R) {
  // seeded ±1 jitter on integer stat deltas ("6" -> "5".."7"); pass through otherwise
  if (!/^[-+]?\d+$/.test(String(d))) return String(d);
  var v = parseInt(d, 10), j = Math.floor(R() * 3) - 1;
  if (v > 0) v = Math.max(1, v + j); else if (v < 0) v = Math.min(-1, v + j);
  return String(v);
}
function buildFxList(fxList, R, combo, ev) {
  var fx = [];
  fxList.forEach(function (f) {
    var op = f[0];
    if (op === 'stat' && (f[1] === 'fame' || f[1] === 'prestige')) op = f[1]; // fame/prestige are set-paths, not stats
    if (op === 'stat') fx.push({ op: 'stat', key: f[1], delta: jitDelta(f[2], R) });
    else if (op === 'money') fx.push({ op: 'money', amount: String(f[1]) });
    else if (op === 'set') fx.push({ op: 'set', path: f[1], value: String(f[2]) });
    else if (op === 'grades') fx.push({ op: 'set', path: 'education.grades', value: 'clamp(s.education.grades+(' + f[1] + '))' });
    else if (op === 'perf') fx.push({ op: 'perf', delta: String(f[1]) });
    else if (op === 'partnerRel') fx.push({ op: 'partnerRel', delta: String(f[1]) });
    else if (op === 'fame') fx.push({ op: 'set', path: 'fame', value: 'min(100,s.fame+(' + f[1] + '))' });
    else if (op === 'prestige') fx.push({ op: 'set', path: 'prestige', value: 's.prestige+(' + f[1] + ')' });
    else if (op === 'karma') fx.push({ op: 'stat', key: 'karma', delta: jitDelta(f[1], R) });
    else if (op === 'flag') fx.push({ op: 'flag', key: f[1], value: String(f[2]) });
    else if (op === 'chance') fx.push({ op: 'chance', p: String(f[1]), then: buildFxList(f[2], R, combo, ev), else: buildFxList(f[3], R, combo, ev) });
    else if (op === 'branchStat') fx.push({ op: 'branch', cond: { expr: 's.stats.' + f[1] + '>' + f[2] }, then: buildFxList(f[3], R, combo, ev), else: buildFxList(f[4], R, combo, ev) });
    else if (op === 'child') { fx.push({ op: 'let', name: 'n', expr: 'randName()' }); fx.push({ op: 'addChild', name: 'n', age: 0, rel: 90 }); }
    else if (op === 'friend') { fx.push({ op: 'addFriend', name: '"' + combo.FRIEND + '"' }); }
    else if (op === 'pet') { fx.push({ op: 'addPet', name: '"' + combo.PET + '"', petType: f[1] || 'dog', rel: 70 }); }
    else if (op === 'outcome') fx.push({ op: 'outcome', tpl: fillStr(f[1], combo) });
    else throw new Error('unknown fx op ' + op);
  });
  return fx;
}
var __idCounter = 0;
function buildEvent(b, fam, combo, fIdx, i) {
  var R = (function () { var s = (__idCounter * 2654435761 + 97) >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  __idCounter++;
  var id = (b.prefix + '-' + (fam.slug || ('f' + fIdx)) + '-' + String(i).padStart(3, '0')).toLowerCase().replace(/[^a-z0-9-]+/g, '');
  var age = fam.age || [b.min, b.max];
  var ev = {
    id: id,
    minAge: age[0],
    maxAge: age[1],
    title: fillStr(fam.t, combo),
    tags: (fam.tags || b.deftags || ['life']).slice(),
    weight: fam.w || 1,
    preconditions: fam.pre === undefined ? null : fam.pre,
    text: fillStr(fam.x, combo),
    choices: (fam.choices || []).map(function (ch) {
      var fx = buildFxList(ch.fx || [], R, combo);
      fx.push({ op: 'outcome', tpl: fillStr(ch.out, combo) });
      return { label: fillStr(ch.l, combo), hint: String(ch.h || ''), effects: fx };
    })
  };
  return ev;
}
/* Shared slot fillers — all original content, no third-party names. */
var SLOTS = {
  NAMES: ["Maya", "Liam", "Sofia", "Noah", "Priya", "Diego", "Aisha", "Kenji", "Lena", "Omar", "Freya", "Tariq", "Nadia", "Ellis", "Rosa", "Kofi", "Ines", "Marco", "Tessa", "Ravi", "June", "Felix", "Amara", "Silas", "Wren", "Dario", "Liv", "Emmett", "Sana", "Otto", "Cleo", "Reyes", "Anika", "Bram", "Noor", "Callum", "Zola", "Petra", "Idris", "Mira", "Jasper", "Anya", "Koa", "Luz", "Nico", "Paloma", "Rhea", "Stellan", "Talia", "Umar", "Vera", "Willa", "Yuki", "Zane"],
  SURNAMES: ["Okafor", "Rahman", "Silva", "Costa", "Ivanov", "Kim", "Novak", "Haddad", "Berg", "Costa", "Marsh", "Vance", "Quill", "Thorne", "Ashford", "Bellamy", "Corvin", "Driscoll", "Ellery", "Farah", "Gorski", "Hale", "Ivers", "Jensen", "Kessler", "Lark", "Merritt", "Nolan", "Osman", "Petrov", "Quade", "Rios", "Serrano", "Tobin", "Umarov", "Vasquez", "Wexler", "Yilmaz", "Zamora"],
  PETS: ["Biscuit", "Miso", "Pepper", "Waffles", "Ziggy", "Luna", "Rocky", "Clover", "Maple", "Pickles", "Noodle", "Fig", "Beans", "Taffy", "Comet", "Dottie", "Moose", "Pippa", "Socks", "Tux"],
  SNACKS: ["graham cracker", "banana", "rice cake", "blueberry", "cheese cube", "apple slice", "oat cookie", "yogurt cup", "peach", "cracker stack"],
  TOYS: ["wooden train", "plush fox", "stacking cups", "drum", "balloon", "puzzle", "teddy bear", "xylephone", "toy boat", "blocks"],
  PLACES_NEAR: ["the park", "the library", "the corner store", "grandma's porch", "the playground", "the fountain square", "the community garden", "the riverside path"],
  KID_GAMES: ["freeze tag", "hide-and-seek", "four square", "kickball", "capture the flag", "marbles", "jump rope", "flashlight tag"],
  SCHOOL_SUBJECTS: ["fractions", "long division", "cursive", "the water cycle", "multiplication tables", "state capitals", "dinosaurs", "the solar system"],
  TEEN_SPOTS: ["the mall", "the skate park", "the diner", "the bleachers", "the arcade", "the lake dock", "the rooftop", "the bus stop"],
  HOBBIES: ["knitting", "birdwatching", "chess", "pottery", "stargazing", "urban sketching", "bread baking", "kite flying", "bonsai", "calligraphy", "beekeeping", "letterpress"],
  DISHES: ["ramen", "lasagna", "tacos", "curry", "paella", "dumplings", "tagine", "pho", "empanadas", "risotto", "bibimbap", "pierogi"],
  CITIES: ["Lisbon", "Kyoto", "Marrakech", "Reykjavik", "Cusco", "Hanoi", "Athens", "Quebec City", "Cape Town", "Seoul", "Lima", "Prague"],
  COUNTRIES: ["Portugal", "Japan", "Morocco", "Iceland", "Peru", "Vietnam", "Greece", "Canada", "South Africa", "Korea", "Chile", "Norway"],
  JOBS: ["nurse", "teacher", "plumber", "baker", "driver", "librarian", "mechanic", "florist", "carpenter", "paramedic", "chef", "electrician", "writer", "accountant", "gardener", "pilot", "architect", "therapist"],
  WORKPLACES: ["the clinic", "the warehouse", "the studio", "the site office", "the depot", "the newsroom", "the boatyard", "the observatory"],
  BANDS: ["Static Bloom", "Copper Line", "Velvet Cartography", "Paper Lanterns", "The Night Ferries", "Glass Orchard", "Low Hum Parade", "Amber Relay"],
  SPORTS: ["archery", "rowing", "bouldering", "fencing", "open-water swimming", "trail running", "badminton", "curling", "ultimate frisbee", "kayak polo"],
  FESTIVALS: ["the lantern festival", "the harvest fair", "the solstice market", "the river regatta", "the kite carnival", "the night bazaar"],
  MAKES: ["a bookshelf", "a canoe paddle", "a quilt square", "a birdhouse", "a stone wall", "a cider press", "a telescope mount", "a garden gate"],
  SEA: ["the cove", "the reef", "the fjord", "the atoll", "the strait", "the lagoon"],
  MOUNTAINS: ["the high pass", "the glacier trail", "the ridge hut", "the volcanic slope", "the canyon rim", "the alpine meadow"]
};
/* Family-authoring helpers available inside bank files. */
var FAMS = {
  // job-family factory: profession situations matrix helper lives in bank files
};
var massBuilder = { run: massBuilderRun };
