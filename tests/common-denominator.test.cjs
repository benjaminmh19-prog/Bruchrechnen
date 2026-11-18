'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

// Ausschließlich eine gelesene HTML-Kopie instrumentieren; die App bleibt unverändert.
function boot(t) {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const anchor = 'renderTabs();renderPanel();\n})();';
  assert.equal(source.split(anchor).length, 2, 'Eindeutiger vereinbarter IIFE-Testanker');
  const html = source.replace(anchor,
    'window.__commonTest={vtS:vtS,vtLoadTask:vtLoadTask,vtRender:vtRender,vtTotals:vtTotals,' +
    'vtCommonDenominatorStatus:vtCommonDenominatorStatus,vtCheckCommonDenominator:vtCheckCommonDenominator};' + anchor);
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
  assert(dom.window.__commonTest, 'Vereinbarte Nenner-Test-Hooks sind verfügbar');
  const a = {
    dom, d: dom.window.document, api: dom.window.__commonTest,
    el(selector) {
      const element = a.d.querySelector(selector);
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
  assert.equal(a.api.vtS.task, next);
  return next;
}

function transform(a, index, action, factor) {
  a.fill(`#vt-source-factor-${index}`, factor);
  a.click(`#vt-source-${action}-${index}`);
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

function unchanged(a, before) {
  assert.deepEqual(protectedState(a), before,
    'Nennerhinweise ändern weder Originalaufgabe, Antwort, Abschlusszustand noch Wertung');
  assert.equal(a.el('#vt-numerator').value, before.n);
  assert.equal(a.el('#vt-denominator').value, before.d);
}

function sourceFeedback(a, kind, denominator) {
  const element = a.el('#vt-common-sources');
  assert.equal(element.dataset.kind, kind, 'Quellenrückmeldung folgt unmittelbar der Umformung');
  assert(element.textContent.trim(), 'Automatische Quellenrückmeldung ist lesbar');
  if (denominator !== undefined) {
    assert(new RegExp(`\\b${denominator}\\b`).test(element.textContent),
      `Rückmeldung nennt den gemeinsamen Nenner ${denominator}`);
  }
}

function answerFeedback(a, kind) {
  const element = a.el('#vt-common-answer');
  assert.equal(element.dataset.kind, kind, 'Nennerprüfung reagiert sofort auf input');
  assert(element.textContent.trim(), 'Automatische Antwortrückmeldung ist lesbar');
}

function noAnswerFeedback(a) {
  const element = a.d.querySelector('#vt-common-answer');
  assert(!element || !element.textContent.trim(), 'Unberührter Nenner erhält keine Antwortrückmeldung');
}

function noCommonFeedback(a) {
  for (const selector of ['#vt-common', '#vt-common-sources', '#vt-common-answer']) {
    assert.equal(a.d.querySelector(selector), null, `${selector} fehlt außerhalb von Add/Sub im Training`);
  }
}

function frozenSources(n1, d1, n2, d2) {
  return Object.freeze([Object.freeze({ n: n1, d: d1 }), Object.freeze({ n: n2, d: d2 })]);
}

test('Quellen melden automatisch 20 und Reset; 12 ist für 1/2 + 1/3 gemeinsam, aber nicht der kleinste Nenner', t => {
  const a = boot(t);
  load(a);
  assert.equal(a.api.vtS.denominatorTouched, false);
  noAnswerFeedback(a);
  sourceFeedback(a, 'pending');
  const before = protectedState(a);
  transform(a, 0, 'expand', 4);
  sourceFeedback(a, 'pending');
  unchanged(a, before);
  transform(a, 1, 'expand', 5);
  sourceFeedback(a, 'smallest', 20);
  unchanged(a, before);
  assert.equal(a.api.vtS.denominatorTouched, false, 'Quellenumformen berührt die Antwort nicht');
  noAnswerFeedback(a);
  assert.equal(a.d.querySelector('.vt-review'), null, 'Nennerhilfe deckt keine Ergebnisantwort auf');
  a.click('#vt-source-reset-0');
  sourceFeedback(a, 'pending');
  unchanged(a, before);
  a.click('#vt-source-reset-1');
  sourceFeedback(a, 'pending');
  unchanged(a, before);

  load(a, task({ a: 1, b: 2, c: 1, d: 3, answer: [5, 6] }));
  const second = protectedState(a);
  transform(a, 0, 'expand', 6);
  sourceFeedback(a, 'pending');
  unchanged(a, second);
  transform(a, 1, 'expand', 4);
  sourceFeedback(a, 'common', 12);
  unchanged(a, second);
  transform(a, 0, 'reduce', 2);
  sourceFeedback(a, 'pending');
  unchanged(a, second);
  transform(a, 1, 'reduce', 2);
  sourceFeedback(a, 'smallest', 6);
  unchanged(a, second);
});

test('Nenner-input wird auch mit leerem Zähler sofort geprüft: 20 passend, 10 unpassend, Dezimalzahl und 0 ungültig', t => {
  const a = boot(t);
  load(a);
  const before = protectedState(a);
  for (const [value, kind] of [['20', 'smallest'], ['10', 'unsuitable'], ['1.5', 'invalid'], ['0', 'invalid'], ['', 'invalid']]) {
    a.fill('#vt-denominator', value);
    assert.equal(a.api.vtS.denominatorTouched, true);
    answerFeedback(a, kind);
    unchanged(a, { ...before, d: value });
    assert.equal(a.api.vtS.n, '', 'Nennerhilfe gibt keinen Zähler vor');
    assert.equal(a.d.querySelector('.vt-review'), null);
  }

  load(a, task({ a: 1, b: 2, c: 1, d: 5, answer: [7, 10] }));
  const second = protectedState(a);
  for (const [value, kind] of [['10', 'smallest'], ['20', 'common']]) {
    a.fill('#vt-denominator', value);
    answerFeedback(a, kind);
    unchanged(a, { ...second, d: value });
  }
  a.fill('#vt-numerator', 7);
  const entered = protectedState(a);
  a.fill('#vt-denominator', 10);
  answerFeedback(a, 'smallest');
  unchanged(a, { ...entered, d: '10' });
});

test('Vorheriges Kürzen ist erlaubt: 6/8 und 1/4 haben Minimum 4; gleiche Originalnenner 8 sind nur gemeinsam', t => {
  const a = boot(t);
  for (const type of ['add', 'sub']) {
    load(a, task({ type, a: 6, b: 8, c: 1, d: 4, answer: type === 'add' ? [1, 1] : [1, 2] }));
    sourceFeedback(a, 'pending');
    const before = protectedState(a);
    transform(a, 0, 'reduce', 2);
    sourceFeedback(a, 'smallest', 4);
    unchanged(a, before);
    a.fill('#vt-denominator', 4);
    answerFeedback(a, 'smallest');
    unchanged(a, { ...before, d: '4' });
    a.click('#vt-source-reset-0');
    sourceFeedback(a, 'pending');
    answerFeedback(a, 'smallest');
    unchanged(a, { ...before, d: '4' });
  }
  load(a, task({ a: 6, b: 8, c: 2, d: 8, answer: [1, 1] }));
  sourceFeedback(a, 'common', 8);
  const before = protectedState(a);
  a.fill('#vt-denominator', 4);
  answerFeedback(a, 'smallest');
  unchanged(a, { ...before, d: '4' });
});

test('Multiplikation, Division, Erweitern, Kürzen und Lerncheck zeigen keinerlei gemeinsame-Nenner-Hilfe', t => {
  const a = boot(t);
  for (const type of ['mul', 'div', 'expand', 'reduce']) {
    const overrides = {
      mul: { answer: [1, 20] }, div: { answer: [4, 5], wholes: 4 },
      expand: { c: undefined, d: undefined, factor: 2, answer: [2, 10], wholes: 1 },
      reduce: { a: 6, b: 8, c: undefined, d: undefined, answer: [3, 4], wholes: 1 }
    };
    load(a, task({ type, ...overrides[type] }));
    noCommonFeedback(a);
    const before = protectedState(a);
    a.fill('#vt-denominator', 20);
    noCommonFeedback(a);
    unchanged(a, { ...before, d: '20' });
    transform(a, 0, type === 'reduce' ? 'reduce' : 'expand', 2);
    noCommonFeedback(a);
    unchanged(a, { ...before, d: '20' });
  }

  a.fill('#vt-type', 'add', 'change');
  a.fill('#vt-mode', 'check', 'change');
  noCommonFeedback(a);
  a.click('#vt-start');
  for (const type of ['add', 'sub']) {
    const original = task({ type, a: 1, b: 3, c: 1, d: 6, answer: type === 'add' ? [1, 2] : [1, 6] });
    a.api.vtS.run.tasks[0] = original;
    load(a, original);
    noCommonFeedback(a);
    const before = protectedState(a);
    a.fill('#vt-denominator', 6);
    noCommonFeedback(a);
    unchanged(a, { ...before, d: '6' });
    for (const view of ['circle', 'bar']) {
      a.click(`[data-vt="view"][data-view="${view}"]`);
      noCommonFeedback(a);
      unchanged(a, { ...before, d: '6' });
    }
    assert.equal(a.api.vtS.run.results.length, 0, 'Nennerinput ist keine Lerncheck-Abgabe');
    assert.equal(a.d.querySelector('.vt-review'), null, 'Keine Lösungsvorgabe im Lerncheck');
  }
});

test('Ansichts- und Reiterwechsel erhalten Nennerstatus; vtLoadTask und Neue Aufgabe setzen denominatorTouched zurück', t => {
  const a = boot(t), original = load(a);
  transform(a, 0, 'expand', 4);
  transform(a, 1, 'expand', 5);
  a.fill('#vt-denominator', 20);
  a.fill('#vt-numerator', 7);
  const before = protectedState(a), sources = JSON.stringify(a.api.vtS.sources);
  for (const view of ['circle', 'bar']) {
    a.click(`[data-vt="view"][data-view="${view}"]`);
    sourceFeedback(a, 'smallest', 20);
    answerFeedback(a, 'smallest');
    assert.equal(a.api.vtS.denominatorTouched, true);
    assert.equal(JSON.stringify(a.api.vtS.sources), sources);
    unchanged(a, before);
    a.click('[data-act="tab"][data-op="equiv"]');
    a.click('[data-act="tab"][data-op="visual"]');
    sourceFeedback(a, 'smallest', 20);
    answerFeedback(a, 'smallest');
    assert.equal(a.api.vtS.denominatorTouched, true);
    assert.equal(JSON.stringify(a.api.vtS.sources), sources);
    unchanged(a, before);
  }
  for (const next of [original, task({ a: 1, b: 3, c: 1, d: 6, answer: [1, 2] })]) {
    load(a, next);
    assert.equal(a.api.vtS.denominatorTouched, false);
    assert.equal(a.api.vtS.n, '');
    assert.equal(a.api.vtS.d, String(next.b), 'Keine automatische Wahl des gemeinsamen Nenners');
    noAnswerFeedback(a);
    sourceFeedback(a, 'pending');
    assert.deepEqual(a.api.vtS.sources.map(s => [s.n, s.d]).flat().join(','),
      [next.a, next.b, next.c, next.d].join(','));
    a.fill('#vt-denominator', 20);
    assert.equal(a.api.vtS.denominatorTouched, true);
  }
  a.fill('#vt-type', 'add', 'change');
  a.fill('#vt-denominator', 20);
  assert.equal(a.api.vtS.denominatorTouched, true);
  // Neue Aufgabe ist vor Abschluss gesperrt; regulär aufdecken und weitergehen.
  a.click('#vt-show');
  a.click('#vt-new');
  assert.equal(a.api.vtS.denominatorTouched, false);
  assert.equal(a.api.vtS.n, '');
  noAnswerFeedback(a);
  assert.equal(JSON.stringify(a.api.vtTotals), before.totals);
});

test('Pure Nennerfunktionen stimmen für alle kleinen Bruchpaare und Nenner 1–36, inklusive Null und vollständig gekürzter Originale', t => {
  const a = boot(t);
  load(a);
  const status = a.api.vtCommonDenominatorStatus, check = a.api.vtCheckCommonDenominator;
  assert.equal(typeof status, 'function');
  assert.equal(typeof check, 'function');
  const state = JSON.stringify(a.api.vtS), before = protectedState(a);
  const fractions = [];
  for (let d = 1; d <= 12; d++) for (let n = 0; n <= d; n++) fractions.push({ n, d });
  for (const left of fractions) for (const right of fractions) {
    const original = Object.freeze(task({ a: left.n, b: left.d, c: right.n, d: right.d }));
    const originalJSON = JSON.stringify(original);
    // Unabhängige, endliche Referenz: erster Nenner mit ganzzahligen Zählern.
    let minimum = 1;
    for (; minimum <= left.d * right.d; minimum++) {
      if ((left.n * minimum) % left.d === 0 && (right.n * minimum) % right.d === 0) break;
    }
    assert(minimum <= left.d * right.d);
    const context = `${left.n}/${left.d} und ${right.n}/${right.d}, Minimum ${minimum}`;
    const sources = frozenSources(left.n, left.d, right.n, right.d);
    const sourcesJSON = JSON.stringify(sources);
    const result = status(original, sources);
    assert.equal(result.minimum, minimum, context);
    assert.equal(result.kind, left.d !== right.d ? 'pending' : left.d === minimum ? 'smallest' : 'common', context);
    if (left.d === right.d) assert.equal(result.d, left.d, context);

    for (let D = 1; D <= 36; D++) {
      const suitable = (left.n * D) % left.d === 0 && (right.n * D) % right.d === 0;
      const kind = !suitable ? 'unsuitable' : D === minimum ? 'smallest' : 'common';
      assert.equal(check(original, String(D)).kind, kind, `${context}, D=${D}`);
      if (suitable) {
        const transformed = frozenSources(left.n * D / left.d, D, right.n * D / right.d, D);
        const transformedJSON = JSON.stringify(transformed);
        const common = status(original, transformed);
        assert.equal(common.kind, kind, `${context}, Quellen-Nenner ${D}`);
        assert.equal(common.minimum, minimum, context);
        assert.equal(common.d, D, context);
        assert.equal(JSON.stringify(transformed), transformedJSON, 'Pure Funktion verändert keine umgeformten Quellen');
      }
    }
    assert.equal(JSON.stringify(original), originalJSON, 'Pure Funktionen verändern die Originalaufgabe nicht');
    assert.equal(JSON.stringify(sources), sourcesJSON, 'Pure Funktion verändert keine Originalquellen');
  }
  for (const invalid of ['', '0', '-1', '1.5', '1.0', '1e1', '+2', ' 6 ', '37', 'Infinity', 'NaN', '9007199254740993']) {
    assert.equal(check(task(), invalid).kind, 'invalid', `Nur Ziffern, ganze Nenner 1–36: ${JSON.stringify(invalid)}`);
  }
  assert.equal(JSON.stringify(a.api.vtS), state, 'Pure Funktionen verändern keinen Trainingszustand');
  unchanged(a, before);
});

test('Unveränderte Hinweise bleiben stabil; ein korrekt gekürztes Endergebnis wird trotz anderem Nenner akzeptiert', t => {
  const a = boot(t);
  load(a);
  transform(a, 0, 'expand', 4);
  transform(a, 1, 'expand', 5);
  a.fill('#vt-denominator', 20);
  const observer = new a.dom.window.MutationObserver(() => {});
  for (const selector of ['#vt-common-sources', '#vt-common-answer']) {
    observer.observe(a.el(selector), { childList: true, subtree: true, characterData: true });
  }
  a.fill('#vt-numerator', 3);
  a.fill('#vt-numerator', 4);
  assert.equal(observer.takeRecords().length, 0, 'Keine erneute Live-Textänderung bei unverändertem Nenner');
  observer.disconnect();

  load(a, task({ a: 1, b: 3, c: 1, d: 6, answer: [1, 2] }));
  a.fill('#vt-denominator', 2);
  answerFeedback(a, 'unsuitable');
  assert.match(a.el('#vt-common').textContent, /nicht den Nenner eines gekürzten Endergebnisses/);
  a.fill('#vt-numerator', 1);
  const before = JSON.parse(JSON.stringify(a.api.vtTotals));
  a.click('#vt-submit');
  assert.equal(a.api.vtS.done, true, '1/2 wird als richtiges Endergebnis akzeptiert');
  assert.equal(a.api.vtTotals.correct, before.correct + 1);
  assert.equal(a.api.vtTotals.attempts, before.attempts + 1);
});
