/* FORGE | simple and individual Plan flow, v2.
 * Reuses the original generator controls and cadence engine by MOVING DOM nodes,
 * not copying data or introducing a new plan model. No user profile.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const E=(tag,cls,content)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(content!==undefined)n.textContent=content;
 return n;
};
function usableDays(count){return Number.isInteger(Number(count))&&Number(count)>=1&&Number(count)<=6;}
function usableIntervalUnits(count){return Number.isInteger(Number(count))&&Number(count)>=1&&Number(count)<=4;}
function planSummary(plan=[],settings={}){
 const cadence=settings?.cadence;
 const order=cadence?.mode==='interval'&&Array.isArray(cadence.planOrder)?cadence.planOrder:null;
 const shown=order?(Array.isArray(plan)?plan:[]).filter(p=>order.some(id=>String(id)===String(p.id))):(Array.isArray(plan)?plan:[]);
 const count=order?order.length:shown.length;
 const exerciseCount=shown.reduce((sum,p)=>sum+(Array.isArray(p.ex)?p.ex.length:0),0);
 const schedule=cadence?.mode==='interval'?
  'Alle '+cadence.every+' '+(Number(cadence.every)===1?'Tag':'Tage')+' · '+count+' '+(count===1?'Einheit':'Einheiten')+' im Wechsel':
  count+' '+(count===1?'Einheit':'Einheiten')+' pro Woche';
 return {count,exerciseCount,schedule};
}
window.ForgePlanIntuitive=Object.freeze({usableDays,usableIntervalUnits,planSummary,isInstalled:()=>installed});
let installed=false,tabHandler=false,autoMode=null,dayObserver=null,wasEditing=false;
function field(title,id,help){
 const original=$(id);
 if(!original)return null;
 const wrap=E('div','forge-plan-v2-field');
 const label=E('label','',title);label.htmlFor=id;
 wrap.append(label,original);
 if(help)wrap.append(E('small','',help));
 return wrap;
}
function step(number,heading,description){
 const section=E('section','forge-plan-v2-step');
 section.append(E('div','forge-plan-v2-step-number',String(number)));
 const content=E('div','forge-plan-v2-step-content');
 content.append(E('h3','',heading));
 if(description)content.append(E('p','forge-plan-v2-intro',description));
 section.append(content);return {section,content};
}
function button(label,handler,cls='btn alt small'){
 const b=E('button',cls,label);b.type='button';b.addEventListener('click',handler);return b;
}
function moveField(parent,name,id,help){const f=field(name,id,help);if(f)parent.append(f);return f;}
function cadenceMode(){
 const source=$('forgeCadenceAuto')?.querySelector('[data-forge-cadence-mode]');
 return source?.value||'weekdays';
}
function refreshCadence(){
 const isInterval=cadenceMode()==='interval';
 const weekdayPick=$('forgePlanV2WeekdayPick');
 if(weekdayPick)weekdayPick.hidden=isInterval;
 const days=$('days'),cycle=$('forgePlanV2NewUnitCount');
 const firstOption=Array.from(days?.options||[]).find(option=>option.value==='1');
 if(firstOption){firstOption.hidden=!isInterval;firstOption.disabled=!isInterval;}
 if(!isInterval&&days&&Number(days.value)<2)days.value='3';
 const original=$('forgePlanV2OriginalDays'),cycleField=$('forgePlanV2NewUnits');
 if(original)original.hidden=isInterval;
 if(cycleField)cycleField.hidden=!isInterval;
 if(isInterval&&days&&cycle){
  const selected=usableIntervalUnits(days.value)?Number(days.value):4;
  if(Number(days.value)!==selected)days.value=String(selected);
  cycle.value=String(selected);
 }
 const dayCount=$('forgePlanV2WeekCount');
 const number=String(days?.value||3);
 if(dayCount)dayCount.textContent=number+(isInterval?' verschiedene Einheiten im Wechsel':' Trainingstage pro Woche');
 const rhythm=$('forgePlanV2Rhythm');
 if(rhythm)rhythm.textContent=isInterval?'Die Einheiten A–D wechseln sich im gewählten Tagesabstand ab.':'Wähle deine festen Tage oder lasse FORGE verteilen.';
}

/* A small in-place editor for the live rolling schedule. Saved workouts and
 * exercise selection are deliberately managed by the existing engines. */
function readableDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '–';
 const date=new Date(value+'T12:00:00');
 return Number.isNaN(date.getTime())?'–':date.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function cadencePreview(){
 const preview=$('forgePlanV2CadencePreview'),date=$('forgePlanV2CadenceDate'),interval=$('forgePlanV2CadenceEvery'),units=$('forgePlanV2CadenceUnits');
 if(!preview||!date||!interval||!units)return;
 const current=window.ForgeCadenceSchedule?.getActive();
 const C=window.ForgeCadenceCore;
 if(!current||!C){preview.textContent='';return;}
 try{
  const cycle=window.ForgeCadenceSchedule?.previewUnitCount(Number(units.value));
  if(!cycle?.ok)throw Error(cycle?.error||'Ungültige Einheitenauswahl');
  const order=cycle.order.slice();
  for(let i=0;i<cycle.newUnits;i++)order.push('forge-new-preview-'+i);
  const candidate={...current,anchor:date.value,every:Number(interval.value),planOrder:order,rotationOffset:0};
  C.validate(candidate);
  const today=C.localToday(new Date());
  const upcoming=C.upcoming(candidate,today,4);
  preview.textContent='Vorschau: '+upcoming.map(v=>{
   const position=order.indexOf(v.planId);
   return readableDate(v.date)+' · Einheit '+String.fromCharCode(65+position)+(String(v.planId).startsWith('forge-new-preview-')?' (neu)':'');
  }).join(' → ');
 }catch(error){preview.textContent='Bitte ein gültiges Startdatum wählen.';}
}
function nextRollingUnit(){
 const current=window.ForgeCadenceSchedule?.getActive(),C=window.ForgeCadenceCore;
 if(!current||!C)return null;
 try{
  const due=C.next(current,C.localToday(new Date()));
  const index=current.planOrder.findIndex(id=>String(id)===String(due.planId));
  return {due,unit:'Einheit '+String.fromCharCode(65+Math.max(0,index)),current,C};
 }catch(_){return null;}
}
function shiftPreview(){
 const data=nextRollingUnit(),field=$('forgePlanV2ShiftDate'),preview=$('forgePlanV2ShiftPreview');
 if(!data||!field||!preview)return;
 try{
  const shifted=data.C.postponeNext(data.current,data.C.localToday(new Date()),field.value);
  const future=data.C.upcoming(shifted.cadence,field.value,3);
  const unitName=entry=>'Einheit '+String.fromCharCode(65+data.current.planOrder.findIndex(id=>String(id)===String(entry.planId)));
  preview.textContent=future.map(entry=>readableDate(entry.date)+' · '+unitName(entry)).join(' → ');
 }catch(error){preview.textContent=error.message||'Bitte ein gültiges, späteres Datum wählen.';}
}
function openShiftEditor(){
 const data=nextRollingUnit(),editor=$('forgePlanV2ShiftEditor'),field=$('forgePlanV2ShiftDate');
 if(!data||!editor||!field)return false;
 const min=data.C.fromOrdinal(data.C.toOrdinal(data.due.date)+1);
 const max=data.C.fromOrdinal(data.C.toOrdinal(data.C.localToday(new Date()))+90);
 field.min=min;field.max=max;
 // Prefer the following Monday, otherwise the next available calendar day.
 const weekday=new Date(data.C.toOrdinal(data.due.date)*86400000).getUTCDay();
 const mondayAhead=(8-weekday)%7||7;
 const suggested=data.C.fromOrdinal(data.C.toOrdinal(data.due.date)+mondayAhead);
 field.value=suggested<=max?suggested:min;
 $('forgePlanV2ShiftFeedback').textContent='';
 editor.hidden=false;shiftPreview();
 editor.scrollIntoView?.({block:'nearest',behavior:'smooth'});field.focus();
 return true;
}
window.ForgePlanShift=Object.freeze({open:openShiftEditor,preview:shiftPreview});
function refreshActiveCadence(){
 const bar=$('forgePlanV2Cadence');
 if(!bar||typeof state==='undefined')return;
 const current=window.ForgeCadenceSchedule?.getActive();
 bar.hidden=!current;
 if(!current){
  const editor=$('forgePlanV2CadenceEditor');if(editor)editor.hidden=true;
  return;
 }
 const label=$('forgePlanV2CadenceCurrent');
 const next=nextRollingUnit();
 const dueLabel=$('forgePlanV2ShiftDue'),shift=$('forgePlanV2Shift');
 if(shift)shift.hidden=!next;
 if(dueLabel)dueLabel.textContent=next?'Nächste Einheit: '+next.unit+' · '+readableDate(next.due.date):'';
 const length=Array.isArray(current.planOrder)?current.planOrder.length:state.plan.length;
 const text='Start: '+readableDate(current.anchor)+' · Alle '+current.every+' '+(current.every===1?'Tag':'Tage')+' · '+length+' '+(length===1?'Einheit':'Einheiten');
 if(label&&label.textContent!==text)label.textContent=text;
}
function mountActiveCadence(surface){
 const box=E('div','forge-plan-v2-cadence');box.id='forgePlanV2Cadence';
 const row=E('div','forge-plan-v2-cadence-row');
 const label=E('div','forge-plan-v2-cadence-info');
 label.append(E('strong','','Trainingsrhythmus'));
 const current=E('span','', '');current.id='forgePlanV2CadenceCurrent';label.append(current);
 const change=button('Ändern',()=>{
  const editor=$('forgePlanV2CadenceEditor');
  const active=window.ForgeCadenceSchedule?.getActive();
  if(!editor||!active)return;
  if(!editor.hidden){editor.hidden=true;return;}
  $('forgePlanV2CadenceDate').value=active.anchor;
  $('forgePlanV2CadenceEvery').value=String(active.every);
  $('forgePlanV2CadenceUnits').value=String(Math.max(1,Math.min(4,active.planOrder?.length||state.plan.length)));
  $('forgePlanV2CadenceFeedback').textContent='';
  editor.hidden=false;
  cadencePreview();
  $('forgePlanV2CadenceDate')?.focus();
 },'forge-plan-v2-cadence-change');
 change.setAttribute('aria-controls','forgePlanV2CadenceEditor');
 row.append(label,change);box.append(row);
 const editor=E('div','forge-plan-v2-cadence-editor');editor.id='forgePlanV2CadenceEditor';editor.hidden=true;
 const fields=E('div','forge-plan-v2-cadence-fields');
 const dateField=E('label','', 'Erster Trainingstag');
 const date=E('input');date.id='forgePlanV2CadenceDate';date.type='date';date.setAttribute('aria-label','Startdatum des aktiven Trainingsplans');
 date.addEventListener('change',cadencePreview);dateField.append(date);
 const intervalField=E('label','', 'Abstand zwischen Trainings');
 const every=E('select');every.id='forgePlanV2CadenceEvery';every.setAttribute('aria-label','Trainingsabstand in Tagen');
 for(let n=1;n<=14;n++){
  const option=E('option','',n+' '+(n===1?'Tag':'Tage'));option.value=String(n);every.append(option);
 }
 every.addEventListener('change',cadencePreview);intervalField.append(every);
 fields.append(dateField,intervalField);
 const unitField=E('label','forge-plan-v2-cadence-unit-field','Verschiedene Trainingseinheiten');
 const units=E('select');units.id='forgePlanV2CadenceUnits';units.setAttribute('aria-label','Anzahl unterschiedlicher Trainingseinheiten im Wechsel');
 for(let n=1;n<=4;n++){const option=E('option','',n+' '+(n===1?'Einheit':'Einheiten'));option.value=String(n);units.append(option);}
 units.addEventListener('change',cadencePreview);unitField.append(units);fields.append(unitField);
 editor.append(fields);
 editor.append(E('p','forge-plan-v2-cadence-help','Der Starttag legt Einheit A neu fest. Zusätzliche Einheiten beginnen als bearbeitbare Kopie; weniger Einheiten pausieren nur die übrigen. Abgeschlossene Trainings bleiben erhalten.'));
 const preview=E('p','forge-plan-v2-cadence-preview','');preview.id='forgePlanV2CadencePreview';editor.append(preview);
 const actions=E('div','forge-plan-v2-cadence-actions');
 const cancel=button('Abbrechen',()=>{editor.hidden=true;feedback.textContent='';},'forge-plan-v2-cadence-cancel');
 const saveButton=button('Rhythmus speichern',()=>{
  const updated=window.ForgeCadenceSchedule?.updateActiveInterval({anchor:date.value,every:Number(every.value),unitCount:Number(units.value)});
  if(!updated?.ok){feedback.textContent=updated?.error||'Rhythmus konnte nicht gespeichert werden.';return;}
  editor.hidden=true;
  feedback.textContent=!updated.changed?'Trainingsrhythmus unverändert.':
   updated.created?'Rhythmus gespeichert. '+updated.created+' neue Einheit(en) als bearbeitbare Kopie ergänzt.':
   updated.paused?'Rhythmus gespeichert. Nicht benötigte Einheiten bleiben erhalten und können wieder aktiviert werden.':
   'Trainingsrhythmus aktualisiert.';
  refreshActiveCadence();
 },'forge-plan-v2-cadence-save');
 actions.append(cancel,saveButton);editor.append(actions);
 const feedback=E('p','forge-plan-v2-cadence-feedback','');feedback.id='forgePlanV2CadenceFeedback';
 feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 box.append(editor,feedback);
 // Keep the next-workout action visible even when the active exercise list is folded.
 const shift=E('div','forge-plan-v2-shift');shift.id='forgePlanV2Shift';
 const shiftTop=E('div','forge-plan-v2-shift-top');
 const shiftDue=E('strong','forge-plan-v2-shift-due','');shiftDue.id='forgePlanV2ShiftDue';
 const shiftButton=button('↔ Nächste Einheit verschieben',openShiftEditor,'forge-plan-v2-shift-open');
 shiftButton.id='forgePlanV2ShiftButton';shiftButton.setAttribute('aria-controls','forgePlanV2ShiftEditor');
 shiftTop.append(shiftDue,shiftButton);shift.append(shiftTop);
 const shiftEditor=E('div','forge-plan-v2-shift-editor');shiftEditor.id='forgePlanV2ShiftEditor';shiftEditor.hidden=true;
 const shiftField=E('label','','Neuer Trainingstag');
 const shiftDate=E('input');shiftDate.type='date';shiftDate.id='forgePlanV2ShiftDate';
 shiftDate.setAttribute('aria-label','Neues Datum für die nächste geplante Trainingseinheit');
 shiftDate.addEventListener('change',shiftPreview);shiftField.append(shiftDate);
 shiftEditor.append(shiftField);
 shiftEditor.append(E('p','forge-plan-v2-shift-help','Die nächste Einheit bleibt erhalten. Alle folgenden Einheiten verschieben sich automatisch im gewählten Tagesabstand.'));
 const shiftResult=E('p','forge-plan-v2-shift-preview','');shiftResult.id='forgePlanV2ShiftPreview';shiftEditor.append(shiftResult);
 const shiftActions=E('div','forge-plan-v2-shift-actions');
 const shiftFeedback=E('p','forge-plan-v2-shift-feedback','');shiftFeedback.id='forgePlanV2ShiftFeedback';
 shiftFeedback.setAttribute('role','status');shiftFeedback.setAttribute('aria-live','polite');
 shiftActions.append(button('Abbrechen',()=>{shiftEditor.hidden=true;shiftFeedback.textContent='';},'forge-plan-v2-shift-cancel'),
 button('Termin & Folgeplan verschieben',()=>{
  const data=nextRollingUnit();
  const result=window.ForgeCadenceSchedule?.postponeNextWorkout({fromDate:data?.due.date,toDate:shiftDate.value});
  if(!result?.ok){shiftFeedback.textContent=result?.error||'Verschieben fehlgeschlagen.';return;}
  shiftEditor.hidden=true;
  shiftFeedback.textContent='Verschoben: '+readableDate(result.after.date)+'. Nächste Einheit danach: '+readableDate(result.next.date)+'.';
  refreshActiveCadence();
 },'forge-plan-v2-shift-save'));
 shiftEditor.append(shiftActions);shift.append(shiftEditor,shiftFeedback);
 box.append(shift);surface.append(box);refreshActiveCadence();
}

