/* LIFE & LEGACY — engine/effects-validate.js
 * PURE (no DOM): content validator for src/content/*.json (user requirement:
 * "a simple content validator (checks every event has required fields and valid effects)").
 * Classic script. Uses LL.fxParse (effects-parse.js) + LL.fxRun allowlists
 * (effects-run.js) when loaded; falls back to syntactic checks alone.
 * Runners: src/tools/validate-content.js (worker, thorough incl. index +
 * fallback freshness) or page console: LL.fxValidate.validateEvent(ev).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
(function(){
var LLW = window.LL;

var STAT_KEYS = ["health","happiness","smarts","looks","fitness","discipline","creativity","social","karma"];
/* Top-level S containers (objects/arrays, never scalars). A value comparison
 * against one of these is always vacuous (an object is never >= a number) —
 * the author meant a leaf path such as stats.discipline. exists/truthy/
 * includes stay legal (company truthy, traits includes). some.arr must be an
 * actual array path, so it gets the narrower non-array denylist instead. */
var CONTAINER_PATHS = ["stats","relationships","sex","company","underworld","assets","education","flags","appearance","perYear","ach","world","groomed","traits","log","netHist","hapHist","focusList","customFocuses","chatImg"];
var NON_ARRAY_PATHS = ["stats","relationships","sex","company","underworld","assets","education","flags","appearance","perYear","ach","world","groomed"];
/* op -> [required fields]. expr/rule fields are checked structurally below. */
var OPS = {
  "let":["name","expr"], "outcome":["tpl"], "returnIf":["cond","outcome"],
  "branch":["cond","then"], "chance":["p","then"], "forClaims":["body"],
  "forChildren":["body"], "call":["fn"], "tryPromote":["why"],
  "stat":["key","delta"], "money":["amount"], "set":["path","value"],
  "flag":["key","value"], "edu":["path","value"], "grades":["delta"],
  "salary":["value"], "perf":["delta"], "jobSet":["id"], "jobLose":[],
  "partnerRel":["delta"], "partnerMarry":[], "partnerClear":[], "partnerSet":["name"],
  "addPet":["name"], "addChild":["name"], "addFriend":["name"],
  "childPath":["path","value"], "claimPath":["path","value"],
  "claimSplice":["index"], "claimRemove":["ref"], "claimPop":[], "claimsClear":[],
  "arrPush":["target","value"], "setv":["target","path","value"], "claim":["ref","path"],
  "crewAdd":[], "crewDrop":[], "kink":["id"], "corr":["delta"], "xp":["n"],
  "skill":["delta"], "stamina":["delta"], "protection":["bool"],
  "scandal":["delta"], "addiction":["delta"], "pregScares":[], "sexset":["path","value"],
  "lovAdd":["name"], "lovPush":["name"], "lovClear":[],
  "levOn":["target","secret"], "levOff":["holder","secret"], "levOnClear":[],
  "histLog":["name","acts"], "pregSet":["name","state","ctrl"], "claimAdd":["name"],
  "netori":["field","delta"], "haremAlphaSet":["name"], "haremAlphaClear":[],
  "lawNote":["label"]
};
/* fields holding expr STRINGS (parsed with fxParse) per op; "tpl" fields are templates. */
var EXPR_FIELDS = ["expr","value","amount","delta","n","index","why","p","name",
  "target","secret","holder","label","rel","age","ob","os","stage","mult","ctrl",
  "via","state","child","field","path", "as", "ref"];
