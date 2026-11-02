# HOW HUB OVERWATCH

오버워치 영웅 탐색 프론트엔드. HTML5, CSS3, Vanilla JavaScript ES Modules, Vite를 사용합니다.

## 실행

Node.js 20.19+ 또는 22.12+ 필요. 검증 환경은 Node 24.11.1 / npm 11.6.2입니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

표시된 로컬 URL을 브라우저에서 엽니다. `index.html`을 file://로 직접 열지 마세요. Windows PowerShell에서 npm.ps1 실행이 제한되면 npm.cmd를 사용합니다. 시스템 실행 정책 변경은 필요하지 않습니다.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run verify:pages
npm.cmd run preview
```

배포 산출물은 `dist/`입니다. 개발 서버는 루트(`/`)에서, 기본 빌드·프리뷰는 `/HOW/`에서 제공합니다. 프리뷰 주소는 보통 `http://127.0.0.1:4173/HOW/`입니다. 이번 작업에서는 로컬 설정만 준비했으며 Git 초기화·원격 연결·Push·공개 배포는 수행하지 않았습니다.

## 현재 기능

- 한국어 영웅 목록·실제 승률/픽률/밴률 API 연동, 이름/영문 키 검색, 역할 필터, 승률·픽률·이름 정렬
- PC·경쟁전·아시아·전체 등급·전체 전장 기본값, 모드·지역·경쟁전 등급 변경
- 역할 내 승률 기준 S~D 자체 티어, 통계 결측 영웅 미분류
- 브라우저 localStorage 즐겨찾기 및 즐겨찾기 전용 목록
- 기본 정보 모달과 향후 상세 페이지 확장 지점
- 12초 요청 타임아웃, 로딩/오류/빈 목록/재시도, 세션 내 캐시·요청 공유
- 600px 이하 영웅 카드·601px 이상 데이터 표, 키보드 포커스, 네이티브 모달 Escape 닫기

승률·픽률·밴률은 실제 OverFast 응답만 표시합니다. 누락값은 미제공, 승률 누락 영웅은 미분류이며 가상 값으로 보충하지 않습니다. HOW 티어는 공식 게임 등급이 아닙니다. 플레이어 전적·로그인·DB·친구 자동 연동·기술 상세 페이지는 미구현입니다.

## 데이터 및 리소스

영웅 정보는 https://overfast-api.tekrop.fr/heroes?locale=ko-kr 에서, 통계는 https://overfast-api.tekrop.fr/heroes/stats?platform=pc&gamemode=competitive&region=asia 에서 요청합니다. HOW 조회 시각과 원천 통계 집계 시각은 다릅니다. 원본 집계 시각·표본 수는 API 미제공이며 임의로 추정하지 않습니다. 별도 크롤링은 구현하지 않았습니다.

기존 `fxxk/overwatch-2.jpg`를 `public/assets/hero-banner.jpg`로 복사했습니다. 이 파일만 교체해 배너를 고해상도로 변경할 수 있습니다. CSS의 데스크톱/모바일 background-position도 확인하세요. 원본 해상도로 인한 확대 선명도 한계는 남아 있습니다. 이미지는 Blizzard 관련 리소스로 사용 권한·출처는 공개 서비스 전에 별도로 확인해야 합니다. Google Fonts는 선택적 네트워크 의존이며 실패 시 시스템 글꼴로 표시합니다.

기존 계획서, 인계사항, URL, 이미지, prototype은 그대로 보존했습니다. `backups/prototype.original.html`은 원본과 SHA256이 일치합니다.

구조와 후속 작업은 [리팩터링 기록](docs/REFACTOR.md), 실제 검증 결과는 [검증 기록](docs/VERIFICATION.md)을 참고하세요.

## GitHub Pages 배포 준비

아래 절차는 처음 저장소를 구성할 때의 안내입니다. 이미 HOW 저장소와 Pages를 사용 중이면 git init·remote 추가를 반복하지 마세요. 이번 통계 연동 작업에서는 로컬 파일만 변경하고 원격 연결 변경·Push·공개 배포를 수행하지 않았습니다.

### 공개 범위

`.gitignore`는 node_modules, dist, .env 계열, 인증서·개인키, .npmrc, 편집기·도구 설정, 원본 계획서·인계사항·API 바로가기·프로토타입·백업·미사용 원본 이미지를 제외합니다. 계획서에는 개인 식별 정보가 있고 기존 HTML에는 로컬 사용자 경로가 있어 원본을 로컬에 보존합니다. 이 파일들은 빌드에도 포함되지 않습니다.

공개할 파일은 src, public의 배너 이미지, tests, scripts, docs의 기술 문서, index.html, Vite 설정, package.json, package-lock.json, README 및 Actions 설정입니다. 공개 후보 텍스트에서 API 키·토큰·비밀번호·개인 로컬 경로 패턴은 발견되지 않았습니다. 자동 패턴 검사는 모든 비밀을 보장하지 않으므로 첫 커밋 전에 staged diff도 확인하세요. `package.json`의 private는 npm 게시 방지 설정이며 GitHub 저장소를 비공개로 만들지는 않습니다. 브라우저용 `VITE_*` 환경 변수에는 비밀키를 넣지 마세요.

