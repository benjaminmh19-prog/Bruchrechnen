const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {test}=require('node:test');const {JSDOM,VirtualConsole}=require('jsdom');
function boot(hash='detective'){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));let html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 html=html.replace('renderTabs();renderPanel();\n})();','window.__dtTest={generate:generateDetectiveTask,s:dtS,totals:dtTotals,check:dtCheck,vtS:vtS};renderTabs();renderPanel();\n})();');
 const dom=new JSDOM(html,{url:'https://example.test/#'+hash,runScripts:'dangerously',virtualConsole:vc});const d=dom.window.document;
 return {dom,d,errors,api:dom.window.__dtTest,click(s){const e=d.querySelector(s);assert(e,s);assert(!e.disabled,'Disabled '+s);e.click();},fill(id,v){const e=d.querySelector('#'+id);e.value=String(v);e.dispatchEvent(new dom.window.Event('input',{bubbles:true}));},choose(id,v){const e=d.querySelector('#'+id);e.value=String(v);e.dispatchEvent(new dom.window.Event('change',{bubbles:true}));},reason(v){const e=d.querySelector('input[name="dt-reason"][value="'+v+'"]');assert(e);e.checked=true;e.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}};
}
test('Detektivgenerator: sechs Fehlerarten sind falsch und lösbar',()=>{
 const a=boot();let count=0;
 for(const type of ['add','sub','mul','div','expand','reduce'])for(const lvl of [1,2])for(let k=0;k<250;k++){
  const t=a.api.generate(type,lvl);assert.equal(t.type,type);assert(t.answer[1]>0&&t.answer[1]<=36);assert(t.wrong[1]>0&&t.wrong[1]<=36);assert(t.wrong[0]>=0);assert(t.wrong[0]<=t.wholes*t.wrong[1]);assert(t.answer[0]<=t.wholes*t.answer[1]);assert.notEqual(t.wrong[0]*t.answer[1],t.answer[0]*t.wrong[1]);assert.equal(t.choices.length,3);assert.equal(t.choices.filter(c=>c.id==='rule').length,1);assert.equal(new Set(t.choices.map(c=>c.text)).size,3);
  let n,d;if(type==='add'){n=t.a*t.d+t.c*t.b;d=t.b*t.d;}if(type==='sub'){n=t.a*t.d-t.c*t.b;d=t.b*t.d;assert(n>=0);}if(type==='mul'){n=t.a*t.c;d=t.b*t.d;}if(type==='div'){n=t.a*t.d;d=t.b*t.c;assert(t.c>0);}if(type==='expand'){n=t.a*t.factor;d=t.b*t.factor;assert.equal(t.answer[0],n);assert.equal(t.answer[1],d);}if(type==='reduce'){const gcd=(x,y)=>y?gcd(y,x%y):x,g=gcd(t.a,t.b);n=t.a/g;d=t.b/g;assert.equal(t.answer[0],n);assert.equal(t.answer[1],d);}assert.equal(t.answer[0]*d,n*t.answer[1]);count++;
 }
 assert.equal(count,3000);assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Ergebnis und Begründung müssen gemeinsam stimmen; keine Mehrfachwertung',()=>{
 const a=boot(),s=a.api.s,tot=a.api.totals;a.choose('dt-type','add');const t=s.task;
 a.fill('dt-denominator',t.answer[1]*2);a.fill('dt-numerator',t.answer[0]*2);a.reason('wrong-1');a.click('#dt-check');assert.equal(tot.solved,0);assert.equal(tot.attempts,1);assert(!s.done);assert(a.d.querySelector('#dt-feedback').textContent.includes('Bruchbild stimmt'));
 a.click('#dt-check');assert.equal(tot.attempts,1);a.reason('rule');a.click('#dt-check');assert(s.done);assert.equal(tot.solved,1);assert.equal(tot.independent,0);assert.equal(tot.attempts,2);assert.equal(a.d.activeElement.id,'dt-new');assert(a.d.querySelector('.dt-solution'));a.api.check();assert.equal(tot.solved,1);
 assert.equal(JSON.parse(a.dom.window.localStorage.getItem('bruch-detective-v1')).solved,1);assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Unvollständige oder ungültige Antworten zählen nicht',()=>{
 const a=boot(),tot=a.api.totals;a.click('#dt-check');assert.equal(tot.attempts,0);a.fill('dt-denominator',0);a.reason('rule');a.click('#dt-check');assert.equal(tot.attempts,0);assert(a.d.querySelector('#dt-feedback').textContent.includes('Nenner'));
 a.fill('dt-denominator',6);a.fill('dt-numerator','');a.click('#dt-check');assert.equal(tot.attempts,0);assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Erweitern und Kürzen werden exakt geprüft, Tipps und Auflösung sind fair',()=>{
 const a=boot(),s=a.api.s,tot=a.api.totals;
 for(const type of ['expand','reduce']){
  a.choose('dt-type',type);const t=s.task;a.fill('dt-denominator',t.b);a.fill('dt-numerator',t.a);a.reason('rule');a.click('#dt-check');assert(!s.done);
  a.fill('dt-denominator',t.answer[1]);a.fill('dt-numerator',t.answer[0]);a.click('#dt-check');assert(s.done);
 }
 assert.equal(tot.solved,2);a.click('#dt-new');a.click('#dt-tip');const t=s.task;a.fill('dt-denominator',t.answer[1]);a.fill('dt-numerator',t.answer[0]);a.reason('rule');a.click('#dt-check');assert.equal(tot.solved,3);assert.equal(tot.independent,0);
 a.click('#dt-new');const attempts=tot.attempts;a.click('#dt-show');assert(s.revealed);assert(s.done);assert.equal(tot.solved,3);assert.equal(tot.attempts,attempts);assert(!a.d.querySelector('#dt-check'));assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Stückwahl, Tastatur und Reiterwechsel erhalten den Fall',()=>{
 const a=boot(),s=a.api.s;a.fill('dt-denominator',6);a.fill('dt-numerator',1);a.click('#dt-piece-3');assert.equal(s.n,'2');assert.equal(a.d.activeElement.id,'dt-piece-3');a.d.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(s.n,'2');assert.equal(a.d.activeElement.id,'dt-piece-4');const t=s.task;
 a.click('[data-act="tab"][data-op="visual"]');a.click('[data-act="tab"][data-op="detective"]');assert.equal(s.task,t);assert.equal(a.d.querySelector('#dt-numerator').value,'2');assert.equal(a.errors.length,0);a.dom.window.close();
});
test('Direkte Einstiege synchronisieren die URL und erhalten den Grafiktrainer',()=>{
 const a=boot('visual'),vt=a.api.vtS;const t=vt.task;a.choose('vt-mode','detective');assert(a.d.querySelector('#dt-root'));assert.equal(a.dom.window.location.hash,'#detective');assert.equal(vt.task,t);
 a.click('[data-act="tab"][data-op="add"]');a.click('[data-dt="open"]');assert.equal(a.dom.window.location.hash,'#detective');assert.equal(a.d.activeElement.id,'dt-title');assert.equal(a.errors.length,0);a.dom.window.close();
});

test('Ein pausierter Lerncheck bleibt beim Fehlerdetektiv erhalten',()=>{
 const a=boot('visual'),vt=a.api.vtS;a.choose('vt-mode','check');a.click('#vt-start');const run=vt.run,task=vt.task;
 a.click('[data-act="tab"][data-op="add"]');a.click('[data-dt="open"]');assert.equal(vt.run,run);assert.equal(vt.task,task);assert.equal(vt.run.results.length,0);
 a.click('[data-act="tab"][data-op="visual"]');assert.equal(vt.run,run);assert(a.d.querySelector('#vt-mode').disabled);assert(!a.d.querySelector('#vt-tip'));assert.equal(a.errors.length,0);a.dom.window.close();
});
