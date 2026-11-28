/* LIFE & LEGACY — src/tools/build-events.js
 * Transpiler: src/events.js (JS authoring format) -> src/content/events/*.json
 * + src/content/packs/*.json (generated) + src/content/index.json + fallback.
 *
 * WHY: events are authored as JS closures for velocity, but the shipped game
 * reads ONLY data (SCHEMA.md). This build step converts each event/choice
 * into declarative ops the interpreter (effects-run.js) executes. Run after
 * editing src/events.js and before validating/playing.
 *
 * HOW TO RUN (worker with workspace fs + acorn):
 *   const acorn = await import('https://esm.sh/acorn@8.12.0');
 *   const code = await fs.readTextFile('src/tools/build-events.js');
 *   const build = new Function('acorn','fs', code + '\nreturn buildEvents;')(acorn, fs);
 *   const rep = await build({write:false});   // dry run: residue report only
 *   const rep2 = await build({write:true});   // writes content files (only when residue is empty)
 *
 * DEDUP LAYOUT (no acorn needed — operates on the JSON files directly):
 *   const build = new Function('fs', code + '\nreturn buildEvents;')(fs);
 *   const rep = await build.dedupeAdultPacks({write:false}); // dry run: equivalence proof + pack sizes
 *   const rep2 = await build.dedupeAdultPacks({write:true});  // writes 8 packs + index.json + fallback
 * (src/events.js is gone — legacy authoring source removed after cutover — so
 * the transpiler driver above is dormant; dedupeAdultPacks is the live path.)
 *
 * Purity contract: the printer/emitters below only ever emit the safe DSL
 * (literals, s-paths, lets, whitelisted calls, known ops/rules). Anything the
 * mappers cannot prove safe is collected into rep.residue (event id + source)
 * and NOT silently approximated — fix the mapper or add a named call.
 */
