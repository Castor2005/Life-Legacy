/* LIFE & LEGACY — engine/houses.js (v0.1.04 Great Houses)
 * AI dynasties that live beside the player: five Great Houses with wealth,
 * heads, heirs (real genes), traits, feuds and wars, ticked every year.
 * The player climbs a Renown ladder against them, marries into them
 * (heirs carry founder genes, so alliance children inherit house blood via
 * the normal pregnancy pipeline), aids/sabotages/bids on them, and may post
 * their dynasty to the Hall of Houses (opt-in cross-player board on Firestore).
 * All state lives on S.houses (lazy/undefined-safe: old saves grow houses on
 * the first tick, no migration bump). Silent years tick quietly (no toasts).
 * Shared scope: classic script, globals (S, LL, GDATA). Load order = index.html
 * order (after dynasty.js). Registered in boot EXPECT_FILES.
 */
"use strict";
window.LL = (window.LL || { v: 1, files: [] });

var HOUSE_DEFS = [
  { name: "Varro", epithet: "the Iron Ledger", trait: "mercantile", icon: "⚖️" },
  { name: "Okafor", epithet: "the Brass Drum", trait: "martial", icon: "🥁" },
  { name: "Delacroix", epithet: "the Velvet Mask", trait: "scheming", icon: "🎭" },
  { name: "Kovacs", epithet: "the Ember Forge", trait: "martial", icon: "🔥" },
  { name: "Ashford", epithet: "the Pale Chapel", trait: "pious", icon: "🕯️" },
  { name: "Corvino", epithet: "the Black Ledger", trait: "scheming", icon: "🐦‍⬛" },
  { name: "Marsh", epithet: "the Reedy Throne", trait: "mercantile", icon: "🌾" },
  { name: "Grimshaw", epithet: "the Grey Watch", trait: "martial", icon: "🛡️" },
  { name: "Ellery", epithet: "the Star Chart", trait: "pious", icon: "🔭" },
  { name: "Ferro", epithet: "the Red Contract", trait: "mercantile", icon: "📜" }
];
var HOUSE_TRAITS = {
  martial: { pow: 1.2, gold: 0.9, desc: "raises sellswords, settles debts with steel" },
  mercantile: { pow: 0.9, gold: 1.3, desc: "owns the docks, the mills, and half the council" },
  scheming: { pow: 1.0, gold: 1.0, desc: "collects secrets the way others collect rent" },
  pious: { pow: 0.8, gold: 0.9, desc: "endows chapels; the faithful remember" }
};
var HOUSE_TITLES = ["Unproven", "Noted", "Respected", "Renowned", "Illustrious", "Legendary", "Mythic"];

/* ---- state ---- */
function housesEnsure() {
  if (!S) return null;
  if (!S.houses || !(S.houses.list instanceof Array)) {
    S.houses = { v: 1, list: [], chron: [], married: null, posted: false, foundedYear: S.year || 0 };
    try { housesFound(); } catch (e) {}
  }
  if (!(S.houses.chron instanceof Array)) S.houses.chron = [];
  return S.houses;
}
function houseById(id) {
  try {
    var h = housesEnsure(); if (!h) return null;
    for (var i = 0; i < h.list.length; i++) if (h.list[i].id === id) return h.list[i];
  } catch (e) {}
  return null;
}
function greatHouseName(id) { var h = houseById(id); return h ? ("House " + h.name) : "a fallen house"; }

