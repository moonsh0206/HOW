// Reuse existing captured-data UI suites; keep this run's evidence separate.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const suites={
 tabs:['qa-detail-tabs.cjs','docs/qa/detail-tabs','docs/qa/stabilization/tabs'],
 scroll:['qa-detail-scroll.cjs','docs/qa/detail-scroll','docs/qa/stabilization/scroll'],
 lifecycle:['qa-genji-lifecycle.cjs','docs/qa/hero-scroll-audit/genji-lifecycle','docs/qa/stabilization/lifecycle'],
 regression:['qa-micro-interactions.cjs','docs/qa/micro-interactions','docs/qa/stabilization/regression'],
};
(async()=>{
 const suite=suites[process.argv[2]];if(!suite)throw Error('Choose tabs, scroll, lifecycle or regression');
 const root=path.resolve('dist'),server=http.createServer((req,res)=>{let file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/HOW\//,''));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(5198,'127.0.0.1',resolve));
 try{
  const code=`const fs=require('node:fs'),Module=require('node:module'),path=require('node:path');const filename=path.resolve('scripts',${JSON.stringify(suite[0])});const source=fs.readFileSync(filename,'utf8').replaceAll(${JSON.stringify(suite[1])},${JSON.stringify(suite[2])});const child=new Module(filename,module);child.filename=filename;child.paths=Module._nodeModulePaths(path.dirname(filename));child._compile(source,filename);`;
  const result=await promisify(execFile)(process.execPath,['-e',code],{windowsHide:true,maxBuffer:4*1024*1024});console.log(result.stdout);if(result.stderr)console.error(result.stderr);
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});

