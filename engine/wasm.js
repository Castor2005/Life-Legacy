/* LIFE & LEGACY — engine/wasm.js
 * ARCHITECTURE LAYER 3/6 (part B) — WebAssembly runtime loader.
 * Loads src/engine/wasm/rng.wasm (built from rng.wat via wabt) and exposes
 * drop-in RNG: LL.wasmRand() ~ U[0,1), LL.wasmRandn() ~ N(0,1). Until the
 * binary arrives (or where WASM is unavailable) both fall back to Math.random
 * paths, so the game never blocks on load. Pushes "wasm" as its LAST line.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
(function () {
  var exp = null, ready = false, seedUsed = 0, pendingSeed = null;
  function boxMuller() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  window.LL.wasmRand = function () {
    try { if (ready && exp && exp.rand) return exp.rand(); } catch (e) {}
    return Math.random();
  };
  window.LL.wasmRandn = function () {
    try { if (ready && exp && exp.randn) return exp.randn(); } catch (e) {}
    return boxMuller();
  };
  function boot() {
    try {
      seedUsed = (Date.now() ^ (Math.random() * 0xffffffff)) | 0;
      fetch("src/engine/wasm/rng.wasm").then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.arrayBuffer();
      }).then(function (ab) { return WebAssembly.instantiate(ab, {}); })
        .then(function (o) {
          exp = o.instance.exports;
          try {
            if (pendingSeed !== null) { exp.srand(pendingSeed | 0); seedUsed = pendingSeed | 0; pendingSeed = null; }
            else exp.srand(seedUsed);
          } catch (e) {}
          ready = true;
        }).catch(function () { ready = false; });
    } catch (e) { ready = false; }
  }
  try { boot(); } catch (e) {}
  /* Per-life reseed: newLife calls this with the life seed so each soul gets
   * its own deterministic WASM stream (reproducible market/noise per life).
   * Safe before load: stores pendingSeed and applies on instantiate. */
  window.LL.reseedWasm = function (seed) {
    seed = (seed | 0) || 1;
    try {
      if (ready && exp && exp.srand) { exp.srand(seed); seedUsed = seed; }
      else { pendingSeed = seed; seedUsed = seed; }
    } catch (e) {}
    return seedUsed;
  };
  window.reseedWasm = window.LL.reseedWasm;
  window.wasmStatus = function () { return { ready: ready, seed: seedUsed, pending: pendingSeed }; };
})();
LL.files.push("wasm"); /* end-of-file registration: counts as loaded only after this file fully ran */
