/* LIFE & LEGACY — engine/effects-run.js
 * PURE (no DOM): condition rules, effect executor, event compiler, registries.
 * Depends only on LL.fxParse (effects-parse.js). S is passed as an argument.
 * Named calls/predicates are implemented by engine systems (ownership.js,
 * actions.js) and registered in LL.fxCalls / LL.fxPred — the validator
 * allowlists names here (CALL_NAMES, PRED_NAMES).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});

(function(){
var LLW = window.LL;
/* Live-bound (NOT a load-time snapshot): LL.fxParse is resolved at every call,
 * so effects-parse.js loading after us can no longer wedge the executor. */
function FX(){ return LLW.fxParse; }

/* Named-call + predicate allowlists (implementations live in sex-events.js). */
var CALL_NAMES = ["sex.ensure","sex.kink","sex.claim","sex.ownClaim","sex.corr",
  "sex.hist","sex.force","sex.preg","sex.addCorr","law.check",
  "career.tryPromote","career.eligible",
  "own.cashoutLeverage"];
var PRED_NAMES = ["ownLawAllows","ownLawDenies"];

/* ---------- value helpers ---------- */
function num(v){ var n=Number(v); return isFinite(n)?n:0; }
function clamp100(v){ v=Math.round(num(v)); return v<0?0:(v>100?100:v); }
/* Diminishing-returns scaler for stat GAINS (mirrors global gainStat in
 * state.js; kept local so this file stays worker-safe for validate-content).
 * Full gains at/below 50, quadratic falloff above, 6% floor; losses pass
 * through untouched so setbacks always bite. */
function _statDR(key, cur, delta){
  var ok={health:1,happiness:1,smarts:1,looks:1,fitness:1,discipline:1,creativity:1,social:1,karma:1}[key];
  if(!(delta>0)||!ok)return delta;
  var hr=100-(+cur||0);
  if(hr<=0)return 0;
  var f=hr/50;
  return delta*Math.max(0.06,f*f);
}
function safeGet(S,path){
  var cur=S, parts=path.split(".");
  for(var i=0;i<parts.length;i++){ if(cur==null)return undefined; cur=cur[parts[i]]; }
  return cur;
}
function safeSet(S,path,val){
  var parts=path.split("."), cur=S;
  for(var i=0;i<parts.length-1;i++){ if(parts[i]==="__proto__"||parts[i]==="constructor"||parts[i]==="prototype")return; if(cur[parts[i]]==null)cur[parts[i]]={}; cur=cur[parts[i]]; }
  if(parts[parts.length-1]==="__proto__"||parts[parts.length-1]==="constructor"||parts[parts.length-1]==="prototype")return;
  cur[parts[parts.length-1]]=val;
}
function E(expr,S,vars,helpers){ return FX().evalExpr(expr,S,vars||{},helpers||{}); }
/* EV: content values are usually expr strings; pass literals through. */
function EV(v,S,vars,helpers){ return typeof v==="string"?E(v,S,vars,helpers):v; }
function setPath(obj,path,val){
  var parts=String(path).split("."), cur=obj;
  for(var i=0;i<parts.length-1;i++){ if(parts[i]==="__proto__"||parts[i]==="constructor"||parts[i]==="prototype")return; if(cur[parts[i]]==null||typeof cur[parts[i]]!=="object")cur[parts[i]]={}; cur=cur[parts[i]]; }
  if(parts[parts.length-1]==="__proto__"||parts[parts.length-1]==="constructor"||parts[parts.length-1]==="prototype")return;
  cur[parts[parts.length-1]]=val;
}
function getPath(obj,path){
  var parts=String(path).split("."), cur=obj;
  for(var i=0;i<parts.length;i++){ if(cur==null)return undefined; cur=cur[parts[i]]; }
  return cur;
}