### GitHub에서 할 일

1. 개인 계정으로 로그인하여 **New repository**에서 `HOW` 전용 저장소를 만듭니다. PEZTZ 저장소를 재사용하지 않습니다. GitHub Free에서 Pages를 사용하려면 공개 저장소가 필요합니다. 초기 README·라이선스·gitignore 자동 생성은 선택하지 않아 빈 저장소로 시작하세요.
2. 공개 파일과 이미지 사용 범위를 검토한 후, 터미널의 현재 위치가 HOW 폴더인지 확인하고 아래 명령을 직접 실행합니다. URL의 `YOUR_ACCOUNT`는 실제 개인 계정으로 바꿉니다.

```powershell
git init -b main
git add .
git status --short
git diff --cached --stat
git diff --cached
# 위에서 개인정보와 제외 파일이 없는지 확인한 다음 진행
git commit -m "Prepare HOW frontend for GitHub Pages"
git remote add origin https://github.com/YOUR_ACCOUNT/HOW.git
git remote -v
git push -u origin main
```

3. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다. Settings → Actions → General에서 GitHub의 공식 Actions 사용이 허용되어 있어야 합니다. 워크플로가 필요한 권한을 job별로 요청하므로 계정 전체 권한을 넓힐 필요는 없습니다.
4. **Actions → Build and deploy HOW to Pages → Run workflow → main**으로 실행합니다. 최초 Push가 Pages 설정 전에 이루어지면 설정 후 수동 실행하세요. 이후 main Push는 자동 배포를 시작합니다. 즉, **첫 Push 및 Pages 활성화는 공개 배포를 시작할 수 있는 단계**입니다.
5. build와 deploy가 모두 성공한 뒤 배포 결과 URL을 엽니다. 일반적인 주소는 `https://YOUR_ACCOUNT.github.io/HOW/`이며 대소문자를 맞춥니다.
6. **Settings → Pages → Enforce HTTPS**가 활성화되어 있는지 확인합니다. 이번 구성에는 커스텀 도메인이 없습니다.

### 경로와 워크플로

Vite 공식 문서: https://vite.dev/guide/static-deploy.html#github-pages

GitHub Pages 공식 문서: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

`vite.config.js`는 로컬 빌드·프리뷰에 기본 `/HOW/`를 적용합니다. Actions는 configure-pages의 `base_path`를 전달해 실제 저장소명 또는 루트 도메인 경로를 반영합니다. JS·CSS와 CSS 내부의 `/assets/hero-banner.jpg`는 빌드 때 이 base 경로로 변환됩니다. 화면은 해시 링크를 사용하므로 현재 페이지 구조에서는 SPA 404 우회 파일이 필요하지 않습니다.

저장소명을 변경하거나 루트 도메인 빌드를 로컬에서 검증하려면 build, verify, preview에서 같은 환경 변수를 유지하세요.

```powershell
$env:VITE_BASE_PATH='/how-web/'  # 루트 도메인은 '/'
npm.cmd run build
npm.cmd run verify:pages
npm.cmd run preview
# 프리뷰 종료 후 기본 /HOW/로 돌아가려면:
Remove-Item Env:VITE_BASE_PATH
```

Actions는 main Push 또는 수동 실행 → npm ci → 테스트 → 빌드 → 경로 검증 → dist 업로드 → Pages 배포 순서입니다. 실패한 빌드는 배포하지 않습니다. Action 버전은 공식 Vite 예제의 커밋 SHA로 고정했으며, 필요 시 공식 릴리스를 확인해 갱신합니다. 서버나 사용자 토큰·PAT 없이 GitHub가 발급하는 실행별 토큰과 OIDC 권한을 사용합니다.

### 배포 후 확인

1. 페이지를 강력 새로고침하고 DevTools → Network에서 JS·CSS·hero-banner.jpg가 200인지, Content-Type이 HTML로 잘못 반환되지 않는지 확인합니다.
2. 새 탭에서 `/HOW/#favorites`를 열어 페이지 로드와 즐겨찾기 전환을 확인합니다. localhost의 즐겨찾기는 배포 주소로 자동 이전되지 않습니다. 같은 github.io 호스트의 프로젝트는 localStorage를 공유할 수 있으며 현재 키는 `how:favorites:v1`입니다.
3. 320/375/390/430px에서 모바일 카드·배너·내비게이션을, 768/1024/1440px에서 표·사이드바를 확인합니다. 600/601px 경계에서 카드·표 중 하나씩만 표시되는지도 확인하세요.
4. Network에서 `https://overfast-api.tekrop.fr/heroes?locale=ko-kr`의 상태·응답·CORS를 확인합니다. 이미지·Google Fonts 요청도 HTTPS인지 확인합니다.
5. Console에서 mixed-content 또는 CORS 오류가 없어야 합니다. API가 429/503이면 제공처 제한·장애를 확인하고 잠시 후 다시 시도하세요. CORS 오류에는 브라우저 보안 해제나 no-cors로 대응하지 않습니다. 제공처 정책 확인 후 허용된 서버 프록시가 필요할 수 있으며 Pages 자체는 백엔드를 실행하지 않습니다.
6. DevTools에서 API 요청을 차단해 오류·재시도를 확인하고, 차단 해제 후 다시 시도합니다.

