import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, PATH_WAYPOINTS as CONFIG_WAYPOINTS } from '../config.js';
import {
  getGroundHeight,
  fbm2D,
  createSnowBumpTexture
} from '../utils/procedural.js';
import {
  checkLanternCollision,
  LANTERN_CLEARANCE_MARGIN,
  OBSTACLES
} from './obstacles.js';

/**
 * Single source of truth for the scenic path curve:
 * Meanders smoothly from the Elf Village square plaza, past workshop and mailbox,
 * past North Pole to the Great Christmas Tree.
 */
export const PATH_WAYPOINTS = Object.freeze(
  CONFIG_WAYPOINTS.map((p) => new THREE.Vector3(p.x, p.y, p.z))
);

export const pathCurve = new THREE.CatmullRomCurve3(PATH_WAYPOINTS, false, 'centripetal');

export function getPathCurve() {
  return pathCurve;
}

// -----------------------------------------------------------------------------
// Procedural Textures & Glow Cache
// -----------------------------------------------------------------------------

let sharedGroundGlowTexture = null;
export function getGroundGlowTexture() {
  if (sharedGroundGlowTexture) return sharedGroundGlowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.00, 'rgba(255, 145, 20, 0.65)');
  grad.addColorStop(0.25, 'rgba(255, 120, 15, 0.40)');
  grad.addColorStop(0.55, 'rgba(220, 80, 5, 0.15)');
  grad.addColorStop(0.85, 'rgba(180, 50, 0, 0.03)');
  grad.addColorStop(1.00, 'rgba(180, 50, 0, 0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  sharedGroundGlowTexture = new THREE.CanvasTexture(canvas);
  sharedGroundGlowTexture.wrapS = THREE.ClampToEdgeWrapping;
  sharedGroundGlowTexture.wrapT = THREE.ClampToEdgeWrapping;
  return sharedGroundGlowTexture;
}

let sharedStoneNormalMap = null;
function getStoneNormalMap() {
  if (sharedStoneNormalMap) return sharedStoneNormalMap;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Multi-frequency rock grain heightfield
  const heightField = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n1 = Math.sin(u * 52.0) * Math.cos(v * 52.0) * 0.5 + 0.5;
      const n2 = Math.sin((u + v) * 98.0) * Math.sin((u - v) * 98.0) * 0.5 + 0.5;
      const n3 = Math.cos(u * 170.0 + v * 120.0) * 0.5 + 0.5;
      heightField[y * size + x] = n1 * 0.50 + n2 * 0.32 + n3 * 0.18;
    }
  }

  // Sobel filter to create tangent-space normals
  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const dx = (heightField[y * size + xp1] - heightField[y * size + xm1]) * 2.2;
      const dy = (heightField[yp1 * size + x] - heightField[ym1 * size + x]) * 2.2;

      let nx = -dx;
      let ny = -dy;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  sharedStoneNormalMap = new THREE.CanvasTexture(canvas);
  sharedStoneNormalMap.wrapS = THREE.RepeatWrapping;
  sharedStoneNormalMap.wrapT = THREE.RepeatWrapping;
  sharedStoneNormalMap.repeat.set(3, 3);
  return sharedStoneNormalMap;
}

let sharedElfFootprintTexture = null;
function getElfFootprintTexture() {
  if (sharedElfFootprintTexture) return sharedElfFootprintTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size * 0.5, size * 0.5);

  // Outer soft depression shadow ring (slight displacement edge)
  ctx.fillStyle = 'rgba(28, 54, 88, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 17, 21, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(2, -10, 20, 25, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(6, -34, 13, 16, 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Inner deep pressed snow depression (rich shadow-blue tone)
  ctx.fillStyle = 'rgba(18, 38, 68, 0.95)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 13, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(2, -10, 16, 20, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(5, -33, 10, 13, 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Elf boot sole ridges / treads
  ctx.strokeStyle = 'rgba(10, 24, 46, 0.85)';
  ctx.lineWidth = 3.5;
  for (let dy = -22; dy <= 12; dy += 7) {
    ctx.beginPath();
    ctx.moveTo(-11, dy);
    ctx.lineTo(13, dy + 2);
    ctx.stroke();
  }

  ctx.restore();

  sharedElfFootprintTexture = new THREE.CanvasTexture(canvas);
  sharedElfFootprintTexture.wrapS = THREE.ClampToEdgeWrapping;
  sharedElfFootprintTexture.wrapT = THREE.ClampToEdgeWrapping;
  return sharedElfFootprintTexture;
}

// -----------------------------------------------------------------------------
// 1. Natural Boulder & Stepping Stone Geometries (10 unique irregular shapes)
// Created by deforming IcosahedronGeometry with noise and flattening into keien
// Formaat 25–60 cm, willekeurige rotatie, hoge roughness en subtiele normal map.
// -----------------------------------------------------------------------------

