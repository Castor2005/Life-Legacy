/* LIFE & LEGACY — engine/vfx.js
 * Presentation-only juice layer: ambient canvas, SFX, tilt, counters.
 * Split-safe classic script: shared globals ($, toast, fmt$, netWorth...).
 * Load order = index.html order (last engine file, before boot). Registered
 * in LL.files + boot EXPECT_FILES/EXPECT_GLOBALS. vfxInit() is called from
 * boot init; every sub-system guards itself and never throws.
 *
 * COMPATIBILITY CONTRACT (do not break):
 * - No perchance template changes, no update() calls, no S mutation.
 * - No localStorage keys except ll_sfx (SFX toggle). Saves untouched.
 * - Canvas is fixed, z-index -1, pointer-events none — purely decorative.
 * - All motion respects prefers-reduced-motion + document.hidden.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });

/* ============ tiny label helper (slot-roll safe textContent) ============ */
/* applyTexts()/toggleArt() rewrite labels via textContent, which would wipe
 * the duplicated .rl spans used for the slot-machine hover roll. setLabel()
 * writes into both roll copies when present, else falls back to textContent. */
function setLabel(id, txt) {
  var e = null;
  try { e = $(id); } catch (err) { return; }
  if (!e) return;
  var kids = e.querySelectorAll ? e.querySelectorAll(".rl-a,.rl-b") : [];
  if (kids && kids.length) {
    for (var i = 0; i < kids.length; i++) kids[i].textContent = txt;
  } else {
    e.textContent = txt;
  }
}

/* ============ procedural UI sound effects (Web Audio, zero deps) ============ */
var sfxCtx = null, sfxOn = true, waveT = 0;
try { sfxOn = !(window.localStorage && window.localStorage.getItem("ll_sfx") === "0"); }
catch (e) { sfxOn = true; }
function sfxEnabled() { return sfxOn; }
function toggleSfx() {
  sfxOn = !sfxOn;
  try {
    if (window.localStorage) {
      if (sfxOn) window.localStorage.removeItem("ll_sfx");
      else window.localStorage.setItem("ll_sfx", "0");
    }
  } catch (e) {}
  var b = null;
  try { b = $("sfxBtn"); } catch (e) {}
  if (b) { b.textContent = sfxOn ? "🔊" : "🔇"; b.title = sfxOn ? "UI sounds on" : "UI sounds off"; }
  if (sfxOn) sfx("good");
  try { waveKick(); } catch (e) {}
  return sfxOn;
}
function sfxTone(f0, f1, dur, type, vol, when) {
  if (!sfxOn) return;
  try {
    if (!sfxCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      sfxCtx = new AC();
    }
    if (sfxCtx.state === "suspended") sfxCtx.resume();
    var t = sfxCtx.currentTime + (when || 0);
    var o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxCtx.destination);
    o.start(t); o.stop(t + dur + 0.02);
    waveKick();
  } catch (e) {}
}
/* ---- file-based SFX bank (ships offline in src/audio/sfx/*.mp3) ----
 * Real recorded-style blips/chimes/stings beat raw oscillators, and because
 * they live in src/ they play even with no network. Loaded lazily (fetch +
 * decode), played through the shared AudioContext so overlapping sounds mix.
 * Anything missing falls through to the synth below — never silent, never
 * throws. Add a sound: drop NAME.mp3 in src/audio/sfx/ + list it here.
 * Bank format: MP3 80kbps mono @22050Hz (pro-game UI recipe — tiny files;
 * gapless-aware decoders trim the encoder delay, the synth below covers any
 * decoder that can't). */
var SFX_FILES = ["click","hover","open","close","good","bad","coin","age","birth","death","dice","notify"];
/* Encoder delay the MP3 bank carries (measured per file at encode time, seconds).
 * Our bank ships WITHOUT a LAME gapless tag (smaller files), so no decoder can
 * trim it — the offset is the same in every browser and is skipped at play time
 * (non-destructive: masters stay intact). Without this, every blip would start
 * ~50ms late. */
