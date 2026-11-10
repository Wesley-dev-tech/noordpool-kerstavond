import * as THREE from 'three';
import { COLORS, GROUPS } from '../config.js';

/**
 * Builds a continuous, seamless 360-degree curved ribbon geometry around the Y axis.
 * The ribbon's radius and height are fully parametric and can curve inward toward the zenith.
 */
function buildCurvedRibbonGeometry({
  radiusBottomX,
  radiusBottomZ,
  radiusTopX,
  radiusTopZ,
  baseY,
  topY,
  radialSegments = 160,
  heightSegments = 24
}) {
  const vertexCount = (radialSegments + 1) * (heightSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const normals = new Float32Array(vertexCount * 3);
  const indices = [];

  let ptrPos = 0;
  let ptrUv = 0;
  let ptrNorm = 0;

  for (let j = 0; j <= heightSegments; j++) {
    const v = j / heightSegments; // 0 = base, 1 = top
    const y = baseY + v * (topY - baseY);
    const rx = radiusBottomX + v * (radiusTopX - radiusBottomX);
    const rz = radiusBottomZ + v * (radiusTopZ - radiusBottomZ);

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments; // 0.0 .. 1.0 around the 360-degree circle
      const theta = u * Math.PI * 2.0;

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      positions[ptrPos++] = rx * cosT;
      positions[ptrPos++] = y;
      positions[ptrPos++] = rz * sinT;

      uvs[ptrUv++] = u;
      uvs[ptrUv++] = v;

      // Inward-facing normal
      normals[ptrNorm++] = -cosT;
      normals[ptrNorm++] = 0;
      normals[ptrNorm++] = -sinT;
    }
  }

  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * (radialSegments + 1) + i;
      const b = a + 1;
      const c = (j + 1) * (radialSegments + 1) + i;
      const d = c + 1;

      // Two triangles per quad
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(indices);

  return geo;
}

