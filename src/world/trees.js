import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, COORDS, GROUPS, getSceneObstacles, checkOverlap } from '../config.js';
import { fbm2D, getTerrainHeight, getGroundHeight } from '../utils/procedural.js';

export function createTrees(scene, interaction, audio) {
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_TREES;

  // 1. Realistic Wild Pine Geometry with Irregular Branches & Lumpy Snow Clumps
  const rawPines = [...COORDS.litPines, ...COORDS.forestPines];
  const sceneObstacles = getSceneObstacles();

  // Validate placements and avoid overlap with buildings, village clearing (10m radius), and objects
  const allPines = rawPines.map((p, idx) => {
    const pineCopy = { ...p };
    const treeRadius = 1.4 * pineCopy.scale;
    const check = checkOverlap(pineCopy.x, pineCopy.z, treeRadius, sceneObstacles);
    if (check.collides) {
      console.warn(
        `[Bomen] Dennenboom #${idx + 1} op (${pineCopy.x}, ${pineCopy.z}) overlapt met ${check.obstacle.id} (afstand: ${check.dist.toFixed(1)} m, vereist: ${check.minDist.toFixed(1)} m). Wordt verplaatst.`
      );
      const dx = pineCopy.x - check.obstacle.x;
      const dz = pineCopy.z - check.obstacle.z;
      const len = Math.hypot(dx, dz) || 1;
      const push = (check.minDist - check.dist) + 0.8;
      pineCopy.x += (dx / len) * push;
      pineCopy.z += (dz / len) * push;
    }
    return pineCopy;
  });

  const pineCount = allPines.length; // 10 instanced wild pines

  // Gnarled, slightly curved trunk extending into upper crown
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.28, 3.4, 10, 8);
  trunkGeo.translate(0, 1.7, 0);
  const trunkPos = trunkGeo.attributes.position;
  for (let i = 0; i < trunkPos.count; i++) {
    const vx = trunkPos.getX(i);
    const vy = trunkPos.getY(i);
    const vz = trunkPos.getZ(i);
    const hFrac = vy / 3.4;
    const flare = Math.max(0, 1 - hFrac * 4.5) * 0.08;
    const bendX = Math.sin(hFrac * Math.PI * 1.4) * 0.06 * hFrac;
    const bendZ = Math.cos(hFrac * Math.PI * 1.1) * 0.05 * hFrac;
    const bark = fbm2D(vx * 6.0 + vy * 2.5, vz * 6.0 - vy * 1.8, 2) * 0.025;
    const radScale = 1 + flare + bark;
    trunkPos.setXYZ(i, vx * radScale + bendX, vy, vz * radScale + bendZ);
  }
  trunkGeo.computeVertexNormals();

  // 6 organic tiers + protruding irregular side boughs
  const tierData = [
    { r: 1.68, h: 1.35, y: 1.18, lobes: 7, twist: 0.2, asym: 0.28 },
    { r: 1.46, h: 1.28, y: 1.82, lobes: 8, twist: 1.05, asym: 0.31 },
    { r: 1.24, h: 1.18, y: 2.42, lobes: 7, twist: 2.15, asym: 0.29 },
    { r: 0.98, h: 1.08, y: 2.98, lobes: 6, twist: 3.1, asym: 0.27 },
    { r: 0.72, h: 0.95, y: 3.48, lobes: 6, twist: 4.25, asym: 0.25 },
    { r: 0.44, h: 0.82, y: 3.92, lobes: 5, twist: 5.1, asym: 0.22 }
  ];

  // Helper: evaluate local branch lobe radius & droop at a given tier & angle
  function evalTierLobe(tier, theta, tierIdx) {
    const lobeWave = Math.cos((theta - tier.twist) * tier.lobes);
    const subWave = Math.sin((theta + tier.twist * 0.7) * (tier.lobes + 3));
    const noiseVal = fbm2D(
      Math.cos(theta) * 1.9 + tierIdx * 3.1,
      Math.sin(theta) * 1.9 - tierIdx * 2.3,
      3
    );
    // Sharp protruding boughs with deep gaps between branches
    const boughFactor =
      1.0 +
      tier.asym * (0.65 * lobeWave + 0.35 * subWave) +
      noiseVal * 0.24;
    const tipDroop = Math.max(0, lobeWave) * 0.14 + Math.max(0, noiseVal) * 0.08;
    return { boughFactor: Math.max(0.58, boughFactor), tipDroop, lobeWave, noiseVal };
  }

  const foliageLayers = [];
  const snowCapLayers = [];
  const branchAttachmentPoints = []; // Stored in local tree space for ornaments, lights & snow clumps

  tierData.forEach((t, tierIdx) => {
    const radialSegs = 32;
    const heightSegs = 6;
    const cone = new THREE.ConeGeometry(t.r, t.h, radialSegs, heightSegs, false);
    cone.translate(0, t.y, 0);

    const pos = cone.attributes.position;
    const topY = t.y + t.h * 0.5;
    const botY = t.y - t.h * 0.5;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const radialDist = Math.hypot(vx, vz);
      const vFrac = Math.max(0, Math.min(1, (topY - vy) / t.h)); // 0 at apex, 1 at skirt rim

      if (radialDist < 0.001 || vFrac < 0.05) {
        // Slight organic crown offset at tier apex
        const leanX = Math.sin(tierIdx * 1.7) * 0.04;
        const leanZ = Math.cos(tierIdx * 2.1) * 0.04;
        pos.setXYZ(i, vx + leanX, vy, vz + leanZ);
        continue;
      }

      const theta = Math.atan2(vz, vx);
      const { boughFactor, tipDroop, noiseVal } = evalTierLobe(t, theta, tierIdx);

      // Irregular branch extension increases toward the lower outer skirt of the tier
      const spread = 1.0 + (boughFactor - 1.0) * Math.pow(vFrac, 0.75);
      // Natural upward scoop near the tip with heavy snow-laden droop
      const sagY =
        -tipDroop * Math.pow(vFrac, 1.35) * t.h +
        Math.sin(theta * (t.lobes * 2) + tierIdx) * 0.035 * vFrac;
      // Slight tangential twist so branches aren't radially rigid
      const twistAngle = theta + noiseVal * 0.14 * vFrac;
      const newR = radialDist * spread;

      pos.setXYZ(
        i,
        Math.cos(twistAngle) * newR,
        vy + sagY,
        Math.sin(twistAngle) * newR
      );
    }
    cone.computeVertexNormals();
    foliageLayers.push(cone);

    // Protruding asymmetric side-boughs sticking out from each tier
    const boughCount = t.lobes;
    for (let b = 0; b < boughCount; b++) {
      const baseTheta = t.twist + (b / boughCount) * Math.PI * 2;
      const jitter = fbm2D(b * 2.3 + tierIdx * 5.1, tierIdx * 3.7, 2) * 0.28;
      const theta = baseTheta + jitter;
      const { boughFactor, tipDroop } = evalTierLobe(t, theta, tierIdx);

      // Vary bough length and elevation for wild irregularity
      const lenScale = 0.78 + 0.42 * ((Math.sin(b * 3.7 + tierIdx * 1.9) + 1) * 0.5);
      const reachR = t.r * boughFactor * (0.86 + 0.18 * lenScale);
      const boughY = botY + t.h * (0.18 + 0.16 * ((b + tierIdx) % 3)) - tipDroop * t.h * 0.7;

      // Create a sculptural side-branch sub-cone jutting outward and drooping slightly
      const subLen = t.r * (0.52 + 0.22 * lenScale);
      const subRadius = t.r * (0.22 + 0.06 * lenScale);
      const subCone = new THREE.ConeGeometry(subRadius, subLen, 7, 2);
      // Orient cone so its tip points outward & slightly downward along theta
      subCone.rotateZ(-Math.PI * 0.5 - 0.22);
      subCone.scale(1.0, 0.52, 1.25);
      subCone.rotateY(-theta);
      const midR = reachR * 0.62;
      subCone.translate(
        Math.cos(theta) * midR,
        boughY + 0.08,
        Math.sin(theta) * midR
      );
      subCone.computeVertexNormals();
      foliageLayers.push(subCone);

      // Record outer branch tip & mid-branch positions for snow clumps, baubles & lights
      branchAttachmentPoints.push({
        tierIdx,
        theta,
        tipX: Math.cos(theta) * reachR,
        tipY: boughY - 0.04,
        tipZ: Math.sin(theta) * reachR,
        midX: Math.cos(theta) * (reachR * 0.72),
        midY: boughY + 0.14,
        midZ: Math.sin(theta) * (reachR * 0.72),
        reachR,
        boughY,
        lenScale
      });
    }

    // Irregular draped snow mantle over upper part of each tier
    const snowCone = new THREE.ConeGeometry(t.r * 0.94, t.h * 0.44, 28, 4);
    snowCone.translate(0, t.y + t.h * 0.22, 0);
    const sPos = snowCone.attributes.position;
    const sTopY = t.y + t.h * 0.44;
    for (let i = 0; i < sPos.count; i++) {
      const vx = sPos.getX(i);
      const vy = sPos.getY(i);
      const vz = sPos.getZ(i);
      const rDist = Math.hypot(vx, vz);
      const vFrac = Math.max(0, Math.min(1, (sTopY - vy) / (t.h * 0.44)));
      if (rDist < 0.001) continue;
      const theta = Math.atan2(vz, vx);
      const { boughFactor, tipDroop, noiseVal } = evalTierLobe(t, theta, tierIdx);
      const clumpWave = Math.max(0, Math.cos((theta - t.twist) * t.lobes));
      const newR = rDist * (0.95 + (boughFactor - 1.0) * 0.88 + clumpWave * 0.12 * vFrac);
      const rimDrop =
        -tipDroop * vFrac * t.h * 0.65 +
        Math.sin(theta * (t.lobes * 2) + tierIdx * 1.5) * 0.045 * vFrac +
        noiseVal * 0.035;
      sPos.setXYZ(i, Math.cos(theta) * newR, vy + rimDrop, Math.sin(theta) * newR);
    }
    snowCone.computeVertexNormals();
    snowCapLayers.push(snowCone);
  });

  // Helper to create an organic, lumpy 3D snow clump (sneeuwklomp)
  function createSnowClumpGeo(radius, cx, cy, cz, theta, seed) {
    const clump = new THREE.SphereGeometry(radius, 10, 8);
    const cPos = clump.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      let vx = cPos.getX(i);
      let vy = cPos.getY(i);
      let vz = cPos.getZ(i);

      // Flatten bottom, puff up top like freshly settled snow cushion
      const yFactor = vy > 0 ? 0.68 : 0.34;
      vy *= yFactor;
      vx *= 1.38;
      vz *= 1.15;

      const n = fbm2D(vx * 3.8 + seed * 7.1, vz * 3.8 - vy * 2.9 + seed * 3.3, 3);
      const scale = 1.0 + n * 0.32;
      vx *= scale;
      vy *= 1.0 + Math.abs(n) * 0.25;
      vz *= scale;

      cPos.setXYZ(i, vx, vy, vz);
    }
    // Tilt slightly outward along branch slope
    clump.rotateZ(-0.24);
    clump.rotateY(-theta);
    clump.translate(cx, cy, cz);
    clump.computeVertexNormals();
    return clump;
  }

  // Add thick, irregular snow clumps ("sneeuwklompen") on branch boughs & crown apex
  branchAttachmentPoints.forEach((bp, idx) => {
    // Primary snow clump resting near outer-mid bough
    const clumpR = (0.19 - bp.tierIdx * 0.018) * (0.85 + 0.3 * bp.lenScale);
    snowCapLayers.push(
      createSnowClumpGeo(
        clumpR,
        bp.midX * 1.04,
        bp.midY + 0.05,
        bp.midZ * 1.04,
        bp.theta,
        idx + 1.5
      )
    );

    // Secondary overhanging snow lump on alternating heavy boughs
    if (idx % 2 === 0 || bp.lenScale > 0.98) {
      const tipClumpR = clumpR * 0.76;
      snowCapLayers.push(
        createSnowClumpGeo(
          tipClumpR,
          bp.tipX * 0.92,
          bp.tipY + 0.05,
          bp.tipZ * 0.92,
          bp.theta + 0.12,
          idx * 2.3 + 9.1
        )
      );
    }
  });

  // Top crown snow hood
  snowCapLayers.push(createSnowClumpGeo(0.18, 0.0, 4.24, 0.0, 0.4, 99.0));

  const mergedFoliageGeo = mergeGeometries(foliageLayers, false);
  const mergedSnowCapGeo = mergeGeometries(snowCapLayers, false);

  const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.WOOD_DARK, roughness: 0.9 });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.26,
    roughness: 0.62
  });

  const instTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, pineCount);
  const instFoliage = new THREE.InstancedMesh(mergedFoliageGeo, pineMat, pineCount);
  const instSnowCaps = new THREE.InstancedMesh(mergedSnowCapGeo, snowCapMat, pineCount);

  instTrunks.castShadow = true;
  instFoliage.castShadow = true;
  instFoliage.receiveShadow = true;
  instSnowCaps.castShadow = true;
  instSnowCaps.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const tempColor = new THREE.Color();
  const tempVec = new THREE.Vector3();
  const wildPineMatrices = [];

  allPines.forEach((p, idx) => {
    const groundY = getGroundHeight(p.x, p.z);
    dummy.position.set(p.x, groundY, p.z);
    // Slight natural lean + distinct Y rotation for each wild pine
    const tiltX = Math.sin(idx * 2.3 + 0.5) * 0.035;
    const tiltZ = Math.cos(idx * 1.9 + 1.1) * 0.035;
    dummy.rotation.set(tiltX, idx * 1.37 + 0.4, tiltZ);
    // Subtle non-uniform scaling for organic silhouette diversity
    const sx = p.scale * (0.94 + (idx % 3) * 0.06);
    const sy = p.scale * (0.96 + ((idx + 1) % 3) * 0.05);
    const sz = p.scale * (0.94 + ((idx + 2) % 3) * 0.06);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();

    wildPineMatrices.push(dummy.matrix.clone());

    instTrunks.setMatrixAt(idx, dummy.matrix);
    instFoliage.setMatrixAt(idx, dummy.matrix);
    instSnowCaps.setMatrixAt(idx, dummy.matrix);

    tempColor.setHex(idx % 2 === 0 ? COLORS.PINE_DARK : COLORS.PINE_LIGHT);
    tempColor.offsetHSL(0, 0.04, (idx % 3 - 1) * 0.025);
    instFoliage.setColorAt(idx, tempColor);
  });

  group.add(instTrunks, instFoliage, instSnowCaps);

  // Rich Baubles (Kerstballen) on ALL 10 Wild Pines (single InstancedMesh for 60 fps)
  const wildBaublePalette = [
    0xd92027, // kerstrood
    0xffcc33, // warm goud
    0x1e78ff, // ijsblauw
    0x19a856, // smaragdgroen
    0xf4f8ff, // zilverwit
    0xe02b88, // robijn-magenta
    0xff7b24  // koper-oranje
  ];

  // Build bauble geometry with a small metallic crown cap on top
  const spherePart = new THREE.SphereGeometry(0.088, 12, 10);
  const capPart = new THREE.CylinderGeometry(0.024, 0.03, 0.032, 8);
  capPart.translate(0, 0.088, 0);
  const wildBaubleGeo = mergeGeometries([spherePart, capPart], false);
  const wildBaubleMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.86,
    roughness: 0.15,
    emissive: 0x221508,
    emissiveIntensity: 0.28
  });

  const wildBaubleTransforms = [];
  wildPineMatrices.forEach((treeMat, treeIdx) => {
    const pScale = allPines[treeIdx].scale;
    // Place baubles on the irregular branch tips & mid-boughs of each wild pine
    branchAttachmentPoints.forEach((bp, bIdx) => {
      // Hang bauble right below the outer branch tip
      tempVec.set(
        bp.tipX * 0.94,
        bp.tipY - 0.075,
        bp.tipZ * 0.94
      ).applyMatrix4(treeMat);

      const sizeVar = (0.85 + ((treeIdx * 7 + bIdx * 5) % 5) * 0.09) * pScale;
      const colorHex =
        wildBaublePalette[(treeIdx * 3 + bIdx * 2) % wildBaublePalette.length];
      wildBaubleTransforms.push({
        x: tempVec.x,
        y: tempVec.y,
        z: tempVec.z,
        scale: sizeVar,
        colorHex
      });

      // Add a second nestled ornament on the wider lower/middle tiers for rich decoration
      if (bp.tierIdx <= 3 && (bIdx + treeIdx) % 2 === 0) {
        const sideAngle = bp.theta + 0.24;
        const sideR = bp.reachR * 0.74;
        tempVec.set(
          Math.cos(sideAngle) * sideR,
          bp.midY - 0.09,
          Math.sin(sideAngle) * sideR
        ).applyMatrix4(treeMat);

        wildBaubleTransforms.push({
          x: tempVec.x,
          y: tempVec.y,
          z: tempVec.z,
          scale: sizeVar * 0.88,
          colorHex:
            wildBaublePalette[(treeIdx * 5 + bIdx * 3 + 1) % wildBaublePalette.length]
        });
      }
    });
  });

  const instWildBaubles = new THREE.InstancedMesh(
    wildBaubleGeo,
    wildBaubleMat,
    wildBaubleTransforms.length
  );
  wildBaubleTransforms.forEach((wb, idx) => {
    dummy.position.set(wb.x, wb.y, wb.z);
    dummy.rotation.set(0, idx * 0.9, 0);
    dummy.scale.setScalar(wb.scale);
    dummy.updateMatrix();
    instWildBaubles.setMatrixAt(idx, dummy.matrix);
    tempColor.setHex(wb.colorHex);
    instWildBaubles.setColorAt(idx, tempColor);
  });
  group.add(instWildBaubles);

  // 2. Helper Textures & Geometries for Village Tree Decorations
  let cachedCandyCaneTex = null;
  function getCandyCaneTexture() {
    if (cachedCandyCaneTex) return cachedCandyCaneTex;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#d92027';
    for (let x = -64; x < 128; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 32, 64);
      ctx.lineTo(x + 40, 64);
      ctx.lineTo(x + 8, 0);
      ctx.closePath();
      ctx.fill();
    }
    cachedCandyCaneTex = new THREE.CanvasTexture(canvas);
    cachedCandyCaneTex.wrapS = THREE.RepeatWrapping;
    cachedCandyCaneTex.wrapT = THREE.RepeatWrapping;
    cachedCandyCaneTex.repeat.set(1, 4);
    return cachedCandyCaneTex;
  }

  let cachedPeppermintTex = null;
  function getPeppermintTexture() {
    if (cachedPeppermintTex) return cachedPeppermintTex;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#d92027';
    const cx = 64, cy = 64;
    for (let i = 0; i < 8; i++) {
      const a1 = (i * 2 * Math.PI) / 8;
      const a2 = a1 + (Math.PI / 8);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 60, a1, a2);
      ctx.closePath();
      ctx.fill();
    }
    cachedPeppermintTex = new THREE.CanvasTexture(canvas);
    return cachedPeppermintTex;
  }

  function createCandyCaneGeo(scale) {
    const pts = [
      new THREE.Vector3(0, -0.11 * scale, 0),
      new THREE.Vector3(0, 0.07 * scale, 0),
      new THREE.Vector3(0.012 * scale, 0.10 * scale, 0),
      new THREE.Vector3(0.038 * scale, 0.10 * scale, 0),
      new THREE.Vector3(0.052 * scale, 0.07 * scale, 0)
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 18, 0.011 * scale, 6, false);
  }

  function createIcicleGeo(scale) {
    const geo = new THREE.ConeGeometry(0.020 * scale, 0.22 * scale, 6, 1);
    geo.rotateX(Math.PI);
    geo.translate(0, -0.10 * scale, 0);
    return geo;
  }

  function createUnderTreeGift(x, z, size, boxColor, ribbonColor) {
    const giftGroup = new THREE.Group();
    const gy = getGroundHeight(x, z);
    giftGroup.position.set(x, gy, z);

    const bH = size * 0.85;
    const boxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, bH, size),
      new THREE.MeshStandardMaterial({
        color: boxColor,
        roughness: 0.45,
        metalness: 0.12
      })
    );
    boxMesh.position.y = bH * 0.5;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    giftGroup.add(boxMesh);

    const ribMat = new THREE.MeshStandardMaterial({
      color: ribbonColor,
      metalness: 0.75,
      roughness: 0.25
    });
    const rThick = size * 0.14;
    const rH = bH + 0.005;
    const rib1 = new THREE.Mesh(new THREE.BoxGeometry(size + 0.005, rH, rThick), ribMat);
    rib1.position.y = boxMesh.position.y;
    giftGroup.add(rib1);
    const rib2 = new THREE.Mesh(new THREE.BoxGeometry(rThick, rH, size + 0.005), ribMat);
    rib2.position.y = boxMesh.position.y;
    giftGroup.add(rib2);

    const bow = new THREE.Mesh(new THREE.TorusGeometry(size * 0.16, size * 0.04, 6, 10), ribMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = 0.65;
    bow.position.y = bH + 0.015;
    giftGroup.add(bow);

    return giftGroup;
  }

  // 3. Build Decorated Christmas Trees (Hero trees & 5 Village Trees)
  function buildDecoratedTree(cfg, options = {}) {
    const isClickableMain = typeof options === 'boolean' ? options : !!options.isClickableMain;
    const theme = (typeof options === 'object' && options.theme) || (isClickableMain ? 'hero_main' : 'hero_second');
    const isVillageTree = typeof options === 'object' && !!options.isVillageTree;
    const treeGroup = new THREE.Group();
    treeGroup.name = cfg.id || 'decoratedTree';

    const groundY = getGroundHeight(cfg.x, cfg.z);
    treeGroup.position.set(cfg.x, groundY, cfg.z);
    const scale = cfg.height / 4.35;

    const foliageMesh = new THREE.Mesh(
      mergedFoliageGeo,
      new THREE.MeshStandardMaterial({
        color: COLORS.PINE_LIGHT,
        roughness: 0.72,
        emissive: 0x000000,
        emissiveIntensity: 0
      })
    );
    foliageMesh.scale.setScalar(scale);
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    treeGroup.add(foliageMesh);

    const snowMesh = new THREE.Mesh(mergedSnowCapGeo, snowCapMat);
    snowMesh.scale.setScalar(scale);
    snowMesh.castShadow = true;
    snowMesh.receiveShadow = true;
    treeGroup.add(snowMesh);

    const tMesh = new THREE.Mesh(trunkGeo, trunkMat);
    tMesh.scale.setScalar(scale);
    tMesh.castShadow = true;
    treeGroup.add(tMesh);

    // Baubles (ornaments) via InstancedMesh with theme-specific palettes
    let baublePalette = wildBaublePalette;
    if (theme === 'gold_white') {
      baublePalette = [0xffcc33, 0xffe066, 0xdfa015, 0xffd700, 0xf5c518];
    } else if (theme === 'candycane_red') {
      baublePalette = [0xd92027, 0xbb141a, 0xee2222, 0x990d12, 0xff4d4d];
    } else if (theme === 'multicolor_silver') {
      baublePalette = [0xf5f8fc, 0xd0dae4, 0xe4ecf4, 0xb8c6d4, 0xffffff];
    } else if (theme === 'blue_icicles') {
      baublePalette = [0x1e78ff, 0xf0f6ff, 0x0d47a1, 0x42a5f5, 0xd2e5f8, 0x2979ff];
    } else if (theme === 'elf_tree') {
      baublePalette = [0x00c853, 0xd92027, 0xffcc33, 0xab47bc, 0x00e676, 0xff5722];
    }

    const baubleGeo = new THREE.SphereGeometry(0.09 * scale, 12, 10);
    const baubleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.88,
      roughness: 0.14,
      emissive: 0x181410,
      emissiveIntensity: 0.25
    });
    const treeBaubleCount = branchAttachmentPoints.length;
    const instBaubles = new THREE.InstancedMesh(baubleGeo, baubleMat, treeBaubleCount);

    for (let b = 0; b < treeBaubleCount; b++) {
      const bp = branchAttachmentPoints[b];
      dummy.position.set(
        bp.tipX * 0.94 * scale,
        (bp.tipY - 0.07) * scale,
        bp.tipZ * 0.94 * scale
      );
      dummy.scale.setScalar(0.9 + (b % 3) * 0.12);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      instBaubles.setMatrixAt(b, dummy.matrix);
      tempColor.setHex(baublePalette[b % baublePalette.length]);
      instBaubles.setColorAt(b, tempColor);
    }
    treeGroup.add(instBaubles);

    // Glowing Top Star / Piek (Ornate toppers)
    let starMesh, starMat;
    if (theme === 'candycane_red') {
      // Ruby crystal piek (pointed tree topper with base bead)
      const piekSpire = new THREE.CylinderGeometry(0.012 * scale, 0.075 * scale, 0.44 * scale, 8);
      const piekBead = new THREE.SphereGeometry(0.072 * scale, 8, 8);
      piekBead.translate(0, -0.22 * scale, 0);
      starMat = new THREE.MeshStandardMaterial({
        color: 0xff1e38,
        emissive: 0xd9142e,
        emissiveIntensity: 3.4,
        metalness: 0.85,
        roughness: 0.15
      });
      starMesh = new THREE.Group();
      starMesh.add(new THREE.Mesh(piekSpire, starMat));
      starMesh.add(new THREE.Mesh(piekBead, starMat));
      starMesh.position.y = 4.46 * scale;
    } else if (theme === 'blue_icicles') {
      // Ice crystal star (pale cyan / diamond frost)
      starMat = new THREE.MeshStandardMaterial({
        color: 0x99e6ff,
        emissive: 0x44ccee,
        emissiveIntensity: 3.4,
        metalness: 0.85,
        roughness: 0.12
      });
      const starGeo = new THREE.IcosahedronGeometry(0.24 * scale, 0);
      starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.y = 4.42 * scale;
    } else if (theme === 'multicolor_silver') {
      // Brilliant silver diamond star
      starMat = new THREE.MeshStandardMaterial({
        color: 0xf5f8fc,
        emissive: 0xdde8f8,
        emissiveIntensity: 3.2,
        metalness: 0.95,
        roughness: 0.12
      });
      const starGeo = new THREE.OctahedronGeometry(0.26 * scale, 0);
      starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.y = 4.42 * scale;
    } else if (theme === 'elf_tree') {
      // Whimsical elven star with tiny golden bell underneath
      starMat = new THREE.MeshStandardMaterial({
        color: COLORS.GOLD_METAL,
        emissive: 0xffcc22,
        emissiveIntensity: 3.5,
        metalness: 0.85,
        roughness: 0.18
      });
      const starGeo = new THREE.OctahedronGeometry(0.24 * scale, 0);
      const bellGeo = new THREE.CylinderGeometry(0.012 * scale, 0.042 * scale, 0.055 * scale, 8);
      bellGeo.translate(0, -0.16 * scale, 0);
      starMesh = new THREE.Group();
      starMesh.add(new THREE.Mesh(starGeo, starMat));
      starMesh.add(new THREE.Mesh(bellGeo, starMat));
      starMesh.position.y = 4.42 * scale;
    } else {
      // Golden star for gold_white and hero trees
      starMat = new THREE.MeshStandardMaterial({
        color: COLORS.GOLD_METAL,
        emissive: 0xffbb22,
        emissiveIntensity: 3.2,
        metalness: 0.8,
        roughness: 0.15
      });
      const starGeo = new THREE.OctahedronGeometry((isClickableMain ? 0.28 : 0.25) * scale, 0);
      starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.y = 4.42 * scale;
    }
    treeGroup.add(starMesh);

    // Theme-Specific Accessories & Extra Decorations
    if (theme === 'hero_main' || theme === 'hero_second' || theme === 'gold_white') {
      // Golden spiral garland
      const garlandPoints = [];
      const turns = 4.2;
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const y = (0.82 + u * 3.22) * scale;
        const angle = u * turns * Math.PI * 2;
        const wave = 1.0 + Math.cos(angle * 3.5) * 0.08;
        const r = (1.46 * (1 - u * 0.76) * wave + 0.06) * scale;
        garlandPoints.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
      }
      const garlandCurve = new THREE.CatmullRomCurve3(garlandPoints);
      const garlandGeo = new THREE.TubeGeometry(garlandCurve, 64, 0.042 * scale, 6, false);
      const garlandMat = new THREE.MeshStandardMaterial({
        color: COLORS.GOLD_METAL,
        metalness: 0.85,
        roughness: 0.22,
        emissive: 0x553300,
        emissiveIntensity: 0.35
      });
      treeGroup.add(new THREE.Mesh(garlandGeo, garlandMat));
    } else if (theme === 'multicolor_silver') {
      // Shimmering silver spiral tinsel garland
      const garlandPoints = [];
      const turns = 4.2;
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const y = (0.80 + u * 3.22) * scale;
        const angle = u * turns * Math.PI * 2;
        const wave = 1.0 + Math.cos(angle * 3.5) * 0.08;
        const r = (1.44 * (1 - u * 0.76) * wave + 0.05) * scale;
        garlandPoints.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
      }
      const garlandCurve = new THREE.CatmullRomCurve3(garlandPoints);
      const garlandGeo = new THREE.TubeGeometry(garlandCurve, 64, 0.040 * scale, 6, false);
      const silverGarlandMat = new THREE.MeshStandardMaterial({
        color: 0xecf0f5,
        metalness: 0.94,
        roughness: 0.16,
        emissive: 0x252a38,
        emissiveIntensity: 0.35
      });
      treeGroup.add(new THREE.Mesh(garlandGeo, silverGarlandMat));
    } else if (theme === 'candycane_red') {
      // 12 Hanging red-white striped candy canes (zuurstokken) via InstancedMesh
      const caneGeo = createCandyCaneGeo(scale);
      const caneMat = new THREE.MeshStandardMaterial({
        map: getCandyCaneTexture(),
        roughness: 0.35,
        metalness: 0.05
      });
      const caneCount = Math.min(14, branchAttachmentPoints.length);
      const instCanes = new THREE.InstancedMesh(caneGeo, caneMat, caneCount);
      for (let c = 0; c < caneCount; c++) {
        const bp = branchAttachmentPoints[(c * 3) % branchAttachmentPoints.length];
        dummy.position.set(
          bp.tipX * 0.92 * scale,
          (bp.tipY - 0.12) * scale,
          bp.tipZ * 0.92 * scale
        );
        dummy.rotation.set(0.18 * Math.sin(c), c * 1.35, 0.18 * Math.cos(c));
        dummy.scale.setScalar(1.0);
        dummy.updateMatrix();
        instCanes.setMatrixAt(c, dummy.matrix);
      }
      treeGroup.add(instCanes);
    } else if (theme === 'blue_icicles') {
      // 16 Translucent crystal icicles (ijspegels) via InstancedMesh
      const icicleGeo = createIcicleGeo(scale);
      const icicleMat = new THREE.MeshStandardMaterial({
        color: 0xd6f0ff,
        roughness: 0.12,
        metalness: 0.10,
        transparent: true,
        opacity: 0.82,
        emissive: 0x102538,
        emissiveIntensity: 0.25
      });
      const icicleCount = Math.min(16, branchAttachmentPoints.length);
      const instIcicles = new THREE.InstancedMesh(icicleGeo, icicleMat, icicleCount);
      for (let ic = 0; ic < icicleCount; ic++) {
        const bp = branchAttachmentPoints[(ic * 2 + 1) % branchAttachmentPoints.length];
        dummy.position.set(
          bp.tipX * 0.95 * scale,
          (bp.tipY - 0.04) * scale,
          bp.tipZ * 0.95 * scale
        );
        dummy.rotation.set(0.08 * Math.sin(ic), 0, 0.08 * Math.cos(ic));
        dummy.scale.setScalar(0.85 + (ic % 3) * 0.15);
        dummy.updateMatrix();
        instIcicles.setMatrixAt(ic, dummy.matrix);
      }
      treeGroup.add(instIcicles);
    } else if (theme === 'elf_tree') {
      // Elfenboom decorations: hanging mini-gifts, bells & peppermints
      const elfPropGroup = new THREE.Group();
      const bellMat = new THREE.MeshStandardMaterial({
        color: COLORS.GOLD_METAL,
        metalness: 0.88,
        roughness: 0.18,
        emissive: 0x442200,
        emissiveIntensity: 0.3
      });
      const sweetMat = new THREE.MeshStandardMaterial({
        map: getPeppermintTexture(),
        roughness: 0.35,
        metalness: 0.05
      });

      // 6 hanging bells
      const bellGeo = new THREE.CylinderGeometry(0.008 * scale, 0.032 * scale, 0.045 * scale, 8);
      for (let i = 0; i < 6; i++) {
        const bp = branchAttachmentPoints[(i * 6) % branchAttachmentPoints.length];
        const bell = new THREE.Mesh(bellGeo, bellMat);
        bell.position.set(bp.tipX * 0.90 * scale, (bp.tipY - 0.08) * scale, bp.tipZ * 0.90 * scale);
        elfPropGroup.add(bell);
      }
      // 6 swirled peppermints
      const sweetGeo = new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, 0.016 * scale, 12);
      sweetGeo.rotateX(Math.PI / 2);
      for (let i = 0; i < 6; i++) {
        const bp = branchAttachmentPoints[(i * 6 + 2) % branchAttachmentPoints.length];
        const sweet = new THREE.Mesh(sweetGeo, sweetMat);
        sweet.position.set(bp.tipX * 0.91 * scale, (bp.tipY - 0.07) * scale, bp.tipZ * 0.91 * scale);
        sweet.rotation.y = i * 0.8;
        elfPropGroup.add(sweet);
      }
      // 6 mini hanging gifts
      const miniGiftColors = [0xd92027, 0x1e78ff, 0x00c853, 0xffbb22, 0xab47bc, 0xff7043];
      const miniGiftGeo = new THREE.BoxGeometry(0.07 * scale, 0.07 * scale, 0.07 * scale);
      for (let i = 0; i < 6; i++) {
        const bp = branchAttachmentPoints[(i * 6 + 4) % branchAttachmentPoints.length];
        const gMat = new THREE.MeshStandardMaterial({ color: miniGiftColors[i % miniGiftColors.length], roughness: 0.4 });
        const gift = new THREE.Mesh(miniGiftGeo, gMat);
        gift.position.set(bp.tipX * 0.88 * scale, (bp.tipY - 0.09) * scale, bp.tipZ * 0.88 * scale);
        gift.rotation.set(0.1, i * 0.9, 0.1);
        elfPropGroup.add(gift);
      }
      treeGroup.add(elfPropGroup);
    }

    // Under-Tree Gifts (Cadeautjes onder sommige bomen)
    if (theme === 'gold_white') {
      group.add(createUnderTreeGift(cfg.x + 0.55 * scale, cfg.z - 0.45 * scale, 0.32 * scale, 0xffe680, 0xffffff));
      group.add(createUnderTreeGift(cfg.x - 0.50 * scale, cfg.z + 0.40 * scale, 0.28 * scale, 0xffffff, 0xffcc33));
    } else if (theme === 'candycane_red') {
      group.add(createUnderTreeGift(cfg.x + 0.48 * scale, cfg.z + 0.42 * scale, 0.34 * scale, 0xd92027, 0x00c853));
      group.add(createUnderTreeGift(cfg.x - 0.52 * scale, cfg.z - 0.38 * scale, 0.27 * scale, 0x1e7838, 0xff2222));
    } else if (theme === 'blue_icicles') {
      group.add(createUnderTreeGift(cfg.x + 0.52 * scale, cfg.z - 0.40 * scale, 0.30 * scale, 0x2277dd, 0xf0f8ff));
      group.add(createUnderTreeGift(cfg.x - 0.45 * scale, cfg.z + 0.46 * scale, 0.26 * scale, 0xf0f8ff, 0x2277dd));
    } else if (theme === 'elf_tree') {
      group.add(createUnderTreeGift(cfg.x + 0.50 * scale, cfg.z + 0.35 * scale, 0.30 * scale, 0xffcc22, 0x9c27b0));
      group.add(createUnderTreeGift(cfg.x - 0.48 * scale, cfg.z - 0.42 * scale, 0.26 * scale, 0x00c853, 0xd92027));
      group.add(createUnderTreeGift(cfg.x + 0.15 * scale, cfg.z + 0.55 * scale, 0.22 * scale, 0xd92027, 0xffffff));
    }

    group.add(treeGroup);
    return { treeGroup, foliageMesh, starMesh, starMat, scale, groundY, cfg, theme, isVillageTree };
  }

  const mainTree = buildDecoratedTree(COORDS.mainChristmasTree, { isClickableMain: true, theme: 'hero_main' });
  const secondTree = buildDecoratedTree(COORDS.secondChristmasTree, { isClickableMain: false, theme: 'hero_second' });

  // Build the 5 Decorated Christmas Trees on the Elfenplein
  const villageTreesConfigs = COORDS.elfVillageChristmasTrees || [];
  const villageTrees = villageTreesConfigs.map((cfg, idx) =>
    buildDecoratedTree(cfg, { isVillageTree: true, theme: cfg.theme, treeIndex: idx })
  );

  // 4. Blinking Christmas Lights across ALL Trees (2 hero trees + 10 wild pines + 5 village trees)
  const bulbSpecs = [];

  function addBulbsForHeroTree(cx, cz, scale, count, treeId) {
    const baseY = getGroundHeight(cx, cz);
    // Branch-tip bulbs on all irregular boughs
    branchAttachmentPoints.forEach((bp, bIdx) => {
      const u = Math.max(0, Math.min(1, (bp.tipY - 0.8) / 3.4));
      bulbSpecs.push({
        x: cx + bp.tipX * 0.97 * scale,
        y: baseY + (bp.tipY + 0.02) * scale,
        z: cz + bp.tipZ * 0.97 * scale,
        u,
        indexInTree: bIdx,
        treeId,
        theme: null,
        phase: bIdx * 0.55 + treeId * 1.9,
        baseColorHex: COLORS.BULB_PALETTE[(bIdx + treeId) % COLORS.BULB_PALETTE.length]
      });
    });

    // Plus spiral string bulbs weaving between branches
    for (let i = 0; i < count; i++) {
      const u = (i + 0.3) / count;
      const y = baseY + (0.82 + u * 3.28) * scale;
      const angle = u * 6.5 * Math.PI * 2 + treeId * 1.3;
      const lobeMod = 1.0 + Math.cos(angle * 3.5) * 0.1;
      const r = (1.46 * (1 - u * 0.76) * lobeMod + 0.05) * scale;
      const idxInTree = branchAttachmentPoints.length + i;
      bulbSpecs.push({
        x: cx + Math.cos(angle) * r,
        y,
        z: cz + Math.sin(angle) * r,
        u,
        indexInTree: idxInTree,
        treeId,
        theme: null,
        phase: idxInTree * 0.65 + treeId * 1.9,
        baseColorHex: COLORS.BULB_PALETTE[(idxInTree + treeId) % COLORS.BULB_PALETTE.length]
      });
    }
  }

  function addBulbsForVillageTree(cx, cz, scale, count, treeId, theme) {
    const baseY = getGroundHeight(cx, cz);

    const getThemeBulbBaseColor = (th, idx) => {
      if (th === 'gold_white') return 0xfff2d6;
      if (th === 'candycane_red') return idx % 2 === 0 ? 0xff2222 : 0xffffff;
      if (th === 'blue_icicles') return idx % 2 === 0 ? 0x55ccff : 0xf2f8ff;
      if (th === 'elf_tree') {
        const elfPalette = [0xffdd33, 0x33ff77, 0xff3399, 0x33ddff];
        return elfPalette[idx % elfPalette.length];
      }
      return COLORS.BULB_PALETTE[idx % COLORS.BULB_PALETTE.length];
    };

    // Branch-tip bulbs on all irregular boughs
    branchAttachmentPoints.forEach((bp, bIdx) => {
      const u = Math.max(0, Math.min(1, (bp.tipY - 0.8) / 3.4));
      bulbSpecs.push({
        x: cx + bp.tipX * 0.97 * scale,
        y: baseY + (bp.tipY + 0.02) * scale,
        z: cz + bp.tipZ * 0.97 * scale,
        u,
        indexInTree: bIdx,
        treeId,
        theme,
        phase: bIdx * 0.58 + treeId * 1.7,
        baseColorHex: getThemeBulbBaseColor(theme, bIdx)
      });
    });

    // Plus spiral string bulbs weaving around branches
    for (let i = 0; i < count; i++) {
      const u = (i + 0.3) / count;
      const y = baseY + (0.80 + u * 3.25) * scale;
      const angle = u * 6.2 * Math.PI * 2 + treeId * 1.4;
      const lobeMod = 1.0 + Math.cos(angle * 3.5) * 0.1;
      const r = (1.44 * (1 - u * 0.76) * lobeMod + 0.05) * scale;
      const idxInTree = branchAttachmentPoints.length + i;
      bulbSpecs.push({
        x: cx + Math.cos(angle) * r,
        y,
        z: cz + Math.sin(angle) * r,
        u,
        indexInTree: idxInTree,
        treeId,
        theme,
        phase: idxInTree * 0.65 + treeId * 1.7,
        baseColorHex: getThemeBulbBaseColor(theme, idxInTree)
      });
    }
  }

  function addBulbsForWildPine(treeMat, treeId) {
    let idxInTree = 0;
    // Place glowing bulbs along every irregular branch bough (tip + mid-bough swag)
    branchAttachmentPoints.forEach((bp, bIdx) => {
      const u = Math.max(0, Math.min(1, (bp.tipY - 0.8) / 3.4));

      // Outer branch tip bulb
      tempVec.set(
        bp.tipX * 0.96,
        bp.tipY + 0.025,
        bp.tipZ * 0.96
      ).applyMatrix4(treeMat);

      bulbSpecs.push({
        x: tempVec.x,
        y: tempVec.y,
        z: tempVec.z,
        u,
        indexInTree: idxInTree,
        treeId,
        theme: null,
        phase: idxInTree * 0.62 + treeId * 1.7,
        baseColorHex: COLORS.BULB_PALETTE[(idxInTree + treeId) % COLORS.BULB_PALETTE.length]
      });
      idxInTree++;

      // Warm draped garland bulb partway along the bough
      const swagAngle = bp.theta + 0.26;
      const swagR = bp.reachR * 0.8;
      tempVec.set(
        Math.cos(swagAngle) * swagR,
        bp.midY - 0.02,
        Math.sin(swagAngle) * swagR
      ).applyMatrix4(treeMat);

      bulbSpecs.push({
        x: tempVec.x,
        y: tempVec.y,
        z: tempVec.z,
        u,
        indexInTree: idxInTree,
        treeId,
        theme: null,
        phase: idxInTree * 0.62 + treeId * 1.7,
        baseColorHex: COLORS.BULB_PALETTE[(bIdx * 2 + treeId + 1) % COLORS.BULB_PALETTE.length]
      });
      idxInTree++;
    });
  }

  addBulbsForHeroTree(COORDS.mainChristmasTree.x, COORDS.mainChristmasTree.z, mainTree.scale, 36, 0);
  addBulbsForHeroTree(COORDS.secondChristmasTree.x, COORDS.secondChristmasTree.z, secondTree.scale, 28, 1);
  wildPineMatrices.forEach((treeMat, idx) => {
    addBulbsForWildPine(treeMat, idx + 2);
  });
  villageTrees.forEach((vt, idx) => {
    const cfg = vt.cfg;
    addBulbsForVillageTree(cfg.x, cfg.z, vt.scale, 26, 20 + idx, vt.theme);
  });

  const totalBulbs = bulbSpecs.length;
  const bulbGeo = new THREE.SphereGeometry(0.064, 8, 8);
  const bulbMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false
  });
  const instBulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, totalBulbs);

  bulbSpecs.forEach((b, idx) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.scale.setScalar(1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    instBulbs.setMatrixAt(idx, dummy.matrix);
    tempColor.setHex(b.baseColorHex);
    instBulbs.setColorAt(idx, tempColor);
  });
  group.add(instBulbs);

  // 5. Clickable Tree Interactions & Camera Focus
  const PATTERN_NAMES = [
    'Klassieke Twinkeling ✨',
    'Noordpool Spiraalgolf 🌀',
    'Zuurstok Rood-Wit-Goud 🍬',
    'Kerstavond Sterrenpuls 🌟'
  ];
  let currentPattern = 0;
  let starBoostTimer = 0;
  const mainTreeTooltipPos = new THREE.Vector3(
    COORDS.mainChristmasTree.x,
    COORDS.mainChristmasTree.height + 0.8,
    COORDS.mainChristmasTree.z
  );

  if (interaction) {
    interaction.registerClickable(mainTree.treeGroup, {
      id: 'mainChristmasTree',
      label: 'Grote Kerstboom 🎄',
      glowMeshes: [mainTree.starMesh, mainTree.foliageMesh],
      focusTarget: new THREE.Vector3(
        COORDS.mainChristmasTree.x,
        mainTree.groundY + 2.5,
        COORDS.mainChristmasTree.z
      ),
      focusDistance: 5.8,
      focusHeightOffset: 0.5,
      onClick: () => {
        currentPattern = (currentPattern + 1) % PATTERN_NAMES.length;
        starBoostTimer = 2.2;
        interaction.showTooltip(
          `Lichtpatroon: ${PATTERN_NAMES[currentPattern]}`,
          mainTreeTooltipPos,
          3.2
        );
        if (audio) audio.playChime(1.0 + currentPattern * 0.15);
      }
    });

    if (interaction.registerFocusable) {
      interaction.registerFocusable(secondTree.treeGroup, {
        id: 'secondChristmasTree',
        label: 'Kerstboom bij de Werkplaats 🎄',
        focusTarget: new THREE.Vector3(
          COORDS.secondChristmasTree.x,
          secondTree.groundY + 2.1,
          COORDS.secondChristmasTree.z
        ),
        focusDistance: 5.2,
        focusHeightOffset: 0.45
      });

      // Register all 5 village trees for smooth camera focus and double-click navigation
      villageTrees.forEach((vt, vIdx) => {
        const cfg = vt.cfg;
        const tipPos = new THREE.Vector3(cfg.x, vt.groundY + cfg.height + 0.6, cfg.z);
        interaction.registerFocusable(vt.treeGroup, {
          id: cfg.id,
          label: `Elfenplein Kerstboom: ${cfg.name} 🎄`,
          focusTarget: new THREE.Vector3(cfg.x, vt.groundY + cfg.height * 0.5, cfg.z),
          focusDistance: 4.8,
          focusHeightOffset: 0.4
        });

        if (interaction.registerClickable) {
          interaction.registerClickable(vt.treeGroup, {
            id: cfg.id,
            label: `Elfenplein Kerstboom: ${cfg.name} 🎄`,
            glowMeshes: [vt.starMesh, vt.foliageMesh],
            focusTarget: new THREE.Vector3(cfg.x, vt.groundY + cfg.height * 0.5, cfg.z),
            focusDistance: 4.8,
            focusHeightOffset: 0.4,
            onClick: () => {
              interaction.showTooltip(`Elfenplein Kerstboom: ${cfg.name} ✨`, tipPos, 3.2);
              if (audio && typeof audio.playChime === 'function') {
                audio.playChime(1.1 + vIdx * 0.12);
              }
            }
          });
        }
      });

      const resolveWildPineFocus = (hit) => {
        const idx =
          hit.instanceId !== undefined && hit.instanceId < allPines.length
            ? hit.instanceId
            : 0;
        const p = allPines[idx];
        const gy = getGroundHeight(p.x, p.z);
        return {
          target: new THREE.Vector3(p.x, gy + 2.1 * p.scale, p.z),
          distance: 4.8 * p.scale,
          heightOffset: 0.45,
          label: `Versierde Noordpool-den #${idx + 1} 🌲`,
          tooltipPos: new THREE.Vector3(p.x, gy + 4.3 * p.scale, p.z)
        };
      };

      [instTrunks, instFoliage, instSnowCaps].forEach((instMesh) => {
        interaction.registerFocusable(instMesh, {
          id: 'wildPine',
          getFocusConfig: resolveWildPineFocus
        });
      });
    }
  }

  function update(delta, elapsed) {
    // Rotate & pulse top stars of all decorated trees
    mainTree.starMesh.rotation.y = elapsed * 1.2;
    secondTree.starMesh.rotation.y = -elapsed * 1.0;

    villageTrees.forEach((vt, idx) => {
      if (vt.starMesh) {
        vt.starMesh.rotation.y = elapsed * (0.9 + (idx % 3) * 0.3) * (idx % 2 === 0 ? 1 : -1);
      }
    });

    if (starBoostTimer > 0) {
      starBoostTimer = Math.max(0, starBoostTimer - delta);
      mainTree.starMat.emissiveIntensity = 6.0 + Math.sin(elapsed * 16.0) * 1.6;
      mainTree.starMesh.scale.setScalar(1.35);
    } else {
      mainTree.starMat.emissiveIntensity = 3.2 + Math.sin(elapsed * 3.0) * 0.55;
      mainTree.starMesh.scale.setScalar(1.0);
    }

    // Update all blinking Christmas bulbs across all trees (compensated for lower scene exposure)
    const exposureComp = 1.46;
    for (let i = 0; i < totalBulbs; i++) {
      const b = bulbSpecs[i];

      if (b.theme) {
        // Unique animated blinking pattern and phase per village tree theme
        if (b.theme === 'gold_white') {
          // Warm white twinkling candle shimmer
          const wave = 0.5 + 0.5 * Math.sin(elapsed * 3.8 + b.phase);
          const brightness = (0.32 + Math.pow(wave, 1.8) * 1.9) * exposureComp;
          tempColor.setHex(0xfff2d6);
          tempColor.multiplyScalar(brightness);
        } else if (b.theme === 'candycane_red') {
          // Candy-cane red / crisp white alternating wave
          const slot = (b.indexInTree + Math.floor(elapsed * 3.4)) % 2;
          const wave = 0.5 + 0.5 * Math.sin(elapsed * 5.0 + b.phase);
          const hex = slot === 0 ? 0xff2222 : 0xffffff;
          tempColor.setHex(hex);
          tempColor.multiplyScalar((0.45 + wave * 1.7) * exposureComp);
        } else if (b.theme === 'multicolor_silver') {
          // Multicolor spiral rainbow chase wave
          const wave = 0.5 + 0.5 * Math.sin(b.u * 14.0 - elapsed * 5.8 + b.phase);
          const slot = (b.indexInTree + Math.floor(elapsed * 2.5)) % COLORS.BULB_PALETTE.length;
          tempColor.setHex(COLORS.BULB_PALETTE[slot]);
          tempColor.multiplyScalar((0.30 + Math.pow(wave, 2.5) * 2.2) * exposureComp);
        } else if (b.theme === 'blue_icicles') {
          // Cool ice-blue and crisp diamond-white twinkling lights with sudden diamond glints
          const isFrost = (b.indexInTree % 2 === 0);
          const wave = 0.5 + 0.5 * Math.sin(elapsed * 4.2 + b.phase);
          const glint = Math.pow(Math.max(0, Math.sin(elapsed * 2.6 + b.phase * 3.1)), 10.0) * 2.6;
          tempColor.setHex(isFrost ? 0x55ccff : 0xf2f8ff);
          tempColor.multiplyScalar((0.30 + wave * 1.4 + glint) * exposureComp);
        } else if (b.theme === 'elf_tree') {
          // Cheerful, playful fairy lights
          const elfColors = [0xffdd33, 0x33ff77, 0xff3399, 0x33ddff];
          const wave = 0.5 + 0.5 * Math.sin(elapsed * 6.5 + b.phase * 1.4);
          tempColor.setHex(elfColors[(b.indexInTree + Math.floor(elapsed * 2.2)) % elfColors.length]);
          tempColor.multiplyScalar((0.38 + wave * 1.8) * exposureComp);
        }
      } else {
        // Hero trees and wild pines patterns
        const pat = b.treeId === 0 ? currentPattern : (currentPattern + b.treeId) % 4;
        let brightness = 1.0;

        if (pat === 0) {
          // Twinkle
          const wave = 0.5 + 0.5 * Math.sin(elapsed * 4.2 + b.phase);
          brightness = (0.2 + Math.pow(wave, 2.2) * 2.2) * exposureComp;
          tempColor.setHex(b.baseColorHex);
        } else if (pat === 1) {
          // Spiral chase wave
          const wave = 0.5 + 0.5 * Math.sin(b.u * 18.0 - elapsed * 6.5 + b.treeId);
          brightness = (0.15 + Math.pow(wave, 3.0) * 2.5) * exposureComp;
          tempColor.setHex(b.baseColorHex);
        } else if (pat === 2) {
          // Candy-cane red / white / gold alternation
          const slot = (b.indexInTree + Math.floor(elapsed * 3.2)) % 3;
          const hex = slot === 0 ? 0xff2222 : slot === 1 ? 0xffffff : 0xffcc33;
          tempColor.setHex(hex);
          brightness = 1.85 * exposureComp;
        } else {
          // Synchronized festive pulse
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * 8.5 + b.u * 4.0);
          tempColor.setHex(b.baseColorHex);
          brightness = (0.35 + pulse * 2.4) * exposureComp;
        }

        tempColor.multiplyScalar(brightness);
      }

      instBulbs.setColorAt(i, tempColor);
    }
    instBulbs.instanceColor.needsUpdate = true;
  }

  scene.add(group);
  return { group, update };
}
