# OverLooker 실제 특전 선택률 연동

> 추가 수정: 사용자 승인에 따라 실제 API를 Node로 수집해 동일 출처 JSON으로 제공하는 방식으로 전환했고, 로컬 브라우저에서 수치 표시를 확인했다. [현재 구현 보고서](OVERLOOKER-STATIC-PERKS.md). 아래 CORS 차단 결론은 이전 직접 호출 방식의 조사 기록이다.

검토일: **2026-11-07 (Asia/Seoul)**. 현재 로컬 코드에 구현했다. 작업 시작 시 Git 작업 트리는 깨끗했다. Commit/Push/PR/배포/원격 수정/예약 수집은 실행하지 않았다.

## 현재 결론

**API 통신·정규화·54영웅/216특전 매핑·카드 UI·라우팅·테스트는 구현했다. 그러나 현재 제공처가 CORS를 허용하지 않아 GitHub Pages의 브라우저 직접 연동은 차단 상태다.** Node의 HTTP 200이나 fixture 화면을 브라우저 실시간 연동 성공으로 간주하지 않는다. 프록시, no-cors, 브라우저 보안 해제, 운영용 정적 fallback은 추가하지 않았다.

## 이용 허가와 자산

사용자가 제공한 Discord 운영자 답변에 근거해 비상업적 HOW에서 공개 API 데이터를 사용할 수 있는 것으로 처리했다. 제공처 공개 API: <https://stats.overlooker.app/api/perks>, 영웅별 <https://stats.overlooker.app/api/perks/genji>. HOW가 운영자에게 별도 연락하거나 Discord 메시지를 독립 인증한 것은 아니다.

