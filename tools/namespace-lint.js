/* LIFE & LEGACY — src/tools/namespace-lint.js
 * Cross-file global-namespace lint (worker with workspace fs; no DOM).
 *
 * WHY: all engine files are classic scripts sharing one global namespace.
 * A misspelled or moved function name (the randName crash: sex-events called
 * a global that existed nowhere) fails only at runtime, on a rare path.
 * This lint proves statically that every bare global call in every engine
 * file resolves to a declaration somewhere in the engine tree.
 *
 * HOW TO RUN:
 *   const code = await fs.readTextFile('src/tools/namespace-lint.js');
 *   const lint = new Function('fs', code + '\nreturn namespaceLint;')(fs);
 *   const rep = await lint({writeReport:true});
 *
 * Checks:
 *   1. unresolved: bare NAME(...) calls that are declared in NO engine file
 *      (not a top-level var/function, window.X attach, EXPECT_GLOBALS entry,
 *      builtin, or file-local). Any hit is a randName-class runtime crash.
 *   2. duplicates: the same top-level var/function declared in 2+ files
 *      (silent last-wins collisions).
 *   3. llMembers: LL.NAME reads where NAME is never assigned on LL anywhere
 *      (dead namespace reads).
 *
 * Conventions honored: IIFE-wrapped files (depth>0 decls are scoped, never
 * global); string/comment stripping before scanning (same stripper as
 * typo-scan); arrow/catch params count as file-local; EXPECT_GLOBALS in
 * boot.js is parsed as declared (boot asserts them at runtime).
 */
