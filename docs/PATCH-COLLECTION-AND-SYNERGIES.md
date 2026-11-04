# 패치 다음 날 관측 수집과 영웅 시너지

검토일: 2026-11-04 (한국). 기존 미커밋 맵 통계 기능을 보존하고 로컬 코드를 확장했다. 운영 Meta Score는 현재 소스의 65:25:10 및 기존 S 자격 조건 그대로이며 Domain을 변경하지 않았다.

## 구현 완료와 현재 제한

- 적용 시각 기준 24시간·한국 날짜 경계를 모두 검사하는 전용 다이아몬드 패치 수집기, 일 단위 재시도, 중복 대표값 방지, 54명 데이터 검증, 파일/인덱스 정합성 검사, 동시 실행 잠금, 원자적 인덱스 갱신을 구현했다.
- 패치 그래프 대표값을 '마지막 관측'에서 '적용 다음 날 이후 최초로 검증된 실제 관측'으로 변경했다. 이후 관측이 첫 대표값을 덮어쓰지 않는다. 보관 계획도 첫 대표값과 마지막 보조 관측을 보호하도록 맞췄다.
- 상세 오른쪽은 카운터 → 시너지 → 지속 능력이다. 초상화 최대 3개, 기존 상세 링크, 접힌 이유·출처를 표시한다. 통계적 듀오 승률이나 가상 점수는 없다.
- 실제 수집·확정 그래프 자동 갱신은 아직 활성화되지 않았다. 정확한 적용 시각과 제공처의 새 집계 구간을 확인할 증거가 부족하여 현재 패치 수집기는 안전하게 보류한다. 예약·원격 커밋·Push·배포를 실행하지 않았다.

## 11월 3일 공식 패치

