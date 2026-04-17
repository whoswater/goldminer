// ========== 绿茵逐梦 · 足球主题音效 ==========

// 音符频率表
var N = {
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392, A4:440, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:784, A5:880, B5:987.77,
  C6:1046.5
}

// 足球进行曲风格旋律（激昂、节奏感强）
var MELODY = [
  'E5','E5','F5','G5','G5','F5','E5','D5',
  'C5','C5','D5','E5','E5','D5','D5','D5',
  'E5','E5','F5','G5','G5','F5','E5','D5',
  'C5','C5','D5','E5','D5','C5','C5','C5',
  'D5','D5','E5','C5','D5','E5','F5','E5',
  'C5','D5','E5','F5','E5','D5','C5','D5',
  'E5','E5','F5','G5','G5','F5','E5','D5',
  'C5','C5','D5','E5','D5','C5','C5','C5'
]

// 低音伴奏（鼓点感）
var BASS = [
  'C4','G4','C4','G4','A4','E4','A4','E4',
  'F4','C4','G4','D4','C4','G4','C4','G4'
]

var _ctx = null, _timer = null, _playing = false

function getCtx() {
  if (_ctx) return _ctx
  try { _ctx = wx.createWebAudioContext() } catch(e) { _ctx = null }
  return _ctx
}

function note(ctx, freq, t, dur, type, vol) {
  if (!ctx) return
  try {
    var o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type || 'square'
    o.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol || 0.08, t + 0.01)
    g.gain.linearRampToValueAtTime(0, t + dur * 0.9)
    o.connect(g); g.connect(ctx.destination)
    o.start(t); o.stop(t + dur)
  } catch(e){}
}

function scheduleLoop(ctx, t) {
  var b = 0.12
  for (var i = 0; i < MELODY.length; i++) {
    note(ctx, N[MELODY[i]], t + i * b, b * 0.8, 'square', 0.06)
  }
  for (var j = 0; j < BASS.length; j++) {
    note(ctx, N[BASS[j]] * 0.5, t + j * b * 4, b * 3.5, 'triangle', 0.1)
  }
  // 节奏鼓点（用噪声模拟）
  for (var k = 0; k < MELODY.length; k += 4) {
    try {
      var o2 = ctx.createOscillator(), g2 = ctx.createGain()
      o2.type = 'sawtooth'
      o2.frequency.value = 80
      g2.gain.setValueAtTime(0.03, t + k * b)
      g2.gain.linearRampToValueAtTime(0, t + k * b + 0.05)
      o2.connect(g2); g2.connect(ctx.destination)
      o2.start(t + k * b); o2.stop(t + k * b + 0.05)
    } catch(e){}
  }
  return MELODY.length * b
}

module.exports = {
  // 背景音乐
  startBGM: function() {
    var ctx = getCtx(); if (!ctx) return
    this.stopBGM()
    _playing = true
    var loop = function() {
      if (!_playing) return
      var len = scheduleLoop(ctx, ctx.currentTime + 0.05)
      _timer = setTimeout(loop, len * 1000 - 50)
    }
    loop()
  },
  stopBGM: function() {
    _playing = false
    if (_timer) { clearTimeout(_timer); _timer = null }
  },

  // 射门/踢球音效（清脆踢球声）
  playKick: function(power) {
    var ctx = getCtx(); if (!ctx) return
    var f = 600 + (power || 0) * 120, t = ctx.currentTime
    try {
      var o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'square'
      o.frequency.setValueAtTime(f, t)
      o.frequency.linearRampToValueAtTime(f * 1.8, t + 0.04)
      o.frequency.linearRampToValueAtTime(f * 0.5, t + 0.08)
      g.gain.setValueAtTime(0.12, t)
      g.gain.linearRampToValueAtTime(0, t + 0.1)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 0.1)
    } catch(e){}
  },

  // 进球庆祝音效（上升音阶 + 回响）
  playGoal: function() {
    var ctx = getCtx(); if (!ctx) return
    var t = ctx.currentTime
    try {
      // 上升音阶
      var notes = [523, 659, 784, 1047]
      for (var i = 0; i < notes.length; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'triangle'
        o.frequency.value = notes[i]
        var start = t + i * 0.08
        g.gain.setValueAtTime(0.1, start)
        g.gain.linearRampToValueAtTime(0, start + 0.15)
        o.connect(g); g.connect(ctx.destination)
        o.start(start); o.stop(start + 0.15)
      }
    } catch(e){}
  },

  // 未命中音效
  playMiss: function() {
    var ctx = getCtx(); if (!ctx) return
    var t = ctx.currentTime
    try {
      var o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(180, t)
      o.frequency.linearRampToValueAtTime(60, t + 0.15)
      g.gain.setValueAtTime(0.05, t)
      g.gain.linearRampToValueAtTime(0, t + 0.15)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 0.15)
    } catch(e){}
  },

  // 终场哨声
  playWhistle: function() {
    var ctx = getCtx(); if (!ctx) return
    var t = ctx.currentTime
    try {
      // 长哨音
      var o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(2200, t)
      o.frequency.linearRampToValueAtTime(1800, t + 0.3)
      o.frequency.setValueAtTime(2200, t + 0.35)
      o.frequency.linearRampToValueAtTime(1600, t + 0.7)
      g.gain.setValueAtTime(0.08, t)
      g.gain.setValueAtTime(0.08, t + 0.5)
      g.gain.linearRampToValueAtTime(0, t + 0.7)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 0.7)
    } catch(e){}
  },

  // 倒计时滴答
  playTick: function() {
    var ctx = getCtx(); if (!ctx) return
    var t = ctx.currentTime
    try {
      var o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 1200
      g.gain.setValueAtTime(0.06, t)
      g.gain.linearRampToValueAtTime(0, t + 0.05)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + 0.05)
    } catch(e){}
  },

  // 欢呼声（连击时触发）
  playCheer: function() {
    var ctx = getCtx(); if (!ctx) return
    var t = ctx.currentTime
    try {
      // 模拟人群欢呼（多频叠加）
      var freqs = [400, 520, 650, 800]
      for (var i = 0; i < freqs.length; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'sawtooth'
        o.frequency.setValueAtTime(freqs[i] + Math.random() * 50, t)
        o.frequency.linearRampToValueAtTime(freqs[i] * 1.1, t + 0.2)
        g.gain.setValueAtTime(0.015, t)
        g.gain.linearRampToValueAtTime(0, t + 0.35)
        o.connect(g); g.connect(ctx.destination)
        o.start(t); o.stop(t + 0.35)
      }
    } catch(e){}
  }
}
