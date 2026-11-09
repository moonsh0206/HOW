# 공식 패치노트 전체 반영 결과

> 아래는 전체 패치 반영 당시의 기록입니다. 현재 하루 1회 자동화 설정과 최초 활성화 방법은 [DAILY-OFFICIAL-PATCH-AUTOMATION.md](DAILY-OFFICIAL-PATCH-AUTOMATION.md)를 참고하세요. 원격 활성화는 사용자가 직접 수행합니다.

검증일: 2026-11-09. 로컬 구현 및 실제 공식 HTML 수집 결과이며, 원격 저장소/예약 실행/공개 배포는 변경하지 않았다.

## 실제 반영 범위

공식 한국어·영어 라이브 페이지를 HTTP 200으로 다시 조회했다. 현재 확인되는 11월 노트는 `patch-2026-11-03`과 `patch-2026-11-05`이며 그 이후 노트는 확인되지 않았다.

|공식 ID 날짜|한국어 제목 날짜|영웅 관련 사실|라이브 5v5|스타디움|6v6|
|---|---|---:|---:|---:|---:|
|11-03|11-04|62|52|9|1|
|11-05|11-06|3|3|0|0|
|합계||65|55|9|1|

전체 54명 중 27명에게 이번 조사 범위의 변경이 있다. 나머지 27명은 11월 원문에서 변경을 확인하지 못했다는 뜻이며, 과거 변경이 전혀 없다는 뜻은 아니다. 전체 영웅별 기술명·자체 요약·모드·분류 목록은 [audit.json](research/official-patches-complete/audit.json)에 포함했다.

- 11/03: D.Mon, 정커퀸, 마우가, 라마트라, 윈스턴, 안란, 에코, 엠레, 겐지, 한조, 리퍼, 시온, 벤데타, 아나, 바티스트, 브리기테, 독트린, 일리아리, 제트팩 캣, 솜브라, 캐서디, 소전, 시에라, 주노, 미즈키, 레킹볼, D.Va.
- 11/05: 레킹볼, D.Mon. 단 D.Mon 항목은 원문이 '이전 업데이트' 수정이라고 명시하므로 발표 기록만 보관하고 11/05 적용 변경으로 간주하지 않는다. D.Mon 상세의 최근 적용 변경 날짜는 11/03을 유지한다.

기존 검토 대기 52건 전부 처리: 50건은 같은 ID로 반영, 2건은 파서가 잘못 연결한 스타디움 기술 이름을 수정했다. 캐서디 두 번째 파워는 은탄환, 벤데타 두 번째 파워는 마구잡이 맹공격이다. 기존 아나·겐지·레킹볼 4개 객체는 그대로 보존했다. 누락된 영웅 버그 수정 9건을 추가했다. 맵/일반 시스템 항목 5건은 별도 제외 기록으로 남겼으며, 맵 설명의 'Sorry Torb!'를 토르비욘 변경으로 연결하지 않았다. 현재 매핑 실패 및 검토 대기 0건이다.

공식 ID 날짜와 한국어 제목 날짜가 다르므로 각각 보존한다. 실제 적용 시각과 통계 집계 기간은 확인되지 않아 null/미확인 상태다. 패치 변경을 승률 변화의 원인이라고 단정하지 않는다.

## 저장 및 UI

`public/data/patches/notes.json` 68,465바이트에 패치 2개와 사실 65개를 한 번씩 저장한다. 기존 서비스 호환성과 작은 전체 용량을 고려해 단일 canonical JSON을 유지했다. 영웅별 중복 파일은 만들지 않았다. 메인과 상세는 이 동일 출처 JSON을 공유한다.

상세는 최근 패치 → 카운터 → 시너지 → 지속 능력 순서다. 데이터는 전부 유지하고 핵심 3개만 먼저 표시하며 나머지는 native details로 펼친다. 스타디움 및 6v6 변경은 명확한 모드 이름과 자체 공식 링크로 분리한다. 버그 수정·외형·편의성 항목이 밸런스 버프/너프 판정을 덮지 않도록 했다. 다른 영웅의 새 핫픽스가 이전 영웅의 마지막 관련 날짜를 덮지 않는다.

## 신규 패치 처리

1. 공식 KO/EN HTML을 조회하고 고유 ID·날짜·원문 해시를 비교한다.
2. 54명 이름 매핑으로 영웅/기술/모드/특전/패시브/버그 수정을 분리한다. 새 영웅은 `patchHeroNames.json`에 추가한다.
3. 양언어의 같은 영웅·모드·측정항목·전후 값·단위·분류가 일치하는 유일한 수치 사실은 자동 검증한다. 기술 이름 사전 또는 양방향 유일성으로 모호한 매칭을 막는다.
4. 수치 증가/감소의 의미는 측정항목별로 판정한다. 쿨다운은 역방향이며 지속 시간·받는 피해 등 불명확한 문맥은 조정 또는 검토 대기다. 상대 증감, 복합 문장, 신규 정성적 효과는 자동 확정하지 않는다.
5. 이미 검증된 사실은 유지하고 신규 검증 사실만 병합한다. 미확인 후보는 보고서에 남긴다. 검증 실패/네트워크 오류 시 기존 정상 JSON을 보존하며 잠금·임시 파일·재검증·rename으로 교체한다.
6. 같은 소스 재실행은 저장을 건너뛴다. 현재 실제 재실행에서 pending 0, 신규 중복 0을 확인했다.

