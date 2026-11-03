# HOW Phase 3.5 — 전체 영웅 카운터 데이터 조사

검토일: 2026-11-03(KST). **조사 대상은 54명 전원, 실제 관계 입력은 50명(92.6%)**이다. 54명 전원에 대해 현재 공식 기본 기술 페이지를 확인했지만, 전원의 대표 카운터를 충분히 입증했다고 주장하지 않는다. 4명은 후보 검토 후 미입력이다. 3~5명을 맞추기 위한 추측 입력은 하지 않았다.

## 1. 결과와 완료 범위

| 역할 | 조사 | 입력 | 관계 |
|---|---:|---:|---:|
| 돌격 | 15 | 13 | 27 |
| 공격 | 23 | 22 | 37 |
| 지원 | 16 | 15 | 18 |
| 합계 | 54 | 50 | 82 |

상태는 **confirmed 3 / conditional 76 / conflicting 3**이다. 분류는 **ability 66 / both 16 / statistical 단독 0**이다. 입력 영웅 중 22명은 1개, 25명은 2개, 2명은 3개, 1명은 4개다. 희망 범위인 영웅별 3~5명은 대부분 미달이며 한계로 남긴다.

이 수치는 **기술 기반 수동 검토 데이터 구축률**이다. 최신 경쟁전에서 상대 승률을 실증한 비율이나 통계적 검증 완료율이 아니다. 조건부 관계까지 포함한 범위이며 확정적인 승리를 보장하지 않는다.

미입력 4명:

- **D.Mon**: 근접·반복 사격·정면 방벽·기동의 혼합 키트다. 오리사 제어/아나 대응을 검토했으나 이를 대표 카운터로 특정할 독립적 비교 근거가 부족했다.
- **도미나**: 분할 방벽·광선·벽 충돌 제어를 확인했다. 윈스턴의 우회 진입이 가능한 사실만으로 도미나 전용 대표 상성을 확정하지 않았다.
- **독트린**: 치유/주입/기동과 최대 생명력·추가 생명력 효과를 분리해야 한다. 최근 수치 조정도 있어 일반적인 치유 차단을 무조건적 대표 카운터로 입력하지 않았다.
- **엠레**: 현재 공식 기본 기술 목록에서 전체 무기/보조 기술 설명을 충분히 확인하지 못했다. 겐지 반사·돌진 카운터라는 과거 가정을 가져오지 않았다.

## 2. 출처 비교와 접근 범위

