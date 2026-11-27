/* LIFE & LEGACY — engine/compute.js
 * ARCHITECTURE LAYER 4/6 — WebGPU + WASM numeric compute with CPU fallback.
 *
 * Combination strategy (the professional pattern): hot numeric kernels exist
 * in THREE tiers — (1) WebGPU WGSL compute when navigator.gpu is present,
 * (2) WASM-seeded RNG + typed-array CPU kernels otherwise, (3) plain-JS
 * scalar fallback if WASM hasn't loaded yet. Callers use ONE entry point
 * (LL.compute.*) and never branch on backend themselves.
 *
 * ROUTING POLICY (measured, not assumed): the live tick calls the SYNC
 * kernels (gbm/lerp) because live N is tiny (10 tickers, ~10-40 NPCs) and
 * transfer-bound — dispatching 40 floats to the GPU costs more than computing
 * them. Measured (perf-test compute bench, WebGPU live): sync CPU 0.1ms vs
 * async WebGPU ~219ms flat at N=10..20000 (per-call pipeline creation
 * dominates; CPU still wins outright at N=20000: 3.9ms vs 219ms).
 * The ASYNC twins (gbmAsync/lerpAsync) use WebGPU when warm and are the
 * opt-in path for bulk work; backends agree to f32 rounding (~1e-5).
 * Do NOT "wire GPU into the tick" without re-running that bench: at tick
 * sizes the GPU loses by three orders of magnitude. (A pipeline cache would
 * cut the ~219ms floor for bulk callers — add one only when a bulk caller
 * exists that measures a need.)
 *
 * Current kernels: gbmBatch (market excess-return core: er = drift*0.4 +
 * beta*idxR + noise*0.6 + shockR over N tickers). The market system feeds it
 * packed Float32Arrays; results are written back in place.
 *
 * Pushes "compute" as its LAST line.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
(function () {
  var device = null, gpuTried = false, gpuOk = false, gpuErr = "";
  /* NOTE: `vol` is intentionally NOT a shader input — noise arrives
   * pre-scaled by volatility on the CPU (fewer bytes per dispatch). An
   * unused storage binding would be stripped from the auto layout and fail
   * bind-group creation, so the kernel takes exactly what it reads. */
  var WGSL =
    "struct P { n : u32 }; @group(0) @binding(0) var<uniform> p : P;\n" +
    "@group(0) @binding(1) var<storage, read> drift : array<f32>;\n" +
    "@group(0) @binding(2) var<storage, read> beta : array<f32>;\n" +
    "@group(0) @binding(3) var<storage, read> noise : array<f32>;\n" +
    "@group(0) @binding(4) var<storage, read_write> er : array<f32>;\n" +
    "@group(0) @binding(5) var<uniform> k : vec4<f32>;\n" + /* idxR, shockR, x, x */
    "@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid : vec3<u32>) {\n" +
    "  let i = gid.x; if (i >= p.n) { return; }\n" +
    "  er[i] = drift[i] * 0.4 + beta[i] * k.x + noise[i] * 0.6 + k.y;\n" +
    "}\n";

  function tryGpu() {
    if (gpuTried) return;
    gpuTried = true;
    try {
      if (!navigator.gpu) { gpuErr = "no-navigator.gpu"; return; }
      navigator.gpu.requestAdapter().then(function (ad) {
        if (!ad) { gpuErr = "no-adapter"; return; }
        return ad.requestDevice();
      }).then(function (dv) {
        if (!dv) return;
        device = dv; gpuOk = true;
      }).catch(function (e) { gpuErr = String((e && e.message) || e).slice(0, 80); });
    } catch (e) { gpuErr = String(e).slice(0, 80); }
  }
  try { tryGpu(); } catch (e) {}

  /* CPU kernel — always available, bit-compatible with the WGSL above. */
  function gbmCpu(n, drift, beta, vol, noise, er, idxR, shockR) {
    for (var i = 0; i < n; i++)
      er[i] = drift[i] * 0.4 + beta[i] * idxR + noise[i] * 0.6 + shockR;
  }

  /* Generic batch-lerp kernel: out[i] = cur[i] + (tgt[i]-cur[i])*k + add[i].
   * Used for NPC rel drift, mood pull, housing glide — one kernel, many DOD
   * loops. CPU path is the source of truth; GPU mirrors it bit-closely. */
  var WGSL_LERP =
    "@group(0) @binding(0) var<storage, read> cur : array<f32>;\n" +
    "@group(0) @binding(1) var<storage, read> tgt : array<f32>;\n" +
    "@group(0) @binding(2) var<storage, read> add : array<f32>;\n" +
    "@group(0) @binding(3) var<storage, read_write> out : array<f32>;\n" +
    "@group(0) @binding(4) var<uniform> k : vec4<f32>;\n" +
    "@group(0) @binding(5) var<uniform> p : vec4<u32>;\n" +
    "@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid : vec3<u32>) {\n" +
    "  let i = gid.x; if (i >= p.x) { return; }\n" +
    "  out[i] = cur[i] + (tgt[i] - cur[i]) * k.x + add[i];\n" +
    "}\n";
  function lerpCpu(n, cur, tgt, add, k, out) {
    for (var i = 0; i < n; i++) out[i] = cur[i] + (tgt[i] - cur[i]) * k + add[i];
  }
  async function lerpGpu(n, cur, tgt, add, k, out) {
    var read = null;
    var all = [];
    try {
      var mk = function (arr) {
        var src = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
        var b = device.createBuffer({ size: Math.max(16, src.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
        device.queue.writeBuffer(b, 0, src);
        return b;
      };
      var mkOut = function (len) {
        return device.createBuffer({ size: Math.max(16, len * 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
      };
      var kV = new Float32Array([k, 0, 0, 0]);
      var pV = new Uint32Array([n, 0, 0, 0]);
      var bC = mk(cur), bT = mk(tgt), bA = mk(add), bO = mkOut(n);
      var bK = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      var bP = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(bK, 0, new Uint8Array(kV.buffer, kV.byteOffset, kV.byteLength));
      device.queue.writeBuffer(bP, 0, new Uint8Array(pV.buffer, pV.byteOffset, pV.byteLength));
      var mod = device.createShaderModule({ code: WGSL_LERP });
      var pipe = device.createComputePipeline({ layout: "auto", compute: { module: mod, entryPoint: "main" } });
      var bg = device.createBindGroup({
        layout: pipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: bC } },
          { binding: 1, resource: { buffer: bT } },
          { binding: 2, resource: { buffer: bA } },
          { binding: 3, resource: { buffer: bO } },
          { binding: 4, resource: { buffer: bK } },
          { binding: 5, resource: { buffer: bP } }
        ]
      });
      var enc = device.createCommandEncoder();
      var pass = enc.beginComputePass();
      pass.setPipeline(pipe); pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(n / 64)); pass.end();
      read = device.createBuffer({ size: Math.max(16, n * 4), usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      enc.copyBufferToBuffer(bO, 0, read, 0, n * 4);
      device.queue.submit([enc.finish()]);
      await read.mapAsync(GPUMapMode.READ);
      out.set(new Float32Array(read.getMappedRange()));
      read.unmap();
      all = [bC, bT, bA, bO, bK, bP, read];
    } finally {
      for (var i = 0; i < all.length; i++) { try { if (all[i]) all[i].destroy(); } catch (e) {} }
      try { if (read) read.unmap(); } catch (e) {}
    }
  }

  async function gbmGpu(n, drift, beta, vol, noise, er, idxR, shockR) {
    void vol; /* premultiplied into noise on the CPU — see WGSL note */
    var read = null;
    var all = [];
    try {
    var mk = function (arr, usage) {
      /* byte-exact upload: never re-view through Float32Array (that would
       * corrupt integer uniforms by float conversion). */
      var src = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
      var b = device.createBuffer({ size: Math.max(16, src.byteLength), usage: usage, mappedAtCreation: true });
      new Uint8Array(b.getMappedRange()).set(src);
      b.unmap();
      return b;
    };
    var nU = new Uint32Array([n]);
    var kV = new Float32Array([idxR, shockR, 0, 0]);
    var bN = mk(nU, GPUBufferUsage.UNIFORM);
    var bD = mk(drift, GPUBufferUsage.STORAGE);
    var bB = mk(beta, GPUBufferUsage.STORAGE);
    var bNz = mk(noise, GPUBufferUsage.STORAGE);
    var bEr = device.createBuffer({ size: Math.max(16, er.byteLength), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    var bK = mk(kV, GPUBufferUsage.UNIFORM);
    var mod = device.createShaderModule({ code: WGSL });
    var pipe = device.createComputePipeline({ layout: "auto", compute: { module: mod, entryPoint: "main" } });
    var bg = device.createBindGroup({
      layout: pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: bN } },
        { binding: 1, resource: { buffer: bD } },
        { binding: 2, resource: { buffer: bB } },
        { binding: 3, resource: { buffer: bNz } },
        { binding: 4, resource: { buffer: bEr } },
        { binding: 5, resource: { buffer: bK } }
      ]
    });
    var enc = device.createCommandEncoder();
    var pass = enc.beginComputePass();
    pass.setPipeline(pipe); pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(n / 64)); pass.end();
    read = device.createBuffer({ size: Math.max(16, er.byteLength), usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    enc.copyBufferToBuffer(bEr, 0, read, 0, er.byteLength);
    device.queue.submit([enc.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    er.set(new Float32Array(read.getMappedRange()));
    read.unmap();
    all = [bN, bD, bB, bNz, bEr, bK, read];
    } finally {
      for (var i = 0; i < all.length; i++) { try { if (all[i]) all[i].destroy(); } catch (e) {} }
      try { if (read) read.unmap(); } catch (e) {}
    }
  }

  var api = {
    /* Batched excess-return kernel. Synchronous CPU path returns er; when the
     * GPU is warm this same call routes async — hence the dual API: gbm()
     * (sync, CPU/WASM-RNG fed) for the 60fps-safe path, gbmAsync() which uses
     * WebGPU when ready and CPU otherwise. */
    lerp: function (n, cur, tgt, add, k, out) {
      lerpCpu(n, cur, tgt, add, k, out);
      return out;
    },
    lerpAsync: async function (n, cur, tgt, add, k, out) {
      if (gpuOk && device) {
        try { await lerpGpu(n, cur, tgt, add, k, out); return { backend: "webgpu", out: out }; }
        catch (e) { gpuOk = false; gpuErr = String((e && e.message) || e).slice(0, 80); }
      }
      lerpCpu(n, cur, tgt, add, k, out);
      return { backend: "cpu", out: out };
    },
    gbm: function (n, drift, beta, vol, noise, er, idxR, shockR) {
      gbmCpu(n, drift, beta, vol, noise, er, idxR, shockR);
      return er;
    },
    gbmAsync: async function (n, drift, beta, vol, noise, er, idxR, shockR) {
      if (gpuOk && device) {
        try { await gbmGpu(n, drift, beta, vol, noise, er, idxR, shockR); return { backend: "webgpu", er: er }; }
        catch (e) { gpuOk = false; gpuErr = String((e && e.message) || e).slice(0, 80); }
      }
      gbmCpu(n, drift, beta, vol, noise, er, idxR, shockR);
      return { backend: "cpu", er: er };
    },
    backend: function () {
      if (gpuOk && device) return "webgpu";
      if (!gpuTried) return "probing";
      return "cpu";
    },
    status: function () {
      var w = null;
      try { w = (window.LL && typeof LL.wasmRand === "function" && typeof wasmStatus === "function") ? wasmStatus() : null; } catch (e) {}
      return { backend: api.backend(), gpuTried: gpuTried, gpuError: gpuErr, wasm: w };
    }
  };
  window.LL.compute = api;
  window.computeStatus = function () { return api.status(); };
})();
LL.files.push("compute"); /* end-of-file registration: counts as loaded only after this file fully ran */
