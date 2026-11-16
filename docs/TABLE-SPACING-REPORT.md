# HOW 티어리스트 열 간격·정렬 개선

2026-11-16 최신 로컬 UI 기준으로 측정하고 수정했다. Commit·Push·배포는 하지 않았다. 이번 제품 코드 변경은 `src/styles/metaEmblems.css`의 테이블 관련 규칙뿐이다. 이전 작업의 미커밋 변경은 유지했으며 Meta Score·API·HOT·스냅샷·자동 수집·순위 저장 파일은 이번 작업에서 수정하지 않았다.

## 실제 원인

`main.css`의 `th:first-child {width:40%}`는 남아 있지만 실제 첫 열이 40%를 차지하지는 않았다.

1. `navigation.css`의 순위 열 전용 selector와 `metaEmblems.css`의 더 구체적인 규칙 및 기존 colgroup이 이를 덮어쓴다. 변경 전 1440/1280px의 계산된 순위 열은 **52px**, 1024/768px에서는 **44px**였다.
2. 실제 큰 공백은 고정 너비 열들을 배치한 뒤 **너비가 명시되지 않은 영웅 열이 나머지를 전부 받는 것**에서 발생했다. 1440px에서 테이블 1062px 중 영웅 열이 **584px(약 55%)**이었다.
3. 역할·티어는 이미 중앙 정렬되어 있었지만 승률·픽률·밴률은 왼쪽 정렬이라 헤더 셀 중심과 실제 숫자 중심도 다르게 보였다.

전역 40% 규칙을 삭제하면 다른 테이블에 영향을 줄 수 있으므로 그대로 두고, 실제 영웅 테이블의 공통 colgroup 너비만 조정했다. `heroView.js` 및 다른 렌더링·데이터 코드는 추가 변경하지 않았다.

## 수정 방식

- 기존 `table-layout:fixed`와 colgroup, 열 순서를 유지했다.
- 순위는 44px, 즐겨찾기는 48px. 2자리 순번과 ▲/▼/=를 담으면서 불필요한 순위 공간을 줄였다.
- 영웅 30%, 역할 10%, 티어 12%. 나머지 `48% - 순위 - 즐겨찾기`를 세 통계 열에 동일하게 배분한다.
- 테이블은 계속 부모의 100%를 사용한다. 오른쪽 빈 영역을 만들거나 테이블 전체를 줄이지 않는다.
- 역할·티어·세 통계·즐겨찾기를 헤더/행 모두 중앙 정렬한다. 영웅 정보는 기존처럼 왼쪽 정렬한다.
- 영어 Position 헤더도 44px 안에 들어가도록 헤더 폰트/패딩만 정리했다.
- 601~767px에는 기존 소형 테이블에 맞는 고정 최소 열 배분을 남겼다. 390/320px의 기존 카드 관련 CSS는 수정하지 않았다.
- 초상화는 기존 크기를 유지했다. 측정값은 1440/1280/768px에서 46px, 1024px에서 기존 반응형 크기인 36px다.
- 긴 이름은 영웅 열 안에서 줄바꿈하며 통계 열을 이동시키지 않는다. 조건부 A 안내와 엠블럼 디자인은 유지했다.

## 브라우저 계산 열 너비

단위는 CSS px. KO/EN의 열 너비는 동일했다. 소수 차이는 브라우저의 subpixel 분배다.

### 변경 전

| 화면 | 전체 | 순위 | 영웅 | 역할 | 티어 | 승률 | 픽률 | 밴률 | 즐겨찾기 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1440 | 1062 | 52 | 584 | 64 | 86 | 76 | 76 | 76 | 48 |
| 1280 | 902 | 52 | 424 | 64 | 86 | 76 | 76 | 76 | 48 |
| 1024 | 662 | 44 | 266 | 46 | 76 | 62 | 62 | 62 | 44 |
| 768 | 718 | 44 | 322 | 46 | 76 | 62 | 62 | 62 | 44 |

### 변경 후

| 화면 | 전체 | 순위 | 영웅 | 역할 | 티어 | 승률 | 픽률 | 밴률 | 즐겨찾기 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1440 | 1062 | 44 | 318.59 | 106.19 | 127.44 | 139.25 | 139.25 | 139.28 | 48 |
| 1280 | 902 | 44 | 270.59 | 90.19 | 108.23 | 113.66 | 113.66 | 113.67 | 48 |
| 1024 | 662 | 44 | 198.59 | 66.19 | 79.44 | 75.25 | 75.25 | 75.28 | 48 |
| 768 | 718 | 44 | 215.39 | 71.80 | 86.16 | 84.22 | 84.22 | 84.22 | 48 |

390/320px는 테이블이 렌더링되지 않는 기존 카드 모드다. 숨긴 테이블의 0px 값을 실제 열 너비로 해석하지 않았다.

