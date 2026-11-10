# 하단 브랜드 배너 검증

2026-11-10. `index.html`과 `src/styles/layout.css`의 하단 `.site-footer`만 수정했다. 기존 최종 헤더 자산 `public/assets/branding/how-header-logo.svg`를 재사용하며 SVG 원본은 변경하지 않았다. `%BASE_URL%`로 GitHub Pages `/HOW/` 경로를 처리한다.

PC에서는 132px 로고와 안내 문구를 가로 배치한다. 768px 이하에서는 112px 로고를 사용하고 공간에 따라 문구가 다음 줄로 자연스럽게 이동한다. 이미지 높이는 auto, object-fit은 contain으로 원본 비율을 보존한다. 문구를 고정 높이로 자르지 않는다.

적용 문구:

- HUB OVERWATCH · 비공식 팬 프로젝트
- HOW는 Overwatch 기반의 비영리 데이터 팬사이트입니다.
- Overwatch 및 관련 이미지·상표의 권리는 Blizzard Entertainment에 있습니다.

Chrome headless, DPR 2, 320/375/390/430/768/1024/1440px에서 실제 production preview를 검사했다. 모든 너비에서 SVG 로딩, 1518:448 비율, 자식 요소의 배너 내부 배치, 문서 가로 넘침 0을 확인했다. 이 검사는 하단 정적 UI에 한정하며 외부 API 요청은 차단했다. 원본 자산이 벡터이므로 래스터 확대 없이 선명하게 표시된다. 390/1440px 스크린샷은 직접 시각 확인했다. 실제 모바일 기기는 미검증이다.

`results.json`에 원시 측정값, 각 너비의 `*-footer.png` 및 `*-viewport.png`에 스크린샷을 저장했다. 재현 스크립트는 `scripts/qa-footer-brand.cjs`다.

`npm.cmd test`: 218/218 통과. `npm.cmd run build`, `npm.cmd run verify:pages`, `git diff --check` 통과. Git status 확인. 통계/상세/필터/자동화 코드와 원본 데이터는 수정하지 않았다. Commit/Push/PR/배포 없음.
