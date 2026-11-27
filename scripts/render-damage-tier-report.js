// Documentation only; consumes the captured, reproducible experiment output.
import fs from 'node:fs/promises';
const r=JSON.parse(await fs.readFile('docs/qa/damage-tier-calibration/comparison.json','utf8'));
const live=JSON.parse(await fs.readFile('docs/qa/damage-tier-calibration/live.json','utf8'));
const n=v=>Number.isFinite(v)?v.toFixed(2):'—',yes=v=>v?'통과':'미달';
const name=key=>r.rows.find(h=>h.key===key)?.name??key;
const names=keys=>keys.map(name).join(', ')||'없음';
const e='lambda0.12-ref6',keys=Object.keys(r.summary);
const lines=[];const add=(...s)=>lines.push(...s);
const table=(headers,rows)=>add('| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...rows.map(row=>'| '+row.join(' | ')+' |'),'');
add('# HOW 공격 영웅 티어 보정 후보 검증', '', '**검토용 실험 · 운영 미적용. 운영 점수 meta-v2 / 추천 meta-v2.1 유지.**', '',
`분석 입력 수집: ${new Date(live.completedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST. 아시아 / PC / 역할 고정 경쟁전 / 다이아몬드 이상 / 전체 전장.`, '',
'이 문서는 체감 메타를 정답으로 학습한 결과가 아니다. 기존 수치와 공개 자격 기준의 민감도를 비교한다. 실제 승리 수·경기 수가 없어 신뢰구간이나 전문 유저 선택 편향의 크기는 추정하지 않는다.', '',
'재현: `node scripts/analyze-damage-tier-calibration.js` → `node scripts/render-damage-tier-report.js`. 네트워크 없이 저장 증거만 사용한다. 새 수집은 `node scripts/capture-damage-tier-calibration.js --fetch`로 명시적으로 실행하며 영웅 목록 1회와 원래 등급 3회만 조회한다. 429/503은 추가 호출을 중단하고 재시도하지 않는다.', '',
'원본: [live.json](qa/damage-tier-calibration/live.json). 전체 영웅 결과·66개 조건별 백테스트·6개 연속 보정·민감도 원본: [comparison.json](qa/damage-tier-calibration/comparison.json). 이 분석 파일들은 운영 스냅샷이나 프런트엔드에서 읽지 않는다.', '',
'## 현행 정책과 원인', '',
'`src/domain/meta.js`: 역할 내 완전한 유효 지표 집합에서 동점 평균 백분위를 산정한다. Meta Score = 승률 백분위×0.65 + 픽률 백분위×0.25 + 밴률 백분위×0.10. 절대 승률 차이의 크기나 경기 수는 가중치에 없다.', '',
'임시 티어는 역할 순위의 누적 ceil(15%, 30%, 50%, 75%) 경계다. 공격 유효 영웅이 23명이므로 임시 S는 4명, A 경계는 7위다. S 기본 자격은 역할 5명, 승률≥50, 픽률≥1, 승률 백분위≥60, 픽률 백분위≥40을 모두 요구한다. 미달 S는 A로만 내려간다.', '',
'`src/domain/recommendationPolicy.js`: S는 실제 픽률 5%가 추가로 필요하지만, A에는 탈락 하한이 없다. 픽률 5% 이상은 일반 A, 3~5%는 조건부 A, 3% 미만도 저채용 A를 유지한다. 따라서 낮은 채용이 높은 승률 백분위를 상쇄하지 못하는 것은 구현 오류라기보다 현재 설계의 결과다.', '',
'`heroModel.compareHowTier()`는 추천 그룹 → Meta Score → 한국어 이름 → key 순으로 표시한다. `roleRank`는 순수 Meta Score의 동점 경쟁 순위이므로 표시 순위와 다를 수 있다. 두 순위를 아래에 따로 기록한다.', '',
'## 데이터 의미와 신선도', '',
'[공식 Hero Statistics FAQ](https://overwatch.blizzard.com/en-us/rates/?input=PC&map=all-maps&region=Americas&role=damage&rq=1&tier=Grandmaster)는 픽률을 전체 영웅 대비 플레이 시간 기반으로 설명한다. Role 필터는 다른 영웅을 숨길 뿐 분모를 다시 계산하지 않는다고 설명한다. 경기 수나 선택 횟수의 비율이라고 해석하지 않는다.', '',
'[OverFast 공개 스키마](https://overfast-api.tekrop.fr/openapi.json)는 이 경로가 역할 고정 모드 전용이고 통계 TTL이 1시간임을 명시한다. `pickrate`, `winrate`, `banrate`의 0~100 단위 값을 기존 HOW 정규화 그대로 사용했다.', '',
'중요한 한계: 이번 응답의 역할별 픽률 합은 돌격 약 100.07%, 공격 200.13%, 지원 199.93%다. 따라서 개별 값을 전체 선택 확률로 보고 합계 100%로 정규화하거나, 공격 역할 안에서 7%를 “공격 경기의 7%”라고 단정할 수 없다. 공식 FAQ의 시간 기반 설명보다 세부적인 슬롯·미러 보정 분모는 이 응답/문서로 독립 확인되지 않았다. 후보의 7·8·4·5는 공급자가 반환한 동일 척도의 퍼센트 임계값이다.', '',
'다이아몬드 이상 = 다이아몬드·마스터·그랜드마스터(제공처의 챔피언 포함 구간)의 동일 비중 평균. 기존 `combineDivisionStatistics()`를 재사용했으며, 세 등급 모두 지표가 유효한 경우만 비교한다. 실제 경기 수로 가중한 공식 통합 수치가 아니다. 요청 시각은 집계 시작/패치 반영 시각이 아니다.', '');
table(['요청','HTTP','Age(초)','캐시 상태','조회 UTC'],live.requests.map(q=>[new URL(q.url).pathname+(new URL(q.url).searchParams.get('competitive_division')?' / '+new URL(q.url).searchParams.get('competitive_division'):' / 영웅 목록'),q.status,q.headers.age??'미제공',q.headers['x-cache-status']??'미제공',q.fetchedAt]));
add('세 통계 응답은 1시간 이내 캐시다. 영웅 목록의 Age는 1일보다 길게 반환됐으나 캐시 hit이며, 저장 기록과 54개 key·역할이 일치한다. 캐시 메타데이터만으로 최신 패치 반영이나 동시 집계 원본을 확정하지 않는다. 최초 요청/완료·URL·캐시 헤더·원문을 증거에 보존했다.', '', '## 공격 픽률 분포', '');
table(['유효 영웅 수','최소','Q1','중앙값','Q3','최대'],[[r.distribution.count,...['min','q1','median','q3','max'].map(k=>n(r.distribution[k])+'%')]]);
add('분위수는 정렬 후 (n−1)q 위치를 선형 보간하는 Type 7이다. 결측/검토 지표가 있는 영웅은 백분위 기준 집합에서 제외한다. 표시 반올림값으로 자격을 판정하지 않는다.', '', '## 현재 공격 전체 지표와 자격', '');
table(['영웅','승률%','픽률%','밴률%','승률 P','픽률 P','밴률 P','Meta','점수 순위','표시 순위','티어/추천 그룹','기본 S / 현행 S','A 자격'],r.rows.map(h=>[h.name,n(h.statistics.winRate),n(h.statistics.pickRate),n(h.statistics.banRate),n(h.winPercentile),n(h.pickPercentile),n(h.banPercentile),n(h.metaScore),h.roleRank,h.displayRank,`${h.tier} / ${h.recommendationGroup}`,`${yes(h.sEligibilityPassed)} / ${yes(h.sEligibilityPassed&&h.statistics.pickRate>=5)}`,'유효 지표이면 별도 픽률 하한 없음']));
add('S 자격 통과는 S 배정을 보장하지 않는다. 원래 역할 순위가 S 범위에 있어야 한다. A의 현행 표기는 픽률 자격 제한이 없다는 뜻이며 모든 영웅을 A로 올린다는 뜻이 아니다.', '', '### 세 영웅의 점수 기여도', '');
table(['영웅','승률 기여(최대65)','픽률 기여(최대25)','밴률 기여(최대10)','해석'],r.rows.filter(h=>['junkrat','torbjorn','symmetra'].includes(h.key)).map(h=>[h.name,n(h.contributions.win),n(h.contributions.pick),n(h.contributions.ban),h.key==='symmetra'?'승률 P95.45가 픽률 P22.73을 상쇄; A 탈락 하한 없음':h.key==='torbjorn'?'픽률 8.83%, 역할 P72.73: 두 절대 하한 모두 통과':'픽률 5.77%로 현행 S5 통과; 승률 P86.36이 큰 기여']));
add('승률 상위 25%·픽률 중앙값 미만: '+names(r.rows.filter(h=>h.winPercentile>=75&&h.statistics.pickRate<r.distribution.median).map(h=>h.key))+'. 픽률 상위 25%·승률 백분위 50 미만: '+names(r.rows.filter(h=>h.pickPercentile>=75&&h.winPercentile<50).map(h=>h.key))+'. 후자는 픽률 하한을 통과해도 원래 낮은 티어에서 상향하지 않는다.', '',
'## 독립 후보의 정확한 정의', '',
'A 현행: v2.1을 그대로 재현한다. B S7/A4, C S8/A5: 현행 결과를 입력으로 공격 S가 S 하한 미달이면 A를 확인하고, A 하한도 미달이면 B로 제한한다. S 기본 자격은 이미 현행 결과에 반영되어 있다. 원래 B/C/D는 상향하지 않고 Meta Score·점수 순위는 바꾸지 않는다. 돌격·지원에는 적용하지 않는다.', '',
`D 상대 기준: 공격 S≥max(5,Q75)=${n(r.relative.s)}%, A≥중앙값=${n(r.relative.a)}%. 현행 S5 하한도 유지한다. 기존 S 픽률 백분위 40보다 훨씬 강한 제한이며 중복되는 부분은 사실상 더 엄격한 조건이 지배한다. 동점 분위수의 수치 경계와 백분위는 완전히 같은 정의가 아니다. 다른 영웅의 채용 변화로 자기 값이 같아도 경계가 움직이는 단점이 있다.`, '',
'E 연속 보정: λ=0.08/0.12 × reference=5/6/공격 중앙값, 총 6개를 각각 계산한다. 공격에만 `base×(1−λ×max(0,1−pick/reference))`를 적용한 별도 adjustedScore와 실험 순위를 만든다. 원래 Meta Score는 그대로 보존한다. 보정 점수 순위에 기존 S 자격·v2.1을 적용하고, 타 영웅 감점으로 B/C/D가 승격하지 않도록 최종 티어는 현행을 상한으로 둔다. 이는 무제약 재순위 실험과 다르며, 단독 지표 변경으로 생기는 승격을 막기 위한 본 실험의 명시적 제약이다. 중앙값이 0/없음이면 해당 E는 미제공이다.', '',
'A 티어를 유지하는 경우 기존 일반/조건부/저채용 그룹을 그대로 재사용한다. 모든 후보는 영웅 key에 따른 예외가 없으며 상대 기준도 공격 역할 전체의 유효 분포에서 계산한다.', '', '## 전체 영웅 비교', '', '연속 보정 열은 E(λ0.12/reference6)의 티어와 별도 점수다. 여섯 안 전부는 다음 표와 JSON에 기록했다.', '');
table(['영웅','승률','픽률','현행 티어','S7/A4','S8/A5','상대 픽률','연속 보정'],r.rows.map(h=>[h.name,n(h.statistics.winRate)+'%',n(h.statistics.pickRate)+'%',h.tier,h.candidates.s7a4.tier,h.candidates.s8a5.tier,h.candidates.relative.tier,`${h.continuous[e].tier} (${n(h.continuous[e].score)})`]));
table(['후보','S','A','B','C','D','변경 영웅'],keys.map(k=>[k,...['S','A','B','C','D'].map(t=>r.summary[k].tiers[t].length),r.summary[k].changed.map(c=>`${name(c.hero)} ${c.from}→${c.to}`).join(', ')||'없음']));
add('### 여섯 연속 보정 전체 결과', '');
const eKeys=Object.keys(r.continuousParameters);
table(['영웅',...eKeys],r.rows.map(h=>[h.name,...eKeys.map(k=>`${h.continuous[k].tier}/${n(h.continuous[k].score)}/#${h.continuous[k].rank}`)]));
add('E 여섯 안 모두 최신 입력의 티어는 바꾸지 못했다. 정크랫은 reference6에서도 약 0.36점 감점(λ0.12)에 그치고, 토르비욘은 모든 reference 이상이라 감점이 없다. 시메트라도 가장 강한 위 실험에서 70.91→67.60점이지만 A를 유지한다. 기존 25% 픽률 백분위 위에 다시 채용 감점을 더하므로 이중 반영이다. 티어 경계에서만 작은 변화로 갑자기 등급이 바뀌는 성질도 완전히 제거하지 못한다.', '',
'## 저장 기록 백테스트와 한계', '',
`${r.cases.length}개 조건 프레임을 6개 원본 파일에서 확장했다. 2026-11-02·04·06·20, 아시아·유럽·아메리카, 원래 9개 등급 및 기존 7개 합성 등급을 가능한 배치에서 재사용했다. 합성 프레임은 같은 원본으로 만든 파생치이며 66개의 독립 일별 표본이 아니다. 원래 데이터 수집을 추가하지 않았다.`, '',
'현재 수집한 동일 54개 key/역할 메타데이터를 고정하여 각 원본의 실제 수치에 후보를 재계산한 회고 실험이다. 당시 게시된 티어를 새 정책으로 수정한 것이 아니다. 모든 입력 key 집합이 일치함을 확인했지만, 역사적 로스터 의미의 변경 여부까지 입증한 것은 아니다. 패치 반영이 검증되지 않은 기록들로 공식 패치 전후의 인과 효과를 주장하지 않는다. 유럽·아메리카 다이아몬드 이상은 11/6 한 시점뿐이므로 지역별 안정성의 강한 검증은 불가능하다.', '');
table(['후보','S 0명 조건 수 / 전체','변경 건수 합계','S 최소~최대','A 최소~최대','돌격·지원 불변'],keys.map(k=>[k,`${r.cases.filter(c=>!c.variants[k].tiers.S.length).length}/${r.cases.length}`,r.cases.reduce((s,c)=>s+c.variants[k].changed.length,0),`${Math.min(...r.cases.map(c=>c.variants[k].tiers.S.length))}~${Math.max(...r.cases.map(c=>c.variants[k].tiers.S.length))}`,`${Math.min(...r.cases.map(c=>c.variants[k].tiers.A.length))}~${Math.max(...r.cases.map(c=>c.variants[k].tiers.A.length))}`,r.cases.every(c=>c.variants[k].nonDamageUnchanged)?'확인':'오류']));
add('변경 건수 합계에는 같은 날짜·원본에서 파생된 등급의 반복 포함이 있다. 이를 변화 확률이나 통계적 유의성으로 해석하지 않는다. 빈 S가 없었다는 관측도 앞으로 S가 항상 존재한다는 보장이 아니다. 티어를 채우기 위해 기준을 완화하거나 영웅을 승격시키지 않는다.', '', '### 지역별 다이아몬드 이상', '');
table(['날짜 / 지역','현행 S/A','S7/A4 S/A','S8/A5 S/A','상대 S/A','S7/A4 변경'],r.cases.filter(c=>c.filters.division==='diamond_plus').map(c=>[`${c.at.slice(0,10)} / ${c.filters.region}`,...['current','s7a4','s8a5','relative'].map(k=>`${c.variants[k].tiers.S.length}/${c.variants[k].tiers.A.length}`),c.variants.s7a4.changed.map(h=>`${name(h.hero)} ${h.from}→${h.to}`).join(', ')||'없음']));
add('### 전체 조건별 티어 수', '', '각 칸 S/A/B/C/D. 각 조건의 변경 영웅 전체·6개 E는 comparison.json의 cases[].variants에 보존되어 있다.', '');
table(['관측 UTC / 지역 / 등급','현행','S7/A4','S8/A5','상대','E .12/ref6'],r.cases.map(c=>[`${c.at} / ${c.filters.region} / ${c.filters.division}`,...['current','s7a4','s8a5','relative',e].map(k=>['S','A','B','C','D'].map(t=>c.variants[k].tiers[t].length).join('/'))]));
add('## 작은 픽률 변화 민감도', '',
'최신 입력의 공격 23명 각각에 대해 픽률만 −0.5/−0.25/−0.1/+0.1/+0.25/+0.5%p로 바꾼 138개 가상 반사실 실험이다. 실제 수집 통계와 별도로 격리했으며 원본은 수정하지 않았다. 매번 백분위·분위수·점수를 다시 계산했다. 표의 수치는 영향을 받은 가상 시나리오 수이며 실제 날짜별 변동 횟수가 아니다.', '');
table(['후보','±0.1%p 시나리오 중 티어 변화','±0.25%p','±0.5%p','영향받은 영웅 합집합'],keys.map(k=>[k,...[.1,.25,.5].map(delta=>`${r.sensitivity.filter(s=>Math.abs(s.delta)===delta&&s.variants[k].length).length}/46`),names([...new Set(r.sensitivity.flatMap(s=>s.variants[k]))])]));
add('고정 하한은 바로 아래/위에서 불연속적으로 바뀐다. 상대 기준도 분위수 순서 교환과 기존 티어 순위 경계가 있어 흔들림을 없애지 못한다. E 점수는 연속적이지만 최종 티어는 이산적이다. 후보별 변동 수가 현행보다 적더라도 더 정확한 메타라는 증거는 아니다. 운영 시점의 미반올림 값으로 판정하고 경계 안내를 제공하는 것이 우선이며, 히스테리시스나 다일 평균은 별도 승인·검증 없이 도입하지 않는다.', '',
'## 권고와 운영 적용 준비', '',
'**1차 권고 후보는 B(S7/A4)다. 운영 승인 권고가 아니라 다음 검토 대상으로서의 선택이다.** 현행 A의 무하한 문제를 직접 해결하고, 점수·상대 순위 계산을 손대지 않는 가장 작은 변경이다. 현재 C와 결과가 같지만 과거 조건 전체 변경은 B 76건, C 122건으로 C가 더 광범위하다. 현행 티어를 보수적으로 제한하는 목적에는 B부터 검증하는 편이 낫다.', '',
'D는 현재 공격 S를 1명으로 압축하고 고정값이 같은 토르비욘도 분포 변화로 제한한다. 모든 지역·로스터에 자연스럽게 일반화할 가능성은 있으나 지금 4개 날짜로 Q75/중앙값이 적절하다고 확정할 수 없다. 특히 토르비욘을 낮추기 위해 D를 선택하지 않는다. E는 현재 문제의 티어를 바꾸지 못하며 픽률 이중 반영·별도 점수와 순위의 설명 비용이 더 커 이번 단계의 기본 후보로 권하지 않는다.', '',
'다음 운영 작업은 사용자가 정책을 승인한 뒤에만 한다:', '',
'1. recommendation 정책을 v2.2로 증가시키고 역할별 S/A 하한을 명시한다. B/C/D 상향 금지·S→A→B 순차 제한을 한 공통 함수에서 처리한다. cap 후보라면 Meta Score meta-v2는 유지한다.',
'2. heroModel 공통 enriched 경로, compareHowTier, 대시보드 TOP/순위, 영웅 상세, 추천 그룹, 티어 근거 모달을 함께 검증한다. 점수 순위와 최종 티어 우선 표시 순위는 다른 의미로 표시하고, 화면마다 별도 상한 계산을 만들지 않는다.',
'3. tierReasonView·statisticsUI 및 KO/EN/JA 설명에 공격 전용 최종 자격을 반영한다. 돌격·지원은 현재와 동일하게 남긴다.',
'4. dailyRankModel의 RANK_POLICY_ID와 rankArchiveModel의 recommendationPolicyId, 수집기의 파생 순위 버전을 함께 올린다. v2.1과 v2.2의 전일 순위를 비교하지 않으며 새 정책의 유효 기준일을 시작한다. 과거 원본은 보존하고 예전 발표 순위를 새 정책 결과로 덮어쓰지 않는다.',
'5. 원본 통계 API 캐시는 그대로 재사용할 수 있다. 정책 적용 후 파생 순위/추천 캐시는 알고리즘·로스터·필터·추천 정책 버전을 키로 관리하고 운영/실험 저장소를 분리한다. 잘못된 v2.1 파생 캐시 재사용을 차단한다.',
'6. 원본 수집·공식 패치 반영·Meta Score 알고리즘은 변경하지 않는다. 패치 전후 검증은 실제 집계 반영 근거가 있는 데이터가 추가된 뒤 수행한다.',
'7. 운영 적용 전 모든 자격 경계·결측·동점·모바일/PC·다국어·전일 비교 버전 불일치 회귀를 다시 실행한다. Commit/Push/배포는 별도 승인 범위다.', '',
'## 검증 범위', '',
'`tests/damageTierCalibration.test.js`: 3/4/5/7/8 및 직전 경계, S→A→B, B/C/D 상향 금지, 영웅별 예외 없음(임의 key 시험), 결측·0 중앙값·동점·입력 순서, 운영 v2.1과 동일 baseline, 돌격/지원 불변, 스냅샷 byte 보존, 운영/실험 버전 분리를 검증한다.', '',
'운영 정책 파일 및 public/data의 스냅샷에는 쓰지 않았다. 테스트와 빌드의 실제 실행 결과는 작업 완료 보고와 .artifacts/damage-tier-calibration 로그에 기록한다. 이번 작업은 분석·독립 실험이며 운영 UI 변경이 없어 후보를 실제 사이트에 적용한 화면 검증으로 표현하지 않는다.', '');
await fs.writeFile('docs/HOW-DAMAGE-TIER-CALIBRATION.md',lines.join('\n'));
console.log('Generated docs/HOW-DAMAGE-TIER-CALIBRATION.md');
