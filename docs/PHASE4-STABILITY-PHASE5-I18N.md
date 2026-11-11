# Phase 4 안정화 / Phase 5 한국어·영어

## 1. 로컬 조사 및 Phase 4

기존 상세 조회는 playerId로 summary를 요청한 뒤 성공해야 competitive stats/summary를 요청했다. 닉네임 재검색은 하지 않았다. URL별 메모리 캐시와 진행 중 Promise 공유가 있었고 요청당 제한은 15초였다. summary 실패가 경쟁전 통계의 시작도 막았으며 오류 상태도 하나였다.

실제 공개 응답에서 Age 723초, Cache-Control max-age=600, x-cache-ttl=600을 확인했다. 기존 TTL 계산은 이 경우 즉시 만료되므로 재조회 요청이 반복될 수 있었다. 이 사실이 모든 간헐적 타임아웃의 제공처 원인을 입증하지는 않는다.

구현:

- summary와 경쟁전 통계를 병렬로 시작하고 로딩·오류·성공 상태를 따로 유지한다. 정상 도착한 부분은 즉시 표시한다.
- 저장된 이름·아이콘과 검증된 이전 summary/rank가 있으면 먼저 표시한다. 이전 정보임을 명시하며 실패해도 즐겨찾기를 삭제하지 않는다.
- 즐겨찾기에 작은 선택적 profile 필드를 추가했다. 기존 저장 키와 이전 레코드는 호환된다. 경기별 기록을 영구 저장하지 않는다.
- 상세 조회의 timeout 또는 HTTP 500/502/503/504는 최대 한 번, 1초 대기 후 재시도한다. 15초 제한 자체는 늘리지 않았다. 429, 비공개, 잘못된 응답, 일반 네트워크 오류는 자동 재시도하지 않는다. Retry-After 또는 제공처 retry_after가 있으면 자동 재시도 대신 기존 cooldown을 따른다.
- 카드와 상세의 요청을 공유하며, 카드에서 먼저 시작한 요청도 상세 진입 시 제한 재시도 요구를 공유할 수 있다.
- 제공처 Age가 TTL 이상이면 stale로 표시하고 30초만 재사용해 반복 요청을 억제한다. 이를 최신 원본 통계라고 표시하지 않는다.
- generation 검사로 다른 플레이어/메뉴 이동 후 도착한 응답을 무시한다. 수동 재시도 버튼을 유지한다.
- 외부 이미지가 제거되면 제목이 아바타 열로 밀리던 문제를 발견해 제목을 두 번째 그리드 열에 명시했다.

실제 API: TeKrop-2217의 summary, PC competitive stats/summary 모두 HTTP 성공. 최종 확인은 2회 호출, 각각 약 986ms/1084ms였다. Age 1777초를 stale로 기록했고 즉시 반복 조회는 캐시로 처리됐다. 서버 원본 집계 마감 시각은 확인하지 못했다. `docs/qa/phase5/live-player.json` 참고.

## 2. 번역 계층 및 화면

