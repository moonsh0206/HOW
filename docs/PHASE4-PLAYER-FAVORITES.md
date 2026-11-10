# 플레이어 즐겨찾기·초기 화면·검색 결과 없음

## 구현

플레이어 즐겨찾기는 `how:player-favorites:v1` localStorage 키에 `{id,name,avatar,isPublic}`만 저장한다. 영웅 즐겨찾기 키와 분리했다. 고유 playerId를 기준으로 관리하고 API 통계·등급·오류는 영구 저장하지 않는다. 저장된 이름/아이콘/공개 상태는 마지막 저장 정보다. 갱신 실패로 저장 항목을 제거하지 않는다. 저장소 접근 불가/용량 오류는 안내하고 현재 화면의 선택을 유지한다.

각 카드의 별은 44×44px 독립 버튼이다. 카드 링크의 형제 노드여서 중첩 인터랙티브 요소가 아니며, 클릭/키보드 동작은 즐겨찾기만 토글하고 프로필로 이동하지 않는다. aria-pressed와 별/주황색을 즉시 갱신하고 가능하면 포커스를 유지한다.

검색 초기 상태에는 같은 카드 디자인으로 저장한 플레이어를 표시한다. 저장 항목이 없으면 기본 검색 안내를 보여준다. 즐겨찾기 카드 역시 원래 playerId 링크로 전용 프로필에 이동하고 기존 지연 요약 조회·캐시를 재사용한다. 초기 목록에서도 기존 동시 2개/표시 페이지당 20개 요약 한도를 유지한다.

상단 모바일 메뉴와 PC 헤더의 ‘전적 검색’을 누르면 현재 해시가 같아도 검색어·결과·페이지네이션·선택 계정·통계·임시 API 오류·요약 대기열을 초기화한다. 즐겨찾기와 Provider 캐시는 유지한다. 검색/프로필 세대 번호를 증가시켜 늦은 응답을 무효화한다. 브라우저 뒤로 가기나 프로필의 ‘전적 검색으로 돌아가기’ 링크에는 이 강제 초기화를 적용하지 않는다. 직접 프로필 URL 동작도 유지한다.

## 원본 이미지

사용자가 대화에서 요청한 이미지가 `public/assets/illustrations/HOW_kinetic_grasp_clean.png`라고 확인해 주었다. 해당 파일을 생성·변형·교체·복사하지 않고 직접 연결했다. PNG 원본은 1672×941이며, 작업 전후 SHA-256 일치를 확인했다.

0명 검색 응답에서만 이미지와 실제 HTML 제목/문구/버튼을 표시한다. HTTP 오류·네트워크·타임아웃은 기존 오류 안내를 유지한다. PC 표시 너비 320px, 600px 이하 240px, height:auto와 object-fit:contain으로 비율을 보존한다. 원본보다 확대하지 않는다. BASE_URL로 `/HOW/assets/illustrations/HOW_kinetic_grasp_clean.png`를 로딩한다.

표시 문구:

- **해당 계정을 찾을 수 없습니다**
- 닉네임이나 배틀태그를 다시 확인해 주세요.
- 비공개 프로필이거나 API에서 검색되지 않는 계정일 수도 있습니다.

‘다시 검색’은 입력과 검색 상태를 지우고 검색창으로 포커스를 옮기며 저장된 즐겨찾기는 유지한다.

## 검증

- 기존 236개 유지 + 새 테스트 5개 = **241/241 통과**.
- 저장/복원/삭제, 잘못된 저장 데이터, 영웅 즐겨찾기 키 불변, 별 클릭 시 이동 차단, 저장 정보 유지, 지연된 검색/프로필 초기화, 동일 메뉴 재클릭, 결과 없음과 오류 구분, 재검색 포커스를 테스트했다.
- 실제 OverFast 검색어 `HOWNoAccountVerify20261110QAZ`에 HTTP 200 `{total:0,results:[]}`를 확인했다. 원시 응답과 HTTP 메타데이터를 QA 폴더에 보관했다.
- Chrome 320/375/390/430/768/1024/1440px에서 즐겨찾기 추가→메뉴 초기화→새로고침→저장 유지→전용 프로필 이동→메뉴 복귀→0명 화면→재검색→오류 구분→지연 응답 차단→삭제를 검사했다. 가로 넘침 0, 별 너비 44px, 원본 이미지 비율 및 표시 너비를 확인했다.
- 1440px는 실제 공개 TeKrop 및 실제 0명 API 응답, 나머지 너비는 실제 수집 응답 재생이다. 네트워크/서버 실패와 지연은 모의 응답이다. 실제 모바일 기기·브라우저별 저장소 제한은 미검증이다.
- build, verify:pages, git diff --check 통과. 원본 이미지 해시 불변. 기존 미커밋 작업 보존. Commit/Push/PR/배포 없음.

## 변경 파일

- `src/storage/playerFavoritesStorage.js`: 별도 키·검증·저장/복원.
- `src/controllers/playerSearchController.js`: 즐겨찾기 상태·초기 목록·reset·비동기 방어.
- `src/controllers/routingController.js`: 상단 메뉴 클릭 초기화와 리스너 해제.
- `src/views/playerSearchView.js`: 독립 별 버튼·초기 목록·결과 없음 이미지/HTML/재검색.
- `src/styles/player.css`: 버튼 터치 영역·카드 여백·중앙 일러스트·반응형.
- `tests/playerFavorites.test.js`: 신규 회귀 테스트.
- `scripts/qa-player-favorites.cjs`, `docs/qa/player-favorites/`: Chrome 증거 및 이미지 해시.

[모바일 즐겨찾기](qa/player-favorites/390-initial.png) · [모바일 결과 없음](qa/player-favorites/390-empty.png) · [PC 결과 없음](qa/player-favorites/1440-empty.png) · [7개 너비 결과](qa/player-favorites/browser-results.json)

다른 HOW 기능과 통계·Provider·티어 정책은 변경하지 않았다. localStorage는 같은 브라우저/출처에만 남으며 사용자가 사이트 데이터를 삭제하거나 시크릿 창을 종료하면 지워질 수 있다. 여러 기기 간 동기화는 이번 범위에 없다.
