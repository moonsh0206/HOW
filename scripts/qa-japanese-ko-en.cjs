// Preserve the old regression suite; language switches now intentionally keep
// the previous player search results instead of resetting them through reload.
const fs=require('node:fs'),path=require('node:path');
let source=fs.readFileSync(path.join(__dirname,'qa-micro-interactions.cjs'),'utf8');
source=source.replace("output='docs/qa/micro-interactions'","output='docs/qa/japanese/ko-en-regression'");
source=source.replace("assert.equal(await page.locator('.player-favorites-title').isVisible(),true);","assert.equal(await page.locator('.player-favorites-title').isVisible(),false);assert.equal(await page.locator('#player-query').inputValue(),'TeKrop');");
module._compile(source,__filename);
