/* Static game data: jobs, houses, cars, countries + traits, focuses, decisions, ribbons */
window.GDATA = {
countries: ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Republic of the)","Congo (DRC)","Cook Islands","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","Niue","North Korea","North Macedonia","Northern Cyprus","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","Somaliland","South Africa","South Korea","South Ossetia","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Transnistria","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Western Sahara","Yemen","Zambia","Zimbabwe","Abkhazia"],
jobs: [
  {id:"unemployed", name:"Unemployed", pay:0, req:{edu:"none", smarts:0}, desc:"No income. Find work!"},
  {id:"paper", name:"Paper Kid", pay:3200, minAge:12, maxAge:17, req:{}, desc:"Teen gig. +discipline"},
  {id:"fastfood", name:"Fast-Food Crew", pay:22000, minAge:15, req:{}, desc:"Entry job. Low pay, flexible."},
  {id:"retail", name:"Retail Clerk", pay:25000, minAge:16, req:{}, desc:"Steady entry work."},
  {id:"barista", name:"Barista", pay:25000, minAge:16, req:{social:20}, desc:"Coffee + chat skills."},
  {id:"driver", name:"Delivery Driver", pay:30000, minAge:18, req:{}, desc:"Needs stamina. Tips vary."},
  {id:"intern", name:"Intern", pay:26000, minAge:18, req:{}, desc:"Foot in the door. +experience."},
  {id:"realtor", name:"Realtor", pay:54000, minAge:19, req:{social:45}, major:["Business"], desc:"Commission life. Charm pays."},
  {id:"streamer", name:"Streamer", pay:26000, minAge:14, req:{creativity:30}, fame:true, desc:"Volatile fame income."},
  {id:"influencer", name:"Influencer", pay:34000, minAge:15, req:{looks:55,social:40}, fame:true, desc:"Looks + social pay off."},
  {id:"model", name:"Model", pay:75000, minAge:16, req:{looks:75}, fame:true, desc:"Face of campaigns. Fickle fame."},
  {id:"musician", name:"Musician", pay:52000, minAge:16, req:{creativity:60}, fame:true, major:["Music","Arts"], desc:"Gig to gig, dream to dream."},
  {id:"actor", name:"Actor", pay:95000, minAge:18, req:{looks:65,creativity:50}, fame:true, major:["Arts"], desc:"Fame is fickle."},
  {id:"director", name:"Film Director", pay:145000, minAge:26, req:{edu:"college",creativity:70,social:55}, fame:true, major:["Arts"], desc:"Auteur. Big swings."},
  {id:"athlete", name:"Pro Athlete", pay:140000, minAge:18, req:{fitness:80,looks:30}, fame:true, desc:"Short career, big checks."},
  {id:"soldier", name:"Soldier", pay:38000, minAge:18, req:{fitness:50,health:40}, desc:"Discipline. Risky."},
  {id:"pilot", name:"Airline Pilot", pay:120000, minAge:23, req:{edu:"college",fitness:50,smarts:55}, major:["Engineering"], desc:"Office at 35,000 ft."},
  {id:"mechanic", name:"Mechanic", pay:45000, minAge:18, req:{smarts:25}, major:["Engineering"], desc:"Hands-on trade."},
  {id:"chef", name:"Chef", pay:44000, minAge:18, req:{creativity:30}, desc:"Hot kitchen, warm hearts."},
  {id:"nurse", name:"Nurse", pay:68000, minAge:20, req:{edu:"college",smarts:45}, major:["Nursing","Medicine"], desc:"Care work, solid pay."},
  {id:"teacher", name:"Teacher", pay:55000, minAge:21, req:{edu:"college",smarts:40}, major:["Education"], desc:"Shapes minds."},
  {id:"professor", name:"Professor", pay:95000, minAge:27, req:{edu:"grad",smarts:70}, major:["Education"], desc:"Publish or perish."},
  {id:"scientist", name:"Scientist", pay:105000, minAge:23, req:{edu:"college",smarts:68}, major:["STEM"], desc:"Lab coat, big questions."},
  {id:"architect", name:"Architect", pay:88000, minAge:23, req:{edu:"college",creativity:55,smarts:50}, major:["Architecture","Arts"], desc:"Dreams in floor plans."},
  {id:"designer", name:"Designer", pay:58000, minAge:19, req:{creativity:50}, major:["Arts","Architecture"], desc:"Portfolio matters."},
  {id:"jundev", name:"Junior Developer", pay:68000, minAge:19, req:{smarts:55}, major:["Computer Science","STEM"], desc:"Entry to tech ladder."},
  {id:"engineer", name:"Engineer", pay:92000, minAge:22, req:{edu:"college",smarts:60}, major:["Engineering","STEM"], desc:"Builds the world."},
  {id:"seniordev", name:"Senior Developer", pay:125000, minAge:23, req:{edu:"college",smarts:65}, major:["Computer Science","STEM"], desc:"Promotion from Junior Dev."},
  {id:"doctor", name:"Doctor", pay:165000, minAge:25, req:{edu:"grad",smarts:75}, major:["Medicine","STEM"], desc:"Long study, huge pay."},
  {id:"lawyer", name:"Lawyer", pay:130000, minAge:24, req:{edu:"grad",smarts:70}, major:["Law"], desc:"Argues for a living."},
  {id:"judge", name:"Judge", pay:145000, minAge:33, req:{edu:"grad",smarts:72}, major:["Law"], desc:"The gavel. Final word."},
  {id:"manager", name:"Manager", pay:85000, minAge:24, req:{social:55,smarts:40}, major:["Business","Psychology"], desc:"Meetings about meetings."},
  {id:"exec", name:"Executive", pay:180000, minAge:30, req:{edu:"college",social:65,smarts:60}, major:["Business"], desc:"Corner office energy."},
  {id:"ceo", name:"CEO", pay:250000, minAge:32, req:{edu:"college",social:75,smarts:65}, major:["Business"], desc:"Top of the ladder."},
  {id:"mayor", name:"Mayor", pay:110000, minAge:30, req:{social:70}, fame:true, desc:"Runs the city. Kisses babies."},
  {id:"senator", name:"Senator", pay:155000, minAge:35, req:{edu:"college",social:75}, fame:true, desc:"Power, speeches, scandals."},
  {id:"police", name:"Police Officer", pay:60000, minAge:20, req:{fitness:45,smarts:30}, desc:"Serve & protect."}
],
houses: [
  {id:"none", name:"🏕 No home (couch-surfing)", cost:0, upkeep:0},
  {id:"tent", name:"⛺ Tent", cost:800, upkeep:200},
  {id:"studio", name:"🏢 Studio apartment", cost:45000, upkeep:5000},
  {id:"apt", name:"🏙 2-bed apartment", cost:120000, upkeep:9000},
  {id:"house", name:"🏡 Suburban house", cost:280000, upkeep:14000},
  {id:"villa", name:"🏝 Villa", cost:650000, upkeep:32000},
  {id:"mansion", name:"🏰 Mansion", cost:1800000, upkeep:90000},
  {id:"island", name:"🌋 Private island", cost:6000000, upkeep:300000}
],
cars: [
  {id:"none", name:"🚶 No car", cost:0, upkeep:0},
  {id:"bike", name:"🚲 Bike", cost:300, upkeep:50},
  {id:"used", name:"🚗 Used sedan", cost:6000, upkeep:1000},
  {id:"sedan", name:"🚙 New sedan", cost:24000, upkeep:2500},
  {id:"suv", name:"🚐 SUV", cost:42000, upkeep:3500},
  {id:"sports", name:"🏎 Sports car", cost:95000, upkeep:8000},
  {id:"super", name:"✨ Supercar", cost:280000, upkeep:22000}
],
degrees: ["none","highschool","college","grad"],

