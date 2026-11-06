# 전체 등급 보관·HOT·상세 시계열 통합

작업일: 2026-11-05 (한국 시간). 실제 로컬 구현을 기준으로 수정했다. 실제 API 수집·공개 스냅샷 저장·Commit·Push·PR·배포·예약 자동화·기존 기록 삭제는 수행하지 않았다. 테스트의 수치는 별도 fixture/Mock에서만 사용했다.

## 기존 구조와 문제

프로젝트는 Vite/ES Modules와 기존 Model·View·Controller·Service·Domain 구조를 유지한다. 관련 경로는 다음과 같다.

```text
scripts/collect-division-batch.js → scripts/lib/divisionBatch.js
                                     ↓
                       snapshotV2Model / compositeStatisticsModel
                                     ↓
                         grouped JSON v2 + index

statisticsService → 현재 원본/파생 통계 → heroModel → 메인·상세
snapshotService → 같은 코호트의 원본/파생 이력
                 ├─ HOT: insights.js → insightView.js
                 └─ 상세: routingController → 시계열 Model → 그래프 View
```

기존에는 현재 파생 통계의 source가 `OverFast API · HOW 등급 균등 평균`이어서 HOT의 정확한 문자열 비교에서 거부됐다. 과거 합성은 검증된 패치만 허용했으므로, 같은 배치에 필요한 모든 등급이 있어도 패치 미확인 자료는 사라졌다. v2는 원본만 저장했고, 일부 지표가 누락되면 합성 영웅의 모든 지표를 숨겼다. 필터는 화면 이동에는 유지됐지만 새로고침에는 보존되지 않았다.

## 9개 원본과 7개 파생 영역

기본값은 **PC / 아시아 / 경쟁전 / diamond_plus / 전체 전장**이다. 16개 선택지는 그대로다.

- 원본 9개: all, bronze, silver, gold, platinum, emerald, diamond, master, grandmaster.
- 파생 7개: bronze_plus, silver_plus, gold_plus, platinum_plus, emerald_plus, diamond_plus, master_plus.

all은 별도 API 응답이다. bronze_plus에 all을 넣지 않으며, 그랜드마스터·챔피언은 grandmaster 한 번만 포함한다. 개별 등급을 합성 함수에 잘못 전달하면 거부한다.

v2는 지역·UTC 관측일별 한 파일을 기본 단위로 사용한다.

```text
schemaVersion: 2
source / platform / gamemode / region / map
observationDate / batchId / derivationVersion
heroes: [원본 영웅 키 ...]
fields: [winRate, pickRate, banRate]
collection:
  status: complete | partial | failed
  succeeded / expected / failedDivisions
divisions:
  [개별 등급]:
    status: ok | error | uncollected
    collectedAt 또는 attemptedAt
    requestUrl / cacheAgeSeconds / browserCached
    patch / patchVerification / statisticsWindow
    records: [[승률, 픽률, 밴률], ...] 또는 null
    dataQuality / qualitySummary / error
derived:
  [누적 구간]:
    calculationVersion / members / batchId / region / observationDate
    cohort / inputFingerprint / status
    collectedAt / observationStart
    patch / patchVerification / statisticsWindow / provenance
    records / dataQuality / qualitySummary
```

원본과 파생값은 같은 파일의 다른 영역에 저장한다. 파생 파일 7개를 추가로 만들지 않는다. index에는 기존처럼 원본 등급별 위치를 등록하며, 9개 항목이 같은 grouped 파일을 가리킨다. 파일별 pending/cache를 공유해 반복 다운로드하지 않는다.

수집 실패 등급은 0 배열로 채우지 않고 error와 실패 원인을 남긴다. collection이 partial이면 성공 로그도 partial로 출력한다. 전체 실패 시 기존 데이터를 보존하고 오류로 종료한다. 숫자 정밀도는 저장 단계에서 반올림하지 않는다. null·실제 0·검토 중 상태를 데이터 품질 메타데이터로 구분한다. 명시적인 원본 확인으로 실제 0 또는 -1이 판명된 품질 정보도 값과 모순되지 않을 때 복원할 수 있다.

