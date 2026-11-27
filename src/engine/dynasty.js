/* LIFE & LEGACY — engine/dynasty.js
 * SECTION 7d crime career / children / company.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 7d — DYNASTY DEPTH: crime career · real children · family company ============
 * Three small-but-real progression systems. All state lives on S (migrated for
 * old saves), all yearly hooks run from runDynastyDepth() inside the standard
 * pipeline, and all player verbs are TABS entries routed through doAct().
 * AI plugins untouched: event text stays static; director fx already handles
 * jail/crime/addChild, and the AI biographer narrates whatever these systems log. */

// ---------- shared: real kids ----------
var KID_TRAITS=["bookworm","wild","shy","clown","dreamer","rebel","helper","artist"];
var KID_DREAMS=["astronaut","chef","doctor","artist","athlete","inventor","teacher","explorer"];
function kidDefault(name,age){
  return {name:name,age:age,rel:85,trait:pick(KID_TRAITS),dream:pick(KID_DREAMS),grades:55+randInt(0,30),trouble:0,moved:false,legit:true,custody:null};
}
function normalizeKid(c){
  if(!c.trait)c.trait=pick(KID_TRAITS); if(!c.dream)c.dream=pick(KID_DREAMS);
  if(typeof c.grades!=="number")c.grades=60; if(typeof c.trouble!=="number")c.trouble=0; if(c.legit===undefined)c.legit=true; if(c.custody===undefined)c.custody=null;
  /* GENETICS PATCH: pre-patch kids backfill a founder draw so every later
   * system (heir genome, portraits, screening) holds for old saves too. */
  if(!c.sex)c.sex=pick(["male","female"]);
  if(!c.genes){ try{ c.genes=founderGenes(c.sex); }catch(e){} }
  if(!c.cong)c.cong=[];
  if(!c.appearance){ try{
    var ka=genAppearance(c.sex,"Mixed");
    applyGenePhenotype(ka,c.genes,c.sex,0); sanitizeKidAp(ka); c.appearance=ka;
  }catch(e){} }
  return c;
}
function youngestNeedyKid(){
  var ch=S.relationships.children, best=null;
  for(var i=0;i<ch.length;i++){ normalizeKid(ch[i]); if(!best||ch[i].rel<best.rel)best=ch[i]; }
  return best;
}

// ---------- 1) CRIME CAREER: ranks, stash, territory, crew ----------
var UW_RANKS=["punk","hustler","enforcer","lieutenant","boss","kingpin"];
var UW_RANK_ICON=["🔪","💵","🦍","🤝","👑","🌃"];
var UW_NEXT=[20,45,75,110,150,1e9];
var UW_SCORES=[
  {label:"corner hustle",lo:[80,300],risk:0.30},{label:"warehouse rip",lo:[400,1400],risk:0.42},
  {label:"jewelry store",lo:[1500,5000],risk:0.55},{label:"armored truck",lo:[6000,16000],risk:0.68},
  {label:"casino vault",lo:[15000,40000],risk:0.78},{label:"city takeover",lo:[40000,100000],risk:0.85}];
