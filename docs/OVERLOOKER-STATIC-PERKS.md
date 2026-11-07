# OverLooker 특전 선택률 — 동일 출처 JSON 전환

> 후속 UI 수정: 전체 정보에서도 자동 조회하여 기존 네 특전 카드에 직접 표시하고 하단 박스를 간결한 출처로 바꿨다. [현재 카드 통합 및 185개 테스트·실제 화면 검증](PERK-CARD-INTEGRATION.md). 아래의 특전 탭 지연 조회 설명은 당시 구현 기록이다.

검증일: 2026-11-07 (KST). 기존 특전 연동 및 미커밋 작업 위에 추가 구현했다. 이전 직접 호출의 CORS 실패 기록은 [이전 보고서](OVERLOOKER-PERK-INTEGRATION.md)에 보존했다.

## 실제 수집 및 표시 결과

- **실제 공개 API를 Node.js에서 새로 호출하여 로컬 저장에 성공했다.** 테스트 fixture를 운영 파일로 복사하지 않았다.
- 요청: `https://stats.overlooker.app/api/perks`, HTTP 200.
- HOW 수집: `2026-11-06T16:38:44.705Z` = **2026-11-07 01:38:44.705 KST**. 제공처 HTTP Date도 `Fri, 06 Nov 2026 16:38:44 GMT`였다. HTTP Date를 집계 마감 시각으로 해석하지 않는다.
- 저장: `public/data/perks/overlooker-perks.json`, **9,964 bytes (약 9.73 KiB)**.
- 54/54 영웅, 216/216 현재 특전 매핑 통과. Minor 108, Major 108. 이번 응답의 비율/건수 결측은 0건이다. 실제 0과 null 처리는 별도 회귀 테스트했다.
- 최초 수집이므로 이전 특전 운영 파일은 없었고 이전 값 대비 변화량은 생성하지 않았다. 기존 영웅 통계 스냅샷 6개(index 포함)는 변경하지 않았다.
- [수집 결과 및 SHA-256](research/overlooker-static/collection.json), [54명 매핑 근거](research/overlooker/MAPPING.md).

겐지 실제 저장 수치:

|특전|선택률|선택 건수|
|---|---:|---:|
|신속 베기|35.79%|355|
|용의 갈증|64.21%|637|
|회전하는 칼날|63.34%|482|
|명상|36.66%|279|

이것은 수집 시점의 OverLooker 제공 집계다. HOW의 지역·등급·전장 통계나 실시간 API 값으로 표현하지 않는다.

## CORS 해결 방식과 데이터 구조

브라우저는 `import.meta.env.BASE_URL + data/perks/overlooker-perks.json`만 읽는다. `/HOW/` Pages base에서는 `/HOW/data/perks/overlooker-perks.json`이다. 외부 CORS 프록시·no-cors·보안 해제는 없다. 제공처 CORS 정책 자체를 수정한 것이 아니라 승인된 수동 수집 → 동일 출처 제공으로 경로를 전환했다.

index와 본문을 별개로 교체할 때 생기는 세대 불일치를 피하기 위해 **index 없이 단일 JSON을 원자적 게시 단위로 선택**했다. 전체 영웅 자료가 약 10KB이므로 별도 영웅 파일/manifest는 불필요하다.

```text
schemaVersion, source, sourceUrl, requestUrl, collectedAt, mappingVersion
filters: {queue_type, since}
rateUnit: fraction
fields: [providerPerkId, selectionFraction, selectionCount]
providerUpdatedAt / patch / window / stageDenominators / providerSampleUnit: null
responseDate / cacheControl / ageSeconds
heroCount: 54, perkCount: 216
heroes:
  genji:
    providerSampleSize: 1753
    minor: [[swift_cuts, 0.3579, 355], ...]
    major: [[blade_twisting, 0.6334, 482], ...]
```

공통 출처·수집 시각·조건은 최상위에 한 번만 저장한다. 영웅/특전 이름·효과·아이콘·반복 URL은 저장하지 않는다. HOW hero key와 기존 명시 매핑의 provider ID를 사용한다. 원본 0~1 비율을 그대로 보관하고 화면에서만 ×100 한다. Minor/Major를 별도로 유지하고 합계 100%를 강제하지 않는다.

