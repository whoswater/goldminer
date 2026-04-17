/**
 * 音频系统 - 程序化生成 chiptune BGM + 音效
 * 无外部依赖，无版权问题
 */
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmScheduledUntil = 0;
    this.bgmPlaying = false;
    this.muted = false;

    // 音符频率
    this.N = {
      A2:110, G2:98, C3:130.81, D3:146.83, E3:164.81, G3:196, A3:220,
      C4:261.63, D4:293.66, E4:329.63, G4:392, A4:440,
      C5:523.25, D5:587.33, E5:659.25, G5:784, A5:880, C6:1046.5
    };

    this.BPM = 140;
    this.STEP = 60 / this.BPM / 4;
    this.LOOP_DUR = 64 * this.STEP;

    const N = this.N;
    this.melody = [
      [N.E5,0,1],[N.E5,2,1],[N.G5,3,1],[N.A5,4,2],[N.G5,7,1],
      [N.E5,8,1],[N.D5,10,1],[N.E5,12,2],
      [N.E5,16,1],[N.G5,18,1],[N.A5,19,1],[N.C6,20,2],[N.A5,23,1],
      [N.G5,24,1],[N.E5,26,1],[N.D5,28,2],
      [N.D5,32,1],[N.D5,34,1],[N.E5,35,1],[N.G5,36,2],[N.E5,39,1],
      [N.D5,40,1],[N.C5,42,1],[N.D5,44,2],
      [N.C5,48,1],[N.D5,50,1],[N.E5,51,1],[N.G5,52,1],[N.A5,53,2],
      [N.G5,56,1],[N.E5,57,1],[N.D5,58,1],[N.C5,59,2]
    ];
    this.bass = [
      [N.C3,0,3],[N.C3,4,3],[N.A2,8,3],[N.G2,12,3],
      [N.C3,16,3],[N.E3,20,3],[N.A2,24,3],[N.G2,28,3],
      [N.D3,32,3],[N.D3,36,3],[N.G2,40,3],[N.G2,44,3],
      [N.C3,48,3],[N.E3,52,3],[N.G2,56,3],[N.C3,60,3]
    ];
    this.kicks = [0,8,16,24,32,40,48,56];
    this.snares = [4,12,20,28,36,44,52,60];
    this.hihats = [];
    for (let i = 0; i < 64; i += 2) this.hihats.push(i);

  }

  // 延迟到首次用户交互时创建 AudioContext（浏览器安全策略要求）
  _ensureContext() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.4;
      this.master.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.45;
      this.bgmGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.master);
      return true;
    } catch (e) {
      this.ctx = null;
      return false;
    }
  }

  resume() {
    if (!this._ensureContext()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.4;
    return this.muted;
  }

  _tone(freq, time, dur, type, vol, dest) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.95);
    osc.connect(g);
    g.connect(dest || this.bgmGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  _kick(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
    g.gain.setValueAtTime(0.25, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  _noise(time, dur, vol, hp) {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const len = Math.ceil(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = hp || 8000;
    src.connect(flt);
    flt.connect(g);
    g.connect(this.bgmGain);
    src.start(time);
    src.stop(time + dur);
  }

  _scheduleLoop(t0) {
    const s = this.STEP;
    for (const m of this.melody) this._tone(m[0], t0 + m[1] * s, m[2] * s * 0.9, 'square', 0.07);
    for (const b of this.bass) this._tone(b[0], t0 + b[1] * s, b[2] * s * 0.9, 'triangle', 0.1);
    for (const k of this.kicks) this._kick(t0 + k * s);
    for (const sn of this.snares) this._noise(t0 + sn * s, 0.08, 0.06, 4000);
    for (const h of this.hihats) this._noise(t0 + h * s, 0.04, 0.03, 9000);
  }

  startBGM() {
    if (!this.ctx || this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmScheduledUntil = this.ctx.currentTime + 0.05;
    this.updateBGM();
  }

  stopBGM() { this.bgmPlaying = false; }

  updateBGM() {
    if (!this.ctx || !this.bgmPlaying) return;
    while (this.bgmScheduledUntil < this.ctx.currentTime + 1.0) {
      this._scheduleLoop(this.bgmScheduledUntil);
      this.bgmScheduledUntil += this.LOOP_DUR;
    }
  }

  // 音效
  sfxPlace() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(400, t, 0.08, 'sine', 0.2, this.sfxGain);
    this._tone(280, t + 0.03, 0.06, 'sine', 0.12, this.sfxGain);
  }

  sfxPerfect(combo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 523 + Math.min(combo, 10) * 30;
    this._tone(base, t, 0.1, 'square', 0.1, this.sfxGain);
    this._tone(base * 1.25, t + 0.07, 0.1, 'square', 0.1, this.sfxGain);
    this._tone(base * 1.5, t + 0.14, 0.15, 'square', 0.12, this.sfxGain);
    this._tone(base * 2, t + 0.2, 0.2, 'sine', 0.06, this.sfxGain);
  }

  sfxGameOver() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(440, t, 0.2, 'square', 0.1, this.sfxGain);
    this._tone(370, t + 0.15, 0.2, 'square', 0.1, this.sfxGain);
    this._tone(330, t + 0.3, 0.25, 'square', 0.1, this.sfxGain);
    this._tone(262, t + 0.5, 0.5, 'triangle', 0.12, this.sfxGain);
  }
}
