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
          // Soft audible cue as a new section scrolls into view (opt-in only).
          if (e.target.classList.contains('section-head')) {
            try { soundEngine.enter(); } catch (_) {}
          }
          ro.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => ro.observe(el));
  }

  // --- synthesized audio engine (opt-in, no external assets) -------------
  // Two independent, user-gated channels — everything is generated live with
  // WebAudio, so there are zero audio files and nothing copyrighted.
  //
  //   1. "Sound"   — distinct subtle UI cues (nav-hover, section-enter,
  //                  button-press, download-thunk).
  //   2. "Ambient" — a low-volume wind + engine-idle soundscape bed.
  //
  // Rules honored: NO autoplay (an AudioContext is only created/resumed from a
  // real user gesture), both default OFF (also the default under
  // prefers-reduced-motion), and each choice is persisted independently in
  // localStorage. `soundEngine` is returned for use by other modules below.
  const soundEngine = (() => {
    const uiBtn = document.getElementById('sound-toggle');
    const ambBtn = document.getElementById('ambient-toggle');
    const AC = window.AudioContext || window.webkitAudioContext;
    const KEY_UI = 'skoffroad-sound';
    const KEY_AMB = 'skoffroad-ambient';

    const noop = { ui() {}, hover() {}, enter() {}, press() {}, thunk() {} };

    // If WebAudio isn't available, hide the dead controls and bail.
    if (!AC) {
      if (uiBtn) uiBtn.hidden = true;
      if (ambBtn) ambBtn.hidden = true;
      return noop;
    }

    let uiOn = false, ambOn = false;
    try { uiOn = localStorage.getItem(KEY_UI) === 'on'; } catch (_) {}
    try { ambOn = localStorage.getItem(KEY_AMB) === 'on'; } catch (_) {}

    let ctx = null, master = null, uiBus = null, ambBus = null;
    let ambNodes = null;
    let unlocked = false;

    const ensureCtx = () => {
      if (ctx) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9;
      master.connect(ctx.destination);
      // Per-channel sub-mixers so each toggle fades independently.
      uiBus = ctx.createGain(); uiBus.gain.value = 0.9; uiBus.connect(master);
      ambBus = ctx.createGain(); ambBus.gain.value = 0.0; ambBus.connect(master);
    };

    const fade = (param, to, dt = 0.4) => {
      const now = ctx.currentTime;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(to, now + dt);
    };

    // --- one-shot UI voices ---------------------------------------------
    const ping = (type, f0, f1, peak, dur, dest) => {
      if (!ctx || !unlocked) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || uiBus);
      o.start(t); o.stop(t + dur + 0.02);
    };

    // nav-hover: tiny, bright, very quiet tick
    const hover = () => { if (uiOn) ping('sine', 1180, 1320, 0.035, 0.06); };
    // section-enter: soft two-note rise
    const enter = () => {
      if (!uiOn) return;
      ping('triangle', 300, 440, 0.05, 0.16);
      if (ctx) setTimeout(() => ping('triangle', 460, 620, 0.045, 0.18), 70);
    };
    // button-press: the classic descending square blip
    const press = () => { if (uiOn) ping('square', 620, 240, 0.11, 0.14); };
    // download-thunk: low, chunky mechanical clunk
    const thunk = () => {
      if (!uiOn || !ctx || !unlocked) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(lp); lp.connect(g); g.connect(uiBus);
      o.start(t); o.stop(t + 0.24);
    };

    // --- ambient bed: engine idle + filtered wind ------------------------
    const makeNoise = () => {
      const len = 2 * ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      return src;
    };

    const startAmbient = () => {
      if (!ctx || ambNodes) return;
      // engine idle: two detuned saws -> lowpass, slow LFO wobble on pitch
      const eg = ctx.createGain(); eg.gain.value = 0.05;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 190; lp.Q.value = 5;
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 52;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 52.6;
      const plfo = ctx.createOscillator(); plfo.type = 'sine'; plfo.frequency.value = 0.55;
      const plfoGain = ctx.createGain(); plfoGain.gain.value = 7;
      plfo.connect(plfoGain); plfoGain.connect(o1.frequency);
      o1.connect(lp); o2.connect(lp); lp.connect(eg); eg.connect(ambBus);

      // wind bed: looping noise -> bandpass swept by a very slow LFO
      const wg = ctx.createGain(); wg.gain.value = 0.055;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
      const wlfo = ctx.createOscillator(); wlfo.type = 'sine'; wlfo.frequency.value = 0.08;
      const wlfoGain = ctx.createGain(); wlfoGain.gain.value = 260;
      wlfo.connect(wlfoGain); wlfoGain.connect(bp.frequency);
      const noise = makeNoise();
      noise.connect(bp); bp.connect(wg); wg.connect(ambBus);

      o1.start(); o2.start(); plfo.start(); wlfo.start(); noise.start();
      ambNodes = { o1, o2, plfo, wlfo, noise };
    };

    const stopAmbient = () => {
      if (!ambNodes) return;
      Object.values(ambNodes).forEach((n) => { try { n.stop(); } catch (_) {} });
      ambNodes = null;
    };

    // Called only from inside a user gesture — safe to create/resume audio.
    const unlock = () => {
      ensureCtx();
      if (ctx.state === 'suspended') ctx.resume();
      unlocked = true;
      if (ambOn) { startAmbient(); fade(ambBus.gain, 0.9, 0.8); }
    };

    const reflectUi = () => {
      if (!uiBtn) return;
      uiBtn.setAttribute('aria-pressed', uiOn ? 'true' : 'false');
      uiBtn.setAttribute('aria-label', uiOn ? 'Mute UI sounds' : 'Enable UI sounds');
      uiBtn.title = uiOn ? 'UI sounds on — click to mute' : 'UI sounds off — click to enable';
    };
    const reflectAmb = () => {
      if (!ambBtn) return;
      ambBtn.setAttribute('aria-pressed', ambOn ? 'true' : 'false');
      ambBtn.setAttribute('aria-label', ambOn ? 'Stop ambient soundscape' : 'Play ambient soundscape');
      ambBtn.title = ambOn ? 'Ambient bed on — click to stop' : 'Ambient bed off — click to play';
    };
    reflectUi(); reflectAmb();

    // If a stored choice is "on", resume audio on the first real gesture.
    // This is NOT autoplay — nothing is audible until the user interacts.
    if (uiOn || ambOn) {
      const kick = () => {
        unlock();
        window.removeEventListener('pointerdown', kick);
        window.removeEventListener('keydown', kick);
      };
      window.addEventListener('pointerdown', kick, { once: true });
      window.addEventListener('keydown', kick, { once: true });
    }

    if (uiBtn) uiBtn.addEventListener('click', () => {
      uiOn = !uiOn;
      try { localStorage.setItem(KEY_UI, uiOn ? 'on' : 'off'); } catch (_) {}
      reflectUi();
      if (uiOn) { unlock(); press(); }
    });

    if (ambBtn) ambBtn.addEventListener('click', () => {
      ambOn = !ambOn;
      try { localStorage.setItem(KEY_AMB, ambOn ? 'on' : 'off'); } catch (_) {}
      reflectAmb();
      if (ambOn) { unlock(); startAmbient(); fade(ambBus.gain, 0.9, 0.8); }
      else if (ctx) { fade(ambBus.gain, 0, 0.5); setTimeout(stopAmbient, 600); }
    });

    // --- wire UI cues to real interactions (only audible when uiOn) ------
    let lastHover = 0;
    document.addEventListener('pointerover', (e) => {
      if (!uiOn) return;
      const el = e.target.closest('.nav-links a, .footer-links a, .nav-cta');
      if (!el) return;
      const now = performance.now();
      if (now - lastHover < 55) return;   // debounce rapid glides
      lastHover = now; hover();
    }, true);

    document.addEventListener('click', (e) => {
      if (!uiOn) return;
      if (e.target.closest('.download-card')) { thunk(); return; }
      const el = e.target.closest('a.btn, .community-card, .nav-cta, .back-to-top');
      if (el) press();
    }, true);

    return { hover, enter, press, thunk, ui: () => uiOn };
  })();

  // --- back-to-top button -----------------------------------------------
  (() => {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;
    let ticking = false;
    const update = () => {
      btn.classList.toggle('is-visible', window.scrollY > 600);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
    btn.addEventListener('click', () => {
      const behavior = reduced ? 'auto' : 'smooth';
      window.scrollTo({ top: 0, behavior });
      // move focus to the top of the page for keyboard users
      const main = document.getElementById('main');
      if (main) main.focus({ preventScroll: true });
    });
  })();

  // --- mobile nav (hamburger) -------------------------------------------
  (() => {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.getElementById('primary-nav');
    if (!toggle || !links) return;
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      links.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-locked', open);
    };
    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    // close on link tap or Escape
    links.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false); toggle.focus();
      }
    });
  })();

  // --- service worker: offline app-shell (progressive enhancement) ------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* SW is a nice-to-have; site works fine without it. */
      });
    });
  }

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
