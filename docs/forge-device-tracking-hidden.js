/* FORGE deferred integrations: hide all Amazfit/Zepp and heart-rate controls.
 * Presentation only. Retain original integration code, stored cardio logs,
 * backup fields and calories/step/time tracking for later reactivation.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const WATCH=/(?:amazfit|zepp|smartwatch|health\s*connect|datenanbindung)/i;
let started=false,historyObserver=null,previewObserver=null;
function conceal(element,type){
 if(!element)return false;
 element.dataset.forgeDeferred=type;
 element.hidden=true;
 element.setAttribute('aria-hidden','true');
 element.setAttribute('inert','');
 element.style.setProperty('display','none','important');
 return true;
}
function watchPanels(root=document){
 return Array.from(root.querySelectorAll('#progress details.forge-stats-fold')).filter(panel=>{
  const summary=panel.querySelector(':scope > summary');
  return !!summary&&WATCH.test(summary.textContent||'');
 });
}
function hideWatch(){
 const panels=watchPanels();
 panels.forEach(panel=>conceal(panel,'watch'));
 return panels.length;
}
function hidePulse(){
 const ble=document.querySelector('#workout .forge-ble');
 if(ble)conceal(ble,'ble');
 for(const id of ['forgeCardioHr','forgeCardioHrMax']){
  const input=$(id);
  const label=input?.closest('label');
  if(label)conceal(label,'pulse-input');
 }
 return !!ble;
}
function cleanHistory(){
 const root=$('forgeCardioHistory');if(!root)return false;
 let updated=false;
 // Original renderer writes a single .sub line for date/distance/steps/kcal.
 // Remove ONLY the optional HR segment, not the rest of the cardio record.
 root.querySelectorAll('.exercise.row > div > .sub:first-of-type').forEach(line=>{
  const before=line.textContent||'';
  const after=before.replace(/\s*[·•]\s*(?:Ø|ø)\s*\d+(?:[.,]\d+)?\s*bpm\b/gi,'');
  if(after!==before){line.textContent=after;updated=true;}
 });
 return updated;
}
function cleanEstimate(){
 const line=$('forgeCardioEstimate');if(!line)return false;
 const before=line.textContent||'';
 const after=before.replace(/\s*Puls wird dokumentiert, aber nicht zur Kalorienformel verwendet\./gi,'');
 if(after===before)return false;
 line.textContent=after;
 return true;
}
function apply(){
 hideWatch();hidePulse();cleanHistory();cleanEstimate();
 return true;
}
window.ForgeDeferredWearables=Object.freeze({
 watchPanels,hideWatch,hidePulse,cleanHistory,cleanEstimate,apply,
 isInstalled:()=>started
});
function styles(){
 if($('forgeDeferredWearablesStyle'))return;
 const css=document.createElement('style');css.id='forgeDeferredWearablesStyle';
 css.textContent=[
  '/* Deferred until the user chooses to activate wearables again. */',
  '#progress [data-forge-deferred="watch"],#workout [data-forge-deferred="ble"],#workout [data-forge-deferred="pulse-input"]{display:none!important}',
  '#workout .forge-ble{display:none!important}',
  '#workout label:has(> #forgeCardioHr),#workout label:has(> #forgeCardioHrMax){display:none!important}'
 ].join('\n');
 document.head.append(css);
}
function boot(){
 if(started)return;
 started=true;styles();apply();
 // The original renderers rebuild cardio history/estimates on updates.
 // Re-hide only their presentation; no data or event handlers are touched.
 if(typeof MutationObserver==='function'){
  const history=$('forgeCardioHistory');
  if(history){
   historyObserver=new MutationObserver(cleanHistory);
   historyObserver.observe(history,{childList:true,subtree:true,characterData:true});
  }
  const preview=$('forgeCardioEstimate');
  if(preview){
   previewObserver=new MutationObserver(cleanEstimate);
   previewObserver.observe(preview,{childList:true,subtree:true,characterData:true});
  }
  const progress=$('forgeProgressStats');
  if(progress){
   const watchObserver=new MutationObserver(hideWatch);
   watchObserver.observe(progress,{childList:true,subtree:true});
  }
 }
 // Progress can be assembled asynchronously by the UX layer.
 let attempts=0;
 function retry(){
  hideWatch();hidePulse();
  if(!watchPanels().length&&++attempts<30)setTimeout(retry,150);
 }
 retry();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
