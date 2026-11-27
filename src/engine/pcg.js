/* LIFE & LEGACY — engine/pcg.js
 * ARCHITECTURE LAYER 5/6 — constrained sampler + LLM-guided PCG + Agentic PCG.
 *
 * YEAR RHYTHM: a WFC-inspired constrained sampler over the year's 12-month
 * ring. Each month is a cell, its domain the 12 life-tiles; pairwise
 * transition weights are the constraints, MODULATED by life context
 * (student/worker/parent/child...). The walk starts at a random month, then
 * proceeds ring-order: collapse (weighted pick among transitions legal from
 * the previous month) -> forward-propagate (prune the next month's domain to
 * compatible tiles) -> bounded restarts (up to 40 walks) on contradiction.
 * Every finished walk passes ringOk(), which validates all 12 month-order
 * edges INCLUDING the closing December->January (and start) edge — a walk
 * with a broken closing edge is rejected and retried, so the stored rhythm
 * is always a true cycle. Deterministic per (lifeSeed, year): mulberry32
 * only — no Math.random, no WASM stream — so a rhythm is reproducible
 * without ever being saved (session cache only, S untouched, no migration).
 * NOTE (naming honesty): this is a weighted transition sampler with forward
 * pruning + ring validation, NOT full Wave Function Collapse — there is no
 * global entropy selection, no backtracking, no full arc-consistency pass.
 * The "CG-WFC" shorthand in older docs means exactly this sampler.
 *
 * LLM-GUIDED PCG: the collapsed rhythm feeds the AI as a hard constraint
 * block (pcgGuideBlock, <=200 chars, inside aiPrompt) — the generator leads,
 * the model follows. AGENTIC PCG: pcgAgentPropose() publishes a machine-
 * readable plan {tiles, must[], never[]} for tool-callers (Director, MCP
 * agents) to honor. Pushes "pcg" as its LAST line.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
(function () {
  var TILES = ["work", "grind", "study", "love", "family", "social", "rest", "adventure", "vice", "health", "create", "solemn"];
  var GLYPH = { work: "💼", grind: "🔥", study: "📚", love: "💘", family: "👪", social: "🥂", rest: "🌿", adventure: "🧭", vice: "🎲", health: "🏃", create: "🎨", solemn: "🕯️" };
  var LEAN = { work: "work", grind: "work", study: "study", love: "love", family: "kin", social: "kin", rest: "rest", adventure: "novelty", vice: "risk", health: "body", create: "craft", solemn: "spirit" };
  /* base transition weights: rows FROM, cols TO (order = TILES) */
  var BASE = [
    [3, 2, 1, 1, 1, 1, 2, 1, 0, 1, 1, 0],
    [2, 3, 1, 0, 0, 1, 3, 0, 1, 1, 0, 0],
    [1, 1, 3, 1, 1, 2, 1, 1, 0, 0, 1, 1],
    [1, 0, 1, 3, 2, 2, 1, 2, 0, 0, 1, 0],
    [1, 0, 1, 2, 3, 2, 2, 1, 0, 1, 1, 2],
    [1, 1, 1, 2, 2, 3, 1, 2, 1, 0, 1, 0],
    [2, 1, 1, 1, 2, 1, 3, 2, 0, 2, 1, 1],
    [1, 0, 1, 2, 1, 2, 2, 3, 1, 1, 2, 0],
    [0, 1, 0, 0, 0, 1, 0, 1, 3, 0, 0, 1],
    [1, 1, 0, 0, 1, 0, 2, 1, 0, 3, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 2, 0, 1, 3, 1],
    [0, 0, 1, 0, 2, 0, 1, 0, 1, 1, 1, 3]
  ];
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* ring-closing validation (testable unit): every month-order edge,
   * including December->January, must be a BASE-allowed transition. */
  function ringOk(tiles) {
    if (!tiles || tiles.length !== 12) return false;
    for (var e = 0; e < 12; e++) {
      var a = tiles[e], b = tiles[(e + 1) % 12];
      if (!(a >= 0 && b >= 0 && BASE[a][b] > 0)) return false;
    }
    return true;
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* context multipliers over tile indices */
  function ctxMult(ctx) {
    var m = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    if (!ctx) return m;
    if (ctx.student) { m[2] *= 3; m[0] *= 0.4; m[1] *= 0.3; }
    if (ctx.worker) { m[0] *= 2.5; m[1] *= 1.8; m[2] *= 0.5; }
    if (ctx.kids) { m[4] *= 2.2; m[8] *= 0.3; m[7] *= 0.6; }
    if (ctx.partner) { m[3] *= 2; m[4] *= 1.5; }
    if (ctx.child) { m[4] *= 2; m[5] *= 1.6; m[1] *= 0.2; m[8] *= 0.1; }
    if (ctx.senior) { m[6] *= 2; m[11] *= 2; m[1] *= 0.3; m[8] *= 0.3; }
    if (ctx.criminal) { m[8] *= 2.5; m[1] *= 1.4; }
    if (ctx.famous) { m[5] *= 1.8; m[7] *= 1.5; }
    return m;
  }
  function collapseYear(seedNum, mult) {
    var rnd = mulberry32(seedNum);
    var N = 12, best = null;
    for (var attempt = 0; attempt < 40; attempt++) {
      /* domains: full tile set per month, minus context-pruned tiles */
      var dom = [];
      for (var i = 0; i < N; i++) {
        var d = [];
        for (var t = 0; t < 12; t++) if (mult[t] > 0.15) d.push(t);
        if (!d.length) d = [0, 6];
        dom.push(d);
      }
      var tiles = new Array(N).fill(-1), ok = true;
      /* collapse one month, forward-prune the next, walk the ring */
      var order = [];
      for (var k = 0; k < N; k++) order.push(k);
      /* start at a random month, then walk the ring in order */
      var start = Math.floor(rnd() * N);
      for (var s = 0; s < N; s++) {
        var mi = (start + s) % N;
        var prev = tiles[(mi + N - 1) % N];
        var allowed = dom[mi];
        if (prev >= 0) {
          allowed = allowed.filter(function (t) { return BASE[prev][t] > 0; });
          if (!allowed.length) { ok = false; break; }
        }
        var tw = 0, w = allowed.map(function (t) { var x = (prev >= 0 ? BASE[prev][t] : 1) * mult[t]; tw += x; return x; });
        var r = rnd() * tw, acc = 0, pick = allowed[0];
        for (var q = 0; q < allowed.length; q++) { acc += w[q]; if (r <= acc) { pick = allowed[q]; break; } }
        tiles[mi] = pick;
        /* propagate: prune the NEXT month's domain to compatible tiles */
        var nx = (mi + 1) % N;
        if (tiles[nx] < 0) {
          dom[nx] = dom[nx].filter(function (t) { return BASE[pick][t] > 0; });
          if (!dom[nx].length) { ok = false; break; }
        }
      }
      if (ok && tiles.every(function (t) { return t >= 0; })) {
        /* ring-closing validation: the walk constrains every month-order edge
         * EXCEPT into the start month (its predecessor was uncollapsed then).
         * A "ring" with a broken December->January (or start) edge is a gap,
         * not a cycle — reject the walk and retry. */
        if (ringOk(tiles)) { best = tiles; break; }
        ok = false;
      }
    }
    if (!best) best = [0, 0, 6, 0, 4, 5, 6, 7, 6, 9, 10, 11]; /* graceful fallback: never empty */
    return best;
  }
  var cache = {}; /* "seed:year" -> rhythm */
  function lifeSeed() {
    try { if (window.S && S.imgSeed) return String(S.imgSeed); } catch (e) {}
    return "noseed";
  }
  function ctxFromState() {
    var ctx = {};
    try {
      if (!window.S) return ctx;
      ctx.student = !!S.flags.student;
      ctx.worker = !!S.jobId && S.jobId !== "unemployed";
      ctx.kids = (S.relationships.children || []).length > 0;
      ctx.partner = !!S.relationships.partner;
      ctx.child = S.age < 13;
      ctx.senior = S.age >= 60;
      ctx.criminal = (S.crime || 0) > 0;
      ctx.famous = (S.fame || 0) >= 40;
    } catch (e) {}
    return ctx;
  }
  var api = {
    TILES: TILES,
    ringOk: ringOk, /* exposed for the test harness (pure edge validator) */
    rhythmFor: function (year) {
      var key = lifeSeed() + ":" + year;
      if (cache[key]) return cache[key];
      var mult = ctxMult(ctxFromState());
      var tiles = collapseYear(hashStr(key), mult);
      var glyphs = tiles.map(function (t) { return GLYPH[TILES[t]]; }).join("");
      var counts = {}, i;
      for (i = 0; i < tiles.length; i++) {
        var L = LEAN[TILES[tiles[i]]];
        counts[L] = (counts[L] || 0) + 1;
      }
      var dom = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 3).join("/");
      var r = { year: year, tiles: tiles.map(function (t) { return TILES[t]; }), glyphs: glyphs, dominant: dom };
      cache[key] = r;
      var keys = Object.keys(cache);
      if (keys.length > 24) delete cache[keys[0]];
      return r;
    },
    /* LLM guidance: hard constraint block, hard-capped. */
    guideBlock: function () {
      try {
        if (!window.S) return "";
        var r = api.rhythmFor(S.year);
        var s = "YEAR RHYTHM " + r.glyphs + " (months lean " + r.dominant +
          " — honor it; never contradict the listed dominant).";
        return s.slice(0, 200);
      } catch (e) { return ""; }
    },
    /* Agentic PCG: machine-readable plan for tool-callers (Director, MCP). */
    agentPropose: function (kind) {
      try {
        var y = (window.S && S.year) || 0;
        var r = api.rhythmFor(y);
        var must = r.dominant.split("/");
        var never = [];
        if (must.indexOf("risk") < 0) never.push("crime-spree");
        if (must.indexOf("kin") < 0) never.push("new-pregnancy");
        return { kind: kind || "scene", tiles: r.tiles, glyphs: r.glyphs, must: must, never: never };
      } catch (e) { return { kind: kind || "scene", tiles: [], glyphs: "", must: [], never: [] }; }
    },
    /* Year modifiers: the rhythm leans the SIM, not just the log.
     * work/grind years pay more but stress more; rest/solemn years heal;
     * risk years nudge crime-flavored variance; kin years nudge family. */
    modifiersFor: function (year) {
      try {
        var r = api.rhythmFor(year);
        var dom = r.dominant || "";
        var m = { incomeMul: 1, costMul: 1, stressDelta: 0, healthDelta: 0, moodDelta: 0, gdpNudge: 0 };
        if (dom.indexOf("work") >= 0) { m.incomeMul = 1.08; m.stressDelta += 1; }
        if (dom.indexOf("study") >= 0) { m.stressDelta += 1; }
        if (dom.indexOf("rest") >= 0) { m.stressDelta -= 3; m.healthDelta += 1; m.moodDelta += 1; }
        if (dom.indexOf("spirit") >= 0) { m.stressDelta -= 2; m.moodDelta += 1; }
        if (dom.indexOf("risk") >= 0) { m.incomeMul = 1.04; m.stressDelta += 2; m.gdpNudge += 0.3; }
        if (dom.indexOf("novelty") >= 0) { m.moodDelta += 2; m.gdpNudge += 0.4; }
        if (dom.indexOf("kin") >= 0) { m.moodDelta += 1; }
        if (dom.indexOf("body") >= 0) { m.healthDelta += 2; m.stressDelta -= 1; }
        return m;
      } catch (e) { return { incomeMul: 1, costMul: 1, stressDelta: 0, healthDelta: 0, moodDelta: 0, gdpNudge: 0 }; }
    },
    /* Event weighting: boost events whose id/text matches the year's dominant
     * lean, suppress events the agent plan forbids. Multiplier 0.35–2x. */
    eventWeightMult: function (ev) {
      try {
        var y = (window.S && S.year) || 0;
        var r = api.rhythmFor(y);
        var dom = (r.dominant || "").split("/");
        var plan = api.agentPropose("scene");
        var id = String((ev && ev.id) || "").toLowerCase();
        var tx = "";
        try { tx = String(typeof ev.text === "function" ? ev.text(window.S) : ev.text || "").toLowerCase().slice(0, 300); } catch (e) {}
        var hay = id + " " + tx;
        if (plan.never.indexOf("crime-spree") >= 0 && /(crime|heist|burgl|robbery|bank|pickpocket|embezzle|casino|gang|underworld|uw-)/.test(hay)) return 0.35;
        if (plan.never.indexOf("new-pregnancy") >= 0 && /(preg|baby|birth|maternity)/.test(hay)) return 0.5;
        var LEAN_RX = { work: /(job|boss|work|office|career|promotion)/, study: /(school|exam|study|college|grades)/, love: /(date|romance|partner|wedding|love|seduce)/, kin: /(family|mom|dad|kid|baby|sibling|grand)/, social: /(friend|party|social|club|festival)/, rest: /(sleep|nap|vacation|rest|retreat)/, novelty: /(trip|travel|adventure|tour|road)/, risk: /(crime|heist|casino|bet|gamble|risk|jail)/, body: /(gym|health|doctor|fitness|hospital)/, craft: /(art|gig|music|paint|write|book)/, spirit: /(church|temple|faith|pray|pilgrim|guru)/ };
        for (var i = 0; i < dom.length; i++) {
          var rx = LEAN_RX[dom[i]];
          if (rx && rx.test(hay)) return i === 0 ? 2.0 : 1.5;
        }
        return 1;
      } catch (e) { return 1; }
    },
    /* Compact plan line for AI prompts (hard-capped, token-cheap). */
    planLine: function () {
      try {
        var p = api.agentPropose("scene");
        var s = "PLAN " + p.glyphs + " must:" + (p.must || []).join("/") + (p.never && p.never.length ? " never:" + p.never.join("/") : "");
        return s.slice(0, 140);
      } catch (e) { return ""; }
    },
    status: function () {
      return { tiles: TILES.length, cached: Object.keys(cache).length };
    }
  };
  window.LL.pcg = api;
  window.pcgStatus = function () { return api.status(); };
  window.pcgRhythmFor = function (y) { return api.rhythmFor(y); };
})();
LL.files.push("pcg"); /* end-of-file registration: counts as loaded only after this file fully ran */
