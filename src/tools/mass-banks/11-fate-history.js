/* MASS BANK 11 — fate (karma-gated) + historical year windows (~310 events). */
/* Part A is data-driven: WINDOWS expand into families programmatically. */
bank({ prefix: "zxfa", min: 18, max: 120, deftags: ["adult-life", "fate"], families: [
{ slug: "bless", n: 60, tags: ["adult-life", "fate"], pre: { p: "stats.karma", gte: 60 }, t: "{BL} {BW}",
  x: "{BX5} Goodness accrues interest. {AT}",
  slots: { AT: ["At the bus stop.", "In the checkout line.", "On a rainy Tuesday.", "At the park gate."], BL: ["Quiet blessing", "Stranger's kindness", "Lucky break", "Open door", "Returned favor"], BW: ["arrives", "morning", "season"], BX5: ["The universe keeps receipts, apparently.", "Years of decency come due."] },
  choices: [
    { l: "Accept gracefully", h: "happiness+", fx: [["stat", "happiness", "7"], ["chance", "0.4", [["money", "1000"]], [["prestige", "4"]]]], out: "{BL} lands softly. You pass a third of it onward." },
    { l: "Pay it forward", h: "karma+", fx: [["stat", "karma", "6"]], out: "{BL} multiplies through you. The ledger of grace grows." }
  ] },
{ slug: "trial", n: 50, tags: ["adult-life", "fate"], pre: { p: "stats.karma", lte: 25 }, t: "{TR2} {TW}",
  x: "{TX9} Debts come due in strange coin. {AT2}",
  slots: { AT2: ["The letter arrives Monday.", "The call comes at dinner.", "The news breaks at work.", "The dream warns first."], TR2: ["Hard reckoning", "Cold shoulder", "Broken deal", "Lost chance"], TW: ["season", "week", "hour"], TX9: ["The past sends its invoice.", "Chickens, roosting, home."] },
  choices: [
    { l: "Make amends", h: "karma+", fx: [["stat", "karma", "8"], ["money", "-(500)"]], out: "Apologies, restitution, change. {TR2} becomes tuition." },
    { l: "Endure it", h: "discipline+", fx: [["stat", "discipline", "5"], ["stat", "karma", "3"]], out: "You take the hit standing. {TR2} passes like weather." }
  ] },
{ slug: "omen", n: 40, tags: ["adult-life", "fate"], pre: { any: [{ p: "fame", gte: 50 }, { p: "prestige", gte: 60 }] }, t: "{OM} {OW}",
  x: "{OX2} Great names attract great weather. {AT3}",
  slots: { AT3: ["The ravens agree.", "Barometers spin.", "The old ones nod.", "Clocks stop, then resume."], OM: ["Prophecy dream", "Strange coincidence", "Elder's warning", "Sign in the sky"], OW: ["night", "at dawn", "before the storm"], OX2: ["Three unrelated people say the same thing.", "The timing defies statistics."] },
  choices: [
    { l: "Heed it", h: "smarts+", fx: [["stat", "smarts", "5"], ["chance", "0.5", [["stat", "happiness", "5"]], [["stat", "stress", "4"]]]], out: "{OM} guides a real choice. {OW} proves it right." },
    { l: "Shrug it off", h: "discipline+", fx: [["stat", "discipline", "4"]], out: "Omens are weather. You dress accordingly and walk on." }
  ] }
] });
/* Part B — historical windows. Each window becomes one 4-event family. */
(function () {
  var WINDOWS = [
    [1950, 1954, "The boom years", "New houses rise in rows. Everyone knows a veteran starting over.", "18-99"],
    [1955, 1959, "Television nights", "A glowing box gathers the street. The world shrinks to one channel.", "10-99"],
    [1957, 1958, "Sputnik summer", "A beeping satellite crosses the sky. Kids crane necks upward.", "8-80"],
    [1960, 1963, "New frontier days", "Rockets on the news, hope in the air. Anything feels launchable.", "10-90"],
    [1964, 1966, "The band invasion", "Guitars on every screen. Hair grows longer; rules grow shorter.", "8-60"],
    [1967, 1968, "Summer of change", "Flowers, protests, new ideas in old streets.", "12-70"],
    [1969, 1970, "Moon landing", "A boot print on the Moon, watched live. Humanity's biggest night.", "5-99"],
    [1971, 1972, "Pocket calculators", "Arithmetic goes electronic. Homework will never be the same.", "8-70"],
    [1973, 1974, "Oil shock", "Gas lines snake around blocks. Thermostats drop; sweaters rise.", "16-99"],
    [1975, 1979, "Disco fever", "Mirror balls spin. The dance floor forgives everything.", "14-70"],
    [1976, 1980, "Home video", "The VCR blinks midnight forever. Movie night moves home.", "8-80"],
    [1981, 1985, "Computer dawn", "Beige boxes hum on desks. The future has a floppy drive.", "8-80"],
    [1983, 1984, "Arcade golden age", "Quarters vanish into glowing cabinets. High scores are glory.", "8-50"],
    [1986, 1987, "Mixtape era", "Dubbing songs off the radio takes timing and love.", "10-60"],
    [1989, 1990, "The wall falls", "Concrete crumbles on live TV. Maps get redrawn overnight.", "10-99"],
    [1991, 1994, "Channel surfing", "A hundred channels bloom. Remote controls gain power.", "8-80"],
    [1993, 1997, "The web arrives", "Modems screech their song. The world fits through a phone line.", "8-80"],
    [1998, 1999, "Millennium fever", "Two thousand approaches. Parties planned; computers patched.", "10-99"],
    [2000, 2001, "Y2K passes", "The clocks roll over. The lights stay on. Relief tastes sweet.", "10-99"],
    [2002, 2005, "Reality TV age", "Ordinary people become famous for being watched.", "12-70"],
    [2004, 2006, "Video sites bloom", "Anyone can broadcast. Cats become the first stars.", "8-70"],
    [2007, 2010, "Smartphone dawn", "A glass slab replaces ten gadgets. Thumbs learn new tricks.", "10-80"],
    [2008, 2012, "Social everything", "Friends, photos, feeds. Life gains a second screen.", "10-70"],
    [2011, 2013, "Tablet time", "Magazines become apps. Grandparents video-call like pros.", "5-90"],
    [2013, 2016, "Streaming wars", "Binge becomes a verb. The theater moves to the couch.", "10-80"],
    [2015, 2017, "Ride-share streets", "Strangers drive strangers. Cars idle less.", "16-80"],
    [2017, 2019, "Voice assistants", "Talking to rooms becomes normal. The lights obey.", "8-90"],
    [2020, 2021, "The quiet years", "Streets empty; sourdough rises. Windows become the world.", "5-99"],
    [2020, 2021, "Remote everything", "Work, school, weddings — all through the little camera.", "10-90"],
    [2022, 2024, "AI everywhere", "Machines write, paint, chat. Every job description wobbles.", "12-90"],
    [2023, 2025, "Power bills bite", "Grids strain, rates climb. Rooftops sprout panels.", "16-99"],
    [2025, 2028, "Robot delivery", "Sidewalk bots ferry groceries. Dogs remain unimpressed.", "8-90"],
    [2028, 2032, "Lunar crews", "Permanent lights on the Moon. Launches feel routine.", "8-99"],
    [2030, 2035, "Longevity clinics", "Centenarians jog past. Aging becomes negotiable.", "30-110"],
    [2032, 2036, "Fusion grid", "Clean power, cheap and endless. Desalination blooms deserts.", "16-110"],
    [2035, 2040, "Mars tickets", "The red planet sells one-way dreams. Volunteers queue.", "16-99"],
    [2038, 2045, "Ocean farms", "Seaweed cities feed millions. Coastlines get busy.", "10-110"],
    [2042, 2048, "Mind archives", "Memories back up like files. Forgetting becomes a choice.", "20-115"],
    [2045, 2052, "Climate repair", "The sky gets patched. Weather calms, mostly.", "10-115"],
    [2050, 2060, "Orbital living", "Rings spin with gravity and groceries. Earth views standard.", "10-115"],
    [2055, 2065, "Deep time schools", "Kids study centuries as semesters. History feels personal.", "5-100"],
    [2060, 2070, "Star probes", "Sails of light cross the dark. Grandchildren may see landfall.", "10-115"]
  ];
  var fams = WINDOWS.map(function (w, i) {
    var y0 = w[0], y1 = w[1], title = w[2], flavor = w[3], ages = w[4].split("-");
    return {
      slug: "hy" + i, n: 4, w: 2, min: +ages[0], max: +ages[1],
      tags: ["history", "world"],
      pre: { all: [{ p: "year", gte: y0 }, { p: "year", lte: y1 }] },
      t: title + " {ASP}",
      x: flavor + " {YOU}"
      , slots: {
        ASP: ["up close", "on the news", "through neighbors", "at school", "at work", "on the radio"],
        YOU: ["You feel the hinge of history swing.", "Everyone will remember where they were.", "The old folks say: told you so.", "Your diary entry writes itself."]
      },
      choices: [
        { l: "Dive into it", h: "smarts+", fx: [["stat", "smarts", "6"]], out: title + " lived fully. You tell this story for decades." },
        { l: "Watch and note", h: "happiness+", fx: [["stat", "happiness", "5"], ["chance", "0.35", [["money", "500"]], [["stat", "social", "3"]]]], out: title + " observed well. History pays small dividends." }
      ]
    };
  });
  bank({ prefix: "zxhy", min: 5, max: 115, deftags: ["history", "world"], families: fams });
})();
