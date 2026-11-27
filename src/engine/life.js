/* LIFE & LEGACY — engine/life.js
 * SECTION 4 life creation + fate.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 4 — life creation (baseStats/traits/backgrounds/newLife/growTo) ============
 * Save upgrades live in src/engine/migrate.js (SAVE_MIGRATIONS registry). */
function baseStats(){ return {health:80+rnd()*15|0,happiness:65+rnd()*20|0,smarts:20+rnd()*50|0,looks:20+rnd()*60|0,fitness:20+rnd()*50|0,discipline:30+rnd()*40|0,creativity:20+rnd()*60|0,social:30+rnd()*40|0,karma:50}; }
function rollTraits(){
  var pool=["ambitious","brave","calm","charitable","content","deceitful","diligent","generous","gregarious","greedy","honest","lazy","lustful","paranoid","patient","stubborn","wrathful"];
  var n = rnd()<0.10?1:(rnd()<0.70?2:3);
  var out=[], c=pool.slice();
  while(out.length<n && c.length){ out.push(c.splice(Math.floor(rnd()*c.length),1)[0]); }
  if(rnd()<0.14) out.push(pick(["genius","beautiful","robust"]));
  return out;
}
function applyTraitMods(st,traits){
  function b(k,d){ st[k]=clamp100(st[k]+d); }
  traits.forEach(function(t){
    if(t==="genius") b("smarts",12);
    else if(t==="beautiful") b("looks",12);
    else if(t==="robust"){ b("health",10); b("fitness",6); }
    else if(t==="diligent"){ b("smarts",5); b("discipline",7); }
    else if(t==="gregarious") b("social",9);
    else if(t==="ambitious") b("discipline",8);
    else if(t==="brave") b("fitness",6);
    else if(t==="patient") b("discipline",5);
    else if(t==="lazy"){ b("fitness",-8); b("discipline",-6); }
    else if(t==="content") b("happiness",8);
    else if(t==="honest"||t==="charitable") b("karma",8);
    else if(t==="deceitful"||t==="greedy"||t==="wrathful") b("karma",-6);
  });
}
/* Capped yearly karma income: at most +5/yr from repeatable good deeds (losses always apply). */
function gainKarma(n){
  if(!(n>0)){ S.stats.karma=clamp100(S.stats.karma+n); return; }
  var got=S.perYear.kg||0, allow=Math.max(0,Math.min(n,5-got));
  S.perYear.kg=got+allow;
  S.stats.karma=gainStat("karma",allow);
  if(allow<n)toast("Your recent good deeds ring hollow — karma needs time to take root.");
}
/* ---- family seeding: siblings + grandparents generated at birth, simulated for life ----
 * GENETICS PATCH: grandparents carry founder genomes; mom/dad are REAL PEOPLE
 * (named person records with traits + genomes drawn from THEIR parents), and
 * you + your siblings all draw from the same two genomes. momAge/dadAge stay
 * the numeric truth every legacy reader uses; the records mirror them. */
