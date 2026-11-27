/* LIFE & LEGACY — engine/ecs.js
 * ARCHITECTURE LAYER 1/6 — Data-Oriented Design (DOD) + Entity Component System.
 *
 * Why ECS here: the sim's hot loops (market tickers, NPC roster) were
 * pointer-chasing object walks. ECS reframes them as SYSTEMS iterating packed
 * entity lists with per-field column stores — cache-friendly, schedulable,
 * and testable in isolation. Save-compat rule: S stays the source of truth;
 * components may REFERENCE live S objects (zero drift, zero migration) while
 * the numeric scratch lives in typed arrays. Entities are recycled integer
 * ids; queries are cached bitmask matches invalidated on structural change.
 *
 * Load order: after migrate (needs nothing but LL), before the systems that
 * register into it (world, yearly). Pushes "ecs" as its LAST line.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
(function () {
  var nextId = 1, freeIds = [];
  var compMasks = {};   /* compName -> bit */
  var compBits = 0;
  var entMask = {};     /* id -> bitmask of components */
  var stores = {};      /* compName -> { ids:[], fields:{name:[...] }, index:{id:slot} } */
  var systems = [];     /* {name, comps, mask, fn} in registration order */
  var queryCache = {};  /* key -> {ver, ids} */
  var structVer = 0;
  var aliveCount = 0;

  function bitFor(comp) {
    if (compMasks[comp] === undefined) {
      if (compBits >= 30) throw new Error("ecs: >30 component types");
      compMasks[comp] = 1 << compBits++;
    }
    return compMasks[comp];
  }
  function storeFor(comp) {
    if (!stores[comp]) stores[comp] = { ids: [], fields: {}, index: {} };
    return stores[comp];
  }
  function invalidate() { structVer++; }

  var api = {
    /* entities */
    create: function () {
      var id = freeIds.length ? freeIds.pop() : nextId++;
      entMask[id] = 0; aliveCount++; invalidate(); return id;
    },
    destroy: function (id) {
      if (entMask[id] === undefined) return;
      var st, f, s, i;
      for (var c in stores) {
        st = stores[c]; i = st.index[id];
        if (i !== undefined) {
          var last = st.ids.length - 1, lastId = st.ids[last];
          st.ids[i] = lastId; st.index[lastId] = i;
          for (f in st.fields) { s = st.fields[f]; s[i] = s[last]; s.length = last; }
          st.ids.length = last; delete st.index[id];
        }
      }
      delete entMask[id]; freeIds.push(id); aliveCount--; invalidate();
    },
    alive: function (id) { return entMask[id] !== undefined; },
    /* components (fields object is stored BY REFERENCE for live S objects) */
    add: function (id, comp, fields) {
      if (entMask[id] === undefined) return false;
      var st = storeFor(comp), i = st.index[id], f;
      if (i === undefined) { i = st.ids.length; st.ids.push(id); st.index[id] = i; }
      fields = fields || {};
      for (f in fields) {
        if (!st.fields[f]) st.fields[f] = [];
        st.fields[f][i] = fields[f];
      }
      entMask[id] |= bitFor(comp); invalidate(); return true;
    },
    get: function (id, comp) {
      var st = stores[comp]; if (!st) return null;
      var i = st.index[id]; if (i === undefined) return null;
      var out = {}, f; for (f in st.fields) out[f] = st.fields[f][i];
      return out;
    },
    /* direct column access for hot systems (no object churn): returns {ids, col} */
    column: function (comp, field) {
      var st = stores[comp]; if (!st) return null;
      if (!st.fields[field]) st.fields[field] = [];
      return { ids: st.ids, col: st.fields[field] };
    },
    has: function (id, comp) {
      if (entMask[id] === undefined) return false;
      return (entMask[id] & bitFor(comp)) !== 0;
    },
    remove: function (id, comp) {
      var st = stores[comp]; if (!st) return;
      var i = st.index[id]; if (i === undefined) return;
      var last = st.ids.length - 1, lastId = st.ids[last], f, s;
      st.ids[i] = lastId; st.index[lastId] = i;
      for (f in st.fields) { s = st.fields[f]; s[i] = s[last]; s.length = last; }
      st.ids.length = last; delete st.index[id];
      entMask[id] &= ~bitFor(comp); invalidate();
    },
    /* queries: ids having ALL listed components (packed, cache-verified) */
    query: function () {
      var comps = Array.prototype.slice.call(arguments).sort();
      var key = comps.join("+"), c = queryCache[key];
      if (c && c.ver === structVer) return c.ids;
      var mask = 0, i;
      for (i = 0; i < comps.length; i++) mask |= bitFor(comps[i]);
      /* iterate the smallest store */
      var best = null;
      for (i = 0; i < comps.length; i++) {
        var st = stores[comps[i]];
        if (!st) { queryCache[key] = { ver: structVer, ids: [] }; return []; }
        if (!best || st.ids.length < best.ids.length) best = st;
      }
      var ids = [], bid;
      for (i = 0; i < best.ids.length; i++) {
        bid = best.ids[i];
        if ((entMask[bid] & mask) === mask) ids.push(bid);
      }
      queryCache[key] = { ver: structVer, ids: ids };
      return ids;
    },
    /* systems: fn(ids, ctx) — ids prefiltered by component mask */
    system: function (name, comps, fn) {
      var mask = 0, i;
      for (i = 0; i < comps.length; i++) mask |= bitFor(comps[i]);
      systems.push({ name: name, comps: comps.slice().sort(), mask: mask, fn: fn });
      return name;
    },
    run: function (name, ctx) {
      for (var i = 0; i < systems.length; i++) {
        if (systems[i].name === name) {
          var ids = api.query.apply(api, systems[i].comps);
          systems[i].fn(ids, ctx);
          return true;
        }
      }
      return false;
    },
    runAll: function (ctx) {
      for (var i = 0; i < systems.length; i++) {
        var ids = api.query.apply(api, systems[i].comps);
        systems[i].fn(ids, ctx);
      }
    },
    systemNames: function () { return systems.map(function (s) { return s.name; }); },
    stats: function () {
      var comps = {};
      for (var c in stores) comps[c] = stores[c].ids.length;
      return { entities: aliveCount, recycled: freeIds.length, systems: systems.length, components: comps };
    }
  };
  window.LL.ecs = api;
  window.ecsStatus = function () { return api.stats(); };
})();
LL.files.push("ecs"); /* end-of-file registration: counts as loaded only after this file fully ran */
