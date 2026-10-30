/* FORGE Live Focus – net workout timer and simplified in-session UI.
 * Additive UI, existing workout-set/save/undo systems remain authoritative.
 * Active pause state is serialized inside state.activeWorkout for reload safety.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const make=(tag,className,content)=>{
 const n=document.createElement(tag);
 if(className)n.className=className;
 if(content!==undefined)n.textContent=content;
 return n;
};
function netMs(a,now=Date.now()){
 if(!a||!Number.isFinite(Number(a.startedAt)))return 0;
 const at=a.forgePausedAt?Math.min(now,Number(a.forgePausedAt)):now;
 return Math.max(0,at-Number(a.startedAt)-Math.max(0,Number(a.forgeTotalPausedMs)||0));
}
function mobilityMs(session,now=Date.now()){
 if(!session)return 0;
 const linked=session.linked&&typeof state!=='undefined'&&state.activeWorkout&&session.workoutPlanId===state.activeWorkout.planId;
 const at=linked&&state.activeWorkout.forgePausedAt?Math.min(now,state.activeWorkout.forgePausedAt):now;
 return Math.max(0,at-(Number(session.startedAt)||at));
}
window.forgeWorkoutNetMs=netMs;
window.forgeMobilityNetMs=mobilityMs;
window.ForgeWorkoutFocusMath=Object.freeze({netMs,mobilityMs});
let ready=false,rendering=false,previousSession=null,refreshInterval=null;
function paused(){return !!state?.activeWorkout?.forgePausedAt;}
function stopOrResume(){
 const a=state?.activeWorkout;
 if(!a)return;
 const now=Date.now();
 if(!a.forgePausedAt){
  a.forgePausedAt=now;
  // Timed exercise countdown and linked mobility use their paused timestamp for
  // all automatic tick calculations. Rest displays freeze at this timestamp.
 }else{
  const delta=Math.max(0,now-Number(a.forgePausedAt));
  a.forgeTotalPausedMs=Math.max(0,Number(a.forgeTotalPausedMs)||0)+delta;
  a.forgePausedAt=null;
  if(state.forgeRest&&Number.isFinite(Number(state.forgeRest.endAt))){
   state.forgeRest.endAt+=delta;
  }
  if(state.forgeTimeSession?.running&&Number.isFinite(Number(state.forgeTimeSession.startedAt))){
   state.forgeTimeSession.startedAt+=delta;
  }
  if(state.activeMobilityVideo?.linked&&state.activeMobilityVideo.workoutPlanId===a.planId){
   state.activeMobilityVideo.startedAt+=delta;
  }
 }
 save();
 if(typeof window.updateWorkoutClock==='function')window.updateWorkoutClock();
 if(typeof window.forge130RenderRest==='function')window.forge130RenderRest();
 if(typeof window.forgeTimeRender==='function')window.forgeTimeRender();
 renderLive();
}
window.forgeToggleWorkoutPause=stopOrResume;
function ensureUi(){
 const live=$('workoutDigitalClock')?.closest('.forge-clock');
 const quick=$('forgeQuickWorkout'),rest=$('forgeRestTimer'),all=$('workoutExercises')?.closest('details.forge-workout-all');
 if(!live||!quick||!rest||!all)return false;
 if(!$('forgeLiveControls')){
  const controls=make('div','forge-live-controls');controls.id='forgeLiveControls';
  controls.append(make('div','forge-live-state',''));
  const row=make('div','forge-live-buttons');
  const pause=make('button','btn forge-live-pause','⏸ Pause');pause.id='forgeLivePause';pause.type='button';
  pause.addEventListener('click',stopOrResume);
  const progress=make('span','forge-live-progress','');
  progress.id='forgeLiveProgress';
  row.append(pause,progress);controls.append(row);
  live.after(controls);
 }
 const controls=$('forgeLiveControls');
 if(quick.previousElementSibling!==controls)controls.after(quick);
 if(rest.previousElementSibling!==quick)quick.after(rest);
 if(!$('forgeLiveNext')){
  const next=make('div','forge-live-next');next.id='forgeLiveNext';
  rest.after(next);
 }
 if(!$('forgeLiveOptions')){
  const options=make('details','forge-live-options');options.id='forgeLiveOptions';
  const summary=make('summary','','⚙ Weitere Einstellungen & Aufwärmen');
  const body=make('div','forge-live-options-body');
  const order=$('forge142OrderPanel'),warm=$('forge140WarmupPanel');
  if(order)body.append(order);
  if(warm)body.append(warm);
  const settings=make('div','forge-live-rest-settings');
  const title=make('strong','','Automatischer Satzpausentimer');
  const check=make('input');check.type='checkbox';check.id='forgeLiveRestEnabled';
  const label=make('label','','Timer aktiv');label.prepend(check);
  const select=make('select');select.id='forgeLiveRestSeconds';
  [45,60,90,120,180].forEach(n=>{const option=make('option','',n+' Sek.');option.value=String(n);select.append(option)});
  check.addEventListener('change',()=>window.forge130SetRestEnabled?.(check.checked));
  select.addEventListener('change',()=>window.forge130SetRestDuration?.(select.value));
  settings.append(title,label,select);body.append(settings);
  options.append(summary,body);
  all.after(options);
 }
 return true;
}
function sessionId(){
 const a=state?.activeWorkout;
 return a?String(a.planId)+':'+String(a.startedAt):null;
}
function progressFor(p){
 const draft=state.workoutDraft?.planId===p?.id?state.workoutDraft:null;
 let total=0,done=0;
 for(let i=0;i<(p?.ex?.length||0);i++){
  const count=Math.max(0,Number(p.ex[i].sets)||0);
  total+=count;
  for(let j=0;j<count;j++)if(draft?.exercises?.[i]?.sets?.[j]?.done)done++;
 }
 return {total,done};
}
function drawNext(p){
 const root=$('forgeLiveNext');if(!root)return;
 root.replaceChildren();
 const draft=state.workoutDraft?.planId===p?.id?state.workoutDraft:null;
 if(!p||!draft)return;
 const focus=typeof window.forge130CurrentFocus==='function'?window.forge130CurrentFocus(p):state.activeWorkout?.focus;
 const order=typeof window.forge142Order==='function'?window.forge142Order(p):p.ex.map((_,i)=>i);
 const names=[];
 for(const i of order){
  if(i===focus?.i)continue;
  const sets=draft.exercises?.[i]?.sets||[];
  if(sets.length&&sets.every(s=>s.done))continue;
  names.push(draft.exercises?.[i]?.name||p.ex[i]?.name||'Übung');
 }
 const heading=make('div','forge-live-next-title','Als Nächstes');
 root.append(heading);
 if(!names.length){root.append(make('p','muted','Weitere Übungen erledigt.'));return}
 names.slice(0,3).forEach((name,i)=>{
  const item=make('div','forge-live-next-item',String(i+1)+'. '+name);
  root.append(item);
 });
 if(names.length>3)root.append(make('small','', '＋ '+(names.length-3)+' weitere Übungen'));
}
function renderLive(){
 if(rendering||typeof state==='undefined')return;
 rendering=true;
 try{
  if(!ensureUi())return;
  const a=state.activeWorkout;
  document.body.classList.toggle('forge-session-live',!!a);
  const id=sessionId();
  const all=$('workoutExercises')?.closest('details.forge-workout-all');
  if(id!==previousSession){
   previousSession=id;
   if(id&&all)all.open=false;
   const options=$('forgeLiveOptions');if(options)options.open=false;
  }
  if(!a)return;
  const p=state.plan?.find(x=>x.id===a.planId);
  const info=$('forgeLiveControls')?.querySelector('.forge-live-state');
  if(info)info.textContent=(p?.title||'Krafttraining')+' · '+(paused()?'⏸ Pausiert':'● Aktiv');
  const b=$('forgeLivePause');
  if(b){b.textContent=paused()?'▶ Fortsetzen':'⏸ Training pausieren';b.setAttribute('aria-pressed',String(paused()));}
  const stat=progressFor(p),progress=$('forgeLiveProgress');
  if(progress)progress.textContent=stat.done+' / '+stat.total+' Sätze';
  const rest=$('forgeRestTimer');if(rest)rest.classList.toggle('forge-live-rest-running',!!state.forgeRest);
  const check=$('forgeLiveRestEnabled'),dur=$('forgeLiveRestSeconds');
  if(check)check.checked=state.forge130Settings?.restEnabled!==false;
  if(dur)dur.value=String(state.forge130Settings?.restSeconds||90);
  const clock=$('workoutTimer');
  if(clock)clock.textContent=paused()?'⏸ Trainingszeit angehalten':'● Netto-Trainingszeit';
  const digital=$('workoutDigitalClock');
  if(digital){
   const ms=netMs(a),s=Math.floor(ms/1000);
   digital.textContent=[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');
  }
  drawNext(p);
 }finally{rendering=false}
}
function styles(){
 if($('forgeLiveStyle'))return;
 const style=make('style');style.id='forgeLiveStyle';
 style.textContent=[
 '#workout .forge-live-controls{display:none}',
 'body.forge-session-live #workout .forge-live-controls{display:grid;gap:9px;margin:10px 0;padding:12px;background:#112b29;border:1px solid #5e966c;border-radius:14px}',
 'body.forge-session-live #workout .forge-live-state{font-size:13px;font-weight:750;color:#c9f8c3}',
 'body.forge-session-live #workout .forge-live-buttons{display:flex;gap:10px;align-items:center}',
 'body.forge-session-live #workout .forge-live-pause{flex:1;min-height:50px;background:#a8f55d;color:#112217;font-size:15px}',
 'body.forge-session-live #workout .forge-live-pause[aria-pressed=true]{background:#ffc878;color:#262017}',
 'body.forge-session-live #workout .forge-live-progress{font-size:12px;white-space:nowrap;color:#d7f0dc}',
 'body.forge-session-live #workout #workoutSelect,body.forge-session-live #workout #workoutSelect+*{display:none!important}',
 'body.forge-session-live #workout .forge-exercise-heading,body.forge-session-live #workout .forge-intro,body.forge-session-live #workout #forgeWorkoutDraftStatus{display:none!important}',
 'body.forge-session-live #workout .forge-polish-reorder-btn{display:none!important}',
 'body.forge-session-live #workout .forge-clock{margin:5px 0 8px!important;padding:12px!important}',
 'body.forge-session-live #workout .forge-clock-digits{font-size:clamp(35px,9vw,55px)!important}',
 'body.forge-session-live #workout #forgeQuickWorkout{margin:9px 0!important;min-height:0}',
 'body.forge-session-live #workout #forgeRestTimer:not(.forge-live-rest-running){display:none!important}',
 'body.forge-session-live #workout #forgeRestTimer.forge-live-rest-running{margin:10px 0!important}',
 'body.forge-session-live #workout .forge-workout-all{margin-top:12px!important}',
 'body.forge-session-live #workout .forge-workout-all>summary{padding:12px 4px!important;font-size:13px!important}',
 'body.forge-session-live #workout #saveWorkout{font-size:13px;min-height:44px!important;background:#273b3b!important;color:#e6f1e9!important;border:1px solid #63846c!important;margin:14px 0 4px}',
 '#workout .forge-live-options{margin:12px 0;border-top:1px solid #40584e}',
 '#workout .forge-live-options>summary{cursor:pointer;list-style:none;padding:14px 3px;font-size:13px;color:#bad3c0;font-weight:700}',
 '#workout .forge-live-options-body{display:grid;gap:10px;padding:5px 0 11px}',
 '#workout .forge-live-rest-settings{display:flex;flex-wrap:wrap;align-items:center;gap:10px;background:#153034;padding:12px;border-radius:12px}',
 '#workout .forge-live-rest-settings strong{flex:1 1 100%;font-size:13px}',
 '#workout .forge-live-rest-settings label{display:flex;align-items:center;gap:7px;margin:0}',
 '#workout .forge-live-rest-settings input[type=checkbox]{width:22px;height:22px}',
 '#workout .forge-live-rest-settings select{width:auto;max-width:160px}',
 '#workout .forge-live-next{display:none}',
 'body.forge-session-live #workout .forge-live-next{display:grid;gap:7px;margin:10px 0 8px;padding:11px 12px;border:1px solid #3a5750;border-radius:12px;background:#132a30}',
 '#workout .forge-live-next-title{font-weight:760;color:#d8f5d8;font-size:13px}',
 '#workout .forge-live-next-item{font-size:12px;color:#d4e5d7;padding:3px 0}',
 '#workout .forge-live-next small{font-size:11px;color:#b3c6bb}',
 'body.forge-session-live #workout .forge-live-options{display:block}',
 'body.forge-session-live #workout .forge149-workout-section .forge150-workout-lead{padding-top:10px!important}',
 '@media(max-width:390px){body.forge-session-live #workout .forge-live-buttons{gap:6px}body.forge-session-live #workout .forge-live-progress{font-size:11px}}'
 ].join('');
 document.head.append(style);
}
function boot(){
 if(ready||typeof state==='undefined')return;
 if(!ensureUi())return;
 ready=true;styles();
 if(typeof window.renderWorkout==='function'){
  const prev=window.renderWorkout;
  window.renderWorkout=function(){const result=prev.apply(this,arguments);renderLive();return result};
 }
 if(typeof window.render==='function'){
  const prev=window.render;
  window.render=function(){const result=prev.apply(this,arguments);renderLive();return result};
 }
 renderLive();
 // Core's original setInterval keeps using its initial callback; the active
 // state overlay corrects the frozen clock without mutating the core timer.
 refreshInterval=setInterval(renderLive,350);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
