// ======================================================
// 冲高高 — 抖音小游戏
// ======================================================

var canvas = tt.createCanvas();
var ctx = canvas.getContext('2d');
var sysInfo = tt.getSystemInfoSync();
var W = sysInfo.windowWidth;
var H = sysInfo.windowHeight;
var dpr = sysInfo.pixelRatio || 2;

canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

// ==================== 常量配置 ====================
var BLOCK_HEIGHT = 25;
var BASE_WIDTH = W * 0.4;
var BASE_SPEED = 150;
var PERFECT_THRESHOLD = 5;
var PERFECT_RESTORE = 4;

var BG_COLORS = [
  { at: 0,  color: [135, 206, 235] },
  { at: 20, color: [70, 130, 180] },
  { at: 40, color: [25, 25, 112] },
  { at: 60, color: [75, 0, 130] },
  { at: 80, color: [20, 20, 40] }
];

var BLOCK_COLORS_HSL = [];
for (var i = 0; i < 200; i++) {
  BLOCK_COLORS_HSL.push({ h: (i * 8) % 360, s: 70, l: 60 });
}

var stars = [];
for (var i = 0; i < 60; i++) {
  stars.push({
    x: Math.random() * W,
    yBase: Math.random() * H * 3,
    size: Math.random() * 2 + 0.5,
    twinkleSpeed: 1 + Math.random() * 2,
    twinkleOffset: Math.random() * Math.PI * 2
  });
}

// ==================== 音频系统 ====================

var audioCtx = null;
var masterGain = null;
var bgmGain = null;
var sfxGain = null;
var bgmScheduledUntil = 0;
var bgmPlaying = false;
var audioMuted = false;

// 音符频率（C大调五声音阶）
var NF = {
  A2:110, G2:98, C3:130.81, D3:146.83, E3:164.81, G3:196, A3:220,
  C4:261.63, D4:293.66, E4:329.63, G4:392, A4:440,
  C5:523.25, D5:587.33, E5:659.25, G5:784, A5:880, C6:1046.5
};

var BGM_BPM = 140;
var BGM_STEP = 60 / BGM_BPM / 4;
var BGM_LOOP_STEPS = 64;
var BGM_LOOP_DUR = BGM_LOOP_STEPS * BGM_STEP;

// 旋律：魔性上行+下行五声音阶 [频率, 起始第几个16分音符, 持续几个16分音符]
var BGM_MELODY = [
  [NF.E5,0,1],[NF.E5,2,1],[NF.G5,3,1],[NF.A5,4,2],[NF.G5,7,1],
  [NF.E5,8,1],[NF.D5,10,1],[NF.E5,12,2],
  [NF.E5,16,1],[NF.G5,18,1],[NF.A5,19,1],[NF.C6,20,2],[NF.A5,23,1],
  [NF.G5,24,1],[NF.E5,26,1],[NF.D5,28,2],
  [NF.D5,32,1],[NF.D5,34,1],[NF.E5,35,1],[NF.G5,36,2],[NF.E5,39,1],
  [NF.D5,40,1],[NF.C5,42,1],[NF.D5,44,2],
  [NF.C5,48,1],[NF.D5,50,1],[NF.E5,51,1],[NF.G5,52,1],[NF.A5,53,2],
  [NF.G5,56,1],[NF.E5,57,1],[NF.D5,58,1],[NF.C5,59,2]
];

// 低音线
var BGM_BASS = [
  [NF.C3,0,3],[NF.C3,4,3],[NF.A2,8,3],[NF.G2,12,3],
  [NF.C3,16,3],[NF.E3,20,3],[NF.A2,24,3],[NF.G2,28,3],
  [NF.D3,32,3],[NF.D3,36,3],[NF.G2,40,3],[NF.G2,44,3],
  [NF.C3,48,3],[NF.E3,52,3],[NF.G2,56,3],[NF.C3,60,3]
];