1. [공식 영웅 정보](https://overwatch.blizzard.com/en-us/heroes/): 54개 영웅 페이지를 순차 GET으로 확인했다. 모두 HTTP 200이며 기본 Abilities 구간을 읽고 Perks/Stadium 구간과 분리했다. 일부 공식 페이지의 기술 목록은 불완전할 수 있으므로 누락을 곧 삭제로 해석하지 않는다. 검토 URL/시각/제목은 `research/phase35/official-kits.json`에 있다. 전체 원문 설명은 데이터베이스에 복사하지 않았다.
2. [공식 패치](https://overwatch.blizzard.com/en-us/news/patch-notes/): 웹 도구 403을 일반 HTTPS 열람으로 보완했다. 확인한 최근 공개 항목은 2026-10-20/10-13/10-06이다. 11월 신규 변경이 절대로 없다는 뜻은 아니다. 조회 기록은 `patch-review.json`에 있다.
3. [CounterPickGG](https://counterpickgg.com/): 기술·전략 설명과 평가 점수를 참고했다. 점수는 승률로 간주하지 않으며, 기존 필수 3영웅과 신규 필수 사례의 소수 페이지만 대조했다. 원문·점수·전체 DB를 가져오지 않았다.
4. [Counterwatch](https://www.counterwatch.gg/): 필수 사례와 이전 관계의 공개 5v5 페이지를 비교했다. 방법론/개별 페이지상 **교전·팀 교전 기반 counter rating 지수**이며 상대 경기 승률이 아니다. 일부 화면의 근사 % 표기도 승률로 변환하지 않았다. 집계는 전체 등급, 경쟁전 큐/지역 전용 범위는 미확인이다. HOW의 선택한 아시아 다이아 통계와 연결하지 않았다.
5. [OverPicker](https://www.overpicker.com/counters): 카운터/시너지 화면이 별개이며 ±점수는 수동 상성 평가임을 확인했다. 영웅 설명·역할 혼재와 재사용 권한의 검증이 불충분하여 판정의 최종 근거로 채택하지 않았다. 전체 행렬/hero-info DB를 수집·미러링하지 않았다.

전체 54명에 대해 모든 제3자 사이트의 모든 관계를 조사한 것은 아니다. **전체 범위는 공식 키트의 수동 검토이고, 제3자 교전 자료 대조는 16개 선택 관계**다. 대량 복제 허가를 확인하지 못한 통계를 가져와 데이터 구축률을 높이지 않았다. 웹 도구의 열람/공개 접근 자체가 재배포 허가라는 주장도 하지 않는다.

## 3. 스키마와 판정 기준

원본은 `heroKey=카운터당하는 영웅`, `counterHeroKey=그 영웅을 상대하는 적 영웅`이다. 자기 자신·없는 키·중복은 금지하고 시너지 입력을 거부한다. `counters`는 동일 방향 관계의 역조회일 뿐 반대 방향 주장이 아니다.

필수 필드: `heroKey`, `counterHeroKey`, `counterType`, `reason`, `sourceUrls`, `evidenceStatus`, `reviewedAt`, `applicablePatch`, `mode='5v5'`. 기존 View/Service를 위해 `sourceUrl`, `sourceType`, `gameMode` 별칭은 유지한다.

- **ability**: 공식 기술의 제약·범위·방어/이동·제어에 근거한 HOW 전술 의견. 경기 성과를 측정한 값이 아니다.
- **statistical**: 교전 지표만 참고한 관계를 위한 타입. 현재는 순수 통계 관계를 단독 입력하지 않았다.
- **both**: 공식 능력과 선택한 공개 교전 지표를 함께 검토했다. 지표가 반대 방향이면 conflicting으로 남긴다.
- **confirmed**: 검토한 기술 상호작용과 선택 자료가 일치한 3관계다. 통계적 유의성·무조건적 1대1 승리·모든 패치의 우위를 뜻하지 않는다.
- **conditional**: 거리·적중·재사용 대기·엄폐·상대 지원 등 제한을 포함한 수동 의견이다. 대부분의 신규 자료는 이 상태다.
- **conflicting**: 전략/능력 논점과 교전 방향이 다르거나 관련 기술 명세를 현재 확인하지 못했다. 한쪽 출처를 삭제하지 않는다.

`statisticalEvidence`에는 출처 URL, metricType=`counter-rating-index`, 방향 supports/opposes, rank=`all`, queue/region=null을 저장한다. **수치·승률·표본·신뢰도는 저장하지 않는다.** 실제 패치별 상성 유효성을 확인하지 못했으므로 applicablePatch는 전부 null이다. 검토한 최신 패치 날짜를 임의로 적용 패치 ID로 만들지 않았다.

## 4. 필수 사례

| 현재 영웅 ← 후보 | 결정 | 독립 검토 |
|---|---|---|
| 자리야 ← 라인하르트 | both / confirmed | 정면 방벽으로 광선 사선을 막는 기술과 근접 운영을 검토했다. [CounterPickGG](https://counterpickgg.com/heroes/zarya)와 [Counterwatch](https://www.counterwatch.gg/stats/overwatch/counters/zarya) 방향도 지지한다. 방벽 자원·자리야 방벽 충전은 여전히 변수다. |
| 자리야 ← 윈스턴 | both / conflicting | 후방 진입으로 자리야의 정면 교전을 피하는 전략은 가능하다. 가이드는 이를 유리하게 평가하지만 Counterwatch의 직접/팀 교전 지표는 같은 방향을 지지하지 않는다. 전선 우회·충전 억제와 자리야를 직접 처치하는 성과가 다르다. |
| 둠피스트 ← 오리사 | both / confirmed | 공식 투창의 제어·방어 강화의 강제 이동 대응과 [두](https://counterpickgg.com/heroes/doomfist) [자료](https://www.counterwatch.gg/stats/overwatch/counters/doomfist)를 대조했다. 기술이 없는 시점은 별개다. |
| 둠피스트 ← 미즈키 | both / conditional | 현재 공식 Binding Chain의 이동 방해를 확인했다. [교전 자료](https://www.counterwatch.gg/stats/overwatch/counters/doomfist)도 방향을 지지한다. 투사체 적중/시야가 전제이며 제어가 모든 상황의 펀치를 무조건 취소한다고 주장하지 않는다. |
| 벤처 ← 캐서디 | both / conflicting | 현재 공개 교전 방향은 지지한다. 그러나 [가이드](https://counterpickgg.com/heroes/venture)가 사용하는 섬광탄 설명은 현재 공식 페이지에서 확인하지 못했다. 삭제됐다고 단정하지 않고 중거리 권총 대응과 이동 봉쇄 주장을 분리했다. 잠복 중 무적을 공격할 수 있다고 쓰지 않았다. |

자리야·윈스턴의 충돌은 한쪽 자료가 반드시 틀렸다는 뜻이 아니다. 대상은 기동이 낮은 전방 탱커여도 윈스턴이 실제 공격한 상대는 후방 지원일 수 있다. 교전 참여 선택, 팀 조합, 맵, 사용자 숙련도와 지표의 전반 성능 보정도 영향을 줄 수 있다. 이는 가능한 설명이며 현재 집계만으로 원인을 입증하지 못한다.

## 5. 추가 상충과 패치 위험

- **겐지 ← 토르비욘**: 포탑의 경로 감시/생존 대응과 공개 교전 방향이 다르다. 이전 보류 관계를 삭제하지 않고 `conflicting`으로 유지했다. 현재 UI에서 노출되면 “상황에 따라 유리”와 근거 상충을 표시한다.
- **벤처 ← 캐서디**: 앞서 설명한 명세 검증 부족이다. 공식 목록에서 보이지 않는다는 사실을 기술 삭제의 증거로 만들지 않았다.
- 로드호그의 최근 압축기 추가/회복 조정을 반영해, 아나 설명에 투사체 흡수를 피한 적중이 필요하다고 명시했다.
- 현재 솜브라는 지원 역할이며 기본 Hotfix는 아군 치유/일부 설치물 상호작용이다. 과거 일반 해킹을 적 이동기 봉쇄로 가져오지 않았다. EMP와 일반 기술도 혼동하지 않는다.
- 아나 특전·겐지 공격 수치·키리코 생명력 등 확인한 10월 변경을 검토했고, 예전 고정 체력/피해량으로 카운터를 계산하지 않았다.
- Stadium Powers나 6v6 고유 효과를 5v5 관계에 넣지 않았다. 입력 검증에서 mode/gameMode는 모두 5v5여야 한다.

## 6. UI와 유지보수

기존 단일 요약 패널과 PC/모바일 3열 카운터 UI를 유지한다. 처음 3명은 편집 순서이며 외부 순위 복제가 아니다. 관계가 1~2개면 그 수만 표시한다. 상충 관계는 삭제하지 않고 “상황에 따라 유리” 배지와 접힌 근거를 제공한다. 겐지는 4개 관계 중 앞의 3개가 우선 표시되므로 상충 관계가 항상 첫 화면에 보이는 것은 아니다.

데이터는 `src/data/counters/{tank,damage,support}.js`로 역할별 분리하고 기존 `src/data/counters.js`는 통합 export만 담당한다. 공유 팩토리가 스키마를 일관되게 만들고, 명단 스냅샷/Model 검증/verify 스크립트가 잘못된 키와 방향을 차단한다. 설명문은 HOW가 새로 작성했다.

갱신 절차:

1. 공식 패치·영웅 목록/기본 기술을 확인하고 원본 URL·조회 시각을 남긴다.
2. 변경된 영웅이 heroKey 또는 counterHeroKey인 **양쪽 관계**를 모두 다시 검토한다. 기존 이유를 자동 승계하지 않는다.
3. 기술 누락/리워크/출처 상충이면 conditional/conflicting으로 낮추거나 근거 부족으로 미제공한다. 확인되지 않은 applicablePatch를 채우지 않는다.
4. 전체 등급 지표와 현재 HOW 필터를 분리한다. 허용된 공개 데이터 계약을 확보하기 전 외부 통계 자동 수집은 활성화하지 않는다.
5. `npm.cmd test`, `npm.cmd run build`, `npm.cmd run verify` 후 검토일과 구축 현황을 갱신한다. 키 추가·변경 시 `roster.js`도 실제 HOW 명단과 대조한다.

## 7. 한계와 검증

50명 입력을 “전체 영웅 카운터 검증 완료”라고 부르지 않는다. 미입력 4명, 다수의 조건부 관계, 부족한 영웅별 후보 수, 한정된 제3자 대조, 실제 경쟁전 상대 성과의 미확보가 남아 있다. 현재 데이터로 표본 수·신뢰구간·지역/등급별 상대 승률을 생성하지 않았다.

테스트는 전체 FK/중복/자기 자신/방향·역조회/필수 필드/모드/지표 종류/상충 보존/패치 주의사항/구축률과 기존 UI·라우팅을 검사한다.

- `npm.cmd test`: **62/62 통과**.
- `npm.cmd run build`: 프로덕션 빌드 통과.
- `npm.cmd run verify`: DB 54키/50명/82관계/3상충과 /HOW/ 자산 5개 검증 통과. `verify:counters`로 DB만 확인할 수 있다.
- 브라우저 도구가 **No browser is available**을 반환했다. 모바일/PC 실제 픽셀·오버플로·터치·스크린샷은 미검증이다. 기존 동일 요약 패널/모바일 3열 구조와 DOM 링크·상충 표시만 테스트했다.

현재 작업의 변경 파일은 역할별 데이터 3개와 shared/roster, 통합 `src/data/counters.js`, `counterModel.js`, `counterView.js`, `detail.css`, `tests/counters.test.js`, `scripts/verify{,-counters}.js`, `package.json`, 본 보고서·전체 현황·검토 기록이다. HeroDetailView/라우팅/CounterService는 이전 인터페이스를 재사용했다.

GitHub Push·공개 배포는 하지 않는다. Meta Score v2, 통계 API, 특전 선택률 미제공 상태와 내부 공식 비노출을 유지한다.

<!-- GENERATED COUNTER TABLE -->

## 전체 영웅별 후보

|영웅|역할|후보(현재 영웅을 카운터)|구축 상태|
|---|---|---|---|
|아나 (ana)|support|키리코 [conditional], 윈스턴 [conditional]|입력|
|안란 (anran)|damage|파라 [conditional]|입력|
|애쉬 (ashe)|damage|윈스턴 [conditional], D.Va [conditional]|입력|
|바티스트 (baptiste)|support|D.Va [conditional]|입력|
|바스티온 (bastion)|damage|시그마 [conditional], D.Va [conditional]|입력|
|브리기테 (brigitte)|support|파라 [conditional]|입력|
|캐서디 (cassidy)|damage|위도우메이커 [conditional]|입력|
|D.Mon (dmon)|tank|미제공|비교 근거 부족|
|독트린 (doctrine)|support|미제공|비교 근거 부족|
|도미나 (domina)|tank|미제공|비교 근거 부족|
|둠피스트 (doomfist)|tank|오리사 [confirmed], 미즈키 [conditional], 로드호그 [conditional]|입력|
|D.Va (dva)|tank|자리야 [conditional], 시메트라 [conditional]|입력|
|에코 (echo)|damage|솔저: 76 [conditional], 애쉬 [conditional]|입력|
|엠레 (emre)|damage|미제공|비교 근거 부족|
|프레야 (freja)|damage|솔저: 76 [conditional]|입력|
|겐지 (genji)|damage|윈스턴 [confirmed], 모이라 [conditional], 시메트라 [conditional], 토르비욘 [conflicting]|입력|
|한조 (hanzo)|damage|윈스턴 [conditional]|입력|
|해저드 (hazard)|tank|오리사 [conditional], 아나 [conditional]|입력|
|일리아리 (illari)|support|윈스턴 [conditional], 애쉬 [conditional]|입력|
|제트팩 캣 (jetpack-cat)|support|솔저: 76 [conditional]|입력|
|정커퀸 (junker-queen)|tank|키리코 [conditional], 파라 [conditional]|입력|
|정크랫 (junkrat)|damage|파라 [conditional], 에코 [conditional]|입력|
|주노 (juno)|support|솔저: 76 [conditional]|입력|
|키리코 (kiriko)|support|윈스턴 [conditional]|입력|
|라이프위버 (lifeweaver)|support|애쉬 [conditional]|입력|
|루시우 (lucio)|support|모이라 [conditional]|입력|
|마우가 (mauga)|tank|아나 [conditional], D.Va [conditional]|입력|
|메이 (mei)|damage|파라 [conditional]|입력|
|메르시 (mercy)|support|솔저: 76 [conditional]|입력|
|미즈키 (mizuki)|support|키리코 [conditional]|입력|
|모이라 (moira)|support|아나 [conditional]|입력|
|오리사 (orisa)|tank|자리야 [conditional], 젠야타 [conditional]|입력|
|파라 (pharah)|damage|솔저: 76 [conditional], 애쉬 [conditional]|입력|
|라마트라 (ramattra)|tank|아나 [conditional], 파라 [conditional]|입력|
|리퍼 (reaper)|damage|파라 [conditional], 아나 [conditional]|입력|
|라인하르트 (reinhardt)|tank|오리사 [conditional], 파라 [conditional]|입력|
|로드호그 (roadhog)|tank|아나 [conditional], 오리사 [conditional]|입력|
|시온 (shion)|damage|정크랫 [conditional]|입력|
|시에라 (sierra)|damage|D.Va [conditional]|입력|
|시그마 (sigma)|tank|시메트라 [conditional], 윈스턴 [conditional]|입력|
|소전 (sojourn)|damage|D.Va [conditional]|입력|
|솔저: 76 (soldier-76)|damage|D.Va [conditional]|입력|
|솜브라 (sombra)|support|윈스턴 [conditional]|입력|
|시메트라 (symmetra)|damage|파라 [conditional], 윈스턴 [conditional]|입력|
|토르비욘 (torbjorn)|damage|한조 [conditional], 애쉬 [conditional], 솔저: 76 [conditional]|입력|
|트레이서 (tracer)|damage|토르비욘 [conditional], 브리기테 [conditional]|입력|
|벤데타 (vendetta)|damage|파라 [conditional]|입력|
|벤처 (venture)|damage|캐서디 [conflicting], 파라 [conditional]|입력|
|위도우메이커 (widowmaker)|damage|윈스턴 [conditional], D.Va [conditional]|입력|
|윈스턴 (winston)|tank|리퍼 [conditional], 로드호그 [conditional]|입력|
|레킹볼 (wrecking-ball)|tank|정크랫 [conditional], 미즈키 [conditional]|입력|
|우양 (wuyang)|support|아나 [conditional]|입력|
|자리야 (zarya)|tank|라인하르트 [confirmed], 윈스턴 [conflicting]|입력|
|젠야타 (zenyatta)|support|윈스턴 [conditional], 아나 [conditional]|입력|

## 관계별 근거 목록

화살표는 카운터당하는 영웅 ← 카운터 영웅이다. 모든 applicablePatch는 null, mode는 5v5, 검토일은 2026-11-03이다.

|관계|유형/상태|HOW 설명|출처|
|---|---|---|---|
|둠피스트 ← 오리사|both / confirmed|에너지 투창으로 진입 동작을 끊고 방어 강화로 밀치기에 대응할 수 있습니다. 재사용 대기 중에는 달라집니다.|[1](https://overwatch.blizzard.com/en-us/heroes/doomfist/) [2](https://overwatch.blizzard.com/en-us/heroes/orisa/) [3](https://www.counterwatch.gg/stats/overwatch/counters/doomfist) [4](https://counterpickgg.com/heroes/doomfist)|
|둠피스트 ← 미즈키|both / conditional|속박 사슬이 적중하면 이동기를 이용한 이탈을 방해할 수 있습니다. 적중과 지원 위치가 전제입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/doomfist/) [2](https://overwatch.blizzard.com/en-us/heroes/mizuki/) [3](https://www.counterwatch.gg/stats/overwatch/counters/doomfist)|
|둠피스트 ← 로드호그|both / conditional|갈고리가 적중하면 진입·이탈 경로를 바꿀 수 있습니다. 방어 기술과 적 지원을 확인해야 합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/doomfist/) [2](https://overwatch.blizzard.com/en-us/heroes/roadhog/) [3](https://www.counterwatch.gg/stats/overwatch/counters/doomfist)|
|D.Va ← 자리야|ability / conditional|주 공격 광선은 매트릭스의 투사체 방어와 다릅니다. 광선 사거리 안에서 압박하되 원거리 교전은 피하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/dva/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/)|
|D.Va ← 시메트라|ability / conditional|근거리 광선으로 매트릭스 중심 방어를 압박할 수 있습니다. 사거리 밖의 집중 사격은 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/dva/) [2](https://overwatch.blizzard.com/en-us/heroes/symmetra/)|
|해저드 ← 오리사|ability / conditional|돌진 후 근접 위치를 투창과 회전 밀치기로 분리할 수 있습니다. 기술이 준비된 상황의 대응입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/hazard/) [2](https://overwatch.blizzard.com/en-us/heroes/orisa/)|
|해저드 ← 아나|ability / conditional|공중 도약 후 드러난 위치에 수면총을 노릴 수 있습니다. 벽·방어 자세와 적중 난도가 제약입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/hazard/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/)|
|정커퀸 ← 키리코|ability / conditional|정화로 상처·치유 차단에 대응할 수 있습니다. 명령의 외침의 추가 생명력까지 제거하는 것은 아닙니다.|[1](https://overwatch.blizzard.com/en-us/heroes/junker-queen/) [2](https://overwatch.blizzard.com/en-us/heroes/kiriko/)|
|정커퀸 ← 파라|ability / conditional|공중에서 산탄총·도끼의 근접 유효 범위를 피하며 압박할 수 있습니다. 지상 노출과 엄폐에 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/junker-queen/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|마우가 ← 아나|ability / conditional|심장 과부하의 치유를 수류탄으로 제한할 수 있습니다. 추가 생명력과 정화 대응은 별도입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/mauga/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/)|
|마우가 ← D.Va|ability / conditional|매트릭스로 집중 사격을 제한해 아군이 피할 시간을 벌 수 있습니다. 매트릭스 자원과 돌진은 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/mauga/) [2](https://overwatch.blizzard.com/en-us/heroes/dva/)|
|오리사 ← 자리야|ability / conditional|광선으로 회전의 투사체 방어에 대응할 수 있습니다. 방어 강화와 사거리 차이를 고려하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/orisa/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/)|
|오리사 ← 젠야타|ability / conditional|부조화로 집중 공격의 효율을 높일 수 있습니다. 적 지원과 엄폐가 있으면 단독 우위는 보장되지 않습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/orisa/) [2](https://overwatch.blizzard.com/en-us/heroes/zenyatta/)|
|라마트라 ← 아나|ability / conditional|수면·치유 차단으로 근접 형태의 지속 압박을 제한할 수 있습니다. 원거리 방벽과 적 정화를 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/ramattra/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/)|
|라마트라 ← 파라|ability / conditional|공중에서 근접 압박의 유효 범위를 피할 수 있습니다. 소용돌이 범위와 착지 타이밍은 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/ramattra/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|라인하르트 ← 오리사|ability / conditional|방어 강화로 돌진의 밀치기에 대응하고 투창으로 돌진을 방해할 수 있습니다. 방벽과 기술 타이밍이 중요합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/reinhardt/) [2](https://overwatch.blizzard.com/en-us/heroes/orisa/)|
|라인하르트 ← 파라|ability / conditional|공중의 다른 사선에서 근접 무기·정면 방벽을 우회해 압박할 수 있습니다. 화염 강타와 착지를 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/reinhardt/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|로드호그 ← 아나|ability / conditional|압축기의 투사체 흡수가 끝난 뒤 치유 차단을 맞히면 자가 회복을 제한할 수 있습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/roadhog/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/)|
|로드호그 ← 오리사|ability / conditional|방어 강화로 갈고리 변위에 대응하고 투창으로 행동을 방해할 수 있습니다. 체력 회복 중단은 적중이 전제입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/roadhog/) [2](https://overwatch.blizzard.com/en-us/heroes/orisa/)|
|시그마 ← 시메트라|ability / conditional|광선으로 투사체 흡수 중심의 방어를 압박할 수 있습니다. 방벽 자체를 관통한다는 뜻은 아닙니다.|[1](https://overwatch.blizzard.com/en-us/heroes/sigma/) [2](https://overwatch.blizzard.com/en-us/heroes/symmetra/)|
|시그마 ← 윈스턴|ability / conditional|점프로 정면 방벽 뒤의 지원 위치를 압박할 수 있습니다. 시그마와의 정면 화력 대결을 보장하지 않습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/sigma/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|윈스턴 ← 리퍼|ability / conditional|진입한 위치에서 근접 산탄 공격을 집중할 수 있습니다. 윈스턴이 이탈하면 같은 우위를 유지하기 어렵습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/winston/) [2](https://overwatch.blizzard.com/en-us/heroes/reaper/)|
|윈스턴 ← 로드호그|ability / conditional|점프 착지 후 갈고리로 이탈 경로를 바꿀 수 있습니다. 방벽과 갈고리 적중 여부를 고려하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/winston/) [2](https://overwatch.blizzard.com/en-us/heroes/roadhog/)|
|레킹볼 ← 정크랫|ability / conditional|예측한 이동 경로의 강철 덫으로 진입을 멈출 수 있습니다. 넓은 우회 경로에서는 효과가 줄어듭니다.|[1](https://overwatch.blizzard.com/en-us/heroes/wrecking-ball/) [2](https://overwatch.blizzard.com/en-us/heroes/junkrat/)|
|레킹볼 ← 미즈키|ability / conditional|사슬로 빠른 이동 후의 이탈을 방해할 수 있습니다. 적중 난도와 시야가 중요한 조건입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/wrecking-ball/) [2](https://overwatch.blizzard.com/en-us/heroes/mizuki/)|
|자리야 ← 라인하르트|both / confirmed|방벽으로 광선을 막고 근접 압박을 시도할 수 있습니다. 방벽 자원과 자리야 방벽 재사용 대기를 함께 봐야 합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/zarya/) [2](https://overwatch.blizzard.com/en-us/heroes/reinhardt/) [3](https://www.counterwatch.gg/stats/overwatch/counters/zarya) [4](https://counterpickgg.com/heroes/zarya)|
|자리야 ← 윈스턴|both / conflicting|자리야의 정면을 우회해 후방 지원을 압박하는 전략은 가능하지만, 직접 교전 성과는 반대 방향을 가리킵니다.|[1](https://overwatch.blizzard.com/en-us/heroes/zarya/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/) [3](https://www.counterwatch.gg/stats/overwatch/counters/zarya) [4](https://counterpickgg.com/heroes/zarya)|
|안란 ← 파라|ability / conditional|공중에서 근거리 화염·돌진 교전의 범위를 피할 수 있습니다. 착지와 안란의 접근기를 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/anran/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|애쉬 ← 윈스턴|ability / conditional|점프로 저격 사선에 접근하고 방벽을 사이에 둘 수 있습니다. 충격 샷건과 적 지원에 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/ashe/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|애쉬 ← D.Va|ability / conditional|부스터로 거리를 좁히며 매트릭스로 사격을 줄일 수 있습니다. 이탈 경로와 자원 소모를 고려하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/ashe/) [2](https://overwatch.blizzard.com/en-us/heroes/dva/)|
|바스티온 ← 시그마|ability / conditional|돌격 형상의 투사체를 흡수해 집중 사격을 제한할 수 있습니다. 흡수 종료와 수류탄 각도를 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/bastion/) [2](https://overwatch.blizzard.com/en-us/heroes/sigma/)|
|바스티온 ← D.Va|ability / conditional|집중 사격을 매트릭스로 막아 엄폐까지 이동할 시간을 벌 수 있습니다. 자원 고갈 뒤의 화력은 별개입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/bastion/) [2](https://overwatch.blizzard.com/en-us/heroes/dva/)|
|캐서디 ← 위도우메이커|ability / conditional|유효 사거리 밖의 저격 각도로 중거리 권총 교전을 피할 수 있습니다. 우회 경로와 엄폐가 전제입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/cassidy/) [2](https://overwatch.blizzard.com/en-us/heroes/widowmaker/)|
|에코 ← 솔저: 76|ability / conditional|공중에 노출된 비행 경로를 사거리 안에서 추적 사격할 수 있습니다. 집중 광선의 근접 마무리를 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/echo/) [2](https://overwatch.blizzard.com/en-us/heroes/soldier-76/)|
|에코 ← 애쉬|ability / conditional|조준 사격으로 공중 노출을 압박할 수 있습니다. 안전한 사선이 없으면 비행의 이점이 커집니다.|[1](https://overwatch.blizzard.com/en-us/heroes/echo/) [2](https://overwatch.blizzard.com/en-us/heroes/ashe/)|
|프레야 ← 솔저: 76|ability / conditional|상승 기류로 드러난 공중 위치를 추적 사격할 수 있습니다. 빠른 돌진·엄폐로 사선이 끊기면 효과가 줄어듭니다.|[1](https://overwatch.blizzard.com/en-us/heroes/freja/) [2](https://overwatch.blizzard.com/en-us/heroes/soldier-76/)|
|겐지 ← 윈스턴|both / confirmed|근거리 전기 공격으로 튕겨내기 중심 대응을 압박할 수 있습니다. 적진 고립은 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/) [3](https://www.counterwatch.gg/stats/overwatch/counters/genji) [4](https://counterpickgg.com/heroes/genji)|
|겐지 ← 모이라|both / conditional|광선 추적으로 근접 기동을 압박하고 소멸로 이탈할 수 있습니다. 단독 추격의 위험은 남습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/moira/) [3](https://www.counterwatch.gg/stats/overwatch/counters/genji) [4](https://counterpickgg.com/heroes/genji)|
|겐지 ← 시메트라|both / conditional|광선과 감시 포탑으로 진입 경로를 제약할 수 있습니다. 사거리 밖에서는 이점이 줄어듭니다.|[1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/symmetra/) [3](https://www.counterwatch.gg/stats/overwatch/counters/genji) [4](https://counterpickgg.com/heroes/genji)|
|겐지 ← 토르비욘|both / conflicting|포탑의 경로 감시와 과부하 대응은 가능하지만 교전 지표가 같은 방향을 지지하지 않아 상황을 구분해야 합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/torbjorn/) [3](https://counterpickgg.com/heroes/genji) [4](https://www.counterwatch.gg/stats/overwatch/counters/genji)|
|한조 ← 윈스턴|ability / conditional|점프로 저격 위치를 압박하고 방벽으로 사선을 분리할 수 있습니다. 폭풍 화살과 적 지원을 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/hanzo/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|정크랫 ← 파라|ability / conditional|공중에서 지상의 덫·튀는 유탄 각도를 피하며 사격할 수 있습니다. 공중 유탄과 지뢰가 무효인 것은 아닙니다.|[1](https://overwatch.blizzard.com/en-us/heroes/junkrat/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|정크랫 ← 에코|ability / conditional|비행으로 지상 유탄·덫의 경로를 우회할 수 있습니다. 저공 비행과 착지는 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/junkrat/) [2](https://overwatch.blizzard.com/en-us/heroes/echo/)|
|메이 ← 파라|ability / conditional|공중에서 단거리 분사·빙벽의 지상 압박을 피할 수 있습니다. 고드름의 원거리 사격은 여전히 위험합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/mei/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|파라 ← 솔저: 76|ability / conditional|공중 노출을 유효 사거리 내에서 지속 사격할 수 있습니다. 감쇠·엄폐와 로켓의 각도를 고려하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/pharah/) [2](https://overwatch.blizzard.com/en-us/heroes/soldier-76/)|
|파라 ← 애쉬|ability / conditional|조준 사격으로 공중 사선을 견제할 수 있습니다. 엄폐와 재장전 타이밍에 따라 달라집니다.|[1](https://overwatch.blizzard.com/en-us/heroes/pharah/) [2](https://overwatch.blizzard.com/en-us/heroes/ashe/)|
|리퍼 ← 파라|ability / conditional|근접 산탄총의 유효 범위를 벗어나 압박할 수 있습니다. 그림자 밟기와 저공 노출을 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/reaper/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|리퍼 ← 아나|ability / conditional|죽음의 꽃을 수면총으로 끊을 수 있는 기회가 있습니다. 적중·시야·정화와 망령화 타이밍을 고려하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/reaper/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/)|
|시온 ← 정크랫|ability / conditional|바이크·돌진의 예상 이동 경로에 덫을 두어 진입을 제약할 수 있습니다. 경로를 우회하면 효율이 낮아집니다.|[1](https://overwatch.blizzard.com/en-us/heroes/shion/) [2](https://overwatch.blizzard.com/en-us/heroes/junkrat/)|
|시에라 ← D.Va|ability / conditional|매트릭스로 지속 사격을 막아 압박을 줄일 수 있습니다. 드론 이동 뒤 새 사선과 자원 소모에 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/sierra/) [2](https://overwatch.blizzard.com/en-us/heroes/dva/)|
|소전 ← D.Va|ability / conditional|매트릭스로 주 무기 집중 사격을 줄일 수 있습니다. 분열 사격의 영역과 슬라이드 이탈은 별도로 대응해야 합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/sojourn/) [2](https://overwatch.blizzard.com/en-us/heroes/dva/)|
|솔저: 76 ← D.Va|ability / conditional|매트릭스로 전술 조준경 중 사격을 제한할 수 있습니다. 매트릭스 자원이 소진되면 같은 대응이 안 됩니다.|[1](https://overwatch.blizzard.com/en-us/heroes/soldier-76/) [2](https://overwatch.blizzard.com/en-us/heroes/dva/)|
|시메트라 ← 파라|ability / conditional|광선 사거리와 지상 포탑 각도를 공중에서 우회할 수 있습니다. 엄폐와 고저차에 따라 달라집니다.|[1](https://overwatch.blizzard.com/en-us/heroes/symmetra/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|시메트라 ← 윈스턴|ability / conditional|점프로 전선 뒤를 압박할 수 있습니다. 충전된 광선의 근접 화력과 포탑 배치를 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/symmetra/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|토르비욘 ← 한조|both / conditional|안전한 사선에서 화살로 고정 포탑을 집중 공격할 수 있습니다. 근접 교전 전체의 우위를 보장하지 않습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/torbjorn/) [2](https://overwatch.blizzard.com/en-us/heroes/hanzo/) [3](https://www.counterwatch.gg/stats/overwatch/counters/torbjorn) [4](https://counterpickgg.com/heroes/torbjorn)|
|토르비욘 ← 애쉬|both / conditional|유효 사거리 안에서 포탑을 집중 사격할 수 있습니다. 포탑과 적의 동시 사격을 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/torbjorn/) [2](https://overwatch.blizzard.com/en-us/heroes/ashe/) [3](https://www.counterwatch.gg/stats/overwatch/counters/torbjorn) [4](https://counterpickgg.com/heroes/torbjorn)|
|토르비욘 ← 솔저: 76|both / conditional|소총으로 고정 포탑 제거를 도울 수 있습니다. 사선 확보와 엄폐가 전제입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/torbjorn/) [2](https://overwatch.blizzard.com/en-us/heroes/soldier-76/) [3](https://www.counterwatch.gg/stats/overwatch/counters/torbjorn)|
|트레이서 ← 토르비욘|ability / conditional|포탑의 경로 감시로 우회 진입을 압박할 수 있습니다. 포탑이 먼저 파괴되면 효과가 줄어듭니다.|[1](https://overwatch.blizzard.com/en-us/heroes/tracer/) [2](https://overwatch.blizzard.com/en-us/heroes/torbjorn/)|
|트레이서 ← 브리기테|ability / conditional|넓은 근접 공격과 도리깨 투척으로 접근을 밀어낼 수 있습니다. 점멸·시간 역행 이후의 재진입은 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/tracer/) [2](https://overwatch.blizzard.com/en-us/heroes/brigitte/)|
|벤데타 ← 파라|ability / conditional|공중에서 대검의 근접 범위를 피할 수 있습니다. 검을 이용한 접근과 투사체 공격은 여전히 주의해야 합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/vendetta/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|벤처 ← 캐서디|both / conflicting|지상에 드러난 뒤 거리를 유지해 권총으로 압박할 수 있습니다. 잠복 중 무적에는 공격할 수 없습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/venture/) [2](https://overwatch.blizzard.com/en-us/heroes/cassidy/) [3](https://www.counterwatch.gg/stats/overwatch/counters/venture) [4](https://counterpickgg.com/heroes/venture)|
|벤처 ← 파라|both / conditional|공중에서 짧은 지상 무기의 범위를 피할 수 있습니다. 착지 때 잠복 돌진에 노출될 수 있습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/venture/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/) [3](https://www.counterwatch.gg/stats/overwatch/counters/venture)|
|위도우메이커 ← 윈스턴|ability / conditional|점프로 저격 위치를 압박할 수 있습니다. 갈고리 이탈과 적 지원을 확인해야 합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/widowmaker/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|위도우메이커 ← D.Va|ability / conditional|부스터와 매트릭스로 저격 사선에 접근할 수 있습니다. 장거리 추격으로 고립되지 않아야 합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/widowmaker/) [2](https://overwatch.blizzard.com/en-us/heroes/dva/)|
|아나 ← 키리코|both / conditional|정화로 수면·치유 차단에 대응할 수 있습니다. 아나 특전 선택과 정화의 재사용 대기를 함께 봐야 합니다.|[1](https://overwatch.blizzard.com/en-us/heroes/ana/) [2](https://overwatch.blizzard.com/en-us/heroes/kiriko/) [3](https://www.counterwatch.gg/stats/overwatch/counters/ana)|
|아나 ← 윈스턴|both / conditional|점프로 원거리 지원 위치를 압박하고 방벽으로 사선을 나눌 수 있습니다. 수면총과 적 지원을 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/ana/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/) [3](https://www.counterwatch.gg/stats/overwatch/counters/ana)|
|바티스트 ← D.Va|ability / conditional|주 무기·치유 투사체가 지나가는 사선을 매트릭스로 제한할 수 있습니다. 불사 장치와 자원 고갈은 별도 문제입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/baptiste/) [2](https://overwatch.blizzard.com/en-us/heroes/dva/)|
|브리기테 ← 파라|ability / conditional|근접 도리깨 범위를 벗어난 공중 사선으로 압박할 수 있습니다. 엄폐와 적의 원거리 지원을 고려하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/brigitte/) [2](https://overwatch.blizzard.com/en-us/heroes/pharah/)|
|일리아리 ← 윈스턴|ability / conditional|점프로 지원 위치를 압박하고 방벽으로 사선을 분리할 수 있습니다. 분출 이탈과 태양석은 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/illari/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|일리아리 ← 애쉬|ability / conditional|시야에 드러난 치유 태양석을 원거리 사격으로 제거할 수 있습니다. 숨겨진 설치 위치에서는 이점이 줄어듭니다.|[1](https://overwatch.blizzard.com/en-us/heroes/illari/) [2](https://overwatch.blizzard.com/en-us/heroes/ashe/)|
|제트팩 캣 ← 솔저: 76|ability / conditional|비행으로 드러난 공중 경로를 지속 사격할 수 있습니다. 엄폐와 수송 중 동료의 대응을 고려하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/jetpack-cat/) [2](https://overwatch.blizzard.com/en-us/heroes/soldier-76/)|
|주노 ← 솔저: 76|ability / conditional|수평 비행·체공으로 드러난 사선을 지속 사격할 수 있습니다. 이동 속도와 엄폐에 따라 달라집니다.|[1](https://overwatch.blizzard.com/en-us/heroes/juno/) [2](https://overwatch.blizzard.com/en-us/heroes/soldier-76/)|
|키리코 ← 윈스턴|ability / conditional|점프로 근접 압박을 시도할 수 있습니다. 순보와 정화로 이탈할 수 있어 확정 처치를 뜻하지 않습니다.|[1](https://overwatch.blizzard.com/en-us/heroes/kiriko/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|라이프위버 ← 애쉬|ability / conditional|열린 사선의 단상과 지원 위치를 원거리에서 압박할 수 있습니다. 지형·구원의 손길과 이탈을 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/lifeweaver/) [2](https://overwatch.blizzard.com/en-us/heroes/ashe/)|
|루시우 ← 모이라|ability / conditional|광선 추적으로 근거리 벽 타기를 견제할 수 있습니다. 소리 파동과 거리 확보 뒤에는 이점이 줄어듭니다.|[1](https://overwatch.blizzard.com/en-us/heroes/lucio/) [2](https://overwatch.blizzard.com/en-us/heroes/moira/)|
|메르시 ← 솔저: 76|ability / conditional|수호천사 이동·부활 중 노출된 사선을 지속 사격할 수 있습니다. 엄폐를 넘는 비행까지 막는 것은 아닙니다.|[1](https://overwatch.blizzard.com/en-us/heroes/mercy/) [2](https://overwatch.blizzard.com/en-us/heroes/soldier-76/)|
|미즈키 ← 키리코|ability / conditional|정화로 이동 방해에 대응할 수 있습니다. 방울 재사용 대기와 미즈키의 후속 기술을 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/mizuki/) [2](https://overwatch.blizzard.com/en-us/heroes/kiriko/)|
|모이라 ← 아나|ability / conditional|수면총으로 융화의 지속 행동을 방해할 수 있습니다. 소멸이 없는 순간과 적중이 전제입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/moira/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/)|
|솜브라 ← 윈스턴|ability / conditional|짧은 자동화기 사거리 안에서 지원 위치를 압박할 수 있습니다. 위치변환기 이탈과 약화 영역을 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/sombra/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|우양 ← 아나|ability / conditional|치유 차단으로 대상에게 들어가는 치유의 효율을 제한할 수 있습니다. 파도의 밀치기와 엄폐가 변수입니다.|[1](https://overwatch.blizzard.com/en-us/heroes/wuyang/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/)|
|젠야타 ← 윈스턴|ability / conditional|점프로 기동기가 없는 지원 위치를 압박할 수 있습니다. 부조화와 발차기의 밀치기는 주의하세요.|[1](https://overwatch.blizzard.com/en-us/heroes/zenyatta/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/)|
|젠야타 ← 아나|ability / conditional|치유 차단이 맞은 아군은 초월 치유의 효과를 받기 어렵습니다. 젠야타 본인의 무적을 해제하는 것은 아닙니다.|[1](https://overwatch.blizzard.com/en-us/heroes/zenyatta/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/)|
