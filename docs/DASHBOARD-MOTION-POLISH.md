# 대시보드 Meta Score 및 TOP 3 전환 개선

2026-11-18. 최신 로컬 구현에 추가했으며 기존 미커밋 작업을 보존했다.

## 구현

- 네 번째 카드의 기존 `META` 라벨은 유지하고 숫자에만 오렌지 → 앰버 → 연한 골드 텍스트 그라데이션을 적용했다. 약한 따뜻한 그림자를 사용하며, 미지원 브라우저는 단색으로 표시한다.
- 처음 유효한 Meta Score가 표시되거나 해당 영웅이 바뀔 때만 600ms 밝기·그라데이션 강조를 실행한다. 숫자 값과 좌표는 변경하지 않는다. 같은 영웅의 단순 통계·맵·이력 재렌더링은 반복 실행하지 않는다. Reduced Motion에서는 정적인 색상만 남긴다. 기존 HOT 카드가 승률 상승폭을 보여주는 상황을 Meta Score로 임의 변경하지 않았다.
- 첫 세 카드의 외곽 DOM·역할·높이·테두리는 유지한다. 내부 제목·초상화·이름·수치·보조 지표를 한 콘텐츠 영역으로 묶었다. 이전 콘텐츠는 180ms 동안 위로 5px 이동하며 사라지고 새 콘텐츠는 동시에 400ms 동안 아래 5px에서 등장한다. easing은 `cubic-bezier(0.22,1,0.36,1)`이다.
- 다음 초상화 디코딩을 기다리는 동안 이전 콘텐츠를 유지한다. 이미지 실패는 기존 이미지 오류 대체 동작을 사용한다. 세 카드의 준비가 끝나면 함께 교체한다. 로딩 중에 지표·필터·페이지가 바뀌면 토큰으로 이전 작업을 무효화한다.
- 퇴장 콘텐츠에는 `aria-hidden` 및 `inert`를 적용하여 중복 읽기·포커스를 방지한다. 이전 애니메이션과 잔여 콘텐츠를 취소·제거하며, Reduced Motion 설정이 실행 도중 변경되어도 즉시 최종 상태로 표시한다.
- 기존 7.5초 순환, 수동 선택 정지/재개, hover·focus·문서 숨김 정지, 활성 지표 버튼 및 언어별 라벨을 재사용했다. 새 통계/API 요청은 추가하지 않았다.

## 변경 파일

1. `src/views/metaDashboardView.js` — 숫자 분리, 콘텐츠 교차 전환, 이미지 준비·취소, 일회성 강조와 접근성.
2. `src/styles/dashboard.css` — 숫자 그라데이션, 기존 그리드를 콘텐츠 래퍼에 동일하게 적용, 퇴장 레이어.
3. `tests/dashboardEnhancements.test.js` — 외곽 DOM 보존, 빠른 클릭·지연 이미지 응답, 중복 강조 방지 및 Reduced Motion 취소 회귀 테스트.
4. `scripts/qa-meta-dashboard.cjs` — `--polish` 증거 저장, 실제 Web Animations 시작·중간·완료 및 불꽃 밝기 측정.
5. 이 보고서와 `docs/qa/dashboard-polish/` 검증 자료.

Meta Score·HOT·통계 계산, 원본 스냅샷, API 서비스, 워크플로 및 데이터 구조는 이번 작업에서 변경하지 않았다.

## 검증 결과

- 전체 테스트 **351/351 통과**. 마지막으로 보강한 지연 이미지·Reduced Motion 테스트도 관련 테스트 9/9 통과.
- 프로덕션 빌드 통과. 정적 페이지 663개, Pages `/HOW/` 및 에셋 16개 검증 통과. 기존 500kB 이상 JS 번들 경고는 남아 있다.
- `git diff --check` 통과. 기존 LF/CRLF 안내는 남아 있다.
- Chrome: 1366·1440·1920·430·390·320px × 한국어·영어·일본어 18개 조합에서 지표별 실제 영웅·수치, 동일한 카드 사각형, 가로 넘침 0, 추가 통계 요청 0을 확인했다. 이 조합은 Reduced Motion에서도 수동 선택이 정상인 것을 포함한다.
- 1440px·390px 일반 모션에서 픽률 → 승률 → 밴률 → 픽률의 실제 타이머 순환을 확인했다. 첫 전환 측정은 약 7474ms·7515ms였다. 콘텐츠 opacity와 transform을 중간 샘플로 확인했고 최종 opacity는 모두 1이었다. 카드 자체는 움직이지 않았다.
- 숫자 강조는 실제 Web Animations 호출 및 연결된 DOM의 밝기를 시간별 측정했다. 600ms 설정, 중간 brightness 상승, 원래 값 `90.4` 유지 및 안정적인 최종 상태를 확인했다.
- hover·focus·Reduced Motion 자동 정지는 실제 브라우저에서 확인했다. 문서 비활성화 정지는 기존 `visibilitychange` 신호 단위 테스트로 검증했으며 실제 OS 백그라운드 탭 전환을 검증한 것으로 보고하지 않는다.
- 브라우저 통계 응답은 실제 캡처 자료를 재생했다. 이번 UI 작업을 새 실시간 통계 수집 성공으로 보고하지 않는다.

## 화면 및 측정 자료

- [PC 최종](qa/dashboard-polish/1440-ko-viewport.png)
- [390px 최종](qa/dashboard-polish/390-ko-viewport.png)
- [320px 최종](qa/dashboard-polish/320-ko-viewport.png)
- [PC 전환 중간](qa/dashboard-polish/motion/1440-top-transition-middle.png)
- [모바일 전환 중간](qa/dashboard-polish/motion/390-top-transition-middle.png)
- [18조합 결과](qa/dashboard-polish/results.json)
- [실시간 순환·중간 상태](qa/dashboard-polish/motion/cycle-results.json)
- [Meta Score 밝기 샘플](qa/dashboard-polish/motion/1440-flame.json)

Commit·Push·배포·자동화 활성화는 수행하지 않았다.