// 鼓点
var BGM_KICK = [0,8,16,24,32,40,48,56];
var BGM_HIHAT = [];
for (var _i = 0; _i < 64; _i += 2) BGM_HIHAT.push(_i);
var BGM_SNARE = [4,12,20,28,36,44,52,60];

// 延迟创建 AudioContext，必须在用户交互时调用
function ensureAudio() {
  if (audioCtx) return true;
  try {
    audioCtx = new AudioContext();
  } catch(e) {
    try { audioCtx = new (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : AudioContext)(); } catch(e2) { return false; }
  }
  masterGain = audioCtx.createGain();
  masterGain.gain.value = audioMuted ? 0 : 0.4;
  masterGain.connect(audioCtx.destination);
  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 0.45;
  bgmGain.connect(masterGain);
  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.7;
  sfxGain.connect(masterGain);
  return true;
}

function resumeAudio() {
  if (!ensureAudio()) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, time, dur, type, vol, dest) {
  if (!audioCtx) return;
  var osc = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.95);
  osc.connect(g);
  g.connect(dest || bgmGain);
  osc.start(time);
  osc.stop(time + dur);
}

function playKick(time) {
  if (!audioCtx) return;
  var osc = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
  g.gain.setValueAtTime(0.25, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(g);
  g.connect(bgmGain);
  osc.start(time);
  osc.stop(time + 0.15);
}

function playNoise(time, dur, vol, hp) {
  if (!audioCtx) return;
  var sr = audioCtx.sampleRate;
  var len = Math.ceil(sr * dur);
  var buf = audioCtx.createBuffer(1, len, sr);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);
  var flt = audioCtx.createBiquadFilter();
  flt.type = 'highpass';
  flt.frequency.value = hp || 8000;
  src.connect(flt);
  flt.connect(g);
  g.connect(bgmGain);
  src.start(time);
  src.stop(time + dur);
}

function scheduleBGMLoop(t0) {
  var s = BGM_STEP;
  for (var i = 0; i < BGM_MELODY.length; i++) {
    var m = BGM_MELODY[i];
    playTone(m[0], t0 + m[1] * s, m[2] * s * 0.9, 'square', 0.07);
  }
  for (var i = 0; i < BGM_BASS.length; i++) {
    var b = BGM_BASS[i];
    playTone(b[0], t0 + b[1] * s, b[2] * s * 0.9, 'triangle', 0.1);
  }
  for (var i = 0; i < BGM_KICK.length; i++) playKick(t0 + BGM_KICK[i] * s);
  for (var i = 0; i < BGM_SNARE.length; i++) playNoise(t0 + BGM_SNARE[i] * s, 0.08, 0.06, 4000);
  for (var i = 0; i < BGM_HIHAT.length; i++) playNoise(t0 + BGM_HIHAT[i] * s, 0.04, 0.03, 9000);
}

function startBGM() {
  if (!audioCtx || bgmPlaying) return;
  bgmPlaying = true;
  bgmScheduledUntil = audioCtx.currentTime + 0.05;
  updateBGM();
}

function stopBGM() { bgmPlaying = false; }

function updateBGM() {
  if (!audioCtx || !bgmPlaying) return;
  while (bgmScheduledUntil < audioCtx.currentTime + 1.0) {
    scheduleBGMLoop(bgmScheduledUntil);
    bgmScheduledUntil += BGM_LOOP_DUR;
  }
}

function toggleMute() {
  audioMuted = !audioMuted;
  if (masterGain) masterGain.gain.value = audioMuted ? 0 : 0.4;
}

// 音效
function sfxPlace() {
  if (!audioCtx) return;
  var t = audioCtx.currentTime;
  playTone(400, t, 0.08, 'sine', 0.2, sfxGain);
  playTone(280, t + 0.03, 0.06, 'sine', 0.12, sfxGain);
}

function sfxPerfect(c) {
  if (!audioCtx) return;
  var t = audioCtx.currentTime;
  var base = 523 + Math.min(c, 10) * 30;
  playTone(base, t, 0.1, 'square', 0.1, sfxGain);
  playTone(base * 1.25, t + 0.07, 0.1, 'square', 0.1, sfxGain);
  playTone(base * 1.5, t + 0.14, 0.15, 'square', 0.12, sfxGain);
  playTone(base * 2, t + 0.2, 0.2, 'sine', 0.06, sfxGain);
}

