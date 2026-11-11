import {t} from '../i18n/i18n.js';
import {node} from './dom.js';

// Only the mobile stylesheet collapses text. Desktop keeps the original content.
export function compactText(text, className, limit=45) {
  const wrapper=node('div',undefined,'compact-text');
  const paragraph=node('p',text,className);wrapper.append(paragraph);
  if(text.length>limit){
    const toggle=node('button',t("더보기"),'compact-text-toggle');toggle.type='button';toggle.setAttribute('aria-expanded','false');
    toggle.addEventListener('click',()=>{
      const expanded=toggle.getAttribute('aria-expanded')!=='true';
      toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?t("접기"):t("더보기");wrapper.classList.toggle('text-expanded',expanded);
    });wrapper.append(toggle);
  }
  return wrapper;
}
