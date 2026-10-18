/* Recognition contract: genuine model coordinates only, in image percentages. */
(function(root){
 'use strict';
 const FIXTURE=/窗户|窗戶|窗框|内置柜|內置櫃|嵌入式柜|嵌入式櫃|固定橱柜|固定櫥櫃|吊扇|吸顶灯|吸頂燈|壁灯|壁燈|墙装空调|牆裝冷氣|window|built[ -]?in (?:cabinet|wardrobe|cupboard)|ceiling (?:fan|light)|wall[ -]mounted (?:air conditioner|ac|shelf|light)|^门$|^門$|^door$/i;
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
 function item(value,lang,format){
  if(!value||typeof value!=='object')return null;
  const localized=names(value.names),name=localized[lang]||(typeof value.name==='string'?value.name.trim():'');
  if(!name)return null;
  const fixed=value.fixed===true||FIXTURE.test([name,...Object.values(localized)].join(' '));
  const vol=Number(value.vol);
  return {...value,name,names:localized,fixed,bbox:bbox(value.bbox,value.bbox_format||format),vol:Number.isFinite(vol)&&vol>=0?vol:undefined};
 }
 function displayName(it,lang){return it.nameEdited?it.name:(it.names?.[lang]||it.name||'');}
 const api={language,bbox,item,displayName,isFixture:name=>FIXTURE.test(name)};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.LoopMoveRecognition=api;
})(typeof window==='undefined'?globalThis:window);
