const story = document.querySelector('.story');
const sticky = document.querySelector('.story-sticky');
const scenes = [...document.querySelectorAll('.scene')];
const copies = [...document.querySelectorAll('.scene-copy')];
const rail = document.querySelector('.rail-fill');
const progress = document.querySelector('.scroll-progress span');
const index = document.querySelector('.scene-index');
const hint = document.querySelector('.scroll-hint');
const flash = document.querySelector('.light-flash');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
let queued = false;
let snapTimer;
let snapping = false;

function render() {
  const range = Math.max(1, story.offsetHeight - innerHeight);
  const p = clamp(-story.getBoundingClientRect().top / range);
  const activeIndex = clamp(Math.round(p * (scenes.length - 1)), 0, scenes.length - 1);
  const active = activeIndex + 1;

  scenes.forEach((scene, i) => {
    const shown = i === activeIndex;
    scene.style.opacity = shown ? '1' : '0';
    scene.style.visibility = shown ? 'visible' : 'hidden';
    if (!reduceMotion) {
      const drift = clamp((p - (i * .25 + .11)) * 3.3, -1, 1);
      const x = (i % 2 ? -1 : 1) * drift * 2.2;
      const y = (i % 2 ? 1 : -1) * drift * 1.2;
      const scale = 1.055 + Math.abs(drift) * .045;
      scene.style.transform = `translate3d(${x.toFixed(2)}%,${y.toFixed(2)}%,0) scale(${scale.toFixed(3)})`;
    }
  });
  copies.forEach((copy, i) => {
    const shown = i === active - 1;
    copy.style.opacity = shown ? '1' : '0';
    copy.style.transform = reduceMotion ? 'none' : `translateY(${shown ? 0 : 42}px)`;
    copy.style.visibility = shown ? 'visible' : 'hidden';
  });
  rail.style.height = (p * 100).toFixed(1) + '%';
  index.textContent = `0${active} / 04`;
  hint.style.opacity = String(1 - smooth(.04, .17, p));
  if (!reduceMotion) {
    const target = activeIndex / (scenes.length - 1);
    const peak = Math.exp(-Math.pow((p - target) / .025, 2));
    flash.style.opacity = (peak * .3).toFixed(3);
  }
  const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  progress.style.width = (scrollY / total * 100).toFixed(2) + '%';
  queued = false;
}
function snapToNearestScene() {
  if (reduceMotion || snapping) return;
  const rect = story.getBoundingClientRect();
  if (rect.top > 0 || rect.bottom < innerHeight) return;

  const range = Math.max(1, story.offsetHeight - innerHeight);
  const p = clamp(-rect.top / range);
  const targetIndex = clamp(Math.round(p * (scenes.length - 1)), 0, scenes.length - 1);
  const targetY = story.offsetTop + (targetIndex / (scenes.length - 1)) * range;

  if (Math.abs(scrollY - targetY) < 2) return;
  snapping = true;
  scrollTo({ top: targetY, behavior: 'smooth' });
  setTimeout(() => { snapping = false; }, 520);
}
function requestRender() {
  if (!queued) { queued = true; requestAnimationFrame(render); }
  clearTimeout(snapTimer);
  snapTimer = setTimeout(snapToNearestScene, 140);
}
addEventListener('scroll', requestRender, { passive: true });
addEventListener('resize', requestRender);
render();

if (matchMedia('(pointer:fine)').matches && !reduceMotion) {
  sticky.addEventListener('pointermove', event => {
    sticky.style.setProperty('--mx', `${event.clientX}px`);
    sticky.style.setProperty('--my', `${event.clientY}px`);
  }, { passive: true });
}
const outro = document.querySelector('.outro');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { outro.classList.add('is-visible'); observer.disconnect(); }
  }, { threshold: .2 });
  observer.observe(outro);
} else {
  outro.classList.add('is-visible');
}