function fam0(sex){
  var R={momAge:22+rnd()*18|0,dadAge:24+rnd()*18|0,parentRel:70,friends:[],partner:null,children:[],grandkids:[],pets:[],siblings:[],grandparents:[]};
  var nsib=rnd()<0.25?0:(rnd()<0.55?1:(rnd()<0.8?2:3));
  for(var i=0;i<nsib;i++){ R.siblings.push({name:rName(),age:2+Math.floor(rnd()*9),rel:70+Math.floor(rnd()*20)}); }
  var gps=[["maternal","female"],["maternal","male"],["paternal","female"],["paternal","male"]];
  for(var g2=0;g2<gps.length;g2++){ var pa=gps[g2][0]==="maternal"?R.momAge:R.dadAge;
    var ga=pa+24+Math.floor(rnd()*12);
    R.grandparents.push({name:rNameG(gps[g2][1]),side:gps[g2][0],sex:gps[g2][1],age:ga,rel:60+Math.floor(rnd()*25),alive:rnd()<(ga>75?0.35:0.9),npcId:null,genes:founderGenes(gps[g2][1])}); }
  function sideGenes(side,needSex){
    var f=null,m=null;
    for(var i=0;i<R.grandparents.length;i++){ var g=R.grandparents[i];
      if(g.side!==side)continue;
      if(g.sex==="female")f=g.genes; else m=g.genes; }
    return inheritGenes(m||founderGenes("male"),f||founderGenes("female"),needSex);
  }
  function parentTraits(){ return rollTraits().filter(function(t){return t!=="nemesis"&&t!=="trustfund";}); }
  R.mom={name:rNameG("female"),sex:"female",age:R.momAge,rel:R.parentRel,traits:parentTraits(),genes:sideGenes("maternal","female"),alive:R.momAge>-100,npcId:null};
  R.dad={name:rNameG("male"),sex:"male",age:R.dadAge,rel:R.parentRel,traits:parentTraits(),genes:sideGenes("paternal","male"),alive:R.dadAge>-100,npcId:null};
  /* siblings share the parental draw: resemblance is real, not scripted */
  for(var s2=0;s2<R.siblings.length;s2++){ var sb=R.siblings[s2];
    sb.sex=pick(["male","female"]);
    sb.genes=inheritGenes(R.dad.genes,R.mom.genes,sb.sex);
    sb.traits=parentTraits().slice(0,2);
  }
  return R;
}
function bgD(){ for(var i=0;i<window.GDATA.backgrounds.length;i++) if(window.GDATA.backgrounds[i].id===S.background) return window.GDATA.backgrounds[i]; return window.GDATA.backgrounds[0]; }
function ambD(){ for(var i=0;i<window.GDATA.ambitions.length;i++) if(window.GDATA.ambitions[i].id===S.ambition) return window.GDATA.ambitions[i]; return window.GDATA.ambitions[0]; }
function applyBackground(t){
  var b=null; for(var i=0;i<window.GDATA.backgrounds.length;i++) if(window.GDATA.backgrounds[i].id===t.background)b=window.GDATA.backgrounds[i];
  if(!b)return;
  if(b.money)t.money+=b.money; if(b.prestige)t.prestige+=b.prestige;
  if(b.stats) for(var k in b.stats) if(STAT_KEYS.indexOf(k)>=0) t.stats[k]=clamp100(t.stats[k]+b.stats[k]);
  if(b.flag)t.flags[b.flag]=true;
}
function applyBuildMods(t){
  var m={"athletic build":{fitness:5,looks:2},"muscular build":{fitness:8,looks:2,health:2},"stocky build":{health:5,fitness:2},"soft build":{happiness:4},"lean build":{fitness:3,looks:1},"petite frame":{looks:3,social:1},"tall lanky frame":{looks:3}};
  var d=m[t.appearance&&t.appearance.build||""]; if(!d)return;
  for(var k in d) t.stats[k]=clamp100(t.stats[k]+d[k]);
}
function ambitionMet(){
  var a=S.ambition; if(!a||a==="none")return false;
  if(a==="wealth")return netWorth()>=500000;
  if(a==="fame")return S.fame>=80;
  if(a==="family")return !!(S.relationships.partner&&S.relationships.partner.married&&S.relationships.children.length>=3);
  if(a==="power")return S.prestige>=300||["mayor","senator","exec","ceo","judge"].indexOf(S.jobId)>=0;
  if(a==="knowledge")return S.education.highest==="grad"&&S.stats.smarts>=85;
  if(a==="virtue")return S.stats.karma>=90;
  return false;
}
function checkAmbition(){
  if(!S||!S.alive||S.ambitionDone||!S.ambition||S.ambition==="none")return;
  if(ambitionMet()){ S.ambitionDone=true; S.prestige+=100; S.stats.happiness=100;
    pushLog(S.age,"🎯","AMBITION FULFILLED: "+ambD().name+"! +100 prestige. Bards will sing of House "+S.lastName+".","milestone");
    toast("🎯 AMBITION FULFILLED: "+ambD().name+"! +100 prestige!"); }
}
// yearlyFate: nemesis/illness/trust-fund fate + record/heat decay.
function yearlyFate(silent){
  if(S.fate.trust){ S.money+=2000; S.totalEarned+=2000; S.stats.discipline=clamp100(S.stats.discipline-1); }
  if(S.fate.ill){ S.stats.health=clamp100(S.stats.health-1); S.stats.happiness=clamp100(S.stats.happiness-1); }
  if(S.record>0&&!S.flags.inJail)S.record=Math.max(0,S.record-5);
  if(S.heat>0)S.heat=Math.max(0,S.heat-10);
  yearlyNemesis(silent);
}
/* ---- nemesis arc: an escalating feud with a living rival + player resolution ----
 * S.fate.nemHeat 0-100 climbs yearly (faster when you're winning — success
 * breeds envy). One beat max per year (S.perYear.nemBeat). Beats unlock by
 * heat and fall back gracefully when the player lacks the target (no company
 * → career hit → smear). Ends by reconcile/expose/ruin actions, or when the
 * rival dies. Heat/beats ride on S.fate (undefined-safe via ||0, no migration
 * bump needed); never wipes anything. */
