/* FORGE session recovery and clock stability.
 * A plan may be edited or replaced while its old session is still active.
 * Preserve completed DOM sets, re-link the draft, and never silently discard a workout.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const same=(a,b)=>String(a)===String(b);
const norm=v=>String(v||'').trim().toLocaleLowerCase();
function visibleSets(root){
 const result=[];
 if(!root||!root.querySelectorAll)return result;
 root.querySelectorAll('details.forge-exercise[data-forge-ex]').forEach(card=>{
  const i=Number(card.dataset.forgeEx);
  if(!Number.isInteger(i)||i<0||i>200)return;
  const name=card.querySelector('.forge-exercise-title b')?.textContent?.trim()||'';
  const sets=[];
  card.querySelectorAll('.forge-set-row').forEach((row,j)=>{
   const q=field=>row.querySelector('[data-field="'+field+'"]');
   const done=q('done'),reps=q('reps'),kg=q('kg');
   if(!done||!reps)return;
   const index=Number(done.dataset.set);
   const k=Number.isInteger(index)&&index>=0&&index<100?index:j;
   sets[k]={kg:kg?.value??'',reps:reps.value??'',done:!!done.checked};
  });
  result[i]={name,sets};
 });
 return result;
}
function namesMatch(plan,exerciseRows){
 if(!plan||!Array.isArray(plan.ex)||!exerciseRows?.length)return false;
 if(plan.ex.length!==exerciseRows.length)return false;
 return plan.ex.every((ex,i)=>norm(exerciseRows[i]?.name)===norm(ex.name));
}
function draftMatches(plan,draft){
 return !!draft?.exercises?.length&&namesMatch(plan,draft.exercises);
}
function restorePlan(s,rows,selection){
 const active=s?.activeWorkout;
 if(!active||!Array.isArray(s.plan))return {changed:false,plan:null};
 let changed=false,restored=false;
 let plan=s.plan.find(p=>same(p.id,active.planId));
 const draft=s.workoutDraft;
 if(!plan){
  const evidence=draft?.exercises?.length?draft.exercises:rows.filter(Boolean);
  const possibles=s.plan.filter(p=>draftMatches(p,draft)||namesMatch(p,rows));
  const chosen=possibles.find(p=>same(p.id,draft?.planId))||
    (possibles.length===1?possibles[0]:null);
  if(chosen)plan=chosen;
  else if(evidence.length){
   const id=active.planId||draft?.planId||('forge-rescue-'+Date.now());
   const ex=evidence.map((item,i)=>({
    name:String(item.name||'Übung '+(i+1)),
    sets:Math.max(1,item.sets?.length||0,rows[i]?.sets?.length||0),
    reps:Math.max(1,Number(item.sets?.find(x=>Number(x?.reps)>0)?.reps)||10),
    unit:'reps'
   }));
   plan={id,title:String(active.title||'Wiederhergestellte Trainingseinheit'),
    location:'gym',weekday:null,ex,forgeRecovered:true};
   s.plan.push(plan);restored=true;changed=true;
  }
  if(plan&&!same(active.planId,plan.id)){
   const previous=active.planId;active.planId=plan.id;changed=true;
   if(s.forgeTimeSession&&same(s.forgeTimeSession.planId,previous)){
    s.forgeTimeSession.planId=plan.id;
   }
  }
 }
 if(!plan)return {changed,plan:null,restored};
 if(s.workoutDraft&&!same(s.workoutDraft.planId,plan.id)){
  if(draftMatches(plan,s.workoutDraft)){
   s.workoutDraft.planId=plan.id;changed=true;
  }else if(namesMatch(plan,rows)){
   // A different archived draft is never destroyed when a new session is recovered.
   if(!s.forgeRecoveryPreviousDraft)s.forgeRecoveryPreviousDraft=s.workoutDraft;
   s.workoutDraft=null;changed=true;
  }
 }
 if(s.workoutDraft==null&&namesMatch(plan,rows)){
  s.workoutDraft={planId:plan.id,updatedAt:new Date().toISOString(),
   exercises:plan.ex.map((ex,i)=>({name:rows[i].name||ex.name,sets:[]})),
   swapUndo:{},order:null,
   warmup:{general:{type:'none',minutes:5,done:false},exercises:{}}};
  changed=true;
 }
 return {changed,plan,restored};
}
function mergeVisible(s,plan,rows){
 if(!plan||!rows?.length||!Array.isArray(s?.workoutDraft?.exercises)||
    !same(s.workoutDraft.planId,plan.id))return false;
 const draft=s.workoutDraft;
 let changed=false;
 plan.ex.forEach((ex,i)=>{
  const seen=rows[i],prior=draft.exercises[i];
  if(!seen||!prior||!seen.sets.length)return;
  // Never apply fields from a different exercise or reordered view.
  if(norm(seen.name)!==norm(prior.name||ex.name))return;
  if(!Array.isArray(prior.sets)){prior.sets=[];changed=true}
  seen.sets.forEach((entry,j)=>{
   if(!entry)return;
   const previous=prior.sets[j]||{};
   const next={kg:entry.kg,reps:entry.reps,done:entry.done};
   if(String(previous.kg??'')!==String(next.kg)||
      String(previous.reps??'')!==String(next.reps)||
      !!previous.done!==next.done){
    prior.sets[j]=next;changed=true;
   }
  });
 });
 if(changed)draft.updatedAt=new Date().toISOString();
 return changed;
}
function syncSession(forceRender=false){
 if(typeof state==='undefined'||!state.activeWorkout)return false;
 const root=$('workoutExercises'),rows=visibleSets(root);
 const restored=restorePlan(state,rows,$('workoutSelect')?.value);
 if(!restored.plan)return false;
 const updated=mergeVisible(state,restored.plan,rows);
 if(restored.changed||updated){
  if(typeof save==='function')save();
 }
 if(restored.changed||forceRender){
  const select=$('workoutSelect');
  if(select&&state.plan.some(p=>same(p.id,restored.plan.id)))select.value=restored.plan.id;
  // Only rebuild exercise cards after a genuine broken-plan repair, never
  // during normal set entry (which would close the Android keyboard).
  if(restored.changed&&typeof renderWorkout==='function')renderWorkout();
 }
 const button=$('saveWorkout');
 if(button&&state.plan.some(p=>same(p.id,state.activeWorkout.planId)))button.disabled=false;
 return true;
}
function installClockFix(){
 if($('forgeSessionStabilityStyle'))return;
 const st=document.createElement('style');
 st.id='forgeSessionStabilityStyle';
 st.textContent=[
  '#workout .forge-clock{position:relative!important;top:auto!important;bottom:auto!important;left:auto!important;right:auto!important;transform:none!important;z-index:auto!important;float:none!important;}',
  '#workout .forge-clock .forge-clock-label,#workout .forge-clock #workoutTimer{position:static!important;transform:none!important;min-height:1.2em}',
  '#workout .forge-clock .forge-clock-digits{position:static!important;transform:none!important;font-variant-numeric:tabular-nums!important;font-feature-settings:"tnum" 1!important;white-space:nowrap!important;min-width:8ch;letter-spacing:0!important;}',
  '#workout.forge-slim-active .forge-clock{overflow:visible!important;min-height:66px;}'
 ].join('\n');
 document.head.append(st);
}
function boot(){
 installClockFix();
 syncSession();
 const old=window.finishWorkout;
 if(typeof old==='function'&&!old.forgeSessionGuard){
  const guarded=function(){
   syncSession();
   return old.apply(this,arguments);
  };
  guarded.forgeSessionGuard=true;
  window.finishWorkout=guarded;
 }
 document.addEventListener('change',e=>{
  if(e.target?.matches?.('#workoutExercises [data-field="done"]'))syncSession();
 },false);
}
window.ForgeSessionStability=Object.freeze({visibleSets,namesMatch,draftMatches,restorePlan,mergeVisible,syncSession});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();