# Phase 4: 플레이어 전적 검색

## 구현

기존 `#/player-search`를 실제 검색 화면으로 바꿨다. PC 헤더의 예정 문구를 링크로 전환하고 기존 사이드바 안내도 같은 경로로 연결했다. 모바일 3개 메뉴와 기존 해시 라우터를 재사용한다. 검색 입력·선택 상태는 화면을 왕복할 때 메모리에 유지되지만 새로고침 후에는 빈 검색 폼으로 시작한다. 계정 정보를 별도 로컬 저장소나 스냅샷에 영구 저장하지 않는다.

폼 제출 시에만 검색한다. 닉네임 및 `이름#숫자`를 지원하며 `#`는 제공처 형식인 `-`로 변환한다. 검색 결과에는 아바타·이름·구분용 식별자·공개 상태를 표시한다. 20개 단위로 더 보기를 제공한다. 같은 이름의 플레이어도 각 API 식별자로 선택한다. 문자열은 textContent로 렌더하고 이미지 URL은 https만 허용한다. API 경로의 `%7C` 식별자는 한 번 디코딩 후 안전하게 인코딩해 이중 인코딩을 방지한다.

선택한 계정은 프로필·칭호·추천 레벨·API의 마지막 플레이 시즌별 PC/콘솔 경쟁전 등급과 **PC 경쟁전** 요약/영웅별 전적을 표시한다. 플레이시간은 제공된 초를 시간·분으로 포맷한다. 게임 수·승패·승률·KDA는 응답값을 그대로 사용한다. 0경기/0%와 null을 구별하고 통계로 없는 영웅의 값을 만들지 않는다. 영웅 이름과 초상화는 기존 영웅 모델이 있으면 재사용한다.

검색에서 비공개로 확인되면 상세 통계 호출을 생략한다. 403도 비공개 상태로 처리한다. 단순 null이나 미제공을 비공개라고 단정하지 않는다. 검색 결과 없음·검색 중·프로필 로딩·타임아웃·네트워크/CORS·429·503·기타 서버 오류·응답 형식 오류를 구분한다. 통계 오류가 나도 정상 조회된 프로필은 보존하고 오류/재시도 버튼을 표시한다.

## 데이터 계층과 캐시

`overfastPlayerProvider`는 `search(query,offset)`, `summary(id)`, `competitive(id)` 계약으로 분리했다. 라우터에서 Provider를 주입할 수 있으며 향후 다른 제공처는 같은 정규화 계약을 구현하면 된다. 넥슨 연동은 구현하지 않았다.

검색·프로필·통계 URL별 메모리 캐시와 진행 중 Promise 공유를 사용한다. 문서의 10분 TTL을 기준으로 응답 X-Cache-TTL과 Age를 반영한다. 오류 시 Retry-After 또는 제공처 retry_after를 존중하며 자동 재시도하지 않는다. 페이지 변경은 세대 번호를 무효화해 늦은 응답이 화면을 덮어쓰지 않게 한다. 공유 중인 요청은 완료 후 캐시에 남을 수 있으나 떠난 화면에 반영하지 않는다.

HOW 지역·등급·전장·Meta Score와 플레이어 통계는 독립적이다. 이 기능에서 개인 전적을 전체 영웅 통계나 Meta Score 표본에 합치지 않는다. Provider Age, HOW 조회 시각, Blizzard 프로필 갱신 시각을 구분한다. 브라우저에서 제공처가 노출하지 않는 캐시 헤더는 ‘정보 없음’으로 표시한다.

## 사용 엔드포인트

- `GET /players?name={nickname-or-BattleTag}&limit=20&offset={offset}`
- `GET /players/{encoded-player-id}/summary`
- `GET /players/{encoded-player-id}/stats/summary?gamemode=competitive&platform=pc`

