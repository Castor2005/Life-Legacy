/* LIFE & LEGACY — engine/graphs.js
 * Mermaid diagram layer via mermaid-graph-plugin.
 * Split-safe classic script: shared globals (S, LL, root.mermaid).
 * Load order = index.html order (after community.js). Registered in
 * LL.files + boot EXPECT_FILES/EXPECT_GLOBALS.
 *
 * What it does: renders two diagrams the game had no visuals for —
 *   (1) a dynasty family flowchart in the Dynasty modal,
 *   (2) a divergence chain in the World Timeline modal (altered / averted /
 *       hypothetical events, newest first).
 * Existing canvas sparklines (net worth, market index) are deliberately
 * left alone: they work offline, while mermaid needs its CDN.
 *
 * Robustness contract (the plugin's raw-string path): the plugin shifts the
 * first line off raw input (it expects a list name there), so every source
 * is prefixed with a dummy header line. Labels are sanitized (no quotes /
 * brackets / hashes / backticks — all break mermaid parsing) and capped.
 * renderMermaidInto() shows a drawing placeholder, injects the plugin HTML,
 * polls ≤20s for the rendered <svg>, and falls back to plain text on any
 * failure (offline CDN, missing plugin, garbled syntax) — it never throws,
 * never leaves a stuck spinner, and never logs errors.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });

function mermaidOk() {
  try { return !!(root && typeof root.mermaid === "function"); }
  catch (e) { return false; }
}

/* Strip everything that breaks mermaid flowchart/timeline parsing. */
function escMermaid(s, max) {
  var t = String(s == null ? "" : s);
  t = t.replace(/[\r\n\t]+/g, " ");
  t = t.replace(/["#`\\\[\]{}<>;]/g, "");
  t = t.replace(/\s+/g, " ").trim();
  max = max || 30;
  if (t.length > max) t = t.slice(0, max - 1) + "…";
  return t || "·";
}

function renderMermaidInto(el, raw, fallbackHTML) {
  if (!el) return;
  var fb = fallbackHTML || '<p class="sub">📊 Chart unavailable.</p>';
  if (!mermaidOk()) { el.innerHTML = fb; return; }
  el.innerHTML = '<p class="sub">📊 Drawing chart…</p>';
  var html = "";
  try { html = root.mermaid(raw, { inputType: "raw" }); }
  catch (e) { el.innerHTML = fb; return; }
  if (typeof html !== "string" || !html) { el.innerHTML = fb; return; }
  el.innerHTML = html;
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    try {
      if (el.querySelector("svg")) { clearInterval(timer); return; }
      if (tries >= 40) { clearInterval(timer); el.innerHTML = fb; }
    } catch (e) { try { clearInterval(timer); } catch (err) {} el.innerHTML = fb; }
  }, 500);
}

