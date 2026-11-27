/* LIFE & LEGACY — engine/ui.js
 * SECTION 12b-i modals/toast/i18n chrome + afterLoad/goHome/toggleAuto.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 12b — modals / toast / settings / i18n text ============ */
function openModal(id){ $(id).classList.remove("hidden"); try{ sfx("open"); }catch(e){} }
function closeModal(id){ $(id).classList.add("hidden"); try{ sfx("close"); }catch(e){} }
function toast(msg){ var d=document.createElement("div"); d.className="toast"; d.textContent=msg; $("toasts").appendChild(d); setTimeout(function(){d.remove();},4200); }
window.toast=toast;
function applyTexts(){
  var map={newLifeBtn:t("newLife"),customBtn:t("customLife"),
    newLifeBtn2:t("continue"),ageBtn:t("age"),saveBtn:t("save"),endBtn:t("endLife"),newBtn:t("newLife2"),
    sSaves:t("saves"),sHelp:t("help"),logTitle:t("log"),netTitle:t("networth"),directTop:t("direct"),
    tabA:t("activities"),tabS:t("social"),tabF:t("family"),tabW:t("school"),tabM:t("money"),tabH:t("health")};
  for(var k in map){ if($(k))setLabel(k,map[k]); }
  var tc=$("tabC"); if(tc)setLabel("tabC",t("rule"));
  var tw=$("tabWorld"); if(tw)setLabel("tabWorld",t("world"));
  var tb2=$("treeBtn"); if(tb2)setLabel("treeBtn",t("dynasty"));
  var ab=$("autoBtn"); if(ab&&!autoTimer)ab.textContent=t("auto");
}
function afterLoad(){
  /* identity changed (new/load/heir/growTo/import): retire every in-flight
   * async answer — see ASYNC-GEN GUARD in state.js. */
  try{ bumpLifeGen(); }catch(e){}
  var res=migrate();
  /* GENETICS PATCH: old saves backfill genomes + named parents here — no bump */
  try{ parentsEnsure(); }catch(e){}
  try{ genesEnsure(); }catch(e){}
  try { if(typeof clearChatImgCache==="function")clearChatImgCache(); } catch (e) {}
  if(res==="newer"&&window.console&&console.warn)console.warn("afterLoad: save is newer than engine v"+LL.SAVE_VERSION);
  if(res&&res.indexOf("partial:")===0){
    if(window.console&&console.warn)console.warn("afterLoad: migration halted at "+res+" — pre-upgrade save restored, version not stamped");
    try{ if(typeof toast==="function")toast("⚠️ Save upgrade paused ("+res.slice(8)+") — your pre-upgrade data was kept. Old systems may be missing fields."); }catch(e){}
  }
  lastStory={age:-999,job:"",partner:"",kids:-1,house:""};
  /* Identity changed (new life / load / heir / growTo): drop the previous
   * face NOW so a stale portrait can't linger while the new one paints
   * (8-120s). Also cancel any in-flight paint — the token guard would
   * discard it anyway, but this frees the busy flag immediately. */
  try{ if(typeof portraitToken==="number")portraitToken++; }catch(e){}
  try{ portraitBusy=false; }catch(e){}
  try{
    var pi=$("portraitImg"), av=$("avatar"), init="✨";
    try{ if(S&&S.firstName)init=(S.firstName.charAt(0)+(S.lastName||"").charAt(0)).toUpperCase(); }catch(e2){}
    if(pi){ pi.removeAttribute("src"); pi.hidden=true; }
    if(av){ av.style.display="grid"; av.textContent=init; }
  }catch(e){}
  maybeStory(true);
  $("startScreen").classList.add("hidden"); $("deathScreen").classList.add("hidden"); $("gameScreen").classList.remove("hidden");
  clearAuto(); autosave(); render(); window.scrollTo(0,0);
  return res;
}
function clearAuto(){ if(autoTimer){ clearInterval(autoTimer); autoTimer=null; $("autoBtn").textContent=t("auto"); } }
function goHome(){
  if(S&&S.alive){ autosave(); toast("💾 Autosaved — pick up from the front page anytime!"); }
  clearAuto();
  var ovs=document.querySelectorAll(".overlay");
  for(var i=0;i<ovs.length;i++)ovs[i].classList.add("hidden");
  $("deathScreen").classList.add("hidden"); $("gameScreen").classList.add("hidden"); $("startScreen").classList.remove("hidden");
  try{ $("dynBarTop").style.display="none"; }catch(e){}
  window.scrollTo(0,0); renderSaves();
  try{ if(typeof renderAch==="function")renderAch(); }catch(e){}
}
function toggleAuto(){ if(autoTimer){ clearAuto(); return; }
  autoYears=0; $("autoBtn").textContent=t("autoStop"); autoTimer=setInterval(autoTick,1300); }

