# HOW 2차 고도화 구현과 검증

작업일: 2026-11-02 (Asia/Seoul). 로컬 코드·문서·실제 데이터 파일만 변경했습니다. GitHub Push, 원격 설정, Actions 스케줄 활성화, 외부 서비스 연결, 공개 배포는 하지 않았습니다. 기존 Pages 워크플로도 그대로 유지합니다.

## 단계별 결과

| 단계 | 변경 내용 | 검증 |
| --- | --- | --- |
| 기존 구조 확인 | 기존 Model/View/Controller/Service/Domain, 캐시·필터·즐겨찾기·Pages base 유지 | 기존 20개 회귀 테스트 통과 |
| 메타 점수 | Domain meta.js, 70:30 설정, 역할 내 동률 평균 백분위, 결측 처리, 기존 tier.js 보존 | 가중치·동률·작은 그룹·결측·실제 응답 정책 비교 테스트 |
| 상세 페이지 | HeroDetailModel/Service/View와 Hash Routing Controller, 기술/특전 탭 | 실제 겐지 스키마·직접 진입·늦은 응답 무시·XSS DOM·즐겨찾기 통합 테스트 |
| 인사이트 | insights.js 규칙과 메인 HOT/꿀영웅 카드 | 조건·시간·결측·낮은 픽률·상승/하락 Mock 테스트 |
| 스냅샷 | 로컬 수집기, index·JSON, 읽기 Service, Pages 검증 확장, 비활성 workflow 초안 | 실제 54개 수집, 1시간 이내 재실행 건너뛰기, 조건·파일 검증 테스트 |
| 특전 조사 | OverLooker 공개 문서/페이지/약관 조사 | 합법적 재사용 API 미확인, 선택률 미연동 |
| 최종 통합 | 메인·상세·즐겨찾기·출처·상태 연결, 모바일 CSS | 오프라인 테스트 36개, 실제 HTTPS 테스트 2개, 빌드 및 정적 HTTP 검증 |

## 메타 점수 정책

META_POLICY에 승률 .7, 픽률 .3, 낮은 픽률 주의 기준 1%를 관리합니다. 같은 역할에서 두 값이 모두 있는 영웅만 비교 집단에 포함하며, 누락 지표의 가중치를 다른 지표에 재분배하지 않습니다. 0은 유효하고 null/누락은 미분류입니다.

지표 백분위 = 100 × (자신보다 낮은 값의 수 + (같은 값의 수 − 1)/2) / (N − 1) 입니다. 한 명이면 50점, 모든 값이 같아도 50점입니다. Meta Score는 승률 백분위×.7 + 픽률 백분위×.3입니다. 부동소수점 오차의 동률 분리를 피하려고 점수를 소수 10자리로 정규화하고 화면에는 1자리로 표시합니다. 원시 승률과 픽률을 직접 더하지 않습니다.

점수 내림차순 역할 순위에 S/A/B/C 누적 ceil(N×15/100), ceil(N×30/100), ceil(N×50/100), ceil(N×75/100) 경계를 적용하고 나머지는 D입니다. 동률은 최고 순위를 공유하며 다음 순위는 건너뜁니다. 작은 집단의 1위도 S이고 동률로 등급 비율이 목표보다 커질 수 있습니다. 검색·목록 정렬·즐겨찾기·역할 전환은 계산 집단을 바꾸지 않습니다.

기존 실제 경쟁전/아시아 스냅샷 54명을 비교했을 때 19명의 티어가 승률 단독 방식과 달랐습니다. 이는 정책 차이의 확인이며 새 정책의 예측 성능이 더 좋다는 검증은 아닙니다. 이전 attachRoleTiers와 기존 사용시간 공식은 tier.js에 보존했습니다.

픽률은 인기를 반영하며 전투 성능의 인과적 증거가 아닙니다. 1% 미만은 주의 표시만 하고 임의의 신뢰도 감점·표본 수·유의성·신뢰구간을 만들지 않습니다. 숨은 꿀영웅 후보에는 1% 최소 기준을 적용하지만 이것도 통계적 유의성 기준이 아닌 탐색 정책입니다. 설명 UI는 목록 상단 펼침 영역에 있습니다.

## 상세 응답 검증

