# LIFE & LEGACY — Architecture (v0.1.06)

One-page contract for anyone touching this engine. Read this before adding a
file, a global, or a save field. Details live in `src/README.md` (systems)
and `src/content/SCHEMA.md` (content); this file is the *rules*.

## 1. Shape of the system

Classic `<script>` tags in `index.html` order (bottom of the file, currently
`src/i18n.js` → `src/data.js` → `src/engine/*.js` → `boot.js`). Shared scope:
**bare globals**, no modules, no build step. That is a deliberate constraint
(zero-build, works from any static host), and it makes load order load-bearing:

- `LL.files` registry: every engine file pushes its name as its **LAST line**,
  so a file that throws mid-load reads as missing. `boot.js` health-checks
  presence **and sequence** against `index.html` order.
- `state.js` must not hard-read other files at load time (null-guarded).
- `effects-run.js` binds `LL.fxParse` lazily at call time, never snapshots.
- Rule for new code: **call-time resolution, never load-time snapshots.**
  If file B needs file A, read `window.A` / `LL.x` *inside the function*.

## 2. The save (S) — the only mutable truth

`S` is one global object (see `src/engine/state.js`, shape filled by
`migrate.js` steps v4–v7). Spine (never absent after migrate): `stats`,
`relationships`, `log[]`, `age`, `assets`, `world`, `flags`, `education`,
`sex`. Fixed-shape tables: `STAT_KEYS` (9 stats — unknown keys trip the
`checkS` typo warning on purpose). Intentionally dynamic: `S.flags.*`,
effect `setPath` targets.

Rules:
- **Migrations only append.** Never edit an old step; add `{v: SAVE_VERSION+1}`
  and bump. Old saves must always converge to the same shape.
- **New fields are undefined-safe.** Everything the yearly tick reads must
  tolerate `undefined` (old saves, mid-life loads).
- **Validate before replacing** (`validateSave` gates slot/autosave/import
  loads). Repair is additive-only (`sexEnsure` fills; nothing ever wipes).
- `S.v` stamps `LL.SAVE_VERSION` on `newLife`, not on load.

### Saves path (opinion, recorded 2026-11-25)

Today saves live in four tiers (kv, IndexedDB, localStorage, memory) under scattered keys. That is deliberate and stays: the tiered chain is why saves survive sandboxed iframes, and every tier is verified. A dedicated saves path — one canonical namespace behind a single SaveStore with the tiers as backends — is the right move ONLY when cloud sync lands (one hook point for upload/download; readers fall back to legacy keys, writers go canonical). Until then it is churn on a verified system for zero player benefit: do not centralize keys without a sync feature paying for the re-verification.

## 3. Boundaries (where bugs are not allowed to cross)

| Boundary | Adapter | Rule |
|---|---|---|
| AI text | `aiText(opts, ms)` in `ai-core.js` | Only entry point. Always settles (timeout rejects `aiTimeout`); missing plugin rejects, never throws sync. Every caller has a deterministic fallback. Routes via the provider registry (`ai-providers.js`); perchance default, OpenAI-compatible endpoint optional. |
| AI images | `requestImage()` in `events-runtime.js` | Always resolves (null on total failure, never hangs). Every painter keeps a non-AI fallback + tap-to-retry. Art is globally killable (`toggleArt`, persists). |
| Storage | `saves.js` tiers: kv → IndexedDB → localStorage → memory | `saveTo`/`loadFrom` never throw; one-time "storage blocked" toast. Same `{savedAt, state}` shape in every tier. |
| Content | packs in `src/content/` + `index.json` | Loader merges compiled packs deduped by id; `mature` overlay lazy-loads at 18+. Validator (`validate-content.js`) is the law: 0 errors or the content doesn't ship. Generated `content-fallback.js` is a transport backstop, not a source. |
| Mods | `mods.js` registry + `src/mods/` + player JSON | JSON-first, no player code ever; same validator grammar as core; quarantine-first loading; enable/disable and re-merge live; mods only ADD, never override core ids; carry no save shape. |
| Network data | `research.js` via `superFetch` | Cached, throttled, never throws; empty grounding = valid state. |
| Randomness | `rnd()` in `utils.js` → WASM xorshift when ready, `Math.random` fallback | `reseedWasm` per soul on `newLife`. Deterministic-per-soul for rhythm/plans; never assume crypto. |

New external capability? Add it **behind an adapter with a fallback and a
kill-switch** (see §7), never as a direct call from game code.

## 4. Yearly tick order (in `yearly.js`)

