# Life & Legacy — Changelog

Current version: **v0.1.03.008** (canonical stamp: `LL.APP_VERSION` in `src/engine/migrate.js`).
Save format `SAVE_VERSION = 7`, content `CONTENT_VERSION = 4`, event schema `EVENT_SCHEMA = 1`.
Patch rule (declared 2026-11-27, standing until the next minor/major is declared): every
game-tree change ships as the next `v0.1.03.00N` with a CHANGELOG entry — no silent changes.

---

## v0.1.03.008 — 2026-11-27 — Persistent NPC agents

- NPCs are now **persistent agents** (depth inside `world.js` + `render.js` hooks, not a new
  engine system; all fields lazy/undefined-safe, no migration bump): living names stay unique
  (`npcUniqueName`), every NPC holds an explicit goal (career/wealth/family/love/fame/rivalry/peace,
  role+trait-weighted via `npcPickGoal`) pursued yearly in `npcTickAgent` with completion rewards,
  a trust/grudge stance learned from everything the player does (`npcAgentLearn`, called from
  `npcMem`, so all 15+ memory sites feed it; cheats excluded), and an NPC-NPC bond map (`n.bonds`)
  along which gossip and one-time grief (`mourned` flag) propagate.
- Memories drive decisions: `npcTrustScore` gates loans (rel 60 → trust 55; grudge blocks even at
  fine rel) and unlocks unsolicited help; grudges act yearly (rumors, open-rivalry flips); goals
  conflict with the player (colleague steals a promotion −8 perf, jealous lovers, social undercuts);
  the nemesis is pinned to rivalry until trust redeems them (`life.js`); the agent tick runs on
  silent and jail years too, and chat AI sees each NPC's goal + felt stance (`npcPersonaLine`).
- Measured: gift trust 0→4, double-insult grudge 0→12 + loan-trust 52→2, bonded friend 76→69 on
  gossip, forced prog=100 wealth goal paid out + re-goaled, 11/11 NPCs goal-holding after a 60-year
  life, save/load round-trip byte-identical; full Nov-27 test battery re-ran green on top (see
  scratch log: lint 0/0/0, migration 40/40, parity 266/0/0, perf budgets pass, soak ok:true).
- Files: `world.js` (agent block + 3 hooks), `render.js` (learn/gossip/loan-gate/persona/outcome),
  `life.js` (nemesis rivalry pin), `README.md` + `ARCHITECTURE.md` (one note each).

## v0.1.03.007 — 2026-11-27 — Yearly systems integration (4 explicit couplings)

- Verdict on her proposal: correct direction, wise with constraints — three axes already had bones;
  all hooks are depth work (no new systems/fields/grammar, tiny numbers, logged, tested).
- Disease → mortality: NEW `genCrisisMod` (+1 DC per unmanaged sick disease, cap 3; managed/cured
  add nothing) read by `deathSaveDC`, NEW `genDeathCause` (unmanaged sickness writes the cause,
  thickheart→saltlung→thinblood→vantier→fading priority) read by `pickDeath` — live modal and
  silent auto-roll agree. Measured: base DC 12 → sick 13 → managed 12 → 4-sick 15 (cap 18 holds).
- Ownership → events: NEW `ow-alpha-toll` (2+ claims + tension≥50, toll pays tension−25) + NEW
  `ow-prowess-rumor` (skill≥60 or stamina≥80, fame path); company → standing: profitable years
  +1–3 prestige by size, public/giant +fame, losing years −1 (`yearlyCompany`, silent-safe;
  measured +2/+2 when public+giant); pregnancy → actions/events: baby verb refuses double-pay
  while partner is expecting (real micro-bug: deduped start but still charged $3k), `baby-news`
  gated on no active gestation (`pregs.length == 0`, pre-gestation-save tolerant).
