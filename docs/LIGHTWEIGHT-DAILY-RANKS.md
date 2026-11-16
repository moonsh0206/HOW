# 일일 역할별 HOW 순위 운영 연결

## 구현과 저장 범위

`.github/workflows/daily-ranks.yml`이 매일 01:00 UTC(10:00 KST)에 실행하도록 준비되어 있다. main에서만 실행되며 `HOW_RANKS_ENABLED=true`가 필요하다. 현재 로컬 변경만 있으며 원격 활성화·Commit·Push·배포는 하지 않았다. 기존 proposal 파일은 과거 예제이고 실제 활성화 대상은 이 워크플로다.

기존 OverFast 서비스 및 `createHeroModel().sortedHeroes()`를 그대로 사용한다. 한국어 영웅 정보 1회와 원본 통계 최대 27회로 3개 지역 × 16개 등급 조합을 계산한다. 파생 등급은 메모리에서 기존 결합 로직으로 계산한다. 승률·픽률·밴률·Meta Score 원본은 일일 순위 파일이나 작업 artifact에 저장하지 않는다.

`public/data/ranks/current.json` 하나에 각 필터의 최신 돌격·공격·지원 최종 영웅 순서, 정책·로스터·수집 시각, 이전 날짜 대비 정수 delta만 저장한다. 과거 날짜별 파일을 만들지 않으며 새 순위가 이전 배열을 대체한다. 최대 48개 조합이다. 일부 실패 조합은 마지막 유효 기준만 유지하고 날짜 검증으로 오래된 비교 표시를 막는다. 전체 수집 실패 시 게시를 중단한다. null 역할은 미분류 데이터가 있어 표시 대상이 아니다.

최초 수집일은 comparison=null이다. 같은 정책·로스터·patch/window의 연속 보고일 두 개가 있어야 ▲/▼/=를 계산한다. 날짜 누락, 정책 변경, 영웅 추가·역할 변경에는 비교를 숨긴다. 같은 보고일 재실행은 성공한 조합을 다시 수집하지 않는다. 보고일은 10:00 KST에 시작하며 실제 관측 시간을 기록한다.

UI는 기존 한국어·영어 표시를 사용한다. 특정 역할과 HOW 티어 정렬에서만, 현재 전체 역할 순서가 저장된 배열과 정확히 같을 때 표시한다. 전체 역할·다른 정렬·오래된 데이터·순서 불일치는 숨긴다. 검색과 즐겨찾기는 원래 순번을 유지한다. 영어 동률 순서가 다른 경우에도 잘못된 표시 대신 숨긴다.

## 게시와 기준 교체

1. 마지막 성공한 공개 Pages JSON을 HTTPS로 복원한다. 복원 실패 시 중단하며 빈 기준으로 덮어쓰지 않는다.
2. 메모리 계산 결과를 로컬 candidate로 원자적으로 저장한다. 테스트·빌드·Pages 경로 검증을 통과해야 진행한다.
3. main revision 변경 여부를 확인하고 전체 Pages artifact를 게시한다. 일반 Pages 및 공식 패치 게시와 동일한 `pages` lock을 사용한다.
4. `deploy-pages` 성공 후 `verify-rank-publication.js`가 공개 JSON과 빌드 candidate의 digest를 확인한다. CDN 지연은 최대 12회, 5초 간격으로 확인한다. 일치해야 성공 receipt를 7일 artifact로 남긴다. 원본 통계는 포함하지 않는다.
5. 다음 실행은 성공적으로 공개된 JSON을 기준으로 사용한다. 배포 전에는 공개 기준을 수정하거나 삭제하지 않는다. 성공한 Pages 교체 자체가 오늘 배열을 내일 기준으로 승격하며, 이전 배열은 새 사이트에 남지 않는다. 빌드·수집·배포 실패는 마지막 공개 기준을 보존한다. 배포 성공 후 HTTP 검증만 실패하면 실제 공개 상태를 다음 실행에서 다시 복원한다.