`ageUp` (the single entry; jail years short-circuit inside it) runs:
bus `age` dispatch → ensure world → `wTickWorld` (market/macro first, so the
year's economy exists before salaries) → `advanceCalendar` (age/year++,
`perYear` reset) → body systems (`yearlySchool` → `yearlyWork` → `yearlyMoney`
→ `yearlyBody`, which owns the mortality dice: a failed roll raises a death
crisis, never a corpse) → social systems (`yearlyFamily` → `lifestyleTick` →
`yearlyGenetics` → `yearlyFate` → `runDynastyDepth` (underworld → children → company → sex → pregnancy → `yearlyHouseTick` → achievements) → `wTickLife`) → events
(`runYearlyEvents`: kids flavor ≤12, then ONE slot — a live death crisis IS
the year's event, so no second modal ever stacks; silent years stay quiet) →
`endYear` (`maybeStory` → ambition → flag overrides → burnout → history →
rhythm line + bus `year.committed` → autofocus → `checkS` → mod yearly hooks
→ autosave → render). Death exits early (body-death path clamps before
`endYear`). Jail years: `serveJailYear`/`doJailYear` + `jailFamilyAging` instead
of the body/social/event blocks, then the same `endYear`.

## 5. Events

`events-runtime.js`: `ensureContentForAge` (lazy per bucket + `mature` at 18+,
prefetch next) → `contentMerge` (dedupe by id, `migrateEvent`, compile) →
`fireEvent` (eligibility `minAge/maxAge` + compiled `cond` + `noBad` filter;
rotation via `seenEvents`, weighting via `LL.pcg.eventWeightMult`; mod events join the pool at bucket merge time and flow through the identical pipeline) →
`showEvent` (first click wins, stream text, paint, log). Empty pool = quiet
year (ages 101+ today — known gap, no crash). Custom response / custom event
ideas route through `ai-actions.js` with the same `sanitize → applySceneFx`
discipline as Director.

### Cross-system couplings (explicit, tested — not emergent accidents)
- disease → mortality: `genCrisisMod` (+1 DC per unmanaged sick disease, cap 3) prices the saving throw; `genDeathCause` lets an unmanaged sickness write the death cause. Managed/cured blood adds nothing — treatment is the counterplay. Both live in `genetics.js`, read by `deathSaveDC`/`pickDeath` (so live modal and silent auto-roll agree).
- company → standing: profitable years +1–3 prestige by size, public/giant names +fame, losing years −1 prestige (`yearlyCompany`, silent-safe). Prestige feeds renown; fame/prestige/net-worth feed nemesis envy (1.6x heat); nemesis company/career beats and rival muscle hit the company back.
- ownership → events/chat: claim-count, corruption, xp, skill/stamina and harem-tension gates on ow-/sx- events; stage/obedience/jealousy/corr and claim pregnancy shape chat openers + the OWNERSHIP prompt block.
- pregnancy → actions/events: the baby verb refuses double-pay while the partner is already expecting; `baby-news` requires no active gestation (`pregs.length == 0`, tolerant of pre-gestation saves); claim `preg.state` shapes chat tone and Director breeding arcs.
- npc agency → everything: `npcAgentLearn` (called from `npcMem`, so all 15+ memory sites feed it) keyword-scores history into `agent.trust`/`agent.grudge`; `npcTrustScore` gates loans and unlocks unsolicited help; insults/gifts gossip along `n.bonds` to the victim's close circle; `npcTickAgent` (inside `wTickNPCs` — silent fast-forward and jail years included) pursues explicit goals with player-conflicting completions (lost promotions, jealous lovers, undercuts) and grudge-driven open rivalry; `npcPersonaLine` feeds goal + felt stance to chat AI. Depth inside world.js + render.js hooks, not a new engine system.
- One-modal rule holds throughout: a death crisis IS the year's event, so a crisis year never stacks a second modal.

## 6. Layer map (what drives what)

- **ECS** (`ecs.js`): market tickers + NPCs as entities; systems run the loops
  DOD-style. Organizational overlay by design: components hold REFERENCES to
  the live `S` objects (zero drift, zero migration), never a packed copy — the
  single mutable save `S` stays the only truth. Lazy re-registration after
  reloads (`wEnsureMarketECS`); scalar fallback if ECS missing.
- **Bus/CQRS** (`bus.js`): `dispatch` commands (`act`, `age`), `emit` events
  (capped session journal), pure `query` reads + `projection` read-model.
  Observation layer by design, not a command-owns-execution architecture:
  existing code stays the executor; the bus records alongside it.
- **Compute** (`compute.js`): WebGPU WGSL kernels with CPU fallback; GPU must
  bit-match CPU (proven live when touched). Routing policy (measured): the live
  tick calls the SYNC CPU kernels — at tick sizes (10 tickers, dozens of NPCs)
  dispatching to the GPU costs ~2000x more than computing. The async GPU twins
  are the opt-in path for bulk work. New kernels follow the same rule.
- **PCG** (`pcg.js`): year rhythm from a WFC-inspired constrained sampler
  (random-start ring walk, weighted picks, forward pruning, ring-closing
  validation, bounded restarts — NOT full WFC: no entropy selection, no
  backtracking; header says so), deterministic per life+year.
  `modifiersFor` → yearly money/body, `eventWeightMult` → `fireEvent`,
  `planLine` → prompts + Director staging constraint.
- **MCP** (`mcp.js`): JSON-RPC tools/resources over direct calls + postMessage.
  Never process our own replies (the self-echo storm lesson).

## 7. AI-provider + offline posture

- Providers are a **registry, not a rewrite**: `{id, label, text(), image?()}`.
  `perchance` is always present and default (zero config). An OpenAI-compatible
  endpoint (`baseURL` + `model` + key, e.g. OpenAI, OpenRouter, local bridges)
  is opt-in via the Help → AI-engine section; the key lives in `localStorage`
  only, is never logged, and the UI states where content goes (third-party
  notice at the point of use).
- Chain: active provider → other configured providers → deterministic
  fallback. Narration-only calls get short timeouts; adjudication calls get
  the fallback guarantee. A dead AI must degrade to "fate improvised", never
  to a wedged spinner (Director proved the pattern: bounded waits + cancel).
- Offline = valid state: all content/audio/ships in `src/`; saves are local;
  `navigator.onLine` + `online`/`offline` events drive a banner and honest
  control states; AI surfaces fall back exactly as if the AI errored fast.
  `perf-test.js` has an offline drill (network+AI stubbed dead, 10 years,
  zero throws, zero stuck spinners) that must stay green.

## 8. Testing contract

- Worker harnesses (no DOM): `validate-content` (incl. pack-body deep-equality
  vs `events/` sources), `validate-mods`, `typo-scan`, `namespace-lint`
  (cross-file global resolution: every bare call must resolve to a declared
  engine global; cross-file duplicate top-level declarations fail).
- Page harnesses (`page_eval` with `{path}`): `migration-test`, `parity-test`,
  `perf-test` (budgets below — warn, don't gate, on mobile-class hardware),
  `soak-test` (seeded marathon: natural life to death/130y + scripted
  dynasty with heir continue; invariants yearly + per-decade).
- Live playtest after engine edits: birth → years → event choice → verbs →
  save/load round-trip identical, zero console errors, bug badge hidden.
- Budgets (desktop; mobile ×3): median `ageUp` < 50ms, `fireEvent` pool pick
  over full 781 < 5ms, `saveTo`+`loadFrom` < 50ms, boot parse→interactive feels
  instant behind the veil (the veil is cinematic, not a loading excuse).
  Measured desktop baseline (perf-test, 2026-11-25): newLife ~30ms, ageUp
  median ~22ms / max ~46ms over 20 years, fire-pick ~0.04ms, save+load ~36ms
  round-trip identical, offline drill 10 years / 0 throws / 0 stuck.

## 9. Mods (the supported expansion path)

- Surfaces, only these five: bucket events, tab verbs (declarative effects via the validated executor), yearly twists, one AI flavor line each (capped, appended after the bus tail), repo-script JS acts and yearly hooks (same trust as engine; never load remote or user JS as scripts).
- Add, never override: base packs merge first, dedup by id, core action ids shadow mod verbs (collisions skip with a warning at registration and fail `validate-mods`).
- Quarantine-first: bad mods list in Help with reasons; the game never throws for a mod. Enable and disable strips and re-merges events without reload; player mods uninstall cleanly.
- Pins: `LL.MOD_SCHEMA` is a hard gate, `contentVersion` drift is a warning. Authoring contract: `src/mods/README.md`.

## 10. Growth rules (unlimited expansion without rewrites)

- New content → new packs/overlays, never wider core files. Adult-side layout
  (`mature` overlay) is the template: exclusive buckets + one spanning overlay.
- New mechanics → new effect ops (`effects-parse/run/validate` + validator
  coverage) or new Director fx keys (`sanitizeDirectorFx` + `applySceneFx` +
  Anya docs). Effects must compile, validate, and survive `parity-test`.
- New UI → tabs/panels follow the existing `TABS` + `doAct` + collapse/filter
  pattern; every button wires through `boot.js` init.
- New AI surface → prompt via `aiPrompt` (prefix-cache order: static preamble
  → append-only log → dynamic state → task), call via `aiText`, fallback
  mandatory, Anya topic entry mandatory.
- Never: plaintext secrets in code (server script is public source);
  `update()` on plugin areas with dynamic content; synchronous assumptions
  about AI/network/storage.
- Versions + logs (standing rule, 2026-11-27): until the next minor/major is
  declared, EVERY game-tree change (code, content, docs, tools) ships as the
  next `v0.1.03.00N`: bump `LL.APP_VERSION` in `migrate.js` + the 5 surfaces
  (main.pjs header, start-screen footer, MCP fallback, README + ARCHITECTURE
  titles) and add a `src/CHANGELOG.md` entry in the dense dev style. No silent
  changes; verification-only passes fold into the latest entry, never a version.
- Scope freeze (2026-11-27): NO new top-level engine systems until the
  hardening plan lands. Depth work only (heir chains, disease breadth,
  event coverage 101-120). New ideas go through Mods (§9) first — if a mod
  proves the mechanic, promotion to core is a deliberate versioned decision,
  not an experiment in the engine tree.