/* ---- personality + congenital traits ---- */
traits: [
  {id:"ambitious", name:"Ambitious", icon:"📈", desc:"+discipline, -contentment. Promotions come easier."},
  {id:"brave", name:"Brave", icon:"🦁", desc:"Stands firm. Better in fights, crime & marathons."},
  {id:"calm", name:"Calm", icon:"🧘", desc:"-stress always. Steady hands."},
  {id:"charitable", name:"Charitable", icon:"🤲", desc:"+karma from giving. Can't resist a cause."},
  {id:"content", name:"Content", icon:"😌", desc:"+happiness baseline. Wants little."},
  {id:"deceitful", name:"Deceitful", icon:"🕵️", desc:"Crime & schemes succeed more. Karma suffers."},
  {id:"diligent", name:"Diligent", icon:"📚", desc:"+smarts growth. Studies & work hit harder."},
  {id:"generous", name:"Generous", icon:"🎁", desc:"+social. Money slips through kind fingers."},
  {id:"gregarious", name:"Gregarious", icon:"🗣️", desc:"+social growth. Never meets a stranger."},
  {id:"greedy", name:"Greedy", icon:"🤑", desc:"Money thrills; poverty stings double."},
  {id:"honest", name:"Honest", icon:"⚖️", desc:"+karma. Crime feels awful, fails often."},
  {id:"lazy", name:"Lazy", icon:"🦥", desc:"-fitness/discipline growth. Naps are a lifestyle."},
  {id:"lustful", name:"Lustful", icon:"🔥", desc:"Romance succeeds more. Temptation events."},
  {id:"paranoid", name:"Paranoid", icon:"👁️", desc:"Harder to mug/scam. Trusts slowly."},
  {id:"patient", name:"Patient", icon:"🐢", desc:"+grades growth, -stress. Plays the long game."},
  {id:"stubborn", name:"Stubborn", icon:"🐂", desc:"Resists persuasion. Never quits a marathon."},
  {id:"wrathful", name:"Wrathful", icon:"😡", desc:"Wins fights. Loses friends. Stress spikes."},
  {id:"genius", name:"Genius", icon:"🧠", desc:"CONGENITAL. +smarts, learns twice as fast.", congenital:true},
  {id:"beautiful", name:"Beautiful", icon:"✨", desc:"CONGENITAL. +looks, doors open.", congenital:true},
  {id:"robust", name:"Robust", icon:"💪", desc:"CONGENITAL. +health & fitness, shrugs off illness.", congenital:true},
  {id:"nemesis", name:"Marked Rival", icon:"👁️", desc:"A rival shadows your cradle. Sabotage — and triumph."},
  {id:"trustfund", name:"Trust Fund Baby", icon:"💰", desc:"+$2,000 every year. Discipline drifts."},
  {id:"frail", name:"Frail", icon:"🤒", desc:"CONGENITAL. A weak constitution; doctors know your name.", congenital:true},
  {id:"titan", name:"Titan", icon:"♾️", desc:"CONGENITAL. Boundless body: stats refuse to fall.", congenital:true}
],

/* ---- extended in-sim focuses: era + background generated.
      tick = yearly stat deltas; tag = legacy lifestyle gate it counts as; eras: ancient/medieval/earlymodern/industrial/modern/digital; bg = background ids or null ---- */
