import { hiddenGems, hotHeroes, classifyMeta } from '../domain/insights.js';
import { node, image } from './dom.js';
import { filterLabel } from '../models/statisticsModel.js';
import { renderPatchNote,setPatchNoteMobile,updatePatchNote } from './patchNoteView.js';

function recommendation(hero, hot = false, category = '', mobile = false) {
  const link = node('a', undefined, 'insight-hero'); link.href = `#/heroes/${hero.key}`;
  if (hero.portrait) link.append(image(hero.portrait));
  const text = node('span'); text.append(node('strong', hero.name));
  const field = { highWinRate: ['winRate', '승률'], popularPicks: ['pickRate', '픽률'], contestedPicks: ['banRate', '밴률'] }[category];
  text.append(node('small', mobile && field ? `${field[1]} ${hero.statistics[field[0]] == null ? '미제공' : hero.statistics[field[0]].toFixed(1) + '%'}` : mobile&&hot ? `픽률 +${hero.pickDelta.toFixed(1)}%p` : mobile ? `승률 ${hero.statistics.winRate == null ? '미제공' : hero.statistics.winRate.toFixed(1)+'%'}` : hot ? `픽률 +${hero.pickDelta.toFixed(1)}%p · 승률 ${hero.winDelta >= 0 ? '+' : ''}${hero.winDelta.toFixed(1)}%p` : category === 'contestedPicks' ? `밴률 ${hero.statistics.banRate.toFixed(1)}% · 역할 내 밴률 1위` : `승률 ${hero.statistics.winRate == null ? '미제공' : hero.statistics.winRate.toFixed(1) + '%'} · 픽률 ${hero.statistics.pickRate == null ? '미제공' : hero.statistics.pickRate.toFixed(1) + '%'}`));
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
    if(metaHost){if(mobile){if(root.parentElement!==metaHost)metaHost.append(root);if(window.location.hash==='#/meta'&&metaPatch){if(patch.parentElement!==metaPatch)metaPatch.append(patch);}else document.querySelector('#heroes > .cohort-banner').after(patch);}else{patchHome.after(patch);home.after(root);}}
    else if (mobile) {document.querySelector('#heroes > .cohort-banner').after(root);root.after(patch);}
    else {patchHome.after(patch);home.after(root);}
    setPatchNoteMobile(patch,mobile);
    if(restore&&focused.isConnected)focused.focus({preventScroll:true});
  }
  function content(container, items, notes, empty, hot = false, category = '', compactEmpty='통계 미제공') {
    const expanded = mobile && (switching?mobileExpanded.get(container):container.querySelector('.insight-details')?.open??mobileExpanded.get(container));
    const focused=container.contains(document.activeElement)?document.activeElement:null;
    const focusSummary=focused?.tagName==='SUMMARY',focusHref=focused?.closest('a')?.href;
    container.replaceChildren();
    const primary = items.length ? recommendation(items[0], hot, category, mobile) : node('p', mobile ? compactEmpty : empty, 'insight-empty');
    container.append(primary);
    const details = node('details', undefined, 'insight-details'); details.open = !mobile || Boolean(expanded);
    const summary=node('summary', '상세');summary.setAttribute('aria-label',`${container.closest('article').querySelector('h3').textContent} 상세`);details.append(summary);
    for (const hero of items.slice(1)) details.append(recommendation(hero, hot, category, mobile));
    if (!items.length && mobile) details.append(node('p', empty));
    if(items.length&&mobile&&!category)details.append(node('small',hot?`대표 영웅 승률 변화 ${items[0].winDelta>=0?'+':''}${items[0].winDelta.toFixed(1)}%p`:`대표 영웅 픽률 ${items[0].statistics.pickRate?.toFixed(1)??'미제공'}%`));
    for (const note of notes) details.append(node('small', note));
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
      const hotNotes = ['같은 조회 조건의 이전 통계와 비교합니다.'];
      if(trend.warning)hotNotes.push(trend.warning);
      if (trend.available) hotNotes.unshift(`HOW 수집/조회 ${new Date(trend.previousAt).toLocaleString('ko-KR')} → ${new Date(trend.currentAt).toLocaleString('ko-KR')}`);
      const waiting=state.statsStatus==='loading'?'통계 확인 중':state.statsStatus==='error'?'통계 연결 오류':current?.stale?'통계 갱신 필요':'통계 미제공';
      content(hot, trend.available ? trend.heroes : [], hotNotes, trend.available ? '비교 가능한 통계는 있으나 선정 기준을 충족한 영웅이 없습니다.' : state.snapshotStatus === 'loading' ? '이전 실제 통계 확인 중' : state.snapshotStatus === 'error' ? `추세 미제공 · ${state.snapshotError}` : trend.reason, true,'',!current?waiting:state.snapshotStatus==='loading'?'기록 확인 중':state.snapshotStatus==='error'?'기록 연결 오류':trend.available?'해당 영웅 없음':'이전 기록 부족');
      if(trend.available&&trend.warning&&!mobile)hot.prepend(node('small','집계창 미확인 · 관측 비교','insight-window-note'));
      const candidates = current && !current.stale ? hiddenGems(heroes) : [];
      content(gems, candidates, ['현재 통계에서 주목할 만한 영웅입니다.'], current && !current.stale ? '현재 조건에서 선정 기준을 충족한 영웅이 없습니다.' : '최신 통계를 확보하면 후보를 제공합니다.',false,'',current&&!current.stale?'후보 없음':waiting);
      const categories = current && !current.stale ? classifyMeta(heroes) : {};
      for (const category of ['highWinRate', 'popularPicks', 'contestedPicks']) {
        const container = document.querySelector(`[data-category="${category}"]`);
        const items = [...(categories[category] ?? [])];
        // Presentation only: feature the highest actual metric among the existing role representatives.
        if (mobile) { const field = { highWinRate: 'winRate', popularPicks: 'pickRate', contestedPicks: 'banRate' }[category]; items.sort((a,b) => b.statistics[field] - a.statistics[field] || a.key.localeCompare(b.key)); }
        content(container, items, ['역할별 대표 영웅 · 공식 순위가 아닙니다.'], '현재 조건에서 제공할 수 있는 영웅이 없습니다.', false, category,current&&!current.stale?'해당 통계 없음':waiting);
      }
      document.querySelector('#insight-cohort').textContent = `${filterLabel(state.statsFilters)} · 전체 역할 기준 · HOW 정책 추천`;
    },
    destroy() { media?.removeEventListener?.('change', resize); media?.removeListener?.(resize);window.removeEventListener('hashchange',place);mobile=false;home.after(root);patchHome.after(patch);home.remove();patchHome.remove(); },
  };
  function resize() { if(media.matches===mobile)return;if(mobile)root.querySelectorAll('.insight-details').forEach(el=>mobileExpanded.set(el.parentElement,el.open));mobile=media.matches;switching=true;place();if(lastModel)view.render(lastModel);switching=false; }
  if (media?.addEventListener) media.addEventListener('change', resize); else media?.addListener?.(resize);
  window.addEventListener('hashchange',place);place(); return view;
}
