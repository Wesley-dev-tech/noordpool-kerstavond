import * as THREE from 'three';
import { COLORS } from '../config.js';
import { getGroundHeight, getTerrainHeight } from '../utils/procedural.js';
import { pathCurve } from '../world/path-v2.js';
import {
  ELF_RADIUS,
  calculateAvoidanceSteering,
  calculateElfAvoidance,
  resolveCollision,
  resolveElfOverlap
} from '../world/obstacles.js';
import {
  createElf,
  getSharedElfGeometries,
  getSharedElfMaterials,
  createStockingTexture
} from './elf-model.js';
import { createContactShadow } from './contact-shadow.js';

// Re-export createElf so any external module can import it from elves.js or elf-model.js
export { createElf };

/**
 * Enables shadow casting and receiving recursively for all meshes in a 3D object.
 */
function enableShadows(object3D) {
  object3D.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

/**
 * Generates an organic, crystalline procedural bump texture for packed snow.
 * Used on the village snowman to produce subtle, natural surface unevenness.
 */
function createSnowBumpTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(256, 256);
  const data = imgData.data;

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const nx = x / 256;
      const ny = y / 256;
      const grain = (Math.random() - 0.5) * 36;
      const wave1 = Math.sin(nx * 14.0) * Math.cos(ny * 14.0) * 22;
      const wave2 = Math.sin(nx * 32.0 + 1.2) * Math.sin(ny * 28.0) * 14;
      const val = Math.min(255, Math.max(0, Math.round(135 + grain + wave1 + wave2)));

      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/**
 * Builds the realistic village snowman on the Elf Village square:
 * - 3 snow spheres with natural interpenetration.
 * - Organic procedural snow bump texture.
 * - Real coal eyes, segmented carrot nose, stone mouth, coal buttons.
 * - Gnarled wooden branch arms with twig fingers.
 * - Warm knitted scarf with delicate tassels/fringes.
 * - Rustic inverted zinc bucket with metal wire handle.
 * - Ground-level snowdrift mound at base.
 */
function buildVillageSnowman(materials, snowBumpTex) {
  const snowmanGroup = new THREE.Group();
  snowmanGroup.name = 'villageSnowman';

  const villageSnowMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.25,
    roughness: 0.80,
    metalness: 0.04,
    bumpMap: snowBumpTex,
    bumpScale: 0.018
  });

  const coalMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.72,
    metalness: 0.08
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x2e333d,
    roughness: 0.85,
    metalness: 0.05
  });

  const carrotMat = new THREE.MeshStandardMaterial({
    color: 0xff6200,
    roughness: 0.52,
    metalness: 0.02
  });

  const scarfMat = new THREE.MeshStandardMaterial({
    color: 0xc9182b,
    roughness: 0.78,
    metalness: 0.03
  });

  const scarfFringeMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    roughness: 0.82,
    metalness: 0.05
  });

  const bucketMat = new THREE.MeshStandardMaterial({
    color: 0x8a939e,
    roughness: 0.40,
    metalness: 0.68
  });

  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x484e56,
    roughness: 0.32,
    metalness: 0.85
  });

  const branchWoodMat = new THREE.MeshStandardMaterial({
    color: COLORS.WOOD_DARK,
    roughness: 0.88,
    metalness: 0.04
  });

  // Base organic snow mound
  const snowMoundGeo = new THREE.SphereGeometry(0.72, 20, 10);
  snowMoundGeo.scale(1.0, 0.24, 1.0);
  const smPos = snowMoundGeo.attributes.position;
  for (let i = 0; i < smPos.count; i++) {
    const vx = smPos.getX(i);
    const vy = smPos.getY(i);
    const vz = smPos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const rMod = 1.0 + Math.sin(ang * 3.0 + 1.2) * 0.12 + Math.cos(ang * 5.0) * 0.08;
    smPos.setXYZ(i, vx * rMod, vy * (1.0 + Math.abs(Math.sin(ang * 2.0)) * 0.15), vz * rMod);
  }
  snowMoundGeo.computeVertexNormals();
  const snowMound = new THREE.Mesh(snowMoundGeo, villageSnowMat);
  snowMound.position.set(0, 0.05, 0);
  snowmanGroup.add(snowMound);

  // 3 spheres
  const bottomBall = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 18), villageSnowMat);
  bottomBall.position.y = 0.38;
  snowmanGroup.add(bottomBall);

  const midBall = new THREE.Mesh(new THREE.SphereGeometry(0.35, 22, 18), villageSnowMat);
  midBall.position.y = 0.86;
  snowmanGroup.add(midBall);

  const headBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 18), villageSnowMat);
  headBall.position.y = 1.30;
  snowmanGroup.add(headBall);

  // Coal eyes
  const coalEyeGeo = new THREE.DodecahedronGeometry(0.026, 0);
  [-0.074, 0.074].forEach((ex) => {
    const eye = new THREE.Mesh(coalEyeGeo, coalMat);
    eye.position.set(ex, 1.36, 0.21);
    eye.rotation.set(Math.random() * 2, Math.random() * 2, 0);
    snowmanGroup.add(eye);
  });

  // Carrot nose
  const noseGroup = new THREE.Group();
  noseGroup.position.set(0, 1.30, 0.22);
  noseGroup.rotation.x = Math.PI / 2 + 0.08;
  snowmanGroup.add(noseGroup);

  const carrotCone = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.23, 12), carrotMat);
  carrotCone.position.y = 0.115;
  noseGroup.add(carrotCone);

  [0.06, 0.12, 0.17].forEach((ry, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.034 - i * 0.009, 0.004, 6, 12),
      carrotMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ry;
    noseGroup.add(ring);
  });

  // Stone smile
  const stoneMouthOffsets = [
    { x: -0.078, y: 1.230, z: 0.198 },
    { x: -0.048, y: 1.216, z: 0.216 },
    { x: -0.016, y: 1.210, z: 0.222 },
    { x:  0.016, y: 1.210, z: 0.222 },
    { x:  0.048, y: 1.216, z: 0.216 },
    { x:  0.078, y: 1.230, z: 0.198 }
  ];
  const stoneGeo = new THREE.DodecahedronGeometry(0.014, 0);
  stoneMouthOffsets.forEach((pos) => {
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(pos.x, pos.y, pos.z);
    stone.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    snowmanGroup.add(stone);
  });

  // Coal buttons
  [0.98, 0.85, 0.72].forEach((by) => {
    const btn = new THREE.Mesh(coalEyeGeo, coalMat);
    btn.position.set(0, by, 0.33);
    btn.rotation.set(Math.random() * 2, Math.random() * 2, 0);
    snowmanGroup.add(btn);
  });

  // Scarf
  const scarfNeckRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.062, 12, 24),
    scarfMat
  );
  scarfNeckRing.rotation.x = Math.PI / 2;
  scarfNeckRing.position.y = 1.10;
  snowmanGroup.add(scarfNeckRing);

  const scarfKnot = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), scarfMat);
  scarfKnot.position.set(0.12, 1.08, 0.22);
  snowmanGroup.add(scarfKnot);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.32, 0.038), scarfMat);
  scarfTail.position.set(0.13, 0.89, 0.28);
  scarfTail.rotation.z = -0.12;
  scarfTail.rotation.y = 0.18;
  snowmanGroup.add(scarfTail);

  const fringeGroup = new THREE.Group();
  fringeGroup.position.set(0.15, 0.71, 0.31);
  fringeGroup.rotation.z = -0.12;
  snowmanGroup.add(fringeGroup);

  const fringeCyl = new THREE.CylinderGeometry(0.005, 0.005, 0.055, 6);
  [-0.040, -0.020, 0.0, 0.020, 0.040].forEach((fx) => {
    const tassel = new THREE.Mesh(fringeCyl, scarfFringeMat);
    tassel.position.set(fx, 0, 0);
    fringeGroup.add(tassel);
  });

  // Inverted bucket hat
  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(0, 1.51, 0);
  bucketGroup.rotation.z = 0.16;
  bucketGroup.rotation.x = -0.10;
  snowmanGroup.add(bucketGroup);

  const bucketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.185, 0.25, 18),
    bucketMat
  );
  bucketBody.position.y = 0.10;
  bucketGroup.add(bucketBody);

  const bucketRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.185, 0.012, 8, 22),
    bucketMat
  );
  bucketRim.rotateX(Math.PI / 2);
  bucketRim.position.y = -0.025;
  bucketGroup.add(bucketRim);

  const wireHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.178, 0.006, 6, 20, Math.PI),
    wireMat
  );
  wireHandle.position.set(0, -0.025, 0);
  wireHandle.rotation.z = -0.65;
  wireHandle.rotation.x = 0.35;
  bucketGroup.add(wireHandle);

  const bucketSnow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), villageSnowMat);
  bucketSnow.scale.set(1.1, 0.35, 1.1);
  bucketSnow.position.set(0, 0.23, 0);
  bucketGroup.add(bucketSnow);

  // Branch arms
  const branchGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.44, 8);
  const twigGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.15, 6);

  const leftBranchGroup = new THREE.Group();
  leftBranchGroup.name = 'leftBranch';
  leftBranchGroup.position.set(-0.30, 0.94, 0);
  leftBranchGroup.rotation.z = 1.15;
  leftBranchGroup.rotation.y = 0.25;
  snowmanGroup.add(leftBranchGroup);

  const leftMainBranch = new THREE.Mesh(branchGeo, branchWoodMat);
  leftMainBranch.position.y = 0.20;
  leftBranchGroup.add(leftMainBranch);

  const leftTwig1 = new THREE.Mesh(twigGeo, branchWoodMat);
  leftTwig1.position.set(-0.04, 0.34, 0.02);
  leftTwig1.rotation.z = 0.55;
  leftBranchGroup.add(leftTwig1);

  const leftTwig2 = new THREE.Mesh(twigGeo, branchWoodMat);
  leftTwig2.position.set(0.03, 0.38, -0.02);
  leftTwig2.rotation.z = -0.45;
  leftBranchGroup.add(leftTwig2);

  const rightBranchGroup = new THREE.Group();
  rightBranchGroup.name = 'rightBranch';
  rightBranchGroup.position.set(0.30, 0.94, 0);
  rightBranchGroup.rotation.z = -1.10;
  rightBranchGroup.rotation.y = -0.20;
  snowmanGroup.add(rightBranchGroup);

  const rightMainBranch = new THREE.Mesh(branchGeo, branchWoodMat);
  rightMainBranch.position.y = 0.20;
  rightBranchGroup.add(rightMainBranch);

  const rightTwig1 = new THREE.Mesh(twigGeo, branchWoodMat);
  rightTwig1.position.set(0.04, 0.34, 0.02);
  rightTwig1.rotation.z = -0.55;
  rightBranchGroup.add(rightTwig1);

  const rightTwig2 = new THREE.Mesh(twigGeo, branchWoodMat);
  rightTwig2.position.set(-0.03, 0.38, -0.02);
  rightTwig2.rotation.z = 0.45;
  rightBranchGroup.add(rightTwig2);

  enableShadows(snowmanGroup);

  return {
    group: snowmanGroup,
    leftBranch: leftBranchGroup,
    rightBranch: rightBranchGroup,
    bucketGroup
  };
}

/**
 * Builds a festive miniature wooden sled filled with colorful wrapped presents.
 */
function buildGiftSled() {
  const sledGroup = new THREE.Group();
  sledGroup.name = 'giftSled';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.72,
    metalness: 0.05
  });

  const runnerMat = new THREE.MeshStandardMaterial({
    color: 0x3d4450,
    roughness: 0.35,
    metalness: 0.85
  });

  const sledW = 0.65;
  const sledL = 1.10;

  // 1. Curved metal runners
  [-sledW * 0.45, sledW * 0.45].forEach((rx) => {
    const straightRunner = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.05, sledL),
      runnerMat
    );
    straightRunner.position.set(rx, 0.08, 0);
    sledGroup.add(straightRunner);

    // Front curl
    const curl = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.022, 8, 16, Math.PI * 0.75),
      runnerMat
    );
    curl.position.set(rx, 0.16, sledL * 0.5 - 0.02);
    curl.rotation.x = -Math.PI * 0.35;
    sledGroup.add(curl);

    // Stanchions / supports
    [-0.32, 0.0, 0.32].forEach((sz) => {
      const stanchion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.022, 0.15, 6),
        woodMat
      );
      stanchion.position.set(rx, 0.16, sz);
      sledGroup.add(stanchion);
    });
  });

  // 2. Slatted wooden bed
  const bedPlankCount = 5;
  for (let p = 0; p < bedPlankCount; p++) {
    const px = (-0.5 + p / (bedPlankCount - 1)) * (sledW * 0.85);
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.025, sledL * 0.92),
      woodMat
    );
    plank.position.set(px, 0.24, -0.02);
    sledGroup.add(plank);
  }

  // Cross braces
  [-0.32, 0.0, 0.32].forEach((cz) => {
    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(sledW * 0.95, 0.03, 0.06),
      woodMat
    );
    cross.position.set(0, 0.22, cz);
    sledGroup.add(cross);
  });

  // 3. Low curved side rails
  [-sledW * 0.46, sledW * 0.46].forEach((sx) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.06, sledL * 0.88),
      woodMat
    );
    rail.position.set(sx, 0.30, -0.04);
    sledGroup.add(rail);
  });

  // 4. Stack of festive gifts piled into the sled
  const giftsData = [
    { x: -0.12, y: 0.38, z: -0.18, sx: 0.34, sy: 0.24, sz: 0.34, col: 0xff1744, ribCol: 0xffd700 },
    { x: 0.14, y: 0.36, z: -0.16, sx: 0.28, sy: 0.20, sz: 0.30, col: 0x00c853, ribCol: 0xffffff },
    { x: 0.0, y: 0.37, z: 0.22, sx: 0.36, sy: 0.22, sz: 0.32, col: 0x00b0ff, ribCol: 0xffb703 },
    { x: -0.04, y: 0.54, z: -0.14, sx: 0.24, sy: 0.18, sz: 0.24, col: 0xffb703, ribCol: 0xff1744 },
    { x: 0.08, y: 0.52, z: 0.15, sx: 0.22, sy: 0.16, sz: 0.22, col: 0xd500f9, ribCol: 0xffffff }
  ];

  giftsData.forEach((g) => {
    const boxMat = new THREE.MeshStandardMaterial({ color: g.col, roughness: 0.42, metalness: 0.1 });
    const ribMat = new THREE.MeshStandardMaterial({ color: g.ribCol, roughness: 0.25, metalness: 0.6 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(g.sx, g.sy, g.sz), boxMat);
    box.position.set(g.x, g.y, g.z);
    sledGroup.add(box);

    const ribH = new THREE.Mesh(new THREE.BoxGeometry(g.sx * 1.02, g.sy * 0.22, g.sz * 1.02), ribMat);
    ribH.position.set(g.x, g.y, g.z);
    sledGroup.add(ribH);

    const ribV = new THREE.Mesh(new THREE.BoxGeometry(g.sx * 0.22, g.sy * 1.02, g.sz * 1.02), ribMat);
    ribV.position.set(g.x, g.y, g.z);
    sledGroup.add(ribV);

    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), ribMat);
    bow.position.set(g.x, g.y + g.sy * 0.52, g.z);
    bow.rotation.x = Math.PI / 2;
    sledGroup.add(bow);
  });

  enableShadows(sledGroup);

  return sledGroup;
}

/**
 * Creates a crisp painted sign texture for "Warme Chocomelk" with golden border and snowflakes.
 */
function createChocoSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Rich warm wood background
  ctx.fillStyle = '#3e2010';
  ctx.fillRect(0, 0, 512, 128);

  // Gold decorative border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.strokeStyle = '#f5c3a3';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 484, 100);

  // Title text
  ctx.font = 'bold 42px "Brush Script MT", "Segoe UI", cursive, sans-serif';
  ctx.fillStyle = '#fff6e5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☕ Warme Chocomelk ☕', 256, 52);

  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillStyle = '#d4af37';
  ctx.fillText('❄️ met verse marshmallows ❄️', 256, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds the hot chocolate stall with mugs, sign, awning and brass kettle.
 */
function buildHotChocoStall() {
  const stallGroup = new THREE.Group();
  stallGroup.name = 'hotChocoStall';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x7a4823,
    roughness: 0.82,
    metalness: 0.05
  });

  const stripedCanvasMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65
  });

  const redCanvasMat = new THREE.MeshStandardMaterial({
    color: 0xd92027,
    roughness: 0.65
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.28,
    metalness: 0.85,
    emissive: 0x332200,
    emissiveIntensity: 0.25
  });

  const ceramicMat = new THREE.MeshStandardMaterial({
    color: 0x00c853,
    roughness: 0.35,
    metalness: 0.08
  });

  const chocoLiquidMat = new THREE.MeshStandardMaterial({
    color: 0x3e2111,
    roughness: 0.18,
    metalness: 0.02
  });

  const marshmallowMat = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.85
  });

  // 1. Lower counter box (toog)
  const counterBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.76, 0.72), woodMat);
  counterBody.position.y = 0.38;
  stallGroup.add(counterBody);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.05, 0.82), woodMat);
  counterTop.position.y = 0.78;
  stallGroup.add(counterTop);

  // Barista standing floor platform behind counter
  const riser = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.30, 0.52), woodMat);
  riser.position.set(0.08, 0.15, -0.52);
  stallGroup.add(riser);

  // 2. Four support poles
  const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.8, 8);
  [
    { x: -0.74, z: -0.32 },
    { x: 0.74, z: -0.32 },
    { x: -0.74, z: 0.32 },
    { x: 0.74, z: 0.32 }
  ].forEach((pos) => {
    const pole = new THREE.Mesh(poleGeo, woodMat);
    pole.position.set(pos.x, 0.9 + 0.9, pos.z);
    stallGroup.add(pole);
  });

  // 3. Slanted awning with red-and-white stripes
  const awningGroup = new THREE.Group();
  awningGroup.position.set(0, 1.82, 0);
  stallGroup.add(awningGroup);

  const stripeW = 1.80 / 8;
  for (let s = 0; s < 8; s++) {
    const sx = -0.90 + stripeW * 0.5 + s * stripeW;
    const mat = s % 2 === 0 ? redCanvasMat : stripedCanvasMat;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(stripeW, 0.03, 1.05), mat);
    stripe.position.set(sx, 0.06, 0);
    stripe.rotation.x = 0.18;
    awningGroup.add(stripe);
  }

  // Sign hanging from awning with text "Warme Chocomelk"
  const signTex = createChocoSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.55,
    metalness: 0.08
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.27, 0.03), signMat);
  signMesh.position.set(0, 1.62, 0.42);
  stallGroup.add(signMesh);

  // 4. Large brass kettle (ketel) on counter with steam emitter point
  const kettleGroup = new THREE.Group();
  kettleGroup.position.set(-0.52, 1.06, -0.05);
  stallGroup.add(kettleGroup);

  const kettleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.38, 14), brassMat);
  kettleGroup.add(kettleBody);

  const kettleLid = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.10, 14), brassMat);
  kettleLid.position.y = 0.24;
  kettleGroup.add(kettleLid);

  const kettleSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.18, 8), brassMat);
  kettleSpout.rotation.z = -0.65;
  kettleSpout.position.set(0.16, 0.08, 0);
  kettleGroup.add(kettleSpout);

  // 5. Mugs with hot chocolate and marshmallows on counter
  const mugOffsets = [
    { x: 0.15, z: 0.12 },
    { x: 0.36, z: 0.08 },
    { x: -0.15, z: 0.15 }
  ];

  mugOffsets.forEach((mo) => {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.040, 0.09, 10), ceramicMat);
    mug.position.set(mo.x, 0.935, mo.z);
    stallGroup.add(mug);

    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.01, 10), chocoLiquidMat);
    liquid.position.set(mo.x, 0.97, mo.z);
    stallGroup.add(liquid);

    [-0.015, 0.015].forEach((mx) => {
      const mm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 6), marshmallowMat);
      mm.position.set(mo.x + mx, 0.985, mo.z);
      stallGroup.add(mm);
    });
  });

  // Dedicated serving mug for handing over
  const servingMug = new THREE.Group();
  servingMug.name = 'servingMug';
  const smCup = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.040, 0.09, 10), ceramicMat);
  smCup.position.y = 0.045;
  const smLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.01, 10), chocoLiquidMat);
  smLiquid.position.y = 0.082;
  const smMarsh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 6), marshmallowMat);
  smMarsh.position.set(0.01, 0.092, 0);
  servingMug.add(smCup, smLiquid, smMarsh);
  servingMug.position.set(0.15, 0.89, 0.12);
  stallGroup.add(servingMug);

  // Pouring pitcher (chocomelkan) held by Barista Coco
  const pouringKan = new THREE.Group();
  pouringKan.name = 'pouringKan';
  const kanBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.16, 12), brassMat);
  kanBody.position.y = 0.08;
  const kanSpout = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.07, 8), brassMat);
  kanSpout.rotation.z = -0.75;
  kanSpout.position.set(0.06, 0.14, 0);
  const kanHandle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 6, 12, Math.PI), brassMat);
  kanHandle.position.set(-0.055, 0.08, 0);
  kanHandle.rotation.z = -Math.PI / 2;
  pouringKan.add(kanBody, kanSpout, kanHandle);

  enableShadows(stallGroup);

  return {
    group: stallGroup,
    kettlePos: new THREE.Vector3(-0.52, 1.25, -0.05),
    mugOffsets,
    servingMug,
    pouringKan
  };
}

/**
 * Builds the woodchopper chopping block with a split log.
 */
function buildChoppingStation() {
  const stationGroup = new THREE.Group();
  stationGroup.name = 'choppingStation';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6e4324,
    roughness: 0.90,
    metalness: 0.04
  });

  const innerWoodMat = new THREE.MeshStandardMaterial({
    color: 0xd9b37c,
    roughness: 0.85,
    metalness: 0.02
  });

  // Chopping stump block
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.55, 12), woodMat);
  stump.position.y = 0.275;
  stationGroup.add(stump);

  // Whole log resting on top (hit by axe)
  const wholeLog = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.32, 10), innerWoodMat);
  wholeLog.position.set(0, 0.66, 0);
  stationGroup.add(wholeLog);

  // Two split half logs that appear upon splitting
  const halfGeo1 = new THREE.CylinderGeometry(0.088, 0.098, 0.32, 10, 1, false, 0, Math.PI);
  const splitHalf1 = new THREE.Mesh(halfGeo1, innerWoodMat);
  splitHalf1.position.set(0, 0.66, 0);
  splitHalf1.visible = false;

  const halfGeo2 = new THREE.CylinderGeometry(0.088, 0.098, 0.32, 10, 1, false, Math.PI, Math.PI);
  const splitHalf2 = new THREE.Mesh(halfGeo2, innerWoodMat);
  splitHalf2.position.set(0, 0.66, 0);
  splitHalf2.visible = false;
  stationGroup.add(splitHalf1, splitHalf2);

  // Stack of freshly chopped split logs beside block
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.42, 7), innerWoodMat);
      log.rotation.x = Math.PI / 2;
      log.position.set(-0.45 + (r % 2) * 0.06, 0.06 + r * 0.10, -0.22 + c * 0.14);
      stationGroup.add(log);
    }
  }

  enableShadows(stationGroup);

  return {
    group: stationGroup,
    wholeLog,
    splitHalf1,
    splitHalf2,
    splitLog() {
      wholeLog.visible = false;
      splitHalf1.visible = true;
      splitHalf2.visible = true;
      splitHalf1.position.set(-0.02, 0.66, 0);
      splitHalf2.position.set(0.02, 0.66, 0);
      splitHalf1.rotation.set(0, 0, 0);
      splitHalf2.rotation.set(0, 0, 0);
    },
    animateSplitFall(p) {
      wholeLog.visible = false;
      splitHalf1.visible = true;
      splitHalf2.visible = true;
      const t = Math.min(1, Math.max(0, p));
      const fallEase = t * t;
      splitHalf1.position.x = -0.02 - fallEase * 0.35;
      splitHalf1.position.y = 0.66 - fallEase * 0.58;
      splitHalf1.position.z = -fallEase * 0.06;
      splitHalf1.rotation.z = -fallEase * 1.57;
      splitHalf1.rotation.y = -fallEase * 0.35;

      splitHalf2.position.x = 0.02 + fallEase * 0.35;
      splitHalf2.position.y = 0.66 - fallEase * 0.58;
      splitHalf2.position.z = fallEase * 0.06;
      splitHalf2.rotation.z = fallEase * 1.57;
      splitHalf2.rotation.y = fallEase * 0.35;
    },
    resetLog() {
      wholeLog.visible = true;
      wholeLog.position.set(0, 0.66, 0);
      splitHalf1.visible = false;
      splitHalf2.visible = false;
      splitHalf1.position.set(0, 0.66, 0);
      splitHalf2.position.set(0, 0.66, 0);
      splitHalf1.rotation.set(0, 0, 0);
      splitHalf2.rotation.set(0, 0, 0);
    }
  };
}

/**
 * Builds a realistic wooden ladder with two sturdy side rails (staanders)
 * and at least 6 rungs (sporten - 8 total).
 * Origin is at the bottom foot midpoint on the ground (y = 0, z = 0).
 * Rails extend along +Y, rungs span across X, and +Z points in the tilt direction (towards wall).
 */
function buildLadder(railLength = 2.72, rungCount = 8) {
  const ladderGroup = new THREE.Group();
  ladderGroup.name = 'cottageLadder';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x7c4722,
    roughness: 0.82,
    metalness: 0.04
  });

  const rungWidth = 0.35;
  const railRadius = 0.024;
  const rungRadius = 0.016;

  // 1. Two side rails (staanders)
  const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, railLength, 12);
  [-rungWidth * 0.5, rungWidth * 0.5].forEach((rx) => {
    const rail = new THREE.Mesh(railGeo, woodMat);
    rail.position.set(rx, railLength * 0.5, 0);
    rail.castShadow = true;
    rail.receiveShadow = true;
    ladderGroup.add(rail);

    // Rounded rail tips
    [0, railLength].forEach((ty) => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(railRadius, 8, 8), woodMat);
      cap.position.set(rx, ty, 0);
      ladderGroup.add(cap);
    });
  });

  // 2. Wooden rungs (sporten) - minstens 6 (hier 8 sporten, gelijkmatig verdeeld)
  const rungGeo = new THREE.CylinderGeometry(rungRadius, rungRadius, rungWidth, 10);
  rungGeo.rotateZ(Math.PI / 2);

  const rungHeights = [];
  const startY = 0.35;
  const rungStep = 0.30;
  for (let r = 0; r < rungCount; r++) {
    const ry = startY + r * rungStep;
    rungHeights.push(ry);
    const rung = new THREE.Mesh(rungGeo, woodMat);
    rung.position.set(0, ry, 0);
    rung.castShadow = true;
    rung.receiveShadow = true;
    ladderGroup.add(rung);
  }

  ladderGroup.userData = {
    railLength,
    rungWidth,
    rungHeights,
    rungRadius,
    railRadius
  };

  enableShadows(ladderGroup);
  return ladderGroup;
}

/**
 * Creates an organic rounded box geometry for realistic stacked snow blocks (iglo-verband).
 * Chamfers corners/edges and adds subtle chiseled snow noise so blocks look hand-cut from arctic snow.
 */
function createRoundedSnowBlockGeo(w, h, d, bevel = 0.042) {
  const geo = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
  const pos = geo.attributes.position;
  const hw = w * 0.5;
  const hh = h * 0.5;
  const hd = d * 0.5;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const dx = Math.abs(x) - (hw - bevel);
    const dy = Math.abs(y) - (hh - bevel);
    const dz = Math.abs(z) - (hd - bevel);

    if (dx > 0 && dy > 0 && dz > 0) {
      const len = Math.hypot(dx, dy, dz);
      if (len > bevel) {
        const factor = bevel / len;
        x = Math.sign(x) * (hw - bevel + dx * factor);
        y = Math.sign(y) * (hh - bevel + dy * factor);
        z = Math.sign(z) * (hd - bevel + dz * factor);
      }
    } else if (dx > 0 && dy > 0) {
      const len = Math.hypot(dx, dy);
      if (len > bevel) {
        const factor = bevel / len;
        x = Math.sign(x) * (hw - bevel + dx * factor);
        y = Math.sign(y) * (hh - bevel + dy * factor);
      }
    } else if (dx > 0 && dz > 0) {
      const len = Math.hypot(dx, dz);
      if (len > bevel) {
        const factor = bevel / len;
        x = Math.sign(x) * (hw - bevel + dx * factor);
        z = Math.sign(z) * (hd - bevel + dz * factor);
      }
    } else if (dy > 0 && dz > 0) {
      const len = Math.hypot(dy, dz);
      if (len > bevel) {
        const factor = bevel / len;
        y = Math.sign(y) * (hh - bevel + dy * factor);
        z = Math.sign(z) * (hd - bevel + dz * factor);
      }
    }

    // Subtle natural chiseled variation
    const noise = (Math.sin(x * 20.0) * Math.cos(z * 20.0) + Math.sin(y * 28.0)) * 0.005;
    pos.setXYZ(i, x + noise * 0.25, y + noise * 0.40, z + noise * 0.25);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a curved, two-layer realistic snow wall (sneeuwmuurtje, ±70 cm hoog) in iglo bond:
 * - Gebogen rij van 6–8 opgestapelde sneeuwblokken (afgeronde boxen, licht verschillend van grootte en rotatie)
 * - 2 lagen hoog (±70 cm): laag 1 (4 blokken), laag 2 (3 blokken in verband gelegd)
 * - Sneeuw in de voegen en een paar sneeuwballen bovenop
 * - Geen enkel glad blauw blok meer, gewoon wit-blauwe sneeuw met hoge roughness (0.94)
 */
function buildSnowWall(seed = 0, snowBumpTex = null) {
  const wallGroup = new THREE.Group();
  wallGroup.name = `snowWall_${seed}`;

  // Crisp natural white-blue powdery snow with high roughness (geen glad blauw blok meer!)
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    emissive: 0x121d30,
    emissiveIntensity: 0.14,
    roughness: 0.94,
    metalness: 0.01,
    bumpMap: snowBumpTex,
    bumpScale: 0.015
  });

  // Deterministic pseudo-random helper based on seed
  let s = (seed + 1) * 31415;
  function rnd(min, max) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    return min + r * (max - min);
  }

  const arcRadius = 1.35; // Gentle curve radius wrapping around the elf

  // ---------------------------------------------------------------------------
  // 1. Laag 1 (Onderste laag, 4 afgeronde blokken langs een boog, ±35 cm hoog)
  // ---------------------------------------------------------------------------
  const layer1Angles = [-0.42, -0.14, 0.14, 0.42]; // rad (~ -24°, -8°, +8°, +24°)
  layer1Angles.forEach((theta) => {
    const bw = rnd(0.44, 0.48);
    const bh = rnd(0.34, 0.36);
    const bd = rnd(0.33, 0.37);
    const blockGeo = createRoundedSnowBlockGeo(bw, bh, bd, rnd(0.038, 0.046));
    const block = new THREE.Mesh(blockGeo, snowMat);

    const bx = Math.sin(theta) * arcRadius + rnd(-0.015, 0.015);
    const bz = -(1 - Math.cos(theta)) * arcRadius + rnd(-0.015, 0.015);
    const by = bh * 0.5 + rnd(-0.008, 0.008);

    block.position.set(bx, by, bz);
    block.rotation.set(
      rnd(-0.02, 0.02),
      -theta + rnd(-0.04, 0.04),
      rnd(-0.025, 0.025)
    );
    wallGroup.add(block);
  });

  // ---------------------------------------------------------------------------
  // 2. Laag 2 (Bovenste laag, 3 afgeronde blokken in verband gelegd / iglo-verband,
  //    bovenop de voegen van laag 1, totale hoogte ±70 cm)
  // ---------------------------------------------------------------------------
  const layer2Angles = [-0.28, 0.0, 0.28]; // rad (~ -16°, 0°, +16°)
  layer2Angles.forEach((theta) => {
    const bw = rnd(0.44, 0.48);
    const bh = rnd(0.34, 0.36);
    const bd = rnd(0.32, 0.36);
    const blockGeo = createRoundedSnowBlockGeo(bw, bh, bd, rnd(0.040, 0.048));
    const block = new THREE.Mesh(blockGeo, snowMat);

    // Staggered right on top of layer 1 joints, leaning slightly inward like an igloo
    const r2 = arcRadius - 0.02;
    const bx = Math.sin(theta) * r2 + rnd(-0.015, 0.015);
    const bz = -(1 - Math.cos(theta)) * r2 - 0.02 + rnd(-0.015, 0.015);
    const by = 0.35 + bh * 0.5 + rnd(-0.008, 0.008);

    block.position.set(bx, by, bz);
    block.rotation.set(
      0.06 + rnd(-0.02, 0.02), // subtle igloo inward tilt
      -theta + rnd(-0.04, 0.04),
      rnd(-0.025, 0.025)
    );
    wallGroup.add(block);
  });

  // ---------------------------------------------------------------------------
  // 3. Sneeuw in de voegen (zachte sneeuwproppen & voegmortel tussen de blokken)
  // ---------------------------------------------------------------------------
  // A. Verticale voegen laag 1 (3 voegen)
  [-0.28, 0.0, 0.28].forEach((theta) => {
    const seam = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), snowMat);
    seam.scale.set(0.9, 1.8, 1.4);
    const sx = Math.sin(theta) * arcRadius;
    const sz = -(1 - Math.cos(theta)) * arcRadius;
    seam.position.set(sx, 0.18 + rnd(-0.03, 0.03), sz);
    wallGroup.add(seam);
  });

  // B. Verticale voegen laag 2 (2 voegen)
  [-0.14, 0.14].forEach((theta) => {
    const seam = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), snowMat);
    seam.scale.set(0.9, 1.7, 1.3);
    const sx = Math.sin(theta) * (arcRadius - 0.02);
    const sz = -(1 - Math.cos(theta)) * (arcRadius - 0.02) - 0.02;
    seam.position.set(sx, 0.52 + rnd(-0.03, 0.03), sz);
    wallGroup.add(seam);
  });

  // C. Horizontale voeg tussen laag 1 en laag 2 (langs de hele kromming op y ≈ 0.35 m)
  [-0.35, -0.15, 0.0, 0.15, 0.35].forEach((theta) => {
    const horizJoint = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), snowMat);
    horizJoint.scale.set(1.5, 0.45, 1.1);
    const hx = Math.sin(theta) * arcRadius;
    const hz = -(1 - Math.cos(theta)) * arcRadius;
    horizJoint.position.set(hx, 0.35 + rnd(-0.015, 0.015), hz);
    wallGroup.add(horizJoint);
  });

  // D. Sneeuwduinen / afvloeiing aan de voet van het muurtje
  [-0.50, -0.25, 0.0, 0.25, 0.50].forEach((theta, fi) => {
    const footDrift = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), snowMat);
    footDrift.scale.set(1.2, 0.42, 1.1);
    const fx = Math.sin(theta) * (arcRadius + 0.12);
    const fz = -(1 - Math.cos(theta)) * (arcRadius + 0.12) + (fi % 2 === 0 ? 0.08 : -0.06);
    footDrift.position.set(fx, 0.07, fz);
    wallGroup.add(footDrift);
  });

  // ---------------------------------------------------------------------------
  // 4. Een paar sneeuwballen bovenop het muurtje (klaar voor gebruik!)
  // ---------------------------------------------------------------------------
  const snowballGeo = new THREE.SphereGeometry(0.052, 12, 10);
  const readySnowballs = [
    // Piramide van 3 op het middelste blok
    { x: -0.05, y: 0.725, z: -0.02 },
    { x: 0.06, y: 0.725, z: -0.01 },
    { x: 0.00, y: 0.812, z: -0.015 }, // Bovenop de piramide
    // Twee losse sneeuwballen langs de gebogen rand
    { x: -0.32, y: 0.720, z: -0.05 },
    { x: 0.33, y: 0.720, z: -0.05 }
  ];
  readySnowballs.forEach((sp) => {
    const ball = new THREE.Mesh(snowballGeo, snowMat);
    ball.position.set(
      sp.x + rnd(-0.015, 0.015),
      sp.y + rnd(-0.008, 0.008),
      sp.z + rnd(-0.015, 0.015)
    );
    ball.rotation.set(rnd(0, Math.PI), rnd(0, Math.PI), rnd(0, Math.PI));
    wallGroup.add(ball);
  });

  enableShadows(wallGroup);

  return wallGroup;
}

