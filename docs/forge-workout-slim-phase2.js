/* FORGE UX Phase 2 – one focused workout surface. UI only; all saved
 * set entries, start/finish flows, live timers and recovery keep their
 * original event handlers and stable DOM IDs.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
};
function modeFor(state){
 return state?.activeWorkout?'active':'idle';
}
function isTimeAction(onclick){
 return /forgeTimeFinish/.test(String(onclick||''));
}
window.ForgeWorkoutSlim=Object.freeze({modeFor,isTimeAction});
let enabled=false,updating=false,previousMode=null,previousFocus=null;
function style(){
 if($('forgeWorkoutSlimStyle'))return;
 const css=el('style');css.id='forgeWorkoutSlimStyle';
 css.textContent=[
  '/* One surface: remove three borders/panels around the same exercise. */',
  '#workout.forge-slim-workout>.tag{display:none!important}',
  '#workout.forge-slim-workout>h1{font-size:23px;margin:5px 0 14px}',
  '#workout.forge-slim-workout .forge150-workout-lead{padding:0!important;margin:8px 0 12px!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important}',
  '#workout.forge-slim-workout .forge150-workout-lead>.forge-fold-details{background:transparent!important;border:0!important;padding:0!important;margin:0!important;box-shadow:none!important;overflow:visible!important}',
  '#workout.forge-slim-workout .forge150-workout-lead .forge-fold-body{padding:0!important;background:transparent!important;border:0!important}',
  '#workout.forge-slim-workout .forge150-workout-lead .forge-fold-body>.card{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;margin:0!important}',
  '#workout.forge-slim-workout .forge150-workout-lead .forge-fold-body>.card>label:first-child{font-size:12px}',
  '#workout.forge-slim-workout .forge150-workout-lead #workoutSelect{min-height:48px}',
  '#workout.forge-slim-workout .forge150-modes{display:flex;gap:8px;margin:4px 0 12px}',
  '#workout.forge-slim-workout .forge150-modes>button{border-radius:10px!important;min-height:44px}',
  '/* Idle: one start action; avoid duplicate quick-start and save banners. */',
  '#workout.forge-slim-idle #forgeQuickWorkout{display:none!important}',
  '#workout.forge-slim-idle #forgeRestTimer{display:none!important}',
  '#workout.forge-slim-idle .forge-live-next{display:none!important}',
  '#workout.forge-slim-idle #forgeLiveControls{display:none!important}',
  '#workout.forge-slim-idle #forgeLiveOptions{margin-top:8px!important}',
  '#workout.forge-slim-idle #workoutStart{min-height:50px;width:100%;font-size:15px;background:#a8f55d!important;color:#14231c!important;border-radius:12px!important}',
  '#workout.forge-slim-idle .forge-clock{margin:6px 0 12px!important;padding:12px!important;border-radius:12px!important}',
  '/* Active: current exercise, net clock and pause take priority. */',
  '#workout.forge-slim-active>h1{display:none!important}',
  '#workout.forge-slim-active>#forge144WorkoutCoach{display:none!important}',
  '#workout.forge-slim-active>#forge150WorkoutModes{display:none!important}',
  '#workout.forge-slim-active .forge150-workout-lead>.forge-fold-details>summary{display:none!important}',
  '#workout.forge-slim-active .forge150-workout-lead .forge-fold-body>.card>label:first-child,',
  '#workout.forge-slim-active #workoutSelect,',
  '#workout.forge-slim-active #workoutInfo{display:none!important}',
  '#workout.forge-slim-active .forge-clock{display:grid!important;grid-template-columns:1fr auto;align-items:center;gap:3px 12px;margin:0 0 8px!important;padding:7px 2px!important;border:0!important;border-bottom:1px solid #35524b!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}',
  '#workout.forge-slim-active .forge-clock .forge-clock-label{grid-column:1;grid-row:1;font-size:10px!important;color:#b7cdbf!important}',
  '#workout.forge-slim-active .forge-clock .forge-clock-digits{grid-column:2;grid-row:1/3;margin:0;font-size:clamp(29px,8vw,43px)!important;color:#a8f55d!important;line-height:1.15!important;text-align:right!important}',
  '#workout.forge-slim-active .forge-clock #workoutTimer{grid-column:1;grid-row:2;font-size:11px!important;color:#aac6b5!important}',
  '#workout.forge-slim-active #forgeLiveControls{display:flex!important;align-items:center;gap:8px;padding:0 0 10px!important;margin:0 0 8px!important;background:transparent!important;border:0!important;border-bottom:1px solid #35524b!important;border-radius:0!important}',
  '#workout.forge-slim-active #forgeLiveControls>.forge-live-state{display:none!important}',
  '#workout.forge-slim-active #forgeLiveControls>.forge-live-buttons{display:flex!important;align-items:center;gap:10px;flex:1;min-width:0}',
  '#workout.forge-slim-active #forgeLivePause{width:auto;min-width:150px;flex:1;font-size:13px!important;min-height:43px!important;padding:8px 12px!important;border:1px solid #678a72!important;border-radius:10px!important;background:#264239!important;color:#e0f5df!important}',
  '#workout.forge-slim-active #forgeLivePause[aria-pressed=true]{background:#55472a!important;color:#fff1bc!important;border-color:#b29754!important}',
  '#workout.forge-slim-active #forgeLiveProgress{font-size:11px!important;color:#d0e6d1!important}',
  '#workout.forge-slim-active #workoutStart{display:none!important}',
  '#workout.forge-slim-active #forgeQuickWorkout{display:block!important;background:transparent!important;border:0!important;border-radius:0!important;padding:0!important;margin:6px 0!important;box-shadow:none!important}',
  '#workout.forge-slim-active #forgeQuickWorkout>.forge130-focus-card{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important;padding:4px 0 8px!important;display:grid;gap:11px}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge130-focus-card-eyebrow{display:none!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge130-focus-card-title{font-size:clamp(22px,6vw,27px)!important;line-height:1.2!important;margin:0!important;color:#eff9ec!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge130-focus-card-hint{font-size:12px!important;line-height:1.4!important;margin:0!important;color:#a9c3b4!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge130-focus-card-grid{margin:5px 0!important;gap:12px!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge130-focus-card-grid>label{font-size:12px!important;color:#bcd6c4!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge130-focus-card-grid input{min-height:53px!important;font-size:21px!important;background:#111f29!important;border:1px solid #4e6962!important;border-radius:11px!important;max-width:100%;box-sizing:border-box}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-primary-action{min-height:56px!important;margin:7px 0 2px!important;padding:11px 12px!important;background:#a8f55d!important;color:#11241b!important;border:0!important;border-radius:12px!important;font-size:16px!important;font-weight:800!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-primary-action:disabled{opacity:.5!important;cursor:not-allowed}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge130-suggestion{background:transparent!important;border:0!important;padding:6px 0!important;margin:0!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools{border-top:1px solid #375048!important;margin-top:4px!important;padding:2px 0!important;background:transparent!important;border-radius:0!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools>summary{cursor:pointer;list-style:none;display:flex;align-items:center;min-height:45px;color:#c2dfca;font-size:12px;font-weight:700;padding:7px 0}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools>summary::-webkit-details-marker{display:none}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools>summary:after{content:"⌄";font-size:19px;margin-left:auto;color:#a8f55d}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools[open]>summary:after{content:"⌃"}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools>.forge130-actions{margin:8px 0!important;gap:7px!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools>.forge130-actions button{font-size:12px!important;min-height:42px!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools>details{margin:5px 0!important;border:0!important;border-top:1px solid #324944!important;background:transparent!important;padding:10px 0!important;border-radius:0!important}',
  '#workout.forge-slim-active #forgeRestTimer.forge-live-rest-running{display:flex!important;align-items:center;justify-content:space-between;gap:9px;background:transparent!important;border:0!important;border-bottom:1px solid #35524b!important;padding:10px 1px!important;margin:0!important;border-radius:0!important;box-shadow:none!important}',
  '#workout.forge-slim-active #forgeRestTimer .forge-rest-top{display:flex;align-items:center;justify-content:space-between;gap:9px;width:100%;flex-wrap:wrap}',
  '#workout.forge-slim-active #forgeRestTimer .forge-rest-top .forge130-focus-card-hint{display:none!important}',
  '#workout.forge-slim-active #forgeRestTimer .forge-rest-control{display:none!important}',
  '#workout.forge-slim-active #forgeRestTimer .forge-rest-actions{display:flex;gap:7px}',
  '#workout.forge-slim-active #forgeRestTimer .forge-rest-actions button{font-size:11px;min-height:39px;padding:6px 9px}',
  '#workout.forge-slim-active #forgeLiveNext{padding:12px 0 4px!important;margin:6px 0 2px!important;border:0!important;border-top:1px solid #35524b!important;border-radius:0!important;background:transparent!important;gap:6px}',
  '#workout.forge-slim-active #forgeLiveNext .forge-live-next-title{font-size:13px!important}',
  '#workout.forge-slim-active #forgeLiveNext .forge-live-next-item{font-size:12px!important;padding:2px 0!important}',
  '#workout.forge-slim-active #forgeLiveOptions{margin:10px 0 2px!important;border-top:1px solid #37524b!important}',
  '#workout.forge-slim-active #forgeLiveOptions>summary{font-size:13px!important;min-height:48px!important;display:flex!important;align-items:center}',
  '#workout.forge-slim-active #forgeLiveOptions .forge-live-rest-settings{background:transparent!important;border:0!important;border-bottom:1px solid #3b5349!important;border-radius:0!important;padding:12px 0!important}',
  '#workout.forge-slim-active #forgeLiveOptions .forge-workout-all{margin:6px 0!important;border-top:1px solid #344e45!important}',
  '#workout.forge-slim-active #forgeLiveOptions .forge-workout-all>summary{font-size:12px!important;min-height:42px!important}',
  '#workout.forge-slim-active #saveWorkout{margin:10px 0 5px!important;background:transparent!important;border:1px solid #547365!important;min-height:46px!important;color:#d4e9da!important;font-size:13px!important;border-radius:11px!important}',
  '#workout.forge-slim-active #forgeWorkoutUndoBanner{display:none!important}',
  '#workout.forge-slim-active .forge-polish-reorder-btn{display:none!important}',
  '#workout.forge-slim-active #forgeWorkoutHistoryPanel{display:none!important}',
  '#workout.forge-slim-active:not(.forge-slim-show-alternate) .forge149-workout-section:not(:has(.forge150-workout-lead)){display:none!important}',
  '#workout.forge-slim-active #forgeSlimModesPanel .forge150-modes{display:flex!important;flex-wrap:wrap}',
  '#workout.forge-slim-idle #forgeSlimModesPanel{display:none!important}',
  '#workout.forge-slim-active #forgeQuickWorkout .forge-slim-focus-tools>summary:focus-visible,#workout.forge-slim-workout #forgeLiveOptions>summary:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
  '@media(max-width:380px){#workout.forge-slim-active #forgeLiveProgress{font-size:10px!important}#workout.forge-slim-active .forge-clock .forge-clock-digits{font-size:29px!important}#workout.forge-slim-active #forgeLivePause{min-width:130px}}',
  '@media(prefers-reduced-motion:reduce){#workout.forge-slim-workout *{scroll-behavior:auto!important;transition:none!important}}'
 ].join('\n');
 document.head.append(css);
}
function install(){
 const page=$('workout'),lead=page?.querySelector('.forge150-workout-lead');
 if(!page||!lead||!$('forgeQuickWorkout')||!$('forgeLiveOptions')||!$('forgeLiveControls'))return false;
 style();page.classList.add('forge-slim-workout');
 const top=page.querySelector(':scope > h1');
 if(top)top.textContent='Training';
 const details=lead.querySelector(':scope > details.forge-fold-details');
 if(details&&state?.activeWorkout)details.open=true;
 const options=$('forgeLiveOptions'),optionsBody=options.querySelector('.forge-live-options-body');
 if(!optionsBody)return false;
 const all=$('workoutExercises')?.closest('details.forge-workout-all');
 const save=$('saveWorkout'),modes=$('forge150WorkoutModes');
 if(!$('forgeSlimModesPanel')){
  const modePanel=el('details','forge-slim-modes-panel');modePanel.id='forgeSlimModesPanel';
  modePanel.append(el('summary','','Andere Trainingsarten auswählen'));
  optionsBody.append(modePanel);
 }
 const modePanel=$('forgeSlimModesPanel');
 const active=modeFor(state)==='active',mode=active?'active':'idle';
 const alternate=!!modes?.querySelector('button[data-mode="mobility"][aria-pressed="true"],button[data-mode="cardio"][aria-pressed="true"]');
 page.classList.toggle('forge-slim-show-alternate',alternate);
 page.classList.toggle('forge-slim-active',active);
 page.classList.toggle('forge-slim-idle',!active);
 const stamp=state?.activeWorkout?String(state.activeWorkout.planId)+':'+String(state.activeWorkout.startedAt):'none';
 if(stamp!==previousFocus){previousFocus=stamp;options.open=false;modePanel.open=false;}
 if(active){
  if(details&&!details.open)details.open=true;
  if(all&&!optionsBody.contains(all)){optionsBody.append(all);all.open=false;}
  if(modes&&modes.parentNode!==modePanel)modePanel.append(modes);
  if(save&&options.contains(save))options.after(save);
  const history=$('forgeWorkoutHistoryPanel');if(history)history.open=false;
 }else{
  if(all&&optionsBody.contains(all))options.before(all);
  if(modes&&modePanel.contains(modes))lead.before(modes);
  if(save&&!optionsBody.contains(save))optionsBody.append(save);
  if(details&&!details.open)details.open=true;
 }
 const selector=lead.querySelector('#workoutSelect');
 if(selector){
  selector.setAttribute('aria-label','Trainingseinheit auswählen');
 }
 const start=$('workoutStart');if(start)start.textContent='▶ Training starten';
 const saveText=active?'■ Training beenden & speichern':'Workout ohne Timer speichern';
 if(save)save.textContent=saveText;
 previousMode=mode;
 enabled=true;
 return true;
}
function focusTools(){
 const root=$('forgeQuickWorkout');
 if(!root||!state?.activeWorkout)return;
 const card=root.querySelector(':scope > .forge130-focus-card');
 if(!card)return;
 let advanced=card.querySelector(':scope > .forge-slim-focus-tools');
 if(!advanced){
  const related=card.querySelectorAll(':scope > .forge130-actions,:scope > .forge130-substitute,:scope > .forge140-exercise-warmup,:scope > .forge130-suggestion');
  if(related.length){
   advanced=el('details','forge-slim-focus-tools');
   advanced.append(el('summary','','Andere Sätze, Übung tauschen & Aufwärmen'));
   for(const item of related)advanced.append(item);
   card.append(advanced);
  }
 }
 const action=card.querySelector(':scope > .forge-primary-action');
 if(action){
  const isTimed=isTimeAction(action.getAttribute('onclick'));
  action.textContent=isTimed?'■ Zeitsatz abschließen':'✓ Satz abschließen';
  action.disabled=!!state.activeWorkout?.forgePausedAt;
  action.setAttribute('aria-label',isTimed?'Gemessene Zeit übernehmen und Satz abschließen':'Aktuellen Satz abschließen und automatisch zum nächsten Satz wechseln');
 }
 const weight=$('forge130QuickKg'),reps=$('forge130QuickReps');
 if(weight)weight.setAttribute('aria-label','Gewicht für aktuellen Satz in Kilogramm');
 if(reps)reps.setAttribute('aria-label','Wiederholungen oder Sekunden für aktuellen Satz');
}
function update(){
 if(updating||typeof state==='undefined')return;
 updating=true;
 try{
  if(!install())return;
  if(modeFor(state)==='active')focusTools();
 }finally{updating=false}
}
function boot(){
 if(enabled)return;
 let tries=0;
 const loop=()=>{update();if(!enabled&&++tries<50)setTimeout(loop,100)};
 loop();
 // Never re-render user-editable inputs: just attach lightweight existing nodes
 // after the core changes the focused exercise or the session status.
 setInterval(update,600);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
