'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

// Nur die gelesene HTML-Kopie instrumentieren; App, package.json und Git bleiben unangetastet.
function boot(t) {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const anchor = 'renderTabs();renderPanel();\n})();';
  assert.equal(source.split(anchor).length, 2, 'Eindeutiger vereinbarter IIFE-Testanker');
  const html = source.replace(anchor,
    'window.__sourceTest={vtS:vtS,vtLoadTask:vtLoadTask,vtRender:vtRender,vtTotals:vtTotals};' + anchor);
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
  assert(dom.window.__sourceTest, 'Vereinbarte Quellen-Test-Hooks sind verfügbar');
  const a = {
    dom, d: dom.window.document, api: dom.window.__sourceTest,
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
      assert(!element.disabled, `Gesperrtes Element: ${selector}`);
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

function fraction(root, n, d) {
  assert([...root.querySelectorAll('.fr')].some(f =>
    f.querySelector('.n')?.textContent.trim() === String(n) &&
    f.querySelector('.d')?.textContent.trim() === String(d)),
  `Erwarteter Bruch ${n}/${d}`);
}

function partCount(root, parts, selected) {
  const text = `${parts} ${parts === 1 ? 'Teil' : 'Teile'} insgesamt · ${selected} gefärbt`;
  assert([...root.querySelectorAll('*')].some(element => element.textContent.trim() === text),
    `Stückzählung im eigenen Bildbereich: „${text}“`);
}

function sourcePicture(a, index, n, d, view) {
  const root = a.el(`#vt-source-${index}`);
  assert(a.el('#vt-sources').contains(root), 'Jede Quelle liegt im Quellencontainer');
  const pictures = root.querySelectorAll('.sp-picture');
  assert.equal(pictures.length, 1, `Quelle ${index}: genau ein Ganzes`);
  const picture = pictures[0];
  assert.equal(picture.dataset.parts, String(d), `Quelle ${index}: aktuelle Stückzahl`);
  assert.equal(picture.querySelectorAll('.sp-piece').length, d, `Quelle ${index}: tatsächlich ${d} Stücke`);
  assert.equal(picture.querySelectorAll('.sp-piece.selected').length, n, `Quelle ${index}: ${n} gefärbte Stücke`);
  if (view) assert.equal(picture.dataset.view, view);
  fraction(root, n, d);
  partCount(root, d, n);
  return picture;
}

function controls(a, index) {
  const root = a.el(`#vt-source-${index}`), input = a.el(`#vt-source-factor-${index}`);
  assert(root.contains(input));
  assert.equal(input.type, 'number');
  assert.equal(input.min, '2', 'Faktor beginnt bei einer ganzen Zahl ≥ 2');
  assert.equal(input.step, '1', 'Nur ganzzahlige Faktoren');
  for (const action of ['expand', 'reduce', 'reset']) {
    const button = a.el(`#vt-source-${action}-${index}`);
    assert(root.contains(button), 'Die Aktion gehört zur einzelnen Quelle');
    assert.equal(button.tagName, 'BUTTON');
    assert.equal(button.dataset.vt, `source-${action}`);
    assert.equal(button.dataset.source, String(index));
  }
}

function transform(a, index, action, factor) {
  a.fill(`#vt-source-factor-${index}`, factor);
  a.click(`#vt-source-${action}-${index}`);
}

function protectedState(a) {
  const s = a.api.vtS;
  return {
    task: s.task, taskJSON: JSON.stringify(s.task), n: s.n, d: s.d,
    done: s.done, seen: JSON.stringify(s.seen), totals: JSON.stringify(a.api.vtTotals),
    stored: a.dom.window.localStorage.getItem('bruch-visual-training-v1')
  };
}

function unchanged(a, before) {
  assert.deepEqual(protectedState(a), before,
    'Quellenaktionen erhalten Originalaufgabe, Antwort n/d, Abschlusszustand und Scoring');
  assert.equal(a.el('#vt-numerator').value, before.n);
  assert.equal(a.el('#vt-denominator').value, before.d);
}

function sourcesSnapshot(a) {
  return [0, 1].map(index => {
    const root = a.el(`#vt-source-${index}`), picture = root.querySelector('.sp-picture');
    return {
      parts: picture.dataset.parts,
      selected: [...picture.querySelectorAll('.sp-piece')].map(piece => piece.classList.contains('selected')),
      fractions: [...root.querySelectorAll('.fr')].map(f => [
        f.querySelector('.n').textContent.trim(), f.querySelector('.d').textContent.trim()
      ]),
      factor: a.el(`#vt-source-factor-${index}`).value
    };
  });
}

// Aktivierte synthetische Aktionen prüfen den Zustands-Guard zusätzlich zur disabled-UI.
function forgedAction(a, index, action) {
  const button = a.d.createElement('button');
  button.dataset.vt = `source-${action}`;
  button.dataset.source = String(index);
  a.el('#vt-root').append(button);
  a.dispatch(button);
  button.remove();
}

test('Quellen einzeln erweitern: 1/5 × 4 und 1/4 × 5 ergeben 4/20 und 5/20 ohne Antwort oder Wertung', t => {
  const a = boot(t);
  load(a);
  for (const index of [0, 1]) controls(a, index);
  sourcePicture(a, 0, 1, 5);
  sourcePicture(a, 1, 1, 4);
  const before = protectedState(a);
  assert.equal(before.n, '', 'Die Antwort ist anfangs leer');
  transform(a, 0, 'expand', 4);
  sourcePicture(a, 0, 4, 20);
  sourcePicture(a, 1, 1, 4);
  unchanged(a, before);
  transform(a, 1, 'expand', 5);
  sourcePicture(a, 0, 4, 20);
  sourcePicture(a, 1, 5, 20);
  unchanged(a, before);
  assert.equal(a.el('#vt-numerator').value, '', 'Umformen trägt keine Lösung ein');
  assert.equal(a.d.querySelector('.vt-review'), null, 'Umformen deckt keine Rechnungslösung auf');
});

test('6/8 ÷ 2 wird 3/4; Reset betrifft nur die gewählte Quelle und erhält eine eingegebene Antwort', t => {
  const a = boot(t);
  load(a, task({ a: 6, b: 8, answer: [1, 1] }));
  a.fill('#vt-denominator', 12);
  a.fill('#vt-numerator', 7);
  const before = protectedState(a);
  transform(a, 0, 'reduce', 2);
  sourcePicture(a, 0, 3, 4);
  sourcePicture(a, 1, 1, 4);
  transform(a, 1, 'expand', 3);
  sourcePicture(a, 1, 3, 12);
  unchanged(a, before);
  a.click('#vt-source-reset-0');
  sourcePicture(a, 0, 6, 8);
  sourcePicture(a, 1, 3, 12);
  unchanged(a, before);
  transform(a, 0, 'reduce', 2);
  a.click('#vt-source-reset-1');
  sourcePicture(a, 0, 3, 4);
  sourcePicture(a, 1, 1, 4);
  unchanged(a, before);
});

test('vtLoadTask setzt beide Quellen auf ihre neuen Originalbrüche zurück, auch beim erneuten Laden derselben Aufgabe', t => {
  const a = boot(t), original = load(a);
  transform(a, 0, 'expand', 4);
  transform(a, 1, 'expand', 5);
  a.api.vtLoadTask(original);
  a.api.vtRender();
  sourcePicture(a, 0, 1, 5);
  sourcePicture(a, 1, 1, 4);
  assert.equal(a.api.vtS.n, '');
  const next = load(a, task({ a: 6, b: 8, c: 1, d: 3, answer: [13, 12] }));
  sourcePicture(a, 0, 6, 8);
  sourcePicture(a, 1, 1, 3);
  assert.equal(a.api.vtS.task, next);
  assert.equal(a.api.vtS.n, '');
  assert.equal(a.el('#vt-numerator').value, '');
  assert.equal(a.api.vtTotals.attempts, 0);
});

test('Ungültige Faktoren, nicht teilbare Brüche und mehr als 36 Teile verändern keine Quelle; genau 36 sind erlaubt', t => {
  const a = boot(t);
  load(a, task({ a: 6, b: 8, answer: [1, 1] }));
  const before = protectedState(a);
  for (const factor of [0, 1, 1.5]) for (const action of ['expand', 'reduce']) {
    a.fill('#vt-source-factor-0', factor);
    a.dispatch(a.el(`#vt-source-${action}-0`)); // Auch auf deaktivierte Buttons dispatchen.
    sourcePicture(a, 0, 6, 8);
    sourcePicture(a, 1, 1, 4);
    unchanged(a, before);
  }
  for (const factor of [3, 4]) {
    a.fill('#vt-source-factor-0', factor);
    a.dispatch(a.el('#vt-source-reduce-0'));
    sourcePicture(a, 0, 6, 8); // Einmal ist nur der Nenner, einmal nur der Zähler teilbar.
    unchanged(a, before);
  }
  a.fill('#vt-source-factor-0', 5);
  a.dispatch(a.el('#vt-source-expand-0'));
  sourcePicture(a, 0, 6, 8); // 40 Teile sind nicht erlaubt.
  unchanged(a, before);
  transform(a, 1, 'expand', 9);
  sourcePicture(a, 1, 9, 36);
  a.fill('#vt-source-factor-1', 2);
  a.dispatch(a.el('#vt-source-expand-1'));
  sourcePicture(a, 1, 9, 36);
  sourcePicture(a, 0, 6, 8);
  unchanged(a, before);
});

test('Reiter- und Balken-/Kreiswechsel erhalten dieselbe Aufgabe, beide umgeformten Quellen, Faktoren und Antwort', t => {
  const a = boot(t);
  load(a);
  transform(a, 0, 'expand', 4);
  transform(a, 1, 'expand', 5);
  a.fill('#vt-denominator', 20);
  a.fill('#vt-numerator', 7);
  const before = protectedState(a), sources = sourcesSnapshot(a);
  for (const view of ['circle', 'bar']) {
    a.click(`[data-vt="view"][data-view="${view}"]`);
    sourcePicture(a, 0, 4, 20, view);
    sourcePicture(a, 1, 5, 20, view);
    assert.deepEqual(sourcesSnapshot(a), sources);
    unchanged(a, before);
    a.click('[data-act="tab"][data-op="equiv"]');
    a.click('[data-act="tab"][data-op="visual"]');
    sourcePicture(a, 0, 4, 20, view);
    sourcePicture(a, 1, 5, 20, view);
    assert.deepEqual(sourcesSnapshot(a), sources);
    unchanged(a, before);
  }
});

test('Lerncheck zeigt nur Originalbrüche, keine Quellenaktionen und keine Umformungslösung vor der Auswertung', t => {
  const a = boot(t);
  load(a);
  transform(a, 0, 'expand', 4);
  transform(a, 1, 'expand', 5);
  a.fill('#vt-type', 'add', 'change');
  a.fill('#vt-mode', 'check', 'change');
  a.click('#vt-start');
  const run = a.api.vtS.run, original = task();
  run.tasks[0] = original;
  load(a, original);
  const totals = JSON.stringify(a.api.vtTotals);
  function noLeak(view) {
    assert.equal(a.d.querySelector('[data-vt^="source-"]'), null, 'Keine Quellenaktionen im Lerncheck');
    assert.equal(a.d.querySelector('[id^="vt-source-factor-"]'), null, 'Keine Faktoreingabe im Lerncheck');
    assert.equal(a.d.querySelector('#vt-tip'), null);
    assert.equal(a.d.querySelector('#vt-show'), null);
    assert.equal(a.d.querySelector('.vt-review'), null, 'Richtige Antwort bleibt bis zur Auswertung verborgen');
    const pictures = [...a.el('#vt-body').querySelectorAll('.sp-picture')]
      .filter(picture => !picture.closest('#vt-graph') && !picture.closest('.vt-review'));
    assert.equal(pictures.length, 2, 'Nur zwei originale Quellenbilder außerhalb der Antwort');
    assert.deepEqual(pictures.map(picture => picture.dataset.parts), ['5', '4']);
    assert.deepEqual(pictures.map(picture => picture.querySelectorAll('.sp-piece.selected').length), [1, 1]);
    assert(pictures.every(picture => picture.dataset.view === view));
    fraction(a.el('.vt-equation'), 1, 5);
    fraction(a.el('.vt-equation'), 1, 4);
    assert(a.el('.vt-equation').textContent.includes('?'));
    assert.equal(a.api.vtS.task, original);
    assert.equal(a.api.vtS.run, run);
    assert.equal(JSON.stringify(a.api.vtTotals), totals);
  }
  for (const view of ['circle', 'bar']) {
    a.click(`[data-vt="view"][data-view="${view}"]`);
    noLeak(view);
    const state = JSON.stringify(a.api.vtS);
    for (const action of ['expand', 'reduce', 'reset']) forgedAction(a, 0, action);
    assert.equal(JSON.stringify(a.api.vtS), state, 'Synthetische Quellenaktionen sind im Lerncheck wirkungslos');
  }
  assert.equal(a.api.vtS.n, '');
  assert.equal(run.results.length, 0);
  a.fill('#vt-denominator', 20);
  a.fill('#vt-numerator', 9);
  a.click('#vt-submit');
  assert(a.api.vtS.done);
  assert.equal(run.results.length, 1);
  assert.equal(run.score, 1);
  noLeak('bar');
  a.click('[data-vt="view"][data-view="circle"]');
  noLeak('circle');
  a.click('#vt-next');
  fraction(a.el('.vt-review'), 9, 20);
  assert.equal(a.d.querySelector('[data-vt^="source-"]'), null);
});

test('Nach richtigem Lösen oder Lösung-Ansehen sind Quellenbuttons gesperrt und synthetische Aktionen wirkungslos', t => {
  for (const finish of ['solved', 'show']) {
    const a = boot(t);
    load(a);
    transform(a, 0, 'expand', 4);
    transform(a, 1, 'expand', 5);
    if (finish === 'solved') {
      a.fill('#vt-denominator', 20);
      a.fill('#vt-numerator', 9);
      a.click('#vt-submit');
      assert.equal(a.api.vtTotals.attempts, 1);
      assert.equal(a.api.vtTotals.correct, 1);
    } else {
      a.click('#vt-show');
      assert.equal(a.api.vtTotals.attempts, 0);
    }
    assert(a.api.vtS.done);
    const before = protectedState(a), sources = sourcesSnapshot(a), state = JSON.stringify(a.api.vtS);
    for (const index of [0, 1]) {
      for (const action of ['expand', 'reduce', 'reset']) {
        const button = a.el(`#vt-source-${action}-${index}`);
        assert(button.disabled, `${finish}: Quelle ${index}, ${action} gesperrt`);
        a.dispatch(button);
        forgedAction(a, index, action);
      }
      const input = a.el(`#vt-source-factor-${index}`);
      input.value = '3';
      for (const event of ['input', 'change']) {
        input.dispatchEvent(new a.dom.window.Event(event, { bubbles: true }));
      }
    }
    assert.equal(JSON.stringify(a.api.vtS), state, `${finish}: Abschluss-Guard schützt den Quellenzustand`);
    a.api.vtRender();
    assert.deepEqual(sourcesSnapshot(a), sources);
    sourcePicture(a, 0, 4, 20);
    sourcePicture(a, 1, 5, 20);
    unchanged(a, before);
    a.click('[data-vt="view"][data-view="circle"]');
    sourcePicture(a, 0, 4, 20, 'circle');
    sourcePicture(a, 1, 5, 20, 'circle');
    assert.deepEqual(sourcesSnapshot(a), sources);
    unchanged(a, before);
  }
});

test('Stückzählung pro Ganzem folgt verteilter boolean-Auswahl statt Zähler-Prefix; ein Teil verwendet Singular', t => {
  const a = boot(t);
  load(a);
  a.fill('#vt-denominator', 6);
  a.fill('#vt-numerator', 6);
  a.click('#vt-piece-8');
  a.click('#vt-piece-1');
  a.click('#vt-piece-2');
  assert.equal(a.api.vtS.n, '5'); // Vier im ersten Ganzen, eines im zweiten, nicht Prefix 5/0.
  const before = protectedState(a);
  for (const view of ['bar', 'circle']) {
    a.click(`[data-vt="view"][data-view="${view}"]`);
    const pictures = [...a.el('#vt-graph').querySelectorAll('.sp-picture')];
    assert.equal(pictures.length, 2);
    pictures.forEach((picture, index) => {
      assert.equal(picture.dataset.parts, '6');
      assert.equal(picture.dataset.view, view);
      const selected = index === 0 ? 4 : 1;
      assert.equal(picture.querySelectorAll('.sp-piece.selected').length, selected);
      partCount(picture.closest('.vt-unit-row'), 6, selected);
    });
    assert.equal(a.el('#vt-piece-8').getAttribute('aria-pressed'), 'true');
    unchanged(a, before);
  }
  load(a, task({ a: 1, b: 1, c: 0, d: 1, answer: [1, 1] }));
  sourcePicture(a, 0, 1, 1, 'circle');
  sourcePicture(a, 1, 0, 1, 'circle');
  a.fill('#vt-numerator', 1);
  const pictures = [...a.el('#vt-graph').querySelectorAll('.sp-picture')];
  assert.equal(pictures.length, 2);
  partCount(pictures[0].closest('.vt-unit-row'), 1, 1);
  partCount(pictures[1].closest('.vt-unit-row'), 1, 0);
});
