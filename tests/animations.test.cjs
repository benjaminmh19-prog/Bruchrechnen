'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');

// Hooks ausschließlich in der gelesenen HTML-Kopie; keine Änderung der App.
function boot(t, hash = 'equiv', { reducedMotion = false, animate = 'stub' } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const anchor = 'renderTabs();renderPanel();\n})();';
  assert.equal(source.split(anchor).length, 2, 'Eindeutiger vereinbarter IIFE-Testanker');
  const html = source.replace(anchor,
    'window.__animationTest={eqState:eqState,vtS:vtS,dtS:dtS,spRenderPictures:spRenderPictures};' + anchor);
  const errors = [], animations = [], queries = new Map();
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  let reduced = reducedMotion;
  const dom = new JSDOM(html, {
    url: `https://example.test/#${hash}`,
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      window.matchMedia = query => {
        if (!queries.has(query)) {
          const listeners = new Set();
          const mql = {
            media: query, onchange: null,
            get matches() {
              if (/prefers-reduced-motion\s*:\s*reduce\s*\)/.test(query)) return reduced;
              if (/prefers-reduced-motion\s*:\s*no-preference\s*\)/.test(query)) return !reduced;
              return false;
            },
            addEventListener(type, listener) { if (type === 'change') listeners.add(listener); },
            removeEventListener(type, listener) { if (type === 'change') listeners.delete(listener); },
            addListener(listener) { listeners.add(listener); },
            removeListener(listener) { listeners.delete(listener); },
            dispatchEvent(event) {
              for (const listener of listeners) {
                if (typeof listener === 'function') listener.call(mql, event);
                else listener.handleEvent(event);
              }
              if (mql.onchange) mql.onchange.call(mql, event);
              return true;
            }
          };
          queries.set(query, mql);
        }
        return queries.get(query);
      };
      if (animate === 'missing') {
        delete window.Element.prototype.animate;
      } else {
        window.Element.prototype.animate = function (frames, options) {
          if (animate === 'throws') throw new Error('Web Animations nicht verfügbar');
          const eventTarget = new window.EventTarget();
          let settle;
          const animation = {
            element: this,
            frames: JSON.parse(JSON.stringify(frames)),
            options: JSON.parse(JSON.stringify(options)),
            cancelCount: 0, playState: 'running', onfinish: null, oncancel: null,
            finished: new Promise(resolve => { settle = resolve; }),
            addEventListener: eventTarget.addEventListener.bind(eventTarget),
            removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
            cancel() {
              this.cancelCount++;
              this.playState = 'idle';
              const event = new window.Event('cancel');
              eventTarget.dispatchEvent(event);
              if (this.oncancel) this.oncancel(event);
              settle(this);
            },
            finish() {
              this.playState = 'finished';
              const event = new window.Event('finish');
              eventTarget.dispatchEvent(event);
              if (this.onfinish) this.onfinish(event);
              settle(this);
            }
          };
          animations.push(animation);
          return animation;
        };
      }
      // Fremde Animationen sind sichtbar, dürfen aber nicht mitgecancelt werden.
      window.Element.prototype.getAnimations = function () {
        return animations.filter(a => a.element === this && a.playState === 'running');
      };
    }
  });
  t.after(() => {
    dom.window.close();
    assert.equal(errors.length, 0, errors.map(error => error.stack || String(error)).join('\n'));
  });
  assert(dom.window.__animationTest, 'Animationstest-Hooks verfügbar');
  const a = {
    dom, d: dom.window.document, api: dom.window.__animationTest, animations,
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
    },
    setReduced(value) {
      const previous = [...queries.values()].map(mql => [mql, mql.matches]);
      reduced = value;
      for (const [mql, matches] of previous) if (mql.matches !== matches) {
        const event = new dom.window.Event('change');
        Object.defineProperties(event, {
          matches: { value: mql.matches }, media: { value: mql.media }
        });
        mql.dispatchEvent(event);
      }
    }
  };
  return a;
}

