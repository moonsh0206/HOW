# 영웅별 맵 통계 조회

검증일: 2026-11-04 (한국). 로컬 구현 및 테스트만 수행했다. Push·Pages 배포 없음.

## 추가 기능

영웅 상세의 전체 정보 탭에서 기존 통계 요약 바로 아래에 '맵별 통계'를 추가했다. 맵을 선택하면 전체 맵 승률, 선택 맵 승률, 두 승률 차이(%p), 선택 맵 픽률·밴률을 표시한다. 해당 영웅이 없거나 모든 통계가 null이면 '해당 맵 통계 미제공'이다. 0은 실제 숫자로 표시하고 null을 0으로 바꾸지 않는다. 빠른 대전에서 밴률이 없으면 미제공이다.

네이티브 label/select와 44px 이상의 입력·버튼 높이를 사용한다. 재렌더 뒤 드롭다운 포커스를 복원하며 모바일에서는 수치 영역이 3열로 줄어든다. 기술·특전 탭에서는 이 영역을 숨긴다. 맵 명칭은 API 영문명을 기본으로 사용하며 부산과 왕의 길은 한국어 이름을 적용했다.

## 데이터·서비스 구조

- `/maps`의 공개 응답과 OpenAPI를 확인했다. `uses`는 standard/stadium/workshop/arcade/training을 구분한다.
- standard를 포함하고 control/escort/hybrid/push/flashpoint 중 하나에 속하며 공개 MapKey enum에 존재하는 **31개 키**를 검증 목록으로 저장했다. 특정 시즌의 현재 맵 로테이션 전체가 보장된다고 주장하지 않는다. 경기 통계가 제공되지 않는 맵은 빈 상태 또는 요청 오류로 처리한다.
- 실행 시 `/maps`를 다시 조회하여 standard 맵만 선택지로 제공한다. 스타디움·아케이드 전용·훈련장·사용자 지정용은 제외한다. 공개 스키마와 별도로 새 키가 추가되면 검토 후 허용 목록을 갱신해야 한다.
- `statisticsModel`의 기본 조건은 PC/아시아/경쟁전/다이아몬드/전체 맵 그대로이다. 선택 맵일 때만 URLSearchParams에 map을 추가한다. 임의 키와 쿼리 삽입 문자열은 거부한다. 전체 맵 쿼리는 이전과 동일하다.
- 기존 StatisticsService 한 인스턴스를 메인 통계와 상세 맵 조회가 공유한다. 전체 맵과 개별 맵의 URL 쿼리가 달라 캐시가 분리된다. 1시간 TTL, 요청 공유, 타임아웃, 429/503 오류와 동일 조건 stale fallback은 기존 구현을 재사용한다.
- MapService는 목록만 24시간 캐시하고 진행 중 요청을 공유한다. 실패 후 재시도 가능하다.
- MapStatisticsController의 상태는 메인 Model과 별개다. 상세 진입은 목록만 요청하고, 사용자가 선택하기 전 맵 통계 호출은 없다. 선택 후 반환된 전체 영웅 응답에서 현재 영웅만 표시한다. 영웅/지역/등급/모드 변경 시 선택 맵은 유지하되 같은 새 조건으로 재조회하며, 이전 요청은 generation으로 무시한다. 목록으로 나갈 때도 요청 결과를 무시한다.
- 전체 맵 기준은 현재 Model의 실제 결과를 사용한다. 지역·등급·모드·플랫폼·전체 맵 조건이 모두 맞지 않거나 아직 로드되지 않으면 기준 승률과 차이를 미제공으로 표시한다. 비교를 위해 임의 값이나 다른 코호트 통계를 사용하지 않는다. 두 응답의 조회 시각이 완전히 동일하다는 보장은 없으며 각기 캐시된 관측일 수 있다. 오래된 결과는 표시한다.
- 메인 state.statistics, statsFilters, 정렬, Meta Score 및 S 자격 조건을 변경하지 않는다. 맵 통계로 티어를 재산정하지 않는다. 표본 수·경기 수·신뢰도를 추정하지 않는다.

## 실제 API 검증

PC / 아시아 / 경쟁전 / 다이아몬드 조건으로 직접 요청했다. 두 응답 모두 HTTPS, HTTP 200, 54명, `Access-Control-Allow-Origin: *`였다. Node 요청에 Origin 헤더를 넣어 응답 헤더를 확인했으며 실제 브라우저 CORS 동작을 시험한 것은 아니다.

| 맵 | 키 | 토르비욘 승률 | 픽률 | 밴률 |
|---|---|---:|---:|---:|
| 부산 | busan | 58.2% | 9.8% | 3.2% |
| 왕의 길 | kings-row | 53.2% | 9.1% | 2.8% |

이는 검증 시점의 실제 API 응답이며 고정 서비스 값으로 넣지 않았다. 이후 캐시 갱신·원본 변경 시 달라질 수 있다. Age 헤더는 두 응답 모두 미제공이었다. 원본 집계 마감 시각이나 표본 수는 확인되지 않았다. 검증 기록과 공개 Map 스키마는 `research/map-statistics/live-check.json`에 보존했다.

참고: [공개 OpenAPI](https://overfast-api.tekrop.fr/openapi.json), [맵 목록](https://overfast-api.tekrop.fr/maps), [부산 조회](https://overfast-api.tekrop.fr/heroes/stats?platform=pc&gamemode=competitive&region=asia&competitive_division=diamond&map=busan), [왕의 길 조회](https://overfast-api.tekrop.fr/heroes/stats?platform=pc&gamemode=competitive&region=asia&competitive_division=diamond&map=kings-row).

## 검증 및 한계

- `npm.cmd test`: **95개 통과**. 새 테스트 6개는 쿼리/키 검증, 맵 분류, 목록 캐시·실패/재시도, all/busan/kings-row 통계 캐시 분리·동시 요청 공유, 늦은 맵/영웅/코호트 응답 무시, 0/null/빈 상태/차이 계산, 실제 상세 DOM 선택 이벤트·포커스·즐겨찾기 컨트롤·전체 맵 티어 불변을 포함한다.
- `npm.cmd run build`: 통과.
- `npm.cmd run verify:pages`: 통과.
- 실제 브라우저 도구가 'No browser is available'을 반환했다. 모바일 픽셀 배치·가로 넘침·터치·실제 브라우저 CORS는 미검증이다. DOM 테스트와 반응형 CSS 검토를 실제 시각 검증으로 간주하지 않는다.
- 31개 맵 전체 및 모든 지역/등급/모드 조합을 실호출하지 않았다. 부산·왕의 길만 위 조건에서 확인했다. API 응답 실패는 UI 오류와 재시도로 표시하며 성공한 것으로 대체하지 않는다.
- 카운터 DB·패시브·특전·패치 그래프·즐겨찾기 및 기존 전체 맵 정책 유지. 공개 UI에 실제 통계처럼 표시되는 가상 수치를 추가하지 않았다.

## 변경 파일

신규: `src/data/standardMaps.json`, `src/models/mapModel.js`, `src/services/mapService.js`, `src/controllers/mapStatisticsController.js`, `src/views/mapStatisticsView.js`, `tests/mapStatistics.test.js`, `docs/research/map-statistics/live-check.json`, 본 문서.

수정: `src/models/statisticsModel.js`, `src/controllers/routingController.js`, `src/views/heroDetailView.js`, `src/styles/detail.css`, `src/main.js`.
