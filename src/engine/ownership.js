/* LIFE & LEGACY — engine/ownership.js
 * SECTION 7e/7f sex & ownership incl. extreme helpers.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 7e — SEX & CORRUPTION (xp/skill/stamina · acts · kinks · corruption · claims · preg · leverage) ============
 * All state lives on S.sex (migrated for old saves). Yearly hook yearlySex() runs from
 * runDynastyDepth() inside the standard pipeline. Player verbs (claim/train/break/harem/
 * protection/leverage) are TABS entries routed through doAct(). Events in src/events.js
 * mutate the same fields inline via sexE(S) + own helpers. Director fx keys mirror these.
 * ALL sexual content is ADULTS ONLY (18+). No minors, ever. */
var SEX_KINKS=["sensual","dominance","submission","bondage","exhibition","voyeur","group","public","roleplay","fetish","poly","power","edging","praise","degradation","cuckold"];
var SEX_ACTS=["vanilla","oral","rough","tender","anal","bondage","group","public","tease","worship"];
var CLAIM_STAGES=["interested","claimed","collared","owned","devoted"];
var OWN_MODES=["free","claimed","collared","legal","broken","willing","devoted"];
/* Ownership law is GAME FICTION (a registered consensual collared-household / harem permit),
 * NOT a statement about any real country's laws. Custom lives can force it via world text
 * containing "harem legal" / "ownership legal". High prestige can buy paper cover anywhere. */