공식 [11월 패치 노트](https://overwatch.blizzard.com/en-us/news/patch-notes/live/2026/11/#patch-2026-11-03)에서 'Overwatch Retail Patch Notes – November 3, 2026'과 영웅 밸런스 변경을 확인했다.

- HOW 카탈로그 ID: ow-2026-11-03 (자체 식별자)
- 공식 문서 앵커: patch-2026-11-03
- 공식 버전 번호: 미확인(null)
- 노트 게시 날짜: 2026-11-03
- 정확한 실제 적용 날짜·시각: 미확인(effectiveAt=null)
- 유형: balance (hotfix/bugfix와 구분)
- 원본 통계 집계 구간 검증 상태: unverified

게시일을 실제 적용 시각으로 사용하지 않았다. 공식 문서를 읽는 것만으로 OverFast가 새 패치 집계를 반환하는지는 확인할 수 없다. 카탈로그의 현재 통계 패치 역시 추측하지 않는다.

## 수집 정책과 실행

```powershell
node scripts/collect-patch-snapshot.js ow-2026-11-03 --dry-run
node scripts/collect-patch-snapshot.js ow-2026-11-03
```

전용 수집기는 DEFAULT_FILTERS를 사용해 **PC / 아시아 / 경쟁전 / 다이아몬드 / 전체 전장**만 요청한다. 기존 전체 등급 기본 collector와 기존 파일은 변경하거나 재분류하지 않았다.

수집 가능 시점은 max(실제 적용 시각+24시간, 적용 한국 날짜의 다음 날 00:00)이다. 예를 들어 UTC 11월 3일 23:30은 한국 11월 4일 08:30이므로 최초 가능 시점은 한국 11월 5일 08:30이다. 다음 날 자정만 지나자마자 수집하는 오류를 방지한다. 적용 시각 미확인이나 bugfix 전용 항목은 요청하지 않는다.

현재 dry-run 결과는 `collect:false, reason:application-time-unverified`이다. 기존 public/data/snapshots 파일과 index는 변경하지 않았다.

실제 적용 시각이 확인되어 수집 가능한 경우:

1. 기존 index와 모든 참조 파일의 안전한 경로·중복·정규화·시각·조건·patch 일치를 검사한다.
2. 같은 패치·같은 코호트의 첫 확정 대표값이 이미 있으면 수집하지 않는다. 전체 등급 기록은 다이아몬드 중복 판정에 쓰지 않는다.
3. 최신 미검증 관측이 24시간 이내이면 재요청을 제한한다. 네트워크 실패는 새 기록을 만들지 않아 다음 실행에서 재시도할 수 있다.
4. 기존 OverFast API를 사용하고 54개 현재 영웅 키가 모두 존재하는지 검증한다. 비율 범위·null/0·중복 키는 기존 normalizeSnapshot/normalizeStatistics로 검사한다.
5. 새 응답의 패치 소속 근거가 없으면 patch=null, targetPatch=의도한 패치, patchVerification.status=unverified로 저장한다. 확정 패치 이력에서는 제외한다.
6. 검증된 로컬 검토 기록만 `patchObservationProofs.json`에 입력한다. 파일은 현재 비어 있다. 필요 필드는 status, catalogId, 공식 sourceUrl, verifiedAt, statisticsWindow='since-patch-start', upstreamPatchId(공식 식별자), 검토 evidenceUrl이다. 단순 값 변화나 수집 날짜만으로 이 파일을 채우면 안 된다.
7. immutable 새 파일을 먼저 생성하고 임시 index를 rename하여 교체한다. 오류 시 이번 실행의 새 파일·임시 index만 롤백하며 기존 정상 파일·index를 덮어쓰지 않는다. wx 잠금으로 동일 디렉터리 동시 수집을 막는다. 비정상 종료 후 남은 잠금은 실행 중인 프로세스가 없는지 확인한 뒤 수동 처리해야 한다.

그래프는 확인된 적용 시각 이후 최소 24시간이 지난 첫 유효 검증 관측을 역할·등급 등의 조건별로 선택한다. 미검증 데이터·null·다른 코호트는 혼합하지 않는다. 각 점의 선택 정보에 패치명·수집일·지표·검증 상태를 표시하며 '패치 후 첫 관측이며, 안정된 메타를 뜻하지 않습니다'라는 짧은 문구를 제공한다. 현재 API 조회값은 기존처럼 별도 미확인 현재 관측점으로 표시할 수 있다.

## 실제 API 응답 확인

기본 다이아몬드 전체 전장 조건의 OverFast `/heroes/stats`를 실호출해 **HTTP 200, 영웅 54개** 응답을 확인했다. 원본 응답은 `research/patch-collection/live-api.json`에 검토 자료로 저장했다. 이 자료를 11월 3일 패치의 확정 스냅샷으로 public에 등록하지 않았다. 원본 집계 구간·적용 시각 미확인 상태를 그대로 기록했다.

## 워크플로와 활성화 후속 작업

`.github/workflows/patch-snapshots.yml`은 로컬에만 작성했다.

- workflow_dispatch로 검토된 patch_id를 입력하는 수동 테스트용 구성이다.
- contents:read, 단일 concurrency, Node 24/npm ci/test/전용 수집기, 결과 아티팩트 업로드만 포함한다.
- schedule은 주석의 설계 예시 `17 * * * *`(UTC)만 있다. 한 시간마다 조건을 확인하되 실제 수집은 24시간/한국 날짜/중복 정책으로 제한할 계획이다. 예약 이벤트는 비활성이다.
- Git add/commit/push, write 권한, Pages 배포 단계가 없다. 따라서 Actions 아티팩트만으로 사이트 데이터가 영구 반영되지는 않는다.
- 공식 패치 감지 API 또는 웹훅은 검증하지 못했다. 자동 감지 코드는 없으며 검토된 수동 카탈로그만 사용한다.

자동 운영 전에는 (1) 공식 실제 적용 시각 확인, (2) 새 원본 집계 구간 확인 방법과 증거 확정, (3) 카탈로그·검토 파일 갱신, (4) 수동 Actions 아티팩트 검토, (5) 별도 승인을 받은 저장/PR·배포 경로 및 최소 권한 설계, (6) schedule 활성화가 필요하다. 아티팩트만으로 끝낼지 검토 PR 방식으로 영속화할지 아직 자동 연결하지 않았다.

## 시너지 선정·검토 범위

현재 공식 영웅 페이지 **54개 모두 HTTP 200** 및 기술·현재 역할을 확인했다. 초기 추천은 **32명, 방향별 49개 관계**, 나머지 **22명은 근거 보완 필요**로 남겼다. 영웅마다 최대 3개이며 순서는 HOW 수동 우선순위다. 후보를 함께 모두 선택하라는 팀 조합은 아니다. 예를 들어 겐지의 윈스턴·자리야는 서로 대체 가능한 돌격 후보이다.

겐지는 아나(나노 용검), 윈스턴(동시 다이브), 자리야(진입 보호)이다. 기술 연계와 전술 연계를 구분하고 자기 자신·중복·존재하지 않는 키·돌격 두 명 조합을 거부한다. 지원/공격 두 명은 5v5 역할 고정에서 허용되지만 돌격 두 명은 허용되지 않는다. 솜브라는 현재 지원 역할로 검증하며 과거 공격 역할을 사용하지 않았다.

데이터는 공식 현재 기술을 바탕으로 HOW가 짧게 작성했다. 기존 카운터 DB를 재활용하거나 뒤집지 않았다. 아래 외부 자료는 방법론만 검토했으며 허가가 확인되지 않아 전체 표·점수·설명문·듀오 DB를 수집하거나 복제하지 않았다.

- [Counterwatch 방법론](https://www.counterwatch.gg/methodology): 동의한 앱 사용자의 실제 매치 결과와 기술 호환성 평가를 구분한다.
- [Counterwatch Best Duos](https://www.counterwatch.gg/stats/overwatch/best-duos): 기술 연계 추천과 시즌 실측 성과 모드는 다르며 전체 등급 기준이다. HOW 다이아몬드 듀오 통계로 가져오지 않았다.
- [Overpicker 시너지](https://www.overpicker.com/synergies): 호환성 점수이지 직접적인 듀오 승률이라고 가정하지 않는다. 재사용 허용이 명확히 확인되지 않아 숫자나 DB를 가져오지 않았다.

확인 자료와 재사용 검토 결과는 `research/synergies/official-review.json`, `provider-review.json`이다. 미입력 영웅은 anran, dmon, doctrine, domina, emre, freja, hazard, illari, jetpack-cat, juno, lifeweaver, mizuki, moira, roadhog, shion, sierra, sombra, symmetra, vendetta, venture, wuyang, zenyatta이다. 빈 UI는 간결한 미제공 상태로 표시한다.

## 검증

- `npm.cmd test`: **100개 통과**. 적용일/게시일 구분, KST 경계, 24시간, 중복/등급 분리, 미검증 보존, 실패 시 index 보존, 최초 대표값 보호, 전체 54명 시너지 키와 역할 제한·출처·최대 개수, 링크/접힌 이유/XSS, 카운터→시너지→패시브 순서, 맵 통계와 기존 그래프/티어 회귀 검증 포함.
- `npm.cmd run build`: 통과.
- `npm.cmd run verify:pages`: 통과.
- Python PyYAML로 workflow YAML을 파싱하고 schedule 부재·contents:read를 검사했다. GitHub 원격 Actions에서 실행한 결과는 아니다.
- 브라우저 도구가 `No browser is available`을 반환했다. 실제 PC/모바일 시각·터치·스크린샷 검증은 미완료이다. 기존 3열 counter 스타일과 44px 터치 영역·native details/links를 재사용했다.

## 변경 파일

추가: `src/models/patchCollectionModel.js`, `src/data/patchObservationProofs.json`, `scripts/lib/patchCollector.js`, `scripts/collect-patch-snapshot.js`, `.github/workflows/patch-snapshots.yml`, `src/data/synergies.js`, `src/models/synergyModel.js`, `src/services/synergyService.js`, `src/views/synergyView.js`, `tests/patchCollection.test.js`, `tests/synergies.test.js`, `docs/research/patch-collection/*`, `docs/research/synergies/*`, 본 문서.

수정: `src/data/patchCatalog.js`, `src/models/patchHistoryModel.js`, `src/models/snapshotRetentionModel.js`, `src/controllers/routingController.js`, `src/views/heroDetailView.js`, `src/views/pickHistoryView.js`, `src/styles/detail.css`, `tests/counters.test.js`, `tests/metricHistory.test.js`, `tests/patchHistory.test.js`.

작업 시작 시 존재한 맵 통계 관련 미커밋 파일과 변경을 보존했다. 운영 가중치·S 자격·카운터 DB·기술/특전·하위 역할·즐겨찾기·1시간 통계 캐시는 변경하지 않았다.

## 초기 시너지 관계

| 영웅 키 | 아군 후보 | 분류 | 근거 |
|---|---|---|---|
| genji | ana | ability | 나노 강화제와 용검의 공격 타이밍을 맞춰 진입 화력을 높일 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/) |
| ana | genji | ability | 나노 강화제와 용검의 공격 타이밍을 맞춰 진입 화력을 높일 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/) |
| genji | winston | tactical | 기동기로 함께 진입해 같은 후방 대상을 압박할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/) |
| winston | genji | tactical | 기동기로 함께 진입해 같은 후방 대상을 압박할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/) |
| genji | zarya | ability | 방벽으로 용검이나 공격적인 진입 중 받는 피해를 막을 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/) |
| zarya | genji | ability | 방벽으로 용검이나 공격적인 진입 중 받는 피해를 막을 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/genji/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/) |
| reinhardt | lucio | ability | 속도 지원으로 망치 사거리까지 접근하는 시간을 줄일 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/reinhardt/) [2](https://overwatch.blizzard.com/en-us/heroes/lucio/) |
| lucio | reinhardt | ability | 속도 지원으로 망치 사거리까지 접근하는 시간을 줄일 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/reinhardt/) [2](https://overwatch.blizzard.com/en-us/heroes/lucio/) |
| reinhardt | mei | ability | 빙벽으로 적의 퇴로를 좁히고 근거리 교전을 유도할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/reinhardt/) [2](https://overwatch.blizzard.com/en-us/heroes/mei/) |
| mei | reinhardt | ability | 빙벽으로 적의 퇴로를 좁히고 근거리 교전을 유도할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/reinhardt/) [2](https://overwatch.blizzard.com/en-us/heroes/mei/) |
| reaper | zarya | ability | 방벽으로 근거리 진입을 보호하고 중력자탄에 죽음의 꽃을 연계할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/reaper/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/) |
| zarya | reaper | ability | 방벽으로 근거리 진입을 보호하고 중력자탄에 죽음의 꽃을 연계할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/reaper/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/) |
| hanzo | zarya | ability | 중력자탄으로 모인 적에게 용의 일격을 연계할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/hanzo/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/) |
| zarya | hanzo | ability | 중력자탄으로 모인 적에게 용의 일격을 연계할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/hanzo/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/) |
| pharah | mercy | ability | 공중 기동을 따라 치유와 공격 지원을 제공할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/pharah/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| mercy | pharah | ability | 공중 기동을 따라 치유와 공격 지원을 제공할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/pharah/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| ashe | mercy | ability | 소총 사격에 공격 지원을 집중하고 고지대 생존을 도울 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/ashe/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| mercy | ashe | ability | 소총 사격에 공격 지원을 집중하고 고지대 생존을 도울 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/ashe/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| soldier-76 | mercy | ability | 연속 사격에 공격 지원을 제공하고 치유로 사격 유지 시간을 늘릴 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/soldier-76/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| mercy | soldier-76 | ability | 연속 사격에 공격 지원을 제공하고 치유로 사격 유지 시간을 늘릴 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/soldier-76/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| bastion | baptiste | ability | 증폭 매트릭스 사선에 화력을 집중하고 불사 장치로 교전 지속을 도울 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/bastion/) [2](https://overwatch.blizzard.com/en-us/heroes/baptiste/) |
| baptiste | bastion | ability | 증폭 매트릭스 사선에 화력을 집중하고 불사 장치로 교전 지속을 도울 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/bastion/) [2](https://overwatch.blizzard.com/en-us/heroes/baptiste/) |
| cassidy | baptiste | ability | 증폭 매트릭스를 통과하는 사격과 불사 장치로 중거리 교전을 지원할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/cassidy/) [2](https://overwatch.blizzard.com/en-us/heroes/baptiste/) |
| baptiste | cassidy | ability | 증폭 매트릭스를 통과하는 사격과 불사 장치로 중거리 교전을 지원할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/cassidy/) [2](https://overwatch.blizzard.com/en-us/heroes/baptiste/) |
| winston | ana | ability | 나노 강화제로 진입한 윈스턴의 화력과 생존을 보조할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/winston/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/) |
| ana | winston | ability | 나노 강화제로 진입한 윈스턴의 화력과 생존을 보조할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/winston/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/) |
| ana | brigitte | ability | 방패 밀쳐내기와 근거리 압박으로 아나에게 접근한 적을 견제할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/ana/) [2](https://overwatch.blizzard.com/en-us/heroes/brigitte/) |
| brigitte | ana | ability | 방패 밀쳐내기와 근거리 압박으로 아나에게 접근한 적을 견제할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/ana/) [2](https://overwatch.blizzard.com/en-us/heroes/brigitte/) |
| junker-queen | lucio | ability | 속도 지원으로 근거리 공격과 부상 효과를 적용할 거리를 확보할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/junker-queen/) [2](https://overwatch.blizzard.com/en-us/heroes/lucio/) |
| lucio | junker-queen | ability | 속도 지원으로 근거리 공격과 부상 효과를 적용할 거리를 확보할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/junker-queen/) [2](https://overwatch.blizzard.com/en-us/heroes/lucio/) |
| mauga | kiriko | ability | 정화의 방울로 교전 중 해로운 효과에 대응하고 돌진 교전을 보조할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/mauga/) [2](https://overwatch.blizzard.com/en-us/heroes/kiriko/) |
| kiriko | mauga | ability | 정화의 방울로 교전 중 해로운 효과에 대응하고 돌진 교전을 보조할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/mauga/) [2](https://overwatch.blizzard.com/en-us/heroes/kiriko/) |
| ramattra | lucio | ability | 속도 지원으로 근접 공격 형태의 유효 거리에 진입하기 쉬워집니다. [1](https://overwatch.blizzard.com/en-us/heroes/ramattra/) [2](https://overwatch.blizzard.com/en-us/heroes/lucio/) |
| lucio | ramattra | ability | 속도 지원으로 근접 공격 형태의 유효 거리에 진입하기 쉬워집니다. [1](https://overwatch.blizzard.com/en-us/heroes/ramattra/) [2](https://overwatch.blizzard.com/en-us/heroes/lucio/) |
| reaper | ana | ability | 나노 강화제를 근거리 교전이나 죽음의 꽃의 공격 타이밍에 맞출 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/reaper/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/) |
| junkrat | zarya | ability | 중력자탄에 모인 적에게 폭발 공격을 집중할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/junkrat/) [2](https://overwatch.blizzard.com/en-us/heroes/zarya/) |
| torbjorn | mercy | ability | 포탑이 아닌 토르비욘 본체의 무기 사격에 공격 지원을 제공할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/torbjorn/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| sojourn | mercy | ability | 중거리 무기 사격에 공격 지원과 지속 치유를 제공할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/sojourn/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| widowmaker | mercy | ability | 고지대 저격 위치에 치유와 공격 지원을 제공할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/widowmaker/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| tracer | winston | tactical | 기동력을 맞춰 같은 후방 대상을 동시에 압박할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/tracer/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/) |
| winston | tracer | tactical | 기동력을 맞춰 같은 후방 대상을 동시에 압박할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/tracer/) [2](https://overwatch.blizzard.com/en-us/heroes/winston/) |
| echo | mercy | ability | 비행 경로를 따라 치유와 공격 지원을 제공할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/echo/) [2](https://overwatch.blizzard.com/en-us/heroes/mercy/) |
| orisa | lucio | ability | 속도 지원으로 전선을 옮기거나 가까운 교전 거리를 확보할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/orisa/) [2](https://overwatch.blizzard.com/en-us/heroes/lucio/) |
| sigma | baptiste | ability | 방벽과 불사 장치로 사선을 유지하며 중거리 화력을 지원할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/sigma/) [2](https://overwatch.blizzard.com/en-us/heroes/baptiste/) |
| baptiste | sigma | ability | 방벽과 불사 장치로 사선을 유지하며 중거리 화력을 지원할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/sigma/) [2](https://overwatch.blizzard.com/en-us/heroes/baptiste/) |
| doomfist | ana | ability | 나노 강화제를 진입 타이밍에 맞춰 공격과 생존을 지원할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/doomfist/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/) |
| dva | ana | ability | 나노 강화제를 메카 상태의 공격적인 진입 타이밍에 맞출 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/dva/) [2](https://overwatch.blizzard.com/en-us/heroes/ana/) |
| wrecking-ball | tracer | tactical | 레킹볼의 진입으로 시선이 분산될 때 트레이서가 같은 후방을 압박할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/wrecking-ball/) [2](https://overwatch.blizzard.com/en-us/heroes/tracer/) |
| tracer | wrecking-ball | tactical | 레킹볼의 진입으로 시선이 분산될 때 트레이서가 같은 후방을 압박할 수 있습니다. [1](https://overwatch.blizzard.com/en-us/heroes/wrecking-ball/) [2](https://overwatch.blizzard.com/en-us/heroes/tracer/) |
