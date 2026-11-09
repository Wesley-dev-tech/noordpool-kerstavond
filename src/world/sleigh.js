import * as THREE from 'three';
import { COLORS, COORDS, GROUPS, QUALITY_PRESETS } from '../config.js';
import { createSnowflakeSprite } from '../utils/procedural.js';

export function createSleigh(scene, initialPreset = QUALITY_PRESETS.high, interaction = null, audio = null) {
  const rootGroup = new THREE.Group();
  rootGroup.name = GROUPS.GROUP_SLEIGH;
  scene.add(rootGroup);

  const curvePoints = COORDS.sleighCurvePoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const flightCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'catmullrom', 0.5);

  // Materials
  const redSleighMat = new THREE.MeshStandardMaterial({
    color: COLORS.POLE_RED,
    roughness: 0.32,
    metalness: 0.25,
    emissive: 0x330505,
    emissiveIntensity: 0.35
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: COLORS.GOLD_METAL,
    roughness: 0.2,
    metalness: 0.88,
    emissive: 0x664400,
    emissiveIntensity: 0.4
  });
  const furWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: 0.8 });
  const sackMat = new THREE.MeshStandardMaterial({ color: 0x8c5832, roughness: 0.85 });
  const deerFurMat = new THREE.MeshStandardMaterial({ color: 0x6e4323, roughness: 0.78 });
  const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd8c3a5, roughness: 0.65 });

  // 1. Sleigh & Santa Mesh Group
  const sleighCarriage = new THREE.Group();
  rootGroup.add(sleighCarriage);

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 1.85), redSleighMat);
  bodyMesh.position.y = 0.45;
  sleighCarriage.add(bodyMesh);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 0.25), redSleighMat);
  backrest.position.set(0, 0.82, -0.78);
  backrest.rotation.x = -0.22;
  sleighCarriage.add(backrest);

  const frontHood = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.15, 12), redSleighMat);
  frontHood.rotation.z = Math.PI / 2;
  frontHood.position.set(0, 0.58, 0.92);
  sleighCarriage.add(frontHood);

  // Gold runners beneath sleigh
  [-0.48, 0.48].forEach((rx) => {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.35), goldMat);
    runner.position.set(rx, 0.06, 0.1);
    sleighCarriage.add(runner);

    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 16, Math.PI * 1.2), goldMat);
    curl.rotation.y = Math.PI / 2;
    curl.position.set(rx, 0.28, 1.25);
    sleighCarriage.add(curl);
  });

  // Gift sack at back of sleigh
  const sackMesh = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), sackMat);
  sackMesh.scale.set(1.0, 1.15, 0.95);
  sackMesh.position.set(0, 0.88, -0.35);
  sleighCarriage.add(sackMesh);

  // Santa Claus figure
  const santaTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.65, 12), redSleighMat);
  santaTorso.position.set(0, 0.92, 0.25);
  sleighCarriage.add(santaTorso);

  const santaHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.6 })
  );
  santaHead.position.set(0, 1.38, 0.25);
  sleighCarriage.add(santaHead);

  const santaBeard = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 10), furWhiteMat);
  santaBeard.rotation.x = Math.PI * 0.92;
  santaBeard.position.set(0, 1.26, 0.38);
  sleighCarriage.add(santaBeard);

  const santaHat = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.38, 10), redSleighMat);
  santaHat.rotation.x = -0.25;
  santaHat.position.set(0, 1.62, 0.2);
  sleighCarriage.add(santaHat);

  const pompon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), furWhiteMat);
  pompon.position.set(0, 1.79, 0.14);
  sleighCarriage.add(pompon);

  // Warm lantern glow under sleigh
  const sleighGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffdd66).multiplyScalar(1.46),
      toneMapped: false
    })
  );
  sleighGlow.position.set(0, 0.65, 1.12);
  sleighCarriage.add(sleighGlow);

  // Invisible raycast hitbox around sleigh for easy clicking in flight
  const hitBoxMat = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false
  });
  const sleighHitBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.3, 3.2), hitBoxMat);
  sleighHitBox.position.set(0, 0.9, 0.1);
  sleighCarriage.add(sleighHitBox);

  // 2. Build 6 Articulated Reindeer (3 pairs; front-right is Rudolph with glowing red nose)
  const deerList = [];
  const legGeo = new THREE.CylinderGeometry(0.032, 0.024, 0.42, 6);
  legGeo.translate(0, -0.21, 0);
  const deerHitGeo = new THREE.BoxGeometry(1.9, 1.6, 1.6);

  for (let i = 0; i < 6; i++) {
    const pairIdx = Math.floor(i / 2); // 0 = closest to sleigh, 2 = lead pair
    const side = i % 2 === 0 ? -0.45 : 0.45;
    const isRudolph = i === 5; // Lead right reindeer

    const deerGroup = new THREE.Group();
    rootGroup.add(deerGroup);

    if (i % 2 === 0) {
      const deerHitBox = new THREE.Mesh(deerHitGeo, hitBoxMat);
      deerHitBox.position.set(0, 0.65, 0.1);
      deerGroup.add(deerHitBox);
    }

    const deerInner = new THREE.Group();
    deerInner.position.x = side;
    deerGroup.add(deerInner);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.72), deerFurMat);
    torso.position.y = 0.48;
    deerInner.add(torso);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.36, 8), deerFurMat);
    neck.position.set(0, 0.7, 0.28);
    neck.rotation.x = 0.4;
    deerInner.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.3), deerFurMat);
    head.position.set(0, 0.86, 0.42);
    deerInner.add(head);

    // Antlers
    [-0.08, 0.08].forEach((ax) => {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.32, 5), antlerMat);
      antler.position.set(ax, 1.06, 0.36);
      antler.rotation.z = ax > 0 ? -0.35 : 0.35;
      antler.rotation.x = -0.2;
      deerInner.add(antler);
    });

    if (isRudolph) {
      const rudolphNose = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 12, 12),
        new THREE.MeshBasicMaterial({ color: COLORS.RUDOLPH_RED, toneMapped: false })
      );
      rudolphNose.position.set(0, 0.87, 0.6);
      deerInner.add(rudolphNose);
    }

    // 4 Articulated Legs
    const frontLeftLeg = new THREE.Mesh(legGeo, deerFurMat);
    frontLeftLeg.position.set(-0.1, 0.36, 0.24);
    const frontRightLeg = new THREE.Mesh(legGeo, deerFurMat);
    frontRightLeg.position.set(0.1, 0.36, 0.24);
    const backLeftLeg = new THREE.Mesh(legGeo, deerFurMat);
    backLeftLeg.position.set(-0.1, 0.36, -0.24);
    const backRightLeg = new THREE.Mesh(legGeo, deerFurMat);
    backRightLeg.position.set(0.1, 0.36, -0.24);

    deerInner.add(frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg);

    deerList.push({
      group: deerGroup,
      inner: deerInner,
      pairIdx,
      phaseOffset: i * 1.1,
      frontLeftLeg,
      frontRightLeg,
      backLeftLeg,
      backRightLeg
    });
  }

  // 3. Stardust Trail (Ring buffer of 120 golden glowing particles)
  const MAX_DUST = QUALITY_PRESETS.high.dustCount;
  let activeDustCount = initialPreset.dustCount;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(MAX_DUST * 3);
  const dustAges = new Float32Array(MAX_DUST);
  for (let i = 0; i < MAX_DUST; i++) {
    dustAges[i] = (i / MAX_DUST) * 2.0;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setDrawRange(0, activeDustCount);

  const dustMat = new THREE.PointsMaterial({
    map: createSnowflakeSprite(),
    color: 0xffdd66,
    size: 0.38,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  rootGroup.add(dustPoints);

  let spawnCursor = 0;
  let spawnAccum = 0;

  // Loop-de-loop state when sleigh is clicked
  const LOOP_DURATION = 1.85;
  const LOOP_RADIUS = 4.2;
  let loopElapsed = -1;

  // Pre-allocated scratch vectors for zero-allocation update loop
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  const curPos = new THREE.Vector3();
  const curTangent = new THREE.Vector3();
  const aheadTangent = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const currentSleighPos = new THREE.Vector3();
  const sleighBasePos = new THREE.Vector3();
  const sleighTangent = new THREE.Vector3();
  const sleighRight = new THREE.Vector3();
  const sleighUp = new THREE.Vector3();
  const loopPos = new THREE.Vector3();
  const tooltipPos = new THREE.Vector3();

  function triggerLoop() {
    if (loopElapsed < 0 || loopElapsed > LOOP_DURATION * 0.85) {
      loopElapsed = 0;
    }
    tooltipPos.copy(currentSleighPos);
    tooltipPos.y += 2.3;
    if (interaction) {
      interaction.showTooltip('Ho ho ho! 🎅 De arrenslee maakt een looping!', tooltipPos, 2.8);
    }
    if (audio) {
      audio.playChime(1.35);
    }
  }

  if (interaction) {
    interaction.registerClickable(rootGroup, {
      id: 'sleigh',
      label: 'Arrenslee van de Kerstman 🛷',
      glowMeshes: [bodyMesh, backrest, frontHood, santaTorso, santaHat],
      focusTarget: () => currentSleighPos.clone(),
      focusDistance: 6.8,
      focusHeightOffset: 1.4,
      onClick: triggerLoop
    });
  }

  function orientAlongCurve(objGroup, uParam) {
    const u = ((uParam % 1) + 1) % 1;
    const uAhead = (u + 0.012) % 1;

    flightCurve.getPointAt(u, curPos);
    flightCurve.getTangentAt(u, curTangent);
    flightCurve.getTangentAt(uAhead, aheadTangent);

    objGroup.position.copy(curPos);
    lookTarget.copy(curPos).add(curTangent);
    objGroup.lookAt(lookTarget);

    // Banking roll angle proportional to horizontal turn rate
    const crossY = curTangent.x * aheadTangent.z - curTangent.z * aheadTangent.x;
    const bankAngle = THREE.MathUtils.clamp(crossY * 4.2, -0.45, 0.45);
    objGroup.rotateZ(bankAngle);
  }

  function update(delta, elapsed) {
    const baseU = (elapsed * 0.036) % 1;

    let isLooping = false;
    let theta = 0;
    let loopBlend = 0;

    if (loopElapsed >= 0) {
      loopElapsed += delta;
      if (loopElapsed >= LOOP_DURATION) {
        loopElapsed = -1;
        sleighGlow.scale.setScalar(1.0);
      } else {
        isLooping = true;
        const p = loopElapsed / LOOP_DURATION;
        const easedP = p - (Math.sin(p * Math.PI * 2) / (Math.PI * 2)) * 0.28;
        theta = easedP * Math.PI * 2;
        loopBlend = Math.sin(p * Math.PI);
        sleighGlow.scale.setScalar(1.0 + loopBlend * 0.85);
      }
    }

    // Position Sleigh on base curve
    orientAlongCurve(sleighCarriage, baseU);
    sleighBasePos.copy(sleighCarriage.position);
    sleighTangent.copy(curTangent).normalize();
    sleighRight.crossVectors(sleighTangent, WORLD_UP).normalize();
    sleighUp.crossVectors(sleighRight, sleighTangent).normalize();

    if (isLooping) {
      const forwardOff = LOOP_RADIUS * Math.sin(theta);
      const upOff = LOOP_RADIUS * (1 - Math.cos(theta));
      sleighCarriage.position
        .copy(sleighBasePos)
        .addScaledVector(sleighTangent, forwardOff)
        .addScaledVector(sleighUp, upOff);
      sleighCarriage.rotateX(-theta);
    }

    currentSleighPos.copy(sleighCarriage.position);

    if (isLooping && interaction && interaction.getActiveTooltip) {
      const activeTip = interaction.getActiveTooltip();
      if (activeTip && activeTip.text.includes('looping')) {
        activeTip.worldPos.copy(currentSleighPos);
        activeTip.worldPos.y += 2.3;
      }
    }

    // Position & Animate 6 Reindeer
    for (let i = 0; i < deerList.length; i++) {
      const d = deerList[i];
      const deerU = baseU + 0.022 + d.pairIdx * 0.02;
      orientAlongCurve(d.group, deerU);

      if (isLooping) {
        const distAhead = d.group.position.distanceTo(sleighBasePos);
        const deerTheta = theta + (distAhead / LOOP_RADIUS) * loopBlend;
        const dForward = LOOP_RADIUS * Math.sin(deerTheta);
        const dUp = LOOP_RADIUS * (1 - Math.cos(deerTheta));
        loopPos
          .copy(sleighBasePos)
          .addScaledVector(sleighTangent, dForward)
          .addScaledVector(sleighUp, dUp);

        d.group.position.lerp(loopPos, loopBlend);
        d.group.rotateX(-deerTheta);
      }

      const gallopSpeed = isLooping ? 20.0 : 14.0;
      const gallop = elapsed * gallopSpeed + d.phaseOffset;
      d.inner.position.y = Math.abs(Math.sin(gallop)) * 0.12;
      d.frontLeftLeg.rotation.x = Math.sin(gallop) * 0.65;
      d.frontRightLeg.rotation.x = Math.sin(gallop + 0.8) * 0.65;
      d.backLeftLeg.rotation.x = -Math.sin(gallop) * 0.65;
      d.backRightLeg.rotation.x = -Math.sin(gallop + 0.8) * 0.65;
    }

    // Update Stardust Trail (faster emission during loop for a clear golden circle)
    spawnAccum += delta;
    const spawnInterval = isLooping ? 0.012 : 0.02;
    const spread = isLooping ? 0.45 : 0.9;
    if (spawnAccum >= spawnInterval) {
      spawnAccum = 0;
      const idx = spawnCursor * 3;
      dustPositions[idx] = currentSleighPos.x + (Math.random() - 0.5) * spread;
      dustPositions[idx + 1] = currentSleighPos.y + 0.3 + (Math.random() - 0.5) * 0.35;
      dustPositions[idx + 2] = currentSleighPos.z + (Math.random() - 0.5) * spread;
      dustAges[spawnCursor] = 0;
      spawnCursor = (spawnCursor + 1) % activeDustCount;
    }

    for (let i = 0; i < activeDustCount; i++) {
      dustAges[i] += delta;
      dustPositions[i * 3 + 1] -= delta * 0.45;
    }
    dustGeo.attributes.position.needsUpdate = true;
  }

  function setQuality(preset) {
    activeDustCount = preset.dustCount;
    dustGeo.setDrawRange(0, activeDustCount);
  }

  return {
    group: rootGroup,
    getPosition: () => currentSleighPos,
    update,
    setQuality
  };
}