function geometry(element) {
  const attrs = ['d', 'r', 'cx', 'cy', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'width', 'height', 'viewBox', 'transform'];
  return {
    tag: element.localName,
    attrs: attrs.map(attr => [attr, element.getAttribute(attr)]),
    style: ['--parts', 'width', 'height', 'grid-template-columns', 'transform', 'left']
      .map(prop => [prop, element.style.getPropertyValue(prop)])
  };
}

function snapshot(a, scope) {
  const pictures = [...a.el(scope).querySelectorAll('.sp-picture')];
  assert(pictures.length, `${scope}: Bilder vorhanden`);
  return pictures.map(root => ({
    root,
    division: ['parts', 'view', 'group', 'total'].map(key => root.dataset[key]),
    pieces: [...root.querySelectorAll('.sp-piece')],
    shapes: [...root.querySelectorAll('svg,path,circle,line,.sp-bar,.sp-old-boundary')].map(geometry),
    pieceGeometry: [...root.querySelectorAll('.sp-piece')].map(geometry)
  }));
}

function assertStable(a, scope, previous) {
  const current = snapshot(a, scope);
  assert.equal(current.length, previous.length, `${scope}: Zahl der Ganzen bleibt gleich`);
  previous.forEach((p, i) => {
    assert.equal(current[i].root, p.root, `${scope}: Bildknoten bleibt erhalten`);
    assert.deepEqual(current[i].division, p.division, `${scope}: Einteilung bleibt gleich`);
    assert.equal(current[i].pieces.length, p.pieces.length);
    p.pieces.forEach((piece, j) => assert.equal(current[i].pieces[j], piece,
      `${scope}: Stück ${j + 1} behält DOM-Identität`));
    assert.deepEqual(current[i].pieceGeometry, p.pieceGeometry, `${scope}: Stückgeometrie unverändert`);
    assert.deepEqual(current[i].shapes, p.shapes, `${scope}: Pfade, Radien und Grenzen unverändert`);
  });
}

function assertPulses(a, start, pieces) {
  const pulses = a.animations.slice(start);
  assert.equal(pulses.length, pieces.length, 'Genau die tatsächlich geänderten Stücke pulsieren');
  assert.equal(new Set(pulses.map(p => p.element)).size, pieces.length, 'Kein doppelter Impuls im selben Render');
  for (const piece of pieces) assert(pulses.some(p => p.element === piece), 'Geändertes Stück erhält Impuls');
  for (const pulse of pulses) {
    const frames = pulse.frames;
    const opacities = Array.isArray(frames) ? frames.map(frame => frame.opacity) : frames.opacity;
    assert.deepEqual(opacities, [1, 0.72, 1], 'Dezenter Opacity-Impuls');
    const keys = Array.isArray(frames) ? frames.flatMap(frame => Object.keys(frame)) : Object.keys(frames);
    assert(keys.every(key => ['opacity', 'offset', 'easing', 'composite'].includes(key)),
      'Keine d-, r-, transform- oder sonstige Geometrieanimation');
    assert.equal(pulse.options.duration, 180, 'Impuls dauert 180 ms');
    assert.equal(typeof pulse.options.easing, 'string');
    assert(pulse.options.easing.trim(), 'Explizites Easing');
  }
  return pulses;
}

