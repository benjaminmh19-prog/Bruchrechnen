# Kreis-Klicktest am 17.11.2026

## Getestete Versionen

Die Ausgangsversion wurde direkt auf [GitHub Pages](https://benjaminmh19-prog.github.io/Bruchrechnen/) getestet. Sie gehört zum veröffentlichten Hauptbranch-Commit `e66d9b02bd3e03f9b44c54d5dab2287a24eea699` (PR #4). Dieselben Interaktionen wurden anschließend gegen die geänderte lokale HTML-App geprüft. Diese neuen Animationen sind damit noch nicht als veröffentlicht bestätigt; der separate Pull Request muss dafür erst zusammengeführt werden.

Verwendet wurde Playwright mit echtem Chromium-Rendering, realen Maus-/Touch-Ereignissen und Tastaturbedienung. Mobile Ansichten wurden bei 390 × 844 und 320 × 740 CSS-Pixeln simuliert. Das ist kein Test auf einem physischen iPhone oder mit Safari. Die normalen Interaktionstests liefen ohne Service Worker, um eindeutig die angeforderte HTML-Version zu prüfen.

## Ergebnis

| Prüfung | Live-Ausgangsversion | Neue lokale Version |
| --- | --- | --- |
| Beide Werkstatt-Kreise: Antippen, Pfeilnavigation, Enter | bestanden | bestanden |
| Erweitern: 3/3 → 6/6, passende Vorschau, ausgeführtes Bildpaar bleibt stehen | bestanden | bestanden |
| Kürzen: Antippen markiert die ganze Zweiergruppe | bestanden | bestanden |
| Grafiktraining: Einzelstücke, Leertaste, Sperre nach Lösungsanzeige | bestanden | bestanden |
| Fehlerdetektiv: Einzelstücke, Leertaste, Sperre nach Lösungsanzeige | bestanden | bestanden |
| 320-Pixel-Ansicht: zwölf rasche Antipp-Klicks, richtiger Endzustand | bestanden | bestanden |
| Systemeinstellung „Bewegung reduzieren“: keine Animation | bestanden | bestanden |

In diesen Szenarien wurden keine JavaScript-Seitenfehler oder horizontalen Seitenüberläufe festgestellt. Bruchflächen und Stückgeometrie blieben bei den Auswahlwechseln unverändert.

## Beobachtung und Verbesserung

Die Live-Ausgangsversion berechnete die Auswahl korrekt, ersetzte jedoch die angeklickten Stücke im DOM. Gemessen wurden `sameNode: false`, eine Übergangsdauer von `0s` und keine laufende Stückanimation. Dadurch erfolgte der Farbwechsel unmittelbar und ohne gezielte Klick-Rückmeldung.

In der neuen lokalen Version bleiben die Stücke bei unveränderter Einteilung dieselben DOM-Knoten. Gemessen wurden `sameNode: true`, aktivierte Farbübergänge von 140 ms und ein Helligkeitsimpuls von 180 ms. Die Auswahl und Bruchzahl werden sofort aktualisiert; der Impuls ist nur eine visuelle Bestätigung. Er verändert weder Größe, Position noch Form eines Stücks. Schnelle Folgeeingaben werden nicht verzögert oder gesammelt. Gruppen und ihre Ergebnisvorschau reagieren gemeinsam.

Zusätzliche automatische jsdom-Regressionen in `animations.test.cjs` prüfen DOM-Erhalt, Geometrie, Gruppenauswahl, Impuls-Abbruch, reduzierte Bewegung, fehlende Web-Animations-Unterstützung und gesperrte Antworten. Sie ergänzen die bestehenden Rechen-, Fokus-, Trainings- und Detektivtests und werden über `npm test` auch in GitHub Actions ausgeführt.

## Zusätzliche lokale Browserprüfungen

Auch 24 unmittelbar aufeinanderfolgende reale Maus-Klicks ergaben die richtige Auswahl; derselbe Stückknoten blieb erhalten und es lief höchstens ein eigener Helligkeitsimpuls pro Stück. Desktop-Dunkelmodus bei 1280 × 900 Pixeln zeigte funktionierende Balkenanimationen ohne JavaScript-Seitenfehler oder Seitenüberlauf. Ein Offline-Neuladen mit dem neuen Cache `bruchrechnen-v6` erlaubte weiterhin die Kreisstück-Auswahl.

Beim Wechsel zu „Bewegung reduzieren“ während einer laufenden Animation zeigte die echte Chromium-Prüfung, dass ein bereits gestarteter CSS-Farbwechsel trotz entfernter Transition-Deklaration noch zu Ende laufen konnte. Deshalb werden neben den eigenen Impulsen jetzt auch die laufenden `fill`-/`background-color`-Transitions gezielt abgebrochen. Andere Elementanimationen bleiben unberührt. Der korrigierte Ablauf und die ergänzte Regression sind bestanden.
