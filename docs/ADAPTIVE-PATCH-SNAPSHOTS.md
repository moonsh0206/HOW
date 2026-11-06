# 패치 중심 적응형 스냅샷 — 로컬 구현 결과

검토일: 2026-11-06 (KST). 실제 API 수집·스냅샷 생성·삭제·원격 작업은 수행하지 않았다.

## 현재 데이터와 기존 구현

공개 index 및 로컬 public/data/snapshots에는 v1 두 파일만 있다. 2026-11-02 아시아 전체 등급, 2026-11-04 아시아 다이아몬드이며 각각 54명이다. 다른 지역·등급 또는 누적 평균의 실제 저장 완료로 표현할 수 없다. 두 자료는 등급이 달라 변화량 분포나 추가 수집 임계값 학습에 사용할 수 없다. 원격 main을 새로 조회하지 않고 로컬 실제 파일을 기준으로 확인했다.

기존 미커밋 작업에는 이미 grouped v2 9개 원본/7개 파생, 원본 완전성 검사, 동일 배치 5분 허용 범위, 파생 재계산 검증, 상세 그래프·HOT 연결, 14일 dry-run 보존 기능이 있었다. 이를 재사용했다. 운영 Meta v2 65:25:10과 diamond_plus 기본값은 변경하지 않았다.

## 수집 정책

adaptiveSnapshotModel은 검증 가능한 effectiveAt과 balance/hotfix/hero-hotfix 유형이 있을 때만 계획을 만든다. 게시 날짜로 적용 시각을 추정하지 않는다. 현재 카탈로그의 effectiveAt은 null이므로 실제 운영 계획은 보류된다.

- D+1, D+3, D+7, D+14, 이후 7일 간격. 적용 시각으로부터 경과한 24시간 단위이며 날짜 자정으로 앞당기지 않는다.
- 지나간 목표를 오늘 값으로 소급 채우지 않는다. D+7에 처음 실행되면 D+7 후보이며 D+1/D+3으로 기록하지 않는다.
- 직전 성공 관측 이후 24시간 제한. 최초 72시간 내 추가 관측은 운영자가 변화 경보를 검토한 경우 최대 1회. D+2는 자동 확정하지 않는다.
- 지역별 최근 24시간 시도 최대 2회. 실패/중복 판정도 시도 예산을 소비한다. CLI는 node_modules/.cache/how-adaptive-attempts.json에 시도를 먼저 기록한다. 이 로컬 캐시를 지우면 예산 이력이 사라지므로 운영 시 별도 영속 실행 원장이 필요하다.
- describeObservationChanges는 동일 조건의 품질 유효 지표에 대한 실제 %p 차이 목록을 제공한다. 절대 임계값은 미확정이다. 추후 동일 코호트 관측 분포와 요청 비용을 보고 운영 경보 기준을 정해야 하며 통계적 유의수준이 아니다.
- 계획의 targetPatch/milestone은 일정 메타데이터일 뿐이다. 통계의 patch/patchVerification은 별개이며 자동 verified 처리하지 않는다.

## 요청량과 실행 경로

collectAdaptiveRegions는 3개 지역을 순차 처리하고 지역 내 9개 원본도 순차 요청한다. 한 번에 최대 27회, 지역별 9회이며 7개 평균에는 API 호출이 없다. 단일 지역만 명시하면 최대 9회. 3개 지역 모두 일일 예산을 소진하면 최대 54회/24시간이다. API 서비스의 1시간 캐시·타임아웃·중복 요청·오류 처리를 그대로 재사용한다. 모든 54명/9개 등급이 완전한 지역 배치만 새 수동 실행 CLI에서 저장한다. 실패한 지역은 기존 정상 파일을 덮어쓰지 않는다. 재시도에서 캐시가 있는 등급은 서비스 범위 내 재사용한다.

오프라인 계획:

```sh
node scripts/plan-adaptive-snapshots.js local-plan.json
node scripts/collect-adaptive-snapshots.js local-plan.json
```

계획 입력 예시(새 실제 파일을 생성하지 않은 사용법 예시):

```json
{"patchId":"ow-2026-11-03","regions":["asia","americas","europe"],"attempts":[],"extraRequested":false}
```

향후 수동 수집 승인 후에만 collect-adaptive-snapshots 명령에 --apply를 추가한다. 이번 작업에서는 실행하지 않았다. dry-run만 가상 기준 시각 now를 받을 수 있다. 카탈로그의 실제 적용 시각과 통계 집계창 검토는 여전히 필요하다. 자동 패치 감지/스케줄/자동 커밋은 없다.

## 저장 구조와 중복 방지

동일 시점의 **지역별 한 grouped v2 JSON**, 3개 지역이면 최대 3개 파일이다. 원본 divisions는 all/bronze/silver/gold/platinum/emerald/diamond/master/grandmaster. derived는 bronze_plus부터 master_plus까지 7개다. all은 bronze_plus와 다르다.

