/* LIFE & LEGACY — engine/saves.js
 * SECTION 12a saves.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 12a — saves (resilient tiered storage) ============ */
/* Fallback chain (same data shapes everywhere so tiers can adopt each other):
 *   kv-plugin (IndexedDB via plugin, keys "auto","slot0".."slot6") ->
 *   native indexedDB ("ll-saves"/"kv", same keys/shapes, used when the plugin
 *   is missing and as a second mirror) -> localStorage ("sdls_auto",
 *   "sdls_slots", the fast sync path) -> in-memory session + a one-time
 *   warning toast pointing at "Download save".
 * Nothing here ever throws: every public function guards, so ageBtn,
 * autosave and home-screen rendering survive blocked storage. */
window.LL_STORE_TIER = window.LL_STORE_TIER || "kv";
var memAuto = null, memSlots = null, storeWarned = false;
function storeWarnOnce(){
  if (storeWarned) return; storeWarned = true;
  window.LL_STORE_TIER = "mem";
  try { if (typeof toast === "function") toast("⚠️ Browser storage is blocked — saves last for this session only. Use ⬇ Download save to keep a life."); } catch (e) {}
}
function snapOf(o){ try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } }
function lsGet(k){ try { return { ok: true, v: localStorage.getItem(k) }; } catch (e) { return { ok: false }; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
/* Remote reads (kv/idb) can HANG on partitioned storage instead of rejecting;
 * race them so boot adopt can never stall the home screen. */
function storeRace(p, ms){
  return Promise.race([Promise.resolve(p), new Promise(function (_, rej){
    setTimeout(function(){ var e = new Error("store timeout"); e.storeTimeout = true; rej(e); }, ms || 8000);
  })]);
}
var EMPTY_SLOTS = "[null,null,null,null,null,null,null]";
function getSlots(){
  var r = lsGet("sdls_slots");
  if (r.ok) {
    try { var s = JSON.parse(r.v || EMPTY_SLOTS); if (s && s.length === 7) { memSlots = s; return s; } } catch (e) {}
    return [null,null,null,null,null,null,null];
  }
  storeWarnOnce();
  if (memSlots && memSlots.length === 7) return memSlots;
  return [null,null,null,null,null,null,null];
}
function setSlots(s){
  memSlots = snapOf(s);
  var txt = null;
  try { txt = JSON.stringify(s); } catch (e) {}
  if (txt === null || !lsSet("sdls_slots", txt)) storeWarnOnce();
}
function loadAuto(){
  var e = loadAutoEntry();
  return e ? e.state : null;
}
function loadAutoEntry(){
  var r = lsGet("sdls_auto");
  if (r.ok) { try { return JSON.parse(r.v || "null"); } catch (e) { return null; } }
  storeWarnOnce();
  return memAuto;
}
function autosave(){
  if (!S) return;
  try {
    var payload = { savedAt: Date.now(), state: S };
    var txt = JSON.stringify(payload);
    try { memAuto = JSON.parse(txt); } catch (e) { memAuto = payload; }
    if (!lsSet("sdls_auto", txt)) storeWarnOnce();
  } catch (e) { storeWarnOnce(); try { memAuto = { savedAt: Date.now(), state: S }; } catch (e2) {} }
  kvMirrorAuto(); idbMirrorAuto();
}

// ---- kv-plugin (IndexedDB) mirror: durable + roomy, localStorage stays the fast sync path ----
// S is plain data (no functions; image pixels live in session-only chatImgCache), so it
// structured-clones cleanly into IndexedDB, which holds hundreds of MB vs localStorage ~10MB.
// No raw IndexedDB needed: kv-plugin IS the safe, supported IndexedDB path.
function kvStore(){ try{ return (root.kv&&root.kv.saves)?root.kv.saves:null; }catch(e){ return null; } }
function kvMirrorAuto(){
  var kv=kvStore(); if(!kv||!S)return;
  try{ Promise.resolve(kv.set("auto",{savedAt:Date.now(),state:S})).catch(function(){}); }catch(e){}
}
function kvMirrorSlot(i,entry){
  var kv=kvStore(); if(!kv)return;
  try{
    if(entry)Promise.resolve(kv.set("slot"+i,entry)).catch(function(){});
    else Promise.resolve(kv.delete("slot"+i)).catch(function(){});
  }catch(e){}
}
/* ---- native IndexedDB tier: same keys/shapes as kv-plugin ("auto",
 * "slot0".."slot6" -> {savedAt,state}). Used when the plugin is missing but
 * raw indexedDB works, and as a second write-through mirror. Fully guarded:
 * every op catches, so a blocked IDB never surfaces. ---- */
var idbDb = null, idbDead = false;
function idbOpen(){
  if (idbDb) return Promise.resolve(idbDb);
  if (idbDead || !window.indexedDB) return Promise.reject(new Error("no indexedDB"));
  return new Promise(function (res, rej){
    var q;
    try { q = indexedDB.open("ll-saves", 1); } catch (e) { idbDead = true; rej(e); return; }
    q.onupgradeneeded = function(){ try { q.result.createObjectStore("kv"); } catch (e) {} };
    q.onsuccess = function(){ idbDb = q.result;
      try { idbDb.onclose = function(){ idbDb = null; }; } catch (e) {}
      res(idbDb); };
    q.onerror = function(){ idbDead = true;
      try { rej(q.error || new Error("idb open failed")); } catch (e) { rej(new Error("idb open failed")); } };
  });
}
function idbTx(mode, key, val, allKeys){
  return idbOpen().then(function (db){
    return new Promise(function (res, rej){
      var st, q;
      try {
        var t = db.transaction("kv", mode);
        st = t.objectStore("kv");
        if (mode === "readonly") q = allKeys ? st.getAllKeys() : st.get(key);
        else q = (val === undefined) ? st.delete(key) : st.put(val, key);
      } catch (e) { rej(e); return; }
      q.onsuccess = function(){ res(q.result === undefined ? null : q.result); };
      q.onerror = function(){ try { rej(q.error || new Error("idb request failed")); } catch (e) { rej(new Error("idb request failed")); } };
    });
  });
}
function idbMirrorAuto(){
  if (!S) return;
  try { idbTx("readwrite", "auto", { savedAt: Date.now(), state: snapOf(S) }).catch(function(){}); } catch (e) {}
}
function idbMirrorSlot(i, entry){
  try {
    if (entry) idbTx("readwrite", "slot" + i, entry).catch(function(){});
    else idbTx("readwrite", "slot" + i, undefined).catch(function(){});
  } catch (e) {}
}
function slotsMap(arr){ var o = {}, i; for (i = 0; i < 7; i++) if (arr && arr[i] && arr[i].state) o[i] = arr[i]; return o; }
async function kvBootAdopt(){
  // Newer-wins merge across kv-plugin, native IndexedDB and localStorage, in
  // every direction; the memory tier seeds from the winners. Never throws and
  // never hangs (every remote read races a timeout) so boot and the home
  // screen always render even with storage fully blocked.
  try{
    var kv=kvStore(), i, si;
    var cands=[];
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
    for (i = 0; i < cands.length; i++) { var a = cands[i].auto;
      if (a && a.state && (!winAuto || (a.savedAt || 0) > (winAuto.savedAt || 0))) winAuto = a; }
    var winSlots = {};
    for (i = 0; i < cands.length; i++) for (si = 0; si < 7; si++) { var en = cands[i].slots[si];
      if (en && (!winSlots[si] || (en.savedAt || 0) > ((winSlots[si] && winSlots[si].savedAt) || 0))) winSlots[si] = en; }
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
      if (kv) jobs.push(storeRace(kv.set("slot" + si, outSlots[si]), 8000).catch(function(){}));
      jobs.push(storeRace(idbTx("readwrite", "slot" + si, outSlots[si]), 8000).catch(function(){}));
    }
    try { await Promise.all(jobs); } catch (e8) {}
  }catch(e){}
  try { renderSaves(); } catch (e9) {}
}
function saveTo(i){
  try {
    if (!S) { toast("No life yet!"); return; }
    var s = getSlots(); s[i] = { savedAt: Date.now(), state: snapOf(S) };
    setSlots(s); kvMirrorSlot(i, s[i]); idbMirrorSlot(i, s[i]);
    toast("💾 Saved to slot " + (i + 1) + "!");
  } catch (e) { try { toast("⚠️ Couldn't save — use ⬇ Download save instead."); } catch (e2) {} }
  try { renderSaves(); } catch (e3) {}
}
function loadFrom(i){
  try {
    var s = getSlots(); if (!s[i]) return;
    var bad = validateSave(s[i].state);
    if (bad) { toast("⚠️ Slot " + (i + 1) + " save is damaged (" + bad + ") — not loaded."); return; }
    S = s[i].state; var res = afterLoad();
    if (res === "newer") toast("⚠️ That life was saved by a newer version — some things may look odd.");
    else toast("📂 Loaded " + S.firstName + ", age " + S.age + "!");
  } catch (e) { try { toast("⚠️ Couldn't load that slot."); } catch (e2) {} }
}
function delSlot(i){
  try { var s = getSlots(); s[i] = null; setSlots(s); kvMirrorSlot(i, null); idbMirrorSlot(i, null); }
  catch (e) {}
  try { renderSaves(); } catch (e2) {}
}
function dlSlot(i){
  try {
    var s = getSlots(); if (!s[i]) return;
    var blob = new Blob([JSON.stringify(s[i].state)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "life-" + s[i].state.firstName + "-age" + s[i].state.age + ".json"; a.click();
    try { setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000); } catch (e) {}
  } catch (e) { try { toast("⚠️ Download blocked by the browser."); } catch (e2) {} }
}
function renderSaves(){
  try {
  var s=getSlots(),box=$("slots"); if(!box)return; box.innerHTML="";
  s.forEach(function(sl,i){
    var d=document.createElement("div"); d.className="slot";
    if(!sl){ d.innerHTML='<div class="grow"><b>Slot '+(i+1)+'</b><small>Empty slot</small><div class="row"><button class="mini" data-a="save">Save here</button></div></div>'; }
    else{ var st=sl.state; d.innerHTML='<div class="grow"><b>#'+(i+1)+' '+esc(st.firstName+" "+st.lastName)+' · age '+st.age+'</b><small>'+new Date(sl.savedAt).toLocaleString()+' · '+fmt$(st.money)+' · '+esc(st.deathCause||"alive")+'</small>'
      +'<div class="row"><button class="mini" data-a="load">Load</button><button class="mini" data-a="save">Overwrite</button><button class="mini" data-a="dl">⬇ Download</button><button class="mini" data-a="del">Delete</button></div></div>'; }
    var btns=d.querySelectorAll("button");
    for(var bi=0;bi<btns.length;bi++)btns[bi].onclick=function(){ var a=this.dataset.a;
      if(a==="save"){ if(!S){ toast("No life yet!"); return; } saveTo(i); }
      if(a==="load")loadFrom(i); if(a==="del")delSlot(i); if(a==="dl")dlSlot(i); };
    box.appendChild(d);
  });
  var auto=loadAuto();
  var autoAt=null; try{ var raw=loadAutoEntry(); if(raw)autoAt=raw.savedAt; }catch(e){}
  var card=$("continueCard"), info=$("continueInfo"), goBtn=$("newLifeBtn2");
  if(card&&info){
    var live=(typeof S!=="undefined"&&S&&S.alive)?S:null, src=live||auto;
    if(src){ card.classList.remove("hidden");
      info.innerHTML="<b>"+esc(src.firstName+" "+src.lastName)+"</b>, age "+src.age+" · "+fmt$(src.money)+" · "+esc(jobNameOf(src))+(!live&&autoAt?"<br><span class='sub'>autosaved "+new Date(autoAt).toLocaleString()+"</span>":(live?"<br><span class='sub'>current life — autosaved</span>":""));
      if(goBtn)goBtn.textContent="▶ Continue as "+src.firstName;
    } else card.classList.add("hidden");
  }
  } catch (e) {}
}
function jobNameOf(st){ if(!st||st.jobId==="unemployed")return "between jobs"; for(var i=0;i<window.GDATA.jobs.length;i++) if(window.GDATA.jobs[i].id===st.jobId) return window.GDATA.jobs[i].name; return "—"; }

LL.files.push("saves"); /* end-of-file registration: counts as loaded only after this file fully ran */