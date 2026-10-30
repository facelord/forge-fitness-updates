/* FORGE: edit the current plan directly, not the plan generator.
 * This is a UI facade for forge138PlanEditPanel/forge138Mutate,
 * which already own safe add/swap/reorder/undo and draft confirmations.
 * No new data model and no changes to completed workout history.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const node=(tag,cls,txt)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(txt!==undefined)n.textContent=txt;return n;
};
let opened=false,selectedId=null,observer=null,pageObserver=null,refreshTimer=null,dismissAttached=false;
const active=()=>typeof state!=='undefined'&&Array.isArray(state.plan)?state.plan:[];
const planById=id=>active().find(x=>String(x.id)===String(id));
function selectValidId(id,plans){
 return plans.some(p=>String(p.id)===String(id))?String(id):plans.length?String(plans[0].id):null;
}
function normalizeHeading(name){
 return String(name||'').trim().slice(0,90);
}
function updateSessionMeta(planId,title,location){
 const p=planById(planId);
 if(!p)return false;
 if(state.activeWorkout)return false;
 const label=normalizeHeading(title);
 if(!label||!['gym','home'].includes(location))return false;
 if(state.workoutDraft?.planId===p.id){
  if(!confirm('Für diesen Trainingstag gibt es einen gespeicherten Trainingsentwurf. Die Änderung würde den Entwurf zurücksetzen. Fortfahren?'))return false;
  state.workoutDraft=null;
 }
 p.title=label;p.location=location;
 save();render();return true;
}
// The core refreshes combinedWeek as users edit set values. Keep the actual
// input node mounted while Android's keyboard is focused on it.
function hasFocusedEditorField(root,focused=document.activeElement){
 if(!root||!focused||!root.contains(focused))return false;
 const tag=String(focused.tagName||'').toUpperCase();
 return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||focused.isContentEditable===true;
}
window.ForgeActivePlanEdit=Object.freeze({selectValidId,normalizeHeading,updateSessionMeta,hasFocusedEditorField,isOpen:()=>opened,closeEditor,closeIfInactive});
function settings(){
 const container=$('forgeActivePlanEditor');
 if(!container)return;
 container.hidden=!opened;
 const opener=$('forgeActivePlanToggle');
 if(opener){opener.setAttribute('aria-expanded',String(opened));opener.textContent=opened?'✕ Abbrechen':'✎ Aktiven Plan bearbeiten';}
 const top=$('forgePolishPlanActions');
 if(top){
  const button=top.querySelector('button');
  if(button){
   button.textContent=opened?'✕ Abbrechen':active().length?'✎ Plan bearbeiten':'＋ Plan erstellen';
   button.setAttribute('aria-expanded',String(opened));
   button.setAttribute('aria-controls','forgeActivePlanEditor');
  }
 }
}
function safeCreation(){
 const toggle=$('forge159PlanToggle');
 if(toggle&&toggle.getAttribute('aria-expanded')==='false')toggle.click();
 const hub=$('forge150PlanHub');hub?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function closeEditor(){
 if(!opened)return;
 opened=false;selectedId=null;
 if(refreshTimer!==null){clearTimeout(refreshTimer);refreshTimer=null;}
 const panel=$('forgeActivePlanEditor');
 if(panel)panel.replaceChildren(); // Drop all unsaved form inputs and detached event handlers.
 settings();
}
function closeIfInactive(page){
 if(opened&&page&&!page.classList.contains('active'))closeEditor();
}
function openEditor(){
 if(!active().length){safeCreation();return;}
 if(state.activeWorkout){alert('Bitte beende zuerst das laufende Workout, bevor du den aktiven Trainingsplan änderst.');return;}
 const toggle=$('forge159PlanToggle');
 // Hide the new-plan generator before opening the active editor: its synthetic click
 // must not be mistaken for a user clicking outside an already open editor.
 if(toggle&&toggle.getAttribute('aria-expanded')==='true')toggle.click();
 opened=true;
 renderEditor();
 settings();
 $('forgeActivePlanEditor')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function toggleEditor(){if(opened)closeEditor();else openEditor();}
window.forgeOpenActivePlanEditor=toggleEditor;
window.forgeCloseActivePlanEditor=closeEditor;
function renderEditor(){
 const root=$('forgeActivePlanEditor');
 if(!root||!opened)return;
 const plans=active();
 if(!plans.length){closeEditor();return;}
 selectedId=selectValidId(selectedId,plans);
 root.replaceChildren();
 const header=node('div','forge-active-editor-header');
 const heading=node('div','forge-active-editor-heading');
 heading.append(node('h2','',state.activePlanName||'Dein aktueller Trainingsplan'));
 const cancel=node('button','btn alt small forge-active-editor-cancel','✕ Abbrechen');
 cancel.type='button';cancel.setAttribute('aria-label','Planbearbeitung abbrechen und schließen');
 cancel.addEventListener('click',closeEditor);
 heading.append(cancel);header.append(heading);
 header.append(node('p','muted','Nur bestätigte Änderungen werden gespeichert. „Abbrechen“ verwirft nicht gespeicherte Eingaben; bereits bestätigte Änderungen bleiben erhalten.'));
 root.append(header);
 const pills=node('div','forge-active-editor-tabs');
 pills.setAttribute('role','group');pills.setAttribute('aria-label','Trainingseinheit auswählen');
 plans.forEach((p,index)=>{
  const chosen=String(p.id)===selectedId;
  const btn=node('button','forge-active-editor-tab',p.title||'Einheit '+(index+1));
  btn.type='button';btn.setAttribute('aria-pressed',String(chosen));
  btn.addEventListener('click',()=>{selectedId=String(p.id);renderEditor();});
  pills.append(btn);
 });
 root.append(pills);
 const selected=planById(selectedId);
 if(!selected)return;
 const content=node('div','forge-active-editor-body');
 const info=node('div','forge-active-editor-settings');
 const title=node('label','','Name dieser Trainingseinheit');
 const titleInput=node('input');titleInput.type='text';titleInput.maxLength=90;titleInput.value=selected.title||'';
 titleInput.setAttribute('aria-label','Trainingseinheit umbenennen');
 title.append(titleInput);
 const loc=node('label','','Trainingsort');
 const select=node('select');select.setAttribute('aria-label','Trainingsort');
 [['gym','Fitnessstudio'],['home','Zuhause']].forEach(([v,txt])=>{
  const option=node('option','',txt);option.value=v;select.append(option);
 });
 select.value=selected.location==='home'?'home':'gym';loc.append(select);
 const status=node('p','forge-active-editor-message');
 status.setAttribute('role','status');
 const saveMeta=node('button','btn alt small','Name / Ort übernehmen');saveMeta.type='button';
 saveMeta.addEventListener('click',()=>{
  if(!normalizeHeading(titleInput.value)){status.textContent='Bitte einen gültigen Namen angeben.';return;}
  const ok=updateSessionMeta(selected.id,titleInput.value,select.value);
  if(ok){renderEditor();}else status.textContent='Änderung nicht möglich oder abgebrochen.';
 });
 info.append(title,loc,saveMeta,status);content.append(info);
 const section=node('section','forge-active-exercise-manager');
 section.append(node('h3','','Übungen in dieser Einheit'));
 if(typeof window.forge138PlanEditPanel==='function'){
  const template=node('div');
  template.innerHTML=window.forge138PlanEditPanel(selected);
  const source=template.querySelector('.forge138-editor-content');
  if(source){
   section.append(source);
  }else section.append(node('p','muted','Übungsbearbeitung konnte nicht geöffnet werden.'));
 }else{
  section.append(node('p','muted','Übungsbearbeitung konnte nicht geladen werden.'));
 }
 content.append(section);root.append(content);
 const footer=node('div','forge-active-editor-actions');
 const done=node('button','btn alt small forge-active-editor-done','✓ Fertig');
 done.type='button';done.addEventListener('click',closeEditor);
 footer.append(done);root.append(footer);
}
function inject(){
 const action=$('forgePolishPlanActions'),page=$('plan');
 if(!page||!action)return false;
 if(!$('forgeActivePlanEditor')){
  const panel=node('section','forge-active-editor');panel.id='forgeActivePlanEditor';
  panel.hidden=true;panel.setAttribute('aria-label','Aktiven Trainingsplan bearbeiten');
  action.after(panel);
 }
 settings();
 if(!pageObserver){
  pageObserver=new MutationObserver(()=>closeIfInactive(page));
  pageObserver.observe(page,{attributes:true,attributeFilter:['class']});
 }
 if(!observer&&$('combinedWeek')){
  // The core renders the full-week view again after each permanent mutation.
  // Refresh our one selected editing surface without touching underlying data.
  observer=new MutationObserver(()=>{
   if(!opened)return;
   // Debounce rendering; an immediate microtask rebuild would blur numeric
   // fields and dismiss the Android keyboard after the first keystroke.
   if(refreshTimer!==null)clearTimeout(refreshTimer);
   refreshTimer=setTimeout(()=>{
    refreshTimer=null;
    const panel=$('forgeActivePlanEditor');
    if(!opened||hasFocusedEditorField(panel))return;
    renderEditor();
   },120);
  });
  observer.observe($('combinedWeek'),{childList:true});
 }
 return true;
}
function initDismiss(){
 if(dismissAttached)return;
 dismissAttached=true;
 // Tapping the surrounding plan/calendar/catalog or changing navigation ends edit mode.
 document.addEventListener('click',event=>{
  if(!opened)return;
  const panel=$('forgeActivePlanEditor');
  const opener=$('forgePolishPlanActions')?.querySelector('button');
  if(panel?.contains(event.target)||opener?.contains(event.target))return;
  closeEditor();
 },true);
 document.addEventListener('keydown',event=>{
  if(opened&&event.key==='Escape'){event.preventDefault();closeEditor();}
 },true);
}
function style(){
 if($('forgeActivePlanEditorStyle'))return;
 const css=node('style');css.id='forgeActivePlanEditorStyle';
 css.textContent=[
  '#plan .forge-active-editor[hidden]{display:none!important}',
  '#plan .forge-active-editor{margin:8px 0 18px;padding:14px;border-radius:16px;border:1px solid #66835e;background:#152b32}',
  '#plan .forge-active-editor-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}',
  '#plan .forge-active-editor-header h2{font-size:18px;margin:0;color:#e7ffe2;flex:1;min-width:0}',
  '#plan .forge-active-editor-cancel{flex:0 0 auto;min-height:42px;padding:8px 11px;white-space:nowrap}',
  '#plan .forge-active-editor-actions{display:flex;justify-content:flex-end;border-top:1px solid #35564b;margin-top:15px;padding-top:13px}',
  '#plan .forge-active-editor-done{min-height:44px;min-width:130px}',
  '#plan .forge-active-editor-header p{font-size:12px;line-height:1.5;margin:0 0 12px}',
  '#plan .forge-active-editor-tabs{display:flex;gap:8px;max-width:100%;overflow-x:auto;scrollbar-width:thin;padding:2px 0 12px}',
  '#plan .forge-active-editor-tab{flex:0 0 auto;max-width:230px;padding:10px 13px;min-height:42px;font:inherit;font-size:12px;border-radius:10px;background:#20373a;color:#d6e8db;border:1px solid #48675c;cursor:pointer;text-align:left}',
  '#plan .forge-active-editor-tab[aria-pressed="true"]{border-color:#b2f875;background:#2b4a38;color:#eaffd8}',
  '#plan .forge-active-editor-settings{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px 0 16px;border-bottom:1px solid #375850}',
  '#plan .forge-active-editor-settings label{display:grid;gap:5px;font-size:12px;color:#c8dfcb;min-width:0}',
  '#plan .forge-active-editor-settings input,#plan .forge-active-editor-settings select{width:100%;min-width:0;box-sizing:border-box;min-height:43px;font-size:14px;background:#10232c;color:#f0fff2;border:1px solid #4c6862;border-radius:9px;padding:9px 7px}',
  '#plan .forge-active-editor-settings>button{grid-column:1/-1;min-height:43px}',
  '#plan .forge-active-editor-message{grid-column:1/-1;font-size:12px;margin:0;color:#badabc}',
  '#plan .forge-active-exercise-manager>h3{margin:16px 0 12px;font-size:16px;color:#ddf7db}',
  '#plan .forge-active-exercise-manager .forge138-editor-content{padding:0!important;margin:0!important;background:transparent!important;border:0!important}',
  '#plan .forge-active-exercise-manager .forge138-edit-row{padding:12px 0!important;border:0!important;border-bottom:1px solid #36554b!important;margin:0!important;background:transparent!important}',
  '#plan .forge-active-exercise-manager .forge138-edit-tools{display:flex;gap:5px;flex-wrap:wrap}',
  '#plan .forge-active-exercise-manager .forge138-edit-tools button{min-height:40px}',
  '#plan .forge-active-exercise-manager .forge138-edit-disclosure{border:0!important;margin:6px 0;background:transparent!important}',
  '#plan .forge-active-exercise-manager .forge138-add-row{padding:14px 0 7px;border:0;background:transparent}',
  '#plan .forge-active-exercise-manager select{max-width:100%;min-width:0}',
  '@media(max-width:390px){#plan .forge-active-editor{padding:11px}#plan .forge-active-editor-settings{grid-template-columns:1fr}#plan .forge-active-editor-tab{max-width:190px}}'
 ].join('');
 document.head.append(css);
}
function boot(){
 style();
 let attempt=0;
 const run=()=>{if(inject()){initDismiss();return;}if(++attempt<55)setTimeout(run,100);};
 run();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();