"use strict";
/* runner injects acorn + fs via `new Function('acorn','fs', code+'\nreturn buildEvents;')` */
let SRC_TXT = '';
function slice(n) { return SRC_TXT.slice(n.start, n.end); }
async function buildEvents(opts) {
opts = opts || {};
const SRC = 'src/events.js';
const OUT_EVENTS = 'src/content/events';
const OUT_PACKS = 'src/content/packs';
SRC_TXT = await fs.readTextFile(SRC);
const ast = acorn.parse(SRC_TXT, { ecmaVersion: 2020 });

let ARR = null;
for (const n of ast.body) {
  if (n.type === 'ExpressionStatement' && n.type && n.expression.type === 'AssignmentExpression') {
    const l = n.expression.left;
    if (l.type === 'MemberExpression' && l.object.name === 'window' && l.property.name === 'EVENTS') ARR = n.expression.right;
  }
}
if (!ARR) throw new Error('window.EVENTS array not found');

/* ================= expression printer (JS expr -> DSL expr) ================= */
const BIN_PREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '===': 6, '!==': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '>>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };
function isNum(n) { return n.type === 'Literal' && typeof n.value === 'number'; }

function printExpr(n, cx) {
  cx = cx || {};
  switch (n.type) {
    case 'Literal': return JSON.stringify(n.value);
    case 'Identifier': {
      if (n.name === 'S' || n.name === 's') return 's';
      if (cx.sexRoot && n.name === cx.sexRoot) return 's.sex';
      if (cx.sortVars && cx.sortVars[n.name]) return cx.sortVars[n.name];
      if (n.name === 'undefined') return 'undefined';
      return n.name;
    }
    case 'TemplateLiteral': return printTplAsConcat(n, cx);
    case 'MemberExpression': {
      // sort-var first element: srt[0] -> topBy(...) (already first)
      if (n.computed && n.property.type === 'Literal' && n.property.value === 0 &&
        n.object.type === 'Identifier' && cx.sortVars && cx.sortVars[n.object.name])
        return cx.sortVars[n.object.name];
      // arr.filter(cb)[0] -> first match
      if (n.computed && n.property.type === 'Literal' && n.property.value === 0 &&
        n.object.type === 'CallExpression' && n.object.callee.type === 'MemberExpression' &&
        !n.object.callee.computed && n.object.callee.property.name === 'filter') {
        return printFilterFirst(n.object, cx);
      }
      // X.slice().sort((a,b)=>b.F-a.F)[0] -> topBy(X,"F")
      // Object.keys(X).sort(...)[0] -> topKey(X)
      if (n.computed && n.property.type === 'Literal' && n.property.value === 0) {
        const sb = sortBase(n.object, cx);
        if (sb) return sb;
      }
      // Object.keys(X).sort(...).slice(0,N) is a CallExpression; see printCall.
      const o = printExpr(n.object, cx);
      const base = (/^(s|[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*|\([^)]*\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\[[^\]]*\]|[A-Za-z_$][\w$]*\([^)]*\))(\.[A-Za-z_$][\w$]*|\[[^\]]+\])*$/.test(o)) ? o : ('(' + o + ')');
      if (!n.computed) return base + '.' + n.property.name;
      return base + '[' + printExpr(n.property, cx) + ']';
    }
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const p = BIN_PREC[n.operator] || 0;
      const L = printExpr(n.left, cx), R = printExpr(n.right, cx);
      const lp = needsPar(n.left, p, 'l'), rp = needsPar(n.right, p, 'r');
      return (lp ? '(' + L + ')' : L) + n.operator + (rp ? '(' + R + ')' : R);
    }
    case 'UnaryExpression': {
      const a = printExpr(n.argument, cx);
      const par = /[+\-*/%<>=!&|?:]/.test(a) && a[0] !== '(';
      return n.operator + (par ? '(' + a + ')' : a);
    }
    case 'ConditionalExpression': {
      // (window.partnerName?...:...) is always truthy -> consequent
      if (n.test.type === 'MemberExpression' && n.test.object.type === 'Identifier' &&
        n.test.object.name === 'window' && n.test.property.name === 'partnerName')
        return printExpr(n.consequent, cx);
      return printExpr(n.test, cx) + '?' + printExpr(n.consequent, cx) + ':' + printExpr(n.alternate, cx);
    }
    case 'CallExpression': return printCall(n, cx);
    case 'ArrayExpression': return '[' + n.elements.map((e) => printExpr(e, cx)).join(',') + ']';
    case 'ArrowFunctionExpression':
    case 'FunctionExpression': throw new Error('FN value not printable: ' + slice(n).slice(0, 80));
    default: throw new Error('unprintable expr ' + n.type + ': ' + slice(n).slice(0, 80));
  }
}
function needsPar(ch, parentPrec, side) {
  if (ch.type !== 'BinaryExpression' && ch.type !== 'LogicalExpression' && ch.type !== 'ConditionalExpression') return false;
  if (ch.type === 'ConditionalExpression') return true;
  const cp = BIN_PREC[ch.operator] || 0;
  return side === 'l' ? cp < parentPrec : cp <= parentPrec;
}
function printTplAsConcat(n, cx) {
  const parts = [];
  for (let i = 0; i < n.quasis.length; i++) {
    if (n.quasis[i].value.cooked) parts.push(JSON.stringify(n.quasis[i].value.cooked));
    if (i < n.expressions.length) parts.push('(' + printExpr(n.expressions[i], cx) + ')');
  }
  if (!parts.length) return '""';
  return parts.join('+');
}
function cmpName(op) {
  return { '==': 'eq', '===': 'eq', '!=': 'ne', '!==': 'ne', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte' }[op] || null;
}
/* callee key for diagnostics */
function calleeKey(c) {
  if (c.type === 'Identifier') return c.name;
  if (c.type === 'MemberExpression') return exprShape(c.object) + '.' + (c.property.type === 'Identifier' ? c.property.name : '[]');
  return c.type;
}
function exprShape(e) {
  if (!e) return '?';
  if (e.type === 'Identifier') return e.name;
  if (e.type === 'Literal') return JSON.stringify(e.value);
  if (e.type === 'MemberExpression') return exprShape(e.object) + '.' + (e.property.type === 'Identifier' ? e.property.name : '[' + exprShape(e.property) + ']');
  if (e.type === 'CallExpression') return 'CALL(' + calleeKey(e.callee) + ')';
  if (e.type === 'LogicalExpression') return 'LOG(' + e.operator + ')';
  if (e.type === 'BinaryExpression') return 'BIN(' + e.operator + ')';
  return e.type;
}
/* Analyze arr.filter(cb) callbacks -> {kind:'single'|'and', tests:[{field,op,val}]} */
function filterTests(cb, cx) {
  const params = cb.params.map((p) => p.name);
  if (params.length !== 1) throw new Error('filter needs 1 param');
  const P0 = params[0];
  const body = cb.body.type === 'BlockStatement' ? blockValue(cb.body) : cb.body;
  const isOr = body.type === 'LogicalExpression' && body.operator === '||';
  const parts = (body.type === 'LogicalExpression' && (body.operator === '&&' || body.operator === '||')) ? [body.left, body.right] : [body];
  return {
    param: P0,
    or: isOr,
    tests: parts.map((t) => {
      if (t.type !== 'BinaryExpression' && !(t.type === 'UnaryExpression' && t.operator === '!')) throw new Error('filter test must be comparison: ' + slice(t).slice(0, 90));
      return binTest(t, P0, cx);
    })
  };
}
function binTest(t, P0, cx) {
  // leading ! flips the comparison, e.g. !(MAP[a]>2) -> MAP[a]<=2
  let neg = false, tt = t;
  if (tt.type === 'UnaryExpression' && tt.operator === '!') { neg = true; tt = tt.argument; }
  if (tt.type !== 'BinaryExpression' || !cmpName(tt.operator)) throw new Error('filter test must be comparison: ' + slice(t).slice(0, 90));
  const FLIP = { gt: 'lte', gte: 'lt', lt: 'gte', lte: 'gt', eq: 'ne', ne: 'eq' };
  const baseOp = cmpName(tt.operator), op = neg ? FLIP[baseOp] : baseOp;
  let mSide = null, vSide = null, mRight = false;
  const L = stripZero(tt.left), R = stripZero(tt.right);
  if (isMemberOf(L, P0)) { mSide = L; vSide = R; }
  else if (isMemberOf(R, P0)) { mSide = R; vSide = L; mRight = true; }
  else {
    // MAP[param] computed form, e.g. x2.acts[a] — keep exact negation via 5th helper arg
    const mi = isMapIndex(L, P0, cx) ? { mapNode: L, valNode: R, right: false } :
      (isMapIndex(R, P0, cx) ? { mapNode: R, valNode: L, right: true } : null);
    if (!mi) throw new Error('filter compares non-member: ' + slice(t).slice(0, 90));
    const mop = mi.right ? FLIP[baseOp] : baseOp;
    return { map: printExpr(mi.mapNode.object, cx || {}), op: mop, valSrc: slice(mi.valNode), neg: neg ? 1 : 0 };
  }
  const field = memberTail(mSide, P0);
  return { field, op: mRight ? FLIP[op] : op, valSrc: slice(vSide) };
}
/* MAP[param] where MAP prints to an s-path (S-root or sexRoot) and param is the filter variable. */
function isMapIndex(n, P0, cx) {
  if (n.type !== 'MemberExpression' || !n.computed) return false;
  if (n.property.type !== 'Identifier' || n.property.name !== P0) return false;
  const r = rootOf(n.object);
  if (r === 'S') return true;
  if (cx && r && (r === cx.sexRoot || cx.lets[r])) return true;
  return false;
}
/* (X||0) guard in filters means "missing counts as 0" */
function stripZero(n) {
  if (n.type === 'LogicalExpression' && n.operator === '||' &&
    n.right.type === 'Literal' && n.right.value === 0) return n.left;
  return n;
}
function isMemberOf(n, P0) {
  let o = n;
  while (o.type === 'MemberExpression') o = o.object;
  return o.type === 'Identifier' && o.name === P0;
}
function memberTail(n, P0) {
  const segs = [];
  let o = n;
  while (o.type === 'MemberExpression') {
    if (o.computed) throw new Error('computed filter field');
    segs.unshift(o.property.name); o = o.object;
  }
  if (o.type !== 'Identifier' || o.name !== P0) throw new Error('bad filter root');
  if (segs.length !== 1) throw new Error('filter field depth ' + segs.length);
  return segs[0];
}
function blockValue(block) {
  if (block.body.length !== 1 || block.body[0].type !== 'ReturnStatement' || !block.body[0].argument)
    throw new Error('callback block must be single return');
  return block.body[0].argument;
}
/* sort helpers: X.slice().sort((a,b)=>b.F-a.F) | Object.keys(E).sort(...) */
function sortChainInfo(sortCall) {
  // returns {kind:'arr',arrNode,field} or {kind:'keys',keysArg} or null
  if (sortCall.type !== 'CallExpression' || sortCall.callee.type !== 'MemberExpression' ||
    sortCall.callee.computed || sortCall.callee.property.name !== 'sort') return null;
  const recv = sortCall.callee.object;
  const cmp = sortCall.arguments[0];
  if (!cmp || (cmp.type !== 'ArrowFunctionExpression' && cmp.type !== 'FunctionExpression') || cmp.params.length !== 2) return null;
  const pa = cmp.params[0].name, pb = cmp.params[1].name;
  // recv: X.slice() -> array sort; need desc field proof b.F-a.F
  if (recv.type === 'CallExpression' && recv.callee.type === 'MemberExpression' &&
    !recv.callee.computed && recv.callee.property.name === 'slice' && !recv.arguments.length) {
    const body = cmp.body.type === 'BlockStatement' ? blockValue(cmp.body) : cmp.body;
    if (body.type === 'BinaryExpression' && body.operator === '-' &&
      body.left.type === 'MemberExpression' && !body.left.computed &&
      body.right.type === 'MemberExpression' && !body.right.computed &&
      body.left.object.type === 'Identifier' && body.left.object.name === pb &&
      body.right.object.type === 'Identifier' && body.right.object.name === pa &&
      body.left.property.name === body.right.property.name)
      return { kind: 'arr', arrNode: recv.callee.object, field: body.left.property.name };
    return null;
  }
  // recv: Object.keys(E) -> keys sort desc by value (runtime topKey/topKeys)
  if (recv.type === 'CallExpression' && recv.callee.type === 'MemberExpression' &&
    !recv.callee.computed && recv.callee.object.type === 'Identifier' &&
    recv.callee.object.name === 'Object' && recv.callee.property.name === 'keys' &&
    recv.arguments.length === 1)
    return { kind: 'keys', keysArg: recv.arguments[0] };
  return null;
}
/* X.slice().sort(cmp)[0] -> topBy(X,"F"); Object.keys(E).sort(cmp)[0] -> topKey(E) */
function sortBase(sortCall, cx) {
  const info = sortChainInfo(sortCall);
  if (!info) return null;
  if (info.kind === 'arr') return 'topBy(' + printExpr(info.arrNode, cx) + ',' + JSON.stringify(info.field) + ')';
  return 'topKey(' + printExpr(info.keysArg, cx) + ')';
}
function filterChain(callNode, cx, first) {
  const arrSrc = printExpr(callNode.callee.object, cx);
  const cb = callNode.arguments[0];
  const ft = filterTests(cb, cx);
  if (ft.tests.some((t) => t.map)) {
    if (!first || ft.tests.length !== 1) throw new Error('map filter needs single [0]');
    const t = ft.tests[0];
    return 'firstWhereMap(' + arrSrc + ',' + t.map + ',' + JSON.stringify(t.op) + ',' + t.valSrc + (t.neg ? ',1' : '') + ')';
  }
  // first ([0]): all but the last test keep arrays (whereAll), the last picks (where)
  let e = arrSrc;
  for (let i = 0; i < ft.tests.length; i++) {
    const t = ft.tests[i], last = i === ft.tests.length - 1;
    const fn = (first && last) ? 'where' : 'whereAll';
    e = fn + '(' + e + ',' + JSON.stringify(t.field) + ',' + JSON.stringify(t.op) + ',' + t.valSrc + ')';
  }
  return e;
}
function printFilterFirst(callNode, cx) { return filterChain(callNode, cx, true); }
/* arr.filter(cb)[0] | arr.filter(cb) -> where/whereAll exprs */
function printFilterChain(obj, cx) {
  // legacy: bare .filter without [0] means full list
  return filterChain(obj, cx, false);
}
function printCall(n, cx) {
  const c = n.callee;
  if (c.type === 'Identifier') {
    const a = n.arguments.map((x) => printExpr(x, cx));
    if (['clamp', 'min', 'max', 'floor', 'round', 'ceil', 'len', 'keys', 'topKey', 'topKeys', 'randName', 'partnerName', 'childInAge', 'claimWhere', 'lastClaim', 'topClaim', 'firstName', 'lastName', 'where', 'whereAll', 'whereLast', 'firstWhereMap', 'topBy', 'lowBy', 'hasClaim', 'alphaName', 'haremCount'].includes(c.name))
      return c.name + '(' + a.join(',') + ')';
    if (c.name === 'rnd' && !n.arguments.length) return 'rnd()';
    throw new Error('call not allowed: ' + c.name);
  }
  if (c.type === 'MemberExpression') {
    const recv = c.object;
    const m = !c.computed ? c.property.name : null;
    // Math.floor/max/... (bare names are also accepted)
    if (recv.type === 'Identifier' && recv.name === 'Math' &&
      ['floor', 'max', 'min', 'round', 'ceil', 'abs'].includes(m))
      return m + '(' + n.arguments.map((x) => printExpr(x, cx)).join(',') + ')';
    // window.partnerName() -> partnerName()
    if (recv.type === 'Identifier' && recv.name === 'window' && m === 'partnerName' && !n.arguments.length)
      return 'partnerName()';
    // Object.keys(E) -> keys(E)
    if (recv.type === 'Identifier' && recv.name === 'Object' && m === 'keys' && n.arguments.length === 1)
      return 'keys(' + printExpr(n.arguments[0], cx) + ')';
    // window.partnerName ternary test is folded in ConditionalExpression
    if (m === 'filter' && n.arguments.length === 1) {
      return printFilterChain(n, cx);
    }
    if (m === 'slice' && n.arguments.length <= 2) {
      // Object.keys(E).sort(...).slice(0,N) -> topKeys(E,N)
      const recv = c.object;
      if (recv.type === 'CallExpression') {
        const info = sortChainInfo(recv);
        if (info && info.kind === 'keys' && n.arguments.length === 2 &&
          n.arguments[0].type === 'Literal' && n.arguments[0].value === 0 &&
          n.arguments[1].type === 'Literal' && typeof n.arguments[1].value === 'number')
          return 'topKeys(' + printExpr(info.keysArg, cx) + ',' + n.arguments[1].value + ')';
      }
      return printExpr(recv, cx) + '.slice(' + n.arguments.map((x) => printExpr(x, cx)).join(',') + ')';
    }
    if (m === 'some' || m === 'includes' || m === 'indexOf' || m === 'join' || m === 'slice' || m === 'toLocaleString')
      return printExpr(recv, cx) + '.' + m + '(' + n.arguments.map((x) => printExpr(x, cx)).join(',') + ')';
    if (c.property.type === 'Identifier' && c.property.name === 'push') throw new Error('push is statement-level');
    throw new Error('method not allowed: ' + (m || 'computed'));
  }
  throw new Error('bad callee');
}
/* ================= condition mapper (JS cond -> rule) ================= */
function condToRule(fnNode, evId) {
  if (fnNode.type !== 'ArrowFunctionExpression' && fnNode.type !== 'FunctionExpression')
    throw new Error('cond must be function');
  // try/catch registry-law conds: shape is fixed per event, bypass block parser
  if (evId === 'ow-legal-papers')
    return { all: [{ call: 'ownLawAllows' }, { any: [{ partner: 'exists' }, { p: 'sex.lovers.length', gt: 0 }] }] };
  if (evId === 'ow-break-cell')
    return { all: [{ call: 'ownLawDenies' }, { p: 'sex.claims.length', gt: 0 }] };
  const body = fnNode.body.type === 'BlockStatement' ? blockValue(fnNode.body) : fnNode.body;
  if (body.type === 'Literal' && body.value === true) return null;
  return exprToRule(body, 's');
}
function exprToRule(n, SNAME) {
  switch (n.type) {
    case 'LogicalExpression':
      return n.operator === '&&'
        ? { all: [exprToRule(n.left, SNAME), exprToRule(n.right, SNAME)] }
        : { any: [exprToRule(n.left, SNAME), exprToRule(n.right, SNAME)] };
    case 'UnaryExpression':
      if (n.operator === '!') {
        const a = n.argument;
        if (a.type === 'UnaryExpression' && a.operator === '!') return truthyRule(a.argument, SNAME);
        return { not: exprToRule(a, SNAME) };
      }
      throw new Error('bad unary in cond: ' + slice(n).slice(0, 80));
    case 'BinaryExpression': {
      const cmp = cmpName(n.operator);
      if (!cmp) throw new Error('bad cond operator ' + n.operator);
      // FILTER().length >= N  ->  count rule
      const cnt = countShape(n, cmp, SNAME);
      if (cnt) return cnt;
      let mSide = null, vSide = null, flip = false;
      if (isSPath(n.left, SNAME) || guardBase(n.left, SNAME)) { mSide = n.left; vSide = n.right; }
      else if (isSPath(n.right, SNAME) || guardBase(n.right, SNAME)) { mSide = n.right; vSide = n.left; flip = true; }
      else throw new Error('cond compares non-path: ' + slice(n).slice(0, 90));
      if (zeroBase(mSide).type !== 'MemberExpression' && !guardPath(mSide, SNAME)) throw new Error('cond compares non-path: ' + slice(n).slice(0, 90));
      const gp = guardPath(mSide, SNAME);
      if (!gp) throw new Error('cond path oddity');
      const path = sPathOf(gp, SNAME);
      if (vSide.type !== 'Literal' && vSide.type !== 'Identifier' && !isNegLit(vSide)) throw new Error('cond value must be literal: ' + slice(vSide).slice(0, 40));
      const val = vSide.type === 'Literal' ? vSide.value : (vSide.type === 'Identifier' ? (vSide.name === 'undefined' ? undefined : true) : -vSide.argument.value);
      const op2 = flip ? flipCmp(cmp) : cmp;
      const leaf = { p: path }; leaf[op2] = val;
      return leaf;
    }
    case 'MemberExpression': return truthyRule(n, SNAME);
    case 'CallExpression': {
      // some(...) / every(...) on array path
      if (n.callee.type === 'MemberExpression' && !n.callee.computed &&
        (n.callee.property.name === 'some' || n.callee.property.name === 'every')) {
        const every = n.callee.property.name === 'every';
        const arrPath = arrPathOf(n.callee.object, SNAME);
        const cb = n.arguments[0];
        const ft = filterTests(cb);
        if (ft.tests.length === 1) {
          const t = ft.tests[0];
          const where = { p: '$it.' + t.field }; where[t.op] = literalOf(t.valSrc);
          const some = { some: { arr: arrPath, where } };
          return every ? { not: some } : some;
        }
        const leaves = ft.tests.map((t) => { const w = { p: '$it.' + t.field }; w[t.op] = literalOf(t.valSrc); return w; });
        const where = ft.or ? { any: leaves } : { all: leaves };
        const some = { some: { arr: arrPath, where } };
        return every ? { not: some } : some;
      }
      throw new Error('call in cond: ' + slice(n).slice(0, 80));
    }
    default: throw new Error('bad cond node ' + n.type);
  }
}
function truthyRule(n, SNAME) {
  const t = stripBang(n);
  // !!X or X (member) -> truthy; special forms:
  if (t.type === 'MemberExpression' && !t.computed &&
    t.object.type === 'MemberExpression' && t.object.object && t.object.object.name === SNAME &&
    t.object.property.name === 'relationships' && t.property.name === 'partner') return { partner: 'exists' };
  if (isSPath(t, SNAME)) {
    const p = sPathOf(t, SNAME);
    if (p === 'jobId') return { job: 'employed' };
    return { p, truthy: true };
  }
  if (t.type === 'LogicalExpression') return exprToRule(t, SNAME);
  throw new Error('bad truthy: ' + slice(n).slice(0, 80));
}
function stripBang(n) { while (n.type === 'UnaryExpression' && n.operator === '!') n = n.argument; return n; }
function isNegLit(n) {
  return n.type === 'UnaryExpression' && (n.operator === '-' || n.operator === '+') &&
    n.argument.type === 'Literal' && typeof n.argument.value === 'number';
}
/* (P||0), (P?P:0), (GUARD?GUARD.rest:0), and (G1&&G2&&...&&P) guard chains all mean "P, defaulting sensibly". */
function guardBase(n, SNAME) { return !!guardPath(n, SNAME); }
function guardPath(n, SNAME) {
  if (isSPath(n, SNAME)) return n;
  if (zeroDefault(n, SNAME)) return zeroBase(n);
  if (n.type === 'LogicalExpression' && n.operator === '&&') {
    const r = guardPath(n.right, SNAME);
    if (r && isGuardChain(n.left, r, SNAME)) return r;
  }
  return null;
}
function isGuardChain(n, target, SNAME) {
  // every leaf of n must be a dot-prefix of target's source (definedness guard)
  const tsrc = slice(target);
  let ok = true;
  (function walk(x) {
    if (!ok) return;
    if (x.type === 'LogicalExpression' && x.operator === '&&') { walk(x.left); walk(x.right); return; }
    const xs = slice(stripZero(x));
    if (xs !== tsrc && !(tsrc.indexOf(xs) === 0 && tsrc[xs.length] === '.')) ok = false;
  })(n);
  return ok;
}
function isSPath(n, SNAME) {
  if (n.type === 'MemberExpression') {
    let o = n;
    while (o.type === 'MemberExpression') {
      if (o.computed && o.property.type !== 'Literal') return false;
      o = o.object;
    }
    return o.type === 'Identifier' && o.name === SNAME;
  }
  return n.type === 'Identifier' && n.name === SNAME;
}
/* (P||0) and (P?P:0) guards mean "missing counts as 0" — same as bare compare. */
function zeroDefault(n, SNAME) {
  if (n.type === 'LogicalExpression' && n.operator === '||' &&
    n.right.type === 'Literal' && n.right.value === 0) return isSPath(n.left, SNAME);
  if (n.type === 'ConditionalExpression' && n.alternate.type === 'Literal' && n.alternate.value === 0 &&
    slice(n.test) === slice(n.consequent)) return isSPath(n.test, SNAME);
  // (GUARD ? GUARD.rest : 0) — test is a dot-prefix of consequent, e.g. (s.stats?s.stats.stress:0)
  if (n.type === 'ConditionalExpression' && n.alternate.type === 'Literal' && n.alternate.value === 0 &&
    isSPath(n.consequent, SNAME)) {
    const tsrc = slice(n.test), csrc = slice(n.consequent);
    if (csrc.indexOf(tsrc) === 0 && csrc[tsrc.length] === '.') return true;
  }
  return false;
}
function zeroBase(n) {
  if (n.type === 'LogicalExpression') return n.left;
  if (n.type === 'ConditionalExpression') return n.test;
  return n;
}
function sPathOf(n, SNAME) {
  if (n.type === 'Identifier') return '';
  const segs = [];
  let o = n;
  while (o.type === 'MemberExpression') {
    segs.unshift(o.computed ? o.property.value : o.property.name);
    o = o.object;
  }
  return segs.join('.');
}
function flipCmp(c) { return { gt: 'lt', gte: 'lte', lt: 'gt', lte: 'gte' }[c] || c; }
function arrPathOf(n, SNAME) {
  // (X||[]) -> X ; X -> X
  if (n.type === 'LogicalExpression' && n.operator === '||') return sPathOf(n.left, SNAME);
  return sPathOf(n, SNAME);
}
function literalOf(src) {
  const v = new Function('return (' + src + ')')();
  if (v !== null && typeof v === 'object') throw new Error('non-literal filter value');
  return v;
}
/* FILTERCB.length >= N  ->  {count:{arr,field,op,val,gte}} */
function countShape(n, cmp, SNAME) {
  const sides = [n.left, n.right];
  for (let s = 0; s < 2; s++) {
    const m = sides[s], v = sides[1 - s];
    if (m.type === 'MemberExpression' && !m.computed && m.property.name === 'length' &&
      m.object.type === 'CallExpression' && m.object.callee.type === 'MemberExpression' &&
      !m.object.callee.computed && m.object.callee.property.name === 'filter') {
      if (v.type !== 'Literal' || typeof v.value !== 'number') throw new Error('count value must be literal');
      const call = m.object;
      const arr = arrPathOf(call.callee.object, SNAME);
      const cb = call.arguments[0];
      const ft = filterTests(cb);
      if (ft.or) throw new Error('count filter or not supported');
      if (ft.tests.length !== 1) throw new Error('count filter must be single test');
      const t = ft.tests[0];
      const c = { arr, field: t.field, op: t.op, val: literalOf(t.valSrc) };
      const op2 = s === 0 ? cmp : flipCmp(cmp);
      if (op2 === 'gte') c.gte = v.value;
      else if (op2 === 'gt') c.gt = v.value;
      else throw new Error('count op must be > or >=');
      return { count: c };
    }
  }
  return null;
}
/* ================= text mapper (JS text -> {lets,template} | template) ================= */
function textToJson(fnOrTpl, cx) {
  const node = (fnOrTpl.type === 'ArrowFunctionExpression' || fnOrTpl.type === 'FunctionExpression')
    ? (fnOrTpl.body.type === 'BlockStatement' ? '__block__' : fnOrTpl.body)
    : fnOrTpl;
  if (node === '__block__') return textBlock(fnOrTpl.body, cx);
  if (node.type === 'TemplateLiteral') return tplToTemplate(node, cx);
  throw new Error('text shape: ' + node.type);
}
function tplToTemplate(tpl, cx) {
  let out = '';
  for (let i = 0; i < tpl.quasis.length; i++) {
    out += tpl.quasis[i].value.cooked;
    if (i < tpl.expressions.length) out += '{{' + printExpr(tpl.expressions[i], cx) + '}}';
  }
  return out;
}
/* block text: lets + single return of concat/ternary/template */
function textBlock(block, cx) {
  const lets = [];
  const cx2 = Object.assign({}, cx);
  for (const st of block.body) {
    if (st.type === 'VariableDeclaration') {
      for (const d of st.declarations) {
        if (!d.init) throw new Error('text var without init');
        lets.push({ name: d.id.name, expr: printExpr(d.init, cx2) });
      }
      continue;
    }
    if (st.type === 'ForStatement') {
      textFor(st, lets, cx2);
      continue;
    }
    if (st.type === 'ReturnStatement' && st.argument) {
      return { lets, template: retToTemplate(st.argument, cx2) };
    }
    throw new Error('text stmt: ' + st.type);
  }
  throw new Error('text block without return');
}
/* var H=null; for(i=0;i<ARR.length;i++) if(COND) H=ARR[i];  ->  let H=whereLast(...) */
function textFor(st, lets, cx) {
  const init = st.init;
  if (!init || init.type !== 'VariableDeclaration' || init.declarations.length !== 1) throw new Error('text for init');
  const idx = init.declarations[0].id.name;
  const test = st.test;
  if (!test || test.type !== 'BinaryExpression' || test.operator !== '<') throw new Error('text for test');
  const arrNode = test.right.type === 'MemberExpression' && test.right.property.name === 'length'
    ? test.right.object : test.right;
  const arrSrc = printExpr(arrNode, cx);
  const cons = st.body.type === 'IfStatement' && !st.body.alternate ? st.body
    : (st.body.type === 'BlockStatement' && st.body.body.length === 1 && st.body.body[0].type === 'IfStatement' && !st.body.body[0].alternate ? st.body.body[0] : null);
  if (!cons) throw new Error('text for body must be single if');
  const then1 = cons.consequent.type === 'BlockStatement' ? cons.consequent.body : [cons.consequent];
  if (then1.length !== 1 || then1[0].type !== 'ExpressionStatement' ||
    then1[0].expression.type !== 'AssignmentExpression' || then1[0].expression.operator !== '=') throw new Error('text for assign');
  const target = then1[0].expression.left;
  const tname = target.type === 'Identifier' ? target.name : null;
  if (!tname) throw new Error('text for target');
  const rhs = then1[0].expression.right;
  if (slice(rhs) !== slice(arrNode) + '[' + idx + ']') throw new Error('text for rhs must be ARR[i]');
  // COND on ARR[idx]: single compare or || of two
  const conds = cons.test.type === 'LogicalExpression' && cons.test.operator === '||'
    ? [cons.test.left, cons.test.right] : [cons.test];
  const tests = conds.map((c) => {
    if (c.type !== 'BinaryExpression' || !cmpName(c.operator)) throw new Error('text for cond');
    const L = stripZero(c.left), R = stripZero(c.right);
    const el = isElemOf(L, arrNode, idx) ? L : (isElemOf(R, arrNode, idx) ? R : null);
    if (!el) throw new Error('text for cond element');
    const vSrc = slice(el === L ? R : L);
    const tail = slice(el).slice(slice(arrNode).length + idx.length + 2);
    if (!/^\.[A-Za-z_$][\w$]*$/.test(tail)) throw new Error('text for cond field');
    return { field: tail.slice(1), op: cmpName(c.operator), val: literalOf(vSrc) };
  });
  let expr;
  if (tests.length === 1) expr = 'whereLast(' + arrSrc + ',' + JSON.stringify(tests[0].field) + ',' + JSON.stringify(tests[0].op) + ',' + JSON.stringify(tests[0].val) + ')';
  else if (tests.length === 2) expr = 'whereLast(' + arrSrc + ',' + JSON.stringify(tests[0].field) + ',' + JSON.stringify(tests[0].op) + ',' + JSON.stringify(tests[0].val) + ',' + JSON.stringify(tests[1].field) + ',' + JSON.stringify(tests[1].op) + ',' + JSON.stringify(tests[1].val) + ')';
  else throw new Error('text for cond count');
  // replace earlier null-init of same name if present
  for (let i = lets.length - 1; i >= 0; i--) if (lets[i].name === tname) { lets.splice(i, 1); break; }
  lets.push({ name: tname, expr });
}
function isElemOf(n, arrNode, idx) {
  const asrc = slice(arrNode);
  if (n.type !== 'MemberExpression' || n.computed) return false;
  let o = n;
  while (o.type === 'MemberExpression' && !o.computed) o = o.object;
  if (o.type !== 'MemberExpression' || !o.computed) return false;
  if (o.property.type !== 'Identifier' || o.property.name !== idx) return false;
  return slice(o.object) === asrc;
}
function retToTemplate(n, cx) {
  if (n.type === 'TemplateLiteral') return tplToTemplate(n, cx);
  if (n.type === 'Literal') return String(n.value);
  if (n.type === 'BinaryExpression' && n.operator === '+') return retToTemplate(n.left, cx) + retToTemplate(n.right, cx);
  if (n.type === 'ConditionalExpression' || n.type === 'LogicalExpression' ||
    n.type === 'MemberExpression' || n.type === 'CallExpression' || n.type === 'Identifier')
    return '{{' + printExpr(n, cx) + '}}';
  if (n.type === 'UnaryExpression') return '{{' + printExpr(n, cx) + '}}';
  throw new Error('text return shape: ' + n.type + ' ' + slice(n).slice(0, 60));
}
/* ================= fx compiler (choice body -> effects) ================= */
function newCx() { return { sexRoot: null, sortVars: {}, lets: {}, itAlias: null, evId: '', chIdx: 0 }; }
function compileFx(fxNode, evId, chIdx) {
  const cx = newCx(); cx.evId = evId; cx.chIdx = chIdx;
  const body = fxNode.body.type === 'BlockStatement' ? fxNode.body.body : [{ type: 'ReturnStatement', argument: fxNode.body }];
  const fx = { effects: [], terminated: false };
  compileList(body, cx, fx);
  return fx.effects;
}
function compileList(stmts, cx, fx) {
  for (let i = 0; i < stmts.length && !fx.terminated; i++) {
    const st = stmts[i];
    // ow-leverage-crown: the while-cashout + claims top-up loop are ONE ritual
    // (ownCashoutLeverage); consume both statements, keep compiling the rest.
    if (st.type === 'WhileStatement' && cx.evId === 'ow-leverage-crown') {
      const wsrc = slice(st);
      if (!/\.shift\(\)/.test(wsrc)) throw new Error('crown while without shift');
      const nx = stmts[i + 1];
      if (!nx || nx.type !== 'ForStatement' || nx.test.type !== 'BinaryExpression' ||
        slice(nx).indexOf('leverageOn.push') < 0) throw new Error('crown ritual tail mismatch');
      fx.effects.push({ op: 'call', fn: 'own.cashoutLeverage' });
      i++; // consume the top-up for loop as well
      continue;
    }
    if (st.type === 'IfStatement' && !st.alternate && endsInReturn(st.consequent)) {
      // if(C){...return X} REST  ->  branch{cond,then} + else=REST
      const thenFx = { effects: [], terminated: false };
      compileList(blockStmts(st.consequent), cx, thenFx);
      const restFx = { effects: [], terminated: false };
      compileList(stmts.slice(i + 1), cx, restFx);
      fx.effects.push(mkBranch(st.test, thenFx.effects, restFx.effects, cx));
      fx.terminated = true;
      return;
    }
    compileStmt(st, cx, fx);
  }
}
function blockStmts(n) { return n.type === 'BlockStatement' ? n.body : [n]; }
function endsInReturn(n) {
  const b = blockStmts(n);
  return b.length && b[b.length - 1].type === 'ReturnStatement';
}
function mkBranch(test, thenFx, elseFx, cx) {
  if (isRndTest(test)) return { op: 'chance', p: printExpr(test.right, cx), then: thenFx, else: elseFx };
  return { op: 'branch', cond: testToRule(test, cx), then: thenFx, else: elseFx };
}
function isRndTest(t) {
  return t.type === 'BinaryExpression' && (t.operator === '<' || t.operator === '<=') &&
    t.left.type === 'CallExpression' && t.left.callee.type === 'Identifier' && t.left.callee.name === 'rnd';
}
/* test expr (S-root + lets locals) -> rule */
function testToRule(t, cx) {
  if (isRndTest(t)) return { expr: printExpr(t, cx) };
  if (t.type === 'LogicalExpression')
    return t.operator === '&&' ? { all: [testToRule(t.left, cx), testToRule(t.right, cx)] } : { any: [testToRule(t.left, cx), testToRule(t.right, cx)] };
  if (t.type === 'UnaryExpression' && t.operator === '!') {
    if (t.argument.type === 'UnaryExpression' && t.argument.operator === '!') return truthyRuleX(t.argument.argument, cx);
    return { not: testToRule(t.argument, cx) };
  }
  if (t.type === 'BinaryExpression' && cmpName(t.operator)) {
    const r = leafRule(t.left, t.right, cmpName(t.operator), cx) || leafRule(t.right, t.left, flipCmp(cmpName(t.operator)), cx);
    if (r) return r;
    return { expr: printExpr(t, cx) };
  }
  if (t.type === 'MemberExpression' || t.type === 'Identifier' || t.type === 'CallExpression')
    return truthyRuleX(t, cx);
  throw new Error('bad test: ' + slice(t).slice(0, 80));
}
function rootOf(n) {
  let o = n;
  while (o.type === 'MemberExpression') o = o.object;
  if (o.type === 'Identifier') return o.name;
  return null;
}
function truthyRuleX(n, cx) {
  const t = stripBang(n);
  if (t.type === 'MemberExpression' && !t.computed &&
    t.object.type === 'MemberExpression' && t.object.object.type === 'Identifier' &&
    t.object.object.name === 'S' && t.object.property.name === 'relationships' && t.property.name === 'partner')
    return { partner: 'exists' };
  const r = rootOf(t);
  if (r === 'S') return { p: sPathOf(zeroBase(t), 'S'), truthy: true };
  // sexRoot truthy, e.g. if(x.protection) / if(!x.protection) -> s.sex paths
  if (r && cx && r === cx.sexRoot && (t.type === 'MemberExpression' || t.type === 'Identifier')) {
    if (t.type === 'Identifier') return { p: 'sex', truthy: true };
    return { p: 'sex.' + printPathOf(t).slice(r.length + 1), truthy: true };
  }
  if (r && cx.lets[r]) return { v: printPathOf(t), truthy: true };
  if (t.type === 'CallExpression') return { expr: printExpr(n, cx) };
  if (t.type === 'LogicalExpression') return testToRule(t, cx);
  throw new Error('bad truthy test: ' + slice(n).slice(0, 80));
}
function leafRule(mSide, vSide, op, cx) {
  const m = zeroBase(mSide);
  const r = rootOf(m);
  if (r !== 'S' && !(r && cx.lets[r])) return null;
  if (vSide.type !== 'Literal' && vSide.type !== 'Identifier' && vSide.type !== 'UnaryExpression') return null;
  if (m.type !== 'MemberExpression' && m.type !== 'Identifier') return null;
  const path = r === 'S' ? sPathOf(m, 'S') : printPathOf(m);
  const val = vSide.type === 'Literal' ? vSide.value : (vSide.type === 'Identifier' && vSide.name === 'undefined' ? undefined : null);
  if (val === null && vSide.type !== 'Literal') return null;
  if (vSide.type === 'UnaryExpression') return null;
  const leaf = r === 'S' ? { p: path } : { v: path };
  leaf[op] = val;
  return leaf;
}
function printPathOf(n) {
  // local-root path -> dotted string (for {v:})
  const segs = [];
  let o = n;
  while (o.type === 'MemberExpression') {
    if (o.computed) { if (o.property.type !== 'Literal') throw new Error('computed v path'); segs.unshift(o.property.value); }
    else segs.unshift(o.property.name);
    o = o.object;
  }
  segs.unshift(o.name);
  return segs.join('.');
}
function compileStmt(st, cx, fx) {
  switch (st.type) {
    case 'VariableDeclaration': for (const d of st.declarations) handleDecl(d, cx, fx); return;
    case 'ExpressionStatement': handleExprStmt(st.expression, cx, fx); return;
    case 'IfStatement': {
      const thenFx = { effects: [], terminated: false };
      compileList(blockStmts(st.consequent), cx, thenFx);
      const elseFx = { effects: [], terminated: false };
      if (st.alternate) compileList(blockStmts(st.alternate), cx, elseFx);
      fx.effects.push(mkBranch(st.test, thenFx.effects, elseFx.effects.length ? elseFx.effects : undefined, cx));
      // fallthrough continues unless EVERY path returns (no-else always falls through)
      if (thenFx.terminated && st.alternate && elseFx.terminated) fx.terminated = true;
      return;
    }
    case 'ReturnStatement': handleReturn(st.argument, cx, fx); fx.terminated = true; return;
    case 'ForStatement': handleFor(st, cx, fx); return;
    case 'WhileStatement': {
      // sole while in corpus: leverage cashout loop
      assertEv(cx, ['ow-leverage-crown']);
      fx.effects.push({ op: 'call', fn: 'own.cashoutLeverage' });
      return;
    }
    default: throw new Error('stmt: ' + st.type + ' in ' + cx.evId);
  }
}
function assertEv(cx, ids) {
  if (!ids.includes(cx.evId)) throw new Error('unexpected shape in ' + cx.evId + ' choice ' + cx.chIdx);
}
function handleDecl(d, cx, fx) {
  const name = d.id.name;
  const init = d.init;
  if (!init) throw new Error('var without init: ' + name);
  // var x = sexE(S)
  if (init.type === 'CallExpression' && init.callee.type === 'Identifier' && init.callee.name === 'sexE') {
    cx.sexRoot = name; return;
  }  // var m = crew.pop()
  if (init.type === 'CallExpression' && init.callee.type === 'MemberExpression' &&
    !init.callee.computed && init.callee.property.name === 'pop') {
    const recv = printExpr(init.callee.object, cx);
    if (recv === 's.underworld.crew') { fx.effects.push({ op: 'crewDrop', as: name }); cx.lets[name] = 1; return; }
    if (/\.claims$/.test(recv)) { fx.effects.push({ op: 'claimPop', as: name }); cx.lets[name] = 1; return; }
    throw new Error('pop on ' + recv);
  }
  // var srt = X.slice().sort(cmp)
  if (init.type === 'CallExpression') {
    const info = sortChainInfo(init);
    if (info && info.kind === 'arr') {
      cx.sortVars[name] = 'topBy(' + printExpr(info.arrNode, cx) + ',' + JSON.stringify(info.field) + ')';
      cx.lets[name] = 1; return;
    }
  }
  // var pr = sxPreg/ownPreg(S,name,mult,ctrl) / var c = ownClaim/sxClaim(S,...) / var L = evOwnLaw(S)
  if (init.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const fn = init.callee.name;
    if (fn === 'sxPreg' || fn === 'ownPreg') {
      fx.effects.push({
        op: 'call', fn: 'sex.preg', as: name,
        args: { name: ex(init.arguments[1], cx), mult: ex(init.arguments[2] || { type: 'Literal', value: 1 }, cx), ctrl: ex(init.arguments[3] || { type: 'Literal', value: null }, cx) }
      });
      cx.lets[name] = 1; return;
    }
    if (fn === 'sxClaim') {
      fx.effects.push({
        op: 'call', fn: 'sex.claim', as: name,
        args: { name: ex(init.arguments[1], cx), ob: ex(init.arguments[2], cx), os: ex(init.arguments[3], cx), stage: ex(init.arguments[4], cx) }
      });
      cx.lets[name] = 1; return;
    }
    if (fn === 'ownClaim') {
      fx.effects.push({
        op: 'call', fn: 'sex.ownClaim', as: name,
        args: { name: ex(init.arguments[1], cx), via: ex(init.arguments[2] || { type: 'Literal', value: 'claim' }, cx), ob: ex(init.arguments[3], cx), os: ex(init.arguments[4], cx) }
      });
      cx.lets[name] = 1; return;
    }
    if (fn === 'evOwnLaw') { fx.effects.push({ op: 'call', fn: 'law.check', as: name }); cx.lets[name] = 1; return; }
    if (fn === 'ownForce') { fx.effects.push({ op: 'call', fn: 'sex.force', as: name, args: { name: ex(init.arguments[1], cx) } }); cx.lets[name] = 1; return; }
    if (fn === 'tryPromote') {
      fx.effects.push({ op: 'tryPromote', why: { expr: printExpr(init.arguments[1] || init.arguments[0], cx) }, as: name });
      cx.lets[name] = 1; return;
    }
  }
  // default: let
  cx.lets[name] = 1;
  fx.effects.push({ op: 'let', name, expr: printExpr(init, cx) });
}
function ex(n, cx) { return n === undefined ? undefined : { expr: printExpr(n, cx) }; }
function handleExprStmt(e, cx, fx) {
  if (e.type === 'AssignmentExpression') { handleAssign(e, cx, fx); return; }
  if (e.type === 'UpdateExpression') { handleUpdate(e, cx, fx, 1); return; }
  if (e.type === 'CallExpression') { handleCallStmt(e, cx, fx); return; }
  throw new Error('expr stmt: ' + e.type);
}
/* classify assignment LHS -> emitter */
function handleAssign(e, cx, fx) {
  const L = e.left, R = e.right, op = e.operator;
  const lsrc = slice(L);
  // ownFill/sexE on the RHS are normalization no-ops (interpreter fills on access)
  if (R.type === 'CallExpression' && R.callee.type === 'Identifier' &&
    (R.callee.name === 'ownFill' || R.callee.name === 'sexE')) return;
  // --- S.stats.X = clamp(S.stats.X +/- N) ---
  if (L.type === 'MemberExpression' && !L.computed && L.object.type === 'MemberExpression' &&
    L.object.object.type === 'Identifier' && L.object.object.name === 'S' && L.object.property.name === 'stats') {
    const key = L.property.name;
    if (op === '=') {
      const d = clampDelta(R, 's.stats.' + key, cx);
      if (d !== null) { fx.effects.push({ op: 'stat', key, delta: d }); return; }
    }
    throw new Error('stat shape: ' + slice(e).slice(0, 90));
  }
  // --- S.money ---
  if (L.type === 'MemberExpression' && !L.computed && L.object.type === 'Identifier' && L.object.name === 'S' && L.property.name === 'money') {
    if (op === '-=' || op === '+=') {
      fx.effects.push({ op: 'money', amount: (op === '+=' ? printExpr(R, cx) : '-(' + printExpr(R, cx) + ')') });
      return;
    }
    if (op === '=') {
      // S.money = Math.max(0, S.money - N)
      if (R.type === 'CallExpression' && R.callee.type === 'MemberExpression' &&
        R.callee.property.name === 'max' && R.arguments.length === 2 &&
        R.arguments[0].type === 'Literal' && R.arguments[0].value === 0 &&
        R.arguments[1].type === 'BinaryExpression' && R.arguments[1].operator === '-' &&
        slice(R.arguments[1].left) === 'S.money') {
        fx.effects.push({ op: 'money', amount: '-(' + printExpr(R.arguments[1].right, cx) + ')', floor: 0 });
        return;
      }
      fx.effects.push({ op: 'set', path: 'money', value: printExpr(R, cx) }); return;
    }
  }
  // --- claims[i].FIELD (inside forClaims; before sexRoot since root is the sex var) ---
  if (cx.itAlias && L.type === 'MemberExpression' && itAliasMatch(L, cx)) {
    fx.effects.push({ op: 'claimPath', ref: '$it', path: itAliasField(L, cx), value: printExpr(R, cx) });
    return;
  }
  // --- sex root: x.FIELD ---
  if (cx.sexRoot && L.type === 'MemberExpression' && rootOf(L) === cx.sexRoot) {
    // ownFill normalization writes are no-ops (interpreter fills)
    if (R.type === 'CallExpression' && R.callee.type === 'Identifier' && R.callee.name === 'ownFill') return;
    sexAssign(L, R, op, cx, fx); return;
  }
  // --- S.relationships.partner... ---
  if (L.type === 'MemberExpression' && /^S\.relationships\.partner/.test(lsrc)) {
    if (lsrc === 'S.relationships.partner' && op === '=' && R.type === 'ObjectExpression') {
      const o = objLit(R, cx);
      fx.effects.push({
        op: 'partnerSet', name: o.name || '"?"', rel: o.rel || '70',
        married: o.married === 'true' ? true : undefined, age: o.age || 's.age'
      });
      return;
    }
    if (lsrc === 'S.relationships.partner' && op === '=' && R.type === 'Literal' && R.value === null) {
      fx.effects.push({ op: 'partnerClear' });
      return;
    }
    if (lsrc === 'S.relationships.partner.rel' && op === '=') {
      const d = clampDelta(R, 's.relationships.partner.rel', cx);
      if (d !== null) { fx.effects.push({ op: 'partnerRel', delta: d }); return; }
    }
    if (lsrc === 'S.relationships.partner.married' && R.type === 'Literal') {
      fx.effects.push({ op: 'partnerMarry' }); return;
    }
    throw new Error('partner shape: ' + slice(e).slice(0, 90));
  }
  // --- pushes onto relationship arrays are CallExpressions (below) ---
  // --- generic S-path set ---
  if (rootOf(L) === 'S' && op === '=') {
    const path = sPathOf(L, 'S');
    if (/^stats\./.test(path)) throw new Error('unhandled stats write: ' + slice(e).slice(0, 80));
    fx.effects.push({ op: 'set', path, value: printExpr(R, cx) });
    return;
  }
  if (rootOf(L) === 'S' && (op === '+=' || op === '-=')) {
    const path = sPathOf(L, 'S');
    fx.effects.push({ op: 'set', path, value: 's.' + path + (op === '+=' ? '+' : '-') + '(' + printExpr(R, cx) + ')' });
    return;
  }
  // --- local reassign (find-pattern temps: idx, c2, nm) ---
  if (L.type === 'Identifier' && cx.lets[L.name]) {
    if (op !== '=') throw new Error('local compound assign: ' + slice(e).slice(0, 80));
    fx.effects.push({ op: 'let', name: L.name, expr: printExpr(R, cx) });
    return;
  }
  // --- local object field write -> setv ---
  if (L.type === 'MemberExpression') {
    const r = rootOf(L);
    if (r && cx.lets[r]) {
      if (op !== '=') throw new Error('local compound assign: ' + slice(e).slice(0, 80));
      fx.effects.push({ op: 'setv', target: r, path: localPathOf(L), value: printExpr(R, cx) });
      return;
    }
  }
  // --- sexRoot nested: x.netori.F handled in sexAssign; x.claims[i] outside loop -> setv-ish? residue
  throw new Error('assign shape [' + lsrc.slice(0, 60) + ']');
}
/* X = Math.max(0, X - N) -> delta -(N) (upper clamp comes from clamp100 discipline) */
function maxZeroDelta(R, X, cx) {
  if (R.type !== 'CallExpression' || R.callee.type !== 'MemberExpression' ||
    R.callee.computed || R.callee.property.name !== 'max') return null;
  if (R.arguments.length !== 2 || R.arguments[0].type !== 'Literal' || R.arguments[0].value !== 0) return null;
  const d = R.arguments[1];
  if (d.type !== 'BinaryExpression' || d.operator !== '-') return null;
  if (printExpr(d.left, cx) !== X) return null;
  return '-(' + printExpr(d.right, cx) + ')';
}
/* clamp(S.stats.K +/- EXPR) -> delta expr string */
function clampDelta(R, base, cx) {
  if (R.type !== 'CallExpression' || R.callee.type !== 'Identifier' || R.callee.name !== 'clamp') return null;
  if (R.arguments.length !== 1) return null;
  const a = R.arguments[0];
  if (a.type !== 'BinaryExpression' || (a.operator !== '+' && a.operator !== '-')) return null;
  if (slice(a.left) !== base.replace(/^s\./, 'S.') && printExpr(a.left, cx) !== base) {
    // left must be the same stat path (allow S./s. spellings)
    if (printExpr(a.left, cx) !== base) return null;
  }
  const rhs = printExpr(a.right, cx);
  return a.operator === '+' ? rhs : '-(' + rhs + ')';
}
function localPathOf(L) {
  const segs = [];
  let o = L;
  while (o.type === 'MemberExpression') {
    if (o.computed) { if (o.property.type !== 'Literal') throw new Error('computed local path'); segs.unshift(o.property.value); }
    else segs.unshift(o.property.name);
    o = o.object;
  }
  return segs.join('.');
}
function itAliasMatch(L, cx) {
  // true if L's object chain contains ARR[idx] at any depth
  let o = L;
  while (o.type === 'MemberExpression') {
    if (o.computed && o.property.type === 'Identifier' && o.property.name === cx.itAlias.idx &&
      printExpr(o.object, cx) === cx.itAlias.arr) return true;
    o = o.object;
  }
  return false;
}
function itAliasField(L, cx) {
  // dotted path below the ARR[idx] level, e.g. preg.state for x.claims[i].preg.state
  const segs = [];
  let o = L, found = false;
  while (o.type === 'MemberExpression') {
    if (!found && o.computed && o.property.type === 'Identifier' && o.property.name === cx.itAlias.idx &&
      printExpr(o.object, cx) === cx.itAlias.arr) { found = true; o = o.object; break; }
    segs.unshift(o.computed ? o.property.value : o.property.name);
    o = o.object;
  }
  return segs.join('.');
}
/* x.FIELD = ... (sexRoot) */
function sexAssign(L, R, op, cx, fx) {
  const tail = slice(L).slice(cx.sexRoot.length + 1); // FIELD or nested
  const top = tail.split('.')[0].split('[')[0];
  const X = 's.sex.' + top;
  if (op === '=') {
    if (['corruption', 'stamina', 'skill', 'scandal', 'addiction'].includes(top)) {
      const mx = maxZeroDelta(R, X, cx);
      if (mx !== null) { fx.effects.push({ op: top === 'corruption' ? 'corr' : top, delta: mx }); return; }
      const d = clampDelta(R, X, cx);
      if (d !== null) { fx.effects.push({ op: top === 'corruption' ? 'corr' : top, delta: d }); return; }
    }
    if (top === 'xp' && R.type === 'BinaryExpression' && R.operator === '+' && printExpr(R.left, cx) === X) {
      fx.effects.push({ op: 'xp', n: numLit(R.right) }); return;
    }
    if (top === 'protection' && R.type === 'Literal') { fx.effects.push({ op: 'protection', bool: !!R.value }); return; }
    if (top === 'pregScares' && op === '=' && R.type === 'BinaryExpression' && R.operator === '+' &&
      (printExpr(R.left, cx) === '(s.sex.pregScares||0)' || printExpr(R.left, cx) === 's.sex.pregScares||0')) { fx.effects.push({ op: 'pregScares' }); return; }
    if (top === 'alpha') {
      if (R.type === 'Literal' && R.value === null) { fx.effects.push({ op: 'haremAlphaClear' }); return; }
      fx.effects.push({ op: 'haremAlphaSet', name: printExpr(R, cx) }); return;
    }
    if (top === 'lawNote') { fx.effects.push({ op: 'lawNote', label: printExpr(R, cx) }); return; }
    if (top === 'lovers' && tail === 'lovers') { // x.lovers = [] or x.lovers = x.lovers.slice(-8)
      if (R.type === 'ArrayExpression' && !R.elements.length) { fx.effects.push({ op: 'lovClear' }); return; }
      if (isSliceNeg8(R, cx)) return; // no-op after lovPush
    }
    if (top === 'leverageOn' && R.type === 'ArrayExpression' && !R.elements.length) { fx.effects.push({ op: 'levOnClear' }); return; }
    if (top === 'claims' && R.type === 'ArrayExpression' && !R.elements.length) { fx.effects.push({ op: 'claimsClear' }); return; }
    if (top === 'haremTension' || top === 'fertility') { fx.effects.push({ op: 'sexset', path: top, value: printExpr(R, cx) }); return; }
  }
  if ((op === '+=' || op === '-=') && top === 'xp') { fx.effects.push({ op: 'xp', n: (op === '+=' ? '' : '-') + '(' + printExpr(R, cx) + ')' }); return; }
  if (top === 'netori' && (op === '+=' || op === '-=' || op === '=')) {
    const field = tail.split('.')[1];
    const d = op === '=' ? printExpr(R, cx) : (op === '+=' ? printExpr(R, cx) : '-(' + printExpr(R, cx) + ')');
    fx.effects.push({ op: 'netori', field, delta: d }); return;
  }
  throw new Error('sex assign: ' + slice(L).slice(0, 50) + ' ' + op);
}
function numLit(n) {
  if (n.type === 'Literal' && typeof n.value === 'number') return n.value;
  throw new Error('xp not literal');
}
function isSliceNeg8(R, cx) {
  return R.type === 'CallExpression' && R.callee.type === 'MemberExpression' &&
    R.callee.property.name === 'slice' && R.arguments.length === 1 &&
    R.arguments[0].type === 'UnaryExpression' && R.arguments[0].operator === '-' &&
    R.arguments[0].argument.value === 8;
}
function handleUpdate(e, cx, fx) {
  const a = e.argument;
  if (e.operator !== '++' && e.operator !== '--') throw new Error('update op');
  const d = e.operator === '++' ? 1 : -1;
  if (a.type === 'MemberExpression' && cx.sexRoot && rootOf(a) === cx.sexRoot) {
    const tail = slice(a).slice(cx.sexRoot.length + 1);
    if (tail === 'pregScares') { fx.effects.push({ op: 'pregScares' }); return; }
    if (tail === 'partners') return; // covered by lovPush (every fx push pairs with partners++)
    if (/^netori\./.test(tail)) { fx.effects.push({ op: 'netori', field: tail.split('.')[1], delta: d }); return; }
    if (tail === 'broken') { fx.effects.push({ op: 'set', path: 'sex.broken', value: 's.sex.broken' + (d > 0 ? '+1' : '-1') }); return; }
    throw new Error('sex update: ' + tail);
  }
  if (a.type === 'MemberExpression' && rootOf(a) === 'S') {
    const path = sPathOf(a, 'S');
    fx.effects.push({ op: 'set', path, value: 's.' + path + (d > 0 ? '+1' : '-1') });
    return;
  }
  throw new Error('update shape: ' + slice(e).slice(0, 60));
}
function handleCallStmt(e, cx, fx) {
  const c = e.callee;
  const A = (i) => e.arguments[i] === undefined ? undefined : { expr: printExpr(e.arguments[i], cx) };
  if (c.type === 'Identifier') {
    switch (c.name) {
      case 'sxK': fx.effects.push({ op: 'kink', id: litStr(e.arguments[1]) }); return;
      case 'ownHist': {
        const o = e.arguments[2];
        const acts = o && o.type === 'ObjectExpression' ? actList(propOf(o, 'acts'), cx) : ['"vanilla"'];
        const forced = o && o.type === 'ObjectExpression' ? truthyProp(propOf(o, 'forced')) : false;
        fx.effects.push({ op: 'histLog', name: printExpr(e.arguments[1], cx), acts, forced: forced || undefined });
        return;
      }
      case 'ownClaim':
        fx.effects.push({ op: 'call', fn: 'sex.ownClaim', args: { name: A(1), via: A(2), ob: A(3), os: A(4) } });
        return;
      case 'sxClaim':
        fx.effects.push({ op: 'call', fn: 'sex.claim', args: { name: A(1), ob: A(2), os: A(3), stage: A(4) } });
        return;
      case 'ownCorr': fx.effects.push({ op: 'corr', name: printExpr(e.arguments[1], cx), delta: printExpr(e.arguments[2], cx) }); return;
      case 'addSxCorr': fx.effects.push({ op: 'corr', delta: printExpr(e.arguments[1], cx) }); return;
      case 'sxPreg': case 'ownPreg':
        fx.effects.push({ op: 'call', fn: 'sex.preg', args: { name: A(1), mult: A(2), ctrl: A(3) } });
        return;
      case 'ownForce': fx.effects.push({ op: 'call', fn: 'sex.force', args: { name: A(1) } }); return;
      case 'tryPromote': fx.effects.push({ op: 'tryPromote', why: { expr: printExpr(e.arguments[1] || e.arguments[0], cx) }, asOutcome: true }); return;
      case 'ownFill': case 'sexE': return; // normalization no-ops (interpreter fills)
      case 'randName': case 'partnerName': throw new Error('bare call value discarded');
      default: throw new Error('call stmt: ' + c.name);
    }
  }
  if (c.type === 'MemberExpression' && !c.computed && c.property.name === 'splice') {
    const recv2 = printExpr(c.object, cx);
    if (recv2 === 's.sex.claims' && e.arguments.length === 2) {
      fx.effects.push({ op: 'claimSplice', index: printExpr(e.arguments[0], cx) });
      return;
    }
    throw new Error('splice on ' + recv2);
  }
  if (c.type === 'MemberExpression' && !c.computed && c.property.name === 'push') {
    const recv = printExpr(c.object, cx);
    const arg = e.arguments[0];
    if (arg && cx.lets[recv]) {
      fx.effects.push({ op: 'arrPush', target: recv, value: printExpr(arg, cx) });
      return;
    }
    if (recv === 's.relationships.pets' && arg.type === 'ObjectExpression') {
      const o = objLit(arg, cx);
      fx.effects.push({ op: 'addPet', name: o.name, petType: rawStr(propOf(arg, 'type')), rel: rawNum(propOf(arg, 'rel')) || 75 });
      return;
    }
    if (recv === 's.relationships.children' && arg.type === 'ObjectExpression') {
      const o = objLit(arg, cx);
      fx.effects.push({ op: 'addChild', name: o.name, age: rawNum(propOf(arg, 'age')) || 0, rel: rawNum(propOf(arg, 'rel')) || 90 });
      return;
    }
    if (recv === 's.relationships.friends' && arg.type === 'ObjectExpression') {
      const o = objLit(arg, cx);
      fx.effects.push({ op: 'addFriend', name: o.name, rel: rawNum(propOf(arg, 'rel')) || 60 });
      return;
    }
    if (recv === 's.sex.lovers') { fx.effects.push({ op: 'lovPush', name: printExpr(arg, cx) }); return; }
    if (recv === 's.sex.leverageOn' && arg.type === 'ObjectExpression') {
      fx.effects.push({ op: 'levOn', target: printExpr(propOf(arg, 'target'), cx), secret: printExpr(propOf(arg, 'secret'), cx) });
      return;
    }
    if (recv === 's.sex.leverageOff' && arg.type === 'ObjectExpression') {
      fx.effects.push({ op: 'levOff', holder: printExpr(propOf(arg, 'holder'), cx), secret: printExpr(propOf(arg, 'secret'), cx) });
      return;
    }
    if (recv === 's.underworld.crew' && arg.type === 'ObjectExpression') {
      const o = objLit(arg, cx);
      fx.effects.push({ op: 'crewAdd', name: o.name });
      return;
    }
    throw new Error('push on ' + recv);
  }
  throw new Error('call shape: ' + slice(e).slice(0, 80));
}
function propOf(obj, key) {
  if (!obj || obj.type !== 'ObjectExpression') return null;
  for (const p of obj.properties) { const k = p.key.name || p.key.value; if (k === key) return p.value; }
  return null;
}
function truthyProp(n) { return !!n && !(n.type === 'Literal' && !n.value); }
function litStr(n) {
  if (!n || n.type !== 'Literal' || typeof n.value !== 'string') throw new Error('expected string literal');
  return n.value;
}
function rawStr(n) {
  if (!n) return undefined;
  if (n.type === 'Literal') return n.value;
  throw new Error('expected literal');
}
function rawNum(n) {
  if (!n) return undefined;
  if (n.type === 'Literal' && typeof n.value === 'number') return n.value;
  throw new Error('expected number literal');
}
function actList(n, cx) {
  if (!n || n.type !== 'ArrayExpression') return ['"vanilla"'];
  return n.elements.map((el) => {
    if (el.type === 'Literal') return JSON.stringify(el.value);
    return printExpr(el, cx);
  });
}
function objLit(obj, cx) {
  const o = {};
  for (const p of obj.properties) { const k = p.key.name || p.key.value; o[k] = printExpr(p.value, cx); }
  return o;
}
function handleReturn(arg, cx, fx) {
  if (!arg) { fx.effects.push({ op: 'outcome', tpl: '' }); return; }
  if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier' && arg.callee.name === 'tryPromote') {
    fx.effects.push({ op: 'tryPromote', why: { expr: printExpr(arg.arguments[1] || arg.arguments[0], cx) }, asOutcome: true });
    return;
  }
  fx.effects.push({ op: 'outcome', tpl: retToTemplate(arg, cx) });
}
/* for(i=0;i<ARR.length;i++){...} over claims -> forClaims */
function handleFor(st, cx, fx) {
  const src = slice(st).slice(0, 200);
  const init = st.init, test = st.test, upd = st.update;
  if (!init || init.type !== 'VariableDeclaration' || init.declarations.length !== 1) throw new Error('for init: ' + src);
  const idx = init.declarations[0].id.name;
  if (!test || test.type !== 'BinaryExpression' || test.operator !== '<') throw new Error('for test: ' + src);
  const arrSrc = printExpr(test.right.type === 'MemberExpression' && test.right.property.name === 'length' ? test.right.object : test.right, cx);
  if (arrSrc !== 's.sex.claims') throw new Error('for over ' + arrSrc);
  const bodySrc = slice(st.body);
  if (/\bshift\(\)/.test(bodySrc)) throw new Error('shift loop needs ritual in ' + cx.evId);
  const cx2 = Object.assign({}, cx, { itAlias: { arr: arrSrc, idx } });
  const inner = { effects: [], terminated: false };
  compileList(blockStmts(st.body), cx2, inner);
  // propagate lets/aliases discovered inside loop
  cx.sexRoot = cx2.sexRoot || cx.sexRoot;
  Object.assign(cx.sortVars, cx2.sortVars);
  Object.assign(cx.lets, cx2.lets);
  fx.effects.push({ op: 'forClaims', idxAs: idx, body: inner.effects });
}

