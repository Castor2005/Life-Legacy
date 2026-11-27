/* LIFE & LEGACY — engine/migrate.js
 * Schema versions + migration registries (single source of truth).
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json.
 *
 * THREE VERSIONS (bump rules at the bottom):
 *   LL.SAVE_VERSION    — shape of the S save object. Bumped when a SAVE_MIGRATIONS
 *                        step is added. Old saves upgrade stepwise on load.
 *   LL.CONTENT_VERSION — shape of src/content (index.json packs + event files).
 *                        Must match index.json contentVersion. Bumped when the
 *                        content contract changes (new required event field, new
 *                        effect op family, pack layout change...).
 *   LL.EVENT_SCHEMA    — shape of one event JSON file. Individual files may carry
 *                        "schema": N (default 1 when absent). Bumped only for a
 *                        breaking per-file change; EVENT_MIGRATIONS upgrades old
 *                        files forward so hand-authored content keeps working.
 *
 * TOOLS PARSE THIS FILE: src/tools/validate-content.js and build-events.js read
 * the three `LL.X = N;` lines below with a regex (keep them on one line each).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
LL.SAVE_VERSION = 7;
LL.CONTENT_VERSION = 4;
LL.EVENT_SCHEMA = 1;
LL.APP_VERSION = "v0.1.06";

/* ============ save migrations (ordered, idempotent) ============
 * Moved verbatim out of life.js migrate() and split into steps. Every step
 * only fills in missing fields, so re-running is a no-op. Steps run in order
 * for any save with S.v < step.v. Pre-7 step boundaries are reconstructed
 * from code history (v3 = newLife shape, v4 = world+shares era); exact
 * boundaries don't matter for correctness because all steps are idempotent.
 * ADDING A STEP: append {v: LL.SAVE_VERSION+1, ...}, bump LL.SAVE_VERSION,
 * document in src/content/SCHEMA.md. NEVER edit an old step's behavior —
 * old saves must always converge to the same shape. */
