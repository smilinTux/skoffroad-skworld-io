// skoffroad — site interactions
// counter animation + subtle parallax on hero mountains

(() => {
  // --- counters ----------------------------------------------------------
  const fmt = (n) => n.toLocaleString('en-US');
  const animateCounter = (el) => {
    const targetText = el.textContent.trim();
    const target = parseInt(el.dataset.target ?? targetText.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(target) || target === 0) return;

    const duration = 1400;
    const start = performance.now();
    const prefix = targetText.match(/^[^\d]*/)?.[0] ?? '';
    const suffix = targetText.match(/[^\d]*$/)?.[0] ?? '';

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(target * eased);
      el.textContent = `${prefix}${fmt(v)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const counters = document.querySelectorAll('.stat-number[data-target]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => io.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  // --- hero parallax -----------------------------------------------------
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    const far = document.querySelector('.hero-mountains:not(.hero-mountains-near)');
    const near = document.querySelector('.hero-mountains-near');
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (far)  far.style.transform  = `translateY(${y * 0.15}px)`;
        if (near) near.style.transform = `translateY(${y * 0.35}px)`;
        ticking = false;
      });
    }, { passive: true });
  }

  // --- auto-fetch the latest release tag from GitHub and stamp it into
  //     the eyebrow line. Falls back silently if the API is rate-limited
  //     or offline, so the static copy stays sane.
  fetch('https://api.github.com/repos/smilinTux/skoffroad/releases/latest', { cache: 'force-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !j.tag_name) return;
      var el = document.getElementById('hero-eyebrow');
      if (!el) return;
      el.innerHTML = j.tag_name + ' · S&amp;K OFFROAD · plays in your browser · multiplayer · GPL-3.0';
    })
    .catch(function () { /* offline / rate-limited — keep static copy */ });

  // --- scroll reveal -----------------------------------------------------
  // Progressive enhancement: only runs when motion is allowed AND
  // IntersectionObserver exists. Otherwise content stays fully visible.
  if (!reduced && 'IntersectionObserver' in window) {
    const revealSel = '.section-head, .feature, .trail-card, .rig-card, ' +
      '.community-card, .stack-card, .download-card, .play-instant-card, .code-block, .controls';
    const targets = Array.from(document.querySelectorAll(revealSel));
    const groups = {};
    targets.forEach((el) => {
      el.classList.add('reveal');
      const key = el.parentElement ? el.parentElement.className : 'x';
      groups[key] = (groups[key] ?? 0);
      // small stagger for siblings in the same grid
      el.style.transitionDelay = Math.min(groups[key] * 60, 300) + 'ms';
      groups[key]++;
    });
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          ro.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => ro.observe(el));
  }

  // --- ambient / UI sound (synthesized, opt-in, no external assets) ------
  // Rules honored: no autoplay (AudioContext only created/resumed on a real
  // user gesture), default muted, prefers-reduced-motion => default muted,
  // choice persisted in localStorage.
  (() => {
    const btn = document.getElementById('sound-toggle');
    if (!btn) return;
    const KEY = 'skoffroad-sound';
    const AC = window.AudioContext || window.webkitAudioContext;

    let ctx = null, master = null, ambient = null;
    let enabled = false;   // is the user's choice "on"?
    let unlocked = false;  // has a gesture created/resumed the context?

    // stored preference — default OFF (also the default under reduced-motion)
    let pref = null;
    try { pref = localStorage.getItem(KEY); } catch (_) {}
    enabled = pref === 'on';

    const ensureCtx = () => {
      if (ctx || !AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    };

    const fadeMaster = (to, dt = 0.4) => {
      if (!ctx || !master) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(to, now + dt);
    };

    const startAmbient = () => {
      if (!ctx || ambient) return;
      // low, breathing engine idle: two detuned saws -> lowpass, slow LFO wobble
      const g = ctx.createGain(); g.gain.value = 0.05;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 190; lp.Q.value = 5;
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 52;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 52.6;
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.55;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 7;
      lfo.connect(lfoGain); lfoGain.connect(o1.frequency);
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
      o1.start(); o2.start(); lfo.start();
      ambient = { o1, o2, lfo };
    };

    const stopAmbient = () => {
      if (!ambient) return;
      try { ambient.o1.stop(); ambient.o2.stop(); ambient.lfo.stop(); } catch (_) {}
      ambient = null;
    };

    const blip = () => {
      if (!enabled || !ctx || !unlocked) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(620, t);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.15);
    };

    // Called from within a user gesture — safe to create/resume the context.
    const unlock = () => {
      ensureCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      unlocked = true;
      if (enabled) { startAmbient(); fadeMaster(0.55); }
    };

    const reflect = () => {
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      btn.setAttribute('aria-label', enabled ? 'Mute ambient sound' : 'Enable ambient sound');
      btn.title = enabled ? 'Sound is on — click to mute' : 'Sound is off — click to enable';
    };

    reflect();

    // If audio isn't supported, hide the control rather than dangle a dead button.
    if (!AC) { btn.hidden = true; return; }

    // If the stored choice is "on", resume audio on the first real gesture
    // (this is NOT autoplay — nothing sounds until the user interacts).
    if (enabled) {
      const kick = () => {
        unlock();
        window.removeEventListener('pointerdown', kick);
        window.removeEventListener('keydown', kick);
      };
      window.addEventListener('pointerdown', kick, { once: true });
      window.addEventListener('keydown', kick, { once: true });
    }

    btn.addEventListener('click', () => {
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (_) {}
      reflect();
      if (enabled) { unlock(); blip(); }
      else { fadeMaster(0, 0.3); stopAmbient(); }
    });

    // UI click blips on primary controls (only audible when enabled).
    document.addEventListener('click', (e) => {
      if (!enabled) return;
      const el = e.target.closest('a.btn, .download-card, .community-card, .nav-cta');
      if (el && el !== btn) blip();
    }, true);
  })();

  // --- konami code: rainbow tires ---------------------------------------
  const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let buf = [];
  document.addEventListener('keydown', (e) => {
    buf.push(e.key);
    if (buf.length > konami.length) buf.shift();
    if (buf.join(',') === konami.join(',')) {
      document.body.classList.toggle('rainbow');
      buf = [];
    }
  });
})();
