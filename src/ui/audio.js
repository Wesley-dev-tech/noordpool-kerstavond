import * as THREE from 'three';
import { COORDS } from '../config.js';

export function createAudioManager() {
  let ctx = null;
  let enabled = false;
  let windFilter = null;
  let windGain = null;
  let fireGain = null;
  let bellTimer = 0;
  let crackleTimer = 0;

  const workshopPos = new THREE.Vector3(COORDS.workshop.x, 1.5, COORDS.workshop.z);

  function ensureContext() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();

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
    windGain.connect(ctx.destination);
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
    fireGain.connect(ctx.destination);
    fireSrc.start();
  }

  function toggle() {
    ensureContext();
    if (!ctx) return false;
    enabled = !enabled;
    if (enabled) {
      ctx.resume();
    } else {
      ctx.suspend();
    }
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
    if (!enabled || !ctx) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5 major celesta arpeggio

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f * pitchMultiplier, now + idx * 0.055);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.055);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.055 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.9);
    });
  }

  function playDoorCreak() {
    if (!enabled || !ctx) return;
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
    gain.gain.linearRampToValueAtTime(0.045, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    playChime(0.95);
  }

  function triggerSleighBell(volume) {
    if (!enabled || !ctx || volume < 0.003) return;
    const now = ctx.currentTime;
    [2480, 3720].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 45, now);

      gain.gain.setValueAtTime(volume * 0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  function triggerFireCrackle(volume) {
    if (!enabled || !ctx || volume < 0.005) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600 + Math.random() * 1400, now);

    gain.gain.setValueAtTime(volume * 0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  function update(delta, elapsed, cameraPos, sleighPos, gustStrength = 0) {
    if (!enabled || !ctx) return;

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
