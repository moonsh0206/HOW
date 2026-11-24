# HOW 전체 시스템 종합 감사

감사일: **2026-11-24, Asia/Seoul**. 공개 HTTP 교차 검증은 약 09:25~09:34 KST에 수행했다. 이날 10시 예약 실행 시각 전의 결과다.

## A. 전체 감사 요약

대상은 최신 로컬 working tree와 원격 `moonsh0206/HOW` main이다. 이번 작업은 **진단 전용**이며 제품 코드, 운영 JSON, 워크플로, 저장 정책을 수정하지 않았다. 수집기 `--apply`, Git commit/push, workflow dispatch, 배포도 실행하지 않았다.

- 브랜치: `main`, 커밋 `de6130d28c1fe1b159d82283a8855b6f8c7f286f` (`UX 슬라이드 개선`, 2026-11-23 16:59:53 KST).
- 시작 시 미커밋 변경 없음. 로컬 HEAD와 로컬 origin/main은 0/0이며, 이번에 조회한 원격 main SHA도 동일하다. 원격 fetch로 브랜치를 변경하지 않았다.
- 아래 인벤토리 **26개**: 정상 12, 부분 정상 9, 문제 3, 미검증 2.
- **정상**은 행에 명시한 데이터/계산/오프라인 검증 범위의 통과다. 전체 브라우저 UX나 모든 지역·등급의 실시간 성공까지 의미하지 않는다.
- 전체 단위·DOM 회귀 테스트 **406/406 통과**. 데이터 갱신을 제외한 프로덕션 빌드, 663개 언어별 정적 진입점, Pages 자산 23개 검증 통과.
- 주요 공개 JSON 5종과 로컬 JSON의 내용 일치. 인덱스가 참조하는 원본 스냅샷 6개도 공개 HTTP 200 및 로컬과 **바이트 일치**.
- P0 데이터 손상·허위 데이터·보안 사고를 확인하지 못했다. 이것은 포괄적인 보안 인증을 의미하지 않는다.

가장 중요한 위험/후속 확인 5가지:

1. **P1 / A01:** 실제 공개 순위 파일의 `cohorts=[]`. 순위 예약 job이 skipped여서 전일 비교를 제공하지 못한다. 알고리즘 오류와 운영 미활성화를 구분해야 한다.
2. **P1 / A02:** 그래프 보존 job 역시 skipped. 유럽·아메리카 원본 마지막 관측은 11월 6일이며, 최근 7일 그래프 데이터가 없다. 역할 평균을 빌드 때 다시 계산해도 새로운 관측은 생기지 않는다.
3. **P1 / A03:** 특전 자동 갱신 workflow/호출 연결이 없다. 공개 데이터는 11월 7일 KST 수집본이다. 현재 수치라고 단정할 수 없다. 실제 OverLooker API와도 값이 다르다.
4. **P2 / A04:** 플레이어 검색은 공급자 대소문자에 의존한다. 완전한 case-insensitive 검색이 구현된 상태가 아니다.
5. **검증 공백 / A07:** 실제 모바일 스와이프·화면 전환·CPU/GPU·터치 툴팁은 이번 감사에서 검증하지 못했다. 자동 테스트 통과를 실기기 검증으로 대체하지 않는다.

## B. 기능별 점검표

주요 경로: `src/main.js`에서 서비스·모델·컨트롤러·뷰 연결 → `heroController`의 공통 통계 → `metaDashboardController`/`routingController`의 화면 연결. `public/data`는 동종 출처 JSON, `scripts`는 수집/검증, `.github/workflows`는 원격 실행, `tests`는 오프라인 회귀, `docs/qa`는 과거 및 이번 증거다. 지역·등급·전장 조건은 `statisticsQuery()`로 정규화한다.

