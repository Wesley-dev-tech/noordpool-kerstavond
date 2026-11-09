import * as THREE from 'three';

function hash2D(ix, iz) {
  let n = ix * 374761393 + iz * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function valueNoise2D(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);

  const res = a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  return res * 2 - 1;
}

export function fbm2D(x, z, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise2D(x * frequency, z * frequency) * amplitude;
    maxAmp += amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }
  return value / maxAmp;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function getTerrainHeight(x, z) {
  const distOrigin = Math.hypot(x, z);
  const distWorkshop = Math.hypot(x - -10, z - -7);
  const distLake = Math.hypot((x - 8.5) / 1.3, (z - 4.5) / 0.85);

  const flattenOrigin = smoothstep(2.5, 6.5, distOrigin);
  const flattenWorkshop = smoothstep(4.2, 8.5, distWorkshop);
  const flattenLake = smoothstep(4.8, 7.5, distLake);

  const baseNoise = fbm2D(x * 0.045, z * 0.045, 4) * 1.45 + fbm2D(x * 0.14, z * 0.14, 2) * 0.25;
  const edgeBoost = smoothstep(14, 46, distOrigin) * 1.65;
  const outerHorizonFade = 1.0 - smoothstep(54, 92, distOrigin);
  let h = (baseNoise + edgeBoost) * flattenOrigin * flattenWorkshop * flattenLake * outerHorizonFade;

  // Sleigh tracks from (-12, 8) via (0, 3.2) to (14, -4)
  if (x >= -15 && x <= 16) {
    const trackCenterZ = 3.2 - x * 0.52 + Math.sin(x * 0.18) * 0.6;
    const d1 = Math.abs(z - (trackCenterZ - 0.55));
    const d2 = Math.abs(z - (trackCenterZ + 0.55));
    const groove1 = Math.max(0, 1 - d1 / 0.22);
    const groove2 = Math.max(0, 1 - d2 / 0.22);
    h -= (groove1 * groove1 + groove2 * groove2) * 0.065 * flattenLake;
  }

  // Slight basin depression under the ice lake so terrain never pokes through the ice
  const lakeBasin = 1.0 - smoothstep(4.2, 5.6, distLake);
  h -= lakeBasin * 0.05;

  return Math.max(-0.08, h);
}

export function createStripedPoleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f7f9fc';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#d92027';
  const stripeW = 64;
  for (let i = -256; i < 512; i += stripeW * 2) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + stripeW, 0);
    ctx.lineTo(i + stripeW + 256, 256);
    ctx.lineTo(i + 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3.5);
  return tex;
}

export function createSignTexture(text, subtext = '', bgColor = '#4a2c18', textColor = '#fff6e0') {
  const width = 1024;
  const height = 320;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle wood grain
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 3;
  for (let y = 12; y < height; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(width * 0.33, y + 7, width * 0.66, y - 7, width, y + 4);
    ctx.stroke();
  }

  // Gold border with outer wood margin
  const borderInset = 20;
  ctx.strokeStyle = '#ffcc33';
  ctx.lineWidth = 8;
  ctx.strokeRect(borderInset, borderInset, width - borderInset * 2, height - borderInset * 2);

  // Generous inner margin inside the gold border so text never feels cramped or clipped
  const horizontalMargin = 96;
  const maxTextWidth = width - horizontalMargin * 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  let mainFontSize = subtext ? 54 : 62;
  ctx.font = `bold ${mainFontSize}px Georgia, serif`;
  while (ctx.measureText(text).width > maxTextWidth && mainFontSize > 26) {
    mainFontSize -= 2;
    ctx.font = `bold ${mainFontSize}px Georgia, serif`;
  }

  ctx.fillStyle = textColor;
  ctx.fillText(text, width * 0.5, subtext ? 116 : height * 0.5, maxTextWidth);

  if (subtext) {
    let subFontSize = 40;
    ctx.font = `bold ${subFontSize}px sans-serif`;
    while (ctx.measureText(subtext).width > maxTextWidth && subFontSize > 20) {
      subFontSize -= 2;
      ctx.font = `bold ${subFontSize}px sans-serif`;
    }
    ctx.fillStyle = '#ffd966';
    ctx.fillText(subtext, width * 0.5, 210, maxTextWidth);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createSnowNormalAndSparkleMaps() {
  const size = 256;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');
  const nImg = nCtx.createImageData(size, size);

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = valueNoise2D(x * 0.25, y * 0.25) * 28;
      const ny = valueNoise2D((x + 100) * 0.25, (y + 100) * 0.25) * 28;
      const sparkle = hash2D(x * 7, y * 13) > 0.965 ? 1 : 0;

      nImg.data[idx] = Math.min(255, Math.max(0, 128 + nx + sparkle * 45));
      nImg.data[idx + 1] = Math.min(255, Math.max(0, 128 + ny - sparkle * 35));
      nImg.data[idx + 2] = 255;
      nImg.data[idx + 3] = 255;

      const rough = sparkle ? 25 : 195 + Math.floor(valueNoise2D(x * 0.15, y * 0.15) * 25);
      rImg.data[idx] = rough;
      rImg.data[idx + 1] = rough;
      rImg.data[idx + 2] = rough;
      rImg.data[idx + 3] = 255;
    }
  }

  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(28, 28);

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(28, 28);

  return { normalMap, roughnessMap };
}

