# 전적 검색 UI 및 즐겨찾기 보완

- 검색 초기 화면에 CSS 네이비 명도 변화, 약한 주황·파랑 radial-gradient와 반투명 검색 Hero 영역을 적용했다. 사이트 헤더·푸터와 프로필 배경은 유지한다.
- 기존 playerId 기반 독립 localStorage 저장을 재사용한다. 검색 카드에 더해 상세 프로필에도 44px 별 버튼을 제공한다. 직접 URL에서 조회한 프로필도 저장할 수 있고, 초기 목록에 즐겨찾기 개수를 표시한다.
- 같은 닉네임의 서로 다른 ID를 별도로 보관한다. 초기화는 저장 목록을 유지하며 이전 응답을 무시한다. 저장 실패 안내와 Empty State를 보존했다.
- 신규 API 엔드포인트나 요청은 추가하지 않았다. 기존 최대 동시 2개·페이지당 20개 프로필 보강 및 Provider 캐시를 재사용한다. 저장 목록은 API 실패에도 삭제되지 않는다.

## 검증

- npm test: 242/242 통과.
- npm run build, npm run verify:pages, git diff --check 통과.
- Chrome headless: 320/375/390/430/768/1024/1440px 7개 너비 통과. 상세 별 해제·재등록, 카드 비이동, 새로고침 저장, 메뉴 초기화, 지연 응답 무시, 오류/빈 결과 구분, 이미지 원본 해시 및 가로 넘침 검사.
- 브라우저는 캡처된 실제 공개 API 응답을 사용했다. 실시간 API 재검증 및 실제 모바일 기기는 미검증이다.
- 스크린샷과 결과: docs/qa/player-favorites/390-initial.png, 1440-initial.png, browser-results.json. 기존 증거 경로의 스크린샷을 최신 결과로 갱신했다.
- Commit/Push/PR/배포 및 자동화 활성화 없음.

## 수정 코드

src/controllers/playerSearchController.js, src/views/playerSearchView.js, src/styles/player.css, tests/playerFavorites.test.js, scripts/qa-player-favorites.cjs.

저장 범위는 브라우저·출처별 localStorage이며 기기 간 동기화는 제공하지 않는다.

## 빈 검색 및 별 버튼 보완

- 카드 별 버튼은 등록·hover·focus·active에서도 배경 투명, 테두리·그림자·밝기 효과 없음. 키보드에는 얇은 원형 focus-visible outline을 유지한다.
- 검색 입력의 required를 제거하고 Controller에서 trim() 결과가 비면 공통 reset({focus:true})를 호출한다. API 요청 없이 결과·페이지네이션·오류를 초기화하고 저장된 즐겨찾기를 보여 준다. 기존 generation 검사로 늦은 응답도 무시한다.
- 전체 단위 테스트 243개 통과, 빌드·Pages 경로 검증 통과. 빈 문자열/스페이스/탭, 요청 0회, 저장 유지, 늦은 응답 무시 회귀 테스트를 추가했다.
