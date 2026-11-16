// Reuse the existing production-build browser suite without replacing its evidence.
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'qa-micro-interactions.cjs'),'utf8');
const output=process.argv[2]??'docs/qa/meta-emblems/regression';
if(!output.startsWith('docs/qa/')||output.includes('..'))throw Error('QA output must stay under docs/qa');
module._compile(source.replace("output='docs/qa/micro-interactions'",`output=${JSON.stringify(output)}`),__filename);