function setWorkshop(a, key, target) {
  /* Der Nenner erweitert/kürzt jetzt mit: Zähler zuerst auf das Minimum, dann den Nenner einstellen. */
  if (key === 'b' || key === 'd') {
    const nk = key === 'b' ? 'a' : 'c';
    while (!a.el(`[data-act="dec"][data-key="${nk}"]`).disabled) a.click(`[data-act="dec"][data-key="${nk}"]`);
    for (let i = 0; i < 80; i++) {
      const current = Number(a.el(`#v-${key}`).textContent);
      if (current === target) return;
      if (current < target) {
        a.click(`[data-act="inc"][data-key="${key}"]`);
        if (Number(a.el(`#v-${key}`).textContent) > target) while (!a.el(`[data-act="inc"][data-key="${key}"]`).disabled) a.click(`[data-act="inc"][data-key="${key}"]`);
      } else a.click(`[data-act="dec"][data-key="${key}"]`);
    }
    assert.fail(`Werkstatt-Steller ${key} erreicht ${target} nicht`);
  }
  for (let i = 0; i < 80; i++) {
    const current = Number(a.el(`#v-${key}`).textContent);
    if (current === target) return;
    a.click(`[data-act="${current < target ? 'inc' : 'dec'}"][data-key="${key}"]`);
  }
  assert.fail(`Werkstatt-Steller ${key} erreicht ${target} nicht`);
}

function setupEq(a, mode, view) {
  a.click(`[data-eq="preset"][data-n="${mode === 'reduce' ? 6 : 1}"][data-d="${mode === 'reduce' ? 8 : 2}"]`);
  a.click(`[data-eq="mode"][data-mode="${mode}"]`);
  a.click('[data-eq="factor"][data-factor="2"]');
  a.click(`[data-eq="view"][data-view="${view}"]`);
}

function scores(a) {
  return ['bruch-visual-training-v1', 'bruch-detective-v1'].map(key =>
    JSON.parse(a.dom.window.localStorage.getItem(key) || 'null'));
}

const trainers = [['visual', 'vt', 'vtS'], ['detective', 'dt', 'dtS']];

test('Werkstatt: Balken-/Kreisklick erhält Stücke und Geometrie, der zweite Bruch bleibt unberührt', t => {
  for (const view of ['bar', 'circle']) {
    const a = boot(t, 'add');
    setWorkshop(a, 'b', 4); setWorkshop(a, 'd', 4);
    setWorkshop(a, 'a', 1); setWorkshop(a, 'c', 1);
    a.click(`[data-wk="view"][data-view="${view}"]`);
    const before = snapshot(a, '#wk-edit-a'), other = snapshot(a, '#wk-edit-c');
    const piece = a.el('#wk-a-piece-3'), start = a.animations.length;
    a.dispatch(piece);
    assert.equal(a.el('#v-a').textContent, '2');
    assert(piece.classList.contains('selected'));
    assert.equal(piece.getAttribute('aria-pressed'), 'true');
    assertStable(a, '#wk-edit-a', before); assertStable(a, '#wk-edit-c', other);
    assertPulses(a, start, [piece]);
    assert.equal(a.d.activeElement, piece, 'Fokus bleibt auf dem identischen Stück');
  }
});

test('Erweitern: Auswahländerung pulsiert im Ausgangsbild und in beiden statischen Vorschau-Stücken', t => {
  for (const view of ['bar', 'circle']) {
    const a = boot(t); setupEq(a, 'expand', view);
    const before = snapshot(a, '#eq-before'), after = snapshot(a, '#eq-after');
    const piece = before[0].pieces[1], preview = after[0].pieces.slice(2, 4);
    const start = a.animations.length;
    a.dispatch(piece);
    assert.equal(a.api.eqState.n, 2);
    assertStable(a, '#eq-before', before); assertStable(a, '#eq-after', after);
    assertPulses(a, start, [piece, ...preview]);
    assert(preview.every(p => p.classList.contains('selected')));
    assert(preview.every(p => !p.hasAttribute('data-eq')), 'Vorschau bleibt nicht-interaktiv');
  }
});

