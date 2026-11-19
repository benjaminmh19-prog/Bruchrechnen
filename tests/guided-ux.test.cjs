'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

// Nur eine gelesene HTML-Kopie instrumentieren; App, README, Paket und Git bleiben unberührt.
function boot(t) {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const anchor = 'renderTabs();renderPanel();\n})();';
  assert.equal(source.split(anchor).length, 2, 'Eindeutiger vereinbarter IIFE-Testanker');
  const html = source.replace(anchor,
    'window.__guidedTest={vtS:vtS,vtTotals:vtTotals,vtLoadTask:vtLoadTask,vtRender:vtRender};' + anchor);
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, {
    url: 'https://example.test/#visual',
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole
  });
  t.after(() => {
    dom.window.close();
    assert.equal(errors.length, 0, errors.map(error => error.stack || String(error)).join('\n'));
  });
  assert(dom.window.__guidedTest, 'Vereinbarte Guided-UX-Test-Hooks sind verfügbar');
  const a = {
    dom, d: dom.window.document, api: dom.window.__guidedTest,
    el(selector) {
      const element = a.d.querySelector(selector);
      assert(element, `Fehlendes Element: ${selector}`);
      return element;
    },
    dispatch(element) {
      element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    click(selector) {
      const element = a.el(selector);
      assert(visible(element), `Versteckte Aktion: ${selector}`);
      assert(!element.disabled, `Gesperrte Aktion: ${selector}`);
      a.dispatch(element);
    },
    fill(selector, value, event = 'input') {
      const element = a.el(selector);
      assert(!element.disabled, `Gesperrte Eingabe: ${selector}`);
      element.value = String(value);
      element.dispatchEvent(new dom.window.Event(event, { bubbles: true }));
    }
  };
  return a;
}

// jsdom berechnet kein Layout: die Phasen-Sichtbarkeit folgt dem hidden-Attribut
// des Knotens UND seiner Vorfahren, nicht CSS oder getBoundingClientRect().
function visible(element) {
  if (!element || !element.isConnected) return false;
  for (let current = element; current; current = current.parentElement) {
    if (current.hidden) return false;
  }
  return true;
}

function task(overrides = {}) {
  return {
    type: 'add', lvl: 2, a: 1, b: 5, c: 1, d: 4,
    wholes: 2, answer: [9, 20],
    instruction: 'Berechne das Ergebnis und stelle es als Bruch dar.',
    ...overrides
  };
}

function load(a, next = task()) {
  a.api.vtLoadTask(next);
  a.api.vtRender();
  assert.equal(a.api.vtS.task, next, 'Deterministische Aufgabe ist geladen');
  return next;
}

function transform(a, index, factor) {
  a.fill(`#vt-source-factor-${index}`, factor);
  a.click(`#vt-source-expand-${index}`);
}

function protectedState(a) {
  const s = a.api.vtS;
  return {
    task: s.task, taskJSON: JSON.stringify(s.task), n: s.n, d: s.d,
    done: s.done, seen: JSON.stringify(s.seen), run: JSON.stringify(s.run),
    totals: JSON.stringify(a.api.vtTotals),
    stored: a.dom.window.localStorage.getItem('bruch-visual-training-v1')
  };
}

function sources(a) {
  return JSON.stringify(a.api.vtS.sources);
}

function mainAction(a, id) {
  const buttons = [...a.el('#vt-root').querySelectorAll('button.p')].filter(visible);
  assert.equal(buttons.length, 1, 'Genau eine sichtbare Hauptaktion (.p)');
  assert.equal(buttons[0].id, id, 'Die Hauptaktion entspricht der aktuellen Phase');
  assert(!buttons[0].disabled, 'Die sichtbare Hauptaktion ist bedienbar');
}

