# Visual Polish 3 / 그래프 날짜·수치 / 일일 순위 점검

2026-11-21 로컬 구현·검증. Commit / Push / 배포 / GitHub 설정 변경 없음.

## 적용 내용

- 제목: 1366px에서 36px, 1440·1920px에서 38px. 모바일은 `clamp(25px,6.6vw,28px)`로 320px=25px, 390px=25.74px, 430px=28px. 기존 폰트와 Fade-up 유지.
- 좌우 동일한 Grid 트랙과 가운데 검색 폼 구조를 재사용했다. 장식은 absolute 배치 그대로이며, 5종 크기·개별 좌표·선택 로직을 변경하지 않았다.
- 승률·픽률·밴률 열의 tabular-nums 및 줄바꿈 방지, 180ms 행 배경 전환. 숫자 계산·반올림은 변경하지 않았다.
- 역할 평균 승률의 단일 관측은 중앙에 실제 점만 표시하고 SVG 높이를 최대 150px로 제한했다. 관측값을 추가하거나 선을 만들지 않는다. 다중 관측의 연결 조건과 색상은 그대로다.
- 영웅 상세는 관측 날짜를 KST 기준 X축 `MM/DD`로 표시한다. 연도 경계를 지나면 `YYYY/MM/DD`. 날짜별 대표 레이블만 폭에 맞춰 줄이며 모든 실제 포인트와 접근성 표는 보존한다. 90일 이상에서는 표시 후보 간격도 넓힌다. 90일 조회 메뉴를 새로 추가하거나 저장·집계 범위를 변경한 것은 아니다.
- 포인트 근처 툴팁에는 퍼센트만 표시한다. 기존 이력 표시 정밀도인 소수점 1자리 유지. 마우스 근접 탐색, 터치, Focus, Enter/Space, Escape 지원. 전장 비교 막대는 기존 소수점 2자리 퍼센트만 표시하며 날짜 축을 추가하지 않는다.
- 긴 출처·패치 정보는 시각 툴팁에서 제거했다. 검증된 패치/미확인 상태는 포인트의 접근성 설명에 보존했다. 패치 발표일을 통계 반영일로 바꾸지 않았다.
- 영웅 통계와 대시보드의 순위 배지를 공통 View로 통합했다. 기존 ▲/▼/= 표시와 비교 정책을 유지하며 키보드 Focus에서도 같은 관측 기준을 확인할 수 있다.
- 홀로그램, HOT 아우라, 마그마 효과, TOP 순환, 캐시·API·Meta Score·추천 정책·원본 기록은 변경하지 않았다.

## 실측 및 브라우저 검증

Chrome 100%, 저장된 응답을 사용한 재현 테스트다. 운영 수집 성공 검증과 구분한다. 전후 비교는 동일 데이터·동일 장식에서 변경 전 CSS를 복원해 촬영했다.

| 화면 | 제목 전 → 후 | 제목/검색 상단 영역 높이 전 → 후 | 검색 중심 오차 | 가로 넘침 |
|---|---|---|---|---|
| 1440px KO | 28 → 38px | 44 → 44.08px | 0px | 0px |
| 390px KO | 24 → 25.74px | 146 → 145.84px | 0px | 0px |

- 대시보드 320/390/430/1366/1440/1920px × KO/EN/JA: 18조합 통과. 긴 번역문은 자연스럽게 줄바꿈한다.
- 영웅 상세 동일 18조합: 실제 날짜, 포인트 Focus, 지표 전환, 전장 비교/전체 전장 복귀, 툴팁 화면 경계 통과.
- 390/1440px × 일반/Reduced Motion: 4조합 통과. WAAPI 시작부터 중간 프레임의 opacity/transform/clip을 기록했다. 일반 모드에서 선·막대 애니메이션을 확인했고 Reduced Motion에서는 차트 애니메이션 기록이 0개였다. 모바일 터치도 확인했다.
- 시험용 이틀 순위 기록의 영웅 통계: 6개 폭 × 3개 언어 18조합 통과. 상승·하락·유지, 실시간 순위 불일치, 역할/정렬/검색·언어·필터 조건을 검증했다. 390/1440px에서는 대시보드의 배지와 Focus 툴팁도 확인했다. 시험 기록은 브라우저 서버 메모리에만 있으며 운영 JSON을 수정하지 않았다.
- 외부 이미지 일부는 재현 환경에서 대체 문자로 표시될 수 있다. 운영 이미지 자산과 로딩 코드는 변경하지 않았다.

