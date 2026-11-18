const fs = require('fs');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const errors = [];
const vc = new VirtualConsole(); vc.on('jsdomError',e=>errors.push(e));
const dom = new JSDOM(fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'), {url:'https://example.test/',runScripts:'dangerously',virtualConsole:vc,pretendToBeVisual:true});
const w = dom.window, d = w.document;
function $ (s) {const e=d.querySelector(s); assert(e,`Missing ${s}`); return e;}
function click(s){const e=$(s);assert(!e.disabled,`Disabled ${s}`);e.click();}
function tab(op){click(`[data-act="tab"][data-op="${op}"]`);}
function value(k){return +$(`#v-${k}`).textContent;}
function set(k,v){
  if(k==='b'||k==='d'){
    /* Der Nenner erweitert/kürzt jetzt mit: Zähler erst auf Minimum, dann Nenner schrittweise einstellen. */
    const nk=k==='b'?'a':'c',inc=`[data-act="inc"][data-key="${k}"]`,dec=`[data-act="dec"][data-key="${k}"]`;
    while(!$(`[data-act="dec"][data-key="${nk}"]`).disabled)click(`[data-act="dec"][data-key="${nk}"]`);
    for(let guard=0;value(k)!==v&&guard<60;guard++){
      if(value(k)<v){click(inc);if(value(k)>v){while(!$(inc).disabled)click(inc);}}
      else click(dec);
    }
    return;
  }
  while(value(k)<v)click(`[data-act="inc"][data-key="${k}"]`);while(value(k)>v)click(`[data-act="dec"][data-key="${k}"]`);
}
function operands(a,b,c,dd){set('b',b);set('d',dd);set('a',a);set('c',c);}
function board(){return $('#wk-board').textContent.replace(/\s+/g,' ');}
function advance(){click('[data-wk="advance"]');}
function eqFrac(n,dd){const fracs=[...$('#wk-board').querySelectorAll('.wk-result .fr')];assert(fracs.some(f=>f.querySelector('.n').textContent===String(n)&&f.querySelector('.d').textContent===String(dd)),`Expected fraction ${n}/${dd}: ${board()}`);}
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
test('Initialisierung ohne Fehler',()=>{assert.equal(errors.length,0);assert.equal(d.querySelectorAll('.tab').length,8);assert.equal(d.querySelectorAll('#wk-edit-a .wk-piece').length,2);});
test('Stücke antippen, reduzieren, leeren',()=>{operands(1,4,1,3);click('#wk-edit-a [data-index="3"]');assert.equal(value('a'),2);click('#wk-edit-a [data-index="3"]');assert.equal(value('a'),1);click('#wk-edit-a [data-wk="clear"]');assert.equal(value('a'),0);});
test('Kreisstücke mit Tastatur',()=>{click('[data-wk="view"][data-view="circle"]');const wedge=$('#wk-edit-a [data-index="2"]');wedge.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(value('a'),1);assert.equal(d.querySelectorAll('#wk-edit-a .wk-wedge').length,4);click('[data-wk="view"][data-view="bar"]');});
test('Addition 1/2+1/3=5/6 und Undo',()=>{operands(1,2,1,3);advance();assert(board().includes('3/6')&&board().includes('2/6'));advance();eqFrac(5,6);assert.equal(d.querySelectorAll('.wk-result').length,1);click('[data-wk="undo"]');assert(board().includes('Jetzt kannst du'));advance();advance();eqFrac(5,6);});
test('Addition über 1, ganze und gebrochene Werte',()=>{operands(3,4,2,3);advance();advance();eqFrac(17,12);assert.equal(d.querySelectorAll('#wk-board > .wk-row').length,2);advance();eqFrac(17,12);assert(board().includes('Ganzes 2'));});
test('Null addition und ganzes Ergebnis',()=>{operands(0,2,0,3);advance();advance();eqFrac(0,6);advance();assert(board().includes('Menge bleibt gleich'));operands(1,2,1,2);advance();advance();advance();assert(board().includes('Ganzes 1'));});
test('Subtraktion aktiv wegnehmen, zurücklegen und prüfen',()=>{tab('sub');operands(3,4,1,2);advance();assert($('[data-wk="advance"]').disabled);click('[data-wk="remove"][data-index="0"]');assert(board().includes('Weggenommen: 1 von 2'));click('[data-wk="remove"][data-index="0"]');assert(board().includes('Weggenommen: 0 von 2'));click('[data-wk="take"]');click('[data-wk="take"]');assert.equal(d.querySelectorAll('.wk-cell.removed').length,2);assert($('[data-wk="take"]').disabled);advance();eqFrac(1,4);advance();eqFrac(1,4);});
test('Negative Differenz gesperrt und Tausch funktioniert',()=>{operands(1,4,3,4);assert(board().includes('negatives'));click('[data-wk="swap"]');assert.equal(value('a'),3);assert.equal(value('c'),1);advance();});
test('Subtraktion gleich großer Werte ergibt 0',()=>{operands(1,2,2,4);advance();click('[data-wk="take"]');click('[data-wk="take"]');advance();eqFrac(0,4);advance();});
test('Multiplikation im Raster und Kürzen',()=>{tab('mul');operands(2,3,3,4);assert.equal(d.querySelectorAll('.wk-square.x').length,6);click('.wk-square[data-col="1"][data-row="2"]');assert.equal(value('a'),1);assert.equal(value('c'),2);assert.equal(d.querySelectorAll('.wk-square.x').length,2);operands(2,3,3,4);advance();eqFrac(6,12);advance();eqFrac(1,2);});
test('Null und volles Multiplikationsraster',()=>{operands(0,12,12,12);assert.equal(d.querySelectorAll('.wk-square').length,144);assert.equal(d.querySelectorAll('.wk-square.x').length,0);advance();advance();operands(12,12,12,12);assert.equal(d.querySelectorAll('.wk-square.x').length,144);});
test('Division 2/3:1/6=4 Portionen',()=>{tab('div');operands(2,3,1,6);advance();for(let i=0;i<4;i++)click('[data-wk="portion"]');assert($('[data-wk="portion"]').disabled);advance();assert(board().includes('4 volle Portionen'));eqFrac(4,1);advance();assert(board().includes('Kehrwert'));});
test('Division mit Rest: ursprüngliche Menge und Teilportion trennen',()=>{operands(3,4,1,2);advance();click('[data-wk="portion"]');advance();eqFrac(3,2);assert(board().includes('Restmenge')&&board().includes('Teilportion'));assert.equal(d.querySelectorAll('.wk-result .wk-bar .partial').length,1);advance();eqFrac(3,2);});
test('Division kleiner 1 und null, Division durch null gesperrt',()=>{operands(1,4,1,2);advance();assert($('[data-wk="portion"]').disabled);advance();eqFrac(1,2);advance();operands(0,4,1,2);advance();advance();eqFrac(0,2);advance();assert($('#wk-edit-c [data-wk="clear"]').disabled);assert($('[data-act="dec"][data-key="c"]').disabled);click('#wk-edit-c [data-index="1"]');assert.equal(value('c'),1);});
test('Großer Hauptnenner bleibt darstellbar',()=>{tab('add');operands(10,11,11,12);advance();assert(board().includes('132'));advance();eqFrac(241,132);advance();});
test('Übungsaufgabe grafisch übernehmen ohne Antwort vorzugeben',()=>{tab('sub');const nums=[...$('#prac .task').querySelectorAll('.fr')].map(f=>[+f.querySelector('.n').textContent,+f.querySelector('.d').textContent]);click('[data-wk="loadtask"]');assert.equal(value('a'),nums[0][0]);assert.equal(value('b'),nums[0][1]);assert.equal(value('c'),nums[1][0]);assert.equal(value('d'),nums[1][1]);assert.equal($('#ans-n').value,'');assert(!$('#wk-source').hidden);assert($('#fb').textContent==='');});
test('Bestehende Übungsprüfung und Sachaufgabe',()=>{const ns=[...$('#prac .task').querySelectorAll('.fr')].map(f=>[+f.querySelector('.n').textContent,+f.querySelector('.d').textContent]);const [a,b]=ns[0],[c,dd]=ns[1];$('#ans-n').value=String(a*dd-c*b);$('#ans-d').value=String(b*dd);click('[data-act="check"]');assert(d.querySelector('#fb .ok'));click('[data-act="wnew"]');assert(d.querySelector('#word .q'));});
test('Alle vier bestehenden Spiele starten',()=>{tab('games');for(const id of ['memory','cmp','rush','fill']){click(`[data-g="sel"][data-id="${id}"]`);assert($('#garea').textContent.trim().length>0);}tab('add');});
test('Nenner erweitern/kürzen: Zähler wächst und schrumpft mit, Bild folgt',()=>{
  tab('add');operands(1,2,1,3);
  const inc=k=>click(`[data-act="inc"][data-key="${k}"]`),dec=k=>click(`[data-act="dec"][data-key="${k}"]`);
  const sel=id=>d.querySelectorAll(`#${id} .sp-piece.selected, #${id} .sp-wedge.selected`).length;
  const parts=id=>d.querySelectorAll(`#${id} .sp-piece, #${id} .sp-wedge`).length;
  inc('b');assert.equal(value('b'),4);assert.equal(value('a'),2);assert.equal(parts('wk-edit-a'),4);assert.equal(sel('wk-edit-a'),2);
  assert(/Gleicher Wert: 1\/2 = 2\/4/.test($('#wk-source').textContent));
  inc('b');assert.equal(value('b'),6);assert.equal(value('a'),3);assert.equal(sel('wk-edit-a'),3);
  dec('b');assert.equal(value('b'),4);assert.equal(value('a'),2);
  dec('b');assert.equal(value('b'),2);assert.equal(value('a'),1);assert.equal(parts('wk-edit-a'),2);assert.equal(sel('wk-edit-a'),1);
  assert.equal(value('d'),3);assert.equal(value('c'),1);
  inc('d');assert.equal(value('d'),6);assert.equal(value('c'),2);assert.equal(sel('wk-edit-c'),2);
});
test('Nenner ohne gleichwertigen Schritt: ±1 mit angepasstem Zähler und Hinweis',()=>{
  tab('add');operands(1,2,1,2);
  // 1/4 hat nach unten keinen gleichwertigen Nenner (2 und 3 gehen nicht auf): Fallback auf 3 Teile
  click('[data-act="inc"][data-key="b"]');assert.equal(value('b'),4);assert.equal(value('a'),2);
  click('[data-act="dec"][data-key="a"]');assert.equal(value('a'),1);
  click('[data-act="dec"][data-key="b"]');assert.equal(value('b'),3);assert.equal(value('a'),1);
  assert(/geht 1\/4 nicht genau auf/.test($('#wk-source').textContent));
});
test('Multiplikation und Division: Nenner ändern lässt den Zähler unabhängig (kein Erweitern)',()=>{
  for(const op of ['mul','div']){
    tab(op);operands(1,2,1,3);
    click('[data-act="inc"][data-key="b"]');assert.equal(value('b'),3,op);assert.equal(value('a'),1,op);
    click('[data-act="inc"][data-key="d"]');assert.equal(value('d'),4,op);assert.equal(value('c'),1,op);
    click('[data-act="dec"][data-key="b"]');assert.equal(value('b'),2,op);assert.equal(value('a'),1,op);
    assert(!/Gleicher Wert/.test($('#wk-source')?$('#wk-source').textContent:''),op);
  }
});
test('Keine Laufzeitfehler',()=>{assert.equal(errors.length,0,errors.map(e=>e.stack).join('\n'));});
console.log(`\n${count} Funktionstests erfolgreich.`);
dom.window.close();