`ow-data`는 [공개 README](https://github.com/overlooker-dev/ow-data#readme)상 UNLICENSED이며 재배포 허가로 해석하지 않았다. 패키지 설치·이미지 복제·전체 저장소 재배포는 하지 않았다. API의 식별 정보와 OverFast 응답을 대조하는 데 필요한 slug/단계/활성 기간만 명시적 매핑에 기록했다. 기존 OverFast 아이콘 URL과 설명을 그대로 사용한다. 제공처 이미지를 새로 가져오지 않는다.

## 실제 API 확인

|요청|결과|
|---|---|
|GET `/api/perks`|HTTP 200, `filters`, `heroes`, 54영웅/216현재 특전|
|GET `/api/perks/genji`|HTTP 200, 영웅 식별·선택 횟수·비율 확인|
|겐지 `?queue_type=competitive`|HTTP 200, `filters.queue_type=COMPETITIVE`, sample_size 724|
|겐지 `?queue_type=quickplay`|HTTP 200, `filters.queue_type=QUICKPLAY`, sample_size 1029|
|GET의 CORS 헤더|Access-Control-Allow-Origin 없음|
|OPTIONS 겐지|405, Allow: HEAD, GET. 단순 GET 자체는 preflight가 필요 없으므로 근본 원인은 GET 응답의 CORS 헤더 부재|
|캐시/제한 헤더|확인한 응답에 Cache-Control, Age, Retry-After, RateLimit/X-RateLimit 관련 값 없음. 무제한 호출 가능하다는 의미는 아님|

서버 검증 시각은 2026-11-06T16시 UTC대, 한국 날짜는 11월 7일이다. [API 검사 기록](research/overlooker/api-audit.json)에 성공 응답의 메타데이터를 남겼다. 전체와 겐지 응답은 테스트 fixture로 보관하며 운영 UI에 fallback으로 연결하지 않았다.

실제 Chrome에서 **`https://moonsh0206.github.io` 출처**의 격리된 테스트 문서로 직접 fetch했다. GET은 CORS 오류로 실패했다. 문서만 로컬 도구로 제공했고 API 요청은 가로채지 않았으며 원격 Pages는 변경하지 않았다. [브라우저 오류 기록](research/overlooker/cors-browser.json). 로컬 개발 서버 출처에서도 동일한 차단을 확인했다.

### 응답 구조와 의미

```text
전체: {filters:{queue_type:null,since:null}, heroes:[영웅 객체...]}
개별: {hero, hero_name, role, sample_size, perks:[...], filters}
특전: {slug, name, tier, slot, icon, picks, pick_rate}
```

- 영웅 ID는 underscore를 사용한다. `jetpack_cat`, `junker_queen`, `soldier_76`, `wrecking_ball`을 HOW의 하이픈 key와 별도로 매핑한다.
- 특전 ID는 영웅 내 `slug`. `tier`는 minor/major, slot은 1~4다. slot은 검증 항목이며 배열 순서 조인에 사용하지 않는다.
- `pick_rate`는 0~1 비율이다. UI만 ×100하여 백분율로 표시하고 원본 승률·픽률 등과 혼합하지 않는다. `picks`는 해당 특전 선택 건수다.
- 겐지 캡처: 신속 베기 355건/35.79%, 용의 갈증 637건/64.21%, 회전하는 칼날 482건/63.34%, 명상 279건/36.66%.
- `sample_size=1753`를 Minor/Major 각각의 분모나 경기 수로 사용하지 않는다. 겐지의 표시 선택 건수 합계는 1753이지만 아나 등 12영웅에서는 현재 특전들의 합계와 sample_size가 다르다. 원인은 응답만으로 확정할 수 없다. 누락/과거 선택 포함 여부도 미확인이다.
- API가 단계별 분모를 직접 제공하지 않는다. picks/rate로 역산하거나 현재 옵션 선택 건수 합계로 비율을 재계산하지 않는다. 합계 100%를 강제하지 않는다.
- `sampleSize`(각 항목의 검증된 분모), `observedAt`(제공처 관측/갱신 시각), patch, window는 null이다. `providerSampleSize`에 원본 sample_size만 보존하고 단위는 null로 둔다. `fetchedAt`은 HOW 조회 시각이다.
- 지역·등급·플랫폼·전장 필터와 패치/원본 집계 기간은 응답에 없다. 그런 조건의 지원 여부를 추정하지 않으며 HOW 필터를 요청에 첨부하지 않는다. since 필드는 있으나 날짜 필터의 계약은 추가 검증하지 않았다. 현재 구현은 필터 없는 제공처 집계를 독립 표시한다.
- [제공처 FAQ](https://overlooker.app/faq)는 게임 이벤트와 화면 인식을 결합한 경기 기록 수집으로 설명한다. 사용자 투표로 취급하지 않지만 전체 게임 모집단의 대표성이나 기록 정확도를 HOW가 검증한 것은 아니다.

## MVC 및 매핑

1. **Service** `perkStatisticsService.js`: 영웅별 엔드포인트만 사용. 메모리 TTL 15분(HOW 자체 정책, 제공처 계약 아님), pending 공유, 동시 최대 2, 12초 타임아웃. 429/503은 제공처 전체 대기, Retry-After 초/HTTP 날짜 존중. 다른 네트워크 오류는 최소 30초 대기하며 자동 재시도는 하지 않는다. 오류가 전체 영웅 상세를 실패시키지 않는다.
2. **Model** `perkSelectionModel.js`: 형식/영웅/ID/단계 검증, 비율 단위 변환, null/실제 0 구분, 버전 매핑·활성 기간 확인. 손상된 특정 항목은 숫자를 표시하지 않는다. ID 중복/전체 식별 손상은 응답 오류 처리한다.
3. **Controller** `routingController.js`: 준비된 영웅의 특전 탭에 진입했을 때 지연 조회한다. 같은 화면 반복 갱신·HOW 필터 변경·탭 재방문은 중복 호출하지 않는다. 영웅 변경/목록 복귀/stop 시 세대 토큰으로 이전 비동기 결과를 무시한다. 수동 재시도도 Service 대기를 따른다.
4. **View** `perkStatisticsView.js`, `heroDetailView.js`: 기존 Minor/Major 카드의 이름·설명·아이콘을 유지하면서 비율/선택 건수/접근 가능한 meter 막대를 추가한다. 카드 자체를 통째로 다시 만들지 않는다. 로딩·미제공·매핑 검토·오류를 구별한다. 출처, HOW 별도 집계, 조회 시각과 제한을 명시한다.

`src/data/perkMappings.json`은 54영웅/216현재 특전의 명시적 맵이다. 제공처 hero slug/name/role와 ow-data 참조의 slug/tier/slot/lifecycle, OverFast 영어 특전명, 동일 특전의 한국어 이름과 아이콘 fingerprint를 대조했다. 영문/한글 이름 유사도, 배열 인덱스, 아이콘 하나만으로 자동 추측하지 않는다. 실행 시 한국어 이름과 아이콘이 모두 정확히 일치해야 한다.

자료 참조 blob: `4cd36fc23952f2e37f34f59507a1a78e843fd29c`. D.Mon의 `Meka Mobility` ↔ `MEKA Mobility`는 명시적으로 검토한 대소문자 차이다. 이후 이름/ID/단계/아이콘이 달라지면 해당 수치는 미표시하며, 교체된 과거 ID를 새 특전에 승계하지 않는다. 이 검증은 집계 기간이 최신 패치와 일치한다는 확인은 아니다. [전체 54명 결과](research/overlooker/MAPPING.md).

## 테스트와 실제 화면

- `npm.cmd test`: **176/176 통과**. 실제 캡처 구조·54/216 매핑·0/null·단위·과거 ID·활성 날짜·캐시·동시성·타임아웃·404/429/503·Retry-After·CORS·지연 응답·탭 지연 조회·출처·상세 DOM 회귀.
- `npm.cmd run build`: 통과, 72 modules, JS 231.60kB/gzip 68.77kB. 명시 매핑 추가로 이전 146kB대에서 증가했다. 이미지/CDN 의존이나 런타임 전체 통계 일괄 요청은 추가하지 않았다.
- `npm.cmd run verify:pages`: `/HOW/`, 로컬 자산 9개 검증 통과.
- `git diff --check`, `git status`: 확인 완료.
- 보호 대상 12파일(스냅샷/index 6개, meta/metaPolicies/recommendationPolicy/HOT/statisticsModel/패치노트)은 SHA-256 동일. [검증 기록](research/overlooker/protected-files.json).
- 실제 Chrome 320/375/390/430/1440px에서 **실제 API 캡처를 테스트 도구로 주입한 화면**의 수치·막대·출처·탭 캐시·가로 넘침 0을 확인했다. [390px](research/overlooker/qa/captured-response-390.png), [1440px](research/overlooker/qa/captured-response-1440.png).
- 별도 **실제 외부 API 요청**은 CORS 실패를 확인했고, 390px 오류 화면에서도 기존 특전 설명·다른 상세 기능이 유지됨을 확인했다. [오류 화면](research/overlooker/qa/live-cors-390.png), [전체 측정](research/overlooker/qa/results.json).
- 실제 모바일 기기/iOS Safari/스크린리더 검증은 미실시. 성공 화면 스크린샷을 현재 GitHub Pages의 실시간 성공 증거로 사용하지 않는다.

## 미완료 및 해결 조건

**현재 공개 브라우저에서 직접 수치를 읽을 수 있는 영웅: 0명(CORS 차단). 식별 매핑 완료: 54명/216특전.** 영웅별 통계 엔드포인트는 겐지, 전체 통계 엔드포인트는 54명 응답을 검증했다. 나머지 53개의 개별 엔드포인트를 각각 live 호출한 것은 아니다.

최소 해결은 제공처가 GET 응답에 HOW Pages origin(`https://moonsh0206.github.io`)을 허용하는 `Access-Control-Allow-Origin`을 설정하는 것이다. 로컬 개발 origin도 필요하면 허용 목록에 추가해야 한다. 동적 origin 응답이라면 `Vary: Origin`이 필요하다. 단순 GET은 OPTIONS만 허용하는 것으로 해결되지 않는다. 제공처가 적절한 CORS를 설정한 뒤 실제 브라우저로 재검증해야 한다.

CORS 대신 서버 측 수집·공개 데이터 파일을 운영하려면 제공처 허가 범위와 별도 운영 승인 후 설계해야 한다. 이번 작업에서 프록시/정적 fallback/자동 수집/원격 배포로 전환하지 않았다. 개발 코드의 준비 완료와 실제 공개 연동 완료를 구분한다.

## 변경 파일

- 신규 `src/data/perkMappings.json`, `src/services/perkStatisticsService.js`, `src/views/perkStatisticsView.js`.
- 수정 `src/models/perkSelectionModel.js`, `src/controllers/routingController.js`, `src/views/heroDetailView.js`, `src/main.js`, `src/styles/detail.css`.
- 신규 `tests/perkStatistics.test.js`, fixture `overlooker-perks.json`, `overlooker-genji.json`, `overfast-perk-identities.json`.
- `tests/counters.test.js`의 예전 미허가 상태 기대값만 사용자 확인 허가 상태로 갱신했다. 카운터 로직/데이터는 변경하지 않았다.
- 신규 `scripts/qa-perk-statistics.cjs`, 이 문서 및 `docs/research/overlooker` 증거·매핑·스크린샷. 기존 `docs/PERK-DATA-RESEARCH.md`에는 최신 결론을 추가하고 과거 기록을 보존했다.
