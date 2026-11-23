// Deliberately narrow bilingual grammar. Unknown prose remains review-required.
export const SYSTEM_NORMALIZATION_VERSION='official-system-v1';
function championWidth(text,locale){
 const ko=locale==='ko-kr';
 const match=(ko
  ? /^6대6 자유 모드에서 챔피언 등급 플레이어를 포함한 그룹의 최대 너비가 (\d+)인에서 (\d+)인으로 감소했습니다\. 이는 5대5 역할 고정 모드에서의 챔피언 등급 플레이어를 포함한 좁은 그룹의 최대 허용 너비에 대응합니다\.?$/
  : /^Reduced the maximum width of groups including Champion rank players from (\d+) to (\d+) in 6v6 Open Queue\. This matches the maximum permitted width of Narrow groups containing Champion players in 5v5 Role Queue\.?$/).exec(text);
 if(!match)return null;
 const before=Number(match[1]),after=Number(match[2]);
 if(!(before>after&&after>=1&&before<=10))return null;
 return {ruleKey:'champion-group-width',gameMode:'live-6v6',before,after,unit:'rank-width',category:'competitive',summaryKo:`6대6 자유 모드 경쟁전에서 챔피언 포함 그룹의 최대 등급 폭이 ${before}에서 ${after}으로 감소했습니다.`};
}
export function pairSystemChange(candidate,english){
 if(candidate.category!=='competitive')return null;
 const facts=championWidth(candidate.evidenceText,'ko-kr');if(!facts)return null;
 const peers=english.filter(p=>p.category==='competitive'&&JSON.stringify(championWidth(p.evidenceText,'en-us'))===JSON.stringify(facts));
 return peers.length===1?{facts,peer:peers[0]}:null;
}