function uw(){
  if(!S.underworld)S.underworld={rank:0,rep:0,stash:0,territory:0,crew:[],prisonRep:0,retired:false};
  return S.underworld;
}
function uwRankName(u){ u=u||(S.underworld||{rank:0}); return UW_RANK_ICON[u.rank]+" "+UW_RANKS[u.rank]; }
function uwJoin(){
  var u=uw();
  if(u.retired){ toast("You left that life. It doesn't take you back."); return; }
  if(u.rep>0||S.crime>0){
    if(u.rep<=0)u.rep=10; if(!u.crew.length)u.crew=[{name:rName(),skill:1}];
    gainLog("🔪","The crew claims you as one of theirs. Rep on the street: you're somebody now."); return;
  }
  u.rep=10; u.crew=[{name:rName(),skill:1}];
  gainKarma(-5); S.prestige+=3;
  gainLog("🔪",u.crew[0].name+" vouches for you. You're in the life now — small scores, big dreams.","event");
}
function uwPromote(){
  var u=uw(); if(u.rank>=5||u.rep<UW_NEXT[u.rank])return;
  u.rank++; u.territory=Math.min(100,u.territory+10);
  S.fame=clamp100(S.fame+4); S.followers+=2000*(u.rank+1); gainKarma(-4); S.prestige+=5;
  pushLog(S.age,"👑","Underworld promotion: you are now "+uwRankName()+". The streets whisper. +10% territory.","event");
}
function uwScore(){
  var u=uw();
  if(u.retired){ toast("You're out. Stay out."); return; }
  if(isJailed()){ toast("Not from inside."); return; }
  if(once("score"))return;
  var t=UW_SCORES[u.rank];
  var loot=randInt(t.lo[0],t.lo[1])+Math.round(u.territory*20)+u.crew.length*150;
  var risk=t.risk-u.crew.length*0.02-(hasTrait("deceitful")?0.08:0)-(S.flags.streetwise?0.05:0);
  var jailedBefore=S.flags.inJail;
  crime("a "+t.label+" ("+uwRankName()+")",loot,Math.max(0.05,risk));
  if(S.flags.inJail>jailedBefore)return;
  var cut=Math.round(loot*0.4); S.money-=Math.min(S.money,cut); u.stash+=cut;
  u.rep+=4+u.rank*2; uwPromote();
  if(chance(0.3))u.territory=Math.min(100,u.territory+2);
  for(var i=0;i<u.crew.length;i++)if(chance(0.25))u.crew[i].skill=Math.min(5,u.crew[i].skill+1);
}
function uwLayLow(){
  var u=uw(); if(isJailed())return;
  if(once("laylow"))return;
  S.heat=Math.max(0,(S.heat||0)-40); u.rep=Math.max(0,u.rep-3); u.territory=Math.max(0,u.territory-2);
  S.stress=clamp100(S.stress-6);
  gainLog("🧼","You vanish for a while. Heat dies down; the streets half-forget you.");
}
function uwWash(){
  var u=uw(); if(!u.stash){ toast("Stash is empty."); return; }
  var amt=Math.min(u.stash,5000), fee=Math.round(amt*0.1);
  u.stash-=amt; S.money+=amt-fee; S.totalEarned+=amt-fee;
  gainLog("🧺","Washed "+fmt$(amt)+" through a cousin's car wash. Fee "+fmt$(fee)+". Clean-ish.");
}
function uwYard(){
  if(S.flags.inJail<=0)return;
  if(once("yard"))return;
  var u=uw();
  u.prisonRep=Math.min(100,(u.prisonRep||0)+8); gainStat("fitness",2);
  if(chance(0.15)){ S.stats.health=clamp100(S.stats.health-8); gainLog("🔪","Yard politics turn bloody. You hold your ground but bleed for it.","bad"); }
  else gainLog("⛓️","You lift, listen, and earn quiet respect on the yard. Prison rep up.");
}
function yearlyUnderworld(silent){
  var u=uw(); if(u.retired)return;
  /* gang heat raids YOUR business: hot crews get robbed, torched, shaken down.
   * Runs even for non-crew criminals — heat from any crime follows you to work. */
  if(S.company&&!silent&&!isJailed()&&(S.heat||0)>=50&&chance(0.25)){
    var sec=(S.company.sec||0), dmg=Math.round((800+rnd()*2400)*(1-sec/150));
    dmg=Math.min(dmg,(S.company.cash||0)+S.money);
    var fromCash=Math.min(S.company.cash||0,dmg);
    S.company.cash-=fromCash; S.money-=Math.max(0,dmg-fromCash);
    S.company.morale=clamp100(S.company.morale-12);
    if(S.company.employees>2&&chance(0.4)){ S.company.employees--; pushLog(S.age,"🧨","Heat raid on "+S.company.name+": masked crew torches the stockroom and a cashier quits. −"+fmt$(dmg)+", −1 staff.","bad"); }
    else pushLog(S.age,"🧨","Heat raid on "+S.company.name+": your street life follows you to work. −"+fmt$(dmg)+" damage.","bad");
  }
  if(u.rep<=0&&S.crime===0)return;
  u.rep=Math.max(0,u.rep-2);
  if(u.territory>0&&!isJailed()){
    var take=Math.round(u.territory*(4+u.rank*3));
    u.stash+=take;
    if(!silent&&chance(0.12)){ S.heat=Math.min(100,(S.heat||0)+15); pushLog(S.age,"👁️","Rivals snitch about your corners. Heat rises.","bad"); }
  }
  var wages=u.crew.length*300;
  if(wages>0){
    if(u.stash>=wages)u.stash-=wages;
    else if(S.money>=wages)S.money-=wages;
    else if(u.crew.length&&chance(0.3)){ var left=u.crew.shift(); pushLog(S.age,"🚶",left.name+" walks — crew doesn't work for free.","bad"); }
  }
  if(!isJailed()&&(u.prisonRep||0)>=50&&u.crew.length<3&&chance(0.2)){
    u.prisonRep=20; var nm=rName(); u.crew.push({name:nm,skill:1});
    pushLog(S.age,"🤝","Your old cellmate "+nm+" finds you outside. Loyal to the bone — joins the crew.","event");
  }
}

