# 공식 패치 자동 반영 누락 수정

점검일: **2026-11-22 KST**. 로컬 구현과 검증만 수행했다. Commit, Push, Actions 수동 실행, 배포 및 GitHub 설정 변경은 하지 않았다. 기존 미커밋 UI 변경을 보존했다.

## 실제 운영 상태와 원인

- 조사 시작 시 로컬 HEAD와 원격 main은 `3fb4de2d5595a741141413f94d637363e363f06f`로 동일했다. 이후 변경은 모두 로컬 미커밋 상태다.
- 기존 `official-patch-notes.yml`은 **active**다. cron은 `0 1 * * *`(10:00 KST)이며 새 워크플로를 만들지 않았다.
- 조회된 예약 실행 12개는 모두 성공으로 표시된다. 그러나 **11월 16~21일의 6회는 prepare 성공 / publish 건너뜀**이다. 수집 서버 오류나 게시 권한 오류가 아니었다.
- 가장 최근 [예약 실행](https://github.com/moonsh0206/HOW/actions/runs/44882903597)은 2026-11-21 08:01:24Z, 즉 **11월 21일 17:01:24 KST**에 생성됐다. 지정 cron과 실제 실행 시간에는 차이가 있었다.
- 해당 prepare 로그는 `patch-2026-11-16`을 감지했지만 `added: []`, `changed: false`, `status: unchanged`, `pendingChanges: 0`으로 종료했다. 변경 후보가 없으므로 테스트·빌드·publish가 정상 조건식에 의해 건너뛰어졌다.
- 원인 1: 기존 파서는 영웅 변경만 추출해 경쟁전 섹션을 읽지 않았다.
- 원인 2: `if (!changes.length && !r) { continue; }`가 영웅 변경 없는 새 패치 전체를 버렸다. 검토 대기에도 남지 않아 성공 실행처럼 보였다.
- 공개 Pages JSON과 원격 main JSON의 최신 기록은 모두 **11월 5일**이었다. 저장소 기본 JSON과 공개 JSON을 각각 조회했다.
- notes.json의 마지막 커밋은 [9beafab1](https://github.com/moonsh0206/HOW/commit/9beafab1fd7a6d06d266370ff08d9fb7b67abaa1), 2026-11-09 02:13:42Z(11:13:42 KST), 일반 작업 커밋이다. 조사한 11월 16일 이후에는 패치 자동화의 JSON 커밋/배포가 없었다.
- 별도 일반 Pages 배포는 [44907825594](https://github.com/moonsh0206/HOW/actions/runs/44907825594)에서 2026-11-21 13:15:31Z(22:15:31 KST)에 성공했다. 사이트 배포 성공과 패치 데이터 최신화 성공은 서로 다르다.

근거: [운영 API 점검](qa/official-patch-repair/audit.json), [최신 prepare 로그의 실제 수집 결과](qa/official-patch-repair/latest-run-collection.txt), [최신 작업 단계](qa/official-patch-repair/jobs-44882903597.json), [Pages 배포 상태](qa/official-patch-repair/deployment-status.json).

## 11월 16일 공식 핫픽스 대조

공식 [한국어](https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/11/#patch-2026-11-16)와 [영어](https://overwatch.blizzard.com/en-us/news/patch-notes/live/2026/11/#patch-2026-11-16) 원문을 직접 내려받아 대조했다. 웹 열기 도구는 403이었지만 Node 읽기 전용 요청은 두 언어 모두 HTTP 200이었다. 내려받은 원문을 보존한 회귀 테스트와 네트워크 점검을 분리했다.

- 공식 anchor 및 날짜 라벨: `2026-11-16`.
- KO 제목 문자열: **11월 17일**. EN 제목 및 공식 날짜 라벨: **11월 16일**. 제목의 번역 날짜 차이를 덮어쓰지 않고 별도로 보존했다.
- 유형: 라이브 핫픽스.
- 내용: 6v6 자유 모드 경쟁전의 챔피언 포함 그룹 최대 **등급 폭** 4 → 3. 그룹 인원 수 4명 → 3명이라는 의미가 아니다.
- 5v5 역할 고정의 챔피언 포함 좁은 그룹 허용 폭과 맞춘다는 문맥을 양쪽 원문에서 확인했다.
- 이 패치의 영웅 변경은 **0건**이다. 리플레이 안내는 핫픽스 설명문이므로 별도 신규 변경으로 계산하지 않았다.
- 공식 패치 발표를 OverFast 통계 반영으로 확정하지 않았다. `effectiveAt: null`, `statisticsWindowStatus: unverified` 유지.

## 수집·검증·저장 변경

기존 schemaVersion **1**을 유지하고 선택적인 `systemChanges`, `systemCoverage`, `systemNormalizationVersion`만 추가했다. 기존 영웅 `changes` 배열은 유지한다.

- 일반 변경을 `competitive`, `system`, `bugfix`, `other`로 분리한다. 영웅 버그 수정은 기존 영웅 변경 경로를 계속 사용한다.
- 검증된 일반 변경만 있더라도 패치를 저장할 수 있다.
- 신규 자동 규칙은 6v6/챔피언/그룹 등급 폭/감소 방향/수치/5v5 비교 문맥을 **양쪽 문장에서 정확히 확인**한다. 동일 후보가 여러 개면 자동 확정하지 않는다.
- 모르는 일반 변경은 한국어·영어 후보와 원문 해시를 보고서에 남긴다. 수동 검토는 두 언어의 변경 ID·증거 해시·분류·요약을 명시해야 한다. 단순 문장 유사도만으로 검증 처리하지 않는다.
- 읽을 수 있는 변경이 없는 새 문서는 ‘변경 없음’ 대신 **원문 구조 검토 필요**로 남긴다. 영웅 구조가 있는데 파싱 결과가 비어 있으면 실패시켜 원본을 보존한다.
- 동일 원문을 반복 수집하면 JSON 바이트와 수정 시각을 유지한다. 원문 수정은 새 해시의 revision으로 저장하며 이전 검증 기록은 남긴다.
- 게시 검증은 기존 영웅 변경뿐 아니라 시스템 변경 삭제·변조도 차단한다. 실패 시 정상 JSON을 보존하는 기존 원자적 교체 경로를 재사용했다.
- hero pending 건수와 system pending 건수를 별도로 기록한다. 기존 자동화의 출력 `pending`은 합계다. CLI는 Actions 실행 요약과 warning에도 검토 대기를 표시하도록 보완했다. 권한이나 게시 조건은 변경하지 않았다.

로컬 결과: 패치 **2 → 3개**, 영웅 변경 **65 → 65건**, 검증된 일반 변경 **1건**. 기존 두 패치 객체는 JSON 객체 비교 결과 완전히 동일하다. 11월 3일·5일의 일반/버그 관련 문장 **13건**은 자동 규칙으로 의미를 확정할 수 없어 보고서의 검토 대기로 남겼다. 이 문장들을 새 영웅 변경으로 만들거나 기존 아카이브를 고쳐 넣지 않았다.

[로컬 후보 검증 결과](qa/official-patch-repair/local-update.json), [변경 전 JSON](qa/official-patch-repair/local-before.json), [원문·대기 항목](qa/official-patch-repair/official-patch-detection.json).

## 화면 동작

- 영웅 통계의 이번 패치 카드는 전체 라이브 패치 중 최신 검증 기록을 사용한다. 현재 로컬에서는 **2026.11.16 · 라이브 핫픽스**와 짧은 경쟁전 요약·공식 링크를 표시한다.
- 카드 날짜는 공식 발표일/anchor 기준으로 표시한다. 한국어 제목의 날짜는 `localizedTitleDate`로 남긴다. 기존 과거 패치의 메인 카드도 이 기준을 적용하며 영웅 상세의 날짜 정책은 바꾸지 않았다.
- 시스템 전용 카드에는 빈 details/summary나 설명용 더보기를 만들지 않는다. 기존 모바일 CSS가 요약을 숨기던 조건도 details가 있는 카드로 한정했다.
- 아나 상세: 마지막 관련 11월 3일 변경 유지. 레킹볼 상세: 마지막 관련 11월 5일 변경 유지. 11월 16일 시스템 변경으로 덮어쓰지 않는다.
- `latestHeroPatch()`와 `previous-update` 제외 정책은 수정하지 않았다.
- KO/EN/JA 요약은 프로젝트 번역 키를 사용한다. 새 일본어 공식 원문을 검증했다고 주장하지 않는다.

스크린샷: [390px KO 최신 패치](qa/official-patch-repair/browser/390-ko-latest.png), [1440px EN 최신 패치](qa/official-patch-repair/browser/1440-en-latest.png), [모바일 아나](qa/official-patch-repair/browser/390-ko-ana.png), [모바일 레킹볼](qa/official-patch-repair/browser/390-ko-wrecking-ball.png).

## 검증

- 전체 단위·통합 테스트: **392/392 통과**. 새 6개 테스트에 경쟁전 전용·버그 전용·시스템/기타·반복·원문 수정·날짜 차이·구조 변경·수치/검토 해시 불일치·이력 보존·언어·서비스 경로·저장 실패를 포함했다.
- 기존 신규 영웅 패치 수집, 수치 검증, previous-update, workflow YAML, 게시 SHA/아티팩트 해시, 원자적 저장, 분리된 Pages 빌드 검증도 통과했다.
- 실제 Chrome: **320/390/1440px × KO/EN/JA = 9조합** 통과. 최신 카드 요약의 실제 표시 여부, 공식 링크, 가로 넘침 0px, 아나/레킹볼의 이전 관련 패치를 확인했다. 공식 패치 JSON은 빌드된 로컬 파일을 그대로 제공했으며 OverFast만 기존 캡처 응답을 사용했다.
- `npm run build`: 성공, 지역화 정적 HTML **663개** 유지. 기존 JS 청크 크기 경고는 남아 있다.
- `npm run verify:pages`: 성공, `/HOW/`, 로컬 자산 **23개**.
- `git diff --check`: 통과. Git의 LF/CRLF 안내는 있지만 공백 오류는 없다.
- 네트워크 점검은 공식 원문·공개 GitHub API·연결 도구의 읽기 전용 로그 조회만 수행했다. **원격 워크플로 실행이나 실제 게시 성공을 이번 수정의 검증으로 사용하지 않았다.**

[전체 테스트 로그](qa/official-patch-repair/tests.log), [브라우저 결과](qa/official-patch-repair/browser/results.json).

## 이번 작업 변경 파일

- 수집/검증: `scripts/collect-official-patch-notes.js`, `scripts/lib/officialPatchParser.js`, `scripts/lib/systemPatchRules.js`(신규), `scripts/lib/patchPublication.js`, `scripts/prepare-official-patch-update.js`.
- 아카이브/화면: `public/data/patches/notes.json`, `src/models/officialPatchModel.js`, `src/views/patchNoteView.js`, `src/styles/navigation.css`, `src/i18n/ko.js`, `en.js`, `ja.js`.
- 테스트: `tests/systemPatches.test.js`(신규), `tests/fixtures/official-2026-11-16.ko-kr.html`, `official-2026-11-16.en-us.html`, `tests/officialPatchComplete.test.js`, `tests/patchAutomation.test.js`, `tests/mainMapAndPatch.test.js`, `tests/mobileInsights.test.js`.
- 브라우저 재현: `scripts/qa-system-patch.cjs`, 본 보고서와 `docs/qa/official-patch-repair/` 점검 자료.

미커밋 상태였던 대시보드·그래프 폴리시 파일은 이번 패치 작업에서 변경하지 않았다. 기존 워크플로 YAML, Meta Score, 통계 API·캐시·스냅샷·일일 순위 정책도 변경하지 않았다.

## 승인 후 후속 단계와 한계

1. 수정 파일과 검증된 로컬 JSON을 리뷰하고 **Commit/Push 승인**을 받는다. 현재 원격/공개 사이트는 여전히 11월 5일 JSON을 제공한다.
2. 기존 워크플로는 이미 활성 상태이고 `publish`에 contents/pages/id-token write가 설정되어 있다. 코드를 main에 반영하면 다음 예약 실행이 실제 JSON 커밋과 Pages 게시를 수행할 수 있다는 점을 함께 확인해야 한다. 별도 활성화 플래그를 새로 추가할 필요는 없다.
3. 수동 workflow_dispatch는 게시를 유발할 수 있으므로 **실행 승인 없이 테스트 용도로 누르지 않는다**. 예약 실행 후 prepare 결과, 검토 아티팩트, 변경 시 publish, 공개 JSON의 패치 ID를 확인한다.
4. 로컬 신규 JSON까지 main에 함께 반영하면 일반 Pages 배포가 해당 데이터를 게시한다. 이후 동일 원문 수집은 changed=false가 정상이다. 수집기만 먼저 반영하는 경우에는 기존 패치 워크플로가 새 JSON을 계산하여 게시한다. 어느 쪽도 이번 작업에서 실행하지 않았다.
5. 향후 임의의 모든 시스템 문장을 자동 번역·확정하지는 않는다. 검증 규칙 밖의 변경은 review-required로 남으며 검토 아티팩트와 실행 경고를 확인해야 한다. 공식 구조가 바뀌면 자동 게시를 보류한다.
6. 실제 예약 실행 시각은 GitHub 지연에 영향을 받는다. cron 10시가 10시 정각 게시를 보장하지 않는다. 브랜치 보호·환경 승인 조건은 운영자가 별도로 확인해야 하며 이번에 변경하지 않았다.
