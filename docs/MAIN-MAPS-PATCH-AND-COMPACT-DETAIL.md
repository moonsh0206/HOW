# 메인 전장 필터·한국어 맵명·관측 보존·패치 카드·상세 밀도 개선

검토일: 2026-11-04 (한국). 원격 저장소를 초기화하거나 로컬 미커밋 작업을 되돌리지 않았다. 맵 통계·시너지·기존 패치 기능을 유지하며 확장했다. Push·배포·예약 수집 활성화 없음.

## 구현 내용

### 단일 전장 필터

메인 필터 순서는 지역 / 경쟁전 등급 / 모드 / 전장이다. 기본은 전체 전장이다. 검증된 31개 전장을 선택하면 기존 StatisticsService가 해당 map key로 실제 통계를 요청하고 기존 Domain의 동일 가중치·S 자격 조건으로 티어를 계산한다. 메인 조건 요약과 상세 통계에 '선택 전장 기준'을 명시한다. 전장 변경 시 기존 통계와 HOT 이전 자료를 비운 뒤 새 조건을 로드하며, 기존 generation 검사를 재사용한다.

메인과 상세는 같은 `#statistics-filters` DOM과 Model 상태를 사용한다. 상세로 이동하면 같은 필터를 상단 호스트로 옮기고 목록으로 돌아가면 원래 자리에 돌려놓는다. 선택값과 이벤트 리스너를 복제하지 않는다. 같은 호스트에서 재렌더할 때 불필요하게 DOM을 이동하지 않아 키보드 포커스를 보존한다. 데스크톱 4열, 모바일 2열이다.

기존 상세 맵 선택기는 제거했다. 상세의 비교 영역은 상단에서 선택한 전장의 통계를 메인 Model에서 재사용하고, 동일 플랫폼·지역·모드·등급의 전체 전장 기준값만 별도 조회한다. 전체 전장 기준은 같은 서비스의 캐시를 재사용한다. 전체 전장이 선택되어 있으면 불필요한 비교 API 요청 없이 짧은 안내만 표시한다. 전체 전장 대비 승률 차이(%p), 선택 전장 승률·픽률·밴률은 유지한다. 비교 기준 요청이 늦게 도착해도 다른 영웅·필터의 결과를 덮어쓰지 않는다.

전장에 따라 통계와 티어 결과는 바뀔 수 있지만 Meta Score v2 가중치 65:25:10과 S 자격 조건은 변경하지 않았다. '모든 화면을 전체 전장 기준으로 고정'하던 이전 맵 기능의 범위는 이번 사용자 요청에 따라 변경했다. 비교용 전체 전장 데이터로 선택 전장의 티어를 덮어쓰지 않는다.

### 공식 한국어 명칭

