/* LIFE & LEGACY — engine/boot.js
 * SECTION 13 init + wiring + window exports.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]}); LL.files.push("boot");
/* Boot health check: Perchance's script loader resolves silently on failed
 * <script> network loads, so a missing engine file would otherwise surface
 * pages later as an uncaught TypeError. Verify every expected module
 * registered itself in LL.files and that critical namespaces/globals exist.
 * On failure: render a recovery banner with a Reload button and skip init
 * (saved lives are untouched — this only gates in-memory wiring). */
window.__LL_BOOT_MISSING = [];
window.__LL_BOOT_OK = (function bootHealthCheck(){
  var missing = window.__LL_BOOT_MISSING, HAVE = {}, i;
  if (window.LL && LL.files instanceof Array)
    for (i = 0; i < LL.files.length; i++) HAVE[LL.files[i]] = 1;
  var EXPECT_FILES = ["core","utils","state","migrate","ecs","bus","effects-parse","effects-run",
    "effects-validate","sex-events","appearance","genetics","ai-core","ai-providers","research","life","yearly",
    "events-runtime","mods","portrait","ai-actions","director","dynasty","houses","ownership",
    "death","actions","romance","world","render","saves","ui","music","creator","community","graphs","vfx","anya","wasm","compute","pcg","mcp","prelude","auth","boot"];
  for (i = 0; i < EXPECT_FILES.length; i++)
    if (!HAVE[EXPECT_FILES[i]]) missing.push("module:" + EXPECT_FILES[i]);
  /* ORDER check: presence isn't enough. Several files assume index.html order
   * (state.js reads I18N, sex-events registers into LL.fxCalls, etc.), and a
   * swap passes the presence check above, then fails cryptically at runtime.
   * LL.files records actual load sequence (each file pushes only after its own
   * code ran — see F4 note below), so fail loudly here instead. */
  (function(){
    var pos = {}, seq = [], seen = {}, k, last = -1, bad = null;
    for (k = 0; k < EXPECT_FILES.length; k++) pos[EXPECT_FILES[k]] = k;
    for (k = 0; k < LL.files.length; k++) {
      var n = LL.files[k];
      if (!Object.prototype.hasOwnProperty.call(pos, n) || seen[n]) continue; /* unknown or duplicate loads aren't order errors */
      seen[n] = 1; seq.push(n);
    }
    for (k = 0; k < seq.length; k++) {
      if (pos[seq[k]] < last) { bad = seq[k]; break; }
      last = pos[seq[k]];
    }
    if (bad) missing.push("order:" + bad + " (engine files loaded out of index.html sequence)");
  })();
  var EXPECT_LL = ["fxParse","fxRun","fxValidate","fxCalls",
    "SAVE_VERSION","CONTENT_VERSION","SAVE_MIGRATIONS"];
  for (i = 0; i < EXPECT_LL.length; i++)
    if (!window.LL || LL[EXPECT_LL[i]] === undefined) missing.push("LL." + EXPECT_LL[i]);
  var EXPECT_GLOBALS = ["GDATA","I18N","EVENTS","S","settings","clamp","aiText",
    "requestImage","artEnabled","toggleArt","identityLock",
    "founderGenes","inheritGenes","genesEnsure","parentsEnsure","genePhenotype",
    "inheritAppearance","yearlyGenetics","screenGenetics","genomeSummary","npcSeed",
    "facialAllowed","figureFor","inheritTraits","twinChance","genesForAppearance",
    "ensureGrounding","refreshGrounding","groundingStatus","wikiSummary",
    "newLife","ageUp","doAct","render","afterLoad","validateSave","gainStat",
    "migrateEvent","checkContentVersion","kvBootAdopt","applyTexts",
    "renderSaves","openModal","closeModal","toast","LLUI",
    "imgNoteOnline","renderAch","checkAch","pregEnsure","startPregnancy",
    "coEnsureRival","coUndercut","coAcquire","coSecurity","coHitRival","coAnswerBid",
    "toggleMusic","applyMusic","musicMarkerHTML","musicStatus","musicPauseMain",
    "veilMusicPlay","veilMusicStop","veilMusicSettle","veilVisible",
    "preloadCommunity","loadCommunityBox","communityStatus",
    "renderDynastyChart","renderDivergenceChart","graphsStatus",
    "vfxInit","setLabel","sfx","toggleSfx","sfxBankStatus","countUp","vfxPulse",
    "anyaAsk","anyaGreet","anyaSuggest","anyaClear","anyaStatus",
    "aiProviderStatus","aiProviderTest","renderAiProvider",
    "ecsStatus","busStatus","wasmStatus","reseedWasm","computeStatus","pcgStatus","pcgRhythmFor","mcpStatus","mcpCall",
    "preludeGesture","preludeStatus","stageMusic",
    "authComplete","authLogout","authStatus","renderPlayerChip",
    "openDirector","runDirector","cancelDirectorRun","resolveSceneCustom",
    "modRegister","modInit","modStatus","modToggle","modRemove","modImportJSON","renderModList",
    "modEventsFor","modTabButtons","modRunAct","modRunYearly","modPromptBlocks"];
  for (i = 0; i < EXPECT_GLOBALS.length; i++)
    if (typeof window[EXPECT_GLOBALS[i]] === "undefined") missing.push("global:" + EXPECT_GLOBALS[i]);
  if (!missing.length) return true;
  bootRecoveryBanner(missing);
  return false;
})();
/* boot veil: Active-Theory-style preloader with REAL staged progress (not fake).
 * rAF counter runs from parse time; init() drives it to 100 and lifts the veil.
 * Failsafe CSS fades the veil anyway if boot JS never runs. */