function stepMigrateV4Identity(){
  if(!S.flags)S.flags={};
  if(!S.relationships)S.relationships={children:[],partner:null,friends:[],pets:[],siblings:[],grandparents:[],grandkids:[]};
  var fl=["student","retired","memoir","hasWill","inJail","homeless","noBad","infiniteStats","unfiltered","ageless","undying","everYouth","joyful","blessed","goldenTouch","charming","community","grad"];
  for(var i=0;i<fl.length;i++){ var k=fl[i]; if(S.flags[k]===undefined) S.flags[k]=(k==="inJail"?0:(k==="unfiltered"?true:false)); }
  if(!S.sexuality)S.sexuality="straight"; if(!S.genderIdentity)S.genderIdentity="Male";
  if(!S.bioSex)S.bioSex=S.gender; if(!S.race)S.race="Mixed"; if(!S.city)S.city="";
  if(!S.religion)S.religion="None"; if(!S.customWorld)S.customWorld="";
  if(S.customEvents===undefined)S.customEvents=0; if(!S.birthYear)S.birthYear=S.year-S.age;
  if(S.record===undefined)S.record=0; if(S.heat===undefined)S.heat=0; if(S.promoY===undefined)S.promoY=0;
}
function stepMigrateV5Stats(){
  var j;
  if(!S.stats)S.stats={};
  if(!S.relationships)S.relationships={children:[],partner:null,friends:[],pets:[],siblings:[],grandparents:[],grandkids:[]};
  for(j=0;j<STAT_KEYS.length;j++){ var sk=STAT_KEYS[j]; if(typeof S.stats[sk]!=="number")S.stats[sk]=50; }
  if(!S.traits||!S.traits.length)S.traits=rollTraits();
  if(!S.appearance)S.appearance=genAppearance(S.gender,S.race);
  if(!S.appearance.build)S.appearance.build=pick(BUILDS);
  (function(){ var d=genAppearance(S.gender,S.race,S.raceF,S.raceM); for(var k in d) if(S.appearance[k]===undefined)S.appearance[k]=d[k]; })();
  if(S.race==="Mixed"&&!S.raceF){ S.raceF=pick(RACES_MIXABLE); S.raceM=pick(RACES_MIXABLE); }
  if(!S.imgSeed)S.imgSeed=1+Math.floor(Math.random()*999999);
  if(S.stress===undefined)S.stress=10; if(S.fame===undefined)S.fame=0;
  if(S.followers===undefined)S.followers=0; if(S.prestige===undefined)S.prestige=20;
  if(S.renown===undefined)S.renown=0; if(!S.lifestyle)S.lifestyle="none";
  if(!S.major)S.major="General"; if(!S.ach)S.ach={vacations:0,jobs:0,partners:0,feasts:0,crimes:0,wishes:0};
  if(!S.background)S.background="commoner"; if(!S.childhood)S.childhood="none";
  if(!S.ambition)S.ambition="none"; if(S.ambitionDone===undefined)S.ambitionDone=false;
  if(!S.fate)S.fate={nemesis:false,ill:false,trust:false};
  if(!S.relationships.grandkids)S.relationships.grandkids=[];
  if(!S.relationships.siblings)S.relationships.siblings=[];
  if(!S.relationships.grandparents)S.relationships.grandparents=[];
}
function stepMigrateV6Systems(){
  if(!S.flags)S.flags={};
  if(!S.relationships)S.relationships={children:[],partner:null,friends:[],pets:[],siblings:[],grandparents:[],grandkids:[]};
  if(S.company===undefined)S.company=null; if(S.underworld===undefined)S.underworld=null; if(S.groomed===undefined)S.groomed=null;
  sexEnsure();
  if(S.business&&!S.company){ S.company={name:S.business.name,sector:"trade",value:S.business.value,cash:2000,employees:2,morale:55,rep:10,founded:S.year,level:1}; S.business=null; }
  (S.relationships.children||[]).forEach(function(c){ normalizeKid(c); });
  if(!S.assets)S.assets={houseId:"none",carId:"none",stocks:0,crypto:0,savings:0,houseVal:0,carVal:0,houseYears:0};
  if(S.assets.houseVal===undefined)S.assets.houseVal=0; if(S.assets.carVal===undefined)S.assets.carVal=0;
  if(S.assets.houseYears===undefined)S.assets.houseYears=0;
  if(S.heirId===undefined)S.heirId=null; if(S.will===undefined)S.will=!!S.flags.hasWill;
  if(!S.assets.shares)S.assets.shares={};
  if(!S.world)wInit();
  if(S.world.div===undefined||!S.world.div)S.world.div={war:0,politics:0,tech:0,economy:0,science:0,culture:0};
  if(!S.world.hypo)S.world.hypo={};
  if(!S.world.divHist)S.world.divHist={};
  if(S.world.divHist[S.birthYear]===undefined)S.world.divHist[S.birthYear]=Object.assign({},S.world.div);
}
function stepMigrateV7Chat(){
  if(!S.chatImg)S.chatImg={style:"cine",res:"512x512"};
  if(!S.focusList||!S.focusList.length)S.focusList=buildFocusList(S.birthYear||2000,S.background||"humble");
  if(!S.customFocuses)S.customFocuses=[];
  if(S.lastFocusAI===undefined)S.lastFocusAI=0;
  if(S.customBg===undefined)S.customBg="";
  if(S.customBgDone===undefined)S.customBgDone=false;
  if(S.region===undefined)S.region="";
  if(S.dob===undefined)S.dob="";
  if(S.raceF===undefined){S.raceF=null;S.raceM=null;}
}
LL.SAVE_MIGRATIONS=[
  {v:4,id:"identity-flags",desc:"flags table + identity fields (sexuality, race, city, religion, record/heat)",run:stepMigrateV4Identity},
  {v:5,id:"stats-appearance",desc:"stats fill + traits + appearance DNA + prestige/fame/ach/background/fate",run:stepMigrateV5Stats},
  {v:6,id:"systems",desc:"company/underworld/sex systems + world init + shares + kid normalization",run:stepMigrateV6Systems},
  {v:7,id:"chat-focus-geo",desc:"chat image prefs + focus lists + custom background + region/DOB",run:stepMigrateV7Chat}
];
/* Runner: upgrades global S from S.v (default 1 = pre-versioned) to SAVE_VERSION.
 * Returns "ok" | "no-save" | "newer" | "partial:<stepId>". Downgrade (save
 * from a future version): data is left untouched, version stamp kept,
 * caller warns the player.
 * A FAILED step halts the upgrade: S is restored from a pre-run snapshot,
 * the version is NOT stamped, and "partial:<stepId>" is returned with the
 * snapshot preserved at window.__LL_MIGRATE_BACKUP. A partially-migrated
 * save must never look successfully upgraded. */
function migrateSave(){
  if(!S||typeof S!=="object")return "no-save";
  var from=(typeof S.v==="number"&&isFinite(S.v))?Math.floor(S.v):1;
  if(from>LL.SAVE_VERSION){
    if(window.console&&console.warn)console.warn("migrate: save v"+from+" is newer than engine v"+LL.SAVE_VERSION+" — loading best-effort");
    return "newer";
  }
  var backup=null;
  try{ backup=JSON.stringify(S); }catch(e){ backup=null; }
  for(var i=0;i<LL.SAVE_MIGRATIONS.length;i++){
    var st=LL.SAVE_MIGRATIONS[i];
    if(st.v>from){ try{ st.run(); }catch(e){
      if(window.console&&console.warn)console.warn("migrate: step "+st.id+" failed: "+(e&&e.message)+" — upgrade halted, save restored");
      try{ if(backup){ S=JSON.parse(backup); S.v=from; } }catch(e2){}
      try{ window.__LL_MIGRATE_BACKUP=backup; }catch(e3){}
      return "partial:"+st.id;
    } }
  }
  S.v=LL.SAVE_VERSION;
  return "ok";
}
/* Legacy entry point (ui.js afterLoad calls this). Keep the name. */
function migrate(){ return migrateSave(); }
/* Pre-load gate: rejects damaged saves BEFORE they replace the live S.
 * Lenient on purpose (migrate() fills everything else); strict only about
 * the spine the engine dereferences unconditionally. Returns null when ok,
 * else a short human-readable reason. */
