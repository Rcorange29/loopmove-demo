/* ==========================================================================
   LoopMove · journey.js
   Compare More Options（拖拽分类 + AI 一次性分类分天 + 三区地点查询）
   Moving Checklist（每日物品 + 每日紧凑打包方案）
   统一状态模型：
     it.bucket = day1..dayN | pending | buy | trash | fixed
     it.handle = '' | sell | donate | recycle   （仅 bucket='trash' 时有效）
     it.fixed  = true  → 固定设施，留在原处，不参与搬运/分类/打包
   ========================================================================== */
const jl=(h,e,p)=>LANG==='zhHans'?h:(LANG==='en'?e:(p||h));
const journey={filter:'all',mapCat:null,selected:null,dates:['2027-09-01','2027-09-02'],classified:false,mapMode:'buy',arrangement:null,edited:false,arranging:false};

const FIXTURE=/窗|窗帘|窗簾|帘|簾|杆|桿|嵌入式|暖气|暖氣|门|門|灶台|吊扇|顶灯|頂燈|插座|墙上搁板|牆上擱板|fixed|window|curtain|built-in|door|heater|ceiling/i;
const DISPOSAL_HANDLES=['sell','donate','recycle'];
const DISPOSAL_QUERIES={
 sell:{tags:[['shop','secondhand']],icon:'💸',pin:'sell-pin'},
 donate:{tags:[['shop','charity']],icon:'🎁',pin:'donate-pin'},
 recycle:{tags:[['amenity','recycling']],icon:'♻️',pin:'recycle-pin'}
};

/* ---------------- 物品归一化 ---------------- */
function normalizeItems(){
 S.items.forEach(i=>{
  if(!i.id)i.id=uid();
  /* 固定设施靠 _key（示例数据的原始中文名）判断：界面切到英文时 name 已变成英文，
     只匹配 name 会漏掉「墙上搁板」这类没有英文关键词的设施 */
  if(FIXTURE.test(i.name)||(i._key&&FIXTURE.test(i._key)))i.fixed=true;
  if(i.fixed){i.bucket='fixed';i.plan='';i.handle='';}
  else if(i.plan==='rebuy'&&i.bucket==='day1')i.bucket='buy';
  if(i.bucket==='trash'&&!DISPOSAL_HANDLES.includes(i.handle))i.handle='';
 });
}
function category(it){
 const hit=Object.entries(MAP_CATS).find(([k,v])=>it.kind.includes(v.cn)||it.kind.includes(v.en)||v.en.toLowerCase().includes(it.kind.toLowerCase()));
 return hit?hit[0]:(it.kind==='零碎'?'convenience':'furniture');
}
function slotName(slot){
 const m={
  pending:jl('待处理','Pending','待處理'),
  buy:jl('🛍️ 当地购买','🛍️ Buy locally','🛍️ 當地購買'),
  trash:jl('🗑️ 不搬走','🗑️ Leave behind','🗑️ 不搬走'),
  fixed:jl('🔧 固定设施（留在原处）','🔧 Fixed fixtures (stay in place)','🔧 固定設施（留在原處）')
 };
 if(m[slot])return m[slot];
 return dayLabel(+slot.replace('day',''))||slot;
}
function handleLabel(h){
 return h==='sell'?jl('💸 转卖 Resell','💸 Resell','💸 轉賣 Resell')
  :h==='donate'?jl('🎁 捐赠 Donate','🎁 Donate','🎁 捐贈 Donate')
  :h==='recycle'?jl('♻️ 回收 Recycle','♻️ Recycle','♻️ 回收 Recycle'):slotName('pending');
}
function timelineSlots(){return Array.from({length:S.trips},(_,i)=>'day'+(i+1));}

/* 统一状态变更：任何拖拽/选择都走这里，保证旧处理方式被清除 */
function moveItem(it,slot,handle){
 if(!it||it.fixed)return;
 journey.edited=true;
 if(String(slot).startsWith('day')){it.bucket=slot;it.plan='';it.handle='';}
 else if(slot==='buy'){it.bucket='buy';it.plan='rebuy';it.handle='';}
 else if(slot==='trash'){
  it.bucket='trash';it.plan='';
  it.handle=DISPOSAL_HANDLES.includes(handle)?handle:'';
 }
 else if(slot==='fixed'){it.fixed=true;it.bucket='fixed';it.plan='';it.handle='';}
 else {it.bucket=slot;it.plan='';}
}

/* 物品卡（三语，支持拖拽；fixed 不可拖） */
function card(it){
 const c=document.createElement('div');
 c.className='item'+(it.fixed?' fixed':'')+(it.bucket==='trash'&&it.handle?' handled':'');
 c.dataset.id=it.id;
 if(!it.fixed){c.draggable=true;c.ondragstart=e=>e.dataTransfer.setData('text',it.id);}
 c.ondblclick=()=>openItemDetails(it);
 c.title=jl('双击查看详情','Double-click for details','雙擊查看詳情');
 const tag=(it.bucket==='trash'&&it.handle)?' <span class="handle-tag">'+({sell:'💸',donate:'🎁',recycle:'♻️'}[it.handle])+'</span>':'';
 c.innerHTML='<span class="item-name"><b>'+nm(it)+tag+'</b><small>'+esc(it.size)+' · '+it.vol+'m³</small></span>';
 return c;
}

/* ---------------- s2 物品清单（供 s3 之前预览） ---------------- */
renderItems=function(){
 const l=document.getElementById('itemList');l.innerHTML='';
 normalizeItems();
 S.items.forEach(it=>{
  const el=document.createElement('div');
  el.className='item'+(it.fixed?' fixed':'');
  el.draggable=true;
  el.dataset.id=it.id;
  el.innerHTML='<span class="item-name"><b>'+nm(it)+(it.fixed?' <span class="handle-tag">🔧</span>':'')+'</b><small>'+esc(it.size)+' · '+it.vol+'m³</small></span>';
  el.ondragstart=e=>e.dataTransfer.setData('text',it.id);
  el.title=jl('点击编辑','Click to edit','點擊編輯');
  el.addEventListener('click',()=>openEditor(it));
  el.ondblclick=()=>openItemDetails(it);
  l.appendChild(el);
 });
};

