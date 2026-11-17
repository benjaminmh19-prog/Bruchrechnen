# Bruchrechnen Klasse 6

Interaktive Lern-App zum Rechnen mit Brüchen für Schülerinnen und Schüler der 6. Klasse.

- Vier Reiter für Addieren, Subtrahieren, Multiplizieren und Dividieren, jeweils mit Merksatz, Alltagsbeispiel, Rechenweg und Übungsaufgaben in drei Stufen
- **Grafische Bruch-Werkstatt:** Brüche durch Antippen von Balken- oder Kreisstücken einstellen und die Rechnung Schritt für Schritt mit Bildern bearbeiten
- Zufällige Sachaufgaben mit Tipp-Funktion bei jeder Rechenart
- Reiter „Spiele“: Memory, Größer oder kleiner, Zeitjagd, Ganzes füllen
- Läuft im Browser ohne Server und ohne Anmeldung. Ergebnisse und Rekorde werden nur im jeweiligen Browser (localStorage) gespeichert
- Installierbar als App (PWA) und nach dem ersten Laden offline nutzbar

## Grafisch rechnen

In „Deine Bruch-Werkstatt“ lassen sich die beiden Brüche über die Plus-/Minus-Tasten oder direkt im Bild einstellen. Ein Balken beziehungsweise ein Kreis ist immer ein Ganzes. Ein Stück antippen, um den Bruch bis dorthin zu färben; das letzte gefärbte Stück erneut antippen, um ein Stück weniger zu wählen. „Leeren“ setzt den Zähler auf 0. Beim zweiten Bruch einer Division ist das gesperrt, denn durch 0 darf man nicht teilen.

- **Addieren:** Beide Brüche gleich fein unterteilen und die Stücke zusammenlegen. Ergebnisse über 1 werden auf mehrere gleich große Ganze verteilt. Die beiden Ausgangsmengen bleiben durch unterschiedliche Farben erkennbar.
- **Subtrahieren:** Nach dem Gleichnamigmachen die abzuziehenden Stücke einzeln antippen oder „Ein Stück wegnehmen“ benutzen. Gestreifte Stücke sind weggenommen; erneut antippen legt sie zurück. Sobald die geforderte Anzahl entfernt ist, lässt sich der Rest ansehen.
- **Multiplizieren:** Spalten und Zeilen eines Rechtecks markieren oder eine Zelle als gegenüberliegende Ecke auswählen. Die mit × markierte Überschneidung zeigt das Produkt. Das gesamte Rechteck ist ein Ganzes.
- **Dividieren:** Gleich große Portionen abmessen und zählen. Eine Restmenge wird als Bruchteil einer weiteren Portion dargestellt. Beispiel: 3/4 : 1/2 ergibt 1 volle Portion und 1/2 einer weiteren Portion, also 1 1/2.

„Schritt zurück“ und „Neu starten“ helfen beim Ausprobieren. Die letzten Schritte zeigen das Kürzen und beim Dividieren den Zusammenhang mit dem Kehrwert. „Vollständigen Rechenweg ansehen“ enthält weiterhin den schriftlichen Rechenweg.

Mit **„Mit Bild lösen“** unter einer Übungsaufgabe werden deren Brüche in die Werkstatt übernommen. Das Ergebnis wird danach wie gewohnt bei „Du bist dran“ eingegeben; die Übernahme zählt nicht als Versuch und füllt keine Antwort automatisch aus.

Die Werkstatt unterstützt Brüche von 0 bis 1 mit Nennern von 2 bis 12 sowie Ergebnisse über 1. Negative Differenzen werden im Klasse-6-Grundmodus mit einem Hinweis abgefangen; die Brüche können dann getauscht werden. Alle Aktionen funktionieren ohne Ziehen, per Antippen oder Tastatur. Sehr feine Subtraktionsbalken und breite Multiplikationsraster lassen sich seitlich scrollen.

## Erweitern und Kürzen

Der neue Reiter **„Erweitern & Kürzen“** zeigt zwei gleich große Balken: den aktuellen Bruch und eine Vorschau der neuen Einteilung. Beim Erweitern entstehen kleinere Stücke; beim Kürzen werden kleine Stücke zu größeren Gruppen zusammengefasst. Die gefärbte Menge bleibt sichtbar gleich groß. Zähler und Nenner werden immer mit derselben ganzen Zahl verändert.

Faktor beziehungsweise Kürzungszahl auswählen und die Umformung anwenden. Ungültige Kürzungen werden mit einer Erklärung gesperrt. Gemeinsame Teiler, „Ganz kürzen“, Rückgängig und ein Entdeckerweg helfen beim Ausprobieren. Auch 0/6 → 0/1 und 6/6 → 1/1 sind möglich. Für gut lesbare Bilder ist die Darstellung auf höchstens 72 Teile eines Ganzen begrenzt.

## Grafisch üben und Lerncheck

Im Reiter **„Grafisch üben“** werden zufällige Aufgaben zu den vier Rechenarten sowie zum Erweitern und Kürzen erzeugt. Es gibt zwei Schwierigkeitsstufen und eine gemischte Auswahl. Die Antwort wird selbst gebaut: Nenner von 1 bis 36 wählen, anschließend Stücke im Bild markieren oder die großen Plus-/Minus-Tasten und das Zählerfeld nutzen. Alle Ganzes-Balken haben dieselbe Breite. Bei Division können bis zu vier Ganze dargestellt werden.

