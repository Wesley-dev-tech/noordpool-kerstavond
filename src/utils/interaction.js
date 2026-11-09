import * as THREE from 'three';

export function createInteractionManager(camera, domElement, cameraSys = null) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-999, -999);
  const clickableMeshes = [];
  const meshToEntry = new Map();

  const focusableMeshes = [];
  const focusableMeshSet = new Set();
  const meshToFocusEntry = new Map();
  const tempBox = new THREE.Box3();
  const tempSize = new THREE.Vector3();

  let pointerDirty = false;
  let hoveredEntry = null;
  let downPos = { x: 0, y: 0 };
  let pointerClientPos = { x: 0, y: 0 };

  let activeTooltip = null; // { text, worldPos: THREE.Vector3, remaining: number }

  function addMeshToFocusList(mesh) {
    if (!focusableMeshSet.has(mesh)) {
      focusableMeshSet.add(mesh);
      focusableMeshes.push(mesh);
    }
  }

  function registerClickable(object3D, options) {
    const entry = {
      id: options.id,
      label: options.label || '',
      object3D,
      glowMeshes: options.glowMeshes || [],
      onClick: options.onClick,
      focusTarget: options.focusTarget || null,
      focusDistance: options.focusDistance,
      focusHeightOffset: options.focusHeightOffset,
      preferredDir: options.preferredDir || null,
      preferredWeight: options.preferredWeight,
      getFocusConfig: options.getFocusConfig || null,
      savedEmissive: []
    };

    entry.glowMeshes.forEach((m) => {
      if (m.material && 'emissive' in m.material) {
        entry.savedEmissive.push({
          mesh: m,
          colorHex: m.material.emissive.getHex(),
          intensity: m.material.emissiveIntensity ?? 1.0
        });
      }
    });

    object3D.traverse((child) => {
      if (child.isMesh) {
        clickableMeshes.push(child);
        meshToEntry.set(child, entry);
        addMeshToFocusList(child);
      }
    });
  }

  function registerFocusable(object3D, options = {}) {
    const entry = {
      id: options.id || '',
      label: options.label || '',
      object3D,
      focusTarget: options.focusTarget || null,
      focusDistance: options.focusDistance,
      focusHeightOffset: options.focusHeightOffset,
      preferredDir: options.preferredDir || null,
      preferredWeight: options.preferredWeight,
      getFocusConfig: options.getFocusConfig || null
    };

    object3D.traverse((child) => {
      if (child.isMesh) {
        addMeshToFocusList(child);
        if (!meshToFocusEntry.has(child)) {
          meshToFocusEntry.set(child, entry);
        }
      }
    });
  }

  function resolveFocusParams(entry, hit) {
    if (entry.getFocusConfig) {
      return entry.getFocusConfig(hit);
    }

    let target = null;
    if (entry.focusTarget) {
      target =
        typeof entry.focusTarget === 'function'
          ? entry.focusTarget(hit)
          : entry.focusTarget.clone();
    }

    let distance = entry.focusDistance;
    let heightOffset = entry.focusHeightOffset;

    if (!target || distance === undefined) {
      tempBox.setFromObject(entry.object3D);
      if (!tempBox.isEmpty()) {
        if (!target) {
          target = new THREE.Vector3();
          tempBox.getCenter(target);
        }
        if (distance === undefined) {
          tempBox.getSize(tempSize);
          const maxDim = Math.max(tempSize.x, tempSize.y, tempSize.z);
          distance = THREE.MathUtils.clamp(maxDim * 1.35 + 1.4, 2.2, 10.0);
        }
      } else {
        target = hit.point.clone();
        distance = distance ?? 4.0;
      }
    }

    return {
      target,
      distance: distance ?? 4.0,
      heightOffset: heightOffset ?? 0.55,
      preferredDir: entry.preferredDir,
      preferredWeight: entry.preferredWeight,
      label: entry.label
    };
  }

  function setHoverEntry(nextEntry) {
    if (hoveredEntry === nextEntry) return;

    if (hoveredEntry) {
      hoveredEntry.savedEmissive.forEach((item) => {
        item.mesh.material.emissive.setHex(item.colorHex);
        item.mesh.material.emissiveIntensity = item.intensity;
      });
    }

    hoveredEntry = nextEntry;

    if (hoveredEntry) {
      document.body.style.cursor = 'pointer';
      hoveredEntry.savedEmissive.forEach((item) => {
        if (item.colorHex === 0x000000) {
          item.mesh.material.emissive.setHex(0x4466aa);
          item.mesh.material.emissiveIntensity = 0.55;
        } else {
          item.mesh.material.emissiveIntensity = item.intensity + 0.65;
        }
      });
    } else {
      document.body.style.cursor = 'default';
    }
  }

  function showTooltip(text, worldPos, duration = 4.0) {
    activeTooltip = {
      text,
      worldPos: worldPos.clone(),
      remaining: duration
    };
  }

  domElement.addEventListener('pointermove', (e) => {
    const rect = domElement.getBoundingClientRect();
    pointerClientPos.x = e.clientX;
    pointerClientPos.y = e.clientY;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointerDirty = true;
  });

  domElement.addEventListener('pointerleave', () => {
    pointerDirty = false;
    setHoverEntry(null);
  });

  domElement.addEventListener('pointerdown', (e) => {
    downPos.x = e.clientX;
    downPos.y = e.clientY;
  });

  domElement.addEventListener('pointerup', (e) => {
    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    if (dist > 6) return; // Ignore OrbitControls drag

    const rect = domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, false);
    if (hits.length > 0) {
      const entry = meshToEntry.get(hits[0].object);
      if (entry && entry.onClick) {
        entry.onClick(hits[0]);
      }
    }
  });

  domElement.addEventListener('dblclick', (e) => {
    if (!cameraSys || !cameraSys.flyToObject) return;

    const rect = domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(focusableMeshes, false);
    if (hits.length === 0) return;

    const hit = hits[0];
    // Prefer specific clickable entry (e.g. workshopDoor) over parent focusable entry (e.g. workshop cabin)
    const entry = meshToEntry.get(hit.object) || meshToFocusEntry.get(hit.object);
    if (!entry) return;

    const focusParams = resolveFocusParams(entry, hit);
    if (!focusParams || !focusParams.target) return;

    cameraSys.flyToObject(focusParams.target, {
      distance: focusParams.distance,
      heightOffset: focusParams.heightOffset,
      preferredDir: focusParams.preferredDir,
      preferredWeight: focusParams.preferredWeight
    });

    if (focusParams.label) {
      const tipPos = focusParams.tooltipPos || focusParams.target.clone().add(new THREE.Vector3(0, 1.2, 0));
      showTooltip(`${focusParams.label} · Druk op Esc om terug te keren`, tipPos, 3.2);
    }
  });

  function update(delta) {
    if (pointerDirty) {
      pointerDirty = false;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const entry = meshToEntry.get(hits[0].object);
        setHoverEntry(entry || null);
      } else {
        setHoverEntry(null);
      }
    }

    if (activeTooltip) {
      activeTooltip.remaining -= delta;
      if (activeTooltip.remaining <= 0) {
        activeTooltip = null;
      }
    }
  }

  return {
    registerClickable,
    registerFocusable,
    showTooltip,
    update,
    getActiveTooltip: () => activeTooltip,
    getHoverInfo: () =>
      hoveredEntry && hoveredEntry.label
        ? { label: hoveredEntry.label, x: pointerClientPos.x, y: pointerClientPos.y }
        : null
  };
}