// ---------- 2) REAL CHILDREN: traits, dreams, grades, trouble, milestones ----------
function yearlyChildren(silent){
  var ch=S.relationships.children; if(!ch||!ch.length)return;
  for(var i=0;i<ch.length;i++){ var c=normalizeKid(ch[i]);
    var target=55+(S.stats.karma-50)*0.2+(S.relationships.partner?5:0)-c.trouble*3+(S.age>60?5:0);
    c.rel=clamp100(c.rel+(target-c.rel)*0.08+(rnd()*4-2));
    if(c.age<18)c.grades=clamp100(c.grades+(S.stats.smarts>60?2:(chance(0.5)?1:-1))+(c.trait==="bookworm"?2:0)-(c.trouble>3?3:0));
    var n=wFindNPC(c.name); if(n)n.rel=c.rel;
    if(silent)continue;
    if(c.age===5&&!c.m5){ c.m5=1; pushLog(S.age,"🎒",c.name+" starts school — a "+c.trait+" who dreams of being an "+c.dream+".","event"); }
    if(c.age===13&&!c.m13){ c.m13=1; pushLog(S.age,"🌪️",c.name+" is a teenager now. The "+c.trait+" energy is a lot. Doors slam, music thumps.","event"); }
    if(c.age===16&&!c.m16){ c.m16=1; pushLog(S.age,"🪪",c.name+" at 16: "+(c.grades>=70?"grades shining ("+c.grades+"), eyes on the future.":"grades wobbling ("+c.grades+"). "+(c.trouble>2?"And attitude.":"")),"event"); }
    if(c.age>=14&&c.age<18&&c.rel<30&&chance(0.12)){ c.trouble=Math.min(10,c.trouble+2); pushLog(S.age,"🌙",c.name+" is running with a rough crowd. You see the signs.","bad"); }
    if(c.trouble>=8&&chance(0.1)){ c.trouble=3; S.money=Math.max(0,S.money-1500); S.stress=clamp100(S.stress+8); pushLog(S.age,"🚔","You bail "+c.name+" out of real trouble. -$1,500. The talk afterward is the hardest part.","bad"); }
    if(c.age>=22&&!c.moved&&chance(0.15)){ c.moved=true; pushLog(S.age,"📦",c.name+" moves out — a "+c.dream+" in the making. The house is quieter.","event"); }
    if(c.age>=24&&c.moved&&c.rel>65&&chance(0.1)){ var gift=Math.round(500+c.rel*20); S.money+=gift; S.totalEarned+=gift; gainStat("happiness",4); pushLog(S.age,"💌",c.name+" sends "+fmt$(gift)+" 'for everything'. You cry a little.","good"); }
    if(c.age>=20&&c.rel>70&&S.age>60&&chance(0.08)){ gainStat("health",3); gainStat("happiness",5); pushLog(S.age,"🤲",c.name+" looks after you now — soup, appointments, company. Love, reversed.","good"); }
  }
}
function kidBond(){
  var c=youngestNeedyKid(); if(!c){ toast("No children yet!"); return; }
  if(once("bond"))return;
  c.rel=clamp100(c.rel+12); gainStat("happiness",4); S.stress=clamp100(S.stress-4);
  var n=wFindNPC(c.name); if(n)n.rel=c.rel;
  gainLog("❤️","Real time with "+c.name+" ("+c.trait+", future "+c.dream+"). Something unclenches between you.");
}
function kidTutor(){
  var ch=S.relationships.children; if(!ch.length){ toast("No children yet!"); return; }
  if(once("tutor"))return;
  var n=0; for(var i=0;i<ch.length;i++){ var c=normalizeKid(ch[i]); if(c.age>=5&&c.age<18){ c.grades=clamp100(c.grades+8); n++; } }
  gainStat("smarts",1);
  gainLog("📐","Homework table, pencils, patience. "+(n?n+" kid"+(n>1?"s":"")+" climbing.":"Nobody school-age — you read together anyway."));
}
function kidPraise(){
  var ch=S.relationships.children; if(!ch.length){ toast("No children yet!"); return; }
  for(var i=0;i<ch.length;i++){ var c=normalizeKid(ch[i]); c.rel=clamp100(c.rel+5); var n=wFindNPC(c.name); if(n)n.rel=c.rel; }
  gainStat("happiness",2);
  gainLog("🌟","You tell each kid exactly what makes them remarkable. They stand taller.");
}
function kidScold(){
  var ch=S.relationships.children; if(!ch.length){ toast("No children yet!"); return; }
  if(once("scold"))return;
  for(var i=0;i<ch.length;i++){ var c=normalizeKid(ch[i]); c.trouble=Math.max(0,c.trouble-3); c.rel=clamp100(c.rel-6); var n=wFindNPC(c.name); if(n)n.rel=c.rel; }
  gainLog("📏","Rules, curfews, consequences. Grumbling — but the edges smooth out.");
}
function kidGroom(){
  if(S.heirId===null||!S.relationships.children[S.heirId]){ toast("Name an heir first (👑 Name Heir)!"); return; }
  var c=normalizeKid(S.relationships.children[S.heirId]);
  if(c.age<18){ toast(c.name+" is still a minor!"); return; }
  if(once("groom"))return;
  if(!S.groomed||S.groomed.idx!==S.heirId)S.groomed={idx:S.heirId,pts:0};
  if(S.groomed.pts>=3){ toast("Fully groomed already — a finished work."); return; }
  S.groomed.pts++; c.rel=clamp100(c.rel+6);
  if(c.legit===false){ S.prestige+=3; gainLog("🌱","You school "+c.name+" in the family ways — and the old families mutter about ⚖️ bloodlines at dinner. Heircraft "+S.groomed.pts+"/3. +3 prestige."); }
  else { S.prestige+=5; gainLog("🌱","You school "+c.name+" in the family ways — money, people, power. Heircraft "+S.groomed.pts+"/3. +5 prestige."); }
}

