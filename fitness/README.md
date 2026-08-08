# Transform — workout tracker (Android)

Native Android-app voor één gebruiker. Alles staat lokaal op het toestel: geen account en
geen backend. Het net gaat alleen open als je er zelf om vraagt — bij het scannen van een
streepjescode (Open Food Facts) en bij het laten beoordelen van een foto van je bord
(Gemini). Deze map staat los van de rest van de repo (die is een React/Vite-webapp) en
deelt er geen code mee.

## Bouwen en installeren

**Met Android Studio** — open de map `fitness` (niet de repo-root) als project. Studio maakt
zelf een `local.properties` met je SDK-pad aan. Daarna Run ▶ met je telefoon aangesloten.

**Vanaf de command line:**

```bash
cd fitness
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties   # of je eigen SDK-pad

./gradlew assembleDebug     # bouwt de APK
./gradlew installDebug      # zet hem direct op een aangesloten toestel
```

De APK komt te staan in `app/build/outputs/apk/debug/app-debug.apk`. Die kun je ook naar je
telefoon kopiëren en handmatig installeren (wel even "installeren uit onbekende bron"
toestaan).

Vereisten: JDK 17 of hoger, Android SDK met platform 35. compileSdk 35, minSdk 26 — alles
draait dus vanaf Android 8.

## Schermen

| Scherm | Wat het doet |
| --- | --- |
| **Vandaag** | De workout van vandaag als afvinklijst, daaronder lichter de komende zes dagen. Onderaan de grote knop **Sessie starten**. Op een rustdag kun je alsnog een workout kiezen. |
| **Sessie** | Volgt de oefeningen één voor één. Het grote getal is je doel voor déze set. Aan het begin van de sessie komt dat van je vorige training (die set plus één rep of plus vijf seconden, "vorige keer 12" eronder); zodra je een set gelogd hebt neemt die het over: deed je er 15, dan vraagt set 2 er 16, met "vorige set 15" eronder. Zo loopt de progressie ook bínnen een training door. Zonder historie staat het bereik uit het schema er. Bij dumbbells gaat het in twee trappen: eerst reps erbij binnen het bereik uit het schema, en zodra je bovenaan zit gaan de kilo's 2,5 omhoog en beginnen de reps weer onderaan ("Repbereik vol — pak de zwaardere dumbbell"). Oefeningen per kant lopen in twee helften zonder pauze ertussen: boven het getal staan **RECHTS** en **LINKS** naast elkaar, de kant die aan de beurt is oranje en de kant die je gehad hebt met een vinkje. Eerst rechts, tik, dan links, tik — en pas dan volgt de pauze. Tik op het scherm = onderdeel klaar → pauze met aftelklok, te verlengen met **+ 1 min**. Tijdens de pauze de vraag hoeveel herhalingen je deed (bij een oefening per kant: hoeveel per kant), met snelkeuzes rond je doel (13 → 12/13/14/15) plus "Anders…". Bij oefeningen met dumbbells staat daarboven de kg per dumbbell, met − 2,5 / + 2,5 en het getal zelf aan te tikken voor een eigen gewicht. Oefeningen op tijd tellen zelf af, naar je doel toe. Na de laatste set van de sessie volgt geen pauze meer. |
| **Voortgang** | Bovenaan je weekcijfers en de wekelijkse weeg-check-in. Daaronder per oefening een hoekige lijngrafiek: één punt per workout, streepjeslijn = gemiddelde, puntjeslijn = verwachting voor volgende week (lineaire regressie over je punten). Je kiest wat een punt voorstelt: **gemiddeld** (alle sets bij elkaar gedeeld door het aantal sets, de standaard), **beste set**, of **totaal** over de dag. Oefeningen met dumbbells krijgen hun eigen drie tabs, omdat meer kilo's bij hetzelfde aantal reps ook vooruitgang is: **volume** (kg per dumbbell × herhalingen, alle sets bij elkaar — de standaard), **gewicht** (de zwaarste dumbbell van die dag) en **gemiddeld**. Tik op een punt voor de details van die dag, met het verschil per oefening ten opzichte van de vorige keer en de kilo's erbij. |
| **Voeding** | Volwaardige caloriemeter: kcal en de drie macro's tegen je dagdoelen, water, en een dagboek gegroepeerd per eetmoment. Loggen kan op vier manieren — streepjescode scannen, een foto van je bord door de AI laten schatten, een product uit je eigen lijst kiezen, of een vaste maaltijd in één tik. De camera komt als blad omhoog in plaats van over het hele scherm: het beeld in een kaart, daaronder de witte sluiterknop met links ernaast de knop om een foto uit je galerij te pakken. Bij water staan er knoppen voor 250 en 500 ml plus **Anders** voor een eigen aantal; het rondje ervoor zet ze van plus op min. |
| **Instellingen** | Route A (met dumbbells) of route B (puur lichaamsgewicht), trilfeedback, en het volledige plan ter referentie. |

Schermafbeeldingen staan in [`screenshots/`](screenshots).

## Structuur

