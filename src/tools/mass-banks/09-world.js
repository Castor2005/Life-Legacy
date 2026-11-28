/* MASS BANK 09 — mature world: travel, food, neighbors, seasons (~800 events). */
bank({ prefix: "zxwl", min: 18, max: 110, deftags: ["adult-life", "joy"], families: [
{ slug: "voyage", n: 150, tags: ["adult-life", "joy"], t: "{CTRY} {TR}",
  x: "{TX7} {FRIEND} packs three outfits too many.",
  slots: { FRIEND: "NAMES", CTRY: "COUNTRIES", TR: ["rail pass", "coast drive", "food pilgrimage", "old town week", "island hop"], TX7: ["The flight lands at dawn.", "Borders stamp the passport like applause."] },
  choices: [
    { l: "Splurge well", h: "happiness+", fx: [["money", "-(2000)"], ["stat", "happiness", "8"]], out: "{CTRY} {TR} with {FRIEND}. The stories pay dividends forever." },
    { l: "Travel slow", h: "smarts+", fx: [["money", "-(700)"], ["stat", "smarts", "4"], ["stat", "happiness", "5"]], out: "Markets, backstreets, long lunches. {CTRY} seeps into you." }
  ] },
{ slug: "sea", n: 80, tags: ["adult-life", "joy"], t: "{SEA2} {SA2}",
  x: "{SX10} Salt air fixes what cities break. {COMP}",
  slots: { COMP: ["Dolphins escort the boat.", "A seal judges your stroke.", "Pelicans dive like arrows.", "The lighthouse blinks approval."], SEA2: "SEA", SA2: ["sailing", "swim", "storm watch", "dawn kayak"], SX10: ["The water is impossibly clear.", "Gulls narrate everything.", "The horizon does its old trick."] },
  choices: [
    { l: "Dive in", h: "health+", fx: [["stat", "health", "6"], ["stat", "happiness", "5"]], out: "{SEA2} {SA2}. The ocean returns you to yourself." },
    { l: "Shore slow", h: "happiness+", fx: [["stat", "happiness", "6"]], out: "Tide pools and novels. {SEA2} at walking pace." }
  ] },
{ slug: "peak", n: 70, tags: ["adult-life", "health"], t: "{MT} {CL}",
  x: "{MX7} {FRIEND} trained all spring for this.",
  slots: { FRIEND: "NAMES", MT: "MOUNTAINS", CL: ["ascent", "sunrise", "traverse"], MX7: ["Thin air, big views.", "The trail tests knees and resolve."] },
  choices: [
    { l: "Summit push", h: "fitness+", fx: [["stat", "fitness", "7"], ["chance", "0.3", [["stat", "health", "-3"]], [["stat", "happiness", "5"]]]], out: "{MT} {CL} with {FRIEND}. The photo barely captures it." },
    { l: "Base camp joy", h: "happiness+", fx: [["stat", "happiness", "6"]], out: "Soup, stars, stories. {MT} from below is plenty." }
  ] },
{ slug: "cook", n: 120, tags: ["adult-life", "health"], t: "{DISH} {CK}",
  x: "{CX10} {FRIEND} claims their version is better.",
  slots: { FRIEND: "NAMES", DISH: "DISHES", CK: ["night", "cook-off", "first attempt", "feast"], CX10: ["The kitchen smells like a promise.", "Ingredients cover every surface."] },
  choices: [
    { l: "Follow the recipe", h: "health+", fx: [["stat", "health", "4"], ["stat", "happiness", "4"]], out: "{DISH} triumphs. {FRIEND} demands the recipe, gets it." },
    { l: "Improvise wildly", h: "creativity+", fx: [["chance", "0.6", [["stat", "creativity", "6"]], [["stat", "health", "-2"]]]], out: "{DISH} {CK} goes experimental. {FRIEND} eats it anyway." }
  ] },
{ slug: "neigh", n: 120, tags: ["adult-life", "social"], t: "{FRIEND} {NB}",
  x: "{NX2} The street watches through curtains.",
  slots: { FRIEND: "NAMES", NB: ["borrows the ladder", "hosts a block party", "feuds over the fence", "loses a cat", "starts a tool library", "bakes too much"], NX2: ["Suburbia stages its daily drama.", "The group chat lights up."] },
  choices: [
    { l: "Get involved", h: "social+", fx: [["stat", "social", "6"], ["friend"]], out: "{FRIEND} becomes a real friend over {NB} fallout." },
    { l: "Stay neutral", h: "smarts+", fx: [["stat", "smarts", "4"]], out: "Switzerland with a smile. The {NB} saga resolves itself." }
  ] },
{ slug: "season", n: 100, tags: ["adult-life", "joy"], t: "{SN} {SE}",
  x: "{SX11} {FRIEND} declares it the best one yet.",
  slots: { FRIEND: "NAMES", SN: ["First snow", "Cherry blossoms", "Harvest moon", "Monsoon break", "Wildflower spring", "Golden autumn", "Solstice", "Equinox dawn"], SE: ["ritual", "walk", "feast", "morning"], SX11: ["The year turns its great wheel.", "Light slants differently. Everything glows."] },
  choices: [
    { l: "Mark the day", h: "happiness+", fx: [["stat", "happiness", "7"]], out: "{SN} {SE} with {FRIEND}. Traditions start exactly like this." },
    { l: "Photograph it", h: "creativity+", fx: [["stat", "creativity", "5"]], out: "Golden hour captured. {SN} framed above the mantel." }
  ] },
{ slug: "holiday", n: 80, tags: ["adult-life", "family"], t: "{HOL} {HH}",
  x: "{HX8} {FRIEND} brings the chaos and the pie.",
  slots: { FRIEND: "NAMES", HOL: ["Thanksgiving", "New Year", "Spring festival", "Midsummer", "Harvest home", "Winter lights"], HH: ["table", "toast", "chaos", "truce"], HX8: ["The house fills with voices.", "Recipes older than you emerge."] },
  choices: [
    { l: "Host everyone", h: "social+", fx: [["money", "-(300)"], ["stat", "happiness", "7"]], out: "{HOL} {HH} at yours. {FRIEND} does dishes without asking." },
    { l: "Quiet version", h: "happiness+", fx: [["stat", "happiness", "6"], ["stat", "stress", "-5"]], out: "Small {HOL}, deep peace. {FRIEND} understands completely." }
  ] },
{ slug: "market", n: 80, tags: ["adult-life", "social"], t: "{FEST2} {MV2}",
  x: "{MX8} {FRIEND} knows every vendor by name.",
  slots: { FRIEND: "NAMES", FEST2: "FESTIVALS", MV2: ["morning", "haul", "discovery"], MX8: ["Stalls stretch down the whole street.", "Samples multiply. Resistance fails."] },
  choices: [
    { l: "Buy local", h: "money+", fx: [["money", "-(120)"], ["stat", "happiness", "5"]], out: "Bags heavy with good things. {FEST2} delivers again." },
    { l: "Meet makers", h: "social+", fx: [["stat", "social", "6"]], out: "{FRIEND} introduces you around. The {MV2} becomes a social tour." }
  ] }
] });