function refreshOverview(){
 const root=$('forgePlanV2Active');
 if(!root||typeof state==='undefined')return;
 const data=planSummary(state.plan,state.settings);
 root.hidden=!data.count;
 if(!data.count)return;
 const heading=$('forgePlanV2ActiveName'),line=$('forgePlanV2ActiveInfo');
 const name=state.activePlanName||'Dein aktiver Plan';
 if(heading&&heading.textContent!==name)heading.textContent=name;
 const info=data.schedule+' · '+data.exerciseCount+' Übungen';
 if(line&&line.textContent!==info)line.textContent=info;
 refreshActiveCadence();
 const units=$('forgePlanV2Units');
 if(!units)return;
 const rotation=state.settings?.cadence?.mode==='interval'?state.settings.cadence.planOrder:null;
 const shown=rotation?(state.plan||[]).filter(p=>rotation.some(id=>String(id)===String(p.id))):(state.plan||[]);
 const signature=String(rotation?.join(',')||'')+'||'+shown.map(p=>[p.id,p.title,p.location,p.ex?.length,p.ex?.map(e=>e.name+':'+e.sets+':'+e.reps).join(',')].join('|')).join('||');
 if(units.dataset.signature===signature)return;
 units.dataset.signature=signature;
 units.replaceChildren();
 shown.forEach((p,i)=>{
  const row=E('div','forge-plan-v2-unit');
  const text=E('div','forge-plan-v2-unit-info');
  text.append(E('strong','',p.title||'Einheit '+(i+1)),
    E('small','',String(p.ex?.length||0)+' Übungen · '+(p.location==='home'?'Zuhause':'Fitnessstudio')));
  const edit=button('✎ Bearbeiten',()=>{
   if(typeof window.forgeOpenActivePlanDay==='function')window.forgeOpenActivePlanDay(p.id);
   else window.forgeOpenActivePlanEditor?.();
   $('forgeActivePlanEditor')?.scrollIntoView?.({block:'start',behavior:'smooth'});
  },'btn alt small');
  edit.setAttribute('aria-label',(p.title||'Einheit '+(i+1))+' direkt bearbeiten');
  const top=E('div','forge-plan-v2-unit-top');
  top.append(text,edit);
  row.append(top);
  // The active plan is for reviewing the ENTIRE routine, not just its name/count.
  // Show actual exercises, sets and reps without opening an edit panel or starting
  // a workout. Reuse live plan state so every permanent edit appears immediately.
  const exercises=E('ol','forge-plan-v2-exercises');
  for(const [exerciseIndex,ex] of (Array.isArray(p.ex)?p.ex:[]).entries()){
   const item=E('li','forge-plan-v2-exercise');
   item.append(E('span','forge-plan-v2-exercise-name',String(ex.name||'Übung')));
   const number=Number(ex.sets),count=Number.isFinite(number)&&number>0?number+' × ':'';
   const reps=ex.reps==null?'':String(ex.reps);
   const actions=E('span','forge-plan-v2-exercise-actions');
   actions.append(E('span','forge-plan-v2-exercise-dose',count+reps+(ex.unit==='sec'?' Sek.':'')));
   const change=button('✎',()=>{
    // Open precisely this exercise in the permanent active-plan editor.
    // Never edit today's workout or the saved training history.
    if(window.forgeOpenActivePlanExercise?.(p.id,exerciseIndex)!==true)
     window.forgeOpenActivePlanDay?.(p.id);
   },'forge-plan-v2-exercise-edit');
   change.setAttribute('aria-label',String(ex.name||'Übung')+' direkt im Plan bearbeiten');
   change.title='Übung bearbeiten';actions.append(change);
   item.append(actions);exercises.append(item);
  }
  row.append(exercises);
  units.append(row);
 });
}
function mountActive(page){
 if($('forgePlanV2Active'))return;
 const hero=$('forgeSimpleHero');if(!hero)return;
 const surface=E('section','forge-plan-v2-active');surface.id='forgePlanV2Active';
 const kicker=E('span','forge-plan-v2-kicker','AKTIVER PLAN');
 const heading=E('h2','', 'Dein aktiver Plan');heading.id='forgePlanV2ActiveName';
 const info=E('p','', '');info.id='forgePlanV2ActiveInfo';
 const units=E('div','forge-plan-v2-units');units.id='forgePlanV2Units';
 const fold=E('details','forge-plan-v2-fold');fold.id='forgePlanV2Fold';
 const trigger=E('summary','forge-plan-v2-fold-trigger');
 trigger.setAttribute('aria-label','Aktiven Trainingsplan ein- oder ausklappen');
 const headingWrap=E('div','forge-plan-v2-fold-heading');
 headingWrap.append(kicker,heading,info);
 const chevron=E('span','forge-plan-v2-fold-chevron','⌄');chevron.setAttribute('aria-hidden','true');
 trigger.append(headingWrap,chevron);
 const contents=E('div','forge-plan-v2-fold-body');contents.append(units);
 const create=button('＋ Anderen Plan erstellen',()=>{
  const opener=$('forgeSlimTools')?.querySelector('[data-slim-open="create"]');
  if(opener?.getAttribute('aria-pressed')!=='true')opener?.click();
  $('forge150PlanHub')?.scrollIntoView?.({block:'start',behavior:'smooth'});
 },'btn alt small forge-plan-v2-new');
 create.setAttribute('aria-label','Neuen Plan erstellen; der aktuelle bleibt bis zur Aktivierung erhalten');
 contents.append(create);
 fold.append(trigger,contents);surface.append(fold);
 mountActiveCadence(surface);
 hero.after(surface);refreshOverview();
}
function mountCreator(page){
 if($('forgePlanV2Wizard'))return true;
 const hub=$('forge150PlanHub'),auto=$('forge150AutoPanel'),manual=$('forge150ManualPanel');
 const ids=['goal','place','days','level','split','weekDayChoices','generatedPlanName','forgeCadenceAuto'];
 if(!hub||!auto||!manual||ids.some(id=>!$(id)))return false;
 const originButton=auto.querySelector('button[onclick*="generatePlan()"]');
 if(!originButton)return false;
 const wizard=E('div','forge-plan-v2-wizard');wizard.id='forgePlanV2Wizard';
 const a=step(1,'Was möchtest du trainieren?','Wähle, was zu deinem Alltag passt. Alles lässt sich später verändern.');
 const top=E('div','forge-plan-v2-fields');
 moveField(top,'Dein Ziel','goal');
 moveField(top,'Trainingsort','place');
 moveField(top,'Erfahrung','level');
 moveField(top,'Aufteilung','split','Ganzkörper oder ein Split. FORGE wählt Übungen entsprechend.');
 a.content.append(top);
 const splitHint=$('splitHint');if(splitHint){splitHint.classList.add('forge-plan-v2-help');a.content.append(splitHint);}
 wizard.append(a.section);
 const b=step(2,'Wie möchtest du trainieren?','Feste Wochentage oder beispielsweise alle drei Tage.');
 const rhythm=$('forgeCadenceAuto');rhythm.classList.add('forge-plan-v2-cadence');b.content.append(rhythm);
 const schedule=E('div','forge-plan-v2-days');schedule.id='forgePlanV2Days';
 const weekCount=E('div','forge-plan-v2-week-count');weekCount.id='forgePlanV2WeekCount';
 schedule.append(weekCount);
 const normalDays=moveField(schedule,'Wie viele Trainingstage?','days');
 if(normalDays)normalDays.id='forgePlanV2OriginalDays';
 // The original fixed-week schedule offers 2–6 days. Add 1 exclusively
 // for rolling plans; the cadence generator supplies its actual single slot.
 const originalCount=$('days');
 if(originalCount?.tagName==='SELECT'&&!Array.from(originalCount.options).some(o=>o.value==='1')){
  const one=E('option','','1');one.value='1';originalCount.prepend(one);
 }
 const unitField=E('label','forge-plan-v2-new-units','Wie viele verschiedene Trainingseinheiten?');
 unitField.id='forgePlanV2NewUnits';
 const unitCount=E('select');unitCount.id='forgePlanV2NewUnitCount';
 unitCount.setAttribute('aria-label','Anzahl verschiedener Trainingseinheiten im Wechsel');
 for(let i=1;i<=4;i++){const option=E('option','',i+' '+(i===1?'Einheit':'Einheiten'));option.value=String(i);unitCount.append(option);}
 unitCount.value=String(Math.max(1,Math.min(4,Number($('#days')?.value)||3)));
 unitCount.addEventListener('change',()=>{
  const days=$('days');if(days){days.value=unitCount.value;days.dispatchEvent(new Event('change',{bubbles:true}));}
  refreshCadence();
 });
 unitField.append(unitCount);schedule.append(unitField);
 const pick=E('div','forge-plan-v2-weekday-pick');pick.id='forgePlanV2WeekdayPick';
 const choices=$('weekDayChoices');choices.classList.add('forge-plan-v2-daychoices');pick.append(choices);
 const hint=$('weekDayHint');if(hint){hint.classList.add('forge-plan-v2-help');pick.append(hint);}
 const distribute=auto.querySelector('button[onclick*="autoTrainingDays()"]');
 if(distribute){distribute.textContent='↻ Wochentage gleichmäßig verteilen';pick.append(distribute);}
 schedule.append(pick);b.content.append(schedule);
 const note=E('p','forge-plan-v2-help');note.id='forgePlanV2Rhythm';b.content.append(note);
 wizard.append(b.section);
 const c=step(3,'Deinen Plan erstellen','FORGE schlägt Übungen vor – danach kannst du jede Einheit frei anpassen.');
 moveField(c.content,'Name deines Plans (optional)','generatedPlanName','Zum Beispiel „Mein Krafttraining“.');
 originButton.textContent='✓ Meinen Plan erstellen';originButton.classList.add('forge-plan-v2-submit');
 c.content.append(originButton);
 const warning=E('p','forge-plan-v2-help','Ein bestehender Plan wird archiviert. Gespeicherte Trainingseinheiten bleiben erhalten.');
 c.content.append(warning);wizard.append(c.section);
 hub.after(wizard);
 const modeButtons=hub.querySelectorAll('button[data-mode]');
 modeButtons.forEach(btn=>{
  btn.textContent=btn.dataset.mode==='manual'?'✎ Komplett selbst wählen':'✨ Plan vorschlagen';
 });
 const syncMode=()=>{
  const mode=hub.querySelector('button[data-mode][aria-selected="true"]')?.dataset.mode||'auto';
  page.dataset.forgePlanFlowMode=mode;
  const heading=hub.querySelector('h2');if(heading)heading.textContent='Neuen Trainingsplan erstellen';
  const hint=hub.querySelector('p');if(hint)hint.textContent='Automatisch zusammenstellen oder komplett selbst gestalten.';
 };
 if(!tabHandler){
  modeButtons.forEach(b=>b.addEventListener('click',()=>{syncMode();}));
  tabHandler=true;
 }
 if($('#days'))$('#days').addEventListener('change',()=>refreshCadence());
 rhythm.querySelectorAll('[data-forge-cadence-mode],[data-forge-cadence-every],[data-forge-cadence-anchor]').forEach(el=>el.addEventListener('change',refreshCadence));
 originButton.addEventListener('click',()=>{
  const before=state?.activePlanId;
  setTimeout(()=>{
   if(state?.activePlanId===before)return; // User cancelled or generation was blocked.
   const create=$('forgeSlimTools')?.querySelector('[data-slim-open="create"]');
   if(create?.getAttribute('aria-pressed')==='true')create.click();
   refreshOverview();
   $('forgePlanV2Active')?.scrollIntoView?.({block:'start',behavior:'smooth'});
  },0);
 });
 // Original weekday buttons are changed in place by the core; nothing is cloned.
 if(typeof MutationObserver==='function'&&!dayObserver){
  dayObserver=new MutationObserver(refreshCadence);
  dayObserver.observe(choices,{childList:true});
 }
 syncMode();refreshCadence();return true;
}
function styles(){
 if($('forgePlanV2Style'))return;
 const s=E('style');s.id='forgePlanV2Style';
 s.textContent=[
  '#plan #forgePlanV2Wizard{display:none!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="create"]:not([data-forge-plan-flow-mode="manual"]) #forgePlanV2Wizard{display:block!important}',
  '#plan.forge-slim-phase1[data-forge-slim-panel="create"]:not([data-forge-plan-flow-mode="manual"]) #forge150AutoPanel{display:none!important}',
  '#plan #forgePlanV2Wizard{padding:13px 14px 17px;margin:0 0 14px;background:#172a2d;border:1px solid #496957;border-top:0;border-radius:0 0 16px 16px}',
  '#plan #forge150PlanHub:has(+ #forgePlanV2Wizard){border-bottom:0!important}',
  '#plan .forge-plan-v2-step{border-top:1px solid #37554a;padding:17px 0 12px;display:grid;grid-template-columns:29px minmax(0,1fr);gap:10px}',
  '#plan .forge-plan-v2-step:first-child{border-top:0;padding-top:6px}',
  '#plan .forge-plan-v2-step-number{height:26px;width:26px;border-radius:50%;background:#a8f55d;color:#15261a;display:grid;place-items:center;font-size:13px;font-weight:850}',
  '#plan .forge-plan-v2-step h3{font-size:17px;margin:1px 0 5px;color:#f1f9ef}',
  '#plan .forge-plan-v2-intro,#plan .forge-plan-v2-help{font-size:12px;line-height:1.5;color:#afc5b9;margin:3px 0 10px}',
  '#plan .forge-plan-v2-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
  '#plan .forge-plan-v2-field{display:grid;gap:6px;min-width:0;margin:2px 0 7px;font-size:13px;color:#cfe5d2}',
  '#plan .forge-plan-v2-field>label{font-weight:700}',
  '#plan .forge-plan-v2-field>small{font-size:11px;line-height:1.4;color:#a9bead}',
  '#plan .forge-plan-v2-field>select,#plan .forge-plan-v2-field>input{width:100%;min-width:0;min-height:49px;box-sizing:border-box;background:#10242a;color:#f0faf1;border:1px solid #597768;padding:10px;border-radius:10px;font-size:14px}',
  '#plan .forge-plan-v2-cadence{background:transparent;border:0;margin:0 0 9px;padding:0}',
  '#plan .forge-plan-v2-cadence>select{min-height:49px;font-size:15px}',
  '#plan .forge-plan-v2-weekday-pick[hidden]{display:none!important}',
  '#plan .forge-plan-v2-week-count{margin:8px 0 10px;font-size:13px;color:#b8efa0;font-weight:750}',
  '#plan .forge-plan-v2-daychoices{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0!important}',
  '#plan .forge-plan-v2-daychoices button{min-width:42px;min-height:44px;font-size:12px}',
  '#plan .forge-plan-v2-days>button{min-height:43px;margin:5px 0 0}',
  '#plan #forgePlanV2OriginalDays[hidden],#plan #forgePlanV2NewUnits[hidden]{display:none!important}',
  '#plan .forge-plan-v2-new-units{display:grid;gap:7px;margin:8px 0 12px;color:#d7e6d2;font-size:13px;font-weight:750}',
  '#plan .forge-plan-v2-new-units select{min-height:50px;width:100%;background:#121c16;color:#f1ffec;border:1px solid rgba(158,255,0,.4);border-radius:11px;padding:9px 12px}',
  '#plan .forge-plan-v2-submit{width:100%;min-height:55px;border-radius:12px;background:#a8f55d!important;color:#11221a!important;font-size:16px!important;font-weight:850!important;margin:9px 0 3px}',
  '#plan .forge-plan-v2-active{margin:12px 0 10px;padding:14px 0 4px;border-top:1px solid #436754;border-bottom:1px solid #36554b}',
  '#plan .forge-plan-v2-active[hidden]{display:none!important}',

  '#plan .forge-plan-v2-fold>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;list-style:none;min-height:66px}',
  '#plan .forge-plan-v2-fold>summary::-webkit-details-marker{display:none}',
  '#plan .forge-plan-v2-fold>summary:focus-visible{outline:2px solid #9eff00;outline-offset:3px;border-radius:8px}',
  '#plan .forge-plan-v2-fold-heading{flex:1;min-width:0}',
  '#plan .forge-plan-v2-fold-chevron{color:#9eff00;font-size:26px;line-height:1;transition:transform .18s;flex:none}',
  '#plan .forge-plan-v2-fold[open] .forge-plan-v2-fold-chevron{transform:rotate(180deg)}',
  '#plan .forge-plan-v2-fold-body{padding-top:7px}',
  '#plan .forge-plan-v2-cadence{margin:13px 0 0;border-top:1px solid rgba(168,218,157,.2);padding-top:13px}',
  '#plan .forge-plan-v2-cadence[hidden],#plan .forge-plan-v2-cadence-editor[hidden]{display:none!important}',
  '#plan .forge-plan-v2-cadence-row{display:flex;align-items:center;justify-content:space-between;gap:9px}',
  '#plan .forge-plan-v2-cadence-info{display:grid;gap:4px;min-width:0}',
  '#plan .forge-plan-v2-cadence-info strong{font-size:13px;color:#edf5eb}',
  '#plan .forge-plan-v2-cadence-info span{font-size:12px;color:#b6c9b6}',
  '#plan .forge-plan-v2-cadence-change{background:transparent;border:1px solid rgba(158,255,0,.4);border-radius:10px;color:#d5ffc0;padding:9px 13px;min-height:41px;flex:none;font-size:12px;font-weight:750}',
  '#plan .forge-plan-v2-cadence-editor{padding:15px 0 4px}',
  '#plan .forge-plan-v2-cadence-fields{display:grid;grid-template-columns:1fr 1fr;gap:11px}',
  '#plan .forge-plan-v2-cadence-fields label{display:grid;gap:6px;color:#cbdcc6;font-size:12px;font-weight:750;min-width:0}',
  '#plan .forge-plan-v2-cadence-fields :is(input,select){width:100%;min-width:0;min-height:46px;color-scheme:dark;padding:7px 9px;box-sizing:border-box}',
  '#plan .forge-plan-v2-cadence-help,#plan .forge-plan-v2-cadence-preview{font-size:11px;line-height:1.55;color:#aebfaf;margin:10px 0 0}',
  '#plan .forge-plan-v2-cadence-preview{color:#b1f28f}',
  '#plan .forge-plan-v2-cadence-actions{display:flex;justify-content:flex-end;gap:8px;margin:13px 0 0}',
  '#plan .forge-plan-v2-cadence-actions button{min-height:43px;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:750}',
  '#plan .forge-plan-v2-cadence-cancel{background:transparent;border:1px solid rgba(180,213,173,.24);color:#e6f0e4}',
  '#plan .forge-plan-v2-cadence-save{background:#9eff00;border:1px solid #9eff00;color:#111b0b}',
  '#plan .forge-plan-v2-cadence-feedback{font-size:12px;color:#b7f29a;margin:9px 0 0}',
  '#plan .forge-plan-v2-cadence-feedback:empty{display:none}',
  '#plan .forge-plan-v2-shift{margin:13px 0 0;padding:12px 0 3px;border-top:1px solid #365343}',
  '#plan .forge-plan-v2-shift[hidden],#plan .forge-plan-v2-shift-editor[hidden]{display:none!important}',
  '#plan .forge-plan-v2-shift-top{display:grid;gap:8px}',
  '#plan .forge-plan-v2-shift-due{font-size:13px;color:#edf6e8}',
  '#plan .forge-plan-v2-shift-open{width:100%;min-height:48px;border:1px solid #9eff00;border-radius:10px;background:#24422e;color:#d6ffb5;font-weight:800;font-size:14px}',
  '#plan .forge-plan-v2-shift-editor{padding:13px 0 4px}',
  '#plan .forge-plan-v2-shift-editor label{display:grid;gap:8px;font-size:13px;color:#d3e9d0;font-weight:700}',
  '#plan .forge-plan-v2-shift-editor input{width:100%;min-height:48px;box-sizing:border-box;padding:8px 12px;border-radius:9px;color-scheme:dark;font-size:16px}',
  '#plan .forge-plan-v2-shift-help{font-size:12px;line-height:1.5;color:#c4d7bd;margin:11px 0}',
  '#plan .forge-plan-v2-shift-preview{font-size:12px;line-height:1.6;color:#b8ff86;margin:10px 0}',
  '#plan .forge-plan-v2-shift-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}',
  '#plan .forge-plan-v2-shift-actions button{min-height:45px;padding:9px 12px;border-radius:9px;font-weight:750;font-size:12px}',
  '#plan .forge-plan-v2-shift-cancel{background:transparent;border:1px solid #56775b;color:#dce8da}',
  '#plan .forge-plan-v2-shift-save{background:#9eff00;border:1px solid #9eff00;color:#0c1608}',
  '#plan .forge-plan-v2-shift-feedback{font-size:12px;color:#b8ff86;line-height:1.5;margin:8px 0}',
  '#plan .forge-plan-v2-shift-feedback:empty{display:none}',
  '@media(max-width:380px){#plan .forge-plan-v2-cadence-fields{grid-template-columns:1fr}}',
  '#plan .forge-plan-v2-kicker{font-size:11px;color:#a8f55d;font-weight:850;letter-spacing:.08em}',
  '#plan .forge-plan-v2-active h2{font-size:20px;margin:6px 0 4px;color:#f4fff0}',
  '#plan .forge-plan-v2-active>p{font-size:13px;color:#c2d7c6;margin:0 0 10px}',
  '#plan .forge-plan-v2-unit{display:block;border-top:1px solid #324d42;padding:13px 0 14px}',
  '#plan .forge-plan-v2-unit-top{display:flex;gap:12px;justify-content:space-between;align-items:center}',
  '#plan .forge-plan-v2-exercises{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:0}',
  '#plan .forge-plan-v2-exercise{display:flex;justify-content:space-between;align-items:baseline;gap:9px;padding:7px 0;border-top:1px solid #283f35;font-size:13px;line-height:1.45}',
  '#plan .forge-plan-v2-exercise-name{color:#e6f0e7;min-width:0;overflow-wrap:anywhere}',
  '#plan .forge-plan-v2-exercise-dose{color:#c0dbb6;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;font-weight:700}',
  '#plan .forge-plan-v2-exercise-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none}',
  '#plan .forge-plan-v2-exercise-actions .forge-plan-v2-exercise-edit{width:37px;min-height:37px!important;padding:5px!important;border-radius:9px;background:transparent;color:#a8f55d;border:1px solid #587a60;font-size:19px;line-height:1}',
  '#plan .forge-plan-v2-exercise-actions .forge-plan-v2-exercise-edit:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
  '#plan .forge-plan-v2-unit-info{min-width:0;display:grid;gap:4px}',
  '#plan .forge-plan-v2-unit-info strong{font-size:14px;color:#f1f7ed;overflow-wrap:anywhere}',
  '#plan .forge-plan-v2-unit-info small{font-size:12px;color:#b9cbbc}',
  '#plan .forge-plan-v2-unit button{flex:none;min-height:44px;padding:8px 12px;border:1px solid #66845f;border-radius:9px;color:#d6f7c2;background:#21382c;font-size:12px}',
  '#plan .forge-plan-v2-new{width:100%;min-height:44px;margin:8px 0 13px;background:transparent;color:#c7e9ba;border:1px solid #4b6c54;border-radius:10px}',
  '@media(max-width:360px){#plan .forge-plan-v2-fields{grid-template-columns:1fr}#plan .forge-plan-v2-active{padding-right:0}#plan .forge-plan-v2-unit button{padding:8px 7px}}'
 ].join('\n');document.head.append(s);
}
function boot(){
 let tries=0;
 const run=()=>{
  if(installed)return;
  const page=$('plan');
  if(page&&$('forgeSimpleHero')&&$('forgeSlimTools')&&mountCreator(page)){
   styles();mountActive(page);installed=true;
   const oldRender=window.renderPlan;
   if(typeof oldRender==='function'){
    window.renderPlan=function(){const value=oldRender.apply(this,arguments);refreshOverview();return value;};
   }
   refreshOverview();return;
  }
  if(++tries<70)setTimeout(run,100);
 };
 run();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();