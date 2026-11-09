# Conversatie 17: Kleine tooltip met de naam van een klikbaar object tonen bij hoveren

- **Conversatie-ID**: [`92dfbf78-ef65-47a2-abf3-23335b9bdeaf`](conversation://92dfbf78-ef65-47a2-abf3-23335b9bdeaf)
- **Gestart op**: `2026-11-09T13:37:48Z`
- **Model(len)**: Gemini 4 Argon (Medium)
- **Aantal beurten**: 1

---

## Beurt 1 — Gebruiker (`2026-11-09T13:37:48Z` · Gemini 4 Argon (Medium))

```text
Toon een kleine tooltip met de naam van een klikbaar object als je erover hovert.
```

### Antwoord Agent

Er wordt nu een kleine tooltip met de naam van het klikbare object getoond zodra je er met de muis overheen hovert:

- **Hover-detectie & cursorpositie** ([interaction.js](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/utils/interaction.js#L12-L148)): [`createInteractionManager`](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/utils/interaction.js#L3-L148) houdt naast het gehoverde 3D-object ook de schermcoördinaten van de aanwijzer bij (en wist de hover-status bij `pointerleave`) en stelt deze beschikbaar via `getHoverInfo()`.
- **HUD-weergave** ([hud.js](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/ui/hud.js#L8-L108)): [`createHUD`](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/ui/hud.js#L3-L115) positioneert `#hover-tooltip` direct boven de muisaanwijzer met de naam van het object (*Noordpoolpaal (90° N)*, *Werkplaatsdeur*, *Sneeuwpop*, *Kerstboom*, *Cadeau #1–#4*).
- **Styling** ([index.html](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/index.html#L56-L58) & [style.css](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/style.css#L221-L246)): Compacte, half-transparante pil met subtiele gouden rand en zachte fade-in (`pointer-events: none`), los van de grotere 3D-actietooltip bij het klikken.

---