/* ================= bug watch: auto-mode error sweep + topbar 🐛 icon ========
 * After every 5 auto-advanced years, new entries in
 * window.__consoleCapture75847 are surfaced: the hidden 🐛 icon is revealed
 * with a ❌ count and a toast names the count. Any captured error also
 * reveals the icon immediately via bugSyncLive (no toast). Clicking 🐛 opens
 * the log (newest 60); Help → 🐛 Error log opens it too. This catches subtle
 * global-order / undefined-reference bugs that only fire mid-sim.
 * Session only; the ring buffer caps at 200 entries. ========================= */
var bugUnread = 0, bugSeen = 0, autoYears = 0, bugCounted = {};
function bugEntries(){ try { var C = window.__consoleCapture75847; return (C && C.entries) ? C.entries : []; } catch (e) { return []; } }
/* The capture array is shared with the platform ({n,k,s} entries); ours are
 * {t,kind,msg}. Normalize both, dedupe identical kind|msg so one fault seen
 * by both recorders counts once. */
function bugNorm(e){
  try {
    var kind = String((e && (e.kind || e.k || e.type)) || "log");
    if (kind === "error") kind = "console.error";
    else if (kind === "warn" || kind === "warning") kind = "console.warn";
    var msg = (e && (e.msg !== undefined ? e.msg : (e.s !== undefined ? e.s : e.message)));
    if (msg === undefined) { try { msg = JSON.stringify(e); } catch (ex) { msg = String(e); } }
    return { kind: kind, msg: String(msg).slice(0, 500), t: (e && (e.t || e.n)) || 0 };
  } catch (e2) { return { kind: "log", msg: "unreadable entry", t: 0 }; }
}
function bugNovel(since){
  var all = bugEntries(), seen = {}, out = [];
  for (var i = since; i < all.length; i++) {
    var n = bugNorm(all[i]), k = n.kind + "|" + n.msg;
    if(!bugIsCountable(n))continue;
    if (!seen[k]) { seen[k] = 1; out.push(n); }
  }
  return out;
}
/* Plain console.log/info/debug chatter is not an error: count only real
 * problems (errors, warnings, uncaught exceptions, rejections, auto-mode
 * crash reports) toward the badge and toast. */
function bugIsCountable(n){
  var k = String((n && n.kind) || "");
  if(k === "log" || k === "info" || k === "debug")return false;
  return true;
}
/* Counting dedupe: the platform recorder and our wrapper each log the same
 * fault (platform {n,k,s} "error" normalizes to our "console.error"), often
 * arriving in different batches — so index-based bugNovel(since) counts one
 * fault twice. bugFresh dedupes globally per session: an identical kind|msg
 * counts once no matter when its copies arrive. Display (openBugModal) still
 * uses bugNovel(0), which dedupes only for rendering. */
function bugFresh(){
  var all = bugEntries(), out = [];
  for (var i = 0; i < all.length; i++) {
    var n = bugNorm(all[i]), k = n.kind + "|" + n.msg;
    if(!bugIsCountable(n))continue;
    if (!bugCounted[k]) { bugCounted[k] = 1; out.push(n); }
  }
  bugSeen = all.length;
  return out;
}
function bugMarkCounted(){
  try {
    var all = bugEntries();
    for (var i = 0; i < all.length; i++) {
      var n = bugNorm(all[i]);
      bugCounted[n.kind + "|" + n.msg] = 1;
    }
    bugSeen = all.length;
  } catch (e) {}
}
function bugPush(kind, msg){
  try {
    var C = window.__consoleCapture75847;
    if (C && C.push) C.push(kind, msg);
    else if (C && C.entries) { C.entries.push({ t: Date.now(), kind: String(kind), msg: String(msg).slice(0, 500) }); }
  } catch (e) {}
}
function renderBugBtn(){
  var b = $("bugBtn"); if (!b) return;
  if (bugUnread > 0) {
    b.hidden = false;
    b.textContent = "🐛❌" + (bugUnread > 9 ? "9+" : bugUnread);
    b.classList.add("buggy");
    b.title = bugUnread + " captured error(s) — click to inspect";
  } else {
    b.hidden = true;
    b.textContent = "🐛";
    b.classList.remove("buggy");
    b.title = "Error log (clean)";
  }
}
/* AI status tracking (no UI — pill removed from the topbar by user request).
 * LL_AI_ONLINE / LL_IMG_ONLINE are still learned from real call outcomes
 * (🟡 unknown, 🟢 worked, 🔴 failed with deterministic fallbacks in use).
 * renderAiPill() is kept as a silent no-op so existing callers stay safe. */
