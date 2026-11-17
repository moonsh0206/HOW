# HOW Main Visual Polish

## 범위와 구현

이번 단계는 메인 화면의 마무리 스타일과 배너 등장 효과에 한정했다. 작업 시작 시 `git status --short`는 깨끗했다. 원격 코드로 덮어쓰지 않았으며 통계·Meta Score·추천 정책·HOT·일일 순위·스냅샷·번역·SEO 데이터는 변경하지 않았다. 역할 버튼과 티어 엠블럼·섹션 구조도 그대로 유지했다.

기존 메인은 공통 토큰이 도입돼 있었지만 헤더의 평면적인 표면, 필터별로 다른 높이·선 굵기, 카드 hover의 위쪽 이동, 수치 굵기와 인사이트의 서로 다른 행간이 남아 있었다. 새 디자인 체계를 추가하지 않고 `mainPolish.css`에서 기존 토큰을 사용해 메인 영역만 보완했다.

| 대상 | 적용 |
| --- | --- |
| 헤더 | 은은한 네이비 명도 차이, 약한 구분선, PC 간격 40px, 메뉴 굵기 600, 활성 메뉴는 밝은 글씨와 기존 오렌지 밑줄 |
| 필터 | 기존 `createFilterCombobox()` 유지. PC 최소 46px, 모바일 최소 44px·글씨 16px, 공통 패딩·화살표 크기·선택 표면 정돈 |
| 영웅 카드 | 기존 모서리 유지, 절제된 네이비 표면·테두리, 모바일 패딩 8px 9px, 초상화 48px 유지, hover 위치 이동 제거 |
| 수치 | tabular/lining 숫자, PC 수치 굵기 600, 모바일 14px·굵기 700. 기존 소수점·반올림·단위는 변경하지 않음 |
| 인사이트 | 기존 표면 토큰·얇은 경계 유지, 이미지 정렬·테두리, 설명 행간 1.6, 보조 수치 1.55, PC 패딩 14px 16px |
| 상태 전환 | 메뉴·필터 180ms ease-out, 카드 경계·배경 200ms ease-out. 포커스 유지, reduced-motion에서는 전환 생략 |
| 모바일 | 역할 버튼·검색·메뉴 구조를 유지하고 필터 및 카드 내부 여백만 조정. 44px 컨트롤·즐겨찾기 영역 유지 |

전역 `button` 등은 새로 변경하지 않았다. 새 선택자는 `#list-page`, `#heroes`, 메인 인사이트의 `#meta-page`와 해당 화면이 보이는 헤더에 한정했다. 다른 상세·검색 화면의 스타일을 대상으로 삼지 않았다. 실제 모바일 내비게이션은 기존 3개 고정 링크 구조이므로 새로운 펼침 메뉴는 만들지 않았다.

## 배너 순차 등장

`bannerEntrance.js`가 라우터의 실제 목록 표시 상태 전환을 받는다. 화면에 연결된 다음 animation frame에서 실행하고, 숨김 또는 다른 페이지 이동 시 예약 프레임과 진행 중 애니메이션을 취소한다. 통계 재렌더링·언어 갱신으로 표시 상태가 유지되면 다시 실행하지 않는다.

- 슬로건 → 제목 첫 줄 → 강조 제목 → 표시 중인 설명 → CTA.
- 개별 460ms, 시작 간격 80ms, 전체 780ms.
- `cubic-bezier(0.22, 1, 0.36, 1)`.
- PC 14px / 모바일 10px 아래에서 opacity와 transform으로 등장.
- 제목은 기존 단일 h1과 br·em을 유지하고 첫 텍스트에 span만 추가한다. 번역 텍스트를 하드코딩하지 않는다.
- 기본 DOM은 항상 표시 상태다. Web Animations·RAF 미지원 또는 reduced-motion에서는 숨기지 않고 즉시 표시한다.
- 배경 이미지 로딩을 기다리지 않으며 배너 크기·배경·최종 텍스트 좌표를 변경하지 않는다.

## 변경 파일

- `src/styles/mainPolish.css`
- `src/views/bannerEntrance.js`
- `src/controllers/routingController.js` — 표시 상태 전달과 정리 호출만 추가
- `src/main.js` — 스타일 import
- `tests/bannerEntrance.test.js`
- `scripts/qa-main-polish.cjs`
- 이 문서 및 `docs/qa/main-polish/` 검증 자료

## 검증 자료와 결과

Chrome + Playwright로 320 / 390 / 430 / 768 / 1024 / 1280 / 1440px × 한국어·영어·일본어를 변경 전후 비교했다. 각 조합에서 티어리스트, 영웅 통계, 맵 비교, 기술, 특전, 메타, 검색, 결과, 플레이어, 상세 분석의 10개 상태를 검사했다.

