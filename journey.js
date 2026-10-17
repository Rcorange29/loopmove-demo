/* Simplified journey: explicit dates, movable cards, fixed fixtures and linked shopping. */
const jl=(hans,en,hant=hans)=>LANG==='en'?en:LANG==='zhHant'?hant:hans;
const journey={filter:'all',mapCat:null,selected:null,dates:['2027-09-01','2027-09-02'],classified:false,mapMode:'all',arrangement:null,edited:false};
DAY_LOCS.yln=DAY_LOCS.syl;DAY_LOCS.st=DAY_LOCS.stt;
const FIXTURE=/窗户|窗戶|窗框|墙体|牆體|内置|內置|嵌入式柜|嵌入式櫃|固定橱柜|固定櫥櫃|墙上搁板|牆上擱板|window|built.in|wall.mounted shelf|^门$|^門$|^door$/i;
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
function moveItem(it,slot){if(it.fixed)return;it.bucket=slot;it.plan=slot==='buy'?'rebuy':'';if(!['buy','trash'].includes(slot))it.handle='';journey.edited=true;renderBoard();if(['buy','trash'].includes(slot)){selectMapFor(it);refreshMap();}}
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
 const items=S.items.filter(i=>i.bucket===slot);items.forEach(it=>body.append(card(it)));
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
 ['buy','trash'].forEach(slot=>{const group=document.createElement('section');group.className='leave-group';group.dataset.col=slot;const h=document.createElement('h4');h.textContent=slot==='buy'?slotName('buy'):jl('处理','Disposal','處理');group.append(h,itemSlot(slot));leave.append(group);});
 const fixed=S.items.filter(i=>i.fixed);if(fixed.length){const row=document.createElement('div');row.className='fixed-strip';fixed.forEach(it=>row.append(card(it)));leave.append(row);}
 board.append(leave);renderPacking();if(typeof mapDock!=='undefined')restoreMap();
};
// Capture the drop before the legacy board handler; fixed fixtures cannot enter moving slots.
document.getElementById('board').addEventListener('drop',e=>{e.preventDefault();e.stopImmediatePropagation();const col=e.target.closest('[data-col]');if(!col)return;col.classList.remove('drop');const it=S.items.find(i=>i.id===e.dataTransfer.getData('text'));if(it&&col.dataset.col!=='fixed')moveItem(it,col.dataset.col);},true);
renderModal=function(){
 normalizeItems();const list=document.getElementById('dispList');list.replaceChildren();const items=S.items.filter(i=>['trash','buy'].includes(i.bucket));
 if(!items.length){list.textContent=jl('没有需要处理的物品','Nothing to handle','沒有需要處理的物品');return;}
 const actions=[['sell',jl('转卖','Sell','轉賣')],['donate',jl('捐赠','Donate','捐贈')],['recycle',jl('回收','Recycle','回收')]];
 [['',jl('待选择','Choose an action','待選擇')],...actions].forEach(([key,title])=>{
  const groupItems=items.filter(i=>(i.handle||'')===key);if(!key&&!groupItems.length)return;
  const group=document.createElement('section');group.className='disposal-group';group.dataset.handle=key;const h=document.createElement('h3');h.textContent=title+' · '+groupItems.length;group.append(h);
  const cards=document.createElement('div');cards.className='disposal-cards';
  groupItems.forEach(it=>{const c=document.createElement('article');c.className='disposal-card';const colors=ITEM_COLORS[itemGroup(it)];c.style.setProperty('--tint',colors[1]);c.style.setProperty('--category',colors[0]);const name=document.createElement('b');name.textContent=nm(it);c.append(name);const buttons=document.createElement('div');buttons.className='disposal-actions';
   actions.forEach(([value,label])=>{const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-label',nm(it)+' · '+label);button.setAttribute('aria-pressed',String(it.handle===value));button.onclick=()=>{it.handle=value;journey.edited=true;renderModal();};buttons.append(button);});c.append(buttons);cards.append(c);});group.append(cards);
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
  items.forEach(it=>{const row=document.createElement('p');row.textContent='□ '+nm(it)+(['buy','trash'].includes(slot)?' → '+handleLabel(it.handle):'');section.append(row);});
  if(/^day/.test(slot))packingFor(items).forEach(line=>{const p=document.createElement('p');p.className='map-note';p.textContent=line;section.append(p);});
  days.append(section);
 });
 if(!S.items.length)days.textContent=jl('还没有物品，请先整理房间物品。','Add items to build your checklist.','還沒有物品，請先整理房間物品。');
};
function handleLabel(handle){return ({sell:jl('转卖','Sell','轉賣'),donate:jl('捐赠','Donate','捐贈'),recycle:jl('回收','Recycle','回收')})[handle]||jl('待选择处理方式','Handling to be decided','待選擇處理方式');}

const baseGo=go;
go=function(n){normalizeItems();baseGo(n);document.querySelectorAll('.steps [data-step]').forEach(b=>{b.classList.toggle('on',+b.dataset.step===(n===5?4:n));if(+b.dataset.step===(n===5?4:n))b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});document.title='LoopMove · '+T('nav'+n);if(n===2)renderItems();};
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

// Keep four decision steps; the checklist is a separate final result.
document.querySelector('[data-step="5"]').remove();
document.getElementById('s5').hidden=false;
const drawer=document.createElement('dialog');drawer.id='itemDrawer';drawer.innerHTML='<div class="drawer-heading"><h2 id="detailTitle"></h2><button id="closeDetails" aria-label="Close">×</button></div><div id="detailActions"></div><div id="detailBody"></div>';
document.body.append(drawer);document.getElementById('closeDetails').onclick=()=>{drawer.close();restoreMap();};drawer.addEventListener('close',restoreMap);
const mapCard=document.getElementById('mapCard');mapCard.hidden=false;
function showDialog(el){if(el.showModal)el.showModal();else el.setAttribute('open','');}
function disposalLinks(it){
 const box=document.createElement('div');box.className='station-links';
 const types=it.handle==='sell'?['Carousell','闲鱼']:it.handle==='donate'?['救世军物资捐赠']:it.handle==='stay'?[]:[/电|電|冰箱|洗衣/.test(it.kind+' '+it.name)?'欧绿保 WEEE':'绿在区区'];
 CHANNELS.filter(c=>types.includes(c.name)).forEach(c=>{const a=document.createElement('a');a.href=c.url;a.target='_blank';a.rel='noopener';a.textContent=c.name+' ↗';box.append(a);});
 if(types.length){const note=document.createElement('small');note.textContent=jl('服务入口 · 站点与收件条件请确认','Service directory · Confirm location and accepted items','服務入口 · 請確認站點及收件條件');box.append(note);}return box;
}
function openItemDetails(it){
 journey.selected=it.id;document.getElementById('detailTitle').textContent=nm(it);const actions=document.getElementById('detailActions');actions.replaceChildren();
 const old=document.getElementById('stationDetails');if(old)old.remove();document.getElementById('detailBody').append(mapCard);mapCard.hidden=false;selectMapFor(it);
 if(it.bucket==='trash'){
  const section=document.createElement('div');section.id='stationDetails';
  [['recycle',jl('回收','Recycle')],['donate',jl('捐赠','Donate','捐贈')],['sell',jl('转卖','Sell','轉賣')]].forEach(([v,label])=>{const b=document.createElement('button');b.textContent=label;b.className=it.handle===v?'primary':'';b.onclick=()=>{it.handle=v;openItemDetails(it);};actions.append(b);});section.append(disposalLinks(it));document.getElementById('detailBody').append(section);
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
 packing.innerHTML='<h2>✨ '+jl('AI 专项建议','AI packing guide','AI 專項建議')+'</h2><p class="packing-intro">'+jl('怎么装，更好搬','Pack for an easier move','怎樣裝，更好搬')+'</p>';
 const grid=document.createElement('div');grid.className='packing-cards';
 const lines=packingFor(S.items.filter(i=>/^day/.test(i.bucket)));
 lines.forEach(line=>{const type=line.includes('26–28')?'suitcase':/60×45/.test(line)?'bag':/40×30/.test(line)?'small':/50×40/.test(line)?'box':'large';
 const labels={suitcase:jl('大号行李箱','Large suitcase','大號行李箱'),bag:jl('床品收纳袋','Bedding bag','寢具收納袋'),small:jl('加厚小箱','Small sturdy box','加厚小箱'),box:jl('中号纸箱','Medium carton','中號紙箱'),large:jl('大件单独保护','Protect bulky items','大件獨立保護')};
 const tips={suitcase:jl('衣物随身，常用物品放上层','Keep everyday clothing on top','衣物隨身，常用物品放上層'),bag:jl('枕被集中装，柔软不挤坏','Keep pillows and bedding together','枕被集中裝，柔軟不擠壞'),small:jl('书本少量分装，电子产品加缓冲','Split heavy books; cushion electronics','書本少量分裝，電子產品加緩衝'),box:jl('日用品分组，箱外写好名称','Group daily items and label the box','日用品分組，箱外寫好名稱'),large:jl('桌椅加护角，家具包搬家毯','Use corner guards and moving blankets','桌椅加護角，家具包搬家毯')};
 const c=document.createElement('article');c.className='packing-card';c.innerHTML='<div class="packing-photo '+type+'" role="img" aria-label="'+labels[type]+' · '+jl('写实参考图','Photorealistic reference','寫實參考圖')+'"></div><h3>'+labels[type]+(line.match(/× (\d+)/)?' × '+line.match(/× (\d+)/)[1]:'')+'</h3><p>'+tips[type]+'</p>';
 const size=document.createElement('p');size.className='packing-size';const sizes={suitcase:jl('28 英寸 · 约 75×50×30 cm','28 inch · about 75×50×30 cm','28 吋 · 約 75×50×30 cm'),bag:jl('大号 · 约 60×45×35 cm','Large · about 60×45×35 cm','大號 · 約 60×45×35 cm'),small:jl('小号 · 约 40×30×30 cm','Small · about 40×30×30 cm','小號 · 約 40×30×30 cm'),box:jl('中号 · 约 50×40×40 cm','Medium · about 50×40×40 cm','中號 · 約 50×40×40 cm'),large:jl('按家具大小选搬家毯与护角','Choose blankets and guards to fit','按家具大小選搬家毯與護角')};size.textContent=sizes[type];c.append(size);const names=document.createElement('small');names.textContent=line.split(' → ')[1]||'';c.append(names);grid.append(c);});packing.append(grid);
 const note=document.createElement('small');note.className='packing-note';note.textContent=jl('AI 生成参考图 · 尺寸为选购参考，装箱前核对实际内尺寸与承重','AI-generated reference photos · Check actual interior dimensions and weight limits','AI 生成參考圖 · 尺寸為選購參考，裝箱前核對實際內尺寸與承重');packing.append(note);
}
function packingDrawing(type){const inside=type==='suitcase'?'<rect x="43" y="13" width="34" height="13" rx="5"/><rect x="28" y="27" width="64" height="62" rx="10"/><path d="M45 40v35m30-35v35"/><circle cx="40" cy="94" r="4"/><circle cx="80" cy="94" r="4"/>':type==='bag'?'<path d="M25 40Q60 27 95 40L101 83Q60 98 19 83Z"/><path d="M42 36V24h36v12M23 55h74"/>':type==='large'?'<path d="M22 35h76v12H22zM30 47v44m60-44v44M42 35V18h36v17"/><path d="M20 57l24-8 10 37-25 7z"/>':'<path d="M20 34l40-17 40 17v49L60 101 20 83zM20 34l40 18 40-18M60 52v49M40 25l40 18v18"/>';return '<svg class="packing-art '+type+'" viewBox="0 0 120 110" role="img" aria-label="'+type+'" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">'+inside+'</svg>';}
function exportText(){normalizeItems();const lines=['LoopMove · '+jl('搬家行动清单','Moving checklist','搬家行動清單'),S.dest?T('d_'+S.dest.id):'',jl('待完善事项','Decisions remaining','待完善事項')+': '+S.items.filter(i=>i.bucket==='pending'||(['buy','trash'].includes(i.bucket)&&!i.handle)).length, ''];[...timelineSlots(),'pending','buy','trash','fixed'].forEach(slot=>{const items=S.items.filter(i=>i.bucket===slot);lines.push(slotName(slot),...items.map(i=>'• '+nm(i)+(i.handle?' → '+({recycle:jl('回收','Recycle'),donate:jl('捐赠','Donate','捐贈'),sell:jl('转卖','Sell','轉賣'),stay:jl('留下','Leave')}[i.handle]):['trash','buy'].includes(slot)?' → '+jl('待处理','Pending','待處理'):'')));if(slot.startsWith('day'))lines.push(...packingFor(items));if(slot==='buy'&&items.length){const cats=new Set(items.map(category));(DAY_LOCS[S.dest?.id]||DAY_LOCS.hsk).facilities.filter(f=>cats.has(f.cat)).forEach(f=>lines.push(t3(f.name)+' — https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(t3(f.name)+' '+t3(f.addr))));}lines.push('');});lines.push('https://www.wastereduction.gov.hk/zh-hk/recycling-map');lines.push(jl('装箱数量为粗估，请核对箱子内尺寸及承重。','Packing counts are estimates. Check internal dimensions and weight limits.','裝箱數量為粗估，請核對箱子內尺寸及承重。'));return lines.join('\n');}
function downloadList(){const blob=new Blob(['\ufeff'+exportText()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='LoopMove-'+(document.getElementById('f-date').value||'清单')+'.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const classifier=document.createElement('dialog');classifier.id='arrangementDialog';document.body.append(classifier);
function chooseArrangement(){
 if(!S.items.length){go(2);return;}
 classifier.innerHTML='<h2>'+jl('怎么安排？','How would you like to plan?','怎樣安排？')+'</h2><div class="arrangement-choices"><button id="arrangeManual"><b>↔ '+jl('自己安排','Plan myself','自己安排')+'</b><span>'+jl('拖动决定日期','Drag items to dates','拖動決定日期')+'</span></button><button id="arrangeSmart"><b>✨ '+jl('智能安排','Smart start','智能安排')+'</b><span>'+jl('安排日期，也推荐哪些不带走','Schedule items and suggest what to leave','安排日期，也推薦哪些不帶走')+'</span></button></div><button id="arrangeCancel" class="ghost">'+jl('返回物品','Back to items','返回物品')+'</button>';
 showDialog(classifier);document.getElementById('arrangeCancel').onclick=()=>classifier.close();
 document.getElementById('arrangeManual').onclick=()=>{normalizeItems();S.items.filter(i=>!i.fixed&&!i.classified).forEach(i=>i.bucket='pending');journey.arrangement='manual';journey.classified=true;classifier.close();go(3);};
 document.getElementById('arrangeSmart').onclick=smartArrange;
}
async function smartArrange(){
 normalizeItems();
 classifier.innerHTML='<h2>'+jl('正在安排…','Planning…','正在安排…')+'</h2>';let ai=false;
 if(!IS_STATIC){try{const response=await fetch(API_BASE+'/api/arrange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dates:journey.dates,items:S.items.filter(i=>!i.fixed).map(i=>({id:i.id,name:i.name,kind:i.kind}))}),signal:AbortSignal.timeout(90000)});if(response.ok){const data=await response.json();const valid=new Map((data.items||[]).filter(i=>Number.isInteger(i.day)&&i.day>=1&&i.day<=journey.dates.length).map(i=>[i.id,i.day]));ai=S.items.filter(i=>!i.fixed).every(i=>valid.has(i.id));if(ai)S.items.filter(i=>!i.fixed).forEach(i=>i.bucket='day'+valid.get(i.id));}}catch(e){}}
 if(!ai)S.items.filter(i=>!i.fixed&&!i.classified).forEach(it=>{
  const group=itemGroup(it);
  const shops=(DAY_LOCS[S.dest?.id]||DAY_LOCS.hsk).facilities.some(f=>f.cat===category(it));
  it.bucket=group==='furniture'&&shops?'buy':group==='decor'?'trash':['bedding','electronics','daily'].includes(group)?'day1':'day'+journey.dates.length;
  it.plan=it.bucket==='buy'?'rebuy':'';
 });
 S.items.forEach(i=>i.classified=true);journey.arrangement=ai?'ai':'demo';journey.classified=true;journey.edited=false;classifier.close();go(3);
}
function renderArrangement(){
 let note=document.getElementById('arrangementNote');if(!note){note=document.createElement('p');note.id='arrangementNote';document.getElementById('timelineTools').before(note);}
 note.textContent=journey.arrangement==='ai'?jl('✨ AI 已安排 · 拖动可调整','✨ Arranged by AI · Drag to adjust','✨ AI 已安排 · 拖動可調整'):journey.arrangement==='demo'?jl('✨ 智能安排（演示）· 大件就近买、装饰可转赠；拖动即可调整','✨ Smart draft (demo) · Buy bulky items nearby; pass decor on. Drag to adjust.','✨ 智能安排（示範）· 大件就近買、裝飾可轉贈；拖動即可調整'):jl('↔ 自己安排 · 拖到日期框','↔ Your plan · Drag items to dates','↔ 自己安排 · 拖到日期框');
 if(journey.edited)note.textContent+=' · '+jl('已调整','Edited','已調整');
}
// A shared map stays next to the leave-behind lane, and can expand into item details.
const timelineLeft=document.createElement('div');timelineLeft.id='timelineLeft';document.getElementById('board').before(timelineLeft);timelineLeft.append(document.getElementById('board'));
const mapDock=document.createElement('aside');mapDock.id='mapDock';document.querySelector('#s3 .days-wrap').append(mapDock);mapDock.append(mapCard);
const mapTabs=document.createElement('div');mapTabs.id='mapModes';mapCard.prepend(mapTabs);
const disposalPoints=new Map();const disposalRequests=new Set();let disposalStatus='';
function selectMapFor(it){journey.selected=it.id;journey.mapMode=it.bucket==='trash'?'dispose':'buy';journey.mapCat=it.bucket==='trash'?null:category(it);_mv=null;_gmv=null;}
function restoreMap(){if(drawer.open)return;mapDock.append(mapCard);mapCard.hidden=false;if(document.getElementById('s3').classList.contains('on')){ensureMap();refreshMap();}}
function openServiceMap(mode){journey.mapMode=mode;journey.mapCat=null;journey.selected=null;document.getElementById('detailTitle').textContent=jl('附近地点','Nearby places','附近地點');document.getElementById('detailActions').replaceChildren();document.getElementById('stationDetails')?.remove();document.getElementById('detailBody').append(mapCard);mapCard.hidden=false;if(!drawer.open)showDialog(drawer);_mv=null;ensureMap();refreshMap();}
const processMapButton=document.createElement('button');processMapButton.id='processMap';processMapButton.className='map-shortcut';processMapButton.textContent='🗺️';processMapButton.setAttribute('aria-label','处理地图 / Disposal map');processMapButton.onclick=()=>openServiceMap('dispose');document.querySelector('#s4 h1').after(processMapButton);
function renderMapModes(){mapTabs.replaceChildren();[['all',jl('全部','All')],['buy',jl('🛍️ 购买','🛍️ Buy','🛍️ 購買')],['dispose',jl('♻️ 处理','♻️ Recycle','♻️ 處理')]].forEach(([key,title])=>{const b=document.createElement('button');b.textContent=title;b.className=journey.mapMode===key?'on':'';b.onclick=()=>{journey.mapMode=key;journey.mapCat=null;journey.selected=null;_mv=null;refreshMap();};mapTabs.append(b);});document.querySelector('#mapCard .mc-head b').textContent=jl('地图对比 · 带走还是当地买？','Map comparison · Move or buy locally?','地圖對比 · 帶走還是當地買？');}
const shopMatchesBase=renderShopMatches;
renderShopMatches=function(){renderMapModes();shopMatchesBase();const out=document.getElementById('shopMatches');if(journey.mapMode==='dispose')out.innerHTML='';if(journey.mapMode!=='buy'){
 const points=disposalPoints.get(S.dest?.id||'hsk')||[];
 points.slice(0,5).forEach(p=>{const a=document.createElement('a');a.className='shop-result';a.target='_blank';a.rel='noopener';a.href='https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon;a.textContent='♻️ '+(p.tags?.name||jl('回收点','Recycling point','回收點'))+' ↗';out.append(a);});
 const official=document.createElement('a');official.className='shop-result';official.href='https://www.wastereduction.gov.hk/zh-hk/recycling-map';official.target='_blank';official.rel='noopener';official.textContent=jl('♻️ 官方回收地图 ↗','♻️ Official recycling map ↗','♻️ 官方回收地圖 ↗');out.append(official);
 const note=document.createElement('small');note.className='map-note';note.textContent=points.length?jl('OpenStreetMap 点位 · 接收品类请先确认','OpenStreetMap locations · Check accepted materials','OpenStreetMap 點位 · 請先確認接收品類'):disposalStatus||jl('正在查找回收点…','Finding recycling points…','正在尋找回收點…');out.append(note);
 }};
async function loadDisposalPoints(){
 const key=S.dest?.id||'hsk';if(disposalRequests.has(key))return;disposalRequests.add(key);const c=(DAY_LOCS[key]||DAY_LOCS.hsk).center;
 try{const query='[out:json][timeout:12];nwr[amenity=recycling]('+[c.lat-.09,c.lng-.09,c.lat+.09,c.lng+.09].join(',')+');out center tags;';const res=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query),{signal:AbortSignal.timeout(18000)});if(!res.ok)throw new Error('map');const data=await res.json();const points=(data.elements||[]).map(p=>({...p,lat:p.lat??p.center?.lat,lon:p.lon??p.center?.lon})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));disposalPoints.set(key,points);disposalStatus=points.length?'':jl('附近暂无点位，请查看官方地图','No nearby points; use the official map','附近暫無點位，請查看官方地圖');}
 catch(e){disposalStatus=jl('点位暂不可用，可打开官方地图','Locations unavailable; open the official map','點位暫不可用，可開啟官方地圖');}
 if((S.dest?.id||'hsk')===key){if(journey.mapMode==='dispose')_mv=null;if(_map)renderMap();renderShopMatches();}
}
const baseRenderMap=renderMap;
renderMap=function(){const resetView=_mv===null;baseRenderMap();if(!_map||journey.mapMode==='buy')return;const points=disposalPoints.get(S.dest?.id||'hsk')||[];points.forEach(p=>{const icon=L.divIcon({className:'',html:'<div class="lm-pin recycle-pin">♻️</div>',iconSize:[32,32],iconAnchor:[16,16]});L.marker([p.lat,p.lon],{icon}).addTo(_layer).bindPopup('<b>♻️ '+esc(p.tags?.name||jl('回收点','Recycling point','回收點'))+'</b><p>'+jl('接收品类请先确认','Check accepted materials','請先確認接收品類')+'</p><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon+'">'+jl('路线与详情 ↗','Directions & details ↗','路線與詳情 ↗')+'</a>');});if(journey.mapMode==='dispose'&&points.length&&resetView)_map.fitBounds(points.map(p=>[p.lat,p.lon]));};
const baseRefreshMap=refreshMap;refreshMap=function(){baseRefreshMap();if(journey.mapMode!=='buy'&&!disposalRequests.has(S.dest?.id||'hsk')&&!disposalPoints.has(S.dest?.id||'hsk'))loadDisposalPoints();};

// One-click suggestions only fill undecided items, preserving manual choices.
document.getElementById('aiFill2').onclick=()=>{
 normalizeItems();S.items.filter(i=>['buy','trash'].includes(i.bucket)&&!i.handle).forEach(it=>{
  it.handle=/破损|破損|损坏|損壞|broken/i.test(it.name)?'recycle':['furniture','electronics'].includes(itemGroup(it))?'sell':'donate';
 });journey.edited=true;renderModal();
};
const summaryExport=document.createElement('button');summaryExport.className='primary';summaryExport.onclick=downloadList;
document.querySelector('#s5 .row').append(summaryExport);
document.getElementById('aiPlan').closest('.plan-day').remove();
document.getElementById('planTrash').closest('.plan-day').remove();
const journeyLabels=compactLabels;
compactLabels=function(){journeyLabels();Object.assign(I18N[LANG],{s4ai:jl('✨ 一键 AI 选择（演示）','✨ AI picks (demo)','✨ 一鍵 AI 選擇（示範）')});summaryExport.textContent=jl('↓ 导出清单 TXT','↓ Export checklist TXT','↓ 匯出清單 TXT');};
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
applyLang=function(){finalLabels();decisionIntro.textContent=jl('先看地图，再决定：带走、当地买，或留给下一个人。','Use the map to decide: move it, buy locally, or pass it on.','先看地圖，再決定：帶走、當地買，或留給下一個人。');disposalIntro.textContent=jl('为不带走的旧物选择去向。AI 演示只补充未选择项，可随时修改；实际成色与接收条件请自行确认。','Choose where old items go. Demo AI fills undecided items; adjust for condition and service requirements.','為不帶走的舊物選擇去向。AI 示範只補充未選擇項，可隨時修改；實際成色與接收條件請自行確認。');};
applyLang();
