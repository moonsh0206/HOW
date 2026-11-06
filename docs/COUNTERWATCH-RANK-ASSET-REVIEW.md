# Counterwatch 랭크 이미지 조사 및 HOW 연결 상태

검토일: 2026-11-06 KST. **공식 엠블럼 연결은 보류 상태**다. 실제 HOW에서 사용 중인 공식 이미지 파일은 0개이며, 자체 엠블럼을 새로 만들지 않았다.

## 확인한 Counterwatch 구현

[공개 업데이트 기록](https://www.counterwatch.gg/patch-notes)에서 다음 내용을 확인했다.

- v2.56.0, 2026-08-13: Overwatch 에메랄드 등급과 전용 엠블럼 지원.
- v2.81.0, 2026-10-20: 이미지의 빈 여백 때문에 등급별 문양 크기가 달랐던 문제를 수정하고 가시 높이를 통일.

이것은 Counterwatch **앱/서비스의 업데이트 기록**이다. 블리자드 자산 재사용 허가나 모든 이미지의 공식 출처를 입증하지는 않는다.

[티어리스트](https://www.counterwatch.gg/stats/overwatch/tier-list)와 공개 영웅 페이지의 서버 HTML을 읽기 전용으로 확인했다. 해당 HTML에는 랭크 img 요소가 없었고, img src/currentSrc 또는 랭크 이미지 background-image를 확인하지 못했다. 페이지가 직접 로드하는 공개 JS/CSS만 추가로 읽었으며 내부 API는 호출하지 않았다. 이미지 파일을 복제하거나 핫링크하지 않았다.

검토한 공개 파일:

- https://www.counterwatch.gg/_next/static/chunks/36af_03xs76q5.js
- https://www.counterwatch.gg/_next/static/chunks/18uzjt6ggrrci.js

공개 코드에서 RANK_ART_BOUNDS에 원본 캔버스와 가시 문양 영역 정보를 두고, 표시 높이와 가시 영역 비율로 너비를 계산하는 방식이 확인됐다. SVG viewBox 및 내부 image로 투명 여백을 고려한 표시를 수행한다. 그래프 tick에 20px 표시 높이를 전달하는 경로도 확인됐다. 이는 특정 그래프의 코드 경로이며 드롭다운의 실제 계산된 표시 크기를 측정한 결과가 아니다. 관련 소스 코드를 HOW에 복제하지 않았다.

**확인하지 못한 것:** 런타임 img src/currentSrc, 엠블럼 실제 호스트, 실제 파일 형식, 실제 파일의 픽셀 크기, 드롭다운의 computed 크기, 에메랄드의 블리자드 원본 URL, Counterwatch 이미지의 재사용 허가. 코드의 fileW/fileH 선언은 이미지 파일의 실측 결과로 취급하지 않았다. Counterwatch가 자기 도메인에서 제공한다고도, 블리자드 CDN에서 직접 제공한다고도 확정하지 않았다.

## 등급별 연결 결과

아래 ‘후보 URL’은 이전 조사에서 **실제 참조와 HTTP 응답을 확인한 것**만 기록했다. Counterwatch에서 찾은 이미지 URL이 아니다. 이번에 새 URL을 추측하지 않았다.

| 등급 | 이미지 URL | 원본 출처 근거 | 이미지 크기 | 2026 최신 여부 | HOW 용도 사용 가능 여부 | 실제 연결 |
|---|---|---|---|---|---|---|
| bronze | 미확인 | 공식 단독 자산 미확인 | 미확인 | 미확인 | 미확인 | 아니오 · 텍스트 |
| silver | 아래 Silver 후보 | OverFast 공개 fixture → 블리자드 CDN | PNG 80×80 (이전 읽기 검증) | 미확인 | 최신성·이용 범위 검토 대기 | 아니오 · 텍스트 |
| gold | 미확인 | 공식 단독 자산 미확인 | 미확인 | 미확인 | 미확인 | 아니오 · 텍스트 |
| platinum | 미확인 | 공식 단독 자산 미확인 | 미확인 | 미확인 | 미확인 | 아니오 · 텍스트 |
| emerald | 미확인 | 공식 등급 도입 및 Counterwatch 지원만 확인 | 미확인 | 개별 이미지 미확인 | 미확인 | 아니오 · 텍스트 |
| diamond | 미확인 | 공식 단독 자산 미확인 | 미확인 | 미확인 | 미확인 | 아니오 · 텍스트 |
| master | 아래 Master 후보 | OverFast OpenAPI rank_icon 예시 → 블리자드 CDN | PNG 100×80 (이전 읽기 검증) | 미확인 | 최신성·이용 범위 검토 대기 | 아니오 · 텍스트 |
| grandmaster | 미확인 | 공식 단독 자산 미확인 | 미확인 | 미확인 | 미확인 | 아니오 · 텍스트 |

- Silver 후보: https://static.playoverwatch.com/images/pages/career/icons/rank/Rank_SilverTier.305e60dca5e95356ced59825426844cc7cdb4948.png
- Silver 참조: https://github.com/TeKrop/overfast-api/blob/main/tests/fixtures/html/players/TeKrop-2217.html
- Master 후보: https://static.playoverwatch.com/img/pages/career/icons/rank/Rank_MasterTier-7d3b85ba0d.png
- Master 참조: https://overfast-api.tekrop.fr/openapi.json
- [블리자드 에메랄드 도입 근거](https://overwatch.blizzard.com/en-us/news/patch-notes/live/2026/08/)
- [공식 프레스 자료](https://blizzard.gamespress.com/Overwatch-Spotlight-2026)는 이전 조사에서 최신 8종 소형 엠블럼 세트를 확인하지 못했다.

## 사용 조건과 보류 이유

[Blizzard Legal FAQ](https://www.blizzard.com/en-us/legal/c1ae32ac-7ff9-4ac3-a03b-fc04b8697010/blizzard-legal-faq)의 제한적 팬사이트 이미지 허용과 원본·권리 고지 유지 조건은 [기존 자산 조사](RANK-EMBLEM-ASSETS.md)에 정리했다. Counterwatch에서 이미지를 쓴다는 사실이나 OverFast의 MIT 라이선스를 이미지 재배포 허가로 해석하지 않는다. Counterwatch의 자산을 복제·다운로드·핫링크하지 않았다. 공식 출처가 확인된 후보도 이번 조사로 2026 최신성이나 HOW 공개 저장소/서비스 사용 범위가 추가 확정되지는 않았다.

연결하려면 실제 원본 URL, 등급 식별 근거, 현행 이미지 여부, 적용 가능한 이용 조건을 확인해야 한다. 현재 부족한 근거를 확인 완료로 채우거나 이미지 해시 경로를 생성하지 않는다.

## HOW에서 보완한 코드

- src/data/rankAssets.js: sourceUrl, format, width/height, reviewedAt, currentVersionStatus, permissionStatus, opticalScale을 명시한다. 후보 해상도와 승인된 사용 자산 해상도를 구분한다. 모든 assetUrl은 null이다.
- src/views/rankEmblem.js: 검증된 로컬 이미지에 한해 명시적 opticalScale을 적용할 수 있도록 준비했다. 기본값은 1이다. 0.75~1.5의 유한 숫자만 허용하는 UI 안전 범위를 뒀다. 이 범위는 실제 등급별 최적 크기를 측정한 값이 아니며, 현재 모든 등급은 보정하지 않는다. 이미지 실패 시 보정도 제거하고 텍스트 폴백을 유지한다.
- src/styles/filters.css: 기존 28px/모바일 25px 박스와 원본 비율을 유지하면서 균일 scale만 적용한다. 원본 픽셀·색상은 편집하지 않는다. + 배지는 별도 요소이며 이미지보다 위에 그린다. 전장 스타일은 변경하지 않았다.
- tests/filterCombobox.test.js: 테스트 전용 가상 registry로 일반/plus가 같은 이미지·배율을 사용하는지, 비정상 배율 거부, 오류 폴백, 미승인 자산 차단을 검사한다. 테스트 이미지는 공식 자산으로 출하하지 않는다.

공용 combobox, 전장 grouping/이름/정렬/값, heroView, statisticsModel, meta.js, 원본 스냅샷은 이번 작업에서 수정하지 않았다. 16개 값과 diamond_plus, 그랜드마스터·챔피언 통합 라벨을 유지했다.

## 검증 한계

라이브 브라우저 개발자 도구와 PC/모바일 시각 검증은 이번 작업에서 수행하지 않았다. 공개 HTML/JS/CSS 조사와 jsdom 테스트를 실제 화면 측정이라고 표현하지 않는다. 공식 이미지가 연결되지 않았으므로 실제 문양의 선명도와 가시 높이 균일성은 아직 검증할 수 없다. 빌드·단위 테스트 통과가 이미지 확보 완료를 의미하지 않는다.

Commit, Push, PR, 배포, 원격 코드 변경, 통계 수집은 수행하지 않았다.

최종 검증: npm.cmd test **159/159 통과**, npm.cmd run build 통과(67 modules), npm.cmd run verify:pages 통과(/HOW/, 로컬 자산 6개), git diff --check 통과(기존 LF/CRLF 경고만 존재), git status 확인. 공용 드롭다운·전장 옵션·heroView·통계 필터·Meta v2·공개 스냅샷/index의 작업 전후 SHA256도 동일함을 확인했다.
