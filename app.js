/* ============================================================
   ikeda.simulator — Ryoji Ikeda 작품 학습 시뮬레이터
   ============================================================
   5개 모드:
     01 test_pattern  — test pattern 시리즈 (바코드/그리드)
     02 data.matrix   — datamatics, data.tron (텍스트/숫자)
     03 sine_wave     — +/-, 0°C (사인파 시각화)
     04 spectra       — spectra II, supersymmetry (점·파티클)
     05 +/- glitch    — 글리치/노이즈 시각화
   ============================================================ */

(() => {
  // ---------- DOM refs ----------
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const hud = document.getElementById("hud");
  const fpsEl = document.getElementById("fps");
  const modesEl = document.getElementById("modes");
  const overlay = document.getElementById("overlay");
  const overlayBtn = document.getElementById("overlay-btn");
  const audioToggle = document.getElementById("audio-toggle");
  const waveformSelect = document.getElementById("waveform-select");
  const modeMeta = document.getElementById("mode-meta");
  const timeMeta = document.getElementById("time-meta");
  const explainTitle = document.getElementById("explain-title");
  const explainRef = document.getElementById("explain-ref");
  const explainBody = document.getElementById("explain-body");
  const explainPrinciple = document.getElementById("explain-principle");

  const ctrlEls = {
    density: document.getElementById("density"),
    speed: document.getElementById("speed"),
    contrast: document.getElementById("contrast"),
    glitch: document.getElementById("glitch"),
    frequency: document.getElementById("frequency"),
    volume: document.getElementById("volume"),
  };
  const ctrlValEls = {
    density: document.getElementById("density-val"),
    speed: document.getElementById("speed-val"),
    contrast: document.getElementById("contrast-val"),
    glitch: document.getElementById("glitch-val"),
    frequency: document.getElementById("frequency-val"),
    volume: document.getElementById("volume-val"),
  };

  // ---------- State ----------
  const state = {
    mode: "test-pattern",
    paused: false,
    t: 0,
    startedAt: performance.now(),
    params: {
      density: 60,
      speed: 100,
      contrast: 100,
      glitch: 20,
      frequency: 440,
      volume: 0,
    },
    audio: {
      ctx: null,
      osc: null,
      gain: null,
      noiseNode: null,
      enabled: false,
      waveform: "sine",
    },
    fps: { last: performance.now(), frames: 0, value: 0 },
  };

  // ---------- Mode metadata (학습용 설명) ----------
  const MODES = {
    "test-pattern": {
      label: "01 / test_pattern",
      title: "test pattern",
      ref: "ref: Ryoji Ikeda — test pattern series (2008–)",
      body:
        "데이터를 바코드 같은 흑백 패턴으로 변환합니다. 이케다는 \"모든 데이터(텍스트·소리·이미지)를 0과 1의 시각 신호로 변환\"한다는 컨셉으로 이 시리즈를 만들었어요. 화면을 가득 채우는 줄무늬는 사실상 데이터의 시각적 인코딩입니다.",
      principle:
        "캔버스를 가로 N개의 셀로 나누고, 각 셀에 0(검정) 또는 1(흰색)을 무작위·주기적으로 할당. density는 셀 개수를, speed는 패턴 변화 속도를 결정합니다. 사운드와 동기화하면 음의 진폭이 패턴의 밀도를 제어합니다.",
    },
    "data-matrix": {
      label: "02 / data.matrix",
      title: "data.matrix",
      ref: "ref: datamatics, data.tron (2006–2008)",
      body:
        "숫자·좌표·기호가 화면을 흐르는 작품군. 이케다는 거대한 수학 데이터(소수, 좌표, 시퀀스)를 직접 화면에 투사해 \"보이지 않는 정보의 풍경\"을 가시화합니다.",
      principle:
        "각 셀에 16진수/2진수/0-9 숫자를 무작위로 그립니다. 일부 셀은 시간 경과에 따라 \"흐르는\" 컬럼(매트릭스 효과의 미니멀 버전)을 형성. 글리치 파라미터를 올리면 셀이 일시적으로 어긋나거나 반전됩니다.",
    },
    "sine-wave": {
      label: "03 / sine_wave",
      title: "sine_wave",
      ref: "ref: +/- (1996), 0°C (1998), dataplex (2005)",
      body:
        "이케다 사운드의 핵심 재료인 사인파를 시각화합니다. 사인파는 가장 단순한 음으로, 단 하나의 주파수만을 갖는 \"순수한\" 파형. 이 단순함이 그의 미학의 토대입니다.",
      principle:
        "y = sin(2π · f · t) 식을 시간축에 따라 그립니다. frequency 파라미터가 f를 직접 제어. 여러 사인파를 다른 주파수로 겹치면 비트(beating) 현상이 나타납니다 — 이케다가 자주 쓰는 청각적 트릭이에요.",
    },
    spectra: {
      label: "04 / spectra",
      title: "spectra",
      ref: "ref: spectra II–IX, supersymmetry (CERN, 2014)",
      body:
        "수많은 점들의 군집이 수학적 규칙으로 움직이는 시리즈. CERN 입자물리 레지던시에서 영감을 받은 supersymmetry는 입자 데이터 자체를 시각화합니다.",
      principle:
        "N개의 점을 무작위로 배치 후, 각 점이 결정론적 패턴(노이즈 필드, 회전, 격자 어트랙터)에 따라 위치 갱신. density로 점 개수, speed로 흐름 속도. 점 자체는 1px이지만 군집이 패턴을 이룹니다.",
    },
    glitch: {
      label: "05 / +/- glitch",
      title: "+/- glitch",
      ref: "ref: +/-, formula, micro-distortion works",
      body:
        "디지털 신호의 \"오류\" 자체를 미학으로 사용. 화면 일부가 어긋나거나, 흑백이 반전되거나, 가로줄이 끊어집니다. 이케다는 \"완벽한 디지털\"의 균열을 의도적으로 노출시킵니다.",
      principle:
        "기본 수직 줄무늬 위에 무작위 사각 영역을 잘라 X축으로 시프트. 일부 영역은 색을 반전. glitch 파라미터가 어긋나는 영역의 빈도/크기를 제어합니다.",
    },
  };

  // ---------- Resize ----------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Helpers ----------
  const W = () => canvas.width / (window.devicePixelRatio || 1);
  const H = () => canvas.height / (window.devicePixelRatio || 1);

  function clear() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W(), H());
  }

  function contrastColor(v01) {
    // v01: 0..1, contrast 적용
    const c = state.params.contrast / 100;
    const adj = (v01 - 0.5) * c + 0.5;
    const g = Math.max(0, Math.min(1, adj));
    const v = Math.floor(g * 255);
    return `rgb(${v},${v},${v})`;
  }

  function rand(seed) {
    // 시드 기반 의사 난수 (재현성)
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  // ---------- MODE 1: test_pattern ----------
  function drawTestPattern(t) {
    clear();
    const w = W();
    const h = H();
    const density = state.params.density;
    const cols = Math.max(8, Math.floor(density));
    const cellW = w / cols;

    // 가로 줄무늬 베이스
    for (let i = 0; i < cols; i++) {
      const seed = i + Math.floor(t * (state.params.speed / 100) * 4);
      const v = rand(seed);
      if (v > 0.5) {
        ctx.fillStyle = contrastColor(1);
        ctx.fillRect(i * cellW, 0, cellW + 1, h);
      }
    }

    // 가로 마커 라인
    const markerCount = 24;
    for (let j = 0; j < markerCount; j++) {
      const y = (h / markerCount) * j + ((t * 30) % (h / markerCount));
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, y, w, 1);
    }

    // 중앙 데이터 라벨
    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(`test_pattern // cols=${cols} t=${t.toFixed(2)}`, 16, h - 16);
  }

  // ---------- MODE 2: data.matrix ----------
  const HEX = "0123456789ABCDEF";
  function drawDataMatrix(t) {
    clear();
    const w = W();
    const h = H();
    const density = state.params.density;
    const fontSize = Math.max(8, Math.floor(20 - density / 12));
    ctx.font = `${fontSize}px monospace`;
    const cols = Math.floor(w / (fontSize * 0.7));
    const rows = Math.floor(h / fontSize);

    const speed = state.params.speed / 100;
    const glitch = state.params.glitch / 100;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = r * 1000 + c + Math.floor(t * speed * 3);
        const v = rand(seed);
        const ch = HEX[Math.floor(v * 16)];
        const gl = rand(seed * 7);
        const isGlitch = gl < glitch * 0.15;
        const bright = isGlitch ? 1 : 0.3 + v * 0.7;
        ctx.fillStyle = contrastColor(bright);
        const x = c * fontSize * 0.7;
        const y = r * fontSize + fontSize;
        const dx = isGlitch ? (gl - 0.5) * 20 : 0;
        ctx.fillText(ch, x + dx, y);
      }
    }

    // 컬럼 하이라이트 (흐르는 효과)
    const highlightCols = Math.max(1, Math.floor(cols / 30));
    for (let i = 0; i < highlightCols; i++) {
      const c = Math.floor(rand(i + Math.floor(t * 0.2)) * cols);
      const x = c * fontSize * 0.7;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x, 0, fontSize * 0.7, h);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(`data.matrix // ${cols}x${rows} cells`, 16, h - 16);
  }

  // ---------- MODE 3: sine_wave ----------
  function drawSineWave(t) {
    clear();
    const w = W();
    const h = H();
    const cy = h / 2;
    const speed = state.params.speed / 100;
    const freq = state.params.frequency;
    const amp = h * 0.35;

    // 격자 라인
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = (h / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 0 라인
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // 메인 사인파
    const waves = Math.max(1, Math.floor(state.params.density / 40));
    for (let k = 0; k < waves; k++) {
      const f = freq * (1 + k * 0.0015); // 약간 다른 주파수 → beating
      const opacity = 1 - k / waves * 0.6;
      ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
      ctx.lineWidth = k === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      const cycles = 8;
      const samples = Math.floor(w);
      for (let x = 0; x < samples; x++) {
        const phase = (x / w) * Math.PI * 2 * cycles + t * speed * 2 + k * 0.3;
        const y = cy + Math.sin(phase * (f / 440)) * amp * 0.6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 데이터 라벨
    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(
      `sine_wave // f=${freq}hz waves=${waves} sin(2π·f·t)`,
      16,
      h - 16
    );
    ctx.fillText("amplitude", 16, 24);
    ctx.fillText("0", 16, cy - 4);
    ctx.fillText("+1", 16, cy - amp * 0.6 - 4);
    ctx.fillText("-1", 16, cy + amp * 0.6 + 12);
  }

  // ---------- MODE 4: spectra (particles) ----------
  let particles = [];
  function initParticles(n) {
    particles = [];
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W(),
        y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        seed: Math.random() * 1000,
      });
    }
  }
  let lastParticleCount = 0;

  function drawSpectra(t) {
    clear();
    const w = W();
    const h = H();
    const target = Math.floor(state.params.density * 30);
    if (target !== lastParticleCount) {
      initParticles(target);
      lastParticleCount = target;
    }
    const speed = state.params.speed / 100;

    // 노이즈 필드 기반 흐름
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const p of particles) {
      const angle =
        Math.sin((p.x + t * 30) * 0.005) * Math.cos((p.y - t * 20) * 0.005) *
        Math.PI * 2;
      p.x += Math.cos(angle) * speed * 1.2;
      p.y += Math.sin(angle) * speed * 1.2;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      ctx.fillRect(p.x, p.y, 1, 1);
    }

    // 십자 마커
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.moveTo(w / 2 - 10, h / 2);
    ctx.lineTo(w / 2 + 10, h / 2);
    ctx.moveTo(w / 2, h / 2 - 10);
    ctx.lineTo(w / 2, h / 2 + 10);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(`spectra // particles=${particles.length}`, 16, h - 16);
  }

  // ---------- MODE 5: glitch ----------
  function drawGlitch(t) {
    clear();
    const w = W();
    const h = H();
    const cols = Math.max(20, Math.floor(state.params.density * 2));
    const cellW = w / cols;

    // 베이스 줄무늬
    for (let i = 0; i < cols; i++) {
      const seed = i + Math.floor(t * (state.params.speed / 100) * 6);
      const v = rand(seed);
      ctx.fillStyle = contrastColor(v > 0.5 ? 1 : 0);
      ctx.fillRect(i * cellW, 0, cellW + 1, h);
    }

    // 글리치 슬라이스
    const glitchAmt = state.params.glitch / 100;
    const slices = Math.floor(glitchAmt * 30);
    for (let k = 0; k < slices; k++) {
      const sy = Math.random() * h;
      const sh = 5 + Math.random() * 40;
      const sx = (Math.random() - 0.5) * w * 0.4;
      const slice = ctx.getImageData(0, sy, w, sh);
      ctx.putImageData(slice, sx, sy);
      // 반전 라인
      if (Math.random() > 0.6) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.globalCompositeOperation = "difference";
        ctx.fillRect(0, sy, w, sh);
        ctx.globalCompositeOperation = "source-over";
      }
    }

    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(`+/- glitch // slices=${slices}`, 16, h - 16);
  }

  // ---------- Main loop ----------
  function frame(now) {
    requestAnimationFrame(frame);

    // FPS
    state.fps.frames++;
    if (now - state.fps.last >= 500) {
      state.fps.value = (state.fps.frames * 1000) / (now - state.fps.last);
      state.fps.frames = 0;
      state.fps.last = now;
      fpsEl.textContent = state.fps.value.toFixed(2).padStart(5, "0") + " fps";
    }

    if (!state.paused) {
      state.t += 0.016 * (state.params.speed / 100);
    }

    switch (state.mode) {
      case "test-pattern":
        drawTestPattern(state.t);
        break;
      case "data-matrix":
        drawDataMatrix(state.t);
        break;
      case "sine-wave":
        drawSineWave(state.t);
        break;
      case "spectra":
        drawSpectra(state.t);
        break;
      case "glitch":
        drawGlitch(state.t);
        break;
    }

    // Time meta
    const elapsed = (now - state.startedAt) / 1000;
    const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
    const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
    const ss = String(Math.floor(elapsed % 60)).padStart(2, "0");
    timeMeta.textContent = `t+${hh}:${mm}:${ss}`;
  }
  requestAnimationFrame(frame);

  // ---------- Mode switching ----------
  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll(".mode").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
    const m = MODES[mode];
    if (m) {
      modeMeta.textContent = m.label;
      explainTitle.textContent = m.title;
      explainRef.textContent = m.ref;
      explainBody.textContent = m.body;
      explainPrinciple.textContent = m.principle;
    }
  }

  modesEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode");
    if (btn) setMode(btn.dataset.mode);
  });

  // ---------- Sliders ----------
  Object.keys(ctrlEls).forEach((key) => {
    const el = ctrlEls[key];
    el.addEventListener("input", () => {
      const v = parseInt(el.value, 10);
      state.params[key] = v;
      updateCtrlLabel(key, v);
      if (key === "frequency" && state.audio.osc) {
        state.audio.osc.frequency.value = v;
      }
      if (key === "volume" && state.audio.gain) {
        state.audio.gain.gain.value = (v / 100) * 0.15;
      }
    });
    updateCtrlLabel(key, state.params[key]);
  });

  function updateCtrlLabel(key, v) {
    if (key === "frequency") {
      ctrlValEls[key].textContent = String(v).padStart(5, "0") + "hz";
    } else {
      ctrlValEls[key].textContent = String(v).padStart(3, "0");
    }
  }

  // ---------- Audio ----------
  function initAudio() {
    if (state.audio.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    state.audio.ctx = new AC();
    state.audio.gain = state.audio.ctx.createGain();
    state.audio.gain.gain.value = (state.params.volume / 100) * 0.15;
    state.audio.gain.connect(state.audio.ctx.destination);
    rebuildOsc();
  }

  function rebuildOsc() {
    if (!state.audio.ctx) return;
    if (state.audio.osc) {
      try { state.audio.osc.stop(); } catch (e) {}
      state.audio.osc.disconnect();
      state.audio.osc = null;
    }
    if (state.audio.noiseNode) {
      try { state.audio.noiseNode.stop(); } catch (e) {}
      state.audio.noiseNode.disconnect();
      state.audio.noiseNode = null;
    }
    if (state.audio.waveform === "noise") {
      const bufferSize = 2 * state.audio.ctx.sampleRate;
      const buffer = state.audio.ctx.createBuffer(1, bufferSize, state.audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = state.audio.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(state.audio.gain);
      noise.start(0);
      state.audio.noiseNode = noise;
    } else {
      const osc = state.audio.ctx.createOscillator();
      osc.type = state.audio.waveform;
      osc.frequency.value = state.params.frequency;
      osc.connect(state.audio.gain);
      osc.start();
      state.audio.osc = osc;
    }
  }

  audioToggle.addEventListener("click", () => {
    initAudio();
    state.audio.enabled = !state.audio.enabled;
    audioToggle.textContent = "sound: " + (state.audio.enabled ? "on" : "off");
    audioToggle.classList.toggle("active", state.audio.enabled);
    if (state.audio.enabled) {
      state.audio.ctx.resume();
    } else {
      state.audio.ctx.suspend();
    }
  });

  waveformSelect.addEventListener("click", (e) => {
    const btn = e.target.closest(".wave");
    if (!btn) return;
    state.audio.waveform = btn.dataset.wave;
    document.querySelectorAll(".wave").forEach((b) =>
      b.classList.toggle("active", b.dataset.wave === state.audio.waveform)
    );
    if (state.audio.ctx) rebuildOsc();
  });
  document.querySelector('.wave[data-wave="sine"]').classList.add("active");

  // ---------- Keyboard ----------
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const map = {
      "1": "test-pattern",
      "2": "data-matrix",
      "3": "sine-wave",
      "4": "spectra",
      "5": "glitch",
    };
    if (map[e.key]) {
      setMode(map[e.key]);
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      state.paused = !state.paused;
    }
    if (e.key === "h") hud.classList.toggle("hud--hidden");
    if (e.key === "f") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
    if (e.key === "s") audioToggle.click();
  });

  // ---------- Overlay ----------
  function dismissOverlay() {
    overlay.classList.add("overlay--hidden");
    initAudio();
  }
  overlayBtn.addEventListener("click", dismissOverlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismissOverlay();
  });

  // ---------- Init ----------
  setMode("test-pattern");
})();
