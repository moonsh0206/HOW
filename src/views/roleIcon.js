import {roleName,roleTranslationKey} from '../i18n/roles.js';
export {roleName};
export function roleText(role,tag='span'){const text=document.createElement(tag);text.dataset.i18n=roleTranslationKey(role);text.textContent=roleName(role);return text;}
// These exact Blizzard paths were already present in the project's API evidence.
export function roleIcon(role){
 roleTranslationKey(role);
 const mark=document.createElement('span');mark.className=`role-symbol role-symbol-${role}`;mark.setAttribute('aria-hidden','true');
 return mark;
}
export function roleBadge(role,{showLabel=false}={}){
 const badge=document.createElement('span');badge.className=`role-tag role-icon-badge ${role}${showLabel?' role-with-label':''}`;
 badge.dataset.i18n=roleTranslationKey(role);
 badge.title=roleName(role);badge.setAttribute('role','img');badge.setAttribute('aria-label',roleName(role));badge.append(roleIcon(role));
 if(showLabel){const text=roleText(role);text.className='role-label';badge.append(text);}
 return badge;
}
