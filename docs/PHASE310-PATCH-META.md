# Phase 3.10 패치 기반 메타 보기·마크·선택 버튼

검토일: 2026-11-03 (한국). 로컬 코드와 테스트만 변경했다. 실제 스냅샷 삭제·추가 수집·Actions 스케줄 활성화·Push·배포는 하지 않았다.

## 실제 구현

- 기존 7일/30일을 유지하고 '이번 패치'와 '패치별 비교'를 추가했다. 승률·픽률·밴률 전환은 그대로이며 지표만 바꾸면 메모리의 전체 영웅 기록을 재사용한다.
- 패치 보기는 전체 보관 파일을 같은 코호트로 조회한다. SnapshotService의 파일 캐시와 중복 요청 공유를 사용하며 HOT 조회 메서드는 변경하지 않았다.
- `patchCatalog.js`에는 공식 10월 노트의 일반 밸런스·영웅 핫픽스·버그 수정 항목을 구분해 저장했다. ID는 HOW 내부 식별자이고 공식 버전 번호가 아니다. 공식 날짜 라벨은 기록하되 정확한 배포 시각과 원본 통계 집계 패치가 확인되지 않아 version/effectiveAt 및 CURRENT_STATISTICS_PATCH는 null이다. 최신 패치 목록만으로 현재 통계 패치를 추정하지 않는다.
- 과거 패치 비교는 같은 조건의 검증된 패치가 2개 이상 있을 때만 가능하다. 각 패치의 마지막 실제 관측값 최대 2개를 선택하고 평균을 만들지 않는다. 패치 사이에는 선을 잇지 않는다. 내부 comparisonWindow='different-patch-windows'로 서로 다른 누적 집계 기간임을 보존한다. 변화의 인과를 패치 때문이라고 단정하지 않는다.
- 현재 실제 archive는 전체 등급 1개·다이아몬드 0개·patch=null로 그대로이다. 패치 보기에서는 이런 미확인 이력을 비교하지 않으며 동일 조건의 현재 API 값이 있으면 현재 관측점만 표시한다. 없으면 '기록 수집 중'이다. 7일/30일 보기에서는 기존 미확인 이력을 실제 관측점으로 볼 수 있으나 패치 미상 구간의 선은 없다.

## 패치 소속 확인과 새 영웅

스냅샷의 날짜와 patch 문자열만으로 패치를 인정하지 않는다. `patchVerification`에는 status='verified', catalogId, 공식 sourceUrl, verifiedAt(유효한 ISO 시각), statisticsWindow='since-patch-start'가 모두 필요하다. 이는 운영자가 원본 집계 구간을 별도로 대조한 후에만 입력할 검증 결과이며 API가 이 정보를 제공한다고 가정하지 않는다. 현재 파일에는 추가하지 않았다.

공식 통계 FAQ는 가장 최근 패치 시작 이후 통계이며 반영에 최대 하루가 걸릴 수 있다고 설명한다. 따라서 공식 적용 날짜와 HOW 수집 날짜가 같아도 제공처 캐시·반영 지연 때문에 자동 귀속은 안전하지 않다. 현재 통계 결과에 patch=null/statisticsWindow='unverified-patch-window'를 명시했다. HOW fetchedAt은 경기 집계 마감 시각이 아니다.

영웅 기록이 없거나 지표가 null이면 점을 만들지 않는다. 검증된 출시 시각을 선택적으로 제공하면 그 이전 관측을 제외한다. 출시 시각을 임의로 만들어 기존 54명에게 배정하지 않았다. 0은 실제 비율일 때만 0으로 표시한다.

## 수집과 보관 정책

기존 collector는 전체 등급 기본값과 명시적 diamond 옵션을 유지한다. 같은 조건의 로컬 수집 최소 간격을 24시간으로 늘렸고, 새 파일은 retentionClass='detail', patchVerification=null 및 미확인 집계 구간을 명시한다. 전체 영웅을 동일 시점 파일 하나에 보관한다. collector는 이번에 실행하지 않았다.

대표 관측은 원본 파일을 참조하도록 설계했다. 별도 영웅별 복사나 대표 평균 파일은 만들지 않는다. 패치별 마지막 서로 다른 관측 시각 1~2개를 유지한다. 현재 패치·소속 미확인 자료·최근 7일 HOT 비교 구간은 항상 보호한다. 현재 패치를 확인하지 못했다면 모든 파일을 보존한다. 과거 세부 자료는 향후 명시적 검토 후 정리할 후보로만 제시한다.

실행 명령:

```powershell
node scripts/snapshot-retention-dry-run.js
```

이 스크립트에는 쓰기·삭제 코드가 없다. 안전한 파일명, 중복 인덱스, 실제 파일 존재, 완전한 코호트, 시각/필터/patch의 파일-인덱스 일치, 스냅샷 정규화, 인덱스에 없는 JSON 파일 여부를 먼저 확인한다. 실행 결과: **검증 파일 1개, 보존 1개, 정리 후보 0개**. 자동 정리·원격 삭제 경로는 구현하지 않았다. 향후 작업 트리에서 지우더라도 과거 Git 커밋의 용량과 내용은 남는다.

