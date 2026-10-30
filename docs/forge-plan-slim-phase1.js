/* FORGE UX phase 1 completion: a single flat weekly plan and one secondary
   management surface. Existing generators, catalogs and archived plans stay
   mounted at their original IDs for complete data and event compatibility.
   Pure presentation only: no mutations to state, cadence or workouts.
*/
(function(){
'use strict';
const PANELS=Object.freeze(['create','catalog','archive','week']);
const $=id=>document.getElementById(id);
const element=(tag,cls,text)=>{
 const result=document.createElement(tag);
 if(cls)result.className=cls;
 if(text!==undefined)result.textContent=text;
 return result;
};
function validPanel(value){return PANELS.includes(value)?value:null;}
function archiveCount(value){return Array.isArray(value)?value.length:0;}
window.ForgePlanSlim=Object.freeze({PANELS,validPanel,archiveCount});
let initialized=false,currentPanel=null,rendering=false,observer=null,wrappedPlanEditor=false;
function openPanel(value){
 const page=$('plan'),panel=validPanel(value);
 if(!page||!panel)return;
 // Allow tapping the same menu item again to close the details area.
 currentPanel=currentPanel===panel?null:panel;
 page.dataset.forgeSlimPanel=currentPanel||'none';
 const buttons=$('forgeSlimTools')?.querySelectorAll('button[data-slim-open]')||[];
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.slimOpen===currentPanel)));
 if(currentPanel==='create'){
  const toggle=$('forge159PlanToggle');
  if(toggle&&toggle.getAttribute('aria-expanded')!=='true')toggle.click();
  const auto=$('forge150AutoPanel'),manual=$('forge150ManualPanel');
  if(auto)auto.open=true;
  if(manual)manual.open=true;
 }else if(currentPanel==='catalog'){
  const catalog=$('forgeCatalog');if(catalog)catalog.open=true;
 }else if(currentPanel==='archive'){
  const archive=$('forgePlanArchivePanel');if(archive)archive.open=true;
 }else if(currentPanel==='week'){
  const board=$('combinedWeek')?.closest('.forge150-calendar')||$('forgePolishFullWeek')?.closest('.card');
  const outer=board?.querySelector(':scope > details.forge-fold-details');
  if(outer)outer.open=true;
  const full=$('forgePolishFullWeek');if(full)full.open=true;
 }
 const targets={create:$('forge150PlanHub'),catalog:$('forgeCatalog'),archive:$('planArchive'),
  week:$('forgePolishFullWeek')?.closest('.forge150-calendar')||$('combinedWeek')};
 if(currentPanel)targets[currentPanel]?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function style(){
 if($('forgePlanSlimStyle'))return;
 const s=element('style');s.id='forgePlanSlimStyle';
 s.textContent=[
  '/* Direct, flat weekly schedule: no enclosing calendar card, no nested boxes. */',
  '#plan.forge-slim-phase1 .forge-slim-week{margin:16px 0 6px;padding:0;background:transparent;border:0;box-shadow:none}',
  '#plan.forge-slim-phase1 .forge-slim-week>h2{margin:0 0 8px;font-size:19px;color:#f0f6ef}',
  '#plan.forge-slim-phase1 .forge-slim-week>p{margin:0 0 9px;font-size:12px;color:#abbeb4}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-week-meta{margin:0 0 4px;justify-content:flex-end;color:#a9c0b4}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-week-meta strong{display:none}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day{border:0!important;border-bottom:1px solid #355049!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;margin:0!important;padding:12px 1px!important;gap:10px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day-date{min-width:48px;padding:0 8px 0 1px;border-right:1px solid #3a554d}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day-date strong{font-size:14px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day-date small{font-size:10px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-session-summary{min-height:46px;padding:3px 2px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-session-labels strong{font-size:14px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-session-body{background:transparent!important;border:0!important;border-top:1px solid #344e48!important;border-radius:0!important;padding:10px 0 4px!important;margin:5px 0 2px!important}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-session-chevron{font-size:20px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day-actions{margin:0;gap:7px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day-actions button{background:transparent!important;border:1px solid #4d725c!important;border-radius:8px!important;color:#c6e8bf!important;min-height:38px;font-size:11px;padding:6px 10px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day-actions button:nth-child(2):is(.btn){display:none!important}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-extra{border-top:1px dashed #36534d;margin-top:6px;padding-top:8px}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-week-footer{display:flex;justify-content:flex-start;margin:5px 0 0}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-week-footer button{width:auto!important;max-width:100%!important;min-height:42px;background:transparent!important;border:0!important;border-radius:0!important;color:#a8f55d!important;text-align:left;padding:8px 0!important}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-week-footer button:last-child{display:none!important}',
  '#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-between{display:none!important}',
  '/* Old calendar stays mounted for moving units, but only appears on request. */',
  '#plan.forge-slim-phase1 .forge150-calendar{display:none!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="week"] .forge150-calendar{display:block!important;margin:10px 0!important;padding:13px!important;background:#172630!important;border:1px solid #40564d!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="week"] .forge150-calendar #forgePolishWeekTitle{display:none!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="week"] .forge150-calendar .forge150-week-help{display:none!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="week"] .forge150-calendar .forge-polish-full>summary{display:none!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="week"] .forge150-calendar .forge-polish-full{border:0!important;padding:0!important;margin:0!important}',
  '/* Every legacy feature lives behind exactly one management entry. */',
  '#plan.forge-slim-phase1 #forge159PlanToggle{display:none!important}',
  '#plan.forge-slim-phase1 #forge150PlanHub,',
  '#plan.forge-slim-phase1 > .forge150-plan-panel,',
  '#plan.forge-slim-phase1 #forgeCatalog,',
  '#plan.forge-slim-phase1 #planArchive{display:none!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="create"] #forge150PlanHub,',
  '#plan.forge-slim-phase1[data-forge-slim-panel="create"] > .forge150-plan-panel,',
  '#plan.forge-slim-phase1[data-forge-slim-panel="catalog"] #forgeCatalog,',
  '#plan.forge-slim-phase1[data-forge-slim-panel="archive"] #planArchive{display:block!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="create"] #forge150PlanHub{margin:12px 0 0!important;border-radius:12px 12px 0 0!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="create"] > .forge150-plan-panel[hidden]{display:none!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="create"] > .forge150-plan-panel:not([hidden]){display:block!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="archive"] #planArchive{margin:8px 0 12px}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="archive"] #forgePlanArchivePanel>summary{display:none!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="archive"] #forgePlanArchivePanel{display:block!important;border:0!important;box-shadow:none!important;background:transparent!important;padding:0!important;margin:0!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="archive"] #planArchive .forge136-plan-row{padding:11px 0!important;border:0!important;border-bottom:1px solid #3c564b!important;border-radius:0!important;background:transparent!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="catalog"] #forgeCatalog{border-radius:13px!important;margin:12px 0!important}',
  '#plan.forge-slim-phase1 .forge-slim-tools{margin:18px 0 14px;border-top:1px solid #365149;padding:0;background:transparent}',
  '#plan.forge-slim-phase1 .forge-slim-tools>summary{display:flex;align-items:center;gap:9px;cursor:pointer;min-height:52px;font-weight:700;font-size:14px;color:#d7e7dd;list-style:none}',
  '#plan.forge-slim-phase1 .forge-slim-tools>summary::-webkit-details-marker{display:none}',
  '#plan.forge-slim-phase1 .forge-slim-tools>summary:after{content:"⌄";color:#a8f55d;margin-left:auto;font-size:20px}',
  '#plan.forge-slim-phase1 .forge-slim-tools[open]>summary:after{content:"⌃"}',
  '#plan.forge-slim-phase1 .forge-slim-tool-buttons{display:grid;gap:0;border-top:1px solid #304841}',
  '#plan.forge-slim-phase1 .forge-slim-tool-buttons>button{min-height:49px;width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 2px;font:inherit;font-size:13px;text-align:left;color:#dcebe0;background:transparent;border:0;border-bottom:1px solid #304841;border-radius:0}',
  '#plan.forge-slim-phase1 .forge-slim-tool-buttons>button:after{content:"›";color:#a8f55d;font-size:21px}',
  '#plan.forge-slim-phase1 .forge-slim-tool-buttons>button[aria-pressed="true"]{color:#b7fa83;font-weight:750}',
  '#plan.forge-slim-phase1 .forge-slim-tool-buttons>button:focus-visible,#plan.forge-slim-phase1 .forge-slim-tools>summary:focus-visible{outline:2px solid #a8f55d;outline-offset:3px}',
  '#plan.forge-slim-phase1 #forgePolishPlanActions button{background:#1a3133!important;border-color:#426453!important;color:#e3f3e7!important}',
  '#plan.forge-slim-phase1 #forgeSimpleHero{margin-bottom:12px!important}',
  '#plan.forge-slim-phase1>.tag{display:none!important}',
  '@media(max-width:380px){#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day{gap:7px!important}#plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day-date{min-width:43px!important}}'
 ].join('\n');
 document.head.append(s);
}
function install(){
 const page=$('plan'),week=$('forgePolishWeek'),actions=$('forgePolishPlanActions');
 if(!page||!week||!actions||!$('forgeSimpleHero')||!$('forge150PlanHub')||!$('forge159PlanToggle'))return false;
 style();
 page.classList.add('forge-slim-phase1');
 page.dataset.forgeSlimPanel='none';
 if(!$('forgeSlimWeek')){
  const section=element('section','forge-slim-week');section.id='forgeSlimWeek';
  section.setAttribute('aria-label','Deine Trainingswoche');
  section.append(element('h2','','Deine Woche'),element('p','','Trainingstag antippen, um Übungen und Sätze anzusehen.'));
  // Keep the direct active-plan editor directly below its action button.
  const editor=$('forgeActivePlanEditor');
  (editor||actions).after(section);
  // Move only the compact calendar. Legacy editor and weekly-move controls are untouched.
  section.append(week);
 }
 if(!$('forgeSlimTools')){
  const details=element('details','forge-slim-tools');details.id='forgeSlimTools';
  const summary=element('summary','','Meine Pläne & Einstellungen');
  details.append(summary);
  const buttons=element('div','forge-slim-tool-buttons');
  const entries=[
   ['create','＋ Neuen Trainingsplan erstellen'],
   ['catalog','🏋 Übungskatalog öffnen'],
   ['archive','🗂 Archivierte Pläne'],
   ['week','⚙ Wochenplan-Einstellungen und Verschieben']
  ];
  for(const [id,label] of entries){
   const button=element('button','',label);button.type='button';button.dataset.slimOpen=id;
   button.setAttribute('aria-pressed','false');
   button.addEventListener('click',()=>openPanel(id));
   buttons.append(button);
  }
  details.append(buttons);
  details.addEventListener('toggle',()=>{
   if(details.open||!currentPanel)return;
   currentPanel=null;
   page.dataset.forgeSlimPanel='none';
   buttons.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));
  });
  const section=$('forgeSlimWeek');section.after(details);
 }
 const oldOpen=window.forgeOpenPlanEditor;
 if(typeof oldOpen==='function'&&!wrappedPlanEditor){
  window.forgeOpenPlanEditor=function(mode){
   const tools=$('forgeSlimTools');
   if(tools)tools.open=true;
   if(currentPanel!=='create'){currentPanel=null;openPanel('create');}
   return oldOpen.apply(this,arguments);
  };
  wrappedPlanEditor=true;
 }
 const archiveButton=$('forgeSlimTools')?.querySelector('[data-slim-open="archive"]');
 if(archiveButton)archiveButton.textContent='🗂 Archivierte Pläne ('+archiveCount(state?.planArchive)+')';
 // Maintain current week after re-renders without touching the legacy calendar.
 if(!observer){
  const root=$('planArchive');
  if(root){
   observer=new MutationObserver(()=>{
    const btn=$('forgeSlimTools')?.querySelector('[data-slim-open="archive"]');
    if(btn)btn.textContent='🗂 Archivierte Pläne ('+archiveCount(state?.planArchive)+')';
    if(currentPanel==='archive'){
     const archive=$('forgePlanArchivePanel');if(archive)archive.open=true;
    }
   });
   observer.observe(root,{childList:true,subtree:true});
  }
 }
 initialized=true;
 return true;
}
function boot(){
 let attempt=0;
 const retry=()=>{
  if(install())return;
  if(++attempt<80)setTimeout(retry,100);
 };
 retry();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