/* ---------------- s3 Compare More Options：五区看板 ---------------- */
const HANDLES_META=[
 {h:'sell',icon:'💸',titleKey:'sell'},
 {h:'donate',icon:'🎁',titleKey:'donate'},
 {h:'recycle',icon:'♻️',titleKey:'recycle'}
];
function dropHint(){return '<div class="drop-empty">'+jl('拖到这里','Drop here','拖到這裡')+'</div>';}
function makeHandleGroup(handle,icon,items){
 const g=document.createElement('div');
 g.className='drop-col handle-col '+handle+'-col';
 g.dataset.col='trash';g.dataset.handle=handle;
 const loc=document.createElement('button');
 loc.className='loc-btn';loc.type='button';
 loc.textContent='📍 '+jl('查附近地点','Find locations','查附近地點');
 loc.onclick=ev=>{ev.stopPropagation();openServiceMap(handle);};
 g.innerHTML='<h4>'+icon+' '+handleLabel(handle)+' <span class="count">'+items.length+'</span></h4>';
 items.forEach(it=>g.append(card(it)));
 if(!items.length)g.insertAdjacentHTML('beforeend',dropHint());
 g.append(loc);
 return g;
}
function renderBoard(){
 normalizeItems();
 const board=document.getElementById('board');
 if(!board)return;
 const N=S.trips;
 const tools=document.getElementById('timelineTools');
 if(tools)tools.replaceChildren();
 board.innerHTML='';
 /* 日期列 */
 const dayCols=document.createElement('div');dayCols.className='day-cols';
 dayCols.style.gridTemplateColumns='repeat('+N+',minmax(150px,1fr))';
 for(let i=1;i<=N;i++){
  const slot='day'+i,items=S.items.filter(x=>x.bucket===slot);
  const v=items.reduce((a,x)=>a+x.vol,0);
  const col=document.createElement('div');
  col.className='drop-col day-col';col.dataset.col=slot;
  col.innerHTML='<h3>'+dayLabel(i)+' <span class="v">'+v.toFixed(2)+'m³</span></h3>';
  items.forEach(it=>col.append(card(it)));
  if(!items.length)col.insertAdjacentHTML('beforeend',dropHint());
  dayCols.append(col);
 }
 board.append(dayCols);
 /* 去向列：Buy locally + Leave behind(pending/sell/donate/recycle) */
 const leave=document.createElement('div');leave.className='leave-cols';
 const buyItems=S.items.filter(x=>x.bucket==='buy');
 const buyCol=document.createElement('div');
 buyCol.className='drop-col leave-group buy-col';buyCol.dataset.col='buy';buyCol.dataset.handle='';
 const buyLoc=document.createElement('button');buyLoc.className='loc-btn';buyLoc.type='button';
 buyLoc.textContent='🛒 '+jl('附近购买','Shop nearby','附近購買');
 buyLoc.onclick=ev=>{ev.stopPropagation();openServiceMap('buy');};
 buyCol.innerHTML='<h3>🛍️ '+slotName('buy').replace('🛍️ ','')+' <span class="count">'+buyItems.length+'</span></h3>';
 buyItems.forEach(it=>buyCol.append(card(it)));
 if(!buyItems.length)buyCol.insertAdjacentHTML('beforeend',dropHint());
 buyCol.append(buyLoc);
 leave.append(buyCol);

 const trash=S.items.filter(x=>x.bucket==='trash');
 const lb=document.createElement('div');lb.className='leave-group leave-behind';
 lb.innerHTML='<h3 class="lb-title">🗑️ '+jl('不搬走（选择处理方式）','Leave behind — choose how to handle','不搬走（選擇處理方式）')+'</h3>';
 const pending=trash.filter(x=>!x.handle);
 if(pending.length){
  const pg=document.createElement('div');
  pg.className='drop-col handle-col pending-col';pg.dataset.col='trash';pg.dataset.handle='';
  pg.innerHTML='<h4>'+jl('待处理（拖到下方）','Pending — drag below','待處理（拖到下方）')+' <span class="count">'+pending.length+'</span></h4>';
  pending.forEach(it=>pg.append(card(it)));
  lb.append(pg);
 }
 const handleGrid=document.createElement('div');handleGrid.className='handle-grid';
 DISPOSAL_HANDLES.forEach(h=>{
  const icon=DISPOSAL_QUERIES[h].icon;
  handleGrid.append(makeHandleGroup(h,icon,trash.filter(x=>x.handle===h)));
 });
 lb.append(handleGrid);
 leave.append(lb);
 board.append(leave);
 /* 固定设施 */
 const fixed=S.items.filter(x=>x.fixed);
 if(fixed.length){
  const fx=document.createElement('div');fx.className='fixed-strip';
  fx.innerHTML='<h3>'+slotName('fixed')+'</h3>';
  fixed.forEach(it=>fx.append(card(it)));
  board.append(fx);
 }
 /* 统一拖拽（用 ondragover/ondrop 覆盖，避免重复绑定） */
 board.ondragover=e=>{
  const c=e.target.closest('[data-col]');
  if(c&&!c.closest('.fixed-strip')){e.preventDefault();c.classList.add('over');}
 };
 board.ondragleave=e=>{const c=e.target.closest('[data-col]');if(c)c.classList.remove('over');};
 board.ondrop=e=>{
  const c=e.target.closest('[data-col]');
  if(!c)return;
  e.preventDefault();c.classList.remove('over');
  const id=e.dataTransfer.getData('text');
  const it=S.items.find(x=>x.id===id);
  if(it&&!it.fixed){moveItem(it,c.dataset.col,c.dataset.handle||'');renderBoard();}
 };
 if(typeof mapDock!=='undefined')restoreMap();
}

