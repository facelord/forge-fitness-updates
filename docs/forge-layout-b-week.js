/* FORGE Layout B · Wochenplan-Einstellungen und Verschieben.
 * Ein Vollbild-Fenster für den aktiven Plan:
 *  - „Alle X Tage“: Rhythmus (Abstand, Einheiten im Wechsel, Starttag) mit
 *    Vorschau, nächstes Training verschieben (Datums-Chips) – über
 *    ForgeCadenceSchedule.updateActiveInterval / postponeNextWorkout.
 *  - Feste Wochentage: jede Einheit auf einen anderen Tag legen, nur diese
 *    Woche oder dauerhaft, belegte Tage werden getauscht – über
 *    forge130ChangeWeek.
 *  - Umstellen zwischen festen Wochentagen und „alle X Tage“ ohne neuen Plan
 *    (gleiches Format wie cadence.js nach der Planerstellung).
 * No new data model; confirmations are in-app sheets, never native dialogs.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ACC='#a9f267';
const DAYS=Object.freeze(['Mo','Di','Mi','Do','Fr','Sa','So']);
const DAY_FULL=Object.freeze(['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']);
const MAX_UNITS=4;

/* ---------- pure helpers (tested) ---------- */
function letter(i){return String.fromCharCode(65+i);}
function stripSuffix(title){
 return String(title||'Training').replace(/\s*·\s*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\s*$/,'').replace(/\s*·\s*Einheit\s+[A-Z]\s*$/i,'').trim()||'Training';
}
function titleForSlot(title,i,n){return stripSuffix(title)+(n>1?' · Einheit '+letter(i):'');}
function titleForWeekday(title,d){return stripSuffix(title)+' · '+DAY_FULL[d];}
function addDays(iso,n){const [y,m,d]=iso.split('-').map(Number);const t=new Date(Date.UTC(y,m-1,d+n));return t.toISOString().slice(0,10);}
function weekdayOf(iso){const [y,m,d]=iso.split('-').map(Number);return (new Date(Date.UTC(y,m-1,d)).getUTCDay()+6)%7;}
function shortDate(iso){const [,m,d]=iso.split('-').map(Number);return DAYS[weekdayOf(iso)]+' '+d+'.'+m+'.';}
function shiftChoices(dueIso,count){return Array.from({length:count||7},(_,i)=>addDays(dueIso,i+1));}
/* Interval cadence for an existing weekday plan (same shape cadence.js stores). */
function toIntervalPlan(plan,every,anchor){
 const order=plan.slice().sort((a,b)=>a.weekday-b.weekday);
 return {titles:order.map((p,i)=>[p.id,titleForSlot(p.title,i,order.length)]),
  cadence:{mode:'interval',every:Number(every),anchor:String(anchor),planOrder:order.map(p=>p.id)}};
}
/* Weekdays for a rolling plan: active rotation first, paused units after. */
function toWeekdayPlan(plan,cadence,days){
 const order=(cadence&&Array.isArray(cadence.planOrder)?cadence.planOrder:[]).map(id=>plan.find(p=>String(p.id)===String(id))).filter(Boolean);
 plan.forEach(p=>{if(!order.includes(p))order.push(p);});
 const sorted=[...new Set(days)].sort((a,b)=>a-b);
 if(sorted.length!==order.length)return null;
 return order.map((p,i)=>[p.id,sorted[i],titleForWeekday(p.title,sorted[i])]);
}
window.ForgeLayoutBWeek=Object.freeze({letter,stripSuffix,titleForSlot,titleForWeekday,addDays,weekdayOf,shortDate,shiftChoices,toIntervalPlan,toWeekdayPlan,MAX_UNITS});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
const C=()=>window.ForgeCadenceCore;
const S=()=>window.ForgeCadenceSchedule;
const plans=()=>typeof state!=='undefined'&&Array.isArray(state.plan)?state.plan:[];
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function active(){try{return S()?.getActive()||null;}catch(e){return null;}}
function weekMoves(){try{return typeof forge130WeekMoves==='function'?forge130WeekMoves():{};}catch(e){return {};}}
function curDay(p){try{return typeof forge130Weekday==='function'?forge130Weekday(p):p.weekday;}catch(e){return p.weekday;}}
function unitLabel(p,c){
 if(c){const i=c.planOrder.findIndex(id=>String(id)===String(p.id));return i>=0?'Einheit '+letter(i):'Pausiert';}
 return DAY_FULL[p.weekday]||'Einheit';
}
function store(){if(typeof save==='function')save();}
function refreshApp(){try{if(typeof window.render==='function')window.render();}catch(e){console.error('FORGE Wochenplan',e);}}

