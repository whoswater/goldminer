/**
 * 冲高高 - 主游戏逻辑（浏览器版）
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();

    this.BLOCK_HEIGHT = 25;
    this.BASE_WIDTH = 160;
    this.BASE_SPEED = 150;
    this.PERFECT_THRESHOLD = 5;
    this.PERFECT_RESTORE = 4;

    this.BG_COLORS = [
      { at: 0,  color: [135, 206, 235] },
      { at: 20, color: [70, 130, 180] },
      { at: 40, color: [25, 25, 112] },
      { at: 60, color: [75, 0, 130] },
      { at: 80, color: [20, 20, 40] }
    ];

    this.BLOCK_COLORS_HSL = [];
    for (let i = 0; i < 200; i++) {
      this.BLOCK_COLORS_HSL.push({ h: (i * 8) % 360, s: 70, l: 60 });
    }

    // 背景星星
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * this.W,
        yBase: Math.random() * this.H * 3,
        size: Math.random() * 2 + 0.5,
        twinkleSpeed: 1 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }

    this.effects = new EffectSystem();
    this.cutPieces = [];
    this.landingAnims = [];
    this.gameTime = 0;
    this.highScore = parseInt(localStorage.getItem('stackTower_highScore') || '0');
    this.audio = new AudioSystem();

    this.canvas.addEventListener('click', (e) => this._onInput(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._onInput(e.touches[0]);
    });
    window.addEventListener('resize', () => this.resize());

    this.reset();
    this.state = 'ready';
    this.lastTime = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const maxW = 400;
    const maxH = 700;
    const dpr = window.devicePixelRatio || 1;

    let w = Math.min(window.innerWidth, maxW);
    let h = Math.min(window.innerHeight, maxH);

    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
    this.W = w;
    this.H = h;
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.level = 0;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.cutPieces = [];
    this.landingAnims = [];
    this.effects = new EffectSystem();

    const baseX = (this.W - this.BASE_WIDTH) / 2;
    const baseY = this.H - 80;
    const baseBlock = new Block(baseX, baseY, this.BASE_WIDTH, this.BLOCK_HEIGHT,
      this.BLOCK_COLORS_HSL[0], 0, 0);
    baseBlock.settled = true;
    baseBlock.isBase = true;
    this.stack = [baseBlock];

    this._spawnBlock();
  }

  _getSpeed() {
    const lvl = this.level;
    if (lvl < 5) return this.BASE_SPEED;
    if (lvl < 15) return this.BASE_SPEED + (lvl - 5) * 15;
    if (lvl < 30) return this.BASE_SPEED + 150 + (lvl - 15) * 12;
    if (lvl < 50) return this.BASE_SPEED + 330 + (lvl - 30) * 8;
    return this.BASE_SPEED + 490 + (lvl - 50) * 4;
  }

  _spawnBlock() {
    this.level++;
    const prev = this.stack[this.stack.length - 1];
    const speed = this._getSpeed();
    const dir = this.level % 2 === 0 ? 1 : -1;
    const startX = dir === 1 ? -prev.width : this.W;
    const y = prev.y - this.BLOCK_HEIGHT;
    const hsl = this.BLOCK_COLORS_HSL[this.level % this.BLOCK_COLORS_HSL.length];
    this.currentBlock = new Block(startX, y, prev.width, this.BLOCK_HEIGHT, hsl, dir, speed);

    if (y - this.cameraY < this.H * 0.4) {
      this.targetCameraY = y - this.H * 0.4;
    }
  }

  _onInput(e) {
    // 每次用户交互都尝试恢复音频（浏览器安全策略）
    this.audio.resume();
    // 静音按钮检测（右上角）
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;
    if (x > this.W - 50 && y < 50) {
      this.audio.toggleMute();
      return;
    }
    this.handleTap();
  }

  handleTap() {
    if (this.state === 'ready') {
      this.state = 'playing';
      this.audio.resume();
      this.audio.startBGM();
      return;
    }
    if (this.state === 'over') {
      this.reset();
      this.state = 'playing';
      this.audio.startBGM();
      return;
    }
    if (!this.currentBlock) return;

    const prev = this.stack[this.stack.length - 1];
    const result = Block.slice(this.currentBlock, prev);

    if (!result) { this._gameOver(); return; }

    const { placed, cutOff } = result;
    let newWidth = placed.width;

    if (placed.isPerfect) {
      this.combo++;
      const restore = Math.min(this.PERFECT_RESTORE * this.combo, 20);
      newWidth = Math.min(placed.width + restore, this.BASE_WIDTH);
      this.effects.addPerfectText(placed.x + newWidth / 2, this.currentBlock.y - 20, this.combo);
      this.effects.addPerfectParticles(placed.x, this.currentBlock.y, newWidth, this.currentBlock.hsl, this.combo);
      this.score += 3;
      this.audio.sfxPerfect(this.combo);
    } else {
      this.combo = 0;
      this.score += 1;
      this.effects.triggerShake(2, 0.15);
      this.audio.sfxPlace();
    }

    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const settledBlock = new Block(placed.x, this.currentBlock.y, newWidth, this.BLOCK_HEIGHT,
      this.currentBlock.hsl, 0, 0);
    settledBlock.settled = true;
    this.stack.push(settledBlock);
    this.landingAnims.push({ block: settledBlock, progress: 0, duration: 0.15 });

    if (cutOff) {
      const piece = new CutOffPiece(cutOff.x, this.currentBlock.y, cutOff.width,
        this.BLOCK_HEIGHT, this.currentBlock.hsl);
      piece.vx = this.currentBlock.direction * 50;
      this.cutPieces.push(piece);
    }

    this.currentBlock = null;
    this._spawnBlock();
  }

  _gameOver() {
    this.state = 'over';
    this.effects.triggerShake(5, 0.3);
    this.audio.stopBGM();
    this.audio.sfxGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('stackTower_highScore', String(this.highScore));
    }
    if (this.currentBlock) {
      const piece = new CutOffPiece(this.currentBlock.x, this.currentBlock.y,
        this.currentBlock.width, this.BLOCK_HEIGHT, this.currentBlock.hsl);
      piece.vx = this.currentBlock.direction * 80;
      this.cutPieces.push(piece);
      this.currentBlock = null;
    }
  }

  _getBgColor(level) {
    const stops = this.BG_COLORS;
    if (level <= stops[0].at) return stops[0].color;
    if (level >= stops[stops.length - 1].at) return stops[stops.length - 1].color;
    for (let i = 0; i < stops.length - 1; i++) {
      if (level >= stops[i].at && level <= stops[i + 1].at) {
        const t = (level - stops[i].at) / (stops[i + 1].at - stops[i].at);
        return stops[i].color.map((c, j) => Math.round(c + (stops[i + 1].color[j] - c) * t));
      }
    }
    return stops[0].color;
  }

  _drawBackground() {
    const bgc = this._getBgColor(this.level);
    const ctx = this.ctx;

    // 上下渐变
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    const r1 = Math.max(0, bgc[0] - 30), g1 = Math.max(0, bgc[1] - 30), b1 = Math.max(0, bgc[2] - 30);
    grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
    grad.addColorStop(1, `rgb(${bgc[0]},${bgc[1]},${bgc[2]})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    // 星星
    if (this.level > 15) {
      const starAlpha = Math.min((this.level - 15) / 20, 0.8);
      for (const s of this.stars) {
        let sy = ((s.yBase - this.cameraY * 0.3) % (this.H + 20));
        if (sy < 0) sy += this.H + 20;
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(this.gameTime * s.twinkleSpeed + s.twinkleOffset));
        ctx.save();
        ctx.globalAlpha = starAlpha * twinkle;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _drawUI() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px Arial';
    ctx.fillText(this.score, this.W / 2, 55);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = '15px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`第 ${this.level} 层`, this.W / 2, 78);

    if (this.combo >= 2 && this.state === 'playing') {
      const barW = 80, barH = 4;
      const barX = this.W / 2 - barW / 2, barY = 88;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(barX, barY, barW, barH);
      const fill = Math.min(this.combo / 10, 1);
      const comboGrad = ctx.createLinearGradient(barX, barY, barX + barW * fill, barY);
      comboGrad.addColorStop(0, '#FFD700');
      comboGrad.addColorStop(1, '#FF6347');
      ctx.fillStyle = comboGrad;
      ctx.fillRect(barX, barY, barW * fill, barH);
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`x${this.combo} COMBO`, this.W / 2, barY + 16);
    }
    ctx.restore();
  }

  _drawReadyScreen() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';

    const breathScale = 1 + 0.03 * Math.sin(this.gameTime * 2);
    ctx.translate(this.W / 2, this.H / 2 - 60);
    ctx.scale(breathScale, breathScale);
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('冲高高', 0, 0);
    ctx.shadowBlur = 0;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    ctx.textAlign = 'center';
    const blinkAlpha = 0.4 + 0.4 * Math.abs(Math.sin(this.gameTime * 2.5));
    ctx.font = '18px Arial';
    ctx.fillStyle = `rgba(255,255,255,${blinkAlpha})`;
    ctx.fillText('点击屏幕开始', this.W / 2, this.H / 2 + 10);

    if (this.highScore > 0) {
      ctx.font = '15px Arial';
      ctx.fillStyle = 'rgba(255,215,0,0.7)';
      ctx.fillText(`最高分: ${this.highScore}`, this.W / 2, this.H / 2 + 50);
    }
    ctx.restore();
  }

  _drawGameOver() {
    const ctx = this.ctx;
    ctx.save();

    const maskGrad = ctx.createLinearGradient(0, 0, 0, this.H);
    maskGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
    maskGrad.addColorStop(0.5, 'rgba(0,0,0,0.6)');
    maskGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = maskGrad;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';

    // 圆角面板
    const panelW = this.W * 0.8, panelH = 240;
    const panelX = (this.W - panelW) / 2, panelY = this.H / 2 - panelH / 2 - 20;
    const r = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(panelX + r, panelY);
    ctx.lineTo(panelX + panelW - r, panelY);
    ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + r, r);
    ctx.lineTo(panelX + panelW, panelY + panelH - r);
    ctx.arcTo(panelX + panelW, panelY + panelH, panelX + panelW - r, panelY + panelH, r);
    ctx.lineTo(panelX + r, panelY + panelH);
    ctx.arcTo(panelX, panelY + panelH, panelX, panelY + panelH - r, r);
    ctx.lineTo(panelX, panelY + r);
    ctx.arcTo(panelX, panelY, panelX + r, panelY, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const cy = panelY + 30;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('游戏结束', this.W / 2, cy + 25);

    ctx.font = 'bold 52px Arial';
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(this.score, this.W / 2, cy + 85);
    ctx.shadowBlur = 0;

    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`第 ${this.level - 1} 层  |  最高连击 ${this.maxCombo}`, this.W / 2, cy + 120);

    ctx.font = '15px Arial';
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.fillText(`最高分: ${this.highScore}`, this.W / 2, cy + 148);

    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`我冲到了第${this.level - 1}层！你能超过我吗？`, this.W / 2, cy + 180);

    const blinkAlpha = 0.5 + 0.4 * Math.abs(Math.sin(this.gameTime * 2.5));
    ctx.font = '18px Arial';
    ctx.fillStyle = `rgba(255,255,255,${blinkAlpha})`;
    ctx.fillText('点击屏幕重新开始', this.W / 2, panelY + panelH + 40);
    ctx.restore();
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.gameTime += dt;
    if (this.state === 'ready') return;

    if (this.state === 'playing') {
      if (this.currentBlock) {
        this.currentBlock.update(dt);
        if (this.currentBlock.x + this.currentBlock.width > this.W) this.currentBlock.direction = -1;
        else if (this.currentBlock.x < 0) this.currentBlock.direction = 1;
      }
      this.cameraY += (this.targetCameraY - this.cameraY) * 4 * dt;
    }

    // 落地动画
    let wi = 0;
    for (let i = 0; i < this.landingAnims.length; i++) {
      const la = this.landingAnims[i];
      la.progress += dt / la.duration;
      if (la.progress < 1) this.landingAnims[wi++] = la;
    }
    this.landingAnims.length = wi;

    // 碎片
    wi = 0;
    for (let i = 0; i < this.cutPieces.length; i++) {
      this.cutPieces[i].update(dt);
      if (!this.cutPieces[i].dead) this.cutPieces[wi++] = this.cutPieces[i];
    }
    this.cutPieces.length = wi;

    this.effects.update(dt);
    this.audio.updateBGM();
  }

  render() {
    const ctx = this.ctx;

    ctx.save();
    if (this.effects.shakeTimer > 0) {
      ctx.translate(this.effects.shakeX, this.effects.shakeY);
    }

    this._drawBackground();

    // 连击光晕
    if (this.combo >= 3 && this.state === 'playing') {
      const topBlock = this.stack[this.stack.length - 1];
      const glowY = topBlock.y - this.cameraY;
      const glowAlpha = Math.min(this.combo * 0.06, 0.4);
      const glowR = 40 + this.combo * 5;
      const grd = ctx.createRadialGradient(
        topBlock.x + topBlock.width / 2, glowY, 0,
        topBlock.x + topBlock.width / 2, glowY, glowR
      );
      grd.addColorStop(0, `rgba(255,215,0,${glowAlpha})`);
      grd.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(topBlock.x - glowR, glowY - glowR, topBlock.width + glowR * 2, glowR * 2);
    }

    // 已叠方块
    const viewTop = this.cameraY - this.BLOCK_HEIGHT * 2;
    const viewBottom = this.cameraY + this.H + this.BLOCK_HEIGHT;
    for (const block of this.stack) {
      if (block.y < viewTop || block.y > viewBottom) continue;
      let squashT;
      for (const la of this.landingAnims) {
        if (la.block === block) { squashT = la.progress; break; }
      }
      if (block.isBase) {
        block.drawAsBase(ctx, this.cameraY);
      } else {
        block.draw(ctx, this.cameraY, squashT);
      }
    }

    // 当前移动方块
    if (this.currentBlock) {
      if (this.state === 'playing') {
        const prev = this.stack[this.stack.length - 1];
        const shadowY = prev.y - this.cameraY + prev.height;
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(this.currentBlock.x, shadowY - this.BLOCK_HEIGHT, this.currentBlock.width, this.BLOCK_HEIGHT);
      }
      this.currentBlock.draw(ctx, this.cameraY);

      if (this.state === 'playing') {
        const prev = this.stack[this.stack.length - 1];
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.currentBlock.x, this.currentBlock.y + this.BLOCK_HEIGHT - this.cameraY);
        ctx.lineTo(this.currentBlock.x, prev.y + this.BLOCK_HEIGHT - this.cameraY);
        ctx.moveTo(this.currentBlock.x + this.currentBlock.width, this.currentBlock.y + this.BLOCK_HEIGHT - this.cameraY);
        ctx.lineTo(this.currentBlock.x + this.currentBlock.width, prev.y + this.BLOCK_HEIGHT - this.cameraY);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const piece of this.cutPieces) piece.draw(ctx, this.cameraY);
    this.effects.draw(ctx, this.cameraY);

    ctx.restore(); // 震屏 restore

    this._drawUI();
    this._drawMuteBtn();
    if (this.state === 'ready') this._drawReadyScreen();
    else if (this.state === 'over') this._drawGameOver();
  }

  _drawMuteBtn() {
    const ctx = this.ctx;
    const bx = this.W - 40, by = 15, sz = 20;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by + 6); ctx.lineTo(bx + 5, by + 6);
    ctx.lineTo(bx + 10, by + 2); ctx.lineTo(bx + 10, by + sz - 2);
    ctx.lineTo(bx + 5, by + sz - 6); ctx.lineTo(bx, by + sz - 6);
    ctx.closePath(); ctx.fill();
    if (!this.audio.muted) {
      ctx.beginPath(); ctx.arc(bx + 13, by + sz / 2, 4, -0.6, 0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + 13, by + sz / 2, 8, -0.5, 0.5); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bx + 13, by + 5); ctx.lineTo(bx + 21, by + sz - 5);
      ctx.moveTo(bx + 21, by + 5); ctx.lineTo(bx + 13, by + sz - 5);
      ctx.stroke();
    }
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  new Game(canvas);
});
