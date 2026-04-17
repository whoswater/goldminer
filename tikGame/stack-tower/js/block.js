/**
 * 方块类 - 管理方块的位置、移动、切割逻辑
 */
class Block {
  constructor(x, y, width, height, hsl, direction, speed) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.hsl = hsl; // { h, s, l }
    this.direction = direction;
    this.speed = speed;
    this.settled = false;
    this.isBase = false;
  }

  update(dt) {
    if (!this.settled) {
      this.x += this.speed * this.direction * dt;
    }
  }

  _hsl(h, s, l) {
    return `hsl(${h},${s}%,${l}%)`;
  }

  draw(ctx, offsetY, squashT) {
    const x = Math.round(this.x);
    const y = Math.round(this.y - offsetY);
    const w = Math.round(this.width);
    const h = this.height;
    const depth = 5;
    const c = this.hsl;

    if (squashT !== undefined && squashT < 1) {
      const squash = 1 + 0.3 * Math.sin(squashT * Math.PI);
      const stretch = 1 / squash;
      const cx = x + w / 2;
      const cy = y + h;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(squash, stretch);
      ctx.translate(-cx, -cy);
    }

    // 底部阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 2, y + h, w, 3);

    // 正面渐变
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, this._hsl(c.h, c.s, c.l + 8));
    grad.addColorStop(1, this._hsl(c.h, c.s, c.l - 5));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // 正面高光条
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, w, 3);

    // 顶面
    ctx.fillStyle = this._hsl(c.h, c.s - 5, c.l + 18);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + depth, y - depth);
    ctx.lineTo(x + w + depth, y - depth);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();

    // 右侧面渐变
    const sideGrad = ctx.createLinearGradient(x + w, y, x + w + depth, y + h);
    sideGrad.addColorStop(0, this._hsl(c.h, c.s, c.l - 15));
    sideGrad.addColorStop(1, this._hsl(c.h, c.s, c.l - 25));
    ctx.fillStyle = sideGrad;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + depth, y - depth);
    ctx.lineTo(x + w + depth, y + h - depth);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    if (squashT !== undefined && squashT < 1) {
      ctx.restore();
    }
  }

  drawAsBase(ctx, offsetY) {
    const x = Math.round(this.x);
    const y = Math.round(this.y - offsetY);
    const w = Math.round(this.width);
    const h = this.height + 4;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, y + h, w, 4);

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#8a8a8a');
    grad.addColorStop(0.3, '#c0c0c0');
    grad.addColorStop(0.5, '#e0e0e0');
    grad.addColorStop(0.7, '#c0c0c0');
    grad.addColorStop(1, '#707070');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x, y, w, 2);

    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5, y - 5);
    ctx.lineTo(x + w + 5, y - 5);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#606060';
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + 5, y - 5);
    ctx.lineTo(x + w + 5, y + h - 5);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  static slice(current, prev) {
    const overlap = Math.min(current.x + current.width, prev.x + prev.width) -
                    Math.max(current.x, prev.x);
    if (overlap <= 0) return null;

    const newX = Math.max(current.x, prev.x);
    const isPerfect = Math.abs(current.x - prev.x) < 5;

    const placed = {
      x: isPerfect ? prev.x : newX,
      width: isPerfect ? prev.width : overlap,
      isPerfect
    };

    let cutOff = null;
    if (!isPerfect) {
      const cutWidth = current.width - overlap;
      const cutX = current.x < prev.x ? current.x : current.x + overlap;
      cutOff = { x: cutX, width: cutWidth };
    }
    return { placed, cutOff };
  }
}

/**
 * 切割碎片类
 */
class CutOffPiece {
  constructor(x, y, width, height, hsl) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.hsl = hsl;
    this.vy = 0;
    this.vx = 0;
    this.rotation = 0;
    this.rotSpeed = (Math.random() - 0.5) * 3;
    this.alpha = 1;
    this.dead = false;
  }

  update(dt) {
    this.vy += 800 * dt;
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    this.rotation += this.rotSpeed * dt;
    this.alpha -= 0.8 * dt;
    if (this.alpha <= 0) this.dead = true;
  }

  draw(ctx, offsetY) {
    if (this.dead) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.x + this.width / 2, this.y - offsetY + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.fillStyle = `hsl(${this.hsl.h},${this.hsl.s}%,${this.hsl.l}%)`;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}
