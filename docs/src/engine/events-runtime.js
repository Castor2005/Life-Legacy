/* LIFE & LEGACY — engine/events-runtime.js
 * SECTION 6a event queue/modal/paint + image engine (content loader lands here in Phase 5).
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ content loader (Phase 5: data-driven events, v4 dedup layout) ============
 * window.EVENTS is built by compiling src/content JSON packs for the ages
 * actually played (see src/content/index.json). Age buckets (baby→senior)
 * carry ONLY their exclusive events; everything else 18+ (all sx-/ow-/ex-,
 * all multi-bracket standards, all boundary events spanning the 18 line)
 * lives ONCE in the `mature` overlay pack (18-120), lazy-loaded + cached the
 * first time the character reaches 18 — switching adult brackets never
 * re-fetches it. Bucket packs prefetch the next life stage; if pack fetch
 * fails (e.g. unsaved preview without fetch), the generated fallback
 * snapshot is lazy-loaded once via script tag.
 * Compiled events keep the legacy shape {id,minAge,maxAge,title,text,choices}
 * so fireEvent/showEvent below are untouched. */
window.EVENTS = window.EVENTS || [];
var contentState = { index: null, loaded: {}, loading: {}, fallbackLoading: false, fallbackFailed: false };
var CONTENT_BUCKETS = [
  { id: 'baby', minAge: 0, maxAge: 4 }, { id: 'kid', minAge: 5, maxAge: 12 },
  { id: 'teen', minAge: 13, maxAge: 17 }, { id: 'young', minAge: 18, maxAge: 29 },
  { id: 'adult', minAge: 30, maxAge: 44 }, { id: 'mid', minAge: 45, maxAge: 59 },
  { id: 'senior', minAge: 60, maxAge: 120 }
];
function contentBucketForAge(age){
  for(var i=0;i<CONTENT_BUCKETS.length;i++)
    if(age>=CONTENT_BUCKETS[i].minAge&&age<=CONTENT_BUCKETS[i].maxAge)return CONTENT_BUCKETS[i].id;
  return 'senior';
}
function contentMerge(rawList){
  var have={}, added=0;
  for(var i=0;i<window.EVENTS.length;i++)have[window.EVENTS[i].id]=1;
  for(var j=0;j<rawList.length;j++){
    var ev=rawList[j];
    if(!ev||!ev.id||have[ev.id])continue;
    try{ ev=migrateEvent(ev); window.EVENTS.push(LL.fxRun.compileEvent(ev)); have[ev.id]=1; added++; }
    catch(e){ if(window.console&&console.warn)console.warn("content: skip "+ev.id+": "+(e&&e.message)); }
  }
  return added;
}
function loadScriptOnce(src){
  return new Promise(function(res,rej){
    var s=document.createElement("script"); s.src=src;
    s.onload=function(){res();}; s.onerror=function(){rej(new Error("script load failed "+src));};
    document.head.appendChild(s);
  });
}
async function contentFallbackFor(bucketId){
  var fb=window.EVENTS_FALLBACK;
  if((!fb||!fb.length)&&!contentState.fallbackLoading&&!contentState.fallbackFailed){
    contentState.fallbackLoading=true;
    try{ await loadScriptOnce("src/engine/content-fallback.js"); }
    catch(e){ contentState.fallbackFailed=true; }
    fb=window.EVENTS_FALLBACK;
  }
  if(fb&&fb.length){
    var b=null;
    for(var i=0;i<CONTENT_BUCKETS.length;i++)if(CONTENT_BUCKETS[i].id===bucketId)b=CONTENT_BUCKETS[i];
    if(!b&&bucketId===MATURE_PACK_ID)b=MATURE_PACK_RANGE;
    var list=b?fb.filter(function(e){ return e.minAge<=b.maxAge&&e.maxAge>=b.minAge; }):fb;
    contentMerge(list);
  }
}
/* ---- mature overlay: every 18+ non-exclusive event, stored once ----
 * Loaded lazily the first time the character reaches 18, then cached in
 * memory for the rest of the life (contentState.loaded.mature), so moving
 * between young/adult/mid/senior never re-fetches it. contentMerge dedups by
 * id, so double-loads are harmless no-ops. */