/* ---------------- 打包估算（单一数据源，UI 与 TXT 共用） ---------------- */
function packingFor(items){
 const v={suitcase:0,soft:0,small:0,medium:0};
 const large=[];
 const assigned={suitcase:[],soft:[],small:[],medium:[],large:[]};
 items.forEach(it=>{
  if(it.fixed||it.bucket==='buy'||it.bucket==='trash')return;
  const n=it.name||'';
  const before={...v},largeBefore=large.length;
  if(/床|沙发|沙發|床垫|床墊|柜|櫃|桌|椅|sofa|mattress|wardrobe|table|desk|bed|chair/i.test(n))large.push(it);
  else if(/书|書|kitchen|厨具|廚具|杂物|雜物|厨具|廚具|books|misc/i.test(n))v.medium+=it.vol;
  else if(/电子|电脑|電腦|装饰|裝飾|化妆品|化妝品|衣|clothes|decor|electronic|laptop|computer/i.test(n))v.small+=it.vol;
  else if(/被|枕|褥|垫|墊|毯|pillow|blanket|linen|bedding|quilt/i.test(n))v.soft+=it.vol;
  else v.suitcase+=it.vol;
  const group=large.length>largeBefore?'large':Object.keys(v).find(k=>v[k]!==before[k])||'suitcase';
  assigned[group].push(it);
 });
 const c={
  suitcase:v.suitcase?Math.max(1,Math.ceil(v.suitcase/0.112)):0,
  soft:v.soft?Math.max(1,Math.ceil(v.soft/0.095)):0,
  small:v.small?Math.max(1,Math.ceil(v.small/0.036)):0,
  medium:v.medium?Math.max(1,Math.ceil(v.medium/0.08)):0,
  large:large.length
 };
 let groupIndex=0;
 const groups=['suitcase','soft','small','medium','large'].filter(k=>c[k]);
 const namesFor=()=>assigned[groups[groupIndex++]].map(it=>nm(it)).slice(0,4).join('、');
 const out=[];
 if(c.suitcase)out.push({cls:'pk1',label:jl('28寸行李箱','28" suitcase','28寸行李箱'),n:c.suitcase,names:namesFor(/电子|电脑|電腦|衣|书|書|日常|clothes|laptop|electronic|computer|book|personal|行李|綠植|绿植|蘿|萝/i)});
 if(c.soft)out.push({cls:'pk2',label:jl('软装袋','Soft bedding bag','軟裝袋'),n:c.soft,names:namesFor(/被|枕|褥|垫|墊|毯|pillow|blanket|linen|bedding|quilt/i)});
 if(c.small)out.push({cls:'pk3',label:jl('加厚小箱','Reinforced small box','加厚小箱'),n:c.small,names:namesFor(/电子|电脑|電腦|装饰|裝飾|化妆品|化妝品|衣|clothes|decor|electronic|laptop|computer/i)});
 if(c.medium)out.push({cls:'pk4',label:jl('中号纸箱','Medium carton','中號紙箱'),n:c.medium,names:namesFor(/书|書|kitchen|厨具|廚具|杂物|雜物|books|misc/i)});
 if(c.large)out.push({cls:'pk5',label:jl('大件独立搬运','Large item (moved separately)','大件獨立搬運'),n:c.large,names:namesFor(/床|沙发|沙發|床垫|床墊|柜|櫃|桌|椅|sofa|mattress|wardrobe|table|bed|chair/i)});
 return out;
}
function renderDayPacking(items){
 const pk=packingFor(items);
 if(!pk.length)return '<p class="pk-none">'+jl('这一天没有需要装箱的物品。','Nothing to pack for this day.','這一天沒有需要裝箱的物品。')+'</p>';
 const rows=pk.map(r=>'<div class="pk-line"><span class="pk-thumb pk-'+r.cls+'" aria-hidden="true"></span>'
  +'<span class="pk-meta"><b>'+esc(r.label)+' ×'+r.n+'</b>'+(r.names?'<small>'+esc(r.names)+'</small>':'')+'</span></div>').join('');
 const note=jl('参考尺寸：28寸行李箱 75×50×30｜软装袋 60×45×35｜小箱 40×30×30｜中号纸箱 50×40×40；大件独立搬运。为参考估算，非精确测量。',
  'Reference sizes: 28" suitcase 75×50×30｜soft bag 60×45×35｜small box 40×30×30｜medium carton 50×40×40; large items move separately. Estimates, not exact.',
  '參考尺寸：28寸行李箱 75×50×30｜軟裝袋 60×45×35｜小箱 40×30×30｜中號紙箱 50×40×40；大件獨立搬運。為參考估算，非精確測量。');
 return '<div class="pk-list">'+rows+'<p class="pk-note">'+note+'</p></div>';
}

/* ---------------- s5 Moving Checklist ---------------- */
renderPlan=function(){
 normalizeItems();
 if(document.body.classList.contains('lowvision'))setTimeout(()=>speak(TF('speakPlan',{n:S.trips})),300);
 const N=S.trips;
 const move=S.items.filter(i=>i.bucket.startsWith('day'));
 const total=move.reduce((a,i)=>a+i.vol,0);
 document.getElementById('planMeta').textContent=TF('s5meta',{d:S.dest?T('d_'+S.dest.id):'—',n:N});
 const k=document.getElementById('kpis');
 k.innerHTML='<div class="kpi"><b>'+move.length+'</b><span>'+T('s5k1')+'</span></div>'
  +'<div class="kpi"><b>'+total.toFixed(2)+'m³</b><span>'+TF('s5k2',{n:N})+'</span></div>'
  +'<div class="kpi"><b>'+(total/N).toFixed(2)+'m³</b><span>'+T('s5k3')+'</span></div>';
 const pd=document.getElementById('planDays');pd.innerHTML='';
 for(let i=1;i<=N;i++){
  const key='day'+i,its=S.items.filter(x=>x.bucket===key);
  const v=its.reduce((a,x)=>a+x.vol,0);
  const list=its.length
   ?its.map(x=>'<label class="plan-check"><input type="checkbox"><span>· '+nm(x)+' <small class="mono" style="color:var(--muted)">'+x.vol+'m³</small></span></label>').join('')
   :'<p style="font-size:13px;color:var(--muted)">'+T('s5empty')+'</p>';
  pd.insertAdjacentHTML('beforeend',
   '<div class="plan-day"><h3>Day '+i+' · '+dayLabel(i)+'</h3><div class="vol">'+its.length+' '+T('s5pcs')+' · '+v.toFixed(2)+'m³</div>'
   +list+'<div class="trip">'+TF('s5trip',{v:v.toFixed(2)})+'</div>'
   +'<div class="pk-block"><h4 class="pk-title">📦 '+jl('当天打包方案','Packing for this day','當天打包方案')+'</h4>'+renderDayPacking(its)+'</div></div>');
 }
 /* 不带走物品：Buy / Resell / Donate / Recycle + 固定设施 */
 const pt=document.getElementById('planTrash');
 const buy=S.items.filter(x=>x.bucket==='buy');
 const fixed=S.items.filter(x=>x.fixed);
 let html='';
 const renderGroup=(title,arr,svc)=>{
  if(!arr.length)return '';
  let s='<div class="trash-group"><h4>'+title+'</h4>';
  arr.forEach(x=>{s+='<div style="font-size:15px;padding:3px 0">· '+nm(x)+'</div>';});
  if(svc)s+='<div class="svc-links">'+svc+'</div>';
  return s+'</div>';
 };
 html+=renderGroup(jl('🛍️ 当地购买','🛍️ Buy locally','🛍️ 當地購買'),buy,
  '<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/'+encodeURIComponent((S.dest?jl('家具 家居','furniture homeware','家具 家居'):'furniture'))+'">'+jl('地图搜附近购买','Search nearby shops on map','地圖搜附近購買')+' ↗</a>');
 html+=renderGroup(jl('💸 转卖','💸 Resell','💸 轉賣'),S.items.filter(x=>x.bucket==='trash'&&x.handle==='sell'),serviceLinks('sell'));
 html+=renderGroup(jl('🎁 捐赠','🎁 Donate','🎁 捐贈'),S.items.filter(x=>x.bucket==='trash'&&x.handle==='donate'),serviceLinks('donate'));
 html+=renderGroup(jl('♻️ 回收','♻️ Recycle','♻️ 回收'),S.items.filter(x=>x.bucket==='trash'&&x.handle==='recycle'),serviceLinks('recycle'));
 const pendingTrash=S.items.filter(x=>x.bucket==='trash'&&!x.handle);
 html+=renderGroup(jl('待处理','Pending','待處理'),pendingTrash);
 html+=renderGroup(slotName('fixed'),fixed);
 pt.innerHTML=html||'<p style="font-size:13px;color:var(--muted)">'+T('s5nothing')+'</p>';
}

