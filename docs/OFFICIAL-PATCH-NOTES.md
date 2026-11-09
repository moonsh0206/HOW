> Latest complete implementation: [OFFICIAL-PATCH-NOTES-COMPLETE.md](OFFICIAL-PATCH-NOTES-COMPLETE.md). Historical initial report follows.

# 공식 패치노트 감지 준비 및 영웅 변경 UI

검증일: 2026-11-09 (Asia/Seoul). 실제 로컬 코드와 공식 한국어/영문 HTML을 확인하여 구현했다. Commit/Push/PR/배포/예약 실행은 하지 않았다.

## 기존 자동 갱신 여부

기존 메인 카드는 `currentPatchNote.js`의 11월 3일 고정 객체였다. `patchCatalog.js`와 기존 snapshot collector/workflow는 이미 검토한 패치 메타데이터를 이용하는 통계 수집 준비 기능이며 **공식 새 노트를 찾아 갱신하는 기능이 아니었다**. 기존 예약 예시도 주석 상태였다.

이번에 공식 노트 감지와 검토/정규화 코드를 추가했다. **현재도 스케줄과 자동 게시는 활성화하지 않았다.** 수동 감지 → 출처 검토 → 로컬 JSON 반영 → 별도 승인된 빌드/게시의 단계를 분리한다.

## 확인한 공식 노트