function createKeiGeometries() {
  const geos = [];
  const count = 10;

  for (let k = 0; k < count; k++) {
    // Detail level 2 produces 80 faces - smooth rounded natural boulder
    const geo = new THREE.IcosahedronGeometry(0.5, 2);
    const pos = geo.attributes.position;

    let maxRadius = 0.001;
    let maxY = -999;
    let minY = 999;

    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);

      const len = Math.hypot(vx, vy, vz) || 1.0;
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;

      // Unique harmonic frequencies seeded by stone index k
      const n1 = Math.sin(nx * 3.2 + k * 1.7) * Math.cos(nz * 2.8 + k * 2.3);
      const n2 = Math.sin(ny * 3.8 + k * 0.9) * Math.sin((nx + nz) * 2.5);
      const n3 = Math.cos((nx * 1.8 - nz * 1.9) * 2.7 + k * 3.1);
      const n4 = Math.sin(nx * 5.2 + nz * 5.2 + k) * 0.05;
      const disp = 1.0 + (n1 * 0.16 + n2 * 0.12 + n3 * 0.09 + n4);

      // Organic stretch and asymmetry (some stones elongated, some teardrop / kidney)
      const stretchX = 1.0 + Math.sin(k * 2.3) * 0.16;
      const stretchZ = 1.0 + Math.cos(k * 3.1) * 0.16;
      const wedge = 1.0 + nx * Math.sin(k * 1.4) * 0.12;

      vx = nx * 0.5 * disp * stretchX * wedge;
      vz = nz * 0.5 * disp * stretchZ * wedge;
      vy = ny * 0.5 * disp;

      // Flatten along vertical axis Y: flattened river stone / stepping stone
      // Height is ~28-36% of diameter
      const flattenFactor = 0.32 + Math.sin(k * 1.8) * 0.05;
      if (vy > 0) {
        // Natural gentle convex crown on top surface
        vy = vy * flattenFactor * 1.05;
      } else {
        // Flatter bottom so the stone embeds solidly into the snow bed
        vy = vy * flattenFactor * 0.70;
      }

      pos.setXYZ(i, vx, vy, vz);

      const r = Math.hypot(vx, vz);
      if (r > maxRadius) maxRadius = r;
      if (vy > maxY) maxY = vy;
      if (vy < minY) minY = vy;
    }

    // Normalize geometry so horizontal radius in XZ is exactly 0.50 (diameter 1.0 m)
    const normScale = 0.50 / maxRadius;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) * normScale,
        pos.getY(i) * normScale,
        pos.getZ(i) * normScale
      );
    }
    geo.computeVertexNormals();

    geos.push({
      geometry: geo,
      topY: maxY * normScale,
      height: (maxY - minY) * normScale
    });
  }

  return geos;
}

// -----------------------------------------------------------------------------
// 2. Wind-blown Snow Patch Geometry for Stones Half Covered with Snow
// -----------------------------------------------------------------------------

function createSnowCapGeometry() {
  const geo = new THREE.SphereGeometry(0.50, 10, 6, 0, Math.PI * 1.15, 0, Math.PI * 0.48);
  geo.scale(0.96, 0.22, 0.86);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const lump = (Math.sin(vx * 7.5) * Math.cos(vz * 7.5) + 0.5) * 0.025;
    pos.setXYZ(i, vx, Math.max(0.002, vy + lump), vz);
  }
  geo.computeVertexNormals();
  return geo;
}

// -----------------------------------------------------------------------------
// 3. Compacted Trodden Snow Bed (Platgetrapt sneeuwpad, ±1.6 m wide)
// Distinctly darker, compacter, and bluer than untouched fresh snow
// -----------------------------------------------------------------------------

