(function(){
'use strict';
// Analytics v1: anonymous counters. No IP, email, student name or answer details are sent.
if (/^\/(admin)(\/|$)/.test(location.pathname)) return;
var endpoint='https://vmttxgndosucjpysdrzg.supabase.co/rest/v1/rpc/record_site_event';
var apiKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdHR4Z25kb3N1Y2pweXNkcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTE5NjcsImV4cCI6MjEwNDg4Nzk2N30.q79YcNPMQhhtOhp3ei1kWV03_TdORAx1PnJi3BgYXlU';
var token;
try {var s=sessionStorage.getItem('tbl_analytics_tab_token');if(!s){s=crypto.randomUUID();sessionStorage.setItem('tbl_analytics_tab_token',s)} token=s;}catch(e){token=null}
function record(type, content) {
 var payload={p_path:location.pathname||'/',p_event:type,p_content:content||null,p_token:token};
 fetch(endpoint,{method:'POST',mode:'cors',keepalive:true,headers:{'apikey':apiKey,'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(function(){});
}
record('page_view');
if(location.pathname==='/ky-thi/chi-tiet.html') {
 var slug=new URLSearchParams(location.search).get('id');
 if(slug&&/^[a-z0-9-]{1,100}$/.test(slug)) record('content_view',slug);
}
window.ToanBacLongAnalytics={track:function(type,id){if(type==='content_view'||type==='cta_click') record(type,String(id||'').slice(0,100));}};
// Track Olympic registration/training call-to-action clicks without personal data
 document.addEventListener('click',function(e){
  var a=e.target.closest('a[href]');if(!a)return;
  var u;try{u=new URL(a.href,location.href)}catch(err){return}
  if(u.origin!==location.origin)return;
  if(u.pathname==='/app/luyen-thi-olympic.html') record('cta_click','luyen-thi-olympic');
 },true);
})();