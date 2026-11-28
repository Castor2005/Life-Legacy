/* LIFE & LEGACY — engine/yearly.js
 * SECTION 5 yearly pipeline + school/work/money/body/social systems.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 5 — YEARLY LIFECYCLE (ageUp pipeline + jail + endYear + yearly systems) ============
 * Pipeline order (keep in sync with TOC): ensureWorld -> jail? -> advanceCalendar
 * -> runYearlySystems(school/work/money/body[/death]->family/lifestyle/fate/world-life)
 * -> runYearlyEvents(kids/event/AI) -> endYear(finalize). Death exits via die().
 * ============ */
// ---- yearly lifecycle pipeline (read top-down; each step is one named phase) ----
// Set by growTo: fast-forward must not kill you before you take control.
var growShield=false;
// ageUp() is the ONLY entry point the Age button / autosave / growTo call.
// Order is load-bearing: world markets first, jail short-circuit, calendar,
// body systems (can die) -> family/lifestyle/fate -> events -> finalize.
function isJailed(){ return !!(S&&S.flags&&S.flags.inJail>0); }
function serveJailYear(applyStress){
  // Shared jail body. Non-silent years apply stress (+8); silent fast-forward
  // (growTo) historically did not - preserved here via the flag.
  S.flags.inJail--; S.age++; S.year++;
  S.stats.happiness=clamp100(S.stats.happiness-8); S.stats.health=clamp100(S.stats.health-4);
  if(applyStress)S.stress=clamp100(S.stress+8);
  if(typeof checkDeath==="function")checkDeath();
  pushLog(S.age,"⛓️","Year in prison. "+S.flags.inJail+" left. You lift weights and read.","event");
  if(S.flags.inJail===0)pushLog(S.age,"🔓","Released! The sky never looked so good.","good");
}
function doJailYear(){ serveJailYear(true); }
function serveSilentJailYear(){ serveJailYear(false); }
/* Time passes for the family while the player is inside: everyone ages a year,
 * but there are no births, deaths, or events (the jail branch skips the sim). */
function jailFamilyAging(){
  var R=S.relationships, i;
  R.momAge++; R.dadAge++;
  (R.siblings||[]).forEach(function(s){ s.age++; });
  (R.grandparents||[]).forEach(function(g){ if(g.alive)g.age++; });
  (R.children||[]).forEach(function(c){ c.age++; });
  if(R.grandkids)for(i=0;i<R.grandkids.length;i++)R.grandkids[i].age++;
}
function advanceCalendar(){
  if(!S.flags.ageless)S.age++;
  S.year++; S.perYear={};
}
function runYearlyBodySystems(silent){
  // School -> work -> money -> body. Returns false if the body step killed us
  // (yearlyBody calls die() internally); caller must finalize + stop.
  yearlySchool(); yearlyWork(); yearlyMoney(silent); yearlyBody(silent);
  return S.alive;
}
function runYearlySocialSystems(silent){
  yearlyFamily();
  lifestyleTick();
  try{ if(typeof yearlyGenetics==="function")yearlyGenetics(silent); }catch(e){}
  yearlyFate(silent);
  runDynastyDepth(silent);
  wTickLife(silent);
  try{ if(typeof fateWill==="function")fateWill(silent); }catch(e){}
}
function runYearlyEvents(silent){
  // Kids flavor + one event roll. Silent years (fast-forward) stay quiet.
  if(S.age<=12&&chance(0.5))kidsFlavor();
  if(silent||!S.alive)return;
  /* A death crisis IS this year's event — never stack a second modal over it. */
  if(S.perYear&&S.perYear.deathCrisis)return;
  var fired=false;
  if(chance(0.62)){ fireEvent(); fired=true; }
  if(!fired&&chance(0.16)){ fireAIEvent(); }
}
function ageUp(silent){
  if(!S||!S.alive)return;
  try{ if(window.LL&&LL.bus)LL.bus.dispatch({type:"age",silent:!!silent,year:S.year}); }catch(e){}
  if(!S.world)wInit();
  wTickWorld(silent);
  if(isJailed()){
    // Jail short-circuit: no school/work/money/body/family this year.
    if(silent)serveSilentJailYear(); else doJailYear();
    if(!S.alive){ endYear(silent); return; }
    jailFamilyAging();
    wTickLife(silent); endYear(silent); return;
  }
  advanceCalendar();
  if(!runYearlyBodySystems(silent)){ endYear(silent); return; }
  runYearlySocialSystems(silent);
  runYearlyEvents(silent);
  endYear(silent);
}
// ---- endYear finalize (order matters: story/ambition -> overrides -> burnout -> history -> autofocus -> save+render)
function applyFlagOverrides(){
  if(S.flags.joyful)S.stats.happiness=Math.max(S.stats.happiness,85);
  if(S.flags.blessed)S.stats.karma=100;
  if(S.flags.everYouth)S.stats.looks=100;
}
function handleBurnout(){
  if(S.stress<100)return;
  S.stress=82; S.stats.health=clamp100(S.stats.health-8); S.money=Math.max(0,S.money-2000);
  pushLog(S.age,"😵","Burnout breakdown! Forced rest and therapy. -$2,000.","bad");
}
function recordYearHistory(){
  S.netHist.push(netWorth()); S.hapHist.push(S.stats.happiness);
  if(S.netHist.length>80)S.netHist.shift();
}
function maybeTriggerAutoFocus(silent){
  if(!S.alive||silent||S.age<12)return;
  if(S.lifestyle&&S.lifestyle!=="none")return;
  if(S.year-(S.lastFocusAI||0)<6)return;
  S.lastFocusAI=S.year; aiAutoFocus();
}
function endYear(silent){
  if(!silent)maybeStory(false);
  checkAmbition();
  applyFlagOverrides();
  handleBurnout();
  recordYearHistory();
  /* Year rhythm: deterministic per (life, year), session-only — one line.
   * The same rhythm also leans the sim (modifiers) and is recorded on the
   * command bus so MCP agents + the AI prompt can honor it. */
  try{
    if(window.LL&&LL.pcg&&S&&S.alive){
      var __rh=LL.pcg.rhythmFor(S.year);
      if(!silent)pushLog(S.age,"🗓️","Year rhythm "+__rh.glyphs+" — a "+__rh.dominant+" year.");
      if(window.LL&&LL.bus)LL.bus.emit({type:"year.committed",payload:{rhythm:__rh.dominant,glyphs:__rh.glyphs,year:S.year,silent:!!silent}});
    }
  }catch(e){}
  maybeTriggerAutoFocus(silent);
  try{ if(typeof checkS==="function")checkS("ageUp"); }catch(e){}
  try{ if(typeof modRunYearly==="function")modRunYearly(silent); }catch(e){}
  autosave(); render();
}
// netWorth: liquid + 0.8*house + 0.6*car + 0.7*business + shares - debt (rounded).
// netWorth: liquid + 0.8*house + 0.6*car + 0.7*company + shares - debt (rounded).
function netWorth(){ return Math.round(S.money+S.assets.stocks+S.assets.crypto+S.assets.savings+S.assets.houseVal*0.8+S.assets.carVal*0.6+(S.company?S.company.value*0.7:0)+wSharesValue()-S.debt); }
function houseName(){ var h=findById(window.GDATA.houses,S.assets.houseId); return h?h.name:"—"; }
function carName(){ var h=findById(window.GDATA.cars,S.assets.carId); return h?h.name:"—"; }