export function createAurora(scene, camera = null) {
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_AURORA;

  let activeCamera = camera;

  // Shared GLSL vertex shader: seamless periodic wave displacement using integer harmonics
  const vertexShader = `
    uniform float uTime;
    uniform float uPhase;
    uniform float uWaveSpeed;
    uniform float uWaveScale;
    varying vec2 vUv;
    varying float vAngle;

    void main() {
      vUv = uv;
      // Angle around circle in radians [0 .. 2*PI]
      float angle = uv.x * 6.283185307179586;
      vAngle = angle;

      vec3 p = position;

      // Radial displacement direction (XZ plane)
      vec2 xz = normalize(p.xz);

      // Height factor: curtains billow and wave more at the top than at the rooted base
      float hFactor = 0.35 + 0.65 * uv.y;

      // Seamless integer harmonics guarantee 100% periodicity at 0 and 2*PI (no seam!)
      float w1 = sin(angle * 5.0 + uTime * 0.42 * uWaveSpeed + uPhase) * 4.2;
      float w2 = cos(angle * 11.0 - uTime * 0.31 * uWaveSpeed + uPhase * 1.6) * 2.4;
      float w3 = sin(angle * 18.0 + uTime * 0.55 * uWaveSpeed - uPhase * 0.8) * 1.3;

      float radialDisplace = (w1 + w2 + w3) * hFactor * uWaveScale;
      p.x += xz.x * radialDisplace;
      p.z += xz.y * radialDisplace;

      // Gentle vertical undulation along the curtain
      float vWave1 = sin(angle * 4.0 + uTime * 0.28 * uWaveSpeed + uPhase) * 2.8;
      float vWave2 = cos(angle * 9.0 - uTime * 0.22 * uWaveSpeed) * 1.5;
      p.y += (vWave1 + vWave2) * hFactor * uWaveScale;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;

  // Shared GLSL fragment shader:
  // - Soft bottom and top edge fade to transparent
  // - Macro-intensity variation along the 360 band via continuous polar noise
  // - Vertical dancing ray folds (Northern Lights fluting)
  // - Vibrant green-turquoise base blending into ethereal violet-purple top
  // - Additive blending with correct depth testing
  const fragmentShader = `
    uniform float uTime;
    uniform float uPhase;
    uniform vec3 uColorGreen;
    uniform vec3 uColorPurple;
    uniform float uIntensity;
    varying vec2 vUv;
    varying float vAngle;

    // Fast, lightweight procedural noise
    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise2d(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main() {
      // 1. Soft vertical fading: bottom and top edge fade smoothly to zero opacity
      float bottomFade = smoothstep(0.0, 0.18, vUv.y);
      float topFade = smoothstep(1.0, 0.32, vUv.y);
      float verticalFade = bottomFade * topFade;

      // 2. Continuous polar direction ensures 100% seamless noise across 360 degrees
      vec2 polarDir = vec2(cos(vAngle), sin(vAngle));

      // Macro-intensity variation along the 360 band:
      // Creates natural strong luminous surges and gentler sections around the horizon
      float macro1 = noise2d(polarDir * 2.0 + vec2(uTime * 0.04 + uPhase * 0.3, uPhase * 0.7));
      float macro2 = noise2d(polarDir * 4.2 - vec2(uTime * 0.06 - uPhase * 0.5, uTime * 0.03));
      float macroSurge = 0.42 + 0.58 * (0.65 * macro1 + 0.35 * macro2 + 0.5);
      macroSurge = clamp(macroSurge * 1.15, 0.32, 1.0);

      // 3. Vertical curtain folds / dancing ray striations (Northern Lights vertical fluting):
      // Integer harmonics guarantee 100% seamless connection around 360 degrees
      float foldWarp = sin(vAngle * 8.0 + uTime * 0.75 + uPhase) * 2.2;
      float foldWarp2 = cos(vAngle * 16.0 - uTime * 0.5 + uPhase * 1.4) * 1.4;

      float rays = 0.5 + 0.5 * sin(vAngle * 48.0 + foldWarp + foldWarp2 + uTime * 0.85 + uPhase);
      rays = pow(rays, 1.8);

      // Fine curtain filaments with subtle vertical noise drift
      float rayDrift = noise2d(vec2(polarDir.x * 3.5, vUv.y * 6.0 - uTime * 0.18));
      float fineCurtain = 0.5 + 0.5 * sin(vAngle * 72.0 + rayDrift * 3.0 + uTime * 1.1 + uPhase * 2.0);
      fineCurtain = pow(fineCurtain, 1.5);

      float curtain = mix(rays, fineCurtain, 0.32);

      // 4. Color gradient: vibrant green-turquoise at base, ethereal violet-purple at top
      float colorMix = smoothstep(0.18, 0.82, vUv.y);
      vec3 baseCol = mix(uColorGreen, uColorPurple, colorMix);

      // Luminous incandescent core brightening in the densest folds
      vec3 luminousCore = mix(uColorGreen * 1.25, uColorPurple * 1.2, colorMix);
      vec3 finalColor = mix(baseCol, luminousCore, curtain * 0.4);

      // 5. Overall alpha computation
      float alpha = verticalFade * macroSurge * (0.24 + 0.62 * curtain) * uIntensity;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  function createRibbon(config) {
    const geo = buildCurvedRibbonGeometry(config);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uPhase: { value: config.phaseOffset },
        uWaveSpeed: { value: config.waveSpeed },
        uWaveScale: { value: config.waveScale },
        uIntensity: { value: config.intensity },
        uColorGreen: { value: new THREE.Color(COLORS.AURORA_GREEN) },
        uColorPurple: { value: new THREE.Color(COLORS.AURORA_PURPLE) }
      },
      vertexShader,
      fragmentShader
    });

    const mesh = new THREE.Mesh(geo, mat);
    // Explicit renderOrder: after stars (-5), before moon halo (3) and snow (6)
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    return { mesh, mat };
  }

  // 4 curved ribbons spanning a broad 360-degree band around the horizon,
  // climbing from ~5 deg above horizon up to 60 deg, with varying radii and heights.
  const ribbonConfigs = [
    // Ribbon 1: Lowest / Front curtain (elevation ~5° to 19°, visible above trees in default overview)
    {
      radiusBottomX: 84,
      radiusBottomZ: 88,
      radiusTopX: 78,
      radiusTopZ: 82,
      baseY: 7.0,
      topY: 28.0,
      phaseOffset: 0.0,
      waveSpeed: 1.0,
      waveScale: 1.0,
      intensity: 0.95
    },
    // Ribbon 2: Mid-low curtain (elevation ~10° to 34°)
    {
      radiusBottomX: 88,
      radiusBottomZ: 84,
      radiusTopX: 80,
      radiusTopZ: 76,
      baseY: 16.0,
      topY: 52.0,
      phaseOffset: 2.15,
      waveSpeed: 0.88,
      waveScale: 1.15,
      intensity: 0.90
    },
    // Ribbon 3: Mid-high curtain (elevation ~18° to 46°)
    {
      radiusBottomX: 94,
      radiusBottomZ: 98,
      radiusTopX: 82,
      radiusTopZ: 86,
      baseY: 32.0,
      topY: 88.0,
      phaseOffset: 4.30,
      waveSpeed: 0.75,
      waveScale: 1.25,
      intensity: 0.85
    },
    // Ribbon 4: High celestial curtain (elevation ~28° to 60°)
    {
      radiusBottomX: 100,
      radiusBottomZ: 96,
      radiusTopX: 84,
      radiusTopZ: 80,
      baseY: 52.0,
      topY: 145.0,
      phaseOffset: 1.45,
      waveSpeed: 0.65,
      waveScale: 1.35,
      intensity: 0.78
    }
  ];

  const ribbons = ribbonConfigs.map(createRibbon);
  ribbons.forEach((r) => group.add(r.mesh));

  function update(delta, elapsed, cam = null) {
    if (cam) activeCamera = cam;

    // Follow camera position (not rotation) so the viewer can never fly through or zoom past
    if (activeCamera) {
      group.position.copy(activeCamera.position);
    }

    for (let i = 0; i < ribbons.length; i++) {
      ribbons[i].mat.uniforms.uTime.value = elapsed;
    }
  }

  function setQuality(preset) {
    const mult = preset.bloomEnabled ? 1.0 : 1.25;
    for (let i = 0; i < ribbons.length; i++) {
      ribbons[i].mat.uniforms.uIntensity.value = ribbonConfigs[i].intensity * mult;
    }
  }

  scene.add(group);
  return { group, update, setQuality };
}
