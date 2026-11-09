import { QUALITY_PRESETS } from '../config.js';

export function createQualityManager(initialLevel = 'high', onQualityChange = () => {}) {
  let currentLevel = initialLevel;
  let fpsVisible = false;

  const RING_SIZE = 60;
  const deltaRing = new Float32Array(RING_SIZE);
  deltaRing.fill(1 / 60);
  let ringIdx = 0;
  let currentFps = 60;

  let lowFpsDuration = 0;
  let manualOverrideCooldown = 0;

  function setLevel(levelName, isManual = false) {
    if (!QUALITY_PRESETS[levelName]) return;
    if (isManual) {
      manualOverrideCooldown = 15.0;
    }
    if (currentLevel === levelName) return;
    currentLevel = levelName;
    lowFpsDuration = 0;
    onQualityChange(QUALITY_PRESETS[currentLevel], currentLevel);
  }

  function toggleFpsVisible() {
    fpsVisible = !fpsVisible;
    return fpsVisible;
  }

  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;

    if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      toggleFpsVisible();
    }
  });

  function update(delta, elapsed) {
    if (delta <= 0) return;

    deltaRing[ringIdx] = delta;
    ringIdx = (ringIdx + 1) % RING_SIZE;

    let sum = 0;
    for (let i = 0; i < RING_SIZE; i++) {
      sum += deltaRing[i];
    }
    currentFps = Math.round(RING_SIZE / sum);

    if (manualOverrideCooldown > 0) {
      manualOverrideCooldown -= delta;
      return;
    }

    // Start adaptive check after 2.0s warm-up
    if (elapsed > 2.0) {
      if (currentFps < 50) {
        lowFpsDuration += delta;
        if (lowFpsDuration >= 3.0) {
          lowFpsDuration = 0;
          if (currentLevel === 'high') {
            setLevel('medium', false);
          } else if (currentLevel === 'medium') {
            setLevel('low', false);
          }
        }
      } else {
        lowFpsDuration = Math.max(0, lowFpsDuration - delta * 0.5);
      }
    }
  }

  return {
    update,
    setLevel,
    getLevel: () => currentLevel,
    getPreset: () => QUALITY_PRESETS[currentLevel],
    getFps: () => currentFps,
    isFpsVisible: () => fpsVisible,
    toggleFpsVisible
  };
}
