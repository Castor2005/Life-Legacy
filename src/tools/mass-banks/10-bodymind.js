/* MASS BANK 10 — mature body & mind: sports, craft, spirit, tech eras (~450 events). */
bank({ prefix: "zxbm", min: 18, max: 110, deftags: ["adult-life", "health"], families: [
{ slug: "sport", n: 120, tags: ["adult-life", "health"], t: "{SP} {SL}",
  x: "{SX12} {FRIEND} is annoyingly better at this.",
  slots: { FRIEND: "NAMES", SP: "SPORTS", SL: ["league", "lessons", "tournament", "dawn club"], SX12: ["New gear, new hope.", "The learning curve is steep and fun."] },
  choices: [
    { l: "Train weekly", h: "fitness+", fx: [["stat", "fitness", "7"], ["chance", "0.25", [["stat", "health", "-3"]], [["stat", "discipline", "4"]]]], out: "{SP} clicks. {FRIEND} demands a rematch you will win." },
    { l: "Social league", h: "social+", fx: [["stat", "social", "6"], ["stat", "fitness", "3"]], out: "Beers after {SP}. {FRIEND} brings the whole crew." }
  ] },
{ slug: "craft", n: 100, tags: ["adult-life", "creativity"], t: "Making {MK} {MW}",
  x: "{MX9} {FRIEND} wants one for their hallway.",
  slots: { FRIEND: "NAMES", MK: "MAKES", MW: ["weekends", "masterclass", "by hand"], MX9: ["Sawdust and satisfaction.", "The workshop smells of oil and pine."] },
  choices: [
    { l: "Sell a few", h: "money+", fx: [["money", "600"], ["stat", "creativity", "4"]], out: "{MK} sells to strangers. {FRIEND} takes three." },
    { l: "Gift them", h: "karma+", fx: [["stat", "karma", "6"]], out: "Handmade beats bought. {MK} grace three homes." }
  ] },
{ slug: "spirit", n: 100, tags: ["adult-life", "karma"], t: "{PR} {PW}",
  x: "{PX5} {FRIEND} walks the path beside you.",
  slots: { FRIEND: "NAMES", PR: ["Dawn meditation", "Silent retreat", "Pilgrimage walk", "Temple volunteering", "Fasting month", "Gratitude practice"], PW: ["season", "morning", "vow"], PX5: ["Stillness teaches loudly.", "The noise falls away."] },
  choices: [
    { l: "Go deeper", h: "karma+", fx: [["stat", "karma", "8"], ["stat", "stress", "-6"]], out: "{PR} reshapes the weeks. {FRIEND} notices the calm first." },
    { l: "Serve others", h: "karma+", fx: [["stat", "karma", "6"], ["stat", "social", "4"]], out: "Bowls filled, floors swept. {PR} lives in the hands." }
  ] },
{ slug: "tech", n: 80, tags: ["adult-life", "smarts"], t: "{TE} {TT}",
  x: "{TX8} {FRIEND} adopted it months ago, insufferably.",
  slots: { FRIEND: "NAMES", TE: ["Smart home", "AI assistant", "Electric car", "VR headset", "Drone", "Robot vacuum", "Solar array", "E-bike"], TT: ["upgrade", "experiment", "era"], TX8: ["The future arrives in a cardboard box.", "Setup takes an evening and three passwords."] },
  choices: [
    { l: "Early adopter", h: "smarts+", fx: [["money", "-(800)"], ["stat", "smarts", "5"]], out: "{TE} hums along. {FRIEND} asks YOU for help now." },
    { l: "Wait and see", h: "money+", fx: [["stat", "smarts", "3"], ["money", "200"]], out: "Prices drop, bugs vanish. Patience funds the {TE} fund." }
  ] },
{ slug: "read", n: 60, tags: ["adult-life", "smarts"], t: "{BK} {BR}",
  x: "{BX4} {FRIEND} presses it into your hands.",
  slots: { FRIEND: "NAMES", BK: ["The thick biography", "The cult novel", "The history brick", "The poetry shelf", "The science bestseller", "The memoir everyone cites"], BR: ["club", "marathon", "binge"], BX4: ["Forty pages a night, minimum.", "The margins fill with arguments."] },
  choices: [
    { l: "Finish and discuss", h: "smarts+", fx: [["stat", "smarts", "6"], ["stat", "social", "3"]], out: "{BK} rewires something. {FRIEND} debates you till midnight." },
    { l: "Read widely", h: "creativity+", fx: [["stat", "creativity", "5"]], out: "Three books at once. {BK} is just the start." }
  ] }
] });
