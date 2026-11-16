# HOW 안정화 및 상세 UX 검증 — 2026-11-16

이번 작업은 로컬 수정과 검증만 수행했다. Commit·Push·배포·Actions 실행/활성화·저장소 변수 변경·원격 데이터 브랜치 생성은 하지 않았다. 기존 스냅샷 파일 5개와 index, 순위 `current.json`, Meta Score/티어 정책, HOT 수치 기준, 패치 카탈로그는 변경하지 않았다. 실수집 리허설은 별도 임시 폴더에서만 수행했다.

## 1. 그래프 자동 수집이 완성되어 있었는가

**운영 미활성화 / 연결 누락이 있었다.**

`collect-snapshot.js`는 동일 조건의 단일 원본 관측, `collect-patch-snapshot.js`와 `patchCollector.js`는 검토한 패치 이후 최초 관측을 수집한다. 다중 관측 일정은 별도의 기존 `adaptiveCollectionDecision` → `collectAdaptiveRegions` → `collectDivisionBatch` → `persistDivisionBatch`에 구현되어 있었다.

기존 `daily-snapshots.yml`·`patch-snapshots.yml`에는 schedule이 없고 workflow_dispatch만 있다. 생성 결과를 retention-days:30 Artifact에 올리는 것으로 끝나며, 다음 실행 복원·영구 저장·Pages 갱신은 하지 않는다. Artifact는 만료될 수 있는 실행 산출물이며 Git 저장 데이터나 공개 Pages와 다르다. [GitHub 보존 기간 문서](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts)

이전 로컬 작업 이후 사용자가 반영한 원격 main은 `bb33d098306d93db50a5de5efed2600d2c164937`이고 11월 16일 13:04 KST Pages 실행은 success다. 경량 순위 workflow와 빈 JSON도 현재는 공개되어 있다. 이번에 추가한 graph-snapshots workflow 및 영구 보관 브랜치는 원격에 없다. 이전 보고서의 순위 JSON 404 상태와 혼동하지 않아야 한다.

## 2. 패치별 일정 구현 및 누락

| 항목 | 기존 구현 | 현재 운영/제약 |
|---|---|---|
| D+1, D+3, D+7, D+14 | adaptive 정책과 단위 테스트 있음 | 자동 호출 미연결 |
| D+21, D+28 이후 주간 | 7일 단위로 due 판단 | 자동 호출 미연결 |
| 최소 24시간 관측 간격 | 구현 | 날짜를 위조해 우회하지 않음 |
| 지역별 하루 최대 2회 시도 | 구현 | 기존 ledger는 runner-local cache여서 다음 실행에서 소실 가능 |
| 미수집 과거 날짜 backfill 금지 | 실제 collectedAt 사용, 지난 milestone 전체를 재생성하지 않음 | 지연 실행은 최신 due 구간만 수집 |
| 확인된 패치 적용 시각 | catalogue의 effectiveAt 필요 | 현재 null이라 `unverified-effective-time`으로 수집 차단 |
| upstream 패치 집계창 검증 | 별도 proof 검증 | 시점이 패치 이후여도 기본 수집 결과는 patch=null/unverified |

milestone은 관측을 요청하는 목표 구간이다. 늦게 실행한 자료를 정확한 과거 D+n 시각에 관측했다고 저장하지 않는다. 검토된 적용 시각과 해당 API 집계창이 확인되지 않은 자료를 패치 효과로 단정하지 않는다. 카탈로그 값을 추측으로 채우지 않았다.

## 3. 실제 저장 위치·기간 및 로컬에서 완성한 연결

| 저장 위치 | 보존 성격 | 상태 |
|---|---|---|
| main의 `public/data/snapshots/` 5개 + index | 이미 Git에 저장된 자료. 자동 만료/삭제 코드 없음 | 정상 작동 |
| 기존 수동 workflow Artifact | 요청 보존 30일, 영구 저장/공개 아님 | 정상이나 용도 제한 |
| `how-graph-archive` 전용 데이터 브랜치 | 새 관측 원본·공개 index·시도 ledger, 삭제/force-update 없이 누적 | 로컬 구현만 완료 / 운영 미활성화 |
| GitHub Pages | 현재 공개 사본, 독립 영구 보관의 대체가 아님 | 기존 기록 정상 조회 |
| 실수집 리허설 임시 폴더 | 테스트 산출물. 원격 영구 보관 아님 | 로컬 검증 완료 |

