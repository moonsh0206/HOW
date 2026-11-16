# 그래프 스냅샷 자동화 구현·검증 보고

검증일: 2026-11-16 KST. **로컬 구현만 완료 / 운영 미활성화**. Commit, Push, Actions 활성화, 원격 브랜치 생성, 실제 배포를 수행하지 않았다. 기존 작업의 미커밋 변경을 유지했다.

## 1. 발견한 결함과 실제 운영 상태

| 항목 | 진단 / 결과 | 상태 |
|---|---|---|
| 기존 `patch-snapshots.yml`, `daily-snapshots.yml` | 수동 실행 및 30일 Artifact 보관. 영구 저장·Pages 자동 게시 경로가 아님 | 실제 결함 |
| `patchCollectionModel.collectionDecision` | 첫 대표 관측 이후 `representative-already-preserved`로 중단. D+3 등 반복 관측에 재사용할 수 없음 | 원인 확인 |
| 기존 반복 수집기 | 패치 적용 시각 미확인 시 모든 수집을 차단. 현재 카탈로그의 `effectiveAt`은 모두 null | 실제 결함 |
| 값 기준 중복 판단 | 다른 실제 수집 시각인데 값이 같아도 중복으로 제외할 수 있었음 | 수정 완료 |
| 실행 실패 기록 | 초기 영웅 목록 실패·부분 실패의 재시도 예산이 실행 간 유실될 수 있었음 | 수정 완료 |
| 그래프 파일의 순위 필드 | 새 그래프 묶음에서 `rankRoster`, `rankPolicyId` 제거. 기존 파일은 그대로 유지 | 분리 완료 |
| 브라우저 캐시 | 그래프 재진입·재시도도 10분 manifest 캐시를 재사용할 수 있었음 | 수정 완료 |
| 현재 공개 JSON | 인덱스 HTTP 200, 29항목, 원본 5파일 모두 로컬과 바이트 일치. 최신 관측은 11월 6일 | 정상 작동 |
| 별도 영구 보존 브랜치 | 공개 GitHub 조회에서 `how-graph-archive` HTTP 404 | 운영 미활성화 |

기존 단일 대표 관측 수집기의 의미는 유지했다. 반복 수집은 기존 adaptive 정책·division batch·snapshot 스키마를 재사용한다. 현재 patch proof 파일이 비어 있으므로 11월 16일 수집 결과를 특정 패치의 효과로 판정하지 않았다.

공개 상태 근거: [public-audit.json](qa/graph-automation/public-audit.json). 비공개 Repository Variables 및 권한 설정은 확인하지 못했으며 설정 완료로 간주하지 않는다.

## 2. 구현한 일정

- Actions가 매시 17분(UTC, KST에서도 매시 17분)에 정책만 확인한다. GitHub 예약 실행은 지연될 수 있으므로 정확한 시각을 보장하지 않는다.
- 검토된 패치의 정확한 `effectiveAt`이 있으면 경과시간 기준 D+1, D+3, D+7, D+14, 이후 D+21, D+28… 주간 간격으로 수집한다.
- 늦게 실행되면 현재 해당하는 최신 구간만 수집한다. 예: D+8 실행은 D+7 예정 구간의 **실제 D+8 수집 시각**으로 저장하며 D+1/3을 소급 생성하지 않는다.
- 해당 지역·패치·예정 구간의 완전한 수집이 이미 있으면 다시 요청하지 않는다. 성공 관측 사이 최소 24시간을 적용한다.
- 패치가 지정되지 않았거나 시각이 검증되지 않으면 **일반 관측 최초 1회 → 최근 완전한 관측 후 7일** 정책을 적용한다. `targetPatch:null`, 원본 `patch:null`, `patchVerification.status:unverified`, 집계창 미확인 상태를 보존한다.
- 같은 값도 다른 실제 관측 시각이면 유효한 수평 관측점으로 보존한다. 동일 관측만 중복 제외한다.
- 지역별 rolling 24시간 최대 2회 시도. 429/503 등의 `Retry-After`도 시도 원장에 저장해 재실행 시 적용한다. 시간 초과·영웅 목록 실패도 시도 예산을 소비한다.

