# 통계 스냅샷 설계 및 승인 전 워크플로 제안

## 적합성

GitHub Pages는 서버 쓰기를 지원하지 않지만, Actions에서 공개 API를 주기적으로 읽고 JSON을 빌드에 포함하는 방식은 초기 소규모 관측에 적합합니다. 초기 조건은 PC/경쟁전/아시아/전체 등급/전체 전장 하나로 제한합니다. 1시간 캐시보다 긴 6시간 간격을 제안합니다. 정각 부하를 피한 UTC 17분 실행은 제안일 뿐이며 스케줄은 활성화하지 않았습니다. 예약 실행은 지연·누락될 수 있어 정밀 시계열이나 경기 단위 분석에 적합하지 않습니다. [GitHub schedule 문서](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## 이번에 구현한 로컬 경로

```text
public/data/snapshots/
  index.json
  2026-11-02T05-36-24.500Z.json
scripts/collect-snapshot.js
src/models/snapshotModel.js
src/services/snapshotService.js
docs/proposals/snapshots.yml.example
```

`npm.cmd run snapshots:collect`는 정확히 한 조건의 통계를 읽어 검증한 후 JSON을 저장합니다. 같은 조건의 마지막 로컬 수집이 1시간 이내이면 API 요청 없이 건너뜁니다. HTTP/잘못된 응답/빈 통계는 파일로 만들지 않습니다. 최초 한 번 실제 API에서 54개 레코드를 수집했습니다. 날짜를 거슬러 가짜 과거 파일을 생성하지 않았습니다.

레코드 형식은 schemaVersion, source, endpoint, filters, collectedAt(UTC ISO), aggregateAt:null, patch:null, cacheAgeSeconds, records입니다. records는 원본 hero/winrate/pickrate/banrate를 보존하고 클라이언트에서 정규화합니다. collectedAt는 요청을 시작한 HOW 수집 시각이며 API 집계 시각이 아닙니다. cacheAgeSeconds도 원본 경기 집계 시각을 뜻하지 않습니다.

index는 파일명·조건·수집 시각을 담습니다. SnapshotService는 현재 조건과 일치하고 HOW 현재 조회보다 1시간 이상 이전, 7일 이내인 가장 최근 파일을 선택합니다. 파일명은 경로가 없는 ISO 기반 이름만 허용하고 파일 내부 조건/시각도 재검증합니다. 목록은 10분 캐시, 불변 파일은 세션 캐시합니다. 파일 누락/검증 실패는 추세 미제공으로 표시합니다.

HOT은 현재 실 API 통계와 이 과거 수집값만 비교합니다. 현재 통계가 오래됐거나 로딩/실패 상태이면 추천을 중지합니다. 최초 파일만 있고 충분한 시간이 지나지 않았으면 HOT 미제공입니다. 패치 정보가 없으므로 패치 전후 변화라고 표현하지 않습니다. API 캐시 때문에 서로 다른 수집 시각의 값이 같을 수 있습니다.

현재 로컬 수집기는 기존 파일을 삭제하지 않습니다. 장기 운영 시 31일 보관(6시간 간격 약 124개)을 권장하지만, 자동 정리·삭제는 별도 승인 후 추가할 사항입니다. 파일 이름/JSON 검증과 수집 재실행 검증은 로컬 테스트에 포함됩니다. 원자적 index 교체를 사용하며 자동 운영 시 concurrency 그룹으로 중복 실행을 방지합니다.

## 자동 워크플로 제안

[검토 전용 초안](proposals/snapshots.yml.example)은 `.github/workflows` 밖에 있고 schedule도 주석입니다. 자동 실행될 수 없습니다. 기존 Pages 워크플로는 수정하지 않았습니다.

첫 도입은 저장소 읽기 권한만 가진 수집 job → JSON artifact → 사람이 검토 후 파일 반영을 권장합니다. Artifact는 저장소 영구 저장이나 Pages 공개가 아니므로 파일을 승인·반영하지 않으면 다음 방문자의 HOT 자료로 배포되지 않습니다. 초안 upload-artifact 버전은 [공식 안내](https://github.com/actions/upload-artifact)를 참고했으며 활성화 전에 검토한 커밋 SHA로 고정해야 합니다.

자동으로 이력을 영구 보관하려면 별도 승인 후 전용 branch/PR 방식이 필요합니다. 그때만 해당 job에 contents:write 및 필요 시 pull-requests:write를 부여하고, public/data/snapshots 하위 JSON만 변경하도록 경로 허용목록·schema 검사를 둡니다. main 직접 쓰기·보호 규칙 우회·계정 전체 권한 확대는 권장하지 않습니다. PR을 만드는 Actions 권한도 저장소 설정에서 별도로 확인해야 합니다.

GITHUB_TOKEN으로 만든 Push가 기존 Pages 빌드를 자동으로 다시 실행한다고 가정하면 안 됩니다. 승인 후 수동 배포 또는 명시적인 후속 실행 연결을 설계해야 합니다. 토큰으로 생성한 PR 실행에도 승인 조건이 있을 수 있습니다. [GitHub 토큰 이벤트 문서](https://docs.github.com/en/actions/concepts/security/github_token).

외부 PR 코드에 쓰기 토큰을 주지 않고 pull_request_target에서 외부 코드를 실행하지 않습니다. 신뢰된 기본 branch/수동 입력만 사용하며 입력값을 shell 명령으로 연결하지 않습니다. 수집에는 API 키가 필요 없고 토큰·계정 정보는 JSON에 기록하지 않습니다.

이번에는 GitHub 저장소 쓰기 권한 변경, 스케줄 등록, artifact 업로드, 원격 연결, Push 및 배포를 수행하지 않았습니다.
