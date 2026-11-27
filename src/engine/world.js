/* LIFE & LEGACY — engine/world.js
 * SECTION 10 living world.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 10 — LIVING WORLD (economy + market + NPC sim + news) ============ */
var WORLD_TICKERS=[
  {sym:"NOVA",name:"NovaTech",icon:"💻",price:180,vol:.28,drift:.09,div:0},
  {sym:"HELI",name:"Helios Green",icon:"🌞",price:64,vol:.32,drift:.08,div:0},
  {sym:"BRED",name:"DailyBread Foods",icon:"🍞",price:92,vol:.12,drift:.05,div:.02},
  {sym:"CURA",name:"CuraMed",icon:"💊",price:140,vol:.18,drift:.07,div:.01},
  {sym:"GRAN",name:"First Granite Bank",icon:"🏦",price:75,vol:.20,drift:.06,div:.03},
  {sym:"TERA",name:"Terra REIT",icon:"🏘️",price:58,vol:.16,drift:.055,div:.04},
  {sym:"ORE",name:"Ore & Oil",icon:"🛢️",price:45,vol:.30,drift:.04,div:.02},
  {sym:"PIXL",name:"Pixelplay",icon:"🎮",price:120,vol:.38,drift:.10,div:0},
  {sym:"KOIN",name:"Koin",icon:"🪙",price:320,vol:.80,drift:.12,div:0},
  {sym:"CALM",name:"Calm Utilities",icon:"💡",price:66,vol:.10,drift:.04,div:.05}
];
var WORLD_ROLE_ICON={parent:"👪",friend:"👋",partner:"💘",child:"🌱",rival:"👁️",colleague:"💼",neighbor:"🏡",mentor:"🦉",fan:"⭐",ex:"💔",sibling:"🧬",grandparent:"📜"};
var wNoteBudget=0;
function wClamp(x,a,b){ return x<a?a:(x>b?b:x); }
/* DOD/ECS + WASM compute: market noise draws come from the WASM RNG when it
 * is ready (Math.random fallback), so the hot loop never blocks on load. */
function mRnd(){ try{ if(window.LL&&LL.wasmRand) return LL.wasmRand(); }catch(e){} return Math.random(); }
function wTicker(sym){ if(!S||!S.world)return null; for(var i=0;i<S.world.tickers.length;i++) if(S.world.tickers[i].sym===sym) return S.world.tickers[i]; return null; }
function wPrice(sym){ var t=wTicker(sym); return t?t.price:0; }
/* ECS market entities: one entity per ticker, component holds the LIVE ticker
 * object by reference (S stays the source of truth — no drift, no migration).
 * Lazy guard re-registers after reloads/imports (session-only entity ids). */
var wTickerEnts = [], wMarketSys = false;
function wEnsureMarketECS(){
  try {
    if (!window.LL || !LL.ecs || !LL.compute) return false;
    var tk = (S && S.world && S.world.tickers) || [], i, ok = true;
    if (wMarketSys && wTickerEnts.length === tk.length) {
      for (i = 0; i < tk.length; i++) {
        var c = LL.ecs.get(wTickerEnts[i], "ticker");
        if (!c || c.ref !== tk[i]) { ok = false; break; }
      }
      if (ok) return true;
    }
    for (i = 0; i < wTickerEnts.length; i++) { try { LL.ecs.destroy(wTickerEnts[i]); } catch (e) {} }
    wTickerEnts = [];
    for (i = 0; i < tk.length; i++) {
      var id = LL.ecs.create();
      LL.ecs.add(id, "ticker", { ref: tk[i] });
      wTickerEnts.push(id);
    }
    if (!wMarketSys) {
      LL.ecs.system("market", ["ticker"], function (ids, ctx) {
        var n = ids.length, i, c;
        var drift = new Float32Array(n), beta = new Float32Array(n),
            vol = new Float32Array(n), noise = new Float32Array(n), er = new Float32Array(n);
        var refs = new Array(n);
        for (i = 0; i < n; i++) {
          c = LL.ecs.get(ids[i], "ticker"); refs[i] = c.ref;
          drift[i] = c.ref.drift; beta[i] = c.ref.beta; vol[i] = c.ref.vol;
          noise[i] = ((mRnd() + mRnd() + mRnd() - 1.5) / 1.5) * c.ref.vol;
        }
        LL.compute.gbm(n, drift, beta, vol, noise, er, ctx.idxR, ctx.shockR);
        for (i = 0; i < n; i++) {
          var t = refs[i], x = er[i];
          if (mRnd() < 0.05) {
            var big = 0.3 + mRnd() * 0.5, up = mRnd() < 0.55;
            x += up ? big : -big;
            t.flash = { pct: Math.round((up ? big : -big) * 100), why: up ? pick(["breakthrough", "viral hit", "takeover rumor", "record earnings"]) : pick(["fraud probe", "product recall", "lawsuit", "hack"]) };
          } else t.flash = null;
          t.price = Math.max(1, t.price * (1 + x)); t.chg = x;
          t.hist.push(t.price); if (t.hist.length > 80) t.hist.shift();
          var sh = S.assets.shares && S.assets.shares[t.sym];
          if (sh && sh > 0.0001 && t.div > 0) {
            var dv = sh * t.price * t.div;
            if (dv >= 1) { S.money += Math.round(dv); S.totalEarned += Math.round(dv); }
          }
        }
      });
      wMarketSys = true;
    }
    return true;
  } catch (e) { return false; }
}
/* ECS NPC entities: every living NPC mirrored as an entity holding its LIVE
 * object by reference (S stays source of truth, no migration, session-only
 * ids rebuilt on reload/import). Systems run the numeric hot loop DOD-style;
 * rare narrative events stay scalar below. */
var wNpcEnts = [], wNpcSys = false;
function wSyncNpcECS() {
  try {
    if (!window.LL || !LL.ecs || !LL.compute) return false;
    var list = (S && S.world && S.world.npcs) || [], i;
    var ok = (wNpcSys && wNpcEnts.length === list.length);
    if (ok) {
      for (i = 0; i < list.length; i++) {
        var c = LL.ecs.get(wNpcEnts[i], "npc");
        if (!c || c.ref !== list[i]) { ok = false; break; }
      }
    }
    if (ok) return true;
    for (i = 0; i < wNpcEnts.length; i++) { try { LL.ecs.destroy(wNpcEnts[i]); } catch (e) {} }
    wNpcEnts = [];
    for (i = 0; i < list.length; i++) {
      var id = LL.ecs.create();
      LL.ecs.add(id, "npc", { ref: list[i] });
      wNpcEnts.push(id);
    }
    if (!wNpcSys) {
      LL.ecs.system("npcAge", ["npc"], function (ids) {
        for (var k = 0; k < ids.length; k++) {
          var o = LL.ecs.get(ids[k], "npc");
          if (o && o.ref && o.ref.alive) o.ref.age++;
        }
      });
      LL.ecs.system("npcEcon", ["npc"], function (ids) {
        for (var k2 = 0; k2 < ids.length; k2++) {
          var o2 = LL.ecs.get(ids[k2], "npc");
          var n = o2 && o2.ref;
          if (!n || !n.alive) continue;
          try {
            var job = (n.jobId && n.jobId !== "unemployed" && typeof jobById === "function") ? jobById(n.jobId) : null;
            if (job && n.age >= 18 && n.age <= 70) n.money += Math.round(job.pay * 0.04);
          } catch (e) {}
        }
      });
      wNpcSys = true;
    }
    return true;
  } catch (e) { return false; }
}
/* Batched social drift via the compute kernel (WebGPU when warm, CPU
 * otherwise): rel += (45-rel)*0.03 + bonus — one packed kernel call instead
 * of N scalar lerps. Writes back in place + syncs the friends list. */