function nemRival(){
  if(!S||!S.world||!S.world.npcs)return null;
  for(var i=0;i<S.world.npcs.length;i++){ var n=S.world.npcs[i]; if(n.alive&&n.role==="rival")return n; }
  return null;
}
function nemHeat(){ return (S.fate&&S.fate.nemHeat)||0; }
function nemActive(){ return !!(S&&S.fate&&S.fate.nemesis&&!S.fate.nemesisDone); }
function yearlyNemesis(silent){
  if(!S.fate||!S.fate.nemesis||S.fate.nemesisDone)return;
  var rv=nemRival();
  /* persistent agents: the nemesis holds a rivalry goal until trust redeems them */
  try{ if(rv&&typeof npcAgentEnsure==="function"){ var __ra=npcAgentEnsure(rv); if(__ra&&__ra.goal&&__ra.goal.kind!=="rivalry"&&rnd()<0.3)__ra.goal={kind:"rivalry",detail:"ruin "+((S&&S.firstName)||"you"),prog:0}; } }catch(e){}
  if(!rv){
    S.fate.nemesisDone="dead"; S.fate.nemHeat=0;
    pushLog(S.age,"🕊️","With no rival left standing, the old feud gutters out.","event");
    return;
  }
  /* the rival lives their own life: richer, employed, plotting */
  rv.money=Math.max(0,(rv.money||0)+200+Math.floor(rnd()*800));
  if(rv.age>=18&&rv.jobId==="unemployed"&&rnd()<0.3){ rv.jobId=wJobFor(rv.age); if(rv.jobId!=="unemployed")rv.note="Climbing while plotting against you."; }
  if(!rv.note||rnd()<0.2)rv.note=pick(["Plotting against you.","Seen asking questions about you.","Smiles too wide when your name comes up.","Tells everyone you two are 'old friends'."]);
  rv.rel=Math.max(3,Math.min(15,(rv.rel||8)-1));
  var hot=(S.fame>=50||S.prestige>=200||netWorth()>500000)?1.6:1;
  S.fate.nemHeat=Math.min(100,nemHeat()+Math.round((3+rnd()*5)*hot));
  if(S.perYear.nemBeat===S.year)return;
  var h=nemHeat(), beat=null;
  if(h>=80&&!silent&&rnd()<0.5)beat=pick(["frame","arson","ransom"]);
  else if(h>=60)beat=pick(["company","career","scandal"]);
  else if(h>=45)beat=pick(["poach","seduce"]);
  else if(h>=30)beat=pick(["sabotage","smear"]);
  else if(h>=15)beat="smear";
  if(!beat)return;
  S.perYear.nemBeat=S.year; S.fate.nemBeats=(S.fate.nemBeats||0)+1;
  nemFireBeat(rv,beat);
}
function nemFireBeat(rv,beat){
  var nm=rv.name;
  if(beat==="smear"){ S.prestige=Math.max(0,S.prestige-12); S.stats.happiness=clamp100(S.stats.happiness-5); S.stress=clamp100(S.stress+5); pushLog(S.age,"👁️",nm+" spreads lies about House "+S.lastName+". (−12 prestige)","bad"); return; }
  if(beat==="sabotage"){
    if(S.jobId&&S.jobId!=="unemployed"){ S.performance=Math.max(0,S.performance-15); pushLog(S.age,"👁️",nm+" poisons your reputation at work. (−15 performance)","bad"); }
    else { S.money=Math.max(0,S.money-800); pushLog(S.age,"👁️","Sabotage! "+nm+" costs you $800.","bad"); }
    return;
  }
  if(beat==="poach"){
    var fr=(S.relationships.friends||[])[Math.floor(rnd()*S.relationships.friends.length)];
    if(fr){ fr.rel=Math.max(0,fr.rel-20); npcMem(rv,nm+" is turning your friends against you."); pushLog(S.age,"👁️",nm+" turns "+fr.name+" against you. (−20 bond)","bad"); }
    else return nemFireBeat(rv,"smear");
    return;
  }
  if(beat==="seduce"){
    var p=S.relationships.partner;
    if(p){ p.rel=Math.max(0,(p.rel||60)-15); npcMem(rv,nm+" is circling your partner."); pushLog(S.age,"👁️",nm+" is circling "+p.name+". Watch them. (−15 bond)","bad"); }
    else return nemFireBeat(rv,"smear");
    return;
  }
  if(beat==="company"){
    if(S.company){ S.company.value=Math.max(0,Math.round(S.company.value*0.9)); S.company.morale=Math.max(0,S.company.morale-15); pushLog(S.age,"👁️",nm+" poaches your clients and staff. (−10% company value, −15 morale)","bad"); }
    else return nemFireBeat(rv,"career");
    return;
  }
  if(beat==="career"){
    if(S.jobId&&S.jobId!=="unemployed"&&S.performance<60){ S.jobId="unemployed"; S.salary=0; pushLog(S.age,"👁️",nm+" got you FIRED. Start over.","bad"); }
    else if(S.jobId&&S.jobId!=="unemployed"){ S.performance=Math.max(0,S.performance-25); pushLog(S.age,"👁️",nm+" torpedoes your big project. (−25 performance)","bad"); }
    else return nemFireBeat(rv,"smear");
    return;
  }
  if(beat==="scandal"){
    if(S.fame>=20){ S.fame=clamp100(S.fame-15); S.prestige=Math.max(0,S.prestige-30); pushLog(S.age,"👁️",nm+" feeds the tabloids. (−15 fame, −30 prestige)","bad"); }
    else return nemFireBeat(rv,"smear");
    return;
  }
  if(beat==="frame"){ S.record+=30; S.money=Math.max(0,S.money-2000); S.flags.inJail=1; pushLog(S.age,"👁️",nm+" FRAMED you. Cops, lawyers, a cell. (−$2,000, +30 record, jailed)","bad"); return; }
  if(beat==="arson"){
    if(S.assets.houseId!=="none"&&S.assets.houseVal>0){ S.assets.houseVal=Math.max(0,Math.round(S.assets.houseVal*0.7)); pushLog(S.age,"👁️","Fire at your home! "+nm+" torched part of it. (−30% home value)","bad"); }
    else { S.money=Math.max(0,S.money-3000); pushLog(S.age,"👁️",nm+" burns what you love. (−$3,000)","bad"); }
    return;
  }
  if(beat==="ransom"){ S.money=Math.max(0,S.money-1500); S.stress=clamp100(S.stress+20); S.stats.happiness=clamp100(S.stats.happiness-10); pushLog(S.age,"👁️","A scare aimed at your family. You pay to make it stop. (−$1,500)","bad"); return; }
}
function newLife(opts){
  opts=opts||{};
  /* a fresh soul never inherits the old life's open modal (a diagnosis/crisis
   * dealt moments before a restart would otherwise linger over the new life) */
  try{ if(typeof closeModal==="function")closeModal("eventModal"); }catch(e){}
  var gender=opts.gender||pick(["male","female"]);
  var first=opts.first||rName(gender).split(" ")[0], last=opts.last||pick(LAST);
  var wealth=opts.wealth||pick(["poor","poor","middle","middle","middle","rich"]);
  var birthYear=opts.birthYear||new Date().getFullYear();
  var startAge=Math.max(0,Math.min(80,opts.startAge|0));
  var traits=(opts.traits&&opts.traits.length)?opts.traits.slice(0,4):rollTraits();
  var st=baseStats(); applyTraitMods(st,traits);
  S={v:(window.LL&&LL.SAVE_VERSION)||7,id:"life-"+Date.now(),firstName:first,lastName:last,gender:gender,
    country:opts.country||pick(window.GDATA.countries),
    bioSex:opts.bioSex||gender,genderIdentity:opts.genderIdentity||(gender==="female"?"Female":"Male"),
    sexuality:opts.sexuality||"straight",race:opts.race||"Mixed",raceF:opts.raceF||null,raceM:opts.raceM||null,city:opts.city||"",
    religion:opts.religion||"None",customWorld:opts.customWorld||"",
    imgSeed:1+Math.floor(rnd()*999999),appearance:opts.appearance||genAppearance(gender,opts.race||"Mixed"),
    age:0,birthYear:birthYear,familyWealth:wealth,
    stats:st,stress:hasTrait0(traits,"calm")?4:10,fame:0,followers:0,
    prestige:wealth==="rich"?60:(wealth==="middle"?20:5),renown:0,
    traits:traits,lifestyle:"none",major:"General",scholarship:false,background:opts.background||"humble",childhood:"none",ambition:opts.ambition||"none",ambitionDone:false,fate:opts.fate||{nemesis:hasTrait0(traits,"nemesis"),nemHeat:0,nemBeats:0,ill:hasTrait0(traits,"frail"),trust:hasTrait0(traits,"trustfund")},
    dob:opts.dob||"",region:opts.region||"",customBg:opts.customBg||"",customBgDone:false,
    focusList:buildFocusList(birthYear,opts.background||"humble"),customFocuses:[],lastFocusAI:0,
    money:wealth==="rich"?800:(wealth==="middle"?150:20),
    debt:0,salary:0,jobId:"unemployed",jobLevel:1,performance:50,business:null,company:null,underworld:null,groomed:null,sex:null,
    education:{stage:"Baby",grades:70+rnd()*20|0,highest:"none",inCollege:false,collegeYears:0},
    relationships:fam0(gender),
    assets:{houseId:"none",carId:"none",stocks:0,crypto:0,savings:0,houseVal:0,carVal:0,houseYears:0},
    heirId:null,will:false,
    ach:{vacations:0,jobs:0,partners:0,feasts:0,crimes:0,wishes:0},
    flags:{student:false,retired:false,memoir:false,hasWill:false,inJail:0,homeless:false,
      noBad:!!opts.noBad,infiniteStats:(opts.infiniteStats!==undefined?!!opts.infiniteStats:hasTrait0(traits,"titan")),unfiltered:true,ageless:false,undying:false,everYouth:false,joyful:false,blessed:false,goldenTouch:false,charming:false,community:false,grad:false},
    perYear:{},log:[],alive:true,deathCause:"",totalEarned:0,crime:0,record:0,heat:0,promoY:0,netHist:[],hapHist:[],year:birthYear,customEvents:0};
  /* GENETICS PATCH: genome first (custom-designed or descended from mom+dad),
   * then the face follows the genes. Polygenic scores nudge the baseline. */
  try{
    if(opts.genes&&opts.genes.L){ S.genes=opts.genes; } else { parentsEnsure(); }
    genesEnsure();
    if(!opts.appearance)applyGenePhenotype(S.appearance,S.genes,gender,0);
    S.stats.smarts=clamp100(S.stats.smarts+Math.round((S.genes.P.cog||0)*12));
    S.stats.looks=clamp100(S.stats.looks+Math.round((S.genes.P.beauty||0)*10));
    S.stats.health=clamp100(S.stats.health+Math.round((S.genes.P.metab||0)*8));
  }catch(e){ try{ genesEnsure(); }catch(e2){} }
  function hasTrait0(tr,id){ return tr.indexOf(id)>=0; }
  applyBackground(S); applyBuildMods(S); applyAppearanceMods(S);
  sanitizeApForAge();
  sexEnsure();
  if(!S.assets.shares)S.assets.shares={};
  wInit();
  try{ if(typeof housesEnsure==="function")housesEnsure(); }catch(e){}
  if(opts.attr) for(var ak in opts.attr) if(STAT_KEYS.indexOf(ak)>=0&&opts.attr[ak]>0) S.stats[ak]=clamp100(S.stats[ak]+clamp(opts.attr[ak],0,10));
  var idLine=S.genderIdentity+" · "+S.sexuality+" · "+raceLabel()+(S.city?" · "+S.city:"");
  pushLog(0,"👶","Born as "+first+" "+last+" in "+(S.city?S.city+", ":"")+S.country+" to a "+wealth+" family. ("+idLine+")","milestone");
  pushLog(0,"🧬","Traits: "+traits.map(traitName).join(" · "));
  try{ pushLog(0,"🧬","Bloodline: "+genomeSummary()+"."); }catch(e){}
  pushLog(0,"📸","Looks: "+appearancePrompt()+".");
  if(S.background!=="custom")pushLog(0,bgD().icon,"Lineage: "+bgD().name+" — "+bgD().desc);
  else pushLog(0,"✍️","Lineage: a self-written past — \""+S.customBg.slice(0,120)+"\"");
  deriveBeginnings();
  if(S.ambition!=="none")pushLog(0,"🎯","Ambition: "+ambD().name+" — fulfill it for +100 prestige.");
  if(S.fate.nemesis)pushLog(0,"👁️","A rival's shadow hangs over your cradle. Someone out there hates you already.");
  if(S.fate.ill)pushLog(0,"🤒","Born with a frail constitution. Doctors will know your name.");
  if(S.fate.trust)pushLog(0,"💰","A trust fund ticks in the background: +$2,000 every year.");
  if(S.customWorld)pushLog(0,"🌌","World: "+S.customWorld.slice(0,140));
  if(S.background==="custom"&&S.customBg)aiAdjudicateBg();
  if(wealth==="rich")pushLog(0,"🍼","Silver spoon! Private room, organic everything.");
  if(wealth==="poor")pushLog(0,"🧺","Money is tight. Love is not.");
  /* FTUE (first life on this device only): two orientation lines in the birth
   * log — veterans never see them again. The Age+ pulse (render.js) guides
   * the first 3 years on every life. */
  try{
    if(!localStorage.getItem("ll_ftue_v1")){
      pushLog(0,"🧭","HOW TO PLAY: press ⏳ Age + (or Space) to live a year — the tabs hold your verbs. Type anything in 🎬 Director; ask ✨ Anya in ❓ Help.");
      try{ localStorage.setItem("ll_ftue_v1","1"); }catch(e){}
    }
  }catch(e){}
  /* Per-life WASM stream: the same soul replays the same market/noise dice
   * when the seed repeats — reproducible lives, still random per soul. */
  try { if (window.LL && LL.reseedWasm && S.imgSeed) LL.reseedWasm(S.imgSeed); } catch (e) {}
  try { if (window.LL && LL.bus) LL.bus.emit({ type: "life.born", payload: { seed: S.imgSeed } }); } catch (e) {}
  if(startAge>0) growTo(startAge);
  else afterLoad();
  try{ sfx("birth"); }catch(e){}
}
function growTo(n){ growShield=true;
  try{ while(S.age<n&&S.alive) ageUp(true); }finally{ growShield=false; }
  if(S.alive){ S.money=Math.max(S.money,200); S.debt=0;
  S.stats.health=Math.max(S.stats.health,60); S.stats.happiness=Math.max(S.stats.happiness,55); S.stress=Math.min(S.stress,40);
  pushLog(S.age,"🌱","Childhood fast-forwarded — you take control at "+S.age+" with a clean slate.","milestone"); afterLoad(); } }

function pushLog(age,icon,text,type){ S.log.push({age:age,icon:icon,text:text,type:type||""}); }


LL.files.push("life"); /* end-of-file registration: counts as loaded only after this file fully ran */