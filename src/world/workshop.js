import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, COORDS, GROUPS, QUALITY_PRESETS } from '../config.js';
import { createWoodTexture, createWindowGlowTexture, createSmokeSprite, getTerrainHeight } from '../utils/procedural.js';
import { createElf } from '../actors/elf-model.js';
import { getObstacles, ELF_RADIUS } from './obstacles.js';

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

export function createWorkshop(scene, lights, interaction, audio, initialPreset = QUALITY_PRESETS.high, camera = null) {
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

  // Warm PointLight under the workshop porch/veranda overhang
  const porchPointLight = new THREE.PointLight(0xffa834, 2.8, 14.0, 1.35);
  porchPointLight.position.set(0, 2.35, D / 2 + 0.95);
  porchPointLight.shadow.mapSize.set(512, 512);
  porchPointLight.shadow.camera.near = 0.25;
  porchPointLight.shadow.camera.far = 14.0;
  porchPointLight.shadow.bias = -0.0015;
  porchPointLight.shadow.normalBias = 0.04;
  porchPointLight.shadow.radius = 2.0;
  porchPointLight.shadow.autoUpdate = false;
  porchPointLight.castShadow = Boolean(initialPreset && initialPreset.pointShadowsEnabled);
  if (porchPointLight.castShadow) {
    porchPointLight.shadow.needsUpdate = true;
  }
  cabinGroup.add(porchPointLight);
  let porchShadowTimer = 0;

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

  // 6. Clickable Workshop Door with Wreath (Spring Physics & Elf Present Delivery)
  // Door spring damped oscillator: swings open and shut with a lively spring bounce ("veereffect, slingert even na")
  let doorAngle = 0.0;
  let doorTargetAngle = 0.0;
  let doorVelocity = 0.0;
  const SPRING_STIFFNESS = 36.0;
  const SPRING_DAMPING = 6.8;

  function updateDoorSpring(dt) {
    const diff = doorTargetAngle - doorAngle;
    doorVelocity += diff * SPRING_STIFFNESS * dt;
    doorVelocity -= doorVelocity * SPRING_DAMPING * dt;
    doorAngle += doorVelocity * Math.min(dt, 0.05);
    doorPivot.rotation.y = doorAngle;
  }

  // Wrapped gifts palette & slot coordinates under the main tree
  const GIFT_BOX_COLORS = [
    '#d92027', // crimson red
    '#1976d2', // royal blue
    '#2e7d32', // forest emerald
    '#7b1fa2', // royal purple
    '#f57c00', // warm orange
    '#c2185b', // ruby magenta
    '#0097a7', // ice cyan
    '#fbc02d', // golden amber
    '#303f9f', // deep sapphire
    '#e64a19'  // burnt terracotta
  ];

  const GIFT_RIBBON_COLORS = [
    '#ffcc33', // shiny gold
    '#ffffff', // snow white
    '#d92027', // bright red
    '#00e676', // mint green
    '#ff4081', // bright pink
    '#e0e0e0', // silver satin
    '#ffd700'  // imperial gold
  ];

  // 10 distinct festive slots under the big Christmas tree
  const TREE_GIFT_SLOTS = [
    { x: 3.85, z: -2.05, rotY: 0.35 },
    { x: 4.85, z: -2.05, rotY: -0.35 },
    { x: 3.25, z: -2.35, rotY: 0.75 },
    { x: 5.45, z: -2.35, rotY: -0.75 },
    { x: 2.95, z: -2.95, rotY: 1.15 },
    { x: 5.75, z: -2.95, rotY: -1.15 },
    { x: 3.55, z: -1.65, rotY: 0.15 },
    { x: 4.35, z: -1.55, rotY: -0.05 },
    { x: 5.15, z: -1.65, rotY: 0.25 },
    { x: 4.15, z: -2.55, rotY: -0.65 }
  ];

  function createWrappedGiftMesh(boxColor, ribbonColor, size = 0.35) {
    const giftRoot = new THREE.Group();

    const boxMat = new THREE.MeshStandardMaterial({
      color: boxColor,
      roughness: 0.38,
      metalness: 0.12
    });

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: ribbonColor,
      roughness: 0.25,
      metalness: 0.72,
      emissive: ribbonColor,
      emissiveIntensity: 0.08
    });

    // Base gift box
    const box = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.85, size), boxMat);
    box.position.y = size * 0.425;
    box.castShadow = true;
    box.receiveShadow = true;
    giftRoot.add(box);

    // Cross ribbons wrapping the box
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(size * 1.02, size * 0.86, size * 0.18), ribbonMat);
    band1.position.y = size * 0.425;
    giftRoot.add(band1);

    const band2 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.18, size * 0.86, size * 1.02), ribbonMat);
    band2.position.y = size * 0.425;
    giftRoot.add(band2);

    // Decorative bow on top with center knot, 2 loops, and dangling ribbon tails
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, size * 0.85, 0);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.075, 10, 10), ribbonMat);
    knot.castShadow = true;
    bowGroup.add(knot);

    const loopGeo = new THREE.TorusGeometry(size * 0.13, size * 0.038, 8, 16);
    const leftLoop = new THREE.Mesh(loopGeo, ribbonMat);
    leftLoop.position.set(-size * 0.09, size * 0.08, 0);
    leftLoop.rotation.set(0, Math.PI / 4, Math.PI / 6);
    leftLoop.castShadow = true;
    bowGroup.add(leftLoop);

    const rightLoop = new THREE.Mesh(loopGeo, ribbonMat);
    rightLoop.position.set(size * 0.09, size * 0.08, 0);
    rightLoop.rotation.set(0, -Math.PI / 4, -Math.PI / 6);
    rightLoop.castShadow = true;
    bowGroup.add(rightLoop);

    [-1, 1].forEach((dir) => {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(size * 0.065, size * 0.20, 0.015), ribbonMat);
      tail.position.set(dir * size * 0.07, -size * 0.06, size * 0.10);
      tail.rotation.set(-0.25, 0, dir * 0.35);
      tail.castShadow = true;
      bowGroup.add(tail);
    });

    giftRoot.add(bowGroup);

    return {
      group: giftRoot,
      materials: [boxMat, ribbonMat]
    };
  }

  // Glitter particle system for sparkling cloud when gift is placed under the tree
  function createGlitterParticleSystem(targetScene) {
    const COUNT = 65;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const opacities = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 1] = -100;
      sizes[i] = 0;
      opacities[i] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1.0)');
    grad.addColorStop(0.25, 'rgba(255,240,180,0.85)');
    grad.addColorStop(0.6, 'rgba(255,210,100,0.3)');
    grad.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(32, 4);
    ctx.quadraticCurveTo(32, 32, 60, 32);
    ctx.quadraticCurveTo(32, 32, 32, 60);
    ctx.quadraticCurveTo(32, 32, 4, 32);
    ctx.quadraticCurveTo(32, 32, 32, 4);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: tex },
        uScale: { value: 260.0 }
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aOpacity;
        attribute vec3 color;
        varying float vOpacity;
        varying vec3 vColor;
        uniform float uScale;

        void main() {
          vOpacity = aOpacity;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = clamp(aSize * (uScale / max(-mvPosition.z, 0.5)), 1.0, 150.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vOpacity;
        varying vec3 vColor;

        void main() {
          if (vOpacity <= 0.005) discard;
          vec4 texColor = texture2D(uMap, gl_PointCoord);
          if (texColor.a < 0.01) discard;
          gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * vOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const pointsMesh = new THREE.Points(geo, mat);
    pointsMesh.frustumCulled = false;
    targetScene.add(pointsMesh);

    const particles = [];
    const palette = [
      new THREE.Color(0xffd700), // gold
      new THREE.Color(0xffffff), // diamond white
      new THREE.Color(0xff99bb), // pink sparkle
      new THREE.Color(0x7fe5d9), // crystalline cyan
      new THREE.Color(0x99ff99)  // magical green
    ];

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        color: palette[i % palette.length],
        life: 0,
        maxLife: 1.5,
        baseSize: 0.22
      });
    }

    function burst(x, y, z) {
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.25;
        p.y = y + 0.12 + Math.random() * 0.15;
        p.z = z + (Math.random() - 0.5) * 0.25;

        const angle = Math.random() * Math.PI * 2;
        const speed = 0.4 + Math.random() * 1.3;
        p.vx = Math.cos(angle) * speed;
        p.vy = 0.9 + Math.random() * 1.6;
        p.vz = Math.sin(angle) * speed;

        p.maxLife = 1.1 + Math.random() * 0.7;
        p.life = p.maxLife;
        p.baseSize = 0.20 + Math.random() * 0.22;

        const col = p.color;
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }
      geo.attributes.color.needsUpdate = true;
    }

    function update(dt, elapsed) {
      let anyActive = false;
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        if (!p.active) continue;
        anyActive = true;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          positions[i * 3 + 1] = -100;
          sizes[i] = 0;
          opacities[i] = 0;
          continue;
        }

        p.vy -= 1.6 * dt; // gentle gravity
        p.vx *= (1.0 - dt * 0.75); // air drag
        p.vz *= (1.0 - dt * 0.75);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;

        const t = p.life / p.maxLife;
        const shimmer = 0.7 + Math.sin(elapsed * 25.0 + i * 3.7) * 0.3;
        sizes[i] = p.baseSize * shimmer * (0.4 + t * 0.6);
        opacities[i] = Math.sin(t * Math.PI) * 0.95;
      }

      if (anyActive) {
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aSize.needsUpdate = true;
        geo.attributes.aOpacity.needsUpdate = true;
      }
    }

    return { burst, update };
  }

  const glitterSys = createGlitterParticleSystem(scene);

  // Limb animation helpers for joyful hopping, bending, and waving
  function updateElfWalk(elf, hop, isCarrying) {
    const hopY = Math.abs(Math.sin(hop)) * 0.12;
    const legSwing = Math.sin(hop) * 0.62;
    const sway = Math.sin(hop * 0.5) * 0.08;

    elf.charGroup.position.y = hopY;
    elf.charGroup.rotation.z = sway;
    elf.leftLeg.rotation.x = legSwing;
    elf.rightLeg.rotation.x = -legSwing;

    elf.hatTipGroup.rotation.z = 0.45 + Math.sin(hop) * 0.22;
    elf.head.rotation.z = -sway * 0.7;

    if (isCarrying) {
      // Both arms holding the wrapped present
      elf.leftArm.rotation.set(-0.85 + Math.sin(hop) * 0.05, 0.32, 0.28);
      elf.rightArm.rotation.set(-0.85 + Math.sin(hop) * 0.05, -0.32, -0.28);
    } else {
      // Cheerful arm swing skipping back
      elf.leftArm.rotation.set(-legSwing * 0.75, 0, 0.15);
      elf.rightArm.rotation.set(legSwing * 0.75, 0, -0.15);
    }
  }

  function updateElfBend(elf, bendFactor) {
    elf.charGroup.position.y = -bendFactor * 0.16;
    elf.charGroup.rotation.z = 0;
    elf.torso.rotation.x = bendFactor * 0.62;
    elf.head.rotation.x = -bendFactor * 0.30;
    elf.leftLeg.rotation.x = -bendFactor * 0.22;
    elf.rightLeg.rotation.x = -bendFactor * 0.22;
    elf.leftArm.rotation.set(-0.85 - bendFactor * 0.25, 0.32, 0.28);
    elf.rightArm.rotation.set(-0.85 - bendFactor * 0.25, -0.32, -0.28);
  }

  function updateElfWave(elf, waveTime) {
    elf.charGroup.position.y = 0;
    elf.charGroup.rotation.z = 0;
    elf.torso.rotation.set(0, 0, 0);
    elf.leftLeg.rotation.set(0, 0, 0);
    elf.rightLeg.rotation.set(0, 0, 0);

    elf.leftArm.rotation.set(0.1, 0, 0.12);
    elf.rightArm.rotation.set(-1.85, 0, -0.35 + Math.sin(waveTime * 9.0) * 0.45);
    elf.head.rotation.set(0, 0, Math.sin(waveTime * 4.5) * 0.14);
    elf.hatTipGroup.rotation.z = 0.45 + Math.sin(waveTime * 9.0) * 0.18;
  }

  // Obstacle avoidance & collision helpers along the snowy path
  function getElfObstacleAvoidance(x, z, moveDirX, moveDirZ) {
    const distDoor = Math.hypot(x - (-8.8), z - (-4.4));
    const distTree = Math.hypot(x - COORDS.mainChristmasTree.x, z - COORDS.mainChristmasTree.z);

    let steerX = 0;
    let steerZ = 0;
    const obstacles = getObstacles();

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (distDoor < 2.5 && obs.id.startsWith('workshop')) continue;
      if (distTree < 2.8 && obs.id === 'mainChristmasTree') continue;

      const dx = x - obs.x;
      const dz = z - obs.z;
      const distSq = dx * dx + dz * dz;
      const threshold = obs.radius + ELF_RADIUS + 0.42;

      if (distSq < threshold * threshold && distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const overlap = threshold - dist;
        const factor = overlap / threshold;
        const nx = dx / dist;
        const nz = dz / dist;
        const dot = nx * moveDirX + nz * moveDirZ;
        const tanX = -nz * (dot < 0 ? 0.35 : 0);
        const tanZ = nx * (dot < 0 ? 0.35 : 0);
        steerX += (nx + tanX) * factor * 1.85;
        steerZ += (nz + tanZ) * factor * 1.85;
      }
    }
    return { x: steerX, z: steerZ };
  }

  function resolveElfCollision(x, z) {
    const distDoor = Math.hypot(x - (-8.8), z - (-4.4));
    const distTree = Math.hypot(x - COORDS.mainChristmasTree.x, z - COORDS.mainChristmasTree.z);
    let resX = x;
    let resZ = z;
    const obstacles = getObstacles();

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (distDoor < 2.5 && obs.id.startsWith('workshop')) continue;
      if (distTree < 2.8 && obs.id === 'mainChristmasTree') continue;

      const dx = resX - obs.x;
      const dz = resZ - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = obs.radius + ELF_RADIUS + 0.05;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          resX = obs.x + (dx / dist) * minDist;
          resZ = obs.z + (dz / dist) * minDist;
        } else {
          resX = obs.x + minDist;
        }
      }
    }
    return { x: resX, z: resZ };
  }

  function createElfWalkCurve(targetSlot) {
    const rotY = Math.atan2(COORDS.mainChristmasTree.x - targetSlot.x, COORDS.mainChristmasTree.z - targetSlot.z);
    targetSlot.rotY = rotY;

    // The elf stands 0.42m outside the slot, facing inward towards the tree
    const elfStandX = targetSlot.x - Math.sin(rotY) * 0.42;
    const elfStandZ = targetSlot.z - Math.cos(rotY) * 0.42;

    const points = [
      new THREE.Vector3(-9.1, 0.32, -4.9), // inside workshop doorway
      new THREE.Vector3(-8.8, 0.28, -4.3), // doorway threshold
      new THREE.Vector3(-8.1, 0.22, -2.8), // porch edge
      new THREE.Vector3(-7.5, 0.0, -3.0),  // step down onto shared stone path
      new THREE.Vector3(-5.8, 0.0, -2.0),  // stone path: between snowman & mailbox
      new THREE.Vector3(-3.2, 0.0, -0.6),  // stone path: in front of mailbox
      new THREE.Vector3(-0.8, 0.0, -1.7),  // stone path: in front of North Pole
      new THREE.Vector3(1.2, 0.0, -1.8),   // stone path: approaching Great Christmas tree
      new THREE.Vector3(2.6, 0.0, -2.3),   // stone path: arrival in front of tree
      new THREE.Vector3(elfStandX, 0.0, elfStandZ) // arrival stand spot in front of slot
    ];

    return new THREE.CatmullRomCurve3(points, false, 'centripetal');
  }

  // Animation State Machine for Door & Delivery Elf
  const ANIM_STATE = {
    IDLE: 'IDLE',
    DOOR_OPENING: 'DOOR_OPENING',
    WALK_TO_TREE: 'WALK_TO_TREE',
    PLACE_GIFT: 'PLACE_GIFT',
    WAVE_CAMERA: 'WAVE_CAMERA',
    WALK_BACK: 'WALK_BACK',
    DOOR_CLOSING: 'DOOR_CLOSING'
  };

  let animState = ANIM_STATE.IDLE;
  let isDoorBusy = false;
  let deliveryElf = null;
  let currentHeldGift = null;
  let currentSlot = null;
  let walkCurve = null;
  let curveProgress = 0;
  let hopPhase = 0;
  let bendTimer = 0;
  let waveTimer = 0;
  let steerAvoidX = 0;
  let steerAvoidZ = 0;

  const tempCurvePos = new THREE.Vector3();
  const tempCurveTangent = new THREE.Vector3();
  const defaultCamPos = new THREE.Vector3(5.5, 4.6, 16.5);

  const deliveredGifts = [];
  let fadeExtraGiftsDelay = 0;
  let isFadingExtraGifts = false;
  let extraGiftFadeTimer = 0;

  const doorTooltipPos = new THREE.Vector3(COORDS.workshop.x + 1.5, 2.8, COORDS.workshop.z + 2.2);
  const treeTooltipPos = new THREE.Vector3(COORDS.mainChristmasTree.x, 5.6, COORDS.mainChristmasTree.z);
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

  function triggerDoorInteraction() {
    if (isDoorBusy) return;

    if (deliveredGifts.length >= 10 || isFadingExtraGifts) {
      if (interaction) {
        interaction.showTooltip('De boom zit vol! 🎁', treeTooltipPos, 3.5);
      }
      return;
    }

    isDoorBusy = true;
    animState = ANIM_STATE.DOOR_OPENING;
    doorTargetAngle = -1.25;

    // Play crystalline elf bell chime upon door opening if sound is on
    if (audio && audio.playElfBell) {
      audio.playElfBell();
    }

    if (interaction) {
      interaction.showTooltip('Elfje brengt een cadeau naar de boom! 🎁', doorTooltipPos, 3.0);
    }

    // Assign slot under the tree (0 to 9)
    const slotIdx = deliveredGifts.length;
    currentSlot = TREE_GIFT_SLOTS[slotIdx];
    walkCurve = createElfWalkCurve(currentSlot);
    curveProgress = 0;
    hopPhase = 0;
    bendTimer = 0;
    waveTimer = 0;
    steerAvoidX = 0;
    steerAvoidZ = 0;

    // Pick random box and ribbon/bow colors for this run
    const boxColor = GIFT_BOX_COLORS[Math.floor(Math.random() * GIFT_BOX_COLORS.length)];
    let ribbonColor = GIFT_RIBBON_COLORS[Math.floor(Math.random() * GIFT_RIBBON_COLORS.length)];
    if (ribbonColor === boxColor) ribbonColor = '#ffd700';

    currentHeldGift = createWrappedGiftMesh(boxColor, ribbonColor, 0.35);

    if (!deliveryElf) {
      deliveryElf = createElf({
        id: 'workshopDeliveryElf',
        scale: 1.25,
        suitColor: 0x00c853,
        hairColor: 0x7c3f1d
      });
      scene.add(deliveryElf.root);
    }

    deliveryElf.charGroup.position.set(0, 0, 0);
    deliveryElf.charGroup.rotation.set(0, COORDS.workshop.rotY, 0);
    deliveryElf.torso.rotation.set(0, 0, 0);
    deliveryElf.head.rotation.set(0, 0, 0);
    deliveryElf.leftLeg.rotation.set(0, 0, 0);
    deliveryElf.rightLeg.rotation.set(0, 0, 0);

    deliveryElf.charGroup.add(currentHeldGift.group);
    currentHeldGift.group.position.set(0, 0.32, 0.22);
    currentHeldGift.group.rotation.set(0, 0, 0);

    deliveryElf.root.position.set(-9.1, 0.32, -4.9);
    deliveryElf.root.visible = true;

    deliveryElf.leftArm.rotation.set(-0.85, 0.32, 0.28);
    deliveryElf.rightArm.rotation.set(-0.85, -0.32, -0.28);
  }

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
      onClick: triggerDoorInteraction
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

    // 3. Workshop Door Spring Animation & Elf Present Delivery
    updateDoorSpring(delta);
    glitterSys.update(delta, elapsed);

    // Keep door spotlight off (light beam removed)
    if (lights && lights.doorSpotLight) {
      lights.doorSpotLight.visible = false;
      lights.doorSpotLight.intensity = 0;
    }

    // Extra gifts slow fade-out when full
    if (fadeExtraGiftsDelay > 0) {
      fadeExtraGiftsDelay -= delta;
      if (fadeExtraGiftsDelay <= 0) {
        isFadingExtraGifts = true;
        extraGiftFadeTimer = 0;
      }
    }

    if (isFadingExtraGifts) {
      extraGiftFadeTimer += delta;
      const FADE_DURATION = 2.8;
      const t = Math.min(1.0, extraGiftFadeTimer / FADE_DURATION);
      const scale = 1.0 - t;

      deliveredGifts.forEach((gift) => {
        gift.group.scale.setScalar(Math.max(0.001, scale));
        gift.materials.forEach((mat) => {
          mat.transparent = true;
          mat.opacity = 1.0 - t;
        });
      });

      if (t >= 1.0) {
        deliveredGifts.forEach((gift) => {
          scene.remove(gift.group);
          gift.group.traverse((c) => {
            if (c.geometry) c.geometry.dispose();
          });
          gift.materials.forEach((m) => m.dispose());
        });
        deliveredGifts.length = 0;
        isFadingExtraGifts = false;
        extraGiftFadeTimer = 0;
      }
    }

    // Elf Delivery State Machine
    if (animState === ANIM_STATE.DOOR_OPENING) {
      if (doorAngle <= -0.85) {
        animState = ANIM_STATE.WALK_TO_TREE;
      }
    } else if (animState === ANIM_STATE.WALK_TO_TREE) {
      const walkSpeed = 0.18; // ~5.5s to reach tree
      curveProgress = Math.min(1.0, curveProgress + delta * walkSpeed);

      walkCurve.getPointAt(curveProgress, tempCurvePos);
      walkCurve.getTangentAt(curveProgress, tempCurveTangent);

      // Obstacle avoidance steering
      const steer = getElfObstacleAvoidance(tempCurvePos.x, tempCurvePos.z, tempCurveTangent.x, tempCurveTangent.z);
      steerAvoidX += (steer.x - steerAvoidX) * Math.min(1.0, delta * 7.0);
      steerAvoidZ += (steer.z - steerAvoidZ) * Math.min(1.0, delta * 7.0);

      let fx = tempCurvePos.x + steerAvoidX;
      let fz = tempCurvePos.z + steerAvoidZ;
      const col = resolveElfCollision(fx, fz);
      fx = col.x;
      fz = col.z;

      // Ground elevation with smooth transition from porch floor to snow
      const onPorch = tempCurvePos.x < -7.6 && tempCurvePos.z < -2.4;
      const porchBlend = onPorch ? Math.max(0, Math.min(1, (-tempCurvePos.z - 2.4) / 1.6)) : 0;
      const terrainY = getTerrainHeight(fx, fz);
      const groundY = porchBlend * 0.22 + (1 - porchBlend) * terrainY;

      hopPhase += delta * 11.5;
      updateElfWalk(deliveryElf, hopPhase, true);

      const targetRot = Math.atan2(tempCurveTangent.x, tempCurveTangent.z);
      deliveryElf.charGroup.rotation.y += (targetRot - deliveryElf.charGroup.rotation.y) * Math.min(1.0, delta * 9.0);
      deliveryElf.root.position.set(fx, groundY, fz);

      if (curveProgress >= 1.0) {
        animState = ANIM_STATE.PLACE_GIFT;
        bendTimer = 0;
        deliveryElf.charGroup.rotation.y = currentSlot.rotY;
      }
    } else if (animState === ANIM_STATE.PLACE_GIFT) {
      bendTimer += delta;

      if (bendTimer < 0.7) {
        const factor = bendTimer / 0.7;
        updateElfBend(deliveryElf, factor);
      } else {
        if (currentHeldGift && currentHeldGift.group.parent === deliveryElf.charGroup) {
          // Detach gift from elf and place under the tree
          deliveryElf.charGroup.remove(currentHeldGift.group);
          scene.add(currentHeldGift.group);

          const slotGroundY = getTerrainHeight(currentSlot.x, currentSlot.z);
          currentHeldGift.group.position.set(currentSlot.x, slotGroundY, currentSlot.z);
          currentHeldGift.group.rotation.set(0, currentSlot.rotY, 0);

          // Sparkling glitter particle cloud burst!
          glitterSys.burst(currentSlot.x, slotGroundY + 0.16, currentSlot.z);

          // Soft celesta chime sound
          if (audio && audio.playChime) {
            audio.playChime(1.75);
          }

          deliveredGifts.push(currentHeldGift);

          // If maximum of 10 reached, show tooltip and schedule slow fade-out
          if (deliveredGifts.length >= 10) {
            if (interaction) {
              interaction.showTooltip('De boom zit vol! 🎁', treeTooltipPos, 4.5);
            }
            fadeExtraGiftsDelay = 2.4;
          }
        }

        if (bendTimer < 1.3) {
          const factor = 1.0 - (bendTimer - 0.7) / 0.6;
          updateElfBend(deliveryElf, factor);
        } else {
          animState = ANIM_STATE.WAVE_CAMERA;
          waveTimer = 0;
        }
      }
    } else if (animState === ANIM_STATE.WAVE_CAMERA) {
      waveTimer += delta;

      // Face toward camera
      const camPos = camera ? camera.position : defaultCamPos;
      const dx = camPos.x - deliveryElf.root.position.x;
      const dz = camPos.z - deliveryElf.root.position.z;
      const camAngle = Math.atan2(dx, dz);
      deliveryElf.charGroup.rotation.y += (camAngle - deliveryElf.charGroup.rotation.y) * Math.min(1.0, delta * 8.0);

      updateElfWave(deliveryElf, waveTimer);

      if (waveTimer >= 1.8) {
        animState = ANIM_STATE.WALK_BACK;
        curveProgress = 1.0;
        hopPhase = 0;
      }
    } else if (animState === ANIM_STATE.WALK_BACK) {
      const returnSpeed = 0.18;
      curveProgress = Math.max(0.0, curveProgress - delta * returnSpeed);

      walkCurve.getPointAt(curveProgress, tempCurvePos);
      walkCurve.getTangentAt(curveProgress, tempCurveTangent);

      // Return trip direction is reversed
      const moveDirX = -tempCurveTangent.x;
      const moveDirZ = -tempCurveTangent.z;

      const steer = getElfObstacleAvoidance(tempCurvePos.x, tempCurvePos.z, moveDirX, moveDirZ);
      steerAvoidX += (steer.x - steerAvoidX) * Math.min(1.0, delta * 7.0);
      steerAvoidZ += (steer.z - steerAvoidZ) * Math.min(1.0, delta * 7.0);

      let fx = tempCurvePos.x + steerAvoidX;
      let fz = tempCurvePos.z + steerAvoidZ;
      const col = resolveElfCollision(fx, fz);
      fx = col.x;
      fz = col.z;

      const onPorch = tempCurvePos.x < -7.6 && tempCurvePos.z < -2.4;
      const porchBlend = onPorch ? Math.max(0, Math.min(1, (-tempCurvePos.z - 2.4) / 1.6)) : 0;
      const terrainY = getTerrainHeight(fx, fz);
      const groundY = porchBlend * 0.22 + (1 - porchBlend) * terrainY;

      hopPhase += delta * 11.5;
      updateElfWalk(deliveryElf, hopPhase, false);

      const targetRot = Math.atan2(moveDirX, moveDirZ);
      deliveryElf.charGroup.rotation.y += (targetRot - deliveryElf.charGroup.rotation.y) * Math.min(1.0, delta * 9.0);
      deliveryElf.root.position.set(fx, groundY, fz);

      if (curveProgress <= 0.0) {
        // Elf entered inside the workshop
        deliveryElf.root.visible = false;
        animState = ANIM_STATE.DOOR_CLOSING;
        doorTargetAngle = 0.0;
      }
    } else if (animState === ANIM_STATE.DOOR_CLOSING) {
      // Once door has finished swinging shut and settled against the frame
      if (Math.abs(doorAngle) < 0.025 && Math.abs(doorVelocity) < 0.06) {
        doorAngle = 0.0;
        doorVelocity = 0.0;
        doorPivot.rotation.y = 0.0;
        animState = ANIM_STATE.IDLE;
        isDoorBusy = false; // Door interaction unlocked
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
    // 4. Throttled shadow update for workshop veranda light (~13 Hz) to preserve 60 FPS
    if (porchPointLight.castShadow) {
      porchShadowTimer += delta;
      if (porchShadowTimer >= 0.075) {
        porchShadowTimer = 0;
        porchPointLight.shadow.needsUpdate = true;
      }
    }
  }

  function setQuality(preset, levelName) {
    activeSmokeCount = preset.smokeCount;
    smokeGeo.setDrawRange(0, activeSmokeCount);

    const isHigh = levelName === 'high' || Boolean(preset && preset.pointShadowsEnabled);
    porchPointLight.castShadow = isHigh;
    if (isHigh) {
      porchPointLight.shadow.needsUpdate = true;
    } else if (porchPointLight.shadow.map) {
      porchPointLight.shadow.map.dispose();
      porchPointLight.shadow.map = null;
    }
  }

  // Ensure all veranda, porch floor, steps, pillars and cabin meshes receive shadows
  cabinGroup.traverse((child) => {
    if (child.isMesh) {
      child.receiveShadow = true;
    }
  });

  scene.add(rootGroup);
  return {
    group: rootGroup,
    porchPointLight,
    update,
    setQuality,
    triggerDoorInteraction,
    getDeliveredGiftsCount: () => deliveredGifts.length,
    getAnimState: () => animState,
    isDoorBusy: () => isDoorBusy
  };
}
