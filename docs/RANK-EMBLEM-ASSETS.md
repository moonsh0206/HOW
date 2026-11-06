# 경쟁전 등급 엠블럼 조사 및 폴백

## 최신 적용 결과 — 2026-11-06 후속 작업

아래의 최초 조사 기록과 달리, 후속 비교에서 **실버·마스터 2종을 실제 로컬 이미지로 연결했다.** 나머지 6종만 폴백이다. 전장 드롭다운은 변경하지 않았다.

| 등급 | 확보/연결 | 실제 로컬 경로 | 원본·조건·검증 |
|---|---|---|---|
| bronze | 미확보 | 없음 | 참고 사이트의 이미지 주소는 확인했으나 공식 원본과 재사용 조건 미확보 |
| silver | 연결 완료 | public/assets/ranks/silver.png | 블리자드 CDN 원본 PNG 80×80, 비상업적 개인 팬사이트 조건 및 권리 고지 유지 |
| gold | 미확보 | 없음 | 공식 원본·재사용 조건 미확보 |
| platinum | 미확보 | 없음 | 공식 원본·재사용 조건 미확보 |
| emerald | 미확보 | 없음 | 2026 참고 페이지의 엠블럼은 존재하나 공식 원본 추적·재사용 조건 미확보 |
| diamond | 미확보 | 없음 | 공식 원본·재사용 조건 미확보 |
| master | 연결 완료 | public/assets/ranks/master.png | 블리자드 CDN 원본 PNG 100×80, 비상업적 개인 팬사이트 조건 및 권리 고지 유지 |
| grandmaster | 미확보 | 없음 | 공식 원본·재사용 조건 미확보 |