선택적으로 배포된 페이지의 DevTools Console에서 아래 읽기 전용 요청으로 확인할 수 있습니다. 공개 API만 조회하며 인증 정보를 전송하지 않습니다.

```javascript
const response = await fetch('https://overfast-api.tekrop.fr/heroes?locale=ko-kr');
console.log(response.status, response.type);
const heroes = await response.json();
console.log(Array.isArray(heroes), heroes.length);
```

이번 로컬 HTTPS 요청 검사에서 API는 200 및 `Access-Control-Allow-Origin: *`를 반환했습니다. 이는 현재 접근 가능성을 보여주지만 미래의 정책·가용성 또는 실제 배포 페이지의 브라우저 동작까지 보장하지는 않습니다.

## 모바일 UI 개선

600px 이하에서는 초상화·이름·역할·즐겨찾기와 티어/승률/픽률/밴률을 담은 영웅 카드를 표시하고, 그보다 넓은 화면에서는 데이터 표를 유지합니다. 두 표현은 동일한 Model 선택자를 사용하며 레이아웃 전환을 위한 API 요청이나 별도 상태는 없습니다. 누락 통계는 카드에서도 미제공으로 표시합니다.

모바일 검색을 필터 위로 옮기고, 검색 입력은 16px, 필터·별 버튼·모달 닫기는 최소 44px 터치 영역을 제공합니다. 모달은 동적 화면 높이 제한과 내부 스크롤, 열려 있을 때 배경 스크롤 잠금을 적용합니다. 즐겨찾기를 해제해 카드가 사라질 경우 다음 버튼 또는 검색창으로 포커스를 이동합니다.

새 DOM 테스트에는 개발 의존성 jsdom을 사용합니다. 실제 브라우저 레이아웃을 계산하지 않으므로 너비별 시각 검증을 대신하지 않습니다. 구현·테스트 결과 및 요청한 7개 너비의 미검증 항목은 [모바일 개선 기록](docs/MOBILE-UI.md)에 정리했습니다.

## 실제 통계와 자체 티어

모드: 경쟁전/빠른 대전, 지역: 아시아/유럽/아메리카. 경쟁전 등급은 API 스키마의 전체·브론즈·실버·골드·플래티넘·에메랄드·다이아몬드·마스터·그랜드마스터 이상을 제공합니다. 빠른 대전에서는 등급 선택을 비활성화하고 전체로 초기화합니다. PC·전체 전장은 고정입니다. 지원하지 않는 조건은 요청 전에 거부합니다.

영웅 key와 통계 hero를 연결한 뒤 역할별로 실제 원본 승률을 내림차순 정렬합니다. 유효한 승률이 있는 역할별 영웅 수 N에 대해 S/A/B/C 누적 인원 경계는 각각 ceil(N×15/100), ceil(N×30/100), ceil(N×50/100), ceil(N×75/100)입니다. 나머지는 D입니다. N이 작아도 1위는 S이며 일부 등급은 없을 수 있습니다. 동률은 동일 승률의 가장 높은 순위를 공유합니다(1,1,3). 정렬 화면의 동률은 이름, 영문 키 순으로 안정적으로 표시합니다. 검색·역할 필터·즐겨찾기·정렬은 이미 계산한 역할별 티어를 바꾸지 않습니다.

기존 승률×log(사용시간+1) 공식은 Domain에 보존했지만 현재 산정에는 사용하지 않습니다. 임의의 사용시간·표본 수·신뢰도를 생성하지 않습니다. 0은 유효한 값이며 null/누락과 구분합니다.

통계 Service는 조건별 메모리 캐시와 진행 중 요청을 공유하며 최대 1시간 캐시합니다. Age 헤더를 읽을 수 있으면 잔여 TTL을 줄입니다. Controller는 만료 시 갱신하고, 실패 시 최소 60초 및 Retry-After를 고려해 재시도합니다. ‘통계 확인’도 신선한 캐시와 재시도 대기시간을 존중합니다. 새 조건으로 바꾸면 이전 조건의 값은 즉시 지우며 오래된 요청 결과는 무시합니다. 같은 조건의 이전 성공값이 있으면 갱신 실패 후 ‘오래된 통계’로 표시합니다. 캐시는 페이지 세션 동안만 유지하며 새로고침 후 오프라인 복원은 지원하지 않습니다.

```powershell
npm.cmd test              # Mock/DOM 및 저장된 실제 응답 스냅샷
npm.cmd run test:live     # 네트워크 사용: 실제 HTTPS·CORS 통합 테스트
npm.cmd run build
npm.cmd run verify:pages
```

실제 응답·오류 확인 결과와 파일별 변경 사항은 [통계 연동 기록](docs/STATISTICS.md)을 참고하세요. 과거 검증 문서는 당시 상태를 보존한 기록입니다.
