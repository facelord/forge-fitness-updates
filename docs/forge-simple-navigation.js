/* FORGE · UX Simplification 1/4: Navigation + Plan start.
 * Additive presentation. Never migrates, mutates or deletes training records.
 * Dashboard DOM stays mounted for old data renderers; only its tab is removed.
 */
(function(){
'use strict';
const PAGES=Object.freeze(['plan','workout','nutrition','progress']);
const $=id=>document.getElementById(id);
const node=(tag,className,text)=>{
 const e=document.createElement(tag);
 if(className)e.className=className;
 if(text!==undefined)e.textContent=text;
 return e;
};
function validISO(iso){
 return typeof iso==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(iso);
}
function ordinal(iso){
 if(!validISO(iso))return NaN;
 const [year,month,day]=iso.split('-').map(Number);
 const ms=Date.UTC(year,month-1,day),date=new Date(ms);
 return date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&date.getUTCDate()===day?Math.floor(ms/86400000):NaN;
}
function fromOrdinal(value){return new Date(value*86400000).toISOString().slice(0,10);}
function weekdayFor(value){return (new Date(value*86400000).getUTCDay()+6)%7;}
function nextTraining(plan,settings,iso,weekMoves={}){
 const list=Array.isArray(plan)?plan:[],today=ordinal(iso);
 if(!list.length||!Number.isFinite(today))return null;
 const interval=settings?.cadence;
 if(interval?.mode==='interval'&&window.ForgeCadenceCore?.next){
  try{
   const event=window.ForgeCadenceCore.next(interval,iso);
   const matched=list.find(p=>String(p.id)===String(event.planId));
   if(matched)return {date:event.date,plan:matched,kind:'scheduled'};
  }catch(e){/* Fallback to fixed schedule, no data mutation. */}
 }
 // Temporary moves apply ONLY in the current calendar week; subsequent weeks
 // revert to the saved weekday. This avoids duplicate or lost appointments.
 const thisMonday=today-weekdayFor(today);
 for(let offset=0;offset<14;offset++){
  const value=today+offset,weekday=weekdayFor(value),inThisWeek=value<thisMonday+7;
  const match=list.find(p=>{
   const own=Number(p.weekday);
   if(!Number.isInteger(own)||own<0||own>6)return false;
   const moved=inThisWeek&&Object.prototype.hasOwnProperty.call(weekMoves,String(p.id));
   const target=moved?Number(weekMoves[p.id]):own;
   return target===weekday;
  });
  if(match)return {date:fromOrdinal(value),plan:match,kind:'scheduled'};
 }
 return {date:null,plan:list[0],kind:'flexible'};
}
function relativeLabel(date,today){
 if(!date)return 'Flexibel trainieren';
 const diff=ordinal(date)-ordinal(today);
 if(diff===0)return 'Heute geplant';
 if(diff===1)return 'Morgen geplant';
 return new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
}
window.ForgeSimpleNavigation=Object.freeze({PAGES,ordinal,weekdayFor,nextTraining,relativeLabel});
let ready=false,rendering=false,lastPage=null,priorGo=null,priorPlan=null;
function styles(){
 if($('forgeSimpleNavigationStyle'))return;
 const style=node('style');style.id='forgeSimpleNavigationStyle';
 style.textContent=[
  '#nav.forge-simple-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;align-items:stretch;padding:7px 6px calc(9px + env(safe-area-inset-bottom))}',
  '#nav.forge-simple-nav button{display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;min-width:0;min-height:54px;padding:6px 2px;border-radius:10px;font-weight:650;font-size:11px}',
  '#nav.forge-simple-nav button .ico{font-size:20px;line-height:1.2}',
  '#nav.forge-simple-nav button.active{background:#263b2e;color:#a8f55d}',
  '#nav.forge-simple-nav button:focus-visible{outline:2px solid #a8f55d;outline-offset:-2px}',
  '#plan.forge-simple-plan>h1{font-size:25px;margin:4px 0 8px}',
  '#plan.forge-simple-plan>.tag{font-size:10px;letter-spacing:.09em}',
  '#plan.forge-simple-plan>.forge-intro{display:none}',
  '#plan .forge-simple-hero{margin:12px 0 10px;padding:16px 15px;border:1px solid #5b8054;border-radius:17px;background:linear-gradient(125deg,#182f2c,#16242e);display:grid;gap:9px}',
  '#plan .forge-simple-hero-kicker{font-size:11px;font-weight:800;letter-spacing:.06em;color:#adef79;text-transform:uppercase}',
  '#plan .forge-simple-hero-title{font-size:20px;line-height:1.2;font-weight:800;color:#f0f9ee;overflow-wrap:anywhere}',
  '#plan .forge-simple-hero-meta{font-size:12px;color:#c8d8cf;line-height:1.4}',
  '#plan .forge-simple-hero button{width:100%;min-height:50px;font-weight:800;font-size:15px;border-radius:11px;margin-top:3px}',
  '#plan.forge-simple-plan #forgePolishPlanActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 10px}',
  '#plan.forge-simple-plan #forgePolishPlanActions button{font-size:12px;min-height:46px;width:100%;min-width:0;padding:9px 6px;border:1px solid #547061;background:#1c3437;color:#e3f4e2;border-radius:11px;white-space:normal}',
  '#plan.forge-simple-plan #forgePolishPlanActions button:focus-visible,#plan .forge-simple-hero button:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
  '#plan.forge-simple-plan .forge150-calendar{margin:12px 0!important;padding:14px 12px!important;border-radius:15px!important}',
  '#plan.forge-simple-plan .forge150-calendar #forgePolishWeekTitle{font-size:17px!important;margin:0 0 10px!important}',
  '#plan.forge-simple-plan .forge-polish-week{gap:6px!important}',
  '#plan.forge-simple-plan .forge-polish-day{box-shadow:none!important;border-radius:10px!important}',
  '#plan.forge-simple-plan .forge-polish-week-footer button:last-child{display:none!important}',
  '#plan.forge-simple-plan .forge-polish-between{display:none!important}',
  '#plan.forge-simple-plan #forge159PlanToggle{margin-top:14px!important}',
  '#plan.forge-simple-plan #forgeCatalog{margin-top:10px!important}',
  '#plan.forge-simple-plan #forgePlanArchivePanel{margin:10px 0!important}',
  '#plan.forge-simple-plan .forge150-week-help{margin-top:6px!important}',
  '@media(max-width:360px){#plan .forge-simple-hero-title{font-size:18px}#nav.forge-simple-nav button{font-size:10px}}'
 ].join('');
 document.head.append(style);
}
function refreshNavbar(){
 const bar=$('nav');if(!bar)return false;
 const pages={
  plan:['▦','Plan'],workout:['🏋','Training'],
  nutrition:['◈','Essen'],progress:['↗','Fortschritt']
 };
 const home=bar.querySelector('button[data-page="dashboard"]');
 if(home)home.remove();
 for(const id of PAGES){
  const button=bar.querySelector('button[data-page="'+id+'"]');
  if(!button)continue;
  if(button.textContent.trim()!==pages[id][0]+pages[id][1]){
   button.replaceChildren(node('span','ico',pages[id][0]),document.createTextNode(pages[id][1]));
  }
  button.setAttribute('aria-label',pages[id][1]);
  bar.append(button);
 }
 bar.classList.add('forge-simple-nav');
 const active=document.querySelector('.page.active')?.id||'plan';
 const visible=PAGES.includes(active)?active:'plan';
 bar.querySelectorAll('button[data-page]').forEach(b=>{
  const current=b.dataset.page===visible;
  b.classList.toggle('active',current);
  if(current)b.setAttribute('aria-current','page');
  else b.removeAttribute('aria-current');
 });
 return true;
}
function quickActions(){
 const page=$('plan'),actions=$('forgePolishPlanActions');if(!page||!actions)return;
 const first=actions.querySelector('button');
 if(first){first.classList.add('btn','alt','small');first.classList.remove('forge-simple-primary');}
 let add=$('forgeSimpleAdd');
 if(!add){
  const existing=Array.from(actions.children).find(b=>b!==first);
  if(existing)existing.remove();
  add=node('button','btn alt small','＋ Training hinzufügen');
  add.id='forgeSimpleAdd';add.type='button';
  add.addEventListener('click',()=>{
   if(typeof window.forgePolishOpenAdd==='function')window.forgePolishOpenAdd();
   else {
    const fallback=Array.from($('#forgePolishWeek')?.querySelectorAll('button')||[])
      .find(b=>b.textContent.includes('Training einfügen'));
    if(fallback)fallback.click();
   }
  });
  actions.append(add);
 }
}
function currentWeekMoves(){
 const moves=state?.forgeWeekMoves;
 if(!moves?.moves||typeof moves.moves!=='object')return {};
 const key=typeof window.forge130WeekKey==='function'?window.forge130WeekKey():null;
 return key&&moves.week===key?moves.moves:{};
}
function updateHero(){
 if(typeof state==='undefined'||rendering)return;
 const hero=$('forgeSimpleHero');if(!hero)return;
 rendering=true;
 try{
  const now=typeof window.ForgeMobilePolish?.localISO==='function'
   ?window.ForgeMobilePolish.localISO():new Date().toLocaleDateString('sv-SE');
  const plan=Array.isArray(state.plan)?state.plan:[];
  const due=nextTraining(plan,state.settings,now,currentWeekMoves());
  const active=state.activeWorkout;
  const title=$('forgeSimpleHeroTitle'),meta=$('forgeSimpleHeroMeta'),label=$('forgeSimpleHeroKicker'),button=$('forgeSimpleHeroAction');
  if(active){
   const p=plan.find(x=>String(x.id)===String(active.planId));
   label.textContent='DEIN TRAINING LÄUFT';
   title.textContent=p?.title||'Aktives Workout';
   meta.textContent=active.forgePausedAt?'Trainingszeit pausiert · Deine Sätze bleiben gespeichert':'Deine Trainingseinheit läuft bereits.';
   button.textContent='▶ Laufendes Training öffnen';
   button.dataset.action='resume';
  }else if(due){
   label.textContent=relativeLabel(due.date,now);
   title.textContent=due.plan.title||'Krafttraining';
   const where=due.plan.location==='gym'?'Fitnessstudio':due.plan.location==='home'?'Zuhause':'Flexibler Ort';
   meta.textContent=(due.plan.ex?.length||0)+' Übungen · '+where;
   button.textContent='▶ Training starten';
   button.dataset.action='start';
   button.dataset.planId=String(due.plan.id);
  }else{
   label.textContent='DEIN START';
   title.textContent='Dein erster Trainingsplan';
   meta.textContent='Erstelle einen Plan, um deine Trainingswoche zu organisieren.';
   button.textContent='＋ Trainingsplan erstellen';
   button.dataset.action='create';
   delete button.dataset.planId;
  }
 }finally{rendering=false;}
}
function heroAction(){
 const button=$('forgeSimpleHeroAction');
 if(!button)return;
 if(button.dataset.action==='resume'){
  if(typeof window.go==='function')window.go('workout');
  return;
 }
 if(button.dataset.action==='create'){
  if(typeof window.forgeOpenPlanEditor==='function')window.forgeOpenPlanEditor('auto');
  else $('forge159PlanToggle')?.click();
  return;
 }
 const id=button.dataset.planId;
 const plan=state?.plan?.find(p=>String(p.id)===id);
 if(!plan)return updateHero();
 if(typeof window.startWorkout==='function')window.startWorkout(plan.id);
}
function installHero(){
 const page=$('plan');if(!page)return false;
 page.classList.add('forge-simple-plan');
 const heading=page.querySelector(':scope > h1');
 if(heading)heading.textContent='Dein Trainingsplan';
 if(!$('forgeSimpleHero')){
  const hero=node('section','forge-simple-hero');hero.id='forgeSimpleHero';
  hero.setAttribute('aria-label','Nächstes Training');
  const label=node('div','forge-simple-hero-kicker');label.id='forgeSimpleHeroKicker';
  const title=node('div','forge-simple-hero-title');title.id='forgeSimpleHeroTitle';
  const meta=node('div','forge-simple-hero-meta');meta.id='forgeSimpleHeroMeta';
  const action=node('button','btn');action.id='forgeSimpleHeroAction';action.type='button';
  action.addEventListener('click',heroAction);
  hero.append(label,title,meta,action);
  heading?.after(hero);
 }
 quickActions();updateHero();return true;
}
function install(){
 if(ready)return;
 if(typeof state==='undefined'||!$('plan')||!$('nav')||!$('forgePolishPlanActions'))return;
 styles();refreshNavbar();installHero();
 ready=true;
 priorGo=window.go;
 if(typeof priorGo==='function'){
  window.go=function(page){
   const target=page==='dashboard'?'plan':page;
   const res=priorGo.call(this,target);
   refreshNavbar();updateHero();return res;
  };
 }
 priorPlan=window.renderPlan;
 if(typeof priorPlan==='function'){
  window.renderPlan=function(){
   const result=priorPlan.apply(this,arguments);
   updateHero();return result;
  };
 }
 // Return to an unfinished session; otherwise Plan is the only start page.
 const entry=state.activeWorkout?'workout':'plan';
 if(typeof window.go==='function')window.go(entry);
 else {
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===entry));
  refreshNavbar();
 }
}
function boot(){
 let attempts=0;
 const run=()=>{install();if(!ready&&++attempts<50)setTimeout(run,100);};
 run();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
