import * as THREE from 'three';
import { COLORS } from '../config.js';

/**
 * Creates a crisp horizontal striped canvas texture for the elves' stockings.
 */
export function createStockingTexture(color1 = '#ffffff', color2 = '#d92027', numStripes = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const stripeH = 128 / numStripes;
  for (let i = 0; i < numStripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? color1 : color2;
    ctx.fillRect(0, i * stripeH, 64, stripeH);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Singleton shared geometries across all elves in the village to maintain high FPS and low memory.
 */
let sharedGeomsInstance = null;
export function getSharedElfGeometries() {
  if (sharedGeomsInstance) return sharedGeomsInstance;

  // 1. Head & Face
  const headSphere = new THREE.SphereGeometry(0.082, 18, 16);
  headSphere.scale(0.98, 1.05, 0.98);

  const neckCyl = new THREE.CylinderGeometry(0.034, 0.040, 0.052, 12);

  const cheekSphere = new THREE.SphereGeometry(0.022, 10, 8);
  cheekSphere.scale(1.15, 0.85, 0.55);

  const noseSphere = new THREE.SphereGeometry(0.015, 10, 10);
  noseSphere.scale(1.0, 0.95, 1.15);

  const eyeSphere = new THREE.SphereGeometry(0.010, 10, 10);
  const eyeHighlight = new THREE.SphereGeometry(0.0032, 6, 6);

  const eyebrowGeo = new THREE.CapsuleGeometry(0.0065, 0.024, 6, 8);

  const smileGeo = new THREE.TorusGeometry(0.018, 0.0036, 6, 12, Math.PI);
  smileGeo.rotateX(Math.PI);

  // Pointy Elf Ears (Puntoren)
  const earBase = new THREE.SphereGeometry(0.020, 10, 8);
  earBase.scale(0.65, 1.1, 0.75);

  const earTip = new THREE.ConeGeometry(0.016, 0.052, 10);
  earTip.scale(0.85, 1.0, 0.55);

  // Hair
  const hairBack = new THREE.SphereGeometry(0.086, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.65);
  const hairSideburn = new THREE.CapsuleGeometry(0.011, 0.036, 6, 8);
  const hairFringe = new THREE.CapsuleGeometry(0.013, 0.046, 6, 8);

  // 2. Pointy Hat (Puntmuts die buigt met jingle bell)
  const hatBrim = new THREE.TorusGeometry(0.082, 0.020, 10, 24);
  hatBrim.rotateX(Math.PI / 2);

  const hatBaseCone = new THREE.CylinderGeometry(0.048, 0.082, 0.09, 16);
  const hatMidCone = new THREE.CylinderGeometry(0.030, 0.048, 0.09, 14);
  const hatTipCone = new THREE.ConeGeometry(0.028, 0.13, 12);

  const bellGeo = new THREE.SphereGeometry(0.024, 12, 10);
  const bellRing = new THREE.TorusGeometry(0.024, 0.004, 6, 16);
  bellRing.rotateX(Math.PI / 2);

  // 3. Torso, Collar & Belt
  const tunicChest = new THREE.CylinderGeometry(0.088, 0.094, 0.14, 18);
  const tunicPeplum = new THREE.CylinderGeometry(0.094, 0.126, 0.085, 18);
  const tunicHemRing = new THREE.TorusGeometry(0.124, 0.013, 8, 22);
  tunicHemRing.rotateX(Math.PI / 2);

  const collarRing = new THREE.TorusGeometry(0.054, 0.014, 8, 18);
  collarRing.rotateX(Math.PI / 2);
  const collarPetal = new THREE.ConeGeometry(0.024, 0.068, 4);
  collarPetal.rotateX(Math.PI);
  collarPetal.scale(1.0, 1.0, 0.30);

  const beltCyl = new THREE.CylinderGeometry(0.094, 0.096, 0.034, 20);
  const buckleFrameH = new THREE.BoxGeometry(0.062, 0.010, 0.014);
  const buckleFrameV = new THREE.BoxGeometry(0.010, 0.048, 0.014);
  const buckleProng = new THREE.BoxGeometry(0.028, 0.007, 0.016);
  const buttonGeo = new THREE.SphereGeometry(0.0085, 8, 6);

  // 4. Arms & Detailed Hands (Handjes i.p.v. stompjes)
  const armUpper = new THREE.CapsuleGeometry(0.025, 0.08, 8, 10);
  const armForearm = new THREE.CapsuleGeometry(0.023, 0.08, 8, 10);
  const wristCuff = new THREE.TorusGeometry(0.026, 0.009, 8, 14);
  wristCuff.rotateX(Math.PI / 2);

  const handPalm = new THREE.SphereGeometry(0.022, 10, 8);
  handPalm.scale(0.95, 1.25, 0.70);
  const handThumb = new THREE.CapsuleGeometry(0.0068, 0.016, 6, 8);
  const handFinger = new THREE.CapsuleGeometry(0.0055, 0.018, 6, 8);

  // 5. Legs & Curly Shoes with Bell
  const legStocking = new THREE.CylinderGeometry(0.027, 0.024, 0.18, 14);
  const bootAnkleCuff = new THREE.TorusGeometry(0.030, 0.010, 8, 16);
  bootAnkleCuff.rotateX(Math.PI / 2);

  const shoeFoot = new THREE.SphereGeometry(0.040, 12, 10);
  shoeFoot.scale(0.85, 0.65, 1.55);

  const shoeSole = new THREE.BoxGeometry(0.072, 0.016, 0.145);

  const shoeCurl = new THREE.TorusGeometry(0.028, 0.010, 8, 16, Math.PI * 0.95);
  shoeCurl.rotateX(-Math.PI * 0.45);

  const shoeBell = new THREE.SphereGeometry(0.016, 10, 8);

  sharedGeomsInstance = {
    headSphere,
    neckCyl,
    cheekSphere,
    noseSphere,
    eyeSphere,
    eyeHighlight,
    eyebrowGeo,
    smileGeo,
    earBase,
    earTip,
    hairBack,
    hairSideburn,
    hairFringe,
    hatBrim,
    hatBaseCone,
    hatMidCone,
    hatTipCone,
    bellGeo,
    bellRing,
    tunicChest,
    tunicPeplum,
    tunicHemRing,
    collarRing,
    collarPetal,
    beltCyl,
    buckleFrameH,
    buckleFrameV,
    buckleProng,
    buttonGeo,
    armUpper,
    armForearm,
    wristCuff,
    handPalm,
    handThumb,
    handFinger,
    legStocking,
    bootAnkleCuff,
    shoeFoot,
    shoeSole,
    shoeCurl,
    shoeBell
  };

  return sharedGeomsInstance;
}

/**
 * Singleton shared base materials across all elves.
 */
let sharedMatsInstance = null;
export function getSharedElfMaterials() {
  if (sharedMatsInstance) return sharedMatsInstance;

  sharedMatsInstance = {
    skin: new THREE.MeshStandardMaterial({
      color: 0xf5c3a3,
      roughness: 0.56,
      metalness: 0.02
    }),
    rosyCheek: new THREE.MeshStandardMaterial({
      color: 0xe66262,
      roughness: 0.50,
      metalness: 0.02
    }),
    darkEye: new THREE.MeshStandardMaterial({
      color: 0x12151c,
      roughness: 0.15,
      metalness: 0.20
    }),
    whiteFur: new THREE.MeshStandardMaterial({
      color: 0xf8faff,
      roughness: 0.85,
      metalness: 0.02
    }),
    blackLeather: new THREE.MeshStandardMaterial({
      color: 0x181a20,
      roughness: 0.36,
      metalness: 0.15
    }),
    darkSole: new THREE.MeshStandardMaterial({
      color: 0x0d0f13,
      roughness: 0.82,
      metalness: 0.05
    }),
    gold: new THREE.MeshStandardMaterial({
      color: COLORS.GOLD_METAL || 0xd4af37,
      roughness: 0.22,
      metalness: 0.88,
      emissive: 0x442600,
      emissiveIntensity: 0.25
    }),
    glowingBell: new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 1.8,
      roughness: 0.20,
      metalness: 0.85
    })
  };

  return sharedMatsInstance;
}