// yearlySchool: education stage/grades/college progress for this age.
function yearlySchool(){
  var e=S.education,g=S.stats;
  var dili = hasTrait("diligent")?2:0, lazy = hasTrait("lazy")?2:0;
  if(S.age>=3&&S.age<=5){ e.stage="Preschool"; gainStat("social",2); }
  else if(S.age>=6&&S.age<=10){ e.stage="Elementary"; gainStat("smarts",1+rnd()*2+dili-lazy*0.5); e.grades=clamp100(e.grades+(g.smarts>50?2:-1)); }
  else if(S.age>=11&&S.age<=13){ e.stage="Middle School"; gainStat("smarts",1+rnd()*2+dili); e.grades=clamp100(e.grades+(g.smarts>50?2:-1)); }
  else if(S.age>=14&&S.age<=17){ e.stage="High School"; gainStat("smarts",1+rnd()*2+dili); e.grades=clamp100(e.grades+(g.smarts>50?2:-1));
    if(e.grades>=90)e.highest="highschool"; }
  else if(S.flags.student){
    S.education.collegeYears++;
    gainStat("smarts",4+dili); gainStat("social",3); g.happiness=clamp100(g.happiness-2);
    S.stress=clamp100(S.stress+3);
    var cost=S.scholarship?0:(S.flags.community?3000:28000);
    S.money-=cost;
    pushLog(S.age,"🎓","College year "+S.education.collegeYears+" ("+S.major+")"+(S.scholarship?" on full scholarship!":"")+". Brain grows"+(cost?", debt grows":"")+".");
    if(S.education.collegeYears>=4){ S.flags.student=false; e.highest=S.flags.grad?"grad":"college";
      S.prestige+=30;
      pushLog(S.age,"🎓","GRADUATED! Degree: "+e.highest+" in "+S.major+". The world is yours. +30 prestige.","good");
      if(e.highest==="grad")gainStat("smarts",8); }
  }
  else if(S.age===18&&e.grades>=60&&e.highest==="none"){ e.highest="highschool"; e.stage="Graduated HS"; }
  if(S.age>18&&!S.flags.student)e.stage=e.highest==="grad"?"Graduate degree":(e.highest==="college"?"College grad ("+S.major+")":(e.highest==="highschool"?"High-school grad":"No degree"));
}
function fameJob(){ var j=jobById(S.jobId); return !!(j&&j.fame); }
// yearlyWork: salary, raises (1.6x cap), fame swing, promotions, retirement, business.
function yearlyWork(){
  if(S.jobId&&S.jobId!=="unemployed"){
    var macro=(S.world&&typeof S.world.gdp==="number")?(1+S.world.gdp/100*0.6):1;
    var __wm = 1;
    try { if (window.LL && LL.pcg && S) __wm = (LL.pcg.modifiersFor(S.year).incomeMul) || 1; } catch (e) {}
    var _base=(jobById(S.jobId)||{}).pay||S.salary;
    var _cap=Math.round(_base*1.6);
    var raise=1+Math.min(0.02,(0.01+rnd()*0.01+(focusTag()==="mogul"?0.005:0)+(hasTrait("ambitious")?0.003:0))*macro*__wm);
    S.salary=Math.min(_cap,Math.round(S.salary*raise));
    if(fameJob())S.salary=Math.max(Math.round(_base*0.4),Math.min(_cap,Math.round(S.salary*(1+(rnd()*0.6-0.3)))));
    S.money+=S.salary; S.totalEarned+=S.salary;
    S.performance=clamp100(S.performance+(rnd()*10-5));
    gainStat("discipline",1);
    if(fameJob()){ S.fame=clamp100(S.fame+3+rnd()*5); S.followers+=Math.round(S.fame*(20+rnd()*120));
      if(rnd()<0.06){ S.fame=clamp100(S.fame+6); pushLog(S.age,"⭐","Your fame spikes — tabloids, talk shows, trending. +followers.","event"); } }
    var promoCh=(0.06+(hasTrait("ambitious")?0.04:0))*(S.stats.karma<20?0.5:1)*(S.stats.karma>70?1.5:1);
    if(S.performance>70&&S.year-(S.promoY||0)>=3&&rnd()<promoCh){
      S.promoY=S.year; S.salary=Math.min(_cap,Math.round(S.salary*1.08)); gainStat("happiness",6); S.prestige+=12;
      pushLog(S.age,"📈","Promotion! Salary now "+fmt$(S.salary)+". Hard work noticed. +12 prestige.","good");
    }
    if(S.age>=65&&rnd()<0.2){ S.jobId="unemployed"; S.salary=0; S.flags.retired=true; pushLog(S.age,"🏖️","Retired. Mornings are yours now.","good"); }
  } else if(S.age>=16&&S.age<=24&&rnd()<0.3){
    var a=S.familyWealth==="rich"?1200:(S.familyWealth==="middle"?500:150);
    if(S.age<18){ S.money+=a; }
  }
  // (company payroll handled in yearlyCompany; legacy S.business converts to S.company in migrate)
  S.fame=clamp100(S.fame-(S.fame>0?0.6:0));
  var nr=Math.floor(S.prestige/200); if(nr>S.renown){ S.renown=nr; pushLog(S.age,"👑","RENOWN "+nr+"! House "+S.lastName+" rises. Rivals take notes.","good"); }
}
// yearlyMoney: upkeep + living costs, asset growth, debt, trust/allowance.
// Silent (fast-forward) years stay solvent: off-screen life covers its bills,
// so a custom start age doesn't arrive buried in fast-forward debt.
function yearlyMoney(silent){
  var cost=0,i;
  /* PCG lean: work years earn a touch more, rest years spend a touch less. */
  var __m = null;
  try { if (window.LL && LL.pcg && S) __m = LL.pcg.modifiersFor(S.year); } catch (e) {}
  var __incMul = (__m && __m.incomeMul) || 1;
  /* fold stray negatives (school bills / event costs deduct directly) into debt first */
  if(S.money<0){ S.debt+=Math.round(-S.money); S.money=0; }
  for(i=0;i<window.GDATA.houses.length;i++) if(window.GDATA.houses[i].id===S.assets.houseId) cost+=Math.max(window.GDATA.houses[i].upkeep,Math.round((S.assets.houseVal||0)*0.05));
  for(i=0;i<window.GDATA.cars.length;i++) if(window.GDATA.cars[i].id===S.assets.carId) cost+=Math.max(window.GDATA.cars[i].upkeep,Math.round((S.assets.carVal||0)*0.05));
  var atHome=S.age<22&&S.assets.houseId==="none";
  var living=S.age<18?0:(atHome?2500:(S.age<25?6000:(S.age<60?17000:9000)));
  /* couch-surfing: no rent to pay — food and scraps only */
  if(S.flags.homeless)living=Math.round(living*0.25);
  cost+=living;
  if(S.flags.student)cost+=2000;
  if(S.relationships.children.length)cost+=6000*S.relationships.children.length;
  try{ var _exn=S.relationships.children.filter(function(k){return k.custody==="ex";}).length;
    if(_exn>0){ cost+=3000*_exn; if(!silent&&chance(0.3))pushLog(S.age,"💸","Child support for "+_exn+" kid"+(_exn>1?"s":"")+" with your ex: "+fmt$(3000*_exn)+"/yr. The court doesn't care about your budget.","bad"); } }catch(e){}
  if(S.relationships.pets.length)cost+=400*S.relationships.pets.length;
  if(S.world)cost=Math.round(cost*(1+(S.world.inflation/100)*0.4));
  S.money-=Math.round(cost);
  /* day labor: an unemployed adult always scrapes together food money, so an
   * idle life goes broke and miserable — never mathematically doomed at 27 */
  if(!silent&&(!S.jobId||S.jobId==="unemployed")&&S.age>=16&&S.age<65&&living>0){
    S.money+=living;
  }
  if(S.assets.houseVal>0){ S.assets.houseVal=Math.round(S.assets.houseVal*(1+(S.world?wHouseR():0.03))); S.assets.houseYears++; }
  if(S.assets.carVal>0){ S.assets.carVal=Math.round(S.assets.carVal*0.92); }
  if(S.assets.stocks>0){ var g=1+(S.world?wIdxR():0.06)+(rnd()*0.04-0.02); S.assets.stocks=Math.round(S.assets.stocks*g); }
  if(S.assets.crypto>0){ var g2=1+(S.world?wKoinR():0.1); S.assets.crypto=Math.round(S.assets.crypto*g2); }
  if(S.assets.savings>0){ var sv=S.world?(1+S.world.rates/100*0.8):1.04; S.assets.savings=Math.round(S.assets.savings*sv); }
  if(S.money<0){ S.debt+=Math.round(-S.money); S.money=0;
    /* no interest on a couch-surfer's debt — collectors can't bleed a stone.
     * the balance still waits, but it no longer compounds into doom. */
    S.debt=Math.round(S.debt*(S.flags.homeless?1:1.05));
    S.stats.happiness=clamp100(S.stats.happiness-6); S.stress=clamp100(S.stress+6);
    if(silent){ S.debt=0; }
    if(S.debt>8000&&!S.flags.homeless){ S.flags.homeless=true; pushLog(S.age,"📦","Debt piles up… you're couch-surfing now. Day labor covers food, nothing more — apply for any job (💼 Jobs) or Side hustle (💪) before it buries you.","bad"); } }
  else{ S.flags.homeless=false; if(S.debt>0){ var p=Math.min(S.money,S.debt); S.money-=p; S.debt-=p; } }
  if(S.flags.goldenTouch&&S.money<10000){ S.money=10000; if(rnd()<0.25)pushLog(S.age,"✨","Mysterious dividends cover the shortfall.","event"); }
  if(S.age<=17&&(S.relationships.momAge>-100||S.relationships.dadAge>-100)&&S.relationships.parentRel>30){ S.money+=S.familyWealth==="rich"?600:(S.familyWealth==="middle"?200:60); }
  else if(S.age<=24&&(S.relationships.momAge>-100||S.relationships.dadAge>-100)&&S.relationships.parentRel>40&&S.assets.houseId==="none"){ S.money+=S.familyWealth==="rich"?2000:(S.familyWealth==="middle"?800:250); }
}
// yearlyBody: health/happiness/looks decay + mortality rolls; may call die().
// Silent (fast-forward) years get off-screen self-care: they represent years
// lived normally, not years of neglect — drift toward healthy baselines so a
// custom start age doesn't arrive dead, hollow, or wrecked.
function yearlyBody(silent){
  var g=S.stats;
  /* Flatline is judged on arrival: ending last year at 0hp means the decay +
   * warnings already had their say. (A focus tick or PCG lean later in this
   * function must not resurrect the flatline into a dice roll.) */
  var __flat=(g.health<=0);
  sanitizeApForAge(); facialEmergence();
  /* PCG lean: rest/spirit years soften stress, body years cushion health. */
  var __bm = null;
  try { if (window.LL && LL.pcg && S) __bm = LL.pcg.modifiersFor(S.year); } catch (e) {}
  var stressHit=S.stress>70?4:(S.stress>45?2:0);
  var _broke=(S.money<=0&&S.debt>5000);
  var _band=S.age<30?1:(S.age<50?2:(S.age<70?4:6));
  var _hDec=_band+(g.fitness<25?1:0)+(_broke?1:0)+(S.stress>70?2:0)-(g.fitness>=60?1:0);
  if(hasTrait("titan"))_hDec=Math.floor(_hDec/2);
  g.health=clamp100(g.health-Math.max(0,_hDec)-stressHit*0.5);
  if(focusTag()==="athlete")gainStat("health",1);
  if(focusTag()==="ascetic")gainStat("health",1);
  if(silent){
    if(g.health<65)gainStat("health",3);
    if(g.happiness<60)gainStat("happiness",4);
    if(S.stress>35)S.stress=clamp100(S.stress-5);
  }
  if(g.health<25&&rnd()<0.6)pushLog(S.age,"⚠️","Your body aches constantly — see a doctor soon!","bad");
  if(!silent&&_broke&&rnd()<0.5)pushLog(S.age,"💸","Debt is eating you alive — apply for any job (💼 Jobs), Side hustle (💪), or sell something before it buries you.","bad");
  if(!silent&&g.happiness<15&&g.happiness>0&&rnd()<0.6)pushLog(S.age,"⚠️","The grey is closing in — friends, love, faith, anything. Hold on.","bad");
  if(S.stress>=80&&rnd()<0.5)pushLog(S.age,"😰","Stress is crushing you — feast, vacation, meditate, or pilgrimage!","bad");
  gainStat("happiness",(rnd()*6-3)+(S.relationships.partner?3:-1)+(g.health<25?-3:0)-(_broke?3:0)-(S.stress>70?3:0)+(S.money>250000?1:0));
  if(!S.flags.everYouth)g.looks=clamp100(g.looks-(S.age>35?1+rnd()*1.5:0));
  gainStat("social",(S.relationships.friends.length*0.5-1));
  S.stress=clamp100(S.stress+(hasTrait("calm")?-2:0)+(focusTag()==="ascetic"?-3:0)+(S.age>60?-1:0)+(rnd()*4-2.4)+((__bm&&__bm.stressDelta)||0));
  if((__bm&&__bm.healthDelta))gainStat("health",__bm.healthDelta);
  var risk=0;
  if(g.health<=0)risk=1;
  /* frailty, not candles: a fit senior resists the age curve — a 95hp 75-year-old
   * should not drop like a frail one. No-counterplay deaths are frustration. */
  else if(S.age>0){ var ageTerm=Math.max(0,(S.age-72)*0.012);
    if(g.health>=60)ageTerm*=0.5; else if(g.health>=40)ageTerm*=0.8;
    risk=ageTerm+(g.health<20?0.10:(g.health<40?0.02:0.002)); }
  /* GENETICS PATCH: the bloodline bends the curve — longevity genes soften the
   * age term; an unmanaged thickheart adds its own sudden risk. */
  try{ if(typeof genLongvBend==="function")risk*=genLongvBend(); }catch(e){}
  try{ if(typeof genHeartRisk==="function")risk+=genHeartRisk(); }catch(e){}
  if(S.age<1)risk=0.01;
  /* freak bolt from the blue: adults only, never a healthy child — dying at 7
   * with 93hp and no counterplay is pure frustration, not drama. */
  if(S.age>=16&&rnd()<0.004&&!growShield)risk+=0.5;
  if(S.flags.undying){ if(g.health<=0){ g.health=1; if(rnd()<0.4)pushLog(S.age,"🛡️","Death knocks, reads your file, and leaves annoyed. You wake up.","event"); } }
  else if(!growShield){
    /* Sudden death is never silent: the dice buy a crisis, and the crisis
     * buys a saving throw (stat bonus + visible d20 vs DC) with real
     * choices in live years, or an auto-roll in silent fast-forward years.
     * Flatline (health 0) still kills outright — the decay + warnings were
     * the interaction there. (The dice below are only for the living.) */
    if(__flat){ die(pickDeath()); return; }
    if(rnd()<risk){ raiseDeathCrisis(pickDeath(),false,silent); if(!S.alive)return; }
    else if(g.happiness<=0&&rnd()<0.05){ raiseDeathCrisis("lost the will to go on",true,silent); if(!S.alive)return; } }
}
function pickDeath(){
  var a=S.age,h=S.stats.health;
  /* an unmanaged sickness writes its own ending before the generic table */
  try{ if(typeof genDeathCause==="function"){ var __gdc=genDeathCause(); if(__gdc)return __gdc; } }catch(e){}
  if(h<=15)return pick(["heart failure","a long illness","health complications"]);
  if(a>85)return pick(["old age, peacefully in sleep","old age surrounded by family","a quiet final nap"]);
  if(a>65)return pick(["a stroke","heart attack","pneumonia"]);
  return pick(["a car accident","a sudden illness","a freak accident","a hiking accident"]);
}
// ---- sudden-death saving throw: nobody drops with no interaction ----
// The mortality dice above buy a CRISIS, not a corpse. A live (non-silent)
// year opens a crisis modal with real choices; a silent fast-forward year
// auto-rolls. Mechanics are D&D-flavored and fully logged: d20 + stat bonus
// vs DC. Nat 20 always saves, nat 1 always fails. health>=80 rolls with
// advantage (robust constitution). Bonuses: fight = health+fitness,
// calm = discipline+health, reach = social+ties, endure = discipline+health.
// DC 10 + age curve + cause weight, capped at 18 — so a 100hp young adult
// survives ~19/20 crises battered but alive, while frail seniors face
// genuinely long odds. Survival costs blood (injury + stress + happiness);
// "Let go" is always offered for players done with a life.
function deathStep(v){ return Math.floor(((+v||0)-50)/10); }
function deathSaveDC(cause){
  var dc=10;
  if(S&&S.age>65)dc+=Math.floor((S.age-65)/8);
  if(/freak/i.test(cause))dc+=3;
  else if(/car accident|hiking/i.test(cause))dc+=2;
  else if(/old age|stroke|heart attack|pneumonia|long illness|health complications|heart failure/i.test(cause))dc+=2;
  else if(/sudden illness/i.test(cause))dc+=1;
  /* unmanaged blood prices the crisis: each sick disease +1 DC (cap +3).
   * Managed/cured/carrier/at-risk add nothing — treatment is the counterplay. */
  try{ if(typeof genCrisisMod==="function"){ var __gm=genCrisisMod(); if(__gm&&__gm.dc>0)dc+=__gm.dc; } }catch(e){}
  return Math.min(18,dc);
}
function deathSaveBonus(mode){
  var g=S.stats,b=0;
  try{
    if(mode==="calm")b=deathStep(g.discipline)+deathStep(g.health);
    else if(mode==="reach")b=deathStep(g.social)+((S.relationships&&S.relationships.partner)?2:0)+((S.relationships&&S.relationships.friends&&S.relationships.friends.length>=3)?1:0);
    else if(mode==="endure")b=deathStep(g.discipline)+deathStep(g.health);
    else b=deathStep(g.health)+deathStep(g.fitness);
    if(hasTrait("titan")&&(mode==="fight"||mode==="calm"||mode==="endure"))b+=2;
    if(mode==="fight"&&focusTag()==="athlete")b+=1;
    if(mode==="calm"&&focusTag()==="ascetic")b+=1;
  }catch(e){}
  return b;
}
function deathSaveRoll(mode,dc,noAdv){
  var adv=!noAdv&&S.stats.health>=80;
  var r1=1+Math.floor(rnd()*20),r2=1+Math.floor(rnd()*20);
  var r=adv?Math.max(r1,r2):r1;
  var bonus=deathSaveBonus(mode);
  var crit=(r===20),fumb=(r===1);
  return {r:r,r1:r1,r2:r2,adv:adv,bonus:bonus,dc:dc,crit:crit,fumb:fumb,
    total:r+bonus,ok:crit||(!fumb&&(r+bonus>=dc))};
}
function deathRollText(roll){
  return "rolled "+roll.r+"+"+roll.bonus+"="+roll.total+" vs DC "+roll.dc
    +(roll.adv?" (advantage ["+roll.r1+"/"+roll.r2+"])":"")
    +(roll.crit?" — CRIT!":"")+(roll.fumb?" — fumble!":"");
}
function surviveDeathCrisis(cause,roll,mode){
  var dmg=12+Math.floor(rnd()*14);
  S.stats.health=clamp100(Math.max(5,S.stats.health-dmg));
  S.stress=clamp100(S.stress+8);
  gainStat("happiness",-6);
  S.prestige+=3;
  pushLog(S.age,"🛡️","Death came for you ("+cause+") — "+(mode==="calm"?"you force yourself calm and think through the seconds":"you fight with everything you have")+". Saving throw "+deathRollText(roll)+". You live, battered (−"+dmg+" health, +3 prestige).","good");
}
function surviveWillCrisis(roll,mode){
  S.stats.happiness=clamp100(Math.max(12,S.stats.happiness+12));
  S.stress=clamp100(S.stress+5);
  pushLog(S.age,"🕯️","The grey had you by the throat — "+(mode==="reach"?"you reach out, and someone reaches back":"you grit your teeth and endure the night")+". Saving throw "+deathRollText(roll)+". You choose to stay.","good");
}
function failDeathSave(cause,roll,verb){
  pushLog(S.age,"🎲","Saving throw failed ("+cause+") — "+verb+". "+deathRollText(roll)+".","bad");
  die(cause);
}
/* Silent years (growTo/auto fast-forward): no modal possible — the soul
 * copes off-screen with its best bonus and the roll lands in the log. */