/* 服务入口链接（真实官方/平台，不编造门店） */
function serviceLinks(handle){
 const links={
  sell:[['Carousell','https://www.carousell.com.hk/'],[jl('闲鱼','Goofish','閒魚'),'https://www.goofish.com/']],
  donate:[[jl('Salvation Army 救世军','Salvation Army','Salvation Army 救世軍'),'https://www.salvationarmy.org.hk/']],
  recycle:[[jl('香港官方回收地图','HK official recycling map','香港官方回收地圖'),'https://www.wastereduction.gov.hk/zh-hk/recycling-map'],[jl('绿在区区 Green@Community','Green@Community','綠在區區 Green@Community'),'https://www.wastereduction.gov.hk/zh-hk/']]
 }[handle]||[];
 return links.map(([label,url])=>'<a target="_blank" rel="noopener" href="'+url+'">'+label+' ↗</a>').join(' ');
}

/* ---------------- TXT 导出（与页面打包数量一致） ---------------- */
function exportText(){
 normalizeItems();
 const lines=['LoopMove · '+jl('搬家行动清单','Moving checklist','搬家行動清單'),
  S.dest?T('d_'+S.dest.id):'',
  jl('生成日期','Generated','生成日期')+': '+new Date().toLocaleString(),
  ''];
 const N=S.trips;
 for(let i=1;i<=N;i++){
  const key='day'+i,items=S.items.filter(x=>x.bucket===key);
  const v=items.reduce((a,x)=>a+x.vol,0);
  lines.push('Day '+i+' · '+dayLabel(i)+' ('+items.length+' '+jl('件','items','件')+', '+v.toFixed(2)+'m³)');
  items.forEach(x=>lines.push('  [ ] '+nm(x)+' '+x.size+' '+x.vol+'m³'));
  const pk=packingFor(items);
  pk.forEach(r=>lines.push('  📦 '+r.label+' ×'+r.n));
  lines.push('');
 }
 const group=(title,arr,handle)=>{
  if(!arr.length)return;
  lines.push(title);
  arr.forEach(x=>lines.push('  • '+nm(x)+(handle?' → '+handleLabel(handle):'')));
  const svc=handle?({sell:'Carousell https://www.carousell.com.hk/',donate:'Salvation Army https://www.salvationarmy.org.hk/',recycle:'Recycling map https://www.wastereduction.gov.hk/zh-hk/recycling-map'}[handle]||''):'';
  if(svc)lines.push('    '+svc);
  lines.push('');
 };
 group(jl('🛍️ 当地购买','🛍️ Buy locally','🛍️ 當地購買'),S.items.filter(x=>x.bucket==='buy'),null);
 group(jl('💸 转卖','💸 Resell','💸 轉賣'),S.items.filter(x=>x.bucket==='trash'&&x.handle==='sell'),'sell');
 group(jl('🎁 捐赠','🎁 Donate','🎁 捐贈'),S.items.filter(x=>x.bucket==='trash'&&x.handle==='donate'),'donate');
 group(jl('♻️ 回收','♻️ Recycle','♻️ 回收'),S.items.filter(x=>x.bucket==='trash'&&x.handle==='recycle'),'recycle');
 group(jl('待处理','Pending','待處理'),S.items.filter(x=>x.bucket==='trash'&&!x.handle),null);
 group(slotName('fixed'),S.items.filter(x=>x.fixed),null);
 lines.push(jl('装箱数量为粗估，请核对箱子内尺寸及承重。','Packing counts are estimates. Check internal dimensions and weight limits.','裝箱數量為粗估，請核對箱子內尺寸及承重。'));
 return lines.join('\n');
}

