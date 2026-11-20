# UI 설명 정리 및 특전 정렬 — 2026-11-20

최신 로컬 미커밋 변경 위에 후속 수정했다. 통계 계산, API, 캐시, 품질 검증, 기록 저장, 자동화 설정은 변경하지 않았다. Commit·Push·배포하지 않았다.

## 제거·축약한 UI

| 영역 | 변경 |
|---|---|
| 대시보드 주목 영웅 | 티어순 설명만 펼치던 버튼·화살표 제거. 실제 HOT이면 두 상승폭과 비교 시각은 접지 않고 유지 |
| 평균 승률 그래프 | 계산 방식·집계 기준 설명용 펼침 제거. 필터와 중복되는 조회 조건 문단 제거. 단일 관측 상태는 `추이 데이터 수집 중`으로 축약 |
| 맵별 주요 영웅 | 공통 필터 적용 설명·픽률 순위 중복 설명·설명용 펼침 제거. 이미지 저작권/제공처 링크는 카드에 직접 유지 |
| 순위·카운터 | 내부 추천 그룹 정렬 설명 제거. 카운터 부제는 `5v5 상성 추천`으로 축약 |
| 영웅 통계 | 모바일 조회 정보 펼침을 일반 정보 영역으로 전환. 필터 더보기는 그대로 유지. 준비 상태 및 등급 평균 설명 축약. 캐시 초 단위 디버그성 설명 제거 |
| 영웅 상세 | 통계 정보 설명용 펼침 제거. 필터·캐시 구성별 중복 문구 대신 조회 시각과 공식 통합 통계가 아닌 등급 평균이라는 구분 유지 |
| 이력·전장 비교 | 관측/통계 설명용 펼침 제거. 점선·패치 관측 관련 필요한 주의 문구와 조회 시각, 오류·결측·검토·시간차 경고는 유지 |
| 특전 | 제공처 링크·조회 시각 유지. 독립 통계이며 선택 건수가 경기 수가 아니라는 안내를 짧게 유지 |
| 전적 검색 | 안내 두 문단을 한 문단으로 통합. 공개 프로필과 대소문자 주의 유지. 프로필 출처는 기술적 캐시 항목 나열 대신 조회 시각과 오래된 데이터 상태로 정리 |
| 메타 인사이트 | 추가 영웅이 없으면 설명만 담는 펼침 생성 안 함. 추가 영웅이 있으면 기능성 펼침 유지. HOT 기준·상승폭·관측 시각 유지, 통계적 유의성에 대한 부연은 툴팁으로 이동 |

더 이상 참조되지 않는 대시보드 번역 키와 `player.caseNote`를 확인 후 제거했다. 공통 사전의 다른 화면/접근성에서 사용하는 키는 유지했다. 한국어·영어·일본어에 동일하게 적용했다.

## 유지한 펼침과 이유

- 모바일 추가 필터와 모든 콤보박스: 실제 조회 조건 조작.
- 순위 3개 더보기: 실제 추가 영웅 행.
- 특전 단계 및 효과 더보기, 기술 영상: 원본 영웅 정보와 기능.
- 패치 전체/모드별/추가 변경사항: 실제 패치 내용과 공식 출처.
- 카운터·시너지 이유: 실제 영웅별 추천 근거.
- 플레이어 영웅별 상세: 실제 개인 전적.
- 특전 연결 오류 상세와 재시도: 오류 진단 및 복구.
- 미제공·검토·오래된 정보·기간 불일치·불완전 비율, 법적 고지와 제공처: 수치를 오해하지 않기 위한 상태와 출처.

## 특전 배치

두 열은 `repeat(2,minmax(0,1fr))`이며 왼쪽은 아이콘→이름, 오른쪽은 이름→아이콘이다. 오른쪽 설명·선택 건수·효과 더보기는 우측 끝 정렬했다. VS 가상 요소와 이를 위한 넓은 중앙 간격은 제거했다. 본문 원본과 기존 효과 더보기는 유지했다.

단일 파랑/주황 막대와 실제 비율은 그대로다. 레이블은 PC 16px / 모바일 15px, 굵기 800, tabular-nums를 사용한다. 일반 비율은 각 구간 중앙에 표시한다. 20% 미만 또는 불완전 비율은 레이블을 막대 위 별도 행에 두고, 막대 폭에는 최소 너비를 강제하지 않는다. 0·100, 50:50, 80:20, 95:5, 99.9:0.1, 불완전 합계 테스트를 포함한다. API 값을 변경하지 않았다.

## 전후 화면

