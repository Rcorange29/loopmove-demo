const {test}=require('node:test');
const assert=require('node:assert/strict');
const p=require('../planning.js');
test('manual mode clears all downstream decisions and retains inventory and fixtures',()=>{
 const items=[{id:'desk',name:'Desk',bucket:'day2',plan:'keep',handle:'donate',day:2,ch:'AI',classified:true,aiDisposal:'AI reason',bbox:[1,2,3,4]},{id:'fan',name:'Ceiling fan',fixed:true,bucket:'buy',handle:'sell'}];
 p.resetItems(items);assert.equal(items.length,2);assert.equal(items[0].bucket,'pending');assert.equal(items[1].bucket,'fixed');
 for(const i of items){assert.equal(i.handle,'');assert.equal(i.plan,'');assert.equal(i.classified,false);assert.equal(i.aiDisposal,undefined);assert.equal(i.day,null);assert.equal(i.ch,null);}
 assert.deepEqual(items[0].bbox,[1,2,3,4]);
});
test('AI disposal only targets undecided leave-behind objects',()=>{
 const items=[{id:'a',bucket:'trash'},{id:'b',bucket:'buy',handle:'sell'},{id:'c',bucket:'trash',fixed:true},{id:'d',bucket:'day1'}];
 assert.deepEqual(p.disposalItems(items).map(i=>i.id),['a']);
});
test('disposal suggestions must map every ID once and have an allowed action and reason',()=>{
 const items=[{id:'a'},{id:'b'}],a={id:'a',handle:'sell',reason:'If usable, resell.'},b={id:'b',handle:'donate',reason:'Confirm condition and acceptance.'};
 assert.equal(p.validateDisposal({items:[a,b]},items).length,2);
 for(const data of [{items:[a,a]},{items:[a]},{items:[a,{...b,id:'extra'}]},{items:[a,{...b,handle:'dump'}]},{items:[a,{...b,reason:''}]},{mode:'demo',items:[a,b]}])assert.throws(()=>p.validateDisposal(data,items));
});
test('a change to dates, language or manual item choice invalidates a pending request',()=>{
 const items=[{id:'a',name:'Desk',bucket:'trash'}],dates=['2026-10-19'];const before=p.snapshot(items,dates,'en');
 items[0].handle='donate';assert.notEqual(p.snapshot(items,dates,'en'),before);delete items[0].handle;
 assert.notEqual(p.snapshot(items,['2026-10-20'],'en'),before);assert.notEqual(p.snapshot(items,dates,'zhHant'),before);
});