/**
 * Master creator for all village elves and dynamic scene animations (`src/actors/elves.js`).
 * Creates:
 * 1. 2 gift carrier elves (Pippin & Trixie) pulling a festive loaded sled over the snowy path
 * 2. 2 snowball-fighting elves (Bramble & Noel) behind snow walls with curving throws & bursts
 * 3. 3 chatting elves on the village square (Barnaby, Holly, Finley)
 * 4. 1 woodchopper elf (Bram) with axe, chopping block and flying wood splinters
 * 5. 1 ladder elf (Jingle) hanging glowing fairy lights on a cottage
 * 6. 1 hot choco stall with steaming cups and barista elf (Coco)
 * 7. 1 realistic village snowman with wobbling reaction
 */
export function createElves(scene, interaction = null, audio = null) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'elvesGroup';

  const sharedGeoms = getSharedElfGeometries();
  const sharedMaterials = getSharedElfMaterials();
  const snowBumpTex = createSnowBumpTexture();

  const redWhiteStocking = createStockingTexture('#ffffff', '#ff1744', 8);
  const greenWhiteStocking = createStockingTexture('#ffffff', '#00c853', 8);
  const redGreenStocking = createStockingTexture('#ff1744', '#00c853', 8);
  const tealWhiteStocking = createStockingTexture('#ffffff', '#00bfa5', 8);

  // ---------------------------------------------------------------------------
  // 1. Build All 10 Village Elves with the Unified createElf() Model
  // ---------------------------------------------------------------------------
  const elfConfigs = [
    // 0 & 1: Walking Elves on Scenic Snowy Path (Pippin & Trixie)
    {
      id: 'elf_carrier_1',
      name: 'Pippin',
      label: 'Elfje Pippin — Wandelend elfje 🎁🚶',
      role: 'path_walker',
      suitColor: 0xff1744,
      trimColor: 0x00e676,
      stockingTex: redWhiteStocking,
      shoeColor: 0x00c853,
      hairColor: 0xb55222,
      scale: 1.35,
      hatTilt: 1,
      quote: 'Vrolijke stappen over het besneeuwde pad! De werkplaats en de grote kerstboom zijn schitterend! 🎁✨'
    },
    {
      id: 'elf_carrier_2',
      name: 'Trixie',
      label: 'Elfje Trixie — Wandelend elfje 🎀🚶',
      role: 'path_walker',
      suitColor: 0x00c853,
      trimColor: 0xffffff,
      stockingTex: greenWhiteStocking,
      shoeColor: 0xff1744,
      hairColor: 0xf5b041,
      scale: 1.34,
      hatTilt: -1,
      quote: 'Kijk de warme kaarsjes langs het pad! Pas op dat we niet botsen bij het passeren! 🎀🕯️'
    },

    // 2 & 3: Snowball Fight Elves Behind Snow Walls
    {
      id: 'elf_snowball_1',
      name: 'Bramble',
      label: 'Elfje Bramble — Sneeuwballenwerper ❄️⚪',
      role: 'snowball',
      suitColor: 0x00e676,
      trimColor: 0xff1744,
      stockingTex: redGreenStocking,
      shoeColor: 0x5c2c16,
      hairColor: 0x4a2c17,
      scale: 1.36,
      hatTilt: 1,
      quote: 'Bukken achter het sneeuwmuurtje! RAAK! ❄️⚪🎯'
    },
    {
      id: 'elf_snowball_2',
      name: 'Noel',
      label: 'Elfje Noel — Sneeuwballenwerper ❄️⚪',
      role: 'snowball',
      suitColor: 0xff1744,
      trimColor: 0xffffff,
      stockingTex: redWhiteStocking,
      shoeColor: 0x00c853,
      hairColor: 0x26170d,
      scale: 1.35,
      hatTilt: -1,
      quote: 'Ha, mis! Nu is het mijn beurt, Bramble! Vliegende sneeuwbal! ❄️🎯'
    },

    // 4, 5, 6, 7: Dancing Elves in a Circle Around the Christmas Tree
    {
      id: 'elf_tree_dancer_1',
      name: 'Barnaby',
      label: 'Elfje Barnaby — Danser rond de kerstboom 🎄🕺',
      role: 'tree_dancer',
      suitColor: 0x00b348,
      trimColor: 0xffd700,
      stockingTex: greenWhiteStocking,
      shoeColor: 0xff1744,
      hairColor: 0xf4d03f,
      scale: 1.38,
      hatTilt: 1,
      quote: 'Hand in hand dansen rond de kerstboom op ons plein! Vrolijk kerstfeest! 🎄✨'
    },
    {
      id: 'elf_tree_dancer_2',
      name: 'Holly',
      label: 'Elfje Holly — Danseres rond de kerstboom 🎄💃',
      role: 'tree_dancer',
      suitColor: 0xff2442,
      trimColor: 0x00e676,
      stockingTex: redWhiteStocking,
      shoeColor: 0x00b348,
      hairColor: 0xad461b,
      scale: 1.34,
      hatTilt: -1,
      quote: 'Zing mee met ons kerstliedje terwijl we wiegen in de sneeuw! 🎶🎄'
    },
    {
      id: 'elf_tree_dancer_3',
      name: 'Finley',
      label: 'Elfje Finley — Danser rond de kerstboom 🎄🕺',
      role: 'tree_dancer',
      suitColor: 0x00bfa5,
      trimColor: 0xffd700,
      stockingTex: tealWhiteStocking,
      shoeColor: 0x79461d,
      hairColor: 0x1f1610,
      scale: 1.36,
      hatTilt: 1,
      quote: 'Kijk de gouden ster in de piek boven ons schitteren! 🌟💃'
    },
    {
      id: 'elf_tree_dancer_4',
      name: 'Ivy',
      label: 'Elfje Ivy — Danseres rond de kerstboom 🎄💃',
      role: 'tree_dancer',
      suitColor: 0x8e24aa,
      trimColor: 0xffffff,
      stockingTex: redGreenStocking,
      shoeColor: 0x00c853,
      hairColor: 0xb76e79,
      scale: 1.35,
      hatTilt: -1,
      quote: 'Rond en rond de boom, wat een heerlijke kerstavond! 🎄❄️'
    },

    // 8: Woodchopper Elf near Cottage 1
    {
      id: 'elf_woodcutter',
      name: 'Bram',
      label: 'Elfje Bram — Houthakker 🪓🪵',
      role: 'woodchopper',
      suitColor: 0xd92027,
      trimColor: 0x3d4450,
      stockingTex: redGreenStocking,
      shoeColor: 0x4a2c17,
      hairColor: 0x7c3f1d,
      scale: 1.37,
      hatTilt: 1,
      quote: 'Klets! Hout voor de haardvuren! De kachels moeten blijven branden! 🪓🔥'
    },

    // 9: Ladder Elf hanging lights on Cottage 2
    {
      id: 'elf_ladder',
      name: 'Jingle',
      label: 'Elfje Jingle — Lichtjesophanger 🪜✨',
      role: 'ladder_decorator',
      suitColor: 0x00e676,
      trimColor: 0xffd700,
      stockingTex: greenWhiteStocking,
      shoeColor: 0xd92027,
      hairColor: 0xf5b041,
      scale: 1.34,
      hatTilt: -1,
      quote: 'Nog een gouden lichtje aan de dakrand! Prachtig feestelijk! 🪜✨'
    },

    // 10: Barista Elf behind Hot Choco Stall
    {
      id: 'elf_barista',
      name: 'Coco',
      label: 'Elfje Coco — Chocomelk Barista ☕🍫',
      role: 'barista',
      suitColor: 0x8b5a2b,
      trimColor: 0xffffff,
      stockingTex: redWhiteStocking,
      shoeColor: 0x3e2111,
      hairColor: 0x26170d,
      scale: 1.35,
      hatTilt: 1,
      quote: 'Verse warme chocolademelk met extra marshmallows! Kom gerust een beker halen! ☕🍫'
    },

    // 11: Waiting Customer Elf in front of Hot Choco Stall
    {
      id: 'elf_choco_customer',
      name: 'Pip',
      label: 'Elfje Pip — Chocomelk Genieter ☕🥨',
      role: 'choco_customer',
      suitColor: 0x0288d1,
      trimColor: 0xffffff,
      stockingTex: tealWhiteStocking,
      shoeColor: 0x004d40,
      hairColor: 0x8d6e63,
      scale: 1.33,
      hatTilt: -1,
      quote: 'Mmm, heerlijke warme chocolademelk met marshmallows! Dankjewel Coco! ☕😋'
    }
  ];

  const elves = elfConfigs.map((cfg) => {
    const elf = createElf(cfg);
    rootGroup.add(elf.root);
    return elf;
  });

  // ---------------------------------------------------------------------------
  // 2. Setup Walking Elves (Pippin & Trixie) on Shared Scenic Path Curve
  // ---------------------------------------------------------------------------
  // Festive loaded gift sled pulled by Pippin along the path curve
  const giftSled = buildGiftSled();
  const initSledPos = new THREE.Vector3();
  const initSledTangent = new THREE.Vector3();
  pathCurve.getPointAt(0.075, initSledPos);
  pathCurve.getTangentAt(0.075, initSledTangent);
  const initSledY = getGroundHeight(initSledPos.x, initSledPos.z);
  giftSled.position.set(initSledPos.x, initSledY, initSledPos.z);
  giftSled.rotation.y = Math.atan2(initSledTangent.x, initSledTangent.z);
  rootGroup.add(giftSled);

  const walkers = [
    {
      elf: elves[0],
      progress: 0.12,          // Near Elf Village entrance
      direction: 1,           // Walking towards Great Christmas Tree
      baseSpeed: 0.045,       // Progress speed per sec (~1.2 m/s)
      lateralOffsetBias: 0.10,
      lateralPhase: 0.0,
      pauseTimer: 0.0,
      nomX: -14.6,
      nomZ: 8.2,
      moveDir: new THREE.Vector3(1, 0, 0)
    },
    {
      elf: elves[1],
      progress: 0.84,          // Near Great Christmas Tree
      direction: -1,          // Walking towards Elf Village
      baseSpeed: 0.051,       // Progress speed per sec (~1.36 m/s)
      lateralOffsetBias: -0.10,
      lateralPhase: 2.7,
      pauseTimer: 0.0,
      nomX: 1.2,
      nomZ: -1.8,
      moveDir: new THREE.Vector3(-1, 0, 0)
    }
  ];

  // ---------------------------------------------------------------------------
  // 3. Setup Snowball Fight (Bramble & Noel behind Snow Walls)
  // ---------------------------------------------------------------------------
  // Exactly ±8 m apart in the village snow field:
  // Bramble: (-23.2, 10.5), Noel: (-17.3, 15.9)
  // dx = 5.9m, dz = 5.4m -> distance = sqrt(5.9^2 + 5.4^2) = 7.998 m ≈ 8.0 m!
  const elfBramblePos = new THREE.Vector3(-23.2, getTerrainHeight(-23.2, 10.5), 10.5);
  const elfNoelPos = new THREE.Vector3(-17.3, getTerrainHeight(-17.3, 15.9), 15.9);

  const angleBrambleToNoel = Math.atan2(elfNoelPos.x - elfBramblePos.x, elfNoelPos.z - elfBramblePos.z);
  const angleNoelToBramble = Math.atan2(elfBramblePos.x - elfNoelPos.x, elfBramblePos.z - elfNoelPos.z);
  const dirBrambleToNoel = new THREE.Vector3().subVectors(elfNoelPos, elfBramblePos).normalize();

  // Bramble's curved snow wall: 0.72m in front of Bramble towards Noel
  const snowWall1 = buildSnowWall(1, snowBumpTex);
  const wall1Pos = elfBramblePos.clone().addScaledVector(dirBrambleToNoel, 0.72);
  wall1Pos.y = getTerrainHeight(wall1Pos.x, wall1Pos.z);
  snowWall1.position.copy(wall1Pos);
  snowWall1.rotation.y = angleBrambleToNoel;
  rootGroup.add(snowWall1);

  // Noel's curved snow wall: 0.72m in front of Noel towards Bramble
  const snowWall2 = buildSnowWall(2, snowBumpTex);
  const wall2Pos = elfNoelPos.clone().addScaledVector(dirBrambleToNoel, -0.72);
  wall2Pos.y = getTerrainHeight(wall2Pos.x, wall2Pos.z);
  snowWall2.position.copy(wall2Pos);
  snowWall2.rotation.y = angleNoelToBramble;
  rootGroup.add(snowWall2);

  elves[2].root.position.copy(elfBramblePos);
  elves[3].root.position.copy(elfNoelPos);

  elves[2].root.rotation.y = angleBrambleToNoel;
  elves[3].root.rotation.y = angleNoelToBramble;

  // Packed snow material for held and flying snowballs (high roughness, powdery snow)
  const snowballMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    emissive: 0x223548,
    emissiveIntensity: 0.25,
    roughness: 0.92,
    metalness: 0.01
  });

  const flyingSnowballMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xddeeff,
    emissiveIntensity: 0.70,
    roughness: 0.82,
    metalness: 0.0
  });

  // Attach a snowball into each elf's right hand (visible when kneaded and during windup)
  const heldSnowball1 = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), snowballMat);
  heldSnowball1.position.set(0, -0.012, 0.030);
  heldSnowball1.visible = false;
  heldSnowball1.castShadow = true;
  elves[2].rightHand.add(heldSnowball1);
  elves[2].heldSnowball = heldSnowball1;

  const heldSnowball2 = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), snowballMat);
  heldSnowball2.position.set(0, -0.012, 0.030);
  heldSnowball2.visible = false;
  heldSnowball2.castShadow = true;
  elves[3].rightHand.add(heldSnowball2);
  elves[3].heldSnowball = heldSnowball2;

  // The ballistic flying snowball in the scene
  const flyingSnowball = new THREE.Mesh(
    new THREE.SphereGeometry(0.082, 16, 14),
    flyingSnowballMat
  );
  flyingSnowball.visible = false;
  flyingSnowball.castShadow = true;
  rootGroup.add(flyingSnowball);

  // Dynamic snow particle effects: Hit burst, ground miss plof, and hat snow dust
  const BURST_COUNT = 48;
  const burstGeo = new THREE.BufferGeometry();
  const burstPositions = new Float32Array(BURST_COUNT * 3);
  const burstVelocities = [];
  const burstLife = new Float32Array(BURST_COUNT);
  const burstMaxLife = new Float32Array(BURST_COUNT);

  for (let i = 0; i < BURST_COUNT; i++) {
    burstPositions[i * 3] = 0;
    burstPositions[i * 3 + 1] = -50;
    burstPositions[i * 3 + 2] = 0;
    burstVelocities.push(new THREE.Vector3());
    burstLife[i] = 0;
    burstMaxLife[i] = 1;
  }
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));

  const burstMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.075,
    transparent: true,
    opacity: 0.90,
    depthWrite: false
  });
  const burstPoints = new THREE.Points(burstGeo, burstMat);
  burstPoints.frustumCulled = false;
  rootGroup.add(burstPoints);

  function triggerHitBurst(impactPos) {
    // 24 particles exploding in 3D around impact point
    for (let i = 0; i < 26; i++) {
      burstPositions[i * 3] = impactPos.x + (Math.random() - 0.5) * 0.08;
      burstPositions[i * 3 + 1] = impactPos.y + (Math.random() - 0.5) * 0.08;
      burstPositions[i * 3 + 2] = impactPos.z + (Math.random() - 0.5) * 0.08;
      const speed = 0.8 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.3) * Math.PI;
      burstVelocities[i].set(
        Math.cos(theta) * Math.cos(phi) * speed,
        Math.sin(phi) * speed + 0.55,
        Math.sin(theta) * Math.cos(phi) * speed
      );
      burstLife[i] = 0.55 + Math.random() * 0.30;
      burstMaxLife[i] = burstLife[i];
    }
    burstGeo.attributes.position.needsUpdate = true;
  }

  function triggerGroundPlof(groundPos) {
    // 14 particles puffing upward softly from the snow ground
    for (let i = 26; i < 40; i++) {
      burstPositions[i * 3] = groundPos.x + (Math.random() - 0.5) * 0.16;
      burstPositions[i * 3 + 1] = groundPos.y + 0.04;
      burstPositions[i * 3 + 2] = groundPos.z + (Math.random() - 0.5) * 0.16;
      const speed = 0.25 + Math.random() * 0.55;
      const theta = Math.random() * Math.PI * 2;
      burstVelocities[i].set(
        Math.cos(theta) * speed,
        0.5 + Math.random() * 0.65,
        Math.sin(theta) * speed
      );
      burstLife[i] = 0.45 + Math.random() * 0.25;
      burstMaxLife[i] = burstLife[i];
    }
    burstGeo.attributes.position.needsUpdate = true;
  }

  function triggerHatSnowDust(hatPos) {
    // 8 particles fluttering down as elf shakes snow off hat
    for (let i = 40; i < 48; i++) {
      burstPositions[i * 3] = hatPos.x + (Math.random() - 0.5) * 0.14;
      burstPositions[i * 3 + 1] = hatPos.y + (Math.random() - 0.5) * 0.06;
      burstPositions[i * 3 + 2] = hatPos.z + (Math.random() - 0.5) * 0.14;
      burstVelocities[i].set(
        (Math.random() - 0.5) * 0.35,
        -0.2 - Math.random() * 0.3,
        (Math.random() - 0.5) * 0.35
      );
      burstLife[i] = 0.50 + Math.random() * 0.25;
      burstMaxLife[i] = burstLife[i];
    }
    burstGeo.attributes.position.needsUpdate = true;
  }

  // State Machine for Realistic Turn-Based Snowball Fight
  const FIGHT_PAUSE = 0;   // Random idle pause peeking over wall
  const FIGHT_SCOOP = 1;   // Bukken: elf duikt achter muurtje en schept met beide handen sneeuw
  const FIGHT_KNEAD = 2;   // Kneden: handen draaien rond elkaar, sneeuwbal verschijnt in hand
  const FIGHT_THROW = 3;   // Opkomen en gooien: komt omhoog, arm zwaait achter hoofd naar voren, been stapt mee, lichaam draait mee
  const FIGHT_FLIGHT = 4;  // Vlucht: realistische parabolische boog; tegenstander duikt weg
  const FIGHT_IMPACT = 5;  // Treffer (uiteenspatten, wankelen, muts schudden) of Misser (plof in sneeuw)

  let fightState = FIGHT_PAUSE;
  let fightTimer = 0;
  let pauseDuration = 1.4; // Initial gentle pause
  let activeThrowerIndex = 0; // 0 = Bramble, 1 = Noel
  let isCurrentHit = true;
  const flightStartPos = new THREE.Vector3();
  const flightEndPos = new THREE.Vector3();
  let ballLaunched = false;
  let hatDustTriggered = false;

  // ---------------------------------------------------------------------------
  // 4. Setup Dancing Elves in Wide Ring Around Christmas Tree (-18.0, 8.5)
  // ---------------------------------------------------------------------------
  const treeCenter = { x: -18.0, z: 8.5 };
  const treeRingRadius = 2.1; // Minstens 1.5 m van de boom (2.1 m) en van elkaar (2.97 m)
  const treeDancers = [elves[4], elves[5], elves[6], elves[7]];

  treeDancers.forEach((elf, k) => {
    const ang = k * (Math.PI / 2);
    const px = treeCenter.x + Math.cos(ang) * treeRingRadius;
    const pz = treeCenter.z + Math.sin(ang) * treeRingRadius;
    const py = getTerrainHeight(px, pz);
    elf.root.position.set(px, py, pz);
    // Face tangential to circle with inward inclination
    elf.root.rotation.y = ang + Math.PI / 2 + 0.12;

    // Outstretched arms to hold hands with neighboring elves
    elf.leftArm.rotation.z = 0.88;
    elf.leftArm.rotation.x = -0.32;
    elf.rightArm.rotation.z = -0.88;
    elf.rightArm.rotation.x = -0.32;
  });

  // ---------------------------------------------------------------------------
  // 5. Setup Woodcutter Elf (Bram) with Axe, Block & Flying Wood Splinters
  // ---------------------------------------------------------------------------
  const choppingStation = buildChoppingStation();
  const stumpX = -9.8;
  const stumpZ = 14.2;
  const stumpY = getTerrainHeight(stumpX, stumpZ);
  choppingStation.group.position.set(stumpX, stumpY, stumpZ);
  rootGroup.add(choppingStation.group);

  const woodcutterElf = elves[8];
  const woodcutterPos = new THREE.Vector3(-9.8, getTerrainHeight(-9.8, 15.0), 15.0);
  woodcutterElf.root.position.copy(woodcutterPos);
  woodcutterElf.root.rotation.y = Math.PI; // Georiënteerd naar het hakblok

  // Sturdy wide stance
  woodcutterElf.leftLeg.position.x = -0.09;
  woodcutterElf.rightLeg.position.x = 0.09;

  // Woodcutter axe attached firmly as child of rightHand
  const axeGroup = new THREE.Group();
  axeGroup.name = 'woodcutterAxe';

  const axeWoodMat = new THREE.MeshStandardMaterial({
    color: 0x613417,
    roughness: 0.72,
    metalness: 0.05
  });

  const axeSteelMat = new THREE.MeshStandardMaterial({
    color: 0x8a939e,
    roughness: 0.28,
    metalness: 0.88
  });

  const axeEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xd8e1ec,
    roughness: 0.15,
    metalness: 0.95
  });

  // Handle (steel van de bijl): runs along local Z
  const HANDLE_LEN = 0.60;
  const handleGeo = new THREE.CylinderGeometry(0.015, 0.018, HANDLE_LEN, 10);
  handleGeo.rotateX(Math.PI / 2);
  const axeHandle = new THREE.Mesh(handleGeo, axeWoodMat);
  // Right hand grips near center; butt is at Z = -0.16, head is at Z = +0.44
  axeHandle.position.set(0, 0, 0.14);
  axeGroup.add(axeHandle);

  // Grip target on handle for left hand ("lager op de steel", closer to the butt)
  const leftGripTarget = new THREE.Object3D();
  leftGripTarget.name = 'leftGripTarget';
  leftGripTarget.position.set(0, 0, -0.085);
  axeGroup.add(leftGripTarget);

  // Axe head (iron collar around shaft)
  const axeHeadGeo = new THREE.BoxGeometry(0.034, 0.054, 0.065);
  const axeHeadMesh = new THREE.Mesh(axeHeadGeo, axeSteelMat);
  axeHeadMesh.position.set(0, 0.005, 0.40);
  axeGroup.add(axeHeadMesh);

  // Axe cutting blade: wedge projecting downward along -Y so it chops into the block
  const axeBladeGeo = new THREE.BoxGeometry(0.016, 0.13, 0.10);
  const axeBladeMesh = new THREE.Mesh(axeBladeGeo, axeSteelMat);
  axeBladeMesh.position.set(0, -0.065, 0.42);
  axeGroup.add(axeBladeMesh);

  const axeEdgeGeo = new THREE.BoxGeometry(0.006, 0.12, 0.03);
  const axeEdgeMesh = new THREE.Mesh(axeEdgeGeo, axeEdgeMat);
  axeEdgeMesh.position.set(0, -0.07, 0.47);
  axeGroup.add(axeEdgeMesh);

  // Marker for precision blade contact
  const bladeContactMarker = new THREE.Object3D();
  bladeContactMarker.name = 'bladeContactMarker';
  bladeContactMarker.position.set(0, -0.125, 0.44);
  axeGroup.add(bladeContactMarker);

  // Parent axe directly to right hand
  woodcutterElf.rightHand.add(axeGroup);
  axeGroup.position.set(0, -0.012, 0.018);

  // Fresh log mesh for when elf sets up a new block
  const carryLogGeo = new THREE.CylinderGeometry(0.09, 0.10, 0.32, 10);
  const carryLogMat = new THREE.MeshStandardMaterial({ color: 0xd9b37c, roughness: 0.85 });
  const freshCarryLog = new THREE.Mesh(carryLogGeo, carryLogMat);
  freshCarryLog.visible = false;
  woodcutterElf.charGroup.add(freshCarryLog);

  // Wood splinters particle system
  const SPLINTER_COUNT = 16;
  const splinterGeo = new THREE.BufferGeometry();
  const splinterPositions = new Float32Array(SPLINTER_COUNT * 3);
  const splinterVelocities = [];
  for (let i = 0; i < SPLINTER_COUNT; i++) {
    splinterPositions[i * 3] = 0;
    splinterPositions[i * 3 + 1] = -50;
    splinterPositions[i * 3 + 2] = 0;
    splinterVelocities.push(new THREE.Vector3());
  }
  splinterGeo.setAttribute('position', new THREE.BufferAttribute(splinterPositions, 3));
  const splinterMat = new THREE.PointsMaterial({
    color: 0xd9b37c,
    size: 0.055,
    transparent: true,
    opacity: 0.95
  });
  const splinterPoints = new THREE.Points(splinterGeo, splinterMat);
  splinterPoints.frustumCulled = false;
  rootGroup.add(splinterPoints);

  let splinterTimer = 0;
  function triggerSplinterBurst() {
    splinterTimer = 0.38;
    for (let i = 0; i < SPLINTER_COUNT; i++) {
      splinterPositions[i * 3] = stumpX;
      splinterPositions[i * 3 + 1] = stumpY + 0.81;
      splinterPositions[i * 3 + 2] = stumpZ;
      const angle = (i / SPLINTER_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const spd = 0.9 + Math.random() * 1.1;
      splinterVelocities[i].set(
        Math.cos(angle) * spd,
        1.0 + Math.random() * 1.2,
        Math.sin(angle) * spd
      );
    }
    splinterGeo.attributes.position.needsUpdate = true;
  }

  // Helpers and Two-Bone IK Solver for Woodcutter Bram's hierarchical left arm:
  // Shoulder (pivot) -> Upperarm -> Elbow (pivot) -> Forearm -> Hand (pivot)
  const _leftTargetWorld = new THREE.Vector3();
  const _vTarget = new THREE.Vector3();
  const _vArm = new THREE.Vector3();
  const _upperDir = new THREE.Vector3();
  const _bendNormal = new THREE.Vector3();

  function updateLeftArmIK(elf, targetWorldPos) {
    const shoulder = elf.leftArm;
    const elbow = elf.leftElbow;
    const hand = elf.leftHand;
    const torso = elf.torso;

    // Convert target world position into torso coordinates (shoulder's parent)
    _vTarget.copy(targetWorldPos);
    torso.worldToLocal(_vTarget);

    // Vector from shoulder pivot to target
    _vArm.subVectors(_vTarget, shoulder.position);
    const dist = _vArm.length();

    const L1 = 0.107; // upper arm length in torso space
    const L2 = 0.095; // forearm length in torso space
    const maxReach = L1 + L2 - 0.001;
    const minReach = Math.abs(L1 - L2) + 0.001;
    const d = THREE.MathUtils.clamp(dist, minReach, maxReach);

    // Law of cosines for elbow bend angle
    const cosBeta = (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2);
    const beta = Math.acos(THREE.MathUtils.clamp(cosBeta, -1, 1));
    const elbowBend = Math.PI - beta;

    // Law of cosines for shoulder offset
    const cosAlpha = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
    const alpha = Math.acos(THREE.MathUtils.clamp(cosAlpha, -1, 1));

    // Direction from shoulder to target
    const dirArm = _vArm.clone().normalize();

    // Natural pole direction for the left elbow (bends outward & slightly forward)
    const pole = new THREE.Vector3(-0.6, -0.4, 0.7).normalize();
    _bendNormal.crossVectors(dirArm, pole).normalize();
    if (_bendNormal.lengthSq() < 0.001) _bendNormal.set(0, 0, 1);

    // Upper arm direction rotated by alpha around bend normal
    _upperDir.copy(dirArm).applyAxisAngle(_bendNormal, -alpha);

    // Shoulder rotation from default down (0, -1, 0) to _upperDir
    const downVec = new THREE.Vector3(0, -1, 0);
    shoulder.quaternion.setFromUnitVectors(downVec, _upperDir);

    // Elbow rotation around local X hinge axis
    elbow.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), elbowBend);

    // Ensure left hand is firmly clamped to target point on the shaft
    hand.parent.updateMatrixWorld(true);
    const localInElbow = hand.parent.worldToLocal(targetWorldPos.clone());
    hand.position.copy(localInElbow);

    // Orient left hand naturally along the handle
    hand.quaternion.copy(elf.rightHand.quaternion);
  }

  // ---------------------------------------------------------------------------
  // 6. Setup Ladder & Ladder Elf (Jingle - Elf 9) on Cottage 2
  // ---------------------------------------------------------------------------
  // Cottage 2 placement: x: -13.6, z: 24.2, d: 2.70, w: 3.45, h: 1.62
  const c2Pos = { x: -13.6, z: 24.2, d: 2.70, w: 3.45, h: 1.62 };
  const sqCenter = (typeof COORDS !== 'undefined' && COORDS.elfVillage)
    ? COORDS.elfVillage.squareCenter
    : { x: -18.0, y: 0, z: 8.5 };
  const c2BaseRotY = Math.atan2(sqCenter.x - c2Pos.x, sqCenter.z - c2Pos.z);
  const c2RotY = c2BaseRotY + (-0.16); // matches elfHouse_2 rotOffset

  const c2Norm = new THREE.Vector2(Math.sin(c2RotY), Math.cos(c2RotY)); // outward normal from facade into yard
  const c2Tangent = new THREE.Vector2(Math.cos(c2RotY), -Math.sin(c2RotY)); // along facade to viewer's right

  // Geometry alignment:
  // - Facade wall plane is at dWall = d/2 = 1.35m from cottage center.
  // - Top rests against dakgoot fascia at dDakgoot = dWall + 0.08m = 1.43m.
  // - Foot stands on getGroundHeight(), ±1 m from the wall: dFoot = dWall + 0.95m = 2.30m (0.95m from wall).
  // - Facade lateral offset: u = -0.70m (clean wall space between front door and left window).
  const dWall = c2Pos.d * 0.5; // 1.35
  const dFoot = dWall + 0.95; // 0.95 m from wall
  const dDakgoot = dWall + 0.08; // dakgoot fascia
  const uFacade = -0.58; // netjes in de open logwand tussen voordeur en linkerraam

  const footX = c2Pos.x + uFacade * c2Tangent.x + dFoot * c2Norm.x;
  const footZ = c2Pos.z + uFacade * c2Tangent.y + dFoot * c2Norm.y;
  const footY = getGroundHeight(footX, footZ);

  const topX = c2Pos.x + uFacade * c2Tangent.x + dDakgoot * c2Norm.x;
  const topZ = c2Pos.z + uFacade * c2Tangent.y + dDakgoot * c2Norm.y;

  const horizDist = Math.hypot(topX - footX, topZ - footZ); // ~0.87m
  const ladderAngleWithGround = 70 * (Math.PI / 180); // exact ±70° angle with ground
  const ladderTiltFromVertical = 20 * (Math.PI / 180); // 90° - 70° = 20°
  const rise = horizDist * Math.tan(ladderAngleWithGround); // ~2.39m
  const ladderRailLen = Math.hypot(horizDist, rise) + 0.14; // ~2.72m, top rests snugly against dakgoot

  const ladder = buildLadder(ladderRailLen, 8);
  ladder.position.set(footX, footY, footZ);
  ladder.rotation.order = 'YXZ';
  ladder.rotation.y = c2RotY + Math.PI; // Face towards cottage wall
  ladder.rotation.x = ladderTiltFromVertical; // Lean top towards wall (+Z in ladder local space)
  ladder.rotation.z = 0;
  rootGroup.add(ladder);

  const ladderElf = elves[9];
  // Elf staat op de 4e sport (1-indexed: 4e sport = index 3, ry = rungHeights[3])
  const rungHeights = ladder.userData.rungHeights;
  const rungRadius = ladder.userData.rungRadius;
  const sport4Y = rungHeights[3];

  ladder.add(ladderElf.root);
  // Elf staat aan de BUITENKANT van de ladder (tussen ladder en camera, z < 0),
  // met zijn voeten op de sport en gezicht naar de muur (+Z).
  ladderElf.root.position.set(0, sport4Y + rungRadius - 0.008, -0.058);
  ladderElf.root.rotation.set(0, 0, 0); // Kijkt recht naar de muur (+Z), meeleunend met de ladder!

  // Beide voeten op dezelfde sport
  ladderElf.leftLeg.rotation.set(0, 0, 0);
  ladderElf.rightLeg.rotation.set(0, 0, 0);

  // Eén hand aan een staander (linkerhand pakt linkerstaander op rx = -0.19)
  ladderElf.leftArm.rotation.set(-0.75, 0.20, -0.32);

  // De andere hand omhoog naar de dakgoot (rechterhand reikt omhoog naar lichtslinger)
  ladderElf.rightArm.rotation.set(-2.60, -0.15, -0.20);
  ladderElf.head.rotation.set(-0.38, 0.12, 0); // Kijkt omhoog naar het werk aan de dakgoot

  // Lichtslinger aan de dakgoot boven de ladder met 3 lampjes die hij ophangt
  const garlandGroup = new THREE.Group();
  garlandGroup.name = 'dakgootLichtslinger';
  ladder.add(garlandGroup);

  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x194d23,
    roughness: 0.65,
    metalness: 0.1
  });
  const wireCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.35, ladderRailLen - 0.32, 0.06),
    new THREE.Vector3(-0.16, ladderRailLen - 0.35, 0.08),
    new THREE.Vector3(0.00, ladderRailLen - 0.38, 0.09),
    new THREE.Vector3(0.16, ladderRailLen - 0.35, 0.08),
    new THREE.Vector3(0.35, ladderRailLen - 0.32, 0.06)
  ]);
  const wireMesh = new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 20, 0.008, 6, false), wireMat);
  wireMesh.castShadow = true;
  garlandGroup.add(wireMesh);

  // 3 lichtslinger lampjes langs de dakgoot: warm goud, smaragdgroen, robijnrood
  const bulbColors = [0xffaa22, 0x33ff66, 0xff2244];
  const bulbPositions = [
    new THREE.Vector3(-0.16, ladderRailLen - 0.35, 0.08),
    new THREE.Vector3(0.00, ladderRailLen - 0.38, 0.09),
    new THREE.Vector3(0.16, ladderRailLen - 0.35, 0.08)
  ];
  const bulbMeshes = [];
  const bulbMaterials = [];
  const socketMat = new THREE.MeshStandardMaterial({ color: 0x223311, roughness: 0.5, metalness: 0.5 });
  const socketGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.024, 8);
  const bulbGeo = new THREE.SphereGeometry(0.032, 10, 8);
  bulbGeo.scale(1.0, 1.35, 1.0);

  bulbPositions.forEach((pos, bi) => {
    const socket = new THREE.Mesh(socketGeo, socketMat);
    socket.position.copy(pos);
    socket.position.y += 0.014;
    garlandGroup.add(socket);

    const bMat = new THREE.MeshStandardMaterial({
      color: bulbColors[bi],
      emissive: bulbColors[bi],
      emissiveIntensity: 0.0,
      roughness: 0.22,
      metalness: 0.08
    });
    const bMesh = new THREE.Mesh(bulbGeo, bMat);
    bMesh.position.copy(pos);
    garlandGroup.add(bMesh);
    bulbMeshes.push(bMesh);
    bulbMaterials.push(bMat);
  });

  // Lampje in de rechterhand van het elfje (dat hij omhoog brengt)
  const handBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffdd44,
    emissive: 0xffaa22,
    emissiveIntensity: 0.0,
    roughness: 0.25,
    metalness: 0.1
  });
  const handBulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), handBulbMat);
  handBulbMesh.position.set(0, -0.05, 0.02);
  ladderElf.rightHand.add(handBulbMesh);

  // Subtiele warme gloed aan de dakgoot wanneer de lampjes branden
  const dakgootLight = new THREE.PointLight(0xffcc66, 0, 3.2, 1.8);
  dakgootLight.position.set(0, ladderRailLen - 0.35, 0.14);
  garlandGroup.add(dakgootLight);

  // Expose state and references for animation
  ladderElf.userData.ladderAnim = {
    rungHeights,
    rungRadius,
    currentRung: 3,        // 4e sport (0-indexed 3)
    targetRung: 4,         // 5e sport (klimt 1 sport hoger)
    bulbsAttached: 0,      // aantal lampjes vastgemaakt op huidige sport (0..3)
    subPhase: 'decorating',// 'decorating' of 'climbing'
    phaseTimer: 0,
    bulbMaterials,
    bulbMeshes,
    bulbColors,
    handBulbMat,
    handBulbMesh,
    dakgootLight,
    bulbPositions
  };

  // ---------------------------------------------------------------------------
  // 7. Setup Hot Choco Stall, Barista (Coco - Elf 10) & Customer (Pip - Elf 11)
  // ---------------------------------------------------------------------------
  const chocoStall = buildHotChocoStall();
  const stallX = -13.6;
  const stallZ = 16.2; // Minstens 6.7 m van de dorpslantaarn op (-11.5, 9.8)
  const stallRotY = -2.35; // Front of stall faces southwest towards village square!
  const stallY = getTerrainHeight(stallX, stallZ);
  chocoStall.group.position.set(stallX, stallY, stallZ);
  chocoStall.group.rotation.y = stallRotY;
  rootGroup.add(chocoStall.group);

  // Coco achter de toog (in kraampjes -Z lokale ruimte op het verhoogde platform)
  const baristaElf = elves[10];
  const baristaLocal = new THREE.Vector3(0.08, 0, -0.52);
  const baristaWorld = chocoStall.group.localToWorld(baristaLocal.clone());
  baristaWorld.y = stallY + 0.30;
  baristaElf.root.position.copy(baristaWorld);
  baristaElf.root.rotation.y = stallRotY; // Kijkt over de toog naar voren (+Z)
  baristaElf.rightHand.add(chocoStall.pouringKan);

  // Pip wachtend vóór het kraampje (in kraampjes +Z lokale ruimte op het plein)
  const customerElf = elves[11];
  const customerLocal = new THREE.Vector3(0.15, 0, 0.95);
  const customerWorld = chocoStall.group.localToWorld(customerLocal.clone());
  customerWorld.y = getTerrainHeight(customerWorld.x, customerWorld.z);
  customerElf.root.position.copy(customerWorld);
  customerElf.root.rotation.y = stallRotY + Math.PI; // Kijkt over de toog naar Coco (-Z)

  // Steam particle system rising from kettle & mugs
  const STEAM_COUNT = 36;
  const steamGeo = new THREE.BufferGeometry();
  const steamPositions = new Float32Array(STEAM_COUNT * 3);
  const steamAges = new Float32Array(STEAM_COUNT);
  const steamSourceIdx = new Int8Array(STEAM_COUNT); // 0=kettle, 1,2,3=mugs

  for (let i = 0; i < STEAM_COUNT; i++) {
    steamAges[i] = Math.random() * 2.2;
    steamSourceIdx[i] = i % 4;
    steamPositions[i * 3] = stallX;
    steamPositions[i * 3 + 1] = stallY + 1.1;
    steamPositions[i * 3 + 2] = stallZ;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
  const steamMat = new THREE.PointsMaterial({
    color: 0xf5f8fc,
    size: 0.085,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });
  const steamPoints = new THREE.Points(steamGeo, steamMat);
  steamPoints.frustumCulled = false;
  rootGroup.add(steamPoints);

  // ---------------------------------------------------------------------------
  // 8. Setup Completed Village Snowman on Opposite Side of Square (-23.5, 7.2)
  // ---------------------------------------------------------------------------
  const miniSmX = -23.5;
  const miniSmZ = 7.2;
  const miniSmY = getTerrainHeight(miniSmX, miniSmZ);

  const villageSnowman = buildVillageSnowman(sharedMaterials, snowBumpTex);
  villageSnowman.group.position.set(miniSmX, miniSmY, miniSmZ);
  villageSnowman.group.rotation.y = 0.95; // Georiënteerd naar het dorpsplein
  rootGroup.add(villageSnowman.group);

  let snowmanWobbleTimer = 0;

  // ---------------------------------------------------------------------------
  // 9. Register Clickable Interactions & Sound Effects
  // ---------------------------------------------------------------------------
  const jumpTimers = new Float32Array(elves.length);

  if (interaction) {
    elves.forEach((elf, idx) => {
      const glowMeshes = [];
      elf.root.traverse((child) => {
        if (
          child.isMesh &&
          child.material !== sharedMaterials.skin &&
          child.material !== sharedMaterials.rosyCheek &&
          child.material !== sharedMaterials.darkEye
        ) {
          glowMeshes.push(child);
        }
      });

      interaction.registerClickable(elf.root, {
        id: elf.config.id,
        label: elf.config.label,
        glowMeshes,
        focusTarget: () => {
          const wp = new THREE.Vector3();
          elf.root.getWorldPosition(wp);
          return wp.add(new THREE.Vector3(0, 0.48, 0));
        },
        focusDistance: 2.3,
        focusHeightOffset: 0.25,
        onClick: () => {
          jumpTimers[idx] = 1.2;
          const tipPos = new THREE.Vector3();
          elf.root.getWorldPosition(tipPos);
          tipPos.y += 0.98;
          interaction.showTooltip(elf.config.quote, tipPos, 3.5);

          if (audio && (typeof audio.isEnabled !== 'function' || audio.isEnabled())) {
            if (typeof audio.playElfBell === 'function') {
              audio.playElfBell();
            } else if (typeof audio.playChime === 'function') {
              audio.playChime(1.75);
            }
          }
        }
      });
    });

    // Snowman interaction
    const snowmanGlowMeshes = [];
    villageSnowman.group.traverse((c) => {
      if (c.isMesh) snowmanGlowMeshes.push(c);
    });

    interaction.registerClickable(villageSnowman.group, {
      id: 'village_snowman',
      label: 'Dorpssneeuwpop ⛄ (Klik om te wiebelen)',
      glowMeshes: snowmanGlowMeshes,
      focusTarget: new THREE.Vector3(miniSmX, miniSmY + 0.95, miniSmZ),
      focusDistance: 3.2,
      focusHeightOffset: 0.35,
      onClick: () => {
        snowmanWobbleTimer = 1.8;
        interaction.showTooltip(
          'Brrr, wat een fijne vrieskou! Gebouwd door Noel en Bramble! ⛄❄️',
          new THREE.Vector3(miniSmX, miniSmY + 1.95, miniSmZ),
          3.5
        );
        if (audio && typeof audio.playChime === 'function') audio.playChime(1.4);
      }
    });

    // Choco stall interaction
    const stallGlowMeshes = [];
    chocoStall.group.traverse((c) => {
      if (c.isMesh) stallGlowMeshes.push(c);
    });

    interaction.registerClickable(chocoStall.group, {
      id: 'choco_stall',
      label: 'Warme Chocomelkkraam ☕🍫',
      glowMeshes: stallGlowMeshes,
      focusTarget: new THREE.Vector3(stallX, stallY + 1.1, stallZ),
      focusDistance: 3.2,
      focusHeightOffset: 0.35,
      onClick: () => {
        interaction.showTooltip(
          'Warme chocolademelk met marshmallows! Vers ingeschonken door Coco! ☕🍫',
          new THREE.Vector3(stallX, stallY + 1.9, stallZ),
          3.5
        );
        if (audio && typeof audio.playElfBell === 'function') audio.playElfBell();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Contact Shadows for all 10 Elves, Village Snowman & Sled
  // ---------------------------------------------------------------------------
  const elfShadows = elves.map((elf) => {
    const s = createContactShadow({ radiusX: 0.28, radiusZ: 0.24, opacity: 0.60 });
    rootGroup.add(s.mesh);
    return s;
  });

  const snowmanShadow = createContactShadow({ radiusX: 0.68, radiusZ: 0.68, opacity: 0.70 });
  rootGroup.add(snowmanShadow.mesh);
  snowmanShadow.update(miniSmX, miniSmZ, miniSmY, 0, 0.95);

  const sledShadow = createContactShadow({ radiusX: 0.50, radiusZ: 0.82, opacity: 0.62 });
  rootGroup.add(sledShadow.mesh);
  sledShadow.update(initSledPos.x, initSledPos.z, initSledY, 0, giftSled.rotation.y);

  // Ensure every elf, snowman, prop, and tool recursively casts and receives shadows
  rootGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // ---------------------------------------------------------------------------
  // 11. Animation Loop
  // ---------------------------------------------------------------------------
  const tempCurvePos = new THREE.Vector3();
  const tempCurveTangent = new THREE.Vector3();
  const tempCurveNormal = new THREE.Vector3();
  const debugPose = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('pose') : null;
  const ladderElfWorldPos = new THREE.Vector3();
  const kettleWorld = new THREE.Vector3();
  chocoStall.group.updateMatrixWorld(true);
  chocoStall.group.localToWorld(kettleWorld.set(-0.52, 1.25, -0.05));
  const mugWorldPositions = [
    kettleWorld,
    chocoStall.group.localToWorld(new THREE.Vector3(0.15, 0.98, 0.12)),
    chocoStall.group.localToWorld(new THREE.Vector3(0.36, 0.98, 0.08)),
    chocoStall.group.localToWorld(new THREE.Vector3(-0.15, 0.98, 0.15))
  ];
  let woodchopperTime = 0;
  let chopCount = 0;
  let chopImpactTriggered = false;

  function update(delta, elapsed) {
    // --- A. Animate Walking Elves along Shared Snowy Path (Pippin & Trixie) ---
    // 1. Advance each elf along the curve with natural speed variation & pauses
    walkers.forEach((w, idx) => {
      if (w.pauseTimer > 0) {
        w.pauseTimer -= delta;
        w.elf.leftLeg.rotation.x = 0;
        w.elf.rightLeg.rotation.x = 0;
        w.elf.leftArm.rotation.x = Math.sin(elapsed * 1.8 + idx) * 0.08;
        w.elf.rightArm.rotation.x = -Math.sin(elapsed * 1.8 + idx) * 0.08;
        w.elf.charGroup.rotation.x = 0;
        w.elf.charGroup.rotation.z = 0;
      } else {
        const speedVar =
          1.0 +
          0.14 * Math.sin(elapsed * 1.7 + idx * 3.1) +
          0.06 * Math.sin(elapsed * 3.5 + idx);
        w.progress += w.direction * w.baseSpeed * speedVar * delta;

        if (w.progress >= 0.96) {
          w.progress = 0.96;
          w.direction = -1;
          w.pauseTimer = 1.8 + (idx === 0 ? 0.5 : 0.0);
        } else if (w.progress <= 0.04) {
          w.progress = 0.04;
          w.direction = 1;
          w.pauseTimer = 1.8 + (idx === 1 ? 0.5 : 0.0);
        }
      }

      // Compute nominal path position and tangent
      pathCurve.getPointAt(w.progress, tempCurvePos);
      pathCurve.getTangentAt(w.progress, tempCurveTangent);
      tempCurveNormal.set(-tempCurveTangent.z, 0, tempCurveTangent.x).normalize();

      // Gentle lateral deviation so they don't look locked to a rail
      const wander =
        Math.sin(w.progress * Math.PI * 6.0 + w.lateralPhase) * 0.14 +
        Math.sin(elapsed * 0.8 + idx * 2.0) * 0.05;
      const latOffset = w.lateralOffsetBias + wander;

      w.nomX = tempCurvePos.x + tempCurveNormal.x * latOffset;
      w.nomZ = tempCurvePos.z + tempCurveNormal.z * latOffset;
      w.moveDir.copy(w.direction === 1 ? tempCurveTangent : tempCurveTangent.clone().negate());
    });

    // 2. Mutual elf avoidance when crossing each other
    const mutualAvoid = calculateElfAvoidance(
      { x: walkers[0].nomX, z: walkers[0].nomZ },
      { x: walkers[1].nomX, z: walkers[1].nomZ },
      ELF_RADIUS,
      0.72
    );

    // 3. Resolve steering, obstacle avoidance & realistic walking gait for both elves
    walkers.forEach((w, idx) => {
      const mutualSteer = idx === 0 ? mutualAvoid.steerA : mutualAvoid.steerB;

      // Obstacle avoidance steering against all static world obstacles
      const staticSteer = calculateAvoidanceSteering(
        w.nomX + mutualSteer.x,
        w.nomZ + mutualSteer.z,
        w.moveDir.x,
        w.moveDir.z,
        ELF_RADIUS,
        0.45
      );

      const totalSteerX = mutualSteer.x + staticSteer.x;
      const totalSteerZ = mutualSteer.z + staticSteer.z;

      const resolved = resolveCollision(
        w.nomX + totalSteerX,
        w.nomZ + totalSteerZ,
        ELF_RADIUS,
        0.04
      );

      const groundY = getTerrainHeight(resolved.x, resolved.z);
      const isWalking = w.pauseTimer <= 0;
      const hopPhase = elapsed * 10.5 + idx * 2.8;
      const hopY = isWalking ? Math.abs(Math.sin(hopPhase)) * 0.055 : 0;

      w.elf.root.position.set(resolved.x, groundY + hopY, resolved.z);

      // Elves face their walking direction with smooth steering response
      const targetHeading = Math.atan2(
        w.moveDir.x + totalSteerX * 0.5,
        w.moveDir.z + totalSteerZ * 0.5
      );
      w.elf.root.rotation.y = targetHeading;

      // Contact shadow follows walking elf on the snow and contracts during hops & jumps
      const jumpHop = jumpTimers[idx] > 0 ? w.elf.charGroup.position.y : 0;
      elfShadows[idx].update(resolved.x, resolved.z, groundY, hopY + jumpHop, targetHeading);

      if (isWalking) {
        w.elf.charGroup.rotation.x = 0.08; // Energetic slight forward lean
        w.elf.charGroup.rotation.z = Math.sin(hopPhase) * 0.035;

        // Joyful opposite arm and leg swings
        const legSwing = Math.sin(hopPhase) * 0.48;
        w.elf.leftLeg.rotation.x = legSwing;
        w.elf.rightLeg.rotation.x = -legSwing;

        w.elf.leftArm.rotation.x = -legSwing * 0.70;
        w.elf.rightArm.rotation.x = legSwing * 0.70;
        w.elf.leftArm.rotation.z = -0.12;
        w.elf.rightArm.rotation.z = 0.12;
      }
    });

    // Animate Gift Sled following Carrier Elf Pippin along the path curve
    const carrier = walkers[0];
    const sledDistOffset = carrier.direction === 1 ? -0.045 : 0.045;
    const sledProgress = Math.max(0.02, Math.min(0.98, carrier.progress + sledDistOffset));
    pathCurve.getPointAt(sledProgress, tempCurvePos);
    pathCurve.getTangentAt(sledProgress, tempCurveTangent);
    const sledGroundY = getGroundHeight(tempCurvePos.x, tempCurvePos.z);
    giftSled.position.set(tempCurvePos.x, sledGroundY, tempCurvePos.z);
    const sledHeading = Math.atan2(
      tempCurveTangent.x * carrier.direction,
      tempCurveTangent.z * carrier.direction
    );
    giftSled.rotation.set(0, sledHeading, 0);
    sledShadow.update(tempCurvePos.x, tempCurvePos.z, sledGroundY, 0, sledHeading);

    // --- B. Animate Snowball Fight Behind Snow Walls (Bramble & Noel) ---
    const elf3 = elves[2]; // Bramble
    const elf4 = elves[3]; // Noel
    const thrower = activeThrowerIndex === 0 ? elf3 : elf4;
    const target = activeThrowerIndex === 0 ? elf4 : elf3;

    // Check optional URL parameter for diagnostic inspection / screenshots (e.g. ?pose=throw)
    if (debugPose === 'throw') {
      // Freeze exactly at the dramatic forward throw release:
      // Thrower Bramble: standing upright behind wall, opposite leg stepped forward, throwing arm whipped forward with elbow snap!
      thrower.charGroup.position.y = 0.0;
      thrower.torso.position.set(0, 0.28, 0);
      thrower.head.position.set(0, 0.48, 0);
      thrower.torso.rotation.x = 0.28;
      thrower.torso.rotation.y = 0.48;
      thrower.head.rotation.set(-0.15, 0.35, 0);
      thrower.leftLeg.position.z = 0.10;
      thrower.leftLeg.rotation.x = -0.42;
      thrower.rightLeg.position.z = -0.08;
      thrower.rightLeg.rotation.x = 0.38;
      thrower.leftArm.rotation.set(-0.75, 0, -0.35);
      thrower.leftElbow.rotation.set(-0.35, 0, 0);
      thrower.rightArm.rotation.set(1.48, -0.25, 0.22);
      thrower.rightElbow.rotation.set(0.15, 0, 0);
      thrower.hatTipGroup.rotation.x = 0.45;
      thrower.heldSnowball.visible = false;

      // Snowball flying in mid-air in a high parabola between the two snow walls!
      const midPoint = new THREE.Vector3().lerpVectors(elfBramblePos, elfNoelPos, 0.28);
      midPoint.y += 1.95 * 4.0 * 0.28 * (1.0 - 0.28) + 0.82;
      flyingSnowball.position.copy(midPoint);
      flyingSnowball.visible = true;

      // Target Noel: ducking down behind his 70cm curved snow wall, arms guarding head!
      target.charGroup.position.y = -0.26;
      target.torso.position.set(0, 0.28, 0);
      target.head.position.set(0, 0.48, 0);
      target.torso.rotation.x = 0.35;
      target.head.rotation.x = -0.30;
      target.leftArm.rotation.set(0.85, 0, -0.45);
      target.rightArm.rotation.set(0.85, 0, 0.45);
      target.leftElbow.rotation.set(-0.75, 0, 0);
      target.rightElbow.rotation.set(-0.75, 0, 0);
      target.leftLeg.rotation.x = -0.30;
      target.rightLeg.rotation.x = -0.30;
    } else if (debugPose === 'windup') {
      // Freeze at the windup pose: thrower's arm cocked far behind head, left leg forward
      thrower.charGroup.position.y = 0.0;
      thrower.torso.position.set(0, 0.28, 0);
      thrower.head.position.set(0, 0.48, 0);
      thrower.torso.rotation.x = -0.14;
      thrower.torso.rotation.y = -0.50;
      thrower.leftLeg.position.z = 0.09;
      thrower.leftLeg.rotation.x = -0.46;
      thrower.rightLeg.position.z = -0.07;
      thrower.rightLeg.rotation.x = 0.38;
      thrower.leftArm.rotation.set(0.85, 0, -0.35);
      thrower.leftElbow.rotation.set(-0.25, 0, 0);
      thrower.rightArm.rotation.set(-2.25, 0.28, 0.45);
      thrower.rightElbow.rotation.set(-1.30, 0, 0.20);
      thrower.head.rotation.set(-0.10, 0.46, 0);
      thrower.heldSnowball.visible = true;
      thrower.heldSnowball.scale.set(1, 1, 1);
      flyingSnowball.visible = false;

      // Target alert behind wall
      target.charGroup.position.y = 0.0;
      target.torso.position.set(0, 0.28, 0);
      target.head.position.set(0, 0.48, 0);
      target.leftArm.rotation.set(0.32, 0, -0.12);
      target.rightArm.rotation.set(0.32, 0, 0.12);
      target.leftElbow.rotation.set(-0.35, 0, 0);
      target.rightElbow.rotation.set(-0.35, 0, 0);
    } else {
      // Continuous realistic turn-based snowball fight animation
      fightTimer += delta;

      switch (fightState) {
        case FIGHT_PAUSE: {
          // Both elves peek over their 70cm curved snow walls with natural breathing
          const idleP = elapsed * 2.8;
          [elf3, elf4].forEach((elf, idx) => {
            const breath = Math.sin(idleP + idx * 1.5) * 0.012;
            elf.charGroup.position.y = 0;
            elf.torso.position.set(0, 0.28 + breath, 0);
            elf.torso.rotation.set(0, 0, 0);
            elf.charGroup.rotation.set(0, 0, 0);
            elf.head.position.set(0, 0.48, 0);
            elf.head.rotation.set(0, Math.sin(elapsed * 1.8 + idx * 2.0) * 0.08, 0);
            elf.hatTipGroup.rotation.set(-0.55, 0, (elf.config.hatTilt || 1) * 0.45);
            elf.leftLeg.position.set(-0.062, 0.28, 0);
            elf.rightLeg.position.set(0.062, 0.28, 0);
            elf.leftLeg.rotation.set(0, 0, 0);
            elf.rightLeg.rotation.set(0, 0, 0);
            // Rest hands naturally on top edge of snow wall
            elf.leftArm.rotation.set(0.32, 0, -0.12);
            elf.rightArm.rotation.set(0.32, 0, 0.12);
            elf.leftElbow.rotation.set(-0.35, 0, 0);
            elf.rightElbow.rotation.set(-0.35, 0, 0);
            if (elf.heldSnowball) elf.heldSnowball.visible = false;
          });
          flyingSnowball.visible = false;

          if (fightTimer >= pauseDuration) {
            fightState = FIGHT_SCOOP;
            fightTimer = 0;
          }
          break;
        }

        case FIGHT_SCOOP: {
          // Bukken achter de muur → sneeuw scheppen met twee handen
          const SCOOP_DUR = 0.95;
          const p = Math.min(1, fightTimer / SCOOP_DUR);
          const wave = Math.sin(p * Math.PI);
          const crouch = Math.sin(p * Math.PI * 0.5);

          // Thrower drops down behind the 70cm curved snow wall
          thrower.charGroup.position.y = -0.04 * crouch;
          thrower.torso.position.set(0, 0.28, 0);
          thrower.head.position.set(0, 0.48, 0);
          thrower.torso.rotation.x = 0.45 * crouch;
          thrower.charGroup.rotation.x = 0.08 * wave;
          thrower.head.rotation.x = 0.35 * crouch;

          // Both arms plunge down into snow, elbows bend, and scoop snow upward towards chest
          thrower.leftArm.rotation.x = 0.32 + wave * 0.85;
          thrower.rightArm.rotation.x = 0.32 + wave * 0.85;
          thrower.leftArm.rotation.z = -0.12 - wave * 0.22;
          thrower.rightArm.rotation.z = 0.12 + wave * 0.22;
          thrower.leftElbow.rotation.x = -0.35 - wave * 0.65;
          thrower.rightElbow.rotation.x = -0.35 - wave * 0.65;

          // Deep crouch in knees
          thrower.leftLeg.rotation.x = -0.32 * crouch;
          thrower.rightLeg.rotation.x = -0.32 * crouch;

          // Target watches alertly behind their wall
          target.charGroup.position.y = 0;
          target.torso.position.set(0, 0.28 + Math.sin(elapsed * 2.8) * 0.012, 0);
          target.head.position.set(0, 0.48, 0);
          target.torso.rotation.set(0, 0, 0);
          target.head.rotation.set(0, Math.sin(elapsed * 1.5) * 0.08, 0);
          target.leftArm.rotation.set(0.32, 0, -0.12);
          target.rightArm.rotation.set(0.32, 0, 0.12);
          target.leftElbow.rotation.set(-0.35, 0, 0);
          target.rightElbow.rotation.set(-0.35, 0, 0);

          if (fightTimer >= SCOOP_DUR) {
            fightState = FIGHT_KNEAD;
            fightTimer = 0;
          }
          break;
        }

        case FIGHT_KNEAD: {
          // Bal kneden: handen draaien rond elkaar voor de borst, sneeuwbal vormt zich
          const KNEAD_DUR = 1.25;
          const p = Math.min(1, fightTimer / KNEAD_DUR);
          const kneadAngle = p * Math.PI * 6.0; // 3 complete kneading cycles

          // Thrower stays behind wall
          thrower.charGroup.position.y = -0.04;
          thrower.torso.position.set(0, 0.28, 0);
          thrower.head.position.set(0, 0.48, 0);
          thrower.torso.rotation.x = 0.25;
          thrower.head.rotation.x = 0.24;
          thrower.head.rotation.y = Math.sin(kneadAngle) * 0.08;
          thrower.hatTipGroup.rotation.z = (thrower.config.hatTilt || 1) * (0.45 + Math.sin(kneadAngle) * 0.14);

          // Shoulders inward in front of chest
          thrower.leftArm.rotation.set(0.15, 0.30, -0.25);
          thrower.rightArm.rotation.set(0.15, -0.30, 0.25);

          // Elbows bent at ~90 degrees, forearms cycling around each other
          thrower.leftElbow.rotation.x = -1.15 + Math.sin(kneadAngle) * 0.22;
          thrower.rightElbow.rotation.x = -1.15 - Math.sin(kneadAngle) * 0.22;
          thrower.leftElbow.rotation.z = Math.cos(kneadAngle) * 0.18;
          thrower.rightElbow.rotation.z = -Math.cos(kneadAngle) * 0.18;

          // Snowball appears and forms between the hands
          if (p >= 0.30) {
            thrower.heldSnowball.visible = true;
            const sz = THREE.MathUtils.lerp(0.25, 1.0, Math.min(1, (p - 0.30) / 0.50));
            thrower.heldSnowball.scale.set(sz, sz, sz);
          }

          // Target watches across the snow field
          target.charGroup.position.y = 0;
          target.torso.position.set(0, 0.28 + Math.sin(elapsed * 2.8) * 0.012, 0);
          target.head.position.set(0, 0.48, 0);
          target.leftArm.rotation.set(0.32, 0, -0.12);
          target.rightArm.rotation.set(0.32, 0, 0.12);
          target.leftElbow.rotation.set(-0.35, 0, 0);
          target.rightElbow.rotation.set(-0.35, 0, 0);

          if (fightTimer >= KNEAD_DUR) {
            fightState = FIGHT_THROW;
            fightTimer = 0;
            ballLaunched = false;
          }
          break;
        }

        case FIGHT_THROW: {
          // Opkomen → gooiarm van achter het hoofd naar voren, tegengesteld been stapt mee → loslaten
          const THROW_DUR = 0.90;
          const p = Math.min(1, fightTimer / THROW_DUR);

          if (p < 0.48) {
            // Sub-fase A: Opkomen & Windup achter het hoofd
            const wp = p / 0.48;
            const easeW = wp * wp * (3 - 2 * wp);

            // Opkomen: torso komt omhoog boven de muur
            thrower.charGroup.position.y = THREE.MathUtils.lerp(-0.04, 0.0, easeW);
            thrower.torso.position.set(0, 0.28, 0);
            thrower.head.position.set(0, 0.48, 0);
            thrower.torso.rotation.x = THREE.MathUtils.lerp(0.25, -0.12, easeW);
            thrower.torso.rotation.y = -0.50 * easeW; // Torso draait weg in de windup

            // Tegengesteld been (linkerbeen) stapt krachtig mee naar voren, rechterbeen zet af
            thrower.leftLeg.rotation.x = -0.46 * easeW;
            thrower.leftLeg.position.z = 0.09 * easeW;
            thrower.rightLeg.rotation.x = 0.38 * easeW;
            thrower.rightLeg.position.z = -0.07 * easeW;

            // Niet-gooiarm (linkerarm) wijst naar voren richting doel
            thrower.leftArm.rotation.set(0.85 * easeW, 0, -0.35 * easeW);
            thrower.leftElbow.rotation.set(-0.25 * easeW, 0, 0);

            // Gooiarm (rechterarm via schouder- én elleboogpivot) zwaait ver achter het hoofd
            thrower.rightArm.rotation.x = THREE.MathUtils.lerp(0.15, -2.25, easeW);
            thrower.rightArm.rotation.z = THREE.MathUtils.lerp(0.28, 0.45, easeW);
            thrower.rightArm.rotation.y = 0.28 * easeW;
            thrower.rightElbow.rotation.x = THREE.MathUtils.lerp(-1.15, -1.30, easeW);
            thrower.rightElbow.rotation.z = 0.20 * easeW;

            // Gezicht blijft gericht op de tegenstander
            thrower.head.rotation.y = 0.46 * easeW;
            thrower.head.rotation.x = -0.10;

            thrower.heldSnowball.visible = true;
            thrower.heldSnowball.scale.set(1, 1, 1);
          } else {
            // Sub-fase B: Krachtige whip van achter het hoofd naar voren & loslaten
            const tp = (p - 0.48) / 0.52;
            const whip = Math.min(1, tp / 0.38); // Zeer snelle, explosieve gooiwhip
            const follow = Math.max(0, (tp - 0.38) / 0.62);

            // Gooiarm zwaait van achter het hoofd naar voren, elleboog strekt door
            thrower.charGroup.position.y = 0.0;
            thrower.torso.position.set(0, 0.28, 0);
            thrower.head.position.set(0, 0.48, 0);
            thrower.rightArm.rotation.x = THREE.MathUtils.lerp(-2.25, 1.35, whip) - follow * 0.45;
            thrower.rightArm.rotation.z = THREE.MathUtils.lerp(0.45, 0.12, whip);
            thrower.rightArm.rotation.y = THREE.MathUtils.lerp(0.28, -0.22, whip);
            thrower.rightElbow.rotation.x = THREE.MathUtils.lerp(-1.30, 0.05, whip);

            // Torso draait dynamisch mee in de worp
            thrower.torso.rotation.y = THREE.MathUtils.lerp(-0.50, 0.54, whip) - follow * 0.20;
            thrower.torso.rotation.x = THREE.MathUtils.lerp(-0.12, 0.35, whip);

            // Benen vangen de worp op
            thrower.leftLeg.rotation.x = -0.46 + follow * 0.25;
            thrower.rightLeg.rotation.x = 0.38 + whip * 0.25 - follow * 0.32;

            // Linkerarm trekt terug
            thrower.leftArm.rotation.x = THREE.MathUtils.lerp(0.85, -0.65, whip);
            thrower.hatTipGroup.rotation.x = THREE.MathUtils.lerp(-0.55, 0.35, whip);

            // Loslaten van de sneeuwbal bij het voorste punt van de armzwaai
            if (whip >= 0.42 && !ballLaunched) {
              ballLaunched = true;
              thrower.heldSnowball.visible = false;

              // Lanceerpositie vanaf de gooiende hand
              thrower.rightHand.getWorldPosition(flightStartPos);

              // Treffer vs. Misser (ongeveer 65% treffer, 35% misser)
              isCurrentHit = Math.random() < 0.65;

              if (isCurrentHit) {
                target.head.getWorldPosition(flightEndPos);
                flightEndPos.y += (Math.random() - 0.5) * 0.08;
                flightEndPos.x += (Math.random() - 0.5) * 0.08;
                flightEndPos.z += (Math.random() - 0.5) * 0.08;
              } else {
                target.root.getWorldPosition(flightEndPos);
                const dirOpp = new THREE.Vector3().subVectors(target.root.position, thrower.root.position).normalize();
                const sideOffset = (Math.random() > 0.5 ? 1 : -1) * (0.85 + Math.random() * 0.50);
                const perp = new THREE.Vector3(-dirOpp.z, 0, dirOpp.x).multiplyScalar(sideOffset);
                flightEndPos.add(perp);
                flightEndPos.addScaledVector(dirOpp, 0.90 + Math.random() * 0.50);
                flightEndPos.y = getTerrainHeight(flightEndPos.x, flightEndPos.z) + 0.04;
              }

              flyingSnowball.position.copy(flightStartPos);
              flyingSnowball.visible = true;
            }
          }

          if (fightTimer >= THROW_DUR) {
            fightState = FIGHT_FLIGHT;
            fightTimer = 0;
          }
          break;
        }

        case FIGHT_FLIGHT: {
          // Parabolische vlucht over ±8 m; doelwit duikt weg achter het muurtje
          const FLIGHT_DUR = 0.85;
          const tau = Math.min(1, fightTimer / FLIGHT_DUR);

          // Parabolische ballistische boog (hoogtepunt ~ 1.95 m)
          flyingSnowball.position.lerpVectors(flightStartPos, flightEndPos, tau);
          flyingSnowball.position.y += 4.0 * 1.95 * tau * (1.0 - tau);
          flyingSnowball.rotation.x += delta * 15.0;
          flyingSnowball.rotation.y += delta * 10.0;

          // Gooier keert rustig terug naar startpositie
          const settle = Math.min(1, fightTimer / 0.42);
          thrower.charGroup.position.y = 0.0;
          thrower.torso.position.set(0, 0.28, 0);
          thrower.head.position.set(0, 0.48, 0);
          thrower.torso.rotation.x = THREE.MathUtils.lerp(0.35, 0.05, settle);
          thrower.torso.rotation.y = THREE.MathUtils.lerp(0.34, 0.0, settle);
          thrower.rightArm.rotation.x = THREE.MathUtils.lerp(1.35, 0.32, settle);
          thrower.leftArm.rotation.x = THREE.MathUtils.lerp(-0.65, 0.32, settle);
          thrower.rightElbow.rotation.x = THREE.MathUtils.lerp(0.05, -0.35, settle);
          thrower.leftElbow.rotation.x = THREE.MathUtils.lerp(-0.25, -0.35, settle);
          thrower.leftLeg.rotation.x = THREE.MathUtils.lerp(-0.46, 0.0, settle);
          thrower.rightLeg.rotation.x = THREE.MathUtils.lerp(0.38, 0.0, settle);
          thrower.leftLeg.position.z = THREE.MathUtils.lerp(0.09, 0.0, settle);
          thrower.rightLeg.position.z = THREE.MathUtils.lerp(-0.07, 0.0, settle);

          // Tegenstander ziet de sneeuwbal aankomen en duikt weg achter zijn eigen muurtje!
          if (tau > 0.22) {
            const duckT = Math.min(1, (tau - 0.22) / 0.32);
            target.charGroup.position.y = THREE.MathUtils.lerp(0.0, -0.26, duckT);
            target.torso.position.set(0, 0.28, 0);
            target.head.position.set(0, 0.48, 0);
            target.torso.rotation.x = THREE.MathUtils.lerp(0, 0.35, duckT);
            target.head.rotation.x = THREE.MathUtils.lerp(0, -0.30, duckT);
            target.leftArm.rotation.set(0.85 * duckT, 0, -0.45 * duckT);
            target.rightArm.rotation.set(0.85 * duckT, 0, 0.45 * duckT);
            target.leftElbow.rotation.set(-0.75 * duckT, 0, 0);
            target.rightElbow.rotation.set(-0.75 * duckT, 0, 0);
            target.leftLeg.rotation.x = -0.30 * duckT;
            target.rightLeg.rotation.x = -0.30 * duckT;
          }

          if (fightTimer >= FLIGHT_DUR) {
            fightState = FIGHT_IMPACT;
            fightTimer = 0;
            hatDustTriggered = false;
            flyingSnowball.visible = false;

            if (isCurrentHit) {
              triggerHitBurst(flightEndPos);
              if (audio && typeof audio.playElfBell === 'function') audio.playElfBell();
            } else {
              triggerGroundPlof(flightEndPos);
            }
          }
          break;
        }

        case FIGHT_IMPACT: {
          const IMPACT_DUR = 1.50;
          const p = Math.min(1, fightTimer / IMPACT_DUR);

          if (isCurrentHit) {
            // Treffer: sneeuwspat (deeltjes), het andere elfje wankelt en schudt zijn muts
            if (fightTimer < 0.45) {
              // Sub-fase 1: Wankelen (recoil & wankeling door de impact)
              const wp = fightTimer / 0.45;
              const wave = Math.sin(wp * Math.PI);
              target.charGroup.position.y = -0.20 + wave * 0.08;
              target.torso.position.set(0, 0.28, 0);
              target.head.position.set(0, 0.48, 0);
              target.torso.rotation.x = -0.35 * wave;
              target.torso.rotation.z = 0.32 * wave;
              target.head.rotation.x = -0.28 * wave;
              target.leftArm.rotation.z = -1.05 * wave;
              target.rightArm.rotation.z = 1.05 * wave;
              target.leftElbow.rotation.x = -0.55 * wave;
              target.rightElbow.rotation.x = -0.55 * wave;
            } else {
              // Sub-fase 2: Schudt zijn muts (krachtig hoofdschudden van links naar rechts met stuifsneeuw)
              const st = fightTimer - 0.45;
              const decay = Math.max(0, 1 - st / 0.85);
              const shake = Math.sin(st * 28.0) * decay;

              target.charGroup.position.y = THREE.MathUtils.lerp(-0.20, 0.0, 1 - decay);
              target.torso.position.set(0, 0.28, 0);
              target.head.position.set(0, 0.48, 0);
              target.head.rotation.y = shake * 0.52;
              target.head.rotation.x = -0.08 + decay * 0.12;
              target.hatTipGroup.rotation.z = (target.config.hatTilt || 1) * 0.45 + shake * 0.46;
              target.torso.rotation.z = Math.sin(st * 14.0) * 0.10 * decay;
              target.leftArm.rotation.set(0.32, 0, -0.12);
              target.rightArm.rotation.set(0.32, 0, 0.12);
              target.leftElbow.rotation.set(-0.35, 0, 0);
              target.rightElbow.rotation.set(-0.35, 0, 0);

              if (st > 0.08 && !hatDustTriggered) {
                hatDustTriggered = true;
                const hPos = new THREE.Vector3();
                target.head.getWorldPosition(hPos);
                hPos.y += 0.22;
                triggerHatSnowDust(hPos);
              }
            }

            // Gooier viert de treffer met een vrolijk hupje
            if (fightTimer > 0.30) {
              thrower.charGroup.position.y = Math.abs(Math.sin((fightTimer - 0.30) * 12.0)) * 0.08;
              thrower.head.rotation.x = -0.15;
              thrower.leftArm.rotation.x = -0.75;
              thrower.rightArm.rotation.x = -0.75;
            }
          } else {
            // Misser: plof in de sneeuw, elf komt opgelucht overeind en veegt voorhoofd af
            const peek = Math.min(1, fightTimer / 0.55);
            target.charGroup.position.y = THREE.MathUtils.lerp(-0.26, 0.0, peek);
            target.torso.position.set(0, 0.28, 0);
            target.head.position.set(0, 0.48, 0);
            target.head.rotation.x = THREE.MathUtils.lerp(-0.30, 0.0, peek);
            target.head.rotation.y = Math.sin(fightTimer * 3.5) * 0.25;
            target.rightArm.rotation.x = -1.1 * Math.sin(Math.min(1, fightTimer / 0.70) * Math.PI);
            target.rightElbow.rotation.x = -0.9 * Math.sin(Math.min(1, fightTimer / 0.70) * Math.PI);
            target.leftArm.rotation.set(0.32, 0, -0.12);
            target.leftElbow.rotation.set(-0.35, 0, 0);

            // Gooier haalt schouders op
            const shrug = Math.sin(Math.min(1, fightTimer / 0.85) * Math.PI);
            thrower.leftArm.rotation.x = -0.45 * shrug;
            thrower.rightArm.rotation.x = -0.45 * shrug;
            thrower.head.rotation.x = 0.15 * shrug;
          }

          if (fightTimer >= IMPACT_DUR) {
            fightState = FIGHT_PAUSE;
            fightTimer = 0;
            activeThrowerIndex = 1 - activeThrowerIndex; // Beurt wisselt om naar de andere gooier!
            pauseDuration = 1.2 + Math.random() * 1.5;   // Rustpauze tussen beurten
          }
          break;
        }
      }
    }

    // Contact shadows for snowball fight elves
    const jumpHop2 = jumpTimers[2] > 0 ? elf3.charGroup.position.y : 0;
    elfShadows[2].update(elfBramblePos.x, elfBramblePos.z, elfBramblePos.y, jumpHop2, elf3.root.rotation.y);
    const jumpHop3 = jumpTimers[3] > 0 ? elf4.charGroup.position.y : 0;
    elfShadows[3].update(elfNoelPos.x, elfNoelPos.z, elfNoelPos.y, jumpHop3, elf4.root.rotation.y);

    // Update active snow burst & plof particles
    for (let i = 0; i < BURST_COUNT; i++) {
      if (burstLife[i] > 0) {
        burstLife[i] -= delta;
        burstPositions[i * 3] += burstVelocities[i].x * delta;
        burstPositions[i * 3 + 1] += burstVelocities[i].y * delta;
        burstPositions[i * 3 + 2] += burstVelocities[i].z * delta;
        burstVelocities[i].y -= 4.8 * delta; // Realistic gravity
        if (burstLife[i] <= 0) {
          burstPositions[i * 3 + 1] = -50; // Hide below ground
        }
      }
    }
    burstGeo.attributes.position.needsUpdate = true;

    // --- C. Animate Dancing Elves around the Christmas Tree (Barnaby, Holly, Finley, Ivy) ---
    const treeDancersList = [elves[4], elves[5], elves[6], elves[7]];
    treeDancersList.forEach((elf, k) => {
      const elfIdx = 4 + k;
      const jumpHop = jumpTimers[elfIdx] > 0 ? elf.charGroup.position.y : 0;

      // Swaying rhythm (deinbeweging) hand-in-hand
      const dancePhase = elapsed * 2.6 + k * (Math.PI / 2);
      const deinHop = Math.abs(Math.sin(dancePhase)) * 0.038;
      const deinSway = Math.sin(dancePhase) * 0.09;

      elf.charGroup.position.y = jumpHop > 0 ? jumpHop : deinHop;
      elf.charGroup.rotation.z = deinSway;

      // Step rhythm with feet
      elf.leftLeg.rotation.x = Math.sin(dancePhase) * 0.22;
      elf.rightLeg.rotation.x = -Math.sin(dancePhase) * 0.22;

      // Head singing & swaying happily
      elf.head.rotation.x = -0.18 + Math.sin(dancePhase * 1.5) * 0.08;
      elf.head.rotation.y = Math.sin(dancePhase * 0.8) * 0.14;

      // Outstretched arms bobbing with dance
      elf.leftArm.rotation.z = 0.86 + Math.sin(dancePhase) * 0.06;
      elf.leftArm.rotation.x = -0.32 + Math.cos(dancePhase) * 0.08;
      elf.rightArm.rotation.z = -0.86 - Math.sin(dancePhase) * 0.06;
      elf.rightArm.rotation.x = -0.32 + Math.cos(dancePhase) * 0.08;

      // Contact shadow directly beneath each dancing elf
      elfShadows[elfIdx].update(elf.root.position.x, elf.root.position.z, elf.root.position.y, deinHop, elf.root.rotation.y);
    });

    // --- D. Animate Woodcutter Elf (Bram) Chopping Wood, Splinters & Log Splitting ---
    const jumpHop8 = jumpTimers[8] > 0 ? woodcutterElf.charGroup.position.y : 0;

    // Check for deterministic keyframe freezing from URL query params (e.g. ?chopT=0.0, 0.6, 0.8...)
    let isFrozenKeyframe = false;
    let evalTime = 0;
    let evalChopCount = chopCount;
    let evalAction = 'chopping';

    if (window.__freezeChopT !== undefined) {
      isFrozenKeyframe = true;
      evalTime = window.__freezeChopT;
      evalChopCount = window.__freezeChopCount !== undefined ? window.__freezeChopCount : 1;
      evalAction = window.__freezeChopAction || 'chopping';
    } else {
      woodchopperTime += delta;
      evalTime = woodchopperTime;
    }

    const CHOP_CYCLE = 2.40; // 0.0-0.6 ophalen, 0.6-0.8 slag, 0.8-0.95 impact hold, 0.95-1.6 terug, 1.6-2.4 pauze
    const REPLACE_DURATION = 3.20;

    // State machine for chopping vs replacing log after 3 slagen
    if (!isFrozenKeyframe) {
      if (chopCount >= 3) {
        if (woodchopperTime >= REPLACE_DURATION) {
          // Finished replacing log, reset to fresh cycle
          choppingStation.resetLog();
          freshCarryLog.visible = false;
          chopCount = 0;
          woodchopperTime = 0;
          chopImpactTriggered = false;
        }
      } else {
        if (woodchopperTime >= CHOP_CYCLE) {
          woodchopperTime = woodchopperTime % CHOP_CYCLE;
          chopImpactTriggered = false;
        }
      }
    }

    const isReplacing = isFrozenKeyframe ? evalAction === 'replacing' : chopCount >= 3;

    if (isReplacing) {
      const rTime = isFrozenKeyframe ? evalTime : woodchopperTime;
      const pTotal = Math.min(1, rTime / REPLACE_DURATION);

      if (rTime < 0.90) {
        // Phase 1: Lower axe to side, turn towards woodpile on left, bend down
        const p = rTime / 0.90;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
        woodcutterElf.root.rotation.y = THREE.MathUtils.lerp(Math.PI, Math.PI - 0.48, ease);
        woodcutterElf.torso.rotation.x = THREE.MathUtils.lerp(0.0, 0.35, ease);
        woodcutterElf.charGroup.position.y = THREE.MathUtils.lerp(0.0, -0.065, ease);
        woodcutterElf.rightArm.rotation.set(0.35, 0.0, -0.45);
        woodcutterElf.rightElbow.rotation.set(0.30, 0, 0);
        woodcutterElf.leftArm.rotation.set(0.55 * ease, 0, 0.20 * ease);
        woodcutterElf.leftElbow.rotation.set(0.40 * ease, 0, 0);
        freshCarryLog.visible = false;
      } else if (rTime < 1.80) {
        // Phase 2: Pick up fresh log from pile
        const p = (rTime - 0.90) / 0.90;
        woodcutterElf.root.rotation.y = Math.PI - 0.48;
        woodcutterElf.torso.rotation.x = 0.35;
        woodcutterElf.charGroup.position.y = -0.065;
        woodcutterElf.rightArm.rotation.set(0.35, 0.0, -0.45);
        freshCarryLog.visible = true;
        freshCarryLog.position.set(-0.16, 0.26, 0.22);
        freshCarryLog.rotation.set(0.4, 0.2, 0.3);
        woodcutterElf.leftArm.rotation.set(0.70, 0, 0.25);
        woodcutterElf.leftElbow.rotation.set(0.65, 0, 0);
      } else if (rTime < 2.50) {
        // Phase 3: Turn back to chopping block and place new log upright on stump
        const p = (rTime - 1.80) / 0.70;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
        woodcutterElf.root.rotation.y = THREE.MathUtils.lerp(Math.PI - 0.48, Math.PI, ease);
        woodcutterElf.torso.rotation.x = THREE.MathUtils.lerp(0.35, 0.15, ease);
        woodcutterElf.charGroup.position.y = THREE.MathUtils.lerp(-0.065, 0.0, ease);
        freshCarryLog.position.set(THREE.MathUtils.lerp(-0.16, 0.0, ease), THREE.MathUtils.lerp(0.26, 0.48, ease), THREE.MathUtils.lerp(0.22, 0.58, ease));
        if (p > 0.85) {
          freshCarryLog.visible = false;
          choppingStation.resetLog();
        }
      } else {
        // Phase 4: Place both hands back onto axe in Rust pose
        freshCarryLog.visible = false;
        choppingStation.resetLog();
        const p = (rTime - 2.50) / (REPLACE_DURATION - 2.50);
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
        woodcutterElf.root.rotation.y = Math.PI;
        woodcutterElf.torso.rotation.x = THREE.MathUtils.lerp(0.15, 0.0, ease);
        woodcutterElf.charGroup.position.y = 0.0;
        woodcutterElf.head.rotation.set(0, 0, 0);
        woodcutterElf.rightArm.rotation.set(
          THREE.MathUtils.lerp(0.35, -1.05, ease),
          THREE.MathUtils.lerp(0.0, -0.40, ease),
          THREE.MathUtils.lerp(-0.45, -0.05, ease)
        );
        woodcutterElf.rightElbow.rotation.set(THREE.MathUtils.lerp(0.30, 0.20, ease), 0, 0);
        woodcutterElf.rightHand.rotation.set(THREE.MathUtils.lerp(0.0, 0.05, ease), 0.04, 0.02);

        // Update left hand via IK
        woodcutterElf.root.updateMatrixWorld(true);
        leftGripTarget.getWorldPosition(_leftTargetWorld);
        updateLeftArmIK(woodcutterElf, _leftTargetWorld);
      }
    } else {
      // Chopping action: 5 keyframes with exact user timings
      const cycleT = isFrozenKeyframe ? evalTime : (woodchopperTime % CHOP_CYCLE);

      // Poses:
      // 1. Rust (0.0s): bijl schuin voor het lichaam, blad op het blok
      const RUST_TORSO_X = 0.0;
      const RUST_KNEE_Y = 0.0;
      const RUST_HEAD_X = 0.0;
      const RUST_SHOULDER = { x: -1.05, y: -0.40, z: -0.05 };
      const RUST_ELBOW_X = 0.20;
      const RUST_HAND_X = 0.05;

      // 2. Ophalen (0.6s): Beide schouders roteren naar achteren tot boven het hoofd, bovenlichaam leunt 10° achterover
      const OP_TORSO_X = -0.1745; // -10 degrees achterover
      const OP_KNEE_Y = 0.015;
      const OP_HEAD_X = -0.16;
      const OP_SHOULDER = { x: -3.85, y: -0.25, z: -0.20 }; // boven en achter het hoofd
      const OP_ELBOW_X = 1.30;
      const OP_HAND_X = -0.25;

      // 4. Impact (0.8s): Blad raakt precies het midden van het blok, bovenlichaam buigt 20° voorover, knieën veren licht
      const IMP_TORSO_X = 0.3491; // +20 degrees voorover
      const IMP_KNEE_Y = -0.055;  // knieën veren licht
      const IMP_HEAD_X = 0.20;
      const IMP_SHOULDER = { x: -1.10, y: -0.40, z: -0.05 };
      const IMP_ELBOW_X = 0.05;
      const IMP_HAND_X = 0.20;

      if (cycleT < 0.60) {
        // ---------------------------------------------------------------------
        // 2. Ophalen (0,0–0,6 s, ease-in-out)
        // ---------------------------------------------------------------------
        chopImpactTriggered = false;
        const p = cycleT / 0.60;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI); // easeInOut

        woodcutterElf.torso.rotation.x = THREE.MathUtils.lerp(RUST_TORSO_X, OP_TORSO_X, ease);
        woodcutterElf.head.rotation.x = THREE.MathUtils.lerp(RUST_HEAD_X, OP_HEAD_X, ease);
        woodcutterElf.charGroup.position.y = THREE.MathUtils.lerp(RUST_KNEE_Y, OP_KNEE_Y, ease);

        woodcutterElf.rightArm.rotation.set(
          THREE.MathUtils.lerp(RUST_SHOULDER.x, OP_SHOULDER.x, ease),
          THREE.MathUtils.lerp(RUST_SHOULDER.y, OP_SHOULDER.y, ease),
          THREE.MathUtils.lerp(RUST_SHOULDER.z, OP_SHOULDER.z, ease)
        );
        woodcutterElf.rightElbow.rotation.set(THREE.MathUtils.lerp(RUST_ELBOW_X, OP_ELBOW_X, ease), 0, 0);
        woodcutterElf.rightHand.rotation.set(THREE.MathUtils.lerp(RUST_HAND_X, OP_HAND_X, ease), 0.04, 0.02);
      } else if (cycleT < 0.80) {
        // ---------------------------------------------------------------------
        // 3. Slag (0,6–0,8 s, ease-in, snel)
        // ---------------------------------------------------------------------
        const p = (cycleT - 0.60) / 0.20;
        const ease = p * p * (1.1 - 0.1 * p); // easeIn with rapid acceleration

        woodcutterElf.torso.rotation.x = THREE.MathUtils.lerp(OP_TORSO_X, IMP_TORSO_X, ease);
        woodcutterElf.head.rotation.x = THREE.MathUtils.lerp(OP_HEAD_X, IMP_HEAD_X, ease);
        woodcutterElf.charGroup.position.y = THREE.MathUtils.lerp(OP_KNEE_Y, IMP_KNEE_Y, ease);

        woodcutterElf.rightArm.rotation.set(
          THREE.MathUtils.lerp(OP_SHOULDER.x, IMP_SHOULDER.x, ease),
          THREE.MathUtils.lerp(OP_SHOULDER.y, IMP_SHOULDER.y, ease),
          THREE.MathUtils.lerp(OP_SHOULDER.z, IMP_SHOULDER.z, ease)
        );
        woodcutterElf.rightElbow.rotation.set(THREE.MathUtils.lerp(OP_ELBOW_X, IMP_ELBOW_X, ease), 0, 0);
        woodcutterElf.rightHand.rotation.set(THREE.MathUtils.lerp(OP_HAND_X, IMP_HAND_X, ease), 0.04, 0.02);
      } else if (cycleT < 0.95) {
        // ---------------------------------------------------------------------
        // 4. Impact (0,8 s, 0,15 s stilstand)
        // ---------------------------------------------------------------------
        woodcutterElf.torso.rotation.x = IMP_TORSO_X;
        woodcutterElf.head.rotation.x = IMP_HEAD_X;
        woodcutterElf.charGroup.position.y = IMP_KNEE_Y;

        woodcutterElf.rightArm.rotation.set(IMP_SHOULDER.x, IMP_SHOULDER.y, IMP_SHOULDER.z);
        woodcutterElf.rightElbow.rotation.set(IMP_ELBOW_X, 0, 0);
        woodcutterElf.rightHand.rotation.set(IMP_HAND_X, 0.04, 0.02);

        if (!chopImpactTriggered) {
          chopImpactTriggered = true;
          triggerSplinterBurst();
          if (audio && typeof audio.playWoodChopTok === 'function') {
            audio.playWoodChopTok();
          } else if (audio && typeof audio.playChime === 'function') {
            audio.playChime(0.65);
          }
          if (!isFrozenKeyframe) {
            chopCount++;
            if (chopCount >= 3) {
              choppingStation.splitLog();
            }
          } else if (evalChopCount >= 3) {
            choppingStation.splitLog();
          }
        }
      } else if (cycleT < 1.60) {
        // ---------------------------------------------------------------------
        // 5. Terug naar rust (0,95–1,6 s)
        // ---------------------------------------------------------------------
        const p = (cycleT - 0.95) / 0.65;
        const ease = Math.sin((p * Math.PI) * 0.5); // easeOut

        woodcutterElf.torso.rotation.x = THREE.MathUtils.lerp(IMP_TORSO_X, RUST_TORSO_X, ease);
        woodcutterElf.head.rotation.x = THREE.MathUtils.lerp(IMP_HEAD_X, RUST_HEAD_X, ease);
        woodcutterElf.charGroup.position.y = THREE.MathUtils.lerp(IMP_KNEE_Y, RUST_KNEE_Y, ease);

        woodcutterElf.rightArm.rotation.set(
          THREE.MathUtils.lerp(IMP_SHOULDER.x, RUST_SHOULDER.x, ease),
          THREE.MathUtils.lerp(IMP_SHOULDER.y, RUST_SHOULDER.y, ease),
          THREE.MathUtils.lerp(IMP_SHOULDER.z, RUST_SHOULDER.z, ease)
        );
        woodcutterElf.rightElbow.rotation.set(THREE.MathUtils.lerp(IMP_ELBOW_X, RUST_ELBOW_X, ease), 0, 0);
        woodcutterElf.rightHand.rotation.set(THREE.MathUtils.lerp(IMP_HAND_X, RUST_HAND_X, ease), 0.04, 0.02);

        // If log was split on 3rd chop, halves tumble and fall sideways to ground
        if (chopCount >= 3 || evalChopCount >= 3) {
          choppingStation.animateSplitFall(ease);
        }
      } else {
        // ---------------------------------------------------------------------
        // Pauze van 0,8 s (1,6–2,4 s): Ruststand met bijlblad op het blok
        // ---------------------------------------------------------------------
        woodcutterElf.torso.rotation.x = RUST_TORSO_X;
        woodcutterElf.head.rotation.x = RUST_HEAD_X;
        woodcutterElf.charGroup.position.y = RUST_KNEE_Y;

        woodcutterElf.rightArm.rotation.set(RUST_SHOULDER.x, RUST_SHOULDER.y, RUST_SHOULDER.z);
        woodcutterElf.rightElbow.rotation.set(RUST_ELBOW_X, 0, 0);
        woodcutterElf.rightHand.rotation.set(RUST_HAND_X, 0.04, 0.02);

        if (chopCount >= 3 || evalChopCount >= 3) {
          choppingStation.animateSplitFall(1.0);
        }
      }

      // -----------------------------------------------------------------------
      // Linkerhand tracking: elk frame naar leftGripTarget lager op de steel!
      // Draait alleen rond de pivots (schouder en elleboog).
      // -----------------------------------------------------------------------
      woodcutterElf.root.updateMatrixWorld(true);
      leftGripTarget.getWorldPosition(_leftTargetWorld);
      updateLeftArmIK(woodcutterElf, _leftTargetWorld);
    }

    // Contact shadow under woodcutter
    const chopHop = jumpHop8 > 0 ? jumpHop8 : woodcutterElf.charGroup.position.y;
    elfShadows[8].update(woodcutterElf.root.position.x, woodcutterElf.root.position.z, woodcutterPos.y, chopHop, woodcutterElf.root.rotation.y);

    // Animate splinters
    if (splinterTimer > 0) {
      splinterTimer -= delta;
      for (let i = 0; i < SPLINTER_COUNT; i++) {
        splinterPositions[i * 3] += splinterVelocities[i].x * delta;
        splinterPositions[i * 3 + 1] += splinterVelocities[i].y * delta;
        splinterPositions[i * 3 + 2] += splinterVelocities[i].z * delta;
        splinterVelocities[i].y -= 5.5 * delta;
      }
      splinterGeo.attributes.position.needsUpdate = true;
      splinterMat.opacity = Math.max(0, splinterTimer / 0.38);
    }

    // --- E. Animate Ladder Elf (Jingle) Hanging Fairy Lights on Outside of Ladder ---
    const jumpHop9 = jumpTimers[9] > 0 ? ladderElf.charGroup.position.y : 0;
    const lAnim = ladderElf.userData.ladderAnim;

    if (lAnim) {
      lAnim.phaseTimer += delta;

      if (lAnim.subPhase === 'decorating') {
        const curBulbIdx = lAnim.bulbsAttached; // 0, 1 of 2
        const bulbDuration = 2.4; // seconden per lampje
        const t = lAnim.phaseTimer;

        // Hoogte van de huidige sport waar hij met beide voeten op staat
        const curRungH = lAnim.rungHeights[lAnim.currentRung] + lAnim.rungRadius - 0.008;
        ladderElf.root.position.set(0, curRungH + jumpHop9, -0.058);

        // Beide voeten blijven stabiel op dezelfde sport staan
        ladderElf.leftLeg.rotation.set(0, 0, 0);
        ladderElf.rightLeg.rotation.set(0, 0, 0);

        // Eén hand blijft stevig aan de linkerstaander
        ladderElf.leftArm.rotation.set(
          -0.75 + Math.sin(elapsed * 1.8) * 0.03,
          0.20,
          -0.32
        );

        // Animatie per lampje:
        // 1. Hand omhoog (0.0s - 0.7s)
        if (t < 0.7) {
          const p = t / 0.7;
          const ease = p * p * (3 - 2 * p); // smoothstep
          const targetArmX = THREE.MathUtils.lerp(-0.85, -2.62, ease);
          const targetArmZ = THREE.MathUtils.lerp(-0.10, -0.20 + curBulbIdx * 0.08, ease);

          ladderElf.rightArm.rotation.set(targetArmX, -0.15, targetArmZ);
          ladderElf.head.rotation.set(THREE.MathUtils.lerp(-0.15, -0.42, ease), 0.10, 0);

          // Lampje in hand zichtbaar
          lAnim.handBulbMesh.visible = true;
          lAnim.handBulbMat.emissiveIntensity = 0.5 * ease;
        }
        // 2. Lampje vastmaken aan de dakgoot (0.7s - 1.4s)
        else if (t < 1.4) {
          const fastenT = t - 0.7;
          const wiggleX = Math.sin(fastenT * 14) * 0.05;
          const wiggleZ = Math.cos(fastenT * 12) * 0.03;

          ladderElf.rightArm.rotation.set(
            -2.62 + wiggleX,
            -0.15,
            -0.20 + curBulbIdx * 0.08 + wiggleZ
          );
          ladderElf.head.rotation.set(-0.42 + Math.sin(fastenT * 8) * 0.04, 0.12, 0);

          // 3. Het lampje gaat aan! (bij t = 1.15s)
          if (t >= 1.15) {
            const bulbMat = lAnim.bulbMaterials[curBulbIdx];
            if (bulbMat) {
              const flare = Math.min(1.0, (t - 1.15) / 0.15);
              bulbMat.emissiveIntensity = THREE.MathUtils.lerp(0.0, 2.8, flare);
            }
            lAnim.handBulbMesh.visible = false;
            lAnim.dakgootLight.intensity = Math.min(1.8, (lAnim.bulbsAttached + 1) * 0.6);
          } else {
            lAnim.handBulbMesh.visible = true;
            lAnim.handBulbMat.emissiveIntensity = 1.2;
          }
        }
        // 4. Hand terug (1.4s - 2.4s)
        else {
          const p = (t - 1.4) / 1.0;
          const ease = p * p * (3 - 2 * p);
          const targetArmX = THREE.MathUtils.lerp(-2.62, -0.85, ease);
          const targetArmZ = THREE.MathUtils.lerp(-0.20 + curBulbIdx * 0.08, -0.10, ease);

          ladderElf.rightArm.rotation.set(targetArmX, -0.15, targetArmZ);
          ladderElf.head.rotation.set(THREE.MathUtils.lerp(-0.42, -0.18, ease), 0.08, 0);

          // Lampje op dakgoot blijft branden!
          if (lAnim.bulbMaterials[curBulbIdx]) {
            lAnim.bulbMaterials[curBulbIdx].emissiveIntensity = 2.4;
          }
          lAnim.handBulbMesh.visible = false;
        }

        // Als dit lampje klaar is na 2.4s
        if (t >= bulbDuration) {
          lAnim.bulbsAttached++;
          lAnim.phaseTimer = 0;

          // Na 3 lampjes klimt hij één sport hoger of lager!
          if (lAnim.bulbsAttached >= 3) {
            lAnim.subPhase = 'climbing';
            lAnim.phaseTimer = 0;
          }
        }
      } else if (lAnim.subPhase === 'climbing') {
        // --- Klimmen: voeten en handen bewegen sport per sport mee ---
        const climbDuration = 2.2; // seconden per sport
        const u = Math.min(1.0, lAnim.phaseTimer / climbDuration);
        const ease = 0.5 - 0.5 * Math.cos(u * Math.PI); // easeInOut

        const fromH = lAnim.rungHeights[lAnim.currentRung] + lAnim.rungRadius - 0.008;
        const toH = lAnim.rungHeights[lAnim.targetRung] + lAnim.rungRadius - 0.008;
        const climbDir = lAnim.targetRung > lAnim.currentRung ? 1 : -1;

        // Root beweegt geleidelijk van de ene sport naar de andere
        const curH = THREE.MathUtils.lerp(fromH, toH, ease);
        ladderElf.root.position.set(0, curH + jumpHop9, -0.058);

        // Handen bewegen sport per sport mee langs de staanders
        const handBob = Math.sin(u * Math.PI * 2) * 0.15;
        ladderElf.leftArm.rotation.set(-0.75 + handBob * 0.5, 0.20, -0.32);
        ladderElf.rightArm.rotation.set(-0.75 - handBob * 0.5, -0.20, 0.32);
        ladderElf.head.rotation.set(-0.25 + handBob * 0.2, 0, 0);

        // Voeten bewegen sport per sport mee (afwisselend stappen)
        if (u < 0.5) {
          // Eerste helft: rechterbeen tilt op en stapt naar doelsport
          const stepP = u / 0.5;
          const legLift = Math.sin(stepP * Math.PI);
          ladderElf.rightLeg.rotation.x = -climbDir * legLift * 0.45;
          ladderElf.leftLeg.rotation.x = 0;
        } else {
          // Tweede helft: linkerbeen volgt naar doelsport
          const stepP = (u - 0.5) / 0.5;
          const legLift = Math.sin(stepP * Math.PI);
          ladderElf.rightLeg.rotation.x = 0;
          ladderElf.leftLeg.rotation.x = -climbDir * legLift * 0.45;
        }

        // Lampjes blijven zacht twinkelen tijdens het klimmen
        lAnim.bulbMaterials.forEach((bMat, bi) => {
          bMat.emissiveIntensity = 2.0 + Math.sin(elapsed * 4.0 + bi * 1.5) * 0.6;
        });

        // Klim voltooid: beide voeten weer stevig op de nieuwe sport
        if (u >= 1.0) {
          ladderElf.leftLeg.rotation.set(0, 0, 0);
          ladderElf.rightLeg.rotation.set(0, 0, 0);
          lAnim.currentRung = lAnim.targetRung;

          // Wissel af tussen 4e sport (index 3) en 5e sport (index 4)
          lAnim.targetRung = (lAnim.currentRung === 4) ? 3 : 4;
          lAnim.bulbsAttached = 0;
          lAnim.subPhase = 'decorating';
          lAnim.phaseTimer = 0;
        }
      }
    }

    // Shadow projected to terrain directly under ladder elf
    ladderElf.root.getWorldPosition(ladderElfWorldPos);
    const terrainUnderLadder = getTerrainHeight(ladderElfWorldPos.x, ladderElfWorldPos.z);
    elfShadows[9].update(
      ladderElfWorldPos.x,
      ladderElfWorldPos.z,
      terrainUnderLadder,
      ladderElfWorldPos.y - terrainUnderLadder + jumpHop9,
      0.45
    );

    // --- F. Animate Barista Elf (Coco) & Customer Elf (Pip) at Hot Choco Stall ---
    const baristaElf = elves[10];
    const customerElf = elves[11];
    const jumpHop10 = jumpTimers[10] > 0 ? baristaElf.charGroup.position.y : 0;
    const jumpHop11 = jumpTimers[11] > 0 ? customerElf.charGroup.position.y : 0;

    elfShadows[10].update(baristaElf.root.position.x, baristaElf.root.position.z, baristaElf.root.position.y, jumpHop10, baristaElf.root.rotation.y);
    elfShadows[11].update(customerElf.root.position.x, customerElf.root.position.z, customerElf.root.position.y, jumpHop11, customerElf.root.rotation.y);

    // 12-second interactive serving cycle
    const stallCycleTime = elapsed % 12.0;

    if (stallCycleTime < 2.5) {
      // Phase 0: Ready / Wiping counter / Preparing mug
      chocoStall.servingMug.position.set(0.15, 0.89, 0.12);
      chocoStall.pouringKan.rotation.z = 0;
      baristaElf.rightArm.rotation.x = -0.55 + Math.sin(elapsed * 2.5) * 0.12;
      baristaElf.leftArm.rotation.x = -0.30;
      baristaElf.torso.rotation.x = 0.0;
      baristaElf.head.rotation.y = Math.sin(elapsed * 1.2) * 0.15;

      // Customer Pip waiting attentively in front of toog
      customerElf.leftArm.rotation.x = -0.35 + Math.sin(elapsed * 1.5) * 0.08;
      customerElf.rightArm.rotation.x = -0.35 - Math.sin(elapsed * 1.5) * 0.08;
      customerElf.head.rotation.x = -0.10;
      customerElf.head.rotation.y = Math.sin(elapsed * 1.0) * 0.20;
    } else if (stallCycleTime < 5.8) {
      // Phase 1: Inschenken (kan kantelt, stoom stijgt op uit kan en beker)
      const p = (stallCycleTime - 2.5) / 3.3;
      const pourEase = Math.sin(p * Math.PI);

      baristaElf.torso.rotation.x = 0.16 * pourEase;
      baristaElf.rightArm.rotation.x = -0.85 - 0.40 * pourEase;
      baristaElf.rightArm.rotation.z = -0.22;
      chocoStall.pouringKan.rotation.z = -1.18 * pourEase; // kan kantelt naar voren over de beker
      baristaElf.head.rotation.x = 0.20 * pourEase; // kijkt naar de beker tijdens inschenken

      // Customer watches the pouring enthusiastically
      customerElf.head.rotation.x = -0.15;
      customerElf.charGroup.position.y = Math.sin(elapsed * 4.0) * 0.02; // lichte wiebel/blijdschap
    } else if (stallCycleTime < 8.8) {
      // Phase 2: Beker aangeven aan wachtend elfje (Coco schuift beker naar voren over toog)
      const p = (stallCycleTime - 5.8) / 3.0;
      const giveEase = Math.sin((p * Math.PI) / 2);

      chocoStall.pouringKan.rotation.z = 0;
      baristaElf.rightArm.rotation.x = -0.45;
      baristaElf.leftArm.rotation.x = -1.10 * giveEase; // hand reikt naar voren

      // Schuif beker over toog naar de voorkant waar Pip staat
      const mugZ = THREE.MathUtils.lerp(0.12, 0.42, giveEase);
      chocoStall.servingMug.position.set(0.15, 0.89, mugZ);

      // Pip reikt handen naar de beker
      customerElf.leftArm.rotation.x = -0.95 * giveEase;
      customerElf.rightArm.rotation.x = -0.95 * giveEase;
      customerElf.head.rotation.x = -0.22;
    } else {
      // Phase 3: Pip neemt een slokje chocomelk, Coco zwaait vrolijk
      const p = (stallCycleTime - 8.8) / 3.2;
      const drinkCycle = Math.sin(p * Math.PI);

      // Beker gaat naar Pip's mondje
      chocoStall.servingMug.position.set(0.15, 0.89 + drinkCycle * 0.28, 0.42 - drinkCycle * 0.08);
      customerElf.leftArm.rotation.x = -0.95 - drinkCycle * 0.65;
      customerElf.rightArm.rotation.x = -0.95 - drinkCycle * 0.65;
      customerElf.head.rotation.x = drinkCycle * 0.28; // hoofdje achterover tijdens drinken
      customerElf.charGroup.position.y = drinkCycle * 0.03;

      // Coco zwaait vrolijk
      baristaElf.leftArm.rotation.x = -0.30;
      baristaElf.rightArm.rotation.x = -1.25 + Math.sin(elapsed * 6.0) * 0.25;
      baristaElf.head.rotation.y = Math.sin(elapsed * 2.0) * 0.22;
    }

    // Animate steam particles rising gently from kettle and mugs
    for (let i = 0; i < STEAM_COUNT; i++) {
      steamAges[i] += delta;
      const mIdx = steamSourceIdx[i] % mugWorldPositions.length;
      const mBase = mugWorldPositions[mIdx];

      if (steamAges[i] >= 2.2) {
        steamAges[i] = 0;
        steamPositions[i * 3] = mBase.x + (Math.random() - 0.5) * 0.05;
        steamPositions[i * 3 + 1] = mBase.y;
        steamPositions[i * 3 + 2] = mBase.z + (Math.random() - 0.5) * 0.05;
      } else {
        steamPositions[i * 3 + 1] += 0.38 * delta;
        steamPositions[i * 3] += Math.sin(elapsed * 2.2 + i) * 0.04 * delta;
        steamPositions[i * 3 + 2] += Math.cos(elapsed * 1.9 + i) * 0.04 * delta;
      }
    }
    steamGeo.attributes.position.needsUpdate = true;

    // --- G. Animate Village Snowman (Wobble on Click & Idle Breathe) ---
    if (snowmanWobbleTimer > 0) {
      snowmanWobbleTimer = Math.max(0, snowmanWobbleTimer - delta);
      const wobblePhase = (1.8 - snowmanWobbleTimer) * Math.PI * 3.33;
      const wobbleHop = Math.abs(Math.sin(wobblePhase)) * 0.16;
      villageSnowman.group.position.y = miniSmY + wobbleHop;
      villageSnowman.group.rotation.z = Math.sin(wobblePhase * 1.5) * 0.08;
      villageSnowman.leftBranch.rotation.z = 1.15 + Math.sin(wobblePhase * 2.0) * 0.35;
      villageSnowman.rightBranch.rotation.z = -1.10 - Math.sin(wobblePhase * 2.0) * 0.35;
      snowmanShadow.update(miniSmX, miniSmZ, miniSmY, wobbleHop, villageSnowman.group.rotation.y);
    } else {
      villageSnowman.group.position.y = miniSmY;
      villageSnowman.group.rotation.z = Math.sin(elapsed * 1.2) * 0.015;
      villageSnowman.leftBranch.rotation.z = 1.15 + Math.sin(elapsed * 1.6) * 0.05;
      villageSnowman.rightBranch.rotation.z = -1.10 - Math.sin(elapsed * 1.4) * 0.05;
      snowmanShadow.update(miniSmX, miniSmZ, miniSmY, 0, villageSnowman.group.rotation.y);
    }

    // --- H. Elf Click-Jump Reactions ---
    for (let i = 0; i < elves.length; i++) {
      if (jumpTimers[i] > 0) {
        jumpTimers[i] -= delta;
        if (jumpTimers[i] <= 0) {
          jumpTimers[i] = 0;
          elves[i].charGroup.position.y = 0;
          elves[i].charGroup.rotation.y = 0;
        } else {
          const jumpProgress = (1.2 - jumpTimers[i]) / 1.2;
          const jumpArc = Math.sin(jumpProgress * Math.PI) * 0.42;
          elves[i].charGroup.position.y = jumpArc;
          elves[i].charGroup.rotation.y = Math.sin(jumpProgress * Math.PI * 2) * 0.35;
          if (jumpProgress < 0.85) {
            elves[i].rightArm.rotation.z = -2.25 + Math.sin(elapsed * 18.0) * 0.35;
            elves[i].leftArm.rotation.z = 2.25 - Math.sin(elapsed * 18.0) * 0.35;
          }
        }
      }
    }
  }

  scene.add(rootGroup);

  return {
    group: rootGroup,
    elves,
    elfShadows,
    snowman: villageSnowman,
    snowmanShadow,
    sled: giftSled,
    sledShadow,
    chocoStall,
    update
  };
}
