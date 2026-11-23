import fs from 'node:fs/promises';import {prepareOfficialPatchUpdate} from '../../../scripts/prepare-official-patch-update.js';
const dir='docs/qa/official-patch-repair';const before=await fs.readFile('public/data/patches/notes.json');await fs.writeFile(dir+'/local-before.json',before);const html={};for(const locale of ['ko-kr','en-us'])html[locale]=await fs.readFile(dir+'/'+locale+'.html','utf8');
const review=JSON.parse(await fs.readFile('docs/research/official-patches/review-complete.json','utf8'));
const result=await prepareOfficialPatchUpdate({report:dir+'/local-update.json',review,fetcher:async url=>({ok:true,text:async()=>html[url.includes('ko-kr')?'ko-kr':'en-us']})});console.log(JSON.stringify(result,null,2));
