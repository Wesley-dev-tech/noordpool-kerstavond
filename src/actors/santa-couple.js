import * as THREE from 'three';
import { COLORS, COORDS } from '../config.js';
import { getTerrainHeight } from '../utils/procedural.js';

/**
 * Helper to enable shadow casting and receiving on all meshes within a group.
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
 * Builds Santa Claus (~1.70 m tall) out of primitive geometries with realistic proportions.
 * Each body part (torso, head, leftArm, rightArm, leftLeg, rightLeg) is a separate THREE.Group
 * with natural pivot points at the neck, shoulders, and hips for future animation.
 */
function buildSanta(materials) {
  const santaGroup = new THREE.Group();
  santaGroup.name = 'santa';

  // 1. Legs & Boots (Hip pivot at y = 0.72)
  const leftLeg = new THREE.Group();
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.12, 0.72, 0);
  santaGroup.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.12, 0.72, 0);
  santaGroup.add(rightLeg);

  const trouserGeo = new THREE.CylinderGeometry(0.095, 0.082, 0.42, 14);
  const bootShaftGeo = new THREE.CylinderGeometry(0.084, 0.078, 0.26, 14);
  const bootCuffGeo = new THREE.TorusGeometry(0.084, 0.024, 10, 18);
  bootCuffGeo.rotateX(Math.PI / 2);
  const bootFootGeo = new THREE.SphereGeometry(0.088, 14, 12);
  bootFootGeo.scale(0.95, 0.68, 1.48);
  const bootSoleGeo = new THREE.BoxGeometry(0.16, 0.032, 0.25);

  [leftLeg, rightLeg].forEach((legGroup) => {
    // Red trouser leg
    const trouser = new THREE.Mesh(trouserGeo, materials.redVelvet);
    trouser.position.set(0, -0.19, 0);
    legGroup.add(trouser);

    // White fur cuff at top of boot
    const bootCuff = new THREE.Mesh(bootCuffGeo, materials.whiteFur);
    bootCuff.position.set(0, -0.37, 0);
    legGroup.add(bootCuff);

    // Black leather boot shaft
    const bootShaft = new THREE.Mesh(bootShaftGeo, materials.blackLeather);
    bootShaft.position.set(0, -0.51, 0);
    legGroup.add(bootShaft);

    // Rounded boot foot & sole (bottom touches y = -0.72 => ground y = 0)
    const bootFoot = new THREE.Mesh(bootFootGeo, materials.blackLeather);
    bootFoot.position.set(0, -0.65, 0.045);
    legGroup.add(bootFoot);

    const bootSole = new THREE.Mesh(bootSoleGeo, materials.darkSole);
    bootSole.position.set(0, -0.704, 0.042);
    legGroup.add(bootSole);
  });

  // 2. Torso (Coat, Belly, Fur Trims, Belt & Golden Buckle)
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.72, 0);
  santaGroup.add(torso);

  // Main coat body (flared cylinder + round jolly belly)
  const coatLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.285, 0.42, 20),
    materials.redVelvet
  );
  coatLower.position.set(0, 0.08, 0);
  coatLower.scale.set(1.04, 1.0, 0.92);
  torso.add(coatLower);

  const coatUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.25, 0.44, 20),
    materials.redVelvet
  );
  coatUpper.position.set(0, 0.44, 0);
  coatUpper.scale.set(1.08, 1.0, 0.90);
  torso.add(coatUpper);

  // Jolly rounded belly
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.255, 20, 16),
    materials.redVelvet
  );
  belly.position.set(0, 0.22, 0.045);
  belly.scale.set(1.04, 0.96, 0.96);
  torso.add(belly);

  // Rounded shoulders mantle
  const shoulders = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.11, 0.30, 8, 14),
    materials.redVelvet
  );
  shoulders.rotation.z = Math.PI / 2;
  shoulders.position.set(0, 0.60, 0);
  torso.add(shoulders);

  // White fur bottom coat hem
  const bottomFurHem = new THREE.Mesh(
    new THREE.TorusGeometry(0.275, 0.042, 12, 28),
    materials.whiteFur
  );
  bottomFurHem.rotation.x = Math.PI / 2;
  bottomFurHem.scale.set(1.05, 0.93, 1.0);
  bottomFurHem.position.set(0, -0.11, 0.01);
  torso.add(bottomFurHem);

  // Vertical white fur placket down the front of the coat
  const frontFurStrip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.036, 0.68, 8, 12),
    materials.whiteFur
  );
  frontFurStrip.position.set(0, 0.26, 0.248);
  frontFurStrip.rotation.x = -0.04;
  torso.add(frontFurStrip);

  // White fur collar around neck
  const collarFur = new THREE.Mesh(
    new THREE.TorusGeometry(0.135, 0.038, 10, 20),
    materials.whiteFur
  );
  collarFur.rotation.x = Math.PI / 2 + 0.08;
  collarFur.position.set(0, 0.65, 0.02);
  torso.add(collarFur);

  // Black leather belt around waist
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.262, 0.268, 0.078, 24),
    materials.blackLeather
  );
  belt.position.set(0, 0.19, 0.035);
  belt.scale.set(1.03, 1.0, 0.96);
  torso.add(belt);

  // Golden belt buckle (framed rectangular gold buckle + center prong)
  const buckleGroup = new THREE.Group();
  buckleGroup.position.set(0, 0.19, 0.292);
  torso.add(buckleGroup);

  const buckleFrameH = new THREE.BoxGeometry(0.115, 0.018, 0.022);
  const buckleFrameV = new THREE.BoxGeometry(0.018, 0.095, 0.022);
  const topBar = new THREE.Mesh(buckleFrameH, materials.gold);
  topBar.position.y = 0.038;
  const botBar = new THREE.Mesh(buckleFrameH, materials.gold);
  botBar.position.y = -0.038;
  const leftBar = new THREE.Mesh(buckleFrameV, materials.gold);
  leftBar.position.x = -0.048;
  const rightBar = new THREE.Mesh(buckleFrameV, materials.gold);
  rightBar.position.x = 0.048;
  const prong = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.024), materials.gold);
  prong.position.set(0.01, 0, 0.004);
  buckleGroup.add(topBar, botBar, leftBar, rightBar, prong);

  // 3. Left & Right Arms (Shoulder pivots at y = 1.30, x = ±0.27)
  const upperArmGeo = new THREE.CapsuleGeometry(0.068, 0.20, 8, 12);
  const forearmGeo = new THREE.CapsuleGeometry(0.060, 0.18, 8, 12);
  const cuffFurGeo = new THREE.TorusGeometry(0.066, 0.026, 10, 16);
  cuffFurGeo.rotateX(Math.PI / 2);
  const glovePalmGeo = new THREE.SphereGeometry(0.062, 12, 12);
  glovePalmGeo.scale(0.88, 1.18, 0.78);
  const gloveThumbGeo = new THREE.CapsuleGeometry(0.022, 0.035, 6, 8);

  function createSantaArm(name, side) {
    const armGroup = new THREE.Group();
    armGroup.name = name;
    armGroup.position.set(side * 0.275, 1.30, 0.0);
    // Use ZXY order so local X pitch (forward) is applied before Z abduction (raising outward)
    armGroup.rotation.order = 'ZXY';

    // Upper sleeve
    const upperArm = new THREE.Mesh(upperArmGeo, materials.redVelvet);
    upperArm.position.set(side * 0.03, -0.12, 0.01);
    upperArm.rotation.z = side * 0.14;
    armGroup.add(upperArm);

    // Lower sleeve angled slightly forward
    const forearm = new THREE.Mesh(forearmGeo, materials.redVelvet);
    forearm.position.set(side * 0.055, -0.32, 0.055);
    forearm.rotation.x = -0.28;
    forearm.rotation.z = side * 0.06;
    armGroup.add(forearm);

    // White fur cuff at wrist
    const wristCuff = new THREE.Mesh(cuffFurGeo, materials.whiteFur);
    wristCuff.position.set(side * 0.062, -0.43, 0.09);
    wristCuff.rotation.x = Math.PI / 2 - 0.28;
    armGroup.add(wristCuff);

    // White glove (mitten + thumb)
    const glove = new THREE.Mesh(glovePalmGeo, materials.whiteGlove);
    glove.position.set(side * 0.065, -0.51, 0.115);
    glove.rotation.x = -0.28;
    armGroup.add(glove);

    const thumb = new THREE.Mesh(gloveThumbGeo, materials.whiteGlove);
    thumb.position.set(side * 0.025, -0.49, 0.145);
    thumb.rotation.z = side * 0.6;
    thumb.rotation.x = -0.4;
    armGroup.add(thumb);

    return armGroup;
  }

  // Santa faces +Z, so his anatomical right arm (outer arm away from Mrs. Claus) is at -X (side = -1)
  // and his anatomical left arm (inner arm next to Mrs. Claus) is at +X (side = 1)
  const rightArm = createSantaArm('rightArm', -1);
  const leftArm = createSantaArm('leftArm', 1);
  santaGroup.add(leftArm, rightArm);

  // 4. Head (Neck pivot at y = 1.36; total height to hat tip ~1.70 m)
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.36, 0.01);
  santaGroup.add(head);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.075, 0.08, 12),
    materials.skin
  );
  neck.position.set(0, 0.03, 0);
  head.add(neck);

  // Cranium / Face sphere
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 20, 18),
    materials.skin
  );
  skull.position.set(0, 0.135, 0);
  skull.scale.set(0.96, 1.04, 0.98);
  head.add(skull);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.028, 10, 10);
  earGeo.scale(0.55, 1.15, 0.8);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeo, materials.skin);
    ear.position.set(side * 0.118, 0.135, 0.0);
    head.add(ear);
  });

  // Rosy Cheeks
  const cheekGeo = new THREE.SphereGeometry(0.034, 12, 10);
  cheekGeo.scale(1.1, 0.85, 0.65);
  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(cheekGeo, materials.rosyCheek);
    cheek.position.set(side * 0.068, 0.118, 0.102);
    head.add(cheek);
  });

  // Jolly Nose
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.026, 12, 12),
    materials.rosyCheek
  );
  nose.position.set(0, 0.132, 0.128);
  head.add(nose);

  // Eyes & White Eyebrows
  const eyeGeo = new THREE.SphereGeometry(0.014, 10, 10);
  const browGeo = new THREE.CapsuleGeometry(0.009, 0.028, 6, 8);
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(eyeGeo, materials.darkEye);
    eye.position.set(side * 0.044, 0.158, 0.112);
    head.add(eye);

    const brow = new THREE.Mesh(browGeo, materials.whiteHair);
    brow.position.set(side * 0.046, 0.184, 0.114);
    brow.rotation.z = Math.PI / 2 - side * 0.12;
    head.add(brow);
  });

  // White hair at back and sides of head
  const backHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.128, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
    materials.whiteHair
  );
  backHair.position.set(0, 0.138, -0.012);
  backHair.rotation.x = -0.35;
  head.add(backHair);

  // Full Volumetric White Beard (layered spheres + sculpted lower beard cone)
  const beardGroup = new THREE.Group();
  beardGroup.name = 'beard';
  head.add(beardGroup);

  const beardMain = new THREE.Mesh(
    new THREE.SphereGeometry(0.118, 18, 14),
    materials.whiteHair
  );
  beardMain.position.set(0, 0.045, 0.052);
  beardMain.scale.set(1.06, 1.15, 0.92);
  beardGroup.add(beardMain);

  const beardTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.105, 0.22, 16),
    materials.whiteHair
  );
  beardTip.rotation.x = Math.PI - 0.18;
  beardTip.position.set(0, -0.065, 0.072);
  beardTip.scale.set(1.08, 1.0, 0.78);
  beardGroup.add(beardTip);

  const beardBottomRound = new THREE.Mesh(
    new THREE.SphereGeometry(0.052, 12, 10),
    materials.whiteHair
  );
  beardBottomRound.position.set(0, -0.145, 0.088);
  beardGroup.add(beardBottomRound);

  // Sideburns connecting beard to hair
  const sideburnGeo = new THREE.SphereGeometry(0.052, 10, 10);
  sideburnGeo.scale(0.65, 1.35, 0.85);
  [-1, 1].forEach((side) => {
    const sb = new THREE.Mesh(sideburnGeo, materials.whiteHair);
    sb.position.set(side * 0.092, 0.095, 0.048);
    beardGroup.add(sb);
  });

  // Full Handlebar Moustache
  const moustacheGeo = new THREE.CapsuleGeometry(0.020, 0.048, 8, 10);
  [-1, 1].forEach((side) => {
    const stache = new THREE.Mesh(moustacheGeo, materials.whiteHair);
    stache.position.set(side * 0.036, 0.098, 0.118);
    stache.rotation.z = Math.PI / 2 + side * 0.28;
    stache.rotation.y = -side * 0.22;
    beardGroup.add(stache);
  });

  // Santa Hat with White Fur Brim & Pompon
  const hatGroup = new THREE.Group();
  hatGroup.name = 'hat';
  hatGroup.position.set(0, 0.20, 0);
  head.add(hatGroup);

  const hatBrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.122, 0.034, 12, 24),
    materials.whiteFur
  );
  hatBrim.rotation.x = Math.PI / 2 - 0.08;
  hatGroup.add(hatBrim);

  const hatLowerCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.122, 0.12, 16),
    materials.redVelvet
  );
  hatLowerCone.position.set(0.01, 0.055, -0.008);
  hatLowerCone.rotation.z = -0.18;
  hatLowerCone.rotation.x = -0.12;
  hatGroup.add(hatLowerCone);

  const hatUpperCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.066, 0.15, 14),
    materials.redVelvet
  );
  hatUpperCone.position.set(0.062, 0.105, -0.028);
  hatUpperCone.rotation.z = -1.05;
  hatUpperCone.rotation.x = -0.25;
  hatGroup.add(hatUpperCone);

  const pompon = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 14, 12),
    materials.whiteFur
  );
  pompon.position.set(0.135, 0.095, -0.048);
  hatGroup.add(pompon);

  enableShadows(santaGroup);
  return {
    group: santaGroup,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg
  };
}