const ICON={
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 swap:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>'
};
const W='.forge-lb-weekplan';
const CSS=`
${W}{position:fixed;inset:0;z-index:2147480000;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
${W} .wk-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(16px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom))}
${W} .wk-top{display:flex;align-items:center;justify-content:space-between;min-height:44px}
${W} .wk-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${W} .wk-kicker{font-size:14px;color:#95a3b7;font-weight:600}
${W} .wk-head{padding:14px 4px 4px}
${W} .wk-head h1{margin:0;font-size:24px;font-weight:800;line-height:1.15}
${W} .wk-head p{margin:4px 0 0;font-size:14px;color:#c3cddb;line-height:1.45}
${W} .wk-body{flex:1;min-height:0;overflow-y:auto;padding:12px 0 8px;display:flex;flex-direction:column;gap:12px;scrollbar-width:none;overscroll-behavior:contain}
${W} .wk-body::-webkit-scrollbar{display:none}
${W} .wk-card{flex:0 0 auto;background:#171e2a;border:1px solid #293346;border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:10px}
${W} .wk-card.hl{border-color:#405d39;background:linear-gradient(160deg,#273d2d,#171e2a 60%)}
${W} .wk-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding-left:2px}
${W} .wk-title{font-size:17px;font-weight:800}
${W} .wk-note{font-size:13px;color:#95a3b7;line-height:1.5;margin:0}
${W} .wk-grid{display:grid;gap:6px}
${W} .wk-opt{min-height:46px;border-radius:14px;border:1px solid #293346;background:#0f1620;color:#f3f7fc;font:inherit;font-size:15px;font-weight:600;padding:6px 4px;line-height:1.15}
${W} .wk-opt small{display:block;font-size:11px;color:#95a3b7;font-weight:600;margin-top:2px}
${W} .wk-opt[aria-pressed="true"]{border:2px solid ${ACC};background:#1a2a22;font-weight:800}
${W} .wk-opt.day[aria-pressed="true"]{background:${ACC};color:#142016;border-color:${ACC}}
${W} .wk-opt.day[aria-pressed="true"] small{color:#142016}
${W} .wk-opt:disabled{opacity:.35}
${W} .wk-field{display:flex;flex-direction:column;gap:6px}
${W} .wk-field input{height:50px;border-radius:14px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:16px;padding:0 14px;box-sizing:border-box;width:100%}
${W} .wk-preview{display:flex;flex-wrap:wrap;gap:6px}
${W} .wk-preview span{font-size:12px;border-radius:12px;background:#0f1620;border:1px solid #293346;padding:6px 10px;color:#c3cddb}
${W} .wk-preview span b{color:#f3f7fc}
${W} .wk-unit{display:flex;align-items:center;gap:12px;min-height:60px;border-radius:16px;border:1px solid #293346;background:#0f1620;color:#f3f7fc;font:inherit;text-align:left;padding:8px 12px}
${W} .wk-unit i{width:40px;height:40px;flex:0 0 40px;border-radius:12px;background:#202a38;color:${ACC};font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:14px}
${W} .wk-unit span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
${W} .wk-unit b{font-size:15px;font-weight:700;overflow-wrap:anywhere}
${W} .wk-unit small{font-size:12px;color:#95a3b7}
${W} .wk-unit em{font-style:normal;font-size:13px;color:${ACC};font-weight:700;white-space:nowrap}
${W} .wk-unit.moved small{color:#ffb547}
${W} .wk-main{height:58px;border-radius:29px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800;flex:0 0 auto}
${W} .wk-main:disabled{opacity:.45}
${W} .wk-sec{min-height:48px;border-radius:24px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;padding:0 16px;flex:0 0 auto}
${W} .wk-link{border:0;background:transparent;color:${ACC};font:inherit;font-size:14px;font-weight:700;padding:10px 4px;text-align:left;flex:0 0 auto}
${W} .wk-status{font-size:13px;text-align:center;margin:0;min-height:16px;font-weight:600;color:${ACC}}
${W} .wk-status.err{color:#ffb4b8}
${W} .wk-seg{height:50px;flex:0 0 auto;border-radius:25px;background:#0f1620;border:1px solid #293346;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:4px;box-sizing:border-box;gap:4px}
${W} .wk-seg button{border:0;border-radius:21px;background:transparent;color:#95a3b7;font:inherit;font-size:14px;font-weight:600}
${W} .wk-seg button[aria-checked="true"]{background:${ACC};color:#142016;font-weight:800}
${W} button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
.forge-lb-wk-shade{position:fixed;inset:0;z-index:2147480500;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-wk-sheet{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:12px 16px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box}
.forge-lb-wk-sheet .h{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center}
.forge-lb-wk-sheet strong{font-size:22px;font-weight:800}
.forge-lb-wk-sheet p{margin:0;font-size:14px;color:#c3cddb;line-height:1.5}
.forge-lb-wk-sheet .m{height:56px;border-radius:28px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800}
.forge-lb-wk-sheet .s{height:50px;border-radius:25px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
`;
function ensureCss(){if(!$('forgeLayoutBWeekCss')){const s=el('style');s.id='forgeLayoutBWeekCss';s.textContent=CSS;document.head.append(s);}}

