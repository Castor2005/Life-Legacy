/* LIFE & LEGACY — engine/prelude.js
 * Cold-open prelude: Lusion/ActiveTheory-style intro cinematic + stage music.
 * Flow: introVeil (epic overture) → authScreen (calm nocturne) → boot veil
 * (glass motif) → main page (main score). Each leg crossfades into the next.
 * Browsers block audible audio before the first gesture, so the overture
 * autostarts MUTED at load (policy allows that) and unmutes on the first tap:
 * the score is already underway instead of starting cold. No tap: the intro
 * auto-advances after ~60s and the next leg starts at the next gesture.
 * Never blocks boot: the engine boots underneath; bvDone() waits for
 * window.__LL_AUTH_DONE (see boot.js). Session-only, no game state touched.
 * Shared scope: classic script, globals ($, LL, LLUI).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
window.__LL_AUTH_DONE=false;
var PRELUDE_INTRO_MS=60000, PRELUDE_SHOWCASE_MS=2400;
var preludePhase="intro", preludeShowcasing=false;
var INTRO_SRC="src/audio/music/intro-overture.mp3", AUTH_SRC="src/audio/music/auth-nocturne.mp3";
var INTRO_VOL=0.4, AUTH_VOL=0.22;
var introEl=null, authEl=null;
function preludeStatus(){ return {phase:preludePhase, authDone:!!window.__LL_AUTH_DONE}; }
function musicAllowed(){ try{ return typeof LLUI!=="undefined"&&LLUI?LLUI.music!==false:true; }catch(e){ return true; } }
function stageEl(which){
  if(which==="intro"){ if(introEl)return introEl;
    try{ var a=document.createElement("audio"); a.loop=true; a.preload="auto"; a.volume=0; a.src=INTRO_SRC;
      (document.body||document.documentElement).appendChild(a); introEl=a; try{ watchAudio(a); }catch(e){} return a; }catch(e){ return null; } }
  if(!authEl){ try{ var b=document.createElement("audio"); b.loop=true; b.preload="auto"; b.volume=0; b.src=AUTH_SRC;
    (document.body||document.documentElement).appendChild(b); authEl=b; try{ watchAudio(b); }catch(e){} }catch(e){ return null; } }
  return authEl;
}
function fadeOutEl(a,drop){
  if(!a)return;
  try{ var t=setInterval(function(){ try{
    a.volume=Math.max(0,a.volume-0.05);
    if(a.volume<=0.01){ clearInterval(t); try{a.pause();}catch(e){} if(drop){ try{a.remove();}catch(e){} } }
  }catch(e){ clearInterval(t); } },90); }catch(e){}
}
/* crossfade stage music: which = "intro" | "auth" | null (silence) */
function stageMusic(which){
  if(!musicAllowed())which=null;
  var want=which==="intro"?stageEl("intro"):(which==="auth"?stageEl("auth"):null);
  [["intro",introEl],["auth",authEl]].forEach(function(pair){
    var a=pair[1]; if(!a||a===want)return;
    if(pair[0]==="intro"&&a===introEl){ fadeOutEl(a,true); introEl=null; }
    else if(pair[0]==="auth"&&a===authEl){ fadeOutEl(a,true); authEl=null; }
  });
  if(!want)return false;
  try{
    var target=which==="intro"?INTRO_VOL:AUTH_VOL;
    try{ want.muted=false; }catch(e){}
    var p=want.play(); if(p&&p.catch)p.catch(function(){});
    var t=setInterval(function(){ try{
      if(want.volume>=target){ clearInterval(t); return; }
      want.volume=Math.min(target,want.volume+0.04); }catch(e){ clearInterval(t); } },120);
    return true;
  }catch(e){ return false; }
}
/* first-gesture hook (called from music.js before the motif logic). Returns
 * true when the prelude consumed the gesture (intro/auth visible). */