- Content 781 → 783 events (both new in mature 266→268), 0 orphans/mismatches; battery green
  (validate 783/0, lint 44/0/0/0, typo 44/0, migration 40/40, parity ok:true 1676/0/0, bootOK,
  all 6 eligibility gates live-verified both directions, 0 errors).
- Files: `genetics.js` (2 fns), `yearly.js` (2 hooks), `dynasty.js` (profit prestige/fame),
  `actions.js` (baby guard), `baby-news.json` (gate), NEW `ow-alpha-toll.json` +
  `ow-prowess-rumor.json` (+ regenerated packs/index/fallback), `ARCHITECTURE.md` (couplings note).

## v0.1.03.006 — 2026-11-27 — External-AI round 3 (20 claims, 5 fixed)

- Fixed: MCP postMessage now same-embedder-only (`window.location.origin` / perchance.org; direct
  `LL.mcp.handle` unaffected) + header corrected (write tools autosave like normal play).
- Fixed: `ARCHITECTURE.md` §4 rewritten to the actual ageUp order (bus dispatch → wTickWorld →
  advanceCalendar → body → social → ONE event slot → endYear; jail short-circuit noted).
- Fixed: PCG header renamed to WFC-inspired constrained sampler (ringOk closing-edge validation
  stands, not full WFC). Fixed: death screen "game legacy score — a game number, not a judgment
  on a life" + ledger "⭐ Game legacy" (label-only). Fixed: SCHEMA duplicate effects-parse line +
  fallback size rationale (622KB kept: lazy-loaded, zero happy-path cost, freshness enforced).
- Stood ground (measured/documented, no change): global shared scope (lint 44/0/0/0), one-event-modal
  + quiet years by design, dual loading paths, AI-text budgets (base 1048–1456 tokens), scope freeze.
  Proven false: "game.js 252KB in export" (no such file since Nov 24), yearly-order drift (docs).
- Battery: lint/typo/validate/migration/bootOK green, death screen live, 0 errors.
- Files: `mcp.js`, `pcg.js`, `death.js`, `i18n.js`, `anya.js`, `yearly.js` (comment), `ARCHITECTURE.md`
  (§4 order, §6 ECS/bus/compute/PCG), `SCHEMA.md`, `README.md`.

## v0.1.03.005 — 2026-11-27 — Family tree audit (2 real issues fixed)

- Tree showed generic "👪 Mom / 👪 Dad" while parents have real names since the genetics patch
  (roster already used names). Fixed in `openDynasty` (`actions.js`) + mermaid `dynastyGraphText`
  (`graphs.js`): now "👩 <name> / 🧔 <name>", Mom/Dad only as missing-data fallback — verified live
  incl. SVG node labels.
- Tree kid rows dropped the legitimacy/custody markers the Family-tab roster shows. Fixed: tree kid
  rows mirror the roster ("⚖️ contested", "🏠 with ex") — verified live with unmarried-partner twins.
- Rest of audit green (generation order, living/🕊️ states, mid-run grandparent death, partner row,
  heir gating, viewport fit). Note: snapshot.js still hangs on this modal (mermaid SVG) — DOM
  geometry/text used instead.
- Files: `actions.js`, `graphs.js`.

## v0.1.03.004 — 2026-11-27 — Hardening plan (lint + soak + validator edge + contracts)

- NEW `src/tools/namespace-lint.js` (worker): comment/string/regex-aware stripping, top-level
  decl collection, bare-call resolution, cross-file duplicate globals, LL member reads — real tree
  44 files / 0 unresolved / 0 duplicates / 0 llMissing (negative probe: all 3 tripwires caught).
- NEW `src/tools/soak-test.js` (page): seeded marathon (newLife → death/130y, modals auto-clicked)
  + dynasty sprint (date/propose/wedding/baby → death → continueAsHeir → 25 heir years); yearly
  invariants + per-decade deep checks; AI/network stubbed dead, everything restored in finally.
  Result ok:true (67y natural death, heir continued, 10 round-trips identical, errDelta 0).
