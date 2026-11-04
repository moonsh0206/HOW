import {createServer} from 'vite';
process.env.VITE_META_EXPERIMENT='60-27-13';
const server=await createServer({server:{host:'127.0.0.1'}});
await server.listen();server.printUrls();server.bindCLIShortcuts({print:true});
