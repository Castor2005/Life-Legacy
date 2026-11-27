/* LIFE & LEGACY — engine/auth.js
 * Restored local Login / Sign up / Guest gate alongside Firebase Google Sign-In.
 * Signed-in Google players sync autosave, 7 save slots, achievements, and settings
 * to Firestore via window.LLFirebase. Local accounts & guests play locally on this device.
 * Shared scope: classic script, globals ($, toast, LL).
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
window.LLPlayer = null;
var AUTH_ACCOUNTS_KEY = "ll_accounts";
var AUTH_LEGACY_ACCOUNTS_KEY = "ll_accounts_v1";
var AUTH_SESSION_KEY = "ll_session";
var AUTH_LOCK_KEY = "ll_auth_lock";
var authCycle = 0;
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
/* Legacy v1 store (pre-cloud builds): salted SHA-256 ("salt::pw"), cyrb53 fallback. */
function authReadLegacy(){
  try{ var o=JSON.parse(localStorage.getItem(AUTH_LEGACY_ACCOUNTS_KEY)||"{}"); return (o&&typeof o==="object")?o:{}; }catch(e){ return {}; }
}
function authLegacyHash(salt,pw){
  try{
    if(window.crypto&&crypto.subtle&&typeof TextEncoder!=="undefined"){
      var data=new TextEncoder().encode(String(salt)+"::"+String(pw));
      return crypto.subtle.digest("SHA-256",data).then(function(d){
        var b=new Uint8Array(d),s=""; for(var i=0;i<b.length;i++)s+=("0"+b[i].toString(16)).slice(-2); return s;
      });
    }
  }catch(e){}
  var s=String(salt)+"::"+String(pw),h1=0xdeadbeef,h2=0x41c6ce57;
  for(var i=0;i<s.length;i++){ var c=s.charCodeAt(i); h1=Math.imul(h1^c,2654435761); h2=Math.imul(h2^c,1597334677); }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return Promise.resolve((h2>>>0).toString(16)+(h1>>>0).toString(16));
}
var cloudSyncRunning = false;

function authStatus() {
  return {
    player: window.LLPlayer || null,
    cloud: isCloudSignedIn()
  };
}

function authErr(m) {
  var e = $("authErr");
  if (e) { e.textContent = m || ""; e.hidden = !m; }
}

function isCloudSignedIn() {
  return !!(
    window.LLFirebase &&
    window.LLFirebase.getUser() &&
    window.LLPlayer &&
    window.LLPlayer.cloud === true &&
    !window.LLPlayer.guest
  );
}

/* ---- Local account store (salted SHA-256 in localStorage) ---- */
function authReadAccounts() {
  try {
    var raw = JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY) || "{}");
    return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
  } catch (e) {
    return {};
  }
}

function authWriteAccounts(map) {
  try {
    localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(map || {}));
    return true;
  } catch (e) {
    return false;
  }
}

function authMakeSalt() {
  try {
    if (window.crypto && crypto.getRandomValues) {
      var b = new Uint8Array(16);
      crypto.getRandomValues(b);
      return Array.from(b, function (x) { return x.toString(16).padStart(2, "0"); }).join("");
    }
  } catch (e) {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function authHashPass(salt, pass) {
  var text = String(salt || "") + ":" + String(pass || "");
  try {
    if (window.crypto && crypto.subtle && typeof TextEncoder !== "undefined") {
      var data = new TextEncoder().encode(text);
      var digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest), function (x) {
        return x.toString(16).padStart(2, "0");
      }).join("");
    }
  } catch (e) {}
  // Fallback deterministic hash if Web Crypto is unavailable
  var h1 = 2166136261, h2 = 0x811c9dc5;
  for (var i = 0; i < text.length; i++) {
    var c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ (c + i), 2246822519);
  }
  return "fb_" + (h1 >>> 0).toString(16) + "_" + (h2 >>> 0).toString(16);
}

function authValidName(name) {
  return /^[A-Za-z0-9_-]{3,16}$/.test(name);
}

async function authDetachFirebaseIfNeeded() {
  try {
    if (window.LLFirebase && window.LLFirebase.getUser()) {
      await window.LLFirebase.signOut();
    }
  } catch (e) {}
}

