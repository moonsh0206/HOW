# HOW Phase 3.8 — 하위 역할과 지속 능력

검토일: 2026-11-03 (한국). 공식 영웅 페이지 54개를 개별 조회하여 하위 역할을 확인했다. 전체 54/54명 매핑 완료, 미확인 영웅 0명, 공통 효과 10종이다.

## 근거 및 적용 정책

- 현재 분류: [공식 영웅 목록](https://overwatch.blizzard.com/ko-kr/heroes/)과 각 영웅의 한국어 페이지. 2월 최초 명단으로 현재 분류를 추정하지 않았다.
- 도입 배경: [2026년 2월 패치](https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/02/).
- 측면 공격가 추가 치유 +50: [2026년 8월 패치](https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/8/)의 +75 → +50 변경을 적용했다. 2배 또는 +75를 현재 효과로 표시하지 않는다.
- 역할 변경: [현재 패치 페이지](https://overwatch.blizzard.com/ko-kr/news/patch-notes/)의 솜브라 공격→지원, 수색가→전술가 변경과 현재 영웅 페이지를 대조했다.
- 필수 사례: 겐지·시온 공격/측면 공격가, 솜브라 지원/전술가, D.Mon 돌격/강건한 자, 독트린 지원/생존왕을 모두 공식 현재 페이지 및 OverFast 상세 응답과 대조했다.
- 웹 도구에서는 공식 페이지가 403을 반환했으나 Node의 일반 HTTPS 요청으로 200 응답과 공개 HTML을 확인했다. 인증·접근 제한 우회나 내부 엔드포인트 수집은 하지 않았다.

OverFast의 공개 상세 응답에 `subrole`이 존재하고 공개 OpenAPI의 SubRole은 10개 enum을 정의한다. 겐지는 flanker이다. 그러나 지속 능력의 공통 효과·수치 및 영웅 고유 패시브의 명시적 분류 필드는 확인되지 않았다. 따라서 현재 분류의 검증 기준은 로컬 공식 검토 자료이며, API subrole은 일치 여부를 검사한다. API가 키를 생략하면 검증된 로컬 매핑을 사용하고, 부모 역할 또는 API 키가 상충하면 해당 하위 역할을 미제공 처리한다. 임의 대체하거나 다른 역할 효과를 붙이지 않는다.

## 모델과 화면

`src/data/subroles.json`의 effects에 공통 명칭·효과·확인 수치·출처·검토일·부모 역할을 한 번만 저장하고 heroes에서 영웅 키를 연결한다. 숫자가 없는 공식 현재 설명에 임의 수치를 추가하지 않았다. flanker만 effectValue.bonusHealing=50을 명시하고 나머지는 null이다. 공식 페이지의 정성적 효과는 표시하되 2월의 모든 수치가 현재까지 그대로라고 단정하지 않는다. 정확한 적용 패치 식별자가 검증되지 않아 applicablePatch=null이다.

`subroleModel.js`가 매핑과 부모 역할을 검증한다. 상세 Model은 기존 ability/perk 배열을 유지하면서 subrole과 별도 uniquePassives 슬롯을 연결한다. uniquePassives는 현재 빈 배열로, 기술 이름이나 배열 순서만으로 고유 패시브를 추정하지 않는다. 기존 passiveClassification=unavailable은 고유 기술 분류 상태이며 하위 역할 제공 상태와 별개다.

상세 View의 이름 아래에 기존 역할 배지와 다른 색의 하위 역할 배지를 나란히 둔다. 기존 패시브 영역은 '지속 능력' 제목으로 바꾸고 하위 역할 이름과 간결한 효과를 표시한다. 영웅 고유 지속 능력은 향후 검증된 매핑이 생길 때 별도 슬롯에 표시할 수 있다. 긴 패치 설명·출처 내역은 공개 UI에 추가하지 않았다. 배지는 flex-wrap, 카드와 텍스트는 최소 너비 및 줄바꿈 규칙을 유지한다.

## 검증

- `npm.cmd test`: 82/82 통과. 전체 키 54개·10종, 부모 역할, 필수 영웅, +50, 누락/불일치, 영웅 전환 DOM 및 기존 기능 회귀를 포함한다.
- `npm.cmd run build`: 통과.
- `npm.cmd run verify`: 카운터 DB 및 Pages `/HOW/` 자산 경로 검증 통과.
- `git diff --check`: 통과.
- 브라우저 도구는 `No browser is available`을 반환했다. 375px/390px/1440px 실제 화면·스크린샷·가로 넘침 검증은 미완료이며, DOM 테스트와 CSS 검토를 실제 시각 검증으로 간주하지 않았다.
- Meta Score·통계·카운터 DB·픽률 추이 데이터와 그래프·즐겨찾기·필터·라우팅·특전 로직은 변경하지 않았다. Push 및 배포 없음.

변경 파일: `src/data/subroles.json`, `src/models/subroleModel.js`, `src/models/heroDetailModel.js`, `src/views/heroDetailView.js`, `src/styles/detail.css`, `tests/subroles.test.js`, `tests/detail.test.js`, `scripts/review-subroles.js`, `docs/research/subroles/official-review.json`, 본 문서.

근거 기록에는 각 공식 URL, 검토일, 현재 역할·하위 역할, 공개 API 필드와 enum, 관련 패치 발췌가 있다. 패치 후에는 공식 현재 영웅 페이지와 변경 기록을 다시 검토하고, JSON 매핑·효과를 명시적으로 갱신한 뒤 전체 테스트와 빌드를 실행한다. 검토 스크립트는 빌드나 Actions에서 자동 실행하지 않는다.

## 전체 영웅 매핑

| 영웅 키 | 역할 | 하위 역할 | 공식 근거 |
|---|---|---|---|
| ana | 지원 | 전술가 | [ana](https://overwatch.blizzard.com/ko-kr/heroes/ana/) |
| anran | 공격 | 측면 공격가 | [anran](https://overwatch.blizzard.com/ko-kr/heroes/anran/) |
| ashe | 공격 | 명사수 | [ashe](https://overwatch.blizzard.com/ko-kr/heroes/ashe/) |
| baptiste | 지원 | 전술가 | [baptiste](https://overwatch.blizzard.com/ko-kr/heroes/baptiste/) |
| bastion | 공격 | 전문가 | [bastion](https://overwatch.blizzard.com/ko-kr/heroes/bastion/) |
| brigitte | 지원 | 생존왕 | [brigitte](https://overwatch.blizzard.com/ko-kr/heroes/brigitte/) |
| cassidy | 공격 | 명사수 | [cassidy](https://overwatch.blizzard.com/ko-kr/heroes/cassidy/) |
| dmon | 돌격 | 강건한 자 | [dmon](https://overwatch.blizzard.com/ko-kr/heroes/dmon/) |
| doctrine | 지원 | 생존왕 | [doctrine](https://overwatch.blizzard.com/ko-kr/heroes/doctrine/) |
| domina | 돌격 | 강건한 자 | [domina](https://overwatch.blizzard.com/ko-kr/heroes/domina/) |
| doomfist | 돌격 | 개시자 | [doomfist](https://overwatch.blizzard.com/ko-kr/heroes/doomfist/) |
| dva | 돌격 | 개시자 | [dva](https://overwatch.blizzard.com/ko-kr/heroes/dva/) |
| echo | 공격 | 수색가 | [echo](https://overwatch.blizzard.com/ko-kr/heroes/echo/) |
| emre | 공격 | 전문가 | [emre](https://overwatch.blizzard.com/ko-kr/heroes/emre/) |
| freja | 공격 | 수색가 | [freja](https://overwatch.blizzard.com/ko-kr/heroes/freja/) |
| genji | 공격 | 측면 공격가 | [genji](https://overwatch.blizzard.com/ko-kr/heroes/genji/) |
| hanzo | 공격 | 명사수 | [hanzo](https://overwatch.blizzard.com/ko-kr/heroes/hanzo/) |
| hazard | 돌격 | 개시자 | [hazard](https://overwatch.blizzard.com/ko-kr/heroes/hazard/) |
| illari | 지원 | 생존왕 | [illari](https://overwatch.blizzard.com/ko-kr/heroes/illari/) |
| jetpack-cat | 지원 | 전술가 | [jetpack-cat](https://overwatch.blizzard.com/ko-kr/heroes/jetpack-cat/) |
| junker-queen | 돌격 | 강건한 자 | [junker-queen](https://overwatch.blizzard.com/ko-kr/heroes/junker-queen/) |
| junkrat | 공격 | 전문가 | [junkrat](https://overwatch.blizzard.com/ko-kr/heroes/junkrat/) |
| juno | 지원 | 생존왕 | [juno](https://overwatch.blizzard.com/ko-kr/heroes/juno/) |
| kiriko | 지원 | 의무관 | [kiriko](https://overwatch.blizzard.com/ko-kr/heroes/kiriko/) |
| lifeweaver | 지원 | 의무관 | [lifeweaver](https://overwatch.blizzard.com/ko-kr/heroes/lifeweaver/) |
| lucio | 지원 | 전술가 | [lucio](https://overwatch.blizzard.com/ko-kr/heroes/lucio/) |
| mauga | 돌격 | 투사 | [mauga](https://overwatch.blizzard.com/ko-kr/heroes/mauga/) |
| mei | 공격 | 전문가 | [mei](https://overwatch.blizzard.com/ko-kr/heroes/mei/) |
| mercy | 지원 | 의무관 | [mercy](https://overwatch.blizzard.com/ko-kr/heroes/mercy/) |
| mizuki | 지원 | 생존왕 | [mizuki](https://overwatch.blizzard.com/ko-kr/heroes/mizuki/) |
| moira | 지원 | 의무관 | [moira](https://overwatch.blizzard.com/ko-kr/heroes/moira/) |
| orisa | 돌격 | 투사 | [orisa](https://overwatch.blizzard.com/ko-kr/heroes/orisa/) |
| pharah | 공격 | 수색가 | [pharah](https://overwatch.blizzard.com/ko-kr/heroes/pharah/) |
| ramattra | 돌격 | 강건한 자 | [ramattra](https://overwatch.blizzard.com/ko-kr/heroes/ramattra/) |
| reaper | 공격 | 측면 공격가 | [reaper](https://overwatch.blizzard.com/ko-kr/heroes/reaper/) |
| reinhardt | 돌격 | 강건한 자 | [reinhardt](https://overwatch.blizzard.com/ko-kr/heroes/reinhardt/) |
| roadhog | 돌격 | 투사 | [roadhog](https://overwatch.blizzard.com/ko-kr/heroes/roadhog/) |
| shion | 공격 | 측면 공격가 | [shion](https://overwatch.blizzard.com/ko-kr/heroes/shion/) |
| sierra | 공격 | 수색가 | [sierra](https://overwatch.blizzard.com/ko-kr/heroes/sierra/) |
| sigma | 돌격 | 강건한 자 | [sigma](https://overwatch.blizzard.com/ko-kr/heroes/sigma/) |
| sojourn | 공격 | 명사수 | [sojourn](https://overwatch.blizzard.com/ko-kr/heroes/sojourn/) |
| soldier-76 | 공격 | 전문가 | [soldier-76](https://overwatch.blizzard.com/ko-kr/heroes/soldier-76/) |
| sombra | 지원 | 전술가 | [sombra](https://overwatch.blizzard.com/ko-kr/heroes/sombra/) |
| symmetra | 공격 | 전문가 | [symmetra](https://overwatch.blizzard.com/ko-kr/heroes/symmetra/) |
| torbjorn | 공격 | 전문가 | [torbjorn](https://overwatch.blizzard.com/ko-kr/heroes/torbjorn/) |
| tracer | 공격 | 측면 공격가 | [tracer](https://overwatch.blizzard.com/ko-kr/heroes/tracer/) |
| vendetta | 공격 | 측면 공격가 | [vendetta](https://overwatch.blizzard.com/ko-kr/heroes/vendetta/) |
| venture | 공격 | 측면 공격가 | [venture](https://overwatch.blizzard.com/ko-kr/heroes/venture/) |
| widowmaker | 공격 | 명사수 | [widowmaker](https://overwatch.blizzard.com/ko-kr/heroes/widowmaker/) |
| winston | 돌격 | 개시자 | [winston](https://overwatch.blizzard.com/ko-kr/heroes/winston/) |
| wrecking-ball | 돌격 | 개시자 | [wrecking-ball](https://overwatch.blizzard.com/ko-kr/heroes/wrecking-ball/) |
| wuyang | 지원 | 생존왕 | [wuyang](https://overwatch.blizzard.com/ko-kr/heroes/wuyang/) |
| zarya | 돌격 | 투사 | [zarya](https://overwatch.blizzard.com/ko-kr/heroes/zarya/) |
| zenyatta | 지원 | 전술가 | [zenyatta](https://overwatch.blizzard.com/ko-kr/heroes/zenyatta/) |