var MATURE_PACK_ID="mature";
var MATURE_PACK_RANGE={minAge:18,maxAge:120};
async function ensureMature(){
  if(contentState.loaded[MATURE_PACK_ID])return true;
  if(contentState.loading[MATURE_PACK_ID])return contentState.loading[MATURE_PACK_ID];
  contentState.loading[MATURE_PACK_ID]=(async function(){
    try{
      var pr=await fetch("src/content/packs/"+MATURE_PACK_ID+".json");
      if(!pr.ok)throw new Error("pack "+MATURE_PACK_ID+" "+pr.status);
      var pack=await pr.json();
      contentMerge(pack.events||[]);
      try{ if(typeof modEventsFor==="function")contentMerge(modEventsFor(MATURE_PACK_ID)); }catch(e){}
    }catch(err){ await contentFallbackFor(MATURE_PACK_ID); }
    contentState.loaded[MATURE_PACK_ID]=true;
    return true;
  })();
  return contentState.loading[MATURE_PACK_ID];
}
async function ensureContentForAge(age, noPrefetch){
  var b=contentBucketForAge(age);
  if(contentState.loaded[b])return true;
  if(contentState.loading[b])return contentState.loading[b];
  contentState.loading[b]=(async function(){
    try{
      if(!contentState.index){
        var r=await fetch("src/content/index.json");
        if(!r.ok)throw new Error("index "+r.status);
        contentState.index=await r.json();
        var chk=checkContentVersion(contentState.index.contentVersion);
        if((!chk.ok||chk.level!=="match")&&window.console&&console.warn)
          console.warn(chk.message+", loader wants v"+LL.CONTENT_VERSION);
      }
      var pr=await fetch("src/content/packs/"+b+".json");
      if(!pr.ok)throw new Error("pack "+b+" "+pr.status);
      var pack=await pr.json();
      contentMerge(pack.events||[]);
      try{ if(typeof modEventsFor==="function")contentMerge(modEventsFor(b)); }catch(e){}
      if(age>=MATURE_PACK_RANGE.minAge)ensureMature();
    }catch(err){ await contentFallbackFor(b); if(age>=MATURE_PACK_RANGE.minAge)await ensureMature(); }
    contentState.loaded[b]=true;
    if(!noPrefetch){
      for(var i=0;i<CONTENT_BUCKETS.length;i++){
        if(CONTENT_BUCKETS[i].id===b&&i+1<CONTENT_BUCKETS.length){
          ensureContentForAge(CONTENT_BUCKETS[i+1].minAge,true);
          break;
        }
      }
    }
    return true;
  })();
  return contentState.loading[b];
}
if(typeof document!=="undefined")ensureContentForAge(0);
/* ============ SECTION 6a — events (queue + scripted pool + modal) ============ */
var evQueue=[];
var SEEN_MAX=200;
async function fireEvent(){
  if(S&&typeof S.age==="number"){ try{ await ensureContentForAge(S.age); }catch(e){} }
  var pool=window.EVENTS.filter(function(e){ return S.age>=e.minAge&&S.age<=e.maxAge&&(!e.cond||e.cond(S))&&!(S.flags.noBad&&BAD_IDS[e.id]); });
  if(!pool.length)return;
  /* Rotation: skip recently fired events when alternatives exist, so back-to-back
   * repeats stop happening. Weights are honored (1..10, validated per event). */
  var seen=S.seenEvents||(S.seenEvents=[]);
  var fresh=pool.filter(function(e){ return seen.indexOf(e.id)<0; });
  var src=fresh.length?fresh:pool;
  if(!fresh.length)seen.length=0;
  /* PCG lean: the year's rhythm tilts the dice — work years surface job
   * events, love years surface romance, risk years let crime through. The
   * never[] list from the agent plan suppresses off-rhythm extremes. */
  var wts = null;
  try {
    if (window.LL && LL.pcg && typeof LL.pcg.eventWeightMult === "function") {
      wts = src.map(function (e) {
        var base = ((e.weight | 0) > 0 ? e.weight : 1);
        var mult = 1;
        try { mult = LL.pcg.eventWeightMult(e) || 1; } catch (ee) {}
        return base * mult;
      });
    }
  } catch (e) { wts = null; }
  var tot=0,i;
  if (wts) { for(i=0;i<src.length;i++)tot+=wts[i]; }
  else { for(i=0;i<src.length;i++)tot+=((src[i].weight|0)>0?src[i].weight:1); }
  var r=(typeof rnd==="function"?rnd():Math.random())*tot, ev=src[src.length-1];
  for(i=0;i<src.length;i++){ var __w = wts ? wts[i] : (((src[i].weight|0)>0)?src[i].weight:1); r-=__w; if(r<=0){ ev=src[i]; break; } }
  seen.push(ev.id); if(seen.length>SEEN_MAX)seen.splice(0,seen.length-SEEN_MAX);
  showEvent(ev);
}
var curEvent=null, evImgToken=0;
function showEvent(ev){
  curEvent=ev;
  $("evCustomBox").classList.add("hidden"); $("evIdeaBox").classList.add("hidden");
  paintEvent(ev);
  var txt=(typeof ev.text==="function"?ev.text(S):ev.text);
  $("evTitle").textContent=ev.title;
  streamEvText(txt);
  var box=$("evChoices"); box.innerHTML="";
  /* one choice per event: the first click wins — buttons lock instantly so a
   * fast double-click can never apply the same fx twice. */
  var evDone=false;
  function lockChoices(){ var bs=box.querySelectorAll("button"); for(var li=0;li<bs.length;li++)bs[li].disabled=true; }
  ev.choices.forEach(function(ch){
    var b=document.createElement("button"); b.className="choice";
    b.innerHTML="<b>"+esc(ch.label)+"</b>"+(ch.hint?"<small>"+esc(ch.hint)+"</small>":"");
    b.onclick=function(){ if(evDone)return; evDone=true; lockChoices();
      try{ if(evStreamTimer){clearInterval(evStreamTimer);evStreamTimer=null;} }catch(e){}
      var out; try{ out=ch.fx(S); }catch(err){ out="Fate shrugs — nothing much changes."; }
      pushLog(S.age,"✨",ev.title+": "+out,"event");
      toast(out); closeModal("eventModal"); checkDeath(); autosave(); render(); refreshDesc(); };
    box.appendChild(b);
  });
  openModal("eventModal");
}
/* streaming event text: fast typewriter (click text = instant complete).
 * Pure feel — a 400-char event lands in ~300ms, zero gameplay delay.
 * Respects reduced-motion (instant), self-clears if the modal closes. */
