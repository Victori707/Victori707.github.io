/* =========================================================
   NOIR — процедурный чёрный кот (canvas 2D)
   ---------------------------------------------------------
   Модель в координатах 1000×1000 («бюст» кота).
   Шерсть (тысячи отдельных волосков) и контровой розовый
   свет пререндерятся один раз в offscreen-слои, а глаза,
   зрачки, моргание, усы и свечение рисуются каждый кадр.
   ========================================================= */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- геометрия (кубические кривые) ---------- */
  // каждый контур: стартовая точка + массив [c1x,c1y,c2x,c2y,x,y]
  const SHAPES = {
    head: {
      start: [500, 712],
      segs: [
        [590, 712, 672, 690, 740, 640],
        [800, 596, 842, 540, 824, 474],
        [812, 410, 786, 352, 742, 312],
        [700, 272, 610, 242, 500, 240],
        [390, 242, 300, 272, 258, 312],
        [214, 352, 188, 410, 176, 474],
        [158, 540, 200, 596, 260, 640],
        [328, 690, 410, 712, 500, 712]
      ]
    },
    earL: {
      start: [206, 440],
      segs: [
        [178, 320, 200, 170, 250, 60],
        [322, 104, 410, 176, 454, 270],
        [370, 330, 280, 400, 206, 440]
      ]
    },
    earR: {
      start: [794, 440],
      segs: [
        [822, 320, 800, 170, 750, 60],
        [678, 104, 590, 176, 546, 270],
        [630, 330, 720, 400, 794, 440]
      ]
    },
    body: {
      start: [300, 600],
      segs: [
        [170, 680, 90, 850, 40, 1080],
        [300, 1100, 700, 1100, 960, 1080],
        [910, 850, 830, 680, 700, 600],
        [600, 560, 400, 560, 300, 600]
      ]
    }
  };

  function cubic(p0, c1, c2, p1, t) {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * c1 + 3 * mt * t * t * c2 + t * t * t * p1;
  }

  function samplePoly(shape, per) {
    const pts = [];
    let [x0, y0] = shape.start;
    shape.segs.forEach((s) => {
      for (let i = 0; i < per; i++) {
        const t = i / per;
        pts.push([cubic(x0, s[0], s[2], s[4], t), cubic(y0, s[1], s[3], s[5], t)]);
      }
      x0 = s[4]; y0 = s[5];
    });
    return pts;
  }

  function toPath(shape) {
    const p = new Path2D();
    p.moveTo(shape.start[0], shape.start[1]);
    shape.segs.forEach((s) => p.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]));
    p.closePath();
    return p;
  }

  const PATHS = {};
  Object.keys(SHAPES).forEach((k) => { PATHS[k] = toPath(SHAPES[k]); });

  // контуры с нормалями (наружу)
  function contour(shape, per) {
    const pts = samplePoly(shape, per);
    // центр масс для ориентации нормали
    let cx = 0, cy = 0;
    pts.forEach((p) => { cx += p[0]; cy += p[1]; });
    cx /= pts.length; cy /= pts.length;
    return pts.map((p, i) => {
      const a = pts[(i + pts.length - 1) % pts.length];
      const b = pts[(i + 1) % pts.length];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]);
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      if ((p[0] - cx) * nx + (p[1] - cy) * ny < 0) { nx = -nx; ny = -ny; }
      return { x: p[0], y: p[1], nx, ny };
    });
  }

  /* ---------- глаза ---------- */
  const EYES = [
    { x: 388, y: 452, rot: 0.14, flip: 1, s: 1.12 },
    { x: 612, y: 452, rot: -0.14, flip: -1, s: 1.12 }
  ];
  function almond(ctx) {
    ctx.beginPath();
    ctx.moveTo(-74, 2);
    ctx.bezierCurveTo(-52, -50, 8, -62, 44, -44);
    ctx.bezierCurveTo(66, -32, 78, -12, 74, 6);
    ctx.bezierCurveTo(56, 44, 12, 52, -18, 44);
    ctx.bezierCurveTo(-48, 36, -66, 20, -74, 2);
    ctx.closePath();
  }

  /* ---------- пререндер радужки ---------- */
  const PALETTES = {
    green: {
      stops: ['#e9ff8a', '#b6f25a', '#39d67e', '#0d9a58', '#045c33', '#01200f'],
      light: () => `rgba(${Math.round(rand(170, 235))},255,${Math.round(rand(120, 190))},${rand(0.04, 0.16)})`,
      dark: () => `rgba(0,${Math.round(rand(20, 60))},${Math.round(rand(10, 30))},${rand(0.08, 0.25)})`,
      halo: '40,255,140', in1: '150,255,140', in2: '20,220,120', bg: '#021a0c'
    },
    pink: {
      stops: ['#fff0f8', '#ffb3d9', '#ff4fa3', '#e91e78', '#8a0a45', '#2a0215'],
      light: () => `rgba(255,${Math.round(rand(160, 220))},${Math.round(rand(200, 240))},${rand(0.05, 0.18)})`,
      dark: () => `rgba(${Math.round(rand(40, 80))},0,${Math.round(rand(15, 35))},${rand(0.08, 0.25)})`,
      halo: '255,45,141', in1: '255,170,215', in2: '255,45,141', bg: '#1a0210'
    }
  };

  function buildIris(size, palName) {
    const pal = PALETTES[palName || 'green'];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    g.translate(r, r);
    // база
    const grad = g.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
    [0, 0.18, 0.42, 0.7, 0.9, 1].forEach((o, i) => grad.addColorStop(o, pal.stops[i]));
    g.fillStyle = grad;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    // волокна радужки
    for (let i = 0; i < 1400; i++) {
      const a = rand(0, TAU);
      const r0 = rand(r * 0.12, r * 0.35);
      const r1 = rand(r * 0.55, r * 0.98);
      const light = Math.random() > 0.45;
      g.strokeStyle = light ? pal.light() : pal.dark();
      g.lineWidth = rand(0.3, 1.1) * (size / 300);
      const wob = rand(-0.08, 0.08);
      g.beginPath();
      g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      g.quadraticCurveTo(Math.cos(a + wob) * (r0 + r1) / 2, Math.sin(a + wob) * (r0 + r1) / 2, Math.cos(a + wob * 2) * r1, Math.sin(a + wob * 2) * r1);
      g.stroke();
    }
    // крипты / пятнышки
    for (let i = 0; i < 90; i++) {
      const a = rand(0, TAU), d = rand(r * 0.3, r * 0.85);
      g.fillStyle = `rgba(0,40,20,${rand(0.08, 0.2)})`;
      g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d, rand(1, 3) * size / 240, rand(2, 6) * size / 240, a, 0, TAU); g.fill();
    }
    // тёмный лимбальный ободок
    const limb = g.createRadialGradient(0, 0, r * 0.78, 0, 0, r);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(1, 'rgba(0,12,6,0.85)');
    g.fillStyle = limb;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    // золотистое кольцо у зрачка
    const inner = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.4);
    inner.addColorStop(0, 'rgba(255,240,140,.55)');
    inner.addColorStop(1, 'rgba(255,240,140,0)');
    g.fillStyle = inner;
    g.beginPath(); g.arc(0, 0, r * 0.4, 0, TAU); g.fill();
    return c;
  }

  /* ---------- hit-test без трансформаций ---------- */
  const HIT = document.createElement('canvas').getContext('2d');
  const inside = (path, x, y) => HIT.isPointInPath(path, x, y);
  const inSilhouette = (x, y) => ['head', 'earL', 'earR', 'body'].some((k) => inside(PATHS[k], x, y));

  /* ---------- пререндер шерсти ---------- */
  function furStrokes(g, path, count, opts) {
    const { bx0, by0, bx1, by1, dir, len, colors, width } = opts;
    let placed = 0, guard = 0;
    while (placed < count && guard < count * 6) {
      guard++;
      const x = rand(bx0, bx1), y = rand(by0, by1);
      if (!inside(path, x, y)) continue;
      placed++;
      const a = dir(x, y) + rand(-0.35, 0.35);
      const l = rand(len[0], len[1]);
      g.strokeStyle = colors(x, y);
      g.lineWidth = rand(width[0], width[1]);
      const bend = rand(-0.25, 0.25);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + bend) * l * 0.5, y + Math.sin(a + bend) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }

  function makeLayer(res) {
    const c = document.createElement('canvas');
    c.width = c.height = res;
    const g = c.getContext('2d');
    g.scale(res / 1000, res / 1000);
    g.lineCap = 'round';
    return { c, g };
  }

  const LIGHT = { x: 0.62, y: -0.78 }; // розовый контровой свет сверху-справа

  function sheen(x, y, cx, cy) {
    // мягкий холодный блик «бархата» на лбу / плечах
    const d = Math.hypot(x - cx, y - cy);
    return d;
  }

  function buildLayers(res, density) {
    const k = density;
    const L = {};

    /* --- тело --- */
    {
      const { c, g } = makeLayer(res);
      const grad = g.createLinearGradient(0, 560, 0, 1080);
      grad.addColorStop(0, '#111114');
      grad.addColorStop(0.5, '#08080a');
      grad.addColorStop(1, '#030304');
      g.fillStyle = grad; g.fill(PATHS.body);
      g.save(); g.clip(PATHS.body);
      furStrokes(g, PATHS.body, 9000 * k, {
        bx0: 30, by0: 560, bx1: 970, by1: 1090,
        dir: (x, y) => Math.PI / 2 + (x - 500) / 900,
        len: [8, 22], width: [0.5, 1.3],
        colors: (x, y) => {
          const chest = Math.max(0, 1 - Math.hypot(x - 500, y - 700) / 260);
          return `rgba(${150 + chest * 40},${152 + chest * 40},${170 + chest * 40},${rand(0.02, 0.06) + chest * 0.05})`;
        }
      });
      furStrokes(g, PATHS.body, 5000 * k, {
        bx0: 30, by0: 560, bx1: 970, by1: 1090,
        dir: (x) => Math.PI / 2 + (x - 500) / 900,
        len: [10, 24], width: [0.8, 1.8],
        colors: () => `rgba(0,0,0,${rand(0.2, 0.45)})`
      });
      // тень от головы на груди
      const sh = g.createRadialGradient(500, 640, 40, 500, 660, 330);
      sh.addColorStop(0, 'rgba(0,0,0,.85)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sh; g.fillRect(0, 540, 1000, 460);
      g.restore();
      L.body = c;
    }

    /* --- уши --- */
    ['earL', 'earR'].forEach((key) => {
      const { c, g } = makeLayer(res);
      const s = SHAPES[key];
      const right = key === 'earR';
      const grad = g.createLinearGradient(s.start[0], 420, right ? 738 : 262, 92);
      grad.addColorStop(0, '#0a0a0c');
      grad.addColorStop(1, '#141418');
      g.fillStyle = grad; g.fill(PATHS[key]);
      g.save(); g.clip(PATHS[key]);
      // внутренняя часть уха — чуть светлее, с розовым подсветом на правом
      const ix = right ? 690 : 310, iy = 250;
      const inner = g.createRadialGradient(ix, iy, 5, ix, iy + 30, 120);
      inner.addColorStop(0, right ? 'rgba(120,40,80,.55)' : 'rgba(60,40,55,.45)');
      inner.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = inner; g.fillRect(0, 0, 1000, 500);
      furStrokes(g, PATHS[key], 2600 * k, {
        bx0: right ? 560 : 220, by0: 88, bx1: right ? 780 : 440, by1: 425,
        dir: (x, y) => Math.atan2(y - 420, x - (right ? 700 : 300)) + Math.PI,
        len: [6, 16], width: [0.4, 1.1],
        colors: (x, y) => {
          const inside = Math.hypot(x - ix, y - iy) < 90;
          if (inside) return right ? `rgba(255,120,190,${rand(0.05, 0.16)})` : `rgba(200,170,190,${rand(0.03, 0.08)})`;
          return `rgba(160,162,180,${rand(0.02, 0.07)})`;
        }
      });
      g.restore();
      L[key] = c;
    });

    /* --- голова --- */
    {
      const { c, g } = makeLayer(res);
      const grad = g.createRadialGradient(560, 360, 40, 500, 480, 420);
      grad.addColorStop(0, '#16161b');
      grad.addColorStop(0.45, '#0b0b0d');
      grad.addColorStop(1, '#050506');
      g.fillStyle = grad; g.fill(PATHS.head);
      g.save(); g.clip(PATHS.head);

      // лёгкий «бархатный» блик на лбу и скулах
      [[520, 320, 190, 0.07], [690, 540, 130, 0.05], [310, 540, 120, 0.025], [500, 400, 90, 0.035]].forEach(([x, y, r, a]) => {
        const b = g.createRadialGradient(x, y, 0, x, y, r);
        b.addColorStop(0, `rgba(170,175,200,${a})`);
        b.addColorStop(1, 'rgba(170,175,200,0)');
        g.fillStyle = b; g.fillRect(0, 0, 1000, 1000);
      });

      // направление шерсти — от носа наружу, на лбу вверх
      const dir = (x, y) => {
        const a = Math.atan2(y - 600, x - 500);
        if (y < 420) return -Math.PI / 2 + (x - 500) / 500;
        return a;
      };
      furStrokes(g, PATHS.head, 16000 * k, {
        bx0: 170, by0: 240, bx1: 830, by1: 720,
        dir, len: [5, 15], width: [0.4, 1.1],
        colors: (x, y) => {
          const lit = Math.max(0, ((x - 500) * LIGHT.x + (y - 480) * LIGHT.y) / 320);
          if (lit > 0.55 && Math.random() < lit * 0.35) return `rgba(255,90,170,${rand(0.03, 0.09)})`;
          return `rgba(${Math.round(rand(130, 175))},${Math.round(rand(132, 178))},${Math.round(rand(150, 195))},${rand(0.012, 0.05)})`;
        }
      });
      furStrokes(g, PATHS.head, 7000 * k, {
        bx0: 170, by0: 240, bx1: 830, by1: 720,
        dir, len: [6, 16], width: [0.7, 1.5],
        colors: () => `rgba(0,0,0,${rand(0.2, 0.5)})`
      });

      // глазницы (глубина)
      EYES.forEach((e) => {
        const s = g.createRadialGradient(e.x, e.y, 30, e.x, e.y, 130);
        s.addColorStop(0, 'rgba(0,0,0,.9)');
        s.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = s; g.beginPath(); g.arc(e.x, e.y, 130, 0, TAU); g.fill();
        // светлее надбровье
        const brow = g.createRadialGradient(e.x + e.flip * -10, e.y - 90, 0, e.x, e.y - 90, 80);
        brow.addColorStop(0, 'rgba(160,165,190,.06)');
        brow.addColorStop(1, 'rgba(160,165,190,0)');
        g.fillStyle = brow; g.fillRect(e.x - 90, e.y - 180, 180, 120);
      });
      // мордочка и подушечки усов
      [[455, 612, 62], [545, 612, 62]].forEach(([x, y, r]) => {
        const m = g.createRadialGradient(x, y - 10, 0, x, y, r);
        m.addColorStop(0, 'rgba(150,150,170,.07)');
        m.addColorStop(1, 'rgba(150,150,170,0)');
        g.fillStyle = m; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      });
      // точки у основания усов
      for (let i = 0; i < 26; i++) {
        const side = i % 2 ? 1 : -1;
        g.fillStyle = 'rgba(0,0,0,.6)';
        g.beginPath(); g.arc(500 + side * rand(24, 78), rand(596, 636), rand(1.4, 2.4), 0, TAU); g.fill();
      }
      // переносица
      const bridge = g.createLinearGradient(500, 470, 500, 560);
      bridge.addColorStop(0, 'rgba(150,150,175,0)');
      bridge.addColorStop(1, 'rgba(150,150,175,.07)');
      g.fillStyle = bridge; g.beginPath(); g.ellipse(500, 520, 26, 48, 0, 0, TAU); g.fill();
      // нижняя тень подбородка
      const chin = g.createLinearGradient(0, 620, 0, 712);
      chin.addColorStop(0, 'rgba(0,0,0,0)');
      chin.addColorStop(1, 'rgba(0,0,0,.75)');
      g.fillStyle = chin; g.fillRect(0, 620, 1000, 100);
      g.restore();

      // нос
      g.save();
      g.beginPath();
      g.moveTo(472, 552); g.quadraticCurveTo(500, 543, 528, 552);
      g.quadraticCurveTo(526, 568, 500, 586); g.quadraticCurveTo(474, 568, 472, 552);
      const ng = g.createLinearGradient(0, 545, 0, 586);
      ng.addColorStop(0, '#26232a'); ng.addColorStop(1, '#0c0b0e');
      g.fillStyle = ng; g.fill();
      g.fillStyle = 'rgba(255,160,210,.10)';
      g.beginPath(); g.ellipse(510, 554, 10, 4, -0.2, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(500, 586); g.lineTo(500, 603); g.stroke();
      g.strokeStyle = 'rgba(160,160,185,.10)'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(500, 603); g.quadraticCurveTo(486, 618, 466, 612); g.stroke();
      g.beginPath(); g.moveTo(500, 603); g.quadraticCurveTo(514, 618, 534, 612); g.stroke();
      g.restore();
      L.head = c;
    }

    /* --- контровой свет (розовый) --- */
    {
      const { c, g } = makeLayer(res);
      const edges = [
        ...contour(SHAPES.head, 180).map((p) => ({ ...p, part: 'head' })),
        ...contour(SHAPES.earL, 90).filter((p) => p.y < 400),
        ...contour(SHAPES.earR, 90).filter((p) => p.y < 400),
        ...contour(SHAPES.body, 160).filter((p) => p.y < 1000 && p.y > 580)
      ];
      edges.forEach((p) => {
        if (inSilhouette(p.x + p.nx * 7, p.y + p.ny * 7)) return; // только внешний силуэт
        const lit = Math.max(0, p.nx * LIGHT.x + p.ny * LIGHT.y);
        const back = Math.max(0, p.nx * -0.9 + p.ny * -0.2) * 0.25; // слабый заполняющий с другой стороны
        const n = Math.round((lit * 9 + back * 4 + 1) * k);
        for (let i = 0; i < n; i++) {
          const inten = lit + back;
          if (inten < 0.04) continue;
          const jitter = rand(-6, 6);
          const x = p.x + p.ny * jitter + p.nx * rand(-10, 2);
          const y = p.y - p.nx * jitter + p.ny * rand(-10, 2);
          const a = Math.atan2(p.ny, p.nx) + rand(-0.6, 0.6);
          const l = rand(6, 22) * (0.5 + inten);
          const hot = lit > back;
          g.strokeStyle = hot
            ? `rgba(255,${Math.round(rand(70, 150))},${Math.round(rand(160, 210))},${Math.min(0.7, rand(0.08, 0.4) * inten * inten + 0.02)})`
            : `rgba(255,180,220,${rand(0.05, 0.16) * inten * 3})`;
          g.lineWidth = rand(0.5, 1.4);
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rand(-3, 3), y + Math.sin(a) * l * 0.5 + rand(-3, 3), x + Math.cos(a) * l, y + Math.sin(a) * l);
          g.stroke();
        }
      });
      // мягкий «серп» контрового света: силуэт минус силуэт, сдвинутый от света
      const cres = document.createElement('canvas');
      cres.width = cres.height = res;
      const q = cres.getContext('2d');
      q.scale(res / 1000, res / 1000);
      const sil = (ctx2) => ['body', 'earL', 'earR', 'head'].forEach((k) => ctx2.fill(PATHS[k]));
      q.fillStyle = '#ff2d8d';
      sil(q);
      q.globalCompositeOperation = 'destination-out';
      q.save();
      q.translate(-LIGHT.x * 16, -LIGHT.y * 16);
      q.filter = 'blur(6px)';
      q.fillStyle = '#000';
      sil(q);
      q.restore();
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.filter = `blur(${res / 500}px)`;
      g.globalAlpha = 0.55;
      g.drawImage(cres, 0, 0);
      g.filter = `blur(${res / 70}px)`;
      g.globalAlpha = 0.35;
      g.drawImage(cres, 0, 0);
      g.restore();
      L.rim = c;
    }
    return L;
  }

  /* =========================================================
     Cat — рендерер
     ========================================================= */
  class Cat {
    constructor(opts) {
      this.density = (opts && opts.density) || 1;
      this.layers = null;
      this.res = 0;
      this.irises = { green: buildIris(640, 'green') };
      this.iris = this.irises.green;
      this.pal = PALETTES.green;
      this.state = {
        look: { x: 0, y: 0 }, lookT: { x: 0, y: 0 },
        gaze: { x: 0, y: 0 }, gazeT: { x: 0, y: 0 },
        blink: 0, happy: 0, happyT: 0,
        pupil: 1, pupilT: 1,
        earL: 0, earR: 0,
        t: 0
      };
      this._nextBlink = 2 + Math.random() * 3;
      this._blinkPhase = -1;
      this._nextEar = 3 + Math.random() * 4;
      this._earAnim = null;
    }

    setEyes(name) {
      if (!this.irises[name]) this.irises[name] = buildIris(640, name);
      this.iris = this.irises[name];
      this.pal = PALETTES[name];
    }

    ensure(res) {
      res = Math.max(400, Math.min(2400, Math.round(res / 100) * 100));
      if (this.layers && Math.abs(res - this.res) < 200) return;
      this.res = res;
      this.layers = buildLayers(res, this.density * Math.min(1.4, res / 1400));
    }

    // обновление анимации; dt — секунды
    update(dt, reduced) {
      const s = this.state;
      s.t += dt;
      const k = 1 - Math.pow(0.001, dt); // плавность
      s.look.x += (s.lookT.x - s.look.x) * k * 0.9;
      s.look.y += (s.lookT.y - s.look.y) * k * 0.9;
      s.gaze.x += (s.gazeT.x - s.gaze.x) * Math.min(1, k * 2.2);
      s.gaze.y += (s.gazeT.y - s.gaze.y) * Math.min(1, k * 2.2);
      s.pupil += (s.pupilT - s.pupil) * k;
      s.happy += (s.happyT - s.happy) * k * 0.6;
      if (reduced) return;

      // медленное моргание
      this._nextBlink -= dt;
      if (this._nextBlink <= 0 && this._blinkPhase < 0) {
        this._blinkPhase = 0;
        this._blinkSlow = Math.random() < 0.35; // иногда — «кошачий поцелуй»
      }
      if (this._blinkPhase >= 0) {
        const dur = this._blinkSlow ? 1.6 : 0.42;
        this._blinkPhase += dt / dur;
        const p = this._blinkPhase;
        s.blink = p < 0.45 ? easeInOut(p / 0.45) : p < 0.6 ? 1 : 1 - easeInOut((p - 0.6) / 0.4);
        if (this._blinkSlow) s.blink *= 0.92;
        if (p >= 1) {
          this._blinkPhase = -1; s.blink = 0;
          this._nextBlink = rand(3.5, 7.5);
        }
      }
      // подёргивание ушей
      this._nextEar -= dt;
      if (this._nextEar <= 0 && !this._earAnim) {
        this._earAnim = { side: Math.random() < 0.5 ? 'earL' : 'earR', p: 0 };
      }
      if (this._earAnim) {
        this._earAnim.p += dt / 0.55;
        const p = this._earAnim.p;
        const v = Math.sin(p * Math.PI * 3) * (1 - p) * 0.09;
        s[this._earAnim.side] = v;
        if (p >= 1) {
          s[this._earAnim.side] = 0;
          this._earAnim = null;
          this._nextEar = rand(4, 9);
        }
      }
    }

    // ставим цель взгляда в координатах экрана относительно центра глаз
    lookAt(nx, ny) {
      const s = this.state;
      s.lookT.x = Math.max(-1, Math.min(1, nx));
      s.lookT.y = Math.max(-1, Math.min(1, ny));
      s.gazeT.x = s.lookT.x;
      s.gazeT.y = s.lookT.y;
    }

    /*
      draw(ctx, W, H, view)
      view = { scale, fx, fy, ax, ay, glow, rim, onlyEyes, dim }
      scale — px на единицу модели; (fx,fy) — точка модели, которая
      ставится в (ax,ay) на канвасе.
    */
    draw(ctx, W, H, view) {
      const s = this.state;
      const L = this.layers;
      const t = s.t;
      const breath = Math.sin(t * 1.35) * 0.5 + 0.5;
      const look = s.look;

      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.translate(view.ax, view.ay);
      ctx.scale(view.scale, view.scale);
      ctx.translate(-view.fx, -view.fy);

      // поворот головы за курсором (параллакс слоёв)
      const hx = look.x * 14, hy = look.y * 8;
      const rot = look.x * 0.025;

      if (!view.onlyEyes) {
        ctx.globalAlpha = view.dim == null ? 1 : view.dim;
        // тело — дыхание
        ctx.save();
        ctx.translate(500, 1000);
        ctx.scale(1 + breath * 0.008, 1 + breath * 0.012);
        ctx.translate(-500, -1000 + breath * -3);
        ctx.drawImage(L.body, look.x * 3, 0, 1000, 1000);
        ctx.restore();

        ctx.save();
        ctx.translate(500 + hx * 0.5, 700 + hy * 0.4 - breath * 3);
        ctx.rotate(rot);
        ctx.translate(-500, -700);
        // уши
        [['earL', 262, 330], ['earR', 738, 330]].forEach(([k, px, py]) => {
          ctx.save();
          ctx.translate(px + look.x * 5, py);
          ctx.rotate(s[k] * (k === 'earL' ? -1 : 1));
          ctx.translate(-px, -py);
          ctx.drawImage(L[k], 0, 0, 1000, 1000);
          ctx.restore();
        });
        ctx.drawImage(L.head, 0, 0, 1000, 1000);
        // контровой свет — дышит и чуть смещается
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (view.rim == null ? 1 : view.rim) * (0.78 + Math.sin(t * 0.7) * 0.12 + Math.max(0, look.x) * 0.15) * (view.dim == null ? 1 : view.dim);
        ctx.drawImage(L.rim, 0, 0, 1000, 1000);
        ctx.restore();
        // усы
        this.drawWhiskers(ctx, t, hx);
        ctx.restore();
        ctx.globalAlpha = 1;

        // глаза поверх (с большим сдвигом — эффект объёма)
        ctx.save();
        ctx.translate(500 + hx * 0.5, 700 + hy * 0.4 - breath * 3);
        ctx.rotate(rot);
        ctx.translate(-500 + hx * 0.55, -700 + hy * 0.5);
        this.drawEyes(ctx, view.glow == null ? 1 : view.glow);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(hx, hy);
        this.drawEyes(ctx, view.glow == null ? 1 : view.glow);
        ctx.restore();
      }
      ctx.restore();
    }

    drawWhiskers(ctx, t, hx) {
      const sway = Math.sin(t * 0.9) * 0.02;
      ctx.save();
      ctx.lineCap = 'round';
      [-1, 1].forEach((side) => {
        for (let i = 0; i < 4; i++) {
          const y0 = 600 + i * 10;
          const x0 = 500 + side * (40 + i * 6);
          const len = 290 - i * 30;
          const ang = (i - 1.2) * 0.1 + sway * (i + 1);
          const x1 = x0 + side * len * Math.cos(ang);
          const y1 = y0 + len * Math.sin(ang) + 30;
          const pink = side > 0;
          ctx.strokeStyle = pink ? `rgba(255,170,215,${0.34 - i * 0.05})` : `rgba(215,215,230,${0.22 - i * 0.04})`;
          ctx.lineWidth = 1.8 - i * 0.25;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(x0 + side * len * 0.55, y0 - 10 + i * 4, x1, y1);
          ctx.stroke();
        }
      });
      // брови-вибриссы
      [[-1, 360], [1, 640]].forEach(([side, x]) => {
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = side > 0 ? 'rgba(255,170,215,.22)' : 'rgba(215,215,230,.14)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + side * i * 8, 380 - i * 6);
          ctx.quadraticCurveTo(x + side * (60 + i * 10), 330 - i * 14, x + side * (110 + i * 12), 300 - i * 24);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    drawEyes(ctx, glow) {
      const s = this.state;
      const pulse = 0.85 + Math.sin(s.t * 1.1) * 0.15;
      const closeBase = Math.max(s.blink, s.happy * 0.62);
      EYES.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        ctx.scale(e.flip * e.s, e.s);

        // внешнее свечение в темноте
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const halo = ctx.createRadialGradient(0, 0, 30, 0, 0, 125);
        halo.addColorStop(0, `rgba(${this.pal.halo},${0.085 * glow * pulse * (1 - closeBase)})`);
        halo.addColorStop(1, `rgba(${this.pal.halo},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, 125, 0, TAU); ctx.fill();
        ctx.restore();

        // глазное яблоко
        almond(ctx);
        ctx.save();
        ctx.clip();
        ctx.fillStyle = this.pal.bg;
        ctx.fillRect(-90, -80, 180, 160);
        // радужка со сдвигом взгляда
        const gx = s.gaze.x * 12 * e.flip, gy = s.gaze.y * 8;
        const R = 70;
        ctx.drawImage(this.iris, gx - R, gy - R - 2, R * 2, R * 2);
        // внутреннее свечение (интенсивность «дышит»)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ig = ctx.createRadialGradient(gx, gy + 14, 6, gx, gy, 72);
        ig.addColorStop(0, `rgba(${this.pal.in1},${0.12 * pulse * glow})`);
        ig.addColorStop(0.6, `rgba(${this.pal.in2},${0.07 * pulse * glow})`);
        ig.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ig;
        ctx.fillRect(-90, -80, 180, 160);
        ctx.restore();
        // зрачок-щёлочка с острыми концами
        const pw = 6 + s.pupil * 6.5;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.9)';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(gx, gy - 70);
        ctx.bezierCurveTo(gx + pw * 1.25, gy - 30, gx + pw * 1.25, gy + 26, gx, gy + 66);
        ctx.bezierCurveTo(gx - pw * 1.25, gy + 26, gx - pw * 1.25, gy - 30, gx, gy - 70);
        ctx.fill();
        ctx.restore();
        // сферичность роговицы: затемнение к краям
        const cor = ctx.createRadialGradient(-6, -4, 30, 0, 0, 84);
        cor.addColorStop(0, 'rgba(0,0,0,0)');
        cor.addColorStop(1, 'rgba(0,10,5,.55)');
        ctx.fillStyle = cor;
        ctx.fillRect(-90, -80, 180, 160);
        // тень века сверху (объём)
        const lid = ctx.createLinearGradient(0, -60, 0, 10);
        lid.addColorStop(0, 'rgba(0,0,0,.85)');
        lid.addColorStop(0.55, 'rgba(0,0,0,.15)');
        lid.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lid;
        ctx.fillRect(-90, -80, 180, 100);
        // отражения: мягкий софтбокс, искра и розовый контровой блик
        ctx.save();
        ctx.scale(e.flip, 1);
        ctx.rotate(-e.rot);
        const hx0 = -22 + gx * e.flip * 0.15, hy0 = -20;
        const hl = ctx.createRadialGradient(hx0, hy0, 0, hx0, hy0, 16);
        hl.addColorStop(0, 'rgba(255,255,255,.95)');
        hl.addColorStop(0.35, 'rgba(255,255,255,.55)');
        hl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hl;
        ctx.beginPath(); ctx.ellipse(hx0, hy0, 16, 11, -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.arc(hx0 + 3, hy0 - 1, 2.6, 0, TAU); ctx.fill();
        const pk = ctx.createRadialGradient(30, 18, 0, 30, 18, 14);
        pk.addColorStop(0, 'rgba(255,79,163,.55)');
        pk.addColorStop(1, 'rgba(255,79,163,0)');
        ctx.fillStyle = pk;
        ctx.beginPath(); ctx.ellipse(30, 18, 14, 6, 0.35, 0, TAU); ctx.fill();
        ctx.restore();
        // веки: моргание / довольный прищур
        if (closeBase > 0.01) {
          const c = closeBase;
          const topY = -64 + c * 104;
          const botY = 50 - c * 20;
          ctx.fillStyle = '#060607';
          ctx.beginPath();
          ctx.moveTo(-90, -90);
          ctx.lineTo(90, -90);
          ctx.lineTo(90, topY - 10);
          ctx.quadraticCurveTo(0, topY + 18 * (1 - c * 0.5), -90, topY - 6);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-90, 90); ctx.lineTo(90, 90); ctx.lineTo(90, botY + 8);
          ctx.quadraticCurveTo(0, botY - 6, -90, botY + 4);
          ctx.closePath();
          ctx.fill();
          // ресничная кромка
          ctx.strokeStyle = 'rgba(160,160,185,.12)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-90, topY - 6);
          ctx.quadraticCurveTo(0, topY + 18 * (1 - c * 0.5), 90, topY - 10);
          ctx.stroke();
        }
        ctx.restore();

        // контур века
        almond(ctx);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4.5;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(200,200,220,.10)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-60, 30); ctx.bezierCurveTo(-30, 50, 20, 54, 60, 36);
        ctx.stroke();
        ctx.restore();
      });
    }
  }

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  Cat.EYES = EYES;
  global.NoirCat = Cat;
})(window);
