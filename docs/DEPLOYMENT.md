# GitHub Pages 로컬 배포 준비 검증

검증일: 2026-11-02 (Asia/Seoul)

## Git 및 공개 범위

- HOW 및 상위 경로에서 Git 저장소를 발견하지 못했습니다. git status/remote 명령은 not a git repository를 반환했습니다.
- HOW에 git init, 원격 저장소 연결, GitHub 저장소 생성, 커밋, Push, 배포를 수행하지 않았습니다. PEZTZ 및 프로젝트 외부 소스는 수정하지 않았습니다.
- 원본 계획서에 작성자·학번·학교 정보가 존재하고 원본/백업 HTML에 개인 로컬 경로가 존재합니다. 내용은 수정하지 않고 .gitignore로 공개 후보에서 제외했습니다.
- API URL 바로가기는 실행에 필요하지 않아 제외했습니다. 루트 원본 이미지는 미사용이며 제외했습니다. public/assets/hero-banner.jpg만 배포에 필요합니다.
- .env·개인키·토큰 파일을 찾지 못했고 공개 후보 텍스트의 비밀키·이메일·개인 경로 패턴 검사에서 추가 노출을 발견하지 못했습니다. 패턴 검사이며 완전한 비밀 탐지 보장은 아닙니다.
- 임시 디렉터리의 격리된 Git 메타데이터와 HOW work-tree를 이용해 check-ignore 및 공개 후보 목록을 검증했습니다. HOW에 .git을 만들지 않았습니다. node_modules/dist/계획서/인계/백업/프로토타입/.env/.npmrc 제외를 확인했습니다.
- 기존 prototype과 백업 SHA256 일치를 재확인했습니다.

## 변경 파일

- .gitignore: 의존성·산출물·민감 설정·개인 문서·원본 백업 제외.
- vite.config.js, scripts/pages-base.js: 기본 /HOW/, 개발 루트 /, Actions 실제 경로 적용.
- .github/workflows/pages.yml: main 자동 및 수동 실행, Node 24, npm ci/test/build/asset 검증, dist 전용 업로드, 배포 job 권한 분리.
- scripts/verify-pages.js: 빌드 경로·파일 존재·출력 범위 검사, 선택적 로컬 HTTP/MIME 검사.
- tests/pages.test.js: 저장소/루트 base 경로와 잘못된 값 검증.
- package.json: verify:pages 명령 추가. 의존성과 lockfile 내용 변경 없음.
- README.md: 실행·공개 파일·승인 후 GitHub 단계·HTTPS/API 검증 절차.

## 실행 결과

| 항목 | 결과 |
| --- | --- |
| npm ci | 성공, 14개 패키지 설치, audit 취약점 0 |
| npm test | 7개 통과, 0개 실패 |
| npm run build | Vite 7.3.7 성공 |
| npm run verify:pages | /HOW/의 JS·CSS·배너 3개 참조 파일 검증 성공 |
| 로컬 프리뷰 | http://127.0.0.1:4173/HOW/ 실행 성공 |
| verify:pages -- http://127.0.0.1:4173 | HTML·JS·CSS·배너 HTTP 200 및 리소스 MIME 검증 성공 |
| OverFast HTTPS | /heroes?locale=ko-kr HTTP 200, application/json, Access-Control-Allow-Origin: * |

처음 npm ci에서 Windows Rollup 파일 잠금 오류가 발생했습니다. 프로세스 명령행으로 HOW Vite 서버임을 확인한 PID만 종료한 후 재실행해 성공했습니다. Node/Vite 및 HTTPS 검사는 샌드박스 제한으로 필요한 명령만 확장 권한에서 수행했습니다. 시스템 보안 설정은 변경하지 않았습니다.

## 한계와 미완료

GitHub에 접속하거나 실제 Pages 배포를 수행하지 않았으므로 Actions의 원격 실행·HTTPS 사이트·실제 브라우저 종단간 동작은 아직 검증하지 않았습니다. 실제 계정·저장소 URL도 확정되지 않았습니다. 로컬 정적 HTTP 검증은 브라우저 시각 검증을 대체하지 않습니다.

API 검사는 가상의 비민감 Origin(https://example.github.io)을 보낸 읽기 전용 HTTPS 요청입니다. CORS 허용 헤더는 확인했지만 최종 Pages Origin에서의 브라우저 결과는 배포 후 재확인해야 합니다. 기존 1440/768/390px 화면 시각 검증 한계는 그대로 남아 있습니다.

후속 GitHub 설정은 README 순서에 따라 사용자가 승인 후 진행합니다. main Push와 Pages 활성화 이후 자동 배포가 동작하도록 준비되어 있습니다.