export function createIceLakeTextures() {
  const size = 1024;

  // 1. Offscreen hairline crack mask with crystalline kinks and tapered fading
  const crackCanvas = document.createElement('canvas');
  crackCanvas.width = size;
  crackCanvas.height = size;
  const crackCtx = crackCanvas.getContext('2d');
  crackCtx.fillStyle = '#000000';
  crackCtx.fillRect(0, 0, size, size);
  crackCtx.lineCap = 'round';
  crackCtx.lineJoin = 'miter';

  function drawCrystallineCrack(x0, y0, x1, y1, maxWidth, maxAlpha, kinkScale, seed, depth = 0) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const steps = Math.max(12, Math.floor(len / 14));
    const nx = -dy / len;
    const ny = dx / len;

    const pts = [];
    let offset = 0;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const taper = Math.sin(t * Math.PI);
      // Sharp crystalline directional kinks rather than smooth waves
      const stepNoise = valueNoise2D(i * 1.35 + seed * 3.7, seed * 2.1);
      offset = offset * 0.72 + stepNoise * kinkScale * taper;
      const micro = valueNoise2D(i * 4.2 + seed, i * 1.9) * (kinkScale * 0.16);
      pts.push({
        x: x0 + dx * t + nx * (offset + micro),
        y: y0 + dy * t + ny * (offset + micro),
        t
      });
    }

    // Draw segment by segment so width and opacity taper and intermittently submerge in the ice
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const tMid = (p0.t + p1.t) * 0.5;
      const endTaper = Math.pow(Math.sin(tMid * Math.PI), 0.75);
      // Natural depth modulation: parts of a fracture dip deeper underwater and almost vanish
      const depthFade = 0.35 + 0.65 * Math.max(0, valueNoise2D(tMid * 6.5 + seed, seed * 1.4) * 0.5 + 0.5);
      const segAlpha = maxAlpha * endTaper * depthFade;
      const segWidth = Math.max(0.35, maxWidth * (0.35 + 0.65 * endTaper));

      if (segAlpha < 0.03) continue;

      // Subtle subsurface internal reflection (slightly wider, very faint)
      if (depth === 0) {
        crackCtx.strokeStyle = `rgba(140, 195, 240, ${segAlpha * 0.16})`;
        crackCtx.lineWidth = segWidth * 2.1;
        crackCtx.beginPath();
        crackCtx.moveTo(p0.x, p0.y);
        crackCtx.lineTo(p1.x, p1.y);
        crackCtx.stroke();
      }

      // Delicate hairline fracture core
      crackCtx.strokeStyle = `rgba(255, 255, 255, ${segAlpha})`;
      crackCtx.lineWidth = segWidth;
      crackCtx.beginPath();
      crackCtx.moveTo(p0.x, p0.y);
      crackCtx.lineTo(p1.x, p1.y);
      crackCtx.stroke();
    }

    // Sparse, acute-angle crystalline splinters
    if (depth < 2) {
      const branchCount = depth === 0 ? 3 : 1;
      for (let b = 0; b < branchCount; b++) {
        const frac = 0.22 + 0.56 * hash2D(seed * 17 + b * 5, depth * 29 + b);
        const idx = Math.min(pts.length - 2, Math.max(1, Math.floor(frac * steps)));
        const origin = pts[idx];
        const nextPt = pts[idx + 1];
        const localAngle = Math.atan2(nextPt.y - origin.y, nextPt.x - origin.x);
        // Real ice fractures fork at sharp ~30-50 degree angles
        const forkSign = (b + Math.floor(seed)) % 2 === 0 ? 1 : -1;
        const forkAngle = forkSign * (0.48 + hash2D(seed + b * 9, b * 13) * 0.36);
        const branchLen = len * (depth === 0 ? 0.16 + hash2D(b * 11, seed) * 0.16 : 0.24);

        drawCrystallineCrack(
          origin.x,
          origin.y,
          origin.x + Math.cos(localAngle + forkAngle) * branchLen,
          origin.y + Math.sin(localAngle + forkAngle) * branchLen,
          maxWidth * 0.58,
          maxAlpha * 0.62,
          kinkScale * 0.45,
          seed * 2.7 + b * 19.3,
          depth + 1
        );
      }
    }
  }

  // Subtle, sparse thermal stress fractures across the frozen lake
  const mainCracks = [
    [180, 390, 830, 560, 1.05, 0.48, 16, 1.4],
    [310, 230, 720, 790, 0.85, 0.38, 14, 5.2],
    [240, 680, 760, 340, 0.75, 0.34, 12, 9.7],
    [450, 190, 585, 510, 0.65, 0.28, 10, 15.1]
  ];
  for (let i = 0; i < mainCracks.length; i++) {
    const [x0, y0, x1, y1, w, a, kink, s] = mainCracks[i];
    drawCrystallineCrack(x0, y0, x1, y1, w, a, kink, s, 0);
  }

  const crackData = crackCtx.getImageData(0, 0, size, size).data;

  // 2. Build Albedo (map), Roughness (roughnessMap), and Normal (normalMap)
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d');
  const cImg = cCtx.createImageData(size, size);

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');
  const rImg = rCtx.createImageData(size, size);

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');
  const nImg = nCtx.createImageData(size, size);

  const half = size * 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const radial = Math.hypot(dx, dy);

      // Deep dark abyssal blue-teal ice undertone with organic depth modulation
      const depthNoise = fbm2D(x * 0.009, y * 0.009, 4) * 0.5 + 0.5;
      const subFrost = Math.max(0, fbm2D(x * 0.028 + 12, y * 0.028 - 8, 3));
      const edgeFrost = smoothstep(0.7, 0.98, radial + fbm2D(x * 0.015, y * 0.015, 3) * 0.12);

      // Crack intensity (surface hairline + faint shifted subsurface parallax echo)
      const cSurface = crackData[idx] / 255;
      const sx = Math.min(size - 1, x + 4);
      const sy = Math.min(size - 1, y + 4);
      const cSubsurface = crackData[(sy * size + sx) * 4] / 255;

      // Base dark ice RGB
      let r = 6 + depthNoise * 13 + subFrost * 14 + edgeFrost * 64;
      let g = 21 + depthNoise * 28 + subFrost * 28 + edgeFrost * 84;
      let b = 42 + depthNoise * 48 + subFrost * 44 + edgeFrost * 106;

      // Subtle translucent blue-cyan internal fracture + restrained frost line
      r += cSubsurface * 14 + cSurface * 58;
      g += cSubsurface * 28 + cSurface * 86;
      b += cSubsurface * 42 + cSurface * 112;

      cImg.data[idx] = Math.min(255, Math.max(0, Math.floor(r)));
      cImg.data[idx + 1] = Math.min(255, Math.max(0, Math.floor(g)));
      cImg.data[idx + 2] = Math.min(255, Math.max(0, Math.floor(b)));
      cImg.data[idx + 3] = 255;

      // Roughness: ultra-low glossy ice (12..22), slightly rougher on hairline cracks & shore frost
      const baseRough = 12 + depthNoise * 9 + subFrost * 12;
      const roughVal = Math.min(
        255,
        Math.floor(baseRough + cSurface * 65 + cSubsurface * 18 + edgeFrost * 110)
      );
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = roughVal;
      rImg.data[idx + 3] = 255;

      // Normal map: gentle ice undulation + fine hairline crease along fractures
      const xm1 = Math.max(0, x - 1);
      const xp1 = Math.min(size - 1, x + 1);
      const ym1 = Math.max(0, y - 1);
      const yp1 = Math.min(size - 1, y + 1);
      const dCrackX = (crackData[(y * size + xp1) * 4] - crackData[(y * size + xm1) * 4]) / 255;
      const dCrackY = (crackData[(yp1 * size + x) * 4] - crackData[(ym1 * size + x) * 4]) / 255;

      const waveX = valueNoise2D(x * 0.04, y * 0.04) * 8 + valueNoise2D(x * 0.14, y * 0.14) * 4;
      const waveY = valueNoise2D((x + 70) * 0.04, (y + 70) * 0.04) * 8 + valueNoise2D((x + 40) * 0.14, (y + 40) * 0.14) * 4;

      nImg.data[idx] = Math.min(255, Math.max(0, Math.floor(128 + waveX - dCrackX * 48)));
      nImg.data[idx + 1] = Math.min(255, Math.max(0, Math.floor(128 + waveY - dCrackY * 48)));
      nImg.data[idx + 2] = 255;
      nImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.anisotropy = 4;

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.anisotropy = 4;

  return { map, roughnessMap, normalMap };
}

