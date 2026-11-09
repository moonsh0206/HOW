# 공식 패치노트 하루 1회 갱신과 Pages

검증일: 2026-11-09. 로컬 구현과 격리 검증을 완료했다. 이 작업에서 Commit/Push/PR/배포, 원격 워크플로 실행/설정 변경을 수행하지 않았다. **아래 YAML은 사용자가 검토 후 main에 반영하면 작동할 설정이며 현재 공개 사이트에 활성화됐다는 의미가 아니다.**

## 실행 흐름

`.github/workflows/official-patch-notes.yml`:

1. `schedule: '0 1 * * *'` = UTC 01:00 / KST 10:00, 하루 1회. workflow_dispatch도 유지.
2. 읽기 전용 prepare job에서 정확한 실행 SHA를 checkout하고 npm ci.
3. 기존 collector를 재사용해 한국어/영어 공식 라이브 HTML과 월별 고정 링크를 교차 확인. 최신 표시 월과 저장된 최근 2개 월을 최대 3개 월 범위로 검사한다. 기본 4회, 월 경계 최대 8회 GET이며 전체 아카이브를 크롤링하지 않는다. 과거의 더 오래된 월 수정은 수동 확인 범위다.
4. 전체 영웅 매핑/수치/단위/모드/방향을 기존 규칙으로 검증한다. 정성적/모호한 변경은 pending 보고서로 남긴다. 새 영웅은 매핑 갱신이 필요하며 추측 연결하지 않는다.
5. 임시 후보 파일에 수집 → JSON 검증 → 기존 이력/65개 사실 보존 검증 → 원자적 notes.json 교체. 수집/파싱/후보 검증 실패 시 정상 JSON을 교체하지 않는다.
6. 변경된 후보만 test/build/verify:pages를 실행한다. 검증된 JSON 및 dist를 아티팩트로 올린다.
7. publish job이 main SHA, notes-only 변경 범위, SHA-256 후보 해시를 다시 확인한다. 검증된 `public/data/patches/notes.json` **하나만** add/commit/push한다. 보고서와 다른 파일은 커밋하지 않는다.
8. 같은 실행에서 이미 테스트한 Pages 아티팩트를 deploy-pages에 전달한다. 별도 push 워크플로가 실행될 것이라고 가정하지 않는다.

새로운 영웅 변경이 없어 원문 해시가 같으면 정상 JSON 바이트/mtime을 유지한다. 이 경우 테스트·빌드·커밋·배포 모두 생략한다(npm ci와 감지/보고서 보관은 수행). 검토 대상만 발견되어 게시 가능한 새 사실이 없는 경우에도 배포하지 않는다.

## 부분 검증과 이력

- `verificationStatus:'verified'`는 공개한 사실의 검증을 뜻한다. 신규 패치의 `reviewStatus:'partial'|'complete'`와 `coverage.verified/pending/sourceCandidates`를 별도로 기록한다.
- 부분 반영 시 미검증 건수는 notes의 coverage, 수집 보고서, 갱신 보고서의 partial 목록에 남긴다. 미검증 사실은 changes에 넣지 않는다. 전체가 검증된 것처럼 간주하지 않는다.
- 같은 ID라도 원문 해시가 바뀌면 새 revision으로 보존한다. 이전 revision과 검증 사실은 삭제하지 않는다. 같은 해시의 pending 자료는 추가 검토 후 확장할 수 있지만 기존 검증 사실을 지우지는 못한다.
- 한국어 표시 날짜와 공식 ID 날짜, 실제 적용 시각(null), 통계 집계창 미확인을 구분한다. 공식 패치가 바뀌었다는 이유로 OverFast 통계의 패치를 확정하지 않는다.
- 메인과 영웅 상세는 기존 단일 notes.json 서비스/모델을 공유한다. 변경되지 않은 영웅의 마지막 관련 날짜는 유지된다. 5v5/6v6/스타디움 구분도 유지한다.

## 권한·동시 실행·실패 복구

