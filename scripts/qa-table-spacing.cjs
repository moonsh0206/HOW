// Reuse the emblem QA's captured data and view wiring. Only CSS differs between
// before/after; no checkout, statistics or operating rank files are modified.
const fs=require('node:fs'),path=require('node:path');
const phase=process.argv[2]??'after',output='docs/qa/table-spacing';fs.mkdirSync(output,{recursive:true});
const baseline=path.join(output,'baseline-metaEmblems.css');
if(phase==='before'&&!fs.existsSync(baseline))fs.copyFileSync('src/styles/metaEmblems.css',baseline);
if(!fs.existsSync(baseline))throw Error('Capture before first');
let source=fs.readFileSync(path.join(__dirname,'qa-meta-emblems.cjs'),'utf8');
source=source.replace('docs/qa/meta-emblems/','docs/qa/table-spacing/');
source=source.replace(/^ const baselineFiles=.*$/m,` const baselineFiles=new Map();if(phase==='before')baselineFiles.set('src/styles/metaEmblems.css',fs.readFileSync(${JSON.stringify(baseline)},'utf8'));`);
source=source.replace("if(phase==='after')styles.push('metaEmblems');","styles.push('metaEmblems');");
source=source.replace("res.setHeader('content-type','text/javascript');res.end(baselineFiles.get(p.slice(1)))","res.setHeader('content-type',p.endsWith('.css')?'text/css':'text/javascript');res.end(baselineFiles.get(p.slice(1)))");
source=source.replace('[1440,390,320]','[1440,1280,1024,768,390,320]').replaceAll('width===1440','width>=768');
const measurement=`
  const tableMetrics=await page.evaluate(()=>{
   const table=document.querySelector('.hero-tier-table'),headers=[...table.querySelectorAll('thead th')],row=table.querySelector('tbody tr'),r=table.getBoundingClientRect();
   if(!r.width)return {mode:'cards',tableWidth:0,columnWidths:headers.map(()=>0)};
   const identity=row.children[1],name=identity.querySelector('.hero-name'),role=row.children[2].querySelector('.role-icon-badge'),n=name.getBoundingClientRect(),rr=role.getBoundingClientRect();
   const axes=headers.map((th,i)=>{if(i===1)return null;const td=row.children[i],a=th.getBoundingClientRect();let b;const mark=td.querySelector('.role-icon-badge,.meta-tier-emblem,.favorite-button,.metric-value,.metric-review,.unavailable');if(mark)b=mark.getBoundingClientRect();else{const range=document.createRange();range.selectNodeContents(td);b=range.getBoundingClientRect();}return {column:i+1,offset:Math.abs(a.x+a.width/2-b.x-b.width/2)};}).filter(Boolean);
   return {mode:'table',tableWidth:r.width,columnWidths:headers.map(th=>Number(th.getBoundingClientRect().width.toFixed(2))),computedFirstWidth:getComputedStyle(headers[0]).width,layout:getComputedStyle(table).tableLayout,portraitWidth:identity.querySelector('.portrait').getBoundingClientRect().width,identityUnused:identity.getBoundingClientRect().right-n.right,identityToRole:rr.left-n.right,axes};
  });
  if(phase==='after'&&width>=768){assert(tableMetrics.axes.every(c=>c.offset<1),'All centered header/data axes');assert(Math.max(...tableMetrics.columnWidths.slice(4,7))-Math.min(...tableMetrics.columnWidths.slice(4,7))<.1,'Equal statistic columns');}
`;
source=source.replace("  const centers=",measurement+"  const centers=");
const stress=`
  if(phase==='after'&&width>=768){
   const originalWidths=tableMetrics.columnWidths;
   const stress=await page.evaluate(()=>{const original=qa.model.state.heroes.map(h=>h.name);qa.model.state.heroes=qa.model.state.heroes.map(h=>({...h,name:h.key==='pharah'?'A Very Long Hero Name ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789':h.name}));qa.render();const widths=[...document.querySelectorAll('.hero-tier-table th')].map(th=>th.getBoundingClientRect().width),name=document.querySelector('#hero-rows [data-hero=pharah] .hero-name'),cell=name.closest('td'),a=name.getBoundingClientRect(),b=cell.getBoundingClientRect();const fits=a.right<=b.right+.5;qa.model.state.heroes=qa.model.state.heroes.map((h,i)=>({...h,name:original[i]}));qa.render();return {widths,fits};});
   assert(stress.fits);assert(stress.widths.every((w,i)=>Math.abs(w-originalWidths[i])<.1),'Long names must not move statistics');
  }
`;
source=source.replace("  const movements=",stress+"  const movements=");
source=source.replace('results.push({width,lang,centers,','results.push({width,lang,tableMetrics,centers,');
source=source.replace("source:'captured real roster and statistics; synthetic movement history and grade gallery only for presentation QA; before uses tracked UI source without modifying workspace'","source:'current local UI and captured real roster/statistics; memory-only movement fixtures; before uses frozen CSS from the start of this spacing task'");
module._compile(source,__filename);
