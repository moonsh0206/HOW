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

- 한국어 영웅 목록 API 연동, 실시간 이름/영문 키 검색, 역할 필터, 이름 정렬
- 브라우저 localStorage 즐겨찾기 및 즐겨찾기 전용 목록
- 기본 정보 모달과 향후 상세 페이지 확장 지점
- 12초 요청 타임아웃, 로딩/오류/빈 목록/재시도, 세션 내 캐시·요청 공유
- 모바일 가로 스크롤 표, 키보드 포커스, 네이티브 모달 Escape 닫기

승률·픽률·티어는 미제공입니다. 가상 통계나 가상 순위를 만들지 않습니다. 티어 배지는 설명용 범례입니다. 플레이어 전적·로그인·DB·친구 자동 연동·기술 상세 페이지는 미구현입니다.

## 데이터 및 리소스

영웅 정보는 https://overfast-api.tekrop.fr/heroes?locale=ko-kr 에서 요청합니다. 마지막 조회는 HOW가 데이터를 받은 시각이며 원천 데이터 갱신 시각과 다릅니다. 공식 통계/크롤링 엔드포인트를 사용하지 않습니다.

기존 `fxxk/overwatch-2.jpg`를 `public/assets/hero-banner.jpg`로 복사했습니다. 이 파일만 교체해 배너를 고해상도로 변경할 수 있습니다. CSS의 데스크톱/모바일 background-position도 확인하세요. 원본 해상도로 인한 확대 선명도 한계는 남아 있습니다. 이미지는 Blizzard 관련 리소스로 사용 권한·출처는 공개 서비스 전에 별도로 확인해야 합니다. Google Fonts는 선택적 네트워크 의존이며 실패 시 시스템 글꼴로 표시합니다.

기존 계획서, 인계사항, URL, 이미지, prototype은 그대로 보존했습니다. `backups/prototype.original.html`은 원본과 SHA256이 일치합니다.

구조와 후속 작업은 [리팩터링 기록](docs/REFACTOR.md), 실제 검증 결과는 [검증 기록](docs/VERIFICATION.md)을 참고하세요.

## GitHub Pages 배포 준비

현재 HOW 폴더에는 Git 저장소가 없습니다. 다른 프로젝트와 분리된 HOW 전용 저장소를 만들 계획입니다. 아래 GitHub 작업은 사용자가 공개 범위와 배포를 승인한 뒤 직접 수행하는 절차이며, 아직 실행하지 않았습니다.

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
3. 모바일 390px, 태블릿 768px, 데스크톱 1440px에서 배너·표 내부 스크롤·검색·별 버튼을 확인합니다.
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