/* ================= 物品详情抽屉（点卡片：移动/处理 + 地图） ================= */
const drawer=document.createElement('dialog');drawer.id='itemDrawer';
drawer.innerHTML='<div class="drawer-heading"><h2 id="detailTitle"></h2><button id="closeDetails" aria-label="Close">×</button></div><div id="detailActions"></div><div id="detailBody"></div>';
document.body.append(drawer);
document.getElementById('closeDetails').onclick=()=>{drawer.close();restoreMap();};
drawer.addEventListener('close',restoreMap);
function disposalLinks(it){
 const wrap=document.createElement('div');wrap.className='disposal-links';
 const links=[];
 if(it.handle==='sell')links.push(['Carousell','https://www.carousell.com.hk/']);
 if(it.handle==='donate')links.push([jl('救世军','Salvation Army','救世軍'),'https://www.salvationarmy.org.hk/']);
 if(it.handle==='recycle')links.push([jl('官方回收地图','Official recycling map','官方回收地圖'),'https://www.wastereduction.gov.hk/zh-hk/recycling-map']);
 links.push(['Google Maps','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((it.name||'')+' '+(S.dest?jl('香港','Hong Kong','香港'):''))]);
 links.forEach(([label,url])=>{const a=document.createElement('a');a.className='dlink';a.target='_blank';a.rel='noopener';a.href=url;a.textContent=label+' ↗';wrap.append(a);});
 return wrap;
}
function openItemDetails(it){
 normalizeItems();
 document.getElementById('detailTitle').textContent=nm(it);
 const actions=document.getElementById('detailActions');actions.replaceChildren();
 const old=document.getElementById('stationDetails');if(old)old.remove();
 document.getElementById('detailBody').append(mapCard);mapCard.hidden=false;
 selectMapFor(it);
 if(!it.fixed){
  const move=document.createElement('select');
  [...timelineSlots(),'buy','trash','fixed'].forEach(slot=>{
   const o=document.createElement('option');o.value=slot;o.textContent=slotName(slot);o.selected=it.bucket===slot;move.append(o);
  });
  move.onchange=()=>{moveItem(it,move.value);drawer.close();restoreMap();renderBoard();};
  actions.append(move);
  if(it.bucket==='trash'){
   [['sell',jl('转卖','Resell','轉賣')],['donate',jl('捐赠','Donate','捐贈')],['recycle',jl('回收','Recycle','回收')]].forEach(([v,label])=>{
    const b=document.createElement('button');b.textContent=label;b.className=it.handle===v?'primary':'';
    b.onclick=()=>{it.bucket='trash';it.plan='';it.handle=v;renderBoard();openItemDetails(it);};
    actions.append(b);
   });
  }
  const section=document.createElement('div');section.id='stationDetails';
  section.append(disposalLinks(it));
  document.getElementById('detailBody').append(section);
 }
 if(!drawer.open)showDialog(drawer);
 if(!mapCard.hidden){_mv=null;_gmv=null;ensureMap();refreshMap();}
}

/* ================= 地图：购买/转卖/捐赠/回收 四区 + 三区 Overpass ================= */
const mapDock=document.createElement('aside');mapDock.id='mapDock';
document.querySelector('#s3 .days-wrap').append(mapDock);
mapDock.append(mapCard);
const mapTabs=document.createElement('div');mapTabs.id='mapModes';mapCard.prepend(mapTabs);
function showDialog(el){if(el.showModal)el.showModal();else el.setAttribute('open','');}
function restoreMap(){if(drawer.open)return;mapDock.append(mapCard);mapCard.hidden=false;if(document.getElementById('s3').classList.contains('on')){ensureMap();refreshMap();}}
function selectMapFor(it){
 journey.selected=it.id;
 if(it.bucket==='trash'&&DISPOSAL_HANDLES.includes(it.handle)){journey.mapMode=it.handle;journey.mapCat=null;}
 else if(it.bucket==='buy'){journey.mapMode='buy';journey.mapCat=category(it);}
 else{journey.mapMode='buy';journey.mapCat=null;}
 _mv=null;_gmv=null;
}
function mapTabTitle(mode){
 return ({buy:jl('🛍️ 购买','🛍️ Buy','🛍️ 購買'),sell:jl('💸 二手店','💸 Resell shops','💸 二手店'),donate:jl('🎁 捐赠点','🎁 Donation points','🎁 捐贈點'),recycle:jl('♻️ 回收点','♻️ Recycling points','♻️ 回收點')})[mode]||mode;
}
function renderMapModes(){
 mapTabs.replaceChildren();
 [['buy',mapTabTitle('buy')],['sell',mapTabTitle('sell')],['donate',mapTabTitle('donate')],['recycle',mapTabTitle('recycle')]].forEach(([key,title])=>{
  const b=document.createElement('button');b.type='button';b.textContent=title;
  b.className=journey.mapMode===key?'on':'';
  b.onclick=()=>{journey.mapMode=key;journey.mapCat=null;journey.selected=null;_mv=null;_gmv=null;refreshMap();};
  mapTabs.append(b);
 });
 const head=document.querySelector('#mapCard .mc-head b');
 if(head)head.textContent=journey.mapMode==='buy'?jl('地图对比 · 带走还是当地买？','Map · Move or buy locally?','地圖對比 · 帶走還是當地買？'):jl('地图 · 附近处理地点','Map · Nearby disposal locations','地圖 · 附近處理地點');
}
function openServiceMap(mode){
 journey.mapMode=mode;journey.mapCat=null;journey.selected=null;
 document.getElementById('detailTitle').textContent=mode==='buy'?jl('附近购买','Shop nearby','附近購買'):mapTabTitle(mode);
 document.getElementById('detailActions').replaceChildren();
 document.getElementById('stationDetails')?.remove();
 document.getElementById('detailBody').append(mapCard);mapCard.hidden=false;
 if(!drawer.open)showDialog(drawer);
 _mv=null;_gmv=null;ensureMap();refreshMap();
}

/* 仅 buy 模式显示 mock 设施；处置模式交给 Overpass 点 */
function matchesFacility(f){return journey.mapMode==='buy'&&(!journey.mapCat||f.cat===journey.mapCat);}

const disposalPoints=new Map();
const disposalRequests=new Set();
const OVERPASS_MIRRORS=[
 'https://overpass-api.de/api/interpreter',
 'https://overpass.kumi.systems/api/interpreter',
 'https://overpass.openstreetmap.fr/api/interpreter'
];
function dkey(handle){return (S.dest?S.dest.id:'hsk')+'|'+handle;}
function addressOf(t){
 if(!t)return '';
 if(t['addr:full'])return t['addr:full'];
 const street=t['addr:street']?((t['addr:housenumber']||'')+' '+t['addr:street']).trim():'';
 return street||t['addr:suburb']||t['addr:district']||t['addr:city']||'';
}
function handleKindName(h){
 return h==='sell'?jl('二手店','Second-hand shop','二手店')
  :h==='donate'?jl('捐赠点','Donation point','捐贈點')
  :h==='recycle'?jl('回收点','Recycling point','回收點'):jl('地点','Place','地點');
}
function pointName(p,idx){
 const n=p.tags&&(p.tags.name||p.tags['name:en']||p.tags['name:zh']);
 if(n)return n;
 return handleKindName(p.handle)+(typeof idx==='number'?' #'+(idx+1):'');
}
function normalizeOverpassElement(el,handle){
 const tags=el.tags||{};
 let lat=el.lat,lon=el.lon;
 if((lat==null||lon==null)&&el.center){lat=el.center.lat;lon=el.center.lon;}
 if(lat==null||lon==null)return null;
 return {lat,lon,tags,handle};
}
/* 前端直连 Overpass（仅作后端代理不可用时的回退），逐镜像轮询 */
async function overpassDirect(handle,lat,lng){
 const q=DISPOSAL_QUERIES[handle],d=0.09;
 const bbox=(lat-d)+','+(lng-d)+','+(lat+d)+','+(lng+d);
 let parts='';
 q.tags.forEach(([k,v])=>{parts+='node["'+k+'"="'+v+'"]('+bbox+');way["'+k+'"="'+v+'"]('+bbox+');';});
 const query='[out:json][timeout:15];('+parts+');out center 30;';
 let lastErr=null;
 for(const host of OVERPASS_MIRRORS){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),15000);
  try{
   const r=await fetch(host,{method:'POST',body:'data='+encodeURIComponent(query),signal:ctrl.signal});
   if(!r.ok)throw new Error('overpass '+r.status);
   const j=await r.json();
   return (j.elements||[]).map(el=>normalizeOverpassElement(el,handle)).filter(Boolean);
  }catch(e){lastErr=e;}
  finally{clearTimeout(timer);}
 }
 throw lastErr||new Error('overpass unavailable');
}
async function loadDisposalPoints(handle){
 const cfg=DAY_LOCS[S.dest?S.dest.id:'hsk']||DAY_LOCS.hsk;
 const key=dkey(handle);
 if(disposalPoints.has(key))return disposalPoints.get(key);
 if(disposalRequests.has(key))return [];
 disposalRequests.add(key);
 const lat=cfg.center.lat,lng=cfg.center.lng;
 let pts=[];
 /* 1) 优先后端代理：服务器间无 CORS、带真实 UA、轮询镜像 */
 if(typeof API_BASE!=='undefined'&&API_BASE){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),48000);
  try{
   const r=await fetch(API_BASE+'/api/nearby',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({handle,lat,lng}),signal:ctrl.signal
   });
   if(r.ok){
    const j=await r.json().catch(()=>null);
    if(j&&Array.isArray(j.points)){
     pts=j.points.map(p=>({lat:p.lat,lon:p.lon,
      tags:{name:p.name||'','addr:full':p.addr||'','addr:street':p.addr||''},handle}))
      .filter(p=>p.lat!=null&&p.lon!=null);
    }
   }
  }catch(e){pts=[];}
  finally{clearTimeout(timer);}
 }
 /* 2) 后端拿不到点时回退前端直连镜像 */
 if(!pts.length){
  try{pts=await overpassDirect(handle,lat,lng);}catch(e){pts=[];}
 }
 /* 3) 仍为空：存空数组，渲染层走官方链接回退（disposalFallback） */
 disposalPoints.set(key,pts);
 disposalRequests.delete(key);
 return pts;
}
function disposalPopupHtml(p){
 const addr=addressOf(p.tags);
 return '<div style="font-size:13px;min-width:170px;line-height:1.5"><b>'+esc(pointName(p))+'</b><br>'
  +(addr?'<span style="color:#555">'+esc(addr)+'</span><br>':'')
  +'<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon+'">'+jl('路线与详情 ↗','Directions ↗','路線與詳情 ↗')+'</a></div>';
}
function disposalFallback(handle){
 const wrap=document.createElement('div');wrap.className='disposal-fallback';
 const links={
  sell:[['Carousell','https://www.carousell.com.hk/'],['闲鱼 Goofish','https://www.goofish.com/'],[jl('地图搜二手店','Map: second-hand shops','地圖搜二手店'),'https://www.google.com/maps/search/second+hand+shop/']],
  donate:[['Salvation Army 救世军','https://www.salvationarmy.org.hk/'],[jl('地图搜慈善捐赠','Map: charity donation','地圖搜慈善捐贈'),'https://www.google.com/maps/search/charity+donation/']],
  recycle:[['香港官方回收地图','https://www.wastereduction.gov.hk/zh-hk/recycling-map'],['绿在区区','https://www.wastereduction.gov.hk/zh-hk/'],[jl('地图搜回收点','Map: recycling points','地圖搜回收點'),'https://www.google.com/maps/search/recycling+point/']]
 }[handle]||[];
 links.forEach(([label,url])=>{const a=document.createElement('a');a.className='dlink';a.target='_blank';a.rel='noopener';a.href=url;a.textContent=label+' ↗';wrap.append(a);});
 const note=document.createElement('p');note.className='map-hint';
 note.textContent=handle==='recycle'
  ?jl('电子电器请使用专门电子废物回收渠道；交投前确认接收品类与开放时间。','For electronics use a dedicated e-waste channel; confirm accepted items and hours.','電子電器請使用專門電子廢物回收渠道；交投前確認接收品類與開放時間。')
  :jl('地图暂无数据时，请通过官方入口查询；交投前确认接收品类、开放时间与条件。','If the map has no data, use the official links; confirm accepted items and hours.','地圖暫無數據時，請通過官方入口查詢；交投前確認接收品類、開放時間與條件。');
 wrap.append(note);
 return wrap;
}

