import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, RAILWAY_WAYPOINTS } from '../config.js';
import { getGroundHeight, fbm2D } from '../utils/procedural.js';
import { createElf } from '../actors/elf-model.js';

// -----------------------------------------------------------------------------
// Procedural Canvas Textures for Sign, Clock & Andreaskruis
// -----------------------------------------------------------------------------

function createStationSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Rich dark pine green border with gold inner lining
  ctx.fillStyle = '#0f2b1a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.strokeStyle = '#f3e5ab';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 488, 104);

  // Antique cream background panel
  ctx.fillStyle = '#fdfbf2';
  ctx.fillRect(16, 16, 480, 96);

  // Decorative corner accents
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(24, 24, 4, 0, Math.PI * 2);
  ctx.arc(488, 24, 4, 0, Math.PI * 2);
  ctx.arc(24, 104, 4, 0, Math.PI * 2);
  ctx.arc(488, 104, 4, 0, Math.PI * 2);
  ctx.fill();

  // Subtle snowflake icons on flanks
  ctx.fillStyle = '#9e2a2b';
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❄', 46, 64);
  ctx.fillText('❄', 466, 64);

  // Main station title "NOORDPOOL STATION"
  ctx.fillStyle = '#1c3d25';
  ctx.font = '900 34px "Trebuchet MS", "Lucida Sans Unicode", sans-serif';
  ctx.fillText('NOORDPOOL STATION', 256, 52);

  // Subtitle "90° N · KERSTLIJN"
  ctx.fillStyle = '#9e2a2b';
  ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
  ctx.fillText('★ 90° N · KERSTMIS SPOORWEGEN ★', 256, 88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createClockFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Outer brass ring
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  // White dial face
  ctx.fillStyle = '#fefdfa';
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.fill();

  // Hour tick marks & numerals
  ctx.fillStyle = '#1a1d20';
  ctx.strokeStyle = '#1a1d20';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px "Times New Roman", serif';

  const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    const x = 128 + Math.cos(angle) * 88;
    const y = 128 + Math.sin(angle) * 88;
    ctx.fillText(roman[i], x, y);

    // Inner tick mark
    const tx1 = 128 + Math.cos(angle) * 102;
    const ty1 = 128 + Math.sin(angle) * 102;
    const tx2 = 128 + Math.cos(angle) * 110;
    const ty2 = 128 + Math.sin(angle) * 110;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tx1, ty1);
    ctx.lineTo(tx2, ty2);
    ctx.stroke();
  }

  // Small festive star at center
  ctx.fillStyle = '#d92027';
  ctx.font = '16px serif';
  ctx.fillText('★', 128, 76);

  // Clock hands pointing to 23:55 (five minutes to Christmas!)
  // Hour hand (almost at 12): angle ~ -Math.PI / 2 - 0.12 rad
  ctx.strokeStyle = '#1a1d20';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 - 14, 128 - 56);
  ctx.stroke();

  // Minute hand (at 11, i.e. 55 minutes): angle = -Math.PI / 2 - Math.PI / 6
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 - 42, 128 - 74);
  ctx.stroke();

  // Center cap
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(128, 128, 6, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAndreaskruisTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // White base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 64);

  // Red chevron diagonal bands & borders
  ctx.fillStyle = '#d92027';
  ctx.fillRect(0, 0, 36, 64);
  ctx.fillRect(220, 0, 36, 64);

  ctx.beginPath();
  ctx.moveTo(70, 0);
  ctx.lineTo(105, 0);
  ctx.lineTo(80, 64);
  ctx.lineTo(45, 64);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(151, 0);
  ctx.lineTo(186, 0);
  ctx.lineTo(211, 64);
  ctx.lineTo(176, 64);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#1a1d20';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 62);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// -----------------------------------------------------------------------------
// Railway System Builder
// -----------------------------------------------------------------------------

export function createRailway(scene, interaction = null, audio = null) {
  const railwayGroup = new THREE.Group();
  railwayGroup.name = 'railwayGroup';

  // 1. Build Smooth CatmullRom Curve
  const waypoints3D = RAILWAY_WAYPOINTS.map((wp) => {
    const gy = getGroundHeight(wp.x, wp.z);
    return new THREE.Vector3(wp.x, gy, wp.z);
  });

  const railwayCurve = new THREE.CatmullRomCurve3(waypoints3D, true, 'centripetal', 0.5);

  const NUM_SAMPLES = 600;
  const samplePoints = [];
  const sampleTangents = [];
  const sampleNormals = [];

  const rawSpaced = railwayCurve.getSpacedPoints(NUM_SAMPLES);
  const upVec = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const p = rawSpaced[i];
    const gy = getGroundHeight(p.x, p.z);
    const pt = new THREE.Vector3(p.x, gy, p.z);
    samplePoints.push(pt);
  }

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const nextPt = samplePoints[(i + 1) % NUM_SAMPLES];
    const prevPt = samplePoints[(i - 1 + NUM_SAMPLES) % NUM_SAMPLES];
    const tan = new THREE.Vector3().subVectors(nextPt, prevPt).normalize();
    if (tan.lengthSq() < 0.001) tan.set(1, 0, 0);
    sampleTangents.push(tan);

    const norm = new THREE.Vector3().crossVectors(tan, upVec).normalize();
    sampleNormals.push(norm);
  }

  // 2. Ballast Embankment (Grindbedding en sneeuw)
  // Cross section: 5 vertices per slice (-1.15m shoulder, -0.85m top, 0.0m center, +0.85m top, +1.15m shoulder)
  const ballastVerts = [];
  const ballastNorms = [];
  const ballastColors = [];
  const ballastIndices = [];

  const colGravelDark = new THREE.Color(0x383432);
  const colGravelMid = new THREE.Color(0x4a4745);
  const colSnowShoulder = new THREE.Color(COLORS.SNOW_BASE || 0xcbe0ff);

  const ballastProfileOffsets = [-1.18, -0.85, 0.0, 0.85, 1.18];
  const ballastProfileHeights = [0.015, 0.075, 0.082, 0.075, 0.015];

  for (let i = 0; i <= NUM_SAMPLES; i++) {
    const idx = i % NUM_SAMPLES;
    const pt = samplePoints[idx];
    const norm = sampleNormals[idx];

    for (let c = 0; c < 5; c++) {
      const latOffset = ballastProfileOffsets[c];
      const vertY = pt.y + ballastProfileHeights[c];
      const vx = pt.x + norm.x * latOffset;
      const vz = pt.z + norm.z * latOffset;

      ballastVerts.push(vx, vertY, vz);
      ballastNorms.push(0, 1, 0);

      if (c === 0 || c === 4) {
        ballastColors.push(colSnowShoulder.r, colSnowShoulder.g, colSnowShoulder.b);
      } else if (c === 2) {
        ballastColors.push(colGravelDark.r, colGravelDark.g, colGravelDark.b);
      } else {
        ballastColors.push(colGravelMid.r, colGravelMid.g, colGravelMid.b);
      }
    }

    if (i < NUM_SAMPLES) {
      const row1 = i * 5;
      const row2 = (i + 1) * 5;
      for (let c = 0; c < 4; c++) {
        const a = row1 + c;
        const b = row1 + c + 1;
        const d = row2 + c;
        const e = row2 + c + 1;
        ballastIndices.push(a, d, b);
        ballastIndices.push(b, d, e);
      }
    }
  }

  const ballastGeo = new THREE.BufferGeometry();
  ballastGeo.setAttribute('position', new THREE.Float32BufferAttribute(ballastVerts, 3));
  ballastGeo.setAttribute('normal', new THREE.Float32BufferAttribute(ballastNorms, 3));
  ballastGeo.setAttribute('color', new THREE.Float32BufferAttribute(ballastColors, 3));
  ballastGeo.setIndex(ballastIndices);
  ballastGeo.computeVertexNormals();

  const ballastMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.05
  });

  const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
  ballastMesh.name = 'railwayBallast';
  ballastMesh.receiveShadow = true;
  railwayGroup.add(ballastMesh);

  // 3. Thin Snow Layer between sleepers
  const snowVerts = [];
  const snowNorms = [];
  const snowColors = [];
  const snowIndices = [];
  const colSnowDust = new THREE.Color(0xdce8ff);

  for (let i = 0; i <= NUM_SAMPLES; i++) {
    const idx = i % NUM_SAMPLES;
    const pt = samplePoints[idx];
    const norm = sampleNormals[idx];
    const noiseW = 0.52 + fbm2D(pt.x * 0.25, pt.z * 0.25, 2) * 0.12;

    for (let c = 0; c < 3; c++) {
      const factor = c === 0 ? -noiseW : c === 1 ? 0 : noiseW;
      const vy = pt.y + 0.088 + (c === 1 ? 0.008 : 0.0);
      const vx = pt.x + norm.x * factor;
      const vz = pt.z + norm.z * factor;

      snowVerts.push(vx, vy, vz);
      snowNorms.push(0, 1, 0);
      snowColors.push(colSnowDust.r, colSnowDust.g, colSnowDust.b);
    }

    if (i < NUM_SAMPLES) {
      const row1 = i * 3;
      const row2 = (i + 1) * 3;
      for (let c = 0; c < 2; c++) {
        const a = row1 + c;
        const b = row1 + c + 1;
        const d = row2 + c;
        const e = row2 + c + 1;
        snowIndices.push(a, d, b);
        snowIndices.push(b, d, e);
      }
    }
  }

  const snowBedGeo = new THREE.BufferGeometry();
  snowBedGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowVerts, 3));
  snowBedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(snowNorms, 3));
  snowBedGeo.setAttribute('color', new THREE.Float32BufferAttribute(snowColors, 3));
  snowBedGeo.setIndex(snowIndices);
  snowBedGeo.computeVertexNormals();

  const snowBedMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.80,
    metalness: 0.02
  });
  const snowBedMesh = new THREE.Mesh(snowBedGeo, snowBedMat);
  snowBedMesh.name = 'railwaySnowDusting';
  snowBedMesh.receiveShadow = true;
  railwayGroup.add(snowBedMesh);

  // 4. Wooden Sleepers (Houten dwarsliggers om de ±0,6 m via InstancedMesh)
  const totalCurveLength = railwayCurve.getLength();
  const SLEEPER_SPACING = 0.60;
  const numSleepers = Math.round(totalCurveLength / SLEEPER_SPACING);

  const sleeperGeo = new THREE.BoxGeometry(1.36, 0.09, 0.22);
  sleeperGeo.translate(0, 0.045, 0);

  const sleeperMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.08
  });

  const instSleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, numSleepers);
  instSleepers.name = 'instancedSleepers';
  instSleepers.castShadow = true;
  instSleepers.receiveShadow = true;

  const sleeperDummy = new THREE.Object3D();
  const sleeperColor = new THREE.Color();
  const baseWoodColors = [0x3c2619, 0x472f21, 0x332014, 0x4f3627, 0x2b1a10];

  for (let s = 0; s < numSleepers; s++) {
    const u = s / numSleepers;
    const pt = railwayCurve.getPointAt(u);
    const gy = getGroundHeight(pt.x, pt.z);
    pt.y = gy;

    const tan = railwayCurve.getTangentAt(u).normalize();
    const norm = new THREE.Vector3().crossVectors(tan, upVec).normalize();

    // Rotational matrix aligning sleeper across the track
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeBasis(norm, upVec, tan);

    sleeperDummy.position.set(pt.x, gy + 0.052, pt.z);
    sleeperDummy.rotation.setFromRotationMatrix(rotMatrix);
    // Micro rotation jitter for organic rustic track look
    const jitter = Math.sin(s * 1.7) * 0.018;
    sleeperDummy.rotation.y += jitter;
    sleeperDummy.updateMatrix();

    instSleepers.setMatrixAt(s, sleeperDummy.matrix);

    const cHex = baseWoodColors[s % baseWoodColors.length];
    sleeperColor.setHex(cHex);
    instSleepers.setColorAt(s, sleeperColor);
  }

  instSleepers.instanceMatrix.needsUpdate = true;
  if (instSleepers.instanceColor) instSleepers.instanceColor.needsUpdate = true;
  railwayGroup.add(instSleepers);

  // 5. Two Metal Rails (Extruded Vignole profile along the curve)
  // Gauge: 0.90 m => Left rail at offset -0.45 m, Right rail at +0.45 m
  const railVerts = [];
  const railNorms = [];
  const railIndices = [];

  // Rail cross-section profile: 8 vertices forming Vignole rail shape
  // (flange base: -0.04 to +0.04, web: -0.012 to +0.012, head: -0.026 to +0.026)
  const railProfile = [
    { x: -0.040, y: 0.000 },
    { x:  0.040, y: 0.000 },
    { x:  0.038, y: 0.016 },
    { x:  0.012, y: 0.022 },
    { x:  0.012, y: 0.062 },
    { x:  0.026, y: 0.070 },
    { x:  0.024, y: 0.092 },
    { x: -0.024, y: 0.092 },
    { x: -0.026, y: 0.070 },
    { x: -0.012, y: 0.062 },
    { x: -0.012, y: 0.022 },
    { x: -0.038, y: 0.016 }
  ];
  const P_COUNT = railProfile.length;

  function buildRailGeometry(lateralOffset) {
    const vOffset = railVerts.length / 3;

    for (let i = 0; i <= NUM_SAMPLES; i++) {
      const idx = i % NUM_SAMPLES;
      const pt = samplePoints[idx];
      const norm = sampleNormals[idx];
      const railBaseY = pt.y + 0.10; // Sits on sleepers

      for (let p = 0; p < P_COUNT; p++) {
        const prof = railProfile[p];
        const vx = pt.x + norm.x * (lateralOffset + prof.x);
        const vy = railBaseY + prof.y;
        const vz = pt.z + norm.z * (lateralOffset + prof.x);

        railVerts.push(vx, vy, vz);
        // Default normal up/outward
        railNorms.push(norm.x, 0.7, norm.z);
      }

      if (i < NUM_SAMPLES) {
        const row1 = vOffset + i * P_COUNT;
        const row2 = vOffset + (i + 1) * P_COUNT;
        for (let p = 0; p < P_COUNT; p++) {
          const nextP = (p + 1) % P_COUNT;
          const a = row1 + p;
          const b = row1 + nextP;
          const d = row2 + p;
          const e = row2 + nextP;
          railIndices.push(a, d, b);
          railIndices.push(b, d, e);
        }
      }
    }
  }

  buildRailGeometry(-0.45); // Left rail
  buildRailGeometry(0.45);  // Right rail

  const railsGeo = new THREE.BufferGeometry();
  railsGeo.setAttribute('position', new THREE.Float32BufferAttribute(railVerts, 3));
  railsGeo.setAttribute('normal', new THREE.Float32BufferAttribute(railNorms, 3));
  railsGeo.setIndex(railIndices);
  railsGeo.computeVertexNormals();

  const railsMat = new THREE.MeshStandardMaterial({
    color: 0x5a6370,
    roughness: 0.36,
    metalness: 0.86
  });

  const railsMesh = new THREE.Mesh(railsGeo, railsMat);
  railsMesh.name = 'railwayTracks';
  railsMesh.castShadow = true;
  railsMesh.receiveShadow = true;
  railwayGroup.add(railsMesh);

  // ---------------------------------------------------------------------------
  // 6. Level Crossing (Overweg) where the railway crosses the path
  // ---------------------------------------------------------------------------
  const crossingCenter = new THREE.Vector3(-11.02, 0, 4.03);
  crossingCenter.y = getGroundHeight(crossingCenter.x, crossingCenter.z);

  const crossingGroup = new THREE.Group();
  crossingGroup.name = 'railwayCrossingGroup';

  // Wooden Planks between and beside rails
  // Path tangent at crossing is roughly (-0.56, 0, -0.83), so planks lie along path
  const plankWoodMat = new THREE.MeshStandardMaterial({
    color: 0x543926,
    roughness: 0.78,
    metalness: 0.04
  });

  const plankGeometries = [];

  // 4 center planks between rails
  for (let p = -1.5; p <= 1.5; p++) {
    const lat = p * 0.18;
    const g = new THREE.BoxGeometry(0.16, 0.04, 2.6);
    g.translate(lat, 0.185, 0);
    plankGeometries.push(g);
  }

  // Outer apron planks
  for (let side of [-1, 1]) {
    for (let op = 0; op < 2; op++) {
      const lat = side * (0.55 + op * 0.17);
      const g = new THREE.BoxGeometry(0.15, 0.035, 2.6);
      g.translate(lat, 0.165 - op * 0.04, 0);
      plankGeometries.push(g);
    }
  }

  const mergedPlanksGeo = mergeGeometries(plankGeometries);
  const planksMesh = new THREE.Mesh(mergedPlanksGeo, plankWoodMat);
  planksMesh.castShadow = true;
  planksMesh.receiveShadow = true;

  // Align planks with track orientation at crossing
  const crossingTan = railwayCurve.getTangentAt(0).normalize();
  const crossingNorm = new THREE.Vector3().crossVectors(crossingTan, upVec).normalize();
  const crossingRot = new THREE.Matrix4().makeBasis(crossingNorm, upVec, crossingTan);

  planksMesh.position.copy(crossingCenter);
  planksMesh.rotation.setFromRotationMatrix(crossingRot);
  crossingGroup.add(planksMesh);

  // St. Andrew's Cross Signs (Andreaskruis) on both sides of path
  const andreaskruisTex = createAndreaskruisTexture();
  const crossSignMat = new THREE.MeshStandardMaterial({
    map: andreaskruisTex,
    roughness: 0.45,
    metalness: 0.15
  });

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x22252a,
    roughness: 0.65,
    metalness: 0.85
  });

  const bellGoldMat = new THREE.MeshStandardMaterial({
    color: COLORS.GOLD_METAL || 0xd4af37,
    roughness: 0.25,
    metalness: 0.88,
    emissive: 0x442600,
    emissiveIntensity: 0.2
  });

  function createAndreaskruisPost(x, z, angleY) {
    const postGroup = new THREE.Group();
    const gy = getGroundHeight(x, z);
    postGroup.position.set(x, gy, z);
    postGroup.rotation.y = angleY;

    // Concrete/stone footing
    const footingGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.22, 8);
    const footingMat = new THREE.MeshStandardMaterial({ color: 0x5e636b, roughness: 0.9 });
    const footing = new THREE.Mesh(footingGeo, footingMat);
    footing.position.y = 0.11;
    footing.receiveShadow = true;
    postGroup.add(footing);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.045, 0.05, 2.3, 10);
    const pole = new THREE.Mesh(poleGeo, postMat);
    pole.position.y = 1.15;
    pole.castShadow = true;
    postGroup.add(pole);

    // Red & white reflective bands on post
    const bandGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.16, 10);
    const redBandMat = new THREE.MeshStandardMaterial({ color: 0xd92027, roughness: 0.5 });
    const whiteBandMat = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.5 });

    for (let b = 0; b < 4; b++) {
      const band = new THREE.Mesh(bandGeo, b % 2 === 0 ? redBandMat : whiteBandMat);
      band.position.y = 0.5 + b * 0.22;
      postGroup.add(band);
    }

    // X-cross head
    const crossArmGeo = new THREE.BoxGeometry(0.88, 0.13, 0.024);
    const arm1 = new THREE.Mesh(crossArmGeo, crossSignMat);
    arm1.position.set(0, 1.95, 0.035);
    arm1.rotation.z = Math.PI / 4;
    arm1.castShadow = true;
    postGroup.add(arm1);

    const arm2 = new THREE.Mesh(crossArmGeo, crossSignMat);
    arm2.position.set(0, 1.95, 0.045);
    arm2.rotation.z = -Math.PI / 4;
    arm2.castShadow = true;
    postGroup.add(arm2);

    // Snow dusting on top edges of cross
    const crossSnowGeo = new THREE.BoxGeometry(0.48, 0.035, 0.04);
    const crossSnowMat = new THREE.MeshStandardMaterial({ color: COLORS.SNOW_BASE, roughness: 0.75 });
    const cs1 = new THREE.Mesh(crossSnowGeo, crossSnowMat);
    cs1.position.set(-0.16, 2.12, 0.04);
    cs1.rotation.z = Math.PI / 4;
    postGroup.add(cs1);

    const cs2 = new THREE.Mesh(crossSnowGeo, crossSnowMat);
    cs2.position.set(0.16, 2.12, 0.04);
    cs2.rotation.z = -Math.PI / 4;
    postGroup.add(cs2);

    // Brass top warning bell
    const bellCyl = new THREE.CylinderGeometry(0.045, 0.075, 0.11, 10);
    const bell = new THREE.Mesh(bellCyl, bellGoldMat);
    bell.position.y = 2.36;
    bell.castShadow = true;
    postGroup.add(bell);

    const finialGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const finial = new THREE.Mesh(finialGeo, bellGoldMat);
    finial.position.y = 2.45;
    postGroup.add(finial);

    return postGroup;
  }

  // Northern sign facing walkers heading south
  const signNorth = createAndreaskruisPost(-10.25, 4.95, 0.85);
  crossingGroup.add(signNorth);

  // Southern sign facing walkers heading north
  const signSouth = createAndreaskruisPost(-11.65, 3.35, -2.25);
  crossingGroup.add(signSouth);

  railwayGroup.add(crossingGroup);

  // ---------------------------------------------------------------------------
  // 7. Christmas Station ("Kersthalte") beside the track
  // ---------------------------------------------------------------------------
  const stationCenter = new THREE.Vector3(-14.6, 0, 2.2);
  stationCenter.y = getGroundHeight(stationCenter.x, stationCenter.z);

  const stationGroup = new THREE.Group();
  stationGroup.name = 'christmasStationGroup';
  stationGroup.position.copy(stationCenter);

  // Platform angle parallel to the track at station (tangent at wp 1)
  const stationTan = railwayCurve.getTangentAt(1 / 12).normalize();
  const stationAngle = Math.atan2(stationTan.x, stationTan.z);
  stationGroup.rotation.y = stationAngle - Math.PI / 2;

  // 7a. Stenen Perron (Stone Platform)
  const platformLength = 7.4;
  const platformWidth = 2.8;
  const platformHeight = 0.30;

  const curbStoneGeo = new THREE.BoxGeometry(platformLength, platformHeight, platformWidth);
  curbStoneGeo.translate(0, platformHeight * 0.5, -platformWidth * 0.5 - 0.52);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x52565e,
    roughness: 0.85,
    metalness: 0.08
  });
  const platformMesh = new THREE.Mesh(curbStoneGeo, stoneMat);
  platformMesh.receiveShadow = true;
  platformMesh.castShadow = true;
  stationGroup.add(platformMesh);

  // Safety curb line (festive golden yellow strip along platform edge)
  const curbStripGeo = new THREE.BoxGeometry(platformLength * 0.98, 0.012, 0.09);
  curbStripGeo.translate(0, platformHeight + 0.006, -0.58);
  const curbStripMat = new THREE.MeshStandardMaterial({
    color: 0xcca028,
    roughness: 0.65
  });
  const curbStripMesh = new THREE.Mesh(curbStripGeo, curbStripMat);
  stationGroup.add(curbStripMesh);

  // Snow dusting & drifts along platform back and sides
  const platSnowGeo = new THREE.BoxGeometry(platformLength * 0.96, 0.045, platformWidth * 0.75);
  platSnowGeo.translate(0, platformHeight + 0.02, -platformWidth * 0.65 - 0.52);
  const platSnowMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    roughness: 0.72,
    metalness: 0.02
  });
  const platSnowMesh = new THREE.Mesh(platSnowGeo, platSnowMat);
  platSnowMesh.receiveShadow = true;
  stationGroup.add(platSnowMesh);

  // 7b. Houten Wachthuisje (Alpine Railway Shelter)
  const shelterWidth = 3.4;
  const shelterDepth = 2.3;
  const shelterHeight = 2.4;
  const shelterZ = -platformWidth * 0.5 - 0.75;

  const woodWallMat = new THREE.MeshStandardMaterial({
    color: COLORS.WOOD_WARM || 0x5a361e,
    roughness: 0.75,
    metalness: 0.05
  });

  const woodTrimMat = new THREE.MeshStandardMaterial({
    color: COLORS.WOOD_DARK || 0x361e10,
    roughness: 0.70,
    metalness: 0.05
  });

  // Main shelter building box
  const shelterWallsGeo = new THREE.BoxGeometry(shelterWidth, shelterHeight, shelterDepth);
  shelterWallsGeo.translate(0, platformHeight + shelterHeight * 0.5, shelterZ);
  const shelterWallsMesh = new THREE.Mesh(shelterWallsGeo, woodWallMat);
  shelterWallsMesh.castShadow = true;
  shelterWallsMesh.receiveShadow = true;
  stationGroup.add(shelterWallsMesh);

  // Corner timber beams
  const postGeometries = [];
  for (let sx of [-1, 1]) {
    for (let sz of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.18, shelterHeight + 0.05, 0.18);
      g.translate(
        sx * (shelterWidth * 0.5 + 0.04),
        platformHeight + shelterHeight * 0.5,
        shelterZ + sz * (shelterDepth * 0.5 + 0.04)
      );
      postGeometries.push(g);
    }
  }
  const mergedPosts = mergeGeometries(postGeometries);
  const postsMesh = new THREE.Mesh(mergedPosts, woodTrimMat);
  postsMesh.castShadow = true;
  stationGroup.add(postsMesh);

  // Gabled Wooden Roof
  const roofOverhangX = 0.45;
  const roofOverhangZ = 0.40;
  const roofWidth = shelterWidth + roofOverhangX * 2;
  const roofDepth = shelterDepth + roofOverhangZ * 2;
  const roofPeakY = platformHeight + shelterHeight + 1.15;
  const roofEavesY = platformHeight + shelterHeight - 0.08;

  // Roof slopes (left and right pitched planes)
  const roofSlopeGeo = new THREE.BoxGeometry(roofWidth * 0.54, 0.09, roofDepth);
  const leftRoof = new THREE.Mesh(roofSlopeGeo, woodTrimMat);
  leftRoof.position.set(-roofWidth * 0.25, (roofPeakY + roofEavesY) * 0.5, shelterZ);
  leftRoof.rotation.z = -0.56;
  leftRoof.castShadow = true;
  stationGroup.add(leftRoof);

  const rightRoof = new THREE.Mesh(roofSlopeGeo, woodTrimMat);
  rightRoof.position.set(roofWidth * 0.25, (roofPeakY + roofEavesY) * 0.5, shelterZ);
  rightRoof.rotation.z = 0.56;
  rightRoof.castShadow = true;
  stationGroup.add(rightRoof);

  // Thick Procedural Sneeuwdak (Snow Roof)
  const snowRoofGeo = new THREE.BoxGeometry(roofWidth * 0.56, 0.22, roofDepth + 0.10);
  const snowRoofMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    roughness: 0.68,
    metalness: 0.03
  });

  const leftSnowRoof = new THREE.Mesh(snowRoofGeo, snowRoofMat);
  leftSnowRoof.position.set(-roofWidth * 0.25, (roofPeakY + roofEavesY) * 0.5 + 0.12, shelterZ);
  leftSnowRoof.rotation.z = -0.56;
  leftSnowRoof.castShadow = true;
  leftSnowRoof.receiveShadow = true;
  stationGroup.add(leftSnowRoof);

  const rightSnowRoof = new THREE.Mesh(snowRoofGeo, snowRoofMat);
  rightSnowRoof.position.set(roofWidth * 0.25, (roofPeakY + roofEavesY) * 0.5 + 0.12, shelterZ);
  rightSnowRoof.rotation.z = 0.56;
  rightSnowRoof.castShadow = true;
  rightSnowRoof.receiveShadow = true;
  stationGroup.add(rightSnowRoof);

  // IJspegels (Icicles along front and side eaves)
  const icicleGeometries = [];
  const icicleMat = new THREE.MeshPhysicalMaterial({
    color: 0xe5f5ff,
    roughness: 0.12,
    metalness: 0.05,
    transmission: 0.82,
    ior: 1.33,
    transparent: true,
    opacity: 0.88
  });

  const numIciclesFront = 22;
  for (let i = 0; i < numIciclesFront; i++) {
    const frac = i / (numIciclesFront - 1);
    const ix = -roofWidth * 0.48 + frac * roofWidth * 0.96;
    const len = 0.16 + (Math.sin(i * 3.4) * 0.5 + 0.5) * 0.28;
    const rad = 0.020 + (i % 3) * 0.007;

    const g = new THREE.ConeGeometry(rad, len, 6);
    g.rotateX(Math.PI);
    g.translate(ix, roofEavesY - len * 0.5 + 0.04, shelterZ + roofDepth * 0.48);
    icicleGeometries.push(g);
  }

  // Side icicles
  for (let s of [-1, 1]) {
    for (let j = 0; j < 8; j++) {
      const zFrac = j / 7;
      const iz = shelterZ - roofDepth * 0.45 + zFrac * roofDepth * 0.9;
      const len = 0.12 + ((j + s) % 4) * 0.08;
      const g = new THREE.ConeGeometry(0.018, len, 6);
      g.rotateX(Math.PI);
      const slopeY = roofEavesY + (1.0 - Math.abs(zFrac - 0.5) * 2) * 0.15;
      g.translate(s * (roofWidth * 0.49), slopeY - len * 0.5 + 0.04, iz);
      icicleGeometries.push(g);
    }
  }

  const mergedIciclesGeo = mergeGeometries(icicleGeometries);
  const iciclesMesh = new THREE.Mesh(mergedIciclesGeo, icicleMat);
  iciclesMesh.name = 'stationIcicles';
  stationGroup.add(iciclesMesh);

  // 7c. Warm Verlichte Ramen (Warmly lit windows)
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffaa33,
    emissive: 0xff8c1a,
    emissiveIntensity: 2.4,
    roughness: 0.25,
    metalness: 0.10
  });

  const windowFrameMat = new THREE.MeshStandardMaterial({
    color: 0x221309,
    roughness: 0.65
  });

  function createWindow(wx, wy, wz, wWidth, wHeight) {
    const winGroup = new THREE.Group();
    winGroup.position.set(wx, wy, wz);

    // Glowing glass pane
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(wWidth, wHeight), windowGlowMat);
    winGroup.add(glass);

    // Wooden frame & cross mullions
    const frameGeo = new THREE.BoxGeometry(wWidth + 0.08, 0.05, 0.05);
    const frameTop = new THREE.Mesh(frameGeo, windowFrameMat);
    frameTop.position.set(0, wHeight * 0.5, 0.02);
    winGroup.add(frameTop);

    const frameBottom = new THREE.Mesh(frameGeo, windowFrameMat);
    frameBottom.position.set(0, -wHeight * 0.5, 0.02);
    winGroup.add(frameBottom);

    const frameSideGeo = new THREE.BoxGeometry(0.05, wHeight + 0.08, 0.05);
    const frameL = new THREE.Mesh(frameSideGeo, windowFrameMat);
    frameL.position.set(-wWidth * 0.5, 0, 0.02);
    winGroup.add(frameL);

    const frameR = new THREE.Mesh(frameSideGeo, windowFrameMat);
    frameR.position.set(wWidth * 0.5, 0, 0.02);
    winGroup.add(frameR);

    // Lattice mullions
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.025, wHeight, 0.03), windowFrameMat);
    mullionV.position.set(0, 0, 0.02);
    winGroup.add(mullionV);

    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(wWidth, 0.025, 0.03), windowFrameMat);
    mullionH.position.set(0, 0, 0.02);
    winGroup.add(mullionH);

    // Window sill with snow
    const sill = new THREE.Mesh(new THREE.BoxGeometry(wWidth + 0.16, 0.06, 0.10), windowFrameMat);
    sill.position.set(0, -wHeight * 0.5 - 0.03, 0.04);
    winGroup.add(sill);

    const sillSnow = new THREE.Mesh(new THREE.BoxGeometry(wWidth + 0.14, 0.035, 0.08), platSnowMat);
    sillSnow.position.set(0, -wHeight * 0.5 + 0.015, 0.04);
    winGroup.add(sillSnow);

    return winGroup;
  }

  // Two front windows flanking the door
  const winLeft = createWindow(-0.95, platformHeight + 1.25, shelterZ + shelterDepth * 0.5 + 0.02, 0.72, 0.88);
  stationGroup.add(winLeft);

  const winRight = createWindow(0.95, platformHeight + 1.25, shelterZ + shelterDepth * 0.5 + 0.02, 0.72, 0.88);
  stationGroup.add(winRight);

  // Soft warm glow projected onto platform floor from windows
  const windowGlowFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.8),
    new THREE.MeshBasicMaterial({
      color: 0xff9922,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  windowGlowFloor.rotation.x = -Math.PI / 2;
  windowGlowFloor.position.set(0, platformHeight + 0.03, shelterZ + shelterDepth * 0.5 + 0.95);
  stationGroup.add(windowGlowFloor);

  // 7d. Deur & Kerstkrans (Station door & Christmas wreath)
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, platformHeight + 0.98, shelterZ + shelterDepth * 0.5 + 0.02);

  const doorLeafGeo = new THREE.BoxGeometry(0.85, 1.90, 0.06);
  const doorLeafMat = new THREE.MeshStandardMaterial({
    color: 0x183b22, // Rich dark forest green
    roughness: 0.55
  });
  const doorLeaf = new THREE.Mesh(doorLeafGeo, doorLeafMat);
  doorLeaf.castShadow = true;
  doorGroup.add(doorLeaf);

  // Brass knob
  const knobGeo = new THREE.SphereGeometry(0.032, 8, 8);
  const knob = new THREE.Mesh(knobGeo, bellGoldMat);
  knob.position.set(0.32, -0.05, 0.05);
  doorGroup.add(knob);

  // Christmas Wreath (Kerstkrans op de deur)
  const wreathGroup = new THREE.Group();
  wreathGroup.position.set(0, 0.25, 0.06);

  const wreathTorusGeo = new THREE.TorusGeometry(0.24, 0.065, 8, 20);
  const wreathPineMat = new THREE.MeshStandardMaterial({
    color: 0x0f3e1f,
    roughness: 0.85
  });
  const wreathTorus = new THREE.Mesh(wreathTorusGeo, wreathPineMat);
  wreathTorus.castShadow = true;
  wreathGroup.add(wreathTorus);

  // Red berries on wreath
  const berryGeo = new THREE.SphereGeometry(0.022, 6, 6);
  const berryMat = new THREE.MeshStandardMaterial({
    color: 0xd92027,
    roughness: 0.25,
    metalness: 0.15
  });

  const berryClusters = 7;
  for (let b = 0; b < berryClusters; b++) {
    const ang = (b / berryClusters) * Math.PI * 2;
    const bx = Math.cos(ang) * 0.24;
    const by = Math.sin(ang) * 0.24;
    const berry = new THREE.Mesh(berryGeo, berryMat);
    berry.position.set(bx, by, 0.055);
    wreathGroup.add(berry);
  }

  // Red & Gold Ribbon Bow at top of wreath
  const bowMat = new THREE.MeshStandardMaterial({
    color: 0xd92027,
    roughness: 0.40,
    metalness: 0.20
  });

  const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), bellGoldMat);
  bowCenter.position.set(0, 0.25, 0.07);
  wreathGroup.add(bowCenter);

  const loopGeo = new THREE.TorusGeometry(0.065, 0.024, 6, 12);
  const bowL = new THREE.Mesh(loopGeo, bowMat);
  bowL.position.set(-0.065, 0.26, 0.06);
  bowL.rotation.set(0, 0, 0.5);
  wreathGroup.add(bowL);

  const bowR = new THREE.Mesh(loopGeo, bowMat);
  bowR.position.set(0.065, 0.26, 0.06);
  bowR.rotation.set(0, 0, -0.5);
  wreathGroup.add(bowR);

  // Bow tails
  const tailGeo = new THREE.BoxGeometry(0.04, 0.14, 0.015);
  const tailL = new THREE.Mesh(tailGeo, bowMat);
  tailL.position.set(-0.04, 0.14, 0.06);
  tailL.rotation.z = -0.25;
  wreathGroup.add(tailL);

  const tailR = new THREE.Mesh(tailGeo, bowMat);
  tailR.position.set(0.04, 0.14, 0.06);
  tailR.rotation.z = 0.25;
  wreathGroup.add(tailR);

  doorGroup.add(wreathGroup);
  stationGroup.add(doorGroup);

  // 7e. Bordje "NOORDPOOL STATION"
  const signBoardGroup = new THREE.Group();
  signBoardGroup.position.set(0, platformHeight + shelterHeight + 0.28, shelterZ + shelterDepth * 0.5 + 0.18);

  const signTex = createStationSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.50,
    metalness: 0.10
  });

  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.60, 0.06), signMat);
  signBoard.castShadow = true;
  signBoardGroup.add(signBoard);

  // Snow cap on top of sign board
  const signSnow = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.06, 0.10), platSnowMat);
  signSnow.position.set(0, 0.32, 0);
  signBoardGroup.add(signSnow);

  stationGroup.add(signBoardGroup);

  // 7f. Stationsbankje (Platform Bench)
  const benchGroup = new THREE.Group();
  benchGroup.position.set(-2.0, platformHeight, -platformWidth * 0.5 - 0.25);
  benchGroup.rotation.y = 0.05;

  const benchWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6e4124,
    roughness: 0.70,
    metalness: 0.05
  });

  const benchIronMat = new THREE.MeshStandardMaterial({
    color: 0x142b1a, // Dark heritage green cast-iron
    roughness: 0.55,
    metalness: 0.85
  });

  // Bench legs (2 arched iron ends)
  const legGeo = new THREE.BoxGeometry(0.06, 0.44, 0.52);
  const legL = new THREE.Mesh(legGeo, benchIronMat);
  legL.position.set(-0.85, 0.22, 0);
  legL.castShadow = true;
  benchGroup.add(legL);

  const legR = new THREE.Mesh(legGeo, benchIronMat);
  legR.position.set(0.85, 0.22, 0);
  legR.castShadow = true;
  benchGroup.add(legR);

  // Bench seat slats
  for (let s = 0; s < 4; s++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.028, 0.09), benchWoodMat);
    slat.position.set(0, 0.42, -0.16 + s * 0.11);
    slat.castShadow = true;
    benchGroup.add(slat);
  }

  // Bench backrest slats
  for (let b = 0; b < 3; b++) {
    const bslat = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.025), benchWoodMat);
    bslat.position.set(0, 0.55 + b * 0.11, -0.22);
    bslat.rotation.x = -0.15;
    bslat.castShadow = true;
    benchGroup.add(bslat);
  }

  // Snow dusting on bench
  const benchSnow = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.02, 0.38), platSnowMat);
  benchSnow.position.set(0, 0.44, 0.02);
  benchGroup.add(benchSnow);

  stationGroup.add(benchGroup);

  // 7g. Stationsklok (Station Clock on ornate iron bracket)
  const clockGroup = new THREE.Group();
  clockGroup.position.set(shelterWidth * 0.5 + 0.06, platformHeight + shelterHeight * 0.72, shelterZ + shelterDepth * 0.5 - 0.2);

  // Wrought iron projecting arm
  const armH = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 8), postMat);
  armH.rotation.z = Math.PI / 2;
  armH.position.set(0.32, 0, 0);
  clockGroup.add(armH);

  // Clock drum casing (double-faced)
  const clockTex = createClockFaceTexture();
  const clockFaceMat = new THREE.MeshStandardMaterial({
    map: clockTex,
    roughness: 0.35,
    metalness: 0.20
  });

  const clockDrumGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.14, 24);
  clockDrumGeo.rotateZ(Math.PI / 2);
  const clockDrum = new THREE.Mesh(clockDrumGeo, postMat);
  clockDrum.position.set(0.65, 0, 0);
  clockDrum.castShadow = true;
  clockGroup.add(clockDrum);

  // Two dials (facing track / station)
  const dialFront = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), clockFaceMat);
  dialFront.position.set(0.722, 0, 0);
  dialFront.rotation.y = Math.PI / 2;
  clockGroup.add(dialFront);

  const dialBack = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), clockFaceMat);
  dialBack.position.set(0.578, 0, 0);
  dialBack.rotation.y = -Math.PI / 2;
  clockGroup.add(dialBack);

  // Brass finial & small snow cap on clock
  const clockSnow = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 16, 1, false, 0, Math.PI), platSnowMat);
  clockSnow.position.set(0.65, 0.31, 0);
  clockSnow.rotation.z = Math.PI / 2;
  clockGroup.add(clockSnow);

  stationGroup.add(clockGroup);

  // 7h. Lantaarn (Station Platform Lamppost)
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(2.4, platformHeight, -0.65);

  const lamppostPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 2.5, 10), postMat);
  lamppostPole.position.y = 1.25;
  lamppostPole.castShadow = true;
  lanternGroup.add(lamppostPole);

  const lanternArm = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 14, Math.PI * 0.75), postMat);
  lanternArm.position.set(-0.15, 2.38, 0);
  lanternGroup.add(lanternArm);

  // Four-sided glowing glass lantern
  const lanternGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.065, 0.26, 4),
    new THREE.MeshStandardMaterial({
      color: 0xffb040,
      emissive: 0xff9922,
      emissiveIntensity: 2.8,
      roughness: 0.15
    })
  );
  lanternGlass.position.set(-0.25, 2.22, 0);
  lanternGroup.add(lanternGlass);

  // Lantern cap & snow
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 4), postMat);
  lanternCap.position.set(-0.25, 2.40, 0);
  lanternGroup.add(lanternCap);

  const lanternCapSnow = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.08, 4), platSnowMat);
  lanternCapSnow.position.set(-0.25, 2.44, 0);
  lanternGroup.add(lanternCapSnow);

  // Warm glowing circle on platform floor
  const lanternGlowFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  lanternGlowFloor.rotation.x = -Math.PI / 2;
  lanternGlowFloor.position.set(0, 0.02, 0);
  lanternGroup.add(lanternGlowFloor);

  stationGroup.add(lanternGroup);

  // 7i. Stapel Koffers & Cadeaus (Stack of Suitcases & Wrapped Presents)
  const luggageGroup = new THREE.Group();
  luggageGroup.position.set(1.9, platformHeight, -platformWidth * 0.5 - 0.15);

  const leatherBrownMat = new THREE.MeshStandardMaterial({ color: 0x4e2d19, roughness: 0.48 });
  const leatherTanMat = new THREE.MeshStandardMaterial({ color: 0x8a552e, roughness: 0.44 });
  const leatherOxbloodMat = new THREE.MeshStandardMaterial({ color: 0x5c1a1a, roughness: 0.42 });

  // Suitcase 1 (Large bottom trunk)
  const trunk1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.48), leatherBrownMat);
  trunk1.position.set(0, 0.14, 0);
  trunk1.rotation.y = 0.12;
  trunk1.castShadow = true;
  luggageGroup.add(trunk1);

  // Brass corners on trunk
  const cornerMat = bellGoldMat;
  for (let cx of [-0.35, 0.35]) {
    for (let cy of [0.03, 0.25]) {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), cornerMat);
      corner.position.set(cx, cy, 0.23);
      luggageGroup.add(corner);
    }
  }

  // Suitcase 2 (Medium tan case)
  const trunk2 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.38), leatherTanMat);
  trunk2.position.set(0.04, 0.39, -0.02);
  trunk2.rotation.y = -0.16;
  trunk2.castShadow = true;
  luggageGroup.add(trunk2);

  // Suitcase 3 (Small oxblood briefcase)
  const trunk3 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.30), leatherOxbloodMat);
  trunk3.position.set(0.06, 0.58, -0.01);
  trunk3.rotation.y = 0.22;
  trunk3.castShadow = true;
  luggageGroup.add(trunk3);

  // Wrapped Christmas Gift Boxes beside luggage
  const giftColors = [
    { box: 0xd92027, ribbon: 0xffcc33 }, // Red with gold
    { box: 0x1e6bd6, ribbon: 0xf7f9fc }, // Royal blue with silver
    { box: 0x1f8a4c, ribbon: 0xffcc33 }, // Emerald with gold
    { box: 0x8e3ccb, ribbon: 0xffdd55 }  // Purple with gold
  ];

  const gift1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.36, 0.38),
    new THREE.MeshStandardMaterial({ color: giftColors[0].box, roughness: 0.35 })
  );
  gift1.position.set(-0.48, 0.18, 0.12);
  gift1.rotation.y = 0.35;
  gift1.castShadow = true;
  luggageGroup.add(gift1);

  const ribbon1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.39, 0.37, 0.06),
    new THREE.MeshStandardMaterial({ color: giftColors[0].ribbon, roughness: 0.25, metalness: 0.3 })
  );
  gift1.add(ribbon1);

  const gift2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.28, 0.30),
    new THREE.MeshStandardMaterial({ color: giftColors[1].box, roughness: 0.35 })
  );
  gift2.position.set(-0.42, 0.48, 0.10);
  gift2.rotation.y = -0.22;
  gift2.castShadow = true;
  luggageGroup.add(gift2);

  const gift3 = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.26, 0.32),
    new THREE.MeshStandardMaterial({ color: giftColors[2].box, roughness: 0.35 })
  );
  gift3.position.set(0.55, 0.13, 0.08);
  gift3.rotation.y = 0.52;
  gift3.castShadow = true;
  luggageGroup.add(gift3);

  stationGroup.add(luggageGroup);

  // ---------------------------------------------------------------------------
  // 8. Wachtende Elfjes op het Perron (Waiting Elves via createElf())
  // ---------------------------------------------------------------------------
  // Elf 1: "Noor" - Sitting on the bench swinging legs
  const elfNoor = createElf({
    id: 'stationElf_Noor',
    name: 'Elfje Noor',
    scale: 1.15,
    suitColor: 0x1f8a4c, // Emerald green
    trimColor: 0xd92027, // Red collar & trim
    hatColor: 0x1f8a4c,
    shoeColor: 0xd92027
  });
  // Positioned on the bench: bench is at (-2.0, platformHeight, -platformWidth*0.5 - 0.25)
  elfNoor.root.position.set(-2.0, platformHeight + 0.42, -platformWidth * 0.5 - 0.08);
  elfNoor.root.rotation.y = 0.10;
  // Bend hips/thighs forward to sit comfortably on the bench
  if (elfNoor.leftLeg) elfNoor.leftLeg.rotation.x = -Math.PI * 0.45;
  if (elfNoor.rightLeg) elfNoor.rightLeg.rotation.x = -Math.PI * 0.45;
  stationGroup.add(elfNoor.root);

  // Elf 2: "Jasper" - Standing near platform edge looking down tracks
  const elfJasper = createElf({
    id: 'stationElf_Jasper',
    name: 'Elfje Jasper',
    scale: 1.18,
    suitColor: 0x1a5bb8, // Royal cobalt blue
    trimColor: 0xd4af37, // Gold trim
    hatColor: 0xd92027,  // Red hat with bell
    shoeColor: 0x1a5bb8
  });
  elfJasper.root.position.set(0.85, platformHeight, -0.75);
  elfJasper.root.rotation.y = Math.PI * 0.42; // Looking towards oncoming train
  // Shading eyes / watching pose
  if (elfJasper.rightArm) {
    elfJasper.rightArm.rotation.set(-0.8, 0.4, 0.6);
  }
  stationGroup.add(elfJasper.root);

  // Elf 3: "Pip" - Standing by luggage stack holding warm cocoa mug
  const elfPip = createElf({
    id: 'stationElf_Pip',
    name: 'Elfje Pip',
    scale: 1.14,
    suitColor: 0xd92027, // Crimson red
    trimColor: 0xf5f7fb, // White fleece
    hatColor: 0x1f8a4c,  // Green hat
    shoeColor: 0x0f2b1a
  });
  elfPip.root.position.set(1.42, platformHeight, -0.92);
  elfPip.root.rotation.y = -0.35;

  // Add small festive hot cocoa mug in Pip's hand
  const mugGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.065, 8);
  const mugMat = new THREE.MeshStandardMaterial({ color: 0xd92027, roughness: 0.3 });
  const mug = new THREE.Mesh(mugGeo, mugMat);
  mug.position.set(0.14, 0.45, 0.16);
  elfPip.root.add(mug);

  const steamGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
  const cocoaSteamMesh = new THREE.Mesh(steamGeo, steamMat);
  cocoaSteamMesh.position.set(0.14, 0.51, 0.16);
  elfPip.root.add(cocoaSteamMesh);

  stationGroup.add(elfPip.root);

  // Register Click Interaction for Waiting Elves
  if (interaction) {
    const speechLines = [
      'De Noordpoolexpress komt zo aan!',
      'Al mijn cadeautjes zijn ingepakt!',
      'Ik reis straks mee naar het Elfendorp!',
      'Heb jij Rudolf al voorbij zien vliegen?',
      'Het sneeuwt heerlijk op het perron!'
    ];

    [elfNoor, elfJasper, elfPip].forEach((elfData, idx) => {
      interaction.registerClickable(elfData.root, {
        name: idx === 0 ? 'Elfje Noor (Wachtbankje)' : idx === 1 ? 'Elfje Jasper (Perronkijker)' : 'Elfje Pip (Chocomelk)',
        onClick: () => {
          if (audio && audio.playElfBell) audio.playElfBell();
          if (interaction.showSpeechBubble) {
            const worldPos = new THREE.Vector3();
            elfData.root.getWorldPosition(worldPos);
            worldPos.y += 0.85;
            const line = speechLines[(idx + Math.floor(Math.random() * speechLines.length)) % speechLines.length];
            interaction.showSpeechBubble(worldPos, line);
          }
        }
      });
    });

    // Register station shelter door as clickable
    interaction.registerClickable(doorGroup, {
      name: 'Wachthuisje Deur (Noordpool Station)',
      onClick: () => {
        if (audio && audio.playDoorSqueak) audio.playDoorSqueak();
        if (interaction.showSpeechBubble) {
          const worldPos = new THREE.Vector3();
          doorGroup.getWorldPosition(worldPos);
          worldPos.y += 1.2;
          interaction.showSpeechBubble(worldPos, 'Welkom op Noordpool Station! De kachel staat heerlijk warm aan.');
        }
      }
    });
  }

  railwayGroup.add(stationGroup);
  scene.add(railwayGroup);

  return {
    group: railwayGroup,
    railwayCurve,
    crossingCenter,
    stationCenter,
    update(delta, elapsed) {
      // Gentle atmospheric pulsing of lantern & warm window lights
      const flicker = Math.sin(elapsed * 4.5) * 0.12 + Math.cos(elapsed * 8.2) * 0.08;
      windowGlowMat.emissiveIntensity = 2.4 + flicker * 0.4;
      lanternGlass.material.emissiveIntensity = 2.8 + flicker * 0.5;

      // Subtle swinging legs for sitting elf Noor
      const legSwing = Math.sin(elapsed * 2.8) * 0.14;
      if (elfNoor.leftLeg) {
        elfNoor.leftLeg.rotation.x = -Math.PI * 0.45 + legSwing;
      }
      if (elfNoor.rightLeg) {
        elfNoor.rightLeg.rotation.x = -Math.PI * 0.45 - legSwing;
      }

      // Subtle looking down the tracks for standing elf Jasper
      const headTurn = Math.sin(elapsed * 1.4) * 0.12;
      if (elfJasper.head) {
        elfJasper.head.rotation.y = headTurn;
      }

      // Steaming cocoa puff for Pip
      if (cocoaSteamMesh) {
        cocoaSteamMesh.position.y = 0.50 + Math.sin(elapsed * 3.5) * 0.025;
        cocoaSteamMesh.scale.setScalar(0.9 + Math.cos(elapsed * 4.0) * 0.2);
      }
    }
  };
}
