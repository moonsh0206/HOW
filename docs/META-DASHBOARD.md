# HOW 메타 대시보드 구현 및 검증

2026-11-18 기준 로컬 구현. Commit·Push·배포·워크플로 변경은 수행하지 않았다. 작업 시작 시 로컬 Git 상태는 깨끗했으며 원격 코드를 가져오거나 덮어쓰지 않았다.

## 화면과 경로

기본 진입을 새 대시보드로 변경했다. 헤더·모바일 메뉴는 **대시보드 / 영웅 통계 / 전적 검색**이다.

- `#/dashboard`, `/ko/dashboard`, `/en/dashboard`, `/ja/dashboard`.
- `/HOW/` 및 언어 루트는 언어를 결정한 뒤 대시보드로 진입한다.
- `#/tiers`, `#heroes`, `#favorites`, 영웅 상세·하위 탭, 플레이어 검색·개인 해시 경로는 유지한다.
- 기존 `#/meta`도 유지하고 대시보드에서 ‘현재 메타픽 보기’로 연결했다. 기존 데스크톱·모바일의 메타 화면 배치 정책은 그대로다.
- 대시보드에서 연 영웅 상세의 복귀 링크와 브라우저 뒤로 가기는 대시보드로 돌아온다. 목록별 스크롤 보존 로직을 대시보드에도 적용했다.
- 언어별 dashboard 정적 HTML·canonical·hreflang·sitemap을 추가했다. 총 공개 진입 HTML은 660개에서 **663개**다. 개인 프로필의 noindex 및 해시 정책은 유지한다.

시안 이미지는 이번 첨부에 없었다. 문서의 배치와 비교하면 PC에서는 상단 4카드, 중앙 순위/추이 2열, 하단 카운터/전장/최근 변화 3열로 구성했다. 이미지와 픽셀 단위 비교를 했다고 주장하지 않는다. 밝은 카드 대신 기존 HOW 네이비 표면·오렌지 포인트·공통 토큰을 사용했다.

## 실제 데이터와 선정 기준

| 영역 | 출처·계산 |
| --- | --- |
| 역할별 픽률 1위 | 현재 공통 필터의 동일 통계에서 역할별 실제 픽률 내림차순. 결측·검토 기록 제외, 동률은 heroKey. Meta Score 1위와 구분 |
| 급상승 | 기존 `hotHeroes()` 그대로 사용. 출처·조건·패치·집계창·1~7일 간격·품질 검증을 통과한 HOT v2 후보 |
| 주목할 영웅 대체 | 유효한 HOT가 없으면 현재 HOW 기본 티어순 선두를 표시. ‘상승을 뜻하지 않음’과 대체 기준 명시 |
| 순위 | 기존 추천 그룹 → Meta Score → 기존 이름/키 동률 처리. 원래 모델의 정렬 함수를 순수 비교 함수로 공유. 최대 6명 |
| 등락 | 역할별 화면만 기존 rank archive/legacy snapshot 검증을 재사용. 전체 역할 또는 유효하지 않은 비교에서는 표시하지 않음 |
| 역할별 추이 | 기존 SnapshotService의 7일/30일 조회. 현재 역할 분류의 전체 구성원이 유효한 경우 영웅 승률의 **단순 평균**. 경기 수 가중 평균이나 역할 전체 경기 승률로 표기하지 않음 |
| 일별 대표 | KST 날짜별 마지막 호환 관측. 동일 조건·출처/파생 버전·패치/집계창을 검증. 결측/날짜 공백은 선으로 연결하지 않음. 부족한 기록을 보간하지 않음 |
| 상대 대응 | 기존 CounterService의 5v5 수동 검토 관계와 이유. 대응 승률을 생성하지 않고 영웅 상세의 근거로 연결 |
| 전장 대표 | 기본 부산, 공통 콤보박스로 실제 지원 전장 선택. 공통 지역·등급·모드 + 해당 전장의 역할별 픽률 1위. 전장별 HOW 티어/승률 순위로 오해하지 않게 기준 명시 |
| 최근 변화 | 기존 HOT의 호환성 검증이 통과한 현재/이전 관측에서 유효한 승률·픽률·밴률의 원본 차이를 계산. 절대 변화량 순 최대 3건, 이전→현재 값과 %p 표시 |