파생 지표는 각 필드마다 모든 구성 등급이 유효할 때만 동일 비중으로 평균한다. 예를 들어 마스터 픽률만 미제공이면 다이아몬드 이상의 픽률은 null이지만, 구성 승률·밴률이 완전하면 두 지표는 표시한다. 누락 등급을 빼고 분모를 줄이지 않는다. 필수 세 지표가 완전하지 않거나 검토 중이면 Meta Score와 티어는 미분류다. 가중치와 S 자격 조건은 수정하지 않았다.

파생 버전은 `how-equal-rank-v2`다. 읽을 때 원본을 재계산한 결과와 저장된 derived 영역 전체를 비교한다. 원본 변경, 파생값 변경, 계산 버전 불일치를 검출한다. fingerprint는 변경 탐지 보조값이며 보안 서명은 아니다. 실제 검증은 파생 결과 전체 재계산으로 수행한다. 원본 자체의 외부 진실성까지 증명하는 기능은 아니다.

derived가 없는 이전 v2도 원본과 배치 정보가 완전하면 읽을 때 재계산한다. 배치 ID가 없는 자료는 임의로 같은 배치라고 가정하지 않는다. 계산 버전이 지원되지 않으면 잘못 결합하지 않는다. 기존 v1은 원본 경로로 계속 읽는다.

## HOT 지원과 출처 검증

출처 표시 문자열과 계산 가능한 provenance를 분리했다. provenance에는 provider, original/derived 종류, 완전한 코호트 키를 두며 파생에는 계산 버전과 정렬된 구성 등급을 추가한다. 표시 문자열이 달라도 같은 정책의 파생 통계끼리 비교할 수 있다. v1 호환은 개별 등급·정확한 기존 출처 문자열에만 제한적으로 허용한다. 누적 구간에서 출처 문자열만으로 검증을 우회할 수 없다.

9개 원본과 7개 누적 구간 모두 HOT 비교 경로를 지원한다. 기존 선정식은 유지한다.

- 픽률 증가 최소 1%p, 승률 유지 또는 상승, 현재 픽률 최소 1%.
- 원본/파생 종류, 지역·플랫폼·모드·전장·등급 및 파생 버전이 같아야 한다.
- 과거와 현재의 필수 승률·픽률은 유효 범위이며 검토 중이 아니어야 한다. 밴률은 HOT 선정식에 사용하지 않는다.
- 비교 간격은 1시간 이상·7일 이내다. 1시간 하한은 제공처의 1시간 캐시를 감안해 동일 캐시를 짧게 반복 조회한 것을 추세로 오인하지 않도록 유지한다. 7일 상한은 오래된 관측을 현재 HOT처럼 제시하지 않기 위한 기존 운영 경계이며 통계적 유의성을 뜻하지 않는다.
- 서로 다른 검증 패치, 검증/미확인 집계창 혼합, 서로 다른 집계창 또는 패치 변경 단서는 비교를 보류한다.
- 양쪽 모두 패치 미확인이면 일반 관측 비교로 허용한다. 카드에 **집계창 미확인 · 관측 비교**를 표시하고, 패치 효과를 뜻하지 않는다는 설명을 상세에 둔다.

자료 부족은 ‘해당 등급의 이전 관측 데이터 부족’으로 표시한다. 후보가 없으면 빈 상태를 유지한다. 원본과 파생을 섞거나 임의의 HOT 영웅을 채우지 않는다.

## 합성 이력과 상세 페이지

합성 이력에는 필요한 구성 등급이 모두 있어야 한다. 동일 batchId, 지역·플랫폼·모드·전장, 계산 정책, 집계창을 검사하고 전체 관측 시각 차이는 기본 5분 이내로 제한한다. 같은 날짜라는 이유만으로 서로 다른 배치를 합치지 않는다. 같은 배치가 UTC 자정을 통과할 수는 있으나 실제 시각 차이와 명시된 배치 관측일은 일관돼야 한다.

