/* MASS BANK 08 — mature professions matrix (18-120, job-gated). ~750 events. */
bank({ prefix: "zxpf", min: 18, max: 100, deftags: ["adult-life", "money"], families: [
{ slug: "crisis", n: 150, tags: ["adult-life", "money"], pre: { job: "employed" }, t: "{JOB} {CR}",
  x: "{CX9} At {PLACE4}, the day goes sideways.",
  slots: { JOB: "JOBS", CR: ["crisis shift", "disaster client", "impossible deadline", "audit surprise", "equipment failure"], CX9: ["The radio crackles with bad news.", "The schedule collapses by noon.", "Everyone looks at you. Of course."], PLACE4: "WORKPLACES" },
  choices: [
    { l: "Save the day", h: "promotion+", fx: [["perf", "8"], ["chance", "0.5", [["money", "1500"]], [["stat", "stress", "6"]]]], out: "The {JOB} crisis bends. At {PLACE4}, they tell this story." },
    { l: "Document everything", h: "smarts+", fx: [["stat", "smarts", "5"], ["stat", "discipline", "3"]], out: "Paper trail perfect. The {CR} becomes a case study." }
  ] },
{ slug: "raise", n: 150, tags: ["adult-life", "money"], pre: { job: "employed" }, t: "{JOB} {PRZ}",
  x: "{PX4} {BOSS} holds the budget like a dragon.",
  slots: { JOB: "JOBS", PRZ: ["pay review", "bonus talk", "overtime season", "contract renewal"], PX4: ["Numbers season arrives.", "Your file is thick with wins."], BOSS: "SURNAMES" },
  choices: [
    { l: "Make the case", h: "money+", fx: [["chance", "0.55", [["money", "5000"], ["perf", "6"]], [["money", "800"], ["stat", "discipline", "3"]]]], out: "{BOSS} blinks first. The {JOB} {PRZ} pays out." },
    { l: "Skill up first", h: "smarts+", fx: [["stat", "smarts", "6"]], out: "Certified, sharpened, undeniable. Next {PRZ}, no contest." }
  ] },
{ slug: "rival", n: 150, tags: ["adult-life", "social"], pre: { job: "employed" }, t: "{COW} {MV}",
  x: "{MX6} {FRIEND} from another department warns you.",
  slots: { FRIEND: "NAMES", COW: "JOBS", MV: ["steals credit", "poaches clients", "charms the boss", "races your promotion"], MX6: ["The coworker smiles with too many teeth.", "Credit flows uphill, away from you."] },
  choices: [
    { l: "Outshine openly", h: "promotion+", fx: [["perf", "7"], ["chance", "0.5", [["prestige", "5"]], [["stat", "stress", "5"]]]], out: "Results silence the {COW}. {FRIEND} applauds from the safe zone." },
    { l: "Befriend them", h: "social+", fx: [["stat", "social", "7"]], out: "Lunch disarms everything. The {COW} becomes an ally." }
  ] },
{ slug: "switch", n: 120, tags: ["adult-life", "money"], t: "{JOB2} {SW}",
  x: "{SX9} {FRIEND} made the same leap last year.",
  slots: { FRIEND: "NAMES", JOB2: "JOBS", SW: ["beckons", "opening", "calling"], SX9: ["The listing glows on the screen.", "Restlessness has a salary band."] },
  choices: [
    { l: "Jump fields", h: "career+", fx: [["chance", "0.5", [["money", "8000"], ["stat", "happiness", "5"]], [["money", "-(2000)"], ["stat", "smarts", "5"]]]], out: "{JOB2} life begins. {FRIEND} shows you the ropes." },
    { l: "Freelance first", h: "smarts+", fx: [["money", "1500"], ["stat", "smarts", "3"]], out: "Weekend {JOB2} gigs test the water. Warm enough." }
  ] },
{ slug: "funny", n: 150, tags: ["adult-life", "social"], pre: { job: "employed" }, t: "{JOB3} {FN}",
  x: "{FX3} At {PLACE5}, legend is born.",
  slots: { JOB3: "JOBS", FN: ["bloopers", "potluck", "reply-all storm", "fire drill", "karaoke night"], FX3: ["Monday will never live this down.", "Someone is filming. Everyone poses."], PLACE5: "WORKPLACES" },
  choices: [
    { l: "Lean into it", h: "social+", fx: [["stat", "social", "7"], ["stat", "happiness", "4"]], out: "The {JOB3} {FN} enters company lore. You star in it." },
    { l: "Play it cool", h: "discipline+", fx: [["stat", "discipline", "4"], ["stat", "social", "3"]], out: "Calm amid chaos. At {PLACE5}, they remember composure." }
  ] },
{ slug: "overtime", n: 90, tags: ["adult-life", "health"], pre: { job: "employed" }, t: "{JOB4} {OT}",
  x: "{OX} The vending machine knows your order.",
  slots: { JOB4: "JOBS", OT: ["overtime month", "double shift", "launch crunch"], OX: ["Week three of late nights.", "The project eats weekends whole."] },
  choices: [
    { l: "Bank the hours", h: "money+", fx: [["money", "3000"], ["stat", "health", "-5"], ["stat", "stress", "6"]], out: "{OT} pays triple. The {JOB4} grind leaves marks and money." },
    { l: "Set boundaries", h: "health+", fx: [["stat", "health", "5"], ["stat", "happiness", "4"]], out: "You log off at six. The {OT} survives without you." }
  ] }
] });
