# HOW Meta Tier 엠블럼 및 역할 정렬 개선

2026-11-16 로컬 구현·검증 완료. Commit·Push·배포는 하지 않았다.

기존 작업에서 남아 있던 안정화 변경은 보존했다. 이번 작업에서는 Meta Score/티어 계산, API 서비스, 스냅샷·HOT·순위 저장 파일을 추가 수정하지 않았다.

## 변경 내용

- **티어:** 아래가 뾰족한 간단한 SVG 방패. 다크 단색 면, 얇은 테두리와 굵은 중앙 글자. S=골드, A=퍼플, B=블루, C=틸, D=그레이이며 광택·네온·그라데이션·장식은 추가하지 않았다.
- **공통 표시:** `metaTierEmblem.js`를 목록·모바일 카드·즐겨찾기 미리보기·영웅 상세·기존 상세 dialog에서 재사용한다. 클릭 대상 `data-tier`, 설명 tooltip, 조건부/저채용 A 안내 및 접근성 이름은 유지한다. 미분류 영웅에 등급을 만들지 않는다.
- **역할:** 기존 프로젝트의 `docs/research/zero-rate-audit/blizzard-data.json`에 기록된 Blizzard 공식 SVG 3개를 그대로 로컬 자산으로 보관해 재사용한다. 방패/탄환 3개/십자 및 원래 원형 테두리를 다시 그리지 않았다. CSS alpha mask로 색과 크기만 조정한다. 출처 URL과 원본 SHA-256은 `public/assets/roles/NOTICE.txt`에 기록했다.
- **버튼:** 역할 버튼은 같은 SVG와 읽을 수 있는 KO/EN 이름을 함께 사용한다. 작은 화면에서는 아이콘 위·이름 아래 배치로 축소한다. `title`, `aria-label`, `aria-pressed`, 기존 역할 dataset과 클릭 동작을 유지한다.
- **정렬:** 기존 table을 유지하고 colgroup에서 열 너비를 공통 정의한다. 역할·티어 헤더와 셀을 중앙 정렬하고 패딩·vertical-align·line-height 및 행 높이를 정리했다. 순위 열은 별도로 확보해 등락 배지와 영웅 이름이 겹치지 않는다.
- **모바일:** 작은 엠블럼과 공식 역할 아이콘을 사용하며 조건부 안내의 공간을 예약한다. 320px 영어 저채용 문구는 두 줄로 표시해 인접 지표나 다음 카드에 겹치지 않도록 했다.

## 이번 작업의 파일

| 파일 | 내용 |
|---|---|
| `src/views/metaTierEmblem.js` | 공통 방패 SVG 컴포넌트 |
| `src/views/roleIcon.js` | 공식 역할 SVG 표시 및 동적 KO/EN 이름 |
| `src/views/tierReasonView.js` | 기존 버튼 안에 엠블럼 표시, 설명/클릭 보존 |
| `src/views/heroView.js` | 테이블·카드·즐겨찾기·dialog 및 역할 버튼 연결 |
| `src/views/heroDetailView.js` | 기존 역할 배지에 공통 아이콘 사용 |
| `src/styles/metaEmblems.css` | 등급 팔레트·방패·아이콘·열 정렬·모바일 안내 공간 |
| `src/main.js` | 새 UI 스타일 import |
| `index.html` | 기존 테이블에 공통 colgroup 및 헤더 class 추가 |
| `public/assets/roles/` | 공식 SVG 원본 3개와 출처/해시 |
| `tests/metaEmblems.test.js` | 접근성·언어·기존 버튼 및 즐겨찾기 의미 검증 |
| `scripts/qa-meta-emblems*.cjs` | 전후 캡처 및 기존 production browser suite 재사용 |

## 검증 결과

