import * as THREE from 'three';

export function createHUD(callbacks) {
  const loadingScreen = document.getElementById('loading-screen');
  const fpsCounterEl = document.getElementById('fps-counter');
  const fpsToggleBtn = document.getElementById('btn-fps');
  const debugToggleBtn = document.getElementById('btn-debug');
  const elfVillageBtn = document.getElementById('btn-elf-village');
  const audioToggleBtn = document.getElementById('btn-audio');
  const tooltipEl = document.getElementById('scene-tooltip');
  const hoverTooltipEl = document.getElementById('hover-tooltip');
  const mailboxPopoverEl = document.getElementById('mailbox-wish-popover');
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

  if (debugToggleBtn) {
    debugToggleBtn.addEventListener('click', () => {
      if (callbacks.onToggleDebug) {
        const visible = callbacks.onToggleDebug();
        debugToggleBtn.classList.toggle('active', visible);
      }
    });
  }

  if (elfVillageBtn) {
    elfVillageBtn.addEventListener('click', () => {
      if (callbacks.onFlyToElfVillage) {
        callbacks.onFlyToElfVillage();
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

  function update(delta, camera, qualityManager, interactionManager, mailboxManager = null) {
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

    if (debugToggleBtn && callbacks.isObstacleDebugActive) {
      debugToggleBtn.classList.toggle('active', callbacks.isObstacleDebugActive());
    }

    // 2. Project 3D Tooltip to 2D Screen coordinates (met viewport clamping zodat ze altijd binnen beeld blijven)
    if (tooltipEl && interactionManager && camera) {
      const tip = interactionManager.getActiveTooltip();
      if (tip) {
        projVec.copy(tip.worldPos).project(camera);
        if (projVec.z < 1.0) {
          const rawX = (projVec.x * 0.5 + 0.5) * window.innerWidth;
          const rawY = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
          tooltipEl.textContent = tip.text;
          tooltipEl.classList.add('visible');

          // Ensure tooltip is measured and clamped strictly within viewport boundaries
          const tipW = tooltipEl.offsetWidth || 240;
          const tipH = tooltipEl.offsetHeight || 44;
          const padX = 16;
          const padTop = 64; // Ruimte onder HUD headerknoppen
          const padBottom = 20;

          const minX = tipW * 0.5 + padX;
          const maxX = window.innerWidth - tipW * 0.5 - padX;
          const clampedX = maxX > minX ? Math.min(maxX, Math.max(minX, rawX)) : window.innerWidth * 0.5;

          const minY = tipH + padTop;
          const maxY = window.innerHeight - padBottom;
          const clampedY = maxY > minY ? Math.min(maxY, Math.max(minY, rawY)) : window.innerHeight * 0.5;

          tooltipEl.style.transform = `translate3d(${Math.round(clampedX)}px, ${Math.round(clampedY)}px, 0) translate(-50%, -100%)`;
        } else {
          tooltipEl.classList.remove('visible');
        }
      } else {
        tooltipEl.classList.remove('visible');
      }
    }

    // 3. Small Hover Tooltip with clickable object's name near the cursor (binnen viewport)
    if (hoverTooltipEl && interactionManager) {
      const hover = interactionManager.getHoverInfo ? interactionManager.getHoverInfo() : null;
      if (hover && hover.label) {
        hoverTooltipEl.textContent = hover.label;
        hoverTooltipEl.classList.add('visible');
        const tipW = hoverTooltipEl.offsetWidth || 120;
        const tipH = hoverTooltipEl.offsetHeight || 28;
        const pad = 12;
        const padTop = 50;

        const minX = tipW * 0.5 + pad;
        const maxX = window.innerWidth - tipW * 0.5 - pad;
        const hx = maxX > minX ? Math.min(maxX, Math.max(minX, hover.x)) : window.innerWidth * 0.5;

        const minY = tipH + padTop;
        const maxY = window.innerHeight - pad;
        const hy = maxY > minY ? Math.min(maxY, Math.max(minY, hover.y - 14)) : window.innerHeight * 0.5;

        hoverTooltipEl.style.transform = `translate3d(${Math.round(hx)}px, ${Math.round(hy)}px, 0) translate(-50%, -100%)`;
      } else {
        hoverTooltipEl.classList.remove('visible');
      }
    }

    // 4. Project Mailbox Wish Input Popover above the Mailbox in 2D Screen coordinates
    const popoverEl = mailboxPopoverEl || document.getElementById('mailbox-wish-popover');
    if (popoverEl && mailboxManager && mailboxManager.getPopoverAnchor && camera) {
      const anchor = mailboxManager.getPopoverAnchor();
      if (anchor) {
        projVec.copy(anchor).project(camera);
        if (projVec.z < 1.0) {
          const rawX = (projVec.x * 0.5 + 0.5) * window.innerWidth;
          const rawY = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
          const clampedX = Math.min(window.innerWidth - 150, Math.max(150, Math.round(rawX)));
          const clampedY = Math.min(window.innerHeight - 24, Math.max(110, Math.round(rawY)));
          popoverEl.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) translate(-50%, -100%)`;
        }
      }
    }
  }

  return {
    hideLoadingScreen,
    setActiveQualityButton,
    update
  };
}
