# 검색창 5종 랜덤 이스터에그 — 2026-11-21

후속 요청: 아래 최초 적용값에서 **5종 모두 PC·모바일 크기를 추가 35% 확대**했다. 현재 PC 폭은 한조 70.2 / 겐지 36.45 / 아나 54 / 솜브라 45.9 / 윈스턴 37.8px, 작은 화면 폭은 58.05 / 29.7 / 44.55 / 37.8 / 31.05px다. 앵커도 비례 보정했으며 아나의 모바일 X만 -11.5px로 보정했다. 추가 장식 여백은 현재 PC 16px·모바일 21px이고, 아나가 선택된 경우 입력 시작 패딩을 18px로 확보한다. 검색창 폭·중앙 정렬은 유지한다. 관련 테스트 5개, 5종 PC/390px 불투명 픽셀 겹침 검사, 프로덕션 빌드가 통과했다. 아래 스크린샷은 확대 후 모습으로 갱신했으며, 뒤의 초기 크기·간격 표는 최초 적용 기록이다.

최신 로컬 코드의 한조 장식을 확장했다. 기존 미커밋 변경·원본 PNG·HOT 불꽃은 보존했다. Commit·Push·배포하지 않았다.

## 실제 원본 및 파생 에셋

원본 위치는 모두 `public/assets/`다. 실제 파일을 열어 캐릭터와 소품을 확인했으며 원본을 다시 그리거나 덮어쓰지 않았다.

| 영웅 | 실제 원본 파일명 | 웹 사용 파일 (`assets/decorations/`) | 크기 / bytes |
|---|---|---|---|
| 한조 | 검색창 위의 활쏘는 무사 낚시꾼.png | fishing-silhouette.webp (기존 파생 파일 재사용) | 256×152 / 11,846 |
| 겐지 | 검색창 위에서 라면 먹는 사이보그 닌자.png | genji-search.webp | 116×160 / 10,066 |
| 아나 | 후드 쓴 전술 저격수의 휴식.png | ana-search.webp | 160×152 / 11,238 |
| 솜브라 | 해커 실루엣과 해골 노트북.png | sombra-search.webp | 142×160 / 16,444 |
| 윈스턴 | 바나나 먹는 윈스턴과 검색창.png | winston-search.webp | 145×160 / 25,684 |

솜브라·윈스턴의 검색창 프레임/배경은 포즈별 알파 마스크로 제외했다. 겐지·아나는 넓은 반투명 발광 여백을 정리했다. 캐릭터·라면·총기·노트북·바나나·낚싯대는 원본에서 보존했다. 유효한 그림 영역을 크롭하고, 축소 후 lossless WebP로 저장했다. 새 이미지/도형을 생성하지 않았다.

[파생 기록과 원본 SHA-256](qa/dashboard-eggs/assets.json). 4개 신규 원본과 이전 한조·불꽃 원본의 해시가 그대로임을 확인했다. 재생성은 `python scripts/prepare-dashboard-eggs.py`로 가능하다. 기존 한조와 불꽃 파생 파일은 이 스크립트가 수정하지 않는다.

## 선택 및 수명

`src/data/dashboardEggs.js`가 에셋·배치의 단일 매핑을 제공한다. `floor(random × 5)`의 다섯 동일 구간으로 각각 20% 확률을 가진다. 같은 영웅이 연속 선택되어도 허용한다.

`createDashboardEasterEgg()`는 대시보드의 **비활성→활성** 전환에서만 한 번 선택한다. 초기 비활성 View 생성 시에는 이미지를 요청하지 않는다. 새로고침은 새 View이므로 새 선택이며, 내부 메뉴에서 돌아올 때도 새 선택이다. 필터·통계 갱신·TOP 순환·언어 변경의 반복 `setActive(true)`는 선택하지 않는다. 창 크기는 CSS 변수만 다시 적용한다. sessionStorage/localStorage를 추가하지 않았으며 로고 인트로의 세션 키와 독립적이다.