function phase(a, step) {
  assert.equal(a.api.vtS.guided, true);
  assert.equal(a.api.vtS.step, step);
  assert(visible(a.el('#vt-steps')));
  for (const number of [1, 2, 3]) {
    const button = a.el(`#vt-step-${number}`);
    assert.equal(button.tagName, 'BUTTON');
    assert.equal(button.dataset.vt, 'step');
    assert.equal(button.dataset.step, String(number));
    assert(visible(button), 'Jede Phase bleibt direkt wählbar');
    assert(!button.disabled, 'Kein Nenner-Hardgate für die direkte Phasenwahl');
    assert.equal(button.getAttribute('aria-current') === 'step', number === step,
      'Nur die aktuelle Phase besitzt aria-current="step"');
  }
  assert.equal(a.el('#vt-steps').querySelectorAll('[aria-current="step"]').length, 1);
  assert.equal(visible(a.el('#vt-source-stage')), step === 1);
  assert.equal(visible(a.el('#vt-answer-stage')), step > 1);
  assert(a.el('#vt-source-stage').contains(a.el('#vt-sources')));
  assert(a.el('#vt-source-stage').contains(a.el('#vt-common')),
    'Die gemeinsame-Nenner-Hilfe gehört zur Quellenphase');
  for (const selector of ['#vt-numerator', '#vt-denominator', '#vt-graph']) {
    assert(a.el('#vt-answer-stage').contains(a.el(selector)), `${selector} liegt in der Antwortphase`);
    assert.equal(visible(a.el(selector)), step > 1, 'Alte Antwortknoten bleiben vorhanden, aber phasenabhängig hidden');
  }
  assert.equal(visible(a.el('#vt-source-summary')), step > 1);
  assert.equal(visible(a.d.querySelector('#vt-back')), step > 1);
  if (step > 1) assert.equal(a.el('#vt-back').dataset.vt, 'back');
  if (!a.api.vtS.done) {
    assert.equal(visible(a.d.querySelector('#vt-submit')), step === 3);
    assert.equal(visible(a.d.querySelector('#vt-continue')), step < 3);
    if (step < 3) assert.equal(a.el('#vt-continue').dataset.vt, 'continue');
    mainAction(a, step === 3 ? 'vt-submit' : 'vt-continue');
  }
}

function noGuidance(a) {
  for (const selector of [
    '#vt-guide', '#vt-free', '[data-vt="guide"]', '[data-vt="free"]',
    '[data-vt="step"]', '[data-vt="continue"]', '[data-vt="back"]'
  ]) assert.equal(a.d.querySelector(selector), null, `${selector} fehlt außerhalb von Add/Sub-Training`);
  for (const selector of ['#vt-steps', '#vt-source-summary']) {
    assert(!visible(a.d.querySelector(selector)), 'Keine sichtbare geführte Zusatzhilfe');
  }
}

function summaryFraction(a, n, d) {
  const root = a.el('#vt-source-summary');
  const renderedFraction = [...root.querySelectorAll('.fr')].some(fraction =>
    fraction.querySelector('.n')?.textContent.trim() === String(n) &&
    fraction.querySelector('.d')?.textContent.trim() === String(d));
  assert(renderedFraction || root.textContent.includes(`${n}/${d}`),
    `Kurze Quellenreferenz enthält den wertgleichen Bruch ${n}/${d}`);
}

function forgedSubmit(a) {
  const button = a.d.createElement('button');
  button.dataset.vt = 'submit';
  a.el('#vt-root').append(button);
  a.dispatch(button);
  button.remove();
}

