// Resting content stays visible if Web Animations is unavailable.
export function createBannerEntrance(banner, win = window) {
  let visible = false, frame = null, animations = [];
  const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  function cancel() {
    if (frame !== null) win.cancelAnimationFrame?.(frame);
    frame = null;
    for (const animation of animations) animation.cancel();
    animations = [];
  }
  function prepare() {
    const title = banner?.querySelector('h1');
    if (title && !title.querySelector('.banner-title-first')) {
      const text = [...title.childNodes].find(node => node.nodeType === 3 && node.textContent.trim());
      if (text) { const span = title.ownerDocument.createElement('span'); span.className = 'banner-title-first'; text.replaceWith(span); span.append(text); }
    }
    return banner ? [banner.querySelector('.eyebrow'), title?.querySelector('.banner-title-first'), title?.querySelector('em'), ...banner.querySelectorAll('.banner-copy'), banner.querySelector('.primary-button')].filter(Boolean) : [];
  }
  const motionChange = () => { if (reduced?.matches) cancel(); };
  reduced?.addEventListener?.('change', motionChange);
  return {
    setVisible(next) {
      if (next === visible) return;
      visible = next; cancel();
      if (!next || !banner || reduced?.matches || !win.requestAnimationFrame || !banner.querySelector('.eyebrow')?.animate) return;
      frame = win.requestAnimationFrame(() => {
        frame = null;
        if (!visible || !banner.isConnected || banner.closest('[hidden]') || reduced?.matches) return;
        const distance = win.innerWidth <= 767 ? 10 : 14;
        let index = 0;
        for (const element of prepare()) {
          if (!element.getClientRects().length || !element.animate) continue;
          try {
            animations.push(element.animate([{opacity:0,transform:`translateY(${distance}px)`},{opacity:1,transform:'translateY(0)'}], {duration:460,delay:index++ * 80,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'backwards'}));
          } catch { /* Visual enhancement failure must never hide content. */ }
        }
      });
    },
    destroy() { visible = false; cancel(); reduced?.removeEventListener?.('change', motionChange); },
  };
}