function wBatchSocialLerp() {
  try {
    if (!window.LL || !LL.compute || !S || !S.world) return false;
    var cand = [];
    for (var i = 0; i < S.world.npcs.length; i++) {
      var n = S.world.npcs[i];
      if (!n.alive) continue;
      if (n.role !== "friend" && n.role !== "neighbor" && n.role !== "colleague") continue;
      var bonus = ((S.stats && S.stats.social > 60) ? 0.4 : 0) + ((n.role === "colleague" && S.jobId !== "unemployed") ? 0.6 : 0);
      cand.push({ n: n, bonus: bonus });
    }
    if (!cand.length) return true;
    var N = cand.length;
    var cur = new Float32Array(N), tgt = new Float32Array(N), add = new Float32Array(N), out = new Float32Array(N);
    for (var k = 0; k < N; k++) { cur[k] = cand[k].n.rel; tgt[k] = 45; add[k] = cand[k].bonus; }
    LL.compute.lerp(N, cur, tgt, add, 0.03, out);
    for (var j = 0; j < N; j++) {
      cand[j].n.rel = clamp100(out[j]);
      for (var fi = 0; fi < S.relationships.friends.length; fi++)
        if (S.relationships.friends[fi].name === cand[j].n.name) S.relationships.friends[fi].rel = Math.round(cand[j].n.rel);
    }
    return true;
  } catch (e) { return false; }
}
function wInit(){
  if(S.world&&S.world.v===1)return;
  var i, tickers=WORLD_TICKERS.map(function(d){
    var p=d.price*(0.9+rnd()*0.2);
    return {sym:d.sym,name:d.name,icon:d.icon,price:p,vol:d.vol,drift:d.drift,div:d.div,beta:0.5+rnd()*0.9,chg:0,hist:[p],flash:null};
  });
  var k=tick("KOIN"); if(k)k.beta=1.6;
  function tick(s){ for(var j=0;j<tickers.length;j++) if(tickers[j].sym===s) return tickers[j]; return null; }
  S.world={v:1,gdp:2.0,inflation:2.5,rates:4.0,mood:60,regime:"stable",
    idx:1000,idxHist:[1000],housing:100,housingHist:[100],
    tickers:tickers,news:[],npcs:[],aiNews:true,ticks:0,aiCalls:0,shock:0,regimeChanged:false,
    last:{idxR:0,koinR:0,houseR:0},outlook:null,
    div:{war:0,politics:0,tech:0,economy:0,science:0,culture:0},hypo:{},divAnalysis:null};
  if(S.customWorld){ for(var dk in S.world.div)S.world.div[dk]=4;
    wNews(S.age,"🌌","Alternate world — history already diverges here."); }
  S.world.divHist={}; S.world.divHist[S.birthYear]=Object.assign({},S.world.div);
  if(!S.assets.shares)S.assets.shares={};
  wSeedNPCs();
  wNews(S.age,"📰","A new soul enters a "+S.world.regime+" economy. The Grand Index opens at 1,000.");
}
function wSeedNPCs(){
  var R=S.relationships;
  try{ parentsEnsure(); }catch(e){}
  var mN=wAddNPC({name:(R.mom&&R.mom.name)||"Mom",age:R.momAge,sex:"female",role:"parent",rel:R.parentRel,jobId:"unemployed",money:4000,traits:((R.mom&&R.mom.traits)||["caring","patient"]).slice(),genes:R.mom&&R.mom.genes});
  try{ if(mN&&R.mom)R.mom.npcId=mN.id; }catch(e){}
  var dN=wAddNPC({name:(R.dad&&R.dad.name)||"Dad",age:R.dadAge,sex:"male",role:"parent",rel:R.parentRel,jobId:"unemployed",money:4000,traits:((R.dad&&R.dad.traits)||["stern","diligent"]).slice(),genes:R.dad&&R.dad.genes});
  try{ if(dN&&R.dad)R.dad.npcId=dN.id; }catch(e){}
  (R.siblings||[]).forEach(function(s){
    wAddNPC({name:s.name,age:s.age,sex:s.sex||pick(["male","female"]),role:"sibling",rel:s.rel,jobId:"unemployed",money:300,traits:((s.traits&&s.traits.length)?s.traits:["playful","curious"]).slice(),genes:s.genes});
  });
  (R.grandparents||[]).forEach(function(g){
    if(!g.alive)return;
    var n=wAddNPC({name:g.name,age:g.age,sex:g.sex,role:"grandparent",rel:g.rel,jobId:"unemployed",money:2000,traits:[pick(["wise","patient","caring","stern"]),pick(["patient","wise","witty","calm"])]});
    if(n)g.npcId=n.id;
  });
  var nb1=rNameG(pick(["male","female"]));
  wAddNPC({name:nb1,age:Math.max(0,S.age+1+Math.floor(rnd()*3-1)),sex:pick(["male","female"]),role:"neighbor",rel:40,jobId:"unemployed",money:300,traits:["playful","curious"]});
  wAddNPC({name:rName(),age:8+Math.floor(rnd()*20),sex:pick(["male","female"]),role:"mentor",rel:45,jobId:"teacher",money:6000,traits:["wise","patient"]});
  if(S.fate&&S.fate.nemesis){
    var rn=rNameG(S.gender==="female"?"male":"female");
    wAddNPC({name:rn,age:S.age+1,sex:pick(["male","female"]),role:"rival",rel:8,jobId:"unemployed",money:200,traits:["jealous","ambitious"]});
  }
}
function wAddNPC(o){
  if(!S.world.npcs)S.world.npcs=[];
  var alive=S.world.npcs.filter(function(n){return n.alive;});
  if(alive.length>=24){ for(var i=0;i<S.world.npcs.length;i++) if(!S.world.npcs[i].alive) S.world.npcs.splice(i,1); }
  if(S.world.npcs.filter(function(n){return n.alive;}).length>=24)return null;
  var __nm=o.name||rName();
  try{ __nm=npcUniqueName(__nm); }catch(e){}
  var n={id:"n"+Date.now()+Math.floor(rnd()*99999),name:__nm,age:o.age||20,
    sex:o.sex||pick(["male","female"]),role:o.role||"friend",rel:o.rel===undefined?50:o.rel,
    jobId:o.jobId||"unemployed",money:o.money||1000,alive:true,
    traits:o.traits||[pick(["ambitious","brave","calm","gregarious","diligent","patient","witty","loyal"]),pick(["loyal","witty","brave","patient"])],
    note:o.note||"",home:o.home||"",chat:[],mem:"",memLog:[]};
  /* GENETICS PATCH: every soul gets a genome (inheritance + screening run on
   * these) and a stable portrait seed (its own face, never the player's). */
  n.genes=o.genes||founderGenes(n.sex);
  n.imgSeed=o.imgSeed||0;
  n.appearance=o.appearance||null;
  /* PERSISTENT AGENTS: stable identity (unique living name) + memory-weighted
   * stance + explicit goal + NPC-NPC bonds. All lazy/undefined-safe so old
   * saves converge without a migration bump. */
  try{ n.bonds={}; npcAgentEnsure(n); }catch(e){}
  S.world.npcs.push(n); return n;
}
function wFindNPC(name){ if(!S.world)return null; for(var i=0;i<S.world.npcs.length;i++) if(S.world.npcs[i].alive&&S.world.npcs[i].name===name) return S.world.npcs[i]; return null; }
/* ---- persistent agents: stable identity + memory-weighted decisions + goals + bonds ----
 * Depth inside the existing NPC sim (NOT a new engine system — scope freeze holds).
 * - Stable identity: living names are unique (npcUniqueName), ids persist in the save.
 * - Memory: memLog lines are keyword-scored into agent.trust/agent.grudge
 *   (npcAgentLearn, called from npcMem), and decisions read npcTrustScore.
 * - Goals: every NPC has an explicit goal (npcPickGoal) pursued in npcTickAgent
 *   with completion rewards; conflicting goals (career/rivalry/love) push back
 *   on the player through the existing wNote/wNews budget.
 * - Bonds: NPC-NPC map (n.bonds id->score); gossip and grief propagate along it.
 * - Beyond the player: npcTickAgent runs inside wTickNPCs, which also runs on
 *   silent fast-forward years and jail years — off-screen lives continue.
 * All fields lazy/undefined-safe; old saves converge with no migration bump. */
