import * as THREE from 'three';
import { QUALITY_PRESETS } from './config.js';
import { createRenderer } from './core/renderer.js';
import { createCamera } from './core/camera.js';
import { createLights } from './core/lights.js';
import { createQualityManager } from './core/quality.js';
import { createInteractionManager } from './utils/interaction.js';
import { createTerrain } from './world/terrain.js';
import { createSky } from './world/sky.js';
import { createAurora } from './world/aurora.js';
import { createNorthPole } from './world/northPole.js';
import { createWorkshop } from './world/workshop.js';
import { createMailbox } from './world/mailbox.js';
import { createTrees } from './world/trees.js';
import { createSnow } from './world/snow.js';
import { createSleigh } from './world/sleigh.js';
import { createGifts } from './world/gifts.js';
import { createSantaCouple } from './actors/santa-couple.js';
import { createHUD } from './ui/hud.js?v=3';
import { createAudioManager } from './ui/audio.js?v=3';

const container = document.getElementById('app');
const initialPreset = QUALITY_PRESETS.high;

// 1. Core Systems
const rendererSys = createRenderer(container, initialPreset);
const cameraSys = createCamera(rendererSys.renderer.domElement);
rendererSys.initPostProcessing(cameraSys.camera);

const lightsSys = createLights(rendererSys.scene, initialPreset);
const audioSys = createAudioManager();
const interactionSys = createInteractionManager(
  cameraSys.camera,
  rendererSys.renderer.domElement,
  cameraSys
);

// 2. World Modules
createTerrain(rendererSys.scene, interactionSys);
const skySys = createSky(rendererSys.scene, initialPreset);
const auroraSys = createAurora(rendererSys.scene);
const northPoleSys = createNorthPole(rendererSys.scene, interactionSys, audioSys);
const workshopSys = createWorkshop(rendererSys.scene, lightsSys, interactionSys, audioSys, initialPreset);
const mailboxSys = createMailbox(rendererSys.scene, interactionSys, audioSys);
const treesSys = createTrees(rendererSys.scene, interactionSys, audioSys);
const snowSys = createSnow(rendererSys.scene, initialPreset);
const sleighSys = createSleigh(rendererSys.scene, initialPreset, interactionSys, audioSys);
const giftsSys = createGifts(rendererSys.scene, interactionSys, audioSys);
const santaCoupleSys = createSantaCouple(rendererSys.scene, interactionSys, audioSys);

// 3. Quality & HUD
const qualitySys = createQualityManager('high', (preset) => {
  rendererSys.setQuality(preset);
  lightsSys.setQuality(preset);
  skySys.setQuality(preset);
  snowSys.setQuality(preset);
  sleighSys.setQuality(preset);
  workshopSys.setQuality(preset);
});

const hudSys = createHUD({
  onQualitySelect: (level) => qualitySys.setLevel(level, true),
  onToggleAudio: () => audioSys.toggle(),
  onToggleFps: () => qualitySys.toggleFpsVisible()
});

// Hide loading screen once scene is compiled
requestAnimationFrame(() => {
  rendererSys.render(cameraSys.camera);
  hudSys.hideLoadingScreen();
});

// 4. Resize & Visibility Handlers
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  cameraSys.resize(w, h);
  rendererSys.resize(w, h);
});

const clock = new THREE.Clock();
let totalElapsed = 0;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clock.stop();
    audioSys.setSuspended(true);
  } else {
    clock.start();
    audioSys.setSuspended(false);
  }
});

// 5. Central Animation Loop
function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return;

  const delta = Math.min(clock.getDelta(), 0.1);
  totalElapsed += delta;

  qualitySys.update(delta, totalElapsed);
  cameraSys.update(delta, totalElapsed);
  lightsSys.update(delta, totalElapsed);

  skySys.update(delta, totalElapsed);
  auroraSys.update(delta, totalElapsed);
  northPoleSys.update(delta, totalElapsed);
  workshopSys.update(delta, totalElapsed);
  mailboxSys.update(delta, totalElapsed);
  treesSys.update(delta, totalElapsed);
  snowSys.update(delta, totalElapsed);
  sleighSys.update(delta, totalElapsed);
  giftsSys.update(delta, totalElapsed);
  santaCoupleSys.update(delta, totalElapsed);

  interactionSys.update(delta, totalElapsed);
  audioSys.update(
    delta,
    totalElapsed,
    cameraSys.camera.position,
    sleighSys.getPosition(),
    snowSys.getGustStrength()
  );
  hudSys.update(delta, cameraSys.camera, qualitySys, interactionSys, mailboxSys);

  rendererSys.render(cameraSys.camera);
}

animate();