test('Kürzen: beide Stücke der Zweiergruppe und das Vorschau-Stück animieren und canceln gemeinsam', t => {
  for (const view of ['bar', 'circle']) {
    const a = boot(t); setupEq(a, 'reduce', view);
    const before = snapshot(a, '#eq-before'), after = snapshot(a, '#eq-after');
    const changed = [...before[0].pieces.slice(6, 8), after[0].pieces[3]];
    let start = a.animations.length;
    a.dispatch(changed[0]);
    assert.equal(a.api.eqState.n, 8);
    const first = assertPulses(a, start, changed);
    start = a.animations.length;
    a.dispatch(changed[1]);
    assert.equal(a.api.eqState.n, 6);
    assertPulses(a, start, changed);
    assert(first.every(p => p.cancelCount === 1), 'Auch Partnerstück und Vorschau canceln ihren vorigen Impuls');
    assert(changed.every(p => !p.classList.contains('selected')));
    assertStable(a, '#eq-before', before); assertStable(a, '#eq-after', after);
  }
});

test('Grafiktrainer und Detektiv: Balken-/Kreisklick patcht lokal ohne Geometrie- oder Scoringänderung', t => {
  for (const [hash, ns, hook] of trainers) for (const view of ['bar', 'circle']) {
    const a = boot(t, hash), s = a.api[hook];
    a.fill(`#${ns}-denominator`, 6); a.fill(`#${ns}-numerator`, 1);
    a.click(`[data-${ns}="view"][data-view="${view}"]`);
    const before = snapshot(a, `#${ns}-graph`);
    const staticPiece = a.el(`#${ns}-body .sp-piece`);
    const numeric = a.el(`#${ns}-numerator`), previousScores = scores(a);
    const piece = a.el(`#${ns}-piece-4`), start = a.animations.length;
    a.dispatch(piece);
    assert.equal(s.n, '2'); assert.equal(numeric.value, '2');
    assert.equal(a.el(`#${ns}-numerator`), numeric, 'Kein globaler Neuaufbau der Antwortsteuerung');
    assert.equal(a.el(`#${ns}-body .sp-piece`), staticPiece, 'Ausgangsbild bleibt unberührt');
    assert.equal(piece.getAttribute('aria-pressed'), 'true');
    assertStable(a, `#${ns}-graph`, before); assertPulses(a, start, [piece]);
    assert.deepEqual(scores(a), previousScores, 'Stückklick zählt keinen Antwortversuch');
    assert.equal(a.d.activeElement, piece);
  }
});

test('Nur nötige Bildstruktur wird bei Ansicht, Nenner oder Kürzungsgruppe ersetzt', t => {
  const a = boot(t, 'add');
  setWorkshop(a, 'b', 4); setWorkshop(a, 'd', 4);
  const other = snapshot(a, '#wk-edit-c'), old = snapshot(a, '#wk-edit-a');
  setWorkshop(a, 'b', 5);
  assert.notEqual(a.el('#wk-edit-a .sp-picture'), old[0].root, 'Neuer Nenner ersetzt Bild');
  assert(!old[0].pieces[0].isConnected);
  assertStable(a, '#wk-edit-c', other);
  const bar = a.el('#wk-edit-a .sp-picture');
  a.click('[data-wk="view"][data-view="circle"]');
  assert.notEqual(a.el('#wk-edit-a .sp-picture'), bar, 'Neue Ansicht ersetzt Bild');
  assert.equal(a.el('#wk-edit-a .sp-picture').dataset.view, 'circle');
  a.click('[data-act="tab"][data-op="equiv"]');
  setupEq(a, 'reduce', 'circle');
  a.click('#eq-piece-7'); // 8/8 ist auch durch 4 teilbar; 6/8 wäre kein gültiger Gruppenwechsel.
  const group2 = a.el('#eq-before .sp-picture');
  a.fill('#eq-factor-input', 4);
  const group4 = a.el('#eq-before .sp-picture');
  assert.notEqual(group4, group2, 'Neue Gruppeneinteilung ersetzt nötige Bildstruktur');
  assert.equal(group4.dataset.group, '4');
  assert.equal(group4.dataset.parts, '8');
  for (const [hash, ns] of trainers) {
    a.click(`[data-act="tab"][data-op="${hash}"]`);
    a.fill(`#${ns}-denominator`, 6); a.fill(`#${ns}-numerator`, 1);
    const previous = a.el(`#${ns}-graph .sp-picture`);
    a.fill(`#${ns}-denominator`, 5);
    assert.notEqual(a.el(`#${ns}-graph .sp-picture`), previous, `${ns}: Nennerwechsel ersetzt Bild`);
    assert.equal(a.el(`#${ns}-graph .sp-picture`).dataset.parts, '5');
  }
  // Der Patcher darf gleich eingeteilte Bilder außerhalb seines Containers nicht anfassen.
  const host = a.d.createElement('div'), untouched = a.d.createElement('div');
  const markup = '<div class="sp-picture" data-parts="2" data-group="1" data-total="2" data-view="bar"><div class="sp-bar" style="--parts:2"><span class="sp-piece"></span><span class="sp-piece"></span></div></div>';
  host.innerHTML = markup; untouched.innerHTML = markup;
  a.d.body.append(host, untouched);
  const external = untouched.firstElementChild, externalPiece = external.querySelector('.sp-piece');
  const externalHtml = untouched.innerHTML, ownPiece = host.querySelector('.sp-piece');
  a.api.spRenderPictures(host, markup.replace('class="sp-piece"', 'class="sp-piece selected on"'));
  assert.equal(host.querySelector('.sp-piece'), ownPiece);
  assert(ownPiece.classList.contains('selected'));
  assert.equal(untouched.firstElementChild, external);
  assert.equal(untouched.querySelector('.sp-piece'), externalPiece);
  assert.equal(untouched.innerHTML, externalHtml, 'DOM-Patching strikt containerlokal');
});