/* ---------- sex/claim access (canonical shapes from sex-events.js) ---------- */
function fullClaim(S,name){
  if(typeof ownFill==="function")return ownFill(S,{name:name,stage:1,obedience:20,obsession:25});
  return {name:name,stage:1,obedience:20,obsession:25,corr:20,own:20,
    mode:"claimed",legal:false,broken:0,accepted:false,rank:99,jealousy:30,
    hist:{times:1,first:S.age,last:S.age,forced:0,willing:1,acts:{}},
    preg:{state:"none",ctrl:"none",child:null},levOn:null,levOff:null};
}
function fillClaim(S,c){ if(typeof ownFill==="function")return ownFill(S,c); return c; }
function ensureSex(S){
  var x=(typeof sexE==="function")?sexE(S):null;
  if(!x){
    if(!S.sex)S.sex={xp:0,skill:0,stamina:55,partners:0,corruption:0,kinks:[],
      acts:{},claims:[],lovers:[],leverageOn:[],leverageOff:[],addiction:0,
      scandal:0,protection:true,fertility:80,pregScares:0,affairKids:0,broken:0,
      haremTension:0,alpha:null,netori:{taken:0,lost:0,revenges:0},lawNote:""};
    x=S.sex;
    if(!x.claims)x.claims=[]; if(!x.lovers)x.lovers=[];
    if(!x.leverageOn)x.leverageOn=[]; if(!x.leverageOff)x.leverageOff=[];
    if(!x.netori)x.netori={taken:0,lost:0,revenges:0};
    if(!x.acts)x.acts={}; if(!x.kinks)x.kinks=[];
  }
  for(var i=0;i<x.claims.length;i++)x.claims[i]=fillClaim(S,x.claims[i]);
  return x;
}
function getClaim(S,name){
  var x=ensureSex(S);
  for(var i=0;i<x.claims.length;i++)if(x.claims[i].name===name)return fillClaim(S,x.claims[i]);
  return null;
}

