// Offline only: never requests Nexon, never modifies public/data.
import {readFile,writeFile} from 'node:fs/promises';
import {validateKoreaTrial} from './validateKoreaTrial.js';
const dir='.artifacts/nexon-korea';
const trial=JSON.parse(await readFile(dir+'/trial.json','utf8'));
const roster=JSON.parse(await readFile('tests/fixtures/overfast-heroes.json','utf8'));
const result=validateKoreaTrial(trial,roster);
await writeFile(dir+'/verified.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({verified:result.verification.matched,missing:result.verification.missing,roles:[...new Set(result.records.map(r=>r.role))],sourceUpdatedAt:result.sourceUpdatedAt}));
