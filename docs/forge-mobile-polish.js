/* FORGE Mobile Polish 14.14 – lean pages, real weekly schedule and safe swipe navigation.
 * Purely additive UI. Existing plan, cadence, history, nutrition and workout engines retain ownership.
 * Additional appointments live in state.forgePolishExtras (JSON backup friendly).
 */
(function(){
'use strict';
const $=(id)=>document.getElementById(id);
const el=(tag,cls,text)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;return n;
};
const PAGES=['plan','workout','nutrition','progress'];
const WEEK=['Mo','Di','Mi','Do','Fr','Sa','So'];
const DAY=86400000;
const core=()=>window.ForgeCadenceCore;
function localISO(date=new Date()){
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function isoOrdinal(iso){
 if(core()?.toOrdinal)return core().toOrdinal(iso);
 const [y,m,d]=iso.split('-').map(Number);
 return Math.floor(Date.UTC(y,m-1,d)/DAY);
}
function ordinalISO(n){return new Date(n*DAY).toISOString().slice(0,10);}
function mondayOf(iso){
 const n=isoOrdinal(iso),weekday=(new Date(n*DAY).getUTCDay()+6)%7;
 return n-weekday;
}
function isoWeek(iso=localISO()){
 const start=mondayOf(iso);
 return WEEK.map((label,weekday)=>({weekday,label,date:ordinalISO(start+weekday)}));
}
const EXTRA_TYPES=['strength','custom','mobility','video'];
function extraType(x){return x?.type||'strength';}
function validExtra(x){
 if(!x||!['once','weekly'].includes(x.mode)||!EXTRA_TYPES.includes(extraType(x)))return false;
 if(extraType(x)==='strength')return typeof x.planId==='string'&&x.planId.length>0&&x.planId.length<=160;
 if(extraType(x)==='custom')return typeof x.title==='string'&&x.title.trim().length>0&&x.title.length<=100;
 if(extraType(x)==='mobility')return typeof x.title==='string'&&x.title.trim().length>0&&
  Array.isArray(x.ex)&&x.ex.length>0&&x.ex.length<=40;
 if(extraType(x)==='video')return typeof x.title==='string'&&x.title.trim().length>0&&
  typeof x.url==='string'&&safeVideoUrl(x.url)!==null;
 return false;
}
function normalizedExtras(raw,dates){
 const allowed=new Set(dates.map(d=>d.date)),next=[];
 if(!Array.isArray(raw))return next;
 for(const x of raw){
  if(!validExtra(x))continue;
  if(x.mode==='once'&&typeof x.date==='string'&&allowed.has(x.date))next.push({...x,type:extraType(x)});
  if(x.mode==='weekly'&&Number.isInteger(x.weekday)&&x.weekday>=0&&x.weekday<7)next.push({...x,type:extraType(x)});
 }
 return next;
}
function safeVideoUrl(raw){
 try{
  const url=new URL(String(raw||'').trim());
  return url.protocol==='https:'&&['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be','youtube-nocookie.com','www.youtube-nocookie.com'].includes(url.hostname)?
   url.href:null;
 }catch(_){return null;}
}
function makeExtra(base,detail){
 const type=extraType(detail);
 const extra={...base,...detail,type};
 return validExtra(extra)?extra:null;
}
function extraIdentity(x){
 if(extraType(x)==='strength')return 'strength:'+x.planId;
 if(extraType(x)==='video')return 'video:'+x.url;
 return extraType(x)+':'+String(x.title||'').trim().toLocaleLowerCase('de-DE');
}
function weekModel(plan,settings,rawExtras,iso=localISO(),weeklyMove={},mobilityDays=[],videoDays=[]){
 const days=isoWeek(iso),all=Array.isArray(plan)?plan:[];
 const interval=settings?.cadence?.mode==='interval'?settings.cadence:null;
 if(interval&&core()?.onDate){
  days.forEach(row=>{
   try{
    const entry=core().onDate(interval,row.date);
    row.primary=entry?all.find(x=>x.id===entry.planId)||null:null;
   }catch(_){row.primary=null;}
  });
 }else{
  days.forEach(row=>{
   row.primary=all.find(p=>Number(p.weekday)===row.weekday&&weeklyMove[p.id]===undefined)||
     all.find(p=>Number(weeklyMove[p.id])===row.weekday)||null;
   // A moved original must not appear twice.
   if(row.primary&&weeklyMove[row.primary.id]!==undefined&&Number(weeklyMove[row.primary.id])!==row.weekday)row.primary=null;
  });
 }
 const extras=normalizedExtras(rawExtras,days);
 days.forEach(row=>{
  row.extras=extras.filter(x=>(x.mode==='once'&&x.date===row.date)||(x.mode==='weekly'&&x.weekday===row.weekday))
   .map(x=>({...x,plan:x.type==='strength'?all.find(p=>String(p.id)===x.planId)||null:null}))
   .filter(x=>x.type!=='strength'||x.plan);
  row.mobility=mobilityDays.includes(row.weekday)||videoDays.includes(row.weekday);
  row.isRest=!row.primary&&!row.extras.length&&!row.mobility;
 });
 return days;
}
function swipeDirection(dx,dy,ms,blocked=false){
 if(blocked||ms>850||ms<40||Math.abs(dx)<78||Math.abs(dx)<1.7*Math.abs(dy))return 0;
 return dx<0?1:-1;
}
function exercisePreview(plan){
 const entries=Array.isArray(plan?.ex)?plan.ex:[];
 return entries.map((exercise,i)=>{
  const name=String(exercise?.name||'Übung '+(i+1));
  const count=Number(exercise?.sets);
  const sets=Number.isInteger(count)&&count>0?count:null;
  const reps=exercise?.reps==null?'':String(exercise.reps).trim();
  const isTime=['sec','seconds','time'].includes(exercise?.unit);
  const description=sets&&reps?sets+' × '+reps+(isTime?' Sek.':''):sets?sets+' Sätze':reps?reps+(isTime?' Sek.':' Wiederholungen'):'';
  return {name,description};
 });
}
window.ForgeMobilePolish=Object.freeze({PAGES,localISO,isoWeek,weekModel,normalizedExtras,swipeDirection,exercisePreview,safeVideoUrl,makeExtra,extraIdentity});
let restOpen=false,editorOpen=false,weekObserver=null,ready=false,swipeStart=null,rendering=false;
const expandedTrainingDays=new Set();
function activePlan(){
 return typeof state==='object'&&Array.isArray(state.plan)?state.plan:[];
}
function activeExtras(){
 return typeof state==='object'&&Array.isArray(state.forgePolishExtras)?state.forgePolishExtras:[];
}
function weekMoves(){
 if(typeof state!=='object')return {};
 const m=state.forgeWeekMoves;
 if(!m||typeof m.moves!=='object'||!m.week)return {};
 // Match the real engine's week key to avoid stale one-week moves.
 const now=isoWeek()[0].date;
 const activeKey=typeof window.forge130WeekKey==='function'?window.forge130WeekKey():null;
 return activeKey&&m.week!==activeKey?{}:m.moves;
}
function mobDays(){
 const m=state.mobility||{};
 const rest=m.enabled&&['rest','both'].includes(m.timing)?m.weekdays||[]:[];
 let videos=[];
 try{
  if(typeof window.videoAssignments==='function')videos=window.videoAssignments().map(x=>Number(x.day));
 }catch(_){}
 return {mobility:rest,videos};
}
function currentRows(){
 const m=mobDays();
 return weekModel(activePlan(),state.settings,activeExtras(),localISO(),weekMoves(),m.mobility,m.videos);
}
function readable(iso){
 const d=new Date(iso+'T12:00:00');
 return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
}
function safeText(s){return String(s||'').trim();}
function createBtn(text,handler,cls){
 const b=el('button',cls||'btn alt small',text);b.type='button';
 b.addEventListener('click',handler);return b;
}
function activatePlanEditor(mode){
 const toggle=$('forge159PlanToggle');
 if(toggle&&toggle.getAttribute('aria-expanded')==='false')toggle.click();
 if(mode&&typeof window.forgeOpenPlanEditor==='function')window.forgeOpenPlanEditor(mode);
 else $('forge150PlanHub')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function startPlanned(planId){
 const p=activePlan().find(x=>String(x.id)===String(planId));
 if(!p)return;
 if(typeof window.go==='function')window.go('workout');
 if(typeof window.startWorkout==='function')window.startWorkout(p.id);
}
function saveExtra(extra,editId=null){
 const clean=activeExtras().filter(x=>x&&typeof x==='object');
 if(clean.some(x=>x.id!==editId&&x.mode===extra.mode&&extraIdentity(x)===extraIdentity(extra)&&
   (x.mode==='once'?x.date===extra.date:x.weekday===extra.weekday))){
  return 'Diese Einheit ist für den Tag bereits eingetragen.';
 }
 const index=editId==null?-1:clean.findIndex(x=>x.id===editId);
 if(editId!=null&&index<0)return 'Dieser Termin existiert nicht mehr. Bitte erneut öffnen.';
 if(index>=0)clean[index]=extra;else clean.push(extra);
 state.forgePolishExtras=clean;
 save();renderCompact();renderExtraDashboard();return null;
}
function deleteExtra(id){
 const old=activeExtras(),next=old.filter(x=>x.id!==id);
 if(next.length===old.length)return;
 state.forgePolishExtras=next;save();renderCompact();renderExtraDashboard();
}
function optionsSelect(labelText,values){
 const field=el('label','',labelText),select=el('select');
 values.forEach(([value,title])=>{const opt=el('option','',title);opt.value=value;select.append(opt);});
 field.append(select);return {field,select};
}
function fieldInput(labelText,kind,value,placeholder){
 const field=el('label','',labelText),input=el(kind==='textarea'?'textarea':'input');
 if(kind!=='textarea')input.type=kind;
 input.value=value||'';input.placeholder=placeholder||'';
 field.append(input);return {field,input};
}
function knownRoutines(){
 const src=typeof MOB_ROUTINES!=='undefined'?MOB_ROUTINES:{};
 return Object.entries(src).filter(([key,r])=>r&&r.name&&Array.isArray(r.items));
}
function knownVideos(goal,mins){
 try{return typeof videoCandidates==='function'?videoCandidates(goal,mins):[];}catch(_){return [];}
}
function customMobilityNames(){
 return Array.isArray(window.forgeMobilitySingleCards?.names)?window.forgeMobilitySingleCards.names:[];
}
function routineExercises(key){
 const r=knownRoutines().find(([id])=>id===key)?.[1];
 return r?r.items.map(x=>({name:String(x[0]),seconds:Number(x[1])||60,note:String(x[2]||'')})):[];
}
function previewExtra(extra){
 if(extra.type==='strength')return extra.plan;
 return {title:(extra.type==='video'?'🎬 ':extra.type==='mobility'?'🧘 ':'✦ ')+extra.title,
  ex:extra.type==='mobility'?(extra.ex||[]).map(x=>({name:x.name,sets:1,reps:x.seconds,unit:'sec'})):
   extra.type==='custom'?(extra.ex||[]):[]};
}
function openExtraVideo(extra){
 const url=safeVideoUrl(extra?.url);
 if(!url)return alert('Dieser Video-Link ist nicht gültig.');
 const running=state.activeMobilityVideo;
 if(running&&running.forgeExtraId!==extra.id){
  alert('Es läuft bereits eine Mobilitäts- oder Videoeinheit. Bitte beende diese zuerst.');
  return;
 }
 if(!running){
  state.activeMobilityVideo={
   day:-1,goal:extra.goal||'full',mins:extra.mins||15,title:extra.title,url,
   verified:true,startedAt:Date.now(),linked:false,workoutPlanId:null,forgeExtraId:extra.id
  };
  save();
  if(typeof window.updateMobilityClock==='function')window.updateMobilityClock();
  if(typeof window.renderMobility==='function')window.renderMobility();
  renderCompact();
 }
 if(typeof window.ForgeAndroid?.openExternal==='function')window.ForgeAndroid.openExternal(url);
 else window.open(url,'_blank','noopener,noreferrer');
}
function completeExtra(id,date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 const extras=activeExtras(),entry=extras.find(x=>x.id===id);
 if(!entry)return;
 if(Array.isArray(entry.doneDates)&&entry.doneDates.includes(date))return;
 const copy=extras.map(x=>x.id===id?{...x,doneDates:[...new Set([...(x.doneDates||[]),date])].slice(-120)}:x);
 state.forgePolishExtras=copy;
 // This is a manually completed activity, not a recorded strength workout.
 save();renderCompact();renderExtraDashboard();
}
function addDialog(preferredDate,editId=null){
 const previous=$('forgePolishAddOverlay');if(previous)previous.remove();
 const plans=activePlan(),days=isoWeek(),editing=activeExtras().find(x=>x.id===editId)||null;
 const overlay=el('div','forge-polish-overlay');overlay.id='forgePolishAddOverlay';
 const dialog=el('section','forge-polish-dialog');dialog.setAttribute('role','dialog');
 dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Zusätzliche Einheit planen');
 const title=el('h3','',editing?'✎ Training ändern':'＋ Training einfügen');
 const hint=el('p','muted','Kraft, individuelle Aktivität, Mobilitätsroutine oder Video. Der bestehende Trainingsrhythmus bleibt unverändert.');
 const form=el('form');form.className='forge-polish-extra-form';
 const typeBlock=optionsSelect('Art der Einheit',[
  ['strength','🏋️ Bestehenden Kraftplan einfügen'],
  ['custom','✦ Individuelles Training / Aktivität'],
  ['mobility','🧘 Mobilitätsroutine'],
  ['video','🎬 Yoga-/Mobilitätsvideo']
 ]);
 if(!plans.length)typeBlock.select.querySelector('option[value="strength"]')?.remove();
 form.append(typeBlock.field);
 const specific=el('div','forge-polish-type-fields');form.append(specific);
 const dateBlock=optionsSelect('Tag',days.map(d=>[d.date,d.label+' · '+readable(d.date)]));
 dateBlock.select.value=editing?.mode==='once'?editing.date:(days.some(x=>x.date===preferredDate)?preferredDate:days[0].date);
 form.append(dateBlock.field);
 const repeat=optionsSelect('Wiederholung',[['once','Nur an diesem Datum'],['weekly','Jede Woche an diesem Wochentag']]);
 repeat.select.value=editing?.mode||'once';form.append(repeat.field);
 const error=el('p','forge-polish-error');error.setAttribute('role','alert');
 const actions=el('div','forge-polish-actions');
 const cancel=createBtn('Abbrechen',()=>overlay.remove());
 const submit=el('button','btn small',editing?'Änderung speichern':'Eintragen');submit.type='submit';
 actions.append(cancel,submit);form.append(error,actions);
 dialog.append(title,hint,form);overlay.append(dialog);document.body.append(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});

 let values={};
 function renderSpecific(){
  const kind=typeBlock.select.value;
  specific.replaceChildren();values={kind};
  if(kind==='strength'){
   const select=optionsSelect('Trainingseinheit',plans.map(p=>[String(p.id),safeText(p.title)||'Training']));
   select.select.value=editing?.planId||String(plans[0]?.id||'');
   specific.append(select.field);values.planSelect=select.select;return;
  }
  if(kind==='custom'){
   const name=fieldInput('Name der Einheit','text',editing?.type==='custom'?editing.title:'','z. B. Padel, Spaziergang, eigenes Krafttraining');
   name.input.maxLength=100;
   const duration=fieldInput('Dauer in Minuten (optional)','number',editing?.type==='custom'?String(editing.mins||''):'','z. B. 45');
   duration.input.min='1';duration.input.max='480';
   const exercises=fieldInput('Inhalt / Übungen (optional, eine pro Zeile)','textarea',
    editing?.type==='custom'?(editing.ex||[]).map(e=>e.name).join('\n'):'','z. B. Kniebeugen, Mobilisation oder freie Notizen');
   exercises.input.rows=3;exercises.input.maxLength=2500;
   specific.append(name.field,duration.field,exercises.field);
   values={kind,name:name.input,duration:duration.input,exercises:exercises.input};return;
  }
  if(kind==='mobility'){
   const templates=[...knownRoutines().map(([key,r])=>[key,r.name]),['custom','Eigene Routine zusammenstellen']];
   const routine=optionsSelect('Mobilitätsroutine',templates);
   routine.select.value=editing?.type==='mobility'?(editing.routineKey||'custom'):(templates[0]?.[0]||'custom');
   specific.append(routine.field);
   const custom=el('div','forge-polish-mob-builder');
   const name=fieldInput('Name deiner Routine','text',editing?.type==='mobility'?editing.title:'Meine Mobilität','z. B. Hüfte & Rücken');
   name.input.maxLength=100;
   const picker=optionsSelect('Übung aus dem Mobilitätskatalog',customMobilityNames().map(x=>[x,x]));
   const add=createBtn('＋ Übung hinzufügen',()=>appendMobExercise(picker.select.value),'btn alt small');
   const manual=fieldInput('Oder eigene Übung','text','','Name der Mobilitätsübung');
   manual.input.maxLength=100;
   const addOwn=createBtn('＋ Eigene Übung',()=>{const n=manual.input.value.trim();if(n){appendMobExercise(n);manual.input.value='';}},'btn alt small');
   const list=el('div','forge-polish-mob-exercises');
   function appendMobExercise(name,seconds=60){
    if(!name||list.children.length>=40)return;
    const row=el('div','forge-polish-mob-row');
    const input=el('input');input.type='text';input.value=name;input.maxLength=100;input.setAttribute('aria-label','Mobilitätsübung');
    const sec=el('input');sec.type='number';sec.min='10';sec.max='1800';sec.value=String(seconds);sec.setAttribute('aria-label','Dauer in Sekunden');
    const remove=createBtn('✕',()=>row.remove(),'btn alt small');remove.setAttribute('aria-label','Mobilitätsübung entfernen');
    row.append(input,sec,remove);list.append(row);
   }
   if(picker.select.options.length)custom.append(picker.field,add);
   custom.append(manual.field,addOwn,list);
   if(editing?.type==='mobility'&&editing.routineKey==='custom'){
    (editing.ex||[]).forEach(x=>appendMobExercise(x.name,x.seconds));
   }
   routine.select.addEventListener('change',()=>{custom.hidden=routine.select.value!=='custom';});
   custom.hidden=routine.select.value!=='custom';specific.append(custom,name.field);
   if(routine.select.value!=='custom'&&editing?.type!=='mobility')name.input.value=knownRoutines().find(([k])=>k===routine.select.value)?.[1]?.name||'Mobilität';
   routine.select.addEventListener('change',()=>{if(routine.select.value!=='custom')name.input.value=knownRoutines().find(([k])=>k===routine.select.value)?.[1]?.name||name.input.value;});
   values={kind,routine:routine.select,name:name.input,list};return;
  }
  if(kind==='video'){
   const goals=typeof MOB_GOAL_LABELS!=='undefined'?Object.entries(MOB_GOAL_LABELS):[['full','Ganzkörper'],['hips','Hüfte'],['upper','Schultern']];
   const goal=optionsSelect('Schwerpunkt',goals);
   const durations=typeof VIDEO_TIMES!=='undefined'?VIDEO_TIMES:[5,10,15,20,30];
   const duration=optionsSelect('Wunschdauer',durations.map(v=>[String(v),v+' Minuten']));
   goal.select.value=editing?.type==='video'?editing.goal||goals[0]?.[0]:goals[0]?.[0];
   duration.select.value=String(editing?.type==='video'?editing.mins||durations[0]:durations[0]);
   const choice=optionsSelect('Video auswählen',[]);
   const url=fieldInput('Eigener YouTube-Link','url',editing?.type==='video'&&editing.customUrl?editing.url:'','https://www.youtube.com/watch?v=…');
   const name=fieldInput('Eigener Videotitel','text',editing?.type==='video'&&editing.customUrl?editing.title:'','Titel des Videos');
   name.input.maxLength=100;
   const note=el('p','muted','Verifizierte Videos werden direkt geöffnet. Falls keines verfügbar ist, kannst du deinen eigenen YouTube-Link eintragen.');
   function refresh(){
    choice.select.replaceChildren();
    const candidates=knownVideos(goal.select.value,Number(duration.select.value));
    candidates.forEach((v,i)=>{
     if(!v?.verified)return;
     const op=el('option','',v.title+' · '+v.creator);op.value=String(i);choice.select.append(op);
    });
    const own=el('option','','Eigenen YouTube-Link einfügen');own.value='custom';choice.select.append(own);
    if(editing?.type==='video'&&editing.customUrl)choice.select.value='custom';
    else if(editing?.type==='video'&&editing.goal===goal.select.value&&Number(editing.mins)===Number(duration.select.value)&&
      candidates[Number(editing.choice)]?.verified)choice.select.value=String(editing.choice);
    else choice.select.value=choice.select.options[0]?.value||'custom';
    updateOwn();
   }
   function updateOwn(){
    const enabled=choice.select.value==='custom';
    url.field.hidden=!enabled;name.field.hidden=!enabled;
   }
   goal.select.addEventListener('change',refresh);duration.select.addEventListener('change',refresh);
   choice.select.addEventListener('change',updateOwn);
   specific.append(goal.field,duration.field,choice.field,note,url.field,name.field);
   values={kind,goal:goal.select,duration:duration.select,choice:choice.select,url:url.input,name:name.input};
   refresh();return;
  }
 }
 typeBlock.select.value=editing?.type||'strength';
 if(!plans.length&&typeBlock.select.value==='strength')typeBlock.select.value='mobility';
 typeBlock.select.addEventListener('change',renderSpecific);
 renderSpecific();
 form.addEventListener('submit',event=>{
  event.preventDefault();error.textContent='';
  const day=days.find(d=>d.date===dateBlock.select.value),kind=typeBlock.select.value;
  if(!day){error.textContent='Bitte einen gültigen Tag auswählen.';return;}
  const base={id:editing?.id||'fx'+Math.random().toString(36).slice(2,12),mode:repeat.select.value,
   ...(repeat.select.value==='once'?{date:day.date}:{weekday:day.weekday})};
  let detail=null;
  if(kind==='strength'){
   if(!plans.some(p=>String(p.id)===values.planSelect.value)){error.textContent='Bitte eine Trainingseinheit auswählen.';return;}
   detail={type:kind,planId:values.planSelect.value};
  }else if(kind==='custom'){
   const title=values.name.value.trim(),minutes=Number(values.duration.value);
   if(!title){error.textContent='Bitte einen Namen für die Einheit eingeben.';return;}
   if(values.duration.value&&(minutes<1||minutes>480||!Number.isInteger(minutes))){error.textContent='Die Dauer muss zwischen 1 und 480 Minuten liegen.';return;}
   const names=values.exercises.value.split('\n').map(x=>x.trim()).filter(Boolean);
   if(names.length>40){error.textContent='Bitte höchstens 40 Übungen eingeben.';return;}
   detail={type:kind,title,mins:values.duration.value?minutes:0,ex:names.map(name=>({name:name.slice(0,150)}))};
  }else if(kind==='mobility'){
   const key=values.routine.value,title=values.name.value.trim();
   const exercises=key==='custom'?Array.from(values.list.children).map(row=>({
    name:row.children[0].value.trim(),seconds:Number(row.children[1].value)
   })):routineExercises(key);
   if(!title||!exercises.length||exercises.some(x=>!x.name||!Number.isInteger(x.seconds)||x.seconds<10||x.seconds>1800)){
    error.textContent='Bitte einen Namen und gültige Übungen mit 10–1800 Sekunden Dauer eingeben.';return;
   }
   detail={type:kind,title,routineKey:key,ex:exercises};
  }else if(kind==='video'){
   const goal=values.goal.value,mins=Number(values.duration.value),choice=values.choice.value;
   const candidate=knownVideos(goal,mins)[Number(choice)];
   if(choice==='custom'){
    const url=safeVideoUrl(values.url.value),title=values.name.value.trim();
    if(!url||!title){error.textContent='Bitte einen gültigen YouTube-Link und Videotitel angeben.';return;}
    detail={type:kind,title,url,goal,mins,customUrl:true};
   }else if(candidate?.verified&&safeVideoUrl(candidate.url)){
    detail={type:kind,title:candidate.title,url:candidate.url,goal,mins,choice:Number(choice),customUrl:false};
   }else {error.textContent='Bitte ein verifiziertes Video auswählen oder einen eigenen YouTube-Link einfügen.';return;}
  }
  const extra=makeExtra(base,detail);
  if(!extra){error.textContent='Diese Einheit konnte nicht gespeichert werden. Bitte Eingaben prüfen.';return;}
  if(editing?.doneDates)extra.doneDates=editing.doneDates;
  const issue=saveExtra(extra,editing?.id||null);
  if(issue){error.textContent=issue;return;}
  overlay.remove();
 });
 typeBlock.select.focus();
}
// Shared addition dialog for the simplified Plan start surface.
window.forgePolishOpenAdd=addDialog;
function moveDay(plan,weekday){
 const c=state.settings?.cadence;
 if(c?.mode==='interval'){
  // No conversion of the X-day cycle into fixed weekday appointments.
  activatePlanEditor();return;
 }
 if(typeof window.forge130ChangeWeek==='function'){
  const row=$('forgePolishFullWeek');if(row)row.open=true;
  // Use the existing move/confirmation logic – no alternative persistence engine.
  const card=$('combinedWeek')?.querySelectorAll(':scope > .card')?.[weekday];
  const button=card?.querySelector('.forge130-week-editor summary');
  if(button){button.closest('details').open=true;button.scrollIntoView({behavior:'smooth',block:'center'});return;}
 }
 const full=$('forgePolishFullWeek');
 if(full){full.open=true;full.scrollIntoView({behavior:'smooth',block:'center'});}
}
function sessionFold(plan,key,subline,emptyText){
 const fold=el('details','forge-polish-session');
 fold.dataset.session=key;
 fold.open=expandedTrainingDays.has(key);
 fold.addEventListener('toggle',()=>{
  if(fold.open)expandedTrainingDays.add(key);
  else expandedTrainingDays.delete(key);
 });
 const summary=el('summary','forge-polish-session-summary');
 const heading=el('span','forge-polish-session-labels');
 heading.append(el('strong','',safeText(plan?.title)||'Krafttraining'));
 heading.append(el('small','',subline));
 summary.append(heading,el('span','forge-polish-session-chevron','⌄'));
 fold.append(summary);
 const body=el('div','forge-polish-session-body');
 const exercises=exercisePreview(plan);
 if(exercises.length){
  const list=el('ol','forge-polish-exercise-list');
  exercises.forEach(ex=>{
   const item=el('li','forge-polish-exercise-line');
   item.append(el('span','forge-polish-exercise-name',ex.name));
   if(ex.description)item.append(el('small','forge-polish-exercise-meta',ex.description));
   list.append(item);
  });
  body.append(list);
 }else{
  body.append(el('p','muted',emptyText||'Für diesen Trainingstag sind noch keine Übungen eingetragen.'));
 }
 fold.append(body);
 return fold;
}
function renderCompact(){
 if(rendering)return;
 const root=$('forgePolishWeek'),details=$('forgePolishFullWeek');
 if(!root||typeof state!=='object')return;
 rendering=true;
 try{
  const days=currentRows();
  root.replaceChildren();
  const meta=el('div','forge-polish-week-meta');
  meta.append(el('strong','', 'Deine Trainingstage'));
  meta.append(el('span','',days[0].date+' – '+days[6].date));
  root.append(meta);
  const rows=days.filter(d=>restOpen||!d.isRest);
  if(!rows.length)root.append(el('p','muted','Für diese Woche sind noch keine Einheiten geplant.'));
  rows.forEach((day,index)=>{
   const row=el('div','forge-polish-day'+(day.isRest?' forge-polish-rest':''));row.dataset.date=day.date;
   const date=el('div','forge-polish-day-date');
   date.append(el('strong','',day.label),el('small','',readable(day.date)));
   const content=el('div','forge-polish-day-content');
   if(day.primary){
    content.append(sessionFold(day.primary,day.date+':'+String(day.primary.id),
     exercisePreview(day.primary).length+' Übungen · '+(day.primary.location==='gym'?'Studio':'Zuhause')));
    const tools=el('div','forge-polish-day-actions');
    tools.append(createBtn('▶ Start',()=>startPlanned(day.primary.id)));
    if(state.settings?.cadence?.mode!=='interval'){
     tools.append(createBtn('↔ Verschieben',()=>moveDay(day.primary,day.weekday),'btn alt small'));
    }
    content.append(tools);
   }
   if(day.extras.length){
    day.extras.forEach(extra=>{
     const type=extra.type||'strength',special=el('div','forge-polish-extra');
     const plan=previewExtra(extra);
     const kind=type==='strength'?'Krafttraining':type==='custom'?'Individuell':type==='mobility'?'Mobilität':'Video';
     const period=extra.mode==='once'?'Einmalig':'Wöchentlich';
     const duration=extra.mins?String(extra.mins)+' Min. · ':'';
     special.append(sessionFold(plan,day.date+':extra:'+extra.id,duration+kind+' · '+period,
      type==='video'?'Tippe unten auf „Video öffnen“, um deine Einheit zu starten.':
      'Für diese Einheit sind noch keine einzelnen Übungen hinterlegt.'));
     const controls=el('div','forge-polish-day-actions');
     if(type==='strength')controls.append(createBtn('▶ Start',()=>startPlanned(extra.planId)));
     if(type==='video'){
      controls.append(createBtn(state.activeMobilityVideo?.forgeExtraId===extra.id?'▶ Video erneut öffnen · Timer läuft':'▶ Video öffnen + Timer',
       ()=>openExtraVideo(extra),'btn alt small'));
      if(state.activeMobilityVideo?.forgeExtraId===extra.id){
       controls.append(createBtn('■ Video beenden & speichern',()=>{
        if(typeof window.finishMobilityVideo!=='function')return alert('Der Mobilitätstimer ist nicht verfügbar.');
        window.finishMobilityVideo();
        completeExtra(extra.id,day.date);
       },'btn alt small'));
      }
     }
     if(type!=='strength'){
      const done=Array.isArray(extra.doneDates)&&extra.doneDates.includes(day.date);
      const finish=createBtn(done?'✓ Erledigt':'✓ Erledigt markieren',()=>completeExtra(extra.id,day.date),'btn alt small');
      finish.disabled=done;finish.setAttribute('aria-label','Zusätzliche Einheit für '+day.date+' als erledigt markieren');
      controls.append(finish);
     }
     const edit=createBtn('✎ Bearbeiten',()=>addDialog(day.date,extra.id),'btn alt small');
     edit.setAttribute('aria-label','Zusatztermin bearbeiten');controls.append(edit);
     const remove=createBtn('✕ Entfernen',()=>{
      if(confirm('Diese zusätzliche Einheit aus deinem Wochenplan entfernen?'))deleteExtra(extra.id);
     },'btn alt small');
     remove.setAttribute('aria-label','Zusatztraining entfernen');
     controls.append(remove);special.append(controls);content.append(special);
    });
   }
   if(day.mobility)content.append(el('small','forge-polish-mobility','🧘 Mobilität eingeplant'));
   if(day.isRest)content.append(el('small','', 'Ruhetag'));
   row.append(date,content);root.append(row);
   if(index<rows.length-1&&activePlan().length){
    const next=rows[index+1],gap=isoOrdinal(next.date)-isoOrdinal(day.date);
    if(gap>1&&!restOpen){
     const add=createBtn('＋ Training einfügen',()=>addDialog(ordinalISO(isoOrdinal(day.date)+1)),'forge-polish-between');
     root.append(add);
    }
   }
  });
  const footer=el('div','forge-polish-week-footer');
  footer.append(createBtn(restOpen?'Ruhetage ausblenden':'Alle Tage anzeigen',()=>{
   restOpen=!restOpen;renderCompact();
  },'btn alt small'));
  footer.append(createBtn('＋ Training einfügen',()=>addDialog(days.find(d=>d.isRest)?.date||days[0].date),'btn alt small'));
  root.append(footer);
  const count=days.filter(d=>!d.isRest).length;
  const title=$('forgePolishWeekTitle');if(title)title.textContent='Deine Woche · '+count+' aktive '+(count===1?'Tage':'Tage');
  if(details&&details.open)details.dataset.expanded='true';
 }finally{rendering=false;}
}
function initCalendar(){
 const week=$('combinedWeek'),board=week?.closest('.forge150-calendar')||week?.closest('#plan > .card');
 if(!week||!board)return false;
 // The legacy Plan card wraps the entire calendar inside a closed accordion.
 // Open it once so the compact schedule is visible without an extra tap.
 const calendarFold=board.querySelector(':scope > details.forge-fold-details');
 if(calendarFold&&!calendarFold.dataset.forgePolishInitiallyShown){
  calendarFold.open=true;calendarFold.dataset.forgePolishInitiallyShown='1';
 }
 if(!$('forgePolishWeek')){
  const root=el('div','forge-polish-week');root.id='forgePolishWeek';
  const heading=board.querySelector(':scope > h2');
  if(heading)heading.id='forgePolishWeekTitle';
  board.insertBefore(root,week);
 }
 if(!$('forgePolishFullWeek')){
  const details=el('details','forge-polish-full');details.id='forgePolishFullWeek';
  const summary=el('summary','','Ausführliche Wochenansicht und bestehende Bearbeitung');
  details.append(summary);week.before(details);
  const cadenceBadge=$('forgeCadenceOverview');if(cadenceBadge)details.append(cadenceBadge);
  details.append(week);
 }
 if(!weekObserver){
  weekObserver=new MutationObserver(()=>{if(!rendering)renderCompact();});
  weekObserver.observe(week,{childList:true});
 }
 renderCompact();return true;
}
function renderExtraDashboard(){
 const root=$('forgeCompactExtraDashboard'),dashboard=$('dashboardWeek');
 if(!dashboard||typeof state!=='object')return;
 const extras=currentRows().flatMap(day=>day.extras.map(x=>({...x,date:day.date})));
 if(!extras.length){root?.remove();return;}
 let host=root;
 if(!host){host=el('div','forge-polish-dash-extra');host.id='forgeCompactExtraDashboard';dashboard.after(host);}
 host.replaceChildren(el('strong','', 'Zusätzlich geplant'));
 extras.forEach(x=>host.append(el('p','',readable(x.date)+' · '+(x.plan?.title||x.title||'Einheit')+(x.mode==='weekly'?' · wöchentlich':''))));
}
function initPlan(){
 const page=$('plan');
 if(!page)return false;
 const heading=page.querySelector(':scope > h1');
 if(heading&&!$('forgePolishPlanActions')){
  const row=el('div','forge-polish-main-actions');row.id='forgePolishPlanActions';
  row.append(createBtn('✎ Plan bearbeiten',()=>window.forgeOpenActivePlanEditor?.(),'btn small'));
  row.append(createBtn('▦ Übungskatalog',()=>{
   const picker=$('forgeCatalog');
   if(picker?.tagName==='DETAILS')picker.open=true;
   picker?.scrollIntoView({behavior:'smooth',block:'start'});
  },'btn alt small'));
  heading.after(row);
 }
 initCalendar();
 return true;
}
function initDashboard(){
 const dashboard=$('dashboard');if(!dashboard)return false;
 // Bottom navigation already provides these four page shortcuts. Keep the primary
 // "next workout" CTA and remove the redundant shortcut grid from the visual UI.
 dashboard.classList.add('forge-polish-dashboard');
 for(const card of Array.from(dashboard.querySelectorAll(':scope > .card'))){
  if(card.dataset.forgePolishFold)continue;
  const h=card.querySelector(':scope > h2');
  if(!h||!['Deine Woche','Ernährung heute'].includes(h.textContent.trim()))continue;
  card.dataset.forgePolishFold='1';
  const details=el('details','forge-polish-dashboard-details');
  const summary=el('summary','',h.textContent.trim());
  details.append(summary);h.remove();
  while(card.firstChild)details.append(card.firstChild);
  card.append(details);
 }
 const readiness=$('forge150ReadinessLink');if(readiness)readiness.textContent='🧠 Tagesform einschätzen';
 renderExtraDashboard();
 return true;
}
function initWorkout(){
 const page=$('workout'),lead=page?.querySelector('.forge150-workout-lead');
 if(!page||!lead)return false;
 page.classList.add('forge-polish-training');
 const exercises=$('workoutExercises');
 if(exercises){
  const fold=exercises.closest('details.forge-workout-all');
  if(fold){fold.open=true;const title=fold.querySelector(':scope > summary');if(title)title.textContent='Übungen & Sätze';}
 }
 const reorder=$('forge142OrderPanel');
 if(reorder&&reorder.dataset.polishShortcut!=='1'){
  reorder.dataset.polishShortcut='1';
  const open=createBtn('↕ Reihenfolge & Einstellungen',()=>{
   reorder.open=!reorder.open;
   if(reorder.open)reorder.scrollIntoView({behavior:'smooth',block:'nearest'});
  },'btn alt small forge-polish-reorder-btn');
  reorder.before(open);
 }
 return true;
}
function initSwipe(){
 if(document.documentElement.dataset.forgePolishSwipe)return;
 document.documentElement.dataset.forgePolishSwipe='1';
 const blocked=target=>!!target?.closest?.(
  'input,textarea,select,button,a,label,summary,details,[contenteditable],'+
  '[role="slider"],[role="dialog"],[role="tablist"],[data-no-swipe],canvas,video,'+
  '.forge-mob-card-scroll,.forge-polish-full,.forge-exercise,.forge-set-row,.forge-polish-day-actions,'+
  '.forge-photo-pair,.forge165-photo-grid,.forge166-photo-grid,.forge167-photo-grid,.forge169-photo-grid'
 );
 document.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||blocked(event.target)){swipeStart=null;return;}
  const page=event.target.closest('.page.active');
  if(!page||!PAGES.includes(page.id)){swipeStart=null;return;}
  const t=event.touches[0];
  swipeStart={x:t.clientX,y:t.clientY,time:Date.now(),page:page.id,target:event.target};
 },{passive:true});
 document.addEventListener('touchend',event=>{
  if(!swipeStart||!event.changedTouches.length)return;
  const started=swipeStart;swipeStart=null;
  if(event.touches.length||blocked(event.target)||!document.getElementById(started.page)?.classList.contains('active'))return;
  const t=event.changedTouches[0];
  const direction=swipeDirection(t.clientX-started.x,t.clientY-started.y,Date.now()-started.time,false);
  if(!direction)return;
  const index=PAGES.indexOf(started.page),next=PAGES[index+direction];
  if(next&&typeof window.go==='function')window.go(next);
 },{passive:true});
 document.addEventListener('touchcancel',()=>{swipeStart=null;},{passive:true});
}
function styles(){
 if($('forgeMobilePolishCss'))return;
 const style=el('style');style.id='forgeMobilePolishCss';
 style.textContent=[
  '#dashboard.forge-polish-dashboard>.forge-quick{display:none!important}',
  '#dashboard .forge150-readiness-link{width:100%;min-height:66px;box-sizing:border-box;border-radius:14px!important;text-align:left;font-size:14px!important}',
  '#dashboard .forge-polish-dashboard-details>summary{cursor:pointer;list-style:none;min-height:50px;display:flex;align-items:center;font-weight:750}',
  '#dashboard .forge-polish-dashboard-details>summary::after{content:"⌄";margin-left:auto;color:#a8f55d;font-size:21px}',
  '#dashboard .forge-polish-dashboard-details[open]>summary::after{content:"⌃"}',
  '#dashboard .forge-polish-dashboard-details>#dashboardWeek{margin-top:5px}',
  '#dashboard .forge-polish-dash-extra{background:#1a3030;border:1px solid #31584b;border-radius:12px;padding:9px 12px;margin-top:10px;font-size:12px}',
  '#dashboard .forge-polish-dash-extra p{margin:5px 0}',
  '#plan>.forge-intro{display:none}',
  '#plan .forge-polish-main-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:11px 0 14px}',
  '#plan .forge-polish-main-actions button{min-height:47px;padding:10px 7px;white-space:normal;line-height:1.35;font-size:13px}',
  '#plan #forge150PlanHub>h2{display:none}',
  '#plan #forge150PlanHub>p{margin:0 0 8px}',
  '#plan #forgePolishWeekTitle{margin:0 0 12px}',
  '#plan .forge-polish-week{display:grid;gap:8px}',
  '#plan .forge-polish-week-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;color:#b8d0c5;margin-bottom:3px}',
  '#plan .forge-polish-week-meta strong{color:#dcf6df;font-size:13px}',
  '#plan .forge-polish-day{display:flex;align-items:stretch;gap:12px;border:1px solid #395751;background:#152b32;border-radius:14px;padding:12px 11px;min-width:0}',
  '#plan .forge-polish-day.forge-polish-rest{background:#15242b;border-color:#32484d;opacity:.84}',
  '#plan .forge-polish-day-date{display:flex;flex-direction:column;align-items:center;min-width:52px;justify-content:center;padding-right:10px;border-right:1px solid #345451}',
  '#plan .forge-polish-day-date strong{font-size:16px;color:#dff9ce}',
  '#plan .forge-polish-day-date small{font-size:11px;color:#bad2c3;margin-top:4px}',
  '#plan .forge-polish-day-content{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:6px}',
  '#plan .forge-polish-session{border:0;background:transparent;margin:0;min-width:0}',
  '#plan .forge-polish-session-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;min-height:42px;list-style:none}',
  '#plan .forge-polish-session-summary::-webkit-details-marker{display:none}',
  '#plan .forge-polish-session-labels{display:grid;gap:5px;min-width:0}',
  '#plan .forge-polish-session-labels strong{font-size:14px;line-height:1.35;color:#eaf9ea}',
  '#plan .forge-polish-session-labels small{font-size:11px;color:#b4c9c1;line-height:1.4}',
  '#plan .forge-polish-session-chevron{font-size:22px;color:#a8f55d;transition:transform .15s;flex-shrink:0}',
  '#plan .forge-polish-session[open] .forge-polish-session-chevron{transform:rotate(180deg)}',
  '#plan .forge-polish-session-summary:focus-visible{outline:2px solid #a8f55d;outline-offset:3px;border-radius:6px}',
  '#plan .forge-polish-session-body{margin:10px 0 7px;padding:10px 12px;border-radius:10px;background:#0e222a;border:1px solid #36564f}',
  '#plan .forge-polish-exercise-list{margin:0;padding-left:22px;display:grid;gap:10px}',
  '#plan .forge-polish-exercise-line{padding-left:3px;color:#e4f1ea;font-size:12px;line-height:1.45}',
  '#plan .forge-polish-exercise-name{display:block;font-weight:650;overflow-wrap:anywhere}',
  '#plan .forge-polish-exercise-meta{display:block;color:#b7d4c4;font-size:11px;margin-top:2px}',
  '#plan .forge-polish-session-body>.muted{margin:0;font-size:12px}',
  '#plan .forge-polish-day-content>strong{font-size:14px;line-height:1.3}',
  '#plan .forge-polish-day-content small{font-size:11px;color:#b4c9c1}',
  '#plan .forge-polish-day-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:4px}',
  '#plan .forge-polish-day-actions button{min-height:38px;padding:7px 10px;font-size:12px}',
  '#plan .forge-polish-extra{border-top:1px solid #3b5653;margin-top:9px;padding-top:8px;display:grid;gap:5px}',
   '#plan .forge-polish-extra .forge-polish-session-summary{padding:4px 0}',
   '#plan .forge-polish-extra .forge-polish-day-actions{margin-top:8px}',
   '#plan .forge-polish-day-actions button:disabled{opacity:.7;border-color:#6e8b71;color:#bbe1b6;cursor:default}',
  '#plan .forge-polish-between{justify-self:center;border:1px dashed #5b845f;background:transparent;color:#c9f3b4;border-radius:24px;padding:8px 12px;font:inherit;font-size:12px;min-height:36px}',
  '#plan .forge-polish-week-footer{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 4px}',
  '#plan .forge-polish-week-footer button{font-size:12px;min-height:43px;padding:8px 7px;white-space:normal}',
  '#plan .forge-polish-full{margin-top:13px;border-top:1px solid #35514e}',
  '#plan .forge-polish-full>summary{cursor:pointer;padding:14px 2px;color:#bde9b4;font-size:12px;list-style:none}',
  '#plan .forge-polish-full>summary::after{content:"⌄";margin-left:8px}',
  '#plan .forge-polish-full[open]>summary::after{content:"⌃"}',
  '#plan .forge-polish-full>#combinedWeek{margin:6px 0 12px}',
  '.forge-polish-overlay{position:fixed;inset:0;z-index:1000002;background:#030b0de8;display:grid;place-items:center;padding:12px}',
  '.forge-polish-dialog{background:#172a32;color:#e9f7e8;border:1px solid #63856a;box-sizing:border-box;width:min(96vw,430px);max-height:90dvh;overflow-y:auto;border-radius:16px;padding:18px}',
  '.forge-polish-dialog h3{margin:0 0 8px;font-size:19px}',
  '.forge-polish-dialog .muted{font-size:12px;line-height:1.5;margin-bottom:15px}',
  '.forge-polish-dialog form,.forge-polish-dialog label{display:grid;gap:8px}',
  '.forge-polish-dialog form{gap:14px}',
  '.forge-polish-dialog label{font-size:13px;color:#d3e3d7}',
  '.forge-polish-dialog select,.forge-polish-dialog input,.forge-polish-dialog textarea{box-sizing:border-box;min-height:45px;width:100%;max-width:100%;font:inherit;color:#e9f7e8;border:1px solid #4b6770;border-radius:10px;background:#0c1923;padding:10px 12px}',
   '.forge-polish-dialog textarea{resize:vertical;min-height:88px;line-height:1.5}',
   '.forge-polish-dialog [hidden]{display:none!important}',
   '.forge-polish-type-fields{display:grid;gap:12px;padding:12px 0 5px;border-top:1px solid #39564b;border-bottom:1px solid #39564b}',
   '.forge-polish-type-fields>label,.forge-polish-mob-builder>label{margin:0}',
   '.forge-polish-mob-builder{display:grid;gap:9px;padding:7px 0}',
   '.forge-polish-mob-exercises{display:grid;gap:8px}',
   '.forge-polish-mob-row{display:grid;grid-template-columns:minmax(0,1fr) 77px 42px;gap:7px;align-items:center}',
   '.forge-polish-mob-row input{min-width:0}',
   '.forge-polish-mob-row button{padding:7px 0;min-height:44px}',
   '.forge-polish-type-fields>.btn,.forge-polish-mob-builder>.btn{min-height:43px}',
   '.forge-polish-dialog button:focus-visible,.forge-polish-dialog input:focus-visible,.forge-polish-dialog select:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
  '.forge-polish-dialog .forge-polish-actions{display:flex;gap:9px;margin-top:5px}',
  '.forge-polish-dialog .forge-polish-actions button{flex:1;min-height:44px}',
  '.forge-polish-error{margin:0;color:#ffc5be;font-size:12px}',
  '#workout.forge-polish-training>.forge-intro{display:none}',
  '#workout.forge-polish-training .forge150-workout-lead{padding:14px 13px 15px!important}',
  '#workout.forge-polish-training .forge150-workout-lead .forge-clock{padding:10px!important;margin:9px 0!important}',
  '#workout.forge-polish-training #forgeQuickWorkout{border-color:#51775b!important;background:#17312f!important}',
  '#workout.forge-polish-training .forge-workout-all{margin-top:10px!important}',
  '#workout.forge-polish-training .forge-workout-all>summary{font-size:15px;font-weight:750}',
  '#workout.forge-polish-training .forge-exercise{border-radius:11px!important;margin:8px 0!important}',
  '#workout.forge-polish-training #forge142OrderPanel{margin:7px 0}',
  '#workout.forge-polish-training .forge-polish-reorder-btn{width:100%;min-height:42px;font-size:12px}',
  '#workout.forge-polish-training .forge-exercise-heading{margin:12px 0 7px}',
  '@media(max-width:375px){#plan .forge-polish-day-actions button{flex:1 1 auto}#plan .forge-polish-week-footer{gap:5px}#plan .forge-polish-day{gap:8px;padding:11px 8px}}',
  '@media(prefers-reduced-motion:reduce){#plan .forge-polish-day,#workout .forge-exercise{transition:none!important}}'
 ].join('');
 document.head.append(style);
}
function boot(){
 if(ready)return;
 if(typeof state==='undefined')return;
 styles();initSwipe();
 const p=initPlan(),w=initWorkout(),d=initDashboard();
 if(!p||!w||!d)return;
 ready=true;
 // Preserve interval-plan and existing week renderer wrappers.
 if(typeof window.renderCombinedWeek==='function'){
  const prior=window.renderCombinedWeek;
  window.renderCombinedWeek=function(){const result=prior.apply(this,arguments);renderCompact();renderExtraDashboard();return result;};
 }
 if(typeof window.renderDashboardWeek==='function'){
  const old=window.renderDashboardWeek;
  window.renderDashboardWeek=function(){const v=old.apply(this,arguments);renderExtraDashboard();return v;};
 }
 renderCompact();renderExtraDashboard();
}
function start(){
 let attempts=0;
 function tryBoot(){boot();if(!ready&&++attempts<50)setTimeout(tryBoot,120);}
 tryBoot();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();