/* ---------- conditions ---------- */
function testRule(rule,S,vars,helpers){
  if(!rule)return true;
  if(rule.all)return rule.all.every(function(r){ return testRule(r,S,vars,helpers); });
  if(rule.any)return rule.any.some(function(r){ return testRule(r,S,vars,helpers); });
  if(rule.not!==undefined)return !testRule(rule.not,S,vars,helpers);
  if(rule.call)return !!callPred(rule.call,S);
  if(rule.someChild){
    var ch=(S.relationships&&S.relationships.children)||[];
    return ch.some(function(c){ return c.age>=rule.someChild.min&&c.age<=rule.someChild.max; });
  }
  if(rule.some){
    var arr=safeGet(S,rule.some.arr)||[];
    var keep=vars.$it;
    for(var i=0;i<arr.length;i++){ vars.$it=arr[i]; if(testRule(rule.some.where,S,vars,helpers)){ vars.$it=keep; return true; } }
    vars.$it=keep; return false;
  }
  if(rule.partner){
    var p=S.relationships&&S.relationships.partner;
    var lov=(S.sex&&S.sex.lovers&&S.sex.lovers.length)||0;
    switch(rule.partner){
      case "exists": return !!p;
      case "single": return !p;
      case "dating": return !!(p&&!p.married);
      case "married": return !!(p&&p.married);
      case "lover": return !!(p||lov>0);
    }
    throw new Error("bad partner rule");
  }
  if(rule.job==="employed")return !!(S.jobId&&S.jobId!=="unemployed");
  if(rule.jailed!==undefined)return (((S.flags&&S.flags.inJail)||0)>0)===!!rule.jailed;
  if(rule.expr!==undefined)return !!E(rule.expr,S,vars,helpers);
  if(rule.v!==undefined){
    var vv=getPath(vars,rule.v);
    if(rule.exists!==undefined)return rule.exists?vv!==undefined&&vv!==null:vv===undefined||vv===null;
    if(rule.eq!==undefined)return vv===rule.eq;
    if(rule.ne!==undefined)return vv!==rule.ne;
    if(rule.gt!==undefined)return vv>rule.gt;
    if(rule.gte!==undefined)return vv>=rule.gte;
    if(rule.lt!==undefined)return vv<rule.lt;
    if(rule.lte!==undefined)return vv<=rule.lte;
    if(rule.truthy!==undefined)return rule.truthy?!!vv:!vv;
    throw new Error("bad rule var leaf");
  }
  if(rule.count){
    var carr=safeGet(S,rule.count.arr)||[], cn=0;
    var cf=rule.count.field, cop=rule.count.op||"eq", cv=rule.count.val;
    for(var ci=0;ci<carr.length;ci++){
      var cvv=carr[ci]?carr[ci][cf]:undefined, ok=false;
      switch(cop){ case "gt":ok=cvv>cv;break; case "gte":ok=cvv>=cv;break;
        case "lt":ok=cvv<cv;break; case "lte":ok=cvv<=cv;break;
        case "ne":ok=cvv!==cv;break; default:ok=cvv===cv; }
      if(ok)cn++;
    }
    if(rule.count.gte!==undefined)return cn>=rule.count.gte;
    if(rule.count.gt!==undefined)return cn>rule.count.gt;
    return cn>0;
  }
  if(rule.p!==undefined){
    var val=(rule.p==="$it")?vars.$it:((rule.p.indexOf("$it")===0)?itPath(vars.$it,rule.p):safeGet(S,rule.p));
    if(rule.truthy!==undefined)return rule.truthy?!!val:!val;
    if(rule.exists!==undefined)return rule.exists?val!==undefined&&val!==null:val===undefined||val===null;
    if(rule.eq!==undefined)return val===rule.eq;
    if(rule.ne!==undefined)return val!==rule.ne;
    if(rule.gt!==undefined)return val>rule.gt;
    if(rule.gte!==undefined)return val>=rule.gte;
    if(rule.lt!==undefined)return val<rule.lt;
    if(rule.lte!==undefined)return val<=rule.lte;
    if(rule.in!==undefined)return rule.in.indexOf(val)>=0;
    if(rule.includes!==undefined){
      if(Array.isArray(val))return val.indexOf(rule.includes)>=0;
      if(typeof val==="string")return val.indexOf(rule.includes)>=0;
      return false;
    }
    throw new Error("bad rule leaf");
  }
  throw new Error("bad rule");
}
function itPath(it,p){
  var parts=p.split(".").slice(1), cur=it;
  for(var i=0;i<parts.length;i++){ if(cur==null)return undefined; cur=cur[parts[i]]; }
  return cur;
}
function callPred(name,S){
  var impls=(LLW.fxPred||{});
  if(impls[name])return impls[name](S);
  if(name==="ownLawAllows"||name==="ownLawDenies"){
    var g=(typeof window!=="undefined"&&window.ownLaw)||(typeof ownLaw!=="undefined"?ownLaw:null);
    if(!g)throw new Error("ownLaw unavailable for "+name);
    var r=g();
    return name==="ownLawAllows"?!!r.allows:!r.allows;
  }
  throw new Error("unknown predicate "+name);
}