선택한 이미지 하나만 로드한다. 다른 네 이미지를 미리 다운로드하지 않는다. 모든 파생 파일명이 ASCII이므로 한글·공백 URL 문제도 피했고, 기존 Vite BASE_URL로 `/HOW/` 및 `/`를 지원한다.

load/decode 후 DOM이 연결되고 인트로가 끝나면 380ms의 opacity 0→1, translateY 4px→0으로 한 번 등장한다. 등장 후에는 정적이며 캐러셀이 아니다. Reduced Motion은 즉시 표시한다. 이탈/새 방문/파괴 시 RAF·애니메이션·관찰자를 정리하고 오래된 decode 결과를 무시한다. 파일 실패는 해당 장식만 숨기며 재추첨하지 않는다. 검색 기능은 유지한다.

## 크기·앵커

실제 그림에서 머리부터 좌면까지 약 22px로 맞췄다. 전체 캔버스 폭을 강제로 통일하지 않았다. 한조의 전체 표시 폭은 40→52px, **30% 확대**다.

좌표는 input 상단 테두리가 Y=0인 검색 폼 기준 CSS px이다. 음수 X는 다리를 입력 글자 왼쪽으로 내리기 위한 보정이다. 낚싯대 등의 상단 소품은 그대로 남는다.

| 영웅 | PC 폭 | PC X / Y | 340–1050px 폭 | 작은 화면 X / Y |
|---|---:|---:|---:|---:|
| 한조 | 52 | 0 / -21.8 | 43 | 0 / -18 |
| 겐지 | 27 | -11 / -22.5 | 22 | -8 / -18.3 |
| 아나 | 40 | -14 / -22.8 | 33 | -9 / -18.8 |
| 솜브라 | 34 | -11 / -22.9 | 28 | -8 / -18.9 |
| 윈스턴 | 28 | -10 / -22.3 | 23 | -7 / -18.3 |

340px 미만에서는 장식을 숨긴다. 360/390/430px과 태블릿에서는 모두 표시한다. 이미지에 pointer-events:none, alt="", aria-hidden=true, 드래그 비활성화를 적용했다.

공통 헤더·푸터는 수정하지 않았다. PC는 대시보드 padding-top만 **+8px**, 340–1050px는 검색 행 margin-top만 **+14px** 확보했다. 320px 숨김에서는 추가 margin이 없다. 390px/1440px 실제 검색창 이동은 각각 +14/+8px, 폭 변화는 0px, 콘텐츠 중심 오차는 0px이었다. 필터와 TOP 카드도 이 작은 간격 증가를 따른다. 큰 고정 장식 컨테이너를 추가하지 않았다.

## 5종 화면

다음은 **Vite 개발 서버에서만** 생성자에 고정 난수를 주입한 레이아웃 검사다. 운영 앱의 난수나 URL을 조작하지 않았고, 운영 사용자에게 고정 선택 메뉴/쿼리/전역 API를 노출하지 않았다. 실제 대시보드 DOM·CSS·이미지로 각 포즈를 확인했다.

| 영웅 | PC 1440px | 모바일 390px |
|---|---|---|
| 한조 | [PC](qa/dashboard-eggs/layout/1440-hanzo.png) | [모바일](qa/dashboard-eggs/layout/390-hanzo.png) |
| 겐지 | [PC](qa/dashboard-eggs/layout/1440-genji.png) | [모바일](qa/dashboard-eggs/layout/390-genji.png) |
| 아나 | [PC](qa/dashboard-eggs/layout/1440-ana.png) | [모바일](qa/dashboard-eggs/layout/390-ana.png) |
| 솜브라 | [PC](qa/dashboard-eggs/layout/1440-sombra.png) | [모바일](qa/dashboard-eggs/layout/390-sombra.png) |
| 윈스턴 | [PC](qa/dashboard-eggs/layout/1440-winston.png) | [모바일](qa/dashboard-eggs/layout/390-winston.png) |

