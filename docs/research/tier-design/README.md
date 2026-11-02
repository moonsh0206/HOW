# 티어 알고리즘 연구 자료

이 폴더는 승인 전 분석 전용입니다. 애플리케이션에서 import하지 않으며 public/ 또는 기존 스냅샷에 데이터를 쓰지 않습니다.

- collect.mjs: 공개 OverFast API와 공개 블리자드 통계 HTML을 같은 조회 조건으로 읽어 evidence.json에 기록합니다. 내부 비공개 엔드포인트를 사용하지 않습니다. 자동 실행/스케줄이 아닙니다.
- evidence.json: 8개 조건의 실제 API/공식 페이지 데이터·조건·조회 시각·표시 문자열 및 현재 영웅 목록.
- analyze.mjs: 네트워크 없이 현재 서비스 함수와 기준 모델을 대조하고 후보 수식·정밀도 민감도를 평가합니다. 결과가 서비스 알고리즘을 변경하지 않습니다.
- results.json: 모든 영웅/조건/후보의 중간값과 요약 결과.
- COMPARISON.md: 요청한 10명의 원본 값 및 조건별 후보 점수·역할 순위·티어.
- candidate-comparison.csv: 위 비교를 기계 판독 가능한 480행으로 제공.

기존 C0는 현재 src/domain/meta.js와 8×54개 결과에서 점수·순위·티어가 일치함을 assert로 확인합니다. C4 자격 불변조건과 결측 테스트도 포함합니다. ±0.1%p 입력은 표시 정밀도 민감도 실험이지 실제 시간 변화나 추정 경기 데이터가 아닙니다.

```powershell
node docs/research/tier-design/analyze.mjs
# 실제 데이터를 새로 수집해야 할 때만 다음을 실행합니다.
node docs/research/tier-design/collect.mjs
```

전체 설계와 출처는 [보고서](../../TIER-ALGORITHM-DESIGN.md)에 있습니다. 제3자 문서의 전체 HTML 복사본은 이 폴더에 남기지 않고 임시 조사 공간으로 옮겼습니다.