/* 地点列表（#shopMatches）：buy 走 mock 设施；处置走 Overpass 真实地址 */
renderShopMatches=function(){
 renderMapModes();
 const out=document.getElementById('shopMatches');if(!out)return;
 out.innerHTML='';
 const handle=journey.mapMode;
 if(handle==='buy'){
  const cfg=DAY_LOCS[S.dest?S.dest.id:'hsk']||DAY_LOCS.hsk;
  const head=document.createElement('div');head.className='shop-head';
  head.innerHTML='<b>'+jl('🛒 目的地就近购买','🛒 Buy near destination','🛒 目的地就近購買')+'</b>';
  out.append(head);
  let count=0;
  cfg.facilities.filter(matchesFacility).forEach(f=>{
   const c=MAP_CATS[f.cat]||MAP_CATS.convenience;
   const a=document.createElement('a');a.className='shop-match';a.target='_blank';a.rel='noopener';
   a.href='https://www.google.com/maps/search/?api=1&query='+f.lat+','+f.lng;
   a.innerHTML=c.icon+' <b>'+esc(t3(f.name))+'</b><small>'+esc(t3(f.addr))+'</small>';
   out.append(a);count++;
  });
  if(!count)out.insertAdjacentHTML('beforeend','<p class="map-hint">'+jl('正在加载购买点…','Loading shops…','正在加載購買點…')+'</p>');
  return;
 }
 const head=document.createElement('div');head.className='shop-head';
 head.innerHTML='<b>'+mapTabTitle(handle)+'</b>';
 out.append(head);
 const pts=disposalPoints.get(dkey(handle));
 if(pts===undefined){
  out.insertAdjacentHTML('beforeend','<p class="map-hint">'+jl('正在查找附近地点…','Finding nearby places…','正在查找附近地點…')+'</p>');
 }else if(pts.length===0){
  out.insertAdjacentHTML('beforeend','<p class="map-hint">'+jl('地图暂无该区域数据，请使用下方官方入口。','No map data for this area yet — please use the official links below.','地圖暫無該區域數據，請使用下方官方入口。')+'</p>');
 }else{
  pts.slice(0,10).forEach((p,idx)=>{
   const a=document.createElement('a');a.className='shop-match';a.target='_blank';a.rel='noopener';
   a.href='https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon;
   a.innerHTML='<b>'+esc(pointName(p,idx))+'</b>'+(addressOf(p.tags)?'<small>'+esc(addressOf(p.tags))+'</small>':'<small>'+jl('点此查看位置与路线','View location & directions','點此查看位置與路線')+'</small>');
   out.append(a);
  });
 }
 out.append(disposalFallback(handle));
};

/* 刷新地图（自定义：buy 走 mock；处置触发 Overpass 并叠加真实点） */
refreshMap=function(){
 const handle=journey.mapMode;
 const renderNow=()=>{if(_gmap)renderGMap();else if(_map)renderMap();renderLegend();renderShopMatches();};
 if(handle==='buy'){_mv=null;_gmv=null;renderNow();return;}
 if(!disposalPoints.has(dkey(handle))&&!disposalRequests.has(dkey(handle))){
  loadDisposalPoints(handle).then(()=>{_mv=null;_gmv=null;renderNow();});
 }else{renderNow();}
};

/* 在 Leaflet 与 Google 地图上叠加处置点 */
const baseRenderMap=renderMap;
renderMap=function(){
 const resetView=_mv===null;
 baseRenderMap();
 if(!_map||journey.mapMode==='buy')return;
 const handle=journey.mapMode,pts=disposalPoints.get(dkey(handle))||[];
 const q=DISPOSAL_QUERIES[handle];
 pts.forEach(p=>{
  const ic=L.divIcon({className:'',html:'<div class="lm-pin '+q.pin+'">'+q.icon+'</div>',iconSize:[32,32],iconAnchor:[16,16]});
  L.marker([p.lat,p.lon],{icon:ic}).addTo(_layer).bindPopup(disposalPopupHtml(p),{maxWidth:260});
 });
 if(pts.length&&resetView){try{_map.fitBounds(L.latLngBounds(pts.map(p=>[p.lat,p.lon])).pad(0.15));}catch(e){}}
};
const baseRenderGMap=renderGMap;
renderGMap=function(){
 baseRenderGMap();
 if(!_gmap||journey.mapMode==='buy')return;
 const handle=journey.mapMode,pts=disposalPoints.get(dkey(handle))||[];
 const q=DISPOSAL_QUERIES[handle],color={sell:'#1c5a3c',donate:'#7c3aed',recycle:'#b3261e'}[handle];
 const bounds=new google.maps.LatLngBounds();
 pts.forEach(p=>{
  const m=new google.maps.Marker({position:{lat:p.lat,lng:p.lon},map:_gmap,icon:gIcon(color,q.icon),title:pointName(p)});
  m.addListener('click',()=>{if(_ginfo)_ginfo.close();_ginfo=new google.maps.InfoWindow({content:disposalPopupHtml(p),maxWidth:260});_ginfo.open({map:_gmap,anchor:m});});
  bounds.extend(m.getPosition());
 });
 if(pts.length){try{_gmap.fitBounds(bounds,{top:30,right:30,bottom:30,left:30});}catch(e){}}
};

