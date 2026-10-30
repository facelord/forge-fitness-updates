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
const PAGES=['dashboard','plan','workout','progress','nutrition'];
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
function normalizedExtras(raw,dates){
 const allowed=new Set(dates.map(d=>d.date));
 const next=[];
 if(!Array.isArray(raw))return next;
 for(const x of raw){
  if(!x||!['once','weekly'].includes(x.mode)||typeof x.planId!=='string'||x.planId.length>160)continue;
  if(x.mode==='once'&&typeof x.date==='string'&&allowed.has(x.date))next.push({...x});
  if(x.mode==='weekly'&&Number.isInteger(x.weekday)&&x.weekday>=0&&x.weekday<7)next.push({...x});
 }
 return next;
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
   .map(x=>({...x,plan:all.find(p=>String(p.id)===x.planId)||null}))
   .filter(x=>x.plan);
  row.mobility=mobilityDays.includes(row.weekday)||videoDays.includes(row.weekday);
  row.isRest=!row.primary&&!row.extras.length&&!row.mobility;
 });
 return days;
}
function swipeDirection(dx,dy,ms,blocked=false){
 if(blocked||ms>850||ms<40||Math.abs(dx)<78||Math.abs(dx)<1.7*Math.abs(dy))return 0;
 return dx<0?1:-1;
}
window.ForgeMobilePolish=Object.freeze({PAGES,localISO,isoWeek,weekModel,normalizedExtras,swipeDirection});
let restOpen=false,editorOpen=false,weekObserver=null,ready=false,swipeStart=null,rendering=false;
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
function saveExtra(extra){
 const clean=activeExtras().filter(x=>x&&typeof x==='object');
 if(clean.some(x=>x.mode===extra.mode&&x.planId===extra.planId&&
   (x.mode==='once'?x.date===extra.date:x.weekday===extra.weekday))){
  return 'Diese zusätzliche Einheit ist für den Tag bereits eingetragen.';
 }
 state.forgePolishExtras=clean.concat(extra);
 save();renderCompact();renderExtraDashboard();return null;
}
function deleteExtra(id){
 const old=activeExtras(),next=old.filter(x=>x.id!==id);
 if(next.length===old.length)return;
 state.forgePolishExtras=next;save();renderCompact();renderExtraDashboard();
}
function addDialog(preferredDate){
 let prior=$('forgePolishAddOverlay');if(prior)prior.remove();
 const plans=activePlan(),days=isoWeek();
 if(!plans.length){activatePlanEditor();return;}
 const overlay=el('div','forge-polish-overlay');overlay.id='forgePolishAddOverlay';
 const dialog=el('section','forge-polish-dialog');dialog.setAttribute('role','dialog');
 dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Zusätzliche Trainingseinheit planen');
 const title=el('h3','','＋ Training einfügen');
 const hint=el('p','muted','Zusätzliche Einheit aus deinem bestehenden Trainingsplan. Der Grundrhythmus bleibt unverändert.');
 const form=el('form');
 function labeled(text,options){
  const label=el('label','',text),select=el('select');
  options.forEach(([value,labelText])=>{const opt=el('option','',labelText);opt.value=value;select.append(opt);});
  label.append(select);form.append(label);return select;
 }
 const planSelect=labeled('Trainingseinheit',plans.map(p=>[String(p.id),safeText(p.title)||'Training']));
 const dateSelect=labeled('Tag',days.map(x=>[x.date,x.label+' · '+readable(x.date)]));
 dateSelect.value=days.some(x=>x.date===preferredDate)?preferredDate:days[0].date;
 const scope=labeled('Wiederholung',[['once','Nur an diesem Datum'],['weekly','Jede Woche an diesem Wochentag']]);
 const message=el('p','forge-polish-error');message.setAttribute('role','alert');
 const actions=el('div','forge-polish-actions');
 const cancel=createBtn('Abbrechen',()=>overlay.remove());
 const submit=el('button','btn small','Eintragen');submit.type='submit';
 actions.append(cancel,submit);form.append(message,actions);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const weekday=days.find(d=>d.date===dateSelect.value)?.weekday;
  if(weekday==null||!activePlan().some(p=>String(p.id)===planSelect.value)){message.textContent='Bitte eine gültige Einheit und einen Tag auswählen.';return;}
  const extra={id:'fx'+Math.random().toString(36).slice(2,12),planId:planSelect.value,mode:scope.value,
   ...(scope.value==='once'?{date:dateSelect.value}:{weekday})};
  const issue=saveExtra(extra);
  if(issue){message.textContent=issue;return;}
  overlay.remove();
 });
 dialog.append(title,hint,form);overlay.append(dialog);document.body.append(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
 planSelect.focus();
}
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
    content.append(el('strong','',day.primary.title||'Krafttraining'));
    content.append(el('small','',String(day.primary.ex?.length||0)+' Übungen · '+(day.primary.location==='gym'?'Studio':'Zuhause')));
    const tools=el('div','forge-polish-day-actions');
    tools.append(createBtn('▶ Start',()=>startPlanned(day.primary.id)));
    if(state.settings?.cadence?.mode!=='interval'){
     tools.append(createBtn('↔ Verschieben',()=>moveDay(day.primary,day.weekday),'btn alt small'));
    }
    content.append(tools);
   }
   if(day.extras.length){
    day.extras.forEach(extra=>{
     const special=el('div','forge-polish-extra');
     special.append(el('strong','',extra.plan.title||'Zusatztraining'));
     special.append(el('small','',extra.mode==='once'?'Einmalig geplant':'Jede Woche zusätzlich'));
     const controls=el('div','forge-polish-day-actions');
     controls.append(createBtn('▶ Start',()=>startPlanned(extra.planId)));
     const remove=createBtn('✕ Entfernen',()=>deleteExtra(extra.id),'btn alt small');
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
 extras.forEach(x=>host.append(el('p','',readable(x.date)+' · '+x.plan.title+(x.mode==='weekly'?' · wöchentlich':''))));
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
  '#plan .forge-polish-day-content>strong{font-size:14px;line-height:1.3}',
  '#plan .forge-polish-day-content small{font-size:11px;color:#b4c9c1}',
  '#plan .forge-polish-day-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:4px}',
  '#plan .forge-polish-day-actions button{min-height:38px;padding:7px 10px;font-size:12px}',
  '#plan .forge-polish-extra{border-top:1px solid #3b5653;margin-top:9px;padding-top:8px;display:grid;gap:5px}',
  '#plan .forge-polish-between{justify-self:center;border:1px dashed #5b845f;background:transparent;color:#c9f3b4;border-radius:24px;padding:8px 12px;font:inherit;font-size:12px;min-height:36px}',
  '#plan .forge-polish-week-footer{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 4px}',
  '#plan .forge-polish-week-footer button{font-size:12px;min-height:43px;padding:8px 7px;white-space:normal}',
  '#plan .forge-polish-full{margin-top:13px;border-top:1px solid #35514e}',
  '#plan .forge-polish-full>summary{cursor:pointer;padding:14px 2px;color:#bde9b4;font-size:12px;list-style:none}',
  '#plan .forge-polish-full>summary::after{content:"⌄";margin-left:8px}',
  '#plan .forge-polish-full[open]>summary::after{content:"⌃"}',
  '#plan .forge-polish-full>#combinedWeek{margin:6px 0 12px}',
  '.forge-polish-overlay{position:fixed;inset:0;z-index:1000002;background:#030b0de8;display:grid;place-items:center;padding:12px}',
  '.forge-polish-dialog{background:#172a32;color:#e9f7e8;border:1px solid #63856a;box-sizing:border-box;width:min(96vw,430px);max-height:90vh;overflow:auto;border-radius:16px;padding:18px}',
  '.forge-polish-dialog h3{margin:0 0 8px;font-size:19px}',
  '.forge-polish-dialog .muted{font-size:12px;line-height:1.5;margin-bottom:15px}',
  '.forge-polish-dialog form,.forge-polish-dialog label{display:grid;gap:8px}',
  '.forge-polish-dialog form{gap:14px}',
  '.forge-polish-dialog label{font-size:13px;color:#d3e3d7}',
  '.forge-polish-dialog select{min-height:46px;width:100%;max-width:100%;font:inherit}',
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