function housesFound() {
  var H = S.houses, defs = HOUSE_DEFS.slice();
  for (var i = defs.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = defs[i]; defs[i] = defs[j]; defs[j] = t; }
  var n = 5;
  for (var k = 0; k < n; k++) {
    var d = defs[k % defs.length];
    var headAge = 42 + Math.floor(rnd() * 26);
    var head = { name: houseHeadName(), age: headAge };
    var heirs = [];
    var nHeirs = rnd() < 0.25 ? 0 : (1 + Math.floor(rnd() * 3));
    for (var q = 0; q < nHeirs; q++) heirs.push(houseMakeHeir(18 + Math.floor(rnd() * 22)));
    H.list.push({
      id: "h" + (S.year || 0) + "_" + k,
      name: d.name, epithet: d.epithet, trait: d.trait, icon: d.icon,
      wealth: Math.round(60000 + rnd() * 300000),
      power: 0, rel: 0, ally: false, atWar: null, feud: null,
      head: head, heirs: heirs, crisis: false, crisisYears: 0,
      deed: houseDeed(d.trait)
    });
  }
  /* one starting feud so the chronicle opens with teeth */
  try {
    if (H.list.length >= 2) {
      var a = Math.floor(rnd() * H.list.length), b = (a + 1 + Math.floor(rnd() * (H.list.length - 1))) % H.list.length;
      H.list[a].feud = H.list[b].id;
      houseChron("House " + H.list[a].name + " nurses a blood-feud against House " + H.list[b].name + " — over salt rights, or a wedding slight. Nobody agrees.");
    }
  } catch (e) {}
  houseRecalcAll();
  try { pushLog(S.age, "🏛️", "Five Great Houses hold the city's charters: " + H.list.map(function (h) { return h.name; }).join(", ") + ". Climb past them, marry them, or bury them.", "event"); } catch (e) {}
}
function houseHeadName() {
  var base = "Alex Morgan";
  try { base = rName(); } catch (e) { try { base = rName("male"); } catch (e2) {} }
  try { if (typeof npcUniqueName === "function") base = npcUniqueName(base); } catch (e) {}
  /* house folk live outside world.npcs, so de-dup against the houses too */
  try {
    var taken = {}, i, q;
    if (S && S.houses && S.houses.list) for (i = 0; i < S.houses.list.length; i++) {
      var hh = S.houses.list[i];
      if (hh.head) taken[hh.head.name] = true;
      for (q = 0; q < (hh.heirs || []).length; q++) taken[hh.heirs[q].name] = true;
    }
    if (S && S.relationships && S.relationships.partner && S.relationships.partner.name) taken[S.relationships.partner.name] = true;
    if (!taken[base]) return base;
    var suf = [" II", " III", " IV", " V"];
    for (i = 0; i < suf.length; i++) if (!taken[base + suf[i]]) return base + suf[i];
    for (var k = 2; k < 60; k++) if (!taken[base + " " + k]) return base + " " + k;
  } catch (e) {}
  return base;
}
function houseMakeHeir(age) {
  var sex = pick(["male", "female"]);
  var nm = houseHeadName(), genes = null, ap = null;
  try { if (typeof founderGenes === "function") genes = founderGenes(sex); } catch (e) {}
  return { name: nm, sex: sex, age: age, married: false, genes: genes, appearance: ap };
}
function houseDeed(trait) {
  var pool = {
    martial: ["broke the river blockade of '49", "holds the north gate by charter", "fields two hundred spears"],
    mercantile: ["owns the harbor scales", "minted the trade-guild seal", "bought the old fairgrounds"],
    scheming: ["knows where the bodies are filed", "owns three judges' debts", "writes the council minutes"],
    pious: ["raised the pale chapel", "feeds a thousand every winter", "keeps the saint's finger"]
  };
  return pick(pool[trait] || pool.scheming);
}

/* ---- power + rank ---- */
function housePower(h) {
  if (!h) return 0;
  var t = HOUSE_TRAITS[h.trait] || HOUSE_TRAITS.scheming;
  var pw = (h.wealth / 22000) * t.pow + h.heirs.length * 5 + (h.ally ? 2 : 0) - (h.atWar ? 4 : 0) - (h.crisis ? 6 : 0);
  return Math.max(1, Math.round(pw));
}
function houseRecalcAll() {
  try {
    var H = housesEnsure(); if (!H) return;
    for (var i = 0; i < H.list.length; i++) H.list[i].power = housePower(H.list[i]);
  } catch (e) {}
}
function playerHousePower() {
  try {
    var nw = 0; try { nw = netWorth(); } catch (e) {}
    return Math.max(1, Math.round(nw / 22000 + S.prestige / 12 + S.fame / 12 + S.renown * 20 + ((S.relationships && S.relationships.children) || []).length * 3));
  } catch (e) { return 1; }
}
function houseRank() {
  /* 1 = top of the city. Counts houses stronger than the player. */
  try {
    var H = housesEnsure(); if (!H) return 1;
    var pp = playerHousePower(), r = 1;
    for (var i = 0; i < H.list.length; i++) if (H.list[i].power > pp) r++;
    return r;
  } catch (e) { return 1; }
}
function houseTitle() {
  try { return HOUSE_TITLES[Math.min(HOUSE_TITLES.length - 1, S.renown || 0)]; } catch (e) { return "Unproven"; }
}
function houseChron(t) {
  try {
    var H = housesEnsure(); if (!H) return;
    H.chron.push({ y: S.year, t: t });
    if (H.chron.length > 40) H.chron = H.chron.slice(-40);
  } catch (e) {}
}

