// Modern Pong with a refreshed UI: glassy HUD, glow, pause/reset controls, DPI-aware rendering.

const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d', { alpha: false });

// DOM elements for modern HUD
const $playerScore = document.getElementById('playerScore');
const $cpuScore = document.getElementById('cpuScore');
const $btnToggle = document.getElementById('btnToggle');
const $btnReset = document.getElementById('btnReset');

// Logical game size comes from canvas attributes (keeps physics consistent).
const BASE_WIDTH = canvas.width;
const BASE_HEIGHT = canvas.height;

// HiDPI rendering (keep CSS size responsive, only upscale drawing buffer)
function setupHiDPI() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(BASE_WIDTH * dpr);
  canvas.height = Math.floor(BASE_HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 unit in code == 1 CSS px
}
setupHiDPI();
window.addEventListener('resize', setupHiDPI);

// Config
const CONFIG = {
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  paddle: { w: 12, h: 100, speed: 420 },
  ball: { r: 10, speed: 380, speedUp: 1.045, maxBounceAngle: Math.PI / 4, maxSpeed: 980 },
  ai: { maxSpeed: 360 },
  net: { segH: 16, gap: 14, w: 4, color: 'rgba(255,255,255,0.25)' },
  glow: {
    ball: 'rgba(124, 92, 255, 0.7)',
    paddle: 'rgba(34, 211, 238, 0.6)',
  },
};

class Paddle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = CONFIG.paddle.w;
    this.h = CONFIG.paddle.h;
  }
  centerY() { return this.y + this.h / 2; }
  clamp(h) {
    if (this.y < 0) this.y = 0;
    if (this.y + this.h > h) this.y = h - this.h;
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#e9f1ff';
    ctx.shadowColor = CONFIG.glow.paddle;
    ctx.shadowBlur = 20;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.restore();
  }
}

class Ball {
  constructor(x, y) {
    this.r = CONFIG.ball.r;
    this.reset(x, y);
  }
  reset(x, y) {
    this.x = x; this.y = y;
    const toRight = Math.random() > 0.5;
    const angle = (Math.random() * 0.8 - 0.4) * Math.PI / 4; // slight random
    const speed = CONFIG.ball.speed;
    this.vx = Math.cos(angle) * speed * (toRight ? 1 : -1);
    this.vy = Math.sin(angle) * speed;
  }
  speed() { return Math.hypot(this.vx, this.vy); }
  setSpeedDir(speed, angle, toRight) {
    const sx = Math.cos(angle) * speed * (toRight ? 1 : -1);
    const sy = Math.sin(angle) * speed;
    this.vx = sx; this.vy = sy;
  }
  update(dt, w, h) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Wall collisions
    if (this.y - this.r < 0) {
      this.y = this.r;
      this.vy *= -1;
    } else if (this.y + this.r > h) {
      this.y = h - this.r;
      this.vy *= -1;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = CONFIG.glow.ball;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Input {
  constructor(canvas) {
    this.up = false;
    this.down = false;
    this.mouseY = null;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') this.up = true;
      if (e.key === 'ArrowDown') this.down = true;
      if (e.code === 'Space') {
        e.preventDefault();
        game?.toggle();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp') this.up = false;
      if (e.key === 'ArrowDown') this.down = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      this.mouseY = y * (CONFIG.height / rect.height); // map to logical coords
    });

    // Tap/Click to toggle on mobile
    canvas.addEventListener('click', () => game?.toggle());
  }
}

class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.width = CONFIG.width;
    this.height = CONFIG.height;

    this.player = new Paddle(12, this.height / 2 - CONFIG.paddle.h / 2);
    this.cpu = new Paddle(this.width - CONFIG.paddle.w - 12, this.height / 2 - CONFIG.paddle.h / 2);
    this.ball = new Ball(this.width / 2, this.height / 2);

    this.input = new Input(canvas);

    this.playerScore = 0;
    this.cpuScore = 0;

    this._last = performance.now();
    this._running = false;