제공처 `sample_size`는 원본 그대로 `providerSampleSize`에 보존하지만, 단위가 검증되지 않아 경기 수나 단계별 분모로 표시하지 않는다. 현재 특전들의 건수 합계와 sample_size가 다른 영웅이 있어 역산하지 않는다. 실제 집계 기간·패치·제공처 갱신 시각·단계 분모는 여전히 미제공이다. 이번 요청의 `queue_type`과 `since`는 null(미지정)이며 HOW의 경쟁전 필터를 OverLooker에 전달하지 않는다.

## MVC와 필터 독립성

- `perkArchiveModel.js`: 현재 54/216 전체성, 정확한 provider ID/단계/slot/매핑 버전/활성 기간과 수치 범위를 검증한다. 실제 null은 미제공으로 복원한다. 미등록·중복·교체된 ID는 실패 처리한다.
- `perkStatisticsService.js`: 운영 기본 서비스는 동일 출처 JSON 하나를 지연 조회하고 15분 메모리 캐시를 공유한다. pending도 전체 영웅이 공유하므로 동시 영웅 조회가 하나의 파일 요청으로 합쳐진다. HOW 지역·등급·전장 인자를 받지 않는다. 오류/타임아웃 시 외부 API나 fixture fallback은 없다. 이전 직접 호출 어댑터는 공개 API 계약 테스트용 export로 보존했으며 운영 경로에서는 사용하지 않는다.
- 기존 `routingController.js`의 영웅별 상태/세대 토큰을 그대로 재사용한다. 필터 변경으로 특전 상태를 초기화하지 않고, 탭·영웅 전환 시 캐시를 사용하며 이전 영웅 응답을 무시한다.
- 기존 특전 카드의 이름·설명·아이콘과 UI를 재사용한다. 출처 아래에 **HOW 수집 시각·저장된 통계**를 표시한다. Minor/Major 비율과 선택 건수를 보여주고, HOW 집계 조건과 별도라는 안내를 유지한다.

Meta Score v2/v2.1, 티어/S·A 정책, HOT, 원시/합성 영웅 통계, 스냅샷, 필터 계산, 카운터·시너지·특전 효과는 바꾸지 않았다. 보호 대상 16파일의 해시는 작업 전후 동일하다: [검증](research/overlooker-static/protected-files.json).

## 안전한 수동 갱신

프로젝트 루트에서:

```powershell
node scripts/collect-overlooker-perks.js
npm.cmd test
npm.cmd run build
npm.cmd run verify:pages
```

첫 명령은 **실제로 공개 API를 1회 호출하고 로컬 최신 파일을 교체**한다. dry-run이 아니다. Git 명령·배포·예약 실행은 하지 않는다.

1. 전용 잠금 파일을 배타 생성한다. 다른 실행의 잠금을 삭제하지 않는다.
2. 기존 정상 파일을 읽고 검증한다. 기존 파일이 손상됐거나 매핑 버전이 다르면 덮어쓰지 않는다.
3. 허가된 전체 공개 API를 한 번 요청한다. 응답 본문까지 20초 제한. 자동 재시도 없음. 429/503과 Retry-After는 오류로 보고한다.
4. 54/216 현재 매핑과 수치/기간을 전부 검증한다. 누락 목록·원인을 출력하고 기존 파일을 보존한다. 결측인 null을 0으로 만들지 않는다.
5. 같은 디렉터리의 고유 임시 파일을 배타 생성·쓰기·fsync하고, 다시 읽어 복원 검증한다.
6. rename으로 단일 파일을 원자 교체한다. 쓰기/검증/교체 실패 시 기존 파일은 남고 자기 임시 파일만 정리한다.
7. 이전/신규 개수, 변경된 ID별 비율·건수/표본 정보, 수집 시각·크기·누락을 출력한다. 최초에는 변화량 대신 최초 수집임을 표시한다.