FOCUS_X: [
  {id:"healer", icon:"🌿", name:"Healing", desc:"+health & karma every year.", tick:{health:1,karma:1}, tag:null, eras:["ancient","medieval","earlymodern","industrial","modern","digital"], bg:null},
  {id:"devotion", icon:"🕯️", name:"Devotion", desc:"+karma & discipline every year.", tick:{karma:1,discipline:1}, tag:null, eras:["ancient","medieval","earlymodern","industrial","modern","digital"], bg:["ashen"]},
  {id:"kinship", icon:"🏡", name:"Kinship", desc:"+happiness & social every year.", tick:{happiness:1,social:1}, tag:null, eras:["ancient","medieval","earlymodern","industrial","modern","digital"], bg:["comfortable"]},
  {id:"craft", icon:"⚒️", name:"Craftsmanship", desc:"+creativity & discipline every year.", tick:{creativity:1,discipline:1}, tag:null, eras:["ancient","medieval","earlymodern","industrial","modern","digital"], bg:["humble"]},
  {id:"trade", icon:"🧭", name:"Trade", desc:"+social & discipline every year.", tick:{social:1,discipline:1}, tag:null, eras:["ancient","medieval","earlymodern","industrial","modern","digital"], bg:["gilded"]},
  {id:"agriculture", icon:"🌾", name:"Agriculture", desc:"+health & fitness every year.", tick:{health:1,fitness:1}, tag:null, eras:["ancient","medieval","earlymodern","industrial"], bg:["humble"]},
  {id:"survival", icon:"🏕️", name:"Survival", desc:"+health & fitness every year.", tick:{health:1,fitness:1}, tag:null, eras:["ancient","medieval"], bg:["humble","ashen"]},
  {id:"philosophy", icon:"🏛️", name:"Philosophy", desc:"+smarts & discipline every year.", tick:{smarts:2,discipline:1}, tag:"scholar", eras:["ancient","medieval","earlymodern"], bg:null},
  {id:"theology", icon:"⛪", name:"Theology", desc:"+karma & smarts every year.", tick:{karma:1,smarts:1}, tag:"scholar", eras:["ancient","medieval","earlymodern"], bg:["ashen","comfortable"]},
  {id:"warfare", icon:"⚔️", name:"Warfare", desc:"+fitness & discipline every year.", tick:{fitness:2,discipline:1}, tag:"athlete", eras:["ancient","medieval","earlymodern","industrial"], bg:null},
  {id:"chivalry", icon:"🛡️", name:"Chivalry", desc:"+discipline & social every year.", tick:{discipline:1,social:1}, tag:null, eras:["medieval"], bg:["gilded"]},
  {id:"scriptorium", icon:"📜", name:"Scriptorium", desc:"+smarts every year.", tick:{smarts:2}, tag:"scholar", eras:["medieval","earlymodern"], bg:["comfortable"]},
  {id:"alchemy", icon:"⚗️", name:"Alchemy", desc:"+smarts & creativity every year.", tick:{smarts:1,creativity:1}, tag:null, eras:["ancient","medieval","earlymodern"], bg:null},
  {id:"minstrelsy", icon:"🎻", name:"Minstrelsy", desc:"+creativity & social every year.", tick:{creativity:1,social:1}, tag:"artist", eras:["medieval","earlymodern"], bg:null},
  {id:"seafaring", icon:"⛵", name:"Seafaring", desc:"+fitness & social every year.", tick:{fitness:1,social:1}, tag:null, eras:["medieval","earlymodern","industrial"], bg:null},
  {id:"dueling", icon:"🤺", name:"Dueling", desc:"+fitness & discipline every year.", tick:{fitness:1,discipline:1}, tag:"athlete", eras:["earlymodern"], bg:["gilded"]},
  {id:"patronage", icon:"🎨", name:"Patronage", desc:"+social & creativity every year.", tick:{social:1,creativity:1}, tag:"socialite", eras:["earlymodern","industrial"], bg:["gilded"]},
  {id:"espionage", icon:"🕵️", name:"Espionage", desc:"+discipline & social every year.", tick:{discipline:1,social:1}, tag:null, eras:["earlymodern","industrial","modern","digital"], bg:null},
  {id:"naturalism", icon:"🔬", name:"Naturalism", desc:"+smarts & health every year.", tick:{smarts:1,health:1}, tag:"scholar", eras:["earlymodern","industrial"], bg:null},
  {id:"industry", icon:"🏭", name:"Industry", desc:"+discipline & smarts every year.", tick:{discipline:1,smarts:1}, tag:"mogul", eras:["industrial","modern"], bg:["gilded","comfortable"]},
  {id:"invention", icon:"💡", name:"Invention", desc:"+smarts & creativity every year.", tick:{smarts:1,creativity:1}, tag:null, eras:["industrial","modern","digital"], bg:null},
  {id:"journalism", icon:"📰", name:"Journalism", desc:"+social & smarts every year.", tick:{social:1,smarts:1}, tag:null, eras:["industrial","modern","digital"], bg:null},
  {id:"stewardship", icon:"📊", name:"Stewardship", desc:"+discipline every year, faster raises.", tick:{discipline:2}, tag:"mogul", eras:["medieval","earlymodern","industrial","modern","digital"], bg:["gilded","comfortable"]},
  {id:"cinema", icon:"🎬", name:"Cinema", desc:"+creativity & social every year.", tick:{creativity:1,social:1}, tag:"artist", eras:["modern","digital"], bg:null},
  {id:"computing", icon:"💻", name:"Computing", desc:"+smarts every year.", tick:{smarts:2}, tag:"scholar", eras:["modern","digital"], bg:null},
  {id:"rockstar", icon:"🎸", name:"Rock Stardom", desc:"+creativity & fame-tinted social every year.", tick:{creativity:1,social:1}, tag:"artist", eras:["modern","digital"], bg:null},
  {id:"activism", icon:"✊", name:"Activism", desc:"+karma & social every year.", tick:{karma:1,social:1}, tag:null, eras:["industrial","modern","digital"], bg:["ashen"]},
  {id:"bodybuilding", icon:"💪", name:"Bodybuilding", desc:"+fitness & health every year.", tick:{fitness:2,health:1}, tag:"athlete", eras:["modern","digital"], bg:null},
  {id:"streaming", icon:"📡", name:"Streaming", desc:"+social & creativity every year.", tick:{social:1,creativity:1}, tag:null, eras:["digital"], bg:null},
  {id:"airesearch", icon:"🤖", name:"AI Research", desc:"+smarts & discipline every year.", tick:{smarts:2,discipline:1}, tag:"scholar", eras:["digital"], bg:["comfortable"]},
  {id:"occult", icon:"🔮", name:"Occult", desc:"+creativity & karma every year.", tick:{creativity:1,karma:1}, tag:null, eras:["ancient","medieval","earlymodern","modern"], bg:["ashen"]}
],

