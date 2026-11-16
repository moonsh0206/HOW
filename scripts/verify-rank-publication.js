import {readFile,writeFile} from 'node:fs/promises';
import {confirmRankPublication} from './lib/rankPublication.js';

// Run only after deploy-pages reports success. Never collect or mutate source data.
const expected=JSON.parse(await readFile('dist/data/ranks/current.json','utf8'));
const receipt=await confirmRankPublication({expected,url:process.env.RANKS_URL,runId:process.env.GITHUB_RUN_ID});
await writeFile('rank-publication.json',JSON.stringify({...receipt,url:process.env.DEPLOYED_URL})+'\n');
console.log('Confirmed public rank file matches deployed candidate.');
