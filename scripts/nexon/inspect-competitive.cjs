const {chromium}=require('../../node_modules/.cache/how-mobile-qa/node_modules/playwright');const fs=require('node:fs');
const dir='.artifacts/nexon-korea';
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),network=[],jobs=[];
page.on('response',response=>{const req=response.request(),url=new URL(response.url());if(!['xhr','fetch'].includes(req.resourceType())||!url.hostname.endsWith('nexon.com')||url.pathname.includes('nxlogs')||url.hostname==='public.api.nexon.com')return;jobs.push((async()=>{let data;try{data=await response.json();}catch{}network.push({url:response.url(),method:req.method(),status:response.status(),data});})());});
await page.goto('https://overwatch.nexon.com/hero/rate',{waitUntil:'networkidle',timeout:60000});
const {extractStatisticsPayload}=await import('./publicPayload.js');const payload=extractStatisticsPayload(await page.locator('#__NUXT_DATA__').textContent());fs.writeFileSync(dir+'/initial-statistics.json',JSON.stringify(payload));
await page.locator('.filter-container button').nth(1).click();console.log('MODE OPTIONS',await page.locator('body').innerText());
await page.getByText('경쟁전 - 역할 고정',{exact:true}).click();await page.waitForTimeout(2500);
console.log('FILTERS',await page.locator('.filter-container').innerText());
await page.locator('.filter-container button').nth(2).click();console.log('RANK OPTIONS',await page.locator('body').innerText());
const option=page.getByText('다이아몬드',{exact:true});if(await option.count())await option.last().click();else throw new Error('Observed diamond option missing');await page.waitForTimeout(3000);await Promise.all(jobs);
const dom=await page.evaluate(()=>({url:location.href,filters:document.querySelector('.filter-container')?.innerText,rows:[...document.querySelectorAll('.stat-body .stat-row')].map(e=>({text:e.innerText,heroHref:e.querySelector('a')?.getAttribute('href')})),text:document.body.innerText}));
fs.writeFileSync(dir+'/competitive.json',JSON.stringify({collectedAt:new Date().toISOString(),network,dom},null,2));await page.screenshot({path:dir+'/competitive.png',fullPage:true});console.log(JSON.stringify({network,dom},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
