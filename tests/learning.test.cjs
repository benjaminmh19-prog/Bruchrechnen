const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {test}=require('node:test');const {JSDOM,VirtualConsole}=require('jsdom');
function boot(hash='equiv'){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 let html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 html=html.replace('renderTabs();renderPanel();\n})();','window.__bruchTest={transformFraction:transformFraction,commonDivisors:commonDivisors,generateVisualTask:generateVisualTask,vtS:vtS,vtTotals:vtTotals,vtIsCorrect:vtIsCorrect};renderTabs();renderPanel();\n})();');
 const dom=new JSDOM(html,{url:'https://example.test/#'+hash,runScripts:'dangerously',virtualConsole:vc});
 return {dom,d:dom.window.document,api:dom.window.__bruchTest,errors,click(s){const e=dom.window.document.querySelector(s);assert(e,s);assert(!e.disabled,'Disabled '+s);e.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));}};
}
test('Erweitern und Kürzen erhalten den Wert für alle kleinen Brüche',()=>{
 const app=boot();const f=app.api.transformFraction;
 for(let d=1;d<=36;d++)for(let n=0;n<=d;n++)for(let factor=2;factor<=8;factor++){
  const expanded=f(n,d,'expand',factor);
  if(d*factor<=72){assert(expanded.ok);assert.equal(expanded.n*d,n*expanded.d);assert.equal(expanded.d,d*factor);}else assert(!expanded.ok);
  const reduced=f(n,d,'reduce',factor);
  assert.equal(reduced.ok,n%factor===0&&d%factor===0);
  if(reduced.ok){assert.equal(reduced.n*d,n*reduced.d);assert.equal(reduced.d,d/factor);}
 }
 assert.equal(app.errors.length,0);app.dom.window.close();
});
test('Ungültige Faktoren, Nenner und Kürzungen werden abgefangen',()=>{
 const app=boot(),f=app.api.transformFraction;
 for(const factor of [0,1,-2,1.5,NaN])assert(!f(2,3,'expand',factor).ok);
 assert(!f(2,0,'expand',2).ok);assert(!f(4,6,'reduce',3).ok);assert(!f(1,3,'reduce',2).ok);
 assert(f(0,6,'reduce',6).ok);assert.equal(f(0,6,'reduce',6).d,1);assert.equal(f(6,6,'reduce',6).n,1);
 assert.deepEqual(Array.from(app.api.commonDivisors(0,6)),[2,3,6]);app.dom.window.close();
});
test('Umformung anwenden, zurückgehen, vollständig kürzen und Grenzen',()=>{
 const a=boot(),d=a.d;
 a.click('[data-eq="apply"]');assert.equal(d.querySelector('#eq-n').textContent,'4');assert.equal(d.querySelector('#eq-d').textContent,'6');
 a.click('[data-eq="undo"]');assert.equal(d.querySelector('#eq-n').textContent,'2');assert.equal(d.querySelector('#eq-d').textContent,'3');
 a.click('[data-eq="preset"][data-n="6"]');a.click('[data-eq="fully"]');assert.equal(d.querySelector('#eq-n').textContent,'3');assert.equal(d.querySelector('#eq-d').textContent,'4');
 a.click('[data-eq="preset"][data-n="0"]');a.click('[data-eq="fully"]');assert.equal(d.querySelector('#eq-n').textContent,'0');assert.equal(d.querySelector('#eq-d').textContent,'1');assert(d.querySelector('[data-eq="fully"]').disabled);
 a.click('[data-eq="preset"][data-n="2"]');a.click('[data-eq="mode"][data-mode="reduce"]');assert(d.querySelector('[data-eq="apply"]').disabled);assert(d.querySelector('#eq-status').textContent.includes('nicht'));
 assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Generator liefert lösbare grafische Aufgaben ohne Nullnenner',()=>{
 const a=boot();const gen=a.api.generateVisualTask;
 for(const type of ['add','sub','mul','div','expand','reduce'])for(const lvl of [1,2])for(let k=0;k<100;k++){
  const t=gen(type,lvl);assert.equal(t.type,type);assert(Number.isInteger(t.a)&&t.a>=0);assert(t.b>=1&&t.b<=36);assert(t.answer[1]>0&&t.answer[1]<=36);assert(t.answer[0]>=0);assert(t.instruction);
  let n,den;
  if(type==='expand'){n=t.a*t.factor;den=t.b*t.factor;assert.equal(t.answer[0],n);assert.equal(t.answer[1],den);}
  else if(type==='reduce'){const gcd=(x,y)=>y?gcd(y,x%y):x,g=gcd(t.a,t.b);n=t.a/g;den=t.b/g;assert.equal(t.answer[0],n);assert.equal(t.answer[1],den);assert(g>1);}
  else{assert(t.d>0&&t.c>0);if(type==='add'){n=t.a*t.d+t.c*t.b;den=t.b*t.d;}if(type==='sub'){n=t.a*t.d-t.c*t.b;den=t.b*t.d;assert(n>=0);}if(type==='mul'){n=t.a*t.c;den=t.b*t.d;}if(type==='div'){n=t.a*t.d;den=t.b*t.c;assert(n/den<=4);}assert.equal(t.answer[0]*den,n*t.answer[1]);}
 }
 assert.equal(a.errors.length,0);a.dom.window.close();
});

