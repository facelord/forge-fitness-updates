/* FORGE · Training Variant B (Premium).
 * Visual-only. Preserve every original workout input, click handler, clock,
 * save button, workout draft, and session switching workflow.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let installed=false;
let lastIdentity='',lastCard=null,lastFit='',renderedCount=0;
const cachedArt=new Map();
const create=(tag,className,text)=>{
 const e=document.createElement(tag);
 if(className)e.className=className;
 if(text!==undefined)e.textContent=text;
 return e;
};
function liveMode(page,stateRef){
 return !!(page?.classList?.contains('forge-compact-live')&&stateRef?.activeWorkout);
}
function imageData(name){
 if(cachedArt.has(name))return cachedArt.get(name);
 const result={main:null,muscle:null};
 try{
  const call=fn=>typeof fn==='function'?fn(name):'';
  const html=call(window.forgeExerciseIllustrations)||call(window.forgePublicExercisePictures);
  if(html){
   const host=create('div');
   host.innerHTML=html;
   const items=[...host.querySelectorAll('img,svg')];
   if(items.length){
    result.main=items[0].cloneNode(true);
    if(items.length>=3)result.muscle=items[2].cloneNode(true);
   }
  }
 }catch(e){console.warn('FORGE: Trainingsbild nicht verfügbar',name,e);}
 cachedArt.set(name,result);
 return result;
}
function picture(node,label){
 if(!node)return null;
 const n=node.cloneNode(true);
 if(n.tagName?.toLowerCase()==='img'){
  n.loading='lazy';n.decoding='async';
  n.alt=label;
 }else{
  n.setAttribute('role','img');
  n.setAttribute('aria-label',label);
  n.removeAttribute('tabindex');
 }
 return n;
}
function showHero(card,exerciseName,sessionId){
 // Never replace card, inputs, clock, completion button, or their listeners.
 // Only add/update a single decorative image container when the exercise changes.
 const identity=sessionId+'|'+exerciseName;
 let hero=card.querySelector(':scope > #forgePremiumHero');
 if(hero&&lastCard===card&&lastIdentity===identity)return false;
 if(!hero){
  hero=create('div','forge-premium-hero');
  hero.id='forgePremiumHero';
  hero.setAttribute('aria-label','Bild zur aktuellen Übung');
  const position=card.querySelector('.forge130-focus-card-title');
  if(position)position.before(hero);else card.prepend(hero);
 }
 hero.replaceChildren();
 const visual=create('div','forge-premium-hero-image');
 const anatomy=create('div','forge-premium-hero-anatomy');
 const art=imageData(exerciseName);
 if(art.main)visual.append(picture(art.main,exerciseName+' – Übungsausführung'));
 else {
  const fallback=create('div','forge-premium-no-photo');
  fallback.append(create('span','forge-premium-no-photo-icon','◉'));
  fallback.append(create('span','','Übungsbild im Katalog noch nicht vorhanden'));
  visual.append(fallback);
 }
 if(art.muscle){
  anatomy.append(picture(art.muscle,exerciseName+' – beanspruchte Muskeln'));
  anatomy.append(create('span','forge-premium-muscle-label','Muskelgruppen'));
  hero.append(visual,anatomy);
 }else hero.append(visual);
 lastCard=card;lastIdentity=identity;renderedCount++;
 return true;
}
function installStyles(){
 if($('forgePremiumWorkoutStyle'))return;
 const s=create('style');
 s.id='forgePremiumWorkoutStyle';
 s.textContent=[
  '/* Premium typography and strong visual hierarchy on mobile only. */',
  '#workout #forgePremiumBrand{display:none}',
  '#workout.forge-compact-live #forgePremiumBrand{display:flex!important;justify-content:center;align-items:center;height:29px;margin:0 0 5px;color:#a8f55d;font-weight:1000;font-size:20px;font-style:italic;letter-spacing:.12em;text-shadow:0 0 14px #75f5632b}',
  '#workout.forge-compact-live #forgeTrainingV3Status{border:1px solid #344f42!important;border-radius:13px!important;background:linear-gradient(115deg,#142a25 0%,#0d1c22 76%)!important;padding:9px 10px 8px!important;margin:0 0 9px!important;gap:4px!important;box-shadow:0 7px 22px #01090724!important}',
  '#workout.forge-compact-live #forgeTrainingV3Status .forge-v3-name{font-size:13px!important;font-weight:850!important;color:#f2fcf0!important}',
  '#workout.forge-compact-live #forgeTrainingV3Status .forge-v3-sub{font-size:11px!important;color:#bcd9c5!important}',
  '#workout.forge-compact-live #forgeTrainingV3Status .forge-v3-track{height:6px!important;background:#315048!important}',
  '#workout.forge-compact-live #forgeTrainingV3Status .forge-v3-fill{background:#a8f55d!important}',
  '/* The existing clock and pause button are visual siblings. Align without moving DOM. */',
  '#workout.forge-compact-live .forge-clock{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;min-height:67px!important;height:67px!important;box-sizing:border-box!important;margin:0!important;padding:7px 48% 8px 12px!important;gap:4px!important;background:linear-gradient(120deg,#132b29,#102027)!important;border:1px solid #395a4c!important;border-radius:13px!important;box-shadow:0 7px 18px #0003!important}',
  '#workout.forge-compact-live .forge-clock .forge-clock-label{font-size:10px!important;line-height:1.2!important;font-weight:800!important;color:#b3cbbd!important;letter-spacing:.05em}',
  '#workout.forge-compact-live .forge-clock .forge-clock-digits{font-size:clamp(25px,7.8vw,33px)!important;font-weight:900!important;line-height:1.05!important;letter-spacing:.015em!important;color:#a8f55d!important}',
  '#workout.forge-compact-live #forgeLiveControls{position:relative!important;z-index:2!important;display:flex!important;justify-content:flex-end!important;align-items:center!important;height:67px!important;min-height:67px!important;box-sizing:border-box!important;margin:-67px 0 8px!important;padding:0 10px 0 49%!important;background:transparent!important;border:0!important;pointer-events:none!important}',
  '#workout.forge-compact-live #forgeLiveControls .forge-live-buttons{width:100%!important;display:flex!important;justify-content:flex-end!important;gap:0!important}',
  '#workout.forge-compact-live #forgeLivePause{pointer-events:auto!important;min-height:42px!important;height:42px!important;width:100%!important;max-width:164px!important;padding:7px!important;color:#e4f7db!important;border:1px solid #5c9a64!important;border-radius:11px!important;background:linear-gradient(135deg,#1a4830,#285038)!important;box-shadow:inset 0 1px #d8ffd015!important;font-size:12px!important;font-weight:800!important;white-space:nowrap!important}',
  '#workout.forge-compact-live #forgeLiveProgress{display:none!important}',
  '/* Main exercise card: image, title, set, inputs, last performance. */',
  '#workout.forge-compact-live #forgeQuickWorkout{margin:0!important}',
  '#workout.forge-compact-live #forgeQuickWorkout>.forge130-focus-card{display:flex!important;flex-direction:column!important;gap:5px!important;box-sizing:border-box!important;position:relative!important;padding:9px 10px 10px!important;margin:0!important;background:linear-gradient(145deg,#142d26,#0b181e 78%)!important;border:1px solid #386147!important;border-radius:17px!important;box-shadow:0 9px 20px #0004!important}',
  '#workout.forge-compact-live .forge130-focus-card-eyebrow{display:none!important}',
  '#workout.forge-compact-live .forge130-focus-card-title{font-size:clamp(20px,5.8vw,24px)!important;line-height:1.12!important;color:#fff!important;font-weight:900!important;margin:2px 0 0!important}',
  '#workout.forge-compact-live .forge130-focus-card-hint{font-size:11px!important;color:#b9d0bb!important;margin:0 0 4px!important}',
  '#workout.forge-compact-live .forge130-focus-card-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:9px!important;margin:3px 0 2px!important}',
  '#workout.forge-compact-live .forge130-focus-card-grid label{display:grid!important;gap:5px!important;font-size:11px!important;font-weight:720!important;color:#c3dcca!important}',
  '#workout.forge-compact-live .forge130-focus-card-grid input{height:50px!important;min-height:50px!important;width:100%!important;box-sizing:border-box!important;background:#10242b!important;border:1px solid #638877!important;border-radius:11px!important;color:#fff!important;padding:7px 13px!important;font-size:23px!important;font-weight:780!important;box-shadow:inset 0 1px 5px #03080944!important}',
  '#workout.forge-compact-live .forge130-focus-card-grid input:focus{outline:2px solid #a8f55d!important;outline-offset:1px!important}',
  '#workout.forge-compact-live .forge-v3-progression{border:0!important;margin:4px 0 0!important;padding:8px 9px!important;background:#213b35!important;border-radius:10px!important;gap:4px!important}',
  '#workout.forge-compact-live .forge-v3-progression .forge-v3-last{font-size:11px!important;color:#d1e5da!important}',
  '#workout.forge-compact-live .forge-v3-progression .forge-v3-hint{font-size:11px!important;color:#d8edd5!important}',
  '#workout.forge-compact-live .forge-v3-progression .forge-v3-use-weight{min-height:34px!important;padding:5px 10px!important;border:1px solid #a8f55d!important;background:#2a4b33!important;color:#eaffd7!important;border-radius:9px!important}',
  '#workout.forge-compact-live #forgePremiumHero{display:flex;align-items:stretch;justify-content:stretch;gap:5px;width:100%;height:clamp(88px,15.3dvh,140px);min-height:0;margin:0 0 3px;border:1px solid #435c4c;border-radius:12px;overflow:hidden;background:#10202a}',
  '#workout.forge-compact-live .forge-premium-hero-image{flex:1;min-width:0;overflow:hidden;position:relative;background:linear-gradient(110deg,#17372e,#101923)}',
  '#workout.forge-compact-live .forge-premium-hero-image>img,#workout.forge-compact-live .forge-premium-hero-image>svg{display:block;width:100%;height:100%;object-fit:cover;object-position:center}',
  '#workout.forge-compact-live .forge-premium-hero-image>svg{object-fit:contain}',
  '#workout.forge-compact-live .forge-premium-hero-anatomy{width:26%;max-width:118px;flex:none;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(#172a27,#12212a);border-left:1px solid #365840}',
  '#workout.forge-compact-live .forge-premium-hero-anatomy>img,#workout.forge-compact-live .forge-premium-hero-anatomy>svg{display:block;max-width:100%;width:100%;height:100%;object-fit:contain}',
  '#workout.forge-compact-live .forge-premium-muscle-label{position:absolute;bottom:0;left:0;right:0;display:block;padding:5px 2px;text-align:center;font-size:9px;color:#d7f4cb;background:#0d181bd9}',
  '#workout.forge-compact-live .forge-premium-no-photo{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;background:radial-gradient(circle at 48% 35%,#204a34,#101c24 72%);color:#b8d2bd;font-size:10px}',
  '#workout.forge-compact-live .forge-premium-no-photo-icon{font-size:32px;line-height:1;color:#a8f55d}',
  '/* Premium action hierarchy. Original click handlers and button nodes intact. */',
  '#workout.forge-compact-live #forgeQuickWorkout .forge-primary-action{background:#a8f55d!important;color:#0c2516!important;border:0!important;border-radius:13px!important;box-shadow:0 4px 16px #a8f55d26!important;font-size:15px!important;font-weight:850!important}',
  '#workout.forge-compact-live #forgeQuickWorkout .forge130-actions button{background:#213744!important;border:1px solid #355460!important;color:#edf4f0!important;border-radius:11px!important;font-weight:720!important}',
  '#workout.forge-compact-live #forgeCompactDock>button{background:linear-gradient(140deg,#193d2f,#11271e)!important;border-color:#477a56!important;border-radius:11px!important;font-weight:750!important}',
  '#workout.forge-compact-live #saveWorkout{background:linear-gradient(115deg,#213c3a,#17312f)!important;border:1px solid #507d70!important;color:#e9f7ea!important;border-radius:11px!important;font-weight:730!important}',
  '/* Very short or narrow viewports cannot afford a tall preview. */',
  '@media(max-height:805px){#workout.forge-compact-live #forgePremiumHero{height:90px}#workout.forge-compact-live #forgeTrainingV3Status{padding:6px 9px!important;margin-bottom:5px!important}#workout.forge-compact-live #forgePremiumBrand{height:23px;margin-bottom:3px}#workout.forge-compact-live .forge-clock,#workout.forge-compact-live #forgeLiveControls{height:60px!important;min-height:60px!important}#workout.forge-compact-live #forgeLiveControls{margin-top:-60px!important;margin-bottom:5px!important}}',
  '@media(max-height:720px){#workout.forge-compact-live #forgePremiumHero{height:67px}#workout.forge-compact-live #forgePremiumBrand{display:none!important}#workout.forge-compact-live #forgeQuickWorkout>.forge130-focus-card{padding:6px 8px!important;gap:3px!important}#workout.forge-compact-live .forge130-focus-card-grid input{height:44px!important;min-height:44px!important}#workout.forge-compact-live .forge-v3-progression{padding:4px 7px!important}}',
  '@media(max-height:610px){#workout.forge-compact-live #forgePremiumHero{display:none!important}#workout.forge-compact-live #forgeTrainingV3Status .forge-v3-sub{display:none!important}}',
  '@media(max-width:365px){#workout.forge-compact-live .forge-premium-hero-anatomy{width:24%}#workout.forge-compact-live .forge130-focus-card-title{font-size:19px!important}#workout.forge-compact-live .forge-clock .forge-clock-digits{font-size:25px!important}}',
  '/* Keyboard stays usable, and visual preview never steals focus. */',
  'body.forge-compact-typing #workout.forge-compact-live #forgePremiumHero{display:none!important}',
  'body.forge-compact-typing #workout.forge-compact-live #forgePremiumBrand{display:none!important}',
  '@media(prefers-reduced-motion:reduce){#workout.forge-compact-live #forgePremiumHero *{animation:none!important;transition:none!important}}'
 ].join('\n');
 document.head.append(s);
}
function fitToScreen(card){
 const hero=card?.querySelector(':scope > #forgePremiumHero');
 const action=card?.querySelector('.forge-primary-action');
 if(!hero||!action||typeof hero.getBoundingClientRect!=='function')return;
 // Critical accessibility guard: all original controls must remain above
 // the fixed "Satz abschließen" button, without enabling page scrolling.
 // Only trim/hide decorative media; never hide, resize, or relocate input fields.
 hero.style.removeProperty('height');
 hero.style.removeProperty('display');
 const cardBottom=card.getBoundingClientRect().bottom;
 const actionTop=action.getBoundingClientRect().top;
 if(!Number.isFinite(cardBottom)||!Number.isFinite(actionTop))return;
 const deficit=cardBottom-actionTop+12;
 if(deficit<=0)return;
 const currentHeight=hero.getBoundingClientRect().height;
 const nextHeight=currentHeight-deficit;
 if(nextHeight>=54)hero.style.height=nextHeight+'px';
 else hero.style.display='none';
}
function sync(){
 const page=$('workout');
 if(!installed||!liveMode(page,typeof state==='undefined'?null:state))return;
 const p=state.plan?.find(x=>String(x.id)===String(state.activeWorkout.planId));
 const focus=p&&typeof window.forge130CurrentFocus==='function'?window.forge130CurrentFocus(p):null;
 if(!p||!focus)return;
 const name=state.workoutDraft?.exercises?.[focus.i]?.name||p.ex?.[focus.i]?.name;
 if(!name)return;
 const card=$('forgeQuickWorkout')?.querySelector(':scope > .forge130-focus-card');
 if(!card)return;
 const identity=String(state.activeWorkout.planId)+':'+String(state.activeWorkout.startedAt);
 const changed=showHero(card,name,identity);
 // Avoid repeated layout invalidation on the active training clock tick.
 // Only revisit decorative sizing if the exercise, viewport or rest state changes.
 const signature=identity+'|'+name+'|'+window.innerWidth+'|'+window.innerHeight+'|'+
  String(document.body.classList.contains('forge-compact-typing'))+'|'+
  String($('forgeRestTimer')?.classList.contains('forge-live-rest-running'));
 if(changed||signature!==lastFit){
  fitToScreen(card);
  lastFit=signature;
 }
}
function install(){
 if(installed)return true;
 const page=$('workout');
 if(!page||!$('forgeQuickWorkout')||!$('workoutDigitalClock')||!$('forgeLiveControls'))return false;
 installStyles();
 if(!$('forgePremiumBrand')){
  const brand=create('div','');brand.id='forgePremiumBrand';brand.textContent='FORGE';
  const container=page.querySelector('.forge150-workout-lead');
  if(container)container.before(brand);
  else page.prepend(brand);
 }
 installed=true;sync();return true;
}
function boot(){
 let attempts=0;
 const start=()=>{
  if(install())return;
  if(++attempts<75)setTimeout(start,120);
 };
 start();
 setInterval(()=>{if(!installed)install();sync();},700);
}
window.ForgePremiumWorkoutB=Object.freeze({liveMode,imageData,showHero,fitToScreen,isInstalled:()=>installed,renderCount:()=>renderedCount});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