test('Standard: geführt, Phase 1; Einstellungen und Fortschritt sind kompakte geschlossene Details', t => {
  const a = boot(t);
  assert.equal(a.api.vtS.guided, true, 'Geführtes Arbeiten ist standardmäßig gewählt');
  assert.equal(a.api.vtS.step, 1, 'Initiale Phase ist 1');
  load(a);
  phase(a, 1);
  assert.equal(a.el('#vt-guide').dataset.vt, 'guide');
  assert.equal(a.el('#vt-free').dataset.vt, 'free');
  const settings = a.el('#vt-settings'), progress = a.el('#vt-progress');
  for (const details of [settings, progress]) {
    assert.equal(details.tagName, 'DETAILS');
    assert.equal(details.open, false, 'Details sind standardmäßig geschlossen');
    assert(details.querySelector('summary'), 'Details haben eine native Zusammenfassung');
  }
  const summary = a.el('#vt-settings-summary');
  assert(summary.closest('summary'), 'Einstellungszusammenfassung steht im nativen Summary');
  assert(settings.contains(summary));
  assert(settings.contains(a.el('#vt-config')));
  for (const id of ['vt-mode', 'vt-type']) {
    const control = a.el(`#${id}`);
    assert(a.el('#vt-config').contains(control), 'Bisherige Konfigurations-IDs bleiben erhalten');
    const label = control.selectedOptions[0].textContent.trim();
    assert(summary.textContent.includes(label), `Einstellungszusammenfassung nennt die aktuelle Auswahl ${label}`);
  }
  assert(a.el('#vt-config').contains(a.el('#vt-level')), 'Die bestehende Level-ID bleibt erhalten');
  const level = a.el('#vt-level');
  const levelName = level.selectedOptions[0].textContent.trim().replace(/^\d+\s*·\s*/, '');
  assert(new RegExp(`\\b${level.value}\\b`).test(summary.textContent) || summary.textContent.includes(levelName),
    'Einstellungszusammenfassung nennt das gewählte Level');
  assert(progress.contains(a.el('#vt-stats')));
  const access = a.el('#vt-access');
  assert(access.textContent.trim(), 'Kurze Anleitung bleibt unter der bisherigen ID erreichbar');
  assert(!/Pfeiltasten|Leertaste/.test(access.textContent), 'Längere Tastaturhilfe steht nicht mehr im Kurztext');
  assert([...a.el('#vt-root').querySelectorAll('details')].some(details =>
    /Pfeiltasten/.test(details.textContent) && /Enter|Leertaste/.test(details.textContent)),
  'Zusätzliche Tastaturhilfen sind in Details erreichbar');
});

test('Quellen 1/5 und 1/4 auf 20 erweitern: Weiter 1→2 verrät keine Antwort und wertet nichts', t => {
  const a = boot(t);
  load(a);
  const before = protectedState(a);
  transform(a, 0, 4);
  transform(a, 1, 5);
  assert.equal(a.el('#vt-common-sources').dataset.kind, 'smallest');
  assert.deepEqual(Array.from(a.api.vtS.sources, source => [source.n, source.d]), [[4, 20], [5, 20]]);
  assert.deepEqual(protectedState(a), before, 'Quellenumformen verändert weder Antwort noch Wertung');
  const sourceState = sources(a);
  a.click('#vt-continue');
  phase(a, 2);
  assert.deepEqual(protectedState(a), before, 'Weiter 1→2 verändert weder Antwort, Aufgabe noch Wertung');
  assert.equal(sources(a), sourceState);
  assert.equal(a.el('#vt-numerator').value, '');
  assert.equal(a.el('#vt-denominator').value, '5', 'Weiter wählt keinen Antwortnenner vor');
  assert.equal(a.d.querySelector('.vt-review'), null);
  summaryFraction(a, 4, 20);
  summaryFraction(a, 5, 20);
  assert.equal(a.el('#vt-source-summary').querySelector('.sp-picture'), null, 'Quellenreferenz bleibt kurz, ohne zusätzliche Bilder');
  assert.equal(a.d.activeElement.id, 'vt-denominator', 'Weiter zur Antwort fokussiert das sichtbare Nennerfeld');
  assert(visible(a.d.activeElement), 'Der Fokus landet nicht in einem versteckten Bereich');
});