function preludeGesture(){
  if(preludePhase==="intro"){ introShowcase(); return true; }
  if(preludePhase==="auth"){ stageMusic("auth"); return true; }
  return false;
}
function introDismiss(){
  if(preludePhase!=="intro")return;
  preludePhase="auth";
  try{ if(introTimer){ clearTimeout(introTimer); introTimer=null; } }catch(e){}
  try{
    var v=$("introVeil"); if(v){ v.classList.add("done"); setTimeout(function(){ try{ if(v.parentNode)v.parentNode.removeChild(v); }catch(e){} },900); }
    var a=$("authScreen"); if(a){ a.hidden=false; requestAnimationFrame(function(){ try{ a.classList.add("show"); }catch(e){} }); }
  }catch(e){}
  stageMusic("auth");
  try{ if(typeof renderPlayerChip==="function")renderPlayerChip(); }catch(e){}
  try{ if(typeof authFocus==="function")authFocus(); }catch(e){}
}
function introShowcase(){
  if(preludePhase!=="intro"||preludeShowcasing)return;
  preludeShowcasing=true;
  try{ stageMusic("intro"); }catch(e){}
  try{ var v=$("introVeil"); if(v)v.classList.add("peak"); }catch(e){}
  setTimeout(function(){ introDismiss(); },PRELUDE_SHOWCASE_MS);
}
/* ---- ember canvas: gold embers + the crown emblem drawing itself in ----
 * The emblem is canvas-drawn (never SVG): a crown sigil + twin rings that
 * trace on over ~2.6s, then ignite with a glow pulse at "peak". Pointer
 * parallax drifts the emblem field (Lusion-style drift; canvas slow-zooms
 * via CSS). Reduced motion: one complete static frame, no loop. */
var introTimer=null;
function introCrownDraw(x,cx,cy,s,p,glow){
  x.save();
  x.translate(cx,cy); x.scale(s,s);
  x.lineJoin="round"; x.lineCap="round";
  x.shadowColor="rgba(243,216,148,"+glow.toFixed(3)+")"; x.shadowBlur=22+30*glow;
  x.strokeStyle="rgba(201,164,92,1)"; x.lineWidth=3.2;
  x.setLineDash([460,460]); x.lineDashOffset=460*(1-Math.min(1,p*1.15));
  x.beginPath();
  x.moveTo(-52,30); x.lineTo(-40,-14); x.lineTo(-22,6); x.lineTo(0,-24);
  x.lineTo(22,6); x.lineTo(40,-14); x.lineTo(52,30); x.closePath();
  x.stroke();
  x.setLineDash([440,440]); x.lineDashOffset=440*(1-Math.min(1,Math.max(0,p-0.12)*1.15));
  x.beginPath(); x.arc(0,0,66,0,6.283); x.stroke();
  x.strokeStyle="rgba(201,164,92,.4)"; x.lineWidth=1.6;
  x.setLineDash([620,620]); x.lineDashOffset=620*(1-Math.min(1,Math.max(0,p-0.25)*1.1));
  x.beginPath(); x.arc(0,0,88,0,6.283); x.stroke();
  x.setLineDash([]);
  if(p>0.55){ var o=Math.min(1,(p-0.55)/0.45);
    x.fillStyle="rgba(243,216,148,"+o.toFixed(3)+")";
    [[-40,-14],[0,-24],[40,-14]].forEach(function(pt){
      x.beginPath(); x.arc(pt[0],pt[1],3.4,0,6.283); x.fill(); });
  }
  x.restore();
}
function introCanvas(){
  var c=$("introCanvas"); if(!c)return;
  try{
    var reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr=Math.min(2,window.devicePixelRatio||1);
    var w=c.clientWidth||window.innerWidth, h=c.clientHeight||window.innerHeight;
    c.width=w*dpr; c.height=h*dpr;
    var x=c.getContext("2d"); x.scale(dpr,dpr);
    var N=reduced?0:Math.min(110,Math.floor(w*h/14000)), ps=[];
    for(var i=0;i<N;i++)ps.push({x:Math.random()*w,y:Math.random()*h,r:0.6+Math.random()*2.2,
      vy:0.15+Math.random()*0.5,vx:(Math.random()-0.5)*0.2,a:0.25+Math.random()*0.55,tw:Math.random()*6.28});
    var t0=Date.now(), v=$("introVeil");
    var ccx=w/2, ccy=h*0.235, sc=Math.min(w,h)/600;
    function scene(t,peak){
      x.clearRect(0,0,w,h);
      var g=x.createRadialGradient(ccx,ccy,10,ccx,ccy,Math.max(w,h)*0.55);
      g.addColorStop(0,"rgba(201,164,92,0.14)"); g.addColorStop(1,"rgba(201,164,92,0)");
      x.fillStyle=g; x.fillRect(0,0,w,h);
      for(var i=0;i<ps.length;i++){ var p=ps[i];
        p.y-=p.vy; p.x+=p.vx+Math.sin(t+p.tw)*0.15;
        if(p.y<-8){ p.y=h+8; p.x=Math.random()*w; }
        var a=p.a*(0.6+0.4*Math.sin(t*2+p.tw));
        x.fillStyle="rgba(243,216,148,"+a.toFixed(3)+")";
        x.beginPath(); x.arc(p.x,p.y,p.r,0,6.283); x.fill();
      }
      var prog=Math.min(1,t/2.6); prog=1-Math.pow(1-prog,2);
      introCrownDraw(x,ccx,ccy,sc*(peak?1.03:1),reduced?1:prog,peak?0.85:0.35);
      x.strokeStyle="rgba(201,164,92,0.22)"; x.lineWidth=1.5;
      x.beginPath(); x.arc(w/2,h*0.66,54+Math.sin(t*0.8)*3,0,6.283); x.stroke();
    }
    if(reduced){ scene(10,false); return; }
    (function frame(){
      if(preludePhase!=="intro")return;
      var t=(Date.now()-t0)/1000;
      var peak=false;
      try{ peak=v&&v.classList.contains("peak"); }catch(e){}
      scene(t,peak);
      requestAnimationFrame(frame);
    })();
  }catch(e){}
}
/* autoplay-policy-proof start: muted playback IS allowed before any gesture,
 * so the overture begins (silently) at load and unmutes on the first tap. */
