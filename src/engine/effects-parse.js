/* LIFE & LEGACY — engine/effects-parse.js
 * PURE: safe expression grammar for content (values, templates, lets).
 * No DOM, no S-shape knowledge beyond path access. No dependencies.
 * Grammar: literals, paths (s.* / locals / $it), + - * / %, comparisons,
 * && || !, ternary, parens, array literals, whitelisted calls, a few methods.
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});

(function(){
var LLW = window.LL;

/* ---------- tokenizer ---------- */
var TOKEN_RE = /\s*(?:(\d+(?:\.\d+)?)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_$][\w$]*)|(===|!==|==|!=|>=|<=|&&|\|\||[+\-*/%<>()[\]{},:.?!]))/g;
function unquote(q){
  var quote=q[0], body=q.slice(1,-1);
  if(quote==='"')return JSON.parse(q);
  return body.replace(/\\'/g,"'").replace(/\\\\/g,"\\");
}
function tokenize(src){
  var toks=[], m;
  TOKEN_RE.lastIndex=0;
  var stripped=src;
  while((m=TOKEN_RE.exec(src))!==null){
    if(m[1]!==undefined)toks.push({t:"num",v:parseFloat(m[1])});
    else if(m[2]!==undefined)toks.push({t:"str",v:unquote(m[2])});
    else if(m[3]!==undefined){
      var w=m[3];
      if(w==="true"||w==="false")toks.push({t:"bool",v:w==="true"});
      else if(w==="null")toks.push({t:"null"});
      else toks.push({t:"id",v:w});
    }
    else toks.push({t:"op",v:m[4]});
  }
  // verify full consumption (catches ; ` \ etc.)
  var check=src.replace(TOKEN_RE,"").trim();
  if(check.length)throw new Error("bad token near "+JSON.stringify(check.slice(0,20)));
  return toks;
}

/* ---------- parser ---------- */
function Parser(toks, src){
  this.toks=toks; this.i=0; this.src=src;
}
Parser.prototype.peek=function(){ return this.toks[this.i]; };
Parser.prototype.next=function(){ return this.toks[this.i++]; };
Parser.prototype.expect=function(op){
  var t=this.next();
  if(!t||t.t!=="op"||t.v!==op)throw new Error("expected "+op+" in "+JSON.stringify(this.src).slice(0,80));
  return t;
};
Parser.prototype.parse=function(){
  var e=this.parseTern();
  if(this.i<this.toks.length)throw new Error("trailing tokens in "+JSON.stringify(this.src).slice(0,80));
  return e;
};
Parser.prototype.parseTern=function(){
  var c=this.parseOr(), t=this.peek();
  if(t&&t.t==="op"&&t.v==="?"){ this.next(); var a=this.parseTern(); this.expect(":"); var b=this.parseTern(); return {t:"tern",c:c,a:a,b:b}; }
  return c;
};
Parser.prototype.parseOr=function(){
  var e=this.parseAnd();
  while(this.peek()&&this.peek().t==="op"&&this.peek().v==="||"){ this.next(); e={t:"bin",op:"||",a:e,b:this.parseAnd()}; }
  return e;
};
Parser.prototype.parseAnd=function(){
  var e=this.parseEq();
  while(this.peek()&&this.peek().t==="op"&&this.peek().v==="&&"){ this.next(); e={t:"bin",op:"&&",a:e,b:this.parseEq()}; }
  return e;
};
Parser.prototype.parseEq=function(){
  var e=this.parseRel(), t;
  while((t=this.peek())&&t.t==="op"&&(t.v==="==="||t.v==="!=="||t.v==="=="||t.v==="!=")){ this.next(); e={t:"bin",op:t.v,a:e,b:this.parseRel()}; }
  return e;
};
Parser.prototype.parseRel=function(){
  var e=this.parseAdd(), t;
  while((t=this.peek())&&t.t==="op"&&(t.v===">"||t.v==="<"||t.v===">="||t.v==="<=")){ this.next(); e={t:"bin",op:t.v,a:e,b:this.parseAdd()}; }
  return e;
};
Parser.prototype.parseAdd=function(){
  var e=this.parseMul(), t;
  while((t=this.peek())&&t.t==="op"&&(t.v==="+"||t.v==="-")){ this.next(); e={t:"bin",op:t.v,a:e,b:this.parseMul()}; }
  return e;
};
Parser.prototype.parseMul=function(){
  var e=this.parseUn(), t;
  while((t=this.peek())&&t.t==="op"&&(t.v==="*"||t.v==="/"||t.v==="%")){ this.next(); e={t:"bin",op:t.v,a:e,b:this.parseUn()}; }
  return e;
};
Parser.prototype.parseUn=function(){
  var t=this.peek();
  if(t&&t.t==="op"&&(t.v==="!"||t.v==="-")){ this.next(); return {t:"un",op:t.v,a:this.parseUn()}; }
  return this.parsePrimary();
};
Parser.prototype.parsePrimary=function(){
  var t=this.next();
  if(!t)throw new Error("unexpected end in "+JSON.stringify(this.src).slice(0,80));
  if(t.t==="num")return {t:"num",v:t.v};
  if(t.t==="str")return {t:"str",v:t.v};
  if(t.t==="bool")return {t:"bool",v:t.v};
  if(t.t==="null")return {t:"null"};
  if(t.t==="op"&&t.v==="("){ var e=this.parseTern(); this.expect(")"); return this.parsePost(e); }
  if(t.t==="op"&&t.v==="["){
    var els=[];
    if(!(this.peek()&&this.peek().t==="op"&&this.peek().v==="]")){
      els.push(this.parseTern());
      while(this.peek()&&this.peek().t==="op"&&this.peek().v===","){ this.next(); els.push(this.parseTern()); }
    }
    this.expect("]");
    return this.parsePost({t:"arr",els:els});
  }
  if(t.t==="id"){
    var name=t.v, node;
    if(this.peek()&&this.peek().t==="op"&&this.peek().v==="("){
      this.next();
      var args=[];
      if(!(this.peek()&&this.peek().t==="op"&&this.peek().v===")")){
        args.push(this.parseTern());
        while(this.peek()&&this.peek().t==="op"&&this.peek().v===","){ this.next(); args.push(this.parseTern()); }
      }
      this.expect(")");
      node={t:"call",name:name,args:args};
    } else {
      node={t:"path",root:name,segs:[]};
    }
    return this.parsePost(node);
  }
  throw new Error("unexpected token "+JSON.stringify(t)+" in "+JSON.stringify(this.src).slice(0,80));
};
Parser.prototype.parsePost=function(node){
  var t;
  while((t=this.peek())&&t.t==="op"&&(t.v==="."||t.v==="[")){
    if(t.v==="."){
      this.next();
      var k=this.next();
      if(!k||k.t!=="id")throw new Error("expected property name in "+JSON.stringify(this.src).slice(0,80));
      var meth=null;
      if(this.peek()&&this.peek().t==="op"&&this.peek().v==="("){
        this.next();
        var args=[];
        if(!(this.peek()&&this.peek().t==="op"&&this.peek().v===")")){
          args.push(this.parseTern());
          while(this.peek()&&this.peek().t==="op"&&this.peek().v===","){ this.next(); args.push(this.parseTern()); }
        }
        this.expect(")");
        meth={name:k.v,args:args};
      }
      node={t:"acc",obj:node,key:{t:"str",v:k.v},meth:meth};
    } else {
      this.next();
      var ix=this.parseTern();
      this.expect("]");
      node={t:"acc",obj:node,key:ix,meth:null};
    }
  }
  return node;
};
function parseExpr(src){
  if(typeof src!=="string"||!src.trim())throw new Error("empty expression");
  return new Parser(tokenize(src), src).parse();
}

/* ---------- evaluator ---------- */
var CALLS = {
  rnd:{n:0}, clamp:{n:"1-3"}, min:{n:"1+"}, max:{n:"1+"},
  floor:{n:1}, round:{n:1}, ceil:{n:1}, len:{n:1}, keys:{n:1}, topKey:{n:1},
  randName:{n:0}, partnerName:{n:0},
  childInAge:{n:2}, claimWhere:{n:3}, lastClaim:{n:0}, topClaim:{n:1},
  firstName:{n:0}, lastName:{n:0},
  where:{n:4}, whereAll:{n:4}, whereLast:{n:"4-7"}, topBy:{n:2}, lowBy:{n:2}, topKeys:{n:"1-2"},
  firstWhereMap:{n:"4-5"}, hasClaim:{n:1}, alphaName:{n:0}, haremCount:{n:0}
};
function isObj(v){ return v!==null&&typeof v==="object"; }
function toNum(v){ var n=Number(v); return isFinite(n)?n:0; }
function evalNode(node, ctx){
  switch(node.t){
    case "num": case "str": case "bool": return node.v;
    case "null": return null;
    case "arr": return node.els.map(function(e){ return evalNode(e,ctx); });
    case "un": {
      var a=evalNode(node.a,ctx);
      return node.op==="!"?!a:-toNum(a);
    }
    case "bin": {
      var op=node.op;
      if(op==="&&"){ var av=evalNode(node.a,ctx); return av?evalNode(node.b,ctx):av; }
      if(op==="||"){ var bv=evalNode(node.a,ctx); return bv?bv:evalNode(node.b,ctx); }
      var x=evalNode(node.a,ctx), y=evalNode(node.b,ctx);
      switch(op){
        case "+": return (typeof x==="string"||typeof y==="string")?String(x)+String(y):toNum(x)+toNum(y);
        case "-": return toNum(x)-toNum(y);
        case "*": return toNum(x)*toNum(y);
        case "/": return toNum(y)?toNum(x)/toNum(y):0;
        case "%": return toNum(y)?toNum(x)%toNum(y):0;
        case ">": return x>y; case "<": return x<y;
        case ">=": return x>=y; case "<=": return x<=y;
        case "===": return x===y; case "!==": return x!==y;
        case "==": return x==y; case "!=": return x!=y;
      }
      throw new Error("bad op "+op);
    }
    case "tern": return evalNode(node.c,ctx)?evalNode(node.a,ctx):evalNode(node.b,ctx);
    case "path": {
      var base;
      if(node.root==="s")base=ctx.S;
      else if(node.root==="$it"||node.root==="it")base=ctx.it;
      else if(ctx.vars&&Object.prototype.hasOwnProperty.call(ctx.vars,node.root))base=ctx.vars[node.root];
      else throw new Error("unknown name "+node.root);
      return applySegs(base,node.segs,ctx);
    }
    case "acc": {
      var o=evalNode(node.obj,ctx);
      var k=evalNode(node.key,ctx);
      var val=(o==null)?undefined:o[k];
      if(node.meth){
        var margs=node.meth.args.map(function(a){ return evalNode(a,ctx); });
        return callMethod(val,o,node.meth.name,margs);
      }
      return val;
    }
    case "call": return callFn(node.name,node.args.map(function(a){ return evalNode(a,ctx); }),ctx);
  }
  throw new Error("bad node");
}
function applySegs(base,segs,ctx){
  var v=base;
  for(var i=0;i<segs.length;i++){
    if(v==null)return undefined;
    v=v[segs[i]];
  }
  return v;
}
function callMethod(val,host,name,args){
  if(name==="join"&&Array.isArray(host))return host.join(args.length?String(args[0]):",");
  if(name==="includes"&&(Array.isArray(host)||typeof host==="string"))return host.includes(args[0]);
  if(name==="indexOf"&&(Array.isArray(host)||typeof host==="string"))return host.indexOf(args[0]);
  if(name==="slice"&&(Array.isArray(host)||typeof host==="string")){
    var s=args.length?Math.floor(toNum(args[0])):0, e=args.length>1?Math.floor(toNum(args[1])):undefined;
    return e===undefined?host.slice(s):host.slice(s,e);
  }
  if(name==="toLocaleString"&&(typeof host==="number"))return host.toLocaleString("en-US");
  throw new Error("method not allowed: "+name);
}
function callFn(name,args,ctx){
  var H=ctx.helpers||{};
  switch(name){
    case "rnd": return H.rnd?H.rnd():Math.random();
    case "clamp": { var x=toNum(args[0]),a=args.length>1?toNum(args[1]):0,b=args.length>2?toNum(args[2]):100; x=Math.round(x); return x<a?a:(x>b?b:x); }
    case "min": return Math.min.apply(null,args.map(toNum));
    case "max": return Math.max.apply(null,args.map(toNum));
    case "floor": return Math.floor(toNum(args[0]));
    case "round": return Math.round(toNum(args[0]));
    case "ceil": return Math.ceil(toNum(args[0]));
    case "len": return Array.isArray(args[0])?args[0].length:0;
    case "keys": return isObj(args[0])?Object.keys(args[0]):[];
    case "topKey": {
      var o=args[0]; if(!isObj(o))return "";
      var best="",bv=-Infinity;
      for(var k in o){ var n=toNum(o[k]); if(n>bv){bv=n;best=k;} }
      return best;
    }
    case "randName": if(H.randName)return H.randName(); throw new Error("randName unavailable");
    case "partnerName": if(H.partnerName)return H.partnerName(); throw new Error("partnerName unavailable");
    case "childInAge": {
      var ch=(ctx.S&&ctx.S.relationships&&ctx.S.relationships.children)||[];
      for(var i=0;i<ch.length;i++){ var a=ch[i]&&ch[i].age; if(a>=toNum(args[0])&&a<=toNum(args[1]))return ch[i]; }
      return null;
    }
    case "claimWhere": {
      var cl=(ctx.S&&ctx.S.sex&&ctx.S.sex.claims)||[];
      var f=args[0],op=args[1],v=args[2];
      for(var j=0;j<cl.length;j++){ if(cmp(toNum(cl[j][f]),op,toNum(v)))return cl[j]; }
      return null;
    }
    case "lastClaim": {
      var cl2=(ctx.S&&ctx.S.sex&&ctx.S.sex.claims)||[];
      return cl2.length?cl2[cl2.length-1]:null;
    }
    case "topClaim": {
      var cl3=(ctx.S&&ctx.S.sex&&ctx.S.sex.claims)||[],f3=args[0];
      var bk=null,bn=-Infinity;
      for(var q=0;q<cl3.length;q++){ var n3=toNum(cl3[q][f3]); if(n3>bn){bn=n3;bk=cl3[q];} }
      return bk;
    }
    case "firstName": return (ctx.S&&ctx.S.firstName)||"";
    case "lastName": return (ctx.S&&ctx.S.lastName)||"";
    case "where": return whereFirst(args[0],args[1],args[2],args[3]);
    case "whereAll": return whereAll(args[0],args[1],args[2],args[3]);
    case "topBy": {
      var ab=args[0]; if(!Array.isArray(ab)||!ab.length)return null;
      var bf=null,bv=-Infinity;
      for(var qi=0;qi<ab.length;qi++){ var nq=toNum(ab[qi][args[1]]); if(nq>bv){bv=nq;bf=ab[qi];} }
      return bf;
    }
    case "lowBy": {
      var lb=args[0]; if(!Array.isArray(lb)||!lb.length)return null;
      var lf=null,lv=Infinity;
      for(var qj=0;qj<lb.length;qj++){ var nq2=toNum(lb[qj][args[1]]); if(nq2<lv){lv=nq2;lf=lb[qj];} }
      return lf;
    }
    case "topKeys": {
      var o2=args[0], n2=args.length>1?Math.floor(toNum(args[1])):1;
      if(!isObj(o2))return [];
      return Object.keys(o2).sort(function(a,b){ return toNum(o2[b])-toNum(o2[a]); }).slice(0,n2);
    }
    case "hasClaim": {
      var cl4=(ctx.S&&ctx.S.sex&&ctx.S.sex.claims)||[];
      for(var qk=0;qk<cl4.length;qk++)if(cl4[qk]&&cl4[qk].name===args[0])return true;
      return false;
    }
    case "alphaName": {
      var x5=ctx.S&&ctx.S.sex;
      if(!x5)return null;
      if(x5.alpha&&hasClaimName(x5,x5.alpha))return x5.alpha;
      for(var qm=0;qm<(x5.claims||[]).length;qm++)if(x5.claims[qm]&&x5.claims[qm].rank===0)return x5.claims[qm].name;
      var bb=null,bn2=-Infinity;
      for(var qn=0;qn<(x5.claims||[]).length;qn++){ var n5=toNum(x5.claims[qn]&&x5.claims[qn].own); if(n5>bn2){bn2=n5;bb=x5.claims[qn];} }
      return bb?bb.name:null;
    }
    case "haremCount": {
      var x6=ctx.S&&ctx.S.sex;
      if(!x6||!Array.isArray(x6.claims))return 0;
      var c6=0; for(var qo=0;qo<x6.claims.length;qo++)if(x6.claims[qo]&&x6.claims[qo].stage>=1)c6++;
      return c6;
    }
    case "whereLast": {
      var wa=args[0]; if(!Array.isArray(wa))return null;
      var f1=args[1],o1=args[2],v1=args[3],f2=args[4],o2=args[5],v2=args[6];
      var bk=null;
      for(var qw=0;qw<wa.length;qw++){
        var it=wa[qw]; if(!it)continue;
        if(cmpField(it[f1],o1,v1)||(o2!==undefined&&cmpField(it[f2],o2,v2)))bk=it;
      }
      return bk;
    }
    case "firstWhereMap": {
      // first element k of arr with cmpField(map[k],op,val) (negated when args[4] truthy).
      // Missing map entries count as -Infinity (matches legacy !(undefined>N) === true).
      var fa=args[0]; if(!Array.isArray(fa))return null;
      var fm=(args[1]&&typeof args[1]==="object")?args[1]:{};
      var fo=args[2],fv=args[3],fneg=args.length>4?!!args[4]:false;
      for(var qf=0;qf<fa.length;qf++){
        var kk=fa[qf], mv=(kk!==undefined&&fm[kk]!==undefined)?fm[kk]:-Infinity;
        var ok=cmpField(mv,fo,fv); if(fneg)ok=!ok;
        if(ok)return kk;
      }
      return null;
    }
  }
  throw new Error("call not allowed: "+name);
}
function hasClaimName(x,name){
  for(var i=0;i<(x.claims||[]).length;i++)if(x.claims[i]&&x.claims[i].name===name)return true;
  return false;
}
function whereFirst(arr,field,op,val){
  if(!Array.isArray(arr))return null;
  for(var i=0;i<arr.length;i++){ if(cmpField(arr[i]&&arr[i][field],op,val))return arr[i]; }
  return null;
}
function whereAll(arr,field,op,val){
  var out=[];
  if(!Array.isArray(arr))return out;
  for(var i=0;i<arr.length;i++){ if(cmpField(arr[i]&&arr[i][field],op,val))out.push(arr[i]); }
  return out;
}
function cmpField(x,op,y){
  switch(op){
    case "gt":return x>y; case "gte":return x>=y; case "lt":return x<y;
    case "lte":return x<=y; case "eq":return x===y; case "ne":return x!==y;
    case "includes": if(Array.isArray(x))return x.indexOf(y)>=0; if(typeof x==="string")return x.indexOf(y)>=0; return false;
  }
  throw new Error("bad where op "+op);
}
function cmp(x,op,y){
  switch(op){ case "gt":return x>y; case "gte":return x>=y; case "lt":return x<y; case "lte":return x<=y; case "eq":return x===y; case "ne":return x!==y; }
  throw new Error("bad claimWhere op "+op);
}
function evalExpr(src,S,vars,helpers){
  return evalNode(parseExpr(src),{S:S,vars:vars||{},helpers:helpers||{}});
}

/* ---------- templates ---------- */
function parseTemplate(src){
  var parts=[],i=0;
  while(true){
    var a=src.indexOf("{{",i);
    if(a<0){ parts.push(src.slice(i)); break; }
    var b=src.indexOf("}}",a+2);
    if(b<0)throw new Error("unclosed {{ in template");
    parts.push(src.slice(i,a));
    parts.push({expr:src.slice(a+2,b)});
    i=b+2;
  }
  // pre-parse exprs so authoring errors surface at build/validate time
  for(var k=0;k<parts.length;k++)if(typeof parts[k]!=="string")parts[k].ast=parseExpr(parts[k].expr);
  return parts;
}
function renderTemplate(parts,S,vars,helpers){
  if(typeof parts==="string")parts=parseTemplate(parts);
  var out="";
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    if(typeof p==="string")out+=p;
    else{
      var v=evalNode(p.ast,{S:S,vars:vars||{},helpers:helpers||{}});
      out+=(v===undefined||v===null)?"":String(v);
    }
  }
  return out;
}

LLW.fxParse={
  parseExpr:parseExpr, evalExpr:evalExpr,
  parseTemplate:parseTemplate, renderTemplate:renderTemplate,
  CALLS:Object.keys(CALLS)
};
})();

LL.files.push("effects-parse"); /* end-of-file registration: counts as loaded only after this file fully ran */