// ---------- 3) FAMILY COMPANY: found, staff, expand, IPO, inherit ----------
var CO_SECTORS={
  tech:{icon:"💻",name:"Tech",growth:0.16,vol:0.35,wage:2200,cost:15000,gate:50},
  food:{icon:"🍲",name:"Food",growth:0.08,vol:0.12,wage:1500,cost:12000,gate:0},
  trade:{icon:"🚚",name:"Trade",growth:0.11,vol:0.20,wage:2000,cost:12000,gate:0}};
function coName(sector){ return pick(["Ironroot","Copperline","Brightfield","Stonebridge","Northmark","Vellum","Oakhart","Cinderfall"])+" "+(sector==="tech"?"Systems":(sector==="food"?"Kitchens":"Trading"))+" Co."; }
function foundCompany(sector){
  var sec=CO_SECTORS[sector]; if(!sec)return;
  if(S.company){ toast("One company at a time — grow this one!"); return; }
  if(S.age<18){ toast("🔒 18+ to sign papers!"); return; }
  if(sec.gate&&S.stats.smarts<sec.gate){ toast("🔒 Tech needs 50+ smarts!"); return; }
  if(S.money<sec.cost){ toast("💸 Need "+fmt$(sec.cost)+"!"); return; }
  S.money-=sec.cost;
  S.company={name:coName(sector),sector:sector,value:sec.cost,cash:2000,employees:2,morale:60,rep:10,founded:S.year,level:1,sec:0,bid:null,calmUntil:0,rival:{name:coRivalName(sector),sector:sector,value:Math.round(sec.cost*(0.7+rnd()*0.6)),hostility:15}};
  S.prestige+=20;
  gainLog(sec.icon,"Founded "+S.company.name+" ("+sec.name+") for "+fmt$(sec.cost)+". Two believers, one desk, no fear. +20 prestige.","good");
  pushLog(S.age,"🏚️","Across town, "+S.company.rival.name+" does the same thing you do — only older, meaner, and already watching you.","event");
}
function coHire(){
  var c=S.company; if(!c){ toast("No company yet!"); return; }
  if(c.employees>=c.level*6){ toast("Expand first — no room for more staff!"); return; }
  if(S.money<2000){ toast("💸 Need $2,000 signing bonus!"); return; }
  S.money-=2000; c.employees+=2; c.morale=clamp100(c.morale+4);
  gainLog("🧑‍💼","Two sharp hires join "+c.name+". Desks fill, energy rises.");
}
function coExpand(){
  var c=S.company; if(!c){ toast("No company yet!"); return; }
  if(S.money<10000){ toast("💸 Need $10,000!"); return; }
  S.money-=10000; c.level++; c.value+=8000; c.morale=clamp100(c.morale-3);
  gainLog("🏭",c.name+" opens a new floor. Level "+c.level+". Growing pains, growing gains.");
}
function coIPO(){
  var c=S.company; if(!c){ toast("No company yet!"); return; }
  if(c.ipoDone){ toast("Already public!"); return; }
  if(c.value<500000){ toast("Bankers want $500k+ value (now "+fmt$(c.value)+")!"); return; }
  c.ipoDone=true; var take=Math.round(c.value*0.4);
  S.money+=take; S.totalEarned+=take; c.value=Math.round(c.value*0.7);
  S.ach.ipo=(S.ach.ipo|0)+1;
  S.fame=clamp100(S.fame+15); S.followers+=80000; S.prestige+=60;
  gainLog("📈",c.name+" goes PUBLIC! You ring the bell and pocket "+fmt$(take)+". +60 prestige, +fame!","good");
}
function yearlyCompany(silent){
  var c=S.company; if(!c)return;
  coEnsureRival();
  var sec=CO_SECTORS[c.sector]||CO_SECTORS.trade;
  var gdp=(S.world&&typeof S.world.gdp==="number")?S.world.gdp/100:0;
  var rev=Math.round(c.employees*(1200+c.level*800)*(1+gdp)*(1+(rnd()*sec.vol*2-sec.vol)));
  var wages=c.employees*sec.wage, profit=rev-wages, draw=Math.round(profit*0.3);
  c.cash+=profit; S.money+=draw; if(draw>0)S.totalEarned+=draw;
  c.morale=clamp100(c.morale+(profit>0?3:-5)+(c.employees<=c.level*4?2:-4));
  c.value=Math.max(1000,Math.round(c.value*(1+sec.growth*0.4+(profit>0?0.06:-0.08))+profit*0.5));
  c.rep=clamp100(c.rep+(profit>0?2:-2));
  /* performance -> standing: a winning year buys prestige (a losing year nicks
   * it), a public or giant name drifts fame. Runs before the silent return so
   * fast-forward years count too; prestige feeds renown via yearlyWork. */
  if(profit>0){ S.prestige+=profit>25000?3:(profit>8000?2:1); if(c.ipoDone)S.fame=clamp100(S.fame+1); if(c.value>=1000000)S.fame=clamp100(S.fame+1); }
  else if(profit<0){ S.prestige=Math.max(0,S.prestige-1); }
  if(silent)return;
  if(c.cash<0&&chance(0.5)){ S.money+=c.cash; if(S.money<0){ S.debt+=Math.round(-S.money); S.money=0; } c.cash=0; c.morale=clamp100(c.morale-10); pushLog(S.age,"🆘","You bail out "+c.name+" from your own pocket. Payroll met. Morale dented.","bad"); }
  if(c.value>=500000&&!c.ipoReady){ c.ipoReady=true; pushLog(S.age,"🔔","Bankers are circling "+c.name+" ("+fmt$(c.value)+"). They whisper one word: IPO. (👑 Rule tab.)","event"); }
  yearlyBizWar(silent);
}
function runDynastyDepth(silent){
  yearlyUnderworld(silent);
  yearlyChildren(silent);
  yearlyCompany(silent);
  yearlySex(silent);
  yearlyPregs(silent);
  try{ checkAch(silent); }catch(e){}
}

