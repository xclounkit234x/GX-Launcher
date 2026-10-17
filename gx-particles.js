
/**
 * GX particles — theme-synced, high-visibility glow field
 * Requires CSS vars: --accent, --accent-hi, --bg (optional)
 * Usage: <script src="gx-particles.js" defer></script>
 *        GXParticles.start() on DOMContentLoaded
 *        GXParticles.refresh() after theme change
 */
(function (global) {
  "use strict";

  var CFG = {
    count: 110,
    maxSize: 2.8,
    minSize: 0.7,
    speed: 0.4,
    linkDist: 130,
    linkOpacity: 0.35,
    glowMul: 8,
    glowAlpha: 0.7,
    twinkle: true
  };

  var canvas, ctx, particles = [], raf = 0, w = 0, h = 0, running = false;
  var accent = { r: 204, g: 0, b: 0 };
  var accentHi = { r: 255, g: 34, b: 34 };
  var bg = { r: 10, g: 10, b: 10 };

  function parseColor(str, fallback) {
    str = String(str || "").trim();
    if (!str) return fallback;
    if (str.charAt(0) === "#") {
      var hex = str.slice(1);
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      var n = parseInt(hex, 16);
      if (isNaN(n)) return fallback;
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    var m = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return fallback;
  }

  function css(name, fb) {
    try {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
    } catch (e) {
      return fb;
    }
  }

  function syncTheme() {
    accent = parseColor(css("--accent", "#cc0000"), { r: 204, g: 0, b: 0 });
    accentHi = parseColor(css("--accent-hi", "#ff2222"), { r: 255, g: 34, b: 34 });
    bg = parseColor(css("--bg", "#0a0a0a"), { r: 10, g: 10, b: 10 });
  }

  function Particle() {
    this.reset(true);
  }
  Particle.prototype.reset = function (full) {
    this.x = Math.random() * w;
    this.y = full ? Math.random() * h : h + 12;
    this.z = 0.45 + Math.random() * 0.55;
    this.r = CFG.minSize + Math.random() * (CFG.maxSize - CFG.minSize);
    this.vx = (Math.random() - 0.5) * CFG.speed * this.z;
    this.vy = -(0.12 + Math.random() * CFG.speed) * this.z;
    this.phase = Math.random() * Math.PI * 2;
    this.spin = 0.012 + Math.random() * 0.025;
  };
  Particle.prototype.step = function () {
    this.x += this.vx;
    this.y += this.vy;
    this.phase += this.spin;
    if (this.y < -30 || this.x < -50 || this.x > w + 50) this.reset(false);
  };

  function ensure() {
    if (canvas && canvas.parentNode) return;
    canvas = document.getElementById("gx-particles");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "gx-particles";
      canvas.setAttribute("aria-hidden", "true");
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    ctx = canvas.getContext("2d", { alpha: true });
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block;";
    var shell = document.querySelector(".launcher, .n3xn-shell, .macvg-shell, main, .app");
    if (shell) {
      var pos = getComputedStyle(shell).position;
      if (pos === "static") shell.style.position = "relative";
      if (!shell.style.zIndex) shell.style.zIndex = "1";
    }
  }

  function resize() {
    w = window.innerWidth || 1;
    h = window.innerHeight || 1;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rebuild() {
    particles = [];
    for (var i = 0; i < CFG.count; i++) particles.push(new Particle());
  }

  function draw() {
    if (!ctx) return;
    // full clear each frame (reliable visibility)
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    var i, j, a, b, dx, dy, d, alpha, tw, radius, g;

    // links
    ctx.lineWidth = 1;
    for (i = 0; i < particles.length; i++) {
      a = particles[i];
      for (j = i + 1; j < particles.length; j++) {
        b = particles[j];
        dx = a.x - b.x;
        dy = a.y - b.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < CFG.linkDist) {
          alpha = (1 - d / CFG.linkDist) * CFG.linkOpacity * Math.min(a.z, b.z);
          ctx.strokeStyle =
            "rgba(" + accent.r + "," + accent.g + "," + accent.b + "," + alpha + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // dots + glow
    for (i = 0; i < particles.length; i++) {
      a = particles[i];
      a.step();
      tw = CFG.twinkle ? 0.55 + 0.45 * Math.sin(a.phase) : 1;
      radius = a.r * a.z;

      ctx.globalCompositeOperation = "lighter";
      g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, radius * CFG.glowMul);
      g.addColorStop(
        0,
        "rgba(" + accentHi.r + "," + accentHi.g + "," + accentHi.b + "," + CFG.glowAlpha * tw + ")"
      );
      g.addColorStop(
        0.4,
        "rgba(" + accent.r + "," + accent.g + "," + accent.b + "," + 0.2 * tw + ")"
      );
      g.addColorStop(1, "rgba(" + accent.r + "," + accent.g + "," + accent.b + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(a.x, a.y, radius * CFG.glowMul, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle =
        "rgba(" + accentHi.r + "," + accentHi.g + "," + accentHi.b + "," + (0.8 + 0.2 * tw) + ")";
      ctx.beginPath();
      ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  function start() {
    ensure();
    syncTheme();
    resize();
    rebuild();
    if (!running) {
      running = true;
      window.addEventListener("resize", function () {
        resize();
      });
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }

  function refresh() {
    syncTheme();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function configure(opts) {
    for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) CFG[k] = opts[k];
  }

  global.GXParticles = { start: start, refresh: refresh, stop: stop, configure: configure, CFG: CFG };
})(window);