test('Schnelle Klicks canceln nur den eigenen vorigen Stückimpuls, nicht Nachbarn oder fremde Animationen', t => {
  for (const view of ['bar', 'circle']) {
    const a = boot(t, 'add'); setWorkshop(a, 'b', 4); setWorkshop(a, 'a', 1);
    a.click(`[data-wk="view"][data-view="${view}"]`);
    const before = snapshot(a, '#wk-edit-a'), piece = a.el('#wk-a-piece-3'), neighbor = a.el('#wk-a-piece-4');
    const foreign = piece.animate([{ opacity: 0.9 }, { opacity: 1 }], { duration: 900 });
    let start = a.animations.length;
    a.dispatch(piece); const first = assertPulses(a, start, [piece])[0];
    start = a.animations.length;
    a.dispatch(neighbor); const other = assertPulses(a, start, [neighbor])[0];
    start = a.animations.length;
    a.dispatch(piece); const second = assertPulses(a, start, [piece])[0];
    start = a.animations.length;
    a.dispatch(piece); const third = assertPulses(a, start, [piece])[0];
    assert.equal(first.cancelCount, 1); assert.equal(second.cancelCount, 1);
    assert.equal(third.cancelCount, 0); assert.equal(other.cancelCount, 0);
    assert.equal(foreign.cancelCount, 0, 'Keine fremden Elementanimationen canceln');
    assert.equal(a.el('#v-a').textContent, '3', 'Schnelle Klicks gehen nicht verloren');
    assertStable(a, '#wk-edit-a', before);
  }
});

