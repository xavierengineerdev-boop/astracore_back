/** Шаблон виджета формы заявки. Плейсхолдеры заменяются при отдаче скрипта по GET /sites/:id/widget.js */
export const WIDGET_SCRIPT_TEMPLATE = `(function(){
'use strict';
var API_BASE='__API_BASE__';
var TOKEN='__SITE_TOKEN__';
if(!TOKEN){console.warn('Astracore: token not set');return;}
var container=document.getElementById('astracore-lead-form');
if(!container){
  container=document.createElement('div');
  container.id='astracore-lead-form';
  var s=document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(container,s.nextSibling);
}
function meta(){
  var n=typeof navigator!='undefined'?navigator:{},sc=typeof screen!='undefined'?screen:{},o={};
  if(sc.width&&sc.height)o.screen=sc.width+'x'+sc.height;
  if(n.language)o.language=n.language;
  if(n.platform)o.platform=n.platform;
  try{var tz=Intl.DateTimeFormat().resolvedOptions().timeZone;if(tz)o.timezone=tz;}catch(e){}
  if(n.deviceMemory!=null)o.deviceMemory=String(n.deviceMemory);
  if(n.hardwareConcurrency!=null)o.hardwareConcurrency=String(n.hardwareConcurrency);
  if(typeof document!='undefined'&&document.referrer)o.referrer=document.referrer;
  return o;
}
container.innerHTML='<form id="astracore-form" class="astracore-form" novalidate>'+
'<div class="astracore-f"><label for="astracore-name">Имя *</label><input type="text" id="astracore-name" name="name" required placeholder="Имя"></div>'+
'<div class="astracore-f"><label for="astracore-phone">Телефон</label><input type="tel" id="astracore-phone" name="phone" placeholder="Телефон"></div>'+
'<div class="astracore-f"><label for="astracore-email">Почта</label><input type="email" id="astracore-email" name="email" placeholder="Почта"></div>'+
'<div class="astracore-f"><label for="astracore-info">Доп. информация</label><textarea id="astracore-info" name="info" placeholder="Комментарий"></textarea></div>'+
'<div class="astracore-f"><button type="submit" id="astracore-submit">Отправить</button></div>'+
'<p id="astracore-msg" class="astracore-msg"></p></form>';
var st=document.createElement('style');
st.textContent='.astracore-form{font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;padding:1rem}.astracore-f{margin-bottom:1rem}.astracore-f label{display:block;font-size:0.85rem;margin-bottom:0.25rem;color:#333}.astracore-f input,.astracore-f textarea{width:100%;padding:0.5rem 0.75rem;font-size:1rem;border:1px solid #ccc;border-radius:6px;box-sizing:border-box}.astracore-f textarea{min-height:80px;resize:vertical}.astracore-f button{padding:0.6rem 1.2rem;font-size:1rem;background:#6a4fbf;color:#fff;border:none;border-radius:6px;cursor:pointer}.astracore-f button:disabled{opacity:0.7;cursor:not-allowed}.astracore-msg{margin-top:0.75rem;font-size:0.875rem;min-height:1.25em}';
container.insertBefore(st,container.firstChild);
var form=document.getElementById('astracore-form'),msg=document.getElementById('astracore-msg'),btn=document.getElementById('astracore-submit');
function err(t){msg.textContent=t;msg.style.color='#c00';}
function ok(t){msg.textContent=t;msg.style.color='#0a0';}
form.addEventListener('submit',function(e){
  e.preventDefault();
  var name=(document.getElementById('astracore-name').value||'').trim();
  if(!name){err('Введите имя.');return;}
  var data={token:TOKEN,name:name,phone:(document.getElementById('astracore-phone').value||'').trim(),email:(document.getElementById('astracore-email').value||'').trim(),additionalInfo:(document.getElementById('astracore-info').value||'').trim(),sourceMeta:meta()};
  btn.disabled=true;msg.textContent='Отправка…';msg.style.color='#666';
  fetch(API_BASE+'/leads/from-site',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(function(r){
      if(r.ok){ok('Заявка отправлена.');form.reset();}
      else return r.json().then(function(b){var m=b.message||r.statusText;throw new Error(Array.isArray(m)?m.join(' '):m);}).catch(function(){throw new Error(r.status+' '+r.statusText);});
    })
    .catch(function(e){err(e.message==='Failed to fetch'||e.name==='TypeError'?'Ошибка связи. Попробуйте позже.':e.message||'Ошибка отправки.');})
    .finally(function(){btn.disabled=false;});
});
})();
`;