| # | 기능 / 상태 | 실행 경로·출처·저장/갱신 | UI·예외·테스트 및 이번 확인 |
|---|---|---|---|
| 1 | 영웅 목록·원본 통계 **정상** | `heroService` → `statisticsService` → `heroModel`; OverFast, 메모리 캐시 | 실제 KO 목록/Asia diamond 각 54명, key 누락·추가 0. `statistics.test.js`, `statisticsQuality.test.js`. 실시간 전 조건 검증은 아님 |
| 2 | 필터·합성 등급 **정상** | `statisticsModel`, `compositeStatisticsModel`, 서비스; 구성 등급 균등 평균 | PC/모드/지역/등급/전장 키 격리. 역할은 프런트 필터. 저장 원본·합성 산술 검증 통과. `compositeDivisions.test.js` |
| 3 | Meta Score·HOW 추천 티어·정렬 **정상** | `domain/meta.js`, `recommendationPolicy`, `heroModel` | 65/25/10, 역할 내 백분위, 결측 제외. 실제 표본 54명 분류. `ranked`, `sorting`, `recommendationPolicy` 테스트 |
| 4 | 원본 스냅샷 구조·조회 **정상** | `snapshotService`, `snapshotV2Model`; `data/snapshots` | 38 인덱스 항목/6파일; 누락·중복 인덱스 없음, 공개 원본 전부 동일. 실패/조건 불일치 방어. `snapshot`, `groupedIntegration` 계열 |
| 5 | 합성·역할 평균 파생 **정상** | `derive-role-means` → `roleMeanModel` → `roleMeanService`; `data/role-means` | 66관측, 실제 원본에서 재계산 시 changed=false. 평균은 역할의 공식 경기 승률이 아님. `dashboardHistoryIntegration.test.js` |
| 6 | 일일 순위 계산·비교 엔진 **정상** | `dailyRankModel`, `rankArchiveModel`, `scripts/lib/dailyRanks` | 같은 조건/정책/로스터, 전일만 비교. 10시 경계·실패·정책 변경 테스트 통과. 실제 데이터 제공은 #22 문제와 구분 |
| 7 | 최신 전체 공식 패치 선택 **정상** | `officialPatchService/Model` → `heroView`; `data/patches/notes.json` | 최신 11/16 시스템 핫픽스, 영웅 변경 0도 표시 가능. 공식 KO/EN 월별 패치 ID 일치. `systemPatches`, `patchAutomation` 테스트 |
| 8 | 영웅별 관련 패치 **정상** | `latestHeroPatch` → `heroPatchView` | 아나 11/03, 레킹볼 11/05 유지. `previous-update` 제외, 모드 분리. 패치 접기 상태 회귀 통과 |
| 9 | 특전 매핑·비교·원본 보존 **정상** | `perkArchiveModel`, `perkSelectionModel`, `perkStatisticsService`, `perkStatisticsView` | 54영웅/216특전 정규화 성공. 0/null 구분, 두 항목 합을 강제로 100으로 재정규화하지 않음. `perkArchive`, `perkComparison` 테스트 |
| 10 | SEO·Pages 정적 경로 **정상** | `i18n/routes`, `seo`, `render-localized-pages`, `verify-pages` | 663 진입점, /HOW/ 자산 23개 검증. 개인 프로필 hash/noindex 정책 회귀 포함. 실제 검색엔진 색인 여부는 미검증 |
| 11 | 번역 키·보간 형식 **정상** | `src/i18n/{ko,en,ja}`와 rank/map 뷰 | 감사 스크립트 817키/467호출, issues=[]; 브라우저별 번역 길이 검증과는 구분 |
| 12 | 실패·캐시·세대 토큰 방어 **정상** | 통계/플레이어/맵/히스토리 서비스·컨트롤러 | timeout/429/503/Retry-After/중복 요청/이전 응답 배제 mock 회귀 통과. 실제 장애 유도는 하지 않음 |
| 13 | TOP 카드·자동 순환 **부분 정상** | `dashboardSelection/pickLeaders` → `dashboardCycle` → `metaDashboardView` | 같은 지표로 역할별 선두 선택, 5.5초 표시 후 전환 완료 기준 재예약. Hover/Focus/hidden/reduced 정지 테스트. 실브라우저 타이밍 미검증 |
| 14 | Spotlight·HOT·최근 변화 **부분 정상** | `insights.hotHeroes`/`metaDashboardModel`, 이전 원본 조회 | HOT 후보 우선, 없으면 현재 HOW 정렬 1위 fallback. 불꽃/이름/score 바인딩 회귀 통과. 모든 Spotlight가 HOT v2 충족 영웅인 것은 아님 |
| 15 | 역할 평균 승률 그래프 **부분 정상** | `roleMeanService` → `dashboardHistoryView` | 기본 Asia diamond_plus 7일은 11/20 한 점. Europe/Americas 7일은 0점. UI 계산은 정상이나 장기 추이 자료 부족 |
| 16 | 맵 주요 영웅·이미지 **부분 정상** | `mapService`, dashboard map generation token, `statisticsService` | 동일 공통 조건 + 선택 map. 이미지와 요청 토큰/실패 fallback 회귀 통과. 실제 전장별 통계 전수 API·이미지 브라우저 미검증 |
| 17 | 영웅 상세·이력·전장 비교 **부분 정상** | `routingController`, `heroDetailService`, `snapshotService`, `mapStatisticsController`, 그래프 뷰 | 실제 Genji detail HTTP200. 지표/기간/막대 전환·애니메이션 lifecycle 테스트 통과. 장기·전장별 저장 원본 제한, 실제 터치 미검증 |
| 18 | 플레이어 검색·대시보드 검색 연결 **부분 정상** | `overfastPlayerProvider`, `playerSearchController`, `how:playersearch` → router | 실제 3가지 대소문자 결과 1/0/0. 입력 검증·공개/비공개·429·재시도 테스트. A04 제한 |
| 19 | 플레이어 대시보드·영웅 역할 필터 **부분 정상** | `playerModel`, provider summary/competitive, `playerSearchView`, rank 뷰 | 실제 공개 표본 19전/6승13패/31.58%/KDA1.71, 영웅 5행 정규화. 역할별 최대 시간 막대·미확인 역할 정책 테스트 통과. 실UI 미검증 |
| 20 | 즐겨찾기·언어 전환·콤보박스 **부분 정상** | local storage, player/hero controller, `filterCombobox`, `playerRankView` | 기존 저장/카드 클릭 구분/언어 상태/ARIA 키보드 테스트 통과. 브라우저 저장 제한·3개 언어 폭별 화면 미검증 |
| 21 | 라우팅·모바일 스와이프·인트로 **부분 정상** | `routingController`, `i18n/routes`, `menuSwipe`, `brandIntro` | hash/localized 경로·상세 제외·상태 정리·Reduced Motion 테스트 통과. 실제 화면 모션/뒤로 가기 제스처 미검증 |
| 22 | 일일 순위 운영 수집·게시 **문제** | `daily-ranks.yml` → collector → Pages current.json | 최근 publish skipped, 공개 cohorts=0. 정상 등락 배지가 생성될 수 없음. A01 |
| 23 | 그래프 운영 수집·영구 보존 **문제** | `graph-snapshots.yml` → adaptive collector → how-graph-archive → Pages | publish skipped, 공개 관측 누적 중단, archive branch 공개 조회404. A02 |
| 24 | 특전 자동 갱신 **문제** | `collect-overlooker-perks.js`는 있으나 workflow 호출 없음 | 자동화 구현/운영 증거 없음, 공개 수집본 17일 경과. A03 |
| 25 | 전 화면 실브라우저·모바일 UX **미검증** | 실제 PC·모바일 렌더링/녹화 | Computer Use가 URL 확인 정책으로 중단. DOM 테스트나 이전 QA 캡처를 이번 실제 검증으로 보고하지 않음 |
| 26 | 장시간 메모리·CPU·GPU·실패 후 실기기 복구 **미검증** | 프로파일러·실제 저사양 기기 필요 | 코드의 정리/중복 억제와 단위 테스트는 확인했으나 런타임 프로파일링은 미수행 |

