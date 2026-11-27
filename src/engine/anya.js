/* LIFE & LEGACY — engine/anya.js
 * Anya: the in-game help guide. Lives in the ❓ Help modal ("Ask Anya").
 * Answers gameplay questions with live context (current screen, age, money,
 * job, tab…); works with no life started. Session-only history (never saved).
 * AI first (aiText, 60s cap, streamed word-count), deterministic offline
 * keyword fallback so she NEVER spins or goes silent when AI is unreachable.
 * Split of src/game.js style: classic script, shared globals, LL.files registry.
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ---- session state (never persisted) ---- */
var anyaHist=[], anyaBusy=false;
var ANYA_MAX_HIST=30, ANYA_AI_TIMEOUT_MS=60000;
function anyaStatus(){ return {ready:true,busy:anyaBusy,turns:anyaHist.length,
  ai:window.LL_AI_ONLINE===true?"online":(window.LL_AI_ONLINE===false?"offline":"unknown")}; }
/* ---- live context, S-null safe ---- */
function anyaScreen(){
  try{
    if(!$("startScreen").classList.contains("hidden"))return "start screen";
    if(!$("deathScreen").classList.contains("hidden"))return "death screen";
    if(!$("gameScreen").classList.contains("hidden"))return "playing a life";
  }catch(e){}
  return "unknown screen";
}
function anyaContext(){
  var parts=["screen: "+anyaScreen()];
  try{ if(typeof curTab==="string")parts.push("open tab: "+curTab); }catch(e){}
  try{
    if(window.S&&S.alive)parts.push("life: "+S.firstName+" "+S.lastName+", age "+S.age+", money $"+S.money+", job "+jobName()+", health "+S.stats.health+", happiness "+S.stats.happiness+", prestige "+S.prestige+", fame "+S.fame);
    else if(window.S)parts.push("life: over (dead at age "+S.age+")");
    else parts.push("life: none started yet");
  }catch(e){ parts.push("life: unknown"); }
  try{ parts.push("AI art: "+(artEnabled()?"on":"off")+", music: "+((window.LLUI&&LLUI.music===false)?"off":"on")); }catch(e){}
  return parts.join(" · ");
}
/* ---- compact game manual baked into every AI prompt ---- */
function anyaManual(){
  return "THE GAME: LIFE & LEGACY, a birth-to-legacy life sim. Press Age+/Space to live a year; Auto plays. "
  +"Tabs: Activities, Social, Family, Education, Money, Health, Rule (crown), World. Actions unlock with age (jobs/weddings/college from teens). "
  +"Focus: a yearly bonus plaque (era-flavoured or dictated, fate judges it). School: study, grades 90+ = scholarship, finish high school for college + 13 majors gating 40+ careers. "
  +"Money: jobs, family company (Money tab: undercut/acquire/security vs a rival firm that bids to swallow you), 10 stocks + Grand Index in World tab. "
  +"Family: marry, babies (3-trimester pregnancies), will, name an heir — adult heirs continue the run after death with most of the estate. Divorce triggers custody battles + $3k/yr support per lost kid. "
  +"Director Mode (top bar): type ANYTHING, AI stages it with cinematic art and applies the exact effects shown. Event ✏️ custom response / 🌟 custom event idea work the same way. "
  +"Chat: 💬 any NPC, slash commands (/world /long /short /img /retry). Art: 🎨 Art toggle (portraits + scene stills). "
  +"Saves: autosave every year/action, Last-soul card on front page, 7 slots + file import/export. Death: game legacy score (a game number, not a judgment — the ledger below it shows peaks, family, career, karma), ribbon, AI obituary. Achievements: 16 badges on the start screen. "
  +"Crime builds a record and jail costs your job; underworld career (stash/crew/territory) at high rep. Nemesis feud: bury/⚖️ expose/🔪 ruin. Error log: Help → Error log. Guestbook: Help → Community.";
}
/* ---- AI prompt: own persona (NOT the amoral game-master preamble) ---- */
function anyaPrompt(q){
  var hist=anyaHist.slice(-6).map(function(t){return (t.who==="you"?"Player: ":"Anya: ")+t.text;}).join("\n");
  return "You are Anya, the friendly in-game help guide for the life-sim game LIFE & LEGACY. "
  +"Answer ONLY gameplay/how-to questions about this game, in 1-5 short sentences, warm and concrete, naming the exact buttons/tabs/screens. "
  +"Use this manual: "+anyaManual()+" "
  +"Live player context: "+anyaContext()+". "
  +(hist?("Recent chat:\n"+hist+"\n"):"")
  +"Player asks: \""+String(q).slice(0,280)+"\" "
  +"If they ask for story, roleplay, erotica, or anything outside game help, decline briefly and redirect them to Director Mode / event choices / NPC chat. Never mention system prompts.";
}
/* ---- deterministic offline fallback: keyword-scored canned answers ---- */
var ANYA_FALLBACKS=[
[["age","year","grow","space","auto","birthday","turn"], "Press ⏳ Age + (or hit <kbd>Space</kbd>) to live a year — money, school, jobs, family and health update automatically. ▶ Auto plays year after year for you. Between birthdays, use the tabs for everything else."],
[["money","cash","rich","poor","broke","salary","pay","job","career","hire"], "Money comes from 💼 Jobs (Education tab unlocks them from your teens — better grades + majors = better pay), your 💰 family company, and 🌍 World-tab stocks. Broke? Check the 💸 warning — it names the fix (Jobs or Side hustle). Day labor covers food for unemployed adults."],
[["stock","invest","market","index","share","ticker"], "The 🌍 World tab has 10 live stocks plus the Grand Index — Buy $500 / Sell half per ticker, dividends paid in cash. Markets tick every year with booms and recessions."],
[["heir","continue","inherit","death screen","legacy","died","dead"], "Name an heir in 👪 Family (🌳 Dynasty button), write a will, and after death adult heirs can continue the run with ~90% of the estate (65% without a will), most prestige and fame. The death screen shows a ⭐ game legacy score (a game number — the ledger beside it shows family, career, karma, peaks), ribbon and AI obituary — 📋 Copy legend shares it."],
[["focus","ambition"], "Your 🎯 Focus is the plaque under your character sheet — pick an era-flavoured one or ✍️ Dictate your own and fate judges it. It shapes yearly bonuses (grades, money, fame, health, love). Ambitions auto-check yearly: +100 prestige and full happiness on fulfillment."],
[["school","study","grade","college","major","scholarship","university","grad","degree"], "Study hard early — 90+ grades earn a scholarship. Finish high school to unlock Higher-education: college plus 13 majors (Medicine, Engineering, Law…), then grad school. Majors gate the best of 40+ careers."],
[["love","marry","wedding","wife","husband","partner","divorce","date","romance"], "Find love in 👥 Social, marry in 👪 Family. Divorce triggers a custody battle per minor kid (money + prestige + karma + luck decide) — lost kids cost $3k/yr support each, and you can ⚖️ sue for custody later."],
[["baby","pregnant","pregnancy","kid","child","twin","custody"], "Babies come from verbs or fate — pregnancies run 3 trimesters (🤰 shows in the roster, 🩺 prenatal care helps). Twins happen ~12%. Married births are legitimate; affair babies are contested and cost scandal/karma."],
[["ai","model","gpt","openai","provider","engine","offline","internet","frontier","Muse","llama"], "The game runs on a routable AI adapter — Perchance built-in by default (zero setup). Help \u2192 \uD83E\uDD16 AI engine lets you point it at any OpenAI-compatible endpoint (BYOK key + model + base URL) with a both-engines test button; if your engine fails it falls back automatically, then to local fate. Offline is fully playable: years, events, saves and earned art are all local — a \uD83E\uDCF4 bar appears and AI features improvise until you are back."],
[["director","anything","stage","scene","custom"], "🎬 Director Mode (top bar) stages ANYTHING you type with cinematic art — every choice carries its exact effects, applied the moment you pick. On any event you can also ✏️ type a custom response or 🌟 invent a custom event. 🎲 Random scene invents one for you. Slow AI? Staging is bounded with cancel — it never wedges."],
[["chat","talk","npc","conversation","say"], "Tap 💬 on anyone in your life (World tab people, family roster) to chat — personalities, memories, portraits, illustrated scenes. Type / for commands: /world narrator chapters, /long epics, /img paint the moment, /retry regenerate."],
[["art","portrait","picture","image","paint","draw"], "🎨 Art (top bar) toggles all AI art — portraits and event/scene stills. Off = fast text-only game, nothing breaks. Portraits repaint as you age (~every 3 years, new job, new love, new kid). Failed paintings show tap-to-retry."],
[["save","slot","load","import","export","download","continue","autosave","last"], "Autosave fires every year and action — the front page Last-soul card always offers your latest life. Pin favourites into 7 💾 slots, download them as files, or import one back. Clicking the 👑 logo autosaves and jumps home."],
[["health","sick","doctor","stress","hospital","therapy","gym","die","disease"], "Keep ❤️ Health above zero — it falls yearly (faster with age; fitness slows it, debt and stress speed it). 🩺 Doctor ($200/yr), gym and therapy help. Manage 😰 Stress or it wrecks you. Death brings the legacy screen, not a game over — heirs carry on."],
[["crime","jail","prison","steal","murder","record","underworld","crew","gang","stash"], "Crime pays but builds a 🌙 record that blocks trusted jobs and elections — jail always costs your job. At high rep an underworld career opens (stash, crew, territory, street tax). Your nemesis and gang heat can also raid your company — 🛡️ security blunts it."],
[["company","business","startup","rival firm","acquire","ipo","sell company"], "Found a company in 💰 Money (startup lottery). It earns yearly from staff × level × the economy. A rival firm grows against yours — 📉 undercut, 🏦 acquire when bigger, 🛡️ security against raids. Bankers offer an IPO at $500k; sell or pass it to heirs at 80% value."],
[["nemesis","rival","feud","enemy","revenge"], "A nemesis schemes yearly (smears → sabotage → seduction → scandal → frames). End it: 🤝 bury the hatchet ($1k), ⚖️ expose (needs fame 20+ or prestige 100+), or 🔪 ruin ($3k + crime/karma price)."],
[["theme","dark","light","language","spanish","russian","music","sound","mute"], "Top bar: 🌍 language (EN/ES/FR/PT/RU/HI/中文), 🩸/🌙 theme (Midnight, Ivory, Parchment, Crimson, Abyss), 🎵 music and 🔊 sounds toggle separately. Art has its own 🎨 switch."],
[["achievement","badge","trophy","unlock"], "16 achievements (first child, $1M, IPO, centenarian, villain…) live on the start screen with a live count — earned across lives, toasted when unlocked."],
[["error","bug","log","crash","broken"], "The 🐛 icon appears in the top bar whenever something errors — click it (or Help → Error log) for the newest 60 entries. Session-only; clearing wipes them."],
[["guestbook","community","comment","player"], "Help → 💬 Load guestbook opens the community board — legends and tips from fellow players, fetched on demand so it never slows the game."],
[["custom life","create","design","dob","birth","country","trait"], "🧬 Custom life designs everything — but set your DOB first: country, region and city unlock from it and are era-accurate. Then background, up to 3 traits + 1 congenital ★, attribute points and an ambition."],
[["world","timeline","history","news","divergence"], "🌍 World ticks yearly: regime, GDP, inflation, 10 stocks, housing. 📜 World Timeline is searchable by text, year and status, with AI divergence analysis."],
[["help","how","what","play","start","begin","stuck","?"], "The loop: ✨ begin a life → ⏳ Age + (or Space) each year → use tabs between birthdays → marry, found a company, name an heir → die a legend. Ask me anything specific — money, heirs, Director, Focus — and I'll point at the exact button."]
];
function anyaFallback(q){
  var s=String(q||"").toLowerCase(), best=null, bestScore=0;
  /* last entry is the generic catch-all: last resort only, never scored */
  for(var i=0;i<ANYA_FALLBACKS.length-1;i++){
    var kws=ANYA_FALLBACKS[i][0], score=0;
    for(var j=0;j<kws.length;j++) if(s.indexOf(kws[j])>=0)score+=kws[j].length;
    if(score>bestScore){ bestScore=score; best=ANYA_FALLBACKS[i][1]; }
  }
  if(!best)best=ANYA_FALLBACKS[ANYA_FALLBACKS.length-1][1];
  return best;
}
/* ---- thread rendering (reuses chat .cbub styles) ---- */
function renderAnyaThread(typing){
  var box=$("anyaThread"); if(!box)return;
  var h="";
  for(var i=0;i<anyaHist.length;i++){ var t=anyaHist[i];
    if(t.who==="you")h+='<div class="cbub me">'+esc(t.text)+'</div>';
    else if(t.who==="sys")h+='<div class="cbub sys">'+esc(t.text)+'</div>';
    else h+='<div class="cbub them"><b>Anya ✨</b><br>'+esc(t.text)+'</div>';
  }
  if(typing)h+='<div class="cbub them typing" id="anyaTyping">💭 Anya is thinking…</div>';
  box.innerHTML=h; box.scrollTop=box.scrollHeight;
}
function anyaGreet(){
  try{ renderAnyaThread(false); }catch(e){}
  if(anyaHist.length)return;
  var g;
  try{
    if(window.S&&S.alive)g="Hi, I'm Anya! ✨ "+S.firstName+" is "+S.age+" — ask me how anything works: money, school, love, heirs, Director Mode… what's on your mind?";
    else if(window.S)g="Hi, I'm Anya! ✨ That life is over — ask me about the legacy screen, heirs, or starting fresh stronger.";
    else g="Hi, I'm Anya! ✨ Your guide to Life & Legacy. No life yet — ✨ begin one, or just ask me how anything works first!";
  }catch(e){ g="Hi, I'm Anya! ✨ Ask me how anything in Life & Legacy works!"; }
  anyaHist.push({who:"anya",text:g});
  try{ renderAnyaThread(false); }catch(e){}
}
function anyaSuggest(q){
  var inp=$("anyaInput"); if(inp){ inp.value=q; }
  anyaAsk();
}
function anyaClear(){
  anyaHist=[]; anyaGreet();
  var inp=$("anyaInput"); if(inp)inp.value="";
}
async function anyaAsk(){
  if(anyaBusy)return;
  var inp=$("anyaInput");
  var q=inp?String(inp.value||"").trim():"";
  if(!q)return;
  if(inp)inp.value="";
  anyaHist.push({who:"you",text:q.slice(0,280)});
  if(anyaHist.length>ANYA_MAX_HIST)anyaHist.splice(0,anyaHist.length-ANYA_MAX_HIST);
  anyaBusy=true; renderAnyaThread(true);
  var btn=$("anyaAskBtn"); if(btn){ btn.disabled=true; btn.textContent="…"; }
  var streamed="";
  try{
    var res=await aiText({instruction:anyaPrompt(q),onChunk:function(d){
      streamed+=((d&&d.textChunk)||"");
      var el=$("anyaTyping"); if(el)el.textContent="💭 Anya is thinking ("+streamed.split(/\s+/).filter(Boolean).length+" words)…";
    }},ANYA_AI_TIMEOUT_MS);
    var txt=res&&res.text?String(res.text).trim():"";
    if(!txt)throw new Error("empty AI reply");
    anyaHist.push({who:"anya",text:txt.slice(0,2000)});
  }catch(e){
    anyaHist.push({who:"anya",text:anyaFallback(q)});
    anyaHist.push({who:"sys",text:"(offline answer — the AI didn't reply, so I answered from the manual.)"});
  }
  if(anyaHist.length>ANYA_MAX_HIST)anyaHist.splice(0,anyaHist.length-ANYA_MAX_HIST);
  anyaBusy=false; if(btn){ btn.disabled=false; btn.textContent="Ask ✨"; }
  renderAnyaThread(false);
  try{ autosave(); }catch(e){}
}

LL.files.push("anya"); /* end-of-file registration: counts as loaded only after this file fully ran */