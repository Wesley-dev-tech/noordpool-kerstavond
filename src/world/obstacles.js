import * as THREE from 'three';
import { COORDS } from '../config.js';
import { getTerrainHeight } from '../utils/procedural.js';

/**
 * Radius allocated for a single elf actor (~1 m tall, ~0.7 m wide).
 */
export const ELF_RADIUS = 0.36;

/**
 * Exact world-space anchor coordinates for Santa Claus and Mrs. Claus matching santa-couple.js
 * Workshop at (-10, -7, rotY: 0.42), Snowman at (-5, -3.2) => Couple anchor at (-10.51, -0.74, rotY: 0.58).
 * Santa: local (-0.38, 0) => world (-10.826, -0.532)
 * Mrs. Claus: local (+0.38, +0.02) => world (-10.179, -0.932)
 */
export const SANTA_WORLD_COORDS = Object.freeze({
  santa: { x: -10.826, z: -0.532 },
  mrsClaus: { x: -10.179, z: -0.932 }
});

/**
 * Central registry of all physical obstacles in the North Pole world.
 * Each obstacle has a unique ID, human-readable name, category, center (x, z), and collision radius (in meters).
 */
export const OBSTACLES = [
  // 1. Santa Claus & Mrs. Claus (Kerstman & Kerstvrouw)
  {
    id: 'santa',
    name: 'Kerstman',
    category: 'character',
    x: SANTA_WORLD_COORDS.santa.x,
    z: SANTA_WORLD_COORDS.santa.z,
    radius: 0.60
  },
  {
    id: 'mrsClaus',
    name: 'Kerstvrouw',
    category: 'character',
    x: SANTA_WORLD_COORDS.mrsClaus.x,
    z: SANTA_WORLD_COORDS.mrsClaus.z,
    radius: 0.55
  },

  // 2. Snowmen (Sneeuwpoppen)
  {
    id: 'snowmanWorkshop',
    name: 'Sneeuwpop bij Werkplaats',
    category: 'prop',
    x: COORDS.snowman.x,
    z: COORDS.snowman.z,
    radius: 0.80
  },
  {
    id: 'snowmanVillage',
    name: 'Sneeuwpop Elfendorp',
    category: 'prop',
    x: -23.5,
    z: 7.2,
    radius: 0.80
  },

  // 3. Elf Cottages (Huisjes in Elf Village)
  {
    id: 'elfHouse_1',
    name: 'Elfenhuisje 1 — Speelgoedmakerij',
    category: 'building',
    x: -7.8,
    z: 15.6,
    radius: 2.20
  },
  {
    id: 'elfHouse_2',
    name: 'Elfenhuisje 2 — Peperkoekbakkerij',
    category: 'building',
    x: -13.6,
    z: 24.2,
    radius: 2.30
  },
  {
    id: 'elfHouse_3',
    name: 'Elfenhuisje 3 — Elfenposthuisje',
    category: 'building',
    x: -23.4,
    z: 23.8,
    radius: 2.05
  },
  {
    id: 'elfHouse_4',
    name: 'Elfenhuisje 4 — Klokkenmakerij',
    category: 'building',
    x: -31.2,
    z: 17.6,
    radius: 2.15
  },
  {
    id: 'elfHouse_5',
    name: 'Elfenhuisje 5 — Snoep- & Zuurstokhuisje',
    category: 'building',
    x: -33.5,
    z: 7.8,
    radius: 2.25
  },
  {
    id: 'elfHouse_6',
    name: 'Elfenhuisje 6 — Verhalen- & Boekenhuisje',
    category: 'building',
    x: -27.2,
    z: -0.8,
    radius: 2.10
  },

  // 4. Workshop & Woodpile (Werkplaats & Houtstapel)
  {
    id: 'workshopMain',
    name: 'Kerstmans Werkplaats (Centrum)',
    category: 'building',
    x: COORDS.workshop.x,
    z: COORDS.workshop.z,
    radius: 3.20
  },
  {
    id: 'workshopLeft',
    name: 'Werkplaats (Linkervleugel)',
    category: 'building',
    x: -12.0,
    z: -6.1,
    radius: 2.30
  },
  {
    id: 'workshopRight',
    name: 'Werkplaats (Rechtervleugel)',
    category: 'building',
    x: -8.0,
    z: -7.9,
    radius: 2.30
  },
  {
    id: 'woodpile',
    name: 'Houtstapel bij Werkplaats',
    category: 'prop',
    x: COORDS.woodpile.x,
    z: COORDS.woodpile.z,
    radius: 1.20
  },

  // 5. Hero Trees & Pines (Bomen)
  {
    id: 'mainChristmasTree',
    name: 'Grote Kerstboom',
    category: 'tree',
    x: COORDS.mainChristmasTree.x,
    z: COORDS.mainChristmasTree.z,
    radius: 1.80
  },
  {
    id: 'secondChristmasTree',
    name: 'Kerstboom bij Werkplaats',
    category: 'tree',
    x: COORDS.secondChristmasTree.x,
    z: COORDS.secondChristmasTree.z,
    radius: 1.60
  },
  {
    id: 'villageMiniTree',
    name: 'Mini-kerstboom op Dorpsplein (Centrum)',
    category: 'tree',
    x: -18.0,
    z: 8.5,
    radius: 1.10
  },
  // 5 Versierde Kerstbomen aan de rand van het Elfenplein
  {
    id: 'villageTree_1',
    name: 'Elfenplein-kerstboom 1 (Goud & Warm Wit)',
    category: 'tree',
    x: -14.60,
    z: 11.80,
    radius: 0.95
  },
  {
    id: 'villageTree_2',
    name: 'Elfenplein-kerstboom 2 (Zuurstok & Rood)',
    category: 'tree',
    x: -21.80,
    z: 16.40,
    radius: 1.05
  },
  {
    id: 'villageTree_3',
    name: 'Elfenplein-kerstboom 3 (Meerkleurig & Zilver)',
    category: 'tree',
    x: -26.60,
    z: 9.00,
    radius: 0.90
  },
  {
    id: 'villageTree_4',
    name: 'Elfenplein-kerstboom 4 (Blauw, Zilver & IJspegels)',
    category: 'tree',
    x: -22.80,
    z: 1.60,
    radius: 1.00
  },
  {
    id: 'villageTree_5',
    name: 'Elfenplein-kerstboom 5 (Elfenboom: Cadeautjes & Snoep)',
    category: 'tree',
    x: -14.50,
    z: 2.50,
    radius: 0.95
  },
  // Lit Pines
  { id: 'litPine_1', name: 'Verlichte Den 1', category: 'tree', x: 7.5, z: -8.5, radius: 1.40 },
  { id: 'litPine_2', name: 'Verlichte Den 2', category: 'tree', x: -17.0, z: -3.5, radius: 1.50 },
  { id: 'litPine_3', name: 'Verlichte Den 3', category: 'tree', x: 11.5, z: -3.8, radius: 1.30 },
  { id: 'litPine_4', name: 'Verlichte Den 4', category: 'tree', x: -2.5, z: -13.5, radius: 1.50 },
  // Forest Pines
  { id: 'forestPine_1', name: 'Bosden 1', category: 'tree', x: -17.0, z: -11.0, radius: 1.50 },
  { id: 'forestPine_2', name: 'Bosden 2', category: 'tree', x: -11.0, z: -16.0, radius: 1.60 },
  { id: 'forestPine_3', name: 'Bosden 3', category: 'tree', x: 4.0, z: -17.0, radius: 1.40 },
  { id: 'forestPine_4', name: 'Bosden 4', category: 'tree', x: 14.0, z: -12.0, radius: 1.50 },
  { id: 'forestPine_5', name: 'Bosden 5', category: 'tree', x: 17.0, z: 3.0, radius: 1.30 },
  { id: 'forestPine_6', name: 'Bosden 6', category: 'tree', x: -37.0, z: 21.0, radius: 1.50 },

  // 6. Postbus (Mailbox)
  {
    id: 'mailbox',
    name: 'Noordpool Postbus',
    category: 'prop',
    x: -3.1,
    z: -1.75,
    radius: 0.90
  },

  // 7. Noordpoolpaal (North Pole)
  {
    id: 'northPole',
    name: 'Noordpoolpaal (90° N)',
    category: 'landmark',
    x: COORDS.northPole.x,
    z: COORDS.northPole.z,
    radius: 1.30
  },

  // 8. Cadeaus (Gift Clusters)
  { id: 'giftNorthPole_1', name: 'Cadeau Noordpool 1', category: 'gift', x: 0.85, z: 0.55, radius: 0.65 },
  { id: 'giftNorthPole_2', name: 'Cadeau Noordpool 2', category: 'gift', x: -0.75, z: 0.70, radius: 0.60 },
  { id: 'giftTree_1', name: 'Cadeau Kerstboom 1', category: 'gift', x: 3.6, z: -2.6, radius: 0.70 },
  { id: 'giftTree_2', name: 'Cadeau Kerstboom 2', category: 'gift', x: 5.1, z: -2.8, radius: 0.65 },
  { id: 'giftTree_3', name: 'Cadeau Kerstboom 3', category: 'gift', x: 4.3, z: -2.2, radius: 0.60 },

  // 9. Bevroren Ijsmeer (Ice Lake)
  {
    id: 'iceLake',
    name: 'Bevroren Noordpoolmeer',
    category: 'landmark',
    x: COORDS.iceLake.x,
    z: COORDS.iceLake.z,
    radius: 5.80
  },

  // 10. Village Square Props, Interactive Stalls & Stationary Elves
  {
    id: 'villageLantern',
    name: 'Dorpslantaarnpaal',
    category: 'prop',
    x: -11.5,
    z: 9.8,
    radius: 0.60
  },
  {
    id: 'villageBench',
    name: 'Dorpsbank (aan rand plein, buiten sleeroute)',
    category: 'prop',
    x: -21.8,
    z: 6.3,
    radius: 0.85
  },
  {
    id: 'chocoStall',
    name: 'Chocomelkkraam',
    category: 'building',
    x: -14.2,
    z: 16.0,
    radius: 1.25
  },
  {
    id: 'woodchopperBlock',
    name: 'Houthakblok & Houtstapel',
    category: 'prop',
    x: -9.8,
    z: 14.2,
    radius: 0.85
  },
  {
    id: 'cottageLadder',
    name: 'Ladder bij Huisje',
    category: 'prop',
    x: -13.12,
    z: 22.27,
    radius: 0.60
  },
  {
    id: 'snowWall1',
    name: 'Sneeuwmuurtje 1 (Sneeuwballengevecht)',
    category: 'prop',
    x: -22.67,
    z: 10.99,
    radius: 0.65
  },
  {
    id: 'snowWall2',
    name: 'Sneeuwmuurtje 2 (Sneeuwballengevecht)',
    category: 'prop',
    x: -17.83,
    z: 15.41,
    radius: 0.65
  },
  // Elves with collision footprints
  {
    id: 'elfBarnaby',
    name: 'Elfje Barnaby (Dansende boomkring)',
    category: 'character',
    x: -15.9,
    z: 8.5,
    radius: 0.45
  },
  {
    id: 'elfHolly',
    name: 'Elfje Holly (Dansende boomkring)',
    category: 'character',
    x: -18.0,
    z: 10.6,
    radius: 0.45
  },
  {
    id: 'elfFinley',
    name: 'Elfje Finley (Dansende boomkring)',
    category: 'character',
    x: -20.1,
    z: 8.5,
    radius: 0.45
  },
  {
    id: 'elfIvy',
    name: 'Elfje Ivy (Dansende boomkring)',
    category: 'character',
    x: -18.0,
    z: 6.4,
    radius: 0.45
  },
  {
    id: 'elfWoodcutter',
    name: 'Elfje Bram (Houthakker)',
    category: 'character',
    x: -9.8,
    z: 15.0,
    radius: 0.45
  },
  {
    id: 'elfLadder',
    name: 'Elfje Jingle (Ladderdecorateur)',
    category: 'character',
    x: -13.12,
    z: 22.23,
    radius: 0.45
  },
  {
    id: 'elfBarista',
    name: 'Elfje Coco (Chocomelk Barista)',
    category: 'character',
    x: -14.2,
    z: 16.55,
    radius: 0.45
  },
  {
    id: 'elfChocoCustomer',
    name: 'Elfje Pip (Wachtend bij Chocomelkkraam)',
    category: 'character',
    x: -14.2,
    z: 15.10,
    radius: 0.45
  },
  {
    id: 'elfBramble',
    name: 'Elfje Bramble (Sneeuwballenwerper)',
    category: 'character',
    x: -23.2,
    z: 10.5,
    radius: 0.45
  },
  {
    id: 'elfNoel',
    name: 'Elfje Noel (Sneeuwballenwerper)',
    category: 'character',
    x: -17.3,
    z: 15.9,
    radius: 0.45
  }
];

