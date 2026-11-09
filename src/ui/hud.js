import * as THREE from 'three';

export function createHUD(callbacks) {
  const loadingScreen = document.getElementById('loading-screen');
  const fpsCounterEl = document.getElementById('fps-counter');
  const fpsToggleBtn = document.getElementById('btn-fps');
  const audioToggleBtn = document.getElementById('btn-audio');
  const tooltipEl = document.getElementById('scene-tooltip');
  const hoverTooltipEl = document.getElementById('hover-tooltip');
  const qualityBtns = document.querySelectorAll('[data-quality]');

  const projVec = new THREE.Vector3();
  let fpsTimer = 0;

  qualityBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const level = btn.getAttribute('data-quality');
      if (callbacks.onQualitySelect) {
        callbacks.onQualitySelect(level);
      }
      setActiveQualityButton(level);
    });
  });

  if (fpsToggleBtn) {
    fpsToggleBtn.addEventListener('click', () => {
      if (callbacks.onToggleFps) {
        callbacks.onToggleFps();
      }
    });
  }

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      if (callbacks.onToggleAudio) {
        const enabled = callbacks.onToggleAudio();
        audioToggleBtn.textContent = enabled ? '🔊 Geluid: Aan' : '🔇 Geluid: Uit';
        audioToggleBtn.classList.toggle('active', enabled);
      }
    });
  }

  function setActiveQualityButton(levelName) {
    qualityBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-quality') === levelName);
    });
  }

  function hideLoadingScreen() {
    if (!loadingScreen) return;
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 850);
  }

  function update(delta, camera, qualityManager, interactionManager) {
    // 1. Update FPS counter (throttled to 4x per second)
    if (qualityManager) {
      const visible = qualityManager.isFpsVisible();
      if (fpsCounterEl) {
        fpsCounterEl.style.display = visible ? 'inline-flex' : 'none';
      }
      if (fpsToggleBtn) {
        fpsToggleBtn.classList.toggle('active', visible);
      }
      if (visible && fpsCounterEl) {
        fpsTimer += delta;
        if (fpsTimer >= 0.25) {
          fpsTimer = 0;
          fpsCounterEl.textContent = `${qualityManager.getFps()} FPS`;
        }
      }
      setActiveQualityButton(qualityManager.getLevel());
    }

    // 2. Project 3D Tooltip to 2D Screen coordinates
    if (tooltipEl && interactionManager && camera) {
      const tip = interactionManager.getActiveTooltip();
      if (tip) {
        projVec.copy(tip.worldPos).project(camera);
        if (projVec.z < 1.0) {
          const x = (projVec.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
          tooltipEl.textContent = tip.text;
          tooltipEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -100%)`;
          tooltipEl.classList.add('visible');
        } else {
          tooltipEl.classList.remove('visible');
        }
      } else {
        tooltipEl.classList.remove('visible');
      }
    }

    // 3. Small Hover Tooltip with clickable object's name near the cursor
    if (hoverTooltipEl && interactionManager) {
      const hover = interactionManager.getHoverInfo ? interactionManager.getHoverInfo() : null;
      if (hover && hover.label) {
        hoverTooltipEl.textContent = hover.label;
        const hx = Math.min(window.innerWidth - 16, Math.max(16, Math.round(hover.x)));
        const hy = Math.max(28, Math.round(hover.y - 14));
        hoverTooltipEl.style.transform = `translate3d(${hx}px, ${hy}px, 0) translate(-50%, -100%)`;
        hoverTooltipEl.classList.add('visible');
      } else {
        hoverTooltipEl.classList.remove('visible');
      }
    }
  }

  return {
    hideLoadingScreen,
    setActiveQualityButton,
    update
  };
}