새 근거는 [BoostPirate의 현행 등급 선택 페이지](https://boostpirate.com/tools/overwatch-group-checker)다. 각 등급의 이미지 URL과 rank 이름이 서버 HTML에 직접 제공되고, 해당 페이지는 게임 이미지의 저작권자를 Blizzard로 고지한다. 이 고지만으로 제3자 파일의 재사용을 허가받았다고 판단하지 않았다. 제3자 WebP는 비교 시 메모리에서만 읽었으며 저장·핫링크하지 않았다. 나무위키는 HTTP 403으로 접근하지 못했고, Counterwatch는 앞선 조사에서 실제 원본 주소를 확보하지 못했다.

공식 CDN의 두 PNG와 해당 페이지의 실버/마스터 문양을 대조했다. 투명 영역을 제외하고 100×100 기준으로 정렬한 비교에서 RGBA 채널 평균 절대차는 마스터 약 2.63/4.45/3.68/0.82, 실버 약 5.25/5.35/5.35/3.02(각 채널 0~255 기준)였다. 재압축·크기 차이가 있으나 동일한 문양을 뒷받침하며, 공식 PNG 자체도 이미지 도구로 직접 확인했다. 이는 현행 2026 참고 화면과의 디자인 대조 근거이며, 게임 클라이언트에서 직접 추출했거나 블리자드가 별도 2026 최신 인증을 제공했다는 뜻은 아니다.

원본 URL:

- https://static.playoverwatch.com/images/pages/career/icons/rank/Rank_SilverTier.305e60dca5e95356ced59825426844cc7cdb4948.png
- https://static.playoverwatch.com/img/pages/career/icons/rank/Rank_MasterTier-7d3b85ba0d.png

두 파일은 원본 바이트를 그대로 보존하며 SHA256을 registry와 테스트에서 검증한다. 권리 고지는 public/assets/ranks/NOTICE.txt에 함께 둔다. [Blizzard 팬사이트 FAQ](https://www.blizzard.com/en-us/legal/c1ae32ac-7ff9-4ac3-a03b-fc04b8697010/blizzard-legal-faq)의 비상업적·개인적 사용과 원본/권리 고지 유지 조건에 한정해 적용한다. 상업 이용·무제한 재배포·재라이선스까지 허용된 것으로 표현하지 않는다. 공개 배포는 이번 작업에서 수행하지 않는다.

실버 alpha bbox는 (7,1)~(73,80), 마스터는 (1,0)~(99,79)다. 정사각형 CSS 박스 안에서 원본 비율을 유지하면 가로형 마스터의 가시 높이가 줄어들므로 마스터에만 opticalScale=1.25를 사용했다. 실버는 1.0이며 원본 픽셀과 색상은 편집하지 않았다. 닫힌 버튼과 열린 옵션은 같은 rankEmblem 함수와 파일을 사용하고 silver_plus/master_plus는 별도 + 배지를 유지한다. Vite BASE_URL로 /HOW/ 경로를 지원한다.

이미지 원본은 직접 시각 확인했으나 실제 브라우저의 PC/모바일 드롭다운 크기·선명도·중첩은 아직 미검증이다. 테스트 fixture를 실제 시각 검증이라고 표현하지 않는다.

이번 후속 작업의 변경 파일은 src/data/rankAssets.js, tests/filterCombobox.test.js, 본 문서 및 신규 public/assets/ranks/silver.png, master.png, NOTICE.txt다. rankEmblem.js와 공용 드롭다운·전장 파일은 기존 구현을 그대로 재사용했다. npm.cmd test **160/160 통과**, npm.cmd run build와 npm.cmd run verify:pages 통과, git diff --check 통과(기존 LF/CRLF 경고만 존재), git status 확인. 두 PNG가 dist/assets/ranks에도 동일 SHA256으로 포함됐다. 공용 콤보박스·전장 옵션·heroView·Meta v2·스냅샷/index의 해시도 유지됐다. 원격 작업과 배포는 수행하지 않았다.

미확보 6종을 사용자가 제공하는 경우: 현행 오버워치 등급을 정확히 식별할 수 있는 개별 PNG/WebP 원본, 가능하면 투명 배경·긴 변 80px 이상, 원본 출처 URL 또는 취득 경로, 저작권자와 팬사이트 사용/재배포 조건이 필요하다. 색상 변경·업스케일·타 게임 문양·구형 혼합 자료는 사용하지 않는다. 출처가 불명확한 스크린샷이나 파일만으로 공개 배포 허가가 있다고 판단하지 않는다.

---

이하 내용은 **두 이미지가 확보되기 전 최초 조사 기록**이다.

검토일: 2026-11-06 KST. 공식 이미지 8종 교체 완료가 아니라, 자체 SVG 제거 및 검증되지 않은 자산의 텍스트 폴백 적용이다. 원래 그림을 다른 자체 도형으로 대체하지 않았다.

## 현재 화면

- 일반 등급은 기존 한국어 등급명을 표시한다. 공식 엠블럼이 확보됐다고 표시하지 않는다.
- 누적 등급은 같은 등급명과 ‘이상’ 표기를 유지하고 작은 별도 CSS + 배지를 표시한다. 확인되지 않은 기본 엠블럼은 그리지 않는다.
- all은 전체 등급 텍스트만 사용한다.
- grandmaster는 그랜드마스터·챔피언이라는 기존 통합 표시를 유지한다. champion/challenger 값을 새로 만들지 않았다.
- 현재 실제 연결한 공식 이미지 파일은 **0개**다. 후보 이미지의 바이트를 프로젝트에 저장하지 않았다. 에메랄드도 텍스트 폴백이다.

## 등급별 자산 상태

| 등급 | 실제 사용 파일 | 조사 결과 |
|---|---|---|
| bronze | 없음 | 조사한 공식 자료에서 현재 개별 이미지와 등급 매핑을 검증하지 못함 |
| silver | 없음 | 공개 OverFast fixture에 공식 CDN PNG 참조 존재. 2026 현행 이미지 여부는 미확인 |
| gold | 없음 | 현재 개별 이미지·매핑 미확인 |
| platinum | 없음 | 현재 개별 이미지·매핑 미확인 |
| emerald | 없음 | 공식 2026년 8월 패치에 등급 도입 확인. 최신 개별 엠블럼 미확인 |
| diamond | 없음 | 현재 개별 이미지·매핑 미확인 |
| master | 없음 | OverFast OpenAPI의 rank_icon 예시 PNG 존재. 2026 현행 이미지 여부는 미확인 |
| grandmaster | 없음 | 현재 개별 이미지·매핑 미확인 |

‘미확인’은 공식 자산이 존재하지 않는다는 뜻이 아니다. 이번 조사에서 최신성·정확한 등급 매핑·해당 사용 범위를 함께 입증하지 못했다는 뜻이다. HTTP 200이나 파일명만으로 최신 인게임 이미지라고 판정하지 않았다. OW1/초기 OW2 아이콘을 혼합하거나 CDN 해시 파일명을 추측하지 않았다.

## 확인한 출처

1. [OverFast OpenAPI](https://overfast-api.tekrop.fr/openapi.json): PlayerCompetitiveRank.rank_icon은 등급 아이콘 URL이다. 예시는 아래 마스터 한 개이며 전체 자산 목록이 아니다. [Swagger 문서](https://overfast-api.tekrop.fr/docs)도 확인했다.
2. [공개 fixture](https://github.com/TeKrop/overfast-api/blob/main/tests/fixtures/html/players/TeKrop-2217.html): 실버 CDN 참조를 확인했다. 개인 전적을 수집·저장하거나 HOW 통계에 활용하지 않았다.
3. [공식 Hero Statistics](https://overwatch.blizzard.com/en-us/rates/): 텍스트 등급 선택에서 에메랄드를 확인했지만 개별 엠블럼 목록은 찾지 못했다.
4. [공식 2026년 8월 패치](https://overwatch.blizzard.com/en-us/news/patch-notes/live/2026/08/): 에메랄드 도입 근거. [요청한 한국어 주소](https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/8/)는 조사 도구에서 403이어서 영어 공식 원문도 대조했다.
5. [공식 2024년 2월 패치](https://overwatch.blizzard.com/en-us/news/patch-notes/live/2024/2/): 실력 등급 아이콘 재설계 이력이 있어 오래된 자산의 현재성을 단정하지 않았다.
6. [Spotlight 2026 프레스 자료](https://blizzard.gamespress.com/Overwatch-Spotlight-2026): UI 홍보 이미지 등을 확인했으나 8종 최신 소형 엠블럼 세트를 확인하지 못했다. 스크린샷에서 아이콘을 추출하지 않았다.

확인한 URL 자체는 다음과 같다. 런타임에서는 호출하지 않는다.

| 후보 | URL | 읽기 검증 결과 |
|---|---|---|
| master | https://static.playoverwatch.com/img/pages/career/icons/rank/Rank_MasterTier-7d3b85ba0d.png | 200, image/png, 100×80, 11,483 bytes |
| silver | https://static.playoverwatch.com/images/pages/career/icons/rank/Rank_SilverTier.305e60dca5e95356ced59825426844cc7cdb4948.png | 200, image/png, 80×80, 6,127 bytes |

## 이미지 이용 조건

[Blizzard Legal FAQ](https://www.blizzard.com/en-us/legal/c1ae32ac-7ff9-4ac3-a03b-fc04b8697010/blizzard-legal-faq)의 팬사이트 항목은 비상업적·개인적 이용 범위의 제한적 허용, 권리 고지 유지, 원본 변경 금지 등의 조건을 제시한다. 공개 CDN 접근이나 OverFast 소스의 MIT 라이선스가 블리자드 이미지의 별도 재배포·상업 이용 허가를 의미하지는 않는다. HOW의 공개 저장소/서비스 이용 범위에 대한 무제한 허가로 해석하지 않았다. 이번에는 최신성도 부족해 이미지 파일을 도입하지 않았다. 이는 법률적 확정 판단이 아니라, 검증된 자산만 도입하라는 요구에 따른 구현 결정이다.

## 코드와 향후 연결

- src/data/rankAssets.js: 8종 상태, 미확인 이유, 검토일, 실제 확인한 후보 URL 관리. assetUrl은 모두 null이다.
- src/views/rankEmblem.js: 자체 SVG 경로 제거. status=verified 및 permissionStatus=confirmed인 로컬 경로만 img로 출력한다. 향후 승인된 로컬 자산 URL은 Vite import로 등록할 수 있다. 이미지 실패 시 img만 제거하고 인접 등급명과 + 배지를 유지한다.
- src/styles/filters.css: 티어 이미지와 폴백에 한정하여 변경. object-fit:contain으로 원본 비율을 유지하며 색상 필터를 적용하지 않는다. 원본을 편집하지 않고 +만 별도 요소로 겹친다.
- tests/filterCombobox.test.js: 기존 SVG 기대값을 폴백 검증으로 교체하고, 실제 자산을 배포하지 않는 테스트 전용 registry로 로컬 img·공통 기본 이미지·오류 경로를 검증한다.

전장 grouping/이름/정렬/선택값과 공용 filterCombobox.js, filterOptions.js, heroView.js는 이번 작업에서 변경하지 않았다. 운영 Meta v2, diamond_plus 기본값, 스냅샷도 변경하지 않았다.

## 검증 범위

전체 테스트로 이전 레이블·팝업 배치 수정 상태를 함께 재검증한다. Enter/Space/방향키/Escape/Tab, selected/expanded, Controller change 전달, 전장 그룹과 상세 이동 후 상태, 에메랄드 폴백 및 이미지 오류를 검사한다. 실제 브라우저 PC/모바일 시각 검증은 수행하지 않았다. 실제 공식 이미지의 가독성·픽셀 품질은 사용 이미지 자체가 없어 미검증이다. jsdom 검증을 시각 검증으로 표현하지 않는다.

Commit, Push, PR, 배포, 자동 수집은 수행하지 않았다.

실행 결과: npm.cmd test **158/158 통과**, npm.cmd run build 통과(67 modules), npm.cmd run verify:pages 통과(/HOW/, 로컬 자산 6개). git diff --check는 공백 오류 없이 통과했으며 기존 파일의 LF/CRLF 경고는 남아 있다. git status의 기존 미커밋 작업은 보존했다.
