# Life & Legacy — BitLife × CK3 Life Simulator (v0.1.03.008)

Version history: see `CHANGELOG.md`.

Browser life-sim: born with CK3 traits → school (majors, scholarships) → 40 careers → love/weddings/twins → feasts/hunts/elections/startups → fame, prestige, dynasty, heirs → ribbon + AI obituary.
Photorealistic AI portraits (locked seed + appearance DNA for consistency) + cinematic event stills.

## Files
- `index.html` — layout (start / game / death screens + modals)
- `src/style.css` — dark/light theme, responsive
- `src/style.css` — 5 themes (Midnight, Ivory, Parchment, Crimson, Abyss), responsive
- Start screen: single primary CTA (Begin a random life) + custom life; quiet row (Continue/Saves/Help/language); quick-start presets (Peasant/Royal/Chaos); visual theme picker; "How a life goes" timeline side card; Last-soul continue card fed by autosave (prefers the live life in memory). Achievements collapsed to top-4 (unlocked first) + Show-all toggle. Space bar ages a year. Topbar tagline shortened; dynbar is minimal (name/age/money/prestige), hidden on the front page so it never shows a stale life, and sticky in-sim; on phones the topbar is one scroll row with secondary controls behind a sticky ··· button.
- `src/i18n.js` — UI chrome in EN/ES/FR/PT/RU/HI/ZH (life stories stay EN)
- `src/data.js` — countries, jobs, houses, cars (+ traits/focuses/decisions/backgrounds/history; split into `src/data/*.js` next)
- `src/content/` — 781 events as individual JSON files (`events/*.json`: 281 legacy + 500 added in one batch — 40 baby, 80 kid, 80 teen, 60 young-exclusive, 61 adult-exclusive, 60 mid-exclusive, 59 senior-exclusive, 60 mature-spanning), 8 packs (`packs/*.json`: 7 age buckets baby/kid/teen/young/adult/mid/senior + the `mature` overlay; files: baby 52 / kid 118 / teen 129 / young 71 / adult 61 / mid 60 / senior 69 / mature 266), single `index.json` (contentVersion 4, must match `LL.CONTENT_VERSION`) listing every pack, grammar + version/migration contract in `SCHEMA.md`. Dedup layout: buckets carry only exclusive events; everything else 18+ (all sx-/ow-/ex-, multi-bracket standards, 18-spanning boundary events) lives once in `mature` (lazy-loaded + cached at 18). The engine only reads and executes these — no game logic in content. Event files may carry `"schema": N` (default 1, must be ≤ `LL.EVENT_SCHEMA`); old files upgrade through `LL.EVENT_MIGRATIONS` on load. (Legacy `src/events.js` removed after cutover; a copy is kept as a chat attachment backup.)
- `src/engine/*.js` — 44 system files (split from a former single-file monolith, since removed), in index.html load order: core → utils (pure; central sim RNG routes through WASM when ready) → state → migrate (versions/gates + checkS spine/typo tripwires) → ecs (DOD/ECS core: recycled ids, column stores, cached queries, named systems — market tickers + NPCs run as entities) → bus (EDA + CQRS: act/age commands, world.ticked/year.committed/life.born/life.died/log.appended events, projection read-model, pure queries incl. soul/market/rhythm) → effects-parse → effects-run → effects-validate → sex-events → appearance → ai-core (aiPrompt = preamble + log + state + grounding + PCG guide + plan line + bus tail + mod flavor; aiText routes via the provider chain) → ai-providers (routable text adapter: Perchance built-in default + optional OpenAI-compatible BYOK endpoint, chain with auto-fallback, chain-aware .stop) → research → life (newLife reseeds WASM per soul + emits life.born) → yearly (ageUp dispatches silent flag; salary/stress/health lean with PCG modifiers; endYear emits year.committed) → events-runtime (fireEvent weights by PCG lean/never lists) → mods (MOD_SCHEMA registry: repo src/mods/ + player pasted-JSON, validated like core, quarantined on failure; 5 surfaces — events, tab verbs, yearly twists, AI prompt flavor, repo-script JS acts; enable/disable/remove in Help without reload) → portrait → ai-actions → director (runDirector honors STAGING PLAN; bounded waits + cancel token) → dynasty → ownership → death → actions (doAct dispatches act) → world (market ECS + gbm kernel; NPC ECS npcAge/npcEcon + compute.lerp social batch; PCG macro nudges; world.ticked emit) → render → saves → ui → music → creator → community → graphs → vfx → anya → wasm (rng.wasm xorshift + reseedWasm per life) → compute (gbmBatch + lerpBatch WGSL kernels, WebGPU with CPU fallback, GPU bit-matches CPU) → pcg (WFC-inspired rhythm sampler + modifiersFor/eventWeightMult/planLine + agentPropose) → mcp (14 tools: life.actMany/world.news/npc.list/pcg.guide/bus.projection + 6 resources + prompts/get) → prelude → auth → boot (42 files + sequence + reseedWasm check; online/offline listeners + offline bar). Shared scope: classic scripts in index.html order; `LL.files` load registry (each file pushes as its LAST line, so partial loads read as missing; boot also verifies sequence).
- `main.pjs` — meta + name lists

## Data-driven content (engine reads it, never hardcodes it)

