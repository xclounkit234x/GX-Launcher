
/**
 * GX-Launcher — theme-synced glowing particles
 * Reads CSS variables set by applyTheme(). Default = blood-red on deep black.
 * Include on every page AFTER styles.css; call GXParticles.start() on DOM ready
 * and GXParticles.refresh() from applyTheme().
 */
(function (global) {
  "use strict";

  const CFG = {
    count: 85,
    maxSize: 3.2,
    minSize: 0.6,
    speed: 0.35,
    linkDist: 120,
    linkOpacity: 0.22,
    glowBlur: 12,
    glowStrength: 0.55,
    twinkle: true,
    mouseParallax: 0.02,
  };

  let canvas, ctx, particles = [], raf = 0, w = 0, h = 0;
  let mouse = { x: 0, y: 0 };
  let accent = "#cc0000";
  let accentHi = "#ff2222";
  let accentGlow = "rgba(180,0,0,0.18)";
  let bg = "#0a0a0a";
  let running = false;

  function cssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function syncTheme() {
    accent = cssVar("--accent", "#cc0000");
    accentHi = cssVar("--accent-hi", "#ff2222");
    accentGlow = cssVar("--accent-glow", "rgba(180,0,0,0.18)");
    bg = cssVar("--bg", "#0a0a0a");
  }

  function hexToRgb(hex) {
    hex = String(hex).replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const n = parseInt(hex, 16);
    if (Number.isNaN(n)) return { r: 204, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function Particle() {
    this.reset(true);
  }

  Particle.prototype.reset = function (randomY) {
    this.x = Math.random() * w;
    this.y = randomY ? Math.random() * h : h + 10;
    this.z = 0.4 + Math.random() * 0.6;
    this.r = CFG.minSize + Math.random() * (CFG.maxSize - CFG.minSize);
    this.vx = (Math.random() - 0.5) * CFG.speed * this.z;
    this.vy = -0.15 * this.z - Math.random() * CFG.speed * 0.5;
    this.phase = Math.random() * Math.PI * 2;
    this.spin = 0.01 + Math.random() * 0.03;
  };

  Particle.prototype.step = function () {
    this.x += this.vx + (mouse.x - w / 2) * CFG.mouseParallax * 0.001 * this.z;
    this.y += this.vy;
    this.phase += this.spin;
    if (this.y < -20 || this.x < -40 || this.x > w + 40) this.reset(false);
  };

  function ensureCanvas() {
    if (canvas && canvas.parentNode) return;
    canvas = document.getElementById("gx-particles");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "gx-particles";
      canvas.setAttribute("aria-hidden", "true");
      document.body.prepend(canvas);
    }
    ctx = canvas.getContext("2d", { alpha: true });
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "0",
      pointerEvents: "none",
    });
    // Keep launcher above particles
    const launcher = document.querySelector(".launcher");
    if (launcher && getComputedStyle(launcher).position === "static") {
      launcher.style.position = "relative";
      launcher.style.zIndex = "1";
    }
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rebuild() {
    particles = [];
    for (let i = 0; i < CFG.count; i++) particles.push(new Particle());
  }

  function draw() {
    if (!ctx) return;
    // soft fade trail for glow trails
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = bg.length === 7 ? bg + "e6" : "rgba(10,10,10,0.88)";
    // parse bg for fade
    const rgb = hexToRgb(bg.startsWith("#") ? bg : "#0a0a0a");
    ctx.fillStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.22)";
    ctx.fillRect(0, 0, w, h);

    const ac = hexToRgb(accent.startsWith("#") ? accent : "#cc0000");
    const hi = hexToRgb(accentHi.startsWith("#") ? accentHi : "#ff2222");

    // links
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CFG.linkDist) {
          const alpha = (1 - d / CFG.linkDist) * CFG.linkOpacity * Math.min(a.z, b.z);
          ctx.strokeStyle = "rgba(" + ac.r + "," + ac.g + "," + ac.b + "," + alpha + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // particles + glow
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.step();
      const tw = CFG.twinkle ? 0.55 + 0.45 * Math.sin(p.phase) : 1;
      const radius = p.r * p.z * (0.85 + 0.15 * tw);

      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * CFG.glowBlur * 0.35);
      g.addColorStop(0, "rgba(" + hi.r + "," + hi.g + "," + hi.b + "," + CFG.glowStrength * tw + ")");
      g.addColorStop(0.35, "rgba(" + ac.r + "," + ac.g + "," + ac.b + "," + 0.25 * tw + ")");
      g.addColorStop(1, "rgba(" + ac.r + "," + ac.g + "," + ac.b + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * CFG.glowBlur * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(" + hi.r + "," + hi.g + "," + hi.b + "," + (0.75 + 0.25 * tw) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  function onMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function start() {
    ensureCanvas();
    syncTheme();
    resize();
    rebuild();
    if (!running) {
      running = true;
      window.addEventListener("resize", () => {
        resize();
      });
      window.addEventListener("mousemove", onMove, { passive: true });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }
  }

  function refresh() {
    syncTheme();
    // clear to solid bg once so theme swap doesn't leave old color trails
    if (ctx) {
      const rgb = hexToRgb(bg.startsWith("#") ? bg : "#0a0a0a");
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
      ctx.fillRect(0, 0, w, h);
    }
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function configure(opts) {
    Object.assign(CFG, opts || {});
  }

  global.GXParticles = { start, refresh, stop, configure, CFG };
})(window);
