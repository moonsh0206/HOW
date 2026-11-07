# 특전 카드 내부 선택률 통합

검증일: 2026-11-07 (KST). 기존 미커밋 연동 코드와 실제 수집 JSON을 보존하며 수정했다. 새 API 수집·원본 변경·Commit/Push/PR/배포는 수행하지 않았다.

## 원인과 수정

기존 `itemCard()`는 `contentKey`가 바뀔 때만 생성됐지만, 선택률 갱신 루프는 이미 그 바깥에 있어 비동기 응답을 카드 내부에 붙일 수 있었다. 실제 문제는 Controller의 `route.tab !== 'perks'` 조회 제한이었다. 전체 정보 탭에도 Minor/Major 카드가 보이지만 JSON을 요청하지 않아 '특전 탭에서 선택률을 조회합니다' 상태로 남았다.

- 상세 정보 준비가 끝나면 탭과 무관하게 동일 출처 특전 JSON을 조회한다. 영웅 key/pending/캐시는 그대로 공유하므로 탭·필터 변경에 중복 요청하지 않는다.
- `perkCardsForDetail()` 순수 Model 함수가 OverFast 항목에 검증된 `selection`을 연결한다. provider ID·Minor/Major·명시적 한국어 이름/아이콘 매핑은 기존 검증 경로를 유지한다. View는 제공받은 선택 항목의 숫자·건수·막대를 그린다.
- Controller가 Model 결과를 View에 전달한다. View 단독 호출과 테스트를 위한 Model 함수 fallback도 유지했다. 영어/한국어 유사도나 배열 순서로 데이터를 연결하지 않는다.
- 기존 `.ability-card`와 설명/아이콘/시연 영상은 유지한다. 데이터 도착 시 카드 안 `.perk-selection`만 갱신한다. `contentKey`를 특전 응답마다 바꿔 전체 카드를 재생성하지 않는다.
- 하단 `#detail-perk-rates`는 제목·패널·독립 카드 목록이 없는 작은 출처 footer로 바꿨다. 링크/수집 시각/필터 독립 안내를 남기고 같은 상태 재렌더링에서는 footer DOM도 보존한다. 오류 시 기존 안전한 재시도와 연결 안내는 유지한다.
- 기본 PC 2열, 모바일 1열 반응형과 주황 강조 숫자·0~100 meter를 유지한다. footer 공통 CSS의 flex가 간섭하지 않도록 해당 출처만 block으로 지정했다.

## 실제 저장값

`public/data/perks/overlooker-perks.json`을 그대로 읽었다. 수집 시각은 **2026-11-07 01:38:44.705 KST**, 제공 조건은 `queue_type:null, since:null`이다. 사용자 스크린샷의 경쟁전 관측 수치와 혼동하지 않고 저장 원본을 우선했다.

|겐지 특전|선택률|선택 건수|
|---|---:|---:|
|신속 베기|35.79%|355|
|용의 갈증|64.21%|637|
|회전하는 칼날|63.34%|482|
|명상|36.66%|279|

값을 새로 하드코딩하거나 수집 날짜를 갱신하지 않았다. 제공처 집계 기간과 단계별 분모는 기존 미확인 상태를 유지한다. HOW 지역·등급·전장·게임 모드와 별도 자료이며 Meta Score에 사용하지 않는다.

## 검증

- **전체 테스트 185/185 통과**(기존 182개 + 카드 바인딩 3개).
- 실제 수집 JSON으로 54명/216개 카드 DOM에 정확한 비율·선택 건수·meter가 표시되는지 검사했다. 기존 설명 객체는 변경하지 않는다.
- 지연된 실제 JSON 로드 완료 후 전체 정보의 네 카드가 갱신됨을 검사했다. 카드/설명 DOM identity, 카드 내부 열린 details와 키보드 포커스, 출처 링크 포커스를 유지했다.
- 잘못된 영웅 결과·누락은 숫자를 만들지 않는다. 기존 0/null·ID 교체·비동기 경합·캐시 테스트도 유지했다.
- `npm.cmd run build`, `npm.cmd run verify:pages`, 실제 preview 대상 `verify:pages -- http://127.0.0.1:5198` 통과. `/HOW/` 경로와 특전 JSON의 HTTP 200/MIME/파일 바이트를 검증했다.
- 실제 Chrome 320/375/390/430/1440px에서 전체 정보 자동 표시 → 특전 탭 표시를 확인했다. **네 meter 모두 Minor/Major의 기존 ability-card 안에 존재**하고 별도 footer에 통계 카드는 없다. 가로 넘침 0, JavaScript 오류 0.
- 390/1440px에서 지역·골드/마스터 이상/다이아 이상·부산/전체·빠른 대전/경쟁전·탭·아나 이동·뒤로 가기·새로고침을 확인했다. 같은 페이지 수명에서는 특전 JSON 1회, 새로고침 후 1회 추가이며 외부 OverLooker 요청은 0건이다.
- 특전 JSON은 브라우저 도구에서 가로채거나 fixture로 교체하지 않았다. 관련 없는 OverFast 응답은 기존 캡처를 사용했으며, 이는 그 제공처의 새로운 조건별 실측 검증이 아니다.
- 보호 대상 17개(원본 특전 JSON, 스냅샷/index, 메타/티어/HOT/필터/카운터/시너지/패치노트/매핑)는 SHA-256 불변이다. [검사](research/perk-card-integration/protected-files.json).
- `git diff --check`, `git status` 확인 완료. 실제 모바일 기기/iOS Safari/스크린리더는 미검증이다.

## 실제 화면

- [PC 1440px — Minor/Major 네 카드](research/perk-card-integration/qa/1440-perks.png)
- [모바일 390px — 네 카드 수치](research/perk-card-integration/qa/390-major.png)
- [320px — 전체 정보에서 자동 표시](research/perk-card-integration/qa/320-overview-cards.png)
- [390px — 간결한 출처](research/perk-card-integration/qa/390-source.png)
- [브라우저 측정 및 필터 전환](research/perk-card-integration/qa/results.json)

## 이번 변경 파일

- `src/controllers/routingController.js`: 상세 진입 자동 조회, Model 조합 결과 전달.
- `src/models/perkSelectionModel.js`: `perkCardsForDetail()` 순수 합성 함수.
- `src/views/heroDetailView.js`: 기존 카드 내부 바인딩과 출처 DOM 보존.
- `src/views/perkStatisticsView.js`: 검증된 항목 표시, 간결한 footer.
- `src/styles/detail.css`: 출처 패널 제거 및 footer 범위 CSS.
- `tests/perkStatistics.test.js`: Model/View 분리와 자동 조회 정책에 맞춘 기존 회귀 테스트.
- `tests/perkCardBinding.test.js`: 실제 JSON/216카드/지연 응답/포커스 검증.
- `scripts/qa-static-perks.cjs`: 전체 정보·특전 탭과 게임 모드를 포함한 실제 빌드 검증·스크린샷.
- 이 문서 및 `docs/research/perk-card-integration` 검증 자료.

기존 특전 JSON, 수집 스크립트, API 서비스, Meta v2/v2.1, 카운터·시너지 데이터에는 변경이 없다.
