# PC·모바일 반응형 디자인 통일

작업일: 2026-11-09. 현재 로컬 미커밋 변경을 유지하고 UI 표현만 수정했다.

## 변경 내용과 원인

`detail.css`에는 700px 이하에서 summary를 1열 Grid로 바꾸는 규칙과 다시 flex column으로 바꾸는 규칙이 중복되어 있었다. 이 규칙 및 이에 종속된 열 너비/순서 규칙을 제거했다. PC는 기존 1.65:1 비율을 유지하고, 768px 이하에서는 1.15:1 Grid로 유지한다. 화면 확대/축소나 가로 스크롤, 고정 높이, 내용 숨김은 사용하지 않았다.

좁은 왼쪽 열은 티어·승률·픽률·밴률을 2×2로 배치하고, 오른쪽 열의 카운터·시너지 초상화는 2열로 줄바꿈한다. 영웅명·이유·출처·패시브는 삭제하지 않는다. 지표 버튼, 즐겨찾기, 이유 및 관측 정보 펼치기는 44px 이상의 터치 영역을 유지한다. 본문은 12px 이상으로 유지했다. 오른쪽의 최근 패치→카운터→시너지→지속 능력 순서는 그대로다.

상세 배너는 화면별 별도 이미지 source 선택을 없애 같은 xl+ 아트워크를 사용한다. 원래 비율의 cover 크롭과 동일한 오버레이를 사용한다. 모바일 배너의 과도한 상단 padding을 줄였다. 고해상도 배경을 공통 사용하므로 모바일 다운로드 용량은 기존 작은 이미지보다 늘어날 수 있다. 향후 같은 구도의 최적화 이미지가 확보되면 srcset을 적용하는 것이 좋다.

메인 배너의 모바일 전용 오버레이와 특수 배경 크기를 정리해 PC와 같은 이미지·중앙 초점·색상 체계를 사용한다. 모바일에서도 영어 eyebrow를 표시한다. 제목·강조색·CTA는 유지한다. 메인 리스트는 모바일 카드 padding 10→9px, 간격 7→6px, 지표 숫자 13→14px로 조정하고 즐겨찾기 요약 여백을 줄였다. 기존 압축된 5개 인사이트 및 패치노트의 모바일 DOM 순서를 재사용한다.

그래프의 현재값·축·관측점 접근성 이름·툴팁·표를 한 자리 소수점으로 통일했다. 예: 14.633333333333333→14.6%. null은 0으로 표시하지 않는다. 원본 값과 모델은 바꾸지 않는다. 긴 관측 설명은 관측 정보 details로 옮기고 선택 날짜·값·저장 여부는 남겼다. SVG가 좁은 열에 맞춰 줄어들어도 관측점이 타원으로 찌그러지지 않도록 ResizeObserver로 화면 픽셀 기준 반경 및 터치 영역을 보정한다. 기존 데이터 경계와 연결선 정책은 그대로다.

## 변경 파일

- `src/styles/detail.css`: 충돌 반응형 제거, 두 열 대시보드 및 내부 밀도/접근성.
- `src/styles/main.css`, `src/styles/layout.css`: 동일 배너·오버레이·eyebrow, 모바일 목록 간격과 숫자 가독성.
- `src/views/heroDetailView.js`: 같은 배경 아트워크 선택.
- `src/views/pickHistoryView.js`: 표시 전용 포맷터, 관측 설명 details, SVG 점 크기 보정.
- `tests/historyFormatting.test.js`: 원본 불변·모든 그래프 숫자 표시 검증.
- `tests/counters.test.js`: 변경된 2열 요구사항 반영.
- `tests/groupedIntegration.test.js`, `tests/metricHistory.test.js`, `tests/observationTimeline.test.js`, `tests/pickHistory.test.js`: 새 한 자리 표시 기대값 반영. 계산값 검증은 유지.
- `scripts/qa-responsive-unified.cjs`, `docs/qa/responsive-unified/`: 실제 Chrome 재현 및 전후 스크린샷/측정/보호 해시.

