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
function model(plans,selected,active,draft){
 const p=(Array.isArray(plans)?plans:[]).find(x=>x.id===(active?.planId||selected))||null;
 const exercises=Array.isArray(p?.ex)?p.ex:[];
 let total=0,done=0;
 exercises.forEach((ex,i)=>{
  const n=Math.max(0,Number(ex.sets)||0);total+=n;
  const sets=draft?.planId===p?.id?draft.exercises?.[i]?.sets:[];
  for(let j=0;j<n;j++)if(sets?.[j]?.done&&Number(sets[j].reps)>0)done++;
 });
 return {id:p?.id||null,title:p?.title||'Noch kein Trainingsplan',location:p?.location==='home'?'Zuhause':'Fitnessstudio',
  exercises:exercises.map(ex=>({name:String(ex.name||'Übung'),sets:Math.max(0,Number(ex.sets)||0),reps:Number(ex.reps)||0,unit:ex.unit==='sec'?' Sek.':' Wdh.'})),
  total,done,live:!!active};
}
window.ForgeTrainingV3=Object.freeze({model,isInstalled:()=>installed});
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
 const summary=m.title+' · '+m.location+' · '+m.exercises.length+' Übungen';
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
   $('forgeTrainingV3Fill').style.width=(m.total?Math.round(100*m.done/m.total):0)+'%';
   lastProgress=sig;
  }
 }else{
  if(bar)bar.remove();
  lastProgress='';
 }
 if(lastLive!==m.live)lastLive=m.live;
}
function style(){
 if($('forgeTrainingV3Style'))return;
 const css=create('style');css.id='forgeTrainingV3Style';
 css.textContent=[
  '/* Clean reading order: session title, stopwatch, pause, current set, navigation, all exercises, finish. */',
  '#workout.forge-v3-ready .forge-v3-status,#workout.forge-v3-live .forge-v3-status{padding:5px 0 11px;border-bottom:1px solid #36564a;margin:4px 0 10px;display:grid;gap:4px}',
  '#workout .forge-v3-name{display:block;font-size:16px;line-height:1.35;color:#c4f498;font-weight:800}',
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
  '#workout .forge-v3-track{background:#274338;height:7px;border-radius:12px;overflow:hidden}',
  '#workout .forge-v3-fill{background:#a8f55d;height:100%;border-radius:12px;transition:width .18s}',
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