/* ---- Local Login / Sign up / Guest handlers ---- */
async function authLogin() {
  authErr("");
  var lock0 = authLocked(); if (lock0 > 0) { authErr("⏳ Too many tries — wait " + lock0 + "s."); return; }
  var name = (($("liName") || {}).value || "").trim();
  var pass = (($("liPass") || {}).value || "");
  if (!name || !pass) {
    authErr("Enter both your name and password.");
    return;
  }
  var key = name.toLowerCase();
  var accounts = authReadAccounts();
  var rec = accounts[key];
  if (!rec) {
    try{
      var leg = authReadLegacy()[key];
      if (leg && leg.salt && leg.hash) {
        var lh = await authLegacyHash(leg.salt, pass);
        if (lh === leg.hash) {
          var salt2 = authMakeSalt(), h2 = await authHashPass(salt2, pass);
          accounts[key] = { name: leg.name || name, salt: salt2, hash: h2, createdAt: Date.now(), migrated: "v1" };
          try { authWriteAccounts(accounts); } catch (eM) {}
          try { var ll = authReadLegacy(); delete ll[key]; localStorage.setItem(AUTH_LEGACY_ACCOUNTS_KEY, JSON.stringify(ll)); } catch (eD) {}
          if ($("liPass")) $("liPass").value = "";
          authEnter({ name: accounts[key].name, key: key, guest: false, cloud: false, local: true });
          try { toast("👤 Welcome back, " + accounts[key].name + " (account upgraded)."); } catch (eT) {}
          return;
        }
      }
    }catch(eL){}
    authErr("No local account named \"" + name + "\" found on this device. Switch to Sign up to create one.");
    authNoteFail();
    return;
  }
  var hash = await authHashPass(rec.salt, pass);
  if (hash !== rec.hash) {
    authErr("Incorrect password for \"" + rec.name + "\".");
    authNoteFail();
    return;
  }
  await authDetachFirebaseIfNeeded();
  if ($("liPass")) $("liPass").value = "";
  authEnter({ name: rec.name, key: key, guest: false, cloud: false, local: true });
  try { toast("👤 Welcome back, " + rec.name + " (local account)."); } catch (e) {}
}

async function authSignup() {
  authErr("");
  var lockS = authLocked(); if (lockS > 0) { authErr("⏳ Too many tries — wait " + lockS + "s."); return; }
  var name = (($("suName") || {}).value || "").trim();
  var pass = (($("suPass") || {}).value || "");
  var pass2 = (($("suPass2") || {}).value || "");
  if (!authValidName(name)) {
    authErr("Name must be 3–16 characters using letters, numbers, _ or -.");
    return;
  }
  if (pass.length < 4 || pass.length > 64) {
    authErr("Password must be at least 4 characters.");
    return;
  }
  if (pass !== pass2) {
    authErr("Passwords do not match.");
    return;
  }
  var key = name.toLowerCase();
  var accounts = authReadAccounts();
  if (accounts[key]) {
    authErr("An account named \"" + accounts[key].name + "\" already exists on this device. Use Login instead.");
    return;
  }
  var salt = authMakeSalt();
  var hash = await authHashPass(salt, pass);
  accounts[key] = { name: name, salt: salt, hash: hash, createdAt: Date.now() };
  if (!authWriteAccounts(accounts)) {
    authErr("Could not save account to browser storage.");
    return;
  }
  await authDetachFirebaseIfNeeded();
  if ($("suPass")) $("suPass").value = "";
  if ($("suPass2")) $("suPass2").value = "";
  authEnter({ name: name, key: key, guest: false, cloud: false, local: true });
  try { toast("✨ Local account \"" + name + "\" created!"); } catch (e) {}
}

async function authGuest() {
  authErr("");
  var name = (($("gName") || {}).value || "").trim() || "Wanderer";
  if (name.length > 16) name = name.slice(0, 16);
  await authDetachFirebaseIfNeeded();
  authEnter({ name: name, guest: true, cloud: false, local: true });
  try { toast("🎲 Playing as guest (" + name + ") — saves stored locally on this device."); } catch (e) {}
}