스크린샷 및 측정 파일:

- [PC 변경 전](qa/polish3/browser/1440-ko-before.png) / [변경 후](qa/polish3/browser/1440-ko-after.png)
- [모바일 변경 전](qa/polish3/browser/390-ko-before.png) / [변경 후](qa/polish3/browser/390-ko-after.png)
- [영웅 이력 툴팁](qa/polish3/graphs/390-ko-history.png) / [전장 비교](qa/polish3/graphs/390-ko-map.png)
- [PC 대시보드 순위 배지](qa/polish3/ranks/1440-ko-dashboard.png)
- [레이아웃 측정](qa/polish3/browser/results.json), [그래프 검증](qa/polish3/graphs/results.json), [애니메이션 연속 프레임 수치](qa/polish3/motion/results.json), [순위 검증](qa/polish3/ranks/results.json), [TOP 순환](qa/polish3/cycle/results.json)

## 순위 미표시 원인 및 운영 상태

공개 GitHub API와 Pages를 읽기 전용으로 확인했다. 근거는 [운영 점검 원본](qa/polish3/remote-audit.json), [원격 워크플로·작업·변수 조회 결과](qa/polish3/remote-details.json).

1. 워크플로 자체는 `active`이고 cron은 `0 1 * * *`다. 그러나 최근 예약 실행 4개는 모두 `skipped`다.
2. 최신 실행의 main 브랜치 `publish` 작업은 단계가 하나도 실행되지 않았다. 원격 코드의 조건은 `HOW_RANKS_ENABLED == 'true'`와 main 브랜치다. 조건 미충족이 확인되며, 플래그가 true가 아니거나 누락됐을 가능성이 높다. **변수 조회는 401이어서 실제 변수 값과 URL은 확인하지 못했다.**
3. 공개 `/HOW/data/ranks/current.json`은 HTTP 200이지만 `cohorts: []`다. 로컬 기본 JSON도 비어 있다. 따라서 현재 운영 데이터에는 전일 비교나 deltas가 없다. 이를 UI 오류로 단정하거나 가짜 배지를 채우지 않았다.
4. 최신 예약 실행의 실제 생성 시각은 2026-11-21 08:10:14Z(17:10:14 KST)였다. cron 지정 시각이 곧 수집·게시 시각은 아니다. 건너뛴 실행이므로 이날 수집 시각으로 간주할 수 없다.
5. `live-order-mismatch`는 현재 코드에서 이미 `ready-stored-order`로 처리된다. 유효한 10시 저장 순위의 등락을 실시간 표시 순위와 구분하여 보존한다. 이 정책을 다시 변경하지 않았다.

### 기존 계산·보존 구조