/* ================= driver (legacy transpiler: src/events.js → events/*.json) ================= */
const BUCKETS = [
  { id: 'baby', minAge: 0, maxAge: 4 }, { id: 'kid', minAge: 5, maxAge: 12 },
  { id: 'teen', minAge: 13, maxAge: 17 }, { id: 'young', minAge: 18, maxAge: 29 },
  { id: 'adult', minAge: 30, maxAge: 44 }, { id: 'mid', minAge: 45, maxAge: 59 },
  { id: 'senior', minAge: 60, maxAge: 120 }
];
function litOfProp(ev, key) {
  const p = ev.properties.find((x) => (x.key.name || x.key.value) === key);
  if (!p) return undefined;
  if (p.value.type !== 'Literal') throw new Error(key + ' not literal in ' + evIdOf(ev));
  return p.value.value;
}
function evIdOf(ev) {
  const p = ev.properties.find((x) => (x.key.name || x.key.value) === 'id');
  return p.value.value;
}
function fnOfProp(ev, key) {
  const p = ev.properties.find((x) => (x.key.name || x.key.value) === key);
  return p ? p.value : null;
}
function deriveTags(evJson, srcText) {
  const tags = [];
  const b = BUCKETS.find((x) => evJson.minAge <= x.maxAge && evJson.maxAge >= x.minAge);
  const ageTag = evJson.minAge >= 18 ? 'adult-life' : (evJson.maxAge <= 4 ? 'baby' : (evJson.maxAge <= 12 ? 'kid' : (evJson.maxAge <= 17 ? 'teen' : 'family')));
  tags.push(ageTag);
  if (/^(sx|ow|ex)-/.test(evJson.id)) tags.push('sex');
  if (/^ow-/.test(evJson.id)) tags.push('ownership');
  if (/^ex-/.test(evJson.id)) tags.push('extreme');
  if (/^uw-/.test(evJson.id)) tags.push('underworld', 'crime');
  if (/^co-/.test(evJson.id)) tags.push('company');
  if (/^kid-/.test(evJson.id)) tags.push('family');
  if (/company/.test(srcText)) tags.push('company');
  if (/underworld|crew|territory/.test(srcText)) tags.push('underworld');
  if (/inJail|prison|arrest|crime/.test(srcText)) tags.push('crime');
  if (/partner/.test(srcText)) tags.push('love');
  if (/children/.test(srcText)) tags.push('family');
  if (/prestige|fame|followers/.test(srcText)) tags.push('status');
  if (/money|salary|\$/.test(srcText)) tags.push('money');
  return [...new Set(tags)];
}
  const residue = [];
  const events = [];
  for (const ev of ARR.elements) {
    const id = evIdOf(ev);
    try {
      const minAge = litOfProp(ev, 'minAge'), maxAge = litOfProp(ev, 'maxAge'), title = litOfProp(ev, 'title');
      if (!Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge > maxAge) throw new Error('bad age range');
      if (typeof title !== 'string' || !title) throw new Error('bad title');
      const textNode = fnOfProp(ev, 'text');
      if (!textNode) throw new Error('missing text');
      const text = textToJson(textNode, {});
      const condNode = fnOfProp(ev, 'cond');
      const preconditions = condNode ? condToRule(condNode, id) : null;
      const chNode = ev.properties.find((x) => (x.key.name || x.key.value) === 'choices');
      if (!chNode || chNode.value.type !== 'ArrayExpression') throw new Error('bad choices');
      if (!chNode.value.elements.length || chNode.value.elements.length > 4) throw new Error('choices 1..4');
      const choices = chNode.value.elements.map((ch, ci) => {
        const label = litOfProp(ch, 'label'), hint = litOfProp(ch, 'hint') || '';
        const fxNode = fnOfProp(ch, 'fx');
        if (typeof label !== 'string' || !label) throw new Error('bad label');
        if (!fxNode) throw new Error('choice without fx');
        const effects = compileFx(fxNode, id, ci);
        const last = effects[effects.length - 1];
        const hasOut = last && (last.op === 'outcome' || last.asOutcome || last.op === 'returnIf' || last.op === 'chance' || last.op === 'branch');
        if (!hasOut) throw new Error('choice without terminal outcome');
        return { label: label.slice(0, 80), hint: String(hint).slice(0, 60), effects };
      });
      const srcText = slice(ev);
      const evJson = { id, minAge, maxAge, title, tags: [], weight: 1, preconditions, text, choices };
      evJson.tags = deriveTags(evJson, srcText);
      events.push(evJson);
    } catch (err) {
      residue.push({ id, error: String(err && err.message || err).slice(0, 300), at: guessAt(err) });
    }
  }
  function guessAt(err) { return ''; }
  const summary = { events: events.length, residue: residue.length };
  if (opts.write && !residue.length) await writeContent(events, OUT_EVENTS, OUT_PACKS, BUCKETS);
  return { events, residue, summary, buckets: BUCKETS.map((b) => b.id) };
}
async function writeContent(events, OUT_EVENTS, OUT_PACKS, BUCKETS) {
  OUT_EVENTS = OUT_EVENTS || 'src/content/events';
  for (const ev of events)
    await fs.writeTextFile(OUT_EVENTS + '/' + ev.id + '.json', JSON.stringify(ev, null, 1));
  // packs + index + fallback share the dedup layout (single source of truth);
  // OUT_PACKS/BUCKETS kept in signature for compat but no longer used.
  let priorIndex;
  try { priorIndex = JSON.parse(await fs.readTextFile('src/content/index.json')); }
  catch (e) { priorIndex = { packs: [], dataPacks: [] }; }
  return layoutAndEmit(events, priorIndex);
}