"use strict";
async function namespaceLint(opts) {
  opts = opts || {};
  var KEYWORDS = { "if":1,"else":1,"for":1,"while":1,"do":1,"switch":1,"case":1,"catch":1,
    "finally":1,"return":1,"typeof":1,"new":1,"delete":1,"void":1,"in":1,"of":1,
    "instanceof":1,"function":1,"var":1,"let":1,"const":1,"with":1,"debugger":1,
    "break":1,"continue":1,"throw":1,"export":1,"import":1,"class":1,"extends":1,
    "super":1,"this":1,"true":1,"false":1,"null":1,"undefined":1,"arguments":1,
    "async":1,"await":1,"yield":1,"static":1,"get":1,"set":1 };
  // JS builtins + browser/DOM + engine-host surface usable as bare names.
  var BUILTINS = ("setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame," +
    "cancelAnimationFrame,requestIdleCallback,fetch,Headers,Request,Response,JSON,Math,Object," +
    "Array,String,Number,Boolean,Date,RegExp,Error,TypeError,RangeError,SyntaxError,Promise," +
    "Map,Set,WeakMap,WeakSet,Symbol,BigInt,Proxy,Reflect,Intl,WebAssembly,Audio,AudioContext," +
    "OfflineAudioContext,Blob,File,FileReader,URL,URLSearchParams,FormData,Worker,MessageChannel," +
    "TextEncoder,TextDecoder,DOMParser,XMLSerializer,localStorage,sessionStorage,indexedDB," +
    "document,window,navigator,location,history,screen,performance,crypto,getComputedStyle," +
    "IntersectionObserver,MutationObserver,ResizeObserver,CustomEvent,Event,KeyboardEvent," +
    "MouseEvent,TouchEvent,PointerEvent,HTMLElement,Element,Node,NodeList,DocumentFragment," +
    "alert,confirm,prompt,open,close,scrollTo,scrollBy,addEventListener,removeEventListener," +
    "dispatchEvent,parseInt,parseFloat,isNaN,isFinite,encodeURI,encodeURIComponent,decodeURI," +
    "decodeURIComponent,escape,unescape,btoa,atob,structuredClone,queueMicrotask,postMessage," +
    "importScripts,console,root,LL,LLW,I18N,define,AbortController,matchMedia,Image,OffscreenCanvas," +
    "Path2D,ArrayBuffer,SharedArrayBuffer,DataView,Uint8Array,Uint16Array,Uint32Array,Int8Array," +
    "Int16Array,Int32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array,AudioBuffer," +
    "CanvasGradient,DOMException,FormData,FileList,DragEvent,WheelEvent,FocusEvent,InputEvent," +
    "SubmitEvent,MediaError,TimeRanges,TextTrack,WebGLRenderingContext,WebGL2RenderingContext," +
    "GPUDevice,GPUAdapter,ReadableStream,WritableStream,TransformStream,CompressionStream," +
    "DecompressionStream,BroadcastChannel,WorkerGlobalScope,Notification,performance").split(",");
  var BUILTIN = {}; BUILTINS.forEach(function (b) { BUILTIN[b] = 1; });
  function strip(src) {
    // Removes comments + string contents (keeps newlines so line numbers hold).
    // Also blanks regex literals: without this, a pattern like /(\w+)|"(/"/
    // scans as code, and a quote inside a regex starts a fake string that
    // swallows newlines and shifts every later line number.
    var out = "", n = src.length, k = 0, mode = null;
    var prevSig = ""; // last significant code char emitted (for regex-vs-divide)
    var prevWord = ""; // last identifier word emitted (keywords force regex)
    var REGEX_KEYWORDS = { "return":1,"typeof":1,"instanceof":1,"in":1,"of":1,
      "new":1,"delete":1,"void":1,"throw":1,"case":1,"do":1,"else":1,"yield":1,
      "await":1 };
    function isRegexStart() {
      // A '/' opens a regex unless it follows a value: identifier, number,
      // string-close, regex-close, ')' or ']'. After a keyword (return,
      // typeof, ...) a '/' always opens a regex.
      if (REGEX_KEYWORDS[prevWord]) return true;
      if (!prevSig) return true;
      if (/[A-Za-z0-9_$)"'\]]/.test(prevSig)) return false;
      return true;
    }
    function emitWordChar(c) {
      out += c; prevSig = c;
      if (/[A-Za-z0-9_$]/.test(c)) prevWord += c; else prevWord = "";
    }
    while (k < n) {
      var c = src[k], d = src[k + 1];
      if (mode === null) {
        if (c === "/" && d === "/") { mode = "line"; k += 2; continue; }
        if (c === "/" && d === "*") { mode = "block"; k += 2; continue; }
        if (c === "'" || c === '"' || c === "`") { mode = c; out += "\""; k++; continue; }
        if (c === "/" && isRegexStart()) {
          // blank the whole regex literal, keep newlines (none expected)
          out += " "; k++;
          var inClass = false;
          while (k < n) {
            var e = src[k];
            if (e === "\\") { k += 2; continue; }
            if (e === "[") inClass = true;
            else if (e === "]") inClass = false;
            else if (e === "/" && !inClass) break;
            else if (e === "\n") out += "\n";
            k++;
          }
          out += " "; // for the closing '/'
          if (k < n) k++;
          while (k < n && /[gimsuy]/.test(src[k])) k++; // flags
          prevSig = "\""; // a regex literal is a value, like a string
          continue;
        }
        out += c;
        if (c === " " || c === "\t" || c === "\n" || c === "\r") { k++; continue; }
        prevSig = c;
        if (/[A-Za-z0-9_$]/.test(c)) prevWord += c; else prevWord = "";
        k++; continue;
      }
      if (mode === "line") { if (c === "\n") { mode = null; out += "\n"; } k++; continue; }
      if (mode === "block") {
        // preserve newlines so stripped line numbers match the source
        if (c === "*" && d === "/") { mode = null; k += 2; }
        else { if (c === "\n") out += "\n"; k++; }
        continue;
      }
      if (c === "\\") { k += 2; continue; }
      if (c === mode) { mode = null; out += "\""; k++; prevSig = "\""; continue; }
      if (c === "\n") out += "\n";
      k++;
    }
    return out;
  }
  function stripBraces(seg) {
    // remove balanced {...} spans (object literals / bodies) so a later
    // declarator (`, y = 2`) isn't hidden inside an earlier value.
    var out = "", d = 0;
    for (var i = 0; i < seg.length; i++) {
      var c = seg[i];
      if (c === "{") { d++; continue; }
      if (c === "}") { if (d > 0) { d--; continue; } }
      if (d === 0) out += c;
    }
    return out;
  }
  function declarators(seg, into) {
    // Every top-level comma-chunk contributes its head identifier as a
    // binding: `var stopped = false, curStop = null` binds BOTH names.
    // A segment that OPENS with { or [ is destructuring: the depth-1
    // bindings count ({to, from}, [a, b=1]); property keys ({a: 1}) are
    // skipped by requiring the name NOT be followed by ':'.
    var destructure = /^\s*[\{\[]/.test(seg);
    var body = destructure ? seg : stripBraces(seg);
    var depth = 0, cur = "";
    function flush() {
      var m = /^\s*[\{\[]?\s*([A-Za-z_$][A-Za-z0-9_$]*)/.exec(cur);
      if (m && !KEYWORDS[m[1]]) {
        if (!destructure) { into.push(m[1]); }
        else {
          var rest = cur.slice(m[0].length);
          if (!/^\s*:/.test(rest)) into.push(m[1]);
        }
      }
      cur = "";
    }
    for (var i = 0; i < body.length; i++) {
      var c = body[i];
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth--;
      if (c === "," && depth === 0) { flush(); continue; }
      cur += c;
    }
    flush();
  }
  var files = (await fs.listFiles()).map(function (f) { return f.path; })
    .filter(function (p) { return p.indexOf("src/engine/") === 0 && p.slice(-3) === ".js"; }).sort();
  // Column-accurate brace depth: single-line functions
  // (`function sexE(S){...var i=0...}` all on one line) put declarations at
  // depth>0 even though the LINE starts at depth 0. Strings/comments/regex
  // are already blanked, so every { and } here is real code.
  function depthAt(line, idx, base) {
    var dd = base;
    // NOTE q <= idx (not <): the var/function delimiter itself is usually the
    // opening brace (`function f(){ var j...}`) and must be counted.
    for (var q = 0; q <= idx && q < line.length; q++) {
      if (line[q] === "{") dd++;
      else if (line[q] === "}") dd--;
    }
    return dd < 0 ? 0 : dd;
  }
  var perFile = {};   // path -> { top:{}, local:{}, calls:[{name,line}], llReads:[{name,line}] }
  var globalTop = {}; // name -> [paths declaring it at top level]
  var windowSet = {}; // window.X attaches anywhere
  var llSet = {};     // LL.X / LLW.X assignments anywhere
  var bootExpect = [];
  files.forEach(function (p) { perFile[p] = { top: {}, local: {}, calls: [], llReads: [] }; });
  for (var fi = 0; fi < files.length; fi++) {
    var path = files[fi], PF = perFile[path];
    var code = strip(await fs.readTextFile(path));
    // boot.js EXPECT_GLOBALS / EXPECT_LL: runtime-asserted, count as declared
    if (/boot\.js$/.test(path)) {
      var eg = /EXPECT_GLOBALS\s*=\s*\[([\s\S]*?)\]/.exec(code);
      if (eg) { var q = /"([^"]+)"/g, m; while ((m = q.exec(eg[1]))) bootExpect.push(m[1]); }
      var el = /EXPECT_LL\s*=\s*\[([\s\S]*?)\]/.exec(code);
      if (el) { var q2 = /"([^"]+)"/g, m2; while ((m2 = q2.exec(el[1]))) llSet[m2[1]] = 1; }
    }
    var lines = code.split("\n"), depth = 0, inVar = false, varBuf = "", varTopDepth = 0;
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li], startDepth = depth;
      if (!inVar) {
        // var/let/const at line start OR mid-line after ; { } ( ) —
        // (covers `if(...)var x=...` and `for(var i...`; the RANDNAME ALIAS
        //  in sex-events.js lives mid-line and must count as declared)
        var vm2, vseg = /(^|[;{}()])\s*(var|let|const)\s+([^;{}]+)/g;
        while ((vm2 = vseg.exec(line))) {
          var names = []; declarators(vm2[3].split(";")[0], names);
          var dd = depthAt(line, vm2.index, startDepth);
          names.forEach(function (n) {
            PF.local[n] = 1;
            if (dd === 0) { PF.top[n] = 1; (globalTop[n] = globalTop[n] || []).push(path + ":" + (li + 1)); }
          });
        }
        // Continuation trigger only (same-line names are handled by the
        // mid-line loop above): a var/let/const with no ';' after it spans
        // onto following lines — accumulate until the ';' (inVar branch).
        var vk = /(^|[;{}()])\s*(var|let|const)\s+/.exec(line);
        if (vk && !inVar && line.indexOf(";", vk.index) < 0) {
          varBuf = line.slice(vk.index + vk[0].length); inVar = true;
          varTopDepth = depthAt(line, vk.index, startDepth);
        }
        var fm = /^\s*(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/.exec(line);
        if (fm && depthAt(line, fm.index, startDepth) === 0) {
          PF.top[fm[1]] = 1;
          (globalTop[fm[1]] = globalTop[fm[1]] || []).push(path + ":" + (li + 1));
        }
        var fall = /[^\w$](?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/g, mf;
        while ((mf = fall.exec(line))) PF.local[mf[1]] = 1;
        if (fm) PF.local[fm[1]] = 1;
        // implicit top-level assignment: NAME = ... (classic-script global)
        var am = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=(?![=>])/.exec(line);
        if (am && !KEYWORDS[am[1]] && depthAt(line, am.index, startDepth) === 0) {
          PF.top[am[1]] = 1; (globalTop[am[1]] = globalTop[am[1]] || []).push(path + ":" + (li + 1));
        }
      } else {
        varBuf += "\n" + line;
        if (line.indexOf(";") >= 0) {
          var names2 = []; declarators(varBuf.split(";")[0], names2); inVar = false; varBuf = "";
          names2.forEach(function (n) {
            PF.local[n] = 1;
            if (varTopDepth === 0) { PF.top[n] = 1; (globalTop[n] = globalTop[n] || []).push(path + ":" + (li + 1)); }
          });
        }
      }
      // params: function f(a, b={}) / (a,b) => / x => / catch (e)
      var pm, pre;
      pre = /function\s*[A-Za-z_$0-9]*\s*\(([^)]*)\)/g;
      while ((pm = pre.exec(line))) pm[1].split(",").forEach(function (pp) {
        var id = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)/.exec(pp); if (id) PF.local[id[1]] = 1;
      });
      pre = /\(([^()]*)\)\s*=>/g;
      while ((pm = pre.exec(line))) pm[1].split(",").forEach(function (pp) {
        var id2 = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)/.exec(pp); if (id2) PF.local[id2[1]] = 1;
      });
      pre = /(?:^|[^\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*=>/g;
      while ((pm = pre.exec(line))) { if (!KEYWORDS[pm[1]]) PF.local[pm[1]] = 1; }
      pre = /catch\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/g;
      while ((pm = pre.exec(line))) PF.local[pm[1]] = 1;
      // window.X / LL.X assignments
      var wm = /(^|[^\w$])window\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g, mw;
      while ((mw = wm.exec(line))) windowSet[mw[2]] = 1;
      var lm = /(^|[^\w$])LLW?\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g, ml;
      while ((ml = lm.exec(line))) llSet[ml[2]] = 1;
      // LL seed-initializer keys: window.LL=(window.LL||{v:1,files:[]}) — the
      // object-literal members are real LL members, never "LL.X =" assigned.
      // (Fallback may be a bare literal OR a (window.LL={...}) assignment.)
      var lre = /(?:window\.)?LL\s*=\s*\(\s*(?:window\.)?LL\s*\|\|\s*(?:\(?\s*(?:window\.)?LL\s*=\s*)?\{([^}]*)\}/g, mi;
      var mInit;
      while ((mInit = lre.exec(line))) {
        var keys = mInit[1].split(","), kk;
        for (kk = 0; kk < keys.length; kk++) {
          var km = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(keys[kk]);
          if (km) llSet[km[1]] = 1;
        }
      }
      // LL.X reads (member access, not assignment)
      var lr = /(^|[^\w$])LLW?\.([A-Za-z_$][A-Za-z0-9_$]*)/g, rl;
      while ((rl = lr.exec(line))) {
        // skip the assignment target itself (collected above as llSet)
        var rest = line.slice(rl.index + rl[0].length);
        if (/^\s*=(?![=>])/.test(rest)) continue;
        PF.llReads.push({ name: rl[2], line: li + 1 });
      }
      // bare calls NAME(
      var cm = /(^|[^\w$.])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g, mc;
      while ((mc = cm.exec(line))) {
        var nm = mc[2];
        if (KEYWORDS[nm]) continue;
        var before = line.slice(Math.max(0, mc.index - 9), mc.index + 1);
        if (/function\s*$/.test(before)) continue;      // function declaration
        if (/(^|[^\w$])(new|typeof|instanceof|in|of)\s+$/.test(before)) { if (nm !== "Function" || true) { /* new X() still a global ref */ } }
        PF.calls.push({ name: nm, line: li + 1 });
      }
      for (var ci = 0; ci < line.length; ci++) {
        if (line[ci] === "{") depth++;
        else if (line[ci] === "}") depth--;
      }
      if (depth < 0) depth = 0;
    }
  }
  bootExpect.forEach(function (n) { windowSet[n] = 1; });
  var unresolved = [], duplicates = [], llMissing = [];
  Object.keys(globalTop).forEach(function (n) {
    // cross-FILE collisions only (same-file `var` redeclaration is legal and
    // harmless); need two distinct files, not two hits in one file.
    var seenF = {}, files2 = [];
    globalTop[n].forEach(function (loc) {
      var f = loc.split(":")[0];
      if (!seenF[f]) { seenF[f] = 1; files2.push(f); }
    });
    if (files2.length > 1) {
      var short = files2.map(function (p) { return p.split("/").pop(); });
      duplicates.push(n + " declared in: " + short.join(", ") + "  [" + globalTop[n].join(" | ") + "]");
    }
  });
  Object.keys(perFile).forEach(function (p) {
    var PF = perFile[p], seen = {}, short = p.split("/").pop();
    PF.calls.forEach(function (c) {
      if (seen[c.name]) return; seen[c.name] = 1;
      if (PF.local[c.name] || PF.top[c.name]) return;      // file-local
      if (globalTop[c.name] || windowSet[c.name] || BUILTIN[c.name]) return;
      unresolved.push(short + ":" + c.line + " calls undeclared global " + c.name + "()");
    });
    var lseen = {};
    PF.llReads.forEach(function (r) {
      if (lseen[r.name]) return; lseen[r.name] = 1;
      if (!llSet[r.name]) llMissing.push(short + ":" + r.line + " reads LL." + r.name + " (never assigned on LL)");
    });
  });
  var report = { files: files.length, unresolved: unresolved, duplicates: duplicates, llMissing: llMissing };
  if (opts.writeReport) await fs.writeTextFile("scratch/namespace-report.json", JSON.stringify(report, null, 1));
  return report;
}
