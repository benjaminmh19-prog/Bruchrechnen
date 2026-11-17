'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

// Nur die gelesene HTML-Kopie instrumentieren; index.html bleibt unverändert.
// Keine zusätzlichen internen Renderer, Auswahlfelder oder Scoring-Hooks voraussetzen.
function boot(t, hash = 'equiv') {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const anchor = 'renderTabs();renderPanel();\n})();';
  assert.equal(source.split(anchor).length, 2, 'Eindeutiger vereinbarter IIFE-Testanker');
  const html = source.replace(anchor,
    'window.__simpleTest={eqState: eqState, vtS:vtS,dtS:dtS,transformFraction:transformFraction};renderTabs();renderPanel();\n})();');
  const dom = new JSDOM(html, {
    url: `https://example.test/#${hash}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole
  });
  const d = dom.window.document;
  t.after(() => {
    dom.window.close();
    assert.equal(errors.length, 0, errors.map(error => error.stack || String(error)).join('\n'));
  });
  assert(dom.window.__simpleTest, 'Die vereinbarten Test-Hooks sind verfügbar');
  const a = {
    dom, d, api: dom.window.__simpleTest,
    el(selector) {
      const element = d.querySelector(selector);
      assert(element, `Fehlendes Element: ${selector}`);
      return element;
    },
    click(selector) {
      const element = a.el(selector);
      assert(!element.disabled, `Gesperrtes Element: ${selector}`);
      element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    fill(selector, value, event = 'input') {
      const element = a.el(selector);
      assert(!element.disabled, `Gesperrte Eingabe: ${selector}`);
      element.value = String(value);
      element.dispatchEvent(new dom.window.Event(event, { bubbles: true }));
    },
    key(selector, key) {
      const element = a.el(selector);
      element.focus();
      element.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
        key, code: key === ' ' ? 'Space' : key, bubbles: true, cancelable: true
      }));
    },
    reason(value) {
      const element = a.el(`input[name="dt-reason"][value="${value}"]`);
      element.checked = true;
      element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    }
  };
  return a;
}

function picture(a, scope, denominator, view, group) {
  const root = a.el(scope);
  const pictures = root.matches('.sp-picture') ? [root] : root.querySelectorAll('.sp-picture');
  assert.equal(pictures.length, 1, `${scope}: genau ein Bild pro Ganzem`);
  const p = pictures[0];
  assert.equal(p.dataset.parts, String(denominator), `${scope}: Nenner bestimmt die Stückzahl`);
  assert.equal(p.dataset.view, view, `${scope}: vereinbarte Darstellung`);
  if (group !== undefined) assert.equal(p.dataset.group, String(group), `${scope}: Grenzgruppen`);
  return p;
}

function fraction(a, scope, n, denominator) {
  const root = a.el(scope);
  const fractions = [...root.querySelectorAll('.fr')];
  assert(fractions.some(f =>
    f.querySelector('.n')?.textContent.trim() === String(n) &&
    f.querySelector('.d')?.textContent.trim() === String(denominator)),
  `${scope}: erwarteter Bruch ${n}/${denominator}`);
}

function eqPair(a, n, denominator, resultN, resultD, view, beforeGroup = 1, afterGroup = 1) {
  fraction(a, '#eq-before', n, denominator);
  fraction(a, '#eq-after', resultN, resultD);
  const before = picture(a, '#eq-before', denominator, view, beforeGroup);
  const after = picture(a, '#eq-after', resultD, view, afterGroup);
  assert.notEqual(before, after, 'Ausgangs- und Ergebnisbild sind getrennte Elemente');
  return { before, after };
}

function eqPiece(index) {
  return `#eq-before [data-eq="piece"][data-index="${index}"]`;
}

function eqSource(a, n, denominator) {
  assert.equal(Number(a.api.eqState.n), n);
  assert.equal(Number(a.api.eqState.d), denominator);
  fraction(a, '#eq-before', n, denominator);
}

function assertSvg(a, selector) {
  assert.equal(a.el(selector).namespaceURI, 'http://www.w3.org/2000/svg',
    `${selector}: Tastaturtest trifft ein SVG-Stück`);
}

function stored(a, key) {
  return JSON.parse(a.dom.window.localStorage.getItem(key) || 'null');
}

function score(a, kind) {
  return stored(a, kind === 'vt' ? 'bruch-visual-training-v1' : 'bruch-detective-v1') ||
    (kind === 'vt' ? { attempts: 0, correct: 0, checks: 0, best: 0 } :
      { attempts: 0, solved: 0, independent: 0 });
}

function setWorkshop(a, key, target) {
  for (let i = 0; i < 80; i++) {
    const current = Number(a.el(`#v-${key}`).textContent);
    if (current === target) return;
    a.click(`[data-act="${current < target ? 'inc' : 'dec'}"][data-key="${key}"]`);
  }
  assert.fail(`Werkstatt-Steller ${key} erreicht ${target} nicht`);
}

function workshopPiece(key, index) {
  return `#wk-edit-${key} [data-wk="piece"][data-key="${key}"][data-index="${index}"]`;
}

function answerState(s) {
  return { task: s.task, n: s.n, d: s.d, reason: s.reason, done: s.done, feedback: s.feedback };
}

function assertAnswerState(s, previous) {
  assert.equal(s.task, previous.task, 'Ansichtswechsel erzeugt keine neue Aufgabe');
  for (const key of ['n', 'd', 'reason', 'done', 'feedback']) {
    assert.equal(s[key], previous[key], `Ansichtswechsel erhält ${key}`);
  }
}

test('Erweitern: Bildpaar, Nenner, Ansichten, alte Grenzen und freie Faktorwahl', t => {
  const a = boot(t);
  a.click('[data-eq="preset"][data-n="1"][data-d="2"]');
  a.click('[data-eq="mode"][data-mode="expand"]');
  a.click('[data-eq="factor"][data-factor="2"]');
  for (const view of ['bar', 'circle']) {
    a.click(`[data-eq="view"][data-view="${view}"]`);
    const { before, after } = eqPair(a, 1, 2, 2, 4, view, 1, 2);
    assert.equal(before.querySelectorAll('[data-eq="piece"]').length, 2);
    assert.equal(before.querySelectorAll('.sp-old-boundary').length, 0);
    assert(after.querySelector('.sp-old-boundary'), 'Ergebnis hebt bisherige Stückgrenzen hervor');
  }
  a.click('[data-eq="factor"][data-factor="3"]');
  eqPair(a, 1, 2, 3, 6, 'circle', 1, 3);
  assert.equal(a.el('#eq-factor-input').type, 'number');
  a.fill('#eq-factor-input', 5, 'input');
  assert.equal(Number(a.api.eqState.factor), 5);
  eqPair(a, 1, 2, 5, 10, 'circle', 1, 5);
  a.fill('#eq-factor-input', 7, 'change');
  assert.equal(Number(a.api.eqState.factor), 7);
  eqPair(a, 1, 2, 7, 14, 'circle', 1, 7);
});

test('Erweitern: einzelne statt Prefix-Stücke, erhaltene Positionen und SVG Enter/Space', t => {
  const a = boot(t);
  a.click('[data-eq="preset"][data-n="1"][data-d="2"]');
  a.click('[data-eq="mode"][data-mode="expand"]');
  a.click('[data-eq="view"][data-view="bar"]');
  a.click(eqPiece(2));
  eqSource(a, 2, 2);
  a.click(eqPiece(1));
  eqSource(a, 1, 2); // Nur Stück 2 ist noch markiert.
  a.click('[data-eq="view"][data-view="circle"]');
  eqSource(a, 1, 2);
  a.click(eqPiece(1));
  eqSource(a, 2, 2); // Nicht erneut Prefix [1] aus dem Zähler erzeugen.
  assertSvg(a, eqPiece(1));
  a.key(eqPiece(1), 'Enter');
  eqSource(a, 1, 2);
  assertSvg(a, eqPiece(2));
  a.key(eqPiece(2), ' ');
  eqSource(a, 0, 2);
  eqPair(a, 0, 2, 0, 4, 'circle', 1, 2);
});

test('Anwenden erhält das ausgeführte Bildpaar; erst Weiter startet die nächste Vorschau', t => {
  const a = boot(t);
  a.click('[data-eq="preset"][data-n="2"][data-d="3"]');
  a.click('[data-eq="mode"][data-mode="expand"]');
  a.click('[data-eq="factor"][data-factor="2"]');
  a.click('[data-eq="view"][data-view="bar"]');
  eqPair(a, 2, 3, 4, 6, 'bar', 1, 2);
  a.click('[data-eq="apply"]');
  assert.equal(Number(a.api.eqState.n), 4);
  assert.equal(Number(a.api.eqState.d), 6);
  assert(a.api.eqState.last != null, 'Ausgeführte Transformation wird gespeichert');
  const last = a.api.eqState.last;
  eqPair(a, 2, 3, 4, 6, 'bar', 1, 2);
  a.click('[data-eq="view"][data-view="circle"]');
  assert.equal(a.api.eqState.last, last, 'Ansichtswechsel verwirft die Transformation nicht');
  eqPair(a, 2, 3, 4, 6, 'circle', 1, 2);
  a.click('[data-eq="continue"]');
  assert.equal(a.api.eqState.last, null);
  eqPair(a, 4, 6, 8, 12, 'circle', 1, 2);
});

test('Modus, Faktorbutton, freie Faktorwahl und Preset verwerfen last', t => {
  const changes = [
    ['Modus', a => a.click('[data-eq="mode"][data-mode="reduce"]'), [4, 6, 2, 3, 2, 1]],
    ['Faktorbutton', a => a.click('[data-eq="factor"][data-factor="3"]'), [4, 6, 12, 18, 1, 3]],
    ['Faktoreingabe', a => a.fill('#eq-factor-input', 5), [4, 6, 20, 30, 1, 5]],
    ['Preset', a => a.click('[data-eq="preset"][data-n="1"][data-d="2"]'), [1, 2, 2, 4, 1, 2]]
  ];
  for (const [label, change, expected] of changes) {
    const a = boot(t);
    a.click('[data-eq="mode"][data-mode="expand"]');
    a.click('[data-eq="factor"][data-factor="2"]');
    a.click('[data-eq="view"][data-view="bar"]');
    a.click('[data-eq="apply"]');
    assert(a.api.eqState.last != null, `${label}: Ausgangslage mit ausgeführtem Schritt`);
    change(a);
    assert.equal(a.api.eqState.last, null, `${label}: neuer Vorschauzustand`);
    const [n, d, rn, rd, bg, ag] = expected;
    eqPair(a, n, d, rn, rd, 'bar', bg, ag);
  }
});

test('Kürzen schaltet ganze Gruppen und sperrt ungültige Transformationen', t => {
  const a = boot(t);
  a.click('[data-eq="preset"][data-n="6"][data-d="8"]');
  a.click('[data-eq="mode"][data-mode="reduce"]');
  a.click('[data-eq="factor"][data-factor="2"]');
  a.click('[data-eq="view"][data-view="bar"]');
  let pair = eqPair(a, 6, 8, 3, 4, 'bar', 2, 1);
  assert(pair.before.querySelector('.sp-old-boundary'), 'Kürzungsgruppen sind im Ausgangsbild hervorgehoben');
  assert.equal(pair.after.querySelectorAll('.sp-old-boundary').length, 0);
  a.click(eqPiece(7));
  eqPair(a, 8, 8, 4, 4, 'bar', 2, 1);
  a.click(eqPiece(8)); // Dasselbe Zweierpaar ausschalten.
  eqPair(a, 6, 8, 3, 4, 'bar', 2, 1);
  a.click(eqPiece(1));
  eqPair(a, 4, 8, 2, 4, 'bar', 2, 1);
  a.click('[data-eq="view"][data-view="circle"]');
  a.click(eqPiece(2)); // Dasselbe Zweierpaar wieder einschalten.
  eqPair(a, 6, 8, 3, 4, 'circle', 2, 1);
  a.click('[data-eq="preset"][data-n="2"][data-d="3"]');
  assert(a.el('[data-eq="apply"]').disabled, 'Nicht teilbarer Bruch bleibt gesperrt');
  const source = picture(a, '#eq-before', 3, 'circle', 1);
  assert.equal(source.querySelectorAll('.sp-old-boundary').length, 0);
  // Auch ein synthetischer Klick darf den deaktivierten Apply-Guard nicht umgehen.
  a.el('[data-eq="apply"]').dispatchEvent(new a.dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(Number(a.api.eqState.n), 2);
  assert.equal(Number(a.api.eqState.d), 3);
  assert.equal(a.api.eqState.last, null);
  const transform = a.api.transformFraction;
  assert.equal(transform(2, 3, 'reduce', 2).ok, false);
  assert.equal(transform(4, 6, 'reduce', 3).ok, false);
  for (const factor of [0, 1, -2, 1.5]) assert.equal(transform(1, 2, 'expand', factor).ok, false);
});

test('Nenner 1: leerer und voller Kreis verwenden circle statt degeneriertem Vollkreispath', t => {
  const a = boot(t);
  a.click('[data-eq="preset"][data-n="0"][data-d="6"]');
  a.click('[data-eq="mode"][data-mode="reduce"]');
  a.fill('#eq-factor-input', 6, 'change');
  a.click('[data-eq="view"][data-view="circle"]');
  function wholeCircle(n) {
    const { after } = eqPair(a, n, 6, n === 0 ? 0 : 1, 1, 'circle', 6, 1);
    assert(after.querySelector('circle'), 'Ein Ganzes wird geometrisch als circle gezeichnet');
    assert.equal(after.querySelectorAll('path').length, 0, 'Kein degenerierter 360-Grad-Kreispfad');
    return after;
  }
  wholeCircle(0);
  a.click(eqPiece(1)); // Faktor 6 markiert alle sechs Ausgangsstücke.
  eqSource(a, 6, 6);
  const full = wholeCircle(6);
  assert([...full.querySelectorAll('circle')].some(circle => {
    const fill = circle.getAttribute('fill') || a.dom.window.getComputedStyle(circle).fill;
    return fill && fill !== 'none' && fill !== 'transparent';
  }), 'Der volle Kreis hat eine Füllung');
  a.click('[data-eq="apply"]');
  assert.equal(Number(a.api.eqState.n), 1);
  assert.equal(Number(a.api.eqState.d), 1);
  assert(a.api.eqState.last != null);
  wholeCircle(6); // Das gespeicherte Bildpaar bleibt auch bei einem ganzen Ergebnis stehen.
});

test('Werkstatt: unabhängige Stücke beider Brüche, Positionspersistenz und SVG-Tastatur', t => {
  const a = boot(t, 'add');
  setWorkshop(a, 'b', 4);
  setWorkshop(a, 'd', 4);
  setWorkshop(a, 'a', 1);
  setWorkshop(a, 'c', 1);
  a.click('[data-wk="view"][data-view="bar"]');
  picture(a, '#wk-edit-a', 4, 'bar');
  picture(a, '#wk-edit-c', 4, 'bar');
  a.click(workshopPiece('a', 3));
  assert.equal(Number(a.el('#v-a').textContent), 2, 'Drittes Stück ergänzt 1/4 zu 2/4');
  a.click(workshopPiece('a', 3));
  assert.equal(Number(a.el('#v-a').textContent), 1, 'Erneuter Klick entfernt nur das dritte Stück');
  a.click(workshopPiece('a', 3));
  a.click(workshopPiece('c', 4));
  a.click('[data-wk="view"][data-view="circle"]');
  picture(a, '#wk-edit-a', 4, 'circle');
  picture(a, '#wk-edit-c', 4, 'circle');
  assert.equal(Number(a.el('#v-a').textContent), 2);
  assert.equal(Number(a.el('#v-c').textContent), 2);
  a.click(workshopPiece('a', 1));
  a.click(workshopPiece('a', 3));
  assert.equal(Number(a.el('#v-a').textContent), 0, 'Ansichtswechsel erhält Positionen 1 und 3');
  assertSvg(a, workshopPiece('a', 2));
  a.key(workshopPiece('a', 2), 'Enter');
  assert.equal(Number(a.el('#v-a').textContent), 1);
  a.key(workshopPiece('a', 4), ' ');
  assert.equal(Number(a.el('#v-a').textContent), 2);
  a.click(workshopPiece('c', 4));
  assert.equal(Number(a.el('#v-c').textContent), 1);
  a.click(workshopPiece('c', 1));
  assert.equal(Number(a.el('#v-c').textContent), 0, 'Eigene Auswahlpositionen des zweiten Bruchs bleiben erhalten');
  a.click('[data-wk="view"][data-view="bar"]');
  a.click(workshopPiece('a', 2));
  a.click(workshopPiece('a', 4));
  assert.equal(Number(a.el('#v-a').textContent), 0, 'Auch Tastaturauswahl überlebt den Ansichtswechsel');
});

test('Grafiktrainer und Detektiv: Einzelstücke, reine Fokusnavigation und Zustand bei Viewtoggle', t => {
  for (const [hash, prefix, hook] of [['visual', 'vt', 'vtS'], ['detective', 'dt', 'dtS']]) {
    const a = boot(t, hash);
    const s = a.api[hook];
    a.fill(`#${prefix}-denominator`, 6);
    a.fill(`#${prefix}-numerator`, 1);
    if (prefix === 'dt') a.reason('rule');
    a.click(`[data-${prefix}="view"][data-view="bar"]`);
    a.click(`#${prefix}-piece-4`);
    assert.equal(s.n, '2', `${prefix}: Stück 4 ergänzt nur ein Stück`);
    a.click(`#${prefix}-piece-4`);
    assert.equal(s.n, '1', `${prefix}: dasselbe Stück wird wieder entfernt`);
    a.click(`#${prefix}-piece-4`); // Auswahlpositionen 1 und 4.
    assert.equal(a.d.activeElement.id, `${prefix}-piece-4`);
    a.key(`#${prefix}-piece-4`, 'ArrowLeft');
    assert.equal(a.d.activeElement.id, `${prefix}-piece-3`);
    assert.equal(s.n, '2', `${prefix}: Pfeil links ändert keine Bruchzahl`);
    a.key(`#${prefix}-piece-3`, 'ArrowRight');
    assert.equal(a.d.activeElement.id, `${prefix}-piece-4`);
    assert.equal(s.n, '2', `${prefix}: Pfeil rechts ändert keine Bruchzahl`);
    const previous = answerState(s);
    a.click(`[data-${prefix}="view"][data-view="circle"]`);
    assertAnswerState(s, previous);
    const p = a.el(`#${prefix}-piece-4`).closest('.sp-picture');
    assert(p, `${prefix}: Antwortstücke haben den vereinbarten Wrapper`);
    assert.equal(p.dataset.parts, '6');
    assert.equal(p.dataset.view, 'circle');
    assertSvg(a, `#${prefix}-piece-4`);
    a.key(`#${prefix}-piece-4`, 'Enter');
    assert.equal(s.n, '1', `${prefix}: Enter entfernt das einzelne ausgewählte Stück 4`);
    a.key(`#${prefix}-piece-3`, ' ');
    assert.equal(s.n, '2', `${prefix}: Space ergänzt das einzelne Stück 3`);
    const changed = answerState(s);
    a.click(`[data-${prefix}="view"][data-view="bar"]`);
    assertAnswerState(s, changed);
    a.click(`#${prefix}-piece-3`);
    assert.equal(s.n, '1');
    a.click(`#${prefix}-piece-1`);
    assert.equal(s.n, '0', `${prefix}: Positionen bleiben statt einer Prefix-Neuberechnung erhalten`);
    assert.equal(a.el(`#${prefix}-denominator`).value, '6');
    if (prefix === 'dt') assert(a.el('input[name="dt-reason"][value="rule"]').checked);
  }
});

test('Laufender Lerncheck übersteht Ansichtswechsel vor und nach einer einmaligen Abgabe', t => {
  const a = boot(t, 'visual');
  const s = a.api.vtS;
  a.fill('#vt-mode', 'check', 'change');
  a.click('#vt-start');
  const run = s.run;
  const task = s.task;
  const tasks = run.tasks;
  a.fill('#vt-denominator', 6);
  a.fill('#vt-numerator', 1);
  a.click('#vt-piece-4');
  for (const view of ['circle', 'bar']) {
    const previous = answerState(s);
    a.click(`[data-vt="view"][data-view="${view}"]`);
    assertAnswerState(s, previous);
    assert.equal(s.run, run);
    assert.equal(run.tasks, tasks);
    assert.equal(s.task, task);
    assert.equal(run.index, 0);
    assert.equal(run.results.length, 0);
    assert.equal(run.score, 0);
    assert(a.el('#vt-mode').disabled);
    assert.equal(a.d.querySelector('#vt-tip'), null);
    assert.equal(a.d.querySelector('#vt-show'), null);
  }
  a.fill('#vt-denominator', task.answer[1]);
  a.fill('#vt-numerator', task.answer[0]);
  a.click('#vt-submit');
  assert.equal(run.results.length, 1);
  assert.equal(run.score, 1);
  const result = run.results[0];
  const submitted = answerState(s);
  a.click('[data-vt="view"][data-view="circle"]');
  assertAnswerState(s, submitted);
  assert.equal(s.run, run);
  assert.equal(run.results.length, 1);
  assert.equal(run.results[0], result);
  assert.equal(run.score, 1);
  assert.equal(a.d.querySelector('#vt-submit'), null);
  assert(a.el('#vt-numerator').disabled);
  assert.equal(score(a, 'vt').attempts, 0, 'Lerncheck wertet nicht als Trainingsversuch');
  a.click('#vt-next');
  a.click('#vt-next');
  assert.equal(s.run, run);
  assert.equal(run.index, 1);
  assert.equal(s.task, tasks[1]);
  assert.equal(run.results.length, 1);
  assert(!s.done);
});

test('Numerische Eingaben behalten exakte Umformungswertung und Schutz vor Mehrfachwertung', t => {
  const a = boot(t, 'visual');
  const vt = a.api.vtS;
  a.fill('#vt-type', 'expand', 'change');
  const task = vt.task;
  a.click('#vt-submit');
  assert.equal(score(a, 'vt').attempts, 0);
  a.fill('#vt-denominator', 0);
  a.fill('#vt-numerator', 1);
  a.click('#vt-submit');
  assert.equal(score(a, 'vt').attempts, 0, 'Ungültige Zahl wird nicht gewertet');
  a.fill('#vt-denominator', task.b);
  a.fill('#vt-numerator', task.a);
  a.click('#vt-submit');
  assert.equal(score(a, 'vt').attempts, 1);
  assert.equal(score(a, 'vt').correct, 0, 'Nur gleicher Wert genügt beim Erweitern nicht');
  assert(!vt.done);
  a.click('#vt-submit');
  assert.equal(score(a, 'vt').attempts, 1);
  a.fill('#vt-denominator', task.answer[1]);
  a.fill('#vt-numerator', task.answer[0]);
  a.click('#vt-submit');
  assert(vt.done);
  assert.equal(score(a, 'vt').attempts, 2);
  assert.equal(score(a, 'vt').correct, 1);
  const vtScore = score(a, 'vt');
  a.click('[data-vt="view"][data-view="circle"]');
  assert.deepEqual(score(a, 'vt'), vtScore);
  assert(vt.done);
  a.click('[data-act="tab"][data-op="detective"]');
  const dt = a.api.dtS;
  a.fill('#dt-type', 'expand', 'change');
  const detectiveTask = dt.task;
  a.click('#dt-check');
  assert.equal(score(a, 'dt').attempts, 0, 'Ohne Begründung zählt kein Fallversuch');
  a.reason('rule');
  a.fill('#dt-denominator', 0);
  a.click('#dt-check');
  assert.equal(score(a, 'dt').attempts, 0);
  a.fill('#dt-denominator', detectiveTask.b);
  a.fill('#dt-numerator', detectiveTask.a);
  a.click('#dt-check');
  assert.equal(score(a, 'dt').attempts, 1);
  assert.equal(score(a, 'dt').solved, 0);
  a.click('#dt-check');
  assert.equal(score(a, 'dt').attempts, 1);
  a.fill('#dt-denominator', detectiveTask.answer[1]);
  a.fill('#dt-numerator', detectiveTask.answer[0]);
  a.reason(detectiveTask.choices.find(choice => choice.id !== 'rule').id);
  a.click('#dt-check');
  assert.equal(score(a, 'dt').attempts, 2);
  assert.equal(score(a, 'dt').solved, 0, 'Richtige Zahl ohne richtige Begründung löst den Fall nicht');
  a.click('#dt-check');
  assert.equal(score(a, 'dt').attempts, 2);
  a.reason('rule');
  a.click('#dt-check');
  assert(dt.done);
  assert.equal(score(a, 'dt').attempts, 3);
  assert.equal(score(a, 'dt').solved, 1);
  assert.equal(score(a, 'dt').independent, 0);
  const dtScore = score(a, 'dt');
  a.click('[data-dt="view"][data-view="circle"]');
  assert.deepEqual(score(a, 'dt'), dtScore);
  assert(dt.done);
});

test('Abgegebene Kreisantwort bleibt auch bei synthetischem Stückklick unverändert', t => {
  const a=boot(t,'visual'),s=a.api.vtS;
  a.fill('#vt-type','add','change');a.fill('#vt-mode','check','change');a.click('#vt-start');
  a.fill('#vt-denominator',2);a.fill('#vt-numerator',3);
  a.click('[data-vt="view"][data-view="circle"]');a.click('#vt-submit');
  const result=s.run.results[0],selected=a.d.querySelectorAll('#vt-graph .sp-piece.selected').length;
  assert(s.done);a.click('#vt-piece-1');
  assert.equal(s.n,'3');assert.equal(result.n,3);assert.equal(result.d,2);
  assert.equal(a.d.querySelectorAll('#vt-graph .sp-piece.selected').length,selected);
  assert.equal(a.el('#vt-piece-1').getAttribute('tabindex'),'-1');
});

test('Verteilte Auswahl und Fokus halten benötigte Ganze sichtbar', t => {
  for(const [hash,ns,hook] of [['visual','vt','vtS'],['detective','dt','dtS']])for(const view of ['bar','circle']){
    const a=boot(t,hash),s=a.api[hook];a.fill(`#${ns}-type`,'add','change');
    a.fill(`#${ns}-denominator`,6);a.fill(`#${ns}-numerator`,6);
    a.click(`[data-${ns}="view"][data-view="${view}"]`);
    a.click(`#${ns}-piece-8`);a.click(`#${ns}-piece-1`);a.click(`#${ns}-piece-2`);
    assert.equal(s.n,'5');assert.equal(a.d.querySelectorAll(`#${ns}-graph .sp-picture`).length,2);
    assert.equal(a.d.querySelectorAll(`#${ns}-graph .sp-piece.selected`).length,5);
    assert.equal(a.el(`#${ns}-piece-8`).getAttribute('aria-pressed'),'true');
    a.click(`#${ns}-piece-8`);assert.equal(s.n,'4');
    assert.equal(a.d.activeElement.id,`${ns}-piece-8`);
    assert.equal(a.el(`#${ns}-piece-8`).getAttribute('tabindex'),'0');
    a.key(`#${ns}-piece-8`,'ArrowLeft');assert.equal(a.d.activeElement.id,`${ns}-piece-7`);
    assert.equal(s.picture.focus,7);
    a.click(`[data-${ns}="view"][data-view="${view==='bar'?'circle':'bar'}"]`);
    assert.equal(a.el(`#${ns}-piece-7`).getAttribute('tabindex'),'0');
  }
});