function autoDeathSave(cause,isWill){
  var dc=isWill?11:deathSaveDC(cause);
  var mode=isWill?((deathSaveBonus("reach")>=deathSaveBonus("endure"))?"reach":"endure"):"fight";
  var roll=deathSaveRoll(mode,dc,isWill);
  if(roll.ok){
    if(isWill)surviveWillCrisis(roll,mode); else surviveDeathCrisis(cause,roll,mode);
    return true;
  }
  failDeathSave(cause,roll,isWill?"you stop reaching back":"your body gives out");
  return false;
}
function raiseDeathCrisis(cause,isWill,silent){
  if(silent){ autoDeathSave(cause,isWill); return; }
  showDeathCrisis(cause,isWill);
}
/* The custom-response / custom-idea row must go while a crisis is open:
 * typing around fate is for flavor events, not for death. Restored on
 * every exit path (all three choices restore before the modal closes). */
function restoreCrisisRow(){
  try{ var cb=$("evCustomBtn"); if(cb&&cb.parentElement)cb.parentElement.style.display=""; }catch(e){}
}
/* Live years: the crisis IS the year's event — an eventModal with the
 * saving throw on the table and the odds printed on the buttons. */
function showDeathCrisis(cause,isWill){
  S.perYear=S.perYear||{};
  S.perYear.deathCrisis=true;
  var dc=isWill?11:deathSaveDC(cause);
  function mkChoice(label,hint,mode,surviveFn,failVerb,winText){
    var b=deathSaveBonus(mode);
    return {label:label,hint:hint+" (+"+b+" vs DC "+dc+")",fx:function(){
      var roll=deathSaveRoll(mode,dc,isWill);
      restoreCrisisRow();
      if(roll.ok){ surviveFn(roll,mode); return winText+" ("+deathRollText(roll)+")"; }
      failDeathSave(cause,roll,failVerb);
      return "The dark closes in. ("+deathRollText(roll)+")";
    }};
  }
  function letGo(label){
    return {label:label,hint:"die peacefully, no roll",fx:function(){
      restoreCrisisRow();
      pushLog(S.age,"🕊️","You let go. No struggle, no fear — just the long exhale.","event");
      die(cause);
      return "You let go.";
    }};
  }
  var ev;
  if(isWill){
    ev={title:"🕯️ The Edge of the Grey",
      text:function(){ return "You are "+S.firstName+" "+S.lastName+", age "+S.age+", and the grey is total. Nothing left to feel — except, maybe, one last choice. Your saving throw stands at DC "+dc+"."; },
      choices:[
        mkChoice("🤝 Reach out","Someone out there still cares — Social", "reach",surviveWillCrisis,"you stop reaching back","Hands catch you. You weep, and the weeping means you're alive"),
        mkChoice("🧱 Endure the night","White-knuckle it — Discipline","endure",surviveWillCrisis,"the night wins","Morning comes. You are still here, and that is enough"),
        letGo("🕊️ Let go")]};
  }else{
    ev={title:"💀 Death Knocks",
      text:function(){ return "You are "+S.firstName+" "+S.lastName+", age "+S.age+", and it happens all at once — "+cause+". Time thins. Your body gets one vote and your will gets one vote: make your saving throw (DC "+dc+")."; },
      choices:[
        mkChoice("💪 Fight for life","Your body against the moment — Fitness","fight",function(r,m){surviveDeathCrisis(cause,r,m);},"your body gives out","You refuse. Somehow, impossibly, you refuse — and it works"),
        mkChoice("🧠 Stay calm, think","Clarity under the blade — Discipline","calm",function(r,m){surviveDeathCrisis(cause,r,m);},"panic wins","Cold clarity. One right move, then another — and you're breathing"),
        letGo("🕊️ Let go")]};
  }
  showEvent(ev);
  try{ var cb=$("evCustomBtn"); if(cb&&cb.parentElement)cb.parentElement.style.display="none"; }catch(e){}
}
// yearlyFamily: parents/siblings/grandparents aging + deaths, kids/grandkids, friends/partner drift.
function yearlyFamily(){
  /* GENETICS PATCH: records mirror the numeric truth every year */
  try{
    var _RR=S.relationships;
    if(_RR.mom){ _RR.mom.age=_RR.momAge; _RR.mom.rel=_RR.parentRel; }
    if(_RR.dad){ _RR.dad.age=_RR.dadAge; _RR.dad.rel=_RR.parentRel; }
  }catch(e){}
  S.relationships.momAge++; S.relationships.dadAge++;
  (S.relationships.siblings||[]).forEach(function(s){ s.age++; });
  (S.relationships.grandparents||[]).forEach(function(g){
    if(!g.alive)return; g.age++;
    var dr=g.age>88?0.12:(g.age>75?0.04:(g.age>62?0.008:0.001));
    if(rnd()<dr){ g.alive=false;
      var gn=g.npcId?npcById(g.npcId):wFindNPC(g.name); if(gn)gn.alive=false;
      S.stats.happiness=clamp100(S.stats.happiness-10); S.stress=clamp100(S.stress+6);
      pushLog(S.age,"🕊️","Grand"+(g.sex==="female"?"ma":"pa")+" "+g.name+" passed away at "+g.age+". Sunday dinners will never be the same.","bad"); }
  });
  if(S.relationships.momAge>-100&&S.relationships.momAge<42&&rnd()<0.06
    &&(S.relationships.siblings||[]).filter(function(s){return s.age<18;}).length<4){
    var nb={name:rName(),age:0,rel:85}; S.relationships.siblings.push(nb);
    wAddNPC({name:nb.name,age:0,role:"sibling",rel:85});
    pushLog(S.age,"👶","A new sibling arrives: "+nb.name+"! Mom is glowing.","good"); S.prestige+=5;
  }
  if(rnd()<0.02&&S.relationships.momAge>70){
    var _mn="Mom"; try{ _mn=(S.relationships.mom&&S.relationships.mom.name)||"Mom"; }catch(e){}
    pushLog(S.age,"🕊️",_mn+" passed away. The grief is an ocean.","bad"); S.stats.happiness=clamp100(S.stats.happiness-18); S.stress=clamp100(S.stress+10); S.relationships.momAge=-999; S.money+=8000;
    try{ if(S.relationships.mom)S.relationships.mom.alive=false; var _m2=wFindNPC(_mn); if(_m2)_m2.alive=false; }catch(e){}
    pushLog(S.age,"💌",_mn+" left you $8,000 and her recipes.","event"); }
  if(rnd()<0.02&&S.relationships.dadAge>72){
    var _dn="Dad"; try{ _dn=(S.relationships.dad&&S.relationships.dad.name)||"Dad"; }catch(e){}
    pushLog(S.age,"🕊️",_dn+" passed away. You wear his watch now.","bad"); S.stats.happiness=clamp100(S.stats.happiness-18); S.stress=clamp100(S.stress+10); S.relationships.dadAge=-999; S.money+=8000;
    try{ if(S.relationships.dad)S.relationships.dad.alive=false; var _d2=wFindNPC(_dn); if(_d2)_d2.alive=false; }catch(e){} }
  var ch=S.relationships.children, i;
  for(i=0;i<ch.length;i++){ ch[i].age++;
    if(ch[i].age===18)pushLog(S.age,"🎓",(ch[i].name+" turns 18 — an adult of House "+S.lastName+"."),"event");
  }
  for(i=0;i<ch.length;i++){ var c=ch[i];
    if(c.age>=20&&rnd()<0.08&&(S.relationships.grandkids||[]).length<12){ if(!S.relationships.grandkids)S.relationships.grandkids=[];
      var gn=pick(["Wren","Milo","June","Theo","Nora","Eli","Ivy","Kai"])+" "+S.lastName;
      S.relationships.grandkids.push({name:gn,age:0}); S.prestige+=15;
      pushLog(S.age,"👶",c.name+" has a baby: "+gn+"! Grandparent joy. +15 prestige.","good"); }
  }
  if(S.relationships.grandkids)for(i=0;i<S.relationships.grandkids.length;i++)S.relationships.grandkids[i].age++;
  var fr=S.relationships.friends;
  for(i=0;i<fr.length;i++)fr[i].rel=clamp100(fr[i].rel+(rnd()*8-4)+(hasTrait("gregarious")?2:0));
  S.relationships.friends=fr.filter(function(f){return f.rel>5;}).slice(0,12);
  if(S.relationships.partner){ var p=S.relationships.partner; p.rel=clamp100(p.rel+(S.flags.charming?6:rnd()*8-5));
    if(p.rel<8&&rnd()<(S.stats.karma<20?0.8:0.4)){ pushLog(S.age,"💔",p.name+" left you. The apartment echoes.","bad"); S.relationships.partner=null; S.stats.happiness=clamp100(S.stats.happiness-14); S.stress=clamp100(S.stress+8); } }
  if(S.relationships.pets.length&&rnd()<0.06){ var pet=S.relationships.pets.shift(); pushLog(S.age,"🌈",pet.name+" "+pet.type+" crossed the rainbow bridge. Best friend forever.","bad"); S.stats.happiness=clamp100(S.stats.happiness-10); }
  apprCompliment();
}
// lifestyleTick: applies the active focus tick (focus tick map is data-driven).
function lifestyleTick(){
  var L=focusDef(S.lifestyle);
  if(!L||!L.tick)return;
  for(var k in L.tick) if(STAT_KEYS.indexOf(k)>=0) gainStat(k,L.tick[k]);
}
// kidsFlavor: cozy childhood log flavor for ages <=12 (no mechanics except +smarts sometimes).
function kidsFlavor(){
  var F=[["🧱","Built a couch fort. It has laws now."],["🦖","Dinosaur phase peaks. Everything is rawr."],["🎨","Drew the family as superheroes. Dad is 'Captain Snore'."],["🪱","Found a worm and named it President."],["📚","Read a whole book in one day! Brain +1."],["⚽","Scored a goal! Wrong net, but a goal!"],["🍪","Stole cookies, blamed the dog. The dog forgives."],["🔬","Mixed every shampoo. 'Science'."]];
  var f=pick(F); pushLog(S.age,f[0],f[1]);
  if(rnd()<0.3)gainStat("smarts",2);
}

LL.files.push("yearly"); /* end-of-file registration: counts as loaded only after this file fully ran */