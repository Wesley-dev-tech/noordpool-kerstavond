# PLAN: Noordpool op Kerstavond (Three.js Architectuurplan)

## 1. Overzicht
Een realistische, filmische 3D-nachtscène van de Noordpool op kerstavond, volledig opgebouwd uit primitieve Three.js-geometrie, procedurele `CanvasTexture`-maps en custom GLSL-shaders zonder externe assets of build-stap. Centraal op `(0, 0, 0)` staat de rood-wit gestreepte Noordpoolpaal op een glinsterend sneeuw- en ijslandschap, geflankeerd door de verlichte blokhut-werkplaats van de Kerstman, een dennenbos met knipperende kerstbomen en cadeaus. Boven de horizon golft een procedureel noorderlicht naast een twinkelende sterrenhemel waarlangs de Kerstman met zijn rendierenslee een sterrenstofspoor trekt, ondersteund door ACESFilmic tone mapping, halve-resolutie UnrealBloom, interactieve raycasting, adaptieve 60 fps prestatiebewaking en procedurele Web Audio.

---

## 2. Bestandsstructuur

```text
noordpool-kerstavond/
├── index.html                  # HTML5-startpunt met importmap (Three.js r170), laad-overlay, HUD-elementen en tooltip-container.
├── style.css                   # Styling voor het fullscreen canvas, het laadscherm, de minimalistische HUD en de 3D-tooltip.
└── src/
    ├── main.js                 # Centrale bootstrap, THREE.Clock-animatieloop, resize/visibility-handlers en module-orkestratie.
    ├── config.js               # Gedeelde constanten: coördinaten, kleurenpalet, groepsnamen, kwaliteitsprofielen en sleepad-punten.
    ├── core/
    │   ├── renderer.js         # WebGLRenderer (ACESFilmic, sRGB, PCFSoftShadowMap), Scene, FogExp2, PMREM-omgeving en post-processing (EffectComposer + UnrealBloomPass).
    │   ├── camera.js           # PerspectiveCamera, OrbitControls met bodem-/afstandsbeperking en de cinemavlucht bij opstarten.
    │   ├── lights.js           # Maanlicht (DirectionalLight met één 2048-schaduwmap), HemisphereLight en warm werkplaats-PointLight.
    │   └── quality.js          # FPS-meting, F-toets monitor, kwaliteitswisselaar (Laag/Midden/Hoog) en automatische terugschakeling bij < 50 fps.
    ├── utils/
    │   ├── procedural.js       # Hulpfuncties voor 2D Simplex/Perlin-achtige waarderuis, CanvasTextures (strepen, hout, tekstbordjes, normal/glinstermap, sneeuwsprite) en materiaalcache.
    │   └── interaction.js      # Raycaster op een expliciete whitelist van klikbare meshes, hover-glow (emissive boost + pointer-cursor) en klik-dispatching.
    ├── world/
    │   ├── terrain.js          # Besneeuwde ondergrond met noise-displacement, glinster-normalmap, spiegelende ijsplaten en ingedrukte sleesporen.
    │   ├── sky.js              # Hemelkoepel met kleurverloop, twinkelende sterren-Points (custom shader), maan met halo en periodieke vallende ster.
    │   ├── aurora.js           # Golvende noorderlicht-linten in de lucht via een custom vertex/fragment-shader met additive blending.
    │   ├── northPole.js        # De Noordpoolpaal op (0,0,0) met spiraalstrepen, gouden topbol, bordje "NOORDPOOL · 90° N", richtingwijzers en klik-tooltip.
    │   ├── workshop.js         # Kerstman-werkplaats uit primitieven (balkenmuren, sneeuwdak met ijspegels, schoorsteen met rook, ramen, draaiende deur met krans en lichtbundel, veranda, brandhout, klikbare sneeuwpop).
    │   ├── trees.js            # 10 besneeuwde dennen via InstancedMesh plus 2 versierde kerstbomen, met knipperende lichtjes op 6 bomen en klikbare patroonwissel.
    │   ├── snow.js             # Vallende sneeuw als hergebruikt Points-particlesysteem met procedurele zachte vloksprite, zijwaartse drift en windvlagen.
    │   ├── sleigh.js           # Kerstman in slee met 6 geanimeerde rendieren (Rudolf met gloeiende neus) langs een CatmullRomCurve3 en een sterrenstofspoor.
    │   └── gifts.js            # 5 klikbare cadepedozen met linten die bij aanklikken openspringen en een herbruikbare confetti-burst afvuren.
    └── ui/
        ├── hud.js              # Beheer van laadscherm, kwaliteitsknoppen, FPS-teller, geluidsknop en projectie van de 3D-tooltip naar schermcoördinaten.
        └── audio.js            # Procedurele Web Audio API-synthesizer (windruis, haardvuur-geknetter, sleebelletjes op basis van afstand en klik-"pling").
```

---

## 3. Contract per module

> **Algemene regel**: Elke wereldmodule hergebruikt waar mogelijk `BufferGeometry`- en `Material`-instanties en wijst statische subonderdelen samen via `BufferGeometryUtils.mergeGeometries`. In geen enkele `update(delta, elapsed)`-functie mag `new THREE.Vector3()`, `new THREE.Matrix4()` of andere heap-allocatie voorkomen; gebruik vooraf aangemaakte scratch-objecten op moduleniveau.

### `src/config.js`
- **Exporteert**:
  - `COLORS`: bevroren object met alle hex-kleurcodes (zie sectie 4).
  - `COORDS`: bevroren object met exacte posities, rotaties en controlepunten (zie sectie 4).
  - `GROUPS`: bevroren object met standaard groepsnamen (`GROUP_TERRAIN`, `GROUP_SKY`, `GROUP_NORTH_POLE`, `GROUP_WORKSHOP`, `GROUP_TREES`, `GROUP_SNOW`, `GROUP_SLEIGH`, `GROUP_GIFTS`).
  - `QUALITY_PRESETS`: woordenboek met instellingen voor `'low'`, `'medium'` en `'high'` (zie sectie 5).
- **`update()`**: Nee.
- **Afhankelijkheden**: Geen.
- **Klikbare objecten**: Geen.

### `src/core/renderer.js`
- **Exporteert**:
  - `createRenderer(container: HTMLElement, initialPreset: Object) -> { renderer, scene, composer, bloomPass, setQuality(preset), render(), resize(width, height) }`
- **`update()`**: Nee (rendert via `render()`).
- **Afhankelijkheden**: `three`, `three/addons/postprocessing/EffectComposer.js`, `three/addons/postprocessing/RenderPass.js`, `three/addons/postprocessing/UnrealBloomPass.js`, `three/addons/postprocessing/OutputPass.js`, `three/addons/environments/RoomEnvironment.js`, `../config.js`.
- **Klikbare objecten**: Geen.

### `src/core/camera.js`
- **Exporteert**:
  - `createCamera(rendererDomElement: HTMLElement) -> { camera, controls, startIntroFlight(), skipIntroFlight(), update(delta, elapsed), resize(width, height) }`
- **`update(delta, elapsed)`**: Ja — interpoleert de camera tijdens de eerste 5 seconden langs de intro-curve (tenzij overgeslagen door muisklik/wheel) en roept daarna `controls.update()` aan met een harde vloerclamp (`camera.position.y >= getTerrainHeight(x, z) + 0.6`).
- **Afhankelijkheden**: `three`, `three/addons/controls/OrbitControls.js`, `../config.js`, `../world/terrain.js`.
- **Klikbare objecten**: Geen.

### `src/core/lights.js`
- **Exporteert**:
  - `createLights(scene: THREE.Scene, initialPreset: Object) -> { moonLight, hemiLight, workshopLight, doorSpotLight, update(delta, elapsed), setQuality(preset) }`
- **`update(delta, elapsed)`**: Ja — laat `workshopLight.intensity` subtiel flakkeren (haardvuureffect met twee sinusgolven).
- **Afhankelijkheden**: `three`, `../config.js`.
- **Klikbare objecten**: Geen (bevat hoogstens 4 lichten in de hele scène: `moonLight`, `hemiLight`, `workshopLight`, en de pas bij geopende deur geactiveerde `doorSpotLight`).

