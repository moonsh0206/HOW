# 메타 대시보드 추가 개선 결과

2026-11-18. 로컬 구현 및 검증만 수행했다. 기존 미커밋 변경을 보존했으며 Commit·Push·배포·자동화 활성화는 하지 않았다.

## 적용 내용

- OverFast `/maps` 실제 응답 59개 중 HOW에서 지원하는 31개 전장의 `screenshot`을 재사용한다. HTTPS, 제공처 호스트, 전장 키와 파일 경로를 검증한다. 이미지 실패 시 네이비 배경으로 돌아간다. 부산·왕의 길·일리오스 이미지 응답은 실제 200 및 JPEG임을 확인했다. 이미지를 저장소에 복제하지 않았다.
- 돌격·공격·지원 카드가 픽률 → 승률 → 밴률 순으로 7.5초마다 함께 전환된다. 수동 선택하면 자동 순환을 멈추고 재개 버튼을 제공한다. 마우스 진입, 키보드 포커스, 숨겨진 문서, Reduced Motion에서는 자동 순환을 정지한다. 이탈 시 타이머와 이벤트를 정리한다. 지표만 바뀌면 세 카드만 갱신하며 추가 통계 요청은 없다.
- 전환은 120ms fade-out + 180ms fade-in이다. 주목 영웅 카드는 약한 오렌지 테두리·점·수치 강조와 최초 표시 280ms 등장 효과만 적용한다. Reduced Motion에서는 즉시 표시한다.
- 공통 콘텐츠 최대 너비 1600px, 기본 좌우 여백 24px, 모바일 12px을 사용한다. 대시보드에서 헤더·본문·푸터 정렬을 일치시켰다. 기존 4/2/3 구조를 유지한다.

## 역할 평균과 저장

현재 API의 영웅 통계에는 역할 전체 경기의 승·패 분모가 없다. 따라서 그래프는 **역할별 영웅 평균 승률 추이**이며, 각 영웅에 같은 가중치를 부여한 단순 평균이다. 실제 역할별 경기 승률이나 표본 가중 평균을 뜻하지 않는다.

현재 역할 로스터를 사용하며 검증된 0은 포함한다. 결측·검토 대상은 유효 수에서 제외하고, 한 역할의 대상 영웅이 모두 유효하지 않으면 해당 역할 평균을 표시하지 않는다. 유효/대상 영웅 수를 안내와 툴팁에 표시한다. 합성 등급은 기존 합성 함수를 재사용하고 개별 등급과 합산해 이중 집계하지 않는다.

`public/data/role-means/observations.json`은 66,775바이트다. 실제 원본 5개 파일에서 50개 조건별 관측값(원본 조건 29개, 파생 조건 21개)을 생성했다. 50일의 기록을 뜻하지 않는다. 원본 파일 SHA-256, 필터, 관측 시각·구간, 패치, 로스터, 집계 버전·방법, 유효/대상 수를 보관한다. 원본 통계 JSON·인덱스는 변경하지 않았다. 동일 입력의 반복 실행은 파일을 다시 쓰지 않는다. 검증한 임시 파일만 원자적으로 교체하고 오류 시 기존 파일을 보존한다.

현재 실제 관측일은 11월 2·4·6일이다. 생성 시각은 새 관측 시각이 아니다. 최근 7일의 연속 기록은 없으며 보간하거나 가상의 일일 기록을 생성하지 않는다. 기존 D+14·주간 수집 정책을 유지했으므로 **향후 연속 7일 데이터 확보를 위한 일일 관측 수집은 이번 변경만으로 활성화되지 않는다.** 기존 수집 범위와 API 예산에 맞춘 별도 운영 승인이 필요하다.

수동 실행:

```powershell
node scripts/derive-role-means.js
npm.cmd run snapshots:role-means
```

