// Source poses differ: sizes describe the actual cropped art, not PNG canvases.
export const DASHBOARD_EGGS=Object.freeze([
 {key:'hanzo',file:'fishing-silhouette.webp',width:70.2,x:0,y:-29.43,smallWidth:58.05,smallX:0,smallY:-24.3},
 {key:'genji',file:'genji-search.webp',width:36.45,x:-14.85,y:-30.38,smallWidth:29.7,smallX:-10.8,smallY:-24.71},
 {key:'ana',file:'ana-search.webp',width:54,x:-18.9,y:-30.78,smallWidth:44.55,smallX:-11.5,smallY:-25.38},
 {key:'sombra',file:'sombra-search.webp',width:45.9,x:-14.85,y:-30.91,smallWidth:37.8,smallX:-10.8,smallY:-25.52},
 {key:'winston',file:'winston-search.webp',width:37.8,x:-13.5,y:-30.11,smallWidth:31.05,smallX:-9.45,smallY:-24.71},
].map(Object.freeze));

export function pickDashboardEgg(random=Math.random){
 const value=random();
 if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Expected a random value in [0,1)');
 return DASHBOARD_EGGS[Math.floor(value*DASHBOARD_EGGS.length)];
}
