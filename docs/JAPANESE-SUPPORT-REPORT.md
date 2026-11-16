# HOW 일본어 지원 및 최초 언어 선택

2026-11-16 로컬 구현·검증 완료. Commit·Push·Actions 활성화·배포는 수행하지 않았다.

## 구현

- ko / en / ja를 공통 `LANGUAGES`, `CATALOGS`, locale 표로 관리한다. 일본어 API locale은 `ja-jp`, 표시 locale은 `ja-JP`다.
- 일본어 사전은 **717키**로 한국어·영어와 정확히 대응한다. 기존 712키와 필터 그룹 등의 공통 문구 5키를 포함한다. 번역은 영웅 메타 티어·Meta Score 설명·HOT·필터·그래프·패치·파크·카운터·시너지·플레이어·즐겨찾기·오류·접근성 문구를 포함한다.
- 헤더의 기존 ARIA combobox에 지구본 SVG와 `Language`를 표시한다. 메뉴는 한국어 / English / 日本語이며 현재 선택을 ARIA와 선택 상태로 제공한다. 키보드 방향키·Enter·Escape·Tab을 유지한다.
- 최초 언어 우선순위는 **명시적 URL → 저장한 수동 선택 → navigator.languages의 지원 언어 우선순위 → navigator.language → English**다. 지원 언어가 하나도 없으면 English다. IP·접속 국가·위치 조회는 없다.
- `/HOW/`의 초기 경로는 기존 `history.replaceState` 방식으로 선택 언어의 `/tiers` 경로로 정규화한다. HTTP 리다이렉트·전체 새로고침·추가 히스토리를 만들지 않는다. 명시적 ko/en/ja URL은 저장값·브라우저와 달라도 해당 언어를 유지한다.
- 수동 변경만 `how:language:v1`에 저장한다. 수동 언어 변경은 `pushState`로 처리하고 기존 앱 모델·통계 서비스 인스턴스를 유지한다. 뒤로/앞으로 이동도 URL 언어에 맞게 갱신한다. 저장소 접근이 막혀도 현재 방문의 선택은 동작한다.
- 지역·등급·전장·역할·정렬·검색·즐겨찾기를 유지한다. 새로운 언어의 영웅 목록·상세 정보만 필요할 때 요청하고 locale별 메타데이터 캐시를 사용한다. 통계는 언어 전환을 이유로 다시 요청하지 않는다. 기존 TTL 만료·사용자 필터 변경에 따른 정상 갱신은 유지한다.
- 화면에 고정되어 있던 역할·지역·등급·지표 명칭은 표시 시 현재 언어를 읽도록 정리했다. 일본어 모바일 필터는 14px로 조정하여 긴 문구의 줄바꿈을 줄였고, 좁은 영어 헤더의 넘침도 수정했다. 기존 역할 아이콘·엠블럼·열 구조·다크 UI는 유지한다.

## 실제 일본어 메타데이터와 파크

실제 OverFast API에서 일본어 영웅 목록 **54명**, 영웅 상세 **54명**, 맵 목록 **59개**를 읽어 확인했다. API 원본 캡처는 `docs/qa/japanese/`에 있으며 통계 관측 스냅샷이 아니다. 이름·아비리티·배경 설명은 런타임에도 API의 현지화 데이터를 사용한다. 정적 SEO용 이름과 맵 표시는 `jaHeroNames.json`, `jaMapNames.json`에 보존했다.

기존 파크 연결은 한국어·영어 이름과 아이콘을 정확히 비교하므로 일본어 이름에서는 연결이 끊길 수 있었다. **216개 파크**에 대해 같은 영웅·단계·기존 아이콘에 유일하게 대응하는 일본어 이름을 확인해 `perkNamesJa.json`에 추가했다. 런타임에도 영웅·단계·이름·아이콘을 정확히 대조한다. 순서나 유사한 문자열로 추측하지 않는다. 이름·아이콘이 바뀌어 검증에 실패하면 기존처럼 매핑 확인 상태를 표시한다. 기존 파크 통계와 매핑 원본은 수정하지 않았다.

