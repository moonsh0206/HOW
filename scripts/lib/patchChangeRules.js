// Conservative bilingual fact grammar. Rates are game values, never performance statistics.
export const PATCH_NORMALIZATION_VERSION='official-patches-v2';
const metrics=[
 ['cooldown','재사용 대기시간',/재사용 대기시간|cooldown/i,-1],
 ['recovery','회복 시간',/회복 시간|recovery/i,-1],
 ['cast-time','시전 시간',/시전 시간|cast time/i,-1],
 ['detonation','폭발 시간',/폭발 시간|detonation time/i,-1],
 ['charge-time','충전 시간',/충전 시간|time to maximum charge|charge time/i,-1],
 ['delay','공격 지연',/지연 시간|initial swing delay/i,-1],
 ['spread','산탄 범위',/산탄 범위|starting spread/i,-1],
 ['fuel-regen','연료 재생',/연료 재생|fuel regeneration/i,1],
 ['acceleration','가속도',/가속도|acceleration/i,1],
 ['leap-speed','도약 속도',/도약 속도|leap speed/i,1],
 ['knockback','밀쳐내기 강도',/밀쳐내기 강도|knockback/i,1],
 ['lifesteal','생명력 흡수',/생명력 흡수|lifesteal/i,1],
 ['armor','방어력',/방어력|armor/i,1],
 ['health','생명력',/기본 생명력|base health/i,1],
 ['ammo','탄약',/탄약|ammo/i,1],
 ['duration','지속 시간',/지속 시간|duration/i,0],
 ['weaken','약화 효과',/약화 효과|weaken effect/i,1],
 ['damage-reduction','피해 감소량',/피해 감소량|reduced damage/i,0],
 ['stack-requirement','중첩 필요 처치',/중첩 증가에 필요한 처치|eliminations per increased stack/i,-1],
 ['healing','치유량',/치유량|heal per projectile|healing/i,1],
 ['damage','피해량',/피해|공격력|damage/i,1],
 ['reload','재장전 시간',/재장전 시간|reload time/i,-1],
 ['projectile-speed','투사체 속도',/투사체 속도|projectile speed/i,1],
 ['fire-rate','발사 속도',/발사 속도|fire rate/i,1],
 ['fire-interval','발사 간격',/발사 간격|fire interval/i,-1],
 ['projectile-size','투사체 크기',/투사체 크기|projectile size/i,0],
 ['movement-speed','이동 속도',/이동 속도|movement speed/i,0],
 ['ultimate-cost','궁극기 충전 비용',/궁극기.*(?:비용|충전량)|ultimate cost/i,0],
];
export function parsePatchFact(text){
 const m=metrics.find(([, ,pattern])=>pattern.test(text));
 const ko=/(\d+(?:\.\d+)?)(초|%|발|도|회|미터)?에서\s*(\d+(?:\.\d+)?)(초|%|발|도|회|미터)?(?:으)?로/.exec(text);
 const en=/from\s+(\d+(?:\.\d+)?)(%|\sseconds?)?\s+to\s+(\d+(?:\.\d+)?)(%|\sseconds?)?/i.exec(text);
 const reversed=/\bto\s+(\d+(?:\.\d+)?)(%)?[^()]*\((?:Down|Up) from\s+(\d+(?:\.\d+)?)(%)?[^)]*\)/i.exec(text);
 let before=null,after=null,unit=null;
 if(ko||en){const p=ko??en;before=Number(p[1]);after=Number(p[3]);unit=p[2]||p[4]||null;}
 else if(reversed){before=Number(reversed[3]);after=Number(reversed[1]);unit=reversed[2]||reversed[4]||null;}
 if(unit?.includes('second'))unit='초';
 if(m&&['cooldown','recovery','cast-time','detonation','charge-time','delay','duration','reload'].includes(m[0])&&before!==null)unit='초';
 if(m?.[0]==='spread'&&before!==null)unit='도';
 if(m?.[0]==='stack-requirement'&&before!==null)unit='회';
 if(m?.[0]==='ammo'&&before!==null)unit='발';
 if(m?.[0]==='acceleration'&&before!==null)unit='m/s';
 if(m?.[0]==='fuel-regen'&&before!==null)unit='%/s';
 if(m&&['healing','damage'].includes(m[0])&&before!==null&&/초당|매초|per second|every 1s/i.test(text))unit='/s';
 const multiple=(text.match(/에서|\bfrom\b/gi)??[]).length>1;
 const numeric=!!m&&before!==null&&after!==null&&Number.isFinite(before)&&Number.isFinite(after)&&!multiple;
 let changeType='adjustment';
 if(numeric&&m[3]&&before!==after&&!/받는 피해|피해 감소|damage taken|reduced damage/i.test(text))changeType=(after-before)*m[3]>0?'buff':'nerf';
 const metricKey=m?.[0]??null;
 const summaryKo=numeric?`${m[1]} ${before}${unit??''} → ${after}${unit??''} 조정.`:null;
 const minimum=/최소\s*([\d.]+)초|([\d.]+)\s*second minimum deploy duration/i.exec(text);
 return {before:numeric?before:null,after:numeric?after:minimum?Number(minimum[1]??minimum[2]):null,unit:numeric?unit:minimum?'초':null,metricKey:minimum?'minimum-deploy-duration':metricKey,changeType,summaryKo,numeric};
}
export function pairAutomaticChange(candidate,englishCandidates,abilityNames={},koreanCandidates=[]){
 const name=abilityNames[candidate.heroKey]?.[candidate.abilityName];
 const same=e=>e.heroKey===candidate.heroKey&&e.gameMode===candidate.gameMode&&e.metricKey===candidate.metricKey&&e.before===candidate.before&&e.after===candidate.after&&e.unit===candidate.unit&&e.category===candidate.category;
 const matches=englishCandidates.filter(e=>same(e)&&(!name||e.abilityName===name));
 if(!name&&koreanCandidates.filter(same).length>1)return null;
 if(!candidate.heroKey||!candidate.numeric||matches.length!==1)return null;
 const peer=matches[0];if(!peer.numeric)return null;
 return {peer,changeType:peer.changeType===candidate.changeType?candidate.changeType:'adjustment'};
}
