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
function planSummary(plan=[],settings={}){
 const count=Array.isArray(plan)?plan.length:0;
 const exerciseCount=(Array.isArray(plan)?plan:[]).reduce((sum,p)=>sum+(Array.isArray(p.ex)?p.ex.length:0),0);
 const cadence=settings?.cadence;
 const schedule=cadence?.mode==='interval'?
  'Alle '+cadence.every+' '+(Number(cadence.every)===1?'Tag':'Tage'):
  count+' '+(count===1?'Einheit':'Einheiten')+' pro Woche';
 return {count,exerciseCount,schedule};
}
window.ForgePlanIntuitive=Object.freeze({usableDays,planSummary,isInstalled:()=>installed});
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
 const dayCount=$('forgePlanV2WeekCount');
 if(dayCount)dayCount.textContent=String($('#days')?.value||3)+(isInterval?' verschiedene Einheiten im Wechsel':' Trainingstage pro Woche');
 const rhythm=$('forgePlanV2Rhythm');
 if(rhythm)rhythm.textContent=isInterval?'Flexible Termine nach deinem Abstand.':'Wähle deine festen Tage oder lasse FORGE verteilen.';
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
 const units=$('forgePlanV2Units');
 if(!units)return;
 const signature=(state.plan||[]).map(p=>[p.id,p.title,p.location,p.ex?.length,p.ex?.map(e=>e.name+':'+e.sets+':'+e.reps).join(',')].join('|')).join('||');
 if(units.dataset.signature===signature)return;
 units.dataset.signature=signature;
 units.replaceChildren();
 (state.plan||[]).forEach((p,i)=>{
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
 surface.append(kicker,heading,info,units);
 const create=button('＋ Anderen Plan erstellen',()=>{
  const opener=$('forgeSlimTools')?.querySelector('[data-slim-open="create"]');
  if(opener?.getAttribute('aria-pressed')!=='true')opener?.click();
  $('forge150PlanHub')?.scrollIntoView?.({block:'start',behavior:'smooth'});
 },'btn alt small forge-plan-v2-new');
 create.setAttribute('aria-label','Neuen Plan erstellen; der aktuelle bleibt bis zur Aktivierung erhalten');
 surface.append(create);
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
 moveField(schedule,'Wie viele Trainingstage?','days');
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
  '#plan .forge-plan-v2-submit{width:100%;min-height:55px;border-radius:12px;background:#a8f55d!important;color:#11221a!important;font-size:16px!important;font-weight:850!important;margin:9px 0 3px}',
  '#plan .forge-plan-v2-active{margin:12px 0 10px;padding:14px 0 4px;border-top:1px solid #436754;border-bottom:1px solid #36554b}',
  '#plan .forge-plan-v2-active[hidden]{display:none!important}',
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