// ---------- 4) COMPANY WAR: rival firm, hostile takeovers, gang muscle ----------
// Rival firms compete every year: they grow, poach, undercut, and — when big
// enough — bid to swallow you whole. You can undercut, buy them out, harden
// the company, or send the crew around. All state lives on S.company (lazy,
// undefined-safe: old saves grow a rival on the first tick, no migration bump).
var CO_RIVALS={
  tech:["Blackledger Systems","Vexbyte Labs","Nullpoint Dynamics","Hollowgrid Inc."],
  food:["Greasefire Foods","Saltlick & Sons","Copperpot Collective","MawMaw's Empire"],
  trade:["Ironwagon Traders","Coldchain Cartel","Dustroad Exchange","Harborjack Ltd."]};
function coRivalName(sector){ var p=CO_RIVALS[sector]||CO_RIVALS.trade; return pick(p); }
function coEnsureRival(){
  var c=S.company; if(!c)return null;
  if(c.calmUntil===undefined)c.calmUntil=0;
  if(c.sec===undefined)c.sec=0; if(c.bid===undefined)c.bid=null;
  if(!c.rival&&S.year>=(c.calmUntil||0)){
    var sec=CO_SECTORS[c.sector]||CO_SECTORS.trade;
    c.rival={name:coRivalName(c.sector),sector:c.sector,value:Math.max(8000,Math.round(c.value*(0.6+rnd()*0.7))),hostility:15};
    pushLog(S.age,"🏚️","A rival surfaces: "+c.rival.name+" ("+fmt$(c.rival.value)+") wants your block. Watch the 👑 Rule tab.","event");
  }
  if(c.rival&&c.rival.hostility===undefined)c.rival.hostility=20;
  return c.rival||null;
}
function yearlyBizWar(silent){
  var c=S.company; if(!c||!c.rival)return;
  var r=c.rival, sec=CO_SECTORS[c.sector]||CO_SECTORS.trade;
  r.value=Math.max(3000,Math.round(r.value*(1+sec.growth*0.5+(rnd()*sec.vol*2-sec.vol)*0.6)));
  r.hostility=clamp100(r.hostility+2+((c.ipoDone||S.fame>=40)?2:0));
  /* rival hires street muscle when it hates you: your heat rises, your windows break */
  if(!silent&&r.hostility>=60&&chance(0.2)){
    S.heat=Math.min(100,(S.heat||0)+10);
    var musc=Math.round(600+rnd()*1800);
    S.company.cash=Math.max(0,(S.company.cash||0)-musc); c.morale=clamp100(c.morale-8);
    pushLog(S.age,"🌃",r.name+" pays cash for street muscle — your delivery vans come back dented, your heat rises. −"+fmt$(musc)+".","bad");
  }
  if(silent)return;
  /* takeover bid: when they dwarf you, an offer lands on your desk */
  if(!c.bid&&r.value>=c.value*1.2&&r.value>=20000&&S.year>=(c.bidCooldown||0)){
    var price=Math.round(c.value*1.25);
    c.bid={price:price,years:0};
    pushLog(S.age,"🤝",r.name+" makes a HOSTILE takeover bid: "+fmt$(price)+" for "+c.name+" (worth "+fmt$(c.value)+"). Accept in 💰 Money (🤝 Takeover bid) — or decline and they'll remember that.","event");
    toast("🤝 Hostile takeover bid for "+c.name+"!");
  }
  if(c.bid){
    c.bid.years++;
    if(c.bid.years>3){ c.bid=null; c.bidCooldown=S.year+2; r.hostility=clamp100(r.hostility+8);
      pushLog(S.age,"🤝","The bid expires unanswered. "+r.name+" takes the silence personally.","bad"); }
    return;
  }
  var roll=rnd();
  var guard=1-((c.sec||0)/200);
  if(roll<0.16&&c.employees>2&&chance(guard)){ c.employees--; c.morale=clamp100(c.morale-10);
    pushLog(S.age,"🕵️",r.name+" poaches your best shift lead with double pay. −1 staff, morale dented.","bad"); }
  else if(roll<0.30&&chance(guard)){ var cut=Math.round(1500+rnd()*3500); c.cash=Math.max(0,(c.cash||0)-cut); c.morale=clamp100(c.morale-6);
    pushLog(S.age,"📉",r.name+" undercuts you all quarter — a price war you didn't start. −"+fmt$(cut)+" company cash.","bad"); }
  else if(roll<0.36){ c.rep=clamp100(c.rep-6);
    pushLog(S.age,"🗞️",r.name+" plants hit pieces: 'health violations at "+c.name+"'. Regulators sniff around. −6 rep.","bad"); }
}
function coUndercut(){
  var c=S.company; if(!c){ toast("No company yet!"); return; }
  if(!coEnsureRival()){ toast("No rival to undercut — enjoy the monopoly."); return; }
  if(once("undercut"))return;
  if(S.money<5000){ toast("💸 Need $5,000 ad war chest!"); return; }
  S.money-=5000; var r=c.rival;
  r.value=Math.max(3000,Math.round(r.value*0.9)); r.hostility=clamp100(r.hostility+8);
  c.rep=clamp100(c.rep+3); S.prestige+=3;
  gainLog("📉","Price war! You flood the block with loss-leaders — "+r.name+" bleeds "+fmt$(Math.round(r.value*0.11))+" in value. They'll retaliate.","event");
}
function coAcquire(){
  var c=S.company; if(!c){ toast("No company yet!"); return; }
  if(!coEnsureRival()){ toast("No rival to buy — enjoy the monopoly."); return; }
  if(once("acquire"))return;
  var r=c.rival, price=Math.round(r.value*0.4);
  if(c.value<r.value){ toast("Too small — grow "+c.name+" past "+r.name+" ("+fmt$(r.value)+") first!"); return; }
  if(S.money<price){ toast("💸 Need "+fmt$(price)+" to swallow them!"); return; }
  S.money-=price;
  c.value+=Math.round(r.value*0.8); c.employees+=2; c.morale=clamp100(c.morale+5); c.rep=clamp100(c.rep+6);
  S.prestige+=40; S.fame=clamp100(S.fame+5); S.followers+=20000;
  pushLog(S.age,"🏦","HOSTILE TAKEOVER IN REVERSE: "+c.name+" swallows "+r.name+" for "+fmt$(price)+"! Their trucks, their clients, your empire. +40 prestige.","good");
  S.ach.buyout=(S.ach.buyout|0)+1;
  c.rival=null; c.calmUntil=S.year+5; c.bid=null;
}
function coSecurity(){
  var c=S.company; if(!c){ toast("No company yet!"); return; }
  if((c.sec||0)>=100){ toast("Fort Knox already — max security."); return; }
  if(S.money<3000){ toast("💸 Need $3,000!"); return; }
  S.money-=3000; c.sec=clamp100((c.sec||0)+25);
  gainLog("🛡️","Guards, cameras, a very large dog. Corporate security "+c.sec+"% — raids and poachers bounce off.");
}
function coHitRival(){
  var c=S.company; if(!c){ toast("No company yet!"); return; }
  if(!coEnsureRival()){ toast("No rival to hit."); return; }
  var u=uw(); if(u.retired||u.rep<=0){ toast("Need an active crew for this (🔪 Join the crew first)!"); return; }
  if(once("hitr"))return;
  if(u.stash<2000){ toast("Need $2,000 in the stash to pay the crew!"); return; }
  u.stash-=2000; u.rep=Math.max(0,u.rep-3);
  var r=c.rival;
  r.value=Math.max(3000,Math.round(r.value*0.85)); r.hostility=clamp100(r.hostility+12);
  S.heat=Math.min(100,(S.heat||0)+15); S.record=Math.min(100,(S.record||0)+5);
  S.stats.karma=clamp100(S.stats.karma-8);
  gainLog("🌃","The crew visits "+r.name+" after dark — torched vans, broken windows, a message. Their value craters. Your heat climbs. (−$2k stash, +15 heat, −8 karma)","event");
}
function coAnswerBid(accept){
  var c=S.company; if(!c||!c.bid){ toast("No bid on the table."); return; }
  if(accept){
    var price=c.bid.price, rn=c.rival?c.rival.name:"the rival";
    S.money+=price; S.totalEarned+=price; S.prestige=Math.max(0,S.prestige-10);
    pushLog(S.age,"🤝","SOLD: "+c.name+" goes to "+rn+" for "+fmt$(price)+". You walk away rich and a little hollow. (−10 prestige)","event");
    S.company=null;
  } else {
    if(once("snub"))return;
    c.bid=null; c.bidCooldown=S.year+2;
    if(c.rival)c.rival.hostility=clamp100(c.rival.hostility+10);
    S.prestige+=5;
    gainLog("🦁","You decline the bid and frame the letter. "+(c.rival?c.rival.name+" will not forget this. ":"")+"(+5 prestige, they hate you more)");
  }
}