### `src/core/quality.js`
- **Exporteert**:
  - `createQualityManager(initialLevel: 'low' | 'medium' | 'high', onQualityChange: (preset, levelName) => void) -> { update(delta, elapsed), setLevel(levelName), getLevel(), getFps(), toggleFpsVisible() }`
- **`update(delta, elapsed)`**: Ja — berekent voortschrijdend FPS-gemiddelde over een ringbuffer van 60 frames en schakelt automatisch één niveau omlaag als de FPS gedurende 3.0 aaneengesloten seconden onder `50` blijft.
- **Afhankelijkheden**: `../config.js`.
- **Klikbare objecten**: Geen.

### `src/utils/procedural.js`
- **Exporteert**:
  - `fbm2D(x: number, z: number, octaves?: number) -> number` (deterministische 2D-ruis in bereik `[-1, 1]`).
  - `getTerrainHeight(x: number, z: number) -> number` (geeft exacte sneeuwhoogte op wereldcoördinaat `(x, z)`, afgeplat binnen een straal van 3.5 m rond `(0,0,0)` en rond de werkplaats en het ijsmeer).
  - `createStripedPoleTexture() -> THREE.CanvasTexture` (rood-witte diagonale strepen).
  - `createSignTexture(text: string, subtext?: string, bgColor?: string, textColor?: string) -> THREE.CanvasTexture` (houtnerf + scherpe typografie voor bordjes).
  - `createSnowNormalAndSparkleMaps() -> { normalMap: THREE.CanvasTexture, roughnessMap: THREE.CanvasTexture }`
  - `createSnowflakeSprite() -> THREE.CanvasTexture` (radiaal zacht verloop met subtiele kristalvorm).
  - `createWindowGlowTexture() -> THREE.CanvasTexture` (warm geel-oranje raamkruis met zachte vignettering).
  - `createWoodTexture() -> THREE.CanvasTexture` (donkerbruine blokhutnerf).
- **`update()`**: Nee.
- **Afhankelijkheden**: `three`, `../config.js`.
- **Klikbare objecten**: Geen.

### `src/utils/interaction.js`
- **Exporteert**:
  - `createInteractionManager(camera: THREE.Camera, domElement: HTMLElement) -> { registerClickable(mesh: THREE.Object3D, options: { id: string, label?: string, glowMeshes?: THREE.Mesh[], onClick: (hit) => void }), update(delta, elapsed), getActiveTooltip() }`
- **`update(delta, elapsed)`**: Ja — voert bij muisbeweging (throttled op maximaal 30 Hz of per frame bij gewijzigde pointer-positie) `raycaster.intersectObjects(clickableList, true)` uit, zet `document.body.style.cursor = 'pointer'`, verhoogt de `emissiveIntensity` van de gehoverde `glowMeshes` en houdt de actieve 3D-tooltip bij.
- **Afhankelijkheden**: `three`.
- **Klikbare objecten**: Beheert de centrale whitelist van alle klikbare objecten.

### `src/world/terrain.js`
- **Exporteert**:
  - `createTerrain(scene: THREE.Scene) -> { group: THREE.Group, iceMesh: THREE.Mesh }`
- **`update()`**: Nee (volledig statisch na opbouw).
- **Afhankelijkheden**: `three`, `../config.js`, `../utils/procedural.js`.
- **Klikbare objecten**: Geen.

### `src/world/sky.js`
- **Exporteert**:
  - `createSky(scene: THREE.Scene) -> { group: THREE.Group, update(delta, elapsed), setQuality(preset) }`
- **`update(delta, elapsed)`**: Ja — werkt uniform `uTime` bij voor de twinkelende sterrenshader en animeert om de 8–14 seconden een vallende ster (korte lichtstreep langs de hemelkoepel).
- **Afhankelijkheden**: `three`, `../config.js`, `../utils/procedural.js`.
- **Klikbare objecten**: Geen.

### `src/world/aurora.js`
- **Exporteert**:
  - `createAurora(scene: THREE.Scene) -> { group: THREE.Group, update(delta, elapsed), setQuality(preset) }`
- **`update(delta, elapsed)`**: Ja — werkt uniform `uTime` bij op 2 gebogen lint-meshes (`PlaneGeometry(140, 28, 96, 16)` gebogen in een boog op hoogte `y = 32..60`, `z = -55..-75`) met additive shader voor groen-paars golvend noorderlicht.
- **Afhankelijkheden**: `three`, `../config.js`.
- **Klikbare objecten**: Geen.

### `src/world/northPole.js`
- **Exporteert**:
  - `createNorthPole(scene: THREE.Scene, interaction: Object, audio: Object) -> { group: THREE.Group, update(delta, elapsed) }`
- **`update(delta, elapsed)`**: Ja — laat de gouden topbol subtiel gloeien en verzorgt de 4-seconden timer van de tooltip na aanklikken.
- **Afhankelijkheden**: `three`, `../config.js`, `../utils/procedural.js`.
- **Klikbare objecten**:
  - **`northPoleHitbox`** (onzichtbare of gegroepeerde cilinder rond de paal en bordjes op `(0, 0, 0)`): toont bij klikken gedurende 4 seconden de zwevende 3D-tooltip `"90°00'00\" N — Geografische Noordpool"`, laat de gouden topbol extra fel oplichten en speelt een kristalheldere `"pling"` via `audio`.

### `src/world/workshop.js`
- **Exporteert**:
  - `createWorkshop(scene: THREE.Scene, lights: Object, interaction: Object, audio: Object) -> { group: THREE.Group, update(delta, elapsed), setQuality(preset) }`
- **`update(delta, elapsed)`**: Ja — animeert:
  1. De schoorsteenrook (25 hergebruikte rookpluim-sprites/bollen die opstijgen, uitzetten en vervagen).
  2. De werkplaatsdeur-rotatie (`0` rad gesloten ↔ `-1.15` rad open) inclusief de warme lichtkegel en de intensiteit van `lights.doorSpotLight`.
  3. De sneeuwpop-animatie (springt 0.45 m omhoog, wiebelt en zwaait met zijn takken-armen gedurende 1.8 s na een klik).
- **Afhankelijkheden**: `three`, `three/addons/utils/BufferGeometryUtils.js`, `../config.js`, `../utils/procedural.js`.
- **Klikbare objecten**:
  - **`workshopDoor`**: zwaait open of dicht bij klikken, schakelt de warme lichtbundel (`SpotLight` + transparante volumetrische kegel over de sneeuw) in/uit en speelt een deur/pling-geluid.
  - **`snowman`**: laat de sneeuwpop naast de veranda een vrolijke sprong- en zwaai-animatie uitvoeren.

### `src/world/trees.js`
- **Exporteert**:
  - `createTrees(scene: THREE.Scene, interaction: Object, audio: Object) -> { group: THREE.Group, update(delta, elapsed) }`
- **`update(delta, elapsed)`**: Ja — berekent per frame de kleuren/intensiteiten van de knipperende kerstlichtjes op **minstens 6 bomen** (2 rijk versierde kerstbomen + 4 verlichte dennen, totaal 12 bomen in de scène) met een eigen fase per lampje en 4 schakelbare patronen op de hoofdkerstboom (`0: twinkeling`, `1: spiraalgolf`, `2: rood-wit-goud wissel`, `3: feestelijke stroboscoop-puls`), en laat de piekster pulseren na een klik.
- **Afhankelijkheden**: `three`, `three/addons/utils/BufferGeometryUtils.js`, `../config.js`, `../utils/procedural.js`.
- **Klikbare objecten**:
  - **`mainChristmasTree`**: wisselt bij elke klik naar het volgende lichtpatroon, laat de piekster gedurende 2 seconden intens oplichten en speelt een muzikale akkoord-"pling".

### `src/world/snow.js`
- **Exporteert**:
  - `createSnow(scene: THREE.Scene, initialPreset: Object) -> { points: THREE.Points, update(delta, elapsed), setQuality(preset) }`
- **`update(delta, elapsed)`**: Ja — verplaatst de actieve vlokken (`preset.snowCount` via `geometry.setDrawRange(0, preset.snowCount)`) omlaag met individuele valsnelheid, zijwaartse sinus-drift en een globale windvlaag-vector; vlokken met `y < 0` worden direct gereset naar `y = 28` binnen het bereik `x, z ∈ [-35, 35]` zonder nieuwe objecten aan te maken.
- **Afhankelijkheden**: `three`, `../config.js`, `../utils/procedural.js`.
- **Klikbare objecten**: Geen.