function createTroddenSnowBed(curve) {
  const segments = 160;
  const crossSteps = 8;
  const pathHalfWidth = 0.80; // 1.6 m total width

  const vertexCount = (segments + 1) * (crossSteps + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = [];

  const pt = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();

  let vIdx = 0;

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPointAt(u, pt);
    curve.getTangentAt(u, tangent);
    normal.set(-tangent.z, 0, tangent.x).normalize();

    for (let j = 0; j <= crossSteps; j++) {
      const v = j / crossSteps; // 0 = left edge (-0.8m), 1 = right edge (+0.8m)
      const latFraction = (v - 0.5) * 2.0; // -1 to +1

      // Subtle organic edge undulation (±3 cm)
      const edgeJitter = (Math.sin(u * 24.0 + v * 4.0) * 0.5) * 0.035;
      const latOffset = (latFraction * pathHalfWidth) + edgeJitter;

      const wx = pt.x + normal.x * latOffset;
      const wz = pt.z + normal.z * latOffset;
      const groundY = getGroundHeight(wx, wz);

      // Elevated by +1.4 cm above base ground to comfortably prevent terrain z-fighting,
      // with subtle natural concave packing (-0.4 cm in center)
      const concavity = (1.0 - latFraction * latFraction) * 0.004;
      const wy = groundY + 0.014 - concavity;

      positions[vIdx * 3] = wx;
      positions[vIdx * 3 + 1] = wy;
      positions[vIdx * 3 + 2] = wz;

      uvs[vIdx * 2] = u * 20.0;
      uvs[vIdx * 2 + 1] = v * 2.0;

      vIdx++;
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < crossSteps; j++) {
      const a = i * (crossSteps + 1) + j;
      const b = (i + 1) * (crossSteps + 1) + j;
      const c = (i + 1) * (crossSteps + 1) + (j + 1);
      const d = i * (crossSteps + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Trodden, compacted snow: distinctly darker, compacter, bluish tint
  const troddenMat = new THREE.MeshStandardMaterial({
    color: 0x6e94bc, // Darker, compacter, clearly bluish tone
    emissive: 0x051630,
    emissiveIntensity: 0.35,
    roughness: 0.90, // Dense compacted ice crystals
    metalness: 0.02,
    bumpMap: createSnowBumpTexture(),
    bumpScale: 0.009
  });

  const mesh = new THREE.Mesh(geo, troddenMat);
  mesh.name = 'troddenSnowBed';
  mesh.receiveShadow = true;
  return mesh;
}

// -----------------------------------------------------------------------------
// 4. Soft Piled Snow Berms along Both Edges (Zachte opgehoopte sneeuwrand)
// Rises 4 to 6 cm along the lateral boundary (±0.75 m to ±1.35 m) and tapers into terrain
// -----------------------------------------------------------------------------

function createPiledSnowBerms(curve) {
  const segments = 120;
  const crossSteps = 6;
  const vertexCount = (segments + 1) * (crossSteps + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = [];

  const pt = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();

  let vIdx = 0;

  [1, -1].forEach((sideSign) => {
    const bankStartVIdx = vIdx;

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      curve.getPointAt(u, pt);
      curve.getTangentAt(u, tangent);
      normal.set(-tangent.z, 0, tangent.x).normalize();

      for (let j = 0; j <= crossSteps; j++) {
        const v = j / crossSteps; // 0 = inner path edge (0.75 m), 1 = outer terrain (1.35 m)
        const latDist = 0.75 + v * 0.60;

        const jitter = fbm2D(u * 16.0 + sideSign * 4.0, v * 3.0, 2) * 0.045;
        const totalOffset = (latDist + jitter) * sideSign;

        const wx = pt.x + normal.x * totalOffset;
        const wz = pt.z + normal.z * totalOffset;
        const groundY = getGroundHeight(wx, wz);

        // Mound height profile: soft rounded ridge peaking at ~0.98 m from center
        const moundEnvelope = Math.sin(v * Math.PI);
        const lump = fbm2D(wx * 2.4, wz * 2.4, 2) * 0.014;
        const moundH = moundEnvelope * 0.055 + lump;

        // Inner edge matches trodden path height (+0.014 m), outer edge tapers to ground
        const baseH = THREE.MathUtils.lerp(0.014, 0.002, v);
        const wy = groundY + baseH + Math.max(0.0, moundH);

        positions[vIdx * 3] = wx;
        positions[vIdx * 3 + 1] = wy;
        positions[vIdx * 3 + 2] = wz;

        uvs[vIdx * 2] = u * 15.0;
        uvs[vIdx * 2 + 1] = v;

        vIdx++;
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < crossSteps; j++) {
        const a = bankStartVIdx + i * (crossSteps + 1) + j;
        const b = bankStartVIdx + (i + 1) * (crossSteps + 1) + j;
        const c = bankStartVIdx + (i + 1) * (crossSteps + 1) + (j + 1);
        const d = bankStartVIdx + i * (crossSteps + 1) + (j + 1);

        if (sideSign === 1) {
          indices.push(a, b, d);
          indices.push(b, c, d);
        } else {
          indices.push(a, d, b);
          indices.push(b, d, c);
        }
      }
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const snowMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.26,
    roughness: 0.76,
    metalness: 0.02,
    bumpMap: createSnowBumpTexture(),
    bumpScale: 0.012
  });

  const mesh = new THREE.Mesh(geo, snowMat);
  mesh.name = 'piledSnowBerms';
  mesh.receiveShadow = true;
  return mesh;
}

// -----------------------------------------------------------------------------
// 5. Natural Stepping Stones (Losse natuurlijke verdeling, 2 à 3 keien naast elkaar)
// Formaat 25–60 cm, willekeurige rotatie, grijs / beige-grijs / blauwgrijs,
// steken 2–3 cm boven de sneeuw uit en liggen op getGroundHeight().
// GEEN raster, GEEN honingraat, GEEN zeshoeken, GEEN tegels, GEEN ringen.
// -----------------------------------------------------------------------------

function createNaturalSteppingStones(curve, keiGeos) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'naturalSteppingStonesGroup';

  const stoneMat = new THREE.MeshStandardMaterial({
    roughness: 0.92, // Hoge roughness voor natuursteen
    metalness: 0.02,
    normalMap: getStoneNormalMap(),
    normalScale: new THREE.Vector2(0.40, 0.40)
  });

  // Rich Arctic natural stone color palette (grijs, beige-grijs, blauwgrijs)
  const stonePalette = [
    // Grijs (Neutral granite / weathered fieldstone)
    new THREE.Color(0x8a949d),
    new THREE.Color(0x99a2ab),
    new THREE.Color(0x7a838c),
    new THREE.Color(0x848d95),
    // Beige-grijs (Limestone, sandstone, pale shale)
    new THREE.Color(0xa7a195),
    new THREE.Color(0xb2ac9f),
    new THREE.Color(0x989084),
    new THREE.Color(0xaba598),
    new THREE.Color(0xbdb6a9),
    // Blauwgrijs (Arctic slate, schist, river stone)
    new THREE.Color(0x78899a),
    new THREE.Color(0x8595a5),
    new THREE.Color(0x6a7a8a),
    new THREE.Color(0x90a0b0),
    new THREE.Color(0x748595)
  ];

  const clusters = 56;
  const tempPos = new THREE.Vector3();
  const tempTangent = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();
  const tempEuler = new THREE.Euler();
  const tempQuat = new THREE.Quaternion();
  const tempScale = new THREE.Vector3();
  const tempMat4 = new THREE.Matrix4();

  const keiBuckets = Array.from({ length: keiGeos.length }, () => []);
  const snowCapInstances = [];

  for (let c = 0; c <= clusters; c++) {
    const uBase = c / clusters;
    const uJitter = (Math.sin(c * 3.41) * 0.5) * 0.007;
    const u = Math.max(0.015, Math.min(0.985, uBase + uJitter));

    curve.getPointAt(u, tempPos);
    curve.getTangentAt(u, tempTangent);
    tempNormal.set(-tempTangent.z, 0, tempTangent.x).normalize();

    // Natural stepping stone pattern: loosely 2 or 3 stones side-by-side
    // with irregular spacing and wide snowy joints between them
    const isThree = (c % 5 === 1 || c % 5 === 3);
    const lateralOffsets = isThree
      ? [-0.46, 0.02, 0.44]
      : [-0.34, 0.32];

    for (let col = 0; col < lateralOffsets.length; col++) {
      const baseLat = lateralOffsets[col];

      // Organic lateral and longitudinal jitter
      const latJitter = (Math.sin(c * 2.8 + col * 3.7) * 0.5) * 0.11;
      const tangJitter = (Math.cos(c * 3.2 + col * 2.1) * 0.5) * 0.13;
      const lat = baseLat + latJitter;

      const sx = tempPos.x + tempNormal.x * lat + tempTangent.x * tangJitter;
      const sz = tempPos.z + tempNormal.z * lat + tempTangent.z * tangJitter;

      // Rest on getGroundHeight()
      const groundY = getGroundHeight(sx, sz);

      // Random stone shape from the 10 deformed icosahedron geometries
      const geoIdx = Math.floor(Math.abs(Math.sin(c * 7.1 + col * 13.3) * 1000)) % keiGeos.length;
      const keiMeta = keiGeos[geoIdx];

      // Random natural stone size between 25 cm and 60 cm (diameter 0.25 to 0.60 m)
      const sizeParam = 0.5 + 0.5 * Math.sin(c * 2.7 + col * 4.9);
      const diameter = 0.26 + sizeParam * 0.30; // 0.26 m to 0.56 m
      const scaleXZ = diameter;
      const scaleY = diameter * (0.85 + Math.sin(c * 1.5 + col) * 0.15);

      // Height positioning: top of stone sticks out 2.5 cm (0.025 m) above snow
      // Snow surface is at groundY + 0.014 m
      const snowSurfaceY = groundY + 0.014;
      const topHeightAboveSnow = 0.026; // 2.6 cm (within 2-3 cm requirement)
      const sy = snowSurfaceY + topHeightAboveSnow - (keiMeta.topY * scaleY);

      // Random yaw rotation (0 to 360 degrees) + subtle natural ground tilt
      const rotY = (c * 1.83 + col * 2.47) * Math.PI * 2;
      const tiltX = Math.sin(c * 2.1 + col) * 0.04;
      const tiltZ = Math.cos(c * 1.9 + col) * 0.04;

      // Color from palette + individual subtle shade variation
      const baseCol = stonePalette[(c * 3 + col * 7) % stonePalette.length].clone();
      const colJitter = (Math.sin(c * 5.3 + col * 4.1) * 0.5) * 0.05;
      baseCol.r = Math.min(1.0, Math.max(0.0, baseCol.r + colJitter));
      baseCol.g = Math.min(1.0, Math.max(0.0, baseCol.g + colJitter));
      baseCol.b = Math.min(1.0, Math.max(0.0, baseCol.b + colJitter));

      keiBuckets[geoIdx].push({
        x: sx,
        y: sy,
        z: sz,
        scaleX: scaleXZ,
        scaleY: scaleY,
        scaleZ: scaleXZ,
        rotX: tiltX,
        rotY: rotY,
        rotZ: tiltZ,
        color: baseCol
      });

      // "Sommige stenen zijn half bedekt met sneeuw"
      // Add wind-blown snow patch onto ~38% of the stones
      if ((c * 3 + col) % 3 === 0 || (c + col * 2) % 7 === 0) {
        const snowTopY = snowSurfaceY + topHeightAboveSnow + 0.003;
        const snowScale = diameter * 0.65;
        const snowOffsetDir = rotY + 0.5;
        const snowOffsetX = Math.cos(snowOffsetDir) * (diameter * 0.14);
        const snowOffsetZ = Math.sin(snowOffsetDir) * (diameter * 0.14);

        snowCapInstances.push({
          x: sx + snowOffsetX,
          y: snowTopY,
          z: sz + snowOffsetZ,
          scale: snowScale,
          rotY: rotY + 0.3
        });
      }
    }
  }

  // --- 5B. Rond geplaveid pleintje rond de kerstboom op het dorpsplein ---
  // In dezelfde natuurstenen (30-60 cm, onregelmatig, 2-3 cm boven sneeuw, smalle sneeuwvoegen)
  const plazaCenter = { x: -18.0, z: 8.5 }; // Dorpsplein kerstboom centrum
  const plazaRings = [
    { r: 1.05, count: 11 },
    { r: 1.65, count: 16 },
    { r: 2.25, count: 21 },
    { r: 2.85, count: 27 },
    { r: 3.45, count: 32 },
    { r: 4.05, count: 37 }
  ];

  plazaRings.forEach((ring, ringIdx) => {
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2 + (ringIdx * 0.41);
      const rJitter = (Math.sin(ringIdx * 3.7 + i * 2.1) * 0.5) * 0.08;
      const aJitter = (Math.cos(ringIdx * 2.9 + i * 4.3) * 0.5) * 0.04;
      const rad = ring.r + rJitter;
      const ang = angle + aJitter;

      const sx = plazaCenter.x + Math.cos(ang) * rad;
      const sz = plazaCenter.z + Math.sin(ang) * rad;
      const groundY = getGroundHeight(sx, sz);

      const geoIdx = Math.floor(Math.abs(Math.sin(ringIdx * 11.3 + i * 7.7) * 1000)) % keiGeos.length;
      const keiMeta = keiGeos[geoIdx];

      // Formaat 30-58 cm (diameter 0.30 tot 0.58 m)
      const sizeParam = 0.5 + 0.5 * Math.sin(ringIdx * 3.3 + i * 5.1);
      const diameter = 0.32 + sizeParam * 0.24;
      const scaleXZ = diameter;
      const scaleY = diameter * (0.80 + Math.sin(ringIdx + i) * 0.15);

      const snowSurfaceY = groundY + 0.014;
      const topHeightAboveSnow = 0.026; // 2.6 cm boven sneeuw (2-3 cm)
      const sy = snowSurfaceY + topHeightAboveSnow - (keiMeta.topY * scaleY);

      const rotY = (ringIdx * 2.31 + i * 1.73) * Math.PI * 2;
      const tiltX = Math.sin(ringIdx * 1.5 + i) * 0.03;
      const tiltZ = Math.cos(ringIdx * 1.7 + i) * 0.03;

      const baseCol = stonePalette[(ringIdx * 5 + i * 3) % stonePalette.length].clone();
      const colJitter = (Math.sin(ringIdx * 4.1 + i * 3.2) * 0.5) * 0.05;
      baseCol.r = Math.min(1.0, Math.max(0.0, baseCol.r + colJitter));
      baseCol.g = Math.min(1.0, Math.max(0.0, baseCol.g + colJitter));
      baseCol.b = Math.min(1.0, Math.max(0.0, baseCol.b + colJitter));

      keiBuckets[geoIdx].push({
        x: sx,
        y: sy,
        z: sz,
        scaleX: scaleXZ,
        scaleY: scaleY,
        scaleZ: scaleXZ,
        rotX: tiltX,
        rotY: rotY,
        rotZ: tiltZ,
        color: baseCol
      });

      // Dun sneeuwlaagje op ~33% van de pleinstenen
      if ((ringIdx * 3 + i) % 3 === 0) {
        const snowTopY = snowSurfaceY + topHeightAboveSnow + 0.003;
        const snowScale = diameter * 0.62;
        const snowOffsetDir = rotY + 0.4;
        const snowOffsetX = Math.cos(snowOffsetDir) * (diameter * 0.13);
        const snowOffsetZ = Math.sin(snowOffsetDir) * (diameter * 0.13);

        snowCapInstances.push({
          x: sx + snowOffsetX,
          y: snowTopY,
          z: sz + snowOffsetZ,
          scale: snowScale,
          rotY: rotY + 0.25
        });
      }
    }
  });

  // Create an InstancedMesh for each of the 10 unique kei geometries
  for (let g = 0; g < keiGeos.length; g++) {
    const list = keiBuckets[g];
    if (list.length === 0) continue;

    const instMesh = new THREE.InstancedMesh(keiGeos[g].geometry, stoneMat, list.length);
    instMesh.name = `naturalKeiInstanced_${g}`;
    instMesh.receiveShadow = true;
    instMesh.castShadow = true;

    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      tempPos.set(s.x, s.y, s.z);
      tempEuler.set(s.rotX, s.rotY, s.rotZ);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(s.scaleX, s.scaleY, s.scaleZ);
      tempMat4.compose(tempPos, tempQuat, tempScale);

      instMesh.setMatrixAt(i, tempMat4);
      instMesh.setColorAt(i, s.color);
    }

    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    rootGroup.add(instMesh);
  }

  // Half-covered snow patches on stones
  if (snowCapInstances.length > 0) {
    const snowCapGeo = createSnowCapGeometry();
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: COLORS.SNOW_BASE,
      emissive: COLORS.SNOW_SHADOW_EMISSIVE,
      emissiveIntensity: 0.25,
      roughness: 0.78,
      metalness: 0.02
    });

    const instSnowCaps = new THREE.InstancedMesh(snowCapGeo, snowCapMat, snowCapInstances.length);
    instSnowCaps.name = 'stoneSnowCaps';
    instSnowCaps.receiveShadow = true;

    for (let i = 0; i < snowCapInstances.length; i++) {
      const sc = snowCapInstances[i];
      tempPos.set(sc.x, sc.y, sc.z);
      tempEuler.set(0, sc.rotY, 0);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(sc.scale, sc.scale, sc.scale);
      tempMat4.compose(tempPos, tempQuat, tempScale);
      instSnowCaps.setMatrixAt(i, tempMat4);
    }
    instSnowCaps.instanceMatrix.needsUpdate = true;
    rootGroup.add(instSnowCaps);
  }

  return rootGroup;
}

