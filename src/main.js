import * as THREE from 'three';
import { QUALITY_PRESETS, COORDS } from './config.js';
import { getTerrainHeight } from './utils/procedural.js';
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
import { createElfVillage } from './world/elf-village.js';
import { createPath } from './world/path-v2.js';
import { createElves } from './actors/elves.js';
import { createRailway } from './world/railway.js';
import { createObstacleDebugger } from './world/obstacles.js';
import { createHUD } from './ui/hud.js';
import { createAudioManager } from './ui/audio.js';

window.THREE = THREE;

const container = document.getElementById('app');
if (new URLSearchParams(window.location.search).has('view')) {
  const el = document.getElementById('loading-screen');
  if (el) el.remove();
}
// Mobiele toestellen (touchscreen / telefoon-UA) starten op 'Midden' om GPU-geheugen
// en shadercompilatie te sparen; desktop blijft op 'Hoog'.
const isMobileDevice =
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const initialLevel = isMobileDevice ? 'medium' : 'high';
const initialPreset = QUALITY_PRESETS[initialLevel];

// 1. Core Systems
const rendererSys = createRenderer(container, initialPreset);
const cameraSys = createCamera(rendererSys.renderer.domElement);
window.__cameraSys = cameraSys;
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
const auroraSys = createAurora(rendererSys.scene, cameraSys.camera);
const northPoleSys = createNorthPole(rendererSys.scene, interactionSys, audioSys);
const workshopSys = createWorkshop(rendererSys.scene, lightsSys, interactionSys, audioSys, initialPreset, cameraSys.camera);
const mailboxSys = createMailbox(rendererSys.scene, interactionSys, audioSys);
const treesSys = createTrees(rendererSys.scene, interactionSys, audioSys);
const snowSys = createSnow(rendererSys.scene, initialPreset);
const sleighSys = createSleigh(rendererSys.scene, initialPreset, interactionSys, audioSys);
const giftsSys = createGifts(rendererSys.scene, interactionSys, audioSys);
const santaCoupleSys = createSantaCouple(rendererSys.scene, interactionSys, audioSys);
const elfVillageSys = createElfVillage(rendererSys.scene, interactionSys, audioSys);
const pathSys = createPath(rendererSys.scene);
const elvesSys = createElves(rendererSys.scene, interactionSys, audioSys);
const railwaySys = createRailway(rendererSys.scene, interactionSys, audioSys);
const obstacleDebugSys = createObstacleDebugger(rendererSys.scene, () => [elvesSys.elves[0], elvesSys.elves[1]]);

// Expose systems for diagnostics / interactive testing
window.__WORLD__ = {
  scene: rendererSys.scene,
  rendererSys,
  cameraSys,
  lightsSys,
  interactionSys,
  audioSys,
  workshopSys,
  santaCoupleSys,
  elfVillageSys,
  pathSys,
  elvesSys,
  railwaySys,
  obstacleDebugSys
};

// URL query parameter support for direct camera inspection (e.g. ?view=snowman, ?view=elf, ?view=carrier, ?view=woodcutter)
const urlParams = new URLSearchParams(window.location.search);
const viewParam = urlParams.get('view');
const chopTParam = urlParams.get('chopT');
if (chopTParam !== null) {
  window.__freezeChopT = parseFloat(chopTParam);
  window.__freezeChopCount = urlParams.get('chopCount') ? parseInt(urlParams.get('chopCount'), 10) : 1;
  window.__freezeChopAction = urlParams.get('chopAction') || 'chopping';
} else if (urlParams.get('chopAction')) {
  window.__freezeChopT = 1.2;
  window.__freezeChopCount = 3;
  window.__freezeChopAction = urlParams.get('chopAction');
}