일정용 `observationPlan.targetPatch`는 수집 계획의 대상이며, 통계에 패치 귀속을 입증하는 `patch` 필드와 다르다. 일정 도달만으로 패치 검증 상태를 올리지 않는다. 향후 새 패치의 정확한 적용 시각·집계창 증거 등록은 사람이 검토해야 하며 자동 추정하지 않는다.

## 3. 필터 범위와 API 예산

PC / 경쟁전 / 전장 all만 저장한다. 지역은 Asia, Europe, Americas. 원본 등급은 all, bronze, silver, gold, platinum, emerald, diamond, master, grandmaster의 9개다. 그래프가 지원하는 합성 등급 7종은 원본을 기존 로직으로 복원하며 추가 API 호출·중복 저장을 하지 않는다. 전장별 이력과 빠른 대전은 수집 범위에 포함하지 않는다.

| 상황 | 통계 요청 | 영웅 목록 요청 | 합계 |
|---|---:|---:|---:|
| 수집할 관측 없는 시간별 점검 | 0 | 0 | 0 |
| 전체 3지역 정상 수집 1회 | 27 | 1 | 28 |
| 일반 관측 주간 정상 운영 | 27/주 | 1/주 | 28/주 |
| 알려진 패치 첫 주 D+1/3/7 | 81 | 3 | 84 |
| 3지역 모두 실패 후 1회 재시도하는 rolling 24h 최대 | 54 | 2 | 56 |
| 이번 실제 운영 리허설(Asia만) | 9 | 1 | 10 |

요청은 지역·등급 순차 실행이다. 공급자가 안내한 긴 대기시간은 24시간 예산보다 우선한다. 네트워크 실패나 roster 검증 실패 시 실제 요청 수는 표의 최대보다 적다. 별도 map/영웅별 요청은 만들지 않는다.

## 4. 영구 저장 구조와 복구

메인 브랜치에 자동 커밋하는 방법은 애플리케이션 변경·일반 배포와 충돌하기 쉽다. 유료 외부 저장소는 추가하지 않았다. **동일 저장소의 전용 `how-graph-archive` 브랜치**를 선택했다.

브랜치 루트는 `index.json`, 실제 시각 이름의 불변 JSON 파일들, `attempts.json`이다. 앱 체크아웃의 `public/data/snapshots/`와 원격 기록을 검증 후 합집합으로 복원한다. 기존 동일 파일명·메타데이터 충돌은 중단한다. 인덱스 누락·파일 누락·미등재 JSON도 중단한다. 원본은 `wx`로 새 파일만 생성하고 인덱스는 임시 파일을 통한 교체를 사용한다. 실패 롤백은 이번 실행이 생성한 파일에만 적용된다.

한 지역의 원본 9개 등급이 모두 성공했을 때만 저장한다. 일부 지역만 성공하면 성공 지역만 보존하고 불완전 지역은 공개하지 않는다. API 결측값은 null/품질 상태로 남으며 0으로 만들지 않는다. 영웅 수가 curated roster와 달라지면 원본 통계 수집 전에 중단하고 새/누락 영웅 검토를 요구한다. 과거 54명 파일은 그대로 남는다.

Git Data API로 새 blob만 업로드하고 기존 Git tree를 재사용한다. 브랜치 ref 갱신은 `force:false`이며 동시 갱신은 거절한다. 완전한 새 관측과 실패 시도 원장을 **테스트·Pages 배포 전에 영구 저장**하므로 이후 게시 실패로 원본이 사라지지 않는다. 재실행은 보존 브랜치에서 복원한다. 같은 시도의 추가 Retry-After 메타데이터는 원장에서 합쳐 중복 계산하지 않는다.

현재 새 지역 묶음 약 37.7KB. 주간 3지역 156파일/년이면 원본 약 5.9MB/년, 인덱스 증가 약 1.0MB/년을 예상한다. 패치 관측 추가와 영웅 수 증가에 비례해 늘며 Git 이력·압축·시도 원장·Pages artifact 용량은 별도다. 자동 삭제/14일 정리 작업은 연결하지 않았다. Artifact는 진단용 7일이며 원본 보존 수단이 아니다. GitHub Actions/Pages 기존 사용량 한도는 적용되며 외부 유료 서비스는 없다.

