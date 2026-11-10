import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, COORDS, getSceneObstacles, checkOverlap } from '../config.js';
import { createElf } from '../actors/elf-model.js';
import { getGroundGlowTexture } from './path.js';
import {
  createWoodTexture,
  createWindowGlowTexture,
  createSmokeSprite,
  fbm2D,
  getTerrainHeight
} from '../utils/procedural.js';

/**
 * Safely merges an array of BufferGeometries by ensuring consistent index and attribute layouts.
 */
function safeMergeGeometries(geometries) {
  if (!geometries || geometries.length === 0) return new THREE.BufferGeometry();
  const normalized = geometries.map((g) => {
    const geom = g.index ? g.toNonIndexed() : g.clone();
    if (!geom.attributes.normal) {
      geom.computeVertexNormals();
    }
    if (!geom.attributes.uv) {
      const count = geom.attributes.position.count;
      geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    for (const key of Object.keys(geom.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') {
        geom.deleteAttribute(key);
      }
    }
    return geom;
  });
  const merged = mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  return merged;
}

/**
 * Creates a triangular prism (gable wall or pitched roof core) centered at X=0, base at Y=0, peak at Y=peakH.
 */
function createGablePrismGeometry(width, peakH, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.lineTo(width * 0.5, 0);
  shape.lineTo(0, peakH);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a gambrel (two-slope Dutch/Nordic barn-style) gable prism geometry.
 */
function createGambrelPrismGeometry(width, kneeW, kneeH, peakH, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.lineTo(width * 0.5, 0);
  shape.lineTo(kneeW * 0.5, kneeH);
  shape.lineTo(0, peakH);
  shape.lineTo(-kneeW * 0.5, kneeH);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Deforms a sphere into an organic, wind-sculpted snow drift / cushion.
 */
function createSculptedSnowDriftGeo(rx, ry, rz, seed = 1.0, segW = 12, segH = 9) {
  const geo = new THREE.SphereGeometry(1, segW, segH);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);

    if (vy < 0) {
      vy *= 0.28;
    } else {
      vy = Math.pow(vy, 0.86);
    }

    const n = fbm2D(vx * 2.4 + seed * 3.7, vz * 2.4 - seed * 2.1, 2);
    const scale = 1.0 + n * 0.16;
    pos.setXYZ(i, vx * rx * scale, vy * ry * (1.0 + Math.abs(n) * 0.12), vz * rz * scale);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates an adorable elf using the shared unified elf model that steps out of a cottage doorway.
 */
function createEmergingElf(houseIdx, cfg) {
  const suitColors = [0x00c853, 0xff1744, 0x00e676, 0x1565c0, 0xff9100, 0xd500f9];
  const suitColor = suitColors[houseIdx % suitColors.length];
  const trimColor = houseIdx % 2 === 0 ? 0xffffff : 0x00e676;
  const shoeColor = houseIdx % 2 === 0 ? 0xd92027 : 0x00c853;

  const elf = createElf({
    id: `emergingElf_${cfg.name}`,
    name: `Elfje van ${cfg.name}`,
    suitColor,
    trimColor,
    shoeColor,
    scale: 0.95
  });

  // Attach themed cottage prop to elf's left hand
  const propGroup = new THREE.Group();
  propGroup.position.set(0, -0.04, 0.04);
  if (elf.leftHand) elf.leftHand.add(propGroup);

  if (houseIdx === 0) {
    const trainMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.05, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xd92027 })
    );
    propGroup.add(trainMesh);
  } else if (houseIdx === 1) {
    const cookMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.015, 8),
      new THREE.MeshStandardMaterial({ color: 0xb5651d, roughness: 0.9 })
    );
    cookMesh.rotateX(Math.PI / 2);
    propGroup.add(cookMesh);
  } else if (houseIdx === 2) {
    const envMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.05, 0.012),
      new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.5 })
    );
    propGroup.add(envMesh);
  } else if (houseIdx === 3) {
    const watchMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.014, 8),
      new THREE.MeshStandardMaterial({ color: COLORS.GOLD_METAL, metalness: 0.85, roughness: 0.25 })
    );
    watchMesh.rotateX(Math.PI / 2);
    propGroup.add(watchMesh);
  } else if (houseIdx === 4) {
    const caneMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.11, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    caneMesh.rotation.z = 0.45;
    propGroup.add(caneMesh);
  } else {
    const bookMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.055, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.6 })
    );
    propGroup.add(bookMesh);
  }

  return {
    group: elf.root,
    head: elf.head,
    waveArm: elf.rightArm,
    elf
  };
}

/**
 * Builds the Elf Village (`src/world/elf-village.js`) in its own dedicated clearing links-vooraan:
 * - Minimum 15 m from the workshop (-10, -7) and North Pole (0, 0)
 * - 10 m radius clearance around the village square free of trees
 * - 6 varied elf cottages arranged in a crescent overlooking the open square
 * - Cozy village square with ornate street lantern (warm PointLight), wooden bench & mini-tree
 * - Terrain-conforming snowy path linking the workshop porch to the village
 */
