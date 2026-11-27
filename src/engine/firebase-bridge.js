/* LIFE & LEGACY — engine/firebase-bridge.js
 * Optional Firebase bridge: Google Sign-In + Firestore cloud sync for
 * server-hosted builds. DORMANT BY DEFAULT: if no Firebase config is found,
 * window.LLFirebase stays undefined and every game call site (all guarded
 * with `window.LLFirebase && ...`) keeps working locally — Perchance, Pages
 * and file:// builds are unaffected.
 *
 * Config sources (first hit wins):
 *   1. window.FIREBASE_CONFIG (a host page may stamp it before engine scripts)
 *   2. fetch("src/firebase-config.json") (fill in the template shipped at that
 *      path with your Firebase web-app config, then save — Perchance/Pages
 *      serve it like every other src/ file; Firebase web config is
 *      public-by-design, enforced by firestore.rules, never by secrecy)
 *   3. fetch("firebase-applet-config.json") (server-hosted layout)
 *   4. fetch("src/firebase-applet-config.json") (server-hosted layout)
 * file:// is skipped (Auth popups need http). No secrets here: Firebase web
 * config (apiKey/authDomain/...) is public-by-design; access is enforced by
 * firestore.rules, never by hiding these identifiers.
 *
 * Surface (mirrors src/firebase-bridge.ts on server builds):
 *   getUser, signInWithGoogle, signOut, onAuthChange, ensureProfile,
 *   saveSettings, saveSlot, loadAllSaves, deleteSlot,
 *   saveAchievements, loadAchievements, hallPost, hallBoard.
 *
 * Shared scope: classic script, globals (window only). Load order = index.html
 * order (before i18n.js). NOT in boot EXPECT_FILES (optional by design).
 */