function sfxGameOver() {
  if (!audioCtx) return;
  var t = audioCtx.currentTime;
  playTone(440, t, 0.2, 'square', 0.1, sfxGain);
  playTone(370, t + 0.15, 0.2, 'square', 0.1, sfxGain);
  playTone(330, t + 0.3, 0.25, 'square', 0.1, sfxGain);
  playTone(262, t + 0.5, 0.5, 'triangle', 0.12, sfxGain);
}

// ==================== 工具函数 ====================

function hsl(h, s, l) {
  return 'hsl(' + h + ',' + s + '%,' + l + '%)';
}

function blockColor(idx) {
  return BLOCK_COLORS_HSL[idx % BLOCK_COLORS_HSL.length];
}

function getBgColor(level) {
  if (level <= BG_COLORS[0].at) return BG_COLORS[0].color;
  if (level >= BG_COLORS[BG_COLORS.length - 1].at) return BG_COLORS[BG_COLORS.length - 1].color;
  for (var i = 0; i < BG_COLORS.length - 1; i++) {
    if (level >= BG_COLORS[i].at && level <= BG_COLORS[i + 1].at) {
      var t = (level - BG_COLORS[i].at) / (BG_COLORS[i + 1].at - BG_COLORS[i].at);
      return BG_COLORS[i].color.map(function (c, j) {
        return Math.round(c + (BG_COLORS[i + 1].color[j] - c) * t);
      });
    }
  }
  return BG_COLORS[0].color;
}

function getSpeed(level) {
  if (level < 5) return BASE_SPEED;
  if (level < 15) return BASE_SPEED + (level - 5) * 15;
  if (level < 30) return BASE_SPEED + 150 + (level - 15) * 12;
  if (level < 50) return BASE_SPEED + 330 + (level - 30) * 8;
  return BASE_SPEED + 490 + (level - 50) * 4;
}

// ==================== 切割逻辑 ====================

function sliceBlock(current, prev) {
  var overlap = Math.min(current.x + current.width, prev.x + prev.width) -
                Math.max(current.x, prev.x);
  if (overlap <= 0) return null;
  var newX = Math.max(current.x, prev.x);
  var isPerfect = Math.abs(current.x - prev.x) < PERFECT_THRESHOLD;
  var placed = {
    x: isPerfect ? prev.x : newX,
    width: isPerfect ? prev.width : overlap,
    isPerfect: isPerfect
  };
  var cutOff = null;
  if (!isPerfect) {
    var cutWidth = current.width - overlap;
    var cutX = current.x < prev.x ? current.x : current.x + overlap;
    cutOff = { x: cutX, width: cutWidth };
  }
  return { placed: placed, cutOff: cutOff };
}

// ==================== 游戏状态 ====================

var state = 'ready';
var score = 0;
var combo = 0;
var maxCombo = 0;
var level = 0;
var cameraY = 0;
var targetCameraY = 0;
var lastTime = 0;
var gameTime = 0;

var stack = [];
var currentBlock = null;
var cutPieces = [];
var particles = [];
var texts = [];
var screenFlash = 0;
var shakeX = 0;
var shakeY = 0;
var shakeTimer = 0;
var landingAnims = [];

var highScore = 0;
try { highScore = parseInt(tt.getStorageSync('stackTower_highScore') || '0'); } catch (e) { highScore = 0; }

// ==================== 初始化 ====================

function reset() {
  score = 0; combo = 0; maxCombo = 0; level = 0;
  cameraY = 0; targetCameraY = 0;
  cutPieces = []; particles = []; texts = []; landingAnims = [];
  screenFlash = 0; shakeTimer = 0;

  var baseX = (W - BASE_WIDTH) / 2;
  var baseY = H - 80;
  var bc = blockColor(0);
  stack = [{
    x: baseX, y: baseY, width: BASE_WIDTH, height: BLOCK_HEIGHT,
    hsl: bc, direction: 0, speed: 0, settled: true, isBase: true
  }];
  spawnBlock();
}

