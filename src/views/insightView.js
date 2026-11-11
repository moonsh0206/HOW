import {routeHash} from '../i18n/routes.js';
import {errorText} from '../i18n/i18n.js';
import {formatLocale} from '../i18n/i18n.js';
import {t,label as translateLabel} from '../i18n/i18n.js';
import { hiddenGems, hotHeroes, classifyMeta } from '../domain/insights.js';
import { node, image } from './dom.js';
import { filterLabel } from '../models/statisticsModel.js';
import { renderPatchNote,setPatchNoteMobile,updatePatchNote } from './patchNoteView.js';

function recommendation(hero, hot = false, category = '', mobile = false) {
  const link = node('a', undefined, 'insight-hero'); link.href = `#/heroes/${hero.key}`;
  if (hero.portrait) link.append(image(hero.portrait));
  const text = node('span'); text.append(node('strong', hero.name));
  const field = { highWinRate: ['winRate', t("승률")], popularPicks: ['pickRate', t("픽률")], contestedPicks: ['banRate', t("밴률")] }[category];
  text.append(node('small', mobile && field ? `${field[1]} ${hero.statistics[field[0]] == null ? t("미제공") : hero.statistics[field[0]].toFixed(1) + '%'}` : mobile&&hot ? t("message.9ba1e0cc6bfd",{"0":(hero.pickDelta.toFixed(1))}) : mobile ? t("message.682ff86a9fbd",{"0":(hero.statistics.winRate == null ? t("미제공") : hero.statistics.winRate.toFixed(1)+'%')}) : hot ? t("message.7ee8f86cfda2",{"0":(hero.pickDelta.toFixed(1)),"1":(hero.winDelta >= 0 ? '+' : ''),"2":(hero.winDelta.toFixed(1))}) : category === 'contestedPicks' ? t("message.98519e3f6e6b",{"0":(hero.statistics.banRate.toFixed(1))}) : t("message.462260ef913b",{"0":(hero.statistics.winRate == null ? t("미제공") : hero.statistics.winRate.toFixed(1) + '%'),"1":(hero.statistics.pickRate == null ? t("미제공") : hero.statistics.pickRate.toFixed(1) + '%')})));
  link.append(text); return link;
}
export function createInsightView({patchModel}={}) {
  const root = document.querySelector('.meta-insights');
  if(!document.querySelector('#current-patch-note'))root.closest('.sidebar')?.prepend(renderPatchNote(patchModel?.current()));
  const patch=document.querySelector('#current-patch-note'),patchHome=document.createComment('Patch note desktop position');patch.before(patchHome);
  const home = document.createComment('Meta insights desktop position'); root.before(home);
  const media = window.matchMedia?.('(max-width: 767px)');
  let mobile = media?.matches ?? (window.innerWidth<=767), lastModel,switching=false;
  const mobileExpanded=new Map();
  function place() {
    const focused=document.activeElement,restore=root.contains(focused)||patch.contains(focused);
    const metaHost=document.querySelector('#meta-insights-host'),metaPatch=document.querySelector('#meta-patch-host');
    if(metaHost){if(mobile){if(root.parentElement!==metaHost)metaHost.append(root);if(routeHash(window.location,import.meta.env?.BASE_URL??'/')==='#/meta'&&metaPatch){if(patch.parentElement!==metaPatch)metaPatch.append(patch);}else document.querySelector('#heroes > .cohort-banner').after(patch);}else{patchHome.after(patch);home.after(root);}}
    else if (mobile) {document.querySelector('#heroes > .cohort-banner').after(root);root.after(patch);}
    else {patchHome.after(patch);home.after(root);}
    setPatchNoteMobile(patch,mobile);
    if(restore&&focused.isConnected)focused.focus({preventScroll:true});
  }
  function content(container, items, notes, empty, hot = false, category = '', compactEmpty=t("통계 미제공")) {
    const expanded = mobile && (switching?mobileExpanded.get(container):container.querySelector('.insight-details')?.open??mobileExpanded.get(container));
    const focused=container.contains(document.activeElement)?document.activeElement:null;
    const focusSummary=focused?.tagName==='SUMMARY',focusHref=focused?.closest('a')?.href;
    container.replaceChildren();
    const primary = items.length ? recommendation(items[0], hot, category, mobile) : node('p', mobile ? compactEmpty : empty, 'insight-empty');
    container.append(primary);
    const details = node('details', undefined, 'insight-details'); details.open = !mobile || Boolean(expanded);
    const summary=node('summary', t("상세"));summary.setAttribute('aria-label',t("message.e3ea9a7c6613",{"0":(container.closest('article').querySelector('h3').textContent)}));details.append(summary);
    for (const hero of items.slice(1)) details.append(recommendation(hero, hot, category, mobile));
    if (!items.length && mobile) details.append(node('p', empty));
    if(items.length&&mobile&&!category)details.append(node('small',hot?t("message.f3506c28e6c8",{"0":(items[0].winDelta>=0?'+':''),"1":(items[0].winDelta.toFixed(1))}):t("message.3c5db878f7eb",{"0":(items[0].statistics.pickRate?.toFixed(1)??t("미제공"))})));
    for (const note of notes) details.append(node('small', translateLabel(note)));
    container.append(details);
    if(focusSummary)summary.focus({preventScroll:true});else if(focusHref)[...container.querySelectorAll('a')].find(a=>a.href===focusHref)?.focus({preventScroll:true});
  }
  const view = {
    render(model) {
      updatePatchNote(patch,patchModel?.current());
      lastModel = model;
      const { state } = model; const heroes = model.enrichedHeroes();
      const hot = document.querySelector('#hot-content'), gems = document.querySelector('#gems-content');
      const current = state.statsStatus === 'loading' || state.statsStatus === 'error' ? null : state.statistics;
      const trend = hotHeroes(heroes, current, state.previousSnapshot);
      const hotNotes = [t("같은 조회 조건의 이전 통계와 비교합니다.")];
      if(trend.warning)hotNotes.push(trend.warning);
      if (trend.available) hotNotes.unshift(t("message.f654fd40da59",{"0":(new Date(trend.previousAt).toLocaleString(formatLocale())),"1":(new Date(trend.currentAt).toLocaleString(formatLocale()))}));
      const waiting=state.statsStatus==='loading'?t("통계 확인 중"):state.statsStatus==='error'?t("통계 연결 오류"):current?.stale?t("통계 갱신 필요"):t("통계 미제공");
      content(hot, trend.available ? trend.heroes : [], hotNotes, trend.available ? t("비교 가능한 통계는 있으나 선정 기준을 충족한 영웅이 없습니다.") : state.snapshotStatus === 'loading' ? t("이전 실제 통계 확인 중") : state.snapshotStatus === 'error' ? t("message.9681ebfba32c",{"0":(errorText(state.snapshotError))}) : translateLabel(trend.reason), true,'',!current?waiting:state.snapshotStatus==='loading'?t("기록 확인 중"):state.snapshotStatus==='error'?t("기록 연결 오류"):trend.available?t("해당 영웅 없음"):t("이전 기록 부족"));
      if(trend.available&&trend.warning&&!mobile)hot.prepend(node('small',t("집계창 미확인 · 관측 비교"),'insight-window-note'));
      const candidates = current && !current.stale ? hiddenGems(heroes) : [];
      content(gems, candidates, [t("현재 통계에서 주목할 만한 영웅입니다.")], current && !current.stale ? t("현재 조건에서 선정 기준을 충족한 영웅이 없습니다.") : t("최신 통계를 확보하면 후보를 제공합니다."),false,'',current&&!current.stale?t("후보 없음"):waiting);
      const categories = current && !current.stale ? classifyMeta(heroes) : {};
      for (const category of ['highWinRate', 'popularPicks', 'contestedPicks']) {
        const container = document.querySelector(`[data-category="${category}"]`);
        const items = [...(categories[category] ?? [])];
        // Presentation only: feature the highest actual metric among the existing role representatives.
        if (mobile) { const field = { highWinRate: 'winRate', popularPicks: 'pickRate', contestedPicks: 'banRate' }[category]; items.sort((a,b) => b.statistics[field] - a.statistics[field] || a.key.localeCompare(b.key)); }
        content(container, items, [t("역할별 대표 영웅 · 공식 순위가 아닙니다.")], t("현재 조건에서 제공할 수 있는 영웅이 없습니다."), false, category,current&&!current.stale?t("해당 통계 없음"):waiting);
      }
      document.querySelector('#insight-cohort').textContent = t("message.4f3bf89ed580",{"0":(filterLabel(state.statsFilters))});
    },
    destroy() { media?.removeEventListener?.('change', resize); media?.removeListener?.(resize);window.removeEventListener('hashchange',place);mobile=false;home.after(root);patchHome.after(patch);home.remove();patchHome.remove(); },
  };
  function resize() { if(media.matches===mobile)return;if(mobile)root.querySelectorAll('.insight-details').forEach(el=>mobileExpanded.set(el.parentElement,el.open));mobile=media.matches;switching=true;place();if(lastModel)view.render(lastModel);switching=false; }
  if (media?.addEventListener) media.addEventListener('change', resize); else media?.addListener?.(resize);
  window.addEventListener('hashchange',place);place(); return view;
}
