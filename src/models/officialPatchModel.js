export const PATCH_CHANGE_TYPES=['buff','nerf','mixed','adjustment','bugfix'];
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function officialPatchUrl(value,id){try{const u=new URL(value);return u.origin==='https://overwatch.blizzard.com'&&/^\/(ko-kr|en-us)\/news\/patch-notes\/live\/\d{4}\/\d{2}\/$/.test(u.pathname)&&u.hash==='#'+id;}catch{return false;}}
export function normalizeOfficialPatches(raw){
 if(!raw||raw.schemaVersion!==1||!Array.isArray(raw.patches))throw new Error('공식 패치 JSON 형식이 변경되었습니다.');
 const revisions=new Set();
 for(const p of raw.patches){
  if(p.highlightsKo!==undefined&&(!Array.isArray(p.highlightsKo)||p.highlightsKo.length>3))throw new Error('패치 요약 목록 오류');
  const summaries=[p.summaryKo,...(p.highlightsKo??[]),...(p.changes??[]).map(c=>c.summaryKo)];
  if(summaries.some(s=>typeof s!=='string'||!/[가-힣]/.test(s)||/\?{2,}|\uFFFD/.test(s)))throw new Error('한국어 패치 요약 인코딩·검토 오류');
  if(!/^patch-\d{4}-\d{2}-\d{2}$/.test(p.patchId)||p.patchId!==`patch-${p.publishedDate}`||!date(p.publishedDate)||!date(p.localizedTitleDate)||!officialPatchUrl(p.sourceUrl,p.patchId)||!officialPatchUrl(p.sourceUrlEn,p.patchId)||!['balance','hotfix','bugfix','adjustment'].includes(p.type)||p.verificationStatus!=='verified'||p.effectiveAt!==null||p.statisticsWindowStatus!=='unverified'||typeof p.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(p.sourceHash)||typeof p.summaryKo!=='string'||!p.summaryKo||!Array.isArray(p.changes)||!date(p.reviewedAt)||typeof p.officialTitle!=='string')throw new Error('공식 패치 식별자·날짜·검증 상태 오류');
  if(!/^[a-f0-9]{64}$/.test(p.sourceHashEn??''))throw new Error('영문 출처 검증 해시 누락');
  const key=p.patchId+':'+p.sourceHash+':'+p.sourceHashEn;if(revisions.has(key))throw new Error('중복 공식 패치');revisions.add(key);
  const changes=new Set();for(const c of p.changes){
   if(c.patchId!==p.patchId||c.publishedDate!==p.publishedDate||c.sourceUrl!==p.sourceUrl||!['live-5v5','live-6v6','stadium'].includes(c.gameMode)||!PATCH_CHANGE_TYPES.includes(c.changeType)||c.verificationStatus!=='verified'||!/^[-a-z0-9]+$/.test(c.heroKey)||typeof c.abilityName!=='string'||!c.abilityName||typeof c.summaryKo!=='string'||!c.summaryKo||c.summaryKo.length>200||typeof c.id!=='string'||changes.has(c.id)||![c.before,c.after].every(v=>v===null||Number.isFinite(v))||!(c.unit===null||typeof c.unit==='string'))throw new Error('영웅 패치 변경 검증 실패');changes.add(c.id);
  }
 }
 return raw;
}
const newest=patches=>patches.filter(p=>p.verificationStatus==='verified').reverse().sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)||b.reviewedAt.localeCompare(a.reviewedAt));
export function selectCurrentPatchNote(archive){
 const p=newest(archive?.patches??[])[0];if(!p)return null;
 return {officialTitle:p.officialTitle,dateKo:p.localizedTitleDate,label:{hotfix:'라이브 핫픽스',balance:'라이브 밸런스 패치',bugfix:'버그 수정',adjustment:'공식 패치 조정'}[p.type],type:p.type,summary:p.summaryKo,changes:p.highlightsKo??p.changes.filter(c=>c.gameMode==='live-5v5').slice(0,3).map(c=>c.summaryKo),sourceUrl:p.sourceUrl,sourceId:p.patchId,reviewedAt:p.reviewedAt,statisticsWindowStatus:p.statisticsWindowStatus};
}
export function latestHeroPatch(archive,key,gameMode='live-5v5'){
 for(const patch of newest(archive?.patches??[])){const changes=patch.changes.filter(c=>c.heroKey===key&&c.gameMode===gameMode&&c.verificationStatus==='verified'&&c.timing!=='previous-update');if(changes.length)return {patch,changes,gameMode,changeType:aggregateChangeType(changes)};}
 return null;
}
export function aggregateChangeType(changes){const relevant=changes.filter(c=>c.changeType!=='bugfix'&&!['quality-of-life','cosmetic'].includes(c.category));const types=new Set((relevant.length?relevant:changes).map(c=>c.changeType));return types.size===1?[...types][0]:types.has('mixed')||types.has('buff')&&types.has('nerf')?'mixed':'adjustment';}
export function createOfficialPatchModel(){const state={status:'loading',data:null,error:''};return {state,set(data){state.data=normalizeOfficialPatches(data);state.status='ready';state.error='';},fail(error){state.status='error';state.error=error.message;},current(){return selectCurrentPatchNote(state.data)??(state.status==='error'?{dateKo:null,label:'공식 패치 자료 연결 실패',summary:'패치 정보를 불러오지 못했습니다.',changes:[],sourceUrl:'https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/'}:null);}};}