```
data/model     Het programma en de voedingsmodellen als statische data (Program.kt, Nutrition.kt)
data/db        Room: sessies, set-logs, afvinkjes, producten, maaltijden, dagboek, water,
               weegmomenten
data/net       Open Food Facts (streepjescodes) en Gemini (fotoherkenning), op HttpURLConnection
data/prefs     DataStore: route, trilfeedback, dagdoelen en de API-sleutel
data/repo      FitnessRepository — de enige ingang naar de data
ui/            Eén map per scherm (een `Screen` die de viewmodel koppelt en een stateless
               `Content` die alleen state en callbacks krijgt), plus theme/ en components/
```

De hele dependency-injectie is `FitnessApplication`: één database, één repository.

## Het programma

Twee routes uit het transformatieplan, allebei 4 dagen per week (ma · di · do · vr,
woensdag/zaterdag/zondag rust). Oefeningen die in beide routes hetzelfde zijn (push-ups,
pull-ups, plank, …) delen hun id, zodat je grafiek doorloopt als je van route wisselt.

Voedingsdoel: standaard 2900 kcal, 120g eiwit, 360g koolhydraten, 90g vet en 3L water per
dag. Aan te passen in de app zelf, met het knopje bij het kcal-totaal op het voedingsscherm.

## Vaste maaltijden

Eet je vaker precies hetzelfde — havermout met melk en een banaan — dan zet je dat één keer
klaar als maaltijd: **Loggen → Maaltijden → Nieuwe maaltijd**, een naam en daaronder de
producten met de hoeveelheid die je er normaal van neemt. Daarna is het één tik in de lijst
en staan alle regels apart in je dagboek, bij het gekozen eetmoment.

De producten hangen er los bij: corrigeer je later de voedingswaarde van je havermout, dan
klopt de maaltijd meteen weer. Wis je een product, dan blijft de maaltijd bestaan en telt
alleen die ene regel niet meer mee.

## Scannen en de AI

**Streepjescodes** worden gelezen met ML Kit (offline, op het toestel) en opgezocht in
[Open Food Facts](https://world.openfoodfacts.org) — een open database zonder sleutel of
account. Wat daar gevonden wordt, komt meteen in je eigen productenlijst te staan; een
tweede scan van dezelfde verpakking gaat dus niet meer het net op. Staat een code er niet
in, dan vul je hem één keer zelf in en onthoudt de app hem bij de code.

**De foto van je bord** gaat naar Gemini, dat elk onderdeel apart benoemt en het gewicht en
de voedingswaarde schat. Je krijgt de regels eerst te zien: aanvinken wat klopt, de
hoeveelheid bijstellen (de macro's schalen mee), of er een aanwijzing bij typen ("dit is
een grote portie") en het opnieuw laten bekijken. Pas als je bevestigt gaat het het
dagboek in.

Daarvoor is een Gemini API-sleutel nodig, gratis te halen bij
[aistudio.google.com](https://aistudio.google.com). Twee manieren om hem in te stellen:

- **In de app** — Instellingen → Fotoherkenning → sleutel plakken. Hij blijft in DataStore
  op het toestel.
- **Bij het bouwen** — zet `GEMINI_API_KEY=AIza…` in `fitness/local.properties` (staat niet
  in git). Die waarde is dan de standaard; een sleutel die je in de app invult gaat er
  overheen.

Zonder sleutel werkt de rest van het scherm gewoon; alleen de fotoknop wijst je dan naar de
instellingen.

## Screenshots vernieuwen

De schermen renderen zichzelf naar PNG's zonder emulator of toestel:

```bash
./gradlew testDebugUnitTest
```

`app/src/test/.../ScreenshotTest.kt` zet elk `Content`-scherm met vaste voorbeelddata op het
scherm en schrijft het resultaat naar `screenshots/`.

## Vormgeving

Zwarte achtergrond met warme oranje-rode accenten. De grote kaart op de homepage gebruikt
een mesh-verloop: een basisverloop van geel-oranje naar rood, daaroverheen zachte
lichtvlekken die additief mengen, stofdeeltjes en filmkorrel — zie
`ui/components/GlowBackdrop.kt`.

Elk verloop krijgt korrel, want zonder korrel oogt een verloop digitaal glad en zie je
op 8-bits schermen bandingstrepen. Op Android 13+ tekent één AGSL-shader het verloop en
de korrel in één keer; daaronder valt het terug op losse lagen met een herhalende
ruistegel. De korrel zit in echte device-pixels, is monochroom en additief, wordt sterker
in de schaduwen en staat stil — zie `ui/components/Grain.kt` voor de details en
`Modifier.filmGrain()` om er een ander verloop mee te bedekken.

Verder in de vormgeving:

- Een weekstrook bovenaan Vandaag met een stip onder elke trainingsdag.
- Afvinken gebeurt met rondjes die zich vullen, niet met vinkjes.
- De vierpuntige ster is een eigen pad (`ui/components/Sparkle.kt`), geen icoon uit een set.
- Het sessiescherm is een speler: segmentbalk bovenaan (één streepje per set), grote
  teller in het midden en de oefening eronder.

- Kopregels: [Anton](https://fonts.google.com/specimen/Anton) (SIL Open Font License 1.1),
  licentie in `LICENSES/Anton-OFL.txt`.
- Iconen: [Phosphor](https://phosphoricons.com) (MIT), variant Fill, via
  `com.adamglin:phosphor-icon`.
