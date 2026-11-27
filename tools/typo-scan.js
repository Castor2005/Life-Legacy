/* LIFE & LEGACY — src/tools/typo-scan.js
 * Engine-source typo tripwire (worker with workspace fs; no DOM, no network).
 *
 * HOW TO RUN:
 *   const code = await fs.readTextFile('src/tools/typo-scan.js');
 *   const typoScan = new Function('fs', code + '\nreturn typoScan;')(fs);
 *   const rep = await typoScan();
 *
 * Scans src/engine/*.js for literal `.stats.<key>` reads/writes and
 * `stats["<key>"]` accesses, and verifies every key against the canonical
 * STAT_KEYS (state.js). Dynamic access (S.stats[k]) is inherently safe and
 * ignored; S.flags is intentionally dynamic and out of scope. Content JSON
 * effects are covered separately (effects-validate rejects bad stat keys;
 * see validate-content.js). Any hit here is either a real typo (fix the
 * engine code) or a new stat (add it to STAT_KEYS in state.js + migrate.js
 * and document it).
 */
"use strict";
async function typoScan(opts) {
  opts = opts || {};
  var want = ["health","happiness","smarts","looks","fitness","discipline","creativity","social","karma"];
  var ok = {}, i;
  for (i = 0; i < want.length; i++) ok[want[i]] = 1;
  function strip(src) {
    var out = "", n = src.length, k = 0, mode = null;
    while (k < n) {
      var c = src[k], d = src[k + 1];
      if (mode === null) {
        if (c === "/" && d === "/") { mode = "line"; k += 2; continue; }
        if (c === "/" && d === "*") { mode = "block"; k += 2; continue; }
        if (c === "'" || c === '"' || c === "`") { mode = c; out += " "; k++; continue; }
        out += c; k++; continue;
      }
      if (mode === "line") { if (c === "\n") { mode = null; out += "\n"; } k++; continue; }
      if (mode === "block") { if (c === "*" && d === "/") { mode = null; k += 2; } else k++; continue; }
      if (c === "\\") { k += 2; continue; }
      if (c === mode) { mode = null; out += " "; k++; continue; }
      k++;
    }
    return out;
  }
  var files = (await fs.listFiles()).map(function (f) { return f.path; })
    .filter(function (p) { return p.indexOf("src/engine/") === 0 && p.slice(-3) === ".js"; }).sort();
  var hits = [];
  for (var fi = 0; fi < files.length; fi++) {
    var code = strip(await fs.readTextFile(files[fi]));
    var lines = code.split("\n");
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li], m, re;
      re = /\.stats\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
      while ((m = re.exec(line))) { if (!ok[m[1]]) hits.push({ file: files[fi], line: li + 1, key: m[1], via: ".stats." + m[1] }); }
      re = /\.stats\s*\[\s*["']([A-Za-z_$][A-Za-z0-9_$]*)["']\s*\]/g;
      while ((m = re.exec(line))) { if (!ok[m[1]]) hits.push({ file: files[fi], line: li + 1, key: m[1], via: 'stats["' + m[1] + '"]' }); }
    }
  }
  if (opts.writeReport) await fs.writeTextFile("scratch/typo-report.json", JSON.stringify({ files: files.length, hits: hits }, null, 1));
  return { files: files.length, hits: hits };
}
