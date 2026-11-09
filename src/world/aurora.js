import * as THREE from 'three';
import { COLORS, GROUPS } from '../config.js';

export function createAurora(scene) {
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_AURORA;

  function buildRibbon(radius, heightY, ribbonHeight, arcAngle, phaseOffset) {
    const segsX = 96;
    const segsY = 16;
    const geo = new THREE.PlaneGeometry(140, ribbonHeight, segsX, segsY);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = x / 140; // -0.5 .. 0.5
      const angle = u * arcAngle;
      const cx = Math.sin(angle) * radius;
      const cz = -Math.cos(angle) * radius;
      // Curve slightly downward toward the outer horizon edges for a natural sky arch
      const archDrop = (1.0 - Math.cos(angle * 0.85)) * 4.5;
      pos.setXYZ(i, cx, heightY + y - archDrop, cz);
    }
    geo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uPhase: { value: phaseOffset },
        uColorGreen: { value: new THREE.Color(COLORS.AURORA_GREEN) },
        uColorPurple: { value: new THREE.Color(COLORS.AURORA_PURPLE) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPhase;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float wave1 = sin(uv.x * 14.0 + uTime * 0.65 + uPhase) * 3.2;
          float wave2 = cos(uv.x * 27.0 - uTime * 0.45 + uPhase * 1.7) * 1.5;
          p.z += (wave1 + wave2) * (0.3 + uv.y * 0.7);
          p.x += sin(uv.y * 4.0 + uTime * 0.5) * 1.4;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform vec3 uColorGreen;
        uniform vec3 uColorPurple;
        varying vec2 vUv;
        void main() {
          float edgeFadeX = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
          float edgeFadeY = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.35, vUv.y);

          float curtain = 0.5 + 0.5 * sin(vUv.x * 55.0 + uTime * 1.1 + sin(vUv.x * 18.0 - uTime * 0.7) * 2.5 + uPhase);
          curtain = pow(curtain, 1.6);

          vec3 col = mix(uColorGreen, uColorPurple, smoothstep(0.25, 0.88, vUv.y));
          float alpha = edgeFadeX * edgeFadeY * (0.22 + 0.55 * curtain);
          gl_FragColor = vec4(col, alpha * 0.65);
        }
      `
    });

    return { mesh: new THREE.Mesh(geo, mat), mat };
  }

  const r1 = buildRibbon(64, 15.0, 14.5, Math.PI * 0.76, 0.0);
  const r2 = buildRibbon(72, 18.5, 13.0, Math.PI * 0.68, 2.4);
  group.add(r1.mesh, r2.mesh);

  function update(delta, elapsed) {
    r1.mat.uniforms.uTime.value = elapsed;
    r2.mat.uniforms.uTime.value = elapsed;
  }

  scene.add(group);
  return { group, update };
}
