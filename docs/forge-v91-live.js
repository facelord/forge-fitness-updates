/* FORGE V9.1 · Preserve Premium Layout 3. Add an in-session warmup step
 * before native working sets; existing workout and statistics remain authoritative.
 * This module never modifies the saved training plan or the work-set entries.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let editedExercise=-1,editedSet=-1,lastKey='',lastContext=null;
const css=[
 '#workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-v8-instruments .forge-b-rest #forgeRestTimer.forge-live-rest-running{font-size:clamp(19px,5vw,26px)!important;font-weight:850!important;font-variant-numeric:tabular-nums!important;text-align:center!important;line-height:1.3!important;color:#e8ffda!important;padding:4px 2px!important;min-height:31px!important}',
 '#workout.forge-premium-layout .forge-b-media-arrows{display:flex!important;flex:none!important;gap:6px!important;align-items:center!important}',
 '#workout.forge-premium-layout .forge-b-media-arrows button{width:48px!important;min-width:48px!important;height:48px!important;min-height:48px!important;font-size:36px!important;font-weight:850!important;line-height:1!important;touch-action:manipulation!important}',
 '#workout.forge-premium-layout .forge-b-title-stack{min-width:0!important;flex:1!important}',
 '#workout.forge-premium-layout #forgeBExerciseName{font-size:clamp(20px,5.6vw,27px)!important;line-height:1.13!important;font-weight:850!important;overflow-wrap:anywhere}',
 '#workout.forge-premium-layout #forgeBSetLabel{font-size:clamp(15px,4.1vw,19px)!important;font-weight:830!important;line-height:1.3!important}',
 '#workout.forge-premium-layout .forge-b-set-heading{min-height:25px!important;align-items:center!important}',
 '#workout.forge-premium-layout #forgeTimeTimerArea{grid-column:1/-1!important;min-width:0!important;max-width:100%!important;overflow:visible!important}',
 '#workout.forge-premium-layout #forgeTimeTimerArea .forge-time-panel{box-sizing:border-box!important;width:100%!important;min-width:0!important;padding:7px 8px!important;margin:0!important;display:grid!important;justify-items:center!important;gap:4px!important}',
 '#workout.forge-premium-layout #forgeTimeTimerArea .forge-time-digits{font-size:clamp(29px,9vw,43px)!important;font-variant-numeric:tabular-nums!important;font-weight:900!important;line-height:1.12!important;white-space:nowrap!important;letter-spacing:.02em!important}',
 '#workout.forge-premium-layout #forgeTimeTimerArea .forge-time-sub{font-size:clamp(11px,3vw,13px)!important;line-height:1.35!important;text-align:center!important;overflow-wrap:anywhere}',
 '#workout.forge-premium-layout #forgeTimeTimerArea .forge-time-controls{width:100%!important;display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:6px!important}',
 '#workout.forge-premium-layout #forgeTimeTimerArea .forge-time-controls button{min-height:40px!important;flex:1 1 110px!important;padding:5px!important;font-size:12px!important}',
 '.forge-swap-backdrop{padding-top:env(safe-area-inset-top,0px)!important}',
 '.forge-swap-sheet{height:min(92dvh,920px)!important;max-height:calc(100dvh - env(safe-area-inset-top,0px))!important;min-width:0!important;overflow:hidden!important}',
 '.forge-swap-head,.forge-swap-tabs,.forge-swap-search,.forge-swap-footer{flex-shrink:0!important;min-width:0!important}',
 '.forge-swap-search input{min-width:0!important;width:100%!important}',
 '.forge-swap-results{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important}',
 '.forge-swap-item,.forge-swap-item-details{min-width:0!important;max-width:100%!important}',
 '.forge-swap-item-details strong{white-space:normal!important;overflow-wrap:anywhere!important}',
 '.forge-swap-footer{position:relative!important;z-index:2!important;background:#0b181c!important;padding-bottom:max(8px,env(safe-area-inset-bottom,0px))!important}',
 '#workout.forge-premium-layout #forgeV91Warm{box-sizing:border-box!important;min-width:0!important;margin:0!important;padding:0!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-bar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:5px!important;min-height:28px!important;margin-bottom:4px!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-caption{color:#b7d3a8!important;font-size:11px!important;font-weight:750!important;line-height:1.2!important}',
 '#workout.forge-premium-layout #forgeV91Warm button{touch-action:manipulation!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-tools{display:flex!important;gap:5px!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-tools button{border:1px solid #536c43!important;background:#18251a!important;color:#c7ff9c!important;border-radius:9px!important;padding:3px 8px!important;min-height:30px!important;font-size:11px!important;font-weight:750!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-fields{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-fields label{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:0!important;height:102px!important;padding:8px 4px!important;background:radial-gradient(ellipse at bottom,rgba(128,212,42,.08),transparent 65%)!important;color:#c3d9b5!important;font-size:11px!important;font-weight:750!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-fields input{box-sizing:border-box!important;width:85%!important;min-width:0!important;min-height:43px!important;height:43px!important;background:transparent!important;border:0!important;border-bottom:2px solid #81bb4a!important;border-radius:0!important;color:#f4ffed!important;font-size:clamp(24px,7vw,34px)!important;font-weight:850!important;text-align:center!important;font-variant-numeric:tabular-nums!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-fields input:focus-visible{outline:2px solid #9eff00!important;outline-offset:2px!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-bottom{display:flex!important;gap:7px!important;align-items:center!important;margin-top:5px!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-bottom button{flex:1!important;min-height:44px!important;border-radius:11px!important;font-size:12px!important;font-weight:850!important;padding:4px 6px!important}',
 '#workout.forge-premium-layout #forgeV91Warm #forgeV91WarmDone{background:#9eff00!important;color:#10180c!important;border:0!important}',
 '#workout.forge-premium-layout #forgeV91Warm #forgeV91WarmRemove{flex:0 0 43px!important;min-width:43px!important;border:1px solid #5f7053!important;background:#1b231a!important;color:#e4e9dc!important}',
 '#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-feedback{min-height:0!important;font-size:11px!important;color:#ffca87!important;line-height:1.3!important}',
 '#workout.forge-premium-layout #forgePremiumShell.forge-v91-warming #forgeQuickWorkout{display:none!important}',
 '#workout.forge-premium-layout #forgePremiumShell.forge-v91-warming .forge-b-set-panel{min-height:0!important}',
 '@media(max-height:760px){#workout.forge-premium-layout #forgePremiumShell.forge-v91-warming.forge-v8-instruments{grid-template-rows:34px 53px 35px auto minmax(95px,1fr) auto 46px!important;row-gap:3px!important}#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-fields label{height:85px!important}#workout.forge-premium-layout #forgeV91Warm .forge-v91-warm-fields input{min-height:38px!important;height:38px!important}#workout.forge-premium-layout .forge-b-media-arrows button{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}}',
 '@media(max-width:370px){.forge-swap-sheet{padding-left:9px!important;padding-right:9px!important}.forge-swap-tabs{gap:2px!important}.forge-swap-tab{font-size:12px!important;padding:3px!important}.forge-swap-footer{grid-template-columns:1fr 1.35fr!important}.forge-swap-footer button{min-width:0!important;font-size:12px!important}#workout.forge-premium-layout .forge-b-media-arrows{gap:3px!important}}',
 'body.forge-compact-typing #workout.forge-premium-layout #forgePremiumShell.forge-v91-warming{overflow-y:auto!important}'
].join('\n');
function installStyle(){
 if($('forgeV91LiveStyle'))return;
 const el=document.createElement('style');el.id='forgeV91LiveStyle';el.textContent=css;document.head.append(el);
}
function context(){
 if(typeof state==='undefined'||!state?.activeWorkout||!state.workoutDraft)return null;
 const plan=state.plan?.find(p=>String(p.id)===String(state.activeWorkout.planId));
 if(!plan||String(state.workoutDraft.planId)!==String(plan.id))return null;
 const focus=typeof window.forge130CurrentFocus==='function'?window.forge130CurrentFocus(plan):null;
 if(!focus||!Number.isInteger(focus.i))return null;
 return {plan,focus,draft:state.workoutDraft};
}
function warmFor(c,create){
 let w=c.draft.warmup;
 if(!w||typeof w!=='object'){
  if(!create)return null;
  w=c.draft.warmup={general:{type:'none',minutes:5,done:false},exercises:{}};
 }
 if(!w.exercises||typeof w.exercises!=='object'){
  if(!create)return null;
  w.exercises={};
 }
 let item=w.exercises[c.focus.i];
 if(!item&&create)item=w.exercises[c.focus.i]={mode:'sets',sets:[],minutes:3,done:false};
 if(!item)return null;
 if(!Array.isArray(item.sets))item.sets=[];
 return item;
}
function persist(c){
 c.draft.updatedAt=new Date().toISOString();
 if(typeof save==='function')save();
}
function currentEditor(c){
 const w=warmFor(c,false),sets=w?.mode==='sets'?w.sets:[];
 if(editedExercise!==c.focus.i){editedExercise=c.focus.i;editedSet=-1;lastKey='';}
 const pending=sets.findIndex(s=>!s.done);
 if(pending>=0&&editedSet<0)return pending;
 if(editedSet>=0&&editedSet<sets.length)return editedSet;
 return pending;
}
function addWarmup(){
 const c=context();if(!c)return;
 const w=warmFor(c,true);if(w.sets.length>=8)return;
 const weight=Number(c.draft.exercises?.[c.focus.i]?.sets?.find(s=>Number(s.kg)>0)?.kg)||0;
 const i=w.sets.length;
 w.mode='sets';
 w.sets.push({setType:'warmup',kg:weight?String(Math.round(weight*[.4,.6,.75,.85,.9][Math.min(i,4)]/2.5)*2.5):'',reps:String([8,5,3,2,1][Math.min(i,4)]),done:false});
 editedSet=i;persist(c);sync();
}
function selectFirst(){
 const c=context();if(!c)return;const w=warmFor(c,false);
 if(!w?.sets?.length)return;editedSet=0;sync();
}
function removeWarmup(){
 const c=context();if(!c)return;const w=warmFor(c,false),i=currentEditor(c);
 if(!w||i<0||!w.sets[i])return;
 w.sets.splice(i,1);editedSet=-1;persist(c);sync();
}
function changeInput(field,value){
 const c=context();if(!c)return;const w=warmFor(c,false),i=currentEditor(c);
 if(i<0||!w?.sets?.[i])return;
 w.sets[i][field]=String(value).slice(0,10);
 w.sets[i].setType='warmup';persist(c);
}
function completeWarmup(){
 const c=context();if(!c)return;const w=warmFor(c,false),i=currentEditor(c);
 if(i<0||!w?.sets?.[i])return;
 const kg=$('forgeV91WarmKg'),reps=$('forgeV91WarmReps'),error=$('forgeV91WarmError');
 const k=kg?.value.trim()||'',r=reps?.value.trim()||'';
 if(k!==''&&(!Number.isFinite(Number(k))||Number(k)<0)||!Number.isInteger(Number(r))||Number(r)<1||Number(r)>999){
  if(error)error.textContent='Gewicht ab 0 kg und 1–999 Wiederholungen eintragen.';return;
 }
 const alreadyDone=!!w.sets[i].done;
 Object.assign(w.sets[i],{setType:'warmup',kg:k,reps:r,done:true});
 editedSet=-1;persist(c);
 if(!alreadyDone&&typeof window.forge130StartRest==='function')window.forge130StartRest();
 sync();
}
function build(){
 const panel=$('forgePremiumShell')?.querySelector('.forge-b-set-panel');
 if(!panel)return null;
 let root=$('forgeV91Warm');
 if(root?.parentElement===panel)return root;
 if(root)root.remove();
 root=document.createElement('div');root.id='forgeV91Warm';
 root.innerHTML='<div class="forge-v91-warm-bar"><span class="forge-v91-warm-caption" id="forgeV91WarmCaption">Aufwärmen</span><div class="forge-v91-warm-tools"><button type="button" id="forgeV91WarmEdit">Bearbeiten</button><button type="button" id="forgeV91WarmAdd">+ Aufwärmsatz</button></div></div><div id="forgeV91WarmForm" hidden><div class="forge-v91-warm-fields"><label>Gewicht · kg<input id="forgeV91WarmKg" type="number" inputmode="decimal" min="0" step="0.5" aria-label="Aufwärmsatz Gewicht"></label><label>Wiederholungen<input id="forgeV91WarmReps" type="number" inputmode="numeric" min="1" max="999" step="1" aria-label="Aufwärmsatz Wiederholungen"></label></div><div class="forge-v91-warm-bottom"><button type="button" id="forgeV91WarmRemove" aria-label="Diesen Aufwärmsatz entfernen">✕</button><button type="button" id="forgeV91WarmDone">✓ Aufwärmsatz abschließen</button></div><div class="forge-v91-warm-feedback" id="forgeV91WarmError" aria-live="polite"></div></div>';
 panel.prepend(root);
 $('forgeV91WarmAdd').addEventListener('click',addWarmup);
 $('forgeV91WarmEdit').addEventListener('click',selectFirst);
 $('forgeV91WarmRemove').addEventListener('click',removeWarmup);
 $('forgeV91WarmDone').addEventListener('click',completeWarmup);
 $('forgeV91WarmKg').addEventListener('input',e=>changeInput('kg',e.target.value));
 $('forgeV91WarmReps').addEventListener('input',e=>changeInput('reps',e.target.value));
 lastKey='';return root;
}
function sync(){
 installStyle();
 const shell=$('forgePremiumShell'),c=context();
 if(!shell||!c||!shell.classList.contains('forge-v8-instruments'))return;
 const root=build();if(!root)return;
 const w=warmFor(c,false),sets=w?.mode==='sets'?w.sets:[];
 let normalized=false;
 for(const s of sets)if(s&&s.setType!=='warmup'){s.setType='warmup';normalized=true;}
 if(normalized)persist(c);
 const i=currentEditor(c),active=i>=0;
 const key=c.plan.id+'|'+c.focus.i+'|'+i+'|'+sets.length;
 const form=$('forgeV91WarmForm'),caption=$('forgeV91WarmCaption');
 root.hidden=false;form.hidden=!active;
 shell.classList.toggle('forge-v91-warming',active);
 $('forgeV91WarmEdit').hidden=!sets.length||active;
 $('forgeV91WarmAdd').disabled=sets.length>=8;
 caption.textContent=active?'🔥 Aufwärmsatz '+(i+1)+' / '+sets.length:sets.length?'✓ '+sets.filter(s=>s.done).length+' / '+sets.length+' Aufwärmsätze':'Optional · vor dem ersten Arbeitssatz';
 if(active){
  const set=sets[i],weight=$('forgeV91WarmKg'),reps=$('forgeV91WarmReps');
  if(lastKey!==key||lastContext!==c.draft){
   if(document.activeElement!==weight)weight.value=String(set.kg??'');
   if(document.activeElement!==reps)reps.value=String(set.reps??'');
   $('forgeV91WarmError').textContent='';
  }
  $('forgeV91WarmDone').textContent=set.done?'✓ Änderungen übernehmen':'✓ Aufwärmsatz abschließen';
 }
 lastKey=key;lastContext=c.draft;
}
function boot(){
 installStyle();
 sync();
 setInterval(sync,400);
 window.addEventListener?.('pageshow',sync);
}
window.ForgeV91Live=Object.freeze({sync,context,warmFor});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
