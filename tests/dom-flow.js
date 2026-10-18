const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const root=process.argv[2]||path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),errors=[],calls=[];
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''),{url:'http://127.0.0.1:8000/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.scrollTo=()=>{};w.AbortSignal.timeout=()=>new w.AbortController().signal;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.fetch=async(url,options)=>{const body=options?.body?JSON.parse(options.body):{};calls.push({url,body});if(url.endsWith('/api/arrange'))return {ok:true,json:async()=>({items:body.items.map(i=>({id:i.id,day:1}))})};if(url.endsWith('/api/plan'))return {ok:true,json:async()=>({language:body.language,text:'Move your desk on the selected date.'})};if(url.endsWith('/api/dispose'))return {ok:true,json:async()=>({language:body.language,items:body.items.map(i=>({id:i.id,handle:'donate',reason:'If reusable, confirm donation acceptance.'}))})};return {ok:true,json:async()=>({elements:[]})};};
}});
const w=dom.window;
function inject(text){const script=w.document.createElement('script');script.textContent=text;w.document.body.append(script);}
for(const file of ['config.js','recognition.js','planning.js'])inject(fs.readFileSync(path.join(root,file),'utf8'));
for(const text of scripts)inject(text);
inject(fs.readFileSync(path.join(root,'journey.js'),'utf8'));
(async()=>{
 assert.deepEqual(errors,[],'initial page script errors');
 assert.equal(w.document.querySelector('.steps button:last-child').textContent,'Moving checklist');
 w.eval("go(2);S.items=[];['嵌入式床头柜','黑框装饰画','布艺双人床','吊扇灯','双层落地窗帘','小型装饰盆栽'].forEach(name=>{const i=LoopMoveRecognition.item({name},'en');addItem(i.name,null,i);});renderRecognized('assets/images/example-room.png',S.items);");
 for(const el of w.document.querySelectorAll('#itemList .item-name,.unlocated-items button'))assert.ok(!/[\u3400-\u9fff]/.test(el.textContent),'English inventory and photo labels');
 assert.ok(w.document.getElementById('itemList').textContent.includes('Ceiling fan light'));
 w.eval("LANG='zhHans';applyLang();rerenderAll();");assert.ok(w.document.getElementById('itemList').textContent.includes('吊扇灯'));
 w.eval("LANG='en';applyLang();rerenderAll();");assert.ok(w.document.getElementById('itemList').textContent.includes('Ceiling fan light'));

 w.eval("S.items=[{id:'desk',name:'Desk',kind:'大件家具',vol:.3,bucket:'day2',handle:'sell',plan:'rebuy',classified:true},{id:'books',name:'Books',kind:'电子',vol:.02,bucket:'day1'},{id:'fan',name:'Ceiling fan',fixed:true,bucket:'fixed'}];chooseArrangement();");
 w.document.getElementById('arrangeManual').click();
 assert.equal(w.eval("S.items[0].bucket"),'pending');assert.equal(w.eval("S.items[0].handle"),'');assert.equal(w.eval("S.items[2].bucket"),'fixed');assert.equal(w.document.getElementById('aiJourneyPlan'),null);assert.equal(w.document.querySelectorAll('.packing-card').length,5);assert.equal(calls.filter(c=>c.url.startsWith('https://loopmove-ai-api.onrender.com/api/')).length,0);
 w.eval('chooseArrangement()');w.document.getElementById('arrangeSmart').click();await new Promise(r=>setTimeout(r,30));
 assert.equal(w.eval('journey.arrangement'),'ai');assert.equal(w.document.getElementById('aiJourneyPlan'),null);assert.equal(calls.filter(c=>c.url.endsWith('/api/plan')).length,0);assert.equal(w.document.querySelectorAll('.disposal-bin').length,3);
 assert.equal(w.eval("assignDisposal(S.items[0],'sell')"),false,'must enter Leave behind first');
 function drop(id,selector){const e=new w.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(e,'dataTransfer',{value:{getData:()=>id}});w.document.querySelector(selector).dispatchEvent(e);}
 drop('desk','.leave-group[data-col="trash"] > .slots');drop('books','.leave-group[data-col="trash"] > .slots');
 assert.equal(w.eval('S.items[0].bucket'),'trash');assert.equal(w.document.querySelectorAll('.leave-group[data-col="trash"] > .slots .item').length,2);
 drop('desk','[data-disposal="sell"] .slots');assert.equal(w.eval('S.items[0].handle'),'sell');assert.equal(w.eval('journey.mapMode'),'dispose');assert.equal(w.eval('disposalAction()'),'sell');
 drop('books','[data-disposal="sell"] .slots');assert.equal(w.document.querySelectorAll('[data-disposal="sell"] .item').length,2,'multiple items per bin');
 assert.equal(w.document.querySelectorAll('.leave-group[data-col="trash"] > .slots .item').length,0);
 drop('desk','[data-disposal="donate"] .slots');assert.equal(w.eval('S.items[0].handle'),'donate');assert.equal(w.eval('disposalAction()'),'donate');
 drop('books','[data-disposal="recycle"] .slots');assert.equal(w.eval('S.items[1].handle'),'recycle');assert.equal(w.eval('disposalAction()'),'recycle');
 drop('desk','.leave-group[data-col="trash"] > .slots');assert.equal(w.eval('S.items[0].handle'),'');
 await w.eval('generateDisposalPlan()');assert.equal(w.eval('S.items[0].handle'),'donate');
 drop('books','.day-column[data-col="day1"] .slots');assert.equal(w.eval('S.items[1].handle'),'');assert.equal(w.eval('S.items[1].bucket'),'day1');
 w.eval('go(5)');assert.equal(w.document.querySelector('.steps button.on').dataset.step,'5');
 const check=w.document.querySelector('input[data-item-id="books"]');check.checked=true;check.dispatchEvent(new w.Event('change'));assert.equal(w.eval('S.items[1].completed'),true);assert.ok(w.eval('exportText()').includes('Books [✓]'));
 w.eval('go(3);go(5)');assert.equal(w.document.querySelector('input[data-item-id="books"]').checked,true,'completion retained across pages');assert.ok(w.document.querySelector('.checklist-progress').textContent.includes('1 / 1'));
 w.eval('chooseArrangement()');w.document.getElementById('arrangeManual').click();assert.equal(w.eval('S.items[1].completed'),false);assert.equal(w.eval('S.items[0].handle'),'');assert.equal(w.document.getElementById('aiJourneyPlan'),null);
 await new Promise(r=>setTimeout(r,20));assert.ok(calls.some(c=>decodeURIComponent(c.url).includes('shop=second_hand')));assert.ok(calls.some(c=>decodeURIComponent(c.url).includes('shop=charity')));assert.ok(calls.some(c=>decodeURIComponent(c.url).includes('amenity=recycling')));
 assert.deepEqual(errors,[],'page script errors after flow');
 console.log('PASS: language, manual reset, no AI-plan block, five packing references, staged disposal drag/drop, multiple items and reassignment, map queries by action, checkable checklist and TXT. AI/map responses mocked.');
 dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