복구: 브랜치의 마지막 정상 커밋 SHA를 확보하고 파일·인덱스를 별도 복사해 검증한 뒤 복원/게시한다. 자동으로 과거 ref를 force-reset하지 않는다. 손상된 이력은 덮어쓰지 말고 정상 커밋으로 복구하는 변경을 검토한다. 브랜치 삭제 방지 규칙과 별도 `git clone` 백업을 권장한다.

## 5. Pages 게시와 데이터 보호

새 워크플로 및 일반 Pages·일일 순위·공식 패치 게시가 모두 `concurrency.group: pages`, `cancel-in-progress:false`를 공유한다. 저장 브랜치를 복원한 뒤 기존 Vite build → Pages 검증 → upload-pages-artifact → deploy-pages 경로를 사용한다. 독립된 저장 브랜치를 Pages 소스로 지정하지 않는다. 순위 게시본도 기존 복원 기능으로 유지한다.

배포 전 앱 main SHA를 재확인한다. 공급자 수집 실패는 영구 저장 단계만 마친 뒤 워크플로 실패로 처리하고 게시를 막는다. 인덱스·파일 및 다른 정적 자산 검증 실패도 게시를 막는다. Pages API 자체가 실패하면 기존 게시본을 수동 삭제하지 않는다. 다음 실행은 보존본과 공개본 차이를 확인해 API 재수집 없이 게시를 다시 시도할 수 있다.

게시 후 공개 HTTPS의 인덱스와 모든 원본 파일을 빌드 결과와 비교한다. 일시적인 CDN 지연은 최대 12회, 5초 간격으로 재확인한다. 이미 같은 공개본이면 무변경 게시를 생략한다. 검증된 이전 파일뿐 아니라 새 파일도 함께 검사한다.

브라우저는 그래프 진입/필터 변경/이력 재시도 때 manifest를 새로 확인하고 HTTP `cache:no-cache`를 사용한다. 불변 원본 파일의 메모리 캐시는 유지한다. 지표 버튼 전환은 같은 이력을 재사용한다. HOT 기준·동일 조건·1~7일·품질/집계창 검증은 변경하지 않았고 별도 HOT 통계 복제본을 만들지 않았다. 주간 관측만으로 항상 HOT 후보가 생기지는 않으며 7일을 조금 넘은 이전 관측도 기존 정책대로 제외한다.

## 6. 검증 결과와 한계

| 검증 | 결과 | 구분 |
|---|---|---|
| 실제 OverFast 수집 → 저장 → 다음 읽기 → 프로덕션 빌드 → 로컬 HTTP → 서비스/그래프 | Asia 54명 × 9등급 정상, 합성 diamond_plus 원본 3개 복원, Ana 3지표 값 일치 | 정상 작동, 실제 데이터 |
| 과거 자료 보존 | 기존 5파일 바이트 일치, 소스 index 불변, ranks 파일 변경 없음 | 정상 작동 |
| 공개 사이트 기존 자료 | HTTP 200, 5파일 및 29항목 일치 | 정상 작동, 읽기 전용 |
| 최초/마일스톤/주간/중복/누락 구간 | 실제 관측 시각 유지, 소급 생성 없음 | 자동 Fixture 테스트 통과 |
| 429/503/timeout, Retry-After, roster 변경, 부분 지역 실패 | 시도 원장 복원, 완전 지역만 보존, 복구 재시도 | 자동 Fixture 테스트 통과 |
| 인덱스·파일 불일치/기존 파일 충돌 | fail closed, 기존 바이트 보존 | 자동 Fixture 테스트 통과 |
| Git 저장·다음 실행 복원·ref 실패 | Git API 대역에서 검증; 실패 ref는 이전 커밋 유지 | 로컬 시뮬레이션 통과 |
| Pages 실패/재시도/CDN stale | 워크플로 게시 전 실패 차단, 공개 검증 재시도·일치/누락 검증 | 로컬 테스트 통과, 실제 실패 주입 안 함 |
| 동시 게시 | 4개 게시 워크플로 같은 잠금·복원 경로 검증 | YAML/자동 테스트, 실제 병렬 Actions 실행 안 함 |
| PC 1440 / 모바일 390·320 × 한국어·영어 | 6환경, 3지표, 새 점 추가, 원본/합성 등급·지역 격리·부족 안내·캐시 새로고침·가로 넘침 없음 | 실제 이력 JSON + 현재 API 캡처 Fixture |
| 종합 브라우저 회귀 | 320/375/390/430/1440 5환경: 언어·탭·전적·즐겨찾기·뒤로 가기 등 | 캡처 Fixture, 5/5 통과 |
| 전체 Node 회귀 | 299/299 통과, 실패/스킵 0. HOT·Meta Score·일일 순위 포함 | 정상 작동 |
| 프로덕션 빌드 / Pages 검사 | 빌드 성공, 다국어 440진입점, 정적 자산 15개 검증 | 정상 작동 |
| 실제 원격 Git write·Pages 신규 게시·Actions 예약 실행 | 승인 범위 밖이므로 실행하지 않음 | 운영 미활성화 / 추가 검증 필요 |

