/**
 * AI CallHub — App Premium Interactions
 * Cursor aura, scroll progress for all non-landing pages.
 */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  // Scroll progress
  var bar = document.createElement('div');
  bar.className = 'app-scroll-progress';
  document.body.appendChild(bar);

  var ticking = false;
  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    bar.style.width = max > 0 ? (window.scrollY / max) * 100 + '%' : '0%';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () { updateProgress(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (!ticking) {
      requestAnimationFrame(function () { updateProgress(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  updateProgress();

  if (prefersReduced || isTouch) return;

  // Cursor aura
  var glow = document.createElement('div');
  glow.className = 'app-cursor-glow';
  document.body.appendChild(glow);

  var glowTick = false;
  document.addEventListener('mousemove', function (e) {
    if (!glowTick) {
      requestAnimationFrame(function () {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
        if (!glow.classList.contains('is-active')) glow.classList.add('is-active');
        glowTick = false;
      });
      glowTick = true;
    }
  });
  document.addEventListener('mouseleave', function () {
    glow.classList.remove('is-active');
  });

})();