- 전체 테스트 **293/293 통과**. 신규 컴포넌트의 접근성·조건부 안내 및 기존 검색/즐겨찾기/정렬/일일 등락/상세 등을 포함한다.
- 프로덕션 빌드 및 **440개 KO/EN 정적 진입점** 생성 통과.
- Pages 파일 검증 통과. 공식 역할 SVG 3개도 `/HOW/assets/roles/` 빌드 경로에 포함됐다.
- Chrome **1440/390/320px × KO/EN 6개 조합**에서 전후 캡처. 등급 5개, 공식 SVG HTTP 200, 역할 이름·tooltip, 조건부 안내의 가로/세로 경계, ▲/▼/= 간격, 즐겨찾기·상세 및 가로 넘침 없음 확인.
- 기존 production-build 통합 browser suite도 320/375/390/430/1440px **5개 해상도 통과**. 언어 전환, 검색·플레이어·즐겨찾기·상세 및 뒤로 가기 포함. 기존 캡처 데이터를 사용하며 새 운영 통계를 수집하지 않았다.
- `git diff --check` 통과. 실물 모바일/Safari는 미검증이다.

1440px 헤더 중심과 표시 요소 중심의 가로 오차:

| 언어 | 역할 이전 → 이후 | 티어 이전 → 이후 |
|---|---:|---:|
| KO | 16.73px → **0px** | 42.02px → **0px** |
| EN | 12.55px → **0px** | 59.40px → **0px** |

검증 중 발견한 320px 영어 저채용 안내의 좁은 줄바꿈/세로 잘림은 명시적 안내 너비와 공간 예약으로 수정해 재검증했다. 역할 명칭은 프로젝트 번역 추출 규칙에 맞춰 처리했으며 최종 실패 테스트는 없다.

## 전후 스크린샷

비교 자료는 캡처된 실제 영웅 metadata와 **2026-11-06 아시아 다이아몬드 저장 통계**를 사용한다. 현재 운영 관측이 아니다. ▲/▼/= 및 날짜는 간격 검증을 위한 메모리상의 fixture이며 순위 파일에 저장하지 않는다. 상단 S/A/B/C/D 5개 샘플도 QA 전용으로 제품 화면에 추가하지 않았다. 외부 portrait 요청은 차단해 양쪽 모두 기존 문자 fallback을 표시한다.

before는 결과 JSON에 기록된 baseline SHA의 추적된 UI 파일을 테스트 서버 메모리에서 읽는다. 워크스페이스 checkout/복원은 하지 않으며 기존 로컬 비 UI 스타일은 동일하게 사용한다. after는 현재 로컬 UI 파일이다.

| 화면 | 이전 | 이후 |
|---|---|---|
| PC 1440 KO | [이전](qa/meta-emblems/before/1440-ko-list.png) | [이후](qa/meta-emblems/after/1440-ko-list.png) |
| PC 1440 EN | [이전](qa/meta-emblems/before/1440-en-list.png) | [이후](qa/meta-emblems/after/1440-en-list.png) |
| 모바일 390 KO | [이전](qa/meta-emblems/before/390-ko-list.png) | [이후](qa/meta-emblems/after/390-ko-list.png) |
| 모바일 390 EN | [이전](qa/meta-emblems/before/390-en-list.png) | [이후](qa/meta-emblems/after/390-en-list.png) |
| 모바일 320 KO | [이전](qa/meta-emblems/before/320-ko-list.png) | [이후](qa/meta-emblems/after/320-ko-list.png) |
| 모바일 320 EN | [이전](qa/meta-emblems/before/320-en-list.png) | [이후](qa/meta-emblems/after/320-en-list.png) |

같은 폴더의 `*-grades.png`, `*-favorites.png`, `*-detail.png`, `*-conditional.png`에서 등급 전체·즐겨찾기·상세·조건부 표시를 따로 비교할 수 있다. 수치 결과는 before/after의 `results.json`, production 회귀는 `regression/browser-results.json`에 있다.

재실행:

```powershell
node scripts/qa-meta-emblems.cjs before
node scripts/qa-meta-emblems.cjs after
npm.cmd test
npm.cmd run build
node scripts/verify-pages.js
node scripts/qa-meta-emblems-regression.cjs
```

이번 UI 변경에는 새 운영 변수나 API/데이터 수집 설정이 필요 없다. 배포는 사용자 승인 후 별도로 진행한다.
