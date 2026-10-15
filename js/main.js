/* =========================================================
   VIKA — portfolio · main.js
   Vanilla JS, без сборки. Работает и при открытии файла напрямую.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } }
  };

  const mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });

  /* =========================================================
     i18n
     ========================================================= */
  const I18N = window.I18N || { en: {}, STRINGS: { ru: {}, en: {} } };
  const RU = {};
  $$('[data-i18n]').forEach((el) => { RU[el.dataset.i18n] = el.innerHTML; });
  $$('[data-i18n-ph]').forEach((el) => { RU[el.dataset.i18nPh] = el.getAttribute('placeholder'); });
  let lang = store.get('vika:lang') === 'en' ? 'en' : 'ru';
  const S = () => I18N.STRINGS[lang] || I18N.STRINGS.ru;
  const langListeners = [];

  function applyLang(next, animate) {
    lang = next;
    document.documentElement.lang = lang;
    store.set('vika:lang', lang);
    const dict = lang === 'en' ? I18N.en : RU;
    $$('[data-i18n]').forEach((el) => {
      const val = dict[el.dataset.i18n] ?? RU[el.dataset.i18n];
      if (val == null) return;
      el.innerHTML = val;
      if (el.hasAttribute('data-split')) { splitEl(el); if (animate) el.classList.add('is-in'); }
      if (el.hasAttribute('data-scrub')) prepScrub(el);
    });
    $$('[data-i18n-ph]').forEach((el) => {
      const val = dict[el.dataset.i18nPh] ?? RU[el.dataset.i18nPh];
      if (val != null) el.setAttribute('placeholder', val);
    });
    $$('.lang button').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === lang));
    langListeners.forEach((fn) => fn());
  }
  $$('.lang button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    applyLang(b.dataset.lang, true);
    scrubUpdate();
  }));

  /* =========================================================
     split text
     ========================================================= */
  function splitEl(el) {
    const mode = el.dataset.split;
    const d = parseFloat(el.dataset.delay || 0);
    el.style.setProperty('--d', d + 's');
    // сохраняем <br/>
    const html = el.innerHTML.replace(/<br\s*\/?>/gi, ' \n ');
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.textContent.replace(/\s+\n\s+/g, '\n').trim();
    el.setAttribute('aria-label', text.replace(/\n/g, ' '));
    let i = 0;
    const out = text.split('\n').map((line) => line.split(/\s+/).map((word) => {
      if (mode === 'words') return `<span class="w" aria-hidden="true"><span class="wi" style="--i:${i++}">${esc(word)}</span></span>`;
      const chars = Array.from(word).map((c) => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join('');
      return `<span class="chw" aria-hidden="true">${chars}</span>`;
    }).join(' ')).join('<br/>');
    el.innerHTML = out;
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  $$('[data-split]').forEach(splitEl);

  /* =========================================================
     scroll reveal
     ========================================================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  function observeReveals() {
    $$('[data-reveal], .section [data-split], .case [data-split], .contact').forEach((el) => io.observe(el));
  }

  /* =========================================================
     scrub (about manifest — слова загораются при скролле)
     ========================================================= */
  const scrubEls = [];
  function prepScrub(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => {
      const hl = /^(backend|Вика\.?|Vika\.?|интерфейсы|interfaces)/i.test(w) ? ' hl2' : '';
      return `<span class="sw${hl}">${esc(w)}</span>`;
    }).join(' ');
    if (!scrubEls.includes(el)) scrubEls.push(el);
  }
  $$('[data-scrub]').forEach(prepScrub);
  function scrubUpdate() {
    scrubEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const vh = innerHeight;
      const p = REDUCED ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.25), 0, 1);
      const words = el.children;
      const n = Math.round(p * words.length);
      for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
    });
  }

  /* =========================================================
     smooth scroll (Lenis, если загрузился)
     ========================================================= */
  let lenis = null;
  function initLenis() {
    if (REDUCED || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  function scrollToEl(target, immediate) {
    const y = target === 'top' ? 0 : target.getBoundingClientRect().top + scrollY;
    if (lenis) lenis.scrollTo(y, { immediate: !!immediate, duration: 1.4 });
    else window.scrollTo({ top: y, behavior: immediate || REDUCED ? 'auto' : 'smooth' });
  }

  /* =========================================================
     navigation + section transitions (wipe)
     ========================================================= */
  const wipe = $('.wipe');
  const wipeLabel = $('.wipe__label');
  let wiping = false;
  function goTo(hash) {
    const el = hash === '#top' ? $('#top') : $(hash);
    if (!el) return;
    closeMenu();
    const dist = Math.abs(el.getBoundingClientRect().top);
    if (REDUCED || dist < innerHeight * 1.5 || wiping) { scrollToEl(hash === '#top' ? 'top' : el); return; }
    wiping = true;
    wipeLabel.textContent = (el.dataset.label || '').split('/').pop().trim() || 'vika';
    wipe.classList.remove('is-out');
    wipe.classList.add('is-in');
    setTimeout(() => {
      scrollToEl(hash === '#top' ? 'top' : el, true);
      setTimeout(() => {
        wipe.classList.remove('is-in');
        wipe.classList.add('is-out');
        setTimeout(() => { wipe.classList.remove('is-out'); wiping = false; }, 600);
      }, 180);
    }, 520);
  }
  $$('[data-nav]').forEach((a) => a.addEventListener('click', (e) => {
    const h = a.getAttribute('href');
    if (!h || !h.startsWith('#')) return;
    e.preventDefault();
    goTo(h);
  }));

  // mobile menu
  const burger = $('#burger');
  const mnav = $('#mnav');
  function closeMenu() { mnav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => {
    const open = !mnav.classList.contains('is-open');
    mnav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  /* =========================================================
     scroll-driven UI (progress, hud, rail, active section)
     ========================================================= */
  const hud = $('.hud');
  const progress = $('.progress');
  const rail = $('.rail');
  const railLabel = $('#railLabel');
  const sections = $$('[data-label]');
  const navLinks = $$('.hud__nav a');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? y / max : 0;
    progress.style.setProperty('--p', p.toFixed(4));
    rail.style.setProperty('--p', p.toFixed(4));
    hud.classList.toggle('is-scrolled', y > 40);
    hud.classList.toggle('is-hidden', y > lastY && y > 400 && !mnav.classList.contains('is-open'));
    lastY = y;

    let current = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.45) current = s;
    if (railLabel.textContent !== current.dataset.label) railLabel.textContent = current.dataset.label;
    navLinks.forEach((a) => a.classList.toggle('is-active', current.id && a.getAttribute('href') === '#' + current.id));

    scrubUpdate();
    vargUpdate();
    parallaxUpdate();
  }
  let scrollQueued = false;
  const queueScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; onScroll(); });
  };
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll);

  /* =========================================================
     clock + hero coordinates
     ========================================================= */
  const clock = $('#clock');
  setInterval(() => { clock.textContent = new Date().toLocaleTimeString('ru-RU', { hour12: false }); }, 1000);
  $('#year').textContent = new Date().getFullYear();
  const cx = $('#cx'), cy = $('#cy');
  const glowEl = $('.bg-glow');
  let ptrQueued = false, gX = innerWidth / 2, gY = innerHeight * 0.2;
  addEventListener('pointermove', () => {
    if (ptrQueued) return;
    ptrQueued = true;
    requestAnimationFrame(() => {
      ptrQueued = false;
      if (scrollY < innerHeight) {
        cx.textContent = String(Math.round(mouse.x)).padStart(4, '0');
        cy.textContent = String(Math.round(mouse.y)).padStart(4, '0');
      }
    });
  }, { passive: true });
  if (!REDUCED) (function glowTick() {
    gX = lerp(gX, mouse.x, 0.04); gY = lerp(gY, mouse.y, 0.04);
    glowEl.style.transform = `translate3d(${gX.toFixed(1)}px, ${gY.toFixed(1)}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(glowTick);
  })();

  /* =========================================================
     custom cursor
     ========================================================= */
  function initCursor() {
    return; // обычный системный курсор (кастомный отключён)
    if (!FINE || REDUCED) return;
    document.body.classList.add('has-cursor');
    const cur = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    let rx = mouse.x, ry = mouse.y;
    (function tick() {
      rx = lerp(rx, mouse.x, 0.18); ry = lerp(ry, mouse.y, 0.18);
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(tick);
    })();
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, [role="button"], input, .node, .pin');
      cur.classList.remove('is-hover', 'is-label', 'is-text');
      if (!t) return;
      if (t.matches('input')) { cur.classList.add('is-text'); return; }
      const l = t.dataset.cursor;
      if (l) { label.textContent = l; cur.classList.add('is-label'); } else cur.classList.add('is-hover');
    });
    addEventListener('pointerdown', () => cur.classList.add('is-down'));
    addEventListener('pointerup', () => cur.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => { cur.style.opacity = 0; });
    document.addEventListener('pointerenter', () => { cur.style.opacity = 1; });
  }

  /* =========================================================
     hero field — canvas grid of points reacting to cursor
     ========================================================= */
  function initField() {
    const cvs = $('#field');
    const ctx = cvs.getContext('2d');
    const hero = $('.hero');
    let w, h, dpr, pts = [], sparks = [], visible = true, t0 = performance.now();
    const GAP = innerWidth < 600 ? 44 : 54;

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = hero.clientWidth; h = hero.clientHeight;
      cvs.width = w * dpr; cvs.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) pts.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 });
      sparks = Array.from({ length: innerWidth < 600 ? 22 : 46 }, () => ({ x: Math.random() * w, y: Math.random() * h, s: Math.random() * 0.4 + 0.1, a: Math.random() * Math.PI * 2 }));
    }
    resize();
    addEventListener('resize', resize);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

    let mx = -9999, my = -9999;
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) return;
      const t = (now - t0) / 1000;
      const r = hero.getBoundingClientRect();
      const tx = mouse.active ? mouse.x - r.left : w * 0.7;
      const ty = mouse.active ? mouse.y - r.top : h * 0.4;
      mx = mx < -1000 ? tx : lerp(mx, tx, 0.12); my = my < -1000 ? ty : lerp(my, ty, 0.12);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(220, w * 0.3);
      const near = [];
      for (const p of pts) {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.hypot(dx, dy);
        if (d < R) {
          const f = (1 - d / R) * 2.2;
          p.vx += (dx / (d || 1)) * f; p.vy += (dy / (d || 1)) * f;
          if (d < R * 0.75) near.push([p, d]);
        }
        // wave
        const wave = Math.sin(t * 0.8 + p.ox * 0.01 + p.oy * 0.013) * 1.6;
        p.vx += (p.ox - p.x) * 0.06; p.vy += (p.oy + wave - p.y) * 0.06;
        p.vx *= 0.82; p.vy *= 0.82;
        p.x += p.vx; p.y += p.vy;
        const glow = d < R ? 1 - d / R : 0;
        ctx.fillStyle = glow ? `rgba(255,46,99,${0.18 + glow * 0.8})` : 'rgba(255,255,255,0.10)';
        const s = 1 + glow * 1.6;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      // lines from cursor
      ctx.lineWidth = 1;
      for (const [p, d] of near) {
        if (Math.random() > 0.35) continue;
        ctx.strokeStyle = `rgba(255,46,99,${(1 - d / (R * 0.75)) * 0.22})`;
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      // drifting sparks
      for (const s of sparks) {
        s.a += 0.004; s.y -= s.s; s.x += Math.cos(s.a) * 0.2;
        if (s.y < -10) { s.y = h + 10; s.x = Math.random() * w; }
        ctx.fillStyle = 'rgba(255,143,184,.55)';
        ctx.fillRect(s.x, s.y, 1.5, 1.5);
      }
      // crosshair
      ctx.strokeStyle = 'rgba(255,46,99,.25)';
      ctx.beginPath(); ctx.arc(mx, my, 18 + Math.sin(t * 3) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    function staticFrame() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      for (const p of pts) ctx.fillRect(p.x - .5, p.y - .5, 1, 1);
    }
    if (REDUCED) { staticFrame(); addEventListener('resize', staticFrame); } else requestAnimationFrame(frame);
  }

  /* =========================================================
     hero letters — 3D follow + random glitch
     ========================================================= */
  function initHeroLetters() {
    const name = $('#heroName');
    const letters = $$('.hl', name);
    letters.forEach((l, i) => l.style.setProperty('--i', i));
    setTimeout(() => name.classList.add('is-settled'), 2200);
    if (REDUCED) return;
    if (FINE) {
      let centers = [], lq = false;
      const measure = () => { centers = letters.map((l) => { const r = l.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 + scrollY]; }); };
      setTimeout(measure, 2300);
      addEventListener('resize', () => setTimeout(measure, 100));
      addEventListener('pointermove', () => {
        if (!name.classList.contains('is-settled') || lq || scrollY > innerHeight) return;
        lq = true;
        requestAnimationFrame(() => { lq = false;
        if (!centers.length) measure();
        letters.forEach((l, i) => {
          const dx = (mouse.x - centers[i][0]) / innerWidth;
          const dy = (mouse.y - (centers[i][1] - scrollY)) / innerHeight;
          l.style.setProperty('--ry', (dx * 22).toFixed(2) + 'deg');
          l.style.setProperty('--rx', (-dy * 18).toFixed(2) + 'deg');
          l.style.setProperty('--mx', (dx * -10).toFixed(1) + 'px');
          l.style.setProperty('--my', (dy * -8).toFixed(1) + 'px');
        });
        });
      }, { passive: true });
    }
    setInterval(() => {
      const l = letters[Math.floor(Math.random() * letters.length)];
      l.classList.add('glitch');
      setTimeout(() => l.classList.remove('glitch'), 260);
    }, 3200);
  }

  /* =========================================================
     scramble text
     ========================================================= */
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';
  function scramble(el) {
    const final = el.dataset.final || el.textContent;
    el.dataset.final = final;
    if (REDUCED) return;
    let f = 0;
    const total = 18;
    clearInterval(el._sc);
    el._sc = setInterval(() => {
      el.textContent = Array.from(final).map((c, i) => (i < (f / total) * final.length ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
      if (++f > total) { clearInterval(el._sc); el.textContent = final; }
    }, 34);
  }
  $$('[data-scramble]').forEach((el) => el.addEventListener('pointerenter', () => scramble(el)));

  /* =========================================================
     tilt + magnetic + parallax + fact glow
     ========================================================= */
  function initTilt() {
    if (!FINE || REDUCED) return;
    $$('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 6;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1000px) rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)'; el.style.transform = ''; setTimeout(() => { el.style.transition = ''; }, 800); });
    });
  }
  function initMagnetic() {
    if (!FINE || REDUCED) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1), border-color .3s, color .3s';
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 700);
      });
    });
  }
  const parallaxEls = [];
  function initParallax() {
    if (REDUCED) return;
    parallaxEls.push([$('.hero__inner'), -0.18], [$('.hero__corner--tl'), 0.25], [$('.hero__corner--tr'), 0.25]);
  }
  function parallaxUpdate() {
    const y = scrollY;
    if (y > innerHeight * 1.2) return;
    parallaxEls.forEach(([el, k]) => { if (el) el.style.transform = `translate3d(0, ${y * k}px, 0)`; });
    const hero = $('.hero__inner');
    if (hero && !REDUCED) hero.style.opacity = String(clamp(1 - y / (innerHeight * 0.8), 0, 1));
  }
  $$('.fact').forEach((f) => f.addEventListener('pointermove', (e) => {
    const r = f.getBoundingClientRect();
    f.style.setProperty('--fx', e.clientX - r.left + 'px');
    f.style.setProperty('--fy', e.clientY - r.top + 'px');
  }));

  /* =========================================================
     about — terminal
     ========================================================= */
  const termBody = $('#termBody');
  let termCmd = 'whoami';
  let termTimer;
  function runCmd(cmd, instant) {
    termCmd = cmd;
    $$('.term__cmds button').forEach((b) => b.classList.toggle('is-active', b.dataset.cmd === cmd));
    const label = $(`.term__cmds [data-cmd="${cmd}"]`).textContent;
    const text = S().term[cmd] || '';
    clearInterval(termTimer);
    const head = `<span class="p">$</span> ${esc(label)}\n`;
    if (instant || REDUCED) { termBody.innerHTML = head + fmt(text) + '<i class="caret"></i>'; return; }
    let i = 0;
    termTimer = setInterval(() => {
      i += 2;
      termBody.innerHTML = head + fmt(text.slice(0, i)) + '<i class="caret"></i>';
      if (i >= text.length) clearInterval(termTimer);
    }, 16);
  }
  function fmt(t) { return esc(t).replace(/(#.*)/g, '<span class="c">$1</span>'); }
  $$('.term__cmds button').forEach((b) => b.addEventListener('click', () => runCmd(b.dataset.cmd)));
  langListeners.push(() => runCmd(termCmd, true));

  /* =========================================================
     BUGGY — raw / refined
     ========================================================= */
  (function initBuggy() {
    const screen = $('#bScreen');
    if (!screen) return;
    const tabs = $$('.btab'), shots = $$('.bshot'), url = $('#bUrl');
    const long = $('.bshot--long');
    let scrollAnim = null;
    function setShot(key) {
      tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.shot === key));
      shots.forEach((s) => s.classList.toggle('is-active', s.dataset.shot === key));
      const t = tabs.find((x) => x.dataset.shot === key);
      url.textContent = t ? t.dataset.url : '';
      stopScroll(true);
    }
    tabs.forEach((t) => t.addEventListener('click', () => setShot(t.dataset.shot)));
    // телефон: листаем ровно до конца скриншота, без чёрной пустоты
    const pImg = $('.phone__screen img'), pScr = $('.phone__screen');
    function fitPhone() {
      if (!pImg || !pImg.naturalHeight) return;
      const max = Math.max(0, pImg.offsetHeight - pScr.clientHeight);
      pImg.style.setProperty('--pmax', `${-max}px`);
      pImg.style.animation = 'none'; void pImg.offsetWidth; pImg.style.animation = '';
    }
    if (pImg) {
      pImg.loading = 'eager';
      if (pImg.complete) fitPhone(); else pImg.addEventListener('load', fitPhone);
      addEventListener('resize', () => setTimeout(fitPhone, 150));
    }
    // длинный скриншот главной прокручивается внутри окна
    function startScroll() {
      if (REDUCED || !long.classList.contains('is-active')) return;
      const max = long.offsetHeight - screen.clientHeight;
      if (max <= 0) return;
      long.style.transition = `transform ${Math.max(6, max / 260).toFixed(1)}s cubic-bezier(.45,0,.55,1)`;
      long.style.transform = `translateY(${-max}px)`;
    }
    function stopScroll(instant) {
      long.style.transition = instant ? 'none' : 'transform 1.4s cubic-bezier(.22,1,.36,1)';
      long.style.transform = 'translateY(0)';
    }
    screen.addEventListener('pointerenter', startScroll);
    screen.addEventListener('pointerleave', () => stopScroll(false));
    // на тач-устройствах — по тапу
    screen.addEventListener('click', () => {
      if (FINE) return;
      if (long.style.transform && long.style.transform !== 'translateY(0px)') stopScroll(false); else startScroll();
    });
    // автопоказ один раз, когда кейс появился
    const once = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      once.disconnect();
      if (REDUCED) return;
      setTimeout(startScroll, 600);
      setTimeout(() => stopScroll(false), 5200);
    }, { threshold: 0.55 });
    once.observe(screen);
  })();

  /* =========================================================
     STARK VARG — cinematic sticky scenes
     ========================================================= */
  const varg = $('#varg');
  const vargSticky = $('.varg__sticky');
  const vPhotos = $$('.vph');
  const vLabels = $$('.vlabel');
  const vBars = $$('.vbar');
  const vargIdx = $('#vargIdx');
  const vFlash = $('#vargFlash');
  const V_DUR = 4200;
  let vCur = 0, vTimer = null, vVisible = false, vHover = false;
  function vargShow(i) {
    vCur = (i + vPhotos.length) % vPhotos.length;
    vPhotos.forEach((ph, k) => ph.classList.toggle('is-active', k === vCur));
    vLabels.forEach((l, k) => l.classList.toggle('is-active', k === vCur));
    vBars.forEach((bb, k) => {
      bb.classList.toggle('is-done', k < vCur);
      bb.classList.remove('is-active');
      if (k === vCur) { void bb.offsetWidth; bb.classList.add('is-active'); }
    });
    if (vargIdx) vargIdx.textContent = String(vCur + 1).padStart(2, '0');
    if (!REDUCED) { vFlash.classList.remove('go'); void vFlash.offsetWidth; vFlash.classList.add('go'); }
    vargPlay();
  }
  function vargPlay() {
    clearTimeout(vTimer);
    if (!vVisible || vHover || REDUCED) return;
    vTimer = setTimeout(() => vargShow(vCur + 1), V_DUR);
  }
  if (varg) {
    varg.style.setProperty('--vdur', V_DUR + 'ms');
    new IntersectionObserver(([e]) => {
      vVisible = e.isIntersecting;
      varg.classList.toggle('is-paused', !vVisible);
      if (vVisible) vargShow(vCur); else clearTimeout(vTimer);
    }, { threshold: 0.35 }).observe(varg);
    vBars.forEach((bb) => bb.addEventListener('click', () => vargShow(+bb.dataset.go)));
    // по клику/тапу по кадру — следующая сцена
    $('#vargPhotos').parentElement.addEventListener('click', (e) => {
      if (e.target.closest('button, a, .varg__info')) return;
      vargShow(vCur + 1);
    });
    addEventListener('keydown', (e) => {
      if (!vVisible) return;
      if (e.key === 'ArrowRight') vargShow(vCur + 1);
      if (e.key === 'ArrowLeft') vargShow(vCur - 1);
    });
  }
  function vargUpdate() { /* кадры теперь сменяются сами — прокрутку не перехватываем */ }
  if (FINE && !REDUCED && vargSticky) {
    const light = $('#vargLight'), photos = $('#vargPhotos');
    let q = false;
    vargSticky.addEventListener('pointermove', (e) => {
      if (q) return; q = true;
      requestAnimationFrame(() => {
        q = false;
        const r = vargSticky.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        light.style.setProperty('--lx', x + 'px'); light.style.setProperty('--ly', y + 'px');
        photos.style.setProperty('--mx', ((x / r.width - 0.5) * -24).toFixed(1) + 'px');
        photos.style.setProperty('--my', ((y / r.height - 0.5) * -14).toFixed(1) + 'px');
      });
    });
    vargSticky.addEventListener('pointerleave', () => { photos.style.setProperty('--mx', '0px'); photos.style.setProperty('--my', '0px'); });
  }

  /* =========================================================
     GEO MAP — pins, search, route
     ========================================================= */
  const PLACES = [
    { x: 110, y: 120, cat: 'food', ru: ['Кофейня «Зерно»', 'заметка: лучший флэт уайт'], en: ['Grain coffee', 'note: best flat white'] },
    { x: 150, y: 190, cat: 'nature', ru: ['Городской парк', 'заметка: бегать по утрам'], en: ['City park', 'note: morning runs'] },
    { x: 310, y: 180, cat: 'culture', ru: ['Библиотека', 'заметка: тихий зал на 2 этаже'], en: ['Library', 'note: quiet hall, 2nd floor'] },
    { x: 360, y: 245, cat: 'nature', ru: ['Набережная', 'заметка: закат в 19:40'], en: ['Embankment', 'note: sunset at 7:40 pm'] },
    { x: 500, y: 200, cat: 'culture', ru: ['Смотровая площадка', 'заметка: вид на весь город'], en: ['Viewpoint', 'note: whole city view'] },
    { x: 450, y: 90, cat: 'food', ru: ['Пекарня', 'заметка: круассаны до 10:00'], en: ['Bakery', 'note: croissants before 10'] }
  ];
  (function initGeo() {
    if (!document.getElementById('geoPins')) return; // кейс GEO MAP убран
    const wrap = $('#geoPins');
    const map = $('.geo__map');
    const pop = $('#geoPop');
    const input = $('#geoSearch');
    const btn = $('#geoRouteBtn');
    const pins = PLACES.map((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pin c-${p.cat}`;
      b.style.left = (p.x / 600 * 100) + '%';
      b.style.top = (p.y / 420 * 100) + '%';
      b.innerHTML = '<span class="pin__b"></span>';
      b.dataset.i = i;
      wrap.appendChild(b);
      return b;
    });
    function label(p) { return p[lang] || p.ru; }
    pins.forEach((b, i) => {
      b.setAttribute('aria-label', label(PLACES[i])[0]);
      const show = () => {
        const p = PLACES[i];
        pins.forEach((x) => x.classList.toggle('is-open', x === b));
        pop.innerHTML = `<b>${esc(label(p)[0])}</b><small>${esc(label(p)[1])}</small><br/><small>${p.x.toFixed(0)}, ${p.y.toFixed(0)} · ${p.cat}</small>`;
        const mr = map.getBoundingClientRect(), br = b.getBoundingClientRect();
        pop.style.left = clamp(br.left - mr.left + br.width / 2, 100, mr.width - 100) + 'px';
        pop.style.top = Math.max(br.top - mr.top + br.height, 130) + 'px';
        pop.classList.add('is-on');
      };
      b.addEventListener('pointerenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('click', show);
      b.addEventListener('pointerleave', () => { pop.classList.remove('is-on'); b.classList.remove('is-open'); });
      b.addEventListener('blur', () => { pop.classList.remove('is-on'); b.classList.remove('is-open'); });
    });
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      pins.forEach((b, i) => {
        const hit = q && (PLACES[i].ru[0] + ' ' + PLACES[i].en[0] + ' ' + PLACES[i].cat).toLowerCase().includes(q);
        b.classList.toggle('is-match', !!hit);
        b.classList.toggle('is-dim', !!q && !hit);
      });
    });
    function btnText() { btn.textContent = map.classList.contains('has-route') ? S().geoClear : S().geoRouteBtn; }
    btn.addEventListener('click', () => {
      map.classList.toggle('has-route');
      btnText();
      if (map.classList.contains('has-route')) toast(S().geoRoute);
    });
    langListeners.push(() => { btnText(); pins.forEach((b, i) => b.setAttribute('aria-label', label(PLACES[i])[0])); });
  })();

  /* =========================================================
     WORD CARDS — flashcard demo
     ========================================================= */
  const WORDS = [
    ['serendipity', 'счастливая случайность'],
    ['curious', 'любопытный'],
    ['ephemeral', 'мимолётный'],
    ['resilient', 'устойчивый'],
    ['ubiquitous', 'вездесущий']
  ];
  (function initCards() {
    const card = $('#flash');
    const w = $('#wcWord'), tr = $('#wcTrans'), next = $('#wcNext'), count = $('#wcCount'), dotsEl = $('#wcDots');
    let i = 0;
    const known = new Set();
    dotsEl.innerHTML = WORDS.map(() => '<i></i>').join('');
    const dots = $$('i', dotsEl);
    function render() {
      w.textContent = WORDS[i][0];
      tr.textContent = WORDS[i][1];
      count.textContent = `${i + 1} / ${WORDS.length}`;
      next.textContent = '';
      dots.forEach((d, k) => { d.classList.toggle('on', known.has(k)); d.classList.toggle('now', k === i && !known.has(k)); });
    }
    function flip() { card.classList.toggle('is-flipped'); }
    card.addEventListener('click', flip);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    function advance(knew) {
      if (knew) known.add(i);
      next.textContent = S().wcNext[knew ? 1 : 0];
      if (!card.classList.contains('is-flipped')) card.classList.add('is-flipped');
      setTimeout(() => {
        card.classList.remove('is-flipped');
        card.classList.add('is-swipe');
        setTimeout(() => {
          if (known.size === WORDS.length) { known.clear(); toast(S().wcDone); }
          i = (i + 1) % WORDS.length;
          render();
        }, 230);
        setTimeout(() => card.classList.remove('is-swipe'), 520);
      }, 650);
    }
    $('#wcKnow').addEventListener('click', () => advance(true));
    $('#wcAgain').addEventListener('click', () => advance(false));
    render();
  })();

  /* =========================================================
     CERTIFICATE — lightbox
     ========================================================= */
  (function initCert() {
    const lb = document.getElementById('certLb'), img = document.getElementById('certImg');
    if (!lb) return;
    const open = (src) => { img.src = src; lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); };
    const close = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); };
    document.querySelectorAll('[data-cert]').forEach((b) => b.addEventListener('click', () => open(b.dataset.cert)));
    lb.addEventListener('click', (e) => { if (e.target !== img) close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  })();

  /* =========================================================
     SKILLS — orbit / constellation
     ========================================================= */
  const P = {
    buggy: 'BUGGY23', varg: 'Stark VARG', geo: 'GEO MAP', cards: 'Word Cards', titan: 'Manager Portal / Titan',
    cat: 'CAT°', pycourse: { ru: 'Курс Python (сертификат)', en: 'Python course (certificate)' },
    skillbox: 'Skillbox · Java Developer', ml: 'Skillbox · ML Engineer', study: { ru: 'учебные проекты', en: 'study projects' }, all: { ru: 'все проекты', en: 'all projects' }
  };
  const SKILLS = [
    { n: 'Python', g: 'core', p: ['pycourse', 'ml'] },
    { n: 'HTML', g: 'core', p: ['varg', 'buggy', 'cat'] },
    { n: 'CSS', g: 'core', p: ['varg', 'buggy', 'cat'] },
    { n: 'JavaScript', g: 'used', p: ['varg', 'cat'] },
    { n: 'React', g: 'used', p: ['buggy', 'titan'] },
    { n: 'TypeScript', g: 'used', p: ['cards', 'titan'] },
    { n: 'Flask', g: 'used', p: ['study'] },
    { n: 'SQL', g: 'used', p: ['cards'] },
    { n: 'PostgreSQL', g: 'used', p: ['cards'] },
    { n: 'Git', g: 'used', p: ['all'] },
    { n: 'AI', g: 'core', p: ['all'], full: 'AI-assisted development' },
    { n: 'Java', g: 'explore', p: ['skillbox'] },
    { n: 'ML', g: 'explore', p: ['ml'], full: 'Machine Learning' },
    { n: 'Spring', g: 'explore', p: ['skillbox', 'titan'], full: 'Spring ecosystem' },
    { n: 'Backend arch.', g: 'explore', p: ['skillbox'], full: 'Backend architecture' }
  ];
  const RADIUS = { core: 0.19, used: 0.34, explore: 0.47 };
  const SPEED = { core: 0.00012, used: -0.00007, explore: 0.00005 };
  (function initOrbit() {
    const orbit = $('#orbit');
    const holder = $('#orbitNodes');
    const panel = { g: $('#spGroup'), n: $('#spName'), k: $('#spK'), l: $('#spList') };
    const groups = { core: [], used: [], explore: [] };
    SKILLS.forEach((s) => groups[s.g].push(s));
    const nodes = SKILLS.map((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `node node--${s.g}`;
      b.textContent = s.n;
      const list = groups[s.g];
      s.base = (list.indexOf(s) / list.length) * Math.PI * 2 + (s.g === 'used' ? 0.3 : s.g === 'explore' ? 1.1 : -0.4);
      s.el = b;
      holder.appendChild(b);
      return b;
    });
    let angle = 0, paused = false, active = null, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(orbit);
    function place(dt) {
      SKILLS.forEach((s) => {
        if (!paused && !REDUCED) s.base += SPEED[s.g] * dt;
        const r = RADIUS[s.g];
        s.el.style.left = (50 + Math.cos(s.base) * r * 100) + '%';
        s.el.style.top = (50 + Math.sin(s.base) * r * 100) + '%';
      });
    }
    let last = performance.now();
    (function tick(now) {
      const dt = Math.min(now - last, 50); last = now;
      if (visible) place(dt);
      requestAnimationFrame(tick);
    })(last);
    void angle;
    function projName(k) { const v = P[k]; return typeof v === 'string' ? v : (v[lang] || v.ru); }
    function show(s) {
      active = s;
      orbit.classList.add('has-focus');
      SKILLS.forEach((o) => {
        o.el.classList.toggle('is-active', o === s);
        o.el.classList.toggle('is-related', o !== s && o.p.some((x) => s.p.includes(x) && x !== 'all'));
      });
      panel.g.textContent = S().groups[s.g];
      panel.n.textContent = s.full || s.n;
      panel.k.textContent = S().usedIn;
      panel.l.innerHTML = s.p.map((k, i) => `<li style="animation-delay:${i * 60}ms">${esc(projName(k))}</li>`).join('');
    }
    function hide() {
      active = null;
      orbit.classList.remove('has-focus');
      SKILLS.forEach((o) => o.el.classList.remove('is-active', 'is-related'));
    }
    SKILLS.forEach((s) => {
      s.el.addEventListener('pointerenter', () => { paused = true; show(s); });
      s.el.addEventListener('focus', () => { paused = true; show(s); });
      s.el.addEventListener('click', () => { paused = true; show(s); });
      s.el.addEventListener('pointerleave', () => { paused = false; hide(); });
      s.el.addEventListener('blur', () => { paused = false; hide(); });
    });
    langListeners.push(() => { if (active) show(active); });
    void nodes;
  })();

  /* =========================================================
     contact — hover letters, copy email
     ========================================================= */
  $$('[data-hover-letters]').forEach((el) => {
    const chars = Array.from(el.textContent);
    const grad = el.closest('.cl--acc');
    const a = [255, 46, 99], b = [255, 143, 184];
    el.innerHTML = chars.map((c, i) => {
      if (c === ' ') return ' ';
      const t = i / Math.max(1, chars.length - 1);
      const col = grad ? ` style="color:rgb(${a.map((v, k) => Math.round(lerp(v, b[k], t))).join(',')})"` : '';
      return `<span class="hlc"${col}>${esc(c)}</span>`;
    }).join('');
  });
  $$('[data-copy]').forEach((a) => a.addEventListener('click', (e) => {
    const v = a.dataset.copy;
    if (navigator.clipboard && window.isSecureContext) {
      e.preventDefault();
      navigator.clipboard.writeText(v).then(() => toast(S().copied)).catch(() => { location.href = 'mailto:' + v; });
    }
  }));
  const toastEl = $('#toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }

  /* =========================================================
     CASE 05 — CAT°: глаза следят за курсором
     ========================================================= */
  (function initCatx() {
    const stage = $('.catx__stage');
    const cvs = $('#catxCanvas');
    if (!stage || !cvs) return;
    stage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stage.click(); } });
    if (typeof window.NoirCat !== 'function') return;
    const ctx = cvs.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let cat = null, vis = false, W = 0, H = 0;
    function size() {
      W = Math.round(cvs.clientWidth * dpr); H = Math.round(cvs.clientHeight * dpr);
      cvs.width = W; cvs.height = H;
      if (cat) cat.ensure(H * 1.3);
    }
    new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      if (vis && !cat) { // строим кота только когда кейс виден
        cat = new window.NoirCat({ density: FINE ? 0.8 : 0.5 });
        size();
      }
    }, { rootMargin: '200px' }).observe(stage);
    addEventListener('resize', () => { if (cat) size(); });
    let last = performance.now(), t = 0;
    (function tick(now) {
      requestAnimationFrame(tick);
      if (!vis || !cat) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const r = stage.getBoundingClientRect();
      const scale = H * 1.02 / 1000;
      const ax = W * 0.5, ay = H * 0.66;
      const ex = r.left + (ax + (500 - 500) * scale) / dpr, ey = r.top + (ay + (452 - 540) * scale) / dpr;
      if (mouse.active) cat.lookAt((mouse.x - ex) / (innerWidth * 0.4), (mouse.y - ey) / (innerHeight * 0.4));
      else cat.lookAt(Math.sin(t * 0.4) * 0.6, Math.sin(t * 0.3) * 0.3);
      cat.update(dt, REDUCED);
      cat.draw(ctx, W, H, { scale, fx: 500, fy: 540, ax, ay, glow: 1.2 });
    })(last);
    // наведение на кнопку запуска — зрачки расширяются, клик по коту — медленное моргание
    stage.addEventListener('pointerenter', () => { if (cat) cat.state.pupilT = 2.2; });
    stage.addEventListener('pointerleave', () => { if (cat) cat.state.pupilT = 1; });
  })();

  /* =========================================================
     LIVE WINDOW — настоящий сайт в iframe
     ========================================================= */
  (function initLive() {
    const live = $('#live');
    const frame = $('#liveFrame');
    const url = $('#liveUrl');
    const openA = $('#liveOpen');
    let lastFocus = null;
    function open(src, label) {
      lastFocus = document.activeElement;
      live.classList.remove('is-loaded');
      url.textContent = label || src;
      openA.href = src;
      frame.src = src;
      live.classList.add('is-open');
      live.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
      setTimeout(() => $('.live__close').focus(), 50);
    }
    function close() {
      if (!live.classList.contains('is-open')) return;
      live.classList.remove('is-open');
      live.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lenis) lenis.start();
      setTimeout(() => { frame.src = 'about:blank'; }, 400);
      if (lastFocus) lastFocus.focus();
    }
    frame.addEventListener('load', () => { if (frame.src !== 'about:blank') live.classList.add('is-loaded'); });
    $$('[data-live]').forEach((el) => {
      const go = () => open(el.dataset.live, el.dataset.liveLabel);
      el.addEventListener('click', (e) => { if (el.tagName === 'A') e.preventDefault(); go(); });
      if (el.tagName === 'LI') el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    $$('[data-live-close]').forEach((el) => el.addEventListener('click', close));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  })();

  /* =========================================================
     hero status — typewriter
     ========================================================= */
  function typeStatus() {
    const el = $('[data-type]');
    if (!el || REDUCED) return;
    const full = el.dataset.type;
    el.textContent = '';
    let i = 0;
    const t = setInterval(() => { el.textContent = full.slice(0, ++i); if (i >= full.length) clearInterval(t); }, 28);
  }

  /* =========================================================
     INTRO
     ========================================================= */
  function runIntro(done) {
    const intro = $('#intro');
    const linesEl = $('#introLines');
    const bar = $('#introBar');
    const pct = $('#introPct');
    const seen = store.get('vika:intro');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      store.set('vika:intro', '1');
      intro.classList.add('is-done');
      document.body.classList.remove('is-loading');
      done();
    };
    $('#introSkip').addEventListener('click', finish);
    addEventListener('keydown', function k(e) { if (e.key === 'Enter' || e.key === 'Escape') { removeEventListener('keydown', k); finish(); } });

    if (REDUCED || seen) {
      // повторный визит — почти мгновенно
      intro.classList.add('is-quick');
      linesEl.innerHTML = '<div class="is-final">> welcome back.</div>';
      bar.style.transform = 'scaleX(1)'; pct.textContent = '100%';
      setTimeout(finish, REDUCED ? 0 : 420);
      return;
    }
    const lines = S().intro;
    let li = 0;
    const step = () => {
      if (finished) return;
      if (li < lines.length) {
        const d = document.createElement('div');
        d.textContent = lines[li];
        if (li === lines.length - 1) d.className = 'is-final';
        linesEl.appendChild(d);
        const p = (li + 1) / lines.length;
        bar.style.transform = `scaleX(${p})`;
        pct.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
        li++;
        setTimeout(step, li === lines.length ? 520 : 320);
      } else finish();
    };
    setTimeout(step, 150);
  }

  /* =========================================================
     boot
     ========================================================= */
  function boot() {
    if (lang !== 'ru') applyLang(lang, false);
    runCmd('whoami', true);
    initLenis();
    initCursor();
    initField();
    initTilt();
    initMagnetic();
    initParallax();
    onScroll();
    runIntro(() => {
      document.body.classList.add('is-ready');
      $$('.hero [data-split]').forEach((el) => el.classList.add('is-in'));
      initHeroLetters();
      observeReveals();
      setTimeout(typeStatus, 400);
      setTimeout(() => runCmd('whoami'), 200);
    });
  }
  boot();
})();
