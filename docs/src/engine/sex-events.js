/* LIFE & LEGACY — engine/sex-events.js
 * Event-domain sex/ownership/career helpers, moved VERBATIM from src/events.js tail.
 * These are the canonical implementations used by event choices (fx closures call them
 * with S as first arg). The main-loop counterparts in ownership.js (sexEnsure/ensureClaim/
 * claimPartner/logSex/...) use the global S; both operate on the same S.sex shape.
 * Load AFTER core/utils/state/migrate + effects-* (see index.html order comment).
 * All cross-file names used here (clamp/rnd/pick/...) resolve at CALL time, and
 * LL.fxCalls is read lazily by effects-run at exec time — safe in this position.
 * Phase 5: transpiled JSON events invoke these via LL.fxCalls (see registration below).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* randName is expression-helper-only in effects-parse; raw JS here needs the
 * real global generator (rName, state.js — loaded before this file). */
if(typeof randName==="undefined"&&typeof rName!=="undefined")var randName=rName;
function sexE(S){if(!S.sex)S.sex={xp:0,skill:0,stamina:55,partners:0,corruption:0,kinks:[],acts:{},claims:[],lovers:[],leverageOn:[],leverageOff:[],addiction:0,scandal:0,protection:true,fertility:80,pregScares:0,affairKids:0,broken:0,haremTension:0,alpha:null,netori:{taken:0,lost:0,revenges:0},lawNote:""};var x=S.sex;if(typeof x.xp!=="number")x.xp=0;if(typeof x.skill!=="number")x.skill=0;if(typeof x.stamina!=="number")x.stamina=55;if(typeof x.partners!=="number")x.partners=0;if(typeof x.corruption!=="number")x.corruption=0;if(!x.kinks)x.kinks=[];if(!x.acts||typeof x.acts!=="object")x.acts={};if(!x.claims)x.claims=[];if(!x.lovers)x.lovers=[];if(!x.leverageOn)x.leverageOn=[];if(!x.leverageOff)x.leverageOff=[];if(typeof x.addiction!=="number")x.addiction=0;if(typeof x.scandal!=="number")x.scandal=0;if(x.protection===undefined)x.protection=true;if(typeof x.pregScares!=="number")x.pregScares=0;if(typeof x.affairKids!=="number")x.affairKids=0;if(typeof x.broken!=="number")x.broken=0;if(typeof x.haremTension!=="number")x.haremTension=0;if(x.alpha===undefined)x.alpha=null;if(!x.netori||typeof x.netori!=="object")x.netori={taken:0,lost:0,revenges:0};if(typeof x.netori.taken!=="number")x.netori.taken=0;if(typeof x.netori.lost!=="number")x.netori.lost=0;if(typeof x.netori.revenges!=="number")x.netori.revenges=0;if(typeof x.lawNote!=="string")x.lawNote="";for(var i=0;i<x.claims.length;i++)ownFill(S,x.claims[i]);return x;}
function ownFill(S,c){if(!c||typeof c!=="object")return c;if(typeof c.obedience!=="number")c.obedience=20;if(typeof c.obsession!=="number")c.obsession=25;if(typeof c.stage!=="number")c.stage=1;if(typeof c.corr!=="number")c.corr=20;if(typeof c.own!=="number")c.own=c.obedience;if(!c.mode)c.mode=c.stage>=3?"collared":"claimed";if(c.legal===undefined)c.legal=false;if(typeof c.broken!=="number")c.broken=(c.mode==="broken"?40:0);if(c.accepted===undefined)c.accepted=(c.mode==="willing"||c.mode==="legal"||c.mode==="devoted");if(typeof c.rank!=="number")c.rank=99;if(typeof c.jealousy!=="number")c.jealousy=30;if(!c.hist)c.hist={times:1,first:S.age,last:S.age,forced:0,willing:1,acts:{}};if(!c.hist.acts)c.hist.acts={};if(!c.preg)c.preg={state:"none",ctrl:"none",child:null};if(c.levOn===undefined)c.levOn=null;if(c.levOff===undefined)c.levOff=null;return c;}
function sxK(S,id){var x=sexE(S);var ok=["sensual","dominance","submission","bondage","exhibition","voyeur","group","public","roleplay","fetish","poly","power","edging","praise","degradation","cuckold"];if(ok.indexOf(id)>=0&&x.kinks.indexOf(id)<0)x.kinks.push(id);}
function sxClaim(S,name,ob,os,st){var x=sexE(S);if(!name)return null;var c=null;for(var i=0;i<x.claims.length;i++)if(x.claims[i].name===name)c=x.claims[i];if(!c){c=ownFill(S,{name:name,stage:1,obedience:20,obsession:25});x.claims.push(c);}c=ownFill(S,c);c.obedience=clamp(c.obedience+(ob||0));c.obsession=clamp(c.obsession+(os||0));c.own=clamp(c.own+Math.round((ob||0)*0.7));if(st)c.stage=Math.max(c.stage,st);if(c.obedience>=85&&c.stage<3)c.stage=3;if(c.stage>=4){c.mode="devoted";c.accepted=true;}return c;}
function addSxCorr(S,n){var x=sexE(S);x.corruption=clamp(x.corruption+n);}
/* ownership law = GAME FICTION (registered consensual collared-household), not real law */
function evOwnLaw(S){var ctry=S.country||"",cust=S.customWorld||"";if(/harem legal|ownership legal|collared legal|harem permit/i.test(cust))return {allows:true,harem:true,label:"custom permit: collared households & harems registered"};var C=["Saudi Arabia","United Arab Emirates","Qatar","Kuwait","Oman","Bahrain","Morocco","Jordan","Egypt","Yemen","Somalia","Sudan","Mauritania","Afghanistan","Brunei","Iran"];var H=["Saudi Arabia","United Arab Emirates","Qatar","Kuwait","Oman","Bahrain","Morocco","Somalia","Sudan","Yemen"];var ok=C.indexOf(ctry)>=0,ha=H.indexOf(ctry)>=0;if(ok&&ha)return {allows:true,harem:true,label:ctry+" registry (fiction): ownership + harems recorded"};if(ok)return {allows:true,harem:false,label:ctry+" registry (fiction): one collared partner recognized"};if(S.prestige>=300)return {allows:true,harem:true,label:"bought papers — prestige opens registries (fiction)"};return {allows:false,harem:false,label:(ctry||"this land")+" bans ownership — break or be chosen"};}
function ownClaim(S,name,via,ob,os){var x=sexE(S);if(!name||S.age<18)return null;var law=evOwnLaw(S);via=via||"claim";if(via==="legal"&&!law.allows)via="broken";var c=sxClaim(S,name,ob===undefined?12:ob,os===undefined?10:os,0);if(!x.lovers)x.lovers=[];if(x.lovers.indexOf(name)<0){x.lovers.push(name);x.lovers=x.lovers.slice(-8);x.partners++;}x.xp+=1;if(via==="legal"){c.legal=true;c.mode="legal";c.accepted=true;c.own=clamp(c.own+18);c.stage=Math.max(c.stage,3);if(c.rank===99)c.rank=0;}else if(via==="broken"){c.legal=false;c.mode="broken";c.broken=clamp(c.broken+25);c.own=clamp(c.own+14);c.stage=Math.max(c.stage,(c.broken>=70||c.obedience>=85)?3:1);}else if(via==="willing"){c.legal=false;c.mode="willing";c.accepted=true;c.own=clamp(c.own+16);c.stage=Math.max(c.stage,2);}else if(via==="netori"){c.legal=false;c.mode="broken";c.broken=clamp(c.broken+20);c.own=clamp(c.own+12);c.stage=Math.max(c.stage,1);x.netori.taken++;}else{c.own=clamp(c.own+10);c.stage=Math.max(c.stage,1);}x.corruption=clamp(x.corruption+4);x.lawNote=law.label;return c;}
function ownCorr(S,name,n){var x=sexE(S);x.corruption=clamp(x.corruption+n);if(!name)return;for(var i=0;i<x.claims.length;i++)if(x.claims[i].name===name){ownFill(S,x.claims[i]);x.claims[i].corr=clamp(x.claims[i].corr+n);}}
function ownHist(S,name,o){var x=sexE(S);o=o||{};var c=sxClaim(S,name,0,0,0);var acts=(o.acts&&o.acts.length)?o.acts:["vanilla"];c.hist.times++;c.hist.last=S.age;if(o.forced)c.hist.forced++;else c.hist.willing++;for(var i=0;i<acts.length;i++){var a=acts[i];c.hist.acts[a]=(c.hist.acts[a]||0)+1;x.acts[a]=(x.acts[a]||0)+1;}x.xp+=(o.forced?2:1);x.skill=clamp(x.skill+(o.forced?4:3));x.stamina=clamp(x.stamina-(o.forced?16:12));return c;}
function ownForce(S,name){var x=sexE(S);var c=sxClaim(S,name||randName(),0,0,0);c.hist.times++;c.hist.forced++;c.corr=clamp(c.corr+14);c.obedience=clamp(c.obedience-18);c.obsession=clamp(c.obsession-10);c.jealousy=clamp(c.jealousy+20);c.own=clamp(c.own-12);x.corruption=clamp(x.corruption+12);x.stamina=clamp(x.stamina-16);ownPreg(S,c.name,1.5,"forced");S.crime=(S.crime||0)+1;S.flags.inJail=Math.max(S.flags.inJail|0,Math.min(10,1+Math.floor(rnd()*3)));S.stats.karma=clamp(S.stats.karma-20);S.prestige=Math.max(0,(S.prestige||0)-50);x.scandal=clamp(x.scandal+25);x.leverageOff.push({holder:c.name,secret:"forced night"});c.levOff="forced night";if(S.jobId&&S.jobId!=="unemployed"){S.jobId="unemployed";S.salary=0;}if(S.relationships.partner&&S.relationships.partner.name===c.name)S.relationships.partner.rel=clamp(S.relationships.partner.rel-45);return c;}
function sxPreg(S,lover,mult,ctrl){var x=sexE(S);ctrl=ctrl||(x.protection?"accidental":"planned");var ageF=(S.age>=18&&S.age<=42)?(S.age<30?1:(S.age<35?0.7:0.35)):0;if(!ageF)return "";var f=(x.fertility/100)*ageF*(mult||1);if(x.protection)f*=0.04;if(ctrl==="forced")f=Math.min(0.85,(x.fertility/100)*ageF*(mult||1));if(ctrl==="prevented")f*=0.05;if(f<=0)return "";var c=null;for(var i=0;i<x.claims.length;i++)if(x.claims[i].name===lover)c=x.claims[i];if(rnd()<f*0.5){x.pregScares++;S.money=Math.max(0,S.money-300);if(c){c=ownFill(S,c);c.preg.state="scare";c.preg.ctrl=ctrl;}return "scare";}if(rnd()<f){var n=randName();S.relationships.children.push({name:n,age:0,rel:90});S.prestige=(S.prestige||0)+10;x.affairKids++;if(!S.relationships.partner||lover!==S.relationships.partner.name){S.stats.karma=clamp(S.stats.karma-8);x.scandal=clamp(x.scandal+15);}if(c){c=ownFill(S,c);c.preg.state="birth";c.preg.ctrl=ctrl;c.preg.child=n;}return "born:"+n;}if(c&&c.preg.state==="none"&&ctrl==="prevented"){c=ownFill(S,c);c.preg.state="prevented";c.preg.ctrl="prevented";}return "";}
function ownPreg(S,lover,mult,ctrl){return sxPreg(S,lover,mult,ctrl);}
function hasOwnC(S){var x=sexE(S);return x.claims.length;}
function haremN(S){var x=sexE(S);return x.claims.filter(function(c){return c.stage>=1;}).length;}
function alphaN(S){var x=sexE(S);if(x.alpha){for(var i=0;i<x.claims.length;i++)if(x.claims[i].name===x.alpha)return x.alpha;}for(var j=0;j<x.claims.length;j++)if(x.claims[j].rank===0)return x.claims[j].name;var b=null;for(var k=0;k<x.claims.length;k++)if(!b||x.claims[k].own>b.own)b=x.claims[k];return b?b.name:null;}

