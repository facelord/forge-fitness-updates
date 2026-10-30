/* FORGE iPhone only: PWA install and safe update notifications. */
(function(){
'use strict';
const apple=/iPhone|iPod|iPad/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function notify(id,text,buttonLabel,onClick){
 if(document.getElementById(id))return;
 const box=document.createElement('div');box.id=id;box.setAttribute('role','status');
 box.style.cssText='position:fixed;bottom:calc(73px + env(safe-area-inset-bottom));left:12px;right:12px;max-width:520px;margin:auto;z-index:999999;border-radius:14px;border:1px solid #709466;background:#142b32;color:#eaf8ed;font-size:13px;line-height:1.45;padding:13px;display:flex;align-items:center;gap:9px;box-shadow:0 8px 30px #0009';
 const p=document.createElement('span');p.style.flex='1';p.textContent=text;box.append(p);
 function btn(label,fn){const el=document.createElement('button');el.type='button';el.textContent=label;el.style.cssText='min-height:36px;padding:6px 9px;border-radius:8px;background:#24483c;color:white;border:1px solid #708a74';el.addEventListener('click',fn);return el}
 box.append(btn(buttonLabel,onClick),btn('✕',()=>box.remove()));document.body.append(box);
}
function showUpdate(){notify('forge-ios-update','Neue FORGE-Version bereit. Neu laden, um das Update zu übernehmen.','Neu laden',()=>location.reload())}
function init(){
 if(apple&&!standalone){
  let hidden=false;try{hidden=localStorage.getItem('forge-iphone-install-tip')==='1'}catch(_){}
  if(!hidden)notify('forge-ios-tip','FORGE auf dem iPhone installieren: In Safari auf „Teilen“ und „Zum Home-Bildschirm“ tippen.','Verstanden',()=>{
   try{localStorage.setItem('forge-iphone-install-tip','1')}catch(_){}
   document.getElementById('forge-ios-tip')?.remove();
  });
 }
 if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
 const oldController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{
  function watch(w){w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdate()})}
  watch(reg.installing);reg.addEventListener('updatefound',()=>watch(reg.installing));
  const check=()=>{if(navigator.onLine!==false)reg.update().catch(()=>{})};
  check();window.addEventListener('pageshow',check);window.addEventListener('online',check);
 }).catch(e=>console.warn('FORGE PWA offline cache unavailable:',e));
 if(oldController)navigator.serviceWorker.addEventListener('controllerchange',showUpdate);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