export function createSnowflakeSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.45, 'rgba(235, 245, 255, 0.75)');
  grad.addColorStop(1, 'rgba(220, 235, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSmokeSprite() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);

  const half = size * 0.5;
  const radius = half - 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / radius;
      const dy = (y - half) / radius;
      const distSq = dx * dx + dy * dy;
      const idx = (y * size + x) * 4;

      if (distSq >= 1.0) {
        imgData.data[idx] = 255;
        imgData.data[idx + 1] = 255;
        imgData.data[idx + 2] = 255;
        imgData.data[idx + 3] = 0;
        continue;
      }

      // Soft cubic-squared radial falloff for wispy, seamless edges
      const falloff = Math.pow(1.0 - distSq, 2.2);

      // Multi-octave organic cloudiness
      const n1 = fbm2D(x * 0.055 + 4.3, y * 0.055 + 9.1, 3);
      const n2 = fbm2D(x * 0.11 - 2.7, y * 0.11 + 1.8, 2);
      const cloudFactor = Math.min(1.0, Math.max(0.25, 0.72 + n1 * 0.28 + n2 * 0.12));

      // Subtle internal shading (slightly brighter core, softer rim)
      const shade = Math.round(235 + (1.0 - distSq) * 20);
      const alpha = Math.round(255 * Math.min(1.0, falloff * cloudFactor));

      imgData.data[idx] = shade;
      imgData.data[idx + 1] = shade;
      imgData.data[idx + 2] = 255;
      imgData.data[idx + 3] = alpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWindowGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 85);
  grad.addColorStop(0, '#fff3cc');
  grad.addColorStop(0.55, '#ffae33');
  grad.addColorStop(1, '#b85d00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  // Window panes frame
  ctx.fillStyle = '#2d190e';
  ctx.fillRect(0, 0, 128, 8);
  ctx.fillRect(0, 120, 128, 8);
  ctx.fillRect(0, 0, 8, 128);
  ctx.fillRect(120, 0, 8, 128);
  ctx.fillRect(60, 0, 8, 128);
  ctx.fillRect(0, 60, 128, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4b2c1a';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 4) {
    const shade = Math.floor(valueNoise2D(y * 0.2, 1.5) * 18);
    ctx.fillStyle = `rgb(${75 + shade}, ${44 + Math.floor(shade * 0.6)}, ${26 + Math.floor(shade * 0.4)})`;
    ctx.fillRect(0, y, 256, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