/* ---- lifestyle focuses: one at a time, yearly ticks + special action ---- */
lifestyles: [
  {id:"none", name:"No focus", icon:"🌿", desc:"A drifting life.", tick:{}},
  {id:"scholar", name:"Scholarship", icon:"📖", desc:"+smarts & grades every year.", tick:{smarts:2}},
  {id:"athlete", name:"Athletics", icon:"🏋️", desc:"+fitness & health every year.", tick:{fitness:2,health:1}},
  {id:"socialite", name:"Socialite", icon:"🎭", desc:"+social & happiness every year.", tick:{social:2,happiness:1}},
  {id:"mogul", name:"Mogul", icon:"💼", desc:"+discipline, faster raises.", tick:{discipline:2}},
  {id:"artist", name:"Artist", icon:"🎨", desc:"+creativity & happiness every year.", tick:{creativity:2,happiness:1}},
  {id:"ascetic", name:"Ascetic", icon:"🕯️", desc:"-stress, +karma & health every year.", tick:{karma:1,health:1}}
],

/* ---- college majors gate high jobs ---- */
majors: [
  {id:"General", name:"General Studies", desc:"No specialization."},
  {id:"Business", name:"Business", desc:"Exec, CEO, realtor fast-track."},
  {id:"STEM", name:"STEM", desc:"Engineer, scientist, doctor."},
  {id:"Medicine", name:"Medicine", desc:"Doctor, nurse track."},
  {id:"Nursing", name:"Nursing", desc:"Nurse fast-track."},
  {id:"Law", name:"Law", desc:"Lawyer, judge track."},
  {id:"Engineering", name:"Engineering", desc:"Engineer, pilot, mechanic."},
  {id:"Computer Science", name:"Computer Science", desc:"Developer track."},
  {id:"Arts", name:"Arts", desc:"Actor, director, designer."},
  {id:"Music", name:"Music", desc:"Musician track."},
  {id:"Education", name:"Education", desc:"Teacher, professor track."},
  {id:"Psychology", name:"Psychology", desc:"People skills, management."},
  {id:"Architecture", name:"Architecture", desc:"Architect track."}
],

/* ---- life decisions: big moves with costs & cooldowns ---- */
decisions: [
  {id:"dec-feast", name:"Hold a Feast", icon:"🍖", cost:800, desc:"+happiness, +friends, -stress, +prestige"},
  {id:"dec-hunt", name:"Go Hunting", icon:"🏹", cost:300, desc:"+fitness thrill, small injury risk, +prestige"},
  {id:"dec-pilgrimage", name:"Pilgrimage", icon:"🕯️", cost:1200, desc:"+karma, -stress, clarity"},
  {id:"dec-tournament", name:"Host Tournament", icon:"⚔️", cost:2000, desc:"Fitness contest. +prestige & fame if you win"},
  {id:"dec-gala", name:"Charity Gala", icon:"💎", cost:5000, desc:"+karma, +prestige, +fame"},
  {id:"dec-office", name:"Run for Office", icon:"🏛️", cost:10000, desc:"Social check → Mayor/Senator, huge prestige"},
  {id:"dec-startup", name:"Found Startup", icon:"🚀", cost:15000, desc:"Gamble: business asset paying yearly"},
  {id:"dec-writebook", name:"Write a Book", icon:"📖", cost:0, desc:"Creativity check → royalties + prestige"}
],

/* ---- family backgrounds: lineage shapes money, prestige, crime, and story ---- */
backgrounds: [
  {id:"humble", name:"Humble Hearth", icon:"🌱", desc:"Nothing inherited but a name and working hands.", money:100, prestige:5, stats:{discipline:2}},
  {id:"comfortable", name:"Comfortable Household", icon:"🏡", desc:"Warm meals, schooling, no debts.", money:800, prestige:15, stats:{smarts:2}},
  {id:"gilded", name:"Gilded Circle", icon:"💎", desc:"Doors open before you knock.", money:3000, prestige:70, stats:{social:4}},
  {id:"ashen", name:"Ashen Past", icon:"🌫️", desc:"Loss and hardship raised you.", money:0, prestige:10, stats:{discipline:4,karma:4}},
  {id:"custom", name:"Custom Past", icon:"✍️", desc:"Written by you, weighed by fate.", money:0, prestige:0}
],

/* ---- childhoods: where you come from shapes what you become ---- */
childhoods: [
  {id:"none", name:"Unremarkable", icon:"🌿", desc:"A perfectly average childhood."},
  {id:"street", name:"Street Rat", icon:"🛹", desc:"+fitness, +street-smarts · crime risk lower · school never stood a chance.", stats:{fitness:6,social:4,smarts:-3}, flag:"streetwise"},
  {id:"bookworm", name:"Bookworm", icon:"📚", desc:"+8 smarts, +10 grades · -social · raised by libraries.", stats:{smarts:8,social:-4}, grades:10},
  {id:"altar", name:"Altar Kid", icon:"⛪", desc:"+12 karma, +discipline · choir, candles, conscience.", stats:{karma:12,discipline:6}},
  {id:"stage", name:"Stage Kid", icon:"🎭", desc:"+creativity, +social · applause is oxygen.", stats:{creativity:8,social:5,looks:2}},
  {id:"farm", name:"Farmhand", icon:"🚜", desc:"+health, +fitness, +discipline · chores before dawn.", stats:{health:8,fitness:6,discipline:4}},
  {id:"army", name:"Army Brat", icon:"🎖️", desc:"+fitness, +discipline · new school every year · steel nerves, restless sleep.", stats:{fitness:8,discipline:8}, stress:5}
],

