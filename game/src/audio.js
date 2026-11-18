// The gamelan orchestra, synthesized live with WebAudio: no audio files.
// A slendro-ish pentatonic scale, metallophone plucks, kendang drum patterns,
// a great gong for round starts and KOs, hit thumps and a crowd swell.
// Music is a small generative sequencer whose density follows the fight.
const SLENDRO = [220.0, 261.63, 311.13, 349.23, 415.3, 440.0, 523.25, 622.25];

const MELODIES = {
  title: [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 7, 5, 4, 2, 0],
  duel: [4, 2, 5, 4, 1, 2, 4, 0, 4, 5, 7, 5, 4, 2, 1, 2],
  boss: [7, 5, 7, 4, 5, 2, 4, 1, 7, 5, 4, 2, 1, 2, 4, 5],
  victory: [0, 1, 2, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4],
};

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    musicGain: null,
    enabled: true,
    mode: 'title',
    stepIndex: 0,
    nextStepAt: 0,
    tempo: 0.24,
    started: false,
  };

  function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return false;
      audio.ctx = new Ctor();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      audio.musicGain = audio.ctx.createGain();
      audio.musicGain.gain.value = 0.34;
      audio.musicGain.connect(audio.ctx.destination);
      audio.started = true;
      audio.nextStepAt = audio.ctx.currentTime + 0.1;
      return true;
    } catch {
      return false;
    }
  }

  function pluck(freq, time, volume, dest) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2.01;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, time);
    gain2.gain.linearRampToValueAtTime(volume * 0.25, time + 0.006);
    gain2.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(dest);
    gain2.connect(dest);
    osc.start(time);
    osc2.start(time);
    osc.stop(time + 1);
    osc2.stop(time + 0.4);
  }

  function drum(time, low, volume) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(low ? 120 : 190, time);
    osc.frequency.exponentialRampToValueAtTime(low ? 55 : 90, time + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(time);
    osc.stop(time + 0.2);
    // Skin slap: a short burst of filtered noise.
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = low ? 900 : 2400;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = volume * 0.5;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audio.master);
    noise.start(time);
  }

  function gong(time, volume) {
    const ctx = audio.ctx;
    for (const [mult, vol] of [[1, 1], [1.51, 0.5], [2.09, 0.32], [2.94, 0.18]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 98 * mult;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume * vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 3.2);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start(time);
      osc.stop(time + 3.4);
    }
  }

  function playStep() {
    const melody = MELODIES[audio.mode] ?? MELODIES.duel;
    const degree = melody[audio.stepIndex % melody.length];
    const freq = SLENDRO[degree % SLENDRO.length] * (degree >= SLENDRO.length ? 2 : 1);
    const time = audio.nextStepAt;
    const density = audio.mode === 'boss' ? 1 : audio.mode === 'duel' ? 0.8 : 0.55;
    if (audio.stepIndex % 2 === 0 || Math.random() < density) {
      pluck(freq, time, 0.16, audio.musicGain);
    }
    if (audio.stepIndex % 8 === 0) pluck(freq / 2, time, 0.12, audio.musicGain);
    if (audio.stepIndex % 4 === 2) drum(time, false, 0.1);
    if (audio.stepIndex % 8 === 4) drum(time, true, 0.16);
    if (audio.stepIndex % 16 === 0 && audio.mode !== 'title') gong(time, 0.08);
    audio.stepIndex += 1;
    audio.nextStepAt = time + audio.tempo;
  }

  return {
    ensure,
    get on() {
      return audio.enabled;
    },
    toggle() {
      audio.enabled = !audio.enabled;
      if (audio.master) audio.master.gain.value = audio.enabled ? 0.5 : 0;
      if (audio.musicGain) audio.musicGain.gain.value = audio.enabled ? 0.34 : 0;
      return audio.enabled;
    },
    setMode(mode) {
      audio.mode = mode;
      audio.tempo = mode === 'boss' ? 0.19 : mode === 'duel' ? 0.22 : 0.3;
    },
    step() {
      if (!audio.ctx || !audio.enabled) return;
      while (audio.nextStepAt < audio.ctx.currentTime + 0.15) playStep();
    },
    hit(power) {
      if (!ensure() || !audio.enabled) return;
      const time = audio.ctx.currentTime;
      drum(time, power === 'heavy', power === 'heavy' ? 0.5 : 0.3);
      pluck(power === 'heavy' ? 160 : 240, time, 0.1, audio.master);
    },
    block() {
      if (!ensure() || !audio.enabled) return;
      pluck(520, audio.ctx.currentTime, 0.12, audio.master);
    },
    special() {
      if (!ensure() || !audio.enabled) return;
      const time = audio.ctx.currentTime;
      for (let i = 0; i < 5; i += 1) pluck(SLENDRO[i] * 2, time + i * 0.05, 0.14, audio.master);
    },
    finisher() {
      if (!ensure() || !audio.enabled) return;
      gong(audio.ctx.currentTime, 0.3);
      this.crowd();
    },
    gong() {
      if (!ensure() || !audio.enabled) return;
      gong(audio.ctx.currentTime, 0.25);
    },
    crowd() {
      if (!ensure() || !audio.enabled) return;
      const ctx = audio.ctx;
      const time = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 1.2);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) {
        const env = Math.sin((i / len) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      noise.start(time);
    },
    coin() {
      if (!ensure() || !audio.enabled) return;
      const time = audio.ctx.currentTime;
      pluck(880, time, 0.14, audio.master);
      pluck(1320, time + 0.07, 0.12, audio.master);
    },
    select() {
      if (!ensure() || !audio.enabled) return;
      pluck(660, audio.ctx.currentTime, 0.12, audio.master);
    },
  };
}
