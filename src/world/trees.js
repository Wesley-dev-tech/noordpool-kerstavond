import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, COORDS, GROUPS } from '../config.js';
import { fbm2D, getTerrainHeight } from '../utils/procedural.js';

export function createTrees(scene, interaction, audio) {
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_TREES;

  // 1. Realistic Wild Pine Geometry with Irregular Branches & Lumpy Snow Clumps
  const allPines = [...COORDS.litPines, ...COORDS.forestPines];
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
    const groundY = getTerrainHeight(p.x, p.z);
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

  // 2. Build 2 Decorated Hero Christmas Trees
  function buildDecoratedTree(cfg, isClickableMain) {
    const treeGroup = new THREE.Group();
    const groundY = getTerrainHeight(cfg.x, cfg.z);
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
    treeGroup.add(snowMesh);

    const tMesh = new THREE.Mesh(trunkGeo, trunkMat);
    tMesh.scale.setScalar(scale);
    treeGroup.add(tMesh);

    // Golden spiral garland (TubeGeometry)
    const garlandPoints = [];
    const turns = 4.5;
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const y = (0.82 + u * 3.22) * scale;
      const angle = u * turns * Math.PI * 2;
      const wave = 1.0 + Math.cos(angle * 3.5) * 0.08;
      const r = (1.46 * (1 - u * 0.76) * wave + 0.06) * scale;
      garlandPoints.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    const garlandCurve = new THREE.CatmullRomCurve3(garlandPoints);
    const garlandGeo = new THREE.TubeGeometry(garlandCurve, 72, 0.045 * scale, 6, false);
    const garlandMat = new THREE.MeshStandardMaterial({
      color: COLORS.GOLD_METAL,
      metalness: 0.85,
      roughness: 0.22,
      emissive: 0x553300,
      emissiveIntensity: 0.35
    });
    treeGroup.add(new THREE.Mesh(garlandGeo, garlandMat));

    // Baubles (ornaments) anchored to the irregular branch points + spiral accents
    const baubleGeo = new THREE.SphereGeometry(0.1 * scale, 12, 12);
    const baubleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.88,
      roughness: 0.14,
      emissive: 0x221508,
      emissiveIntensity: 0.25
    });
    const heroBaubleCount = branchAttachmentPoints.length;
    const instBaubles = new THREE.InstancedMesh(baubleGeo, baubleMat, heroBaubleCount);

    for (let b = 0; b < heroBaubleCount; b++) {
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
      tempColor.setHex(wildBaublePalette[b % wildBaublePalette.length]);
      instBaubles.setColorAt(b, tempColor);
    }
    treeGroup.add(instBaubles);

    // Glowing Top Star
    const starMat = new THREE.MeshStandardMaterial({
      color: COLORS.GOLD_METAL,
      emissive: 0xffbb22,
      emissiveIntensity: 3.2,
      metalness: 0.8,
      roughness: 0.15
    });
    const starGeo = new THREE.OctahedronGeometry(0.28 * scale, 0);
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.position.y = 4.42 * scale;
    treeGroup.add(starMesh);

    group.add(treeGroup);
    return { treeGroup, foliageMesh, starMesh, starMat, scale, groundY };
  }

  const mainTree = buildDecoratedTree(COORDS.mainChristmasTree, true);
  const secondTree = buildDecoratedTree(COORDS.secondChristmasTree, false);

  // 3. Blinking Christmas Lights across ALL 12 Trees (2 hero trees + all 10 wild pines)
  const bulbSpecs = [];

  function addBulbsForHeroTree(cx, cz, scale, count, treeId) {
    const baseY = getTerrainHeight(cx, cz);
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
        phase: idxInTree * 0.65 + treeId * 1.9,
        baseColorHex: COLORS.BULB_PALETTE[(idxInTree + treeId) % COLORS.BULB_PALETTE.length]
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

  // 4. Clickable Main Christmas Tree Pattern Switcher
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

      const resolveWildPineFocus = (hit) => {
        const idx =
          hit.instanceId !== undefined && hit.instanceId < allPines.length
            ? hit.instanceId
            : 0;
        const p = allPines[idx];
        const gy = getTerrainHeight(p.x, p.z);
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
    // Rotate & pulse top stars
    mainTree.starMesh.rotation.y = elapsed * 1.2;
    secondTree.starMesh.rotation.y = -elapsed * 1.0;

    if (starBoostTimer > 0) {
      starBoostTimer = Math.max(0, starBoostTimer - delta);
      mainTree.starMat.emissiveIntensity = 6.0 + Math.sin(elapsed * 16.0) * 1.6;
      mainTree.starMesh.scale.setScalar(1.35);
    } else {
      mainTree.starMat.emissiveIntensity = 3.2 + Math.sin(elapsed * 3.0) * 0.55;
      mainTree.starMesh.scale.setScalar(1.0);
    }

    // Update all blinking Christmas bulbs across all 12 trees (compensated for lower scene exposure)
    const exposureComp = 1.46;
    for (let i = 0; i < totalBulbs; i++) {
      const b = bulbSpecs[i];
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
      instBulbs.setColorAt(i, tempColor);
    }
    instBulbs.instanceColor.needsUpdate = true;
  }

  scene.add(group);
  return { group, update };
}
