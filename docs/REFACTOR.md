# HOW 프론트엔드 리팩터링 기록

## 변경 전

```text
HOW/
  HOW프로젝트 계획서.docx
  인계사항.txt
  API 샘플.url
  API샘플 2(대체 수단).url
  overwatch.jfif
  fxxk/
    prototype.html
    overwatch-2.jpg
```

## 변경 후

위의 모든 기존 파일을 유지하며 다음을 추가했습니다.

```text
HOW/
  index.html
  package.json / package-lock.json / .gitignore
  README.md
  backups/prototype.original.html
  public/assets/hero-banner.jpg
  src/
    main.js
    controllers/heroController.js
    models/heroModel.js
    views/heroView.js
    services/heroService.js
    services/statisticsService.js
    domain/tier.js
    storage/favoritesStorage.js
    styles/main.css
  tests/core.test.js
  docs/REFACTOR.md
  docs/VERIFICATION.md
  node_modules/                 설치 의존성, Git 제외
  dist/                         빌드 결과, Git 제외
```

## 계층별 책임

| 계층 | 책임 |
| --- | --- |
| Model | Hero 정규화·검증, 화면 상태, 검색·역할·정렬·즐겨찾기 선택자 |
| View | 안전한 DOM 구성, 상태·표·즐겨찾기 미리보기·기본 정보 모달 |
| Controller | 사용자 이벤트, 데이터 로딩, Model/View/Storage 연결 |
| Service | OverFast 요청, 타임아웃, HTTP 오류, 중복 요청 공유, 세션 캐시, 정규화 호출 |
| Domain | 계획서 점수식과 인계사항 S~D 백분율 경계값 |
| Storage | 버전이 있는 localStorage 키, 손상·접근 제한 처리 |

Provider 계약은 getHeroes() -> Promise<{ heroes, fetchedAt }>입니다. 테스트에서 fetcher를 주입할 수 있고 이후 다른 제공처로 교체할 수 있습니다. 통계는 별도의 getStatistics() 계약으로 미제공 상태만 반환합니다. 화면에 연결하여 임의 통계를 생성하지 않습니다.

API 응답 문자열은 textContent로 출력하며 이미지 URL은 HTTPS만 허용합니다. 잘못된 레코드·중복 키·알 수 없는 역할은 오류로 처리합니다. 역할 필터는 한 번 받은 목록에 적용하므로 전환마다 요청하지 않습니다. 컨트롤러 로딩 잠금과 Service의 pending Promise로 요청 경합을 예방합니다. 성공 목록은 현재 페이지 세션 동안 캐시하며 재방문 시 다시 조회합니다.

즐겨찾기는 `how:favorites:v1`에 영웅 키만 저장합니다. 저장할 수 없으면 현재 방문 동안 유지하며 안내합니다. 계정 동기화·다중 탭 실시간 동기화는 구현하지 않았습니다.

## 기존 기획의 보존과 결정이 필요한 사항

- 원래 공식 `(승률 × log(사용시간 + 1)) / 100`과 S/A/B/C/D 15/30/50/75% 경계를 Domain에 보존했습니다.
- log는 자연로그로 명시했습니다. 통계 연결 전에 사용시간 단위, 모집단, 시즌, 모드, 동점 정책을 확정해야 합니다.
- 승률 또는 사용시간이 없거나 범위를 벗어나면 점수는 null입니다. 실제 데이터가 없으므로 화면에서 계산·등급 부여를 하지 않습니다.
- 적은 표본에서 S가 없을 수 있는 원래 rank/total 규칙을 그대로 보존하고 테스트했습니다. 제품 정책 확정 후 변경하세요.
- 개발 예정인 전적 검색은 비활성 안내입니다. 기본 정보 모달만 실제 동작하며 기술 상세 화면은 향후 확장합니다.

## 후속 우선순위

1. 통계 제공 방식·재사용 조건 검증. API 계약에 시즌·모드·지역·플랫폼·표본·원천 갱신 시각 포함.
2. 상세 페이지와 기술 정보 Provider 메서드, URL 기반 영웅 라우팅 추가.
3. 백엔드 Provider 프록시, 캐시, 호출 제한·관측성, 공개 전적 예외 처리.
4. 인증과 MySQL 즐겨찾기·검색 기록 저장. 로그인과 친구 목록 접근 권한은 별도 검증.
5. 검증된 통계로 Domain 점수·등급 적용. 부족한 표본과 통계 미제공은 계속 구분.
6. 특전 사용 통계와 Battle.net 친구 연동은 데이터·권한이 확보된 뒤 개발.