if (viewParam === 'snowman') {
  const smPos = new THREE.Vector3(-15.4, getTerrainHeight(-15.4, 8.0), 8.0);
  cameraSys.teleport(
    new THREE.Vector3(-16.6, smPos.y + 1.15, 9.6),
    new THREE.Vector3(-15.4, smPos.y + 0.95, 8.0)
  );
} else if (viewParam === 'elf' || viewParam === 'elfje') {
  // Focus up-close on Barnaby (Elf 5) on the village square
  const barnabyPos = new THREE.Vector3(-15.2, getTerrainHeight(-15.2, 6.8), 6.8);
  cameraSys.teleport(
    new THREE.Vector3(-15.2, barnabyPos.y + 0.65, 5.2),
    new THREE.Vector3(-15.2, barnabyPos.y + 0.50, 6.8)
  );
} else if (viewParam === 'chatter' || viewParam === 'barnaby') {
  // Focus up-close on Barnaby on the village square
  const elfPos = new THREE.Vector3(-15.2, getTerrainHeight(-15.2, 6.8), 6.8);
  cameraSys.teleport(
    new THREE.Vector3(-15.2, elfPos.y + 0.65, 5.2),
    new THREE.Vector3(-15.2, elfPos.y + 0.50, 6.8)
  );
} else if (viewParam === 'path_eye' || viewParam === 'path_closeup') {
  // Close-up view at eye level looking along the natural stepping stones, trodden snow and footprints
  const gy = getTerrainHeight(-8.0, -1.2);
  cameraSys.teleport(
    new THREE.Vector3(-8.8, gy + 0.52, 0.5),
    new THREE.Vector3(-7.7, gy + 0.18, -2.4)
  );
} else if (viewParam === 'path_topdown' || viewParam === 'path_top') {
  // Top-down bird's-eye view directly above the stepping stone path to verify non-grid natural layout
  const gy = getTerrainHeight(-8.0, -0.9);
  cameraSys.teleport(
    new THREE.Vector3(-8.0, gy + 5.0, -0.9),
    new THREE.Vector3(-8.0, gy, -0.901)
  );
} else if (viewParam === 'path_village') {
  // Focus up-close on path entering the elf village
  const pathPos = new THREE.Vector3(-14.6, getTerrainHeight(-14.6, 8.2), 8.2);
  cameraSys.teleport(
    new THREE.Vector3(-12.8, pathPos.y + 1.8, 9.8),
    new THREE.Vector3(-15.2, pathPos.y + 0.3, 7.8)
  );
} else if (viewParam === 'carrier' || viewParam === 'sled' || viewParam === 'path' || viewParam === 'path_workshop') {
  // Focus up-close on path and walking elves near workshop porch
  const pathPos = new THREE.Vector3(-7.8, getTerrainHeight(-7.8, -1.8), -1.8);
  cameraSys.teleport(
    new THREE.Vector3(-5.8, pathPos.y + 1.8, 0.8),
    new THREE.Vector3(-7.8, pathPos.y + 0.3, -1.8)
  );
} else if (viewParam === 'santa' || viewParam === 'claus' || viewParam === 'couple') {
  // Focus up-close on Santa Claus & Mrs. Claus to clearly inspect their realistic shadows
  const couplePos = new THREE.Vector3(COORDS.santaCouple.x, 0, COORDS.santaCouple.z);
  const gy = getTerrainHeight(couplePos.x, couplePos.z);
  cameraSys.teleport(
    new THREE.Vector3(couplePos.x + 1.8, gy + 1.25, couplePos.z + 2.8),
    new THREE.Vector3(couplePos.x - 0.2, gy + 0.85, couplePos.z)
  );
} else if (viewParam === 'walker' || viewParam === 'walking' || viewParam === 'pippin') {
  // Focus directly on walking elf Pippin
  const p = elvesSys.elves[0].root.position;
  cameraSys.teleport(
    new THREE.Vector3(p.x + 1.6, p.y + 1.1, p.z + 2.2),
    new THREE.Vector3(p.x, p.y + 0.5, p.z)
  );
} else if (viewParam === 'debug') {
  obstacleDebugSys.setVisible(true);
} else if (viewParam === 'tree' || viewParam === 'dancers' || viewParam === 'tree_dancers') {
  const treeY = getTerrainHeight(-18.0, 8.5);
  cameraSys.teleport(
    new THREE.Vector3(-18.0, treeY + 2.2, 13.5),
    new THREE.Vector3(-18.0, treeY + 0.9, 8.5)
  );
} else if (viewParam === 'ladder_side') {
  // Close-up zij-aanzicht van de ladder en het elfje (loodrecht op de ladderhelling)
  const footY = getTerrainHeight(-13.28, 21.85);
  const focusTarget = new THREE.Vector3(-13.23, footY + 1.45, 22.28);
  cameraSys.teleport(
    new THREE.Vector3(-15.65, footY + 1.55, 22.56),
    focusTarget
  );
} else if (viewParam === 'ladder_front') {
  // Close-up vooraanzicht van de ladder en het elfje (recht van voren)
  const footY = getTerrainHeight(-13.28, 21.85);
  const focusTarget = new THREE.Vector3(-13.23, footY + 1.45, 22.28);
  cameraSys.teleport(
    new THREE.Vector3(-13.52, footY + 1.55, 19.70),
    focusTarget
  );
} else if (viewParam === 'ladder' || viewParam === 'jingle') {
  // Driekwart cinematisch overzicht van ladder, elf en gevel
  const footY = getTerrainHeight(-13.28, 21.85);
  const focusTarget = new THREE.Vector3(-13.23, footY + 1.45, 22.28);
  cameraSys.teleport(
    new THREE.Vector3(-15.22, footY + 1.65, 20.70),
    focusTarget
  );
} else if (viewParam === 'choco' || viewParam === 'stall' || viewParam === 'coco') {
  const stallY = getTerrainHeight(-13.6, 16.2);
  cameraSys.teleport(
    new THREE.Vector3(-15.8, stallY + 1.35, 13.8),
    new THREE.Vector3(-13.6, stallY + 1.05, 16.2)
  );
} else if (viewParam === 'woodcutter' || viewParam === 'bram' || viewParam === 'axe') {
  const stumpY = getTerrainHeight(-9.8, 14.2);
  cameraSys.teleport(
    new THREE.Vector3(-11.6, stumpY + 0.65, 14.6),
    new THREE.Vector3(-9.8, stumpY + 0.5, 14.6)
  );
} else if (viewParam === 'bench' || viewParam === 'village_bench') {
  const benchY = getTerrainHeight(-21.8, 6.3);
  cameraSys.teleport(
    new THREE.Vector3(-19.0, benchY + 1.25, 4.4),
    new THREE.Vector3(-21.8, benchY + 0.45, 6.3)
  );
} else if (viewParam === 'village_lantern' || viewParam === 'lantern_glow') {
  const lanternY = getTerrainHeight(-11.5, 9.8);
  cameraSys.teleport(
    new THREE.Vector3(-9.2, lanternY + 1.35, 7.8),
    new THREE.Vector3(-11.5, lanternY + 0.35, 9.8)
  );
} else if (viewParam === 'snowman' || viewParam === 'village_snowman') {
  const smY = getTerrainHeight(-23.8, 6.5);
  cameraSys.teleport(
    new THREE.Vector3(-21.4, smY + 1.25, 5.0),
    new THREE.Vector3(-23.8, smY + 0.55, 6.5)
  );
} else if (viewParam === 'tree' || viewParam === 'plaza' || viewParam === 'dorpsplein') {
  const gy = getTerrainHeight(-18.0, 8.5);
  cameraSys.teleport(
    new THREE.Vector3(-13.8, gy + 2.8, 12.2),
    new THREE.Vector3(-18.0, gy + 1.2, 8.5)
  );
} else if (viewParam === 'elf_village') {
  const center = COORDS.elfVillage.squareCenter;
  const gy = getTerrainHeight(center.x, center.z);
  cameraSys.teleport(
    new THREE.Vector3(center.x + 6.1, gy + 4.15, center.z + 4.86),
    new THREE.Vector3(center.x, gy + 1.35, center.z)
  );
} else if (viewParam === 'snowball' || viewParam === 'snowball_fight' || viewParam === 'snowballs') {
  // Broad scenic view framing both snow walls, Bramble & Noel, and the 8m arena between them
  const midX = -20.25;
  const midZ = 13.2;
  const midY = getTerrainHeight(midX, midZ);
  cameraSys.teleport(
    new THREE.Vector3(-25.2, midY + 2.6, 17.8),
    new THREE.Vector3(midX, midY + 0.65, midZ)
  );
} else if (viewParam === 'bramble' || viewParam === 'snowball_bramble' || viewParam === 'elf_bramble') {
  // Direct close-up on Bramble and his curved snow wall with ready snowballs on top
  const bp = elvesSys.elves[2].root.position;
  cameraSys.teleport(
    new THREE.Vector3(bp.x - 0.75, bp.y + 0.85, bp.z + 1.65),
    new THREE.Vector3(bp.x + 0.15, bp.y + 0.50, bp.z + 0.20)
  );
} else if (viewParam === 'noel' || viewParam === 'snowball_noel' || viewParam === 'elf_noel') {
  // Direct close-up on Noel and his curved snow wall with ready snowballs on top
  const np = elvesSys.elves[3].root.position;
  const gy = getTerrainHeight(np.x, np.z);
  cameraSys.teleport(
    new THREE.Vector3(np.x + 1.30, gy + 1.05, np.z - 1.40),
    new THREE.Vector3(np.x, gy + 0.50, np.z)
  );
} else if (viewParam === 'snowball_throw' || viewParam === 'throw_action') {
  // Dynamic view midden in een worp: Bramble whipping forward, flying snowball in mid-air parabola, Noel ducking behind wall
  const midY = getTerrainHeight(-20.25, 13.2);
  cameraSys.teleport(
    new THREE.Vector3(-25.5, midY + 1.45, 9.8),
    new THREE.Vector3(-18.0, midY + 1.0, 15.5)
  );
} else if (viewParam === 'snowball_throw_close' || viewParam === 'throw_close') {
  // Closer action shot focused on thrower Bramble whipping forward with mid-air snowball leaving his hand towards Noel
  const bp = elvesSys.elves[2].root.position;
  cameraSys.teleport(
    new THREE.Vector3(bp.x - 1.6, bp.y + 0.95, bp.z + 1.8),
    new THREE.Vector3(bp.x + 1.8, bp.y + 0.70, bp.z + 1.6)
  );
} else if (viewParam === 'village_trees' || viewParam === 'elf_trees') {
  // Elevated panoramic view of the entire elfenplein and the 5 decorated Christmas trees
  const gy = getTerrainHeight(-18.0, 8.5);
  cameraSys.teleport(
    new THREE.Vector3(-18.0, gy + 13.5, 24.5),
    new THREE.Vector3(-18.0, gy + 1.2, 8.5)
  );
} else if (viewParam === 'tree1' || viewParam === 'tree1_close') {
  // Tree 1: Gold & Warm White
  const gy = getTerrainHeight(-14.60, 11.80);
  cameraSys.teleport(
    new THREE.Vector3(-16.6, gy + 1.2, 9.8),
    new THREE.Vector3(-14.60, gy + 1.1, 11.80)
  );
} else if (viewParam === 'tree2' || viewParam === 'tree2_close') {
  // Tree 2: Candy Cane & Red
  const gy = getTerrainHeight(-21.80, 16.40);
  cameraSys.teleport(
    new THREE.Vector3(-20.0, gy + 1.3, 13.8),
    new THREE.Vector3(-21.80, gy + 1.2, 16.40)
  );
} else if (viewParam === 'tree3' || viewParam === 'tree3_close') {
  // Tree 3: Multicolor & Silver
  const gy = getTerrainHeight(-26.60, 9.00);
  cameraSys.teleport(
    new THREE.Vector3(-23.6, gy + 1.2, 8.8),
    new THREE.Vector3(-26.60, gy + 1.1, 9.00)
  );
} else if (viewParam === 'tree4' || viewParam === 'tree4_close') {
  // Tree 4: Blue, Silver & Icicles
  const gy = getTerrainHeight(-22.80, 1.60);
  cameraSys.teleport(
    new THREE.Vector3(-20.4, gy + 1.3, 3.8),
    new THREE.Vector3(-22.80, gy + 1.1, 1.60)
  );
} else if (viewParam === 'tree5' || viewParam === 'tree5_close') {
  // Tree 5: Elfenboom
  const gy = getTerrainHeight(-14.50, 2.50);
  cameraSys.teleport(
    new THREE.Vector3(-16.8, gy + 1.2, 4.8),
    new THREE.Vector3(-14.50, gy + 1.1, 2.50)
  );
} else if (viewParam === 'station' || viewParam === 'kersthalte' || viewParam === 'perron') {
  const gy = getTerrainHeight(-14.6, 2.2);
  cameraSys.teleport(
    new THREE.Vector3(-8.6, gy + 2.0, 1.0),
    new THREE.Vector3(-14.6, gy + 1.2, 2.2)
  );
} else if (viewParam === 'overweg' || viewParam === 'crossing') {
  const gy = getTerrainHeight(-10.8, 4.2);
  cameraSys.teleport(
    new THREE.Vector3(-7.8, gy + 2.0, 6.8),
    new THREE.Vector3(-10.8, gy + 0.6, 4.2)
  );
} else if (viewParam === 'railway' || viewParam === 'spoor') {
  const gy = getTerrainHeight(0, 0);
  cameraSys.teleport(
    new THREE.Vector3(4.0, gy + 38.0, 42.0),
    new THREE.Vector3(-2.0, gy + 1.0, 0.0)
  );
} else if (viewParam === 'overview' || viewParam === 'default') {
  cameraSys.teleport(
    new THREE.Vector3(COORDS.cameraDefaultPos.x, COORDS.cameraDefaultPos.y, COORDS.cameraDefaultPos.z),
    new THREE.Vector3(COORDS.cameraDefaultTarget.x, COORDS.cameraDefaultTarget.y, COORDS.cameraDefaultTarget.z)
  );
} else if (viewParam === 'north' || viewParam === 'aurora_north') {
  cameraSys.teleport(
    new THREE.Vector3(0, 5.0, 10.0),
    new THREE.Vector3(0, 15.0, -45.0)
  );
} else if (viewParam === 'east' || viewParam === 'aurora_east') {
  cameraSys.teleport(
    new THREE.Vector3(0, 5.0, 10.0),
    new THREE.Vector3(55.0, 15.0, 10.0)
  );
} else if (viewParam === 'south' || viewParam === 'aurora_south') {
  cameraSys.teleport(
    new THREE.Vector3(0, 5.0, 10.0),
    new THREE.Vector3(0, 15.0, 65.0)
  );
} else if (viewParam === 'west' || viewParam === 'aurora_west') {
  cameraSys.teleport(
    new THREE.Vector3(0, 5.0, 10.0),
    new THREE.Vector3(-55.0, 15.0, 10.0)
  );
}