/* ---- yearly tick (called from runDynastyDepth; silent years stay quiet) ---- */
function yearlyHouseTick(silent) {
  var H = housesEnsure(); if (!H || !S.alive) return;
  var i, h;
  for (i = 0; i < H.list.length; i++) {
    h = H.list[i];
    /* age the household */
    h.head.age++;
    for (var q = h.heirs.length - 1; q >= 0; q--) {
      h.heirs[q].age++;
      if (h.heirs[q].age > 75 && rnd() < 0.2) h.heirs.splice(q, 1);
    }
    /* economy drifts by trait, leaned by the world regime */
    var t = HOUSE_TRAITS[h.trait] || HOUSE_TRAITS.scheming;
    var drift = 1 + (rnd() * 0.14 - 0.05) * t.gold;
    try { if (S.world && S.world.regime === "boom") drift += 0.02; else if (S.world && S.world.regime === "crisis") drift -= 0.03; } catch (e) {}
    if (h.atWar) drift -= 0.05 + rnd() * 0.05;
    if (h.crisis) drift -= 0.04;
    h.wealth = Math.max(5000, Math.round(h.wealth * drift + (t.gold - 1) * 4000));
    /* new heirs are born to the houses too */
    if (!h.crisis && h.heirs.length < 3 && rnd() < 0.12) {
      var nh = houseMakeHeir(0);
      h.heirs.push(nh);
      if (!silent && rnd() < 0.5) houseChron("Bells in House " + h.name + " — an heir, " + nh.name + ", is born.");
    }
    /* head dies: first adult heir succeeds; none → succession crisis */
    if (h.head.age > 70 && rnd() < 0.14 + (h.head.age - 70) * 0.02) {
      var succ = null;
      for (var s = 0; s < h.heirs.length; s++) if (h.heirs[s].age >= 16 && !h.heirs[s].married) { succ = h.heirs[s]; break; }
      if (succ) {
        h.heirs.splice(h.heirs.indexOf(succ), 1);
        var oldHd = h.head.name;
        h.head = { name: succ.name, age: succ.age };
        houseChron("Old " + oldHd + " of House " + h.name + " dies; " + succ.name + " takes the signet.");
        if (h.ally && !silent) try { pushLog(S.age, "🏛️", "Your ally's old head " + oldHd + " has died — " + succ.name + " now leads House " + h.name + ".", "event"); } catch (e) {}
      } else if (!h.crisis) {
        h.crisis = true; h.crisisYears = 0; h.ally = false;
        houseChron("House " + h.name + " has NO heir — the estate fractures. Bid for it in 🏛️ Great Houses before the vultures do.");
        if (!silent) try { pushLog(S.age, "🏛️", "House " + h.name + " dies heirless! Its estate is up for grabs — bid in 👑 Rule → 🏛️ Great Houses.", "event"); } catch (e2) {}
      }
    }
    if (h.crisis) {
      h.crisisYears++;
      /* a dead house rots until someone buys it or a cadet branch crawls back */
      if (h.crisisYears >= 4) {
        houseChron("A cadet branch of House " + h.name + " scrapes the estate back together — diminished, hungry.");
        h.crisis = false; h.crisisYears = 0; h.wealth = Math.max(20000, Math.round(h.wealth * 0.4));
        h.head = { name: houseHeadName(), age: 30 + Math.floor(rnd() * 15) };
      }
    }
    /* feuds spark, wars burn out, relations drift home */
    if (!h.feud && !h.atWar && rnd() < 0.06 && H.list.length > 1) {
      var foes = H.list.filter(function (x) { return x.id !== h.id && !x.crisis; });
      if (foes.length) {
        var f = pick(foes);
        h.feud = f.id;
        houseChron("House " + h.name + " declares a feud against House " + f.name + " — " + pick(["a stolen bride-price", "a forged charter", "a duel at dawn", "harbor dues"]));
      }
    }
    if (h.feud && rnd() < 0.18) {
      var fh = houseById(h.feud);
      if (!fh || fh.crisis || rnd() < 0.35) {
        if (fh && !fh.crisis && rnd() < 0.5) {
          h.atWar = fh.id; fh.atWar = h.id;
          houseChron("OPEN WAR: House " + h.name + " marches on House " + fh.name + ". The city holds its breath.");
          if ((h.ally || (fh && fh.ally)) && !silent) try { pushLog(S.age, "⚔️", "War between the houses touches yours — your ally bleeds gold. Aid them in 🏛️ Great Houses.", "event"); } catch (e) {}
        } else {
          houseChron("The feud between House " + h.name + " and " + greatHouseName(h.feud) + " cools into cold courtesy.");
        }
        h.feud = null;
      }
    }
    if (h.atWar && rnd() < 0.3) {
      var en = houseById(h.atWar);
      var loser = rnd() < 0.5 ? h : en;
      var winner = loser === h ? en : h;
      if (loser) { loser.wealth = Math.max(8000, Math.round(loser.wealth * 0.7)); loser.atWar = null; }
      if (winner) { winner.wealth = Math.round(winner.wealth * 1.1); winner.atWar = null; }
      if (loser && winner) houseChron("House " + winner.name + " breaks House " + loser.name + " — tribute paid, banners lowered.");
      if ((h.ally || (en && en.ally)) && !silent) try { pushLog(S.age, "⚔️", "The houses' war ends. Tribute changes hands.", "event"); } catch (e) {}
    }
    if (h.rel !== 0 && rnd() < 0.4) h.rel += (h.rel > 0 ? -2 : 2);
    if (h.ally && h.rel < 20) { h.ally = false; houseChron("House " + h.name + " lets your alliance lapse — neglected friendships rot."); }
  }
  houseRecalcAll();
}

