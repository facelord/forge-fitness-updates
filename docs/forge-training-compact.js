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
let installed=false,lastMode='',lastTitle='',drawer=null;
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
  '#workout.forge-compact-idle .forge-v3-plan-link{margin:8px 0 3px!important;min-height:41px!important;font-size:12px!important;border:0!important;background:transparent!important;color:#b9dca8!important}',
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
  '#workout.forge-compact-live #forgeQuickWorkout .forge-slim-focus-tools[open] .forge130-substitute{display:block!important}',

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
function findExerciseList(){return $('workoutExercises')?.closest('details.forge-workout-all')||null;}
function openDrawer(which){
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
 const details=create('button','forge-compact-link','Alle Übungen im Detail');
 details.type='button';details.addEventListener('click',()=>openDrawer('exercises'));
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
 const more=create('button','','⚙ Übung & Optionen');more.type='button';more.id='forgeCompactMore';
 more.addEventListener('click',()=>openDrawer('focus')||openDrawer('options'));
 dock.append(all,more);
 page.append(dock);
 // On an open options sheet, expose the existing warmup/reorder controls too.
 const options=$('forgeLiveOptions');
 if(options){
  const body=options.querySelector('.forge-live-options-body');
  if(body&&!$('forgeCompactSwitchFocus')){
   const b=create('button','btn alt small','Übung wechseln / Aufwärmen');
   b.type='button';b.id='forgeCompactSwitchFocus';
   b.addEventListener('click',()=>{if(openDrawer('focus'))options.open=false;});
   body.prepend(b);
  }
 }
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&closeDrawer()){e.preventDefault();e.stopPropagation();}
 },true);
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
