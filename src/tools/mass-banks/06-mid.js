/* MASS BANK 06 — midlife, exclusive 45-59. ~850 events. */
bank({ prefix: "zxmd", min: 45, max: 59, deftags: ["adult-life", "family"], families: [
{ slug: "teendrive", n: 70, tags: ["adult-life", "family"], t: "Teaching {KID2} to drive",
  x: "{TX4} In the {CAR}, down {ROAD}, your knuckles whiten on the door handle.",
  slots: { CAR: ["old sedan", "borrowed SUV", "driving school hatchback", "grandpa's truck", "the minivan", "a compact"], ROAD: ["Maple Street", "the empty mall lot", "the country loop", "the cul-de-sac", "Route 9"], KID2: ["your teen", "your youngest", "your sixteen-year-old"], TX4: ["Empty lot, Sunday dawn.", "The instructor costs $80 an hour.", "Breathe. They are doing fine. Probably."] },
  choices: [
    { l: "Stay calm", h: "family+", fx: [["stat", "happiness", "5"], ["money", "-(120)"]], out: "{KID2} parks it clean. Pride beats panic." },
    { l: "Hire the pro", h: "money+", fx: [["money", "-(400)"], ["stat", "stress", "-6"]], out: "A professional absorbs the terror. {KID2} passes first try." }
  ] },
{ slug: "tuition", n: 70, tags: ["adult-life", "money"], t: "{COL} {BILL}",
  x: "{CX6} The FAFSA forms breed overnight. {AID} covers the books.",
  slots: { AID: ["A small grant", "Grandma's bonds", "A work-study slot", "The 529 plan", "A summer job fund"], COL: ["Tuition bills", "Dorm deposits", "Textbook season"], BILL: ["arrive", "double", "stagger"], CX6: ["The numbers have many zeros.", "Scholarship essays: a family project."] },
  choices: [
    { l: "Pay and plan", h: "money+", fx: [["money", "-(5000)"], ["set", "assets.savings", "max(0,s.assets.savings-3000)"]], out: "{COL} handled. Education: the priciest gift." },
    { l: "Scholarship blitz", h: "smarts+", fx: [["chance", "0.5", [["money", "3000"]], [["money", "-(1000)"]]]], out: "Essays by the dozen. {COL} shrink a little." }
  ] },
{ slug: "parents", n: 80, tags: ["adult-life", "family"], t: "{MOMDAD} {NEED}",
  x: "{PX3} The roles reverse gently, then all at once. {ACT2}",
  slots: { ACT2: ["Sunday dinners stretch longer.", "The medicine organizer fills weekly.", "A stair lift gets priced out.", "The will gets updated calmly."], MOMDAD: ["Mom", "Dad", "Both parents"], NEED: ["need the stairs talk", "forget the stove twice", "ask about wills", "need a ride to everything", "move closer"], PX3: ["The phone calls get longer.", "You notice the small slips.", "Love becomes logistics."] },
  choices: [
    { l: "Step up", h: "karma+", fx: [["stat", "karma", "7"], ["stat", "happiness", "3"]], out: "{MOMDAD} lean on you now. {NEED} — handled with grace." },
    { l: "Organize care", h: "money+", fx: [["money", "-(2000)"], ["stat", "stress", "-5"]], out: "Aides, schedules, check-ins. {MOMDAD} stay safe and proud." }
  ] },
{ slug: "summit", n: 70, tags: ["adult-life", "money"], pre: { job: "employed" }, t: "{SM} {SY}",
  x: "{SX6} {RV2} from the rival firm attends too.",
  slots: { SM: ["Industry summit", "Leadership offsite", "Keynote slot"], SY: ["season", "invitation", "gauntlet"], SX6: ["Badges, buffets, big talk.", "Your talk gets the big room."], RV2: "SURNAMES" },
  choices: [
    { l: "Own the stage", h: "prestige+", fx: [["prestige", "10"], ["stat", "social", "4"]], out: "Standing ovation, three card offers. {RV2} takes notes." },
    { l: "Deal in halls", h: "money+", fx: [["money", "4000"], ["stat", "social", "5"]], out: "Handshake deals between sessions. The {SM} pays off." }
  ] },
{ slug: "screen", n: 70, tags: ["adult-life", "health"], t: "{SC} {AG}",
  x: "{SX7} Fifty is when the manual gets serious. Dr. {DOC} is brisk and kind.",
  slots: { DOC: "SURNAMES", SC: ["Colonoscopy", "Stress test", "Joint scan", "Vision check", "Hearing test"], AG: ["at last", "season", "results"], SX7: ["Prep day is the worst part. Everyone says so.", "The gown, the wait, the thumbs-up."] },
  choices: [
    { l: "Do it all", h: "health+", fx: [["money", "-(500)"], ["stat", "health", "8"]], out: "{SC} clear. The {AG} bring relief and a sticker." },
    { l: "One change", h: "discipline+", fx: [["stat", "health", "5"], ["stat", "discipline", "4"]], out: "Walking daily, smirking at elevators. {SC} approves." }
  ] },
{ slug: "mastery", n: 70, tags: ["adult-life", "creativity"], t: "{HOB} {LVL}",
  x: "{HX6} {FRIEND} shares the obsession.",
  slots: { FRIEND: "NAMES", HOB: "HOBBIES", LVL: ["mastery", "deep end", "obsession"], HX6: ["Twenty years in, the craft opens new rooms.", "The garage becomes a studio.", "Amateurs admire; masters tinker."] },
  choices: [
    { l: "Teach it", h: "karma+", fx: [["stat", "karma", "6"], ["prestige", "5"]], out: "Students gather. {HOB} flows through you to {FRIEND}." },
    { l: "Exhibit it", h: "fame+", fx: [["fame", "6"], ["money", "800"]], out: "The {HOB} show sells out. {FRIEND} buys piece one." }
  ] },
{ slug: "grandtour", n: 60, tags: ["adult-life", "joy"], t: "{PLACE3} {WITH}",
  x: "{TX5} Finally: the trip you postponed for decades.",
  slots: { PLACE3: "COUNTRIES", WITH: ["with your partner", "with old friends", "solo at last", "with the whole family"], TX5: ["The itinerary is a love letter to yourselves.", "Business class. Earned. Every mile of it."] },
  choices: [
    { l: "No budget", h: "happiness+", fx: [["money", "-(6000)"], ["stat", "happiness", "9"]], out: "{PLACE3} {WITH}. The photos need no filter and get none." },
    { l: "Smart splurge", h: "smarts+", fx: [["money", "-(2500)"], ["stat", "happiness", "6"]], out: "{PLACE3} done wisely. {WITH} — every penny a memory." }
  ] },
{ slug: "nest", n: 60, tags: ["adult-life", "family"], t: "Empty nest {MOOD}",
  x: "{NX} The house echoes with their absence. The {ROOM2} becomes {USE}.",
  slots: { MOOD: ["week one", "freedom", "aches"], NX: ["Their rooms stay ready. Just in case.", "Quiet dinners. Loud thoughts."], ROOM2: ["spare room", "garage", "basement", "attic", "study"], USE: ["a library", "a gym", "an art studio", "a guest suite", "a workshop"] },
  choices: [
    { l: "Reclaim a room", h: "happiness+", fx: [["stat", "happiness", "6"]], out: "The study rises where posters hung. Empty nest {MOOD}: survived." },
    { l: "Visit monthly", h: "family+", fx: [["money", "-(400)"], ["stat", "happiness", "5"]], out: "Sunday calls, surprise visits. The nest stretches, never breaks." }
  ] },
{ slug: "mentor", n: 60, tags: ["adult-life", "karma"], t: "Mentoring {JR}",
  x: "{MX5} You meet over {PLACE4}; {GIFT}.",
  slots: { JR: ["the new hire", "a neighbor kid", "an intern", "a young founder"], MX5: ["They remind you of you, twenty years back.", "Raw talent, rough edges.", "Hungry to learn, humble enough to listen."], PLACE4: ["coffee", "long walks", "late lunches", "video calls", "bench talks"], GIFT: ["a worn notebook changes hands", "a contact list opens up", "a reference letter lands", "an introduction email flies", "a bookshelf gets raided"] },
  choices: [
    { l: "Open doors", h: "karma+", fx: [["stat", "karma", "7"], ["stat", "social", "3"]], out: "{JR} lands the role. Your name carried weight." },
    { l: "Tough love", h: "discipline+", fx: [["stat", "discipline", "4"], ["stat", "karma", "4"]], out: "Hard feedback, kindly given. {JR} thanks you within a year." }
  ] },
{ slug: "knee", n: 60, tags: ["adult-life", "health"], t: "The {JOINT} files a complaint",
  x: "{JX} Stairs become negotiations. {FIX}",
  slots: { JOINT: ["left knee", "right hip", "lower back", "shoulder", "ankle"], JX: ["It started on a perfectly ordinary Tuesday.", "The weather now predicts itself in your joints.", "It only hurts when it rains. It always rains."], FIX: ["Ice becomes a food group.", "The brace is oddly comforting.", "Elevators become beloved.", "Gentle yoga beckons.", "The pharmacist knows your name.", "Heat pads: deployed."] },
  choices: [
    { l: "Physio plan", h: "health+", fx: [["money", "-(600)"], ["stat", "health", "6"]], out: "Bands, stretches, patience. The {JOINT} settles down." },
    { l: "Adapt sports", h: "fitness+", fx: [["stat", "fitness", "5"], ["stat", "health", "3"]], out: "Swimming replaces running. The {JOINT} approves the trade." }
  ] },
{ slug: "civic", n: 60, tags: ["adult-life", "karma"], t: "{FRIEND} drafts you for {CV}",
  x: "{CX7} The town needs grown-ups. You qualify.",
  slots: { FRIEND: "NAMES", CV: ["the school board", "the zoning fight", "the library levy", "the park cleanup", "the food bank drive"], CX7: ["Meetings, minutes, mild glory.", "Democracy runs on volunteers and coffee."] },
  choices: [
    { l: "Run for the seat", h: "prestige+", fx: [["prestige", "9"], ["stat", "stress", "5"]], out: "{CV} gains a champion. {FRIEND} runs your ground game." },
    { l: "Weekend warrior", h: "karma+", fx: [["stat", "karma", "6"]], out: "Gloves on for {CV}. The town looks better Monday." }
  ] },
{ slug: "secondact", n: 50, tags: ["adult-life", "money"], t: "Second act: {SA}",
  x: "{SX8} Twenty years of skill wants a new stage. First client: {FIRST}.",
  slots: { SA: ["consulting", "franchise", "nonprofit lead", "teaching", "writing"], SX8: ["The resume gets a bold new chapter.", "Colleagues call it brave. It feels like relief."], FIRST: ["an old boss", "a neighbor", "a former rival", "a nonprofit", "a startup", "yourself, finally"] },
  choices: [
    { l: "Leap fully", h: "money+", fx: [["chance", "0.6", [["money", "12000"]], [["money", "3000"]]]], out: "Second act: {SA} pays. Courage compounds." },
    { l: "Bridge slowly", h: "smarts+", fx: [["money", "4000"], ["stat", "stress", "-4"]], out: "Nights and weekends first. {SA} grows without risk." }
  ] }
] });
