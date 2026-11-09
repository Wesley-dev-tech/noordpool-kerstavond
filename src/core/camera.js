import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COORDS } from '../config.js';
import { getTerrainHeight } from '../utils/procedural.js';

export function createCamera(rendererDomElement) {
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    250
  );

  const controls = new OrbitControls(camera, rendererDomElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1.4;
  controls.maxDistance = 42.0;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.target.set(
    COORDS.cameraDefaultTarget.x,
    COORDS.cameraDefaultTarget.y,
    COORDS.cameraDefaultTarget.z
  );

  const flightCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(COORDS.cameraIntroStart.x, COORDS.cameraIntroStart.y, COORDS.cameraIntroStart.z),
    new THREE.Vector3(COORDS.cameraIntroMid.x, COORDS.cameraIntroMid.y, COORDS.cameraIntroMid.z),
    new THREE.Vector3(COORDS.cameraDefaultPos.x, COORDS.cameraDefaultPos.y, COORDS.cameraDefaultPos.z)
  ]);

  const targetStart = new THREE.Vector3(
    COORDS.cameraTargetStart.x,
    COORDS.cameraTargetStart.y,
    COORDS.cameraTargetStart.z
  );
  const targetEnd = new THREE.Vector3(
    COORDS.cameraDefaultTarget.x,
    COORDS.cameraDefaultTarget.y,
    COORDS.cameraDefaultTarget.z
  );
  const defaultPos = new THREE.Vector3(
    COORDS.cameraDefaultPos.x,
    COORDS.cameraDefaultPos.y,
    COORDS.cameraDefaultPos.z
  );
  const tempPos = new THREE.Vector3();
  const tempTarget = new THREE.Vector3();

  const FLIGHT_DURATION = 5.0;
  let flightElapsed = 0;
  let inIntroFlight = true;

  // Smooth fly-to-object & Escape return state
  const savedReturnPos = defaultPos.clone();
  const savedReturnTarget = targetEnd.clone();
  let isFocusedOnObject = false;
  let activeTransition = null; // { startPos, endPos, startTarget, endTarget, elapsed, duration, arcHeight, startedAt }

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function startTransition(endPos, endTarget, duration = 1.35, arcHeight = 0) {
    if (inIntroFlight) {
      inIntroFlight = false;
    }
    activeTransition = {
      startPos: camera.position.clone(),
      endPos: endPos.clone(),
      startTarget: controls.target.clone(),
      endTarget: endTarget.clone(),
      elapsed: 0,
      duration,
      arcHeight,
      startedAt: performance.now()
    };
    controls.enabled = false;
  }

  function flyToObject(targetWorldPos, options = {}) {
    // Save overview camera pose before the first focus so Escape returns to where you came from
    if (inIntroFlight) {
      savedReturnPos.copy(defaultPos);
      savedReturnTarget.copy(targetEnd);
    } else if (!isFocusedOnObject && !activeTransition) {
      savedReturnPos.copy(camera.position);
      savedReturnTarget.copy(controls.target);
    }
    isFocusedOnObject = true;

    const distance = options.distance ?? 4.2;
    const heightOffset = options.heightOffset ?? 0.55;

    // Determine horizontal viewing direction: blend current camera approach with optional preferred direction
    const approachDir = new THREE.Vector3().subVectors(camera.position, targetWorldPos);
    approachDir.y = 0;
    if (approachDir.lengthSq() < 0.001) {
      approachDir.set(0, 0, 1);
    } else {
      approachDir.normalize();
    }

    if (options.preferredDir) {
      const pref = options.preferredDir.clone();
      pref.y = 0;
      if (pref.lengthSq() > 0.001) {
        pref.normalize();
        approachDir.lerp(pref, options.preferredWeight ?? 0.72).normalize();
      }
    }

    const destPos = new THREE.Vector3(
      targetWorldPos.x + approachDir.x * distance,
      targetWorldPos.y + heightOffset,
      targetWorldPos.z + approachDir.z * distance
    );

    const minGroundY = getTerrainHeight(destPos.x, destPos.z) + 0.65;
    if (destPos.y < minGroundY) {
      destPos.y = minGroundY;
    }

    const travelDist = camera.position.distanceTo(destPos);
    const duration = THREE.MathUtils.clamp(0.95 + travelDist * 0.032, 1.0, 1.65);
    const arcHeight = Math.min(1.6, travelDist * 0.06);

    startTransition(destPos, targetWorldPos, duration, arcHeight);
  }

  function returnFromFocus() {
    if (inIntroFlight) {
      skipIntroFlight();
      return false;
    }

    const destPos = isFocusedOnObject ? savedReturnPos : defaultPos;
    const destTarget = isFocusedOnObject ? savedReturnTarget : targetEnd;
    isFocusedOnObject = false;

    const distToReturn =
      camera.position.distanceTo(destPos) + controls.target.distanceTo(destTarget);
    if (distToReturn < 0.05) {
      return false;
    }

    const travelDist = camera.position.distanceTo(destPos);
    const duration = THREE.MathUtils.clamp(0.95 + travelDist * 0.03, 1.0, 1.55);
    const arcHeight = Math.min(1.4, travelDist * 0.05);

    startTransition(destPos, destTarget, duration, arcHeight);
    return true;
  }

  function startIntroFlight() {
    flightElapsed = 0;
    inIntroFlight = true;
    activeTransition = null;
    isFocusedOnObject = false;
    controls.enabled = false;
    camera.position.set(
      COORDS.cameraIntroStart.x,
      COORDS.cameraIntroStart.y,
      COORDS.cameraIntroStart.z
    );
    camera.lookAt(targetStart);
  }

  function skipIntroFlight() {
    if (!inIntroFlight) return;
    inIntroFlight = false;
    camera.position.copy(defaultPos);
    controls.target.copy(targetEnd);
    controls.enabled = true;
    controls.update();
  }

  // Allow user to interrupt intro flight or active camera transition by dragging or scrolling
  const onUserInterrupt = () => {
    if (inIntroFlight) {
      inIntroFlight = false;
      controls.enabled = true;
    } else if (activeTransition && performance.now() - activeTransition.startedAt > 180) {
      activeTransition = null;
      controls.enabled = true;
    }
  };
  rendererDomElement.addEventListener('pointerdown', onUserInterrupt, { passive: true });
  rendererDomElement.addEventListener('wheel', onUserInterrupt, { passive: true });
  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (isInput) return;

    if (e.code === 'Space') {
      skipIntroFlight();
    } else if (e.code === 'Escape') {
      if (inIntroFlight) {
        skipIntroFlight();
      } else {
        returnFromFocus();
      }
    }
  });

  startIntroFlight();

  function update(delta) {
    if (inIntroFlight) {
      flightElapsed += delta;
      const rawT = Math.min(1, flightElapsed / FLIGHT_DURATION);
      const t = easeInOutCubic(rawT);

      flightCurve.getPointAt(t, tempPos);
      camera.position.copy(tempPos);

      tempTarget.lerpVectors(targetStart, targetEnd, t);
      controls.target.copy(tempTarget);
      camera.lookAt(tempTarget);

      if (rawT >= 1) {
        inIntroFlight = false;
        controls.enabled = true;
      }
    } else if (activeTransition) {
      activeTransition.elapsed += delta;
      const rawT = Math.min(1, activeTransition.elapsed / activeTransition.duration);
      const t = easeInOutCubic(rawT);

      tempPos.lerpVectors(activeTransition.startPos, activeTransition.endPos, t);
      tempPos.y += Math.sin(t * Math.PI) * activeTransition.arcHeight;

      const minGroundY = getTerrainHeight(tempPos.x, tempPos.z) + 0.6;
      if (tempPos.y < minGroundY) {
        tempPos.y = minGroundY;
      }

      camera.position.copy(tempPos);

      tempTarget.lerpVectors(activeTransition.startTarget, activeTransition.endTarget, t);
      controls.target.copy(tempTarget);
      camera.lookAt(tempTarget);

      if (rawT >= 1) {
        activeTransition = null;
        controls.enabled = true;
        controls.update();
      }
    } else {
      controls.update();
      const minGroundY = getTerrainHeight(camera.position.x, camera.position.z) + 0.6;
      if (camera.position.y < minGroundY) {
        camera.position.y = minGroundY;
      }
    }
  }

  function resize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  return {
    camera,
    controls,
    startIntroFlight,
    skipIntroFlight,
    flyToObject,
    returnFromFocus,
    isFocused: () => isFocusedOnObject,
    update,
    resize
  };
}