// -----------------------------------------------------------------------------
// 6. Elf Footprints in the Snow (Hier en daar voetafdrukjes van elfjes)
// Cute small indented boot impressions in the snow beside the stepping stones
// -----------------------------------------------------------------------------

function createElfFootprints(curve) {
  const footprintGeo = new THREE.PlaneGeometry(0.15, 0.21);
  footprintGeo.rotateX(-Math.PI / 2);

  const footprintTex = getElfFootprintTexture();
  const footprintMat = new THREE.MeshBasicMaterial({
    map: footprintTex,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });

  const sequences = [
    { startU: 0.02, count: 9, latBase: -0.40, dir: 1 },  // Leaving elf village
    { startU: 0.12, count: 8, latBase: 0.38, dir: 1 },   // Flowing past village trees
    { startU: 0.24, count: 9, latBase: -0.32, dir: 1 },  // Approaching workshop
    { startU: 0.36, count: 10, latBase: 0.36, dir: 1 },  // Passing front of workshop & Santa
    { startU: 0.48, count: 8, latBase: -0.38, dir: 1 },  // Workshop porch & snowman lane
    { startU: 0.60, count: 9, latBase: 0.34, dir: 1 },   // Passing mailbox
    { startU: 0.74, count: 8, latBase: -0.35, dir: 1 },  // Near North Pole pole
    { startU: 0.86, count: 9, latBase: 0.32, dir: 1 }    // Arriving at Great Christmas Tree
  ];

  const footprints = [];
  const tempPos = new THREE.Vector3();
  const tempTangent = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();

  sequences.forEach((seq) => {
    const strideLength = 0.28; // 28 cm stride
    const strideU = strideLength / 26.8;

    for (let step = 0; step < seq.count; step++) {
      const u = seq.startU + step * strideU * seq.dir;
      if (u < 0.01 || u > 0.99) continue;

      curve.getPointAt(u, tempPos);
      curve.getTangentAt(u, tempTangent);
      tempNormal.set(-tempTangent.z, 0, tempTangent.x).normalize();

      const isLeft = step % 2 === 0;
      const footSpread = isLeft ? -0.10 : 0.10;
      const totalLat = seq.latBase + footSpread;

      const fx = tempPos.x + tempNormal.x * totalLat;
      const fz = tempPos.z + tempNormal.z * totalLat;
      const groundY = getGroundHeight(fx, fz);

      const baseHeading = Math.atan2(tempTangent.x * seq.dir, tempTangent.z * seq.dir);
      const splay = (isLeft ? -0.12 : 0.12);

      footprints.push({
        x: fx,
        y: groundY + 0.016, // Sits cleanly on the trodden snow (+0.014m)
        z: fz,
        rotY: baseHeading + splay,
        scaleX: isLeft ? 1.0 : -1.0
      });
    }
  });

  const instFootprints = new THREE.InstancedMesh(footprintGeo, footprintMat, footprints.length);
  instFootprints.name = 'elfFootprints';
  instFootprints.renderOrder = 3;

  const tempEuler = new THREE.Euler();
  const tempQuat = new THREE.Quaternion();
  const tempScale = new THREE.Vector3();
  const tempMat4 = new THREE.Matrix4();

  for (let i = 0; i < footprints.length; i++) {
    const fp = footprints[i];
    tempPos.set(fp.x, fp.y, fp.z);
    tempEuler.set(0, fp.rotY, 0);
    tempQuat.setFromEuler(tempEuler);
    tempScale.set(fp.scaleX, 1.0, 1.0);
    tempMat4.compose(tempPos, tempQuat, tempScale);
    instFootprints.setMatrixAt(i, tempMat4);
  }

  instFootprints.instanceMatrix.needsUpdate = true;
  return instFootprints;
}