/* ---- life ambitions: fulfill them for a legendary payoff ---- */
ambitions: [
  {id:"none", name:"Drift (no ambition)", icon:"🌿", desc:"Want nothing. Risk nothing."},
  {id:"wealth", name:"Amass a Fortune", icon:"💰", desc:"Reach $500,000 net worth. Reward: +100 prestige, eternal comfort."},
  {id:"fame", name:"Become Famous", icon:"⭐", desc:"Reach 80 fame. Reward: +100 prestige, immortality of a sort."},
  {id:"family", name:"Found a Great Family", icon:"🏡", desc:"Marry + raise 3 children. Reward: +100 prestige, a full table."},
  {id:"power", name:"Seize Power", icon:"👑", desc:"Reach 300 prestige or win high office. Reward: +100 prestige, a name in marble."},
  {id:"knowledge", name:"Master Knowledge", icon:"🎓", desc:"Graduate degree + 85 smarts. Reward: +100 prestige, a mind like a cathedral."},
  {id:"virtue", name:"Live a Saintly Life", icon:"😇", desc:"Reach 90 karma. Reward: +100 prestige, bells ringing somewhere."}
 ],
 
/* ---- real-world history anchor: major global events for the timeline-vs-history engine.
      y=year, t=title, d=what happened, g=domains (war politics tech economy science culture), w=inertia 1-10 (how hard to divert) ---- */
history: [
  {y:1903, t:"First powered flight", d:"Wright brothers fly at Kitty Hawk.", g:"tech science", w:4},
  {y:1914, t:"World War I begins", d:"Europe plunges into total war.", g:"war politics", w:9},
  {y:1917, t:"Russian Revolution", d:"Empire falls, USSR rises.", g:"politics war", w:7},
  {y:1918, t:"Flu pandemic", d:"Spanish flu kills millions worldwide.", g:"science culture", w:6},
  {y:1929, t:"Great Depression", d:"Wall Street crashes, decade of hardship.", g:"economy politics", w:8},
  {y:1939, t:"World War II begins", d:"The largest conflict in history.", g:"war politics", w:10},
  {y:1945, t:"Atomic age + UN founded", d:"Hiroshima, then nations vow 'never again'.", g:"war science politics", w:9},
  {y:1950, t:"Korean War", d:"Cold War turns hot in Korea.", g:"war politics", w:6},
  {y:1953, t:"DNA double helix", d:"Structure of DNA decoded.", g:"science", w:5},
  {y:1957, t:"Sputnik", d:"First satellite — space race begins.", g:"tech science politics", w:6},
  {y:1961, t:"Human in space", d:"Gagarin orbits Earth.", g:"science tech politics", w:6},
  {y:1962, t:"Cuban missile crisis", d:"World holds its breath for 13 days.", g:"war politics", w:8},
  {y:1963, t:"'I Have a Dream'", d:"March on Washington reshapes rights.", g:"politics culture", w:5},
  {y:1969, t:"Moon landing", d:"Apollo 11 — one small step.", g:"science tech politics", w:8},
  {y:1971, t:"Microprocessor", d:"Intel 4004 — computers shrink to chips.", g:"tech", w:5},
  {y:1973, t:"Oil crisis", d:"Embargo quadruples prices, stagflation.", g:"economy politics", w:6},
  {y:1975, t:"Vietnam War ends", d:"Saigon falls, America divided.", g:"war politics", w:6},
  {y:1976, t:"Apple founded", d:"Two Steves start in a garage.", g:"tech economy", w:4},
  {y:1979, t:"Iranian Revolution", d:"Shah falls, region reshaped.", g:"politics war", w:6},
  {y:1980, t:"Smallpox eradicated", d:"Humanity kills a disease.", g:"science", w:5},
  {y:1981, t:"IBM PC", d:"Personal computers go mainstream.", g:"tech", w:4},
  {y:1985, t:"Live Aid", d:"Global concert for famine relief.", g:"culture", w:3},
  {y:1986, t:"Chernobyl", d:"Reactor explodes, nuclear trust shaken.", g:"science politics", w:6},
  {y:1989, t:"Berlin Wall falls", d:"Cold War symbol crumbles.", g:"politics", w:8},
  {y:1989, t:"World Wide Web invented", d:"Berners-Lee links the world.", g:"tech science", w:7},
  {y:1991, t:"USSR dissolves", d:"Superpower splits into fifteen states.", g:"politics war", w:8},
  {y:1994, t:"Mandela president", d:"Apartheid ends in South Africa.", g:"politics", w:6},
  {y:1995, t:"Internet boom", d:"Windows 95, dot-com gold rush.", g:"tech economy", w:4},
  {y:1997, t:"Dolly the sheep cloned", d:"First mammal cloned.", g:"science", w:5},
  {y:1998, t:"Google founded", d:"A search box eats the world.", g:"tech economy", w:5},
  {y:2000, t:"Y2K", d:"The bug that fizzled — planes stay up.", g:"tech", w:3},
  {y:2001, t:"9/11 attacks", d:"Terror reshapes the century.", g:"war politics culture", w:9},
  {y:2003, t:"Human genome finished", d:"3 billion letters read.", g:"science", w:5},
  {y:2003, t:"Iraq War", d:"Invasion topples Saddam, long fallout.", g:"war politics", w:7},
  {y:2004, t:"Facebook launches", d:"Social networks go global.", g:"tech culture", w:4},
  {y:2007, t:"iPhone", d:"The smartphone era begins.", g:"tech economy culture", w:7},
  {y:2008, t:"Financial crisis", d:"Lehman falls, Great Recession.", g:"economy politics", w:8},
  {y:2009, t:"Bitcoin created", d:"Genesis block — money goes digital.", g:"tech economy", w:5},
  {y:2010, t:"Arab Spring", d:"Uprisings sweep the Middle East.", g:"politics war", w:6},
  {y:2012, t:"Higgs boson found", d:"'God particle' confirmed.", g:"science", w:5},
  {y:2014, t:"Crimea annexed", d:"Borders redrawn by force.", g:"war politics", w:6},
  {y:2015, t:"Paris climate deal", d:"196 nations pledge on warming.", g:"politics science", w:5},
  {y:2016, t:"Populist shockwave", d:"Brexit + surprise US election.", g:"politics economy", w:6},
  {y:2017, t:"#MeToo", d:"Reckoning spreads across industries.", g:"culture politics", w:4},
  {y:2019, t:"Black hole imaged", d:"First photo of the unseeable.", g:"science", w:4},
  {y:2020, t:"COVID pandemic", d:"World locks down, millions lost.", g:"science economy politics culture", w:9},
  {y:2021, t:"Vaccines + Webb launch", d:"Science fights back, telescope flies.", g:"science politics", w:6},
  {y:2022, t:"Ukraine war", d:"Full-scale invasion, energy shock.", g:"war politics economy", w:8},
  {y:2023, t:"AI boom", d:"Generative AI goes mainstream.", g:"tech economy science", w:7},
  {y:2024, t:"AI regulation wave", d:"Governments race to govern algorithms.", g:"politics tech", w:5}
],