/* ---- Cloud hydration & bidirectional merge on Google sign-in ---- */
async function cloudSyncAll(showToast) {
  if (!window.LLFirebase || !window.LLFirebase.getUser()) return false;
  if (cloudSyncRunning) return false;
  cloudSyncRunning = true;
  renderAccountModal();
  try {
    var localSettings = {
      theme: (typeof settings !== "undefined" && settings && settings.theme) || "crimson",
      lang: (typeof settings !== "undefined" && settings && settings.lang) || "en"
    };
    var localUi = {
      tab: (typeof LLUI !== "undefined" && LLUI && LLUI.tab) || "activities",
      music: (typeof LLUI !== "undefined" && LLUI && typeof LLUI.music === "boolean") ? LLUI.music : true
    };
    var remotePrefs = await window.LLFirebase.ensureProfile(localSettings, localUi);
    if (remotePrefs && typeof cloudApplySettings === "function") {
      cloudApplySettings(remotePrefs);
    }
    if (typeof cloudSyncSaves === "function") {
      await cloudSyncSaves();
    }
    if (typeof cloudSyncAchievements === "function") {
      await cloudSyncAchievements();
    }
    if (showToast) {
      try { toast("☁️ Cloud saves, achievements & preferences synced."); } catch (e) {}
    }
    return true;
  } catch (e) {
    console.error("Cloud sync failed:", e);
    if (showToast) {
      try { toast("⚠️ Cloud sync issue — local saves remain safe."); } catch (e2) {}
    }
    return false;
  } finally {
    cloudSyncRunning = false;
    renderPlayerChip();
    renderAccountModal();
  }
}

async function authGoogleSignIn(fromModal) {
  authErr("");
  if (!window.LLFirebase || typeof window.LLFirebase.signInWithGoogle !== "function") {
    var msgNoBridge = "Cloud sync isn't available in this build — it appears automatically on server-hosted builds with Firebase configured. Local accounts and Guest saves on this device still work.";
    if (fromModal) { try { toast("⚠️ " + msgNoBridge); } catch (e2) {} }
    else { authErr("❌ " + msgNoBridge); }
    return;
  }
  var btn = fromModal ? $("accGoogleUpgrade") : $("authGoogleGo");
  var oldText = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Connecting to Google…"; }
  try {
    var u = await window.LLFirebase.signInWithGoogle();
    var player = {
      uid: u.uid,
      name: u.displayName || "Player",
      email: u.email || "",
      photoURL: u.photoURL || "",
      guest: false,
      cloud: true,
      local: false
    };
    authEnter(player);
    if (fromModal) {
      try { closeModal("accountModal"); } catch (e) {}
    }
    try { toast("☁️ Signed in as " + player.name + " — syncing your cloud dynasty…"); } catch (e) {}
    void cloudSyncAll(true);
  } catch (e) {
    var code = (e && e.code) || "";
    var msg = code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
      ? "Sign-in popup closed — click again whenever you're ready."
      : ("Google sign-in failed: " + String((e && e.message) || e).slice(0, 140));
    if (fromModal) {
      try { toast("⚠️ " + msg); } catch (e2) {}
    } else {
      authErr("❌ " + msg);
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = oldText; }
  }
}

function authEnter(player) {
  window.LLPlayer = player;
  try { localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(player)); } catch (e) {}
  try { renderPlayerChip(); } catch (e) {}
  try { renderAccountModal(); } catch (e) {}
  authComplete();
}

async function authLogout() {
  try {
    if (window.LLFirebase && window.LLFirebase.getUser()) {
      await window.LLFirebase.signOut();
    }
  } catch (e) {
    console.error("Sign-out error:", e);
  }
  window.LLPlayer = null;
  try { localStorage.removeItem(AUTH_SESSION_KEY); } catch (e) {}
  try { closeModal("accountModal"); } catch (e) {}
  try { renderPlayerChip(); } catch (e) {}
  try { renderSaves(); } catch (e) {}
  try {
    var a = $("authScreen"); if (!a) return;
    ++authCycle;
    var v = $("bootVeil"); if (v) { try { if (v.parentNode) v.parentNode.removeChild(v); } catch (e) {} }
    try { authErr(""); } catch (e) {}
    var box = $("authSessionBox"); if (box) { box.hidden = true; box.innerHTML = ""; }
    a.hidden = false;
    requestAnimationFrame(function () { try { a.classList.add("show"); } catch (e) {} });
    window.__LL_AUTH_DONE = false; preludePhase = "auth";
    try { if (typeof musicPauseMain === "function") musicPauseMain(); } catch (e) {}
    stageMusic("auth");
  } catch (e) {}
}

function authComplete() {
  try {
    var a = $("authScreen"), c = ++authCycle;
    if (a) {
      a.classList.remove("show");
      setTimeout(function () { try { if (c === authCycle) a.hidden = true; } catch (e) {} }, 900);
    }
  } catch (e) {}
  window.__LL_AUTH_DONE = true;
  try { if (typeof stageMusic === "function") stageMusic(null); } catch (e) {}
  try {
    if (typeof veilMusicPlay === "function") {
      if (!veilMusicPlay() && typeof musicPlay === "function") musicPlay();
    }
  } catch (e) {}
}