var bvRAF=0, bvStarted=false;
function bvSet(n,cap){ try{
  var e=$("bvNum"),b=$("bvBar"),c=$("bvCap");
  if(e)e.textContent=(n<10?"0":"")+Math.round(n);
  if(b)b.style.transform="scaleX("+Math.max(0,Math.min(1,n/100))+")";
  if(cap&&c)c.textContent=cap;
}catch(e){} }
function bvStart(){ if(bvStarted)return; bvStarted=true;
  var t0=Date.now(), caps=["waking the biographer","reading a thousand fates","dealing traits","warming the markets"];
  try{
    (function tick(){ var v=$("bootVeil"); if(!v||v.classList.contains("done"))return;
      var t=(Date.now()-t0)/1000;
      bvSet(Math.min(88,t*22),caps[Math.min(caps.length-1,Math.floor(t/1.4))]);
      bvRAF=requestAnimationFrame(tick); })();
  }catch(e){} }
function bvDone(){ try{ cancelAnimationFrame(bvRAF); }catch(e){}
  /* a leftover done-veil (e.g. an interrupted earlier run) would make the
   * tick below exit instantly with the counter frozen at 00 — remove it and
   * skip the cinematic instead of wedging. */
  try{ var vx=$("bootVeil"); if(vx&&vx.classList.contains("done")){ if(vx.parentNode)vx.parentNode.removeChild(vx); return; } }catch(e){}
  /* Post-auth cinematic: the engine booted long ago (during intro/auth), so
   * instead of flashing 100, run a visible 0→100 count (~6s, staged captions)
   * while the motif plays — the loader must be SEEN to complete. */
  var DUR=6000, t0=Date.now();
  var caps=["waking the biographer","reading a thousand fates","dealing traits",
    "warming the markets","polishing the crown","the ledger is open"];
  try{ bvSet(0,caps[0]); }catch(e){}
  (function tick(){ var v=$("bootVeil"); if(!v||v.classList.contains("done"))return;
    var k=Math.min(1,(Date.now()-t0)/DUR), e=1-Math.pow(1-k,2);
    try{ bvSet(Math.round(e*100),caps[Math.min(caps.length-1,Math.floor(k*caps.length))]); }catch(e2){}
    if(k<1){ bvRAF=requestAnimationFrame(tick); return; }
    try{ if(typeof veilMusicSettle==="function")veilMusicSettle(); }catch(e3){}
    setTimeout(function(){ try{ var vv=$("bootVeil"); if(vv)vv.classList.add("done"); }catch(e4){} },350);
    setTimeout(function(){ try{ var vv=$("bootVeil"); if(vv&&vv.parentNode)vv.parentNode.removeChild(vv); }catch(e5){} },1400); })(); }