일반 수치 변경은 다음 패치마다 JS 수정이나 수동 리뷰 파일 추가가 필요하지 않다. 새로운 문맥 전체를 무검증 해석하는 시스템은 아니다. 불확실한 변경은 검토 파일로 승인한 뒤 같은 수집기를 실행한다.

수동 명령:

```powershell
node scripts/collect-official-patch-notes.js --dry-run --report .artifacts/patch-review.json
node scripts/collect-official-patch-notes.js --apply --review docs/research/official-patches/review-complete.json --report .artifacts/patch-review.json
```

## 자동 운영 상태와 승인 후 설정

현재 **감지/정규화/로컬 저장 코드는 작동**, **정기 실행 및 자동 게시/배포는 비활성**이다. `.github/workflows/official-patch-notes.yml`은 workflow_dispatch만 정의하고 runner 안에서 JSON 생성→테스트→빌드→Pages 경로 검증→JSON/보고서/dist 아티팩트 보관까지 연결했다. 저장소 쓰기 권한은 없고 원격 실행도 하지 않았다.

완성된 게시 단계 예시는 실행되지 않는 [워크플로 예시](proposals/official-patch-publication.yml.example)에 있다. 별도 승인 후에만 .github로 이동하고, Pages의 GitHub Actions source, github-pages environment/승인자, 브랜치 보호 정책, contents:write/pages:write/id-token:write 허용 여부를 설정한다. 예약 cron은 별도 승인 후 추가한다. 미확인 후보는 검토 아티팩트로 남으며 사이트에는 검증된 사실만 포함된다.

중요: GITHUB_TOKEN으로 push해도 별도의 push 기반 Pages 빌드가 자동 실행된다고 가정할 수 없다. 예시는 같은 워크플로 안에서 검증된 dist를 deploy-pages에 전달한다. [GitHub 공식 토큰 문서](https://docs.github.com/en/actions/concepts/security/github_token), [워크플로 트리거 문서](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow). 브랜치 보호로 직접 쓰기가 허용되지 않으면 승인된 PR/병합 운영으로 바꾸어야 한다. 이 예시는 로컬에서 실행하거나 원격에 설치하지 않았다.

## 검증

- 198개 테스트 통과. 기존 192개에 전체65건/모드/54명/원본4건 보존/52후보 처리/문법/신규 패치 E2E 테스트를 추가했다.
- 신규 가상 패치는 테스트 임시 파일에서만 사용: 코드나 수동 리뷰 변경 없이 신규 ID 감지→2개 수치 사실 저장→메인/아나 동기화, 불확실한 1건 보류, 겐지 11/03 유지, 재실행 중복 방지. 운영 JSON에 테스트 패치는 없다.
- 프로덕션 빌드 및 `/HOW/` Pages 자산 경로 검증 통과.
- 실제 Chrome 320/390/1440px에서 메인 및 아나·겐지·레킹볼·D.Mon·독트린·엠레·캐서디·D.Va·정커퀸 확인. 패치 JSON/특전 JSON은 production 파일을 그대로 제공했다. OverFast 영웅/전적은 저장된 실제 응답을 사용한 격리된 네트워크 재현이며 실시간 OverFast 성능 검증은 아니다.
- 변경사항 더 보기 Enter 펼침, 모드 분리, 공식 링크 rel, 특전 막대 4개, 미변경 영웅 카드 생략, 단일 패치 JSON 요청, 전 화면 가로 넘침 0 확인. [브라우저 결과](research/official-patches-complete/qa/results.json).
- 54명 전체 DOM 검증은 단위 테스트로 수행했으며 54명 전원의 실제 Chrome 화면을 개별 시각 검수한 것은 아니다.
- 보호 대상 Meta/정책/스냅샷/특전/카운터/시너지/하위 역할/통계 카탈로그 16개 파일 해시 모두 불변. 기존 미커밋 작업을 되돌리지 않았다.

## 변경 파일

수집: `scripts/collect-official-patch-notes.js`, `scripts/lib/officialPatchParser.js`, `scripts/lib/patchChangeRules.js`.
매핑/저장: `src/data/patchAbilityNames.json`, `src/data/patchHeroNames.json`, `public/data/patches/notes.json`.
화면: `src/models/officialPatchModel.js`, `src/views/heroPatchView.js`, `src/styles/detail.css`.
검증: `tests/officialPatchComplete.test.js`, `tests/officialPatches.test.js`, `tests/mainMapAndPatch.test.js`, `tests/fixtures/official-*`, `scripts/qa-official-patches.cjs`.
자동화/문서: `.github/workflows/official-patch-notes.yml`, 본 문서, publication 예시, `docs/research/official-patches/` 검토 자료 및 complete 브라우저/감사 자료.

이 목록은 이번 작업 범위다. git status에 나타나는 다른 기존 미커밋 파일은 사용자 작업으로 그대로 유지했다.
