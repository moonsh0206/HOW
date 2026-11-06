import pngMetadata from './rankPngMetadata.json' with {type:'json'};
// Do not guess CDN filenames or promote documentation examples to current art.
const pending=reason=>Object.freeze({assetUrl:null,sourceUrl:null,format:null,width:null,height:null,opticalScale:1,status:'unverified',currentVersionStatus:'unverified',permissionStatus:'unconfirmed',reason,reviewedAt:'2026-11-06'});
const base=import.meta.env?.BASE_URL??'/';
const policyUrl='https://www.blizzard.com/en-us/legal/c1ae32ac-7ff9-4ac3-a03b-fc04b8697010/blizzard-legal-faq';
const referencePage='https://boostpirate.com/tools/overwatch-group-checker';
const approved=({key,url,width,height,scale,sha256})=>Object.freeze({assetUrl:`${base}assets/ranks/${key}.png`,sourceUrl:url,format:'png',width,height,opticalScale:scale,status:'verified',currentVersionStatus:'verified',permissionStatus:'confirmed',permissionScope:'noncommercial-personal-fansite; preserve copyright notices; no unrestricted redistribution or commercial license',policyUrl,referencePage,verificationMethod:'Official CDN original visually and pixel-compared with contemporary rank-labelled reference; not a game-client extraction',reviewedAt:'2026-11-06',sha256});
// Earlier official references are preserved; they are no longer the active UI set.
export const OFFICIAL_RANK_CANDIDATES=Object.freeze({
 bronze:pending('Current official standalone asset not verified'),
 silver:approved({key:'silver',url:'https://static.playoverwatch.com/images/pages/career/icons/rank/Rank_SilverTier.305e60dca5e95356ced59825426844cc7cdb4948.png',width:80,height:80,scale:1,sha256:'1dc6d69008dcef3bb92034bf98be47c7e7d5f5ebf1f9a345c8bea99214e2987a'}),
 gold:pending('Current official standalone asset not verified'),
 platinum:pending('Current official standalone asset not verified'),
 emerald:pending('Rank introduction confirmed; standalone image identity not verified'),
 diamond:pending('Current official standalone asset not verified'),
 master:approved({key:'master',url:'https://static.playoverwatch.com/img/pages/career/icons/rank/Rank_MasterTier-7d3b85ba0d.png',width:100,height:80,scale:1.25,sha256:'04aecc31cd98331e99bb46acbadbd2238bee37826f2507a8da7a9b32adedc5d6'}),
 grandmaster:pending('Current official standalone asset not verified'),
});

// HOW-authored interpretations, explicitly not official game assets.
const artwork=(key,opticalScale=1)=>Object.freeze({kind:'how-original',status:'ready',permissionStatus:'project-authored',currentVersionStatus:'not-official',assetUrl:`${base}assets/ranks/${key}.svg`,sourceUrl:null,referencePage,format:'svg',width:96,height:96,opticalScale,reviewedAt:'2026-11-06'});
export const HOW_RANK_ARTWORK=Object.freeze({bronze:artwork('bronze',1.03),silver:artwork('silver'),gold:artwork('gold'),platinum:artwork('platinum'),emerald:artwork('emerald'),diamond:artwork('diamond'),master:artwork('master'),grandmaster:artwork('grandmaster')});

// Explicit user-selected local files. Configuration is not a claim that every file exists.
// File inventory is checked separately by scripts/verify-rank-pngs.js.
export function createPngRankAssets(baseUrl='/'){
 if(typeof baseUrl!=='string'||!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(baseUrl)||baseUrl.includes('/../')||baseUrl.includes('/./'))throw new Error('Invalid rank asset base path');
 return Object.freeze(Object.fromEntries(['bronze','silver','gold','platinum','emerald','diamond','master','grandmaster'].map(key=>[key,Object.freeze({kind:'user-local',status:'configured',permissionStatus:'user-authorized',currentVersionStatus:'user-supplied',format:'png',assetUrl:`${baseUrl}assets/ranks/${key}.png`,sourceUrl:null,...pngMetadata[key]})])));
}
export const RANK_ASSETS=createPngRankAssets(base);
