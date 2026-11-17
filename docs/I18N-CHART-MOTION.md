# 다국어 및 그래프 모션 수정

## 원인과 수정 파일

- `src/views/playerRankView.js`: 모듈 초기화 시 `t()` 결과를 저장하여 이후 언어가 바뀌어도 티어명이 남았다. 현재 언어를 읽는 getter로 변경했다. 검색 카드도 같은 renderer를 사용한다. 브론즈/실버/골드/플래티넘/에메랄드/다이아몬드/마스터/그랜드마스터/챔피언, API의 ultimate 별칭 모두 확인했다. 식별자·이미지·디비전 숫자는 그대로다.
- `src/views/filterOptions.js`: 전장 그룹명에도 동일한 초기화 문제가 있어 getter로 변경했다.
- `src/data/jaMapNames.json`: 공식 일본어 자료에서 확인된 10개 표기를 반영했다. 기존 `MAP_NAMES` getter를 통하므로 선택 버튼·옵션·상세 비교 그래프가 같은 이름을 사용한다.
- `src/views/chartMotion.js`: 차트 데이터 서명으로 관련 없는 상세 영역 갱신 시 재등장을 막는다.
- `src/views/{mapStatisticsView,pickHistoryView,heroDetailView}.js`, `src/styles/detail.css`: 데이터 레이어에만 CSS 등장 효과를 적용했다.
- 검증: `tests/chartLocalization.test.js`, `scripts/qa-chart-motion.cjs`.

## 일본어 표기 검증

|키|반영 표기|
|---|---|
|aatlis|アートリス|
|busan|釜山|
|esperanca|エスペランサ|
|grimsvotn|ウォッチポイント：グリムスヴォトン|
|hollywood|ハリウッド|
|ilios|イリオス|
|new-queen-street|ニュークイーンストリート|
|numbani|ヌンバーニ|
|oasis|オアシス|
|runasapi|ルナサピ|

확인한 공식 자료:

- [포르투갈 전장 제작 기사](https://overwatch.blizzard.com/ja-jp/news/23865963/honrar-las-vistas-tradicionales-de-portugal/): エスペランサ, ハリウッド, ニュークイーンストリート, 釜山, オアシス, イリオス, ヌンバーニ.
- [2025년 6월](https://overwatch.blizzard.com/ja-jp/news/patch-notes/live/2025/06/): アートリス.
- [2024년 6월](https://overwatch.blizzard.com/ja-jp/news/patch-notes/live/2024/6/): ルナサピ.
- [2026년 10월](https://overwatch.blizzard.com/ja-jp/news/patch-notes/live/2026/10/): ウォッチポイント：グリムスヴォトン.

공식 일본어 페이지에서도 PARAISO/BUSAN/EICHENWALDE처럼 영문 표기가 사용된다. 나머지 항목의 공식 일본어 철자는 이번 조사에서 충분히 검증하지 못했으므로 기존 원문을 유지했다. 모든 전장 이름의 일본어화가 완료되었다고 주장하지 않는다. 공식 maps 페이지는 403으로 접근되지 않았다. 임의 음역은 추가하지 않았다.

## 애니메이션

- 막대: 최종 실제 높이를 그대로 두고 `scaleY(0→1)`, bottom 기준, 450ms. 두 번째 막대 45ms 지연. 값 텍스트는 별도 요소로 fade하며 count-up은 없다.
- 선: SVG 데이터 선 그룹의 `clip-path`를 좌→우로 열며 3px 아래에서 원위치로 이동, 550ms. 기존 점선의 stroke-dasharray는 변경하지 않았다. 점은 250ms 후 300ms fade한다. 축·날짜·값·44px hit target은 고정된다.
- 공통 easing `cubic-bezier(.22,1,.36,1)`. 데이터 보간·가짜 통계·추가 라이브러리 없음.
- 교체된 DOM의 이전 애니메이션은 함께 제거된다. 동일 데이터의 재렌더링은 재실행하지 않는다. 로딩·오류·결측 패널에는 막대 애니메이션 대상이 없다. 모션은 반복되지 않는다.
- `prefers-reduced-motion:no-preference` 안에서만 활성화하므로 reduce에서는 즉시 최종 상태다.

## 검증

- 전체 단위/회귀 테스트 **316/316 통과**.
- 프로덕션 빌드 통과, 지역화 HTML 660개. 기존 500kB 번들 경고는 남아 있다.
- Pages `/HOW/` 자산 15개 검증 통과. diff 검사 통과.
- 실제 headless Chrome에서 320/390/1280/1440 × 일반/Reduced Motion 8조합: 두 그래프 중간·최종 상태, 높이 불변, 넘침 없음, 빠른 지표 교체, 중복 모션 억제, KO/EN/JA 티어명, 전장 선택값 유지, 이력 0/1/2점 확인.
- 모션 QA는 테스트용 2점 데이터와 정밀도 값을 사용했다. 실제 운영 관측이나 API 수집 성공으로 보고하지 않는다. 이력의 기간·축·툴팁·데이터 구조 및 API 경합 제어는 변경하지 않았다.
- 캡처/결과: `docs/qa/chart-motion/`의 `{width}-{reduced}-{map,history}-{middle,final}.png`, `results.json`.
- 기존 상세 전체 화면 회귀는 `scripts/qa-detail-map-chart.cjs after`로 검사한다. API 오류/결측/캐시 정책은 기존 자동 테스트를 유지했다.
- 기존 미커밋 작업 보존. Meta Score·API·스냅샷·수집·라우팅 변경 없음. Commit/Push/배포 없음.