다른 git status 항목은 이전부터 존재한 작업이며 초기화하거나 되돌리지 않았다.

## 실제 브라우저 확인

설치된 Chrome headless + 로컬 Vite production preview `/HOW/`에서 확인했다. 통계는 저장된 실제 스냅샷, 아나/겐지는 저장된 API 상세, 리퍼는 이번에 한 번 조회한 실제 API 응답을 사용했다. 실제 패치/특전 JSON은 production 파일을 그대로 제공했다. 통계 제공처 대량 호출은 없다. 네트워크 재현용 라우팅은 QA에만 존재하며 운영 코드에는 없다.

|너비(px)|상세 좌우 2열|메인/상세 가로 넘침|키보드/지표 전환|
|---|---|---|---|
|320|통과|없음|통과|
|360|통과|없음|통과|
|375|통과|없음|통과|
|390|통과|없음|통과|
|430|통과|없음|통과|
|600|통과|없음|통과|
|700|통과|없음|통과|
|768|통과|없음|통과|
|1024|통과|없음|통과|
|1440|기존 PC 비율|없음|통과|

아나·겐지·레킹볼·리퍼·D.Mon 및 패치 카드가 없는 키리코를 확인했다. 아나/겐지/레킹볼의 열 좌표를 기록하고 리퍼/D.Mon/키리코의 라우팅·패치 상태도 확인했다. 모든 영웅을 모든 브라우저에서 시각 검수한 것은 아니다. 카운터/시너지 목적지 링크는 기존 DOM/회귀 테스트가 검증하며 이번 Chrome 검증은 이유 펼치기와 기존 링크 유지 중심이다.

확인 항목: 드롭다운 Enter/Escape와 팝업 화면 범위, 3개 지표 전환, 관측점 키보드 선택, 통계 정보 펼치기, 특전 탭의 4개 선택률 막대, 즐겨찾기 토글, 패치 더 보기, 카운터 이유 펼침, 단일 패치 JSON 요청. 모바일/PC에서 겐지 배경은 동일 xl+ URL이며 정상 로딩을 확인했다. 아나·겐지·리퍼 배경 원본도 HTTP 200으로 확인했다.

스크린샷:

- [변경 전 390px](qa/responsive-unified/before/390-genji.png)
- [변경 후 390px 전체 대시보드](qa/responsive-unified/after/390-dashboard-full.png)
- [변경 후 320px](qa/responsive-unified/after/320-genji.png)
- [PC 1440px](qa/responsive-unified/after/1440-genji.png)
- [모바일 메인 배너](qa/responsive-unified/after/390-banner.png)
- [PC 메인 배너](qa/responsive-unified/after/1440-banner.png)
- [동일 영웅 모바일 배너](qa/responsive-unified/after/390-hero-banner.png)
- [동일 영웅 PC 배너](qa/responsive-unified/after/1440-hero-banner.png)
- [상세 측정 결과](qa/responsive-unified/after/results.json)

## 테스트와 한계

- `npm.cmd test`: 199개 통과, 0 실패.
- `npm.cmd run build`: 통과.
- `npm.cmd run verify:pages`: `/HOW/`, 로컬 자산 11개 통과.
- `git diff --check`: 통과. 기존 파일의 LF/CRLF 안내는 Git 설정에 따른 경고다.
- Meta 정책·원본 스냅샷/index·특전 JSON·패치 JSON 보호 대상 11개 파일 해시 불변.
- Git Commit/Push/PR/배포 및 예약 자동화 활성화 없음.

320px에서도 두 열을 유지하므로 오른쪽 열은 약 122px로 좁으며 긴 패치 설명과 이유를 펼치면 세로 길이는 늘어난다. 읽을 수 없는 글자 크기로 줄이거나 내용을 자르지 않았다. 긴 콘텐츠가 있는 화면의 좌우 높이 차이는 남을 수 있다. 실제 터치 기기의 손가락 조작·Safari/Firefox·브라우저 텍스트 확대는 별도 검증하지 않았다.