- workflow 기본/prepare: contents:read. checkout 인증 정보 보존 안 함.
- publish만 contents:write/pages:write/id-token:write. 기본 GITHUB_TOKEN 사용. PAT/별도 외부 프록시 불필요.
- 기존 `pages.yml`은 변경하지 않았다. 두 워크플로의 concurrency group을 동일한 `pages`로 공유하고 cancel-in-progress:false로 직렬화한다. GitHub의 pending 실행 대체 가능성은 남지만 main SHA 검증으로 오래된 후보 게시를 막는다.
- GITHUB_TOKEN push는 별도 Pages push 빌드를 유발하지 않으므로 자동 패치 갱신의 이중 배포를 피한다. 일반 사용자의 소스 Push는 기존 pages.yml을 사용한다.
- main이 검사 이후 바뀌면 차단한다. 일반 non-fast-forward push 실패도 배포를 중단한다. force-push/브랜치 보호 우회는 없다.
- JSON commit 성공 후 배포만 실패했다면 **같은 실행의 Re-run failed jobs**로 복구한다. main이 정확히 그 notes-only commit이고 부모 SHA/파일 해시가 일치할 때만 resume으로 인정해 중복 commit 없이 같은 빌드 아티팩트를 재배포한다. 다른 소스가 섞이면 거부한다.
- Pages 아티팩트 7일, JSON 후보 14일, 검토/실패 보고서 30일 보관. 아티팩트 만료 또는 main 진행으로 재시도할 수 없으면 사용자가 기존 Pages 워크플로를 수동 실행해 현재 main을 배포한다. 변경 없는 다음 날 감지만으로 실패한 배포가 자동 재생성되는 것은 아니다.
- 브랜치 보호로 직접 Push가 금지된 경우 실패 상태를 유지한다. 후보/보고서 아티팩트를 검토해 **사용자가 승인 PR을 만들고 병합**하는 운영으로 전환해야 한다. 이 작업에서는 자동 PR이나 보호 우회를 추가하지 않았다.

## 실제 검증 결과

### 실제 공식 페이지 읽기 전용 검사

기존 collector의 `--dry-run`으로 공식 KO/EN 라이브와 2026/11 고정 페이지를 조회했다. 발견한 ID는 11/05 및 11/03, 기존 2개 patch/65개 영웅 사실과 동일했다. added 0, updated 0, pending 0, applied:false. [읽기 전용 결과](qa/patch-automation/live-check.json). production notes.json/통계 스냅샷은 변경하지 않았다.

### 격리 시나리오

가상 신규 패치는 테스트 임시 디렉터리에서만 사용하고 production JSON에는 저장하지 않았다.

|상황|검증 결과|
|---|---|
|A 새 패치 없음|바이트/mtime 불변, changed=false, 게시 경로 생략|
|B 새 수치 변경|새 JSON/영웅 반영, 원본 65건 보존, 메인/영웅 동일 소스|
|C 불확실 변경|pending 보관, 일부 검증은 partial, 전부 불확실하면 미게시|
|D 네트워크/HTML 구조 오류|실패 보고, 정상 파일 보존|
|E 재실행|중복 revision/기록/게시 후보 없음|
|F 잘못된 JSON/이력 삭제/해시 오류|후보 설치 및 게시 차단|
|월 경계|신규 12월과 기존 11월 분리 확인, 6회 GET, 이력 보존|
|배포 재시도/main 변경|정확한 notes-only 재시도 허용, 다른 SHA/소스/해시 차단|

실제 YAML 파서(`yaml`, 개발 의존성)로 문법 및 중복 키를 검사하고, cron/UTC-KST, changed 조건, 최소 권한, 경로 제한, Pages 공유 lock, main SHA 가드를 테스트했다. 가상 후보로 별도 public/dist를 만들어 **실제 Vite production build 및 verify:pages**까지 통과했다. UI/통계 코드는 변경하지 않았다. 실제 GitHub runner/토큰 권한/Push/배포는 실행하지 않았으므로 그 부분의 운영 성공까지 주장하지 않는다.