/* ---- player verbs (doAct cases call these) ---- */
function houseSel() {
  try { return houseById(window.__houseSel) || (housesEnsure() || {}).list[0] || null; } catch (e) { return null; }
}
function openHouses() {
  try {
    housesEnsure();
    if (!window.__houseSel) {
      var H0 = S.houses.list;
      if (H0.length) window.__houseSel = H0[0].id;
    }
    renderHouses();
    openModal("housesModal");
  } catch (e) { try { toast("The houses are not receiving visitors right now."); } catch (e2) {} }
}
function renderHouses() {
  try {
    var H = housesEnsure(); if (!H) return;
    var pp = playerHousePower(), rank = houseRank();
    var rows = H.list.map(function (h) {
      return { name: "House " + h.name, power: h.power, you: false, h: h };
    });
    rows.push({ name: "House " + S.lastName + " (you)", power: pp, you: true, h: null });
    rows.sort(function (a, b) { return b.power - a.power; });
    var lad = '<div class="slot" style="grid-column:1/-1"><div class="grow"><b>👑 ' + esc(houseTitle()) + ' ' + esc(S.lastName) + ' — rank #' + rank + ' of ' + rows.length + '</b><small>' +
      rows.map(function (r, i) { return (i + 1) + ". " + esc(r.name) + " · ⚖" + r.power + (r.you ? " ← you" : ""); }).join("<br>") +
      '</small></div></div>';
    var sel = houseSel();
    var det = "";
    if (sel) {
      var st = sel.crisis ? "💀 SUCCESSION CRISIS — estate for sale!" : ((sel.ally ? "🤝 sworn ally" : (sel.atWar ? "⚔️ at war with " + esc(greatHouseName(sel.atWar)) : (sel.feud ? "🔥 feuding " + esc(greatHouseName(sel.feud)) : "😐 cold peace"))));
      var heirs = sel.heirs.length ? sel.heirs.map(function (x) { return esc(x.name) + " (" + x.age + (x.sex === "female" ? "♀" : "♂") + (x.married ? ", wed" : "") + ")"; }).join("; ") : "none living";
      det = '<div class="slot" style="grid-column:1/-1"><div class="grow"><b>' + sel.icon + ' House ' + esc(sel.name) + ' <small>' + esc(sel.epithet) + '</small></b><small>' +
        esc(sel.head.name) + " (head, " + sel.head.age + ") · " + esc((HOUSE_TRAITS[sel.trait] || {}).desc || "") + " · " + esc(sel.deed) + "<br>" +
        "💰 " + fmt$(sel.wealth) + " · ⚖" + sel.power + " · rel " + sel.rel + " · " + st + "<br>🍼 Heirs: " + esc(heirs) +
        (S.houses.married && S.houses.married.houseId === sel.id ? "<br>💍 Bound by marriage (" + esc(S.houses.married.heirName) + ")" : "") +
        '</small></div></div>';
    }
    var deals = '<div class="slot" style="grid-column:1/-1"><div class="grow"><b>⚖️ Dealings</b><small>Choose a house above, then act.</small></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="mini" data-hact="ally">🤝 Ally ($5k)</button>' +
      '<button class="mini" data-hact="aid">🎁 Aid ($2k)</button>' +
      '<button class="mini" data-hact="sabotage">🗡️ Sabotage ($3k)</button>' +
      '<button class="mini" data-hact="bid">🏷️ Bid estate</button>' +
      '<button class="mini" data-hact="marry">💍 Marry heir ($8k)</button>' +
      '</div></div>';
    var ch = H.chron.slice(-8).reverse().map(function (c) { return '<div class="entry event"><span class="age">' + c.y + '</span>🏛️ ' + esc(c.t) + '</div>'; }).join("") || '<div class="sub">No chronicle yet.</div>';
    var hall = '<div class="slot" style="grid-column:1/-1"><div class="grow"><b>☁️ Hall of Houses</b><small id="houseHallBoard">Your best dynasty, ranked against other players. Needs Google sign-in.</small></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="mini" data-hact="post">📯 Post my dynasty</button>' +
      '<button class="mini" data-hact="board">🏆 View board</button></div></div>';
    var L = $("houseLadder"); if (L) L.innerHTML = lad;
    var C = $("houseChron"); if (C) C.innerHTML = '<b>📜 Chronicle</b>' + ch;
    var D = $("houseDeals"); if (D) {
      D.innerHTML = det + deals + hall;
      var btns = D.querySelectorAll("[data-hact]");
      for (var i = 0; i < btns.length; i++) (function (b) {
        b.onclick = function () { doAct("house-" + b.getAttribute("data-hact")); };
      })(btns[i]);
    }
    var S_ = $("housePick");
    if (S_) {
      S_.innerHTML = H.list.map(function (h) {
        return '<button class="mini' + (sel && sel.id === h.id ? " gold" : "") + '" data-hsel="' + h.id + '">' + h.icon + " " + esc(h.name) + "</button>";
      }).join(" ");
      var sb = S_.querySelectorAll("[data-hsel]");
      for (var m = 0; m < sb.length; m++) (function (b) {
        b.onclick = function () { window.__houseSel = b.getAttribute("data-hsel"); renderHouses(); };
      })(sb[m]);
    }
  } catch (e) {}
}