test('Weiter 2→3 validiert ohne Wertung; falsche Antwort bleibt editierbar, richtige Abgabe zählt einmal', t => {
  const a = boot(t);
  load(a);
  a.click('#vt-continue');
  const before = protectedState(a);
  a.click('#vt-continue');
  phase(a, 2);
  assert.deepEqual(protectedState(a), before, 'Leere Antwort ist kein Versuch und keine Mutation');
  assert(a.el('#vt-feedback').textContent.trim(), 'Ungültige Antwort erhält einen Hinweis');
  assert.equal(a.d.activeElement.id, 'vt-numerator');
  for (const denominator of ['', '0', '1.5', '37']) {
    a.fill('#vt-denominator', denominator);
    const invalid = protectedState(a);
    a.click('#vt-continue');
    phase(a, 2);
    assert.deepEqual(protectedState(a), invalid, 'Ungültiger Nenner bleibt ohne Wertung in Phase 2');
    assert.equal(a.d.activeElement.id, 'vt-denominator');
    assert(a.el('#vt-feedback').textContent.trim());
  }
  a.fill('#vt-denominator', 20);
  a.fill('#vt-numerator', 41); // Zwei Ganze erlauben höchstens 40 markierte Stücke.
  a.click('#vt-continue');
  phase(a, 2);
  assert.equal(a.d.activeElement.id, 'vt-numerator');
  assert.equal(a.api.vtTotals.attempts, 0);
  a.fill('#vt-numerator', 8);
  const entered = protectedState(a);
  a.click('#vt-continue');
  phase(a, 3);
  assert.deepEqual(protectedState(a), entered, 'Weiter zur Prüfphase prüft noch nicht die Rechnung');
  assert(visible(a.d.activeElement), 'Phasenwechsel lässt den Fokus in einem sichtbaren Bereich');
  a.click('#vt-submit');
  phase(a, 3);
  assert.equal(a.api.vtS.done, false, 'Eine falsche Antwort beendet das Training nicht');
  assert.equal(a.api.vtTotals.attempts, 1);
  assert.equal(a.api.vtTotals.correct, 0);
  assert(!a.el('#vt-numerator').disabled);
  assert(!a.el('#vt-denominator').disabled);
  a.click('#vt-submit');
  assert.equal(a.api.vtTotals.attempts, 1, 'Dieselbe falsche Antwort zählt nicht erneut');
  a.click('#vt-back');
  phase(a, 2);
  a.fill('#vt-numerator', 9);
  a.click('#vt-continue');
  phase(a, 3);
  a.click('#vt-submit');
  assert.equal(a.api.vtS.done, true);
  assert.equal(a.api.vtTotals.attempts, 2);
  assert.equal(a.api.vtTotals.correct, 1);
  assert(!visible(a.d.querySelector('#vt-submit')), 'Abgeschlossene Aufgabe bietet keine sichtbare Abgabe mehr');
  mainAction(a, 'vt-new');
  assert.equal(a.d.activeElement.id, 'vt-new');
  forgedSubmit(a);
  assert.equal(a.api.vtTotals.attempts, 2, 'Abschluss-Guard verhindert eine weitere Wertung');
  assert.equal(a.api.vtTotals.correct, 1);
  assert(a.d.querySelector('.vt-review'), 'Lösung erscheint erst nach der Abgabe');
});

test('Kein Nenner-Hardgate: größerer gemeinsamer Nenner 12 und gekürztes Ergebnis 1/2 werden akzeptiert', t => {
  const a = boot(t);
  load(a, task({ b: 2, d: 3, answer: [5, 6] }));
  transform(a, 0, 6);
  transform(a, 1, 4);
  assert.equal(a.el('#vt-common-sources').dataset.kind, 'common');
  a.click('#vt-continue');
  phase(a, 2);
  summaryFraction(a, 6, 12);
  summaryFraction(a, 4, 12);
  a.fill('#vt-denominator', 6);
  a.fill('#vt-numerator', 5);
  a.click('#vt-continue');
  phase(a, 3);
  a.click('#vt-submit');
  assert.equal(a.api.vtS.done, true, '5/6 ist trotz Quellennenner 12 korrekt');
  assert.equal(a.api.vtTotals.correct, 1);

  load(a, task({ b: 3, d: 6, answer: [1, 2] }));
  assert.equal(a.el('#vt-common-sources').dataset.kind, 'pending');
  const originalSources = sources(a);
  a.click('#vt-step-2');
  phase(a, 2);
  a.fill('#vt-denominator', 2);
  a.fill('#vt-numerator', 1);
  a.click('#vt-continue');
  phase(a, 3);
  assert.equal(sources(a), originalSources, 'Gekürzte Antwort verlangt keine Quellenumformung');
  a.click('#vt-submit');
  assert.equal(a.api.vtS.done, true, '1/2 ist auch ohne gleichnamige Quellen korrekt');
  assert.equal(a.api.vtTotals.correct, 2);

  load(a, task({ type: 'sub', a: 3, b: 4, c: 1, d: 2, answer: [1, 4] }));
  a.click('#vt-step-3');
  phase(a, 3);
  a.fill('#vt-denominator', 4);
  a.fill('#vt-numerator', 1);
  a.click('#vt-submit');
  assert.equal(a.api.vtS.done, true, 'Direkte Prüfphase funktioniert ebenso für Subtraktion');
  assert.equal(a.api.vtTotals.correct, 3);
});

