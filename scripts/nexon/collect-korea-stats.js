// Isolated public-page probe. No operational JSON or workflow is modified.
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {extractStatisticsPayload} from './publicPayload.js';
const require=createRequire(import.meta.url);
const {chromium}=require('../../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const out='.artifacts/nexon-korea',file=out+'/trial.json';
// Exact query produced by the official UI during Network investigation.
const source='https://overwatch.nexon.com/hero/rate?role=all&rq=2&rank=diamond&map=all&input=pc&region=korea';
try{await readFile(file);throw new Error('Trial already exists; refusing duplicate collection');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),failed=[];
 page.on('requestfailed',request=>{if(['fetch','xhr'].includes(request.resourceType())){const u=new URL(request.url());failed.push({url:u.origin+u.pathname,error:request.failure()?.errorText});}});
 const response=await page.goto(source,{waitUntil:'domcontentloaded',timeout:60000});
 if(!response?.ok())throw new Error('Public document failed: '+response?.status());
 const payload=extractStatisticsPayload(await page.locator('#__NUXT_DATA__').textContent());
 const dom=await page.evaluate(()=>({url:location.href,filters:document.querySelector('.filter-container')?.innerText,rows:[...document.querySelectorAll('.stat-body .stat-row')].map(e=>({text:e.innerText}))}));
 if(payload.statistics?.data?.list)payload.statistics.data.list=payload.statistics.data.list.map(({heroId,name,role,winRate,pickRate,banRate})=>({heroId,name,role,winRate,pickRate,banRate}));
 const collectedAt=new Date().toISOString();
 const trial={schemaVersion:1,source,transport:'public-html-nuxt-ssr',collectedAt,sourceUpdatedAt:null,requested:{role:'all',rq:'2',rank:'diamond',map:'all',input:'pc',region:'korea'},...payload,dom,failed};
 await writeFile(file,JSON.stringify(trial,null,2));
 await page.screenshot({path:out+'/trial.png',fullPage:true});
 console.log(JSON.stringify({source,status:response.status(),statisticsStatus:payload.statistics?.status,rows:payload.statistics?.data?.list?.length,filters:dom.filters,failed},null,2));
 if(payload.statistics?.status!=='success'||!payload.statistics?.data?.list?.length||!dom.rows.length)process.exitCode=2;
}finally{await browser.close();}
