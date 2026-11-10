# Conversatie 41: Elf op de ladder volledig herbouwd (ladder, positionering buitenkant, lichtslingeranimatie & sport-per-sport klimmen)

- **Conversatie-ID**: [`1914f0f9-aab1-400f-aaba-6c2f87d51036`](conversation://1914f0f9-aab1-400f-aaba-6c2f87d51036)
- **Gestart op**: `2026-11-09T19:22:40Z`
- **Model(len)**: Gemini 3.8 Flash (High)
- **Aantal beurten**: 1

---

## Beurt 1 — Gebruiker (`2026-11-09T19:22:40Z` · Gemini 3.8 Flash (High))

```text
De elf op de ladder is nog altijd niet correct. Herbouw deze scène volledig:

- Zoek eerst in de code waar de ladder en deze elf worden aangemaakt, en verwijder de
  oude code.
- Ladder: twee staanders en minstens 6 sporten, schuin tegen de gevel van het huisje
  (hoek ±70° met de grond). De voet staat op `getGroundHeight()`, ±1 m van de muur.
  De top rust tegen de dakgoot.
- Elf (via `createElf()`): staat op de 4e sport, aan de BUITENKANT van de ladder
  (tussen de ladder en de camera, niet tussen de ladder en de muur), met zijn gezicht
  naar de muur. Beide voeten op dezelfde sport, één hand aan een staander, de andere
  hand omhoog naar de dakgoot.
- Animatie: hij hangt een lichtslinger op. Hand omhoog, lampje vastmaken, het lampje
  gaat aan, hand terug. Na 3 lampjes klimt hij één sport hoger of lager (voeten en
  handen bewegen sport per sport mee).
- Controle: maak een tijdelijke close-up camera van de zijkant en van voren, maak een
  screenshot en bevestig dat de elf aan de buitenkant van de ladder staat, met zijn
  voeten op de sport en niets door elkaar steekt.
```

### Uitvoering & Oplossing

1. **Oude code opgespoord en volledig verwijderd:**
   - In [`src/actors/elves.js`](file:///C:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/actors/elves.js) de oude `buildLadder()` verwijderd.
   - De oude ladder-elf initialisatie (waarbij de ladder schuin onder een foutieve hoek van 0,45 rad stond en het elfje door de sporten heen stak met een gele cylinder door zijn borst) volledig verwijderd.
   - De oude rudimentaire animatieloop verwijderd.

2. **Nieuwe geometrisch exacte Ladder gebouwd:**
   - **Twee staanders**: cilindrische houten staanders van 2,72 m lang (`radius: 0.024 m`, met afgeronde bolle doppen aan weerszijden) met een breedte van 0,35 m.
   - **8 sporten**: cilindrische houten sporten (`radius: 0.016 m`, `width: 0.35 m`), gelijkmatig verdeeld over de staanders met een stap van 0,30 m vanaf 0,35 m hoogte.
   - **Hoek ±70° met de grond**: `ladderTiltFromVertical = 20°` (`ladder.rotation.x = 20 * Math.PI / 180`), zodat de hoek met het grondvlak exact $90^\circ - 20^\circ = 70^\circ$ bedraagt.
   - **Voet op `getGroundHeight()` ±1 m van de muur**: De gevelwand bevindt zich op $d_{\text{wall}} = 1.35\text{ m}$. De voet staat op $d_{\text{foot}} = 2.30\text{ m}$ (exact $0.95\text{ m}$ van de muur) en de hoogte is verankerd op `getGroundHeight(footX, footZ)`.
   - **Top rust tegen de dakgoot**: Horizontale afstand van $0.87\text{ m}$ naar de dakgootlijst ($d_{\text{dakgoot}} = 1.43\text{ m}$); met $\tan(70^\circ)$ reikt de ladder tot $2.39\text{ m}$ hoogte waar de staanders stabiel rusten tegen de dakgoot en boeidelen van Huisje 2.
   - **Plaatsing**: De ladder staat op $u = -0.58\text{ m}$ langs de voorgevel, waardoor hij zowel de vensterbank links als de voordeur en drempel rechts ruim vrijhoudt.

3. **Elfje Jingle op de 4e sport aan de BUITENKANT:**
   - Geïnitialiseerd via het gedeelde model `createElf(elfConfigs[9])`.
   - Staat op de **4e sport** (index 3, $Y = 1.25\text{ m}$).
   - **Aan de BUITENKANT van de ladder**: `root.position.set(0, curRungH, -0.058)`. Omdat $-Z$ in ladder-coördinaten wegwijst van het huis richting de camera, bevindt het complete lichaam van het elfje (torso, benen, hoofd en muts) zich aan de buitenkant ($Z < 0$). Er is absoluut geen overlap met de ruimte tussen de ladder en de gevel.
   - **Gezicht naar de muur**: `root.rotation.set(0, 0, 0)` in het ladder-frame, waardoor zijn gezicht, borst en tenen naar $+Z$ (de gevel) kijken en hij meeleunt in de 70°-helling.
   - **Beide voeten op dezelfde sport**: `leftLeg.rotation.set(0, 0, 0)` en `rightLeg.rotation.set(0, 0, 0)` met zoolhoogte direct rustend op de sportcilinder.
   - **Eén hand aan een staander**: Linkerarm grijpt met `rotation.set(-0.75, 0.20, -0.32)` de linkerstaander op borsthoogte vast.
   - **Andere hand omhoog naar de dakgoot**: Rechterarm reikt met `rotation.set(-2.60, -0.15, -0.20)` omhoog naar de dakgoot.

4. **Lichtslinger & Uitgebreide Animatiestatusmachine:**
   - Aan de dakgoot boven de ladder hangt een groene lichtslingerdraad met fittingen en 3 lampjes (warm goud, smaragdgroen, robijnrood).
   - In zijn rechterhand houdt het elfje een lampje vast.
   - **Per lampje (2,4 s cyclus):**
     1. **Hand omhoog (0,0–0,7 s):** Rechterarm brengt het lampje omhoog naar de dakgoot (`-0.85 -> -2.62 rad`), hoofd kantelt omhoog.
     2. **Lampje vastmaken (0,7–1,4 s):** Rechterarm maakt subtiele bevestigingsbewegingen aan de dakgoot (`Math.sin/cos` wiggles).
     3. **Lampje gaat aan (bij 1,15 s):** Het betreffende dakgootlampje flitst aan naar volle helderheid (`emissiveIntensity = 2.8`) en de dakgoot-gloed licht op. Handlampje wordt verborgen.
     4. **Hand terug (1,4–2,4 s):** Rechterarm zakt soepel terug naar het gereedschapstasje; het lampje aan de dakgoot blijft vrolijk branden.
   - **Na 3 lampjes klimmen (2,2 s):**
     - Beide handen grijpen de staanders (`leftArm` en `rightArm`).
     - **Handen en voeten bewegen sport per sport mee:**
       - Eerste helft ($u \in [0, 0.5]$): Rechterbeen tilt op en stapt naar de doelsport (`rightLeg.rotation.x = -climbDir * Math.sin(...) * 0.45`).
       - Tweede helft ($u \in [0.5, 1.0]$): Rechtervoet staat op de doelsport; linkerbeen tilt op en volgt naar dezelfde sport.
       - Het elfje beweegt geleidelijk tussen de 4e sport (index 3) en de 5e sport (index 4).
     - Zodra de sport bereikt is, staan beide voeten weer stevig op de nieuwe sport, wisselt de richting en begint het decoreren opnieuw.

5. **Controle via close-up camera's & Screenshots:**
   - `?view=ladder_side`: Loodrecht profiel-zij-aanzicht langs de gevel (`ladder_side.png`). Toont onomstotelijk dat de ladder netjes 70° leunt, het elfje 100% aan de buitenkant staat, de voeten op de sport rusten en de ruimte tussen ladder en muur volledig vrij is.
   - `?view=ladder_front`: Vooraanzicht recht van voren (`ladder_front.png`). Toont de 2 staanders, alle sporten, beide voeten op dezelfde sport, de hand aan de staander en de hand omhoog naar de dakgoot.
   - `?view=ladder`: 3/4 perspectiefshot van de totale gevelcompositie (`ladder_view.png`).
