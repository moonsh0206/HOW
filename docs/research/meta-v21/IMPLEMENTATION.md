# Meta Score v2.1 — 티어 자격 및 추천 표시

검증일: 2026-11-06. 운영 점수 함수 `meta.js`와 65/25/10 정책은 수정하지 않았다. 개발 시작 시 Git 작업 트리는 깨끗했으며 원격 동기화/초기화는 실행하지 않았다.

## 구현

`createHeroModel.enrichedHeroes()` / `heroByKey()` / `visibleHeroes()`가 공유하는 결과에 순수 함수 `applyRecommendationPolicy()`를 적용한다. v2의 최종 S에만 추가 픽률 5% 자격을 적용하여 최대 A로 제한한다. 기존 S 승률·백분위·역할 인원 자격을 통과하지 못한 A를 S로 올리지 않는다. 빈 S를 강제로 채우지 않는다. B/C/D/미분류는 변경하지 않는다.

최종 A는 픽률 >=5% 일반 A, >=3% 및 <5% 조건부 A, <3% 저채용 A로 나눈다. 저채용 A를 B로 내리지 않는다. 비교에는 반올림 표시값이 아닌 저장된 수치를 사용한다.

기본 HOW 정렬은 S → 일반 A → 조건부 A → 저채용 A → B → C → D → 미분류이며 그룹 안에서 원본 Meta Score 내림차순, 동점은 기존 한국어 이름·key순이다. 별도 Meta Score 정렬과 나머지 정렬은 기존 동작을 유지한다.

`baselineTier`, `recommendationGroup`, `recommendationCapped`를 새로 제공한다. 기존 `roleRank`, `metaScore`, 세 백분위, `provisionalTier`, `eligibility`, `capped`는 그대로 보존한다. 특히 `capped`는 기존 v2 자격 제한 여부이며 새로운 제한은 `recommendationCapped`로 구분한다. 추천 순서를 역할 순위로 덮어쓰지 않는다.

표·모바일 카드·상세 모두 기존 `tierButton()`을 공유한다. A 배지 내부 작은 레이블, 접근 가능한 이름/툴팁, 클릭 안내 및 상세 요약의 짧은 설명을 추가했다. 픽률이 표본 크기나 통계적 신뢰도라는 주장은 하지 않는다.

## 실제 저장 자료 결과

`public/data/snapshots`의 v1 2개와 2026-11-06 grouped v2 3개를 기존 검증기로 복원했다. 총 50개 관측 조건(현재 3지역 × 16조건 및 기존 v1 2조건), 2,700 영웅·조건 조합을 비교했다. 각 조건을 독립 계산하며 지역·등급 간 통계를 합치지 않는다. 신규 API 수집은 수행하지 않았다.

아시아 diamond_plus, 2026-11-06 저장 배치:

|영웅|승률|픽률|Meta Score 전/후|역할 순위 전/후|기존 → 신규|
|---|---:|---:|---:|---:|---|
|정크랫|55.5333%|4.9333%|81.590909 / 동일|3 / 3|S → 조건부 A|
|시온|52.0333%|17.0333%|72.500000 / 동일|5 / 5|A → 일반 A|
|도미나|56.8667%|3.1000%|67.500000 / 동일|5 / 5|A → 조건부 A|

기본 추천순에서 시온이 정크랫보다 먼저 표시되며, Meta Score순에서는 정크랫이 먼저다. 도미나와 시온은 서로 다른 역할의 독립 역할 순위다.

|지역|현재 등급·누적 조건 수|변경된 티어 건수|변경 대상|
|---|---:|---:|---|
|아시아|16|1|diamond_plus 정크랫 S→A|
|유럽|16|1|silver 둠피스트 S→A (픽률 4.8%)|
|아메리카|16|1|silver 둠피스트 S→A (픽률 4.9%)|

나머지 45개 현재 조건의 변경 건수는 0이다. 기존 v1 2조건도 변경 0건이다. 총 3건은 영웅·조건 단위이며 중복 제거 영웅 수는 2명이다. 기존 A의 분류/정렬 변경은 티어 문자 변경 건수에 포함하지 않는다.

원본 JSON/index 6개의 SHA-256은 변경 전후 일치한다. 모든 2,700조합의 Meta Score/역할 순위/세 백분위/기존 자격은 exact equality로 검증했다. 전체 비교는 [comparison.json](comparison.json)에 기록했다. 재현: `node scripts/report-meta-v21.js`.

## 변경 파일

- `src/domain/recommendationPolicy.js`: 순수 자격·추천 그룹·설명 정책.
- `src/models/heroModel.js`: 정책 연결 및 기본 정렬.
- `src/views/tierReasonView.js`: 공통 배지·툴팁·접근성.
- `src/views/heroDetailView.js`: 상세 분류 설명.
- `src/styles/main.css`: compact 레이블 스타일.
- `tests/recommendationPolicy.test.js`: 경계·실제 저장 자료·정렬·누락·DOM·상세 전환 회귀.
- `tests/sorting.test.js`: 동일 A 전체가 아닌 동일 추천 그룹 내 점수순을 검증하도록 기존 기대 조정.
- `scripts/report-meta-v21.js`, `scripts/qa-meta-v21.cjs`: 재현 보고·선택적 로컬 브라우저 검증.
- 이 디렉터리: 보고서, 비교 JSON, 스크린샷 및 검증 결과.

## 검증

- 전체 단위/DOM 테스트 169개 통과.
- `npm.cmd run build`, `npm.cmd run verify:pages` 통과: `/HOW/`, 로컬 자산 9개.
- `git diff --check` 통과. Git 상태 확인 완료.
- 실제 headless Chrome 320/375/390/430/1440px에서 표·모바일 카드 분류 동일, 시온 우선 정렬, 조건부 레이블, 키보드 Enter/Escape 안내, 상세 분류 설명, 가로 넘침 0 확인.
- 스크린샷: [390px 목록](qa/390-list.png), [390px 상세](qa/390-detail.png), [1440px 상세](qa/1440-detail.png). 상세 API 응답은 저장 영웅 메타데이터만 사용하는 테스트 fixture이며 기술/특전 실시간 응답 검증을 뜻하지 않는다. 외부 통계 요청은 기존 저장 값으로 대체했다. 실제 모바일 기기/Safari/스크린리더 검증은 수행하지 않았다.

## 한계 및 후속

5%/3%는 채택된 운영 표시 정책이지 표본 기반 신뢰 임계값이 아니다. 향후 실제 조건별 분포·변동을 관측하되 이번 작업에서 추가 가중치 조정이나 데이터 수집은 하지 않았다. 원본 집계 시각의 미제공·검토 상태는 기존 품질 정책을 따른다. 기존 그래프의 긴 소수 표시 등 무관한 UI는 이번 범위에서 변경하지 않았다.

Commit/Push/PR/배포/원격 변경/자동 수집 활성화는 수행하지 않았다.
