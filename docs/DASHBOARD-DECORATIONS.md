# 검색창 실루엣 및 주목 영웅 불꽃 — 2026-11-21

## 사용 이미지

요청 경로와 달리 실제 파일명에는 공백이 있다. 다음 사용자 제공 원본을 확인하고 사용했다. 다른 그림을 생성하거나 대체하지 않았다.

- `public/assets/검색창 위의 활쏘는 무사 낚시꾼.png` — 2170×725, RGBA, 199,240 bytes.
- `public/assets/오렌지 골드 미니멀 불꽃 아이콘.png` — 1254×1254, RGBA, 165,727 bytes.

원본은 수정하지 않았다. [원본 SHA-256·크롭·파생 파일 정보](qa/dashboard-decorations/assets.json).

실제 웹 사용 파일:

- `public/assets/decorations/fishing-silhouette.webp` — 256×152, 11,846 bytes.
- `public/assets/decorations/spotlight-flame.webp` — 42×64, 4,160 bytes.

`scripts/prepare-dashboard-decorations.py`가 Pillow로 재현 가능한 파생 파일을 만든다. 캐릭터·낚싯대·다리는 원본 픽셀을 유지하고, 원본에 포함된 긴 검색창 사각형과 물결은 마스크로 제외했다. 거의 투명한 외곽 잡점을 제거하고 실제 그림 영역을 크롭한 뒤 축소·lossless WebP 저장했다. 원본 RGB 색상에 새 효과를 덧칠하지 않았다.

## 배치

검색 폼을 상대 위치 기준으로 사용한다. 실루엣은 폭 40px, 자동 높이 약 23.75px이며 `left:12px; top:-16.4px`의 절대 배치다. 원본의 좌면 위치를 기존 input 상단 테두리에 맞추고 다리만 약 7px 내려오게 했다. 별도 바위·받침대·배경·검색창 테두리를 추가하지 않았다. 입력 텍스트·버튼의 히트 영역과 떨어져 있으며 `pointer-events:none`, `alt=""`, `aria-hidden="true"`, 드래그 비활성화를 적용했다.

기존 한 행 헤더의 여백 안에 들어가도록 작은 크기를 선택했다. 검색창이 제목 아래 독립 행으로 내려가는 1050px 이하에서는 설명 문구와의 겹침을 피하기 위해 실루엣을 숨긴다. 따라서 검사한 768/1024px 태블릿 및 320/390/430px 모바일에서는 검색과 가독성을 우선하며, 불꽃은 모두 표시한다. 화면 크기가 다시 넓어지면 CSS만으로 장식이 복원된다.

주목 영웅 라벨의 기존 주황 점 가상 요소는 제거했다. 실제 불꽃은 원본 비율을 유지하는 **높이 16px × 약 10.5px 그림 폭**이다. 기존 점+간격 11px의 텍스트 시작 위치는 유지하고, 아이콘을 별도 절대 배치해 약 6px 간격을 확보했다. 라벨·카드 높이와 영웅명·티어·점수 위치를 이동시키지 않는다.

불꽃은 5.3초 ease-in-out 주기로 opacity 0.82–1만 변화한다. 새 glow, 회전, 흔들림, 이동, 파티클은 없다. 기존 9.2초 아우라·7.2초 마그마와 다른 주기이며, 숨김/비활성/화면 밖에서는 정지한다. Reduced Motion에서는 animation:none, opacity:1로 즉시 정적 표시한다. 장식 로드 실패 시 해당 이미지만 숨기고 검색이나 카드 내용은 보존한다.

두 URL은 Vite BASE_URL을 사용하므로 `/HOW/assets/decorations/...`와 독립 도메인의 `/assets/decorations/...` 모두 기존 빌드 방식에 맞는다.

## 화면 및 검증

[PC 전체](qa/dashboard-decorations/after/1440-ko.png) · [PC HOT 카드](qa/dashboard-decorations/after/1440-ko-spotlight.png) · [모바일 전체](qa/dashboard-decorations/after/390-ko.png) · [모바일 HOT 카드](qa/dashboard-decorations/after/390-ko-spotlight.png)

[수정 전 PC](qa/dashboard-decorations/before/1440-ko.png) · [수정 전 모바일](qa/dashboard-decorations/before/390-ko.png)

- Chrome: 320/390/430/768/1024/1440/1920px × 한국어/영어/일본어, 21조합 통과.
- 두 파생 이미지의 실제 로드·naturalWidth 확인, 기존 주황 점 없음, 불꽃의 장식용 접근성 속성 확인.
- 390px·1440px 한국어에서 heading, 검색 폼, 일시정지, 카드, 제목, 영웅 링크, Meta Score의 전체 사각형 좌표가 수정 전과 **정확히 동일**하다.
- 검색창 중심 오차 1px 미만, 가로 넘침 없음. 모든 조합에서 입력 클릭·검색 버튼·검색어 전달·검색 결과 이동 성공.
- 실루엣은 별도 전체 사각형/물결 없이 테두리에 걸터앉는다. 좁은 화면에서 숨김 처리 확인.
- 실제 시간 경과에서 opacity 변화와 동일한 아이콘 좌표를 확인했다. Reduced Motion에서 정적 표시 확인. [모션 기록](qa/dashboard-decorations/motion/after/results.json).
- `npm test`: **380 통과**, 실패/스킵 0. 기존 378개 유지, 장식 실패/접근성과 검색 제출 보존 테스트 2개 추가. [로그](qa/dashboard-decorations/tests.txt).
- `npm run build`: 성공, 663개 정적 언어별 페이지. 기존 500KB 번들 경고는 유지된다.
- `npm run verify:pages`: 성공, `/HOW/`, 23개 로컬 자산. 두 장식 파일은 JS가 참조하므로 별도로 브라우저에서 로드를 확인했다. [로그](qa/dashboard-decorations/pages.txt).
- `git diff --check`, `git status`: 확인. 원본 PNG 두 파일과 다른 기존 작업은 보존했다.

브라우저의 통계·검색은 기존 실제 응답 fixture를 재생했다. 신규 실시간 API 전적 정확성 검증으로 보고하지 않는다. API/통계/캐시/라우팅·TOP 순환·인트로·홀로그램·Meta Score·카드 패딩은 변경하지 않았다.

## 변경 파일

- `src/views/dashboardDecorations.js` — 장식 이미지 생성과 실패 시 숨김.
- `src/views/dashboardPlayerSearch.js` — 검색 폼에 실루엣 추가.
- `src/views/metaDashboardView.js` — 주목/HOT 라벨에 불꽃 추가.
- `src/styles/dashboard.css` — 점 제거, 장식 배치, 5.3초 모션·Reduced Motion.
- `public/assets/decorations/*.webp` — 원본의 최적화 파생 파일 2개.
- `scripts/prepare-dashboard-decorations.py`, `scripts/qa-dashboard-decorations.cjs`, `scripts/qa-dashboard-decoration-motion.cjs`.
- `tests/dashboardDecorations.test.js`, 이 문서와 `docs/qa/dashboard-decorations/`.

새 외부 라이브러리를 설치하지 않았다. 로컬 수정·검증만 수행했으며 Commit·Push·배포하지 않았다.
