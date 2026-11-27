/* LIFE & LEGACY — engine/saves.js
 * SECTION 12a saves (resilient local-first + Firestore cloud sync for signed-in Google users).
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS).
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
/* ============ SECTION 12a — saves (resilient tiered storage + Firestore) ============ */
window.LL_STORE_TIER = window.LL_STORE_TIER || "kv";
var memAuto = null, memSlots = null, storeWarned = false;
var cloudAutoTimer = null;

function storeWarnOnce() {
  if (storeWarned) return; storeWarned = true;
  window.LL_STORE_TIER = "mem";
  try { if (typeof toast === "function") toast("⚠️ Browser storage is blocked — saves last for this session only. Use ⬇ Download save to keep a life."); } catch (e) {}
}
function snapOf(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } }
function lsGet(k) { try { return { ok: true, v: localStorage.getItem(k) }; } catch (e) { return { ok: false }; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function storeRace(p, ms) {
  return Promise.race([Promise.resolve(p), new Promise(function (_, rej) {
    setTimeout(function () { var e = new Error("store timeout"); e.storeTimeout = true; rej(e); }, ms || 8000);
  })]);
}
var EMPTY_SLOTS = "[null,null,null,null,null,null,null]";
function getSlots() {
  var r = lsGet("sdls_slots");
  if (r.ok) {
    try { var s = JSON.parse(r.v || EMPTY_SLOTS); if (s && s.length === 7) { memSlots = s; return s; } } catch (e) {}
    return [null, null, null, null, null, null, null];
  }
  storeWarnOnce();
  if (memSlots && memSlots.length === 7) return memSlots;
  return [null, null, null, null, null, null, null];
}
function setSlots(s) {
  memSlots = snapOf(s);
  var txt = null;
  try { txt = JSON.stringify(s); } catch (e) {}
  if (txt === null || !lsSet("sdls_slots", txt)) storeWarnOnce();
}
function loadAuto() {
  var e = loadAutoEntry();
  return e ? e.state : null;
}
function loadAutoEntry() {
  var r = lsGet("sdls_auto");
  if (r.ok) { try { return JSON.parse(r.v || "null"); } catch (e) { return null; } }
  storeWarnOnce();
  return memAuto;
}

/* ---- Firestore cloud mirror helpers (signed-in Google users only) ---- */
function cloudReady() {
  return !!(window.LLFirebase && window.LLFirebase.getUser() && window.LLPlayer && window.LLPlayer.cloud === true && !window.LLPlayer.guest);
}
function cloudMirrorAuto(payload) {
  if (!cloudReady() || !payload || !payload.state) return;
  try {
    if (cloudAutoTimer) clearTimeout(cloudAutoTimer);
    var copy = snapOf(payload);
    cloudAutoTimer = setTimeout(function () {
      cloudAutoTimer = null;
      if (!cloudReady()) return;
      window.LLFirebase.saveSlot("auto", copy).catch(function (e) {
        console.warn("Cloud autosave mirror failed:", e);
      });
    }, 1200);
  } catch (e) {}
}
function cloudMirrorSlot(i, entry) {
  if (!cloudReady()) return;
  try {
    var slotId = "slot" + i;
    if (entry && entry.state) {
      window.LLFirebase.saveSlot(slotId, snapOf(entry)).catch(function (e) {
        console.warn("Cloud slot mirror failed:", e);
      });
    } else {
      window.LLFirebase.deleteSlot(slotId).catch(function (e) {
        console.warn("Cloud slot delete failed:", e);
      });
    }
  } catch (e) {}
}

function autosave() {
  if (!S) return;
  var payload = { savedAt: Date.now(), state: S };
  try {
    var txt = JSON.stringify(payload);
    try { memAuto = JSON.parse(txt); } catch (e) { memAuto = payload; }
    if (!lsSet("sdls_auto", txt)) storeWarnOnce();
  } catch (e) { storeWarnOnce(); try { memAuto = payload; } catch (e2) {} }
  kvMirrorAuto();
  idbMirrorAuto();
  cloudMirrorAuto(memAuto || payload);
}

// ---- kv-plugin (IndexedDB) mirror ----
function kvStore() { try { return (root.kv && root.kv.saves) ? root.kv.saves : null; } catch (e) { return null; } }
function kvMirrorAuto() {
  var kv = kvStore(); if (!kv || !S) return;
  try { Promise.resolve(kv.set("auto", { savedAt: Date.now(), state: S })).catch(function () {}); } catch (e) {}
}
function kvMirrorSlot(i, entry) {
  var kv = kvStore(); if (!kv) return;
  try {
    if (entry) Promise.resolve(kv.set("slot" + i, entry)).catch(function () {});
    else Promise.resolve(kv.delete("slot" + i)).catch(function () {});
  } catch (e) {}
}

/* ---- native IndexedDB tier ---- */
var idbDb = null, idbDead = false;
function idbOpen() {
  if (idbDb) return Promise.resolve(idbDb);
  if (idbDead || !window.indexedDB) return Promise.reject(new Error("no indexedDB"));
  return new Promise(function (res, rej) {
    var q;
    try { q = indexedDB.open("ll-saves", 1); } catch (e) { idbDead = true; rej(e); return; }
    q.onupgradeneeded = function () { try { q.result.createObjectStore("kv"); } catch (e) {} };
    q.onsuccess = function () {
      idbDb = q.result;
      try { idbDb.onclose = function () { idbDb = null; }; } catch (e) {}
      res(idbDb);
    };
    q.onerror = function () {
      idbDead = true;
      try { rej(q.error || new Error("idb open failed")); } catch (e) { rej(new Error("idb open failed")); }
    };
  });
}
function idbTx(mode, key, val, allKeys) {
  return idbOpen().then(function (db) {
    return new Promise(function (res, rej) {
      var st, q;
      try {
        var t = db.transaction("kv", mode);
        st = t.objectStore("kv");
        if (mode === "readonly") q = allKeys ? st.getAllKeys() : st.get(key);
        else q = (val === undefined) ? st.delete(key) : st.put(val, key);
      } catch (e) { rej(e); return; }
      q.onsuccess = function () { res(q.result === undefined ? null : q.result); };
      q.onerror = function () { try { rej(q.error || new Error("idb request failed")); } catch (e) { rej(new Error("idb request failed")); } };
    });
  });
}
function idbMirrorAuto() {
  if (!S) return;
  try { idbTx("readwrite", "auto", { savedAt: Date.now(), state: snapOf(S) }).catch(function () {}); } catch (e) {}
}
function idbMirrorSlot(i, entry) {
  try {
    if (entry) idbTx("readwrite", "slot" + i, entry).catch(function () {});
    else idbTx("readwrite", "slot" + i, undefined).catch(function () {});
  } catch (e) {}
}
function slotsMap(arr) { var o = {}, i; for (i = 0; i < 7; i++) if (arr && arr[i] && arr[i].state) o[i] = arr[i]; return o; }

async function kvBootAdopt() {
  try {
    var kv = kvStore(), i, si;
    var cands = [];
    cands.push({ auto: loadAutoEntry(), slots: slotsMap(getSlots()) });
    if (kv) {
      try {
        var kvAuto = await storeRace(kv.get("auto"), 8000);
        var kvSlots = {};
        try {
          var entries = await storeRace(kv.entries(), 8000);
          for (var e = 0; e < entries.length; e++) {
            var m = /^slot([0-6])$/.exec(entries[e][0]);
            if (m && entries[e][1] && entries[e][1].state) kvSlots[+m[1]] = entries[e][1];
          }
        } catch (e2) {}
        cands.push({ auto: kvAuto, slots: kvSlots });
      } catch (e3) {}
    }
    try {
      var im = { auto: null, slots: {} };
      var keys = await storeRace(idbTx("readonly", null, null, true), 8000);
      if (keys && keys.length) {
        for (var k = 0; k < keys.length; k++) {
          try {
            var vv = await storeRace(idbTx("readonly", keys[k]), 8000);
            if (!vv || !vv.state) continue;
            if (keys[k] === "auto") im.auto = vv;
            else { var mm = /^slot([0-6])$/.exec(keys[k]); if (mm) im.slots[+mm[1]] = vv; }
          } catch (e4) {}
        }
      }
      cands.push({ auto: im.auto, slots: im.slots });
    } catch (e5) {}
    var winAuto = null;
    for (i = 0; i < cands.length; i++) {
      var a = cands[i].auto;
      if (a && a.state && (!winAuto || (a.savedAt || 0) > (winAuto.savedAt || 0))) winAuto = a;
    }
    var winSlots = {};
    for (i = 0; i < cands.length; i++) for (si = 0; si < 7; si++) {
      var en = cands[i].slots[si];
      if (en && (!winSlots[si] || (en.savedAt || 0) > ((winSlots[si] && winSlots[si].savedAt) || 0))) winSlots[si] = en;
    }
    var outSlots = []; for (si = 0; si < 7; si++) outSlots[si] = winSlots[si] || null;
    memAuto = winAuto ? snapOf(winAuto) : null;
    memSlots = snapOf(outSlots);
    if (winAuto) {
      lsSet("sdls_auto", JSON.stringify(winAuto));
      if (kv) { try { await storeRace(kv.set("auto", winAuto), 8000); } catch (e6) {} }
      try { await storeRace(idbTx("readwrite", "auto", winAuto), 8000); } catch (e7) {}
    }
    setSlots(outSlots);
    var jobs = [];
    for (si = 0; si < 7; si++) if (outSlots[si]) {
      if (kv) jobs.push(storeRace(kv.set("slot" + si, outSlots[si]), 8000).catch(function () {}));
      jobs.push(storeRace(idbTx("readwrite", "slot" + si, outSlots[si]), 8000).catch(function () {}));
    }
    try { await Promise.all(jobs); } catch (e8) {}
  } catch (e) {}
  try { renderSaves(); } catch (e9) {}
}

/* ---- Newer-wins Firestore merge for autosave + all 7 save slots ---- */
async function cloudSyncSaves() {
  if (!cloudReady()) return;
  var remote = await storeRace(window.LLFirebase.loadAllSaves(), 15000);
  var localAuto = loadAutoEntry();
  var localSlots = getSlots();
  var pushJobs = [];

  // Merge autosave
  var rAuto = remote && remote.auto;
  var winAuto = null;
  if (localAuto && localAuto.state && (!rAuto || (localAuto.savedAt || 0) >= (rAuto.savedAt || 0))) {
    winAuto = localAuto;
    if (!rAuto || (localAuto.savedAt || 0) > (rAuto.savedAt || 0)) {
      pushJobs.push(window.LLFirebase.saveSlot("auto", snapOf(localAuto)).catch(function (e) { console.warn(e); }));
    }
  } else if (rAuto && rAuto.state) {
    winAuto = rAuto;
    memAuto = snapOf(rAuto);
    lsSet("sdls_auto", JSON.stringify(rAuto));
    try { var kvA = kvStore(); if (kvA) kvA.set("auto", rAuto).catch(function () {}); } catch (eK) {}
    idbTx("readwrite", "auto", rAuto).catch(function () {});
  }

  // Merge 7 manual slots
  var mergedSlots = [];
  var localChanged = false;
  for (var i = 0; i < 7; i++) {
    var l = localSlots[i];
    var r = remote && remote.slots ? remote.slots[i] : null;
    if (l && l.state && (!r || (l.savedAt || 0) >= (r.savedAt || 0))) {
      mergedSlots[i] = l;
      if (!r || (l.savedAt || 0) > (r.savedAt || 0)) {
        pushJobs.push(window.LLFirebase.saveSlot("slot" + i, snapOf(l)).catch(function (e) { console.warn(e); }));
      }
    } else if (r && r.state) {
      mergedSlots[i] = r;
      localChanged = true;
      try { kvMirrorSlot(i, r); } catch (eK2) {}
      idbMirrorSlot(i, r);
    } else {
      mergedSlots[i] = null;
    }
  }
  if (localChanged) {
    setSlots(mergedSlots);
  }
  if (pushJobs.length) {
    await Promise.all(pushJobs);
  }
  try { renderSaves(); } catch (e) {}
  return { auto: winAuto, slots: mergedSlots };
}

function saveTo(i) {
  try {
    if (!S) { toast("No life yet!"); return; }
    var s = getSlots(); s[i] = { savedAt: Date.now(), state: snapOf(S) };
    setSlots(s); kvMirrorSlot(i, s[i]); idbMirrorSlot(i, s[i]); cloudMirrorSlot(i, s[i]);
    toast(cloudReady() ? ("☁️ Saved to slot " + (i + 1) + " (cloud synced)!") : ("💾 Saved to slot " + (i + 1) + "!"));
  } catch (e) { try { toast("⚠️ Couldn't save — use ⬇ Download save instead."); } catch (e2) {} }
  try { renderSaves(); } catch (e3) {}
}
function loadFrom(i) {
  try {
    var s = getSlots(); if (!s[i]) return;
    var bad = validateSave(s[i].state);
    if (bad) { toast("⚠️ Slot " + (i + 1) + " save is damaged (" + bad + ") — not loaded."); return; }
    S = s[i].state; var res = afterLoad();
    if (res === "newer") toast("⚠️ That life was saved by a newer version — some things may look odd.");
    else toast("📂 Loaded " + S.firstName + ", age " + S.age + "!");
  } catch (e) { try { toast("⚠️ Couldn't load that slot."); } catch (e2) {} }
}
function delSlot(i) {
  try { var s = getSlots(); s[i] = null; setSlots(s); kvMirrorSlot(i, null); idbMirrorSlot(i, null); cloudMirrorSlot(i, null); }
  catch (e) {}
  try { renderSaves(); } catch (e2) {}
}
function dlSlot(i) {
  try {
    var s = getSlots(); if (!s[i]) return;
    var blob = new Blob([JSON.stringify(s[i].state)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "life-" + s[i].state.firstName + "-age" + s[i].state.age + ".json"; a.click();
    try { setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000); } catch (e) {}
  } catch (e) { try { toast("⚠️ Download blocked by the browser."); } catch (e2) {} }
}
function renderSaves() {
  try {
    var s = getSlots(), box = $("slots"); if (!box) return; box.innerHTML = "";
    var isCloud = cloudReady();
    var cloudTag = isCloud ? ' <span class="cloud-badge">☁️ cloud</span>' : "";
    s.forEach(function (sl, i) {
      var d = document.createElement("div"); d.className = "slot";
      if (!sl) { d.innerHTML = '<div class="grow"><b>Slot ' + (i + 1) + '</b><small>Empty slot</small><div class="row"><button class="mini" data-a="save">Save here</button></div></div>'; }
      else {
        var st = sl.state;
        d.innerHTML = '<div class="grow"><b>#' + (i + 1) + ' ' + esc(st.firstName + " " + st.lastName) + ' · age ' + st.age + cloudTag + '</b><small>' + new Date(sl.savedAt).toLocaleString() + ' · ' + fmt$(st.money) + ' · ' + esc(st.deathCause || "alive") + '</small>'
          + '<div class="row"><button class="mini" data-a="load">Load</button><button class="mini" data-a="save">Overwrite</button><button class="mini" data-a="dl">⬇ Download</button><button class="mini" data-a="del">Delete</button></div></div>';
      }
      var btns = d.querySelectorAll("button");
      for (var bi = 0; bi < btns.length; bi++) btns[bi].onclick = function () {
        var a = this.dataset.a;
        if (a === "save") { if (!S) { toast("No life yet!"); return; } saveTo(i); }
        if (a === "load") loadFrom(i); if (a === "del") delSlot(i); if (a === "dl") dlSlot(i);
      };
      box.appendChild(d);
    });
    var auto = loadAuto();
    var autoAt = null; try { var raw = loadAutoEntry(); if (raw) autoAt = raw.savedAt; } catch (e) {}
    var card = $("continueCard"), info = $("continueInfo"), goBtn = $("newLifeBtn2");
    if (card && info) {
      var live = (typeof S !== "undefined" && S && S.alive) ? S : null, src = live || auto;
      if (src) {
        card.classList.remove("hidden");
        var syncWord = isCloud ? " · ☁️ cloud synced" : "";
        info.innerHTML = "<b>" + esc(src.firstName + " " + src.lastName) + "</b>, age " + src.age + " · " + fmt$(src.money) + " · " + esc(jobNameOf(src)) + (!live && autoAt ? "<br><span class='sub'>autosaved " + new Date(autoAt).toLocaleString() + syncWord + "</span>" : (live ? "<br><span class='sub'>current life — autosaved" + syncWord + "</span>" : ""));
        if (goBtn) goBtn.textContent = "▶ Continue as " + src.firstName;
      } else card.classList.add("hidden");
    }
  } catch (e) {}
}
function jobNameOf(st) { if (!st || st.jobId === "unemployed") return "between jobs"; for (var i = 0; i < window.GDATA.jobs.length; i++) if (window.GDATA.jobs[i].id === st.jobId) return window.GDATA.jobs[i].name; return "—"; }

window.cloudSyncSaves = cloudSyncSaves;
LL.files.push("saves"); /* end-of-file registration: counts as loaded only after this file fully ran */