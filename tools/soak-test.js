/* LIFE & LEGACY — src/tools/soak-test.js
 * Headless marathon soak. RUN IN THE LIVE PAGE via page_eval with
 * {path:"src/tools/soak-test.js"} (needs the real engine).
 *
 * WHY: unit harnesses (migration/parity/validate/typo/perf) prove pieces;
 * nothing proved a full life headless. This runs scripted decades with
 * auto-resolved modals and asserts structural invariants the whole way:
 * save-shape validity (checkS), finite money, monotonic age, growing log,
 * save/load round-trips, heir-chain continuity across generations, and zero
 * new error-capture entries. Deterministic-by-seed where the engine allows
 * (Math.random replaced + reseedWasm when present; WASM async load may
 * already have drawn — the seed is recorded, exact replay is best-effort).
 *
 * Stages:
 *   A. NATURAL MARATHON: newLife -> ageUp until death or 130 (modals
 *      auto-clicked, ~100ms/yr). Invariants every year (cheap) + deep
 *      checks each decade (tabs render, a verb, save/load round-trip).
 *   B. DYNASTY SPRINT: scripted family (date -> propose -> wedding -> kids)
 *      then run to death; if adult heirs exist, continueAsHeir and run the
 *      heir 25 years (genome/parents/chain continuity asserted).
 *
 * AI + network are stubbed dead (deterministic fallbacks only, zero quota).
 * Everything restored in `finally`. Never throws: failures land in
 * rep.failed[] and rep.invariantFails[].
 */
