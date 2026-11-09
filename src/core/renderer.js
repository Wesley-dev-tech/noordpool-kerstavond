import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COLORS } from '../config.js';

export function createRenderer(container, initialPreset) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(initialPreset.pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.72;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = initialPreset.shadowsEnabled;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.NIGHT_SKY_HORIZON);
  scene.fog = new THREE.FogExp2(COLORS.FOG_COLOR, 0.021);

  // Dimmed procedural PMREM environment for realistic metallic/ice reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envMap;
  if ('environmentIntensity' in scene) {
    scene.environmentIntensity = 0.08;
  }
  roomEnv.dispose();
  pmremGenerator.dispose();

  let composer = null;
  let bloomPass = null;
  let activeCamera = null;
  let bloomEnabled = initialPreset.bloomEnabled;

  function initPostProcessing(camera) {
    activeCamera = camera;
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const halfW = Math.max(1, Math.floor(window.innerWidth / 2));
    const halfH = Math.max(1, Math.floor(window.innerHeight / 2));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(halfW, halfH),
      initialPreset.bloomStrength,
      initialPreset.bloomRadius,
      initialPreset.bloomThreshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);
  }

  function setQuality(preset) {
    renderer.setPixelRatio(preset.pixelRatio);
    renderer.shadowMap.enabled = preset.shadowsEnabled;
    bloomEnabled = preset.bloomEnabled;
    if (bloomPass) {
      bloomPass.strength = preset.bloomStrength;
      bloomPass.radius = preset.bloomRadius;
      bloomPass.threshold = preset.bloomThreshold;
    }
    resize(window.innerWidth, window.innerHeight);
  }

  function resize(width, height) {
    renderer.setSize(width, height);
    if (composer) {
      composer.setSize(width, height);
    }
    if (bloomPass) {
      bloomPass.resolution.set(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)));
    }
  }

  function render(camera) {
    if (!composer && camera) {
      initPostProcessing(camera);
    }
    if (bloomEnabled && composer) {
      composer.render();
    } else if (camera || activeCamera) {
      renderer.render(scene, camera || activeCamera);
    }
  }

  return {
    renderer,
    scene,
    get composer() {
      return composer;
    },
    get bloomPass() {
      return bloomPass;
    },
    initPostProcessing,
    setQuality,
    resize,
    render
  };
}
