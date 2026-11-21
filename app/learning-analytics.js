(function(root){'use strict';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const pct=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const num=x=>Number.isInteger(x)&&x>=0?x:0;
const list=x=>Array.isArray(x)?x:[];
function plan(stats,wrong){
 const topics=list(stats?.topics), weak=list(stats?.weak), by=new Map();
 for(const t of [...topics,...weak]){if(!t||!uuid(t.topic_id))continue; const old=by.get(t.topic_id); by.set(t.topic_id,{...old,...t});}
 const evidence=new Map(), seen=new Set();
 for(const r of list(wrong?.items)){if(!r||!uuid(r.topic_id)||!['sai','bo_trong','xem_dap_an','dung_nhung_co_goi_y'].includes(r.loai_loi))continue;
 const key=JSON.stringify([r.topic_id,r.problem_id||null,r.attempt_id||null,r.at||null,r.src,r.loai_loi]);if(seen.has(key))continue;seen.add(key);
 const e=evidence.get(r.topic_id)||{name:r.topic||'Chuyên đề',events:0}; e.events++;evidence.set(r.topic_id,e);}
 const rows=[];
 for(const [id,t] of by){const n=num(t.n_distinct);const enough=t.status==='co_du_lieu'&&n>=5&&pct(t.mastery_pct);const e=evidence.get(id);rows.push({id,name:String(t.ten||e?.name||'Chuyên đề'),n,pct:enough?t.mastery_pct:null,events:e?.events||0,status:!enough?'insufficient':t.mastery_pct<70?'review':'observed'}); evidence.delete(id);}
 for(const [id,e] of evidence)rows.push({id,name:String(e.name),n:0,pct:null,events:e.events,status:'insufficient'});
 rows.sort((a,b)=>(a.status==='review'?0:1)-(b.status==='review'?0:1)||(b.events-a.events)||(a.pct??101)-(b.pct??101)||a.id.localeCompare(b.id));
 return {rows, actions:rows.filter(r=>r.status==='review'||r.events>0).slice(0,3).map(r=>({...r,count:5,href:'chuyen-de.html?mode=practice&count=5#'+encodeURIComponent(r.id)}))};
}
const api={plan};if(typeof module==='object'&&module.exports)module.exports=api;else root.TBLLearningAnalytics=api;
})(typeof globalThis==='object'?globalThis:this);
