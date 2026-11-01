/* FORGE compact training: single-screen active set, flat idle workout overview.
 * Visual layer only: keep original input nodes, activeWorkout state, save/finish
 * handlers, pause, stopwatch and exercise details. No state mutation.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const create=(tag,className,text)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=text;
 return el;
};
function compactMode(activeWorkout,pageActive,alternate,mobile){
 return mobile&&pageActive&&!alternate?(activeWorkout?'live':'idle'):'off';
}
function shortName(plan){
 return String(plan?.title||'Dein Training').replace(/\s*[·|]\s*Studio\s*$/i,'').trim();
}
function safeHeight(innerHeight,navTop){
 if(!Number.isFinite(innerHeight)||!Number.isFinite(navTop))return 82;
 return Math.max(56,Math.min(150,Math.ceil(innerHeight-navTop)));
}
window.ForgeCompactTraining=Object.freeze({compactMode,shortName,safeHeight,isInstalled:()=>installed});
let installed=false,lastMode='',lastTitle='',drawer=null,planSheet=null,exerciseObserver=null;
function style(){
 if($('forgeCompactTrainingStyle'))return;
 const s=create('style');s.id='forgeCompactTrainingStyle';
 s.textContent=[
  '/* Keep the four main tabs. Only the active strength session locks the page. */',
  'body.forge-compact-live{overflow:hidden!important;overscroll-behavior:none!important}',
  'body.forge-compact-live>header{display:none!important}',
  'body.forge-compact-live>main{padding:0!important;max-width:none!important}',
  '#workout.forge-compact-live.active{position:fixed!important;inset:0 0 var(--forge-compact-nav-height,78px) 0!important;z-index:70!important;box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;padding:8px 14px 0!important;overflow:hidden!important;background:#0b1018!important;overscroll-behavior:contain!important}',
  '#workout.forge-compact-live>.tag,#workout.forge-compact-live>h1,#workout.forge-compact-live>.forge-intro{display:none!important}',
  '#workout.forge-compact-live .forge150-workout-lead,#workout.forge-compact-idle .forge150-workout-lead{margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}',
  '#workout.forge-compact-live .forge150-workout-lead>.forge-fold-details>summary,#workout.forge-compact-idle .forge150-workout-lead>.forge-fold-details>summary{display:none!important}',
  '#workout.forge-compact-live .forge150-workout-lead>.forge-fold-details,#workout.forge-compact-idle .forge150-workout-lead>.forge-fold-details{margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}',
  '#workout.forge-compact-live .forge150-workout-lead .forge-fold-body,#workout.forge-compact-idle .forge150-workout-lead .forge-fold-body{padding:0!important;background:transparent!important;border:0!important}',
  '#workout.forge-compact-live .forge150-workout-lead .forge-fold-body>.card,#workout.forge-compact-idle .forge150-workout-lead .forge-fold-body>.card{padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important}',

  '/* Idle: one selected plan, one start, a compact visible exercise list. */',
  '#workout.forge-compact-idle>h1,#workout.forge-compact-idle>.tag,#workout.forge-compact-idle>.forge-intro{display:none!important}',
  '#workout.forge-compact-idle #forgeCompactIntro{display:block;margin:0 0 15px!important}',
  '#workout #forgeCompactIntro{display:none}',
  '#workout .forge-compact-kicker{display:block;color:#a8f55d;font-size:11px;font-weight:800;letter-spacing:.1em}',
  '#workout .forge-compact-heading{font-size:23px;line-height:1.25;font-weight:800;color:#f0f8ef;margin:4px 0 0}',
  '#workout.forge-compact-idle #workoutSelect{width:100%;min-height:53px!important;font-size:15px!important;border:1px solid #50645c!important;border-radius:12px!important;background:#14242c!important}',
  '#workout.forge-compact-idle #workoutInfo,#workout.forge-compact-idle .forge-clock,#workout.forge-compact-idle #forgeTrainingV3Status,#workout.forge-compact-idle .forge-exercise-heading,#workout.forge-compact-idle #forgeWorkoutDraftStatus{display:none!important}',
  '#workout.forge-compact-idle .forge150-workout-lead label[for="workoutSelect"]{font-size:12px;color:#adbcaf}',
  '#workout.forge-compact-idle .forge150-workout-lead .card>label:first-child{font-size:12px!important;color:#bac9c0!important}',
  '#workout.forge-compact-idle #workoutStart{display:flex!important;justify-content:center;align-items:center;min-height:54px!important;width:100%!important;margin:16px 0 4px!important;border-radius:12px!important;font-size:16px!important}',
  '#workout.forge-compact-idle #forgeTrainingV3Preview{display:block!important;margin:10px 0 0!important;padding:0!important;border:0!important;background:transparent!important}',
  '#workout.forge-compact-idle #forgeTrainingV3Preview[hidden]{display:none!important}',
  '#workout.forge-compact-idle #forgeTrainingV3Preview h3{margin:0 0 5px!important;font-size:15px!important;color:#f1f8ef!important}',
  '#workout.forge-compact-idle #forgeTrainingV3Preview .forge-v3-preview-help{display:none!important}',
  '#workout.forge-compact-idle .forge-v3-item{padding:8px 1px!important;min-height:38px!important;border-top:1px solid #30483d!important;align-items:center!important;font-size:13px!important}',
  '#workout.forge-compact-idle .forge-v3-item-name{font-size:13px!important;color:#e9f2e9!important}',
  '#workout.forge-compact-idle .forge-v3-item-sets{font-size:12px!important;color:#a8d58f!important}',
  '#workout.forge-compact-idle .forge-v3-plan-link{display:none!important}',
  '#workout.forge-compact-idle .forge-workout-all:not([open]),#workout.forge-compact-idle #forgeLiveOptions:not([open]){display:none!important}',
  '#workout.forge-compact-idle #forgeCompactIdleActions{display:flex;gap:10px;justify-content:center;margin:7px 0 3px}',
  '#workout #forgeCompactIdleActions{display:none}',
  '#workout.forge-compact-idle #forgeCompactIdleActions{display:flex!important}',
  '#workout .forge-compact-link{border:0;background:transparent;color:#a8d39b;font-size:12px;min-height:39px;padding:8px;font-weight:700}',

  '/* Live: original current-set fields stay mounted and remain the focus. */',
  '#workout.forge-compact-live #forgeCompactIntro,#workout.forge-compact-live #forgeCompactIdleActions{display:none!important}',
  '#workout.forge-compact-live .forge150-workout-lead .forge-fold-body>.card>label:first-child,#workout.forge-compact-live #workoutSelect,#workout.forge-compact-live #workoutInfo,#workout.forge-compact-live .forge-exercise-heading,#workout.forge-compact-live .forge-intro,#workout.forge-compact-live #forgeWorkoutDraftStatus{display:none!important}',
  '#workout.forge-compact-live #forgeTrainingV3Status{display:grid!important;gap:3px!important;margin:0 0 7px!important;padding:0 0 8px!important;border-bottom:1px solid #324a3f!important}',
  '#workout.forge-compact-live #forgeTrainingV3Status .forge-v3-name{font-size:12px!important;color:#a8f55d!important}',
  '#workout.forge-compact-live #forgeTrainingV3Status .forge-v3-sub{font-size:11px!important;line-height:1.3!important;color:#c3d2c3!important}',
  '#workout.forge-compact-live #forgeTrainingV3Bar{padding:3px 0 0!important}',
  '#workout.forge-compact-live .forge-clock{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:0 0 8px!important;padding:4px 0 8px!important;background:transparent!important;border:0!important;border-bottom:1px solid #344e43!important;border-radius:0!important}',
  '#workout.forge-compact-live .forge-clock .forge-clock-label{font-size:10px!important;white-space:nowrap!important;color:#b8c8bb!important}',
  '#workout.forge-compact-live .forge-clock .forge-clock-digits{font-size:clamp(25px,7vw,33px)!important;line-height:1!important;margin:0!important;color:#a8f55d!important;font-variant-numeric:tabular-nums!important}',
  '#workout.forge-compact-live .forge-clock #workoutTimer{display:none!important}',
  '#workout.forge-compact-live #forgeLiveControls{display:flex!important;align-items:center!important;justify-content:space-between!important;margin:0 0 6px!important;padding:0!important;border:0!important;background:transparent!important}',
  '#workout.forge-compact-live #forgeLiveControls .forge-live-buttons{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;width:100%!important}',
  '#workout.forge-compact-live #forgeLivePause{min-height:36px!important;padding:5px 12px!important;width:auto!important;min-width:0!important;flex:none!important;border-radius:9px!important;font-size:12px!important}',
  '#workout.forge-compact-live #forgeLiveProgress{font-size:12px!important;white-space:nowrap!important;color:#bfd9bb!important}',
  '#workout.forge-compact-live #forgeRestTimer:not(.forge-live-rest-running){display:none!important}',
  '#workout.forge-compact-live #forgeRestTimer.forge-live-rest-running{margin:0 0 6px!important;padding:5px 0!important;font-size:12px!important;border:0!important;border-bottom:1px solid #314638!important}',
  '#workout.forge-compact-live #forgeQuickWorkout{margin:2px 0 0!important;padding:0!important;border:0!important;background:transparent!important}',
  '#workout.forge-compact-live #forgeQuickWorkout>.forge130-focus-card{display:grid!important;gap:7px!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important}',
  '#workout.forge-compact-live .forge130-focus-card-title{font-size:clamp(20px,6vw,25px)!important;line-height:1.18!important;margin:0!important}',
  '#workout.forge-compact-live .forge130-focus-card-hint{font-size:11px!important;margin:0!important;line-height:1.25!important}',
  '#workout.forge-compact-live .forge130-focus-card-grid{gap:9px!important;margin:1px 0!important}',
  '#workout.forge-compact-live .forge130-focus-card-grid label{font-size:11px!important;min-width:0!important}',
  '#workout.forge-compact-live .forge130-focus-card-grid input{min-height:46px!important;height:46px!important;padding:7px 9px!important;font-size:21px!important;max-width:100%!important}',
  '#workout.forge-compact-live .forge-v3-progression{background:transparent!important;border:0!important;border-top:1px solid #30493b!important;padding:5px 0 0!important;margin:2px 0!important;gap:2px!important}',
  '#workout.forge-compact-live .forge-v3-last{font-size:11px!important;line-height:1.2!important}',
  '#workout.forge-compact-live .forge-v3-hint{font-size:11px!important;gap:6px!important}',
  '#workout.forge-compact-live .forge-v3-use-weight{min-height:31px!important;padding:4px 9px!important;font-size:11px!important}',
  '#workout.forge-compact-live .forge-v3-progression>.forge-v3-last:last-child{display:none!important}',
  '#workout.forge-compact-live #forgeLiveNext,#workout.forge-compact-live #forgeSaveSessionHint,#workout.forge-compact-live #forgeSlimWorkoutExtras,#workout.forge-compact-live #forgeTrainingV3Preview{display:none!important}',

  '/* Fixed action stack above existing bottom navigation, no page scroll. */',
  '#workout.forge-compact-live #saveWorkout{position:fixed!important;z-index:95!important;left:14px!important;right:14px!important;bottom:calc(var(--forge-compact-nav-height,78px) + 7px)!important;width:calc(100% - 28px)!important;min-height:41px!important;height:41px!important;margin:0!important;padding:7px!important;background:transparent!important;color:#d0ebc3!important;border:1px solid #4b7854!important;border-radius:9px!important;font-size:12px!important;font-weight:750!important}',
  '#workout.forge-compact-live #forgeCompactDock{position:fixed!important;z-index:94!important;display:grid!important;grid-template-columns:1fr 1fr;gap:8px;left:14px;right:14px;bottom:calc(var(--forge-compact-nav-height,78px) + 54px)}',
  '#workout #forgeCompactDock{display:none}',
  '#workout.forge-compact-live #forgeCompactDock>button{min-height:39px!important;background:#192f28!important;border:1px solid #426b4a!important;color:#dff1d6!important;border-radius:10px!important;font-size:12px!important;font-weight:750!important;padding:5px 8px!important}',
  '#workout.forge-compact-live #forgeQuickWorkout .forge130-actions{position:fixed!important;z-index:94!important;left:14px!important;right:14px!important;bottom:calc(var(--forge-compact-nav-height,78px) + 99px)!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:0!important}',
  '#workout.forge-compact-live #forgeQuickWorkout .forge130-actions button{min-height:39px!important;height:39px!important;padding:6px!important;font-size:12px!important;border-radius:9px!important}',
  '#workout.forge-compact-live #forgeQuickWorkout .forge-primary-action{position:fixed!important;z-index:94!important;left:14px!important;right:14px!important;bottom:calc(var(--forge-compact-nav-height,78px) + 145px)!important;width:calc(100% - 28px)!important;min-height:49px!important;height:49px!important;margin:0!important;padding:8px!important;background:#a8f55d!important;color:#12251a!important;font-size:15px!important;font-weight:800!important;border-radius:11px!important}',
  '#workout.forge-compact-live .forge-workout-all:not([open]),#workout.forge-compact-live #forgeLiveOptions:not([open]),#workout.forge-compact-live #forgeQuickWorkout .forge-slim-focus-tools:not([open]){display:none!important}',

  '/* Full-screen secondary detail surfaces; scroll ONLY within the opened drawer. */',
  '#workout.forge-compact-live .forge-workout-all[open],#workout.forge-compact-live #forgeLiveOptions[open],#workout.forge-compact-live #forgeQuickWorkout .forge-slim-focus-tools[open]{display:block!important;position:fixed!important;z-index:120!important;inset:0 0 var(--forge-compact-nav-height,78px) 0!important;box-sizing:border-box!important;width:100%!important;max-width:none!important;max-height:none!important;margin:0!important;padding:8px 15px 16px!important;overflow-y:auto!important;overscroll-behavior:contain!important;background:#0d171c!important;border:0!important;border-radius:0!important;box-shadow:none!important}',
  '#workout.forge-compact-live .forge-workout-all[open]>summary,#workout.forge-compact-live #forgeLiveOptions[open]>summary,#workout.forge-compact-live #forgeQuickWorkout .forge-slim-focus-tools[open]>summary{position:sticky!important;z-index:2;top:0;display:flex!important;align-items:center!important;min-height:48px!important;padding:10px 5px!important;margin:0 0 12px!important;background:#0d171c!important;border-bottom:1px solid #3d5b48!important;border-left:0!important;border-radius:0!important;color:#d2f0c6!important;font-size:16px!important;list-style:none!important}',
  '#workout.forge-compact-live .forge-workout-all[open]>summary::after,#workout.forge-compact-live #forgeLiveOptions[open]>summary::after,#workout.forge-compact-live .forge-slim-focus-tools[open]>summary::after{content:"✕";margin-left:auto;font-size:18px;color:#a8f55d!important}',
  '#workout.forge-compact-live .forge-workout-all[open] #workoutExercises{padding-bottom:20px}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-exercise,#workout.forge-compact-live #forgeLiveOptions[open] details{border-color:#344a3c!important}',
  '/* One place for in-session order and swapping: ALL EXERCISES. */',
  '#workout.forge-compact-live #forge142OrderPanel,#workout.forge-compact-idle #forge142OrderPanel,#workout.forge-compact-live #forge142OrderBody,#workout.forge-compact-live #forgeQuickWorkout .forge130-substitute{display:none!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-quick-reorder{display:none!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-exercise>summary{display:flex!important;align-items:center!important;gap:5px!important;min-width:0!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-exercise-title{flex:1!important;min-width:0!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-exercise-title small{font-size:10px!important;line-height:1.25!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-compact-ex-actions{display:flex;align-items:center;gap:4px;flex:none;margin-left:auto}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-compact-ex-actions button{width:33px!important;min-width:33px!important;min-height:35px!important;padding:4px!important;border-radius:8px!important;border:1px solid #496d50!important;background:#1a3028!important;color:#d8f6c8!important;font-size:17px!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-compact-ex-actions button:disabled{opacity:.28!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge-compact-ex-actions button:focus-visible{outline:2px solid #a8f55d!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge130-substitute:not([open]){display:none!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge130-substitute[open]{display:block!important;margin:4px 0 12px!important;padding:10px 0!important;border:0!important;border-top:1px solid #4b6554!important;border-radius:0!important;background:transparent!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge130-substitute>summary{display:none!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge130-substitute .forge132-swap-controls{gap:7px!important}',
  '#workout.forge-compact-live .forge-workout-all[open] .forge130-substitute select{min-height:43px!important}',
  '/* Before the workout, edits reuse the existing staged-plan commit. */',
  'body.forge-compact-plan-sheet{overflow:hidden!important}',
  '.forge-compact-plan-overlay{position:fixed;inset:0;z-index:9990;background:#0c1519;color:#eef8e9;display:flex;flex-direction:column;max-height:100dvh;box-sizing:border-box;padding:calc(env(safe-area-inset-top) + 8px) 15px calc(env(safe-area-inset-bottom) + 14px)}',
  '.forge-compact-plan-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:6px 0 11px!important;border-bottom:1px solid #365343;margin:0!important;max-width:none!important;min-height:0!important}',
  '.forge-compact-plan-head h2{font-size:21px;line-height:1.2;margin:4px 0;color:#f2faee}',
  '.forge-compact-plan-head p{margin:0;color:#aabdae;font-size:11px;line-height:1.35}',
  '.forge-compact-plan-head button{background:transparent;color:#d5e6d4;border:1px solid #466951;border-radius:9px;min-width:39px;min-height:39px;font-size:19px}',
  '.forge-compact-plan-rows{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:3px 0 20px}',
  '.forge-compact-plan-row{padding:11px 0;border-bottom:1px solid #304738;display:grid;gap:8px}',
  '.forge-compact-plan-row-top{display:flex;align-items:center;gap:7px;min-width:0}',
  '.forge-compact-plan-name{flex:1;min-width:0;color:#edf7ed;font-size:14px;font-weight:750;overflow-wrap:anywhere}',
  '.forge-compact-plan-count{font-size:11px;color:#b9d59f;font-weight:700;white-space:nowrap}',
  '.forge-compact-plan-row button{min-height:37px;border:1px solid #466751;border-radius:8px;padding:6px 9px;background:#1b3128;color:#e4f6d9;font-size:13px}',
  '.forge-compact-plan-row button:disabled{opacity:.25}',
  '.forge-compact-plan-controls{display:flex;gap:6px;justify-content:flex-end;align-items:center}',
  '.forge-compact-plan-controls button{min-width:39px}',
  '.forge-compact-plan-edit{display:grid;gap:7px;background:#15251e;padding:10px;border-radius:9px}',
  '.forge-compact-plan-edit label{font-size:12px;color:#c5d9be}',
  '.forge-compact-plan-edit select,.forge-compact-plan-add select{width:100%;min-height:46px;min-width:0;background:#13212b;color:#ecf5eb;border:1px solid #56705f;border-radius:9px;padding:7px}',
  '.forge-compact-plan-add{margin-top:11px;display:grid;gap:8px}',
  '.forge-compact-plan-add button{min-height:43px!important;background:#213b2c!important;border-radius:9px!important;color:#d4f3c4!important}',
  '.forge-compact-plan-foot{flex:none;display:grid;grid-template-columns:1fr 1.5fr;gap:9px;border-top:1px solid #3a5544;padding-top:11px}',
  '.forge-compact-plan-foot button{min-height:48px!important;border-radius:10px!important;font-size:13px!important;padding:8px!important}',
  '.forge-compact-plan-error{font-size:12px;color:#ffb7b7;min-height:18px;margin:4px 0}',
  '@media(max-width:370px){.forge-compact-plan-controls{gap:3px}.forge-compact-plan-row button{padding:5px 7px}}',
  

  '/* Android keyboard: temporarily allow the focused field to remain reachable. */',
  'body.forge-compact-typing #workout.forge-compact-live.active{overflow-y:auto!important;overscroll-behavior:contain!important}',
  'body.forge-compact-typing #workout.forge-compact-live #saveWorkout,body.forge-compact-typing #workout.forge-compact-live #forgeCompactDock,body.forge-compact-typing #workout.forge-compact-live .forge130-actions,body.forge-compact-typing #workout.forge-compact-live .forge-primary-action{display:none!important}',
  '@media(max-height:690px){#workout.forge-compact-live #forgeTrainingV3Status{padding-bottom:4px!important;margin-bottom:4px!important}#workout.forge-compact-live .forge-clock{padding:2px 0 5px!important;margin-bottom:4px!important}#workout.forge-compact-live .forge-v3-progression{padding-top:3px!important}#workout.forge-compact-live .forge130-focus-card-title{font-size:20px!important}}',
  '@media(max-height:570px){#workout.forge-compact-live #forgeLiveControls{margin-bottom:3px!important}#workout.forge-compact-live .forge-v3-progression{display:none!important}#workout.forge-compact-live .forge-clock .forge-clock-digits{font-size:23px!important}}',
  '@media(min-width:821px){#workout #forgeCompactIntro,#workout #forgeCompactDock,#workout #forgeCompactIdleActions{display:none!important}}',
  '@media(prefers-reduced-motion:reduce){#workout.forge-compact-live *{scroll-behavior:auto!important}}'
 ].join('\n');
 document.head.append(s);
}

