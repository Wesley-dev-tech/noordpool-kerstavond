import * as THREE from 'three';
import { COORDS } from '../config.js';

// Note frequency table (Hz) for procedural Christmas melodies
const NOTE = {
  REST: 0,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.00,
  A3: 220.00,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  F4S: 369.99,
  G4: 392.00,
  A4: 440.00,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  F5S: 739.99,
  G5: 783.99,
  A5: 880.00
};

// Festive Christmas Medley: "Jingle Bells" & "We Wish You a Merry Christmas"
// Each step: { m: melodyFreq, b: bassFreq (optional), c: harmonyFreq (optional), d: durationInBeats }
const CHRISTMAS_SCORE = [
  // --- Part 1: Jingle Bells (Chorus, First Half) ---
  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.E5, d: 1 },
  { m: NOTE.E5, b: NOTE.G3, c: NOTE.C4, d: 2 },

  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.E5, d: 1 },
  { m: NOTE.E5, b: NOTE.G3, c: NOTE.C4, d: 2 },

  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.G5, d: 1 },
  { m: NOTE.C5, b: NOTE.E3, c: NOTE.G4, d: 1.5 },
  { m: NOTE.D5, d: 0.5 },

  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 2 },
  { m: NOTE.REST, b: NOTE.G3, c: NOTE.E4, d: 2 },

  { m: NOTE.F5, b: NOTE.F3, c: NOTE.A4, d: 1 },
  { m: NOTE.F5, d: 1 },
  { m: NOTE.F5, b: NOTE.C3, c: NOTE.A4, d: 1.5 },
  { m: NOTE.F5, d: 0.5 },

  { m: NOTE.F5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.E5, d: 1 },
  { m: NOTE.E5, b: NOTE.G3, c: NOTE.C4, d: 1 },
  { m: NOTE.E5, d: 0.5 },
  { m: NOTE.E5, d: 0.5 },

  { m: NOTE.E5, b: NOTE.D3, c: NOTE.F4S, d: 1 },
  { m: NOTE.D5, d: 1 },
  { m: NOTE.D5, b: NOTE.A3, c: NOTE.F4S, d: 1 },
  { m: NOTE.E5, d: 1 },

  { m: NOTE.D5, b: NOTE.G3, c: NOTE.B4, d: 2 },
  { m: NOTE.G5, b: NOTE.G3, c: NOTE.D4, d: 2 },

  // --- Part 2: Jingle Bells (Chorus, Second Half) ---
  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.E5, d: 1 },
  { m: NOTE.E5, b: NOTE.G3, c: NOTE.C4, d: 2 },

  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.E5, d: 1 },
  { m: NOTE.E5, b: NOTE.G3, c: NOTE.C4, d: 2 },

  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.G5, d: 1 },
  { m: NOTE.C5, b: NOTE.E3, c: NOTE.G4, d: 1.5 },
  { m: NOTE.D5, d: 0.5 },

  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 2 },
  { m: NOTE.REST, b: NOTE.G3, c: NOTE.E4, d: 2 },

  { m: NOTE.F5, b: NOTE.F3, c: NOTE.A4, d: 1 },
  { m: NOTE.F5, d: 1 },
  { m: NOTE.F5, b: NOTE.C3, c: NOTE.A4, d: 1.5 },
  { m: NOTE.F5, d: 0.5 },

  { m: NOTE.F5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.E5, d: 1 },
  { m: NOTE.E5, b: NOTE.G3, c: NOTE.C4, d: 1 },
  { m: NOTE.E5, d: 0.5 },
  { m: NOTE.E5, d: 0.5 },

  { m: NOTE.G5, b: NOTE.G3, c: NOTE.B4, d: 1 },
  { m: NOTE.G5, d: 1 },
  { m: NOTE.F5, b: NOTE.G3, c: NOTE.B4, d: 1 },
  { m: NOTE.D5, d: 1 },

  { m: NOTE.C5, b: NOTE.C3, c: NOTE.E4, d: 3 },
  { m: NOTE.REST, d: 1 },

  // --- Part 3: We Wish You a Merry Christmas ---
  { m: NOTE.G4, b: NOTE.G3, d: 1 },

  { m: NOTE.C5, b: NOTE.C3, c: NOTE.E4, d: 1 },
  { m: NOTE.C5, d: 0.5 },
  { m: NOTE.D5, d: 0.5 },
  { m: NOTE.C5, b: NOTE.G3, d: 0.5 },
  { m: NOTE.B4, d: 0.5 },

  { m: NOTE.A4, b: NOTE.F3, c: NOTE.C4, d: 1 },
  { m: NOTE.A4, d: 1 },
  { m: NOTE.A4, b: NOTE.F3, d: 1 },

  { m: NOTE.D5, b: NOTE.D3, c: NOTE.F4, d: 1 },
  { m: NOTE.D5, d: 0.5 },
  { m: NOTE.E5, d: 0.5 },
  { m: NOTE.D5, b: NOTE.A3, d: 0.5 },
  { m: NOTE.C5, d: 0.5 },

  { m: NOTE.B4, b: NOTE.G3, c: NOTE.D4, d: 1 },
  { m: NOTE.G4, d: 1 },
  { m: NOTE.G4, b: NOTE.G3, d: 1 },

  { m: NOTE.E5, b: NOTE.C3, c: NOTE.G4, d: 1 },
  { m: NOTE.E5, d: 0.5 },
  { m: NOTE.F5, d: 0.5 },
  { m: NOTE.E5, b: NOTE.E3, d: 0.5 },
  { m: NOTE.D5, d: 0.5 },

  { m: NOTE.C5, b: NOTE.A3, c: NOTE.E4, d: 1 },
  { m: NOTE.A4, d: 1 },
  { m: NOTE.G4, d: 0.5 },
  { m: NOTE.G4, d: 0.5 },

  { m: NOTE.A4, b: NOTE.F3, c: NOTE.C4, d: 1 },
  { m: NOTE.D5, b: NOTE.G3, d: 1 },
  { m: NOTE.B4, b: NOTE.G3, c: NOTE.D4, d: 1 },

  { m: NOTE.C5, b: NOTE.C3, c: NOTE.E4, d: 2.5 },
  { m: NOTE.REST, d: 0.5 }
];