승률·픽률·밴률 및 Meta Score 계산·반올림 정책은 변경하지 않았다. 모든 사용자 입력과 API 이름은 textContent 기반으로 렌더링한다.

### 실제 API 확인

기존 StatisticsService로 아시아 / PC / 경쟁전 / diamond_plus의 전체 전장과 부산을 조회했다. 두 조건 모두 **54명** 응답을 확보했다. 총 원본 요청은 diamond/master/grandmaster × 전장 2개 = **6회**다.

저장 위치는 검증 자료인 `docs/qa/meta-dashboard/live-capture.json`(116,094 bytes)이며 운영 스냅샷이나 인덱스에 추가하지 않았다. 실제 조회 시각·캐시 정보와 원본 구성 등급도 이 자료에 있다.

| 실제 응답, 표시 정책 1자리 | 돌격 | 공격 | 지원 |
| --- | --- | --- | --- |
| 전체 전장 픽률 1위 | 윈스턴 14.4% | 캐서디 30.2% | 키리코 43.1% |
| 부산 픽률 1위 | 윈스턴 16.0% | 트레이서 32.6% | 키리코 43.2% |

## 데이터가 부족한 영역

기존 저장 스냅샷의 마지막 실제 배치는 11월 6일이다. 11월 18일 기준 최근 7일에는 유효한 추이가 없다. 기본 diamond_plus의 최근 30일도 실제 합성 배치가 1개여서 선을 그리지 않는다. ‘유효한 날짜별 관측 부족’을 표시한다.

이번 실제 현재 관측과 1~7일 간격의 호환 기준도 없으므로 HOT와 최근 변화는 임의 생성하지 않는다. 네 번째 상단 카드는 설명된 ‘주목할 영웅’ 대체이며, 최근 변화는 빈 상태다.

전장 이미지 자산은 새로 찾거나 다운로드하지 않았다. 전장명·기존 영웅 초상화·실제 통계로 구성했다.

## 재사용·상태·요청

- 하나의 HeroModel, StatisticsService, SnapshotService, CounterService를 공유한다.
- 기존 공통 통계 필터 DOM을 대시보드의 host로 옮긴다. 네이티브 select/change bridge·createFilterCombobox·등급 엠블럼·그룹 전장·키보드 조작은 그대로다. ID나 이벤트를 중복 생성하지 않는다.
- 순위 역할과 이력 기간은 대시보드 로컬 상태다. 기존 전체 목록의 역할·검색·즐겨찾기·정렬은 임시 변경하지 않는다.
- 역할 변경은 추가 API 요청 0회. 기간 변경은 정적 이력만 읽는다. 새 전장은 기존 서비스의 동시성 3·캐시·동일 요청 공유·실패 backoff를 따른다. diamond_plus의 새 전장은 최대 3개 원본 요청, 같은 조건은 캐시/진행 요청을 재사용한다.
- 대시보드 비활성 시 새 조회를 시작하지 않는다. 다른 조건으로 이동한 이전 응답은 generation과 요청 키로 차단한다. 전장·추이 실패는 독립적이며 현재 카드 표시를 막지 않는다.
- 그래프는 SVG 고정 축과 레이블, clip reveal 520ms, 포인트 220ms 지연/240ms fade다. 기존 ease-out 방향을 사용하고 빠른 교체·화면 이탈 시 취소한다. Reduced Motion에서는 즉시 표시한다.

## 수정 파일

신규:

- `src/controllers/metaDashboardController.js`
- `src/models/metaDashboardModel.js`
- `src/views/metaDashboardView.js`
- `src/views/dashboardHistoryView.js`
- `src/styles/dashboard.css`
- `src/i18n/dashboard.js`
- `tests/metaDashboard.test.js`
- `scripts/qa-meta-dashboard.cjs`
- 이 문서와 `docs/qa/meta-dashboard/` 검사 자료

