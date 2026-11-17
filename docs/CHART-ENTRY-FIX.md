# 그래프 최초 등장·종류 전환 수정

## 확인한 원인

1. 기존 CSS 모션은 DOM이 표시 가능한 상태가 되자마자 시작했다. 실제 상세 화면의 그래프는 첫 viewport 아래에 있다. 수정 전 390px 재현에서 플롯 top=1024.28px일 때 이미 550ms 애니메이션이 `finished`였다. 스크롤 후에도 같은 완성 상태였다. 연결 전 시작을 원인으로 단정하지 않는다. **연결되었지만 화면 밖에서 효과가 소진되는 현상**을 확인했다.
2. `preserveChartMotion`은 이전/새 데이터 서명이 같으면 바로 CSS 진입을 끄고 있었다. API·이력·패치 등 비동기 렌더가 진행 중인 차트를 같은 데이터로 교체하면, 이전 노드의 모션은 사라지고 새 노드는 최종 상태가 됐다. 진행 중/대기/완료를 구분하지 않은 코드 결함이다.
3. 선→막대와 막대→선 모두 CSS 노드 생성에 의존했고 가시성 확인·퇴장·새 타입 진입을 관리하는 공통 수명주기가 없었다. 전환 과정의 로딩 상태, 화면 밖 렌더, 같은 데이터 후속 렌더에 따라 관측되는 효과가 달라졌다.
4. 캐시 응답이 로딩 표시 직후 도착하면 새 렌더가 퇴장 레이어를 제거할 수 있었다. 남은 퇴장 시간을 승계하고, 실제 새 그래프가 이미 표시된 뒤의 빠른 교체에는 오래된 퇴장본을 재사용하지 않도록 분리했다.

## 구현 파일

- `src/views/chartMotion.js`: 공통 모션 관리자. host별 WeakMap, 세대 token, 준비/실행/완료, viewport 관측, 취소 및 퇴장 처리.
- `src/views/heroDetailView.js`: 렌더링과 hidden 상태 적용 후 관리자 호출. 영웅 로딩·오류 화면에서는 이전 실행 정리. 통계 탭 전체의 수직 이동은 제거하고 opacity만 유지하여 축을 고정.
- `src/styles/detail.css`: 자동 재생 CSS keyframe을 제거하고 대기 상태의 데이터 레이어 스타일과 퇴장 오버레이만 정의.
- `tests/chartMotionLifecycle.test.js`: 가시성 대기, 동일 데이터 진행 시간 승계, 완료 후 재실행 방지, 종류/지표 변경, 빠른 취소, 퇴장본 중첩 방지, 캐시 응답, Reduced Motion.
- `scripts/qa-chart-entry.cjs`: 실제 앱의 최초 진입·전장·지표·탭·영웅 이동 검사 및 상태/transform/opacity 기록.
- `scripts/qa-chart-motion.cjs`: 기존 그래프 컴포넌트 브라우저 QA를 새 연결 시점 트리거에 맞춰 갱신.

기존 데이터 준비용 `prepareChartMotion`과 데이터 서명은 유지한다. 종류, 지표, 전장, 기간, 관측값과 영웅 키를 구분한다. 통계 API·축·수치·원본·캐시·라우팅은 변경하지 않았다.

## 모션 수명주기

1. 실제 데이터 레이어만 `pending` 상태로 준비한다. 빈 그래프는 대상이 없다.
2. DOM 연결·hidden 해제 후 두 requestAnimationFrame과 IntersectionObserver로 화면 진입을 확인한다. 화면 밖에서는 소진되지 않는다.
3. Web Animations API로 실행한다. 막대 450ms, 두 번째 50ms 지연, 값 220ms fade. 선 550ms clip reveal+3px 상승, 점은 250ms 후 300ms fade. easing은 `cubic-bezier(.22,1,.36,1)`.
4. 종류 변경 시 기존 플롯의 접근 불가능한 임시 복제본만 120ms fade-out한다. 새 플롯의 축·레이아웃은 그대로다. 복제본은 inert/aria-hidden이며 클릭·포커스를 받지 않는다. 이전 복제본은 중첩하지 않는다.
5. 같은 데이터의 교체가 실행 중이면 현재 진행 시간을 이어받는다. 완료 후 같은 데이터는 재실행하지 않는다. 새 선택은 이전 실행·예약 프레임·관측을 취소한다.
6. 화면 밖/숨겨진 탭에서는 대기 또는 일시정지한다. 다시 보이면 이어가며, 완료된 그래프는 반복하지 않는다. Reduced Motion은 즉시 최종 상태다.

선은 clip reveal이므로 기존 점선 `stroke-dasharray`를 건드리지 않는다. 수치 보간이나 count-up은 없다. 축과 레이블 좌표는 변경하지 않는다.

## 검증 증거

- 수정 전 실제 앱: `docs/qa/chart-entry/before/results.json` — 화면 밖에서 이미 `finished`인 상태.
- 수정 후 실제 앱: `docs/qa/chart-entry/after/results.json` — 390/1440px × 일반/Reduced Motion 4조합. 직접 URL, 메인 버튼→상세, 선→막대→다른 맵→선, 세 지표, 빠른 필터, 특전 탭 안에서 대기 후 통계 탭 복귀, 겐지→아나 검사. 일반 모션은 `pending → running → complete`, 감소 모션은 즉시 complete.
- 컴포넌트 Chrome 검사: `docs/qa/chart-motion/results.json` — 320/390/1280/1440px × 일반/Reduced Motion 8조합. 중간과 최종 높이 일치, 가로 넘침 없음, 0/1/2점, 빠른 지표 교체, 중복 실행 억제.
- 실제 상태와 함께 시작·중간 캡처를 남겼다. 종료 상태의 transform/opacity 및 실제 값도 JSON에 기록했다. 최종 캡처만으로 통과시키지 않았다.
- 이력 기간 버튼은 현재 앱에 별도로 없으므로 새로 추가하지 않았다. 기존 기간은 데이터 서명에 포함되며 변경 시 새 진입 대상이다. 기간 버튼의 실제 클릭을 검증했다고 주장하지 않는다.
- 브라우저 검사는 캡처된 메타데이터·저장 통계와 명시적인 테스트 전용 전장 수치를 사용했다. 실제 API 재수집·운영 데이터 변경은 하지 않았다.

빌드의 기존 500kB 번들 경고는 남아 있다. Commit/Push/배포 없음. 기존 미커밋 작업 보존.

최종 명령 결과: `npm.cmd test` **319/319 통과**, `npm.cmd run build` 통과(지역화 공개 HTML 660개), `npm.cmd run verify:pages` 통과(`/HOW/`, 자산 15개), `git diff --check` 통과(줄바꿈 경고만). `git status --short`로 기존 변경과 이번 변경을 확인했다.