## C. 자동화 현황

확인 출처: [GitHub Actions](https://github.com/moonsh0206/HOW/actions), 공개 REST 응답 `qa/system-audit/remote-workflows.json`, `remote-runs.json`, `actions-evidence.json`. 45개 최신 run을 먼저 조회하고 manual workflow별 최신 목록을 별도 조회했다. 전체 과거 이력을 전부 열람한 것은 아니다. 아래 시각은 KST다.

| workflow | 설정 트리거·권한·저장 | 실제 확인 결과 | 게시/복구 판단 |
|---|---|---|---|
| daily-ranks.yml | 매일 UTC `0 1 * * *`=10:00 KST. `HOW_RANKS_ENABLED=='true'` 및 main 조건. pages/id-token write, contents read | [11/23 17:50:35 run 45141878673](https://github.com/moonsh0206/HOW/actions/runs/45141878673), schedule/completed/skipped, publish 자체 skipped. 11/21·22도 skipped | 실제 수집/게시 성공 아님. 공개 빈 파일과 일치. `HOW_RANKS_URL`의 실제 저장값은 접근하지 못해 미검증. main SHA는 조건 충족이므로 enabled 변수가 true로 평가되지 않았다는 강한 근거가 있지만 unset/false 구분은 못함 |
| graph-snapshots.yml | UTC 매시17분 확인. HOW_GRAPH_ARCHIVE_ENABLED flag. 데이터 전용 branch contents write 및 Pages 권한 | [11/24 05:12:22 run 45256927957](https://github.com/moonsh0206/HOW/actions/runs/45256927957), publish skipped. 앞선 표본도 skipped | 설정 등록 active와 데이터 파이프라인 활성은 다름. `how-graph-archive` 공개 ref404. branch 미생성 가능성이 높으나 숨김/조회 제한 가능성까지 배제하진 않음 |
| daily-snapshots.yml | workflow_dispatch만 있음. contents read, 원본을 30일 artifact에 업로드 | 별도 workflow runs API total_count=0 | 매일 자동 수집 아님. 스크립트는 기본 실행으로 파일을 쓸 수 있어 감사에서는 실행 안 함. 저장소·Pages 게시 단계 없음 |
| patch-snapshots.yml | workflow_dispatch만 있음. proposed cron은 주석. artifact30일 | 별도 workflow runs API total_count=0 | 패치 원본 자동 수집/영구 게시 성공 증거 없음 |
| official-patch-notes.yml | UTC `0 1 * * *`, prepare read, changed일 때만 publish contents/pages/id-token write | [11/23 17:37:06 run45140070109](https://github.com/moonsh0206/HOW/actions/runs/45140070109), prepare success, publish skipped | job 로그 checkedAt17:37:48: review-required, changed=false, 영웅65/시스템1 유지, 시스템13건/2패치 검토 대기. 무변경이므로 publish skipped는 정상. 검토 artifact14801013734 생성 |
| pages.yml | main push/dispatch, build read, deploy pages/id-token write | [11/23 16:59:59 run45135146940](https://github.com/moonsh0206/HOW/actions/runs/45135146940), build/deploy success | graph/ranks restore step은 모두 skipped. 현재 공개 JSON은 checkout 기본본과 동일. 실제 사이트 /HOW/ 공개 JSON 200 확인 |

모든 6개 workflow는 REST의 `state=active`다. 하지만 일일 순위/그래프의 **job이 실행된 것은 아니다**. 현재 브랜치 조건과 vars gate, 실제 job 결과를 함께 읽어야 한다. 예약 시각은 정확한 수집·게시 시각이 아니며, 표본은 예약보다 수시간 지연됐다. 지연 원인이 GitHub scheduler인지 다른 원인인지는 이번 로그만으로 확정하지 않는다. 11/24 10시 작업을 실패/누락으로 판정하지 않았다.

실제 설정 값의 확인 경로: Repository → Settings → Secrets and variables → Actions → Variables. `HOW_RANKS_ENABLED`, `HOW_RANKS_URL`, `HOW_GRAPH_ARCHIVE_ENABLED`, `HOW_GRAPH_PUBLIC_URL`, 선택적 `HOW_GRAPH_PATCH_ID`를 읽어야 한다. 이번 감사에서는 수정하지 않았다. Pages 관리 REST는 비인증404이므로 관리 설정 전체는 미검증이며, 이를 Pages 미존재로 해석하지 않는다.

## D. 데이터 신선도·무결성

| 종류·저장 위치 | 마지막 확인 / 실제 표시 자료 | 갱신·누락·판정 |
|---|---|---|
| 실시간 OverFast | 11/24 09:27경 Asia PC competitive diamond HTTP200, Age2044초 | 조회 시각과 공급자 캐시 나이를 구분. 캐시 Age는 집계 완료 시각/패치 반영 증거가 아님. UI 기본은 diamond_plus이며 이 단일등급 표본을 기본 화면 수치로 보고하지 않음 |
| snapshots/index.json + 6원본 | 38 인덱스, 최신 Asia11/20 09:24:17.773; Europe11/06 11:38:15.725; Americas11/06 11:38:31.943 | 원본9등급(전체+8개) ×3지역은11/06에 있음.11/20은 Asia만. 전부 PC/competitive/map=all. quickplay/특정전장/콘솔의 저장 이력 없음. 인덱스 누락파일·미참조 JSON 없음 |
| role-means/observations.json | 66관측, 기록 날짜11/02·04·06·20; generatedAt11/20 09:24:17.921 | 파생 재계산 changed=false. Asia diamond_plus 7일 한 점,30일 두 점(11/06·20). Europe/Americas7일0점,30일한 점(11/06). 기본 7일 추이선이 없는 것은 자료 부족이며 가짜 선을 그려서는 안 됨 |
| ranks/current.json | schemaVersion1, generatedAt=null, cohorts0 | 오늘/어제 기준 모두 없음. 공개본도 동일. 캐시 만료만으로 배지가 생기지 않음 |
| patches/notes.json | 3패치, 영웅 변경65건·시스템1건. 최신 canonical date11/16, KO title date11/17, reviewedAt11/21 | 공식 KO/EN 11월 페이지 최신 patch ID도11/16. 월별 목록 기준 신규 패치 누락은 확인되지 않음. 원문 수정·검토 대기13건은 별도 |
| perks/overlooker-perks.json | 11/07 01:38:44.705 KST,54명/216특전 | 브라우저 fetch시각을 새 수집 시각으로 오인하면 안 됨. providerUpdatedAt/patch/window/표본 분모는 null. 공개 API 1회 HTTP200·54명/216특전 매핑 성공, 저장된 선택률·건수와 불일치 확인 |
| 카운터·시너지 | src/data에 저장된 수동 검토 자료 | 측정 승률이 아님. 카운터54검토/50명내용/82관계/상충 근거3건을 표시·검증. 시너지는 manual-kit-review, reviewedAt11/04. 신규 키/패치 이후 재검토 필요성은 있으나 오류로 단정하지 않음 |

역할별 평균은 **역할 내 모든 영웅의 승률 균등 평균**이다. 합성 등급은 **구성 등급 통계의 균등 평균**이다. 경기 수/플레이 시간 가중 공식 통계가 아니다. 유효한 전체 역할 roster가 부족하면 해당 역할 값을 null로 둔다. 이번 저장 평균의 null 역할 관측은 0건이다.

보관 정책: `snapshotRetentionModel.retentionPlan`은 dry-run 제안이다. 최근14일, 미검증/현재 패치, 명시 보존 태그 등은 보호하고, 검증된 과거 패치의 대표 기록을 보존하도록 계획한다. 자동 삭제가 실제 실행됐다는 증거는 없다. `adaptiveSnapshotModel`은 D+1/3/7/14와 이후 주간, 실제 effectiveAt이 없으면 일반 주간 관측이다. 따라서 **모든 그래프 원본을 매일10시에 수집하는 정책이 현재 자동화된 것은 아니다**. 역할 평균은 원본이 보존 범위에서 빠져도 compact 기록을 합쳐 유지한다. 원본 영구 보존 branch가 활성화됐다는 증거는 없다.

## E. 발견 사항과 재현

### A01 — P1: 일일 순위 데이터 미생성 / 운영 gate 미충족

- 조건·증거: 공개 `/HOW/data/ranks/current.json` HTTP200, cohorts=[]; 최근3회 schedule run skipped, latest publish job skipped.
- 관련: `.github/workflows/daily-ranks.yml`, `scripts/collect-daily-ranks.js`, `scripts/lib/dailyRanks.js`, `rankFiles.js`, `dailyRankService`, `rankArchiveModel`, `heroController`.
- 직접 원인: 비교할 저장 순위가 없으며 job이 본문까지 실행되지 않았다. `live-order-mismatch`가 현재 직접 원인이 아니다. 현재 코드는 순서 불일치를 `ready-stored-order`로 제공하고 일일 기준 시각을 포함한다.
- 영향: 모든 역할의 실제 전일 등락 미표시. 첫날/누락일 숨김 자체는 올바른 동작이다.
- 재현: 공개 JSON GET → cohorts.length=0 → 역할 필터·HOW 티어순에서도 Map이 비어 있음. UI 브라우저 재현은 미수행.
- 권고: 사용자 승인 후 enabled/URL 설정 읽기·검증, 첫 수집 및 연속 두 기준일 게시를 확인. 첫날에 가짜 등락을 만들지 말 것. URL 오류 여부는 현재 미검증.
- 성공 기준: `dailyRank`, `lightweightRanks`, `rankRepair` 테스트 + 두 실제 연속 reporting day의 정책/로스터/조건 일치 + 공개 comparison/deltas. 현재 기준값으로 과거 날짜를 소급 생성하지 말 것.

### A02 — P1: 그래프 운영 파이프라인 미실행·관측 누적 공백

- 조건·증거: graph publish skipped, 일반 Pages restore skipped, graph archive ref404. Europe/Americas 최신11/06, 최근7일0점. Asia는11/20 한 번 이후 추가 원본 없음.
- 관련: `.github/workflows/graph-snapshots.yml`, `scripts/graph-archive.js`, `scripts/lib/graphArchive.js`, adaptive collector, `roleMeanService`.
- 원인: 운영 job gate가 통과하지 않음. 두 manual snapshot workflow는 schedule/게시 연결이 없고 run0. build의 role-mean derivation은 관측 수집기가 아니다.
- 영향: 실제 자료가 누적되지 않아 그래프/최근 변화/HOT의 활용 가능한 비교 조건이 제한됨. Europe/Americas의 원본 공백은 일반 주간 정책보다 길다.
- 권고: 승인 후 영구 branch bootstrap·flags·URL·주간/패치 스케줄을 확인하고 복구. 원하는 목표가 일일 역할 평균이면 현재 주간 정책과의 차이를 먼저 결정할 것. 빠진 날짜를 오늘 통계로 채우지 말 것.
- 성공 기준: adaptive/graphArchive/compositeHistory 회귀, 원본 SHA·인덱스·attempt ledger·public verify, 일반 Pages와 패치 게시 후 동일 공개 원본 유지.

### A03 — P1: 특전 자동 갱신 연결 부재·오래된 게시본

- 증거: 6개 workflow 어디에도 OverLooker collector 호출이 없다. 공개·로컬은11/07 KST 동일본. 11/24 공개 OverLooker API 1회 조회에서 54명/216특전 정규화는 성공했으나 저장 선택률·건수가 달랐다. Ana minor local_anesthetic는 저장54.75%/415건, 현재56.33%/681건이었다. collector는 명령만 실행해도 원본 파일을 원자 교체하므로 감사에서는 실행하지 않음.
- 관련: `scripts/collect-overlooker-perks.js`, `perkArchiveModel`, `perkStatisticsService`, `public/data/perks/overlooker-perks.json`.
- 영향: UI는 저장된 실제 수치를 보여주지만 최신 특전 선택률이라는 보장은 없다. 수집일은 뷰가 표시한다. provider 집계 시각/기간/분모를 추측하지 않는다.
- 권고: 제공자 허용 범위와 주기를 확인한 뒤 별도 승인하에 수집→검증→게시 연결. 새 영웅·특전 mapping 변경은 기존 strict 검증을 유지하며 명시적으로 처리.
- 성공 기준: perkArchive/perkCardBinding/perkComparison 회귀, 수집 실패 시 기존 bytes 유지, 실제 공개 collectedAt 갱신. 단순 페이지 재조회는 성공 기준이 아님.

### A04 — P2: 플레이어 대소문자 무시 검색은 제한적

- 실제 GET: `TeKrop` total1, `tekrop`0, `TEKROP`0, 모두200. `player-probe.json`에 별도 이름으로 증거 보존.
- 관련: `overfastPlayerProvider.search()`의 exact-first와 `knownSpellings`. 실패 검색은 이전 성공/즐겨찾기에서 기억한 유일한 철자가 있을 때만 추가1회 재조회한다.
- 영향: 새 세션에서 잘못된 대소문자 입력은 검색 결과가 없을 수 있음. 서로 다른 playerId를 합치는 오류는 이번 표본에서 확인되지 않았다.
- 권고: 제한을 정확히 유지·안내하고 제공자 case-insensitive 지원 여부를 검토. 대소문자 조합 무차별 재요청이나 반환 playerId/BattleTag 변경 금지.
- 테스트: playerCaseMotion/playerSearch/playerStability. 비공개·없는 계정·429/503은 mock 회귀이며 이번 실제 장애 응답으로 검증한 것은 아니다.

### A05 — P3: opt-in live 테스트의 기본 등급 기대값이 오래됨

- `tests/live/overfast.integration.js`는 service.getStatistics() 기본 등급을 diamond로 assert한다. 현재 `DEFAULT_FILTERS`는 diamond_plus다.
- 기본 서비스가 정상 동작해도 이 assertion은 실패할 수밖에 없다. 일반 npm test에는 포함되지 않아406개 성공에 드러나지 않는다. 이번에는 추가 실제 복합 요청을 유발하는 이 테스트 전체를 실행하지 않았다.
- 권고: 기본 정책에 맞춰 assertion·테스트 제목을 갱신하고, 단일 diamond API 계약은 명시 필터 테스트로 분리. 현재 제품 API 오류와 혼동하지 말 것.

### A06 — P2 검토 대기 / 오류 확정 아님: 공식 시스템 변경13건

- 11/23 prepare 실제 로그: review-required, changed=false, pendingPatches2, pendingSystemChanges13. 대상11/03·11/05;11/16은 저장돼 있다.
- 미검증 일반 문장을 자동 확정하지 않는 정책에 따른 보류다. job success를 모든 변경 완전 반영으로 해석하면 안 된다.
- 권고: run의 official-patch-review artifact에서 KO/EN 원문과 수치·분류를 검토. 승인된 사실만 archive 추가. 시스템 변경이 영웅 마지막 변경 카드를 덮어쓰지 않도록 systemPatches 회귀 유지.

공급자 최신 특전 표본은 11/24 09:33:42 KST의 공개 API 응답이며, HOW 저장 파일을 교체하지 않았다. 재현 증거는 overlooker-probe.json과 overlooker-live.json이다. 집계 기간·패치 반영은 여전히 미검증이다.

### A07 — 검증 공백: 실브라우저·성능

- 브라우저 connector host unavailable. Native Chrome 제어 시 Computer Use가 Windows 현재 URL을 신뢰성 있게 판별하지 못해 정책상 중단했다. 우회 제어는 하지 않았다.
- 실제 320/390/430/1440px, 연속 스와이프, 화면 중간 이동·뒤로/앞으로, 3개 언어 overflow, 그래프 touch/focus, 배경 불티 CPU/GPU는 미검증.
- 관련: menuSwipe/routingController/dashboardHistoryView/dashboardEmbers/brandIntro와 공통 CSS.
- 권고: 연결 복구 후 실제 브라우저/기기에서 화면 녹화·동작 중 프레임·network·performance로 확인. 현재 자동 테스트만으로 UX 문제가 없다고 확정하지 않는다.

## F. 기능 간 충돌 및 데이터 의미

- **정렬 정책:** meta-v2의 65/25/10 가중치는 요청한 정책과 일치. S 자격은 역할 수5+, 승률50+, 픽률1+, 승률백분위60+, 픽률백분위40+; 표시 추천정책 meta-v2.1은 S 픽률5% 조건, A 내 standard/conditional/low 그룹을 추가한다. 단순 Meta Score 내림차순과 HOW 티어순은 같지 않다. 동률 최종 기준은 이름(ko 비교) 후 hero key. 언어별 이름 변화 시 완전 동점 순서가 달라질 수 있으나 저장 수집은 KO 목록을 사용한다. 정책 변경 시 ID 갱신이 필요하다.
- **일일 순위:** `rankDay()`는 UTC시각에서1시간을 빼고 날짜를 취해10시KST 경계를 구현한다. 같은 reporting day 재실행은 기존 성공 기준을 유지하고 누락 cohort만 시도한다. 기존9원본등급×3지역=최대27 통계 요청+영웅목록1 요청/일;7합성등급은 메모리 파생.48 cohort, 역할별 최대144개의 순위열을 저장 가능. 전장은 all만 지원하며 임의 확대하지 않았다.
- **순위 비교:** 어제위치-오늘위치; same filters/policy/meta/recommendation/roster/patch/window 및 전일 기준 검증. 전일 없거나 역할 중 하나 미분류면 그 역할 비교 불가. 원본 비율은 저장하지 않고 최종 key 배열과 메타데이터·cache age·comparison만 저장한다. cache age와 실제 집계 시각은 별개다.
- **실시간 순서와 일일 순서:** storedRankChanges는 badge의 currentRank/previousRank를 저장 배열에서 구하며 liveRank를 별도 제공한다. 순서 불일치를 승률 변화로 해석하지 않는다. 전체 역할/다른 정렬에는 숨김. 현재 공개 데이터가 비었으므로 이 완화가 운영 배지를 만드는 것은 아님.
- **게시 충돌 방지:** 네 Pages 게시 workflow는 concurrency group `pages`, cancel-in-progress=false를 공유한다. 일반/패치/그래프 게시에서 독립 ranks/graph 복원 단계가 있다. 현재 flags gate로 restore 자체 skipped. future 활성화 후의 실제 교차 재배포·게시 실패 복구는 아직 운영 검증되지 않음.
- **보존:** 그래프 branch persist는 배포 전에, rank 공개 확인은 성공 배포 후 이루어진다. ranks는 새 파일에 오늘·전일 deltas를 담고 과거 일별 원본을 누적하지 않는다. 그래프 원본과 파일 구조를 분리한다. 현재 운영본 삭제/손상은 확인되지 않음.
- **HOT vs Spotlight:** HOT v2는 픽률+1.0%p·승률+0.5%p 동시 충족, 현재 최소픽률1%, 최대3명, winDelta→pickDelta→key 정렬. 최소 상승폭은 통계적 유의성 검정이 아니다. 최신 Spotlight는 fallback 포함. 매칭 조건·출처·patch/window·관측1~7일 간격을 확인한다.
- **필터/캐시:** 통계 키는 platform/gamemode/region/competitive_division/map 또는 합성그룹. 동일 pending Promise 공유, 동시 원본3개 제한, TTL 기본1시간, 공급자Age 차감. 실패는 retryAt과 stale 표시. API에서 제공한0과 null을 구분하되 OverFast 승률0은 품질 검토로 취급한다.
- **비동기 상태:** heroController·mapStatisticsController·dashboard controller·player controller의 세대 토큰 및 조건 재검증이 이전 응답 덮어쓰기를 막는다. 실제 중복 네트워크 부하는 브라우저 측정하지 못했으며 mock 테스트만 통과했다.
- **모바일 모션:** 스와이프는767px 이하+coarse,80px/1.5배,가장자리28px 제외, touch identifier 추적. SVG/canvas/입력/가로 scroll/dropdown/modal/사용자 ignore 제외. route click 재사용,160ms퇴장/270ms진입, 임시 스타일 정리, 제목 중복 모션 억제. 실기기 scroll jump/가로모드(767px 초과 시 비활성) 별도 확인 필요.
- **플레이어 데이터:** API KDA를 그대로 사용하고 K/D를 KDA로 대체하지 않는다. 실제 표본 일반값31.58%,6승13패,19경기. Lucio는0경기여도198초가 제공되며 숫자를 임의 보정하지 않는다. summary 시즌22/last_updated_at을 현재 시즌으로 확정하지 않는다. 영웅별 상세는 이미 받은 total/average 등 개인 통계 범위이며 출처 없는 티어 평균을 만들지 않는다.
- **특전:** Ana minor54.75%+44.99%=99.74%처럼 합계가100이 아닐 수 있다. `remaining`/partial 처리하며 양쪽 너비를 강제로100%에 맞추지 않는다. providerSampleSize의 단위·stage 분모는 미검증이며 선택률을 count/sample로 재계산하지 않는다. HOW 지역·등급 필터 통계와 혼합하지 않는다.

## G. 검증 명령·증거·제한

이번 실행 결과:

| 명령/확인 | 결과 |
|---|---|
| `npm.cmd test` | 406 passed /0 failed, 약72.3초. mock/DOM 회귀이며 실제 통계 수집 성공으로 해석하지 않음 |
| `node node_modules/vite/bin/vite.js build` | 성공, 기존500kB chunk 경고. 운영 데이터 갱신 단계 제외 |
| `node scripts/render-localized-pages.js` | 663 진입점 생성, 개인 프로필 hash 유지 |
| `node scripts/verify-pages.js` | /HOW/,23 local assets 통과 |
| `node scripts/verify-snapshot-archive.js` | 통과. 38 index/6 files, grouped4개×1134=4536개 합성 수치 독립 검산 및 실제 service/history 연결 확인. 기준시각은 최신저장시각+1초인 검사이므로 현재 날짜의 최신성 증거와 구분 |
| `node scripts/derive-role-means.js` | dry-run changed=false,applied=false,66관측/6파일. `--apply` 사용 안 함 |
| `node scripts/audit-i18n.js` | 817 keys,467 calls,issues=[] |
| `node scripts/verify-counters.js` | 54검토,50populated,82관계,상충근거3건 검증 성공 |
| 공개 JSON 및 원본 GET | 주요5종 내용 일치, 원본6개 byte 일치, 모두200 |
| 실제 OverFast | heroes54/stats54/Genji detail200,CORS `*`; 플레이어 세 철자200·공개 summary/competitive200 |
| 실제 공식 KO/EN 페이지 | HTTP200, 최신11/16·11/05·11/03 ID 일치. 수집기 전용 patchHeroNames로 파서 재실행: added/updated0, 시스템13건 보류 재현 |
| Actions jobs/logs | patch prepare실행·review pending, daily/graph skipped, Pages deploy success 확인 |
| 브라우저/실기기 | 정책상 중단, 미검증. 새 녹화/스크린샷 없음 |

`npm run build` 원문은 `derive-role-means.js --apply`를 먼저 실행하므로 그대로 실행하지 않았다. 동일한 Vite·정적 생성·검증을 분리 실행했고, role-mean dry-run 무변경을 확인했다. 수집기 기본 실행이 쓰기를 하는 경우(`collect-overlooker-perks`, manual snapshot collectors, prepare-patch)는 실행하지 않았다.

실제 API probe 첫 stats 요청은 감사자가 수동 작성한 `division=diamond&map=all`로422를 받았다. 앱은 실제로 `competitive_division=diamond`와 map=all 생략을 사용하며 그 요청은200이다. **초기422는 제품 결함이 아니다.** `network.log`의 실패와 `cross-check.json`의 수정된 실제 쿼리 성공을 구분한다.

공식 파서의 최초 감사 재현은 일반 영웅 API 목록에 
ameEn이 없어 검토 근거 불일치로 중단됐다. 실제 수집기와 동일한 src/data/patchHeroNames.json으로 다시 실행하여 정상 재현했다. 이 입력 오류를 운영 파서 결함으로 분류하지 않는다.

대소문자별 HTTP 증거는 Windows 파일명 case-insensitive 충돌을 피하도록 `player-search-mixed/lower/upper.json`으로 보존했다. `player-probe.json`을 검색·프로필 최종 증거로 사용한다. 최초 cross-check의 검색 total은 당시 응답 요약이고 raw 파일 이름은 이후 명시적 이름으로 교체했다.

증거 디렉터리: [qa/system-audit](qa/system-audit/). 주요 파일: `tests.log`, `build.log`, `pages.log`, `snapshots.log`, `local-data.json`, `remote-summary.json`, `actions-evidence.json`, `cross-check.json`, `public-integrity.json`, `player-probe.json`, `official-replay.json`, `overlooker-probe.json`. HTTP 증거는 조회 시점의 사본이며 운영 성공의 미래 보증은 아니다. 실제 서비스 장애·공급자 제한을 일부러 유발하지 않았다. 권한 있는 repo variables 값, Pages 관리 설정, 장기간의 모든 run 이력은 미검증이다.

## H. 수정 로드맵 — 아직 실행하지 않은 권고

1. **데이터 무결성·자동화:** A01/A02부터 사용자 승인하에 vars와 최초 baseline/영구 branch/정확한 URL을 점검. daily-ranks·graph-snapshots·graphArchive·rankFiles 및 독립 데이터 restore를 대상으로 한다. 성공 기준은 두 연속 실제 rank day + 원본 영구 보존 + 일반 Pages 재게시 후 데이터 동일성이다. 스케줄 수동 실행 역시 별도 승인 필요.
2. **비교·보관:** 원본 patch 적용시각이 검증된 경우에만 D+n 정책을 사용. 현재 일반 주간과 원하는 일일 역할 평균 수집의 차이를 결정. snapshotRetention/roleMeanModel/derive-role-means의 roster migration과 실패시 이전본 보존을 테스트. API 호출 범위를 임의로 전장 전체로 확대하지 말 것.
3. **UI·그래프·전적:** A04 공급자 검색 제한과 A07 실기기 검증부터 확인. menuSwipe/routingController/dashboardHistoryView/player provider를 실제 320/390/430px·PC·세 언어·빠른 입력/뒤로가기·장기데이터로 검증. 결함이 재현될 때만 해당 코드를 수정. 특전은 수집일·출처·불완전 합계 의미 보존.
4. **성능·유지보수:** A05 opt-in live 테스트 기대값 수정, 원본/API fixture 갱신 체계, 운영 경보에서 workflow success와 review-required/skipped를 분리. 브라우저 performance·메모리·불티 장시간 사용량을 계측한 뒤 필요시 최적화. chunk 경고는 측정 전 장애로 분류하지 않는다.

## I. 최종 결론

실제 검증된 것은 표본 OverFast/API 매핑·Meta 계산, 저장 아카이브의 내부 및 공개 무결성, 406개 회귀, 정적 빌드·Pages 경로, 공식 최신 시스템 패치 선택과 영웅별 마지막 관련 패치 유지다.

운영에서 제공되지 않는 것은 현재 빈 일일 순위 비교 결과이며, 원인은 계산 엔진보다 **수집 job 미실행과 baseline 부재**에 있다. 그래프 관측과 특전 데이터도 자동 최신화가 정상 작동한다고 보고할 수 없다. 원본/파생 자료는 손상되지 않았지만 신선도와 연속 관측의 범위가 제한돼 있다.

현재 코드가 존재한다는 사실, workflow active 표시, 테스트 통과만으로 전체 서비스가 운영 정상이라고 결론내리지 않는다. 공식 패치 신규 ID 누락은 이번 월별 대조에서 없었고, 시스템13건은 안전하게 보류돼 있다. 수집 실패나 누락 날짜를 가짜 데이터로 채울 이유가 없다.

자동 갱신·전일 순위가 제공되는 서비스라고 배포/안내하기 전에는 A01~A03의 운영 범위를 결정하고 실제 공개 결과로 검증해야 한다. 브라우저·실기기 검증이 남아 있어 모바일 모션·가독성·성능의 최종 승인도 보류한다. 이번에는 보고서와 감사 증거만 작성했다.
