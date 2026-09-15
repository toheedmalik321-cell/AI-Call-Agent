/**
 * AI CallHub — Premium Interactions (8D layer)
 * Scroll progress beam, active-section nav highlight, 3D tilt, magnetic CTAs,
 * card spotlight, navbar scroll-shrink, cursor aura, hero parallax, starfield.
 * Respects prefers-reduced-motion. No-ops on touch devices where sensible.
 */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  /* ======================== SCROLL PROGRESS BEAM ======================== */

  var progressBar = document.createElement('div');
  progressBar.className = 'premium-scroll-progress';
  document.body.appendChild(progressBar);

  var ticking = false;
  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(function () {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateProgress();

  /* ======================== ACTIVE NAV SECTION (scroll spy) ======================== */

  var sectionLinks = {};
  var navLinks = document.querySelectorAll('.premium-nav-link');
  navLinks.forEach(function (link) {
    var href = (link.getAttribute('href') || '').replace(/^\//, '');
    if (href.charAt(0) === '#') sectionLinks[href.slice(1)] = link;
  });
  var spySections = document.querySelectorAll('section[id]');
  if (spySections.length && Object.keys(sectionLinks).length) {
    try {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          Object.keys(sectionLinks).forEach(function (id) {
            sectionLinks[id].classList.toggle('active', id === entry.target.id);
          });
        });
      }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
      spySections.forEach(function (s) { io.observe(s); });
    } catch (err) { /* older browsers: ignore */ }
  }

  /* ======================== COUNT-UP NUMBERS (dashboard mock) ======================== */

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    function formatNum(v) {
      return Number(v).toLocaleString('en-US');
    }
    function runCounter(el) {
      var target = parseInt(el.getAttribute('data-count') || '0', 10) || 0;
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      if (prefersReduced) {
        el.textContent = prefix + formatNum(target) + suffix;
        return;
      }
      var dur = 1400;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + formatNum(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    try {
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          countIO.unobserve(en.target);
          runCounter(en.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countIO.observe(el); });
    } catch (err) {
      counters.forEach(runCounter);
    }
  }

  /* ======================== TOUCH / REDUCED-MOTION GUARD ======================== */

  if (prefersReduced || isTouch) return;

  /* ======================== NAVBAR SCROLL-SHRINK ======================== */

  var navWrap = document.querySelector('.premium-nav-wrap');
  if (navWrap) {
    var scrollThreshold = 24;
    function onNavScroll() {
      navWrap.classList.toggle('scrolled', window.scrollY > scrollThreshold);
    }
    window.addEventListener('scroll', onNavScroll, { passive: true });
    onNavScroll();
  }

  /* ======================== CURSOR AURA GLOW ("8D" depth) ======================== */

  var cursorGlow = document.createElement('div');
  cursorGlow.className = 'premium-cursor-glow';
  document.body.appendChild(cursorGlow);

  var cursorTicks = false;
  function moveCursorGlow(x, y) {
    if (!cursorTicks) {
      requestAnimationFrame(function () {
        cursorGlow.style.left = x + 'px';
        cursorGlow.style.top = y + 'px';
        cursorTicks = false;
      });
      cursorTicks = true;
    }
  }
  document.addEventListener('mousemove', function (e) {
    moveCursorGlow(e.clientX, e.clientY);
    if (!cursorGlow.classList.contains('is-active')) {
      cursorGlow.classList.add('is-active');
    }
  });
  document.addEventListener('mouseleave', function () {
    cursorGlow.classList.remove('is-active');
  });

  /* ======================== HERO PARALLAX ON SCROLL ======================== */

  var parallaxEls = document.querySelectorAll('.premium-parallax');
  if (parallaxEls.length) {
    var parTick = false;
    function onParScroll() {
      if (parTick) return;
      requestAnimationFrame(function () {
        var vh = window.innerHeight;
        parallaxEls.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) return;
          var center = r.top + r.height / 2 - vh / 2;
          var offset = Math.max(-60, Math.min(60, center * -0.05));
          el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
        });
        parTick = false;
      });
      parTick = true;
    }
    window.addEventListener('scroll', onParScroll, { passive: true });
    onParScroll();
  }

  /* ======================== 3D TILT ======================== */

  var tiltTargets = document.querySelectorAll('.premium-tilt');
  tiltTargets.forEach(function (el) {
    var maxTilt = 10;
    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform =
        'perspective(600px) rotateY(' + (x * maxTilt) + 'deg) rotateX(' + (-y * maxTilt) + 'deg) scale(1.02)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)';
    });
  });

  /* ======================== MAGNETIC CTA ======================== */

  var magneticEls = document.querySelectorAll('.premium-magnetic');
  magneticEls.forEach(function (el) {
    var strength = 0.3;
    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = (e.clientX - cx) * strength;
      var dy = (e.clientY - cy) * strength;
      el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transform = 'translate(0, 0)';
    });
  });

  /* ======================== CARD SPOTLIGHT ======================== */

  var spotlightCards = document.querySelectorAll('.premium-spotlight-card');
  spotlightCards.forEach(function (card) {
    var glow = card.querySelector('.premium-spotlight-card__glow');
    if (!glow) return;
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      glow.style.left = (e.clientX - rect.left) + 'px';
      glow.style.top = (e.clientY - rect.top) + 'px';
    });
  });

  /* ======================== STARFIELD CANVAS ======================== */

  var starCanvas = document.querySelector('.premium-starfield');
  if (starCanvas && starCanvas.getContext) {
    var ctx = starCanvas.getContext('2d');
    var stars = [];
    var numStars = 60;
    var animFrame;

    function resize() {
      starCanvas.width = window.innerWidth;
      starCanvas.height = window.innerHeight;
    }

    function initStars() {
      stars = [];
      for (var i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * starCanvas.width,
          y: Math.random() * starCanvas.height * 0.7,
          r: Math.random() * 1.4 + 0.35,
          alpha: Math.random() * 0.55 + 0.12,
          speed: Math.random() * 0.01 + 0.004,
          phase: Math.random() * Math.PI * 2,
          hue: Math.random() > 0.6 ? '45,212,191' : '200,230,255'
        });
      }
    }

    function draw(time) {
      ctx.clearRect(0, 0, starCanvas.width, starCanvas.height);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var twinkle = Math.sin(time * s.speed + s.phase) * 0.35 + 0.65;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + s.hue + ',' + (s.alpha * twinkle) + ')';
        ctx.fill();
      }
      animFrame = requestAnimationFrame(draw);
    }

    resize();
    initStars();
    animFrame = requestAnimationFrame(draw);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        initStars();
      }, 200);
    });
  }

})();