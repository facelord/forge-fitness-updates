/* FORGE 14.9 – Plan, Archiv und Uebungskatalog aufraeumen.
   No data migrations: ONLY an explicitly confirmed archived plan may be deleted.
*/
(function(){
'use strict';
const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
let archiveObserver=null;
function planFold(){
 const page=$('#plan'),hub=$('#forge150PlanHub');
 if(!page||!hub||$('#forge159PlanToggle'))return !!$('#forge159PlanToggle');
 const button=document.createElement('button');
 button.id='forge159PlanToggle';button.type='button';
 button.className='forge159-plan-toggle';
 button.setAttribute('aria-controls','forge150PlanHub forge150AutoPanel forge150ManualPanel');
 let expanded=false;
 try{expanded=localStorage.getItem('forge159-plan-open')==='true';}catch(_){}
 function sync(){
   page.classList.toggle('forge159-plan-closed',!expanded);
   button.setAttribute('aria-expanded',String(expanded));
   button.innerHTML='<span><b>🛠️ Trainingsplan gestalten</b><small>'+
     (expanded?'Plan erstellen oder bearbeiten':'Tippen, um deinen Trainingsplan zu bearbeiten')+
     '</small></span><span aria-hidden="true" class="forge159-chevron">⌄</span>';
 }
 button.addEventListener('click',()=>{
   expanded=!expanded;
   try{localStorage.setItem('forge159-plan-open',String(expanded));}catch(_){}
   sync();
 });
 hub.before(button);sync();
 window.forgeOpenPlanEditor=function(mode){
   if(!expanded){expanded=true;sync();try{localStorage.setItem('forge159-plan-open','true');}catch(_){}}
   if(mode==='manual')$('#forge150PlanHub [data-mode="manual"]')?.click();
   if(mode==='auto')$('#forge150PlanHub [data-mode="auto"]')?.click();
   button.scrollIntoView?.({behavior:'smooth',block:'nearest'});
 };
 // Choosing a catalog exercise must reveal the now-collapsible manual editor.
 if(typeof window.forge131ChooseExercise==='function' && !window.forge131ChooseExercise.forge159){
  const old=window.forge131ChooseExercise;
  const next=function(index){window.forgeOpenPlanEditor('manual');return old.apply(this,arguments);};
  next.forge159=true;window.forge131ChooseExercise=next;
 }
 // The exercise expansion can replace the chooser asynchronously after app load.
 // Capture this click before inline handlers so the manual-plan tab is always visible.
 document.addEventListener('click',event=>{
  const b=event.target.closest('#forgeCatalogResults .forge-catalog-loaded > button');
  if(b && b.textContent.includes('Trainingsplan'))window.forgeOpenPlanEditor('manual');
 },true);
 return true;
}
/* Reinstate the archive's primary action even when the legacy archive renderer
 * omitted or lost the button. The original reactivatePlan() owns confirmation,
 * archiving the current plan, and restoring the selected plan/settings.
 */
function archiveActions(){
 const root=$('#planArchive');if(!root)return false;
 const archived=Array.isArray(state?.planArchive)?state.planArchive:[];
 $$('.forge136-plan-row',root).forEach((row,index)=>{
  let actions=$('.forge159-archive-actions',row);
  if(!actions){
   actions=document.createElement('div');actions.className='forge159-archive-actions';
   row.append(actions);
  }
  let reactivate=$('.forge136-reactivate',row);
  if(!reactivate){
   reactivate=document.createElement('button');
   reactivate.className='btn alt small forge136-reactivate';
   reactivate.textContent='Reaktivieren';
  }
  reactivate.type='button';
  reactivate.removeAttribute('onclick'); // No unescaped archive IDs in inline JavaScript.
  const plan=archived[index];
  reactivate.setAttribute('aria-label',(plan?.name||'Archivierten Trainingsplan')+' reaktivieren');
  if(reactivate.parentNode!==actions)actions.prepend(reactivate);
  let del=$('.forge159-delete',row);
  if(!del){
   del=document.createElement('button');del.type='button';
   del.className='btn danger small forge159-delete';del.textContent='Löschen';
   del.setAttribute('aria-label','Diesen archivierten Trainingsplan löschen');
  }
  if(del.parentNode!==actions)actions.append(del);
 });
 if(!root.dataset.forge159ArchiveEvents){
  root.dataset.forge159ArchiveEvents='1';
  root.addEventListener('click',event=>{
   const button=event.target.closest('button.forge136-reactivate,button.forge159-delete');
   if(!button||!root.contains(button))return;
   event.preventDefault();event.stopPropagation();
   if(!Array.isArray(state?.planArchive))return;
   const row=button.closest('.forge136-plan-row');
   const index=$$('.forge136-plan-row',root).indexOf(row);
   const plan=state.planArchive[index];
   if(!plan)return;
   if(button.classList.contains('forge136-reactivate')){
    if(state.activeWorkout){alert('Bitte beende zuerst dein laufendes Training, bevor du den Trainingsplan wechselst.');return;}
    if(typeof window.reactivatePlan!=='function'){alert('Die Reaktivierung ist momentan nicht verfügbar. Bitte FORGE neu laden.');return;}
    window.reactivatePlan(plan.id); // Existing, confirmation-protected operation.
    return;
   }
   const name=String(plan.name||'Trainingsplan');
   if(!confirm('Archivierten Trainingsplan „'+name+'“ dauerhaft löschen?\n\nDein aktiver Plan, abgeschlossene Trainings und Statistiken bleiben erhalten.'))return;
   // ONLY the selected archive entry; no changes to workouts, stats or active plan.
   state.planArchive.splice(index,1);
   save();
   const open=$('#forgePlanArchivePanel')?.open===true;
   if(typeof window.renderPlanManager==='function')window.renderPlanManager();
   else if(typeof window.render==='function')window.render();
   const panel=$('#forgePlanArchivePanel');if(panel)panel.open=open;
   archiveActions();
  });
 }
 if(!archiveObserver){
  archiveObserver=new MutationObserver(()=>archiveActions());
  archiveObserver.observe(root,{childList:true,subtree:true});
 }
 return true;
}
function flattenGuides(target){
 if(!target)return;
 const guide=$('details.forge-strength-guide',target);
 if(guide){
  const body=$('.forge-strength-body',guide);
  if(body){
   body.classList.add('forge159-guide-body');
   const title=document.createElement('h4');title.textContent='Ausführung & Bewegung';
   body.prepend(title);
   guide.replaceWith(body);
  }else{guide.open=true;}
 }
 // Muscle diagram is the third image. No second "open" tap is needed.
 $$('details.forge-muscle-map',target).forEach(d=>{
  const p=document.createElement('section');p.className='forge159-muscles';
  const title=document.createElement('h4');title.textContent='🎯 Beanspruchte Muskelgruppen';
  p.append(title);
  Array.from(d.children).filter(n=>n.tagName.toLowerCase()!=='summary').forEach(n=>p.append(n));
  d.replaceWith(p);
 });
 // Avoid five card borders: pose images, anatomy image, explanation, tips share one panel.
 const images=$$('.forge-photo-pair img,.forge-offline-pair img',target);
 images.forEach(img=>{img.loading='eager';img.decoding='async';});
 target.classList.add('forge159-catalog-detail');
}
function catalog(){
 if(typeof window.forge131CatalogExpand!=='function'||window.forge131CatalogExpand.forge159)return false;
 const original=window.forge131CatalogExpand;
 const next=function(node,index){
  const result=original.apply(this,arguments);
  const target=node?.querySelector('.forge-catalog-loaded');
  flattenGuides(target);
  return result;
 };
 next.forge159=true;window.forge131CatalogExpand=next;
 $$('.forge-catalog-item[open] .forge-catalog-loaded').forEach(flattenGuides);
 return true;
}
function styles(){
 if($('#forge159Style'))return;
 const style=document.createElement('style');style.id='forge159Style';
 style.textContent=`
 #plan .forge159-plan-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;
   width:100%;margin:14px 0 0;padding:16px;border-radius:15px;border:1px solid #40505a;
   color:#ecf6ee;background:#17232d;text-align:left;cursor:pointer;font:inherit}
 #plan .forge159-plan-toggle span:first-child{display:grid;gap:5px}
 #plan .forge159-plan-toggle b{font-size:16px}
 #plan .forge159-plan-toggle small{font-size:12px;color:#aabfbc}
 #plan .forge159-chevron{font-size:25px;color:#a8f55d;transition:transform .12s}
 #plan .forge159-plan-toggle[aria-expanded="true"] .forge159-chevron{transform:rotate(180deg)}
 #plan.forge159-plan-closed > #forge150PlanHub,
 #plan.forge159-plan-closed > .forge150-plan-panel{display:none!important}
 #plan .forge159-plan-toggle[aria-expanded="true"]{border-radius:15px 15px 0 0;border-bottom:0}
 #plan .forge159-plan-toggle[aria-expanded="true"] + #forge150PlanHub{margin-top:0!important;border-radius:0!important}
 #planArchive .forge136-plan-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px;min-width:0}
 #plan #planArchive .forge159-archive-actions{display:flex;gap:8px;align-items:center;justify-content:flex-end;
   flex-wrap:wrap;min-width:0;margin-left:auto}
 #plan #planArchive .forge159-archive-actions button{min-height:42px;white-space:nowrap}
 #plan #planArchive .forge136-reactivate{display:inline-flex!important;align-items:center;justify-content:center;
   visibility:visible!important;opacity:1!important;min-width:112px;background:#284938!important;
   border:1px solid #78a26d!important;color:#e6ffe4!important;font-weight:750}
 #plan .forge159-delete{background:#512a32!important;border:1px solid #934750!important;color:#ffe4e6!important}
 #plan .forge159-delete:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}
 #plan .forge-catalog-loaded .forge159-guide-body{background:transparent!important;border:0!important;
   margin:6px 0 0!important;padding:10px 0!important}
 #plan .forge159-guide-body>h4,#plan .forge159-muscles>h4{font-size:14px;margin:0 0 12px;
   color:#e5f5de;font-weight:760}
 #plan .forge159-catalog-detail{padding:0 6px 8px}
 #plan .forge159-catalog-detail>.btn{margin:8px 0 3px;min-height:42px}
 #plan .forge159-catalog-detail .forge-photo-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
   gap:8px;margin:9px 0 14px!important}
 #plan .forge159-catalog-detail .forge-photo-pair figure{margin:0;min-width:0}
 #plan .forge159-catalog-detail .forge-photo-pair img{display:block;width:100%;height:auto;border-radius:9px}
 #plan .forge159-catalog-detail .forge-muscle-content,#plan .forge159-muscles{border:0!important;
   background:transparent!important;padding:8px 0!important}
 #plan .forge159-catalog-detail .forge-muscle-figure{max-width:100%}
 #plan .forge159-catalog-detail .forge-plus-meta{margin:8px 0 12px}
 #plan .forge159-catalog-detail .forge-strength-body>p{margin:10px 0}
 @media(max-width:380px){#plan .forge159-archive-actions{width:100%;justify-content:flex-start}
 #plan .forge159-archive-actions button{flex:1 1 auto}}
 `;
 document.head.append(style);
}
function start(){styles();let count=0;function boot(){const p=planFold(),a=archiveActions(),c=catalog();
 if((!p||!a||!c)&&++count<50)setTimeout(boot,120);}
 boot();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();