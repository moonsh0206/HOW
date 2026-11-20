# Dashboard Visual Polish 2 — 2026-11-20

최신 로컬 미커밋 변경 위에서 정렬·표시 모션만 수정했다. Meta Score, 티어/HOT 기준, 통계 수치, API/캐시/스냅샷, 라우팅과 원본 인트로 SVG는 변경하지 않았다. Commit·Push·배포하지 않았다.

## 원인과 수정

### 주목 영웅/HOT 카드

기존 PC 스타일은 일반 카드의 한 열 Grid를 상속했고, 좁은 화면에서만 영웅/점수 위치가 명시되어 있었다. 설명 제거 후 추가된 `grid-template-rows:auto 1fr`도 남은 높이를 두 번째 행에 몰아주었다. 아우라·홀로그램은 이미 절대 배치되어 있었으며 원인이 아니었다.

이제 카드에 두 열과 명시적인 제목/영웅/점수/보조 행을 지정하고, 행 묶음을 수직 중앙 정렬한다. 점수는 제목과 영웅의 두 행을 걸친다. 초상화는 명시적 크기로 카드 왼쪽에 부분 노출하고 기존 feather mask를 유지한다. 티어 마크는 레이아웃 크기를 명시했다. 위치를 `translateY(-10px)`로 보정하지 않았다.

PC 카드 높이는 128px을 유지한다. 390px 일반 주목 카드는 80px에서 약 78.3px로 줄었다. HOT의 두 상승폭과 비교 시각은 별도 보조 행에 유지하며, 긴 시각은 한 줄로 표시하고 전체 내용은 title과 DOM 텍스트에 남긴다. 1200–1399px에서는 META 라벨을 숫자 위로 배치해 긴 일본어 이름과 공간을 나눈다. Meta Score 숫자 자체의 글꼴·수치·마그마 효과는 그대로다.

1440px에서 제목+영웅 묶음과 점수의 중심 차이는 약 21.74px에서 0.01px 이내로 개선됐다. 모바일의 기존 중심 정렬은 유지했다.

### 상단 검색

이전에는 검색 폼이 오른쪽 세 번째 Grid 열에 있었다. 이제 `1fr / 검색 폼 / 1fr`의 대칭 열을 사용한다. 왼쪽에는 META 라벨과 제목, 오른쪽 끝에는 일시정지 버튼을 배치한다. 제목은 남은 공간 안에서 자연스럽게 줄바꿈한다. 1050px 이하에서는 제목 아래 독립 행에 검색 폼을 중앙 배치한다. 모바일 입력·검색 버튼은 44px 터치 영역을 유지한다.

수평 기준은 viewport가 아니라 실제 대시보드 heading의 콘텐츠 영역이다. 1440px 검색 중심 오차는 +454.5px에서 0px로 바뀌었다. 모바일은 원래 중심 오차 0px였으며 유지했다. 21개 크기·언어 조합에서 오차 1px 미만과 가로 넘침 없음을 검사한다.

### 제목 등장

`dashboardTitleMotion.js`가 대시보드 방문 상태를 관리한다. 인트로의 `how-brand-intro-active`가 제거되고 실제 루트가 연결·표시된 뒤 두 RAF를 거쳐 시작한다. 기존 인트로 타임라인·세션·건너뛰기는 재구현하지 않았다.

- META 라벨: 500ms, 6px fade-up.
- 제목: 620ms, 10px fade-up, 라벨보다 90ms 뒤 시작.
- easing: `cubic-bezier(0.22,1,0.36,1)`.
- API 갱신·필터·언어 변경에서는 반복하지 않는다. 다른 메뉴에서 새로 들어오면 재생한다.
- Reduced Motion, 애니메이션 미지원에서는 즉시 표시한다. 이탈 시 RAF/애니메이션을 취소하고 준비용 숨김 클래스를 제거한다.

실제 Chrome에서 인트로 종료 전 제목 시작이 0회였고, 시작 opacity 0/translateY 10px → 중간 opacity → 최종 opacity 1/transform none을 확인했다. 건너뛰기, 내부 복귀, 새로고침, Reduced Motion도 별도 검사했다.

### 전장 전환

`dashboardMapMotion.js`는 표시만 담당한다. API 요청과 이전 응답 거부는 기존 컨트롤러를 유지한다.

1. 선택 직후 기존 카드 높이를 보존한다. 이전 내용은 0.55 opacity로 유지하되 기존 전장명을 명시하고 링크를 inert 처리한다.
2. 선택한 이미지의 load/decode를 준비한다. 무한히 기다리지 않도록 이미지 대기는 800ms로 제한한다. 이 시간은 API 타임아웃이 아니다.
3. 이미지 준비 후 기존 내용이 170ms 동안 opacity 0, translateY -4px로 퇴장한다. 최종 퇴장 상태를 유지해 다시 나타나는 깜빡임을 막는다.
4. 같은 전장 기준의 이름·영웅 목록을 함께 교체하고 320ms, 5px fade-up 한다. 준비된 두 이미지는 320ms crossfade한다.
5. 이미지 실패는 기존 fallback을 사용한다. 늦은 이미지가 도착해도 현재 전장/세대가 일치할 때만 표시한다.

