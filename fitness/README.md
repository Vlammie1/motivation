# Transform — workout tracker (Android)

Native Android-app voor één gebruiker. Alles staat lokaal op het toestel: geen account,
geen backend, geen netwerkverkeer. Deze map staat los van de rest van de repo (die is een
React/Vite-webapp) en deelt er geen code mee.

## Bouwen

```bash
cd fitness
./gradlew assembleDebug          # APK in app/build/outputs/apk/debug/
./gradlew installDebug           # direct op een aangesloten toestel
```

Vereist een `local.properties` met `sdk.dir=/pad/naar/Android/sdk` (Android Studio maakt
die zelf aan). compileSdk 35, minSdk 26, JDK 17+.

## Schermen

| Scherm | Wat het doet |
| --- | --- |
| **Vandaag** | De workout van vandaag als afvinklijst, daaronder lichter de komende zes dagen. Onderaan de grote knop **Sessie starten**. Op een rustdag kun je alsnog een workout kiezen. |
| **Sessie** | Volgt de oefeningen één voor één. Tik op het scherm = onderdeel klaar → pauze met aftelklok. Tijdens de pauze de vraag hoeveel herhalingen je deed, met snelkeuzes rond je vorige aantal (10 → 9/10/11/12) plus "Anders…". Oefeningen op tijd (plank, mountain climbers) tellen zelf af. |
| **Voortgang** | Per oefening een hoekige lijngrafiek: één punt per workout. Streepjeslijn = gemiddelde, puntjeslijn = verwachting voor volgende week (lineaire regressie over je punten). Tik op een punt voor de details van die dag, met het verschil per oefening ten opzichte van de vorige keer. Onderaan de wekelijkse weeg-check-in. |
| **Voeding** | Het vaste eetschema (6 momenten) afvinken, water bijhouden en losse extra's loggen. Toont kcal en eiwit tegen de dagdoelen. |
| **Instellingen** | Route A (met dumbbells) of route B (puur lichaamsgewicht), trilfeedback, en het volledige plan ter referentie. |

## Structuur

```
data/model     Het programma en het eetschema als statische data (Program.kt, Nutrition.kt)
data/db        Room: sessies, set-logs, afvinkjes, maaltijden, water, weegmomenten
data/prefs     DataStore: gekozen route + trilfeedback
data/repo      FitnessRepository — de enige ingang naar de data
ui/            Eén map per scherm (screen + viewmodel), plus theme/ en components/
```

De hele dependency-injectie is `FitnessApplication`: één database, één repository.

## Het programma

Twee routes uit het transformatieplan, allebei 4 dagen per week (ma · di · do · vr,
woensdag/zaterdag/zondag rust). Oefeningen die in beide routes hetzelfde zijn (push-ups,
pull-ups, plank, …) delen hun id, zodat je grafiek doorloopt als je van route wisselt.

Voedingsdoel: 2800–3000 kcal, 110–130g eiwit, 2,5–3L water per dag.

## Fonts

De kopregels gebruiken [Anton](https://fonts.google.com/specimen/Anton) (SIL Open Font
License 1.1) — licentie in `LICENSES/Anton-OFL.txt`.
