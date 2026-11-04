import subroles from './subroles.json' with {type:'json'};
const source=key=>`https://overwatch.blizzard.com/en-us/heroes/${key}/`;
// Independently reviewed kit/tactical pairs, never provider scores or counter inversions.
const pairs=[
 ['genji','ana','나노 강화제와 용검의 공격 타이밍을 맞춰 진입 화력을 높일 수 있습니다.'],
 ['genji','winston','기동기로 함께 진입해 같은 후방 대상을 압박할 수 있습니다.'],
 ['genji','zarya','방벽으로 용검이나 공격적인 진입 중 받는 피해를 막을 수 있습니다.'],
 ['reinhardt','lucio','속도 지원으로 망치 사거리까지 접근하는 시간을 줄일 수 있습니다.'],
 ['reinhardt','mei','빙벽으로 적의 퇴로를 좁히고 근거리 교전을 유도할 수 있습니다.'],
 ['reaper','zarya','방벽으로 근거리 진입을 보호하고 중력자탄에 죽음의 꽃을 연계할 수 있습니다.'],
 ['hanzo','zarya','중력자탄으로 모인 적에게 용의 일격을 연계할 수 있습니다.'],
 ['pharah','mercy','공중 기동을 따라 치유와 공격 지원을 제공할 수 있습니다.'],
 ['ashe','mercy','소총 사격에 공격 지원을 집중하고 고지대 생존을 도울 수 있습니다.'],
 ['soldier-76','mercy','연속 사격에 공격 지원을 제공하고 치유로 사격 유지 시간을 늘릴 수 있습니다.'],
 ['bastion','baptiste','증폭 매트릭스 사선에 화력을 집중하고 불사 장치로 교전 지속을 도울 수 있습니다.'],
 ['cassidy','baptiste','증폭 매트릭스를 통과하는 사격과 불사 장치로 중거리 교전을 지원할 수 있습니다.'],
 ['winston','ana','나노 강화제로 진입한 윈스턴의 화력과 생존을 보조할 수 있습니다.'],
 ['ana','brigitte','방패 밀쳐내기와 근거리 압박으로 아나에게 접근한 적을 견제할 수 있습니다.'],
 ['junker-queen','lucio','속도 지원으로 근거리 공격과 부상 효과를 적용할 거리를 확보할 수 있습니다.'],
 ['mauga','kiriko','정화의 방울로 교전 중 해로운 효과에 대응하고 돌진 교전을 보조할 수 있습니다.'],
 ['ramattra','lucio','속도 지원으로 근접 공격 형태의 유효 거리에 진입하기 쉬워집니다.'],
 ['reaper','ana','나노 강화제를 근거리 교전이나 죽음의 꽃의 공격 타이밍에 맞출 수 있습니다.'],
 ['junkrat','zarya','중력자탄에 모인 적에게 폭발 공격을 집중할 수 있습니다.'],
 ['torbjorn','mercy','포탑이 아닌 토르비욘 본체의 무기 사격에 공격 지원을 제공할 수 있습니다.'],
 ['sojourn','mercy','중거리 무기 사격에 공격 지원과 지속 치유를 제공할 수 있습니다.'],
 ['widowmaker','mercy','고지대 저격 위치에 치유와 공격 지원을 제공할 수 있습니다.'],
 ['tracer','winston','기동력을 맞춰 같은 후방 대상을 동시에 압박할 수 있습니다.'],
 ['echo','mercy','비행 경로를 따라 치유와 공격 지원을 제공할 수 있습니다.'],
 ['orisa','lucio','속도 지원으로 전선을 옮기거나 가까운 교전 거리를 확보할 수 있습니다.'],
 ['sigma','baptiste','방벽과 불사 장치로 사선을 유지하며 중거리 화력을 지원할 수 있습니다.'],
 ['doomfist','ana','나노 강화제를 진입 타이밍에 맞춰 공격과 생존을 지원할 수 있습니다.'],
 ['dva','ana','나노 강화제를 메카 상태의 공격적인 진입 타이밍에 맞출 수 있습니다.'],
 ['wrecking-ball','tracer','레킹볼의 진입으로 시선이 분산될 때 트레이서가 같은 후방을 압박할 수 있습니다.'],
];
const counts=new Map();
export const SYNERGIES=Object.freeze(pairs.flatMap(([a,b,reason])=>[[a,b],[b,a]].flatMap(([heroKey,allyHeroKey])=>{
 const n=counts.get(heroKey)??0;if(n>=3)return [];counts.set(heroKey,n+1);
 const synergyType=['genji:winston','tracer:winston','wrecking-ball:tracer'].includes(`${a}:${b}`)?'tactical':'ability';
 return [{heroKey,allyHeroKey,reason,synergyType,mode:'5v5-role-queue',sourceType:'manual-kit-review',sourceUrls:[source(a),source(b)],reviewedAt:'2026-11-04'}];
})));
export const SYNERGY_REVIEW=Object.freeze(Object.keys(subroles.heroes).map(heroKey=>({heroKey,sourceUrl:source(heroKey),reviewedAt:'2026-11-04',status:SYNERGIES.some(r=>r.heroKey===heroKey)?'conditional-kit-review':'insufficient-evidence'})));