function spawnBlock() {
  level++;
  var prev = stack[stack.length - 1];
  var speed = getSpeed(level);
  var dir = level % 2 === 0 ? 1 : -1;
  var startX = dir === 1 ? -prev.width : W;
  var y = prev.y - BLOCK_HEIGHT;
  var bc = blockColor(level);
  currentBlock = {
    x: startX, y: y, width: prev.width, height: BLOCK_HEIGHT,
    hsl: bc, direction: dir, speed: speed, settled: false
  };
  if (y - cameraY < H * 0.4) targetCameraY = y - H * 0.4;
}

// ==================== 输入处理 ====================

function handleTap() {
  if (state === 'ready') {
    state = 'playing';
    resumeAudio();
    startBGM();
    return;
  }
  if (state === 'over') {
    reset();
    state = 'playing';
    startBGM();
    return;
  }
  if (!currentBlock) return;

  var prev = stack[stack.length - 1];
  var result = sliceBlock(currentBlock, prev);
  if (!result) { gameOver(); return; }

  var placed = result.placed;
  var cutOff = result.cutOff;
  var newWidth = placed.width;

  if (placed.isPerfect) {
    combo++;
    var restore = Math.min(PERFECT_RESTORE * combo, 20);
    newWidth = Math.min(placed.width + restore, BASE_WIDTH);
    addPerfectText(placed.x + newWidth / 2, currentBlock.y - 20, combo);
    addPerfectParticles(placed.x, currentBlock.y, newWidth, currentBlock.hsl);
    score += 3;
    sfxPerfect(combo);
  } else {
    combo = 0;
    score += 1;
    triggerShake(2, 0.15);
    sfxPlace();
  }
  maxCombo = Math.max(maxCombo, combo);

  var settledBlock = {
    x: placed.x, y: currentBlock.y, width: newWidth, height: BLOCK_HEIGHT,
    hsl: currentBlock.hsl, direction: 0, speed: 0, settled: true
  };
  stack.push(settledBlock);
  landingAnims.push({ block: settledBlock, progress: 0, duration: 0.15 });

  if (cutOff) {
    cutPieces.push({
      x: cutOff.x, y: currentBlock.y, width: cutOff.width, height: BLOCK_HEIGHT,
      hsl: currentBlock.hsl,
      vx: currentBlock.direction * 50, vy: 0,
      rotation: 0, rotSpeed: (Math.random() - 0.5) * 3, alpha: 1
    });
  }
  currentBlock = null;
  spawnBlock();
}

function gameOver() {
  state = 'over';
  triggerShake(5, 0.3);
  stopBGM();
  sfxGameOver();
  if (score > highScore) {
    highScore = score;
    try { tt.setStorageSync('stackTower_highScore', String(highScore)); } catch (e) {}
  }
  if (currentBlock) {
    cutPieces.push({
      x: currentBlock.x, y: currentBlock.y, width: currentBlock.width, height: BLOCK_HEIGHT,
      hsl: currentBlock.hsl,
      vx: currentBlock.direction * 80, vy: 0,
      rotation: 0, rotSpeed: (Math.random() - 0.5) * 3, alpha: 1
    });
    currentBlock = null;
  }
}

// ==================== 特效 ====================

function triggerShake(intensity, duration) {
  shakeTimer = duration;
  shakeX = intensity;
  shakeY = intensity;
}

function addPerfectText(x, y, c) {
  texts.push({ x: x, y: y, combo: c, life: 1.2, scale: 0, targetScale: 1.3 });
  screenFlash = 0.3 + Math.min(c * 0.05, 0.3);
}