- 영웅 순서·표시값 fingerprint 일치, 문서 가로 넘침 및 페이지 JavaScript 오류 없음.
- 기본 21개 조합 검사는 reduced-motion으로 수행하고 배너 애니메이션 호출 0회 확인.
- 실제 이미지 추가 검사: 390 / 1440px 한국어. 기존 그래프 3종 전환의 시작·중간·종료 값과 오류·로딩·비공개 화면도 확인.
- 배너 집중 검사: 320 / 390 / 1440px × 세 언어 9개 조합. 최초 직접 진입, 홈 복귀, 새로고침, 언어 갱신의 반복 방지, 빠른 이동 취소 확인.
- 이미지 요청을 1200ms 지연해도 텍스트 애니메이션이 먼저 실행되는 것을 확인. 실제 중간 opacity·transform을 JSON에 기록하고 시작·중간·완료 화면을 저장.
- 390 / 1440px에서 메인 지역 콤보박스를 키보드로 열기·이동·선택하고 지역·등급·전장·정렬을 변경했다. 실제 언어 선택기로 영어→일본어→한국어 전환 후 지역·전장 선택 보존을 확인했다.
- API는 기존 캡처 응답과 실제 저장 통계로 재현했다. 전장 정밀도 수치는 명시적인 테스트 전용 값이다. 새 운영 API 수집 결과가 아니다.

| 390px 한국어, 높이 844px | 변경 전 | 변경 후 |
| --- | ---: | ---: |
| 첫 카드 시작 Y | 702.38px | 702.38px |
| 첫 카드 높이 | 164.39px | 162.39px |
| 카드까지 추가 스크롤 | 0px | 0px |

PC 1440px 첫 표 행 높이는 74.17px로 유지됐다. 헤더와 배너에는 높이 변경을 적용하지 않았다. 글씨·터치 영역을 줄여 억지로 정보를 압축하지 않았다.

320px에서는 긴 선택값 줄바꿈으로 첫 카드 Y가 717.94→721.94px로 4px 내려갔고 높이는 179.38→177.38px로 줄었다. 1440px 첫 표 행 시작은 1138.55→1134.55px로 4px 앞당겨졌다. 최종 헤더는 모바일 57.19px / PC 88px, 모바일 배너는 165px이다.

### 스크린샷 및 원시 결과

- 모바일: [변경 전](qa/main-polish/main-before/390-ko-tiers-viewport.png), [변경 후](qa/main-polish/after/390-ko-tiers-viewport.png)
- PC: [변경 전](qa/main-polish/main-before/1440-ko-tiers-viewport.png), [변경 후](qa/main-polish/after/1440-ko-tiers-viewport.png)
- 배너: [시작](qa/main-polish/banner-images-motion/390-ko-banner-start.png), [중간](qa/main-polish/banner-images-motion/390-ko-banner-middle.png), [완료](qa/main-polish/banner-images-motion/390-ko-banner-end.png)
- [변경 전 결과](qa/main-polish/main-before/results.json), [변경 후 결과](qa/main-polish/after/results.json)
- [실제 이미지·그래프 모션 결과](qa/main-polish/after-images-motion/results.json), [9개 배너 검사 결과](qa/main-polish/banner-images-motion/results.json)
- [메인 키보드·필터·언어 전환 검사](qa/main-polish/controls-images/results.json)

기본 전후 비교는 외부 이미지 요청을 차단해 동일 조건을 사용했다. 실제 이미지 추가 검사 자료는 별도로 구분했다.

### 명령

- `npm.cmd test`: 332개 통과, 실패·생략 0. 기존 스크롤 회귀 테스트도 유지.
- `npm.cmd run build`: 성공, 언어별 정적 진입 HTML 660개.
- `npm.cmd run verify:pages`: `/HOW/` 기준 성공, 자산 15개.
- `git diff --check`: 성공. 기존 줄바꿈 안내 경고만 존재.

## 남은 사항

CTA는 기존 `#heroes` 링크와 목록 화면 접근을 유지했다. 다만 기존 지역화 라우터가 앵커 기본 이동을 막아 목록 상단으로 스크롤되지 않는 동작을 브라우저에서 확인했다. 이번 범위에서 라우팅·스크롤 정책을 바꾸지는 않았다.

기존 큰 JS 번들 경고는 남아 있다. 실제 운영 서버의 HOT·일일 등락 데이터 생성/게시 여부는 이번 시각 검사의 성공으로 보증하지 않는다. 해당 표시·판정 코드는 변경하지 않았다.

Commit, Push, 배포 및 자동화 활성화는 수행하지 않았다.