const camParam = urlParams.get('cam');
const targetParam = urlParams.get('target');
if (camParam && targetParam) {
  const c = camParam.split(',').map(Number);
  const t = targetParam.split(',').map(Number);
  cameraSys.teleport(
    new THREE.Vector3(c[0], c[1], c[2]),
    new THREE.Vector3(t[0], t[1], t[2])
  );
}

const yawParam = urlParams.get('yaw');
if (yawParam !== null) {
  const yawRad = (parseFloat(yawParam) * Math.PI) / 180.0;
  const pitchRad = ((parseFloat(urlParams.get('pitch') || '12')) * Math.PI) / 180.0;
  const camPos = new THREE.Vector3(0, 6.0, 0);
  const dist = 50.0;
  const targetPos = new THREE.Vector3(
    camPos.x + Math.sin(yawRad) * Math.cos(pitchRad) * dist,
    camPos.y + Math.sin(pitchRad) * dist,
    camPos.z - Math.cos(yawRad) * Math.cos(pitchRad) * dist
  );
  cameraSys.teleport(camPos, targetPos);
}

if (urlParams.get('debug') === '1' || urlParams.get('debug') === 'true') {
  obstacleDebugSys.setVisible(true);
}

// 3. Quality & HUD
const qualitySys = createQualityManager(initialLevel, (preset, levelName) => {
  rendererSys.setQuality(preset);
  lightsSys.setQuality(preset, levelName);
  skySys.setQuality(preset);
  auroraSys.setQuality(preset);
  snowSys.setQuality(preset);
  sleighSys.setQuality(preset);
  workshopSys.setQuality(preset, levelName);
  elfVillageSys.setQuality(preset, levelName);
});

