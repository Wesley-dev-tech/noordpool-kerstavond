import * as THREE from 'three';

let sharedContactTexture = null;

/**
 * Creates and caches a reusable, smooth radial gradient canvas texture
 * for organic contact shadows under actors' feet.
 * Center is a deep navy-indigo tone matching the nocturnal ambient snow palette.
 */
export function getContactShadowTexture() {
  if (sharedContactTexture) return sharedContactTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Smooth radial gradient with natural quadratic falloff
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.00, 'rgba(4, 10, 26, 0.88)');
  grad.addColorStop(0.25, 'rgba(4, 10, 26, 0.74)');
  grad.addColorStop(0.52, 'rgba(5, 12, 30, 0.38)');
  grad.addColorStop(0.78, 'rgba(6, 14, 34, 0.12)');
  grad.addColorStop(1.00, 'rgba(6, 14, 34, 0.00)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  sharedContactTexture = new THREE.CanvasTexture(canvas);
  sharedContactTexture.wrapS = THREE.ClampToEdgeWrapping;
  sharedContactTexture.wrapT = THREE.ClampToEdgeWrapping;
  sharedContactTexture.generateMipmaps = true;
  return sharedContactTexture;
}

/**
 * Creates an elliptical contact shadow mesh that stays attached to the terrain
 * beneath a character's feet. Dynamically contracts and softens during hops/jumps.
 */
export function createContactShadow({
  radiusX = 0.5,
  radiusZ = 0.4,
  opacity = 0.65,
  yOffset = 0.014
} = {}) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    opacity: opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    toneMapped: false
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2; // Always render directly over terrain to prevent z-fighting
  mesh.scale.set(radiusX * 2, 1, radiusZ * 2);

  return {
    mesh,
    baseScaleX: radiusX * 2,
    baseScaleZ: radiusZ * 2,
    baseOpacity: opacity,
    yOffset,
    update(x, z, groundY, hopY = 0, rotY = 0) {
      mesh.position.set(x, groundY + this.yOffset, z);
      if (rotY !== 0) {
        mesh.rotation.y = rotY;
      }
      if (hopY > 0.001) {
        // As actor jumps/hops, contact shadow stays on the ground,
        // shrinks smoothly and becomes softer
        const hopShrink = Math.max(0.42, 1.0 - hopY * 4.8);
        mesh.scale.set(this.baseScaleX * hopShrink, 1, this.baseScaleZ * hopShrink);
        mat.opacity = this.baseOpacity * (0.42 + 0.58 * hopShrink);
      } else {
        mesh.scale.set(this.baseScaleX, 1, this.baseScaleZ);
        mat.opacity = this.baseOpacity;
      }
    },
    setVisible(v) {
      mesh.visible = v;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    }
  };
}
