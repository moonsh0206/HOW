import { relation as r, cw } from './shared.js';
export const SUPPORT_COUNTERS = [
  // Doctrine: reviewed current rework; comparative evidence is insufficient for adoption.
  r('ana','kiriko','정화로 수면·치유 차단에 대응할 수 있습니다. 아나 특전 선택과 정화의 재사용 대기를 함께 봐야 합니다.',{counterType:'both',engagementType:'team-utility',references:[cw('ana')]}),
  r('ana','winston','점프로 원거리 지원 위치를 압박하고 방벽으로 사선을 나눌 수 있습니다. 수면총과 적 지원을 주의하세요.',{counterType:'both',engagementType:'team-pressure',references:[cw('ana')]}),
  r('baptiste','dva','주 무기·치유 투사체가 지나가는 사선을 매트릭스로 제한할 수 있습니다. 불사 장치와 자원 고갈은 별도 문제입니다.',{engagementType:'team-utility'}),
  r('brigitte','pharah','근접 도리깨 범위를 벗어난 공중 사선으로 압박할 수 있습니다. 엄폐와 적의 원거리 지원을 고려하세요.'),
  r('illari','winston','점프로 지원 위치를 압박하고 방벽으로 사선을 분리할 수 있습니다. 분출 이탈과 태양석은 주의하세요.',{engagementType:'team-pressure'}),
  r('illari','ashe','시야에 드러난 치유 태양석을 원거리 사격으로 제거할 수 있습니다. 숨겨진 설치 위치에서는 이점이 줄어듭니다.',{engagementType:'team-utility'}),
  r('jetpack-cat','soldier-76','비행으로 드러난 공중 경로를 지속 사격할 수 있습니다. 엄폐와 수송 중 동료의 대응을 고려하세요.'),
  r('juno','soldier-76','수평 비행·체공으로 드러난 사선을 지속 사격할 수 있습니다. 이동 속도와 엄폐에 따라 달라집니다.'),
  r('kiriko','winston','점프로 근접 압박을 시도할 수 있습니다. 순보와 정화로 이탈할 수 있어 확정 처치를 뜻하지 않습니다.',{engagementType:'team-pressure'}),
  r('lifeweaver','ashe','열린 사선의 단상과 지원 위치를 원거리에서 압박할 수 있습니다. 지형·구원의 손길과 이탈을 주의하세요.'),
  r('lucio','moira','광선 추적으로 근거리 벽 타기를 견제할 수 있습니다. 소리 파동과 거리 확보 뒤에는 이점이 줄어듭니다.'),
  r('mercy','soldier-76','수호천사 이동·부활 중 노출된 사선을 지속 사격할 수 있습니다. 엄폐를 넘는 비행까지 막는 것은 아닙니다.'),
  r('mizuki','kiriko','정화로 이동 방해에 대응할 수 있습니다. 방울 재사용 대기와 미즈키의 후속 기술을 주의하세요.',{engagementType:'team-utility'}),
  r('moira','ana','수면총으로 융화의 지속 행동을 방해할 수 있습니다. 소멸이 없는 순간과 적중이 전제입니다.',{engagementType:'team-utility'}),
  r('sombra','winston','짧은 자동화기 사거리 안에서 지원 위치를 압박할 수 있습니다. 위치변환기 이탈과 약화 영역을 주의하세요.',{engagementType:'team-pressure'}),
  r('wuyang','ana','치유 차단으로 대상에게 들어가는 치유의 효율을 제한할 수 있습니다. 파도의 밀치기와 엄폐가 변수입니다.',{engagementType:'team-utility'}),
  r('zenyatta','winston','점프로 기동기가 없는 지원 위치를 압박할 수 있습니다. 부조화와 발차기의 밀치기는 주의하세요.',{engagementType:'team-pressure'}),
  r('zenyatta','ana','치유 차단이 맞은 아군은 초월 치유의 효과를 받기 어렵습니다. 젠야타 본인의 무적을 해제하는 것은 아닙니다.',{engagementType:'team-utility'}),
];
