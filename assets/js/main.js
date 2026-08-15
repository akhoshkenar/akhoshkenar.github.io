(() => {
  // Reliable lightweight card video playback.
  // Every video has a real src in HTML, so playback does not depend on JS.
  // JS only pauses off-screen cards to save CPU/GPU.
  const videos = [...document.querySelectorAll('video.autoplay-card')];

  function tryPlay(v) {
    v.muted = true;
    v.defaultMuted = true;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  videos.forEach(v => {
    v.muted = true;
    v.defaultMuted = true;
  });

  if ('IntersectionObserver' in window && videos.length) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.05 && !document.hidden) {
          tryPlay(entry.target);
        } else {
          entry.target.pause();
        }
      }
    }, { rootMargin: '80px 0px', threshold: [0, 0.05, 0.2, 0.5] });
    videos.forEach(v => observer.observe(v));
  } else {
    videos.forEach(tryPlay);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      videos.forEach(v => v.pause());
    } else {
      videos.forEach(v => {
        const r = v.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) tryPlay(v);
      });
    }
  });

  // Dandelion: begins releasing seeds immediately, bends with the wind, and
  // is deliberately capped near 30 FPS / low DPR to avoid competing with video decoding.
  const canvas = document.getElementById('dandelionCanvas');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 0, H = 0, dpr = 1;
  let time = 0, cycleStart = 0;
  let targetWind = 0.75, wind = 0.75;
  let lastFrame = 0;
  const FRAME_MS = 1000 / 30;
  const seeds = [];
  const loose = [];
  const N = 76;

  function resetSeeds(now = 0) {
    seeds.length = 0;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (Math.random() - .5) * .22;
      const r = .52 + Math.random() * .48;
      seeds.push({
        a, r,
        // Some seeds release on the first rendered frames; the rest leave naturally.
        detach: Math.random() * 8.2,
        done: false
      });
    }
    cycleStart = now;
  }
  resetSeeds(0);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.35);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  window.addEventListener('pointermove', e => {
    targetWind = .32 + 1.45 * (e.clientX / Math.max(1, innerWidth));
  }, { passive: true });

  function drawSeed(x, y, rot, scale, alpha = .82) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = `rgba(240,255,255,${alpha})`;
    ctx.lineWidth = .9;
    ctx.beginPath();
    ctx.moveTo(-7 * scale, 0);
    ctx.lineTo(2 * scale, 0);
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(2 * scale, 0);
      ctx.lineTo(10 * scale, k * 2.8 * scale);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawDandelion(scale) {
    const baseX = W * .81;
    const baseY = H * .83;
    const sway = Math.sin(time * 1.25) * 5 + (wind - .75) * 16;
    const headX = W * .79 + sway;
    const headY = H * .39 + Math.sin(time * .95) * 2.5;
    const ctrlX = baseX + sway * .32 - 8;
    const ctrlY = H * .61;

    // Flexible curved stem.
    ctx.strokeStyle = 'rgba(183,231,230,.52)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, headX, headY + 18 * scale);
    ctx.stroke();

    const elapsed = time - cycleStart;
    for (const sd of seeds) {
      const rr = (52 + 30 * sd.r) * scale;
      const x = headX + Math.cos(sd.a) * rr;
      const y = headY + Math.sin(sd.a) * rr;

      if (!sd.done && elapsed >= sd.detach) {
        sd.done = true;
        if (loose.length < 120) {
          loose.push({
            x, y,
            vx: (.55 + Math.random() * .7) * wind,
            vy: -.22 + Math.random() * .52,
            rot: sd.a,
            life: 0,
            wobble: Math.random() * Math.PI * 2
          });
        }
      }
      if (sd.done) continue;

      ctx.strokeStyle = 'rgba(220,250,250,.60)';
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(headX, headY);
      ctx.lineTo(x, y);
      ctx.stroke();
      drawSeed(x, y, sd.a, scale, .82);
    }

    ctx.fillStyle = 'rgba(181,232,235,.82)';
    ctx.beginPath();
    ctx.arc(headX, headY, 5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Once a cycle is mostly finished, grow a fresh head for the next loop.
    const attached = seeds.reduce((n, s) => n + (!s.done ? 1 : 0), 0);
    if (elapsed > 17 && attached < 5) resetSeeds(time);
  }

  function animate(ts) {
    requestAnimationFrame(animate);
    if (ts - lastFrame < FRAME_MS) return;
    const dt = Math.min(.05, (ts - lastFrame) / 1000 || 1 / 30);
    lastFrame = ts;
    time += dt;
    wind += (targetWind - wind) * .06;

    ctx.clearRect(0, 0, W, H);
    const scale = Math.max(.72, Math.min(1.18, W / 1200));
    drawDandelion(scale);

    for (let i = loose.length - 1; i >= 0; i--) {
      const q = loose[i];
      q.life += dt;
      q.vx += .018 * wind * dt;
      q.x += q.vx * (dt * 60);
      q.y += (q.vy + Math.sin(time * 2.1 + q.wobble) * .13) * (dt * 60);
      q.rot += .45 * dt;
      const alpha = Math.max(0, .84 - q.life * .045);
      drawSeed(q.x, q.y, q.rot, scale, alpha);
      if (q.x > W + 45 || q.y < -45 || q.life > 19) loose.splice(i, 1);
    }
  }
  requestAnimationFrame(animate);
})();