var evStreamTimer=null;
function streamEvText(txt){
  var el=$("evText"); if(!el)return;
  try{ if(evStreamTimer){clearInterval(evStreamTimer);evStreamTimer=null;} }catch(e){}
  txt=String(txt==null?"":txt);
  var reduce=false; try{ reduce=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches); }catch(e){}
  el.onclick=null;
  if(reduce||txt.length<120){ el.textContent=txt; return; }
  var i=0; el.textContent="";
  el.onclick=function(){ if(i<txt.length){ i=txt.length; el.textContent=txt; } };
  evStreamTimer=setInterval(function(){
    try{
      if(!curEvent||!document.body.contains(el)||$("eventModal").classList.contains("hidden")){ clearInterval(evStreamTimer); evStreamTimer=null; return; }
      i=Math.min(txt.length,i+45); el.textContent=txt.slice(0,i);
      if(i>=txt.length){ clearInterval(evStreamTimer); evStreamTimer=null; el.onclick=null; }
    }catch(e){ try{clearInterval(evStreamTimer);}catch(e2){} evStreamTimer=null; }
  },30);
}
/* ---- photorealistic event art, same protagonist ---- */
function photoNeg(extra){ return "cartoon, illustration, painting, drawing, anime, CGI, 3d render, deformed, different person, face change, morphing, blurry, text, watermark, logo"+(extra?", "+extra:""); }

