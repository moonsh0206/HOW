import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import * as fs from 'node:fs/promises';
import {publicationRevisionMode,patchDigest} from './lib/patchPublication.js';

// Read-only Git inspection. This script never commits or pushes.
const git=async(...args)=>(await promisify(execFile)('git',args)).stdout.trim();
try{
 const head=await git('rev-parse','HEAD'),remote=(await git('ls-remote','origin','refs/heads/main')).split(/\s+/)[0];
 const resumed=head!==process.env.EXPECTED_SHA;
 const mode=publicationRevisionMode({expected:process.env.EXPECTED_SHA,head,remote,parent:resumed?await git('rev-parse','HEAD^'):null,paths:resumed?(await git('diff','--name-only','HEAD^','HEAD')).split('\n'):[],currentDigest:patchDigest(await fs.readFile('public/data/patches/notes.json')),candidateDigest:process.env.EXPECTED_PATCH_DIGEST});
 if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`resume=${mode==='resume'}\n`);
 console.log(`publication mode: ${mode}`);
}catch(error){console.error(error.message);process.exitCode=1;}
