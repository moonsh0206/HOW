import {node} from './dom.js';
import {t} from '../i18n/i18n.js';
import {playerQuery} from '../models/playerModel.js';
import {createDashboardEasterEgg} from './dashboardEasterEgg.js';
export function dashboardPlayerSearch(){
 const form=node('form',undefined,'dashboard-player-search');form.setAttribute('role','search');
 const label=node('label',undefined,'sr-only');label.htmlFor='dashboard-player-query';
 const input=node('input');input.id='dashboard-player-query';input.type='search';input.maxLength=80;input.autocomplete='off';
 const button=node('button',undefined,'primary-button');button.type='submit';form.append(label,input,button);const egg=createDashboardEasterEgg(form);
 input.addEventListener('input',()=>input.setCustomValidity(''));
 form.addEventListener('submit',event=>{event.preventDefault();if(!input.value.trim()){input.value='';input.focus();return;}try{playerQuery(input.value);}catch(error){input.setCustomValidity(error.message);input.reportValidity();return;}
  const win=form.ownerDocument.defaultView;form.ownerDocument.dispatchEvent(new win.CustomEvent('how:playersearch',{detail:{query:input.value.trim()}}));
 });
 return {form,setActive:egg.setActive,destroy:egg.destroy,translate(){label.textContent=t('player.label');input.placeholder=t('player.placeholder');button.textContent=t('player.search');input.setCustomValidity('');}};
}