/* ---------- effect executor ---------- */
function defaultHelpers(){
  return {
    rnd:Math.random,
    randName:(typeof randName!=="undefined")?randName:function(){ return "Alex Smith"; },
    partnerName:(typeof partnerName!=="undefined")?partnerName:function(){ return "Sam Smith"; }
  };
}
/* deep-evaluate {expr} wrappers inside call args. */
function deepExpr(v,S,vars,helpers){
  if(v&&typeof v==="object"){
    if(typeof v.expr==="string"&&Object.keys(v).length===1)return E(v.expr,S,vars,helpers);
    if(Array.isArray(v))return v.map(function(x){ return deepExpr(x,S,vars,helpers); });
    var o={}; for(var k in v)o[k]=deepExpr(v[k],S,vars,helpers);
    return o;
  }
  return v;
}
function execList(list,S,vars,api,st){
  api=api||{}; var helpers=api.helpers||defaultHelpers(); st=st||{outcome:"",stopped:false};
  for(var i=0;i<list.length&&!st.stopped;i++)execOp(list[i],S,vars,api,st,helpers);
  return st;
}
function execOp(op,S,vars,api,st,helpers){
  switch(op.op){
    case "let": vars[op.name]=EV(op.expr,S,vars,helpers); return;
    case "outcome": st.outcome=FX().renderTemplate(op.tpl,S,vars,helpers); return;
    case "returnIf":
      if(testRule(op.cond,S,vars,helpers)){ st.outcome=FX().renderTemplate(op.outcome,S,vars,helpers); st.stopped=true; }
      return;
    case "branch": {
      var pickB=testRule(op.cond,S,vars,helpers)?op.then:op.else;
      if(pickB)execList(pickB,S,vars,api,st,helpers);
      return;
    }
    case "chance": {
      var p=typeof op.p==="number"?op.p:num(EV(op.p,S,vars,helpers));
      var br=(helpers.rnd?helpers.rnd():Math.random())<p?op.then:op.else;
      if(br)execList(br,S,vars,api,st,helpers);
      return;
    }
    case "forClaims": {
      var cl=ensureSex(S).claims.slice(), keep=vars.$it, keepIx=op.idxAs?vars[op.idxAs]:undefined, done=0;
      if(op.sortBy)cl.sort(function(a,b){ var d=num(a&&a[op.sortBy])-num(b&&b[op.sortBy]); return op.desc?-d:d; });
      if(op.from==="last")cl.reverse();
      for(var i=0;i<cl.length;i++){
        vars.$it=cl[i]; if(op.as)vars[op.as]=cl[i]; if(op.idxAs)vars[op.idxAs]=i;
        if(op.match&&!testRule(op.match,S,vars,helpers))continue;
        execList(op.body,S,vars,api,st,helpers); if(st.stopped)break;
        if(op.limit&&++done>=op.limit)break;
      }
      vars.$it=keep; if(op.idxAs)vars[op.idxAs]=keepIx; return;
    }
    case "forChildren": {
      var ch=(S.relationships&&S.relationships.children)||[], keep2=vars.$it;
      for(var j=0;j<ch.length;j++){ vars.$it=ch[j]; if(op.as)vars[op.as]=ch[j]; execList(op.body,S,vars,api,st,helpers); if(st.stopped)break; }
      vars.$it=keep2; return;
    }
    /* "stress" is a top-level meter (S.stress), not a STAT_KEYS member: route it to the meter every system reads. */
    case "stat":
      if(op.key==="stress"){ S.stress=clamp100(num(S.stress)+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers))); return; }
      S.stats[op.key]=clamp100(num(S.stats[op.key])+_statDR(op.key,S.stats[op.key],num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers)))); return;
    case "money": S.money=Math.round(num(S.money)+num(EV(op.amount,S,vars,helpers))); if(op.floor!==undefined&&S.money<op.floor)S.money=op.floor; return;
    case "set": safeSet(S,op.path,EV(op.value,S,vars,helpers)); return;
    case "flag": if(!S.flags)S.flags={}; S.flags[op.key]=EV(op.value,S,vars,helpers); return;
    case "edu": if(!S.education)S.education={}; S.education[op.path]=EV(op.value,S,vars,helpers); return;
    case "grades": S.education.grades=clamp100(num(S.education.grades)+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers))); return;
    case "salary": S.salary=EV(op.value,S,vars,helpers); return;
    case "perf": S.performance=clamp100(num(S.performance||50)+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers))); return;
    case "jobSet": S.jobId=op.id; if(op.salary!==undefined)S.salary=op.salary; return;
    case "jobLose": S.jobId="unemployed"; S.salary=0; return;
    case "partnerRel": if(S.relationships.partner)S.relationships.partner.rel=clamp100(num(S.relationships.partner.rel)+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers))); return;
    case "partnerMarry": if(S.relationships.partner)S.relationships.partner.married=true; return;
    case "partnerClear": S.relationships.partner=null; return;
    case "partnerSet": {
      S.relationships.partner={name:String(EV(op.name,S,vars,helpers)),rel:op.rel!==undefined?num(EV(op.rel,S,vars,helpers)):70,married:!!op.married,age:op.age!==undefined?num(EV(op.age,S,vars,helpers)):S.age};
      return;
    }
    case "addPet": S.relationships.pets.push({name:String(EV(op.name,S,vars,helpers)),type:op.petType,rel:op.rel||75}); return;
    case "addChild": S.relationships.children.push({name:String(EV(op.name,S,vars,helpers)),age:op.age||0,rel:op.rel||90}); return;
    case "addFriend": S.relationships.friends.push({name:String(EV(op.name,S,vars,helpers)),rel:op.rel||60}); return;
    case "childPath": { var ch2=vars.$it; if(!ch2)throw new Error("childPath without loop"); setPath(ch2,op.path,EV(op.value,S,vars,helpers)); return; }
    case "claimPath": {
      var c;
      if(op.ref===undefined||op.ref==="$it")c=vars.$it;
      else if(op.ref&&typeof op.ref==="object"&&op.ref.expr!==undefined)c=getClaim(S,String(E(op.ref.expr,S,vars,helpers)));
      else if(typeof op.ref==="string"&&op.ref[0]==="{")c=getClaim(S,String(E(op.ref,S,vars,helpers)));
      else if(typeof op.ref==="string")c=getClaim(S,op.ref);
      else c=vars.$it;
      if(!c||typeof c!=="object")throw new Error("claimPath without target");
      setPath(c,op.path,EV(op.value,S,vars,helpers)); return;
    }
    /* setv: generic field write on a lets/loop var holding a live object. */
    case "setv": {
      var tgt=vars[op.target];
      if(!tgt||typeof tgt!=="object")throw new Error("setv without object "+op.target);
      setPath(tgt,op.path,EV(op.value,S,vars,helpers)); return;
    }
    case "claimRemove": {
      var rn=op.ref&&typeof op.ref==="object"&&op.ref.expr!==undefined?String(E(op.ref.expr,S,vars,helpers)):String(EV(op.ref,S,vars,helpers));
      var xc=ensureSex(S);
      for(var ri=0;ri<xc.claims.length;ri++)if(xc.claims[ri].name===rn){ xc.claims.splice(ri,1); break; }
      return;
    }
    case "claimSplice": {
      var xs0=ensureSex(S), six=Math.floor(num(EV(op.index,S,vars,helpers)));
      if(six>=0&&six<xs0.claims.length)xs0.claims.splice(six,1);
      return;
    }
    case "arrPush": {
      var ap=vars[op.target];
      if(!Array.isArray(ap))throw new Error("arrPush target not array "+op.target);
      ap.push(EV(op.value,S,vars,helpers)); return;
    }
    case "claimPop": {
      var xp0=ensureSex(S).claims.pop()||null;
      if(op.as)vars[op.as]=xp0; return;
    }
    case "claimsClear": { ensureSex(S).claims=[]; return; }
    case "crewAdd": {
      if(!S.underworld)S.underworld={crew:[]};
      S.underworld.crew.push({name:String(EV(op.name||"randName()",S,vars,helpers)),skill:1}); return;
    }
    case "crewDrop": {
      var m=(S.underworld&&S.underworld.crew&&S.underworld.crew.pop())||null;
      if(op.as)vars[op.as]=m; return;
    }
    case "kink": { var x0=ensureSex(S); if(x0.kinks.indexOf(op.id)<0)x0.kinks.push(op.id); return; }
    case "corr": {
      var x1=ensureSex(S), d1=num(EV(op.delta,S,vars,helpers));
      x1.corruption=clamp100(num(x1.corruption)+d1);
      if(op.name!==undefined){
        var cnm=String(EV(op.name,S,vars,helpers)), cc0=getClaim(S,cnm);
        if(cc0)cc0.corr=clamp100(num(cc0.corr)+d1);
      }
      return;
    }
    case "xp": { var x2=ensureSex(S); x2.xp=num(x2.xp)+num(EV(op.n,S,vars,helpers)); return; }
    case "skill": { var x3=ensureSex(S); x3.skill=clamp100(num(x3.skill)+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers))); return; }
    case "stamina": { var x4=ensureSex(S); x4.stamina=clamp100(num(x4.stamina)+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers))); return; }
    case "protection": { var x5=ensureSex(S); x5.protection=!!op.bool; return; }
    case "scandal": { var x6=ensureSex(S); x6.scandal=clamp100(num(x6.scandal)+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers))); return; }
    case "addiction": { var x7=ensureSex(S); x7.addiction=clamp100(num(x7.addiction)+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers))); return; }
    case "pregScares": { var x8=ensureSex(S); x8.pregScares=num(x8.pregScares||0)+1; return; }
    case "sexset": { var x9=ensureSex(S); x9[op.path]=EV(op.value,S,vars,helpers); return; }
    case "lovAdd": { var xa=ensureSex(S); var nn=String(EV(op.name,S,vars,helpers)); if(xa.lovers.indexOf(nn)<0){xa.lovers.push(nn);xa.lovers=xa.lovers.slice(-8);xa.partners++;} return; }
    case "lovPush": { var xp1=ensureSex(S); xp1.lovers.push(String(EV(op.name,S,vars,helpers))); xp1.lovers=xp1.lovers.slice(-8); xp1.partners++; return; }
    case "lovClear": { var xb=ensureSex(S); xb.lovers=[]; return; }
    case "levOn": { var xc=ensureSex(S); xc.leverageOn.push({target:String(EV(op.target,S,vars,helpers)),secret:String(EV(op.secret,S,vars,helpers))}); return; }
    case "levOff": { var xd=ensureSex(S); xd.leverageOff.push({holder:String(EV(op.holder,S,vars,helpers)),secret:String(EV(op.secret,S,vars,helpers))}); return; }
    case "levOnClear": { var xe=ensureSex(S); xe.leverageOn=[]; return; }
    case "histLog": {
      var xf=ensureSex(S), who=String(EV(op.name,S,vars,helpers));
      var cc=getClaim(S,who);
      if(!cc){ cc=fullClaim(S,who); xf.claims.push(cc); }
      cc.hist.times++; cc.hist.last=S.age; if(!cc.hist.first)cc.hist.first=S.age;
      if(op.forced)cc.hist.forced++; else cc.hist.willing++;
      var acts=op.acts.map(function(a){ return String(EV(a,S,vars,helpers)); });
      for(var a2=0;a2<acts.length;a2++){ cc.hist.acts[acts[a2]]=(cc.hist.acts[acts[a2]]||0)+1; xf.acts[acts[a2]]=(xf.acts[acts[a2]]||0)+1; }
      xf.xp+=(op.forced?2:1);
      xf.skill=clamp100(num(xf.skill)+(op.forced?4:3));
      xf.stamina=clamp100(num(xf.stamina)-(op.forced?16:12));
      return;
    }
    case "pregSet": {
      var xg=ensureSex(S), wn=String(EV(op.name,S,vars,helpers));
      var cg=getClaim(S,wn); if(!cg){ cg=fullClaim(S,wn); xg.claims.push(cg); }
      cg.preg.state=op.state; cg.preg.ctrl=op.ctrl; if(op.child!==undefined)cg.preg.child=op.child; return;
    }
    case "claimAdd": {
      var xh=ensureSex(S), nh=String(EV(op.name,S,vars,helpers));
      var ch3=getClaim(S,nh);
      if(!ch3){ ch3=fullClaim(S,nh); xh.claims.push(ch3); if(xh.claims.length>8)xh.claims.shift(); }
      ch3.obedience=clamp100(ch3.obedience+(op.ob||0)); ch3.obsession=clamp100(ch3.obsession+(op.os||0));
      ch3.own=clamp100(ch3.own+Math.round((op.ob||0)*0.7));
      if(op.stage)ch3.stage=Math.max(ch3.stage,op.stage);
      return ch3;
    }
    case "claim": {
      var cn;
      if(op.ref==="$it")cn=(vars.$it&&vars.$it.name);
      else if(op.ref&&typeof op.ref==="object"&&op.ref.expr!==undefined)cn=String(E(op.ref.expr,S,vars,helpers));
      else cn=String(EV(op.ref,S,vars,helpers));
      var cx=getClaim(S,cn); if(!cx)throw new Error("no claim "+cn);
      setPath(cx,op.path,EV(op.value,S,vars,helpers)); return;
    }
    case "haremAlphaSet": { var xi=ensureSex(S); xi.alpha=String(EV(op.name,S,vars,helpers)); return; }
    case "haremAlphaClear": { var xj=ensureSex(S); xj.alpha=null; return; }
    case "netori": { var xk=ensureSex(S); xk.netori[op.field]=num(xk.netori[op.field])+num(typeof op.delta==="number"?op.delta:EV(op.delta,S,vars,helpers)); return; }
    case "lawNote": { var xl=ensureSex(S); xl.lawNote=String(EV(op.label,S,vars,helpers)); return; }
    case "tryPromote": case "call": {
      var fns=(api&&api.calls)||LLW.fxCalls||{};
      var fn=op.op==="tryPromote"?"career.tryPromote":op.fn;
      var impl=fns[fn];
      if(!impl)throw new Error("unknown call "+fn);
      var args=deepExpr(op.op==="tryPromote"?{why:op.why}:(op.args||{}),S,vars,helpers);
      var r=impl(S,args,{vars:vars,helpers:helpers});
      if(op.as)vars[op.as]=r;
      if(op.asOutcome)st.outcome=String(r).slice(0,600);
      return;
    }
  }
  throw new Error("unknown op "+op.op);
}