var SFX_TRIM = {click:0.05, hover:0.05, open:0.05, close:0.05, good:0.05, bad:0.05, coin:0.05, age:0.05, birth:0.05, death:0.05, dice:0.042, notify:0.05};
var sfxBank = {}, sfxBankState = "idle";
function sfxBankEnsure() {
  if (sfxBankState !== "idle") return sfxBankState;
  sfxBankState = "loading";
  try {
    if (!sfxCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) sfxCtx = new AC(); }
    var rest = SFX_FILES.slice();
    (function next() {
      if (!rest.length) { sfxBankState = "ready"; return; }
      var name = rest.shift();
      try {
        fetch("src/audio/sfx/" + name + ".mp3").then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          return r.arrayBuffer();
        }).then(function (ab) {
          try { sfxCtx.decodeAudioData(ab, function (buf) { sfxBank[name] = buf; next(); }, function () { next(); }); }
          catch (e) { next(); }
        }).catch(function () { next(); });
      } catch (e) { next(); }
    })();
  } catch (e) { sfxBankState = "failed"; }
  return sfxBankState;
}
function sfxPlayBuf(name) {
  try {
    var buf = sfxBank[name];
    if (!buf) return false;
    if (!sfxCtx) { var AC2 = window.AudioContext || window.webkitAudioContext; if (!AC2) return false; sfxCtx = new AC2(); }
    if (sfxCtx.state === "suspended") sfxCtx.resume();
    var src = sfxCtx.createBufferSource(); src.buffer = buf;
    var g = sfxCtx.createGain(); g.gain.value = (name === "hover") ? 0.5 : 0.9;
    src.connect(g); g.connect(sfxCtx.destination);
    var trim = SFX_TRIM[name] || 0;
    if (trim > 0 && buf.duration > trim + 0.03) { try { src.start(0, trim); } catch (e) { try { src.start(); } catch (e2) {} } }
    else src.start();
    waveKick();
    return true;
  } catch (e) { return false; }
}
function sfxBankStatus() {
  return { state: sfxBankState, loaded: Object.keys(sfxBank).length, files: SFX_FILES.length };
}
function sfx(name) {
  if (!sfxOn) return;
  try { if (sfxPlayBuf(name)) return; } catch (e) {}
  try {
    if (name === "click") sfxTone(700, 700, 0.05, "sine", 0.035, 0);
    else if (name === "good") { sfxTone(523, 523, 0.1, "sine", 0.045, 0); sfxTone(784, 784, 0.14, "sine", 0.04, 0.07); }
    else if (name === "bad") sfxTone(180, 140, 0.12, "square", 0.025, 0);
    else if (name === "age") sfxTone(300, 640, 0.16, "sine", 0.04, 0);
  } catch (e) {}
}
/* tiny waveform indicator in the topbar: brief bars on every blip */
function waveKick() { waveT = 14; }
function waveTick() {
  var c = null;
  try { c = $("sfxWave"); } catch (e) { return; }
  if (!c || !c.getContext) return;
  var x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  x.fillStyle = "#c9a45c";
  var mid = c.height / 2;
  if (waveT > 0) {
    waveT--;
    for (var i = 0; i < 9; i++) {
      var h = 1 + Math.abs(Math.sin(i * 1.7 + waveT * 0.9)) * (mid - 1) * (waveT / 14);
      x.fillRect(2 + i * 4, mid - h / 2, 2, h);
    }
  } else {
    x.fillRect(2, mid, c.width - 4, 1);
  }
}

