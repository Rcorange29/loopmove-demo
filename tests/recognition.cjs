const {test}=require('node:test');
const assert=require('node:assert/strict');
const r=require('../recognition.js');
test('only genuine valid coordinates produce boxes',()=>{
 for(const b of [null,undefined,[],[0,0,0,10],[90,0,20,30],[-1,0,10,10],[0,0,101,50],[0,0,'50',50],[NaN,0,50,50]])assert.equal(r.bbox(b),null);
 assert.deepEqual(r.bbox([10,20,80,90]),[10,20,80,90]);
 assert.deepEqual(r.bbox([100,200,800,900],'xyxy_1000'),[10,20,80,90]);
 assert.deepEqual(r.bbox([.1,.2,.8,.9],'xyxy_normalized'),[10,20,80,90]);
 assert.equal(r.bbox([100,200,800,900]),null);
});
test('API language follows the selected UI language',()=>{
 assert.equal(r.language('en'),'en');assert.equal(r.language('zhHant'),'zh-Hant');assert.equal(r.language('zhHans'),'zh-Hans');
});
test('multilingual output is displayed in selected language',()=>{
 const raw={name:'床',names:{en:'Bed','zh-Hans':'床','zh-Hant':'床'},vol:'0.6',bbox:[10,20,80,90]};
 const it=r.item(raw,'en','xyxy_percent');assert.equal(it.name,'Bed');assert.equal(it.vol,.6);assert.equal(r.displayName(it,'zhHans'),'床');
 it.name='My bed';it.nameEdited=true;assert.equal(r.displayName(it,'zhHans'),'My bed');
});
test('installed fixtures are retained, movable furniture stays movable',()=>{
 for(const name of ['吊扇','Ceiling fan','Window','Built-in cabinet','Wall-mounted air conditioner'])assert.equal(r.item({name},'en').fixed,true,name);
 for(const name of ['Double bed','Desk fan','Wardrobe','Office chair'])assert.equal(r.item({name},'en').fixed,false,name);
 assert.equal(r.item({name:'Ventilation unit',fixed:true},'en').fixed,true);
});
test('missing boxes stay missing and malformed items are ignored',()=>{
 assert.equal(r.item({name:'Desk'},'en').bbox,null);assert.equal(r.item(null,'en'),null);assert.equal(r.item({name:''},'en'),null);
});
