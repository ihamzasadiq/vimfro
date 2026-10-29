(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rec = new URLSearchParams(location.search).get('rec') === '1';
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  /* ---------- Nav sliding pill ---------- */
  const nav = $('.nav');
  const pill = $('.nav-pill');
  const links = $$('a', nav);
  const active = $('.is-active', nav);
  const moveTo = (a) => {
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
    links.forEach((l) => l.classList.toggle('is-on', l === a));
  };
  links.forEach((a) => {
    a.addEventListener('mouseenter', () => moveTo(a));
    a.addEventListener('focus', () => moveTo(a));
  });
  nav.addEventListener('mouseleave', () => moveTo(active));
  nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) moveTo(active); });
  const placePill = () => { pill.style.transition = 'none'; moveTo(active); pill.offsetWidth; pill.style.transition = ''; };
  placePill();
  addEventListener('resize', placePill);
  document.fonts && document.fonts.ready.then(placePill);

  /* ---------- Statement words ---------- */
  const manifesto = $('#manifesto');
  const words = [];
  for (const node of [...manifesto.childNodes]) {
    if (node.nodeType !== 3) continue;
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(part); return; }
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = part;
      words.push(s);
      frag.append(s);
    });
    node.replaceWith(frag);
  }
  // grey #6f6f6f → text #f4f4f4, with a 3-word soft edge
  const EDGE = 3;
  const fill = (p) => {
    const head = p * (words.length + EDGE);
    words.forEach((w, i) => {
      const t = clamp((head - i) / EDGE);
      const c = Math.round(111 + (244 - 111) * t);
      w.style.color = `rgb(${c} ${c} ${c})`;
    });
  };

  /* ---------- Counters ---------- */
  const countUp = (el, dur, delay = 0) => {
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    el.textContent = '0' + suffix;
    const start = performance.now() + delay;
    const tick = (now) => {
      const t = clamp((now - start) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3))) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const panel = $('#panel');
  const avatars = $$('.avatars li', panel);
  const trustCounters = $$('[data-count]', panel);

  if (reduced) { fill(1); return; }

  /* ---------- Load sequence ---------- */
  const opts = (duration, delay = 0) => ({ duration, delay, easing: ease, fill: 'backwards' });
  $$('.title .line > span').forEach((s, i) =>
    s.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], opts(1000, 150 + i * 110)));
  $('.photo img').animate([
    { transform: 'translateY(40px)', filter: 'blur(14px)', opacity: 0 },
    { transform: 'none', filter: 'blur(0)', opacity: 1 },
  ], opts(1300, 50));
  nav.animate([{ transform: 'translateY(-24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], opts(900, 100));
  $$('.rise').forEach((el, i) =>
    el.animate([{ translate: '0 14px', opacity: 0 }, { translate: '0 0', opacity: 1 }], opts(900, 350 + i * 55)));
  $('.progress i').animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], opts(1400, 1000));
  $$('.stats [data-count]').forEach((el) => countUp(el, 1400, 700));

  /* ---------- Trust panel reveal ---------- */
  avatars.forEach((a) => { a.style.opacity = 0; });
  trustCounters.forEach((el) => { el.textContent = '0' + el.dataset.suffix; });
  let revealed = false;
  const reveal = (span = 1400) => {
    if (revealed) return;
    revealed = true;
    trustCounters.forEach((el) => countUp(el, span));
    const step = (span - 600) / avatars.length;
    avatars.forEach((a, i) => {
      a.style.opacity = '';
      a.animate([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 600, delay: i * step, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' });
    });
  };

  const photo = $('.photo');

  if (rec) {
    // Whole page in one frame: scroll-driven parts run on a timeline instead.
    const t0 = performance.now();
    let awardsLifted = false;
    const frame = (now) => {
      const t = (now - t0) / 1000;
      fill(clamp((t - 1.3) / 2.9));
      photo.style.transform = `translateY(${(t * 6).toFixed(2)}px)`;
      if (t >= 3.5) reveal(1700);
      if (t >= 5.3 && !awardsLifted) {
        awardsLifted = true;
        $('.card-awards').classList.add('lift');
      }
      if (t < 12) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return;
  }

  /* ---------- Scroll ---------- */
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight;
    photo.style.transform = `translateY(${(scrollY * 0.12).toFixed(1)}px)`;
    const r = manifesto.getBoundingClientRect();
    // starts as the text enters the lower viewport, done when its last line passes mid-screen
    fill(clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35)));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  new IntersectionObserver((entries, io) => {
    if (entries.some((e) => e.isIntersecting)) { reveal(); io.disconnect(); }
  }, { threshold: 0.35 }).observe(panel);
})();
