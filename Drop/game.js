// ======================================================
// 水滴石穿 — WeChat Mini Game
// ======================================================

var canvas = wx.createCanvas();
var ctx = canvas.getContext('2d');
var W = canvas.width;
var H = canvas.height;
var dpr = wx.getSystemInfoSync().pixelRatio || 2;

// ==================== 常量配置 ====================
var ROUND_DURATION = 30; // 每局30秒

var ROUNDS = [
  { name: '滴水初击',   dropSpeed: 4,   hitsToBreak: 20, hitRadius: 80, hitScore: 10, missScore: -3 },
  { name: '渐蚀坚石',   dropSpeed: 6.5, hitsToBreak: 30, hitRadius: 55, hitScore: 15, missScore: -5 },
  { name: '石穿功成',   dropSpeed: 9,   hitsToBreak: 40, hitRadius: 38, hitScore: 20, missScore: -8 }
];

// 颜色
var COLOR_BG_TOP    = '#0a0e27';
var COLOR_BG_BOT    = '#1e3a6e';
var COLOR_DROP      = '#29b6f6';
var COLOR_DROP_DARK = '#0277bd';
var COLOR_STONE     = '#546e7a';
var COLOR_STONE_LT  = '#78909c';
var COLOR_CRACK     = 'rgba(0,0,0,0.55)';
var COLOR_HIT_TEXT  = '#4fc3f7';
var COLOR_MISS_TEXT = '#ff5252';
var COLOR_WHITE     = '#ffffff';
var COLOR_WHITE_A   = 'rgba(255,255,255,0.5)';

// ==================== 游戏状态 ====================
var STATE_MENU      = 0;
var STATE_GUIDE     = 1;
var STATE_COUNTDOWN = 2;
var STATE_PLAYING   = 3;
var STATE_ROUND_END = 4;
var STATE_RESULT    = 5;

var state = STATE_MENU;
var guideStep = 0;         // 引导步骤: 0=整体说明, 1=演示点击, 2=演示命中
var guideTapCount = 0;     // 引导中玩家点击计数
var guideDrops = [];       // 引导演示水滴
var guideDemoTimer = 0;    // 演示动画计时
var currentRound = 0;   // 0-based
var timeLeft = 0;
var score = 0;
var roundScore = 0;
var hits = 0;
var crackPercent = 0;
var stoneBroken = false;

var countdownNum = 3;
var countdownTimer = 0;

// 石块位置
var stoneX = W / 2;
var stoneY = H * 0.72;
var stoneW = W * 0.28;
var stoneH = stoneW * 0.6;

// 水滴列表
var drops = [];     // { x, y, speed }
// 反馈文字
var feedbacks = [];  // { x, y, text, color, alpha, vy }
// 水花
var splashes = [];   // { x, y, particles: [{dx,dy,alpha}] }
// 碎片
var debris = [];     // { x, y, vx, vy, rot, alpha, w, h }

// 抖动
var shakeX = 0;
var shakeTimer = 0;

// 各局结果
var roundResults = [];

// 计时器
var gameTimer = null;
var lastTime = 0;

// ==================== 音频 ====================
var bgm = null;
var sfxDrop = null;
var sfxHit = null;
var sfxBreak = null;

function initAudio() {
  try {
    bgm = wx.createInnerAudioContext();
    bgm.loop = true;
    bgm.volume = 0.3;
    bgm.src = 'audio/bgm.mp3';

    sfxDrop = wx.createInnerAudioContext();
    sfxDrop.src = 'audio/drop.mp3';
    sfxDrop.volume = 0.5;

    sfxHit = wx.createInnerAudioContext();
    sfxHit.src = 'audio/hit.mp3';
    sfxHit.volume = 0.6;

    sfxBreak = wx.createInnerAudioContext();
    sfxBreak.src = 'audio/break.mp3';
    sfxBreak.volume = 0.7;
  } catch (e) {}
}

function playSfx(sfx) {
  try {
    if (sfx) { sfx.stop(); sfx.play(); }
  } catch (e) {}
}

initAudio();

// ==================== 绘图工具 ====================

function drawRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground() {
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, COLOR_BG_TOP);
  grad.addColorStop(0.5, '#121845');
  grad.addColorStop(1, COLOR_BG_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 装饰圆
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.08, W * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.1, H * 0.55, W * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// 绘制水滴形状
function drawDrop(x, y, size) {
  ctx.save();
  ctx.translate(x, y);

  // 水滴主体
  var grad = ctx.createLinearGradient(0, -size, 0, size);
  grad.addColorStop(0, 'rgba(79,195,247,0.7)');
  grad.addColorStop(0.7, COLOR_DROP);
  grad.addColorStop(1, COLOR_DROP_DARK);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.7, size * 0.4, 0, size);
  ctx.bezierCurveTo(-size * 0.7, size * 0.4, -size * 0.6, -size * 0.3, 0, -size);
  ctx.closePath();
  ctx.fill();

  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-size * 0.15, -size * 0.2, size * 0.12, size * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 绘制石块
function drawStone(sx, sy, sw, sh, crack) {
  ctx.save();
  ctx.translate(shakeX, 0);

  // 石块阴影
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  drawRoundRect(sx - sw / 2 + 4, sy - sh / 2 + 6, sw, sh, 12);
  ctx.fill();

  // 石块主体
  var grad = ctx.createLinearGradient(sx - sw / 2, sy - sh / 2, sx + sw / 2, sy + sh / 2);
  grad.addColorStop(0, COLOR_STONE_LT);
  grad.addColorStop(0.4, COLOR_STONE);
  grad.addColorStop(1, '#37474f');
  ctx.fillStyle = grad;
  drawRoundRect(sx - sw / 2, sy - sh / 2, sw, sh, 12);
  ctx.fill();

  // 石块高光
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.ellipse(sx - sw * 0.15, sy - sh * 0.15, sw * 0.25, sh * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // 裂纹
  if (crack >= 15) drawCrackLine(sx, sy - sh * 0.4, sx - sw * 0.05, sy + sh * 0.1, 1.5);
  if (crack >= 30) drawCrackLine(sx - sw * 0.1, sy - sh * 0.35, sx - sw * 0.15, sy + sh * 0.15, 1.2);
  if (crack >= 45) drawCrackLine(sx + sw * 0.08, sy - sh * 0.38, sx + sw * 0.12, sy + sh * 0.2, 1.8);
  if (crack >= 60) drawCrackLine(sx - sw * 0.2, sy, sx + sw * 0.2, sy + sh * 0.05, 1.3);
  if (crack >= 75) drawCrackLine(sx - sw * 0.25, sy + sh * 0.1, sx + sw * 0.25, sy + sh * 0.08, 1.6);
  if (crack >= 90) {
    drawCrackLine(sx, sy - sh * 0.45, sx, sy + sh * 0.45, 2.2);
    drawCrackLine(sx - sw * 0.3, sy - sh * 0.05, sx + sw * 0.3, sy + sh * 0.05, 2);
  }

  ctx.restore();
}

function drawCrackLine(x1, y1, x2, y2, width) {
  ctx.strokeStyle = COLOR_CRACK;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';

  // 锯齿裂纹
  var mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 6;
  var my = (y1 + y2) / 2 + (Math.random() - 0.5) * 6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(mx, my);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// 绘制底部水面
function drawWater() {
  var waterY = H * 0.92;
  ctx.fillStyle = 'rgba(79,195,247,0.06)';
  ctx.beginPath();
  ctx.moveTo(0, waterY);
  for (var i = 0; i <= W; i += 20) {
    ctx.lineTo(i, waterY + Math.sin(i * 0.02 + Date.now() * 0.002) * 5);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
}

// ==================== 页面绘制 ====================

function drawMenu() {
  drawBackground();
  drawWater();

  // 水滴图标动画
  var bounceY = Math.sin(Date.now() * 0.003) * 10;
  drawDrop(W / 2, H * 0.22 + bounceY, 30);

  // 标题
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = 'bold ' + Math.floor(W * 0.1) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('水滴石穿', W / 2, H * 0.32);

  // 副标题
  ctx.fillStyle = COLOR_WHITE_A;
  ctx.font = Math.floor(W * 0.035) + 'px sans-serif';
  ctx.fillText('Dripping Water Wears Through Stone', W / 2, H * 0.37);

  // 三局介绍
  var dotColors = ['#4fc3f7', '#ffb74d', '#ce93d8'];
  var labels = ['第一局', '第二局', '第三局'];
  var names = ['滴水初击', '渐蚀坚石', '石穿功成'];
  var startY = H * 0.46;
  var gap = H * 0.055;

  for (var i = 0; i < 3; i++) {
    var ry = startY + i * gap;
    // 圆点
    ctx.fillStyle = dotColors[i];
    ctx.beginPath();
    ctx.arc(W * 0.3, ry, 5, 0, Math.PI * 2);
    ctx.fill();
    // 标签
    ctx.fillStyle = COLOR_WHITE_A;
    ctx.font = Math.floor(W * 0.038) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(labels[i], W * 0.33, ry);
    // 名称
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = Math.floor(W * 0.042) + 'px sans-serif';
    ctx.fillText(names[i], W * 0.48, ry);
  }

  // 提示
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = Math.floor(W * 0.032) + 'px sans-serif';
  ctx.fillText('点击屏幕释放水滴，精准命中石块得分', W / 2, H * 0.68);
  ctx.fillText('每局30秒，难度逐局递增', W / 2, H * 0.72);

  // 开始按钮
  drawButton(W / 2, H * 0.82, W * 0.5, H * 0.065, '开始挑战', '#4fc3f7', '#0288d1');
}

// ==================== 新手引导 ====================

function drawGuide() {
  drawBackground();
  drawStone(stoneX, stoneY, stoneW, stoneH, 0);
  drawWater();

  // 有效区域虚线圈
  ctx.strokeStyle = 'rgba(79,195,247,0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(stoneX, stoneY, ROUNDS[0].hitRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 引导演示水滴
  for (var i = 0; i < guideDrops.length; i++) {
    drawDrop(guideDrops[i].x, guideDrops[i].y, 14);
  }

  // 半透明遮罩（上方区域）
  ctx.fillStyle = 'rgba(10,14,39,0.55)';
  ctx.fillRect(0, 0, W, H * 0.2);

  var fs = Math.floor(W * 0.04);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (guideStep === 0) {
    // 步骤1: 整体说明 — 展示手指+石块关系
    // 标题
    ctx.fillStyle = COLOR_HIT_TEXT;
    ctx.font = 'bold ' + Math.floor(W * 0.055) + 'px sans-serif';
    ctx.fillText('玩法说明', W / 2, H * 0.08);

    // 说明文字
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = fs + 'px sans-serif';
    ctx.fillText('点击屏幕任意位置释放水滴', W / 2, H * 0.28);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = Math.floor(W * 0.035) + 'px sans-serif';
    ctx.fillText('水滴会从点击位置垂直下落', W / 2, H * 0.34);
    ctx.fillText('落在石块上方虚线圈内 = 命中得分', W / 2, H * 0.39);
    ctx.fillText('落在圈外 = 失误扣分', W / 2, H * 0.44);

    // 石块上方箭头指示
    drawArrowDown(stoneX, stoneY - stoneH - 40, 20);

    ctx.fillStyle = 'rgba(79,195,247,0.6)';
    ctx.font = Math.floor(W * 0.03) + 'px sans-serif';
    ctx.fillText('瞄准这里!', stoneX, stoneY - stoneH - 60);

    // 手指点击动画
    var fingerX = stoneX;
    var fingerY = H * 0.55;
    var pulse = Math.sin(Date.now() * 0.004) * 0.15 + 0.85;
    drawFingerIcon(fingerX, fingerY, pulse);

    // 底部提示
    ctx.fillStyle = COLOR_WHITE_A;
    ctx.font = Math.floor(W * 0.032) + 'px sans-serif';
    ctx.fillText('点击任意位置继续', W / 2, H * 0.92);

  } else if (guideStep === 1) {
    // 步骤2: 让玩家试点3次
    ctx.fillStyle = COLOR_HIT_TEXT;
    ctx.font = 'bold ' + Math.floor(W * 0.05) + 'px sans-serif';
    ctx.fillText('试试看！', W / 2, H * 0.08);

    ctx.fillStyle = COLOR_WHITE;
    ctx.font = fs + 'px sans-serif';
    ctx.fillText('点击屏幕释放水滴砸向石块', W / 2, H * 0.16);

    // 进度指示
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = Math.floor(W * 0.035) + 'px sans-serif';
    ctx.fillText('(' + guideTapCount + ' / 3)', W / 2, H * 0.21);

    // 手指动画引导点击石块上方
    if (guideTapCount < 3) {
      var pulse2 = Math.sin(Date.now() * 0.005) * 0.15 + 0.85;
      drawFingerIcon(stoneX, stoneY - stoneH * 1.8, pulse2);
    }

  } else if (guideStep === 2) {
    // 步骤3: 完成引导
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold ' + Math.floor(W * 0.055) + 'px sans-serif';
    ctx.fillText('准备就绪！', W / 2, H * 0.08);

    ctx.fillStyle = COLOR_WHITE;
    ctx.font = fs + 'px sans-serif';
    ctx.fillText('目标: 在30秒内尽可能多地命中石块', W / 2, H * 0.30);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = Math.floor(W * 0.035) + 'px sans-serif';
    ctx.fillText('累计命中可让石块开裂直至击穿', W / 2, H * 0.36);
    ctx.fillText('击穿石块可获得大量额外奖励分！', W / 2, H * 0.41);

    // 难度提示
    ctx.fillStyle = 'rgba(255,183,77,0.8)';
    ctx.font = Math.floor(W * 0.032) + 'px sans-serif';
    ctx.fillText('共三局，难度逐局递增', W / 2, H * 0.48);
    ctx.fillText('水滴更快 · 判定更小 · 石块更硬', W / 2, H * 0.53);

    // 开始按钮
    drawButton(W / 2, H * 0.66, W * 0.5, H * 0.065, '开始第一局', '#4fc3f7', '#0288d1');
  }
}

function drawFingerIcon(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.8;

  // 手指圆形
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();

  // 手指内圆
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  // 波纹扩散
  var ripple = (Date.now() % 1500) / 1500;
  ctx.strokeStyle = 'rgba(79,195,247,' + (0.5 - ripple * 0.5) + ')';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 28 + ripple * 25, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawArrowDown(x, y, size) {
  ctx.save();
  ctx.strokeStyle = COLOR_HIT_TEXT;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.005) * 0.3;

  // 竖线
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size * 0.3);
  ctx.stroke();

  // 箭头
  ctx.beginPath();
  ctx.moveTo(x - size * 0.4, y - size * 0.1);
  ctx.lineTo(x, y + size * 0.3);
  ctx.lineTo(x + size * 0.4, y - size * 0.1);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawCountdown() {
  drawBackground();
  drawStone(stoneX, stoneY, stoneW, stoneH, 0);
  drawWater();

  // 半透明遮罩
  ctx.fillStyle = 'rgba(10,14,39,0.6)';
  ctx.fillRect(0, 0, W, H);

  // 当前局名
  ctx.fillStyle = COLOR_WHITE_A;
  ctx.font = Math.floor(W * 0.05) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(ROUNDS[currentRound].name, W / 2, H * 0.38);

  // 数字
  ctx.fillStyle = COLOR_HIT_TEXT;
  ctx.font = 'bold ' + Math.floor(W * 0.25) + 'px sans-serif';
  ctx.fillText('' + countdownNum, W / 2, H * 0.52);
}

function drawPlaying() {
  drawBackground();

  // 有效区域指示圈（跟随弱点移动）
  var r = ROUNDS[currentRound].hitRadius;
  var wpAbsX = stoneX + weakPointX;
  ctx.save();
  ctx.translate(shakeX, 0);
  ctx.strokeStyle = 'rgba(79,195,247,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(wpAbsX, stoneY, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 石块
  drawStone(stoneX, stoneY, stoneW, stoneH, crackPercent);

  // 弱点标记
  if (!stoneBroken) drawWeakPoint();

  // 水滴
  for (var i = 0; i < drops.length; i++) {
    drawDrop(drops[i].x, drops[i].y, 14);
  }

  // 水花
  for (var i = 0; i < splashes.length; i++) {
    var sp = splashes[i];
    for (var j = 0; j < sp.particles.length; j++) {
      var p = sp.particles[j];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = COLOR_DROP;
      ctx.beginPath();
      ctx.arc(sp.x + p.dx, sp.y + p.dy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 碎片
  for (var i = 0; i < debris.length; i++) {
    var d = debris[i];
    ctx.save();
    ctx.globalAlpha = d.alpha;
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = COLOR_STONE;
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // 反馈文字
  for (var i = 0; i < feedbacks.length; i++) {
    var fb = feedbacks[i];
    ctx.globalAlpha = fb.alpha;
    ctx.fillStyle = fb.color;
    ctx.font = 'bold ' + Math.floor(W * 0.05) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fb.text, fb.x, fb.y);
  }
  ctx.globalAlpha = 1;

  drawWater();

  // HUD
  drawHUD();
}

function drawHUD() {
  var hudY = H * 0.07;
  var fontSize = Math.floor(W * 0.038);
  var bigFont = Math.floor(W * 0.065);

  // 局名
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = 'bold ' + fontSize + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(ROUNDS[currentRound].name, W * 0.05, hudY);
  ctx.fillStyle = COLOR_WHITE_A;
  ctx.font = Math.floor(W * 0.03) + 'px sans-serif';
  ctx.fillText('第' + (currentRound + 1) + '/3局', W * 0.05, hudY + fontSize * 1.1);

  // 倒计时
  ctx.textAlign = 'center';
  ctx.fillStyle = timeLeft <= 5 ? COLOR_MISS_TEXT : COLOR_HIT_TEXT;
  ctx.font = 'bold ' + bigFont + 'px sans-serif';
  ctx.fillText(timeLeft + 's', W / 2, hudY + fontSize * 0.4);

  // 得分
  ctx.textAlign = 'right';
  ctx.fillStyle = COLOR_WHITE_A;
  ctx.font = Math.floor(W * 0.03) + 'px sans-serif';
  ctx.fillText('得分', W * 0.95, hudY - fontSize * 0.3);
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = 'bold ' + Math.floor(W * 0.058) + 'px sans-serif';
  ctx.fillText('' + score, W * 0.95, hudY + fontSize * 0.7);

  // 进度条
  var barX = W * 0.05;
  var barY = hudY + fontSize * 2.2;
  var barW = W * 0.9;
  var barH = 5;

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  drawRoundRect(barX, barY, barW, barH, 2);
  ctx.fill();

  if (crackPercent > 0) {
    var grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#4fc3f7');
    grad.addColorStop(1, '#ffa726');
    ctx.fillStyle = grad;
    drawRoundRect(barX, barY, barW * crackPercent / 100, barH, 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = Math.floor(W * 0.025) + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('石块损伤 ' + crackPercent + '%', barX, barY + barH + 14);

  // 风力指示
  drawWindIndicator();

  // 开局前几秒显示操作提示
  if (timeLeft > 26) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(Date.now() * 0.004) * 0.15) + ')';
    ctx.font = Math.floor(W * 0.032) + 'px sans-serif';
    ctx.fillText('点击屏幕 → 瞄准红色弱点释放水滴', W / 2, H * 0.22);
  }
}

function drawRoundEnd() {
  drawBackground();
  drawWater();

  ctx.fillStyle = 'rgba(10,14,39,0.8)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // 结果
  ctx.fillStyle = COLOR_HIT_TEXT;
  ctx.font = 'bold ' + Math.floor(W * 0.08) + 'px sans-serif';
  ctx.fillText(stoneBroken ? '石块击穿！' : '时间到！', W / 2, H * 0.35);

  // 本局得分
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = Math.floor(W * 0.045) + 'px sans-serif';
  ctx.fillText('本局得分: ' + roundScore, W / 2, H * 0.43);

  // 命中次数
  ctx.fillText('命中次数: ' + hits, W / 2, H * 0.49);

  if (currentRound < 2) {
    ctx.fillStyle = COLOR_WHITE_A;
    ctx.font = Math.floor(W * 0.035) + 'px sans-serif';
    ctx.fillText('下一局: ' + ROUNDS[currentRound + 1].name, W / 2, H * 0.57);
    drawButton(W / 2, H * 0.68, W * 0.45, H * 0.06, '继续挑战', '#4fc3f7', '#0288d1');
  } else {
    drawButton(W / 2, H * 0.68, W * 0.45, H * 0.06, '查看成绩', '#4fc3f7', '#0288d1');
  }
}

function drawResult() {
  drawBackground();
  drawWater();

  ctx.textAlign = 'center';

  // 标题
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = 'bold ' + Math.floor(W * 0.07) + 'px sans-serif';
  ctx.fillText('挑战完成', W / 2, H * 0.1);

  ctx.fillStyle = COLOR_WHITE_A;
  ctx.font = Math.floor(W * 0.03) + 'px sans-serif';
  ctx.fillText('水滴石穿', W / 2, H * 0.14);

  // 总分
  ctx.fillStyle = COLOR_WHITE_A;
  ctx.font = Math.floor(W * 0.035) + 'px sans-serif';
  ctx.fillText('总得分', W / 2, H * 0.2);

  ctx.fillStyle = COLOR_HIT_TEXT;
  ctx.font = 'bold ' + Math.floor(W * 0.16) + 'px sans-serif';
  ctx.fillText('' + score, W / 2, H * 0.28);

  // 评级
  var rank = '';
  if (score >= 800) rank = '大师级 - 水滴石穿！';
  else if (score >= 500) rank = '高手级 - 锲而不舍';
  else if (score >= 300) rank = '进阶级 - 持之以恒';
  else if (score >= 100) rank = '入门级 - 初露锋芒';
  else rank = '初学者 - 继续加油';

  ctx.fillStyle = '#ffb74d';
  ctx.font = Math.floor(W * 0.04) + 'px sans-serif';
  ctx.fillText(rank, W / 2, H * 0.34);

  // 各局详情卡片
  var cardW = W * 0.85;
  var cardH = H * 0.085;
  var startY = H * 0.4;

  for (var i = 0; i < roundResults.length; i++) {
    var r = roundResults[i];
    var cy = startY + i * (cardH + 12);

    // 卡片背景
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    drawRoundRect(W / 2 - cardW / 2, cy, cardW, cardH, 10);
    ctx.fill();

    // 局名
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOR_WHITE_A;
    ctx.font = Math.floor(W * 0.03) + 'px sans-serif';
    ctx.fillText('第' + (i + 1) + '局', W / 2 - cardW / 2 + 15, cy + cardH * 0.42);
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = Math.floor(W * 0.035) + 'px sans-serif';
    ctx.fillText(r.name, W / 2 - cardW / 2 + 65, cy + cardH * 0.42);

    // 统计
    var statX = W / 2 + cardW * 0.05;
    var statGap = cardW * 0.18;

    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = 'bold ' + Math.floor(W * 0.035) + 'px sans-serif';
    ctx.fillText('' + r.score, statX, cy + cardH * 0.35);
    ctx.fillText('' + r.hits, statX + statGap, cy + cardH * 0.35);
    ctx.fillText(r.crack + '%', statX + statGap * 2, cy + cardH * 0.35);

    ctx.fillStyle = r.broken ? COLOR_HIT_TEXT : COLOR_WHITE_A;
    ctx.fillText(r.broken ? '击穿' : '未穿', statX + statGap * 3, cy + cardH * 0.35);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = Math.floor(W * 0.022) + 'px sans-serif';
    ctx.fillText('得分', statX, cy + cardH * 0.7);
    ctx.fillText('命中', statX + statGap, cy + cardH * 0.7);
    ctx.fillText('损伤', statX + statGap * 2, cy + cardH * 0.7);
    ctx.fillText('结果', statX + statGap * 3, cy + cardH * 0.7);
  }

  // 按钮
  var btnY = H * 0.78;
  drawButton(W / 2, btnY, W * 0.5, H * 0.055, '再来一次', '#4fc3f7', '#0288d1');
  drawButton(W / 2, btnY + H * 0.08, W * 0.5, H * 0.055, '返回首页', 'transparent', 'transparent', true);
}

function drawButton(x, y, w, h, text, c1, c2, outline) {
  ctx.save();
  if (outline) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    drawRoundRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.stroke();
  } else {
    var grad = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    // 阴影
    ctx.shadowColor = 'rgba(2,136,209,0.35)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 4;
    drawRoundRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
  }

  ctx.fillStyle = outline ? 'rgba(255,255,255,0.6)' : COLOR_WHITE;
  ctx.font = 'bold ' + Math.floor(W * 0.04) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ==================== 移动弱点系统 ====================
// 石块上有一个发光的弱点标记，玩家需要让水滴对准弱点
var weakPointX = 0;           // 弱点相对石块中心的X偏移
var weakPointDir = 1;         // 移动方向
var weakPointRange = 0;       // 移动范围（每局不同）
var weakPointSpeed = 0;       // 移动速度

// 风力系统 — 水滴下落时会被风吹偏
var windForce = 0;            // 当前风力（正=右，负=左）
var windTarget = 0;           // 目标风力
var windChangeTimer = 0;      // 风力变化计时

var ROUND_WEAK_CONFIG = [
  { range: 0.15, speed: 0.6, windMax: 0 },      // 第1局: 弱点小幅移动，无风
  { range: 0.3,  speed: 1.0, windMax: 0.8 },     // 第2局: 弱点中幅移动，小风
  { range: 0.42, speed: 1.6, windMax: 1.8 }      // 第3局: 弱点大幅移动，强风
];

function updateWeakPoint(dt) {
  var t = dt * 0.06;
  // 弱点左右移动
  weakPointX += weakPointDir * weakPointSpeed * t;
  var maxOff = stoneW * weakPointRange;
  if (weakPointX > maxOff) { weakPointX = maxOff; weakPointDir = -1; }
  if (weakPointX < -maxOff) { weakPointX = -maxOff; weakPointDir = 1; }

  // 随机反转方向
  if (Math.random() < 0.005 * t) weakPointDir *= -1;

  // 风力渐变
  windChangeTimer -= t;
  if (windChangeTimer <= 0) {
    windTarget = (Math.random() - 0.5) * 2 * ROUND_WEAK_CONFIG[currentRound].windMax;
    windChangeTimer = 60 + Math.random() * 120;
  }
  windForce += (windTarget - windForce) * 0.02 * t;
}

function drawWeakPoint() {
  var wpx = stoneX + weakPointX;
  var wpy = stoneY;
  var pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.3;

  // 外圈
  ctx.save();
  ctx.translate(shakeX, 0);
  ctx.globalAlpha = pulse * 0.4;
  ctx.fillStyle = '#ff5252';
  ctx.beginPath();
  ctx.arc(wpx, wpy, 14, 0, Math.PI * 2);
  ctx.fill();

  // 内圈
  ctx.globalAlpha = pulse * 0.8;
  ctx.fillStyle = '#ff8a80';
  ctx.beginPath();
  ctx.arc(wpx, wpy, 6, 0, Math.PI * 2);
  ctx.fill();

  // 十字准星
  ctx.strokeStyle = 'rgba(255,82,82,' + (pulse * 0.5) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(wpx - 18, wpy); ctx.lineTo(wpx + 18, wpy);
  ctx.moveTo(wpx, wpy - 18); ctx.lineTo(wpx, wpy + 18);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// 风力指示器
function drawWindIndicator() {
  if (ROUND_WEAK_CONFIG[currentRound].windMax <= 0) return;

  var ix = W / 2;
  var iy = H * 0.14;
  var maxW = W * 0.12;

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = Math.floor(W * 0.025) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('风力', ix, iy - 8);

  // 风力条背景
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  drawRoundRect(ix - maxW, iy, maxW * 2, 4, 2);
  ctx.fill();

  // 风力条
  var barLen = (windForce / ROUND_WEAK_CONFIG[currentRound].windMax) * maxW;
  if (Math.abs(barLen) > 1) {
    ctx.fillStyle = Math.abs(windForce) > 1 ? '#ffb74d' : '#4fc3f7';
    if (barLen > 0) {
      ctx.fillRect(ix, iy, barLen, 4);
    } else {
      ctx.fillRect(ix + barLen, iy, -barLen, 4);
    }
  }

  // 中点标记
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(ix - 1, iy - 2, 2, 8);
}

// ==================== 游戏逻辑 ====================

var isFirstPlay = true;

function startGame() {
  currentRound = 0;
  score = 0;
  roundResults = [];
  try { bgm.stop(); bgm.play(); } catch (e) {}

  if (isFirstPlay) {
    state = STATE_GUIDE;
    guideStep = 0;
    guideTapCount = 0;
    guideDrops = [];
    isFirstPlay = false;
  } else {
    startCountdown();
  }
}

function startCountdown() {
  state = STATE_COUNTDOWN;
  countdownNum = 3;

  // 初始化弱点参数
  var wc = ROUND_WEAK_CONFIG[currentRound];
  weakPointX = 0;
  weakPointDir = 1;
  weakPointRange = wc.range;
  weakPointSpeed = wc.speed;
  windForce = 0;
  windTarget = 0;
  windChangeTimer = 60;

  clearInterval(countdownTimer);
  countdownTimer = setInterval(function () {
    countdownNum--;
    if (countdownNum <= 0) {
      clearInterval(countdownTimer);
      startRound();
    }
  }, 800);
}

function startRound() {
  state = STATE_PLAYING;
  timeLeft = ROUND_DURATION;
  roundScore = 0;
  hits = 0;
  crackPercent = 0;
  stoneBroken = false;
  drops = [];
  feedbacks = [];
  splashes = [];
  debris = [];
  shakeX = 0;
  shakeTimer = 0;

  clearInterval(gameTimer);
  gameTimer = setInterval(function () {
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endRound();
    }
  }, 1000);
}

function onTapGame(x, y) {
  if (stoneBroken) return;
  if (y < H * 0.15) return;

  // 创建水滴，带当前风力值
  drops.push({
    x: x,
    y: 0,
    speed: ROUNDS[currentRound].dropSpeed,
    wind: windForce   // 记录释放时的风力
  });
  playSfx(sfxDrop);
  wx.vibrateShort({ type: 'light' });
}

function updateDrops(dt) {
  for (var i = drops.length - 1; i >= 0; i--) {
    var d = drops[i];
    d.y += d.speed * dt * 0.06;
    d.x += d.wind * dt * 0.06;   // 风力偏移

    if (d.y >= stoneY - stoneH / 2) {
      checkHit(d.x);
      drops.splice(i, 1);
    }
  }
}

function checkHit(dropX) {
  var cfg = ROUNDS[currentRound];
  // 判定：水滴落点距离弱点的距离
  var targetAbsX = stoneX + weakPointX;
  var dist = Math.abs(dropX - targetAbsX);
  var isHit = dist <= cfg.hitRadius;

  if (isHit) {
    hits++;
    // 精准度奖励: 越靠近弱点中心，分数越高（1x ~ 2x）
    var accuracy = 1 - (dist / cfg.hitRadius);
    var bonus = Math.floor(accuracy * cfg.hitScore * 0.5);
    var pts = cfg.hitScore + bonus;
    score += pts;
    roundScore += pts;
    crackPercent = Math.min(100, Math.floor((hits / cfg.hitsToBreak) * 100));

    feedbacks.push({ x: dropX, y: stoneY - stoneH, text: '+' + pts, color: COLOR_HIT_TEXT, alpha: 1, vy: -1.5 });
    spawnSplash(dropX, stoneY - stoneH / 2);
    shakeTimer = 8;
    playSfx(sfxHit);
    wx.vibrateShort({ type: 'medium' });

    if (crackPercent >= 100 && !stoneBroken) {
      stoneBreak();
    }
  } else {
    var miss = cfg.missScore;
    score = Math.max(0, score + miss);
    roundScore += miss;
    feedbacks.push({ x: dropX, y: stoneY - stoneH, text: '' + miss, color: COLOR_MISS_TEXT, alpha: 1, vy: -1.5 });
  }
}

function spawnSplash(x, y) {
  var sp = { x: x, y: y, particles: [] };
  for (var i = 0; i < 6; i++) {
    var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
    var spd = 2 + Math.random() * 3;
    sp.particles.push({
      dx: 0, dy: 0,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      alpha: 1
    });
  }
  splashes.push(sp);
}

function stoneBreak() {
  stoneBroken = true;
  playSfx(sfxBreak);
  try { wx.vibrateLong(); } catch (e) {}

  for (var i = 0; i < 8; i++) {
    debris.push({
      x: stoneX + (Math.random() - 0.5) * stoneW * 0.6,
      y: stoneY + (Math.random() - 0.5) * stoneH * 0.4,
      vx: (Math.random() - 0.5) * 6,
      vy: -2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      alpha: 1,
      w: 8 + Math.random() * 12,
      h: 6 + Math.random() * 8
    });
  }

  var timeBonus = timeLeft * 5;
  score += timeBonus;
  roundScore += timeBonus;

  setTimeout(function () {
    endRound();
  }, 1000);
}

function endRound() {
  clearInterval(gameTimer);
  state = STATE_ROUND_END;

  roundResults.push({
    name: ROUNDS[currentRound].name,
    score: roundScore,
    hits: hits,
    crack: crackPercent,
    broken: stoneBroken
  });
}

function nextRound() {
  currentRound++;
  startCountdown();
}

function showResult() {
  state = STATE_RESULT;
  try { bgm.stop(); } catch (e) {}
}

// 更新反馈/水花/碎片/抖动
function updateEffects(dt) {
  for (var i = feedbacks.length - 1; i >= 0; i--) {
    var f = feedbacks[i];
    f.y += f.vy * dt * 0.06;
    f.alpha -= 0.015 * dt * 0.06;
    if (f.alpha <= 0) feedbacks.splice(i, 1);
  }

  for (var i = splashes.length - 1; i >= 0; i--) {
    var sp = splashes[i];
    var allDead = true;
    for (var j = 0; j < sp.particles.length; j++) {
      var p = sp.particles[j];
      p.dx += p.vx * dt * 0.06;
      p.dy += p.vy * dt * 0.06;
      p.vy += 0.08 * dt * 0.06;
      p.alpha -= 0.02 * dt * 0.06;
      if (p.alpha > 0) allDead = false;
    }
    if (allDead) splashes.splice(i, 1);
  }

  for (var i = debris.length - 1; i >= 0; i--) {
    var d = debris[i];
    d.x += d.vx * dt * 0.06;
    d.y += d.vy * dt * 0.06;
    d.vy += 0.15 * dt * 0.06;
    d.rot += 0.03 * dt * 0.06;
    d.alpha -= 0.01 * dt * 0.06;
    if (d.alpha <= 0) debris.splice(i, 1);
  }

  if (shakeTimer > 0) {
    shakeTimer--;
    shakeX = (Math.random() - 0.5) * 6;
  } else {
    shakeX = 0;
  }
}

// 更新引导中的演示水滴
function updateGuideDrops(dt) {
  for (var i = guideDrops.length - 1; i >= 0; i--) {
    var d = guideDrops[i];
    d.y += 3 * dt * 0.06;
    if (d.y >= stoneY - stoneH / 2) {
      spawnSplash(d.x, stoneY - stoneH / 2);
      guideDrops.splice(i, 1);
    }
  }
}

// ==================== 主循环 ====================

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  var dt = timestamp - lastTime;
  if (dt > 50) dt = 50;
  lastTime = timestamp;

  ctx.clearRect(0, 0, W, H);

  switch (state) {
    case STATE_MENU:
      drawMenu();
      break;
    case STATE_GUIDE:
      updateGuideDrops(dt);
      updateEffects(dt);
      drawGuide();
      break;
    case STATE_COUNTDOWN:
      updateWeakPoint(dt);
      drawCountdown();
      break;
    case STATE_PLAYING:
      updateWeakPoint(dt);
      updateDrops(dt);
      updateEffects(dt);
      drawPlaying();
      break;
    case STATE_ROUND_END:
      updateEffects(dt);
      drawPlaying();
      drawRoundEnd();
      break;
    case STATE_RESULT:
      drawResult();
      break;
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// ==================== 触摸事件 ====================

wx.onTouchStart(function (res) {
  if (!res.touches || !res.touches.length) return;
  var x = res.touches[0].clientX;
  var y = res.touches[0].clientY;

  switch (state) {
    case STATE_MENU:
      if (hitTestButton(x, y, W / 2, H * 0.82, W * 0.5, H * 0.065)) {
        startGame();
      }
      break;

    case STATE_GUIDE:
      if (guideStep === 0) {
        // 点击进入试玩步骤
        guideStep = 1;
      } else if (guideStep === 1) {
        // 试玩: 点击释放水滴
        if (y > H * 0.2) {
          guideDrops.push({ x: x, y: 0 });
          guideTapCount++;
          playSfx(sfxDrop);
          wx.vibrateShort({ type: 'light' });
          if (guideTapCount >= 3) {
            setTimeout(function () { guideStep = 2; }, 600);
          }
        }
      } else if (guideStep === 2) {
        if (hitTestButton(x, y, W / 2, H * 0.66, W * 0.5, H * 0.065)) {
          startCountdown();
        }
      }
      break;

    case STATE_PLAYING:
      onTapGame(x, y);
      break;

    case STATE_ROUND_END:
      if (hitTestButton(x, y, W / 2, H * 0.68, W * 0.45, H * 0.06)) {
        if (currentRound < 2) {
          nextRound();
        } else {
          showResult();
        }
      }
      break;

    case STATE_RESULT:
      if (hitTestButton(x, y, W / 2, H * 0.78, W * 0.5, H * 0.055)) {
        startGame();
      }
      if (hitTestButton(x, y, W / 2, H * 0.78 + H * 0.08, W * 0.5, H * 0.055)) {
        state = STATE_MENU;
      }
      break;
  }
});

function hitTestButton(tx, ty, bx, by, bw, bh) {
  return tx >= bx - bw / 2 && tx <= bx + bw / 2 && ty >= by - bh / 2 && ty <= by + bh / 2;
}
