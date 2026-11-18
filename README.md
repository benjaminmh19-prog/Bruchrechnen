# Bruchrechnen Klasse 6

Interaktive Lern-App zum Rechnen mit Brüchen für Schülerinnen und Schüler der 6. Klasse.

- **Übersichtliche Startseite:** Die Reiter sind in „Rechenarten“ und „Verstehen, üben & spielen“ gruppiert und passen auch auf dem Handy in zwei Zeilen. Jede Rechenart beginnt mit dem Merksatz und einer Sprungleiste (Ausprobieren · Erklärung · Üben · Sachaufgabe); ein kleiner schwebender „↑“-Knopf bringt beim Scrollen zurück zur Auswahl
- Vier Reiter für Addieren, Subtrahieren, Multiplizieren und Dividieren, jeweils mit Merksatz, Alltagsbeispiel, Rechenweg und Übungsaufgaben in drei Stufen
- **Grafische Bruch-Werkstatt:** Brüche durch Antippen von Balken- oder Kreisstücken einstellen und die Rechnung Schritt für Schritt mit Bildern bearbeiten
- Zufällige Sachaufgaben mit Tipp-Funktion bei jeder Rechenart
- Reiter „Spiele“: Memory, Größer oder kleiner, Zeitjagd, Ganzes füllen
- Läuft im Browser ohne Server und ohne Anmeldung. Ergebnisse und Rekorde werden nur im jeweiligen Browser (localStorage) gespeichert
- Installierbar als App (PWA) und nach dem ersten Laden offline nutzbar

## Grafisch rechnen

Der Einstieg zeigt sofort die beiden anklickbaren Bruchbilder. Ausführliche Erklärung, Rechenschritte, Raster und weitere Zahlentasten sind eingeklappt. In „Deine Bruch-Werkstatt“ lassen sich die beiden Brüche über die Plus-/Minus-Tasten oder direkt im Bild einstellen. Ein Balken beziehungsweise ein Kreis ist immer ein Ganzes. Jedes Stück lässt sich einzeln markieren oder entfernen; ein Klick verändert genau dieses Stück. Balken/Kreis-Wechsel erhält die ausgewählten Positionen. „Leeren“ setzt den Zähler auf 0. Beim zweiten Bruch einer Division ist das gesperrt, denn durch 0 darf man nicht teilen.

- **Addieren:** Beide Brüche gleich fein unterteilen und die Stücke zusammenlegen. Ergebnisse über 1 werden auf mehrere gleich große Ganze verteilt. Die beiden Ausgangsmengen bleiben durch unterschiedliche Farben erkennbar.
- **Subtrahieren:** Nach dem Gleichnamigmachen die abzuziehenden Stücke einzeln antippen oder „Ein Stück wegnehmen“ benutzen. Gestreifte Stücke sind weggenommen; erneut antippen legt sie zurück. Sobald die geforderte Anzahl entfernt ist, lässt sich der Rest ansehen.
- **Multiplizieren:** Spalten und Zeilen eines Rechtecks markieren oder eine Zelle als gegenüberliegende Ecke auswählen. Die mit × markierte Überschneidung zeigt das Produkt. Das gesamte Rechteck ist ein Ganzes.
- **Dividieren:** Gleich große Portionen abmessen und zählen. Eine Restmenge wird als Bruchteil einer weiteren Portion dargestellt. Beispiel: 3/4 : 1/2 ergibt 1 volle Portion und 1/2 einer weiteren Portion, also 1 1/2.

„Schritt zurück“ und „Neu starten“ helfen beim Ausprobieren. Die letzten Schritte zeigen das Kürzen und beim Dividieren den Zusammenhang mit dem Kehrwert. „Vollständigen Rechenweg ansehen“ enthält weiterhin den schriftlichen Rechenweg.

Mit **„Mit Bild lösen“** unter einer Übungsaufgabe werden deren Brüche in die Werkstatt übernommen. Das Ergebnis wird danach wie gewohnt bei „Du bist dran“ eingegeben; die Übernahme zählt nicht als Versuch und füllt keine Antwort automatisch aus.

