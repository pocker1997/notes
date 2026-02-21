// ═══════════════════════════════════════════
// Dumka — Flashlight mode
// Blurred words revealed by cursor spotlight
// ═══════════════════════════════════════════
(function () {
  'use strict';

  const canvas = document.getElementById('words-canvas');
  const ctx = canvas.getContext('2d');
  const lightCircle = document.getElementById('light-circle');
  const svgMask = document.querySelector('.flashlight-mask');

  // ─── Words (same as gravity version) ───
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
  const FONT_SIZE = 14;
  const MOBILE_FONT = 12;
  const LIGHT_RADIUS = 80; // px — diameter of light circle

  let W, H, dpr;
  let mouse = { x: -9999, y: -9999 };
  let particles = [];

  // ─── Particle class (static positions) ───
  class Particle {
    constructor(word, i) {
      this.word = word;
      this.fontSize = window.innerWidth < 600 ? MOBILE_FONT : FONT_SIZE;
      this.setRandomPos(i);
      this.inLight = false;
    }

    setRandomPos(i) {
      // Random position across screen
      this.x = Math.random() * W;
      this.y = Math.random() * H;
    }

    update(mouseX, mouseY) {
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside light circle
      this.inLight = dist < LIGHT_RADIUS;
    }

    draw(alpha) {
      ctx.globalAlpha = alpha;
      ctx.font = `500 ${this.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#111';
      ctx.textBaseline = 'middle';
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

    const shuffled = WORDS.sort(() => Math.random() - 0.5);
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle(shuffled[i % shuffled.length], i));
    }
  }

  // ─── Animation loop ───
  function loop() {
    ctx.clearRect(0, 0, W, H);

    // Update all particles
    particles.forEach(p => p.update(mouse.x, mouse.y));

    // Draw all words, but with opacity based on light
    particles.forEach(p => {
      // Inside light = opaque, outside = very faint
      const alpha = p.inLight ? 0.9 : 0.08;
      p.draw(alpha);
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }

  // ─── Events ───
  function onPointerMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    // Update light circle position (SVG)
    lightCircle.setAttribute('cx', (e.clientX / W).toFixed(4));
    lightCircle.setAttribute('cy', (e.clientY / H).toFixed(4));

    // Update cursor ring
    document.body.style.setProperty('--cursor-x', e.clientX + 'px');
    document.body.style.setProperty('--cursor-y', e.clientY + 'px');
    const ring = document.querySelector('body::before');
    if (ring) {
      // Manual update since we can't style ::before directly
    }
  }

  // Custom cursor update via JS (since we can't animate ::before)
  function updateCursorRing() {
    let ring = document.getElementById('cursor-ring');
    if (!ring) {
      ring = document.createElement('div');
      ring.id = 'cursor-ring';
      ring.style.cssText = `
        position: fixed;
        width: 120px;
        height: 120px;
        border: 2px solid rgba(239, 68, 68, 0.3);
        border-radius: 50%;
        pointer-events: none;
        z-index: 999;
        box-shadow: inset 0 0 30px rgba(239, 68, 68, 0.15);
        transform: translate(-50%, -50%);
        left: -9999px;
        top: -9999px;
        transition: none;
      `;
      document.body.appendChild(ring);
    }

    ring.style.left = mouse.x + 'px';
    ring.style.top = mouse.y + 'px';
  }

  window.addEventListener('pointermove', e => {
    onPointerMove(e);
    updateCursorRing();
  }, { passive: true });

  window.addEventListener('resize', () => {
    resize();
    particles.forEach(p => {
      p.x = Math.min(p.x, W);
      p.y = Math.min(p.y, H);
    });
  });

  // ─── Start ───
  init();
  updateCursorRing(); // Initial position
  loop();
})();
