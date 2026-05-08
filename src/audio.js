window.AudioFX = (() => {
  let ctx = null;
  let master = null;
  let music = null;
  let voiceEnabled = false;
  const last = new Map();

  function boot() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  }

  function musicTone(freq, duration, delay, gain = 0.045) {
    if (!ctx || !music) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);
    filter.type = "lowpass";
    filter.frequency.value = 950;
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.035);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(filter);
    filter.connect(env);
    env.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  function scheduleMusic() {
    if (!ctx || !music) return;
    const scale = music.boss ? [110, 147, 165, 196, 220, 247, 294, 330] : [98, 147, 196, 247, 294, 392];
    for (let i = 0; i < 16; i++) {
      const note = scale[(i * 3 + music.step) % scale.length];
      musicTone(note, 0.34, i * 0.18, music.boss ? 0.06 : 0.038);
      if (i % 4 === 0) musicTone(note / 2, 0.55, i * 0.18, music.boss ? 0.05 : 0.03);
    }
    music.step += 1;
  }

  function startMusic(mode = "normal") {
    boot();
    if (!ctx) return;
    if (!music) {
      music = { step: 0, boss: mode === "boss", timer: null };
      scheduleMusic();
      music.timer = setInterval(scheduleMusic, 2800);
    }
    music.boss = mode === "boss";
  }

  function stopMusic() {
    if (!music) return;
    clearInterval(music.timer);
    music = null;
  }

  function ok(name, gap = 0.04) {
    if (!ctx) return false;
    const now = ctx.currentTime;
    if ((last.get(name) || 0) + gap > now) return false;
    last.set(name, now);
    return true;
  }

  function tone(freq, duration, type = "sine", gain = 0.5, delay = 0) {
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function sweep(from, to, duration, type = "sawtooth", gain = 0.45, delay = 0) {
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function noise(duration = 0.16, gain = 0.35, delay = 0) {
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const env = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.9;
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(start);
  }

  function speak(text, gap = 1.5) {
    if (!voiceEnabled || !("speechSynthesis" in window) || !ok(`voice:${text}`, gap)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.rate = 1.08;
    utter.pitch = 1.05;
    utter.volume = 0.72;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  const api = {
    boot,
    startMusic,
    stopMusic,
    setBossMusic(active) {
      startMusic(active ? "boss" : "normal");
    },
    click() {
      boot();
      if (!ok("click", 0.05)) return;
      tone(620, 0.045, "triangle", 0.28);
      tone(930, 0.06, "triangle", 0.18, 0.035);
    },
    start() {
      boot();
      tone(330, 0.12, "sine", 0.36);
      tone(495, 0.14, "sine", 0.26, 0.08);
      tone(660, 0.18, "sine", 0.22, 0.18);
      startMusic("normal");
    },
    shoot() {
      if (!ok("shoot", 0.09)) return;
      tone(920, 0.035, "square", 0.08);
    },
    enemyFire() {
      if (!ok("enemyFire", 0.16)) return;
      sweep(360, 150, 0.09, "sawtooth", 0.08);
    },
    hit() {
      if (!ok("hit", 0.045)) return;
      tone(740, 0.04, "triangle", 0.12);
      noise(0.045, 0.05);
    },
    hurt() {
      if (!ok("hurt", 0.3)) return;
      sweep(180, 55, 0.28, "sawtooth", 0.42);
      noise(0.22, 0.24);
    },
    dash() {
      if (!ok("dash", 0.18)) return;
      sweep(260, 980, 0.12, "triangle", 0.24);
    },
    perfect() {
      if (!ok("perfect", 0.2)) return;
      tone(880, 0.06, "sine", 0.18);
      tone(1320, 0.08, "sine", 0.16, 0.055);
    },
    item(name) {
      if (!ok("item", 0.2)) return;
      tone(520, 0.08, "triangle", 0.22);
      tone(780, 0.11, "triangle", 0.18, 0.06);
    },
    skill() {
      if (!ok("skill", 0.5)) return;
      sweep(220, 1200, 0.38, "sawtooth", 0.32);
      noise(0.18, 0.18, 0.08);
    },
    boss(name) {
      if (!ok("boss", 1.5)) return;
      tone(82, 0.42, "sawtooth", 0.34);
      tone(123, 0.42, "sawtooth", 0.2, 0.04);
      noise(0.28, 0.16);
    },
    bossDown() {
      if (!ok("bossDown", 1)) return;
      tone(392, 0.12, "sine", 0.28);
      tone(523, 0.12, "sine", 0.24, 0.09);
      tone(784, 0.24, "sine", 0.2, 0.18);
    },
    upgrade() {
      if (!ok("upgrade", 0.8)) return;
      tone(440, 0.1, "triangle", 0.24);
      tone(660, 0.12, "triangle", 0.2, 0.1);
    },
    gameOver() {
      if (!ok("gameOver", 1.5)) return;
      sweep(260, 70, 0.6, "sawtooth", 0.34);
      stopMusic();
    }
  };

  document.addEventListener("click", event => {
    if (event.target.closest("button")) api.click();
  });

  return api;
})();