function npcUniqueName(base){
  try{
    base=String(base||"").trim()||"Alex Morgan";
    if(!S||!S.world||!S.world.npcs)return base;
    var alive={}, i;
    for(i=0;i<S.world.npcs.length;i++) if(S.world.npcs[i].alive)alive[S.world.npcs[i].name]=true;
    if(!alive[base])return base;
    var suffix=[" Jr."," II"," III"," IV"];
    for(i=0;i<suffix.length;i++) if(!alive[base+suffix[i]])return base+suffix[i];
    for(var k=2;k<60;k++){ var cand=base+" "+k; if(!alive[cand])return cand; }
    return base;
  }catch(e){ return base; }
}
function npcPickGoal(n){
  var role=n&&n.role, traits=(n&&n.traits)||[], age=(n&&n.age)||20;
  var r=typeof rnd==="function"?rnd():Math.random();
  function has(t){ return traits.indexOf(t)>=0; }
  var kind="peace";
  if(role==="rival")kind=r<0.7?"rivalry":"career";
  else if(role==="colleague")kind=r<0.5?"career":(r<0.75?"wealth":"peace");
  else if(role==="partner")kind=r<0.5?"love":(r<0.8?"family":"peace");
  else if(role==="fan")kind=r<0.6?"fame":"love";
  else if(role==="friend")kind=r<0.35?"career":(r<0.6?"family":(r<0.8?"wealth":"love"));
  else if(role==="parent"||role==="grandparent")kind=r<0.6?"family":"peace";
  else if(role==="sibling")kind=r<0.4?"career":(r<0.7?"love":"rivalry");
  else if(role==="child")kind="family";
  else if(role==="mentor")kind=r<0.6?"career":"peace";
  else kind=r<0.3?"wealth":(r<0.55?"family":(r<0.8?"career":"peace"));
  if(has("ambitious")&&kind==="peace")kind="career";
  if(has("greedy")&&(kind==="peace"||kind==="love"))kind="wealth";
  if(has("jealous")&&role!=="rival"&&r<0.25)kind="rivalry";
  var detail="a quiet life";
  try{
    if(kind==="career")detail="earn a promotion";
    else if(kind==="wealth")detail="build savings";
    else if(kind==="family")detail="raise a family";
    else if(kind==="love")detail="win lasting love";
    else if(kind==="fame")detail="be known";
    else if(kind==="rivalry"){ var pn=(window.S&&S.firstName)||"you"; detail="outshine "+pn; }
  }catch(e){}
  return {kind:kind,detail:detail,prog:0};
}
function npcAgentEnsure(n){
  if(!n)return null;
  try{
    if(!n.bonds||typeof n.bonds!=="object")n.bonds={};
    if(!n.agent||typeof n.agent!=="object"){
      n.agent={goal:null,drive:30+Math.floor((typeof rnd==="function"?rnd():Math.random())*50),trust:0,grudge:0,seen:0,mourned:false};
    }
    if(!n.agent.goal)n.agent.goal=npcPickGoal(n);
    if(typeof n.agent.trust!=="number")n.agent.trust=0;
    if(typeof n.agent.grudge!=="number")n.agent.grudge=0;
    if(typeof n.agent.drive!=="number")n.agent.drive=50;
    return n.agent;
  }catch(e){ return null; }
}
/* Keyword-score a memory line into stance. Cheats (role/trait edits, wipes)
 * never shape stance — only lived history does. */