/* ================= dedup pack layout (content v4+: each event stored ONCE) =================
 * WHY: young/adult/mid/senior packs embedded the same sx-/ow-/ex- (and other
 * multi-bracket) events 3-4x (~1.4 MB duplicated). New layout stores every
 * event in exactly ONE adult-side pack file:
 *   - young/adult/mid/senior: ONLY events whose [minAge,maxAge] fits entirely
 *     inside that bucket (exclusive events; adult/mid may be empty today).
 *   - mature (18-120): EVERYTHING else with maxAge>=18 — all sx-/ow-/ex-,
 *     all multi-bracket standards, all boundary-spanners (minAge<18<=maxAge).
 *   - baby/kid/teen: UNCHANGED (same file lists, same embeddings). The engine
 *     never loads `mature` before 18, so boundary-spanners (e.g. alien 5-120)
 *     must stay listed in the under-18 packs they touch; that one deliberate
 *     duplication (under-18 pack + mature) is what keeps <18 eligibility exact.
 * Loader contract (events-runtime.js): at age a the engine loads bucket(a),
 * plus `mature` once (cached) when a>=18. Eligibility is then exact: an 18+
 * exclusive event is eligible only inside its bucket; everything else 18+ is
 * in the cached mature pack; under-18 behaves exactly as before.
 * HOW TO RUN (worker with workspace fs; no acorn needed):
 *   const code = await fs.readTextFile('src/tools/build-events.js');
 *   const build = new Function('fs', code + '\nreturn buildEvents;')(fs);
 *   const rep = await build.dedupeAdultPacks({write:false}); // dry run: equivalence proof + sizes
 *   const rep2 = await build.dedupeAdultPacks({write:true});  // writes 8 packs + index + fallback
 */