export function createElfVillage(scene, interaction = null, audio = null) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'elfVillageGroup';

  // Village Square center ("dorpspleintje") on open clearing links-vooraan
  const squareCenter = { ...COORDS.elfVillage.squareCenter }; // { x: -16.5, y: 0, z: 7.0 }
  const squareGroundY = getTerrainHeight(squareCenter.x, squareCenter.z);

  // ---------------------------------------------------------------------------
  // 1. Shared Textures & Materials
  // ---------------------------------------------------------------------------
  const woodTex = createWoodTexture();
  const winGlowTex = createWindowGlowTexture();

  const snowMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.26,
    roughness: 0.66,
    metalness: 0.05
  });

  const trimWoodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: COLORS.WOOD_DARK,
    roughness: 0.80,
    metalness: 0.05
  });

  const warmWoodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: COLORS.WOOD_WARM,
    roughness: 0.76,
    metalness: 0.05
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    color: COLORS.STONE_CHIMNEY,
    roughness: 0.88,
    metalness: 0.08
  });

  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1d222b,
    roughness: 0.38,
    metalness: 0.78
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: COLORS.GOLD_METAL,
    roughness: 0.22,
    metalness: 0.88,
    emissive: 0x3a2200,
    emissiveIntensity: 0.2
  });

  const wreathPineMat = new THREE.MeshStandardMaterial({
    color: COLORS.PINE_LIGHT,
    roughness: 0.78,
    metalness: 0.03
  });

  const festiveRedMat = new THREE.MeshStandardMaterial({
    color: COLORS.POLE_RED,
    emissive: 0x330505,
    emissiveIntensity: 0.22,
    roughness: 0.42
  });

  const flueDarkMat = new THREE.MeshBasicMaterial({ color: 0x0b0d12 });

  const icicleMat = new THREE.MeshStandardMaterial({
    color: 0xc8ebff,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85
  });

  // ---------------------------------------------------------------------------
  // 2. Configuration for the 6 Elf Cottages (all >= 15 m from workshop & north pole, >= 6 m edge-to-edge)
  // ---------------------------------------------------------------------------
  const rawHouseConfigs = [
    {
      name: 'elfHouse_1',
      label: 'Elfenhuisje 1 — Speelgoedmakerij 🛠️',
      x: -7.8,
      z: 15.6,
      rotOffset: 0.14,
      w: 3.15,
      h: 1.68,
      d: 2.55,
      roofPeakH: 1.38,
      roofType: 'steepGable',
      wallColor: 0x8f2924,
      roofColor: 0x3a2114,
      doorColor: 0x6b3e23,
      doorStyle: 'round',
      chimneySide: -1,
      phase: 0.0,
      emergingQuote: 'Welkom in de Speelgoedmakerij! De houten treintjes zijn klaar! 🚂✨'
    },
    {
      name: 'elfHouse_2',
      label: 'Elfenhuisje 2 — Peperkoekbakkerij 🥨',
      x: -13.6,
      z: 24.2,
      rotOffset: -0.16,
      w: 3.45,
      h: 1.62,
      d: 2.70,
      roofPeakH: 1.48,
      roofType: 'gambrel',
      wallColor: 0x264e36,
      roofColor: 0x422616,
      doorColor: 0x7c3324,
      doorStyle: 'arched',
      chimneySide: 1,
      phase: 1.1,
      emergingQuote: 'Versgebakken peperkoek en warme kerstkransjes! Kom lekker binnen! 🥨🍪'
    },
    {
      name: 'elfHouse_3',
      label: 'Elfenhuisje 3 — Elfenposthuisje 📯',
      x: -23.4,
      z: 23.8,
      rotOffset: 0.18,
      w: 2.85,
      h: 1.82,
      d: 2.40,
      roofPeakH: 1.56,
      roofType: 'dormerGable',
      wallColor: 0x8c5828,
      roofColor: 0x331d12,
      doorColor: 0x254f34,
      doorStyle: 'round',
      chimneySide: -1,
      phase: 2.2,
      emergingQuote: 'Honderden brieven voor de Kerstman gesorteerd! Alles op tijd! ✉️📯'
    },
    {
      name: 'elfHouse_4',
      label: 'Elfenhuisje 4 — Klokkenmakerij 🕰️',
      x: -31.2,
      z: 17.6,
      rotOffset: -0.12,
      w: 3.05,
      h: 1.74,
      d: 2.50,
      roofPeakH: 1.44,
      roofType: 'steepGable',
      wallColor: 0x2c4969,
      roofColor: 0x3b2214,
      doorColor: 0x734122,
      doorStyle: 'arched',
      chimneySide: 1,
      phase: 3.3,
      emergingQuote: 'Tik-tak! De grote Noordpoolklok loopt precies op tijd voor kerstavond! 🕰️⭐'
    },
    {
      name: 'elfHouse_5',
      label: 'Elfenhuisje 5 — Snoep- & Zuurstokhuisje 🍬',
      x: -33.5,
      z: 7.8,
      rotOffset: 0.20,
      w: 3.30,
      h: 1.54,
      d: 2.65,
      roofPeakH: 1.34,
      roofType: 'gambrel',
      wallColor: 0x6b3a20,
      roofColor: 0x472318,
      doorColor: 0x8e2420,
      doorStyle: 'round',
      chimneySide: -1,
      phase: 4.4,
      emergingQuote: 'Zuurstokken, pepermunt en marsepein voor iedereen! Smullen maar! 🍬🍭'
    },
    {
      name: 'elfHouse_6',
      label: 'Elfenhuisje 6 — Verhalen- & Boekenhuisje 📖',
      x: -27.2,
      z: -0.8,
      rotOffset: -0.15,
      w: 2.95,
      h: 1.66,
      d: 2.45,
      roofPeakH: 1.46,
      roofType: 'dormerGable',
      wallColor: 0x6d2b3d,
      roofColor: 0x361f13,
      doorColor: 0x693c20,
      doorStyle: 'arched',
      chimneySide: 1,
      phase: 5.5,
      emergingQuote: 'Welkom bij het haardvuur! Tijd voor een magisch kerstverhaal! 📖✨'
    }
  ];

  // Animation states & village-wide interactive lighting state
  const houseAnims = [];
  let villageLightsOn = true;
  let isHighQuality = false;
  let lanternShadowTimer = 0;

  function toggleVillageLights() {
    villageLightsOn = !villageLightsOn;
    villagePointLight.visible = villageLightsOn;
    if (!villageLightsOn) {
      villagePointLight.castShadow = false;
    } else if (isHighQuality) {
      villagePointLight.castShadow = true;
      villagePointLight.shadow.needsUpdate = true;
    }

    if (audio && (typeof audio.isEnabled !== 'function' || audio.isEnabled())) {
      if (typeof audio.playElfBell === 'function') {
        audio.playElfBell();
      } else if (typeof audio.playChime === 'function') {
        audio.playChime(villageLightsOn ? 1.6 : 0.85);
      }
    }

    const lanternWorldPos = new THREE.Vector3(
      squareCenter.x + 0.85,
      squareGroundY + 2.7,
      squareCenter.z + 0.55
    );

    const statusText = villageLightsOn
      ? '✨ Dorpslichtjes ingeschakeld! (Lantaarn, ramen & slingers aan)'
      : '🌙 Dorpslichtjes uitgeschakeld! (Welterusten elfjes)';

    if (interaction && interaction.showTooltip) {
      interaction.showTooltip(statusText, lanternWorldPos, 3.2);
    }
  }

  function openCottageDoor(houseIndex) {
    const anim = houseAnims[houseIndex];
    if (!anim) return;

    anim.timer = 4.5;
    anim.emergingElf.group.visible = true;

    if (audio && (typeof audio.isEnabled !== 'function' || audio.isEnabled())) {
      if (typeof audio.playDoorCreak === 'function') audio.playDoorCreak();
      setTimeout(() => {
        if (audio && (typeof audio.isEnabled !== 'function' || audio.isEnabled())) {
          if (typeof audio.playElfBell === 'function') audio.playElfBell();
          else if (typeof audio.playChime === 'function') audio.playChime(1.7);
        }
      }, 420);
    }

    const tipPos = new THREE.Vector3(
      rawHouseConfigs[houseIndex].x,
      getTerrainHeight(rawHouseConfigs[houseIndex].x, rawHouseConfigs[houseIndex].z) + rawHouseConfigs[houseIndex].h + 0.85,
      rawHouseConfigs[houseIndex].z
    );
    if (interaction && interaction.showTooltip) {
      interaction.showTooltip(rawHouseConfigs[houseIndex].emergingQuote, tipPos, 4.0);
    }
  }

  // Validate house placements against overlap and verify distances
  const baseObstacles = getSceneObstacles().filter((o) => o.id !== 'elfVillageSquare' && !o.id.startsWith('elfHouse'));
  const placedHouses = [];
  const houseConfigs = rawHouseConfigs.map((cfg, hIdx) => {
    const radius = Math.max(cfg.w, cfg.d) * 0.55;
    const existing = [...baseObstacles, ...placedHouses];
    const check = checkOverlap(cfg.x, cfg.z, radius, existing);
    if (check.collides) {
      console.warn(`[Elfendorp] Huisje ${cfg.name} overlapt met ${check.obstacle.id}. Wordt bijgesteld.`);
      const dx = cfg.x - check.obstacle.x;
      const dz = cfg.z - check.obstacle.z;
      const len = Math.hypot(dx, dz) || 1;
      const push = (check.minDist - check.dist) + 0.3;
      cfg.x += (dx / len) * push;
      cfg.z += (dz / len) * push;
    }

    const distWorkshop = Math.hypot(cfg.x - COORDS.workshop.x, cfg.z - COORDS.workshop.z);
    const distPole = Math.hypot(cfg.x, cfg.z);
    if (distWorkshop < 15.0 || distPole < 15.0) {
      console.info(`[Elfendorp] ${cfg.name} afstand: werkplaats ${distWorkshop.toFixed(1)}m, paal ${distPole.toFixed(1)}m`);
    }

    placedHouses.push({ id: cfg.name, x: cfg.x, z: cfg.z, radius });
    return cfg;
  });

  // Accumulators for InstancedMesh details
  const icicleTransforms = [];
  const firewoodTransforms = [];
  const bulbSpecs = [];
  const chimneyWorldEmitters = [];
  const windowMaterials = [];
  const houseGroups = [];

  const tempMat4 = new THREE.Matrix4();
  const tempPos = new THREE.Vector3();
  const tempQuat = new THREE.Quaternion();
  const tempScale = new THREE.Vector3();
  const tempEuler = new THREE.Euler();

  // ---------------------------------------------------------------------------
  // 3. Build Each Elf Cottage
  // ---------------------------------------------------------------------------
  houseConfigs.forEach((cfg, idx) => {
    const houseGroup = new THREE.Group();
    houseGroup.name = cfg.name;

    const groundY = getTerrainHeight(cfg.x, cfg.z);
    // Face front door toward village square center with organic rotation variation
    const baseRotY = Math.atan2(squareCenter.x - cfg.x, squareCenter.z - cfg.z);
    const rotY = baseRotY + (cfg.rotOffset || 0);
    cfg.rotY = rotY;

    houseGroup.position.set(cfg.x, groundY, cfg.z);
    houseGroup.rotation.y = rotY;
    houseGroup.userData = {
      id: cfg.name,
      houseIndex: idx + 1,
      label: cfg.label,
      roofType: cfg.roofType
    };

    const W = cfg.w;
    const H = cfg.h;
    const D = cfg.d;
    const peakH = cfg.roofPeakH;

    const wallMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: cfg.wallColor,
      roughness: 0.78,
      metalness: 0.05
    });
    const doorMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: cfg.doorColor,
      roughness: 0.72,
      metalness: 0.06
    });
    const winMat = new THREE.MeshStandardMaterial({
      map: winGlowTex,
      emissive: new THREE.Color(COLORS.WARM_WINDOW),
      emissiveMap: winGlowTex,
      emissiveIntensity: 2.85,
      roughness: 0.24
    });
    windowMaterials.push({ mat: winMat, phase: cfg.phase });

    const wallGeos = [];
    const trimGeos = [];
    const stoneGeos = [];
    const snowGeos = [];
    const doorGeos = [];
    const goldGeos = [];
    const ironGeos = [];
    const winGeos = [];
    const pineGeos = [];
    const redGeos = [];

    // Foundation plinth & doorstep
    const plinthGeo = new THREE.BoxGeometry(W + 0.14, 0.46, D + 0.14);
    plinthGeo.translate(0, 0.02, 0);
    stoneGeos.push(plinthGeo);

    const stepGeo1 = new THREE.CylinderGeometry(0.56, 0.62, 0.14, 14);
    stepGeo1.scale(1.15, 1.0, 0.65);
    stepGeo1.translate(0, 0.07, D * 0.5 + 0.24);
    stoneGeos.push(stepGeo1);

    // Walls & log courses
    const coreWall = new THREE.BoxGeometry(W - 0.12, H, D - 0.12);
    coreWall.translate(0, H * 0.5 + 0.16, 0);
    wallGeos.push(coreWall);

    const logCount = 6;
    const logR = 0.088;
    const wallStep = (H - 0.18) / logCount;
    for (let l = 0; l < logCount; l++) {
      const ly = 0.24 + l * wallStep;
      const fb1 = new THREE.CylinderGeometry(logR, logR, W + 0.22, 8);
      fb1.rotateZ(Math.PI / 2);
      fb1.translate(0, ly, D * 0.5 - 0.02);
      wallGeos.push(fb1);

      const fb2 = new THREE.CylinderGeometry(logR, logR, W + 0.22, 8);
      fb2.rotateZ(Math.PI / 2);
      fb2.translate(0, ly, -D * 0.5 + 0.02);
      wallGeos.push(fb2);

      const lr1 = new THREE.CylinderGeometry(logR, logR, D + 0.22, 8);
      lr1.rotateX(Math.PI / 2);
      lr1.translate(-W * 0.5 + 0.02, ly + wallStep * 0.5, 0);
      wallGeos.push(lr1);

      const lr2 = new THREE.CylinderGeometry(logR, logR, D + 0.22, 8);
      lr2.rotateX(Math.PI / 2);
      lr2.translate(W * 0.5 - 0.02, ly + wallStep * 0.5, 0);
      wallGeos.push(lr2);
    }

    const wallTopY = H + 0.16;

    // Corner posts
    const cornerPostGeo = new THREE.CylinderGeometry(0.10, 0.11, H + 0.08, 8);
    [
      [-W * 0.5, -D * 0.5],
      [W * 0.5, -D * 0.5],
      [-W * 0.5, D * 0.5],
      [W * 0.5, D * 0.5]
    ].forEach(([cx, cz]) => {
      const cp = cornerPostGeo.clone();
      cp.translate(cx, H * 0.5 + 0.16, cz);
      trimGeos.push(cp);
    });

    // Roof & thick snow
    const overhangZ = D + 0.72;
    const snowOverhangZ = D + 0.86;

    if (cfg.roofType === 'gambrel') {
      const kneeW = W * 0.62;
      const kneeH = peakH * 0.58;
      const gambrelPrism = createGambrelPrismGeometry(W - 0.06, kneeW, kneeH, peakH, D - 0.08);
      gambrelPrism.translate(0, wallTopY, 0);
      wallGeos.push(gambrelPrism);

      const lowerDx = (W * 0.5 + 0.26) - kneeW * 0.5;
      const lowerDy = kneeH + 0.12;
      const lowerSlopeLen = Math.hypot(lowerDx, lowerDy);
      const lowerAngle = Math.atan2(lowerDy, lowerDx);
      const lowerMidX = (W * 0.5 + 0.26 + kneeW * 0.5) * 0.5 - 0.04;
      const lowerMidY = wallTopY + kneeH * 0.5 - 0.04;

      [-1, 1].forEach((side) => {
        const board = new THREE.BoxGeometry(lowerSlopeLen, 0.11, overhangZ);
        board.rotateZ(-side * lowerAngle);
        board.translate(side * lowerMidX, lowerMidY, 0);
        trimGeos.push(board);

        const snowLayer = new THREE.BoxGeometry(lowerSlopeLen + 0.12, 0.22, snowOverhangZ);
        snowLayer.rotateZ(-side * lowerAngle);
        snowLayer.translate(side * (lowerMidX + 0.03), lowerMidY + 0.13, 0);
        snowGeos.push(snowLayer);
      });

      const upperDx = kneeW * 0.5 + 0.08;
      const upperDy = peakH - kneeH + 0.05;
      const upperSlopeLen = Math.hypot(upperDx, upperDy);
      const upperAngle = Math.atan2(upperDy, upperDx);
      const upperMidX = kneeW * 0.25;
      const upperMidY = wallTopY + (kneeH + peakH) * 0.5;

      [-1, 1].forEach((side) => {
        const board = new THREE.BoxGeometry(upperSlopeLen, 0.12, overhangZ);
        board.rotateZ(-side * upperAngle);
        board.translate(side * upperMidX, upperMidY, 0);
        trimGeos.push(board);

        const snowLayer = new THREE.BoxGeometry(upperSlopeLen + 0.16, 0.26, snowOverhangZ);
        snowLayer.rotateZ(-side * upperAngle);
        snowLayer.translate(side * upperMidX, upperMidY + 0.15, 0);
        snowGeos.push(snowLayer);
      });

      const ridgeCrest = new THREE.CylinderGeometry(0.22, 0.22, snowOverhangZ - 0.08, 10);
      ridgeCrest.rotateX(Math.PI / 2);
      ridgeCrest.scale(1.3, 0.65, 1.0);
      ridgeCrest.translate(0, wallTopY + peakH + 0.14, 0);
      snowGeos.push(ridgeCrest);
    } else {
      const gablePrism = createGablePrismGeometry(W - 0.08, peakH, D - 0.08);
      gablePrism.translate(0, wallTopY, 0);
      wallGeos.push(gablePrism);

      const halfSpan = W * 0.5 + 0.34;
      const rise = peakH + 0.16;
      const slopeLen = Math.hypot(halfSpan, rise);
      const slopeAngle = Math.atan2(rise, halfSpan);
      const midX = halfSpan * 0.5 - 0.06;
      const midY = wallTopY + peakH * 0.5;

      [-1, 1].forEach((side) => {
        const roofBoard = new THREE.BoxGeometry(slopeLen, 0.12, overhangZ);
        roofBoard.rotateZ(-side * slopeAngle);
        roofBoard.translate(side * midX, midY, 0);
        trimGeos.push(roofBoard);

        const roofSnow = new THREE.BoxGeometry(slopeLen + 0.14, 0.25, snowOverhangZ);
        roofSnow.rotateZ(-side * slopeAngle);
        roofSnow.translate(side * midX, midY + 0.15, 0);
        snowGeos.push(roofSnow);
      });

      const ridgeCap = new THREE.CylinderGeometry(0.20, 0.20, snowOverhangZ - 0.06, 10);
      ridgeCap.rotateX(Math.PI / 2);
      ridgeCap.scale(1.25, 0.7, 1.0);
      ridgeCap.translate(0, wallTopY + peakH + 0.13, 0);
      snowGeos.push(ridgeCap);

      const finialPost = new THREE.CylinderGeometry(0.04, 0.05, 0.38, 8);
      finialPost.translate(0, wallTopY + peakH + 0.22, D * 0.5 + 0.28);
      trimGeos.push(finialPost);
      const finialBall = new THREE.SphereGeometry(0.07, 8, 8);
      finialBall.translate(0, wallTopY + peakH + 0.42, D * 0.5 + 0.28);
      goldGeos.push(finialBall);

      if (cfg.roofType === 'dormerGable') {
        const canopyW = 1.48;
        const canopyH = 0.56;
        const canopyD = 0.68;
        const canopyY = 1.38;
        const canopyZ = D * 0.5 + canopyD * 0.5 - 0.05;

        const canopySlopeLen = Math.hypot(canopyW * 0.5 + 0.12, canopyH);
        const canopyAngle = Math.atan2(canopyH, canopyW * 0.5 + 0.12);
        [-1, 1].forEach((side) => {
          const cBoard = new THREE.BoxGeometry(canopySlopeLen, 0.08, canopyD);
          cBoard.rotateZ(-side * canopyAngle);
          cBoard.translate(side * (canopyW * 0.26), canopyY + canopyH * 0.5, canopyZ);
          trimGeos.push(cBoard);

          const cSnow = new THREE.BoxGeometry(canopySlopeLen + 0.08, 0.16, canopyD + 0.10);
          cSnow.rotateZ(-side * canopyAngle);
          cSnow.translate(side * (canopyW * 0.26), canopyY + canopyH * 0.5 + 0.10, canopyZ + 0.02);
          snowGeos.push(cSnow);

          const bracket = new THREE.BoxGeometry(0.08, 0.42, 0.08);
          bracket.rotateX(0.55);
          bracket.translate(side * (canopyW * 0.42), canopyY - 0.12, D * 0.5 + 0.16);
          trimGeos.push(bracket);
        });
      }
    }

    // Snow cushions
    const roofDriftPositions = [
      { x: -W * 0.34, y: wallTopY + peakH * 0.46 + 0.22, z: D * 0.25, rx: 0.48, ry: 0.16, rz: 0.62 },
      { x: W * 0.32, y: wallTopY + peakH * 0.48 + 0.22, z: -D * 0.22, rx: 0.46, ry: 0.15, rz: 0.58 },
      { x: -W * 0.52, y: 0.14, z: D * 0.28, rx: 0.52, ry: 0.22, rz: 0.65 },
      { x: W * 0.52, y: 0.14, z: -D * 0.18, rx: 0.55, ry: 0.24, rz: 0.68 }
    ];
    roofDriftPositions.forEach((dp, dIdx) => {
      const drift = createSculptedSnowDriftGeo(dp.rx, dp.ry, dp.rz, idx * 4.1 + dIdx * 1.7, 10, 7);
      drift.translate(dp.x, dp.y, dp.z);
      snowGeos.push(drift);
    });

    // Chimney
    const chimX = cfg.chimneySide * (W * 0.28);
    const chimZ = -D * 0.18;
    const chimBaseY = wallTopY + peakH * 0.35;
    const chimTopY = wallTopY + peakH + 0.62;
    const chimH = chimTopY - chimBaseY;

    const chimShaft = new THREE.CylinderGeometry(0.24, 0.29, chimH, 10);
    chimShaft.translate(chimX, chimBaseY + chimH * 0.5, chimZ);
    stoneGeos.push(chimShaft);

    const chimCollar = new THREE.CylinderGeometry(0.31, 0.30, 0.14, 10);
    chimCollar.translate(chimX, chimTopY - 0.04, chimZ);
    stoneGeos.push(chimCollar);

    const chimSnowRim = new THREE.TorusGeometry(0.25, 0.075, 8, 14);
    chimSnowRim.rotateX(Math.PI / 2);
    chimSnowRim.translate(chimX, chimTopY + 0.04, chimZ);
    snowGeos.push(chimSnowRim);

    const flueDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.05, 10),
      flueDarkMat
    );
    flueDisk.position.set(chimX, chimTopY + 0.02, chimZ);
    houseGroup.add(flueDisk);

    const cosH = Math.cos(rotY);
    const sinH = Math.sin(rotY);
    chimneyWorldEmitters.push({
      x: cfg.x + (chimX * cosH + chimZ * sinH),
      y: groundY + chimTopY + 0.06,
      z: cfg.z + (-chimX * sinH + chimZ * cosH),
      seed: idx * 3.7
    });

    // E. Articulated Elf Door ("ronde of boogvormige deurtjes") on Front Facade
    const doorZ = D * 0.5 + 0.02;
    const doorPivot = new THREE.Group();
    doorPivot.name = `doorPivot_${cfg.name}`;
    const hingeX = cfg.doorStyle === 'round' ? -0.46 : -0.38;
    doorPivot.position.set(hingeX, 0, doorZ);
    houseGroup.add(doorPivot);

    const doorPanelGeos = [];
    const doorKnobGeos = [];
    const doorIronGeos = [];
    const doorPeepGeos = [];
    const doorPineGeos = [];
    const doorRedGeos = [];
    const doorLocalCenterX = -hingeX;

    if (cfg.doorStyle === 'round') {
      const doorR = 0.50;
      const doorCenterY = 0.68;

      // Wooden door disc on pivot
      const disc = new THREE.CylinderGeometry(doorR, doorR, 0.08, 20);
      disc.rotateX(Math.PI / 2);
      disc.translate(doorLocalCenterX, doorCenterY, 0);
      doorPanelGeos.push(disc);

      // Stationary timber surround frame stays on the wall
      const frameRing = new THREE.TorusGeometry(doorR + 0.04, 0.065, 10, 22);
      frameRing.translate(0, doorCenterY, doorZ + 0.02);
      trimGeos.push(frameRing);

      // Iron hinge straps on door panel
      [-0.14, 0.14].forEach((hy) => {
        const strap = new THREE.BoxGeometry(0.38, 0.034, 0.02);
        strap.translate(doorLocalCenterX - 0.16, doorCenterY + hy, 0.042);
        doorIronGeos.push(strap);
      });

      // Brass knob on door panel
      const knob = new THREE.SphereGeometry(0.045, 10, 10);
      knob.translate(doorLocalCenterX + 0.24, doorCenterY - 0.02, 0.065);
      doorKnobGeos.push(knob);

      // Peep window on door panel
      const peepWin = new THREE.CylinderGeometry(0.13, 0.13, 0.03, 12);
      peepWin.rotateX(Math.PI / 2);
      peepWin.translate(doorLocalCenterX, doorCenterY + 0.16, 0.035);
      doorPeepGeos.push(peepWin);

      // Festive wreath & ribbon bow on door panel
      const wreath = new THREE.TorusGeometry(0.15, 0.042, 8, 16);
      wreath.translate(doorLocalCenterX, doorCenterY + 0.16, 0.055);
      doorPineGeos.push(wreath);

      const bow = new THREE.BoxGeometry(0.12, 0.055, 0.035);
      bow.translate(doorLocalCenterX, doorCenterY + 0.30, 0.075);
      doorRedGeos.push(bow);
    } else {
      const archR = 0.42;
      const rectH = 0.56;
      const baseDoorY = 0.16;

      // Wooden arched slab & arch on pivot
      const lowerSlab = new THREE.BoxGeometry(archR * 2, rectH, 0.08);
      lowerSlab.translate(doorLocalCenterX, baseDoorY + rectH * 0.5, 0);
      doorPanelGeos.push(lowerSlab);

      const upperArch = new THREE.CylinderGeometry(archR, archR, 0.08, 18);
      upperArch.rotateX(Math.PI / 2);
      upperArch.translate(doorLocalCenterX, baseDoorY + rectH, 0);
      doorPanelGeos.push(upperArch);

      // Stationary arched frame & jambs on wall
      const archFrame = new THREE.TorusGeometry(archR + 0.035, 0.058, 10, 18, Math.PI);
      archFrame.translate(0, baseDoorY + rectH, doorZ + 0.02);
      trimGeos.push(archFrame);

      [-1, 1].forEach((side) => {
        const jamb = new THREE.BoxGeometry(0.09, rectH + 0.04, 0.09);
        jamb.translate(side * (archR + 0.035), baseDoorY + rectH * 0.5, doorZ + 0.01);
        trimGeos.push(jamb);
      });

      // Iron hinges on door panel
      [0.36, 0.68].forEach((hy) => {
        const strap = new THREE.BoxGeometry(0.34, 0.032, 0.02);
        strap.translate(doorLocalCenterX - archR + 0.18, hy, 0.042);
        doorIronGeos.push(strap);
      });

      // Golden knob on door panel
      const knob = new THREE.SphereGeometry(0.044, 10, 10);
      knob.translate(doorLocalCenterX + archR - 0.14, baseDoorY + rectH * 0.72, 0.065);
      doorKnobGeos.push(knob);

      const wreath = new THREE.TorusGeometry(0.14, 0.04, 8, 16);
      wreath.translate(doorLocalCenterX, baseDoorY + rectH + 0.08, 0.05);
      doorPineGeos.push(wreath);

      const bow = new THREE.BoxGeometry(0.11, 0.05, 0.035);
      bow.translate(doorLocalCenterX, baseDoorY + rectH + 0.21, 0.07);
      doorRedGeos.push(bow);
    }

    // Windows
    function addFramedWindow(wx, wy, wz, wRotY, isRound = false, size = 0.52) {
      const m = new THREE.Matrix4();
      m.makeRotationY(wRotY);
      m.setPosition(wx, wy, wz);

      if (isRound) {
        const pane = new THREE.CylinderGeometry(size * 0.5, size * 0.5, 0.06, 16);
        pane.rotateX(Math.PI / 2);
        pane.applyMatrix4(m);
        winGeos.push(pane);

        const rim = new THREE.TorusGeometry(size * 0.5 + 0.025, 0.04, 8, 18);
        rim.translate(0, 0, 0.025);
        rim.applyMatrix4(m);
        trimGeos.push(rim);

        const barH = new THREE.BoxGeometry(size, 0.03, 0.03);
        barH.translate(0, 0, 0.035);
        barH.applyMatrix4(m);
        trimGeos.push(barH);

        const barV = new THREE.BoxGeometry(0.03, size, 0.03);
        barV.translate(0, 0, 0.035);
        barV.applyMatrix4(m);
        trimGeos.push(barV);
      } else {
        const pane = new THREE.BoxGeometry(size, size * 1.05, 0.06);
        pane.applyMatrix4(m);
        winGeos.push(pane);

        const sill = new THREE.BoxGeometry(size + 0.16, 0.06, 0.14);
        sill.translate(0, -size * 0.52 - 0.03, 0.04);
        sill.applyMatrix4(m);
        trimGeos.push(sill);

        const sillSnow = new THREE.BoxGeometry(size + 0.14, 0.055, 0.12);
        sillSnow.translate(0, -size * 0.52 + 0.02, 0.05);
        sillSnow.applyMatrix4(m);
        snowGeos.push(sillSnow);
      }
    }

    const frontWinX = W * 0.31;
    addFramedWindow(-frontWinX, 0.96, D * 0.5 + 0.02, 0, idx % 2 === 0, 0.50);
    addFramedWindow(frontWinX, 0.96, D * 0.5 + 0.02, 0, idx % 2 === 0, 0.50);
    addFramedWindow(0, wallTopY + peakH * 0.44, D * 0.5 + 0.01, 0, true, 0.42);
    addFramedWindow(-W * 0.5 - 0.02, 0.96, 0.0, -Math.PI / 2, false, 0.52);
    addFramedWindow(W * 0.5 + 0.02, 0.96, 0.0, Math.PI / 2, false, 0.52);

    const addMergedToHouse = (geos, material, castShadow = true, receiveShadow = true) => {
      if (geos.length === 0) return null;
      const merged = safeMergeGeometries(geos);
      geos.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      houseGroup.add(mesh);
      return mesh;
    };

    const wallMesh = addMergedToHouse(wallGeos, wallMat);
    addMergedToHouse(trimGeos, trimWoodMat);
    addMergedToHouse(stoneGeos, stoneMat);
    addMergedToHouse(snowGeos, snowMat);

    // Build the swinging door panel mesh and its accessories inside doorPivot
    const doorMesh = new THREE.Mesh(safeMergeGeometries(doorPanelGeos), doorMat);
    doorMesh.castShadow = true;
    doorMesh.receiveShadow = true;
    doorPivot.add(doorMesh);
    doorPanelGeos.forEach((g) => g.dispose());

    if (doorKnobGeos.length > 0) {
      const knobMesh = new THREE.Mesh(safeMergeGeometries(doorKnobGeos), goldMat);
      doorPivot.add(knobMesh);
      doorKnobGeos.forEach((g) => g.dispose());
    }
    if (doorIronGeos.length > 0) {
      const ironMesh = new THREE.Mesh(safeMergeGeometries(doorIronGeos), darkIronMat);
      doorPivot.add(ironMesh);
      doorIronGeos.forEach((g) => g.dispose());
    }
    if (doorPeepGeos.length > 0) {
      const peepMesh = new THREE.Mesh(safeMergeGeometries(doorPeepGeos), winMat);
      doorPivot.add(peepMesh);
      doorPeepGeos.forEach((g) => g.dispose());
    }
    if (doorPineGeos.length > 0) {
      const pineMesh = new THREE.Mesh(safeMergeGeometries(doorPineGeos), wreathPineMat);
      doorPivot.add(pineMesh);
      doorPineGeos.forEach((g) => g.dispose());
    }
    if (doorRedGeos.length > 0) {
      const redMesh = new THREE.Mesh(safeMergeGeometries(doorRedGeos), festiveRedMat);
      doorPivot.add(redMesh);
      doorRedGeos.forEach((g) => g.dispose());
    }

    addMergedToHouse(goldGeos, goldMat, false, false);
    addMergedToHouse(ironGeos, darkIronMat, false, false);
    const winMesh = addMergedToHouse(winGeos, winMat, false, false);
    addMergedToHouse(pineGeos, wreathPineMat, false, false);
    addMergedToHouse(redGeos, festiveRedMat, false, false);

    if (winMesh) {
      houseGroup.userData.windowMesh = winMesh;
    }

    // Emerging elf inside the doorway
    const emergingElf = createEmergingElf(idx, cfg);
    emergingElf.group.position.set(0, 0.08, doorZ - 0.22);
    emergingElf.group.visible = false;
    houseGroup.add(emergingElf.group);

    // Warm interior doorway flare light
    const doorLight = new THREE.PointLight(0xffb042, 0, 4.2, 1.8);
    doorLight.position.set(0, 0.85, doorZ + 0.15);
    houseGroup.add(doorLight);

    houseAnims.push({
      idx,
      name: cfg.name,
      timer: 0,
      doorPivot,
      doorMesh,
      emergingElf,
      doorLight,
      winMat,
      doorZ
    });

    // Icicles & Fairy bulbs
    const eaveX = W * 0.5 + 0.28;
    const eaveY = wallTopY - 0.02;
    const icicleCountPerSide = 6;
    for (let i = 0; i < icicleCountPerSide; i++) {
      const lz = -D * 0.48 + (i / (icicleCountPerSide - 1)) * (D * 0.96);
      [-1, 1].forEach((side) => {
        const lx = side * eaveX;
        const wx = cfg.x + (lx * cosH + lz * sinH);
        const wz = cfg.z + (-lx * sinH + lz * cosH);
        const hScale = 0.75 + ((idx * 3 + i) % 4) * 0.22;
        icicleTransforms.push({ x: wx, y: groundY + eaveY - 0.11 * hScale, z: wz, hScale });
      });
    }

    const gableBulbCount = 9;
    for (let b = 0; b < gableBulbCount; b++) {
      const frac = b / (gableBulbCount - 1);
      const lx = (frac - 0.5) * (W + 0.42);
      const roofFrac = 1.0 - Math.abs(frac - 0.5) * 2.0;
      const ly = wallTopY + roofFrac * peakH - 0.04;
      const lz = D * 0.5 + 0.34;
      const wx = cfg.x + (lx * cosH + lz * sinH);
      const wz = cfg.z + (-lx * sinH + lz * cosH);
      bulbSpecs.push({
        x: wx,
        y: groundY + ly,
        z: wz,
        phase: idx * 1.3 + b * 0.55,
        colorHex: COLORS.BULB_PALETTE[(idx + b) % COLORS.BULB_PALETTE.length]
      });
    }

    // Firewood stack
    const fwSide = -cfg.chimneySide;
    for (let row = 0; row < 2; row++) {
      for (let c = 0; c < 3; c++) {
        const lx = fwSide * (W * 0.5 + 0.18);
        const ly = 0.14 + row * 0.13;
        const lz = -0.35 + c * 0.20 + (row % 2) * 0.08;
        const wx = cfg.x + (lx * cosH + lz * sinH);
        const wz = cfg.z + (-lx * sinH + lz * cosH);
        firewoodTransforms.push({ x: wx, y: groundY + ly, z: wz, rotY });
      }
    }

    // Register cottage for clickability, hover glow & double-click fly-to
    if (interaction) {
      interaction.registerClickable(houseGroup, {
        id: cfg.name,
        label: cfg.label,
        glowMeshes: [wallMesh, doorMesh],
        focusTarget: new THREE.Vector3(cfg.x, groundY + 1.25, cfg.z),
        focusDistance: 4.8,
        focusHeightOffset: 0.55,
        preferredDir: new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)),
        preferredWeight: 0.75,
        onClick: () => {
          openCottageDoor(idx);
        }
      });
    }

    rootGroup.add(houseGroup);
    houseGroups.push(houseGroup);
  });

  // ---------------------------------------------------------------------------
  // 4. Village Square: Ornate Lantern (Warm PointLight), Bench & Mini-Tree
  // ---------------------------------------------------------------------------
  const squareGroup = new THREE.Group();
  squareGroup.name = 'villageSquareGroup';
  squareGroup.position.set(squareCenter.x, squareGroundY, squareCenter.z);
  rootGroup.add(squareGroup);

  // Ornate Village Lantern Post aan de rand van het plein (ruime afstand > 6 m van de boom, >= 3 m van chocomelkkraam)
  const lanternGroup = new THREE.Group();
  lanternGroup.name = 'villageLantern';
  const lanternLocalX = 6.5; // World: -18.0 + 6.5 = -11.5
  const lanternLocalZ = 1.3; // World: 8.5 + 1.3 = 9.8 (ruim > 6.5 m van kraam op -14.2, 16.0)
  const lanternBaseY =
    getTerrainHeight(squareCenter.x + lanternLocalX, squareCenter.z + lanternLocalZ) - squareGroundY;
  lanternGroup.position.set(lanternLocalX, lanternBaseY, lanternLocalZ);
  squareGroup.add(lanternGroup);

  const lanternMetalGeos = [];
  const lanternSnowGeos = [];

  const basePlinth = new THREE.CylinderGeometry(0.18, 0.24, 0.32, 12);
  basePlinth.translate(0, 0.16, 0);
  lanternMetalGeos.push(basePlinth);

  const lowerCollar = new THREE.TorusGeometry(0.16, 0.035, 8, 14);
  lowerCollar.rotateX(Math.PI / 2);
  lowerCollar.translate(0, 0.33, 0);
  lanternMetalGeos.push(lowerCollar);

  const postShaft = new THREE.CylinderGeometry(0.065, 0.11, 2.05, 12);
  postShaft.translate(0, 1.35, 0);
  lanternMetalGeos.push(postShaft);

  const midCollar = new THREE.TorusGeometry(0.085, 0.025, 8, 14);
  midCollar.rotateX(Math.PI / 2);
  midCollar.translate(0, 1.85, 0);
  lanternMetalGeos.push(midCollar);

  const crossArm = new THREE.CylinderGeometry(0.02, 0.02, 0.56, 8);
  crossArm.rotateZ(Math.PI / 2);
  crossArm.translate(0, 2.18, 0);
  lanternMetalGeos.push(crossArm);

  const cageBase = new THREE.CylinderGeometry(0.17, 0.11, 0.08, 6);
  cageBase.translate(0, 2.38, 0);
  lanternMetalGeos.push(cageBase);

  const cageRoof = new THREE.ConeGeometry(0.26, 0.24, 6);
  cageRoof.translate(0, 2.84, 0);
  lanternMetalGeos.push(cageRoof);

  const cageFinial = new THREE.SphereGeometry(0.045, 8, 8);
  cageFinial.translate(0, 2.98, 0);
  lanternMetalGeos.push(cageFinial);

  for (let c = 0; c < 6; c++) {
    const ca = (c / 6) * Math.PI * 2;
    const strut = new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6);
    strut.translate(Math.cos(ca) * 0.16, 2.57, Math.sin(ca) * 0.16);
    lanternMetalGeos.push(strut);
  }

  const lanternCapSnow = new THREE.ConeGeometry(0.24, 0.12, 6);
  lanternCapSnow.translate(0, 2.90, 0);
  lanternSnowGeos.push(lanternCapSnow);

  const lanternMetalMat = darkIronMat.clone();
  const lanternMetalMesh = new THREE.Mesh(safeMergeGeometries(lanternMetalGeos), lanternMetalMat);
  lanternMetalMesh.castShadow = true;
  lanternMetalMesh.receiveShadow = true;
  lanternGroup.add(lanternMetalMesh);
  lanternMetalGeos.forEach((g) => g.dispose());

  const lanternSnowMesh = new THREE.Mesh(safeMergeGeometries(lanternSnowGeos), snowMat);
  lanternGroup.add(lanternSnowMesh);
  lanternSnowGeos.forEach((g) => g.dispose());

  // Zachte, ronde, warm oranje gloed op de sneeuw eronder (radiaal verloop, additive blending, geen harde rand)
  const lanternGlowGeo = new THREE.PlaneGeometry(4.8, 4.8);
  lanternGlowGeo.rotateX(-Math.PI / 2);
  const lanternGlowMat = new THREE.MeshBasicMaterial({
    map: getGroundGlowTexture(),
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const lanternGlowMesh = new THREE.Mesh(lanternGlowGeo, lanternGlowMat);
  lanternGlowMesh.position.set(0, 0.015, 0);
  lanternGlowMesh.renderOrder = 2;
  lanternGroup.add(lanternGlowMesh);

  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffe6a3,
    emissive: 0xff9d2e,
    emissiveIntensity: 4.4,
    roughness: 0.15
  });
  const lanternGlassMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145, 0.115, 0.32, 6),
    lanternGlassMat
  );
  lanternGlassMesh.position.set(0, 2.57, 0);
  lanternGroup.add(lanternGlassMesh);

  const postWreath = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.038, 8, 16),
    wreathPineMat
  );
  postWreath.position.set(0, 2.02, 0.09);
  lanternGroup.add(postWreath);

  // Warm PointLight illuminating the village square and elves in the night
  const villagePointLight = new THREE.PointLight(0xffa238, 3.4, 24.0, 1.25);
  villagePointLight.position.set(
    squareCenter.x + lanternLocalX,
    squareGroundY + lanternBaseY + 2.65,
    squareCenter.z + lanternLocalZ
  );
  villagePointLight.shadow.mapSize.set(512, 512);
  villagePointLight.shadow.camera.near = 0.25;
  villagePointLight.shadow.camera.far = 18.0;
  villagePointLight.shadow.bias = -0.0015;
  villagePointLight.shadow.normalBias = 0.04;
  villagePointLight.shadow.radius = 2.0;
  villagePointLight.shadow.autoUpdate = false;
  villagePointLight.castShadow = false; // Enabled only on quality "Hoog"
  rootGroup.add(villagePointLight);

  // Register Village Lantern for clicking (toggle all village lights) and hover glow
  if (interaction) {
    interaction.registerClickable(lanternGroup, {
      id: 'villageLantern',
      label: 'Dorpslantaarnpaal 🏮 (Klik om alle dorpslichten te schakelen)',
      glowMeshes: [lanternGlassMesh, lanternMetalMesh],
      focusTarget: new THREE.Vector3(
        squareCenter.x + lanternLocalX,
        squareGroundY + lanternBaseY + 2.2,
        squareCenter.z + lanternLocalZ
      ),
      focusDistance: 3.8,
      focusHeightOffset: 0.35,
      onClick: () => {
        toggleVillageLights();
      }
    });
  }

  // Wooden Village Bench aan de rand van het plein (buiten de route van de cadeauslee)
  const benchGroup = new THREE.Group();
  benchGroup.name = 'villageBench';
  const benchLocalX = -3.8; // Aan de rand van het plein (World: x = -21.8, z = 6.3)
  const benchLocalZ = -2.2;
  const benchBaseY =
    getTerrainHeight(squareCenter.x + benchLocalX, squareCenter.z + benchLocalZ) - squareGroundY;
  benchGroup.position.set(benchLocalX, benchBaseY, benchLocalZ);
  // Georiënteerd met het gezicht en zitting naar het dorpsplein en de kerstboom
  benchGroup.rotation.y = Math.atan2(-benchLocalX, -benchLocalZ);
  squareGroup.add(benchGroup);

  const benchWoodGeos = [];
  const benchIronGeos = [];
  const benchSnowGeos = [];

  const benchW = 1.48;

  // 4 Horizontale zittingplanken (comfortabele zithoogte 0.42 m, breedte benchW langs X)
  for (let s = 0; s < 4; s++) {
    const seatSlat = new THREE.BoxGeometry(benchW, 0.035, 0.08);
    seatSlat.translate(0, 0.42, -0.15 + s * 0.10);
    benchWoodGeos.push(seatSlat);
  }

  // 3 Rugleuningplanken (gekanteld naar achteren)
  for (let s = 0; s < 3; s++) {
    const backSlat = new THREE.BoxGeometry(benchW, 0.08, 0.03);
    backSlat.rotateX(-0.15);
    backSlat.translate(0, 0.56 + s * 0.11, -0.22 - s * 0.02);
    benchWoodGeos.push(backSlat);
  }

  // 4 Stevige smeedijzeren poten die vlak op de sneeuw rusten (Y = 0)
  [-benchW * 0.44, benchW * 0.44].forEach((lx) => {
    // Voorpoot
    const frontLeg = new THREE.CylinderGeometry(0.026, 0.032, 0.42, 8);
    frontLeg.translate(lx, 0.21, 0.16);
    benchIronGeos.push(frontLeg);

    // Achterpoot (loopt door in de rugsteun)
    const backLeg = new THREE.CylinderGeometry(0.026, 0.032, 0.84, 8);
    backLeg.rotateX(-0.08);
    backLeg.translate(lx, 0.42, -0.18);
    benchIronGeos.push(backLeg);

    // Onderbalk / dwarsverbinding
    const underBrace = new THREE.BoxGeometry(0.035, 0.035, 0.36);
    underBrace.translate(lx, 0.36, -0.01);
    benchIronGeos.push(underBrace);

    // Armsteun
    const armrest = new THREE.BoxGeometry(0.045, 0.035, 0.40);
    armrest.translate(lx, 0.58, -0.01);
    benchIronGeos.push(armrest);

    const armPost = new THREE.CylinderGeometry(0.020, 0.020, 0.16, 8);
    armPost.translate(lx, 0.50, 0.15);
    benchIronGeos.push(armPost);
  });

  const seatSnow = createSculptedSnowDriftGeo(0.32, 0.05, 0.14, 7.4, 10, 6);
  seatSnow.translate(-0.35, 0.44, 0.0);
  benchSnowGeos.push(seatSnow);

  const railSnow = createSculptedSnowDriftGeo(0.38, 0.04, 0.06, 9.1, 10, 5);
  railSnow.translate(0.24, 0.80, -0.25);
  benchSnowGeos.push(railSnow);

  const benchWoodMesh = new THREE.Mesh(safeMergeGeometries(benchWoodGeos), warmWoodMat);
  benchWoodMesh.castShadow = true;
  benchWoodMesh.receiveShadow = true;
  benchGroup.add(benchWoodMesh);
  benchWoodGeos.forEach((g) => g.dispose());

  const benchIronMesh = new THREE.Mesh(safeMergeGeometries(benchIronGeos), darkIronMat);
  benchIronMesh.castShadow = true;
  benchIronMesh.receiveShadow = true;
  benchGroup.add(benchIronMesh);
  benchIronGeos.forEach((g) => g.dispose());

  const benchSnowMesh = new THREE.Mesh(safeMergeGeometries(benchSnowGeos), snowMat);
  benchGroup.add(benchSnowMesh);
  benchSnowGeos.forEach((g) => g.dispose());

  // Dorpskerstboom PRECIES IN HET MIDDEN van het Dorpsplein (local 0, 0 -> world -18.0, 8.5)
  // Prachtig geproportioneerd met de top op 3.95 m zodat alle slingers ruim boven 3 m hangen
  const miniTreeGroup = new THREE.Group();
  miniTreeGroup.name = 'villageMiniTree';
  const treeLocalX = 0.0;
  const treeLocalZ = 0.0;
  const treeBaseY =
    getTerrainHeight(squareCenter.x + treeLocalX, squareCenter.z + treeLocalZ) - squareGroundY;
  miniTreeGroup.position.set(treeLocalX, treeBaseY, treeLocalZ);
  squareGroup.add(miniTreeGroup);

  const miniTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.18, 1.10, 10),
    trimWoodMat
  );
  miniTrunk.position.y = 0.55;
  miniTrunk.castShadow = true;
  miniTreeGroup.add(miniTrunk);

  const miniFoliageGeos = [];
  const miniSnowCapGeos = [];
  const miniTiers = [
    { r: 1.25, h: 1.05, y: 0.85, lobes: 7 },
    { r: 1.05, h: 0.98, y: 1.45, lobes: 7 },
    { r: 0.85, h: 0.90, y: 2.05, lobes: 6 },
    { r: 0.65, h: 0.82, y: 2.62, lobes: 6 },
    { r: 0.44, h: 0.72, y: 3.15, lobes: 5 },
    { r: 0.24, h: 0.55, y: 3.60, lobes: 5 }
  ];

  miniTiers.forEach((t, tIdx) => {
    const cone = new THREE.ConeGeometry(t.r, t.h, 20, 4);
    cone.translate(0, t.y, 0);
    const pos = cone.attributes.position;
    const topY = t.y + t.h * 0.5;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const rad = Math.hypot(vx, vz);
      const vFrac = Math.max(0, Math.min(1, (topY - vy) / t.h));
      if (rad < 0.01) continue;
      const ang = Math.atan2(vz, vx);
      const wave = 1.0 + Math.cos(ang * t.lobes + tIdx * 1.3) * 0.16 * vFrac;
      const droop = -Math.max(0, Math.cos(ang * t.lobes + tIdx * 1.3)) * 0.06 * vFrac;
      pos.setXYZ(i, Math.cos(ang) * rad * wave, vy + droop, Math.sin(ang) * rad * wave);
    }
    cone.computeVertexNormals();
    miniFoliageGeos.push(cone);

    const snowCap = new THREE.ConeGeometry(t.r * 0.93, t.h * 0.42, 18, 3);
    snowCap.translate(0, t.y + t.h * 0.22, 0);
    miniSnowCapGeos.push(snowCap);
  });

  const miniFoliageMesh = new THREE.Mesh(safeMergeGeometries(miniFoliageGeos), wreathPineMat);
  miniFoliageMesh.castShadow = true;
  miniFoliageMesh.receiveShadow = true;
  miniTreeGroup.add(miniFoliageMesh);
  miniFoliageGeos.forEach((g) => g.dispose());

  const miniSnowMesh = new THREE.Mesh(safeMergeGeometries(miniSnowCapGeos), snowMat);
  miniSnowMesh.castShadow = true;
  miniTreeGroup.add(miniSnowMesh);
  miniSnowCapGeos.forEach((g) => g.dispose());

  const garlandPts = [];
  for (let i = 0; i <= 44; i++) {
    const u = i / 44;
    const gy = 0.65 + u * 2.85;
    const ga = u * 4.5 * Math.PI * 2;
    const gr = 1.15 * (1 - u * 0.78) + 0.06;
    garlandPts.push(new THREE.Vector3(Math.cos(ga) * gr, gy, Math.sin(ga) * gr));
  }
  const garlandGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(garlandPts),
    44,
    0.024,
    6,
    false
  );
  miniTreeGroup.add(new THREE.Mesh(garlandGeo, goldMat));

  const miniStarMat = new THREE.MeshStandardMaterial({
    color: COLORS.GOLD_METAL,
    emissive: 0xffbb22,
    emissiveIntensity: 3.4,
    metalness: 0.85,
    roughness: 0.15
  });
  const miniStarMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), miniStarMat);
  miniStarMesh.position.y = 3.95;
  miniTreeGroup.add(miniStarMesh);

  const treeWorldX = squareCenter.x + treeLocalX;
  const treeWorldY = squareGroundY + treeBaseY;
  const treeWorldZ = squareCenter.z + treeLocalZ;
  for (let b = 0; b < 28; b++) {
    const u = (b + 0.4) / 28;
    const by = 0.68 + u * 2.82;
    const ba = u * 5.5 * Math.PI * 2 + 0.8;
    const br = 1.18 * (1 - u * 0.76);
    bulbSpecs.push({
      x: treeWorldX + Math.cos(ba) * br,
      y: treeWorldY + by,
      z: treeWorldZ + Math.sin(ba) * br,
      phase: b * 0.65,
      colorHex: COLORS.BULB_PALETTE[b % COLORS.BULB_PALETTE.length]
    });
  }

  // Register village square for double-click camera focus
  if (interaction && interaction.registerFocusable) {
    interaction.registerFocusable(squareGroup, {
      id: 'elfVillageSquare',
      label: 'Elfendorpsplein met Kerstboom 🎄',
      focusTarget: new THREE.Vector3(squareCenter.x, squareGroundY + 1.2, squareCenter.z),
      focusDistance: 6.8,
      focusHeightOffset: 0.8
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Lichtslingers (Volledig herbouwd conform QA-specificaties)
  // - Hangt alleen tussen vaste ophangpunten (nokken, goten, top boom, lantaarn)
  // - Stervorm van nok van elk huisje naar top van kerstboom (hoogte 3.95 m)
  // - Laagste punt ALTIJD >= 3.0 m boven de grond
  // - Lichte catenary doorhang, snijdt door GEEN enkele boom, huis of andere slinger
  // - Slingers langs alle dakgoten van alle huisjes en het chocomelkkraampje
  // ---------------------------------------------------------------------------
  const treeTopPos = new THREE.Vector3(
    squareCenter.x + treeLocalX,
    squareGroundY + treeBaseY + 3.95,
    squareCenter.z + treeLocalZ
  );

  // Vaste ankerpunten per huisje
  const cottageAnchors = houseConfigs.map((cfg) => {
    const gy = getTerrainHeight(cfg.x, cfg.z);
    const topY = gy + cfg.h + 0.50; // 3.9 to 4.4m
    const eaveY = gy + cfg.h * 0.74; // 2.5 to 2.8m
    const cosR = Math.cos(cfg.rotY);
    const sinR = Math.sin(cfg.rotY);

    // Front center peak facing village square
    const fX = cfg.x + sinR * (cfg.d * 0.50);
    const fZ = cfg.z + cosR * (cfg.d * 0.50);

    // Front left & right eaves (dakgoten)
    const lX = fX - cosR * (cfg.w * 0.52);
    const lZ = fZ + sinR * (cfg.w * 0.52);
    const rX = fX + cosR * (cfg.w * 0.52);
    const rZ = fZ - sinR * (cfg.w * 0.52);

    return {
      peak: new THREE.Vector3(cfg.x, topY, cfg.z),
      frontPeak: new THREE.Vector3(fX, topY, fZ),
      frontLeft: new THREE.Vector3(lX, eaveY, lZ),
      frontRight: new THREE.Vector3(rX, eaveY, rZ)
    };
  });

  const slingerDefinitions = [];

  // A. Stervorm van de nok van elk huisje naar de top van de kerstboom in het midden
  // Elk span is ~12-14 m lang, beide eindpunten liggen op 3.95-4.40 m.
  // Met sag 0.28 m ligt het laagste punt op ~3.75 m (ruim >= 3.0 m boven de grond).
  cottageAnchors.forEach((anc) => {
    slingerDefinitions.push({
      p1: anc.frontPeak,
      p2: treeTopPos,
      sag: 0.28,
      bulbs: 20
    });
  });

  // B. Slingers langs de dakgoten van alle huisjes (linkergoot -> nok -> rechtergoot)
  cottageAnchors.forEach((anc) => {
    slingerDefinitions.push({
      p1: anc.frontLeft,
      p2: anc.frontPeak,
      sag: 0.12,
      bulbs: 9
    });
    slingerDefinitions.push({
      p1: anc.frontPeak,
      p2: anc.frontRight,
      sag: 0.12,
      bulbs: 9
    });
  });

  // C. Slingers langs de dakgoten van het chocomelkkraampje
  const stallAnchorX = -13.6;
  const stallAnchorZ = 16.2;
  const stallAnchorY = getTerrainHeight(stallAnchorX, stallAnchorZ);
  const stallRot = -2.35;
  const cosS = Math.cos(stallRot);
  const sinS = Math.sin(stallRot);
  const stallEaveY = stallAnchorY + 1.84;

  const stallCorners = [
    { x: -0.85, z: 0.42 },  // front left
    { x: 0.85, z: 0.42 },   // front right
    { x: 0.85, z: -0.42 },  // back right
    { x: -0.85, z: -0.42 }  // back left
  ].map((c) => {
    return new THREE.Vector3(
      stallAnchorX + c.x * cosS + c.z * sinS,
      stallEaveY,
      stallAnchorZ - c.x * sinS + c.z * cosS
    );
  });

  // Front eave
  slingerDefinitions.push({ p1: stallCorners[0], p2: stallCorners[1], sag: 0.10, bulbs: 8 });
  // Right eave
  slingerDefinitions.push({ p1: stallCorners[1], p2: stallCorners[2], sag: 0.08, bulbs: 6 });
  // Left eave
  slingerDefinitions.push({ p1: stallCorners[3], p2: stallCorners[0], sag: 0.08, bulbs: 6 });

  // D. Slinger vanaf de top van de dorpslantaarnpaal naar de dakgoot van Huisje 1
  const lanternTopPos = new THREE.Vector3(
    squareCenter.x + lanternLocalX,
    squareGroundY + lanternBaseY + 2.95,
    squareCenter.z + lanternLocalZ
  );
  slingerDefinitions.push({
    p1: lanternTopPos,
    p2: cottageAnchors[0].frontLeft,
    sag: 0.22,
    bulbs: 12
  });

  // Generate catenary wire tubes and individual twinkling bulbs
  const slingerWires = [];
  slingerDefinitions.forEach((slinger, sIdx) => {
    const pts = [];
    const steps = 24;
    for (let st = 0; st <= steps; st++) {
      const u = st / steps;
      const wx = THREE.MathUtils.lerp(slinger.p1.x, slinger.p2.x, u);
      const wz = THREE.MathUtils.lerp(slinger.p1.z, slinger.p2.z, u);
      const linearY = THREE.MathUtils.lerp(slinger.p1.y, slinger.p2.y, u);
      const catenary = Math.sin(u * Math.PI) * slinger.sag;
      pts.push(new THREE.Vector3(wx, linearY - catenary, wz));
    }
    const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.010, 5, false);
    slingerWires.push(tubeGeo);

    // Bulbs along garland
    for (let b = 1; b < slinger.bulbs; b++) {
      const bu = b / slinger.bulbs;
      const bx = THREE.MathUtils.lerp(slinger.p1.x, slinger.p2.x, bu);
      const bz = THREE.MathUtils.lerp(slinger.p1.z, slinger.p2.z, bu);
      const by =
        THREE.MathUtils.lerp(slinger.p1.y, slinger.p2.y, bu) -
        Math.sin(bu * Math.PI) * slinger.sag -
        0.025;
      bulbSpecs.push({
        x: bx,
        y: by,
        z: bz,
        phase: sIdx * 1.73 + b * 0.85,
        colorHex: COLORS.BULB_PALETTE[(sIdx * 3 + b) % COLORS.BULB_PALETTE.length]
      });
    }
  });

  const slingerWireMesh = new THREE.Mesh(safeMergeGeometries(slingerWires), darkIronMat);
  rootGroup.add(slingerWireMesh);
  slingerWires.forEach((g) => g.dispose());

  // ---------------------------------------------------------------------------
  // 6. InstancedMesh Batches (Icicles, Firewood, Bulbs & Decor)
  // ---------------------------------------------------------------------------
  const icicleBaseGeo = new THREE.ConeGeometry(0.032, 0.24, 6);
  icicleBaseGeo.rotateX(Math.PI);
  const instIcicles = new THREE.InstancedMesh(
    icicleBaseGeo,
    icicleMat,
    icicleTransforms.length
  );
  icicleTransforms.forEach((ic, i) => {
    tempPos.set(ic.x, ic.y, ic.z);
    tempQuat.identity();
    tempScale.set(1.0, ic.hScale, 1.0);
    tempMat4.compose(tempPos, tempQuat, tempScale);
    instIcicles.setMatrixAt(i, tempMat4);
  });
  rootGroup.add(instIcicles);

  const firewoodGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.48, 7);
  firewoodGeo.rotateX(Math.PI / 2);
  const instFirewood = new THREE.InstancedMesh(
    firewoodGeo,
    warmWoodMat,
    firewoodTransforms.length
  );
  instFirewood.castShadow = true;
  instFirewood.receiveShadow = true;
  firewoodTransforms.forEach((fw, i) => {
    tempPos.set(fw.x, fw.y, fw.z);
    tempEuler.set(0, fw.rotY, 0);
    tempQuat.setFromEuler(tempEuler);
    tempScale.setScalar(1.0);
    tempMat4.compose(tempPos, tempQuat, tempScale);
    instFirewood.setMatrixAt(i, tempMat4);
  });
  rootGroup.add(instFirewood);

  // Aankleding: Houten Kisten (kerstkisten)
  const crateGeo = new THREE.BoxGeometry(0.46, 0.42, 0.46);
  const cratePositions = [
    { x: -9.2, z: 14.8, rotY: 0.25 },
    { x: -9.5, z: 15.3, rotY: -0.4 },
    { x: -14.2, z: 23.2, rotY: 0.8 },
    { x: -22.5, z: 22.8, rotY: -0.3 },
    { x: -30.2, z: 16.8, rotY: 0.5 },
    { x: -26.0, z: 0.4, rotY: 1.1 }
  ];
  const instCrates = new THREE.InstancedMesh(crateGeo, warmWoodMat, cratePositions.length);
  instCrates.castShadow = true;
  instCrates.receiveShadow = true;
  cratePositions.forEach((cr, i) => {
    const cy = getTerrainHeight(cr.x, cr.z);
    tempPos.set(cr.x, cy + 0.21, cr.z);
    tempEuler.set(0, cr.rotY, 0);
    tempQuat.setFromEuler(tempEuler);
    tempScale.setScalar(1.0);
    tempMat4.compose(tempPos, tempQuat, tempScale);
    instCrates.setMatrixAt(i, tempMat4);
  });
  rootGroup.add(instCrates);

  // Aankleding: Cadeaustapels
  const giftBoxGeo = new THREE.BoxGeometry(0.32, 0.30, 0.32);
  const giftDecorSpecs = [
    { x: -9.0, z: 15.0, col: 0xff1744, rotY: 0.1 },
    { x: -8.8, z: 14.7, col: 0x00c853, rotY: -0.6 },
    { x: -14.4, z: 22.8, col: 0xffb703, rotY: 0.4 },
    { x: -22.8, z: 22.4, col: 0x00b0ff, rotY: 0.7 },
    { x: -30.0, z: 16.4, col: 0xd500f9, rotY: -0.2 }
  ];
  const instGifts = new THREE.InstancedMesh(
    giftBoxGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 }),
    giftDecorSpecs.length
  );
  instGifts.castShadow = true;
  const giftColor = new THREE.Color();
  giftDecorSpecs.forEach((gf, i) => {
    const gy = getTerrainHeight(gf.x, gf.z);
    tempPos.set(gf.x, gy + 0.15, gf.z);
    tempEuler.set(0, gf.rotY, 0);
    tempQuat.setFromEuler(tempEuler);
    tempScale.setScalar(1.0);
    tempMat4.compose(tempPos, tempQuat, tempScale);
    instGifts.setMatrixAt(i, tempMat4);
    giftColor.setHex(gf.col);
    instGifts.setColorAt(i, giftColor);
  });
  rootGroup.add(instGifts);

  // Aankleding: Besneeuwde sneeuwhopen (alleen achter huisjes en langs omheining, niet op het pad of plein)
  const driftDriftGeo = createSculptedSnowDriftGeo(0.85, 0.28, 0.75, 4.2, 10, 8);
  const snowDriftTransforms = [
    { x: -10.2, z: 16.5, rotY: 0.4 },
    { x: -15.8, z: 23.5, rotY: 1.2 },
    { x: -24.8, z: 22.5, rotY: -0.5 },
    { x: -32.5, z: 16.2, rotY: 0.8 },
    { x: -28.5, z: 1.2, rotY: 2.1 }
  ];
  const instSnowDrifts = new THREE.InstancedMesh(driftDriftGeo, snowMat, snowDriftTransforms.length);
  instSnowDrifts.receiveShadow = true;
  snowDriftTransforms.forEach((sd, i) => {
    const sdy = getTerrainHeight(sd.x, sd.z);
    tempPos.set(sd.x, sdy + 0.08, sd.z);
    tempEuler.set(0, sd.rotY, 0);
    tempQuat.setFromEuler(tempEuler);
    tempScale.setScalar(1.0);
    tempMat4.compose(tempPos, tempQuat, tempScale);
    instSnowDrifts.setMatrixAt(i, tempMat4);
  });
  rootGroup.add(instSnowDrifts);

  const bulbGeo = new THREE.SphereGeometry(0.044, 8, 8);
  const bulbMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false
  });
  const instBulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbSpecs.length);
  const tempColor = new THREE.Color();
  bulbSpecs.forEach((b, i) => {
    tempPos.set(b.x, b.y, b.z);
    tempQuat.identity();
    tempScale.setScalar(1.0);
    tempMat4.compose(tempPos, tempQuat, tempScale);
    instBulbs.setMatrixAt(i, tempMat4);
    tempColor.setHex(b.colorHex).multiplyScalar(1.8);
    instBulbs.setColorAt(i, tempColor);
  });
  rootGroup.add(instBulbs);

  // ---------------------------------------------------------------------------
  // 7. Unified Chimney Smoke Particle System (1 Draw Call)
  // ---------------------------------------------------------------------------
  const PARTICLES_PER_CHIMNEY = 10;
  const TOTAL_SMOKE = chimneyWorldEmitters.length * PARTICLES_PER_CHIMNEY;

  const smokeGeo = new THREE.BufferGeometry();
  const smokePositions = new Float32Array(TOTAL_SMOKE * 3);
  const smokeSizes = new Float32Array(TOTAL_SMOKE);
  const smokeOpacities = new Float32Array(TOTAL_SMOKE);
  const smokeAges = new Float32Array(TOTAL_SMOKE);
  const smokeLifespans = new Float32Array(TOTAL_SMOKE);

  function respawnVillageSmoke(idx, initialProgress = 0) {
    const emitterIdx = Math.floor(idx / PARTICLES_PER_CHIMNEY);
    const em = chimneyWorldEmitters[emitterIdx];
    const life = 3.2 + (idx % 5) * 0.35;
    smokeLifespans[idx] = life;
    smokeAges[idx] = initialProgress * life;

    const ang = (idx * 2.399) % (Math.PI * 2);
    smokePositions[idx * 3] = em.x + Math.cos(ang) * 0.06;
    smokePositions[idx * 3 + 1] = em.y;
    smokePositions[idx * 3 + 2] = em.z + Math.sin(ang) * 0.06;
    smokeSizes[idx] = 0.38;
    smokeOpacities[idx] = 0.0;
  }

  function stepVillageSmoke(dt, simTime) {
    const windX = Math.sin(simTime * 0.42) * 0.55 + 0.35;
    const windZ = Math.cos(simTime * 0.31) * 0.32 - 0.10;

    for (let i = 0; i < TOTAL_SMOKE; i++) {
      smokeAges[i] += dt;
      if (smokeAges[i] >= smokeLifespans[i]) {
        respawnVillageSmoke(i, 0);
      }
      const t = Math.min(1.0, smokeAges[i] / smokeLifespans[i]);
      const pIdx = i * 3;
      const sway = Math.sin(simTime * 1.6 + i * 1.7 + t * 3.0) * 0.14;

      smokePositions[pIdx] += (windX * (0.25 + t * 0.85) + sway) * dt;
      smokePositions[pIdx + 1] += (0.72 * (1.0 - t * 0.25)) * dt;
      smokePositions[pIdx + 2] += (windZ * (0.25 + t * 0.85) + sway * 0.7) * dt;

      smokeSizes[i] = 0.38 + Math.pow(t, 0.85) * 1.25;
      const fadeIn = Math.min(1.0, t / 0.12);
      const fadeOut = Math.pow(1.0 - t, 1.6);
      smokeOpacities[i] = fadeIn * fadeOut * 0.38;
    }
  }

  for (let i = 0; i < TOTAL_SMOKE; i++) {
    respawnVillageSmoke(i, (i % PARTICLES_PER_CHIMNEY) / PARTICLES_PER_CHIMNEY);
  }
  for (let s = 0; s < 35; s++) {
    stepVillageSmoke(0.08, s * 0.08);
  }

  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
  smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(smokeSizes, 1));
  smokeGeo.setAttribute('aOpacity', new THREE.BufferAttribute(smokeOpacities, 1));

  const smokeSpriteTex = createSmokeSprite();
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: smokeSpriteTex },
      uScale: { value: 360.0 }
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aOpacity;
      uniform float uScale;
      varying float vOpacity;
      void main() {
        vOpacity = aOpacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(aSize * (uScale / max(-mvPosition.z, 0.5)), 2.0, 260.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying float vOpacity;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float alpha = tex.a * vOpacity;
        if (alpha < 0.004) discard;
        vec3 col = vec3(0.72, 0.80, 0.93) * tex.rgb;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false
  });

  const smokePoints = new THREE.Points(smokeGeo, smokeMat);
  smokePoints.frustumCulled = false;
  smokePoints.raycast = () => {};
  rootGroup.add(smokePoints);

  // ---------------------------------------------------------------------------
  // 8. Animation Loop
  // ---------------------------------------------------------------------------
  let autonomousDoorTimer = 4.0;

  function update(delta, elapsed) {
    // Spontaan elfjes die af en toe een deur opendoen, naar buiten stappen en zwaaien
    autonomousDoorTimer -= delta;
    if (autonomousDoorTimer <= 0) {
      autonomousDoorTimer = 5.0 + Math.random() * 5.0;
      const idleHouses = [];
      for (let h = 0; h < houseAnims.length; h++) {
        if (houseAnims[h].timer <= 0) idleHouses.push(h);
      }
      if (idleHouses.length > 0) {
        const chosen = idleHouses[Math.floor(Math.random() * idleHouses.length)];
        openCottageDoor(chosen);
      }
    }

    // 0. Animate opening cottage doors, window flares, and emerging waving elves
    for (let i = 0; i < houseAnims.length; i++) {
      const anim = houseAnims[i];
      if (anim.timer > 0) {
        anim.timer -= delta;
        const t = Math.max(0, anim.timer);
        const total = 4.5;
        const elapsedAnim = total - t;

        if (elapsedAnim < 0.75) {
          // 1. Door swings open, elf steps forward out onto the doorstep
          const p = elapsedAnim / 0.75;
          const ease = Math.sin((p * Math.PI) / 2);
          anim.doorPivot.rotation.y = -ease * 1.35;
          anim.emergingElf.group.position.z = (anim.doorZ - 0.22) + ease * 0.48;
          anim.doorLight.intensity = ease * 2.8;
          anim.winMat.emissiveIntensity = (villageLightsOn ? 2.85 : 0.2) + ease * 3.2;
          anim.emergingElf.waveArm.rotation.z = -0.4 - ease * 1.6;
        } else if (t > 0.85) {
          // 2. Door is fully open, elf waves enthusiastically
          anim.doorPivot.rotation.y = -1.35;
          anim.emergingElf.group.position.z = anim.doorZ + 0.26;
          anim.doorLight.intensity = 2.8 + Math.sin(elapsed * 6.0) * 0.35;
          anim.winMat.emissiveIntensity = 5.6 + Math.sin(elapsed * 5.0) * 0.45;

          // Cheerful wave gesture
          anim.emergingElf.waveArm.rotation.z = -2.15 + Math.sin(elapsed * 11.0) * 0.42;
          anim.emergingElf.waveArm.rotation.x = -0.3 + Math.cos(elapsed * 11.0) * 0.15;
          anim.emergingElf.head.rotation.y = Math.sin(elapsed * 3.2) * 0.25;
          anim.emergingElf.head.rotation.x = Math.sin(elapsed * 4.5) * 0.08;
        } else if (t > 0) {
          // 3. Elf steps back inside, door gently swings shut
          const closeP = 1.0 - t / 0.85;
          const ease = Math.sin((closeP * Math.PI) / 2);
          anim.doorPivot.rotation.y = -(1.0 - ease) * 1.35;
          anim.emergingElf.group.position.z = (anim.doorZ + 0.26) - ease * 0.48;
          anim.doorLight.intensity = (1.0 - ease) * 2.8;
          anim.winMat.emissiveIntensity = (villageLightsOn ? 2.85 : 0.12) + (1.0 - ease) * 2.8;
          anim.emergingElf.waveArm.rotation.z = -0.4 - (1.0 - ease) * 1.6;
        } else {
          // 4. Closed & reset
          anim.doorPivot.rotation.y = 0;
          anim.emergingElf.group.position.z = anim.doorZ - 0.22;
          anim.emergingElf.group.visible = false;
          anim.doorLight.intensity = 0;
          anim.winMat.emissiveIntensity = villageLightsOn ? 2.85 : 0.12;
        }
      }
    }

    // 1. Hearth flicker across each cottage's windows
    for (let i = 0; i < windowMaterials.length; i++) {
      const { mat, phase } = windowMaterials[i];
      const anim = houseAnims[i];
      if (anim && anim.timer > 0) {
        // active open animation handles its own window emissive
      } else if (!villageLightsOn) {
        mat.emissiveIntensity = 0.12;
      } else {
        const wave =
          Math.sin(elapsed * 3.8 + phase) * 0.45 +
          Math.sin(elapsed * 7.1 + phase * 1.7) * 0.32 +
          Math.cos(elapsed * 11.4 + phase * 2.3) * 0.23;
        mat.emissiveIntensity = 2.85 + wave * 0.48;
      }
    }

    // 2. Village square street lantern & mini-tree star
    if (!villageLightsOn) {
      villagePointLight.intensity = 0;
      villagePointLight.visible = false;
      lanternGlassMat.emissiveIntensity = 0.08;
      lanternGlowMesh.visible = false;
      miniStarMat.emissiveIntensity = 0.15;
    } else {
      villagePointLight.visible = true;
      lanternGlowMesh.visible = true;
      const lanternFlicker = Math.sin(elapsed * 5.2) * 0.12 + Math.cos(elapsed * 8.9) * 0.08;
      lanternGlassMat.emissiveIntensity = 4.4 + lanternFlicker * 0.45;
      lanternGlowMat.opacity = 0.55 + lanternFlicker * 0.10;
      villagePointLight.intensity = 3.4 + lanternFlicker * 0.32;

      miniStarMesh.rotation.y = elapsed * 1.35;
      miniStarMat.emissiveIntensity = 3.4 + Math.sin(elapsed * 3.4) * 0.5;
    }

    // 3. Twinkling fairy bulbs on the cottages & mini-tree
    if (!villageLightsOn) {
      tempColor.setHex(0x111116);
      for (let i = 0; i < bulbSpecs.length; i++) {
        instBulbs.setColorAt(i, tempColor);
      }
      instBulbs.instanceColor.needsUpdate = true;
    } else {
      for (let i = 0; i < bulbSpecs.length; i++) {
        const b = bulbSpecs[i];
        const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 4.0 + b.phase);
        const brightness = 0.35 + Math.pow(twinkle, 2.0) * 2.35;
        tempColor.setHex(b.colorHex).multiplyScalar(brightness);
        instBulbs.setColorAt(i, tempColor);
      }
      instBulbs.instanceColor.needsUpdate = true;
    }

    // 4. Step chimney smoke plumes
    stepVillageSmoke(delta, elapsed);
    smokeGeo.attributes.position.needsUpdate = true;
    smokeGeo.attributes.aSize.needsUpdate = true;
    smokeGeo.attributes.aOpacity.needsUpdate = true;

    // 5. Throttled shadow update for village square lantern (~13 Hz) to preserve 60 FPS
    if (villagePointLight.castShadow && villageLightsOn) {
      lanternShadowTimer += delta;
      if (lanternShadowTimer >= 0.075) {
        lanternShadowTimer = 0;
        villagePointLight.shadow.needsUpdate = true;
      }
    }
  }

  function setQuality(preset, levelName) {
    const isHigh = levelName === 'high' || Boolean(preset && preset.pointShadowsEnabled);
    isHighQuality = isHigh;
    villagePointLight.castShadow = Boolean(isHigh && villageLightsOn);
    if (villagePointLight.castShadow) {
      villagePointLight.shadow.needsUpdate = true;
    } else if (villagePointLight.shadow.map) {
      villagePointLight.shadow.map.dispose();
      villagePointLight.shadow.map = null;
    }
  }

  scene.add(rootGroup);
  return {
    group: rootGroup,
    houses: houseGroups,
    squareGroup,
    pathGroup: null,
    squareCenter,
    villagePointLight,
    setQuality,
    update
  };
}