패치 미확인 배치는 일반 관측값으로 반환하며 patch는 null, 검증 상태는 unverified로 유지한다. 확인된 패치의 대표 관측은 기존 엄격한 검증 정책을 그대로 사용한다. 서로 다른 날짜의 실제 두 배치가 있으면 두 관측점으로 표시하며, 동일 값이어도 서로 다른 실제 시각은 보존한다. 없는 날짜나 중간 값을 만들지 않는다.

상세의 기존 2열·카운터·시너지·패시브·특전·즐겨찾기·전장 기능은 유지했다. 현재 통계와 과거 이력은 같은 공유 필터를 사용한다. 지표 전환은 이미 읽은 기록을 재사용한다. 영웅·등급·지역 변경 및 API 오류 시 이전 조건의 현재값이 남지 않는지 통합 테스트했다. 현재 브라우저 조회와 저장 이력의 기존 표시 구분도 유지한다.

필터는 sessionStorage에 검증 후 저장해 같은 탭의 새로고침에도 유지한다. 목록 복귀·다른 영웅 이동에는 기존 공유 Model을 사용한다. 저장소가 막혔거나 필터가 잘못됐으면 안전하게 diamond_plus 기본값을 사용한다. 검색어나 즐겨찾기 저장 방식을 바꾸지 않았다.

## 보존·복구 및 실제 데이터 상태

현재 공개 폴더에는 기존 v1 두 개만 있다.

| 파일 | 조건 | 영웅 수 |
| --- | --- | ---: |
| 2026-11-02T05-36-24.500Z.json | PC / 아시아 / 경쟁전 / 전체 등급 / 전체 전장 | 54 |
| 2026-11-04T00-52-25.812Z.json | PC / 아시아 / 경쟁전 / 다이아몬드 / 전체 전장 | 54 |

파일 바이트의 SHA-256과 원래 index 항목을 확인했고 수정하지 않았다. 서로 다른 날짜·등급의 두 파일을 diamond_plus 이력으로 재분류하지 않는다. 기본 누적 구간의 실제 이전 배치가 아직 없어 공개 데이터만으로 HOT을 제공한다고 주장하지 않는다.

14일 rolling, v1 보호, 패치 직전/D+1/D+3/D+7 태그, 검토 대기 보호 정책을 유지했다. 파생은 원본과 같은 파일이므로 같은 생명주기를 따른다. 어느 원본 항목이라도 보호되면 해당 파일 전체를 보호한다. 패치 미확인 자료는 검토 완료 표시만으로 정리 대상으로 만들지 않도록 보강했다. 실제 dry-run은 **기존 2개 유지, 정리 후보 0개, 새 보존 태그 제안 0개**다. 미확인 상태가 장기간 지속되면 보관량도 계속 늘 수 있다.

부분 실패를 복구할 때는 `--retry-of`로 기존 부분 실패 파일을 지정한다. 동일 지역의 실패 파일인지 확인한 뒤 **9개 원본을 새 배치로 다시 조회**한다. 실패 등급 하나만 예전 8개 값에 붙여 새 배치인 것처럼 만들지 않는다. 원본 파일과 이전 index 항목을 보존한다. 복구도 명시적인 수동 실행만 가능하다.

저장 트랜잭션은 파일 소유권을 확보한 뒤에만 롤백 대상으로 등록한다. 파일명 충돌 또는 기존 pending 파일 때문에 실패해도 그 기존 파일을 삭제하지 않는다. fixture 임시 디렉터리에서 충돌·append·실패 롤백을 검사했다. 실제 공개 폴더에 새 JSON을 쓴 테스트는 없다.

## 검증 결과

`npm.cmd test`: **141/141 통과**. `npm.cmd run build`, `npm.cmd run verify:pages`, `git diff --check` 통과.

주요 검증은 다음과 같다.

