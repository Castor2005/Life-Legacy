/* LIFE & LEGACY — src/tools/parity-test.js
 * Consistency gate: runtime-loaded window.EVENTS fx vs freshly compiled
 * src/content pack JSON (same LL.fxRun.compileEvent both sides, so this guards
 * the loader/migrateEvent/compile path + catches content that fails to
 * compile — it is NOT a legacy-vs-new comparison; the cutover already
 * happened and window.EVENTS is built from these same packs).
 * RUN: page_eval with {path:"src/tools/parity-test.js"} (live page, needs
 * window.EVENTS + LL.fxRun + fetchable src/content packs).
 * Method: 6 mock states (all age ranges); per event×choice compare cond, then
 * (when both conds pass) outcome + canonicalized S with identically-seeded
 * RNG. Compares nothing when content hasn't loaded yet — so the harness
 * asserts coverage (comparedEvents/comparedPairs, ok flag) instead of
 * reporting a vacuous 0/0 pass.
 */
/* NOTE: runs as a page_eval body (async function): top-level await/return. */
var out = { pass: 0, fxSkip: 0, condFail: [], fxFail: [], noJson: [] };
var comparedIds = {}, comparedPairs = 0, rawTotal = 0;
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function canon(v){
  if(v===null)return "null";
  if(v===undefined)return "U";
  if(typeof v==="number")return isNaN(v)?"NaN":String(v);
  if(typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canon).join(",")+"]";
  return "{"+Object.keys(v).sort().map(function(k){ return JSON.stringify(k)+":"+canon(v[k]); }).join(",")+"}";
}
function baseMock(age){
  return { v:3, id:"mock", firstName:"Alex", lastName:"Smith", gender:"male",
    country:"USA", bioSex:"male", genderIdentity:"Male", sexuality:"straight",
    race:"Mixed", raceF:null, raceM:null, city:"", religion:"None", customWorld:"",
    imgSeed:42, appearance:{}, age:age, birthYear:2000, familyWealth:"middle",
    stats:{health:70,happiness:60,smarts:60,looks:55,fitness:60,discipline:55,creativity:50,social:60,karma:50},
    stress:10, fame:5, followers:10, prestige:20, renown:0, traits:["brave"],
    lifestyle:"none", major:"General", scholarship:false, background:"humble",
    childhood:"none", ambition:"none", ambitionDone:false,
    fate:{nemesis:false,ill:false,trust:false}, dob:"", region:"", customBg:"", customBgDone:false,
    focusList:[], customFocuses:[], lastFocusAI:0, money:5000, debt:0, salary:3000,
    jobId:"unemployed", jobLevel:1, performance:50, business:null, company:null,
    underworld:null, groomed:null, sex:null,
    education:{stage:"Primary",grades:85,highest:"none",inCollege:false,collegeYears:0},
    relationships:{partner:null,children:[],siblings:[],pets:[],friends:[],parentRel:50,momAge:50,dadAge:52},
    assets:{houseId:"none",carId:"none",stocks:0,crypto:0,savings:0,houseVal:0,carVal:0,houseYears:0,shares:{}},
    heirId:null, will:false, ach:{vacations:0,jobs:0,partners:0,feasts:0,crimes:0,wishes:0},
    flags:{student:false,retired:false,memoir:false,hasWill:false,inJail:0,homeless:false,noBad:false,
      infiniteStats:false,unfiltered:true,ageless:false,undying:false,everYouth:false,joyful:false,
      blessed:false,goldenTouch:false,charming:false,community:false,grad:false},
    perYear:{}, log:[], alive:true, deathCause:"", totalEarned:10000, crime:0, record:0, heat:0,
    promoY:0, netHist:[], hapHist:[], year:2000, customEvents:0 };
}
function adultMock(){
  var S = baseMock(30);
  S.relationships.partner = { name:"Jordan Smith", rel:70, married:true, age:30 };
  S.relationships.children = [{name:"Kid A",age:5,rel:90},{name:"Kid B",age:3,rel:90}];
  S.relationships.siblings = [{name:"Sam Smith",age:28,rel:70},{name:"Sis Smith",age:25,rel:70}];
  S.relationships.pets = [{name:"Rex",rel:80}];
  S.relationships.friends = [{name:"Pal One",rel:70}];
  S.jobId = "teacher"; S.salary = 3000;
  S.company = { name:"Acme", sector:"trade", value:100000, cash:5000, employees:3, morale:60, rep:50, founded:2000, level:1 };
  S.underworld = { rank:1, rep:20, stash:1000, territory:1, crew:[{name:"Mole",skill:1}], prisonRep:0, retired:false };
  S.education = { stage:"Graduate", grades:88, highest:"college", inCollege:false, collegeYears:4 };
  sexE(S);
  ownClaim(S,"Asha Ray","willing",22,22);
  ownClaim(S,"Bex Cole","claim",18,20);
  ownHist(S,"Asha Ray",{acts:["vanilla","oral"]});
  S.sex.protection = true;
  return S;
}
function seniorMock(){
  var S = adultMock();
  S.age = 70; S.money = 50000; S.prestige = 200;
  S.relationships.partner = null;
  S.relationships.children = [{name:"Grown A",age:40,rel:90},{name:"Grown B",age:38,rel:85}];
  S.sex.leverageOn.push({target:"Asha Ray",secret:"filmed confession"});
  S.jobId = "unemployed"; S.salary = 0; S.flags.retired = true;
  return S;
}
var mocks = [
  { name: "kid", S: baseMock(8) },
  { name: "teen", S: (function(){ var S = baseMock(15);
      S.relationships.siblings = [{name:"Bro Teen",age:13,rel:70}];
      S.relationships.pets = [{name:"Rex",rel:80}];
      S.education = { stage:"Highschool", grades:82, highest:"none", inCollege:false, collegeYears:0 };
      return S; })() },
  { name: "adult", S: adultMock() },
  { name: "young", S: (function(){ var S = adultMock(); S.age = 22; return S; })() },
  { name: "mid", S: (function(){ var S = adultMock(); S.age = 50; S.money = 20000; S.prestige = 80; return S; })() },
  { name: "senior", S: seniorMock() }
];
// raw JSON via packs
var rawById = {};
var packs = ["baby","kid","teen","young","adult","mid","senior","mature"];
for(var pi=0;pi<packs.length;pi++){
  var doc = await (await fetch("src/content/packs/"+packs[pi]+".json")).json();
  doc.events.forEach(function(e){ rawById[e.id]=e; });
}
var compiled = {};
Object.keys(rawById).forEach(function(id){
  try{ compiled[id]=LL.fxRun.compileEvent(rawById[id]); }
  catch(e){ out.fxFail.push({id:id,why:"compile: "+(e&&e.message)}); }
});
rawTotal = Object.keys(rawById).length;
function diffTop(a,b,path,acc){
  if(canon(a)===canon(b))return;
  if(a&&b&&typeof a==="object"&&typeof b==="object"&&!Array.isArray(a)&&!Array.isArray(b)){
    Object.keys(a).forEach(function(k){ diffTop(a[k],b[k],path+"."+k,acc); });
    Object.keys(b).forEach(function(k){ if(!(k in a))acc.push(path+"."+k+" (added)"); });
  } else acc.push(path);
}
window.EVENTS.forEach(function(ev){
  var raw = rawById[ev.id];
  if(!raw){ out.noJson.push(ev.id); return; }
  var cev = compiled[ev.id];
  if(!cev)return;
  comparedIds[ev.id]=1;
  ev.choices.forEach(function(ch,ci){
    mocks.forEach(function(m){
      // fireEvent would never fire outside [minAge,maxAge]
      if(m.S.age<ev.minAge||m.S.age>ev.maxAge){ out.fxSkip++; return; }
      var lc, cc;
      try{ lc = ev.cond ? !!ev.cond(m.S) : true; }catch(e){ lc = "THROW"; }
      try{ cc = cev.cond ? !!cev.cond(m.S) : true; }catch(e){ cc = "THROW"; }
      comparedPairs++;
      if(lc!==cc){ out.condFail.push({id:ev.id,ch:ci,mock:m.name,legacy:lc,compiled:cc}); return; }
      if(lc!==true){ out.fxSkip++; return; }
      var seed = 12345+ci*7919+m.S.age;
      var S1 = structuredClone(m.S), S2 = structuredClone(m.S);
      var o1, o2, t1=null, t2=null, s1=null, s2=null;
      var keepRnd = rnd, keepMath = Math.random;
      try{
        var f1 = mulberry32(seed); rnd = f1; Math.random = f1;
        o1 = ch.fx(S1);
      }catch(e){ t1 = (e&&e.constructor&&e.constructor.name||"Error")+":"+String(e&&e.message).slice(0,80); }
      finally{ rnd = keepRnd; Math.random = keepMath; }
      try{
        var f2 = mulberry32(seed); rnd = f2; Math.random = f2;
        o2 = cev.choices[ci].fx(S2);
      }catch(e){ t2 = (e&&e.constructor&&e.constructor.name||"Error")+String(e&&e.message).slice(0,80); }
      finally{ rnd = keepRnd; Math.random = keepMath; }
      if(t1||t2){
        if(t1===t2&&(s1=canon(S1))===(s2=canon(S2))){ out.pass++; return; }
        out.fxFail.push({id:ev.id,ch:ci,mock:m.name,throw1:t1,throw2:t2,
          outcome1:String(o1).slice(0,120),outcome2:String(o2).slice(0,120)});
        return;
      }
      s1 = canon(S1); s2 = canon(S2);
      if(o1===o2&&s1===s2){ out.pass++; return; }
      var d = []; diffTop(S1,S2,"S",d);
      // Both legs route stat/stress to the top-level S.stress meter (effects-run),
      // so no per-event carve-outs: outcomes + all state must match exactly.
      if(o1===o2&&!d.length){ out.pass++; return; }
      out.fxFail.push({id:ev.id,ch:ci,mock:m.name,
        outcome1:String(o1).slice(0,160),outcome2:String(o2).slice(0,160),
        diff:d.slice(0,8)});
    });
  });
});
var comparedEvents = Object.keys(comparedIds).length;
return { ok: out.pass>0 && comparedEvents>0 && out.noJson.length===0 && out.condFail.length===0 && out.fxFail.length===0,
  pass: out.pass, fxSkip: out.fxSkip,
  condFailCount: out.condFail.length, fxFailCount: out.fxFail.length, noJson: out.noJson,
  comparedEvents: comparedEvents, comparedPairs: comparedPairs, rawTotal: rawTotal,
  condFail: out.condFail.slice(0,25), fxFail: out.fxFail.slice(0,25) };