### `src/world/sleigh.js`
- **Exporteert**:
  - `createSleigh(scene: THREE.Scene) -> { group: THREE.Group, getPosition() -> THREE.Vector3, update(delta, elapsed), setQuality(preset) }`
- **`update(delta, elapsed)`**: Ja — beweegt de slee + Kerstman + 6 rendieren met constante snelheid langs de gesloten `CatmullRomCurve3` (`u = (elapsed * 0.035) % 1`), richt elk segment langs de raaklijn van de curve op zijn eigen curve-offset, berekent de bochtkromming voor realistische zijwaartse helling (banking roll), animeert de voor- en achterpoten van de 6 rendieren in galop-fase en ververst een ringbuffer van 120 gouden sterrenstofdeeltjes achter de slee.
- **Afhankelijkheden**: `three`, `three/addons/utils/BufferGeometryUtils.js`, `../config.js`.
- **Klikbare objecten**: Geen.

### `src/world/gifts.js`
- **Exporteert**:
  - `createGifts(scene: THREE.Scene, interaction: Object, audio: Object) -> { group: THREE.Group, update(delta, elapsed) }`
- **`update(delta, elapsed)`**: Ja — animeert het openklappen/opveren van het deksel van aangeklikte cadeaus en simuleert een herbruikbare pool van 80 gekleurde confetti-snippers (`InstancedMesh`) met zwaartekracht en dwarrelrotatie.
- **Afhankelijkheden**: `three`, `../config.js`, `../utils/procedural.js`.
- **Klikbare objecten**:
  - **`gift_0` t/m `gift_4`** (5 cadeaus rond de Noordpoolpaal en de hoofdkerstboom): bij klikken veert de doos op, klapt het deksel open, schiet een fontein van gekleurde confetti omhoog en sluit het cadeau zich na 4 seconden weer zodat het opnieuw klikbaar is.

### `src/ui/hud.js`
- **Exporteert**:
  - `createHUD(callbacks: { onQualitySelect: (level) => void, onToggleAudio: () => boolean, onToggleFps: () => void }) -> { hideLoadingScreen(), update(camera, qualityManager, interactionManager) }`
- **`update(camera, qualityManager, interactionManager)`**: Ja — werkt indien zichtbaar de FPS-tekst bij (maximaal 4× per seconde om DOM-thrashing te vermijden) en projecteert de 3D-wereldpositie van een actieve tooltip via `vector.project(camera)` naar `translate3d(x, y, 0)` op het `#tooltip`-element.
- **Afhankelijkheden**: `three`.
- **Klikbare objecten**: Geen (beheert HTML UI).

### `src/ui/audio.js`
- **Exporteert**:
  - `createAudioManager() -> { toggle() -> boolean, isEnabled() -> boolean, playChime(pitchMultiplier?: number), playDoorCreak(), update(delta, elapsed, cameraPos: THREE.Vector3, sleighPos: THREE.Vector3) }`
- **`update(delta, elapsed, cameraPos, sleighPos)`**: Ja — past het volume van het haardvuur aan op basis van de afstand tot de werkplaats en moduleert het sleebelletjes-volume op basis van de afstand tussen camera en vliegende slee. Initialiseert `AudioContext` uitsluitend na een gebruikersinteractie.
- **Afhankelijkheden**: `../config.js`.
- **Klikbare objecten**: Geen.

---

## 4. Gedeelde afspraken

### Schaal en eenheden
- **Schaal**: `1 Three.js unit = 1 meter`.
- **Richting**: `+Y` is omhoog, `-Z` is het noorden (richting noorderlicht en horizon), `+Z` is voorgrond, `+X` is oost, `-X` is west.
- **Terreingrootte**: `120 × 120 m` (`PlaneGeometry(120, 120, 128, 128)`), vlak binnen straal `3.5 m` rond `(0, 0, 0)` zodat de Noordpoolpaal en nabije cadeaus exact op `y = 0.0` staan.