function houseScore() {
  try {
    var nw = 0; try { nw = netWorth(); } catch (e) {}
    return Math.round(S.renown * 1000 + S.prestige + S.fame * 10 + nw / 1000);
  } catch (e) { return 0; }
}

function houseAlly() {
  var h = houseSel(); if (!h) { toast("No house selected."); return; }
  if (S.age < 18) { toast("🔒 Adults only (18+)!"); return; }
  if (h.crisis) { toast("That house is in ruins — bid for its estate instead!"); return; }
  if (h.ally) { toast("Already sworn to House " + h.name + "."); return; }
  if (S.money < 5000) { toast("💸 A betrothal gift costs $5,000!"); return; }
  if (S.prestige < 40 && S.fame < 20) { toast("🔒 They won't treat with nobodies — 40+ prestige or 20+ fame first!"); return; }
  S.money -= 5000;
  var H = housesEnsure();
  for (var i = 0; i < H.list.length; i++) if (H.list[i].ally && H.list[i].id !== h.id) {
    H.list[i].ally = false; H.list[i].rel = Math.max(-60, H.list[i].rel - 30);
    houseChron("You break faith with House " + H.list[i].name + " to treat with " + h.name + ".");
  }
  h.ally = true; h.rel = 60;
  S.prestige += 15;
  houseChron("House " + S.lastName + " swears friendship with House " + h.name + " — oaths, salt, and a $5,000 gift.");
  pushLog(S.age, "🤝", "Alliance sworn with House " + h.name + "! +15 prestige. Old allies take it badly.", "event");
  renderHouses(); autosave(); render();
}
function houseAid() {
  var h = houseSel(); if (!h) { toast("No house selected."); return; }
  if (!h.ally) { toast("Aid is for sworn allies — ally first!"); return; }
  if (S.perYear.houseAid) { toast("⏳ Already aided this year — age up!"); return; }
  if (S.money < 2000) { toast("💸 Aid costs $2,000!"); return; }
  S.money -= 2000; S.perYear.houseAid = 1;
  h.wealth = Math.round(h.wealth * 1.12) + 5000;
  h.rel = Math.min(100, h.rel + 10);
  if (h.atWar) { h.atWar = null; houseChron("Your gold buys peace for House " + h.name + " — their war ends at your table."); }
  else houseChron("House " + S.lastName + " sends gold and grain to House " + h.name + ".");
  S.prestige += 8;
  pushLog(S.age, "🎁", "Aided House " + h.name + " (−$2,000, +8 prestige, friendship deepens).", "good");
  houseRecalcAll(); renderHouses(); autosave(); render();
}
function houseSabotage() {
  var h = houseSel(); if (!h) { toast("No house selected."); return; }
  if (S.age < 18) { toast("🔒 Adults only (18+)!"); return; }
  if (S.money < 3000) { toast("💸 Knives cost $3,000!"); return; }
  if (S.stats.smarts < 50 && !hasTrait("deceitful")) { toast("🔒 Deceitful or 50+ smarts only!"); return; }
  S.money -= 3000;
  var caught = rnd() < (hasTrait("deceitful") ? 0.25 : 0.45);
  if (caught) {
    h.rel = Math.max(-100, h.rel - 40); h.ally = false;
    S.prestige = Math.max(0, S.prestige - 30); S.record = Math.min(100, (S.record || 0) + 15);
    houseChron("House " + h.name + " catches YOUR agents in their ledgers! Feud in all but name.");
    pushLog(S.age, "🗡️", "Caught red-handed inside House " + h.name + "! −30 prestige, +15 record. They will not forget.", "bad");
  } else {
    h.wealth = Math.max(8000, Math.round(h.wealth * 0.82));
    h.rel = Math.max(-100, h.rel - 15);
    S.prestige += 5;
    houseChron("Quiet ruin visits House " + h.name + " — a burned warehouse, a poisoned charter. Nobody proves a thing.");
    pushLog(S.age, "🗡️", "House " + h.name + " bleeds quietly. No one proves a thing. (−18% their wealth)", "event");
  }
  houseRecalcAll(); renderHouses(); autosave(); render();
}
function houseBid() {
  var h = houseSel(); if (!h) { toast("No house selected."); return; }
  if (!h.crisis) { toast("Only a house in SUCCESSION CRISIS can be bought!"); return; }
  var price = Math.max(15000, Math.round(h.wealth * 0.6));
  if (S.money < price) { toast("💸 The estate costs " + fmt$(price) + "!"); return; }
  S.money -= price;
  S.prestige += 60; S.fame = clamp100(S.fame + 10);
  var H = housesEnsure();
  H.list.splice(H.list.indexOf(h), 1);
  houseChron("House " + S.lastName + " BUYS the ruined estate of House " + h.name + " for " + fmt$(price) + " — banners lowered, ledgers seized.");
  pushLog(S.age, "🏷️", "You absorb House " + h.name + "'s estate for " + fmt$(price) + "! +60 prestige, +10 fame. Their name becomes your footnote.", "good");
  /* the vacuum fills: a new minor house crawls up within a few years */
  if (H.list.length < 4) {
    var d = pick(HOUSE_DEFS.filter(function (x) { return !H.list.some(function (y) { return y.name === x.name; }); }));
    if (d) {
      var nh = { id: "h" + S.year + "_" + Math.floor(rnd() * 9999), name: d.name, epithet: d.epithet, trait: d.trait, icon: d.icon, wealth: 30000, power: 0, rel: 0, ally: false, atWar: null, feud: null, head: { name: houseHeadName(), age: 34 }, heirs: [houseMakeHeir(8)], crisis: false, crisisYears: 0, deed: houseDeed(d.trait) };
      H.list.push(nh);
      houseChron("A hungry cadet house, " + d.name + ", takes a charter — the city abhors a vacuum.");
    }
  }
  houseRecalcAll(); renderHouses(); autosave(); render();
}
function houseMarry() {
  var h = houseSel(); if (!h) { toast("No house selected."); return; }
  if (S.age < 18) { toast("🔒 Adults only (18+)!"); return; }
  var R = S.relationships;
  if (R.partner && R.partner.married) { toast("Already married! Divorce first if you mean it."); return; }
  var heir = null;
  for (var i = 0; i < h.heirs.length; i++) if (!h.heirs[i].married && h.heirs[i].age >= 18) { heir = h.heirs[i]; break; }
  if (!heir) { toast("House " + h.name + " has no unwed adult heir to offer!"); return; }
  if (S.money < 8000) { toast("💸 The dowry is $8,000!"); return; }
  if (S.prestige < 60 && S.fame < 30) { toast("🔒 Great Houses marry their own — 60+ prestige or 30+ fame first!"); return; }
  S.money -= 8000;
  heir.married = true;
  var ap = null;
  try {
    if (!heir.appearance && heir.genes && typeof genAppearance === "function") {
      heir.appearance = applyGenePhenotype(genAppearance(heir.sex, "Mixed"), heir.genes, heir.sex, 25);
      try { sanitizeKidAp(heir.appearance); } catch (e) {}
    }
    ap = heir.appearance || null;
  } catch (e) {}
  R.partner = { name: heir.name, rel: 80, married: true, age: heir.age, sex: heir.sex, genes: heir.genes, appearance: ap, houseId: h.id };
  try { if (typeof wAddNPC === "function") wAddNPC({ name: heir.name, age: heir.age, role: "partner", rel: 80, sex: heir.sex, genes: heir.genes, appearance: ap }); } catch (e) {}
  var H = housesEnsure();
  H.married = { houseId: h.id, heirName: heir.name, genes: heir.genes, year: S.year };
  h.ally = true; h.rel = 80;
  S.prestige += 40;
  houseChron("BELLS: " + S.firstName + " " + S.lastName + " weds " + heir.name + " of House " + h.name + " — two bloodlines, one ledger.");
  pushLog(S.age, "💍", "Married " + heir.name + " of House " + h.name + "! Alliance sealed in blood and gold. +40 prestige. Your children will carry " + h.name + " blood.", "good");
  houseRecalcAll(); renderHouses(); autosave(); render();
}

