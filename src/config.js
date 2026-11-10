export const COLORS = Object.freeze({
  NIGHT_SKY_TOP: 0x02050e,
  NIGHT_SKY_HORIZON: 0x091734,
  FOG_COLOR: 0x091734,
  MOONLIGHT: 0x7cb6ff,
  HEMI_SKY: 0x1e4d94,
  HEMI_GROUND: 0x0a1c3e,
  SNOW_BASE: 0xcbe0ff,
  SNOW_SHADOW_EMISSIVE: 0x0a214a,
  ICE_SURFACE: 0x0d2644,
  POLE_RED: 0xd92027,
  POLE_WHITE: 0xf7f9fc,
  GOLD_METAL: 0xffcc33,
  WOOD_DARK: 0x3d2314,
  WOOD_WARM: 0x6e4124,
  STONE_CHIMNEY: 0x4a505c,
  WARM_WINDOW: 0xffaa33,
  PINE_DARK: 0x0f2e1e,
  PINE_LIGHT: 0x1b472f,
  AURORA_GREEN: 0x22ff99,
  AURORA_PURPLE: 0x9933ff,
  RUDOLPH_RED: 0xff1e1e,
  BULB_PALETTE: [0xff2a2a, 0x2aff55, 0x2aaaff, 0xffdd2a, 0xff44cc]
});

export const GROUPS = Object.freeze({
  GROUP_TERRAIN: 'terrainGroup',
  GROUP_SKY: 'skyGroup',
  GROUP_AURORA: 'auroraGroup',
  GROUP_NORTH_POLE: 'northPoleGroup',
  GROUP_WORKSHOP: 'workshopGroup',
  GROUP_TREES: 'treesGroup',
  GROUP_SNOW: 'snowGroup',
  GROUP_SLEIGH: 'sleighGroup',
  GROUP_GIFTS: 'giftsGroup'
});

export const PATH_WAYPOINTS = Object.freeze([
  { x: -17.5, y: 0, z: 8.5 },  // Entrance to Elf Village central round plaza
  { x: -16.0, y: 0, z: 8.4 },  // Elf Village square welcoming lane
  { x: -14.2, y: 0, z: 8.0 },  // Flowing gently past the village edge
  { x: -12.5, y: 0, z: 6.5 },  // Scenic curve past village clearing
  { x: -11.0, y: 0, z: 4.0 },  // Transition to main lane
  { x: -9.6, y: 0, z: 1.8 },   // Approaching workshop
  { x: -8.4, y: 0, z: -0.2 },  // Wide front clearance past Santa & Mrs Claus (> 1.8m)
  { x: -8.0, y: 0, z: -1.8 },  // Past workshop front
  { x: -7.5, y: 0, z: -3.0 },  // Workshop porch area
  { x: -5.8, y: 0, z: -2.0 },  // Lane between snowman and mailbox
  { x: -3.2, y: 0, z: -0.6 },  // In front of mailbox
  { x: -0.8, y: 0, z: -1.7 },  // In front of North Pole
  { x: 1.2, y: 0, z: -1.8 },   // Approaching Great Christmas tree
  { x: 2.6, y: 0, z: -2.3 }    // Festive arrival in front of Great Christmas tree
]);

