(function () {
  'use strict';

  function FloatingWaves(canvas, options) {
    options = options || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    this.color = options.color || '17, 108, 109';
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.pointer = { x: 0.5, targetX: 0.5, active: 0, targetActive: 0 };

    this.running = false;
    this.visible = true;
    this.tabHidden = document.hidden;
    this.time = 0;
    this.lastFrame = 0;

    // Слои: каждый со своей "личностью".
    this.layers = [
      { amplitude: 26, frequency: 0.9, phase: 0.0, speed: 0.018, baseline: 0.62, alpha: 0.30 },
      { amplitude: 34, frequency: 0.55, phase: 1.4, speed: 0.012, baseline: 0.70, alpha: 0.22 },
      { amplitude: 18, frequency: 1.35, phase: 3.1, speed: 0.026, baseline: 0.78, alpha: 0.16 },
      { amplitude: 42, frequency: 0.35, phase: 4.6, speed: 0.008, baseline: 0.86, alpha: 0.10 }
    ];

    this._onResize = this._onResize.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._tick = this._tick.bind(this);

    this._init();
  }

  FloatingWaves.prototype._init = function () {
    this._resize();

    if ('ResizeObserver' in window) {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(this.canvas.parentElement || document.body);
    } else {
      window.addEventListener('resize', this._onResize);
    }

    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver(
        function (entries) {
          this.visible = entries[0] && entries[0].isIntersecting;
          this._syncRunning();
        }.bind(this),
        { threshold: 0 }
      );
      this._io.observe(this.canvas);
    }

    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointerleave', this._onPointerLeave, { passive: true });

    this._syncRunning();
  };

  FloatingWaves.prototype._onVisibilityChange = function () {
    this.tabHidden = document.hidden;
    this._syncRunning();
  };

  FloatingWaves.prototype._syncRunning = function () {
    var shouldRun = this.visible && !this.tabHidden;
    if (shouldRun && !this.running) {
      this.running = true;
      this.lastFrame = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    } else if (!shouldRun && this.running) {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
    }
  };

  FloatingWaves.prototype._onResize = function () {
    this._resize();
  };

  FloatingWaves.prototype._resize = function () {
    var parent = this.canvas.parentElement || document.documentElement;
    var rect = { width: window.innerWidth, height: window.innerHeight };
    if (parent && parent !== document.documentElement && parent.getBoundingClientRect) {
      var r = parent.getBoundingClientRect();
      if (r.width && r.height) rect = r;
    }
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (!this.running) this._renderFrame(0);
  };

  FloatingWaves.prototype._onPointerMove = function (e) {
    this.pointer.targetX = e.clientX / Math.max(1, window.innerWidth);
    this.pointer.targetActive = 1;
  };

  FloatingWaves.prototype._onPointerLeave = function () {
    this.pointer.targetActive = 0;
  };

  FloatingWaves.prototype._tick = function (now) {
    if (!this.running) return;
    var dt = Math.min(now - this.lastFrame, 48); // защита от скачков при фризах
    this.lastFrame = now;

    var speedScale = this.reducedMotion ? 0.15 : 1;
    this.time += dt * 0.06 * speedScale;

    // Плавное сглаживание позиции курсора и его "активности".
    this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.06;
    this.pointer.active += (this.pointer.targetActive - this.pointer.active) * 0.05;

    this._renderFrame(this.time);
    this._raf = requestAnimationFrame(this._tick);
  };

  FloatingWaves.prototype._renderFrame = function (t) {
    var ctx = this.ctx;
    var w = this.width;
    var h = this.height;
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < this.layers.length; i++) {
      this._drawLayer(ctx, this.layers[i], t, w, h);
    }
  };

  FloatingWaves.prototype._drawLayer = function (ctx, layer, t, w, h) {
    var baseline = h * layer.baseline;
    var segments = 10; // количество опорных точек по ширине — достаточно для гладкой кривой
    var step = w / segments;

    // Локальный "бугор" рядом с курсором.
    var pointerX = this.pointer.x * w;
    var pointerBoost = this.pointer.active * 16;

    var points = [];
    for (var i = 0; i <= segments; i++) {
      var x = i * step;
      var angle = x * 0.006 * layer.frequency + t * layer.speed + layer.phase;
      var y = baseline + Math.sin(angle) * layer.amplitude;

      // Влияние курсора: гладкий спад по расстоянию (кривая Гаусса).
      var dist = (x - pointerX) / (w * 0.28);
      var influence = Math.exp(-dist * dist);
      y -= pointerBoost * influence;

      points.push({ x: x, y: y });
    }

    ctx.beginPath();
    ctx.moveTo(0, h + 4);
    ctx.lineTo(points[0].x, points[0].y);

    for (var j = 0; j < points.length - 1; j++) {
      var p0 = points[j];
      var p1 = points[j + 1];
      var cx = (p0.x + p1.x) / 2;
      var cy = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, cx, cy);
    }
    var last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.lineTo(w, h + 4);
    ctx.closePath();

    ctx.fillStyle = 'rgba(' + this.color + ', ' + layer.alpha + ')';
    ctx.fill();
  };

  FloatingWaves.prototype.destroy = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerleave', this._onPointerLeave);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  };

  window.FloatingWaves = FloatingWaves;
})();
