"use strict";
/* Life & Legacy GitHub Pages player — compatibility shim (v0.1.05).
 * Replaces the 3 perchance-only services the page used online:
 *  1. {import:kv-plugin}      -> localStorage-backed root.kv.saves (same async API)
 *  2. [remember(window,LLUI)] -> load/save window.LLUI to localStorage every 500ms
 *  3. content/mods JSON fetch -> served from embedded js/offline-data.js on file://
 * AI plugins (text/image), wiki grounding, guestbook and charts stay absent by
 * design: every call site already guards them and falls back to deterministic
 * offline content (full sim, genetics, crises, saves, music and SFX all work). */
window.LL_OFFLINE = true;
window.LL = (window.LL || { v: 1, files: [] });
function __llLsGet(k){ try{ var v = window.localStorage.getItem(k); return v == null ? null : JSON.parse(v); }catch(e){ return null; } }
function __llLsSet(k, v){ try{ window.localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function __llLsDel(k){ try{ window.localStorage.removeItem(k); }catch(e){} }
var __KV_PREFIX = "ll_off_kv_";
window.root = {
  kv: { saves: {
    get: function(k){ return Promise.resolve(__llLsGet(__KV_PREFIX + k)); },
    set: function(k, v){ __llLsSet(__KV_PREFIX + k, v); return Promise.resolve(true); },
    delete: function(k){ __llLsDel(__KV_PREFIX + k); return Promise.resolve(true); },
    entries: function(){
      var out = [];
      try{
        for (var i = 0; i < window.localStorage.length; i++){
          var k = window.localStorage.key(i);
          if (k && k.indexOf(__KV_PREFIX) === 0) out.push([k.slice(__KV_PREFIX.length), __llLsGet(k)]);
        }
      }catch(e){}
      return Promise.resolve(out);
    }
  } }
};
try{
  var __savedUI = __llLsGet("ll_offline_ui");
  if (__savedUI && typeof __savedUI === "object") window.LLUI = __savedUI;
}catch(e){}
try{ if (window.setInterval) window.setInterval(function(){
  try{ if (window.LLUI) __llLsSet("ll_offline_ui", { tab: window.LLUI.tab, fate: window.LLUI.fate, music: window.LLUI.music }); }catch(e){}
}, 500); }catch(e){}
try{ if (!window.localStorage.getItem("ll_art_off")) window.LL_ART = false; }catch(e){ window.LL_ART = false; }
var __NATIVE_FETCH = (window.fetch ? window.fetch.bind(window) : null);
window.fetch = function(url, opts){
  try{
    var u = String(url);
    if (window.__OFFLINE_DATA && (u.indexOf("src/content/") >= 0 || u.indexOf("src/mods/") >= 0)){
      var key = u.indexOf("src/content/") >= 0 ? u.slice(u.indexOf("src/content/")) : u.slice(u.indexOf("src/mods/"));
      key = key.split("?")[0].split("#")[0];
      if (Object.prototype.hasOwnProperty.call(window.__OFFLINE_DATA, key)){
        return Promise.resolve(new Response(JSON.stringify(window.__OFFLINE_DATA[key]),
          { status: 200, headers: { "Content-Type": "application/json" } }));
      }
    }
  }catch(e){}
  if (__NATIVE_FETCH) return __NATIVE_FETCH(url, opts);
  return Promise.reject(new Error("offline: no network"));
};