/* ---- era-accurate geography: MODERN_FROM gives first-valid-year per modern country
      (default 1800; values may be a year or [[from,to],...] ranges; all years CE).
      HIST_GEO lists historical states with date ranges + curated regions/cities.
      MODERN_REGIONS curates regions for select modern states. Everywhere else:
      region + city stay free text. Approximate where history is fuzzy. ---- */
MODERN_FROM: {"United States":1776,"Haiti":1804,"Venezuela":1811,"Paraguay":1811,"Chile":1818,"Colombia":1819,"Mexico":1821,"Peru":1821,"Brazil":1822,"Greece":1830,"Belgium":1830,"Ecuador":1830,"Luxembourg":1839,"Dominican Republic":1844,"Liberia":1847,"Canada":1867,"Italy":1861,"Germany":1871,"Romania":1878,"Serbia":[[1878,1918],[2006,9999]],"Montenegro":[[1878,1918],[2006,9999]],"Bulgaria":1908,"Norway":1905,"Finland":1917,"Ireland":1922,"Egypt":1922,"Turkey":1923,"Vatican City":1929,"Iraq":1932,"Saudi Arabia":1932,"Philippines":1946,"Jordan":1946,"Syria":1946,"India":1947,"Pakistan":1947,"Myanmar":1948,"Sri Lanka":1948,"Israel":1948,"North Korea":1948,"South Korea":1948,"Indonesia":1949,"Taiwan":1949,"Libya":1951,"Laos":1953,"Cambodia":1953,"Morocco":1956,"Tunisia":1956,"Sudan":1956,"Ghana":1957,"Malaysia":1957,"Guinea":1958,"Nigeria":1960,"Cameroon":1960,"Togo":1960,"Madagascar":1960,"Congo (DRC)":1960,"Somalia":1960,"Benin":1960,"Niger":1960,"Burkina Faso":1960,"Ivory Coast":1960,"Chad":1960,"Central African Republic":1960,"Congo (Republic of the)":1960,"Gabon":1960,"Senegal":1960,"Mali":1960,"Mauritania":1960,"Cyprus":1960,"Sierra Leone":1961,"Kuwait":1961,"Tanzania":1961,"Algeria":1962,"Uganda":1962,"Rwanda":1962,"Burundi":1962,"Jamaica":1962,"Trinidad and Tobago":1962,"Kenya":1963,"Malawi":1964,"Malta":1964,"Zambia":1964,"Gambia":1965,"Maldives":1965,"Singapore":1965,"Cook Islands":1965,"Guyana":1966,"Botswana":1966,"Lesotho":1966,"Barbados":1966,"Equatorial Guinea":1968,"Nauru":1968,"Mauritius":1968,"Eswatini":1968,"Fiji":1970,"Tonga":1970,"Bangladesh":1971,"Bahamas":1973,"Niue":1974,"Grenada":1974,"Guinea-Bissau":1974,"Mozambique":1975,"Angola":1975,"Papua New Guinea":1975,"Comoros":1975,"Cape Verde":1975,"São Tomé and Príncipe":1975,"Suriname":1975,"Seychelles":1976,"Vietnam":1976,"Djibouti":1977,"Solomon Islands":1978,"Tuvalu":1978,"Dominica":1978,"Saint Lucia":1979,"Kiribati":1979,"Saint Vincent and the Grenadines":1979,"Zimbabwe":1980,"Vanuatu":1980,"Antigua and Barbuda":1981,"Belize":1981,"Saint Kitts and Nevis":1983,"Brunei":1984,"Marshall Islands":1986,"Micronesia":1986,"Palestine":1988,"Namibia":1990,"Yemen":1990,"Estonia":[[1918,1940],[1991,9999]],"Latvia":[[1918,1940],[1991,9999]],"Lithuania":[[1918,1940],[1991,9999]],"Russia":1991,"Ukraine":1991,"Belarus":1991,"Moldova":1991,"Georgia":1991,"Armenia":1991,"Azerbaijan":1991,"Kazakhstan":1991,"Uzbekistan":1991,"Turkmenistan":1991,"Kyrgyzstan":1991,"Tajikistan":1991,"Eritrea":1991,"Slovenia":1991,"Croatia":1991,"North Macedonia":1991,"Bosnia and Herzegovina":1992,"Czechia":1993,"Slovakia":1993,"Palau":1994,"Timor-Leste":2002,"Kosovo":2008,"South Sudan":2011,"South Africa":1910,"Afghanistan":1919,"Albania":1912,"Andorra":1278,"Argentina":1816,"Australia":1901,"Austria":1918,"Bahrain":1971,"Bhutan":1907,"Bolivia":1825,"China":1368,"Costa Rica":1838,"Cuba":1902,"Denmark":1800,"El Salvador":1841,"Ethiopia":1270,"France":843,"Guatemala":1839,"Honduras":1838,"Hungary":1918,"Iceland":1918,"Iran":1935,"Japan":1603,"Lebanon":1943,"Liechtenstein":1806,"Monaco":1297,"Mongolia":1921,"Nepal":1768,"Netherlands":1581,"New Zealand":1907,"Nicaragua":1838,"Northern Cyprus":1983,"Oman":1744,"Panama":1903,"Poland":1918,"Portugal":1139,"Qatar":1971,"Samoa":1962,"San Marino":301,"Somaliland":1991,"South Ossetia":1991,"Spain":1479,"Sweden":1523,"Switzerland":1848,"Thailand":1939,"Transnistria":1990,"United Arab Emirates":1971,"United Kingdom":1801,"Uruguay":1828,"Western Sahara":1976,"Abkhazia":1991},