- 이력은 기존 snapshots 인덱스/원본 배치 및 검증된 파생 관측을 사용한다. 포인트의 `time`, `collectedAt`, `stored/current`, 검증된 `patch`, `verificationStatus`를 재사용했다. 수집하지 않은 날짜를 만들지 않는다.
- 일일 순위는 그래프 원본과 분리된 `data/ranks/current.json`의 cohort에 날짜·실제 수집 시각·필터·정책 식별자·역할 명단·최종 순위·전일 comparison/deltas를 저장한다. 승률·픽률·밴률 원본을 일일 순위 파일에 새로 저장하지 않는다.
- 기본 HOW 추천 정렬 → Meta Score → 기존 이름/고유 키 동점 규칙을 그대로 사용한다. 이전 순위 − 현재 순위를 역할별로 계산한다.
- 같은 조회 조건·정책·역할 명단의 정확한 전일만 비교한다. 10시 KST 보고 날짜 경계를 사용한다. 첫날/누락/정책·로스터 변경/불완전 관측은 배지를 숨긴다. 전체 역할 및 다른 정렬에서도 숨긴다.
- 수집 범위는 PC 경쟁전, 전체 전장, 3개 지역 × 원본 9등급·합성 7등급 = 48조건이다. 최대 원본 통계 27회 + 영웅 메타데이터 조회이며 합성 등급은 추가 통계 호출 없이 계산한다. 개별 전장 조합은 현재 자동 수집 범위에 없다. 이번에 수집 범위나 호출량을 확대하지 않았다.
- 일반 Pages 배포의 기존 순위 복원, 직렬 게시, 검증 후 게시 확인, 실패 시 이전 정상 기록 보존 로직은 그대로다. 원격 설정을 바꾸거나 실제 배포 실패 복구를 실행한 것은 아니며, 해당 경로는 기존 회귀 테스트로 확인했다.

### 운영 재개에 필요한 사용자 조치

승인 후 Repository Settings → Secrets and variables → Actions → Variables에서 다음을 확인한다.

1. `HOW_RANKS_ENABLED=true`.
2. `HOW_RANKS_URL=https://moonsh0206.github.io/HOW/data/ranks/current.json`.
3. GitHub Pages가 Actions 게시 방식인지, `github-pages` 환경 승인 제한이 있는지 확인한다.
4. 최신 로컬 변경을 별도 승인 후 반영하고, workflow_dispatch 또는 다음 예약 실행의 publish 단계·확인 아티팩트·공개 JSON을 확인한다.
5. 첫 유효 수집일은 기준만 생성한다. 다음 보고 날짜의 유효한 수집이 있어야 전일 배지가 표시된다. 이틀 기록이 없는 상황에서 과거 순위를 임의 생성하면 안 된다.

현재 상태를 **운영 자동 수집 정상화 완료**로 보고하지 않는다. 로컬 UI·접근성 개선과 재현 검증은 완료했으며 운영 활성화는 사용자 설정 확인이 남아 있다.

## 변경 파일

UI/CSS:
`src/styles/dashboard.css`, `src/styles/detail.css`, `src/styles/panelEffects.css`,
`src/views/dashboardHistoryView.js`, `src/views/heroView.js`, `src/views/metaDashboardView.js`,
`src/views/mapStatisticsView.js`, `src/views/pickHistoryView.js`,
`src/views/historyAxis.js`, `src/views/valueTooltip.js`, `src/views/rankChangeView.js`.

테스트:
`tests/historyAxisTooltip.test.js`, `tests/groupedIntegration.test.js`, `tests/mapComparison.test.js`.

브라우저 재현:
`scripts/qa-polish3.cjs`, `scripts/qa-polish3-graphs.cjs`, `scripts/qa-polish3-motion.cjs`,
`scripts/qa-polish3-ranks.cjs`, `scripts/qa-polish3-cycle.cjs` 및 본 보고서/QA 산출물.

## 최종 검사

- `npm test`: **386/386 통과**. 기존 383개와 신규 3개. 기존 테스트 2곳은 긴 툴팁 대신 퍼센트/접근성 설명을 검증하도록 최신 사양에 맞췄다.
- `npm run build`: 성공, **663개** 지역화 정적 진입점 유지. 기존 대형 JS 청크 경고는 남아 있다.
- `npm run verify:pages`: 성공, `/HOW/`, **23개** 로컬 자산.
- `git diff --check`: 통과.
- 기존 SVG/이미지 원본, 통계·API·캐시·스냅샷·워크플로 설정은 변경하지 않았다.
