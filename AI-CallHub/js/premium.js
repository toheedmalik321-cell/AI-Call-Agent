/**
 * AI CallHub — Premium Interactions
 * 3D tilt, magnetic CTAs, card spotlight, navbar scroll-shrink, starfield.
 * Respects prefers-reduced-motion. No-ops on touch devices.
 */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  if (prefersReduced || isTouch) return;

  /* ======================== NAVBAR SCROLL-SHRINK ======================== */

  var navWrap = document.querySelector('.premium-nav-wrap');
  if (navWrap) {
    var scrollThreshold = 24;
    var ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          navWrap.classList.toggle('scrolled', window.scrollY > scrollThreshold);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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
    var numStars = 50;
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
          y: Math.random() * starCanvas.height * 0.65,
          r: Math.random() * 1.2 + 0.3,
          alpha: Math.random() * 0.5 + 0.1,
          speed: Math.random() * 0.008 + 0.003,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function draw(time) {
      ctx.clearRect(0, 0, starCanvas.width, starCanvas.height);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var twinkle = Math.sin(time * s.speed + s.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 230, 255, ' + (s.alpha * twinkle) + ')';
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
