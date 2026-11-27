/* LIFE & LEGACY — engine/state.js
 * SECTION 1 global state: S, STAT_KEYS, BAD_IDS, settings/THEMES, name pools, S-reading name helpers.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* -- SECTION 1: GLOBAL STATE (the one mutable save object; kept as-is) -- */
/* S holds the entire life save. Do NOT add a second global store: future
 * modules receive S (or a slice) as an argument and return patches. */
var BAD_IDS = {"bully":1,"car-crash-teen":1,"mugging":1,"layoff":1,"gym-injury":1,"health-scare":1,"hip":1,"house-fire":1,"storm":1,"divorce-risk":1,"plane-crash-near":1,"night-fever":1,"flu-school":1,"pyramid":1,"prison-shank":1,"scandal":1,"fame-hate":1,"feud":1,"duel":1,"blackmail-target":1,"startup-bust":1,"draft":1,"lost-park":1,"monkeybars":1,"fake-id":1,"speeding-ticket":1,"scam-call":1,"cataract-surgery":1,"pension-cut":1,"elevator-stuck":1,"food-poisoning":1,"uw-rival":1,"uw-cop":1,"uw-skim":1,"uw-snitch":1,"uw-truck":1,"uw-vault":1,"uw-crackdown":1,"uw-yarddebt":1,"kid-cops":1,"co-lawsuit":1,"co-audit":1,"co-recession":1,"co-walkout":1,"sx-tape-leak":1,"sx-obsessed":1,"sx-addiction":1,"sx-broken":1,"sx-netori-cuck":1,"sx-sibling-heat":1,"sx-parent-widow":1,"sx-cell-trade":1,"ow-break-cell":1,"ow-force-night":1,"ow-preg-force":1,"ow-sibling-oath":1,"ow-widow-keep":1,"ow-steal-spouse":1,"ow-break-stolen":1,"ow-cuck-price":1,"ex-take-alley":1,"ex-take-club-toilet":1,"ex-take-gym-shower":1,"ex-take-office-late":1,"ex-take-neighbor-door":1,"ex-take-hitchhiker":1,"ex-take-bar-widow":1,"ex-take-divorcee":1,"ex-take-ex":1,"ex-take-sleeper-train":1,"ex-netori-gym-couple":1,"ex-netori-neighbor-wife":1,"ex-netori-bestfriend-girl":1,"ex-netori-boss-wife":1,"ex-netori-sibling-partner":1,"ex-netori-eve-bride":1,"ex-netori-watch-husband":1,"ex-netori-breed-wife":1,"ex-sis-shower":1,"ex-sis-rent":1,"ex-mom-widow-night":1,"ex-aunt-visit":1,"ex-cousin-keep":1,"ex-daughter-grown":1,"ex-sis-share-night":1,"ex-stepmother-widow":1,"ex-break-brat":1,"ex-break-shy":1,"ex-break-collar-week":1,"ex-break-pet-woods":1,"ex-break-denial-month":1,"ex-break-gaslight":1,"ex-break-tears-fuck":1,"ex-break-brand-skin":1,"ex-power-secretary-OT":1,"ex-power-night-prof":1,"ex-power-nurse-rounds":1,"ex-power-cop-cuffs":1,"ex-power-landlord-rent":1,"ex-power-coach-cuts":1,"ex-power-cell-run":1,"ex-power-intern-contract":1,"ex-power-maid-cart":1,"ex-power-casting-two":1,"ex-keep-ritual-dawn":1,"ex-keep-harem-school":1,"ex-keep-chastity-key":1,"ex-keep-weekend-room":1,"ex-keep-breed-program":1,"ex-keep-discard-broken":1};
var STAT_KEYS = ["health","happiness","smarts","looks","fitness","discipline","creativity","social","karma"];
function rNameG(g){ return (g==="female"?pick(FEM):g==="male"?pick(MALE):pick(MALE.concat(FEM)))+" "+pick(LAST); }
function partnerGender(){ if(!S) return pick(["male","female"]);
  var g=S.gender, sx=S.sexuality||"straight";
  if(sx==="bi"||sx==="pan"||sx==="ace") return pick(["male","female"]);
  if(sx==="gay") return (g==="male"||g==="female")?g:pick(["male","female"]);
  return g==="male"?"female":(g==="female"?"male":pick(["male","female"]));
}
function partnerName(){ return rNameG(partnerGender()); }

