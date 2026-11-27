/* LIFE & LEGACY — engine/mcp.js
 * ARCHITECTURE LAYER 6/6 — MCP Protocol (Model Context Protocol, JSON-RPC 2.0).
 *
 * Exposes the game as MCP tools/resources so an EXTERNAL AI agent (Claude,
 * a test harness, a stream overlay) can observe and play: initialize,
 * tools/list, tools/call, resources/list, resources/read. Two transports:
 * (1) direct in-page calls LL.mcp.handle({...}), (2) window.postMessage with
 * {llmcp: <request>} — the reply posts back {llmcp: <response>} to the sender.
 * Never evals, never touches secrets; every handler is
 * try/catch-wrapped and returns a JSON-RPC error object instead of throwing.
 * Write tools (life.new/age/act/actMany, market.tick) run the REAL game
 * functions, so they autosave exactly like normal play — the postMessage
 * transport is therefore same-embedder-only (see the origin allowlist
 * below): only this generator's own perchance.org page may drive it.
 * Pushes "mcp" as its LAST line.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });
(function () {
  function soul() {
    try {
      if (!window.S) return { alive: false };
      return {
        alive: !!S.alive, age: S.age, year: S.year,
        name: S.firstName + " " + S.lastName, gender: S.gender,
        money: S.money, prestige: S.prestige, karma: (S.stats || {}).karma,
        hp: (S.stats || {}).health, happiness: (S.stats || {}).happiness,
        job: (S.jobId || "unemployed"), partner: !!(S.relationships && S.relationships.partner),
        kids: (S.relationships && S.relationships.children || []).length,
        cause: S.deathCause || null
      };
    } catch (e) { return { alive: false, error: "no-soul" }; }
  }
  function market() {
    try {
      if (!window.S || !S.world) return { open: false };
      return {
        open: true, regime: S.world.regime, gdp: +S.world.gdp.toFixed(2),
        idx: Math.round(S.world.idx),
        tickers: S.world.tickers.map(function (t) { return { sym: t.sym, price: +t.price.toFixed(2), chg: +t.chg.toFixed(4) }; })
      };
    } catch (e) { return { open: false }; }
  }
  var TOOLS = [
    { name: "life.status", description: "Current soul snapshot (read-only).", inputSchema: { type: "object", properties: {} } },
    { name: "life.new", description: "Begin a new random life.", inputSchema: { type: "object", properties: {} } },
    { name: "life.age", description: "Advance one year (may open an event modal for the player).", inputSchema: { type: "object", properties: {} } },
    { name: "life.act", description: "Perform a verb by id (see TABS in render.js).", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
    { name: "life.actMany", description: "Perform several verbs in order (agentic loop helper).", inputSchema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"] } },
    { name: "market.status", description: "World market snapshot (read-only).", inputSchema: { type: "object", properties: {} } },
    { name: "market.tick", description: "Advance the world market one tick without aging.", inputSchema: { type: "object", properties: {} } },
    { name: "world.news", description: "Recent world headlines (read-only).", inputSchema: { type: "object", properties: { n: { type: "number" } } } },
    { name: "npc.list", description: "Living NPCs (name, role, age, rel).", inputSchema: { type: "object", properties: { n: { type: "number" } } } },
    { name: "log.tail", description: "Last N life-log lines.", inputSchema: { type: "object", properties: { n: { type: "number" } } } },
    { name: "pcg.plan", description: "Agentic-PCG plan for the current year (tiles + must/never constraints).", inputSchema: { type: "object", properties: {} } },
    { name: "pcg.guide", description: "LLM guidance block + plan line for the current year.", inputSchema: { type: "object", properties: {} } },
    { name: "bus.journal", description: "Recent command-bus events (CQRS journal tail).", inputSchema: { type: "object", properties: { n: { type: "number" } } } },
    { name: "bus.projection", description: "CQRS read-model projection (counts, regime, rhythm).", inputSchema: { type: "object", properties: {} } }
  ];
  function callTool(name, args) {
    args = args || {};
    switch (name) {
      case "life.status": return soul();
      case "life.new":
        if (typeof newLife !== "function") throw new Error("no-engine");
        newLife({}); return Object.assign({ born: true }, soul());
      case "life.age":
        if (typeof ageUp !== "function") throw new Error("no-engine");
        ageUp(false); return Object.assign({ aged: true }, soul());
      case "life.act":
        if (typeof doAct !== "function") throw new Error("no-engine");
        if (!args.id) throw new Error("missing-id");
        doAct(String(args.id)); return Object.assign({ acted: String(args.id) }, soul());
      case "life.actMany": {
        if (typeof doAct !== "function") throw new Error("no-engine");
        var ids = args.ids || [];
        if (!ids.length) throw new Error("missing-ids");
        var done = [];
        for (var ai = 0; ai < Math.min(8, ids.length); ai++) {
          try { doAct(String(ids[ai])); done.push(String(ids[ai])); } catch (e) { done.push(String(ids[ai]) + ":error"); }
          try { if (!window.S || !S.alive) break; } catch (e2) {}
        }
        return Object.assign({ actedMany: done }, soul());
      }
      case "market.status": return market();
      case "market.tick":
        if (typeof wTickWorld !== "function") throw new Error("no-engine");
        wTickWorld(false); return market();
      case "log.tail": {
        var n = Math.min(40, Math.max(1, args.n || 8)), out = [];
        try { out = S.log.slice(-n).map(function (e) { return { age: e.age, icon: e.icon, text: String(e.text).slice(0, 220) }; }); } catch (e) {}
        return out;
      }
      case "pcg.plan":
        if (window.LL && LL.pcg) return LL.pcg.agentPropose("scene");
        throw new Error("no-pcg");
      case "pcg.guide": {
        if (!(window.LL && LL.pcg)) throw new Error("no-pcg");
        return { guide: LL.pcg.guideBlock(), plan: LL.pcg.planLine(), rhythm: LL.pcg.rhythmFor((window.S && S.year) || 0) };
      }
      case "world.news": {
        var nn = Math.min(20, Math.max(1, args.n || 6)), nout = [];
        try { nout = S.world.news.slice(-nn).map(function (e) { return { age: e.age, icon: e.icon, text: String(e.text).slice(0, 200) }; }); } catch (e) {}
        return nout;
      }
      case "npc.list": {
        var mn = Math.min(24, Math.max(1, args.n || 12)), mout = [];
        try {
          mout = S.world.npcs.filter(function (n) { return n.alive; }).slice(0, mn).map(function (n) {
            return { name: n.name, role: n.role, age: n.age, rel: Math.round(n.rel), job: n.jobId };
          });
        } catch (e) {}
        return mout;
      }
      case "bus.journal":
        if (window.LL && LL.bus) return LL.bus.journalTail(args.n || 10);
        throw new Error("no-bus");
      case "bus.projection":
        if (window.LL && LL.bus) return LL.bus.query("projection", {}).value;
        throw new Error("no-bus");
      default: throw new Error("unknown-tool:" + name);
    }
  }
  function handle(msg) {
    var res = { jsonrpc: "2.0", id: (msg && msg.id !== undefined) ? msg.id : null };
    try {
      if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
        res.error = { code: -32600, message: "invalid request" }; return res;
      }
      var p = msg.params || {};
      if (msg.method === "initialize") {
        res.result = { protocolVersion: "2024-11-05", serverInfo: { name: "life-and-legacy", version: (window.LL&&LL.APP_VERSION)||"v0.1.06" }, capabilities: { tools: {}, resources: {} } };
      } else if (msg.method === "tools/list") {
        res.result = { tools: TOOLS };
      } else if (msg.method === "tools/call") {
        if (!p.name) throw new Error("missing-name");
        res.result = { content: [{ type: "text", text: JSON.stringify(callTool(p.name, p.arguments || {})) }] };
      } else if (msg.method === "resources/list") {
        res.result = { resources: [{ uri: "life://log", name: "Life log" }, { uri: "life://soul", name: "Soul snapshot" }, { uri: "life://rhythm", name: "Year rhythm + plan" }, { uri: "life://npcs", name: "Living NPCs" }, { uri: "life://news", name: "World headlines" }, { uri: "life://journal", name: "Command-bus journal" }] };
      } else if (msg.method === "resources/read") {
        if (p.uri === "life://log") res.result = { contents: [{ uri: p.uri, text: JSON.stringify(callTool("log.tail", { n: 20 })) }] };
        else if (p.uri === "life://soul") res.result = { contents: [{ uri: p.uri, text: JSON.stringify(soul()) }] };
        else if (p.uri === "life://rhythm") res.result = { contents: [{ uri: p.uri, text: JSON.stringify(callTool("pcg.guide", {})) }] };
        else if (p.uri === "life://npcs") res.result = { contents: [{ uri: p.uri, text: JSON.stringify(callTool("npc.list", { n: 12 })) }] };
        else if (p.uri === "life://news") res.result = { contents: [{ uri: p.uri, text: JSON.stringify(callTool("world.news", { n: 6 })) }] };
        else if (p.uri === "life://journal") res.result = { contents: [{ uri: p.uri, text: JSON.stringify(callTool("bus.journal", { n: 10 })) }] };
        else throw new Error("unknown-resource:" + p.uri);
      } else if (msg.method === "prompts/list") {
        res.result = { prompts: [{ name: "direct-life", description: "Stage a Director scene honoring the year's rhythm plan." }] };
      } else if (msg.method === "prompts/get") {
        var __pl = "";
        try { __pl = (window.LL && LL.pcg) ? LL.pcg.planLine() : ""; } catch (e) {}
        res.result = { description: "Director prompt with rhythm constraints", messages: [{ role: "user", content: { type: "text", text: "Stage a vivid life scene. " + __pl + " Use life.status + market.status for grounding." } }] };
      } else {
        res.error = { code: -32601, message: "method not found: " + msg.method };
      }
    } catch (e) {
      res.error = { code: -32000, message: String((e && e.message) || e).slice(0, 200) };
    }
    return res;
  }
  try {
    window.addEventListener("message", function (ev) {
      var d = ev && ev.data;
      if (!d || !d.llmcp) return;
      /* Same-embedder-only: the write tools autosave like normal play, so an
       * arbitrary third-party embed must not be able to drive lives. Only the
       * generator's own top-level page (perchance.org) and this same origin
       * may use the postMessage transport; in-page agents keep using
       * LL.mcp.handle() directly (no origin involved). */
      try {
        var __origin = String((ev && ev.origin) || "");
        var __same = false;
        try { __same = (__origin === window.location.origin); } catch (e) {}
        if (!__same && __origin !== "https://perchance.org") return;
      } catch (e) { return; }
      var req = d.llmcp;
      if (typeof req === "string") { try { req = JSON.parse(req); } catch (e) { return; } }
      /* JSON-RPC discriminator: only method-calls are processed. Replies
       * (result/error, no method) — including our own echoes back to this
       * same window — are never re-processed, or the transport storms. */
      if (!req || typeof req.method !== "string") return;
      var out = handle(req);
      try {
        if (ev.source && ev.source.postMessage) ev.source.postMessage({ llmcp: out }, ev.origin || "*");
      } catch (e) {}
    });
  } catch (e) {}
  window.LL.mcp = { handle: handle, tools: function () { return TOOLS.map(function (t) { return t.name; }); } };
  window.mcpStatus = function () { return { tools: TOOLS.length, transports: ["direct", "postMessage"] }; };
  window.mcpCall = function (method, params, id) { return handle({ jsonrpc: "2.0", id: (id === undefined ? 1 : id), method: method, params: params || {} }); };
})();
LL.files.push("mcp"); /* end-of-file registration: counts as loaded only after this file fully ran */
