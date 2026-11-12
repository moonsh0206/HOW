const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const dir='docs/qa/daily-rank';fs.mkdirSync(dir,{recursive:true});
let html=fs.readFileSync('index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replaceAll('%BASE_URL%','/');
html=html.replace('</head>', ['main','detail','layout','filters','navigation','player'].map(n=>`<link rel="stylesheet" href="/src/styles/${n}.css">`).join('')+'</head>');
html+=`<script type="module">
import {createHeroModel} from '/src/models/heroModel.js';
import {createHeroView} from '/src/views/heroView.js';
import {DEFAULT_FILTERS} from '/src/models/statisticsModel.js';
import {rankDay,RANK_POLICY_ID} from '/src/models/dailyRankModel.js';
const filters={...DEFAULT_FILTERS,division:'diamond'},heroes=['a','b','c'].map(key=>({key,name:key,role:'damage'}));
const rows=keys=>keys.map((hero,i)=>({hero,winRate:60-i*5,pickRate:20-i*5,banRate:10-i*3}));
const day=rankDay(new Date().toISOString()),today=day+'T01:00:00.000Z',yesterday=new Date(Date.parse(today)-86400000).toISOString();
const frame=(collectedAt,keys)=>({collectedAt,filters,rankPolicyId:RANK_POLICY_ID,rankRoster:{a:'damage',b:'damage',c:'damage'},records:rows(keys)});
const model=createHeroModel();Object.assign(model.state,{heroes,status:'ready',statsStatus:'ready',role:'damage',statsFilters:filters,statistics:{filters,records:rows(['a','b','c'])},dailyRankSnapshots:[frame(yesterday,['c','b','a']),frame(today,['a','b','c'])]});
const view=createHeroView();view.render(model);window.qa={model,view};
</script>`;
const server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(relative==='/'){res.setHeader('content-type','text/html');res.end(html);return;}const file=path.resolve('.'+relative);if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'image/svg+xml');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(5197,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[];try{for(const width of [320,375,390,430,1440]){const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5197/');await page.waitForFunction(()=>window.qa);assert.deepEqual(await page.locator('#hero-cards .rank-change').allTextContents(),['\u25b22','=','\u25bc2']);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);await page.locator('#heroes').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/'+width+'.png',fullPage:true});await page.evaluate(()=>{qa.model.state.role='all';qa.view.render(qa.model)});assert.equal(await page.locator('.rank-change').count(),0);results.push({width,pass:true,overflow,errors});assert.deepEqual(errors,[]);await page.close();}fs.writeFileSync(dir+'/browser.json',JSON.stringify({fixtureOnly:true,results},null,2));console.log(results);}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
