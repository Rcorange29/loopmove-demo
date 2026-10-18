/* Simplified journey: explicit dates, movable cards, fixed fixtures and linked shopping. */
const jl=(hans,en,hant=hans)=>LANG==='en'?en:LANG==='zhHant'?hant:hans;
const journey={filter:'all',mapCat:null,selected:null,dates:['2027-09-01','2027-09-02'],classified:false,mapMode:'all',arrangement:null,edited:false};
DAY_LOCS.yln=DAY_LOCS.syl;DAY_LOCS.st=DAY_LOCS.stt;
const FIXTURE=/吊扇|ceiling fan|ceiling light|wall.mounted air conditioner|窗户|窗戶|窗框|墙体|牆體|内置|內置|嵌入式柜|嵌入式櫃|固定橱柜|固定櫥櫃|墙上搁板|牆上擱板|window|built.in|wall.mounted shelf|^门$|^門$|^door$/i;
function normalizeItems(){
 S.trips=journey.dates.length;
 S.items.forEach(it=>{
  if(it.handle==='stay')it.handle='';
  if(it.fixedOverride===true||(it.fixedOverride!==false&&(it.fixed||FIXTURE.test(it._key||it.name)))){it.fixed=true;it.bucket='fixed';it.plan='';it.handle='';}
  else if(it.bucket==='fixed')it.bucket='day1';
  if(/^day/.test(it.bucket)&&+it.bucket.slice(3)>S.trips)it.bucket='day'+S.trips;
 });
}
function category(it){
 const name=(it.kind||'')+' '+(it._key||it.name);
 if(/家具|床品|装饰|裝飾|床|桌|椅|枕|被|窗帘|窗簾|沙发|沙發|rug|desk|chair|bed|pillow|curtain/i.test(name))return 'furniture';
 if(/玩具|文具|toy|stationery/i.test(name))return 'toys';
 if(/食物|食品|蔬|水果|food/i.test(name))return 'market';
 if(/洗漱|清洁|清潔|牙刷|soap/i.test(name))return 'convenience';
 return 'mall';
}
function matchesFacility(f){return journey.mapMode!=='dispose'&&(!journey.mapCat||f.cat===journey.mapCat);}
function refreshMap(){
 renderLegend();renderShopMatches();
 if(_gmap)renderGMap();else if(_map){renderMap();_map.invalidateSize();}
}
function focusShopping(it){journey.selected=it.id;journey.mapCat=category(it);_mv=null;_gmv=null;renderBoard();refreshMap();}
renderLegend=function(){
 const lg=document.getElementById('mapLegend');lg.replaceChildren();
 [['all',null],...Object.entries(MAP_CATS)].forEach(([k,c])=>{
  const b=document.createElement('button');b.className='lg'+((journey.mapCat===k||(!journey.mapCat&&k==='all'))?' on':'');
  b.innerHTML=c?`<i style="background:${c.color}"></i>${c.icon} ${esc(T(c.k))}`:jl('全部','All','全部');
  b.setAttribute('aria-pressed',String(c?journey.mapCat===k:!journey.mapCat));
  b.onclick=()=>{journey.mapCat=c?k:null;journey.selected=null;_mv=null;_gmv=null;refreshMap();renderBoard();};lg.append(b);
 });
};
function renderShopMatches(){
 const cfg=DAY_LOCS[S.dest?.id]||DAY_LOCS.hsk;
 const item=S.items.find(i=>i.id===journey.selected);
 const out=document.getElementById('shopMatches');
 out.innerHTML='<b>'+esc(item?nm(item)+' → '+jl('购买地点','Places to buy','購買地點'):jl('附近购买地点','Nearby shops','附近購買地點'))+'</b>';
 cfg.facilities.filter(matchesFacility).forEach(f=>{
  const c=MAP_CATS[f.cat];const a=document.createElement('a');a.className='shop-result';a.target='_blank';a.rel='noopener';a.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(t3(f.name)+' '+t3(f.addr));a.textContent=c.icon+' '+t3(f.name)+' ↗';out.append(a);
 });
 out.insertAdjacentHTML('beforeend','<p class="map-note">'+jl('演示地点 · 库存请向商家确认','Demo locations · Check stock with the shop','示範地點 · 庫存請向商家確認')+'</p>');
}
function dateAt(offset){const d=new Date(document.getElementById('f-date').value+'T12:00:00');if(Number.isNaN(d.getTime()))return '';d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function timelineSlots(){return journey.dates.map((_,i)=>'day'+(i+1)).sort((a,b)=>slotName(a).localeCompare(slotName(b)));}
function slotName(slot){if(slot==='pending')return jl('待安排','To schedule','待安排');if(slot==='fixed')return jl('⚠️ 固定设施 · 留在原处','⚠️ Fixed · stays here','⚠️ 固定設施 · 留在原處');if(slot==='buy')return jl('当地购买','Buy locally','當地購買');if(slot==='trash')return jl('不带走','Leave behind','不帶走');return journey.dates[+slot.slice(3)-1]||jl('待安排','Unscheduled','待安排');}
function moveItem(it,slot){if(it.fixed)return;if(it.bucket!==slot)it.completed=false;it.bucket=slot;it.plan=slot==='buy'?'rebuy':'';it.handle='';delete it.aiDisposal;journey.edited=true;renderBoard();if(['buy','trash'].includes(slot)){selectMapFor(it);refreshMap();}}
const ITEM_COLORS={furniture:['#1c5a3c','#e1eee5'],bedding:['#8056aa','#eee4f7'],electronics:['#2963a5','#e1ecfa'],daily:['#a76e12','#fff0ce'],decor:['#aa5369','#fae4eb']};
function itemGroup(it){
 if(it.group&&ITEM_COLORS[it.group])return it.group;
 const n=(it.kind||'')+' '+(it._key||it.name);
 if(/枕|被|床品|pillow|quilt|bedding/i.test(n))return 'bedding';
 if(/电脑|電腦|电子|電子|手机|手機|laptop|phone/i.test(n))return 'electronics';
 if(/装饰|裝飾|绿植|綠植|画|畫|plant|art|rug/i.test(n))return 'decor';
 if(/家具|床架|桌|椅|柜|櫃|desk|chair|bed frame/i.test(n))return 'furniture';
 return 'daily';
}
function card(it,editable=false){
 const c=document.createElement('button');const colors=ITEM_COLORS[itemGroup(it)];c.type='button';c.className='item'+(it.fixed?' fixed':'')+(journey.selected===it.id?' selected':'');c.style.setProperty('--category',colors[0]);c.style.setProperty('--tint',colors[1]);c.dataset.id=it.id;c.draggable=!it.fixed;
 const itemName=document.createElement('span');itemName.className='item-name';itemName.textContent=(it.fixed?'⚠️ ':'')+nm(it);c.append(itemName);if(!editable&&['buy','trash'].includes(it.bucket)){const badge=document.createElement('span');badge.className='place-emoji';badge.textContent=it.bucket==='buy'?MAP_CATS[category(it)].icon:'♻️';badge.title=it.bucket==='buy'?T(MAP_CATS[category(it)].k):jl('处理地点','Disposal locations','處理地點');c.append(badge);}
 c.onclick=()=>editable||it.fixed?openEditor(it):openItemDetails(it);
 c.addEventListener('dragstart',e=>{if(it.fixed){e.preventDefault();return;}e.dataTransfer.setData('text',it.id);e.dataTransfer.effectAllowed='move';});
 c.addEventListener('keydown',e=>{if(editable||it.fixed)return;const n=Number(e.key);if(n>=1&&n<=journey.dates.length){e.preventDefault();moveItem(it,'day'+n);}if(e.key==='Delete'){e.preventDefault();moveItem(it,'trash');}});
 return c;
}
renderItems=function(){normalizeItems();const list=document.getElementById('itemList');list.replaceChildren();S.items.forEach(it=>list.append(card(it,true)));document.querySelectorAll('.anno').forEach(a=>{const b=a.querySelector('b');if(b&&FIXTURE.test(b.textContent)&&!b.textContent.startsWith('⚠️'))b.textContent='⚠️ '+b.textContent;});};
function renderTools(){
 const t=document.getElementById('timelineTools');t.replaceChildren();
 const add=document.createElement('button');add.className='filter-chip';add.textContent=jl('＋ 日期','＋ Date','＋ 日期');add.onclick=()=>{const last=new Date([...journey.dates].sort().at(-1)+'T12:00:00');last.setDate(last.getDate()+1);journey.dates.push(last.getFullYear()+'-'+String(last.getMonth()+1).padStart(2,'0')+'-'+String(last.getDate()).padStart(2,'0'));renderBoard();};t.append(add);
 const exportButton=document.createElement('button');exportButton.className='primary';exportButton.id='exportTxt';exportButton.textContent=jl('↓ 导出清单 TXT','↓ Export TXT','↓ 匯出清單 TXT');exportButton.onclick=downloadList;t.append(exportButton);
 const legend=document.createElement('div');legend.className='color-key';
 const labels=LANG==='en'?['Furniture','Bedding','Electronics','Daily items','Decor']:LANG==='zhHant'?['家具','床品','電子','日用','裝飾']:['家具','床品','电子','日用','装饰'];
 Object.entries(ITEM_COLORS).forEach(([key,colors],i)=>{const span=document.createElement('span');span.innerHTML='<i style="background:'+colors[1]+';border-color:'+colors[0]+'"></i>'+labels[i];legend.append(span);});t.append(legend);
}
function itemSlot(slot){
 const body=document.createElement('div');body.className='slots';body.dataset.col=slot;
 const items=S.items.filter(i=>i.bucket===slot&&(!['buy','trash'].includes(slot)||!i.handle));items.forEach(it=>body.append(card(it)));
 if(!items.length){const e=document.createElement('span');e.className='empty-slot';e.textContent=jl('拖到这里','Drop here','拖到這裡');body.append(e);}return body;
}
renderBoard=function(){
 normalizeItems();renderTools();renderArrangement();const board=document.getElementById('board');board.replaceChildren();board.style.setProperty('--days',journey.dates.length);const pending=S.items.filter(i=>i.bucket==='pending');let tray=document.getElementById('pendingItems');if(tray)tray.remove();if(pending.length){tray=document.createElement('section');tray.id='pendingItems';tray.innerHTML='<h3>'+jl('待安排','To schedule','待安排')+'</h3>';tray.append(itemSlot('pending'));document.getElementById('board').before(tray);}
 timelineSlots().forEach(slot=>{
  const col=document.createElement('section');col.className='col day-column';col.dataset.col=slot;
  const h=document.createElement('h3');const index=+slot.slice(3)-1;const input=document.createElement('input');input.type='date';input.value=journey.dates[index];input.setAttribute('aria-label',jl('修改日期','Change date','修改日期'));input.onchange=()=>{if(input.value){journey.dates[index]=input.value;renderBoard();}};h.append(input);
  if(journey.dates.length>1){const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label',jl('删除日期','Remove date','刪除日期'));del.onclick=()=>{journey.dates.splice(index,1);S.items.forEach(it=>{if(it.bucket===slot)it.bucket='day1';else if(/^day/.test(it.bucket)&&+it.bucket.slice(3)>index+1)it.bucket='day'+(+it.bucket.slice(3)-1);});renderBoard();};h.append(del);}
  col.append(h,itemSlot(slot));board.append(col);
 });
 const leave=document.createElement('section');leave.className='col leave-column';leave.dataset.col='trash';leave.innerHTML='<h3>♻️ '+slotName('trash')+'</h3>';const mapButton=document.createElement('button');mapButton.className='map-shortcut';mapButton.textContent='🗺️';mapButton.setAttribute('aria-label',jl('查看处理地图','Disposal map','查看處理地圖'));mapButton.onclick=()=>openServiceMap('dispose');leave.querySelector('h3').append(mapButton);
 ['buy','trash'].forEach(slot=>{const group=document.createElement('section');group.className='leave-group';group.dataset.col=slot;const h=document.createElement('h4');h.textContent=slot==='buy'?slotName('buy'):jl('处理','Disposal','處理');group.append(h,itemSlot(slot));if(slot==='trash')group.append(disposalBins());leave.append(group);});
 const fixed=S.items.filter(i=>i.fixed);if(fixed.length){const row=document.createElement('div');row.className='fixed-strip';fixed.forEach(it=>row.append(card(it)));leave.append(row);}
 board.append(leave);renderPacking();if(typeof mapDock!=='undefined')restoreMap();
};
function assignDisposal(it,handle){
 if(!it||it.fixed||!['buy','trash'].includes(it.bucket)||!['sell','donate','recycle'].includes(handle))return false;
 if(it.handle!==handle)it.completed=false;
 it.handle=handle;delete it.aiDisposal;journey.edited=true;selectMapFor(it);renderBoard();refreshMap();return true;
}
function disposalBins(){
 const grid=document.createElement('div');grid.className='disposal-bins';
 [['sell',jl('转卖','Resell','轉賣')],['donate',jl('捐赠','Donate','捐贈')],['recycle',jl('回收','Recycle','回收')]].forEach(([handle,title])=>{
  const bin=document.createElement('section');bin.className='disposal-bin';bin.dataset.disposal=handle;bin.setAttribute('aria-label',title);
  const items=S.items.filter(i=>!i.fixed&&['buy','trash'].includes(i.bucket)&&i.handle===handle);
  const heading=document.createElement('h5');heading.textContent=title+' · '+items.length;bin.append(heading);
  const body=document.createElement('div');body.className='slots';items.forEach(it=>body.append(card(it)));if(!items.length){const hint=document.createElement('span');hint.className='empty-slot';hint.textContent=jl('拖到这里','Drop here','拖到這裡');body.append(hint);}bin.append(body);
  bin.addEventListener('dragover',e=>{e.preventDefault();bin.classList.add('drop');});bin.addEventListener('dragleave',e=>{if(!bin.contains(e.relatedTarget))bin.classList.remove('drop');});grid.append(bin);
 });return grid;
}
// Route nested disposal drops before the legacy board handler.
document.getElementById('board').addEventListener('drop',e=>{
 e.preventDefault();e.stopImmediatePropagation();const it=S.items.find(i=>i.id===e.dataTransfer.getData('text'));if(!it||it.fixed)return;
 const bin=e.target.closest('[data-disposal]');if(bin){bin.classList.remove('drop');if(!assignDisposal(it,bin.dataset.disposal))bAlert(jl('先把物品拖到不带走区域，再选择处理方式。','Move the item to Leave behind first, then choose a disposal option.','先把物品拖到不帶走區域，再選擇處理方式。'));return;}
 const col=e.target.closest('[data-col]');if(col&&col.dataset.col!=='fixed'){col.classList.remove('drop');moveItem(it,col.dataset.col);}
},true);
renderModal=function(){
 normalizeItems();const list=document.getElementById('dispList');list.replaceChildren();const items=S.items.filter(i=>['trash','buy'].includes(i.bucket));
 if(!items.length){list.textContent=jl('没有需要处理的物品','Nothing to handle','沒有需要處理的物品');return;}
 const actions=[['sell',jl('转卖','Sell','轉賣')],['donate',jl('捐赠','Donate','捐贈')],['recycle',jl('回收','Recycle','回收')]];
 [['',jl('待选择','Choose an action','待選擇')],...actions].forEach(([key,title])=>{
  const groupItems=items.filter(i=>(i.handle||'')===key);if(!key&&!groupItems.length)return;
  const group=document.createElement('section');group.className='disposal-group';group.dataset.handle=key;const h=document.createElement('h3');h.textContent=title+' · '+groupItems.length;group.append(h);
  const cards=document.createElement('div');cards.className='disposal-cards';
  groupItems.forEach(it=>{const c=document.createElement('article');c.className='disposal-card';const colors=ITEM_COLORS[itemGroup(it)];c.style.setProperty('--tint',colors[1]);c.style.setProperty('--category',colors[0]);const name=document.createElement('b');name.textContent=nm(it);c.append(name);const buttons=document.createElement('div');buttons.className='disposal-actions';
   actions.forEach(([value,label])=>{const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-label',nm(it)+' · '+label);button.setAttribute('aria-pressed',String(it.handle===value));button.onclick=()=>{assignDisposal(it,value);renderModal();};buttons.append(button);});c.append(buttons);cards.append(c);});group.append(cards);
  if(key&&groupItems.length){group.append(disposalLinks({...groupItems[0],handle:key}));const map=document.createElement('button');map.className='group-map';map.textContent='🗺️ '+jl('查看地点','View locations','查看地點');map.onclick=()=>openServiceMap('dispose');group.append(map);}
  list.append(group);
 });
};
renderPlan=function(){
 normalizeItems();
 document.getElementById('planMeta').textContent=(S.dest?T('d_'+S.dest.id):jl('尚未选择目的地','No destination selected','尚未選擇目的地'))+' · '+jl('可返回调整，或下载随身查看','Adjust your plan or download it to take along','可返回調整，或下載隨身查看');
 const moving=S.items.filter(i=>/^day/.test(i.bucket));
 const unresolved=S.items.filter(i=>i.bucket==='pending'||(['buy','trash'].includes(i.bucket)&&!i.handle));
 document.getElementById('kpis').replaceChildren();
 [[moving.length,jl('带走物品','Items to move','帶走物品')],[S.items.filter(i=>['buy','trash'].includes(i.bucket)).length,jl('不带走物品','Leave behind','不帶走物品')],[unresolved.length,jl('待完善事项','Decisions remaining','待完善事項')]].forEach(([value,label])=>{const el=document.createElement('div');el.className='kpi';const b=document.createElement('b');b.textContent=value;const span=document.createElement('span');span.textContent=label;el.append(b,span);document.getElementById('kpis').append(el);});
 const days=document.getElementById('planDays');days.replaceChildren();
 [...timelineSlots(),'pending','buy','trash','fixed'].forEach(slot=>{
  const items=S.items.filter(i=>i.bucket===slot);if(!items.length)return;
  const section=document.createElement('section');section.className='plan-day';const h=document.createElement('h3');h.textContent=slotName(slot)+' · '+items.length;section.append(h);
  items.forEach(it=>{
   const row=document.createElement('label');row.className='checklist-item'+(it.completed?' is-complete':'');
   const check=document.createElement('input');check.type='checkbox';check.checked=!!it.completed;check.dataset.itemId=it.id;check.disabled=it.fixed||slot==='pending'||(['buy','trash'].includes(slot)&&!it.handle);check.setAttribute('aria-label',jl('标记已完成：','Mark complete: ','標記已完成：')+nm(it));
   const text=document.createElement('span');text.textContent=nm(it)+(['buy','trash'].includes(slot)?' → '+handleLabel(it.handle):'');
   check.onchange=()=>{it.completed=check.checked;renderPlan();};row.append(check,text);section.append(row);
  });
  const actionable=items.filter(i=>!i.fixed);if(actionable.length){const progress=document.createElement('p');progress.className='checklist-progress';progress.textContent=actionable.filter(i=>i.completed).length+' / '+actionable.length+' '+jl('已完成','completed','已完成');h.after(progress);}
  if(journey.arrangement!=='manual'&&/^day/.test(slot))packingFor(items).forEach(line=>{const p=document.createElement('p');p.className='map-note';p.textContent=line;section.append(p);});
  days.append(section);
 });
 if(!S.items.length)days.textContent=jl('还没有物品，请先整理房间物品。','Add items to build your checklist.','還沒有物品，請先整理房間物品。');
};
function handleLabel(handle){return ({sell:jl('转卖','Sell','轉賣'),donate:jl('捐赠','Donate','捐贈'),recycle:jl('回收','Recycle','回收')})[handle]||jl('待选择处理方式','Handling to be decided','待選擇處理方式');}

const baseGo=go;
go=function(n){normalizeItems();baseGo(n);document.querySelectorAll('.steps [data-step]').forEach(b=>{b.classList.toggle('on',+b.dataset.step===(n===4?3:n));if(+b.dataset.step===(n===4?3:n))b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});document.title='LoopMove · '+T('nav'+n);if(n===2)renderItems();};
function compactLabels(){
 const names=LANG==='en'?['Move details','Room inventory','Compare move options','Decide item destinations','Moving checklist']:LANG==='zhHant'?['設定搬家資訊','整理房間物品','對比搬運方案','安排物品去向','搬家行動清單']:['设置搬家信息','整理房间物品','对比搬运方案','安排物品去向','搬家行动清单'];
 names.forEach((label,i)=>{I18N[LANG]['nav'+(i+1)]=label;document.querySelector('#s'+(i+1)+' h1').textContent=label;});
 Object.assign(I18N[LANG],{s1cta:names[1]+' →',s2to3:names[2]+' →',s3to4:names[3]+' →',s4to5:jl('查看搬家清单 →','View moving checklist →','查看搬家清單 →'),s3back:'← '+names[1],s4back:'← '+names[2],s5back:'← '+names[2],s2example:jl('使用示例房间','Use sample room','使用示範房間'),mapTitle:jl('附近购买','Shop nearby','附近購買'),mapHint:jl('颜色与物品分类对应','Colors match item categories','顏色與物品分類對應'),s5trashh3:jl('物品处理','Disposal','物品處理')});
}
const baseApplyLang=applyLang;applyLang=function(){compactLabels();baseApplyLang();const step=document.querySelector('.screen.on')?.id.slice(1)||'1';document.title='LoopMove · '+T('nav'+step);};
document.querySelectorAll('.steps [data-step]').forEach(b=>b.onclick=()=>go(+b.dataset.step));
document.getElementById('to2').onclick=()=>go(2);
document.getElementById('to3').onclick=chooseArrangement;
document.getElementById('to5').onclick=()=>go(5);
document.getElementById('f-date').addEventListener('change',()=>{if(document.getElementById('f-date').value)journey.dates=journey.dates.map((_,i)=>dateAt(i));});
const baseBuildDest=buildDest;buildDest=function(){baseBuildDest();document.querySelectorAll('#destGrid .dest').forEach((b,i)=>{b.classList.toggle('sel',DESTS[i].id===S.dest?.id);b.addEventListener('click',()=>{_mv=null;_gmv=null;});});};
const fixtureField=document.createElement('label');fixtureField.className='fixture-field';
const fixtureCheck=document.createElement('input');fixtureCheck.type='checkbox';fixtureCheck.id='fixtureCheck';fixtureField.append(fixtureCheck,document.createTextNode(' ⚠️ '+jl('固定设施 · 留在原处','Fixed fixture · stays here','固定設施 · 留在原處')));document.getElementById('ieName').parentElement.after(fixtureField);
const baseEditor=openEditor;openEditor=function(it){baseEditor(it);fixtureCheck.checked=!!it.fixed;};
const baseSave=document.getElementById('ieSave').onclick;document.getElementById('ieSave').onclick=()=>{if(ieCurrent){ieCurrent.group=null;ieCurrent.classified=false;ieCurrent._key=null;ieCurrent.fixed=fixtureCheck.checked;ieCurrent.fixedOverride=fixtureCheck.checked;}baseSave();if(document.getElementById('s3').classList.contains('on'))renderBoard();};
applyLang();buildDest();go(1);

popupHtml=function(f,c){return '<b>'+esc(t3(f.name))+'</b><p>'+c.icon+' '+esc(T(c.k))+'</p><small>'+esc(t3(f.addr))+'</small>';};
let mapPending=false;
ensureMap=function(){if(document.getElementById('mapCard').hidden)return;if(_gmap){renderGMap();return;}if(_map){renderMap();_map.invalidateSize();return;}if(mapPending)return;mapPending=true;loadLeaflet(()=>{if(!_map)initLeaflet(DAY_LOCS[S.dest?.id]||DAY_LOCS.hsk);mapPending=false;});};

// Keep the checklist as the last top-level step; disposal is entered from the board.
document.querySelector('[data-step="4"]').remove();
document.getElementById('s5').hidden=false;
const drawer=document.createElement('dialog');drawer.id='itemDrawer';drawer.innerHTML='<div class="drawer-heading"><h2 id="detailTitle"></h2><button id="closeDetails" aria-label="Close">×</button></div><div id="detailActions"></div><div id="detailBody"></div>';
document.body.append(drawer);document.getElementById('closeDetails').onclick=()=>{drawer.close();restoreMap();};drawer.addEventListener('close',restoreMap);
const mapCard=document.getElementById('mapCard');mapCard.hidden=false;
function showDialog(el){if(el.showModal)el.showModal();else el.setAttribute('open','');}
function disposalLinks(it){
 const box=document.createElement('div');box.className='station-links';
 const types=it.handle==='sell'?['Carousell','闲鱼']:it.handle==='donate'?['救世军物资捐赠']:it.handle==='stay'?[]:[/电|電|冰箱|洗衣/.test(it.kind+' '+it.name)?'欧绿保 WEEE':'绿在区区'];
 CHANNELS.filter(c=>types.includes(c.name)).forEach(c=>{const a=document.createElement('a');a.href=c.url;a.target='_blank';a.rel='noopener';a.textContent=(LANG==='en'?({'救世军物资捐赠':'Salvation Army donations','绿在区区':'GREEN@COMMUNITY','闲鱼':'Xianyu','欧绿保 WEEE':'ALBA WEEE'}[c.name]||c.name):c.name)+' ↗';box.append(a);});
 if(types.length){const note=document.createElement('small');note.textContent=jl('服务入口 · 站点与收件条件请确认','Service directory · Confirm location and accepted items','服務入口 · 請確認站點及收件條件');box.append(note);}return box;
}
function openItemDetails(it){
 journey.selected=it.id;document.getElementById('detailTitle').textContent=nm(it);const actions=document.getElementById('detailActions');actions.replaceChildren();
 const old=document.getElementById('stationDetails');if(old)old.remove();document.getElementById('detailBody').append(mapCard);mapCard.hidden=false;selectMapFor(it);
 if(it.bucket==='trash'){
  const section=document.createElement('div');section.id='stationDetails';
  [['recycle',jl('回收','Recycle')],['donate',jl('捐赠','Donate','捐贈')],['sell',jl('转卖','Sell','轉賣')]].forEach(([v,label])=>{const b=document.createElement('button');b.textContent=label;b.className=it.handle===v?'primary':'';b.onclick=()=>{assignDisposal(it,v);openItemDetails(it);};actions.append(b);});section.append(disposalLinks(it));document.getElementById('detailBody').append(section);
 }else{renderShopMatches();}
 // A compact alternative to drag for touch/keyboard users lives in details, not every card.
 const move=document.createElement('select');move.setAttribute('aria-label',jl('移动物品','Move item','移動物品'));
 [...timelineSlots(),'buy','trash'].forEach(slot=>{const o=document.createElement('option');o.value=slot;o.textContent=slotName(slot);o.selected=it.bucket===slot;move.append(o);});move.onchange=()=>{moveItem(it,move.value);drawer.close();restoreMap();};actions.append(move);
 if(!drawer.open)showDialog(drawer);if(!mapCard.hidden){ensureMap();refreshMap();}
}
function packingFor(items){
 const groups={suitcase:[],soft:[],small:[],medium:[],large:[]};
 items.forEach(it=>{const n=(it.kind||'')+' '+(it._key||it.name);if(/家具|床架|桌|椅|柜|櫃|大家电|desk|chair|bed frame/i.test(n)){groups.large.push(it);return;}if(/床品|枕|被|pillow|quilt/i.test(n)){groups.soft.push(it);return;}if(/衣|行李|suitcase|clothes/i.test(n)){groups.suitcase.push(it);return;}if(/书|書|电子|電子|电脑|電腦|laptop|book/i.test(n)){groups.small.push(it);return;}groups.medium.push(it);});
 const count=(list,capacity)=>Math.max(1,Math.ceil(list.reduce((n,it)=>n+(Number(it.vol)||0.02),0)/capacity));
 const lines=[];const names=list=>list.map(nm).join('、');
 if(groups.suitcase.length)lines.push(jl('26–28 英寸行李箱','26–28 inch suitcase','26–28 吋行李箱')+' × '+count(groups.suitcase,.075)+' → '+names(groups.suitcase));
 if(groups.soft.length)lines.push(jl('60×45×35 cm 软装袋','60×45×35 cm bedding bag','60×45×35 cm 寢具袋')+' × '+count(groups.soft,.075)+' → '+names(groups.soft));
 if(groups.small.length)lines.push(jl('40×30×30 cm 加厚小箱','40×30×30 cm reinforced small box','40×30×30 cm 加厚小箱')+' × '+count(groups.small,.028)+' → '+names(groups.small));
 if(groups.medium.length)lines.push(jl('50×40×40 cm 纸箱','50×40×40 cm carton','50×40×40 cm 紙箱')+' × '+count(groups.medium,.064)+' → '+names(groups.medium));
 if(groups.large.length)lines.push(jl('独立搬运 · 护角＋搬家毯','Move separately · corner guards + moving blankets','獨立搬運 · 護角＋搬家毯')+' → '+names(groups.large));
 return lines;
}
const packing=document.createElement('section');packing.id='packingGuide';document.querySelector('#s3 .days-wrap').after(packing);
function renderPacking(){
 packing.hidden=false;
 packing.innerHTML='<h2>✨ '+jl('打包参考（规则估算）','Packing guide (rule-based estimates)','打包參考（規則估算）')+'</h2><p class="packing-intro">'+jl('怎么装，更好搬','Pack for an easier move','怎樣裝，更好搬')+'</p>';
 const grid=document.createElement('div');grid.className='packing-cards';
 const lines=packingFor(S.items.filter(i=>/^day/.test(i.bucket)));
 const typeFor=line=>line.includes('26–28')?'suitcase':/60×45/.test(line)?'bag':/40×30/.test(line)?'small':/50×40/.test(line)?'box':'large';
 ['suitcase','bag','small','box','large'].forEach(type=>{const line=lines.find(line=>typeFor(line)===type)||'';
 const labels={suitcase:jl('大号行李箱','Large suitcase','大號行李箱'),bag:jl('床品收纳袋','Bedding bag','寢具收納袋'),small:jl('加厚小箱','Small sturdy box','加厚小箱'),box:jl('中号纸箱','Medium carton','中號紙箱'),large:jl('大件单独保护','Protect bulky items','大件獨立保護')};
 const tips={suitcase:jl('衣物随身，常用物品放上层','Keep everyday clothing on top','衣物隨身，常用物品放上層'),bag:jl('枕被集中装，柔软不挤坏','Keep pillows and bedding together','枕被集中裝，柔軟不擠壞'),small:jl('书本少量分装，电子产品加缓冲','Split heavy books; cushion electronics','書本少量分裝，電子產品加緩衝'),box:jl('日用品分组，箱外写好名称','Group daily items and label the box','日用品分組，箱外寫好名稱'),large:jl('桌椅加护角，家具包搬家毯','Use corner guards and moving blankets','桌椅加護角，家具包搬家毯')};
 const c=document.createElement('article');c.className='packing-card';c.innerHTML='<div class="packing-photo '+type+'" role="img" aria-label="'+labels[type]+' · '+jl('写实参考图','Photorealistic reference','寫實參考圖')+'"></div><h3>'+labels[type]+(line.match(/× (\d+)/)?' × '+line.match(/× (\d+)/)[1]:'')+'</h3><p>'+tips[type]+'</p>';
 const size=document.createElement('p');size.className='packing-size';const sizes={suitcase:jl('28 英寸 · 约 75×50×30 cm','28 inch · about 75×50×30 cm','28 吋 · 約 75×50×30 cm'),bag:jl('大号 · 约 60×45×35 cm','Large · about 60×45×35 cm','大號 · 約 60×45×35 cm'),small:jl('小号 · 约 40×30×30 cm','Small · about 40×30×30 cm','小號 · 約 40×30×30 cm'),box:jl('中号 · 约 50×40×40 cm','Medium · about 50×40×40 cm','中號 · 約 50×40×40 cm'),large:jl('按家具大小选搬家毯与护角','Choose blankets and guards to fit','按家具大小選搬家毯與護角')};size.textContent=sizes[type];c.append(size);const names=document.createElement('small');names.textContent=line.split(' → ')[1]||jl('备用包装参考 · 暂无分配物品','Packing reference · No items assigned yet','備用包裝參考 · 暫無分配物品');c.append(names);grid.append(c);});packing.append(grid);
 const note=document.createElement('small');note.className='packing-note';note.textContent=jl('AI 生成参考图 · 尺寸为选购参考，装箱前核对实际内尺寸与承重','AI-generated reference photos · Check actual interior dimensions and weight limits','AI 生成參考圖 · 尺寸為選購參考，裝箱前核對實際內尺寸與承重');packing.append(note);
}
function packingDrawing(type){const inside=type==='suitcase'?'<rect x="43" y="13" width="34" height="13" rx="5"/><rect x="28" y="27" width="64" height="62" rx="10"/><path d="M45 40v35m30-35v35"/><circle cx="40" cy="94" r="4"/><circle cx="80" cy="94" r="4"/>':type==='bag'?'<path d="M25 40Q60 27 95 40L101 83Q60 98 19 83Z"/><path d="M42 36V24h36v12M23 55h74"/>':type==='large'?'<path d="M22 35h76v12H22zM30 47v44m60-44v44M42 35V18h36v17"/><path d="M20 57l24-8 10 37-25 7z"/>':'<path d="M20 34l40-17 40 17v49L60 101 20 83zM20 34l40 18 40-18M60 52v49M40 25l40 18v18"/>';return '<svg class="packing-art '+type+'" viewBox="0 0 120 110" role="img" aria-label="'+type+'" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">'+inside+'</svg>';}
function exportText(){normalizeItems();const lines=['LoopMove · '+jl('搬家行动清单','Moving checklist','搬家行動清單'),S.dest?T('d_'+S.dest.id):'',jl('待完善事项','Decisions remaining','待完善事項')+': '+S.items.filter(i=>i.bucket==='pending'||(['buy','trash'].includes(i.bucket)&&!i.handle)).length, ''];[...timelineSlots(),'pending','buy','trash','fixed'].forEach(slot=>{const items=S.items.filter(i=>i.bucket===slot);lines.push(slotName(slot),...items.map(i=>'• '+nm(i)+(i.completed?' [✓]':' [ ]')+(i.handle?' → '+({recycle:jl('回收','Recycle'),donate:jl('捐赠','Donate','捐贈'),sell:jl('转卖','Sell','轉賣'),stay:jl('留下','Leave')}[i.handle]):['trash','buy'].includes(slot)?' → '+jl('待处理','Pending','待處理'):'')));if(journey.arrangement!=='manual'&&slot.startsWith('day'))lines.push(...packingFor(items));if(slot==='buy'&&items.length){const cats=new Set(items.map(category));(DAY_LOCS[S.dest?.id]||DAY_LOCS.hsk).facilities.filter(f=>cats.has(f.cat)).forEach(f=>lines.push(t3(f.name)+' — https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(t3(f.name)+' '+t3(f.addr))));}lines.push('');});lines.push('https://www.wastereduction.gov.hk/zh-hk/recycling-map');lines.push(jl('装箱数量为粗估，请核对箱子内尺寸及承重。','Packing counts are estimates. Check internal dimensions and weight limits.','裝箱數量為粗估，請核對箱子內尺寸及承重。'));return lines.join('\n');}
function downloadList(){const blob=new Blob(['\ufeff'+exportText()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='LoopMove-'+(document.getElementById('f-date').value||'清单')+'.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const classifier=document.createElement('dialog');classifier.id='arrangementDialog';document.body.append(classifier);
function chooseArrangement(){
 if(!S.items.length){go(2);return;}
 classifier.innerHTML='<h2>'+jl('怎么安排？','How would you like to plan?','怎樣安排？')+'</h2><div class="arrangement-choices"><button id="arrangeManual"><b>↔ '+jl('自己安排','Plan myself','自己安排')+'</b><span>'+jl('拖动决定日期','Drag items to dates','拖動決定日期')+'</span></button><button id="arrangeSmart"><b>✨ '+jl('智能安排','Smart start','智能安排')+'</b><span>'+jl('为带走的物品安排日期，保留已选去向','Schedule moving items; preserve destination choices','為帶走的物品安排日期，保留已選去向')+'</span></button></div><button id="arrangeCancel" class="ghost">'+jl('返回物品','Back to items','返回物品')+'</button>';
 showDialog(classifier);document.getElementById('arrangeCancel').onclick=()=>classifier.close();
 document.getElementById('arrangeManual').onclick=startManualArrangement;
 document.getElementById('arrangeSmart').onclick=smartArrange;
}
function arrangementItems(){
 return S.items.filter(i=>!i.fixed&&!['fixed','buy','trash'].includes(i.bucket)&&!['sell','donate','recycle','stay'].includes(i.handle)&&i.plan!=='rebuy');
}
function validatedArrangement(data,items,dayCount){
 if(data.error||data.mode==='demo'||!Array.isArray(data.items)||data.items.length!==items.length)throw new Error('Invalid arrangement');
 const expected=new Set(items.map(i=>i.id)),result=new Map();
 for(const row of data.items){
  if(!row||!expected.has(row.id)||result.has(row.id)||!Number.isInteger(row.day)||row.day<1||row.day>dayCount)throw new Error('Invalid arrangement');
  result.set(row.id,row.day);
 }
 if(result.size!==expected.size)throw new Error('Incomplete arrangement');
 return result;
}
function finishArrangement(mode){
 S.items.forEach(i=>i.classified=true);journey.arrangement=mode;journey.classified=true;classifier.close();go(3);
}
function useRuleArrangement(){
 const items=arrangementItems(),loads=journey.dates.map(()=>0);
 if(!loads.length)return;
 items.sort((a,b)=>Number(['bedding','electronics','daily'].includes(itemGroup(b)))-Number(['bedding','electronics','daily'].includes(itemGroup(a))));
 items.forEach(it=>{const day=loads.indexOf(Math.min(...loads));it.bucket='day'+(day+1);it.plan='';it.handle='';loads[day]+=Math.max(Number(it.vol)||0,0.01);});
 finishArrangement('demo');
}
let arrangementRequest=0;
async function smartArrange(){
 normalizeItems();
 if(!journey.dates.length){bAlert(jl('请先添加搬家日期','Add a moving date first','請先新增搬家日期'));return;}
 const items=arrangementItems();
 if(!items.length){finishArrangement('manual');return;}
 const token=++arrangementRequest,dates=[...journey.dates];
 const snapshot=JSON.stringify({dates:journey.dates,items:S.items});
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),90000);
 classifier.innerHTML='<h2>'+jl('正在安排…','Planning…','正在安排…')+'</h2><p>'+jl('首次请求可能较慢，可取消后手动安排。','The first request may take longer. You can cancel and arrange manually.','首次請求可能較慢，可取消後手動安排。')+'</p><button id="cancelArrangement" class="ghost">'+jl('取消','Cancel','取消')+'</button>';
 const cancel=()=>{arrangementRequest++;controller.abort();classifier.close();};
 classifier.oncancel=cancel;document.getElementById('cancelArrangement').onclick=cancel;
 try{
  if(IS_STATIC)throw new Error('No API configured');
  const response=await fetch(API_BASE+'/api/arrange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dates,items:items.map(i=>({id:i.id,name:i.name,kind:i.kind}))}),signal:controller.signal});
  if(!response.ok)throw new Error('Request failed');
  const valid=validatedArrangement(await response.json(),items,dates.length);
  if(token!==arrangementRequest)return;
  if(snapshot!==JSON.stringify({dates:journey.dates,items:S.items}))throw new Error('Inventory changed');
  items.forEach(i=>{i.bucket='day'+valid.get(i.id);i.plan='';i.handle='';});
  finishArrangement('ai');
 }catch(e){
  if(token!==arrangementRequest)return;
  classifier.innerHTML='<h2>'+jl('AI 安排未完成','AI arrangement unavailable','AI 安排未完成')+'</h2><p role="alert">'+jl('请求失败、超时或结果无效，原有安排已保留。可以重试，或明确选择本地规则方案。','The request failed, timed out, or returned an invalid result. Your previous choices are preserved. Retry or choose a local rule-based plan.','請求失敗、逾時或結果無效，原有安排已保留。可以重試，或選擇本地規則方案。')+'</p><button id="retryArrangement">'+jl('重试 AI','Retry AI','重試 AI')+'</button> <button id="ruleArrangement">'+jl('使用规则安排（非 AI）','Use rules (not AI)','使用規則安排（非 AI）')+'</button> <button id="backArrangement" class="ghost">'+jl('返回','Back','返回')+'</button>';
  document.getElementById('retryArrangement').onclick=smartArrange;
  document.getElementById('ruleArrangement').onclick=useRuleArrangement;
  document.getElementById('backArrangement').onclick=()=>classifier.close();
 }finally{clearTimeout(timeout);if(token===arrangementRequest)classifier.oncancel=null;}
}
function renderArrangement(){
 let note=document.getElementById('arrangementNote');if(!note){note=document.createElement('p');note.id='arrangementNote';document.getElementById('timelineTools').before(note);}
 note.textContent=journey.arrangement==='ai'?jl('✨ AI 已安排 · 拖动可调整','✨ Arranged by AI · Drag to adjust','✨ AI 已安排 · 拖動可調整'):journey.arrangement==='demo'?jl('规则安排（非 AI）· 按估算体积分配，拖动可调整','Rule-based plan (not AI) · Balanced by estimated volume; drag to adjust','規則安排（非 AI）· 按估算體積分配，拖動可調整'):jl('↔ 自己安排 · 拖到日期框','↔ Your plan · Drag items to dates','↔ 自己安排 · 拖到日期框');
 if(journey.edited)note.textContent+=' · '+jl('已调整','Edited','已調整');
}
// A shared map stays next to the leave-behind lane, and can expand into item details.
const timelineLeft=document.createElement('div');timelineLeft.id='timelineLeft';document.getElementById('board').before(timelineLeft);timelineLeft.append(document.getElementById('board'));
const mapDock=document.createElement('aside');mapDock.id='mapDock';document.querySelector('#s3 .days-wrap').append(mapDock);mapDock.append(mapCard);
const mapTabs=document.createElement('div');mapTabs.id='mapModes';mapCard.prepend(mapTabs);
const disposalPoints=new Map();const disposalRequests=new Set();let disposalStatus='';
function selectMapFor(it){journey.selected=it.id;journey.mapMode=it.bucket==='trash'||it.handle?'dispose':'buy';journey.mapCat=journey.mapMode==='dispose'?null:category(it);_mv=null;_gmv=null;}
function restoreMap(){if(drawer.open)return;mapDock.append(mapCard);mapCard.hidden=false;if(document.getElementById('s3').classList.contains('on')){ensureMap();refreshMap();}}
function openServiceMap(mode){journey.mapMode=mode;journey.mapCat=null;journey.selected=null;document.getElementById('detailTitle').textContent=jl('附近地点','Nearby places','附近地點');document.getElementById('detailActions').replaceChildren();document.getElementById('stationDetails')?.remove();document.getElementById('detailBody').append(mapCard);mapCard.hidden=false;if(!drawer.open)showDialog(drawer);_mv=null;ensureMap();refreshMap();}
const processMapButton=document.createElement('button');processMapButton.id='processMap';processMapButton.className='map-shortcut';processMapButton.textContent='🗺️';processMapButton.setAttribute('aria-label','处理地图 / Disposal map');processMapButton.onclick=()=>openServiceMap('dispose');document.querySelector('#s4 h1').after(processMapButton);
function renderMapModes(){mapTabs.replaceChildren();[['all',jl('全部','All')],['buy',jl('🛍️ 购买','🛍️ Buy','🛍️ 購買')],['dispose',jl('♻️ 处理','♻️ Recycle','♻️ 處理')]].forEach(([key,title])=>{const b=document.createElement('button');b.textContent=title;b.className=journey.mapMode===key?'on':'';b.onclick=()=>{journey.mapMode=key;journey.mapCat=null;journey.selected=null;_mv=null;refreshMap();};mapTabs.append(b);});document.querySelector('#mapCard .mc-head b').textContent=jl('地图对比 · 带走还是当地买？','Map comparison · Move or buy locally?','地圖對比 · 帶走還是當地買？');}
function disposalAction(){return S.items.find(i=>i.id===journey.selected)?.handle||'all';}
function disposalKey(){return (S.dest?.id||'hsk')+':'+disposalAction();}
function disposalPlaceName(p){return p.tags?.name||(p.tags?.shop==='charity'?jl('慈善商店','Charity shop','慈善商店'):p.tags?.shop==='second_hand'?jl('二手商店','Second-hand shop','二手商店'):jl('回收点','Recycling point','回收點'));}
const shopMatchesBase=renderShopMatches;
renderShopMatches=function(){
 renderMapModes();shopMatchesBase();const out=document.getElementById('shopMatches');if(journey.mapMode==='dispose')out.replaceChildren();if(journey.mapMode==='buy')return;
 const action=disposalAction(),points=disposalPoints.get(disposalKey())||[];
 if(journey.mapMode==='dispose'){const title=document.createElement('b');title.textContent=action==='all'?jl('附近处理地点','Nearby disposal locations','附近處理地點'):handleLabel(action)+' · '+jl('附近地点','Nearby locations','附近地點');out.append(title);}
 points.slice(0,5).forEach(p=>{const a=document.createElement('a');a.className='shop-result';a.target='_blank';a.rel='noopener';a.href='https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon;a.textContent=disposalPlaceName(p)+' ↗';out.append(a);});
 const selected=S.items.find(i=>i.id===journey.selected);if(selected?.handle){out.append(disposalLinks(selected));}
 if(action==='recycle'||action==='all'){const official=document.createElement('a');official.className='shop-result';official.href='https://www.wastereduction.gov.hk/zh-hk/recycling-map';official.target='_blank';official.rel='noopener';official.textContent=jl('♻️ 官方回收地图 ↗','♻️ Official recycling map ↗','♻️ 官方回收地圖 ↗');out.append(official);}
 const note=document.createElement('small');note.className='map-note';note.textContent=points.length?jl('OpenStreetMap 点位 · 请确认库存、接收品类与营业时间','OpenStreetMap locations · Confirm accepted items and opening hours','OpenStreetMap 點位 · 請確認庫存、接收品類與營業時間'):disposalPoints.has(disposalKey())?jl('附近暂无此类点位，可使用服务入口查询；不代表平台有线下门店。','No nearby locations of this type. Use the service links; online platforms may have no physical store.','附近暫無此類點位，可使用服務入口查詢；不代表平台有線下門店。'):disposalStatus||jl('正在查找地点…','Finding locations…','正在尋找地點…');out.append(note);
};
async function loadDisposalPoints(){
 const key=disposalKey(),action=disposalAction();if(disposalRequests.has(key))return;disposalRequests.add(key);disposalStatus='';const c=(DAY_LOCS[S.dest?.id]||DAY_LOCS.hsk).center;
 try{
  const bounds=[c.lat-.09,c.lng-.09,c.lat+.09,c.lng+.09].join(',');
  const tags=action==='sell'?['shop=second_hand']:action==='donate'?['shop=charity']:action==='recycle'?['amenity=recycling']:['shop=second_hand','shop=charity','amenity=recycling'];
  const query='[out:json][timeout:12];('+tags.map(tag=>'nwr['+tag+']('+bounds+');').join('')+');out center tags;';
  const res=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),{signal:AbortSignal.timeout(18000)});if(!res.ok)throw new Error('map');const data=await res.json();
  disposalPoints.set(key,(data.elements||[]).map(p=>({...p,lat:p.lat??p.center?.lat,lon:p.lon??p.center?.lon})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)));
 }catch(e){disposalStatus=jl('点位暂不可用，可使用服务入口','Locations unavailable; use the service links','點位暫不可用，可使用服務入口');disposalRequests.delete(key);}
 if(disposalKey()===key){if(journey.mapMode==='dispose')_mv=null;if(_map)renderMap();renderShopMatches();}
}
const baseRenderMap=renderMap;
renderMap=function(){const resetView=_mv===null;baseRenderMap();if(!_map||journey.mapMode==='buy')return;const points=disposalPoints.get(disposalKey())||[];points.forEach(p=>{const icon=L.divIcon({className:'',html:'<div class="lm-pin recycle-pin">♻️</div>',iconSize:[32,32],iconAnchor:[16,16]});L.marker([p.lat,p.lon],{icon}).addTo(_layer).bindPopup('<b>'+esc(disposalPlaceName(p))+'</b><p>'+jl('接收品类请先确认','Check accepted materials','接收品類請先確認')+'</p><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon+'">'+jl('路线与详情 ↗','Directions & details ↗','路線與詳情 ↗')+'</a>');});if(journey.mapMode==='dispose'&&points.length&&resetView)_map.fitBounds(points.map(p=>[p.lat,p.lon]));};
const baseRefreshMap=refreshMap;refreshMap=function(){baseRefreshMap();if(journey.mapMode!=='buy'&&!disposalRequests.has(disposalKey())&&!disposalPoints.has(disposalKey()))loadDisposalPoints();};

// AI suggestions fill undecided items only; manual mode never invokes them.
document.getElementById('aiFill2').onclick=generateDisposalPlan;
const summaryExport=document.createElement('button');summaryExport.className='primary';summaryExport.onclick=downloadList;
document.querySelector('#s5 .row').append(summaryExport);
document.getElementById('aiPlan').closest('.plan-day').remove();
document.getElementById('planTrash').closest('.plan-day').remove();
const journeyLabels=compactLabels;
compactLabels=function(){journeyLabels();Object.assign(I18N[LANG],{s4ai:jl('AI 建议物品去向','AI disposal suggestions','AI 建議物品去向')});summaryExport.textContent=jl('↓ 导出清单 TXT','↓ Export checklist TXT','↓ 匯出清單 TXT');};
const decisionIntro=document.createElement('p');decisionIntro.className='lead';document.querySelector('#s3 h1').after(decisionIntro);
const disposalIntro=document.createElement('p');disposalIntro.className='lead';document.querySelector('#s4 h1').after(disposalIntro);
const comparison=document.createElement('div');comparison.id='mapComparison';mapTabs.after(comparison);
const comparisonBase=renderShopMatches;
renderShopMatches=function(){
 comparisonBase();const it=S.items.find(i=>i.id===journey.selected);
 comparison.replaceChildren();const hint=document.createElement('p');hint.className='map-note';hint.textContent=it?nm(it)+' · '+jl('对比带走和当地购买，点击地图地点核对。','Compare moving with buying locally; check places on the map.','對比帶走和當地購買，點擊地圖地點核對。'):jl('点选物品，对比搬运体积与重购参考价，再查看附近购买或回收地点。','Select an item to compare moving volume and replacement price, with nearby shops and recycling.','點選物品，對比搬運體積與重購參考價，再查看附近購買或回收地點。');comparison.append(hint);
 if(it&&!it.fixed){const row=document.createElement('div');row.className='comparison-options';
 [[/^day/.test(it.bucket)?it.bucket:'day1',jl('带走','Move','帶走')+' · '+(Number(it.vol)||0).toFixed(2)+' m³'],['buy',jl('当地买','Buy locally','當地買')+' · '+(Number.isFinite(it.rebuy)?'~HK$'+it.rebuy:jl('价格待确认','Price unknown','價格待確認'))]].forEach(([slot,label])=>{const b=document.createElement('button');b.textContent=label;b.className=it.bucket===slot?'primary':'';b.onclick=()=>{moveItem(it,slot);refreshMap();};row.append(b);});comparison.append(row);
 const note=document.createElement('small');note.className='map-note';note.textContent=jl('演示估价，非商家报价；地图展示目的地周边地点。','Demo estimates, not store quotes. Locations are near your destination.','示範估價，非商家報價；地圖展示目的地周邊地點。');comparison.append(note);}
};
const finalLabels=applyLang;
applyLang=function(){finalLabels();decisionIntro.textContent=jl('先看地图，再决定：带走、当地买，或留给下一个人。','Use the map to decide: move it, buy locally, or pass it on.','先看地圖，再決定：帶走、當地買，或留給下一個人。');disposalIntro.textContent=jl('为不带走的旧物选择去向。AI 建议只补充未选择项，可随时修改；实际成色与接收条件请自行确认。','Choose where old items go. AI suggestions fill undecided items; adjust for condition and service requirements.','為不帶走的舊物選擇去向。AI 建議只補充未選擇項，可隨時修改；實際成色與接收條件請自行確認。');};
applyLang();

// Manual mode and the existing AI disposal action; no separate AI-plan block.
let planningSession=0,disposalController=null;
const disposalMessage=document.createElement('p');disposalMessage.id='disposalMessage';disposalMessage.className='map-note';disposalMessage.setAttribute('role','status');document.getElementById('aiFill2').after(disposalMessage);
function planningSnapshot(){return LoopMovePlanning.snapshot(S.items,journey.dates,LANG);}
function startManualArrangement(){
 arrangementRequest++;planningSession++;disposalController?.abort();normalizeItems();LoopMovePlanning.resetItems(S.items);
 journey.arrangement='manual';journey.classified=true;journey.edited=false;journey.selected=null;disposalMessage.textContent='';classifier.close();go(3);renderPlanningPanel();
}
function renderPlanningPanel(){
 const manual=journey.arrangement==='manual';document.getElementById('aiFill2').hidden=manual;disposalMessage.hidden=manual;
}
async function requestPlanning(path,payload,controller){
 if(IS_STATIC)throw new Error('NO_SERVICE');
 const response=await fetch(API_BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});const data=await response.json();
 if(!response.ok||data.error||data.mode==='demo')throw new Error(data.error||'REQUEST_FAILED');return data;
}
async function generateDisposalPlan(){
 if(journey.arrangement==='manual'||disposalController)return;
 normalizeItems();const items=LoopMovePlanning.disposalItems(S.items);
 if(!items.length){disposalMessage.textContent=jl('没有待选择去向的物品，已有决定保持不变。','No undecided leave-behind items. Existing choices are preserved.','沒有待選擇去向的物品，已有決定保持不變。');renderPlanningPanel();return;}
 const controller=new AbortController();disposalController=controller;const session=planningSession,snapshot=planningSnapshot(),language=LoopMoveRecognition.language(LANG);
 disposalMessage.textContent=jl('AI 正在建议物品去向…','AI is suggesting item destinations…','AI 正在建議物品去向…');renderPlanningPanel();document.getElementById('aiFill2').disabled=true;
 const timer=setTimeout(()=>controller.abort(),90000);
 try{
  const data=await requestPlanning('/api/dispose',{language,dest:S.dest?T('d_'+S.dest.id):'',items:items.map(i=>({id:i.id,name:nm(i),kind:i.kind,vol:i.vol}))},controller);
  if(session!==planningSession||journey.arrangement==='manual')return;
  if(snapshot!==planningSnapshot()){disposalMessage.textContent=jl('清单已修改，请重新生成；现有选择已保留。','The checklist changed. Retry to update suggestions; your choices are preserved.','清單已修改，請重新生成；現有選擇已保留。');return;}
  if(data.language!==language)throw new Error('LANGUAGE_MISMATCH');
  const rows=LoopMovePlanning.validateDisposal(data,items);
  rows.forEach(row=>{const it=S.items.find(i=>i.id===row.id);if(it&&!it.fixed&&!it.handle&&['buy','trash'].includes(it.bucket)){it.handle=row.handle;it.aiDisposal=row.reason;}});
  journey.edited=true;disposalMessage.textContent=jl('AI 建议已应用，可在下方或物品去向页面逐件修改。','AI suggestions applied. Adjust each choice below or on the item destinations page.','AI 建議已套用，可在下方或物品去向頁面逐件修改。');if(document.getElementById('s4').classList.contains('on'))renderModal();
 }catch(e){if(session===planningSession)disposalMessage.textContent=jl('AI 去向建议暂不可用，请手动选择；已有决定保持不变。','AI disposal suggestions unavailable. Choose manually; existing decisions are preserved.','AI 去向建議暫不可用，請手動選擇；已有決定保持不變。');}
 finally{clearTimeout(timer);if(controller===disposalController){disposalController=null;document.getElementById('aiFill2').disabled=false;renderPlanningPanel();if(document.getElementById('s3').classList.contains('on'))renderBoard();}}
}
const planningModal=renderModal;renderModal=function(){planningModal();renderPlanningPanel();};
renderPlanningPanel();