### Exacte coördinaten (`COORDS` in `src/config.js`)
| Onderdeel | Positie `(x, y, z)` | Afmeting / Rotatie / Details |
| :--- | :--- | :--- |
| **Noordpoolpaal** | `(0, 0, 0)` | Hoogte `3.6 m`, straal `0.14 m`, topbol op `(0, 3.78, 0)` (straal `0.22 m`), bordje `"NOORDPOOL · 90° N"` op `y = 2.6 m`, 3 richtingwijzers (`Lapland 2650 km`, `Werkplaats 12 m`, `Sterrenwacht 40 m`) op `y = 2.1..2.4 m`. |
| **Werkplaats (blokhut)** | `(-10, 0, -7)` | Rotatie `rotation.y = 0.42 rad` (gericht naar de paal). Hoofdbouw `7.0 × 3.4 × 5.5 m` (`b × h × d`), zadeldak tot nokhoogte `5.2 m`, veranda aan de voorzijde (`7.0 × 2.0 m`), stenen schoorsteen op lokale positie `(-2.8, 0..6.0, -1.2)`. |
| **Werkplaatsdeur** | Wereld circa `(-8.9, 0.15, -4.6)` | Lokale scharniergroep op `(0, 0.15, 2.76)` van de werkplaats, breedte `1.2 m`, hoogte `2.2 m`, met dennenkrans en rode strik. |
| **Brandhoutstapel** | `(-6.2, 0, -5.8)` | Stapel van 14 gekloofde houtblokken tegen de rechterzijmuur onder het dakoverstek. |
| **Sneeuwpop** | `(-5.0, 0, -3.2)` | 3 opgestapelde sneeuwbollen (stralen `0.55`, `0.40`, `0.28 m`), wortelneus (`ConeGeometry`), kolen-ogen, hoge hoed, sjaal en 2 takkenarmen. |
| **IJsmeer (bevroren plaat)** | `(8.5, 0.02, 4.5)` | Onregelmatige afgeplatte schijf (`CircleGeometry(5.5, 32)` geschaald met `(1.3, 1.0, 0.85)`), lage roughness (`0.08`), metalness (`0.15`). |
| **Sleesporen in sneeuw** | Van `(-12, 0, 8)` via `(0, 0, 3.2)` naar `(14, 0, -4)` | Twee parallelle geulen in de terrein-displacement (onderlinge afstand `1.1 m`, diepte `0.07 m`). |
| **Hoofdkerstboom #1 (klikbaar)** | `(4.5, 0, -3.5)` | Hoogte `5.2 m`, 5 gelaagde takkegels, gouden piekster op `y = 5.35 m`, 28 kerstballen, gouden spiraalslinger en 48 knipperende lichtjes. |
| **Sierkerstboom #2** | `(-4.8, 0, -9.2)` | Hoogte `4.4 m`, 4 takkegels, piekster, 20 kerstballen, slinger en 36 knipperende lichtjes. |
| **Verlichte dennen (#3 t/m #6)** | `(7.5, 0, -8.5)`, `(-15.5, 0, -2.5)`, `(11.0, 0, -2.0)`, `(-2.5, 0, -13.5)` | Hoogtes tussen `3.8 m` en `5.6 m`, elk voorzien van een spiraal van 24 knipperende kerstlichtjes (zodat er **6 bomen met knipperende lichtjes** zijn). |
| **Overige dennen (#7 t/m #12)** | `(-17, 0, -11)`, `(-11, 0, -16)`, `(4, 0, -17)`, `(14, 0, -12)`, `(17, 0, 3)`, `(-14, 0, 7)` | Hoogtes `3.5..6.8 m`, gevarieerd in schaal (`0.8..1.35`) en groentint via `InstancedMesh` met sneeuwlagen op de takken. |
| **Cadeaus (`gift_0`..`gift_4`)** | `(0.85, 0, 0.55)`, `(-0.75, 0, 0.70)`, `(3.6, 0, -2.6)`, `(5.1, 0, -2.8)`, `(4.3, 0, -2.2)` | 2 cadeaus bij de Noordpoolpaal en 3 cadeaus bij Hoofdkerstboom #1; afmetingen `0.45..0.70 m`. |
| **Camera: Intro-startpunt** | `(0, 18, 34)` | Kijkt bij `t = 0` naar `(0, 8, -20)` (noorderlicht en vliegende slee) en zweeft in `5.0 s` met ease-in-out naar de eindpositie. |
| **Camera: Standaard / Eindpositie** | `(6.5, 4.2, 13.5)` | `OrbitControls.target = (-1.5, 1.8, -2.5)`, `minDistance = 3.5`, `maxDistance = 42.0`, `maxPolarAngle = Math.PI * 0.485`. |
| **Maan & DirectionalLight** | `(28, 36, -42)` | Zichtbare maanschijf (straal `3.2 m`) met zachte halo-sprite; `DirectionalLight` staat op exact dezelfde richting. |
| **Controlepunten Sleepad** | 8 gesloten 3D-punten (`CatmullRomCurve3`, `closed = true`) | `P0: (0, 14, -18)`, `P1: (22, 17, -10)`, `P2: (26, 12, 10)`, `P3: (8, 9, 16)`, `P4: (-12, 11, 12)`, `P5: (-24, 16, -2)`, `P6: (-18, 20, -18)`, `P7: (-6, 16, -24)`. |

### Kleurenpalet (`COLORS` in `src/config.js`)
- `NIGHT_SKY_TOP`: `#040816` (diep zenit-nachtblauw)
- `NIGHT_SKY_HORIZON`: `#102347` (koude poolhorizon)
- `FOG_COLOR`: `#0a1730` (`FogExp2`, dichtheid `0.014`)
- `MOONLIGHT`: `#b8d4ff` (koel blauwwit maanlicht)
- `HEMI_SKY`: `#2b4c7e` / `HEMI_GROUND`: `#1a2436`
- `SNOW_BASE`: `#e8f1ff` (heldere sneeuw met lichtblauwe schaduwtint)
- `ICE_SURFACE`: `#9ad1f5` (bevroren ijsplaat)
- `POLE_RED`: `#d92027` / `POLE_WHITE`: `#f7f9fc` / `GOLD_METAL`: `#ffcc33`
- `WOOD_DARK`: `#3d2314` / `WOOD_WARM`: `#6e4124` / `STONE_CHIMNEY`: `#4a505c`
- `WARM_WINDOW`: `#ffaa33` (emissive ramen en werkplaats-PointLight)
- `PINE_DARK`: `#0f2e1e` / `PINE_LIGHT`: `#1b472f`
- `AURORA_GREEN`: `#22ff99` / `AURORA_PURPLE`: `#9933ff`
- `RUDOLPH_RED`: `#ff1e1e` (emissive neus)
- `BULB_PALETTE`: `['#ff2a2a', '#2aff55', '#2aaaff', '#ffdd2a', '#ff44cc']`

### Standaard groepsnamen (`scene.getObjectByName(...)`)
- `terrainGroup`, `skyGroup`, `auroraGroup`, `northPoleGroup`, `workshopGroup`, `treesGroup`, `snowGroup`, `sleighGroup`, `giftsGroup`.

---

## 5. Prestatiebudget & Adaptieve Kwaliteit

### Kwaliteitsprofielen (`QUALITY_PRESETS`)
| Parameter | `Laag ('low')` | `Midden ('medium')` | `Hoog ('high')` — *Standaard* |
| :--- | :--- | :--- | :--- |
| **`pixelRatio`** | `1.0` | `Math.min(window.devicePixelRatio, 1.5)` | `Math.min(window.devicePixelRatio, 2.0)` |
| **Sneeuwdeeltjes (`snowCount`)** | `600` | `1500` | `3000` |
| **Sterren (`starCount`)** | `600` | `1200` | `2000` |
| **Schaduwen (`shadowsEnabled`)** | `false` | `true` (`1024 × 1024`) | `true` (`2048 × 2048`, `PCFSoftShadowMap`) |
| **Post-processing (`bloomEnabled`)** | `false` (direct `renderer.render`) | `true` (halve resolutie, `strength: 0.55`, `radius: 0.4`, `threshold: 0.78`) | `true` (halve resolutie, `strength: 0.65`, `radius: 0.5`, `threshold: 0.75`) |
| **Rook- & Sterrenstofdeeltjes** | `10` rook / `40` stof | `18` rook / `80` stof | `25` rook / `120` stof |

### Harde prestatie-eisen
1. **Lichtbronnen**: Maximaal **4** lichten tegelijk in de scène (`moonLight`, `hemiLight`, `workshopLight`, en `doorSpotLight` die op intensiteit `0` en `visible = false` staat zolang de deur dicht is). Alleen `moonLight` werpt een schaduw (`castShadow = true`). Kerstlichtjes, ramen, lantaarns, Rudolf-neus en sterrenstof gebruiken uitsluitend `emissive` / onbelichte materialen in combinatie met bloom.
2. **Geometrie & Instancing**:
   - Alle 10 bosdennen delen één `InstancedMesh` voor de houten stammen, één `InstancedMesh` voor de groene takkegels en één `InstancedMesh` voor de sneeuwkappen.
   - Alle knipperende kerstlichtjes worden gerenderd via één gedeelde `InstancedMesh` met `instanceColor` (totaal ~180 lampjes in 1 draw call).
   - Statische onderdelen van de werkplaats met hetzelfde materiaal (balkenmuren, dakrand-ijspegels, schoorsteenstenen, brandhoutstapel) worden bij creatie samengevoegd met `BufferGeometryUtils.mergeGeometries`.
3. **Geen allocaties in de animatieloop**: Geen `new THREE.*`, geen `.clone()` en geen array-creaties binnen `update(delta, elapsed)`. De sneeuw-`BufferGeometry` wordt éénmalig op de maximale grootte (`3000` deeltjes) aangemaakt en schaalt tussen kwaliteitsniveaus via `geometry.setDrawRange(0, preset.snowCount)`.
4. **Regels voor adaptieve kwaliteit**:
   - Na afloop van de eerste 2.0 seconden (shader-compilatie en intro-start) meet `quality.js` elke frame `delta`.
   - Als het voortschrijdend gemiddelde over de laatste 60 frames gedurende **3.0 seconden onafgebroken `< 50 fps`** bedraagt, schakelt `quality.js` automatisch één stap terug (`Hoog -> Midden` of `Midden -> Laag`) en werkt de HUD-knop bij.
   - Als de gebruiker handmatig een kwaliteitsknop in de HUD aanklikt, wordt automatische terugschakeling voor 15 seconden gepauzeerd.
5. **Tabblad-pauze**: Bij `document.addEventListener('visibilitychange', ...)` stopt de klok (`clock.stop()`) en pauzeert het Web Audio-geluid zodra `document.hidden === true`; bij terugkeer wordt `clock.start()` aangeroepen en wordt `delta` op maximaal `0.1 s` geclampt zodat deeltjes en de slee niet verspringen.

---

## 6. Bouwstappen (12 Stappen)

> **Belangrijk**: Alle **9 verplichte onderdelen** zijn volledig gebouwd en werkend in **Stap 1 t/m 6** (precies halverwege). Stap 7 t/m 12 voegen de vliegende slee met rendieren, post-processing bloom, extra klik-interacties, de intro-cameravlucht, adaptieve kwaliteitsbewaking en de HUD + Web Audio toe.

---

### Stap 1 — Projectopzet, Renderer, Belichting, OrbitControls en Centrale Animatieloop
- **Doel**: Een draaiende, lege nachtscène met `OrbitControls`, maanlicht en een centrale `THREE.Clock`-loop die zonder fouten op 60 fps in de browser opent. *(Vervult verplicht onderdeel 7 en legt de basis voor 9).*
- **Bestanden**:
  - Aanmaken: `index.html`, `style.css`, `src/config.js`, `src/core/renderer.js`, `src/core/camera.js`, `src/core/lights.js`, `src/main.js`.
- **Instructies**:
  1. Maak in `index.html` een `<script type="importmap">` met vaste versie `0.170.0` voor `"three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"` en `"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"`, plus een `#app`-container.
  2. Definieer in `src/config.js` alle kleuren (`COLORS`), posities (`COORDS`), groepsnamen (`GROUPS`) en `QUALITY_PRESETS` exact volgens sectie 4 en 5.
  3. Implementeer in `src/core/renderer.js` de `WebGLRenderer` met `toneMapping = THREE.ACESFilmicToneMapping`, `toneMappingExposure = 1.05`, `outputColorSpace = THREE.SRGBColorSpace`, `shadowMap.enabled = true`, `shadowMap.type = THREE.PCFSoftShadowMap`, en een `Scene` met `new THREE.FogExp2(COLORS.FOG_COLOR, 0.014)` en achtergrondkleur `COLORS.NIGHT_SKY_TOP`.
  4. Implementeer in `src/core/camera.js` een `PerspectiveCamera(50, aspect, 0.1, 250)` op startpositie `(6.5, 4.2, 13.5)` en `OrbitControls` met `enableDamping = true`, `dampingFactor = 0.05`, `target.set(-1.5, 1.8, -2.5)`, `minDistance = 3.5`, `maxDistance = 42.0` en `maxPolarAngle = Math.PI * 0.485`.
  5. Implementeer in `src/core/lights.js` het maanlicht (`DirectionalLight(COLORS.MOONLIGHT, 1.6)` op `(28, 36, -42)` met een `2048×2048` shadow map en een `OrthographicCamera`-frustum van `[-26, 26, 26, -26, 1, 110]`, `shadow.bias = -0.0005`), het `HemisphereLight(COLORS.HEMI_SKY, COLORS.HEMI_GROUND, 0.45)` en het warme `PointLight(COLORS.WARM_WINDOW, 2.2, 18, 1.5)` op de werkplaatspositie `(-10, 2.0, -7)`.
  6. Zet in `src/main.js` de `THREE.Clock`-animatieloop op met `Math.min(clock.getDelta(), 0.1)` en `visibilitychange`-afhandeling.
- **Acceptatietest**: Open via `npx serve` of `python3 -m http.server`: een donkerblauwe nachtscène vult het scherm, de muis laat de camera soepel met damping ronddraaien en in-/uitzoomen (zonder onder het horizontale vlak te duiken), en de console toont 0 fouten.
- **Aanbevolen model**: `snel`

---

### Stap 2 — Besneeuwde Ondergrond en Nachtelijke Sterrenhemel
- **Doel**: De glooiende, glinsterende sneeuwondergrond met bevroren ijsplaat en sleesporen én de nachtelijke hemelkoepel met twinkelende sterren en maan toevoegen. *(Vervult verplicht onderdeel 1).*
- **Bestanden**:
  - Aanmaken: `src/utils/procedural.js`, `src/world/terrain.js`, `src/world/sky.js`.
  - Wijzigen: `src/core/camera.js`, `src/main.js`.
- **Instructies**:
  1. Schrijf in `src/utils/procedural.js` de deterministische ruisfunctie `fbm2D(x, z)` en `getTerrainHeight(x, z)`: glooiende heuvels (`amplitude 1.8 m` aan de randen), glad afgeplat rond `(0, 0, 0)` (straal `3.5 m`), rond de werkplaats `(-10, -7)` en bij het ijsmeer `(8.5, 4.5)`, plus twee ingedrukte sleespoor-geulen van `(-12, 8)` via `(0, 3.2)` naar `(14, -4)`. Voeg ook `createSnowNormalAndSparkleMaps()` toe (een `256×256` `CanvasTexture` met fijnkorrelige blauwpaarse normal-variaties en hoogglans-glinsterspikkelpunten).
  2. Bouw in `src/world/terrain.js` het sneeuwvlak (`PlaneGeometry(120, 120, 128, 128)`, geroteerd `-Math.PI / 2`, vertices op `y = getTerrainHeight(x, z)` gevolgd door `computeVertexNormals()`, `MeshStandardMaterial` met `color: COLORS.SNOW_BASE`, `roughness: 0.72`, `metalness: 0.05`, `normalMap`, `roughnessMap` en `receiveShadow = true`) en voeg op `(8.5, 0.02, 4.5)` het spiegelende ijsmeer toe (`roughness: 0.08`, `metalness: 0.15`).
  3. Bouw in `src/world/sky.js`:
     - Een hemelkoepel (`SphereGeometry(115, 32, 16)`, `BackSide`) met een vertex-/fragmentshader die verloopt van `COLORS.NIGHT_SKY_HORIZON` naar `COLORS.NIGHT_SKY_TOP`.
     - `2000` sterren als `THREE.Points` op een halve bol (`r = 105..112 m`, `y > 4 m`) met attributen `aSize` en `aPhase` en een `ShaderMaterial` die elke ster laat twinkelen via `0.55 + 0.45 * sin(uTime * 2.5 + aPhase)`.
     - Een maanschijf op `(28, 36, -42)` met een zachte radiale halo-`Sprite`.
  4. Koppel in `src/core/camera.js` `getTerrainHeight(camera.position.x, camera.position.z) + 0.6` als minimale camera-hoogte.
- **Acceptatietest**: In de browser zie je een glooiend, subtiel glinsterend sneeuwlandschap met twee sleesporen en een glanzende ijsplaat, verlicht door een heldere maan met halo onder een koepel van twinkelende sterren.
- **Aanbevolen model**: `zwaar` (vanwege terrein-displacement en sterren-twinkelshader)

---

### Stap 3 — De Echte Noordpool (90° N) en het Raycasting-Systeem
- **Doel**: De rood-wit spiraalgestreepte Noordpoolpaal met bordjes op `(0, 0, 0)` plaatsen en aanklikbaar maken via het centrale raycasting- en hover-systeem. *(Vervult verplichte onderdelen 2 en 8).*
- **Bestanden**:
  - Aanmaken: `src/utils/interaction.js`, `src/world/northPole.js`.
  - Wijzigen: `src/utils/procedural.js`, `index.html`, `style.css`, `src/main.js`.
- **Instructies**:
  1. Voeg in `src/utils/procedural.js` `createStripedPoleTexture()` (diagonale rood-witte strepen met `wrapS = wrapT = THREE.RepeatWrapping`) en `createSignTexture(text, subtext)` toe.
  2. Implementeer in `src/utils/interaction.js` `createInteractionManager(camera, domElement)` die alleen raycast tegen geregistreerde meshes in `clickableList`. Bij hover wordt `document.body.style.cursor = 'pointer'` gezet en krijgt de gekoppelde mesh een subtiele emissive glow. Bij een echte klik (`pointerdown` gevolgd door `pointerup` binnen `5 px` om slepen met `OrbitControls` te negeren) wordt `onClick(hit)` aangeroepen.
  3. Bouw in `src/world/northPole.js` op `(0, 0, 0)`:
     - Een cirkelvormig stenen/ijzigen voetstuk (`CylinderGeometry(0.45, 0.55, 0.25, 16)`).
     - De paal zelf (`CylinderGeometry(0.14, 0.14, 3.6, 24)` op `y = 1.8`, `castShadow = true`) met het rood-witte spiraalmateriaal.
     - De gouden topbol (`SphereGeometry(0.22, 24, 16)` op `y = 3.72`, `metalness: 0.85`, `roughness: 0.18`).
     - Het hoofdbord `"NOORDPOOL · 90° N"` op `y = 2.65` en 3 pijlvormige richtingwijzers (`Lapland 2650 km`, `Werkplaats 12 m`, `Sterrenwacht 40 m`) op `y = 2.1..2.45`.
  4. Registreer de paal in `interaction.js`; toon bij klikken een zwevende HTML-tooltip `"90°00'00\" N — Geografische Noordpool"` boven de topbol en laat de gouden bol 2 seconden extra oplichten.
- **Acceptatietest**: Precies in het midden staat de rood-wit gestreepte Noordpoolpaal met gouden bol en leesbare bordjes. Bewegen met de muis over de paal geeft een hand-cursor en een lichte gloed; klikken op de paal toont direct de tooltip `"90°00'00\" N"`.
- **Aanbevolen model**: `snel`

---

### Stap 4 — De Werkplaats van de Kerstman (Blokhut, Rook, Veranda & Sneeuwpop)
- **Doel**: De gedetailleerde werkplaats van de Kerstman opbouwen uit primitieve vormen, inclusief verlichte ramen, veranda, ijspegels, brandhout en sneeuwpop. *(Vervult verplicht onderdeel 3).*
- **Bestanden**:
  - Aanmaken: `src/world/workshop.js`.
  - Wijzigen: `src/utils/procedural.js`, `src/main.js`.
- **Instructies**:
  1. Voeg in `src/utils/procedural.js` `createWoodTexture()` en `createWindowGlowTexture()` toe.
  2. Bouw in `src/world/workshop.js` op `COORDS.workshop` `(-10, 0, -7)` (rotatie `0.42 rad`):
     - **Blokhut-muren**: Een kerndozen-structuur (`7.0 × 3.2 × 5.5 m`) bekleed met horizontale ronde boomstam-cilinders (`CylinderGeometry(0.18, 0.18, ...)` op de hoeken uitstekend als authentieke blokhut-inkepingen), samengevoegd met `mergeGeometries`.
     - **Sneeuwdak & IJspegels**: Twee schuine dakplaten met een dikke witte sneeuwlaag erbovenop en 28 kegelvormige ijspegels (`ConeGeometry(0.04, 0.35, 6)`, semi-transparant ijsblauw) langs de dakranden.
     - **Schoorsteen**: Een opgemetselde stenen schacht (`BoxGeometry` + gestapelde steenblokken) aan de linkerzijde tot `y = 6.0 m`.
     - **Verlichte ramen**: 4 ramen (2 voor, 1 links, 1 rechts) met houten kozijnkruizen en een emissive venstervlak (`createWindowGlowTexture()`, `emissive: COLORS.WARM_WINDOW`, `emissiveIntensity: 1.8`).
     - **Deur met krans**: In een eigen scharniergroep op de voorgevel: een houten paneeldeur met gouden klink en een groene `TorusGeometry`-kerstkrans met rode strik en rode besjes.
     - **Veranda met lantaarns**: Houten vlonder en 4 steunbalken aan de voorzijde, met 2 hangende zeshoekige lantaarns (`emissive` warme kern) naast de deur.
     - **Brandhout & Sneeuwpop**: De stapel gekloofde houtblokken tegen de rechtermuur en de sneeuwpop (3 bollen, wortelneus, ogen, hoge hoed, rode sjaal, takkenarmen) op `(-5.0, 0, -3.2)`.
- **Acceptatietest**: Links achter de Noordpoolpaal staat een sfeervolle blokhut met balkenmuren, besneeuwd dak met ijspegels, schoorsteen, warm gloeiende ramen, een deur met kerstkrans, veranda-lantaarns, brandhout en een sneeuwpop die schaduwen op de sneeuw werpen.
- **Aanbevolen model**: `snel`

---

### Stap 5 — Dennenbos (`InstancedMesh`) en Kerstbomen met Knipperende Lichtjes
- **Doel**: Minstens 12 bomen plaatsen (10 besneeuwde dennen via `InstancedMesh` en 2 rijk versierde kerstbomen), waarvan **6 bomen** zijn uitgerust met geanimeerde, knipperende kerstlichtjes. *(Vervult verplicht onderdeel 4).*
- **Bestanden**:
  - Aanmaken: `src/world/trees.js`.
  - Wijzigen: `src/main.js`.
- **Instructies**:
  1. Bouw in `src/world/trees.js`:
     - **10 Bosdennen via `InstancedMesh`**: Maak één gecombineerde boomstam-geometrie, één gecombineerde groene takken-geometrie (4 gestapelde `ConeGeometry`-lagen) en één gecombineerde witte sneeuwkappen-geometrie. Plaats 10 instanties op de coördinaten uit `COORDS` met variatie in schaal (`0.8..1.35`), rotatie en groentint (`setColorAt`).
     - **2 Versierde Kerstbomen**: Plaats Hoofdkerstboom #1 op `(4.5, 0, -3.5)` (`5.2 m` hoog) en Sierkerstboom #2 op `(-4.8, 0, -9.2)` (`4.4 m` hoog). Voorzie beide van gelaagde takkegels met sneeuwranden, een gouden spiraalslinger (`TubeGeometry` langs een conische helix), gekleurde metallische kerstballen (`InstancedMesh` van `SphereGeometry(0.11, 12, 12)`) en een achtpuntige of octaëdrische gouden piekster (`OctahedronGeometry(0.28, 0)` met `emissive: COLORS.GOLD_METAL`).
     - **Knipperende Kerstlichtjes op 6 bomen**: Plaats één gedeelde `InstancedMesh` (`SphereGeometry(0.055, 8, 8)`, `MeshBasicMaterial({ toneMapped: false })` zodat de kleuren helder oplichten) verdeeld over **Hoofdkerstboom #1** (48 lampjes), **Sierkerstboom #2** (36 lampjes) en **4 omliggende dennen (#3 t/m #6)** (elk 24 lampjes = totaal 180 lampjes op 6 bomen).
  2. Geef in `update(delta, elapsed)` elk lampje een eigen fase `phase[i]` en basis-kleur uit `COLORS.BULB_PALETTE`, en moduleer de helderheid per frame met verschillende patronen (sinus-twinkeling, lopende spiraalgolf en afwisselende kleurblokken) via `instancedBulbs.setColorAt(i, tempColor)` en `instancedBulbs.instanceColor.needsUpdate = true`.
- **Acceptatietest**: Rondom de werkplaats en Noordpoolpaal staan 12 besneeuwde bomen in verschillende groottes, waaronder 2 versierde kerstbomen met ballen, slinger en piekster, en op 6 bomen knipperen de gekleurde kerstlichtjes vloeiend in verschillende fasen en patronen.
- **Aanbevolen model**: `snel`

---

### Stap 6 — Vallende Sneeuw (Particle System) en Autonoom Noorderlicht + Schoorsteenrook
- **Doel**: Vallende sneeuw als hergebruikt particle system én autonome omgevingsbeweging (golvend noorderlicht aan de hemel en opstijgende schoorsteenrook) toevoegen. *(Vervult verplichte onderdelen 5, 6 en 9 — hiermee zijn halverwege het plan **alle 9 verplichte onderdelen** compleet en werkend!).*
- **Bestanden**:
  - Aanmaken: `src/world/snow.js`, `src/world/aurora.js`.
  - Wijzigen: `src/utils/procedural.js`, `src/world/workshop.js`, `src/main.js`.
- **Instructies**:
  1. Voeg in `src/utils/procedural.js` `createSnowflakeSprite()` toe (`64×64` `CanvasTexture` met zachte radiale gradiënt).
  2. Bouw in `src/world/snow.js` een `THREE.Points`-systeem met `3000` vlokken in een `BufferGeometry` binnen een volume van `70 × 28 × 70 m` (`x, z ∈ [-35, 35]`, `y ∈ [0, 28]`). Sla per deeltje snelheid en drift-fase op in een `Float32Array`. Werk in `update(delta, elapsed)` de posities bij met verticale val (`1.2..2.4 m/s`), individuele sinus-drift én een globale windvlaag (`sin(elapsed * 0.4) * 0.8`). Als `y < 0`, zet `y = 28` en wikkel `x`/`z` binnen `[-35, 35]` (geen `new` allocaties).
  3. Bouw in `src/world/aurora.js` twee grote gebogen linten (`PlaneGeometry(140, 28, 96, 16)` waarvan de vertices in een boog op `z = -55..-70`, `y = 28..56` zijn geplaatst) met een custom `ShaderMaterial` (`transparent: true`, `blending: THREE.AdditiveBlending`, `depthWrite: false`, `side: THREE.DoubleSide`). De vertex-shader laat het gordijn golven met `sin(position.x * 0.06 + uTime * 0.7)` en de fragment-shader mengt `COLORS.AURORA_GREEN` en `COLORS.AURORA_PURPLE` met verticale gordijnstrepen en zachte alfa-randen.
  4. Activeer in `src/world/workshop.js` de schoorsteenrook: 25 hergebruikte lage-poly bollen/sprites die vanaf de schoorsteenmond `(-11.8, 6.0, -7.8)` opstijgen, met de wind meedrijven, schalen van `0.2` naar `1.1` en in opaciteit vervagen voordat ze onderaan de schoorsteen herstarten.
- **Acceptatietest**: Sneeuwvlokken dwarrelen continu met windvlagen door de scène, boven de horizon golft een groen-paars noorderlicht en uit de schoorsteen van de werkplaats stijgt rook op, terwijl de scène met alle 9 verplichte onderdelen soepel op 60 fps draait.
- **Aanbevolen model**: `zwaar` (vanwege de custom aurora-shader en particle-optimalisatie)

---

### Stap 7 — Vliegende Kerstman in Slee met Rendieren, Sterrenstofspoor en Vallende Ster
- **Doel**: De Kerstman in een slee met 6 geanimeerde rendieren (inclusief Rudolf met gloeiende rode neus) langs een gesloten 3D-curve door de lucht laten vliegen met een sterrenstofspoor en periodieke vallende sterren.
- **Bestanden**:
  - Aanmaken: `src/world/sleigh.js`.
  - Wijzigen: `src/world/sky.js`, `src/main.js`.
- **Instructies**:
  1. Bouw in `src/world/sleigh.js` uit primitieve geometrieën:
     - **De Slee**: Rode kuip met gouden sierlijsten, twee gebogen gouden glijders (`TubeGeometry` of samengestelde cilinders/torussen), een zak vol cadeaus achterin en de **Kerstman** (rode jas, witte baard, hoofd, puntmuts met witte pompon).
     - **6 Rendieren (3 paren in tweespan)**: Opgebouwd uit bruine romp-, nek-, kop- en snuit-boxen/cilinders, vertakt gewei, witte staart en 4 afzonderlijk scharnierende pootgroepen per rendier zodat ze in `update(delta, elapsed)` met `sin(elapsed * 14 +deerIndex)` galopperen. Geef het voorste rechter rendier (**Rudolf**) een felrood gloeiende neus (`SphereGeometry(0.09, 12, 12)`, `emissive: COLORS.RUDOLPH_RED`, `emissiveIntensity: 3.0`) en verbind het span met gouden teugellijnen (`LineSegments`).
  2. Laat het geheel in `update(delta, elapsed)` bewegen langs `new THREE.CatmullRomCurve3(COORDS.sleighCurvePoints, true, 'catmullrom', 0.5)`. Plaats de slee op curve-parameter `u` en elk rendierpaar op `u + 0.022`, `u + 0.042`, `u + 0.062`. Gebruik `curve.getTangentAt(u)` voor de vliegrichting (`lookAt`) en kantel elk onderdeel zijwaarts (`rotation.z`) evenredig met de horizontale richtingsverandering tussen `tangent(u)` en `tangent(u + 0.01)` (banking in de bochten).
  3. Voeg achter de slee een ringbuffer van `120` gouden sterrenstofdeeltjes (`THREE.Points`) toe die op de huidige sleepositie spawnen, langzaam omlaag dwarrelen en in 2 seconden uitdoven.
  4. Voeg in `src/world/sky.js` een vallende ster toe die elke `8..14` seconden op een willekeurige hoge hemelpositie verschijnt en in `0.9 s` een schuine lichtstreep trekt.
- **Acceptatietest**: Hoog boven de Noordpool vliegt de Kerstman in zijn slee, getrokken door 6 galopperende rendieren met Rudolf voorop (rode gloeiende neus); het span volgt vloeiend de bochten van het pad met zijwaartse helling en laat een glinsterend sterrenstofspoor achter, terwijl er af en toe een vallende ster langs de hemel schiet.
- **Aanbevolen model**: `zwaar` (vanwege 3D-curve-oriëntatie, banking-wiskunde en gearticuleerde rendier-animatie)

---

### Stap 8 — Realistische Post-Processing (Halve-Resolutie UnrealBloom) en PMREM-Omgeving
- **Doel**: De filmische look voltooien met een gedimde procedurele PMREM-omgeving voor PBR-reflecties en een `EffectComposer` met halve-resolutie `UnrealBloomPass`.
- **Bestanden**:
  - Wijzigen: `src/core/renderer.js`, `src/main.js`.
- **Instructies**:
  1. Genereer in `src/core/renderer.js` bij initialisatie met `THREE.PMREMGenerator` en `RoomEnvironment` een omgevingsmap en wijs deze toe aan `scene.environment` met `scene.environmentIntensity = 0.25` (zodat gouden ornamenten, de Noordpool-topbol, kerstballen en de ijsplaat realistische gedimde reflecties krijgen zonder het nachtgevoel te breken).
  2. Configureer in `src/core/renderer.js` de `EffectComposer` met:
     - `RenderPass(scene, camera)`
     - `UnrealBloomPass(new THREE.Vector2(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2)), 0.65, 0.5, 0.75)`
     - `OutputPass()`
  3. Zorg dat `setQuality(preset)` in `renderer.js` schakelt tussen `composer.render()` (wanneer `preset.bloomEnabled === true`) en rechtstreeks `renderer.render(scene, camera)` (wanneer `preset.bloomEnabled === false`), en dat `resize(w, h)` de bloom-resolutie op `(Math.floor(w / 2), Math.floor(h / 2))` houdt.
- **Acceptatietest**: De verlichte werkplaatsramen, knipperende kerstlichtjes, pieksterren, Rudolf-neus, het noorderlicht en het sterrenstofspoor hebben nu een zachte, filmische bloom-gloed en de gouden bol op de Noordpoolpaal en het ijsmeer vertonen diepe PBR-reflecties.
- **Aanbevolen model**: `zwaar` (vanwege post-processing pipeline, tone mapping + sRGB OutputPass en bloom-drempelwaarden)

---

### Stap 9 — Extra Interacties: Klikbare Cadeaus met Confetti, Werkplaatsdeur, Kerstboom & Sneeuwpop
- **Doel**: Alle resterende raycasting-interacties toevoegen: 5 cadeaus die openspringen met confetti, de werkplaatsdeur die opengaat met een warme lichtbundel, de hoofdkerstboom die van lichtpatroon wisselt en de sneeuwpop die beweegt.
- **Bestanden**:
  - Aanmaken: `src/world/gifts.js`.
  - Wijzigen: `src/world/workshop.js`, `src/world/trees.js`, `src/core/lights.js`, `src/main.js`.
- **Instructies**:
  1. Bouw in `src/world/gifts.js` 5 kleurrijke cadeaudozen op de coördinaten uit `COORDS` (elk bestaande uit een doos met gekleurd kruislint en een apart scharnierend deksel met strik). Voeg één herbruikbare `InstancedMesh` van 80 kleine vlakjes (`PlaneGeometry(0.06, 0.04)`) toe voor confetti. Registreer elke cadeaudoos bij `interaction.js`: bij klikken veert de doos op, klapt het deksel `-1.9 rad` open, spawnen de 80 confetti-deeltjes met een opwaartse snelheid en zwaartekracht, en sluit het deksel weer na 4 seconden.
  2. Registreer in `src/world/workshop.js`:
     - **`workshopDoor`**: roteert bij klikken vloeiend open (`-1.15 rad`) of dicht (`0 rad`), schakelt in `lights.js` de warme `doorSpotLight` in én toont een subtiele, semi-transparante warme lichtkegel/vloergloed (`MeshBasicMaterial`, additive blending, `opacity: 0.22`) die vanuit de deuropening over de veranda en sneeuw valt.
     - **`snowman`**: start bij klikken een 1.8 seconden durende animatie waarbij de sneeuwpop twee keer blij opveert, om zijn as wiebelt en met zijn takkenarmen zwaait.
  3. Registreer in `src/world/trees.js` **`mainChristmasTree`**: elke klik schakelt het lichtpatroon van de boom door (`twinkeling -> spiraalgolf -> rood-wit-goud wissel -> feest-puls`), laat de gouden piekster op de top gedurende 2 seconden fel oplichten (`emissiveIntensity = 4.0`) en toont kort een tooltip met de naam van het gekozen lichtpatroon.
- **Acceptatietest**: Hoveren over de Noordpoolpaal, de 5 cadeaus, de hoofdkerstboom, de werkplaatsdeur en de sneeuwpop toont telkens een pointer-cursor en een subtiele glow; elk van de 5 objecttypes voert bij aanklikken direct zijn eigen visuele animatie uit.
- **Aanbevolen model**: `snel`

---

### Stap 10 — Intro-Cameravlucht met Naadloze Overgang naar OrbitControls
- **Doel**: Bij het openen van de scène een filmische 5-seconden intro-cameravlucht uitvoeren vanaf hoog boven het sneeuwlandschap naar de standaard kijkpositie, voordat `OrbitControls` het overneemt.
- **Bestanden**:
  - Wijzigen: `src/core/camera.js`, `src/main.js`.
- **Instructies**:
  1. Definieer in `src/core/camera.js` een vloeiende cameravlucht van `duration = 5.0` seconden vanaf `COORDS.cameraIntroStart` `(0, 18, 34)` via een tussenpunt `(-12, 9, 18)` naar `COORDS.cameraDefaultPos` `(6.5, 4.2, 13.5)`, terwijl het kijkdoel (`lookAt`) met een kubische ease-in-out (`smoothstep`) beweegt van `(0, 10, -18)` (het noorderlicht en het sleepad) langs de werkplaats naar het einddoel `(-1.5, 1.8, -2.5)` (het tafereel rond de Noordpoolpaal).
  2. Schakel `controls.enabled = false` in tijdens de vlucht en zet bij `t >= 5.0 s` (of zodra de gebruiker klikt, sleept, scrollt of op `Escape`/`Space` drukt via `skipIntroFlight()`) `controls.enabled = true` zonder sprong in positie of kijkrichting.
- **Acceptatietest**: Bij het herladen van de pagina zweeft de camera in 5 seconden filmisch van hoog boven het noorderlicht en de vliegende slee omlaag naar de Noordpoolpaal en werkplaats, waarna je direct vrij kunt rondkijken met de muis (en klikken tijdens de vlucht geeft direct de controle aan de muis).
- **Aanbevolen model**: `snel`

---

### Stap 11 — Prestatie-Optimalisatie, Adaptieve Kwaliteit en FPS-Monitor (`F`-toets)
- **Doel**: De kwaliteitsmanager (`Laag`/`Midden`/`Hoog`), de automatische terugschakeling bij `< 50 fps` en de FPS-teller op toets `F` implementeren en koppelen aan alle modules.
- **Bestanden**:
  - Aanmaken: `src/core/quality.js`.
  - Wijzigen: `src/core/renderer.js`, `src/core/lights.js`, `src/world/snow.js`, `src/world/sky.js`, `src/world/sleigh.js`, `src/world/workshop.js`, `src/main.js`.
- **Instructies**:
  1. Implementeer in `src/core/quality.js` de FPS-ringbuffer (60 samples), de automatische kwaliteitsverlaging wanneer het gemiddelde na de eerste 2 seconden gedurende 3.0 seconden onder `50 fps` blijft, en een `keydown`-listener op toets `KeyF` (hoofdletterongevoelig) die de FPS-teller zichtbaar/onzichtbaar maakt.
  2. Zorg dat `setQuality(preset)` in `renderer.js` (`pixelRatio`, `bloomEnabled`, `shadowMap.enabled`), `lights.js` (shadow map resolutie `1024` vs `2048`), `snow.js` (`geometry.setDrawRange(0, preset.snowCount)`), `sky.js` (`setDrawRange` op sterren) en `sleigh.js`/`workshop.js` (aantal actieve rook-/sterrenstofdeeltjes) onmiddellijk en zonder hapering kan wisselen.
- **Acceptatietest**: Drukken op toets `F` toont/verbergt de live FPS-teller; wisselen tussen `Laag`, `Midden` en `Hoog` past direct de sneeuwdichtheid, bloom, schaduwen en pixelRatio aan zonder foutmeldingen of geheugenlekken.
- **Aanbevolen model**: `zwaar` (vanwege dynamische runtime-herconfiguratie van schaduwen, drawRanges en post-processing)

---

### Stap 12 — Gebruikersinterface (Laadscherm + HUD) en Procedurele Web Audio
- **Doel**: De scène afwerken met het laadscherm, de minimalistische HUD (instructies, kwaliteitskeuze, FPS-toggle, geluidsknop) en de procedurele Web Audio-geluidsgenerator.
- **Bestanden**:
  - Aanmaken: `src/ui/hud.js`, `src/ui/audio.js`.
  - Wijzigen: `index.html`, `style.css`, `src/main.js`.
- **Instructies**:
  1. Bouw in `index.html`, `style.css` en `src/ui/hud.js`:
     - Een sfeervol donkerblauw **laadscherm** (`#loading-screen`) met titel *"Noordpool · 90° N — Kerstavond"* dat met een CSS-fade-out verdwijnt zodra alle procedurele textures en geometrieën in `main.js` zijn geïnitialiseerd.
     - Een **minimale HUD** met semi-transparante (`backdrop-filter: blur(8px)`) panelen: linksboven een korte instructieregel (*"Sleep om rond te kijken · Scroll om te zoomen · Klik op paal, cadeaus, boom, deur of sneeuwpop"*), rechtsboven knoppen voor Kwaliteit (`Laag` / `Midden` / `Hoog`), `FPS (F)` en `Geluid Aan/Uit`.
  2. Implementeer in `src/ui/audio.js` een 100% procedurele Web Audio synthesizer (zonder externe audiobestanden, uitsluitend gestart na de eerste klik van de gebruiker):
     - **Poolwind**: Witte-ruisbuffer door een traag gemoduleerd `BiquadFilterNode` (`bandpass`, frequentie gemoduleerd tussen `180 Hz` en `520 Hz`).
     - **Haardvuur**: Zachte laagfrequente brom + willekeurige korte micro-tikjes (`highpass` op `1800 Hz`), in volume geschaald op basis van de afstand tussen camera en werkplaats.
     - **Sleebelletjes**: Ritmische hoge metalige sinus-boventonen (`2400 Hz` + `3600 Hz` met korte exponentiële decay, 4× per seconde), in volume geschaald op basis van de afstand tot de vliegende slee.
     - **Interactie-"pling" (`playChime`)**: Een warme celesta-/klokkenspel-toon (`Sine` + `Triangle` met harmonische boventoon) wanneer de gebruiker op de paal, cadeaus, boom, deur of sneeuwpop klikt.
- **Acceptatietest**: Bij het openen verschijnt kort het laadscherm en vloeit daarna over in de scène met een strakke HUD. De kwaliteits-, FPS- en geluidsknoppen werken direct; met geluid ingeschakeld hoor je zachte poolwind, knisperend haardvuur dicht bij de blokhut, rinkelende sleebelletjes wanneer de slee overvliegt en een heldere "pling" bij elke klik-interactie.
- **Aanbevolen model**: `snel`

---

## 7. Checklist Verplichte Onderdelen (1–9)

- [x] **1. Besneeuwde ondergrond en nachtelijke hemel met sterren** — *Afgerond in **Stap 2*** (`src/world/terrain.js` & `src/world/sky.js`).
- [x] **2. De echte Noordpool: een rood-wit gestreepte paal op 90° N** — *Afgerond in **Stap 3*** (`src/world/northPole.js` op exact `(0, 0, 0)`).
- [x] **3. De werkplaats van de Kerstman, opgebouwd uit primitieve vormen** — *Afgerond in **Stap 4*** (`src/world/workshop.js`).
- [x] **4. Minstens vijf kerstbomen met lichtjes die knipperen** — *Afgerond in **Stap 5*** (`src/world/trees.js`: 12 bomen totaal, waarvan 6 voorzien van geanimeerde knipperende lichtjes).
- [x] **5. Vallende sneeuw als particle system** — *Afgerond in **Stap 6*** (`src/world/snow.js`).
- [x] **6. Iets dat beweegt zonder dat de gebruiker iets doet** — *Afgerond in **Stap 6*** (golvend noorderlicht in `src/world/aurora.js` + schoorsteenrook) *en uitgebreid in **Stap 7*** (vliegende Kerstman met rendierenslee in `src/world/sleigh.js`).
- [x] **7. Rondkijken met de muis via OrbitControls** — *Afgerond in **Stap 1*** (`src/core/camera.js`).
- [x] **8. Minstens één klikbaar object dat iets doet via raycasting** — *Afgerond in **Stap 3*** (klikbare Noordpoolpaal met tooltip in `src/utils/interaction.js` & `src/world/northPole.js`) *en uitgebreid in **Stap 9*** (cadeaus, deur, kerstboom en sneeuwpop).
- [x] **9. Vloeiend op een gewone laptop, mikpunt 60 fps** — *Basis en instancing/merging in **Stap 1–6**, adaptieve kwaliteitsbewaking en FPS-teller afgerond in **Stap 11*** (`src/core/quality.js`).