derived에는 members, calculationVersion, batchId, region, cohort, inputFingerprint, provenance, qualitySummary, records/dataQuality가 있다. 원본 참조는 동일 파일 divisions와 members 및 원본 fingerprint로 식별한다. 같은 지역·플랫폼·모드·전장·배치와 최대 5분 관측 차이, 일치하는 패치/집계창을 검증한다. 이전 v2의 derived가 없으면 완전한 원본으로만 재계산하며 불일치하는 저장 파생값은 거부한다. 표본 가중 평균이 아닌 HOW 등급 균등 평균이다. null/검토 중 수치로 평균을 채우지 않는다.

persistDivisionBatch는 같은 batchId 또는 동일 조건의 동일 원본 값·품질·패치 검증 근거·집계창을 가진 배치를 중복으로 거부한다. Age가 초기화돼도 동일 수치를 신규 변화처럼 중복 보관하지 않는 보수적 정책이다. 실제 경기 집합이 동일함을 증명한 것은 아니며, 값이 완전히 같은 목표 시점은 파일이 추가되지 않을 수 있다. API cache Age는 원본 경기 집계 시각이 아니다. 파일은 wx 신규 생성, 인덱스는 pending 후 rename하며 기존 기록을 보존한다. 인덱스와 데이터 파일을 완전한 다중 파일 트랜잭션으로 보장하는 것은 아니므로 프로세스 강제 종료 후 orphan/lock 점검이 필요하다.

## 그래프·HOT

명칭을 ‘승률/픽률/밴률 · 패치·관측 이력’으로 수정했다. 저장된 모든 실제 관측을 시각순으로 표시하며 D+1/D+3/D+7을 한 대표점으로 축약하지 않는다. 검증된 패치의 첫 D+1 이후 대표점은 기존 강조 표시를 유지한다. 미확인 패치는 일반 관측이며 확정 귀속하지 않는다. 현재 브라우저 조회는 stored:false이고 자동 저장되지 않는다. 저장된 두 점이 있어야 storedChange를 계산하며 원본 집계창 비교 가능 여부를 별도 기록한다. 한 점/현재 값만 있으면 이력 부족을 안내한다. 다른 집계창 비교선은 점선이며 중간 날짜를 생성하지 않는다. 기간 선택 버튼은 추가하지 않았다.

HOT은 동일 조건의 실제 이전 관측 **1~7일**만 허용하도록 변경했다. 기존 structured provenance와 계산 버전을 사용하므로 화면 출처 문구 차이로 차단하지 않는다. 16개 등급 경로는 기존 구현을 재사용한다. 확인된 패치 경계/다른 집계창은 차단하고 미확인 일반 관측 비교는 경고를 유지한다. 통계 유의성 또는 패치 인과효과를 주장하지 않는다.

## 보존

최근 14일 상세 관측, v1, 패치 미확인/검토 대기, 패치 직전 마지막 검증 관측, D+1/D+3/D+7/D+14 및 명시적 milestone은 보호한다. 오래된 상세 기록은 정리 후보일 뿐이며 기존 dry-run 기능만 사용한다. 계획 milestone 보호와 확정 패치 귀속은 다른 개념이다. 실제 삭제는 수행하지 않았다. Git 이력에 이미 들어간 파일 크기는 작업 트리 정리만으로 줄어들지 않는다.

## 검증과 운영 준비

fixture는 실데이터 평가용이 아닌 동작 검증용이다. 3지역×9원본/7파생, 세 지표/실제 0, 결측·검토 품질, 중복·캐시·시점 예산, 잘못된 패치 귀속 방지, 그래프·HOT 경계, 보존 dry-run을 검사한다. 기존 통합 테스트는 16등급의 서비스/DOM 연결 및 원본 v1 SHA256 보존을 검사한다.

실제 브라우저 시각 검증은 수행하지 않았다. jsdom DOM 회귀와 빌드/Pages 경로 검증이며 모바일 픽셀 레이아웃 검증과는 다르다. 운영 활성화 전 적용 시각/집계창 증거, 영속 실행 원장, 변경 경보 기준, 부분 실패 복구·잠금 복구, 실제 소량 수동 수집 승인이 필요하다. 코드 구현과 실제 데이터 확보·배포는 구분해야 한다.

이번 변경 파일: 신규 adaptiveSnapshotModel.js, scripts/lib/adaptiveBatch.js, scripts/plan-adaptive-snapshots.js, scripts/collect-adaptive-snapshots.js, tests/adaptiveSnapshots.test.js 및 이 문서. 기존 batchPersistence.js, insights.js, patchHistoryModel.js, snapshotArchiveModel.js, snapshotRetentionModel.js, pickHistoryView.js와 관련 회귀 테스트(meta/metricHistory/mobileInsights/patchHistory/pickHistory/snapshot)를 보완했다. 이 목록 외의 git status 변경은 작업 시작 전부터 존재한 사용자 변경이다.

검증: npm.cmd test, npm.cmd run build, npm.cmd run verify:pages, git diff --check와 git status를 실행했다. Pages base=/HOW/의 로컬 자산 6개 경로가 통과했다. diff 검사에서는 기존 파일의 LF/CRLF 경고만 있었으며 공백 오류는 없었다. 기존 v1 SHA256 보존 검증도 통과했다.