try{ bvStart(); }catch(e){}
function bootRecoveryBanner(missing){
  try{ var v=document.getElementById("bootVeil"); if(v)v.classList.add("done"); }catch(e){}
  try {
    if (document.getElementById("llBootFail")) return;
    var d = document.createElement("div");
    d.id = "llBootFail";
    d.setAttribute("role", "alert");
    d.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;" +
      "background:#3a0d0d;color:#ffe9e9;border:2px solid #ff6b6b;border-radius:12px;" +
      "padding:14px 16px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)";
    var safe = String(missing.join(", ")).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
    d.innerHTML = "<b>\u26A0\uFE0F Life &amp; Legacy failed to start.</b><br>" +
      "<span>Some engine files didn\u2019t load (" + safe + "). Your saved lives are untouched \u2014 try reloading.</span><br>" +
      '<button id="llBootReload" style="margin-top:10px;padding:8px 18px;font-size:14px;cursor:pointer">\u21BB Reload</button>';
    (document.body || document.documentElement).appendChild(d);
    var btn = document.getElementById("llBootReload");
    if (btn) btn.onclick = function () { location.reload(); };
  } catch (e) { /* banner is best-effort; never throw from the health check */ }
}
/* ============ SECTION 13 — boot/wiring (init + DOM listeners + exports) ============ */
function init(){
  if (!window.__LL_BOOT_OK) return; /* recovery banner already shown; stay inert, never throw */
  kvBootAdopt();
  try{ if(typeof LLUI!=="undefined"&&LLUI&&typeof LLUI.tab==="string"&&document.querySelector('.tab[data-tab="'+LLUI.tab+'"]'))curTab=LLUI.tab; }catch(e){}
  document.documentElement.dataset.theme=settings.theme;
  window.__lang=settings.lang;
  function on(el,ev,fn){ if(el)el.addEventListener(ev,fn); }
  function wireLang(sel,other){
    if(!sel)return; sel.value=settings.lang;
    on(sel,"change",function(e){ settings.lang=e.target.value; window.__lang=settings.lang;
      if(other)other.value=settings.lang;
      try{ localStorage.setItem("sdls_settings",JSON.stringify(settings)); }catch(err){}
      try{ if(typeof cloudMirrorSettings==="function")cloudMirrorSettings(); }catch(err){}
      applyTexts(); renderSaves(); });
  }
  wireLang($("langSel2"),null);
  var tst=$("themeSelTop"); if(tst){ tst.value=settings.theme; on(tst,"change",function(e){ setTheme(e.target.value); }); }
  function start(sel,fn){ var e=$(sel); if(e)e.onclick=fn; }
  start("newLifeBtn",function(){ newLife({}); toast("🌟 A new soul arrives!"); });
  start("newLifeBtn2",function(){ var st=loadAuto(); if(st){ var bad=validateSave(st);
    if(bad){ toast("⚠️ Autosave is damaged ("+bad+") — starting fresh."); newLife({}); }
    else { S=st; var res=afterLoad(); if(res==="newer")toast("⚠️ That life was saved by a newer version."); } } else { newLife({}); } });
  start("freshBtn",function(){ newLife({}); toast("🌟 A fresh soul arrives!"); });
  start("customBtn",function(){ openModal("createModal"); if(!geoDOB){var h=$("cDOBHint"); if(h)h.textContent="Set your DOB to unlock country, region & city.";} drawStartLine(); });
  on($("cRace"),"change",toggleMixedRow);
  on($("cBio"),"change",toggleSexSections);
  on($("cDOB"),"input",function(){ dobChanged(false); });
  on($("cDOB"),"change",function(){ dobChanged(false); });
  on($("cAge"),"change",drawStartLine);
  start("cDOBCal",function(){
    var ds=$("cDOBDate");
    if(ds&&ds.showPicker){ try{ ds.showPicker(); }catch(e){ ds.focus(); ds.click(); } }
    else if(ds){ ds.focus(); ds.click(); }
    else toast("📅 Type your birth date as MM/DD/YYYY.");
  });
  on($("cDOBDate"),"change",function(){
    var v=$("cDOBDate").value;
    if(v){ var p=v.split("-"); $("cDOB").value=(+p[1])+"/"+(+p[2])+"/"+p[0]; dobChanged(true); }
  });
  on($("cCountry"),"change",renderGeoControls);
  on($("cRegionSel"),"change",renderCityControl);
  on($("cBg"),"change",toggleCustomBg);
  start("focusDictateGo",dictateFocus);
  on($("focusDictate"),"keydown",function(e){ if(e.key==="Enter")dictateFocus(); });
  (function(){ var els=document.querySelectorAll(".appr"); for(var i=0;i<els.length;i++)on(els[i],"change",drawApprFx); })();
  start("quickPeasant",function(){ newLife({wealth:"poor"}); toast("🌱 Born with nothing but hunger."); });
  start("quickRoyal",function(){ newLife({wealth:"rich"}); toast("👑 Born into silk sheets."); });
  start("quickChaos",function(){ newLife({wealth:"middle",fate:{nemesis:true,ill:false,trust:false}}); toast("🎲 Chaos chose you. Good luck."); });
  $("randomizeBtn").onclick=function(){ var g=$("cBio").value==="other"?pick(["male","female"]):$("cBio").value; $("cFirst").value=rNameG(g).split(" ")[0]; $("cLast").value=pick(LAST);
    function rsel(id,arr){ var e=$(id); if(e)e.selectedIndex=Math.floor(rnd()*arr.length); }
    rsel("cRace",RACES); toggleMixedRow();
    if($("cRace").value==="Mixed"){ rsel("cRaceF",RACES_MIXABLE); rsel("cRaceM",RACES_MIXABLE); }
    if(!geoDOB||rnd()<0.6){
      var ry=1850+Math.floor(rnd()*161), rm=1+Math.floor(rnd()*12), rd=1+Math.floor(rnd()*28);
      var dim=new Date(ry,rm,0).getDate(); if(rd>dim)rd=dim;
      $("cDOB").value=rm+"/"+rd+"/"+ry; dobChanged(false);
    }
    renderGeoControls();
    rsel("cSkin",SKINS); rsel("cEyes",EYES); rsel("cBuild",BUILDS);
    rsel("cHeight",HEIGHTS); rsel("cFigure",FIGURES); rsel("cHairstyle",HAIRSTYLES);
    rsel("cHaircolor",HAIRCOLORS); rsel("cHairlen",HAIRLENS); rsel("cFace",FACES);
    rsel("cFacial",FACIALS); rsel("cMarks",MARKS); rsel("cStyle",STYLES); rsel("cVoice",VOICES);
    /* genetic markers randomize rare (they're lineage, not fashion) */
    function msel(id,p){ var e=$(id); if(e)e.checked=rnd()<p; }
    msel("cMkRed",0.08); msel("cMkFreck",0.2); msel("cMkDimp",0.25); msel("cMkHet",0.02);
    msel("cMkHirs",0.06); msel("cMkTwin",0.12);
    var mi=$("cMkIll"); if(mi)mi.value=rnd()<0.9?"none":pick(["salt","thin","sweet"]);
    toggleSexSections();
    drawApprFx();
    rsel("cBg",window.GDATA.backgrounds); toggleCustomBg(); rsel("cAmb",window.GDATA.ambitions);
    var boxes=document.querySelectorAll('#traitGrid input[data-trait]');
    for(var i=0;i<boxes.length;i++)boxes[i].checked=false;
    var pers=window.GDATA.traits.filter(function(t){ return !t.congenital; });
    var n=2+Math.floor(rnd()*2), used={};
    for(var j=0;j<n;j++){ var t=pick(pers); if(used[t.id])continue; used[t.id]=1; var el=document.querySelector('#traitGrid input[data-trait="'+t.id+'"]'); if(el)el.checked=true; }
    if(rnd()<0.14){ var cg=pick(window.GDATA.traits.filter(function(t){ return t.congenital; })); var ce=document.querySelector('#traitGrid input[data-trait="'+cg.id+'"]'); if(ce)ce.checked=true; }
    for(var k in attrAlloc)attrAlloc[k]=0; drawAttr();
    toast("🎲 Custom life randomized — traits, roots, look, ambition!"); };
  $("startCustomBtn").onclick=function(){
    if(!geoDOB||!dobChanged(false)){ toast("📅 Set a valid date of birth first (MM/DD/YYYY)!"); return; }
    if(!geoCountry()){ toast("🌍 Pick a country that existed on that date!"); return; }
    newLife(collectCreateOpts());
    closeModal("createModal"); };
  $("evCustomBtn").onclick=function(){ $("evIdeaBox").classList.add("hidden"); $("evCustomBox").classList.toggle("hidden"); };
  $("evIdeaBtn").onclick=function(){ $("evCustomBox").classList.add("hidden"); $("evIdeaBox").classList.toggle("hidden"); };
  $("directTop").onclick=function(){ openDirector(); };
  $("artBtn").onclick=function(){ toggleArt(); };
  (function(){ var b=$("artBtn"); if(b)setLabel("artBtn",artEnabled()?"🎨 Art":"🎨 No-art"); })();
  start("musicBtn",function(){ toggleMusic(); });
  $("directorGo").onclick=function(){ runDirector(false); };
  $("directorRandom").onclick=function(){ try{ sfx("dice"); }catch(e){} runDirector(true); };
  $("sceneCustomGo").onclick=resolveSceneCustom;
  $("sceneCancel").onclick=function(){ try{ cancelDirectorRun(); }catch(e){} };
  $("sceneBack").onclick=function(){ try{ if(typeof sceneBusy!=="undefined"&&sceneBusy&&typeof cancelDirectorRun==="function")cancelDirectorRun(); }catch(e){} $("sceneBox").classList.add("hidden"); $("directorBox").classList.remove("hidden"); $("directorInput").value=""; $("directorInput").focus(); };
  $("directorInput").addEventListener("keydown",function(e){ if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){ runDirector(false); } });
  $("evCustomGo").onclick=aiCustomResponse;
  $("evIdeaGo").onclick=aiCustomEvent;
  $("storyBtn").onclick=function(){ maybeStory(true); };
  start("sSaves",function(){ renderSaves(); openModal("saveModal"); });
  start("bugBtn",function(){ openBugModal(); });
  start("helpBugBtn",function(){ closeModal("helpModal"); openBugModal(); });
  start("bugClear",function(){ clearBugLog(); });
  start("communityLoadBtn",function(){ loadCommunityBox(); });
  start("aiProvTest",function(){ aiProviderTest(); });
  start("aiProvSave",function(){
    var cfg=aiCfg();
    var sel=$("aiProvSel");
    cfg.active=(sel&&(sel.value==="perchance"||sel.value==="openai"||sel.value==="gemini"))?sel.value:"gemini";
    if($("aiProvBase")&&$("aiProvBase").value.trim())cfg.openai.base=$("aiProvBase").value.trim();
    if($("aiProvModel")&&$("aiProvModel").value.trim())cfg.openai.model=$("aiProvModel").value.trim();
    if($("aiProvKey")&&$("aiProvKey").value){ cfg.openai.key=$("aiProvKey").value; $("aiProvKey").value=""; }
    aiCfgSave(cfg); renderAiProvider();
  });
  on($("aiProvSel"),"change",function(){ try{ renderAiProvider(); }catch(e){} });
  start("groundRefreshBtn",function(){
    var b=$("groundRefreshBtn");
    if(b){ b.disabled=true; b.textContent="⏳ Searching…"; }
    Promise.resolve(refreshGrounding()).finally(function(){
      if(b){ b.disabled=false; b.textContent="🔍 Refresh Search Grounding"; }
    });
  });