test('Frei/Geführt, Ansichten und Reiter erhalten Antwort, Quellen, Phase und native offene Einstellungen', t => {
  const a = boot(t);
  load(a);
  a.el('#vt-settings').open = true;
  a.el('#vt-progress').open = true;
  transform(a, 0, 4);
  transform(a, 1, 5);
  a.click('#vt-step-2');
  a.fill('#vt-denominator', 20);
  a.fill('#vt-numerator', 7);
  const before = protectedState(a), sourceState = sources(a);
  for (const step of [2, 3]) {
    a.click(`#vt-step-${step}`);
    a.click('#vt-free');
    assert.equal(a.api.vtS.guided, false);
    assert.equal(a.api.vtS.step, step, 'Freie Arbeit bewahrt die zuletzt gewählte Phase');
    assert(visible(a.el('#vt-sources')));
    assert(visible(a.el('#vt-numerator')));
    assert(visible(a.el('#vt-denominator')));
    assert(visible(a.el('#vt-graph')));
    assert(!visible(a.d.querySelector('#vt-steps')));
    assert(!visible(a.d.querySelector('#vt-continue')));
    assert(!visible(a.d.querySelector('#vt-back')));
    mainAction(a, 'vt-submit');
    for (const view of ['circle', 'bar']) {
      a.click(`[data-vt="view"][data-view="${view}"]`);
      assert.equal(a.el('#vt-settings').open, true, 'Native settings.open überlebt den Ansichts-Render');
      assert.equal(a.el('#vt-progress').open, true);
      assert.deepEqual(protectedState(a), before);
      assert.equal(sources(a), sourceState);
      a.click('[data-act="tab"][data-op="equiv"]');
      a.click('[data-act="tab"][data-op="visual"]');
      assert.equal(a.api.vtS.guided, false);
      assert.equal(a.api.vtS.step, step);
      assert.equal(a.el('#vt-settings').open, true, 'Native settings.open überlebt den Reiterwechsel');
      assert.deepEqual(protectedState(a), before);
      assert.equal(sources(a), sourceState);
      mainAction(a, 'vt-submit');
    }
    a.click('#vt-guide');
    phase(a, step);
    assert.deepEqual(protectedState(a), before);
    assert.equal(sources(a), sourceState);
    assert.equal(a.el('#vt-numerator').value, '7');
    assert.equal(a.el('#vt-denominator').value, '20');
  }
  a.el('#vt-settings').open = false;
  a.api.vtRender();
  assert.equal(a.el('#vt-settings').open, false, 'Natives Schließen wird nicht durch Render rückgängig gemacht');
});

