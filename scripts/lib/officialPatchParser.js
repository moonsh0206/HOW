import {JSDOM} from 'jsdom';
import {createHash} from 'node:crypto';
import {parsePatchFact} from './patchChangeRules.js';
export const digest=text=>createHash('sha256').update(text).digest('hex');
const clean=text=>text.replace(/\s+/g,' ').trim();
export function classifyPatchChange(text){
 if((text.match(/에서|\bfrom\b/gi)??[]).length>1)return {before:null,after:null,unit:null,changeType:'adjustment'};
 const pair=/([\d.]+)(초|%|발|도|미터)?에서\s*([\d.]+)(초|%|발|도|미터)?(?:으)?로/.exec(text)??/from\s+([\d.]+)(%|\sseconds?)?\s+to\s+([\d.]+)(%|\sseconds?)?/i.exec(text);
 if(!pair)return {before:null,after:null,unit:null,changeType:/버그|문제.*수정/.test(text)?'bugfix':'adjustment'};
 const before=Number(pair[1]),after=Number(pair[3]),rawUnit=pair[2]||pair[4]||null,unit=rawUnit?.includes('second')?'초':rawUnit;
 if(before===after||/받는 피해|자해|damage taken|self.damage/i.test(text))return {before,after,unit,changeType:'adjustment'};
 const benefit=/피해|공격력|치유|생명력|방어력|탄약|damage|healing|health|armor|ammo/i.test(text),cost=/재사용 대기시간|충전 시간|cooldown|charge time/i.test(text);
 const changeType=cost?(after<before?'buff':'nerf'):benefit?(after>before?'buff':'nerf'):'adjustment';
 return {before,after,unit,changeType};
}
export function extractOfficialPatches(html,{locale,sourceUrl,heroes}){
 const doc=new JSDOM(html).window.document,blocks=[...doc.querySelectorAll('.PatchNotes-patch.PatchNotes-live')];
 if(!blocks.length)throw new Error('공식 HTML 패치 구조를 찾지 못했습니다. 기존 자료를 보존합니다.');
 const names=new Map(heroes.map(h=>[locale==='ko-kr'?h.name:h.nameEn,h.key]).filter(([name])=>name));
 const patches=blocks.map(block=>{
  const patchId=block.querySelector(':scope > .anchor[id]')?.id,title=clean(block.querySelector('.PatchNotes-patchTitle')?.textContent??'');
  if(!/^patch-\d{4}-\d{2}-\d{2}$/.test(patchId??'')||!title)throw new Error('공식 패치 ID/제목 구조 변경');
  const publishedDate=patchId.slice(6),sourceHash=digest(clean(block.textContent)),permalink=new URL('#'+patchId,sourceUrl).href;
  const candidates=[],excluded=[];let mode='live-5v5';
  const add=(name,heroKey,abilityName,text,gameMode,category='balance')=>{
   const fact=parsePatchFact(text),id=digest([patchId,name,abilityName,text].join('|'));
   candidates.push({id,patchId,publishedDate,sourceUrl:permalink,gameMode,heroKey,abilityName,...classifyPatchChange(text),...fact,category,summaryKo:fact.summaryKo??(locale==='ko-kr'?'공식 기술 변경 · 원문 검토 필요':null),verificationStatus:'review-required',evidenceHash:digest(text),evidenceText:text,...(/이전 업데이트|in a previous update/i.test(text)?{timing:'previous-update'}:{})});
  };
  for(const section of block.querySelectorAll(':scope > .PatchNotes-section')){
   const heading=clean(section.querySelector('.PatchNotes-sectionTitle')?.textContent??'');
   if(/스타디움|Stadium/i.test(heading))mode='stadium';if(/버그 수정|Bug Fixes/i.test(heading))mode='bugfix';
   for(const hero of section.querySelectorAll('.PatchNotesHeroUpdate')){
    const name=clean(hero.querySelector('.PatchNotesHeroUpdate-name')?.textContent??''),heroKey=names.get(name)??null;
    for(const ability of hero.querySelectorAll('.PatchNotesAbilityUpdate,.PatchNotesHeroUpdate-generalUpdates')){
     const abilityName=clean(ability.querySelector('.PatchNotesAbilityUpdate-name')?.textContent??ability.querySelector('p')?.textContent??'기본 능력');
     const list=[...ability.querySelectorAll('li')];if(!list.length)throw new Error('영웅 변경 목록 구조 변경');
     for(const li of list){const text=clean(li.textContent),gameMode=/6대6|6v6/.test(text)?'live-6v6':mode==='bugfix'?'live-5v5':mode;
      let itemAbility=abilityName;
      if(ability.classList.contains('PatchNotesHeroUpdate-generalUpdates')){let previous=li.closest('ul')?.previousElementSibling;while(previous){if(previous.tagName==='P'&&clean(previous.textContent)){itemAbility=clean(previous.textContent);break;}previous=previous.previousElementSibling;}}
      const category=/특전|Perk/i.test(itemAbility)?'perk':/파워|Power/i.test(itemAbility)?'stadium-power':/지속 능력|Passive/i.test(itemAbility)?'passive':'balance';
      add(name,heroKey,itemAbility,text,gameMode,category);
     }
    }
   }
   if(mode==='bugfix')for(const group of section.querySelectorAll('.PatchNotesGeneralUpdate')){
    const groupName=clean(group.querySelector('.PatchNotesGeneralUpdate-title')?.textContent??''),description=group.querySelector('.PatchNotesGeneralUpdate-description');if(!description)continue;
    const mapScope=/전장|^Maps$/i.test(groupName),stadium=/스타디움|Stadium/i.test(groupName),cosmetic=/일반|General/i.test(groupName);let currentName=null;
    for(const child of description.children){if(child.tagName==='P'){const headingName=clean(child.textContent);currentName=names.has(headingName)?headingName:null;}
     for(const li of child.matches('li')?[child]:child.querySelectorAll('li')){const text=clean(li.textContent);
      const mentions=currentName?[currentName]:[...names.keys()].filter(name=>{const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(locale==='en-us'?`(?<![A-Za-z])${escaped}(?![A-Za-z])`:escaped).test(text);});
      if(mapScope||mentions.length!==1){excluded.push({scope:groupName,evidenceHash:digest(text),reason:mapScope?'map-not-hero':'non-hero-or-ambiguous'});continue;}
      const name=mentions[0];add(name,names.get(name),locale==='ko-kr'?'버그 수정':'Bug Fixes',text,stadium?'stadium':'live-5v5',cosmetic?'cosmetic':'bugfix');
     }
    }
   }
  }
  const titleDate=locale==='ko-kr'?/([0-9]{4})년\s*(\d+)월\s*(\d+)일/.exec(title):null;
  const headings=[...block.querySelectorAll('.PatchNotes-sectionTitle')].map(h=>clean(h.textContent));
  const type=headings.some(h=>/^(핫픽스 업데이트|Hotfix Update)$/.test(h))?'hotfix':block.querySelector('.PatchNotesHeroUpdate')?'balance':headings.some(h=>/^(버그 수정|Bug Fixes)$/.test(h))?'bugfix':'adjustment';
  return {patchId,publishedDate,localizedTitleDate:titleDate?`${titleDate[1]}-${titleDate[2].padStart(2,'0')}-${titleDate[3].padStart(2,'0')}`:publishedDate,officialTitle:title,sourceUrl:permalink,sourceHash,type,candidates,excluded};
 });
 if(new Set(patches.map(p=>p.patchId)).size!==patches.length)throw new Error('공식 패치 ID 중복');
 return {patches,rssAdvertised:!!doc.querySelector('link[type="application/rss+xml"],link[type="application/atom+xml"]')};
}
