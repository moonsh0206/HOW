import {t} from '../i18n/i18n.js';
const names={tank:()=>t('돌격'),damage:()=>t('공격'),support:()=>t('지원')};
export const roleName=role=>names[role]();
// These exact Blizzard paths were already present in the project's API evidence.
export function roleIcon(role){
 if(!Object.hasOwn(names,role))throw Error('Unknown hero role');
 const mark=document.createElement('span');mark.className=`role-symbol role-symbol-${role}`;mark.setAttribute('aria-hidden','true');
 return mark;
}
export function roleBadge(role,{showLabel=false}={}){
 const badge=document.createElement('span');badge.className=`role-tag role-icon-badge ${role}${showLabel?' role-with-label':''}`;
 badge.title=roleName(role);badge.setAttribute('role','img');badge.setAttribute('aria-label',roleName(role));badge.append(roleIcon(role));
 if(showLabel){const text=document.createElement('span');text.className='role-label';text.textContent=roleName(role);badge.append(text);}
 return badge;
}
