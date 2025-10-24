// Consolidated runtime script for the site.
// Loaded with defer from index.html.

(() => {
  // util: set current year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // prefers-reduced-motion guard
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lenis smooth scroll (guarded)
  let lenis;
  try {
    if (!prefersReduced && window.Lenis) {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true, smoothTouch: false });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  } catch (e) {
    console.warn('Lenis init failed:', e);
  }

  // Theme toggle (role switch + aria)
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const html = document.documentElement;
    const setChecked = (el, checked) => el.setAttribute('aria-checked', checked ? 'true' : 'false');
    setChecked(themeToggle, html.getAttribute('data-theme') === 'dark');
    themeToggle.addEventListener('click', () => {
      const isDark = html.getAttribute('data-theme') === 'dark';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      setChecked(themeToggle, !isDark);
    });
  }

  // Audio toggle (microphone reactive)
  const audioToggle = document.getElementById('audioToggle');
  let audioOn = false;
  let analyser = null;
  let dataArray = null;
  if (audioToggle) {
    audioToggle.setAttribute('aria-checked', 'false');
    audioToggle.addEventListener('click', async () => {
      audioOn = !audioOn;
      audioToggle.setAttribute('aria-checked', audioOn ? 'true' : 'false');
      audioToggle.textContent = audioOn ? 'Audio: On' : 'Audio';
      if (audioOn && !analyser) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          dataArray = new Uint8Array(analyser.frequencyBinCount);
          source.connect(analyser);
        } catch (e) {
          audioOn = false;
          audioToggle.setAttribute('aria-checked', 'false');
          audioToggle.textContent = 'Audio';
          console.warn('Microphone access denied or failed:', e);
          // Provide visible feedback
          audioToggle.setAttribute('data-audio-error', 'true');
        }
      }
    });
  }

  // Custom cursor
  const cursorSpan = document.querySelector('.cursor span');
  let cursorX = 0, cursorY = 0, targetX = 0, targetY = 0;
  const enableCursor = !!cursorSpan && !prefersReduced && window.innerWidth > 640;
  if (enableCursor) {
    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    });
    function animateCursor() {
      cursorX += (targetX - cursorX) * 0.18;
      cursorY += (targetY - cursorY) * 0.18;
      cursorSpan.style.transform = `translate(${cursorX - 12}px, ${cursorY - 12}px)`;
      requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);
  } else {
    // hide the cursor element if not enabled
    const cursorEl = document.querySelector('.cursor');
    if (cursorEl) cursorEl.style.display = 'none';
  }

  // Canvas particles + audio reactive
  const canvas = document.getElementById('bg');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  let width, height, particles = [];
  function resize() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function createParticles(count = Math.max(40, Math.floor((width * height) / 20000))) {
    particles = Array.from({ length: count }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 0.6
    }));
  }
  createParticles();

  function drawParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const t = performance.now() / 1000;
    const hueShift = (Math.sin(t * 0.3) * 30 + 180);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      let amp = 1;
      if (audioOn && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        amp = 1 + ( (dataArray[10] || 0) + (dataArray[30] || 0) + (dataArray[60] || 0) ) / 255 * 0.6;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * amp, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hueShift}, 80%, 60%, 0.08)`;
      ctx.fill();
    }
    requestAnimationFrame(drawParticles);
  }
  if (!prefersReduced) drawParticles();

  // GSAP setup & animations
  try {
    const gsapLib = window.gsap;
    if (gsapLib) {
      gsapLib.registerPlugin(gsapLib.ScrollTrigger);

      // kinetic type
      gsapLib.set('.kinetic .line', { yPercent: 120, opacity: 0 });
      gsapLib.to('.kinetic .line', {
        yPercent: 0, opacity: 1, duration: 1.2, ease: 'power3.out', stagger: 0.12
      });
      gsapLib.from('.lede', { opacity: 0, y: 20, duration: 0.8, delay: 0.6 });
      gsapLib.from('.cta .btn', { opacity: 0, y: 18, duration: 0.8, delay: 0.8, stagger: 0.1 });

      // parallax layers
      gsapLib.to('.parallax.l1', {
        yPercent: 10, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
      });
      gsapLib.to('.parallax.l2', {
        yPercent: -12, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
      });
      gsapLib.to('.parallax.l3', {
        yPercent: 18, rotation: 8, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
      });

      // work cards reveal
      gsapLib.utils.toArray('.card').forEach((card, i) => {
        gsapLib.to(card, {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: i * 0.08,
          scrollTrigger: { trigger: card, start: 'top 80%', toggleActions: 'play none none reverse' }
        });
      });

      // stats count up
      gsapLib.utils.toArray('.num').forEach(el => {
        const target = +el.getAttribute('data-to');
        gsapLib.ScrollTrigger.create({
          trigger: el, start: 'top 80%',
          onEnter: () => animateCount(el, target, 1200)
        });
      });

      // reduce motion: disable scrolltrigger/animations if user prefers reduced motion
      if (prefersReduced && gsapLib.ScrollTrigger) {
        gsapLib.ScrollTrigger.getAll().forEach(st => st.disable());
        gsapLib.globalTimeline.pause();
      }
    }
  } catch (e) {
    console.warn('GSAP init failed:', e);
  }

  // Steps hover tilt
  document.querySelectorAll('.step').forEach(step => {
    step.addEventListener('mousemove', (e) => {
      const rect = step.getBoundingClientRect();
      const rx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ry = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      step.style.transform = `rotateY(${rx * 4}deg) rotateX(${-ry * 4}deg) translateZ(6px)`;
    });
    step.addEventListener('mouseleave', () => {
      step.style.transform = '';
    });
  });

  // count up helper
  function animateCount(el, target, duration) {
    const start = 0;
    const startTime = performance.now();
    function tick(now) {
      const p = Math.min((now - startTime) / duration, 1);
      el.textContent = Math.floor(start + (target - start) * p);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // contact button micro interactions
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (window.gsap) gsap.to(btn, { scale: 1.03, duration: 0.2 });
      else btn.style.transform = 'scale(1.03)';
    });
    btn.addEventListener('mouseleave', () => {
      if (window.gsap) gsap.to(btn, { scale: 1.0, duration: 0.2 });
      else btn.style.transform = '';
    });
  });

  // Performance: throttle particle creation on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => { createParticles(); }, 200);
  });
})();