/**
 * Returns all registered obstacles.
 */
export function getObstacles() {
  return OBSTACLES;
}

/**
 * Registers one or more new obstacles into the obstacle registry.
 */
export function registerObstacle(obs) {
  if (Array.isArray(obs)) {
    for (const o of obs) {
      if (!OBSTACLES.some((existing) => existing.id === o.id)) {
        OBSTACLES.push(o);
      }
    }
  } else if (obs && !OBSTACLES.some((existing) => existing.id === obs.id)) {
    OBSTACLES.push(obs);
  }
}

/**
 * Returns macro scene obstacles for tree and layout placement validation.
 */
export function getSceneObstacles() {
  return [
    { id: 'northPole', x: 0, z: 0, radius: 2.5 },
    { id: 'workshop', x: -10, z: -7, radius: 5.6 },
    { id: 'elfVillageSquare', x: -18.0, z: 8.5, radius: 8.0 },
    { id: 'elfHouse_1', x: -7.8, z: 15.6, radius: 2.3 },
    { id: 'elfHouse_2', x: -13.6, z: 24.2, radius: 2.4 },
    { id: 'elfHouse_3', x: -23.4, z: 23.8, radius: 2.1 },
    { id: 'elfHouse_4', x: -31.2, z: 17.6, radius: 2.2 },
    { id: 'elfHouse_5', x: -33.5, z: 7.8, radius: 2.3 },
    { id: 'elfHouse_6', x: -27.2, z: -0.8, radius: 2.2 },
    { id: 'mainChristmasTree', x: 4.5, z: -3.5, radius: 2.5 },
    { id: 'secondChristmasTree', x: -4.8, z: -9.2, radius: 2.2 },
    { id: 'iceLake', x: 8.5, z: 4.5, radius: 6.8 },
    { id: 'santaCouple', x: -10.51, z: -0.74, radius: 1.8 },
    { id: 'mailbox', x: -3.1, z: -1.75, radius: 0.90 }
  ];
}