[캔버스 알파 픽셀 겹침 검사](qa/dashboard-eggs/layout/results.json): 두 크기에서 다섯 포즈 모두 불투명 픽셀이 입력 텍스트 영역을 덮는 개수 0, 화면 밖/가로 넘침 없음. 실제 검색창 테두리 외 별도 긴 프레임·회색 박스가 없음을 시각 확인했다. 일부 header만 자른 보조 이미지에는 음수 X의 장식이 잘릴 수 있으므로 위 표는 전체 viewport 캡처를 연결했다.

## 운영 빌드 검증

- 실제 Math.random을 사용하는 운영 빌드에서 320×700, 360×800, 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1920×1080 × 한국어/영어/일본어 **24조합 통과**.
- 각 첫 진입의 silhouette 정적 자산 요청 종류는 정확히 1개. 선택 파일 로드 성공, 중앙 정렬 1px 미만, 가로 넘침 0.
- 390/1440px에서 역할·지역 변경, API 갱신, TOP 지표 순환, 언어 변경, resize 후 같은 이미지 DOM 노드 유지 확인.
- 메뉴 이탈 시 이전 노드 제거, 복귀 시 새 노드 선택 확인. 새로고침도 새 선택/로드 확인. 같은 영웅 재선택은 실패로 처리하지 않았다.
- 선택 파일 요청을 차단한 경우 장식만 숨김, 검색 입력/결과 이동 유지 확인.
- 실제 랜덤 이미지의 decode 완료·인트로 종료 후 380ms 시작, 프레임별 중간 opacity/transform 및 정적 종료 기록. [모션](qa/dashboard-eggs/runtime/motion/motion.json).
- [24조합과 수명 검증](qa/dashboard-eggs/runtime/after/results.json).
- 전체 `npm test`: **383 통과**, 실패/스킵 0. 기존 380개 유지, 확률 구간/방문/경합 회귀 3개 추가. [로그](qa/dashboard-eggs/tests.txt).
- `npm run build` 성공: 언어별 정적 HTML 663개 유지. 기존 JS 500KB 번들 경고는 남아 있다.
- `npm run verify:pages` 성공: `/HOW/`, 로컬 자산 23개. JS 참조 이스터에그는 별도 브라우저 요청/로드로 확인했다. [Pages](qa/dashboard-eggs/pages.txt).
- `git diff --check`, `git status` 확인. 개발 테스트 서버는 종료했다.

통계·검색 응답은 기존 실제 fixture를 재생했다. 신규 실시간 API 정확성/운영 자동화 성공을 주장하지 않는다. 이스터에그로 추가되는 통계 API 요청은 없으며 변경은 선택 이미지의 정적 요청뿐이다.

## 수정 파일

- `src/data/dashboardEggs.js` — 5종 매핑, 개별 배치, 균등 선택 순수 함수.
- `src/views/dashboardEasterEgg.js` — 방문별 선택·decode·등장·경합/수명 관리.
- `src/views/dashboardDecorations.js`, `dashboardPlayerSearch.js`, `metaDashboardView.js` — 기존 장식/검색/View 활성 연결 재사용.
- `src/styles/dashboard.css`, `panelEffects.css` — 반응형 좌표와 대시보드 전용 간격.
- `public/assets/decorations/{genji,ana,sombra,winston}-search.webp` — 신규 파생 파일 4개.
- `scripts/prepare-dashboard-eggs.py`, `qa-dashboard-egg-layout.cjs`, `qa-dashboard-egg-runtime.cjs`.
- `tests/dashboardEasterEgg.test.js`, `tests/dashboardDecorations.test.js`와 이 문서/검증 자료.

Meta Score·통계 계산·캐시·스냅샷·라우팅·첫 방문 로고·TOP 자동 순환·HOT 불꽃 및 기존 미커밋 작업은 보존했다. 새 외부 라이브러리를 설치하지 않았다.
