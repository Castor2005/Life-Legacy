/* LIFE & LEGACY — src/tools/migration-test.js
 * Migration system test. RUN IN THE LIVE PAGE via page_eval (path:src/tools/migration-test.js),
 * NOT in a worker: it exercises the real engine (sexEnsure, wInit, genAppearance...).
 * Swaps the global S, runs migrateSave/validateSave/checkContentVersion/migrateEvent
 * against crafted saves, then restores S. Returns {pass, fail, notes}.
 */
var __migTest = (function () {
  var notes = [], pass = 0, fail = 0;
  function ok(c, msg) { if (c) { pass++; } else { fail++; notes.push('FAIL: ' + msg); } }
  function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  var realS = window.S;
  try {
    // 0. registry coherence
    ok(LL.SAVE_VERSION === 7, 'SAVE_VERSION is 7, got ' + LL.SAVE_VERSION);
    ok(LL.CONTENT_VERSION === 4, 'CONTENT_VERSION is 4, got ' + LL.CONTENT_VERSION);
    ok(LL.EVENT_SCHEMA === 1, 'EVENT_SCHEMA is 1, got ' + LL.EVENT_SCHEMA);
    var vs = LL.SAVE_MIGRATIONS.map(function (s) { return s.v; });
    ok(deepEq(vs, [4, 5, 6, 7]), 'SAVE_MIGRATIONS ordered [4,5,6,7], got ' + JSON.stringify(vs));
    ok(LL.SAVE_MIGRATIONS[LL.SAVE_MIGRATIONS.length - 1].v === LL.SAVE_VERSION, 'last step reaches SAVE_VERSION');

    // 1. legacy v1-ish save upgrades fully
    window.S = { v: 1, firstName: 'Old', lastName: 'Soul', gender: 'male', age: 30, year: 2000,
      stats: { health: 50 }, relationships: { children: [], partner: null, friends: [] }, log: [] };
    var r1 = migrateSave();
    ok(r1 === 'ok', 'v1 save migrates, got ' + r1);
    ok(window.S.v === LL.SAVE_VERSION, 'v1 save stamped v' + LL.SAVE_VERSION);
    ok(window.S.flags && window.S.flags.unfiltered === true && window.S.flags.inJail === 0, 'v1 flags filled');
    ok(window.S.sexuality === 'straight' && window.S.race, 'v1 identity filled');
    ok(window.S.stats && typeof window.S.stats.smarts === 'number', 'v1 stats filled');
    ok(window.S.appearance && window.S.imgSeed, 'v1 appearance filled');
    ok(window.S.sex && window.S.world && window.S.world.div && window.S.assets.shares, 'v1 systems filled');
    ok(window.S.chatImg && window.S.focusList && window.S.focusList.length, 'v1 chat/focus filled');
    ok(window.S.company === null && window.S.underworld === null, 'v1 company/underworld null');
    var snap = JSON.stringify(window.S);
    ok(migrateSave() === 'ok' && JSON.stringify(window.S) === snap, 'migration idempotent on second run');

    // 2. mid-version save keeps its data (no clobbering)
    window.S = { v: 4, firstName: 'Mid', lastName: 'Soul', gender: 'female', age: 40, year: 2010,
      stats: { health: 10, happiness: 11, smarts: 12, looks: 13, fitness: 14, discipline: 15, creativity: 16, social: 17, karma: 18 },
      relationships: { children: [], partner: null, friends: [] }, log: [],
      world: { div: { war: 5, politics: 6, tech: 7, economy: 8, science: 9, culture: 1 }, hypo: {}, divHist: {} },
      prestige: 123, money: 456 };
    ok(migrateSave() === 'ok', 'v4 save migrates');
    ok(window.S.v === 7 && window.S.prestige === 123 && window.S.money === 456, 'v4 scalar data preserved');
    ok(window.S.world.div.war === 5, 'v4 world.div preserved (not overwritten)');
    ok(window.S.stats.smarts === 12, 'v4 stats preserved');
    ok(window.S.flags && window.S.assets && window.S.assets.shares, 'v4 steps self-sufficient (flags/assets filled despite skipped v4 step)');
    ok(window.S.will === false, 'v4 will derived from flags');

    // 3. downgrade: future save loads best-effort, untouched
    window.S = { v: 99, firstName: 'Fut', lastName: 'Ure', gender: 'male', age: 20, year: 2030,
      stats: {}, relationships: {}, log: [], custom: 'keepme' };
    ok(migrateSave() === 'newer', 'future save returns newer');
    ok(window.S.v === 99 && window.S.custom === 'keepme', 'future save untouched');

    // 4. validateSave gate
    ok(validateSave(null) === 'not an object', 'validateSave rejects null');
    ok(typeof validateSave({}) === 'string', 'validateSave rejects empty object');
    ok(validateSave({ stats: {}, relationships: {}, log: [], age: 5 }) === null, 'validateSave accepts minimal spine');
    ok(typeof validateSave({ stats: {}, relationships: {}, log: [] }) === 'string', 'validateSave rejects missing age');

    // 5. fresh life stamps current version
    newLife({});
    ok(window.S.v === LL.SAVE_VERSION, 'newLife stamps SAVE_VERSION, got ' + window.S.v);
    var snap2 = JSON.stringify(window.S);
    ok(migrateSave() === 'ok' && JSON.stringify(window.S) === snap2, 'migrate is no-op on fresh life');

    // 6. content version gate (v4 = dedup pack layout with mature overlay)
    ok(checkContentVersion(4).level === 'match' && checkContentVersion(4).ok, 'content v4 matches');
    ok(checkContentVersion(3).ok && checkContentVersion(3).level === 'stale', 'older index is stale-but-ok');
    ok(checkContentVersion(99).ok && checkContentVersion(99).level === 'newer', 'newer index is newer-but-ok');
    ok(!checkContentVersion('x').ok, 'non-numeric index is bad');

    // 7. event migration passthrough (registry empty today)
    var ev = { id: 't', title: 'T', minAge: 0, maxAge: 1, tags: ['a'], weight: 1, text: 'x', choices: [] };
    ok(deepEq(migrateEvent(JSON.parse(JSON.stringify(ev))), ev), 'migrateEvent is passthrough with empty registry');

    // 8. growTo arrives alive with a clean slate (silent self-care + death shield)
    newLife({ startAge: 60 });
    ok(window.S.alive && window.S.age === 60, 'growTo(60) arrives alive at 60');
    ok(window.S.stats.health >= 60 && window.S.stats.happiness >= 55 && window.S.stress <= 40 && window.S.debt === 0,
      'growTo arrival floors hold (hp/hap/stress/debt)');

    // 9. failed step halts the upgrade: no stamp, pre-run save restored, backup kept
    window.S = { v: 1, firstName: 'Old', lastName: 'Soul', gender: 'male', age: 30, year: 2000,
      stats: { health: 50 }, relationships: { children: [], partner: null, friends: [] }, log: [] };
    LL.SAVE_MIGRATIONS.push({ v: 8, id: 'boom-test', desc: 'test-only failing step', run: function () { throw new Error('boom'); } });
    var r9 = null;
    try { r9 = migrateSave(); } finally { LL.SAVE_MIGRATIONS.pop(); }
    ok(r9 === 'partial:boom-test', 'failing step returns partial:boom-test, got ' + r9);
    ok(window.S.v === 1, 'failed upgrade does NOT stamp version (v=' + window.S.v + ')');
    ok(window.S.firstName === 'Old' && window.S.stats.health === 50, 'failed upgrade restores pre-run data');
    ok(typeof window.__LL_MIGRATE_BACKUP === 'string' && window.__LL_MIGRATE_BACKUP.indexOf('"firstName":"Old"') >= 0,
      'failed upgrade preserves recoverable backup');
    try { delete window.__LL_MIGRATE_BACKUP; } catch (e) { window.__LL_MIGRATE_BACKUP = undefined; }
  } catch (e) {
    fail++; notes.push('FAIL: threw ' + (e && e.message));
  } finally {
    window.S = realS;
  }
  return { pass: pass, fail: fail, notes: notes };
})();
return __migTest;
