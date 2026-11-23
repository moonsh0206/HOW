// Labels are a presentation subset. The observation series is never resampled.
const kstDay = point => new Date(point.time ?? point.collectedAt).toLocaleDateString('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
export function historyDateLabels(points, width=600, margin=20) {
 if(!points.length)return [];
 const days=points.map(kstDay), crossYear=days[0].slice(0,4)!==days.at(-1).slice(0,4);
 const first=points[0].time,last=points.at(-1).time,span=(last-first)/86400000;
 const spacing=crossYear?88:52, pixels=Math.max(1,width), scale=pixels/600;
 const candidates=points.map((p,i)=>({index:i,day:days[i],x:first===last?300:margin+(p.time-first)/(last-first)*(600-2*margin)})).filter((p,i)=>i===0||p.day!==days[i-1]);
 const result=[];
 for(const p of candidates){
  const previous=result.at(-1);
  if(previous&&(p.x-previous.x)*scale<spacing)continue;
  if(previous&&span>=90&&Date.parse(p.day)-Date.parse(previous.day)<6*86400000)continue;
  result.push(p);
 }
 const end=candidates.at(-1);
 if(result.at(-1)!==end){while(result.length>1&&(end.x-result.at(-1).x)*scale<spacing)result.pop();if(!result.length||(end.x-result.at(-1).x)*scale>=spacing)result.push(end);}
 return result.map(p=>({...p,text:crossYear?p.day.replaceAll('-','/'):p.day.slice(5).replace('-','/')}));
}
