/* FORGE Layout B · Phase 3: Plan-Startseite (Design P1 „Plan: deine Woche“).
 * - Nächstes Training mit Starten / Verschieben
 * - Trainingswoche Mo–So mit Einheiten-Buchstaben, heute markiert,
 *   Tag antippen = Übungen der Einheit
 * - Kacheln „Plan bearbeiten“ / „Neuer Plan“, Übungskatalog, Archiv
 * Presentation only: every action opens the existing FORGE editors and
 * flows (hero start, shift editor, plan editor, creator, catalog, archive).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ACC='#a9f267';
const DAYS=Object.freeze(['Mo','Di','Mi','Do','Fr','Sa','So']);

/* ---------- pure helpers (tested) ---------- */
function unitLetter(plan,list){
 const t=String(plan&&plan.title||'');
 const m=t.match(/(?:Einheit|Tag|Day|Training)\s+([A-Z0-9])\b/i);
 if(m)return m[1].toUpperCase();
 const i=Array.isArray(list)?list.indexOf(plan):-1;
 return i>=0&&i<26?String.fromCharCode(65+i):'•';
}
function mondayIndex(date){return (date.getDay()+6)%7;}
/* week: Map weekday(0=Mo) -> plan. Returns 7 day cells. */
function weekCells(map,plans,today){
 const out=[];
 for(let d=0;d<7;d++){
  const p=map&&typeof map.get==='function'?map.get(d):null;
  out.push({day:DAYS[d],index:d,today:d===today,plan:p||null,letter:p?unitLetter(p,plans):''});
 }
 return out;
}
function exerciseLine(e){
 if(!e)return '';
 const unit=e.unit==='sec'||e.unit==='seconds'?' Sek.':'';
 return (e.sets||1)+' × '+(e.reps??'')+unit;
}
window.ForgeLayoutBPlan=Object.freeze({unitLetter,weekCells,exerciseLine,DAYS});
if(typeof document==='undefined')return;

function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function setText(n,t){if(n&&n.textContent!==t)n.textContent=t;}
function findButton(root,re){return [...(root||document).querySelectorAll('button')].find(b=>re.test((b.textContent||'').trim()));}
const ICON={
 play:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
 edit:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16z"/></svg>',
 plus:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
 back:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
};