자동 스케줄/Actions/자동 커밋은 추가하지 않았다. 이 파일은 특전 최신 집계용이며, 영웅 통계의 패치 이력 스냅샷과 다른 디렉터리·정책으로 관리한다. 새 패치에서 ID가 바뀌면 매핑을 검토해야 하며 구 ID 수치를 새 ID에 승계하지 않는다. 매핑 버전 변경으로 기존 파일이 더 이상 검증되지 않으면 원본을 별도 보존하고 명시적 마이그레이션을 검토해야 한다.

## 실제 브라우저 및 회귀 검증

- **182/182 테스트 통과**(이전 176개 + 신규 6개). 실제 운영 수집 파일 54/216 복원, 정확한 값·0/null, 집계 분리, 임시 디렉터리에서 원자 교체와 실패 보존, 전체 캐시·중복 억제·오류를 검증했다.
- `npm.cmd run build`: 통과, 73 modules.
- `npm.cmd run verify:pages`: 통과, `/HOW/`, 로컬 자산 10개(새 특전 JSON 포함).
- `npm.cmd run verify:pages -- http://127.0.0.1:5198`: 실제 빌드 preview의 HTTP 성공·JSON MIME·전체 자산 경로 통과.
- `git diff --check`, `git status` 확인 완료.
- 실제 Chrome에서 **320/375/390/430/1440px** 검증. 특전 JSON을 가로채지 않고 실제 빌드 서버에서 내려받아 저장 파일 바이트와 동일함을 검사했다. 실제 수치·막대 표시, 가로 넘침 0, JavaScript 오류 0, 외부 OverLooker 요청 0건.
- 390/1440px에서 아시아/유럽/아메리카, 골드/마스터 이상/다이아 이상, 부산/전체 전장, 기술·특전 탭 전환, 아나로 영웅 변경, 뒤로 가기를 확인했다. **한 페이지 수명 동안 특전 JSON 요청은 1회**, 새로고침 뒤 한 번 다시 조회하며 수치는 유지됐다.
- 관련 없는 OverFast 통계는 기존 저장 자료로 대체했다. 부산 통계는 검증된 실제 자료가 없어 테스트에서 오류로 반환했다. 그때도 특전 수치는 유지됐다. 이것은 부산 통계 API의 신규 성공 검증이 아니다.
- [실측 결과](research/overlooker-static/qa/results.json), [390px 실제 수치](research/overlooker-static/qa/390-perks.png), [1440px 출처·수집 시각](research/overlooker-static/qa/1440-source.png).
- 실제 휴대폰/iOS Safari/스크린리더는 미검증이다. GitHub Pages 원격 배포는 수행하지 않았으므로 **현재 공개 사이트에 반영됐다는 의미는 아니다**.

브라우저 검증 재현(Playwright는 기존 로컬 QA 설치 사용):

```powershell
npm.cmd run preview -- --port 5198
# 다른 터미널에서
node scripts/qa-static-perks.cjs
```

이전 `qa-perk-statistics.cjs`와 `docs/research/overlooker/qa`는 직접 API 시도 당시의 fixture/CORS 검증 기록이다. 현재 구현에는 위 새 QA 명령을 사용한다.

## 이번 추가 변경 파일

- 신규: `scripts/collect-overlooker-perks.js`, `src/models/perkArchiveModel.js`, `public/data/perks/overlooker-perks.json`, `tests/perkArchive.test.js`, `scripts/qa-static-perks.cjs`.
- 수정: `src/services/perkStatisticsService.js`, `src/main.js`, `src/views/perkStatisticsView.js`, `scripts/verify-pages.js`, `tests/perkStatistics.test.js`(이전 직접 API 계약 테스트의 import만 명시적 adapter로 변경).
- 문서: 이 보고서, README 수동 명령, 이전 특전 문서의 최신 상태 안내와 `docs/research/overlooker-static` 검증 자료.
- 기존 미커밋 상세/라우팅/CSS/매핑 구현은 유지했다. Git Commit/Push/PR/배포/원격 변경/자동화 활성화 없음.