/* ============ odometer count-up (observer-triggered, stable moments) ============ */
function countUp(el, target, fmtFn) {
  if (!el || typeof target !== "number" || !isFinite(target)) return;
  try {
    var dur = 900, t0 = null;
    function fmt(n) {
      try { return fmtFn ? fmtFn(n) : String(Math.round(n)); }
      catch (e) { return String(Math.round(n)); }
    }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      k = 1 - Math.pow(1 - k, 3);
      try { el.textContent = fmt(target * k); } catch (e) {}
      if (k < 1) requestAnimationFrame(step);
    }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt(target);
      return;
    }    requestAnimationFrame(step);
  } catch (e) {}
}
var vfxCountedLife = "";
function vfxCountUpDeath() {
  try {
    var h = document.querySelector("#deathHero h1");
    if (!h || h.dataset.vfxDone) return;
    h.dataset.vfxDone = "1";
    var m = String(h.textContent).match(/[\d,]+/);
    if (!m) return;
    var target = parseInt(m[0].replace(/,/g, ""), 10);
    if (!target) return;
    countUp(h, target, function (n) { return "⭐ " + Math.round(n); });
  } catch (e) {}
}
function vfxCountUpMoney() {
  try {
    if (typeof S === "undefined" || !S) return;
    var key = S.firstName + "|" + S.birthYear + "|" + S.age;
    if (vfxCountedLife === key) return;
    vfxCountedLife = key;
    var chip = document.querySelector("#moneyLine .chip");
    if (!chip) return;
    var neg = S.money < 0, debt = S.debt || 0;
    countUp(chip, S.money, function (n) {
      var body = "";
      try { body = fmt$(Math.round(n)); } catch (e) { body = String(Math.round(n)); }
      return (neg ? "💸 " : "💵 ") + body + (debt > 0 ? " (debt " + fmt$(debt) + ")" : "");
    });
  } catch (e) {}
}

