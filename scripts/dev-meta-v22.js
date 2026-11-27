import {createServer} from 'vite';
process.env.VITE_META_EXPERIMENT=process.argv.includes('--baseline')?'v2.1':'damage-v2.2-s8a8';
const server=await createServer({server:{host:'127.0.0.1'}});
await server.listen();server.printUrls();server.bindCLIShortcuts({print:true});