export const RAILWAY_WAYPOINTS = Object.freeze([
  { x: -50.36, y: 0, z: 15.19 }, // 0: Station Kersthalte stop (Elf Village side)
  { x: -52.79, y: 0, z: 7.52 },
  { x: -53.13, y: 0, z: -0.50 },
  { x: -51.25, y: 0, z: -8.46 },
  { x: -47.52, y: 0, z: -16.09 },
  { x: -42.01, y: 0, z: -23.21 },
  { x: -34.40, y: 0, z: -29.10 },
  { x: -24.84, y: 0, z: -32.61 },
  { x: -14.48, y: 0, z: -33.07 },
  { x: -4.69, y: 0, z: -31.14 },
  { x: 4.11, y: 0, z: -28.12 },
  { x: 12.38, y: 0, z: -24.69 },
  { x: 20.29, y: 0, z: -20.43 },
  { x: 27.09, y: 0, z: -14.71 },
  { x: 31.87, y: 0, z: -7.56 },
  { x: 34.37, y: 0, z: 0.44 },
  { x: 34.71, y: 0, z: 8.79 },
  { x: 32.71, y: 0, z: 17.06 },
  { x: 27.99, y: 0, z: 24.55 },
  { x: 20.83, y: 0, z: 30.47 },
  { x: 12.33, y: 0, z: 34.65 },
  { x: 3.42, y: 0, z: 37.68 },
  { x: -5.87, y: 0, z: 39.93 },
  { x: -15.75, y: 0, z: 40.82 },
  { x: -25.68, y: 0, z: 39.32 },
  { x: -34.43, y: 0, z: 35.15 },
  { x: -41.26, y: 0, z: 29.16 },
  { x: -46.43, y: 0, z: 22.38 }
]);

export const COORDS = Object.freeze({
  northPole: { x: 0, y: 0, z: 0 },
  workshop: { x: -10, y: 0, z: -7, rotY: 0.42 },
  woodpile: { x: -6.2, y: 0, z: -5.8 },
  snowman: { x: -5.0, y: 0, z: -3.2, rotY: 0.55 },
  santaCouple: { x: -10.51, y: 0, z: -0.74, rotY: 0.58 },
  iceLake: { x: 8.5, y: 0.02, z: 4.5 },
  mainChristmasTree: { x: 4.5, y: 0, z: -3.5, height: 5.2 },
  secondChristmasTree: { x: -4.8, y: 0, z: -9.2, height: 4.4 },
  station: { x: -49.6, y: 0, z: 15.2 },
  railwayCrossing: { x: -50.4, y: 0, z: 15.2 },
  elfVillage: {
    squareCenter: { x: -18.0, y: 0, z: 8.5 },
    clearanceRadius: 18.0
  },
  elfVillageChristmasTrees: [
    {
      id: 'villageTree_1',
      name: 'Goud & Warm Wit',
      x: -14.60,
      z: 11.80,
      height: 2.55,
      theme: 'gold_white'
    },
    {
      id: 'villageTree_2',
      name: 'Zuurstok & Rood',
      x: -21.80,
      z: 16.40,
      height: 2.80,
      theme: 'candycane_red'
    },
    {
      id: 'villageTree_3',
      name: 'Meerkleurig & Zilver',
      x: -26.60,
      z: 9.00,
      height: 2.35,
      theme: 'multicolor_silver'
    },
    {
      id: 'villageTree_4',
      name: 'Blauw, Zilver & IJspegels',
      x: -22.80,
      z: 1.60,
      height: 2.65,
      theme: 'blue_icicles'
    },
    {
      id: 'villageTree_5',
      name: 'Elfenboom: Cadeautjes & Snoep',
      x: -19.50,
      z: 3.00,
      height: 2.45,
      theme: 'elf_tree'
    }
  ],
  litPines: [
    { x: 7.5, y: 0, z: -8.5, scale: 1.05 },
    { x: -21.5, y: 0, z: -4.5, scale: 1.15 },
    { x: 11.5, y: 0, z: -3.8, scale: 0.95 },
    { x: -2.5, y: 0, z: -13.5, scale: 1.2 }
  ],
  forestPines: [
    { x: -22.0, y: 0, z: -11.5, scale: 1.25 },
    { x: -11.0, y: 0, z: -16.0, scale: 1.35 },
    { x: 4.0, y: 0, z: -17.0, scale: 1.1 },
    { x: 14.0, y: 0, z: -12.0, scale: 1.3 },
    { x: 17.0, y: 0, z: 3.0, scale: 0.9 },
    { x: -37.0, y: 0, z: 21.0, scale: 1.15 }
  ],
  gifts: [
    { x: 0.85, y: 0, z: 0.55, size: 0.52, rotY: 0.3, boxColor: '#d92027', ribbonColor: '#ffcc33' },
    { x: -0.75, y: 0, z: 0.70, size: 0.46, rotY: -0.5, boxColor: '#1e6bd6', ribbonColor: '#f7f9fc' },
    { x: 3.6, y: 0, z: -2.6, size: 0.62, rotY: 0.8, boxColor: '#1f8a4c', ribbonColor: '#ffcc33' },
    { x: 5.1, y: 0, z: -2.8, size: 0.55, rotY: -0.2, boxColor: '#8e3ccb', ribbonColor: '#ffdd55' },
    { x: 4.3, y: 0, z: -2.2, size: 0.48, rotY: 1.1, boxColor: '#e67300', ribbonColor: '#ffffff' }
  ],
  moon: { x: 28, y: 36, z: -42 },
  cameraIntroStart: { x: 0, y: 18, z: 34 },
  cameraIntroMid: { x: -6, y: 8, z: 22 },
  cameraDefaultPos: { x: 5.5, y: 4.6, z: 16.5 },
  cameraTargetStart: { x: -4, y: 8, z: -10 },
  cameraDefaultTarget: { x: -3.8, y: 1.6, z: 0.5 },
  sleighCurvePoints: [
    [0, 14, -18],
    [22, 17, -10],
    [26, 12, 10],
    [8, 9, 16],
    [-12, 11, 12],
    [-24, 16, -2],
    [-18, 20, -18],
    [-6, 16, -24]
  ]
});

