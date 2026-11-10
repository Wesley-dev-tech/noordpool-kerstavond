import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS, COORDS, GROUPS } from '../config.js';
import {
  fbm2D,
  getGroundHeight,
  getTerrainHeight,
  createSnowNormalAndSparkleMaps,
  createIceLakeTextures
} from '../utils/procedural.js';

function createIrregularSnowBanksGeometry(lakeX, lakeZ, rx, rz) {
  const geometries = [];
  const moundCount = 34;

  for (let i = 0; i < moundCount; i++) {
    const baseAngle = (i / moundCount) * Math.PI * 2;
    const angleJitter = fbm2D(i * 1.7, 3.1, 2) * 0.09;
    const angle = baseAngle + angleJitter;

    // Organic shoreline radius variation matching the deformed ice edge
    const edgeWave =
      fbm2D(Math.cos(angle) * 2.2, Math.sin(angle) * 2.2, 3) * 0.36 +
      Math.sin(angle * 3.0 + 0.7) * 0.14;
    const radialOffset = -0.08 + edgeWave + (i % 3 === 0 ? 0.14 : -0.05);

    const cx = lakeX + Math.cos(angle) * (rx + radialOffset);
    const cz = lakeZ + Math.sin(angle) * (rz + radialOffset * 0.85);

    const radiusTangential = 0.68 + (fbm2D(i * 2.3, 8.4, 2) * 0.5 + 0.5) * 0.65;
    const radiusRadial = 0.42 + (fbm2D(i * 3.1, 1.9, 2) * 0.5 + 0.5) * 0.48;
    const moundHeight = 0.14 + Math.pow(fbm2D(i * 1.3 + 5, i * 0.9, 3) * 0.5 + 0.5, 1.3) * 0.34;

    const g = new THREE.SphereGeometry(1, 12, 9);
    const pos = g.attributes.position;

    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);

    for (let v = 0; v < pos.count; v++) {
      let vx = pos.getX(v);
      let vy = pos.getY(v);
      let vz = pos.getZ(v);

      // Flatten bottom half so mounds sit solidly in the snow terrain
      if (vy < 0) {
        vy *= 0.25;
      } else {
        // Slightly wind-sculpted asymmetric peak
        vy = Math.pow(vy, 0.85);
      }

      // Scale into an elongated drift oriented along the lake shore
      let lx = vx * radiusRadial;
      let lz = vz * radiusTangential;
      let ly = vy * moundHeight;

      // Rotate to align with shoreline tangent
      const wx = cx + (lx * cosA - lz * sinA);
      const wz = cz + (lx * sinA + lz * cosA);

      // Add fine 3D procedural snow lumpiness
      const lump =
        fbm2D(wx * 1.6 + vy * 0.8, wz * 1.6, 3) * 0.11 * Math.max(0.15, vy + 0.3);
      const baseH = Math.max(0, getTerrainHeight(wx, wz));
      const wy = baseH - 0.03 + ly + lump;

      pos.setXYZ(v, wx, wy, wz);
    }

    geometries.push(g);
  }

  // Secondary smaller snow piles & drifts scattered slightly further out/in for natural transition
  const accentCount = 18;
  for (let j = 0; j < accentCount; j++) {
    const angle = (j / accentCount) * Math.PI * 2 + 0.19;
    const inout = j % 2 === 0 ? 0.42 : -0.22;
    const cx = lakeX + Math.cos(angle) * (rx + inout);
    const cz = lakeZ + Math.sin(angle) * (rz + inout * 0.85);

    const rScale = 0.32 + (j % 4) * 0.09;
    const hScale = 0.11 + (j % 3) * 0.06;

    const g = new THREE.SphereGeometry(1, 10, 7);
    const pos = g.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      let vy = pos.getY(v);
      const vz = pos.getZ(v);
      if (vy < 0) vy *= 0.2;

      const wx = cx + vx * rScale * 1.25;
      const wz = cz + vz * rScale;
      const lump = fbm2D(wx * 2.1, wz * 2.1, 2) * 0.05;
      const wy = Math.max(0, getTerrainHeight(wx, wz)) - 0.02 + vy * hScale + lump;
      pos.setXYZ(v, wx, wy, wz);
    }
    geometries.push(g);
  }

  const merged = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();
  merged.computeVertexNormals();
  return merged;
}

