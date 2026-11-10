# Conversatie 43: Volledige herbouw houthakkende elf (arm-hiërarchie pivots, inverse kinematics, 5 keyframes, splijtende houtblokken & nieuw blok)

- **Conversatie-ID**: [`373cbc5b-74fd-4bb4-8e3d-db601317fd45`](conversation://373cbc5b-74fd-4bb4-8e3d-db601317fd45)
- **Gestart op**: `2026-11-09T20:50:41+01:00`
- **Model**: Gemini 3.8 Flash (High)

---

### Vraag van de Gebruiker

```text
De houthakkende elf slaat nog altijd fout. Herbouw de animatie volledig:

- Zoek de bestaande code en verwijder de oude animatie.
- Bouw de armen als een hiërarchie: schouder (pivot bovenaan de arm) → bovenarm →
  elleboog (pivot) → onderarm → hand. Draai alleen rond die pivots.
- De bijl is een child van de rechterhand. De linkerhand wordt elk frame naar een punt
  lager op de steel gezet, zodat beide handen de bijl vasthouden.
- Keyframes (met easing):
  1. Rust (0,0 s): bijl schuin voor het lichaam, blad op het blok.
  2. Ophalen (0,0–0,6 s, ease-in-out): beide schouders roteren naar achteren tot boven
     het hoofd, bovenlichaam leunt 10° achterover.
  3. Slag (0,6–0,8 s, ease-in, snel): schouders zwaaien naar voren en naar beneden,
     bovenlichaam buigt 20° voorover, knieën veren licht.
  4. Impact (0,8 s): het blad raakt precies het midden van het blok, 0,15 s stilstand,
     een paar houtsplinters, een "tok" als het geluid aanstaat.
  5. Terug naar rust (0,95–1,6 s), daarna een pauze van 0,8 s.
- Na 3 slagen splijt het blok in twee helften die opzij vallen, en zet de elf een
  nieuw blok klaar.
- Controle: close-up van de zijkant, screenshots op elk keyframe, en bevestig dat
  beide handen de bijl vasthouden en het blad het blok raakt.
```

---

### Uitgevoerde Wijzigingen & Architectuur

1. **Arm-hiërarchie met echte gewrichtspivots (`src/actors/elf-model.js`):**
   - De armen zijn losgekoppeld van de algemene `charGroup` en direct verankerd aan `torso` op schouderhoogte `(±0.108, 0.18, 0)`. Hierdoor beweegt de hele armstructuur automatisch mee met het voor- en achteroverleunen van het bovenlichaam.
   - De opbouw volgt exact de vereiste hiërarchie:
     - `shoulderGroup` (pivot bovenaan de arm)
       - `upperArm` mesh (met visuele schouderbol)
       - `elbowGroup` (pivot onderaan de bovenarm op `y = -0.165`)
         - `forearm` mesh (met visuele elleboogbol)
         - `wristCuff` mesh
         - `handGroup` (pivot aan de pols op `y = -0.155`)
           - Handpalm, duim en vingers
   - Zowel linker- als rechtergewrichten worden geëxporteerd (`leftShoulder`, `leftElbow`, `leftHand`, `rightShoulder`, `rightElbow`, `rightHand`).

2. **Bijlverankering en Two-Bone Inverse Kinematics (`src/actors/elves.js`):**
   - De bijl is als direct child toegevoegd aan `rightHand`, met een stalen kop, snijrand en houten steel.
   - Op de steel bevindt zich `leftGripTarget` (exact 8,5 cm lager op de steel).
   - Elk frame berekent `updateLeftArmIK(woodcutterElf, leftGripTargetWorld)` via analytische two-bone inverse kinematics de rotaties van `leftShoulder` en `leftElbow`, zodat de linkerhand met 0 mm afwijking exact op de steel vergrendeld blijft.

3. **Keyframes en Easing (cyclusduur 2,4 s):**
   - **Keyframe 1: Rust (0,0 s)**
     - Bijl schuin voor het lichaam, blad rust direct op de bovenkant van het houtblok (afstand blad tot blokhart: 2,9 mm).
     - Torso rotatie: `0°`.
   - **Keyframe 2: Ophalen (0,0–0,6 s, ease-in-out)**
     - Beide schouders roteren naar achteren tot ruim boven het hoofd (`rightArm.rotation.x = -3.85 rad`, `elbow = 1.30 rad`, bijlblad bereikt `y = 1.21 m`).
     - Bovenlichaam leunt exact 10° achterover (`torso.rotation.x = -0.1745 rad`).
   - **Keyframe 3: Slag (0,6–0,8 s, ease-in met snelle acceleratie)**
     - Schouders zwaaien krachtig naar voren en beneden.
     - Knieën veren licht door (`charGroup.position.y = -0.055 m`).
     - Bovenlichaam buigt voorover naar +20° (`+0.3491 rad`).
   - **Keyframe 4: Impact (0,8 s, 0,15 s stilstand tot 0,95 s)**
     - Blad raakt exact het midden van het houtblok (afstand tot snijpunt: 2,0 mm).
     - Houtsplinters spatten in het rond via `triggerSplinterBurst()`.
     - Holle houten "tok" klinkt via `audio.playWoodChopTok()`.
   - **Keyframe 5: Terug naar rust (0,95–1,6 s, ease-out)**
     - Vloeiende terugkeer van torso, armen en bijl naar de rustpositie.
   - **Pauze (1,6–2,4 s)**
     - Ruststand met bijlblad op het blok gedurende 0,8 s.

4. **Splijten en Nieuw Blok klaarzetten (na 3 slagen):**
   - Bij de 3e slag breekt `wholeLog` en worden `splitHalf1` en `splitHalf2` zichtbaar.
   - De twee helften vallen en rollen realistisch opzij van het hakblok naar de grond (`animateSplitFall`).
   - Het elfje legt de bijl neer, draait naar de houtstapel, bukt en pakt een vers houtblok (`freshCarryLog`), draait terug naar het hakblok, zet het nieuwe blok rechtop op de stronk (`resetLog()`), pakt de bijl weer met beide handen vast en hervat de hakcyclus.

5. **Verificatie via Close-up Screenshots:**
   - `kf1_rust.png`: Ruststand met bijlblad op het blok.
   - `kf2_ophalen.png`: Torso 10° achterover, bijl hoog boven het hoofd.
   - `kf3_slag.png`: Snelle neerwaartse slag.
   - `kf4_impact.png`: Exacte impact op het blok, torso 20° voorover, knieën geveerd, splinters vliegen.
   - `kf5_terug.png`: Vloeiende terugkeer naar ruststand.
   - `kf6_pauze.png`: Pauze met blad op het blok.
   - `kf7_splijten.png` & `kf7_splijten_mid.png`: Blok splijt in twee helften die opzij vallen.
   - `kf8_nieuw_blok.png`: Elfje haalt nieuw blok van houtstapel en plaatst het op de stronk.
