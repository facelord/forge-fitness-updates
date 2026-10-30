/* FORGE: fixed weekdays OR every X calendar days.
 * No external services, all configuration lives in state.settings (backup/archives).
 * Existing workout records are untouched; older plans stay in weekdays mode.
 */
(function(){
'use strict';
var C=window.ForgeCadenceCore;
if(!C){console.error('FORGE cadence math missing');return;}
var $=id=>document.getElementById(id);
var E=(tag,cl,txt)=>{var n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;return n;};
var dateNow=()=>C.localToday(new Date());
var localDate=s=>{var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2],12);};
var pretty=s=>localDate(s).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
var mode='weekdays',every=3,anchor=dateNow(),dirty=false;
var seenActive=null;
function cadence(){var c=state.settings&&state.settings.cadence;return c&&c.mode==='interval'&&state.plan.length?c:null;}
function Elt(tag,txt,cls){return E(tag,cls,txt);}
function syncFromActive(){
 if(dirty)return;
 var c=cadence();
 mode=c?'interval':'weekdays';
 if(c){every=c.every;anchor=c.anchor;}
}
function labelOptions(){return ['Feste Wochentage','Alle X Tage'];}
function applyMode(){
 document.querySelectorAll('[data-forge-cadence-mode]').forEach(n=>{n.value=mode;});
 document.querySelectorAll('[data-forge-cadence-every]').forEach(n=>{n.value=String(every);});
 document.querySelectorAll('[data-forge-cadence-anchor]').forEach(n=>{n.value=anchor;});
 document.querySelectorAll('.forge-cadence-interval').forEach(n=>{n.hidden=mode!=='interval';});
 var step=$('weekDayChoices')?.closest('.forge-plan-inline-step');
 if(step){
  var body=step.querySelector('.forge-plan-inline-body');
  if(body)Array.from(body.children).forEach(x=>{
   if(x.id==='forgeCadenceAuto')return;
   x.hidden=mode==='interval';
  });
  var heading=step.querySelector('h3');if(heading)heading.textContent='Trainingsrhythmus';
  var summary=step.querySelector('.forge-plan-inline-words p');if(summary)summary.textContent=mode==='interval'?'Ohne feste Wochentage':'Deine Wochentage';
 }
 var day=$('days'),dayLabel=day?.closest('div')?.querySelector('label');
 if(dayLabel)dayLabel.textContent=mode==='interval'?'Einheiten im Wechsel':'Tage pro Woche';
 var manualLabel=$('manualDay')?.closest('div')?.querySelector('label');
 if(manualLabel)manualLabel.textContent=mode==='interval'?'Trainingseinheit im Wechsel':'Wochentag';
 var dropdown=$('manualDay');if(dropdown)Array.from(dropdown.options).forEach((x,i)=>x.textContent=mode==='interval'?'Einheit '+String.fromCharCode(65+i):WEEK_NAMES[i]);
 document.querySelectorAll('.forge-cadence-preview').forEach(n=>{
  var count=n.closest('#forgeCadenceManual')?Math.max(1,(typeof manualDraft!=='undefined'&&manualDraft.length)||1):Math.max(1,Number($('days')?.value)||3);
  if(mode!=='interval'){
    n.textContent='Die Einheiten wiederholen sich jede Kalenderwoche.';
    return;
  }
  try {
   var demo=C.upcoming({mode:'interval',every:every,anchor:anchor,planOrder:Array.from({length:count},(_,i)=>String.fromCharCode(65+i))},anchor,4);
   n.textContent=demo.map(x=>pretty(x.date)+' · Einheit '+x.planId).join('   →   ')+' · danach alle '+every+' Tage.';
  }catch(ex){n.textContent='Bitte gültiges Startdatum und Intervall angeben.';}
 });
}
function newPanel(kind){
 var wrap=E('div','forge-cadence-panel');wrap.id=kind==='manual'?'forgeCadenceManual':'forgeCadenceAuto';
 wrap.append(E('label','', 'Wann möchtest du trainieren?'));
 var select=E('select');select.setAttribute('data-forge-cadence-mode','');select.setAttribute('aria-label','Trainingsrhythmus');
 [['weekdays','Feste Wochentage'],['interval','Alle X Tage']].forEach(entry=>{var opt=E('option','',entry[1]);opt.value=entry[0];select.append(opt);});
 wrap.append(select);
 var line=E('div','forge-cadence-interval');
 var grid=E('div','forge-cadence-fields');
 var field1=E('div');field1.append(E('label','', 'Abstand zwischen Trainings'));
 var count=E('select');count.setAttribute('data-forge-cadence-every','');count.setAttribute('aria-label','Trainingsabstand');
 for(var i=1;i<=14;i++){var o=E('option','',i+' '+(i===1?'Tag':'Tage'));o.value=String(i);count.append(o);}
 field1.append(count);
 var field2=E('div');field2.append(E('label','', 'Erste Trainingseinheit'));
 var date=E('input');date.type='date';date.setAttribute('data-forge-cadence-anchor','');date.setAttribute('aria-label','Erster Trainingstag');field2.append(date);
 grid.append(field1,field2);line.append(grid);
 line.append(E('p','forge-cadence-help','Alle 3 Tage bedeutet: Montag Training, Dienstag und Mittwoch frei, Donnerstag wieder Training. Deine Einheiten rotieren unabhängig vom Wochentag.'));
 var prev=E('p','forge-cadence-preview');line.append(prev);
 wrap.append(line);
 select.addEventListener('change',()=>{mode=select.value;dirty=true;applyMode();});
 count.addEventListener('change',()=>{every=Number(count.value);dirty=true;applyMode();});
 date.addEventListener('change',()=>{anchor=date.value;dirty=true;applyMode();});
 return wrap;
}
function mount(){
 if($('forgeCadenceAuto'))return;
 var choice=$('weekDayChoices');
 var step=choice?.closest('.forge-plan-inline-step');
 if(step){
  var body=step.querySelector('.forge-plan-inline-body');
  if(body)body.prepend(newPanel('auto'));
 }
 var manual=$('manualDay');
 if(manual){
  var manualPanel=newPanel('manual');
  var parent=manual.closest('.formgrid');
  if(parent)parent.before(manualPanel);
 }
 var css=E('style');css.id='forgeCadenceStyle';
 css.textContent=[
 '.forge-cadence-panel{padding:9px 0 14px;border-bottom:1px solid #384d4b;margin-bottom:12px}',
 '.forge-cadence-panel>label{display:block;margin:4px 0 7px;font-size:14px;font-weight:700}',
 '.forge-cadence-panel>select{min-height:49px;width:100%}',
 '.forge-cadence-interval{margin-top:12px}',
 '.forge-cadence-interval[hidden]{display:none!important}',
 '.forge-cadence-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
 '.forge-cadence-fields label{font-size:12px;display:block;margin-bottom:5px}',
 '.forge-cadence-fields select,.forge-cadence-fields input{width:100%;min-width:0;min-height:48px;color-scheme:dark}',
 '.forge-cadence-help,.forge-cadence-preview{font-size:12px;line-height:1.6;color:#c1d0c8;margin:9px 0}',
 '.forge-cadence-preview{padding:10px 0;border-top:1px solid #38514a;color:#a9f267}',
 '.forge-cadence-badge{border:1px solid #5e8256;padding:10px 12px;border-radius:12px;font-size:13px;color:#e8f7e9;margin:10px 0}',
 '.forge-cadence-upcoming{padding:9px 0;border-bottom:1px solid #35484d;font-size:12px;line-height:1.7}',
 '.forge-cadence-due{color:#a9f267;font-weight:750}',
 '@media(max-width:400px){.forge-cadence-fields{grid-template-columns:1fr}}'
 ].join('');
 document.head.append(css);
 syncFromActive();applyMode();
}
function validForm(){
 if(mode!=='interval')return null;
 var c={mode:'interval',every:every,anchor:anchor,planOrder:['placeholder']};
 try {C.validate(c);} catch(ex){alert('Bitte einen gültigen Abstand (1–14 Tage) und ersten Trainingstag wählen.');return false;}
 if(every===1&&!confirm('Alle 1 Tage bedeutet täglich Krafttraining ohne Ruhetag. Ist das so gewünscht?'))return false;
 return c;
}
function setCadence(oldPlanId){
 // Form validation already happened before original plan creation.
 // Avoid double-confirming daily training when every===1.
 var c=mode==='interval'?{mode:'interval',every:every,anchor:anchor,
  planOrder:state.plan.slice().sort((a,b)=>a.weekday-b.weekday).map(x=>x.id)}:null;
 if(c){
  state.plan.forEach((p,i)=>{
   p.title=String(p.title||'Training').replace(/\s*·\s*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)$/,'')+
      (state.plan.length>1?' · Einheit '+String.fromCharCode(65+i):'');
  });
  // Previous temporary weekday moves have no meaning under a rolling schedule.
  state.forgeWeekMoves=null;
 }
 state.settings={...state.settings,cadence:c};
 dirty=false;save();return true;
}
// A generated schedule uses the chosen count as cycle length rather than
// a literal choice of weekdays, but still reuses the original generator.
var originalGenerate=window.generatePlan;
window.generatePlan=function(){
 if(mode==='interval'&&validForm()===false)return;
 var prev=state.activePlanId;
 if(mode==='interval')selectedTrainingDays=null;
 originalGenerate.apply(this,arguments);
 if(state.activePlanId!==prev&&state.plan.length){setCadence(prev);render();}
};
var originalManual=window.manualSavePlan;
window.manualSavePlan=function(){
 if(mode==='interval'&&validForm()===false)return;
 var prev=state.activePlanId;
 originalManual.apply(this,arguments);
 if(state.activePlanId!==prev&&state.plan.length){setCadence(prev);render();}
};
// Manual templates are ordered workout slots, not weekdays, in interval mode.
var originalManualRender=window.manualRender;
window.manualRender=function(){
 var result=originalManualRender.apply(this,arguments);
 if(mode==='interval'&&$('manualPreview')){
  var days=typeof manualDraft!=='undefined' ? manualDraft.slice().sort((a,b)=>a.weekday-b.weekday) : [];
  $('manualPreview').querySelectorAll('.forge-manual-day').forEach((row,i)=>{
   var heading=row.querySelector('.row b');
   if(heading&&days[i])heading.textContent='Einheit '+String.fromCharCode(65+i)+' · '+(days[i].location==='gym'?'Studio':'Zuhause');
  });
 }
 applyMode();
 return result;
};
var originalLoad=window.manualLoadActive;
window.manualLoadActive=function(){
 originalLoad.apply(this,arguments);
 // Editing a rolling plan does not destroy its spacing preference.
 if(cadence()){var c=cadence();mode='interval';every=c.every;anchor=c.anchor;dirty=true;applyMode();}
};
var originalMap=window.forge130WeekTrainingMap;
window.forge130WeekTrainingMap=function(){
 var c=cadence();if(!c)return originalMap.apply(this,arguments);
 try {
  return new Map(C.week(c,dateNow()).filter(x=>x.event).map(x=>[x.weekday,
    state.plan.find(p=>p.id===x.event.planId)]).filter(x=>x[1]));
 } catch(ex){console.error('FORGE interval schedule',ex);return new Map();}
};
var originalDayEditor=window.forge130WeekEditor;
window.forge130WeekEditor=function(){
 if(cadence())return '';
 return originalDayEditor.apply(this,arguments);
};
function overview(){
 var c=cadence(),week=$('combinedWeek'),box=$('forgeCadenceOverview');
 if(!week)return;
 if(!box){box=E('div','forge-cadence-badge');box.id='forgeCadenceOverview';week.before(box);}
 if(!c){box.hidden=true;return;}box.hidden=false;
 try{
  var next=C.upcoming(c,dateNow(),5);
  box.replaceChildren();
  box.append(E('strong','forge-cadence-due','Alle '+c.every+' '+(c.every===1?'Tag':'Tage')+' · Training im Wechsel'));
  box.append(E('p','forge-cadence-help','Keine festen Trainingstage. Verpasste Termine verschieben den Kalender nicht automatisch.'));
  next.forEach((x,i)=>{
   var p=state.plan.find(v=>v.id===x.planId);
   var row=E('div','forge-cadence-upcoming',(i===0?'Nächstes Training: ':'')+pretty(x.date)+' · '+(p?.title||'Training'));
   box.append(row);
  });
 }catch(err){box.textContent='Trainingsrhythmus kann derzeit nicht angezeigt werden.';}
}
function relabelWeek(){
 var c=cadence(),week=$('combinedWeek');if(!week)return;
 var cards=week.querySelectorAll(':scope > .card');
 if(!c)return;
 var dates=C.week(c,dateNow());
 Array.from(cards).slice(0,7).forEach((card,i)=>{
  var title=card.querySelector('.row h3');
  if(title)title.textContent=WEEK_NAMES[i]+' · '+pretty(dates[i].date).split(', ').pop();
  // "Verschieben" weekday editor is disabled in interval mode, as desired.
 });
}
var originalCombined=window.renderCombinedWeek;
window.renderCombinedWeek=function(){
 var value=originalCombined.apply(this,arguments);
 overview();relabelWeek();return value;
};
var originalDashboardWeek=window.renderDashboardWeek;
window.renderDashboardWeek=function(){
 var result=originalDashboardWeek.apply(this,arguments),c=cadence(),root=$('dashboardWeek');
 if(c&&root){
  var weeks=C.week(c,dateNow()),rows=root.querySelectorAll(':scope > .exercise');
  Array.from(rows).slice(0,7).forEach((row,i)=>{
   var heading=row.querySelector('.row b');
   if(heading)heading.textContent=WEEK_NAMES[i]+' · '+localDate(weeks[i].date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
  });
 }
 return result;
};
// Link mobility videos to the actual calendar date, not the obsolete
// template weekday, when an interval-plan workout is running.
var originalStartMobilityVideo=window.startMobilityVideo;
window.startMobilityVideo=function(day){
 var result=originalStartMobilityVideo.apply(this,arguments);
 var c=cadence(),a=state.activeMobilityVideo;
 if(!c||!a||!state.activeWorkout||Number(a.day)!==Number(day))return result;
 var assignment=videoAssignments().find(v=>v.day===Number(day));
 var scheduled=C.week(c,dateNow()).find(v=>v.weekday===Number(day))?.event;
 if(assignment?.timing==='after'&&scheduled?.planId===state.activeWorkout.planId){
  a.linked=true;a.workoutPlanId=state.activeWorkout.planId;
  if(!state.activeWorkout.mobilityStartedAt)state.activeWorkout.mobilityStartedAt=a.startedAt;
  save();updateMobilityClock();renderMobility();
 }
 return result;
};
var originalDashboard=window.startWorkoutFromDashboard;
window.startWorkoutFromDashboard=function(){
 var c=cadence();if(!c)return originalDashboard.apply(this,arguments);
 var due=C.next(c,dateNow()),p=state.plan.find(x=>x.id===due.planId);
 if(!p)return go('plan');
 if(due.date!==dateNow()&&!confirm('Heute ist laut Rhythmus Ruhetag. Nächste Einheit: '+pretty(due.date)+'. Trotzdem jetzt mit dieser Einheit trainieren?'))return;
 startWorkout(p.id);
};
var originalRender=window.render;
window.render=function(){
 var result=originalRender.apply(this,arguments);
 if(!dirty)syncFromActive();applyMode();
 var c=cadence();if(!c)return result;
 try{
  var next=C.next(c,dateNow()),p=state.plan.find(x=>x.id===next.planId);
  if(p){
   if($('nextTitle'))$('nextTitle').textContent=p.title;
   if($('nextDetail'))$('nextDetail').textContent='Nächstes Training: '+pretty(next.date)+' · '+p.ex.length+' Übungen';
   if($('dashboardStart'))$('dashboardStart').textContent=next.date===dateNow()?'Heutiges Training starten →':'Nächste Einheit ('+pretty(next.date)+') →';
  }
  if($('metrics')){
   var labels=$('metrics').querySelectorAll('small');
   if(labels.length>1)labels[1].textContent='Einheiten im Wechsel';
  }
  if($('weekSummary')){
   var week=C.week(c,dateNow()),count=week.filter(x=>x.event).length;
   var recent=state.workouts.filter(w=>Date.now()-new Date(w.date).getTime()<7*86400000).length;
   $('weekSummary').textContent=recent+' Workouts in den letzten 7 Tagen · '+count+' geplant in dieser Kalenderwoche';
  }
 }catch(ex){console.warn('FORGE cadence overview',ex);}
 return result;
};
var originalWorkout=window.renderWorkout;
window.renderWorkout=function(){
 var result=originalWorkout.apply(this,arguments);
 if(!cadence())return result;
 var choices=$('workoutSelect');
 if(choices)Array.from(choices.options).forEach(o=>{
  var p=state.plan.find(x=>x.id===o.value);
  if(p)o.textContent=p.title+' · '+(p.location==='gym'?'Studio':'Zuhause');
 });
 var p=state.plan.find(x=>x.id===choices?.value);
 if(p&&$('workoutInfo'))$('workoutInfo').textContent=p.ex.length+' Übungen · '+(p.location==='gym'?'Fitnessstudio':'Zuhause')+' · flexibel im Trainingsrhythmus';
 return result;
};
var originalDeactivate=window.deactivatePlan;
window.deactivatePlan=function(){
 var ret=originalDeactivate.apply(this,arguments);
 if(!state.plan.length){dirty=false;mode='weekdays';applyMode();}
 return ret;
};
var originalReactivate=window.reactivatePlan;
window.reactivatePlan=function(){
 var ret=originalReactivate.apply(this,arguments);
 dirty=false;syncFromActive();applyMode();return ret;
};
function boot(){
 mount();
 var id=state.activePlanId;
 if(id!==seenActive){seenActive=id;syncFromActive();applyMode();}
 // Core FORGE renders before this add-on script loads. Refresh once so
 // restored interval plans display actual calendar dates immediately.
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();