function button(text,cb,className){
 const b=create('button',className||'',text);b.type='button';b.addEventListener('click',cb);return b;
}
function planForSelection(){
 const id=$('workoutSelect')?.value;
 return Array.isArray(state?.plan)?state.plan.find(p=>String(p.id)===String(id)):null;
}
function catalogFor(plan,withoutIndex=-1){
 const names=typeof window.forge138AvailableNames==='function'?window.forge138AvailableNames():[];
 const used=new Set(plan.ex.filter((_,i)=>i!==withoutIndex).map(e=>e.name));
 return names.filter(name=>!used.has(name)).sort((a,b)=>a.localeCompare(b,'de'));
}
function selectExercise(names,placeholder,selection){
 const input=create('select');
 input.setAttribute('aria-label',placeholder);
 const first=create('option','',placeholder);first.value='';
 input.append(first);
 for(const name of names){
  const opt=create('option','',name);opt.value=name;input.append(opt);
 }
 input.value=selection||'';
 return input;
}
function closePlanSheet(force=false){
 if(!planSheet)return true;
 const api=window.ForgeActivePlanEdit;
 if(!force&&api?.changed(planSheet.draft)&&!confirm('Ungespeicherte Änderungen verwerfen?'))return false;
 planSheet.root.remove();planSheet=null;
 document.body.classList.remove('forge-compact-plan-sheet');
 return true;
}
function displayPlanSheet(){
 if(!planSheet)return;
 const {root,draft}=planSheet,api=window.ForgeActivePlanEdit;
 const previousScroll=root.querySelector('.forge-compact-plan-rows')?.scrollTop||0;
 root.replaceChildren();
 const heading=create('header','forge-compact-plan-head');
 const title=create('div');
 title.append(create('span','forge-compact-kicker','AKTIVER TRAININGSPLAN'));
 title.append(create('h2','','Übungen bearbeiten'));
 title.append(create('p','','Tauschen, ergänzen oder sortieren · dauerhaft nach Speichern.'));
 heading.append(title,button('✕',()=>closePlanSheet(),'forge-compact-plan-close'));
 const rows=create('div','forge-compact-plan-rows');
 draft.ex.forEach((exercise,i)=>{
  const row=create('div','forge-compact-plan-row');
  const top=create('div','forge-compact-plan-row-top');
  top.append(create('strong','forge-compact-plan-name',(i+1)+'. '+exercise.name));
  top.append(create('span','forge-compact-plan-count',exercise.sets+' × '+exercise.reps));
  const controls=create('div','forge-compact-plan-controls');
  const move=(offset)=>{
   const to=i+offset;if(to<0||to>=draft.ex.length)return;
   const removed=draft.ex.splice(i,1)[0];draft.ex.splice(to,0,removed);
   planSheet.editIndex=null;displayPlanSheet();
  };
  const up=button('↑',()=>move(-1));up.disabled=i===0;up.setAttribute('aria-label',exercise.name+' nach oben');
  const down=button('↓',()=>move(1));down.disabled=i===draft.ex.length-1;down.setAttribute('aria-label',exercise.name+' nach unten');
  const swap=button('⇄ Tauschen',()=>{
   planSheet.editIndex=planSheet.editIndex===i?null:i;displayPlanSheet();
  });
  swap.setAttribute('aria-expanded',String(planSheet.editIndex===i));
  const remove=button('✕',()=>{
   if(draft.ex.length<=1){planSheet.message='Mindestens eine Übung muss bleiben.';displayPlanSheet();return;}
   draft.ex.splice(i,1);planSheet.editIndex=null;displayPlanSheet();
  });
  remove.setAttribute('aria-label',exercise.name+' entfernen');
  controls.append(up,down,swap,remove);row.append(top,controls);
  if(planSheet.editIndex===i){
   const edit=create('div','forge-compact-plan-edit');
   edit.append(create('label','','Alternative aus dem Übungskatalog'));
   const select=selectExercise(catalogFor(draft,i),'Übung auswählen');
   select.addEventListener('change',()=>{
    const choice=select.value;if(!choice)return;
    exercise.name=choice;
    planSheet.editIndex=null;planSheet.message='Änderung vorgemerkt · bitte speichern.';
    displayPlanSheet();
   });
   edit.append(select);row.append(edit);
  }
  rows.append(row);
 });
 const add=create('div','forge-compact-plan-add');
 add.append(create('strong','', '＋ Übung hinzufügen'));
 const select=selectExercise(catalogFor(draft),'Weitere Übung auswählen');
 const addButton=button('＋ Zum Plan hinzufügen',()=>{
  const name=select.value;
  if(!name||draft.ex.some(ex=>ex.name===name)||draft.ex.length>=15){
   planSheet.message='Bitte eine noch nicht enthaltene Übung auswählen (max. 15).';displayPlanSheet();return;
  }
  if(typeof window.forge138Defaults!=='function'){
   planSheet.message='Der Übungskatalog ist nicht verfügbar.';displayPlanSheet();return;
  }
  draft.ex.push(structuredClone(window.forge138Defaults(name)));
  planSheet.message='Übung hinzugefügt · bitte speichern.';
  displayPlanSheet();
  const scroller=root.querySelector('.forge-compact-plan-rows');
  if(scroller)scroller.scrollTop=scroller.scrollHeight;
 });
 add.append(select,addButton);rows.append(add);
 rows.scrollTop=previousScroll;
 const status=create('p','forge-compact-plan-error',planSheet.message||'');
 status.setAttribute('role','status');
 const foot=create('footer','forge-compact-plan-foot');
 const cancel=button('Abbrechen',()=>closePlanSheet());
 const save=button('✓ Speichern',()=>{
  const latest=planForSelection();
  if(!latest||String(latest.id)!==String(planSheet.id)){
   planSheet.message='Trainingseinheit wurde gewechselt. Bitte erneut öffnen.';displayPlanSheet();return;
  }
  const result=api.commitStaged(latest,draft);
  if(!result.ok){planSheet.message=result.reason;displayPlanSheet();return;}
  closePlanSheet(true);
  try{if(typeof window.render==='function')window.render();else if(typeof window.renderWorkout==='function')window.renderWorkout();}
  catch(err){console.error('FORGE compact editor redraw',err);}
 });
 save.className='btn';foot.append(cancel,save);
 root.append(heading,rows,status,foot);
}
function openPlanSheet(){
 if(state?.activeWorkout)return false;
 const p=planForSelection(),api=window.ForgeActivePlanEdit;
 if(!p||!api?.cloneEdit||!api?.commitStaged)return false;
 if(planSheet&&!closePlanSheet())return false;
 const root=create('section','forge-compact-plan-overlay');
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','Übungen des aktiven Trainingsplans bearbeiten');
 document.body.append(root);
 document.body.classList.add('forge-compact-plan-sheet');
 planSheet={root,id:String(p.id),draft:api.cloneEdit(p),editIndex:null,message:''};
 displayPlanSheet();return true;
}
function decorateSessionExercises(){
 const container=$('workoutExercises'),plan=planForSelection();
 if(!container||!plan||!state?.activeWorkout||state.activeWorkout.planId!==plan.id)return 0;
 const order=typeof window.forge142Order==='function'?window.forge142Order(plan):plan.ex.map((_,i)=>i);
 let added=0;
 container.querySelectorAll('.forge-exercise[data-forge-ex]').forEach(exercise=>{
  const i=Number(exercise.dataset.forgeEx),position=order.indexOf(i);
  if(position<0)return;
  const summary=exercise.querySelector(':scope > summary');
  if(!summary||summary.querySelector('.forge-compact-ex-actions'))return;
  const actions=create('span','forge-compact-ex-actions');
  const move=direction=>{
   const scope=$('forge142OrderScope');
   if(scope)scope.value='session'; // Always ONLY this workout.
   if(typeof window.forge142MoveRelative==='function')window.forge142MoveRelative(i,direction);
  };
  const controls=[
   ['↑',()=>move(-1),position===0,'Übung nach oben schieben (nur heute)'],
   ['↓',()=>move(1),position===order.length-1,'Übung nach unten schieben (nur heute)'],
   ['⇄',()=>{
     exercise.open=true;
     const native=exercise.querySelector('.forge130-substitute');
     if(!native)return;
     native.open=true;
     native.querySelector('select')?.focus?.({preventScroll:true});
     native.scrollIntoView?.({block:'nearest'});
    },!exercise.querySelector('.forge130-substitute'),'Übung tauschen (nur heute)']
  ];
  for(const [text,handler,disabled,label] of controls){
   const b=button(text,event=>{event.preventDefault();event.stopPropagation();handler();});
   b.disabled=disabled;b.setAttribute('aria-label',label);b.title=label;
   actions.append(b);
  }
  const chevron=summary.querySelector('.forge-exercise-chevron');
  if(chevron)chevron.before(actions);else summary.append(actions);
  added++;
 });
 return added;
}

