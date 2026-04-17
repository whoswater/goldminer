/**
 * 特效系统 - Perfect动画、粒子效果、震屏
 */
class EffectSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.screenFlash = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeTimer = 0;
    this.gameTime = 0;
  }

  triggerShake(intensity, duration) {
    this.shakeTimer = duration;
    this.shakeX = intensity;
    this.shakeY = intensity;
  }

  addPerfectText(x, y, combo) {
    this.texts.push({
      x, y, combo,
      life: 1.2, scale: 0, targetScale: 1.3
    });
    this.screenFlash = 0.3 + Math.min(combo * 0.05, 0.3);
  }

  addPerfectParticles(x, y, width, hsl, combo) {
    const count = 20 + Math.min(combo * 3, 20);
    for (let i = 0; i < count; i++) {
      const isStar = Math.random() > 0.6;
      this.particles.push({
        x: x + Math.random() * width, y,
        vx: (Math.random() - 0.5) * 350,
        vy: -Math.random() * 250 - 80,
        size: isStar ? Math.random() * 5 + 3 : Math.random() * 4 + 2,
        hsl: { h: hsl.h + (Math.random() - 0.5) * 40, s: 80, l: 70 },
        life: 1.0,
        decay: 0.6 + Math.random() * 0.5,
        isStar
      });
    }
  }

  update(dt) {
    this.gameTime += dt;

    // 震屏
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      this.shakeX = (Math.random() - 0.5) * this.shakeTimer * 40;
      this.shakeY = (Math.random() - 0.5) * this.shakeTimer * 20;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // 粒子
    let wi = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= p.decay * dt;
      if (p.life > 0) this.particles[wi++] = p;
    }
    this.particles.length = wi;

    // 文字
    wi = 0;
    for (let i = 0; i < this.texts.length; i++) {
      const t = this.texts[i];
      t.life -= dt * 0.7;
      t.y -= 50 * dt;
      t.scale += (t.targetScale - t.scale) * 8 * dt;
      if (t.life > 0) this.texts[wi++] = t;
    }
    this.texts.length = wi;

    if (this.screenFlash > 0) this.screenFlash -= dt * 2;
  }

  _drawStar(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
  }

  draw(ctx, offsetY) {
    // 屏幕闪光
    if (this.screenFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.screenFlash * 0.3;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
      ctx.restore();
    }

    // 粒子
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = `hsl(${p.hsl.h},${p.hsl.s}%,${p.hsl.l}%)`;
      if (p.isStar) {
        this._drawStar(ctx, p.x, p.y - offsetY, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y - offsetY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Perfect 文字
    for (const t of this.texts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.translate(t.x, t.y - offsetY);
      ctx.scale(t.scale, t.scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let textColor = '#FFD700';
      let strokeColor = '#B8860B';
      if (t.combo >= 5) {
        const rh = (this.gameTime * 200 + t.combo * 30) % 360;
        textColor = `hsl(${rh},100%,65%)`;
        strokeColor = `hsl(${rh},80%,40%)`;
      }

      ctx.shadowColor = textColor;
      ctx.shadowBlur = 10 + t.combo * 2;

      ctx.font = 'bold 30px Arial';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.strokeText('Perfect!', 0, 0);
      ctx.fillStyle = textColor;
      ctx.fillText('Perfect!', 0, 0);

      ctx.shadowBlur = 0;

      if (t.combo > 1) {
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#FF6347';
        ctx.shadowColor = '#FF6347';
        ctx.shadowBlur = 8;
        ctx.fillText(`x${t.combo}`, 0, 32);
      }
      ctx.restore();
    }
  }
}
