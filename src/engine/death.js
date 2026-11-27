/* LIFE & LEGACY — engine/death.js
 * SECTION 8 death/legacy/heirs.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 8 — death + legacy + ribbons + obituary + heirs ============ */
function die(cause){ try{ sfx("death"); }catch(e){} requestDeath(cause); }
function legacyScore(){
  var moneyScore=Math.max(0,Math.min(40,netWorth()/25000));
  var ageScore=Math.min(25,S.age*0.3);
  var hapAvg=S.hapHist.length?S.hapHist.reduce(function(a,b){return a+b;},0)/S.hapHist.length:50;
  var famScore=Math.min(20,S.relationships.children.length*6+(S.relationships.partner?5:0)+S.relationships.friends.length+(S.relationships.grandkids?S.relationships.grandkids.length*2:0));
  var kScore=S.stats.karma*0.1+(S.flags.memoir?3:0)+(S.education.highest==="grad"?4:(S.education.highest==="college"?2:0));
  return Math.round(moneyScore+ageScore+hapAvg*0.2+famScore+kScore+S.prestige/60+S.fame*0.12+S.renown*4);
}
function computeRibbon(){
  var nw=netWorth();
  if(S.age>=92)return {name:"Methuselah",icon:"🎂",desc:"Outlived everyone. The candles cost more than the cake."};
  if(S.fame>=80&&S.crime>=3)return {name:"Scandalous",icon:"📰",desc:"Famous and infamous. The tabloids write your eulogy."};
  if(S.fame>=80||S.followers>=500000)return {name:"Superstar",icon:"⭐",desc:"Adored by multitudes. Autographs outlive you."};
  if(nw>=2000000)return {name:"Magnate",icon:"💰",desc:"An empire of zeros. The will needs its own lawyer."};
  if(nw>=500000)return {name:"Rich",icon:"💎",desc:"Comfort, secured for generations."};
  if(S.relationships.children.length>=4)return {name:"Fertile",icon:"🍼",desc:"A dynasty of "+S.relationships.children.length+" children. The table never ends."};
  if(S.stats.karma>=85)return {name:"Saintly",icon:"😇",desc:"Gave more than took. Bells ring somewhere."};
  if(S.crime>=5||S.stats.karma<=15)return {name:"Villain",icon:"🌙",desc:"Feared, wanted, unforgettable."};
  if(S.education.highest==="grad"&&S.stats.smarts>=85)return {name:"Scholar",icon:"🎓",desc:"A mind like a cathedral."};
  if(S.prestige>=400)return {name:"Legend",icon:"👑",desc:"House "+S.lastName+" echoes through history."};
  if(S.age<25)return {name:"Unlucky",icon:"🌧️",desc:"Gone too soon. The what-ifs hurt most."};
  if(S.relationships.partner&&S.relationships.partner.married&&S.relationships.children.length>=2)return {name:"Family Pillar",icon:"🏡",desc:"The heart of a full, warm home."};
  return {name:"Everyperson",icon:"🌿",desc:"An ordinary life, extraordinarily lived."};
}
function heirCandidates(){
  return S.relationships.children.map(function(c,i){return {i:i,name:c.name,age:c.age};}).filter(function(c){return c.age>=18;});
}
/* shareable legend: plain-text life summary for clipboard */
function legacyText(){
  var rib=computeRibbon(), peakNW=netWorth();
  try{ for(var i=0;i<S.netHist.length;i++) if(S.netHist[i]>peakNW)peakNW=S.netHist[i]; }catch(e){}
  var lovers=(S.sex&&S.sex.lovers)?S.sex.lovers.length:0, parts=(S.sex&&S.sex.partners)||0, corr=(S.sex&&S.sex.corruption)||0;
  var miles=[]; try{ miles=S.log.filter(function(e){return e.type==="milestone";}).slice(-3).map(function(m){return m.text;}); }catch(e){}
  return "⚖️ "+S.firstName+" "+S.lastName+" ("+S.birthYear+"–"+S.year+", "+S.age+") — "+S.deathCause
    +"\n⭐ Game legacy "+legacyScore()+" · "+rib.icon+" "+rib.name+" — "+rib.desc
    +"\n💰 Peak "+fmt$(peakNW)+" · earned "+fmt$(S.totalEarned)+" · "+jobName()
    +"\n❤️ "+(S.relationships.partner?S.relationships.partner.name+" 💍, ":"")+S.relationships.children.length+" kids, "+((S.relationships.grandkids||[]).length)+" grandkids"
    +"\n🔥 "+lovers+" lovers, "+parts+" partners, corruption "+corr+" · crimes "+S.crime+" · karma "+S.stats.karma+" · prestige "+S.prestige+" · fame "+S.fame
    +(miles.length?"\n📜 Remembered for: "+miles.join(" / ").slice(0,300):"");
}
function copyLegacySummary(){
  var t=legacyText();
  function done(ok){ toast(ok?"📋 Legend copied — paste it anywhere.":"📋 Copy blocked — screenshot the legend instead."); }
  function fallback(){ try{ var ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); var ok=false; try{ ok=document.execCommand("copy"); }catch(e){} document.body.removeChild(ta); done(!!ok); }catch(e){ done(false); } }
  try{
    if(window.navigator&&navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){done(true);},function(){fallback();});
    else fallback();
  }catch(e){ fallback(); }
}
function showDeath(){
  $("gameScreen").classList.add("hidden"); $("startScreen").classList.add("hidden");
  $("deathScreen").classList.remove("hidden");
  var emo=S.age>=80?"👴":(S.age>=50?"🧓":(S.age>=25?"🧑":"👼"));
  var rib=computeRibbon();
  $("deathHero").innerHTML='<div class="big">'+emo+'🪦</div><h2>'+esc(S.firstName+" "+S.lastName)+'</h2>'
    +'<p class="sub">'+S.birthYear+' – '+S.year+' · died, '+S.age+' years old · '+esc(S.deathCause)+'</p>'
    +'<h1 style="font-size:44px;margin:.2em 0">⭐ '+legacyScore()+'</h1><p class="sub">game legacy score — a game number, not a judgment on a life</p>';
  $("ribbonEl").innerHTML='<span class="ribbon">'+rib.icon+' '+rib.name+'</span><p class="sub" style="text-align:center">'+esc(rib.desc)+'</p>';
  $("obitEl").textContent="🖋️ The biographer is writing your obituary…";
  var heirs=heirCandidates();
  var hb=$("heirBtn");
  if(heirs.length){ hb.style.display=""; var plan0=heirPlan(); hb.textContent="👑 Continue as "+plan0.c.name.split(" ")[0]+" (age "+plan0.c.age+") — inherits "+fmt$(plan0.inherit)+(plan0.uwCash>0?" + "+fmt$(plan0.uwCash)+" stash":"")+(plan0.company?" + the family company":""); }
  else hb.style.display="none";
  $("deathStats").innerHTML=
    '<div><small>Net worth</small><b>'+fmt$(netWorth())+'</b></div>'
    +'<div><small>Earned ever</small><b>'+fmt$(S.totalEarned)+'</b></div>'
    +'<div><small>Career</small><b>'+esc(jobName())+'</b></div>'
    +'<div><small>Education</small><b>'+esc(S.education.highest)+(S.major!=="General"?" · "+esc(S.major):"")+'</b></div>'
    +'<div><small>Partner</small><b>'+(S.relationships.partner?esc(S.relationships.partner.name)+(S.relationships.partner.married?" 💍":""):"—")+'</b></div>'
    +'<div><small>Children</small><b>'+S.relationships.children.length+'</b></div>'
    +'<div><small>Grandkids</small><b>'+(S.relationships.grandkids?S.relationships.grandkids.length:0)+'</b></div>'
    +'<div><small>Prestige · Renown</small><b>'+S.prestige+' · '+S.renown+'</b></div>'
    +'<div><small>Fame · Followers</small><b>'+S.fame+' · '+(S.followers>1000?Math.round(S.followers/1000)+"k":S.followers)+'</b></div>'
    +'<div><small>Karma</small><b>'+S.stats.karma+'</b></div>';
  /* lifetime ledger: peaks, appetites, body count — the screenshot block */
  var led=$("ledgerEl"), peakNW=netWorth();
  try{ for(var _pi=0;_pi<S.netHist.length;_pi++) if(S.netHist[_pi]>peakNW)peakNW=S.netHist[_pi]; }catch(e){}
  var lovers=(S.sex&&S.sex.lovers)?S.sex.lovers.length:0, parts=(S.sex&&S.sex.partners)||0, corr=(S.sex&&S.sex.corruption)||0;
  var miles=[]; try{ miles=S.log.filter(function(e){return e.type==="milestone";}).slice(-3); }catch(e){}
  var nemLine=S.fate.nemesisDone==="reconciled"?"🤝 feud buried":(S.fate.nemesisDone==="ruined"?"🔪 rival destroyed":(S.fate.nemesisDone==="dead"?"🕊️ feud died out":(S.fate.nemesis?"👁️ feud unfinished":"—")));
  if(led)led.innerHTML='<div><small>📜 Lifetime ledger</small><b>peaks & appetites</b></div>'
    +'<div><small>Peak net worth</small><b>'+fmt$(peakNW)+'</b></div>'
    +'<div><small>Lovers · Partners</small><b>'+lovers+' · '+parts+'</b></div>'
    +'<div><small>Corruption</small><b>'+corr+'/100 😈</b></div>'
    +'<div><small>Crimes · Record</small><b>'+S.crime+' · '+S.record+'</b></div>'
    +'<div><small>Nemesis</small><b>'+nemLine+'</b></div>'
    +(miles.length?'<div style="grid-column:1/-1"><small>Remembered for</small><b>'+esc(miles.map(function(m){return m.text;}).join(" · ").slice(0,220))+'</b></div>':"");
  window.scrollTo(0,0);
  writeObituary(rib);
}
async function writeObituary(rib){
  var el=$("obitEl");
  try{
    await aiText({instruction:aiPrompt("TASK: Write a 2-sentence obituary for this character (second person for sentence 1, epic for sentence 2), honoring ribbon \""+rib.name+"\" ("+rib.desc+"). Then an epitaph line starting with \"Epitaph:\". No preamble."),
      onChunk:function(d){ el.textContent=d.fullTextSoFar; }});
  }catch(e){ el.textContent='"'+S.firstName+" "+S.lastName+", "+rib.name.toLowerCase()+": "+rib.desc+'"'; }
}
function heirPlan(){
  var heirs=heirCandidates();
  if(!heirs.length)return null;
  var idx=(S.heirId!==null&&S.relationships.children[S.heirId]&&S.relationships.children[S.heirId].age>=18)?S.heirId:heirs[0].i;
  var c=S.relationships.children[idx];
  var gross=netWorth();
  var n=Math.max(1,S.relationships.children.length);
  var frac=(S.will?0.9:0.65)/n;
  var keepHouse=S.will?S.assets.houseId:"none";
  var keepHouseVal=S.will?(S.assets.houseVal||0):0;
  /* Estate + car pass to the heir only with a will (matches README); without one the car stays in the split estate. */
  var keepCar=S.will?(S.assets.carId||"none"):"none";
  var keepCarVal=S.will?(S.assets.carVal||0):0;
  var liquid=gross-(keepHouse!=="none"?keepHouseVal*0.8:0)-(keepCar!=="none"?keepCarVal*0.6:0);
  var inherit=Math.max(0,Math.round(liquid*frac));
  var coKeep=(S.company&&S.company.value>5000)?{name:S.company.name,sector:S.company.sector,value:Math.round(S.company.value*0.8),cash:Math.round((S.company.cash||0)*0.5),employees:Math.max(2,Math.round(S.company.employees*0.8)),morale:Math.max(20,S.company.morale-10),rep:S.company.rep,founded:S.company.founded,level:S.company.level}:null;
  var uwOld=S.underworld, uwCash=(uwOld&&uwOld.rank>=1&&!uwOld.retired)?Math.round(uwOld.stash*0.5):0;
  var uwKeep=(uwOld&&uwOld.rank>=2&&!uwOld.retired)?{rank:Math.max(0,uwOld.rank-2),rep:40,stash:0,territory:Math.round(uwOld.territory/2),crew:uwOld.crew.slice(0,3).map(function(m){return {name:m.name,skill:Math.max(1,m.skill-1)};}),prisonRep:0,retired:false}:null;
  var groomPts=(S.groomed&&S.groomed.idx===idx)?S.groomed.pts:0;
  return {idx:idx,c:c,gross:gross,n:n,frac:frac,inherit:inherit,
    keepHouse:keepHouse,keepHouseVal:keepHouseVal,keepCar:keepCar,keepCarVal:keepCarVal,
    newPrestige:Math.round(S.prestige*0.7)+(S.will?15:0)+groomPts*5,
    newFame:Math.min(25,Math.round((S.fame||0)*0.25)),
    renown:S.renown,oldPrestige:S.prestige,oldFame:(S.fame||0),old:S,
    company:coKeep,uwCash:uwCash,underworld:uwKeep,groomPts:groomPts};
}
async function writeLegacySummary(plan,passed,hadWill,fn,page,ln){
  var old=plan.old;
  var traitBit=passed.length?("You carry their "+passed.map(traitName).join(" and ")+"."):"You are your own person — none of their traits stuck to you.";
  var task="Write a 3-sentence 'inherited legacy' for the new protagonist "+fn+" "+ln+", age "+page+", who just inherited House "+ln+" after "+old.firstName+" "+old.lastName+" died at "+old.age+" of "+old.deathCause+". Hard facts to weave in: inheritance of "+fmt$(plan.inherit)+(plan.keepHouse!=="none"?" plus the family estate":"")+", house prestige "+plan.oldPrestige+" of which "+plan.newPrestige+" carries to you, "+(plan.n>1?("estate shared with "+(plan.n-1)+" sibling"+(plan.n>2?"s":"")):"sole heir")+", "+traitBit+" Second person (You ...), elegiac but forward-looking, no preamble, exactly 3 sentences.";
  try{
    var res=await aiText({instruction:aiPrompt(task)});
    var t=res&&res.text?String(res.text).trim():"";
    if(t)return t;
  }catch(e){}
  return "You are "+fn+" "+ln+", age "+page+", and House "+ln+" is yours now. Your parent "+old.firstName+", dead at "+old.age+" of "+old.deathCause+", left you "+fmt$(plan.inherit)+(plan.keepHouse!=="none"?" and the family estate":"")+" plus a name carrying "+plan.newPrestige+" prestige. "+traitBit+" The family looks to you now.";
}
/* GENETICS PATCH: the heir wears the bloodline — half the late parent's face,
 * half the other parent's, re-rolled axis by axis, never a copy. */
