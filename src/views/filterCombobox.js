import {t,label as translateLabel} from '../i18n/i18n.js';
// A select-only ARIA combobox. The hidden select remains the controller's value/change bridge.
export function createFilterCombobox(select,{options,icon}={}){
 const doc=select.ownerDocument,root=doc.createElement('div');root.className='filter-combobox';root.dataset.filter=select.dataset.statsFilter??select.id;
 const label=select.parentElement.firstChild.textContent.trim();
 const trigger=doc.createElement('button');trigger.type='button';trigger.className='filter-combobox-trigger';trigger.id=`${select.id}-trigger`;trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label',label);
 const popup=doc.createElement('div');popup.className='filter-combobox-popup';popup.id=`${select.id}-listbox`;popup.setAttribute('role','listbox');popup.setAttribute('aria-label',label);popup.hidden=true;trigger.setAttribute('aria-controls',popup.id);
 select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(root);root.append(trigger,popup);
 let choices=[],elements=[],active=-1,open=false,typeahead='',lastKey=0;
 function outside(event){if(!root.contains(event.target))close();}
 function close(){open=false;popup.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('focusin',outside,true);}
 function activate(index){if(!elements.length)return;active=(index+elements.length)%elements.length;elements.forEach((el,i)=>el.dataset.active=String(i===active));trigger.setAttribute('aria-activedescendant',elements[active].id);elements[active].scrollIntoView?.({block:'nearest'});}
 function show(){if(trigger.disabled||!elements.length)return;open=true;const box=trigger.getBoundingClientRect(),height=doc.defaultView.innerHeight,below=height-box.bottom-14,above=box.top-14;const up=below<220&&above>below;popup.dataset.placement=up?'above':'below';popup.style.maxHeight=`${Math.max(100,Math.min(380,height*.55,up?above:below))}px`;popup.hidden=false;trigger.setAttribute('aria-expanded','true');activate(Math.max(0,choices.findIndex(o=>o.value===select.value)));doc.addEventListener('pointerdown',outside,true);doc.addEventListener('focusin',outside,true);}
 function choose(index){if(!choices[index])return;select.value=choices[index].value;close();sync();select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));trigger.focus({preventScroll:true});}
 function contents(target,choice){target.replaceChildren();if(icon)target.append(icon(choice.value));const text=doc.createElement('span');text.className='filter-option-label';text.textContent=choice.label;target.append(text);}
 function sync(){const choice=choices.find(o=>o.value===select.value);contents(trigger,choice??{value:'all',label:t("선택")});trigger.setAttribute('aria-label',`${label}: ${choice?.label??t("선택")}`);const arrow=doc.createElement('span');arrow.className='filter-chevron';arrow.setAttribute('aria-hidden','true');trigger.append(arrow);trigger.disabled=select.disabled;trigger.title=select.title;elements.forEach((el,i)=>el.setAttribute('aria-selected',String(choices[i].value===select.value)));if(select.disabled)close();}
 function setOptions(next){close();choices=next.map(o=>({...o,label:translateLabel(o.label),group:translateLabel(o.group)}));elements=[];popup.replaceChildren();let group=null,container=popup;
  choices.forEach((choice,index)=>{if(choice.group!==group){group=choice.group;container=popup;if(group){container=doc.createElement('div');container.setAttribute('role','group');const heading=doc.createElement('div');heading.className='filter-option-group';heading.id=`${select.id}-group-${index}`;heading.textContent=group;container.setAttribute('aria-labelledby',heading.id);container.append(heading);popup.append(container);}}
   const option=doc.createElement('div');option.id=`${select.id}-option-${index}`;option.className='filter-option';option.dataset.value=choice.value;option.setAttribute('role','option');contents(option,choice);option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',event=>{event.preventDefault();choose(index);});option.addEventListener('pointermove',()=>{if(open)activate(index);});container.append(option);elements.push(option);
  });sync();
 }
 trigger.addEventListener('click',()=>open?close():show());
 trigger.addEventListener('keydown',event=>{
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(!open){show();if(event.key==='Home')activate(0);if(event.key==='End')activate(choices.length-1);}else activate(event.key==='Home'?0:event.key==='End'?choices.length-1:active+(event.key==='ArrowDown'?1:-1));}
  else if(['Enter',' '].includes(event.key)){event.preventDefault();if(open)choose(active);else show();}
  else if(event.key==='Escape'){event.preventDefault();close();}
  else if(event.key==='Tab')close();
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){const now=Date.now();typeahead=now-lastKey>700?event.key:typeahead+event.key;lastKey=now;const index=choices.findIndex(o=>o.label.startsWith(typeahead));if(index>=0){if(!open)show();activate(index);}}
 });
 select.addEventListener('change',()=>{close();sync();});setOptions(options);
 return {sync,setOptions,close};
}