| Modus | Verhalten |
| --- | --- |
| Training | Beliebig viele Aufgaben, gezielte Rückmeldungen, Tipps und Lösung aufdecken. Gleichwertige Rechenantworten sind erlaubt; beim Erweitern zählt der vorgegebene Faktor, beim Kürzen die vollständig gekürzte Form. Leere oder ungültige Eingaben werden nicht gewertet. |
| Lerncheck | Acht Aufgaben ohne Zeitdruck, vor Abgabe keine Tipps oder Lösung. Jede Aufgabe wird genau einmal gewertet. Die gemischte Auswahl enthält alle sechs Aufgabentypen und zwei zusätzliche Zufallsaufgaben. Nach Abgabe folgen Auswertung und Weiter; am Ende stehen Ergebnisübersicht und Bestwert. |

Während eines Lernchecks sind die Einstellungen gesperrt; „Lerncheck abbrechen“ beendet ihn ohne gespeicherte Gesamtpunktzahl. Ein Reiterwechsel erhält die laufende Aufgabe im geöffneten Browserfenster. Nur zusammengefasste Trainingszahlen und Lerncheck-Bestwerte werden lokal im eigenen Schlüssel `bruch-visual-training-v1` gespeichert. Keine Anmeldung, persönlichen Schülerdaten oder Server erforderlich. Die Werte dienen der Selbsteinschätzung, nicht als manipulationssichere Prüfungsnoten.

## Fehlerdetektiv

Der neue Modus ist über den Reiter **„Fehlerdetektiv“**, den Button in der Bruch-Werkstatt und die Modusauswahl unter „Grafisch üben“ erreichbar. Er erzeugt absichtlich falsche Rechenwege zu allen vier Rechenarten sowie zum Erweitern und Kürzen, einzeln oder gemischt in zwei Schwierigkeitsstufen.

Der Ablauf lautet **finden → reparieren → begründen**: Zuerst den verdächtigen Rechenweg untersuchen, dann das voreingestellte falsche Bruchbild durch Antippen von Stücken oder Ändern von Zähler und Nenner korrigieren und schließlich eine von drei Begründungen wählen. Ein Fall gilt nur als gelöst, wenn das Ergebnis und die Begründung gemeinsam stimmen. Gleichwertige Rechenantworten sind erlaubt; beim Erweitern zählt der verlangte Faktor und beim Kürzen die vollständig gekürzte Form.

Tipps und eine Auflösung helfen beim Lernen. Eine aufgedeckte Lösung zählt nicht als gelöster Fall; ein Fall nach Tipp oder Fehlversuch zählt nicht als „im ersten Versuch ohne Hilfe“. Leere Eingaben, Nenner 0 und unvollständige Antworten werden nicht gewertet; identische Prüfungen zählen nicht mehrfach. Der laufende Fall bleibt beim Reiterwechsel erhalten, ebenso ein pausierter Grafik-Lerncheck. Zusammengefasste Detektivzahlen liegen ausschließlich lokal im separaten Schlüssel `bruch-detective-v1`.

## Dateien

| Datei | Zweck |
| --- | --- |
| `index.html` | Die komplette App (HTML, CSS, JavaScript) |
| `manifest.webmanifest` | App-Name, Farben und Icons für die Installation |
| `sw.js` | Service Worker für den Offline-Betrieb |
| `favicon.svg`, `icon-*.png` | App-Icons im Repository-Hauptverzeichnis |

## Lokal starten

Ein Service Worker läuft nur über `http://localhost` oder `https`, nicht über `file://`.

```sh
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen. Die Lernfunktionen von `index.html` funktionieren auch ohne Service Worker.

## Automatische technische Tests

Die App selbst braucht weiterhin keine Installation und keinen Build-Schritt. Nur zum Testen ist Node.js 22 erforderlich:

```sh
npm ci --ignore-scripts
npm test
```

Die Tests prüfen Bruchmodelle und Bedienung, Wertgleichheit bei Erweitern/Kürzen, ungültige Umformungen, Aufgabengeneratoren, grafische Antwortbewertung, Einmalwertung des Acht-Aufgaben-Lernchecks, Tastaturfokus sowie die bisherigen Übungen und Spiele. `.github/workflows/tests.yml` führt dieselben Tests automatisch bei jedem Push und Pull Request aus. Die Abhängigkeit `jsdom` wird ausschließlich für die Tests verwendet und nicht von der Lernseite geladen.

## Veröffentlichen mit GitHub Pages

Das Repository verwendet GitHub Pages mit **Deploy from a branch**, Branch **main**, Ordner **/ (root)**. Änderungen auf anderen Branches ändern die veröffentlichte Seite nicht. Nach dem Zusammenführen eines Pull Requests in `main` wird die neue Version durch GitHub Pages ausgeliefert.

## Installieren

- **Android (Chrome):** Menü → „App installieren“
- **iPad/iPhone (Safari):** Teilen → „Zum Home-Bildschirm“
- **Windows, macOS, Linux (Chrome oder Edge):** Installieren-Symbol in der Adressleiste

## Neue Version ausliefern

In `sw.js` den Versionsnamen bei `CACHE` erhöhen, damit der alte Offline-Cache dieser App ersetzt wird. Die Bruch-Werkstatt mit Fehlerdetektiv verwendet `bruchrechnen-v4`. Caches anderer Apps derselben Domain bleiben unangetastet.

## Schriften

Die Schriften Baloo 2 und Nunito werden von Google Fonts geladen und danach im Cache abgelegt. Ohne Netz und ohne Cache nutzt die App Systemschriften.