test('Neue Aufgabe und vtLoadTask setzen Phase und Antworten zurück, behalten aber die Guided/Frei-Wahl', t => {
  const a = boot(t);
  const original = load(a);
  for (const guided of [true, false]) {
    if (a.api.vtS.guided !== guided) a.click(guided ? '#vt-guide' : '#vt-free');
    if (guided) a.click('#vt-step-3');
    a.fill('#vt-denominator', 20);
    a.fill('#vt-numerator', 9);
    if (!guided) {
      // Die freie Arbeit soll die letzte geführte Phase behalten, auch bei einem neuen Task.
      a.click('#vt-guide');
      a.click('#vt-step-3');
      a.click('#vt-free');
    }
    a.api.vtLoadTask(original);
    assert.equal(a.api.vtS.step, 1, 'vtLoadTask selbst setzt die Phase zurück');
    assert.equal(a.api.vtS.guided, guided);
    assert.equal(a.api.vtS.n, '');
    assert.equal(a.api.vtS.d, String(original.b));
    assert.equal(a.api.vtS.done, false);
    assert.equal(a.api.vtS.seen.length, 0);
    assert.equal(a.api.vtS.denominatorTouched, false);
    a.api.vtRender();
    assert.deepEqual(Array.from(a.api.vtS.sources, source => [source.n, source.d]), [[1, 5], [1, 4]]);
    if (guided) phase(a, 1); else mainAction(a, 'vt-submit');
    if (guided) a.click('#vt-step-3');
    const totals = JSON.stringify(a.api.vtTotals);
    a.click('#vt-show');
    assert.equal(a.api.vtS.done, true);
    assert(!visible(a.d.querySelector('#vt-submit')));
    mainAction(a, 'vt-new');
    assert.equal(a.d.activeElement.id, 'vt-new');
    a.click('#vt-new');
    assert.equal(a.api.vtS.step, 1);
    assert.equal(a.api.vtS.guided, guided, 'Neue Aufgabe behält die Arbeitsweise');
    assert.equal(a.api.vtS.n, '');
    assert.equal(a.api.vtS.d, String(a.api.vtS.task.b));
    assert.equal(a.api.vtS.done, false);
    assert.equal(JSON.stringify(a.api.vtTotals), totals, 'Lösung ansehen und neue Aufgabe sind keine Versuche');
    load(a);
  }
});

test('Lerncheck: acht Aufgaben, keine Guided-Hilfe, gesperrte Einstellungen und nur eine Abgabe pro Aufgabe', t => {
  const a = boot(t);
  load(a);
  a.fill('#vt-type', 'add', 'change');
  a.fill('#vt-mode', 'check', 'change');
  noGuidance(a);
  mainAction(a, 'vt-start');
  a.click('#vt-start');
  assert.equal(a.api.vtS.run.tasks.length, 8);
  const original = task();
  a.api.vtS.run.tasks[0] = original;
  load(a, original);
  const totals = JSON.stringify(a.api.vtTotals);
  noGuidance(a);
  for (const id of ['vt-mode', 'vt-type', 'vt-level']) assert(a.el(`#${id}`).disabled);
  for (const selector of ['#vt-tip', '#vt-show', '#vt-common', '[data-vt^="source-"]']) {
    assert.equal(a.d.querySelector(selector), null, 'Keine zusätzliche Lösungs- oder Umformungshilfe im Lerncheck');
  }
  assert.equal(a.d.querySelector('.vt-review'), null);
  assert(visible(a.el('#vt-numerator')));
  assert(visible(a.el('#vt-denominator')));
  assert(visible(a.el('#vt-graph')));
  mainAction(a, 'vt-submit');
  a.click('#vt-submit');
  assert.equal(a.api.vtS.run.results.length, 0, 'Leere Abgabe zählt auch im Lerncheck nicht');
  a.fill('#vt-denominator', 20);
  a.fill('#vt-numerator', 9);
  a.click('#vt-submit');
  assert.equal(a.api.vtS.run.results.length, 1);
  assert.equal(a.api.vtS.run.score, 1);
  assert.equal(a.api.vtS.done, true);
  assert(a.el('#vt-numerator').disabled);
  assert(a.el('#vt-denominator').disabled);
  assert([...a.el('#vt-graph').querySelectorAll('[data-vt="piece"]')].every(piece => piece.disabled));
  assert(!visible(a.d.querySelector('#vt-submit')));
  assert.equal(a.d.querySelector('.vt-review'), null, 'Lösung bleibt bis zur expliziten Auswertung verborgen');
  mainAction(a, 'vt-next');
  forgedSubmit(a);
  a.click('[data-vt="view"][data-view="circle"]');
  noGuidance(a);
  assert.equal(a.api.vtS.run.results.length, 1, 'Wiederholte Abgabe und Ansicht zählen nicht erneut');
  assert.equal(JSON.stringify(a.api.vtTotals), totals, 'Einzelne Lerncheckabgaben ändern keine Trainingswertung');
  a.click('#vt-next');
  assert(a.d.querySelector('.vt-review'), 'Explizite Auswertung zeigt erst jetzt die richtige Antwort');
  assert.equal(a.api.vtS.run.results.length, 1);
});