- 3지역 × 9개 원본 조건, all과 bronze_plus 구별, 7개 파생 영역 및 부분 실패.
- 지표별 평균·누락·검토 0·확인된 실제 0의 품질 상태, 원본/파생 변조 검출.
- derived 없는 v2의 읽기 시 재계산과 기존 v1 보호.
- 16개 등급 전부 HOT 산출, 출처 문자열 독립성, 버전·조건·패치·시간 경계 차단, 후보 없음.
- 같은 배치의 미확인 패치 관측 두 날짜, 서로 다른 배치·시간·지역·누락 등급 제외.
- 상세 승률/픽률/밴률 2점 렌더링, 정확한 날짜·값, 지표 전환 시 추가 파일 요청 없음.
- 등급 변경·영웅 변경·목록 복귀·API 오류 시 상태, 공유 필터 한 개 유지.
- 모바일 미디어 쿼리 분기와 PC에서 같은 HOT 결과, 필터 저장/복원, 기존 기능 회귀.
- 임시 fixture 파일을 이용한 파일 충돌 시 원본 보존과 원자적 index 추가.

실제 브라우저 엔진의 시각·터치 검증은 미수행이다. DOM·미디어 쿼리 모의 분기 테스트이며 실제 390px 화면을 봤다고 주장하지 않는다. 27개 실 API 수집 성공 여부도 미검증이다. 기존 응답 fixture와 Mock만 사용했다.

## 수정 파일

- 수집/복구: `scripts/collect-division-batch.js`, `scripts/division-batch-options.js`, `scripts/lib/divisionBatch.js`, `scripts/lib/batchPersistence.js`.
- 데이터: `src/models/statisticsProvenance.js`, `compositeStatisticsModel.js`, `compositeHistoryModel.js`, `snapshotV2Model.js`, `snapshotModel.js`, `snapshotArchiveModel.js`.
- Service/Controller: `src/services/statisticsService.js`, `snapshotService.js`, `src/controllers/heroController.js`, `src/main.js`.
- 저장/화면: `src/storage/filterStorage.js`, `src/views/insightView.js`, `heroDetailView.js`, `src/styles/layout.css`.
- 테스트: 신규 `tests/groupedIntegration.test.js`, 기존 `compositeDivisions/statisticsQuality/meta/ranked/mainMapAndPatch` 테스트의 변경 정책·fixture 보강.
- 안내: 이 보고서, README.

운영 Meta Score 및 S 자격 모듈과 GitHub 워크플로는 수정하지 않았다. 기존 원본 계획서·프로토타입과 과거 보고서는 보존했다.

## 추후 수동 실행 제안 — 이번에는 미실행

```powershell
# 계획만 출력: API 요청과 쓰기 없음
node scripts/collect-division-batch.js --region asia

# 추후 별도로 승인된 시점에 수동 실행: 지역별 9요청, 합계 27요청
node scripts/collect-division-batch.js --region asia --apply
node scripts/collect-division-batch.js --region europe --apply
node scripts/collect-division-batch.js --region americas --apply

# 기존 부분 실패 배치를 새 배치로 복구할 때
node scripts/collect-division-batch.js --region asia --retry-of <기존부분실패파일명> --apply

# 읽기 전용 보관 계획
node scripts/snapshot-retention-dry-run.js
```

우선 아시아 한 배치를 수동 검증하고 다음 비교 시점의 완전한 배치를 확보하는 것이 필요하다. 첫 저장 배치와 1시간 이상 지난 현재 조회를 비교할 수도 있지만, 두 개 이상의 영구 관측점을 보려면 서로 다른 실제 배치가 추가로 필요하다. 다른 지역은 각 지역의 별도 원본이 필요하며 아시아 자료로 대체하지 않는다. 개별 전장 과거 기록이 없으면 전체 전장으로 대신 표시하지 않는다.

저장소 반영과 Pages 배포는 별도 승인 절차다. 현재 브라우저 조회가 저장소에 자동 기록되는 구조로 바꾸지 않았으며, 예약·자동 커밋·자동 Push를 활성화하지 않았다.