| 화면 | 수정 전 | 수정 후 |
|---|---|---|
| 390px 대시보드 | [전](qa/ui-cleanup/before/390-ko-dashboard.png) | [후](qa/ui-cleanup/after/390-ko-dashboard.png) |
| 1440px 대시보드 | [전](qa/ui-cleanup/before/1440-ko-dashboard.png) | [후](qa/ui-cleanup/after/1440-ko-dashboard.png) |
| 390px 특전 | [전](qa/ui-cleanup/before/390-ko-perks.png) | [후](qa/ui-cleanup/after/390-ko-perks.png) |
| 1440px 특전 | [전](qa/ui-cleanup/before/1440-ko-perks.png) | [후](qa/ui-cleanup/after/1440-ko-perks.png) |

[50:50](qa/ui-cleanup/after/390-ratio-50-50.png) · [80:20](qa/ui-cleanup/after/390-ratio-80-20.png) · [95:5](qa/ui-cleanup/after/390-ratio-95-5.png)

경계 비율 이미지는 렌더링 QA용 수치로 DOM을 조정한 시각 테스트이며 운영 API 수치가 아니다. 실제 겐지 특전 화면의 선택률·선택 건수는 기존 저장된 실제 응답을 재생했다. 데이터 파일은 수정하지 않았다.

| 측정 | 전 | 후 |
|---|---:|---:|
| 320/390px 주목 영웅 카드 | 126px | 80px |
| 390px TOP 카드 | 156px | 156px |
| 1440px 상단 카드 | 128px | 128px |
| 390px 일반/주요 특전 각 카드 | 237.39px | 237.39px |
| 1440px 일반/주요 특전 각 카드 | 234.23px | 234.23px |

특전 카드의 높이를 억지로 줄이지 않고 이름·효과·건수를 보존했다. 좁은 비율 레이블 예외에서는 겹침 방지를 위한 28px 행을 사용한다. 전체 페이지 스크롤 거리는 비동기 콘텐츠에 따라 달라 별도 고정 수치로 보고하지 않는다.

## 수정 파일

- UI: `src/views/metaDashboardView.js`, `compactMainView.js`, `heroView.js`, `heroDetailView.js`, `insightView.js`, `pickHistoryView.js`, `mapStatisticsView.js`, `perkStatisticsView.js`, `playerSearchView.js`.
- 스타일: `src/styles/panelEffects.css`, `dashboard.css`, `mobileRebuild.css`.
- 번역: `src/i18n/dashboard.js`, `ko.js`, `en.js`, `ja.js`.
- 테스트: `tests/uiCopyCleanup.test.js` 추가, `perkPanel.test.js`, `perkStatistics.test.js`, `metaDashboard.test.js`, `dashboardHistoryIntegration.test.js`, `historyFormatting.test.js`, `compositeDivisions.test.js`, `groupedIntegration.test.js`, `hotV2.test.js`, `statisticsQuality.test.js` 수정.
- 브라우저 검증: `scripts/qa-ui-cleanup.cjs`, `scripts/qa-ui-cleanup-flows.cjs`, `docs/qa/ui-cleanup/`.

기존 `main.js`, `perkCardBinding.test.js` 및 다른 자산 등의 미커밋 변경은 이번 작업 이전부터 있던 내용으로 유지했다.

## 검증 결과

- `npm test`: 374 통과, 실패/스킵 0. 이전 373개를 유지하고 다국어 UI 상태 테스트 1개 추가.
- `npm run build`: 성공, 663개 언어별 정적 페이지. 기존 500KB 번들 경고는 남아 있다.
- `npm run verify:pages`: 성공, `/HOW/`, 23개 로컬 자산.
- `git diff --check`: 성공.
- Chrome PC/모바일: 320/360/390/430/768/1280/1366/1440/1920px × 한국어/영어/일본어. 일반/주요 특전 우측 정렬, VS 없음, 막대·레이블 카드 내부, 효과 더보기 상태 유지, 가로 넘침 없음.
- 390/1440px × 3개 언어: 영웅 통계→상세, 검색→즐겨찾기→플레이어 상세 이동과 상태 유지 확인. [기록](qa/ui-cleanup/flows/after/results.json).
- [반응형 측정](qa/ui-cleanup/after/measurements.json), [전체 테스트 로그](qa/ui-cleanup/tests-final.txt), [빌드](qa/ui-cleanup/build.txt), [Pages](qa/ui-cleanup/pages.txt).

브라우저 검증은 재현 가능한 기존 실제 응답 fixture를 사용했다. 신규 실시간 API 정확성 검증이나 물리 모바일 기기 테스트로 보고하지 않는다. 네온 프레임·홀로그램·마그마 숫자 및 기존 자동 순환 코드는 보존했다.