const BEAT_DURATION = 0.27; // Upbeat, cozy Christmas music-box tempo

export function createAudioManager() {
  let ctx = null;
  let masterGain = null;
  let musicBus = null;
  let enabled = true; // Default to ON so music starts automatically or on first click
  let unlocked = false;
  let windFilter = null;
  let windGain = null;
  let fireGain = null;
  let bellTimer = 0;
  let crackleTimer = 0;

  // Sequencer state for continuous procedural Christmas music
  let scoreIndex = 0;
  let nextNoteCountdown = 0;

  const workshopPos = new THREE.Vector3(COORDS.workshop.x, 1.5, COORDS.workshop.z);

  function syncAudioButtonUI() {
    const btn = document.getElementById('btn-audio');
    if (!btn) return;
    btn.textContent = enabled ? '🔊 Geluid: Aan' : '🔇 Geluid: Uit';
    btn.classList.toggle('active', enabled);
  }

  function ensureContext() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();

    // Gentle compressor to keep the Christmas music full, warm, and loud without clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
    compressor.attack.setValueAtTime(0.005, ctx.currentTime);
    compressor.release.setValueAtTime(0.18, ctx.currentTime);

    masterGain = ctx.createGain();
    masterGain.gain.value = enabled ? 1.0 : 0.0001;

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    // Dedicated music bus
    musicBus = ctx.createGain();
    musicBus.gain.value = 1.0;
    musicBus.connect(masterGain);

    // Create 3-second white noise buffer for wind and fireplace
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // 1. Arctic Wind Loop
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 280;
    windFilter.Q.value = 3.2;

    windGain = ctx.createGain();
    windGain.gain.value = 0.045;

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSrc.start();

    // 2. Warm Hearth Rumble Loop
    const fireSrc = ctx.createBufferSource();
    fireSrc.buffer = noiseBuffer;
    fireSrc.loop = true;

    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'lowpass';
    fireFilter.frequency.value = 160;

    fireGain = ctx.createGain();
    fireGain.gain.value = 0.03;

    fireSrc.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(masterGain);
    fireSrc.start();

    if (ctx.state === 'running') {
      unlocked = true;
    }
    ctx.addEventListener('statechange', () => {
      if (ctx.state === 'running') {
        unlocked = true;
      }
    });
  }

  function unlockAndStartIfEnabled() {
    if (!enabled) return;
    ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        unlocked = true;
        if (enabled && nextNoteCountdown <= 0) {
          triggerNextMusicStep();
        }
      }).catch(() => {});
    } else if (ctx.state === 'running') {
      unlocked = true;
      if (nextNoteCountdown <= 0) {
        triggerNextMusicStep();
      }
    }
    syncAudioButtonUI();
  }

  // Unlock Web Audio automatically on the very first user interaction anywhere in the window
  const unlockEvents = ['pointerdown', 'mousedown', 'keydown', 'touchstart'];
  function onFirstUserGesture(e) {
    // If the user clicked the audio button itself, let toggle() handle it cleanly
    const audioBtn = document.getElementById('btn-audio');
    if (audioBtn && e && e.target && audioBtn.contains(e.target)) {
      return;
    }
    if (enabled && (!ctx || ctx.state !== 'running' || !unlocked)) {
      unlockAndStartIfEnabled();
    }
  }
  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, onFirstUserGesture, { capture: true, passive: true });
  });

  // Also attempt immediate start on load in case the browser already permits audio playback
  setTimeout(() => {
    syncAudioButtonUI();
    unlockAndStartIfEnabled();
  }, 150);

  function playMusicBoxNote(freq, durationSec, startTime) {
    if (!ctx || !musicBus || !freq || freq <= 0) return;

    // 1. Celesta / Music-box main tone (Sine + Triangle blend)
    const mainOsc = ctx.createOscillator();
    const bodyOsc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    mainOsc.type = 'sine';
    mainOsc.frequency.setValueAtTime(freq, startTime);

    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(freq, startTime);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.45, startTime);

    const releaseTime = Math.max(durationSec * 1.45, 0.55);
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(0.28, startTime + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(0.14, startTime + Math.min(0.18, durationSec * 0.65));
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + releaseTime);

    mainOsc.connect(noteGain);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(noteGain);
    noteGain.connect(musicBus);

    mainOsc.start(startTime);
    bodyOsc.start(startTime);
    mainOsc.stop(startTime + releaseTime + 0.04);
    bodyOsc.stop(startTime + releaseTime + 0.04);

    // 2. Crystalline music-box tine overtone (2x harmonic with delicate bell decay)
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq * 2.0, startTime);

    chimeGain.gain.setValueAtTime(0.0001, startTime);
    chimeGain.gain.linearRampToValueAtTime(0.085, startTime + 0.008);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(musicBus);
    chimeOsc.start(startTime);
    chimeOsc.stop(startTime + 0.3);
  }

  function playAccompanimentNote(freq, durationSec, startTime, peakGain = 0.14) {
    if (!ctx || !musicBus || !freq || freq <= 0) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, startTime);

    const releaseTime = Math.max(durationSec * 1.6, 0.7);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + releaseTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(musicBus);

    osc.start(startTime);
    osc.stop(startTime + releaseTime + 0.05);
  }

  function triggerNextMusicStep() {
    if (!ctx || !enabled) return;
    const step = CHRISTMAS_SCORE[scoreIndex];
    scoreIndex = (scoreIndex + 1) % CHRISTMAS_SCORE.length;

    const now = ctx.currentTime + 0.015;
    const durSec = step.d * BEAT_DURATION;

    if (step.m && step.m > 0) {
      playMusicBoxNote(step.m, durSec, now);
    }
    if (step.b && step.b > 0) {
      playAccompanimentNote(step.b, durSec * 1.35, now, 0.16);
    }
    if (step.c && step.c > 0) {
      playAccompanimentNote(step.c, durSec * 1.15, now, 0.11);
    }

    nextNoteCountdown = durSec;
  }

  function toggle() {
    ensureContext();
    if (!ctx) return false;

    // If audio was enabled by default but blocked by browser autoplay until this button click,
    // keep it enabled and unlock/start playback instead of muting it!
    if (enabled && ctx.state !== 'running') {
      enabled = true;
      if (masterGain) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
      }
      ctx.resume().then(() => {
        unlocked = true;
        nextNoteCountdown = 0;
        triggerNextMusicStep();
      }).catch(() => {});
      syncAudioButtonUI();
      return enabled;
    }

    enabled = !enabled;
    if (enabled) {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (masterGain) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(Math.max(0.001, masterGain.gain.value), ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.05);
      }
      nextNoteCountdown = 0;
      triggerNextMusicStep();
    } else {
      if (masterGain) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      }
    }
    syncAudioButtonUI();
    return enabled;
  }

  function setSuspended(suspend) {
    if (!ctx || !enabled) return;
    if (suspend) {
      ctx.suspend();
    } else {
      ctx.resume();
    }
  }

  function playChime(pitchMultiplier = 1.0) {
    if (!enabled) return;
    ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5 major celesta arpeggio

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f * pitchMultiplier, now + idx * 0.055);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.055);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.055 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.85);

      osc.connect(gain);
      gain.connect(masterGain || ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.9);
    });
  }

  function playDoorCreak() {
    if (!enabled) return;
    ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain || ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    playChime(0.95);
  }

  function triggerSleighBell(volume) {
    if (!enabled || !ctx || ctx.state !== 'running' || volume < 0.003) return;
    const now = ctx.currentTime;
    [2480, 3720].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 45, now);

      gain.gain.setValueAtTime(volume * 0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(masterGain || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  function triggerFireCrackle(volume) {
    if (!enabled || !ctx || ctx.state !== 'running' || volume < 0.005) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600 + Math.random() * 1400, now);

    gain.gain.setValueAtTime(volume * 0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(masterGain || ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  function update(delta, elapsed, cameraPos, sleighPos, gustStrength = 0) {
    if (!enabled || !ctx || ctx.state !== 'running') return;

    // Advance procedural Christmas music sequencer only while AudioContext is actively running
    nextNoteCountdown -= delta;
    if (nextNoteCountdown <= 0) {
      triggerNextMusicStep();
    }

    // Modulate Arctic wind filter frequency & volume (swells naturally during ground snow gusts)
    if (windFilter) {
      windFilter.frequency.value =
        260 +
        Math.sin(elapsed * 0.45) * 110 +
        Math.cos(elapsed * 0.19) * 60 +
        gustStrength * 165;
    }
    if (windGain) {
      windGain.gain.value = 0.045 + gustStrength * 0.032;
    }

    // Distance to workshop for fireplace volume
    if (cameraPos && fireGain) {
      const distW = cameraPos.distanceTo(workshopPos);
      const fireProx = Math.max(0, 1 - distW / 28);
      fireGain.gain.value = 0.015 + fireProx * 0.065;

      crackleTimer += delta;
      if (crackleTimer > 0.12 && Math.random() < 0.35) {
        crackleTimer = 0;
        triggerFireCrackle(fireProx);
      }
    }

    // Distance to sleigh for sleigh bells
    if (cameraPos && sleighPos) {
      bellTimer += delta;
      if (bellTimer >= 0.24) {
        bellTimer = 0;
        const distS = cameraPos.distanceTo(sleighPos);
        const bellProx = Math.max(0, 1 - distS / 48);
        triggerSleighBell(bellProx);
      }
    }
  }

  return {
    toggle,
    setSuspended,
    isEnabled: () => enabled,
    playChime,
    playDoorCreak,
    update
  };
}