- `validate-content.js` now deep-compares every pack-embedded event body vs its `events/*.json`
  source (negative tamper-test caught exactly, pack restored byte-identical).
- Docs as code: `SCHEMA.md` source-of-truth contract (events/ is ONLY truth; packs/index/fallback
  GENERATED, "regenerate, don't patch") + fallback policy; `ARCHITECTURE.md` §10 scope freeze (no
  new top-level systems; mods-first promotion) + §8 testing contract (lint + soak listed).
- Verification-only sessions folded here, not versioned separately: full battery ALL GREEN
  (validate 781/0, migration 36/36, parity 266/0/0, perf budgets pass, soak ok:true, 0 product bugs)
  and the critique-triage plan session (6-step plan, no code).
- Files: NEW `namespace-lint.js` + `soak-test.js`, `validate-content.js`, `SCHEMA.md`,
  `ARCHITECTURE.md`.

## v0.1.03.003 — 2026-11-27 — External-AI round 2 (8 claims, 7 fixed)

- Fixed **allele-order bug** (real): `inheritGenes` stored hets as Aa or aA raw; salt-lung carrier
  check wanted exact "Aa" → carriers misclassified as clear. Fix: canonical dominant-first ordering
  at creation + mutation re-canonicalized + tolerant reads + `genesEnsure` heals old saves
  (clear→carrier/atrisk only, never sick/managed/cured). Proven: 2000-draw Aa×aa → 50/50, zero
  non-canonical, both parent orders.
- Fixed **parent-role swap** (worse than stated: fully swapped for female players): `deliverPreg`
  always passed `S.genes` as dad. Fix: roles resolved from participants (`carrierFemaleFor`:
  partner record sex / NPC sex / name-list inference, default female) + donor/surrogate founder
  edges for same-sex; twinChance/mito/X/traits/appearance follow the resolved mom. Proven live both
  directions (mito + X correct).
- Fixed **PCG ring gap**: closing edge (Dec→Jan + into start month) unchecked despite BASE zeros.
  Fix: named `ringOk()` over all 12 month-order edges, failed walks retry, exposed as
  `LL.pcg.ringOk`. Proven: unit true/false/short + 300 live rhythms valid, fallback never hit.
- Fixed **migrate stamp-after-failure**: snapshot backup, restore on step throw, "partial:<id>",
  version NOT stamped, `window.__LL_MIGRATE_BACKUP`, afterLoad warns+toasts; migration-test case 9
  added (40/40). Fixed **Help mod text** ("events/verbs only" → four surfaces, no code). Hardened
  bus projection/commandCounts to return copies. Documented: ECS/CQRS by design, WebGPU policy
  (sync CPU 0.1ms vs async GPU ~219ms — sync on hot tick, async opt-in for bulk), game.js already
  absent since Nov 24.
- Battery: validate 781/0, lint/typo/migration/parity green, perf all-pass + compute agree:true,
  soak ok:true (45y + 2-kid dynasty), 0 errors.
- Files: `genetics.js`, `ownership.js`/`dynasty.js` (carrierFemaleFor), `pcg.js`, `bus.js`,
  `migrate.js`, `migration-test.js`, `compute.js` (header), `mods` Help copy, `SCHEMA.md`/`README.md`
  notes.

## v0.1.03.002 — 2026-11-27 — Intro music autostart

- Complaint: intro music only began after clicking, rendering it meaningless. Root cause: browsers
  block audible `play()` before the first gesture; the overture only started in the tap handler.
- Fix (`prelude.js`): overture autostarts MUTED at load (policy allows muted playback) and unmutes
  on the first tap (introShowcase path + document-level once pointerdown/keydown → `preludeUnmute`);
  `stageMusic()` clears muted before play; `musicAllowed()` (user mute) respected — muted users stay
  silent. Locked-down browsers play muted from load, audible from first tap — the score is underway
  either way. Verified live (currentTime advancing pre-tap, unmute + ramp on tap), bootOK, 0 errors.