일본어 용어는 [Blizzard 일본어 패치노트](https://overwatch.blizzard.com/ja-jp/news/patch-notes/)와 [공식 일본어 로ール 소개](https://overwatch.blizzard.com/ja-jp/news/24246206/)의 タンク・ダメージ・サポート 및 パーク 표기를 참고했다. HOW의 패치 해설은 자체 번역이며 공식 번역문으로 표기하지 않는다. 일본어 화면의 공식 패치 링크는 일본어 공식 페이지로 연결한다.

## URL·SEO

- `/ja/tiers`, `/ja/meta`, `/ja/player-search`, `/ja/heroes/{key}`, `/overview`, `/abilities`, `/perks`를 기존 경로 구조로 지원한다. 프로젝트 base `/HOW/` 및 루트 배포를 그대로 지원한다.
- 3언어 **660개 정적 HTML 진입점**을 생성한다. 일본어 영웅 이름·제목·meta description·HTML lang을 반영한다.
- 모든 정적 페이지의 canonical과 ko/en/ja hreflang 경로를 검사했다. 언어 루트와 overview는 각각 tiers와 영웅 기본 페이지를 canonical로 사용하는 별칭이다.
- sitemap에는 별칭을 제외한 **495개 고유 URL**을 포함한다. abilities/perks 상세 하위 페이지도 포함한다.
- 개인 전적의 불투명 ID는 기존 player-search의 hash에 유지하고 `noindex, nofollow`를 유지한다. 명시적 언어 공유 링크를 다른 언어로 바꾸지 않는다.

## 테스트

| 검사 | 결과 |
|---|---|
| `npm test` | **306/306 통과**, 실패·스킵 0 |
| 번역 자동 검사 | ko/en/ja 키 일치, 빈 값·변수 자리 불일치·일본어/영어 값의 한국어 잔존 없음, View의 385개 t 호출 검사 |
| 실제 ja-jp API | 영웅 목록 54명·상세 54명·맵 59개 확인 |
| 파크 연결 | 216개 정확한 일본어 명칭 대응, 잘못된 이름은 연결 거부 |
| 통계 일관성 | 같은 Fixture에서 3언어 Meta Score·역할 순위·티어·HOT 후보 동일; 일일 ▲/▼/= 3언어 회귀 통과 |
| 일본어 브라우저 | **1440 / 768 / 390 / 320px** 통과 |
| 최초 선택 | ko-KR / en-US / ja-JP / fr-FR 기본값, 명시적 en URL 우선, 저장한 ko 선택 우선 **6사례 통과** |
| 수동 언어 전환 | ja→en→ko→ja 및 뒤로/앞으로 이동, 전체 새로고침 없음, 통계 추가 호출 없음 |
| 상태 유지 | Europe·Diamond 선택 후 역할·픽률순 정렬·검색어·즐겨찾기 유지, 전장 all 유지, 통계값 동일 |
| 일본어 기능 | 티어 목록·역할 3종·메타·그래프 3지표·아비리티·파크 4개 선택률·플레이어 검색/전적 검증 |
| 한국어·영어 브라우저 회귀 | **320 / 375 / 390 / 430 / 1440px**, 5환경 통과 |
| 접근성·레이아웃 | combobox 키보드·선택 상태, 역할/티어/통계 헤더 중심축, 역할명 잘림·가로 넘침 없음 |
| `npm run build` | 성공, 660진입점 생성 |
| `npm run verify:pages` | 성공, 정적 자산 15개 및 3언어 URL/SEO/인덱스 검사 |
| 기존 데이터 보호 | `public/data`, 자동 수집/게시 workflow, Meta Score·HOT 정책 파일 diff 없음 |

브라우저 검증은 **실제 일본어 API 메타데이터 캡처 + 기존 통계·플레이어 Fixture**를 사용했다. 과거 날짜의 통계나 실제 신규 관측을 생성하지 않았다. 테스트에서 만든 HOT 비교값은 메모리 안의 Fixture이며 저장·게시하지 않았다.

이전 회귀 시나리오는 언어 변경 시 전체 페이지 재진입으로 플레이어 검색 결과가 초기화될 것을 기대했다. 새 요구사항에 맞춰 검색 결과를 유지하는 기대값으로 별도 QA 래퍼를 만들었다. 기존 시나리오 원본은 보존했다.

증거: [일본어 브라우저 결과](qa/japanese/browser-results.json), [한국어/영어 회귀](qa/japanese/ko-en-regression/browser-results.json), [메타데이터 확인](qa/japanese/metadata-audit.json).

화면: [PC 목록](qa/japanese/1440-list.png), [모바일 언어 메뉴](qa/japanese/390-language.png), [모바일 파크](qa/japanese/320-perks.png), [모바일 그래프](qa/japanese/390-graph.png), [PC 플레이어 전적](qa/japanese/1440-player.png).

## 주요 변경 위치와 재검증

- `src/i18n/{ja,extras,i18n,languageView,routes,seo}.js`, 기존 ko/en 사전: 사전·locale·초기 선택·전환·SEO.
- `src/main.js`, `heroController.js`, `routingController.js`: 모델과 서비스 인스턴스를 유지하는 locale 갱신, 오래된 메타데이터 응답 차단.
- 표시용 역할·필터·맵·지표 getter 및 콤보박스·상세·패치 View: 라이브 전환과 일본어 표시. 점수 계산식은 변경하지 않는다.
- `src/data/{jaHeroNames,jaMapNames,perkNamesJa}.json`, `perkSelectionModel.js`: 검증된 현지화 명칭. 통계 저장 구조는 변경하지 않는다.
- `scripts/render-localized-pages.js`, `scripts/verify-pages.js`, `scripts/audit-i18n.js`: 3언어 정적 생성 및 완전성 검사.
- `tests/japanese.test.js`, 기존 header/dailyRank 테스트, `scripts/qa-japanese*.cjs`: 3언어 기능·상태·회귀 검증.

```text
npm.cmd test
npm.cmd run build
npm.cmd run verify:pages
node scripts/audit-i18n.js
node scripts/qa-japanese.cjs
node scripts/qa-japanese-ko-en.cjs
```

일본어 메타데이터 API의 응답 실패/현지화 미제공에는 기존 오류·재시도 정책을 적용한다. 새 파크 이름·아이콘이 바뀌면 일본어 명칭 대응도 재검토해야 한다. 기존 그래프 스냅샷·자동 수집·Meta Score·HOT 기준은 변경하지 않았다. 일본어 운영 공개에는 별도 언어 서비스나 비밀키가 필요 없으며, **사용자 승인 후 코드 반영과 기존 Pages 빌드·게시**가 필요하다. 실제 운영 배포는 이번 검증에 포함하지 않았다.
