/* MASS BANK 05 — adult, exclusive 30-44. ~900 events. */
bank({ prefix: "zxad", min: 30, max: 44, deftags: ["adult-life", "family"], families: [
{ slug: "parent", n: 90, tags: ["adult-life", "family"], t: "{KID} {PH}",
  x: "{PX} Your partner {PN} handles bedtime with military grace.",
  slots: { KID: ["Soccer practice runs", "Science fair volcano", "Braces payments", "First phone debates", "Sleepover negotiations", "Homework wars", "Piano lessons", "Growth spurt"], PH: ["season", "era", "negotiations", "campaign"], PX: ["The calendar is a mosaic of small commitments.", "Parenting: the ultimate logistics startup.", "The minivan knows every route by heart."], PN: "NAMES" },
  choices: [
    { l: "Show up fully", h: "family+", fx: [["stat", "happiness", "5"], ["stat", "social", "3"]], out: "{KID} resolved with hugs. {PN} winks over the chaos." },
    { l: "Hire help", h: "money+", fx: [["money", "-(300)"], ["stat", "stress", "-6"]], out: "A sitter saves the week. {KID} barely notice the upgrade." }
  ] },
{ slug: "career", n: 90, tags: ["adult-life", "money"], pre: { job: "employed" }, t: "{CJ} {CST}",
  x: "{CX4} Your rival {RV} circles the same prize.",
  slots: { CJ: ["Promotion cycle", "Reorg shuffle", "Big client pitch", "Leadership review", "Bonus season"], CST: ["heats up", "goes political", "demands weekends", "tests loyalty"], CX4: ["The org chart shifts like sand.", "Visibility matters more than ever.", "Your track record speaks — loudly, you hope."], RV: "SURNAMES" },
  choices: [
    { l: "Take the shot", h: "promotion+", fx: [["chance", "0.55", [["money", "9000"], ["perf", "8"]], [["money", "2000"], ["stat", "discipline", "4"]]]], out: "{CJ} lands. {RV} sends a gracious, furious email." },
    { l: "Build allies", h: "social+", fx: [["stat", "social", "6"], ["perf", "4"]], out: "Lunches, credit shared, favors banked. The {CJ} can wait." }
  ] },
{ slug: "house", n: 80, tags: ["adult-life", "money"], t: "The house {HN}",
  x: "{HX4} The mortgage hums in the background. It started in the {ROOM}.",
  slots: { HN: ["needs a roof", "grows a deck", "floods slightly", "wants paint", "hides mold", "earns an extension"], HX4: ["Homeownership: the gift that bills.", "The toolbox gets a workout.", "Contractors quote numbers that sting."], ROOM: ["kitchen", "bathroom", "attic", "basement", "garage", "laundry room", "spare bedroom", "porch"] },
  choices: [
    { l: "Renovate right", h: "money+", fx: [["money", "-(6000)"], ["stat", "happiness", "6"]], out: "The house {HN} no longer. Equity and pride both rise." },
    { l: "DIY weekends", h: "discipline+", fx: [["money", "-(1200)"], ["stat", "discipline", "6"]], out: "YouTube tutorials and sore thumbs. The house {HN} — fixed by you." }
  ] },
{ slug: "dinner", n: 70, tags: ["adult-life", "social"], t: "{FRIEND}'s {DP} dinner",
  x: "{DX5} Your partner {PN} charms the table.",
  slots: { FRIEND: "NAMES", PN: "NAMES", DP: ["dinner party", "game night", "wine tasting", "cook-off", "rooftop grill"], DX5: ["The guest list is a social chessboard.", "Candles lit, playlist perfect.", "Someone brings gossip as a side dish."] },
  choices: [
    { l: "Host next", h: "social+", fx: [["money", "-(150)"], ["stat", "social", "6"]], out: "Your table, your rules. {FRIEND} raves for weeks." },
    { l: "Deep talk", h: "happiness+", fx: [["stat", "happiness", "5"], ["friend"]], out: "{FRIEND} opens up past midnight. Real friendship, real wine." }
  ] },
{ slug: "health30", n: 70, tags: ["adult-life", "health"], t: "{CHK} {RES}",
  x: "{HX5} {AFTER}",
  slots: { AFTER: ["You stop for soup on the way home.", "The parking costs more than the visit.", "You text the family group chat immediately.", "A calm walk home settles everything."], CHK: ["Annual physical", "Cholesterol check", "Eye exam", "Dental deep clean", "Blood panel"], RES: ["results", "verdict", "numbers"], HX5: ["The waiting room magazine is from 2019.", "The nurse compliments your veins.", "Paper gown dignity: zero."] },
  choices: [
    { l: "Follow the plan", h: "health+", fx: [["money", "-(250)"], ["stat", "health", "7"]], out: "{CHK} handled like an adult. The {RES} please the doctor." },
    { l: "Fix one habit", h: "discipline+", fx: [["stat", "health", "4"], ["stat", "discipline", "5"]], out: "Walking meetings and less sugar. {CHK} will show it next year." }
  ] },
{ slug: "pta", n: 60, tags: ["adult-life", "social"], t: "{FRIEND} {PT}",
  x: "{PX2} The bake sale industrial complex demands tribute.",
  slots: { FRIEND: "NAMES", PT: ["recruits you for PTA", "chairs the fundraiser", "judges the talent show", "coaches the team"], PX2: ["The school group chat never rests.", "Volunteer signups fill in minutes."] },
  choices: [
    { l: "Chair the thing", h: "prestige+", fx: [["prestige", "8"], ["stat", "stress", "5"]], out: "{FRIEND} applauds your courage. The fundraiser triples its goal." },
    { l: "Quiet helper", h: "karma+", fx: [["stat", "karma", "6"]], out: "Setup crew, no spotlight. {FRIEND} notices anyway." }
  ] },
{ slug: "marriage", n: 70, tags: ["adult-life", "love"], pre: { partner: "married" }, t: "{YR} anniversary {PL}",
  x: "{MX4} Your partner {PN} remembers everything.",
  slots: { PN: "NAMES", YR: ["Fifth", "Tenth", "Seventh", "Twelfth"], PL: ["plans", "surprises", "trip"], MX4: ["The years stack like good bricks.", "The wedding photo has faded; the feeling hasn't."] },
  choices: [
    { l: "Grand gesture", h: "love+", fx: [["money", "-(800)"], ["partnerRel", "10"]], out: "{PN} cries happy tears. The {YR} anniversary sets a high bar." },
    { l: "Love letter", h: "love+", fx: [["partnerRel", "7"], ["stat", "creativity", "4"]], out: "Two pages, no gifts. {PN} keeps it in the nightstand forever." }
  ] },
{ slug: "reunion", n: 60, tags: ["adult-life", "social"], t: "The {RN} reunion",
  x: "{RX2} {FRIEND} organized the whole thing and looks tired but proud.",
  slots: { FRIEND: "NAMES", RN: ["tenth high school", "college", "family", "team championship"], RX2: ["Name tags, old photos, new wrinkles.", "The playlist is pure nostalgia.", "Someone rented the old gym."] },
  choices: [
    { l: "Work the room", h: "social+", fx: [["stat", "social", "7"]], out: "Every table gets a story. {FRIEND} declares you the reunion MVP." },
    { l: "Find your people", h: "happiness+", fx: [["stat", "happiness", "6"], ["friend"]], out: "The old circle reforms instantly. {FRIEND} never really left." }
  ] },
{ slug: "sidebiz", n: 70, tags: ["adult-life", "money"], t: "The {SB} grows up",
  x: "{SX4} Nights belong to the second job now. The first real order came via {CHAN}.",
  slots: { SB: ["Etsy shop", "consulting gig", "rental unit", "food truck", "course business", "newsletter"], SX4: ["Orders trickle, then stream.", "The spreadsheet turns hopeful colors."], CHAN: ["a neighbor", "a viral post", "a craft fair", "a podcast shout", "a farmers market", "word of mouth", "an old colleague"] },
  choices: [
    { l: "Reinvest", h: "money+", fx: [["money", "-(2000)"], ["chance", "0.6", [["money", "7000"]], [["money", "1500"]]]], out: "The {SB} levels up. Real revenue, real taxes, real pride." },
    { l: "Stay boutique", h: "happiness+", fx: [["money", "900"], ["stat", "happiness", "4"]], out: "Small, loved, manageable. The {SB} stays joyful." }
  ] },
{ slug: "crisis30", n: 60, tags: ["adult-life", "health"], t: "{Q} at 35",
  x: "{QX} {FRIEND} calls it the reckoning. {FRIEND} is thriving, annoyingly.",
  slots: { FRIEND: "NAMES", Q: ["The minivan question", "The career ceiling", "The gray hairs", "The bucket list audit", "The college weight"], QX: ["A quiet Tuesday triggers loud thoughts.", "The mirror asks pointed questions."] },
  choices: [
    { l: "New challenge", h: "growth+", fx: [["stat", "discipline", "5"], ["stat", "happiness", "4"]], out: "{Q} answered with action. {FRIEND} signs up too." },
    { l: "Gratitude audit", h: "happiness+", fx: [["stat", "happiness", "7"]], out: "Count the wins: health, {FRIEND}, home. {Q} quiets down." }
  ] },
{ slug: "school30", n: 60, tags: ["adult-life", "school"], t: "{FRIEND}'s kid {SK}",
  x: "{SX5} Your own kids watch how you react.",
  slots: { FRIEND: "NAMES", SK: ["wins the spelling bee", "makes varsity", "aces the recital", "gets the lead", "earns the scholarship"], SX5: ["The group text erupts with pride.", "Front row seats, flowers ready."] },
  choices: [
    { l: "Celebrate big", h: "social+", fx: [["money", "-(100)"], ["stat", "social", "5"]], out: "{FRIEND}'s kid glows. Your kids take notes on joy." },
    { l: "Mentor yours", h: "smarts+", fx: [["stat", "smarts", "4"]], out: "Inspired practice sessions. Your kids chase their own {SK}." }
  ] },
{ slug: "money30", n: 60, tags: ["adult-life", "money"], t: "{WM} {WF}",
  x: "{WX2} The advisor {ADV} speaks in calm percentages.",
  slots: { WM: ["College fund", "Retirement bump", "Emergency buffer", "Brokerage itch"], WF: ["time", "math", "moment"], WX2: ["Compound interest does quiet magic.", "The statements arrive, thick with numbers."], ADV: "SURNAMES" },
  choices: [
    { l: "Max it out", h: "money+", fx: [["money", "-(3000)"], ["set", "assets.savings", "s.assets.savings+(3200)"]], out: "{WM} funded. {ADV} nods with professional calm." },
    { l: "Stay liquid", h: "smarts+", fx: [["stat", "smarts", "4"], ["set", "assets.savings", "s.assets.savings+(800)"]], out: "Cash is king and comfort. {WM} grows gently." }
  ] }
] });
