// Summarized from the official Nov 3 (US) / Nov 4 (KR) Retail patch, HERO UPDATES only.
// Edited and checked against Korean live notes and the official announcement.
// Do not include STADIUM UPDATES, 6v6-only changes, or infer a statistics aggregation patch.
export const CURRENT_PATCH_NOTE = Object.freeze({
  officialTitle:'오버워치 패치 노트 - 2026년 11월 4일',
  dateKo:'2026-11-04',
  label:'시즌 5 중간 밸런스 패치',
  type:'balance',
  mode:'일반 5대5 경쟁전·빠른 대전',
  summary:'일반 5대5 기준 영웅 밸런스·기술·특전·UI 변경사항입니다. 스타디움 전용 효과는 포함하지 않았습니다.',
  featuredHeroes:Object.freeze(["junker-queen","brigitte","ana","illari","dmon","genji"]),
  heroChanges:Object.freeze({
  "dmon": {
    "name": "D.Mon",
    "impact": "하향",
    "summary": "방벽 전개 제약 강화와 추진기 충돌 피해 제거",
    "details": [
      "파워 배리어 회복 0.2→0.3초, 최소 전개 시간 0.25초",
      "추진기 충돌 피해 15→0",
      "Overstrike 주요 특전 흡혈 150%→125%"
    ]
  },
  "junker-queen": {
    "name": "정커퀸",
    "impact": "상향",
    "summary": "5대5 기본 생명력과 도륙 사용 주기 상향",
    "details": [
      "기본 생명력 375→425 (5대5)",
      "도륙 재사용 대기시간 9→7초",
      "지휘의 외침에 아군 상태 표시 UI 추가"
    ]
  },
  "mauga": {
    "name": "마우가",
    "impact": "상향",
    "summary": "방어력 및 화염 기관포 지속 피해 증가",
    "details": [
      "기본 방어력 125→150",
      "화염 기관포 불태우기 지속 피해 15→20"
    ]
  },
  "ramattra": {
    "name": "라마트라",
    "impact": "상향",
    "summary": "공허 가속기의 탄약 증가",
    "details": [
      "공허 가속기 탄약 100→125발"
    ]
  },
  "winston": {
    "name": "윈스턴",
    "impact": "하향",
    "summary": "활력 충전 방벽 특전 치유량 감소",
    "details": [
      "활력 충전 방벽 주요 특전 초당 치유 35→30"
    ]
  },
  "anran": {
    "name": "안란",
    "impact": "조정",
    "summary": "원거리 피해와 궁극기 시전 속도 상향, 돌진 밀쳐내기 제거",
    "details": [
      "주작의 부채 피해 22→24",
      "맹염 질주 밀쳐내기 및 동일 대상 중복 적중 제거",
      "주작 승천 시전 시간 1.2→1초"
    ]
  },
  "echo": {
    "name": "에코",
    "impact": "상향",
    "summary": "공중 탄약 특전 사용 시 탄약 보충",
    "details": [
      "공중 탄약 보조 특전 사용 시 탄약 보충 추가"
    ]
  },
  "emre": {
    "name": "엠레",
    "impact": "상향",
    "summary": "사이버 파편 수류탄 폭발 시간 감소",
    "details": [
      "사이버 파편 수류탄 폭발 시간 0.6→0.5초"
    ]
  },
  "genji": {
    "name": "겐지",
    "impact": "하향",
    "summary": "튕겨내기 지속 시간 감소",
    "details": [
      "튕겨내기 지속 시간 2→1.5초"
    ]
  },
  "hanzo": {
    "name": "한조",
    "impact": "조정",
    "summary": "음파 분열과 해킹 생명력 팩 상호작용 변경",
    "details": [
      "음파 분열 주요 특전이 솜브라가 해킹한 생명력 팩을 덮어쓰지 않음"
    ]
  },
  "reaper": {
    "name": "리퍼",
    "impact": "상향",
    "summary": "기본 생명력 증가",
    "details": [
      "기본 생명력 275→300"
    ]
  },
  "shion": {
    "name": "시온",
    "impact": "상향",
    "summary": "처형 산탄 범위 및 광란의 살육 동작 시간 감소",
    "details": [
      "처형 시작 산탄 범위 8.5→5.7도",
      "광란의 살육 연사당 시전·이동 시간 0.6→0.5초"
    ]
  },
  "vendetta": {
    "name": "벤데타",
    "impact": "하향",
    "summary": "연속 공격 속도·도약·특전 밀쳐내기 감소",
    "details": [
      "팔라틴 팽 첫 휘두르기 지연 0.15→0.2초",
      "내리치기 도약 속도 11→9.5",
      "소용돌이 질주 ‘맹렬한 폭풍’ 특전 밀쳐내기 8→4"
    ]
  },
  "ana": {
    "name": "아나",
    "impact": "하향",
    "summary": "생체 수류탄 적 대상 폭발 피해 감소",
    "details": [
      "생체 수류탄 폭발 피해 90→60 (자가 치유 상향은 유지)"
    ]
  },
  "baptiste": {
    "name": "바티스트",
    "impact": "편의성",
    "summary": "치유 파동에 아군 상태 확인 UI 추가",
    "details": [
      "치유 파동 범위 내·효과 적용 중 아군을 표시하는 UI 추가"
    ]
  },
  "brigitte": {
    "name": "브리기테",
    "impact": "상향",
    "summary": "격려의 즉시 치유량과 발동 빈도 증가",
    "details": [
      "격려 내부 재사용 대기시간 1.25→1초",
      "격려 즉시 치유량 12→15"
    ]
  },
  "doctrine": {
    "name": "독트린",
    "impact": "하향",
    "summary": "핵심 기술 재사용 대기시간과 피해·치유 효율 하향",
    "details": [
      "추진형 장막 8→10초, 주입 8→9초",
      "영겁의 홀 기본 발사 후딜레이 0.6→0.65초",
      "주입 상태 피해 90→80, 치유 120→110"
    ]
  },
  "illari": {
    "name": "일리아리",
    "impact": "상향",
    "summary": "태양 소총 충전 시간 감소와 태양석 치유 증가",
    "details": [
      "태양 소총 최대 충전 시간 0.65→0.575초",
      "치유의 태양석 투사체당 치유량 40→50"
    ]
  },
  "jetpack-cat": {
    "name": "제트팩 캣",
    "impact": "조정",
    "summary": "생명력·연료 재생 감소와 비행 가속도 증가",
    "details": [
      "기본 생명력 225→200",
      "정신 없는 비행 가속도 초당 25→28m",
      "연료 재생률 초당 25%→20%"
    ]
  },
  "sombra": {
    "name": "솜브라",
    "impact": "하향·조정",
    "summary": "긴급 패치 지속 시간·약화 효과 감소 및 EMP 상호작용 변경",
    "details": [
      "긴급 패치 지속 시간 12→10초",
      "사이버 스페이스 약화 효과 50%→40%",
      "EMP가 생명력 팩에 적용된 적 해킹 효과를 덮어씀"
    ]
  }
}),
  sourceUrl:'https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/11/#patch-2026-11-03',
  sourceId:'patch-2026-11-03',
  reviewedAt:'2026-11-04',
  statisticsWindowStatus:'unverified',
});
export function currentHeroPatch(heroKey){return CURRENT_PATCH_NOTE.heroChanges[heroKey] ?? null;}