    this.updateScoreUI();
  }

  updateScoreUI() {
    $playerScore.textContent = String(this.playerScore);
    $cpuScore.textContent = String(this.cpuScore);
  }

  ballIntersectsPaddle(ball, paddle) {
    // Circle vs AABB
    const nx = Math.max(paddle.x, Math.min(ball.x, paddle.x + paddle.w));
    const ny = Math.max(paddle.y, Math.min(ball.y, paddle.y + paddle.h));
    const dx = ball.x - nx;
    const dy = ball.y - ny;
    return dx * dx + dy * dy <= ball.r * ball.r;
  }

  handlePaddleBounce(paddle, toRight) {
    const rel = (this.ball.y - paddle.centerY()) / (paddle.h / 2); // -1..1
    const clamped = Math.max(-1, Math.min(1, rel));
    const angle = clamped * CONFIG.ball.maxBounceAngle;
    const nextSpeed = Math.min(this.ball.speed() * CONFIG.ball.speedUp, CONFIG.ball.maxSpeed);
    this.ball.setSpeedDir(nextSpeed, angle, toRight);
    // Nudge out of paddle to avoid sticking
    if (toRight) this.ball.x = paddle.x + paddle.w + this.ball.r + 0.5;
    else this.ball.x = paddle.x - this.ball.r - 0.5;
  }

  update(dt) {
    // Player control
    if (this.input.up) this.player.y -= CONFIG.paddle.speed * dt;
    if (this.input.down) this.player.y += CONFIG.paddle.speed * dt;
    if (this.input.mouseY !== null) this.player.y = this.input.mouseY - this.player.h / 2;
    this.player.clamp(this.height);

    // CPU AI
    const aimY = this.ball.y - this.cpu.h / 2;
    const diff = aimY - this.cpu.y;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), CONFIG.ai.maxSpeed * dt);
    this.cpu.y += step;
    this.cpu.clamp(this.height);

    // Ball
    this.ball.update(dt, this.width, this.height);

    // Paddle collisions
    if (this.ball.vx < 0 && this.ballIntersectsPaddle(this.ball, this.player)) {
      this.handlePaddleBounce(this.player, true);
    } else if (this.ball.vx > 0 && this.ballIntersectsPaddle(this.ball, this.cpu)) {
      this.handlePaddleBounce(this.cpu, false);
    }

    // Scoring
    if (this.ball.x + this.ball.r < 0) {
      this.cpuScore += 1;
      this.updateScoreUI();
      this.ball.reset(this.width / 2, this.height / 2);
    } else if (this.ball.x - this.ball.r > this.width) {
      this.playerScore += 1;
      this.updateScoreUI();
      this.ball.reset(this.width / 2, this.height / 2);
    }
  }

  drawBackground() {
    // Subtle vignette/glow
    const g = this.ctx.createRadialGradient(
      this.width * 0.2, this.height * 0.2, 50,
      this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height)
    );
    g.addColorStop(0, 'rgba(124, 92, 255, 0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0.0)');
    this.ctx.fillStyle = '#0b0c12';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawNet() {
    this.ctx.save();
    this.ctx.fillStyle = CONFIG.net.color;
    const x = this.width / 2 - CONFIG.net.w / 2;
    for (let y = 0; y < this.height; y += CONFIG.net.segH + CONFIG.net.gap) {
      this.ctx.fillRect(x, y, CONFIG.net.w, CONFIG.net.segH);
    }
    this.ctx.restore();
  }

  drawPausedOverlay() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 12, 18, 0.55)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = 'rgba(124, 92, 255, 0.6)';
    this.ctx.shadowBlur = 18;
    this.ctx.fillText('Paused', this.width / 2, this.height / 2);
    this.ctx.restore();
  }

  draw() {
    this.drawBackground();
    this.drawNet();
    this.player.draw(this.ctx);
    this.cpu.draw(this.ctx);
    this.ball.draw(this.ctx);
    if (!this._running) this.drawPausedOverlay();
  }

  loop = (now) => {
    if (!this._running) {
      // Keep drawing paused overlay frame for a crisp UI
      this.draw();
      return;
    }
    const dt = Math.min(0.033, (now - this._last) / 1000);
    this._last = now;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  };

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    requestAnimationFrame(this.loop);
    $btnToggle.textContent = '⏸ Pause';
  }

  pause() {
    this._running = false;
    $btnToggle.textContent = '▶ Play';
    // Force a redraw so overlay appears immediately
    this.draw();
  }

  toggle() {
    if (this._running) this.pause();
    else this.start();
  }

  reset() {
    this.playerScore = 0;
    this.cpuScore = 0;
    this.updateScoreUI();
    this.player.y = this.height / 2 - this.player.h / 2;
    this.cpu.y = this.height / 2 - this.cpu.h / 2;
    this.ball.reset(this.width / 2, this.height / 2);
    this.draw();
  }
}

// Instantiate game
const game = new Game(ctx);

// Wire up UI controls
$btnToggle.addEventListener('click', () => game.toggle());
$btnReset.addEventListener('click', () => game.reset());

// Start paused to showcase the UI
game.pause();