function tryPromote(S,why){const J=(window.GDATA.jobs||[]).filter(j=>evJobEligible(S,j));if(!J.length){S.stats.happiness=clamp(S.stats.happiness-2);return "No fit right now. You keep looking.";}const j=J[Math.floor(Math.random()*J.length)];S.jobId=j.id;S.salary=j.pay;S.performance=60;return `HIRED as ${j.name}! Salary $${j.pay.toLocaleString()}! (${why})`;}
function evJobEligible(S,j){if(j.minAge&&S.age<j.minAge)return false;if(j.maxAge&&S.age>j.maxAge)return false;const r=j.req||{};if(r.edu==="college"&&!["college","grad"].includes(S.education.highest))return false;if(r.edu==="grad"&&S.education.highest!=="grad")return false;if(r.smarts&&S.stats.smarts<r.smarts-15)return false;return true;}

/* ---- loop/sort rituals for transpiled JSON events (verbatim logic, S param) ---- */
function ownCashoutLeverage(S){
  var x=sexE(S),pay=0;
  while(x.leverageOn.length&&pay<3){var L=x.leverageOn.shift();pay++;var amt=2500+Math.floor(rnd()*6000);S.money+=amt;S.totalEarned+=amt;}
  for(var i=0;i<x.claims.length;i++){x.claims[i]=ownFill(S,x.claims[i]);var cn=x.claims[i].name;var sec="collared nights";var has=false;for(var k=0;k<x.leverageOn.length;k++)if(x.leverageOn[k].target===cn)has=true;if(!has){x.leverageOn.push({target:cn,secret:sec});x.claims[i].levOn=sec;}}
  return pay;
}

