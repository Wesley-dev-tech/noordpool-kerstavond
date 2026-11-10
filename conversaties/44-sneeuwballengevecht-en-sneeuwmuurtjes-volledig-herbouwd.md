# Conversatie 44: Sneeuwballengevecht & Iglo-sneeuwmuurtjes volledig herbouwd

- **Conversatie-ID**: [`a5edbfdf-6fbd-4576-a7c1-323d1218bd3b`](conversation://a5edbfdf-6fbd-4576-a7c1-323d1218bd3b)
- **Datum**: 2026-11-09 / 2026-11-10
- **Betrokken bestanden**:
  - [`src/actors/elf-model.js`](file:///c:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/actors/elf-model.js)
  - [`src/actors/elves.js`](file:///c:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/actors/elves.js)
  - [`src/world/obstacles.js`](file:///c:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/world/obstacles.js)
  - [`src/main.js`](file:///c:/Users/wesle/.gemini/antigravity/scratch/noordpool-kerstavond/src/main.js)
- **Screenshots**:
  - `screenshot_snowball_bramble.png` (close-up van Bramble en zijn gebogen sneeuwmuur)
  - `screenshot_snowball_noel.png` (close-up van Noel en zijn gebogen sneeuwmuur)
  - `screenshot_snowball_mid_throw.png` (actieshot midden in een worp met vliegende bal in parabool en wegduikend doelwit)

---

## 1. Vraag van de gebruiker

> De sneeuwballengooiers zijn nog niet afgewerkt en de muur klopt niet. Herbouw dit volledig:
> 
> - Zoek de bestaande code, verwijder de oude elfjes en de oude muur.
> - Twee elfjes via `createElf()` (dus volledig afgewerkt: gezicht, oren, muts met belletje, kousen, krulschoenen, handjes), in verschillende kleuren, ±8 m van elkaar, elk achter een eigen muurtje en naar elkaar gekeerd.
> - Muurtjes: een gebogen rij van 6–8 opgestapelde sneeuwblokken (afgeronde boxen, licht verschillend van grootte en rotatie), 2 lagen hoog (±70 cm), in verband gelegd zoals een iglo, met sneeuw in de voegen en een paar sneeuwballen bovenop. Geen enkel glad blauw blok meer, gewoon wit-blauwe sneeuw met hoge roughness.
> - Gooi-animatie (met armen via schouder-/elleboog-pivots):
>   bukken achter de muur → sneeuw scheppen met twee handen → bal kneden → opkomen → gooiarm van achter het hoofd naar voren, tegengesteld been stapt mee → loslaten.
> - De bal vliegt in een parabool. Bij een treffer: sneeuwspat (deeltjes), het andere elfje wankelt en schudt zijn muts. Bij een misser: plof in de sneeuw.
> - Ze gooien om beurten en duiken weg als er een bal aankomt.
> - Controle: close-up screenshot van beide elfjes en de muurtjes, plus een screenshot midden in een worp.

---

## 2. Analyse & Uitvoering

### A. Gelede armen met schouder- en elleboogpivots in `elf-model.js`
- De armen zijn opgebouwd als een 2-delige hiërarchie:
  - `armGroup` (schouderpivot bovenaan bij $y = 0.46$)
  - `elbowGroup` (elleboogpivot halverwege bij $y = -0.105$)
  - `forearm`, `wristCuff`, en `handGroup` met vingers en duim als child van `elbowGroup`.
- Zowel schouder- als elleboogrotaties zijn onafhankelijk aanstuurbaar voor natuurlijke worpen, kneden en scheppen.

### B. Twee afgewerkte elfjes via `createElf()` op 8 meter afstand
- **Bramble** (`elves[2]`): groen feestelijk pakje, rood bont, groen-witte gestreepte kousen, bruine krulschoentjes met oplichtende gouden bellen, puntoren, expressief gezicht en puntmuts met bel. Geplaatst op `(-23.2, y, 10.5)`.
- **Noel** (`elves[3]`): rood feestelijk pakje, wit bont, rood-witte gestreepte kousen, groene krulschoentjes met oplichtende gouden bellen, puntoren, expressief gezicht en puntmuts met bel. Geplaatst op `(-17.3, y, 15.9)`.
- Afstand: $\sqrt{(5.9)^2 + (5.4)^2} = 7.998\text{ m} \approx 8.0\text{ m}$.
- Naar elkaar toe gedraaid met `angleBrambleToNoel` en `angleNoelToBramble`.

### C. Gebogen 2-laags iglo-sneeuwmuurtjes in verband (`buildSnowWall`)
- `createRoundedSnowBlockGeo(w, h, d, bevel, seed)`: afgeronde sneeuwblokken met organische oppervlakte-verstoring.
- 7 sneeuwblokken per muurtje gelegd in een flauwe boog:
  - 4 blokken op de onderste laag ($y = 0.17$)
  - 3 blokken op de bovenste laag ($y = 0.51$) die exact de voegen van de onderlaag overlappen (verbandlegging zoals bij een iglo).
- Sneeuw in de voegen en een zachte voetlaag rond de basis.
- 5 klaarliggende sneeuwballen bovenop de rand.
- Materiaal: `roughness: 0.94`, `metalness: 0.01`, kleur `0xf4f8fc` (geen glad blauw blok meer, maar mat poederig wit-blauw sneeuw).

### D. Volledige gooi-animatie, vluchtparabool & tref-/misreacties
- State machine met 6 fasen (`FIGHT_PAUSE`, `FIGHT_SCOOP`, `FIGHT_KNEAD`, `FIGHT_THROW`, `FIGHT_FLIGHT`, `FIGHT_IMPACT`):
  1. **Bukken achter het muurtje**: charGroup zakt omlaag achter de 70 cm muur.
  2. **Sneeuw scheppen met twee handen**: beide armen buigen via schouder en elleboog naar beneden in de sneeuw.
  3. **Bal kneden**: beide handen draaien cirkelend om elkaar; een verse witte sneeuwbal verschijnt in de hand.
  4. **Opkomen en gooien**: elfje rijst omhoog, rechterarm zwaait achter het hoofd naar achteren (`rotation.x: -2.15`), tegengesteld been stapt naar voren (`leftLeg.rotation.x: -0.42`), romp tordeert mee, en de arm zwiept explosief naar voren met elleboogsnap (`rotation.x: +1.48`).
  5. **Parabolische vlucht**: bal vliegt via een parabool met tophoogte $1.95\text{ m}$ over de 8 meter tussenafstand; het doelwit duikt tijdig weg achter zijn eigen muur met armen beschermend boven het hoofd.
  6. **Treffer vs. Misser**:
     - *Treffer*: sneeuwburst van 48 deeltjes spat uiteen; getroffen elfje wankelt achteruit, veegt sneeuw af en schudt zijn muts (met wiebelend belletje en opdwarrelend sneeuwstof).
     - *Misser*: zachte plof in de sneeuw.
  7. Beurten wisselen automatisch af met een natuurlijke adempauze.

### E. Visuele verificatie via screenshots
- `screenshot_snowball_bramble.png`: close-up van Bramble (groen pak, gestreepte kousen, schoenen met belletjes, oren, muts) achter zijn gebogen iglo-muur met sneeuwballen.
- `screenshot_snowball_noel.png`: close-up van Noel (rood pak, gestreepte kousen, schoenen met belletjes, oren, muts) achter zijn gebogen iglo-muur met sneeuwballen.
- `screenshot_snowball_mid_throw.png`: spectaculaire actieopname midden in de worp: Bramble zwiept zijn arm naar voren met instappend been, de sneeuwbal zweeft in volle vlucht in een hoge parabool door de lucht, en Noel duikt weg achter zijn eigen muur in de achtergrond.
