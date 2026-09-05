(() => {
  'use strict';
  // Keep the return link with the comparison newsletter that opened the viewer.
  // Only this known public route is accepted; never use an arbitrary return URL.
  if (new URLSearchParams(location.search).get('from') === 'email09-v2') {
    document.querySelector('.back-link').href = '../../emails/email09-v2.html';
  }
  const viewer = document.querySelector('#presentation');
  const stage = document.querySelector('#slide-stage');
  const img = document.querySelector('#slide');
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const select = document.querySelector('#slide-number');
  const expand = document.querySelector('#expand');
  const error = document.querySelector('#error');
  const title = document.querySelector('#slide-title');
  let slides = [], current = 0, expanded = false, touchStart = null;
  const warmed = new Set();
  const parseSlide = () => {
    const match = /^#slide-(\d+)$/.exec(location.hash);
    return match ? Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)) : 0;
  };
  function srcset(slide) { return `${slide.small} 800w, ${slide.src} 1600w`; }
  function warmNext() {
    const s = slides[current + 1];
    if (!s || warmed.has(s.src) || navigator.connection?.saveData) return;
    warmed.add(s.src);
    const preview = new Image();
    preview.sizes = img.sizes;
    preview.srcset = srcset(s);
    preview.src = s.src;
  }
  function show(index, updateHash = true) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    const s = slides[current];
    error.hidden = true;
    title.textContent = s.title;
    img.alt = `Slide ${current + 1} of ${slides.length}: ${s.title}. Open this slide to zoom, or download the PDF for the full-size presentation.`;
    img.srcset = srcset(s);
    img.src = s.src;
    select.value = String(current);
    previous.setAttribute('aria-disabled', String(current === 0));
    next.setAttribute('aria-disabled', String(current === slides.length - 1));
    document.querySelector('#image-link').href = s.src;
    document.querySelector('#announcement').textContent = `Slide ${current + 1} of ${slides.length}: ${s.title}`;
    if (updateHash) history.replaceState(null, '', `#slide-${current + 1}`);
    if (img.complete && img.naturalWidth) warmNext();
  }
  function expandedUI(value) {
    expanded = value;
    viewer.classList.toggle('expanded', value);
    document.body.classList.toggle('viewer-open', value);
    expand.textContent = value ? 'Exit full screen ×' : 'Full screen ⛶';
    expand.setAttribute('aria-pressed', String(value));
    img.sizes = value ? '100vw' : '(max-width: 700px) calc(100vw - 24px), (max-width: 1160px) calc(100vw - 64px), 1096px';
    // Prevent keyboard focus escaping the fallback full-screen viewer.
    document.querySelector('.site-banner').inert = value;
    document.querySelector('.intro').inert = value;
    document.querySelector('.below-viewer').inert = value;
    document.querySelector('.next-step').inert = value;
    document.querySelector('footer').inert = value;
    if (!value) expand.focus();
  }
  async function toggleExpand() {
    if (expanded) {
      if (document.fullscreenElement) await document.exitFullscreen();
      expandedUI(false);
    } else {
      expandedUI(true);
      // iPhone browsers without element fullscreen retain the CSS full-window view.
      if (viewer.requestFullscreen) {
        try { await viewer.requestFullscreen(); } catch { /* Accessible CSS fallback stays active. */ }
      }
      expand.focus();
    }
  }
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  select.addEventListener('change', () => show(Number(select.value)));
  expand.addEventListener('click', toggleExpand);
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && expanded) expandedUI(false);
  });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) { event.preventDefault(); toggleExpand(); return; }
    if (event.key === 'Tab' && expanded) {
      const focusables = [...viewer.querySelectorAll('button:not([hidden]), select, [tabindex="0"]')];
      const first = focusables[0], last = focusables.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (!slides.length || event.target.tagName === 'SELECT' || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    if (event.key === 'Home') { event.preventDefault(); show(0); }
    if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
  });
  stage.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? { x:event.touches[0].clientX, y:event.touches[0].clientY } : null;
  }, { passive:true });
  stage.addEventListener('touchend', event => {
    if (!touchStart || !slides.length || event.touches.length || (window.visualViewport?.scale || 1) > 1) return;
    const dx = event.changedTouches[0].clientX - touchStart.x, dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 2) show(current + (dx < 0 ? 1 : -1));
  }, { passive:true });
  stage.addEventListener('touchcancel', () => { touchStart = null; }, { passive:true });
  img.addEventListener('load', () => { if (slides.length) warmNext(); });
  img.addEventListener('error', () => {
    error.textContent = 'This slide could not load. Please try another slide, reload the page, or download the PDF below.';
    error.hidden = false;
  });
  window.addEventListener('hashchange', () => { if (slides.length) show(parseSlide(), false); });
  fetch('slides.json').then(response => {
    if (!response.ok) throw new Error('Slide list unavailable');
    return response.json();
  }).then(data => {
    if (!Array.isArray(data.slides) || !data.slides.length) throw new Error('No slides');
    slides = data.slides;
    slides.forEach((s, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = String(index + 1);
      option.setAttribute('aria-label', `${index + 1}: ${s.title}`);
      select.append(option);
    });
    document.querySelector('#total').textContent = `of ${slides.length}`;
    document.querySelector('#pdf-size').textContent = `(${(data.pdfBytes / 1000000).toFixed(1)} MB)`;
    document.querySelector('#controls').hidden = false;
    expand.hidden = false;
    show(parseSlide(), false);
  }).catch(() => {
    error.textContent = 'The slide viewer could not load. You can still download the complete PDF below.';
    error.hidden = false;
  });
})();
