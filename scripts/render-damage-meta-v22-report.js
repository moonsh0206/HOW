import fs from 'node:fs/promises';
const r=JSON.parse(await fs.readFile('docs/qa/damage-tier-calibration/meta-v22-experiment.json','utf8'));
const live=JSON.parse(await fs.readFile(r.inputPath,'utf8'));
const keys=['A','B','C','D'],a=r.main.candidates.A.rows.filter(h=>h.role==='damage').sort((a,b)=>a.displayRank-b.displayRank);
const n=v=>Number.isFinite(v)?v.toFixed(2):'—',delta=v=>v>0?'+'+v:String(v??'—');
const row=(k,hero)=>r.main.candidates[k].rows.find(h=>h.key===hero);
const name=key=>a.find(h=>h.key===key)?.name??key;
const counts=(s,k)=>['S','A','B','C','D'].map(t=>s[k].counts[t]).join('/');
const lines=[];const add=(...s)=>lines.push(...s);
const table=(heads,rows)=>add('| '+heads.join(' | ')+' |','| '+heads.map(()=> '---').join(' | ')+' |',...rows.map(row=>'| '+row.join(' | ')+' |'),'');
const changes=(x,y)=>a.map(h=>({name:h.name,x:row(x,h.key),y:row(y,h.key)})).filter(h=>h.x.tier!==h.y.tier).map(h=>`${h.name} ${h.x.tier}→${h.y.tier}`).join(', ')||'없음';
add('# HOW Meta v2.2 — S8/A5 × 55:35:10 공격 역할 실험', '',
'**운영 미적용. 네 가지 정책을 각각 재계산한 오프라인 비교 실험이다. 운영 meta-v2 / 추천 meta-v2.1은 그대로 유지한다.**', '',
`원본 수집 완료: ${new Date(r.sourceAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST. 아시아 / PC / 역할 고정 경쟁전 / 다이아몬드 이상 / 전체 전장.`, '',
'이전 [보정 분석](HOW-DAMAGE-TIER-CALIBRATION.md)의 [원문과 정규화 결과](qa/damage-tier-calibration/live.json)를 그대로 사용했다. 외부 API 재호출은 0회다. 다이아몬드·마스터·그랜드마스터(챔피언 포함 제공 구간)의 균등 평균이며 경기 수 가중 통합 통계가 아니다. 픽률 단위·분모·캐시 Age 및 공급자 집계 시점의 한계는 이전 보고서와 동일하다. 새 시점의 통계를 섞지 않았다.', '',
'입력 SHA-256: `'+r.inputHash+'`. 증거 JSON에는 기존 스냅샷 6개와 인덱스의 해시도 기록했다. 전체 결과는 [meta-v22-experiment.json](qa/damage-tier-calibration/meta-v22-experiment.json), 콘솔 전체 순위는 `node scripts/analyze-damage-meta-v22.js`로 다시 출력할 수 있다. 보고서 재생성은 `node scripts/render-damage-meta-v22-report.js`다.', '',
'## 계산 순서와 정책', '',
'각 후보마다 attachMetaTiers()를 다시 호출한다. 동일 역할의 완전한 유효 지표 집합에서 백분위를 재계산하고, 해당 가중치로 Meta Score를 계산한 뒤 동점 경쟁 순위와 provisionalTier를 새로 산정한다. 기존 순위에 라벨만 덧씌우지 않는다. 지표와 기준 집합이 같아서 백분위 자체는 후보 간 같지만 점수와 순위는 달라진다.', '',
'공격과 나머지 역할을 분리해 계산한다. 돌격·지원은 모든 후보에서 65:25:10과 v2.1을 유지한다. 반올림은 운영과 동일하게 점수 소수점 10자리, 화면 표시는 2자리다. 표시값이 같아도 내부 점수/동점 여부는 원본 정밀도로 확인한다.', '');
table(['후보','공격 승률:픽률:밴률','최종 진입 제한'],[['A','65:25:10','현행 S≥5%, 조건부·저채용 A 유지'],['B','65:25:10','공격 S≥8%, A≥5%'],['C','55:35:10','현행 S≥5%, 조건부·저채용 A 유지'],['D','55:35:10','공격 S≥8%, A≥5%']]);
add('S 기본 자격은 전부 유지한다: 유효 역할 5명 이상, 승률≥50%, 픽률≥1%, 승률 백분위≥60, 픽률 백분위≥40. 순위상 잠정 S여도 이 자격을 놓치면 A다. B/D에서는 그 뒤 S8 미달→A 확인→A5 미달이면 B로 제한한다. 원래 해당 후보 계산의 B/C/D는 자격 제한으로 승격하지 않는다.', '',
'이번 C/D는 이전 연속 감점 실험과 달리 현행 A의 티어를 상한으로 고정하지 않는다. 새 점수로 모든 공격 영웅을 재순위하므로 실제로 B→A, D→C 승격이 가능하다. 영웅별 예외나 특정 목표 티어는 없다.', '',
'M_old = .65W + .25P + .10B; M_new = .55W + .35P + .10B. 따라서 점수 차이는 .10×(픽률 백분위−승률 백분위)다. 승률이 아니라 백분위 사이에서 비중 10%p를 이동하는 실험이다.', '',
'**점수 순위와 최종 표시 순위는 구분한다.** 점수 순위는 같은 점수에 같은 경쟁 순위, 잠정 티어는 누적 ceil 15/30/50/75%다. 최종 순위는 기존 compareHowTier와 같이 추천 그룹(S, 일반 A, 조건부 A, 저채용 A, B, C, D)→점수→한국어 이름→key 순의 순번이다. 자격 탈락으로 점수가 높은 A가 낮은 S보다 뒤에 올 수 있으며 이는 의도한 최종 티어 우선 정렬이다.', '',
'## 전체 공격 영웅 통계 및 티어', '', '동일 원본의 유효 공격 영웅 23명. 65 점수는 A/B, 55 점수는 C/D에 사용된다.', '');
table(['영웅','승률%','픽률%','밴률%','기존 점수','새 점수','현행 A','B안','C안','D안'],a.map(h=>[h.name,n(h.statistics.winRate),n(h.statistics.pickRate),n(h.statistics.banRate),n(h.metaScore),n(row('C',h.key).metaScore),...keys.map(k=>row(k,h.key).tier)]));
add('## 전체 최종 역할 순위와 상승·하락', '', '각 칸 `최종 순위 / 티어 (A 대비 순위 변화)`. +는 위로, −는 아래로 이동한다. 이 변화는 정책 실험 간 비교이며 날짜별 전일 변동이 아니다.', '');
table(['영웅','A','B','C','D'],a.map(h=>[h.name,...keys.map(k=>{const v=row(k,h.key);return `${v.displayRank} / ${v.tier} (${delta(v.rankDelta)})`;})]));
add('### 점수 순위와 잠정 티어 재계산 증거', '');
table(['영웅','65 점수 순위 / 잠정','55 점수 순위 / 잠정','점수 순위 변화','기본 S 자격 충족'],a.map(h=>{const c=row('C',h.key);return [h.name,`${h.roleRank} / ${h.provisionalTier}`,`${c.roleRank} / ${c.provisionalTier}`,delta(c.scoreRankDelta),c.eligibility.every(rule=>rule.passed)?'예':'아니오'];}));
add('동점 예: 새 점수에서 시메트라·에코는 63.6363636364로 같은 점수 8위와 잠정 B다. 시온·애쉬는 같은 점수 10위, 소전·안란은 같은 점수 16위다. 표시 순위는 이름/key 규칙에 따라 각각 연속 순번을 사용한다. 동점을 입력 배열 순서로 결정하지 않는다.', '',
'## 티어 인원과 전체 영웅 구성', '');
table(['후보','S','A','B','C','D','합계'],keys.map(k=>[k,...['S','A','B','C','D'].map(t=>r.summary[k].counts[t]),23]));
for(const k of keys){add(`### ${k} 최종 순서`, '');for(const tier of ['S','A','B','C','D'])add(`- ${tier}: `+r.main.candidates[k].rows.filter(h=>h.role==='damage'&&h.tier===tier).sort((a,b)=>a.displayRank-b.displayRank).map(h=>`${h.displayRank}. ${h.name}`).join(', '));add('');}
add('## 핵심 세 영웅', '');
table(['영웅','승률/픽률','점수 65→55','A','B','C','D'],['junkrat','torbjorn','symmetra'].map(key=>{const h=row('A',key);return [h.name,`${n(h.statistics.winRate)} / ${n(h.statistics.pickRate)}`,`${n(h.metaScore)}→${n(row('C',key).metaScore)}`,...keys.map(k=>`${row(k,key).displayRank}위 ${row(k,key).tier}`)];}));
add('정크랫의 새 점수는 낮아지지만 점수 4위·잠정 S가 유지되므로 C만으로는 S 제한 문제를 해결하지 못한다. 토르비욘은 실제 픽률 8.83%로 모든 제한을 통과하고 새 점수에서도 3위다. B/D 표시 2위는 파라가 A로 제한돼 발생한 표시 순서 상승이며 토르비욘의 점수 순위 상승이 아니다. 시메트라는 가중치만으로 점수 6→8위·잠정 A→B가 되고, B만 적용해도 A5 제한으로 B가 된다.', '',
'## 픽률 10% 이상 영웅의 변화', '', '요청한 10%는 공급자 원래 퍼센트 척도다. 이를 경기 수/표본 수나 실제 공격 경기 선택 확률로 바꾸지 않는다.', '');
table(['영웅','승률','픽률','점수 변화','A','C','D','독립 가중치 효과'],a.filter(h=>h.statistics.pickRate>=10).map(h=>{const c=row('C',h.key);return [h.name,n(h.statistics.winRate),n(h.statistics.pickRate),`${n(h.metaScore)}→${n(c.metaScore)}`,`${h.displayRank} ${h.tier}`,`${c.displayRank} ${c.tier}`,`${row('D',h.key).displayRank} ${row('D',h.key).tier}`,`점수 순위 ${h.roleRank}→${c.roleRank}`];}));
add('승률 50% 미만이면서 픽률 10% 이상인 집단은 트레이서·캐서디·시온·소전이다. 가중치만 바꾸면 점수 순위는 각각 7→6, 10→7, 11→10, 17→16이다. 최종 표시 순위는 트레이서가 이미 일반 A 그룹 우선 정렬로 6위여서 6→6, 나머지는 각각 10→7, 11→10, 17→16이다. 캐서디만 B→A로 바뀌고 나머지 티어는 유지된다. 픽률 강화가 이 집단을 일괄 상위 티어로 밀어 올린 것은 아니다.', '',
'리퍼는 픽률 12.97%지만 이미 승률 백분위가 더 높아서 새 점수가 내려간다. 겐지는 점수가 오르지만 최종 5위 A가 유지된다. “픽률 10% 이상이면 점수가 무조건 상승”도 성립하지 않는다.', '',
'## 독립 효과와 중복 반영 위험', '',
`B−A(진입 제한만): ${changes('A','B')}. 점수·점수 순위·잠정 티어는 그대로지만 최종 자격과 표시 순서가 달라진다.`, '',
`C−A(가중치만): ${changes('A','C')}. 백분위 65/25를 55/35로 바꾼 순수 순위 효과다.`, '',
`D−B(제한 위에 가중치 추가): ${changes('B','D')}.`, '',
`D−C(새 가중치 위에 제한 추가): ${changes('C','D')}.`, '',
'D는 픽률을 점수 35%와 최종 하한에 함께 사용하므로 중복 반영 위험이 있다. 다만 두 장치의 역할은 다르다: 비중 변경은 역할 전체의 연속 상대 순위를 바꾸고, 하한은 최종 S/A 자격을 제한한다. 연속 점수와 이산 자격을 결합하는 의도와 비용을 명확히 설명해야 한다.', '',
'승률의 비중은 여전히 55%로 가장 크며 기본 S의 승률≥50%·승률 백분위≥60을 유지한다. 실제 최신 및 66개 조건에서 모든 후보의 승률 50% 미만 S는 0명이다. 추가 합성 테스트에서도 승률 49.99%·픽률 99%로 잠정 S가 돼도 최종 A로 제한된다. A에는 승률 50% 하한이 없으므로 캐서디(48.97%)의 A 진입은 허용된다. 이것이 제품 목표와 맞는지는 승인 전에 결정해야 하며 이번 실험에서 A 승률 하한을 몰래 추가하지 않았다.', '',
'## 5%와 8% 경계 스트레스 테스트', '',
'각 공격 영웅 한 명의 픽률만 4.9→5.1 또는 7.9→8.1로 바꾸고, 다른 지표는 그대로 둔 두 반사실 입력을 독립적으로 재계산했다. 모두 46쌍이다. 실제 시간 경과 관측이 아니며, 원래 3%/20% 영웅을 이 경계로 이동시킨 결과까지 포함하므로 현실적 발생 빈도로 해석하지 않는다.', '');
table(['경계','후보','본인 티어 변화 쌍/23','타 영웅 티어 변화 쌍/23','최대 표시 순위 차이','본인 티어가 바뀐 영웅'],[4.9,7.9].flatMap(low=>keys.map(k=>{const pairs=r.boundary.filter(p=>p.low===low),self=pairs.filter(p=>p.pair[0].result[k].find(h=>h.key===p.hero).tier!==p.pair[1].result[k].find(h=>h.key===p.hero).tier),other=pairs.filter(p=>p.pair[0].result[k].some(h=>h.key!==p.hero&&h.tier!==p.pair[1].result[k].find(x=>x.key===h.key).tier)),maximum=Math.max(...pairs.flatMap(p=>p.pair[0].result[k].map(h=>Math.abs(h.displayRank-p.pair[1].result[k].find(x=>x.key===h.key).displayRank))));return [`${low}→${(low+.2).toFixed(1)}`,k,self.length+'/23',other.length+'/23',maximum,self.map(p=>name(p.hero)).join(', ')||'없음'];})));
add('B/D에서 7.9→8.1은 S 자격을 실제로 뒤집는다. 최신 입력의 스트레스 결과에서 이로 인한 표시 순위 차이는 최대 2칸이었다. A/C에는 8%라는 하한 자체가 없어 해당 쌍에서 티어 변화가 없었다. 5%는 A/C의 기존 S5·추천 그룹 경계인 동시에 B/D의 A5 경계이므로 현행도 불연속이 있다. 반올림 표시값으로 자격을 계산하지 않는다.', '',
'### 실제 현재값 주변 작은 변화', '', '23명 각각의 현재 픽률에 ±0.1/±0.25/±0.5%p를 더한 138개 별도 반사실 시나리오다. 후보별 자기 원래 결과와 비교한다.', '');
table(['후보','±0.1%p 티어 변화 시나리오/46','±0.25%p /46','±0.5%p /46'],keys.map(k=>[k,...[.1,.25,.5].map(d=>r.sensitivity.filter(s=>Math.abs(s.delta)===d&&s.result[k].some(h=>h.tier!==row(k,h.key).tier)).length)]));
add('최신 23명에는 현재값 ±0.1%p에서 티어 변화가 없었다. 이는 5/8% 경계의 구조적 불연속이 없다는 뜻이 아니다. 점수 순위·표시 순위 변화는 티어 변화보다 자주 발생할 수 있으며 전체 원시 결과는 JSON에 보존했다.', '',
'## 66개 과거 조건 백테스트', '',
'이전 보고서의 같은 원본 6개 파일에서 동일하게 66개 조건을 확장했다. 아시아·유럽·아메리카, 개별/합성 등급을 포함하지만 날짜는 11/2·11/4·11/6·11/20 네 개뿐이다. 합성 등급끼리 원본이 겹치므로 66개 독립 표본이 아니다. 현재 고정한 54개 key·역할로 과거 실제 수치를 재계산한 실험이며 과거 게시 티어를 수정한 것이 아니다. 집계 반영이 검증된 패치 전후 쌍이 없어 패치 효과 비교는 불가능하다.', '');
table(['후보','S 0명','S 1명','S 최소~최대','A 최소~최대','S+A 최소~최대','A 대비 티어 변경 건수','최대 표시 순위 이동'],keys.map(k=>[k,r.cases.filter(c=>!c.summary[k].counts.S).length,r.cases.filter(c=>c.summary[k].counts.S===1).length,...[['S'],['A'],['S','A']].map(ts=>{const v=r.cases.map(c=>ts.reduce((s,t)=>s+c.summary[k].counts[t],0));return Math.min(...v)+'~'+Math.max(...v);}),r.cases.reduce((s,c)=>s+c.summary[k].changed.filter(h=>h.from!==h.to).length,0),Math.max(...r.cases.flatMap(c=>c.candidates[k].map(h=>Math.abs(c.candidates.A.find(a=>a.key===h.key).displayRank-h.displayRank))))]));
add('D는 A 대비 총 422건의 티어 변화, B는 122건이다. 이는 중첩된 조건에서 반복 집계한 건수이며 정확도 개선이나 통계적 유의성을 뜻하지 않는다. S가 사라진 조건은 없었지만 D도 5개 조건에서 S가 한 명뿐이었다. S를 채우기 위한 강제 승격은 하지 않는다.', '',
'### 지역·등급·날짜별 구분', '', '각 집단에서 후보별 `S범위 / A범위 / 최대 A대비 표시순위 이동`을 기록한다. 관측 수는 독립 날짜 수와 다르다.', '');
for(const [title,field,values]of [['지역','region',[...new Set(r.cases.map(c=>c.filters.region))]],['등급','division',[...new Set(r.cases.map(c=>c.filters.division))]],['날짜','date',[...new Set(r.cases.map(c=>c.at.slice(0,10)))]]]){
 add(`#### ${title}`, '');table([title,'조건 수',...keys],values.map(value=>{const cs=r.cases.filter(c=>(field==='date'?c.at.slice(0,10):c.filters[field])===value);return [value,cs.length,...keys.map(k=>{const ss=cs.map(c=>c.summary[k].counts.S),aa=cs.map(c=>c.summary[k].counts.A),max=Math.max(...cs.flatMap(c=>c.candidates[k].map(h=>Math.abs(c.candidates.A.find(a=>a.key===h.key).displayRank-h.displayRank))));return `${Math.min(...ss)}~${Math.max(...ss)} / ${Math.min(...aa)}~${Math.max(...aa)} / ${max}`;})];}));
}
add('### 전체 66조건 인원수', '', '각 칸 S/A/B/C/D. 영웅별 점수·순위·잠정·최종 티어는 JSON cases[].candidates에 모두 보존했다.', '');
table(['관측 UTC / 지역 / 등급',...keys],r.cases.map(c=>[`${c.at} / ${c.filters.region} / ${c.filters.division}`,...keys.map(k=>counts(c.summary,k))]));
add('## 최종 권고', '',
'**A/B/C/D 중 다음 검토 대상으로는 D(공격 55:35:10 + S8/A5)를 권고한다. 운영 확정이나 메타 정답 검증을 의미하지 않는다.** 이번 두 목적을 동시에 만족시키는 후보이기 때문이다. B는 정크랫·시메트라의 최종 티어를 제한하지만 주류 영웅의 점수 순위를 바꾸지 않는다. C는 캐서디를 A로 올리고 시메트라를 B로 낮추지만 정크랫·파라는 계속 S다. D는 두 독립 효과를 함께 보여 주면서 성과가 낮은 고픽 영웅이 S로 오르는 것은 기존 자격이 막는다.', '',
'제한도 명확하다. 토르비욘은 D에서도 S이고 최종 표시 순위는 오히려 2위다. 실제 픽률·성과가 기준을 통과한 결과이므로 이 영웅을 낮추기 위한 추가 예외를 만들지 않는다. 캐서디는 승률 48.97%로 A가 되므로 “성과 50% 미만의 A를 허용하는가”가 제품 판단 사항이다. 승률 55% 가중치가 적절하다는 외부 정답이나 경기 수 기반 검증은 없다. 실제 패치가 다른 충분한 날짜·지역 표본과 사용자 평가를 더 확보해야 한다.', '',
'안정성·최소 변경이 최우선이라면 B가 더 보수적인 대안이다. 이전 S7/A4 권고와 이번 D 권고의 차이는 평가 범위가 달라졌기 때문이다. 이전에는 점수를 유지하는 자격 제한을 비교했고, 이번에는 주류 영웅의 실제 순위 변화까지 목적에 추가하여 가중치와 제한을 요인별로 비교했다.', '',
'## 운영 적용 전에 필요한 승인·검증', '',
'- 공격 역할 전용 가중치와 S8/A5를 승인해야 한다. 이번 산출물은 scripts/lib 안에만 있고 운영에서 import하지 않는다.',
'- 가중치가 달라지므로 점수 정책 버전도 올려야 한다. 추천 정책 버전만 v2.2로 바꾸는 것으로 끝낼 수 없다. 역할별 가중치·S/A 기준·정렬/동점 정책을 포함한 새 순위 정책 ID가 필요하다.',
'- 영웅 통계·상세·대시보드·티어 근거·KO/EN/JA 설명이 같은 공통 계산 결과를 사용하도록 적용하고 점수 순위와 최종 티어 우선 순위를 구분한다.',
'- 기존 전일 순위 기록과 새 정책의 순위를 직접 비교하지 않는다. 기존 원본을 보존하고 새 알고리즘으로 만든 파생 결과는 별도 버전·기준일부터 제공한다.',
'- 원본 API 캐시는 재사용하되 정책 의존 파생 순위·추천 캐시는 새 가중치/자격/로스터/필터 버전으로 무효화한다. 실험 결과를 운영 스냅샷으로 쓰지 않는다.',
'- 5/8% 경계, 동점, 결측·검토 상태, 50% 미만 S 제한, 새 순위의 잠정 티어, 돌격·지원 불변을 회귀 검증한다. 추가 A 승률 하한·평활화·히스테리시스는 별도 승인 없이 넣지 않는다.', '',
'## 파일 및 재현 검증', '',
'추가 코드: scripts/lib/damageMetaV22Experiment.js, scripts/analyze-damage-meta-v22.js, scripts/render-damage-meta-v22-report.js. 테스트: tests/damageMetaV22Experiment.test.js. 입력 원문/이전 comparison.json/원본 스냅샷/운영 meta.js/recommendationPolicy.js의 해시 보존을 검증한다.', '',
'콘솔은 A/B/C/D 각각 공격 23명의 최종 순위·승률·픽률·점수·점수 순위·잠정 티어·최종 티어·변화를 출력한다. 이 문서의 표는 JSON과 같은 계산 결과에서 생성한다. 모든 테스트 및 프로덕션 빌드 결과는 작업 완료 메시지와 .artifacts/damage-meta-v22 로그에 남긴다. Commit/Push/배포는 하지 않는다.', '');
const existing=await fs.readFile('docs/HOW-DAMAGE-META-V22-EXPERIMENT.md','utf8').catch(()=>''),extension=existing.match(/<!-- s8a8-candidate:start -->[\s\S]*?<!-- s8a8-candidate:end -->/);
const defaultStatus=existing.match(/<!-- v22-default-status:start -->[\s\S]*?<!-- v22-default-status:end -->/);
await fs.writeFile('docs/HOW-DAMAGE-META-V22-EXPERIMENT.md',(defaultStatus?defaultStatus[0]+'\n\n':'')+lines.join('\n')+(extension?'\n'+extension[0]+'\n':''));
console.log('Generated docs/HOW-DAMAGE-META-V22-EXPERIMENT.md');
