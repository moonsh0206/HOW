// Isolate the static footer in built localized HTML/CSS; app JS and live APIs are blocked.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const root=path.resolve('dist'),out='docs/qa/footer';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{let file=path.resolve(root,new URL(req.url,'http://localhost').pathname.replace(/^\/HOW\//,''));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('content-type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.jpg':'image/jpeg'})[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(5207,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),results=[];
 try{for(const width of [1440,1024,768,390,320])for(const lang of ['ko','en','ja']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});await page.route('https://**/*',r=>r.abort());await page.route('**/assets/*.js',r=>r.abort());await page.goto(`http://127.0.0.1:5207/HOW/${lang}/tiers`,{waitUntil:'domcontentloaded'});await page.locator('.site-footer').scrollIntoViewIfNeeded();
  const result=await page.locator('.site-footer').evaluate(el=>{const credit=el.querySelector('.footer-credit'),a=el.getBoundingClientRect(),b=credit.getBoundingClientRect();return {text:credit.textContent,visible:b.width>0&&b.height>0,rightInset:a.right-b.right,paddingRight:parseFloat(getComputedStyle(el).paddingRight),centerOffset:Math.abs(b.x+b.width/2-a.x-a.width/2),fontSize:getComputedStyle(credit).fontSize,color:getComputedStyle(credit).color,paragraphs:el.querySelectorAll('.footer-copy p').length,copy:el.querySelector('.footer-copy').textContent,links:el.querySelectorAll('a').length,overflow:document.documentElement.scrollWidth-innerWidth};});
  assert.equal(result.text,'Created by MSH');assert(result.visible);assert.equal(result.paragraphs,2);assert(result.copy.includes('Blizzard Entertainment'));assert.equal(result.links,1);assert.equal(result.overflow,0);assert.equal(result.fontSize,'11px');if(width<=768)assert(result.centerOffset<1);else assert(Math.abs(result.rightInset-result.paddingRight)<1);
  await page.locator('.site-footer').screenshot({path:`${out}/${width}-${lang}.png`});results.push({width,lang,...result});await page.close();
 }fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log({passed:results.length});}
 finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