// Apply initial preset configuration to all lights and modules
lightsSys.setQuality(initialPreset, initialLevel);
workshopSys.setQuality(initialPreset, initialLevel);
elfVillageSys.setQuality(initialPreset, initialLevel);

const qualityParam = urlParams.get('quality');
if (qualityParam && ['low', 'medium', 'high'].includes(qualityParam)) {
  qualitySys.setLevel(qualityParam, true);
}
if (urlParams.get('fps') === '1' || urlParams.get('fps') === 'true') {
  qualitySys.toggleFpsVisible();
}

const hudSys = createHUD({
  onQualitySelect: (level) => qualitySys.setLevel(level, true),
  onToggleAudio: () => audioSys.toggle(),
  onToggleFps: () => qualitySys.toggleFpsVisible(),
  onToggleDebug: () => obstacleDebugSys.toggle(),
  isObstacleDebugActive: () => obstacleDebugSys.isVisible(),
  onFlyToElfVillage: () => {
    const center = COORDS.elfVillage.squareCenter;
    const gy = getTerrainHeight(center.x, center.z);
    cameraSys.flyToObject(
      new THREE.Vector3(center.x, gy + 1.35, center.z),
      {
        distance: 8.2,
        heightOffset: 2.9,
        preferredDir: new THREE.Vector3(0.78, 0, 0.62).normalize(),
        preferredWeight: 1.0,
        duration: 2.2
      }
    );
  }
});

hudSys.setActiveQualityButton(qualitySys.getLevel());

// Hide loading screen once scene is compiled
if (viewParam) {
  const ls = document.getElementById('loading-screen');
  if (ls) ls.style.display = 'none';
}
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
  lightsSys.update(delta, totalElapsed, cameraSys.controls ? cameraSys.controls.target : null);

  skySys.update(delta, totalElapsed);
  auroraSys.update(delta, totalElapsed, cameraSys.camera);
  northPoleSys.update(delta, totalElapsed);
  workshopSys.update(delta, totalElapsed);
  mailboxSys.update(delta, totalElapsed);
  treesSys.update(delta, totalElapsed);
  snowSys.update(delta, totalElapsed);
  sleighSys.update(delta, totalElapsed);
  giftsSys.update(delta, totalElapsed);
  santaCoupleSys.update(delta, totalElapsed);
  elfVillageSys.update(delta, totalElapsed);
  pathSys.update(delta, totalElapsed);
  elvesSys.update(delta, totalElapsed);
  railwaySys.update(delta, totalElapsed);
  obstacleDebugSys.update(delta, totalElapsed);

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