/* ---- (1) dynasty family flowchart ---- */
function dynastyGraphText() {
  if (typeof S === "undefined" || !S || !S.relationships) return "";
  var L = ["graph TD"], n = 0;
  function node(label) {
    var id = "N" + (n++);
    L.push('  ' + id + '["' + escMermaid(label, 30) + '"]');
    return id;
  }
  var gps = S.relationships.grandparents || [];
  var gp = null;
  if (gps.length) {
    gp = node("📜 Grandparents (" + gps.length + "): " +
      gps.slice(0, 2).map(function (g) { return g.name; }).join(", "));
  }
  var _mn="Mom",_dn="Dad";
  try{ if(S.relationships.mom&&S.relationships.mom.name)_mn=S.relationships.mom.name; }catch(e){}
  try{ if(S.relationships.dad&&S.relationships.dad.name)_dn=S.relationships.dad.name; }catch(e){}
  var mom = node(S.relationships.momAge > -100 ? "👩 " + _mn : "🕊️ " + _mn);
  var dad = node(S.relationships.dadAge > -100 ? "🧔 " + _dn : "🕊️ " + _dn);
  if (gp) { L.push("  " + gp + "-->" + mom); L.push("  " + gp + "-->" + dad); }
  var you = node("👑 " + S.firstName + " (" + S.age + ")");
  L.push("  " + mom + "-->" + you);
  L.push("  " + dad + "-->" + you);
  var sibs = S.relationships.siblings || [];
  sibs.slice(0, 4).forEach(function (s) {
    var sn = node("🧬 " + s.name + " (" + s.age + ")");
    L.push("  " + mom + "-->" + sn);
  });
  if (sibs.length > 4) {
    var sm = node("+" + (sibs.length - 4) + " more siblings");
    L.push("  " + mom + "-->" + sm);
  }
  if (S.relationships.partner) {
    var p = node("💘 " + S.relationships.partner.name);
    L.push("  " + you + "---" + p);
  }
  var kids = S.relationships.children || [];
  var lastKid = null;
  if (!kids.length) {
    var nk = node("🌱 No children yet");
    L.push("  " + you + "-->" + nk);
  }
  kids.slice(0, 6).forEach(function (c, i) {
    var kn = node("🌱 " + c.name + " (" + c.age + ")" +
      (S.heirId === i ? " 👑HEIR" : ""));
    L.push("  " + you + "-->" + kn);
    lastKid = kn;
  });
  if (kids.length > 6) {
    var km = node("+" + (kids.length - 6) + " more children");
    L.push("  " + you + "-->" + km);
  }
  var gk = S.relationships.grandkids || [];
  if (gk.length) {
    var gkn = node("🌿 Grandkids (" + gk.length + "): " +
      gk.slice(0, 3).map(function (g) { return g.name; }).join(", "));
    L.push("  " + (lastKid || you) + "-->" + gkn);
  }
  return L.join("\n");
}

function renderDynastyChart() {
  var el = null;
  try { el = $("dynChart"); } catch (e) { return; }
  if (!el) return;
  var t = "";
  try { t = dynastyGraphText(); } catch (e) { t = ""; }
  if (!t) {
    el.innerHTML = '<p class="sub">Start a life to chart the dynasty.</p>';
    return;
  }
  renderMermaidInto(el, "dynasty\n" + t,
    '<p class="sub">📊 Family chart needs a connection — the list below has it all.</p>');
}

/* ---- (2) divergence chain (timeline modal overview) ---- */
function divergenceGraphText() {
  if (typeof wTimelineList !== "function" || !S || !S.world) return "";
  var list = [];
  try { list = wTimelineList(); } catch (e) { return ""; }
  if (!list.length) return "";
  function take(status, k) {
    return list.filter(function (e) { return e.status === status; }).slice(0, k);
  }
  var pick = take("altered", 4).concat(take("averted", 3)).concat(take("hypo", 2));
  if (!pick.length) pick = take("inevitable", 4).concat(take("sim", 2));
  if (!pick.length) return "";
  pick = pick.slice(0, 8);
  var L = ["graph TD"], prev = null, n = 0;
  pick.forEach(function (e) {
    var id = "D" + (n++);
    L.push('  ' + id + '["' + escMermaid(e.year + " " + e.icon + " " + e.text, 42) + '"]');
    if (prev) L.push("  " + prev + "-->" + id);
    prev = id;
  });
  return L.join("\n");
}

function renderDivergenceChart() {
  var el = null;
  try { el = $("tlChart"); } catch (e) { return; }
  if (!el) return;
  var t = "";
  try { t = divergenceGraphText(); } catch (e) { t = ""; }
  if (!t) {
    el.innerHTML = '<p class="sub">Live a few years to diverge history.</p>';
    return;
  }
  renderMermaidInto(el, "divergence\n" + t,
    '<p class="sub">📊 Divergence chart needs a connection.</p>');
}

function graphsStatus() {
  var st = { hasPlugin: mermaidOk() };
  try { st.dynastyNodes = (dynastyGraphText().match(/^  N\d+\[/gm) || []).length; }
  catch (e) { st.dynastyNodes = -1; }
  try { st.divergenceNodes = (divergenceGraphText().match(/^  D\d+\[/gm) || []).length; }
  catch (e) { st.divergenceNodes = -1; }
  return st;
}

window.renderDynastyChart = renderDynastyChart;
window.renderDivergenceChart = renderDivergenceChart;
window.divergenceGraphText = divergenceGraphText;
window.dynastyGraphText = dynastyGraphText;
window.graphsStatus = graphsStatus;

LL.files.push("graphs"); /* end-of-file registration: counts as loaded only after this file fully ran */