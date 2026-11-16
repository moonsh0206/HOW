// Browser QA of the local production build with real API responses and existing archive.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve('dist'),output='docs/qa/how-diagnostics';fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/HOW\//,'/');
  let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  try{const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)]??'application/octet-stream';res.setHeader('content-type',type);res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(5198,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[];
 try{
  for(const width of [320,390,1440])for(const lang of ['ko','en']){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:5198/HOW/${lang}/#/meta`);
   await page.waitForFunction(()=>document.querySelector('#hot-content')?.dataset.hotStatus==='outside-window',{},{timeout:45000});
   const hot=page.locator('#hot-content');assert.equal(await hot.locator('.insight-hero').count(),0);
   assert.match(await hot.locator('.insight-empty').textContent(),/1[~–]7/);
   await hot.scrollIntoViewIfNeeded();await hot.screenshot({path:`${output}/${width}-${lang}-hot.png`});
   await page.evaluate(()=>{location.hash='#/tiers';});
   await page.locator('#heroes [data-role="tank"]').click();
   await page.waitForFunction(()=>document.querySelector('#hero-cards')?.dataset.rankStatus==='archive-empty');
   assert.equal(await page.locator('.rank-change').count(),0);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);assert.deepEqual(errors,[]);
   results.push({width,lang,hot:'outside-window',ranks:'archive-empty',overflow,errors});await page.close();
  }
  fs.writeFileSync(output+'/browser.json',JSON.stringify({source:'local production build; live OverFast API; unchanged stored HOT archive; empty local daily-rank bootstrap',remoteDeployment:false,results},null,2)+'\n');console.log(JSON.stringify(results));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