HIST_GEO: [
 {id:"prussia", name:"Prussia", from:"1701-01-18", to:"1947-02-25", regions:{
   "Brandenburg":["Berlin","Potsdam"],"East Prussia":["Königsberg","Tilsit"],"Silesia":["Breslau","Liegnitz"],"Rhineland":["Cologne","Düsseldorf"],"Westphalia":["Münster","Dortmund"],"Pomerania":["Stettin","Danzig"]}},
 {id:"ottoman", name:"Ottoman Empire", from:"1299-01-01", to:"1922-11-01", regions:{
   "Anatolia":["Constantinople","Ankara","Smyrna"],"Rumelia":["Salonika","Adrianople"],"Levant":["Damascus","Beirut","Jerusalem"],"Hejaz":["Mecca","Medina"],"Mesopotamia":["Baghdad","Basra"],"Egypt (to 1914)":["Cairo","Alexandria"]}},
 {id:"russian-empire", name:"Russian Empire", from:"1721-01-01", to:"1917-03-15", regions:{
   "Muscovy":["Moscow"],"Saint Petersburg":["Saint Petersburg"],"Congress Poland (1815–1917)":["Warsaw","Lodz"],"Caucasus":["Tiflis","Baku"],"Siberia":["Omsk","Irkutsk"],"Little Russia":["Kiev","Odessa"]}},
 {id:"raj", name:"British Raj", from:"1858-08-02", to:"1947-08-14", regions:{
   "Bengal Presidency":["Calcutta","Dacca","Murshidabad"],"Bombay Presidency":["Bombay","Poona","Karachi","Ahmedabad"],"Madras Presidency":["Madras","Trichinopoly"],"Punjab":["Lahore","Amritsar","Rawalpindi"],"United Provinces":["Lucknow","Agra","Benares","Cawnpore"],"Central Provinces":["Nagpur","Jubbulpore"],"Burma (to 1937)":["Rangoon","Mandalay"],"Assam":["Shillong","Gauhati"],"North-West Frontier":["Peshawar","Kohat"],"Baluchistan":["Quetta","Kalat"],"Mysore State":["Mysore","Bangalore"],"Hyderabad State":["Hyderabad","Aurangabad"],"Princely State of Jammu and Kashmir":["Srinagar","Jammu","Muzaffarabad","Gilgit"],"Baroda State":["Baroda"],"Rajputana":["Jaipur","Udaipur","Jodhpur"],"Central India":["Gwalior","Indore"],"Punjab States":["Patiala"]}},
 {id:"yugoslavia", name:"Yugoslavia", from:"1918-12-01", to:"1992-04-27", regions:{
   "Serbia":["Belgrade","Nis"],"Croatia":["Zagreb","Split"],"Slovenia":["Ljubljana","Maribor"],"Bosnia and Herzegovina":["Sarajevo","Mostar"],"Macedonia":["Skopje","Bitola"],"Montenegro":["Titograd","Cetinje"]}},
 {id:"czechoslovakia", name:"Czechoslovakia", from:"1918-10-28", to:"1993-01-01", regions:{
   "Bohemia":["Prague","Plzen"],"Moravia":["Brno","Ostrava"],"Slovakia":["Bratislava","Kosice"],"Ruthenia (to 1945)":["Uzhhorod"]}},
 {id:"ussr", name:"Soviet Union (USSR)", from:"1922-12-30", to:"1991-12-26", regions:{
   "Russian SFSR":["Moscow","Leningrad"],"Ukrainian SSR":["Kiev","Kharkov"],"Byelorussian SSR":["Minsk"],"Uzbek SSR":["Tashkent"],"Kazakh SSR":["Alma-Ata"],"Georgian SSR":["Tbilisi"],"Azerbaijan SSR":["Baku"],"Lithuanian SSR":["Vilnius"],"Moldavian SSR":["Kishinev"],"Latvian SSR":["Riga"],"Kirghiz SSR":["Frunze"],"Tajik SSR":["Dushanbe"],"Armenian SSR":["Yerevan"],"Turkmen SSR":["Ashkhabad"],"Estonian SSR":["Tallinn"]}},
 {id:"austriahungary", name:"Austria-Hungary", from:"1867-06-08", to:"1918-11-11", regions:{
   "Austrian Crown Lands":["Vienna","Prague","Graz"],"Hungarian Crown Lands":["Budapest","Zagreb","Klausenburg"],"Galicia":["Lemberg","Krakow"],"Dalmatia":["Ragusa","Spalato"]}},
 {id:"persia", name:"Persia", from:"1501-01-01", to:"1935-03-21", regions:{
   "Iraq-e Ajam":["Tehran","Isfahan"],"Azerbaijan":["Tabriz"],"Khorasan":["Mashhad"],"Fars":["Shiraz"]}},
 {id:"siam", name:"Siam", from:"1350-01-01", to:"1939-06-23", regions:{
   "Central Siam":["Bangkok","Ayutthaya"],"Northern Principalities":["Chiang Mai"],"Isan":["Korat"],"Southern Peninsula":["Songkhla"]}},
 {id:"joseon", name:"Joseon (Korea)", from:"1392-08-05", to:"1910-08-29", regions:{
   "Gyeonggi":["Hanseong","Incheon"],"Gyeongsang":["Dongnae","Daegu"],"Pyongan":["Pyongyang"],"Jeolla":["Jeonju"]}},
 {id:"kashmir", name:"Kashmir (Disputed)", from:"1947-10-26", to:null, regions:{
   "Azad Kashmir (POK)":["Muzaffarabad","Mirpur"],"Jammu & Kashmir":["Srinagar","Jammu"],"Gilgit-Baltistan":["Gilgit","Skardu"],"Aksai Chin":[]}}
],

