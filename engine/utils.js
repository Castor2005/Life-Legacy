/* LIFE & LEGACY — engine/utils.js
 * SECTION 0 pure helpers (clamp/rnd/pick/esc/chance/randInt/findById/average). No S, no DOM.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* -- SECTION 0: PURE HELPERS (no S, no DOM, no IO; same in/out) -- */
var $ = function(id){ return document.getElementById(id); };
/* Central sim RNG: WASM xorshift when ready, Math.random fallback.
 * Loaded before wasm.js defines LL.wasmRand, so resolve at CALL time —
 * every pick()/chance()/rnd() in the sim rides the fast WASM stream. */
function rnd(){ try{ if(window.LL&&typeof LL.wasmRand==="function") return LL.wasmRand(); }catch(e){} return Math.random(); }
function clamp(v,a,b){ if(a===undefined)a=0; if(b===undefined)b=100; v=Math.round(v); return v<a?a:(v>b?b:v); }
function clamp100(v){ return clamp(v,0,100); }
function pick(a){ return a[Math.floor(rnd()*a.length)]; }
function fmt$(n){ return (n<0?"-$":"$")+Math.abs(Math.round(n)).toLocaleString(); }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function chance(p){ return rnd()<p; }
function randInt(a,b){ return a+Math.floor(rnd()*(b-a+1)); }
function findById(arr,id){ if(!arr)return null; for(var i=0;i<arr.length;i++) if(arr[i]&&arr[i].id===id) return arr[i]; return null; }
function average(nums){ if(!nums||!nums.length)return 0; var s=0,i; for(i=0;i<nums.length;i++)s+=nums[i]; return s/nums.length; }

LL.files.push("utils"); /* end-of-file registration: counts as loaded only after this file fully ran */