- src/i18n/i18n.js: URL 언어 > 저장된 선택 > 브라우저 언어 우선순위. 한국어 브라우저는 ko, 나머지는 en. HTML lang과 Intl 날짜 로케일을 설정한다.
- ko.js/en.js와 common.js/templates.js/matchups.js/patches.js에서 현재 UI, 템플릿, 독립 작성 상성 이유, 패치 요약을 관리한다. 현재 702개 키, View 374개 키 호출을 검사한다.
- 헤더 언어 선택을 추가했다. 영웅/플레이어 식별자는 번역하지 않는다. 선택 언어는 how:language:v1에 저장한다.
- 영웅 목록·상세 API는 ko-kr/en-us를 사용하며 메타데이터 캐시는 locale 또는 locale:heroKey로 나뉜다. 통계 쿼리에는 locale을 넣지 않는다.
- 언어 변경은 같은 페이지로 문서 탐색한다. 필터·역할·검색·정렬과 유효한 현재 통계를 sessionStorage로 일회 전달한다. 유효기간이 지난 통계는 전달해 최신으로 가장하지 않는다. 문서가 바뀌므로 이전 언어의 늦은 응답은 새 화면을 덮어쓰지 않는다.
- 현재 코호트 외 메모리 캐시는 문서 탐색 후 유지되지 않는다. 세션 저장이 차단되면 전달에 실패할 수 있으나 앱은 동작한다. 기존 필터/즐겨찾기 저장도 그대로 사용한다.
- 특전은 번역된 배열 순서로 합치지 않는다. 기존 tier+icon+정확한 검증 이름 매핑에 providerName의 영어 이름을 허용한다. 모호하면 기존 매핑 검토 상태를 유지한다.
- 실제 영어 영웅 목록 54명과 겐지 상세를 조회했다. 공식 패치 변경 65건의 English evidence ID가 실제 공식 영문 HTML 후보와 모두 일치했다. 원본 JSON은 수정하지 않고 별도 번역만 연결했다.

## 3. 승인된 URL 구조

사용자가 공개 경로 정적 생성 + 개인 프로필 해시 유지를 선택했다.

| 구분 | Pages 예시 |
|---|---|
| 티어리스트 | /HOW/ko/tiers, /HOW/en/tiers |
| 메타픽 | /HOW/ko/meta, /HOW/en/meta |
| 영웅 | /HOW/en/heroes/genji 및 overview/abilities/perks |
| 플레이어 검색 | /HOW/en/player-search |
| 개인 프로필 | /HOW/en/player-search#/players/{encodedPlayerId} |

공개 탐색은 History API를 사용한다. 구 #heroes, #favorites, #/heroes/... 등의 북마크도 지원한다. 개인 playerId를 재검색하거나 새 ID로 만들지 않는다. 임의 개인 프로필의 깨끗한 /players/{id} 경로는 제공하지 않는다. 이를 원하면 서버 재작성 지원 호스팅이 필요하다. 404 응답을 정상 200인 것처럼 숨기는 방식은 사용하지 않았다.

`npm run build`는 Vite 뒤에 render-localized-pages.js를 실행해 440개 공개 HTML 진입점을 생성한다. 통계값은 정적 HTML에 넣지 않는다. 이름·제목·설명 및 언어별 링크를 제공하고 통계는 기존 API로 표시한다.

`VITE_BASE_PATH=/`는 독립 도메인용이다. canonical, hreflang, sitemap과 robots의 origin은 `VITE_SITE_ORIGIN`으로 설정한다. 기본값은 현재 저장소의 Pages 주소 `https://moonsh0206.github.io`이다. 개인 프로필은 runtime noindex,nofollow이며 sitemap에서 제외한다. 이것은 접근 제어를 대신하지 않는다.

공식 호스팅 문서: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site

## 4. 검증

- 전체 회귀 테스트: 253개 통과. 기존 테스트를 삭제하지 않았다. 새 빌드 단계가 추가된 만큼 격리된 패치 자동화 빌드 테스트도 동일 정적 생성 단계를 실행한다.
- 번역: 양 언어 키/placeholder 일치, View 미추출 문자열·누락 키 0, 현재 검토된 패치 요약·하위 역할 효과 범위 검사.
- 수식: 동일 통계에서 이름을 변경해도 Meta Score, roleRank, tier가 동일함을 확인했다. 운영 가중치/정책/스냅샷 원본은 변경하지 않았다.
- Phase 4: timeout, 느린 summary, 429, 503, 504, 제한 재시도, 중복 요청, stale 재사용, 기존 이름·등급 보존, 화면 이동 경합 검사.
- Chrome: fallback 없는 정적 서버에서 320/375/390/430/1440px. 공개 직접 접근 HTTP 200, 새로고침, 뒤로/앞으로, 레거시 해시, URL 언어 우선, 언어 변경 시 현재 통계 재요청 없음, 프로필 ID/즐겨찾기 유지, 개인 noindex, 가로 넘침 0 확인.
- 390px에서 지연된 영어 응답 후 한국어 이동, 느린 summary 전에 경쟁전 데이터 표시도 확인했다. 외부 이미지 실패 상황에서 닉네임 폭도 검사했다.
- 브라우저는 저장된 실제 통계와 캡처된 실제 메타데이터/플레이어 응답을 사용했다. 별도로 실제 API 소량 조회를 수행했으며 모의 응답을 운영 JSON으로 복사하지 않았다.
- npm run build, npm run verify:pages, git diff --check 통과. 실제 Pages 배포, 별도 도메인 운영, 실제 모바일 기기 및 장기 네트워크 관측은 미검증이다.