- Files: `prelude.js`.

## v0.1.03.001 — 2026-11-26 — Diminishing-returns stat balance (emergency)

- Root cause (real, reproduced): stat gains were LINEAR with a hard clamp — school alone gave +3
  smarts/yr free (50→95 by 15), repeatable verbs stacked uncapped (study +12/yr, read +9, library
  +12, jog +12…); any regular play maxed everything by the mid-teens.
- Fix (no save-shape change, no migration): NEW `gainStat(key,delta)` in `state.js` — quadratic
  diminishing returns on GAINS (full at/below 50, ~(headroom/50)^2 above, 6% floor, losses always
  full); routed all 174 same-key gains across 10 engine files through it (actions, yearly incl.
  school, director adjudication, ai-actions, appearance compliments, dynasty/world/render/ownership/
  events-runtime). Birth/identity boosts (traits, backgrounds, custom attrs) stay linear by design.
  Event `stat` fx uses the same curve via worker-safe local `_statDR` in `effects-run` (both loader
  paths identical → parity holds). PLUS moderate nominal trims on the most efficient free
  repeatables (study 4→3, read 3→2, library 4→2, school 3→2 base, gym 7→6, doctor 10→8, diet/sleep/
  tummy/playout/hike trims — 34 lines; happiness untouched, self-balances via yearly decay).
- Measured (live, seeded): grinder (100+ clicks/yr) peaks at 86 by 15, nothing ≥90; casual (6
  verbs/yr) lands ~80 trained stats, untrained stay low; genius edge intact (+12 start, same curve);
  neglect still dies 43–45 across 3 seeds (was ~40s); maintained life reaches 76 dying with hp 73
  (accident/age dice, not upkeep failure); save/load round-trip identical; migration 36/36,
  parity ok:true 2110/0/0 (781/781 events), typo 43/0, validate 0 errors, bootOK, 0 console errors.
- Files: `state.js` (gainStat), `effects-run.js` (_statDR + stat case), `boot.js` (EXPECT_GLOBALS),
  `actions.js`, `yearly.js`, `life.js` (gainKarma allow), `director.js`, `ai-actions.js`,
  `appearance.js`, `dynasty.js`, `world.js`, `render.js`, `ownership.js`, `events-runtime.js`.

## v0.1.03 — 2026-11-26 — Genetics engine + saving throws for sudden death

- Built the **genetics engine** (NEW `src/engine/genetics.js`, single source of truth): 9
  autosomal loci (red hair / freckles / dimples / heterochromia AR, balding sex-influenced,
  hirsutism AR, twinning AD maternal-effect + Vantier/salt-lung disease loci), 2 X-linked
  (color-blindness, thinblood), 1 mitochondrial (fading-light), 7 polygenic scores (-1..1:
  height/tone/build/cog/beauty/metab/longv); founder genotypes from population freqs, kids via
  segregation (one allele per parent, midparent + noise for poly, 2% de novo); phenotype
  resolution incl. sex/age (balding stages deterministically by age).
- Fixed **nameless parents**: `R.mom`/`R.dad` are named person records with genomes chained
  grandparent → parent → player → sibling, plus living NPC mirrors (jobs, savings, chat,
  death); every NPC carries a founder genome + stable imgSeed (chat/event art no longer reuses
  the player seed); babies take genes/appearance/sex/congenital traits from the real parents
  (twins run maternal); heirs continue the bloodline on takeover; roster shows real names +
  bloodline row.
- Added **sex-aware custom life**: facial-hair section gated for females on the hirsutism gene
  (reverse-mapped from the chosen look, the gene is the gate); figures/markers filtered;
  lineage markers + family-illness select write the starting genome, so the designed face and
  the carried blood agree.
