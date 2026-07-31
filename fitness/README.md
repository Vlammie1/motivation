# Transform — workout tracker (Android)

Native Android-app voor één gebruiker. Alles staat lokaal op het toestel: geen account,
geen backend, geen netwerkverkeer. Deze map staat los van de rest van de repo (die is een
React/Vite-webapp) en deelt er geen code mee.

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
| **Sessie** | Volgt de oefeningen één voor één. Tik op het scherm = onderdeel klaar → pauze met aftelklok. Tijdens de pauze de vraag hoeveel herhalingen je deed, met snelkeuzes rond je vorige aantal (10 → 9/10/11/12) plus "Anders…". Oefeningen op tijd (plank, mountain climbers) tellen zelf af. |
| **Voortgang** | Bovenaan je weekcijfers en de wekelijkse weeg-check-in. Daaronder per oefening een hoekige lijngrafiek: één punt per workout, streepjeslijn = gemiddelde, puntjeslijn = verwachting voor volgende week (lineaire regressie over je punten). Tik op een punt voor de details van die dag, met het verschil per oefening ten opzichte van de vorige keer. |
| **Voeding** | Het vaste eetschema (6 momenten) afvinken, water bijhouden en losse extra's loggen. Toont kcal en eiwit tegen de dagdoelen. |
| **Instellingen** | Route A (met dumbbells) of route B (puur lichaamsgewicht), trilfeedback, en het volledige plan ter referentie. |

Schermafbeeldingen staan in [`screenshots/`](screenshots).

## Structuur

```
data/model     Het programma en het eetschema als statische data (Program.kt, Nutrition.kt)
data/db        Room: sessies, set-logs, afvinkjes, maaltijden, water, weegmomenten
data/prefs     DataStore: gekozen route + trilfeedback
data/repo      FitnessRepository — de enige ingang naar de data
ui/            Eén map per scherm (een `Screen` die de viewmodel koppelt en een stateless
               `Content` die alleen state en callbacks krijgt), plus theme/ en components/
```

De hele dependency-injectie is `FitnessApplication`: één database, één repository.

## Het programma

Twee routes uit het transformatieplan, allebei 4 dagen per week (ma · di · do · vr,
woensdag/zaterdag/zondag rust). Oefeningen die in beide routes hetzelfde zijn (push-ups,
pull-ups, plank, …) delen hun id, zodat je grafiek doorloopt als je van route wisselt.

Voedingsdoel: 2800–3000 kcal, 110–130g eiwit, 2,5–3L water per dag.

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