function fill(a,id,value){const e=a.d.querySelector('#'+id);assert(e,id);e.value=String(value);e.dispatchEvent(new a.dom.window.Event('input',{bubbles:true}));}
function choose(a,id,value){const e=a.d.querySelector('#'+id);e.value=String(value);e.dispatchEvent(new a.dom.window.Event('change',{bubbles:true}));}
test('Grafiktraining: leere Antworten zählen nicht, Umformungen sind exakt',()=>{
 const a=boot('visual'),s=a.api.vtS,tot=a.api.vtTotals;
 choose(a,'vt-type','expand');a.click('#vt-submit');assert.equal(tot.attempts,0);
 fill(a,'vt-denominator',s.task.b);fill(a,'vt-numerator',s.task.a);a.click('#vt-submit');assert.equal(tot.attempts,1);assert.equal(tot.correct,0);assert(!s.done);assert(a.d.querySelector('#vt-feedback').textContent.includes('Faktor')||a.d.querySelector('#vt-feedback').textContent.includes('Nenner'));
 a.click('#vt-submit');assert.equal(tot.attempts,1);
 fill(a,'vt-denominator',s.task.answer[1]);fill(a,'vt-numerator',s.task.answer[0]);a.click('#vt-submit');assert.equal(tot.correct,1);assert(s.done);assert(!a.d.querySelector('#vt-submit'));assert.equal(a.d.activeElement.id,'vt-new');
 const stored=JSON.parse(a.dom.window.localStorage.getItem('bruch-visual-training-v1'));assert.equal(stored.correct,1);
 a.click('#vt-new');assert.equal(a.d.querySelector('#vt-numerator').value,'');assert.equal(a.d.querySelector('#vt-denominator').value,'');
 a.click('#vt-show');assert(s.done);assert.equal(tot.correct,1);assert(!a.d.querySelector('#vt-submit'));
 assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Grafische Stückwahl und Tastatur, Tabwechsel erhält Aufgabe',()=>{
 const a=boot('visual');choose(a,'vt-type','add');const task=a.api.vtS.task;
 fill(a,'vt-denominator',6);a.click('#vt-piece-4');assert.equal(a.api.vtS.n,'4');assert.equal(a.d.activeElement.id,'vt-piece-4');
 a.d.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(a.api.vtS.n,'3');assert.equal(a.d.activeElement.id,'vt-piece-3');
 a.click('[data-act="tab"][data-op="equiv"]');a.click('[data-act="tab"][data-op="visual"]');assert.equal(a.api.vtS.task,task);assert.equal(a.d.querySelector('#vt-numerator').value,'3');
 assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Lerncheck: alle sechs Typen, acht Aufgaben, einmalige Abgabe und Bestwert',()=>{
 const a=boot('visual'),s=a.api.vtS,tot=a.api.vtTotals;choose(a,'vt-mode','check');a.click('#vt-start');
 assert.equal(new Set(s.run.tasks.map(t=>t.type)).size,6);assert(a.d.querySelector('#vt-mode').disabled);assert(!a.d.querySelector('#vt-tip'));assert(!a.d.querySelector('#vt-show'));
 a.click('#vt-submit');assert.equal(s.run.results.length,0);
 for(let i=0;i<8;i++){
  const t=s.task;fill(a,'vt-denominator',t.answer[1]);fill(a,'vt-numerator',t.answer[0]);a.click('#vt-submit');
  assert.equal(s.run.results.length,i+1);assert(!a.d.querySelector('#vt-submit'));assert(s.done);assert(!a.d.querySelector('.vt-review'));
  a.click('#vt-next');assert(a.d.querySelector('.vt-review'));a.click('#vt-next');
 }
 assert(s.run.finished);assert.equal(s.run.score,8);assert.equal(tot.checks,1);assert.equal(tot.best,8);assert.equal(tot.attempts,0);assert.equal(a.d.querySelectorAll('.vt-results li').length,8);
 assert.equal(a.d.activeElement.id,'vt-summary-title');assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Lerncheck abbrechen speichert keine Punktzahl und entsperrt Einstellungen',()=>{
 const a=boot('visual'),s=a.api.vtS,tot=a.api.vtTotals;choose(a,'vt-mode','check');a.click('#vt-start');a.click('#vt-abort');assert.equal(s.run,null);assert.equal(tot.checks,0);assert(!a.d.querySelector('#vt-mode').disabled);assert(a.d.querySelector('#vt-start'));a.dom.window.close();
});

test('Direktbutton zum Grafiktraining synchronisiert URL und gespeicherten Reiter',()=>{
 const a=boot('equiv');a.click('[data-eq="train"]');assert.equal(a.dom.window.location.hash,'#visual');assert(a.d.querySelector('#vt-root'));const state=JSON.parse(a.dom.window.localStorage.getItem('bruch-v1'));assert.equal(state.cur,'visual');assert.equal(a.errors.length,0);a.dom.window.close();
});
