// ========== 绿茵逐梦 · 渲染工具 ==========

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// 比赛场地背景 — 俯视足球场，支持指定球场区域
// bounds: {top, bottom, left, right} 球场边界
function drawPitchBG(ctx, W, H, bounds) {
  // 场外区域（与球场接近的绿色，减少色差）
  ctx.fillStyle = '#278a3a'
  ctx.fillRect(0, 0, W, H)

  if (!bounds) bounds = { top: 0, bottom: H, left: W * 0.08, right: W * 0.92 }
  var t = bounds.top, b = bounds.bottom, l = bounds.left, r = bounds.right
  var pw = r - l, ph = b - t
  var cx = (l + r) / 2

  // 球场内草地（比场外亮，明确区分）
  ctx.fillStyle = '#309944'
  ctx.fillRect(l, t, pw, ph)

  // 草皮条纹
  var stripes = 10
  var sh = ph / stripes
  for (var i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
    ctx.fillRect(l, t + i * sh, pw, sh)
  }

  // 边线（白色，粗且醒目）
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 2
  ctx.strokeRect(l, t, pw, ph)

  // 中线
  var my = t + ph * 0.5
  ctx.beginPath(); ctx.moveTo(l, my); ctx.lineTo(r, my)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke()

  // 中圈（半径 9.15m/68m ≈ 13.5% 球场宽度）
  var circR = pw * 0.135
  ctx.beginPath(); ctx.arc(cx, my, circR, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, my, 3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill()

  // 禁区尺寸按真实比例（40.32m/68m=59.3%宽, 16.5m/105m=15.7%深）
  var gw = pw * 0.593, gh = ph * 0.157
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1
  // 小禁区（18.32m/68m=26.9%宽, 5.5m/105m=5.2%深）
  var sgw = pw * 0.269, sgh = ph * 0.052

  // 上方禁区（对手）
  ctx.strokeRect(cx - gw / 2, t, gw, gh)
  ctx.strokeRect(cx - sgw / 2, t, sgw, sgh)
  // 罚球点（11m/105m=10.5%深）
  ctx.beginPath(); ctx.arc(cx, t + ph * 0.105, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill()
  // 罚球弧
  ctx.beginPath(); ctx.arc(cx, t + ph * 0.105, ph * 0.087, 0.3 * Math.PI, 0.7 * Math.PI)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke()

  // 下方禁区（我方）
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.strokeRect(cx - gw / 2, b - gh, gw, gh)
  ctx.strokeRect(cx - sgw / 2, b - sgh, sgw, sgh)
  ctx.beginPath(); ctx.arc(cx, b - ph * 0.105, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, b - ph * 0.105, ph * 0.087, 1.3 * Math.PI, 1.7 * Math.PI)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke()
}

// 球门（带网格）
function drawGoal(ctx, x, y, w, h, flip) {
  // 球网背景（半透明深色，体现网的深度感）
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fillRect(x, y, w, h)

  // 球网网格（密一点，更真实）
  var cols = 12, rows = 4
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 0.5
  // 竖线
  for (var i = 0; i <= cols; i++) {
    ctx.beginPath(); ctx.moveTo(x + w / cols * i, y); ctx.lineTo(x + w / cols * i, y + h); ctx.stroke()
  }
  // 横线
  for (var j = 0; j <= rows; j++) {
    ctx.beginPath(); ctx.moveTo(x, y + h / rows * j); ctx.lineTo(x + w, y + h / rows * j); ctx.stroke()
  }
  // 斜线（交叉网纹，更像真实球网）
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  for (var d = 0; d < cols + rows; d++) {
    ctx.beginPath()
    var sx = x + (d * w / cols), sy = y
    var ex = sx - h * (w / cols) / (h / rows), ey = y + h
    ctx.moveTo(clampV(sx, x, x+w), sy + Math.max(0, x - sx) * rows / cols * (h / rows / (w / cols)))
    ctx.lineTo(clampV(ex, x, x+w), ey)
    ctx.stroke()
  }

  // 门框（白色金属管）
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  if (flip) {
    ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h)
  } else {
    ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y)
  }
  ctx.stroke()
  // 门框高光
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  if (flip) {
    ctx.moveTo(x + 2, y + h); ctx.lineTo(x + 2, y + 2); ctx.lineTo(x + w - 2, y + 2); ctx.lineTo(x + w - 2, y + h)
  } else {
    ctx.moveTo(x + 2, y); ctx.lineTo(x + 2, y + h - 2); ctx.lineTo(x + w - 2, y + h - 2); ctx.lineTo(x + w - 2, y)
  }
  ctx.stroke()
}

function clampV(v, min, max) { return v < min ? min : v > max ? max : v }

