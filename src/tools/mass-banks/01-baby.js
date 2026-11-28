/* MASS BANK 01 — baby (ages 0-4). 186 events. */
bank({ prefix: "zxbb", min: 0, max: 4, deftags: ["baby", "family"], families: [
{ slug: "snack", n: 20, tags: ["baby", "joy"], t: "The {SNACK} incident",
  x: "Someone gave the baby a {SNACK}. It went everywhere except the mouth. {WHEN}",
  slots: { SNACK: "SNACKS", WHEN: ["Right before guests arrived, of course.", "At the restaurant. Applause from nearby tables.", "In the car seat. The straps will never be clean.", "During the video call with grandma.", "On laundry day. The timing was personal."] },
  choices: [
    { l: "Laugh and clean", h: "happiness+", fx: [["stat", "happiness", "6"]], out: "The {SNACK} wiped off the walls, mostly. The photo stays forever." },
    { l: "Snack strategy", h: "smarts+", fx: [["stat", "smarts", "4"]], out: "Smaller pieces, bigger bib. Engineering saves dinner." }
  ] },
{ slug: "firstfood", n: 16, tags: ["baby", "health"], t: "First taste of {FOOD}",
  x: "Today the baby tries {FOOD} for the first time. The verdict: {FACE}.",
  slots: { FOOD: ["mashed peas", "avocado", "sweet potato", "banana mash", "oatmeal", "peach puree", "carrot mash", "apple sauce"], FACE: ["a look of pure betrayal", "wide-eyed wonder", "deep suspicion", "cautious optimism"] },
  choices: [
    { l: "One more spoon", h: "health+", fx: [["stat", "health", "5"]], out: "Suspicion turns to joy. {FOOD} is officially approved." },
    { l: "Back to milk", h: "—", fx: [["stat", "happiness", "4"]], out: "Rejected with drama. Milk wins again. No shame in retreat." }
  ] },
{ slug: "toy", n: 20, tags: ["baby", "joy"], age: [1, 4], t: "The {TOY} era",
  x: "The {TOY} is now the center of the universe. Today it goes {WHERE}.",
  slots: { TOY: "TOYS", WHERE: ["everywhere, obviously", "to the park and back", "into the bathtub", "under the kitchen table", "on the bus, to cheers"] },
  choices: [
    { l: "Play along", h: "happiness+", fx: [["stat", "happiness", "6"], ["chance", "0.4", [["stat", "creativity", "3"]], [["stat", "social", "2"]]]], out: "An hour of pure {TOY} bliss. The giggles recharge everyone." },
    { l: "Buy a spare", h: "smarts+", fx: [["money", "-(15)"], ["stat", "smarts", "3"]], out: "A backup {TOY} hides in the closet. Future crisis averted for $15." }
  ] },
{ slug: "step", n: 12, tags: ["baby", "health"], age: [0, 2], t: "{M.0} day",
  x: "{M.1} {WIT}",
  slots: { M: [["First steps", "Wobbly, arms out, straight into your arms."], ["First word", "It sounds like your name. Everyone cries."], ["First tooth", "A tiny white dot. Chewing everything now."], ["First laugh", "A belly giggle at the dog's sneeze."], ["First clap", "Thunderous applause for absolutely nothing."], ["First wave", "Goodbye now means waving at strangers."]], WIT: ["The camera caught it. Barely.", " witnessed by two grandparents on speakerphone.", "Nobody else saw, but you know.", "The dog applauded by barking."] },
  choices: [
    { l: "Celebrate big", h: "happiness+", fx: [["stat", "happiness", "8"]], out: "Cake for the adults, mush for the star. A perfect day." },
    { l: "Write it down", h: "smarts+", fx: [["stat", "smarts", "4"]], out: "Date, time, witnesses. The baby book grows heavier with love." }
  ] },
{ slug: "outing", n: 20, tags: ["baby", "family"], age: [1, 4], t: "Trip to {PLACE}",
  x: "The stroller rolls toward {PLACE} {SKY}. The baby narrates in vowels.",
  slots: { PLACE: "PLACES_NEAR", SKY: ["through morning drizzle", "in golden evening light", "against a brisk wind", "under soft gray skies", "past the blooming trees"] },
  choices: [
    { l: "Slow wander", h: "happiness+", fx: [["stat", "happiness", "6"]], out: "{PLACE} has never been this interesting. Pigeons: astonishing." },
    { l: "Nap on the go", h: "health+", fx: [["stat", "health", "5"]], out: "Fresh air works its magic. Two hours of stroller sleep." }
  ] },
{ slug: "night", n: 16, tags: ["baby", "health"], age: [0, 2], t: "{N.0}",
  x: "{N.1} {COPING}",
  slots: { N: [["The 3am summit", "Wide awake at 3am, delighted about it."], ["Teeth at midnight", "Gums ache. Nothing helps except being held."], ["Nap strike", "Naps are suddenly for other babies."], ["Sleep regression week", "Nobody sleeps. Everyone runs on love and coffee."]], COPING: ["The hallway pacing begins.", "Lullabies on loop until dawn.", "You trade shifts like a night crew.", "Warm milk, cool room, low lights."] },
  choices: [
    { l: "Rock and hum", h: "health+", fx: [["stat", "health", "5"], ["stat", "happiness", "3"]], out: "The old songs still work. Sleep finally lands like snow." },
    { l: "Tag-team shifts", h: "discipline+", fx: [["stat", "discipline", "5"]], out: "Shifts assigned, earplugs distributed. Parenting is logistics." }
  ] },
{ slug: "petmeet", n: 20, tags: ["baby", "joy"], t: "{PET} meets the baby",
  x: "{PET} sniffs the baby's toes and decides: this one is mine to guard.",
  slots: { PET: "PETS" },
  choices: [
    { l: "Supervised cuddles", h: "happiness+", fx: [["stat", "happiness", "7"], ["pet", "dog"]], out: "{PET} curls beside the crib. The bond is instant and lifelong." },
    { l: "Gentle boundaries", h: "discipline+", fx: [["stat", "discipline", "4"]], out: "Slow introductions, treats for good behavior — for the pet, mostly." }
  ] },
{ slug: "playdate", n: 16, tags: ["baby", "social"], age: [2, 4], t: "Playdate with {FRIEND}",
  x: "{FRIEND} from down the street comes over. Two toddlers, one ball.",
  choices: [
    { l: "Share the toys", h: "social+", fx: [["stat", "social", "6"], ["friend"]], out: "{FRIEND} trades a block for a truck. Diplomacy begins early." },
    { l: "Parallel play", h: "—", fx: [["stat", "creativity", "5"]], out: "Side by side, separate worlds. Perfectly normal, perfectly sweet." }
  ] },
{ slug: "mess", n: 16, tags: ["baby", "joy"], t: "The great {M.0}",
  x: "{M.1} {AFTER}",
  slots: { M: [["paint explosion", "Little hands, big color. The wall is now expressionist."], ["flour storm", "The kitchen looks snowed in. The baby looks delighted."], ["mud pie factory", "Garden soil plus puddle equals art."], ["bubble flood", "An entire bottle of bubbles, deployed at once."]], AFTER: ["You stare for a full minute.", "The dog pretends innocence.", "Grandma laughs so hard she cries.", "Cleanup supplies: deployed."] },
  choices: [
    { l: "Photo first", h: "happiness+", fx: [["stat", "happiness", "7"]], out: "Evidence preserved. Cleanup takes an hour; the picture lasts forever." },
    { l: "Clean together", h: "discipline+", fx: [["stat", "discipline", "5"]], out: "Tiny sponge, huge effort. The mess becomes the lesson." }
  ] },
{ slug: "grandma", n: 14, tags: ["baby", "family"], t: "Grandma's {THING}",
  x: "Grandma arrives with {THING}. The baby's eyes go enormous. {SAY}",
  slots: { THING: ["knit blanket", "lullaby", "secret cookie recipe", "rocking chair", "photo album", "soft toy"], SAY: ["\"Hush, little one,\" she says.", "\"Just like your mother was.\"", "\"There, there, my love.\""] },
  choices: [
    { l: "Soak it in", h: "happiness+", fx: [["stat", "happiness", "7"]], out: "{THING} works its ancient magic. Three generations on one couch." },
    { l: "Learn the trick", h: "smarts+", fx: [["stat", "smarts", "5"]], out: "You memorize every step of {THING}. Traditions need couriers." }
  ] }
] });
