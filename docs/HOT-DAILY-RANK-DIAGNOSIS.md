# HOT 및 일일 순위 미표시 진단 — 2026-11-16

로컬 수정·검증만 수행했다. Commit, Push, Pages 배포, Actions 실행·활성화 및 저장소 변수 변경은 하지 않았다. 기존 미커밋 경량 순위 구현을 보존하고 필요한 진단·관측 선택만 보완했다.

## 1. HOT 미표시의 실제 원인

11월 16일 11:58 KST 공개 사이트 및 실제 OverFast 응답으로 확인했다.

- 공개 `data/snapshots/index.json`은 200이며 관측 항목은 29개다. 전체 지역의 최신 관측은 11월 6일이다. 기본 UI 필터는 PC / 경쟁전 / 아시아 / 다이아몬드 이상 / 전체 전장이다.
- 아시아 diamond_plus의 이전 관측은 `2026-11-06T02:37:44.253Z`로 정상 복원됐다. diamond도 `2026-11-06T02:37:43.499Z`로 정상 복원됐다. 파일 조회 오류나 합성 계산 실패가 아니다.
- 두 필터 모두 현재 실제 관측과 약 10일 차이여서 1~7일 조건을 벗어난다. 따라서 현재는 **선정 조건 충족 영웅 0명이라는 판정 자체를 내릴 수 없는 상태**다. 다른 사용자 저장 필터를 직접 읽지는 않았지만, 공개 index 전체에도 7일 이내 관측이 없다.
- 원격 `daily-snapshots.yml`과 `patch-snapshots.yml`은 workflow_dispatch만 있고 예약 수집이 없다. 결과도 Actions artifact로 보관할 뿐 자동으로 Pages에 반영하지 않는다. 공식 패치 노트 예약 작업은 통계 관측 수집기가 아니다.
- 승률·픽률 차이는 현재 값 − 과거 값의 %p이며, +1.0%p 픽률 / +0.5%p 승률 / 현재 픽률 1% 이상 조건과 동시 상승·최대 3명 정책은 변경하지 않았다. `insights.js` 계산 수정이 필요한 오류는 발견하지 못했다.

별도로 재현한 코드 결함도 수정했다. 기존 서비스는 가장 최신 날짜 후보 하나만 반환하여 그 후보의 패치/정책이 호환되지 않으면 더 오래된 유효 관측을 검사하지 않았다. 합성 이전 관측의 범위를 관측 시각 대신 현재 시계 기준으로 잘라 캐시 관측의 정확한 7일 경계를 놓쳤다. 언어 전환 등 캐시 통계로 시작하는 컨트롤러는 HOT 이전 관측을 다시 조회하지 않았다. 이 세 경로는 회귀 테스트로 재현했으며, 현재 공개 사이트의 10일 공백과 구분한다.

## 2. 순위 변동 미표시의 실제 원인

| 확인 항목 | 확인 결과 |
|---|---|
| 최신 경량 기능 Push | 원격 main `763127111ef9ed9e6650a1f87fc14f4bd6e6f677`(11월 12일). 새 `.github/workflows/daily-ranks.yml` 조회 404. 로컬에는 untracked 상태로 존재 |
| 최신 Pages 배포 | 마지막 push Pages 실행은 11월 12일, 위 SHA로 success. 새 경량 JSON은 미게시 |
| 10시 순위 workflow 활성화 | 원격 workflow 디렉터리의 4개 파일에 daily-ranks.yml 없음 |
| 오늘 실제 순위 수집/게시 | 전체 39개 Actions 기록에서 새 순위 workflow 실행 없음. 오늘 실행 실패라고 추정하지 않음: 실행할 workflow 자체가 원격에 없음 |
| 공개 JSON | `https://moonsh0206.github.io/HOW/data/ranks/current.json` 일반 조회와 cache-busting 조회 모두 404 |
| HOW_RANKS_URL | 실제 저장소 변수는 현재 연결 도구로 조회 불가. 올바른 예정 주소는 위 HTTPS JSON 주소이며 현재는 404 |
| HOW_RANKS_ENABLED | 실제 값 조회 불가. Actions 변수이며 브라우저에 전달되는 VITE 환경 변수가 아님. workflow의 if 및 일반 게시의 복원 단계에서 사용 |
| 오늘/어제 동일 필터 순위 | 공개 경량 JSON 자체가 없어 확인 가능한 기준 없음. 로컬 bootstrap도 cohorts=[] |
| 화면 순서 불일치 | 새 경량 코드가 미배포라 현재 운영 미표시 원인으로 판정할 수 없음. 로컬에서는 의도적으로 불일치 시 숨김을 검증 |
| 캐시 | no-cache 및 쿼리 변경 후에도 404. 현재 장애는 오래된 성공 JSON을 읽어서 발생한 것이 아님 |