## 공식 마크와 효과 교정

공식 영웅 HTML에서 10종의 소형 SVG 원본 URL을 확인하고 각 effects.mark에 URL·출처·검토일·permission·displayAllowed를 저장했다. 전체 54명의 이름·역할·아이콘 파일명 연결을 테스트했다. 공식 프레스 페이지 및 연결된 사이트 약관을 확인했으나 HOW 웹 서비스 공개 재사용에 대한 명확한 허가를 확보하지 못했다. 따라서 permission='unverified', displayAllowed=false로 두고 **실제 UI는 텍스트 폴백**을 유지한다. 이미지 다운로드·공개 핫링크 표시·임의 대체 마크는 하지 않았다.

향후 허가를 확인해 approved/displayAllowed=true로 바꾸면 카운터 아래 패시브 카드의 명칭 왼쪽에 32px 이미지를 표시하도록 구현했다. 이미지 실패 시 제거하여 이름과 설명을 유지한다. 대형 홍보 스크린샷은 사용하지 않는다.

이전 Phase 3.9의 개시자 50 표시는 수정했다. 한국어 7월 페이지 안의 **영어 섹션**에 치유량 50→40 및 재사용 대기시간 5→4초가 명시되어 있다. 이전 한국어 키워드만의 검토가 이를 놓쳤다. 현재 공통 효과는 치유량 40이며 둠피스트는 로켓 펀치 발동 설명을 유지한다. 8~11월 접근 가능한 월별 페이지를 한국어/영어 키워드로 재확인했으며 추가 개시자 변경은 찾지 못했다. 이는 전체 변경 기록의 완전한 색인을 보장하지는 않는다. 화면에는 검증된 핵심 치유량만 간결하게 표시한다.

## 선택 버튼

지표·기간·패치 버튼은 어두운 배경, 얇은 테두리, 흰 수치와 회색 라벨을 쓴다. 선택 상태는 약한 오렌지 배경·테두리·하단 2px 강조선이다. hover는 확대·밝기 필터 없이 미세하게 바뀌고 전환은 180ms이다. reduced-motion에서는 전환을 끈다. 파란 키보드 포커스는 선택된 오렌지 상태와 구분하며 최소 터치 영역은 44×44px이다. aria-pressed와 네이티브 버튼 조작, 재렌더 시 포커스 복원을 유지한다.

## 검증과 미완료

- 전체 테스트: **88개 통과**. 패치 검증/미확인, 동일·다른 패치, 코호트 혼합 방지, 출시 전/누락 기록, 대표값·dry-run, 54명 마크 연결, 패치 보기 전환·현재 점 폴백, 기존 지표 전환 및 회귀 검증.
- 프로덕션 빌드 및 Pages 자산 검증 통과.
- 실제 dry-run에서 기존 스냅샷 전체 보존. public/data/snapshots 파일·인덱스 변경 없음.
- 브라우저 도구가 'No browser is available'을 반환했다. 375px/390px/1440px 실제 시각·터치·overflow·스크린샷 검증은 미완료다. DOM 및 CSS 검증을 실제 브라우저 검증으로 주장하지 않는다.
- 마크 실제 표시는 재사용 허가 확인 전까지 보류, 실제 패치별 추이와 비교는 검증된 원본 집계 구간·복수 패치 관측 자료 확보 전까지 보류다.

## 출처

- https://overwatch.blizzard.com/en-us/rates/
- https://overwatch.blizzard.com/ko-kr/news/patch-notes/
- https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/07/
- https://overwatch.blizzard.com/ko-kr/heroes/
- https://blizzard.gamespress.com/en-AU/Overwatch-Spotlight-2026
- https://www.blizzard.com/legal/511dbf9e-2b2d-4047-8243-4c5c65e0ebf1/
- 원본 마크별 출처: src/data/subroles.json 및 docs/research/subroles/official-review.json

## 변경 파일

새 파일: `src/data/patchCatalog.js`, `src/models/patchHistoryModel.js`, `src/models/snapshotRetentionModel.js`, `scripts/snapshot-retention-dry-run.js`, `tests/patchHistory.test.js`, `docs/research/subroles/phase310-review.json`, 본 문서.

수정: `src/services/statisticsService.js`, `src/services/snapshotService.js`, `src/models/pickHistoryModel.js`, `src/controllers/routingController.js`, `src/views/pickHistoryView.js`, `src/views/heroDetailView.js`, `src/data/subroles.json`, `src/models/subroleModel.js`, `src/styles/detail.css`, `scripts/collect-snapshot.js`, `tests/metricHistory.test.js`, `tests/subroles.test.js`.

Meta Score v2·티어 계산·카운터 DB·통계 정렬/필터·즐겨찾기·특전·모바일 메인 카드 정책은 변경하지 않았다.
