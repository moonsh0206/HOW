import {t,label as translateLabel,getLanguage,officialLink} from '../i18n/i18n.js';
import {node} from './dom.js';
import {latestHeroPatch} from '../models/officialPatchModel.js';
import {addPatchDisclosure} from './patchDisclosure.js';
const labels={get buff(){return t('버프');},get nerf(){return t('너프');},get mixed(){return t('복합 조정');},get adjustment(){return t('조정');},get bugfix(){return t('버그 수정');}};
const modeLabels={get 'live-5v5'(){return t('일반 라이브 5v5');},get 'live-6v6'(){return t('6v6 전용');},get stadium(){return t('스타디움 전용');}};
function item(c){const element=node('div',undefined,'hero-patch-change');element.dataset.changeId=c.id;element.dataset.changeType=c.changeType;element.append(node('h3',translateLabel(c.abilityName)));const unit=translateLabel(c.unit??'');if(Number.isFinite(c.before)&&Number.isFinite(c.after)){const value=node('strong',undefined,'patch-values');value.append(node('span',`${c.before}${unit}`,'patch-before'),node('span',' → ','patch-value-arrow'),node('span',`${c.after}${unit}`,'patch-after'));element.append(value);}else if(Number.isFinite(c.after))element.append(node('strong',t("message.057653df4c99",{"0":c.after,"1":unit}),'patch-after'));element.append(node('p',translateLabel(c.summaryKo),'patch-summary'));return element;}
const priority=c=>['quality-of-life','cosmetic'].includes(c.category)?3:c.changeType==='bugfix'?2:Number.isFinite(c.before)&&Number.isFinite(c.after)?0:1;
const ordered=changes=>[...changes].sort((a,b)=>priority(a)-priority(b));
function contents(result){const fragment=document.createDocumentFragment();
 const changes=ordered(result.changes);for(const c of changes.slice(0,3))fragment.append(item(c));
 if(changes.length>3){const more=node('details',undefined,'hero-patch-more');more.dataset.patchDetail=`${result.gameMode}:${result.patch.patchId}:more`;more.append(node('summary',t("message.b67d2f151f5a",{"0":(changes.length-3)})));for(const c of changes.slice(3))more.append(item(c));fragment.append(more);}return fragment;
}
export function renderHeroPatch(archive,key){
 const results=['live-5v5','live-6v6','stadium'].map(mode=>latestHeroPatch(archive,key,mode)).filter(Boolean),result=results.shift();if(!result)return null;
 const {patch,changeType}=result,section=node('section',undefined,'hero-patch-panel');section.setAttribute('aria-label',t("최근 패치 변경사항"));
 section.dataset.heroKey=key;
 const changes=ordered(result.changes),representative=item(changes[0]);representative.classList.add('hero-patch-primary');section.dataset.representativeId=changes[0].id;section.dataset.representativePolicy='existing-display-priority';
 const header=node('div',undefined,'hero-patch-heading');header.append(node('h2',t("최근 패치 변경사항")),node('span',translateLabel(labels[changeType]),`patch-change-tag patch-${changeType}`));section.append(header,node('small',t("message.8de92593187b",{"0":(patch.publishedDate.replaceAll('-','.')),"1":(translateLabel(modeLabels[result.gameMode]))})),representative);for(const c of changes.slice(1))section.append(item(c));
 for(const other of results){const group=node('details',undefined,'hero-patch-mode');group.dataset.patchDetail=`${other.gameMode}:${other.patch.patchId}`;group.append(node('summary',t("message.63a12fe0a4f8",{"0":(translateLabel(modeLabels[other.gameMode])),"1":(other.changes.length)})),node('small',other.patch.publishedDate.replaceAll('-','.')),contents(other));const source=node('a',t("이 모드 공식 패치노트 ↗"));source.href=officialLink(getLanguage()==='en'?other.patch.sourceUrlEn:other.patch.sourceUrl);source.target='_blank';source.rel='noopener noreferrer';group.append(source);section.append(group);}
 const link=node('a',t("공식 패치노트 ↗"));link.href=officialLink(getLanguage()==='en'?patch.sourceUrlEn:patch.sourceUrl);link.target='_blank';link.rel='noopener noreferrer';
 const date=section.querySelector(':scope>small'),meta=node('div',undefined,'hero-patch-meta');date.replaceWith(meta);meta.append(date,link);
 const all=[result,...results],total=all.reduce((sum,row)=>sum+row.changes.length,0),other=total-result.changes.length;
 section.dataset.changeCount=String(total);section.dataset.primaryCount=String(result.changes.length);
 const count=node('p',t('patch.primaryCount',{mode:translateLabel(modeLabels[result.gameMode]),count:result.changes.length})+(other?t('patch.otherCount',{count:other}):''),'hero-patch-count');meta.after(count);
 const body=node('div',undefined,'hero-patch-body');for(const child of [...section.children])if(child!==representative&&(child.classList.contains('hero-patch-change')||child.matches('details')))body.append(child);section.append(body);
 addPatchDisclosure(section,body,{heroKey:key,eligible:total>1,mobileOnly:false,placement:'body',collapsedLabel:t('patch.additionalChanges',{count:total-1})});return section;
}
