/* Recognition contract: genuine model coordinates only, in image percentages. */
(function(root){
 'use strict';
 const FIXTURE=/窗户|窗戶|窗框|内置柜|內置櫃|嵌入式[^，。]*[柜櫃]|固定橱柜|固定櫥櫃|吊扇|吸顶灯|吸頂燈|壁灯|壁燈|墙装空调|牆裝冷氣|window|built[ -]?in (?:[a-z]+ ){0,2}(?:cabinet|wardrobe|cupboard)|ceiling (?:fan|light)|wall[ -]mounted (?:air conditioner|ac|shelf|light)|^门$|^門$|^door$/i;
 function language(value){return value==='en'?'en':value==='zhHant'?'zh-Hant':'zh-Hans';}
 function bbox(value,format='xyxy_percent'){
  if(!Array.isArray(value)||value.length!==4||!value.every(Number.isFinite))return null;
  let b=value.slice();
  if(format==='xyxy_normalized')b=b.map(n=>n*100);
  else if(format==='xyxy_1000')b=b.map(n=>n/10);
  else if(format!=='xyxy_percent')return null;
  if(b.some(n=>n<0||n>100)||b[2]<=b[0]||b[3]<=b[1])return null;
  return b;
 }
 function names(value){
  const out={};
  if(value&&typeof value==='object')for(const [key,aliases] of Object.entries({en:['en'],zhHans:['zhHans','zh-Hans','hans'],zhHant:['zhHant','zh-Hant','hant']})){
   const v=aliases.map(k=>value[k]).find(v=>typeof v==='string'&&v.trim());if(v)out[key]=v.trim();
  }
  return out;
 }
 // Compatibility for the old live API, which returns Chinese-only names.
 // This translates known household terms; unknown names require review instead
 // of leaking a different language or inventing a specific object identity.
 const TERMS=[
  ['吊扇灯|吊扇燈','ceiling fan light'],['嵌入式床头柜|嵌入式床頭櫃','built-in bedside cabinet'],
  ['落地窗帘|落地窗簾','floor-length curtains'],['床头柜|床頭櫃','bedside cabinet'],
  ['双人床|雙人床','double bed'],['单人床|單人床','single bed'],['办公转椅|辦公轉椅','office swivel chair'],
  ['办公椅|辦公椅','office chair'],['装饰画|裝飾畫','wall art'],['装饰盆栽|裝飾盆栽','decorative potted plant'],
  ['笔记本电脑|筆記型電腦|手提電腦','laptop'],['台式电脑|桌上型電腦','desktop computer'],
  ['空调|空調|冷氣機','air conditioner'],['行李箱|拉杆箱|拉桿箱','suitcase'],
  ['床品套件','bedding set'],['床架','bed frame'],['床垫|床墊','mattress'],['床品','bedding'],
  ['吊扇','ceiling fan'],['吸顶灯|吸頂燈','ceiling light'],['壁灯|壁燈','wall light'],['落地灯|落地燈','floor lamp'],['台灯|檯燈','desk lamp'],
  ['书桌|書桌','desk'],['书柜|書櫃','bookcase'],['书架|書架','bookshelf'],['衣柜|衣櫃','wardrobe'],
  ['橱柜|櫥櫃','kitchen cabinet'],['储物柜|儲物櫃','storage cabinet'],['鞋柜|鞋櫃','shoe cabinet'],
  ['沙发|沙發','sofa'],['茶几','coffee table'],['餐桌','dining table'],['餐椅','dining chair'],
  ['转椅|轉椅','swivel chair'],['椅子','chair'],['凳子','stool'],['桌子','table'],
  ['窗帘|窗簾','curtains'],['窗户|窗戶','window'],['窗框','window frame'],['窗帘杆|窗簾桿','curtain rod'],
  ['靠垫|靠墊','cushion'],['抱枕','cushion'],['枕头|枕頭','pillow'],['被子','quilt'],['棉被','quilt'],['毯子','blanket'],
  ['地毯','rug'],['盆栽','potted plant'],['绿植|綠植','plant'],['花盆','plant pot'],['挂画|掛畫','wall art'],
  ['电视机|電視機|电视|電視','television'],['显示器|顯示器','monitor'],['电脑|電腦','computer'],['键盘|鍵盤','keyboard'],
  ['冰箱','refrigerator'],['洗衣机|洗衣機','washing machine'],['微波炉|微波爐','microwave'],['电饭煲|電飯煲','rice cooker'],
  ['收纳箱|收納箱','storage box'],['纸箱|紙箱','cardboard box'],['书本|書本|书籍|書籍','books'],
  ['镜子|鏡子','mirror'],['时钟|時鐘','clock'],['风扇|風扇','fan'],['垃圾桶','waste bin'],
  ['嵌入式|内置|內置','built-in'],['壁挂式|壁掛式|挂壁式|掛壁式','wall-mounted'],
  ['双层|雙層','double-layer'],['单层|單層','single-layer'],['黑框','black-framed'],['白框','white-framed'],
  ['布艺|布藝','upholstered'],['木质|木質|木制|木製','wooden'],['实木|實木','solid wood'],['金属|金屬','metal'],
  ['小型|小号|小號','small'],['大型|大号|大號','large'],['中型|中号|中號','medium'],
  ['黑色','black'],['白色','white'],['灰色','grey'],['绿色|綠色','green'],['蓝色|藍色','blue'],['粉色','pink'],['橙色','orange'],['棕色','brown'],['银色|銀色','silver'],
  ['装饰|裝飾','decorative'],['落地','freestanding'],['小','small'],['大','large'],['床','bed'],['门|門','door']
 ].flatMap(([patterns,en])=>patterns.split('|').map(zh=>({zh,en}))).sort((a,b)=>b.zh.length-a.zh.length);
 const CJK=/[\u3400-\u9fff]/;
 function englishName(value){
  if(!value)return null;
  if(!CJK.test(value))return value;
  let remaining=value.trim(),words=[];
  while(remaining){
   const term=TERMS.find(t=>remaining.startsWith(t.zh));
   if(term){words.push(term.en);remaining=remaining.slice(term.zh.length);continue;}
   const separator=remaining.match(/^[\s，、,()（）·:：—-]+/);if(separator){remaining=remaining.slice(separator[0].length);continue;}
   const ascii=remaining.match(/^[A-Za-z0-9][A-Za-z0-9 ._-]*/);if(ascii){words.push(ascii[0].trim());remaining=remaining.slice(ascii[0].length);continue;}
   // Parenthetical bedding is factual and may be translated without changing identity.
   const include=remaining.match(/^含(床品|床垫|床墊)/);if(include){words.push('with '+(include[1]==='床品'?'bedding':'mattress'));remaining=remaining.slice(include[0].length);continue;}
   return null;
  }
  const text=words.join(' ').replace(/\s+/g,' ').trim();return text?text[0].toUpperCase()+text.slice(1):null;
 }
 function localizedNames(value){
  const localized=names(value.names),source=typeof value.sourceName==='string'?value.sourceName:typeof value.name==='string'?value.name.trim():'';
  const candidate=localized.en||source;
  localized.en=englishName(candidate)||englishName(source)||'Item — name needs review';
  // Prefer model-provided names. The older service normally supplies simplified Chinese.
  if(!localized.zhHans)localized.zhHans=CJK.test(source)?source:'待确认物品';
  if(!localized.zhHant)localized.zhHant=CJK.test(source)?toTraditional(source):'待確認物品';
  return localized;
 }
 function toTraditional(text){
  const pairs=['柜櫃','头頭','双雙','层層','帘簾','艺藝','饰飾','画畫','灯燈','嵌嵌','绿綠','书書','电電','脑腦','笔筆','记記','转轉','办辦','质質','实實','单單','垫墊','枕枕','机機','调調','风風','墙牆','内內','门門','户戶','橱櫥','储儲','镜鏡','钟鐘','蓝藍','银銀','号號','纳納','纸紙','挂掛','显顯','键鍵','盘盤','炉爐','饭飯'];
  const map=Object.fromEntries(pairs.map(p=>[p[0],p[1]]));return [...text].map(c=>map[c]||c).join('');
 }
 function item(value,lang,format){
  if(!value||typeof value!=='object')return null;
  const sourceName=typeof value.name==='string'?value.name.trim():'';
  const rawNames=names(value.names);if(!sourceName&&!Object.values(rawNames).length)return null;
  const localized=localizedNames(value),name=localized[lang]||localized.en;
  const fixed=value.fixed===true||FIXTURE.test([sourceName,...Object.values(localized)].join(' '));
  const vol=value.vol==null?NaN:Number(value.vol);
  return {...value,sourceName,name,names:localized,nameNeedsReview:name.includes('name needs review')||name==='待确认物品'||name==='待確認物品',fixed,bbox:bbox(value.bbox,value.bbox_format||format),vol:Number.isFinite(vol)&&vol>=0?vol:undefined};
 }
 function displayName(it,lang){return it.nameEdited?it.name:localizedNames(it)[lang]||'';}
 const api={language,bbox,item,displayName,englishName,isFixture:name=>FIXTURE.test(name)};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LoopMoveRecognition=api;
})(typeof window==='undefined'?globalThis:window);
