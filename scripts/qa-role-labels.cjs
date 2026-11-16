// Reuse captured roster/statistics and existing alignment/movement QA.
const fs=require('node:fs'),path=require('node:path');
let source=fs.readFileSync(path.join(__dirname,'qa-meta-emblems.cjs'),'utf8');
source=source.replace('docs/qa/meta-emblems/','docs/qa/role-labels/').replace('[1440,390,320]','[1440,1280,1024,768,640,390,320]').replaceAll('width===1440','width>=601');
const check=`
  const roleLayouts=await page.evaluate(()=>{
   const original=qa.model.state.role;qa.model.state.role='all';qa.render();
   const groups=[...document.querySelectorAll('#heroes .role-with-label')].filter(el=>el.getBoundingClientRect().width>0);
   const roles=[...new Set(groups.map(el=>el.getAttribute('aria-label')))];
   const failures=groups.flatMap(el=>{const a=el.getBoundingClientRect(),icon=el.querySelector('.role-symbol').getBoundingClientRect(),text=el.querySelector('.role-label'),b=text.getBoundingClientRect(),cell=el.closest('td')??el.closest('.hero-identity'),c=cell.getBoundingClientRect();return b.right>a.right+.5||a.left<c.left-.5||a.right>c.right+.5||Math.abs(icon.y+icon.height/2-b.y-b.height/2)>.5||text.scrollWidth>text.clientWidth+.5?[el.title]:[];});
   const widths=[...document.querySelectorAll('.hero-tier-table th')].map(el=>el.getBoundingClientRect().width);
   qa.model.state.role=original;qa.render();return {roles,failures,columnWidths:widths};
  });
  assert.deepEqual(roleLayouts.failures,[],'Role group fits column/card and aligns vertically');assert.equal(roleLayouts.roles.length,3);
  assert.deepEqual([...roleLayouts.roles].sort(),(lang==='ko'?['돌격','공격','지원']:['Tank','Damage','Support']).sort());
`;
source=source.replace('  const movements=',check+'  const movements=');
source=source.replace('assert(centers.every(c=>c.offset<1))','assert(centers.every(c=>c.offset<1),JSON.stringify({width,lang,centers}))');
source=source.replace('return {column:i+1,offset:', 'return {cellWidth:td.getBoundingClientRect().width,markWidth:b.width,padding:getComputedStyle(td).padding,column:i+1,offset:');
source=source.replace('results.push({width,lang,centers,','results.push({width,lang,roleLayouts,centers,');
module._compile(source,__filename);
