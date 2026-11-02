# OverFast 실제 응답 스냅샷

2026-11-02에 HTTPS GET으로 수집한 가공 전 공개 응답입니다.

- overfast-heroes.json: https://overfast-api.tekrop.fr/heroes?locale=ko-kr
- overfast-stats.json: https://overfast-api.tekrop.fr/heroes/stats?platform=pc&gamemode=competitive&region=asia

각 54개 레코드. 두 요청 모두 HTTP 200, Access-Control-Allow-Origin: *를 확인했습니다. Cache-Control은 heroes 86400초, stats 3600초입니다. 이는 호출 시점의 스냅샷이며 최신 데이터가 아닙니다. 프로덕션 코드에서 import하거나 폴백 화면 데이터로 사용하지 않습니다. 표본 수·원본 집계 시각·시즌은 응답에 포함되지 않았습니다.
