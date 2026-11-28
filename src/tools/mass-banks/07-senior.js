/* MASS BANK 07 — senior, exclusive 60-120. ~800 events. */
bank({ prefix: "zxsr", min: 60, max: 120, deftags: ["adult-life", "family"], families: [
{ slug: "grandkid", n: 90, tags: ["adult-life", "family"], t: "{GK} {GA}",
  x: "{GX} {FRIEND} brags about theirs louder.",
  slots: { FRIEND: "NAMES", GK: ["Grandkid sleepovers", "Teaching them cards", "Story time", "Park expeditions", "Cookie baking"], GA: ["season", "rules", "joy"], GX: ["The circle of life has excellent snacks.", "Small hands, big questions."] },
  choices: [
    { l: "Spoil away", h: "happiness+", fx: [["stat", "happiness", "8"], ["money", "-(120)"]], out: "{GK} peak. {FRIEND} admits defeat gracefully." },
    { l: "Teach a skill", h: "karma+", fx: [["stat", "karma", "6"], ["stat", "creativity", "3"]], out: "Knots, songs, card tricks. {GK} inherit everything." }
  ] },
{ slug: "retire", n: 70, tags: ["adult-life", "money"], t: "{RD} {RY}",
  x: "{RX3} The gold watch is real. So is the freedom. {GIFT} {PLAN}",
  slots: { RD: ["Retirement day", "The last commute", "Farewell party"], RY: ["arrives", "era", "morning"], RX3: ["Thirty years distilled to one speech.", "The office claps you out."], GIFT: ["The team chips in for a watch.", "A plaque joins the hallway.", "The group chat fills with toasts.", "The rival firm sends flowers.", "Your speech gets a standing ovation.", "The intern cries. Everyone pretends not to see."], PLAN: ["Golf by Thursday.", "The garden demands attention.", "Grandkids on speed dial.", "A workshop to build.", "Volunteering Mondays.", "The novel, finally."] },
  choices: [
    { l: "Consult back", h: "money+", fx: [["money", "3000"], ["stat", "social", "3"]], out: "Two days a week, triple the rate. {RD} pays twice." },
    { l: "Full stop", h: "happiness+", fx: [["stat", "happiness", "7"], ["stat", "stress", "-8"]], out: "Alarm: deleted. {RD} begins with a long nap." }
  ] },
{ slug: "club60", n: 80, tags: ["adult-life", "social"], t: "{CL2} {CD}",
  x: "{CX8} {FRIEND} recruited you over pie.",
  slots: { FRIEND: "NAMES", CL2: ["Garden club", "Bridge league", "Choir", "Hiking crew", "Book circle", "Pickleball ladder", "Woodshop", "Birding group"], CD: ["championship", "season", "social"], CX8: ["The calendar fills with delightful obligations.", "New friends at an age when that is rare gold."] },
  choices: [
    { l: "Run for president", h: "prestige+", fx: [["prestige", "7"], ["stat", "social", "4"]], out: "{CL2} elects you unanimously. {FRIEND} runs the campaign." },
    { l: "Happy member", h: "happiness+", fx: [["stat", "happiness", "6"], ["stat", "health", "3"]], out: "Show up, pitch in, belong. {CL2} is the week's highlight." }
  ] },
{ slug: "health60", n: 80, tags: ["adult-life", "health"], t: "{NU} {NW}",
  x: "{HX7} The doctor {DOC2} knows you by name now.",
  slots: { DOC2: "SURNAMES", NU: ["New knee", "New hip", "Cataract fix", "Hearing aids", "Blood pressure plan", "Back therapy"], NW: ["era", "verdict", "upgrade"], HX7: ["Modern medicine is a marvel.", "Recovery comes with daytime TV."] },
  choices: [
    { l: "Top surgeon", h: "health+", fx: [["money", "-(3000)"], ["stat", "health", "9"]], out: "{NU} perfect. Dr. {DOC2} works miracles on schedule." },
    { l: "Steady rehab", h: "discipline+", fx: [["money", "-(500)"], ["stat", "health", "6"], ["stat", "discipline", "4"]], out: "Exercises thrice daily. {NU} earns its keep." }
  ] },
{ slug: "legacy", n: 80, tags: ["adult-life", "family"], t: "{LG} {LT}",
  x: "{LX3} The grandkids will fight over these lovingly. {KEEP} keeps the box.",
  slots: { LG: ["Memoir pages", "Recipe box", "Letter box", "Photo wall", "Family tree", "Video stories"], LT: ["project", "grows", "session"], LX3: ["A lifetime sorts itself into chapters.", "The attic yields its archives."], KEEP: "NAMES" },
  choices: [
    { l: "Finish it", h: "prestige+", fx: [["prestige", "8"], ["stat", "creativity", "4"]], out: "{LG} complete. Tears at the reading. Legacy: secured." },
    { l: "Record audio", h: "happiness+", fx: [["stat", "happiness", "6"]], out: "Your voice telling all. {LG} play at every gathering." }
  ] },
{ slug: "travel60", n: 70, tags: ["adult-life", "joy"], t: "Slow {DEST} {PACE}",
  x: "{TX6} {FRIEND} keeps the same unhurried pace.",
  slots: { FRIEND: "NAMES", DEST: "COUNTRIES", PACE: ["by rail", "by river", "on foot", "by coastal road"], TX6: ["No itinerary survives contact with wonder.", "Linger longer. That is the whole plan."] },
  choices: [
    { l: "First class slow", h: "happiness+", fx: [["money", "-(4000)"], ["stat", "happiness", "8"]], out: "Slow {DEST} {PACE}. {FRIEND} naps through the best valley." },
    { l: "Group tour", h: "social+", fx: [["money", "-(1800)"], ["stat", "social", "5"]], out: "New friends, shared buses. {DEST} {PACE} with laughter." }
  ] },
{ slug: "downsize", n: 60, tags: ["adult-life", "money"], t: "{DS} {DD}",
  x: "{DX6} Forty years of stuff eyes you back. Best find: {FIND}.",
  slots: { DS: ["Downsizing", "The big sort", "Condo move"], DD: ["begins", "math", "freedom"], DX6: ["The attic is a museum of selves.", "Keep, gift, donate, toss."], FIND: ["your wedding shoes", "a love letter from 1982", "the kids' height chart", "a first-edition novel", "grandma's ring", "tickets to everything"] },
  choices: [
    { l: "Sell smart", h: "money+", fx: [["money", "5000"], ["stat", "happiness", "3"]], out: "{DS} profits. The {DD} feels lighter already." },
    { l: "Gift it all", h: "karma+", fx: [["stat", "karma", "8"]], out: "Kids, neighbors, charity. {DS} spreads the wealth of things." }
  ] },
{ slug: "wisdom", n: 60, tags: ["adult-life", "karma"], t: "{FRIEND} asks {QW}",
  x: "{WX3} Young eyes, old question.",
  slots: { FRIEND: "NAMES", QW: ["about marriage", "about money", "about regret", "about courage", "about joy"], WX3: ["You earned this answer the hard way.", "The porch is the right venue."] },
  choices: [
    { l: "Tell the truth", h: "karma+", fx: [["stat", "karma", "7"]], out: "{FRIEND} listens hard. Your answer about {QW} lands deep." },
    { l: "Tell the story", h: "social+", fx: [["stat", "social", "5"], ["friend"]], out: "One tale says it all. {FRIEND} retells it for years." }
  ] },
{ slug: "mar60", n: 60, tags: ["adult-life", "love"], pre: { partner: "married" }, t: "{AY} anniversary {ACE}",
  x: "{AX3} Your partner {PN2} still steals the blankets.",
  slots: { PN2: "NAMES", AY: ["Thirtieth", "Fortieth", "Golden fiftieth", "Twenty-fifth"], ACE: ["dawn", "dance", "feast"], AX3: ["Decades distilled to a look across the table.", "The vows aged better than the photos."] },
  choices: [
    { l: "Renew the vows", h: "love+", fx: [["money", "-(1000)"], ["partnerRel", "10"]], out: "{PN2} cries again. The {AY} anniversary outshines the wedding." },
    { l: "Quiet ritual", h: "happiness+", fx: [["partnerRel", "7"], ["stat", "happiness", "5"]], out: "Same restaurant, same table. {PN2} orders for both of you." }
  ] },
{ slug: "doc60", n: 50, tags: ["adult-life", "health"], t: "{VET} {VV}",
  x: "{VX2} {PET2} has gray around the muzzle now.",
  slots: { PET2: "PETS", VET: ["Old friend vet visit", "Senior pet care", "The gray muzzle"], VV: ["season", "plan"], VX2: ["Slower walks, deeper naps.", "The vet speaks gently."] },
  choices: [
    { l: "Spare nothing", h: "karma+", fx: [["money", "-(800)"], ["stat", "happiness", "5"]], out: "{PET2} gets the best care. Every extra month is gold." },
    { l: "Comfort care", h: "happiness+", fx: [["stat", "happiness", "6"]], out: "Soft beds, short walks. {PET2} is content — so are you." }
  ] }
] });
