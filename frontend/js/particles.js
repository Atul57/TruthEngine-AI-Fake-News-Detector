/**
 * TRUTH ENGINE — PARTICLE SYSTEM
 * Animated particle network background effect
 */

(function () {
  "use strict";

  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const MAX_DIST = 130;
  const PARTICLE_COUNT = 70;

  let particles = [];
  let width, height;
  let animFrame;

  // ── Resize ──────────────────────────────────────────
  function resize() {
    width  = canvas.width  = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  // ── Particle factory ────────────────────────────────
  function createParticle() {
    return {
      x:  Math.random() * width,
      y:  Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  Math.random() * 1.5 + 0.5,
      op: Math.random() * 0.45 + 0.1,
      // colour variant: mostly teal, some red, some purple
      hue: Math.random() < 0.65 ? "teal" : Math.random() < 0.6 ? "red" : "purple",
    };
  }

  function particleColor(p, alpha) {
    if (p.hue === "red")    return `rgba(230,57,70,${alpha})`;
    if (p.hue === "purple") return `rgba(157,78,221,${alpha})`;
    return `rgba(0,245,212,${alpha})`;           // teal default
  }

  // ── Init ────────────────────────────────────────────
  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
  }

  // ── Draw ────────────────────────────────────────────
  function drawParticle(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = particleColor(p, p.op);
    ctx.fill();
  }

  function drawConnection(a, b, dist) {
    const alpha = (1 - dist / MAX_DIST) * 0.12;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = particleColor(a, alpha);
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // ── Update ──────────────────────────────────────────
  function updateParticle(p) {
    p.x += p.vx;
    p.y += p.vy;

    // Wrap around edges
    if (p.x < 0)      p.x = width;
    if (p.x > width)  p.x = 0;
    if (p.y < 0)      p.y = height;
    if (p.y > height) p.y = 0;
  }

  // ── Main loop ───────────────────────────────────────
  function loop() {
    ctx.clearRect(0, 0, width, height);

    // Update positions
    particles.forEach(updateParticle);

    // Draw connections (O(n²) but n=70 is fine)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) drawConnection(particles[i], particles[j], dist);
      }
    }

    // Draw particles on top
    particles.forEach(drawParticle);

    animFrame = requestAnimationFrame(loop);
  }

  // ── Mouse parallax ──────────────────────────────────
  let mouse = { x: -999, y: -999 };

  document.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    // Gently repel nearby particles
    particles.forEach((p) => {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < 80 && d > 0) {
        const force = (80 - d) / 80 * 0.6;
        p.vx += (dx / d) * force * 0.05;
        p.vy += (dy / d) * force * 0.05;
        // Clamp velocity
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1.5) { p.vx = (p.vx / speed) * 1.5; p.vy = (p.vy / speed) * 1.5; }
      }
    });
  });

  // ── Resize observer ─────────────────────────────────
  window.addEventListener("resize", () => {
    cancelAnimationFrame(animFrame);
    resize();
    loop();
  });

  // ── Boot ────────────────────────────────────────────
  init();
  loop();

  // Export pause/resume for page-visibility API
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrame);
    } else {
      loop();
    }
  });
})();