/* ---- Hall of Houses (opt-in cross-player board; needs Google sign-in) ---- */
function houseHallEntry() {
  var nw = 0; try { nw = netWorth(); } catch (e) {}
  return {
    house: S.lastName, name: S.firstName + " " + S.lastName,
    score: houseScore(), renown: S.renown || 0, prestige: S.prestige || 0,
    fame: S.fame || 0, wealth: nw, age: S.age || 0, alive: !!S.alive
  };
}
async function housePost() {
  try {
    if (!window.LLFirebase || typeof window.LLFirebase.hallPost !== "function") {
      toast("☁️ Google sign-in with a hosted Firebase build is needed to post. (Local builds stay local.)");
      return;
    }
    var b = null;
    var u = null;
    try { u = window.LLFirebase.getUser(); } catch (e) {}
    if (!u) { toast("Sign in with Google first!"); return; }
    await window.LLFirebase.hallPost(houseHallEntry());
    try { S.houses.posted = true; } catch (e) {}
    toast("📯 Your dynasty stands in the Hall of Houses!");
    houseBoard(true);
  } catch (e) { try { toast("⚠️ Hall post failed — local game unaffected."); } catch (e2) {} }
}
async function houseBoard(silent) {
  try {
    var box = $("houseHallBoard");
    if (!window.LLFirebase || typeof window.LLFirebase.hallBoard !== "function") {
      if (box) box.textContent = "Your best dynasty, ranked against other players. Needs Google sign-in on a hosted build.";
      if (!silent) toast("☁️ The Hall needs Google sign-in.");
      return;
    }
    if (box) box.textContent = "⏳ Consulting the heralds…";
    var rows = await window.LLFirebase.hallBoard();
    if (box) {
      if (!rows || !rows.length) box.textContent = "The Hall is empty — post yours first!";
      else box.innerHTML = "🏆 " + rows.slice(0, 10).map(function (r, i) {
        return (i + 1) + ". House " + esc(r.house || "?") + " · " + (r.score || 0) + " (" + esc(r.name || "") + ")";
      }).join("<br>");
    }
  } catch (e) { try { if ($("houseHallBoard")) $("houseHallBoard").textContent = "The heralds are silent (board unreachable)."; } catch (e2) {} }
}

LL.files.push("houses"); /* end-of-file registration: counts as loaded only after this file fully ran */
