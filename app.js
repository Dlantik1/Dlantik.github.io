(function () {
  'use strict';

  var canvas = document.getElementById('waves');
  if (canvas && window.FloatingWaves) {
    // rgb(#156c6a) — нежный неоновый акцент из ТЗ
    new window.FloatingWaves(canvas, { color: '21, 108, 106' });
  }

  var root = document.documentElement;
  var themeInput = document.getElementById('theme-input');
  var media = window.matchMedia('(prefers-color-scheme: light)');

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (themeInput) themeInput.checked = theme === 'dark';
    if (persist) {
      try { localStorage.setItem('theme', theme); } catch (e) {}
    }
  }

  applyTheme(root.getAttribute('data-theme') || 'dark', false);

  if (themeInput) {
    themeInput.addEventListener('change', function () {
      applyTheme(themeInput.checked ? 'dark' : 'light', true);
    });
  }

  media.addEventListener('change', function (e) {
    var hasManual = false;
    try { hasManual = !!localStorage.getItem('theme'); } catch (err) {}
    if (!hasManual) applyTheme(e.matches ? 'light' : 'dark', false);
  });

  function scrambleText(el, finalText, opts) {
    opts = opts || {};
    var glyphs = opts.glyphs || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\/[]{}—=+*^?#';
    var frameRate = opts.frameRate || 28;
    var lockStep = opts.lockStep || 3; 
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      el.textContent = finalText;
      return;
    }

    var frame = 0;
    var chars = finalText.split('');
    var revealed = 0;

    var timer = setInterval(function () {
      frame++;
      if (frame % lockStep === 0 && revealed < chars.length) {
        revealed++;
      }

      var out = '';
      for (var i = 0; i < chars.length; i++) {
        if (i < revealed) {
          out += chars[i];
        } else if (chars[i] === ' ') {
          out += ' ';
        } else {
          out += glyphs[(Math.random() * glyphs.length) | 0];
        }
      }
      el.textContent = out;

      if (revealed >= chars.length) {
        el.textContent = finalText;
        clearInterval(timer);
      }
    }, frameRate);
  }

  var handle = document.getElementById('handle');
  if (handle) {
    var span = handle.querySelector('span');
    var text = handle.getAttribute('data-text') || handle.textContent.trim();
    if (span) {
      requestAnimationFrame(function () {
        scrambleText(span, text);
      });
    }
  }

  var social = document.querySelector('.social');
  var ring = document.getElementById('social-ring');

  if (social && ring && window.matchMedia('(hover: hover)').matches) {
    var items = social.querySelectorAll('li');

    function moveRingTo(el) {
      var containerRect = social.getBoundingClientRect();
      var rect = el.getBoundingClientRect();
      ring.style.setProperty('--w', rect.width + 'px');
      ring.style.setProperty('--h', rect.height + 'px');
      ring.style.setProperty('--x', (rect.left - containerRect.left) + 'px');
      ring.style.setProperty('--y', (rect.top - containerRect.top) + 'px');
      ring.classList.add('is-visible');
    }

    items.forEach(function (item) {
      item.addEventListener('mouseenter', function () { moveRingTo(item); });
    });

    social.addEventListener('mouseleave', function () {
      ring.classList.remove('is-visible');
    });
  }

  var toast = document.getElementById('toast');
  var toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 1800);
  }

  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-copy');
      var label = btn.querySelector('.copy-label');
      var defaultLabel = btn.getAttribute('data-default') || (label ? label.textContent : '');

      function done(ok) {
        if (label) label.textContent = ok ? 'Скопировано' : 'Не вышло';
        showToast(ok ? (value + ' — скопировано') : 'Не удалось скопировать');
        setTimeout(function () {
          if (label) label.textContent = defaultLabel;
        }, 1500);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(
          function () { done(true); },
          function () { done(false); }
        );
      } else {
        try {
          var tmp = document.createElement('textarea');
          tmp.value = value;
          tmp.style.position = 'fixed';
          tmp.style.opacity = '0';
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          document.body.removeChild(tmp);
          done(true);
        } catch (e) {
          done(false);
        }
      }
    });
  });

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