/* ============ ambient canvas backdrop (lightweight flow-field) ============ */
var vfxCanvas = null, vfxCtx2d = null, vfxParts = [], vfxRings = [];
var vfxMouse = { x: -9999, y: -9999 }, vfxEnergy = 0, vfxRunning = false;
var vfxScrollY = -1, vfxPal = null, vfxPalTarget = null, vfxDegraded = 0;
var vfxT = 0;
function vfxCssVar(name) {
  try {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || "";
  } catch (e) { return ""; }
}
function vfxParseColor(s) {
  try {
    s = String(s).trim();
    var m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16) };
    m = s.match(/^#([0-9a-f]{3})$/i);
    if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16) };
  } catch (e) {}
  return null;
}
function vfxReadPalette() {
  var acc = vfxParseColor(vfxCssVar("--acc")) || { r: 124, g: 108, b: 255 };
  var acc2 = vfxParseColor(vfxCssVar("--acc2")) || { r: 61, g: 218, b: 215 };
  var gold = vfxParseColor(vfxCssVar("--gold")) || { r: 201, g: 164, b: 92 };
  return [acc, acc2, gold];
}
function vfxResize() {
  if (!vfxCanvas) return;
  try {
    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 640 ? 1 : 1.5);
    vfxCanvas.width = Math.floor(window.innerWidth * dpr);
    vfxCanvas.height = Math.floor(window.innerHeight * dpr);
  } catch (e) {}
}
function vfxSeed() {
  vfxParts = [];
  var area = window.innerWidth * window.innerHeight;
  var n = Math.round(area / 16000);
  n = Math.max(28, Math.min(window.innerWidth < 640 ? 36 : 88, n));
  if (vfxDegraded >= 2) n = Math.round(n / 4);
  else if (vfxDegraded === 1) n = Math.round(n / 2);
  for (var i = 0; i < n; i++) {
    vfxParts.push({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      vx: 0, vy: 0, c: i % 3, s: 0.8 + Math.random() * 1.8, a: 0.25 + Math.random() * 0.5
    });
  }
}
function vfxPulse(x, y, strength) {
  try {
    vfxEnergy = Math.min(1.6, vfxEnergy + (strength || 0.7));
    if (x !== undefined && vfxRings.length < 12) vfxRings.push({ x: x, y: y, r: 6, a: 0.5 });
  } catch (e) {}
}
function vfxFrame(ts) {
  if (!vfxRunning || !vfxCtx2d) return;
  var dt = 16, now = (typeof performance !== "undefined" ? performance.now() : 0);
  vfxFrame._last = vfxFrame._last || now;
  var real = now - vfxFrame._last;
  vfxFrame._last = now;
  vfxFrame._ema = (vfxFrame._ema || 16) * 0.95 + Math.min(100, real) * 0.05;
  if (vfxFrame._ema > 27 && vfxFrame._n > 120 && vfxDegraded < 2) {
    vfxDegraded++;
    vfxFrame._n = 0;
    vfxSeed();
  }
  vfxFrame._n = (vfxFrame._n || 0) + 1;
  vfxT += 0.016;
  try {
    var w = window.innerWidth, h = window.innerHeight, ctx = vfxCtx2d;
    var dpr = Math.min(window.devicePixelRatio || 1, w < 640 ? 1 : 1.5);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var i, p;
    for (i = 0; i < 3; i++) {
      var c = vfxPal[i], t = vfxPalTarget[i];
      c.r += (t.r - c.r) * 0.04; c.g += (t.g - c.g) * 0.04; c.b += (t.b - c.b) * 0.04;
    }
    vfxEnergy *= 0.94;
    var desktop = w >= 640;
    ctx.globalCompositeOperation = desktop ? "lighter" : "source-over";
    for (i = 0; i < vfxParts.length; i++) {
      p = vfxParts[i];
      var ang = Math.sin(p.x * 0.0021 + vfxT * 0.35) + Math.cos(p.y * 0.0023 - vfxT * 0.27);
      p.vx += Math.cos(ang) * 0.06;
      p.vy += Math.sin(ang) * 0.06;
      var dx = p.x - vfxMouse.x, dy = p.y - vfxMouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 20000 && d2 > 100) {
        var d = Math.sqrt(d2), f = (1 - d / 142) * (0.5 + vfxEnergy);
        p.vx += (dx / d) * f * 0.5; p.vy += (dy / d) * f * 0.5;
      }
      p.vx *= 0.96; p.vy *= 0.96;
      p.x += p.vx * (1 + vfxEnergy); p.y += p.vy * (1 + vfxEnergy);
      if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
      var cc = vfxPal[p.c];
      ctx.globalAlpha = Math.min(0.8, p.a * (0.55 + vfxEnergy * 0.6));
      ctx.fillStyle = "rgb(" + (cc.r | 0) + "," + (cc.g | 0) + "," + (cc.b | 0) + ")";
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    for (i = vfxRings.length - 1; i >= 0; i--) {
      var r = vfxRings[i];
      r.r += 3 + vfxEnergy * 2; r.a *= 0.93;
      if (r.a < 0.02) { vfxRings.splice(i, 1); continue; }
      ctx.globalAlpha = r.a;
      ctx.strokeStyle = "rgb(" + (vfxPal[2].r | 0) + "," + (vfxPal[2].g | 0) + "," + (vfxPal[2].b | 0) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    waveTick();
  } catch (e) {}
  if (vfxRunning) requestAnimationFrame(vfxFrame);
}
function vfxStartCanvas() {
  if (vfxRunning) return;
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    vfxCanvas = document.getElementById("fxCanvas");
    if (!vfxCanvas || !vfxCanvas.getContext) return;
    vfxCtx2d = vfxCanvas.getContext("2d");
    vfxPal = vfxReadPalette();
    vfxPalTarget = vfxReadPalette();
    vfxSeed();
    vfxResize();
    vfxRunning = true;
    requestAnimationFrame(vfxFrame);
  } catch (e) { vfxRunning = false; }
}

/* ============ scroll progress bar ============ */
function vfxScroll() {
  try {
    var bar = document.getElementById("scrollProg");
    if (!bar) return;
    var y = window.scrollY || window.pageYOffset || 0;
    if (vfxScrollY >= 0) vfxEnergy = Math.min(1.6, vfxEnergy + Math.min(0.5, Math.abs(y - vfxScrollY) / 900));
    vfxScrollY = y;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    bar.style.width = (Math.min(1, y / max) * 100).toFixed(2) + "%";
  } catch (e) {}
}