- **Authoring**: events were migrated one-time from legacy JS closures by `src/tools/build-events.js` (acorn-based, runs in an `execute_js` worker: `build({write:false})` dry-run reports residue, `build({write:true})` emits files only at zero residue). New events are hand-authored JSON validated by `src/tools/validate-content.js` (worker: parses with the real engine grammar, checks required fields/valid effects/pack coverage/fallback freshness; 781 events, 0 errors). The 500-event batch was authored as compact specs in `scratch/g500/` (core builder `core.js` + data `d1–d8.js`: tuple fx DSL → schema-checked JSON with banned-pattern screening) and homed by `dedupeAdultPacks({write:true})`. NOTE: `dedupeAdultPacks`' brute-force proof now covers legacy events only (new files are additions, checked by validate-content coverage) — see the comment in `layoutReport`.
- **Runtime**: `events-runtime.js` loader fetches the current age pack from `src/content/packs/` (+ prefetches the next bucket; + the `mature` overlay once, cached, from age 18), compiles via `LL.fxRun.compileEvent` into the legacy `window.EVENTS` shape `{id,minAge,maxAge,title,text,choices[{label,hint,fx}]}` (deduped by id), so `fireEvent`/`showEvent` are untouched. If pack fetch fails, the generated `content-fallback.js` snapshot is lazy-loaded once via script injection.
- **Parity**: `src/tools/parity-test.js` (page_eval harness: 6 mock states covering all age ranges, identically-seeded RNG, cond + outcome + canonicalized-state comparison; asserts coverage via `comparedEvents`/`comparedPairs` + an `ok` flag so an unloaded-content 0/0 run fails instead of passing) — 266 fx comparisons green across 162 loaded events (of 781 total; the rest are age-gated out of the live pool), 0 cond mismatches, plus a full-content compile check over all 781 events.
- **Stress routing**: JSON `stat{key:stress}` effects write the top-level `S.stress` meter every system reads (fixed in `effects-run.js`; previously they landed in an unread `S.stats.stress`). `co-burnout`'s precondition now targets the `stats.discipline` leaf (a whole-object `stats >= 65` comparison could never fire), and the validator rejects value comparisons on whole container objects.

