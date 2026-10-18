const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const root=process.argv[2]||path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),errors=[],calls=[];
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''),{url:'http://127.0.0.1:8000/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.fetch=async(url,options)=>{const body=options?JSON.parse(options.body):{};calls.push({url,body});if(url.endsWith('/api/arrange'))return {ok:true,json:async()=>({items:body.items.map(i=>({id:i.id,day:1}))})};if(url.endsWith('/api/plan'))return {ok:true,json:async()=>({language:body.language,text:'Move your desk on the selected date.'})};if(url.endsWith('/api/dispose'))return {ok:true,json:async()=>({language:body.language,items:body.items.map(i=>({id:i.id,handle:'donate',reason:'If reusable, confirm donation acceptance.'}))})};return {ok:true,json:async()=>({elements:[]})};};
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

 w.eval("S.items=[{id:'desk',name:'Desk',kind:'大件家具',vol:.3,bucket:'day2',handle:'sell',plan:'rebuy',classified:true},{id:'fan',name:'Ceiling fan',fixed:true,bucket:'fixed'}];chooseArrangement();");
 w.document.getElementById('arrangeManual').click();
 assert.equal(w.eval("S.items[0].bucket"),'pending');assert.equal(w.eval("S.items[0].handle"),'');assert.equal(w.eval("S.items[1].bucket"),'fixed');assert.equal(w.document.getElementById('aiJourneyPlan').hidden,true);assert.equal(w.document.getElementById('packingGuide').hidden,true);assert.equal(calls.filter(c=>c.url.includes('/api/')).length,0);
 w.eval('chooseArrangement()');w.document.getElementById('arrangeSmart').click();
 await new Promise(r=>setTimeout(r,50));
 assert.equal(w.eval('journey.arrangement'),'ai');assert.equal(w.document.getElementById('aiJourneyPlan').hidden,false);assert.ok(w.document.getElementById('aiPlanEditor').value.includes('desk'));
 w.eval("S.items[0].bucket='trash';renderBoard();");await w.eval('generateDisposalPlan()');
 assert.equal(w.eval('S.items[0].handle'),'donate');
 const select=w.document.querySelector('.ai-disposal-row select');select.value='sell';select.dispatchEvent(new w.Event('change'));assert.equal(w.eval('S.items[0].handle'),'sell');
 const editor=w.document.getElementById('aiPlanEditor');editor.value='My edited moving notes';editor.dispatchEvent(new w.Event('input'));assert.ok(w.eval('exportText()').includes('My edited moving notes'));
 w.eval('go(5)');assert.ok(w.document.getElementById('planDays').textContent.includes('My edited moving notes'));assert.equal(w.document.querySelector('.steps button.on').dataset.step,'5');
 w.eval('chooseArrangement()');w.document.getElementById('arrangeManual').click();assert.equal(w.eval('aiDraft.text'),'');assert.equal(w.eval('S.items[0].handle'),'');assert.equal(w.document.getElementById('aiJourneyPlan').hidden,true);assert.ok(!w.eval('exportText()').includes('My edited moving notes'));
 assert.deepEqual(errors,[],'page script errors after flow');
 console.log('PASS: complete DOM flow: navigation, manual reset/no AI, smart plan, disposal suggestions, manual edits, final checklist and TXT, second reset. AI responses mocked, not live inference.');
 dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