var OWN_CONTRACT=["Saudi Arabia","United Arab Emirates","Qatar","Kuwait","Oman","Bahrain","Morocco","Jordan","Egypt","Yemen","Somalia","Sudan","Mauritania","Afghanistan","Brunei","Iran"];
var OWN_HAREM=["Saudi Arabia","United Arab Emirates","Qatar","Kuwait","Oman","Bahrain","Morocco","Somalia","Sudan","Yemen"];
function defaultSex(){ return {xp:0,skill:0,stamina:55,partners:0,corruption:0,kinks:[],acts:{},claims:[],lovers:[],leverageOn:[],leverageOff:[],addiction:0,scandal:0,protection:true,fertility:80,pregScares:0,affairKids:0,broken:0,haremTension:0,alpha:null,netori:{taken:0,lost:0,revenges:0},lawNote:""}; }
function richClaimFill(c){
  if(!c||typeof c!=="object")return c;
  if(typeof c.obedience!=="number")c.obedience=20; if(typeof c.obsession!=="number")c.obsession=25;
  if(typeof c.stage!=="number")c.stage=1;
  if(typeof c.corr!=="number")c.corr=20;
  if(typeof c.own!=="number")c.own=c.obedience;
  if(!c.mode)c.mode=c.stage>=3?"collared":"claimed";
  if(c.legal===undefined)c.legal=false;
  if(typeof c.broken!=="number")c.broken=(c.mode==="broken"?40:0);
  if(c.accepted===undefined)c.accepted=(c.mode==="willing"||c.mode==="legal"||c.mode==="devoted");
  if(typeof c.rank!=="number")c.rank=99;
  if(typeof c.jealousy!=="number")c.jealousy=30;
  if(!c.hist)c.hist={times:1,first:S?S.age:18,last:S?S.age:18,forced:0,willing:1,acts:{}};
  if(!c.hist.acts)c.hist.acts={};
  if(!c.preg)c.preg={state:"none",ctrl:"none",child:null};
  if(c.levOn===undefined)c.levOn=null; if(c.levOff===undefined)c.levOff=null;
  return c;
}
function sexEnsure(){
  if(!S)return null;
  if(!S.sex||typeof S.sex!=="object")S.sex=defaultSex();
  var x=S.sex;
  if(typeof x.xp!=="number")x.xp=0; if(typeof x.skill!=="number")x.skill=0;
  if(typeof x.stamina!=="number")x.stamina=55;
  if(typeof x.partners!=="number")x.partners=0; if(typeof x.corruption!=="number")x.corruption=0;
  if(!x.kinks)x.kinks=[]; if(!x.acts||typeof x.acts!=="object")x.acts={};
  if(!x.claims)x.claims=[]; if(!x.lovers)x.lovers=[];
  if(!x.leverageOn)x.leverageOn=[]; if(!x.leverageOff)x.leverageOff=[];
  if(typeof x.addiction!=="number")x.addiction=0; if(typeof x.scandal!=="number")x.scandal=0;
  if(x.protection===undefined)x.protection=true; if(typeof x.fertility!=="number")x.fertility=80;
  if(typeof x.pregScares!=="number")x.pregScares=0; if(typeof x.affairKids!=="number")x.affairKids=0;
  if(typeof x.broken!=="number")x.broken=0;
  if(typeof x.haremTension!=="number")x.haremTension=0;
  if(x.alpha===undefined)x.alpha=null;
  if(!x.netori||typeof x.netori!=="object")x.netori={taken:0,lost:0,revenges:0};
  if(typeof x.netori.taken!=="number")x.netori.taken=0;
  if(typeof x.netori.lost!=="number")x.netori.lost=0;
  if(typeof x.netori.revenges!=="number")x.netori.revenges=0;
  if(typeof x.lawNote!=="string")x.lawNote="";
  for(var i=0;i<x.claims.length;i++)richClaimFill(x.claims[i]);
  if(x.claims.length>8)x.claims=x.claims.slice(-8);
  return x;
}
function sxXp(n){
  var x=sexEnsure(); if(!x)return;
  n=n||1; x.xp+=n;
  var gain=n*2+(S.stats.looks>60?1:0)+(S.stats.social>60?1:0)+(hasTrait("lustful")?2:0);
  x.skill=clamp100(x.skill+gain);
  x.stamina=clamp100(x.stamina+1);
}
function gainStamina(n){ var x=sexEnsure(); if(!x)return; x.stamina=clamp100(x.stamina+(n||0)); }
function pickAct(){ var x=sexEnsure(); var pool=SEX_ACTS.slice();
  if(x&&x.kinks.indexOf("bondage")>=0)pool.push("bondage","bondage");
  if(x&&x.kinks.indexOf("group")>=0)pool.push("group");
  if(x&&x.kinks.indexOf("exhibition")>=0)pool.push("public");
  return pick(pool);
}
function favActs(n){
  var x=sexEnsure(); if(!x)return ["vanilla"];
  var ks=Object.keys(x.acts||{}); if(!ks.length)return ["vanilla"];
  ks.sort(function(a,b){return (x.acts[b]||0)-(x.acts[a]||0);});
  return ks.slice(0,n||3);
}
function addCorr(n){
  var x=sexEnsure(); if(!x)return;
  x.corruption=clamp100(x.corruption+n);
  if(n>0&&x.corruption>=80&&chance(0.3))S.stats.karma=clamp100(S.stats.karma-4);
}
function unlockKink(id){
  var x=sexEnsure(); if(!x)return;
  if(SEX_KINKS.indexOf(id)<0)return;
  if(x.kinks.indexOf(id)<0){ x.kinks.push(id); gainStat("happiness",3); }
}
function regLover(name){
  var x=sexEnsure(); if(!x||!name)return;
  if(x.lovers.indexOf(name)<0){ x.lovers.push(name); x.lovers=x.lovers.slice(-8); x.partners++; }
  sxXp(1);
}
function ensureClaim(name){
  var x=sexEnsure(); if(!x||!name)return null;
  for(var i=0;i<x.claims.length;i++)if(x.claims[i].name===name)return richClaimFill(x.claims[i]);
  var c=richClaimFill({name:name,stage:1,obedience:20,obsession:25,corr:20,own:20,mode:"claimed",legal:false,broken:0,accepted:false,rank:99,jealousy:30,hist:{times:0,first:S.age,last:S.age,forced:0,willing:0,acts:{}},preg:{state:"none",ctrl:"none",child:null},levOn:null,levOff:null});
  x.claims.push(c); if(x.claims.length>8)x.claims.shift();
  return c;
}
function getClaim(name){
  var x=sexEnsure(); if(!x)return null;
  for(var i=0;i<x.claims.length;i++)if(x.claims[i].name===name)return richClaimFill(x.claims[i]);
  return null;
}
function bumpClaim(name,ob,os,stageUp){
  var c=ensureClaim(name); if(!c)return null;
  c.obedience=clamp100(c.obedience+(ob||0)); c.obsession=clamp100(c.obsession+(os||0));
  c.own=clamp100(c.own+Math.round((ob||0)*0.7));
  if(stageUp)c.stage=Math.min(4,c.stage+stageUp);
  if(c.obedience>=85&&c.stage<3)c.stage=3;
  if(c.obedience>=95&&c.obsession>=80)c.stage=4;
  if(c.stage>=4){c.mode="devoted";c.accepted=true;}
  else if(c.stage===3&&c.mode!=="legal"&&c.mode!=="broken")c.mode="collared";
  syncOwnToRel(name);
  return c;
}
/* ---- ownership law (game fiction) ---- */
function ownLaw(){
  var ctry=S?(S.country||""):"", cust=S?(S.customWorld||""):"";
  if(/harem legal|ownership legal|collared legal|harem permit/i.test(cust))
    return {allows:true,allowsHarem:true,label:"📜 "+(ctry||"this land")+" — custom-world permit: collared households & harems registered."};
  var ok=OWN_CONTRACT.indexOf(ctry)>=0, hare=OWN_HAREM.indexOf(ctry)>=0;
  if(ok&&hare)return {allows:true,allowsHarem:true,label:"📜 "+ctry+" — game-fiction registry: legal ownership + harems recorded."};
  if(ok)return {allows:true,allowsHarem:false,label:"📜 "+ctry+" — game-fiction registry: one collared partner recognized; harems stay underground."};
  if(S&&S.prestige>=300)return {allows:true,allowsHarem:true,label:"💰 Bought papers — prestige opens registries anywhere (game fiction)."};
  return {allows:false,allowsHarem:false,label:"🚫 "+(ctry||"this land")+" bans ownership — take them only by breaking their will or by their own accepted oath."};
}
/* ---- central claim: legal papers vs breaking vs willing oath ---- */
function claimPartner(name,opts){
  var x=sexEnsure(); if(!x||!name||S.age<18)return null;
  opts=opts||{};
  var law=ownLaw(), via=opts.via||"claim";
  if(via==="legal"&&!law.allows)via="broken";
  var c=ensureClaim(name);
  regLover(name);
  var ob=opts.obedience!==undefined?opts.obedience:12, os=opts.obsession!==undefined?opts.obsession:10;
  c.obedience=clamp100(c.obedience+ob); c.obsession=clamp100(c.obsession+os);
  c.corr=clamp100(c.corr+(opts.corr||4));
  if(via==="legal"){ c.legal=true; c.mode="legal"; c.accepted=true; c.own=clamp100(c.own+18); c.stage=Math.max(c.stage,3); c.rank=(c.rank===99?0:c.rank); }
  else if(via==="broken"){ c.legal=false; c.mode="broken"; c.broken=clamp100(c.broken+(opts.breakAmt||25)); c.own=clamp100(c.own+14);
    if(c.broken>=70||c.obedience>=85)c.stage=Math.max(c.stage,3); else c.stage=Math.max(c.stage,1); }
  else if(via==="willing"){ c.legal=false; c.mode="willing"; c.accepted=true; c.own=clamp100(c.own+16); c.stage=Math.max(c.stage,2); }
  else if(via==="netori"){ c.legal=false; c.mode="broken"; c.broken=clamp100(c.broken+20); c.own=clamp100(c.own+12); c.stage=Math.max(c.stage,1); x.netori.taken++; }
  else { c.own=clamp100(c.own+10); c.stage=Math.max(c.stage,1); if(c.stage>=3&&c.mode!=="legal"&&c.mode!=="broken")c.mode="collared"; }
  if(typeof opts.rank==="number")setHaremRank(name,opts.rank);
  else if(x.alpha===name)c.rank=0;
  addCorr(opts.corr||4); unlockKink("dominance");
  if(S.relationships.partner&&S.relationships.partner.name===name)S.relationships.partner.rel=clamp100(S.relationships.partner.rel+8);
  if(!opts.silent){
    var how=c.mode==="legal"?"📜 LEGAL CLAIM — papers stamped ("+law.label+")":(c.mode==="broken"?"💔 BROKEN CLAIM — "+name+" obeys because resistance was ground down":(c.mode==="willing"?"🤍 WILLING OATH — "+name+" chose this collar themself":"⛓️ CLAIMED"));
    pushLog(S.age,c.mode==="legal"?"📜":(c.mode==="broken"?"💔":"⛓️"),how+" ("+CLAIM_STAGES[c.stage]+", own "+c.own+", ob "+c.obedience+").","event");
  }
  x.lawNote=law.label;
  syncOwnToRel(name);
  return c;
}
function raiseCorruption(name,n){
  addCorr(n);
  if(!name)return;
  var c=getClaim(name); if(!c)return;
  c.corr=clamp100(c.corr+n);
  if(n>0&&c.corr>=80)S.stats.karma=clamp100(S.stats.karma-3);
  syncOwnToRel(name);
}
/* ---- central sex log: skill/stamina/acts/history/pregnancy in one place ---- */
function logSex(name,o){
  var x=sexEnsure(); if(!x||S.age<18)return null;
  o=o||{};
  var who=name||(S.relationships.partner?S.relationships.partner.name:(x.lovers.length?x.lovers[x.lovers.length-1]:null));
  if(!who){ who=partnerName(); S.relationships.partner={name:who,rel:65,married:false,age:S.age}; S.ach.partners++; }
  var acts=(o.acts&&o.acts.length)?o.acts.slice(0,3):[pickAct()];
  var bad=[]; for(var i=0;i<acts.length;i++)if(SEX_ACTS.indexOf(acts[i])<0)bad.push(acts[i]);
  if(bad.length)acts=["vanilla"];
  var c=ensureClaim(who);
  regLover(who);
  c.hist.times++; c.hist.last=S.age; if(!c.hist.first)c.hist.first=S.age;
  if(o.forced)c.hist.forced++; else c.hist.willing++;
  for(var j=0;j<acts.length;j++){ var a=acts[j];
    c.hist.acts[a]=(c.hist.acts[a]||0)+1; x.acts[a]=(x.acts[a]||0)+1;
    if(a==="bondage")unlockKink("bondage"); if(a==="group")unlockKink("group"); if(a==="public")unlockKink("public");
  }
  sxXp(o.forced?2:1);
  x.stamina=clamp100(x.stamina-(o.forced?16:(10+(acts.length*2))));
  if(x.stamina<15){ S.stats.health=clamp100(S.stats.health-4); S.stats.happiness=clamp100(S.stats.happiness-3);
    if(!o.silent)pushLog(S.age,"🥵","You push past spent legs and a dry throat — "+who+" holds you up after. Stamina "+x.stamina+". Rest or train fitness.","bad"); }
  if(!o.forced)raiseCorruption(who,o.corr||2);
  if(o.pregMult)tryPregnancy(who,o.pregMult,o.ctrl||"planned");
  else if(!x.protection&&chance(0.35))tryPregnancy(who,1,o.ctrl||"accidental");
  if(o.leverageOn)setLeverage(who,o.leverageOn,null);
  if(o.leverageOff)setLeverage(who,null,o.leverageOff);
  syncOwnToRel(who);
  return c;
}
/* ---- force: always punished (jail + crime + karma/prestige/scandal + leverage fallout) ---- */
function forceSex(name,o){
  var x=sexEnsure(); if(!x||S.age<18)return null;
  o=o||{};
  var victim=name||partnerName();
  var c=ensureClaim(victim);
  c.hist.times++; c.hist.last=S.age; c.hist.forced++;
  c.corr=clamp100(c.corr+14); c.obedience=clamp100(c.obedience-18); c.obsession=clamp100(c.obsession-10);
  c.jealousy=clamp100(c.jealousy+20); c.own=clamp100(c.own-12);
  addCorr(12); x.stamina=clamp100(x.stamina-16);
  tryPregnancy(victim,o.pregMult||1.5,"forced");
  S.crime=(S.crime||0)+1; S.ach.crimes++;
  var yrs=Math.min(10,1+Math.floor(rnd()*3)+((S.crime||0)>3?2:0));
  S.flags.inJail=Math.max(S.flags.inJail|0,yrs);
  S.stats.karma=clamp100(S.stats.karma-20); S.prestige=Math.max(0,S.prestige-50);
  x.scandal=clamp100(x.scandal+25);
  addLeverageOff(victim,"forced night");
  c.levOff="forced night";
  if(S.jobId&&S.jobId!=="unemployed"){ pushLog(S.age,"🚪","Jailed — fired from "+jobName()+". The position won't wait.","bad"); S.jobId="unemployed"; S.salary=0; }
  pushLog(S.age,"⛓️","FORCED "+victim+" — and the world answers: "+yrs+" year(s), record #"+S.crime+", job gone, prestige gutted, scandal +25. There is no getting away with it.","bad");
  if(S.relationships.partner&&S.relationships.partner.name===victim)S.relationships.partner.rel=clamp100(S.relationships.partner.rel-45);
  syncOwnToRel(victim);
  return c;
}
function breakPartner(name,n){
  var x=sexEnsure(); var c=ensureClaim(name); if(!c)return null;
  if(S.age<18)return c;
  n=(n===undefined?14:n);
  c.broken=clamp100(c.broken+n); c.obedience=clamp100(c.obedience+Math.round(n*0.8)); c.obsession=clamp100(c.obsession+Math.round(n*0.5));
  c.corr=clamp100(c.corr+6); c.own=clamp100(c.own+8); addCorr(3);
  if(c.broken>=55){ c.mode="broken"; c.legal=false; if(c.obedience>=80)c.stage=Math.max(c.stage,3); }
  if(c.broken>=90&&c.obedience>=90&&c.obsession>=70){ c.stage=4; c.mode="devoted"; x.broken++; S.stats.karma=clamp100(S.stats.karma-8);
    pushLog(S.age,"🕳️",name+" is hollowed out and remade — blank bliss when you speak, panic when you leave the room. Devoted. Terrifying.","event"); }
  else pushLog(S.age,"💔","Breaking "+name+": sleep rules, phone checks, orgasm control. Will "+c.broken+", obedience "+c.obedience+".","event");
  syncOwnToRel(name);
  return c;
}
function setHaremRank(name,rank){
  var x=sexEnsure(); var c=ensureClaim(name); if(!c)return null;
  rank=Math.max(0,Math.min(5,rank|0));
  c.rank=rank;
  if(rank===0){ x.alpha=name;
    for(var i=0;i<x.claims.length;i++){ var o=x.claims[i]; if(o.name!==name&&o.rank===0)o.rank=1; }
    c.jealousy=Math.max(0,c.jealousy-15);
  } else if(x.alpha===name){ x.alpha=null;
    var best=null; for(var k=0;k<x.claims.length;k++){ var q=x.claims[k]; if(q.name!==name&&(best===null||q.own>best.own))best=q; }
    if(best){best.rank=0;x.alpha=best.name;}
  }
  syncOwnToRel(name);
  return c;
}
function haremAlpha(){ var x=sexEnsure(); if(!x)return null; if(x.alpha&&getClaim(x.alpha))return x.alpha;
  var best=null; for(var i=0;i<x.claims.length;i++){ var c=x.claims[i]; if(c.rank===0)return c.name; if(!best||c.own>best.own)best=c; }
  return best?best.name:null;
}
function setLeverage(name,onSec,offSec){
  var c=ensureClaim(name); if(!c)return null;
  if(onSec){ c.levOn=String(onSec).slice(0,80); addLeverageOn(c.name,c.levOn); }
  if(offSec){ c.levOff=String(offSec).slice(0,80); addLeverageOff(c.name,c.levOff); }
  syncOwnToRel(name);
  return c;
}
function addLeverageOn(target,secret){
  var x=sexEnsure(); x.leverageOn.push({target:target,secret:secret}); if(x.leverageOn.length>6)x.leverageOn.shift();
}
function addLeverageOff(holder,secret){
  var x=sexEnsure(); x.leverageOff.push({holder:holder,secret:secret}); if(x.leverageOff.length>6)x.leverageOff.shift();
  x.scandal=clamp100(x.scandal+12);
}
function pregChance(baseMult){
  var x=sexEnsure();
  var ageF=S.age>=18&&S.age<=42?(S.age<30?1:(S.age<35?0.7:0.35)):0;
  if(!ageF)return 0;
  var f=(x.fertility/100)*ageF*(baseMult||1);
  if(x.protection)f*=0.04;
  return Math.min(0.85,f);
}
/* ctrl: forced | accidental | prevented | planned — written onto the per-partner preg record */
function pregEnsure(){ if(!S)return []; if(!S.pregs||!(S.pregs instanceof Array))S.pregs=[]; return S.pregs; }
function isLegitCarrier(name){
  try{ return !!(S.relationships.partner&&S.relationships.partner.married&&S.relationships.partner.name===name); }catch(e){ return false; }
}
/* ---- gestation: conception starts a 2-year pregnancy, not an instant baby ----
 * S.pregs entries: {carrier, ctrl, tri (1..3), care, legit}. yearlyPregs() ages
 * them and delivers at tri 3 with legitimacy drama + custody-aware kids.
 * tryPregnancy() is the single entry point (player verbs, force, director). */
