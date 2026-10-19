
(function(){
'use strict';
var base='/ky-thi/';
function hasDemo(){return new URLSearchParams(location.search).get('demo')==='1'}
function isLive(e){return e&&e.published===true&&e.verified===true&&typeof e.slug==='string'&&/^[-a-z0-9]+$/.test(e.slug)&&!!e.name}
function safeUrl(u){try{var x=new URL(u,location.origin);return ['https:','http:'].includes(x.protocol)?x.href:null}catch(e){return null}}
function txt(x, fallback){if(x===0)return '0';if(x===false)return 'Không';return typeof x==='string'&&x.trim()?x.trim():fallback||'Đang cập nhật từ ban tổ chức'}
function date(x){if(!/^\d{4}-\d{2}-\d{2}$/.test(x||''))return 'Đang cập nhật';var a=x.split('-');return a[2]+'/'+a[1]+'/'+a[0]}
function node(tag,cls,content){var n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n}
function link(href,label,klass){var a=node('a',klass,label);a.href=href;return a}
function load(){
 var u='https://vmttxgndosucjpysdrzg.supabase.co/rest/v1/olympic_competitions?select=*&order=exam_date.asc.nullslast&limit=200';
 return fetch(u,{cache:'no-store',headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdHR4Z25kb3N1Y2pweXNkcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTE5NjcsImV4cCI6MjEwNDg4Nzk2N30.q79YcNPMQhhtOhp3ei1kWV03_TdORAx1PnJi3BgYXlU','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdHR4Z25kb3N1Y2pweXNkcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTE5NjcsImV4cCI6MjEwNDg4Nzk2N30.q79YcNPMQhhtOhp3ei1kWV03_TdORAx1PnJi3BgYXlU'}})
 .then(function(r){if(!r.ok)throw Error('Không tải được lịch thi từ Supabase ('+r.status+')');return r.json()})
 .then(function(rows){if(!Array.isArray(rows))throw Error('Dữ liệu không hợp lệ');return rows.map(function(r){return Object.assign({},r.data||{},r,{data:undefined})})});
}
window.OlympicHub={hasDemo:hasDemo,isLive:isLive,safeUrl:safeUrl,txt:txt,date:date,node:node,link:link,load:load,base:base}
})();
