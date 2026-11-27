/* LIFE & LEGACY — engine/music.js
 * Ambient music: an original loopable score bundled in src/audio/music/
 * (warm cinematic ambient folk, composed for the game). No third-party
 * embeds, no network needed after first load — plays fully offline.
 * Retired the old YouTube-background-audio vendor: a 24/7 live-radio stream
 * was frequently silent (embedding/adblock flakes) and could never work
 * offline. Same player contract as before: 🎵/🔇 topbar toggle, persisted
 * LLUI.music (remember-plugin), starts on first user gesture (browser rule).
 * Load order = index.html order (after ui.js, before creator.js).
 * Shared scope: classic scripts, globals ($, toast, LLUI).
 * musicPlay() refetches (a.load()) if the element holds a stale network
 * error, so unmuting after a failed load can't stay silent.
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
var MUSIC_SRC="src/audio/music/dynasty-ambience.mp3";
var MUSIC_VOL=0.35;
var llMusicEl=null, llMusicArmed=false;
/* ---- game wiring: persisted toggle (LLUI.music via remember-plugin) ---- */
function musicOn(){ try{ return typeof LLUI!=="undefined"&&LLUI?LLUI.music!==false:true; }catch(e){ return true; } }
function ensureMusicEl(){
  if(llMusicEl) return llMusicEl;
  try{
    var slot=$("musicSlot"); if(!slot) return null;
    slot.innerHTML="";
    var a=document.createElement("audio");
    a.id="llMusic"; a.loop=true; a.preload="auto"; a.volume=MUSIC_VOL;
    a.src=MUSIC_SRC;
    slot.appendChild(a);
    llMusicEl=a; try{ watchAudio(a); }catch(e){} return a;
  }catch(e){ return null; }
}
function musicPlay(){
  if(!musicOn()) return false;
  var a=ensureMusicEl(); if(!a) return false;
  try{
    try{ a.volume=MUSIC_VOL; }catch(e){}
    try{ if(a.error&&a.error.code)a.load(); }catch(e){} // stale network error: refetch before playing
    var p=a.play();
    if(p&&p.catch)p.catch(function(){ /* autoplay-blocked: next gesture retries */ });
    return true;
  }catch(e){ return false; }
}
function musicStatus(){
  try{
    var a=llMusicEl;
    return { on:musicOn(), armed:llMusicArmed, hasEl:!!a,
      paused:a?!!a.paused:true, time:a?Math.round(a.currentTime||0):0,
      ready:a?(a.readyState||0):0, src:MUSIC_SRC };
  }catch(e){ return { on:false }; }
}
function musicPauseMain(){ try{ if(llMusicEl)llMusicEl.pause(); }catch(e){} }
function renderMusicBtn(){
  var b=$("musicBtn"); if(!b)return;
  var on=musicOn();
  /* muted music keeps its own 🎵 glyph (struck through), never the 🔇 speaker
   * used by the SFX toggle — the two off-states must not look identical. */
  if(on){ b.textContent="🎵"; }
  else{ b.innerHTML='<span style="opacity:.45;text-decoration:line-through">🎵</span>'; }
  b.title=on?"Ambient music: on (original score, loops) — click to mute":"Ambient music: off — click to play";
}
function applyMusic(){
  try{
    renderMusicBtn();
    var preludeActive=false;
    try{ preludeActive=(typeof preludeStatus==="function"&&!window.__LL_AUTH_DONE&&preludeStatus().phase!=="done"); }catch(e){}
    if(musicOn()){
      if(preludeActive){ try{ stageMusic(preludeStatus().phase); }catch(e){} }
      else{ ensureMusicEl(); musicPlay(); }
    }
    else{ if(llVeilEl){ try{llVeilEl.pause();}catch(e){} } if(llMusicEl){ try{ llMusicEl.pause(); }catch(e){} } try{ if(typeof stageMusic==="function")stageMusic(null); }catch(e){} }
    if(!llMusicArmed){
      llMusicArmed=true;
      /* browsers block audio before interaction: first gesture plays the once-
       * per-session loading motif (hands over to main score by itself); later
       * gestures start the main score directly. */
      function firstGesture(){ try{ if(typeof preludeGesture==="function"&&preludeGesture())return; }catch(e){}
        var m=false; try{ m=veilMusicPlay(); }catch(e){} if(!m)musicPlay(); }
      document.addEventListener("pointerdown",firstGesture,{passive:true});
      document.addEventListener("keydown",firstGesture);
    }
  }catch(e){}
}
function toggleMusic(){
  try{ if(typeof LLUI!=="undefined"&&LLUI)LLUI.music=!musicOn(); }catch(e){}
  applyMusic();
  try{ toast(musicOn()?"🎵 Ambient music on — an original loop, made for this game.":"🔇 Music muted."); }catch(e){}
}
/* ---- loading motif: distinct glass-chime loop, heard once per session ----
 * First gesture after load plays the 25s motif (the veil's "own music");
 * a 22s timer then fades it into the main score. If the veil already lifted,
 * the motif still plays as arrival music — it is never skipped, never overlaps
 * the main score. Muting pauses both legs. */
