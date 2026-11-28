/* MASS BANK 02 — kid (ages 5-12). ~860 events. */
bank({ prefix: "zxkd", min: 5, max: 12, deftags: ["kid", "school"], families: [
{ slug: "subject", n: 120, tags: ["kid", "school"], t: "{SUBJECT} {SIT}",
  x: "{SX} {FRIEND} sits nearby.",
  slots: { SUBJECT: ["Fractions", "Long division", "Cursive", "The water cycle", "Times tables", "State capitals", "Dinosaurs", "The solar system", "Spelling bees", "Map skills"], SIT: ["pop quiz", "group project", "show-and-tell", "poster contest", "reading circle", "science demo", "math race", "history skit"], SX: ["Today's lesson crackles with chalk dust.", "The classroom smells of glue and ambition.", "Desks in a circle. Something is about to happen.", "The teacher dims the lights.", "A surprise worksheet lands on every desk."], FRIEND: "NAMES" },
  choices: [
    { l: "Go all in", h: "grades+", fx: [["grades", "5"], ["branchStat", "smarts", 55, [["stat", "smarts", "4"]], [["stat", "discipline", "3"]]]], out: "{SUBJECT} bends to your will. {FRIEND} copies your notes." },
    { l: "Help {FRIEND}", h: "social+", fx: [["stat", "social", "6"]], out: "You explain it twice. {FRIEND} gets it — and never forgets who helped." }
  ] },
{ slug: "playground", n: 90, tags: ["kid", "joy"], t: "{GAME} {TWIST}",
  x: "Recess. {GAME} is underway when {TWISTX}.",
  slots: { GAME: "KID_GAMES", TWIST: ["championship", "remix rules", "rain edition", "teachers join", "rival class"], TWISTX: ["the eighth graders challenge you", "it starts pouring", "the whistle blows early", "a teacher joins in", "the ball goes over the fence"] },
  choices: [
    { l: "Play hard", h: "fitness+", fx: [["stat", "fitness", "6"], ["chance", "0.35", [["stat", "social", "4"]], [["stat", "health", "-2"]]]], out: "Legends are born at recess. Scraped knees and glory." },
    { l: "Referee it", h: "discipline+", fx: [["stat", "discipline", "5"], ["stat", "social", "3"]], out: "Fair calls, firm whistle. {GAME} has never run smoother." }
  ] },
{ slug: "club", n: 100, tags: ["kid", "school"], t: "{CLUB} club {EV}",
  x: "After school: {CLUB} club. Today brings {EVX}.",
  slots: { CLUB: ["Robotics", "Drama", "Chess", "Art", "Coding", "Glee", "Garden", "Astronomy", "Debate", "Woodshop", "Comic", "Nature"], EV: ["auditions", "regionals", "showcase night", "a field trip", "a guest coach", "the big build"], EVX: ["auditions for the spring showcase", "news of regionals", "a visiting expert with wild stories", "a mystery box of supplies", "sign-ups for the big competition"] },
  choices: [
    { l: "Take the lead", h: "smarts+", fx: [["stat", "smarts", "5"], ["stat", "social", "3"]], out: "You run the meeting. {CLUB} club has a new captain." },
    { l: "Master the craft", h: "creativity+", fx: [["stat", "creativity", "6"]], out: "Hours vanish. Your {CLUB} skills jump a full level." }
  ] },
{ slug: "animal", n: 110, tags: ["kid", "joy"], t: "The {ANIMAL} {ENC}",
  x: "{EX} {PLACE2}.",
  slots: { ANIMAL: ["stray dog", "frog", "owl", "hedgehog", "goose", "turtle", "fox kit", "crow", "salamander", "duckling", "rabbit"], ENC: ["rescue", "parade", "mystery", "standoff", "friendship"], EX: ["A rustle in the bushes reveals everything.", "The backyard goes silent. Something is watching.", "Behind the garage: eyes, then a miracle.", "The whole street gathers around the sight."], PLACE2: ["It happens at the creek", "It happens behind the school", "It happens in the vacant lot", "It happens at the park pond", "It happens under the porch"], PET: "PETS" },
  choices: [
    { l: "Befriend it", h: "karma+", fx: [["stat", "karma", "7"], ["chance", "0.3", [["pet", "dog"]], [["stat", "happiness", "4"]]]], out: "The {ANIMAL} trusts you. {PET} wags along as honorary sibling." },
    { l: "Observe and sketch", h: "smarts+", fx: [["stat", "smarts", "5"], ["stat", "creativity", "3"]], out: "Field notes, careful drawings. A young naturalist is born." }
  ] },
{ slug: "season", n: 60, tags: ["kid", "joy"], t: "{SEASON} {ACT}",
  x: "{SX2}",
  slots: { FRIEND: "NAMES", SEASON: ["First snow", "Spring thaw", "Heat wave", "Autumn leaves", "Thunderstorm", "Foggy morning"], ACT: ["adventures", "rules", "expedition", "games"], SX2: ["The weather rewrites every plan. Good.", "The sky does something dramatic. Recess extends itself.", "Boots on. The season demands witnesses.", "The whole neighborhood spills outside."] },
  choices: [
    { l: "Rally the crew", h: "social+", fx: [["stat", "social", "6"], ["friend"]], out: "{FRIEND} brings hot chocolate. The day enters legend." },
    { l: "Solo expedition", h: "health+", fx: [["stat", "health", "5"], ["stat", "smarts", "3"]], out: "Just you and the weather. You return muddy and wise." }
  ] },
{ slug: "biz", n: 80, tags: ["kid", "money"], t: "The {STAND} stand",
  x: "{BX} Startup capital: allowance money.",
  slots: { STAND: ["lemonade", "cookie", "rock painting", "dog wash", "lawn mow", "bracelet", "snow shovel", "car wash"], BX: ["Cardboard sign, prime sidewalk, big dreams.", "The corner location is secured. Business is open.", "Flyers on every lamppost. The brand is strong.", "Grand opening. The neighbors are curious."] },
  choices: [
    { l: "Hustle all day", h: "money+", fx: [["money", "35"], ["stat", "discipline", "4"]], out: "The {STAND} stand clears $35. Capitalism tastes sweet." },
    { l: "Split with {FRIEND}", h: "social+", fx: [["money", "20"], ["stat", "social", "5"], ["friend"]], out: "{FRIEND} handles marketing. Profits split, friendship doubled." }
  ] },
{ slug: "scare", n: 50, tags: ["kid", "health"], t: "Brave vs. {FEAR}",
  x: "{FX} {FRIEND} dares you to face it.",
  slots: { FRIEND: "NAMES", FEAR: ["the dark basement", "the big slide", "the dentist", "thunder", "the deep end", "the haunted house on Elm"], FX: ["The challenge hangs in the air.", "Everyone is watching. No pressure. Much pressure.", "Your knees file a complaint.", "Courage is just fear that said yes."] },
  choices: [
    { l: "Face it", h: "discipline+", fx: [["branchStat", "discipline", 45, [["stat", "discipline", "6"], ["stat", "happiness", "4"]], [["stat", "health", "-3"], ["stat", "discipline", "3"]]]], out: "{FEAR} faced. The story grows with every retelling." },
    { l: "Strategic retreat", h: "smarts+", fx: [["stat", "smarts", "4"]], out: "Not today. Bravery keeps office hours, and that's fine." }
  ] },
{ slug: "drama", n: 60, tags: ["kid", "social"], t: "{FRIEND} {DR}",
  x: "{DX}",
  slots: { FRIEND: "NAMES", DR: ["is mad at you", "shares a secret", "moves away", "gets the lead role", "loses the finals", "finds a new best friend"], DX: ["Recess politics reach a boiling point.", "A note passed in class changes everything.", "The lunch table seating shifts.", "Whispers travel at the speed of gossip."] },
  choices: [
    { l: "Talk it out", h: "social+", fx: [["stat", "social", "7"]], out: "Honest words on the swings. The friendship survives stronger." },
    { l: "Write a letter", h: "creativity+", fx: [["stat", "creativity", "5"], ["stat", "social", "3"]], out: "Three pages, one drawing. {FRIEND} keeps it for years." }
  ] },
{ slug: "collect", n: 60, tags: ["kid", "joy"], t: "The great {COLL} collection",
  x: "{CX} {FRIEND} is your rival and trading partner.",
  slots: { FRIEND: "NAMES", COLL: ["sticker", "marble", "card", "rock", "shell", "coin", "comic"], CX: ["The binder is nearly full.", "One rare piece remains.", "The playground market is volatile today.", "A shoebox of treasure under the bed."] },
  choices: [
    { l: "Trade smart", h: "smarts+", fx: [["stat", "smarts", "5"], ["money", "10"]], out: "Two commons for one holographic. The {COLL} market rewards patience." },
    { l: "Gift the rare one", h: "karma+", fx: [["stat", "karma", "7"]], out: "{FRIEND} stares, speechless. Generosity is the rarest card." }
  ] },
{ slug: "food", n: 60, tags: ["kid", "health"], t: "{FOOD2} {SIT2}",
  x: "{HX}",
  slots: { FOOD2: ["Cafeteria mystery meat", "Birthday cupcakes", "Pizza Friday", "Grandma's casserole", "Lunchbox trades", "Bake sale"], SIT2: ["day", "incident", "triumph", "debate"], HX: ["The lunchroom holds its breath.", "Aroma drifts down the hallway.", "Trading markets open at noon sharp."] },
  choices: [
    { l: "Taste everything", h: "health+", fx: [["stat", "health", "4"], ["stat", "happiness", "3"]], out: "A balanced review. The {FOOD2} earns four stars." },
    { l: "Trade up", h: "social+", fx: [["stat", "social", "5"]], out: "Your sandwich for their cookies plus chips. Lunch arbitrage." }
  ] },
{ slug: "mischief", n: 60, tags: ["kid", "karma"], t: "{MIS} {GONE}",
  x: "{MX} {FRIEND} was there. {FRIEND} saw everything.",
  slots: { FRIEND: "NAMES", MIS: ["The chalkboard message", "The whoopee cushion", "The glitter bomb", "The fake spider", "The switched signs"], GONE: ["goes sideways", "works too well", "backfires", "becomes legend"], MX: ["It seemed hilarious at planning time.", "The plan took eleven seconds to form.", "Nobody thought about consequences."] },
  choices: [
    { l: "Own up", h: "karma+", fx: [["stat", "karma", "7"], ["stat", "discipline", "3"]], out: "Confession, apology, detention. The legend softens into a lesson." },
    { l: "Deny everything", h: "risky", fx: [["chance", "0.5", [["stat", "social", "5"]], [["stat", "karma", "-6"], ["stat", "discipline", "-3"]]]], out: "{FRIEND} keeps your secret. The guilt keeps you." }
  ] }
] });