// -----------------------------------------------------------------------------
// 7. Sled Runner Tracks in the Snow (Sleesporen in de sneeuw)
// Twin parallel 3D compressed runner grooves winding along the snow beside stones
// -----------------------------------------------------------------------------

function createSledTracks(curve) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'sledTracksGroup';

  const segments = 140;
  const runnerWidth = 0.055; // 5.5 cm wide runner groove
  const runnerSeparation = 0.42;

  // Groove interior: compressed, glossy icy-blue snow trough
  const grooveMat = new THREE.MeshStandardMaterial({
    color: 0x486e92, // Darker compressed shadow-blue groove
    emissive: 0x031226,
    emissiveIntensity: 0.35,
    roughness: 0.28, // Smooth compressed snow sheen
    metalness: 0.12
  });

  // Runner ridge lips: tiny raised snow bevel on each side where runner compressed snow
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.24,
    roughness: 0.75,
    metalness: 0.02
  });

  [-runnerSeparation * 0.5, runnerSeparation * 0.5].forEach((runnerOffset) => {
    // 1. Indented runner trough
    const troughPositions = new Float32Array((segments + 1) * 2 * 3);
    const troughIndices = [];

    // 2. Twin raised ridge lines (outer and inner rims)
    const ridgePositions = new Float32Array((segments + 1) * 4 * 3);
    const ridgeIndices = [];

    const pt = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (let i = 0; i <= segments; i++) {
      const u = 0.03 + (i / segments) * 0.92;
      curve.getPointAt(u, pt);
      curve.getTangentAt(u, tangent);
      normal.set(-tangent.z, 0, tangent.x).normalize();

      // Corridors weave gently beside the stepping stones
      const corridorLat = 0.28 + Math.sin(u * 14.0) * 0.05 + runnerOffset;

      const cx = pt.x + normal.x * corridorLat;
      const cz = pt.z + normal.z * corridorLat;
      const groundY = getGroundHeight(cx, cz);

      // Indented trough sits at snow level (+0.015 m)
      const lx = cx - normal.x * (runnerWidth * 0.5);
      const lz = cz - normal.z * (runnerWidth * 0.5);
      const rx = cx + normal.x * (runnerWidth * 0.5);
      const rz = cz + normal.z * (runnerWidth * 0.5);

      const grooveY = groundY + 0.015;

      const idxL = i * 2;
      const idxR = i * 2 + 1;

      troughPositions[idxL * 3] = lx;
      troughPositions[idxL * 3 + 1] = grooveY;
      troughPositions[idxL * 3 + 2] = lz;

      troughPositions[idxR * 3] = rx;
      troughPositions[idxR * 3 + 1] = grooveY;
      troughPositions[idxR * 3 + 2] = rz;

      if (i < segments) {
        troughIndices.push(idxL, (i + 1) * 2, (i + 1) * 2 + 1);
        troughIndices.push(idxL, (i + 1) * 2 + 1, idxR);
      }

      // Ridge lips: +0.021 m (6 mm raised edge above snow)
      const lipWidth = 0.018;
      const lipY = groundY + 0.021;
      const rIdx = i * 4;

      // Left lip
      ridgePositions[(rIdx + 0) * 3] = lx - normal.x * lipWidth;
      ridgePositions[(rIdx + 0) * 3 + 1] = groundY + 0.015;
      ridgePositions[(rIdx + 0) * 3 + 2] = lz - normal.z * lipWidth;

      ridgePositions[(rIdx + 1) * 3] = lx;
      ridgePositions[(rIdx + 1) * 3 + 1] = lipY;
      ridgePositions[(rIdx + 1) * 3 + 2] = lz;

      // Right lip
      ridgePositions[(rIdx + 2) * 3] = rx;
      ridgePositions[(rIdx + 2) * 3 + 1] = lipY;
      ridgePositions[(rIdx + 2) * 3 + 2] = rz;

      ridgePositions[(rIdx + 3) * 3] = rx + normal.x * lipWidth;
      ridgePositions[(rIdx + 3) * 3 + 1] = groundY + 0.015;
      ridgePositions[(rIdx + 3) * 3 + 2] = rz + normal.z * lipWidth;

      if (i < segments) {
        const nextR = (i + 1) * 4;
        ridgeIndices.push(rIdx + 0, nextR + 0, nextR + 1);
        ridgeIndices.push(rIdx + 0, nextR + 1, rIdx + 1);
        ridgeIndices.push(rIdx + 2, nextR + 2, nextR + 3);
        ridgeIndices.push(rIdx + 2, nextR + 3, rIdx + 3);
      }
    }

    const troughGeo = new THREE.BufferGeometry();
    troughGeo.setAttribute('position', new THREE.BufferAttribute(troughPositions, 3));
    troughGeo.setIndex(troughIndices);
    troughGeo.computeVertexNormals();

    const troughMesh = new THREE.Mesh(troughGeo, grooveMat);
    troughMesh.receiveShadow = true;
    rootGroup.add(troughMesh);

    const ridgeGeo = new THREE.BufferGeometry();
    ridgeGeo.setAttribute('position', new THREE.BufferAttribute(ridgePositions, 3));
    ridgeGeo.setIndex(ridgeIndices);
    ridgeGeo.computeVertexNormals();

    const ridgeMesh = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridgeMesh.receiveShadow = true;
    rootGroup.add(ridgeMesh);
  });

  return rootGroup;
}

