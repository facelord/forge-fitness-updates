/* FORGE training cleanup – 2026-10-31.
 * Presentation only: preserve original strength timer, yoga sessions, cardio,
 * workout history, readiness inputs and mobility timer/API/storage.
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
let installed=false,mobilityWrapped=false;
function sections(page=$('workout')){
 if(!page)return null;
 const mobility=page.querySelector('#mobWorkout')?.closest('details.forge149-workout-section');
 const cardio=page.querySelector('#forgeCardio')?.closest('details.forge149-workout-section');
 const history=$('forgeWorkoutHistoryPanel');
 const readiness=$('forge144WorkoutCoach');
 return {mobility,cardio,history,readiness};
}
function openExtras(type){
 const outer=$('forgeSlimWorkoutExtras');
 if(!outer)return false;
 outer.open=true;
 if(type==='mobility'||type==='cardio'){
  const section=sections()?.[type];
  if(section)section.open=true;
 }else if(type==='readiness'){
  const s=$('forge144WorkoutEnergyPanel');
  if(s)s.open=true;
 }
 return true;
}
window.ForgeWorkoutMore=Object.freeze({sections,openExtras,isInstalled:()=>installed});
function styles(){
 if($('forgeWorkoutMoreStyle'))return;
 const s=el('style');
 s.id='forgeWorkoutMoreStyle';
 s.textContent=[
  '/* Single-mobility browse is a redundant entry beside the video/library flows. */',
  '#workout #forgePlusWorkout{display:none!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtras{display:block!important;margin:13px 0 14px!important;background:#17252f!important;border:1px solid #425c51!important;border-radius:16px!important;box-shadow:none!important;overflow:hidden!important;padding:0!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtras>summary{display:flex!important;align-items:center;list-style:none;cursor:pointer;min-height:58px;padding:15px 16px!important;color:#edf7e9!important;font-weight:800!important;font-size:15px!important;background:transparent!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtras>summary::-webkit-details-marker{display:none}',
  '#workout.forge-training-more #forgeSlimWorkoutExtras>summary::after{content:"⌄";font-size:20px;color:#a8f55d;margin-left:auto}',
  '#workout.forge-training-more #forgeSlimWorkoutExtras[open]>summary::after{content:"⌃"}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody{padding:0 14px 9px!important;background:transparent!important;border:0!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody>details{display:block!important;background:transparent!important;border:0!important;border-top:1px solid #38524a!important;border-radius:0!important;margin:0!important;box-shadow:none!important;overflow:visible!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody>details>summary{display:flex!important;align-items:center;min-height:55px!important;padding:14px 2px!important;background:transparent!important;border:0!important;color:#e7f1ea!important;font-size:14px!important;list-style:none;font-weight:750!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody>details>summary::-webkit-details-marker{display:none}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody>details>summary::after{content:"⌄";margin-left:auto;font-size:18px;color:#a8f55d}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody>details[open]>summary::after{content:"⌃"}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody>details>.card,#workout.forge-training-more #forgeSlimWorkoutExtrasBody>details>.disclosure-body{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important;padding:2px 0 16px!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody .card{box-shadow:none!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody .forge150-modes{display:none!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody #mobWorkout>.forge-intro{display:none!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody #forgeWorkoutHistoryPanel .disclosure-body{padding:0 2px 15px!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtrasBody #forge144WorkoutCoach{padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important}',
  '/* During a strength session the side modes remain accessible if consciously expanded. */',
  '#workout.forge-slim-active #forgeSlimWorkoutExtras[open] #forgeSlimWorkoutExtrasBody>details.forge149-workout-section{display:block!important}',
  '#workout.forge-slim-active #forgeSlimWorkoutExtras[open] #forgeSlimWorkoutExtrasBody>details#forgeWorkoutHistoryPanel{display:block!important}',
  '#workout.forge-training-more #forgePlusTimer:not([hidden]){display:block!important}',
  '#workout.forge-training-more #forgeSlimWorkoutExtras>summary:focus-visible,#workout.forge-training-more #forgeSlimWorkoutExtrasBody>details>summary:focus-visible{outline:2px solid #a8f55d;outline-offset:-2px}',
  '@media(max-width:370px){#workout.forge-training-more #forgeSlimWorkoutExtras>summary{font-size:14px!important}}'
 ].join('\n');
 document.head.append(s);
}
function wrapMobilityTimer(){
 if(mobilityWrapped||typeof window.forgePlusOpenMobility!=='function')return false;
 const original=window.forgePlusOpenMobility;
 window.forgePlusOpenMobility=function(){
  const result=original.apply(this,arguments);
  // The standalone browse list is removed from Training, but a mobility
  // exercise launched from the plan/library must retain its live timer.
  openExtras('mobility');
  return result;
 };
 mobilityWrapped=true;
 return true;
}
function install(){
 if(installed)return true;
 const page=$('workout'),parts=sections(page);
 if(!page||!parts?.mobility||!parts.cardio||!parts.history)return false;
 styles();
 const outer=el('details','forge-workout-extras');outer.id='forgeSlimWorkoutExtras';
 const summary=el('summary','','Weitere Trainings & Verlauf');
 const body=el('div','forge-workout-extras-body');body.id='forgeSlimWorkoutExtrasBody';
 outer.append(summary,body);
 const targets=[
  [parts.mobility,'🧘 Mobilität & Yoga'],
  [parts.cardio,'🏃 Cardio & Sport'],
  [parts.history,null],
  [parts.readiness,'🧠 Tagesform vor dem Training']
 ];
 for(const [target,label] of targets){
  if(!target)continue;
  target.open=false;
  if(label){
   const heading=target.querySelector(':scope > summary');
   if(heading)heading.textContent=label;
  }
  body.append(target);
 }
 outer.open=false;
 // The strength panel remains the primary action, extras follow it.
 page.append(outer);
 page.classList.add('forge-training-more');
 installed=true;
 wrapMobilityTimer();
 return true;
}
function boot(){
 let attempts=0;
 const tryInstall=()=>{
  if(install())return;
  if(++attempts<75)setTimeout(tryInstall,100);
 };
 tryInstall();
 // Async exercise-plus fetch may install the existing mobility timer API
 // after our layout is already complete.
 document.addEventListener('forge:mobility-ready',wrapMobilityTimer);
 document.addEventListener('click',event=>{
  const mode=event.target?.closest?.('#forge150WorkoutModes button[data-mode]');
  if(mode&&(mode.dataset.mode==='mobility'||mode.dataset.mode==='cardio'))openExtras(mode.dataset.mode);
  if(event.target?.closest?.('#forge150ReadinessLink'))openExtras('readiness');
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