새 경로는 기존 adaptive 수집기를 그대로 사용한다.

```text
승인된 일정 판단 → 실제 원본 배치 수집 → 구조/품질/54명 검증
  → 전용 Git 데이터 브랜치에 원본·index·시도 ledger 보존
  → Pages 빌드/검증 → 배포 → 공개 index와 원본 바이트 재확인
```

- `scripts/lib/graphArchive.js`: index↔원본 일치, 원본의 모든 관측이 index에 있는지, 경로·중복·충돌을 검증한다. 기존 파일의 바이트나 동일 관측의 metadata가 다르면 중단한다. 합집합으로 이전 파일을 보존하며 오래된 자료를 삭제하지 않는다.
- `scripts/graph-archive.js`: 복원·명시적 Actions 보존·게시 검증 CLI. 원격 쓰기는 `persist --apply`, `GITHUB_ACTIONS=true`, `HOW_GRAPH_ARCHIVE_ENABLED=true`일 때만 허용한다. 이번 작업에서는 실행하지 않았다.
- 데이터 브랜치의 SHA를 고정해 index와 모든 파일을 읽는다. Git ref 갱신은 force:false이며 경쟁 갱신을 거부한다. 바뀐 자료가 없으면 불필요한 commit을 생성하지 않는다. [Git references API](https://docs.github.com/en/rest/git/refs), [Git commit API](https://docs.github.com/en/rest/git/commits)
- `.github/workflows/graph-snapshots.yml`: 매시 17분에 정책을 점검하도록 로컬 준비. 활성화 변수와 main 조건으로 차단된다. 테스트 후 영구 저장하고 Pages를 게시한다. 게시가 실패해도 수집한 원본은 다음 실행에서 복원 가능하다.
- 일반 Pages·일일 순위·공식 패치 노트 게시에도 조건부 그래프 복원을 추가했다. 모든 게시자는 동일한 `pages` 동시 실행 그룹을 사용한다. 복원 실패는 게시를 중단한다. 그래프 게시자도 활성화된 경우 기존 공개 경량 순위를 복원해 빈 bootstrap으로 덮어쓰지 않는다.
- 공개 검증은 index 및 원본 파일 전부를 비교하며 CDN 지연은 5초 간격 최대 12회 확인한다.
- 공개 기록과 후보가 동일하면 매시 불필요한 테스트·빌드·배포를 생략한다. 원본은 영구 저장됐지만 이전 Pages 배포만 실패한 경우에는 공개 사본과 다르므로 다음 실행에서 게시를 복구한다. 시도 ledger 보존은 별도로 유지한다.

신규 영웅은 기존 54명과 API roster가 다르면 검토 전 수집을 중단한다. API 결측률은 null 그대로 저장하고 0이나 다른 등급 값으로 채우지 않는다. 요청이 부분 실패한 지역 배치는 게시 후보에서 제외한다. 정상 지역과 이전 관측은 유지한다.

## 4. Pages 및 실제 데이터 확인

**기존 기록은 정상 작동. 새 자동 보존/게시의 실제 원격 실행은 추가 검증 필요.**

11월 16일 13:31 KST 공개 조회 결과:

- `data/snapshots/index.json`: HTTP 200, 29개 원본 관측 항목.
- 원본 JSON 5개 모두 HTTP 200. 로컬 원본과 **바이트 일치**.
- 3지역 × 9개 원본 등급은 정상 복원. 각 지역의 7개 합성 등급도 원본에서 재계산되어 총 50개 view 관측이다. 각 view에 54명 기록이 있다.
- 최신 공개 관측은 `2026-11-06T02:38:31.943Z`. 이후 운영 관측은 없다.
- `how-graph-archive` 원격 브랜치 조회는 404. 이번 작업의 영구 보관 기능이 운영 중이라고 볼 수 없다.
- 경량 순위 JSON은 HTTP 200이지만 `cohorts=[]`, `generatedAt=null`. 이번 작업은 이 파일을 변경하거나 전일 자료를 만들어 넣지 않았다.

실제 API 리허설:

```powershell
node scripts/test-graph-publication-live.js --run
```

실제 heroes 조회 1회 + 아시아 원본 통계 9회 → 54명 검증 → 임시 archive에 새 배치 저장 → 독립 재조회 → 별도 Vite 프로덕션 빌드 → 로컬 HTTP 공개 → 실제 snapshotService로 합성 등급 재조회 → 아나 승률/픽률/밴률 그래프 값 확인이 통과했다. patch는 unverified로 유지했다. 기존 5개 파일과 index는 변경되지 않았다.

`docs/qa/stabilization/graph-live.json`은 실제 수집 근거이며, Git 데이터 브랜치 쓰기 및 실제 Pages 배포는 테스트하지 않았다고 명시한다. Git API 영구 저장·다음 실행 복원·ref 충돌은 별도의 **모의 Git API** 테스트로 검사했다. 실제 원격 쓰기로 오해하면 안 된다.

## 5. HOT 미표시 원인 및 진단

현재 주요 원인은 **비교 관측이 약 10일 전이라 1~7일 범위를 넘는 것**이다. 조건을 완화해도 유효한 비교 기준이 생기지 않는다.

기존 진단은 무기록·기간 초과·필터 불일치·provenance/패치/집계창 불일치·조회 오류·후보 0명을 구분한다. 이번에는 유효한 승률·픽률이 하나도 없을 때에도 단순 후보 0명으로 안내하던 경로에 `quality-unavailable` 상태를 추가했다. `hotHeroes`에 평가 가능/제외 개수만 추가했고 운영 threshold와 동시 상승·정렬·최대 3명 조건은 바꾸지 않았다.

`#hot-content.dataset.hotStatus`로 원인을 확인할 수 있다. 기본 합성 등급의 원본 복원은 정상이며 현재 실제 화면에 새 HOT 영웅이 생겼다고 보고하지 않는다.

## 6. HOT 기준별 실제 비교와 추천

실제 저장 관측 50개 중 서로 호환되는 과거 비교 구간은 **2개뿐**이다. 현재 후보가 아니라 11월 초의 실제 역사적 관측 비교다. 다른 지역·합성 등급은 두 관측이 없어 후보 수를 만들지 않았다.

| 실제 비교 조건 | 기존 1.0/0.5 | A 0.7/0.3 | B 0.5/0.3 | C 0.5/0.2 |
|---|---:|---:|---:|---:|
| 아시아 전체 등급, 11/2 → 11/6 | 11 | 12 | 14 | 14 |
| 아시아 다이아몬드, 11/4 → 11/6 | 12 | 15 | 15 | 15 |

숫자는 cap 이전 후보 수이며 실제 표시는 모든 경우 3명이다. 상위 3명도 네 정책에서 동일했다.

- 전체 등급: 정커퀸(픽 +8.7 / 승 +8.1%p), 일리아리(+4.3 / +6.5), 마우가(+1.4 / +5.7).
- 다이아몬드: 정커퀸(+12.6 / +13.8), 라이프위버(+1.9 / +9.8), 일리아리(+6.7 / +6.5).
- 전체 등급의 A는 에코(+0.8 / +0.3)를 추가하고, B/C는 라이프위버(+0.6 / +2.0)·미즈키(+0.5 / +1.2)까지 추가한다. C는 B 대비 후보가 늘지 않았다.
- 다이아몬드의 A/B/C는 주노(+0.8 / +4.8), 미즈키(+0.9 / +3.2), 시에라(+0.7 / +2.8)를 추가하지만 표시 상위는 바뀌지 않는다.

**추천은 기존 기준 유지**다. 이 두 구간에서는 기준이 너무 엄격해 HOT이 비는 현상을 확인하지 못했다. 운영 빈도나 작은 변화의 신뢰성을 추정할 연속·다지역 표본도 부족하다. 먼저 관측 공급을 복구해야 한다. 모든 비교는 집계창 미확정이며 패치 효과나 통계적 유의성의 근거로 쓰지 않는다.

전체 명단·변동폭·원본 해시: `docs/qa/stabilization/HOT-POLICIES.md`, `hot-policies.json`. 재실행: `node scripts/compare-hot-policies.js`.

## 7. 영웅 상세 UX 개선

**로컬 구현 및 브라우저 검증 완료.** 디자인·색상·배경 구도·라우팅은 유지했다.

- 진입 헤더와 활성 탭에 180ms opacity/translateY(5px) 전환. 배경은 실제 이미지 load 후 200ms opacity 전환. 높이·너비를 애니메이션하지 않는다.
- reduced-motion이면 새 Web Animations를 호출하지 않고 배경 transition도 끈다.
- 로딩 시 헤더·탭·요약 영역을 예약한다. 상태 메시지는 접근성 트리에 남기고 빈 장식 슬롯만 aria-hidden 처리한다. portrait 크기와 특전 선택률 영역도 유지한다.
- 같은 데이터의 재렌더 및 탭만 바뀌는 경우 기존 통계·그래프·특전 DOM을 유지한다. 하위 역할 패시브도 같은 노드를 이동한다. 그래프/특전의 데이터가 바뀌면 필요한 내용을 갱신한다.
- 기존 metric/favorite/history 포커스 처리, aria-current, heading focus, 필터·뒤로 가기·스크롤 복원은 유지했다. 동일 렌더에서 포커스가 보존되는지 새 테스트로 확인했다.

수정 파일은 `heroDetailView.js`, `detail.css`. `routingController.js`는 변경하지 않았다. 미세한 레이아웃 이동을 완전히 0으로 보장한다고 주장하지 않으며, 느린 API/이미지에서도 헤더 위치·스크롤이 튀지 않는 기존 브라우저 시나리오를 통과했다.

## 8. 회귀 테스트 및 실제 결함

최종 **291/291 테스트 통과**, 프로덕션 빌드와 440개 KO/EN 정적 진입점 생성, Pages 경로/파일 검증 및 diff 공백 검증 통과.

Meta Score/티어·각 비율 정렬·기본 정렬·역할/지역/등급/전장·합성·검색/즐겨찾기·일일 등락·HOT/메타·상세/기술/특전 선택률·그래프/패치·카운터/시너지·플레이어·언어/SEO·캐시/시간 초과/재시도·게시 보호를 포함한 기존 전체 suite를 실행했다.

브라우저 검증은 기존 suite를 재사용해 새 폴더에 저장했다.

| 검증 | 조건 | 결과 |
|---|---|---|
| 통합 언어/상세/플레이어/즐겨찾기/SEO/뒤로 가기 | 320/375/390/430/1440px, 캡처 API | 5개 해상도 통과 |
| 상세 탭/세 지표/특전/반응형 | 8개 폭 × 5개 영웅, 캡처 API + 실제 로컬 정적 JSON | 40개 통과 |
| 정상/느린 API/느린 배경/실패 후 재시도 | 390/1440px × 4 상태 × 4 상세 경로 | 32개 통과 |
| 상세 스크롤/필터/탭/즐겨찾기/뒤로 가기 | 320/375/390/1440px | 4개 해상도 통과 |
| reduced-motion·DOM identity·포커스 | JSDOM 및 reduced-motion 브라우저 suite | 통과 |
| 실제 API 54명→임시 archive→빌드→HTTP | 아시아 9개 원본, 세 metric·합성 | 통과 |
| 실제 Git 브랜치 write / 새 Pages 배포 | 미승인 원격 변경 필요 | 추가 검증 필요 |

**실제 결함 → 로컬 수정 완료:** 합성 history가 실패한 구성 파일/불완전 배치의 gap을 버려 두 유효 관측을 선으로 연결할 수 있었다. 실패 시각의 값 없는 gap을 전달해 연결을 끊도록 수정했고 HTTP 503과 누락 원본 두 경로를 재현했다. 원본값이나 과거 날짜를 생성하지 않는다.

**상태 안내 결함 → 로컬 수정 완료:** 모든 HOT 후보가 결측/품질 검토로 평가 불가능해도 단순 후보 없음으로 안내하던 경우를 구분했다.

최종 미해결 테스트 실패는 없다. 새 QA 서버의 루트 경로 처리 오류와 기존 스크롤 suite가 데스크톱에서 숨겨진 모바일 메뉴를 클릭하던 낡은 가정은 harness를 현재 반응형 UI에 맞춰 수정한 후 재실행해 통과했다. 실물 모바일/Safari 및 실제 승인 환경의 브랜치 권한·배포 실패는 미검증이다.

## 9. 아직 자동화되지 않은 운영 기능

- 새 graph workflow와 데이터 브랜치가 운영에 설치/초기화되어 있지 않다.
- 검증된 patch effectiveAt 및 새 패치의 운영 대상 ID 선택은 자동 확정하지 않는다. 공식 노트 날짜만으로 실제 적용 시각이나 OverFast 집계창을 추정하지 않는다.
- 신규 영웅 발생 시 검토된 roster 갱신이 필요하다. 자동 추정해 분류하거나 기존 기록을 재작성하지 않는다.
- 기존 수동 collector의 Artifact가 자동으로 새 영구 archive에 합쳐지지는 않는다. 승인한 collector 경로 하나를 사용해야 한다.
- 현재 순위 JSON은 초기 빈 상태다. 일일 비교는 실제 연속 두 보고일의 정상 수집/게시가 필요하며 그래프 원본에서 대신 만들지 않는다.
- 운영 변수 실제 값은 연결 권한상 조회하지 못했다. 현재 그래프 신규 workflow/브랜치 부재는 원격 읽기로 확인했다.

## 10. 배포·운영 활성화 후속 작업

다음은 **승인 후** 수행할 절차이며 이번에 실행하지 않았다.

1. 로컬 diff를 검토해 일반 코드 배포를 먼저 수행한다. 초기에는 `HOW_GRAPH_ARCHIVE_ENABLED`를 끈 상태로 둔다. 일반 Pages·일일 순위·공식 패치 게시 모두 새 복원 지원 버전이어야 한다.
2. 전용 데이터 브랜치 보존 방식을 승인한다. 미래 graph job은 repository contents:write 권한으로 **how-graph-archive에만** Git commit/ref를 생성한다. main에 commit/push하지 않으며 branch protection을 우회하지 않는다. Pages 환경에 pages:write/id-token:write가 필요하다.
3. `HOW_GRAPH_PUBLIC_URL=https://moonsh0206.github.io/HOW/data/snapshots/`(끝 `/` 필요), `HOW_GRAPH_PATCH_ID=검토한 catalogue ID`를 설정한다. 커스텀 도메인이면 실제 공개 URL에 맞춘다.
4. `HOW_GRAPH_ARCHIVE_ENABLED=true`로 설정하고 최초에만 graph workflow를 bootstrap=true로 수동 실행한다. 기존 5개 원본이 데이터 브랜치와 공개 사이트에 보존됐는지 확인한다. current catalogue의 effectiveAt=null이면 수집은 안전하게 skip된다. 변수를 켜는 것만으로 이 blocker가 해결되지 않는다.
5. 신뢰할 수 있는 적용 시각을 검토·승인해 catalogue에 반영한 다음, bootstrap=false로 실제 due 관측을 수집한다. 원격 Git 보존 SHA, index 증가, Pages 검증 로그, 브라우저 graph 재조회를 확인한다. D+n 목표를 실제 과거 날짜로 backfill하지 않는다.
6. 일반 Pages와 일일 순위 게시 후에도 신규 그래프 파일/인덱스가 유지되는지 실제 운영에서 확인한다. 게시 실패·원격 ref 충돌·복원 실패 시 마지막 원본과 공개 사이트를 보존하는 복구 경로도 승인된 환경에서 확인한다.
7. 일일 순위는 기존 `HOW_RANKS_URL`·`HOW_RANKS_ENABLED`를 별도로 유지한다. 그래프를 잠시 중지할 때는 workflow를 Disable하고 **복원 변수는 유지**한다. 변수를 끄면 다른 게시자의 복원도 꺼지므로 데이터가 공개 사이트에서 빠질 수 있다.

요약 상태:

| 분류 | 결과 |
|---|---|
| 정상 작동 | 기존 5개 원본·29개 index 항목·54명/세 지표·합성 복원·공개 HTTP 조회·기존 정책 계산 |
| 로컬 구현만 완료 | 영구 data branch 경로, 모든 게시자 복원, 공개 바이트 검증, 상세 전환 및 DOM 유지 |
| 운영 미활성화 | 신규 graph workflow 및 데이터 브랜치, due 관측 자동 수집 |
| 실제 결함 | 합성 graph gap 누락과 HOT 전원 품질 제외 안내 — 재현 후 로컬 수정 |
| 추가 검증 필요 | 실제 원격 영구 저장/Pages 새 배포/권한·실패 복구, 실제 장기 관측, 실물 모바일/Safari |
