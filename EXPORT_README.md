FULL-GAME CANONICAL EXPORT (v0.1.03.008)

This zip is the canonical full-game export: main.pjs + index.html + entire src/ tree.
To restore: extract over a blank generator workspace.
Versions live in src/engine/migrate.js (LL.APP_VERSION / LL.SAVE_VERSION / LL.CONTENT_VERSION / LL.EVENT_SCHEMA) and are snapshotted in MANIFEST.json.
Per-patch history lives in src/CHANGELOG.md (v0.1.03.001+).
Events are the source of truth under src/content/events/*.json; packs under src/content/packs/*.json are generated artifacts (see src/tools/build-events.js).
content-fallback.js is a lazy-loaded bundle, only fetched on pack-fetch failure.
