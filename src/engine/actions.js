/* LIFE & LEGACY — engine/actions.js
 * SECTION 9a/9b player actions, jobs, buy, dynasty verbs.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 9a — player actions (gated one-shot doAct switch) ============ */
function needAge(a,msg){ if(S.age<a){ toast("🔒 "+(msg||("Available at "+a+"+"))); return true; } return false; }
function once(key){ if(S.perYear[key]){ toast("⏳ Already did this year — age up!"); return true; } S.perYear[key]=1; return false; }
/* Yearly budget for free grinders: capYr("study") allows 3 clicks/year, the 4th+ is blocked. */
function capYr(key,limit){ limit=limit||3; var k="cap_"+key; S.perYear[k]=(S.perYear[k]||0)+1; if(S.perYear[k]>limit){ S.perYear[k]=limit; toast("⏳ Enough for this year — age up!"); return true; } return false; }
function gainLog(icon,text,type){ pushLog(S.age,icon,text,type||""); }
function traitName(id){ for(var i=0;i<window.GDATA.traits.length;i++) if(window.GDATA.traits[i].id===id) return window.GDATA.traits[i].icon+" "+window.GDATA.traits[i].name; return id; }

function doAct(id){
  if(!S||!S.alive)return; var g=S.stats;
  /* EDA/CQRS: record the intent on the command bus (validate + journal; the
   * switch below stays the executor — strangler pattern, zero behavior risk). */
  try{ if(window.LL&&LL.bus)LL.bus.dispatch({type:"act",id:id}); }catch(e){}
  function payOK(c){ if(S.money<c){ toast("💸 Not enough money!"); return false; } S.money-=c; return true; }
  switch(id){
    case "study": if(needAge(4))break; if(capYr("study"))break; gainStat("smarts",3+(hasTrait("genius")?3:0)+(hasTrait("diligent")?2:0)-(hasTrait("lazy")?2:0)); gainStat("discipline",1); g.happiness=clamp100(g.happiness-2); S.education.grades=clamp100(S.education.grades+4+(hasTrait("patient")?2:0)); gainLog("📚","Studied hard. Brain gains."); break;
    case "deepstudy": if(needAge(15))break; if(focusTag()!=="scholar"&&!hasTrait("genius")){ toast("🔒 Scholars & geniuses only — set a Scholarship-style focus!"); break; } if(once("deep"))break; gainStat("smarts",6); S.education.grades=clamp100(S.education.grades+5); S.stress=clamp100(S.stress+3); gainLog("📖","Deep study: annotations, archives, insight. Smarts soar."); break;
    case "publish": if(needAge(20))break; if(S.education.highest!=="college"&&S.education.highest!=="grad"){ toast("Need a degree first!"); break; } if(once("pub"))break; { var w=2000+Math.floor(rnd()*8000); S.money+=w; S.prestige+=20; gainLog("📝","Published a paper. Royalties "+fmt$(w)+". +20 prestige.","good"); } break;
    case "read": if(needAge(5))break; if(capYr("read"))break; gainStat("smarts",2); gainStat("creativity",1); gainStat("happiness",2); gainLog("📖","Read a great book."); break;
    case "gym": if(needAge(12))break; if(once("gym"))break; gainStat("fitness",6+(hasTrait("robust")?2:0)-(hasTrait("lazy")?3:0)); gainStat("health",4); gainStat("looks",2); g.happiness=clamp100(g.happiness-1); gainLog("🏋️","Gym session. Sore tomorrow."); break;
    case "trainpro": if(needAge(15))break; if(focusTag()!=="athlete"){ toast("🔒 Athletics focus only!"); break; } if(once("train"))break; gainStat("fitness",8); gainStat("health",4); gainLog("🏋️","Pro training block. Beast mode."); break;
    case "jog": if(needAge(8))break; if(capYr("jog"))break; gainStat("fitness",3); gainStat("health",2); gainStat("happiness",3); S.stress=clamp100(S.stress-3); gainLog("🏃","Morning jog. Clear head."); break;
    case "meditate": if(needAge(10))break; if(capYr("med"))break; gainStat("happiness",6); gainStat("health",2); gainStat("discipline",1); S.stress=clamp100(S.stress-10); gainLog("🧘","Meditated. The noise fades."); break;
    case "network": if(needAge(16))break; if(focusTag()!=="socialite"&&!hasTrait("gregarious")){ toast("🔒 Socialites only — set a Socialite-style focus!"); break; } if(once("net"))break; gainStat("social",8); { var nn=rName(); S.relationships.friends.push({name:nn,rel:65}); gainLog("🥂","Worked the room. Befriended "+nn+". Doors open."); } break;
    case "negotiate": if(!S.jobId||S.jobId==="unemployed"){ toast("No job — find one first!"); break; } if(focusTag()!=="mogul"){ toast("🔒 Moguls only — set a Mogul-style focus!"); break; } if(once("nego"))break; var _nb=(jobById(S.jobId)||{}).pay||S.salary; S.salary=Math.min(Math.round(_nb*1.6),Math.round(S.salary*1.12)); S.performance=clamp100(S.performance+8); gainLog("💼","Negotiated like a shark. Salary now "+fmt$(S.salary)+"!","good"); break;
    case "gig": if(needAge(15))break; if(focusTag()!=="artist"&&S.stats.creativity<50){ toast("🔒 Artists (or 50+ creativity) only!"); break; } if(once("gig"))break; { var ge=300+Math.floor(rnd()*900); S.money+=ge; gainStat("creativity",3); gainLog("🎨","Gig paid "+fmt$(ge)+". The crowd felt it."); } break;
    case "fast": if(needAge(16))break; if(focusTag()!=="ascetic"){ toast("🔒 Ascetics only — set an Ascetic-style focus!"); break; } gainKarma(6); S.stress=clamp100(S.stress-8); gainStat("health",2); gainLog("🕯️","Fast and reflection. Stillness pays."); break;
    case "party": if(needAge(14))break; if(once("party"))break; if(!payOK(60))break; gainStat("happiness",10); gainStat("social",6+(hasTrait("gregarious")?3:0)); g.health=clamp100(g.health-3); S.stress=clamp100(S.stress-6); gainLog("🎉","Party night! Stories for weeks. -$60"); break;
    case "movies": if(!payOK(25))break; gainStat("happiness",5); S.stress=clamp100(S.stress-2); gainLog("🎬","Movie night. -$25"); break;
    case "games": if(capYr("games"))break; gainStat("happiness",5); gainStat("creativity",1); gainLog("🎮","Gaming binge. No regrets."); break;
    case "hike": if(needAge(10))break; if(capYr("hike"))break; gainStat("health",3); gainStat("happiness",6); gainStat("fitness",2); S.stress=clamp100(S.stress-5); gainLog("🥾","Hiked wild trails. Lungs full."); break;
    case "vacation": if(needAge(18))break; if(!payOK(1500))break; gainStat("happiness",15); gainStat("health",5); S.stress=clamp100(S.stress-18); S.ach.vacations++; gainLog("✈️","Vacation! Sunsets heal everything. -$1,500","good"); break;
    case "retreat": if(!payOK(2000))break; S.stress=clamp100(S.stress-30); gainStat("health",6); gainLog("🏔️","Silent retreat. You return human. -$2,000","good"); break;
    case "volunteer": if(needAge(10))break; if(capYr("vol"))break; gainKarma(8+(hasTrait("charitable")?4:0)); gainStat("happiness",4); gainStat("social",2); gainLog("🤝","Volunteered. Heart full.","good"); break;
    case "salon": if(!payOK(80))break; gainStat("looks",5); gainStat("happiness",4); gainLog("💇","Fresh look. Mirror approves. -$80"); break;
    case "surgery": if(needAge(18))break; if(!payOK(6000))break; if(rnd()<0.8){ gainStat("looks",14); gainLog("✨","Surgery went perfectly. Heads turn. -$6,000","good"); } else { g.looks=clamp100(g.looks-6); g.health=clamp100(g.health-8); gainLog("🏥","Botched work. Corrective saga begins. -$6,000","bad"); } break;
    case "socialmedia": if(capYr("socm"))break; gainStat("social",2); if(rnd()<0.3){ g.happiness=clamp100(g.happiness-4); gainLog("📱","Doomscrolled. Everyone's life looks better.","bad"); } else { gainStat("happiness",4); if(S.fame>20){ var fl=Math.round(50+rnd()*400); S.followers+=fl; gainLog("📱","Posted a banger. +"+fl+" followers!"); } else gainLog("📱","Posted a banger. Likes rain in."); } break;
    case "audition": if(needAge(14))break; if(once("audi"))break; if(g.looks+g.creativity>100||hasTrait("beautiful")||rnd()<0.25){ var aw=2000+Math.floor(rnd()*9000); S.money+=aw; S.fame=clamp100(S.fame+8); S.followers+=8000; gainLog("🎬","NAILED the audition! Paid "+fmt$(aw)+", +fame!","good"); } else gainLog("🎬","Cut in round two. The director keeps your headshot. Maybe."); break;
    case "hustle": if(needAge(14))break; if(once("hustle"))break; { var e=200+rnd()*600|0; if(S.flags.hustleBoost)e=Math.round(e*1.25); S.money+=e; g.happiness=clamp100(g.happiness-2); gainStat("discipline",2); S.stress=clamp100(S.stress+2); gainLog("💪","Side hustle earned $"+e+".","good"); } break;
    case "lottery": if(needAge(16))break; if(!payOK(5))break; if(rnd()<0.03){ S.money+=1000; gainStat("happiness",12); gainLog("🎟️","SCRATCH WIN! +$1,000!!","good"); } else gainLog("🎟️","Scratched. Nothing. The dream was fun."); break;
    case "casino": if(needAge(21))break; if(!payOK(200))break; { var r=rnd(); if(r<0.4){ S.money+=500; gainLog("🎰","Casino up! +$500. Walk away!","good"); } else if(r<0.7){ S.money+=200; gainLog("🎰","Broke even. Stake refunded, free drinks though."); } else { g.happiness=clamp100(g.happiness-6); gainLog("🎰","Lost $200. The slots hum mockingly.","bad"); } } break;
    case "pickpocket": if(needAge(12))break; crime("pickpocketed a tourist",120,0.35-(hasTrait("deceitful")?0.12:0)+(hasTrait("honest")?0.2:0)); break;
    case "burglary": if(needAge(16))break; crime("burgled a sleepy villa",1400,0.5-(hasTrait("deceitful")?0.12:0)-(hasTrait("brave")?0.05:0)+(hasTrait("honest")?0.2:0)); break;
    case "bank": if(needAge(18))break; crime("robbed a bank, movie-style",12000,0.75-(hasTrait("deceitful")?0.1:0)-(hasTrait("brave")?0.08:0)); break;
    case "embezzle": if(needAge(21))break; if(!S.jobId||S.jobId==="unemployed"){ toast("Need a white-collar job first!"); break; } crime("embezzled from the company",8000,0.55-(hasTrait("deceitful")?0.15:0)); break;
    case "behave": if(S.flags.inJail<=0)break; if(once("behave"))break; if(rnd()<0.45){ S.flags.inJail=Math.max(0,S.flags.inJail-1); gainLog("🕊️","Good behavior! Sentence reduced. "+S.flags.inJail+" left.","good"); } else { gainStat("discipline",4); gainLog("⛓️","Quiet year. You read 12 books."); } if(S.flags.inJail===0){ gainLog("🔓","Released early! Freedom tastes sweet.","good"); } break;
    case "escape": if(S.flags.inJail<=0)break; if(once("escape"))break; if(g.fitness+g.smarts>110||rnd()<0.25){ S.flags.inJail=0; S.crime++; gainLog("🚁","PRISON BREAK! You vanish into the night. Wanted, but free.","event"); } else { S.flags.inJail+=2; g.health=clamp100(g.health-10); gainLog("🚨","Escape failed! +2 years. Solitary teaches patience.","bad"); } break;
    case "doctor": if(once("doctor"))break; if(!payOK(200))break; gainStat("health",8); S.stress=clamp100(S.stress-4); var _scr=""; try{ _scr=" "+screenGenetics(); }catch(e){} gainLog("🩺","Full checkup. Caught small stuff early."+_scr+" -$200"); break;
    case "therapy": if(!payOK(150))break; gainStat("happiness",10); S.stress=clamp100(S.stress-14); gainLog("🛋️","Therapy. Cried, laughed, healed. -$150"); break;
    case "diet": if(capYr("diet"))break; gainStat("health",3); gainStat("fitness",2); gainStat("looks",2); gainLog("🥗","Ate clean all month. Glow incoming."); break;
    case "sleep": if(capYr("sleep"))break; gainStat("health",2); gainStat("happiness",3); S.stress=clamp100(S.stress-5); gainLog("😴","Slept 9 hours. Superhuman."); break;
    case "tummytime": if(capYr("tum"))break; gainStat("health",3); gainStat("fitness",2); gainStat("happiness",4); gainLog("🍼","Tummy time! Tiny muscles, big effort."); break;
    case "babble": if(needAge(1))break; if(capYr("bab"))break; gainStat("social",4); gainStat("smarts",2); gainStat("happiness",4); gainLog("🔊","Babble babble! First word attempts logged."); break;
    case "nap": if(capYr("nap"))break; gainStat("happiness",6); gainStat("health",2); S.stress=clamp100(S.stress-8); gainLog("😴","A perfect nap. Drool included."); break;
    case "toys": if(needAge(2))break; if(capYr("toys"))break; gainStat("happiness",7); gainStat("creativity",2); gainLog("🧸","Toy adventures! The floor is lava."); break;
    case "playground": if(needAge(5))break; if(capYr("pg"))break; gainStat("happiness",8); gainStat("fitness",2); gainStat("social",2); gainLog("🛝","Playground! King of the swings."); break;
    case "stargaze": if(needAge(6))break; if(capYr("star"))break; gainStat("happiness",5); gainStat("smarts",1); S.stress=clamp100(S.stress-5); gainLog("🔭","Counted constellations. Felt small, in a good way."); break;
    case "museum": if(needAge(8))break; if(!payOK(10))break; gainStat("smarts",3); gainStat("happiness",3); gainLog("🏛️","Museum day. Mummies are cool. -$10"); break;
    case "lemonade": if(needAge(8))break; if(once("lem"))break; { var le=15+Math.floor(rnd()*40); S.money+=le; gainStat("happiness",3); gainStat("discipline",2); gainLog("🍋","Lemonade stand earned $"+le+"!","good"); } break;
    case "instrument": if(needAge(8))break; if(capYr("inst"))break; gainStat("creativity",4); gainStat("discipline",2); gainStat("happiness",2); gainLog("🎻","Practice pays. Scales today, symphonies tomorrow."); break;
    case "team": if(needAge(10))break; if(once("team"))break; gainStat("fitness",4); gainStat("social",4); gainStat("happiness",4); gainLog("⚽","Team practice. Sweat, high-fives, belonging."); break;
    case "roadtrip": if(needAge(18))break; if(!payOK(800))break; gainStat("happiness",16); S.stress=clamp100(S.stress-15); gainLog("🛤️","Road trip! Windows down, worries gone. -$800","good"); break;
    case "compliment": if(needAge(6))break; if(capYr("comp"))break; gainStat("social",2); gainKarma(2); gainStat("happiness",2); gainLog("💛","Kind words given freely. The world softens."); break;
    case "club": if(needAge(10))break; if(once("club"))break; gainStat("social",5); gainStat("happiness",4); gainLog("🎭","Joined the club. Your people! Name tags and all."); break;
    case "giftfriend": if(needAge(8))break; if(!S.relationships.friends.length){ toast("No friends yet — make one first!"); break; } if(!payOK(30))break; S.relationships.friends.forEach(function(f){ f.rel=clamp100(f.rel+10); }); gainStat("happiness",4); gainLog("🎁","Gifts for friends. Thoughtfulness compounds. -$30"); break;
    case "apologize": if(needAge(6))break; if(capYr("apol"))break; gainKarma(4); var _am=S.stats.karma<20?4:8; S.relationships.friends.forEach(function(f){ f.rel=clamp100(f.rel+_am); }); if(S.relationships.partner)S.relationships.partner.rel=clamp100(S.relationships.partner.rel+_am); gainStat("happiness",2); gainLog("🙏","Made amends. Bridges rebuilt."); break;
    case "mentor": if(needAge(30))break; if(once("mentor"))break; gainKarma(8); var _mp=S.stats.karma>70?9:6; S.prestige+=_mp; gainStat("happiness",4); gainLog("🦉","Mentored a kid chasing your old dreams. +"+_mp+" prestige.","good"); break;
    case "library": if(needAge(6))break; if(capYr("lib"))break; gainStat("smarts",2); S.stress=clamp100(S.stress-3); gainLog("🔎","Library afternoon. Shhh… knowledge."); break;
    case "sciencefair": if(needAge(8))break; if(S.age>19){ toast("School days only!"); break; } if(once("fair"))break; gainStat("smarts",3); if(g.smarts>60||rnd()<0.4){ S.prestige+=10; gainStat("happiness",6); gainLog("🔬","Science fair BLUE RIBBON! Volcano supremacy. +10 prestige.","good"); } else gainLog("🔬","Science fair. Honorable mention and a papier-mâché mountain."); break;
    case "skipclass": if(needAge(13))break; if(S.age>19){ toast("Only schooldays count!"); break; } gainStat("happiness",8); S.education.grades=clamp100(S.education.grades-6); g.discipline=clamp100(g.discipline-3); gainLog("🃏","Skipped class for adventures. Grades notice.","event"); break;
    case "tutor": if(needAge(16))break; if(once("tutor"))break; { var tu=100+Math.floor(rnd()*200); S.money+=tu; gainStat("social",3); gainStat("smarts",1); gainLog("✏️","Tutored kids for $"+tu+".","good"); } break;
    case "onlinecourse": if(needAge(18))break; if(!payOK(100))break; gainStat("smarts",4); gainLog("💻","Finished an online course. Certificate unlocked. -$100"); break;
    case "piggybank": if(needAge(5))break; if(!payOK(50))break; S.assets.savings+=50; gainStat("discipline",2); gainLog("🐷","Fed the piggy bank $50. Future-you nods."); break;
    case "chores": if(needAge(6))break; if(once("chores"))break; { var chw=20+Math.floor(rnd()*40); S.money+=chw; gainStat("discipline",2); gainStat("happiness",1); gainLog("🧹","Chores done. Earned $"+chw+".","good"); } break;
    case "askcash": if(needAge(5))break; if(S.relationships.momAge<-100&&S.relationships.dadAge<-100){ toast("No parents to ask. 🕊️"); break; } if(once("askc"))break; if(S.relationships.parentRel>40){ var al=S.familyWealth==="rich"?500:(S.familyWealth==="middle"?150:40); S.money+=al; S.relationships.parentRel=clamp100(S.relationships.parentRel-3); gainStat("happiness",4); gainLog("💵","Parents slip you $"+al+". Spend it wisely(ish).","good"); } else { g.happiness=clamp100(g.happiness-2); gainLog("💵","'Not this time,' they say. Character building.","bad"); } break;
    case "freelance": if(needAge(16))break; if(once("free"))break; { var fl2=150+g.creativity*4+Math.floor(rnd()*200); S.money+=fl2; gainStat("creativity",2); S.stress=clamp100(S.stress+3); gainLog("⌨️","Freelance gig paid $"+fl2+".","good"); } break;
    case "rentroom": if(needAge(18))break; if(S.assets.houseId==="none"){ toast("Need a home first!"); break; } if(once("rent"))break; { var rr=400+Math.floor(rnd()*400); S.money+=rr; g.happiness=clamp100(g.happiness-2); gainLog("🚪","Rented out a room for $"+rr+".","good"); } break;
    case "vaccinate": if(once("vax"))break; gainStat("health",8); gainLog("💉","Vaccinated. Tiny pinch, big shield."); break;
    case "playoutside": if(needAge(3))break; if(capYr("pout"))break; gainStat("health",3); gainStat("happiness",5); gainStat("fitness",2); gainLog("⚽","Played outside until sunset. Grass stains earned."); break;
    case "dentist": if(needAge(6))break; if(!payOK(120))break; gainStat("looks",3); gainStat("health",2); gainLog("🦷","Dentist visit. Minty and brave. -$120"); break;
    case "holdcourt": if(needAge(30))break; if(!payOK(2000))break; if(once("court"))break; S.prestige+=25; gainStat("happiness",5); gainLog("⚖️","Held court. Petitions heard, justice (mostly) served. +25 prestige.","good"); break;
    case "sponsor": if(needAge(25))break; if(!payOK(3000))break; if(once("spon"))break; gainKarma(12); var _sp=S.stats.karma>70?18:12; S.prestige+=_sp; gainLog("📜","Sponsored a scholar. Knowledge blooms in your name. +"+_sp+" prestige.","good"); break;
    case "parade": if(needAge(18))break; if(once("parade"))break; S.fame=clamp100(S.fame+8); S.followers+=5000; gainStat("happiness",6); S.prestige+=8; gainLog("🎖️","Led the parade! Confetti, cheers, a very tired horse.","good"); break;
    case "callgrandparents": if(needAge(4))break; if(capYr("cgp"))break; { var agp=(S.relationships.grandparents||[]).filter(function(x){return x.alive;}); if(!agp.length){ toast("No living grandparents. 🕊️"); break; } var gp2=agp[Math.floor(rnd()*agp.length)]; gp2.rel=clamp100(gp2.rel+6); gainStat("happiness",6); S.stress=clamp100(S.stress-4); gainLog("📞","Long call with Grand"+(gp2.sex==="female"?"ma":"pa")+" "+gp2.name+". Cookies promised.","good"); } break;
    case "familydinner": if(needAge(4))break; if(!payOK(40))break; gainStat("happiness",8); S.relationships.parentRel=clamp100(S.relationships.parentRel+5); gainLog("🍽️","Family dinner. Everyone talks at once. Perfect. -$40"); break;
    case "siblingbond": if(needAge(5))break; if(capYr("sib"))break; if(!(S.relationships.siblings||[]).length){ toast("No siblings — yet!"); break; } S.relationships.siblings.forEach(function(s){ s.rel=clamp100(s.rel+10); }); gainStat("happiness",6); gainLog("🤝","Sibling day. Alliances forged, secrets traded."); break;
    case "supportparents": if(needAge(25))break; if(S.relationships.momAge<-100&&S.relationships.dadAge<-100){ toast("Your parents are gone. 🕊️"); break; } if(!payOK(1000))break; gainKarma(8); S.prestige+=6; S.relationships.parentRel=clamp100(S.relationships.parentRel+8); gainStat("happiness",3); gainLog("🧓","Sent parents $1,000. They pretend they didn't need it. -$1,000","good"); break;
    case "babysit": if(needAge(35))break; if(!(S.relationships.grandkids||[]).length){ toast("No grandkids yet!"); break; } gainStat("happiness",10); gainKarma(3); gainLog("🧸","Babysat the grandkids. Chaos, giggles, naps (theirs)."); break;
    case "blood": if(needAge(17))break; if(once("blood"))break; gainKarma(6); g.health=clamp100(g.health-2); gainLog("🩸","Donated blood. Cookies + karma."); break;
    case "makefriend": if(needAge(4))break; if(capYr("mkfr"))break; { var n2=rName(); S.relationships.friends.push({name:n2,rel:55+(hasTrait("gregarious")?12:0)}); gainStat("social",5); gainStat("happiness",5); gainLog("👋","Befriended "+n2+". Inside jokes loading…"+apprKicker(),"good"); } break;
    case "hangout": if(needAge(5))break; if(!S.relationships.friends.length){ toast("No friends yet — make one first!"); break; } if(once("hang"))break; gainStat("happiness",8); S.stress=clamp100(S.stress-6); S.relationships.friends.forEach(function(f){ f.rel=clamp100(f.rel+6); }); gainLog("🍕","Epic hangout. Belly laughs guaranteed."); break;
    case "finddate": if(needAge(14))break; if(S.relationships.partner){ toast("You're already taken! 💘"); break; }
      if(g.looks+g.social>70||S.flags.charming||hasTrait("lustful")||hasTrait("beautiful")||rnd()<0.4){ var pn=partnerName(); S.relationships.partner={name:pn,rel:60,married:false,age:S.age,sex:inferSexByName(pn)}; S.ach.partners++; gainStat("happiness",10); S.prestige+=5; gainLog("💘",pn+" said yes to a date! Sparks fly.","good"); } else { g.happiness=clamp100(g.happiness-5); gainLog("💔","Rejected. Their loss. Ice cream helps.","bad"); } break;
    case "datenight": if(!S.relationships.partner){ toast("Single — find a date first!"); break; } if(!payOK(120))break; S.relationships.partner.rel=clamp100(S.relationships.partner.rel+10); gainStat("happiness",8); S.stress=clamp100(S.stress-4); gainLog("🌹","Date night with "+S.relationships.partner.name+". Butterflies. -$120"); break;
    case "seduce": if(needAge(16))break; if(once("sed"))break; if(g.looks+g.social>95||hasTrait("lustful")||hasTrait("beautiful")||rnd()<0.4){ gainStat("happiness",8); if(!S.relationships.partner){ var sn=partnerName(); S.relationships.partner={name:sn,rel:65,married:false,age:S.age,sex:inferSexByName(sn)}; S.ach.partners++; gainLog("🔥","Your scheme of seduction works flawlessly on "+sn+".","event"); } else { S.relationships.partner.rel=clamp100(S.relationships.partner.rel+12); gainLog("🔥","A night of schemed romance rekindles everything.","event"); } } else { S.stats.karma=clamp100(S.stats.karma-6); if(S.relationships.partner){ S.relationships.partner.rel=clamp100(S.relationships.partner.rel-18); gainLog("💔","The scheme backfires — jealousy and slammed doors.","bad"); } else gainLog("🌧️","Charm offensive fails. Awkward silence.","bad"); } break;
    case "befriend-scheme": if(once("bsch"))break; if(g.social>55||hasTrait("gregarious")||rnd()<0.5){ var bn=rName(); S.relationships.friends.push({name:bn+" (scheme)",rel:70}); S.prestige+=8; gainLog("🤝","Befriend scheme succeeds: "+bn+" now owes you favors. +8 prestige.","event"); } else { S.stats.karma=clamp100(S.stats.karma-4); gainLog("🎭","They see through the flattery. Ouch.","bad"); } break;
    case "blackmail": if(needAge(18))break; if(!hasTrait("deceitful")&&g.smarts<55){ toast("🔒 Deceitful or 55+ smarts only!"); break; } if(rnd()<0.55){ var bl=2000+Math.floor(rnd()*6000); S.money+=bl; S.crime++; S.ach.crimes++; S.stats.karma=clamp100(S.stats.karma-15); gainLog("🕵️","Blackmail pays "+fmt$(bl)+". You sleep with one eye open.","event"); } else { S.flags.inJail=2; S.crime++; S.record=Math.min(100,(S.record||0)+30); if(S.jobId&&S.jobId!=="unemployed"){ S.jobId="unemployed"; S.salary=0; } S.prestige=Math.max(0,S.prestige-50); gainLog("🚔","The mark went to the police! 2 years in prison.","bad"); } break;
    case "propose": if(needAge(16))break; if(!S.relationships.partner){ toast("No partner!"); break; } if(S.relationships.partner.married){ toast("Already married! 💍"); break; } if(!payOK(2000))break;
      if(S.relationships.partner.rel>65||hasTrait("lustful")){ S.relationships.partner.married=true; S.relationships.partner.rel=100; gainStat("happiness",18); S.prestige+=25; gainLog("💍",S.relationships.partner.name+" said YES! Wedding bells! +25 prestige.","good"); } else { S.relationships.partner.rel=clamp100(S.relationships.partner.rel-15); gainLog("💍","'Not yet,' they say gently. Ouch.","bad"); } break;
    case "wedding": if(needAge(18))break; if(!S.relationships.partner||!S.relationships.partner.married){ toast("Marry (propose) first!"); break; } if(once("wed"))break; if(!payOK(5000))break; gainStat("happiness",14); S.prestige+=30; if(S.fame>30){ S.followers+=15000; } gainLog("💒","Garden wedding under fairy lights. Tears, vows, cake. +30 prestige.","good"); break;
    case "grandwed": if(needAge(18))break; if(!S.relationships.partner||!S.relationships.partner.married){ toast("Marry first!"); break; } if(once("gwed"))break; if(!payOK(25000))break; gainStat("happiness",20); S.prestige+=80; S.fame=clamp100(S.fame+12); S.followers+=60000; gainLog("👑","A wedding for the ages — 300 guests, string quartet, fireworks. +80 prestige, +fame!","good"); break;
    case "divorce": if(needAge(18))break; if(!S.relationships.partner||!S.relationships.partner.married){ toast("Not married!"); break; } { var ex=S.relationships.partner.name; S.relationships.partner=null; S.money=Math.round(S.money*0.6); g.happiness=clamp100(g.happiness-20); S.stress=clamp100(S.stress+15); S.prestige=Math.max(0,S.prestige-40);
      /* custody battle: minor kids stay or go, decided by money + standing + luck */
      var minors=S.relationships.children.filter(function(k){ return k.age<18; });
      if(minors.length){
        var score=S.money/10000+S.prestige/50+S.stats.karma/25+rnd()*3, exScore=2+rnd()*3, kept=0, lost=0;
        for(var _ci=0;_ci<minors.length;_ci++){ var _ck=minors[_ci];
          if(score>=exScore){ _ck.custody=null; kept++; }
          else { _ck.custody="ex"; _ck.rel=clamp100(_ck.rel-15); lost++; } }
        if(lost>0){ S.prestige=Math.max(0,S.prestige-10);
          gainLog("⚖️","Divorced "+ex+". Settlement costs 40% of savings — and the court gives "+ex+" custody of "+lost+" kid"+(lost>1?"s":"")+". Child support will bleed you yearly. Sue for custody in 👪 Family when you're stronger.","bad"); }
        else gainLog("💔","Divorced "+ex+". Settlement costs 40% of savings. You keep the kids — small mercy. Devastating.","bad");
      }
      else gainLog("💔","Divorced "+ex+". Settlement costs 40% of savings. Devastating.","bad"); } break;
    case "baby": if(needAge(20))break; if(!S.relationships.partner){ toast("Need a partner first!"); break; } if(S.age>45){ toast("🌙 Nature has closed that chapter — adoption is still open!"); break; } { var _ep0=pregEnsure().filter(function(p){return p.carrier===S.relationships.partner.name;}); if(_ep0.length){ toast("🤰 "+S.relationships.partner.name+" is already expecting — no need to pay the clinic twice!"); break; } } if(once("baby"))break; if(!payOK(3000))break; { startPregnancy(S.relationships.partner.name,"planned"); gainStat("happiness",8);
      gainLog("🍼","The clinic confirms it — "+S.relationships.partner.name+" is expecting! Due in about two years. -$3,000","good"); } break;
    case "prenatal": if(needAge(18))break; { var _pg=pregEnsure().filter(function(p){return !p.care;}); if(!_pg.length){ toast("No expecting mother needs care right now!"); break; } if(once("pren"))break; if(!payOK(500))break;
      _pg.forEach(function(p){ p.care=true; }); gainStat("health",2);
      gainLog("🩺","Prenatal care: vitamins, checkups, lullabies through a stethoscope. Healthier babies coming. -$500","good"); } break;
    case "custody": if(needAge(18))break; { var _xk=S.relationships.children.filter(function(k){return k.custody==="ex";}); if(!_xk.length){ toast("All your kids are with you!"); break; } if(once("cust"))break; if(!payOK(2000))break;
      if(S.prestige<60&&S.stats.smarts<60){ toast("No lawyer takes the case — build prestige (60+) or smarts first!"); S.money+=2000; break; }
      var _kc=_xk[0]; _kc.custody=null; _kc.rel=clamp100(_kc.rel-10); S.prestige+=5; S.stress=clamp100(S.stress+5);
      gainLog("⚖️","Custody battle WON: "+_kc.name+" comes home. Courts, tears, a backpack full of their things. (+5 prestige, −10 bond)","good"); } break;
    case "adopt": if(needAge(22))break; if(!payOK(8000))break; { var an=rName(); var ka=kidDefault(an,2+Math.floor(rnd()*5)); ka.rel=85; S.relationships.children.push(ka); S.prestige+=20; gainKarma(10); gainLog("🏠","Adopted "+an+"! Home gets louder and warmer. -$8,000","good"); } break;
    case "visitparents": if(capYr("vp"))break; if(S.relationships.momAge<-100&&S.relationships.dadAge<-100){ toast("Your parents are gone. 🕊️"); break; } S.relationships.parentRel=clamp100(S.relationships.parentRel+8); gainStat("happiness",5); S.stress=clamp100(S.stress-3); var _vn="Mom"; try{ _vn=(S.relationships.mom&&S.relationships.mom.name)||"Mom"; }catch(e){} gainLog("🏡","Visited parents. "+_vn+" packed food for a week."); break;
    case "pet": if(!payOK(300))break; { var pp=pick([{name:"Mochi",type:"🐱"},{name:"Rocky",type:"🐶"},{name:"Kiwi",type:"🦜"},{name:"Nibbles",type:"🐹"}]); S.relationships.pets.push({name:pp.name,type:pp.type,rel:80}); gainStat("happiness",9); gainLog(pp.type,"Adopted "+pp.name+" "+pp.type+"! Instant family. -$300","good"); } break;
    case "crew": if(needAge(16))break; uwJoin(); autosave(); render(); break;
    case "score": if(needAge(16))break; uwScore(); autosave(); render(); break;
    case "laylow": uwLayLow(); autosave(); render(); break;
    case "stashcash": uwWash(); autosave(); render(); break;
    case "yard": uwYard(); autosave(); render(); break;
    case "bond": kidBond(); autosave(); render(); break;
    case "tutorkid": kidTutor(); autosave(); render(); break;
    case "praise": kidPraise(); autosave(); render(); break;
    case "scold": kidScold(); autosave(); render(); break;
    case "groomheir": kidGroom(); autosave(); render(); break;
    case "biztech": foundCompany("tech"); autosave(); render(); break;
    case "bizfood": foundCompany("food"); autosave(); render(); break;
    case "biztrade": foundCompany("trade"); autosave(); render(); break;
    case "hire": coHire(); autosave(); render(); break;
    case "expandbiz": coExpand(); autosave(); render(); break;
    case "ipo": coIPO(); autosave(); render(); break;
    case "claim": if(needAge(18))break; if(once("claimx"))break; { sexEnsure(); var _cn=S.relationships.partner?S.relationships.partner.name:(S.sex.lovers.length?S.sex.lovers[S.sex.lovers.length-1]:null); if(!_cn){ var _nn=partnerName(); S.relationships.partner={name:_nn,rel:65,married:false,age:S.age}; S.ach.partners++; _cn=_nn; gainLog("💘","Claimed someone new: "+_nn+" — the chase ends with them gasping your name.","event"); } var _c=claimPartner(_cn,{via:(ownLaw().allows?"legal":"claim"),silent:true}); if(S.relationships.partner&&S.relationships.partner.name===_cn)S.relationships.partner.rel=clamp100(S.relationships.partner.rel+8); gainLog("⛓️","You look "+_cn+" in the eye and tell them who they belong to now. They shiver — and agree. Claimed ("+CLAIM_STAGES[_c.stage]+").","event"); autosave(); render(); break; }
    case "train": if(needAge(18))break; if(once("trainx"))break; { sexEnsure(); if(!S.sex.claims.length){ toast("Claim someone first (⛓️)!"); break; } var _t=S.sex.claims[S.sex.claims.length-1]; _t=bumpClaim(_t.name,10,6,0); sxXp(1); addCorr(3); gainStamina(5); raiseCorruption(_t.name,2); gainStat("happiness",6); if(_t.obedience>=85&&_t.stage<3){ _t.stage=3; S.prestige+=5; gainLog("🔒",_t.name+" kneels into the ritual now without being asked — owned. The house rules are written on skin and memory.","event"); } else gainLog("🎓","Training night with "+_t.name+": praise for obedience, correction for hesitation. Obedience "+_t.obedience+".","event"); autosave(); render(); break; }
    case "break": if(needAge(18))break; if(once("breakx"))break; { sexEnsure(); if(!S.sex.claims.length){ toast("Claim someone first (⛓️)!"); break; } var _b=S.sex.claims[S.sex.claims.length-1]; breakPartner(_b.name,14); sxXp(1); gainStat("happiness",4); autosave(); render(); break; }
    case "harem": if(needAge(18))break; if(once("haremx"))break; { sexEnsure(); if(S.sex.claims.length<2){ toast("Need 2+ claimed lovers for a harem!"); break; } var _hh=S.sex.claims.slice().sort(function(a,b){return b.own-a.own;}); setHaremRank(_hh[0].name,0); for(var _hi=1;_hi<_hh.length;_hi++)setHaremRank(_hh[_hi].name,_hi); S.sex.haremTension=clamp100(S.sex.haremTension-20); gainStat("happiness",8); addCorr(4); gainLog("👑","Harem ordered: "+_hh[0].name+" wears the alpha ring; the rest fall in line (tension "+S.sex.haremTension+"). Rotation nights begin.","event"); autosave(); render(); break; }
    case "protection": if(needAge(18))break; { sexEnsure(); S.sex.protection=!S.sex.protection; gainLog(S.sex.protection?"🛡️":"⚠️",S.sex.protection?"Protection ON — condoms, pills, pull-out paranoia. Pregnancy risk near zero.":"Protection OFF — raw, fertile, dangerous. Pregnancy can happen now."); autosave(); render(); break; }
    case "mendrival": if(needAge(10))break; if(once("mendr"))break;
      { if(!nemActive()){ toast("No one hates you that much. Enjoy it."); break; }
        var _mr=nemRival();
        if(S.money<1000){ toast("A real peace offering costs $1,000. Come back richer."); break; }
        S.money-=1000;
        S.fate.nemesisDone="reconciled"; S.fate.nemHeat=0;
        if(_mr){ _mr.role="friend"; _mr.rel=60; _mr.note="Old enemies, now at peace."; _mr.money=Math.max(0,(_mr.money||0)+500); npcMem(_mr,"You buried the hatchet with a $1,000 peace offering."); }
        gainKarma(10); S.prestige+=5; gainStat("happiness",8); S.stress=clamp100(S.stress-10);
        gainLog("🤝","You buried the hatchet"+(_mr?" with "+_mr.name:"")+". $1,000 of pride and gifts — the feud is OVER. (+10 karma, +5 prestige)","good"); }
      break;
    case "exposerival": if(needAge(16))break; if(once("expor"))break;
      { if(!nemActive()){ toast("No one hates you that much. Enjoy it."); break; }
        var _er=nemRival(); if(!_er){ toast("They're already gone."); break; }
        if(S.fame<20&&S.prestige<100){ toast("Nobody important would listen — build fame (20+) or prestige (100+) first."); break; }
        if(S.stats.smarts<80){ if(!payOK(2000))break; }
        S.fate.nemesisDone="ruined"; S.fate.nemHeat=0;
        _er.money=0; _er.jobId="unemployed"; _er.rel=5; _er.note="Ruined by you — publicly exposed."; npcMem(_er,"You destroyed them in public. They will never recover.");
        S.prestige+=25; S.fame=clamp100(S.fame+10); gainStat("happiness",6);
        gainLog("⚖️","You EXPOSED "+_er.name+" — every scheme, every lie, on the record. They're finished. (+25 prestige, +10 fame)","good"); }
      break;
    case "ruinrival": if(needAge(18))break; if(once("ruinr"))break;
      { if(!nemActive()){ toast("No one hates you that much. Enjoy it."); break; }
        var _rr=nemRival(); if(!_rr){ toast("They're already gone."); break; }
        if(!payOK(3000))break;
        S.crime+=2; S.record+=15; S.stats.karma=clamp100(S.stats.karma-20);
        S.fate.nemesisDone="ruined"; S.fate.nemHeat=0;
        _rr.money=0; _rr.jobId="unemployed"; _rr.rel=0; _rr.note="Destroyed by you — has nothing left."; npcMem(_rr,"You ruined them completely. They fled with nothing.");
        gainStat("happiness",4);
        gainLog("🔪","You RUINED "+_rr.name+" first — money, work, name, all gone. It cost $3,000 and a piece of your soul. (+2 crimes, +15 record, −20 karma)","bad"); }
      break;
    case "leverage": if(needAge(18))break; if(once("levx"))break; { sexEnsure(); if(!S.sex.leverageOn.length){ toast("No dirt to use — collect some first."); break; } var _L=S.sex.leverageOn.shift(); var _pay=2000+Math.floor(rnd()*6000)+(S.fame*50|0); S.money+=_pay; S.totalEarned+=_pay; S.stats.karma=clamp100(S.stats.karma-10); S.sex.scandal=clamp100(S.sex.scandal+8); addCorr(5); gainLog("🕵️","You squeeze "+_L.target+" with ("+_L.secret+"). They pay "+fmt$(_pay)+" for silence. Everyone sleeps worse now.","event"); autosave(); render(); break; }
    case "direct": openDirector(); break;
    case "scenerand": openDirector(); runDirector(true); break;
    case "mortality": S.flags.ageless=false; S.flags.undying=false; gainLog("⏳","You release eternity. Time touches you again."); break;
    case "applycollege": if(needAge(17))break; if(S.flags.student){ toast("Already studying!"); break; }
      if(S.education.highest==="college"||S.education.highest==="grad"){ toast("🎓 You already hold a degree!"); break; }
      if(S.education.grades>=55){ S.flags.student=true; S.flags.community=S.money<20000; S.education.collegeYears=0; S.major="General";
        if(S.education.grades>=90){ S.scholarship=true; gainLog("🎓","FULL SCHOLARSHIP! Grades 90+ pay off — college is FREE. Genius move.","good"); }
        else { gainLog("🎓","Enrolled in college! Tuition is billed each year ($3k community / $28k regular).","good"); } }
      else toast("📉 Grades too low (need 55+). Study first!"); break;
    case "gradschool": if(S.education.highest==="grad"){ toast("🎓 Already have a graduate degree!"); break; } if(S.education.highest!=="college"){ toast("Need a college degree first!"); break; } if(!payOK(20000))break; S.education.highest="grad"; gainStat("smarts",12); S.prestige+=40; gainLog("🎓","Graduate degree! Dr. vibes. -$20,000, +40 prestige.","good"); break;
    case "workhard": if(!S.jobId||S.jobId==="unemployed"){ toast("No job — find one first!"); break; } if(once("work"))break; S.performance=clamp100(S.performance+8); g.happiness=clamp100(g.happiness-3); gainStat("discipline",3); S.stress=clamp100(S.stress+4); gainLog("💼","Worked late. Boss noticed."); if(S.performance>85){ var _wb=(jobById(S.jobId)||{}).pay||S.salary; S.salary=Math.min(Math.round(_wb*1.6),Math.round(S.salary*1.1)); S.performance=70; S.prestige+=10; gainLog("📈","Raise! Salary now "+fmt$(S.salary)+"!","good"); } break;
    case "askraise": if(!S.jobId||S.jobId==="unemployed"){ toast("No job!"); break; } if(once("raise"))break; if(S.performance>60||focusTag()==="mogul"){ var _ab=(jobById(S.jobId)||{}).pay||S.salary; S.salary=Math.min(Math.round(_ab*1.6),Math.round(S.salary*1.08)); S.prestige+=5; gainLog("💰","Raise granted! Now "+fmt$(S.salary)+"!","good"); } else { S.performance=clamp100(S.performance-5); gainLog("🚫","'Not right now,' says the boss. Awkward.","bad"); } break;
    case "quit": S.jobId="unemployed"; S.salary=0; gainStat("happiness",4); S.stress=clamp100(S.stress-8); gainLog("🚪","Quit the job. Freedom tastes sweet."); break;
    case "retire": if(needAge(55))break; S.jobId="unemployed"; S.salary=0; S.flags.retired=true; gainStat("happiness",8); gainLog("🏖️","Retired. Hello, mornings.","good"); break;
    case "stocks": if(needAge(18))break; if(!payOK(1000))break; S.assets.stocks+=1000; gainLog("📈","Put $1,000 into index stocks. It rides each year."); break;
    case "crypto": if(needAge(18))break; if(!payOK(500))break; S.assets.crypto+=500; gainLog("🪙","$500 into crypto. Volatility GO.","event"); break;
    case "sellstocks": if(S.assets.stocks<=0){ toast("No stocks!"); break; } S.money+=S.assets.stocks; gainLog("💵","Sold stocks for "+fmt$(S.assets.stocks)+". Nice.","good"); S.assets.stocks=0; break;
    case "sellhouse": if(S.assets.houseId==="none"){ toast("No home to sell!"); break; } { var _sh=Math.round((S.assets.houseVal||0)*0.8); S.money+=_sh; gainLog("🏚️","Sold "+houseName()+" for "+fmt$(_sh)+".","good"); S.assets.houseId="none"; S.assets.houseVal=0; S.assets.houseYears=0; } break;
    case "sellcar": if(S.assets.carId==="none"){ toast("No car to sell!"); break; } { var _sc=Math.round((S.assets.carVal||0)*0.6); S.money+=_sc; gainLog("🚗","Sold "+carName()+" for "+fmt$(_sc)+".","good"); S.assets.carId="none"; S.assets.carVal=0; } break;
    case "sellcrypto": if(!(S.assets.crypto>0)){ toast("No Koin to sell!"); break; } S.money+=S.assets.crypto; gainLog("🪙","Sold Koin bag for "+fmt$(S.assets.crypto)+".","good"); S.assets.crypto=0; break;
    case "withdrawsavings": if(!(S.assets.savings>0)){ toast("Savings are empty!"); break; } S.money+=S.assets.savings; gainLog("🏦","Withdrew "+fmt$(S.assets.savings)+" in savings.","good"); S.assets.savings=0; break;
    case "sellco": if(!S.company){ toast("No company yet!"); break; } S.money+=S.company.value+(S.company.cash||0); gainLog("💵","Sold "+S.company.name+" for "+fmt$(S.company.value)+"!","good"); S.company=null; S.prestige+=15; break;
    case "undercut": if(needAge(18))break; coUndercut(); autosave(); render(); break;
    case "acquire": if(needAge(18))break; coAcquire(); autosave(); render(); break;
    case "cosec": if(needAge(18))break; coSecurity(); autosave(); render(); break;
    case "hitrival": if(needAge(18))break; coHitRival(); autosave(); render(); break;
    case "takeover": if(needAge(18))break; coAnswerBid(true); autosave(); render(); break;
    case "snubbid": if(needAge(18))break; coAnswerBid(false); autosave(); render(); break;
    case "savings": if(!payOK(1000))break; S.assets.savings+=1000; gainLog("🏦","$1,000 into 4% savings. Future-you nods."); break;
    case "will": if(S.will){ toast("📜 Already have a will!"); break; } if(!payOK(300))break; S.will=true; S.flags.hasWill=true; gainKarma(8); S.prestige+=10; gainLog("📜","Will drafted. Heirs protected, taxes minimized. +10 prestige.","good"); break;
    case "nameheir": openDynasty(); break;
    default:
      if(typeof modRunAct==="function"){ try{ if(modRunAct(id))return; }catch(e){} }
      if(id.indexOf("major-")===0){ var m=id.slice(6); S.major=m; gainLog("📚","Declared major: "+m+". Specialized path unlocked."); autosave(); render(); return; }
      if(id.indexOf("focus-")===0){ S.lifestyle=id.slice(6); gainLog("🎯","Lifestyle focus: "+id.slice(6)+". Yearly bonuses unlocked."); autosave(); render(); return; }
      if(id.indexOf("dec-")===0){ doDecision(id.slice(4)); return; }
      toast("Unknown action"); return;
  }
  autosave(); render();
}
function doDecision(did){
  if(!S||!S.alive)return;
  if(S.perYear["dec_"+did]){ toast("⏳ One big decision per year each — age up!"); return; }
  function payOK(c){ if(S.money<c){ toast("💸 Need "+fmt$(c)+"!"); return false; } S.money-=c; return true; }
  var g=S.stats;
  switch(did){
    case "feast": if(!payOK(800))return; S.perYear.dec_feast=1; S.ach.feasts++;
      gainStat("happiness",10); gainStat("social",6); S.stress=clamp100(S.stress-12); S.prestige+=15;
      if(!S.relationships.friends.length){ var f1=rName(); S.relationships.friends.push({name:f1,rel:60}); }
      else S.relationships.friends.forEach(function(f){f.rel=clamp100(f.rel+8);});
      gainLog("🍖","A feast for the ages! Roast, songs, toasts. +15 prestige.","good"); break;
    case "hunt": if(!payOK(300))return; S.perYear.dec_hunt=1;
      if(g.fitness>45||hasTrait("brave")||rnd()<0.7){ gainStat("happiness",8); gainStat("fitness",2); S.prestige+=12; gainLog("🏹","The hunt succeeds! Trophies and tall tales. +12 prestige.","good"); }
      else { g.health=clamp100(g.health-12); gainLog("🏹","Thrown from the horse! Mud, bruises, humility.","bad"); } break;
    case "pilgrimage": if(!payOK(1200))return; S.perYear.dec_pilgrimage=1;
      gainKarma(12); S.stress=clamp100(S.stress-20); gainStat("happiness",6); S.prestige+=10;
      gainLog("🕯️","Pilgrimage complete. Silence, bells, clarity. +10 prestige.","good"); break;
    case "tournament": if(!payOK(2000))return; S.perYear.dec_tournament=1;
      if(g.fitness>60||hasTrait("brave")||hasTrait("robust")){ gainStat("happiness",12); S.prestige+=40; S.fame=clamp100(S.fame+10); S.followers+=12000; gainLog("⚔️","CHAMPION! The crowd roars your name. +40 prestige, +fame!","good"); }
      else { gainStat("happiness",4); S.prestige+=10; gainLog("⚔️","You lose nobly in round two. The feast still slaps. +10 prestige."); } break;
    case "gala": if(!payOK(5000))return; S.perYear.dec_gala=1;
      gainKarma(10); var _gp=S.stats.karma>70?52:35; S.prestige+=_gp; S.fame=clamp100(S.fame+8); S.followers+=20000;
      gainLog("💎","Charity gala raises a fortune for orphans. Photos everywhere. +"+_gp+" prestige.","good"); break;
    case "office": if(!payOK(10000))return; S.perYear.dec_office=1;
      if((S.record||0)>=20){ S.stats.happiness=clamp100(S.stats.happiness-6); gainLog("🗳️","Dig up that record? The press buries your campaign before it starts. (Need a clean record.)","bad"); break; }
      if(S.stats.karma<=40){ S.stats.happiness=clamp100(S.stats.happiness-6); gainLog("🗳️","Voters smell something rotten. Build some goodwill first. (Need 40+ karma.)","bad"); break; }
      var _need=S.stats.karma>70?75:80;
      if(g.social>=_need||(g.social>=_need-15&&g.smarts>=55)){ var seat=g.social>=_need?"Senator":"Mayor";
        S.jobId=seat.toLowerCase(); for(var i=0;i<window.GDATA.jobs.length;i++) if(window.GDATA.jobs[i].id===S.jobId)S.salary=window.GDATA.jobs[i].pay;
        S.ach.jobs++; S.performance=70; S.prestige+=150; S.fame=clamp100(S.fame+25); S.followers+=80000;
        gainLog("🏛️","ELECTED "+seat.toUpperCase()+"! Motorcade, oath, power. +150 prestige!","good"); }
      else { S.stats.happiness=clamp100(S.stats.happiness-6); gainLog("🗳️","You lose the race. Attack ads sting. Next cycle?","bad"); } break;
    case "startup": if(!payOK(15000))return; S.perYear.dec_startup=1;
      if(rnd()<0.35){ var v=90000+Math.floor(rnd()*200000); S.company={name:pick(["DogSocks","NapPods","SoupTube","GrannyAI","MossCoins"])+" Inc.",sector:pick(["tech","food","trade"]),value:v,cash:Math.round(v*0.05),employees:3,morale:60,rep:15,founded:S.year,level:1}; S.prestige+=50;
        gainLog("🚀","STARTUP MOONS! "+S.company.name+" valued at "+fmt$(v)+". +50 prestige!","good"); }
      else { gainLog("📦","Startup dies in 18 months. 1,000 unsold units haunt your garage. Startup-bust.","bad"); } break;
    case "writebook": S.perYear.dec_writebook=1;
      if(g.creativity>55||hasTrait("diligent")){ var ry=4000+Math.floor(rnd()*14000); S.money+=ry; S.prestige+=30; S.flags.memoir=true;
        gainLog("📖","Your memoir sells thousands! Royalties "+fmt$(ry)+". +30 prestige.","good"); }
      else gainLog("📖","312 pages no agent wants. Family treasure anyway."); break;
    default: return;
  }
  autosave(); render();
}
function crime(label,loot,risk){
  var g=S.stats;
  var r=risk+(S.fame>40?0.08:0)+(S.heat||0)*0.002-(hasTrait("paranoid")?0.08:0)-(S.flags.crimeBoost?0.1:0)-(S.flags.streetwise?0.05:0);
  if(rnd()<r){
    S.crime++; S.ach.crimes++;
    var tier=S.crime<=1?0:(S.crime===2?1:2);
    var yrs=[1+(rnd()*2|0),2+(rnd()*3|0),4+(rnd()*4|0)][tier];
    S.flags.inJail=yrs; S.record=Math.min(100,(S.record||0)+(loot>5000?40:(loot>1000?30:25))); S.heat=0;
    var fine=Math.round(S.money*0.25); S.money-=fine;
    if(S.jobId&&S.jobId!=="unemployed"){ pushLog(S.age,"🚪","Convicted — fired from "+jobName()+".","bad"); S.jobId="unemployed"; S.salary=0; }
    S.prestige=Math.max(0,S.prestige-[50,100,150][tier]);
    g.karma=clamp100(g.karma-18); g.happiness=clamp100(g.happiness-10); S.stress=clamp100(S.stress+12);
    if(S.underworld&&!S.underworld.retired){ S.underworld.rep=Math.max(0,S.underworld.rep-5); }
    if(S.fame>30){ S.followers+=25000; gainLog("📰","SCANDAL! Caught: "+label+". Mugshot trends worldwide. Fame up, soul down.","bad"); }
    gainLog("🚔","CAUGHT "+label+"! "+yrs+" year(s) in prison, "+fmt$(fine)+" fine, record +"+(loot>5000?40:(loot>1000?30:25))+". Haircut incoming.","bad");
  } else { S.money+=loot; S.crime++; S.ach.crimes++; S.heat=Math.min(100,(S.heat||0)+10); g.karma=clamp100(g.karma-10); gainStat("happiness",5);
    gainLog("🌙","Got away: "+label+". +"+fmt$(loot)+". Adrenaline! (Heat rises.)","event");
    if(S.underworld&&S.underworld.rep>0&&!S.underworld.retired){ S.underworld.rep+=2; uwPromote(); } }
}

