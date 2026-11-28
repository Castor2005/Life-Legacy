/* MASS BANK 04 — young adult, exclusive 18-29. ~950 events. */
bank({ prefix: "zxyg", min: 18, max: 29, deftags: ["adult-life", "money"], families: [
{ slug: "apart", n: 80, tags: ["adult-life", "money"], t: "{APT} {PROB}",
  x: "{AX} {FRIEND} lives two floors up.",
  slots: { FRIEND: "NAMES", APT: ["First apartment", "Studio shoebox", "Shared house", "Basement suite", "Loft sublet"], PROB: ["has no hot water", "has paper walls", "has a legend landlord", "has roaches with tenure", "has the best stoop"], AX: ["The lease is twelve pages of adventure.", "Deposit paid. Freedom smells like fresh paint.", "Boxes everywhere. The mattress is on the floor."] },
  choices: [
    { l: "Fix it up", h: "money+", fx: [["money", "-(400)"], ["stat", "happiness", "5"]], out: "{APT} becomes home. {FRIEND} helps paint for pizza." },
    { l: "Embrace the chaos", h: "social+", fx: [["stat", "social", "6"]], out: "The {PROB} becomes a running joke. Character: built." }
  ] },
{ slug: "roomie", n: 70, tags: ["adult-life", "social"], t: "{FRIEND} {RM}",
  x: "{RX}",
  slots: { FRIEND: "NAMES", RM: ["eats your leftovers", "adopts a loud parrot", "hosts band practice", "runs a 5am blender", "forgets rent twice", "nails the chore chart"], RX: ["Roommate diplomacy enters a delicate phase.", "The group chat for the apartment heats up.", "The chore wheel spins toward drama."] },
  choices: [
    { l: "House meeting", h: "social+", fx: [["stat", "social", "6"], ["stat", "discipline", "3"]], out: "Rules posted on the fridge. {FRIEND} signs in fancy script." },
    { l: "Move out", h: "money+", fx: [["money", "-(900)"], ["stat", "happiness", "5"]], out: "New place, no {RM}. Peace has a price: $900." }
  ] },
{ slug: "firstjob", n: 90, tags: ["adult-life", "money"], pre: { job: "employed" }, t: "{FJT} {JDR}",
  x: "{JX} Your manager {BOSS} watches like a hawk with a spreadsheet.",
  slots: { FJT: ["First real job", "The entry-level grind", "Cubicle era", "Startup trenches"], JDR: ["week three", "review season", "crunch month", "reorg rumors"], JX: ["The coffee machine is your oracle.", "Slack never sleeps. Neither do you.", "The commute teaches patience daily."], BOSS: "SURNAMES" },
  choices: [
    { l: "Outperform", h: "promotion+", fx: [["perf", "8"], ["stat", "discipline", "4"]], out: "{BOSS} notes your name twice. The {FJT} bends in your favor." },
    { l: "Learn everything", h: "smarts+", fx: [["stat", "smarts", "6"]], out: "Shadow every team. Skills compound quietly." }
  ] },
{ slug: "hustle", n: 80, tags: ["adult-life", "money"], t: "{SIDE} side hustle",
  x: "{HX2} {FRIEND} wants in as co-founder.",
  slots: { FRIEND: "NAMES", SIDE: ["Freelance design", "Reselling vintage", "Tutoring nights", "Delivery weekends", "Print-on-demand", "Pet sitting empire", "Video editing", "Farmers market stall"], HX2: ["Nights and weekends belong to the grind.", "The laptop glows past midnight.", "Spreadsheets of dreams."] },
  choices: [
    { l: "Scale it", h: "money+", fx: [["chance", "0.55", [["money", "2500"]], [["money", "600"]]], ["stat", "discipline", "3"]], out: "The {SIDE} hustle pays. {FRIEND} gets a fair cut." },
    { l: "Keep it small", h: "happiness+", fx: [["money", "400"], ["stat", "happiness", "4"]], out: "Pocket money, zero stress. The {SIDE} gig stays fun." }
  ] },
{ slug: "trip", n: 90, tags: ["adult-life", "joy"], t: "{CITY} {HOW}",
  x: "{TX2} {FRIEND} navigates by snacks.",
  slots: { FRIEND: "NAMES", CITY: "CITIES", HOW: ["on $40 a day", "by night train", "with one backpack", "on points and luck", "the long way"], TX2: ["The map is more suggestion than plan.", "Hostel bunk, top floor, new friends.", "The first meal alone abroad tastes like freedom."] },
  choices: [
    { l: "Splurge once", h: "happiness+", fx: [["money", "-(500)"], ["stat", "happiness", "8"]], out: "{CITY} at sunset. {FRIEND} takes the photo you'll frame." },
    { l: "Budget wizard", h: "smarts+", fx: [["money", "-(150)"], ["stat", "happiness", "5"], ["stat", "smarts", "3"]], out: "Street food, free museums, perfect days. {CITY} done right." }
  ] },
{ slug: "fest", n: 70, tags: ["adult-life", "social"], t: "{FEST} {ROLE}",
  x: "{FX2} {FRIEND} has the tickets.",
  slots: { FRIEND: "NAMES", FEST: "FESTIVALS", ROLE: ["weekend", "volunteering", "road trip", "afterparty"], FX2: ["Glitter, bass, questionable sleep.", "The lineup poster lives on your wall now.", "Three days. Zero regrets. Much mud."] },
  choices: [
    { l: "Front row", h: "happiness+", fx: [["money", "-(200)"], ["stat", "happiness", "7"]], out: "{FEST} peak moment. {FRIEND} screams the lyrics wrong." },
    { l: "Work the gate", h: "money+", fx: [["money", "150"], ["stat", "social", "4"]], out: "Wristbands and free entry. {FEST} from the inside." }
  ] },
{ slug: "date", n: 80, tags: ["adult-life", "love"], pre: { partner: "single" }, t: "{FRIEND} {DWHERE}",
  x: "{DX4}",
  slots: { FRIEND: "NAMES", DWHERE: ["coffee first date", "third-date cooking", "museum wander", "mini-golf showdown", "bookstore browse", "sunset picnic"], DX4: ["The conversation flows past closing time.", "Nervous laughter, good signs.", "Your friends demand updates hourly."] },
  choices: [
    { l: "Ask them out", h: "love+", fx: [["chance", "0.6", [["stat", "social", "6"], ["stat", "happiness", "5"]], [["stat", "happiness", "-2"], ["stat", "social", "2"]]]], out: "{FRIEND} says yes. The {DWHERE} becomes a story." },
    { l: "Slow burn", h: "—", fx: [["stat", "social", "4"]], out: "Friends first, maybe more. {FRIEND} likes the pace." }
  ] },
{ slug: "wedplus", n: 50, tags: ["adult-life", "social"], t: "{FRIEND}'s wedding {WROLE}",
  x: "{WX} Open bar. Dangerous dance floor.",
  slots: { FRIEND: "NAMES", WROLE: ["plus-one duty", "speech slot", "dance circle", "catch the bouquet"], WX: ["The venue glows with fairy lights.", "Your suit barely survived college.", "Seating chart politics: navigated."] },
  choices: [
    { l: "Give the speech", h: "social+", fx: [["stat", "social", "7"], ["chance", "0.4", [["fame", "3"]], [["stat", "happiness", "3"]]]], out: "{FRIEND} cries laughing. The speech enters family lore." },
    { l: "Dance all night", h: "happiness+", fx: [["stat", "happiness", "6"], ["stat", "fitness", "3"]], out: "Shoes off by midnight. {FRIEND} approves from the sweetheart table." }
  ] },
{ slug: "grad", n: 60, tags: ["adult-life", "school"], t: "{DEG} {GST}",
  x: "{GX2} Loans loom like weather.",
  slots: { DEG: ["Grad school", "Night classes", "Certification sprint", "Trade school", "Bootcamp", "Language immersion", "MBA nights", "Data bootcamp"], GST: ["applications", "all-nighters", "defense day", "cohort bonding", "capstone"], GX2: ["The syllabus is a brick.", "Caffeine becomes a food group.", "The cohort group chat never sleeps."] },
  choices: [
    { l: "Ace it", h: "grades+", fx: [["grades", "7"], ["stat", "smarts", "5"]], out: "The {DEG} credential lands. Doors quietly unlock." },
    { l: "Network hard", h: "social+", fx: [["stat", "social", "6"]], out: "Cohort group chat for life. Jobs flow through friends." }
  ] },
{ slug: "gym20", n: 60, tags: ["adult-life", "health"], t: "{SPORT3} era",
  x: "{GX3} {FRIEND} drags you along.",
  slots: { FRIEND: "NAMES", SPORT3: ["Climbing gym", "Marathon training", "Powerlifting", "Yoga dawn", "Boxing basics", "Triathlon curious"], GX3: ["January energy, but make it stick.", "The soreness is a lifestyle now."] },
  choices: [
    { l: "Train serious", h: "fitness+", fx: [["stat", "fitness", "7"], ["chance", "0.3", [["stat", "health", "-3"]], [["stat", "discipline", "4"]]]], out: "The {SPORT3} era transforms you. {FRIEND} can't keep up." },
    { l: "Social pace", h: "happiness+", fx: [["stat", "happiness", "5"], ["stat", "fitness", "3"]], out: "Workouts plus gossip. {FRIEND} never misses leg day chat." }
  ] },
{ slug: "scam", n: 50, tags: ["adult-life", "money"], t: "The {SCAM} pitch",
  x: "{SX3} {FRIEND} almost fell for it last year.",
  slots: { FRIEND: "NAMES", SCAM: ["crypto doubling", "miracle course", "timeshare tour", "pyramid leggings", "mystery box"], SX3: ["The message promises everything.", "A stranger is very excited about your future.", "The returns defy mathematics."] },
  choices: [
    { l: "Smell the rat", h: "smarts+", fx: [["stat", "smarts", "5"]], out: "Blocked, reported, warned {FRIEND}. Scam radar: calibrated." },
    { l: "Lose a little", h: "lesson", fx: [["money", "-(120)"], ["stat", "smarts", "4"]], out: "Tuition paid to experience: $120. The {SCAM} pitch never again." }
  ] },
{ slug: "move", n: 60, tags: ["adult-life", "money"], t: "Move to {CITY2}",
  x: "{MX3} {FRIEND} already lives there and promises a couch.",
  slots: { FRIEND: "NAMES", CITY2: "CITIES", MX3: ["One-way ticket, two suitcases.", "The job offer tips the scale.", "Restlessness wins the vote."] },
  choices: [
    { l: "Leap", h: "life+", fx: [["money", "-(1500)"], ["stat", "happiness", "7"], ["stat", "social", "-2"]], out: "{CITY2} or bust. {FRIEND} meets you with keys and noodles." },
    { l: "Visit first", h: "smarts+", fx: [["money", "-(300)"], ["stat", "smarts", "4"]], out: "Recon week in {CITY2}. The fantasy survives contact." }
  ] },
{ slug: "health20", n: 60, tags: ["adult-life", "health"], t: "{AIL} at 24",
  x: "{AX2}",
  slots: { AIL: ["Burnout", "Mystery rash", "Sleep debt", "Anxiety spikes", "Back revolt", "Wisdom teeth", "Tennis elbow", "Caffeine jitters", "Allergy season", "Eye strain"], AX2: ["The body sends its first invoice.", "Web searches spiral at 2am.", "The mirror stages an intervention.", "The chair files a complaint.", "The scale tells truths.", "The knees request a meeting.", "The eyes demand a break."] },
  choices: [
    { l: "See a doctor", h: "health+", fx: [["money", "-(200)"], ["stat", "health", "7"]], out: "Treatable, fixable, fine. {AIL} retreats before the pros." },
    { l: "Lifestyle overhaul", h: "discipline+", fx: [["stat", "health", "5"], ["stat", "discipline", "5"]], out: "Sleep, greens, walks. {AIL} meets its match: routine." }
  ] }
] });