test('Reduced Motion: keine Impulse bei Start, laufende Impulse beim Wechsel canceln, danach wieder aktivierbar', t => {
  for (const [hash, ns] of [['add', 'wk'], ['equiv', 'eq'], ...trainers.map(([hash, ns]) => [hash, ns])]) {
    for (const view of ['bar', 'circle']) {
      const a = boot(t, hash, { reducedMotion: true });
      if (ns === 'wk') { setWorkshop(a, 'b', 4); setWorkshop(a, 'a', 1); }
      else if (ns === 'eq') setupEq(a, 'reduce', view);
      else { a.fill(`#${ns}-denominator`, 6); a.fill(`#${ns}-numerator`, 1); }
      a.click(`[data-${ns}="view"][data-view="${view}"]`);
      const selector = ns === 'wk' ? '#wk-a-piece-3' : ns === 'eq' ? '#eq-piece-7' : `#${ns}-piece-4`;
      const piece = a.el(selector), selected = piece.classList.contains('selected');
      a.dispatch(piece);
      assert.equal(a.el(selector), piece, 'Reduced Motion erhält ebenfalls DOM-Identität');
      assert.equal(piece.classList.contains('selected'), !selected, 'Auswahl funktioniert ohne Bewegung');
      assert.equal(a.animations.length, 0, 'Kein animate-Aufruf bei reduzierter Bewegung');
    }
  }
  const a = boot(t); setupEq(a, 'reduce', 'circle');
  const source = snapshot(a, '#eq-before'), preview = snapshot(a, '#eq-after');
  const changed = [...source[0].pieces.slice(6, 8), preview[0].pieces[3]], start = a.animations.length;
  a.dispatch(changed[0]); const running = assertPulses(a, start, changed);
  const color = changed[0].animate([{ fill: 'white' }, { fill: 'black' }], { duration: 140 });
  color.transitionProperty = 'fill';
  const foreign = changed[0].animate([{ opacity: 0.9 }, { opacity: 1 }], { duration: 900 });
  a.setReduced(true);
  assert(running.every(p => p.cancelCount === 1), 'Media-Query-Wechsel cancelt alle laufenden eigenen Impulse');
  assert.equal(color.cancelCount, 1, 'Laufende CSS-Farbtransition wird beim Media-Query-Wechsel beendet');
  assert.equal(foreign.cancelCount, 0, 'Fremde Elementanimationen bleiben unberührt');
  const quiet = a.animations.length;
  a.dispatch(changed[1]); assert.equal(a.api.eqState.n, 6);
  assert.equal(a.animations.length, quiet);
  a.setReduced(false); a.dispatch(changed[0]);
  assertPulses(a, quiet, changed);
  assertStable(a, '#eq-before', source); assertStable(a, '#eq-after', preview);
});

test('animate-Fallback und abgegebene Antworten: Auswahl/Scoring funktionieren, gesperrte Stücke bleiben unbeweglich', t => {
  for (const view of ['bar', 'circle']) {
    const workshop = boot(t, 'add', { animate: 'missing' });
    setWorkshop(workshop, 'b', 4); setWorkshop(workshop, 'a', 1);
    workshop.click(`[data-wk="view"][data-view="${view}"]`);
    const editor = snapshot(workshop, '#wk-edit-a');
    workshop.click('#wk-a-piece-3');
    assert.equal(workshop.el('#v-a').textContent, '2');
    assertStable(workshop, '#wk-edit-a', editor);
    const eq = boot(t, 'equiv', { animate: 'missing' }); setupEq(eq, 'reduce', view);
    const before = snapshot(eq, '#eq-before'), after = snapshot(eq, '#eq-after');
    eq.click('#eq-piece-7');
    assert.equal(eq.api.eqState.n, 8);
    assertStable(eq, '#eq-before', before); assertStable(eq, '#eq-after', after);
    assert.equal(workshop.animations.length, 0); assert.equal(eq.animations.length, 0);
  }
  for (const animate of ['missing', 'throws', 'stub']) for (const [hash, ns, hook] of trainers) {
    const a = boot(t, hash, { animate }), s = a.api[hook];
    a.fill(`#${ns}-type`, 'expand', 'change');
    a.fill(`#${ns}-denominator`, 6); a.fill(`#${ns}-numerator`, 1);
    for (const view of ['bar', 'circle']) {
      a.click(`[data-${ns}="view"][data-view="${view}"]`);
      const before = snapshot(a, `#${ns}-graph`), piece = a.el(`#${ns}-piece-4`);
      const n = Number(s.n); a.dispatch(piece);
      assert.equal(Number(s.n), n + (piece.classList.contains('selected') ? 1 : -1));
      assertStable(a, `#${ns}-graph`, before);
    }
    a.fill(`#${ns}-denominator`, s.task.answer[1]);
    a.fill(`#${ns}-numerator`, s.task.answer[0]);
    if (ns === 'dt') {
      const reason = a.el('input[name="dt-reason"][value="rule"]');
      reason.checked = true; reason.dispatchEvent(new a.dom.window.Event('change', { bubbles: true }));
    }
    a.click(ns === 'vt' ? '#vt-submit' : '#dt-check');
    assert(s.done);
    const totals = scores(a), total = totals[ns === 'vt' ? 0 : 1];
    assert.equal(total.attempts, 1, 'Genau eine gewertete Abgabe');
    assert.equal(total[ns === 'vt' ? 'correct' : 'solved'], 1);
    for (const view of ['bar', 'circle']) {
      a.click(`[data-${ns}="view"][data-view="${view}"]`);
      const before = snapshot(a, `#${ns}-graph`), piece = a.el(`#${ns}-piece-1`);
      const animationCount = a.animations.length;
      const n = s.n, d = s.d, selected = a.el(`#${ns}-graph`).querySelectorAll('.sp-piece.selected').length;
      assert.equal(piece.getAttribute('aria-disabled'), 'true');
      assert.equal(piece.getAttribute('tabindex'), '-1');
      if (view === 'bar') assert(piece.disabled);
      a.dispatch(piece); // Absichtlich synthetisch: auch SVG darf den Antwortguard nicht umgehen.
      piece.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const input = a.el(`#${ns}-numerator`); assert(input.disabled);
      input.value = '999'; input.dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
      assert.equal(s.n, n); assert.equal(s.d, d); assert(s.done);
      assert.equal(a.el(`#${ns}-graph`).querySelectorAll('.sp-piece.selected').length, selected);
      assertStable(a, `#${ns}-graph`, before); assert.deepEqual(scores(a), totals);
      assert.equal(a.animations.length, animationCount, 'Gesperrte Antworten starten keinen Impuls');
    }
    if (animate !== 'stub') assert.equal(a.animations.length, 0);
  }
});