**Nenner ändern = Erweitern/Kürzen (nur Addieren und Subtrahieren):** Mit „Teile pro Ganzes“ in der Werkstatt ändern sich Zähler und Nenner gemeinsam, sodass der Wert gleich bleibt (1/2 → 2/4 → 3/6, rückwärts wieder gekürzt). Bild und Bruch folgen sofort, und ein Hinweis nennt die gleichwertigen Brüche. Gibt es in der Richtung keinen Nenner mit gleichem Wert, wird um 1 geändert und der Zähler angepasst; der Hinweis sagt das. Mit Zähler 0 geht jeder Nenner. Beim Multiplizieren und Dividieren bleibt der Zähler beim Ändern des Nenners unverändert (er wird nur auf den Nenner begrenzt), weil dort kein Gleichnamigmachen gebraucht wird.

Die Werkstatt unterstützt Brüche von 0 bis 1 mit Nennern von 2 bis 12 sowie Ergebnisse über 1. Negative Differenzen werden im Klasse-6-Grundmodus mit einem Hinweis abgefangen; die Brüche können dann getauscht werden. Alle Aktionen funktionieren ohne Ziehen, per Antippen oder Tastatur. Pfeiltasten wechseln das fokussierte Stück, Enter/Leertaste markieren oder entfernen es. Sehr feine Subtraktionsbalken und breite Multiplikationsraster lassen sich seitlich scrollen.

### Rückmeldung beim Anklicken

Kreis- und Balkenstücke wechseln ihre Farbe sanft in 140 ms und bestätigen eine Auswahländerung mit einem kurzen Helligkeitsimpuls von 180 ms. Form, Fläche und Position der Stücke bleiben unverändert. Bei gleich bleibender Einteilung werden die Bildstücke im DOM erhalten, statt das ganze Bild neu aufzubauen. Dadurch bleiben Tastaturfokus und Farbwechsel auch bei schnellen Klicks erhalten. Beim Kürzen reagieren alle Stücke der Gruppe, ebenso die zugehörige Vorschau. Wiederholte Klicks ersetzen den vorherigen Impuls, statt Animationen aufzustauen; Bruchzahlen und Auswahl werden sofort aktualisiert.

Beim Erweitern, Kürzen und Zurücksetzen der Ausgangsbrüche in „Grafisch üben“ wachsen bzw. schrumpfen die Stücke bei allen Aufgabentypen (auch Addieren und Subtrahieren) in 380 ms auf ihre neue Größe; die neue Einteilung steht sofort fest.

Die Systemeinstellung **„Bewegung reduzieren“** schaltet Farbwechsel und Impulse ab. Ein Wechsel zu dieser Einstellung beendet auch laufende Impulse und bereits gestartete Farbtransitions. Ohne Web-Animations-Unterstützung funktioniert die Auswahl weiterhin. Bereits abgegebene oder aufgelöste Antworten bleiben gesperrt und verändern weder Auswahl noch Wertung.

## Erweitern und Kürzen

Der Reiter **„Erweitern & Kürzen“** zeigt den Ausgangsbruch und die neue Einteilung direkt **nebeneinander**, wahlweise als gleich große Balken oder Kreise. Die Bruchzahlen stehen unmittelbar an den Bildern. Beim Erweitern entstehen kleinere Stücke; beim Kürzen werden kleine Stücke zu größeren Gruppen zusammengefasst. Die gefärbte Menge bleibt sichtbar gleich groß. Zähler und Nenner werden immer mit derselben ganzen Zahl verändert.

Faktor beziehungsweise **Teiler** über wenige Vorschläge oder ein Zahlenfeld auswählen. Beim Erweitern wird jedes alte Stück in genau so viele neue Stücke geteilt; dicke Linien zeigen die alten Grenzen. Beim Kürzen markieren dicke Linien Gruppen dieser Größe, die im Ergebnis je ein großes Stück bilden. In einer gültigen Kürzung schaltet das Antippen eine ganze Gruppe, sonst ein einzelnes Stück. Zum Gruppieren werden bei Bedarf gefärbte Stücke nebeneinandergelegt. Nach dem Anwenden bleibt das ausgeführte Vorher-/Nachher-Bild stehen; erst „Weiter umformen“ startet den nächsten Schritt. Ungültige Kürzungen werden mit einer Erklärung gesperrt. Gemeinsame Teiler, „Ganz kürzen“ und der Entdeckerweg sind unter „Weitere Möglichkeiten“ eingeklappt; „Zurück“ macht einen Schritt rückgängig. Auch 0/6 → 0/1 und 6/6 → 1/1 sind möglich. Für gut lesbare Bilder ist die Darstellung auf höchstens 72 Teile eines Ganzen begrenzt.