function preludeAutoStart(){
  if(!musicAllowed())return;
  var a=stageEl("intro"); if(!a)return;
  try{
    a.muted=true; a.volume=INTRO_VOL;
    var p=a.play(); if(p&&p.catch)p.catch(function(){});
  }catch(e){}
}
function preludeUnmute(){
  [introEl,authEl].forEach(function(a){
    if(!a)return;
    try{ if(a.muted){ a.muted=false; if(a.paused){ var p=a.play(); if(p&&p.catch)p.catch(function(){}); } } }catch(e){}
  });
}
function preludeInit(){
  try{ introCanvas(); }catch(e){}
  try{ preludeAutoStart(); }catch(e){}
  try{ introTimer=setTimeout(function(){ if(preludePhase==="intro")introDismiss(); },PRELUDE_INTRO_MS); }catch(e){}
  try{ setTimeout(function(){ try{ var v=$("introVeil"); if(v&&preludePhase==="intro")v.classList.add("peak"); }catch(e){} },5000); }catch(e){}
  try{
    var v=$("introVeil"); if(!v){ introDismiss(); return; }
    v.addEventListener("pointerdown",function(){ introShowcase(); });
    try{
      var unm=function(){ try{ preludeUnmute(); }catch(e){} };
      document.addEventListener("pointerdown",unm);
      document.addEventListener("keydown",unm);
    }catch(e){}
    document.addEventListener("keydown",function kd(e){
      if(preludePhase!=="intro")return;
      introShowcase();
    });
    if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    var core=document.querySelector(".intro-core");
    document.addEventListener("pointermove",function pm(e){
      if(preludePhase!=="intro"||!core)return;
      try{
        var dx=(e.clientX/window.innerWidth-0.5), dy=(e.clientY/window.innerHeight-0.5);
        core.style.transform="translate("+(dx*12).toFixed(1)+"px,"+(dy*9).toFixed(1)+"px)";
      }catch(e){}
    });
  }catch(e){}
}
document.addEventListener("DOMContentLoaded",preludeInit);

LL.files.push("prelude"); /* end-of-file registration: counts as loaded only after this file fully ran */