실제 수집은 2026-11-16 15:20 KST. 기본 Asia diamond_plus의 저장 관측은 11월 6일과 새 11월 16일 2점이다. Asia diamond 원본은 11월 4일·6일·16일 3점, Europe은 11월 6일 기존 1점만 표시하여 새 Asia 관측이 섞이지 않았다. 중간 날짜를 생성하지 않았다. 두 실제 날짜 간격은 10일이므로 이 자료 쌍으로 HOT 후보를 계산하지 않는다.

증거: [실제 수집](qa/graph-automation/live.json), [6환경 그래프 검증](qa/graph-automation/browser.json), [5환경 회귀](qa/graph-automation/regression/browser-results.json), [PC 화면](qa/graph-automation/1440-ko.png), [모바일 화면](qa/graph-automation/390-en.png). 새 실제 원본은 OS 임시 디렉터리에만 두었고 운영 `public/data/snapshots`에는 추가하지 않았다. 임시 경로는 live.json에 기록되어 있으며 영구 보관본으로 간주하지 않는다.

재현 명령:

```text
npm.cmd test
npm.cmd run build
npm.cmd run verify:pages
node scripts/test-graph-publication-live.js --run
node scripts/qa-graph-automation.cjs
node scripts/qa-meta-emblems-regression.cjs docs/qa/graph-automation/regression
```

live 명령은 실제 외부 API 10회를 사용하며 임시 파일/빌드만 생성한다. browser 명령은 그 임시 빌드가 남아 있어야 한다. 테스트용 Fixture 날짜는 운영 과거 기록을 생성한 것이 아니다.

## 7. 변경 파일

- `src/models/adaptiveSnapshotModel.js`: 일반 최초/주간 관측 fallback, 영속 Retry-After.
- `src/models/patchCollectionModel.js`: 일정 표시를 D+14·주간까지 확장, 기존 단일 대표 수집 의미 유지.
- `scripts/lib/divisionBatch.js`, `scripts/lib/adaptiveBatch.js`, `scripts/lib/batchPersistence.js`: 그래프/순위 분리, 오류 메타데이터, 실제 시각 기반 중복 판정.
- `scripts/lib/graphCollection.js`, `scripts/collect-adaptive-snapshots.js`: 기존 collector를 재사용한 실행 조합, roster 검증, 사전 시도 원장, 완전 지역만 append, 원본을 로그에 출력하지 않는 진단.
- `scripts/lib/graphArchive.js`, `scripts/graph-archive.js`: 영구 브랜치 읽기/합집합/증분 저장/공개 검증/무변경 생략.
- `.github/workflows/graph-snapshots.yml`, `pages.yml`, `daily-ranks.yml`, `official-patch-notes.yml`: 단일 Pages 게시 방식 및 기록 복원.
- `src/services/snapshotService.js`, `src/controllers/routingController.js`: 새 그래프 manifest 조회. `statisticsService.js`: 기존 실패의 retryAt을 collector에 전달.
- `tests/graphCollection.test.js`, `tests/graphArchive.test.js`, `tests/adaptiveSnapshots.test.js`, `tests/patchCollection.test.js`: 수집/보존/게시/일정 테스트.
- `scripts/test-graph-publication-live.js`, `scripts/qa-graph-automation.cjs`, 본 보고서·증거: 운영 리허설.

기존 통계 JSON·인덱스·patchCatalog·patchObservationProofs·순위 저장 파일은 수정하지 않았다. Meta Score 및 순위 비교 공식은 변경하지 않았다. HOT 운영 기준도 유지했다.

