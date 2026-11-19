# 공통 프레임 및 대시보드 후속 모션

2026-11-19. 기존 미커밋 변경을 보존하며 후속 수정했다. Commit·Push·배포는 하지 않았다.

## 변경 내용

- `pageFrame.css`를 공통 프레임으로 추가했다. 최대 너비 1600px, 좌우 24px/모바일 12px, 본문 시작 16px, 끝 여백 24px을 공유한다. 페이지별 모바일 헤더 축소 예외와 대시보드 전용 헤더·푸터 정렬 예외를 정리했다. 검색 Hero 안쪽의 중복 가로·상단 여백도 제거했다. 카드 내부 여백은 유지한다.
- body/main을 최소 viewport 높이의 flex 구조로 구성해 짧은 검색 화면에서도 푸터가 하단에 놓이도록 했다. `scrollbar-gutter: stable`로 짧은 페이지와 긴 페이지의 가로 이동을 방지했다. Windows Chrome에서 확보되는 15px은 스크롤바 공간이며 가로 넘침이 아니다.
- TOP 순환의 **표시 시간은 전환 완료 후 5.5초**다. 다음 초상화 디코딩과 애니메이션 완료 Promise를 받은 후 다음 타이머를 시작한다. 따라서 정상적인 전환 시작 간격은 약 5.94초이며 이미지가 느릴 때는 늘어날 수 있다. 임의로 통계를 바꾸거나 준비되지 않은 다른 영웅 이미지를 노출하지 않는다.
- 지표 선택 버튼 3개는 제거했다. 역할별 제목에 현재 지표를 유지하며 접근 가능한 일시 정지/재개 버튼만 남겼다. 세 역할은 픽률 → 승률 → 밴률 순으로 함께 전환된다. 스크린리더 live 알림은 추가하지 않았다.
- 이미지 전환 440ms, 이름·지표는 60ms 지연 후 380ms, 퇴장 180ms를 겹쳐 실행한다. 이동량은 ±6px, easing은 기존 `cubic-bezier(0.22,1,0.36,1)`이다. 외곽 카드 DOM과 크기는 고정한다. 같은 영웅이 연속 선두면 기존 이미지 DOM과 이름의 시각적 상태를 유지하고 라벨·수치만 바꾼다.
- 기존 이벤트 위임에서 버튼 내용 변경 후 pointerout이 전달되지 않아 Hover 정지가 남는 상황을 Chrome에서 재현했다. 고정된 카드·컨트롤 영역의 pointerenter/leave로 바꾸고 동일한 버튼 텍스트를 불필요하게 다시 쓰지 않도록 했다. 자식 교체 후 Hover 해제 회귀 테스트를 추가했다.
- 주목 영웅의 `::after`에 고정된 낮은 강도의 그림자 레이어를 두고 **9.2초** 동안 opacity만 `.3~.65`로 변화시킨다. pointer-events는 none이다. 그림자·blur 크기는 애니메이션하지 않는다.
- Meta Score 숫자는 기존 오렌지·앰버·골드 색과 글꼴·크기·배치를 유지하며, 넓어진 텍스트 배경의 위치만 **7.2초** 주기로 이동한다. 아우라는 -2초 위상 차이를 둔다. 숫자 자체는 이동·왜곡하지 않는다. 이전 600ms의 일회성 강조는 이번 느린 명암 흐름으로 대체했다.
- TOP의 Hover·Focus·수동 정지는 TOP 순환에 적용한다. 아우라·숫자 흐름은 문서 비활성화·라우트 숨김에서 정지한다. Reduced Motion에서는 자동 순환과 장식 모션을 모두 끈다. 눈길을 분산시키는 진행선·추가 이동 점은 넣지 않았다.

## 실측 비교

| 화면 | 기존 헤더/푸터 왼쪽 | 변경 후 | 헤더 높이 |
|---|---|---|---|
| PC 1440, 대시보드 | 24 / 24px | 24 / 24px | 88px 유지 |
| PC 1440, 영웅 통계·검색 | 80 / 112px | 24 / 24px | 88px 유지 |
| 모바일 390, 대시보드·검색 | 12 / 12~16px | 12 / 12px | 65.52px로 통일 |
| 모바일 390, 영웅 통계 | 12 / 16px | 12 / 12px | 57.19 → 65.52px |

