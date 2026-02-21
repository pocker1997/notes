// ═══════════════════════════════════════════
// Dumka — Gravity particles
// Words float around, attracted to cursor
// ═══════════════════════════════════════════
(function () {
  'use strict';

  const canvas = document.getElementById('gravity');
  const ctx = canvas.getContext('2d');

  // ─── Config ───
  const WORDS = [
    'buy milk', 'call mom', 'project idea',
    'meeting at 3', 'read article', 'workout',
    'birthday gift', 'fix bug', 'send invoice',
    'book flight', 'dentist', 'weekly plan',
    'design review', 'grocery list', 'brainstorm',
    'reply to Alex', 'backup files', 'learn rust',
    'coffee beans', 'renew subscription',
    'pick up keys', 'water plants', 'finish report',
    'new blog post', 'update resume', 'date night',
    'team standup', 'refactor auth', 'check analytics'
  ];

  const PARTICLE_COUNT = 24;
  const PARTICLE_REPEL = 60;         // min distance between particles
  const PARTICLE_REPEL_FORCE = 0.02; // push strength between particles
  const ATTRACT_RADIUS = 180;      // px — cursor gravity range
  const ATTRACT_FORCE = 0.0004;    // gravity strength
  const DRIFT_SPEED = 0.15;        // ambient drift
  const FRICTION = 0.97;           // velocity damping
  const REPEL_RADIUS = 50;         // push away if too close
  const REPEL_FORCE = 0.003;
  const FONT_SIZE = 14;
  const MOBILE_FONT = 12;

  // ─── State ───
  let W, H, dpr;
  let mouse = { x: -9999, y: -9999, active: false };
  let particles = [];
  let raf;

  // ─── Particle class ───
  class Particle {
    constructor(word, i) {
      this.word = word;
      this.reset(i);
      this.vx = (Math.random() - 0.5) * DRIFT_SPEED;
      this.vy = (Math.random() - 0.5) * DRIFT_SPEED;
      this.baseAlpha = 0.12 + Math.random() * 0.1;
      this.alpha = 0; // fade in
      this.targetAlpha = this.baseAlpha;
      this.fontSize = window.innerWidth < 600 ? MOBILE_FONT : FONT_SIZE;
    }

    reset(i) {
      // Distribute around screen, away from center
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 0.2 + Math.random() * 0.3; // 20-50% from center
      this.x = W * 0.5 + Math.cos(angle) * W * dist;
      this.y = H * 0.5 + Math.sin(angle) * H * dist;
    }

    update() {
      // Ambient drift (gentle random wandering)
      this.vx += (Math.random() - 0.5) * 0.008;
      this.vy += (Math.random() - 0.5) * 0.008;

      if (mouse.active) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < ATTRACT_RADIUS) {
          const force = ATTRACT_FORCE * (1 - dist / ATTRACT_RADIUS);

          if (dist < REPEL_RADIUS) {
            // Too close — push away gently
            this.vx -= (dx / dist) * REPEL_FORCE;
            this.vy -= (dy / dist) * REPEL_FORCE;
          } else {
            // Attract
            this.vx += (dx / dist) * force * dist;
            this.vy += (dy / dist) * force * dist;
          }

          // Brighten near cursor
          this.targetAlpha = 0.25 + (1 - dist / ATTRACT_RADIUS) * 0.35;
        } else {
          this.targetAlpha = this.baseAlpha;
        }
      } else {
        this.targetAlpha = this.baseAlpha;
      }

      // Particle-to-particle repulsion (avoid clumping)
      for (let j = 0; j < particles.length; j++) {
        const other = particles[j];
        if (other === this) continue;
        const pdx = this.x - other.x;
        const pdy = this.y - other.y;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pDist < PARTICLE_REPEL && pDist > 0) {
          const push = PARTICLE_REPEL_FORCE * (1 - pDist / PARTICLE_REPEL);
          this.vx += (pdx / pDist) * push;
          this.vy += (pdy / pDist) * push;
        }
      }

      // Friction
      this.vx *= FRICTION;
      this.vy *= FRICTION;

      // Move
      this.x += this.vx;
      this.y += this.vy;

      // Soft bounds — nudge back if near edges
      const pad = 40;
      if (this.x < pad) this.vx += 0.02;
      if (this.x > W - pad) this.vx -= 0.02;
      if (this.y < pad) this.vy += 0.02;
      if (this.y > H - pad) this.vy -= 0.02;

      // Smooth alpha transition
      this.alpha += (this.targetAlpha - this.alpha) * 0.06;
    }

    draw() {
      ctx.globalAlpha = this.alpha;
      ctx.font = `500 ${this.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#111';
      ctx.fillText(this.word, this.x, this.y);
    }
  }

  // ─── Setup ───
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    resize();

    // Shuffle and pick words
    const shuffled = WORDS.sort(() => Math.random() - 0.5);
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle(shuffled[i % shuffled.length], i));
    }

    // Stagger fade-in
    particles.forEach((p, i) => {
      setTimeout(() => {
        p.targetAlpha = p.baseAlpha;
      }, 800 + i * 80);
    });
  }

  // ─── Loop ───
  function loop() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(loop);
  }

  // ─── Events ───
  function onPointerMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }

  function onPointerLeave() {
    mouse.active = false;
  }

  // Touch support
  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
      mouse.active = true;
    }
  }

  function onTouchEnd() {
    mouse.active = false;
  }

  // ─── Bind ───
  window.addEventListener('resize', () => {
    resize();
    // Redistribute particles on resize
    particles.forEach((p, i) => {
      // Clamp to new bounds
      p.x = Math.min(Math.max(p.x, 40), W - 40);
      p.y = Math.min(Math.max(p.y, 40), H - 40);
    });
  });

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd);

  // ─── Start ───
  init();
  loop();
})();