function findExerciseList(){return $('workoutExercises')?.closest('details.forge-workout-all')||null;}
function openDrawer(which){
 if(which==='exercises'&&!state?.activeWorkout)return openPlanSheet();
 const list=findExerciseList(),options=$('forgeLiveOptions');
 const custom=$('forgeQuickWorkout')?.querySelector(':scope > .forge130-focus-card > .forge-slim-focus-tools');
 const target=which==='exercises'?list:which==='focus'?custom:options;
 if(!target)return false;
 for(const other of [list,options,custom])if(other&&other!==target)other.open=false;
 target.open=true;drawer=target;
 const summary=target.querySelector(':scope > summary');
 if(summary)summary.focus?.({preventScroll:true});
 return true;
}
function closeDrawer(){
 const opened=[findExerciseList(),$('forgeLiveOptions'),$('forgeQuickWorkout')?.querySelector('.forge-slim-focus-tools')];
 let found=false;
 for(const el of opened)if(el?.open){el.open=false;found=true;}
 drawer=null;return found;
}
function install(){
 if(installed)return true;
 const page=$('workout'),lead=page?.querySelector('.forge150-workout-lead');
 const select=$('workoutSelect'),start=$('workoutStart'),preview=$('forgeTrainingV3Preview');
 const clock=$('workoutDigitalClock'),quick=$('forgeQuickWorkout'),save=$('saveWorkout');
 if(!page||!lead||!select||!start||!preview||!clock||!quick||!save||!$('forgeLiveControls'))return false;
 style();
 const intro=create('div','forge-compact-intro');intro.id='forgeCompactIntro';
 intro.append(create('span','forge-compact-kicker','DEIN TRAINING'));
 intro.append(create('h2','forge-compact-heading','Trainingsübersicht'));
 lead.before(intro);
 const idleActions=create('div','forge-compact-idle-actions');idleActions.id='forgeCompactIdleActions';
 const details=create('button','forge-compact-link','✎ Übungen bearbeiten');
 details.type='button';details.id='forgeCompactPlanExercises';
 details.addEventListener('click',()=>{if(!openPlanSheet())alert('Bitte wähle zuerst einen aktiven Trainingsplan.');});
 const additional=create('button','forge-compact-link','Weitere Optionen');
 additional.type='button';additional.addEventListener('click',()=>openDrawer('options'));
 idleActions.append(details,additional);
 preview.after(idleActions);
 // The existing start handler remains attached; only its placement changes.
 // Show the complete compact exercise preview BEFORE the single start action.
 preview.after(start);
 const dock=create('div','forge-compact-dock');dock.id='forgeCompactDock';
 const all=create('button','','☰ Alle Übungen');all.type='button';all.id='forgeCompactExercises';
 all.addEventListener('click',()=>openDrawer('exercises'));
 const more=create('button','','⚙ Aufwärmen & Tipps');more.type='button';more.id='forgeCompactMore';
 more.addEventListener('click',()=>openDrawer('focus')||openDrawer('options'));
 dock.append(all,more);
 page.append(dock);
 // On an open options sheet, expose the existing warmup/reorder controls too.
 const options=$('forgeLiveOptions');
 if(options){
  const body=options.querySelector('.forge-live-options-body');
  if(body&&!$('forgeCompactSwitchFocus')){
   const b=create('button','btn alt small','Aufwärmen & Übungstipps');
   b.type='button';b.id='forgeCompactSwitchFocus';
   b.addEventListener('click',()=>{if(openDrawer('focus'))options.open=false;});
   body.prepend(b);
  }
 }
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(planSheet){if(closePlanSheet()){e.preventDefault();e.stopPropagation();}return;}
  if(closeDrawer()){e.preventDefault();e.stopPropagation();}
 },true);
 const exercises=$('workoutExercises');
 if(exercises&&typeof MutationObserver==='function'){
  exerciseObserver=new MutationObserver(decorateSessionExercises);
  exerciseObserver.observe(exercises,{childList:true,subtree:true});
 }
 // Never recreate the focused kg/reps controls; only decorate the full list.
 decorateSessionExercises();
 document.addEventListener('focusin',e=>{
  if(page.classList.contains('forge-compact-live')&&e.target?.matches?.('input,textarea,select,[contenteditable="true"]'))
   document.body.classList.add('forge-compact-typing');
 },true);
 document.addEventListener('focusout',()=>setTimeout(()=>{
  if(!page.contains(document.activeElement)||!document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]'))
   document.body.classList.remove('forge-compact-typing');
 },0),true);
 installed=true;
 return true;
}
function sync(){
 if(!installed||typeof state==='undefined')return;
 const page=$('workout'),visible=page?.classList?.contains('active');
 const alternate=!!page?.classList?.contains('forge-slim-show-alternate');
 const mobile=window.innerWidth<=820;
 const mode=compactMode(state.activeWorkout,visible,alternate,mobile);
 const body=document.body;
 if(lastMode!==mode){
  page.classList.toggle('forge-compact-live',mode==='live');
  page.classList.toggle('forge-compact-idle',mode==='idle');
  body.classList.toggle('forge-compact-live',mode==='live');
  if(mode!=='live'){body.classList.remove('forge-compact-typing');closeDrawer();}
  if(mode==='live'){
   const fold=page.querySelector('.forge150-workout-lead > details.forge-fold-details');
   if(fold)fold.open=true;
   const list=findExerciseList();if(list)list.open=false;
   if(window.scrollTo)window.scrollTo(0,0);
  }
  if(mode==='idle'){
   const fold=page.querySelector('.forge150-workout-lead > details.forge-fold-details');
   if(fold)fold.open=true;
   const list=findExerciseList();if(list)list.open=false;
   const options=$('forgeLiveOptions');if(options)options.open=false;
   // Every visit to Training begins with the clean plan overview.
   if(window.scrollTo)window.scrollTo(0,0);
  }
  lastMode=mode;
 }
 if(mode==='off')return;
 if(mode==='live')decorateSessionExercises();
 if(planSheet&&state.activeWorkout)closePlanSheet(true);
 const plan=Array.isArray(state.plan)?state.plan.find(p=>String(p.id)===String(state.activeWorkout?.planId||$('workoutSelect')?.value)):null;
 const text=mode==='idle'?'Training auswählen':shortName(plan);
 if(text!==lastTitle){
  const heading=$('forgeCompactIntro')?.querySelector('.forge-compact-heading');
  if(heading)heading.textContent='Training auswählen';
  lastTitle=text;
 }
 const nav=$('nav'),rect=nav?.getBoundingClientRect();
 const bottom=safeHeight(window.innerHeight,rect?rect.top:window.innerHeight-82);
 const px=bottom+'px';
 if(document.documentElement.style.getPropertyValue('--forge-compact-nav-height')!==px)
  document.documentElement.style.setProperty('--forge-compact-nav-height',px);
}
function boot(){
 let attempts=0;
 const start=()=>{
  if(install()){sync();return;}
  if(++attempts<75)setTimeout(start,120);
 };
 start();
 setInterval(sync,700);
 window.addEventListener('resize',sync,{passive:true});
 document.addEventListener('change',e=>{if(e.target?.id==='workoutSelect')sync();},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