/* ---- unified realistic image engine (basic + advanced plugins) ----
 * requestImage() races BOTH plugins with the basic one starting immediately:
 * the advanced plugin is a deprecated stub that usually hangs forever, so the
 * old "20s advanced head-start" made EVERY image take 20s+ before the working
 * basic leg even started. Now basic starts at t=0 and advanced joins as a
 * backup after a short delay; the first dataUrl wins, failures resolve null.
 * Return shape is always normalized to the basic result ({dataUrl, canvas,
 * inputs}) or null. Hardening: every attempt races a timeout (cross-origin
 * image iframes can hang instead of rejecting on itch.io / partitioned
 * embeds), and the basic fallback escapes perchance specials so
 * plaintext-equivalent prompts still render. Callers keep their token guards
 * + loaders; they just swap Promise.resolve(root.generateImage(...)) for
 * requestImage(...). */
/* 120s per attempt (see above for why hangs happen). requestImage() always
 * SETTLES (resolves null on total failure, never hangs, never rejects), so
 * every caller must handle the null path: hide its loader, keep the fallback
 * (avatar emoji / hidden img), and leave a retry path — never a stuck
 * spinner. */
/* Master art switch: window.LL_ART=false (or localStorage ll_art_off=1)
 * skips all generation instantly — painters keep their fallbacks. Toggle it
 * live from the topbar 🎨 button (wired in boot.js). */
