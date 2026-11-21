(function(root){'use strict';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const kinds=new Set(['sai','bo_trong','xem_dap_an','dung_nhung_co_goi_y']);
function groups(data){const m=new Map();for(const r of (Array.isArray(data?.items)?data.items:[])){if(!r||!uuid(r.topic_id)||!uuid(r.problem_id)||!kinds.has(r.loai_loi))continue;let g=m.get(r.topic_id);if(!g){g={id:r.topic_id,name:String(r.topic||'Chuyên đề'),ids:[]};m.set(g.id,g);}if(!g.ids.includes(r.problem_id))g.ids.push(r.problem_id);}return [...m.values()];}
function href(g,kid){if(!uuid(kid)||!uuid(g?.id))return null;return 'chuyen-de.html?mode=review&student='+encodeURIComponent(kid)+'#'+encodeURIComponent(g.id);}
function select(data,topic,problems){const g=groups(data).find(x=>x.id===topic);if(!g)return [];const m=new Map((Array.isArray(problems)?problems:[]).filter(p=>p&&p.topic_id===topic&&p.trang_thai==='da_dang'&&p.loai==='tu_luan').map(p=>[p.id,p]));return g.ids.filter(id=>m.has(id)).slice(0,5).map(id=>m.get(id));}
const api={groups,href,select,uuid};if(typeof module==='object'&&module.exports)module.exports=api;else root.TBLReviewPractice=api;
})(typeof globalThis==='object'?globalThis:this);