var MALE=["James","Liam","Noah","Oliver","Ethan","Mason","Lucas","Leo","Kai","Felix","Hugo","Ivan","Ravi","Kenji","Omar","Diego","Elias","Theo","Finn","Ezra"];
var FEM=["Olivia","Emma","Ava","Sophia","Isabella","Mia","Luna","Sofia","Aria","Zoe","Ruby","Nora","Freya","Priya","Yuki","Amara","Elena","Clara","Mila","Ivy"];
var LAST=["Smith","Johnson","Garcia","Kim","Chen","Rossi","Silva","Novak","Haddad","Tanaka","Okafor","Dubois","Costa","Weber","Ali","Rahman","Lopez","Kumar","Fischer","Santos","Meyer","Park","Ivanov","Silva"];
function rName(g){ return rNameG(g); }
function hasTrait(id){ return S && S.traits && S.traits.indexOf(id)>=0; }
/* Diminishing returns on stat GAINS (anti-max fix): a positive delta scales
 * with the SQUARE of remaining headroom — early training feels fast, the
 * 70s slow down, the 90s crawl, and a true 100 is legend-tier. Losses always
 * apply in full (setbacks must bite). Unknown keys are ignored, never throws. */
function gainStat(key, delta){
  try{
    if(!S||!S.stats||STAT_KEYS.indexOf(key)<0)return 0;
    var d=+delta||0, raw=S.stats[key];
    var cur=(raw===undefined||raw===null)?50:(+raw||0);
    if(!(d>0)){ S.stats[key]=clamp100(cur+d); return S.stats[key]; }
    var hr=100-cur;
    if(hr<=0)return cur;
    var f=hr/50;
    S.stats[key]=clamp100(cur+d*Math.max(0.06,f*f));
    return S.stats[key];
  }catch(e){ return 0; }
}

var S=null, autoTimer=null, curTab="activities";
/* LLUI: tiny JSON-safe UI session prefs persisted by remember-plugin.
 * [remember(window,"LLUI")] at the top of index.html saves window.LLUI every
 * 500ms and restores it once at render — before any engine script runs — so
 * this merge adopts last session's values. Game state S is NEVER stored here:
 * saves.js owns S (its validateSave/migrateSave gates must not be bypassed). */
var LLUI=Object.assign({tab:"activities",music:true},(typeof window!=="undefined"&&window.LLUI)||{});
if(typeof LLUI.tab!=="string")LLUI.tab="activities";
if(typeof LLUI.music!=="boolean")LLUI.music=true;
var settings={lang:"en",theme:"crimson"};
try{ Object.assign(settings,JSON.parse(localStorage.getItem("sdls_settings")||"{}")); }catch(e){}
if(!window.I18N||!window.I18N[settings.lang])settings.lang="en"; /* load-order safe: i18n.js normally first, but never throw at load if it isn't */
var THEMES=[
  {id:"dark",name:"Midnight",icon:"🌙",desc:"Classic gold & neon",sw:["#0b0e22","#c9a45c"]},
  {id:"light",name:"Ivory",icon:"☀️",desc:"Clean & bright",sw:["#eef1fb","#5b4cf0"]},
  {id:"parchment",name:"Parchment",icon:"📜",desc:"Old manuscript",sw:["#f6eeda","#8a6a24"]},
  {id:"crimson",name:"Crimson",icon:"🩸",desc:"Bloodline court",sw:["#2e0f1c","#e5486f"]},
  {id:"abyss",name:"Abyss",icon:"🌊",desc:"Deep teal neon",sw:["#0a2c3a","#22d3ee"]}
];
if(!THEMES.some(function(t){return t.id===settings.theme;}))settings.theme="crimson";
function setTheme(t){
  if(!THEMES.some(function(x){return x.id===t;}))t="crimson";
  settings.theme=t; document.documentElement.dataset.theme=t;
  try{ localStorage.setItem("sdls_settings",JSON.stringify(settings)); }catch(e){}
  var b=$("themeSelTop"); if(b)b.value=t;
}
window.__lang=settings.lang;


LL.files.push("state"); /* end-of-file registration: counts as loaded only after this file fully ran */