function createMountainRangeGeometry({
  innerRadius,
  outerRadius,
  radialSegments,
  heightSegments,
  minPeakHeight,
  maxPeakHeight,
  seedOffset,
  ridgeSharpness
}) {
  const geo = new THREE.CylinderGeometry(
    outerRadius,
    innerRadius,
    1.0,
    radialSegments,
    heightSegments,
    true
  );

  const pos = geo.attributes.position;
  const ridgeHeights = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // -0.5 .. +0.5
    const z = pos.getZ(i);

    const vNorm = y + 0.5; // 0 at base, 1 at ridge crest
    const angle = Math.atan2(z, x);
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);

    // Ridged multifractal noise for authentic jagged Arctic mountain peaks
    const n1 = 1.0 - Math.abs(fbm2D(nx * 2.6 + seedOffset, nz * 2.6 + seedOffset, 4));
    const n2 = 1.0 - Math.abs(fbm2D(nx * 5.8 - seedOffset * 1.4, nz * 5.8 + seedOffset * 0.9, 3));
    const n3 = fbm2D(nx * 11.5 + seedOffset * 2.1, nz * 11.5 - seedOffset, 2) * 0.5 + 0.5;

    const ridged = Math.pow(Math.max(0.0, n1), ridgeSharpness) * 0.68 +
                   Math.pow(Math.max(0.0, n2), ridgeSharpness * 1.15) * 0.24 +
                   n3 * 0.08;

    // Scenic massifs around the horizon with natural valleys/passes between ranges
    const massifEnvelope =
      0.58 +
      0.24 * Math.cos(angle * 3.0 - seedOffset * 0.8) +
      0.18 * Math.sin(angle * 5.0 + seedOffset * 1.3);

    const peakH =
      minPeakHeight +
      (maxPeakHeight - minPeakHeight) * Math.min(1.15, ridged * massifEnvelope * 1.35);

    // Radial undulation so slopes advance and recede organically in 3D
    const radialSlopeOffset =
      fbm2D(nx * 3.8 + vNorm * 1.4 + seedOffset, nz * 3.8 - vNorm * 1.4, 3) * 4.2 * (1.0 - vNorm * 0.45);
    const currentRadius =
      innerRadius + (outerRadius - innerRadius) * vNorm + radialSlopeOffset;

    const wx = nx * currentRadius;
    const wz = nz * currentRadius;

    // Slight craggy displacement along the slopes
    const slopeCrag =
      fbm2D(wx * 0.08 + seedOffset, wz * 0.08 + vNorm * 3.0, 2) * 0.85 * Math.sin(vNorm * Math.PI);
    const wy = -1.2 + vNorm * (peakH + 1.2) + slopeCrag;

    pos.setXYZ(i, wx, wy, wz);
    ridgeHeights[i] = peakH;
  }

  geo.setAttribute('aPeakHeight', new THREE.BufferAttribute(ridgeHeights, 1));
  geo.computeVertexNormals();
  return geo;
}

