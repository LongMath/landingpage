/* Structured media renderer for review/staging. No network access by itself.
 * Caller provides a role-checked resolver; never pass solution media to exam client. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TBLContent=factory();})(typeof self!=='undefined'?self:this,function(){
'use strict';
function blocks(text, images, zone){
  var src=String(text||''), list=images.filter(x=>x.placement===zone||(zone==='question'&&['before_question','after_question','inline'].includes(x.placement))).slice().sort((a,b)=>a.order-b.order);
  var out=[], pos=0;
  function image(x){return {type:'image',file:x.file,alt:x.alt||''};}
  function txt(s){if(s)out.push({type:'text',text:s});}
  if(zone!=='question'){txt(src);return out.concat(list.map(image));}
  out.push(...list.filter(x=>x.placement==='before_question').map(image));
  var ins=list.filter(x=>x.placement==='inline').map(x=>{if(!x.anchor||src.split(x.anchor).length!==2)throw Error('Invalid inline anchor');return {x:x,start:src.indexOf(x.anchor)};}).sort((a,b)=>a.start-b.start||a.x.order-b.x.order);
  for(var i=0;i<ins.length;){var a=ins[i];if(a.start<pos)throw Error('Overlapping anchors');txt(src.slice(pos,a.start));var end=a.start+a.x.anchor.length;out.push(image(a.x));i++;while(i<ins.length&&ins[i].start===a.start&&ins[i].x.anchor===a.x.anchor){out.push(image(ins[i].x));i++;}pos=end;}
  txt(src.slice(pos));out.push(...list.filter(x=>x.placement==='after_question').map(image));return out;
}
var serial=new WeakMap();
async function render(target,parts,resolveImage,math){
  var generation=(serial.get(target)||0)+1;serial.set(target,generation);var doc=target.ownerDocument;target.replaceChildren();
  var jobs=[];
  for(var p of parts){if(p.type==='text'){var span=doc.createElement('span');span.textContent=p.text;span.style.whiteSpace='pre-wrap';target.appendChild(span);}else if(p.type==='image'){let img=doc.createElement('img');img.alt=p.alt||'Hình minh họa';img.style.maxWidth='100%';img.style.height='auto';target.appendChild(img);jobs.push(Promise.resolve().then(()=>resolveImage(p.file)).then(url=>{var parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Invalid signed image URL');if(serial.get(target)===generation)img.src=parsed.href;}).catch(()=>{if(serial.get(target)===generation){var msg=doc.createElement('span');msg.textContent='[Không tải được hình]';img.replaceWith(msg);}}));}else throw Error('Unknown block type');}
  if(math&&typeof math.render==='function')await math.render(target);await Promise.all(jobs);
}
return {blocks:blocks,render:render};
});