실제 OverFast `/maps` **59개 전부**를 목록화했다. [블리자드 한국어 통계 화면](https://overwatch.blizzard.com/ko-kr/rates/)의 map option key와 이름을 직접 대조하여 선택 가능한 **31개 전장 모두 공식 한국어 이름**으로 표시한다. API key는 바꾸지 않는다. 이름·상태·출처·검토일은 `src/data/mapNamesKo.json`으로 분리했다. API 목록 재조회에 실패하면 마지막으로 검증한 로컬 목록을 사용한다고 알린다.

아케이드·스타디움 전용·훈련장·워크샵 등의 나머지 **28개는 이번에 공식 한국어 표기를 확인하지 못했다**. 임의 번역 없이 nameKo=null/status=needs-review로 보존한다. 현재 메인 선택지에는 포함되지 않는다. 외부에서 이 이름 변환기를 호출하면 명칭 검토 중이라는 폴백을 제공한다.

검토 대상 키: anubis, arena-victoriae, ayutthaya, black-forest, castillo, chateau-guillard, ecopoint-antarctica, gogadoro, hanamura, hanaoka, horizon, kanezaka, malevento, necropolis, paris, petra, place-lacroix, powder-keg-mine, practice-range, redwood-dam, thames-district, throne-of-anubis, volskaya, workshop-chamber, workshop-expanse, workshop-green-screen, workshop-island, wuxing-university.

공식 전장 로테이션에 포함되는지와 standard 유형인지는 다른 문제다. 현재 선택지의 31개가 모든 시즌의 활성 로테이션이라는 주장은 하지 않는다. 통계 미제공 또는 API 오류는 기존 안전한 상태로 표시한다.

### 실제 JSON 관측 추가 및 보존

수동 실행: `node scripts/collect-snapshot.js --division diamond`.

| 구분 | UTC 수집 시각 | 조건 | 영웅 수 | 패치 |
|---|---|---|---:|---|
| 기존 보존 | 2026-11-02T05:36:24.500Z | PC/아시아/경쟁전/전체 등급/전체 전장 | 54 | 미확인 |
| 새 관측 | 2026-11-04T00:52:25.812Z | PC/아시아/경쟁전/다이아몬드/전체 전장 | 54 | 미확인 |

새 파일은 `public/data/snapshots/2026-11-04T00-52-25.812Z.json`이다. 한국 시각은 2026-11-04 09:52:25.812이다. 서버 Age는 **2870초**였다. 데이터 제공처, 실제 endpoint, UTC 수집 시각, 필터, cacheAgeSeconds, 54명 raw 비율, patch=null, patchVerification=null, statisticsWindow='unverified-patch-window', aggregateAt=null을 기록했다. null 검증 근거는 확인되지 않았다는 뜻이며, 패치 소속을 확정하는 증거가 아니다.

기존 파일 바이트의 SHA-256과 기존 index 항목의 내용이 동일함을 검사했다. 이전 기록은 그대로 두고 새 항목 하나만 추가하여 **총 2개**이다. 증거는 `research/snapshot-preservation/before.json`, `after.json`에 남겼다. 수집기는 이제 54명 현재 키가 모두 존재할 때만 파일을 쓴다. 기존 전체 등급 기본값을 다이아몬드로 바꾸지는 않았다.

수집 시각과 Age만으로 새 패치 이전/이후 집계인지 판정하지 않았다. 기존의 과거 승률을 API에서 복원하지도 않았다. 확정 패치 그래프에는 확인된 적용 시각·집계 구간 근거가 있는 기록만 들어간다. 새 자료는 영구 로컬 JSON 관측이지만 확정 패치 대표값은 아니다. 화면에서 가져온 현재 API 값이 자동으로 저장소에 기록된다고 표시하지 않는다.

`patchMilestones()`는 확인된 실제 적용 시각을 기준으로 D+1/D+3/D+7의 notBefore와 첫 대표값/후속 관측 구분을 계산하는 계획만 제공한다. 적용 시각 미확인이면 계획을 만들지 않는다. 기존 대표값을 D+3/D+7 값으로 자동 교체하지 않으며, 후속 자동 실행은 연결하지 않았다. 일반 수동 collector로 추가 원본을 보존할 수 있다.

SnapshotService 및 StatisticsService의 query key에는 map이 포함된다. 전체 전장/개별 전장, 다이아몬드/전체 등급은 서로 다른 자료다. 실제 retention dry-run은 **2개 검증·2개 보존·삭제 후보 0개**이다.

### 이번 패치 노트 카드

오른쪽 sidebar의 최상단에 '이번 패치 노트' 카드를 추가했다. HOT·숨은 꿀영웅 등 기존 카드와 모바일 인사이트 이동 구조는 유지한다. 기본은 짧은 자체 요약이고 '주요 변경 보기'는 접힌 details이다. 공식 링크는 새 탭과 noopener/noreferrer를 사용한다.

검증한 공식 한국어 제목은 '오버워치 패치 노트 - 2026년 11월 4일'이다. [넥슨 공식 목록](https://overwatch.nexon.com/news/patchnotes)에서도 같은 제목을 확인했다. 개별 넥슨 URL은 확인하지 못해 만들지 않았다. 대신 실제로 확인된 [블리자드 한국어 11월 페이지의 해당 앵커](https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/11/#patch-2026-11-03)로 연결한다.

한국어 제목의 11월 4일과 영어 문서/공식 앵커의 11월 3일은 서로 다른 표시 날짜로 보존한다. 같은 공식 앵커를 확인했으므로 별개의 새 통계 패치라고 임의 등록하지 않았다. 정확한 적용 시각은 여전히 미확인이다. 카드의 날짜는 한국어 노트 날짜이며 통계 집계 패치와 별도임을 작게 표시한다. D.Mon 조정, 아나 공격력 하향, 일리아리 성능 상향 등 확인된 변화만 짧게 자체 요약했으며 노트 전문을 복제하지 않았다.

### 상세 오른쪽 컴팩트화

- 초상화 48→42px, 기존 3열 유지. 링크 최소 높이는 44px이다.
- 카드 간 gap 8→6px, 항목 padding 4→2px, 초상화/이름 gap 6→4px.
- 시너지/지속 능력 경계 margin·padding 14→10px.
- 지속 능력 내부 padding 12→10px, 본문 line-height 1.7→1.55.
- 이름·설명 내용을 제거하거나 말줄임 처리하지 않았다. 강제 높이·overflow 숨김을 사용하지 않았다. 그래프 크기·비율도 변경하지 않았다.
- 이유는 기본 접힘이며 모바일 summary 터치 높이는 44px 유지. 본문·이름 글씨를 줄이는 대신 여백을 조정했다.

10~20% 축소는 조정 목표였으며 실제 전체 카드 높이 감소율로 측정한 결과는 아니다. 초상화 자체는 12.5% 줄었으나 본문 길이·줄바꿈에 따라 전체 높이는 다를 수 있다.

## 검증 결과와 남은 과제

- `npm.cmd test`: **103개 통과**. 4개 필터·맵 query·메인/상세 공유 DOM·중복 선택기 제거·포커스·선택 전장 통계/비교 기준 분리, 공식 31개 이름 대조·59개 전체 목록 관리, 기존 JSON 해시/항목 보존·코호트 분리, 카드 링크·날짜·접힘, 기존 티어·카운터·시너지·패시브·즐겨찾기 회귀 포함.
- `npm.cmd run build`: 통과.
- `npm.cmd run verify:pages`: 통과 (base=/HOW/, 로컬 자산 6개).
- `git diff --check`: 통과.
- 브라우저 도구는 `No browser is available`을 반환했다. 실제 PC/모바일 화면, 오른쪽 전체 높이와 좌우 빈 공간 감소율, 3열 시각·터치·overflow·스크린샷은 미검증이다. DOM 및 CSS 검증을 실제 시각 검증으로 주장하지 않는다.
- 미확인 28개 비선택 전장의 공식 한국어 명칭, 실제 패치 적용 시각·원본 집계 구간, 여러 패치의 검증된 과거 기록은 후속 확인 과제이다.
- 자동 Actions 일정·커밋·Push·공개 배포는 활성화하지 않았다.

## 변경 파일

수정: `index.html`, `src/controllers/heroController.js`, `src/controllers/routingController.js`, `src/controllers/mapStatisticsController.js`, `src/views/heroView.js`, `src/views/heroDetailView.js`, `src/views/mapStatisticsView.js`, `src/views/insightView.js`, `src/models/mapModel.js`, `src/models/patchCollectionModel.js`, `src/main.js`, `src/styles/layout.css`, `src/styles/detail.css`, `scripts/collect-snapshot.js`, `public/data/snapshots/index.json`, `tests/mapStatistics.test.js`, `tests/ranked.test.js`, `tests/patchCollection.test.js`.

이번 작업에서는 main.css를 직접 수정하지 않고 우선순위가 높은 layout.css/detail.css에서 필요한 규칙을 조정했다.

신규: `src/data/mapNamesKo.json`, `src/data/currentPatchNote.js`, `src/views/patchNoteView.js`, `tests/mainMapAndPatch.test.js`, 새 다이아몬드 스냅샷, `docs/research/map-localization/*`, `docs/research/snapshot-preservation/*`, 본 문서.
