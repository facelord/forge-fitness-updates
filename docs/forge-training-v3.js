/* FORGE Training v3: one glanceable training surface, no duplicate workout state.
 * Uses the existing plan, draft, button handlers, timers and DOM nodes.
 * IMPORTANT: never rerender an editable set input or alter the workout records.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const create=(tag,cls,text)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
};
function setProgress(plan,draft){
 const exercises=Array.isArray(plan?.ex)?plan.ex:[];
 let total=0,done=0;
 for(let i=0;i<exercises.length;i++){
  const n=Math.max(0,Math.trunc(Number(exercises[i].sets)||0));
  total+=n;
  // Only explicitly confirmed, valid sets from THIS plan count.
  const sets=draft?.planId===plan?.id?draft.exercises?.[i]?.sets:[];
  for(let j=0;j<n;j++)if(sets?.[j]?.done===true&&Number(sets[j].reps)>0)done++;
 }
 return {total,done,percent:total?Math.round(done/total*100):0};
}
function model(plans,selected,active,draft){
 const p=(Array.isArray(plans)?plans:[]).find(x=>x.id===(active?.planId||selected))||null;
 const exercises=Array.isArray(p?.ex)?p.ex:[];
 const {total,done,percent}=setProgress(p,draft);
 return {id:p?.id||null,title:p?.title||'Noch kein Trainingsplan',location:p?.location==='home'?'Zuhause':'Fitnessstudio',
  exercises:exercises.map(ex=>({name:String(ex.name||'Übung'),sets:Math.max(0,Number(ex.sets)||0),reps:Number(ex.reps)||0,unit:ex.unit==='sec'?' Sek.':' Wdh.'})),
  total,done,percent,live:!!active};
}
function lastPerformance(history,name,setIndex=0){
 if(!Array.isArray(history)||!name||!Number.isInteger(setIndex)||setIndex<0)return null;
 for(let i=history.length-1;i>=0;i--){
  const w=history[i],entry=(Array.isArray(w?.entries)?w.entries:[]).find(e=>e.name===name);
  const set=entry?.sets?.[setIndex];
  if(set&&Number.isFinite(Number(set.kg))&&Number(set.kg)>=0&&Number(set.reps)>0)
   return {kg:Number(set.kg),reps:Number(set.reps),date:w.date||null};
 }
 return null;
}
// Conservative double progression. Read existing workout history only;
// no estimated recovery, profile or new persisted data model.
function progressionFor(history,name,setIndex,targetSets,targetReps,increment=2.5){
 const last=lastPerformance(history,name,setIndex);
 const none={type:'none',last,suggested:null,reason:''};
 if(!last||!Number.isFinite(last.kg)||last.kg<=0)return none;
 const repeat={type:'repeat',last,suggested:last.kg,reason:'Letztes Gewicht wiederholen'};
 const sets=Number(targetSets),reps=Number(targetReps),step=Number(increment);
 if(!Number.isInteger(sets)||sets<1||!Number.isInteger(reps)||reps<1||
    !Number.isInteger(setIndex)||setIndex<0||setIndex>=sets||!Number.isFinite(step)||step<=0)return repeat;
 // At most the last two sessions with the matching exercise.
 const recent=(Array.isArray(history)?history:[]).slice().reverse()
  .map(w=>(Array.isArray(w?.entries)?w.entries:[]).find(e=>e.name===name))
  .filter(Boolean).slice(0,2);
 if(recent.length<2)return repeat;
 const qualifies=e=>Array.isArray(e.sets)&&e.sets.length>=sets&&
  e.sets.slice(0,sets).every(x=>Number.isFinite(Number(x.kg))&&Number(x.kg)>0&&Number(x.reps)>=reps);
 if(!recent.every(qualifies))return repeat;
 if(recent[0].sets.slice(0,sets).some((x,i)=>Number(x.kg)<Number(recent[1].sets[i].kg)))return repeat;
 if(step/last.kg>0.05)return repeat;
 const proposal=Math.round((last.kg+step)*100)/100;
 return {type:'increase',last,suggested:proposal,reason:'Zweimal alle Zielwiederholungen erreicht'};
}
window.ForgeTrainingV3=Object.freeze({model,setProgress,lastPerformance,progressionFor,isInstalled:()=>installed});
let installed=false,signature='',lastProgress='',lastLive=null,visit=null;
function placeStable(node,anchor){
 if(!node||!anchor||node.previousElementSibling===anchor)return;
 anchor.after(node);
}
function install(){
 if(installed)return true;
 const page=$('workout'),lead=page?.querySelector('.forge150-workout-lead');
 const clock=$('workoutDigitalClock')?.closest('.forge-clock');
 const start=$('workoutStart'),quick=$('forgeQuickWorkout');
 if(!page||!lead||!clock||!start||!quick||!$('workoutSelect')||!$('forgeLiveControls'))return false;
 const status=create('div','forge-v3-status');status.id='forgeTrainingV3Status';
 const title=create('strong','forge-v3-name','Dein Training');
 const sub=create('span','forge-v3-sub','');
 status.append(title,sub);
 clock.before(status);
 const preview=create('section','forge-v3-preview');preview.id='forgeTrainingV3Preview';
 preview.append(create('h3','', 'Deine Übungen'));
 preview.append(create('p','forge-v3-preview-help','Du kannst die Einheit vor dem Start kurz ansehen.'));
 const list=create('ol','forge-v3-list');list.id='forgeTrainingV3List';preview.append(list);
 const planButton=create('button','forge-v3-plan-link','✎ Plan dauerhaft bearbeiten');
 planButton.type='button';
 planButton.addEventListener('click',()=>{
  if(typeof window.go==='function')window.go('plan');
  if(typeof window.forgeOpenActivePlanDay==='function'){
   const id=$('workoutSelect')?.value;
   if(id)window.forgeOpenActivePlanDay(id);
  }
 });
 preview.append(planButton);
 start.after(preview);
 installed=true;
 style();
 render();
 return true;
}
function render(){
 if(!installed||typeof state!=='object')return;
 const m=model(state.plan,$('workoutSelect')?.value,state.activeWorkout,state.workoutDraft);
 const page=$('workout');
 page.classList.toggle('forge-v3-live',m.live);
 page.classList.toggle('forge-v3-ready',!m.live);
 const title=$('forgeTrainingV3Status')?.querySelector('.forge-v3-name');
 const sub=$('forgeTrainingV3Status')?.querySelector('.forge-v3-sub');
 const titleText=m.live?'● Training läuft':'Deine nächste Einheit';
 if(title&&title.textContent!==titleText)title.textContent=titleText;
 const summary=m.live
  ?m.title+' · '+(m.total&&m.done===m.total?'Alle '+m.total+' Sätze erledigt':m.done+' von '+m.total+' Sätzen erledigt')
  :m.title+' · '+m.exercises.length+' Übungen · '+m.location;
 if(sub&&sub.textContent!==summary)sub.textContent=summary;
 const preview=$('forgeTrainingV3Preview');
 if(preview)preview.hidden=m.live||!m.id;
 // "Without timer" is a supported legacy workflow: keep it accessible via
 // the existing original save button rather than hiding the entire options.
 const optionLabel=$('forgeLiveOptions')?.querySelector(':scope > summary');
 const label=m.live?'Aufwärmen & Übungsreihenfolge':'Ohne Timer erfassen & weitere Optionen';
 if(optionLabel&&optionLabel.textContent!==label)optionLabel.textContent=label;
 const nextSignature=m.id+':'+m.exercises.map(x=>[x.name,x.sets,x.reps,x.unit].join(':')).join('|');
 const list=$('forgeTrainingV3List');
 if(list&&nextSignature!==signature){
  signature=nextSignature;
  list.replaceChildren();
  m.exercises.forEach((x,i)=>{
   const row=create('li','forge-v3-item');
   row.append(create('span','forge-v3-item-name',(i+1)+'. '+x.name),
              create('span','forge-v3-item-sets',x.sets+' × '+x.reps+x.unit));
   list.append(row);
  });
 }
 const bar=$('forgeTrainingV3Bar');
 if(m.live){
  if(!bar){
   const b=create('div','forge-v3-progress');b.id='forgeTrainingV3Bar';
   b.setAttribute('role','progressbar');b.setAttribute('aria-label','Abgeschlossene Sätze');
   const track=create('div','forge-v3-track');const fill=create('div','forge-v3-fill');fill.id='forgeTrainingV3Fill';
   track.append(fill);b.append(track);
   // Never insert anything between live pause/rest/current-set nodes:
   // the timer's ensureUi() keeps that exact order and would otherwise move
   // the editable set fields on every tick (closing Android's keyboard).
   $('forgeTrainingV3Status')?.append(b);
  }
  const current=$('forgeTrainingV3Bar');
  const sig=m.done+'/'+m.total;
  if(current&&sig!==lastProgress){
   current.setAttribute('aria-valuemin','0');
   current.setAttribute('aria-valuemax',String(Math.max(1,m.total)));
   current.setAttribute('aria-valuenow',String(m.done));
   current.setAttribute('aria-valuetext',m.done+' von '+m.total+' Sätzen abgeschlossen');
   $('forgeTrainingV3Fill').style.width=m.percent+'%';
   lastProgress=sig;
  }
 }else{
  if(bar)bar.remove();
  lastProgress='';
 }
 if(lastLive!==m.live)lastLive=m.live;
 // Only the small read-only tip below the existing kg/reps inputs changes.
 // Never replace the input card, the set list or the proven save handler.
 try{renderProgression(m);}catch(error){console.warn('FORGE: Progression hint skipped',error);}
}
function renderProgression(m){
 const root=$('forgeQuickWorkout');
 if(!root)return;
 const card=root.querySelector(':scope > .forge130-focus-card');
 if(!card)return;
 const old=card.querySelector(':scope > .forge-v3-progression');
 if(!m.live||!m.id||typeof state==='undefined'){
  old?.remove();return;
 }
 const p=state.plan?.find(x=>x.id===state.activeWorkout?.planId);
 if(!p||String($('workoutSelect')?.value)!==String(p.id)||typeof forge130CurrentFocus!=='function'){
  old?.remove();return;
 }
 const focus=forge130CurrentFocus(p);
 const ex=focus&&p.ex?.[focus.i],grid=card.querySelector('.forge130-focus-card-grid');
 if(!focus||!ex||!grid){old?.remove();return;}
 const name=state.workoutDraft?.planId===p.id
  ?state.workoutDraft.exercises?.[focus.i]?.name||ex.name:ex.name;
 const timed=ex.unit==='sec'||(typeof forgeTimeIsExercise==='function'&&forgeTimeIsExercise(name,ex));
 if(timed){old?.remove();return;}
 const big=/Kniebeug|Beinpresse|Kreuzheben|Ausfallschritt|Wadenheben/.test(name);
 const info=progressionFor(state.workouts,name,focus.j,Number(ex.sets),Number(ex.reps),big?5:2.5);
 if(!info.last&&info.suggested===null){old?.remove();return;}
 let note=old;
 if(!note){
  note=create('div','forge-v3-progression');
  note.setAttribute('aria-label','Vergangene Leistung und Gewichtsvorschlag');
  grid.after(note);
 }
 const stamp=[p.id,focus.i,focus.j,name,info.type,info.last?.kg,info.last?.reps,info.suggested].join('|');
 if(note.dataset.stamp===stamp)return;
 note.dataset.stamp=stamp;
 note.replaceChildren();
 if(info.last){
  const previous=info.last.kg>0?info.last.kg.toLocaleString('de-DE')+' kg':'Körpergewicht';
  note.append(create('span','forge-v3-last','Zuletzt · Satz '+(focus.j+1)+': '+previous+' × '+info.last.reps+' Wdh.'));
 }
 if(info.suggested!==null){
  const prompt=create('div','forge-v3-hint');
  const value=info.suggested.toLocaleString('de-DE');
  prompt.append(create('span','',info.type==='increase'
   ?'Vorsichtig steigern: '+value+' kg':'Gewicht wiederholen: '+value+' kg'));
  const action=create('button','forge-v3-use-weight','Übernehmen');
  action.type='button';
  action.setAttribute('aria-label','Vorgeschlagene '+value+' Kilogramm für Satz '+(focus.j+1)+' übernehmen');
  const startedAt=state.activeWorkout?.startedAt;
  action.addEventListener('click',()=>{
   const active=state.activeWorkout;
   if(!active||active.planId!==p.id||active.startedAt!==startedAt||
      $('workoutSelect')?.value!==p.id||typeof forge130CurrentFocus!=='function')return;
   const now=forge130CurrentFocus(p);
   if(!now||now.i!==focus.i||now.j!==focus.j)return;
   if(state.workoutDraft?.exercises?.[focus.i]?.sets?.[focus.j]?.done)return;
   const input=$('forge130QuickKg');
   if(!input||input.disabled||typeof KEY!=='string'||typeof localStorage==='undefined')return;
   const beforeInput=input.value;
   const beforeDraft=state.workoutDraft?structuredClone(state.workoutDraft):null;
   const row=typeof workoutExercises!=='undefined'
    ?workoutExercises.querySelector('[data-ex="'+focus.i+'"][data-set="'+focus.j+'"][data-field="kg"]'):null;
   const beforeRow=row?.value;
   let raw=null;
   try{
    raw=localStorage.getItem(KEY);
    input.value=String(info.suggested);
    // The current, unchanged FORGE input handler synchronizes the draft.
    input.dispatchEvent(new Event('input',{bubbles:true}));
    const currentSet=state.workoutDraft?.exercises?.[focus.i]?.sets?.[focus.j];
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    const savedSet=saved?.workoutDraft?.exercises?.[focus.i]?.sets?.[focus.j];
    const matches=x=>x&&Number(x.kg)===info.suggested;
    if(!matches(currentSet)||!matches(savedSet)||
       String(saved?.activeWorkout?.planId)!==String(p.id))
     throw Error('Satzgewicht nicht zuverlässig gespeichert');
    action.textContent='✓ Übernommen';action.disabled=true;
    prompt.setAttribute('aria-label','Gewicht übernommen und gespeichert');
    input.addEventListener('input',()=>{action.textContent='Übernehmen';action.disabled=false;},{once:true});
   }catch(error){
    console.error('FORGE Gewichtsvorschlag konnte nicht übernommen werden',error);
    input.value=beforeInput;
    if(row)row.value=beforeRow??'';
    state.workoutDraft=beforeDraft;
    try{if(raw===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,raw);}
    catch(rollback){console.error('FORGE: Gewichtsvorschlag Rollback',rollback);}
    alert('Gewicht konnte nicht bestätigt gespeichert werden. Dein bisheriger Satz bleibt erhalten.');
   }
  });
  prompt.append(action);note.append(prompt);
  note.append(create('span','forge-v3-last',info.reason+' · nur der aktuelle Satz'));
 }
}
function style(){
 if($('forgeTrainingV3Style'))return;
 const css=create('style');css.id='forgeTrainingV3Style';
 css.textContent=[
  '/* Clean reading order: session title, stopwatch, pause, current set, navigation, all exercises, finish. */',
  '#workout.forge-v3-ready .forge-v3-status,#workout.forge-v3-live .forge-v3-status{padding:5px 0 11px;border-bottom:1px solid #36564a;margin:4px 0 10px;display:grid;gap:4px}',
  '#workout .forge-v3-name{display:block;font-size:16px;line-height:1.35;color:#c4f498;font-weight:800}',
  '#workout.forge-v3-live .forge-v3-status{gap:3px!important;padding:4px 0 10px!important;margin-bottom:8px!important;background:transparent!important;border-top:0!important}',
  '#workout.forge-v3-live .forge-v3-name{font-size:14px}',
  '#workout.forge-v3-live .forge-v3-sub{font-variant-numeric:tabular-nums}',
  '#workout .forge-v3-sub{font-size:12px;color:#c5d9cb;line-height:1.5;overflow-wrap:anywhere}',
  '#workout .forge-v3-preview{margin:13px 0 2px;padding:12px 0;border-top:1px solid #334e42;background:transparent}',
  '#workout .forge-v3-preview[hidden]{display:none!important}',
  '#workout .forge-v3-preview h3{font-size:15px;margin:0 0 4px;color:#eaf7e8}',
  '#workout .forge-v3-preview-help{font-size:12px;color:#adbfad;margin:0 0 8px}',
  '#workout .forge-v3-list{list-style:none;padding:0;margin:0}',
  '#workout .forge-v3-item{display:flex;gap:8px;justify-content:space-between;align-items:baseline;border-top:1px solid #294437;padding:9px 0;font-size:13px}',
  '#workout .forge-v3-item-name{min-width:0;color:#e3eee2;overflow-wrap:anywhere}',
  '#workout .forge-v3-item-sets{color:#c3e9aa;font-size:12px;white-space:nowrap;font-weight:700}',
  '#workout .forge-v3-plan-link{width:100%;min-height:44px;background:transparent;color:#bce9a6;border:1px solid #4a7054;border-radius:10px;margin:13px 0 0;font-size:13px;font-weight:700}',
  '#workout.forge-v3-ready #forgeLiveOptions{display:block!important;margin:10px 0 0!important;border-top:1px solid #385347!important}',
  '#workout.forge-v3-ready .forge-workout-all{margin-top:10px!important}',
  '#workout.forge-v3-live #forgeLiveControls>.forge-live-state{display:none!important}',
  '#workout .forge-v3-progress{padding:3px 0 8px}',
  '#workout .forge-v3-track{background:#274338;height:6px;border-radius:12px;overflow:hidden}',
  '/* A single reading path during training: clock -> current set -> list -> finish. */',
  '#workout.forge-v3-live #forgeQuickWorkout .forge130-focus-card{gap:8px!important}',
  '#workout.forge-v3-live #forgeQuickWorkout .forge130-focus-card-title{font-weight:800!important;line-height:1.25!important}',
  '#workout.forge-v3-live #forgeQuickWorkout .forge130-focus-card-hint{font-size:12px!important;line-height:1.4!important}',
  '#workout.forge-v3-live #forgeQuickWorkout .forge130-focus-card-grid{margin:8px 0 6px!important}',
  '#workout.forge-v3-live #forgeLiveNext{background:transparent!important;box-shadow:none!important}',
  '#workout .forge-v3-fill{background:#a8f55d;height:100%;border-radius:12px;transition:width .18s}',
  '#workout.forge-v3-live .forge130-suggestion{display:none!important}',
  '#workout .forge-v3-progression{margin:0 0 4px;padding:8px 10px;background:#172f29;border-left:3px solid #72975e;border-radius:0 9px 9px 0;display:grid;gap:5px}',
  '#workout .forge-v3-last{font-size:12px;color:#c7d6c8}',
  '#workout .forge-v3-hint{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0;font-size:12px;color:#d8f1ce;font-weight:700}',
  '#workout .forge-v3-use-weight{min-height:39px;min-width:97px;padding:7px 10px;border-radius:9px;border:1px solid #78a361;color:#eaffdf;background:#254431;font-size:12px;font-weight:800}',
  '#workout .forge-v3-use-weight:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
  '#workout.forge-v3-live #forgeLiveNext{margin:6px 0 10px!important}',
  '#workout.forge-v3-live .forge-workout-all{display:block!important;margin:15px 0 10px!important;border-top:1px solid #38554a!important;padding:0!important}',
  '#workout.forge-v3-live .forge-workout-all>summary{display:flex!important;align-items:center;min-height:53px!important;font-size:17px!important;font-weight:800!important;padding:12px 7px!important;background:#172e27!important;border-left:4px solid #a8f55d!important;color:#def7ce!important}',
  '#workout.forge-v3-live #forgeLiveOptions{margin:8px 0!important;border-top:1px solid #344b3f!important}',
  '#workout.forge-v3-live #forgeLiveOptions>summary{font-size:12px!important;color:#b4cab6!important;min-height:46px!important}',
  '#workout.forge-v3-live #forgeQuickWorkout .forge130-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:8px!important;margin:11px 0 9px!important}',
  '#workout.forge-v3-live #forgeQuickWorkout .forge130-actions button{min-height:45px!important;font-size:12px!important;white-space:normal!important}',
  '#workout.forge-v3-live #saveWorkout{display:flex!important;min-height:56px!important;margin-top:14px!important;background:#a8f55d!important;color:#13251b!important;font-size:16px!important;font-weight:800!important}',
  '@media(prefers-reduced-motion:reduce){#workout .forge-v3-fill{transition:none!important}}'
 ].join('\n');
 document.head.append(css);
}
function boot(){
 let n=0;
 const activate=()=>{
  if(install())return;
  if(++n<60)setTimeout(activate,100);
 };
 activate();
 // No fixed DOM rewrites: update only a little status text and read-only list.
 // Existing set fields and the Android keyboard never get rebuilt here.
 setInterval(render,1150);
 document.addEventListener('change',e=>{
  if(e.target?.id==='workoutSelect')render();
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();