### Nur Addieren und Subtrahieren brauchen gleiche Nenner

Gleichnamig machen wird nur bei **Addieren und Subtrahieren** verlangt und geprüft. Beim **Multiplizieren** steht „ein Teil von einem Teil“ im Mittelpunkt (Zähler mal Zähler, Nenner mal Nenner, früh kürzen, Rechteckbild). Beim **Dividieren** geht es darum, wie oft der zweite Bruch in den ersten passt, und um den Kehrwert. In „Grafisch üben“ erscheint dafür im Training ein eigener Hinweiskasten; die Tasten zum Umformen der Ausgangsbrüche sind dort nur noch freiwillig und eingeklappt. Das Abmessen in der Werkstatt unterteilt die Balken nur zur Anschauung gleich fein.

## Grafisch üben und Lerncheck

**Kompakte Oberfläche:** Modus, Aufgabenauswahl und Schwierigkeit stehen unter „Übung einstellen“, standardmäßig eingeklappt und mit kurzer Zusammenfassung sichtbar. „Mein Fortschritt“ zeigt die lokalen Übungszahlen auf Wunsch. Aufgabe und Bruchbilder stehen im Mittelpunkt; die Bedienhilfe sowie Tipp und weitere Möglichkeiten sind einklappbar.

**Optionaler Lernweg:** Additions-/Subtraktionsaufgaben im Training starten mit „Brüche gleichnamig machen → Antwort markieren → Ergebnis prüfen“. „Weiter zur Antwort“ wechselt von den Quellenbildern zum Antwortbild; die selbst umgeformten Brüche bleiben als kurze Referenz sichtbar. „Weiter zum Prüfen“ prüft nur, ob Zähler/Nenner gültig ausgefüllt sind, und zählt keinen Versuch. Erst „Antwort prüfen“ wertet. „Zurück“ und die direkt anwählbaren Schritte ermöglichen Korrekturen. „Frei arbeiten“ zeigt alle Arbeitsbereiche zugleich und bleibt für weitere Aufgaben gewählt. Die Schrittwahl verändert weder Brüche noch Antworten; kein gemeinsamer Nenner wird automatisch eingesetzt oder als Pflichtweg erzwungen. Korrekt gekürzte Endergebnisse werden weiterhin akzeptiert. Neue Aufgaben beginnen im geführten Lernweg wieder mit Schritt 1; Ansichts-/Reiterwechsel erhalten den aktuellen Schritt und die Eingaben. Im Lerncheck und bei anderen Rechenarten fehlt die zusätzliche Schrittführung. Pro Zustand gibt es eine sichtbare hervorgehobene Hauptaktion, nach Abschluss „Nächste Aufgabe“.

Im Reiter **„Grafisch üben“** werden zufällige Aufgaben zu den vier Rechenarten sowie zum Erweitern und Kürzen erzeugt. Es gibt zwei Schwierigkeitsstufen und eine gemischte Auswahl. Die Antwort wird selbst gebaut: Der Nenner des Ausgangsbruchs ist zunächst eingestellt, der Antwortzähler bleibt leer und wird erst durch eine eigene Eingabe oder Stückwahl gesetzt. Der Nenner kann zwischen 1 und 36 verändert werden. Stücke im Balken oder Kreis einzeln markieren oder die großen Plus-/Minus-Tasten und das Zählerfeld nutzen. Jedes Bild ist ein Ganzes; weitere Ganze erscheinen beim Füllen des vorherigen und bleiben sichtbar, solange dort markierte Stücke oder der Tastaturfokus liegen. Bei Division können bis zu vier Ganze dargestellt werden. Pfeiltasten bewegen den Fokus, Enter/Leertaste schalten das fokussierte Stück.