/**
 * Builds Mrs. Claus (~1.60 m tall) out of primitive geometries with realistic proportions:
 * long red dress with white fur trim, festive apron, warm shawl, grey hair in a bun,
 * gold-rimmed glasses, and a small fur-trimmed cap.
 */
function buildMrsClaus(materials) {
  const mrsGroup = new THREE.Group();
  mrsGroup.name = 'mrsClaus';

  // 1. Legs & Boots under the long dress (Hip pivot at y = 0.68)
  const leftLeg = new THREE.Group();
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.09, 0.68, 0);
  mrsGroup.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.09, 0.68, 0);
  mrsGroup.add(rightLeg);

  const legShaftGeo = new THREE.CylinderGeometry(0.062, 0.055, 0.56, 12);
  const shoeGeo = new THREE.SphereGeometry(0.072, 12, 10);
  shoeGeo.scale(0.88, 0.65, 1.42);
  const soleGeo = new THREE.BoxGeometry(0.125, 0.026, 0.21);

  [leftLeg, rightLeg].forEach((legGroup) => {
    const shaft = new THREE.Mesh(legShaftGeo, materials.blackLeather);
    shaft.position.set(0, -0.32, 0);
    legGroup.add(shaft);

    const shoe = new THREE.Mesh(shoeGeo, materials.blackLeather);
    shoe.position.set(0, -0.625, 0.04);
    legGroup.add(shoe);

    const sole = new THREE.Mesh(soleGeo, materials.darkSole);
    sole.position.set(0, -0.667, 0.038);
    legGroup.add(sole);
  });

  // 2. Torso (Long Red Dress with White Fur Trim, Apron, and Shawl)
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.68, 0);
  mrsGroup.add(torso);

  // Long flared red skirt reaching down near the ankles (y = -0.61 in torso space => y = 0.07 world)
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.345, 0.72, 24),
    materials.redVelvet
  );
  skirt.position.set(0, -0.25, 0);
  skirt.scale.set(1.02, 1.0, 0.94);
  torso.add(skirt);

  // White fur trim along bottom of the long red dress
  const skirtFurHem = new THREE.Mesh(
    new THREE.TorusGeometry(0.338, 0.038, 12, 28),
    materials.whiteFur
  );
  skirtFurHem.rotation.x = Math.PI / 2;
  skirtFurHem.scale.set(1.02, 0.94, 1.0);
  skirtFurHem.position.set(0, -0.59, 0);
  torso.add(skirtFurHem);

  // Upper bodice
  const bodice = new THREE.Mesh(
    new THREE.CylinderGeometry(0.175, 0.19, 0.42, 20),
    materials.redVelvet
  );
  bodice.position.set(0, 0.30, 0);
  bodice.scale.set(1.04, 1.0, 0.88);
  torso.add(bodice);

  const bust = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 16, 14),
    materials.redVelvet
  );
  bust.position.set(0, 0.34, 0.03);
  bust.scale.set(1.04, 0.88, 0.88);
  torso.add(bust);

  // Apron (Crisp white apron with green festive trim & waist bow)
  const apronGroup = new THREE.Group();
  apronGroup.name = 'apron';
  torso.add(apronGroup);

  // Curved apron skirt panel over front of dress
  const apronSkirtGeo = new THREE.CylinderGeometry(
    0.192,
    0.322,
    0.54,
    18,
    1,
    true,
    -Math.PI * 0.30,
    Math.PI * 0.60
  );
  const apronSkirt = new THREE.Mesh(apronSkirtGeo, materials.apronCloth);
  apronSkirt.position.set(0, -0.18, 0.012);
  apronSkirt.scale.set(1.02, 1.0, 0.95);
  apronGroup.add(apronSkirt);

  // Apron bib on upper chest
  const apronBib = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.20, 0.025),
    materials.apronCloth
  );
  apronBib.position.set(0, 0.22, 0.172);
  apronBib.rotation.x = -0.06;
  apronGroup.add(apronBib);

  // Apron waistband & back bow
  const apronWaistband = new THREE.Mesh(
    new THREE.CylinderGeometry(0.192, 0.198, 0.045, 20),
    materials.apronGreenTrim
  );
  apronWaistband.position.set(0, 0.10, 0.005);
  apronWaistband.scale.set(1.03, 1.0, 0.90);
  apronGroup.add(apronWaistband);

  // Shawl (Omslagdoek) draped warmly over shoulders and upper chest
  const shawlGroup = new THREE.Group();
  shawlGroup.name = 'shawl';
  torso.add(shawlGroup);

  const shawlMantle = new THREE.Mesh(
    new THREE.ConeGeometry(0.285, 0.26, 20, 1, true),
    materials.shawlGreen
  );
  shawlMantle.position.set(0, 0.45, 0);
  shawlMantle.scale.set(1.08, 1.0, 0.92);
  shawlGroup.add(shawlMantle);

  const shawlShoulderRoll = new THREE.Mesh(
    new THREE.TorusGeometry(0.195, 0.045, 12, 24),
    materials.shawlGreen
  );
  shawlShoulderRoll.rotation.x = Math.PI / 2 + 0.08;
  shawlShoulderRoll.scale.set(1.15, 0.92, 1.0);
  shawlShoulderRoll.position.set(0, 0.48, 0.01);
  shawlGroup.add(shawlShoulderRoll);

  // White fur collar border on shawl
  const shawlCollarFur = new THREE.Mesh(
    new THREE.TorusGeometry(0.118, 0.030, 10, 20),
    materials.whiteFur
  );
  shawlCollarFur.rotation.x = Math.PI / 2 + 0.1;
  shawlCollarFur.position.set(0, 0.54, 0.015);
  shawlGroup.add(shawlCollarFur);

  // Golden brooch pinning the shawl at the front
  const brooch = new THREE.Mesh(
    new THREE.SphereGeometry(0.024, 10, 10),
    materials.gold
  );
  brooch.scale.set(1.2, 0.9, 0.5);
  brooch.position.set(0, 0.44, 0.195);
  shawlGroup.add(brooch);

  // 3. Left & Right Arms (Shoulder pivots at y = 1.18, x = ±0.225)
  const mrsUpperArmGeo = new THREE.CapsuleGeometry(0.055, 0.18, 8, 12);
  const mrsForearmGeo = new THREE.CapsuleGeometry(0.048, 0.16, 8, 12);
  const mrsCuffFurGeo = new THREE.TorusGeometry(0.054, 0.022, 10, 16);
  mrsCuffFurGeo.rotateX(Math.PI / 2);
  const mrsHandGeo = new THREE.SphereGeometry(0.048, 12, 10);
  mrsHandGeo.scale(0.85, 1.15, 0.75);

  function createMrsArm(name, side) {
    const armGroup = new THREE.Group();
    armGroup.name = name;
    armGroup.position.set(side * 0.225, 1.18, 0.0);

    const upperArm = new THREE.Mesh(mrsUpperArmGeo, materials.redVelvet);
    upperArm.position.set(side * 0.025, -0.10, 0.01);
    upperArm.rotation.z = -side * 0.15;
    armGroup.add(upperArm);

    const forearm = new THREE.Mesh(mrsForearmGeo, materials.redVelvet);
    forearm.position.set(side * 0.035, -0.27, 0.06);
    forearm.rotation.x = -0.35;
    forearm.rotation.z = side * 0.08;
    armGroup.add(forearm);

    const wristCuff = new THREE.Mesh(mrsCuffFurGeo, materials.whiteFur);
    wristCuff.position.set(side * 0.028, -0.36, 0.098);
    wristCuff.rotation.x = Math.PI / 2 - 0.35;
    armGroup.add(wristCuff);

    const hand = new THREE.Mesh(mrsHandGeo, materials.whiteGlove);
    hand.position.set(side * 0.022, -0.43, 0.125);
    hand.rotation.x = -0.35;
    armGroup.add(hand);

    return armGroup;
  }

  const leftArm = createMrsArm('leftArm', -1);
  const rightArm = createMrsArm('rightArm', 1);
  mrsGroup.add(leftArm, rightArm);

  // 4. Head (Neck pivot at y = 1.24; total height to hat/bun ~1.60 m)
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.24, 0.01);
  mrsGroup.add(head);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.060, 0.08, 12),
    materials.skin
  );
  neck.position.set(0, 0.03, 0);
  head.add(neck);

  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.112, 20, 18),
    materials.skin
  );
  skull.position.set(0, 0.128, 0);
  skull.scale.set(0.95, 1.04, 0.96);
  head.add(skull);

  // Rosy cheeks & gentle nose
  const cheekGeo = new THREE.SphereGeometry(0.028, 12, 10);
  cheekGeo.scale(1.1, 0.85, 0.6);
  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(cheekGeo, materials.rosyCheek);
    cheek.position.set(side * 0.058, 0.112, 0.092);
    head.add(cheek);
  });

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.019, 10, 10),
    materials.rosyCheek
  );
  nose.position.set(0, 0.125, 0.112);
  head.add(nose);

  // Warm smile
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.024, 0.005, 8, 12, Math.PI),
    materials.rosyCheek
  );
  smile.rotation.x = Math.PI + 0.15;
  smile.position.set(0, 0.095, 0.104);
  head.add(smile);

  // Eyes & Silver-grey Eyebrows
  const eyeGeo = new THREE.SphereGeometry(0.012, 10, 10);
  const browGeo = new THREE.CapsuleGeometry(0.006, 0.022, 6, 8);
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(eyeGeo, materials.darkEye);
    eye.position.set(side * 0.038, 0.146, 0.100);
    head.add(eye);

    const brow = new THREE.Mesh(browGeo, materials.greyHair);
    brow.position.set(side * 0.040, 0.170, 0.100);
    brow.rotation.z = Math.PI / 2 - side * 0.1;
    head.add(brow);
  });

  // Gold-rimmed Glasses (Bril)
  const glassesGroup = new THREE.Group();
  glassesGroup.name = 'glasses';
  glassesGroup.position.set(0, 0.144, 0.108);
  head.add(glassesGroup);

  const lensRimGeo = new THREE.TorusGeometry(0.024, 0.0045, 8, 18);
  const lensGlassGeo = new THREE.CircleGeometry(0.022, 14);
  [-1, 1].forEach((side) => {
    const rim = new THREE.Mesh(lensRimGeo, materials.gold);
    rim.position.set(side * 0.038, 0, 0);
    glassesGroup.add(rim);

    const glass = new THREE.Mesh(lensGlassGeo, materials.lensGlass);
    glass.position.set(side * 0.038, 0, 0.001);
    glassesGroup.add(glass);

    // Temple arms going back toward ears
    const temple = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.085, 6),
      materials.gold
    );
    temple.rotation.x = Math.PI / 2;
    temple.position.set(side * 0.062, 0, -0.042);
    glassesGroup.add(temple);
  });

  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, 0.028, 6),
    materials.gold
  );
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.004, 0.002);
  glassesGroup.add(bridge);

  // Grey Hair in a Bun (Grijs haar in een knotje)
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hair';
  head.add(hairGroup);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.118, 18, 14),
    materials.greyHair
  );
  hairCap.position.set(0, 0.142, -0.014);
  hairCap.scale.set(0.98, 1.02, 0.98);
  hairGroup.add(hairCap);

  // Soft front hair waves framing the forehead
  const hairWaveGeo = new THREE.CapsuleGeometry(0.028, 0.055, 8, 10);
  [-1, 1].forEach((side) => {
    const wave = new THREE.Mesh(hairWaveGeo, materials.greyHair);
    wave.position.set(side * 0.062, 0.195, 0.065);
    wave.rotation.z = side * 1.05;
    wave.rotation.y = -side * 0.35;
    hairGroup.add(wave);
  });

  // Hair bun (knotje) at upper back of head
  const hairBun = new THREE.Mesh(
    new THREE.SphereGeometry(0.062, 16, 14),
    materials.greyHair
  );
  hairBun.position.set(0, 0.215, -0.105);
  hairBun.scale.set(1.05, 0.95, 0.95);
  hairGroup.add(hairBun);

  const bunRibbon = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.010, 8, 16),
    materials.redVelvet
  );
  bunRibbon.position.set(0, 0.205, -0.082);
  bunRibbon.rotation.x = 0.55;
  hairGroup.add(bunRibbon);

  // Small Hat (Klein mutsje — festive red bonnet/cap with white fur trim & small pompon)
  const hatGroup = new THREE.Group();
  hatGroup.name = 'hat';
  hatGroup.position.set(0, 0.228, 0.008);
  hatGroup.rotation.x = -0.12;
  head.add(hatGroup);

  const smallHatBrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.088, 0.024, 10, 22),
    materials.whiteFur
  );
  smallHatBrim.rotation.x = Math.PI / 2;
  hatGroup.add(smallHatBrim);

  const smallHatCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.086, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    materials.redVelvet
  );
  smallHatCrown.position.set(0, -0.005, 0);
  smallHatCrown.scale.set(1.0, 1.15, 1.0);
  hatGroup.add(smallHatCrown);

  const smallPompon = new THREE.Mesh(
    new THREE.SphereGeometry(0.026, 12, 10),
    materials.whiteFur
  );
  smallPompon.position.set(0, 0.102, -0.01);
  hatGroup.add(smallPompon);

  enableShadows(mrsGroup);
  return {
    group: mrsGroup,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg
  };
}

