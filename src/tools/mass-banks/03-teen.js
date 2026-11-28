/* MASS BANK 03 — teen (ages 13-17). ~860 events. */
bank({ prefix: "zxtn", min: 13, max: 17, deftags: ["teen", "school"], families: [
{ slug: "exam", n: 100, tags: ["teen", "school"], t: "{EXAM} {CRUNCH}",
  x: "{XX} {FRIEND} is stress-highlighting the textbook.",
  slots: { FRIEND: "NAMES", EXAM: ["Midterms", "Finals", "The chemistry gauntlet", "History orals", "The algebra wall", "Physics lab practical", "English essay week", "Biology dissection test"], CRUNCH: ["week", "season", "eve", "marathon"], XX: ["The library smells of panic and highlighters.", "Study groups form like storm systems.", "Flashcards cover every surface.", "The honor roll glitters on the wall."] },
  choices: [
    { l: "Grind nightly", h: "grades+", fx: [["grades", "6"], ["branchStat", "discipline", 50, [["stat", "discipline", "4"]], [["stat", "stress", "6"]]]], out: "{EXAM} conquered. {FRIEND} owes you one for the notes." },
    { l: "Study with {FRIEND}", h: "social+", fx: [["stat", "social", "5"], ["grades", "3"]], out: "Half studying, half laughing. {EXAM} still goes fine." }
  ] },
{ slug: "crush", n: 90, tags: ["teen", "love"], t: "{FRIEND} {CR}",
  x: "{CX2}",
  slots: { FRIEND: "NAMES", CR: ["notices you", "passes a note", "saves you a seat", "laughs at your joke", "asks about homework", "waves in the hall"], CX2: ["Your locker suddenly needs visiting ten times a day.", "Every hallway crossing feels choreographed by fate.", "Your friends have noticed. Everyone has noticed.", "The group chat is 90 percent this topic now."] },
  choices: [
    { l: "Say hi first", h: "social+", fx: [["chance", "0.6", [["stat", "social", "6"], ["stat", "happiness", "5"]], [["stat", "social", "2"], ["stat", "happiness", "-2"]]]], out: "{FRIEND} smiles back. The hallway glows a little brighter." },
    { l: "Play it cool", h: "discipline+", fx: [["stat", "discipline", "4"], ["chance", "0.3", [["stat", "social", "4"]], [["stat", "happiness", "2"]]]], out: "Mystery preserved. {FRIEND} wonders about you instead." }
  ] },
{ slug: "job", n: 90, tags: ["teen", "money"], t: "{GIG} gig",
  x: "{GX} {FRIEND} already works there and vouches for you.",
  slots: { FRIEND: "NAMES", GIG: ["Grocery bagging", "Lifeguard tower", "Ice cream scoop", "Library shelving", "Dog walking", "Lawn crew", "Movie theater", "Pizza delivery assist"], GX: ["The application is one page. The interview is five minutes.", "Help wanted sign, still up.", "Orientation video, hairnet, name tag.", "The manager shakes your hand like a deal."] },
  choices: [
    { l: "Work weekends", h: "money+", fx: [["money", "180"], ["stat", "discipline", "3"]], out: "The {GIG} gig pays $180. {FRIEND} covers your first break." },
    { l: "Bank it all", h: "smarts+", fx: [["money", "120"], ["stat", "smarts", "4"]], out: "Straight to savings. Future-you sends thanks from the future." }
  ] },
{ slug: "team", n: 90, tags: ["teen", "health"], t: "{SPORT2} {SEAS}",
  x: "{TX} Coach {COACH} runs a tight ship.",
  slots: { SPORT2: ["Soccer", "Basketball", "Track", "Swim", "Volleyball", "Wrestling", "Tennis", "Cross-country"], SEAS: ["tryouts", "playoffs", "rivalry game", "tournament"], TX: ["The gym echoes at 6am.", "Cleats, chalk, loud music.", "The bus smells of victory and oranges."], COACH: "SURNAMES" },
  choices: [
    { l: "Start every game", h: "fitness+", fx: [["stat", "fitness", "7"], ["chance", "0.4", [["stat", "social", "4"]], [["stat", "health", "-3"]]]], out: "Coach {COACH} nods once. That nod means everything." },
    { l: "Sixth-player energy", h: "social+", fx: [["stat", "social", "6"], ["stat", "fitness", "3"]], out: "Loudest cheers, best snacks. Teams need hearts too." }
  ] },
{ slug: "band", n: 70, tags: ["teen", "creativity"], t: "{BAND2} {GIG2}",
  x: "{BX3} {FRIEND} plays bass badly and with heart.",
  slots: { FRIEND: "NAMES", BAND2: ["Garage band", "Battle of the bands", "Talent show", "Open mic", "School musical"], GIG2: ["auditions", "first show", "encore", "rehearsal"], BX3: ["Three chords and a borrowed amp.", "The setlist is taped to the floor.", "Somebody's parents are filming everything."] },
  choices: [
    { l: "Take the solo", h: "creativity+", fx: [["stat", "creativity", "7"], ["chance", "0.45", [["fame", "4"]], [["stat", "happiness", "3"]]]], out: "Wrong notes, right feeling. The crowd roars anyway." },
    { l: "Run the lights", h: "smarts+", fx: [["stat", "smarts", "5"], ["stat", "social", "3"]], out: "Cues nailed, blackout perfect. {FRIEND} dedicates a song to the crew." }
  ] },
{ slug: "rebel", n: 70, tags: ["teen", "karma"], t: "{CAPER} {HEAT}",
  x: "{RX} {FRIEND} is already in.",
  slots: { FRIEND: "NAMES", CAPER: ["The rooftop at midnight", "The skipped last period", "The prank war", "The forbidden shortcut", "The all-night diner run"], HEAT: ["escalates", "almost works", "goes sideways"], RX: ["The plan fits on a napkin.", "Rules were made to be negotiated.", "Senior lore says this is tradition."] },
  choices: [
    { l: "Full send", h: "risky", fx: [["chance", "0.55", [["stat", "social", "6"], ["stat", "happiness", "4"]], [["stat", "karma", "-5"], ["stat", "discipline", "-3"]]]], out: "{FRIEND} laughs for a week. The story outlives the detention." },
    { l: "Talk them down", h: "karma+", fx: [["stat", "karma", "6"], ["stat", "social", "3"]], out: "Cooler heads, warm cocoa. {FRIEND} thanks you later." }
  ] },
{ slug: "drive", n: 60, tags: ["teen", "money"], t: "{DL} {STEP}",
  x: "{DX3} {FRIEND} failed twice and lived to joke about it.",
  slots: { FRIEND: "NAMES", DL: ["Permit test", "First lesson", "Parallel parking", "Highway merge", "Night driving"], STEP: ["day", "attempt", "gauntlet"], DX3: ["The manual is thicker than expected.", "The instructor has seen everything.", "Mirrors, signal, breathe."] },
  choices: [
    { l: "Nail it", h: "money+", fx: [["money", "-(60)"], ["stat", "discipline", "5"]], out: "License photo: terrible. Freedom: total. Worth every $60." },
    { l: "Practice more", h: "smarts+", fx: [["money", "-(30)"], ["stat", "smarts", "4"]], out: "Empty parking lots on Sundays. {FRIEND} rides shotgun." }
  ] },
{ slug: "style", n: 60, tags: ["teen", "social"], t: "The {LOOK} phase",
  x: "{LX} {FRIEND} approves cautiously.",
  slots: { FRIEND: "NAMES", LOOK: ["thrift flip", "dyed tips", "vintage denim", "band tee", "sneakerhead", "DIY haircut"], LX: ["The mirror gets a long look.", "The closet undergoes revolution.", "The allowance has a new purpose."] },
  choices: [
    { l: "Commit fully", h: "looks+", fx: [["stat", "looks", "6"], ["stat", "social", "3"]], out: "The {LOOK} phase rules. Compliments from unexpected people." },
    { l: "Keep one piece", h: "smarts+", fx: [["stat", "smarts", "4"]], out: "Subtle nod to the trend. {FRIEND} calls it tasteful." }
  ] },
{ slug: "camp", n: 60, tags: ["teen", "health"], t: "{CAMP} {SUMMER}",
  x: "{CX3} {FRIEND} bunks next door.",
  slots: { FRIEND: "NAMES", CAMP: ["Lake camp", "Wilderness trek", "Coding camp", "Farm stay", "Sailing week"], SUMMER: ["summer", "session", "escape"], CX3: ["Duffel packed, bug spray ready.", "No signal for a week. Bliss.", "The bus leaves at dawn."] },
  choices: [
    { l: "Try everything", h: "fitness+", fx: [["stat", "fitness", "5"], ["stat", "social", "4"]], out: "{CAMP} delivers. {FRIEND} and you return feral and happy." },
    { l: "Find your thing", h: "creativity+", fx: [["stat", "creativity", "6"]], out: "One activity clicks completely. A lifelong thread begins." }
  ] },
{ slug: "rival", n: 60, tags: ["teen", "social"], t: "{FRIEND} {RV}",
  x: "{RVX}",
  slots: { FRIEND: "NAMES", RV: ["outscores you", "gets the solo", "makes varsity first", "wins the election", "dates your crush"], RVX: ["The rivalry nobody asked for begins.", "Comparison is the thief of joy, and joy is being robbed.", "The whole grade picks sides."] },
  choices: [
    { l: "Outwork them", h: "discipline+", fx: [["stat", "discipline", "6"], ["chance", "0.5", [["stat", "social", "3"]], [["stat", "stress", "5"]]]], out: "You close the gap. {FRIEND} respects the grind." },
    { l: "Befriend them", h: "karma+", fx: [["stat", "karma", "6"], ["stat", "social", "4"]], out: "Rivals make the best allies. {FRIEND} agrees over fries." }
  ] },
{ slug: "mentor", n: 60, tags: ["teen", "school"], t: "{MENTOR} takes notice",
  x: "{MX2} {FRIEND} is jealous in the good way.",
  slots: { FRIEND: "NAMES", MENTOR: ["The librarian", "Coach", "The art teacher", "The shop instructor", "The debate coach"], MX2: ["Stay after class, they say. Just to talk.", "A book pressed into your hands.", "An invitation to the advanced group."] },
  choices: [
    { l: "Accept guidance", h: "smarts+", fx: [["stat", "smarts", "6"], ["friend"]], out: "{MENTOR} opens doors. {FRIEND} gets pulled along too." },
    { l: "Prove it solo", h: "discipline+", fx: [["stat", "discipline", "5"]], out: "You deliver anyway. {MENTOR} smiles like this was the plan." }
  ] },
{ slug: "viral", n: 50, tags: ["teen", "fame"], t: "{FRIEND}'s {POST} blows up",
  x: "{VX} {FRIEND} is suddenly school-famous.",
  slots: { FRIEND: "NAMES", POST: ["dance video", "prank clip", "cover song", "skit channel", "trick shots"], VX: ["Ten thousand views overnight.", "The group chat detonates.", "Even teachers have seen it."] },
  choices: [
    { l: "Ride the wave", h: "fame+", fx: [["fame", "6"], ["stat", "social", "3"]], out: "Cameo in the sequel. {FRIEND} splits the glory fairly." },
    { l: "Stay offline", h: "discipline+", fx: [["stat", "discipline", "4"], ["stat", "smarts", "3"]], out: "You watch from the sidelines. Fame looks exhausting up close." }
  ] }
] });