스크린샷·JSON·로그: docs/qa/phase5/. 최종 browser-results.json은 실제 검사한 너비와 항목을 담는다.

## 5. 변경 범위 및 유지보수

주요 변경: src/i18n/*, src/main.js, hero/player/routing Controller, hero/heroDetail/player Provider, 표시용 Model 라벨·특전 매핑·즐겨찾기 저장, 각 View 번역 호출, navigation.css와 프로필 제목 CSS, package.json build, render-localized-pages.js, verify-pages.js, audit-i18n.js, qa-phase5.cjs 및 관련 테스트.

새로운 공식 패치나 데이터 문구는 영어 자체 요약 검토가 필요하다. 미등록 데이터 문구는 원문을 보존하며 번역을 만들어내지 않는다. 기존 자동 수집/게시를 번역 준비만으로 차단하지 않도록 검토 기준 자료의 번역 범위와 미래 패치 허용 테스트를 분리했다. 54명 전체의 영어 기술·특전을 실시간으로 대량 조회한 것은 아니며, 겐지 외 영웅은 선택 시 API 언어 응답과 안전한 매핑 검사를 사용한다.

Commit/Push/PR/배포/워크플로 활성화는 수행하지 않았다. public/data, src/domain, .github 원본에는 이번 작업의 변경이 없다.

### 코드 파일 목록

- `src/i18n/`: i18n.js, ko.js, en.js, common.js, templates.js, matchups.js, patches.js, routes.js, languageView.js, seo.js
- `src/main.js`
- `src/controllers/`: heroController.js, routingController.js, playerSearchController.js
- `src/services/`: heroService.js, heroDetailService.js, overfastPlayerProvider.js
- `src/models/`: heroModel.js, statisticsModel.js, mapModel.js, playerModel.js, perkSelectionModel.js
- `src/storage/playerFavoritesStorage.js`
- `src/styles/`: navigation.css, player.css
- `src/views/`: compactMainView.js, compactText.js, counterView.js, filterCombobox.js, filterOptions.js, heroDetailView.js, heroPatchView.js, heroView.js, insightView.js, mapStatisticsView.js, patchNoteView.js, perkStatisticsView.js, pickHistoryView.js, playerCardRanksView.js, playerRankView.js, playerSearchView.js, statisticsUI.js, synergyView.js, tierReasonView.js
- `scripts/`: render-localized-pages.js, audit-i18n.js, qa-phase5.cjs, verify-pages.js
- `tests/`: i18n.test.js, playerStability.test.js, patchAutomation.test.js
- `package.json`

별도 보고서·QA 스크린샷/응답/로그가 추가되었다. git-status.txt에는 앞선 작업부터 존재한 미커밋 파일도 포함되므로 위 목록과 구분한다.

실제 사용한 플레이어 API는 `/players/TeKrop-2217/summary`, `/players/TeKrop-2217/stats/summary?gamemode=competitive&platform=pc`이다. 즐겨찾기 상세 진입을 위해 `/players?name=...`를 다시 호출하지 않는다.
