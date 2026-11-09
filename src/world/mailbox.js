import * as THREE from 'three';
import { COLORS, COORDS } from '../config.js';
import { createWoodTexture, createSnowflakeSprite, getTerrainHeight } from '../utils/procedural.js';

/**
 * Generates a high-resolution CanvasTexture for the "POST VOOR DE KERSTMAN" sign
 * in the same warm wood-and-gold style as the North Pole and Workshop signs.
 */
function createMailboxSignTexture(text = 'POST VOOR DE KERSTMAN', subtext = 'NOORDPOOL · EXPEDITE') {
  const width = 1024;
  const height = 320;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Rich dark wood background
  ctx.fillStyle = '#4a2c18';
  ctx.fillRect(0, 0, width, height);

  // Subtle wood grain lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.lineWidth = 3;
  for (let y = 12; y < height; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(width * 0.33, y + 6, width * 0.66, y - 6, width, y + 3);
    ctx.stroke();
  }

  // Outer & inner decorative gold border
  const inset = 18;
  ctx.strokeStyle = '#ffcc33';
  ctx.lineWidth = 8;
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  ctx.strokeStyle = 'rgba(255, 217, 102, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(inset + 12, inset + 12, width - (inset + 12) * 2, height - (inset + 12) * 2);

  // Corner gold rivets on sign
  const cornerOffset = inset + 24;
  const corners = [
    [cornerOffset, cornerOffset],
    [width - cornerOffset, cornerOffset],
    [cornerOffset, height - cornerOffset],
    [width - cornerOffset, height - cornerOffset]
  ];
  ctx.fillStyle = '#ffcc33';
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  const maxTextWidth = width - 140;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.68)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  let fontSize = subtext ? 54 : 60;
  ctx.font = `bold ${fontSize}px Georgia, serif`;
  while (ctx.measureText(text).width > maxTextWidth && fontSize > 24) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px Georgia, serif`;
  }

  ctx.fillStyle = '#fff6e0';
  ctx.fillText(text, width * 0.5, subtext ? 118 : height * 0.5, maxTextWidth);

  if (subtext) {
    let subFontSize = 36;
    ctx.font = `bold ${subFontSize}px sans-serif`;
    while (ctx.measureText(subtext).width > maxTextWidth && subFontSize > 18) {
      subFontSize -= 2;
      ctx.font = `bold ${subFontSize}px sans-serif`;
    }
    ctx.fillStyle = '#ffd966';
    ctx.fillText(subtext, width * 0.5, 212, maxTextWidth);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Builds a classic red North Pole mailbox on a wooden post out of primitive shapes,
 * placed beside the path between the North Pole pole and Santa's Workshop.
 */
export function createMailbox(scene, interaction = null, audio = null) {
  const group = new THREE.Group();
  group.name = 'mailboxGroup';

  // Position beside the path between North Pole (0, 0, 0) and Workshop (-10, 0, -7)
  const posX = -3.1;
  const posZ = -1.75;
  const groundY = getTerrainHeight(posX, posZ);
  const rotY = 0.48; // Angled naturally toward the path and camera

  group.position.set(posX, groundY, posZ);
  group.rotation.y = rotY;

  // Materials matching the scene's realistic lighting
  const woodTex = createWoodTexture();
  const postWoodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: COLORS.WOOD_WARM,
    roughness: 0.8,
    metalness: 0.05
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: COLORS.WOOD_DARK,
    roughness: 0.76,
    metalness: 0.06
  });
  const redMetalMat = new THREE.MeshStandardMaterial({
    color: COLORS.POLE_RED,
    roughness: 0.28,
    metalness: 0.35
  });
  const flagRedMat = new THREE.MeshStandardMaterial({
    color: 0xff2424,
    emissive: 0x330505,
    emissiveIntensity: 0.2,
    roughness: 0.32,
    metalness: 0.25
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: COLORS.GOLD_METAL,
    roughness: 0.22,
    metalness: 0.88,
    emissive: 0x442800,
    emissiveIntensity: 0.18
  });
  const darkInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x160b08,
    roughness: 0.9,
    metalness: 0.1
  });
  const letterPaperMat = new THREE.MeshStandardMaterial({
    color: 0xfbf8f0,
    roughness: 0.6,
    metalness: 0.02
  });
  const snowMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.25,
    roughness: 0.68,
    metalness: 0.05
  });

  // -------------------------------------------------------------------------
  // 1. Snow Mound at the Base of the Post (Sneeuwhoopje aan de voet van de paal)
  // -------------------------------------------------------------------------
  const baseSnowGroup = new THREE.Group();
  baseSnowGroup.name = 'baseSnowMound';
  group.add(baseSnowGroup);

  const mainMoundGeo = new THREE.SphereGeometry(0.38, 20, 14);
  mainMoundGeo.scale(1.15, 0.38, 1.08);
  const mainMound = new THREE.Mesh(mainMoundGeo, snowMat);
  mainMound.position.set(0, 0.06, 0);
  baseSnowGroup.add(mainMound);

  const subMounds = [
    { x: 0.18, y: 0.04, z: 0.14, sx: 0.22, sy: 0.11, sz: 0.20 },
    { x: -0.19, y: 0.04, z: 0.11, sx: 0.24, sy: 0.12, sz: 0.19 },
    { x: 0.04, y: 0.03, z: -0.18, sx: 0.25, sy: 0.10, sz: 0.21 },
    { x: -0.12, y: 0.08, z: -0.06, sx: 0.16, sy: 0.13, sz: 0.16 }
  ];
  subMounds.forEach((cfg) => {
    const g = new THREE.SphereGeometry(1, 14, 10);
    g.scale(cfg.sx, cfg.sy, cfg.sz);
    const m = new THREE.Mesh(g, snowMat);
    m.position.set(cfg.x, cfg.y, cfg.z);
    baseSnowGroup.add(m);
  });

  // -------------------------------------------------------------------------
  // 2. Wooden Post & Support Braces (Houten paal)
  // -------------------------------------------------------------------------
  const postGroup = new THREE.Group();
  postGroup.name = 'woodenPost';
  group.add(postGroup);

  const postHeight = 1.08;
  const postWidth = 0.13;
  const mainPost = new THREE.Mesh(
    new THREE.BoxGeometry(postWidth, postHeight, postWidth),
    postWoodMat
  );
  mainPost.position.set(0, postHeight * 0.5, 0);
  postGroup.add(mainPost);

  // Decorative wooden base collar & upper capital collar
  const lowerCollar = new THREE.Mesh(
    new THREE.BoxGeometry(postWidth + 0.04, 0.08, postWidth + 0.04),
    darkWoodMat
  );
  lowerCollar.position.set(0, 0.16, 0);
  postGroup.add(lowerCollar);

  const upperCollar = new THREE.Mesh(
    new THREE.BoxGeometry(postWidth + 0.035, 0.06, postWidth + 0.035),
    darkWoodMat
  );
  upperCollar.position.set(0, postHeight - 0.06, 0);
  postGroup.add(upperCollar);

  // Diagonal wooden corbel braces front & back
  const braceGeo = new THREE.BoxGeometry(0.065, 0.26, 0.065);
  [-1, 1].forEach((dirZ) => {
    const brace = new THREE.Mesh(braceGeo, darkWoodMat);
    brace.position.set(0, postHeight - 0.11, dirZ * 0.12);
    brace.rotation.x = dirZ * (Math.PI / 4);
    postGroup.add(brace);
  });

  // Sturdy wooden mounting platform board under the cabinet
  const mountBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.045, 0.62),
    darkWoodMat
  );
  mountBoard.position.set(0, postHeight + 0.022, 0);
  postGroup.add(mountBoard);

  // -------------------------------------------------------------------------
  // 3. Signboard "POST VOOR DE KERSTMAN" (CanvasTexture)
  // -------------------------------------------------------------------------
  const signTex = createMailboxSignTexture('POST VOOR DE KERSTMAN', 'NOORDPOOL · EXPEDITE');
  const signFaceMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.48,
    metalness: 0.1,
    emissive: 0x241205,
    emissiveIntensity: 0.26
  });
  const signMaterials = [
    darkWoodMat,
    darkWoodMat,
    darkWoodMat,
    darkWoodMat,
    signFaceMat,
    signFaceMat
  ];
  const signBoardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.24, 0.042),
    signMaterials
  );
  signBoardMesh.position.set(0, 0.72, postWidth * 0.5 + 0.032);
  postGroup.add(signBoardMesh);

  // Two brass mounting bolts holding the sign to the post
  const boltGeo = new THREE.SphereGeometry(0.014, 10, 10);
  [-0.31, 0.31].forEach((bx) => {
    const bolt = new THREE.Mesh(boltGeo, goldMat);
    bolt.position.set(bx, 0.72, postWidth * 0.5 + 0.055);
    postGroup.add(bolt);
  });

  // -------------------------------------------------------------------------
  // 4. Rounded Red Mailbox Cabinet (Afgeronde kast)
  // -------------------------------------------------------------------------
  const cabinetGroup = new THREE.Group();
  cabinetGroup.name = 'mailboxCabinet';
  const cabinetBaseY = postHeight + 0.045; // 1.125 m
  cabinetGroup.position.set(0, cabinetBaseY, 0);
  group.add(cabinetGroup);

  const boxW = 0.38;
  const boxRadius = boxW * 0.5; // 0.19 m
  const wallH = 0.19;
  const boxD = 0.58;

  // Lower rectangular body (recessed slightly at the front for the interior cavity)
  const lowerBody = new THREE.Mesh(
    new THREE.BoxGeometry(boxW, wallH, boxD - 0.03),
    redMetalMat
  );
  lowerBody.position.set(0, wallH * 0.5, -0.015);
  cabinetGroup.add(lowerBody);

  // Upper rounded barrel vault (half-cylinder along Z axis)
  const vaultGeo = new THREE.CylinderGeometry(
    boxRadius,
    boxRadius,
    boxD - 0.03,
    28,
    1,
    false,
    0,
    Math.PI * 2
  );
  vaultGeo.rotateX(Math.PI / 2);
  const upperVault = new THREE.Mesh(vaultGeo, redMetalMat);
  upperVault.position.set(0, wallH, -0.015);
  cabinetGroup.add(upperVault);

  // Decorative gold/brass trim straps around front and back of the red cabinet
  const trimStrapBoxGeo = new THREE.BoxGeometry(boxW + 0.014, wallH, 0.028);
  const trimStrapArchGeo = new THREE.CylinderGeometry(
    boxRadius + 0.007,
    boxRadius + 0.007,
    0.028,
    28
  );
  trimStrapArchGeo.rotateX(Math.PI / 2);

  [-boxD * 0.5 + 0.025, boxD * 0.5 - 0.045].forEach((tz) => {
    const strapLower = new THREE.Mesh(trimStrapBoxGeo, goldMat);
    strapLower.position.set(0, wallH * 0.5, tz);
    cabinetGroup.add(strapLower);

    const strapArch = new THREE.Mesh(trimStrapArchGeo, goldMat);
    strapArch.position.set(0, wallH, tz);
    cabinetGroup.add(strapArch);
  });

  // Dark recessed interior at the front so opening the flap reveals inside + letters
  const interiorBox = new THREE.Mesh(
    new THREE.BoxGeometry(boxW - 0.04, wallH - 0.02, 0.05),
    darkInteriorMat
  );
  interiorBox.position.set(0, wallH * 0.5 + 0.01, boxD * 0.5 - 0.048);
  cabinetGroup.add(interiorBox);

  const interiorArchGeo = new THREE.CylinderGeometry(
    boxRadius - 0.02,
    boxRadius - 0.02,
    0.05,
    24
  );
  interiorArchGeo.rotateX(Math.PI / 2);
  const interiorArch = new THREE.Mesh(interiorArchGeo, darkInteriorMat);
  interiorArch.position.set(0, wallH, boxD * 0.5 - 0.048);
  cabinetGroup.add(interiorArch);

  // Stack of festive letters inside the mailbox cavity
  const letterConfigs = [
    { x: -0.03, y: 0.035, z: boxD * 0.5 - 0.09, rotY: 0.12, rotZ: 0.03 },
    { x: 0.02, y: 0.052, z: boxD * 0.5 - 0.11, rotY: -0.18, rotZ: -0.02 },
    { x: -0.01, y: 0.068, z: boxD * 0.5 - 0.08, rotY: 0.05, rotZ: 0.08 }
  ];
  letterConfigs.forEach((lc) => {
    const env = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.014, 0.22),
      letterPaperMat
    );
    env.position.set(lc.x, lc.y, lc.z);
    env.rotation.set(0, lc.rotY, lc.rotZ);
    cabinetGroup.add(env);

    // Red wax seal on top envelope
    const seal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.006, 12),
      flagRedMat
    );
    seal.position.set(lc.x, lc.y + 0.009, lc.z + 0.02);
    cabinetGroup.add(seal);
  });

  // -------------------------------------------------------------------------
  // 5. Snow Layer on the Roof (Laagje sneeuw op het dak)
  // -------------------------------------------------------------------------
  const roofSnowGroup = new THREE.Group();
  roofSnowGroup.name = 'roofSnowLayer';
  cabinetGroup.add(roofSnowGroup);

  // Curved snow blanket resting across the vaulted top of the cabinet
  const roofCapGeo = new THREE.CylinderGeometry(
    boxRadius + 0.024,
    boxRadius + 0.024,
    boxD - 0.04,
    24,
    1,
    false,
    -Math.PI * 0.36,
    Math.PI * 0.72
  );
  roofCapGeo.rotateZ(Math.PI / 2);
  roofCapGeo.rotateY(Math.PI / 2);
  const roofCapMesh = new THREE.Mesh(roofCapGeo, snowMat);
  roofCapMesh.position.set(0, wallH + 0.012, -0.01);
  roofCapMesh.scale.set(1.02, 1.06, 1.0);
  roofSnowGroup.add(roofCapMesh);

  // Soft organic snow puffs/drifts along the crest and eaves of the mailbox roof
  const roofPuffs = [
    { x: 0.0, y: wallH + boxRadius + 0.015, z: -0.02, sx: 0.15, sy: 0.042, sz: 0.26 },
    { x: -0.09, y: wallH + boxRadius * 0.86, z: 0.06, sx: 0.11, sy: 0.038, sz: 0.18 },
    { x: 0.08, y: wallH + boxRadius * 0.88, z: -0.08, sx: 0.12, sy: 0.036, sz: 0.19 },
    { x: 0.02, y: wallH + boxRadius + 0.018, z: 0.15, sx: 0.13, sy: 0.035, sz: 0.11 },
    { x: -0.03, y: wallH + boxRadius + 0.016, z: -0.17, sx: 0.14, sy: 0.038, sz: 0.12 }
  ];
  roofPuffs.forEach((p) => {
    const pg = new THREE.SphereGeometry(1, 14, 10);
    pg.scale(p.sx, p.sy, p.sz);
    const pm = new THREE.Mesh(pg, snowMat);
    pm.position.set(p.x, p.y, p.z);
    roofSnowGroup.add(pm);
  });

  // -------------------------------------------------------------------------
  // 6. Movable Front Flap Group (Apart gegroepeerd klepje vooraan)
  // -------------------------------------------------------------------------
  const flapGroup = new THREE.Group();
  flapGroup.name = 'flapGroup';
  // Pivot at bottom-front hinge of the cabinet so rotation.x swings the door/flap open
  flapGroup.position.set(0, 0.01, boxD * 0.5 - 0.022);
  cabinetGroup.add(flapGroup);

  const doorThickness = 0.026;
  const flapLower = new THREE.Mesh(
    new THREE.BoxGeometry(boxW - 0.01, wallH - 0.01, doorThickness),
    redMetalMat
  );
  flapLower.position.set(0, (wallH - 0.01) * 0.5, doorThickness * 0.5);
  flapGroup.add(flapLower);

  const flapArchGeo = new THREE.CylinderGeometry(
    boxRadius - 0.005,
    boxRadius - 0.005,
    doorThickness,
    28
  );
  flapArchGeo.rotateX(Math.PI / 2);
  const flapArch = new THREE.Mesh(flapArchGeo, redMetalMat);
  flapArch.position.set(0, wallH - 0.01, doorThickness * 0.5);
  flapGroup.add(flapArch);

  // Brass hinge knuckles at bottom pivot
  const knuckleGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.055, 10);
  knuckleGeo.rotateZ(Math.PI / 2);
  [-0.12, 0.12].forEach((kx) => {
    const knuckle = new THREE.Mesh(knuckleGeo, goldMat);
    knuckle.position.set(kx, 0, doorThickness * 0.5);
    flapGroup.add(knuckle);
  });

  // Brass mail slot with swinging inner baffle plate on the front flap
  const slotFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.055, 0.014),
    goldMat
  );
  slotFrame.position.set(0, wallH + 0.02, doorThickness + 0.004);
  flapGroup.add(slotFrame);

  const slotRecess = new THREE.Mesh(
    new THREE.BoxGeometry(0.21, 0.028, 0.016),
    darkInteriorMat
  );
  slotRecess.position.set(0, wallH + 0.02, doorThickness + 0.005);
  flapGroup.add(slotRecess);

  const slotHood = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.016, 0.028),
    goldMat
  );
  slotHood.position.set(0, wallH + 0.046, doorThickness + 0.01);
  slotHood.rotation.x = 0.22;
  flapGroup.add(slotHood);

  // Arched gold pull handle near the top of the front flap
  const handleArch = new THREE.Mesh(
    new THREE.TorusGeometry(0.036, 0.008, 10, 20, Math.PI),
    goldMat
  );
  handleArch.rotation.y = Math.PI / 2;
  handleArch.position.set(0, wallH + 0.115, doorThickness + 0.004);
  flapGroup.add(handleArch);

  // Embossed gold crown/star emblem on lower front flap
  const emblemDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.008, 20),
    goldMat
  );
  emblemDisc.rotation.x = Math.PI / 2;
  emblemDisc.position.set(0, 0.095, doorThickness + 0.004);
  flapGroup.add(emblemDisc);

  // -------------------------------------------------------------------------
  // 7. Movable Red Flag Group on the Side (Apart gegroepeerd rood vlaggetje)
  // -------------------------------------------------------------------------
  const flagGroup = new THREE.Group();
  flagGroup.name = 'flagGroup';
  // Pivot on the right side wall of the cabinet so rotation.x raises/lowers the flag
  flagGroup.position.set(boxW * 0.5 + 0.012, wallH * 0.72, boxD * 0.18);
  cabinetGroup.add(flagGroup);

  // Brass pivot hub & washer
  const flagHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.022, 16),
    goldMat
  );
  flagHub.rotation.z = Math.PI / 2;
  flagGroup.add(flagHub);

  const flagCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 12, 12),
    goldMat
  );
  flagCap.position.set(0.012, 0, 0);
  flagGroup.add(flagCap);

  // Flag staff arm extending upward from the pivot
  const staffHeight = 0.26;
  const flagStaff = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, staffHeight, 0.022),
    flagRedMat
  );
  flagStaff.position.set(0.008, staffHeight * 0.5, 0);
  flagGroup.add(flagStaff);

  // Classic red flag pennant blade at the top of the staff
  const flagBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.095, 0.135),
    flagRedMat
  );
  flagBlade.position.set(0.008, staffHeight - 0.035, -0.055);
  flagGroup.add(flagBlade);

  const flagTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0475, 0.0475, 0.014, 16),
    flagRedMat
  );
  flagTip.rotation.z = Math.PI / 2;
  flagTip.position.set(0.008, staffHeight - 0.035, -0.122);
  flagGroup.add(flagTip);

  // Enable shadow casting and receiving across all primitive meshes
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // -------------------------------------------------------------------------
  // 8. Flying 3D Envelope (uit primitieven) & Glinsterend Spoor
  // -------------------------------------------------------------------------
  const flyingEnvelope = new THREE.Group();
  flyingEnvelope.name = 'flyingWishEnvelope';
  flyingEnvelope.visible = false;
  scene.add(flyingEnvelope);

  const envW = 0.24;
  const envH = 0.018;
  const envD = 0.16;

  // Envelope body
  const envBody = new THREE.Mesh(
    new THREE.BoxGeometry(envW, envH, envD),
    letterPaperMat
  );
  flyingEnvelope.add(envBody);

  // Decorative gold border strips along envelope edges
  const borderLongGeo = new THREE.BoxGeometry(envW + 0.006, envH + 0.002, 0.01);
  [-envD * 0.5 + 0.005, envD * 0.5 - 0.005].forEach((bz) => {
    const strip = new THREE.Mesh(borderLongGeo, goldMat);
    strip.position.set(0, 0, bz);
    flyingEnvelope.add(strip);
  });

  // Triangular folded envelope flap on top (built from primitive Shape/Extrude)
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-envW * 0.48, -envD * 0.46);
  flapShape.lineTo(envW * 0.48, -envD * 0.46);
  flapShape.lineTo(0, envD * 0.12);
  flapShape.closePath();
  const envFlapGeo = new THREE.ExtrudeGeometry(flapShape, {
    depth: 0.004,
    bevelEnabled: false
  });
  envFlapGeo.rotateX(Math.PI / 2);
  const envFlapMesh = new THREE.Mesh(envFlapGeo, letterPaperMat);
  envFlapMesh.position.set(0, envH * 0.5 + 0.004, 0);
  flyingEnvelope.add(envFlapMesh);

  // Diagonal gold fold lines on the envelope flap
  const foldSeamGeo = new THREE.BoxGeometry(0.15, 0.004, 0.007);
  [-1, 1].forEach((side) => {
    const seam = new THREE.Mesh(foldSeamGeo, goldMat);
    seam.position.set(side * 0.056, envH * 0.5 + 0.003, -0.025);
    seam.rotation.y = side * 0.65;
    flyingEnvelope.add(seam);
  });

  // Red wax seal with tiny golden star center
  const waxSeal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.026, 0.008, 14),
    flagRedMat
  );
  waxSeal.position.set(0, envH * 0.5 + 0.005, 0.01);
  flyingEnvelope.add(waxSeal);

  const sealStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.012, 0),
    goldMat
  );
  sealStar.scale.set(1, 0.35, 1);
  sealStar.position.set(0, envH * 0.5 + 0.01, 0.01);
  flyingEnvelope.add(sealStar);

  // Warm magical glow around the flying envelope
  const envGlowMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffe066).multiplyScalar(1.4),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    })
  );
  flyingEnvelope.add(envGlowMesh);

  // Disable raycasting on the flying envelope so it never interferes with clicks
  flyingEnvelope.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.raycast = () => {};
    }
  });

  // Glittering trail particle system (glinsterend spoor)
  const TRAIL_COUNT = 90;
  const trailGeo = new THREE.BufferGeometry();
  const trailPositions = new Float32Array(TRAIL_COUNT * 3);
  const trailColors = new Float32Array(TRAIL_COUNT * 3);
  const trailVelocities = [];
  const trailAges = new Float32Array(TRAIL_COUNT);
  const trailLifespans = new Float32Array(TRAIL_COUNT);

  const paletteCols = [
    new THREE.Color(0xffee77),
    new THREE.Color(0xffcc33),
    new THREE.Color(0xffffff),
    new THREE.Color(0x88eeff)
  ];

  for (let i = 0; i < TRAIL_COUNT; i++) {
    trailPositions[i * 3] = 0;
    trailPositions[i * 3 + 1] = -50;
    trailPositions[i * 3 + 2] = 0;
    trailAges[i] = 999;
    trailLifespans[i] = 1.0;
    trailVelocities.push(new THREE.Vector3());

    const col = paletteCols[i % paletteCols.length];
    trailColors[i * 3] = col.r;
    trailColors[i * 3 + 1] = col.g;
    trailColors[i * 3 + 2] = col.b;
  }

  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

  const trailMat = new THREE.PointsMaterial({
    map: createSnowflakeSprite(),
    size: 0.34,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const trailPoints = new THREE.Points(trailGeo, trailMat);
  trailPoints.frustumCulled = false;
  trailPoints.raycast = () => {};
  scene.add(trailPoints);

  let trailCursor = 0;
  let trailSpawnAccum = 0;

  function spawnTrailParticle(pos, spread = 0.14, upBoost = 0.25) {
    const idx = trailCursor * 3;
    trailPositions[idx] = pos.x + (Math.random() - 0.5) * spread;
    trailPositions[idx + 1] = pos.y + (Math.random() - 0.5) * spread;
    trailPositions[idx + 2] = pos.z + (Math.random() - 0.5) * spread;

    trailVelocities[trailCursor].set(
      (Math.random() - 0.5) * 0.45,
      (Math.random() - 0.3) * 0.45 + upBoost,
      (Math.random() - 0.5) * 0.45
    );
    trailAges[trailCursor] = 0;
    trailLifespans[trailCursor] = 0.55 + Math.random() * 0.45;
    trailCursor = (trailCursor + 1) % TRAIL_COUNT;
  }

  // Compute exact world positions for the flight curve from mailbox interior to workshop chimney
  const startMailWorld = new THREE.Vector3(
    posX + Math.sin(rotY) * (boxD * 0.45),
    groundY + cabinetBaseY + wallH * 0.72,
    posZ + Math.cos(rotY) * (boxD * 0.45)
  );
  const exitMailWorld = new THREE.Vector3(
    posX + Math.sin(rotY) * (boxD * 0.5 + 0.65),
    groundY + cabinetBaseY + wallH + 0.38,
    posZ + Math.cos(rotY) * (boxD * 0.5 + 0.65)
  );

  // Workshop chimney top world coordinates (local chimney is at (-2.7, 6.25, -1.1) inside cabinGroup)
  const wsCos = Math.cos(COORDS.workshop.rotY);
  const wsSin = Math.sin(COORDS.workshop.rotY);
  const localChimneyX = -2.7;
  const localChimneyZ = -1.1;
  const chimneyWorldX = COORDS.workshop.x + (localChimneyX * wsCos + localChimneyZ * wsSin);
  const chimneyWorldZ = COORDS.workshop.z + (-localChimneyX * wsSin + localChimneyZ * wsCos);
  const chimneyWorldY = COORDS.workshop.y + 6.25;

  const chimneyTopWorld = new THREE.Vector3(chimneyWorldX, chimneyWorldY, chimneyWorldZ);
  const chimneyFlueWorld = new THREE.Vector3(chimneyWorldX, chimneyWorldY - 0.48, chimneyWorldZ);

  // Graceful sweeping 3D arc (sierlijke boog) from the open mailbox up into the workshop chimney
  const letterFlightCurve = new THREE.CatmullRomCurve3(
    [
      startMailWorld,
      exitMailWorld,
      new THREE.Vector3(-4.2, groundY + 4.3, -1.9),
      new THREE.Vector3(-8.4, 7.9, -4.4),
      new THREE.Vector3(chimneyWorldX + 0.65, chimneyWorldY + 1.55, chimneyWorldZ + 0.55),
      chimneyTopWorld,
      chimneyFlueWorld
    ],
    false,
    'catmullrom',
    0.5
  );

  // -------------------------------------------------------------------------
  // 9. Interactive State, Wish Input UI & Animation
  // -------------------------------------------------------------------------
  let isOpen = false;
  let flagRaised = false; // Starts lowered (Math.PI / 2); goes up (0.0) after sending a letter!
  let flapAngle = 0; // 0 = closed, positive = open forward/downward
  let flagAngle = Math.PI / 2; // Math.PI / 2 = lowered, 0.0 = upright ("mail sent!")
  let letterFlightProgress = -1; // -1 = inactive, 0..1 = flying along curve
  const FLIGHT_DURATION = 2.65;

  const tooltipPos = new THREE.Vector3(posX, groundY + 1.88, posZ);
  const focusTarget = new THREE.Vector3(posX, groundY + 1.15, posZ);
  const frontDir = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  const curFlightPos = new THREE.Vector3();
  const nextFlightPos = new THREE.Vector3();

  // Create compact HTML Wish Popover ("Wat wens jij voor Kerstmis?")
  let popoverEl = document.getElementById('mailbox-wish-popover');
  if (!popoverEl) {
    popoverEl = document.createElement('div');
    popoverEl.id = 'mailbox-wish-popover';
    popoverEl.innerHTML = `
      <form class="mailbox-wish-form" autocomplete="off">
        <div class="mailbox-wish-header">
          <label for="mailbox-wish-input" class="mailbox-wish-label">📮 Wat wens jij voor Kerstmis?</label>
          <button type="button" class="mailbox-wish-close" title="Sluiten" aria-label="Sluiten">✕</button>
        </div>
        <div class="mailbox-wish-row">
          <input
            id="mailbox-wish-input"
            class="mailbox-wish-input"
            type="text"
            maxlength="80"
            placeholder="Typ je kerstwens..."
          />
          <button type="submit" class="mailbox-wish-submit">Verstuur ✉️</button>
        </div>
      </form>
    `;
    document.body.appendChild(popoverEl);
  }

  const wishForm = popoverEl.querySelector('.mailbox-wish-form');
  const wishInput = popoverEl.querySelector('.mailbox-wish-input');
  const wishCloseBtn = popoverEl.querySelector('.mailbox-wish-close');

  // Stop pointer & key events inside the popover from triggering 3D canvas raycasts or camera shortcuts
  ['pointerdown', 'pointerup', 'pointermove', 'click', 'dblclick', 'wheel'].forEach((evtName) => {
    popoverEl.addEventListener(evtName, (e) => e.stopPropagation());
  });

  function openWishForm() {
    isOpen = true;
    popoverEl.classList.add('visible');
    setTimeout(() => {
      if (isOpen && wishInput) {
        wishInput.focus();
      }
    }, 40);
  }

  function closeWishForm() {
    isOpen = false;
    popoverEl.classList.remove('visible');
    if (wishInput) {
      wishInput.blur();
    }
  }

  function startLetterFlight() {
    // Hide the input popover while the letter flies out, then close flap & raise flag on arrival
    popoverEl.classList.remove('visible');
    if (wishInput) {
      wishInput.value = '';
      wishInput.blur();
    }

    // Keep the mailbox flap open while the letter launches out of the cabinet
    isOpen = true;
    flagRaised = false;
    letterFlightProgress = 0;
    trailSpawnAccum = 0;

    flyingEnvelope.visible = true;
    letterFlightCurve.getPointAt(0, curFlightPos);
    flyingEnvelope.position.copy(curFlightPos);
    flyingEnvelope.scale.setScalar(0.35);

    if (audio) {
      audio.playChime(1.28);
    }
  }

  wishForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (letterFlightProgress >= 0) return;
    startLetterFlight();
  });

  wishCloseBtn.addEventListener('click', () => {
    closeWishForm();
  });

  wishInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      closeWishForm();
    }
  });

  if (interaction) {
    interaction.registerClickable(group, {
      id: 'mailbox',
      label: 'Postbus van de Kerstman 📮',
      glowMeshes: [lowerBody, upperVault, flapLower, flapArch, flagBlade, signBoardMesh],
      focusTarget,
      focusDistance: 2.6,
      focusHeightOffset: 0.25,
      preferredDir: frontDir,
      preferredWeight: 0.85,
      onClick: () => {
        if (letterFlightProgress >= 0) return; // Ignore while letter is mid-flight

        if (!isOpen) {
          openWishForm();
          if (audio) audio.playChime(1.35);
        } else {
          closeWishForm();
          if (audio) audio.playChime(0.95);
        }
      }
    });
  }

  function update(delta, elapsed) {
    // 1. Update flying 3D envelope along its graceful arc to the workshop chimney
    if (letterFlightProgress >= 0) {
      letterFlightProgress += delta / FLIGHT_DURATION;

      if (letterFlightProgress >= 1.0) {
        // Arrival at the chimney! Hide envelope, close the flap, raise the flag, and show confirmation
        letterFlightProgress = -1;
        flyingEnvelope.visible = false;
        isOpen = false;
        flagRaised = true;

        // Festive burst of sparkles at the chimney mouth upon entry
        for (let b = 0; b < 20; b++) {
          spawnTrailParticle(chimneyTopWorld, 0.38, 0.95);
        }

        if (interaction) {
          interaction.showTooltip(
            'Je brief is onderweg naar de Kerstman! 🎅',
            tooltipPos,
            4.2
          );
        }
        if (audio) {
          audio.playChime(1.55);
        }
      } else {
        const rawT = letterFlightProgress;
        // Smooth ease-in-out cubic progression along the arc
        const easedT = rawT < 0.5
          ? 4 * rawT * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

        letterFlightCurve.getPointAt(easedT, curFlightPos);
        const lookAheadT = Math.min(1.0, easedT + 0.025);
        letterFlightCurve.getPointAt(lookAheadT, nextFlightPos);

        flyingEnvelope.position.copy(curFlightPos);
        flyingEnvelope.lookAt(nextFlightPos);
        // Gentle banking flutter as the envelope glides through the night sky
        flyingEnvelope.rotateZ(Math.sin(elapsed * 11.0) * 0.22);

        // Scale up smoothly as it exits the mailbox, and shrink slightly as it dives into the chimney flue
        const exitScale = THREE.MathUtils.smoothstep(rawT, 0.0, 0.14);
        const chimneyShrink = 1.0 - THREE.MathUtils.smoothstep(rawT, 0.86, 1.0) * 0.55;
        flyingEnvelope.scale.setScalar((0.35 + 0.65 * exitScale) * chimneyShrink);

        // Once the envelope has clearly exited the mailbox (rawT > 0.28), the flap can already start closing or close on arrival
        // Wait — per specification:
        // "Na het versturen vliegt een 3D-briefje (envelop uit primitieven) uit de postbus in een sierlijke boog naar de schoorsteen van de werkplaats, met een glinsterend spoor. Daarna sluit het klepje, gaat het vlaggetje omhoog en verschijnt kort de tekst 'Je brief is onderweg naar de Kerstman! 🎅'."
        // Keeping isOpen = true until letterFlightProgress >= 1.0 ensures "Daarna sluit het klepje, gaat het vlaggetje omhoog en verschijnt kort de tekst..." happens right after the flight!

        // Spawn glittering trail particles along the envelope's path
        trailSpawnAccum += delta;
        while (trailSpawnAccum >= 0.014) {
          trailSpawnAccum -= 0.014;
          spawnTrailParticle(curFlightPos, 0.14, 0.22);
        }
      }
    }

    // 2. Update glittering trail particles
    let anyTrailActive = false;
    for (let i = 0; i < TRAIL_COUNT; i++) {
      if (trailAges[i] < trailLifespans[i]) {
        anyTrailActive = true;
        trailAges[i] += delta;
        const idx = i * 3;
        const vel = trailVelocities[i];
        trailPositions[idx] += vel.x * delta + Math.sin(elapsed * 5.0 + i) * 0.08 * delta;
        trailPositions[idx + 1] += vel.y * delta;
        trailPositions[idx + 2] += vel.z * delta + Math.cos(elapsed * 4.5 + i) * 0.08 * delta;
        vel.y -= 0.35 * delta; // gentle drift
      } else if (trailPositions[i * 3 + 1] > -40) {
        anyTrailActive = true;
        trailPositions[i * 3 + 1] = -50;
      }
    }
    if (anyTrailActive) {
      trailGeo.attributes.position.needsUpdate = true;
    }

    // 3. Smoothly animate front flap opening & closing
    const targetFlap = isOpen ? 1.25 : 0.0;
    flapAngle += (targetFlap - flapAngle) * Math.min(1, delta * 8.0);
    flapGroup.rotation.x = flapAngle;

    // 4. Smoothly animate side flag (goes upright 0.0 after letter is sent, lowered Math.PI / 2 otherwise)
    const windWobble = Math.sin(elapsed * 3.4) * 0.035 + Math.cos(elapsed * 5.1) * 0.018;
    const targetFlag = flagRaised ? windWobble : Math.PI * 0.5 + windWobble * 0.4;
    flagAngle += (targetFlag - flagAngle) * Math.min(1, delta * 7.5);
    flagGroup.rotation.x = flagAngle;
  }

  scene.add(group);
  return {
    group,
    flapGroup,
    flagGroup,
    getPopoverAnchor: () => (isOpen && letterFlightProgress < 0 ? tooltipPos : null),
    update
  };
}
