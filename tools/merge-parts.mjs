#!/usr/bin/env node
// Merges per-unit part files into one content file.
//   node tools/merge-parts.mjs grammar-n5   -> content/parts/grammar-n5/*.json (each a unit object) => content/grammar-n5.json
//   node tools/merge-parts.mjs reading      -> content/parts/reading/*.json (each a passage object)  => content/reading.json
//   node tools/merge-parts.mjs life         -> content/parts/life/*.json (each a unit object)        => content/life.json
// Part files are merged in filename order, so name them 01-xxx.json, 02-xxx.json, ...
import fs from 'node:fs';
import path from 'node:path';

const name = process.argv[2];
if (!name) throw new Error('usage: merge-parts.mjs <grammar-n5|reading|life>');
const dir = path.join('content', 'parts', name);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const items = files.map((f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  } catch (e) {
    console.error(`invalid JSON in ${f}: ${e.message}`);
    process.exit(1);
  }
});
let out;
if (name.startsWith('grammar-')) out = { level: name.slice(8).toUpperCase(), units: items };
else if (name === 'reading') out = { passages: items };
else out = { units: items };
fs.writeFileSync(path.join('content', `${name}.json`), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote content/${name}.json from ${files.length} parts`);