/* ================= AI 一次性分类 + 分天 ================= */
/* 连续非空重平衡：AI/规则分天后保证选定的每一天都有物品，不出现空天；
   天数按移动物品数在 2~4 间收缩（尊重用户选的 S.trips，封顶 4），避免东西少却留空天。
   只在自动安排（AI / 本地规则）后调用一次，不覆盖用户后续手动拖拽。 */
function rebalanceDays(){
 const moving=S.items.filter(i=>!i.fixed&&i.bucket!=='buy'&&i.bucket!=='trash'&&/^day\d+$/.test(i.bucket));
 const m=moving.length;
 if(!m)return;
 /* 保留 AI/规则给出的先后：原 day 升序，同天按体积降序（大件先搬） */
 moving.sort((a,b)=>{
  const da=+a.bucket.replace('day',''),db=+b.bucket.replace('day','');
  return da-db||b.vol-a.vol;
 });
 let K;
 if(m===1)K=1;
 else K=Math.max(2,Math.min(S.trips,m,4));
 S.trips=K;
 const per=Math.ceil(m/K);
 moving.forEach((it,i)=>{it.bucket='day'+(Math.floor(i/per)+1);});
 /* 同步 AI 说明里的 day，避免文案与实际安排不符 */
 if(Array.isArray(journey.lastArrange)){
  moving.forEach(it=>{
   const r=journey.lastArrange.find(x=>x.id===it.id);
   if(r)r.day=+it.bucket.replace('day','');
  });
 }
}
function ruleFallback(){
 normalizeItems();
 const N=S.trips;
 const moving=S.items.filter(i=>!i.fixed&&i.bucket!=='buy'&&i.bucket!=='trash');
 const aiSuggest=moving.filter(i=>urgency(i)===3&&i.vol<0.03);
 const keep=moving.filter(i=>!aiSuggest.includes(i));
 const sorted=keep.slice().sort((a,b)=>urgency(a)-urgency(b)||b.vol-a.vol);
 distribute(sorted,N,S.purpose||'phased');
 rebalanceDays();
 renderBoard();
}
/* AI 分类结果的文案：按当前语言实时生成，切换语言时可用同一份数据重排，避免残留旧语言 */
function arrangeHeadText(){
 return jl('AI 已完成分类与分天（可手动调整）：','AI finished classifying & scheduling (adjustable):','AI 已完成分類與分天（可手動調整）：');
}
function arrangeReasonText(){
 const arr=journey.lastArrange||[];
 const sep=jl('：',': ','：');
 return arr.slice(0,14).map(r=>{
  const it=S.items.find(x=>x.id===r.id);
  const name=it?nm(it):r.id;
  let why;
  if(LANG==='zhHans')why=r.reason||'';
  else if(r.decision==='fixed')why=jl('固定设施，留在原处','Fixed fixture — stays in place','固定設施，留在原處');
  else if(r.decision==='buy')why=jl('当地购买，不搬运','Buy locally — no need to move','當地購買，不搬運');
  else if(r.decision==='trash'){
   why=r.handle==='sell'?jl('当地转卖','Resell locally','當地轉賣')
     :r.handle==='donate'?jl('捐赠出去','Donate','捐贈出去')
     :r.handle==='recycle'?jl('回收处理','Recycle','回收處理')
     :jl('不搬走','Leave behind','不搬走');
  }else why=jl('安排到第 '+(r.day||1)+' 天','Scheduled to Day '+(r.day||1),'安排到第 '+(r.day||1)+' 天');
  return '· '+name+sep+why;
 }).join('\n');
}
async function smartArrange(){
 if(journey.arranging)return;
 normalizeItems();
 const moving=S.items.filter(i=>!i.fixed);
 if(!moving.length){bAlert(jl('还没有可安排的物品，请先识别或添加。','No items to plan yet — add or scan some first.','還沒有可安排的物品，請先識別或添加。'));return;}
 const why=document.getElementById('aiWhy');why.style.display='block';
 const tEl=document.getElementById('aiWhyText');
 const sEl=document.getElementById('aiSuggestBox');if(sEl)sEl.innerHTML='';
 const btn=document.getElementById('autoSplit');btn.disabled=true;
 journey.arranging=true;
 const done=()=>{journey.arranging=false;btn.disabled=false;};
 try{
  if(IS_STATIC){
   tEl.textContent=jl('正在用本地规则分天…','Planning with local rules…','正在用本地規則分天…');
   ruleFallback();
   tEl.textContent=jl('网页版使用本地规则分天（AI 分类与日期安排需联网后端）。','Web demo uses local rules (AI classification needs the online service).','網頁版使用本地規則分天（AI 分類與日期安排需聯網後端）。');
   done();return;
  }
  tEl.textContent=jl('正在唤醒 AI 服务…','Waking up the AI service…','正在喚醒 AI 服務…');
  const ready=await waitForApiReady(()=>{});
  if(ready!=='ok'){
   tEl.textContent=(ready==='blocked') ? ((typeof aiBlockedMsg==='function')?aiBlockedMsg():jl('此页面无法连接 AI 服务，请用线上版。','Cannot reach the AI service.','此頁面無法連線 AI 服務，請用線上版。')) : jl('AI 服务启动超时。当前安排已保留，可稍后重试或手动拖拽。','AI service startup timed out. Your plan is kept — retry later or drag manually.','AI 服務啟動逾時。當前安排已保留，可稍後重試或手動拖拽。');
   done();return;
  }
  const N=S.trips;
  const cfg=DAY_LOCS[S.dest?S.dest.id:'hsk']||DAY_LOCS.hsk;
  const payload={
   classify:true,
   lang:LANG,
   dates:[...Array(N)].map((_,i)=>'Day '+(i+1)),
   context:{dest:t3(cfg.destinationName),goal:S.purpose||'phased'},
   items:S.items.map(it=>({id:it.id,name:nm(it),kind:it.kind,size:it.size,vol:it.vol,fixed:!!it.fixed}))
  };
  tEl.textContent=jl('AI 正在分类（带走/当地购买/转卖/捐赠/回收）并安排日期…','AI is classifying (move/buy/resell/donate/recycle) and scheduling…','AI 正在分類（帶走/當地購買/轉賣/捐贈/回收）並安排日期…');
  /* 冷启动刚结束时后端偶发 502/网络抖动：自动重试一次，避免第一次点就失败 */
  let res=null,j=null;
  for(let attempt=1;attempt<=2;attempt++){
   const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),90000);
   try{
    res=await fetch(API_BASE+'/api/arrange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ctrl.signal});
   }catch(netErr){
    if(attempt===1){await new Promise(r=>setTimeout(r,1500));continue;}
    throw netErr;
   }finally{clearTimeout(to);}
   j=await res.json().catch(()=>null);
   if(res.ok)break;
   if(attempt===1&&res.status>=500){await new Promise(r=>setTimeout(r,1500));continue;}
   throw new Error((j&&(j.message||j.error))||'arrange failed');
  }
  if(!res||!res.ok)throw new Error('arrange failed');
  if(!j||!Array.isArray(j.items))throw new Error('bad payload');
  /* 前端防御校验：不通过则整体拒绝应用，保留当前选择 */
  const byId={};
  for(const r of j.items){if(byId[r.id])throw new Error('dup');byId[r.id]=r;}
  for(const it of S.items){
   const r=byId[it.id];
   if(!r)throw new Error('missing');
   if(it.fixed)continue;
   if(r.decision==='move'&&(!Number.isInteger(r.day)||r.day<1||r.day>N))throw new Error('bad day');
   if(r.decision==='trash'&&!DISPOSAL_HANDLES.includes(r.handle))throw new Error('bad handle');
   if(!['move','buy','trash','fixed'].includes(r.decision))throw new Error('bad decision');
  }
  /* 应用 */
  S.items.forEach(it=>{
   if(it.fixed){it.bucket='fixed';it.plan='';it.handle='';return;}
   const r=byId[it.id];
   if(r.decision==='move'){it.bucket='day'+r.day;it.plan='';it.handle='';}
   else if(r.decision==='buy'){it.bucket='buy';it.plan='rebuy';it.handle='';}
   else if(r.decision==='trash'){it.bucket='trash';it.plan='';it.handle=r.handle;}
   else if(r.decision==='fixed'){it.fixed=true;it.bucket='fixed';it.plan='';it.handle='';}
  });
  S.trips=N;
  journey.arrangement='ai';journey.edited=false;
  journey.lastArrange=j.items.slice();   /* 记住结果，切换语言时可按新语言重排这段说明 */
  rebalanceDays();   /* 保证每一天都有物品、不出现空天，天数随物品数收缩到 2~4 */
  renderBoard();
  const head=arrangeHeadText();
  tEl.textContent=head+'\n'+arrangeReasonText();
  if(document.body.classList.contains('lowvision'))speak(head.replace(/\n/g,' '));
  refreshMap();
 }catch(err){
  const net=/failed to fetch|network|load failed/i.test((err&&err.message)||'')||err.name==='TypeError';
  tEl.textContent=net
   ? ((typeof aiBlockedMsg==='function')?aiBlockedMsg():jl('此页面无法连接 AI 服务。','Cannot reach the AI service.','此頁面無法連線 AI 服務。'))
   : jl('AI 安排失败，当前选择已保留。可重试，或直接拖拽手动分类。','AI planning failed. Your current choices are kept — retry or drag manually.','AI 安排失敗，當前選擇已保留。可重試，或直接拖拽手動分類。');
 }finally{done();}
}
const autoSplitBtn=document.getElementById('autoSplit');
if(autoSplitBtn)autoSplitBtn.onclick=()=>{smartArrange();};