기존 연결 수정:

- `index.html`, `src/main.js`
- `src/controllers/routingController.js`, `src/controllers/heroController.js`
- `src/models/heroModel.js` — 기본 정렬의 비교 함수를 공유, 계산/순위 정책 변경 없음
- `src/views/mainMenuView.js`, `src/views/heroDetailView.js` — 메뉴 활성 및 대시보드 복귀 문구
- `src/i18n/{ko,en,ja,routes,seo}.js`
- `scripts/render-localized-pages.js`, `scripts/verify-pages.js`
- `tests/{headerUI,i18n,mainMenus}.test.js` — 새 기본 경로의 의도된 기대값과 기존 경로 보존 검증

## 검증

- 전체 `npm.cmd test`: **341개 통과**, 실패·생략 0.
- 최종 복귀 문구 포함 관련 집중 테스트: **22개 통과**.
- `npm.cmd run build`: 성공, 663개 정적 진입점.
- `npm.cmd run verify:pages`: `/HOW/` 기준 자산·정적 URL 검증.
- `git diff --check`: 통과. LF/CRLF 안내 경고는 남아 있다.
- 원본 통계·그래프·HOT·특전·카운터·전적 검색 회귀 테스트 보존. `public/data`, 이미지와 `.github/workflows`는 수정하지 않았다.

### 실제 Chrome

320 / 390 / 430 / 768 / 1024 / 1280 / 1440px × 한국어·영어·일본어 **21개 조합** 통과. 가로 넘침 0, JavaScript 페이지 오류 0.

기본 진입·대시보드 직접 URL·새로고침, 공통 필터 노드 1개, 역할 선택, 7→30일, 콤보박스 키보드, 전체 통계 이동, 영웅 상세·뒤로 가기, 기존 플레이어 검색→상세 흐름을 검사했다. 브라우저 API 응답은 위 실제 수집 응답을 재생했으며, 지도 응답이 없는 조건은 오류 처리했다. 가짜 운영 통계로 대체하지 않았다.

최종 390 / 1440px 추가 검사에서는 실제 언어 선택기로 영어→일본어→한국어 전환 후 역할·기간·현재 dashboard 경로 보존과 통계 API 추가 요청 0회를 확인했다. 지역을 유럽으로 바꿨을 때 지도 조회 실패를 별도로 표시하고, 아시아로 복귀하면 정상 캐시 자료를 복원했다. 전장 팝업의 키보드 포커스와 위/아래 배치도 확인했다.

별도 그래프 양성 검사는 ‘TEST FIXTURE — NOT OPERATIONAL DATA’를 표시한 고립 화면으로 수행했다. 320 / 390 / 1440px × 일반/Reduced Motion **6개 조합**에서 시작·중간·완료의 실제 animation state/transform/opacity와 빠른 교체를 검사했다. 이는 실제 운영 이력이 확보되었다는 뜻이 아니다.

### 화면과 결과

- [PC 1440px 대시보드](qa/meta-dashboard/1440-ko-dashboard.png)
- [모바일 390px](qa/meta-dashboard/390-ko-dashboard.png)
- [일본어 320px](qa/meta-dashboard/320-ja-dashboard.png)
- [영어 1280px](qa/meta-dashboard/1280-en-dashboard.png)
- [21개 검사 결과](qa/meta-dashboard/results.json)
- [최종 언어·지역·캐시·포커스 추가 검사](qa/meta-dashboard/results-quick.json)
- [실제 API 수집 자료](qa/meta-dashboard/live-capture.json)
- [그래프 양성 테스트 결과](qa/meta-dashboard/chart-fixture-results.json)

## 남은 제한

최근 추이·변화 표시를 채우려면 기존 수집 정책에 따른 실제 관측이 더 필요하다. 이번 작업에서 자동화나 과거 기록을 생성하지 않았다. 실제 시안 이미지가 추가되면 배치의 시각적 비교를 더 할 수 있다. 기존 500kB 번들 경고는 남아 있으며, 별도 코드 분할 작업은 수행하지 않았다.