// 球员 — 穿球衣的Q版小人，有立体感
function drawPlayer(ctx, x, y, size, color, emoji, hasBall, teamName) {
  var s = size

  // 地面阴影
  ctx.beginPath()
  ctx.arc(x, y + s * 1.1, s * 0.4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill()

  // === 腿（两条短线）===
  ctx.strokeStyle = '#dcc8a0'; ctx.lineWidth = s * 0.18; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - s * 0.25, y + s * 0.5); ctx.lineTo(x - s * 0.2, y + s * 0.95); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + s * 0.25, y + s * 0.5); ctx.lineTo(x + s * 0.2, y + s * 0.95); ctx.stroke()
  // 球鞋
  ctx.fillStyle = '#333'
  ctx.beginPath(); ctx.arc(x - s * 0.2, y + s * 1.0, s * 0.12, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + s * 0.2, y + s * 1.0, s * 0.12, 0, Math.PI * 2); ctx.fill()

  // === 身体/球衣 ===
  ctx.beginPath()
  ctx.moveTo(x - s * 0.55, y - s * 0.1)
  ctx.quadraticCurveTo(x - s * 0.6, y + s * 0.55, x - s * 0.3, y + s * 0.6)
  ctx.lineTo(x + s * 0.3, y + s * 0.6)
  ctx.quadraticCurveTo(x + s * 0.6, y + s * 0.55, x + s * 0.55, y - s * 0.1)
  ctx.closePath()
  // 球衣渐变（立体感）
  var jGrad = ctx.createLinearGradient(x - s * 0.5, y - s * 0.1, x + s * 0.5, y + s * 0.6)
  jGrad.addColorStop(0, lightenColor(color, 35))
  jGrad.addColorStop(0.4, color)
  jGrad.addColorStop(1, lightenColor(color, -30))
  ctx.fillStyle = jGrad; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke()

  // 球衣号码/纹路
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath(); ctx.arc(x, y + s * 0.2, s * 0.15, 0, Math.PI * 2); ctx.fill()

  // === 手臂 ===
  ctx.strokeStyle = '#dcc8a0'; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.7, y + s * 0.3); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + s * 0.5, y); ctx.lineTo(x + s * 0.7, y + s * 0.3); ctx.stroke()

  // === 头部 ===
  ctx.beginPath(); ctx.arc(x, y - s * 0.35, s * 0.38, 0, Math.PI * 2)
  var hGrad = ctx.createRadialGradient(x - s * 0.1, y - s * 0.45, 0, x, y - s * 0.35, s * 0.38)
  hGrad.addColorStop(0, '#ffe0c0'); hGrad.addColorStop(1, '#e8b888')
  ctx.fillStyle = hGrad; ctx.fill()

  // 头发（球衣色的帽子效果）
  ctx.beginPath()
  ctx.arc(x, y - s * 0.35, s * 0.38, Math.PI * 1.15, Math.PI * 1.85)
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = s * 0.15; ctx.stroke()

  // 五官
  var faceY = y - s * 0.35, faceR = s * 0.38
  // 眼睛
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x - faceR * 0.3, faceY - faceR * 0.08, faceR * 0.18, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + faceR * 0.3, faceY - faceR * 0.08, faceR * 0.18, 0, Math.PI * 2); ctx.fill()
  // 瞳孔
  ctx.fillStyle = '#222'
  ctx.beginPath(); ctx.arc(x - faceR * 0.28, faceY - faceR * 0.06, faceR * 0.09, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + faceR * 0.32, faceY - faceR * 0.06, faceR * 0.09, 0, Math.PI * 2); ctx.fill()
  // 微笑
  ctx.beginPath()
  ctx.arc(x, faceY + faceR * 0.1, faceR * 0.22, 0.1 * Math.PI, 0.9 * Math.PI)
  ctx.strokeStyle = '#a0522d'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round'; ctx.stroke()

  // 脚下有球
  if (hasBall) {
    ctx.font = (s * 0.55) + 'px sans-serif'
    ctx.fillText('⚽', x + s * 0.55, y + s * 0.75)
  }

  // 名字
  if (teamName) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = (s * 0.4) + 'px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(teamName, x, y + s * 1.15)
  }
}