/* ================= 导航：4 步（1/2/3/5），s4 已删除 ================= */
renderModal=function(){/* 独立 Decide Item Destination 页已删除，去向操作合并进 Compare More Options */};
go=function(n){
 document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
 const el=document.getElementById('s'+n);if(el)el.classList.add('on');
 document.querySelectorAll('.steps [data-step]').forEach(b=>b.classList.toggle('on',+b.dataset.step===n));
 window.scrollTo(0,0);
 if(document.body.classList.contains('lowvision'))speak(T('nav'+n));
 if(n===3){renderBoard();ensureMap();}
 if(n===5){renderPlan();}
 const tz=document.getElementById('trashZone');if(tz)tz.classList.remove('show');
};

/* s5 导出 TXT 按钮 */
// The four-step journey replaces the hidden legacy goal dialog.
function openJourneyStep(n){
 if((n===3||n===5)&&!S.items.length){bAlert(T('noItems'));return;}
 go(n);
}
document.getElementById('to3').onclick=()=>openJourneyStep(3);
document.getElementById('to4').onclick=()=>openJourneyStep(5);
document.querySelectorAll('.steps [data-step]').forEach(button=>{
 button.onclick=()=>openJourneyStep(Number(button.dataset.step));
});

(function(){
 const row=document.querySelector('#s5 .row');
 if(row&&!document.getElementById('exportTxt')){
  const btn=document.createElement('button');btn.className='primary';btn.id='exportTxt';
  btn.textContent=jl('⬇ 导出 TXT 清单','⬇ Export TXT plan','⬇ 導出 TXT 清單');
  btn.onclick=()=>{
   const blob=new Blob([exportText()],{type:'text/plain;charset=utf-8'});
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='LoopMove-moving-plan.txt';a.click();
  };
  row.append(btn);
 }
})();
/* 右下角旧垃圾桶浮层已被页面内五区取代：隐藏并修正其跳转 */
(function(){
 const tz=document.getElementById('trashZone');
 if(tz)tz.style.display='none';
 const t4=document.getElementById('trashToStep4');
 if(t4)t4.onclick=()=>{document.getElementById('trashMask').classList.remove('show');go(5);};
})();

/* ================= 三语 ================= */
const journeyLabels=()=>{
 const names=[
  jl('1 行程详情','1 Move details','1 行程詳情'),
  jl('2 房间物品','2 Room inventory','2 房間物品'),
  jl('3 对比更多选择','3 Compare more options','3 對比更多選擇'),
  jl('4 搬家清单','4 Moving checklist','4 搬家清單')
 ];
 Object.assign(I18N[LANG],{
  nav1:names[0],nav2:names[1],nav3:names[2],nav5:names[3],
  s3to4:names[3]+' →',
  s5back:'← '+names[2]
 });
};
function compactLabels(){journeyLabels();}
applyLang=function(){
 journeyLabels();
 document.documentElement.lang={en:'en',zhHant:'zh-Hant',zhHans:'zh-Hans'}[LANG];
 document.body.classList.toggle('hant',LANG==='zhHant');
 /* 语言按钮高亮：基类 applyLang 有这一步，覆盖时必须一并保留，否则点了「简」文字变了但按钮不变色 */
 document.querySelectorAll('#langSwitch button').forEach(x=>x.classList.toggle('on',x.dataset.lang===LANG));
 document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(k in(I18N[LANG])||k in I18N.en)el.textContent=T(k);});
 const current=document.querySelector('.screen.on');
 if(current){const n=current.id;if(n==='s3')renderBoard();if(n==='s5')renderPlan();}
 renderItems();
 /* 已生成过 AI 分类说明的，切换语言后按新语言重排，避免中英混排 */
 try{
  const box=document.getElementById('aiWhy'),tEl=document.getElementById('aiWhyText');
  if(box&&tEl&&box.style.display!=='none'&&journey.lastArrange&&journey.lastArrange.length){
   tEl.textContent=arrangeHeadText()+'\n'+arrangeReasonText();
  }
 }catch(e){}
};
/* 初始化：重新应用语言（注入五区/导航文案），再渲染看板
   分开兜底：看板渲染失败不影响第一步内容展示 */
try{applyLang();}catch(e){console.error('journey applyLang',e);}
try{renderBoard();}catch(e){console.error('journey renderBoard',e);}