Im **Training** lassen sich schon die einzelnen Ausgangsbrüche direkt am Bild erweitern oder kürzen: Faktor beziehungsweise Teiler einstellen und „Erweitern“ oder „Kürzen“ drücken. Der Balken/Kreis zeigt sofort die neue Einteilung, daneben stehen Ausgangsbruch und wertgleicher neuer Bruch. Unter jedem Bild steht beispielsweise **„20 Teile insgesamt · 4 gefärbt“**. So lassen sich 1/5 mit Faktor 4 zu 4/20 und der zweite Bruch 1/4 mit Faktor 5 zu 5/20 umformen, bevor die Antwort gebaut wird. „Zurück zum Ausgangsbruch“ setzt nur dieses Bild zurück. Ungültige Kürzungen verändern das Bild nicht; je Ganzem sind bis zu 36 Teile möglich. Die gefärbte Menge und die Aufgabe selbst bleiben unverändert. Die Umformung füllt keine Antwort aus und zählt keinen Versuch. Darstellung und Umformungen bleiben beim Reiter- und Balken/Kreiswechsel erhalten; eine neue Aufgabe setzt sie zurück.

Beim **Addieren und Subtrahieren im Training** wird der gemeinsame Nenner automatisch geprüft. Solange die Bilder unterschiedlich eingeteilt sind, nennt die Rückmeldung ihre beiden aktuellen Teilzahlen. Sobald beide denselben Nenner besitzen, bestätigt sie den kleinsten gemeinsamen Nenner oder einen größeren, ebenfalls gültigen gemeinsamen Nenner. Auch eine selbst eingegebene Nennerwahl wird sofort auf Eignung zum Gleichnamigmachen geprüft. Kürzen ist erlaubt: Für 6/8 und 1/4 wird nach dem Kürzen auch 4 richtig anerkannt. Diese Prüfung betrifft den Rechen-Zwischenschritt, nicht den Nenner eines bereits gekürzten Endergebnisses. Sie füllt keine Antwort aus, zählt keinen Versuch und ist im Lerncheck sowie bei den anderen Aufgabentypen verborgen.

Die Teilzahl ist auch bei Antwortbildern und den Zwischenbildern der Werkstatt direkt ablesbar. Bei mehreren Ganzen wird pro Bild die tatsächlich dort gefärbte Stückzahl angezeigt. Im **Lerncheck** fehlen die zusätzlichen Umformungshilfen weiterhin, damit vor der Abgabe keine Lösung vorgegeben wird. Nach einer gelösten oder aufgedeckten Trainingsaufgabe sind die Quellen-Umformungstasten gesperrt.

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

Die Tests prüfen Bruchmodelle und Bedienung, zwölf gezielte Regressionen für Einzelstücke, Kreis-Ganzes, Vorher-/Nachher-Bildpaare und Ansichtswechsel, neun Animationsregressionen für DOM-Erhalt, unveränderte Geometrie, Gruppen-/Vorschauimpulse, schnelle Klicks, reduzierte Bewegung und gesperrte Antworten, Wertgleichheit bei Erweitern/Kürzen, ungültige Umformungen, Aufgabengeneratoren, grafische Antwortbewertung, Einmalwertung des Acht-Aufgaben-Lernchecks, Tastaturfokus sowie die bisherigen Übungen und Spiele. `.github/workflows/tests.yml` führt dieselben Tests automatisch bei jedem Push und Pull Request aus. Die Abhängigkeit `jsdom` wird ausschließlich für die Tests verwendet und nicht von der Lernseite geladen. Der reale Live-/Browservergleich ist in [`tests/kreis-klicktest.md`](tests/kreis-klicktest.md) dokumentiert.

## Veröffentlichen mit GitHub Pages

Das Repository verwendet GitHub Pages mit **Deploy from a branch**, Branch **main**, Ordner **/ (root)**. Änderungen auf anderen Branches ändern die veröffentlichte Seite nicht. Nach dem Zusammenführen eines Pull Requests in `main` wird die neue Version durch GitHub Pages ausgeliefert.

## Installieren

- **Android (Chrome):** Menü → „App installieren“
- **iPad/iPhone (Safari):** Teilen → „Zum Home-Bildschirm“
- **Windows, macOS, Linux (Chrome oder Edge):** Installieren-Symbol in der Adressleiste

## Neue Version ausliefern

In `sw.js` den Versionsnamen bei `CACHE` erhöhen, damit der alte Offline-Cache dieser App ersetzt wird. Die Version mit gruppierter Navigation und übersichtlicher Startseite verwendet `bruchrechnen-v9`. Caches anderer Apps derselben Domain bleiben unangetastet.

## Schriften

Die Schriften Baloo 2 und Nunito werden von Google Fonts geladen und danach im Cache abgelegt. Ohne Netz und ohne Cache nutzt die App Systemschriften.