export const QUALITY_PRESETS = Object.freeze({
  low: {
    label: 'Laag',
    pixelRatio: 1.0,
    snowCount: 600,
    starCount: 600,
    shadowsEnabled: false,
    shadowMapSize: 1024,
    pointShadowsEnabled: false,
    pointShadowMapSize: 512,
    contactShadowsEnabled: true,
    bloomEnabled: false,
    bloomStrength: 0.0,
    bloomRadius: 0.3,
    bloomThreshold: 0.8,
    smokeCount: 24,
    dustCount: 40,
    gustSnowCount: 90
  },
  medium: {
    label: 'Midden',
    pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5),
    snowCount: 1500,
    starCount: 1200,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    pointShadowsEnabled: false,
    pointShadowMapSize: 512,
    contactShadowsEnabled: true,
    bloomEnabled: true,
    bloomStrength: 0.55,
    bloomRadius: 0.4,
    bloomThreshold: 0.78,
    smokeCount: 42,
    dustCount: 80,
    gustSnowCount: 180
  },
  high: {
    label: 'Hoog',
    pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2.0),
    snowCount: 3000,
    starCount: 2000,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    pointShadowsEnabled: true,
    pointShadowMapSize: 512,
    contactShadowsEnabled: true,
    bloomEnabled: true,
    bloomStrength: 0.65,
    bloomRadius: 0.5,
    bloomThreshold: 0.75,
    smokeCount: 60,
    dustCount: 120,
    gustSnowCount: 280
  }
});

/**
 * Registry of major scene obstacles with footprints to prevent overlapping placement.
 */
export function getSceneObstacles() {
  return [
    { id: 'northPole', x: 0, z: 0, radius: 2.5 },
    { id: 'workshop', x: -10, z: -7, radius: 5.6 },
    { id: 'elfVillageSquare', x: -18.0, z: 8.5, radius: 8.2 },
    { id: 'mainChristmasTree', x: 4.5, z: -3.5, radius: 2.5 },
    { id: 'secondChristmasTree', x: -4.8, z: -9.2, radius: 2.2 },
    { id: 'iceLake', x: 8.5, z: 4.5, radius: 6.8 },
    { id: 'santaCouple', x: -10.51, z: -0.74, radius: 1.8 },
    { id: 'mailbox', x: -3.1, z: -1.75, radius: 0.90 }
  ];
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


