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
let opened=false,selectedId=null,expandedExercise=null,observer=null,pageObserver=null,refreshTimer=null,dismissAttached=false,staged=null;
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
 // Rename and training location never invalidate sets: preserve the draft.
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
function cloneEdit(p){
 return {id:String(p.id),title:String(p.title||''),location:p.location==='home'?'home':'gym',
  ex:structuredClone(p.ex),baseline:JSON.stringify({title:p.title,location:p.location,ex:p.ex})};
}
function changed(x){return !!x&&JSON.stringify({title:x.title,location:x.location,ex:x.ex})!==x.baseline;}
function validateEdit(x,names){
 if(!x||!String(x.title||'').trim()||String(x.title).trim().length>90)return 'Bitte einen gültigen Namen eingeben.';
 if(!['gym','home'].includes(x.location))return 'Ungültiger Trainingsort.';
 if(!Array.isArray(x.ex)||x.ex.length<1||x.ex.length>15)return 'Der Plan benötigt 1 bis 15 Übungen.';
 const seen=new Set();
 for(const e of x.ex){
  if(!e?.name||!names.includes(e.name)||seen.has(e.name))return 'Bitte gültige und unterschiedliche Übungen verwenden.';
  seen.add(e.name);
  if(!Number.isInteger(Number(e.sets))||Number(e.sets)<1||Number(e.sets)>15||
    !Number.isInteger(Number(e.reps))||Number(e.reps)<1||Number(e.reps)>999)
   return 'Sätze 1–15 und Wiederholungen 1–999 eingeben.';
 }
 return null;
}
function catalogNames(){return typeof forge138AvailableNames==='function'?forge138AvailableNames():[];}
function ensureStaged(p){if(!staged||staged.id!==String(p.id))staged=cloneEdit(p);return staged;}
function discardAllowed(){return !changed(staged)||confirm('Ungespeicherte Planänderungen wirklich verwerfen?');}
function commitStaged(p,x){
 if(!p||!x||state.activeWorkout)return {ok:false,reason:'Ein laufendes Training darf nicht verändert werden.'};
 const issue=validateEdit(x,catalogNames());if(issue)return {ok:false,reason:issue};
 // HTML number inputs emit strings; keep the original FORGE numeric plan shape.
 const normalizedExercises=x.ex.map(ex=>({...ex,sets:Number(ex.sets),reps:Number(ex.reps)}));
 const changingExercises=JSON.stringify(p.ex)!==JSON.stringify(normalizedExercises);
 if(changingExercises&&state.workoutDraft&&String(state.workoutDraft.planId)===String(p.id))
  return {ok:false,reason:'Für diesen Trainingstag existiert ein gespeicherter Trainingsentwurf. Bitte zuerst abschließen. Der Entwurf bleibt erhalten.'};
 const backup={title:p.title,location:p.location,ex:structuredClone(p.ex),lastEdit:state.forge138LastEdit==null?null:structuredClone(state.forge138LastEdit)};
 const verify=typeof localStorage!=='undefined'&&typeof KEY==='string';
 let raw=null;
 try{
  if(verify)raw=localStorage.getItem(KEY);
  if(changingExercises)state.forge138LastEdit={planId:p.id,ex:structuredClone(p.ex)};
  p.title=String(x.title).trim();p.location=x.location;p.ex=structuredClone(normalizedExercises);
  save();
  if(verify){
   const copy=JSON.parse(localStorage.getItem(KEY)||'null');
   const committed=copy?.plan?.find(item=>String(item.id)===String(p.id));
   if(!committed||committed.title!==p.title||committed.location!==p.location||
     JSON.stringify(committed.ex)!==JSON.stringify(p.ex))throw Error('Persistence verification failed');
  }
  return {ok:true};
 }catch(error){
  console.error('FORGE Plan speichern fehlgeschlagen',error);
  p.title=backup.title;p.location=backup.location;p.ex=backup.ex;
  state.forge138LastEdit=backup.lastEdit;
  if(verify)try{if(raw==null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,raw);}catch(e){console.error('FORGE Rollback',e);}
  return {ok:false,reason:'Speichern fehlgeschlagen. Der bisherige Plan und Trainingsentwurf bleiben erhalten.'};
 }
}
window.ForgeActivePlanEdit=Object.freeze({selectValidId,normalizeHeading,updateSessionMeta,hasFocusedEditorField,cloneEdit,changed,validateEdit,commitStaged,isOpen:()=>opened,closeEditor,closeIfInactive,flattenExerciseRows,openExercise});
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
function closeEditor(force=false){
 if(!opened)return true;
 if(!force&&!discardAllowed())return false;
 opened=false;selectedId=null;expandedExercise=null;staged=null;
 if(refreshTimer!==null){clearTimeout(refreshTimer);refreshTimer=null;}
 const panel=$('forgeActivePlanEditor');
 if(panel)panel.replaceChildren(); // Drop all unsaved form inputs and detached event handlers.
 settings();return true;
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
 opened=true;staged=null;
 const notice=$('forgeActivePlanSavedNotice');if(notice)notice.hidden=true;
 renderEditor();
 settings();
 $('forgeActivePlanEditor')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function toggleEditor(){if(opened)closeEditor();else openEditor();}
function openDay(id){
 if(!planById(id))return;
 if(!opened)openEditor();
 if(!opened)return;
 if(selectedId!==String(id)){
  if(!discardAllowed())return;
  selectedId=String(id);expandedExercise=null;staged=null;
 }
 renderEditor();settings();
 $('forgeActivePlanEditor')?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
window.forgeOpenActivePlanEditor=toggleEditor;
function openExercise(id,index){
 const p=planById(id),n=Number(index);
 if(!p||!Number.isInteger(n)||n<0||n>=p.ex.length)return false;
 // Do not enter edit mode while a workout is active: preserve the session.
 if(state.activeWorkout)return false;
 if(!opened)openEditor();
 if(!opened)return false;
 if(selectedId!==String(id)&&!discardAllowed())return false;
 if(selectedId!==String(id))staged=null;
 selectedId=String(id);
 expandedExercise=n;
 renderEditor();
 settings();
 const target=$('forgeActivePlanEditor')?.querySelector('.forge-editor-item[data-index="'+n+'"]');
 if(target){target.open=true;target.scrollIntoView?.({block:'center',behavior:'smooth'});}
 else $('forgeActivePlanEditor')?.scrollIntoView?.({block:'start',behavior:'smooth'});
 return true;
}
window.forgeOpenActivePlanDay=openDay;
window.forgeOpenActivePlanExercise=openExercise;
window.forgeCloseActivePlanEditor=closeEditor;
function flattenExerciseRows(source){
 if(!source)return 0;
 let count=0;
 source.querySelectorAll('.forge138-edit-row').forEach((row,index)=>{
  if(row.classList.contains('forge-editor-item'))return;
  const header=row.querySelector(':scope > .forge138-edit-head');
  const summary=node('summary','forge-editor-item-summary',header?.textContent?.trim().replace(/\s+/g,' ')||'Übung '+(index+1));
  const inside=node('div','forge-editor-item-body');
  const details=node('details','forge-editor-item');
  details.dataset.index=String(index);
  details.open=expandedExercise===index;
  for(const item of Array.from(row.children)){if(item!==header)inside.append(item);}
  details.append(summary,inside);
  details.addEventListener('toggle',()=>{
   if(details.open){
    expandedExercise=index;
    source.querySelectorAll('.forge-editor-item').forEach(other=>{if(other!==details)other.open=false;});
   }else if(expandedExercise===index)expandedExercise=null;
  });
  row.replaceWith(details);count++;
 });
 // Replace a second nested accordion with a flat, directly editable form.
 source.querySelectorAll('.forge138-edit-disclosure').forEach(fold=>{
  const flat=node('div','forge-editor-direct-fields');
  for(const child of Array.from(fold.children))if(child.tagName!=='SUMMARY')flat.append(child);
  fold.replaceWith(flat);
 });
 return count;
}
function stagedExerciseControls(x,notice){
 const content=node('div','forge138-editor-content');
 const names=catalogNames();
 const control=(label,fn,disabled=false)=>{
  const b=node('button','btn alt small',label);b.type='button';b.disabled=disabled;
  b.addEventListener('click',fn);return b;
 };
 const redraw=index=>{expandedExercise=index;renderEditor();};
 x.ex.forEach((ex,i)=>{
  const fold=node('details','forge-editor-item');fold.dataset.index=String(i);fold.open=expandedExercise===i;
  fold.append(node('summary','forge-editor-item-summary',(i+1)+'. '+ex.name+' · '+ex.sets+' × '+ex.reps));
  fold.addEventListener('toggle',()=>{
   if(fold.open){
    expandedExercise=i;
    content.querySelectorAll('.forge-editor-item').forEach(other=>{if(other!==fold)other.open=false;});
   }else if(expandedExercise===i)expandedExercise=null;
  });
  const body=node('div','forge-editor-item-body');
  const tools=node('div','forge138-edit-tools');
  const move=offset=>{
   const target=i+offset;if(target<0||target>=x.ex.length)return;
   const removed=x.ex.splice(i,1)[0];x.ex.splice(target,0,removed);redraw(target);
  };
  tools.append(control('↑',()=>move(-1),i===0),control('↓',()=>move(1),i===x.ex.length-1),
   control('Entfernen',()=>{
    if(x.ex.length<=1){notice.textContent='Mindestens eine Übung muss bleiben.';return;}
    x.ex.splice(i,1);redraw(Math.min(i,x.ex.length-1));
   }));
  body.append(tools);
  const fields=node('div','forge-editor-direct-fields');
  for(const [key,label,max] of [['sets','Sätze',15],['reps','Wiederholungen / Sekunden',999]]){
   const wrap=node('label','',label),input=node('input');
   input.type='number';input.min='1';input.max=String(max);input.step='1';input.value=String(ex[key]);
   input.addEventListener('input',()=>{ex[key]=input.value;notice.textContent='Noch nicht gespeichert';});
   wrap.append(input);fields.append(wrap);
  }
  const wrapper=node('label','','Alternative Übung'),select=node('select');
  const empty=node('option','','Übung auswählen');empty.value='';select.append(empty);
  names.filter(name=>name!==ex.name).forEach(name=>{
   const opt=node('option','',name);opt.value=name;select.append(opt);
  });
  wrapper.append(select);fields.append(wrapper);
  fields.append(control('Übung ersetzen',()=>{
   const name=select.value;
   if(!name||x.ex.some((item,j)=>j!==i&&item.name===name)){
    notice.textContent='Die Übung ist ungültig oder bereits enthalten.';return;
   }
   ex.name=name;redraw(i);
  }));
  body.append(fields);fold.append(body);content.append(fold);
 });
 const addition=node('div','forge138-add-row'),select=node('select');
 const none=node('option','','Weitere Übung auswählen');none.value='';select.append(none);
 names.filter(name=>!x.ex.some(ex=>ex.name===name)).forEach(name=>{
  const opt=node('option','',name);opt.value=name;select.append(opt);
 });
 addition.append(select,control('＋ Übung hinzufügen',()=>{
  const name=select.value;
  if(!name||x.ex.length>=15||typeof forge138Defaults!=='function'){
   notice.textContent='Bitte eine Übung wählen (maximal 15).';return;
  }
  x.ex.push(structuredClone(forge138Defaults(name)));redraw(x.ex.length-1);
 }));
 content.append(addition);return content;
}
function renderEditor(){
 const root=$('forgeActivePlanEditor');
 if(!root||!opened)return;
 const plans=active();
 if(!plans.length){closeEditor();return;}
 selectedId=selectValidId(selectedId,plans);
 const working=ensureStaged(planById(selectedId));
 root.replaceChildren();
 const header=node('div','forge-active-editor-header');
 const heading=node('div','forge-active-editor-heading');
 heading.append(node('h2','',state.activePlanName||'Dein aktueller Trainingsplan'));
 const cancel=node('button','btn alt small forge-active-editor-cancel','✕ Abbrechen');
 cancel.type='button';cancel.setAttribute('aria-label','Planbearbeitung abbrechen und schließen');
 cancel.addEventListener('click',()=>closeEditor());
 heading.append(cancel);header.append(heading);
 header.append(node('p','muted','Tippe auf eine Übung, um sie zu ändern. Bestätigte Änderungen gelten dauerhaft.'));
 root.append(header);
 const pills=node('div','forge-active-editor-tabs');
 pills.setAttribute('role','group');pills.setAttribute('aria-label','Trainingseinheit auswählen');
 plans.forEach((p,index)=>{
  const chosen=String(p.id)===selectedId;
  const btn=node('button','forge-active-editor-tab',p.title||'Einheit '+(index+1));
  btn.type='button';btn.setAttribute('aria-pressed',String(chosen));
  btn.addEventListener('click',()=>{
   if(String(p.id)===selectedId)return;
   if(!discardAllowed())return;
   selectedId=String(p.id);expandedExercise=null;staged=null;renderEditor();
  });
  pills.append(btn);
 });
 root.append(pills);
 const selected=planById(selectedId);
 if(!selected)return;
 const content=node('div','forge-active-editor-body');
 const info=node('div','forge-active-editor-settings');
 const title=node('label','','Name dieser Trainingseinheit');
 const titleInput=node('input');titleInput.type='text';titleInput.maxLength=90;titleInput.value=working.title;
 titleInput.setAttribute('aria-label','Trainingseinheit umbenennen');
 title.append(titleInput);
 const loc=node('label','','Trainingsort');
 const select=node('select');select.setAttribute('aria-label','Trainingsort');
 [['gym','Fitnessstudio'],['home','Zuhause']].forEach(([v,txt])=>{
  const option=node('option','',txt);option.value=v;select.append(option);
 });
 select.value=working.location;loc.append(select);
 const status=node('p','forge-active-editor-message');status.setAttribute('role','status');
 titleInput.addEventListener('input',()=>{working.title=titleInput.value;status.textContent='Noch nicht gespeichert';});
 select.addEventListener('change',()=>{working.location=select.value;status.textContent='Noch nicht gespeichert';});
 info.append(title,loc,status);
 const rename=node('details','forge-editor-meta');
 rename.append(node('summary','','✎ Name & Trainingsort ändern'),info);
 content.append(rename);
 const section=node('section','forge-active-exercise-manager');
 section.append(node('h3','','Übungen · antippen zum Bearbeiten'));
 const message=node('p','forge-active-editor-message');message.setAttribute('role','status');
 // forge138PlanEditPanel and forge138Mutate remain available in the legacy calendar.
 // This focused editor stages values and commits once, never deleting a draft.
 section.append(stagedExerciseControls(working,message),message);
 content.append(section);root.append(content);
 const footer=node('div','forge-active-editor-actions');
 const discard=node('button','btn alt small forge-active-editor-cancel','✕ Abbrechen');
 discard.type='button';discard.addEventListener('click',()=>closeEditor());
 const done=node('button','btn forge-active-editor-done','✓ Änderungen übernehmen');
 done.type='button';done.addEventListener('click',()=>{
  const result=commitStaged(planById(selectedId),working);
  if(!result.ok){message.textContent=result.reason;return;}
  closeEditor(true);
  try{render();}catch(error){console.error('FORGE: Ansicht nach Planspeichern',error);}
  const notice=$('forgeActivePlanSavedNotice');
  if(notice){notice.hidden=false;notice.textContent='✓ Änderungen am Trainingsplan gespeichert.';}
 });
 footer.append(discard,done);root.append(footer);
}
function inject(){
 const action=$('forgePolishPlanActions'),page=$('plan');
 if(!page||!action)return false;
 if(!$('forgeActivePlanEditor')){
  const panel=node('section','forge-active-editor');panel.id='forgeActivePlanEditor';
  panel.hidden=true;panel.setAttribute('aria-label','Aktiven Trainingsplan bearbeiten');
  action.after(panel);
 }
 if(!$('forgeActivePlanSavedNotice')){
  const notice=node('p','forge-active-editor-saved','');notice.id='forgeActivePlanSavedNotice';
  notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  $('forgeActivePlanEditor').after(notice);
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
 // Protect old calendar edit controls too: their original core handler can
 // otherwise erase an unfinished workout draft after a confirmation.
 for(const key of ['forge138Mutate','forge138UndoEdit']){
  const original=window[key];
  if(typeof original!=='function')continue;
  window[key]=function(id,...args){
   if(state?.workoutDraft&&String(state.workoutDraft.planId)===String(id)){
    alert('Ein gespeicherter Trainingsentwurf bleibt geschützt. Bitte zuerst abschließen.');return;
   }
   return original.call(this,id,...args);
  };
 }
 // Tapping the surrounding plan/calendar/catalog or changing navigation ends edit mode.
 document.addEventListener('click',event=>{
  if(!opened)return;
  const panel=$('forgeActivePlanEditor');
  const opener=$('forgePolishPlanActions')?.querySelector('button');
  if(panel?.contains(event.target)||opener?.contains(event.target))return;
  if(!closeEditor()){
   event.preventDefault();event.stopImmediatePropagation();
  }
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
  '#plan .forge-active-editor-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;border-top:1px solid #35564b;margin-top:15px;padding-top:13px}',
  '#plan .forge-active-editor-saved{color:#d5f5c7;padding:11px;border-left:3px solid #a8f55d;background:#183326;border-radius:0 8px 8px 0}',
  '#plan .forge-active-editor-saved[hidden]{display:none!important}',
  '#plan .forge-active-editor-done{min-height:46px;min-width:180px;background:#a8f55d;color:#14251a;border:0;border-radius:9px;font-weight:800}',
  '#plan .forge-active-editor-header p{font-size:12px;line-height:1.5;margin:0 0 12px}',
  '#plan .forge-active-editor-tabs{display:flex;gap:8px;max-width:100%;overflow-x:auto;scrollbar-width:thin;padding:2px 0 12px}',
  '#plan .forge-active-editor-tab{flex:0 0 auto;max-width:230px;padding:10px 13px;min-height:42px;font:inherit;font-size:12px;border-radius:10px;background:#20373a;color:#d6e8db;border:1px solid #48675c;cursor:pointer;text-align:left}',
  '#plan .forge-active-editor-tab[aria-pressed="true"]{border-color:#b2f875;background:#2b4a38;color:#eaffd8}',
  '#plan .forge-active-editor-settings{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 0 16px;border-bottom:1px solid #375850}',
  '#plan .forge-active-editor-settings label{display:grid;gap:5px;font-size:12px;color:#c8dfcb;min-width:0}',
  '#plan .forge-active-editor-settings input,#plan .forge-active-editor-settings select{width:100%;min-width:0;box-sizing:border-box;min-height:43px;font-size:14px;background:#10232c;color:#f0fff2;border:1px solid #4c6862;border-radius:9px;padding:9px 7px}',
  '#plan .forge-active-editor-settings>button{grid-column:1/-1;min-height:43px}',
  '#plan .forge-active-editor-message{grid-column:1/-1;font-size:12px;margin:0;color:#badabc}',
  '#plan .forge-active-exercise-manager>h3{margin:16px 0 12px;font-size:16px;color:#ddf7db}',
  '#plan .forge-active-exercise-manager .forge138-editor-content{padding:0!important;margin:0!important;background:transparent!important;border:0!important}',
  '#plan .forge-active-exercise-manager .forge138-edit-row{padding:12px 0!important;border:0!important;border-bottom:1px solid #36554b!important;margin:0!important;background:transparent!important}',
  '#plan .forge-editor-meta{border-bottom:1px solid #395549;margin-top:8px}',
  '#plan .forge-editor-meta>summary{list-style:none;min-height:48px;display:flex;align-items:center;font-size:14px;font-weight:750;color:#c7f1b0;cursor:pointer}',
  '#plan .forge-editor-meta>summary:after{content:"⌄";margin-left:auto;color:#a8f55d;font-size:19px}',
  '#plan .forge-editor-meta[open]>summary:after{content:"⌃"}',
  '#plan .forge-editor-item{border-bottom:1px solid #365448;background:transparent;margin:0;padding:0}',
  '#plan .forge-editor-item>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;list-style:none;min-height:58px;padding:12px 1px;font-size:14px;font-weight:750;color:#f1f9ed;line-height:1.5}',
  '#plan .forge-editor-item>summary:after{content:"⌄";font-size:22px;color:#a8f55d;flex:none}',
  '#plan .forge-editor-item[open]>summary:after{content:"⌃"}',
  '#plan .forge-editor-item-body{padding:2px 0 14px}',
  '#plan .forge-editor-item-body .forge138-edit-tools{padding-bottom:9px}',
  '#plan .forge-editor-direct-fields{display:grid;gap:8px;padding:8px 0;border-top:1px solid #344e43}',
  '#plan .forge-editor-direct-fields label{display:grid;gap:6px;font-size:13px;color:#cedccb}',
  '#plan .forge-editor-direct-fields select,#plan .forge-editor-direct-fields input{min-height:45px;max-width:100%;box-sizing:border-box}',
  '#plan .forge-editor-item>summary:focus-visible,#plan .forge-editor-meta>summary:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
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