공식 [OverFast 스키마](https://overfast-api.tekrop.fr/openapi.json)와 실제 GET /heroes/genji?locale=ko-kr을 확인했습니다. 실제/테스트 데이터는 tests/fixtures/overfast-genji.json에 보존했습니다. 프로덕션 폴백으로 가져오지 않습니다.

- abilities: name/description/icon/video, 실제 겐지 5개.
- video: thumbnail 및 link.mp4/link.webm. 실제 영상이 있을 때만 controls와 preload=none으로 출력합니다. 자동 재생하지 않습니다.
- perks.minor와 perks.major: name/description/icon을 가진 배열, 실제 각각 2개. 누락 항목을 만들어 채우지 않습니다.
- backgrounds: url/sizes 배열. sm/lg/xl+ 응답을 picture 미디어 조건에 연결했습니다.
- 패시브 표시 필드: 현재 스키마와 응답에 없습니다. 이름·순서로 추측하지 않고 전체 기술 목록과 구분 불가 안내를 제공합니다.

상세 Provider는 24시간 세션 캐시, 같은 키 요청 공유, 12초 타임아웃, 404/429/503·형식 오류·네트워크 안내, 최소 60초 및 Retry-After 재시도 대기를 적용합니다. URL은 HTTPS만 사용하며 이름·설명은 textContent로 출력합니다.

실제 앱의 영웅 클릭은 #/heroes/{key}로 이동합니다. #/heroes/{key}/abilities 및 /perks는 탭을 직접 열 수 있고, Pages에 전송되는 서버 경로는 /HOW/이므로 새로고침용 서버 rewrite가 필요 없습니다. 목록의 검색·역할·정렬·즐겨찾기 상태를 공유하며 즐겨찾기 목록에서 상세로 갔다면 복귀 링크도 즐겨찾기 목록으로 갑니다. 기존 기본 모달 함수는 호환/회귀 비교용으로 보존했지만 앱의 새 진입은 독립 페이지입니다.

## HOT 및 숨은 꿀영웅

HOT은 같은 source/플랫폼/모드/지역/등급/전장 조건의 수집만 비교합니다. 1시간 이상~7일 이내 이전 관측과 현재 조회 사이에서 픽률 +1%p 이상, 승률 유지 또는 상승, 현재 픽률 1% 이상을 충족해야 합니다. 증가량·양 끝 HOW 수집/조회 시각·조건을 표시합니다. 현재 값이 오래됐거나 요청 중/실패이면 추천하지 않습니다. 패치 정보를 알 수 없으므로 패치 영향이라 부르지 않습니다.

숨은 꿀영웅은 과거 데이터 없이 현재 역할 내 승률 백분위 75 이상·픽률 백분위 50 이하·픽률 1% 이상·유효 역할 집단 3명 이상을 사용합니다. 승률순 최대 3개 후보이며 선정 기준을 UI에서 공개합니다. 기존 실제 응답으로는 vendetta/torbjorn/venture가 후보였지만 실시간 조건과 응답이 바뀌면 달라질 수 있습니다.

HOT의 실제 과거 관측이 부족하므로 가짜 상승률을 표시하지 않습니다. 이번에 추가한 첫 관측은 UTC 2026-11-02T05:36:24.500Z(한국 시각 14:36)입니다. 충분한 시간이 지나고 새 실제 응답을 받아야 비교할 수 있습니다.

## 파일 구조와 책임

```text
src/domain/meta.js, insights.js                점수·추천 규칙
src/models/heroDetailModel.js, snapshotModel.js 응답·파일 정규화
src/services/heroDetailService.js              상세 API/캐시
src/services/snapshotService.js                정적 과거 JSON 조회
src/controllers/routingController.js           Hash URL·상세 로딩·경합
src/views/heroDetailView.js, insightView.js     상세·메인 인사이트
src/views/dom.js, statisticsUI.js              안전한 DOM·통계 공통 표시
src/styles/detail.css                         PC·모바일 상세/인사이트
scripts/collect-snapshot.js                    로컬 수집
public/data/snapshots/                         실제 JSON 관측
docs/proposals/snapshots.yml.example           실행 불가능한 검토 초안
```

기존 heroModel은 새 점수 선택자를 사용하고 heroController는 조회 후 스냅샷 읽기 및 View 갱신 콜백을 연결합니다. main.js에서 의존성을 조립합니다. index.html은 목록/상세 컨테이너와 인사이트·산정 안내를 추가합니다. package.json은 수집 명령을, verify-pages.js는 JSON 경로·스키마·출력 범위 검사를 추가했습니다. 기존 프로젝트 문서·원본·이미지는 유지합니다.

## 최종 검증과 한계

- npm test: 36개 통과. Mock, 수집 응답 스냅샷, DOM 통합을 구분했습니다.
- npm run test:live: 실제 목록/통계와 겐지 상세 HTTPS·CORS 테스트 2개 통과. 54개/54개와 기술 5개·Minor 2개·Major 2개·배경 3개 확인.
- npm run build: Vite 성공, JS 24개 모듈 처리.
- npm run verify:pages -- http://127.0.0.1:4177: /HOW/ 아래 HTML·CSS·JS·배너·index 및 실제 스냅샷 JSON HTTP/MIME 검사 통과. 로컬 참조 리소스 5개.
- 로컬 수집 재실행: 1시간 이내 중복 요청 없이 건너뛰기 확인.
- 기존 원본 prototype·백업은 유지합니다. 원격 Push·스케줄 활성화·외부 계정 연결·공개 배포를 하지 않았습니다.

현재 도구에 연결 가능한 브라우저가 없다는 응답(No browser is available)을 받아 실제 PC·모바일 화면 및 스크린샷 검증은 미완료입니다. jsdom은 레이아웃/동영상 재생 엔진이 아니므로 이미지 크롭, 320/375/390/430/768/1024/1440px 오버플로·실제 터치·미디어 재생은 추가 실기기 검증이 필요합니다. Hash 직접 진입·탭·상태 공유는 DOM 통합 테스트로 확인했습니다.

스냅샷 운영·권한 제안은 [설계 문서](SNAPSHOT-DESIGN.md), 선택률 재사용 조사 근거는 [특전 데이터 조사](PERK-DATA-RESEARCH.md)에 있습니다. 자동화는 승인 전 제안 단계이며 특전 선택률은 계속 미제공입니다.