test('Multiplikation, Division, Erweitern und Kürzen: keine Guided-UI, vollständige Antwort und normale Prüfung', t => {
  const a = boot(t);
  const tasks = [
    task({ type: 'mul', answer: [1, 20] }),
    task({ type: 'div', answer: [4, 5], wholes: 4 }),
    task({ type: 'expand', c: undefined, d: undefined, factor: 2, answer: [2, 10], wholes: 1 }),
    task({ type: 'reduce', a: 6, b: 8, c: undefined, d: undefined, answer: [3, 4], wholes: 1 })
  ];
  for (const next of tasks) {
    load(a, next);
    noGuidance(a);
    if (next.type === 'mul' || next.type === 'div') {
      // Zwischenschritt zuerst: Antwortbereich gesperrt, Abgabe deaktiviert.
      assert(visible(a.el('#vt-pre')), `${next.type}: Zwischenschritt ist sichtbar`);
      assert(a.el('#vt-answer-stage').hidden, `${next.type}: Antwort ist vor dem Zwischenschritt gesperrt`);
      assert(a.el('#vt-submit').disabled, `${next.type}: Abgabe ist vor dem Zwischenschritt gesperrt`);
      const attemptsBefore = a.api.vtTotals.attempts;
      a.fill('#vt-pre-x', 99); a.fill('#vt-pre-y', 99); a.click('#vt-precheck');
      assert(a.el('#vt-answer-stage').hidden, `${next.type}: falscher Zwischenschritt schaltet nicht frei`);
      assert.equal(a.api.vtTotals.attempts, attemptsBefore, 'Zwischenschritt zählt nicht als Versuch');
      const tk = a.api.vtS.task;
      if (next.type === 'mul') { a.fill('#vt-pre-x', tk.a * tk.c); a.fill('#vt-pre-y', tk.b * tk.d); }
      else { a.fill('#vt-pre-x', tk.d); a.fill('#vt-pre-y', tk.c); }
      a.click('#vt-precheck');
      assert.equal(a.el('#vt-answer-stage').hidden, false, `${next.type}: richtiger Zwischenschritt schaltet die Antwort frei`);
    }
    for (const selector of ['#vt-sources', '#vt-numerator', '#vt-denominator', '#vt-graph']) {
      assert(visible(a.el(selector)), `${next.type}: vollständige Antwortoberfläche ist direkt sichtbar`);
    }
    mainAction(a, 'vt-submit');
    assert.equal(a.d.querySelector('#vt-common'), null);
    const attempts = a.api.vtTotals.attempts, correct = a.api.vtTotals.correct;
    a.fill('#vt-denominator', next.answer[1]);
    a.fill('#vt-numerator', next.answer[0]);
    a.click('#vt-submit');
    assert.equal(a.api.vtS.done, true, `${next.type}: bestehende Rechenprüfung funktioniert`);
    assert.equal(a.api.vtTotals.attempts, attempts + 1);
    assert.equal(a.api.vtTotals.correct, correct + 1);
    mainAction(a, 'vt-new');
  }
});

test('Korrigierte Eingaben entfernen veraltete Formatwarnungen, ohne mathematische Tipps zu löschen', t => {
  const a = boot(t);
  load(a);
  a.click('#vt-continue');
  a.click('#vt-continue');
  assert(a.el('#vt-feedback').textContent.trim());
  assert.equal(a.api.vtTotals.attempts, 0);
  a.fill('#vt-denominator', 20);
  assert.match(a.el('#vt-feedback').textContent, /40/);
  a.fill('#vt-numerator', 9);
  assert.equal(a.el('#vt-feedback').textContent, '');
  assert.equal(a.api.vtTotals.attempts, 0);
  a.click('#vt-tip');
  const tip = a.el('#vt-feedback').textContent;
  assert(tip.trim());
  a.fill('#vt-numerator', 8);
  assert.equal(a.el('#vt-feedback').textContent, tip, 'Ein mathematischer Tipp ist keine Formatwarnung');
});
