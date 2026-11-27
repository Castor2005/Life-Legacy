# Modding Life & Legacy

Data mods add **events, tab verbs, yearly twists, and AI flavor** — no engine
edits, no save-shape changes. The game validates mods with the same gates as
core content and quarantines failures, so a bad mod can never break a life.

## Where mods live

- **Repo mods** (ship with the game): files in `src/mods/`, listed in
  `src/mods/index.json` (`{"mods": [{"id": "...", "file": "..."}]}`).
  Enable by default; set `"defaultOff": true` in the mod JSON for opt-in
  demos (like `example-tales`).
- **Player mods**: pasted as JSON in Help → 🧩 Mods. Pure data, stored in
  `localStorage` (`ll_mods_player`, 400KB cap). No code, by design.
- **Repo script mods** (advanced): an index entry `{"id": "...", "file":
  "mechanics.js", "js": true}` loads a classic script that calls
  `modRegister({id, acts: {verbId: fn}, yearly: [fn], prompt: [...]})`.
  Same trust boundary as the engine — never load remote/user JS this way.

## Mod JSON shape (MOD_SCHEMA 1)

```json
{
  "id": "my-mod", "name": "My Mod", "version": 1,
  "eventSchema": 1, "contentVersion": 4, "defaultOff": false,
  "events": [ { "id": "my-mod-storm", "minAge": 10, "maxAge": 80,
    "title": "…", "tags": ["mod"], "weight": 2,
    "text": "…{{s.firstName}}…", "preconditions": null,
    "choices": [{ "label": "…", "hint": "…",
      "effects": [{ "op": "stat", "key": "happiness", "delta": 4 },
                  { "op": "outcome", "tpl": "…" }] }] } ],
  "verbs": [ { "id": "mymodverb", "tab": "activities", "label": "Do thing",
    "sub": "happiness+, $50", "minAge": 12, "cost": 50, "once": true,
    "effects": [{ "op": "stat", "key": "happiness", "delta": 5 },
                { "op": "outcome", "tpl": "…" }] } ],
  "yearly": { "chance": 0.5, "minAge": 18,
    "effects": [{ "op": "outcome", "tpl": "…" }] },
  "promptBlock": "one flavor line for the AI (200 chars max)"
}
```

Rules:

- **Events** use the exact core grammar (`src/content/SCHEMA.md`): same ops,
  same `{{template}}` text, weight 1–10, ages 0–120. Event ids must be unique
  across core + all mods — first registered wins, later ones are quarantined.
- **Verbs** run their `effects` through the validated executor on tap (money
  `cost` first). `once: true` = once per year; `cap` reuses a core yearly
  budget key (e.g. `"study"`). Tab must be a real tab id; buttons appear with
  a 🧩 prefix and obey minAge/maxAge. **A verb id that matches a core action
  is shadowed by core** — the validator rejects it, so name verbs distinctly.
- **Yearly** effects run silently at each year end (`chance` 0..1 gates it;
  an `outcome` op surfaces as a 🧩 log line, otherwise silent).
- **promptBlock** (≤200 chars) is appended to AI prompts, capped at 400 chars
  total across mods. Keep it flavor, not instructions.

Version pins: `eventSchema` newer than the engine quarantines the mod;
`contentVersion` drift is a warning only. Bump `version` when you edit.

## Testing a mod

1. `node` not needed — run the harness in this workspace:
   `src/tools/validate-mods.js` (same runner style as `validate-content.js`).
   It checks every mod: manifest, event grammar, verb/yearly effects,
   id collisions vs core content + verbs + across mods, pin sanity.
2. In-game: Help → 🧩 Mods lists registry + quarantine reasons. Enable the
   mod, live a few years, fire events — the 🧩 log lines and verb buttons
   prove each surface. Disable to strip its events from the pool.

## Limits (v1, deliberate)

- Mods **add**; they cannot override core ids, edit core events, run code
  (player mods), touch saves, or change tick order.
- No new tabs, no new stats, no custom art prompts (verbs/events use the
  standard painters). If v1 proves out, those are the next surfaces.
