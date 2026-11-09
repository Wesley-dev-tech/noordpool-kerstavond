import * as THREE from 'three';
import { GROUPS, QUALITY_PRESETS } from '../config.js';
import {
  createSnowflakeSprite,
  createSmokeSprite,
  getTerrainHeight
} from '../utils/procedural.js';

export function createSnow(scene, initialPreset = QUALITY_PRESETS.high) {
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_SNOW;
  scene.add(group);

  // ---------------------------------------------------------------------------
  // 1. Falling Snowflakes
  // ---------------------------------------------------------------------------
  const MAX_SNOW = QUALITY_PRESETS.high.snowCount; // 3000
  let activeCount = initialPreset.snowCount;

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX_SNOW * 3);
  const velocitiesY = new Float32Array(MAX_SNOW);
  const driftPhases = new Float32Array(MAX_SNOW);
  const driftSpeeds = new Float32Array(MAX_SNOW);

  const AREA_HALF = 35;
  const MAX_Y = 28;

  for (let i = 0; i < MAX_SNOW; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * AREA_HALF;
    positions[i * 3 + 1] = Math.random() * MAX_Y;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * AREA_HALF;

    velocitiesY[i] = 1.25 + Math.random() * 1.15;
    driftPhases[i] = Math.random() * Math.PI * 2;
    driftSpeeds[i] = 0.8 + Math.random() * 1.4;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setDrawRange(0, activeCount);

  const mat = new THREE.PointsMaterial({
    map: createSnowflakeSprite(),
    color: 0xffffff,
    size: 0.24,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  // Cap maximum point size near the camera and smoothly fade out snowflakes at close range
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vNearFade;`
      )
      .replace(
        'if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );',
        `if ( isPerspective ) {
          float camDist = length( mvPosition.xyz );
          float clampedDepth = max( -mvPosition.z, 2.6 );
          gl_PointSize *= ( scale / clampedDepth );
          gl_PointSize = min( gl_PointSize, 18.0 );
          vNearFade = smoothstep( 1.2, 3.8, camDist );
        } else {
          vNearFade = 1.0;
        }`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vNearFade;`
      )
      .replace(
        '#include <premultiplied_alpha_fragment>',
        `gl_FragColor.a *= vNearFade;
        #include <premultiplied_alpha_fragment>`
      );
  };

  const points = new THREE.Points(geo, mat);
  group.add(points);

  // ---------------------------------------------------------------------------
  // 2. Occasional Wind Gusts Whipping Snow Up From the Ground (Spindrift)
  // ---------------------------------------------------------------------------
  const MAX_GUST = QUALITY_PRESETS.high.gustSnowCount || 280;
  let activeGustCount = initialPreset.gustSnowCount || 280;

  const gustGeo = new THREE.BufferGeometry();
  const gustPositions = new Float32Array(MAX_GUST * 3);
  const gustSizes = new Float32Array(MAX_GUST);
  const gustOpacities = new Float32Array(MAX_GUST);
  const gustRotations = new Float32Array(MAX_GUST);
  const gustFineMix = new Float32Array(MAX_GUST); // 0 = wispy snow mist, 1 = crisp blown snow grains

  const gustAges = new Float32Array(MAX_GUST);
  const gustLifeSpans = new Float32Array(MAX_GUST);
  const gustVelX = new Float32Array(MAX_GUST);
  const gustVelY = new Float32Array(MAX_GUST);
  const gustVelZ = new Float32Array(MAX_GUST);
  const gustSwirlPhases = new Float32Array(MAX_GUST);
  const gustRotSpeeds = new Float32Array(MAX_GUST);
  const gustBaseSizes = new Float32Array(MAX_GUST);

  for (let i = 0; i < MAX_GUST; i++) {
    gustAges[i] = 999;
    gustLifeSpans[i] = 1.0;
    gustOpacities[i] = 0.0;
    gustPositions[i * 3 + 1] = -20;
    // Mix of ~42% soft billowing snow-mist puffs and ~58% fine swirling snow grains
    gustFineMix[i] = i % 12 < 5 ? 0.0 : 1.0;
  }

  gustGeo.setAttribute('position', new THREE.BufferAttribute(gustPositions, 3));
  gustGeo.setAttribute('aSize', new THREE.BufferAttribute(gustSizes, 1));
  gustGeo.setAttribute('aOpacity', new THREE.BufferAttribute(gustOpacities, 1));
  gustGeo.setAttribute('aRotation', new THREE.BufferAttribute(gustRotations, 1));
  gustGeo.setAttribute('aFineMix', new THREE.BufferAttribute(gustFineMix, 1));
  gustGeo.setDrawRange(0, activeGustCount);

  const gustMat = new THREE.ShaderMaterial({
    uniforms: {
      uMistMap: { value: createSmokeSprite() },
      uFlakeMap: { value: mat.map },
      uScale: { value: 420.0 }
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aOpacity;
      attribute float aRotation;
      attribute float aFineMix;
      uniform float uScale;
      varying float vOpacity;
      varying float vRotation;
      varying float vFineMix;
      varying float vNearFade;

      void main() {
        vOpacity = aOpacity;
        vRotation = aRotation;
        vFineMix = aFineMix;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float camDist = length(mvPosition.xyz);
        float clampedDepth = max(-mvPosition.z, 2.4);
        float maxPtSize = mix(115.0, 16.0, aFineMix);
        gl_PointSize = clamp(aSize * (uScale / clampedDepth), 1.5, maxPtSize);
        vNearFade = smoothstep(1.2, 3.6, camDist);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMistMap;
      uniform sampler2D uFlakeMap;
      varying float vOpacity;
      varying float vRotation;
      varying float vFineMix;
      varying float vNearFade;

      void main() {
        float alpha = vOpacity * vNearFade;
        if (alpha < 0.003) discard;

        vec2 centered = gl_PointCoord - vec2(0.5);
        float c = cos(vRotation);
        float s = sin(vRotation);
        vec2 rotatedUV = vec2(
          centered.x * c - centered.y * s,
          centered.x * s + centered.y * c
        ) + vec2(0.5);

        vec4 mistTex = texture2D(uMistMap, rotatedUV);
        vec4 flakeTex = texture2D(uFlakeMap, gl_PointCoord);
        vec4 tex = mix(mistTex, flakeTex, vFineMix);

        float finalAlpha = tex.a * alpha;
        if (finalAlpha < 0.003) discard;

        // Crisp moonlit ice-blue & silver-white spindrift tint
        vec3 mistCol = vec3(0.76, 0.88, 1.0);
        vec3 flakeCol = vec3(0.92, 0.97, 1.0);
        vec3 snowCol = mix(mistCol, flakeCol, vFineMix) * tex.rgb;

        gl_FragColor = vec4(snowCol, finalAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const gustPoints = new THREE.Points(gustGeo, gustMat);
  gustPoints.frustumCulled = false;
  group.add(gustPoints);

  // Scenic zones where ground snow drifts & sweeps are clearly visible in the camera view
  const GUST_ZONES = [
    { x: -1.5, z: 3.8, radius: 3.4 },  // Foreground sleigh tracks & open snowfield
    { x: 3.2, z: 2.0, radius: 3.0 },   // Open snow between North Pole and frozen lake
    { x: -5.8, z: -0.8, radius: 3.2 }, // Around the snowman & workshop path
    { x: 1.8, z: -2.2, radius: 2.8 },  // Between North Pole and main Christmas tree
    { x: 11.2, z: 1.2, radius: 2.8 }   // Snowy bank beside the frozen lake
  ];

  let nextGustTimer = 2.6; // First gust appears shortly after the scene opens
  let gustActive = false;
  let gustElapsed = 0;
  let gustDuration = 3.6;
  let gustOriginX = 0;
  let gustOriginZ = 0;
  let gustDirX = 1;
  let gustDirZ = 0;
  let gustRadius = 3.2;
  let gustSpawnCursor = 0;
  let gustSpawnAccumulator = 0;
  let currentGustStrength = 0;
  let lastZoneIdx = -1;

  function triggerWindGust(elapsed) {
    let zoneIdx = Math.floor(Math.random() * GUST_ZONES.length);
    if (zoneIdx === lastZoneIdx) {
      zoneIdx = (zoneIdx + 1) % GUST_ZONES.length;
    }
    lastZoneIdx = zoneIdx;
    const zone = GUST_ZONES[zoneIdx];

    // Align gust with the prevailing wind direction plus a natural angle variation
    const baseWindX = Math.sin(elapsed * 0.42) * 0.85 + 0.45;
    const baseWindZ = Math.cos(elapsed * 0.31) * 0.45 - 0.1;
    const baseAngle = Math.atan2(baseWindZ, baseWindX) + (Math.random() - 0.5) * 0.45;

    gustDirX = Math.cos(baseAngle);
    gustDirZ = Math.sin(baseAngle);

    // Start slightly upwind of the chosen zone so the gust sweeps across it
    gustOriginX = zone.x - gustDirX * 2.4 + (Math.random() - 0.5) * 1.6;
    gustOriginZ = zone.z - gustDirZ * 2.4 + (Math.random() - 0.5) * 1.6;
    gustRadius = zone.radius;
    gustDuration = 3.2 + Math.random() * 1.6;
    gustElapsed = 0;
    gustActive = true;
  }

  function spawnGustParticle(i, frontX, frontZ, intensity) {
    const isFine = gustFineMix[i] > 0.5;
    const perpX = -gustDirZ;
    const perpZ = gustDirX;

    const alongOffset = (Math.random() * 2 - 1) * (gustRadius * 0.75);
    const crossOffset = (Math.random() * 2 - 1) * (gustRadius * 0.85);

    const px = frontX + gustDirX * alongOffset + perpX * crossOffset;
    const pz = frontZ + gustDirZ * alongOffset + perpZ * crossOffset;
    const groundY = Math.max(0, getTerrainHeight(px, pz));

    gustPositions[i * 3] = px;
    gustPositions[i * 3 + 1] = groundY + 0.03 + Math.random() * 0.12;
    gustPositions[i * 3 + 2] = pz;

    const speed = (2.8 + Math.random() * 3.2) * (0.75 + intensity * 0.45);
    const spreadAngle = (Math.random() - 0.5) * 0.42;
    const cosS = Math.cos(spreadAngle);
    const sinS = Math.sin(spreadAngle);
    const dirX = gustDirX * cosS - gustDirZ * sinS;
    const dirZ = gustDirX * sinS + gustDirZ * cosS;

    gustVelX[i] = dirX * speed;
    gustVelZ[i] = dirZ * speed;
    // Upward lift from the ground surface before gravity settles the snow back down
    gustVelY[i] = isFine
      ? 0.65 + Math.random() * 1.05
      : 0.42 + Math.random() * 0.65;

    gustAges[i] = 0;
    gustLifeSpans[i] = isFine
      ? 1.15 + Math.random() * 0.85
      : 1.45 + Math.random() * 0.95;

    gustSwirlPhases[i] = Math.random() * Math.PI * 2;
    gustRotations[i] = Math.random() * Math.PI * 2;
    gustRotSpeeds[i] = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 2.2);
    gustBaseSizes[i] = isFine
      ? 0.14 + Math.random() * 0.14
      : 0.75 + Math.random() * 0.65;
    gustSizes[i] = gustBaseSizes[i];
    gustOpacities[i] = 0.0;
  }

  function update(delta, elapsed) {
    // 1. Update wind gust state machine
    if (!gustActive) {
      nextGustTimer -= delta;
      currentGustStrength = Math.max(0, currentGustStrength - delta * 1.5);
      if (nextGustTimer <= 0) {
        triggerWindGust(elapsed);
        // Schedule next occasional gust every ~6.5 to 12.5 seconds
        nextGustTimer = 6.5 + Math.random() * 6.0;
      }
    } else {
      gustElapsed += delta;
      const progress = Math.min(1.0, gustElapsed / gustDuration);
      // Smooth bell-shaped gust envelope
      currentGustStrength = Math.sin(progress * Math.PI);

      // Gust front travels across the snowfield at ~3.0 m/s
      const travelDist = gustElapsed * 3.0;
      const frontX = gustOriginX + gustDirX * travelDist;
      const frontZ = gustOriginZ + gustDirZ * travelDist;

      // Spawn new ground-picked snow particles while the gust sweeps the ground
      if (progress < 0.86) {
        const spawnRate = activeGustCount * 0.62 * (0.35 + currentGustStrength * 0.95);
        gustSpawnAccumulator += spawnRate * delta;
        while (gustSpawnAccumulator >= 1.0) {
          gustSpawnAccumulator -= 1.0;
          spawnGustParticle(gustSpawnCursor, frontX, frontZ, currentGustStrength);
          gustSpawnCursor = (gustSpawnCursor + 1) % activeGustCount;
        }
      }

      if (gustElapsed >= gustDuration) {
        gustActive = false;
        currentGustStrength = 0;
      }
    }

    // 2. Update falling snowflakes (with subtle extra breeze during a wind gust)
    const posArr = geo.attributes.position.array;
    const windX =
      Math.sin(elapsed * 0.42) * 0.85 +
      0.35 +
      gustDirX * currentGustStrength * 1.35;
    const windZ =
      Math.cos(elapsed * 0.31) * 0.45 +
      gustDirZ * currentGustStrength * 1.35;

    for (let i = 0; i < activeCount; i++) {
      const idx = i * 3;
      const phase = driftPhases[i] + elapsed * driftSpeeds[i];

      let x = posArr[idx] + (Math.sin(phase) * 0.55 + windX) * delta;
      let y = posArr[idx + 1] - velocitiesY[i] * delta;
      let z = posArr[idx + 2] + (Math.cos(phase * 0.8) * 0.45 + windZ) * delta;

      if (y < 0) {
        y = MAX_Y;
        x = (Math.random() * 2 - 1) * AREA_HALF;
        z = (Math.random() * 2 - 1) * AREA_HALF;
      }
      if (x > AREA_HALF) x -= AREA_HALF * 2;
      if (x < -AREA_HALF) x += AREA_HALF * 2;
      if (z > AREA_HALF) z -= AREA_HALF * 2;
      if (z < -AREA_HALF) z += AREA_HALF * 2;

      posArr[idx] = x;
      posArr[idx + 1] = y;
      posArr[idx + 2] = z;
    }

    geo.attributes.position.needsUpdate = true;

    // 3. Update ground-whipped spindrift particles
    let anyGustParticleAlive = false;
    for (let i = 0; i < activeGustCount; i++) {
      const life = gustLifeSpans[i];
      if (gustAges[i] >= life) {
        gustOpacities[i] = 0.0;
        continue;
      }

      anyGustParticleAlive = true;
      gustAges[i] += delta;
      const t = Math.min(1.0, gustAges[i] / life);
      const isFine = gustFineMix[i] > 0.5;
      const idx = i * 3;

      // Swirling vortex turbulence near the snow surface
      const swirlAngle = gustSwirlPhases[i] + elapsed * 5.8 + t * 5.2;
      const swirlRadiusSpeed = isFine ? 0.95 : 0.55;
      const swirlVX = Math.cos(swirlAngle) * swirlRadiusSpeed;
      const swirlVZ = Math.sin(swirlAngle) * swirlRadiusSpeed;
      const swirlVY = Math.sin(swirlAngle * 1.3) * 0.38;

      // Upward eddy lift in the first 35% of life, then soft gravity settling back toward ground
      const gravity = isFine ? 1.15 : 0.62;
      gustVelY[i] -= gravity * delta;
      // Aerodynamic drag slows horizontal burst slightly as snow billows out
      const drag = 1.0 - Math.min(0.5, delta * 0.85);
      gustVelX[i] *= drag;
      gustVelZ[i] *= drag;

      let gx = gustPositions[idx] + (gustVelX[i] + swirlVX) * delta;
      let gy = gustPositions[idx + 1] + (gustVelY[i] + swirlVY) * delta;
      let gz = gustPositions[idx + 2] + (gustVelZ[i] + swirlVZ) * delta;

      // Keep particles skimming above the local snow terrain contour
      const floorY = Math.max(0, getTerrainHeight(gx, gz)) + 0.03;
      if (gy < floorY) {
        gy = floorY;
        gustVelY[i] = Math.abs(gustVelY[i]) * 0.35 + 0.15;
      }

      gustPositions[idx] = gx;
      gustPositions[idx + 1] = gy;
      gustPositions[idx + 2] = gz;

      gustRotations[i] += gustRotSpeeds[i] * delta;

      // Mist puffs expand as they billow upward; snow grains stay crisp
      gustSizes[i] = isFine
        ? gustBaseSizes[i] * (1.0 - t * 0.2)
        : gustBaseSizes[i] * (0.65 + Math.pow(t, 0.75) * 1.55);

      const fadeIn = Math.min(1.0, t / 0.14);
      const fadeOut = Math.pow(1.0 - t, isFine ? 1.35 : 1.65);
      const peakAlpha = isFine ? 0.72 : 0.24;
      gustOpacities[i] = fadeIn * fadeOut * peakAlpha;
    }

    if (anyGustParticleAlive || gustActive) {
      gustGeo.attributes.position.needsUpdate = true;
      gustGeo.attributes.aSize.needsUpdate = true;
      gustGeo.attributes.aOpacity.needsUpdate = true;
      gustGeo.attributes.aRotation.needsUpdate = true;
    }
  }

  function setQuality(preset) {
    activeCount = preset.snowCount;
    geo.setDrawRange(0, activeCount);

    activeGustCount = preset.gustSnowCount || Math.floor(preset.snowCount * 0.1);
    gustGeo.setDrawRange(0, activeGustCount);
    gustSpawnCursor = gustSpawnCursor % Math.max(1, activeGustCount);
  }

  return {
    points: group,
    update,
    setQuality,
    getGustStrength: () => currentGustStrength
  };
}