모바일 영웅 통계 헤더에만 있던 5px 상하 패딩 예외를 제거해 페이지 전환 시 높이가 달라지지 않도록 했다. 카드 높이를 줄이거나 데이터를 생략해 맞춘 것이 아니다. 검색 페이지 푸터 하단은 390×844에서 844px, 1440×900에서 900px에 놓인다.

실제 순환 측정:

| 너비 | 최초 전환 | 다음 전환 시작 간격 |
|---|---:|---:|
| 390px | 5525ms | 6024 / 5924ms |
| 1440px | 5520ms | 5952 / 5988ms |

전환 중 실제 opacity/transform과 60ms 지연을 측정했으며, 전환 전후 외곽 사각형은 동일했다. 아우라의 9200ms·숫자 배경의 7200ms 실행과 배경 위치 변화를 실제 Chrome에서 확인했다. Meta Score 원래 수치 `90.4`와 통계 계산은 유지한다.

## 수정 파일

- `src/styles/pageFrame.css` 신규, `src/main.js` 연결
- `src/styles/navigation.css`, `src/styles/mainPolish.css`, `src/styles/player.css` — 중복 페이지별 프레임·검색 내부 여백 정리
- `src/styles/dashboard.css` — 아우라·명암 흐름, 문서 정지/Reduced Motion
- `src/controllers/dashboardCycle.js` — 완료 후 5.5초 타이머, 비동기 전환과 이탈 경합 제어
- `src/controllers/metaDashboardController.js` — 전환 Promise 전달, 안정된 영역 Hover 이벤트, 지표 선택 이벤트 제거
- `src/views/metaDashboardView.js` — 선택 버튼 제거, 지연 등장, 같은 영웅 이미지·이름 보존, 완료/취소 처리
- `tests/dashboardEnhancements.test.js`, `scripts/qa-meta-dashboard.cjs` — 비동기 타이밍·동일 영웅·Hover 회귀 및 실측

Meta Score, 티어·HOT 기준, 원본 통계·스냅샷, API 서비스, 라우트·번역 데이터 및 워크플로는 이번 후속 작업에서 변경하지 않았다.

## 검증 자료와 한계

- 최종 전체 테스트 352/352개 통과. 동일 영웅 이름 유지 및 Hover 해제 회귀를 포함한다.
- 프로덕션 빌드, Pages `/HOW/` 및 로컬 에셋 16개, 정적 페이지 663개 검증 통과. 기존 JS 번들 500kB 경고는 남아 있다.
- PC·모바일 실제 모션: 1440px·390px. 세 지표 전체 순환, 외곽 크기, 시작·중간·종료, Hover·Focus 정지, Reduced Motion 통과.
- 프레임: 1366·1440·1920·430·390·320px × 한국어·영어·일본어 18조합 통과. 실제 메뉴 클릭과 뒤로/앞으로 가기로 헤더 높이·좌우 정렬·공통 여백·가로 넘침을 확인했다.
- 기존 영웅 통계·플레이어 검색·상세 이동 브라우저 회귀: 390px·1440px 통과.
- 문서 비활성화는 visibilitychange 신호 단위 테스트로 확인했다. 실제 OS의 백그라운드 탭 전환까지 검증했다고 보고하지 않는다.
- 브라우저의 통계 응답은 실제 캡처 자료를 재생했다. 이번 UI 검증을 새로운 실시간 통계 수집 성공으로 보고하지 않는다.

[변경 전 프레임](qa/dashboard-followup/before/results-quick.json) · [변경 후 프레임](qa/dashboard-followup/after/results.json) · [모션 실측](qa/dashboard-followup/motion/results-quick.json)

[PC](qa/dashboard-followup/motion/1440-final.png) · [모바일 전환 중간](qa/dashboard-followup/motion/390-winRate-middle.png) · [검색 화면](qa/dashboard-followup/after/390-ko-player-search.png)