test('Farbtransitions: ausschließlich fill/background-color mit 140 ms unter no-preference', t => {
  const a = boot(t), transitions = [];
  function visit(rules, media = []) {
    for (const rule of rules) {
      if (rule.cssRules) visit(rule.cssRules, rule.conditionText ? [...media, rule.conditionText] : media);
      if (!rule.style || !/\.sp-(?:piece|wedge)\b/.test(rule.selectorText || '')) continue;
      const shorthand = rule.style.getPropertyValue('transition');
      const properties = rule.style.getPropertyValue('transition-property');
      if (!shorthand && !properties) continue;
      assert(media.some(query => /prefers-reduced-motion\s*:\s*no-preference/.test(query)),
        'Stück-Farbtransitions stehen nur im no-preference-Mediablock');
      if (shorthand) for (const entry of shorthand.split(',')) {
        const tokens = entry.trim().split(/\s+/), property = tokens[0];
        assert(['fill', 'background-color'].includes(property), `Keine Geometrietransition: ${property}`);
        assert(tokens.some(token => /^(?:140ms|0?\.14s)$/.test(token)), 'Farbtransition dauert 140 ms');
        transitions.push(property);
      }
      else {
        const duration = rule.style.getPropertyValue('transition-duration');
        assert(duration.split(',').every(value => /^(?:140ms|0?\.14s)$/.test(value.trim())));
        for (const property of properties.split(',').map(value => value.trim())) {
          assert(['fill', 'background-color'].includes(property)); transitions.push(property);
        }
      }
    }
  }
  // jsdom wertet Media Queries nicht als Layout aus; deshalb deren CSSOM-Geltungsbereich prüfen.
  for (const sheet of a.d.styleSheets) visit(sheet.cssRules);
  assert(transitions.includes('fill'), 'SVG-Füllung hat die Farbtransition');
  assert(transitions.includes('background-color'), 'Balkenfüllung hat die Farbtransition');
});
