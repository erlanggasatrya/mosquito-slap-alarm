class HighPowerSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenInterval = null;
    this.buzzOsc = null;
    this.buzzGain = null;
    this.lfo = null;
    this.isMuted = false;
    this.customSounds = {
      slap: null,
      explosion: null,
      penalty: null,
      alarm: null,
    };
    this.customSoundGains = {
      slap: null,
      explosion: null,
      alarm: null,
    };
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : 1.0,
        this.ctx.currentTime,
      );
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        muted ? 0 : 1.0,
        this.ctx.currentTime,
      );
    }
    Object.entries(this.customSounds).forEach(([name, sound]) => {
      if (!sound) return;
      sound.muted = muted;
      if (muted && name !== "alarm") {
        sound.pause();
        sound.currentTime = 0;
      }
    });
  }

  getCustomSound(name, source) {
    if (!this.customSounds[name]) {
      const sound = new window.Audio(source);
      sound.preload = "auto";
      sound.volume = 1;
      sound.muted = this.isMuted;
      this.customSounds[name] = sound;
    }
    return this.customSounds[name];
  }

  connectCustomSound(name, source, gainValue) {
    const sound = this.getCustomSound(name, source);
    if (!this.customSoundGains[name]) {
      const sourceNode = this.ctx.createMediaElementSource(sound);
      const gainNode = this.ctx.createGain();
      sourceNode.connect(gainNode);
      gainNode.connect(this.masterGain);
      this.customSoundGains[name] = gainNode;
    }
    this.customSoundGains[name].gain.setValueAtTime(
      gainValue,
      this.ctx.currentTime,
    );
    return sound;
  }

  playCustomSound(name, source, gainValue, fallback) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const sound = this.connectCustomSound(name, source, gainValue);
    sound.currentTime = 0;
    const playback = sound.play();
    playback?.catch(() => {
      // Tetap gunakan suara sintetis jika file custom belum tersedia/gagal diputar.
      fallback();
    });
  }

  startAlarm() {
    this.init();
    if (this.isMuted) return;

    this.stopAlarm();
    const alarm = this.connectCustomSound("alarm", "/audio/oke-gas.mp3", 0.35);
    alarm.loop = true;
    alarm.currentTime = 0;
    const playback = alarm.play();
    playback?.catch(() => {
      this.stopAlarm();
      this.startSyntheticAlarm();
    });
  }

  startSyntheticAlarm() {
    this.init();
    if (!this.ctx) return;
    this.stopAlarm();

    const now = this.ctx.currentTime;

    // 1. Dual-tone Alternating Siren
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenGain = this.ctx.createGain();
    this.sirenOsc.type = "sawtooth";
    this.sirenOsc.frequency.setValueAtTime(700, now);
    this.sirenGain.gain.setValueAtTime(0.5, now);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);
    this.sirenOsc.start();

    let toggle = false;
    this.sirenInterval = window.setInterval(() => {
      if (!this.ctx || !this.sirenOsc) return;
      const freq = toggle ? 700 : 1080;
      this.sirenOsc.frequency.cancelScheduledValues(this.ctx.currentTime);
      this.sirenOsc.frequency.exponentialRampToValueAtTime(
        freq,
        this.ctx.currentTime + 0.06,
      );
      toggle = !toggle;
    }, 160);

    // 2. Annoying Mosquito Drone (Dengungan Sayap 50Hz LFO)
    this.buzzOsc = this.ctx.createOscillator();
    this.buzzGain = this.ctx.createGain();
    const lfoGain = this.ctx.createGain();
    this.lfo = this.ctx.createOscillator();

    this.buzzOsc.type = "sawtooth";
    this.buzzOsc.frequency.setValueAtTime(560, now);

    this.lfo.frequency.setValueAtTime(50, now);
    lfoGain.gain.setValueAtTime(45, now);

    this.lfo.connect(lfoGain);
    lfoGain.connect(this.buzzOsc.frequency);

    this.buzzGain.gain.setValueAtTime(0.4, now);
    this.buzzOsc.connect(this.buzzGain);
    this.buzzGain.connect(this.masterGain);

    this.lfo.start();
    this.buzzOsc.start();
  }

  playSlap() {
    this.playCustomSound(
      "slap",
      "/audio/hidup-jokowi.mp3",
      1.6,
      () => this.playSyntheticSlap(),
    );
  }

  playSyntheticSlap() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const punchOsc = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punchOsc.type = "triangle";
    punchOsc.frequency.setValueAtTime(480, now);
    punchOsc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

    punchGain.gain.setValueAtTime(1.0, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    punchOsc.connect(punchGain);
    punchGain.connect(this.masterGain);
    punchOsc.start(now);
    punchOsc.stop(now + 0.15);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const noiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate,
    );
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(1600, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.08);
  }

  playExplosion() {
    this.playCustomSound(
      "explosion",
      "/audio/jokowi-saya-akan-lawan.mp3",
      1.8,
      () => this.playSyntheticExplosion(),
    );
  }

  playSyntheticExplosion() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = "sawtooth";
    boomOsc.frequency.setValueAtTime(180, now);
    boomOsc.frequency.exponentialRampToValueAtTime(20, now + 0.55);

    boomGain.gain.setValueAtTime(1.0, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(now);
    boomOsc.stop(now + 0.55);

    const noiseLength = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, noiseLength, this.ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      channel[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.5);
  }

  playPenalty() {
    this.playCustomSound(
      "penalty",
      "/audio/prabowo-sorry-ye.mp3",
      1.6,
      () => this.playSyntheticPenalty(),
    );
  }

  playSyntheticPenalty() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playVictory() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.5, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  }

  stopAlarm() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    const alarm = this.customSounds.alarm;
    if (alarm) {
      alarm.pause();
      alarm.currentTime = 0;
    }
    try {
      this.sirenOsc?.stop();
      this.sirenOsc?.disconnect();
      this.buzzOsc?.stop();
      this.buzzOsc?.disconnect();
      this.lfo?.stop();
      this.lfo?.disconnect();
    } catch (e) {}
    this.sirenOsc = null;
    this.sirenGain = null;
    this.buzzOsc = null;
    this.buzzGain = null;
    this.lfo = null;
  }
}

export const audio = new HighPowerSoundEngine();