/**
 * Single unified elf creator used across the ENTIRE world.
 * Every elf in the village, on the path, in cottages, chopping wood, or sledding
 * shares this identical detailed chibi character model.
 */
export function createElf(config = {}) {
  const sharedGeoms = getSharedElfGeometries();
  const sharedMaterials = getSharedElfMaterials();

  const elfRoot = new THREE.Group();
  elfRoot.name = config.id || `elf_${Math.random().toString(36).slice(2, 7)}`;

  const charGroup = new THREE.Group();
  charGroup.name = 'charGroup';
  const elfScale = config.scale || 1.35;
  charGroup.scale.setScalar(elfScale);
  elfRoot.add(charGroup);

  // Outfit materials
  const suitMat = config.suitMat || new THREE.MeshStandardMaterial({
    color: config.suitColor !== undefined ? config.suitColor : 0x00c853,
    roughness: 0.65,
    metalness: 0.05
  });

  const trimMat = config.trimMat || new THREE.MeshStandardMaterial({
    color: config.trimColor !== undefined ? config.trimColor : 0xffffff,
    roughness: 0.75,
    metalness: 0.02
  });

  const shoeMat = config.shoeMat || new THREE.MeshStandardMaterial({
    color: config.shoeColor !== undefined ? config.shoeColor : (config.suitColor !== undefined ? config.suitColor : 0xd92027),
    roughness: 0.55,
    metalness: 0.08
  });

  const hairMat = config.hairMat || new THREE.MeshStandardMaterial({
    color: config.hairColor !== undefined ? config.hairColor : 0x7c3f1d,
    roughness: 0.85,
    metalness: 0.02
  });

  const stockingTex = config.stockingTex || createStockingTexture('#ffffff', '#d92027', 8);
  const stockingMat = config.stockingMat || new THREE.MeshStandardMaterial({
    map: stockingTex,
    roughness: 0.70,
    metalness: 0.02
  });

  // ---------------------------------------------------------------------------
  // 1. Legs & Curly Shoes with Bell
  // ---------------------------------------------------------------------------
  const leftLeg = new THREE.Group();
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.062, 0.28, 0);

  const rightLeg = new THREE.Group();
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.062, 0.28, 0);

  [leftLeg, rightLeg].forEach((legGroup) => {
    const stocking = new THREE.Mesh(sharedGeoms.legStocking, stockingMat);
    stocking.position.set(0, -0.09, 0);
    legGroup.add(stocking);

    const ankleCuff = new THREE.Mesh(sharedGeoms.bootAnkleCuff, trimMat);
    ankleCuff.position.set(0, -0.178, 0);
    legGroup.add(ankleCuff);

    const shoeBody = new THREE.Mesh(sharedGeoms.shoeFoot, shoeMat);
    shoeBody.position.set(0, -0.23, 0.025);
    legGroup.add(shoeBody);

    const shoeSole = new THREE.Mesh(sharedGeoms.shoeSole, sharedMaterials.darkSole);
    shoeSole.position.set(0, -0.252, 0.022);
    legGroup.add(shoeSole);

    const shoeCurl = new THREE.Mesh(sharedGeoms.shoeCurl, shoeMat);
    shoeCurl.position.set(0, -0.198, 0.098);
    legGroup.add(shoeCurl);

    const shoeBell = new THREE.Mesh(sharedGeoms.shoeBell, sharedMaterials.glowingBell);
    shoeBell.position.set(0, -0.168, 0.116);
    legGroup.add(shoeBell);
  });

  charGroup.add(leftLeg, rightLeg);

  // ---------------------------------------------------------------------------
  // 2. Torso, Peplum, Collar & Buckle
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.28, 0);
  charGroup.add(torso);

  const peplum = new THREE.Mesh(sharedGeoms.tunicPeplum, suitMat);
  peplum.position.set(0, 0.040, 0);
  torso.add(peplum);

  const peplumHem = new THREE.Mesh(sharedGeoms.tunicHemRing, trimMat);
  peplumHem.position.set(0, 0.002, 0);
  torso.add(peplumHem);

  const chest = new THREE.Mesh(sharedGeoms.tunicChest, suitMat);
  chest.position.set(0, 0.130, 0);
  torso.add(chest);

  const belt = new THREE.Mesh(sharedGeoms.beltCyl, sharedMaterials.blackLeather);
  belt.position.set(0, 0.075, 0);
  torso.add(belt);

  const buckleGroup = new THREE.Group();
  buckleGroup.position.set(0, 0.075, 0.096);
  torso.add(buckleGroup);

  const topBar = new THREE.Mesh(sharedGeoms.buckleFrameH, sharedMaterials.gold);
  topBar.position.y = 0.020;
  const botBar = new THREE.Mesh(sharedGeoms.buckleFrameH, sharedMaterials.gold);
  botBar.position.y = -0.020;
  const leftBar = new THREE.Mesh(sharedGeoms.buckleFrameV, sharedMaterials.gold);
  leftBar.position.x = -0.026;
  const rightBar = new THREE.Mesh(sharedGeoms.buckleFrameV, sharedMaterials.gold);
  rightBar.position.x = 0.026;
  const prong = new THREE.Mesh(sharedGeoms.buckleProng, sharedMaterials.gold);
  prong.position.set(0.006, 0, 0.002);
  buckleGroup.add(topBar, botBar, leftBar, rightBar, prong);

  [-0.028, 0.025].forEach((by) => {
    const btn = new THREE.Mesh(sharedGeoms.buttonGeo, sharedMaterials.gold);
    btn.position.set(0, 0.135 + by, 0.094);
    torso.add(btn);
  });

  const collarGroup = new THREE.Group();
  collarGroup.position.set(0, 0.198, 0);
  torso.add(collarGroup);

  const collarRing = new THREE.Mesh(sharedGeoms.collarRing, trimMat);
  collarGroup.add(collarRing);

  const PETAL_COUNT = 8;
  for (let p = 0; p < PETAL_COUNT; p++) {
    const angle = (p / PETAL_COUNT) * Math.PI * 2;
    const petal = new THREE.Mesh(sharedGeoms.collarPetal, trimMat);
    petal.position.set(Math.sin(angle) * 0.068, -0.024, Math.cos(angle) * 0.068);
    petal.rotation.y = angle;
    petal.rotation.x = 0.42;
    collarGroup.add(petal);
  }

  // ---------------------------------------------------------------------------
  // 3. Arms & Detailed Hands (with Shoulder & Elbow Pivots)
  // ---------------------------------------------------------------------------
  let leftHandGroup = null;
  let rightHandGroup = null;
  let leftElbowGroup = null;
  let rightElbowGroup = null;

  function createArm(side) {
    // Shoulder pivot group (attached to charGroup shoulder socket)
    const armGroup = new THREE.Group();
    armGroup.name = side === -1 ? 'leftShoulder' : 'rightShoulder';
    armGroup.position.set(side * 0.108, 0.46, 0);
    armGroup.rotation.order = 'ZXY';

    const upper = new THREE.Mesh(sharedGeoms.armUpper, suitMat);
    upper.position.set(side * 0.014, -0.055, 0.005);
    upper.rotation.z = side * 0.10;
    armGroup.add(upper);

    // Elbow pivot group (allowing realistic two-joint bending)
    const elbowGroup = new THREE.Group();
    elbowGroup.name = side === -1 ? 'leftElbow' : 'rightElbow';
    elbowGroup.position.set(side * 0.020, -0.105, 0.010);
    elbowGroup.rotation.order = 'ZXY';
    armGroup.add(elbowGroup);

    if (side === -1) leftElbowGroup = elbowGroup;
    else rightElbowGroup = elbowGroup;

    const forearm = new THREE.Mesh(sharedGeoms.armForearm, suitMat);
    forearm.position.set(side * 0.004, -0.020, 0.005);
    forearm.rotation.z = side * 0.06;
    elbowGroup.add(forearm);

    const wristCuff = new THREE.Mesh(sharedGeoms.wristCuff, trimMat);
    wristCuff.position.set(side * 0.008, -0.065, 0.008);
    elbowGroup.add(wristCuff);

    const handGroup = new THREE.Group();
    handGroup.name = side === -1 ? 'leftHand' : 'rightHand';
    handGroup.position.set(side * 0.010, -0.093, 0.010);
    handGroup.rotation.order = 'ZXY';
    elbowGroup.add(handGroup);

    if (side === -1) leftHandGroup = handGroup;
    else rightHandGroup = handGroup;

    const palm = new THREE.Mesh(sharedGeoms.handPalm, sharedMaterials.skin);
    handGroup.add(palm);

    const thumb = new THREE.Mesh(sharedGeoms.handThumb, sharedMaterials.skin);
    thumb.position.set(side * -0.013, 0.004, 0.010);
    thumb.rotation.z = side * -0.65;
    thumb.rotation.x = -0.35;
    handGroup.add(thumb);

    [-0.011, -0.004, 0.004, 0.011].forEach((fx, fi) => {
      const finger = new THREE.Mesh(sharedGeoms.handFinger, sharedMaterials.skin);
      finger.position.set(fx, -0.018, 0.004);
      finger.rotation.x = 0.22 + fi * 0.03;
      handGroup.add(finger);
    });

    return armGroup;
  }

  const leftArm = createArm(-1);
  leftArm.name = 'leftArm';
  const rightArm = createArm(1);
  rightArm.name = 'rightArm';
  charGroup.add(leftArm, rightArm);

  // ---------------------------------------------------------------------------
  // 4. Head, Expressive Face, Pointy Ears & Curving Pointy Hat
  // ---------------------------------------------------------------------------
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.48, 0);
  charGroup.add(head);

  const neck = new THREE.Mesh(sharedGeoms.neckCyl, sharedMaterials.skin);
  neck.position.set(0, 0.022, 0);
  head.add(neck);

  const face = new THREE.Mesh(sharedGeoms.headSphere, sharedMaterials.skin);
  face.position.set(0, 0.088, 0);
  head.add(face);

  // Pointy Elf Ears on both sides
  [-1, 1].forEach((side) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.076, 0.092, -0.006);

    const earBase = new THREE.Mesh(sharedGeoms.earBase, sharedMaterials.skin);
    earGroup.add(earBase);

    const earTip = new THREE.Mesh(sharedGeoms.earTip, sharedMaterials.skin);
    earTip.position.set(side * 0.024, 0.015, -0.005);
    earTip.rotation.z = -side * 0.95;
    earTip.rotation.y = -side * 0.25;
    earTip.rotation.x = -0.18;
    earGroup.add(earTip);

    head.add(earGroup);
  });

  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(sharedGeoms.cheekSphere, sharedMaterials.rosyCheek);
    cheek.position.set(side * 0.040, 0.078, 0.065);
    head.add(cheek);
  });

  const nose = new THREE.Mesh(sharedGeoms.noseSphere, sharedMaterials.rosyCheek);
  nose.position.set(0, 0.086, 0.078);
  head.add(nose);

  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(sharedGeoms.eyeSphere, sharedMaterials.darkEye);
    eye.position.set(side * 0.027, 0.104, 0.070);
    head.add(eye);

    const highlight = new THREE.Mesh(sharedGeoms.eyeHighlight, sharedMaterials.whiteFur);
    highlight.position.set(side * 0.025 + 0.002, 0.107, 0.078);
    head.add(highlight);

    const brow = new THREE.Mesh(sharedGeoms.eyebrowGeo, hairMat);
    brow.position.set(side * 0.029, 0.124, 0.070);
    brow.rotation.z = Math.PI / 2 - side * 0.22;
    head.add(brow);
  });

  const smile = new THREE.Mesh(sharedGeoms.smileGeo, sharedMaterials.rosyCheek);
  smile.position.set(0, 0.066, 0.074);
  head.add(smile);

  const hairBack = new THREE.Mesh(sharedGeoms.hairBack, hairMat);
  hairBack.position.set(0, 0.090, -0.008);
  hairBack.rotation.x = -0.28;
  head.add(hairBack);

  [-1, 1].forEach((side) => {
    const sideburn = new THREE.Mesh(sharedGeoms.hairSideburn, hairMat);
    sideburn.position.set(side * 0.068, 0.088, 0.038);
    sideburn.rotation.z = side * 0.14;
    head.add(sideburn);
  });

  const hairFringe = new THREE.Mesh(sharedGeoms.hairFringe, hairMat);
  hairFringe.position.set(0, 0.140, 0.060);
  hairFringe.rotation.z = Math.PI / 2;
  head.add(hairFringe);

  // ---------------------------------------------------------------------------
  // 5. Pointy Hat with Golden Bell
  // ---------------------------------------------------------------------------
  const hatGroup = new THREE.Group();
  hatGroup.name = 'hat';
  hatGroup.position.set(0, 0.132, 0);
  head.add(hatGroup);

  const hatBrim = new THREE.Mesh(sharedGeoms.hatBrim, trimMat);
  hatBrim.rotation.x = -0.10;
  hatGroup.add(hatBrim);

  const hatBase = new THREE.Mesh(sharedGeoms.hatBaseCone, suitMat);
  hatBase.position.set(0, 0.046, -0.012);
  hatBase.rotation.x = -0.16;
  hatGroup.add(hatBase);

  const hatMid = new THREE.Mesh(sharedGeoms.hatMidCone, suitMat);
  hatMid.position.set(0, 0.116, -0.034);
  hatMid.rotation.x = -0.32;
  hatMid.rotation.z = (config.hatTilt || 1) * 0.22;
  hatGroup.add(hatMid);

  const hatTipGroup = new THREE.Group();
  hatTipGroup.name = 'hatTip';
  hatTipGroup.position.set((config.hatTilt || 1) * 0.03, 0.165, -0.058);
  hatTipGroup.rotation.x = -0.55;
  hatTipGroup.rotation.z = (config.hatTilt || 1) * 0.45;
  hatGroup.add(hatTipGroup);

  const hatTip = new THREE.Mesh(sharedGeoms.hatTipCone, suitMat);
  hatTip.position.set(0, 0.055, 0);
  hatTipGroup.add(hatTip);

  const hatBell = new THREE.Mesh(sharedGeoms.bellGeo, sharedMaterials.glowingBell);
  hatBell.position.set(0, 0.124, 0);
  hatTipGroup.add(hatBell);

  const bellRing = new THREE.Mesh(sharedGeoms.bellRing, sharedMaterials.gold);
  bellRing.position.set(0, 0.124, 0);
  hatTipGroup.add(bellRing);

  // Enable shadows
  elfRoot.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return {
    root: elfRoot,
    charGroup,
    torso,
    head,
    hatTipGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    leftShoulder: leftArm,
    rightShoulder: rightArm,
    leftElbow: leftElbowGroup,
    rightElbow: rightElbowGroup,
    leftForearm: leftElbowGroup,
    rightForearm: rightElbowGroup,
    leftHand: leftHandGroup,
    rightHand: rightHandGroup,
    userData: elfRoot.userData,
    config
  };
}