function npcAgentLearn(n,line){
  if(!n)return;
  var a=npcAgentEnsure(n); if(!a)return;
  var s=String(line||"").toLowerCase();
  if(/cheat|remade their personality|wipe memory|forgot everything/.test(s))return;
  var t=0,g=0;
  if(/gift|delighted|lent you|buried the hatchet|peace offering|confidant|helped|saved you|compliment|praise|good talk|listened/.test(s))t+=4;
  if(/\btrust\b|paid back|stood by you/.test(s))t+=2;
  if(/partner|love|married|devoted|loyal|close friend/.test(s))t+=1;
  if(/insult|won't forget|enemy|rival|ruin|destroyed|exposed|fled|cheat|affair|scandal|stole|circling|turning .* against|poison|sabotage|smear|frame|ransom|arson|badmouth|humiliat|cold|curdles/.test(s))g+=6;
  if(/debt|expect it back|awkward/.test(s))g+=1;
  a.trust=Math.max(-50,Math.min(50,(a.trust||0)+t));
  a.grudge=Math.max(0,Math.min(60,(a.grudge||0)+g));
  if(t>0&&g===0)a.grudge=Math.max(0,(a.grudge||0)-1);
  try{ a.seen=(window.S&&S.age)||a.seen||0; }catch(e){}
}
function npcTrustScore(n){
  if(!n)return 0;
  var a=n.agent||{};
  return Math.max(0,Math.min(100,Math.round((n.rel||50)+(a.trust||0)-(a.grudge||0)*1.2)));
}
function npcBondAdd(a,b,delta){
  try{
    if(!a||!b||a===b||!a.alive||!b.alive)return;
    if(!a.bonds||typeof a.bonds!=="object")a.bonds={};
    if(!b.bonds||typeof b.bonds!=="object")b.bonds={};
    a.bonds[b.id]=Math.max(-100,Math.min(100,Math.round((a.bonds[b.id]||0)+delta)));
    b.bonds[a.id]=Math.max(-100,Math.min(100,Math.round((b.bonds[a.id]||0)+Math.round(delta*0.7))));
  }catch(e){}
}
/* Gossip along bonds: when something notable happens between the player and
 * one NPC, their close bonds hear about it and cool/warm toward the player. */
function npcGossip(srcName,delta,reason){
  try{
    if(!S||!S.world||!S.world.npcs||!srcName)return;
    var src=null,i;
    for(i=0;i<S.world.npcs.length;i++) if(S.world.npcs[i].alive&&S.world.npcs[i].name===srcName){ src=S.world.npcs[i]; break; }
    if(!src)return;
    var line="Heard that "+reason+".";
    for(i=0;i<S.world.npcs.length;i++){
      var o=S.world.npcs[i];
      if(!o.alive||o===src)continue;
      var bond=(src.bonds&&src.bonds[o.id])||(o.bonds&&o.bonds[src.id])||0;
      if(bond>10||((o.role==="friend"||o.role==="colleague"||o.role==="sibling")&&o.rel>55&&rnd()<0.35)){
        o.rel=clamp100(o.rel+delta);
        if(typeof npcMem==="function")npcMem(o,line);
        else{ o.memLog=o.memLog||[]; o.memLog.push("Age "+S.age+": "+line); if(o.memLog.length>20)o.memLog.splice(0,o.memLog.length-20); }
        if(delta<0&&o.rel<12&&o.role!=="rival")o.role="rival";
        wPushRel(o);
      }
    }
  }catch(e){}
}
/* Persona line for AI prompts: goal + felt stance, so chat/director/AI honor
 * memory and conflicting goals instead of a flat rel number. */
function npcPersonaLine(n){
  try{
    var a=npcAgentEnsure(n);
    if(!a||!a.goal)return "";
    var t="YOUR CURRENT GOAL: "+a.goal.kind+" ("+a.goal.detail+", "+Math.round(a.goal.prog||0)+"% there). ";
    t+="HOW YOU FEEL ABOUT THEM: "+(a.grudge>=30?"you hold a real grudge":(a.grudge>=12?"wary, keeping score":(a.trust>=20?"deep trust":(a.trust>=8?"fond":"neutral"))))+" (trust "+Math.round(a.trust||0)+", grudge "+Math.round(a.grudge||0)+"). ";
    if(n.role==="rival"&&(a.grudge>=12||a.goal.kind==="rivalry"))t+="You want to outshine them. ";
    if(n.role==="partner"&&a.goal.kind==="love")t+="You want a future with them. ";
    return t;
  }catch(e){ return ""; }
}
function wEnsureAgents(){
  try{
    if(!S||!S.world||!S.world.npcs)return;
    for(var i=0;i<S.world.npcs.length;i++)npcAgentEnsure(S.world.npcs[i]);
  }catch(e){}
}
function npcGoalComplete(n,silent){
  var a=n?npcAgentEnsure(n):null; if(!a||!a.goal)return;
  var kind=a.goal.kind;
  try{
    if(kind==="career"){
      if(!n.jobId||n.jobId==="unemployed"){ n.jobId=wJobFor(n.age); if(n.jobId!=="unemployed"){ n.money+=300; n.note="New job: "+jobNameById(n.jobId)+"."; wNote(S.age,"💼",n.name+" landed a job ("+jobNameById(n.jobId)+") chasing their goal.","",false,silent); } }
      else{ n.money+=Math.round(400+rnd()*1600); n.note="Promoted — career climbing."; wNote(S.age,"📈",n.name+" got promoted — their career goal pays off.","",false,silent); }
      if(n.role==="colleague"&&S.jobId&&S.jobId!=="unemployed"&&rnd()<0.10){
        S.performance=Math.max(0,S.performance-8);
        wNote(S.age,"👁️",n.name+" beat you to the promotion you both wanted. Rivalry with a smile. (−8 performance)","bad",true,silent);
        npcAgentLearn(n,"beat you to a promotion at work.");
      }
    }else if(kind==="wealth"){
      var gain=Math.round(800+rnd()*2400); n.money+=gain;
      if(rnd()<0.5)wNews(S.age,"💰",n.name+"'s savings keep growing.");
      else wNote(S.age,"💰",n.name+" hits a savings milestone — discipline you can see.","",false,silent);
    }else if(kind==="family"){
      if(n.age>=22&&n.age<=42&&rnd()<0.5){
        n.note="Married.";
        wNote(S.age,"💒",n.name+" got married — building the family they wanted.","",false,silent);
        try{
          var others=S.world.npcs.filter(function(x){return x.alive&&x!==n;});
          if(others.length)npcBondAdd(n,others[Math.floor(rnd()*others.length)],12);
        }catch(e){}
      }else{ wNote(S.age,"👶",n.name+" is all-in on family — Sunday dinners, loud and warm.","",false,silent); }
    }else if(kind==="love"){
      if(n.role==="partner"){
        var rp=S.relationships&&S.relationships.partner;
        if(rp&&rp.name!==n.name){
          n.rel=clamp100(n.rel-6); wPushRel(n);
          npcAgentLearn(n,"found out you chose someone else.");
          wNote(S.age,"💔",n.name+" wanted forever; you chose someone else. It lands hard.","bad",true,silent);
          if(n.rel<12)n.role="rival";
        }else{ n.rel=clamp100(n.rel+4); wPushRel(n); wNote(S.age,"💘",n.name+" talks about forever — and means it.","",false,silent); }
      }else{ n.rel=clamp100(n.rel+3); wPushRel(n); wNote(S.age,"💘",n.name+" is falling for someone — glowing, distracted, happy.","",false,silent); }
    }else if(kind==="fame"){
      if(S.fame>20){ var fz=Math.round(500+rnd()*2000); S.followers+=fz; wNote(S.age,"⭐",n.name+" tells everyone about you. +"+fz.toLocaleString()+" followers.","event",false,silent); }
      else wNote(S.age,"⭐",n.name+" chases a little spotlight of their own.","",false,silent);
    }else if(kind==="rivalry"){
      if((a.trust||0)>=25){ a.goal=npcPickGoal(n); if(a.goal.kind==="rivalry")a.goal={kind:"peace",detail:"a quiet life",prog:0}; wNote(S.age,"🤝",n.name+" lets the old rivalry cool. Time does its work.","good",false,silent); return; }
      if(rnd()<0.6){ S.prestige=Math.max(0,S.prestige-4); wNote(S.age,"👁️",n.name+" undercuts you socially to get ahead. (−4 prestige)","bad",false,silent); }
      else{ S.money=Math.max(0,S.money-150); wNote(S.age,"👁️",n.name+" costs you $150 elbowing past you.","bad",false,silent); }
      a.grudge=Math.min(60,(a.grudge||0)+2);
    }else{
      n.rel=clamp100(n.rel+2); wPushRel(n);
      if(rnd()<0.3)wNews(S.age,"🌿",n.name+" is content — garden, tea, quiet evenings.");
    }
  }catch(e){}
  try{
    var keepRivalry=(n.role==="rival"&&S&&S.fate&&S.fate.nemesis&&!S.fate.nemesisDone);
    a.goal=npcPickGoal(n);
    if(keepRivalry&&a.goal.kind!=="rivalry")a.goal={kind:"rivalry",detail:"outshine "+((S&&S.firstName)||"you"),prog:0};
  }catch(e){ a.goal=npcPickGoal(n); }
}
function npcTickAgent(n,silent){
  if(!n)return;
  var a=npcAgentEnsure(n); if(!a)return;
  try{
    if(!n.alive){
      if(!a.mourned){
        a.mourned=true;
        try{
          var ids=n.bonds?Object.keys(n.bonds):[];
          for(var mi=0;mi<ids.length;mi++){
            var o=null;
            for(var k=0;k<S.world.npcs.length;k++) if(S.world.npcs[k].id===ids[mi]){ o=S.world.npcs[k]; break; }
            if(o&&o.alive){
              o.rel=clamp100((o.rel||50)-6);
              var line="Mourns "+n.name+".";
              if(typeof npcMem==="function")npcMem(o,line);
              else{ o.memLog=o.memLog||[]; o.memLog.push("Age "+S.age+": "+line); if(o.memLog.length>20)o.memLog.splice(0,o.memLog.length-20); }
              wPushRel(o);
            }
          }
        }catch(e){}
      }
      return;
    }
    if(!a.goal)a.goal=npcPickGoal(n);
    a.goal.prog=Math.min(100,(a.goal.prog||0)+4+rnd()*9+(a.drive>60?3:0));
    try{
      var changed=false;
      for(var bid in n.bonds){ n.bonds[bid]=Math.round(n.bonds[bid]*0.97); if(Math.abs(n.bonds[bid])<2){ delete n.bonds[bid]; changed=true; } }
      var keys=Object.keys(n.bonds);
      if(keys.length>14){
        keys.sort(function(x,y){ return Math.abs(n.bonds[x])-Math.abs(n.bonds[y]); });
        for(var pi=0;pi<keys.length-14;pi++)delete n.bonds[keys[pi]];
      }
      if(rnd()<0.08){
        var cand=S.world.npcs.filter(function(x){return x.alive&&x!==n;});
        if(cand.length){ npcBondAdd(n,cand[Math.floor(rnd()*cand.length)],4+Math.floor(rnd()*5)); }
      }
    }catch(e){}
    var ts=npcTrustScore(n);
    if(a.grudge>=30&&rnd()<0.06){
      n.rel=clamp100(n.rel-4); wPushRel(n);
      npcAgentLearn(n,"nursed a grudge and talked about you behind your back.");
      npcGossip(n.name,-3,n.name+" badmouths you");
      wNews(S.age,"🗯️",n.name+" is telling stories about you. Mud sticks.");
      if(n.rel<12&&n.role!=="rival"){ n.role="rival"; wNote(S.age,"👁️",n.name+" now moves against you openly. Old kindnesses are spent.","bad",true,silent); }
      return;
    }
    if(a.trust>=20&&rnd()<0.05){
      var kind2=rnd();
      if(kind2<0.4&&n.money>600){ var gift=Math.min(400,Math.round(n.money*0.1)); n.money-=gift; S.money+=gift; S.totalEarned+=gift; wNote(S.age,"💛",n.name+" slips you "+fmt$(gift)+" — 'you'd do the same.'","good",false,silent); }
      else if(kind2<0.7){ S.performance=clamp100((S.performance||50)+4); wNote(S.age,"💡",n.name+" puts in a good word for you at work. (+4 performance)","good",false,silent); }
      else{ gainStat("happiness",3); wNote(S.age,"💛",n.name+" checks in — exactly when you needed it. (+3 happiness)","good",false,silent); }
      npcAgentLearn(n,"helped you without being asked.");
      return;
    }
    if(a.goal.prog>=100){ npcGoalComplete(n,silent); return; }
    void ts;
  }catch(e){}
}
function wJobFor(age){
  var pool=[];
  for(var i=0;i<window.GDATA.jobs.length;i++){ var j=window.GDATA.jobs[i];
    if(j.id==="unemployed")continue;
    if((j.minAge||0)<=age&&age<=(j.maxAge||200)&&(!j.req||!j.req.edu||j.req.edu==="none"))pool.push(j); }
  if(!pool.length)return "unemployed";
  return pick(pool).id;
}
function wNews(age,icon,text){
  if(!S.world.news)S.world.news=[];
  S.world.news.push({age:age,icon:icon,text:text});
  if(S.world.news.length>60)S.world.news.splice(0,S.world.news.length-60);
}
function wNote(age,icon,text,type,major,silent){
  if(silent&&!major){ wNews(age,icon,text); return; }
  if(wNoteBudget<=0&&!major){ wNews(age,icon,text); return; }
  if(!major)wNoteBudget--;
  pushLog(age,icon,text,type||"");
  wNews(age,icon,text);
  try { if (window.LL && LL.bus && major) LL.bus.emit({ type: "log.appended", payload: { icon: icon, text: String(text).slice(0, 140) } }); } catch (e) {}
}
/* ---- yearly world tick, split: markets first (player money uses returns), life after ---- */
function wTickWorld(silent){
  if(!S.world)wInit();
  var w=S.world; w.ticks++; w.regimeChanged=false;
  var r=rnd(), R=w.regime;
  if(R==="boom")w.regime=r<0.12?"stable":"boom";
  else if(R==="stable")w.regime=r<0.07?"boom":(r<0.14?"recession":"stable");
  else if(R==="recession")w.regime=r<0.10?"crisis":(r<0.25?"stable":"recession");
  else w.regime=r<0.25?"recession":(r<0.35?"stable":"crisis");
  if(w.regime!==R)w.regimeChanged=true;
  var base=w.regime==="boom"?3.5:(w.regime==="stable"?2.0:(w.regime==="recession"?-1.5:-4.0));
  w.gdp=wClamp(base+(rnd()*2-1),-8,8);
  w.inflation=wClamp(0.7*w.inflation+0.3*(w.regime==="boom"?3.5:(w.regime==="crisis"?0.5:2.2))+(rnd()*1.2-0.6),-1,12);
  w.rates=wClamp(0.8*w.rates+0.2*(w.inflation+1.2)+(rnd()*0.6-0.3),0,15);
  w.mood=clamp100(w.mood+(55-w.mood)*0.08+w.gdp*1.6-Math.max(0,w.inflation-3)*1.2+(rnd()*6-3)+(w.regimeChanged?(w.regime==="boom"?6:(w.regime==="crisis"?-10:(w.regime==="recession"?-5:3))):0));
  var idxR=w.gdp*0.012+(w.mood-55)*0.001+((rnd()+rnd()+rnd()-1.5)/1.5)*0.12
    +(w.regime==="boom"?0.04:(w.regime==="crisis"?-0.10:(w.regime==="recession"?-0.04:0)))+w.shock;
  w.shock*=0.3;
  w.idx=Math.max(100,w.idx*(1+idxR));
  w.idxHist.push(w.idx); if(w.idxHist.length>80)w.idxHist.shift();
  var i, t, shockR=w.regime==="crisis"?-(0.05+rnd()*0.12):(w.regime==="recession"?-(rnd()*0.05):(w.regime==="boom"?(rnd()*0.07):0));
  /* ECS market system: tickers run as packed entities through the compute
   * kernel (WebGPU when available, typed-array CPU otherwise). Same math as
   * the old scalar loop — drift/beta/idxR/noise/shockR — just DOD-scheduled. */
  wEnsureMarketECS();
  if (wMarketSys) LL.ecs.run("market", { idxR: idxR, shockR: shockR });
  else { /* ECS/compute unavailable (pre-boot probe): original scalar loop, same math. */
    for (i = 0; i < w.tickers.length; i++) { t = w.tickers[i];
      var noise0 = ((rnd() + rnd() + rnd() - 1.5) / 1.5) * t.vol;
      var er0 = t.drift * 0.4 + t.beta * idxR + noise0 * 0.6 + shockR;
      if (rnd() < 0.05) { var big0 = 0.3 + rnd() * 0.5, up0 = rnd() < 0.55;
        er0 += up0 ? big0 : -big0;
        t.flash = { pct: Math.round((up0 ? big0 : -big0) * 100), why: up0 ? pick(["breakthrough", "viral hit", "takeover rumor", "record earnings"]) : pick(["fraud probe", "product recall", "lawsuit", "hack"]) };
      } else t.flash = null;
      t.price = Math.max(1, t.price * (1 + er0)); t.chg = er0;
      t.hist.push(t.price); if (t.hist.length > 80) t.hist.shift();
      var sh0 = S.assets.shares && S.assets.shares[t.sym];
      if (sh0 && sh0 > 0.0001 && t.div > 0) { var dv0 = sh0 * t.price * t.div; if (dv0 >= 1) { S.money += Math.round(dv0); S.totalEarned += Math.round(dv0); } }
    }
  }
  var hR=w.gdp*0.008-Math.max(0,w.rates-4)*0.008+((rnd()+rnd()-1))*0.015+(w.regime==="boom"?0.02:(w.regime==="crisis"?-0.05:0));
  w.housing=Math.max(20,w.housing*(1+hR));
  w.housingHist.push(w.housing); if(w.housingHist.length>80)w.housingHist.shift();
  var k=wTicker("KOIN");
  w.last={idxR:idxR,koinR:k?k.chg:0,houseR:hR};
  /* PCG leans the macro: novelty/adventure years run hotter, solemn/rest
   * years cool the mood. Small nudges — the regime dice still rule. */
  try {
    if (window.LL && LL.pcg && S && S.alive) {
      var __mod = LL.pcg.modifiersFor(S.year);
      if (__mod) {
        if (__mod.gdpNudge) w.gdp = wClamp(w.gdp + __mod.gdpNudge, -8, 8);
        if (__mod.moodDelta) w.mood = clamp100(w.mood + __mod.moodDelta);
      }
    }
  } catch (e) {}
  try { if (window.LL && LL.bus) LL.bus.emit({ type: "world.ticked", payload: { regime: w.regime, idx: Math.round(w.idx), ticks: w.ticks } }); } catch (e) {}
}
function wIdxR(){ return (S.world&&S.world.last)?S.world.last.idxR:0; }
function wKoinR(){ return (S.world&&S.world.last)?S.world.last.koinR:0; }
function wHouseR(){ return (S.world&&S.world.last)?S.world.last.houseR:0.03; }
function wSharesValue(){ if(!S.assets.shares)return 0; var v=0; for(var s in S.assets.shares){ var p=wPrice(s); if(p)v+=S.assets.shares[s]*p; } return Math.round(v); }
function wIdxChg(){ var h=S.world.idxHist; if(!h||h.length<2)return 0; var a=h[h.length-2]; return (S.world.idx-a)/a; }
function wTickLife(silent){
  wNoteBudget=2;
  try{ wEnsureAgents(); }catch(e){}
  wAddDiv("culture",S.fame/200); wAddDiv("politics",S.prestige/1500);
  var nwA=0; try{ nwA=netWorth(); }catch(e){} wAddDiv("economy",Math.min(1,nwA/2000000));
  if(!S.world.divHist)S.world.divHist={};
  S.world.divHist[S.year]=Object.assign({},S.world.div);
  wSyncNPCs();
  wTickNPCs(silent);
  wSpawnNPC(silent);
  wWorldEvents(silent);
  if(!silent)wMaybeAI();
}
/* ---- NPC sync: relationships arrays are truth, world.npcs enriches ---- */
function wSyncNPCs(){
  var R=S.relationships, i;
  for(i=0;i<R.friends.length;i++){ var f=R.friends[i], n=wFindNPC(f.name);
    if(!n){ n=wAddNPC({name:f.name,age:S.age+Math.floor(rnd()*5-2),role:"friend",rel:f.rel}); }
    else { n.rel=f.rel; if(n.role==="ex")n.role="friend"; } }
  if(R.partner){ var pn=wFindNPC(R.partner.name);
    if(!pn){ pn=wAddNPC({name:R.partner.name,age:R.partner.age||S.age,role:"partner",rel:R.partner.rel}); }
    else { pn.rel=R.partner.rel; pn.role="partner"; }
    if(pn&&(pn.jobId==="unemployed")&&S.age>=20&&rnd()<0.3)pn.jobId=wJobFor(S.age);
  }
  for(i=0;i<R.children.length;i++){ var c=R.children[i], cn=wFindNPC(c.name);
    if(!cn){ cn=wAddNPC({name:c.name,age:c.age,role:"child",rel:c.rel||80,sex:c.sex||pick(["male","female"]),genes:c.genes,appearance:c.appearance||null}); }
    else { cn.age=c.age; cn.rel=c.rel; if(c.sex)cn.sex=c.sex; if(c.genes)cn.genes=c.genes; if(c.appearance)cn.appearance=c.appearance; } }
  for(i=0;i<(R.siblings||[]).length;i++){ var sb=R.siblings[i], sn=wFindNPC(sb.name);
    if(!sn){ sn=wAddNPC({name:sb.name,age:sb.age,role:"sibling",rel:sb.rel,sex:sb.sex||pick(["male","female"]),genes:sb.genes}); }
    else { sn.age=sb.age; sn.rel=sb.rel; if(sb.genes)sn.genes=sb.genes; } }
  for(i=0;i<(R.grandparents||[]).length;i++){ var gp=R.grandparents[i], gn=gp.npcId?npcById(gp.npcId):wFindNPC(gp.name);
    if(!gn&&gp.alive){ gn=wAddNPC({name:gp.name,age:gp.age,sex:gp.sex,role:"grandparent",rel:gp.rel}); if(gn)gp.npcId=gn.id; }
    else if(gn){ gn.age=gp.age; gn.rel=gp.rel; if(!gp.alive)gn.alive=false; } }
  /* GENETICS PATCH: parents sync by their REAL names (records are truth for
   * names/traits/genes; momAge/dadAge stay the numeric truth for ages). */
  try{
    if(R.mom&&R.mom.name){ var mn=wFindNPC(R.mom.name);
      if(mn){ mn.age=R.momAge; mn.rel=R.parentRel; if(R.momAge<-100)mn.alive=false;
        if(!mn.genes&&R.mom.genes)mn.genes=R.mom.genes; } }
    if(R.dad&&R.dad.name){ var dn=wFindNPC(R.dad.name);
      if(dn){ dn.age=R.dadAge; dn.rel=R.parentRel; if(R.dadAge<-100)dn.alive=false;
        if(!dn.genes&&R.dad.genes)dn.genes=R.dad.genes; } }
  }catch(e){}
}
function wPushRel(n){
  var R=S.relationships, i;
  for(i=0;i<R.friends.length;i++) if(R.friends[i].name===n.name)R.friends[i].rel=n.rel;
  if(R.partner&&R.partner.name===n.name)R.partner.rel=n.rel;
  for(i=0;i<R.children.length;i++) if(R.children[i].name===n.name)R.children[i].rel=n.rel;
}
function wTickNPCs(silent){
  var i, n, notable=0;
  /* DOD fast path: age + income run as packed ECS systems, social drift as
   * one compute batch. Falls back to scalar when ECS/compute are missing. */
  var ecsRan = false;
  try {
    if (wSyncNpcECS() && wNpcSys && window.LL && LL.ecs) {
      LL.ecs.run("npcAge");
      LL.ecs.run("npcEcon");
      wBatchSocialLerp();
      ecsRan = true;
    }
  } catch (e) { ecsRan = false; }
  for(i=0;i<S.world.npcs.length;i++){ n=S.world.npcs[i];
    if(!n.alive)continue;
    if (!ecsRan) {
      n.age++;
      var job0=n.jobId&&n.jobId!=="unemployed"?jobById(n.jobId):null;
      if(job0&&n.age>=18&&n.age<=70){ var inc0=Math.round(job0.pay*0.04); n.money+=inc0; }
      if(n.role==="friend"||n.role==="neighbor"||n.role==="colleague"){
        var drift0=(S.stats.social>60?0.4:0)+(n.role==="colleague"&&S.jobId!=="unemployed"?0.6:0);
        n.rel=clamp100(n.rel+(45-n.rel)*0.03+drift0);
        for(var fi0=0;fi0<S.relationships.friends.length;fi0++) if(S.relationships.friends[fi0].name===n.name)S.relationships.friends[fi0].rel=Math.round(n.rel);
      }
    }
    var job=n.jobId&&n.jobId!=="unemployed"?jobById(n.jobId):null;
    if(n.age>=18&&n.age<=65&&(!job||job.id==="unemployed")&&rnd()<0.08&&(n.role==="friend"||n.role==="colleague"||n.role==="partner"||n.role==="neighbor"||n.role==="sibling"||n.role==="parent"||n.role==="grandparent")){
      n.jobId=wJobFor(n.age);
      if(notable<2){ wNote(S.age,"💼",n.name+" landed a job ("+jobNameById(n.jobId)+").","",false,silent); notable++; }
      else { n.note="New job: "+jobNameById(n.jobId); wNews(S.age,"💼",n.name+" landed a job."); }
    }
    else if(rnd()<0.055){
      var evR=rnd(), msg=null, icon="👥";
      if((n.role==="sibling"||n.role==="parent"||n.role==="grandparent")&&evR<0.5){
        if(n.age>=22&&n.age<=45&&evR<0.18){ msg=n.name+" got married! You danced badly and loved it."; icon="💒"; n.note="Married."; }
        else if(n.role==="sibling"&&n.age>=22&&n.age<=42&&evR<0.30){ msg=n.name+" had a baby — you're an aunt/uncle now!"; icon="👶"; S.prestige+=5; }
        else if(evR<0.42&&n.money>0){ var fbonus=Math.round(400+rnd()*2500); n.money+=fbonus; msg=n.name+" got promoted — the family group chat erupts."; icon="📈"; }
        else if(n.age>55){ msg=n.name+" had a health scare. You visit with soup."; icon="🤒"; n.money=Math.max(0,n.money-900); }
      }
      else if(n.age>=22&&n.age<=42&&evR<0.25&&(n.role==="friend"||n.role==="partner")){ msg=n.name+" had a baby! Parenthood begins."; icon="👶"; }
      else if(n.age>=22&&evR<0.42&&(n.role==="friend"||n.role==="neighbor"||n.role==="colleague")){ msg=n.name+" got married — you weren't invited to the seating-chart meeting."; icon="💒"; n.note="Married."; }
      else if(evR<0.55&&n.money>0){ var bonus=Math.round(400+rnd()*2500); n.money+=bonus; msg=n.name+" got promoted — career is climbing."; icon="📈"; }
      else if(evR<0.68){ var city=pick(["Portland","Austin","Lisbon","Osaka","Cairo","Lagos","Berlin","Toronto"]); n.rel=clamp100(n.rel-22); n.note="Moved to "+city+"."; msg=n.name+" moved to "+city+". Distance cools things."; icon="🧳"; wPushRel(n); }
      else if(evR<0.80&&n.age>45){ n.money=Math.max(0,n.money-900); msg=n.name+" had a health scare. You send soup."; icon="🤒"; }
      else if(evR<0.90){ msg=n.name+" started a wild rumor about you. How rude."; icon="🗯️"; n.rel=clamp100(n.rel-12); if(n.rel<12)n.role="rival"; wPushRel(n); }
      else { var dr=n.age>80?0.35:(n.age>65?0.12:(n.age>50?0.04:0.008));
        if(rnd()<dr){ n.alive=false; msg="🕊️ "+n.name+" passed away at "+n.age+". You keep one photo."; icon="🕊️"; } }
      if(msg){
        if(icon==="🕊️"){ wNote(S.age,icon,msg,"bad",true,silent); notable=99; }
        else if(notable<2){ wNote(S.age,icon,msg,"",false,silent); notable++; }
        else { n.note=msg; wNews(S.age,icon,msg); }
      }
    }
    var deathR=n.age>85?0.10:(n.age>70?0.035:(n.age>55?0.008:0.0005));
    if(n.alive&&rnd()<deathR&&(n.role==="friend"||n.role==="neighbor"||n.role==="mentor"||n.role==="colleague")){
      n.alive=false;
      wNote(S.age,"🕊️",n.name+" passed away at "+n.age+". Gone, not forgotten.","bad",true,silent);
    }
    /* persistent agents tick: goals pursued, memories acted on, bonds kept —
     * runs for the dead too (one-time grief propagation), and on silent/jail
     * years, so off-screen lives continue without the player. */
    try{ npcTickAgent(n,silent); }catch(e){}
  }
  var p=S.relationships.partner, pn=p?wFindNPC(p.name):null;
  if(p&&pn&&pn.alive&&p.married&&S.age>=20&&S.age<=70){
    var pj=pn.jobId&&pn.jobId!=="unemployed"?jobById(pn.jobId):null;
    if(pj){ var cut=Math.round(pj.pay*0.06); S.money+=cut; S.totalEarned+=cut; }
  }
  if(S.fate&&S.fate.nemesis){
    var rv=null, j;
    for(j=0;j<S.world.npcs.length;j++) if(S.world.npcs[j].alive&&S.world.npcs[j].role==="rival"){ rv=S.world.npcs[j]; break; }
    if(rv&&rnd()<0.10){
      if(rnd()<0.5){ S.prestige=Math.max(0,S.prestige-10); S.stats.happiness=clamp100(S.stats.happiness-4);
        wNote(S.age,"👁️",rv.name+" poisons a deal behind your back. −10 prestige.","bad",true,silent); }
      else { S.money=Math.max(0,S.money-500);
        wNote(S.age,"👁️",rv.name+" undercuts you publicly. −$500 to fix it.","bad",false,silent); }
    }
  }
}
function jobNameById(id){ var j=jobById(id); return j?j.name:" drifting"; }
function wSpawnNPC(silent){
  var alive=S.world.npcs.filter(function(n){return n.alive;}).length;
  if(alive>=16)return;
  var r=rnd();
  if(S.flags.student&&r<0.10){
    var rm=rName(); wAddNPC({name:rm,age:S.age,role:"friend",rel:55}); S.relationships.friends.push({name:rm,rel:55});
    wNote(S.age,"🎒","You click with roommate "+rm+". Late-night noodles.","good",false,silent);
  } else if(S.jobId&&S.jobId!=="unemployed"&&r<0.10){
    var co=rName(); wAddNPC({name:co,age:S.age+Math.floor(rnd()*10-3),role:"colleague",rel:50,jobId:S.jobId});
    wNote(S.age,"💼","New colleague "+co+" — desk lunches and gossip.","",false,silent);
  } else if(S.assets.houseId!=="none"&&r<0.07){
    var nb=rName(); wAddNPC({name:nb,age:S.age+Math.floor(rnd()*14-5),role:"neighbor",rel:45});
    wNote(S.age,"🏡","Neighbor "+nb+" brings pie. Suspiciously good pie.","",false,silent);
  } else if(S.fame>30&&r<0.06){
    var fan=rName(); wAddNPC({name:fan,age:16+Math.floor(rnd()*20),role:"fan",rel:80});
    wNote(S.age,"⭐","Superfan "+fan+" tattoos your name. Somewhere. Probably.","event",false,silent);
  } else if(rnd()<0.05){
    var fr=rName(); wAddNPC({name:fr,age:S.age,role:"friend",rel:52}); S.relationships.friends.push({name:fr,rel:52});
    if(!silent){ pushLog(S.age,"👋","You meet "+fr+" — instant vibe.","good"); }
    wNews(S.age,"👋","Met "+fr+".");
  }
}
function wWorldEvents(silent){
  var w=S.world, nEv=1+(rnd()<0.35?1:0)+(w.regimeChanged?1:0), i;
  for(i=0;i<nEv;i++)wOneEvent(silent);
}
function wOneEvent(silent){
  var w=S.world, R=w.regime, r=rnd(), icon="🌍", msg="", major=false;
  function boomS(){ w.shock+=0.03+rnd()*0.05; }
  function bustS(){ w.shock-=(0.04+rnd()*0.07); }
  if(R==="crisis"&&r<0.30){ icon="📉"; msg=pick(["Markets in freefall — panic selling everywhere.","Banks freeze lending. Everyone holds their breath.","A big fund collapses. Contagion fears spike."]); bustS(); w.mood=clamp100(w.mood-4); major=true; wAddDiv("economy",2); wAddDiv("war",1); }
  else if(R==="boom"&&r<0.30){ icon="📈"; msg=pick(["Record rally! The Grand Index screams higher.","IPO fever — everyone is suddenly an investor.","Bonuses rain. Champagne shortages reported."]); boomS(); w.mood=clamp100(w.mood+3); major=true; wAddDiv("economy",2); }
  else if(r<0.14){ var t=pick(w.tickers.filter(function(x){return x.flash;})); 
    if(t){ icon=t.icon; msg=t.name+" "+(t.flash.pct>0?("rockets +"+t.flash.pct+"% on "+t.flash.why+"!"):("crashes "+t.flash.pct+"% — "+t.flash.why+"!")); major=true; }
    else { icon="🔬"; msg=pick(["Fusion breakthrough! Cheap energy within a decade, scientists swear.","AI assistants get scary good. Productivity jumps.","A miracle drug trial succeeds. Hope stocks rally."]); w.mood=clamp100(w.mood+4); boomS(); wAddDiv("tech",3); wAddDiv("science",2); } }
  else if(r<0.26){ icon="🏛️"; var win=rnd()<0.5;
    msg=win?"Elections! Reformers win — markets cheer, prestige matters.":"Elections! Populists win — tariffs, drama, memes.";
    S.prestige=Math.max(0,S.prestige+(win?8:-5)); wAddDiv("politics",2); w.mood=clamp100(w.mood+(win?3:-3)); if(!win)bustS(); }
  else if(r<0.38){ icon="🎪"; msg=pick(["City festival! Music, food, questionable decisions.","A carnival rolls through town. Joy is mandatory.","Street parade — you dance badly. Nobody minds."]);
    gainStat("happiness",4); S.money=Math.max(0,S.money-100); w.mood=clamp100(w.mood+2); wAddDiv("culture",1); }
  else if(r<0.50){ icon="⛈️"; msg=pick(["Brutal storm floods the district. Roofs weep.","Heatwave! The city melts into siestas.","Blizzard locks everything down for days."]);
    S.money=Math.max(0,S.money-300); S.stats.health=clamp100(S.stats.health-3); w.mood=clamp100(w.mood-2); }
  else if(r<0.60){ icon="🦠"; msg=pick(["A nasty flu goes around. Soup sales triple.","Something is going around — wash your hands, hero."]);
    S.stats.health=clamp100(S.stats.health-5); w.mood=clamp100(w.mood-2); wAddDiv("science",2); }
  else if(r<0.70){ icon="📰"; var f=S.fame>30;
    msg=f?pick(["Tabloids invent your secret wedding. Sales! Deny nothing.","Viral clip of you blinking wrong. 2M views. Fame is weird."]):pick(["Local hero saves a cat. Front page. We all needed that.","A quiet week. Birds overachieve."]);
    if(f){ S.followers+=Math.round(2000+rnd()*8000); wAddDiv("culture",1); } w.mood=clamp100(w.mood+1); }
  else if(r<0.80){ icon="🏠"; var hb=w.regime==="boom"||rnd()<0.5;
    msg=hb?"Housing frenzy — bidding wars, tears, over-asking.":"Housing slump — prices dip, renters smirk.";
    w.housing=Math.max(20,w.housing*(hb?1.04:0.96)); wAddDiv("economy",1); }
  else if(r<0.88){ icon="🪙"; msg=pick(["Koin mania! Your barista explains blockchain. Again.","Crypto crashes 30% overnight. Survivors post diamonds."]);
    var kk=wTicker("KOIN"); if(kk){ var d=rnd()<0.5?0.35:-0.3; kk.price=Math.max(1,kk.price*(1+d)); kk.chg+=d; kk.hist.push(kk.price); } wAddDiv("economy",1); wAddDiv("tech",1); }
  else { icon="🕊️"; msg=pick(["A tense border standoff fizzles into talks. Phew.","Peace summit! Handshakes, doves, awkward group photo."]); w.mood=clamp100(w.mood+3); boomS(); wAddDiv("politics",1); wAddDiv("war",1); }
  wNote(S.age,icon,msg,major?"event":"",major,silent);
}


LL.files.push("world"); /* end-of-file registration: counts as loaded only after this file fully ran */