/* cursor.js — Lightweight magnetic cursor, no deps */
(function () {
  const dot  = document.getElementById('c-dot');
  const ring = document.getElementById('c-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  // Lerp ring behind
  function tick() {
    rx += (mx - rx) * 0.1;
    ry += (my - ry) * 0.1;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(tick);
  }
  tick();

  // Hover states
  const hoverEls = document.querySelectorAll('a, button, [data-hover]');
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-hover'));
  });

  const ctaEls = document.querySelectorAll('.btn-white, .cta-btn');
  ctaEls.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-cta'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-cta'));
  });
})();