- Added **6 hereditary diseases** (Vantier's decline, salt-lung, thinblood, sweetblood,
  thickheart, fading-light) with onset windows, yearly onset rates, treat/manage paths, and
  absolute cure years checked against `S.year` (the future can cure the past); status machine
  clear/carrier/atrisk/sick/managed/cured on `S.genDx`; onsets only from genotype (never out
  of thin air), max one genetic event per year, silent fast-forward years only progress, never
  diagnose; `yearlyGenetics` tick (balding, hirsutism emergence); 🩺 Doctor verb screens the
  hidden bloodline; longevity genes bend the mortality dice, unmanaged thickheart adds sudden
  cardiac risk.
- Fixed **silent sudden death** (`src/engine/yearly.js`): the mortality dice now buy a crisis,
  not a corpse — live years open a 💀 Death Knocks modal (despair deaths 🕯️ The Edge of the
  Grey) with a visible d20 + stat bonus vs DC on the buttons (fight = health+fitness,
  calm = discipline+health, reach = social+ties, endure = discipline+health; nat 20 saves,
  nat 1 fails, health≥80 advantage; DC 10 + age curve + cause weight, cap 18 physical /
  flat 11 despair); 🕊️ Let go always offered; survival costs injury (12–25 health, +8 stress,
  −6 happiness, +3 prestige); silent years auto-roll the best bonus off-screen and log the dice;
  flatline (health 0) still kills outright. Crisis reuses `showEvent` (first-click lock, custom
  row hidden during crisis, restored on all exits); no save-shape change, no migration bump.
- Measured: champ (100hp/60fit, 30yo, DC 12) survives 1876/2000 (93.8%); frail senior (75,
  DC 13, −3) 465/2000; all-50s 40yo 915/2000 — rare crises (~0.4%/yr) so lifetime impact is small.