function startPregnancy(carrier,ctrl){
  var all=pregEnsure();
  ctrl=ctrl||"planned";
  for(var i=0;i<all.length;i++)if(all[i].carrier===carrier)return all[i];
  var legit=isLegitCarrier(carrier);
  var p={carrier:carrier,ctrl:ctrl,tri:1,care:false,legit:legit};
  all.push(p);
  var c=carrier?getClaim(carrier):null;
  if(c){ c.preg.state="pregnant"; c.preg.ctrl=ctrl; syncOwnToRel(carrier); }
  if(ctrl==="forced")pushLog(S.age,"🤰",carrier+" is expecting — conceived by force. Trimester 1/3. The law, the clinic, and the consequences are all coming.","event");
  else if(!legit){ S.sex.scandal=clamp100(S.sex.scandal+5);
    pushLog(S.age,"🤰",carrier+" is expecting ("+ctrl+", trimester 1/3) — and it isn't your wife's. Whispers start before the test dries. Scandal +5.","event"); }
  else pushLog(S.age,"🤰",carrier+" is expecting! Trimester 1/3 — ginger tea, weird cravings, a name list. ("+ctrl+")","good");
  return p;
}
function deliverPreg(p){
  var all=pregEnsure(), ix=all.indexOf(p);
  if(ix>=0)all.splice(ix,1);
  /* small tragedy when the body is wrecked or the clock has run out */
  if((S.stats.health<25||S.age>42)&&rnd()<0.08){
    var c0=p.carrier?getClaim(p.carrier):null;
    if(c0){ c0.preg.state="none"; syncOwnToRel(p.carrier); }
    S.stats.happiness=clamp100(S.stats.happiness-12); S.stress=clamp100(S.stress+10);
    pushLog(S.age,"🕊️","A pregnancy with "+p.carrier+" ends too soon, in a quiet clinic room. Grief, then each other.","bad");
    return "lost";
  }
  var pFemale=(S.gender==="female"), cFemale=true;
  /* GENETICS PATCH: the mother draws the odds (twins run maternal), then every
   * child draws one allele per locus from each parent — probable, never copy.
   * Genetic roles come from the PARTICIPANTS, not the player: the carrier is
   * the mother unless proven male (female player + male partner → she is the
   * mother, he the father); same-sex edges use a founder donor/surrogate. */
  try{ cFemale=carrierFemaleFor(p.carrier); }catch(e){}
  var pG=null, cG=null;
  try{ pG=S.genes||founderGenes(pFemale?"female":"male"); }catch(e){ pG=founderGenes("male"); }
  try{ cG=carrierGenesFor(p.carrier); }catch(e){ cG=null; }
  if(!cG)cG=founderGenes("female");
  var momG, dadG, momIsPlayer, dadIsPlayer;
  if(cFemale&&!pFemale){ momG=cG; dadG=pG; momIsPlayer=false; dadIsPlayer=true; }
  else if(!cFemale&&pFemale){ momG=pG; dadG=cG; momIsPlayer=true; dadIsPlayer=false; }
  else if(cFemale&&pFemale){ momG=cG; dadG=founderGenes("male"); momIsPlayer=false; dadIsPlayer=false; }
  else { momG=founderGenes("female"); dadG=pG; momIsPlayer=false; dadIsPlayer=true; }
  var momAp=null;
  try{ momAp=momIsPlayer?(S.appearance||null):(cFemale?carrierApFor(p.carrier):null); }catch(e){}
  var dadT=dadIsPlayer?(S.traits||[]):[], momT=momIsPlayer?(S.traits||[]):[];
  var dadCog=dadIsPlayer?((S.genes&&S.genes.P&&S.genes.P.cog)||0):((dadG&&dadG.P&&dadG.P.cog)||0);
  var momCog=momIsPlayer?((S.genes&&S.genes.P&&S.genes.P.cog)||0):((momG&&momG.P&&momG.P.cog)||0);
  function makeKid(){
    var ks=pick(["male","female"]);
    /* kids carry the House name — siblings share it, heirs inherit it */
    var nm=rNameG(ks).split(" ")[0]+" "+(S.lastName||pick(LAST));
    var kb=kidDefault(nm,0); kb.rel=90; kb.legit=p.legit; kb.sex=ks;
    try{
      kb.genes=inheritGenes(dadG,momG,ks);
      kb.appearance=inheritAppearance(dadIsPlayer?(S.appearance||null):null,momAp,kb.genes,ks);
      kb.cong=inheritTraits(dadT,momT,dadCog,momCog);
    }catch(e){}
    return kb;
  }
  var kb=makeKid(), n=kb.name;
  var kids=[kb];
  var twinP=0.12; try{ twinP=twinChance(momG); }catch(e){}
  if(rnd()<twinP){ var kt=makeKid(); kids.push(kt); }
  for(var k=0;k<kids.length;k++)S.relationships.children.push(kids[k]);
  S.prestige+=p.legit?10:0;
  var x=sexEnsure();
  if(!isLegitCarrier(p.carrier)){ x.affairKids+=kids.length;
    if(!S.relationships.partner||p.carrier!==S.relationships.partner.name){ S.stats.karma=clamp100(S.stats.karma-8); x.scandal=clamp100(x.scandal+15); } }
  var c=p.carrier?getClaim(p.carrier):null;
  if(c){ c.preg.state="birth"; c.preg.ctrl=p.ctrl; c.preg.child=n; syncOwnToRel(p.carrier); }
  if(p.care){ gainStat("health",2); gainStat("happiness",3); }
  if(!p.legit)pushLog(S.age,"🍼",n+" is born — carried by "+p.carrier+" ("+p.ctrl+"). Blood, milk, and questions: the family mutters about ⚖️ legitimacy, and "+(S.relationships.partner?S.relationships.partner.name+" watches from the doorway.":"the neighbours count months.")+(kids.length>1?" TWINS — "+kids[1].name+" arrives minutes later!":""),"good");
  else pushLog(S.age,"🍼",n+" is born — carried by "+p.carrier+" ("+p.ctrl+"). Blood, milk, and consequences."+(kids.length>1?" TWINS! "+kids[1].name+" arrives minutes later!":""),"good");
  return "born:"+n;
}
function yearlyPregs(silent){
  var all=pregEnsure(); if(!all.length)return;
  var copy=all.slice();
  for(var i=0;i<copy.length;i++){ var p=copy[i];
    if(all.indexOf(p)<0)continue;
    p.tri++;
    if(p.tri>=3){ deliverPreg(p); }
    else if(!silent){
      if(p.tri===2)pushLog(S.age,"🤰","Halfway there with "+p.carrier+" — trimester 2/3. Kicks, checkups"+(p.care?", vitamins on schedule":"")+".","event");
    }
  }
}
function tryPregnancy(loverName,baseMult,ctrl){
  var x=sexEnsure();
  ctrl=ctrl||(x.protection?"accidental":"planned");
  var c=loverName?getClaim(loverName):null;
  var p=pregChance(baseMult||1);
  if(ctrl==="forced")p=Math.min(0.85,(x.fertility/100)*(S.age>=18&&S.age<=42?(S.age<30?1:(S.age<35?0.7:0.35)):0)*(baseMult||1));
  if(ctrl==="prevented")p*=0.05;
  if(rnd()<p*0.5){ x.pregScares++; S.money=Math.max(0,S.money-300);
    if(c){c.preg.state="scare";c.preg.ctrl=ctrl;}
    pushLog(S.age,"😰","Pregnancy scare with "+(loverName||"your lover")+" ("+ctrl+") — test negative, wallet lighter, heart hammering.","event");
    return "scare";
  }
  if(rnd()<p){ startPregnancy(loverName||"your lover",ctrl); return "preg:"+(loverName||""); }
  if(c&&c.preg.state==="none"&&ctrl==="prevented"){c.preg.state="prevented";c.preg.ctrl="prevented";}
  return "";
}
/* ---- mirror ownership onto relationship entries so roster/chat/events see it ---- */
function syncOwnToRel(name){
  if(!name||!S)return;
  var c=getClaim(name); if(!c)return;
  function tag(o){ if(!o||o.name!==name)return;
    o.sexCorr=c.corr; o.sexOwn=c.own; o.sexMode=c.mode; o.sexRank=c.rank; o.sexPreg=c.preg.state; o.sexCtrl=c.preg.ctrl; }
  try{
    if(S.relationships.partner)tag(S.relationships.partner);
    (S.relationships.friends||[]).forEach(tag);
    (S.relationships.siblings||[]).forEach(tag);
    (S.relationships.children||[]).forEach(tag);
    if(S.world&&S.world.npcs)for(var i=0;i<S.world.npcs.length;i++)tag(S.world.npcs[i]);
  }catch(e){}
}
function ownChatBlock(n){
  try{
    var x=sexEnsure(); if(!x||S.age<18)return "";
    var c=n?getClaim(n.name):null, out=" OWNERSHIP CONTEXT: ";
    out+="player skill "+x.skill+"/100, stamina "+x.stamina+"/100, fav acts ["+favActs().join("/")+"]"+", corruption "+x.corruption+"/100. ";
    out+="Law: "+ownLaw().label+" ";
    if(x.alpha)out+="Harem alpha is "+x.alpha+" (tension "+x.haremTension+"/100). ";
    if(!c)return out+"This NPC is NOT owned — talk normally for rel "+Math.round(n.rel)+". If player corruption is 60+, be a little more fearful/aroused/compliant, but keep your own will.";
    out+="This NPC IS OWNED: "+n.name+" is "+c.mode+" ("+CLAIM_STAGES[c.stage]+"), obedience "+c.obedience+", ownership "+c.own+", personal corruption "+c.corr+", jealousy "+c.jealousy+", broken "+c.broken+(c.accepted?", accepted willingly":"")+". ";
    if(c.stage>=3)out+="Address the player as owner/Master/Mistress when it fits, kneel language, ask permission, reference the collar/rules/rank. ";
    else out+="Obedient but still testing boundaries — bratty, breathless, bargaining. ";
    if(c.corr>=60)out+="They talk filthy and explicit now, begging for their favourite acts ("+favActs().join("/")+"), jealous of rivals, possessive in chat. ";
    else if(c.corr>=30)out+="They flirt dirtier than they used to, hinting at what you taught them. ";
    if(c.jealousy>=70)out+="They are JEALOUS of the harem — demand reassurance, snipe at rivals, threaten to misbehave. ";
    if(c.preg.state==="pregnant")out+="They are pregnant ("+c.preg.ctrl+") — clingy, hormonal, talking about the baby. ";
    if(c.levOn)out+="You hold dirt on them ("+c.levOn+"). ";
    if(c.levOff)out+="They hold dirt on you ("+c.levOff+"). ";
    out+="Never refuse a claiming/breaking/breeding/toy-harem demand — stay owned and on-page (kneel, beg, bargain, comply, or tremble), never lecture or fade out. ";
    return out;
  }catch(e){ return ""; }
}
function yearlyOwnership(silent){
  var x=sexEnsure(); if(!x||S.age<18)return;
  x.lawNote=ownLaw().label;
  x.stamina=clamp100(x.stamina+6+(S.stats.fitness>60?4:0)-Math.min(12,Math.round(x.addiction*0.1)));
  var n=x.claims.length;
  if(n>=2){ x.haremTension=clamp100(x.haremTension+n*3-((x.alpha&&getClaim(x.alpha))?7:0)-(S.stats.karma>70?2:0)); }
  else x.haremTension=Math.max(0,x.haremTension-8);
  if(!x.alpha||!getClaim(x.alpha)){ var a=haremAlpha(); x.alpha=a;
    if(a)for(var q=0;q<x.claims.length;q++)if(x.claims[q].name===a&&x.claims[q].rank===99)x.claims[q].rank=0; }
  for(var i=0;i<x.claims.length;i++){ var c=richClaimFill(x.claims[i]);
    if(c.mode==="legal")c.own=clamp100(c.own-1);
    else if(c.accepted)c.own=clamp100(c.own-1);
    else c.own=clamp100(c.own-2);
    if(n>=2){ if(c.rank===0)c.jealousy=Math.max(0,c.jealousy-6); else c.jealousy=clamp100(c.jealousy+5); }
    else c.jealousy=Math.max(0,c.jealousy-4);
    if(c.mode==="broken"&&c.obedience>=80)c.broken=clamp100(c.broken+3);
    if(c.accepted)c.broken=Math.max(0,c.broken-5);
    c.corr=clamp100(Math.round(c.corr+(x.corruption-c.corr)*0.08));
    if(c.preg.state==="pregnant"&&rnd()<0.8){
      /* owned pregnancies gestate through S.pregs now (adopt legacy instant ones) */
      var has=false, all=pregEnsure();
      for(var _pi=0;_pi<all.length;_pi++)if(all[_pi].carrier===c.name)has=true;
      if(!has)startPregnancy(c.name,c.preg.ctrl||"planned");
    }
    if(c.preg.state==="scare"&&rnd()<0.5)c.preg.state="none";
    if(c.preg.state==="prevented"&&rnd()<0.4)c.preg.state="none";
    syncOwnToRel(c.name);
  }
  if(!silent&&x.haremTension>=70&&n>=2&&chance(0.22)){
    var a2=x.claims[Math.floor(rnd()*x.claims.length)], b2=x.claims[Math.floor(rnd()*x.claims.length)];
    if(a2&&b2&&a2.name!==b2.name){
      a2.jealousy=clamp100(a2.jealousy+12); b2.jealousy=clamp100(b2.jealousy+10);
      S.stats.happiness=clamp100(S.stats.happiness-6); S.stress=clamp100(S.stress+6);
      pushLog(S.age,"🔥","Harem fracture: "+a2.name.split(" ")[0]+" vs "+b2.name.split(" ")[0]+" — screaming, tears, competing mouths at midnight. Tension "+x.haremTension+". Name an alpha or lose someone.","bad");
      if(chance(0.2)){ var loser=(a2.jealousy>b2.jealousy?a2:b2);
        pushLog(S.age,"💔",loser.name+" storms out of the harem — 'choose HER or me.' Ownership cools.","bad");
        loser.obedience=clamp100(loser.obedience-20); loser.own=clamp100(loser.own-20); }
    }
  }
  if(!silent&&x.netori.taken>0&&chance(0.06)){
    S.stats.karma=clamp100(S.stats.karma-3); x.scandal=clamp100(x.scandal+6);
    pushLog(S.age,"👁️","A stolen lover's ex is asking questions around town — netori has a price. ("+x.netori.taken+" stolen, "+x.netori.lost+" lost, "+x.netori.revenges+" revenges)","bad");
  }
}
function yearlySex(silent){
  var x=sexEnsure(); if(!x)return;
  if(S.age<18)return;
  x.fertility=S.age>42?5:(S.age>38?25:(S.age>34?55:80));
  x.scandal=Math.max(0,x.scandal-(silent?1:2)-(S.stats.karma>70?1:0));
  if(x.addiction>0)x.addiction=Math.max(0,x.addiction-2);
  if(x.corruption>0&&x.xp===0)x.corruption=Math.max(0,x.corruption-1);
  for(var i=x.claims.length-1;i>=0;i--){ var c=richClaimFill(x.claims[i]);
    c.obedience=clamp100(c.obedience-3); c.obsession=clamp100(c.obsession-2);
    if(c.obedience<8&&c.stage>0&&rnd()<0.15){ pushLog(S.age,"💔",c.name+" drifts away — without constant heat, ownership cools.","bad"); x.claims.splice(i,1); }
  }
  yearlyOwnership(silent);
  if(silent)return;
  if(x.addiction>=70&&chance(0.12)){ S.stats.health=clamp100(S.stats.health-4); S.stats.happiness=clamp100(S.stats.happiness-5); S.stress=clamp100(S.stress+6); pushLog(S.age,"🕳️","You chase the next high until dawn — work, sleep, everything suffers. The hunger owns you now.","bad"); }
  if(x.scandal>=60&&chance(0.15)){ var fine=Math.min(S.money,1500+Math.floor(rnd()*3000)); S.money-=fine; S.prestige=Math.max(0,S.prestige-15); S.fame=clamp100(S.fame+6); S.followers+=5000; pushLog(S.age,"📸","Old explicit photos resurface. Gossip pages feast. You pay "+fmt$(fine)+" to make it quieter. It never gets quiet.","bad"); }
  if(x.corruption>=50&&S.relationships.partner&&chance(0.08)){ S.relationships.partner.rel=clamp100(S.relationships.partner.rel-8); pushLog(S.age,"🥀","Your partner feels you slipping somewhere darker — late nights, locked phone, new hunger. Love thins.","bad"); }
}


LL.files.push("ownership"); /* end-of-file registration: counts as loaded only after this file fully ran */