/* ---------- event compiler ---------- */
function compileText(t){
  if(typeof t==="string")return {lets:[],tpl:FX().parseTemplate(t)};
  return {lets:t.lets||[],tpl:FX().parseTemplate(t.template)};
}
function compileEvent(ev,api){
  var tx=compileText(ev.text);
  var cond=ev.preconditions||null;
  var choices=(ev.choices||[]).map(function(ch){
    var outs=(ch.effects||[]).filter(function(e){return e.op==="outcome";}).length;
    return {
      label:String(ch.label).slice(0,80), hint:String(ch.hint||"").slice(0,60),
      fx:function(S){
        var vars={};
        for(var i=0;i<tx.lets.length;i++)vars[tx.lets[i].name]=E(tx.lets[i].expr,S,vars,api&&api.helpers);
        var st=execList(ch.effects||[],S,vars,api||{},{outcome:"",stopped:false});
        return st.outcome;
      }
    };
  });
  return {
    id:ev.id, minAge:ev.minAge, maxAge:ev.maxAge, title:ev.title,
    tags:ev.tags||[], weight:ev.weight||1,
    cond:cond?function(S){ return testRule(cond,S,{},(api&&api.helpers)||defaultHelpers()); }:null,
    text:function(S){
      var vars={};
      for(var i=0;i<tx.lets.length;i++)vars[tx.lets[i].name]=E(tx.lets[i].expr,S,vars,(api&&api.helpers)||defaultHelpers());
      return FX().renderTemplate(tx.tpl,S,vars,(api&&api.helpers)||defaultHelpers());
    },
    choices:choices
  };
}

LLW.fxRun={
  CALL_NAMES:CALL_NAMES, PRED_NAMES:PRED_NAMES,
  testRule:testRule, execList:execList, compileEvent:compileEvent,
  ensureSex:ensureSex, getClaim:getClaim, fullClaim:fullClaim
};
})();

LL.files.push("effects-run"); /* end-of-file registration: counts as loaded only after this file fully ran */