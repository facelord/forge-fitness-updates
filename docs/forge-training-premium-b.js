/* FORGE · Training Variant B (Premium).
 * Visual-only. Preserve every original workout input, click handler, clock,
 * save button, workout draft, and session switching workflow.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let installed=false;
let lastIdentity='',lastCard=null,lastFit='',renderedCount=0;
const homeMarkers=new Map();let shell=null;
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
    result.main=(items[1]||items[0]).cloneNode(true);
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
 const node=create('style');node.id='forgePremiumWorkoutStyle';
 node.textContent="\n#workout.forge-compact-live.forge-premium-layout.active{padding:0!important;overflow:hidden!important;background:#09151b!important}\n#workout.forge-premium-layout #forgePremiumShell{box-sizing:border-box;display:grid;width:100%;max-width:630px;height:100%;min-height:0;margin:0 auto;padding:max(42px,env(safe-area-inset-top,0px)) 14px 9px;grid-template-rows:auto auto minmax(0,1fr) auto;gap:8px;background:linear-gradient(155deg,#0a161b,#09131b)}\n#workout.forge-premium-layout .forge-premium-head{display:grid;gap:7px;min-width:0}\n#workout.forge-premium-layout #forgePremiumBrand{display:flex!important;align-items:center;justify-content:space-between;height:26px;margin:0!important;color:#a8f55d;font-size:19px;font-style:italic;font-weight:950;letter-spacing:.13em}\n#workout.forge-premium-layout .forge-premium-context{font-size:9px;color:#b7d2b8;font-style:normal;font-weight:800;letter-spacing:.1em}\n#workout.forge-premium-layout #forgeTrainingV3Status{display:grid!important;gap:4px!important;margin:0!important;padding:10px 12px!important;border:1px solid #3d624c!important;border-radius:13px!important;background:linear-gradient(120deg,#18372c,#10222a)!important;box-shadow:0 5px 15px #0003!important}\n#workout.forge-premium-layout #forgeTrainingV3Status .forge-v3-name{font-size:12px!important;color:#b4f47d!important;font-weight:850!important}\n#workout.forge-premium-layout #forgeTrainingV3Status .forge-v3-sub{font-size:11px!important;color:#d4e6d4!important;line-height:1.2!important}\n#workout.forge-premium-layout #forgeTrainingV3Bar{padding:3px 0 0!important}\n#workout.forge-premium-layout #forgeTrainingV3Fill{background:#a8f55d!important}\n#workout.forge-premium-layout .forge-premium-timer{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:9px;align-items:center;min-height:69px;box-sizing:border-box;padding:9px 11px;border:1px solid #456b55;border-radius:13px;background:linear-gradient(125deg,#17392e,#10242c)}\n#workout.forge-premium-layout .forge-premium-timer .forge-clock{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:4px!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}\n#workout.forge-premium-layout .forge-premium-timer .forge-clock-label{font-size:9px!important;font-weight:800!important;color:#c1d7c6!important}\n#workout.forge-premium-layout .forge-premium-timer .forge-clock-digits{margin:0!important;padding:0!important;font-size:clamp(24px,7vw,34px)!important;line-height:1.05!important;font-weight:900!important;letter-spacing:.02em!important;color:#a8f55d!important;font-variant-numeric:tabular-nums!important}\n#workout.forge-premium-layout .forge-premium-timer #forgeLiveControls{display:flex!important;position:static!important;height:auto!important;min-height:0!important;width:100%!important;align-items:center!important;justify-content:stretch!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;pointer-events:auto!important}\n#workout.forge-premium-layout .forge-premium-timer .forge-live-buttons{display:flex!important;width:100%!important}\n#workout.forge-premium-layout .forge-premium-timer #forgeLivePause{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;max-width:none!important;min-width:0!important;flex:1!important;min-height:43px!important;height:auto!important;margin:0!important;padding:7px 4px!important;border:1px solid #64936b!important;border-radius:10px!important;background:#2a503b!important;color:#edffe8!important;white-space:normal!important;font-size:11px!important;font-weight:800!important;pointer-events:auto!important}\n#workout.forge-premium-layout #forgeLivePause[aria-pressed=\"true\"]{background:#66502d!important;color:#fff4ca!important;border-color:#d0b370!important}\n#workout.forge-premium-layout #forgeLiveProgress,#workout.forge-premium-layout .forge-live-state{display:none!important}\n#workout.forge-premium-layout .forge-premium-main{display:flex;flex-direction:column;justify-content:center;gap:6px;min-width:0;min-height:0;box-sizing:border-box;overflow:hidden}\n#workout.forge-premium-layout .forge-premium-main #forgeRestTimer.forge-live-rest-running{display:block!important;flex:none!important;margin:0!important;padding:5px 8px!important;font-size:11px!important;background:#203d2a!important;border:0!important;border-radius:9px!important}\n#workout.forge-premium-layout .forge-premium-main #forgeRestTimer:not(.forge-live-rest-running){display:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout{display:block!important;min-width:0!important;width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;overflow:visible!important}\n#workout.forge-premium-layout #forgeQuickWorkout>.forge130-focus-card{box-sizing:border-box;display:flex!important;flex-direction:column!important;gap:6px!important;width:100%!important;min-width:0!important;min-height:0!important;max-height:none!important;margin:0!important;padding:10px 11px!important;border:1px solid #3e654f!important;border-radius:15px!important;background:linear-gradient(140deg,#163227,#0d1e25)!important;box-shadow:0 8px 20px #0003!important;overflow:visible!important}\n#workout.forge-premium-layout #forgePremiumHero{box-sizing:border-box;display:flex!important;gap:5px;width:100%;height:clamp(88px,15dvh,145px);flex:none;min-height:0;margin:0 0 2px!important;border:1px solid #4e695a;border-radius:11px;overflow:hidden;background:#13242a}\n#workout.forge-premium-layout .forge-premium-hero-image{display:flex;flex:1;min-width:0;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(100deg,#1d392d,#0f1b24)}\n#workout.forge-premium-layout .forge-premium-hero-image>img,#workout.forge-premium-layout .forge-premium-hero-image>svg{display:block;width:100%;height:100%;object-fit:contain;object-position:center}\n#workout.forge-premium-layout .forge-premium-hero-anatomy{display:flex;flex:none;position:relative;width:26%;max-width:116px;align-items:center;justify-content:center;overflow:hidden;background:#172d28;border-left:1px solid #43634e}\n#workout.forge-premium-layout .forge-premium-hero-anatomy>img,#workout.forge-premium-layout .forge-premium-hero-anatomy>svg{display:block;width:100%;height:100%;object-fit:contain}\n#workout.forge-premium-layout .forge-premium-muscle-label{position:absolute;bottom:0;left:0;right:0;padding:4px 2px;background:#0b1b1bdd;color:#e3f7d8;text-align:center;font-size:9px}\n#workout.forge-premium-layout .forge-premium-no-photo{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;height:100%;text-align:center;color:#b8d0bd;font-size:10px}\n#workout.forge-premium-layout .forge-premium-no-photo-icon{font-size:26px;color:#a8f55d}\n#workout.forge-premium-layout .forge130-focus-card-eyebrow{display:none!important}\n#workout.forge-premium-layout .forge130-focus-card-title{font-size:clamp(21px,5.8vw,26px)!important;line-height:1.12!important;font-weight:850!important;color:#f4fff2!important;margin:2px 0 0!important}\n#workout.forge-premium-layout .forge130-focus-card-hint{font-size:11px!important;color:#c2d5c5!important;line-height:1.3!important;margin:0!important}\n#workout.forge-premium-layout .forge130-focus-card-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:9px!important;margin:5px 0 2px!important}\n#workout.forge-premium-layout .forge130-focus-card-grid label{display:grid!important;gap:5px!important;min-width:0!important;font-size:11px!important;font-weight:750!important;color:#cadfcd!important}\n#workout.forge-premium-layout .forge130-focus-card-grid input{box-sizing:border-box!important;width:100%!important;min-height:49px!important;height:49px!important;margin:0!important;padding:7px 12px!important;background:#12262e!important;color:#fff!important;border:1px solid #638775!important;border-radius:11px!important;font-size:22px!important;font-weight:820!important}\n#workout.forge-premium-layout .forge130-focus-card-grid input:focus-visible{outline:2px solid #a8f55d!important;outline-offset:1px!important}\n#workout.forge-premium-layout .forge-v3-progression{display:grid!important;gap:3px!important;margin:3px 0 1px!important;padding:7px 9px!important;background:#243f31!important;border:0!important;border-radius:10px!important}\n#workout.forge-premium-layout .forge-v3-progression .forge-v3-last,#workout.forge-premium-layout .forge-v3-progression .forge-v3-hint{font-size:11px!important;line-height:1.3!important;color:#dbecda!important}\n#workout.forge-premium-layout .forge-v3-progression .forge-v3-use-weight{min-height:33px!important;margin:0!important;padding:5px 9px!important;font-size:11px!important;border:1px solid #85c576!important;border-radius:9px!important;color:#f4ffe8!important;background:#31593b!important}\n#workout.forge-premium-layout .forge-v3-progression>.forge-v3-last:last-child{display:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-primary-action{position:static!important;inset:auto!important;z-index:auto!important;display:flex!important;justify-content:center!important;align-items:center!important;width:100%!important;box-sizing:border-box!important;min-height:49px!important;height:49px!important;margin:6px 0 0!important;padding:7px!important;border:0!important;border-radius:11px!important;background:#a8f55d!important;color:#132519!important;font-size:15px!important;font-weight:850!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-actions{position:static!important;inset:auto!important;z-index:auto!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-actions button{min-height:41px!important;height:41px!important;padding:6px!important;border:1px solid #42616a!important;border-radius:10px!important;background:#293e48!important;color:#edf7ec!important;font-size:12px!important;font-weight:720!important}\n#workout.forge-premium-layout .forge-premium-footer{display:grid;gap:7px;min-height:0;padding-top:2px}\n#workout.forge-premium-layout #forgeCompactDock{position:static!important;inset:auto!important;z-index:auto!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeCompactDock>button{min-height:42px!important;height:42px!important;padding:6px 5px!important;border:1px solid #4c7755!important;border-radius:10px!important;background:#1c392c!important;color:#e8f4e0!important;font-size:12px!important;font-weight:750!important}\n#workout.forge-premium-layout #saveWorkout{position:static!important;inset:auto!important;z-index:auto!important;display:flex!important;justify-content:center!important;align-items:center!important;box-sizing:border-box!important;width:100%!important;min-height:41px!important;height:41px!important;margin:0!important;padding:7px!important;border:1px solid #537a6c!important;border-radius:10px!important;background:#193335!important;color:#e2f4e3!important;font-size:12px!important;font-weight:750!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-slim-focus-tools:not([open]),#workout.forge-premium-layout #forgeQuickWorkout .forge130-substitute,#workout.forge-premium-layout #forgeQuickWorkout .forge130-suggestion,#workout.forge-premium-layout #forgeQuickWorkout .forge140-exercise-warmup,#workout.forge-premium-layout #forgeLiveNext{display:none!important}\n#workout.forge-premium-layout .forge150-workout-lead .forge-fold-body>.card>label:first-child,#workout.forge-premium-layout .forge150-workout-lead #workoutSelect{display:none!important}\n#workout.forge-premium-layout .forge-premium-main.forge-premium-tight #forgePremiumHero{height:65px}\n#workout.forge-premium-layout .forge-premium-main.forge-premium-tight #forgeQuickWorkout>.forge130-focus-card{padding:7px 9px!important;gap:4px!important}\n#workout.forge-premium-layout .forge-premium-main.forge-premium-photo-hidden #forgePremiumHero{display:none!important}\n#workout.forge-premium-layout .forge-premium-main.forge-premium-extreme{overflow-y:auto!important;overscroll-behavior:contain}\n@media(max-height:790px){#workout.forge-premium-layout #forgePremiumShell{padding-top:max(31px,env(safe-area-inset-top,0px));gap:6px}#workout.forge-premium-layout #forgePremiumHero{height:88px}#workout.forge-premium-layout .forge-premium-timer{min-height:61px;padding:7px 9px}#workout.forge-premium-layout #forgePremiumBrand{height:21px}#workout.forge-premium-layout #forgeTrainingV3Status{padding:7px 10px!important}#workout.forge-premium-layout #forgeQuickWorkout>.forge130-focus-card{padding:8px 9px!important;gap:5px!important}}\n@media(max-height:690px){#workout.forge-premium-layout #forgePremiumShell{padding-top:max(24px,env(safe-area-inset-top,0px));gap:5px}#workout.forge-premium-layout #forgePremiumBrand{height:19px;font-size:16px}#workout.forge-premium-layout #forgePremiumHero{height:64px}#workout.forge-premium-layout #forgeQuickWorkout .forge-primary-action{height:44px!important;min-height:44px!important}#workout.forge-premium-layout #forgeQuickWorkout .forge130-actions button{height:37px!important;min-height:37px!important}#workout.forge-premium-layout #forgeCompactDock>button{height:38px!important;min-height:38px!important}#workout.forge-premium-layout #saveWorkout{height:38px!important;min-height:38px!important}}\n@media(max-height:590px){#workout.forge-premium-layout #forgePremiumBrand{display:none!important}#workout.forge-premium-layout #forgePremiumHero{display:none!important}}\n@media(max-width:360px){#workout.forge-premium-layout .forge-clock-digits{font-size:23px!important}#workout.forge-premium-layout .forge130-focus-card-title{font-size:20px!important}#workout.forge-premium-layout .forge-premium-hero-anatomy{width:23%}}\nbody.forge-compact-typing #workout.forge-premium-layout .forge-premium-footer{display:none!important}\nbody.forge-compact-typing #workout.forge-premium-layout .forge-premium-main{overflow-y:auto!important;justify-content:flex-start!important}\nbody.forge-compact-typing #workout.forge-premium-layout #forgePremiumHero{display:none!important}\n@media(prefers-reduced-motion:reduce){#workout.forge-premium-layout *{scroll-behavior:auto!important;transition:none!important}}\n";

 // Override legacy compact-mode position:fixed rules with a more specific
 // premium-only viewport layout. Original inputs and click handlers are intact.
 node.textContent += `
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell{
 box-sizing:border-box!important;display:grid!important;
 grid-template-rows:auto auto minmax(0,1fr) auto!important;
 height:100%!important;min-height:0!important;max-height:100%!important;
 gap:6px!important;padding:max(12px,env(safe-area-inset-top,0px)) 12px 9px!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumMain{
 min-width:0!important;min-height:0!important;justify-content:flex-start!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgePremiumHero{
 width:100%!important;max-width:100%!important;flex:none!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell .forge-premium-hero-image{
 flex:1 1 0%!important;min-width:0!important;width:100%!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell .forge-premium-hero-image>img,
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell .forge-premium-hero-image>svg{
 display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeQuickWorkout{
 position:static!important;inset:auto!important;width:100%!important;
 margin:0!important;padding:0!important;transform:none!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeQuickWorkout>.forge130-focus-card{
 display:flex!important;flex-direction:column!important;gap:6px!important;
 margin:0!important;min-height:0!important;max-height:none!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeQuickWorkout .forge-primary-action,
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeQuickWorkout .forge130-actions,
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeCompactDock,
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #saveWorkout{
 position:static!important;inset:auto!important;left:auto!important;right:auto!important;
 top:auto!important;bottom:auto!important;z-index:auto!important;transform:none!important;
 width:100%!important;max-width:none!important;margin:0!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeQuickWorkout .forge-primary-action{
 display:flex!important;align-items:center!important;justify-content:center!important;
 flex:none!important;min-height:48px!important;height:48px!important;margin-top:4px!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeQuickWorkout .forge130-actions,
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeCompactDock{
 display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeCompactDock>button,
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #forgeQuickWorkout .forge130-actions button{
 min-width:0!important;min-height:42px!important;height:42px!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell .forge-premium-footer{
 position:static!important;align-self:end!important;display:flex!important;
 flex-direction:column!important;gap:7px!important;min-height:0!important;
}
#workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell #saveWorkout{
 display:flex!important;align-items:center!important;justify-content:center!important;
 flex:none!important;min-height:42px!important;height:42px!important;
}
@media(max-height:690px){
 #workout.forge-compact-live.forge-premium-layout.active #forgePremiumShell{
  padding-top:max(8px,env(safe-area-inset-top,0px))!important;gap:4px!important;
 }
}
`;
 document.head.append(node);
}
function movePreservingNode(node,destination){
 if(!node||!destination)return false;
 if(!homeMarkers.has(node)){
  const marker=document.createComment('FORGE premium original position');
  node.before(marker);
  homeMarkers.set(node,marker);
 }
 if(node.parentElement!==destination)destination.append(node);
 return true;
}
function restoreLayout(){
 if(!shell)return;
 // This restores the original DOM elements, with values and listeners intact.
 for(const [node,marker] of homeMarkers){
  if(marker.parentNode){marker.after(node);marker.remove();}
 }
 homeMarkers.clear();
 shell.remove();shell=null;
 $('workout')?.classList.remove('forge-premium-layout');
 lastCard=null;lastFit='';lastIdentity='';
}
function mountLayout(){
 if(shell)return true;
 const page=$('workout'),status=$('forgeTrainingV3Status');
 const clock=$('workoutDigitalClock')?.closest('.forge-clock');
 const controls=$('forgeLiveControls'),rest=$('forgeRestTimer');
 const quick=$('forgeQuickWorkout'),dock=$('forgeCompactDock'),save=$('saveWorkout');
 if(!page||!status||!clock||!controls||!quick||!dock||!save||!rest)return false;
 shell=create('div','forge-premium-shell');shell.id='forgePremiumShell';
 const head=create('div','forge-premium-head');
 const brand=create('div','');brand.id='forgePremiumBrand';
 brand.append(create('span','','FORGE'),create('span','forge-premium-context','DEIN TRAINING'));
 head.append(brand);
 const timer=create('div','forge-premium-timer');
 const main=create('div','forge-premium-main');main.id='forgePremiumMain';
 const footer=create('div','forge-premium-footer');
 shell.append(head,timer,main,footer);
 page.prepend(shell);
 // Add the scope *before* moving save: the legacy UI must not put it back.
 page.classList.add('forge-premium-layout');
 movePreservingNode(status,head);
 movePreservingNode(clock,timer);
 movePreservingNode(controls,timer);
 movePreservingNode(rest,main);
 movePreservingNode(quick,main);
 movePreservingNode(dock,footer);
 movePreservingNode(save,footer);
 return true;
}
function fitToScreen(card){
 const main=$('forgePremiumMain'),hero=card?.querySelector(':scope > #forgePremiumHero');
 if(!main||!card||!hero)return;
 main.classList.remove('forge-premium-tight','forge-premium-photo-hidden','forge-premium-extreme');
 hero.style.removeProperty('height');hero.style.removeProperty('display');
 const available=main.clientHeight;
 if(!available)return;
 const needed=card.getBoundingClientRect().height+
  ($('forgeRestTimer')?.classList.contains('forge-live-rest-running')?48:0);
 if(needed<=available-8)return;
 const shortage=needed-available+10,originalHeight=hero.getBoundingClientRect().height;
 if(originalHeight-shortage>=64)hero.style.height=(originalHeight-shortage)+'px';
 else main.classList.add('forge-premium-tight');
 // After changing layout, measure once more before hiding optional media.
 if(card.getBoundingClientRect().height>available-8)main.classList.add('forge-premium-photo-hidden');
 // Extremely short landscape screens: allow internal main scrolling, never
 // obscure buttons or clip inputs. Normal portrait stays strictly no-scroll.
 if(card.getBoundingClientRect().height>available-5)main.classList.add('forge-premium-extreme');
}
function sync(){
 const page=$('workout');
 if(!installed||!page)return;
 const active=liveMode(page,typeof state==='undefined'?null:state);
 if(!active){restoreLayout();return;}
 if(!mountLayout())return;
 // Other legacy modules may reattach controls when completing a set.
 // Keep their original nodes and handlers, never clone them.
 const head=shell.querySelector('.forge-premium-head');
 const timer=shell.querySelector('.forge-premium-timer');
 const main=$('forgePremiumMain'),footer=shell.querySelector('.forge-premium-footer');
 const clock=$('workoutDigitalClock')?.closest('.forge-clock');
 for(const [node,target] of [
  [$('forgeTrainingV3Status'),head],[clock,timer],[$('forgeLiveControls'),timer],
  [$('forgeRestTimer'),main],[$('forgeQuickWorkout'),main],
  [$('forgeCompactDock'),footer],[$('saveWorkout'),footer]
 ]){
  if(node&&target&&node.parentElement!==target)target.append(node);
 }
 const plan=state.plan?.find(p=>String(p.id)===String(state.activeWorkout.planId));
 const focus=plan&&typeof window.forge130CurrentFocus==='function'?window.forge130CurrentFocus(plan):null;
 if(!plan||!focus)return;
 const name=state.workoutDraft?.exercises?.[focus.i]?.name||plan.ex?.[focus.i]?.name;
 if(!name)return;
 const card=$('forgeQuickWorkout')?.querySelector(':scope > .forge130-focus-card');
 if(!card)return;
 const id=String(state.activeWorkout.planId)+':'+String(state.activeWorkout.startedAt);
 const changed=showHero(card,name,id);
 // Geometry is re-evaluated only on meaningful changes, not every clock tick.
 const geometry=id+'|'+name+'|'+window.innerWidth+'x'+window.innerHeight+
  '|'+(document.body.classList.contains('forge-compact-typing')?'keyboard':'normal')+
  '|'+($('forgeRestTimer')?.classList.contains('forge-live-rest-running')?'rest':'ready')+
  '|'+(!!card.querySelector('.forge-v3-progression')?'hint':'no-hint');
 if(changed||lastFit!==geometry){
  fitToScreen(card);
  lastFit=geometry;
 }
}
function install(){
 if(installed)return true;
 if(!$('workout')||!$('forgeQuickWorkout')||!$('workoutDigitalClock')||!$('forgeLiveControls'))return false;
 installStyles();
 installed=true;sync();return true;
}
function boot(){
 let attempts=0;
 const start=()=>{if(install())return;if(++attempts<75)setTimeout(start,120);};
 start();
 setInterval(()=>{if(!installed)install();sync();},700);
 window.addEventListener('resize',()=>{lastFit='';sync();},{passive:true});
}
window.ForgePremiumWorkoutB=Object.freeze({liveMode,imageData,showHero,fitToScreen,mountLayout,restoreLayout,isInstalled:()=>installed,renderCount:()=>renderedCount});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