function createMountainSilhouetteMaterial({
  silhouetteColor,
  ridgeTintColor,
  mistColor,
  mistTopY,
  atmosphereMix
}) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    depthWrite: true,
    transparent: false,
    fog: false,
    uniforms: {
      uSilhouetteColor: { value: new THREE.Color(silhouetteColor) },
      uRidgeTintColor: { value: new THREE.Color(ridgeTintColor) },
      uMistColor: { value: new THREE.Color(mistColor) },
      uMistGlowColor: { value: new THREE.Color(0x0d2146) },
      uMoonDir: {
        value: new THREE.Vector3(COORDS.moon.x, COORDS.moon.y, COORDS.moon.z).normalize()
      },
      uMistTopY: { value: mistTopY },
      uAtmosphereMix: { value: atmosphereMix }
    },
    vertexShader: `
      attribute float aPeakHeight;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      varying float vPeakHeight;
      void main() {
        vUv = uv;
        vPeakHeight = aPeakHeight;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uSilhouetteColor;
      uniform vec3 uRidgeTintColor;
      uniform vec3 uMistColor;
      uniform vec3 uMistGlowColor;
      uniform vec3 uMoonDir;
      uniform float uMistTopY;
      uniform float uAtmosphereMix;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      varying float vPeakHeight;

      void main() {
        vec3 n = normalize(vWorldNormal);
        float hRatio = clamp(vWorldPos.y / max(1.0, vPeakHeight), 0.0, 1.0);

        // Subtle lunar rim & snow-dusted upper ridge illumination facing the moon
        float moonFacing = max(0.0, dot(n, uMoonDir));
        float ridgeCrest = smoothstep(0.55, 0.98, vUv.y);
        float snowStriation = 0.5 + 0.5 * sin(vWorldPos.x * 0.22 + vWorldPos.z * 0.19 + vWorldPos.y * 0.85);
        float lunarHighlight = (pow(moonFacing, 2.2) * 0.55 + ridgeCrest * 0.45) *
                               smoothstep(0.28, 0.92, hRatio) *
                               (0.65 + 0.35 * snowStriation);

        vec3 mountainCol = mix(uSilhouetteColor, uRidgeTintColor, clamp(lunarHighlight, 0.0, 1.0));
        // Blend slightly with deep atmospheric night blue for distant depth perspective
        mountainCol = mix(mountainCol, uMistGlowColor, uAtmosphereMix * (1.0 - ridgeCrest * 0.45));

        // Undulating ground mist at the base of the mountains so they rise seamlessly out of the fog
        float mistWave = sin(vWorldPos.x * 0.07 + vWorldPos.z * 0.06) * 0.65 +
                         cos(vWorldPos.x * 0.15 - vWorldPos.z * 0.13) * 0.35;
        float effectiveY = vWorldPos.y - mistWave * 0.75;

        // Dense mist at base (y <= 0.8), smoothly clearing toward upper peaks
        float baseMist = 1.0 - smoothstep(0.4, uMistTopY, effectiveY);
        baseMist = pow(clamp(baseMist, 0.0, 1.0), 1.35);

        vec3 mistBlendCol = mix(uMistGlowColor, uMistColor, smoothstep(uMistTopY, 0.0, effectiveY));
        vec3 finalCol = mix(mountainCol, mistBlendCol, baseMist);

        gl_FragColor = vec4(finalCol, 1.0);
      }
    `
  });
}

function createHorizonMistLayer() {
  const geo = new THREE.CylinderGeometry(84, 44, 12.0, 96, 16, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // -6 .. +6
    const z = pos.getZ(i);
    const t = (y + 6.0) / 12.0; // 0 at inner snow ground, 1 at outer horizon
    const angle = Math.atan2(z, x);
    const r = 42.0 + t * 44.0 + Math.sin(angle * 4.0) * 1.8;
    const wy = -0.6 + Math.pow(t, 1.15) * 9.2;
    pos.setXYZ(i, Math.cos(angle) * r, wy, Math.sin(angle) * r);
  }
  geo.computeVertexNormals();

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uMistColor: { value: new THREE.Color(COLORS.FOG_COLOR) },
      uMistHighlight: { value: new THREE.Color(0x132c5c) }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uMistColor;
      uniform vec3 uMistHighlight;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        // Vertical bell-curve fade so mist hugs the horizon & ground seamlessly
        float fadeBottom = smoothstep(0.0, 0.28, vUv.y);
        float fadeTop = 1.0 - smoothstep(0.42, 1.0, vUv.y);
        float verticalEnvelope = fadeBottom * fadeTop;

        // Multi-layered drifting Arctic mist wisps
        float angle = atan(vWorldPos.z, vWorldPos.x);
        float wisp1 = 0.5 + 0.5 * sin(angle * 7.0 + uTime * 0.12 + vUv.y * 4.5);
        float wisp2 = 0.5 + 0.5 * cos(angle * 13.0 - uTime * 0.09 - vUv.y * 6.0);
        float wisp3 = 0.5 + 0.5 * sin(vWorldPos.x * 0.08 + vWorldPos.z * 0.08 + uTime * 0.15);
        float mistDensity = 0.52 + 0.48 * (wisp1 * 0.45 + wisp2 * 0.35 + wisp3 * 0.20);

        vec3 col = mix(uMistColor, uMistHighlight, wisp1 * 0.38 * (1.0 - vUv.y * 0.5));
        float alpha = verticalEnvelope * mistDensity * 0.72;
        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  mesh.onBeforeRender = () => {
    mat.uniforms.uTime.value = performance.now() * 0.001;
  };
  return mesh;
}