1440px 첫 행 파라 기준 영웅 이름 블록 끝과 역할 아이콘 사이 거리는 KO **491.02 → 246.70px**, EN **486.11 → 241.80px**로 줄었다. 이는 첫 행의 이름 길이에 따른 측정이며 모든 영웅의 간격이 이 숫자라는 의미는 아니다.

역할·티어뿐 아니라 순위·세 통계·즐겨찾기의 헤더 셀 중심과 표시 중심 오차도 **0.008px 이하**였다. 세 통계 열의 너비 차이는 최대 **0.03px**다. 소수 픽셀 반올림을 제외하면 동일한 열 배분이다.

## 검증

- Chrome **1440/1280/1024/768/390/320px × KO/EN 12개 조합** 전후 캡처 및 geometry 검사 통과.
- 화면 가로 스크롤 없음, 조건부 안내의 가로·세로 잘림 없음, 역할/티어/숫자 헤더 중심축 일치.
- 메모리상의 긴 영웅 이름 fixture를 넣어도 열 너비가 변하지 않고 영웅 영역 안에서 줄바꿈하는 것을 확인했다.
- ▲/▼/=가 모두 존재하는 fixture에서 순위 배지가 영웅 영역을 침범하지 않았다.
- 모바일은 기존 카드·즐겨찾기·상세 표시와 역할 아이콘·엠블럼을 유지했다.
- 전체 회귀 테스트 **293/293 통과**. 기존 검색·필터·정렬·즐겨찾기·Meta Score·순위 변동을 포함한다.
- 최종 프로덕션 빌드 및 **440개 KO/EN 정적 진입점** 생성, Pages 파일/경로 검증 통과.
- 기존 production-build browser 회귀 suite를 재사용해 언어 전환·상세·검색·즐겨찾기·플레이어 기능을 별도로 검증했다. 결과는 `qa/table-spacing/regression/browser-results.json`에 기록한다.
- `git diff --check` 통과.

자료는 이전 QA와 같은 캡처 영웅 정보 및 2026-11-06 저장 통계다. 등락 비교 날짜/값과 긴 이름은 명시적인 QA fixture이며 운영 파일에 저장하지 않았다. 외부 portrait는 차단해 전후 모두 기존 문자 fallback을 표시한다. 상단 5등급 샘플은 QA 전용이고 제품 화면에 추가하지 않았다.

## 전후 스크린샷

각 링크의 KO/EN은 동일한 viewport와 데이터 조건이다. before는 이번 작업 시작 시 저장한 **최신 로컬 CSS**를 테스트 서버 메모리에서 사용한다. 과거 HEAD로 checkout하거나 기존 엠블럼 개선을 되돌리지 않았다.

| 화면 | KO 전 / 후 | EN 전 / 후 |
|---|---|---|
| 1440 | [전](qa/table-spacing/before/1440-ko-list.png) / [후](qa/table-spacing/after/1440-ko-list.png) | [전](qa/table-spacing/before/1440-en-list.png) / [후](qa/table-spacing/after/1440-en-list.png) |
| 1280 | [전](qa/table-spacing/before/1280-ko-list.png) / [후](qa/table-spacing/after/1280-ko-list.png) | [전](qa/table-spacing/before/1280-en-list.png) / [후](qa/table-spacing/after/1280-en-list.png) |
| 1024 | [전](qa/table-spacing/before/1024-ko-list.png) / [후](qa/table-spacing/after/1024-ko-list.png) | [전](qa/table-spacing/before/1024-en-list.png) / [후](qa/table-spacing/after/1024-en-list.png) |
| 768 | [전](qa/table-spacing/before/768-ko-list.png) / [후](qa/table-spacing/after/768-ko-list.png) | [전](qa/table-spacing/before/768-en-list.png) / [후](qa/table-spacing/after/768-en-list.png) |
| 390 | [전](qa/table-spacing/before/390-ko-list.png) / [후](qa/table-spacing/after/390-ko-list.png) | [전](qa/table-spacing/before/390-en-list.png) / [후](qa/table-spacing/after/390-en-list.png) |
| 320 | [전](qa/table-spacing/before/320-ko-list.png) / [후](qa/table-spacing/after/320-ko-list.png) | [전](qa/table-spacing/before/320-en-list.png) / [후](qa/table-spacing/after/320-en-list.png) |

기계 판독 측정값은 before/after의 `results.json`, 기준 CSS는 `baseline-metaEmblems.css`에 있다. 같은 폴더의 conditional/favorites/detail 캡처도 비교할 수 있다.

재실행:

```powershell
node scripts/qa-table-spacing.cjs before
node scripts/qa-table-spacing.cjs after
npm.cmd test
npm.cmd run build
node scripts/verify-pages.js
node scripts/qa-meta-emblems-regression.cjs docs/qa/table-spacing/regression
```

기존 `qa-meta-emblems` harness를 재사용하며 테스트 배선이나 수치 계산을 제품에 중복 구현하지 않았다. 승인 후 기존 Pages 배포 절차로 반영할 수 있고 새 운영 설정은 필요 없다.