function heirAppearance(old,plan,c,gender){
  try{
    var cg=(c&&c.genes)||null, cap=(c&&c.appearance)||null;
    if(!cg||!cap){
      var otherG=null, otherAp=null;
      try{
        var pn=old.relationships&&old.relationships.partner?old.relationships.partner.name:null;
        otherG=carrierGenesFor(pn)||founderGenes("female");
        otherAp=carrierApFor(pn);
      }catch(e){ otherG=founderGenes("female"); }
      if(!cg)cg=inheritGenes(old.genes||founderGenes("male"),otherG,gender);
      if(!cap)cap=inheritAppearance(old.appearance||null,otherAp,cg,gender);
      try{ if(c){ c.genes=cg; c.appearance=cap; } }catch(e){}
    }
    return cap;
  }catch(e){ return genAppearance(gender,old.race,old.raceF,old.raceM); }
}
async function continueAsHeir(){
  var plan=heirPlan();
  if(!plan){ toast("No adult heir to continue as."); return; }
  var old=plan.old, c=plan.c, hadWill=old.will;
  var inhNem=!!(old.fate.nemesis&&rnd()<0.3);
  var cn=c.name.split(" "), fn=cn[0]||"Alex", ln=old.lastName, page=c.age;
  var prevTraits=old.traits.slice();
  var traits=rollTraits(), passed=[];
  prevTraits.forEach(function(t){ if(traits.indexOf(t)<0&&traits.length<4&&rnd()<0.45){ traits.push(t); passed.push(t); } });
  if(!passed.length&&prevTraits.length&&traits.indexOf(prevTraits[0])<0&&rnd()<0.5){ traits[0]=prevTraits[0]; passed.push(prevTraits[0]); }
  /* GENETICS PATCH: congenital traits recorded at this kid's birth rejoin here,
   * before stat mods — the bloodline expresses itself. */
  try{ ((c.cong)||[]).forEach(function(t){ if(traits.indexOf(t)<0&&traits.length<4)traits.push(t); }); }catch(e){}
  var st=baseStats(); applyTraitMods(st,traits);
  if(plan.groomPts>0){ st.smarts=clamp100(st.smarts+4*plan.groomPts); st.discipline=clamp100(st.discipline+4*plan.groomPts); }
  var gender=pick(["male","female"]);
  var R=fam0(gender);
  var surv=old.relationships.partner;
  R.parentRel=surv?clamp(surv.rel+10):60;
  if(surv)R.momAge=surv.age;
  R.siblings=old.relationships.children.filter(function(k,i){ return i!==plan.idx; }).map(function(k){ return {name:k.name,age:k.age,rel:clamp(65+Math.floor(rnd()*25))}; });
  R.grandparents=(old.relationships.grandparents||[]).filter(function(g){ return g.alive; }).map(function(g){ return {name:g.name,side:g.side,sex:g.sex,age:g.age,rel:g.rel,alive:true,npcId:null}; });
  R.children=[]; R.partner=null; R.grandkids=[];
  S={v:(window.LL&&LL.SAVE_VERSION)||7,id:"life-"+Date.now(),firstName:fn,lastName:ln,gender:gender,
    country:old.country,bioSex:gender,genderIdentity:gender==="female"?"Female":"Male",
    sexuality:"straight",race:old.race,raceF:old.raceF,raceM:old.raceM,city:old.city,
    religion:old.religion,customWorld:old.customWorld,
    imgSeed:1+Math.floor(rnd()*999999),appearance:heirAppearance(old,plan,c,gender),
    age:page,birthYear:old.year-page,
    familyWealth:plan.inherit>=50000?"rich":(plan.inherit>=5000?"middle":"poor"),
    stats:st,stress:15,fame:plan.newFame,followers:0,prestige:plan.newPrestige,renown:plan.renown,
    traits:traits,lifestyle:"none",major:"General",scholarship:false,
    background:old.background||"humble",childhood:"none",
    ambition:(!old.ambitionDone&&old.ambition&&old.ambition!=="none")?old.ambition:"none",ambitionDone:false,
    fate:{nemesis:inhNem,nemHeat:inhNem?30:0,nemBeats:0,ill:false,trust:plan.inherit>=50000},
    dob:"",region:old.region||"",customBg:"",customBgDone:true,
    focusList:buildFocusList(old.year-page,old.background||"humble"),customFocuses:[],lastFocusAI:0,
    money:plan.inherit+(plan.uwCash||0),debt:0,salary:0,jobId:"unemployed",jobLevel:1,performance:50,business:null,company:plan.company||null,underworld:plan.underworld||null,groomed:null,
    education:{stage:"Adult",grades:clamp(70+Math.round(old.prestige/30)),highest:page>=24?"college":"none",inCollege:false,collegeYears:0},
    relationships:R,
    assets:{houseId:plan.keepHouse,carId:plan.keepCar,stocks:0,crypto:0,savings:0,houseVal:plan.keepHouseVal,carVal:plan.keepCarVal,houseYears:0,shares:{}},
    heirId:null,will:false,ach:{vacations:0,jobs:0,partners:0,feasts:0,crimes:0,wishes:0},
    flags:{student:false,retired:false,memoir:false,hasWill:false,inJail:0,homeless:false,noBad:old.flags.noBad,infiniteStats:old.flags.infiniteStats,unfiltered:true,ageless:false,undying:false,everYouth:false,joyful:false,blessed:false,goldenTouch:false,charming:false,community:false,grad:false,heirLegacy:null},
    perYear:{},log:old.log.slice(-40),alive:true,deathCause:"",totalEarned:0,crime:0,record:0,heat:0,promoY:0,netHist:[],hapHist:[],year:old.year,customEvents:0,
    world:old.world,chatImg:old.chatImg||{style:"cine",res:"512x512"}};
  /* GENETICS PATCH: the heir's own genome (stored on the kid record at birth,
   * or drawn fresh from the two bloodlines for pre-patch kids). */
  try{ if(plan.c&&plan.c.genes)S.genes=plan.c.genes;
    else S.genes=inheritGenes(old.genes||founderGenes("male"),founderGenes("female"),gender);
    genesEnsure(); }catch(e){}
  applyBuildMods(S); applyAppearanceMods(S); sanitizeApForAge(); sexEnsure();
  if(old.sex&&old.sex.corruption>=60){ S.prestige=Math.max(0,S.prestige-15); pushLog(S.age,"🥀","Whispers follow House "+ln+" — your parent's appetites were an open secret. (-15 prestige)","bad"); }
  pushLog(S.age,"👑","House "+ln+" endures! You are now "+fn+" "+ln+", age "+page+". You inherit "+fmt$(plan.inherit)+" of a "+fmt$(plan.gross)+" estate"+(plan.keepHouse!=="none"?" plus the family estate and car":"")+". "+(plan.n>1?"The rest is split among "+(plan.n-1)+" sibling"+(plan.n>2?"s":"")+". ":"")+(hadWill?"The will held — orderly succession. (+15 prestige)":"No will — lawyers took their cut.")+" Dynasty prestige carries on.","milestone");
  pushLog(S.age,"🧬","Traits: "+traits.map(traitName).join(" · ")+(passed.length?" — inherited "+passed.map(traitName).join(", ")+" from "+old.firstName+".":""));
  var famBit=[];
  if(surv)famBit.push("widowed parent "+surv.name+" (rel "+R.parentRel+")");
  if(R.siblings.length)famBit.push(R.siblings.length+" sibling"+(R.siblings.length>1?"s":"")+" ("+R.siblings.map(function(s){return s.name.split(" ")[0];}).join(", ")+")");
  if(R.grandparents.length)famBit.push(R.grandparents.length+" living grandparent"+(R.grandparents.length>1?"s":""));
  if(famBit.length)pushLog(S.age,"👪","Standing with House "+ln+": "+famBit.join("; ")+".");
  if(S.fate.nemesis)pushLog(S.age,"👁️","The old nemesis line continues — they hated your parent, and hate runs in families now.","bad");
  if(S.fate.trust)pushLog(S.age,"💰","A trust from the inheritance ticks: +$2,000 every year.");
  if(S.ambition!=="none")pushLog(S.age,"🎯","You take up the unfinished ambition: "+ambD().name+".");
  toast("🖋️ Fate is writing your inheritance…");
  S.flags.heirLegacy=await writeLegacySummary(plan,passed,hadWill,fn,page,ln);
  afterLoad();
  toast("👑 The dynasty continues as "+fn+"!");
}

LL.files.push("death"); /* end-of-file registration: counts as loaded only after this file fully ran */