- Fixed **stale modal on restart**: `newLife()` now closes any open event modal, so a
  diagnosis/crisis dealt moments before a restart can no longer linger over the fresh life
  (found by the v0.1.03 test pass: a Vantier's diagnosis modal survived into the next life).
- Verified: segregation exact in probes (Aa×Aa→25.1% aa, XL carrier-mom→sons 50%, midparent mean
  0, dominant Aa×AA→100%); sex gating live (female+hirsutism keeps beard, without → forced
  clean-shaven); named-parent + NPC-mirror chain checked; disease onset/treatment/cure paths live;
  birth resemblance split across both parents (60/60 sims ≥7/14 axes each); old-save strip-test
  clean ("Mom" renamed, everything backfilled, chain holds); save/load byte-identical;
  harnesses green (migration-test 36/36, parity 266/0/0, validate-content 781/0, typo-scan
  clean), bootOK true, 8-year soak alive, 0 console errors. One artifact noted: in-flight async
  fireEvent can land seconds later (pre-existing race, unrelated).

## v0.1.02 — 2026-11-25 — Official version stamp + Director & safety pass

- Declared the canonical game version **v0.1.02**, stored as `LL.APP_VERSION` in
  `src/engine/migrate.js` (single source of truth, alongside the numeric save/content versions).
- Surfaced the version in 5 places: `main.pjs` header comment, start-screen footer
  ("· v0.1.02"), MCP `initialize` server info, `src/README.md` title, `src/docs/ARCHITECTURE.md` title.
- Save format untouched — no migration bump, all old saves load as before.
- Fixed **Director Mode defect 1**: opening it with no live life silently did nothing — now toasts
  "✨ Start or load a life first — Director needs a soul to direct."
- Fixed **Director Mode defect 2**: unbounded AI waits wedged the modal for up to ~300s — staging
  is now bounded (scene ~90s + repair ~45s, then deterministic fallback), narration capped at 25s,
  with an elapsed ticker and an honest "~90s max" label.
- Added **✖ Cancel** to Director staging: a run-token (`directorRunId`) drops late AI results and
  restores the UI, plus a token bump drops late-arriving art.
- Added **Director minor safety**: a MINOR RULE sentence is appended to all 4 Director AI tasks when
  the soul is under 18 (non-graphic/implied, mechanics intact).
- `paintScene` now **skips sexual-scene art for minors** (keyword-tested; dates, kisses and romance
  are unaffected) and the loader says so honestly.
- Added **FTUE**: a first-life-only birth-log orientation tip (`ll_ftue_v1` flag, never repeats) plus
  a pulsing gold ring on the Age+ button while under age 3 (reduced-motion safe).
- Fixed the **stale-face portrait bug**: changing identity (new life / load / heir / growTo) now
  clears the old portrait instantly and shows the new life's avatar until the fresh paint lands —
  previously the previous face lingered 8–120s and read as "my choices were ignored".
- **Pro audio compression**: music re-encoded to 128k MP3 and the 12-file SFX bank to 80k mono MP3
  (~35% smaller: 7.2MB → 4.7MB), with per-file gapless-trim offsets measured at encode time.
- Swapped the favicon to a permanent PNG (`src/images/favicon.png` → uploads URL), wired into
  `$meta icon`, render-time favicon, static `rel=icon` and `apple-touch-icon`.
- Trimmed the `#app` bottom blank band (110px → 48px) and the footer to a single line.
- Shipped 6 marketing screenshots (3 desktop + 3 mobile) + a separate adult-gated Director scene shot.
- Verified: migration-test 36/36, validate-content 781/0, parity 266/0/0, typo-scan clean, bootOK true,
  full 5-year playtest with save/load round-trip, 0 console errors.

## v0.1.01 — 2026-11-24/25 — Architecture, providers, performance

- Added a real **ECS layer** (`ecs.js`): recycled entity ids, bitmask components, column stores,
  cached queries, named systems — market tickers and NPCs run as entities.
- Added **EDA + CQRS-lite bus** (`bus.js`): `dispatch({type})` commands (act/age with timing),
  append-only event journal, pure `query()` reads, projection read-model (acts/ages/ticks/births/deaths).
- Added **WASM RNG** (`wasm/rng.wasm` + loader): xorshift + gaussian, validated over 20k draws,
  reseeded per soul at birth; central `rnd()` routes through it with a Math.random fallback.
- Added **WebGPU compute** (`compute.js`): WGSL `gbmBatch` + `lerpBatch` kernels with typed-array CPU
  fallback; fixed 3 real GPU bugs live (float-corrupted u32 uniform, stripped `vol` binding breaking
  auto-layout, STORAGE buffers missing COPY_DST) — GPU now bit-matches CPU.
- Added **CG-WFC year-rhythm + LLM guidance** (`pcg.js`): 12-month transition ring modulated by life
  context, deterministic per life+year, one log line per year; `modifiersFor` (income/stress/health/
  mood/GDP) wired into work/body/money; `eventWeightMult` (0.35–2x, never suppresses key events)
  wired into event selection; plan lines feed AI prompts and the Director STAGING PLAN.
- Added **MCP JSON-RPC 2.0** (`mcp.js`): 14 tools (life.new/act/actMany/age/status, market.status/tick,
  world.news, npc.list, pcg.guide/plan, bus.journal/projection, log.tail) + 6 resources + prompt
  templates; fixed a self-echo storm (replies re-processed as requests) by handling method-calls only.
- Drove the architecture into the sim (no new files): NPC aging/economics as ECS systems, social
  drift as one compute batch, ageUp/endYear on the bus, rhythm line in every AI prompt tail.
- Added the **AI provider registry** (`ai-providers.js`): Perchance built-in default + optional
  OpenAI-compatible BYOK endpoint (key in localStorage only, test-both button, third-party notice),
  auto-fallback chain, stoppable, vision-Blob support — all 19 `aiText` call sites behave identically.
- Added **offline support**: `#offlineBar` + online/offline listeners, Help copy, ARCHITECTURE §7,
  and a 10-year offline drill in the perf harness (0 throws, 0 stuck).
- Wrote the **ARCHITECTURE.md** one-page contract (load order, save contract, tick order, testing
  rules) and **perf-test.js** budgets: newLife ~30ms, ageUp ~22ms median, fire-pick ~0.04ms.
- **Audio overhaul**: replaced the flaky embedded-radio player with shipped MP3s — cinematic
  ambient score + intro/auth/loader legs with crossfades — plus a 12-file synthesized offline SFX
  bank, a stall watchdog (frozen-clock retry), and a fixed loader-poison bug.
- Built the **cold-open prelude**: ember canvas + drawing crown intro, staggered title reveal,
  auth screen (device-local accounts with salted hashes + lockout, guest mode, sessions), ~6s
  cinematic loader with staged captions; music follows every leg.
- Added **500 new events** (281 → 781 unique, 0 validator errors; under-18 batches carry zero adult
  tags) and the **dedup `mature` pack layout** (content v3 → v4: buckets carry only exclusives,
  everything else 18+ lives once in `mature`, lazy-loaded at 18) with a brute-force 0-orphan proof.
- Shipped the **mod system** (`mods.js`, `MOD_SCHEMA = 1`): repo mods + player pasted-JSON (pure data,
  400KB cap), 5 surfaces (bucket events, tab verbs, yearly twists, AI flavor, repo-script hooks),
  quarantine-first validation, Help 🧩 UI with enable/disable/remove, `validate-mods.js` harness;
  core-colliding verb ids are rejected at registration and by the validator.

## v0.1.00 — 2026-11-24 — Systems expansion + fairness + resilience

- Built the **schema version + migration system**: `SAVE_VERSION` 7, `CONTENT_VERSION`,
  `EVENT_SCHEMA`, ordered idempotent steps (never edited in place), downgrade/"newer" guards,
  corrupt-save gate, per-event schema upgrades, `migration-test.js` (36/36); validator and
  build-events derive versions from `migrate.js` instead of hardcoding.
- Fixed **image generation end-to-end**: basic-leg-first race (advanced joins as backup), per-attempt
  timeouts, prompt caps, null-safe fallbacks, tap-to-retry loaders, avatar fallback for portraits,
  and a 🎨 Art toggle for fully offline text-only play.
- Fixed the **passive death spiral**: unemployed adults earn day-labor food money, homelessness
  quarters living costs and freezes debt interest, stray negatives fold into debt at year start,
  and 💸/health/stress warnings name the remedy (Jobs / Side hustle / Doctor) — neglect now kills
  slowly with notice instead of silently at 27.
- Made **senior risk frailty-scaled** (fit 75-year-olds resist like fit 75-year-olds): natural lives
  land ~80–95, engine proven alive to 105 with save round-trip at 100.
- Added the **company war**: rival firm per company (growth, poaching, price wars, hit pieces),
  hostile buyout bids at 1.25x when dwarfed (accept 🤝 premium sale / snub 🦁 +hostility),
  gang-heat raids on company cash (security halves), buyout achievement.
- Added **gestation/custody**: conception → 3 trimesters → delivery (miscarry risk, 12% twins),
  legitimacy + affair scandal/karma, divorce per-kid custody rolls (money/prestige/karma/luck),
  sue-back verb, prenatal care, $3k yearly support.
- Added **16 achievements** (localStorage store, toast + milestone log, dynasty-grid rendering with
  top-4 collapsed view) and the **nemesis arc** (heat 0–100, yearly beats, 3 endings: bury/expose/ruin).
- Added the **death ledger** (peak net worth, lovers, corruption, nemesis outcome, milestones) with
  📋 Copy, plus **typewriter event streaming** (click-to-complete, reduced-motion instant).
- Made chat **epic multi-bubble**: fast first message, per-leg bubbles, dynamic length
  (standard ~900 words / `/long` 2000+ / `/short` brief / `/medium`), Continue appends, Retry
  regenerates, `/world` narrator chapters, `/img`, `/clear`, `/help`, autocomplete dropdown.
- Fixed **event portraits**: composition-first prompts (wide shot, everyone visible, never a
  close-up) with fresh per-call seeds for scenes/events; portraits keep the locked identity seed.
- Expanded **appearance DNA v2**: 20 skins, 18 eyes (incl. heterochromia), 12 builds, 7 heights,
  10 figures, 24 hairstyles, 22 hair colors, 8 lengths, 12 faces, 11 facial-hair, 19 marks,
  14 styles, 12 voices — heritage-correlated pools, stat weights with live modal preview.
- Set the **portrait repaint cadence**: refresh on age-gap ≥3, every developmental tier change,
  job/partner/kids/house change, or after any failed generation (retry next year, never 5 frozen years).
- Hardened **saves for sandboxed iframes**: 4-tier chain (kv-plugin → native IndexedDB mirror →
  localStorage → in-memory) with 8s-raced newer-wins adoption, so a blocked store degrades to
  "Download save" instead of losing lives.
- Gave **every AI call a timeout** with stop-first semantics (fixed a plugin quirk where `.stop()`
  resolves instead of rejecting) and reachable deterministic fallbacks for biography, obituary,
  NPC chat and Director custom scenes.
- Added **bug-watch**: console/error/rejection capture, 5-year auto-report toasts, topbar 🐛 badge
  (hidden at rest) + error-log modal, Help entry point, auto-mode that skips open modals.
- Added the **boot health check**: 40+ files, key globals, versions and load sequence verified with
  `__LL_BOOT_OK` / `__LL_BOOT_MISSING` and a recovery banner that names what's missing.
- Adopted **remember-plugin** (tab + fate realm survive reloads), **mermaid dynasty/divergence
  charts**, lazy **community guestbook**, and **Wikipedia grounding** (≤280-char cached summaries,
  fictional worlds labeled inspiration-only).
- Hardened **load order** (I18N null-guards, live FX binding, sequence check, every file registers
  last so half-loaded files read as missing) and added **S-typo tripwires** (`checkS` warn-only +
  `typo-scan.js` over all 40+ engine files).
- Removed the confusing chapters stage, hid the AI pill from the topbar, made crimson the default
  theme, fixed the 640px music-iframe overflow and the forced-dark-controls bug.

## v0.0.01 — First playable life sim

- Core **birth → death loop**: CK3-style traits, childhood → school (majors, scholarships) → 40
  careers → love/weddings/twins → feasts, hunts, elections, startups → fame, prestige, dynasty,
  heirs → ribbon + AI obituary.
- **Yearly pipeline**: world tick → jail short-circuit → calendar → body/work/money → social/family/
  fate → events → endYear (story, ambition, burnout, history, autosave, render).
- **Event engine**: age-bucketed packs with weighted picks, preconditions, multi-choice outcomes,
  once-per-life and yearly budgets, anti-repeat rotation.
- **7 save slots + autosave** (localStorage) with download/import and byte-identical round-trips.
- **AI biographer** (life story, yearly beats, obituary) + **photorealistic AI portraits** on a
  locked seed with appearance DNA for consistency + cinematic event stills.
- Start screen (random + custom lives, quick-start presets, theme picker, "How a life goes" card),
  **8 game tabs** (activities, education, money, health, social, family, crown, world), create-a-life
  modal with 205 countries and heritage picks.
- Jail + underworld + crime sprees, stock market (10 tickers, dividends, analyst outlook) +
  companies, NPC life sim (jobs, marriages, babies, deaths, rivalry, rumors), world timeline with
  divergence tracking, Anya help guide.
- Dark/light themes, EN/ES i18n beginnings, music + SFX, full birth-to-death playtests green.