일반 Pages와 공식 패치 게시도 활성화 후에는 공개 순위를 복원한 뒤 빌드하여 빈 bootstrap 데이터로 덮어쓰지 않는다. 영웅 그래프의 패치별 스냅샷, index와 HOT 데이터는 수정·삭제하지 않는다. 기존 스냅샷 수집 워크플로도 변경하지 않았다.

## 로컬 운영 테스트

```powershell
node scripts/test-daily-ranks-live.js --run
```

실제 OverFast API → 기존 점수 계산 → 최종 순위만 저장 → 로컬 HTTP 공개 → 실제 브라우저 서비스로 재조회 → 동일 날짜 중복 수집 방지를 점검한다. 파일은 gitignore 대상인 `test-results/daily-ranks-live/`에만 저장한다. 실행 전후 `public/data/snapshots` 전체 파일 해시도 비교한다. 원격 게시·가짜 날짜·원본 통계 파일은 만들지 않는다.

동일 명령을 다음 보고일에 실행하면 실제 전일 순위와 비교한다. 같은 날 여러 번 실행해도 이틀 수집을 가장하지 않는다. 실제 운영 기준을 읽어 점검하려면 다음과 같이 실행한다.

```powershell
node scripts/test-daily-ranks-live.js --run --published-url https://YOUR_SITE/HOW/data/ranks/current.json
```

2026-11-16 09:31 KST 실제 점검: 원본 통계 요청 27회, 48개 조합 저장 및 HTTP 재조회 통과, comparison 0건(최초 수집), 보호 스냅샷 해시 동일. 10시 이전이므로 보고일은 11월 15일이다. 상세 결과: `test-results/daily-ranks-live/report.json`. 원격 Pages 배포 및 실제 연속 이틀 비교는 아직 실행하지 않았으며, 별도로 검증해야 한다.

자동 테스트는 최초/둘째 날, 양방향/동일 순위, 누락일, 정책/로스터 변경, 역할과 정렬 제한, 현재 순서 불일치, API 실패, 원자 교체 실패, 원본 필드 거부, 게시 후 CDN 불일치·503·재시도 성공을 검사한다.

최종 로컬 결과: 전체 회귀 테스트 277/277 통과, 프로덕션 빌드 및 440개 KO/EN 정적 진입점 생성 통과, Pages 파일 검증 및 `git diff --check` 통과. Windows 샌드박스의 자식 프로세스 제한 때문에 전체 테스트와 Vite 빌드는 허용된 제한 밖 로컬 실행으로 검증했다. 원격 변경은 없었다.

## 승인 후 활성화 절차

1. 변경을 검토한 뒤 승인된 Commit·Push로 일반 Pages 배포를 한 번 수행한다. 이때 `HOW_RANKS_ENABLED`는 비활성 상태여야 한다. 빈 `data/ranks/current.json` HTTPS endpoint를 먼저 만든다.
2. Pages source를 GitHub Actions로 설정하고 github-pages 환경의 배포 권한을 확인한다. 저장소 변수 `HOW_RANKS_URL`에 정확한 HTTPS JSON 주소를 지정한다.
3. `HOW_RANKS_ENABLED=true`로 설정한다. 예제 파일 이동이나 두 번째 일일 수집기 설치는 필요 없다. 새 `daily-ranks.yml`을 수동 실행한다.
4. 첫날 receipt의 digest와 공개 JSON, comparison=null을 확인한다. 다음 날 10시 예약 실행 후 comparison 날짜가 전일인지 확인한다. 실제 화면 순서가 일치하는 역할에서만 표시되는지 KO/EN으로 확인한다.
5. 실패한 실행에서 기준이 바뀌지 않는지, 일반 Pages·공식 패치 게시 후에도 순위가 유지되는지 확인한다. 즉시 중지하려면 일일 workflow를 Disable하고 복원 변수는 유지한다. `HOW_RANKS_ENABLED`를 끄면 일반 배포의 기준 복원도 꺼지므로 빈 파일 재게시 위험이 있다.

GitHub Actions schedule은 10시 실행을 요청하지만 지연될 수 있다. 정확한 시각 실행을 보장하지 않으므로 관측 시각을 10시로 위조하지 않는다. 공식 문서: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
