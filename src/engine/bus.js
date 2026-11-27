/* LIFE & LEGACY — engine/bus.js
 * ARCHITECTURE LAYER 2/6 — Event-Driven Architecture (EDA) + CQRS-lite.
 *
 * Every player/system intent enters as a COMMAND ({type, payload}); command
 * handlers validate + record; they EMIT EVENTS ({type, payload, at}); event
 * subscribers update read models. Queries ({type, args}) are pure reads and
 * can never mutate. This is the strangler pattern: the bus RECORDS alongside
 * the existing direct mutations (doAct/ageUp keep working untouched), so the
 * journal, metrics, and future projections grow without risking the game.
 * The journal is session-only (never saved — S.log remains the durable story).
 *
 * Load order: after migrate/ecs (needs nothing at load), before actions/yearly
 * which dispatch into it at CALL time. Pushes "bus" as its LAST line.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
(function () {
  var cmdHandlers = {};   /* type -> [fn(cmd)] — validate/record side */
  var evtSubs = {};       /* type -> [fn(evt)] */
  var queryHandlers = {}; /* name -> fn(args) — MUST be pure */
  var journal = [];       /* every emitted event, capped */
  var cmdCounts = {};     /* type -> n */
  var cmdMs = {};         /* type -> total ms in handlers */
  var JOURNAL_CAP = 400;

  function now() { return (window.S && S.year) || 0; }

  var api = {
    /* --- commands --- */
    onCommand: function (type, fn) {
      if (!cmdHandlers[type]) cmdHandlers[type] = [];
      cmdHandlers[type].push(fn);
    },
    dispatch: function (cmd) {
      if (!cmd || !cmd.type) return { ok: false, error: "no-type" };
      var hs = cmdHandlers[cmd.type] || [], t0 = 0, i, out = { ok: true, type: cmd.type };
      cmd.actor = cmd.actor || "player"; cmd.at = now();
      try { t0 = Date.now(); } catch (e) {}
      for (i = 0; i < hs.length; i++) {
        try { hs[i](cmd); }
        catch (e) { out.ok = false; out.error = String((e && e.message) || e).slice(0, 120); }
      }
      try {
        cmdCounts[cmd.type] = (cmdCounts[cmd.type] || 0) + 1;
        cmdMs[cmd.type] = (cmdMs[cmd.type] || 0) + (Date.now() - t0);
      } catch (e) {}
      return out;
    },
    /* --- events --- */
    on: function (type, fn) {
      if (!evtSubs[type]) evtSubs[type] = [];
      evtSubs[type].push(fn);
    },
    emit: function (evt) {
      if (!evt || !evt.type) return false;
      evt.at = now();
      journal.push(evt);
      if (journal.length > JOURNAL_CAP) journal.splice(0, journal.length - JOURNAL_CAP);
      var hs = evtSubs[evt.type] || [], i;
      for (i = 0; i < hs.length; i++) {
        try { hs[i](evt); } catch (e) {}
      }
      return true;
    },
    /* --- queries (pure reads) --- */
    onQuery: function (name, fn) { queryHandlers[name] = fn; },
    query: function (name, args) {
      var fn = queryHandlers[name];
      if (!fn) return { ok: false, error: "unknown-query:" + name };
      try { return { ok: true, value: fn(args || {}) }; }
      catch (e) { return { ok: false, error: String((e && e.message) || e).slice(0, 120) }; }
    },
    journalTail: function (n) {
      n = n || 20;
      return journal.slice(-n).map(function (e) {
        return { type: e.type, at: e.at, payload: e.payload };
      });
    },
    status: function () {
      var cmds = {}, evts = {};
      for (var c in cmdHandlers) cmds[c] = cmdCounts[c] || 0;
      for (var e in evtSubs) evts[e] = true;
      return { commands: cmds, events: Object.keys(evts), queries: Object.keys(queryHandlers), journal: journal.length, projection: proj };
    }
  };

  /* Default wiring: the two player intents every session produces.
   * Handlers RECORD (counts + journal events) — they never mutate S. */
  var proj = { acts: 0, ages: 0, ticks: 0, births: 0, deaths: 0, lastRegime: null, lastRhythm: null };
  api.onCommand("act", function (cmd) {
    proj.acts++;
    api.emit({ type: "act.performed", payload: { id: cmd.id || cmd.payload } });
  });
  api.onCommand("age", function (cmd) {
    proj.ages++;
    api.emit({ type: "year.passed", payload: { silent: !!(cmd && cmd.silent) } });
  });
  /* System-side events: emitted by world/yearly/life/death (pure record). */
  api.on("world.ticked", function (evt) {
    proj.ticks++;
    try { if (evt && evt.payload && evt.payload.regime) proj.lastRegime = evt.payload.regime; } catch (e) {}
  });
  api.on("year.committed", function (evt) {
    try { if (evt && evt.payload && evt.payload.rhythm) proj.lastRhythm = evt.payload.rhythm; } catch (e) {}
  });
  api.on("life.born", function () { proj.births++; });
  api.on("life.died", function () { proj.deaths++; });
  api.onQuery("journalTail", function (args) { return api.journalTail(args.n || 20); });
  api.onQuery("commandCounts", function () {
    var c = {}; for (var k in cmdCounts) c[k] = cmdCounts[k]; return c;
  });
  api.onQuery("projection", function () {
    var p = {}; for (var k in proj) p[k] = proj[k]; return p;
  });
  api.onQuery("soul", function () {
    try {
      if (!window.S) return { alive: false };
      return { alive: !!S.alive, age: S.age, year: S.year, money: S.money, job: S.jobId, hp: (S.stats || {}).health };
    } catch (e) { return { alive: false }; }
  });
  api.onQuery("market", function () {
    try {
      if (!window.S || !S.world) return { open: false };
      return { regime: S.world.regime, idx: Math.round(S.world.idx), tickers: S.world.tickers.length };
    } catch (e) { return { open: false }; }
  });
  api.onQuery("rhythm", function () {
    try { if (window.LL && LL.pcg && window.S) return LL.pcg.rhythmFor(S.year); return null; }
    catch (e) { return null; }
  });
  api.projection = function () { var p = {}; for (var k in proj) p[k] = proj[k]; return p; };

  window.LL.bus = api;
  window.busStatus = function () { return api.status(); };
})();
LL.files.push("bus"); /* end-of-file registration: counts as loaded only after this file fully ran */