## 8. 승인 후 운영 활성화 순서

1. 본 변경을 검토·승인한 뒤 main에 Commit/Push한다. 미커밋 상태의 이전 작업도 있으므로 변경 범위를 함께 확인한다. 초기에는 `HOW_GRAPH_ARCHIVE_ENABLED`를 설정하지 않거나 `false`로 유지한다.
2. GitHub Repository Settings → Pages → Source를 **GitHub Actions**로 확인한다. Actions 실행 허용과 `github-pages` 환경 배포 규칙이 main 실행을 허용하는지 확인한다. 환경 승인 규칙이 있으면 첫 게시에도 해당 승인이 필요하다.
3. Repository Variables에 `HOW_GRAPH_PUBLIC_URL=https://moonsh0206.github.io/HOW/data/snapshots/`를 설정한다. HTTPS·끝 `/` 필수. 현재 도메인이 다르면 실제 공개 디렉터리를 사용한다.
4. `HOW_GRAPH_PATCH_ID`는 처음에는 비워 일반 주간 관측을 사용한다. 검증된 정확한 적용 시각을 카탈로그에 등록한 뒤에만 해당 ID를 지정해 마일스톤 일정을 사용한다. 현재 `ow-2026-11-03`을 지정해도 시각 미확인이므로 일반 관측이다.
5. 자동 job의 `contents:write`, `pages:write`, `id-token:write`가 조직/저장소 정책에서 허용되는지 확인한다. 자동 write 대상은 전용 데이터 브랜치다. 새 PAT/외부 저장 서비스는 필요 없다. 브랜치 규칙은 기록 삭제를 방지하면서 해당 workflow의 append를 허용해야 한다.
6. `HOW_GRAPH_ARCHIVE_ENABLED=true` 설정 후 **즉시** `Preserve and publish graph observations` 워크플로를 main에서 수동 실행, 첫 회만 `bootstrap=true`로 지정한다. 브랜치가 없는 동안 일반/순위/공식 패치 게시가 실행되면 안전하게 실패할 수 있으므로 이 초기화를 먼저 완료한다. 시간별 예약 실행도 첫 초기화 전에는 fail closed다.
7. 첫 실행에서 원본 5파일 보존, 새 3지역 완전 묶음, attempts/index, 데이터 브랜치 커밋, Pages 및 공개 검증 성공을 확인한다. 이후에는 bootstrap을 false로 두며 예약 실행에 맡긴다.
8. 기존 `HOW_RANKS_ENABLED`, `HOW_RANKS_URL` 설정은 유지한다. 활성 순위 데이터가 있다면 URL이 실제 공개 `data/ranks/current.json`을 가리키는지 확인한다. 그래프 활성화가 순위를 자동 활성화하지 않는다.
9. 일반 Pages 배포와 일일 순위/공식 패치 게시 후에도 최신 스냅샷·일일 순위·HOT 재사용 기록·특전 통계·공식 패치 JSON이 함께 남는지 첫 운영에서 확인한다. 기존 수동 스냅샷 워크플로는 진단용이며 영구 보존 운영 경로로 사용하지 않는다.

## 9. 최초 운영 수집 체크

- 3지역 각각 9개 원본 등급, 현재 검토된 roster 54명, 누락값의 품질 상태, 정확한 실제 시각/필터/출처 확인.
- 다음 실행이 원격 branch에서 이전 원본과 시도 원장을 복원하고 새 통계 요청 없이 중복 실행을 생략하는지 확인.
- 데이터 브랜치에 원본이 남고 Pages가 같은 인덱스/파일을 반환하는지 확인. Artifact 성공만으로 완료 처리하지 않는다.
- 새로고침뿐 아니라 기존 브라우저의 영웅 재진입/필터 전환에서도 최신 점이 보이는지 확인. KO/EN·모바일 3지표와 불충분한 이력 안내 확인.
- 패치 미확인 표기를 유지하고 관측 사이의 미수집 날짜를 실제 점으로 표시하지 않는지 확인.
- 실패 발생 시 `.artifacts/graph-collection.json`과 Actions 로그를 점검하고, 실패 지역만 다시 수집하는지 확인. 테스트를 위해 운영 스냅샷/공개본을 삭제하거나 값을 변조하지 않는다.