// -----------------------------------------------------------------------------
// 8. Path Lighting Stations (Identieke Zwarte Lantaarnpaaltjes via InstancedMesh)
// Langs het hele pad aan beide kanten om de ±4 m, elk met een zachte, warme gloed op de sneeuw eronder.
// 1 InstancedMesh voor alle paaltjes, 1 InstancedMesh voor alle lampjes.
// -----------------------------------------------------------------------------

// Pre-allocated scratch objects outside update loop to guarantee 0 heap allocations
const scratchPostDummy = new THREE.Object3D();
const scratchLightDummy = new THREE.Object3D();
const scratchLightColor = new THREE.Color();

/**
 * Helper to assign RGB vertex colors to all vertices in a geometry.
 */
function applyVertexColor(geo, r, g, b) {
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Creates the single merged geometry for the black lantern post.
 * Uses exact dimensions and offsets of the original model:
 * base, pole, cage base, cone cap, and snow cap.
 */
function createLanternPostGeometry() {
  const baseGeo = new THREE.CylinderGeometry(0.08, 0.11, 0.10, 8);
  baseGeo.translate(0, 0.05, 0);

  const poleGeo = new THREE.CylinderGeometry(0.024, 0.028, 1.05, 8);
  poleGeo.translate(0, 0.58, 0);

  const cageBaseGeo = new THREE.CylinderGeometry(0.07, 0.045, 0.04, 6);
  cageBaseGeo.translate(0, 1.10, 0);

  const capGeo = new THREE.ConeGeometry(0.11, 0.10, 6);
  capGeo.translate(0, 1.32, 0);

  const snowCapGeo = new THREE.ConeGeometry(0.10, 0.06, 6);
  snowCapGeo.translate(0, 1.35, 0);

  // Dark iron tint for cast iron elements (0x1c242e)
  const ironR = 0x1c / 255;
  const ironG = 0x24 / 255;
  const ironB = 0x2e / 255;
  applyVertexColor(baseGeo, ironR, ironG, ironB);
  applyVertexColor(poleGeo, ironR, ironG, ironB);
  applyVertexColor(cageBaseGeo, ironR, ironG, ironB);
  applyVertexColor(capGeo, ironR, ironG, ironB);

  // Snow white tint for the snowy top cap
  const snowR = 0xf4 / 255;
  const snowG = 0xf9 / 255;
  const snowB = 1.0;
  applyVertexColor(snowCapGeo, snowR, snowG, snowB);

  const merged = mergeGeometries([baseGeo, poleGeo, cageBaseGeo, capGeo, snowCapGeo], false);
  baseGeo.dispose();
  poleGeo.dispose();
  cageBaseGeo.dispose();
  capGeo.dispose();
  snowCapGeo.dispose();

  return merged;
}

export function createPathLights(curve) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'pathLightsGroup';

  const stationCount = 8;
  const glowPlanes = [];
  const lightData = [];
  const lightStations = [];

  const pt = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();

  function computeLanternCandidate(u, side, s) {
    curve.getPointAt(u, pt);
    curve.getTangentAt(u, tangent);
    normal.set(-tangent.z, 0, tangent.x).normalize();
    const offsetDist = 1.15 + (Math.sin(s * 4.3 + side * 2.1) * 0.5) * 0.10;
    return {
      x: pt.x + normal.x * (offsetDist * side),
      z: pt.z + normal.z * (offsetDist * side),
      u,
      side,
      s
    };
  }

  // Pre-calculate valid lantern positions along the path, checking against ALL obstacles in obstacles.js
  // with a safety margin of at least 0.80 m (LANTERN_CLEARANCE_MARGIN).
  // If an obstacle is within margin, slide along the path to the next free position or omit.
  const validLanterns = [];
  const placedBySide = { '-1': [], '1': [] };
  const minSpacingSameSide = 2.2; // Keep spacing along each side regular

  for (let s = 0; s < stationCount; s++) {
    // Distributed every ±4m along the path (u between 0.07 and 0.93)
    const targetU = 0.07 + (s / (stationCount - 1)) * 0.86;

    // Both sides: Links (side = -1) and Rechts (side = 1)
    [-1, 1].forEach((side) => {
      const orig = computeLanternCandidate(targetU, side, s);
      const initialCol = checkLanternCollision(orig.x, orig.z, LANTERN_CLEARANCE_MARGIN);

      let chosen = null;

      if (!initialCol.collides) {
        // Target position is free: verify spacing with previous lantern on this side
        const prev = placedBySide[side][placedBySide[side].length - 1];
        if (!prev || Math.hypot(orig.x - prev.x, orig.z - prev.z) >= minSpacingSameSide) {
          chosen = orig;
        }
      }

      if (!chosen) {
        // Collides with an obstacle within the margin or too crowded:
        // Search along the path for the nearest free position (stepping outward by du)
        const stepCount = 32; // Search window of ±0.064 u (~1.8m)
        for (let step = 1; step <= stepCount; step++) {
          const du = step * 0.002;
          // Test both directions: forward (+dir) and backward (-dir)
          for (const dir of [1, -1]) {
            const testU = targetU + du * dir;
            if (testU < 0.05 || testU > 0.95) continue;

            const candidate = computeLanternCandidate(testU, side, s);
            const col = checkLanternCollision(candidate.x, candidate.z, LANTERN_CLEARANCE_MARGIN);
            if (!col.collides) {
              // Ensure regular distance to previous lantern on the same side
              const prev = placedBySide[side][placedBySide[side].length - 1];
              if (prev && Math.hypot(candidate.x - prev.x, candidate.z - prev.z) < minSpacingSameSide) {
                continue;
              }
              chosen = candidate;
              break;
            }
          }
          if (chosen) break;
        }
      }

      if (chosen) {
        validLanterns.push(chosen);
        placedBySide[side].push(chosen);
      } else {
        console.log(`[Lantaarnpaaltje] Station ${s} (kant ${side === -1 ? 'Links' : 'Rechts'}) weggelaten wegens obstakelvrije zone.`);
      }
    });
  }

  const totalLights = validLanterns.length;

  const postMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.65,
    metalness: 0.85
  });

  const lanternPostGeo = createLanternPostGeometry();
  const instPosts = new THREE.InstancedMesh(lanternPostGeo, postMat, totalLights);
  instPosts.name = 'instancedLanternPosts';
  instPosts.castShadow = true;
  instPosts.receiveShadow = false;

  const glassGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.16, 6);
  const warmGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    toneMapped: false
  });
  const instLights = new THREE.InstancedMesh(glassGeo, warmGlowMat, totalLights);
  instLights.name = 'instancedLanternLights';

  const glowTex = getGroundGlowTexture();
  const groundGlowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });

  const glowGeo = new THREE.PlaneGeometry(2.4, 2.4);
  glowGeo.rotateX(-Math.PI / 2);

  for (let idx = 0; idx < totalLights; idx++) {
    const l = validLanterns[idx];
    const posX = l.x;
    const posZ = l.z;
    const groundY = getGroundHeight(posX, posZ);

    // 1. Post transform
    scratchPostDummy.position.set(posX, groundY, posZ);
    scratchPostDummy.rotation.set(0, 0, 0);
    scratchPostDummy.scale.set(1, 1, 1);
    scratchPostDummy.updateMatrix();
    instPosts.setMatrixAt(idx, scratchPostDummy.matrix);

    // 2. Light instance transform (glass core op y = 1.20)
    scratchLightDummy.position.set(posX, groundY + 1.20, posZ);
    scratchLightDummy.rotation.set(0, 0, 0);
    scratchLightDummy.scale.set(1, 1, 1);
    scratchLightDummy.updateMatrix();
    instLights.setMatrixAt(idx, scratchLightDummy.matrix);
    scratchLightColor.setHex(0xffaa33);
    instLights.setColorAt(idx, scratchLightColor);

    // 3. Warme gloed op de sneeuw onder de lantaarn
    const glowMesh = new THREE.Mesh(glowGeo, groundGlowMat.clone());
    glowMesh.position.set(posX, groundY + 0.016, posZ);
    glowMesh.renderOrder = 2;
    rootGroup.add(glowMesh);
    glowPlanes.push(glowMesh);

    const phase = idx * 1.5;
    lightData.push({
      x: posX,
      y: groundY + 1.20,
      z: posZ,
      phase
    });

    lightStations.push({ x: posX, z: posZ, type: 0, u: l.u, side: l.side });
  }

  instPosts.instanceMatrix.needsUpdate = true;
  instLights.instanceMatrix.needsUpdate = true;
  if (instLights.instanceColor) {
    instLights.instanceColor.needsUpdate = true;
  }

  rootGroup.add(instPosts);
  rootGroup.add(instLights);

  return {
    group: rootGroup,
    lightStations,
    instPosts,
    instLights,
    glowPlanes,
    update(delta, elapsed) {
      for (let i = 0; i < totalLights; i++) {
        const ld = lightData[i];
        const phase = ld.phase;

        // Organische meervoudige harmonische golf met eigen fase per lampje
        const wave = Math.sin(elapsed * 7.5 + phase) * 0.65 + Math.sin(elapsed * 13.2 + phase * 2.1) * 0.35;
        const scaleY = 0.96 + wave * 0.06;
        const scaleXZ = 0.97 + Math.cos(elapsed * 6.2 + phase * 1.3) * 0.04;

        scratchLightDummy.position.set(ld.x, ld.y, ld.z);
        scratchLightDummy.rotation.set(0, 0, 0);
        scratchLightDummy.scale.set(scaleXZ, scaleY, scaleXZ);
        scratchLightDummy.updateMatrix();
        instLights.setMatrixAt(i, scratchLightDummy.matrix);

        const brightness = 0.92 + wave * 0.16;
        scratchLightColor.setHex(0xffaa33).multiplyScalar(brightness);
        instLights.setColorAt(i, scratchLightColor);

        if (glowPlanes[i]) {
          glowPlanes[i].material.opacity = 0.68 + wave * 0.08;
        }
      }
      instLights.instanceMatrix.needsUpdate = true;
      if (instLights.instanceColor) {
        instLights.instanceColor.needsUpdate = true;
      }
    }
  };
}