export function createTerrain(scene, interaction = null) {
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_TERRAIN;

  const geo = new THREE.PlaneGeometry(210, 210, 160, 160);
  geo.rotateX(-Math.PI / 2);

  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, getGroundHeight(x, z));
  }
  geo.computeVertexNormals();

  const { normalMap, roughnessMap } = createSnowNormalAndSparkleMaps();

  const snowMat = new THREE.MeshStandardMaterial({
    color: COLORS.SNOW_BASE,
    emissive: COLORS.SNOW_SHADOW_EMISSIVE,
    emissiveIntensity: 0.28,
    roughness: 0.72,
    metalness: 0.05,
    normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap
  });

  // Seamless radial ground-to-horizon mist transition so snow dissolves into the sky
  snowMat.onBeforeCompile = (shader) => {
    shader.uniforms.uHorizonMistColor = { value: new THREE.Color(COLORS.FOG_COLOR) };
    shader.uniforms.uHorizonGlowColor = { value: new THREE.Color(0x0d2146) };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSnowWorldPos;`
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vSnowWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uHorizonMistColor;
        uniform vec3 uHorizonGlowColor;
        varying vec3 vSnowWorldPos;`
      )
      .replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
        {
          float radialDist = length(vSnowWorldPos.xz);
          float mistWave = sin(vSnowWorldPos.x * 0.09 + vSnowWorldPos.z * 0.07) * 2.2;
          float groundMistFactor = smoothstep(28.0, 68.0, radialDist + mistWave);
          vec3 targetMist = mix(uHorizonGlowColor, uHorizonMistColor, smoothstep(42.0, 72.0, radialDist));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, targetMist, groundMistFactor);
        }`
      );
  };

  const terrainMesh = new THREE.Mesh(geo, snowMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Realistic frozen ice lake with dark glossy undertone, procedural cracks & moon reflection
  const lakeRadius = 5.65;
  const scaleX = 1.3;
  const scaleZ = 0.85;
  const iceGeo = new THREE.CircleGeometry(lakeRadius, 64);
  iceGeo.rotateX(-Math.PI / 2);

  // Deform outer perimeter slightly so the lake contour matches the organic snow banks
  const icePos = iceGeo.attributes.position;
  for (let i = 0; i < icePos.count; i++) {
    const x = icePos.getX(i);
    const z = icePos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.1) {
      const ang = Math.atan2(z, x);
      const edgeFactor = Math.min(1, r / lakeRadius);
      const wave =
        1.0 +
        (fbm2D(Math.cos(ang) * 2.2, Math.sin(ang) * 2.2, 3) * 0.065 +
          Math.sin(ang * 3.0 + 0.7) * 0.025) *
          edgeFactor;
      icePos.setX(i, x * scaleX * wave);
      icePos.setZ(i, z * scaleZ * wave);
    }
  }
  iceGeo.computeVertexNormals();

  const {
    map: iceMap,
    roughnessMap: iceRoughnessMap,
    normalMap: iceNormalMap
  } = createIceLakeTextures();

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xa8d8ff,
    map: iceMap,
    roughness: 0.06,
    roughnessMap: iceRoughnessMap,
    metalness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.025,
    reflectivity: 0.95,
    ior: 1.31,
    normalMap: iceNormalMap,
    normalScale: new THREE.Vector2(0.22, 0.22)
  });

  iceMat.onBeforeCompile = (shader) => {
    shader.uniforms.uMoonPos = {
      value: new THREE.Vector3(COORDS.moon.x, COORDS.moon.y, COORDS.moon.z)
    };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vIceWorldPos;`
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vIceWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uMoonPos;
        varying vec3 vIceWorldPos;`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 worldNormal = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
          // Anchored virtual camera keeps the reflected moon framed on the lake while preserving parallax
          vec3 virtCam = mix(vec3(6.8, 7.6, 14.2), cameraPosition, 0.42);
          vec3 viewDir = normalize(vIceWorldPos - virtCam);
          vec3 reflNormal = normalize(vec3(worldNormal.x * 1.45, worldNormal.y, worldNormal.z * 1.45));
          vec3 reflDir = reflect(viewDir, reflNormal);
          vec3 moonDir = normalize(uMoonPos - vIceWorldPos);

          float alignment = max(0.0, dot(reflDir, moonDir));
          float angDist = acos(clamp(alignment, -1.0, 1.0));

          // Crisp lunar orb reflection distorted by ice ripples and cracks + soft blue halo
          float moonDisc = smoothstep(0.052, 0.018, angDist);
          float moonInnerHalo = pow(alignment, 46.0) * 0.65;
          float moonOuterHalo = pow(alignment, 10.0) * 0.24;

          // Direct view-dependent specular shimmer across the ice fractures
          vec3 realViewDir = normalize(vIceWorldPos - cameraPosition);
          vec3 realRefl = reflect(realViewDir, worldNormal);
          float specShimmer = pow(max(0.0, dot(realRefl, moonDir)), 85.0) * 0.85;

          float iceGlossMask = clamp(1.0 - (roughnessFactor - 0.02) * 1.7, 0.15, 1.0);
          float crackGlint = smoothstep(0.04, 0.16, diffuseColor.g) * pow(alignment, 12.0) * 0.45;

          vec3 moonReflection =
            vec3(0.92, 0.97, 1.0) * (moonDisc * 1.55 + specShimmer) +
            vec3(0.40, 0.72, 1.0) * (moonInnerHalo + moonOuterHalo) +
            vec3(0.55, 0.86, 1.0) * crackGlint * 0.22;

          reflectedLight.directSpecular += moonReflection * iceGlossMask;
        }`
      );
  };

  const iceMesh = new THREE.Mesh(iceGeo, iceMat);
  iceMesh.position.set(COORDS.iceLake.x, COORDS.iceLake.y, COORDS.iceLake.z);
  iceMesh.receiveShadow = true;
  group.add(iceMesh);

  // Irregular snow mounds and wind-blown drifts around the frozen lake perimeter
  const snowBanksGeo = createIrregularSnowBanksGeometry(
    COORDS.iceLake.x,
    COORDS.iceLake.z,
    lakeRadius * scaleX * 0.97,
    lakeRadius * scaleZ * 0.97
  );
  const snowBanksMesh = new THREE.Mesh(snowBanksGeo, snowMat);
  snowBanksMesh.castShadow = true;
  snowBanksMesh.receiveShadow = true;
  group.add(snowBanksMesh);

  // Nearer Arctic foothill ridges emerging from the ground mist
  const nearMountainsGeo = createMountainRangeGeometry({
    innerRadius: 62,
    outerRadius: 72,
    radialSegments: 180,
    heightSegments: 18,
    minPeakHeight: 4.2,
    maxPeakHeight: 12.8,
    seedOffset: 3.7,
    ridgeSharpness: 1.85
  });
  const nearMountainsMat = createMountainSilhouetteMaterial({
    silhouetteColor: 0x050d20,
    ridgeTintColor: 0x1e3f73,
    mistColor: COLORS.FOG_COLOR,
    mistTopY: 4.8,
    atmosphereMix: 0.22
  });
  const nearMountainsMesh = new THREE.Mesh(nearMountainsGeo, nearMountainsMat);
  group.add(nearMountainsMesh);

  // Distant jagged Arctic mountain silhouettes on the outer horizon
  const farMountainsGeo = createMountainRangeGeometry({
    innerRadius: 82,
    outerRadius: 95,
    radialSegments: 220,
    heightSegments: 22,
    minPeakHeight: 8.0,
    maxPeakHeight: 22.5,
    seedOffset: 11.4,
    ridgeSharpness: 2.35
  });
  const farMountainsMat = createMountainSilhouetteMaterial({
    silhouetteColor: 0x020612,
    ridgeTintColor: 0x16325e,
    mistColor: COLORS.FOG_COLOR,
    mistTopY: 6.4,
    atmosphereMix: 0.35
  });
  const farMountainsMesh = new THREE.Mesh(farMountainsGeo, farMountainsMat);
  group.add(farMountainsMesh);

  // Soft drifting ground mist layer bridging snow terrain, mountain bases, and night sky
  const horizonMistMesh = createHorizonMistLayer();
  group.add(horizonMistMesh);

  if (interaction && interaction.registerFocusable) {
    const lakeFocusConfig = {
      id: 'iceLake',
      label: 'Bevroren Noordpoolmeer ❄️',
      focusTarget: new THREE.Vector3(COORDS.iceLake.x, 0.15, COORDS.iceLake.z),
      focusDistance: 6.8,
      focusHeightOffset: 1.85
    };
    interaction.registerFocusable(iceMesh, lakeFocusConfig);
    interaction.registerFocusable(snowBanksMesh, lakeFocusConfig);
  }

  scene.add(group);
  return { group, iceMesh, nearMountainsMesh, farMountainsMesh, horizonMistMesh };
}