var VEIL_SRC="src/audio/music/loading-motif.mp3";
var VEIL_VOL=0.22, llVeilEl=null, llMotifPlayed=false, llMotifTimer=null;
function veilVisible(){ try{ var v=$("bootVeil"); return !!(v&&!v.classList.contains("done")); }catch(e){ return false; } }
function ensureVeilEl(){ if(llVeilEl)return llVeilEl; try{
  var a=document.createElement("audio"); a.loop=true; a.preload="auto"; a.volume=0; a.src=VEIL_SRC;
  (document.body||document.documentElement).appendChild(a); llVeilEl=a; try{ watchAudio(a); }catch(e){} return a; }catch(e){ return null; } }
function veilMusicPlay(){
  if(!musicOn()||llMotifPlayed)return false;
  var a=ensureVeilEl(); if(!a)return false;
  llMotifPlayed=true;
  try{ var p=a.play(); if(p&&p.catch)p.catch(function(){});
    var t=setInterval(function(){ try{
      if(a.volume>=VEIL_VOL){ clearInterval(t); return; }
      a.volume=Math.min(VEIL_VOL,a.volume+0.04); }catch(e){ clearInterval(t); } },120);
    if(llMotifTimer)try{clearTimeout(llMotifTimer);}catch(e){}
    llMotifTimer=setTimeout(function(){ try{ veilMusicStop(); }catch(e){} },22000);
    return true; }catch(e){ return false; } }
function veilMusicStop(){ var a=llVeilEl; llVeilEl=null; if(llMotifTimer){ try{clearTimeout(llMotifTimer);}catch(e){} llMotifTimer=null; } if(!a)return;
  try{ var t=setInterval(function(){ try{
    a.volume-=0.05; if(a.volume<=0.02){ clearInterval(t); try{a.pause();}catch(e){} try{if(a.parentNode)a.parentNode.removeChild(a);}catch(e2){} } }catch(e){ clearInterval(t); } },90);
  }catch(e){}
  try{ musicPlay(); }catch(e){} }
/* ---- stall watchdog: a media element that is "playing" but makes no
 * progress (readyState 0 / frozen clock) never fires error, so nothing ever
 * retries it — silence forever on flaky networks or wedged media pipelines.
 * All four music legs register here at creation. 3 consecutive frozen 5s
 * checks while unpaused → load()+play() retry (max 2), then pause and drop
 * quietly. Game logic never depends on music, so giving up is always safe. */
var llWatch=[], llWatchTimer=null;
function watchAudio(a){ if(!a)return; for(var i=0;i<llWatch.length;i++) if(llWatch[i].el===a)return;
  llWatch.push({el:a,last:-1,stuck:0,retries:0});
  if(!llWatchTimer){ try{ llWatchTimer=setInterval(watchTick,5000); }catch(e){} } }
function watchTick(){
  for(var i=llWatch.length-1;i>=0;i--){ var w=llWatch[i], a=w.el;
    try{
      if(!a||!a.isConnected){ llWatch.splice(i,1); continue; }
      if(a.paused){ w.last=a.currentTime; w.stuck=0; continue; }
      if(a.currentTime!==w.last){ w.last=a.currentTime; w.stuck=0; continue; }
      if(++w.stuck<3) continue;
      if(w.retries<2&&!a.error){ w.retries++; w.stuck=0;
        try{ a.load(); var p=a.play(); if(p&&p.catch)p.catch(function(){}); }catch(e){} }
      else { try{ a.pause(); }catch(e){} llWatch.splice(i,1); }
    }catch(e){ try{ llWatch.splice(i,1); }catch(e2){} }
  }
  if(!llWatch.length&&llWatchTimer){ try{ clearInterval(llWatchTimer); }catch(e){} llWatchTimer=null; }
}
/* boot calls this when the veil lifts: if the motif is playing the timer owns
 * the handoff, otherwise try the main score now. */
function veilMusicSettle(){ var a=llVeilEl;
  if(a){ try{ if(!a.paused)return; }catch(e){} }
  try{ musicPlay(); }catch(e){} }
window.veilMusicPlay=veilMusicPlay; window.veilMusicStop=veilMusicStop; window.veilMusicSettle=veilMusicSettle;
function musicMarkerHTML(url,options){ return ""; }
window.toggleMusic=toggleMusic; window.applyMusic=applyMusic;
window.musicMarkerHTML=musicMarkerHTML; window.musicStatus=musicStatus;

LL.files.push("music"); /* end-of-file registration: counts as loaded only after this file fully ran */