// -----------------------------------------------------------------------------
// Master Path Creator
// Rebuilds the entire path system:
// - Removes all old stones, tiles, rings, hexagons, and black wires
// - Preserves shared pathCurve for elves
// - Flat ground on getGroundHeight()
// - Compacted trodden snow trail ±1.6 m wide (darker, bluer, compacted)
// - Soft piled snow berms along both edges
// - 10 unique deformed icosahedron natural stepping stones (25-60 cm)
// - Loose, organic 2-3 stones distribution with snow in joints
// - Stones protruding 2-3 cm above snow, resting on getGroundHeight()
// - Stones partially covered with snow drifts
// - Round paved plaza around the village Christmas tree in the same natural stones
// - Path lights: identical black lantern posts via InstancedMesh every ±4m on both sides with soft warm glow
// - Elf footprints and sled tracks alongside the stones
// -----------------------------------------------------------------------------

export function createPath(scene) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'snowyPathSystem';

  // 1. Trodden compacted snow bed (±1.6 m wide, darker/bluer/compacted)
  const troddenSnowBed = createTroddenSnowBed(pathCurve);
  rootGroup.add(troddenSnowBed);

  // 2. Soft piled snow berms along both sides (zachte opgehoopte sneeuwrand)
  const snowBerms = createPiledSnowBerms(pathCurve);
  rootGroup.add(snowBerms);

  // 3. Natural stepping stones (10 unique deformed icosahedrons, loose 2-3 stone clusters + dorpspleintje)
  const keiGeos = createKeiGeometries();
  const naturalStones = createNaturalSteppingStones(pathCurve, keiGeos);
  rootGroup.add(naturalStones);

  // 4. Elf footprints in the snow beside the stones
  const elfFootprints = createElfFootprints(pathCurve);
  rootGroup.add(elfFootprints);

  // 5. Twin sled runner tracks in the snow
  const sledTracks = createSledTracks(pathCurve);
  rootGroup.add(sledTracks);

  // 6. Path lights (identieke zwarte lantaarnpaaltjes via InstancedMesh om de ±4 m aan beide kanten)
  const pathLights = createPathLights(pathCurve);
  rootGroup.add(pathLights.group);

  scene.add(rootGroup);

  return {
    group: rootGroup,
    pathCurve,
    troddenSnowBed,
    snowBerms,
    naturalStones,
    elfFootprints,
    sledTracks,
    pathLights,
    update(delta, elapsed) {
      if (pathLights && pathLights.update) {
        pathLights.update(delta, elapsed);
      }
    }
  };
}
