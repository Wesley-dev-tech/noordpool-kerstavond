# Conversatie 06: Rook-bollen vervangen door sprite-particlesysteem met winddrift

- **Conversatie-ID**: [`faa5c878-b95e-404f-b377-173206cd5e61`](conversation://faa5c878-b95e-404f-b377-173206cd5e61)
- **Gestart op**: `2026-11-09T13:23:38Z`
- **Model(len)**: Gemini 4 Argon (Medium)
- **Aantal beurten**: 1

---

## Beurt 1 — Gebruiker (`2026-11-09T13:23:38Z` · Gemini 4 Argon (Medium))

```text
Vervang de rook-bollen door een particle system met zachte, transparante sprites die groter en doorzichtiger worden naarmate ze stijgen, en met de wind meedrijven.
```

### Antwoord Agent

De losse `SphereGeometry` rook-bollen zijn vervangen door een `THREE.Points` particle system met zachte, transparante rook-sprites:

1. **Procedurele rook-sprite ([`createSmokeSprite`](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/utils/procedural.js#L210-L260))**:
   - Genereert een `128×128` `CanvasTexture` met een zachte radiale falloff (`(1 - r²)^2.2`) gecombineerd met meerlaagse 2D `fbm2D`-ruis voor een wolkachtige, naadloos transparante sprite zonder harde randen.

2. **Single-draw-call rook-particlesysteem ([`createWorkshop`](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/world/workshop.js#L366-L540))**:
   - Vervangt de 25 afzonderlijke `Mesh`-bollen door één `THREE.Points`-systeem (`60` deeltjes op *Hoog*, `42` op *Midden*, `24` op *Laag* in [config.js](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/config.js#L97-L126)) met een custom `ShaderMaterial` en per-deeltje `BufferAttribute`-arrays (`aSize`, `aOpacity`, `aRotation`, `aWarmth`).
   - **Uitzetten & vervagen bij het stijgen**: De sprites groeien tijdens het opstijgen continu van `0.68 m` bij de schoorsteenmond tot `3.15 m` hoog in de lucht, krijgen onderaan een subtiele warme haardgloed die afkoelt naar maanverlicht zilvergrijs-blauw, en worden geleidelijk steeds transparanter (`(1 - t)^1.65`) tot ze volledig oplossen.
   - **Meedrijven met de wind**: In [`stepSmokeParticles`](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/world/workshop.js#L422-L465) wordt de globale windvector uit de scène (gesynchroniseerd met `snow.js`) omgezet naar de lokale oriëntatie van de blokhut, waarbij de windinvloed en wervelturbulentie toenemen naarmate de rook hoger boven de schoorsteen stijgt.
   - Het logboek is bijgewerkt in [LOGBOEK.md](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/LOGBOEK.md#L9).

---

