import * as THREE from 'three';
import { COLORS, COORDS, GROUPS } from '../config.js';
import { getTerrainHeight } from '../utils/procedural.js';

export function createGifts(scene, interaction, audio) {
  const OPEN_DURATION = 5.0; // Seconds before an opened gift closes again
  const group = new THREE.Group();
  group.name = GROUPS.GROUP_GIFTS;
  scene.add(group);

  // Reusable Confetti Pool (80 instanced flakes)
  const CONFETTI_COUNT = 80;
  const confGeo = new THREE.PlaneGeometry(0.07, 0.045);
  const confMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const instConfetti = new THREE.InstancedMesh(confGeo, confMat, CONFETTI_COUNT);
  group.add(instConfetti);

  const confData = [];
  const dummy = new THREE.Object3D();
  const tempColor = new THREE.Color();

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    confData.push({
      active: false,
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: Math.random() * 6,
      ry: Math.random() * 6,
      life: 0
    });
    dummy.position.set(0, -10, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    instConfetti.setMatrixAt(i, dummy.matrix);
    tempColor.setHex(COLORS.BULB_PALETTE[i % COLORS.BULB_PALETTE.length]);
    instConfetti.setColorAt(i, tempColor);
  }

  function triggerConfettiBurst(originX, originY, originZ) {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const c = confData[i];
      c.active = true;
      c.life = 2.2;
      c.x = originX + (Math.random() - 0.5) * 0.25;
      c.y = originY + 0.35;
      c.z = originZ + (Math.random() - 0.5) * 0.25;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.1 + Math.random() * 2.2;
      c.vx = Math.cos(angle) * speed;
      c.vy = 2.8 + Math.random() * 2.6;
      c.vz = Math.sin(angle) * speed;
    }
  }

  const giftStates = [];

  COORDS.gifts.forEach((cfg, idx) => {
    const s = cfg.size;
    const groundY = getTerrainHeight(cfg.x, cfg.z);

    const giftGroup = new THREE.Group();
    giftGroup.position.set(cfg.x, groundY, cfg.z);
    giftGroup.rotation.y = cfg.rotY;
    group.add(giftGroup);

    const boxMat = new THREE.MeshStandardMaterial({
      color: cfg.boxColor,
      roughness: 0.4,
      metalness: 0.15,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: cfg.ribbonColor,
      roughness: 0.25,
      metalness: 0.65,
      emissive: 0x000000,
      emissiveIntensity: 0
    });

    // Base box + vertical ribbons
    const baseBox = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.82, s), boxMat);
    baseBox.position.y = s * 0.41;
    baseBox.castShadow = true;
    baseBox.receiveShadow = true;
    giftGroup.add(baseBox);

    const vRib1 = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, s * 0.83, s * 0.18), ribbonMat);
    vRib1.position.y = s * 0.41;
    giftGroup.add(vRib1);

    const vRib2 = new THREE.Mesh(new THREE.BoxGeometry(s * 0.18, s * 0.83, s * 1.02), ribbonMat);
    vRib2.position.y = s * 0.41;
    giftGroup.add(vRib2);

    // Inner glowing surprise core when opened
    const innerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(s * 0.28, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffee77, toneMapped: false })
    );
    innerGlow.position.y = s * 0.45;
    innerGlow.scale.setScalar(0.01);
    giftGroup.add(innerGlow);

    // Hinged Lid Pivot
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, s * 0.82, -s * 0.5);
    giftGroup.add(lidPivot);

    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(s * 1.06, s * 0.2, s * 1.06), boxMat);
    lidMesh.position.set(0, s * 0.1, s * 0.5);
    lidMesh.castShadow = true;
    lidPivot.add(lidMesh);

    const bowLoop = new THREE.Mesh(new THREE.TorusGeometry(s * 0.16, s * 0.045, 8, 16), ribbonMat);
    bowLoop.position.set(0, s * 0.25, s * 0.5);
    lidPivot.add(bowLoop);

    const state = {
      giftGroup,
      lidPivot,
      innerGlow,
      size: s,
      groundY,
      isOpen: false,
      openTimer: 0,
      lidAngle: 0,
      glowProgress: 0,
      bounceTime: 0,
      closeBounceTime: 0,
      tooltipPos: new THREE.Vector3(cfg.x, groundY + s + 0.65, cfg.z)
    };
    giftStates.push(state);

    if (interaction) {
      interaction.registerClickable(giftGroup, {
        id: `gift_${idx}`,
        label: `Cadeau #${idx + 1}`,
        glowMeshes: [baseBox, lidMesh, bowLoop],
        focusTarget: new THREE.Vector3(cfg.x, groundY + s * 0.5, cfg.z),
        focusDistance: 2.2,
        focusHeightOffset: 0.65,
        onClick: () => {
          if (state.isOpen) return;
          state.isOpen = true;
          state.openTimer = OPEN_DURATION;
          state.bounceTime = 0.65;
          state.closeBounceTime = 0;
          triggerConfettiBurst(cfg.x, groundY + s * 0.6, cfg.z);
          interaction.showTooltip(`Cadeau #${idx + 1} geopend! 🎉`, state.tooltipPos, 2.8);
          if (audio) audio.playChime(1.1 + idx * 0.12);
        }
      });
    }
  });

  function update(delta, elapsed) {
    // Update Gift Lids, Inner Glow & Bounce
    for (let i = 0; i < giftStates.length; i++) {
      const st = giftStates[i];
      if (st.isOpen) {
        st.openTimer -= delta;
        if (st.openTimer <= 0) {
          st.openTimer = 0;
          st.isOpen = false;
          st.closeBounceTime = 0.3;
        }
      }

      const targetAngle = st.isOpen ? -1.95 : 0;
      st.lidAngle += (targetAngle - st.lidAngle) * Math.min(1, delta * 9.0);
      st.lidPivot.rotation.x = st.lidAngle;

      // Animate glowing surprise core rising when open and retracting when closing
      const targetGlow = st.isOpen ? 1.0 : 0.0;
      st.glowProgress += (targetGlow - st.glowProgress) * Math.min(1, delta * 8.0);
      const pulse = st.isOpen ? 1.0 + Math.sin(elapsed * 6.0 + i) * 0.12 : 1.0;
      st.innerGlow.scale.setScalar(Math.max(0.01, st.glowProgress * pulse));
      st.innerGlow.position.y = st.size * (0.45 + st.glowProgress * 0.48);

      if (st.bounceTime > 0) {
        st.bounceTime = Math.max(0, st.bounceTime - delta);
        const b = Math.sin((0.65 - st.bounceTime) * Math.PI * 3.0) * 0.18;
        st.giftGroup.position.y = st.groundY + Math.max(0, b);
      } else if (st.closeBounceTime > 0) {
        st.closeBounceTime = Math.max(0, st.closeBounceTime - delta);
        const b = Math.sin((0.3 - st.closeBounceTime) / 0.3 * Math.PI) * 0.05;
        st.giftGroup.position.y = st.groundY + Math.max(0, b);
      } else {
        st.giftGroup.position.y = st.groundY;
      }
    }

    // Update Confetti Particles
    let anyActive = false;
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const c = confData[i];
      if (!c.active) continue;
      anyActive = true;

      c.life -= delta;
      if (c.life <= 0 || c.y < 0) {
        c.active = false;
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        instConfetti.setMatrixAt(i, dummy.matrix);
        continue;
      }

      c.vy -= 6.8 * delta; // Gravity
      c.x += c.vx * delta;
      c.y += c.vy * delta;
      c.z += c.vz * delta;
      c.rx += delta * 8.0;
      c.ry += delta * 6.5;

      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(c.rx, c.ry, elapsed * 4.0);
      dummy.scale.setScalar(Math.min(1, c.life * 1.5));
      dummy.updateMatrix();
      instConfetti.setMatrixAt(i, dummy.matrix);
    }

    if (anyActive) {
      instConfetti.instanceMatrix.needsUpdate = true;
    }
  }

  return { group, update };
}