// ---------- 5) ACHIEVEMENTS: persistent across lives (localStorage, never in S) ----------
// S resets every life; achievements live OUTSIDE it so dynasties accumulate glory.
// Store: localStorage ll_ach_v1 = {ids:{id:{at,life}}}. Never throws, never blocks.
var ACH_DEFS=[
  {id:"baby",icon:"🍼",name:"New Blood",desc:"Have a child",test:function(){return S.relationships.children.length>=1;}},
  {id:"brood",icon:"👨‍👩‍👧‍👦",name:"Full House",desc:"4+ children",test:function(){return S.relationships.children.length>=4;}},
  {id:"grand",icon:"👶",name:"Grandparent",desc:"Hold a grandchild",test:function(){return (S.relationships.grandkids||[]).length>=1;}},
  {id:"rich500",icon:"💎",name:"Comfortable",desc:"Net worth $500k",test:function(){return netWorth()>=500000;}},
  {id:"million",icon:"💰",name:"Millionaire",desc:"Net worth $1M",test:function(){return netWorth()>=1000000;}},
  {id:"ipo",icon:"📈",name:"Gone Public",desc:"Take a company public",test:function(){return (S.ach.ipo|0)>=1;}},
  {id:"tycoon",icon:"🏦",name:"Tycoon",desc:"Swallow a rival firm",test:function(){return (S.ach.buyout|0)>=1;}},
  {id:"kingpin",icon:"🌃",name:"Kingpin",desc:"Reach underworld rank 5",test:function(){return !!(S.underworld&&S.underworld.rank>=5);}},
  {id:"century",icon:"🎂",name:"Centenarian",desc:"Live to 100",test:function(){return S.age>=100;}},
  {id:"legend",icon:"👑",name:"Living Legend",desc:"400+ prestige",test:function(){return S.prestige>=400;}},
  {id:"star",icon:"⭐",name:"Superstar",desc:"80+ fame",test:function(){return S.fame>=80;}},
  {id:"scholar",icon:"🎓",name:"Scholar",desc:"Graduate degree + 85 smarts",test:function(){return S.education.highest==="grad"&&S.stats.smarts>=85;}},
  {id:"saint",icon:"😇",name:"Saint",desc:"90+ karma",test:function(){return S.stats.karma>=90;}},
  {id:"villain",icon:"🌙",name:"Villain",desc:"5+ crimes or karma ≤ 15",test:function(){return S.crime>=5||S.stats.karma<=15;}},
  {id:"wander",icon:"✈️",name:"Wanderer",desc:"5+ vacations",test:function(){return (S.ach.vacations|0)>=5;}},
  {id:"charmer",icon:"💘",name:"Charmer",desc:"10+ partners",test:function(){return (S.ach.partners|0)>=10||((S.sex&&S.sex.lovers)?S.sex.lovers.length>=10:false);}}
];
function achStore(){
  var d={ids:{}};
  try{
    var raw=window.localStorage?window.localStorage.getItem("ll_ach_v1"):null;
    if(raw){ var p=JSON.parse(raw); if(p&&p.ids)d=p; }
  }catch(e){}
  return d;
}
function achSave(d){ try{ if(window.localStorage)window.localStorage.setItem("ll_ach_v1",JSON.stringify(d)); }catch(e){} }
function achUnlock(id){
  var d=achStore();
  if(d.ids[id])return false;
  var life=S?(S.firstName+" "+S.lastName):"unknown";
  d.ids[id]={at:Date.now(),life:life};
  achSave(d);
  var def=null; for(var i=0;i<ACH_DEFS.length;i++)if(ACH_DEFS[i].id===id)def=ACH_DEFS[i];
  if(def){ try{ toast("🏆 Achievement: "+def.icon+" "+def.name+"!"); }catch(e){}
    try{ pushLog(S.age,"🏆","ACHIEVEMENT — "+def.icon+" "+def.name+": "+def.desc+".","milestone"); }catch(e2){} }
  try{ renderAch(); }catch(e){}
  return true;
}
function checkAch(){
  if(!S||!S.alive)return;
  for(var i=0;i<ACH_DEFS.length;i++){
    var a=ACH_DEFS[i], ok=false;
    try{ ok=!!a.test(); }catch(e){ ok=false; }
    if(ok)achUnlock(a.id);
  }
}
function renderAch(){
  var g=$("achGrid"), n=$("achCount");
  if(!g)return;
  var d=achStore(), have=Object.keys(d.ids).length;
  if(n)n.textContent="("+have+"/"+ACH_DEFS.length+")";
  var all=!!window.__llAchAll, h="";
  var order=ACH_DEFS.slice().sort(function(x,y){ return ((d.ids[y.id]?1:0)-(d.ids[x.id]?1:0)); });
  var list=all?order:order.slice(0,4), i, a, got;
  for(i=0;i<list.length;i++){
    a=list[i]; got=d.ids[a.id];
    h+='<div class="stage"><span>'+(got?a.icon:"🔒")+'</span>'+(got?("<b>"+esc(a.name)+"</b> "+esc(a.desc)):"<b>???</b> locked")+'</div>';
  }
  if(!all&&ACH_DEFS.length>4)h+='<div class="stage"><span>…</span>Plus '+(ACH_DEFS.length-4)+' more — expand to see them</div>';
  g.innerHTML=h;
  g.classList.toggle("ach-collapsed",!all);
  var t=$("achToggle"); if(t)t.textContent=all?"Show less":"Show all ("+ACH_DEFS.length+")";
}

LL.files.push("dynasty"); /* end-of-file registration: counts as loaded only after this file fully ran */