"use strict";
(function () {
  if (window.LLFirebase) return;
  var SDK = "https://www.gstatic.com/firebasejs/10.12.5/";
  var CFG_URLS = ["src/firebase-config.json", "firebase-applet-config.json", "src/firebase-applet-config.json"];
  var SLOT_ID_RE = /^(auto|slot[0-6])$/;
  var MAX_STATE_BYTES = 650000;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      try {
        var s = document.createElement("script");
        s.src = src; s.async = true;
        s.onload = function () { res(); };
        s.onerror = function () { rej(new Error("sdk load failed: " + src)); };
        document.head.appendChild(s);
      } catch (e) { rej(e); }
    });
  }

  /* ---- Firestore-safe encode/decode (nested arrays are wrapped) ---- */
  function encVal(v, inArr, depth) {
    if (depth > 18) return null;
    if (v === null || v === undefined) return null;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) {
      var c = v.map(function (x) { return encVal(x, true, depth + 1); });
      return inArr ? { __llNestedArr: c } : c;
    }
    if (typeof v === "object") {
      var o = {};
      for (var k in v) {
        if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
        if (typeof v[k] === "function" || typeof v[k] === "symbol" || v[k] === undefined) continue;
        if (!k) continue;
        o[k] = encVal(v[k], false, depth + 1);
      }
      return o;
    }
    return null;
  }
  function decVal(v, depth) {
    if (depth > 20 || v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(function (x) { return decVal(x, depth + 1); });
    if (typeof v === "object") {
      var ks = Object.keys(v);
      if (ks.length === 1 && ks[0] === "__llNestedArr" && Array.isArray(v.__llNestedArr))
        return v.__llNestedArr.map(function (x) { return decVal(x, depth + 1); });
      var o = {};
      for (var k in v) {
        if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
        o[k] = decVal(v[k], depth + 1);
      }
      return o;
    }
    return v;
  }
  /* Trim a life state until it fits the cloud budget (tails of long lists go first). */
  function sanitizeState(state) {
    var c = null;
    try { c = JSON.parse(JSON.stringify(state || {})); } catch (e) { c = {}; }
    function bytes() { try { return JSON.stringify(c).length; } catch (e) { return MAX_STATE_BYTES + 1; } }
    var guard = 0;
    while (bytes() > MAX_STATE_BYTES && guard++ < 12) {
      var cut = false;
      if (c.log && c.log.length > 40) { c.log = c.log.slice(-40); cut = true; }
      else if (c.history && c.history.length > 20) { c.history = c.history.slice(-20); cut = true; }
      else if (c.world && c.world.news && c.world.news.length > 20) { c.world.news = c.world.news.slice(-20); cut = true; }
      else if (c.world && c.world.journal && c.world.journal.length > 30) { c.world.journal = c.world.journal.slice(-30); cut = true; }
      if (!cut) break;
    }
    return encVal(c, false, 0);
  }
  function summarize(st) {
    try {
      return { name: (st.firstName || "?") + " " + (st.lastName || ""), age: st.age || 0,
        money: st.money || 0, alive: st.alive !== false };
    } catch (e) { return { name: "?", age: 0, money: 0, alive: true }; }
  }

  async function boot() {
    try {
      var cfg = (window.FIREBASE_CONFIG && typeof window.FIREBASE_CONFIG === "object") ? window.FIREBASE_CONFIG : null;
      if (!cfg) {
        for (var i = 0; i < CFG_URLS.length; i++) {
          try {
            var r = await fetch(CFG_URLS[i], { cache: "no-store" });
            if (r && r.ok) { cfg = await r.json(); break; }
          } catch (e) {}
        }
      }
      if (!cfg || !cfg.apiKey || !cfg.authDomain || !cfg.projectId) return; /* dormant */
      try {
        if (window.location && window.location.protocol === "file:") return; /* popups need http */
      } catch (e) {}
      await loadScript(SDK + "firebase-app-compat.js");
      await loadScript(SDK + "firebase-auth-compat.js");
      await loadScript(SDK + "firebase-firestore-compat.js");
      if (!window.firebase) return;
      var app = window.firebase.initializeApp(cfg);
      var auth = window.firebase.auth();
      var db = window.firebase.firestore();
      var FV = window.firebase.firestore.FieldValue;
      var coll = function (uid, sub) {
        var ref = db.collection("users").doc(uid);
        return sub ? ref.collection(sub) : ref;
      };

      window.LLFirebase = {
        getUser: function () { try { return auth.currentUser || null; } catch (e) { return null; } },
        signInWithGoogle: async function () {
          var provider = new window.firebase.auth.GoogleAuthProvider();
          try {
            var cred = await auth.signInWithPopup(provider);
            return cred.user;
          } catch (e) {
            var code = (e && e.code) || "";
            var host = "";
            try { host = window.location.host; } catch (eH) {}
            if (code === "auth/unauthorized-domain") {
              throw new Error("Unauthorized domain — add to Firebase Auth authorized domains: " + host);
            }
            if (code === "auth/operation-not-allowed") {
              throw new Error("Google sign-in is off — Firebase Console → Authentication → Sign-in method → enable Google.");
            }
            if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") {
              throw new Error("Firebase web config looks wrong — re-check src/firebase-config.json values.");
            }
            if (code === "auth/popup-blocked") {
              /* Popups blocked: fall back to a full redirect. The page reloads
               * through Google and back; boot picks the session up via
               * getRedirectResult + onAuthStateChanged. Never resolves here. */
              try { await auth.signInWithRedirect(provider); } catch (eR) { throw eR; }
              return new Promise(function () {});
            }
            throw e;
          }
        },
        signOut: function () { return auth.signOut(); },
        onAuthChange: function (cb) { return auth.onAuthStateChanged(cb); },
        ensureProfile: async function (settings, ui) {
          var u = auth.currentUser;
          if (!u) return null;
          var ref = coll(u.uid), now = Date.now();
          var snap = null;
          try { snap = await ref.get(); } catch (e) { snap = null; }
          var cur = (snap && snap.exists) ? (snap.data() || {}) : {};
          var out = {
            theme: (settings && settings.theme) || cur.theme || "crimson",
            lang: (settings && settings.lang) || cur.lang || "en",
            tab: (ui && ui.tab) || (cur.ui && cur.ui.tab) || "activities",
            music: (ui && typeof ui.music === "boolean") ? ui.music : ((cur.ui && typeof cur.ui.music === "boolean") ? cur.ui.music : true)
          };
          var remoteAt = cur.updatedAt || 0;
          if (!snap || !snap.exists || now >= remoteAt) {
            var doc = { uid: u.uid, displayName: u.displayName || "", email: u.email || "",
              theme: out.theme, lang: out.lang, ui: { tab: out.tab, music: out.music },
              updatedAt: now, createdAt: cur.createdAt || now };
            try { await ref.set(doc, { merge: true }); } catch (e) {}
          } else {
            out.theme = cur.theme || out.theme; out.lang = cur.lang || out.lang;
            if (cur.ui) { out.tab = cur.ui.tab || out.tab;
              if (typeof cur.ui.music === "boolean") out.music = cur.ui.music; }
          }
          return out;
        },
        saveSettings: async function (settings, ui) {
          var u = auth.currentUser;
          if (!u) return;
          try {
            await coll(u.uid).set({ theme: settings.theme, lang: settings.lang,
              ui: { tab: ui.tab, music: ui.music }, updatedAt: Date.now() }, { merge: true });
          } catch (e) {}
        },
        saveSlot: async function (slotId, entry) {
          var u = auth.currentUser;
          if (!u) return;
          if (!SLOT_ID_RE.test(slotId)) throw new Error("bad slot id");
          var payload = { ownerUid: u.uid, slotId: slotId, savedAt: (entry && entry.savedAt) || Date.now(),
            summary: summarize(entry && entry.state), state: sanitizeState(entry && entry.state),
            updatedAt: Date.now() };
          if (!entry || !entry.state) throw new Error("empty entry");
          await coll(u.uid, "saves").doc(slotId).set(payload);
        },
        loadAllSaves: async function () {
          var u = auth.currentUser;
          if (!u) return { auto: null, slots: [] };
          var ids = ["auto", "slot0", "slot1", "slot2", "slot3", "slot4", "slot5", "slot6"];
          var out = { auto: null, slots: [] };
          for (var i = 0; i < ids.length; i++) {
            try {
              var snap = await coll(u.uid, "saves").doc(ids[i]).get();
              if (snap && snap.exists) {
                var d = snap.data() || {};
                var entry = { savedAt: d.savedAt || 0, state: decVal(d.state) };
                if (ids[i] === "auto") out.auto = entry;
                else out.slots[+ids[i].slice(4)] = entry;
              }
            } catch (e) {}
          }
          return out;
        },
        deleteSlot: async function (slotId) {
          var u = auth.currentUser;
          if (!u) return;
          if (!SLOT_ID_RE.test(slotId)) return;
          try { await coll(u.uid, "saves").doc(slotId).delete(); } catch (e) {}
        },
        saveAchievements: async function (map) {
          var u = auth.currentUser;
          if (!u) return;
          try {
            await coll(u.uid, "meta").doc("achievements")
              .set({ ownerUid: u.uid, unlocked: encVal(map || {}, false, 0), updatedAt: Date.now() }, { merge: true });
          } catch (e) {}
        },
        hallPost: async function (entry) {
          var u = auth.currentUser;
          if (!u || !entry) return;
          await db.collection("hallOfHouses").doc(u.uid).set({
            ownerUid: u.uid, displayName: u.displayName || "",
            house: String((entry.house || "")).slice(0, 40),
            name: String((entry.name || "")).slice(0, 80),
            score: Math.round(+entry.score || 0),
            renown: Math.round(+entry.renown || 0),
            prestige: Math.round(+entry.prestige || 0),
            fame: Math.round(+entry.fame || 0),
            wealth: Math.round(+entry.wealth || 0),
            updatedAt: Date.now()
          }, { merge: true });
        },
        hallBoard: async function () {
          var snap = await db.collection("hallOfHouses").orderBy("score", "desc").limit(20).get();
          var out = [];
          snap.forEach(function (d) { try { out.push(d.data() || {}); } catch (e) {} });
          return out;
        },
        loadAchievements: async function () {
          var u = auth.currentUser;
          if (!u) return {};
          try {
            var snap = await coll(u.uid, "meta").doc("achievements").get();
            if (snap && snap.exists) {
              var d = snap.data() || {};
              return decVal(d.unlocked) || {};
            }
          } catch (e) {}
          return {};
        }
      };
      try {
        /* Complete a redirect-flow sign-in (popup-blocked fallback): the user
         * is already signed in on return; onAuthStateChanged picks them up. */
        await auth.getRedirectResult();
      } catch (eRR) {}
      try { window.dispatchEvent(new Event("ll-firebase-ready")); } catch (e) {}
    } catch (e) { /* stay dormant: local play unaffected */ }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})();