const P='body.forge-layout-b #plan';
const CSS=`
${P}.forge-lb-plan-home>:not(.forge-lb-plan):not(.forge-b-pagehead){display:none!important}
${P}.forge-lb-plan-home>.forge-b-pagehead{margin-bottom:0!important}
${P}:not(.forge-lb-plan-home)>.forge-lb-plan>:not(.forge-lb-plan-back){display:none!important}
${P}.forge-lb-plan-home>.forge-lb-plan>.forge-lb-plan-back{display:none!important}
${P} .forge-lb-plan{display:flex;flex-direction:column;gap:12px;margin:4px 0 16px;color:#f3f7fc}
${P}:not(.forge-lb-plan-home){padding-bottom:150px!important}
${P} .forge-lb-plan-back{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));left:12px;z-index:70;box-shadow:0 8px 22px #000c;height:44px;border-radius:20px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font-size:14px;font-weight:700;padding:0 14px 0 10px;display:flex;align-items:center;gap:6px;margin:0 0 6px}
${P} .forge-lb-plan-head{display:flex;flex-direction:column;gap:2px;padding:6px 60px 0 6px}
${P} .forge-lb-plan-head h2{margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em;color:#f3f7fc}
${P} .forge-lb-plan-head span{font-size:13px;color:#95a3b7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${P} .forge-lb-hero{border-radius:28px;background:linear-gradient(160deg,#273d2d,#171e2a 60%);border:1px solid #405d39;padding:20px;display:flex;flex-direction:column;gap:14px}
${P} .forge-lb-hero small{font-size:12px;color:${ACC};font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
${P} .forge-lb-hero strong{display:block;font-size:26px;font-weight:800;line-height:1.15;margin-top:4px;overflow-wrap:anywhere}
${P} .forge-lb-hero p{margin:4px 0 0;font-size:14px;color:#c3cddb}
${P} .forge-lb-hero-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
${P} .forge-lb-hero-actions.single{grid-template-columns:minmax(0,1fr)}
${P} .forge-lb-start{height:56px;border-radius:28px;border:0;background:${ACC};color:#142016;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 14px}
${P} .forge-lb-shift{height:56px;border-radius:28px;border:1px solid #3a4556;background:#202a38;color:#f3f7fc;font-size:14px;font-weight:700;padding:0 18px}
${P} .forge-lb-week{background:#171e2a;border:1px solid #293346;border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:12px}
${P} .forge-lb-week-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
${P} .forge-lb-week-top small{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px}
${P} .forge-lb-week-top span{font-size:12px;color:#95a3b7}
${P} .forge-lb-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
${P} .forge-lb-day{height:62px;border-radius:14px;border:0;background:#141b26;color:#5d6a7e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:11px;padding:0;min-width:0}
${P} .forge-lb-day.train{background:#1a2a22;color:#f3f7fc}
${P} .forge-lb-day.train span{color:#95a3b7}
${P} .forge-lb-day b{font-size:15px;color:${ACC}}
${P} .forge-lb-day.today{border:2px solid ${ACC}}
${P} .forge-lb-day.today span{color:#f3f7fc}
${P} .forge-lb-day[aria-expanded="true"]{background:#24402c}
${P} .forge-lb-week-hint{font-size:12px;color:#95a3b7}
${P} .forge-lb-daydetail[hidden]{display:none!important}
${P} .forge-lb-daydetail{background:#141b26;border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
${P} .forge-lb-daydetail strong{font-size:15px}
${P} .forge-lb-daydetail div{display:flex;justify-content:space-between;gap:10px;font-size:14px}
${P} .forge-lb-daydetail div span:last-child{color:#95a3b7;white-space:nowrap}
${P} .forge-lb-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
${P} .forge-lb-tile{height:92px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;padding:0 16px;text-align:left;font-size:15px;font-weight:700}
${P} .forge-lb-row{height:50px;border-radius:16px;border:0;background:transparent;color:#95a3b7;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:space-between;padding:0 8px}
${P} .forge-lb-rows{display:flex;flex-direction:column;gap:2px;border-top:1px solid #1d2533;padding-top:4px}
${P} button:focus-visible{outline:2px solid ${ACC}!important;outline-offset:2px!important}
`;