function addPerfectParticles(x, y, width, blockHsl) {
  var count = 20 + Math.min(combo * 3, 20);
  for (var i = 0; i < count; i++) {
    var isStar = Math.random() > 0.6;
    particles.push({
      x: x + Math.random() * width, y: y,
      vx: (Math.random() - 0.5) * 350,
      vy: -Math.random() * 250 - 80,
      size: isStar ? Math.random() * 5 + 3 : Math.random() * 4 + 2,
      hsl: { h: blockHsl.h + (Math.random() - 0.5) * 40, s: 80, l: 70 },
      life: 1.0, decay: 0.6 + Math.random() * 0.5, isStar: isStar
    });
  }
}

// ==================== 更新 ====================

function update(dt) {
  gameTime += dt;
  if (state === 'ready') return;

  if (state === 'playing') {
    if (currentBlock && !currentBlock.settled) {
      currentBlock.x += currentBlock.speed * currentBlock.direction * dt;
      if (currentBlock.x + currentBlock.width > W) currentBlock.direction = -1;
      else if (currentBlock.x < 0) currentBlock.direction = 1;
    }
    cameraY += (targetCameraY - cameraY) * 4 * dt;
  }

  if (shakeTimer > 0) {
    shakeTimer -= dt;
    shakeX = (Math.random() - 0.5) * shakeTimer * 40;
    shakeY = (Math.random() - 0.5) * shakeTimer * 20;
  } else { shakeX = 0; shakeY = 0; }

  var wi = 0;
  for (var i = 0; i < landingAnims.length; i++) {
    landingAnims[i].progress += dt / landingAnims[i].duration;
    if (landingAnims[i].progress < 1) landingAnims[wi++] = landingAnims[i];
  }
  landingAnims.length = wi;

  wi = 0;
  for (var i = 0; i < cutPieces.length; i++) {
    var p = cutPieces[i];
    p.vy += 800 * dt; p.y += p.vy * dt; p.x += p.vx * dt;
    p.rotation += p.rotSpeed * dt; p.alpha -= 0.8 * dt;
    if (p.alpha > 0) cutPieces[wi++] = p;
  }
  cutPieces.length = wi;

  wi = 0;
  for (var i = 0; i < particles.length; i++) {
    var pt = particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 300 * dt;
    pt.life -= pt.decay * dt;
    if (pt.life > 0) particles[wi++] = pt;
  }
  particles.length = wi;

  wi = 0;
  for (var i = 0; i < texts.length; i++) {
    var t = texts[i];
    t.life -= dt * 0.7; t.y -= 50 * dt;
    t.scale += (t.targetScale - t.scale) * 8 * dt;
    if (t.life > 0) texts[wi++] = t;
  }
  texts.length = wi;

  if (screenFlash > 0) screenFlash -= dt * 2;

  // BGM 调度
  updateBGM();
}

// ==================== 渲染 ====================

function drawBlock(block, offY, squashT) {
  var x = Math.round(block.x);
  var y = Math.round(block.y - offY);
  var w = Math.round(block.width);
  var h = block.height;
  var depth = 5;
  var c = block.hsl;

  if (squashT !== undefined && squashT < 1) {
    var sq = 1 + 0.3 * Math.sin(squashT * Math.PI);
    var st = 1 / sq;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(sq, st);
    ctx.translate(-(x + w / 2), -(y + h));
  }

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x + 2, y + h, w, 3);

  var grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, hsl(c.h, c.s, c.l + 8));
  grad.addColorStop(1, hsl(c.h, c.s, c.l - 5));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, 3);

  ctx.fillStyle = hsl(c.h, c.s - 5, c.l + 18);
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + depth, y - depth);
  ctx.lineTo(x + w + depth, y - depth); ctx.lineTo(x + w, y);
  ctx.closePath(); ctx.fill();

  var sg = ctx.createLinearGradient(x + w, y, x + w + depth, y + h);
  sg.addColorStop(0, hsl(c.h, c.s, c.l - 15));
  sg.addColorStop(1, hsl(c.h, c.s, c.l - 25));
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(x + w, y); ctx.lineTo(x + w + depth, y - depth);
  ctx.lineTo(x + w + depth, y + h - depth); ctx.lineTo(x + w, y + h);
  ctx.closePath(); ctx.fill();

  if (squashT !== undefined && squashT < 1) ctx.restore();
}