첫 명령은 dry-run, 두 번째는 검증 후 저장한다. 빌드 시 기존 원본에서 파생 파일을 갱신한다. 파생 계산은 OverFast 추가 호출 0회다. 브라우저는 기존 공유 MapService로 맵 목록을 가져오며 선택된 전장 이미지를 요청한다. 평균 JSON은 동일 출처에서 읽고 10분 캐시한다. 실패하면 기존 스냅샷 조회로 복귀한다. 자동 순환은 API를 호출하지 않는다.

## 검증

- 전체 단위·회귀 테스트: **350/350 통과**.
- 프로덕션 빌드: 통과, 언어별 정적 페이지 **663개**. 기존 큰 JS 번들 경고는 남아 있다.
- Pages 검증: `/HOW/` 및 로컬 에셋 16개 통과. 파생 평균을 원본 스냅샷으로 재계산해 일치 확인.
- `git diff --check`: 통과. 기존 LF/CRLF 알림은 있음.
- 브라우저: 1366·1440·1920·430·390·320px × 한국어·영어·일본어 **18조합 통과**. 가로 넘침 0, 세 지표 전환 시 카드 크기 동일, 이미지 성공·실패 복구, 좌우 정렬 확인.
- 1440px·390px에서 실제 타이머 전환 7507ms·7519ms 측정. 애니메이션 시작·중간·종료, hover·focus·Reduced Motion 정지 확인. 문서 숨김 신호는 단위 테스트로 검증했다.
- 기존 영웅 통계·전적 검색 이동 및 언어·필터 상태 회귀 브라우저 검사: 390px·1440px 통과. 통계 응답은 실제 캡처 자료를 재생했으며 새 실시간 통계 수집 성공으로 해석하지 않는다.
- 한국어 PC 대시보드 높이: 이전 917px → 933px. 세 지표에서 동일한 카드 높이를 확보해 16px 증가했으며, 1920×1080에서는 하단 패널 끝 1005px로 주요 영역이 모두 보인다.

증거: [18조합 결과](qa/dashboard-enhancements/results.json), [실시간 순환 결과](qa/dashboard-enhancements/motion/cycle-results.json), [기존 화면 회귀](qa/meta-dashboard/results-quick.json).

화면: [1440px](qa/dashboard-enhancements/1440-ko-viewport.png), [390px](qa/dashboard-enhancements/390-ko-dashboard.png), [전환 중간](qa/dashboard-enhancements/motion/1440-top-transition-middle.png).

## 이번 작업 파일

- 모델: `mapModel.js`, `metaDashboardModel.js`, 신규 `roleMeanModel.js`
- 컨트롤러: `metaDashboardController.js`, 신규 `dashboardCycle.js`
- View: `metaDashboardView.js`, `dashboardHistoryView.js`
- 서비스: 신규 `roleMeanService.js`, 공유 인스턴스 연결 `main.js`
- 스타일·번역: `dashboard.css`, `designTokens.css`, `i18n/dashboard.js`
- 생성·검증: 신규 `scripts/derive-role-means.js`, `package.json`, `scripts/verify-pages.js`, `scripts/qa-meta-dashboard.cjs`, `tests/dashboardEnhancements.test.js`
- 데이터: 신규 `public/data/role-means/observations.json`

위 목록에는 이전 작업에서 이미 미커밋 상태였고 이번에 수정하지 않은 파일은 포함하지 않았다. Meta Score, HOT, 그래프 원본, API 통계 계산, 워크플로는 변경하지 않았다.

## 이미지 이용 주의

[OverFast Credits](https://github.com/TeKrop/overfast-api#credits)는 전장 스크린샷 권리를 Blizzard에 귀속하며 출처를 안내한다. API 코드의 MIT 라이선스가 이미지 이용 허가를 의미하지는 않는다. 이번에는 제공된 공개 URL 직접 참조와 출처 링크만 적용했으며, 개별 이미지의 재배포 권한까지 확인된 것으로 보고하지 않는다.
