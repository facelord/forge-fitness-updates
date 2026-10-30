/* FORGE 14.13: edit saved strength workouts, and make exercise order visible in-session.
 * No data migration. Saved-workout edits preserve ids/date/durations and all unrelated records.
 * Existing forge142Order / forge142MoveRelative own identity-safe session ordering.
 */
(function(){
 'use strict';
 const $=(q,root=document)=>root.querySelector(q);
 const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
 const cssId='forgeHistoryAndOrderStyle';
 let editing=null, overlay=null, observedHistory=null, observedExercises=null;
 const validNumber=(v,kind)=>{
   const s=String(v??'').trim().replace(',','.');
   if(s==='')return null;
   const n=Number(s),max=kind==='kg'?2000:kind==='sec'?3600:999;
   if(!Number.isFinite(n)||n<=(kind==='kg'?-1:0)||n>max)return null;
   if(kind!=='kg'&&!Number.isInteger(n))return null;
   if(kind==='kg'&&!/^\d+(?:\.\d{1,2})?$/.test(s))return null;
   return n;
 };
 function isTimed(e){return e.unit==='sec'||e.unit==='seconds'||e.unit==='time';}
 function move(order,i,offset){
   if(!Array.isArray(order)||!order.every(Number.isInteger)||new Set(order).size!==order.length)return null;
   const at=order.indexOf(i),target=at+offset;
   if(at<0||target<0||target>=order.length)return null;
   const next=order.slice();next.splice(at,1);next.splice(target,0,i);
   return next;
 }
 function replaceWorkout(workouts,id,entries){
   if(!Array.isArray(workouts)||typeof id!=='string'||!Array.isArray(entries))return null;
   const idx=workouts.findIndex(w=>String(w.id)===id);
   if(idx<0)return null;
   const next=workouts.slice();
   const w=next[idx];
   next[idx]={...w,entries:entries.map(e=>({...e,sets:e.sets.map(set=>({...set}))}))};
   return next;
 }
 window.ForgeWorkoutEdits={validNumber,move,replaceWorkout};
 function el(tag,cls,text){
   const node=document.createElement(tag);if(cls)node.className=cls;
   if(text!==undefined)node.textContent=text;
   return node;
 }
 function button(text,onClick,cls){
   const node=el('button',cls||'btn alt small',text);node.type='button';
   node.addEventListener('click',onClick);return node;
 }
 function styles(){
   if($('#'+cssId))return;
   const s=el('style');s.id=cssId;s.textContent=[
     '#workout .forge-edit-history-btn{min-height:42px;white-space:nowrap}',
     '#workout .forge-history-entry-top{gap:10px;flex-wrap:wrap}',
     '#workout .forge-history-entry-top .forge-history-quick-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-left:auto}',
     '#workout .forge-quick-reorder{display:inline-flex;gap:5px;align-items:center;flex-shrink:0;margin:0 8px 0 auto}',
     '#workout .forge-quick-reorder button{border:1px solid #536d5f;border-radius:9px;background:#1e3737;color:#d9fac4;min-width:38px;min-height:40px;padding:4px 8px;font-size:19px;line-height:1;cursor:pointer}',
     '#workout .forge-quick-reorder button:disabled{opacity:.28;cursor:default}',
     '#workout .forge-quick-reorder button:focus-visible,.forge-edit-dialog button:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
     '#workout .forge-exercise > summary .forge-exercise-chevron{margin-left:0}',
     '.forge-edit-overlay{position:fixed;inset:0;z-index:99997;background:#020a0ddd;display:grid;place-items:center;padding:12px}',
     '.forge-edit-dialog{box-sizing:border-box;width:min(100%,620px);max-height:92dvh;overflow:auto;background:#14242c;color:#e9f4eb;border:1px solid #567365;border-radius:18px;padding:17px;box-shadow:0 20px 65px #000b}',
     '.forge-edit-dialog h2{margin:0 0 6px;font-size:19px;color:#f0f9ed}',
     '.forge-edit-dialog .forge-edit-desc{margin:0 0 14px;color:#bbcac5;font-size:12px;line-height:1.5}',
     '.forge-edit-dialog .forge-edit-exercise{border-top:1px solid #3b514e;padding:15px 0 12px}',
     '.forge-edit-dialog .forge-edit-name{font-size:15px;display:block;margin-bottom:10px}',
     '.forge-edit-dialog .forge-edit-row{display:grid;grid-template-columns:35px minmax(0,1fr) minmax(0,1fr) 38px;gap:7px;align-items:end;margin:9px 0}',
     '.forge-edit-dialog label{min-width:0;font-size:12px;color:#d6e5db;display:grid;gap:6px}',
     '.forge-edit-dialog input{box-sizing:border-box;width:100%;min-width:0;min-height:43px;background:#0e2028;color:#f0f6ef;border:1px solid #4a6661;border-radius:8px;padding:8px 9px;font-size:15px}',
     '.forge-edit-dialog .forge-edit-row-number{align-self:center;font-size:13px;color:#a9cbb7}',
     '.forge-edit-dialog button{min-height:42px;white-space:normal}',
     '.forge-edit-dialog .forge-edit-remove{width:38px;min-height:43px;background:#46262c;border:1px solid #9b5f67;color:#ffdee1;border-radius:9px}',
     '.forge-edit-dialog .forge-edit-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:15px;border-top:1px solid #3a514d;padding-top:16px}',
     '.forge-edit-dialog .forge-edit-actions button{flex:1 1 100px}',
     '.forge-edit-dialog .forge-edit-error{color:#ffb7b7;font-size:13px;min-height:18px;margin:8px 0}',
     '.forge-edit-dialog .forge-edit-add{border:1px solid #456854;background:#253a38;color:#d3f5cc;border-radius:9px;padding:8px 11px;font-size:12px}',
     '@media(max-width:360px){.forge-edit-dialog{padding:12px}.forge-edit-dialog .forge-edit-row{grid-template-columns:22px minmax(0,1fr) minmax(0,1fr) 32px;gap:4px}.forge-edit-dialog .forge-edit-remove{width:32px}}'
   ].join('');document.head.append(s);
 }
 function close(){
   if(!overlay)return;overlay.remove();overlay=null;editing=null;
 }
 function draftFrom(w){
   return structuredClone((Array.isArray(w.entries)?w.entries:[]).map(e=>({
     ...e,sets:(Array.isArray(e.sets)?e.sets:[]).map(set=>({...set,kg:String(set.kg??0),reps:String(set.reps??'')}))
   })));
 }
 function field(labelText,value,onInput,max){
   const label=el('label','',labelText);
   const input=el('input');input.type='number';input.inputMode='decimal';
   input.min=labelText.startsWith('kg')?'0':'1';input.max=String(max);
   input.step=labelText.startsWith('kg')?'0.01':'1';
   input.value=String(value??'');input.addEventListener('input',()=>onInput(input.value));
   label.append(input);return label;
 }
 function openEditor(id){
   if(typeof state==='undefined'||!Array.isArray(state.workouts))return;
   const w=state.workouts.find(x=>String(x.id)===String(id));if(!w)return;
   close();editing={id:String(id),original:w,entries:draftFrom(w)};
   overlay=el('div','forge-edit-overlay');overlay.setAttribute('role','presentation');
   overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
   const panel=el('section','forge-edit-dialog');
   panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
   panel.setAttribute('aria-label','Abgeschlossenes Training bearbeiten');
   overlay.append(panel);document.body.append(overlay);
   renderEditor();
   const first=$('input',panel);first?.focus({preventScroll:true});
 }
 function renderEditor(){
   if(!overlay||!editing)return;
   const panel=$('.forge-edit-dialog',overlay);panel.replaceChildren();
   panel.append(el('h2','', 'Abgeschlossenes Training bearbeiten'));
   panel.append(el('p','forge-edit-desc','Gewichte, Wiederholungen und Sätze korrigieren. Änderungen werden erst mit „Speichern“ übernommen. Trainingsdatum und Plan bleiben erhalten.'));
   editing.entries.forEach((entry,ei)=>{
     const section=el('section','forge-edit-exercise');
     section.append(el('strong','forge-edit-name',entry.name||'Übung '+(ei+1)));
     const timed=isTimed(entry);
     (entry.sets||[]).forEach((set,si)=>{
       const row=el('div','forge-edit-row');
       row.append(el('span','forge-edit-row-number',String(si+1)+'.'));
       row.append(field('kg',set.kg,v=>{set.kg=v},2000));
       row.append(field(timed?'Sekunden':'Wdh.',set.reps,v=>{set.reps=v},timed?3600:999));
       const remove=button('✕',()=>{
         editing.entries[ei].sets.splice(si,1);renderEditor();
       },'forge-edit-remove');
       remove.setAttribute('aria-label','Satz '+(si+1)+' entfernen');
       row.append(remove);section.append(row);
     });
     section.append(button('＋ Satz hinzufügen',()=>{
       const last=entry.sets[entry.sets.length-1]||{kg:'0',reps:'10'};
       entry.sets.push({...last});renderEditor();
     },'forge-edit-add'));
     panel.append(section);
   });
   const error=el('p','forge-edit-error','');error.setAttribute('role','alert');panel.append(error);
   const actions=el('div','forge-edit-actions');
   actions.append(button('Abbrechen',close));
   actions.append(button('Änderungen speichern',saveEdit,'btn'));
   panel.append(actions);
 }
 function saveEdit(){
   if(!editing)return;
   const bad=$('.forge-edit-error',overlay);
   const prepared=editing.entries.map(e=>({...e,sets:e.sets.map(x=>({...x}))}));
   let count=0;
   for(let i=0;i<prepared.length;i++){
     const e=prepared[i];
     for(let j=0;j<e.sets.length;j++){
       const set=e.sets[j],kg=validNumber(set.kg,'kg'),reps=validNumber(set.reps,isTimed(e)?'sec':'reps');
       if(kg===null||reps===null){bad.textContent='Bitte gültige Werte für '+(e.name||'Übung')+', Satz '+(j+1)+' eingeben (kg 0–2000; Wiederholungen 1–999 oder Sekunden 1–3600).';return;}
       set.kg=kg;set.reps=reps;count++;
     }
   }
   if(!count){bad.textContent='Mindestens ein gültiger Satz muss im Training bleiben.';return;}
   const next=replaceWorkout(state.workouts,editing.id,prepared);
   if(!next){bad.textContent='Das Training wurde inzwischen verändert. Bitte erneut öffnen.';return;}
   // Never overwrite newer state and never persist half-filled fields.
   const latest=state.workouts.find(w=>String(w.id)===editing.id);
   if(latest!==editing.original){bad.textContent='Dieses Training wurde inzwischen verändert. Bitte erneut öffnen.';return;}
   state.workouts=next;
   if(state.lastSaveUndo?.workoutId===editing.id)state.lastSaveUndo=null;
   save();close();
   render(); // All history, progression, PRs and dashboards compute from corrected entries.
   const history=$('#forgeWorkoutHistoryPanel');if(history)history.open=true;
   decorateHistory();
 }
 function decorateHistory(){
   const root=$('#forgeWorkoutHistoryList');if(!root)return;
   const workouts=Array.isArray(state?.workouts)?state.workouts.slice().reverse():[];
   $$('.forge-history-entry',root).forEach((entry,index)=>{
     const workout=workouts[index];
     if(!workout||$('.forge-edit-history-btn',entry))return;
     const top=$('.forge-history-entry-top',entry),del=$('[data-forge-history-delete]',top||entry);
     if(!top||!del)return;
     const actions=el('div','forge-history-quick-actions');
     const edit=button('✎ Bearbeiten',()=>openEditor(workout.id),'btn alt small forge-edit-history-btn');
     edit.setAttribute('aria-label','Gespeichertes Training '+(workout.title||'')+' bearbeiten');
     del.before(actions);actions.append(edit,del);
   });
 }
 function decorateOrder(){
   const container=$('#workoutExercises');if(!container)return;
   const p=state?.plan?.find(x=>x.id===($('#workoutSelect')?.value));
   if(!p||!state.activeWorkout||state.activeWorkout.planId!==p.id)return;
   if(typeof window.forge142Order!=='function'||typeof window.forge142MoveRelative!=='function')return;
   const order=window.forge142Order(p);
   $$('.forge-exercise[data-forge-ex]',container).forEach(details=>{
     if($('.forge-quick-reorder',details))return;
     const i=Number(details.dataset.forgeEx),pos=order.indexOf(i);
     const summary=$(':scope > summary',details);
     if(pos<0||!summary||order.length<2)return;
     const tools=el('span','forge-quick-reorder');
     const up=button('↑',event=>{
       event.preventDefault();event.stopPropagation();
       const scope=$('#forge142OrderScope');if(scope)scope.value='session';
       window.forge142MoveRelative(i,-1);
     },'');
     up.setAttribute('aria-label','Übung '+(pos+1)+' nach oben verschieben – nur dieses Training');
     up.title='Im aktuellen Training nach oben';up.disabled=pos===0;
     const down=button('↓',event=>{
       event.preventDefault();event.stopPropagation();
       const scope=$('#forge142OrderScope');if(scope)scope.value='session';
       window.forge142MoveRelative(i,1);
     },'');
     down.setAttribute('aria-label','Übung '+(pos+1)+' nach unten verschieben – nur dieses Training');
     down.title='Im aktuellen Training nach unten';down.disabled=pos===order.length-1;
     tools.append(up,down);
     const arrow=$('.forge-exercise-chevron',summary);
     if(arrow)arrow.before(tools);else summary.append(tools);
   });
 }
 function boot(){
   styles();decorateHistory();decorateOrder();
   const hist=$('#forgeWorkoutHistoryList');
   if(hist&&!observedHistory){
     observedHistory=new MutationObserver(decorateHistory);
     observedHistory.observe(hist,{childList:true});
   }
   const ex=$('#workoutExercises');
   if(ex&&!observedExercises){
     observedExercises=new MutationObserver(decorateOrder);
     observedExercises.observe(ex,{childList:true});
   }
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay)close();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();