# 상세 진입 스크롤 수정

2026-11-09. 이번 본문의 UI/통계 변경 금지 조건에 따라 **스크롤 처리만 수정**했다. 첨부 문서의 별도 PC 대시보드 복원/모바일 메뉴 분기 작업은 이번 변경에 포함하지 않았다.

## 원인과 수정

기존 Router는 상세 데이터를 렌더링하고 `focusHeading({preventScroll:true})`를 수행하지만, 새 영웅 진입 때 이전 페이지의 스크롤을 초기화하지 않았다. 이를 다음처럼 구분했다.

- 목록/메타/즐겨찾기에서 상세 진입 및 다른 heroKey로 전환: 초기 로딩 DOM을 렌더링한 다음 단일 requestAnimationFrame에서 최상단으로 이동.
- 같은 heroKey의 overview/abilities/perks 전환: 초기화하지 않음.
- API 응답, history/perk 갱신, 일반 refresh/즐겨찾기 재렌더: 초기화하지 않음.
- 목록/메타로 복귀: 기존 방문 중 저장한 위치 복원.
- 직접 상세 URL/새로고침: 새 상세 진입으로 취급해 상단 시작.

Router가 실행되는 동안 history.scrollRestoration을 manual로 설정해 브라우저 자동 복원과 앱의 복원이 경쟁하지 않게 했다. stop 시 이전 설정을 돌려놓는다. 이전 프레임은 취소하고 목적지/heroKey를 검사해, 빠르게 다른 메뉴로 이동한 뒤 오래된 콜백이 화면을 스크롤하지 않게 한다. 임의 timeout이나 반복 스크롤은 운영 코드에 추가하지 않았다.

현재 헤더는 fixed/sticky가 아니므로 문서 top=0이 정확한 시작점이다. 기존 헤더/메뉴/필터/영웅 배너/탭의 DOM 순서와 디자인은 유지했다. 데이터 로딩이 늦게 끝나도 다시 상단으로 당기지 않는다.

## 실제 Chrome 검증

로컬 production preview `/HOW/`에서 기존 저장 데이터와 실제 상세 응답을 사용해 검사했다. 원격 통계 대량 수집은 하지 않았다.

|너비|목록에서 클릭 직전 스크롤|상세 진입|동일 영웅 탭/재렌더|목록·메타 복원|직접 URL/새로고침|
|---:|---:|---:|---|---|---|
|320|3359px|0|유지|통과|0|
|375|3353px|0|유지|통과|0|
|390|3353px|0|유지|통과|0|
|1440|2097px|0|유지|통과|0|

검사 경로: 긴 티어리스트 → 겐지, 겐지 → 시너지 아나 → 카운터 영웅, 즐겨찾기 → 겐지, 메타픽의 실제 영웅 링크 → 상세. 같은 영웅의 기술/특전/통계 탭 전환과 즐겨찾기 갱신에서는 수동 상단 이동이 없었다. 뒤로 가기는 탭 전환으로 생성된 각 history 항목도 순서대로 통과했다. 현재 데이터에서 선택 가능한 HOT 후보가 없어 HOT 링크 자체 클릭은 별도 미검증이며, 동일 상세 URL 라우팅을 사용한다. 가짜 후보를 만들지 않았다.

가로 넘침/브라우저 실행 오류 없음. 일부 외부 초상화는 네트워크 시점에 따라 폴백이 보일 수 있다. 실제 휴대폰/Safari는 미검증이다. 내용이 짧아지는 탭에서는 브라우저의 자연스러운 최대 스크롤 범위 제한이 적용될 수 있다.

스크린샷: [320px](qa/detail-scroll/after/320-entry.png), [375px](qa/detail-scroll/after/375-entry.png), [390px](qa/detail-scroll/after/390-entry.png), [1440px](qa/detail-scroll/after/1440-entry.png). [측정 결과](qa/detail-scroll/after/results.json).

## 파일과 테스트

- `src/controllers/routingController.js`: 새 heroKey 진입/직접 진입 초기화, 프레임 취소/검사, 브라우저 복원 설정 관리.
- `tests/detailScroll.test.js`: 새 진입·동일 탭·비동기 응답·refresh·목록 복귀·경합·stop·직접 URL 검증.
- `scripts/qa-detail-scroll.cjs`, 본 문서, `docs/qa/detail-scroll/`: 실제 브라우저 검증 자료.

`npm.cmd test`: **214개 통과**. `npm.cmd run build`, `npm.cmd run verify:pages`(자산 12개), `git diff --check` 통과.

기존 미커밋 메뉴/공식 패치 자동화 작업을 보존했다. 이번 작업에서 UI/CSS/데이터/Meta Score/로고/패치 수집기를 변경하지 않았다. Commit/Push/PR/배포 없음.