[OverFast 공개 명세](https://overfast-api.tekrop.fr/openapi.json)를 확인했다. 명세에서 플레이어 통계는 마지막으로 플레이한 경쟁전 시즌일 수 있으므로 현재 시즌이라고 표시하지 않는다. 계정별 경기 수/플레이시간이며 전체 등급·지역 모집단 통계가 아니다.

## 실제 계정 검증

2026-11-10 실제 API로 문서 예시 공개 계정 **TeKrop**을 검증했다. 닉네임 검색, `TeKrop-2217` 배틀태그 검색, 프로필 요약, PC 경쟁전 전부 HTTP 200이었다. 닉네임 검색은 Blizzard 인코딩 ID를, 배틀태그 검색은 `TeKrop-2217`을 반환했으며 둘 다 같은 계정의 공개 데이터다. 원본과 HTTP 메타데이터는 `docs/qa/player-search/`에 보관했다. 임의 계정을 대량 수집하지 않았다.

관측된 실제 결과:

- 공개 상태 true, 이름 TeKrop, 칭호 Data Broker, 추천 레벨 2.
- PC 시즌 22 지원 실버 4. 현재 시즌으로 재해석하지 않았다.
- PC 경쟁전 19경기, 6승/13패, 승률 31.58%, 플레이 12,164초(3시간 22분).
- 영웅별 전적 5명: 바티스트·아나·캐서디·루시우·키리코.
- 아나 8경기/3승/5패/37.5%, 키리코 0경기/0%를 원본 그대로 표시했다.
- 1440px Chrome에서도 라이브 API의 검색·summary·stats/summary 세 요청 모두 HTTP 200, CORS 오류 없이 표시됨.

원본의 last_updated_at은 오래된 날짜다. 캐시를 새로 요청했다는 사실이 최신 시즌 전적을 보장하지 않는다. 실시간 갱신·최신 시즌 강제 갱신 기능은 제공하지 않는다.

## 검증

Chrome headless 320/375/390/430/768/1024/1440px 검사 통과. 1440px는 실제 라이브 API, 나머지는 위 실제 수집 응답을 재생했다. 가로 넘침 없음, 16px 입력 폰트, 프로필/영웅별 전적 표시, 같은 계정 재선택 시 추가 요청 없음, 다른 메뉴에서 뒤로 가기 시 결과 보존, 새로고침 시 빈 폼 복원 확인. 원격 폰트는 차단했다. 실제 iOS/Android 기기는 미검증이다.

모의 응답 테스트: 여러 결과·안전한 텍스트 렌더·비공개 통계 생략·입력 검증·null/0·Age/TTL·동일 Promise 공유·429/503/500/504/404/403·타임아웃·네트워크/형식 오류·빠른 검색/계정 선택·페이지 이탈 후 응답 무시. 기존 전적 검색 예정 화면 테스트만 실제 폼 기대값으로 갱신했다.

기존 222개를 유지하고 새 5개로 전체 **227/227 통과**. build 및 verify:pages 통과. diff 검사와 Git status 확인. 새 외부 라이브러리 없음. 영웅 통계·Meta Score·스냅샷·특전·카운터/시너지·자동화 파일은 변경하지 않았다.

## 파일

- `src/models/playerModel.js`: 입력/식별자 검증과 응답 정규화.
- `src/services/overfastPlayerProvider.js`: HTTP·캐시·중복 방지·오류.
- `src/controllers/playerSearchController.js`: 검색/선택/경합/화면 수명 관리.
- `src/views/playerSearchView.js`: 폼·결과·프로필·경쟁전 표시.
- `src/styles/player.css`: 범위 제한된 PC/모바일 디자인.
- `src/controllers/routingController.js`: 기존 경로에 컨트롤러 활성화/정리, Provider 주입.
- `src/main.js`, `index.html`: 전용 스타일 import와 PC 전적 검색 링크.
- `tests/playerSearch.test.js`, `tests/mainMenus.test.js`: 단위/회귀 테스트.
- `scripts/qa-player-search.cjs`, `docs/qa/player-search/`: Chrome 재현과 실제 응답·스크린샷.

[모바일 프로필](qa/player-search/390-profile.png) · [PC 라이브 프로필](qa/player-search/1440-profile.png) · [브라우저 결과](qa/player-search/browser-results.json)

## 제약과 후속 작업

콘솔의 등급은 표시하지만 상세 경기/영웅 통계는 현재 PC 경쟁전만 조회한다. 시즌 선택·콘솔 전적 선택·영구 URL 공유·자동 갱신은 이번 범위에 포함하지 않았다. 실제 비공개 계정·대량 동명이인·실제 429는 조회하지 않았으며 모의 응답으로 검증했다. 제공처의 프로필 수집 지연·시즌/패치 정보 제한·CORS 정책 변경은 HOW만으로 해결할 수 없다. 필요 시 후속 단계에서 플랫폼/시즌 지원과 다른 Provider 승인을 검토한다.

Commit/Push/PR/배포/자동화 활성화는 수행하지 않았다.
