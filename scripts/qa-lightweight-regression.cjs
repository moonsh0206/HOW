// Reuse existing real-data routing/search QA without overwriting its evidence.
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'qa-micro-interactions.cjs'),'utf8');
module._compile(source.replace("output='docs/qa/micro-interactions'","output='docs/qa/lightweight-ranks/regression'"),__filename);
