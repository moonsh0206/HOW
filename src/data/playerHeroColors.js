// HOW presentation palette inspired by the existing hero portraits, not official statistics.
export const PLAYER_HERO_COLORS=Object.freeze({
 ana:'#9cb4d9',anran:'#ed7858',ashe:'#c6b3a5',baptiste:'#67b9cf',bastion:'#a6ba81',brigitte:'#dca66a',cassidy:'#cf7c72',
 dmon:'#ce79b7',doctrine:'#c9bd81',domina:'#a68bce',doomfist:'#c68a72',dva:'#f28ebf',echo:'#a9dcf3',emre:'#92b4a0',freja:'#83bba7',
 genji:'#a6dc6b',hanzo:'#b7aa72',hazard:'#ad85d6',illari:'#e8bd63','jetpack-cat':'#d9b783','junker-queen':'#80a6ca',junkrat:'#e3b95b',
 juno:'#d9a1c9',kiriko:'#e68985',lifeweaver:'#e7a9cc',lucio:'#9ad75e',mauga:'#db936a',mei:'#91c7ee',mercy:'#f2d995',mizuki:'#85c8c0',
 moira:'#b78cda',orisa:'#a4bb69',pharah:'#7ba9e8',ramattra:'#ab93d8',reaper:'#b18a92',reinhardt:'#b6c1ca',roadhog:'#c8ab7c',
 shion:'#ac9ddd',sierra:'#c7a77a',sigma:'#96b3c9',sojourn:'#dc8a78','soldier-76':'#879ed3',sombra:'#bc8de8',symmetra:'#83cfda',
 torbjorn:'#e49a72',tracer:'#f0b765',vendetta:'#d18f98',venture:'#c4a27c',widowmaker:'#a195d5',winston:'#aab5ce','wrecking-ball':'#d9ad77',
 wuyang:'#8dcac7',zarya:'#ee9bbf',zenyatta:'#dfcf8d',
});
export const DEFAULT_PLAYER_HERO_COLOR='#9aabc0';
export function playerHeroColor(key){return Object.hasOwn(PLAYER_HERO_COLORS,key)?PLAYER_HERO_COLORS[key]:DEFAULT_PLAYER_HERO_COLOR;}