/* ---------- window ---------- */
let root=null,ui=null;
function open(focus){
 if(!enabled())return false;
 if(!plans().length){if(typeof window.ForgeLayoutBWizardOpen==='function')return window.ForgeLayoutBWizardOpen('strength');return false;}
 ensureCss();close();
 const c=active();
 ui={focus:focus||'',status:'',tone:'',convert:false,
  every:c?c.every:3,units:c?Math.min(MAX_UNITS,c.planOrder.length):Math.min(MAX_UNITS,plans().length),anchor:c?c.anchor:today(),
  shiftTo:'',days:c?[]:plans().map(p=>p.weekday).sort((a,b)=>a-b)};
 root=el('div','forge-lb-weekplan');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Wochenplan');
 document.body.append(root);document.addEventListener('keydown',onKey,true);
 render();
 if(focus){requestAnimationFrame(()=>root?.querySelector('[data-focus="'+focus+'"]')?.scrollIntoView?.({block:'start'}));}
 return true;
}
function close(){if(root){closeSheet();root.remove();root=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();if(sheet)closeSheet();else close();}
function setStatus(text,tone){ui.status=text;ui.tone=tone||'';}
function render(){
 if(!root)return;
 const keep=root.querySelector('.wk-body')?.scrollTop||0;
 root.replaceChildren();
 const inner=el('div','wk-in');root.append(inner);
 const top=el('div','wk-top');const x=btn('wk-round','',close);x.innerHTML=ICON.x;x.setAttribute('aria-label','Schließen');
 top.append(x,el('div','wk-kicker','Wochenplan'),el('div',''));top.lastChild.style.width='44px';inner.append(top);
 const c=active();
 const head=el('div','wk-head');
 head.append(el('h1','',(typeof state!=='undefined'&&state.activePlanName)||'Dein Trainingsplan'),
  el('p','',c?'Alle '+c.every+' '+(c.every===1?'Tag':'Tage')+' · '+c.planOrder.length+' '+(c.planOrder.length===1?'Einheit':'Einheiten im Wechsel'):'Feste Wochentage · '+plans().length+' '+(plans().length===1?'Trainingstag':'Trainingstage')));
 inner.append(head);
 const body=el('div','wk-body');inner.append(body);
 if(typeof state!=='undefined'&&state.activeWorkout){
  body.append(el('p','wk-note','Während eines laufenden Trainings bleibt der Wochenplan unverändert. Beende zuerst dein Workout.'));
  return;
 }
 if(ui.convert)renderConvert(body,c);
 else if(c){renderShift(body,c);renderRhythm(body,c);}
 else renderWeekdays(body);
 if(!ui.convert){
  const sw=btn('wk-link',c?'Auf feste Wochentage umstellen':'Auf „alle X Tage“ umstellen',()=>{ui.convert=true;setStatus('');render();});
  body.append(sw);
 }
 const st=el('p','wk-status'+(ui.tone?' '+ui.tone:''),ui.status);st.setAttribute('role','status');inner.append(st);
 requestAnimationFrame(()=>{body.scrollTop=keep;});
}
function opt(label,sub,on,fn,cls,disabled){
 const b=btn('wk-opt'+(cls?' '+cls:''),'',fn);b.append(document.createTextNode(label));if(sub)b.append(el('small','',sub));
 b.setAttribute('aria-pressed',String(!!on));if(disabled)b.disabled=true;return b;
}
function grid(cols,items){const g=el('div','wk-grid');g.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';items.forEach(i=>g.append(i));return g;}
function preview(cad,from,n){
 const box=el('div','wk-preview');
 try{C().upcoming(cad,from,n).forEach(e=>{const i=cad.planOrder.findIndex(id=>String(id)===String(e.planId));const s=el('span');s.append(document.createTextNode(shortDate(e.date)+' '));s.append(el('b','',i>=0?letter(i):'?'));box.append(s);});}catch(err){box.append(el('span','',err.message||'Ungültiger Rhythmus'));}
 return box;
}

/* --- rolling plan: move the next workout --- */
function renderShift(body,c){
 let due=null;try{due=C().next(c,today());}catch(e){}
 const card=el('div','wk-card hl');card.dataset.focus='shift';
 card.append(el('div','wk-label','Nächstes Training verschieben'));
 if(!due){card.append(el('p','wk-note','Kein nächstes Training gefunden.'));body.append(card);return;}
 const i=c.planOrder.findIndex(id=>String(id)===String(due.planId));
 card.append(el('div','wk-title','Einheit '+letter(Math.max(0,i))+' · '+(due.date===today()?'heute':shortDate(due.date))));
 const choices=shiftChoices(due.date,8);
 if(!ui.shiftTo||ui.shiftTo<=due.date)ui.shiftTo=choices[0];
 card.append(grid(4,choices.map(d=>opt(DAYS[weekdayOf(d)],d.slice(8,10)+'.'+d.slice(5,7)+'.',ui.shiftTo===d,()=>{ui.shiftTo=d;setStatus('');render();},'day'))));
 const f=el('label','wk-field');f.append(el('span','wk-label','Oder anderes Datum'));
 const inp=el('input');inp.type='date';inp.min=choices[0];inp.max=addDays(today(),90);inp.value=ui.shiftTo;
 inp.addEventListener('change',()=>{if(inp.value){ui.shiftTo=inp.value;setStatus('');render();}});f.append(inp);card.append(f);
 let moved=null;try{moved=C().postponeNext(c,today(),ui.shiftTo).cadence;}catch(e){}
 if(moved){card.append(el('div','wk-label','Danach'));card.append(preview(moved,ui.shiftTo,4));}
 card.append(el('p','wk-note','Die Einheit bleibt dieselbe, alle folgenden Trainings rücken im gleichen Abstand mit.'));
 card.append(btn('wk-main','Auf '+shortDate(ui.shiftTo)+' verschieben',()=>{
  const r=S().postponeNextWorkout({fromDate:due.date,toDate:ui.shiftTo});
  if(!r||!r.ok){setStatus(r?.error||'Verschieben fehlgeschlagen.','err');render();return;}
  ui.shiftTo='';setStatus('Verschoben auf '+shortDate(r.after.date)+(r.next?' · danach '+shortDate(r.next.date):''));
  const a=active();if(a){ui.anchor=a.anchor;}
  render();
 }));
 body.append(card);
}
/* --- rolling plan: rhythm --- */
function renderRhythm(body,c){
 const card=el('div','wk-card');card.dataset.focus='rhythm';
 card.append(el('div','wk-label','Trainingsrhythmus'));
 const ev=[2,3,4,5,7];if(!ev.includes(ui.every))ev.push(ui.every);ev.sort((a,b)=>a-b);
 card.append(el('div','wk-note','Alle wie viele Tage?'));
 card.append(grid(Math.min(6,ev.length),ev.map(n=>opt(String(n),'',ui.every===n,()=>{ui.every=n;setStatus('');render();}))));
 const n=c.planOrder.length;
 card.append(el('div','wk-note','Verschiedene Einheiten im Wechsel'));
 card.append(grid(4,[1,2,3,4].map(k=>opt(k===1?'Nur A':'A–'+letter(k-1),'',ui.units===k,()=>{ui.units=k;setStatus('');render();},'',false))));
 if(ui.units>n)card.append(el('p','wk-note','Neue Einheiten starten als Kopie von Einheit A – du kannst sie danach in „Plan bearbeiten“ anpassen.'));
 if(ui.units<n)card.append(el('p','wk-note','Nicht benötigte Einheiten werden nur pausiert, nichts wird gelöscht.'));
 const f=el('label','wk-field');f.append(el('span','wk-label','Erster Trainingstag (Einheit A)'));
 const inp=el('input');inp.type='date';inp.value=ui.anchor;inp.addEventListener('change',()=>{if(inp.value){ui.anchor=inp.value;setStatus('');render();}});f.append(inp);card.append(f);
 try{
  const order=c.planOrder.slice(0,Math.min(n,ui.units));while(order.length<ui.units)order.push('__new'+order.length);
  const prop={mode:'interval',every:ui.every,anchor:ui.anchor,planOrder:order};C().validate(prop);
  card.append(el('div','wk-label','Vorschau'));card.append(preview(prop,ui.anchor<today()?today():ui.anchor,5));
 }catch(e){}
 const same=ui.every===c.every&&ui.anchor===c.anchor&&ui.units===c.planOrder.length;
 const save=btn('wk-main','Rhythmus speichern',()=>{
  const r=S().updateActiveInterval({every:ui.every,anchor:ui.anchor,unitCount:ui.units});
  if(!r||!r.ok){setStatus(r?.error||'Rhythmus konnte nicht gespeichert werden.','err');render();return;}
  setStatus(!r.changed?'Rhythmus unverändert.':r.created?'Gespeichert · '+r.created+' neue Einheit(en) als Kopie ergänzt.':r.paused?'Gespeichert · übrige Einheiten pausiert.':'Rhythmus gespeichert.');
  refreshApp();render();
 });
 save.disabled=same;card.append(save);
 body.append(card);
}
/* --- weekday plan: move units --- */
function renderWeekdays(body){
 const card=el('div','wk-card hl');card.dataset.focus='shift';
 card.append(el('div','wk-label','Trainingstage'));
 card.append(el('p','wk-note','Einheit antippen, um sie auf einen anderen Tag zu legen – nur diese Woche oder dauerhaft.'));
 const moves=weekMoves();
 plans().slice().sort((a,b)=>curDay(a)-curDay(b)).forEach(p=>{
  const d=curDay(p),moved=Object.prototype.hasOwnProperty.call(moves,p.id)&&d!==p.weekday;
  const b=btn('wk-unit'+(moved?' moved':''),'',()=>moveSheet(p));
  const i=el('i','',DAYS[d]);
  const t=el('span');t.append(el('b','',p.title||'Training'),el('small','',moved?'Diese Woche verschoben (sonst '+DAY_FULL[p.weekday]+')':(p.ex||[]).length+((p.ex||[]).length===1?' Übung':' Übungen')));
  const e=el('em','');e.innerHTML=ICON.swap;
  b.append(i,t,e);card.append(b);
 });
 body.append(card);
}
function moveSheet(p){
 let target=curDay(p),mode='week';
 openSheet('Einheit verschieben',s=>{
  const draw=()=>{
   s.replaceChildren(el('div','h'));
   s.append(el('strong','',p.title||'Training'));
   const occ=d=>plans().find(x=>x.id!==p.id&&(mode==='permanent'?x.weekday:curDay(x))===d);
   const g=el('div','wk-grid');g.style.gridTemplateColumns='repeat(7,minmax(0,1fr))';
   DAYS.forEach((dn,d)=>{const o=occ(d);const b=opt(dn,o?'belegt':'',target===d,()=>{target=d;draw();},'day');g.append(b);});
   const wrap=el('div','forge-lb-weekplan');wrap.style.cssText='position:static;background:transparent;display:block';wrap.append(g);s.append(wrap);
   const seg=el('div','wk-seg');seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label','Gültigkeit');
   [['week','Nur diese Woche'],['permanent','Dauerhaft']].forEach(([v,t])=>{const b=btn('',t,()=>{mode=v;draw();});b.setAttribute('role','radio');b.setAttribute('aria-checked',String(mode===v));seg.append(b);});
   const w2=el('div','forge-lb-weekplan');w2.style.cssText='position:static;background:transparent;display:block';w2.append(seg);s.append(w2);
   const cur=mode==='permanent'?p.weekday:curDay(p);
   const o=occ(target);
   const moves=Object.keys(weekMoves()).length;
   let note=target===cur?'Die Einheit liegt bereits auf '+DAY_FULL[target]+'.':o?DAY_FULL[target]+' ist mit „'+(o.title||'Training')+'“ belegt – beide Tage werden getauscht.':'Neuer Tag: '+DAY_FULL[target]+'.';
   if(mode==='permanent'&&moves)note+=' Die Verschiebungen dieser Woche werden dabei zurückgesetzt.';
   s.append(el('p','',note));
   const ok=btn('m',o&&target!==cur?'Tage tauschen':'Übernehmen',()=>{
    if(target===cur){closeSheet();return;}
    const prev=window.confirm,prevA=window.alert;let msg='';
    window.confirm=()=>true;window.alert=m=>{msg=String(m);};
    try{typeof forge130ChangeWeek==='function'&&forge130ChangeWeek(p.id,target,mode);}finally{window.confirm=prev;window.alert=prevA;}
    closeSheet();
    if(msg)setStatus(msg,'err');else setStatus((mode==='permanent'?'Dauerhaft':'Diese Woche')+' auf '+DAY_FULL[target]+' gelegt.');
    render();
   });
   ok.disabled=target===cur;s.append(ok,btn('s','Abbrechen',closeSheet));
  };
  draw();
 });
}
/* --- switch rhythm type for the existing plan --- */
function renderConvert(body,c){
 const card=el('div','wk-card hl');
 if(c){
  const n=plans().length;
  card.append(el('div','wk-label','Auf feste Wochentage umstellen'));
  card.append(el('p','wk-note','Wähle '+n+' '+(n===1?'Tag':'Tage')+' – für jede Einheit einen. Einheit A kommt auf den ersten Tag, B auf den zweiten …'));
  card.append(grid(7,DAYS.map((d,i)=>opt(d,'',ui.days.includes(i),()=>{ui.days=ui.days.includes(i)?ui.days.filter(x=>x!==i):ui.days.length<n?ui.days.concat(i).sort((a,b)=>a-b):ui.days;setStatus('');render();},'day'))));
  card.append(el('p','wk-note',ui.days.length+' von '+n+' gewählt'));
  const go=btn('wk-main','Umstellen',()=>convertToWeekdays(c));go.disabled=ui.days.length!==n;card.append(go);
 }else{
  card.append(el('div','wk-label','Auf „alle X Tage“ umstellen'));
  if(plans().length>MAX_UNITS){
   card.append(el('p','wk-note','Im Wechsel sind höchstens '+MAX_UNITS+' Einheiten möglich – dein Plan hat '+plans().length+'. Erstelle dafür einen neuen Plan mit „Individuell“ oder „Automatisch“.'));
  }else{
   const ev=[2,3,4,5,7];if(!ev.includes(ui.every))ev.push(ui.every);ev.sort((a,b)=>a-b);
   card.append(el('p','wk-note','Alle wie viele Tage?'));
   card.append(grid(Math.min(6,ev.length),ev.map(n=>opt(String(n),'',ui.every===n,()=>{ui.every=n;render();}))));
   const f=el('label','wk-field');f.append(el('span','wk-label','Erster Trainingstag (Einheit A)'));
   const inp=el('input');inp.type='date';inp.value=ui.anchor;inp.addEventListener('change',()=>{if(inp.value){ui.anchor=inp.value;render();}});f.append(inp);card.append(f);
   const conv=toIntervalPlan(plans(),ui.every,ui.anchor);
   card.append(el('p','wk-note','Deine '+plans().length+' Einheiten wechseln sich ab: '+conv.cadence.planOrder.map((id,i)=>letter(i)+' = '+DAY_FULL[plans().find(p=>p.id===id).weekday]).join(', ')+'.'));
   card.append(preview(conv.cadence,ui.anchor<today()?today():ui.anchor,5));
   card.append(btn('wk-main','Umstellen',convertToInterval));
  }
 }
 card.append(btn('wk-sec','Zurück',()=>{ui.convert=false;setStatus('');render();}));
 body.append(card);
}
function snapshot(){return JSON.stringify({plan:state.plan,settings:state.settings,moves:state.forgeWeekMoves??null});}
function restore(snap){const o=JSON.parse(snap);state.plan=o.plan;state.settings=o.settings;state.forgeWeekMoves=o.moves;}
function convertToInterval(){
 const snap=snapshot();
 try{
  const conv=toIntervalPlan(plans(),ui.every,ui.anchor);
  C().validate(conv.cadence);
  conv.titles.forEach(([id,t])=>{const p=plans().find(x=>x.id===id);if(p)p.title=t;});
  state.settings={...state.settings,days:conv.cadence.planOrder.length,cadence:conv.cadence};
  state.forgeWeekMoves=null;store();
 }catch(e){
  console.error('FORGE Umstellen',e);restore(snap);
  setStatus('Umstellen fehlgeschlagen. Dein Plan bleibt unverändert.','err');render();return;
 }
 ui.convert=false;ui.days=[];const a=active();if(a){ui.units=a.planOrder.length;ui.anchor=a.anchor;ui.every=a.every;}
 setStatus('Umgestellt auf alle '+ui.every+' Tage.');refreshApp();render();
}
function convertToWeekdays(c){
 const snap=snapshot();
 try{
  const map=toWeekdayPlan(plans(),c,ui.days);if(!map)throw Error('Tage');
  map.forEach(([id,d,t])=>{const p=plans().find(x=>x.id===id);if(p){p.weekday=d;p.title=t;}});
  state.plan.sort((a,b)=>a.weekday-b.weekday);
  state.settings={...state.settings,cadence:null,days:state.plan.length,weekdays:state.plan.map(p=>p.weekday)};
  state.forgeWeekMoves=null;store();
 }catch(e){
  console.error('FORGE Umstellen',e);restore(snap);
  setStatus('Umstellen fehlgeschlagen. Dein Plan bleibt unverändert.','err');render();return;
 }
 ui.convert=false;ui.days=state.plan.map(p=>p.weekday);setStatus('Umgestellt auf feste Wochentage.');refreshApp();render();
}

/* ---------- sheets ---------- */
let sheet=null;
function openSheet(label,build){
 closeSheet();
 const shade=el('div','forge-lb-wk-shade');shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-label',label);
 const s=el('div','forge-lb-wk-sheet');shade.append(s);
 shade.addEventListener('click',e=>{if(e.target===shade)closeSheet();});
 document.body.append(shade);sheet=shade;build(s);
}
function closeSheet(){if(sheet){sheet.remove();sheet=null;}}

/* ---------- entry points ---------- */
function intercept(e){
 if(!enabled())return;
 const t=e.target.closest&&e.target.closest('button');if(!t||!t.closest('#plan'))return;
 const txt=(t.textContent||'').trim();
 if(t.classList.contains('forge-lb-shift')){e.preventDefault();e.stopImmediatePropagation();open('shift');return;}
 if(t.classList.contains('forge-lb-row')&&/^Wochenplan-Einstellungen/.test(txt)){e.preventDefault();e.stopImmediatePropagation();open();}
}
function install(){
 if(!document.body||!enabled())return false;
 document.addEventListener('click',intercept,true);
 window.ForgeLayoutBWeekOpen=open;
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