/**
 * Required minimum clearance margin for lantern posts against any obstacle (in meters).
 */
export const LANTERN_CLEARANCE_MARGIN = 0.80;

/**
 * Checks if a candidate lantern position (x, z) collides or violates the clearance margin
 * against ANY registered obstacle in OBSTACLES (including Santa, Mrs. Claus, snowmen,
 * mailbox, north pole, gifts, trees, and cottages).
 *
 * @param {number} x World X coordinate
 * @param {number} z World Z coordinate
 * @param {number} margin Minimum clearance margin (defaults to 0.80 m)
 * @returns {{ collides: boolean, obstacle: object|null, dist?: number, minDist?: number, overlap?: number }}
 */
export function checkLanternCollision(x, z, margin = LANTERN_CLEARANCE_MARGIN) {
  for (let i = 0; i < OBSTACLES.length; i++) {
    const obs = OBSTACLES[i];
    const dx = x - obs.x;
    const dz = z - obs.z;
    const distSq = dx * dx + dz * dz;
    const minDist = obs.radius + margin;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      return {
        collides: true,
        obstacle: obs,
        dist,
        minDist,
        overlap: minDist - dist
      };
    }
  }
  return { collides: false, obstacle: null };
}

/**
 * Checks if a circular object at (x, z) with radius overlaps with any existing obstacles.
 */