const ADULT_BUCKETS = [
  { id: 'young', minAge: 18, maxAge: 29 }, { id: 'adult', minAge: 30, maxAge: 44 },
  { id: 'mid', minAge: 45, maxAge: 59 }, { id: 'senior', minAge: 60, maxAge: 120 }
];
const UNDER_BUCKETS = [
  { id: 'baby', minAge: 0, maxAge: 4 }, { id: 'kid', minAge: 5, maxAge: 12 },
  { id: 'teen', minAge: 13, maxAge: 17 }
];
const MATURE_PACK = { id: 'mature', minAge: 18, maxAge: 120 };
/* exclusive home bucket, or null (→ mature, if maxAge>=18) */
function adultHomeOf(ev) {
  for (const b of ADULT_BUCKETS) if (ev.minAge >= b.minAge && ev.maxAge <= b.maxAge) return b.id;
  return null;
}
function packEntry(id, minAge, maxAge, files) {
  return { id: id, title: id, type: 'events', minAge: minAge, maxAge: maxAge, files: files };
}
/* full in-memory plan + brute-force eligibility proof (old vs new, ages 0..120) */
function layoutReport(events, oldIndex) {
  const oldListed = {};
  (oldIndex.packs || []).forEach((p) => ((p.files || []).forEach((id) => ((oldListed[id] = oldListed[id] || []).push(p.id)))));
  const evById = {};
  events.forEach((e) => { evById[e.id] = e; });
  // under-18 file lists: prior verbatim, plus any event the prior index forgot
  const underFiles = {};
  UNDER_BUCKETS.forEach((b) => {
    const p = (oldIndex.packs || []).find((x) => x.id === b.id);
    if (!p) throw new Error('prior index missing under-18 pack ' + b.id);
    underFiles[b.id] = p.files.slice();
  });
  events.forEach((e) => {
    if (e.minAge >= 18) return;
    const inUnder = UNDER_BUCKETS.filter((b) => (underFiles[b.id].indexOf(e.id) >= 0)).map((b) => b.id);
    if (!inUnder.length) UNDER_BUCKETS.forEach((b) => {
      if (e.minAge <= b.maxAge && e.maxAge >= b.minAge) underFiles[b.id].push(e.id);
    });
  });
  const buckets = { young: [], adult: [], mid: [], senior: [] };
  const mature = [];
  events.forEach((e) => {
    const h = adultHomeOf(e);
    if (h) buckets[h].push(e.id);
    else if (e.maxAge >= 18) mature.push(e.id);
  });
  Object.keys(buckets).forEach((k) => buckets[k].sort());
  mature.sort();
  const newFiles = Object.assign({}, underFiles, buckets, { mature: mature });
  // brute force: LEGACY eligible set per age must match old layout exactly.
  // (New files that no prior pack listed are additions, not layout changes:
  // they only ever ADD eligibility, so they are excluded from the equivalence
  // proof here and checked by validate-content's home-pack coverage instead.)
  const legacy = events.filter((e) => (oldListed[e.id] || []).length);
  const mismatches = [];
  for (let age = 0; age <= 120; age++) {
    const oldEl = legacy.filter((e) =>
      e.minAge <= age && e.maxAge >= age).map((e) => e.id).sort();
    const packsNow = [UNDER_BUCKETS.concat(ADULT_BUCKETS).find((b) => age >= b.minAge && age <= b.maxAge).id]
      .concat(age >= 18 ? ['mature'] : []);
    const listedNow = {};
    packsNow.forEach((pid) => ((newFiles[pid] || []).forEach((id) => { listedNow[id] = 1; })));
    const newEl = legacy.filter((e) => listedNow[e.id] && e.minAge <= age && e.maxAge >= age).map((e) => e.id).sort();
    if (JSON.stringify(oldEl) !== JSON.stringify(newEl)) {
      const o = oldEl.filter((id) => newEl.indexOf(id) < 0), n = newEl.filter((id) => oldEl.indexOf(id) < 0);
      mismatches.push({ age: age, lost: o, gained: n });
      if (mismatches.length > 8) break;
    }
  }
  const orphans = events.filter((e) =>
    !(UNDER_BUCKETS.concat(ADULT_BUCKETS).some((b) =>
      (newFiles[b.id] || []).indexOf(e.id) >= 0) || mature.indexOf(e.id) >= 0)).map((e) => e.id);
  const packBytes = {};
  Object.keys(newFiles).forEach((pid) => {
    packBytes[pid] = JSON.stringify({
      pack: pid, events: newFiles[pid].map((id) => evById[id])
    }).length;
  });
  return {
    events: events.length,
    files: { young: buckets.young.length, adult: buckets.adult.length, mid: buckets.mid.length, senior: buckets.senior.length, mature: mature.length },
    boundary: mature.filter((id) => evById[id].minAge < 18),
    orphans: orphans, mismatches: mismatches,
    packBytes: packBytes,
    ok: !mismatches.length && !orphans.length
  };
}
async function layoutAndEmit(events, priorIndex) {
  const rep = layoutReport(events, priorIndex);
  if (!rep.ok) throw new Error('layout refused: ' + JSON.stringify(rep.mismatches.slice(0, 3)) + ' orphans=' + rep.orphans.length);
  const evById = {};
  events.forEach((e) => { evById[e.id] = e; });
  const underFiles = {};
  UNDER_BUCKETS.forEach((b) => {
    underFiles[b.id] = ((priorIndex.packs || []).find((x) => x.id === b.id) || { files: [] }).files.slice();
  });
  events.forEach((e) => {
    if (e.minAge >= 18) return;
    const listed = UNDER_BUCKETS.some((b) => underFiles[b.id].indexOf(e.id) >= 0);
    if (!listed) UNDER_BUCKETS.forEach((b) => {
      if (e.minAge <= b.maxAge && e.maxAge >= b.minAge) underFiles[b.id].push(e.id);
    });
  });
  const buckets = { young: [], adult: [], mid: [], senior: [] };
  events.forEach((e) => { const h = adultHomeOf(e); if (h) buckets[h].push(e.id); });
  Object.keys(buckets).forEach((k) => buckets[k].sort());
  const mature = events.filter((e) => !adultHomeOf(e) && e.maxAge >= 18).map((e) => e.id).sort();
  const byId = (ids) => ids.map((id) => evById[id]);
  const allPacks = UNDER_BUCKETS.map((b) => ({ id: b.id, evs: byId(underFiles[b.id]) }))
    .concat(ADULT_BUCKETS.map((b) => ({ id: b.id, evs: byId(buckets[b.id]) })))
    .concat([{ id: 'mature', evs: byId(mature) }]);
  for (const p of allPacks)
    await fs.writeTextFile('src/content/packs/' + p.id + '.json', JSON.stringify({ pack: p.id, events: p.evs }));
  const migTxt = await fs.readTextFile('src/engine/migrate.js');
  const cvM = /LL\.CONTENT_VERSION\s*=\s*(\d+)/.exec(migTxt);
  const contentVersion = cvM ? +cvM[1] : 4; // single source of truth: migrate.js
  const dataTxt = await fs.readTextFile('src/data.js');
  const provides = {};
  if (/window\.GDATA\s*=\s*\{/.test(dataTxt)) {
    const re = /\n([A-Za-z][\w]*)\s*:/g;
    let m; const keys = [];
    while ((m = re.exec(dataTxt)) && keys.length < 60) keys.push(m[1]);
    provides.gdata = [...new Set(keys)];
  }
  const rangeOf = (pid) => {
    const u = UNDER_BUCKETS.find((b) => b.id === pid), a = ADULT_BUCKETS.find((b) => b.id === pid);
    if (u) return u; if (a) return a; return MATURE_PACK;
  };
  const filesOf = (pid) => pid === 'mature' ? mature :
    (UNDER_BUCKETS.some((b) => b.id === pid) ? underFiles[pid] : buckets[pid]);
  const index = {
    contentVersion: contentVersion,
    packs: UNDER_BUCKETS.concat(ADULT_BUCKETS).concat([MATURE_PACK]).map((b) =>
      packEntry(b.id, b.minAge, b.maxAge, filesOf(b.id))),
    dataPacks: (priorIndex.dataPacks || [
      { id: 'gdata', title: 'jobs/traits/content tables', type: 'data', source: 'src/data.js', provides: provides.gdata || [] },
      { id: 'i18n', title: 'translations', type: 'data', source: 'src/i18n.js', provides: ['I18N'] }
    ])
  };
  await fs.writeTextFile('src/content/index.json', JSON.stringify(index, null, 1));
  await fs.writeTextFile('src/engine/content-fallback.js',
    '/* GENERATED by src/tools/build-events.js — do not hand-edit. Fallback snapshot. */\n' +
    '"use strict";\nwindow.EVENTS_FALLBACK=' + JSON.stringify(events) + ';\n');
  return { report: rep, contentVersion: contentVersion };
}
async function dedupeAdultPacks(opts) {
  opts = opts || {};
  const priorIndex = JSON.parse(await fs.readTextFile('src/content/index.json'));
  const files = (await fs.listFiles()).filter((f) => f.path.indexOf('src/content/events/') === 0);
  const events = [];
  for (const f of files) events.push(JSON.parse(await fs.readTextFile(f.path)));
  events.sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!opts.write) return layoutReport(events, priorIndex);
  return layoutAndEmit(events, priorIndex);
}
buildEvents.dedupeAdultPacks = dedupeAdultPacks;
