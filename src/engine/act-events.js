/* LIFE & LEGACY — engine/act-events.js
 * SECTION 12 — Action-Event Engine: every verb press produces a VISIBLE outcome.
 * Split (new module, no behavior moved): doAct/doDecision wrappers in actions.js
 * call actNarrate(id) whenever a verb actually did something (log grew).
 * - Bank: 15 hand-written outcomes per tab (105 verb outcomes + 15 world beats).
 *   Verb-mapped entries first, then per-tab rotation (anti-repeat via counter).
 * - Cards: every action pins an outcome card atop the panel until the next act.
 * - Choice modals: entries with choices open via showEvent (synthetic event),
 *   more likely for MAJOR verbs — the press becomes a scene, not a log line.
 * - Online AI: when the text leg is alive, actNarrate fires aiActUpgrade — the
 *   instant bank card is replaced by a bespoke narration when it lands (gen-
 *   guarded: a stale answer never touches a newer life). Cards only, never an
 *   open modal — mid-read rewrites are rude.
 * - NPC faces: npcFaceHTML() renders the circular glow-ring portrait (photo if
 *   painted, initials if not). paintNpc() paints via requestImage, cached in
 *   S.npcArt (cap 8, LRU). Partner auto-paints once on romantic verbs.
 * No save-shape change that matters: S.npcArt is lazy/undefined-safe, SAVE stays.
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* verbs whose press should usually become a scene */
var ACT_MAJORS={propose:1,wedding:1,grandwed:1,divorce:1,breakup:1,baby:1,adopt:1,surgery:1,casino:1,bank:1,burglary:1,embezzle:1,blackmail:1,escape:1,audition:1,publish:1,holdcourt:1,sponsor:1,parade:1,hitrival:1,takeover:1,snubbid:1,acquire:1,undercut:1,cosec:1,office:1,startup:1,gala:1,tournament:1,feast:1,hunt:1};
function actVerbTab(id){
  try{ for(var t in TABS){ var L=TABS[t]; for(var i=0;i<L.length;i++) if(L[i][0]===id) return t; } }catch(e){}
  if(id&&id.indexOf("dec-")===0)return "crown";
  if(id&&id.indexOf("major-")===0)return "education";
  if(id&&id.indexOf("focus-")===0)return "education";
  return "activities";
}
function actVerbLabel(id){
  try{ for(var t in TABS){ var L=TABS[t]; for(var i=0;i<L.length;i++) if(L[i][0]===id) return String(L[i][1]).replace(/^[^\s]+\s/,""); } }catch(e){}
  return id;
}
/* ---- outcome banks: 15 per tab. {v:[verbIds], t:title, x:text, c?:choices}
 * {npc} fills with a related name, {city} with the city. Choices use mini-fx:
 * ["stat",key,delta] ["money",n] ["prestige",n] ["fame",n] ["karma",n]
 * ["stress",n] ["rel",n] (partner) — applied by actDoOps, out text is the fx fn. */
