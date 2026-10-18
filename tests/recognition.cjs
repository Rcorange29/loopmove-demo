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
test('legacy Chinese-only API results display in English, including reported examples',()=>{
 const examples={'嵌入式床头柜':'Built-in bedside cabinet','黑框装饰画':'Black-framed wall art','布艺双人床':'Upholstered double bed','吊扇灯':'Ceiling fan light','双层落地窗帘':'Double-layer floor-length curtains','小型装饰盆栽':'Small decorative potted plant'};
 for(const [name,english] of Object.entries(examples)){
  const it=r.item({name},'en');assert.equal(it.name,english);assert.equal(r.displayName(it,'en'),english);assert.equal(r.displayName(it,'zhHans'),name);assert.ok(!/[\u3400-\u9fff]/.test(r.displayName(it,'en')));
 }
});
test('wrong-language names from backend never override English UI with Chinese',()=>{
 const it=r.item({name:'书桌',names:{en:'书桌'}},'en');assert.equal(it.name,'Desk');
 assert.equal(r.displayName({name:'吊扇灯',names:{}},'en'),'Ceiling fan light');
});
test('unknown translations ask for review rather than inventing names or leaking Chinese',()=>{
 const it=r.item({name:'未识别专业仪器'},'en');assert.equal(it.name,'Item — name needs review');assert.equal(it.nameNeedsReview,true);assert.equal(it.sourceName,'未识别专业仪器');
});
test('fixed fixtures remain fixed after display translation',()=>{
 const it=r.item({name:'嵌入式床头柜'},'en');assert.equal(it.fixed,true);assert.equal(it.name,'Built-in bedside cabinet');
});