/* NOTE: runs as a page_eval body (async function): top-level await/return. */
var soakRep = { seed: 20261127, stageA: null, stageB: null, failed: [], invariantFails: [] };
try {
  if (typeof newLife !== "function") throw new Error("no engine (newLife missing)");
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fail(m) { soakRep.failed.push(m); }
  function inv(m) { soakRep.invariantFails.push(m); }
  /* ---- determinism (best-effort) + stubs ---- */
  var realRandom = Math.random, s = soakRep.seed >>> 0;
  Math.random = function () {
    s = (s + 0x6D2B79F5) >>> 0; var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { if (typeof reseedWasm === "function") reseedWasm(soakRep.seed); } catch (e) {}
  var realFetch = window.fetch, realGen = null, realImg = null, artWas = null;
  try {
    realGen = window.root && window.root.generateText; realImg = window.root && window.root.generateImage;
    window.fetch = function () { return Promise.reject(new Error("soak: network down")); };
    if (window.root) {
      window.root.generateText = function () { var r = Promise.reject(new Error("soak: AI down")); r.stop = function () {}; return r; };
      window.root.generateImage = function () { var r = Promise.reject(new Error("soak: AI down")); r.stop = function () {}; return r; };
    }
    artWas = window.LL_ART; window.LL_ART = false;
  } catch (e) { fail("stub setup: " + e.message); }
  /* error-capture baseline: count error entries now, diff at the end */
  function errCount() {
    try {
      var c = window.__consoleCapture75847 || [];
      var n = 0;
      for (var i = 0; i < c.length; i++) {
        var e = c[i];
        if (e && (e.k === "error" || e.kind === "error" || e.n === "error")) n++;
      }
      return n;
    } catch (e2) { return -1; }
  }
  var err0 = errCount();
  async function settleModals() {
    // auto-resolve the year's modal (event / crisis share #eventModal)
    for (var t = 0; t < 6; t++) {
      var acted = false;
      try {
        var m = document.querySelector("#eventModal");
        if (m && !m.classList.contains("hidden")) {
          var b = document.querySelector("#evChoices button");
          if (b) { b.click(); acted = true; }
        }
        var dm = document.querySelector("#directorModal");
        if (dm && !dm.classList.contains("hidden") && typeof closeModal === "function") { closeModal("directorModal"); acted = true; }
      } catch (e) {}
      if (!acted) break;
      await sleep(90);
    }
  }
  function cheapInvariants(tag) {
    try {
      if (!window.S) { inv(tag + ": S missing"); return; }
      if (typeof checkS === "function") { var c = checkS(); if (c) inv(tag + ": checkS -> " + c); }
      if (!isFinite(S.money)) inv(tag + ": money not finite (" + S.money + ")");
      if (!isFinite(S.age)) inv(tag + ": age not finite");
      if (S.log && S.log.length < (cheapInvariants.lastLog || 0)) inv(tag + ": log shrank");
      cheapInvariants.lastLog = S.log ? S.log.length : 0;
      var bad = [];
      ["health", "happiness", "smarts", "looks", "fitness", "discipline", "creativity", "social", "karma"].forEach(function (k) {
        var v = S.stats && S.stats[k];
        if (typeof v !== "number" || !isFinite(v)) bad.push(k + "=" + v);
      });
      if (bad.length) inv(tag + ": bad stats " + bad.join(","));
    } catch (e) { inv(tag + ": invariant throw " + e.message); }
  }
  async function deepDecade(tag) {
    // tabs render + one verb + save/load round-trip identical
    try {
      var tabs = ["activities", "education", "money", "health", "social", "family", "crown", "world"];
      for (var i = 0; i < tabs.length; i++) {
        try { curTab = tabs[i]; render(); } catch (e) { inv(tag + ": tab " + tabs[i] + " throw " + e.message); }
      }
      await sleep(60);
      try { if (typeof doAct === "function" && S.alive) doAct("study"); } catch (e) { inv(tag + ": verb study throw " + e.message); }
      try {
        saveTo(6); var snap = JSON.stringify(S); loadFrom(6);
        if (JSON.stringify(S) !== snap) inv(tag + ": save/load mismatch");
        else soakRep.decadesRoundtrip = (soakRep.decadesRoundtrip || 0) + 1;
      } catch (e) { inv(tag + ": save/load throw " + e.message); }
    } catch (e) { inv(tag + ": decade throw " + e.message); }
  }
  async function runYears(maxY, tag) {
    var r = { years: 0, modals: 0, deaths: 0 };
    for (var y = 0; y < maxY; y++) {
      if (!window.S || !S.alive) break;
      var a0 = S.age;
      try { ageUp(false); } catch (e) { fail(tag + " ageUp throw at " + a0 + ": " + e.message); break; }
      await sleep(100);
      try {
        var m = document.querySelector("#eventModal");
        if (m && !m.classList.contains("hidden")) { r.modals++; }
      } catch (e) {}
      await settleModals();
      if (window.S && S.alive && S.age !== a0 + 1 && S.age !== a0) inv(tag + ": age jumped " + a0 + "->" + S.age);
      if (window.S && S.alive) cheapInvariants(tag + " yr" + S.age);
      if (window.S && S.alive && S.age % 10 === 0) await deepDecade(tag + " @" + S.age);
      r.years++;
      if (!window.S || !S.alive) { r.deaths++; break; }
    }
    return r;
  }
  /* ================= STAGE A: natural marathon ================= */
  try {
    try { if (typeof closeModal === "function") { closeModal("eventModal"); } } catch (e) {}
    newLife({});
    await sleep(200);
    cheapInvariants.lastLog = 0;
    cheapInvariants("A birth");
    if (!S || S.v !== 7) fail("A: save version want 7, got " + (S && S.v));
    if (!S.genes || !S.genes.L) fail("A: no genes.genome at birth");
    try {
      var mom = S.relationships && S.relationships.mom, dad = S.relationships && S.relationships.dad;
      if (!mom || !mom.name || mom.name === "Mom") fail("A: nameless mom at birth");
      if (!dad || !dad.name || dad.name === "Dad") fail("A: nameless dad at birth");
      if (mom && !mom.genes) fail("A: mom has no genes at birth");
    } catch (e) { fail("A parents check: " + e.message); }
    var a = await runYears(130, "A");
    a.alive = !!(window.S && S.alive);
    a.finalAge = window.S ? S.age : -1;
    a.logLen = (window.S && S.log) ? S.log.length : -1;
    soakRep.stageA = a;
  } catch (e) { fail("stageA harness: " + e.message); }
  /* ================= STAGE B: dynasty sprint ================= */
  try {
    var b = { married: false, kids: 0, heirContinued: false, heirYears: 0 };
    newLife({});
    await sleep(200);
    cheapInvariants.lastLog = 0; // new life, new log — never compare across lives
    // fast-forward silently to adulthood (growTo keeps genes/parents intact)
    try { if (typeof growTo === "function" && S.age < 20) { growTo(20); await sleep(200); } } catch (e) { fail("B growTo: " + e.message); }
    await settleModals();
    // scripted family: date until partner, datenights until rel>65, propose, wedding, babies
    var guard = 0;
    try {
      if (typeof doAct === "function") {
        if (S.money < 8000) { S.money += 20000; b.grantedFunds = true; } // harness aid: proposal+wedding+baby cost ~$10k
        while (guard++ < 30 && S.alive && !(S.relationships && S.relationships.partner)) {
          try { doAct("finddate"); } catch (e) {}
          await settleModals();
        }
        var dg = 0;
        while (dg++ < 12 && S.alive && S.relationships && S.relationships.partner && S.relationships.partner.rel <= 65) {
          try { doAct("datenight"); } catch (e) {}
          await settleModals();
        }
        try { doAct("propose"); } catch (e) {}
        await settleModals();
        if (S.relationships && S.relationships.partner && S.relationships.partner.married === true) b.married = true;
        else {
          // propose may have failed on funds/rel — retry after one more date
          try { doAct("datenight"); } catch (e) {}
          await settleModals();
          try { doAct("propose"); } catch (e) {}
          await settleModals();
          if (S.relationships && S.relationships.partner && S.relationships.partner.married === true) b.married = true;
        }
        if (b.married) {
          // baby starts a pregnancy (once per life); birth arrives via yearly
          try { doAct("baby"); } catch (e) {}
          await settleModals();
          cheapInvariants.lastLog = (S.log ? S.log.length : 0);
          for (var bi = 0; bi < 4; bi++) {
            try { if (S.alive && S.age < 44) { ageUp(false); await sleep(100); await settleModals(); } } catch (e) {}
            if (window.S && S.alive) cheapInvariants("B preg yr" + S.age);
          }
          b.kids = (S.relationships && S.relationships.children) ? S.relationships.children.length : 0;
        }
      }
    } catch (e) { fail("B family script: " + e.message); }
    // run to death (cap 100 more years), then heir-continue if possible
    var br = await runYears(100, "B");
    b.runYears = br.years; b.modals = br.modals;
    b.died = !(window.S && S.alive);
    try {
      var kids = (S.relationships && S.relationships.children) || [];
      var adults = kids.filter(function (k) { return k && k.age >= 18; });
      b.adultHeirs = adults.length;
      if (b.died && adults.length && typeof continueAsHeir === "function") {
        var heirName = adults[0].name;
        continueAsHeir(heirName);
        await sleep(300);
        await settleModals();
        if (window.S && S.alive) {
          b.heirContinued = true;
          cheapInvariants.lastLog = (S.log ? S.log.length : 0); // heir inherits last 40 — never compare across lives
          if (!S.genes || !S.genes.L) inv("B heir: genes missing after continue");
          // heir lives have no S.parents block by design (see death.js):
          // continuity lives in relationships (widowed parent / siblings).
          var R = S.relationships || {};
          if (!(R.parentRel || (R.siblings && R.siblings.length) || (R.grandparents && R.grandparents.length)))
            inv("B heir: no family continuity in relationships after continue");
          var hr = await runYears(25, "B-heir");
          b.heirYears = hr.years; b.heirModals = hr.modals;
        } else fail("B: continueAsHeir did not leave a live heir");
      }
    } catch (e) { fail("B heir: " + e.message); }
    soakRep.stageB = b;
  } catch (e) { fail("stageB harness: " + e.message); }
  soakRep.errDelta = errCount() - err0;
  soakRep.ok = (soakRep.failed.length === 0 && soakRep.invariantFails.length === 0 && soakRep.errDelta <= 0);
} catch (e) { soakRep.failed.push("soak harness fatal: " + (e && e.message)); }
try {
  /* restore everything we touched */
  Math.random = realRandom;
  try { if (typeof reseedWasm === "function" && window.S && S.imgSeed) reseedWasm(S.imgSeed); } catch (e) {}
  window.fetch = realFetch;
  if (window.root) { window.root.generateText = realGen; window.root.generateImage = realImg; }
  try { if (artWas !== null) window.LL_ART = artWas; } catch (e) {}
} catch (e) {}
return soakRep;
