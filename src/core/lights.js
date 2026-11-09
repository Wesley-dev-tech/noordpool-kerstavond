import * as THREE from 'three';
import { COLORS, COORDS } from '../config.js';

export function createLights(scene, initialPreset) {
  const moonLight = new THREE.DirectionalLight(COLORS.MOONLIGHT, 1.15);
  moonLight.position.set(COORDS.moon.x, COORDS.moon.y, COORDS.moon.z);
  moonLight.castShadow = initialPreset.shadowsEnabled;
  moonLight.shadow.mapSize.set(initialPreset.shadowMapSize, initialPreset.shadowMapSize);
  moonLight.shadow.camera.left = -26;
  moonLight.shadow.camera.right = 26;
  moonLight.shadow.camera.top = 26;
  moonLight.shadow.camera.bottom = -26;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 110;
  moonLight.shadow.bias = -0.0005;
  scene.add(moonLight);

  const hemiLight = new THREE.HemisphereLight(COLORS.HEMI_SKY, COLORS.HEMI_GROUND, 0.25);
  scene.add(hemiLight);

  const workshopLight = new THREE.PointLight(COLORS.WARM_WINDOW, 3.6, 20, 1.35);
  workshopLight.position.set(COORDS.workshop.x + 0.8, 2.2, COORDS.workshop.z + 1.2);
  scene.add(workshopLight);

  const doorSpotLight = new THREE.SpotLight(0xffb84d, 0.0, 15, Math.PI * 0.28, 0.55, 1.3);
  doorSpotLight.position.set(COORDS.workshop.x + 1.1, 2.3, COORDS.workshop.z + 2.4);
  doorSpotLight.target.position.set(COORDS.workshop.x + 3.4, 0.0, COORDS.workshop.z + 6.8);
  doorSpotLight.visible = false;
  scene.add(doorSpotLight);
  scene.add(doorSpotLight.target);

  function update(delta, elapsed) {
    // Cozy fireplace flicker inside the workshop (synchronized with workshop window glow)
    const hearthWave =
      Math.sin(elapsed * 4.2) * 0.42 +
      Math.sin(elapsed * 7.3 + 1.1) * 0.33 +
      Math.sin(elapsed * 12.1 + 2.4) * 0.16 +
      Math.cos(elapsed * 18.7) * 0.09;
    workshopLight.intensity = 3.55 + hearthWave * 0.62;
    workshopLight.color.setRGB(
      1.0,
      Math.min(1.0, Math.max(0.52, 0.655 + hearthWave * 0.065)),
      Math.min(1.0, Math.max(0.12, 0.2 + hearthWave * 0.055))
    );
  }

  function setQuality(preset) {
    moonLight.castShadow = preset.shadowsEnabled;
    if (
      moonLight.shadow.mapSize.width !== preset.shadowMapSize ||
      moonLight.shadow.mapSize.height !== preset.shadowMapSize
    ) {
      moonLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      if (moonLight.shadow.map) {
        moonLight.shadow.map.dispose();
        moonLight.shadow.map = null;
      }
    }
  }

  return {
    moonLight,
    hemiLight,
    workshopLight,
    doorSpotLight,
    update,
    setQuality
  };
}