var ACT_BANKS={
activities:[
 {v:["study","deepstudy"],t:"Cram session",x:"Formulas on the mirror, flashcards on the ceiling. Your brain aches in the good way."},
 {v:["study"],t:"Pop quiz survived",x:"The teacher sprang a quiz and you were ready. Someone whispers: how do you DO that?",c:[{l:"Share your notes",h:"karma+",fx:[["karma",3]],out:"You share the notes. Three classmates owe you one."},{l:"Keep the edge",h:"smarts+",fx:[["stat","smarts",2]],out:"You keep the edge. Curves fear you."}]},
 {v:["read","library"],t:"One more chapter",x:"The book grabs you by the collar and refuses to let go until 2 AM."},
 {v:["read","library","onlinecourse"],t:"Marginalia",x:"You argue with the author in the margins — and win. Ideas stick better when you fight them.",c:[{l:"Lend it to {npc}",h:"bond",fx:[["rel",0]],out:"{npc} borrows it and returns it with thoughts. Good talk."},{l:"Keep annotating",h:"smarts+",fx:[["stat","smarts",1]],out:"Your copy is now a second book."}]},
 {v:["gym","trainpro","jog"],t:"Beast mode",x:"Last rep. Everything burns. Everything counts."},
 {v:["gym","jog","hike"],t:"Runner's clarity",x:"Halfway through, the worries fall off like sweat. A problem you have been avoiding suddenly looks solvable.",c:[{l:"Chase the thought",h:"smarts+",fx:[["stat","smarts",2]],out:"You catch it. A small plan forms."},{l:"Just run",h:"joy",fx:[["stat","happiness",3]],out:"No thoughts, only stride. Bliss."}]},
 {v:["party","movies","games","playground","toys"],t:"Good chaos",x:"Laughter echoes longer than the night. Someone will retell this for years."},
 {v:["party","audition"],t:"Center of the room",x:"All eyes find you at least once. You pretend not to notice. You notice."},
 {v:["meditate","sleep","nap","stargaze"],t:"Quiet engine",x:"Breath in, noise out. The nervous system files everything where it belongs."},
 {v:["volunteer","blood"],t:"Warm hands",x:"A stranger squeezes your hand and means it. You walk home lighter.",c:[{l:"Make it a habit",h:"karma+",fx:[["karma",4]],out:"It becomes a habit. The town notices."},{l:"One good deed is enough",h:"joy",fx:[["stat","happiness",2]],out:"Enough. The glow lingers anyway."}]},
 {v:["hustle","lemonade","chores","freelance","tutor","gig"],t:"Honest cash",x:"Crisp bills, sore hands, straight spine. Earned money spends sweeter."},
 {v:["socialmedia"],t:"Chronically online",x:"You post, refresh, refresh. Somewhere a stranger screenshots you as inspiration. Weird. Nice.",c:[{l:"Touch grass",h:"-stress",fx:[["stress",-6]],out:"Phone down. Sky still there."},{l:"Post again",h:"fame?",fx:[["fame",1]],out:"Engagement farming pays in dopamine."}]},
 {v:["salon","surgery"],t:"Mirror check",x:"You catch your reflection and do a double take. Who IS that? Oh. You. Looking like that."},
 {v:["vacation","roadtrip","retreat","hike","museum"],t:"Elsewhere",x:"New air rewires the brain. You return with stories and a slightly different face."},
 {v:["lottery","casino","surgery","audition"],t:"Dice in the air",x:"Fortune leans in close to look at you. For a second, anything is possible.",c:[{l:"Trust the luck",h:"bold",fx:[["stat","happiness",2]],out:"Luck respects the bold. Mostly."},{l:"Bank the lesson",h:"wise",fx:[["stat","smarts",1]],out:"Whatever happens: tuition paid, lesson kept."}]}
],
social:[
 {v:["makefriend"],t:"Inside jokes loading",x:"One shared laugh and suddenly there is a 'we'. {npc} gets your weirdness. Rare. Keep them."},
 {v:["hangout"],t:"Belly laughs",x:"You laugh so hard the table shakes. {npc} snorts. This is the good stuff, bottled."},
 {v:["compliment","apologize"],t:"Soft power",x:"A few sincere words land like medicine. {npc} stands a little taller all week."},
 {v:["giftfriend"],t:"Thoughtfulness compounds",x:"{npc} unwraps it slowly, then hugs you hard. Interest paid in full."},
 {v:["club","team"],t:"Your people",x:"Name tags, bad coffee, total belonging. You found the room where you make sense."},
 {v:["network","befriend-scheme"],t:"Room worked",x:"Three handshakes, two numbers, one door that was locked yesterday. Social capital: up."},
 {v:["finddate"],t:"Butterflies, vetted",x:"Three faces, three possible futures. Choosing is the fun part."},
 {v:["datenight","seduce"],t:"Sparks, scheduled",x:"Candlelight does half the work; you do the rest. Time dilates around the table.",c:[{l:"Say the real thing",h:"bond+",fx:[["rel",6]],out:"Vulnerability lands. Closer than before."},{l:"Keep it light",h:"fun",fx:[["stat","happiness",3]],out:"Flirting, dessert, no heavy talk. Perfect."}]},
 {v:["propose","wedding","grandwed"],t:"The big yes",x:"Knees, ring, held breath — then the word that rewrites every plan you had."},
 {v:["commit"],t:"All in",x:"No more hedging. Two people, one direction. The air tastes like commitment."},
 {v:["breakup","dumplover","divorce"],t:"Clean cut",x:"It hurts precisely as much as it should. By spring this will be a story about growth."},
 {v:["mendrival","exposerival","ruinrival"],t:"Feud moves",x:"The rivalry shifts like tectonic plates. Somewhere, your nemesis feels a disturbance."},
 {v:["mentor"],t:"Torch passed",x:"A young face lights up with your old dream. Legacy, but make it mentorship."},
 {v:["claim","train","break","harem","protection"],t:"Power dynamics",x:"The room rearranges itself around who wants what. You hold the strings — gently, for now."},
 {v:["compliment","hangout","giftfriend","makefriend","club"],t:"Social glow",x:"Word gets around: you are good company. Invitations multiply like rabbits."}
],
family:[
 {v:["visitparents","familydinner","supportparents","callgrandparents"],t:"Blood warmth",x:"Overcrowded table, overlapping stories, food that tastes like childhood. This is the vault happiness is stored in."},
 {v:["siblingbond","bond"],t:"Same blood, same jokes",x:"You and yours fall into the old rhythm instantly — the secret language only siblings speak."},
 {v:["wedding","grandwed"],t:"Two families, one chaos",x:"Someone's uncle dances. Someone's aunt cries. The photos will be legendary."},
 {v:["baby","adopt","prenatal"],t:"Small shoes",x:"A whole person, arriving soon, who will have your eyes and their own opinions. Terrifying. Wonderful."},
 {v:["divorce","breakup","custody"],t:"Paperwork of the heart",x:"Signatures, custody calendars, two homes. Love changes shape; it rarely vanishes."},
 {v:["will","nameheir"],t:"Stone tablets",x:"You write down who gets what and feel 200 years old and completely at peace."},
 {v:["babysit"],t:"Grandparent mode",x:"Tiny hands, sticky hugs, total surrender. You understand your own parents now."},
 {v:["pet"],t:"New pack member",x:"It chooses YOU, headbutts your hand, and just like that the family is bigger."},
 {v:["praise","tutorkid","bond"],t:"Proud parent moment",x:"They get it — the thing you taught. Their grin could power the grid."},
 {v:["scold"],t:"The hard talk",x:"Firm voice, soft heart. Discipline lands best wrapped in obvious love.",c:[{l:"Stand firm",h:"order",fx:[["stat","discipline",1]],out:"Boundaries hold. Respect grows."},{l:"Soften with a hug",h:"love",fx:[["rel",0]],out:"Lesson + hug. Both land."}]},
 {v:["groomheir"],t:"Crown lessons",x:"You teach what took you decades. They learn it in an afternoon. The bloodline upgrades."},
 {v:["visitparents","callgrandparents","familydinner"],t:"Roots check",x:"{npc} tells the old story again — the one you have heard a hundred times and suddenly hear for the first time."},
 {v:["babysit","visitparents","supportparents"],t:"Circle of care",x:"Once they carried you. Now the carrying goes both ways. This is what family is FOR."},
 {v:["bond","praise","scold","tutorkid","siblingbond"],t:"Kitchen table",x:"Homework, gossip, leftovers. Nothing happens — and everything does."},
 {v:["wedding","baby","adopt","will"],t:"Ledger of love",x:"Milestones stack up like photographs on a mantel. The house of your life gains another room."}
],
education:[
 {v:["tummytime","babble","toys","playground"],t:"Tiny genius",x:"Neurons firing like fireworks. Play IS the curriculum at this age."},
 {v:["study","read","library"],t:"Scholar hours",x:"Highlighters run dry. Concepts click into place like puzzle pieces finding home."},
 {v:["study","deepstudy"],t:"Exam season",x:"Past papers, weak coffee, strong will. Knowledge compounds like interest.",c:[{l:"Pull the all-nighter",h:"grades+",fx:[["stat","smarts",2]],out:"It works. Barely. Worth it."},{l:"Sleep like a genius",h:"health+",fx:[["stat","health",2]],out:"Rested brain beats fried brain."}]},
 {v:["sciencefair"],t:"Volcano supremacy",x:"Baking soda, vinegar, glory. The judges have never seen papier-mâché like this."},
 {v:["skipclass"],t:"Hooky",x:"Freedom tastes like arcade tokens and skipped homework. Your grades file a complaint."},
 {v:["tutor","onlinecourse"],t:"Skill stacking",x:"One more certificate for the wall. The wall is starting to look impressive."},
 {v:["publish"],t:"Peer reviewed",x:"Your name in print, in a journal, forever. Somewhere a stranger cites you."},
 {v:["findjob","workhard","askraise"],t:"Career chess",x:"You move a piece. The board — salary, status, sanity — rearranges.",c:[{l:"Push harder",h:"ambition",fx:[["stat","discipline",2]],out:"Extra hours, extra notice."},{l:"Protect your peace",h:"balance",fx:[["stress",-5]],out:"Boundaries are also a strategy."}]},
 {v:["quit","retire"],t:"Plot twist",x:"You close a door. Hallways of possibility open. Terrifying. Correct."},
 {v:["applycollege","gradschool"],t:"Ivory gates",x:"Essays, interviews, envelopes. Your future arrives by mail."},
 {v:["major-Business","major-STEM","major-Medicine","major-Nursing","major-Law","major-Engineering","major-Computer Science","major-Arts","major-Music","major-Education","major-Psychology","major-Architecture"],t:"Declared",x:"You pick a lane and floor it. Specialists get paid; generalists get stories. You chose paid."},
 {v:["read","library","onlinecourse","tutor"],t:"Quiet library",x:"Dust motes in sunbeams, pages whispering. Learning feels like a secret pleasure."},
 {v:["study","sciencefair","publish"],t:"Mind palace",x:"Memory palaces get new wings today. You will remember this week for decades."},
 {v:["workhard","askraise","tutor","onlinecourse"],t:"Compound interest",x:"Small efforts, stacked daily, become an unfair advantage. Keep stacking."},
 {v:["findjob","quit","retire","applycollege"],t:"Crossroads",x:"Every application is a lottery ticket you earned. Every goodbye is a door unlatched."}
],
money:[
 {v:["piggybank","savings","withdrawsavings"],t:"Future-you nods",x:"Coins in a jar, digits in an account — same virtue. The ant and the grasshopper, and you are the ant."},
 {v:["chores","askcash","rentroom"],t:"Cash flow",x:"Money moves. Yours, this time, in the right direction."},
 {v:["hustle","freelance","gig"],t:"Grind pays",x:"Clients, gigs, side cash. The empire funds itself one invoice at a time."},
 {v:["stocks","crypto","sellstocks","sellcrypto"],t:"Market weather",x:"Candles green, candles red. You watch numbers dance and keep your hands steady.",c:[{l:"Diamond hands",h:"hold",fx:[["stat","discipline",1]],out:"Hold. Breathe. Compound."},{l:"Take profit",h:"secure",fx:[["stat","happiness",2]],out:"Profit is profit. No shame in green."}]},
 {v:["buyhouse","sellhouse","buycar","sellcar"],t:"Keys exchanged",x:"Deeds, keys, mileage. Wealth you can touch (and park)."},
 {v:["negotiate","askraise"],t:"Shark mode",x:"You name a number without flinching. The silence that follows is worth money."},
 {v:["biztech","bizfood","biztrade","hire","expandbiz","sellco"],t:"Empire moves",x:"Payroll, product, pressure. Building something bigger than yourself, one hire at a time."},
 {v:["undercut","acquire","cosec","hitrival","takeover","snubbid"],t:"Boardroom warfare",x:"Rivals watch your moves and sweat. Business is war with better suits.",c:[{l:"Press the advantage",h:"ruthless",fx:[["stat","discipline",1]],out:"No mercy. Market share bleeds your way."},{l:"Offer fair terms",h:"honor",fx:[["karma",3]],out:"Fair dealing builds a different empire."}]},
 {v:["lottery"],t:"Five-dollar dream",x:"You hold the ticket like it is already a story. For an hour, you are rich in possibility."},
 {v:["savings","stocks","crypto","piggybank"],t:"Money asleep, working",x:"While you live, your money works a second shift. Beautiful arrangement."},
 {v:["freelance","hustle","chores"],t:"Paid in full",x:"Invoice sent, payment landed. There is no feeling like money you earned yourself."},
 {v:["negotiate","rentroom","sellco"],t:"Deal closed",x:"Handshake, signatures, done. Both sides walk away thinking they won. That is the art."},
 {v:["biztech","bizfood","biztrade"],t:"Founder energy",x:"Whiteboards, late nights,belief. Startups run on conviction until revenue arrives."},
 {v:["stocks","crypto"],t:"Ticker tape",x:"Green days feel like genius; red days feel like tuition. Both teach."},
 {v:["buyhouse","buycar","sellhouse","sellcar"],t:"Signed and sealed",x:"Paperwork mountain climbed. You own more of the world than yesterday."}
],
health:[
 {v:["doctor","dentist","vaccinate"],t:"Checkup clean",x:"Charts, questions, a clean bill. Prevention is the cheapest miracle on the market."},
 {v:["gym","jog","playoutside","team"],t:"Sweat equity",x:"Heart pounding, lungs burning, mood soaring. The body thanks you in endorphins."},
 {v:["diet","sleep","nap"],t:"Recovery mode",x:"Good fuel, deep rest. The machine repairs itself overnight like quiet magic."},
 {v:["meditate","therapy","fast","retreat"],t:"Inner weather",x:"You sit with the storm instead of running. It passes faster when watched.",c:[{l:"Go deeper",h:"calm",fx:[["stress",-6]],out:"Stillness all the way down."},{l:"Journal it out",h:"clarity",fx:[["stat","smarts",1]],out:"Feelings, filed and understood."}]},
 {v:["blood"],t:"Pint of kindness",x:"Your blood will save a stranger you will never meet. Cookies are just a bonus."},
 {v:["doctor","therapy"],t:"Professional help",x:"An expert, an hour, zero judgment. Maintenance for the most complex machine you own."},
 {v:["gym","jog","diet","sleep"],t:"Streak alive",x:"Day after day, the habit holds. Motivation started it; systems keep it."},
 {v:["dentist","doctor","vaccinate"],t:"An ounce of prevention",x:"Fifteen minutes now saves fifteen miseries later. Adulting, done right."},
 {v:["meditate","sleep","retreat","fast"],t:"Nervous system reset",x:"Shoulders drop two inches. Jaw unclenches. You forgot you could feel like this."},
 {v:["playoutside","hike","team","jog"],t:"Vitamin outside",x:"Sun on skin, wind in lungs. Nature is the original pharmacy."},
 {v:["sleep","nap","diet"],t:"Boring miracles",x:"Water, vegetables, bedtime. Unsexy. Unstoppable."},
 {v:["therapy","meditate","retreat"],t:"Unpacking",x:"You set down a weight you forgot you were carrying. Lighter already."},
 {v:["gym","therapy","doctor"],t:"Investment body",x:"Every rep, every session, every checkup: deposits into the only account that matters."},
 {v:["fast","retreat","meditate"],t:"Still point",x:"Hunger, silence, clarity. The ascetic shortcut to knowing yourself."},
 {v:["vaccinate","blood","doctor"],t:"Good citizen, good cells",x:"Tiny pinch today, armor for years. Your immune system salutes you."}
],
crown:[
 {v:["leverage","blackmail"],t:"Leverage",x:"You know what they did. They know you know. Wonderful things happen when everyone understands the arrangement."},
 {v:["dec-hunt"],t:"The chase",x:"Hooves, horns, horns blowing. The old ritual still quickens noble blood."},
 {v:["dec-feast","dec-gala"],t:"High table",x:"Candlelight, toasts, alliances sealed over dessert. Power tastes like roast and flattery."},
 {v:["dec-pilgrimage"],t:"Holy road",x:"Bells, dust, blisters. You return with less baggage — spiritual and otherwise."},
 {v:["dec-tournament","parade"],t:"Crowd roar",x:"Thousands chanting your name. Fame is a drug and today the dose is heroic."},
 {v:["dec-writebook"],t:"Immortal ink",x:"Your words, bound, shelved, read by strangers decades hence. Death loses a round."},
 {v:["dec-startup","ipo","biztech"],t:"Unicorn weather",x:"Valuations climb like ivy. Investors speak of you in reverent tones."},
 {v:["dec-office","holdcourt","sponsor"],t:"The weight",x:"Petitions, rulings, responsibility. Power is mostly paperwork with consequences."},
 {v:["houses"],t:"Great game",x:"Five old houses watch your rise — some with admiration, some with knives."},
 {v:["takeover","snubbid","acquire"],t:"Throne moves",x:"Buyouts, bids, defiance. The powerful learn your name this week.",c:[{l:"Show mercy",h:"honor",fx:[["karma",4]],out:"Mercy, from strength. They will remember."},{l:"Take it all",h:"power",fx:[["prestige",5]],out:"Everything. As expected."}]},
 {v:["undercut","hitrival","cosec"],t:"Shadow war",x:"Rivals bleed market share and sleep badly. Your move, as always, was legal-ish."},
 {v:["dec-feast","dec-gala","sponsor","parade"],t:"Seen everywhere",x:"Every gala, every parade, every front page. Visibility IS the strategy."},
 {v:["dec-hunt","dec-tournament","parade"],t:"Proving ground",x:"Skill on display, crowds convinced. Legends are just rumors that keep winning."},
 {v:["dec-writebook","dec-office","holdcourt"],t:"Name in stone",x:"Laws, rulings, books — you are writing yourself into the permanent record."},
 {v:["leverage","blackmail","dec-office"],t:"Strings attached",x:"Everyone important owes someone. Today, several someones owe you."}
],
world:[
 {t:"Market winds",x:"Somewhere, tickers blink green and red. Fortunes shift while you live your day."},
 {t:"Distant drums",x:"News from far away: elections, eruptions, a record broken. The world turns without asking."},
 {t:"Neighborhood watch",x:"Next door, a life as vivid as yours unfolds — arguments, laughter, a baby's first steps through thin walls."},
 {t:"Rumor mill",x:"Someone, somewhere, is telling a story about you. It grows 10% with every retelling."},
 {t:"Old rival moves",x:"Your nemesis is seen dining with YOUR old contact. Coincidence, surely. Surely."},
 {t:"Friend wins",x:"{npc} just got promoted — the group chat erupts. Joy is contagious at this dosage."},
 {t:"Weather of fate",x:"A strange sky tonight. Old people nod knowingly. Something is coming — good or bad, it is coming."},
 {t:"Cultural tide",x:"A new song, a new slang, a new scandal. The era marches on with or without you."},
 {t:"Quiet miracle",x:"Somewhere a stranger is saved by perfect timing. The universe winks. You feel oddly warm."},
 {t:"Underworld shuffle",x:"In the city's veins, money and favors change hands. Heat rises somewhere downtown."},
 {t:"House games",x:"The Great Houses maneuver — a marriage here, a bankruptcy there. You are a piece AND a player."},
 {t:"Science marches",x:"A cure inches closer in some lab. A rocket lands itself. Tomorrow keeps arriving."},
 {t:"Street poetry",x:"Overheard on the corner: a breakup, a proposal, a business plan. The city writes itself."},
 {t:"Fate stretches",x:"The universe shuffles its deck. Your card is still in there. It always was."},
 {t:"Small world",x:"A stranger wears your old school's colors. A song from childhood plays. Threads connect everything."}
]
};
/* ---- mini-fx applier for choice outcomes ---- */
function actDoOps(ops){
  try{
    for(var i=0;i<(ops||[]).length;i++){ var o=ops[i]; if(!o||!o.length)continue;
      if(o[0]==="stat"){ try{ gainStat(o[1],+o[2]||0); }catch(e){} }
      else if(o[0]==="money"){ S.money+=+o[1]||0; }
      else if(o[0]==="prestige"){ S.prestige=Math.max(0,S.prestige+(+o[1]||0)); }
      else if(o[0]==="fame"){ S.fame=clamp100(S.fame+(+o[1]||0)); }
      else if(o[0]==="karma"){ S.stats.karma=clamp100(S.stats.karma+(+o[1]||0)); }
      else if(o[0]==="stress"){ S.stress=clamp100(S.stress+(+o[1]||0)); }
      else if(o[0]==="rel"){ if(S.relationships&&S.relationships.partner)S.relationships.partner.rel=clamp100(S.relationships.partner.rel+(+o[1]||0)); }
    }
  }catch(e){}
}
function actFill(s){
  try{
    if(s.indexOf("{npc}")>=0){ var n="an old friend"; try{ n=actPickNpc(); }catch(e){} s=s.split("{npc}").join(n); }
    if(s.indexOf("{city}")>=0)s=s.split("{city}").join((S.city||S.country||"town"));
  }catch(e){}
  return s;
}
function actPickNpc(){
  try{
    var pool=[];
    if(S.relationships){
      var R=S.relationships;
      if(R.partner)pool.push(R.partner.name);
      (R.friends||[]).forEach(function(f){ pool.push(f.name||f); });
      (R.siblings||[]).forEach(function(s){ pool.push(s.name); });
      if(R.mom&&R.mom.name)pool.push(R.mom.name);
    }
    if(S.world&&S.world.npcs){ for(var i=0;i<S.world.npcs.length&&pool.length<12;i++){ var n=S.world.npcs[i]; if(n.alive&&(n.role==="friend"||n.role==="partner"||n.role==="rival"))pool.push(n.name); } }
    if(pool.length)return pool[Math.floor(Math.random()*pool.length)];
  }catch(e){}
  return "an old friend";
}
/* ---- the narrator: called by doAct/doDecision wrappers on real outcomes ---- */
function actNarrate(id){
  if(!S||!S.alive)return;
  var tab=actVerbTab(id), label=actVerbLabel(id);
  var bank=ACT_BANKS[tab]||ACT_BANKS.activities, cands=[];
  for(var i=0;i<bank.length;i++){ var e=bank[i]; if(e.v&&e.v.indexOf(id)>=0)cands.push(e); }
  var pool=cands.length?cands:bank, key="aev_"+tab, n=(S.perYear&&S.perYear[key])||0;
  var pick=pool[n%pool.length];
  try{ S.perYear[key]=n+1; }catch(e){}
  var out={icon:"✨",verb:id,tab:tab,title:actFill(pick.t),text:actFill(pick.x),ai:false,at:Date.now()};
  window.__lastOutcome=out;
  /* choice entries become scenes for majors (or often) */
  var wantModal=!!(pick.c&&pick.c.length);
  if(wantModal&&!(ACT_MAJORS[id]||Math.random()<0.35))wantModal=false;
  if(wantModal){
    try{
      var chs=pick.c.map(function(c){
        return {label:actFill(c.l),hint:c.h||"",fx:(function(cc){ return function(){ actDoOps(cc.fx); return actFill(cc.out||"It is done."); }; })(c)};
      });
      showEvent({id:"act-"+id+"-"+S.age+"-"+n,title:out.title,text:out.text,choices:chs});
    }catch(e){ wantModal=false; }
  }
  /* world-tab flavor: occasionally the world gets a word in edgewise */
  if(!wantModal&&tab!=="world"&&Math.random()<0.08){
    try{ var wb=ACT_BANKS.world, we=wb[Math.floor(Math.random()*wb.length)]; out.side={icon:"🌍",title:we.t,text:actFill(we.x)}; window.__lastOutcome=out; }catch(e){}
  }
  /* online AI upgrade: bespoke narration replaces the bank card (cards only) */
  try{ aiActUpgrade(out,label); }catch(e){}
}
/* ---- online leg: bespoke narration for any action taken ---- */
var __actAiAt=0, __actAiBusy=false;
function aiActUpgrade(out,label){
  if(!S||!S.alive||!out||out.modal)return;
  if(window.LL_AI_ONLINE===false)return;
  var now=Date.now();
  if(__actAiBusy||now-__actAiAt<12000)return;
  __actAiBusy=true; __actAiAt=now;
  var myGen=(typeof lifeGen==="function"?lifeGen():0), myAt=out.at;
  var ctx="";
  try{ ctx="You are "+S.firstName+" "+S.lastName+", age "+S.age+". Just did: "+label+". Recent: "+S.log.slice(-2).map(function(e){return e.icon+" "+e.text;}).join(" | ").slice(0,300); }catch(e){ ctx=label; }
  var p=null;
  try{ p=aiText({instruction:"You narrate one vivid moment of a life simulator. "+ctx+". Reply with ONLY a JSON object, no other text: {\"title\":\"short punchy title (max 6 words)\",\"text\":\"2-3 vivid second-person sentences about this exact moment\"}. Plain words, no stats, no mechanics, no choices."},20000); }
  catch(e){ __actAiBusy=false; return; }
  Promise.resolve(p).then(function(v){
    __actAiBusy=false;
    try{
      if(!S||!S.alive)return;
      if(typeof lifeGen==="function"&&lifeGen()!==myGen)return;
      if(!window.__lastOutcome||window.__lastOutcome.at!==myAt)return;
      var m=String(v||"").match(/\{[\s\S]*\}/); if(!m)return;
      var j=JSON.parse(m[0]);
      if(!j||!j.title||!j.text)return;
      window.__lastOutcome.title=String(j.title).slice(0,60);
      window.__lastOutcome.text=String(j.text).slice(0,500);
      window.__lastOutcome.ai=true;
      if(typeof render==="function")render();
    }catch(e){}
  },function(){ __actAiBusy=false; });
}
/* ---- NPC faces: circular glow-ring portraits (photo if painted, initials if not) ---- */
function npcInitials(name){ try{ var p=String(name||"?").trim().split(/\s+/); return ((p[0]||"?").charAt(0)+(p.length>1?p[p.length-1].charAt(0):"")).toUpperCase(); }catch(e){ return "?"; } }
function npcPhoto(name){ try{ if(S&&S.npcArt&&S.npcArt[name])return S.npcArt[name]; }catch(e){} return null; }
function npcFaceHTML(name,big,paintBtn){
  var u=npcPhoto(name), cls="npcface"+(big?" big":"");
  var inner=u?'<img src="'+u+'" alt="portrait" />':esc(npcInitials(name));
  var h='<span class="'+cls+'" data-npcface="'+esc(String(name))+'">'+inner+'</span>';
  if(paintBtn&&!u)h+=' <button class="mini" data-paintnpc="'+esc(String(name))+'" title="Paint their portrait">📸</button>';
  return h;
}
function npcHash(s){ var h=7; s=String(s||""); for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0; return Math.abs(h)%999983+1; }
/* paint + cache (cap 8, oldest evicted). Exposed for tap-to-paint buttons. */
function paintNpc(name){
  if(!S||!S.alive)return;
  try{
    if(typeof artEnabled==="function"&&!artEnabled()){ toast("🎨 Art is off — tap 🎨 to enable."); return; }
    if(npcPhoto(name)){ if(typeof render==="function")render(); return; }
    var n=null; try{ n=wFindNPC(name); }catch(e){}
    var desc="adult";
    try{ if(n){ desc=(n.age||30)+"-year-old "+(n.sex||"person")+(n.role?" "+n.role:"")+(n.traits&&n.traits.length?" ("+n.traits.slice(0,2).join(", ")+")":""); } }catch(e){}
    toast("🎨 Painting "+name+"…");
    var myGen=(typeof lifeGen==="function"?lifeGen():0);
    Promise.resolve(requestImage({prompt:"Photorealistic intimate portrait headshot, real human photography, natural skin texture, soft window light, plain dark background, no text no watermark. Subject: "+desc+".",seed:npcHash("npc:"+name)})).then(function(r){
      try{
        if(!S||!S.alive)return;
        if(typeof lifeGen==="function"&&lifeGen()!==myGen)return;
        if(!r||!r.dataUrl)return;
        if(!S.npcArt)S.npcArt={}; if(!S.npcArtOrder)S.npcArtOrder=[];
        S.npcArt[name]=r.dataUrl; S.npcArtOrder.push(name);
        while(S.npcArtOrder.length>8){ var old=S.npcArtOrder.shift(); try{ delete S.npcArt[old]; }catch(e){} }
        try{ autosave(); }catch(e){}
        if(typeof render==="function")render();
      }catch(e){}
    },function(){});
  }catch(e){}
}
window.paintNpc=paintNpc;
/* tap-to-paint delegation: any [data-paintnpc] button paints that NPC */
try{
  document.addEventListener("click",function(e){
    var b=(e&&e.target&&e.target.closest)?e.target.closest("[data-paintnpc]"):null;
    if(!b)return;
    try{ e.stopPropagation(); }catch(x){}
    paintNpc(b.getAttribute("data-paintnpc"));
  });
}catch(e){}
/* partner auto-paints once on romantic verbs (art-gated, quota-light: ~1/life) */
function autoPaintPartner(){
  try{
    if(!S||!S.relationships||!S.relationships.partner)return;
    var nm=S.relationships.partner.name;
    if(!nm||npcPhoto(nm))return;
    if(typeof artEnabled==="function"&&!artEnabled())return;
    if(S.flags&&S.flags.partnerPainted)return;
    S.flags.partnerPainted=true;
    paintNpc(nm);
  }catch(e){}
}
LL.files.push("act-events");