|공식 ID / 날짜 라벨|한국어 제목 날짜|구분|관련 초기 검증|
|---|---|---|---|
|[patch-2026-11-03](https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/11/#patch-2026-11-03)|2026-11-04|밸런스|아나·겐지|
|[patch-2026-11-05](https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/11/#patch-2026-11-05)|2026-11-06|핫픽스|레킹볼|

두 언어의 `/news/patch-notes/live/`와 2026/11 월별 URL을 일반 HTTPS GET으로 HTTP 200 확인했다. 공개 HTML의 ID, 날짜, 제목, 기술 변경 구조를 대조했다. 한국어 제목 날짜와 공식 ID/날짜 라벨이 하루 다르므로 `publishedDate`(공식 라벨), `localizedTitleDate`를 별도 보존한다. 어느 것도 정확한 배포 시각으로 바꾸지 않았고 `effectiveAt:null`이다. 영웅 카드는 공식 라벨 3일/5일, 메인 카드는 한국어 제목 날짜인 6일을 사용한다.

이번 확인 범위의 공식 최신 노트는 11월 5일 핫픽스였다. 공개 HTML에서 API/RSS autodiscovery를 확인하지 못했으며, 이것이 가능한 모든 공식 API/RSS의 부재를 증명한다는 뜻은 아니다. 확인되지 않은 내부 API는 사용하지 않는다.

## 데이터와 화면

유일한 UI 데이터 원본은 **`public/data/patches/notes.json`**(5,475 bytes)이다. 브라우저는 BASE_URL의 `data/patches/notes.json`을 한 번 읽고, 공유 Model을 통해 메인·상세에 반영한다. `currentPatchNote.js`의 고정 객체는 제거하고 순수 selector의 호환 진입점으로 바꿨다. 패치별 변경을 여러 JS 파일에 복사하지 않았다.

기존 통계용 `patchCatalog.js`와 `CURRENT_STATISTICS_PATCH=null`은 변경하지 않았다. 이 카탈로그는 통계 집계창 검증에 필요한 별도 기록이다. 새 공식 노트가 있다는 사실만으로 현재 OverFast 통계나 그래프의 패치를 확정하지 않는다.

초기 검토 완료: **3영웅 / 4변경**.

|영웅|해당 영웅의 최근 검증 날짜|기술/내용|HOW 분류|
|---|---|---|---|
|아나|2026-11-03|생체 수류탄 폭발 피해 90 → 60|너프|
|겐지|2026-11-03|튕겨내기 2초 → 1.5초|너프|
|레킹볼|2026-11-05|갈고리 회수 중 기본 속도 제한 15% 증가|버프|
|레킹볼|2026-11-05|회수 중 아군 가속 효과가 제한 속도에 반영|버프|

레킹볼의 절대 제한 속도 전후 값은 주어지지 않아 before/after를 null로 보존했다. 상대 증가량을 절대 속도로 만들지 않는다. buff/nerf는 HOW의 문맥 검토 분류이며 공식 통계적 성능 평가가 아니다.

새 핫픽스로 아나·겐지의 이전 이력을 덮어쓰지 않는다. 각 영웅은 자신의 최근 **검증된** 관련 변경을 최대 3개 표시한다. 확인된 정보가 없으면 패널을 생략한다. 미검토 영웅에게 변경이 전혀 없다고 단정하지 않는다.

우측 순서: **최근 패치 변경 → 카운터 → 시너지 → 지속 능력**. 제목·날짜·분류·기술명·수치·짧은 자체 요약·공식 링크만 제공한다. 기존 세 영역과 특전 선택률은 유지한다. 모바일은 기존 세로 흐름을 따른다. 메인은 검증된 11월 5일 핫픽스로 갱신했다. 11월 3일의 기존 메인 자체 요약/주요 변경 목록도 같은 JSON의 해당 이력에 보존했다.

## 감지·파싱·검토 게이트

`scripts/lib/officialPatchParser.js`는 JSDOM으로 공개 HTML을 읽으며 스크립트/이미지를 실행·수집하지 않는다. `.PatchNotes-patch.PatchNotes-live`, 공식 anchor, 제목, section 및 hero/ability 목록을 기준으로 추출한다. 구조나 ID가 달라지면 실패하여 정상 파일을 보존한다. 고정 월별 URL도 실제 응답의 ID가 일치하는지 확인한다.

- 영웅명은 기존 검증된 한/영 영웅 메타데이터의 정확한 key로 연결한다. 유사도 매칭은 없다.
- 기본 라이브, 명시된 6v6, 스타디움 section을 분리한다. 스타디움의 겐지 변경을 라이브 튕겨내기와 혼합하지 않는다.
- 숫자 변경에 보수적 분류를 제안하지만 자동으로 검증 완료로 바꾸지 않는다. 재사용 대기 감소와 피해 감소는 일반 방향을 참고하고, 지속 시간·받는 피해·복수 효과처럼 애매한 경우 adjustment/검토 대상으로 둔다.
- 이번 구조화 추출 후보는 **56건: 라이브 48 / 스타디움 7 / 6v6 1**. 초기 4건을 제외한 **52건은 검토가 필요**하다. 비정형 일반/버그 수정 문단은 영웅을 임의 추론하여 자동 연결하지 않는다. 전체 원문을 완전히 구조화했다고 주장하지 않는다.
- 원문 전체/개발자 의견을 공개 JSON에 복제하지 않는다. 짧은 자체 요약, 사실 수치, 공식 링크와 검증 해시를 남긴다. 검토 대기 보고서에도 원문 전체 대신 기술명·수치 후보·해시를 기록한다.
- `review.json`은 한/영 원문 해시와 각각의 변경 ID, 검토일, 자체 요약·분류를 명시한다. 원문과 수치/영웅/모드가 맞는 경우에만 verified 변경으로 반영한다. 한국어가 `??`나 대체 문자로 손상된 자료도 거부한다.

[검토 파일](research/official-patches/review.json), [실제 감지 결과](research/official-patches/detection.json).

## 수동 실행

프로젝트 루트에서:

```powershell
# 기본 동작도 dry-run: 공식 원문 확인/정규화/중복 판정, 공개 JSON 미변경
node scripts/collect-official-patch-notes.js --dry-run --report docs/research/official-patches/detection.json

# 검토한 원문 해시와 항목이 정확히 일치할 때만 로컬에 반영
node scripts/collect-official-patch-notes.js --apply --review docs/research/official-patches/review.json
```

최종 실제 dry-run에서 11/05·11/03을 감지했고 **둘 다 동일 기록으로 건너뛰었으며 추가·게시 0건**이었다. 초기 로컬 UI JSON은 실제 한/영 HTML에서 추출한 항목에 수동 검토 파일을 적용해 구성했다.

같은 ID라도 한/영 원문 해시가 변경되면 새 검토가 필요하다. 승인된 수정본은 이전 revision을 삭제하지 않고 추가할 수 있다. 정확히 같은 ID·양쪽 해시는 중복 저장하지 않는다. 기존 JSON을 먼저 검증하고, apply는 배타 lock → 고유 임시 파일 → 재검증 → fsync/rename 순서로 갱신한다. 네트워크·파서·검증·rename 실패 시 기존 정상 바이트를 보존하며 자신이 만든 임시 파일/lock만 정리한다. 검토 보고서 경로로 정상 JSON을 덮어쓰는 것도 차단한다.

`--apply`는 로컬 파일 반영이며 Git Commit/Push/PR/공개 게시를 수행하지 않는다. `--report`만으로 무검토 후보가 UI에 노출되지 않는다.

## 워크플로와 추가 승인

`.github/workflows/official-patch-notes.yml`은 `workflow_dispatch` 수동 실행 + dry-run 보고서 아티팩트만 설계했다. `contents:read`, checkout credentials 미보존이며 write/PR/deploy 단계가 없다. 6시간 주기 예시는 **주석**으로만 남겼다. 이번에 원격에서 실행하거나 예약 활성화하지 않았다.

자동 운영에는 별도 승인이 필요하다.

1. 예약 주기·호출량과 Actions 실행 활성화.
2. 신규/수정 노트의 사람 검토 정책과 검토 책임.
3. 필요 시 승인된 브랜치 Commit/Push 또는 PR 권한.
4. Pages 공개 배포 단계 및 권한.

감지와 게시를 같은 단계로 묶지 않는다. CORS 우회/비공개 엔드포인트/임의 원격 쓰기는 없다.

## 검증 결과

- **전체 192/192 테스트 통과**. 신규 7개 테스트는 감지·ID 중복·개정 검토·한/영 증거·한국어 요약·분류·모드·실제 4건·원자 저장·오류 보존·공유 UI/포커스를 검증한다.
- `npm.cmd run build`, `npm.cmd run verify:pages`: 통과, `/HOW/`, 자산 11개.
- preview 대상 verify:pages: 공식 패치 JSON 포함 실제 HTTP 성공 및 MIME 통과.
- Chrome **1440/390/320px**에서 아나·겐지·레킹볼 9조합을 검사했다. 수치/날짜/한국어 요약/링크·우측 4영역 순서·특전 4개 막대 유지, 가로 넘침 0, JS 오류 0. 키리코에는 검증된 변경이 없어 빈 패널이 생기지 않음을 확인했다.
- 공식 JSON과 특전 JSON은 실제 빌드 서버에서 그대로 읽었다. 별도 OverFast 요청은 실제 API에서 캡처한 영웅 상세 및 기존 통계 fixture를 사용했다. 이 작업이 전체 외부 통계의 새로운 검증을 의미하지 않는다.
- 최초 시각 검사에서 한국어 요약 인코딩 문제를 발견해 수정했고, 데이터 validator와 테스트·브라우저 검사에 손상 문자열 거부를 추가한 뒤 최종 화면을 다시 저장했다.
- 원본 스냅샷·특전 JSON·Meta/S-A/HOT·통계 패치 카탈로그·카운터·시너지·하위 역할 등 보호 파일 **14개 SHA-256 불변**: [기록](research/official-patches/protected-files.json).
- `git diff --check`, `git status` 확인. 실제 휴대폰/iOS Safari/스크린리더는 미검증.

실제 화면:

- [PC 아나 90→60](research/official-patches/qa/1440-ana.png)
- [모바일 겐지 2→1.5초](research/official-patches/qa/390-genji.png)
- [320px 아나](research/official-patches/qa/320-ana.png)
- [메인 핫픽스 카드](research/official-patches/qa/1440-main.png)
- [실측 결과](research/official-patches/qa/results.json)

## 변경 파일

- 데이터: `public/data/patches/notes.json`, 기존 `src/data/currentPatchNote.js`의 고정 데이터 제거.
- Model/Service/View: `officialPatchModel.js`, `officialPatchService.js`, `heroPatchView.js`, `patchNoteView.js`.
- 통합: `main.js`, `routingController.js`, `heroDetailView.js`, `insightView.js`, `detail.css`.
- 수집/검증: `collect-official-patch-notes.js`, `lib/officialPatchParser.js`, `qa-official-patches.cjs`, `verify-pages.js`.
- 테스트: `officialPatches.test.js`, `mainMapAndPatch.test.js`, 새 API 상세 캡처 `fixtures/patch-detail-heroes.json`.
- 워크플로: `official-patch-notes.yml`(수동 감지 설계만).
- 이 문서와 `docs/research/official-patches`의 검토·감지·검증 기록.

남은 범위는 나머지 후보의 문맥 검토, 비정형 버그 수정 처리 확장, 미래 공식 HTML 변경 대응, 승인 후 자동 운영이다. 현재 4건 이상의 검토 완료를 주장하지 않는다.
