/* animations.js */
gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════
   BAR TRANSITION — fires on ALL clicks
══════════════════════════════════ */
function transOut(cb) {
  const bars = document.querySelectorAll('.ov-bar');
  gsap.to(bars, {
    scaleY: 1, duration: .45,
    stagger: { amount: .2, from: 'start' },
    ease: 'power4.in',
    onComplete: cb
  });
}
function transIn() {
  const bars = document.querySelectorAll('.ov-bar');
  gsap.to(bars, {
    scaleY: 0, duration: .45,
    stagger: { amount: .2, from: 'end' },
    ease: 'power4.out',
    transformOrigin: 'top'
  });
}

// Wire every link and button on the page
function wireTransitions() {
  // All anchor links with href="#..."
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = a.getAttribute('href');
      if (!target || target === '#' || target === '#!') return;
      e.preventDefault();
      transOut(() => {
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: 'instant' });
        transIn();
      });
    });
  });

  // CTA buttons that aren't hash links (e.g. external)
  document.querySelectorAll('.cta-btn[href^="http"], .cta-btn[href^="mailto"]').forEach(btn => {
    btn.addEventListener('click', () => {
      transOut(() => transIn());
    });
  });
}

wireTransitions();

/* ══════════════════════════════════
   PRELOADER
══════════════════════════════════ */
(function () {
  const pre     = document.getElementById('preloader');
  const counter = document.getElementById('pre-count');
  const sig     = document.getElementById('pre-sig');
  if (!pre) return;

  setTimeout(() => sig && sig.classList.add('draw'), 300);

  let n = 0;
  const iv = setInterval(() => {
    n += Math.floor(Math.random() * 5) + 1;
    if (n >= 100) { n = 100; clearInterval(iv); }
    if (counter) counter.textContent = String(n).padStart(3, '0');
  }, 28);

  setTimeout(() => {
    const bars = document.querySelectorAll('.pre-bar');
    gsap.to(bars, {
      scaleY: 1, duration: .5,
      stagger: { amount: .3, from: 'start' },
      ease: 'power4.in',
      onComplete: () => {
        pre.style.display = 'none';
        gsap.to(bars, {
          scaleY: 0, transformOrigin: 'top', duration: .5,
          stagger: { amount: .3, from: 'end' }, ease: 'power4.out'
        });
        startHero();
      }
    });
  }, 2600);
})();

/* ══════════════════════════════════
   HERO ENTRANCE
══════════════════════════════════ */
function startHero() {
  const words = document.querySelectorAll('.hero-name .word');
  gsap.to(words, { y: 0, opacity: 1, duration: 1, ease: 'power4.out', stagger: .1 });
  gsap.from('.hero-fullname', { opacity: 0, y: 12, duration: .8, delay: .5, ease: 'power3.out' });
  gsap.from('#tw-cur', { opacity: 0, duration: .4, delay: .8 });

  const phrases = [
    'Full-Stack Developer',
    'Game Developer · Roblox/Lua',
    'ML Engineer · TensorFlow',
    'Systems Engineer · Bolivia',
    'Enterprise Architect'
  ];
  let pi = 0, ci = 0, del = false;
  const tw = document.getElementById('tw');
  if (!tw) return;
  function type() {
    const ph = phrases[pi % phrases.length];
    if (!del) {
      ci++; tw.textContent = ph.slice(0, ci);
      if (ci === ph.length) { del = true; setTimeout(type, 2200); return; }
    } else {
      ci--; tw.textContent = ph.slice(0, ci);
      if (ci === 0) { del = false; pi++; setTimeout(type, 350); return; }
    }
    setTimeout(type, del ? 38 : 75);
  }
  setTimeout(type, 700);
}

/* ══════════════════════════════════
   SCROLL PROGRESS
══════════════════════════════════ */
window.addEventListener('scroll', () => {
  const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
  const bar = document.getElementById('scroll-prog');
  if (bar) bar.style.width = pct + '%';
}, { passive: true });

