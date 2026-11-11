import {readFile,readdir} from 'node:fs/promises';
import {parseAst} from 'rollup/parseAst';
import ko from '../src/i18n/ko.js';
import en from '../src/i18n/en.js';
import {pathToFileURL} from 'node:url';
export async function auditI18n(){
 const issues=[];let calls=0;
 for(const file of (await readdir(new URL('../src/views/',import.meta.url))).filter(f=>f.endsWith('.js'))){
  const source=await readFile(new URL('../src/views/'+file,import.meta.url),'utf8');
  function walk(node,parent){if(!node||typeof node!=='object')return;
   if(node.type==='CallExpression'&&node.callee?.name==='t'&&node.arguments[0]?.type==='Literal'){calls++;const key=node.arguments[0].value;if(!Object.hasOwn(ko,key)||!Object.hasOwn(en,key))issues.push({file,key,kind:'missing-key'});}
   if(node.type==='Literal'&&typeof node.value==='string'&&/[가-힣]/.test(node.value)&&!(parent?.type==='CallExpression'&&['t','label','translateLabel'].includes(parent.callee?.name)))issues.push({file,text:node.value,kind:'unextracted-string'});
   for(const value of Object.values(node))if(value&&typeof value==='object'){if(Array.isArray(value))value.forEach(v=>walk(v,node));else walk(value,node);}
  }walk(parseAst(source));
 }
 return {keys:Object.keys(ko).length,calls,issues};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await auditI18n();console.log(JSON.stringify(result,null,2));if(result.issues.length)process.exitCode=1;}