/* Named-call registry for the data-driven effect interpreter (effects-run.js). */
window.LL=window.LL||{}; LL.fxCalls=LL.fxCalls||{};
(function(){
var R=LL.fxCalls;
function wrap1(fn){ return function(S,args){ return fn(S); }; }
R["sex.ensure"]=wrap1(sexE);
R["sex.kink"]=function(S,args){ return sxK(S,args.id); };
R["sex.claim"]=function(S,args){ return sxClaim(S,args.name,args.ob||0,args.os||0,args.stage||0); };
R["sex.ownClaim"]=function(S,args){ return ownClaim(S,args.name,args.via,args.ob,args.os); };
R["sex.corr"]=function(S,args){ return ownCorr(S,args.name,args.delta||0); };
R["sex.hist"]=function(S,args){ return ownHist(S,args.name,{acts:args.acts,forced:!!args.forced}); };
R["sex.force"]=function(S,args){ return ownForce(S,args.name); };
R["sex.preg"]=function(S,args){ return sxPreg(S,args.name,args.mult||1,args.ctrl); };
R["sex.hasClaims"]=function(S,args){ return hasOwnC(S); };
R["sex.haremCount"]=function(S,args){ return haremN(S); };
R["sex.alphaName"]=function(S,args){ return alphaN(S); };
R["sex.addCorr"]=function(S,args){ return addSxCorr(S,args.delta||0); };
R["law.check"]=function(S,args){ return evOwnLaw(S); };
R["career.tryPromote"]=function(S,args){ return tryPromote(S,args&&args.why); };
R["career.eligible"]=function(S,args){ return evJobEligible(S,args.job); };
R["own.cashoutLeverage"]=function(S,args){ return ownCashoutLeverage(S); };
LL.fxPred=LL.fxPred||{};
LL.fxPred["ownLawAllows"]=function(S){ try{return !!evOwnLaw(S).allows;}catch(e){return false;} };
LL.fxPred["ownLawDenies"]=function(S){ try{return !evOwnLaw(S).allows;}catch(e){return false;} };
})();

LL.files.push("sex-events"); /* end-of-file registration: counts as loaded only after this file fully ran */