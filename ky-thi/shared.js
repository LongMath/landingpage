
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
function load(){return fetch('./ky-thi.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('Không tải được dữ liệu');return r.json()}).then(function(d){if(!Array.isArray(d))throw Error('Sai cấu trúc dữ liệu');return d})}
window.OlympicHub={hasDemo:hasDemo,isLive:isLive,safeUrl:safeUrl,txt:txt,date:date,node:node,link:link,load:load,base:base}
})();
