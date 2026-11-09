# 모바일 상세 2차 압축

2026-11-09, 로컬 구현/Chrome 검증. 600px 이하에만 압축 스타일을 적용했다. 기본 2열과 PC 비율은 유지한다.

## 실제 측정: 겐지 390px

|영역|변경 전|변경 후|감소|
|---|---:|---:|---:|
|영웅 소개 배너|255.8px|158.2px|97.6px (38%)|
|티어·승률·픽률·밴률|136px|118px|18px (13%)|
|최근 패치|316.2px|260.8px|55.4px (18%)|
|카운터|290.8px|254.4px|36.4px (13%)|
|시너지|301.8px|261.4px|40.4px (13%)|
|관측 그래프 영역|377.7px|323.7px|54px (14%)|

그래프의 문서상 시작 위치는 859.1→719.5px, 카운터는 998.4→823.5px로 이동했다. viewport 높이 1000px에서 영웅명·역할·네 지표·패치 핵심과 그래프/카운터 시작이 함께 보인다. 더 낮은 실제 휴대폰 viewport에서는 그래프와 카운터까지 추가 스크롤이 필요하다. 상단 공통 헤더/조회 필터는 이번 작업에서 바꾸지 않았다.

1440px에서는 같은 영역들의 높이가 전후 동일했다. [전체 측정](qa/detail-compact/comparison.json).

## 적용 사항

- 초상화 72→52px, 영웅명 29→24px, 배지 padding 및 소개 배너 여백 축소. 동일 배경 유지.
- 긴 소개는 기본 두 줄, 같은 행의 44px 터치 버튼으로 더보기/접기. 원문 전체를 DOM에 보존하고 데스크톱에서는 펼침 상태로 표시한다.
- 통계 버튼 최소 높이 64→52px, 숫자 18→16px, 2×2 배치/44px 터치 기준 유지.
- 패치 기술명·전후 수치 강조는 유지, 날짜/모드/배지와 여백 축소. 긴 설명은 두 줄+더보기, 기존 추가 변경/모드별 details와 공식 링크 유지.
- 카운터·시너지 초상화 40→32px, 영웅명 12→11px, gap/여백 축소. 링크와 이유 터치 영역은 44px 유지. 원래 제공된 최대 3명을 그대로 유지하며 이유는 기본 접힘이다.
- SVG 그래프 높이 120→100px, 제목/보조 안내 축소. 지표 전환과 관측 정보 접기는 유지한다. 데이터나 관측점을 제거하지 않는다.
- 비동기 재렌더 시 패치 설명의 열린 상태, 기존 details 상태와 설명 토글 포커스를 유지하도록 했다.

## 검증

Chrome headless, production preview `/HOW/`, 320/360/375/390/430px와 PC 회귀 1440px. 아나·겐지·레킹볼·리퍼·D.Mon, 패치 카드 없는 키리코를 확인했다. 저장된 실제 OverFast 응답/통계 스냅샷 및 production 패치·특전 JSON으로 재현했다. 통계 API를 새로 대량 수집하지 않았다.

각 모바일 너비에서 2열, 페이지 가로 넘침 0, 소개 더보기/접기, 그래프 3지표 전환/관측점, 카운터 이유, 패치 추가 변경, 특전 탭, 즐겨찾기와 통계 정보 펼침을 확인했다. 긴 패치 설명의 표시된 토글도 Enter로 검사했다. 실제 터치 기기와 다른 브라우저는 미검증이다.

전후 스크린샷:

- [390px 전](qa/detail-compact/before/390-genji.png) / [390px 후](qa/detail-compact/after/390-genji.png)
- [320px 아나](qa/detail-compact/after/320-ana.png)
- [PC 회귀](qa/detail-compact/after/1440-genji.png)
- [브라우저 측정 결과](qa/detail-compact/after/results.json)

`npm.cmd test`: 200개 통과. `npm.cmd run build`, `npm.cmd run verify:pages`, `git diff --check` 통과. Pages 로컬 자산 12개 검증.

## 변경 파일

`src/views/compactText.js`, `src/views/heroDetailView.js`, `src/views/heroPatchView.js`, `src/styles/detail.css`, `tests/compactText.test.js`, `scripts/qa-detail-compact.cjs`, 본 문서 및 `docs/qa/detail-compact/` 검증 자료.

통계 계산·필터·스냅샷·Meta Score·카운터/시너지 데이터·메인 배너·헤더 로고는 변경하지 않았다. Git Commit/Push/PR/배포 없음.

## 남는 제약

320px의 오른쪽 열은 좁아 설명을 펼치면 세로 높이가 늘어난다. 이를 막기 위해 내용을 자르거나 고정 높이를 주지 않았다. 새 패치 설명이 아주 길면 패치 카드 높이가 다시 늘 수 있으므로 새 데이터에서도 확인이 필요하다. 일부 외부 초상화의 로딩 속도는 네트워크 상태에 영향을 받는다.