10시 경과나 실시간 순위 변화만으로 전일 기준을 만들 수 없다. 최초 정상 게시일에는 숨기고 실제 다음 연속 보고일에만 비교해야 한다. 기존 스냅샷 원본을 일일 순위 전일 데이터로 전용하지 않았다.

근거: [원격 main](https://github.com/moonsh0206/HOW/commit/763127111ef9ed9e6650a1f87fc14f4bd6e6f677), [마지막 push Pages 실행](https://github.com/moonsh0206/HOW/actions/runs/43153902412), [원격 workflow 목록](https://github.com/moonsh0206/HOW/tree/main/.github/workflows), [공개 스냅샷 index](https://moonsh0206.github.io/HOW/data/snapshots/index.json).

## 3. 수정 파일과 동작

이번 진단에서 수정한 파일:

- `src/services/snapshotService.js`: 기존 원본·합성 복원 로직을 재사용해 현재 관측 기준 1~7일 후보를 최신순으로 검사. `hotHeroes`의 기존 provenance·패치·집계 기간 검증을 통과하는 첫 관측 선택. 조회 실패와 무기록·기간 초과·호환 불가를 구분하고 탈락 사유·최근 시각·warnings를 반환. 그래프 getHistory API와 저장 파일은 유지.
- `src/controllers/heroController.js`: 실제 current를 HOT 후보 검증에 전달하고 캐시 시작에서도 이전 관측 조회. 순위 HTTP 오류를 상태로 보존. 통계 API 재수집 없이 경량 JSON을 5분마다 재확인하고 stop 시 타이머 정리.
- `src/views/insightView.js`, `src/i18n/ko.js`, `src/i18n/en.js`: PC·모바일 모두 구체적인 HOT 상태 및 최근 관측 시각 표시. 0명과 조회 실패를 별도로 안내.
- `src/models/rankArchiveModel.js`, `src/models/heroModel.js`, `src/views/heroView.js`: 기존 정확한 화면 순서 검증을 유지하며 역할/정렬/정책/기준일/기준 부재/화면 불일치 등 미표시 사유 제공. 로딩·오류·stale 통계에는 배지 숨김.
- `src/services/dailyRankService.js`: 기존 no-cache 요청 유지, HTTP 코드 포함, 메모리 캐시의 10시 보고일 전환 무효화.
- `tests/insightDiagnostics.test.js`, `tests/mobileInsights.test.js`: 재현·상태·캐시·캐시 시작 회귀 및 새 안내 문구 검증.
- `scripts/diagnose-how.js`, `scripts/qa-how-diagnostics.cjs`: 읽기 전용 운영 재진단과 실제 로컬 빌드의 Chrome UI 검증.

이전 작업에서 준비된 `daily-ranks.yml`, 수집·원자 저장·게시 확인 스크립트, 일반 Pages/공식 패치 게시의 기준 복원 연결은 그대로 로컬에 있다. 저장소 변수나 원격 파일은 수정하지 않았다. HOT 선정 알고리즘, Meta Score 정책, compositeHistoryModel, 스냅샷 index·원본·보존 정책은 수정하지 않았다.

개발자 도구에서 다음으로 원인을 확인할 수 있다.

```js
document.querySelector('#hot-content').dataset.hotStatus
document.querySelector('#hero-rows').dataset.rankStatus
document.querySelector('#hero-rows').dataset.rankError
```

대표 순위 상태: `role-all`, `sort-ineligible`, `archive-error`, `archive-empty`, `cohort-unavailable`, `reporting-day-mismatch`, `no-consecutive-baseline`, `policy-mismatch`, `roster-mismatch`, `incomplete-role-baseline`, `live-order-mismatch`, `ready`. 표시 동작을 바꾸기 위한 우회 스위치는 아니다.

## 4. 실제 데이터 확인 및 재현

```powershell
node scripts/diagnose-how.js --live
```

실제 OverFast 현재 값과 공개 스냅샷을 메모리에서 비교하고 GitHub 공개 실행 기록 및 Pages HTTP 상태를 조회한다. 결과는 `docs/qa/how-diagnostics/operating.json`에 날짜·조건·상태만 저장하며 새 원본 비율을 저장하지 않는다. 보호된 스냅샷 파일들의 실행 전후 SHA-256이 같음을 확인했다. 실제 현재 API는 stale=false, error 없음이었다. HOT 비교는 두 필터 모두 outside-window, 경량 JSON은 두 방식 모두 404다.

실제 운영의 연속 이틀 순위 및 신규 Pages 게시 성공은 검증할 수 없었다. 공개 데이터가 없고 원격 변경을 승인받지 않았기 때문이다. 기존 일일 실수집→로컬 HTTP 게시 리허설은 `node scripts/test-daily-ranks-live.js --run`으로 별도 실행 가능하며 동일 보고일을 가짜 둘째 날로 바꾸지 않는다.

## 5. 테스트 결과

- 전체 `npm.cmd test`: **284/284 통과**.
- 프로덕션 빌드 및 440개 KO/EN 정적 진입점 생성, Pages asset 검증 통과.
- HOT 기존 기준 충족/미충족, 0명/무기록/기간 초과/조회 실패, 합성 복원, 7일 경계, 패치·집계 기간·provenance 불일치 및 최신 호환 후보 선택 검증.
- 순위 상승/하락/유지, 첫 수집일/누락일, 정책·로스터·화면 불일치, JSON HTTP 오류, 5분 캐시 및 10시 경계 검증.
- 수집 실패 시 이전 기준 보존, 원자 교체 실패, 배포 전후 workflow 순서, 공개 파일 불일치·503·재시도 성공은 기존 단위/워크플로 구조 테스트로 검증. 실제 Actions 실패/Pages 실패를 원격에서 유발하지 않았다.
- Chrome 320/390/1440px × KO/EN 6개 실제 API 연결 로컬 빌드 조합 통과. HOT 기간 초과 안내, 원본 영웅 링크 0개, 로컬 빈 경량 기준 안내, 가로 넘침 없음, pageerror 없음. `browser.json`과 `*-hot.png` 참조. 선정 조건 충족 및 ▲/▼/= UI는 기존 fixture 기반 PC·모바일 테스트와 별개다.
- 원격에 배포하지 않았으므로 운영 사이트 화면이 수정됐다고 보고하지 않는다. 실물 모바일/Safari는 미검증이다.

## 6. 정상 운영에 필요한 사용자 설정·승인 후 절차

### HOT

1. 기존 HOT·그래프 수집 정책에 따른 실제 신규 스냅샷 수집과 Pages 반영을 승인해야 한다. 수동 workflow를 실행해 artifact만 만드는 것으로 공개 index는 바뀌지 않는다.
2. 현재 기본 diamond_plus에는 동일 batchId·5분 이내 관측의 diamond/master/grandmaster 원본이 모두 필요하다. diamond만 수집하거나 별도 v1 단일 파일 세 개를 모으는 것으로 합성 기준을 대신할 수 없다. 기존 `collect-adaptive-snapshots.js <검토한-plan.json> --apply`의 원본 배치 수집·보존 절차를 사용하고 정책상 수집 시점 및 patch effectiveAt을 먼저 확인한다. 이번 작업에서는 실행하지 않았다.
3. 새 원본 파일과 index를 동일한 Pages 산출물로 게시해야 한다. 기존 기록을 삭제하거나 날짜·patchVerification을 위조하지 않는다. 기존 보존 정책 안에서 이후에도 1~7일 이내 비교 관측을 유지해야 한다. 새 기준이 생겨도 픽률과 승률이 함께 기준 이상 오른 영웅이 없으면 0명이 정상이다.

현재 patchCatalog의 effectiveAt은 null이다. 따라서 검토 없이 adaptive 수집 명령만 실행해도 `unverified-effective-time`으로 수집하지 않는다. 이 값이나 patchVerification을 임의로 채워 우회하지 않았다. 현재 HOT의 운영 복구는 변수 설정만으로 끝나지 않으며, 기존 정책에 맞는 관측 수집 가능 여부를 검토하고 새 실제 배치를 공개하는 절차가 필요하다.

### 일일 순위

1. 승인 후 새 코드와 빈 `data/ranks/current.json`을 먼저 일반 Pages로 배포한다. 초기에는 `HOW_RANKS_ENABLED`를 켜지 않는다.
2. Pages source=GitHub Actions 및 github-pages 환경 권한을 확인한다.
3. `HOW_RANKS_URL=https://moonsh0206.github.io/HOW/data/ranks/current.json`을 설정하고 해당 URL이 실제 schemaVersion=1 JSON으로 200인지 확인한다. 커스텀 도메인을 사용한다면 실제 게시 주소에 맞춘다.
4. `HOW_RANKS_ENABLED=true`를 설정한 뒤 준비된 `daily-ranks.yml`을 승인하에 수동 실행한다. 이 값은 Actions에만 사용하며 VITE_ 접두사를 추가하지 않는다. 일반 Pages와 공식 패치 게시도 공개 기준 복원 단계를 포함한 버전이어야 한다.
5. 첫날 게시 확인 receipt와 공개 digest를 확인하고 다음 연속 보고일의 정상 수집·게시 후 비교한다. 10시 예약은 GitHub 실행 지연 가능성이 있으므로 실제 collectedAt을 확인한다. 순위 원본 비율을 artifact/과거 스냅샷으로 보관하지 않는다.

HOT 수집·게시와 경량 순위 수집·게시는 별개의 운영 경로다. 둘 중 하나를 활성화했다고 다른 데이터가 자동 보충되지는 않는다.