/* ============ SECTION 9b — jobs / buy / dynasty (uses SECTION 0 findById) ============ */
function jobById(id){ return findById(window.GDATA.jobs,id); }
function jobEligible(j){
  if(j.minAge&&S.age<j.minAge)return false; if(j.maxAge&&S.age>j.maxAge)return false;
  var r=j.req||{};
  if(r.edu==="college"&&S.education.highest!=="college"&&S.education.highest!=="grad")return false;
  if(r.edu==="grad"&&S.education.highest!=="grad")return false;
  if(j.major&&j.major.indexOf(S.major)<0)return false;
  for(var _sk in r){ if(_sk==="edu")continue; if(typeof S.stats[_sk]==="number"&&typeof r[_sk]==="number"&&S.stats[_sk]<r[_sk]-15)return false; }
  if(["police","teacher","doctor","nurse","lawyer","judge","pilot","mayor","senator"].indexOf(j.id)>=0&&(S.record||0)>=30)return false;
  return true;
}
function jobName(){ var j=jobById(S.jobId); return j?j.name:"—"; }
function openJobs(){
  var box=$("jobList"); box.innerHTML="";
  window.GDATA.jobs.forEach(function(j){
    if(j.id==="unemployed")return;
    var ok=jobEligible(j); var d=document.createElement("div"); d.className="slot";
    var majorNote=j.major?(" · 🎓 "+j.major.join("/")):"";
    var statNote=j.req?(Object.keys(j.req).filter(function(k){return k!=="edu";}).map(function(k){return k+" "+j.req[k];}).join(" · ")):"";
    d.innerHTML='<div class="grow"><b>'+esc(j.name)+(j.fame?" ⭐":"")+'</b><small>'+fmt$(j.pay)+'/yr · '+esc(j.desc)+majorNote+(statNote?" · "+esc(statNote):"")+(j.minAge?" · "+j.minAge+"+":"")+'</small></div>';
    var b=document.createElement("button"); b.className="mini"; b.textContent=ok?"Apply":"🔒";
    b.disabled=!ok; b.onclick=function(){ S.jobId=j.id; S.salary=j.pay; S.performance=60; S.ach.jobs++;
      pushLog(S.age,"💼","Hired as "+j.name+" at "+fmt$(j.pay)+"/yr!","good"); closeModal("jobModal"); autosave(); render(); };
    d.appendChild(b); box.appendChild(d);
  });
  openModal("jobModal");
}
function openBuy(kind){
  var list=kind==="house"?window.GDATA.houses:window.GDATA.cars;
  var box=$("buyList"); box.innerHTML="";
  $("buyTitle").textContent=kind==="house"?"🏠 Buy a home":"🚗 Buy a car";
  var trade=kind==="house"?(S.assets.houseId!=="none"?Math.round((S.assets.houseVal||0)*0.8):0):(S.assets.carId!=="none"?Math.round((S.assets.carVal||0)*0.6):0);
  list.forEach(function(h){
    var owned=(kind==="house"?S.assets.houseId:S.assets.carId)===h.id||h.id==="none";
    var d=document.createElement("div"); d.className="slot";
    d.innerHTML='<div class="grow"><b>'+esc(h.name)+'</b><small>'+fmt$(h.cost)+' · upkeep '+fmt$(h.upkeep)+'/yr '+(owned?"· OWNED":(trade?" · trade-in "+fmt$(trade):""))+'</small></div>';
    var b=document.createElement("button"); b.className="mini"; b.textContent=owned?"✓":"Buy";
    b.disabled=owned||S.money+trade<h.cost;
    b.onclick=function(){ S.money-=h.cost-trade; if(kind==="house"){ S.assets.houseId=h.id; S.assets.houseVal=h.cost; S.assets.houseYears=0; S.prestige+=h.cost>1000000?100:(h.cost>200000?40:10); } else { S.assets.carId=h.id; S.assets.carVal=h.cost; }
      pushLog(S.age,kind==="house"?"🏠":"🚗","Bought "+h.name+" for "+fmt$(h.cost)+(trade?" (trade-in "+fmt$(trade)+")":"")+"!","good"); closeModal("buyModal"); autosave(); render(); };
    d.appendChild(b); box.appendChild(d);
  });
  openModal("buyModal");
}
function traitDesc(id){ var tr=findById(window.GDATA.traits,id); return tr?tr.desc:""; }
function openDynasty(){
  $("dynName").textContent=" "+S.lastName;
  $("dynInfo").textContent="Prestige "+S.prestige+" · Renown "+S.renown+" · Fame "+S.fame+" ("+(S.followers>1000?Math.round(S.followers/1000)+"k":S.followers)+" followers) · Will: "+(S.will?"yes":"no — draft one in 👑 Rule!");
  var tree=$("dynTree"); tree.innerHTML="";
  function gen(label,members){ var g=document.createElement("div"); g.className="tgen";
    members.forEach(function(m){ var n=document.createElement("div"); n.className="tnode"+(m.heir?" heir":"");
      n.innerHTML=(m.html||esc(m.t))+"<small>"+esc(m.s)+"</small>"; g.appendChild(n); });
    var cap=document.createElement("small"); cap.style.color="var(--muted)"; cap.textContent=label;
    var wrap=document.createElement("div"); wrap.style.display="flex"; wrap.style.flexDirection="column"; wrap.style.alignItems="center"; wrap.style.gap="4px";
    wrap.appendChild(cap); wrap.appendChild(g); tree.appendChild(wrap); }
  var parents=[];
  var _mn="Mom",_dn="Dad";
  try{ if(S.relationships.mom&&S.relationships.mom.name)_mn=S.relationships.mom.name; }catch(e){}
  try{ if(S.relationships.dad&&S.relationships.dad.name)_dn=S.relationships.dad.name; }catch(e){}
  if(S.relationships.momAge>-100)parents.push({t:"👩 "+_mn,s:"age "+S.relationships.momAge});
  if(S.relationships.dadAge>-100)parents.push({t:"🧔 "+_dn,s:"age "+S.relationships.dadAge});
  if(!parents.length)parents.push({t:"🕊️ Parents",s:"passed"});
  var gps=S.relationships.grandparents||[];
  if(gps.length)gen("GRANDPARENTS",gps.map(function(g){ return {t:"📜 "+g.name+" ("+g.side+")",s:(g.alive?("age "+g.age):"🕊️")}; }));
  gen(parents.length?"PARENTS":"PARENTS",parents);
  var sibs=S.relationships.siblings||[];
  var midHtml="";
  try{ var ps=$("portraitImg"); if(ps&&!ps.hidden&&ps.src)midHtml='<img src="'+ps.src+'" alt="you" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--gold)" />'; }catch(e){}
  var mid=[{html:(midHtml||"👑 ")+esc(S.firstName+" ("+S.age+")"),t:"x",s:(S.jobId!=="unemployed"?jobName():"")+" · ⚖"+S.prestige}];
  if(S.relationships.partner)mid.push({t:"💘 "+S.relationships.partner.name,s:S.relationships.partner.married?"married":"dating"});
  if(sibs.length)gen("SIBLINGS ("+sibs.length+")",sibs.map(function(s){ return {t:"🧬 "+s.name+" ("+s.age+")",s:"rel "+s.rel}; }));
  gen("YOU",mid);
  var kids=S.relationships.children.length?S.relationships.children.map(function(c,i){ return {t:"🌱 "+c.name+" ("+c.age+")",s:(S.heirId===i?"HEIR · ":"")+("rel "+c.rel)+(c.legit===false?" · ⚖️ contested":"")+(c.custody==="ex"?" · 🏠 with ex":""),heir:S.heirId===i}; }):[{t:"—",s:"no children yet"}];
  gen("CHILDREN ("+S.relationships.children.length+")",kids);
  if(S.relationships.grandkids&&S.relationships.grandkids.length)gen("GRANDKIDS ("+S.relationships.grandkids.length+")",S.relationships.grandkids.slice(0,8).map(function(g2){return {t:"🌿 "+g2.name,s:"age "+g2.age};}));
  var hl=$("heirList"); hl.innerHTML="";
  if(!S.relationships.children.length){ hl.innerHTML='<div class="slot"><div class="grow"><b>No children</b><small>Have or adopt a baby first.</small></div></div>'; }
  S.relationships.children.forEach(function(c,i){
    var d=document.createElement("div"); d.className="slot";
    d.innerHTML='<div class="grow"><b>'+esc(c.name)+' · age '+c.age+'</b><small>'+(c.age>=18?"adult — can inherit & continue the dynasty":"minor — grows each year")+(S.heirId===i?" · 👑 HEIR":"")+'</small></div>';
    var b=document.createElement("button"); b.className="mini"+(S.heirId===i?" gold":""); b.textContent=S.heirId===i?"✓ Heir":"Name heir";
    b.disabled=c.age<18;
    b.onclick=function(){ S.heirId=i; pushLog(S.age,"👑",c.name+" named heir of House "+S.lastName+".","event"); openDynasty(); autosave(); render(); };
    d.appendChild(b); hl.appendChild(d);
  });
  try{ renderDynastyChart(); }catch(e){}
  openModal("dynastyModal");
}

LL.files.push("actions"); /* end-of-file registration: counts as loaded only after this file fully ran */