var _aiPillState = null;
function aiDot(v){ return v===true?"🟢":(v===false?"🔴":"🟡"); }
function aiWord(v){ return v===true?"working":(v===false?"offline":"not tried yet"); }
function renderAiPill(){
  try {
    var el = $("aiPill"); if (!el) return;
    var t = window.LL_AI_ONLINE, m = window.LL_IMG_ONLINE;
    var key = String(t)+"|"+String(m);
    if (!el.__llAiWired) {
      el.style.cursor = "pointer";
      el.onclick = function(){
        try {
          var tt = window.LL_AI_ONLINE, mm = window.LL_IMG_ONLINE;
          toast("Story AI (text): " + aiWord(tt) + " · Art AI (images): " + aiWord(mm) + " — yellow = not tried yet, green = working, red = offline, game uses built-in stories instead.");
        } catch (e) {}
      };
      el.__llAiWired = true;
    }
    if (_aiPillState === key) return; _aiPillState = key;
    el.textContent = "AI · Text "+aiDot(t)+" · Art "+aiDot(m);
    el.title = "Story AI (text): " + aiWord(t) + " · Art AI (images): " + aiWord(m) + " — updates automatically when the game calls the AI; yellow = not tried yet";
  } catch (e) {}
}
/* Live reveal: any newly captured entry (console.error/warn, uncaught error,
 * rejection, or platform-side C.entries.push) shows the topbar button with a
 * count badge. Silent (no toast) — the 5-year auto sweep in bugReportAuto is
 * the only place that toasts. The log stays reachable via Help → 🐛 Error log. */
function bugSyncLive(){
  try {
    var fresh = bugFresh();
    if (fresh.length) {
      bugUnread += fresh.length;
      renderBugBtn();
    }
  } catch (e) {}
}
window.__llBugNotify = function(){ try { bugSyncLive(); } catch (e) {} };
(function bugLiveWatch(){
  try {
    var C = window.__consoleCapture75847;
    if (C && typeof C.push === "function" && !C.push.__llWrapped) {
      var orig = C.push;
      var wrapped = function(){
        try { return orig.apply(this, arguments); }
        finally { try { bugSyncLive(); } catch (e) {} }
      };
      wrapped.__llWrapped = true;
      C.push = wrapped;
    }
  } catch (e) {}
  if (!window.__llBugPoll) {
    try { window.__llBugPoll = setInterval(function(){ try { bugSyncLive(); } catch (e) {} }, 2500); }
    catch (e) {}
  }
})();
function bugReportAuto(){
  var fresh = bugFresh();
  if (fresh.length) {
    bugUnread += fresh.length;
    try { toast("🐛 " + fresh.length + " error(s) in the last 5 auto-years — tap 🐛 to inspect."); } catch (e) {}
  }
  renderBugBtn();
}
function autoTick(){
  if (!S || !S.alive) { clearAuto(); return; }
  /* Never age over an open event/director modal: the modal's choices apply to
   * the state they were dealt from. Tick again once the player dismisses it. */
  try {
    var em = $("eventModal"), dm = $("directorModal");
    if((em && !em.classList.contains("hidden"))||(dm && !dm.classList.contains("hidden")))return;
  } catch (e) {}
  var a0 = S.age;
  try { ageUp(false); }
  catch (e) { try { bugPush("auto", (e && e.stack) || String(e)); } catch (e2) {} }
  if (S && S.alive && S.age > a0) {
    autoYears++;
    if (autoYears >= 5) { autoYears = 0; bugReportAuto(); }
  }
}
function openBugModal(){
  var list = $("bugList");
  bugUnread = 0; renderBugBtn();
  if (list) {
    var all = bugNovel(0).slice(-60).reverse();
    list.innerHTML = all.length ? all.map(function (e){
      var when = ""; try { when = typeof e.t === "number" && e.t > 1000000000 ? new Date(e.t).toLocaleTimeString() : (e.t ? "#" + e.t : ""); } catch (ex) {}
      return '<div class="n"><span class="yr">' + esc(when) + '</span><b>' + esc(String(e.kind)) + '</b> ' + esc(String(e.msg)).slice(0, 280) + '</div>';
    }).join("") : '<div class="n">No errors captured — all clean ✅</div>';
  }
  bugMarkCounted();
  openModal("bugModal");
}
function clearBugLog(){
  try { var C = window.__consoleCapture75847; if (C && C.drain) C.drain(); else if (C && C.entries) C.entries.length = 0; } catch (e) {}
  bugUnread = 0; bugSeen = 0; bugCounted = {}; openBugModal();
}

/* ================= ruler designer: trait picking + attribute point-buy ================= */

LL.files.push("ui"); /* end-of-file registration: counts as loaded only after this file fully ran */