function drawBaseBlock(block, offY) {
  var x = Math.round(block.x);
  var y = Math.round(block.y - offY);
  var w = Math.round(block.width);
  var h = block.height + 4;

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 3, y + h, w, 4);

  var grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#8a8a8a'); grad.addColorStop(0.3, '#c0c0c0');
  grad.addColorStop(0.5, '#e0e0e0'); grad.addColorStop(0.7, '#c0c0c0');
  grad.addColorStop(1, '#707070');
  ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, w, 2);

  ctx.fillStyle = '#d0d0d0';
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + 5, y - 5);
  ctx.lineTo(x + w + 5, y - 5); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#606060';
  ctx.beginPath();
  ctx.moveTo(x + w, y); ctx.lineTo(x + w + 5, y - 5);
  ctx.lineTo(x + w + 5, y + h - 5); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
}

function drawCutPiece(piece, offY) {
  if (piece.alpha <= 0) return;
  var c = piece.hsl;
  ctx.save();
  ctx.globalAlpha = Math.max(0, piece.alpha);
  ctx.translate(piece.x + piece.width / 2, piece.y - offY + piece.height / 2);
  ctx.rotate(piece.rotation);
  ctx.fillStyle = hsl(c.h, c.s, c.l);
  ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
  ctx.restore();
}