/**
 * Places Santa Claus (~1.7 m) and Mrs. Claus (~1.6 m) together on the porch of the workshop,
 * facing the camera, with articulated body part groups, idle animations, and raycast interactions.
 */
export function createSantaCouple(scene, interaction = null, audio = null) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'santaCoupleGroup';

  // Shared realistic MeshStandardMaterials matching the scene's lighting
  const materials = {
    redVelvet: new THREE.MeshStandardMaterial({
      color: COLORS.POLE_RED,
      roughness: 0.72,
      metalness: 0.04
    }),
    whiteFur: new THREE.MeshStandardMaterial({
      color: 0xf7faff,
      emissive: COLORS.SNOW_SHADOW_EMISSIVE,
      emissiveIntensity: 0.15,
      roughness: 0.88,
      metalness: 0.02
    }),
    whiteHair: new THREE.MeshStandardMaterial({
      color: 0xf4f7fc,
      emissive: COLORS.SNOW_SHADOW_EMISSIVE,
      emissiveIntensity: 0.12,
      roughness: 0.78,
      metalness: 0.02
    }),
    greyHair: new THREE.MeshStandardMaterial({
      color: 0xbec5d1,
      roughness: 0.72,
      metalness: 0.06
    }),
    whiteGlove: new THREE.MeshStandardMaterial({
      color: 0xf5f8fd,
      roughness: 0.65,
      metalness: 0.03
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
      color: COLORS.GOLD_METAL,
      roughness: 0.24,
      metalness: 0.88
    }),
    skin: new THREE.MeshStandardMaterial({
      color: 0xf4c2a4,
      roughness: 0.58,
      metalness: 0.02
    }),
    rosyCheek: new THREE.MeshStandardMaterial({
      color: 0xe46b6b,
      roughness: 0.52,
      metalness: 0.02
    }),
    darkEye: new THREE.MeshStandardMaterial({
      color: 0x141821,
      roughness: 0.22,
      metalness: 0.1
    }),
    apronCloth: new THREE.MeshStandardMaterial({
      color: 0xf7f9fc,
      roughness: 0.74,
      metalness: 0.02,
      side: THREE.DoubleSide
    }),
    apronGreenTrim: new THREE.MeshStandardMaterial({
      color: 0x1f6b3b,
      roughness: 0.68,
      metalness: 0.04
    }),
    shawlGreen: new THREE.MeshStandardMaterial({
      color: 0x1c5c35,
      roughness: 0.80,
      metalness: 0.03,
      side: THREE.DoubleSide
    }),
    lensGlass: new THREE.MeshStandardMaterial({
      color: 0xdceeff,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    })
  };

  const santa = buildSanta(materials);
  const mrsClaus = buildMrsClaus(materials);

  // Compute the exact left-side mirror of the snowman's position in front of the workshop:
  // Snowman is at local (+3.02, +5.51) relative to workshop; Santa & Mrs. Claus stand at (-3.02, +5.51)
  const ws = COORDS.workshop;
  const sm = COORDS.snowman;
  const cosR = Math.cos(ws.rotY);
  const sinR = Math.sin(ws.rotY);

  const dx = sm.x - ws.x;
  const dz = sm.z - ws.z;
  const snowmanLocalX = dx * cosR - dz * sinR; // ~ +3.02 (right side in front of workshop)
  const snowmanLocalZ = dx * sinR + dz * cosR; // ~ +5.51 (in front of the porch)

  const coupleLocalX = -snowmanLocalX; // Mirror to left side in front of the workshop
  const coupleLocalZ = snowmanLocalZ;  // Same forward distance from workshop as snowman

  const coupleWorldX = ws.x + coupleLocalX * cosR + coupleLocalZ * sinR;
  const coupleWorldZ = ws.z - coupleLocalX * sinR + coupleLocalZ * cosR;
  const coupleGroundY = getTerrainHeight(coupleWorldX, coupleWorldZ);

  rootGroup.position.set(coupleWorldX, coupleGroundY, coupleWorldZ);

  // Orient the couple to face forward in front of the workshop and slightly toward the camera
  const coupleRotY = COORDS.santaCouple ? COORDS.santaCouple.rotY : 0.58;
  rootGroup.rotation.y = coupleRotY;

  const cosC = Math.cos(coupleRotY);
  const sinC = Math.sin(coupleRotY);

  // Position Santa on the left and Mrs. Claus on the right, resting flush on the local snow slope
  const santaOffsetX = -0.38;
  const santaOffsetZ = 0.0;
  const santaWorldX = coupleWorldX + santaOffsetX * cosC + santaOffsetZ * sinC;
  const santaWorldZ = coupleWorldZ - santaOffsetX * sinC + santaOffsetZ * cosC;
  const santaLocalY = getTerrainHeight(santaWorldX, santaWorldZ) - coupleGroundY;

  santa.group.position.set(santaOffsetX, santaLocalY, santaOffsetZ);
  santa.group.rotation.y = 0.08;

  const mrsOffsetX = 0.38;
  const mrsOffsetZ = 0.02;
  const mrsWorldX = coupleWorldX + mrsOffsetX * cosC + mrsOffsetZ * sinC;
  const mrsWorldZ = coupleWorldZ - mrsOffsetX * sinC + mrsOffsetZ * cosC;
  const mrsLocalY = getTerrainHeight(mrsWorldX, mrsWorldZ) - coupleGroundY;

  mrsClaus.group.position.set(mrsOffsetX, mrsLocalY, mrsOffsetZ);
  mrsClaus.group.rotation.y = -0.08;

  rootGroup.add(santa.group, mrsClaus.group);
  scene.add(rootGroup);

  // World-space positions for raycast focus & floating 3D speech bubbles
  const santaWorldY = coupleGroundY + santaLocalY;
  const mrsWorldY = coupleGroundY + mrsLocalY;
  const coupleFrontDir = new THREE.Vector3(Math.sin(coupleRotY), 0, Math.cos(coupleRotY));

  const santaTooltipPos = new THREE.Vector3(santaWorldX, santaWorldY + 1.88, santaWorldZ);
  const mrsTooltipPos = new THREE.Vector3(mrsWorldX, mrsWorldY + 1.78, mrsWorldZ);

  const santaGlowMeshes = [];
  santa.torso.traverse((child) => {
    if (child.isMesh) santaGlowMeshes.push(child);
  });
  santa.head.traverse((child) => {
    if (child.isMesh) santaGlowMeshes.push(child);
  });

  const mrsGlowMeshes = [];
  mrsClaus.torso.traverse((child) => {
    if (child.isMesh) mrsGlowMeshes.push(child);
  });
  mrsClaus.head.traverse((child) => {
    if (child.isMesh) mrsGlowMeshes.push(child);
  });

  // Animation timers for click-triggered gestures in addition to periodic autonomous cycles
  let santaClickWaveTimer = 0;
  let mrsClickTurnTimer = 0;

  if (interaction) {
    interaction.registerClickable(santa.group, {
      id: 'santaClaus',
      label: 'Kerstman 🎅',
      glowMeshes: santaGlowMeshes,
      focusTarget: new THREE.Vector3(santaWorldX, santaWorldY + 1.05, santaWorldZ),
      focusDistance: 2.7,
      focusHeightOffset: 0.25,
      preferredDir: coupleFrontDir,
      preferredWeight: 0.85,
      onClick: () => {
        santaClickWaveTimer = 3.0;
        interaction.showTooltip('Ho ho ho! Vrolijk kerstfeest!', santaTooltipPos, 3.0);
        if (audio) audio.playChime(0.9);
      }
    });

    interaction.registerClickable(mrsClaus.group, {
      id: 'mrsClaus',
      label: 'Kerstvrouw 🤶',
      glowMeshes: mrsGlowMeshes,
      focusTarget: new THREE.Vector3(mrsWorldX, mrsWorldY + 1.0, mrsWorldZ),
      focusDistance: 2.7,
      focusHeightOffset: 0.25,
      preferredDir: coupleFrontDir,
      preferredWeight: 0.85,
      onClick: () => {
        mrsClickTurnTimer = 3.0;
        interaction.showTooltip('Wie wil er warme chocomelk?', mrsTooltipPos, 3.0);
        if (audio) audio.playChime(1.2);
      }
    });
  }

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function update(delta, elapsed) {
    // 1. Subtle breathing animation (torso & upper body scale gently up and down)
    const santaBreath = Math.sin(elapsed * 2.1);
    santa.torso.scale.set(
      1.0 + santaBreath * 0.014,
      1.0 + santaBreath * 0.022,
      1.0 + santaBreath * 0.018
    );
    santa.head.position.y = 1.36 + santaBreath * 0.008;
    santa.leftArm.position.y = 1.30 + santaBreath * 0.007;
    santa.rightArm.position.y = 1.30 + santaBreath * 0.007;

    const mrsBreath = Math.sin(elapsed * 2.35 + 1.2);
    mrsClaus.torso.scale.set(
      1.0 + mrsBreath * 0.012,
      1.0 + mrsBreath * 0.020,
      1.0 + mrsBreath * 0.015
    );
    mrsClaus.head.position.y = 1.24 + mrsBreath * 0.006;
    mrsClaus.leftArm.position.y = 1.18 + mrsBreath * 0.005;
    mrsClaus.rightArm.position.y = 1.18 + mrsBreath * 0.005;

    // 2. Santa occasionally waves his right arm (every ~9s for ~2.8s, or immediately when clicked)
    let waveWeight = 0;
    const waveCycle = (elapsed + 2.5) % 9.0;
    if (waveCycle < 2.8) {
      waveWeight = smoothstep(0.0, 0.45, waveCycle) * (1.0 - smoothstep(2.3, 2.8, waveCycle));
    }
    if (santaClickWaveTimer > 0) {
      santaClickWaveTimer = Math.max(0, santaClickWaveTimer - delta);
      const clickElapsed = 3.0 - santaClickWaveTimer;
      const clickWeight =
        smoothstep(0.0, 0.3, clickElapsed) * (1.0 - smoothstep(2.5, 3.0, clickElapsed));
      waveWeight = Math.max(waveWeight, clickWeight);
    }

    const waveOsc = Math.sin(elapsed * 8.5);
    santa.rightArm.rotation.z = waveWeight * (-2.15 + waveOsc * 0.32);
    santa.rightArm.rotation.x = waveWeight * (-0.35 + Math.cos(elapsed * 8.5) * 0.08);
    santa.leftArm.rotation.z = Math.sin(elapsed * 1.4) * 0.03;

    // Subtle jolly head nod while waving or breathing
    santa.head.rotation.y = Math.sin(elapsed * 0.65) * 0.06 + waveWeight * 0.08;
    santa.head.rotation.z = waveWeight * Math.sin(elapsed * 4.25) * 0.05;

    // 3. Mrs. Claus occasionally turns her head affectionately toward Santa (on her right => -Y rotation)
    let turnWeight = 0;
    const turnCycle = (elapsed + 5.0) % 10.5;
    if (turnCycle < 3.6) {
      turnWeight = smoothstep(0.0, 0.65, turnCycle) * (1.0 - smoothstep(2.9, 3.6, turnCycle));
    }
    if (mrsClickTurnTimer > 0) {
      mrsClickTurnTimer = Math.max(0, mrsClickTurnTimer - delta);
      const clickTurnElapsed = 3.0 - mrsClickTurnTimer;
      const clickTurnWeight =
        smoothstep(0.0, 0.45, clickTurnElapsed) * (1.0 - smoothstep(2.4, 3.0, clickTurnElapsed));
      turnWeight = Math.max(turnWeight, clickTurnWeight);
    }

    const idleHeadSway = Math.sin(elapsed * 0.75) * 0.04;
    mrsClaus.head.rotation.y = idleHeadSway * (1.0 - turnWeight) - turnWeight * 0.56;
    mrsClaus.head.rotation.x = -turnWeight * 0.07 + mrsBreath * 0.015;
    mrsClaus.head.rotation.z = turnWeight * 0.06;

    // Gentle idle arm movement for Mrs. Claus
    mrsClaus.leftArm.rotation.z = -Math.sin(elapsed * 1.5 + 0.5) * 0.025;
    mrsClaus.rightArm.rotation.z = Math.sin(elapsed * 1.5 + 0.5) * 0.025;
  }

  return {
    group: rootGroup,
    santa,
    mrsClaus,
    update
  };
}