export function checkOverlap(x, z, radius, obstacles) {
  for (const obs of obstacles) {
    const dist = Math.hypot(x - obs.x, z - obs.z);
    const minDist = radius + obs.radius;
    if (dist < minDist) {
      return { collides: true, obstacle: obs, dist, minDist };
    }
  }
  return { collides: false };
}

/**
 * Adds an obstacle dynamically if required.
 */
export function addObstacle(obstacle) {
  OBSTACLES.push(obstacle);
}

/**
 * Checks if a point (x, z) with given radius collides with any registered obstacle.
 */
export function checkCollision(x, z, radius, extraMargin = 0) {
  for (let i = 0; i < OBSTACLES.length; i++) {
    const obs = OBSTACLES[i];
    const dx = x - obs.x;
    const dz = z - obs.z;
    const distSq = dx * dx + dz * dz;
    const minDist = radius + obs.radius + extraMargin;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      return {
        collides: true,
        obstacle: obs,
        dist,
        minDist,
        overlap: minDist - dist,
        normalX: dist > 0.0001 ? dx / dist : 1,
        normalZ: dist > 0.0001 ? dz / dist : 0
      };
    }
  }
  return { collides: false, obstacle: null };
}

/**
 * Calculates a smooth Reynolds-style steering avoidance force vector (steerX, steerZ)
 * for an elf at position (x, z) moving with intention.
 * Applies a smooth repulsive field that grows stronger as the elf approaches the obstacle threshold.
 */