function validateSave(st){
  if(!st||typeof st!=="object")return "not an object";
  if(!st.stats||typeof st.stats!=="object")return "missing stats";
  if(!st.relationships||typeof st.relationships!=="object")return "missing relationships";
  if(!Array.isArray(st.log))return "missing log";
  if(typeof st.age!=="number"||!isFinite(st.age))return "missing age";
  return null;
}
/* Runtime spine check: WARN-ONLY, never repairs destructively.
 * wInit() re-inits (wipes NPCs/market/history) and defaultSex() assignment
 * wipes claims/corruption, so neither is ever called here on a live game —
 * the only auto-fix is sexEnsure(), which purely fills missing fields.
 * Runs at the end of every year (endYear), before autosave. Never throws. */
/* Typo-tripwire: unknown S.stats keys warned ONCE per session (never repaired,
 * never thrown). S.stats is fixed-shape (STAT_KEYS) unlike S.flags, so a key
 * like "smatrs" is always a bug or legacy cruft — surfacing it beats the
 * silent-undefined alternative. Legit code never adds keys here (dynamic
 * per-stat access uses S.stats[k], which this does not flag). */
var checkSSeenTypos={};
function checkSUnknownStats(tag){
  try{
    if(!S||!S.stats||typeof S.stats!=="object")return;
    var ok={}, i;
    for(i=0;i<STAT_KEYS.length;i++)ok[STAT_KEYS[i]]=1;
    for(var k in S.stats){
      if(!Object.prototype.hasOwnProperty.call(S.stats,k))continue;
      if(ok[k]||checkSSeenTypos[k])continue;
      checkSSeenTypos[k]=1;
      if(window.console&&typeof console.warn==="function")
        console.warn("checkS("+(tag||"?")+") unknown S.stats key \""+k+"\" — possible typo or legacy cruft (valid: "+STAT_KEYS.join(", ")+"). Ignored, not deleted.");
    }
  }catch(e){}
}
function checkS(tag){
  try{
    if(!S||typeof S!=="object")return "no-save";
    try{ if(typeof sexEnsure==="function")sexEnsure(); }catch(e){}
    var bad=[];
    if(!S.stats||typeof S.stats!=="object")bad.push("S.stats");
    if(!S.relationships||typeof S.relationships!=="object")bad.push("S.relationships");
    if(!S.assets||typeof S.assets!=="object")bad.push("S.assets");
    if(!S.world||typeof S.world!=="object")bad.push("S.world");
    if(!S.flags||typeof S.flags!=="object")bad.push("S.flags");
    if(!S.education||typeof S.education!=="object")bad.push("S.education");
    if(!Array.isArray(S.log))bad.push("S.log");
    if(!S.sex||typeof S.sex!=="object")bad.push("S.sex");
    if(bad.length&&window.console&&typeof console.warn==="function")
      console.warn("checkS("+(tag||"?")+") spine damaged — missing: "+bad.join(", "));
    try{ checkSUnknownStats(tag); }catch(e){}
    return bad.length?bad:null;
  }catch(e){ return null; }
}

/* ============ content migrations (event files + index) ============
 * ADDING A STEP: append {from: LL.EVENT_SCHEMA, id, migrate(ev)->ev},
 * bump LL.EVENT_SCHEMA. Old files upgrade on load AND validate clean. */
LL.EVENT_MIGRATIONS=[];
function eventSchemaOf(ev){ return (ev&&typeof ev.schema==="number"&&isFinite(ev.schema))?Math.floor(ev.schema):1; }
function migrateEvent(ev){
  if(!ev||typeof ev!=="object")return ev;
  var v=eventSchemaOf(ev);
  for(var i=0;i<LL.EVENT_MIGRATIONS.length;i++){
    var st=LL.EVENT_MIGRATIONS[i];
    if(st.from>=v){ try{ ev=st.migrate(ev)||ev; }catch(e){ if(window.console&&console.warn)console.warn("content: event migration "+st.id+" failed on "+(ev&&ev.id)+": "+(e&&e.message)); } v=st.from+1; }
  }
  return ev;
}
/* Index version gate: "match" (ok) | "stale" (index older — loads fine, warn)
 * | "newer" (index newer than loader — best-effort, warn) | "bad" (unusable). */
function checkContentVersion(v){
  if(typeof v!=="number"||!isFinite(v))return {ok:false,level:"bad",message:"content: index has no numeric contentVersion"};
  if(v===LL.CONTENT_VERSION)return {ok:true,level:"match",message:"content v"+v};
  if(v<LL.CONTENT_VERSION)return {ok:true,level:"stale",message:"content: index v"+v+" is older than loader v"+LL.CONTENT_VERSION+" — update src/content"};
  return {ok:true,level:"newer",message:"content: index v"+v+" is newer than loader v"+LL.CONTENT_VERSION+" — loading best-effort"};
}

LL.files.push("migrate"); /* end-of-file registration: counts as loaded only after this file fully ran */