let ui=null,openDay=-1;
function build(page){
 const root=el('section','forge-lb-plan');root.setAttribute('aria-label','Plan Übersicht');
 const back=el('button','forge-lb-plan-back');back.type='button';back.innerHTML=ICON.back+'<span>Plan-Übersicht</span>';
 back.addEventListener('click',()=>home(true));
 const head=el('div','forge-lb-plan-head');const h=el('h2','','Plan');const sub=el('span','','');head.append(h,sub);
 const hero=el('div','forge-lb-hero');
 const hk=el('small'),ht=el('strong'),hm=el('p');const htxt=el('div');htxt.append(hk,ht,hm);
 const acts=el('div','forge-lb-hero-actions');
 const start=el('button','forge-lb-start');start.type='button';start.innerHTML=ICON.play+'<span>Starten</span>';
 start.addEventListener('click',()=>{const a=$('forgeSimpleHeroAction');if(!a)return;if(a.dataset.action==='create'){detail(()=>clickTool(/Neuen Trainingsplan erstellen/));return;}a.click();});
 const shift=el('button','forge-lb-shift','Verschieben');shift.type='button';
 shift.addEventListener('click',()=>{try{if(window.ForgePlanShift?.open?.()!==false)return;}catch(e){}detail(()=>clickTool(/Verschieb|Wochenplan-Einstellungen/));});
 acts.append(start,shift);hero.append(htxt,acts);
 const week=el('div','forge-lb-week');
 const wt=el('div','forge-lb-week-top');const wl=el('small','','Deine Trainingswoche');const wm=el('span','','');wt.append(wl,wm);
 const days=el('div','forge-lb-days');days.setAttribute('role','group');days.setAttribute('aria-label','Trainingswoche');
 const dd=el('div','forge-lb-daydetail');dd.hidden=true;
 const wh=el('div','forge-lb-week-hint','Trainingstag antippen, um Übungen und Sätze anzusehen.');
 week.append(wt,days,dd,wh);
 const tiles=el('div','forge-lb-tiles');
 const edit=el('button','forge-lb-tile');edit.type='button';edit.innerHTML=ICON.edit+'<span>Plan bearbeiten</span>';
 edit.addEventListener('click',()=>detail(()=>{const b=findButton($('forgePolishPlanActions'),/Plan bearbeiten/);if(b)b.click();else clickTool(/Plan/);}));
 const neu=el('button','forge-lb-tile');neu.type='button';neu.innerHTML=ICON.plus+'<span>Neuer Plan</span>';
 neu.addEventListener('click',()=>detail(()=>clickTool(/Neuen Trainingsplan erstellen/)));
 tiles.append(edit,neu);
 const rows=el('div','forge-lb-rows');
 const cat=el('button','forge-lb-row');cat.type='button';cat.innerHTML='<span>Übungskatalog</span>'+ICON.chev;
 cat.addEventListener('click',()=>detail(()=>clickTool(/Übungskatalog/)));
 const arch=el('button','forge-lb-row');arch.type='button';arch.innerHTML='<span>Archivierte Pläne</span>'+ICON.chev;
 arch.addEventListener('click',()=>{try{if(typeof window.ForgeLayoutBProgressOpen==='function'&&window.ForgeLayoutBProgressOpen('archive'))return;}catch(e){console.error('FORGE Archiv',e);}detail(()=>clickTool(/Archivierte Pläne/));});
 const set=el('button','forge-lb-row');set.type='button';set.innerHTML='<span>Wochenplan-Einstellungen</span>'+ICON.chev;
 set.addEventListener('click',()=>detail(()=>clickTool(/Wochenplan-Einstellungen/)));
 rows.append(cat,arch,set);
 root.append(back,head,hero,week,tiles,rows);
 const anchor=page.querySelector(':scope > .forge-b-pagehead');
 if(anchor)anchor.after(root);else page.prepend(root);
 ui={root,sub,hk,ht,hm,start,startText:start.querySelector('span'),shift,acts,wm,days,dd,archText:arch.querySelector('span'),key:''};
}
function clickTool(re){
 const tools=$('forgeSlimTools');
 if(tools&&!tools.open)tools.open=true;
 const b=findButton(tools,re)||findButton($('plan'),re);
 if(b){b.click();setTimeout(()=>b.scrollIntoView?.({block:'start',behavior:'smooth'}),60);}
}
function detail(action){
 const page=$('plan');if(!page)return;
 page.classList.remove('forge-lb-plan-home');
 window.scrollTo(0,0);
 try{action&&action();}catch(e){console.error('FORGE Layout B Plan',e);}
}
function home(scroll){
 const page=$('plan');if(!page)return;
 page.classList.add('forge-lb-plan-home');
 if(scroll)window.scrollTo(0,0);
 render(true);
}
function render(force){
 if(!ui||typeof state==='undefined')return;
 const plans=Array.isArray(state.plan)?state.plan:[];
 const kicker=($('forgeSimpleHeroKicker')?.textContent||'').trim();
 const title=($('forgeSimpleHeroTitle')?.textContent||'').trim();
 const meta=($('forgeSimpleHeroMeta')?.textContent||'').trim();
 const action=$('forgeSimpleHeroAction')?.dataset.action||'start';
 let map=null;try{map=typeof window.forge130WeekTrainingMap==='function'?window.forge130WeekTrainingMap():null;}catch(e){}
 const today=mondayIndex(new Date());
 const cells=weekCells(map,plans,today);
 let cad='Feste Wochentage';
 try{const c=window.ForgeCadenceSchedule?.getActive?.();if(c&&c.every)cad='Alle '+c.every+' '+(c.every===1?'Tag':'Tage');}catch(e){}
 const archived=Array.isArray(state.forgePlanArchive)?state.forgePlanArchive.length:(Array.isArray(state.planArchive)?state.planArchive.length:null);
 const key=JSON.stringify([kicker,title,meta,action,cells.map(c=>c.letter+(c.plan?c.plan.id:'')),cad,openDay,state.activePlanName,plans.length,archived]);
 if(!force&&key===ui.key)return;
 ui.key=key;
 setText(ui.sub,state.activePlanName||(plans.length?'Mein Krafttraining':'Noch kein Plan'));
 const k=kicker?kicker.charAt(0).toUpperCase()+kicker.slice(1).toLowerCase():'Nächstes Training';
 setText(ui.hk,action==='resume'?'Training läuft':action==='create'?'Dein Start':'Nächstes Training · '+k.replace(/ geplant$/,'').replace(/^Heute$/,'heute').replace(/^Morgen$/,'morgen'));
 setText(ui.ht,title||'Krafttraining');
 setText(ui.hm,meta);
 setText(ui.startText,action==='resume'?'Weiter trainieren':action==='create'?'Plan erstellen':'Starten');
 const canShift=action==='start'&&plans.length>0;
 ui.shift.hidden=!canShift;ui.acts.classList.toggle('single',!canShift);
 setText(ui.wm,cad);
 ui.days.replaceChildren(...cells.map(c=>{
  const b=el('button','forge-lb-day'+(c.plan?' train':'')+(c.today?' today':''));b.type='button';
  b.append(el('span','',c.day));
  if(c.plan)b.append(el('b','',c.letter));else b.append(el('span','','–'));
  b.setAttribute('aria-label',c.day+(c.today?' (heute)':'')+(c.plan?': '+(c.plan.title||'Training'):': kein Training'));
  if(c.plan){b.setAttribute('aria-expanded',String(openDay===c.index));b.addEventListener('click',()=>{openDay=openDay===c.index?-1:c.index;render(true);});}
  else b.disabled=true;
  return b;
 }));
 const open=cells[openDay]&&cells[openDay].plan;
 ui.dd.hidden=!open;
 if(open){
  const rows=[el('strong','',open.title||'Training')];
  (open.ex||[]).forEach(e=>{const r=el('div');r.append(el('span','',e.name||'Übung'),el('span','',exerciseLine(e)));rows.push(r);});
  if(!(open.ex||[]).length)rows.push(el('div','','Noch keine Übungen'));
  ui.dd.replaceChildren(...rows);
 }
 if(archived!=null)setText(ui.archText,'Archivierte Pläne'+(archived?' ('+archived+')':''));
}
function tick(){
 if(!enabled())return;
 const page=$('plan');if(!page)return;
 if(!ui||!page.contains(ui.root)){ui=null;page.querySelectorAll(':scope > .forge-lb-plan').forEach(n=>n.remove());build(page);page.classList.add('forge-lb-plan-home');}
 if(page.classList.contains('active'))render(false);
}
function wrapGo(){
 const prior=window.go;
 if(typeof prior!=='function'||prior.forgeLbPlan)return;
 const w=function(p){const r=prior.apply(this,arguments);if(p==='plan'&&enabled()){openDay=-1;home(false);}return r;};
 w.forgeLbPlan=true;w.forgeLayoutB=prior.forgeLayoutB;window.go=w;try{go=w;}catch(e){}
}
function install(){
 if(!document.body||!enabled())return false;
 if(!$('forgeLayoutBPlanStyle')){const st=el('style');st.id='forgeLayoutBPlanStyle';st.textContent=CSS;document.head.append(st);}
 tick();wrapGo();setTimeout(wrapGo,900);
 setInterval(()=>{if(document.visibilityState!=='hidden')tick();},600);
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