export function calculateAvoidanceSteering(x, z, moveDirX, moveDirZ, elfRadius = ELF_RADIUS, safetyMargin = 0.42) {
  let steerX = 0;
  let steerZ = 0;

  for (let i = 0; i < OBSTACLES.length; i++) {
    const obs = OBSTACLES[i];
    const dx = x - obs.x;
    const dz = z - obs.z;
    const distSq = dx * dx + dz * dz;
    const threshold = obs.radius + elfRadius + safetyMargin;

    if (distSq < threshold * threshold && distSq > 0.00001) {
      const dist = Math.sqrt(distSq);
      const overlap = threshold - dist;
      const factor = (overlap / threshold);

      // Repulsion direction pointing away from obstacle center
      const nx = dx / dist;
      const nz = dz / dist;

      // Add a slight tangential deflection if the elf is heading directly into the obstacle
      const dot = nx * moveDirX + nz * moveDirZ;
      const tanX = -nz * (dot < 0 ? 0.35 : 0);
      const tanZ = nx * (dot < 0 ? 0.35 : 0);

      steerX += (nx + tanX) * factor * 1.85;
      steerZ += (nz + tanZ) * factor * 1.85;
    }
  }

  return { x: steerX, z: steerZ };
}

/**
 * Calculates mutual steering avoidance between two walking elves.
 * Repels them smoothly from each other and adds a slight lateral right-hand passing bias.
 */
export function calculateElfAvoidance(elfA, elfB, elfRadius = ELF_RADIUS, margin = 0.55) {
  const dx = elfA.x - elfB.x;
  const dz = elfA.z - elfB.z;
  const distSq = dx * dx + dz * dz;
  const threshold = 2 * elfRadius + margin;

  if (distSq < threshold * threshold && distSq > 0.00001) {
    const dist = Math.sqrt(distSq);
    const overlap = threshold - dist;
    const factor = overlap / threshold;

    const nx = dx / dist;
    const nz = dz / dist;

    // Perpendicular vector for polite pedestrian passing (side-stepping)
    const perpX = -nz * 0.45;
    const perpZ = nx * 0.45;

    return {
      steerA: { x: (nx + perpX) * factor * 1.6, z: (nz + perpZ) * factor * 1.6 },
      steerB: { x: (-nx - perpX) * factor * 1.6, z: (-nz - perpZ) * factor * 1.6 }
    };
  }

  return {
    steerA: { x: 0, z: 0 },
    steerB: { x: 0, z: 0 }
  };
}

/**
 * Hard constraint resolution that guarantees zero clipping into obstacles.
 * If position (x, z) penetrates an obstacle boundary, it smoothly pushes it out along the normal.
 */