MODERN_REGIONS: {
 "India": {"West Bengal":["Kolkata","Howrah"],"Punjab":["Amritsar","Ludhiana","Jalandhar"],"Maharashtra":["Mumbai","Pune","Nagpur"],"Tamil Nadu":["Chennai","Coimbatore"],"Uttar Pradesh":["Lucknow","Kanpur","Agra"],"Bihar":["Patna","Gaya"],"Gujarat":["Ahmedabad","Surat"],"Rajasthan":["Jaipur","Udaipur"],"Madhya Pradesh":["Bhopal","Indore"],"Karnataka":["Bengaluru","Mysuru"],"Kerala":["Kochi","Thiruvananthapuram"],"Andhra Pradesh":["Hyderabad","Visakhapatnam"],"Assam":["Guwahati","Dibrugarh"],"Odisha":["Bhubaneswar","Cuttack"],"Delhi (NCT)":["New Delhi","Delhi"]},
 "Pakistan": {"Punjab":["Lahore","Rawalpindi","Faisalabad"],"Sindh":["Karachi","Hyderabad","Sukkur"],"North-West Frontier Province (to 2010)":["Peshawar","Kohat"],"Khyber Pakhtunkhwa (from 2010)":["Peshawar","Mardan"],"Balochistan":["Quetta","Turbat"],"East Bengal (1947–1971)":["Dacca","Chittagong"],"Azad Kashmir":["Muzaffarabad","Mirpur"],"Gilgit-Baltistan (from 1970)":["Gilgit","Skardu"],"Islamabad Capital (from 1960)":["Islamabad"]},
 "Bangladesh": {"Dhaka Division":["Dhaka","Gazipur"],"Chittagong Division":["Chittagong","Cox's Bazar"],"Rajshahi Division":["Rajshahi","Bogra"],"Khulna Division":["Khulna","Jessore"],"Sylhet Division":["Sylhet"],"Barisal Division":["Barisal"]},
 "United States": {"California":[],"Texas":[],"New York":[],"Florida":[],"Illinois":[],"Pennsylvania":[],"Ohio":[],"Georgia":[],"North Carolina":[],"Michigan":[]},
 "United Kingdom": {"England":["London","Manchester","Birmingham"],"Scotland":["Edinburgh","Glasgow"],"Wales":["Cardiff"],"Northern Ireland":["Belfast"]},
 "Russia": {"Moscow":["Moscow"],"Saint Petersburg":["Saint Petersburg"],"Siberia":["Novosibirsk","Omsk"],"Volga":["Kazan","Samara"],"Urals":["Yekaterinburg"]},
 "China": {"Beijing":["Beijing"],"Shanghai":["Shanghai"],"Guangdong":["Guangzhou","Shenzhen"],"Sichuan":["Chengdu"],"Shaanxi":["Xi'an"]},
 "Brazil": {"São Paulo":["São Paulo"],"Rio de Janeiro":["Rio de Janeiro"],"Bahia":["Salvador"],"Minas Gerais":["Belo Horizonte"]},
 "France": {"Île-de-France":["Paris"],"Provence":["Marseille"],"Brittany":["Rennes"],"Alsace":["Strasbourg"]},
 "Germany": {"Bavaria":["Munich"],"Berlin":["Berlin"],"Hamburg":["Hamburg"],"Saxony":["Dresden"]},
 "Japan": {"Tokyo":["Tokyo"],"Osaka":["Osaka"],"Kyoto":["Kyoto"],"Hokkaido":["Sapporo"]},
 "Canada": {"Ontario":["Toronto","Ottawa"],"Quebec":["Montreal","Quebec City"],"British Columbia":["Vancouver"]},
 "Australia": {"New South Wales":["Sydney"],"Victoria":["Melbourne"],"Queensland":["Brisbane"]},
 "Italy": {"Lazio":["Rome"],"Lombardy":["Milan"],"Campania":["Naples"],"Sicily":["Palermo"]},
 "Spain": {"Madrid":["Madrid"],"Catalonia":["Barcelona"],"Andalusia":["Seville"]}
}

};