function drawStar(cx, cy, r) {
  ctx.beginPath();
  for (var i = 0; i < 5; i++) {
    var a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath(); ctx.fill();
}

function drawBackground() {
  var bgc = getBgColor(level);
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgb(' + Math.max(0,bgc[0]-30) + ',' + Math.max(0,bgc[1]-30) + ',' + Math.max(0,bgc[2]-30) + ')');
  grad.addColorStop(1, 'rgb(' + bgc[0] + ',' + bgc[1] + ',' + bgc[2] + ')');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (level > 15) {
    var sa = Math.min((level - 15) / 20, 0.8);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var sy = ((s.yBase - cameraY * 0.3) % (H + 20));
      if (sy < 0) sy += H + 20;
      var tw = 0.4 + 0.6 * Math.abs(Math.sin(gameTime * s.twinkleSpeed + s.twinkleOffset));
      ctx.save(); ctx.globalAlpha = sa * tw; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, sy, s.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// 绘制音量图标
function drawMuteBtn() {
  var bx = W - 40, by = 15, sz = 20;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  // 喇叭形状
  ctx.beginPath();
  ctx.moveTo(bx, by + 6); ctx.lineTo(bx + 5, by + 6);
  ctx.lineTo(bx + 10, by + 2); ctx.lineTo(bx + 10, by + sz - 2);
  ctx.lineTo(bx + 5, by + sz - 6); ctx.lineTo(bx, by + sz - 6);
  ctx.closePath(); ctx.fill();
  if (!audioMuted) {
    // 声波
    ctx.beginPath(); ctx.arc(bx + 13, by + sz / 2, 4, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx + 13, by + sz / 2, 8, -0.5, 0.5); ctx.stroke();
  } else {
    // 叉号
    ctx.beginPath();
    ctx.moveTo(bx + 13, by + 5); ctx.lineTo(bx + 21, by + sz - 5);
    ctx.moveTo(bx + 21, by + 5); ctx.lineTo(bx + 13, by + sz - 5);
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  ctx.save();
  if (shakeTimer > 0) ctx.translate(shakeX, shakeY);

  drawBackground();

  if (combo >= 3 && state === 'playing') {
    var tb = stack[stack.length - 1];
    var gy = tb.y - cameraY;
    var ga = Math.min(combo * 0.06, 0.4);
    var gr = 40 + combo * 5;
    var grd = ctx.createRadialGradient(tb.x + tb.width / 2, gy, 0, tb.x + tb.width / 2, gy, gr);
    grd.addColorStop(0, 'rgba(255,215,0,' + ga + ')');
    grd.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(tb.x - gr, gy - gr, tb.width + gr * 2, gr * 2);
  }

  var vt = cameraY - BLOCK_HEIGHT * 2;
  var vb = cameraY + H + BLOCK_HEIGHT;
  for (var i = 0; i < stack.length; i++) {
    var blk = stack[i];
    if (blk.y < vt || blk.y > vb) continue;
    var sqT;
    for (var j = 0; j < landingAnims.length; j++) {
      if (landingAnims[j].block === blk) { sqT = landingAnims[j].progress; break; }
    }
    if (blk.isBase) drawBaseBlock(blk, cameraY);
    else drawBlock(blk, cameraY, sqT);
  }

  if (currentBlock) {
    if (state === 'playing') {
      var prev = stack[stack.length - 1];
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(currentBlock.x, prev.y - cameraY + prev.height - BLOCK_HEIGHT, currentBlock.width, BLOCK_HEIGHT);
    }
    drawBlock(currentBlock, cameraY);
    if (state === 'playing') {
      var prev = stack[stack.length - 1];
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(currentBlock.x, currentBlock.y + BLOCK_HEIGHT - cameraY);
      ctx.lineTo(currentBlock.x, prev.y + BLOCK_HEIGHT - cameraY);
      ctx.moveTo(currentBlock.x + currentBlock.width, currentBlock.y + BLOCK_HEIGHT - cameraY);
      ctx.lineTo(currentBlock.x + currentBlock.width, prev.y + BLOCK_HEIGHT - cameraY);
      ctx.stroke(); ctx.restore();
    }
  }

  for (var i = 0; i < cutPieces.length; i++) drawCutPiece(cutPieces[i], cameraY);

  if (screenFlash > 0) {
    ctx.save(); ctx.globalAlpha = screenFlash * 0.3;
    ctx.fillStyle = '#FFD700'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = hsl(p.hsl.h, p.hsl.s, p.hsl.l);
    if (p.isStar) drawStar(p.x, p.y - cameraY, p.size);
    else { ctx.beginPath(); ctx.arc(p.x, p.y - cameraY, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  for (var i = 0; i < texts.length; i++) {
    var t = texts[i];
    ctx.save(); ctx.globalAlpha = Math.max(0, t.life);
    ctx.translate(t.x, t.y - cameraY);
    ctx.scale(t.scale, t.scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tc = '#FFD700', sc = '#B8860B';
    if (t.combo >= 5) {
      var rh = (gameTime * 200 + t.combo * 30) % 360;
      tc = hsl(rh, 100, 65); sc = hsl(rh, 80, 40);
    }
    ctx.shadowColor = tc; ctx.shadowBlur = 10 + t.combo * 2;
    ctx.font = 'bold 30px Arial'; ctx.strokeStyle = sc; ctx.lineWidth = 3;
    ctx.strokeText('Perfect!', 0, 0); ctx.fillStyle = tc; ctx.fillText('Perfect!', 0, 0);
    ctx.shadowBlur = 0;
    if (t.combo > 1) {
      ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#FF6347';
      ctx.shadowColor = '#FF6347'; ctx.shadowBlur = 8;
      ctx.fillText('x' + t.combo, 0, 32);
    }
    ctx.restore();
  }

  ctx.restore();

  // UI
  drawUI();
  drawMuteBtn();

  if (state === 'ready') drawReadyScreen();
  else if (state === 'over') drawGameOverScreen();
}

function drawUI() {
  ctx.save(); ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 42px Arial';
  ctx.fillText(score, W / 2, 55);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.font = '15px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('第 ' + level + ' 层', W / 2, 78);
  if (combo >= 2 && state === 'playing') {
    var bW = 80, bH = 4, bX = W / 2 - bW / 2, bY = 88;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bX, bY, bW, bH);
    var fl = Math.min(combo / 10, 1);
    var cg = ctx.createLinearGradient(bX, bY, bX + bW * fl, bY);
    cg.addColorStop(0, '#FFD700'); cg.addColorStop(1, '#FF6347');
    ctx.fillStyle = cg; ctx.fillRect(bX, bY, bW * fl, bH);
    ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#FFD700';
    ctx.fillText('x' + combo + ' COMBO', W / 2, bY + 16);
  }
  ctx.restore();
}

function drawReadyScreen() {
  ctx.save(); ctx.textAlign = 'center';
  var bs = 1 + 0.03 * Math.sin(gameTime * 2);
  ctx.translate(W / 2, H / 2 - 60); ctx.scale(bs, bs);
  ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 15;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Arial';
  ctx.fillText('冲高高', 0, 0);
  ctx.shadowBlur = 0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'center';
  var ba = 0.4 + 0.4 * Math.abs(Math.sin(gameTime * 2.5));
  ctx.font = '18px Arial'; ctx.fillStyle = 'rgba(255,255,255,' + ba + ')';
  ctx.fillText('点击屏幕开始', W / 2, H / 2 + 10);
  if (highScore > 0) {
    ctx.font = '15px Arial'; ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.fillText('最高分: ' + highScore, W / 2, H / 2 + 50);
  }
  ctx.restore();
}

function drawGameOverScreen() {
  ctx.save();
  var mg = ctx.createLinearGradient(0, 0, 0, H);
  mg.addColorStop(0, 'rgba(0,0,0,0.3)'); mg.addColorStop(0.5, 'rgba(0,0,0,0.6)'); mg.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  var pW = W * 0.8, pH = 240, pX = (W - pW) / 2, pY = H / 2 - pH / 2 - 20, r = 16;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.moveTo(pX + r, pY); ctx.lineTo(pX + pW - r, pY);
  ctx.arcTo(pX + pW, pY, pX + pW, pY + r, r);
  ctx.lineTo(pX + pW, pY + pH - r);
  ctx.arcTo(pX + pW, pY + pH, pX + pW - r, pY + pH, r);
  ctx.lineTo(pX + r, pY + pH);
  ctx.arcTo(pX, pY + pH, pX, pY + pH - r, r);
  ctx.lineTo(pX, pY + r);
  ctx.arcTo(pX, pY, pX + r, pY, r);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();

  var cy = pY + 30;
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 28px Arial';
  ctx.fillText('游戏结束', W / 2, cy + 25);
  ctx.font = 'bold 52px Arial'; ctx.shadowColor = 'rgba(255,215,0,0.5)'; ctx.shadowBlur = 15;
  ctx.fillStyle = '#FFD700'; ctx.fillText(score, W / 2, cy + 85); ctx.shadowBlur = 0;
  ctx.font = '16px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('第 ' + (level - 1) + ' 层  |  最高连击 ' + maxCombo, W / 2, cy + 120);
  ctx.font = '15px Arial'; ctx.fillStyle = 'rgba(255,215,0,0.7)';
  ctx.fillText('最高分: ' + highScore, W / 2, cy + 148);
  ctx.font = '14px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('我冲到了第' + (level - 1) + '层！你能超过我吗？', W / 2, cy + 180);
  var ba = 0.5 + 0.4 * Math.abs(Math.sin(gameTime * 2.5));
  ctx.font = '18px Arial'; ctx.fillStyle = 'rgba(255,255,255,' + ba + ')';
  ctx.fillText('点击屏幕重新开始', W / 2, pY + pH + 40);
  ctx.restore();
}

// ==================== 主循环 ====================

function loop(timestamp) {
  var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ==================== 事件绑定 ====================

tt.onTouchStart(function (e) {
  // 每次触摸都尝试恢复音频（平台安全策略）
  resumeAudio();
  var touch = e.touches && e.touches[0];
  if (touch) {
    var tx = touch.clientX, ty = touch.clientY;
    if (tx > W - 50 && ty < 50) {
      toggleMute();
      return;
    }
  }
  handleTap();
});

// ==================== 启动 ====================

reset();
state = 'ready';
lastTime = 0;
requestAnimationFrame(loop);
