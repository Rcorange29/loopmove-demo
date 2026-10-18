(function(root){
 'use strict';
 function resetItems(items){
  for(const it of items){it.bucket=it.fixed?'fixed':'pending';it.plan='';it.handle='';it.day=null;it.ch=null;it.classified=false;delete it.aiDisposal;}
 }
 function disposalItems(items){return items.filter(i=>!i.fixed&&['buy','trash'].includes(i.bucket)&&!i.handle);}
 function validateDisposal(data,items){
  if(data.error||data.mode==='demo'||!Array.isArray(data.items)||data.items.length!==items.length)throw new Error('Invalid disposal suggestions');
  const expected=new Set(items.map(i=>i.id)),seen=new Set();
  for(const row of data.items){
   if(!row||!expected.has(row.id)||seen.has(row.id)||!['sell','donate','recycle'].includes(row.handle)||typeof row.reason!=='string'||!row.reason.trim())throw new Error('Invalid disposal suggestions');
   seen.add(row.id);
  }
  return data.items;
 }
 function snapshot(items,dates,lang){return JSON.stringify({lang,dates,items:items.map(i=>({id:i.id,name:i.name,kind:i.kind,vol:i.vol,fixed:i.fixed,bucket:i.bucket,handle:i.handle,plan:i.plan}))});}
 const api={resetItems,disposalItems,validateDisposal,snapshot};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.LoopMovePlanning=api;
})(typeof window==='undefined'?globalThis:window);