/* ============ 3D tilt on cards (fine pointers only) ============ */
function vfxTiltInit() {
  try {
    if (window.matchMedia && (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches)) return;
    var cur = null;
    document.addEventListener("mousemove", function (e) {
      var card = e.target && e.target.closest ? e.target.closest(".card") : null;
      if (cur && cur !== card) { cur.style.transform = ""; cur = null; }
      if (!card || card.closest(".overlay")) return;
      var r = card.getBoundingClientRect();
      if (!r.width) return;
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "perspective(950px) rotateX(" + (-py * 4).toFixed(2) +
        "deg) rotateY(" + (px * 4).toFixed(2) + "deg)";
      cur = card;
    }, { passive: true });
    document.addEventListener("mouseleave", function () {
      if (cur) { try { cur.style.transform = ""; } catch (e) {} cur = null; }
    }, { passive: true });
  } catch (e) {}
}

/* ============ view-change pulses (observer — no game-logic edits) ============ */
function vfxWatchScreens() {
  try {
    var screens = ["startScreen", "gameScreen", "deathScreen"];
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var el = muts[i].target;
        if (el.classList && !el.classList.contains("hidden")) {
          vfxPulse(window.innerWidth / 2, window.innerHeight * 0.35, 1.1);
          if (el.id === "deathScreen") setTimeout(vfxCountUpDeath, 120);
          if (el.id === "gameScreen") setTimeout(vfxCountUpMoney, 120);
        }
      }
    });
    screens.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
    try {
      var de = document.documentElement;
      new MutationObserver(function () { try { vfxPalTarget = vfxReadPalette(); } catch (e) {} })
        .observe(de, { attributes: true, attributeFilter: ["data-theme"] });
    } catch (e) {}
  } catch (e) {}
}

/* ============ init ============ */
function vfxInit() {
  try { vfxStartCanvas(); } catch (e) {}
  try {
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.addEventListener("resize", function () { vfxResize(); vfxSeed(); }, { passive: true });
    window.addEventListener("scroll", vfxScroll, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { vfxRunning = false; }
      else if (!vfxRunning && !reduced && vfxCtx2d) {
        vfxRunning = true;
        requestAnimationFrame(vfxFrame);
      }
    });
    document.addEventListener("pointermove", function (e) {
      vfxMouse.x = e.clientX; vfxMouse.y = e.clientY;
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches[0]) { vfxMouse.x = e.touches[0].clientX; vfxMouse.y = e.touches[0].clientY; }
    }, { passive: true });
    /* hover ticks on interactive controls (throttled, never blocks) */
    var hoverT = 0;
    document.addEventListener("mouseover", function (e) {
      try {
        var now = Date.now();
        if (now - hoverT < 90) return;
        var t = e.target && e.target.closest ? e.target.closest("button,.tab,.choice") : null;
        if (!t || t.disabled) return;
        hoverT = now;
        sfx("hover");
      } catch (err) {}
    }, { passive: true });
    /* tactile clicks: blip + pulse on interactive controls (never blocks) */
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("button") : null;
      if (!t || t.disabled) return;
      try {
        if (t.id === "ageBtn") sfx("age"); else sfx("click");
        vfxPulse(e.clientX, e.clientY, t.classList.contains("choice") ? 0.9 : 0.45);
      } catch (err) {}
    });
    /* sfx toggle button (static topbar markup) */
    var sb = document.getElementById("sfxBtn");
    if (sb) {
      sb.textContent = sfxOn ? "🔊" : "🔇";
      sb.title = sfxOn ? "UI sounds on" : "UI sounds off";
      sb.onclick = function () { toggleSfx(); };
    }
    /* preload the offline SFX bank now (fetch+decode ~230KB); first gesture resumes audio */
    try { sfxBankEnsure(); } catch (e) {}
    vfxScroll();
  } catch (e) {}
  try { vfxTiltInit(); } catch (e) {}
  try { vfxWatchScreens(); } catch (e) {}
}

window.setLabel = setLabel;
window.sfx = sfx;
window.sfxBankStatus = sfxBankStatus;
window.toggleSfx = toggleSfx;
window.sfxEnabled = sfxEnabled;
window.countUp = countUp;
window.vfxPulse = vfxPulse;
window.vfxInit = vfxInit;

LL.files.push("vfx"); /* end-of-file registration: counts as loaded only after this file fully ran */