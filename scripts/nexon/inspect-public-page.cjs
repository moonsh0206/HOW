// Read-only, one page load. Never records request headers, cookies or credentials.
const {chromium}=require('../../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('node:fs');
const dir='.artifacts/nexon-korea';fs.mkdirSync(dir,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),network=[],jobs=[];
page.on('response',response=>{const request=response.request(),url=new URL(response.url());if(!['fetch','xhr'].includes(request.resourceType())||!url.hostname.endsWith('nexon.com')||url.hostname==='public.api.nexon.com')return;
network.push({url:url.origin+url.pathname,method:request.method(),status:response.status()});});
await page.goto('https://overwatch.nexon.com/hero/rate',{waitUntil:'networkidle',timeout:60000});await page.waitForTimeout(1500);await Promise.all(jobs);
const dom=await page.evaluate(()=>({title:document.title,filters:[...document.querySelectorAll('.filter-container button')].map(e=>({text:e.innerText,role:e.getAttribute('role')})),rows:[...document.querySelectorAll('.stat-body .stat-row')].map(e=>e.innerText),links:[...document.querySelectorAll('footer a')].map(a=>({text:a.textContent,url:a.href}))}));
fs.writeFileSync(dir+'/initial.json',JSON.stringify({collectedAt:new Date().toISOString(),network,dom},null,2));await page.screenshot({path:dir+'/initial.png',fullPage:true});console.log(JSON.stringify({requests:network.map(r=>({url:r.url,status:r.status,keys:r.data&&Object.keys(r.data)})),dom},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
