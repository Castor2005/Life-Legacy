/* LIFE & LEGACY — engine/auth.js
 * Signup / login / guest gate between the intro cinematic and the boot veil.
 * Device-local accounts for now (localStorage `ll_accounts_v1`, salted hash;
 * upgrade path: swap AuthStore for server-plugin RPCs after the generator is
 * saved — the UI and session contract stay the same). Session in
 * `ll_session`. On success: fade to the veil (which is already waiting),
 * hand music to the loading motif, stamp window.LLPlayer.
 * Self-wires on DOMContentLoaded (never blocks on boot health).
 * Shared scope: classic script, globals ($, toast, LL).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
window.LLPlayer=null;
var AUTH_ACCOUNTS_KEY="ll_accounts_v1", AUTH_SESSION_KEY="ll_session", AUTH_LOCK_KEY="ll_auth_lock";
var authCycle=0;
function authStatus(){ return {player:window.LLPlayer||null, users:authUsers().length}; }
function authUsers(){
  try{ var o=JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY)||"{}"); return Object.keys(o); }
  catch(e){ return []; }
}
function authReadAll(){ try{ return JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY)||"{}")||{}; }catch(e){ return {}; } }
function authWriteAll(o){ try{ localStorage.setItem(AUTH_ACCOUNTS_KEY,JSON.stringify(o)); }catch(e){} }
function authValidName(n){
  n=String(n||"").trim();
  if(n.length<3||n.length>16)return "Name needs 3–16 characters.";
  if(!/^[a-zA-Z0-9_-]+$/.test(n))return "Letters, numbers, _ and - only.";
  return null;
}
function authSalt(){
  try{ var b=new Uint8Array(16); (crypto.getRandomValues?crypto.getRandomValues(b):b.map(function(){return Math.floor(Math.random()*256);})); 
    var s=""; for(var i=0;i<b.length;i++)s+=("0"+b[i].toString(16)).slice(-2); return s; }
  catch(e){ return "f"+Date.now().toString(16)+Math.floor(Math.random()*1e9).toString(16); }
}
function cyrb53(str,seed){
  var h1=0xdeadbeef^(seed||0), h2=0x41c6ce57^(seed||0);
  for(var i=0;i<str.length;i++){ var ch=str.charCodeAt(i);
    h1=Math.imul(h1^ch,2654435761); h2=Math.imul(h2^ch,1597334677); }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (h2>>>0).toString(16)+(h1>>>0).toString(16);
}
async function authHash(pw,salt){
  try{
    if(crypto&&crypto.subtle){
      var d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+"::"+pw));
      var b=new Uint8Array(d), s=""; for(var i=0;i<b.length;i++)s+=("0"+b[i].toString(16)).slice(-2);
      return {alg:"sha256",hash:s};
    }
  }catch(e){}
  return {alg:"cb53",hash:cyrb53(salt+"::"+pw,7)};
}
function authLocked(){
  try{ var l=JSON.parse(localStorage.getItem(AUTH_LOCK_KEY)||"null");
    if(l&&l.until>Date.now())return Math.ceil((l.until-Date.now())/1000);
  }catch(e){}
  return 0;
}
function authNoteFail(){
  try{
    var l=JSON.parse(localStorage.getItem(AUTH_LOCK_KEY)||"null")||{fails:0,until:0};
    l.fails=(l.fails||0)+1;
    if(l.fails>=5){ l.until=Date.now()+30000; l.fails=0; }
    localStorage.setItem(AUTH_LOCK_KEY,JSON.stringify(l));
  }catch(e){}
}
function authErr(m){ var e=$("authErr"); if(e){ e.textContent=m||""; e.hidden=!m; } }
async function authSignup(){
  authErr("");
  var lock=authLocked(); if(lock>0){ authErr("⏳ Too many tries — wait "+lock+"s."); return; }
  var name=($("suName")||{}).value||"", pw=($("suPass")||{}).value||"", pw2=($("suPass2")||{}).value||"";
  var bad=authValidName(name); if(bad){ authErr("❌ "+bad); return; }
  if(pw.length<4){ authErr("❌ Password needs 4+ characters (game account — never reuse a real password)."); return; }
  if(pw!==pw2){ authErr("❌ Passwords don't match."); return; }
  var all=authReadAll(), key=name.trim().toLowerCase();
  if(all[key]){ authErr("❌ That name is taken on this device."); authNoteFail(); return; }
  var salt=authSalt(), hh=await authHash(pw,salt);
  all[key]={name:name.trim(),salt:salt,alg:hh.alg,hash:hh.hash,created:Date.now()};
  authWriteAll(all);
  authEnter({name:name.trim(),guest:false});
  try{ toast("✨ Account created — welcome, "+name.trim()+"!"); }catch(e){}
}
async function authLogin(){
  authErr("");
  var lock=authLocked(); if(lock>0){ authErr("⏳ Too many tries — wait "+lock+"s."); return; }
  var name=($("liName")||{}).value||"", pw=($("liPass")||{}).value||"";
  var all=authReadAll(), key=name.trim().toLowerCase(), rec=all[key];
  if(!rec){ authErr("❌ No such account on this device — sign up instead."); authNoteFail(); return; }
  var hh=await authHash(pw,rec.salt);
  if(hh.hash!==rec.hash){ authErr("❌ Wrong password."); authNoteFail(); return; }
  authEnter({name:rec.name,guest:false});
  try{ toast("👋 Welcome back, "+rec.name+"!"); }catch(e){}
}
function authGuest(){
  authErr("");
  var name=(($("gName")||{}).value||"").trim()||"Wanderer";
  if(name.length>16)name=name.slice(0,16);
  authEnter({name:name,guest:true});
  try{ toast("🎲 Playing as guest — "+name+"."); }catch(e){}
}
function authEnter(player){
  window.LLPlayer=player;
  try{ localStorage.setItem(AUTH_SESSION_KEY,JSON.stringify(player)); }catch(e){}
  try{ renderPlayerChip(); }catch(e){}
  authComplete();
}
function authLogout(){
  window.LLPlayer=null;
  try{ localStorage.removeItem(AUTH_SESSION_KEY); }catch(e){}
  try{ renderPlayerChip(); }catch(e){}
  try{
    var a=$("authScreen"); if(!a)return;
    ++authCycle;
    /* the boot veil's job ends at first auth: remove it outright. Marking it
     * done instead would poison the next bvDone() (its tick exits instantly
     * on done, freezing the loader at 00 and never removing the veil). Later
     * logins skip the loader by design and go straight to start. */
    var v=$("bootVeil"); if(v){ try{ if(v.parentNode)v.parentNode.removeChild(v); }catch(e){} }
    try{ authErr(""); }catch(e){}
    a.hidden=false; requestAnimationFrame(function(){ try{ a.classList.add("show"); }catch(e){} });
    window.__LL_AUTH_DONE=false; preludePhase="auth";
    /* the main score keeps playing behind auth unless paused → overlap */
    try{ if(typeof musicPauseMain==="function")musicPauseMain(); }catch(e){}
    stageMusic("auth");
  }catch(e){}
}
function authComplete(){
  try{
    var a=$("authScreen"), c=++authCycle;
    if(a){ a.classList.remove("show"); setTimeout(function(){ try{ if(c===authCycle)a.hidden=true; }catch(e){} },900); }
  }catch(e){}
  window.__LL_AUTH_DONE=true;
  try{ if(typeof stageMusic==="function")stageMusic(null); }catch(e){}
  /* motif only plays once per session: on later logins (veil long gone) fall
   * back to the main score so the game never goes silent after auth. */
  try{ if(typeof veilMusicPlay==="function"){ if(!veilMusicPlay()&&typeof musicPlay==="function")musicPlay(); } }catch(e){}
}
/* ---- player chip in the topbar ---- */
function renderPlayerChip(){
  try{
    var c=$("playerChip"); if(!c)return;
    var p=window.LLPlayer;
    if(!p){ c.hidden=true; return; }
    c.hidden=false;
    c.innerHTML='<span class="rl"><span class="rl-a">👤 '+String(p.name).replace(/[<>&"]/g,"")+(p.guest?" (guest)":"")+'</span><span class="rl-b" aria-hidden="true">👤 '+String(p.name).replace(/[<>&"]/g,"")+(p.guest?" (guest)":"")+'</span></span>';
    c.title=p.guest?"Guest — click to switch account / log out":"Signed in as "+p.name+" — click to switch account / log out";
  }catch(e){}
}
function authFocus(){
  try{
    var s=null;
    try{ s=JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)||"null"); }catch(e){}
    if(s&&s.name){ window.LLPlayer=s; try{ renderPlayerChip(); }catch(e){} }
    var box=$("authSessionBox");
    if(box&&s&&s.name){
      var all=authReadAll();
      var known=!s.guest&&!!all[String(s.name).toLowerCase()];
      if(s.guest||known){
        box.hidden=false;
        box.innerHTML="";
        var b=document.createElement("button"); b.className="btn primary"; b.style.width="100%";
        b.textContent="▶ Continue as "+s.name+(s.guest?" (guest)":"");
        b.onclick=function(){ window.LLPlayer=s; try{ renderPlayerChip(); }catch(e){} authComplete(); };
        box.appendChild(b);
      }
    }
    var f=$("liName")||$("suName"); if(f&&!s)f.focus();
  }catch(e){}
}
function authTab(which){
  try{
    ["Login","Signup","Guest"].forEach(function(k){
      var p=$("auth"+k+"Pane"), t=$("authTab"+k);
      if(p)p.hidden=(k!==which);
      if(t)t.classList.toggle("on",k===which);
    });
    authErr("");
  }catch(e){}
}
function authInit(){
  try{
    if($("authSignupGo"))$("authSignupGo").onclick=function(){ authSignup(); };
    if($("authLoginGo"))$("authLoginGo").onclick=function(){ authLogin(); };
    if($("authGuestGo"))$("authGuestGo").onclick=function(){ authGuest(); };
    if($("authTabLogin"))$("authTabLogin").onclick=function(){ authTab("Login"); };
    if($("authTabSignup"))$("authTabSignup").onclick=function(){ authTab("Signup"); };
    if($("authTabGuest"))$("authTabGuest").onclick=function(){ authTab("Guest"); };
    if($("playerChip"))$("playerChip").onclick=function(){
      if(confirm("Switch account / log out?\n(Your lives stay saved on this device.)"))authLogout(); };
    [["suPass2",authSignup],["liPass",authLogin],["gName",authGuest]].forEach(function(pair){
      var el=$(pair[0]); if(el)el.addEventListener("keydown",function(e){ if(e.key==="Enter")pair[1](); });
    });
    authTab("Login");
  }catch(e){}
}
document.addEventListener("DOMContentLoaded",authInit);

LL.files.push("auth"); /* end-of-file registration: counts as loaded only after this file fully ran */