/* ══════════════════════════════════
   WORK BANNER PARALLAX
══════════════════════════════════ */
gsap.to('.wb-text', {
  x: '-18%',
  scrollTrigger: { trigger: '#work-banner', start: 'top bottom', end: 'bottom top', scrub: 1.5 }
});

/* ══════════════════════════════════
   ABOUT
══════════════════════════════════ */
gsap.from('.about-vis',  { opacity: 0, x: -40, duration: 1, ease: 'power3.out',
  scrollTrigger: { trigger: '#about', start: 'top 72%' } });
gsap.from('.about-copy', { opacity: 0, y: 30, duration: .9, delay: .15, ease: 'power3.out',
  scrollTrigger: { trigger: '#about', start: 'top 72%' } });

document.querySelectorAll('.stat-n[data-to]').forEach(el => {
  ScrollTrigger.create({
    trigger: el, start: 'top 88%', once: true,
    onEnter() {
      const target = +el.dataset.to, suffix = el.dataset.suf || '';
      let v = 0, step = target / 45;
      const iv = setInterval(() => {
        v = Math.min(v + step, target);
        el.textContent = Math.round(v) + suffix;
        if (v >= target) clearInterval(iv);
      }, 28);
    }
  });
});

/* ══════════════════════════════════
   PROJECT CARDS
══════════════════════════════════ */
gsap.utils.toArray('.proj-card').forEach((card, i) => {
  gsap.from(card, {
    y: 60, opacity: 0, duration: .8, ease: 'power3.out',
    delay: (i % 3) * .1,
    scrollTrigger: { trigger: card, start: 'top 82%', once: true }
  });
});
document.querySelectorAll('.proj-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - .5;
    const y = (e.clientY - r.top)  / r.height - .5;
    card.style.transform = `perspective(700px) rotateY(${x*10}deg) rotateX(${-y*10}deg) scale(1.02)`;
    card.style.transition = 'transform .08s';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1), border-color .3s';
  });
});

/* ══════════════════════════════════
   SKILLS BLUR REVEAL
══════════════════════════════════ */
document.querySelectorAll('.sk-card').forEach((card, i) => {
  ScrollTrigger.create({
    trigger: card, start: 'top 86%', once: true,
    onEnter() {
      setTimeout(() => {
        card.classList.add('in');
        card.querySelectorAll('.sk-fill').forEach(f => { f.style.width = f.dataset.w + '%'; });
      }, i * 90);
    }
  });
});

/* ══════════════════════════════════
   TIMELINE
══════════════════════════════════ */
ScrollTrigger.create({
  trigger: '.tl-items', start: 'top 65%', end: 'bottom 75%', scrub: true,
  onUpdate(self) {
    const prog = document.querySelector('.tl-prog');
    if (prog) prog.style.height = (self.progress * 100) + '%';
  }
});
document.querySelectorAll('.tl-item').forEach((item, i) => {
  ScrollTrigger.create({
    trigger: item, start: 'top 82%', once: true,
    onEnter() { setTimeout(() => item.classList.add('in'), i * 120); }
  });
});

/* ══════════════════════════════════
   CONTACT
══════════════════════════════════ */
gsap.from('.cta-big', {
  y: 50, opacity: 0, duration: 1, ease: 'power3.out',
  scrollTrigger: { trigger: '#contact', start: 'top 70%' }
});
gsap.from('.cta-links', {
  y: 30, opacity: 0, duration: .8, delay: .2, ease: 'power3.out',
  scrollTrigger: { trigger: '#contact', start: 'top 70%' }
});

/* ── EMAIL SCRAMBLE ── */
const emailEl = document.getElementById('email-scramble');
if (emailEl) {
  const real = emailEl.dataset.email;
  const chars = '!<>-_\\/[]{}—=+*^?#$@';
  emailEl.addEventListener('mouseenter', () => {
    let iter = 0;
    const iv = setInterval(() => {
      emailEl.textContent = real.split('').map((ch, j) => {
        if (j < iter) return ch;
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      if (iter >= real.length) clearInterval(iv);
      iter += .7;
    }, 28);
  });
}


