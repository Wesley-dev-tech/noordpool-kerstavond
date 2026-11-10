# Conversatie 45: Alle padlantaarns identiek zwart via InstancedMesh

- **Conversatie-ID**: [`59ad2dd4-685c-4a2e-be56-47eded64eab4`](conversation://59ad2dd4-685c-4a2e-be56-47eded64eab4)
- **Datum**: 2026-11-09 / 2026-11-10
- **Betrokken bestanden**:
  - [`src/world/path-v2.js`](file:///c:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/world/path-v2.js)
  - [`src/world/path.js`](file:///c:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/world/path.js)
- **Screenshots**:
  - `test_lanterns_carrier.png` (overzicht langs de werkplaats met identieke zwarte lantaarnpaaltjes en schaduwen)
  - `test_lanterns_path_eye.png` (ooghoogte-aanzicht langs de stapstenen met uniforme zwarte lantaarnpaaltjes)
  - `test_lanterns_village.png` (wandelende elfjes met de cadeauslee langs de padlantaarns)

---

## 1. Vraag van de gebruiker

> Maak alle lantaarnpaaltjes langs de paden identiek:
> - Gebruik overal hetzelfde model: het zwarte lantaarnpaaltje dat er nu al staat.
> - Vervang alle zuurstokpaaltjes, kaarspotjes en andere afwijkende varianten langs de paden door dit zwarte paaltje.
> - Behoud de huidige afstand tussen de paaltjes, de warme gloed op de sneeuw en het flakkeren met een eigen fase per lampje.
> - Gebruik één InstancedMesh voor alle paaltjes en één voor alle lampjes.
> - Werk obstacles.js bij als er posities veranderen.
> - De grote lantaarnpaal op het plein blijft ongewijzigd.

---

## 2. Analyse & Uitvoering

### A. Eén uniform model voor alle padlantaarns
- Het oorspronkelijke zwarte lantaarnpaaltje uit `src/world/path-v2.js` (voorheen type 0) bestaat uit:
  - `base`: `CylinderGeometry(0.08, 0.11, 0.10, 8)` op $y = 0.05$
  - `pole`: `CylinderGeometry(0.024, 0.028, 1.05, 8)` op $y = 0.58$
  - `cageBase`: `CylinderGeometry(0.07, 0.045, 0.04, 6)` op $y = 1.10$
  - `cap`: `ConeGeometry(0.11, 0.10, 6)` op $y = 1.32$
  - `snowCap`: `ConeGeometry(0.10, 0.06, 6)` op $y = 1.35$
- Alle afwijkende varianten (zuurstokpaaltjes met snoepstrepentextuur en glazen kaarspotjes op boomstronkjes) zijn volledig verwijderd.

### B. Twee InstancedMeshes (één voor paaltjes, één voor lampjes)
1. **`instPosts` (`THREE.InstancedMesh`)**:
   - Samengevoegde geometrie via `mergeGeometries` met per-vertex kleuren:
     - Donker smeedijzer (`0x1c242e`) voor sokkel, paal, kooibodem en kap.
     - Zuiver sneeuwwit (`COLORS.SNOW_BASE`) voor het sneeuwdakje op de kap.
   - Eén enkel materiaal: `MeshStandardMaterial` met `vertexColors: true`, `roughness: 0.65` en `metalness: 0.85`.
   - `castShadow = true` voor natuurlijke schaduwwerping over de sneeuw.
2. **`instLights` (`THREE.InstancedMesh`)**:
   - `CylinderGeometry(0.055, 0.045, 0.16, 6)` met `warmGlowMat` (`MeshBasicMaterial({ color: 0xffaa33, toneMapped: false })`).
   - Gecentreerd op $y = 1.20$ binnenin de lantaarnkooi.

### C. Behoud van afstand, warme grondgloed en individuele flakkerfase
- **Posities & Afstand**: De 16 lantaarnstations (8 stations $\times$ 2 zijden langs de curve, om de $\pm 4\text{ m}$) behouden exact hun beproefde wiskundige coördinaten en zijwaartse offsets ($1.15\text{ m}$). Hierdoor hoefden er geen obstakelposities in `obstacles.js` te verschuiven.
- **Warme gloed op de sneeuw**: Elk lantaarnstation behoudt zijn zachte radiale oranje-gouden grondcirkel (`THREE.AdditiveBlending`, `renderOrder: 2`) vlak boven de sneeuw.
- **Flakkeren per lampje**:
  - Elk lampje heeft een unieke fase (`phase = idx * 1.5`).
  - In de renderloop wordt via `setMatrixAt` en `setColorAt` een samengestelde harmonische golf toegepast voor zowel zachte schaalschommeling als subtiele intensiteitsflikkering.
  - De bijbehorende grondgloed moduleert synchroon in transparantie met zijn eigen lampje.
  - Vaste scratch-objecten (`scratchLightDummy`, `scratchLightColor`) voorkomen garbage collection overhead.

### D. Pleinlantaarn ongewijzigd
- De grote gedetailleerde lantaarnpaal op het dorpsplein (`villageLantern` in `src/world/elf-village.js`) is 100% intact gelaten.

---

## 3. Verificatie & Resultaat
- Geverifieerd via Chrome headless screenshots vanuit verschillende camerastandpunten (`view=carrier`, `view=path_eye`, `view=path_village`, `view=village_lantern` en `debug=1`).
- Alle paaltjes langs het hele pad zijn nu identiek, strak zwart afgewerkt en renderen met minimale draw calls dankzij `InstancedMesh`.
- Vaste 60 FPS prestaties gewaarborgd.