/* ---- Player chip in the topbar & Account modal ---- */
function renderPlayerChip() {
  try {
    var c = $("playerChip"); if (!c) return;
    var p = window.LLPlayer;
    if (!p) { c.hidden = true; return; }
    c.hidden = false;
    var isCloud = isCloudSignedIn();
    var icon = isCloud ? "☁️ " : "👤 ";
    var safeName = String(p.name || "Player").replace(/[<>&"]/g, "");
    var suffix = p.guest ? " (guest)" : "";
    c.innerHTML =
      '<span class="rl"><span class="rl-a">' + icon + safeName + suffix +
      '</span><span class="rl-b" aria-hidden="true">' + icon + safeName + suffix + "</span></span>";
    c.title = isCloud
      ? ("Signed in with Google (" + (p.email || safeName) + ") — cloud sync active")
      : (p.guest
        ? "Guest (local saves only) — click to sign in with Google or switch account"
        : "Local account (this device only) — click to sync with Google or sign out");
  } catch (e) {}
}

function renderAccountModal() {
  try {
    var info = $("accountInfo"), syncBtn = $("accSyncNow"), upBtn = $("accGoogleUpgrade"), outBtn = $("accSignOut");
    if (!info) return;
    var p = window.LLPlayer;
    if (isCloudSignedIn()) {
      info.innerHTML =
        "<b>☁️ " + esc(p.name) + "</b><br><span class='sub'>" + esc(p.email || "Google account") +
        " · Autosave, 7 save slots, achievements &amp; settings sync automatically to Firestore.</span>";
      if (syncBtn) { syncBtn.hidden = false; syncBtn.disabled = cloudSyncRunning; syncBtn.textContent = cloudSyncRunning ? "⏳ Syncing…" : "🔄 Sync now"; }
      if (upBtn) upBtn.hidden = true;
      if (outBtn) outBtn.textContent = "🚪 Sign out";
    } else if (p && !p.guest) {
      var cloudNote = window.LLFirebase ? "" : " (available on server-hosted builds)";
      info.innerHTML =
        "<b>👤 " + esc(p.name) + " (Local account)</b><br><span class='sub'>Your saves live locally on this browser. Sign in with Google anytime to back up your autosave, 7 slots, achievements, and settings to Firestore" + cloudNote + ".</span>";
      if (syncBtn) syncBtn.hidden = true;
      if (upBtn) upBtn.hidden = false;
      if (outBtn) outBtn.textContent = "🚪 Sign out";
    } else {
      var gname = (p && p.name) || "Wanderer";
      var cloudNote2 = window.LLFirebase ? "" : " (available on server-hosted builds)";
      info.innerHTML =
        "<b>👤 " + esc(gname) + " (Guest)</b><br><span class='sub'>Your saves are currently stored locally on this browser. Sign in with Google to sync your current autosave, 7 slots, achievements, and settings to the cloud" + cloudNote2 + ".</span>";
      if (syncBtn) syncBtn.hidden = true;
      if (upBtn) upBtn.hidden = false;
      if (outBtn) outBtn.textContent = "↺ Switch account";
    }
  } catch (e) {}
}

function authFocus() {
  try {
    var fbUser = window.LLFirebase ? window.LLFirebase.getUser() : null;
    var box = $("authSessionBox");
    if (box) { box.hidden = true; box.innerHTML = ""; }
    if (fbUser) {
      var player = {
        uid: fbUser.uid,
        name: fbUser.displayName || "Player",
        email: fbUser.email || "",
        photoURL: fbUser.photoURL || "",
        guest: false,
        cloud: true,
        local: false
      };
      window.LLPlayer = player;
      try { renderPlayerChip(); } catch (e) {}
      if (box) {
        box.hidden = false;
        var b = document.createElement("button");
        b.className = "btn primary";
        b.style.width = "100%";
        b.textContent = "☁️ Continue as " + player.name;
        b.onclick = function () {
          authEnter(player);
          void cloudSyncAll(false);
        };
        box.appendChild(b);
      }
      return;
    }

    var s = null;
    try { s = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null"); } catch (e) {}
    if (s && s.name && !s.cloud && box) {
      box.hidden = false;
      var lb = document.createElement("button");
      lb.className = s.guest ? "btn ghost" : "btn primary";
      lb.style.width = "100%";
      lb.textContent = "▶ Continue as " + s.name + (s.guest ? " (guest)" : "");
      lb.onclick = function () { authEnter(s); };
      box.appendChild(lb);
    }
  } catch (e) {}
}

function authTab(which) {
  try {
    ["Login", "Signup", "Guest"].forEach(function (k) {
      var p = $("auth" + k + "Pane"), t = $("authTab" + k);
      if (p) p.hidden = (k !== which);
      if (t) t.classList.toggle("on", k === which);
    });
    authErr("");
  } catch (e) {}
}

/* Cloud entry points stay visible on every host (matches the auth-gate design):
 * without a Firebase bridge the Google buttons explain that cloud sync needs a
 * server-hosted build; the bridge fires ll-firebase-ready when it loads. */
function authCloudUi(){
  try{
    var g = $("authGoogleGo"); if (g) g.hidden = false;
    var ors = document.querySelectorAll(".auth-or"); for (var i=0;i<ors.length;i++) ors[i].hidden = false;
    var up = $("accGoogleUpgrade");
    if (up) {
      var showUp = true;
      try { if (typeof isCloudSignedIn === "function") showUp = !isCloudSignedIn(); } catch (eUp) {}
      if (showUp) up.hidden = false;
    }
    var notes = document.querySelectorAll(".auth-note");
    for (var j=0;j<notes.length;j++) notes[j].textContent = "Local accounts and Guest mode save on this device (never reuse a real password). Continue with Google to sync your autosave, 7 slots, achievements, and settings to Firestore.";
  }catch(e){}
}
function authInit() {
  try {
    if ($("authLoginGo")) $("authLoginGo").onclick = function () { void authLogin(); };
    if ($("authSignupGo")) $("authSignupGo").onclick = function () { void authSignup(); };
    if ($("authGuestGo")) $("authGuestGo").onclick = function () { void authGuest(); };
    if ($("authGoogleGo")) $("authGoogleGo").onclick = function () { void authGoogleSignIn(false); };
    if ($("authTabLogin")) $("authTabLogin").onclick = function () { authTab("Login"); };
    if ($("authTabSignup")) $("authTabSignup").onclick = function () { authTab("Signup"); };
    if ($("authTabGuest")) $("authTabGuest").onclick = function () { authTab("Guest"); };
    if ($("playerChip")) $("playerChip").onclick = function () {
      renderAccountModal();
      openModal("accountModal");
    };
    if ($("accGoogleUpgrade")) $("accGoogleUpgrade").onclick = function () { void authGoogleSignIn(true); };
    if ($("accSyncNow")) $("accSyncNow").onclick = function () { void cloudSyncAll(true); };
    if ($("accSignOut")) $("accSignOut").onclick = function () { void authLogout(); };

    ["liName", "liPass"].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("keydown", function (e) { if (e.key === "Enter") void authLogin(); });
    });
    ["suName", "suPass", "suPass2"].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("keydown", function (e) { if (e.key === "Enter") void authSignup(); });
    });
    var gn = $("gName");
    if (gn) gn.addEventListener("keydown", function (e) { if (e.key === "Enter") void authGuest(); });

    authTab("Login");
    authCloudUi();
    setTimeout(function(){ try{ authCloudUi(); }catch(e){} }, 2500);
    try{ window.addEventListener("ll-firebase-ready", function(){ try{ authCloudUi(); authWireFirebase(); authFocus(); }catch(e){} }); }catch(e2){}

    authWireFirebase();
  } catch (e) {}
}

