import * as THREE from 'three';
import { COLORS, COORDS, GROUPS, QUALITY_PRESETS } from '../config.js';
import { createSnowflakeSprite } from '../utils/procedural.js';

export function createSky(scene, initialPreset = QUALITY_PRESETS.high) {
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_SKY;

  // 1. Gradient Sky Dome with misty horizon transition
  const skyGeo = new THREE.SphereGeometry(115, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(COLORS.NIGHT_SKY_TOP) },
      uHorizonColor: { value: new THREE.Color(COLORS.NIGHT_SKY_HORIZON) },
      uMistGlowColor: { value: new THREE.Color(0x0e2248) }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uMistGlowColor;
      varying vec3 vWorldPos;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y, 0.0, 1.0);
        float skyBlend = pow(smoothstep(0.02, 0.88, h), 0.75);
        vec3 col = mix(uHorizonColor, uTopColor, skyBlend);

        // Soft atmospheric horizon mist glow right above the mountain silhouettes & ground
        float horizonBand = smoothstep(0.22, 0.0, h);
        float lowMistCore = smoothstep(0.09, 0.0, h);
        col = mix(col, uMistGlowColor, horizonBand * 0.55);
        col = mix(col, uHorizonColor, lowMistCore * 0.65);

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // 2. Twinkling Stars (Points with ShaderMaterial)
  const MAX_STARS = QUALITY_PRESETS.high.starCount;
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX_STARS * 3);
  const sizes = new Float32Array(MAX_STARS);
  const phases = new Float32Array(MAX_STARS);
  const colors = new Float32Array(MAX_STARS * 3);

  const starPalette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xcce4ff),
    new THREE.Color(0xfff0cc),
    new THREE.Color(0xaaccff)
  ];

  for (let i = 0; i < MAX_STARS; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(0.14 + v * 0.86); // Keep above low horizon mist & mountain silhouettes
    const r = 104 + Math.random() * 6;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    sizes[i] = 1.5 + Math.pow(Math.random(), 2.5) * 3.8;
    phases[i] = Math.random() * Math.PI * 2;

    const c = starPalette[i % starPalette.length];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  starGeo.setDrawRange(0, initialPreset.starCount);

  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: initialPreset.pixelRatio }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        float elev = clamp(normalize(position).y, 0.0, 1.0);
        float horizonFade = smoothstep(0.13, 0.28, elev);
        vAlpha = (0.45 + 0.55 * sin(uTime * 2.6 + aPhase)) * horizonFade;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (180.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, glow * vAlpha);
      }
    `
  });

  const starsPoints = new THREE.Points(starGeo, starMat);
  group.add(starsPoints);

  // 3. Moon with Halo
  const moonGeo = new THREE.SphereGeometry(3.2, 24, 24);
  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xdceeff,
    fog: false
  });
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonMesh.position.set(COORDS.moon.x, COORDS.moon.y, COORDS.moon.z);
  group.add(moonMesh);

  const haloMat = new THREE.SpriteMaterial({
    map: createSnowflakeSprite(),
    color: 0x6ea8ff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const haloSprite = new THREE.Sprite(haloMat);
  haloSprite.scale.set(22, 22, 1);
  moonMesh.add(haloSprite);

  // 4. Periodic Shooting Star (average interval: 15 seconds)
  const SHOOT_INTERVAL_AVG = 15.0;
  const SHOOT_INTERVAL_JITTER = 4.0; // Uniform [11.0 .. 19.0]s -> average 15.0s
  const TRAIL_SEGMENTS = 20;

  const shootGeo = new THREE.BufferGeometry();
  const vertCount = (TRAIL_SEGMENTS + 1) * 2;
  const shootPositions = new Float32Array(vertCount * 3);
  const shootUvs = new Float32Array(vertCount * 2);
  const shootIndices = [];

  for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
    const u = i / TRAIL_SEGMENTS; // 0 = tail tip, 1 = glowing meteor head
    shootUvs[i * 4 + 0] = u;
    shootUvs[i * 4 + 1] = 0.0;
    shootUvs[i * 4 + 2] = u;
    shootUvs[i * 4 + 3] = 1.0;

    if (i < TRAIL_SEGMENTS) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      shootIndices.push(a, b, c, b, d, c);
    }
  }

  shootGeo.setAttribute('position', new THREE.BufferAttribute(shootPositions, 3));
  shootGeo.setAttribute('uv', new THREE.BufferAttribute(shootUvs, 2));
  shootGeo.setIndex(shootIndices);

  const shootMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: {
      uOpacity: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        // vUv.x: 0.0 (tail tip) -> 1.0 (meteor head)
        // vUv.y: 0.0 .. 1.0 across ribbon width
        float crossDist = abs(vUv.y - 0.5) * 2.0;
        float coreProfile = pow(max(0.0, 1.0 - crossDist), 2.2);
        float longitudinal = pow(vUv.x, 2.4);

        // Bright incandescent head flare near vUv.x -> 1.0
        float headDist = length(vec2((1.0 - vUv.x) * 9.0, (vUv.y - 0.5) * 2.2));
        float headFlare = exp(-headDist * headDist * 2.5) * 1.65;

        vec3 tailColor = vec3(0.48, 0.82, 1.0);
        vec3 headColor = vec3(1.0, 0.99, 0.94);
        vec3 col = mix(tailColor, headColor, smoothstep(0.45, 0.95, vUv.x));

        float intensity = (coreProfile * longitudinal + headFlare) * uOpacity;
        gl_FragColor = vec4(col * (1.15 + headFlare * 0.9), clamp(intensity, 0.0, 1.0));
      }
    `
  });

  const shootingStar = new THREE.Mesh(shootGeo, shootMat);
  shootingStar.frustumCulled = false;
  shootingStar.visible = false;
  group.add(shootingStar);

  // First meteor appears shortly after the 5s intro flight; subsequent ones average every 15s
  let nextShootTimer = 6.0 + Math.random() * 3.0;
  let shootElapsed = 0;
  let shootDuration = 0.95;
  let shootActive = false;

  const shootStart = new THREE.Vector3();
  const shootVel = new THREE.Vector3();
  const samplePos = new THREE.Vector3();
  const perpDir = new THREE.Vector3();
  const viewRay = new THREE.Vector3();

  function spawnShootingStar() {
    shootActive = true;
    shootElapsed = 0;
    shootDuration = 0.85 + Math.random() * 0.3;
    nextShootTimer =
      SHOOT_INTERVAL_AVG - SHOOT_INTERVAL_JITTER + Math.random() * (SHOOT_INTERVAL_JITTER * 2.0);

    // Spawn in the upper visible sky band above the trees & aurora (within default camera frustum)
    const dirSign = Math.random() < 0.5 ? 1 : -1;
    const startX = -6.0 - dirSign * (6.0 + Math.random() * 16.0);
    const startY = 21.0 + Math.random() * 5.8;
    const startZ = -48.0 - Math.random() * 18.0;
    shootStart.set(startX, startY, startZ);

    const speedX = dirSign * (28.0 + Math.random() * 12.0);
    const speedY = -(7.5 + Math.random() * 3.5);
    const speedZ = (Math.random() - 0.5) * 12.0;
    shootVel.set(speedX, speedY, speedZ);

    shootingStar.visible = true;
  }

  function update(delta, elapsed) {
    starMat.uniforms.uTime.value = elapsed;

    if (!shootActive) {
      nextShootTimer -= delta;
      if (nextShootTimer <= 0) {
        spawnShootingStar();
      }
    } else {
      shootElapsed += delta;
      const t = shootElapsed / shootDuration;
      if (t >= 1.0) {
        shootActive = false;
        shootingStar.visible = false;
      } else {
        // Compute billboard side vector perpendicular to trajectory and line of sight
        samplePos.copy(shootStart).addScaledVector(shootVel, shootElapsed);
        viewRay.copy(samplePos).normalize();
        perpDir.crossVectors(shootVel, viewRay).normalize();
        if (perpDir.lengthSq() < 0.001) {
          perpDir.set(0, 1, 0);
        }

        // Tail length grows smoothly after entry and contracts at burn-out
        const tailWindow = 0.24 * Math.sin(Math.min(1.0, t * 1.25) * Math.PI * 0.85 + 0.15);
        const posArr = shootGeo.attributes.position.array;

        for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
          const u = i / TRAIL_SEGMENTS; // 0 = tail tip, 1 = head
          const sampleTime = Math.max(0, shootElapsed - (1.0 - u) * tailWindow);
          samplePos.copy(shootStart).addScaledVector(shootVel, sampleTime);
          // Subtle downward gravity curve along trajectory
          samplePos.y -= 1.4 * sampleTime * sampleTime;

          // Taper ribbon half-width from hairline tail tip to bright meteor head
          const halfWidth = 0.02 + 0.24 * Math.pow(u, 1.5);
          const idx = i * 6;

          posArr[idx + 0] = samplePos.x - perpDir.x * halfWidth;
          posArr[idx + 1] = samplePos.y - perpDir.y * halfWidth;
          posArr[idx + 2] = samplePos.z - perpDir.z * halfWidth;

          posArr[idx + 3] = samplePos.x + perpDir.x * halfWidth;
          posArr[idx + 4] = samplePos.y + perpDir.y * halfWidth;
          posArr[idx + 5] = samplePos.z + perpDir.z * halfWidth;
        }

        shootGeo.attributes.position.needsUpdate = true;
        // Fast flash-in on atmospheric entry, smooth fade-out at burn-up
        const fadeIn = Math.min(1.0, t / 0.18);
        const fadeOut = Math.pow(Math.max(0.0, (1.0 - t) / 0.82), 1.4);
        shootMat.uniforms.uOpacity.value = fadeIn * fadeOut;
      }
    }
  }

  function setQuality(preset) {
    starGeo.setDrawRange(0, preset.starCount);
    starMat.uniforms.uPixelRatio.value = preset.pixelRatio;
  }

  scene.add(group);
  return { group, update, setQuality };
}
