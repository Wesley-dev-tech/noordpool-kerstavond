import * as THREE from 'three';
import { COLORS, GROUPS } from '../config.js';
import { createStripedPoleTexture, createSignTexture } from '../utils/procedural.js';

export function createNorthPole(scene, interaction, audio) {
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_NORTH_POLE;
  group.position.set(0, 0, 0);

  // 1. Stone / iced pedestal base
  const baseGeo = new THREE.CylinderGeometry(0.45, 0.58, 0.26, 24);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xd5e3f7,
    roughness: 0.45,
    metalness: 0.1
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.13;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Gold collar ring at base
  const ringGeo = new THREE.TorusGeometry(0.18, 0.04, 12, 24);
  ringGeo.rotateX(Math.PI / 2);
  const goldMat = new THREE.MeshStandardMaterial({
    color: COLORS.GOLD_METAL,
    roughness: 0.18,
    metalness: 0.88,
    emissive: 0x553300,
    emissiveIntensity: 0.25
  });
  const bottomRing = new THREE.Mesh(ringGeo, goldMat);
  bottomRing.position.y = 0.27;
  group.add(bottomRing);

  // 2. Red-white striped pole (height 3.6 m)
  const poleGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.6, 28);
  const poleMat = new THREE.MeshStandardMaterial({
    map: createStripedPoleTexture(),
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x000000,
    emissiveIntensity: 0
  });
  const poleMesh = new THREE.Mesh(poleGeo, poleMat);
  poleMesh.position.y = 1.85;
  poleMesh.castShadow = true;
  poleMesh.receiveShadow = true;
  group.add(poleMesh);

  // Top gold collar + shiny golden sphere
  const topRing = new THREE.Mesh(ringGeo, goldMat);
  topRing.position.y = 3.62;
  group.add(topRing);

  const orbMat = goldMat.clone();
  const orbGeo = new THREE.SphereGeometry(0.24, 28, 20);
  const orbMesh = new THREE.Mesh(orbGeo, orbMat);
  orbMesh.position.y = 3.84;
  orbMesh.castShadow = true;
  group.add(orbMesh);

  // 3. Main Sign: "NOORDPOOL · 90° N"
  const mainSignTex = createSignTexture('NOORDPOOL', '90° 00\' 00" N');
  const mainSignMat = new THREE.MeshStandardMaterial({
    map: mainSignTex,
    roughness: 0.55,
    metalness: 0.1,
    emissive: 0x221100,
    emissiveIntensity: 0.25
  });
  const mainSignGeo = new THREE.BoxGeometry(1.35, 0.42, 0.07);
  const mainSignMesh = new THREE.Mesh(mainSignGeo, mainSignMat);
  mainSignMesh.position.set(0, 2.95, 0.18);
  mainSignMesh.castShadow = true;
  group.add(mainSignMesh);

  // 4. Directional Arrow Signs
  const dirConfigs = [
    { text: 'WERKPLAATS', sub: '← 12 m', y: 2.42, rotY: 0.55 },
    { text: 'LAPLAND', sub: '2650 km →', y: 2.12, rotY: -0.75 },
    { text: 'STERRENWACHT', sub: '40 m ↗', y: 1.82, rotY: 1.85 }
  ];

  dirConfigs.forEach((cfg) => {
    const tex = createSignTexture(cfg.text, cfg.sub, '#5c341b', '#fff5dc');
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.6,
      metalness: 0.08
    });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.26, 0.05), mat);
    signBoard.position.set(0.36, cfg.y, 0);
    signBoard.castShadow = true;

    const pivot = new THREE.Group();
    pivot.rotation.y = cfg.rotY;
    pivot.add(signBoard);
    group.add(pivot);
  });

  // Pulse timer on click
  let highlightTimer = 0;
  const tooltipWorldPos = new THREE.Vector3(0, 4.35, 0);

  if (interaction) {
    interaction.registerClickable(group, {
      id: 'northPole',
      label: 'Noordpoolpaal (90° N)',
      glowMeshes: [orbMesh, mainSignMesh, poleMesh],
      focusTarget: new THREE.Vector3(0, 2.15, 0),
      focusDistance: 4.2,
      focusHeightOffset: 0.4,
      onClick: () => {
        highlightTimer = 3.0;
        interaction.showTooltip('90°00\'00" N — Geografische Noordpool', tooltipWorldPos, 4.0);
        if (audio) audio.playChime(1.25);
      }
    });
  }

  function update(delta, elapsed) {
    if (highlightTimer > 0) {
      highlightTimer = Math.max(0, highlightTimer - delta);
      orbMat.emissive.setHex(0xffbb22);
      orbMat.emissiveIntensity = 1.2 + Math.sin(elapsed * 12.0) * 0.6;
    } else {
      orbMat.emissive.setHex(0x664400);
      orbMat.emissiveIntensity = 0.35 + Math.sin(elapsed * 2.5) * 0.1;
    }
  }

  scene.add(group);
  return { group, update };
}