export function resolveCollision(x, z, elfRadius = ELF_RADIUS, minBuffer = 0.04) {
  let resX = x;
  let resZ = z;

  for (let i = 0; i < OBSTACLES.length; i++) {
    const obs = OBSTACLES[i];
    const dx = resX - obs.x;
    const dz = resZ - obs.z;
    const distSq = dx * dx + dz * dz;
    const minDist = obs.radius + elfRadius + minBuffer;

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

/**
 * Resolves hard mutual penetration between two elves.
 */
export function resolveElfOverlap(posA, posB, elfRadius = ELF_RADIUS, minBuffer = 0.05) {
  const dx = posA.x - posB.x;
  const dz = posA.z - posB.z;
  const distSq = dx * dx + dz * dz;
  const minDist = 2 * elfRadius + minBuffer;

  if (distSq < minDist * minDist) {
    const dist = Math.sqrt(distSq);
    const push = (minDist - dist) * 0.5;
    if (dist > 0.0001) {
      const nx = dx / dist;
      const nz = dz / dist;
      posA.x += nx * push;
      posA.z += nz * push;
      posB.x -= nx * push;
      posB.z -= nz * push;
    } else {
      posA.x += push;
      posB.x -= push;
    }
  }
}

/**
 * Builds a terrain-conforming 3D red ribbon ring mesh for an obstacle circle.
 * Generates quads that follow the terrain height (y = getTerrainHeight + 0.038) so rings lie flush on snow.
 */
function createTerrainRingGeometry(cx, cz, radius, thickness = 0.08, segments = 44) {
  const innerR = Math.max(0.05, radius - thickness * 0.5);
  const outerR = radius + thickness * 0.5;

  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const inX = cx + c * innerR;
    const inZ = cz + s * innerR;
    const inY = getTerrainHeight(inX, inZ) + 0.038;

    const outX = cx + c * outerR;
    const outZ = cz + s * outerR;
    const outY = getTerrainHeight(outX, outZ) + 0.038;

    positions.push(inX, inY, inZ);
    positions.push(outX, outY, outZ);
  }

  for (let i = 0; i < segments; i++) {
    const base = i * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates and manages the Debug Visualizer for obstacles and elf collision bounds.
 * Pressing 'D' toggles red obstacle rings on the ground and green collision rings under moving elves.
 */
export function createObstacleDebugger(scene, getWalkingElves = null) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'obstacleDebugGroup';
  rootGroup.visible = false;

  // Vivid emissive red material for obstacle boundary rings
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff1744,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });

  // Build red rings for all registered obstacles
  OBSTACLES.forEach((obs) => {
    const ringGeo = createTerrainRingGeometry(obs.x, obs.z, obs.radius, 0.09, 44);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.name = `debugRing_${obs.id}`;
    rootGroup.add(ringMesh);
  });

  // Dynamic green/turquoise collision rings for moving elves
  const elfRingMat = new THREE.MeshBasicMaterial({
    color: 0x00e676,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  });

  const elfRingMeshes = [];
  for (let i = 0; i < 2; i++) {
    const geo = new THREE.RingGeometry(ELF_RADIUS - 0.04, ELF_RADIUS + 0.04, 32);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, elfRingMat);
    mesh.name = `debugElfRing_${i}`;
    mesh.visible = false;
    rootGroup.add(mesh);
    elfRingMeshes.push(mesh);
  }

  scene.add(rootGroup);

  let isEnabled = false;

  function setVisible(val) {
    isEnabled = !!val;
    rootGroup.visible = isEnabled;
    elfRingMeshes.forEach((m) => { m.visible = isEnabled; });
    console.log(`🔴 [Obstakel Debug] Debugmodus: ${isEnabled ? 'AAN (rode ringen tonen)' : 'UIT'}`);
  }

  function toggle() {
    setVisible(!isEnabled);
    return isEnabled;
  }

  function isVisible() {
    return isEnabled;
  }

  // Hidden keyboard shortcut: key 'D' toggles debug mode for testing
  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;

    if ((e.code === 'KeyD' || e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      toggle();
    }
  });

  // Update dynamic elf collision rings each frame
  function update() {
    if (!isEnabled) {
      if (rootGroup.visible) rootGroup.visible = false;
      for (let i = 0; i < elfRingMeshes.length; i++) {
        if (elfRingMeshes[i].visible) elfRingMeshes[i].visible = false;
      }
      return;
    }
    if (!getWalkingElves) return;
    const elves = getWalkingElves();
    if (!elves || !elves.length) return;

    for (let i = 0; i < Math.min(elves.length, elfRingMeshes.length); i++) {
      const elf = elves[i];
      const ring = elfRingMeshes[i];
      if (elf && elf.root) {
        const ep = elf.root.position;
        const gy = getTerrainHeight(ep.x, ep.z);
        ring.position.set(ep.x, gy + 0.042, ep.z);
        ring.visible = isEnabled;
      }
    }
  }

  return {
    group: rootGroup,
    toggle,
    setVisible,
    isVisible,
    update
  };
}
