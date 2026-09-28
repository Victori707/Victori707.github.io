/* =========================================================
   CAT° — interactions
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DPR = Math.min(devicePixelRatio || 1, FINE ? 2 : 1.5);

  const mouse = { x: innerWidth * 0.5, y: innerHeight * 0.4, last: 0, active: false };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.last = performance.now(); mouse.active = true; }, { passive: true });

  /* =========================================================
     split text
     ========================================================= */
  $$('[data-split]').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++);
            wi.textContent = part; w.appendChild(wi); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
  });

  /* =========================================================
     reveal on scroll
     ========================================================= */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-split], [data-card]').forEach((el) => io.observe(el));

  /* =========================================================
     smooth scroll
     ========================================================= */
  let lenis = null;
  function initLenis() {
    if (REDUCED || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({ lerp: 0.08, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  function scrollTo(target) {
    const el = target === '#top' ? 0 : $(target);
    if (el == null) return;
    // для сцены «взгляд» — прокручиваем к фазе приближения
    let y = el === 0 ? 0 : el.getBoundingClientRect().top + scrollY;
    if (target === '#gaze') y = stage.offsetTop + (stage.offsetHeight - innerHeight) * 0.36;
    if (lenis) lenis.scrollTo(y, { duration: 2 });
    else scrollTo_(y);
  }
  const scrollTo_ = (y) => window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
  $$('[data-scroll]').forEach((a) => a.addEventListener('click', (e) => {
    const h = a.getAttribute('href');
    if (!h || h[0] !== '#') return;
    e.preventDefault();
    scrollTo(h);
  }));

  /* =========================================================
     cursor + magnetic
     ========================================================= */
  const cursor = $('.cursor');
  if (FINE && !REDUCED) {
    document.body.classList.add('has-cursor');
    const glow = $('.cursor__glow');
    let gx = mouse.x, gy = mouse.y;
    (function tick() {
      gx = lerp(gx, mouse.x, 0.09); gy = lerp(gy, mouse.y, 0.09);
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      requestAnimationFrame(tick);
    })();
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, [data-card]');
      cursor.classList.toggle('is-hover', !!t && !t.matches('[data-card]'));
      cursor.classList.toggle('is-pink', !!(t && t.matches('.btn--pink, [data-card]')));
    });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.28}px, ${y * 0.38}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .9s cubic-bezier(.19,1,.22,1), box-shadow .5s, background .4s';
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 900);
      });
    });

    $$('[data-card]').forEach((c) => c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`);
      c.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  /* =========================================================
     dust — маленькие световые частицы
     ========================================================= */
  (function dust() {
    const c = $('#dust'); const g = c.getContext('2d');
    let W, H, P = [];
    const resize = () => {
      W = c.width = innerWidth * DPR; H = c.height = innerHeight * DPR;
      c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
      P = Array.from({ length: FINE ? 70 : 34 }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.3 + 0.3) * DPR,
        vx: (Math.random() - 0.5) * 0.12 * DPR, vy: (-Math.random() * 0.25 - 0.05) * DPR,
        a: Math.random() * 0.5 + 0.1, pink: Math.random() < 0.45, ph: Math.random() * 6
      }));
    };
    resize(); addEventListener('resize', resize);
    if (REDUCED) return;
    let t = 0;
    (function loop() {
      t += 0.016;
      g.clearRect(0, 0, W, H);
      for (const p of P) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        const tw = 0.6 + Math.sin(t * 1.4 + p.ph) * 0.4;
        g.fillStyle = p.pink ? `rgba(255,79,163,${p.a * tw})` : `rgba(255,255,255,${p.a * tw * 0.6})`;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* =========================================================
     КОТ
     ========================================================= */
  const cat = new window.NoirCat({ density: FINE ? 1 : 0.6 });
  const EYE_MID = { x: 500, y: 452 };

  // interest → зрачки расширяются
  $$('[data-dilate]').forEach((el) => {
    el.addEventListener('pointerenter', () => { cat.state.pupilT = 2.6; });
    el.addEventListener('pointerleave', () => { cat.state.pupilT = 1; });
  });

  // «бесцельный» взгляд, если мышь давно не двигалась / тач
  function idleLook(t) {
    return { x: Math.sin(t * 0.23) * 0.55 + Math.sin(t * 0.61) * 0.2, y: Math.sin(t * 0.31 + 1) * 0.3 };
  }

  const lookOverride = { x: 0, y: 0, until: 0 };
  function lookFrom(eyeX, eyeY, t) {
    if (performance.now() < lookOverride.until) {
      cat.lookAt((lookOverride.x - eyeX) / (innerWidth * 0.3), (lookOverride.y - eyeY) / (innerHeight * 0.3));
      return;
    }
    const idle = !mouse.active || performance.now() - mouse.last > 4000;
    if (idle) { const l = idleLook(t); cat.lookAt(l.x, l.y); return; }
    const nx = (mouse.x - eyeX) / (innerWidth * 0.45);
    const ny = (mouse.y - eyeY) / (innerHeight * 0.45);
    cat.lookAt(nx, ny);
  }

  /* ---------- hero stage ---------- */
  const stage = $('.stage');
  const sticky = $('.stage__sticky');
  const heroCanvas = $('#catCanvas');
  const hctx = heroCanvas.getContext('2d');
  const gazeLines = $$('.gaze-line');
  const stageBar = $('#stageBar');
  let HW = 0, HH = 0;
  function sizeHero() {
    HW = sticky.clientWidth; HH = sticky.clientHeight;
    heroCanvas.width = Math.round(HW * DPR); heroCanvas.height = Math.round(HH * DPR);
    cat.ensure(Math.max(HH * 1.25, HW * 0.9) * DPR);
  }

  function stageProgress() {
    const r = stage.getBoundingClientRect();
    const total = stage.offsetHeight - innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }

  function heroView(p) {
    const mobile = HW < 700;
    const base = mobile
      ? { scale: Math.min(HW * 1.3, HH * 0.78) / 1000, fx: 500, fy: 520, ax: HW * 0.52, ay: HH * 0.76 }
      : { scale: HH * 1.1 / 1000, fx: 500, fy: 530, ax: HW * 0.66, ay: HH * 0.62 };
    const eyeScale = mobile ? HW * 3.1 / 1000 : HW * 2.6 / 1000;
    const side = mobile
      ? { scale: HW * 0.95 / 1000, fx: 500, fy: 520, ax: HW * 0.5, ay: HH * 1.02 }
      : { scale: HH * 0.95 / 1000, fx: 500, fy: 560, ax: HW * 0.8, ay: HH * 0.66 };

    const zIn = easeInOut(smooth(0.03, 0.4, p));
    const zOut = easeInOut(smooth(0.46, 0.74, p));
    const eye = { scale: eyeScale, fx: EYE_MID.x, fy: EYE_MID.y, ax: HW * 0.5, ay: HH * 0.44 };
    const a = {};
    ['fx', 'fy', 'ax', 'ay'].forEach((k) => { a[k] = lerp(lerp(base[k], eye[k], zIn), side[k], zOut); });
    // масштаб интерполируем в логарифме — движение камеры ровнее
    a.scale = Math.exp(lerp(lerp(Math.log(base.scale), Math.log(eye.scale), zIn), Math.log(side.scale), zOut));
    a.dim = lerp(lerp(1, 0.72, zIn), mobile ? 0.55 : 0.9, zOut);
    a.glow = 1 + zIn * 0.8 * (1 - zOut);
    return { view: a, zIn, zOut };
  }

  let heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(stage);

  function renderHero(t) {
    const p = stageProgress();
    const { view, zIn, zOut } = heroView(p);
    sticky.style.setProperty('--z', zIn.toFixed(4));
    sticky.style.setProperty('--sp', p.toFixed(4));
    stageBar.style.transform = `scaleY(${p.toFixed(4)})`;
    const r = smooth(0.58, 0.86, p);
    $('#revealPanel').style.setProperty('--r', r.toFixed(4));
    gazeLines.forEach((l) => {
      const at = parseFloat(l.dataset.at);
      l.classList.toggle('is-on', p > at && p < 0.47);
    });

    const eyeX = view.ax + (EYE_MID.x - view.fx) * view.scale;
    const eyeY = view.ay + (EYE_MID.y - view.fy) * view.scale;
    lookFrom(eyeX, eyeY, t);

    const s = DPR;
    hctx.setTransform(1, 0, 0, 1, 0, 0);
    cat.draw(hctx, heroCanvas.width, heroCanvas.height, {
      scale: view.scale * s, fx: view.fx, fy: view.fy, ax: view.ax * s, ay: view.ay * s,
      glow: view.glow, dim: view.dim
    });
    void zOut;
  }

  /* ---------- карточки ---------- */
  function fitCanvas(c) {
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return false;
    const W = Math.round(w * DPR), H = Math.round(h * DPR);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; c._drawn = false; }
    return true;
  }
  const vis = new Map();
  const visIO = new IntersectionObserver((es) => es.forEach((e) => vis.set(e.target, e.isIntersecting)), { rootMargin: '100px' });

  const finalCanvas = $('#finalCanvas');
  visIO.observe(finalCanvas);

  /* ---------- финальный экран: глаза из темноты ---------- */
  const final = $('#coffee');
  function renderFinal(t) {
    if (!vis.get(finalCanvas) || !fitCanvas(finalCanvas)) return;
    const W = finalCanvas.width, H = finalCanvas.height, g = finalCanvas.getContext('2d');
    const mobile = W / DPR < 700;
    const scale = (mobile ? W * 3.4 : W * 1.9) / 1000;
    const r = finalCanvas.getBoundingClientRect();
    const eyeY = r.top + r.height * (mobile ? 0.3 : 0.36);
    lookFrom(r.left + r.width / 2, eyeY, t);
    cat.draw(g, W, H, { scale, fx: EYE_MID.x, fy: EYE_MID.y + 20, ax: W / 2, ay: H * (mobile ? 0.3 : 0.36), dim: 0.28, rim: 0.7, glow: 1.6 });
  }

  /* ---------- главный цикл ---------- */
  let last = performance.now(), t = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    cat.update(dt, REDUCED);
    if (heroVisible) renderHero(t);
    renderFinal(t);
    requestAnimationFrame(frame);
  }

  /* =========================================================
     scroll-driven UI
     ========================================================= */
  const nav = $('#nav');
  const dealBg = $('.deal__bg');
  const rows = $$('.words__row');
  const navLinks = $$('.nav__links a');
  const sections = ['#gaze', '#terms', '#coffee'].map((h) => ({ h, el: h === '#gaze' ? stage : $(h) }));
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('is-compact', y > 60);
    nav.classList.toggle('is-hidden', y > lastY + 2 && y > innerHeight * 1.2);
    if (y < lastY - 2) nav.classList.remove('is-hidden');
    lastY = y;
    rows.forEach((r) => {
      const rect = r.getBoundingClientRect();
      const k = parseFloat(r.dataset.speed);
      r.style.transform = `translate3d(${(rect.top - innerHeight / 2) * k}px,0,0)`;
    });
    if (dealBg) {
      const rr = dealBg.parentElement.getBoundingClientRect();
      dealBg.style.transform = `translate3d(${(rr.top - innerHeight / 2) * -0.25}px,-50%,0)`;
    }
    let cur = null;
    sections.forEach((s) => { if (s.el.getBoundingClientRect().top < innerHeight * 0.5) cur = s.h; });
    if (stageProgress() < 0.1 && cur === '#gaze') cur = null;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === cur));
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* =========================================================
     FINAL — «ДА» / убегающее «НЕТ»
     ========================================================= */
  const noBtn = $('#noBtn');
  const yesBtn = $('#yesBtn');
  const noTxt = $('.no-btn__txt');
  const noTexts = ['НЕТ', 'а может да?', 'мяу?', 'не-а', 'поймай, если сможешь', 'я быстрее 🐾', 'кот следит', 'почти!', 'ну пожааалуйста', 'хи-хи', 'ладно…'];
  const noBubbles = ['мимо!', 'хи-хи', 'не поймаешь', 'кот всё видит 👀', 'ещё чуть-чуть', 'мяу!', 'устала бегать…'];
  const PAW = '<svg viewBox="0 0 64 64"><g fill="currentColor"><ellipse cx="32" cy="41" rx="12" ry="10"/><ellipse cx="17" cy="27" rx="5" ry="6.5"/><ellipse cx="26" cy="17" rx="5" ry="6.5"/><ellipse cx="38" cy="17" rx="5" ry="6.5"/><ellipse cx="47" cy="27" rx="5" ry="6.5"/></g></svg>';
  const GIVE_UP = 10;
  let noCount = 0, noLock = false;
  function placeNo(first) {
    if (noBtn.classList.contains('is-giveup') && !first) return;
    const r = final.getBoundingClientRect();
    const yes = yesBtn.getBoundingClientRect();
    if (first) {
      noBtn.style.setProperty('--nx', `${yes.left - r.left + yes.width / 2}px`);
      noBtn.style.setProperty('--ny', `${yes.bottom - r.top + 64}px`);
      return;
    }
    let x, y, tries = 0;
    do {
      x = 130 + Math.random() * (r.width - 260);
      y = 100 + Math.random() * (r.height - 200);
      tries++;
    } while (tries < 60 && Math.abs(x - (yes.left - r.left + yes.width / 2)) < yes.width && Math.abs(y - (yes.top - r.top + yes.height / 2)) < yes.height * 1.6);
    noBtn.style.setProperty('--nx', `${x}px`);
    noBtn.style.setProperty('--ny', `${y}px`);
    // кот провожает кнопку взглядом
    lookOverride.x = r.left + x; lookOverride.y = r.top + y; lookOverride.until = performance.now() + 1100;
  }
  function spawn(cls, html, x, y, extra) {
    const el = document.createElement('span');
    el.className = cls; el.innerHTML = html;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    if (extra) extra(el);
    final.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
  function runAway() {
    if (final.classList.contains('is-done') || noLock || noBtn.classList.contains('is-giveup')) return;
    noLock = true; setTimeout(() => { noLock = false; }, 260);
    const fr = final.getBoundingClientRect(), b = noBtn.getBoundingClientRect();
    const ox = b.left - fr.left + b.width / 2, oy = b.top - fr.top + b.height / 2;
    noCount++;
    // след лапки на старом месте + реплика
    spawn('paw-print', PAW, ox, oy, (el) => el.style.setProperty('--r', `${Math.round(Math.random() * 60 - 30)}deg`));
    if (noCount % 2 === 0) spawn('no-bubble', noBubbles[(noCount / 2 - 1) % noBubbles.length], ox, oy - 10);
    if (noCount >= GIVE_UP) {
      noTxt.textContent = 'ну ладно, ДА 💗';
      noBtn.classList.add('is-giveup');
      noBtn.style.setProperty('--s', 1);
      toast('кнопка «НЕТ» сдалась. кот доволен 🐾');
      return;
    }
    noTxt.textContent = noTexts[Math.min(noCount, noTexts.length - 1)];
    noBtn.classList.toggle('is-sad', noCount >= 4);
    noBtn.style.setProperty('--s', Math.max(0.9, 1 - noCount * 0.012).toFixed(3));
    noBtn.classList.remove('boing'); void noBtn.offsetWidth; noBtn.classList.add('boing');
    cat.state.pupilT = 0.4; // сузил зрачки: азарт
    setTimeout(() => { cat.state.pupilT = 1; }, 900);
    placeNo(false);
  }
  noBtn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') runAway(); });
  noBtn.addEventListener('pointerdown', (e) => { if (!noBtn.classList.contains('is-giveup')) { e.preventDefault(); runAway(); } });
  noBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (noBtn.classList.contains('is-giveup')) yesBtn.click(); else runAway();
  });
  final.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = noBtn.getBoundingClientRect();
    if (e.clientX > b.left - 60 && e.clientX < b.right + 60 && e.clientY > b.top - 50 && e.clientY < b.bottom + 50) runAway();
  });
  addEventListener('resize', () => { if (!noCount) placeNo(true); });

  yesBtn.addEventListener('click', () => {
    final.classList.add('is-done');
    noBtn.classList.add('is-gone');
    cat.state.happyT = 1; // довольный прищур
    cat.state.pupilT = 2.6;
    burst();
  });

  /* ---------- розовый взрыв частиц ---------- */
  function burst() {
    if (REDUCED) return;
    const c = $('#burst'); const g = c.getContext('2d');
    const W = c.width = c.clientWidth * DPR, H = c.height = c.clientHeight * DPR;
    const P = Array.from({ length: 180 }, () => {
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 9) * DPR;
      return { x: W / 2, y: H * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3 * DPR, r: (1 + Math.random() * 2.5) * DPR, life: 1, pink: Math.random() < 0.8 };
    });
    (function loop() {
      g.clearRect(0, 0, W, H);
      let alive = 0;
      P.forEach((p) => {
        if (p.life <= 0) return;
        alive++;
        p.x += p.vx; p.y += p.vy; p.vx *= 0.975; p.vy = p.vy * 0.975 + 0.08 * DPR; p.life -= 0.009;
        g.fillStyle = p.pink ? `rgba(255,79,163,${p.life})` : `rgba(255,255,255,${p.life * 0.8})`;
        g.shadowColor = '#ff2d8d'; g.shadowBlur = 12 * DPR;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      });
      if (alive) requestAnimationFrame(loop); else g.clearRect(0, 0, W, H);
    })();
  }

  /* =========================================================
     ДОГОВОР
     ========================================================= */
  const contract = $('#contract');
  const tip = $('#dealTip');
  $$('.contract__rows li').forEach((li, i) => {
    li.style.setProperty('--i', i);
    li.addEventListener('pointerenter', () => {
      tip.innerHTML = `<span>примечание:</span> <em>${li.dataset.tip}</em>`;
      tip.classList.remove('flash'); void tip.offsetWidth; tip.classList.add('flash');
    });
    li.addEventListener('click', () => {
      tip.innerHTML = `<span>примечание:</span> <em>${li.dataset.tip}</em>`;
    });
  });
  $('#dealDate').textContent = new Date().toLocaleDateString('ru-RU');
  io.observe(contract);
  if (FINE && !REDUCED) {
    contract.addEventListener('pointermove', (e) => {
      const r = contract.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      contract.style.setProperty('--ry', `${(px * 10).toFixed(2)}deg`);
      contract.style.setProperty('--rx', `${(-py * 8).toFixed(2)}deg`);
      contract.style.setProperty('--mx', `${e.clientX - r.left}px`);
      contract.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
    contract.addEventListener('pointerleave', () => {
      contract.style.setProperty('--ry', '0deg');
      contract.style.setProperty('--rx', '0deg');
    });
  }

  /* =========================================================
     ТОСТ + ПАСХАЛКИ от vikaVi
     ========================================================= */
  const toastEl = $('#toast');
  let toastT;
  function toast(html, ms) {
    toastEl.innerHTML = html;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), ms || 3200);
  }

  // розовые глаза на несколько секунд
  let pinkT;
  function pinkEyes(ms) {
    cat.setEyes('pink');
    document.body.classList.add('pink-eyes');
    clearTimeout(pinkT);
    pinkT = setTimeout(() => { cat.setEyes('green'); document.body.classList.remove('pink-eyes'); }, ms || 6000);
  }
  function slowBlink() {
    cat.state.happyT = 1;
    setTimeout(() => { if (!final.classList.contains('is-done')) cat.state.happyT = 0; }, 1600);
  }

  // 1) консоль
  console.log('%c /\\_/\\ \n( o.o )  CAT° — very important website\n > ^ <   made with love by vikaVi 🐾\n\n  секрет: набери на клавиатуре «vika»',
    'color:#ff4fa3;font:600 13px/1.5 monospace;text-shadow:0 0 8px #ff2d8d');

  // 2) набрать «vika» → создатель узнан
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-8);
    if (typed.endsWith('vika') || typed.endsWith('вика')) {
      typed = '';
      pinkEyes(7000);
      slowBlink();
      toast('создатель узнан: <b>vikaVi</b> 💗 кот моргнул медленно — это «люблю»', 4200);
    }
    if (typed.endsWith('meow') || typed.endsWith('мяу')) {
      typed = '';
      slowBlink();
      toast('мяу. <b>мяу-мяу.</b> (перевод: «кофе за твой счёт»)');
    }
  });

  // 3) 5 кликов по логотипу → секретный режим
  let logoClicks = 0, logoT;
  $('.nav__logo').addEventListener('click', () => {
    logoClicks++;
    clearTimeout(logoT);
    logoT = setTimeout(() => { logoClicks = 0; }, 1600);
    if (logoClicks >= 5) {
      logoClicks = 0;
      pinkEyes(6000);
      toast('секретный режим <b>vikaVi</b> активирован 🌸');
    }
  });

  // 4) подпись в футере
  $('#creator').addEventListener('click', () => {
    pinkEyes(5000);
    toast('сайт сделала <b>vikaVi</b>. кот подтверждает 🐾');
  });

  // 5) клик по коту на первом экране
  const catLines = ['мрр.', 'не трогай, я работаю.', 'ещё раз — и кофе за двоих.', 'мур-р-р-р.', 'я официальный кот.', 'погладь — но после кофе.'];
  let catClicks = 0;
  heroCanvas.addEventListener('click', () => {
    slowBlink();
    toast(catLines[catClicks++ % catLines.length], 2200);
  });

  /* =========================================================
     boot
     ========================================================= */
  $('#year').textContent = new Date().getFullYear();
  function boot() {
    sizeHero();
    addEventListener('resize', () => { sizeHero(); });
    initLenis();
    onScroll();
    placeNo(true);
    requestAnimationFrame(frame);
    const loader = $('#loader');
    setTimeout(() => {
      loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      placeNo(true);
    }, REDUCED ? 0 : 900);
  }
  // даём браузеру отрисовать лоадер, потом строим шерсть
  requestAnimationFrame(() => setTimeout(boot, 30));
})();
