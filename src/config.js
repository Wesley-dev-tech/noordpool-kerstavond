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

export const COORDS = Object.freeze({
  northPole: { x: 0, y: 0, z: 0 },
  workshop: { x: -10, y: 0, z: -7, rotY: 0.42 },
  woodpile: { x: -6.2, y: 0, z: -5.8 },
  snowman: { x: -5.0, y: 0, z: -3.2, rotY: 0.55 },
  iceLake: { x: 8.5, y: 0.02, z: 4.5 },
  mainChristmasTree: { x: 4.5, y: 0, z: -3.5, height: 5.2 },
  secondChristmasTree: { x: -4.8, y: 0, z: -9.2, height: 4.4 },
  litPines: [
    { x: 7.5, y: 0, z: -8.5, scale: 1.05 },
    { x: -15.5, y: 0, z: -2.5, scale: 1.15 },
    { x: 11.0, y: 0, z: -2.0, scale: 0.95 },
    { x: -2.5, y: 0, z: -13.5, scale: 1.2 }
  ],
  forestPines: [
    { x: -17.0, y: 0, z: -11.0, scale: 1.25 },
    { x: -11.0, y: 0, z: -16.0, scale: 1.35 },
    { x: 4.0, y: 0, z: -17.0, scale: 1.1 },
    { x: 14.0, y: 0, z: -12.0, scale: 1.3 },
    { x: 17.0, y: 0, z: 3.0, scale: 0.9 },
    { x: -14.0, y: 0, z: 7.0, scale: 0.85 }
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
  cameraIntroMid: { x: -12, y: 9, z: 18 },
  cameraDefaultPos: { x: 6.5, y: 4.2, z: 13.5 },
  cameraTargetStart: { x: 0, y: 10, z: -18 },
  cameraDefaultTarget: { x: -1.5, y: 1.8, z: -2.5 },
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
    bloomEnabled: true,
    bloomStrength: 0.65,
    bloomRadius: 0.5,
    bloomThreshold: 0.75,
    smokeCount: 60,
    dustCount: 120,
    gustSnowCount: 280
  }
});