## State
Single mutable global `S` (kept intentionally — future modules take `S`/slices as args).
Silent fast-forward (`growTo`, custom start ages) applies off-screen self-care (body/mood drift to healthy baselines, no silent debt, `growShield` suppresses death rolls) and arrives with clamped floors — a start age never delivers a corpse.
Yearly pipeline (`ageUp`): ensure world → jail short-circuit (`serveJailYear`) → `advanceCalendar` → `runYearlyBodySystems` (school/work/money/body; death exits via `die`) → `runYearlySocialSystems` (family/lifestyle/fate/world-life) → `runYearlyEvents` (kids flavor + event/AI rolls) → `endYear` (story/ambition → `applyFlagOverrides` → `handleBurnout` → `recordYearHistory` → autofocus → save+render).
Fairness rails (so neglect is miserable, never instantly fatal): unemployed adults cover food via day labor (living costs net to ~zero, extras still bite); couch-surfing quarters living costs and freezes debt interest (balance waits, no compounding doom); broke life logs a 💸 warning naming the remedy (💼 Jobs / 💪 Side hustle) alongside the health/stress warnings; freak bolt is adults-only; senior age-risk scales with frailty, not candles (fit 75yo resists like a fit 75yo — verified lived curves: neglect → 40s with warnings, employed → 80s of old age, optimal → 80-95, engine/content proven to 105 with save round-trip at 100). Sudden death is never silent: the mortality dice open a 💀 crisis (the year's event) with a visible d20 saving throw + stat bonus vs DC (nat 20 saves, nat 1 fails, health≥80 advantage; fight = health+fitness, calm = discipline+health) and real choices — Fight / Stay calm / Let go (despair deaths get Reach out / Endure / Let go at DC 11); survival costs injury + stress; silent years auto-roll off-screen. Flatline (health 0) still kills outright — the decay + warnings were the interaction. Event modal choices lock on first click (no double-apply). `sex-events.js` aliases the global `rName` as `randName` (the name only existed as an expression helper).

## Genetics engine (`src/engine/genetics.js` — the Genitics patch)
- One genotype model for the player, every NPC, and every baby: 9 autosomal loci (red hair / freckles / dimples / heterochromia / sex-influenced balding / hirsutism / maternal twinning — all real Mendelian dominant/recessive — plus 2 disease loci), 2 X-linked loci (color blindness, thinblood), 1 mitochondrial line (fading-light), and 7 polygenic scores (-1..1: height/tone/build/cog/beauty/metab/longv). Founders roll from population frequencies; children segregate properly (one allele per parent, midparent + noise for poly, tiny de novo rate) — probable looks, never a copy.
- Hereditary disease book (6 entries: Vantier's decline, salt-lung, thinblood, sweetblood, thickheart, fading-light) with onset windows, yearly onset rates, treat/manage paths, and absolute cure years checked against `S.year` (the future can cure the past). Onsets fire only when the tree says so (affected/at-risk genotype, never out of thin air), at most one genetic event per year, never in silent fast-forward years (those only progress). Status machine per disease (clear/carrier/atrisk/sick/managed/cured) rides on `S.genDx`, backfilled for old saves — no save bump.
- Sex-aware custom life: facial hair shows for males + "other" always, but for females ONLY with the hirsutism marker checked (the gene is the gate); figures filter by body; 6 rare lineage markers + family-illness select write the starting genome (the chosen look is reverse-mapped to a consistent genome first). Longevity genes bend the mortality dice; unmanaged thickheart adds sudden cardiac risk; balding stages deterministically by age; doctors screen the hidden bloodline (🩺 Doctor verb reveals carriers).
- Parents are people: `R.mom`/`R.dad` are named person records (player-pool traits, genomes chained grandparent → parent → you, siblings share the draw) with living NPC mirrors (jobs, money, chat, death). Babies inherit genes + derivative looks + congenital traits from the real parents (twins run maternal); heirs continue the bloodline; every NPC carries a genome and its own stable portrait seed (chat portraits no longer reuse the player's seed).

## Living world (S.world, ticked every year)
- **Economy**: GDP/inflation/rates/mood + regime Markov chain (boom/stable/recession/crisis); Grand Index + housing index; salary raises scale with GDP; house values follow the housing index; living costs scale with inflation.
- **Stock market**: 10 tickers (NovaTech, Helios Green, DailyBread, CuraMed, Granite Bank, Terra REIT, Ore & Oil, Pixelplay, Koin, Calm Utilities) with GBM prices, beta, dividends (paid in cash), breakouts/busts. Old index-fund/crypto bags follow the index/Koin; NEW per-ticker share holdings (Buy $500 / Sell half) in the 🌍 World tab, plus analyst outlook (AI, fallback computed).
- **NPC life sim**: parents/neighbors/mentor/rival seeded at birth; friends/partner/children reconciled yearly; colleagues/roommates/neighbors/fans spawn through life (cap 24). NPCs age, work, drift, marry, have babies, move, die; married partners contribute household income; rivals scheme. Interact: chat/gift/insult/loan/AI catch-up. Persistent agency: living names stay unique (stable identity); every NPC holds an explicit goal (career/wealth/family/love/fame/rivalry/peace) pursued every year with completion rewards, a trust/grudge stance learned from everything the player does to them, and NPC-NPC bonds along which gossip and grief propagate. Trust gates loans and unlocks unsolicited help; grudges act (rumors, open rivalry); goals can conflict with the player (lost promotions, jealous lovers, social undercuts). The agent tick runs on silent fast-forward and jail years too, and chat AI sees each NPC's goal + felt stance.
- **News**: regime-aware world events + AI headline every 4 years/regime change (toggleable, silent-safe, all fallback-templated). AI prompts include market + people context.
- Old saves upgrade stepwise (world + shares land in the v6 systems step) with silent fast-forward; ticks markets/NPCs/news with no AI and major-only logs.
- **Timeline vs real history** (`GDATA.history`, 50 events 1903–2024): sim/real date recognition (SIM year · REAL year · mirroring vs beyond-history); per-domain divergence scores (war/politics/tech/economy/science/culture) fed by world events, fame, prestige, wealth, custom worlds; yearly divergence snapshots so past events are judged by the world as it was that year (ripple-correct); inevitable / diverted / averted statuses with generated alt-text; deterministic state-conditioned hypothetical futures past the real date; full-text + year + year-range + status search in the 📜 World Timeline modal; AI divergence analysis with forecasted ripples (fallback computed).

## Custom lives (Custom Life modal — every choice bites)
- Identity: names, bio sex, gender identity, sexuality, **race** (Black, White, East/South/Southeast Asian, Middle Eastern, Latino, Pacific Islander, Indigenous, Mixed, Other — stat-neutral by design: portrait + AI prose only; **Mixed** opens father's + mother's heritage picks, shown as "Mixed (A × B)"); **country** (205 options: all UN members + Vatican, Palestine, Taiwan, Kosovo, Western Sahara, Cook Islands, Niue, Somaliland, Northern Cyprus, Transnistria, Abkhazia, South Ossetia); city, religion, family wealth.
- Appearance DNA v2 (pregmod-inspired: height, build, figure, face shape, skin, eyes, hair style/color/length, facial hair, distinguishing marks, style/grooming, voice): every axis feeds the photorealistic portrait + event/director/chat-illustration prompts (identity-first `identityLock` + `promptAppearance`), every AI description (`aiStateLine` "Looks:" line + biography clause), and NPC reactions (yearly `apprCompliment` encounters + `apprKicker` befriending lines). Stat weights in `APPEAR_MODS` applied by `applyAppearanceMods`, previewed live in the modal (`#apprFx`). Skin/hair pools correlate with heritage; old saves migrate with filled defaults. Custom-life designer offers 20 skins, 18 eyes (incl. heterochromia), 12 builds, 7 heights, 10 figures, 24 hairstyles, 22 hair colors, 8 lengths, 12 faces, 11 facial-hair, 19 marks, 14 styles, 12 voices.
Create modal sections: identity (above + DOB that gates the rest); appearance (above); lineage (4 era-neutral backgrounds with hidden mechanics + free-type Custom Past, AI-adjudicated); traits (pick ≤3 personality + ≤1 congenital ★, incl. nemesis/trustfund/frail★/titan★ which drive fate: rival events, +$2k/yr, health drain, infinite-stats lock); attributes (30-point buy, max +10/stat); ambition (6 — auto-checked yearly, +100 prestige + full happiness on fulfillment).
- DOB (MM/DD/YYYY + calendar picker) derives birth year + sim start (birthYear + start age); country list is era-accurate for the DOB (static DB: MODERN_FROM + historical states — Raj, Ottoman, Russian Empire, USSR, Yugoslavia, Czechoslovakia, Prussia, Kashmir Disputed — + curated regions/cities; everywhere else free text). Country/region/city stay locked until a valid DOB is set.
- FTUE: first life on a device gets one 🧭 birth-log orientation line (flag `ll_ftue_v1`, never repeated); every life gets a pulsing gold ring on ⏳ Age+ while under 3 (`ftue-pulse`, reduced-motion safe).
- In-sim Focus system: era + background generate an extensive focus list per life (`FOCUS_X` + 6 classics); one interactive focus plaque on screen opens the focus-tree modal (trunk-and-node styling); switch anytime; ✍️ Dictate accepts free text (AI assigns an existing focus or forges a custom one, keyword fallback offline); AI auto-suggests a situational focus when unfocused past age 12 (throttled, silent-safe). Legacy gates (mogul/athlete/…) resolve through focus tags so extended focuses count.
AI sees roots/ambition/nemesis in every prompt + biography.
- Tabs: 🎯 Activities, 👥 Social, 👪 Family (roster of parents/siblings/grandparents/partner/children with jobs, rel and 💬 chat + 🌳 family-tree entry rooted at the earliest known generation; weddings, babies, adoption, will, heir…), 🎓 Education (school actions + 🔒/🎓 Higher-education block: college + 13 majors unlock after finishing high school; work actions included), 💰 Money, 🏥 Health, 👑 Rule, 🌍 World. All tab actions carry min ages and stay hidden until reachable (babies see Nap/Tummy time; weddings, jobs, college surface at 18/17…); death screen's button (with inheritance preview) returns to the front page. Clicking the 👑 logo or "Life & Legacy" title anytime autosaves a living sim (toast confirms) and returns to the front page. Heir continuation: estate share of net worth split among children (90% with will / 65% without, house+car kept only with will), 70% prestige +15 will bonus, 25% fame (cap 25), full renown, 45%-per-trait inheritance, surviving partner/siblings/grandparents carried with realistic rel, unfinished ambition + nemesis/trust fate may pass on, world/markets/timeline persist, AI "inherited legacy" summary prepended to the new biography.
Old saves upgrade stepwise via the `SAVE_MIGRATIONS` registry in `src/engine/migrate.js` (`migrateSave()` on every `afterLoad()`); damaged slot/autosave/import data is rejected with a reason instead of loading (`validateSave`).

## AI features (ai-text-plugin)
- Event modal: ✏️ Custom Response (AI adjudicates full Director-format outcome JSON + ownership keys, applied via `applySceneFx` with `fallbackDirectorFx` backup), 🌟 Custom Event Idea (AI returns full event with 2-3 resolved choices; choices may carry ownership keys, applied via `applySceneFx`).
- Prompts share a static game-master prefix (`aiPreamble` AMORAL MODE + EXTREME REQUESTS clean-staging block); dynamic char state appended at end (`aiStateLine` incl. OWNERSHIP line with per-claim mode/stage/ob/own/brk/corr/rank/preg + extreme-path hint).
- Real-world grounding (`src/engine/research.js`, super-fetch-plugin): `ensureGrounding()` fetches Wikipedia summaries of the current job + home place (2 fetches max, ~9s timeout each, session-cached, throttled, never throws; fictional custom worlds labeled inspiration-only) into `LL.groundingText`, which `aiPrompt()` appends before TASK — all 18 text call sites inherit it with no prompt-shape changes.
- Provider registry (`src/engine/ai-providers.js`): every `aiText()` call routes through `aiProviderText` — Perchance built-in default (zero config, behavior-identical to the old direct call) plus an optional OpenAI-compatible endpoint (Help → 🤖 AI engine: base URL + model + BYOK key in localStorage only, both-engines test button, third-party notice at the point of use). Chain = active → other-if-configured → caller fallback; narration calls stay short-capped, staging stays bounded + cancellable. Images always use the built-in art pipeline.
- Offline is a valid state: all content/art/music ships in `src/`, saves are local; `online`/`offline` listeners drive `#offlineBar` + toasts (`renderOffline`, boot.js); the perf harness's offline drill (network + AI stubbed dead, 10 years) must stay at zero throws / zero stuck spinners.
  JSON extracted via first-`{`/last-`}` slicing (never `stopSequences:["}"]`,
  which truncates nested objects). All AI paths have non-AI fallbacks.
- Data mods (`src/engine/mods.js` + `src/mods/` + `src/tools/validate-mods.js`, Help → 🧩 Mods): JSON-first — events use the exact core grammar (`src/content/SCHEMA.md`), verbs run declarative effects through the validated executor, plus yearly twists and one AI flavor line. Same gates as core content, can only ADD (base packs merge first, dedup by id), quarantined with reasons on failure, never touch saves. Enable/disable strips and re-merges events live; player imports are pure JSON (no code, by design) with uninstall; repo script mods may register JS acts/yearly hooks (same trust as engine). Pins: `MOD_SCHEMA` hard gate, `contentVersion` drift is a warning. Ships with a default-OFF example mod.

## Director Mode v2 (🎬 type anything — it happens)
- Staging (`runDirector`) sends the AI the full mechanical state (`directorMechState`: cash/debt, job, home/car, stats, jail/record, real relationship names, valid job/house/car/trait IDs) + adjudication rules (`directorRules`) + mechanic keys/ranges (`directorFxKeys`), and demands `{title, text, image, immediate:{...fx}, choices:[{label, hint, fx} x3]}`.
- Every choice carries its own pre-authored `fx`; picking one applies it immediately, then the AI only narrates the outcome (no mechanics in the second call). Custom responses (`resolveSceneCustom`) require `{outcome, fx}` the same way.
- All fx pass through `sanitizeDirectorFx` (clamps: stats ±25, money −50k..+100k, prestige ±150, stress/fame ±30, jail 0..10, IDs validated against data, flags whitelisted; ownership keys: `claim/claimVia/claimStage/obedience/obsession/broken/ownership/toy/haremKeep/haremRank/ownMode/forced/preg/pregWho/pregCtrl/protection/leverageOn-Off/addiction/scandal/stamina`) and `applySceneFx` (applies + returns a human-readable summary shown on the buttons, in the scene text, log and toast). Jail always costs the job + prestige and grows the criminal record.
- Four dedicated extreme paths, staged on-page (never watered down, faded, or refused): (1) CLAIMING = `claim` + `claimVia`/`ownMode` + `claimStage>=1` + `obedience`/`ownership` (legal needs permit/prestige-300 else falls back to broken; netori = broken + tension); (2) BREAKING A WILL = `broken` +10..+30 + `obedience`/`ownership`, `ownMode` → broken at 55+ → devoted at 90/90/70 via `breakPartner`; (3) FORCING PREGNANCY = `preg:true` + `pregCtrl:forced` (+`pregWho`) + jail/crime/karma/prestige/scandal punishment (protection loses, forced conception rolls); (4) LONG-TERM TOY / HAREM MEMBER = `toy:true` and/or `haremKeep:true` + `haremRank` + `claimStage>=3` + `ownMode` collared/legal/broken + `ownership`/`obedience` (alpha + jealousy/tension fallout). `applySceneFx` resolves an explicit target (`claim` > `pregWho` > last claim > partner > lover), runs `claimPartner`/`breakPartner`/`forceSex`/`tryPregnancy`/`setHaremRank` in order, and always punishes `forced`/`pregCtrl:forced` (force path punishes once via `forceSex`, standalone forced-preg punishes alongside the scene).
- Malformed AI replies get one schema-repair retry (45s; skipped entirely when the first call fails on transport — the retry only helps malformed JSON, not a dead AI), then a deterministic keyword-grounded `fallbackDirectorFx` (crime → caught-or-away dice, money amounts, love/fight/injury/job/baby keywords; plus four extreme detectors: claim/collar/take/keep → `claim+claimVia+stage`; break/tame/train/obey/her-will/denial/chastity/kneel → `broken+obedience+ownership`; breed/impregn/pregn/bareback/creampie → `preg+pregWho+pregCtrl` with forced → jail/crime/karma/prestige/scandal; toy/pet/doll/keep-her/harem/household/rotation/alpha → `toy/haremKeep+haremRank+stage>=3`; never empty) — every direction lands with real consequences. Staging waits are bounded (scene ~90s + one ~45s repair, then fallback) with an elapsed ticker and ✖ Cancel / ← New direction (run token `directorRunId` invalidates late AI results, `cancelDirectorRun` restores the UI instantly); narration-only follow-ups (`resolveSceneChoice`/`resolveSceneCustom`) cap at 25s. Opening or running Director with no live life toasts "start a life first" instead of silently doing nothing.
- Minor safety (narrow): while the character is under 18, all four Director AI calls carry a MINOR RULE (romantic/sexual content stays non-graphic and implied; mechanics still apply in full), and `paintScene` skips the scene image for explicitly sexual staging (`directorSexualMinor` keyword test — plain dates/kisses/romance unaffected) with an honest loader note. Adults: zero change.

## AI chat with any NPC (💬 Chat button on every World-tab person + NPC picker in modal)
- `chatModal` (index.html) + chat engine in render.js (`openChat`, `chatSend`,
  `chatArt`, `fillChatSettings`, `renderChatThread`). Per-NPC state on the NPC
  object: `chat` (last 40 turns `{who,text,age}`, images stored as `{who:"img",key}`),
  `mem` (AI-maintained 2-3 sentence memory summary), `memLog` (last 20 notable
  player actions: gifts/insults/loans/talks/cheats, auto-appended by
  `wGift/wInsult/wLoan/wChat/chatSetRole` via `npcMem`).
- Each reply streams as MULTIPLE fast bubbles instead of one slow wall of
  text: the first message (~400 words) renders the moment it arrives while
  follow-ups generate, so there is always something to read. Length is
  tri-state per NPC: standard default (~900 words over ~3 bubbles), `/long`
  epic (2000+ words over ~5 bubbles), `/short` brief 1-3 sentences
  (`/medium` back to standard). Continuation legs never recap or wrap up
  mid-run; truncated-JSON salvage keeps cut-off legs instead of falling back.
  History turns are truncated to 500 chars each so long replies stay
  prefix-cache-lean; a live word counter streams into the typing indicator.
  AI returns `{reply, memory, rel}` JSON — rel moves update the relationship
  (synced via `wPushRel`, rival/confidant thresholds logged).
  Fallback: `chatFallback` (rel-toned canned lines). Old saves migrate lazily
  via `npcChat()`; new NPCs get `chat/mem/memLog` in `wAddNPC`.
- Slash commands (type `/` in the chat box for autocomplete, Tab completes,
  Esc dismisses): `/world [direction]` omniscient-narrator chapter (also
  epic-chained, stored as `{who:"world"}`, included in history as NARRATOR),
  `/continue` (alias `/c`), `/retry` (alias `/r`; drops the whole trailing
  run and regenerates — world runs regenerate in narrator voice with the
  original direction kept), `/img` (alias of the 🎨 Scene button),
  `/short`, `/medium` (aliases `/auto /med`), `/long`, `/clear`,
  `/help` (aliases `/w /h`).
- Images: 🖼️ Portrait / 🎨 Scene buttons (`chatArt`, style via `S.chatImg`).
  Portrait keeps the fixed identity seed (same face) with a "sole-subject,
  eyes at camera" prompt. Scene is composition-first and never repeats:
  fresh random seed every tap, "wide shot, BOTH people head to toe, NOT a
  close-up/headshot/selfie" prompt built from the last 5 chat turns
  (setting + action, both people named with short appearance anchors), plus
  anti-close-up negatives (close-up, headshot, single person, selfie…).
  Same composition-first treatment for event art (`paintEvent`) and Director
  scenes (`paintScene`): wide-shot prompt with the SCENE leading, a short
  identity anchor last, fresh random seed per call, anti-close-up negatives.
  Only the true portrait (`paintPortrait`) keeps the fixed identity seed.
- AI status tracking (silent, no topbar UI — pill removed by user request):
  `LL_AI_ONLINE` text + `LL_IMG_ONLINE` image, learned from real call outcomes
  (no quota-burning boot ping). Wired in `aiText` (ai-core.js) via `aiNoteOnline()`
  and in `requestImage` (events-runtime.js) via `imgNoteOnline()`; `renderAiPill()`
  in ui.js is a silent no-op kept so existing callers stay safe.
- Achievements (dynasty.js `ACH_DEFS` + `checkAch` + `renderAch`): 16 badges
  (first child, 4 kids, grandkids, $500k, $1M, IPO, buyout, kingpin,
  centenarian, legend, superstar, scholar, saint, villain, wanderer, charmer),
  earned across lives — stored in localStorage `ll_ach_v1` (never in S, so
  death and heir-continue never wipe them), toasted + logged as milestones,
  showcased on the start screen with a live count.
- Runtime spine check (`checkS` in migrate.js, warn-only): runs at the end
  of every year (endYear, before autosave), verifies S.stats/relationships/
  assets/world/flags/education/log/sex exist, `console.warn`s the exact
  missing paths. Also a typo-tripwire: unknown `S.stats` keys (anything
  outside the 9 STAT_KEYS, e.g. a `smatrs` typo or legacy cruft) are warned
  once per session with the valid list — never deleted, never thrown.
  Never repairs destructively — no wInit()/defaultSex()
  assignment (those would wipe the world / claims); the only auto-fix is
  the purely additive `sexEnsure()` field fill. Never throws.
  Static backstop: `src/tools/typo-scan.js` greps all engine sources for
  literal `.stats.<key>` / `stats["<key>"]` against STAT_KEYS (dynamic
  `S.stats[k]` is inherently safe; content-JSON effects are separately
  gated by effects-validate + validate-content).
- Nemesis feud engine (life.js `yearlyNemesis`, called from `yearlyFate`):
  heat 0-100 climbs yearly (1.6x when famous/prestigious/rich), the rival
  NPC earns and employs themselves, one beat max per year (perYear gate)
  unlocking by heat — smear → sabotage → poach/seduce → company/career/
  scandal → frame/arson/ransom (harshest never in silent years), each with
  graceful fallbacks when the player lacks the target. Ends by player
  action (🤝 bury hatchet $1k / ⚖️ expose needs fame 20+ or prestige 100+ /
  🔪 ruin $3k + crime/record/karma price) or rival death; heat 30 carries
  to heirs. Buttons in TABS.social, state on S.fate (undefined-safe).
- Death screen ledger (`ledgerEl` + 📋 Copy legend): peak net worth,
  lovers/partners/corruption, crimes/record, nemesis outcome, last 3
  milestones ("Remembered for"); `legacyText()` builds a shareable text
  block, clipboard with textarea fallback and honest toasts.
- Event text streams (`streamEvText` in showEvent): fast typewriter
  (~1500 chars/s, click-to-complete), reduced-motion aware, self-clears on
  modal close or choice click. Covers standard + AI custom events.
  Pixels live in session-only `chatImgCache` (never saved — keeps localStorage
  small); older sessions show an "image faded" placeholder.
- ⚙️ Chat settings & cheats: relationship slider (live, synced), role select
  (`chatSetRole` keeps partner/friends arrays consistent), traits editor,
  editable memory textarea + save, wipe memory, clear chat. Debug:
  `window.chatDebug()`.

## Event illustrations (text-to-image-plugin + advanced-text-to-image-plugin)
- All four image paths (event stills `paintEvent`, portraits `paintPortrait`,
  director scenes `paintScene`, NPC chat art `chatArt`) go through `requestImage()`
  in events-runtime.js: races BOTH plugins with basic starting immediately
  (the advanced import is a deprecated stub that usually hangs — the old 20s
  head-start delayed every image), advanced joining after ~4s as backup;
  first dataUrl wins. Return shape is always normalized to the basic result
  ({dataUrl, canvas, inputs}) or null; prompts are capped (~900 chars) and
  identity-first via `identityLock()` (face-first lock + seed, thin 2-entry
  log tail for scene context); negative prompts include face-change guards.
  Hardened: every attempt races a 120s timeout (configurable via
  window.LL_AI_IMAGE_TIMEOUT_MS; cross-origin image iframes can hang instead
  of rejecting on itch.io / partitioned embeds), and the basic leg escapes
  perchance specials — callers never hang, busy-flags always clear. On total
  failure requestImage() resolves null and every caller offers tap-to-retry
  (event/scene loaders become retry buttons, chat removes the pending message
  + retry toast) instead of spinning forever. The topbar 🎨 Art button
  (`toggleArt`, persisted in localStorage `ll_art_off`) skips all generation
  instantly for a fast text-only game. Text calls go through aiText() in ai-core.js: Promise.race with a
  150s default (configurable via window.LL_AI_TEXT_TIMEOUT_MS) that rejects
  with err.aiTimeout and stops the stream — every existing fallback
  (biography/obituary deterministic text, fallbackDirectorFx, chatFallback,
  re-enabled buttons) runs as if the AI errored fast.
- Every event paints a 768x512 storybook illustration above its description
  (`paintEvent` in events-runtime.js). Prompt = identity lock + custom-world
  setting + current scene + last 2 life-log entries, so the art stays
  continuous with your story and keeps the same face. Animated shimmer loader
  while painting; choices stay clickable; stale generations are discarded via
  token; failures become tap-to-retry instead of hiding silently.

## Living portrait + biography (under name, above stats)
- `maybeStory` in portrait.js keeps a 512x512 portrait (`paintPortrait`, prompted
  with age-accurate descriptors via `protagDesc`/`promptAppearance` — kids render
  as kids, no beards/tattoos on under-18s — plus locked identity seed and
  stronger prompt adherence) and a 2-sentence AI biography
  (`writeDesc`, streamed via onChunk) fresh: on new/loaded life, every
  5 years, on job/love/family/home change, or via 🔄 Retell. Silent
  fast-forward years (`endYear(silent)`) never fire generations. The biography
  also rewrites after every resolved event, custom response, and directed scene
  (`refreshDesc`, with a dirty-flag so rapid-fire triggers collapse into one).

## Saves
localStorage (`sdls_auto` autosave every year/action, `sdls_slots` 7 slots, `sdls_settings`) is the fast sync path; every autosave/slot-write is mirrored into `kv-plugin` (IndexedDB, hundreds of MB) via `kvMirrorAuto`/`kvMirrorSlot`, and `kvBootAdopt()` at boot merges newer-wins both ways then refreshes the Last-soul card. Resilient chain: kv-plugin -> native `indexedDB` (`ll-saves`/`kv`, same `{savedAt,state}` shapes + slot keys, second mirror + fallback) -> localStorage -> in-memory session with a one-time "use ⬇ Download" toast. Nothing in saves.js throws (all slot/autosave/render paths guarded; remote reads race an 8s timeout), so blocked storage can't crash ageBtn, autosave, or home. Slots downloadable as JSON + importable.

## Dynasty depth systems (SECTION 7d: crime career · real children · family company)
- **Crime career** — `S.underworld {rank 0-5, rep, stash, territory, crew[], prisonRep, retired}`. Ranks punk→kingpin on rep thresholds; scores scale loot/risk by rank through the existing `crime()` pipeline with 40% buried in the fine-proof stash; territory pays yearly street tax; crew gains skill and costs wages; prison has its own rep track (yard politics, cellmate recruits). Retire clean at rank 3+. Heirs inherit reduced rank, half the crew, half territory, half the stash as cash.
- **Real children** — kids carry `{trait, dream, grades, trouble, moved}` (migrated onto old saves). Yearly rel drift, school grades, milestones at 5/13/16, teen trouble arcs with bailouts, move-outs, adult kids who send money and care for you after 60. Actions: bond/tutor/praise/scold/groom-heir (groomed heirs get bonus stats/prestige on succession). Roster rows show trait/dream/grades; kid NPC rel synced for chat.
- **Family company** — `S.company {name, sector tech/food/trade, value, cash, employees, morale, rep, founded, level, ipoDone}` (legacy `S.business` auto-converts on load; startup lottery now founds a company). Yearly revenue = staff × level × GDP × sector volatility minus wages with a 30% owner draw; morale/value drift, bailouts, banker IPO prompt at $500k; hire/expand/IPO/sell verbs; value counts 0.7× in net worth; passes to heirs at 80% value. Company/underworld/sex events live in `src/content/events/` (`co-*`, `uw-*`, `sx-*`/`ow-*`/`ex-*`).
- **Company war** — every company gets a rival firm (`S.company.rival {name, value, hostility}`, generated on founding or lazily on the first tick for old saves). The rival grows yearly, poaches staff, runs price wars, plants hit pieces, hires street muscle at high hostility (your heat rises, your vans come back dented), and bids to swallow you whole once it dwarfs you (`S.company.bid {price}` — accept 🤝 in 💰 Money, or snub 🦁 and eat the hatred). Fight back in 💰 Money: 📉 undercut ($5k ad war), 🏦 acquire (absorb them when you're bigger), 🛡️ security (blunts raids/poachers), 🌃 hit the rival (crew job from the stash, heat/karma price). Rival state rides on `S.company` (undefined-safe, no migration bump); value capped in net worth as before. Gang heat also raids your business directly: at 50+ heat, crews rob/torch the company yearly (security halves it).
- **Gestation & custody** — conception (`tryPregnancy`, the single entry point for verbs/force/director) starts an `S.pregs` pregnancy `{carrier, ctrl, tri 1..3, care, legit}` instead of an instant baby: trimester 1 announcement, trimester 2 checkup, delivery at tri 3 (small loss risk when wrecked/42+, twins 12%). Legitimacy = carrier is your married partner; affair births add scandal/karma, ⚖️ contested tags on the roster, and whispers when grooming a contested heir. Divorce triggers a custody battle (money + prestige + karma + luck per minor kid): lost kids get `custody:"ex"` (rel hit, $3k/yr support each in living costs). 👪 Family verbs: 🩺 prenatal care ($500, healthier babies), ⚖️ sue for custody ($2k, prestige/smarts-gated). The roster shows 🤰 active pregnancies with trimester/care.

## Sex & Ownership (SECTION 7e+7f, 18+ adults only)
- **Player `S.sex`**: `{xp, skill 0-100, stamina 0-100, partners, corruption 0-100, kinks[], acts{vanilla/oral/rough/tender/anal/bondage/group/public/tease/worship counts}, claims[8 max], lovers[8], leverageOn/Off[6], addiction, scandal, protection bool, fertility, pregScares, affairKids, broken, haremTension 0-100, alpha name|null, netori{taken,lost,revenges}, lawNote}`. `favActs()` = top counts. Stamina drains ~10-16 per scene, regens yearly (+6, +4 if fitness 60+).
- **Per-partner claim**: `{name, stage 0-4 (interested/claimed/collared/owned/devoted), obedience, obsession, corr (personal corruption), own (ownership 0-100), mode (claimed/collared/legal/broken/willing/devoted), legal bool, broken 0-100, accepted bool, rank (0=alpha, 99=unranked), jealousy, hist{times,first,last,forced,willing,acts{}}, preg{state none/scare/pregnant/birth/prevented, ctrl none/forced/accidental/prevented/planned, child}, levOn/levOff}`. Old saves migrate in `sexEnsure()` via `richClaimFill()`; legacy `ensureClaim/bumpClaim/sxClaim` still work.
- **Ownership law (game fiction, not real law)**: `ownLaw()` — custom world text `harem legal|ownership legal` forces permit; else fictional registry list (`OWN_CONTRACT`, subset `OWN_HAREM`); else banned. Prestige 300+ buys paper cover anywhere. `claimPartner(name,{via:legal/broken/willing/netori/claim})` — `legal` where banned falls back to `broken`.
- **Helpers**: `raiseCorruption(name,n)` (global+personal), `logSex(name,{forced,acts[],ctrl,pregMult})` (skill/stamina/acts/history/preg in one place), `forceSex(name)` (always: crime+1, 1-3y jail, job loss, prestige -50, karma -20, scandal +25, forced preg, mutual leverage), `breakPartner` (will/obedience/own; 90+ broken & 90+ obed → devoted), `acceptPartner` (willing oath), `setHaremRank/haremAlpha`, `setLeverage`, `gainStamina/favActs`, `syncOwnToRel` (mirrors sexCorr/sexOwn/sexMode/sexRank/sexPreg/sexCtrl onto partner/friends/siblings/children/world NPCs), `ownChatBlock/ownToneFor`.
- **Yearly tick** (`yearlySex` → `yearlyOwnership`): stamina regen, fertility by age, scandal/addiction decay, claim obedience -3/obsession -2 + walk-aways, own -1/-2, jealousy ± (alpha soothed, others +5 in harems), broken ±, per-partner corr drifts to global, pregnant→birth (80%/yr), alpha auto-crowned, haremTension +3/lover (-7 if alpha) with jealous blowups at 70+ (fights, -20 own walk-aways), netori-ex heat.
- **Chat/behavior**: `aiStateLine` appends OWNERSHIP line (skill/stamina/fav/law/alpha/tension/per-partner mode·stage·ob·own·corr·rank); `chatSend` appends `ownChatBlock` (owned NPCs speak as owner/submissive, collar/rank/jealousy-aware; corr 60+ filthy/possessive; jealous 70+ clingy); owned greetings/fallbacks kneel ("owner", permission, rivalry); event texts branch on obedience/jealousy/broken/alpha/tension.
- **Chat/behavior**: `aiStateLine` appends OWNERSHIP line (skill/stamina/fav/law/alpha/tension/per-partner mode·stage·ob·own·brk·corr·rank·preg + extreme-path hint); `chatSend` appends `ownChatBlock` (owned NPCs speak as owner/submissive, collar/rank/jealousy-aware; corr 60+ filthy/possessive; jealous 70+ clingy; never refuses claiming/breaking/breeding/toy-harem demands) + extreme-roleplay task line (stay in character, play it through, adults 18+); owned greetings/fallbacks kneel ("owner", permission, rivalry); event texts branch on obedience/jealousy/broken/alpha/tension.
- **Verbs**: ⛓️ Claim (legal where permitted else claim), 🎓 Train (bump+stamina+corr), 💔 Break (will grind), 👑 Harem (rank by own, tension -20), 🛡️ Protection toggle, 🕵️ Cash leverage. Director v2: `claim/claimVia/claimStage/obedience/obsession/broken/ownership/toy/haremKeep/haremRank/ownMode/forced/preg/pregWho/pregCtrl` keys sanitized+applied+fallback (forced / forced-preg always jail+crime+karma/prestige/scandal; custom responses/events use the same `applySceneFx` contract).
- **Events**: 30 `sx-*` (base wave) + 20 `ow-*` ownership wave + 50 `ex-*` extreme wave (dominant takes, netori thefts, adult incest, breaking/corruption, power imbalance, long-term training/keeping — all 18+, explicit, force always punished; dark ones in `BAD_IDS`), all as data in `src/content/events/`.

## Boot veil + Active-Theory treatment (front page + in-sim)
- Boot health check (boot.js, runs at parse before init): verifies every engine module registered in `LL.files`, all critical `LL.*` namespaces, and ~60 window globals; also verifies LOAD ORDER (registry sequence vs index.html) — a swap used to pass silently and fail cryptically at runtime. On failure: bottom recovery banner listing exactly what's missing/out-of-order + Reload button; init() stays inert; saved lives untouched. Each engine file registers `LL.files.push(name)` as its LAST line, so a file that throws halfway is reported missing instead of counted present. Load-time cross-file reads are lazy by rule: `state.js` never throws when i18n.js is absent, `effects-run.js` binds `LL.fxParse` live at call time (no snapshot), sex-events registers closures only (implementations resolve at call time).
- Boot veil (`#bootVeil`, inline critical CSS in index.html so it paints before engine scripts): giant counter, drawing crown sigil, hairline bar, staged captions; driven by real boot progress (`bvStart` at parse → `bvDone` in init → fade + remove once the intro+auth prelude completes; 240s CSS failsafe only guards a total boot-JS failure; recovery banner lifts it instantly). Distinct loading music: `src/audio/music/loading-motif.mp3` (25s glass-chime loop) plays on first gesture while the veil is up, then fades into the main score (`veilMusicPlay`/`veilMusicStop` in music.js, persisted music toggle respected).
- Music legs (intro-overture 44s → auth-nocturne 58s → loading-motif 25s → dynasty-ambience 164s loop, all in `src/audio/music/`, SFX bank in `src/audio/sfx/`): stage legs via prelude `stageMusic`, motif once per session via `veilMusicPlay` (later logins fall back to the main score so the game never goes silent), mute pauses all legs and never layers them. A stall watchdog (`watchAudio`/`watchTick`, all legs registered at creation) retries frozen-but-unpaused elements (load+play, max 2) then drops them quietly — a media element with readyState 0 never fires `error`, so without this silence lasts forever on flaky networks. Logout removes `#bootVeil` outright (marking it done would poison the next `bvDone` tick into a frozen 00 counter); `bvDone` also defensively removes a leftover done-veil instead of wedging.
- Front page: indexed display type (01/02/03 kickers, clamp 44–92px headline with outlined second line), feature marquee ticker, staggered rise-in, magnetic primary buttons, hover lifts — all in `src/style.css`, theme-aware, reduced-motion safe. In-sim: active-tab indicator bar, card hover lift, section hairline rules, sticky dynbar. No game-logic changes.

## Test
- Architecture contract: `src/docs/ARCHITECTURE.md` (load order, save rules, boundaries, tick order, growth rules) + `src/tools/perf-test.js` (page_eval: newLife/ageUp×20/fire-pick/save-load timings vs §8 budgets, plus the offline drill). Measured desktop baseline: newLife ~30ms, ageUp median ~22ms (max ~46ms), fire-pick ~0.04ms, save+load ~36ms, offline 10 years / 0 throws / 0 stuck.
- New random life → Age+ 20× → event modals appear, log grows, no console errors.
- College path (grades 55+) → graduate → job hunt → salary accrues.
- Save slot → reload → download → import round-trip.