빠른 선택, 이탈, Reduced Motion 변경 시 기존 애니메이션·대기 타이머를 취소한다. `transitionend`에 의존하지 않는다. Reduced Motion 변경 후 이미 옮겨진 DOM 노드가 비어 버리지 않도록 노드 목록도 재사용한다.

브라우저의 로딩/퇴장/등장/완료 프레임에서 맵 카드 높이는 390px에서 **443.5px**, 1440px에서 **295.39px**로 일정했다. 등장 중 두 실제 이미지의 opacity가 각각 약 0.31/0.69로 겹쳐 있는 상태를 기록했다.

## 화면과 기록

| 화면 | 이전 | 이후 |
|---|---|---|
| 390px | [이전](qa/dashboard-polish2/before/390-ko.png) | [이후](qa/dashboard-polish2/after/390-ko.png) |
| 1440px | [이전](qa/dashboard-polish2/before/1440-ko.png) | [이후](qa/dashboard-polish2/after/1440-ko.png) |

[타이틀 시작](qa/dashboard-polish2/motion/after/1440-title-0.png) · [중간](qa/dashboard-polish2/motion/after/1440-title-180.png) · [완료](qa/dashboard-polish2/motion/after/1440-title-450.png)

[전장 퇴장](qa/dashboard-polish2/motion/after/390-map-exit.png) · [crossfade/등장](qa/dashboard-polish2/motion/after/390-map-enter.png) · [완료](qa/dashboard-polish2/motion/after/390-map-final.png)

[반응형 측정](qa/dashboard-polish2/after/measurements.json) · [실제 시간별 DOM/opacity 기록](qa/dashboard-polish2/motion/after/results.json) · [진입/건너뛰기/새로고침](qa/dashboard-polish2/entry/after/results.json)

## 검증 및 범위

- 전체 테스트: **378 통과**, 실패/스킵 0. 기존 374개 유지, 모션 회귀 테스트 4개 추가.
- 프로덕션 빌드 성공, 663개 언어별 정적 HTML 유지. 기존 500KB 번들 경고는 남아 있다.
- Pages `/HOW/` 검증 및 `git diff --check` 성공.
- Chrome: 320×700, 360×800, 390×844, 430×932, 1366×768, 1440×900, 1920×1080 × 한국어/영어/일본어.
- 390/1440px: 인트로 동기화, 타이틀 중간 상태, 전장 퇴장/교체/crossfade, 빠른 선택, 503/이미지 실패/빈 응답, 언어 전환 시 재생 안 함, Reduced Motion, 검색어 전달 확인.
- 별도 진입 검사: 건너뛰기, 메뉴 복귀, 같은 탭 새로고침, Reduced Motion에서 최종 내용 표시.

브라우저 기본 데이터는 저장된 실제 응답을 재생했다. 전환 스트레스 검사에서는 부산 응답을 다른 전장 선택에도 재생한 **명시적인 모션용 제어 fixture**를 사용했다. 따라서 왕의 길/일리오스의 현재 실제 영웅 순위를 검증했다고 주장하지 않는다. 전장 이미지는 제공처의 해당 전장 이미지를 사용했고 crossfade 검사는 브라우저 캐시를 미리 준비했다. 운영 JSON을 생성/변경하지 않았다. 통계의 조건 정합성·정밀도·캐시·이전 응답 거부는 기존 전체 회귀 테스트로 검증했다.

## 이번 수정 파일

- `src/views/metaDashboardView.js` — 제목 묶음, 기존 콘텐츠 생성과 모션 분리.
- `src/views/dashboardTitleMotion.js` — 새 진입 모션 관리자.
- `src/views/dashboardMapMotion.js` — 새 전장 표시 전환 관리자.
- `src/controllers/metaDashboardController.js` — 기존 활성 상태를 제목 관리자에 전달.
- `src/styles/panelEffects.css` — HOT 정렬, 대칭 검색 Grid, 전환 레이어와 수치 정렬.
- `src/i18n/dashboard.js` — 이전 전장 표시 3개 언어.
- `tests/dashboardPolishMotion.test.js` — 타이틀/이전 전장/경합/이미지/Reduced Motion/정리 4개 테스트.
- `scripts/qa-dashboard-polish2.cjs`, `qa-dashboard-polish2-motion.cjs`, `qa-dashboard-polish2-entry.cjs` 및 이 보고서/검증 자료.

기존 네온 프레임, 메달리온, 삼각 면광, TOP 카드 5.5초 순환과 520ms 슬라이드, 아우라/마그마, 공통 헤더·푸터, 다른 화면의 미커밋 변경은 보존했다. 새로운 라이브러리나 장식을 추가하지 않았다. 물리 모바일 기기/녹화 검증 대신 Chrome의 연속 프레임과 실제 애니메이션 상태를 기록했다.