if(window.LL_ART===undefined){
  try{ window.LL_ART=!(window.localStorage&&window.localStorage.getItem("ll_art_off")==="1"); }
  catch(e){ window.LL_ART=true; }
}
function artEnabled(){ return window.LL_ART!==false; }
function toggleArt(){
  window.LL_ART=!artEnabled();
  try{
    if(window.localStorage){
      if(window.LL_ART)window.localStorage.removeItem("ll_art_off");
      else window.localStorage.setItem("ll_art_off","1");
    }
  }catch(e){}
  var b=$("artBtn"); if(b)setLabel("artBtn",window.LL_ART?"🎨 Art":"🎨 No-art");
  toast(window.LL_ART?"🎨 AI art ON — portraits & scenes will paint.":"🎨 AI art OFF — game runs text-only (faster).");
  return window.LL_ART;
}
var IMAGE_TIMEOUT_MS=(window.LL_AI_IMAGE_TIMEOUT_MS||120000);
var IMAGE_SECOND_MS=(window.LL_AI_IMAGE_SECOND_MS||4000);
function imageTimeout(ms){
  return new Promise(function(_,rej){ setTimeout(function(){ rej(new Error("image timeout "+ms+"ms")); },ms); });
}
function escapeImagePrompt(s){ return String(s==null?"":s).replace(/[\[\]\{\}\\]/g,"\\$&"); }
function normalizeImageResult(r){
  if(!r)return null;
  if(r.dataUrl)return r;
  if(Object.prototype.toString.call(r)==="[object Array]")return r[0]||null;
  if(r.generations&&r.generations.length)return r.generations[0]||null;
  return null;
}
function viaBasicImage(base){
  var b={prompt:escapeImagePrompt(base.prompt),negativePrompt:base.negativePrompt,resolution:base.resolution||"512x512",guidanceScale:base.guidanceScale||9,seed:base.seed};
  try{ return Promise.resolve(root.generateImage(b)); }
  catch(e){ return Promise.reject(e); }
}
function viaAdvancedImage(base){
  var adv={plaintext:true,prompt:base.prompt,negativePrompt:base.negativePrompt,resolution:base.resolution||"512x512",guidanceScale:base.guidanceScale||9,seed:base.seed};
  try{ return Promise.resolve(root.generateImageAdv(adv)); }
  catch(e){ return Promise.reject(e); }
}
function requestImage(opts){
  opts=opts||{};
  if(!artEnabled())return Promise.resolve(null);
  var seed=(opts.seed===undefined||opts.seed===null)?((S&&S.imgSeed)||-1):opts.seed;
  var base={prompt:String(opts.prompt||"").slice(0,900),negativePrompt:opts.negativePrompt,resolution:opts.resolution||"512x512",guidanceScale:opts.guidanceScale||9,seed:seed};
  function basicAttempt(){ return Promise.race([viaBasicImage(base),imageTimeout(IMAGE_TIMEOUT_MS)]); }
  function advancedAttempt(){ return Promise.race([viaAdvancedImage(base),imageTimeout(IMAGE_TIMEOUT_MS)]); }
  function norm(r){ try{ return normalizeImageResult(r); }catch(e){ return null; } }
  if(!root.generateImageAdv){ var _nl=function(v){ try{ if(typeof imgNoteOnline==="function")imgNoteOnline(!!(v&&v.dataUrl)); }catch(e){} };
    return basicAttempt().then(function(r){ var n=norm(r); _nl(n); return n; },function(){ _nl(null); return null; }); }
  if(!root.generateImage){ var _nl2=function(v){ try{ if(typeof imgNoteOnline==="function")imgNoteOnline(!!(v&&v.dataUrl)); }catch(e){} };
    return advancedAttempt().then(function(r){ var n=norm(r); _nl2(n); return n; },function(){ _nl2(null); return null; }); }
  /* basic starts NOW, advanced joins after IMAGE_SECOND_MS as backup */
  return new Promise(function(resolve){
    var settled=false, advStarted=false, advSettled=false, basicFailed=false;
    function finish(v){ if(!settled){ settled=true;
      try{ if(typeof imgNoteOnline==="function")imgNoteOnline(!!(v&&v.dataUrl)); }catch(e){}
      resolve(v); } }
    function advSettledFn(okVal){
      advSettled=true;
      if(okVal)finish(okVal); else if(basicFailed)finish(null);
    }
    function startAdv(){
      if(advStarted||settled)return; advStarted=true;
      advancedAttempt().then(function(r){ var n=norm(r); advSettledFn(n&&n.dataUrl?n:null); },
        function(){ advSettledFn(null); });
    }
    function basicSettled(r){
      var n=norm(r);
      if(n&&n.dataUrl){ finish(n); return; }
      basicFailed=true;
      if(advSettled)finish(null); else startAdv();
    }
    var backupTimer=setTimeout(startAdv,IMAGE_SECOND_MS);
    basicAttempt().then(function(r){ clearTimeout(backupTimer); basicSettled(r); },
      function(){ clearTimeout(backupTimer); basicSettled(null); });
  });
}
/* tap-to-retry loader: on failure the shimmer becomes a retry button */
function artRetry(el,fn){
  if(!el)return;
  el.style.display="flex"; el.style.cursor="pointer"; el.style.pointerEvents="auto";
  el.innerHTML='🎨 <span>Art fizzled — <b><u>tap to retry</u></b></span>';
  el.onclick=function(ev){ if(ev)ev.stopPropagation(); el.onclick=null; el.style.cursor=""; fn(); };
}
function paintEvent(ev){
  var my=++evImgToken;
  var wrap=$("evImgWrap"), img=$("evImg"), load=$("evImgLoad");
  if(!wrap||!img)return;
  wrap.style.display=""; img.hidden=true; img.removeAttribute("src"); if(load){load.style.display="flex";load.onclick=null;load.style.cursor="";load.innerHTML="🎨 <span>Painting this moment…</span>";}
  if(!artEnabled()){ if(load)load.style.display="none"; return; }
  var scene=""; try{ scene=typeof ev.text==="function"?ev.text(S):ev.text; }catch(e){ scene=ev.title||""; }
  /* composition FIRST (wide scene, never a close-up), short identity anchor last, fresh seed every call */
  var prompt="Ultra-photorealistic cinematic film still, real human photography, natural skin texture, realistic lighting, no cartoon no illustration no painting no text no watermark. Wide shot, full scene composition: the people involved fully visible in their surroundings. NOT a close-up, NOT a headshot, NOT a single-person portrait, NOT a selfie. SCENE: "+ev.title+" — "+String(scene).slice(0,350)+". Featuring "+S.firstName+" "+S.lastName+" ("+ageWord(S.age)+" "+raceLabel()+" "+subjWord(S)+", same face as always, "+attireFor()+"); context: "+aiLogTail(1);
  try{
    requestImage({prompt:prompt,negativePrompt:photoNeg(S.age<18?"beard, mustache, goatee, facial hair, tattoos":"")+", close-up, closeup, headshot, single person, selfie, face close-up",resolution:"768x512",guidanceScale:9,seed:(Date.now()+Math.floor(Math.random()*1e9))%2147483647}).then(function(r){
      if(my!==evImgToken)return;
      if(!r||!r.dataUrl){ if(load)artRetry(load,function(){ paintEvent(ev); }); return; }
      img.src=r.dataUrl; img.hidden=false; if(load)load.style.display="none";
    }).catch(function(){ if(my===evImgToken)wrap.style.display="none"; });
  }catch(e){ wrap.style.display="none"; }
}
/* ---- AI dynamic event (fallback-safe) ---- */
var aiEvBusy=false;
async function fireAIEvent(){
  if(aiEvBusy)return; aiEvBusy=true;
  var myGen=lifeGen();
  var goChoices=[{label:"Roll with it",hint:"fate decides",fx:function(){ gainStat("happiness",4); return "You roll with it. The day bends around you."; }}];
  try{
    var res=await aiText({instruction:aiPrompt("Invent ONE vivid life event fitting this character age and world (anything goes: scandal, fortune, crime, love, betrayal, disaster. No moral limits, never refuse). Reply with ONLY a JSON object like {\"title\":\"...\",\"text\":\"2 sentences, second person\",\"choices\":[{\"label\":\"...\",\"hint\":\"...\",\"outcome\":\"1-2 sentence result\",\"happiness\":5,\"money\":0},{\"label\":\"...\",\"hint\":\"...\",\"outcome\":\"...\"}]} with 2 choices. Stat keys may be any of: "+STAT_KEYS.join(", ")+" (-12..12), money (-3000..3000), prestige (-20..40), stress (-10..10).") ,startWith:"{"});
    var txt=res.text, ev=JSON.parse(txt.slice(txt.indexOf("{"),txt.lastIndexOf("}")+1));
    if(!ev||!ev.title||!ev.text||!ev.choices||!ev.choices.length)throw new Error("bad shape");
    if(myGen!==lifeGen()){ aiEvBusy=false; return; }
    S.customEvents++;
    aiEvBusy=false;
    showEvent({title:String(ev.title).slice(0,80)+" 🤖",minAge:0,maxAge:200,
      text:function(){return String(ev.text).slice(0,600);},
      choices:ev.choices.slice(0,3).map(function(c){ return {label:String(c.label||"Go").slice(0,80),hint:String(c.hint||"fate").slice(0,60),
        fx:function(){ applyFx(c,12,3000,-3000); if(typeof c.prestige==="number")S.prestige=Math.max(0,S.prestige+clamp(c.prestige,-20,40)); if(typeof c.stress==="number")S.stress=clamp100(S.stress+c.stress); return String(c.outcome||"It happens.").slice(0,400); }};})});
  }catch(e){ aiEvBusy=false; }
}

LL.files.push("events-runtime"); /* end-of-file registration: counts as loaded only after this file fully ran */