`npm.cmd test`: 최종 210개 테스트 통과. `npm.cmd run build`, `npm.cmd run verify:pages`, `git diff --check` 통과. 기존 모바일/PC DOM 회귀 테스트도 포함한다. Chrome 390px/1440px에서 겐지·아나·리퍼·D.Mon·키리코 총 10개 화면의 패치 카드/탭/뒤로 가기/지표/즐겨찾기/특전/가로 넘침을 확인했다. production 패치·특전 JSON과 저장된 실제 OverFast 응답으로 재현했으며 실제 터치 기기는 미검증이다. [브라우저 결과](qa/patch-automation/browser/after/results.json), [모바일](qa/patch-automation/browser/after/390-genji.png), [PC](qa/patch-automation/browser/after/1440-genji.png).

## 사용자가 해야 할 최초 활성화

1. 변경사항 및 YAML의 자동 기록/배포 범위를 검토한다. source/lockfile/매핑/테스트도 함께 main에 반영한다. notes.json만 먼저 Push하면 새 코드가 설치되지 않는다.
2. GitHub Settings → Pages → Source를 **GitHub Actions**로 설정/확인한다.
3. Settings → Actions → General에서 해당 Actions 사용을 허용하고 저장소/조직 정책이 publish job의 contents:write 및 Pages/OIDC 권한을 허용하는지 확인한다. 별도 secret은 필요하지 않다.
4. `github-pages` Environment의 배포 브랜치를 main으로 제한한다. 필수 승인자가 있으면 매 배포는 승인 대기하므로 완전 무인 운영이 되지 않는다. 무인 게시 허용 여부는 사용자가 결정한다.
5. main 브랜치 보호/Ruleset을 확인한다. 직접 기록을 금지하는 정책이면 우회하지 말고 승인 PR 운영을 선택한다.
6. 사용자가 직접 main에 Push한 후 Actions에서 Daily official patch notes and Pages의 workflow_dispatch를 한 번 실행한다. 변경이 있으면 실제 JSON 기록/배포까지 진행되는 워크플로임에 유의한다. 변경이 없으면 publish가 skipped인지 확인한다.
7. 이후 schedule은 기본 브랜치에 설치/활성화되어 있어야 동작한다. 기본 브랜치가 main이 아니면 현재 가드가 실행을 막으므로 먼저 정책을 맞춘다.
8. 실패 시 review 아티팩트와 job 로그를 확인한다. 자동 분류 불가능한 항목은 검토 매핑을 추가해 main에 반영한 뒤 다시 실행한다.

예약 10:00은 정확한 실행 보장이 아니다. 정각 부하로 지연/누락될 수 있고, 공개 저장소는 60일 활동이 없으면 예약 작업이 비활성화될 수 있다. 요청한 cron은 그대로 유지했다. [GitHub 예약 실행 문서](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [지연 안내](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows).

[GitHub Pages 권한 문서](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [GITHUB_TOKEN과 Pages 빌드](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 변경 파일

- `.github/workflows/official-patch-notes.yml`
- `scripts/collect-official-patch-notes.js`
- `scripts/prepare-official-patch-update.js`
- `scripts/install-official-patch-candidate.js`
- `scripts/check-patch-publication-revision.js`
- `scripts/qa-patch-automation.cjs`
- `scripts/lib/patchPublication.js`
- `tests/patchAutomation.test.js`, `tests/officialPatchComplete.test.js`, `tests/fixtures/official-patch-november-complete.json`
- `package.json`, `package-lock.json`(YAML 검증 개발 의존성)
- 본 문서, 기존 문서의 최신 안내 링크/일정 설명 및 `docs/qa/patch-automation/` 검증 자료.

보호: 기존 pages.yml, Meta/티어/필터/통계 코드, 전체 원본 JSON, 모바일/영웅 상세/UI/로고/배경 이미지는 변경 없음.