var RULE_FIELDS = ["cond","match"];
var PATH_RE = /^[A-Za-z_$][\w$]*(\.(?:[A-Za-z_$][\w$]*|\d+))*$/;
var PATH_REL_RE = /^(?:[A-Za-z_$][\w$]*|\d+)(\.(?:[A-Za-z_$][\w$]*|\d+))*$/;
/* full JS-shape ban for exprs; prose-safe subset for templates (semicolons are legal prose). */
var JS_RE = /(^|[^A-Za-z_$])(function|new\s+[A-Z]|window|document|eval\s*\(|__proto__|constructor|process|require\s*\(|import\s*\()/;
var JS_TPL_RE = /`|=>|\bfunction\s*\(|window\.[A-Za-z_$]|document\.[A-Za-z_$]|eval\s*\(|\$\{(?!\{)/;
/* Bare-call allowlist: every name callFn (effects-parse.js) can execute.
 * checkExpr/checkTemplate reject anything else — a typo like `typeofs(`
 * used to sail through validation and crash the live game instead. */
var EXPR_FNS = ["rnd","clamp","min","max","floor","round","ceil","len","keys",
  "topKey","randName","partnerName","childInAge","claimWhere","lastClaim",
  "topClaim","firstName","lastName","where","whereAll","topBy","lowBy",
  "topKeys","hasClaim","alphaName","haremCount","whereLast","firstWhereMap"];
var EXPR_KW = ["if","else","true","false","null","undefined","typeof","in","of","new"];
function checkExprCalls(s, errs, where, fns){
  if(typeof s!=="string")return;
  var allow=fns||EXPR_FNS;
  var re=/([A-Za-z_$][\w$]*)\s*\(/g, m;
  while((m=re.exec(s))){
    var i=m.index;
    if(i>0&&/[\w$.]/.test(s.charAt(i-1)))continue; /* method call, not a bare call */
    if(allow.indexOf(m[1])<0&&EXPR_KW.indexOf(m[1])<0)
      errs.push(where+": unknown function "+m[1]);
  }
}
/* AST walk: unknown path roots + unknown calls/methods are guaranteed runtime
 * throws ("unknown name X" / "call not allowed"). vars = let-names bound
 * anywhere in the event (two-pass collection in validateEvent). */
var EXPR_ROOTS = ["s","it","$it"];
var EXPR_METHODS = ["join","includes","indexOf","slice","toLocaleString"];
function checkAst(node, errs, where, vars, fns){
  function walk(n){
    if(!n||typeof n!=="object")return;
    if(n.t==="path"){
      if(EXPR_ROOTS.indexOf(n.root)<0&&(vars||[]).indexOf(n.root)<0)
        errs.push(where+": unknown name "+n.root);
      (n.segs||[]).forEach(function(sg){ if(sg&&typeof sg==="object")walk(sg); });
      return;
    }
    if(n.t==="call"){
      if(fns.indexOf(n.name)<0)errs.push(where+": unknown function "+n.name);
      (n.args||[]).forEach(walk); return;
    }
    if(n.t==="acc"){
      walk(n.obj); walk(n.key);
      if(n.meth){
        if(EXPR_METHODS.indexOf(n.meth.name)<0)errs.push(where+": unknown method "+n.meth.name);
        (n.meth.args||[]).forEach(walk);
      }
      return;
    }
    ["a","b","c"].forEach(function(k){ if(n[k]&&typeof n[k]==="object")walk(n[k]); });
    if(n.els)for(var i=0;i<n.els.length;i++)walk(n.els[i]);
  }
  walk(node);
}

function isObj(v){ return v!==null && typeof v==="object" && !Array.isArray(v); }
function isLit(v){ return v===null || typeof v==="string" || typeof v==="number" || typeof v==="boolean"; }

function checkNoJS(s, errs, where, isTemplate){
  if(typeof s!=="string")return;
  if(isTemplate){
    if(JS_TPL_RE.test(s))errs.push(where+": looks like JS ("+s.slice(0,50)+")");
    return;
  }
  if(s.indexOf("`")>=0)errs.push(where+": backtick in content string");
  if(s.indexOf(";")>=0)errs.push(where+": semicolon in content string");
  if(JS_RE.test(s))errs.push(where+": looks like JS ("+s.slice(0,50)+")");
}
function checkExpr(e, errs, where, P, vars){
  if(typeof e!=="string"||!e){ errs.push(where+": empty expr"); return; }
  checkNoJS(e, errs, where);
  var fns=(P&&P.CALLS)||EXPR_FNS;
  checkExprCalls(e, errs, where, fns);
  if(P){ try{ var ast=P.parseExpr(e); checkAst(ast,errs,where,vars||[],fns); }catch(err){ errs.push(where+": bad expr "+e.slice(0,60)+" ("+err.message+")"); } }
}
function checkTemplate(t, errs, where, P, vars){
  if(typeof t!=="string"){ errs.push(where+": template not a string"); return; }
  checkNoJS(t, errs, where, true);
  if(P){ try{ P.parseTemplate(t); }catch(err){ errs.push(where+": bad template ("+err.message+")"); } }
  try{
    var fns2=(P&&P.CALLS)||EXPR_FNS;
    var parts=String(t).split("{{");
    for(var i=1;i<parts.length;i++){
      var seg=parts[i].split("}}")[0];
      checkExprCalls(seg, errs, where, fns2);
      if(P){ try{ checkAst(P.parseExpr(seg),errs,where,vars||[],fns2); }catch(e){} }
    }
  }catch(e){}
}
function checkCallArg(v, errs, where, P, depth, vars){
  if(depth>4){ errs.push(where+": call arg too deep"); return; }
  if(isLit(v))return;
  if(Array.isArray(v)){ v.forEach(function(x,i){ checkCallArg(x,errs,where+"["+i+"]",P,depth+1,vars); }); return; }
  if(isObj(v)){
    var ks=Object.keys(v);
    if(ks.length===1&&ks[0]==="expr"){ checkExpr(v.expr,errs,where,P,vars); return; }
    ks.forEach(function(k){ checkCallArg(v[k],errs,where+"."+k,P,depth+1,vars); });
    return;
  }
  errs.push(where+": bad call arg");
}
function checkRule(r, errs, where, P, CALLS, PREDS, vars){
  if(r===null||r===undefined)return;
  if(!isObj(r)){ errs.push(where+": rule not an object"); return; }
  var ks=Object.keys(r);
  /* leaf: {p|v|$it: path, <comparator>: literal} */
  if(ks.indexOf("p")>=0||ks.indexOf("v")>=0||ks.indexOf("$it")>=0){
    var pk=ks.indexOf("p")>=0?"p":(ks.indexOf("v")>=0?"v":"$it");
    var path=r[pk];
    if(typeof path!=="string")errs.push(where+": bad rule path");
    else{
      var norm=path.replace(/^\$it(\.|$)/,"it$1");
      if(!/^([A-Za-z_$][\w$]*|\d+)(\.([A-Za-z_$][\w$]*|\d+))*$/.test(norm))errs.push(where+": bad rule path "+path);
    }
    var cmps=ks.filter(function(k){ return k!==pk; });
    if(!cmps.length)errs.push(where+": leaf rule without comparator");
    cmps.forEach(function(op){
      if(["eq","ne","gt","gte","lt","lte","in","includes","exists","truthy"].indexOf(op)<0)
        errs.push(where+": bad rule comparator "+op);
      else if(r[op]!==undefined&&!isLit(r[op])&&!Array.isArray(r[op]))
        errs.push(where+": rule."+op+" must be literal");
    });
    if(pk==="p"&&typeof path==="string"&&CONTAINER_PATHS.indexOf(path)>=0
      &&cmps.some(function(op){ return ["eq","ne","gt","gte","lt","lte","in"].indexOf(op)>=0; }))
      errs.push(where+": compares the whole '"+path+"' object; use a leaf path (e.g. stats.discipline)");
    return;
  }
  if(ks.length!==1){ errs.push(where+": rule must have exactly one key"); return; }
  var k=ks[0];
  if(k==="all"||k==="any"){ (r[k]||[]).forEach(function(x,i){ checkRule(x,errs,where+"."+k+"["+i+"]",P,CALLS,PREDS,vars); }); return; }
  if(k==="not"){ checkRule(r[k],errs,where+".not",P,CALLS,PREDS,vars); return; }
  if(k==="call"){ if(PREDS.indexOf(r[k])<0)errs.push(where+": unknown predicate "+r[k]); return; }
  if(k==="partner"){ if(["exists","single","dating","married","lover"].indexOf(r[k])<0)errs.push(where+": bad partner rule"); return; }
  if(k==="job"){ if(r[k]!=="employed")errs.push(where+": bad job rule"); return; }
  if(k==="jailed"){ return; }
  if(k==="expr"){ checkExpr(r[k],errs,where,P,vars); return; }
  if(k==="someChild"){ return; }
  if(k==="some"){
    if(!isObj(r.some)||typeof r.some.arr!=="string")errs.push(where+": bad some.arr");
    else if(!PATH_RE.test(r.some.arr))errs.push(where+": bad some.arr path");
    else if(NON_ARRAY_PATHS.indexOf(r.some.arr)>=0)errs.push(where+": some.arr '"+r.some.arr+"' is not an array");
    checkRule(r.some.where,errs,where+".some.where",P,CALLS,PREDS,vars); return;
  }
  if(k==="count"){
    var c=r.count;
    if(!isObj(c)||typeof c.arr!=="string"||typeof c.field!=="string")errs.push(where+": bad count rule");
    return;
  }
  errs.push(where+": unknown rule key "+k);
}
function checkEffect(e, errs, where, P, CALLS, PREDS, vars){
  if(!isObj(e)||typeof e.op!=="string"){ errs.push(where+": effect without op"); return; }
  if(!OPS[e.op]){ errs.push(where+": unknown op "+e.op); return; }
  OPS[e.op].forEach(function(f){
    if(e[f]===undefined)errs.push(where+"["+e.op+"]: missing field "+f);
  });
  if(e.op==="stat"&&(STAT_KEYS.indexOf(e.key)<0&&e.key!=="stress"))errs.push(where+": bad stat key "+e.key);
  if(e.op==="kink"&&(typeof e.id!=="string"||!e.id))errs.push(where+": bad kink id");
  if(e.op==="call"&&CALLS.indexOf(e.fn)<0)errs.push(where+": unknown call "+e.fn);
  if(e.op==="call"&&e.args!==undefined){
    if(!isObj(e.args))errs.push(where+": call args not an object");
    else Object.keys(e.args).forEach(function(k){ checkCallArg(e.args[k],errs,where+".args."+k,P,0,vars); });
  }
  if(e.op==="histLog"&&!Array.isArray(e.acts))errs.push(where+": histLog acts not an array");
  if(e.op==="histLog"&&(e.acts||[]).forEach) e.acts.forEach(function(a,i){
    if(typeof a!=="string")errs.push(where+": histLog acts["+i+"] not a string");
    else checkExpr(a,errs,where+".acts["+i+"]",P,vars);
  });
  ["then","else","body"].forEach(function(b){
    if(e[b]!==undefined){
      if(!Array.isArray(e[b]))errs.push(where+"["+e.op+"]."+b+" not an effect list");
      else e[b].forEach(function(x,i){ checkEffect(x,errs,where+"."+b+"["+i+"]",P,CALLS,PREDS,vars); });
    }
  });
  RULE_FIELDS.forEach(function(f){
    if(e[f]!==undefined)checkRule(e[f],errs,where+"."+f,P,CALLS,PREDS,vars);
  });
  Object.keys(e).forEach(function(f){
    if(f==="op"||f==="then"||f==="else"||f==="body"||f==="args"||f==="acts")return;
    if(RULE_FIELDS.indexOf(f)>=0||f==="cond"){ return; }
    if(f==="as")return; /* binding, not an expression (collected as a let-name) */
    var v=e[f];
    if(f==="field"&&e.op==="netori"){ /* literal netori counter key, not an expression */
      if(["taken","lost","revenges"].indexOf(v)<0)errs.push(where+".field: bad netori counter "+String(v).slice(0,40));
      return;
    }
    if(f==="tpl"){ checkTemplate(v,errs,where+".tpl",P,vars); return; }
    if(f==="outcome"){ checkTemplate(v,errs,where+".outcome",P,vars); return; }
    if(EXPR_FIELDS.indexOf(f)>=0){
      if(f==="path"){
        var rel=(e.op==="setv"||e.op==="childPath"||e.op==="claimPath");
        var okP=typeof v==="string"&&(rel?PATH_REL_RE:PATH_RE).test(v);
        if(!okP)errs.push(where+"."+f+": bad path "+String(v).slice(0,40));
        return;
      }
      if(isLit(v)&&typeof v!=="string")return; /* numbers/bools pass through EV */
      if(typeof v==="string"){ checkExpr(v,errs,where+"."+f,P,vars); return; }
      if(isObj(v)&&typeof v.expr==="string"){ checkExpr(v.expr,errs,where+"."+f,P,vars); return; }
      if(isLit(v))return;
      errs.push(where+"."+f+": bad value type");
    }
  });
}
function validateEvent(ev, api){
  api=api||{};
  var P=api.parse||(LLW.fxParse||null);
  var CALLS=api.calls||((LLW.fxRun&&LLW.fxRun.CALL_NAMES)||[]);
  var PREDS=(LLW.fxRun&&LLW.fxRun.PRED_NAMES)||[];
  var errs=[];
  var id=typeof ev.id==="string"?ev.id:"?";
  if(typeof ev.id!=="string"||!ev.id)errs.push("id: missing");
  if(api.expectedId&&ev.id!==api.expectedId)errs.push("id: mismatch "+ev.id+" vs file "+api.expectedId);
  if(typeof ev.title!=="string"||!ev.title)errs.push(id+": bad title");
  if(!Number.isInteger(ev.minAge)||!Number.isInteger(ev.maxAge)||ev.minAge<0||ev.maxAge>120||ev.minAge>ev.maxAge)
    errs.push(id+": bad age range");
  if(!Array.isArray(ev.tags)||!ev.tags.length||ev.tags.some(function(t){return typeof t!=="string";}))
    errs.push(id+": bad tags");
  if(!Number.isInteger(ev.weight)||ev.weight<1||ev.weight>10)errs.push(id+": bad weight");
  checkRule(ev.preconditions==null?null:ev.preconditions,errs,id+".preconditions",P,CALLS,(LLW.fxRun&&LLW.fxRun.PRED_NAMES)||[],[]);
  /* two-pass let collection: every let-name bound anywhere in the event
   * (text lets + op-let effects) is a legal expr root alongside s/it. */
  var letNames=[];
  function collectLets(list){
    (list||[]).forEach(function(x){
      if(!x||typeof x!=="object")return;
      if(x.op==="let"&&typeof x.name==="string"&&letNames.indexOf(x.name)<0)letNames.push(x.name);
      if(typeof x.as==="string"&&letNames.indexOf(x.as)<0)letNames.push(x.as); /* `as` binds the op result */
      if(typeof x.idxAs==="string"&&letNames.indexOf(x.idxAs)<0)letNames.push(x.idxAs); /* `idxAs` binds the loop index */
      ["then","else","body"].forEach(function(b){
        if(Array.isArray(x[b]))collectLets(x[b]);
      });
    });
  }
  if(ev.text&&typeof ev.text==="object"&&Array.isArray(ev.text.lets))
    ev.text.lets.forEach(function(L){ if(L&&typeof L.name==="string"&&letNames.indexOf(L.name)<0)letNames.push(L.name); });
  (ev.choices||[]).forEach(function(ch){ if(ch)collectLets(ch.effects); });
  (function(){
    var t=ev.text, w=id+".text";
    if(typeof t==="string"){ checkTemplate(t,errs,w,P,letNames); return; }
    if(isObj(t)&&Array.isArray(t.lets)&&typeof t.template==="string"){
      t.lets.forEach(function(L,i){
        if(!isObj(L)||typeof L.name!=="string"||typeof L.expr!=="string")errs.push(w+".lets["+i+"]: bad let");
        else checkExpr(L.expr,errs,w+".lets["+i+"]",P,letNames);
      });
      checkTemplate(t.template,errs,w,P,letNames); return;
    }
    errs.push(w+": bad text shape");
  })();
  if(!Array.isArray(ev.choices)||!ev.choices.length||ev.choices.length>4)errs.push(id+": choices 1..4");
  else ev.choices.forEach(function(ch,ci){
    var w=id+".choices["+ci+"]";
    if(typeof ch.label!=="string"||!ch.label)errs.push(w+": bad label");
    if(typeof ch.hint!=="string")errs.push(w+": bad hint");
    if(!Array.isArray(ch.effects)||!ch.effects.length)errs.push(w+": no effects");
    else{
      ch.effects.forEach(function(x,i){ checkEffect(x,errs,w+".effects["+i+"]",P,CALLS,PREDS,letNames); });
      var last=ch.effects[ch.effects.length-1];
      if(!(last.op==="outcome"||last.asOutcome||last.op==="returnIf"||last.op==="chance"||last.op==="branch"))
        errs.push(w+": choice without terminal outcome");
    }
  });
  return errs;
}
LLW.fxValidate={ validateEvent:validateEvent, OPS:Object.keys(OPS), STAT_KEYS:STAT_KEYS };
})();

LL.files.push("effects-validate"); /* end-of-file registration: counts as loaded only after this file fully ran */