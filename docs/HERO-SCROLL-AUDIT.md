# 영웅 상세 진입 스크롤 전수 검사

## 결론과 한계

현재 로컬 코드와 프로덕션 빌드에서 제보된 겐지 하단 진입 현상은 재현되지 않았다. 따라서 겐지만의 원인을 확정하거나 해당 버그를 수정 완료했다고 주장하지 않는다. 영웅별 예외, 반복 scrollTo, 임의 타이머 및 overflow-anchor 우회는 추가하지 않았다.

기존 공통 라우터의 신규 영웅 진입 시 rAF 스크롤 초기화, manual 브라우저 복원, 동일 영웅 탭 전환 시 위치 유지, preventScroll 포커스, 목록 위치 복원과 비동기 경합 방어를 유지했다. API 응답과 이미지 로딩 후에도 배너의 실제 좌표를 검사했다.

## 실제 브라우저 결과

- 실제 API 목록과 영웅 상세 응답 54명으로 검사 대상을 구성했다. 테스트 코드에 영웅 54명을 수동 나열하지 않았다.
- Chrome, 390px/1440px, overview·abilities·perks: 324/324 통과. 초기 및 안정화 후 scrollY 모두 0. 실제 배경 이미지 로딩과 배너 전체가 viewport 안에 있는지도 확인했다.
- 배너 top은 290~370.5px였다. 상단 헤더/필터 등 기존 문서 흐름 아래에 배치되며 헤더에 가려지지 않았다. viewport 높이는 900px이다.
- 겐지 기본 URL 및 세 하위 URL, 정상/느린 API/느린 이미지/503 후 재시도: 32/32 통과. 재시도 테스트는 브라우저 테스트 시계로 기존 60초 제한을 경과시켰으며 운영 제한은 변경하지 않았다.
- 320/375/390/768/1440px: 긴 목록 진입, 동일 영웅 탭 전환, 다른 영웅 이동, 목록 복원, 즐겨찾기, 메타픽, 직접 URL 및 새로고침 시나리오 통과.
- 320/360/375/390/430/768/1024/1280/1440/1920px: 반응형 대시보드 검사 통과. 390→1440→390 전환에서 동일 DOM 노드 유지, 중복 ID 및 추가 통계 요청 없음.
- 폰트 지연을 시도한 별도 8건도 통과했으나 원격 폰트의 실제 다운로드 성공 여부를 별도 증명하지 않았으므로 폰트 로딩 원인을 배제하는 증거로 사용하지 않는다.

전수 검사에서는 선택적인 웹폰트/기술 아이콘 요청을 차단하여 진입 경로를 격리했다. 실제 배너 사진과 초상화는 로딩했다. 실제 모바일 기기, Safari, 사용자가 오류를 본 배포 버전·브라우저 프로필은 미검증이다. 재발 시 정확한 URL, 배포 빌드, 브라우저와 재현 동작을 현재 증거와 대조해야 한다.

## PC·모바일 통합 변경

첨부 요구사항에 따라 PC 헤더의 기존 링크 및 사이드바 패치노트/인사이트/예정 카드를 복원했다. 1024px 이상은 넓은 목록과 좁은 사이드바 2열, 768~1023px는 대시보드의 반응형 흐름을 사용한다. 767px 이하는 세 메뉴를 유지한다. PC의 meta URL은 대시보드로 연결하며 모바일 meta URL은 독립 화면을 유지한다.

기존 노드를 이동하므로 필터, 패치노트, 즐겨찾기, 인사이트를 중복 생성하지 않는다. 화면 전환 시 포커스와 details 상태를 유지한다. 이 작업에서 통계·Meta Score·스냅샷·영웅 데이터 및 공통 스크롤 정책을 변경하지 않았다.

## 변경 파일

- `index.html`, `src/styles/navigation.css`: PC 헤더/사이드바와 모바일 전용 메뉴 구분, 중간 너비 테이블 넘침 방지.
- `src/controllers/routingController.js`, `src/views/mainMenuView.js`, `src/views/insightView.js`: 화면 너비에 맞는 실제 노드 배치와 이벤트 해제.
- `tests/mainMenus.test.js`, `tests/mobileInsights.test.js`, `tests/groupedIntegration.test.js`: 반응형 이동 및 여러 matchMedia 구독 검증. 기존 스크롤 테스트는 삭제하거나 완화하지 않았다.
- `scripts/collect-hero-scroll-fixtures.js`, `scripts/qa-hero-scroll-audit.cjs`, `scripts/report-hero-scroll-audit.js`: 실제 목록 기반 전수 검사와 보고서.
- `scripts/probe-hero-scroll.cjs`, `scripts/probe-hero-scroll-fonts.cjs`, `scripts/qa-genji-lifecycle.cjs`, `scripts/qa-scroll-scenarios.cjs`, `scripts/qa-dashboard-responsive.cjs`: 원인 조사 및 수명주기·반응형 검사.

기존 작업 트리에 있던 자동화·상세 UI 등 다른 변경은 보존했다. QA API 응답과 이미지 캐시는 아래 QA 폴더에만 저장되며 운영 public 스냅샷을 추가하거나 덮어쓰지 않는다.

## 검증 자료

- [전체 54명 표](qa/hero-scroll-audit/REPORT.md)
- [324건 원시 측정](qa/hero-scroll-audit/all-heroes.json)
- [겐지 32건](qa/hero-scroll-audit/genji-lifecycle/results.json)
- [탐색/스크롤 시나리오](qa/hero-scroll-audit/scenarios/after/results.json)
- [반응형 결과](qa/hero-scroll-audit/layout/after/results.json)
- [PC 화면](qa/hero-scroll-audit/layout/after/1440-dashboard.png)
- [모바일 화면](qa/hero-scroll-audit/layout/after/390-dashboard.png)
- 영웅별 스크린샷 경로는 324건 JSON의 screenshot 필드에 기록했다. 초기 조사 화면은 `qa/hero-scroll-audit/probe/`에 보존했다.

기존 214개를 포함해 `npm.cmd test` 215개 통과. `npm.cmd run build`, `npm.cmd run verify:pages`, `git diff --check` 통과. Git status로 기존 미커밋 변경을 확인했다. Commit/Push/PR/배포는 수행하지 않았다.

수동 재검사: 프로덕션 빌드와 preview 서버를 실행한 뒤 `node scripts/qa-hero-scroll-audit.cjs`, `node scripts/report-hero-scroll-audit.js`를 사용한다. 실제 응답 갱신은 별도 `node scripts/collect-hero-scroll-fixtures.js`로 수행한다.