/* Offline posture: offline is a valid state, not an error. The whole sim
 * (events, years, saves, shipped art/music) is local; only fresh AI calls
 * need network, and every one of them has a deterministic fallback (the
 * perf-test offline drill proves 10 years with zero throws). This just tells
 * the truth in the UI: a persistent bar + toasts on transitions. */
function renderOffline(){
  try{
    var off=!window.navigator||window.navigator.onLine===false;
    var bar=$("offlineBar"); if(bar)bar.classList.toggle("hidden",!off);
    try{ document.body.classList.toggle("is-offline",off); }catch(e){}
  }catch(e){}
}
if(!window.__llOfflineWired){ window.__llOfflineWired=true;
window.addEventListener("offline",function(){ renderOffline(); toast("📴 You're offline — the sim keeps working, AI improvises locally."); });
window.addEventListener("online",function(){ renderOffline(); toast("🌐 Back online — full AI restored."); });
}
try{ renderOffline(); }catch(e){}
  start("anyaAskBtn",function(){ anyaAsk(); });
  start("anyaClearBtn",function(){ anyaClear(); });
  on($("anyaInput"),"keydown",function(e){ if(e.key==="Enter"){ anyaAsk(); } });
  (function(){ var chips=document.querySelectorAll("#anyaChips button[data-q]");
    for(var i=0;i<chips.length;i++)(function(b){ b.onclick=function(){ anyaSuggest(b.getAttribute("data-q")); }; })(chips[i]); })();
  start("sHelp",function(){ openModal("helpModal"); try{ preloadCommunity(); }catch(e){}
  try{ renderAiProvider(); }catch(e){}
  try{ anyaGreet(); }catch(e){}
  try{ renderModList(); }catch(e){}
  var ai=$("anyaInput"); if(ai)setTimeout(function(){ try{ ai.focus(); }catch(e){} },120);
  setTimeout(function(){
    try{ var c=document.querySelector("#nested-plugin-container .item-header");
      if(c&&!c.closest(".item-wrapper").querySelector(".item-body"))c.click();
    }catch(e){}
  },350); });
  on($("chatNpcSel"),"change",function(e){ chatNpcId=e.target.value; var n=npcById(chatNpcId); if(n){ fillChatSettings(n); renderChatThread(); } });
  start("chatSend",chatSend);
  on($("chatInput"),"keydown",function(e){
    if(e.key==="Enter"){ chatCmdHide(); chatSend(); }
    else if(e.key==="Escape"){ chatCmdHide(); }
    else if(e.key==="Tab"){ var box=$("chatCmds"); if(box&&!box.classList.contains("hidden")){ e.preventDefault(); var b=box.querySelector("button"); if(b)b.click(); } }
  });
  on($("chatInput"),"input",function(){ try{ chatCmdHint(); }catch(e){} });
  start("chatArtBtn",function(){ chatArt("scene"); });
  start("chatPortraitBtn",function(){ chatArt("portrait"); });
  on($("chatRel"),"input",function(e){ var n=npcById(chatNpcId); if(!n)return; n.rel=clamp100(+e.target.value); var rv=$("chatRelVal"); if(rv)rv.textContent=Math.round(n.rel)+" · "+chatRelWord(n.rel); wPushRel(n); chatRefreshSel(n); });
  on($("chatRel"),"change",function(){ autosave(); render(); });
  on($("chatRole"),"change",function(e){ var n=npcById(chatNpcId); if(!n)return; chatSetRole(n,e.target.value); fillChatSettings(n); chatRefreshSel(n); renderChatThread(); });
  on($("chatTraits"),"change",function(e){ var n=npcById(chatNpcId); if(!n)return; n.traits=String(e.target.value).split(",").map(function(s){return s.trim().slice(0,24);}).filter(Boolean).slice(0,4); if(!n.traits.length)n.traits=["ordinary"]; npcMem(n,"You remade their personality. (cheat)"); toast("🎭 Traits updated."); autosave(); });
  start("chatMemSave",function(){ var n=npcById(chatNpcId); if(!n)return; n.mem=String($("chatMem").value||"").slice(0,1200); toast("💾 Memory saved — they'll remember this."); autosave(); });
  start("chatMemWipe",function(){ var n=npcById(chatNpcId); if(!n)return; n.mem=""; n.memLog=[]; if($("chatMem"))$("chatMem").value=""; toast("🧹 They forgot everything about you."); autosave(); });
  start("chatHistClear",function(){ var n=npcById(chatNpcId); if(!n)return; n.chat=[]; renderChatThread(); toast("🗑️ Chat cleared."); autosave(); });
  on($("chatImgStyle"),"change",function(e){ if(!S.chatImg)S.chatImg={style:"cine",res:"512x512"}; S.chatImg.style=e.target.value; autosave(); });
  on($("chatImgRes"),"change",function(e){ if(!S.chatImg)S.chatImg={style:"cine",res:"512x512"}; S.chatImg.res=e.target.value; autosave(); toast("🖼️ Image size: "+e.target.value); });
  start("ageBtn",function(){ ageUp(false); });
  start("autoBtn",toggleAuto);
  try{ var mb=$("moreBtn"), ta=$("topActions"); if(mb&&ta)mb.onclick=function(){ ta.classList.toggle("open"); }; }catch(e){}
  try{ var at=$("achToggle"); if(at)at.onclick=function(){ window.__llAchAll=!window.__llAchAll; try{ renderAch(); }catch(e){} }; }catch(e){}
  try{
    var cSecs=document.querySelectorAll("#createModal .secttl");
    for(var ci=0;ci<cSecs.length;ci++)(function(h){
      if(h.querySelector(".chev"))return;
      var c=document.createElement("span"); c.className="chev"; c.textContent="▼"; h.appendChild(c);
      h.title="Collapse / expand section";
      h.onclick=function(){
        var el=h.nextElementSibling, shut=h.dataset.shut==="1";
        h.dataset.shut=shut?"":"1"; c.textContent=shut?"▼":"▶";
        while(el&&!el.classList.contains("secttl")){ el.classList.toggle("csec-hidden",!shut); el=el.nextElementSibling; }
      };
    })(cSecs[ci]);
  }catch(e){}
  var tabs=document.querySelectorAll(".tab");
  for(var i=0;i<tabs.length;i++)tabs[i].onclick=function(){ curTab=this.dataset.tab; try{ LLUI.tab=curTab; }catch(e){} try{ if(typeof cloudMirrorSettings==="function")cloudMirrorSettings(); }catch(e){} render(); };
  start("saveBtn",function(){ renderSaves(); openModal("saveModal"); });
  start("treeBtn",openDynasty);
  start("tlGo",function(){ tlSearch(); });
  start("tlAnalyzeBtn",function(){ wAnalyzeDivergence($("tlAnalyzeBtn")); });
  on($("tlQ"),"keydown",function(e){ if(e.key==="Enter")tlSearch(); });
  start("endBtn",function(){ if(confirm(t("confirmEnd")))die("your own choice — a full stop, on your terms"); });
  start("newBtn",function(){ newLife({}); });
  start("againBtn",goHome);
  start("homeLogo",goHome);
  start("homeTitle",goHome);
  on($("homeLogo"),"keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); goHome(); } });
  on($("homeTitle"),"keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); goHome(); } });
  document.addEventListener("keydown",function(e){
    if((e.code==="Space"||e.key===" ")&&S&&S.alive&&!$("gameScreen").classList.contains("hidden")){
      var tag=(document.activeElement&&document.activeElement.tagName)||"";
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")return;
      if(document.querySelector(".overlay:not(.hidden)"))return;
      e.preventDefault(); ageUp(false);
    }
  });
  var hb=$("heirBtn"); if(hb)hb.onclick=continueAsHeir;
  var cb=$("copyLegacyBtn"); if(cb)cb.onclick=copyLegacySummary;
  $("importBtn").onclick=function(){ $("fileInput").click(); };
  $("fileInput").onchange=function(e){ var f=e.target.files[0]; if(!f)return; var r=new FileReader();
    r.onload=function(){ try{ var imp=JSON.parse(r.result); var bad=validateSave(imp&&imp.state!==undefined?imp.state:imp);
      if(bad){ toast("❌ Bad file ("+bad+")"); return; }
      S=(imp&&imp.state!==undefined&&imp.savedAt!==undefined)?imp.state:imp;
      var res=afterLoad(); toast(res==="newer"?"⚠️ Imported life (saved by a newer version)!":"📤 Imported life!"); }catch(err){ toast("❌ Bad file"); } }; r.readAsText(f); };
  var closes=document.querySelectorAll("[data-close]");
  for(var c=0;c<closes.length;c++)closes[c].onclick=function(){ closeModal(this.dataset.close); };
  $("cCountry").innerHTML="<option>Set DOB first</option>"; $("cCountry").disabled=true;
  ["cRegionSel","cRegionTxt","cCitySel","cCity"].forEach(function(id){var e=$(id); if(e)e.disabled=true;});
  fillCreateModal();
  $("randomizeBtn").click();
  applyTexts(); renderSaves(); try { bugSyncLive(); } catch (e) {} renderBugBtn(); try { if (typeof renderAiPill === "function") renderAiPill(); } catch (e) {}
  try { if (typeof renderAch === "function") renderAch(); } catch (e) {}
  try { applyMusic(); } catch (e) {}
  try { vfxInit(); } catch (e) {}
  try { modInit(); } catch (e) {}
  start("modImportBtn",function(){ try{
    var t=$("modImport"), res=$("modImportRes");
    var r=modImportJSON(t?t.value:"");
    if(res)res.textContent=r.ok?("Installed '"+r.id+"' — content merging in."):("Bad mod: "+(r.errors&&r.errors[0]||"rejected"));
    if(t&&r.ok)t.value="";
  }catch(e){} });
  /* the veil is the THIRD leg (intro → auth → veil → main): the engine is
   * booted underneath, but the veil only lifts once the prelude is done.
   * 3-minute failsafe lifts it anyway so a stuck auth can never trap anyone. */
  try {
    var authWaits=0;
    (function liftWhenAuthed(){
      if(window.__LL_AUTH_DONE||authWaits++>600){ bvDone(); return; }
      setTimeout(liftWhenAuthed,300);
    })();
  } catch (e) { try { bvDone(); } catch (e2) {} }
}
window.newLife=newLife; window.ageUp=ageUp; window.doAct=doAct; window.partnerName=partnerName;
window.heirPlan=heirPlan; window.continueAsHeir=continueAsHeir;
window.getS=function(){ return S; };
window.wTimeline=function(){ return wTimelineList(); };
window.wTimelineSearch=function(q,y0,y1,st){ return wSearchTimeline(q,y0,y1,st); };
document.addEventListener("DOMContentLoaded",init);