var authFbWired = false;
/* Registers the Firebase auth listener once, whenever the bridge arrives —
 * at init if the SDK already loaded, or later via ll-firebase-ready. */
function authWireFirebase() {
  try {
    if (authFbWired) return;
    if (!window.LLFirebase || typeof window.LLFirebase.onAuthChange !== "function") return;
    authFbWired = true;
    window.LLFirebase.onAuthChange(function (fbUser) {
        if (fbUser) {
          var player = {
            uid: fbUser.uid,
            name: fbUser.displayName || "Player",
            email: fbUser.email || "",
            photoURL: fbUser.photoURL || "",
            guest: false,
            cloud: true,
            local: false
          };
          window.LLPlayer = player;
          try { localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(player)); } catch (e) {}
          renderPlayerChip();
          renderAccountModal();
          if (window.__LL_AUTH_DONE) {
            void cloudSyncAll(false);
          } else {
            authFocus();
          }
        } else {
          if (window.LLPlayer && window.LLPlayer.cloud) {
            window.LLPlayer = null;
            renderPlayerChip();
            renderAccountModal();
          }
        }
      });
  } catch (e) {}
}

window.cloudSyncAll = cloudSyncAll;
window.isCloudSignedIn = isCloudSignedIn;
document.addEventListener("DOMContentLoaded", authInit);

LL.files.push("auth"); /* end-of-file registration: counts as loaded only after this file fully ran */