// 足球 — 带阴影和光泽
function drawBall(ctx, x, y, size, flying) {
  // 地面阴影
  var shadowScale = flying ? 0.6 : 1
  ctx.beginPath()
  ctx.arc(x + 2, y + size * 0.7, size * 0.25 * shadowScale, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,' + (flying ? 0.1 : 0.2) + ')'; ctx.fill()

  // 球体白色底
  ctx.beginPath(); ctx.arc(x, y, size * 0.42, 0, Math.PI * 2)
  var bGrad = ctx.createRadialGradient(x - size * 0.12, y - size * 0.12, 0, x, y, size * 0.42)
  bGrad.addColorStop(0, '#ffffff'); bGrad.addColorStop(0.6, '#e8e8e8'); bGrad.addColorStop(1, '#b0b0b0')
  ctx.fillStyle = bGrad; ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.stroke()

  // 五边形花纹（简化）
  var cx2 = x, cy2 = y, pr = size * 0.18
  ctx.fillStyle = 'rgba(30,30,30,0.7)'
  // 中心五边形
  ctx.beginPath()
  for (var i = 0; i < 5; i++) {
    var a = Math.PI * 2 * i / 5 - Math.PI / 2
    var px2 = cx2 + Math.cos(a) * pr, py2 = cy2 + Math.sin(a) * pr
    if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2)
  }
  ctx.closePath(); ctx.fill()

  // 高光
  ctx.beginPath(); ctx.arc(x - size * 0.1, y - size * 0.12, size * 0.12, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill()
}

// 菜单页足球场背景（较暗、带灯光）
function drawMenuBG(ctx, W, H, t) {
  var bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#2d7a42')
  bg.addColorStop(1, '#3a9952')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
}

// 渐变按钮
function drawButton(ctx, x, y, w, h, text, colors, textColor) {
  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  roundRect(ctx, x + 1, y + 3, w, h, h / 2); ctx.fill()

  // 按钮主体
  var grad = ctx.createLinearGradient(x, y, x + w, y + h)
  grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1])
  ctx.fillStyle = grad
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill()

  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  roundRect(ctx, x + 2, y + 2, w - 4, h * 0.4, h / 2); ctx.fill()

  // 边框
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1
  roundRect(ctx, x, y, w, h, h / 2); ctx.stroke()

  // 文字阴影 + 文字
  ctx.font = 'bold ' + Math.floor(h * 0.38) + 'px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillText(text, x + w / 2 + 1, y + h / 2 + 1)
  ctx.fillStyle = textColor || '#fff'
  ctx.fillText(text, x + w / 2, y + h / 2)
}

function hitTest(tx, ty, x, y, w, h) {
  return tx >= x && tx <= x + w && ty >= y && ty <= y + h
}

function drawText(ctx, text, x, y, font, color, align) {
  ctx.fillStyle = color || '#fff'
  ctx.font = font || '16px sans-serif'
  ctx.textAlign = align || 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

function drawStrokeText(ctx, text, x, y, font, fillColor, strokeColor, lineWidth) {
  ctx.font = font || 'bold 32px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  if (strokeColor) {
    ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth || 4
    ctx.strokeText(text, x, y)
  }
  ctx.fillStyle = fillColor || '#fff'
  ctx.fillText(text, x, y)
}

function drawTeamBadge(ctx, x, y, r, color, cityName, selected, emoji) {
  if (selected) {
    ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.globalAlpha = 0.3; ctx.fill(); ctx.globalAlpha = 1
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
  var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
  grad.addColorStop(0, lightenColor(color, 30)); grad.addColorStop(1, color)
  ctx.fillStyle = grad; ctx.fill()
  ctx.strokeStyle = selected ? '#ffd700' : 'rgba(255,255,255,0.3)'
  ctx.lineWidth = selected ? 2.5 : 1; ctx.stroke()

  if (emoji) {
    ctx.font = (r * 0.9) + 'px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(emoji, x, y)
  }
  ctx.fillStyle = selected ? '#ffd700' : 'rgba(255,255,255,0.8)'
  ctx.font = (selected ? 'bold ' : '') + (r * 0.5) + 'px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText(cityName, x, y + r + 5)
}

// 进度条
function drawProgressBar(ctx, x, y, w, h, pct, color, bgColor) {
  ctx.fillStyle = bgColor || 'rgba(255,255,255,0.08)'
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill()
  if (pct > 0) {
    ctx.fillStyle = color || '#4CAF50'
    roundRect(ctx, x, y, w * Math.min(1, pct), h, h / 2); ctx.fill()
  }
}

function lightenColor(hex, amount) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#' || hex.length < 7) return '#888888'
  var r = parseInt(hex.slice(1, 3), 16) || 0
  var g = parseInt(hex.slice(3, 5), 16) || 0
  var b = parseInt(hex.slice(5, 7), 16) || 0
  r = Math.min(255, Math.max(0, r + amount))
  g = Math.min(255, Math.max(0, g + amount))
  b = Math.min(255, Math.max(0, b + amount))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

module.exports = {
  roundRect: roundRect,
  drawPitchBG: drawPitchBG,
  drawGoal: drawGoal,
  drawPlayer: drawPlayer,
  drawBall: drawBall,
  drawMenuBG: drawMenuBG,
  drawButton: drawButton,
  hitTest: hitTest,
  drawText: drawText,
  drawStrokeText: drawStrokeText,
  drawTeamBadge: drawTeamBadge,
  drawProgressBar: drawProgressBar,
  lightenColor: lightenColor
}
