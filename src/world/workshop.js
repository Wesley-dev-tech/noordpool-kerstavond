import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, COORDS, GROUPS, QUALITY_PRESETS } from '../config.js';
import { createWoodTexture, createWindowGlowTexture, createSmokeSprite } from '../utils/procedural.js';

function createWorkshopSignTexture(text, subtext = '', bgColor = '#4a2c18', textColor = '#fff6e0') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 160);

  // Subtle wood grain
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  for (let y = 6; y < 160; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + 4, 340, y - 4, 512, y + 2);
    ctx.stroke();
  }

  // Gold border
  ctx.strokeStyle = '#ffcc33';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 144);

  const maxWidth = 448; // Leave generous horizontal margin inside the gold border
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontSize = subtext ? 34 : 38;
  ctx.font = `bold ${fontSize}px Georgia, serif`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 16) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px Georgia, serif`;
  }
  ctx.fillText(text, 256, subtext ? 62 : 80, maxWidth);

  if (subtext) {
    ctx.fillStyle = '#ffd966';
    let subFontSize = 24;
    ctx.font = `bold ${subFontSize}px sans-serif`;
    while (ctx.measureText(subtext).width > maxWidth && subFontSize > 12) {
      subFontSize -= 1;
      ctx.font = `bold ${subFontSize}px sans-serif`;
    }
    ctx.fillText(subtext, 256, 114, maxWidth);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWorkshop(scene, lights, interaction, audio, initialPreset = QUALITY_PRESETS.high) {
  const rootGroup = new THREE.Group();
  rootGroup.name = GROUPS.GROUP_WORKSHOP;

  const cabinGroup = new THREE.Group();
  cabinGroup.position.set(COORDS.workshop.x, COORDS.workshop.y, COORDS.workshop.z);
  cabinGroup.rotation.y = COORDS.workshop.rotY;
  rootGroup.add(cabinGroup);

  const woodTex = createWoodTexture();
  const darkWoodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: COLORS.WOOD_WARM,
    roughness: 0.82,
    metalness: 0.05
  });
  const trimWoodMat = new THREE.MeshStandardMaterial({
    color: COLORS.WOOD_DARK,
    roughness: 0.78,
    metalness: 0.05
  });
  const snowMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.25,
    roughness: 0.68,
    metalness: 0.05
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: COLORS.STONE_CHIMNEY,
    roughness: 0.88,
    metalness: 0.08
  });

  // 1. Main Cabin Core + Merged Log Beams
  const W = 7.0;
  const H = 3.3;
  const D = 5.4;

  const logGeos = [];
  const coreBox = new THREE.BoxGeometry(W - 0.2, H, D - 0.2);
  coreBox.translate(0, H / 2, 0);
  logGeos.push(coreBox);

  const numLogs = 11;
  const logR = 0.16;
  for (let i = 0; i < numLogs; i++) {
    const y = 0.18 + i * 0.29;
    // Front & back horizontal logs
    const fbLog1 = new THREE.CylinderGeometry(logR, logR, W + 0.5, 10);
    fbLog1.rotateZ(Math.PI / 2);
    fbLog1.translate(0, y, D / 2);
    logGeos.push(fbLog1);

    const fbLog2 = new THREE.CylinderGeometry(logR, logR, W + 0.5, 10);
    fbLog2.rotateZ(Math.PI / 2);
    fbLog2.translate(0, y, -D / 2);
    logGeos.push(fbLog2);

    // Left & right horizontal logs
    const lrLog1 = new THREE.CylinderGeometry(logR, logR, D + 0.5, 10);
    lrLog1.rotateX(Math.PI / 2);
    lrLog1.translate(-W / 2, y + 0.14, 0);
    logGeos.push(lrLog1);

    const lrLog2 = new THREE.CylinderGeometry(logR, logR, D + 0.5, 10);
    lrLog2.rotateX(Math.PI / 2);
    lrLog2.translate(W / 2, y + 0.14, 0);
    logGeos.push(lrLog2);
  }

  // Porch floor + 4 support pillars
  const porchFloor = new THREE.BoxGeometry(W + 0.4, 0.22, 2.1);
  porchFloor.translate(0, 0.11, D / 2 + 1.0);
  logGeos.push(porchFloor);

  const pillarPositions = [-3.2, -1.25, 1.25, 3.2];
  pillarPositions.forEach((px) => {
    const pGeo = new THREE.CylinderGeometry(0.11, 0.12, 2.75, 10);
    pGeo.translate(px, 1.45, D / 2 + 1.85);
    logGeos.push(pGeo);
  });

  // Firewood stack against right cabin wall
  for (let row = 0; row < 4; row++) {
    const count = 5 - (row % 2);
    for (let c = 0; c < count; c++) {
      const fw = new THREE.CylinderGeometry(0.11, 0.11, 0.75, 7);
      fw.rotateX(Math.PI / 2);
      fw.translate(W / 2 + 0.32 + row * 0.02, 0.12 + row * 0.19, -1.2 + c * 0.24 + (row % 2) * 0.12);
      logGeos.push(fw);
    }
  }

  const mergedLogsMesh = new THREE.Mesh(mergeGeometries(logGeos, false), darkWoodMat);
  mergedLogsMesh.castShadow = true;
  mergedLogsMesh.receiveShadow = true;
  cabinGroup.add(mergedLogsMesh);

  // Gable Triangles (front and back)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-W / 2, 0);
  gableShape.lineTo(W / 2, 0);
  gableShape.lineTo(0, 2.15);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: D, bevelEnabled: false });
  gableGeo.translate(0, H, -D / 2);
  const gableMesh = new THREE.Mesh(gableGeo, trimWoodMat);
  gableMesh.castShadow = true;
  gableMesh.receiveShadow = true;
  cabinGroup.add(gableMesh);

  // 2. Snowy Roof & Porch Overhang + Icicles
  const roofSlopeLen = 4.4;
  const roofSlopeAngle = Math.atan2(2.15, W / 2);

  const snowGeos = [];
  const leftRoofSnow = new THREE.BoxGeometry(roofSlopeLen, 0.28, D + 2.6);
  leftRoofSnow.rotateZ(roofSlopeAngle);
  leftRoofSnow.translate(-1.85, H + 1.15, 0.9);
  snowGeos.push(leftRoofSnow);

  const rightRoofSnow = new THREE.BoxGeometry(roofSlopeLen, 0.28, D + 2.6);
  rightRoofSnow.rotateZ(-roofSlopeAngle);
  rightRoofSnow.translate(1.85, H + 1.15, 0.9);
  snowGeos.push(rightRoofSnow);

  const mergedRoofSnow = new THREE.Mesh(mergeGeometries(snowGeos, false), snowMat);
  mergedRoofSnow.castShadow = true;
  mergedRoofSnow.receiveShadow = true;
  cabinGroup.add(mergedRoofSnow);

  // Icicles along both eaves
  const icicleGeos = [];
  for (let i = 0; i < 14; i++) {
    const zPos = -D / 2 - 0.1 + i * 0.56;
    const hLeft = 0.25 + (i % 3) * 0.12;
    const icLeft = new THREE.ConeGeometry(0.038, hLeft, 6);
    icLeft.rotateX(Math.PI);
    icLeft.translate(-3.75, H - 0.05 - hLeft / 2, zPos + 0.8);
    icicleGeos.push(icLeft);

    const hRight = 0.22 + ((i + 1) % 3) * 0.13;
    const icRight = new THREE.ConeGeometry(0.038, hRight, 6);
    icRight.rotateX(Math.PI);
    icRight.translate(3.75, H - 0.05 - hRight / 2, zPos + 0.8);
    icicleGeos.push(icRight);
  }
  const icicleMat = new THREE.MeshStandardMaterial({
    color: 0xc8ebff,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85
  });
  cabinGroup.add(new THREE.Mesh(mergeGeometries(icicleGeos, false), icicleMat));

  // 3. Stone Chimney
  const chimneyGeos = [];
  const mainShaft = new THREE.BoxGeometry(1.1, 6.1, 1.1);
  mainShaft.translate(-2.7, 3.05, -1.1);
  chimneyGeos.push(mainShaft);
  const chimneyCap = new THREE.BoxGeometry(1.32, 0.25, 1.32);
  chimneyCap.translate(-2.7, 6.1, -1.1);
  chimneyGeos.push(chimneyCap);

  const chimneyMesh = new THREE.Mesh(mergeGeometries(chimneyGeos, false), stoneMat);
  chimneyMesh.castShadow = true;
  chimneyMesh.receiveShadow = true;
  cabinGroup.add(chimneyMesh);

  // Workshop Signboard above Porch
  const wsSignTex = createWorkshopSignTexture('KERSTMANS WERKPLAATS', 'ANNO 1823 · NOORDPOOL');
  const wsSignMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.58, 0.08),
    new THREE.MeshStandardMaterial({ map: wsSignTex, roughness: 0.5 })
  );
  wsSignMesh.position.set(0, 3.15, D / 2 + 0.25);
  cabinGroup.add(wsSignMesh);

  // 4. Illuminated Windows (each window gets its own material for subtle phase-offset fireplace flickering)
  const winGlowTex = createWindowGlowTexture();
  const winConfigs = [
    { x: -1.95, y: 1.75, z: D / 2 + 0.12, rotY: 0, phase: 0.0 },
    { x: 1.95, y: 1.75, z: D / 2 + 0.12, rotY: 0, phase: 0.65 },
    { x: -W / 2 - 0.12, y: 1.75, z: 0.6, rotY: -Math.PI / 2, phase: 0.25 },
    { x: W / 2 + 0.12, y: 1.75, z: 0.6, rotY: Math.PI / 2, phase: 1.15 }
  ];
  const winGeo = new THREE.BoxGeometry(1.15, 1.15, 0.08);
  const windowMaterials = [];
  winConfigs.forEach((wc) => {
    const mat = new THREE.MeshStandardMaterial({
      map: winGlowTex,
      emissive: new THREE.Color(COLORS.WARM_WINDOW),
      emissiveMap: winGlowTex,
      emissiveIntensity: 2.75,
      roughness: 0.25
    });
    windowMaterials.push({ mat, phase: wc.phase });
    const wm = new THREE.Mesh(winGeo, mat);
    wm.position.set(wc.x, wc.y, wc.z);
    wm.rotation.y = wc.rotY;
    cabinGroup.add(wm);
  });

  // 5. Porch Lanterns (2 warm glowing lanterns)
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffdd88,
    emissive: 0xff9922,
    emissiveIntensity: 3.55,
    roughness: 0.2
  });
  [-1.15, 1.15].forEach((lx) => {
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.28, 6), lanternMat);
    lantern.position.set(lx, 2.45, D / 2 + 0.45);
    cabinGroup.add(lantern);
  });

  // 6. Clickable Workshop Door with Wreath & Warm Light Spill
  // Dark warm interior recess behind the door so opening looks realistic
  const interiorBackdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 2.25),
    new THREE.MeshBasicMaterial({ color: 0xffaa33 })
  );
  interiorBackdrop.position.set(0, 1.32, D / 2 + 0.02);
  cabinGroup.add(interiorBackdrop);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.62, 0.22, D / 2 + 0.1);
  cabinGroup.add(doorPivot);

  const doorMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x5c3018,
    roughness: 0.7,
    emissive: 0x000000,
    emissiveIntensity: 0
  });
  const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(1.24, 2.2, 0.1), doorMat);
  doorSlab.position.set(0.62, 1.1, 0);
  doorSlab.castShadow = true;
  doorPivot.add(doorSlab);

  // Golden doorknob
  const knobMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 12),
    new THREE.MeshStandardMaterial({ color: COLORS.GOLD_METAL, metalness: 0.9, roughness: 0.2 })
  );
  knobMesh.position.set(1.06, 1.05, 0.08);
  doorPivot.add(knobMesh);

  // Christmas Wreath on door
  const wreathMat = new THREE.MeshStandardMaterial({
    color: COLORS.PINE_LIGHT,
    roughness: 0.8
  });
  const wreathMesh = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.075, 10, 20), wreathMat);
  wreathMesh.position.set(0.62, 1.52, 0.07);
  doorPivot.add(wreathMesh);

  const bowMat = new THREE.MeshStandardMaterial({
    color: COLORS.POLE_RED,
    emissive: 0x440000,
    emissiveIntensity: 0.3,
    roughness: 0.4
  });
  const bowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.06), bowMat);
  bowMesh.position.set(0.62, 1.78, 0.11);
  doorPivot.add(bowMesh);

  // Volumetric warm light spill cone on porch floor when door opens
  const lightBeamGeo = new THREE.ConeGeometry(1.85, 3.8, 24, 1, true);
  lightBeamGeo.translate(0, -1.9, 0);
  lightBeamGeo.rotateX(-Math.PI / 2.2);
  const lightBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffbb55,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const lightBeamMesh = new THREE.Mesh(lightBeamGeo, lightBeamMat);
  lightBeamMesh.position.set(0, 1.85, D / 2 + 0.15);
  lightBeamMesh.visible = false;
  lightBeamMesh.raycast = () => {};
  cabinGroup.add(lightBeamMesh);

  let doorOpen = false;
  let doorAngle = 0;
  const doorTooltipPos = new THREE.Vector3(COORDS.workshop.x + 1.5, 2.8, COORDS.workshop.z + 2.2);
  const doorWorldTarget = new THREE.Vector3(
    COORDS.workshop.x + Math.sin(COORDS.workshop.rotY) * (D / 2 + 0.1),
    1.35,
    COORDS.workshop.z + Math.cos(COORDS.workshop.rotY) * (D / 2 + 0.1)
  );
  const doorFrontDir = new THREE.Vector3(
    Math.sin(COORDS.workshop.rotY),
    0,
    Math.cos(COORDS.workshop.rotY)
  );

  if (interaction) {
    interaction.registerClickable(doorPivot, {
      id: 'workshopDoor',
      label: 'Werkplaatsdeur',
      glowMeshes: [doorSlab, bowMesh],
      focusTarget: doorWorldTarget,
      focusDistance: 3.8,
      focusHeightOffset: 0.35,
      preferredDir: doorFrontDir,
      preferredWeight: 0.85,
      onClick: () => {
        doorOpen = !doorOpen;
        interaction.showTooltip(
          doorOpen ? 'Werkplaats geopend — Welkom bij de Kerstman!' : 'Werkplaatsdeur gesloten',
          doorTooltipPos,
          3.0
        );
        if (audio) audio.playDoorCreak();
      }
    });

    if (interaction.registerFocusable) {
      interaction.registerFocusable(cabinGroup, {
        id: 'workshopCabin',
        label: 'Kerstmans Werkplaats 🏠',
        focusTarget: new THREE.Vector3(COORDS.workshop.x + 0.4, 2.2, COORDS.workshop.z + 0.6),
        focusDistance: 8.6,
        focusHeightOffset: 1.25,
        preferredDir: new THREE.Vector3(
          Math.sin(COORDS.workshop.rotY + 0.25),
          0,
          Math.cos(COORDS.workshop.rotY + 0.25)
        ),
        preferredWeight: 0.65
      });
    }
  }

  // 7. Chimney Smoke Particle System (soft transparent sprites growing & fading as they rise with the wind)
  const MAX_SMOKE = QUALITY_PRESETS.high.smokeCount;
  let activeSmokeCount = initialPreset.smokeCount;

  const CHIMNEY_X = -2.7;
  const CHIMNEY_Y = 6.2;
  const CHIMNEY_Z = -1.1;

  // Dark flue opening inside the chimney cap
  const flueMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.08, 0.76),
    new THREE.MeshBasicMaterial({ color: 0x0b0d12 })
  );
  flueMesh.position.set(CHIMNEY_X, 6.21, CHIMNEY_Z);
  cabinGroup.add(flueMesh);

  const smokeGeo = new THREE.BufferGeometry();
  const smokePositions = new Float32Array(MAX_SMOKE * 3);
  const smokeSizes = new Float32Array(MAX_SMOKE);
  const smokeOpacities = new Float32Array(MAX_SMOKE);
  const smokeRotations = new Float32Array(MAX_SMOKE);
  const smokeWarmth = new Float32Array(MAX_SMOKE);

  const smokeAges = new Float32Array(MAX_SMOKE);
  const smokeLifeSpans = new Float32Array(MAX_SMOKE);
  const smokeVelX = new Float32Array(MAX_SMOKE);
  const smokeVelY = new Float32Array(MAX_SMOKE);
  const smokeVelZ = new Float32Array(MAX_SMOKE);
  const smokeRotSpeeds = new Float32Array(MAX_SMOKE);
  const smokeSeeds = new Float32Array(MAX_SMOKE);

  function respawnSmokeParticle(i, initialAgeRatio = 0) {
    const life = 4.6 + (i % 7) * 0.28;
    smokeLifeSpans[i] = life;
    smokeAges[i] = initialAgeRatio * life;
    smokeSeeds[i] = i * 2.39996 + (i % 5) * 0.7;

    const angle = smokeSeeds[i] * 3.1;
    const radius = ((i * 37) % 100) / 100 * 0.22;
    smokePositions[i * 3] = CHIMNEY_X + Math.cos(angle) * radius;
    smokePositions[i * 3 + 1] = CHIMNEY_Y + 0.04;
    smokePositions[i * 3 + 2] = CHIMNEY_Z + Math.sin(angle) * radius;

    smokeVelX[i] = Math.cos(angle) * 0.08;
    smokeVelY[i] = 1.12 + ((i * 19) % 100) / 100 * 0.36;
    smokeVelZ[i] = Math.sin(angle) * 0.08;

    smokeRotations[i] = ((i * 53) % 100) / 100 * Math.PI * 2;
    smokeRotSpeeds[i] = (i % 2 === 0 ? 1 : -1) * (0.28 + ((i * 29) % 100) / 100 * 0.35);
    smokeSizes[i] = 0.68;
    smokeOpacities[i] = 0.0;
    smokeWarmth[i] = 1.0;
  }

  const cosCabin = Math.cos(-COORDS.workshop.rotY);
  const sinCabin = Math.sin(-COORDS.workshop.rotY);

  function stepSmokeParticles(dt, simTime) {
    // Match the global wind from snow.js and rotate into cabin local coordinates
    const worldWindX = Math.sin(simTime * 0.42) * 0.85 + 0.55;
    const worldWindZ = Math.cos(simTime * 0.31) * 0.45 - 0.15;
    const localWindX = worldWindX * cosCabin - worldWindZ * sinCabin;
    const localWindZ = worldWindX * sinCabin + worldWindZ * cosCabin;

    for (let i = 0; i < MAX_SMOKE; i++) {
      smokeAges[i] += dt;
      if (smokeAges[i] >= smokeLifeSpans[i]) {
        respawnSmokeParticle(i, 0);
      }

      const life = smokeLifeSpans[i];
      const t = Math.min(1.0, smokeAges[i] / life); // 0..1 normalized altitude/age
      const seed = smokeSeeds[i];
      const idx = i * 3;

      // Wind drift intensifies as the smoke rises higher above the chimney cap
      const windInfluence = 0.25 + t * 1.45;
      const turbX = Math.sin(simTime * 1.5 + seed + t * 3.8) * (0.18 + t * 0.45);
      const turbZ = Math.cos(simTime * 1.25 + seed * 1.3 + t * 3.2) * (0.16 + t * 0.38);

      // Buoyancy rises steadily and gently decelerates as smoke cools & expands
      const vy = smokeVelY[i] * (1.0 - t * 0.28);

      smokePositions[idx] += (smokeVelX[i] + localWindX * windInfluence + turbX) * dt;
      smokePositions[idx + 1] += vy * dt;
      smokePositions[idx + 2] += (smokeVelZ[i] + localWindZ * windInfluence + turbZ) * dt;

      smokeRotations[i] += smokeRotSpeeds[i] * dt * (1.0 - t * 0.4);

      // Sprites grow continuously larger as they rise (0.68 m -> 3.15 m)
      smokeSizes[i] = 0.68 + Math.pow(t, 0.88) * 2.47;

      // Smooth fade-in at the chimney exit (t < 0.10), then progressively more transparent as they rise
      const fadeIn = Math.min(1.0, t / 0.10);
      const fadeOut = Math.pow(1.0 - t, 1.65);
      smokeOpacities[i] = fadeIn * fadeOut * 0.46;

      // Subtle warm hearth glow near the chimney mouth, cooling rapidly in the night air
      smokeWarmth[i] = Math.pow(Math.max(0.0, 1.0 - t * 3.2), 2.0);
    }
  }

  for (let i = 0; i < MAX_SMOKE; i++) {
    respawnSmokeParticle(i, i / MAX_SMOKE);
  }
  // Pre-warm the plume so rising wind-blown smoke is already established at t = 0
  const prewarmSteps = 60;
  const prewarmDt = 0.08;
  for (let s = 0; s < prewarmSteps; s++) {
    stepSmokeParticles(prewarmDt, s * prewarmDt);
  }

  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
  smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(smokeSizes, 1));
  smokeGeo.setAttribute('aOpacity', new THREE.BufferAttribute(smokeOpacities, 1));
  smokeGeo.setAttribute('aRotation', new THREE.BufferAttribute(smokeRotations, 1));
  smokeGeo.setAttribute('aWarmth', new THREE.BufferAttribute(smokeWarmth, 1));
  smokeGeo.setDrawRange(0, activeSmokeCount);

  const smokeSpriteTex = createSmokeSprite();
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: smokeSpriteTex },
      uScale: { value: 420.0 }
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aOpacity;
      attribute float aRotation;
      attribute float aWarmth;
      uniform float uScale;
      varying float vOpacity;
      varying float vRotation;
      varying float vWarmth;

      void main() {
        vOpacity = aOpacity;
        vRotation = aRotation;
        vWarmth = aWarmth;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(aSize * (uScale / max(-mvPosition.z, 0.5)), 2.0, 380.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying float vOpacity;
      varying float vRotation;
      varying float vWarmth;

      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float c = cos(vRotation);
        float s = sin(vRotation);
        vec2 rotatedUV = vec2(
          centered.x * c - centered.y * s,
          centered.x * s + centered.y * c
        ) + vec2(0.5);

        vec4 tex = texture2D(uMap, rotatedUV);
        float alpha = tex.a * vOpacity;
        if (alpha < 0.003) discard;

        // Warm hearth-lit smoke at chimney mouth transitioning into moonlit silver-blue night smoke
        vec3 coolMoonSmoke = vec3(0.66, 0.77, 0.92);
        vec3 warmHearthSmoke = vec3(0.92, 0.76, 0.62);
        vec3 smokeCol = mix(coolMoonSmoke, warmHearthSmoke, vWarmth) * tex.rgb;

        gl_FragColor = vec4(smokeCol, alpha);
      }
    `,
    transparent: true,
    depthWrite: false
  });

  const smokeParticles = new THREE.Points(smokeGeo, smokeMat);
  smokeParticles.frustumCulled = false;
  cabinGroup.add(smokeParticles);

  // 8. Clickable Snowman beside the Workshop
  const snowmanGroup = new THREE.Group();
  snowmanGroup.position.set(COORDS.snowman.x, COORDS.snowman.y, COORDS.snowman.z);
  snowmanGroup.rotation.y = COORDS.snowman.rotY;
  rootGroup.add(snowmanGroup);

  const snowmanBodyMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.22,
    roughness: 0.65
  });

  const bottomBall = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), snowmanBodyMat);
  bottomBall.position.y = 0.5;
  bottomBall.castShadow = true;
  snowmanGroup.add(bottomBall);

  const midBall = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), snowmanBodyMat);
  midBall.position.y = 1.25;
  midBall.castShadow = true;
  snowmanGroup.add(midBall);

  const headBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), snowmanBodyMat);
  headBall.position.y = 1.82;
  headBall.castShadow = true;
  snowmanGroup.add(headBall);

  // Carrot nose
  const noseMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.28, 10),
    new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.5 })
  );
  noseMesh.rotation.x = Math.PI / 2;
  noseMesh.position.set(0, 1.82, 0.34);
  snowmanGroup.add(noseMesh);

  // Coal eyes & buttons
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.4 });
  const coalGeo = new THREE.SphereGeometry(0.035, 8, 8);
  [-0.09, 0.09].forEach((ex) => {
    const eye = new THREE.Mesh(coalGeo, coalMat);
    eye.position.set(ex, 1.9, 0.25);
    snowmanGroup.add(eye);
  });
  [1.1, 1.26, 1.42].forEach((by) => {
    const btn = new THREE.Mesh(coalGeo, coalMat);
    btn.position.set(0, by, 0.38);
    snowmanGroup.add(btn);
  });

  // Red scarf + Top hat
  const scarfMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.065, 10, 20),
    new THREE.MeshStandardMaterial({ color: COLORS.POLE_RED, roughness: 0.7 })
  );
  scarfMesh.rotation.x = Math.PI / 2;
  scarfMesh.position.y = 1.58;
  snowmanGroup.add(scarfMesh);

  const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, roughness: 0.5 });
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 18), hatMat);
  hatBrim.position.y = 2.06;
  snowmanGroup.add(hatBrim);
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.34, 18), hatMat);
  hatTop.position.y = 2.24;
  snowmanGroup.add(hatTop);

  // Stick arms (animated when clicked)
  const armGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.65, 6);
  armGeo.translate(0, 0.32, 0);
  const leftArm = new THREE.Mesh(armGeo, trimWoodMat);
  leftArm.position.set(-0.34, 1.32, 0);
  leftArm.rotation.z = 1.1;
  snowmanGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, trimWoodMat);
  rightArm.position.set(0.34, 1.32, 0);
  rightArm.rotation.z = -1.1;
  snowmanGroup.add(rightArm);

  let snowmanAnimTimer = 0;
  const snowmanTooltipPos = new THREE.Vector3(COORDS.snowman.x, 2.65, COORDS.snowman.z);

  if (interaction) {
    interaction.registerClickable(snowmanGroup, {
      id: 'snowman',
      label: 'Sneeuwpop ⛄',
      glowMeshes: [bottomBall, midBall, headBall],
      focusTarget: new THREE.Vector3(COORDS.snowman.x, 1.25, COORDS.snowman.z),
      focusDistance: 3.1,
      focusHeightOffset: 0.35,
      onClick: () => {
        snowmanAnimTimer = 1.8;
        interaction.showTooltip('Ho ho ho! Vrolijk Kerstfeest! ⛄', snowmanTooltipPos, 3.0);
        if (audio) audio.playChime(1.5);
      }
    });
  }

  function update(delta, elapsed) {
    // 1. Soft fireplace flicker on workshop windows & interior glow
    const baseHearthWave =
      Math.sin(elapsed * 4.2) * 0.42 +
      Math.sin(elapsed * 7.3 + 1.1) * 0.33 +
      Math.sin(elapsed * 12.1 + 2.4) * 0.16 +
      Math.cos(elapsed * 18.7) * 0.09; // -1..1 organic flame curve

    for (let i = 0; i < windowMaterials.length; i++) {
      const { mat, phase } = windowMaterials[i];
      const localShimmer =
        Math.sin(elapsed * 5.8 + phase * 3.1) * 0.25 +
        Math.cos(elapsed * 10.4 + phase * 4.7) * 0.12;
      const flicker = baseHearthWave * 0.78 + localShimmer * 0.22; // -1..1

      // Modulate emissive intensity gently around 2.75 (approx. 2.15 .. 3.35)
      mat.emissiveIntensity = 2.75 + flicker * 0.58;

      // Subtle warm color shift: deeper orange-amber when dimming, brighter golden-orange on flare
      const g = Math.min(1.0, Math.max(0.5, 0.655 + flicker * 0.075));
      const b = Math.min(1.0, Math.max(0.1, 0.2 + flicker * 0.065));
      mat.emissive.setRGB(1.0, g, b);
    }

    // Also modulate the interior backdrop behind the door so an open door flickers in sync
    interiorBackdrop.material.color.setRGB(
      1.0,
      0.64 + baseHearthWave * 0.06,
      0.18 + baseHearthWave * 0.05
    );

    // 2. Chimney smoke particle system animation
    stepSmokeParticles(delta, elapsed);
    smokeGeo.attributes.position.needsUpdate = true;
    smokeGeo.attributes.aSize.needsUpdate = true;
    smokeGeo.attributes.aOpacity.needsUpdate = true;
    smokeGeo.attributes.aRotation.needsUpdate = true;
    smokeGeo.attributes.aWarmth.needsUpdate = true;

    // 3. Door opening / closing animation + warm light beam
    const targetAngle = doorOpen ? -1.15 : 0.0;
    doorAngle += (targetAngle - doorAngle) * Math.min(1, delta * 6.5);
    doorPivot.rotation.y = doorAngle;

    const openFactor = Math.abs(doorAngle) / 1.15;
    if (openFactor > 0.02) {
      const doorFlicker = 1.0 + baseHearthWave * 0.12;
      lightBeamMesh.visible = true;
      lightBeamMat.opacity = openFactor * 0.34 * doorFlicker;
      if (lights && lights.doorSpotLight) {
        lights.doorSpotLight.visible = true;
        lights.doorSpotLight.intensity = openFactor * 6.5 * doorFlicker;
      }
    } else {
      lightBeamMesh.visible = false;
      if (lights && lights.doorSpotLight) {
        lights.doorSpotLight.visible = false;
        lights.doorSpotLight.intensity = 0;
      }
    }

    // 3. Snowman jump & wave animation
    if (snowmanAnimTimer > 0) {
      snowmanAnimTimer = Math.max(0, snowmanAnimTimer - delta);
      const phase = (1.8 - snowmanAnimTimer) * Math.PI * 3.33;
      snowmanGroup.position.y = Math.abs(Math.sin(phase)) * 0.42;
      snowmanGroup.rotation.z = Math.sin(phase * 1.5) * 0.14;
      leftArm.rotation.z = 0.45 + Math.sin(phase * 3.0) * 0.55;
      rightArm.rotation.z = -0.45 - Math.cos(phase * 3.0) * 0.55;
    } else {
      snowmanGroup.position.y = 0;
      snowmanGroup.rotation.z = 0;
      leftArm.rotation.z = 1.1;
      rightArm.rotation.z = -1.1;
    }
  }

  function setQuality(preset) {
    activeSmokeCount = preset.smokeCount;
    smokeGeo.setDrawRange(0, activeSmokeCount);
  }

  scene.add(rootGroup);
  return { group: rootGroup, update, setQuality };
}
