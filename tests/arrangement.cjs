const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../journey.js'),'utf8');
const block=source.slice(source.indexOf('function arrangementItems(){'),source.indexOf('function renderArrangement(){'));
function setup(items,reply,dates=['2026-10-19','2026-10-20']){
 const elements={};const calls=[];
 const c={S:{items},journey:{dates},classifier:{innerHTML:'',close(){}},document:{getElementById(id){return elements[id]??={};}},normalizeItems(){},go(n){c.screen=n;},jl:(s)=>s,bAlert(s){c.alert=s;},itemGroup:i=>i.kind,IS_STATIC:false,API_BASE:'https://test.invalid',AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return typeof reply==='function'?reply():{ok:true,json:async()=>reply};}};
 vm.createContext(c);vm.runInContext(block,c);return {c,elements,calls};
}
const item=(id,extra={})=>({id,name:id,kind:'daily',bucket:'pending',...extra});
test('valid AI plan excludes fixed, buy and disposal items and preserves their choices',async()=>{
 const {c,calls}=setup([item('a'),item('b',{bucket:'buy',plan:'rebuy'}),item('c',{bucket:'trash',handle:'donate'}),item('d',{fixed:true,bucket:'fixed'})],{items:[{id:'a',day:2}]});
 await c.smartArrange();assert.deepEqual(calls[0].items.map(i=>i.id),['a']);assert.equal(c.S.items[0].bucket,'day2');assert.equal(c.S.items[1].bucket,'buy');assert.equal(c.S.items[2].handle,'donate');assert.equal(c.S.items[3].bucket,'fixed');assert.equal(c.journey.arrangement,'ai');assert.equal(c.screen,3);
});
for(const [name,reply] of Object.entries({duplicate:{items:[{id:'a',day:1},{id:'a',day:2}]},missing:{items:[{id:'a',day:1}]},unknown:{items:[{id:'a',day:1},{id:'x',day:1}]},invalidDay:{items:[{id:'a',day:0},{id:'b',day:3}]},demo:{mode:'demo',items:[{id:'a',day:1},{id:'b',day:2}]},malformed:{items:null},error:{error:'failure',items:[{id:'a',day:1},{id:'b',day:2}]}})){
 test(name+' does not overwrite existing plan',async()=>{const {c,elements}=setup([item('a',{bucket:'day1'}),item('b')],reply);await c.smartArrange();assert.equal(c.S.items[0].bucket,'day1');assert.equal(c.S.items[1].bucket,'pending');assert.notEqual(c.journey.arrangement,'ai');assert.equal(typeof elements.retryArrangement.onclick,'function');assert.equal(typeof elements.ruleArrangement.onclick,'function');});
}
test('HTTP failure allows rule fallback with one day and preserves disposal',async()=>{
 const {c,elements}=setup([item('a'),item('b'),item('c',{bucket:'trash',handle:'sell'})],()=>({ok:false}),['2026-10-19']);await c.smartArrange();elements.ruleArrangement.onclick();assert.equal(c.journey.arrangement,'demo');assert.deepEqual(c.S.items.map(i=>i.bucket),['day1','day1','trash']);
});
test('empty moving inventory never claims AI or calls backend',async()=>{const {c,calls}=setup([item('x',{fixed:true})],{});await c.smartArrange();assert.equal(calls.length,0);assert.equal(c.journey.arrangement,'manual');});
test('cancel ignores late successful response',async()=>{let resolve;const {c,elements}=setup([item('a')],()=>new Promise(r=>resolve=r));const pending=c.smartArrange();elements.cancelArrangement.onclick();resolve({ok:true,json:async()=>({items:[{id:'a',day:1}]})});await pending;assert.equal(c.S.items[0].bucket,'pending');assert.notEqual(c.journey.arrangement,'ai');});
test('inventory changed in flight cannot receive stale results',async()=>{let resolve;const {c}=setup([item('a')],()=>new Promise(r=>resolve=r));const pending=c.smartArrange();c.S.items[0].bucket='trash';resolve({ok:true,json:async()=>({items:[{id:'a',day:1}]})});await pending;assert.equal(c.S.items[0].bucket,'trash');assert.notEqual(c.journey.arrangement,'ai');});
test('network timeout can retry successfully without losing inventory',async()=>{
 const {c,elements}=setup([item('a')],()=>{throw new Error('Timeout');});await c.smartArrange();assert.equal(c.S.items[0].bucket,'pending');c.fetch=async()=>({ok:true,json:async()=>({items:[{id:'a',day:1}]})});await elements.retryArrangement.onclick();assert.equal(c.journey.arrangement,'ai');assert.equal(c.S.items[0].bucket,'day1');
});
test('manual day changes are reflected by checklist export',async()=>{
 const {c}=setup([item('a')],{items:[{id:'a',day:1}]});
 Object.assign(c,{nm:i=>i.name,slotName:s=>s,timelineSlots:()=>['day1','day2'],packingFor:()=>[],renderBoard(){},T:s=>s,document:{getElementById:()=>({value:'2026-10-19'})}});
 vm.runInContext(source.slice(source.indexOf('function moveItem('),source.indexOf('const ITEM_COLORS=')),c);
 vm.runInContext(source.slice(source.indexOf('function exportText(){'),source.indexOf('function downloadList(){')),c);
 c.S.items[0].bucket='day1';c.moveItem(c.S.items[0],'day2');const output=c.exportText();assert.ok(output.indexOf('• a')>output.indexOf('day2'));assert.equal(output.split('• a').length-1,1);
});
