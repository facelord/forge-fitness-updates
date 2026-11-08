/* FORGE Layout B · Phase 2: Workout-Ablauf (Design „B ausgebaut“).
 * - Vor dem Start: Tagesform 1–5 als große Auswahl
 * - Satz erfassen: Fortschritt je Übung, Uhr, Übungsbild mit Technik,
 *   Satzleiste (A · 1 ✓ · Satz 2 jetzt · 3 offen), Tagesform/zuletzt,
 *   große +/−-Karten für kg und Wdh., unten Tauschen · Satz fertig · Nächste
 * - Wischen auf dem Übungsbild = vorige/nächste Übung
 * - Satzpause als eigener Bildschirm mit Ring, „Zum nächsten Satz“
 * Presentation only: every action is delegated to the existing native
 * controls (save, rest, swap, warm-up, focus navigation). No state writes.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ACC='#a9f267';

/* ---------- pure helpers (tested) ---------- */
function parseClock(text){
 const m=String(text||'').trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
 if(!m)return null;
 return (Number(m[1]||0)*3600)+Number(m[2])*60+Number(m[3]);
}
function formatShort(sec){
 sec=Math.max(0,Math.round(Number(sec)||0));
 const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
 return h?h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):m+':'+String(s).padStart(2,'0');
}
function fmtKg(v){
 const n=Number(String(v??'').replace(',','.'));
 if(!Number.isFinite(n)||String(v??'').trim()==='')return '';
 return (Math.round(n*100)/100).toLocaleString('de-DE');
}
/* Set chips for one exercise. sets: [{kg,reps,done}], current j (or -1). */
function chipModel(sets,current,warm,warming){
 const out=[];
 if(warm&&Array.isArray(warm.sets)&&warm.sets.length){
  const done=warm.sets.every(s=>s&&s.done);
  const s=warm.sets[warm.sets.length-1]||{};
  if(warming)out.push({kind:'warm',label:'A',sub:'jetzt',current:true,done:false});
  else out.push({kind:'warm',label:'A',sub:done&&fmtKg(s.kg)?fmtKg(s.kg)+'×'+(s.reps||''):done?'✓':'offen',done});
 }else out.push({kind:'warm-add',label:'A',sub:'+ Aufw.',done:false});
 (Array.isArray(sets)?sets:[]).forEach((s,j)=>{
  const done=!!(s&&s.done),kg=fmtKg(s&&s.kg),reps=s&&s.reps!=null?String(s.reps):'';
  if(j===current&&!warming)out.push({kind:'set',j,label:'Satz '+(j+1),sub:'jetzt',current:true,done});
  else if(done)out.push({kind:'set',j,label:(j+1)+' ✓',sub:kg?kg+'×'+reps:reps+' Wdh.',done:true});
  else out.push({kind:'set',j,label:String(j+1),sub:'offen',done:false});
 });
 return out;
}
function exerciseStates(draft,focusI){
 const ex=Array.isArray(draft&&draft.exercises)?draft.exercises:[];
 return ex.map((e,i)=>{
  const sets=Array.isArray(e&&e.sets)?e.sets:[];
  const all=sets.length>0&&sets.every(s=>s&&s.done),some=sets.some(s=>s&&s.done);
  return i===focusI?'current':all?'done':some?'partial':'open';
 });
}

function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0;}
function maxKg(entry){return Math.max(0,...((entry&&entry.sets)||[]).map(x=>num(x&&x.kg)));}
function weekStart(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x.getTime();}
/* Summary for the „Training fertig“ screen. workouts: state.workouts (last = just saved). */
function finishSummary(workouts,weeklyTarget){
 const list=Array.isArray(workouts)?workouts:[];
 const w=list[list.length-1];if(!w)return null;
 const prior=list.slice(0,-1);
 const entries=(w.entries||[]).filter(e=>e&&Array.isArray(e.sets)&&e.sets.length);
 let sets=0,volume=0;
 for(const e of entries)for(const x of e.sets){sets++;volume+=num(x.kg)*num(x.reps);}
 const compare=entries.slice(0,4).map(e=>{
  let prev=null;
  for(let k=prior.length-1;k>=0;k--){const pe=(prior[k].entries||[]).find(z=>z&&z.name===e.name&&Array.isArray(z.sets)&&z.sets.length);if(pe){prev=pe;break;}}
  if(!prev)return {name:e.name,text:'neu heute',tone:'muted'};
  const d=Math.round((maxKg(e)-maxKg(prev))*100)/100;
  if(d>0)return {name:e.name,text:'+'+fmtKg(d)+' kg',tone:'up'};
  if(d<0)return {name:e.name,text:fmtKg(d)+' kg',tone:'muted'};
  return {name:e.name,text:'gleich',tone:'muted'};
 });
 let best=null;
 for(const e of entries){
  const before=Math.max(0,...prior.flatMap(p=>(p.entries||[]).filter(z=>z&&z.name===e.name).map(maxKg)));
  const now=maxKg(e);
  if(before>0&&now>before){
   const top=e.sets.reduce((a,x)=>num(x.kg)>num(a.kg)?x:a,e.sets[0]);
   if(!best||now-before>best.gain)best={name:e.name,text:fmtKg(top.kg)+' kg × '+(top.reps??''),gain:now-before};
  }
 }
 const ws=weekStart(w.date||Date.now());
 const week=list.filter(x=>x&&x.date&&weekStart(x.date)===ws).length;
 return {title:w.title||'Training',minutes:Math.max(1,Math.round(num(w.durationMs)/60000)),sets,volume:Math.round(volume),
  compare,best,week,weekTarget:Math.max(1,Number(weeklyTarget)||0)};
}
window.ForgeLayoutBWorkout=Object.freeze({parseClock,formatShort,fmtKg,chipModel,exerciseStates,finishSummary});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function live(){return typeof state!=='undefined'&&state&&state.activeWorkout?state:null;}
function plan(){
 const s=live();if(!s)return null;
 return (s.plan||[]).find(p=>String(p.id)===String(s.activeWorkout.planId))||null;
}
function focus(){
 const p=plan();if(!p||typeof window.forge130CurrentFocus!=='function')return null;
 try{const f=window.forge130CurrentFocus(p);return f&&Number.isInteger(f.i)?f:null;}catch(e){return null;}
}
function workoutVisible(){return $('workout')?.classList.contains('active');}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function setText(node,text){if(node&&node.textContent!==text)node.textContent=text;}
const SVG={
 list:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
 swap:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
 check:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>',
 next:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
 flag:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
 up:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
 trend:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="'+ACC+'" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 17l6-6 4 4 6-7"/></svg>',
 pause:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
 play:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>'
};

/* ---------- styles ---------- */
const S='body.forge-layout-b #workout.forge-lb-live.forge-premium-layout';
const H=S+' #forgePremiumShell.forge-b-shell';
const D=H+' #forgeQuickWorkout .forge130-focus-card-grid>label.forge-v8-dial';
const CSS=`
${S}{overflow:clip!important}
${H}{grid-template-rows:46px minmax(118px,1fr) 50px auto 0px minmax(178px,1.2fr) 74px!important;row-gap:10px!important;padding:10px 14px 8px!important;background:#0b1018!important;max-width:560px!important}
${H}>.forge-b-header,${H}>.forge-b-status,${H}>.forge-b-hud,${H}>.forge-b-footer{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;opacity:0!important;pointer-events:none!important;grid-row:auto!important}
${H} .forge-lb-top{grid-row:1;display:flex;align-items:center;gap:10px;min-width:0}
${H} .forge-lb-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${H} .forge-lb-segs{flex:1;display:flex;gap:4px;min-width:0}
${H} .forge-lb-segs span{flex:1;height:5px;border-radius:3px;background:#293346}
${H} .forge-lb-segs span.done{background:rgba(169,242,103,.55)}
${H} .forge-lb-segs span.partial{background:#405d39}
${H} .forge-lb-segs span.current{background:${ACC}}
${H} .forge-lb-clock{height:34px;padding:0 11px;border-radius:17px;background:#171e2a;border:1px solid #293346;color:#f3f7fc;font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}
${H} .forge-lb-clock i{width:7px;height:7px;border-radius:4px;background:${ACC};display:block}
${H} .forge-lb-clock.paused i{background:#ffb547}
${H} .forge-lb-clock.paused{color:#ffd28a}
${H} .forge-b-media{grid-row:2!important;border-radius:24px!important;border:1px solid #293346!important;background:#121925!important}
${H} .forge-b-counter,${H} .forge-b-media-arrows,${H} .forge-b-set-heading{display:none!important}
${H} .forge-b-media-shade{background:linear-gradient(180deg,rgba(11,16,24,0) 35%,rgba(11,16,24,.94))!important}
${H} .forge-b-media-bottom{left:16px!important;right:12px!important;bottom:12px!important;align-items:flex-end!important}
${H} #forgeBExerciseName{font-size:clamp(21px,6vw,26px)!important;font-weight:800!important;letter-spacing:-.02em!important;max-width:100%!important}
${H} .forge-lb-target{font-size:13px;color:#c3cddb;margin-top:3px;font-weight:500}
${H} .forge-lb-tech{position:absolute;right:12px;bottom:12px;z-index:3;height:36px;border-radius:18px;border:0;background:rgba(243,247,252,.16);color:#f3f7fc;font-size:12px;font-weight:700;padding:0 12px;display:flex;align-items:center;gap:6px;backdrop-filter:blur(6px)}
${H} .forge-lb-strip{grid-row:3;display:flex;gap:6px;min-width:0;overflow-x:auto;scrollbar-width:none}
${H} .forge-lb-strip::-webkit-scrollbar{display:none}
${H} .forge-lb-chip{flex:1 0 64px;min-width:64px;height:48px;border-radius:14px;background:#171e2a;border:1px solid #293346;color:#95a3b7;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;font-size:12px;line-height:1.25}
${H} .forge-lb-chip b{font-size:11px;font-weight:700}
${H} .forge-lb-chip.done{background:#1a2a22;border-color:#405d39;color:#f3f7fc}
${H} .forge-lb-chip.done b{color:${ACC}}
${H} .forge-lb-chip.current{border:2px solid ${ACC};color:#f3f7fc}
${H} .forge-lb-chip.current b{font-weight:800}
${H} .forge-lb-chip.current span{color:#c3cddb}
${H} .forge-lb-chip.open{border-style:dashed;border-color:#3a4556}
${H} .forge-lb-chip.warm-add{border-style:dashed;border-color:#3a4556;color:#95a3b7}
${H} .forge-lb-info{grid-row:4;display:flex;align-items:center;gap:8px;font-size:13px;color:#c3cddb;background:#14202a;border-radius:12px;padding:9px 12px;min-height:18px}
${H} .forge-lb-info:empty{display:none}
${H} .forge-b-rest{display:none!important}
${S}.forge-lb-rest-min #forgePremiumShell.forge-b-shell .forge-b-rest:has(#forgeRestTimer.forge-live-rest-running){display:flex!important;grid-row:5!important}
${S}.forge-lb-rest-min #forgePremiumShell.forge-b-shell{grid-template-rows:46px minmax(100px,1fr) 50px auto auto minmax(170px,1.2fr) 74px!important}
${H} .forge-b-set-panel{grid-row:6!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;min-height:0!important;display:flex!important;flex-direction:column!important}
${H}:not(.forge-v91-warming) #forgeV91Warm{display:none!important}
${H}.forge-v91-warming #forgeQuickWorkout{display:none!important}
${H}.forge-v91-warming #forgeV91Warm{display:flex!important;flex-direction:column!important;flex:1 1 auto!important;gap:10px!important;min-height:0!important}
${H}.forge-v91-warming #forgeV91WarmDone{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;opacity:0!important}
${H}.forge-v91-warming .forge-b-media{display:block!important;grid-row:2!important}
${H}.forge-v91-warming .forge-v91-warm-fields{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important;flex:1 1 auto!important}
${H}.forge-v91-warming .forge-v91-warm-fields label{display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;height:auto!important;min-height:110px!important;border-radius:24px!important;border:1px solid #293346!important;background:#171e2a!important;color:#95a3b7!important;font-size:11px!important;text-transform:uppercase;letter-spacing:1px}
${H}.forge-v91-warming .forge-v91-warm-fields input{width:90%!important;border:0!important;background:transparent!important;color:#f3f7fc!important;-webkit-text-fill-color:#f3f7fc!important;text-align:center!important;font-size:40px!important;font-weight:800!important;box-shadow:none!important;outline-offset:-2px}
${H}.forge-v91-warming .forge-v91-warm-bar{background:#171e2a!important;border:1px solid #293346!important;border-radius:14px!important;padding:8px 10px!important}
${H} #forgeQuickWorkout{flex:1 1 auto!important;height:100%!important;min-height:0!important;display:flex!important;flex-direction:column!important}
${H} #forgeQuickWorkout>.forge130-focus-card{flex:1 1 auto!important;height:auto!important;min-height:0!important;display:flex!important;flex-direction:column!important}
${H} #forgeQuickWorkout .forge130-focus-card-grid{flex:1 1 auto!important;height:auto!important;min-height:0!important;gap:10px!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
${H} #forgeQuickWorkout .forge-primary-action,${H} #forgeQuickWorkout .forge130-actions,${H} #forgeQuickWorkout .forge-v3-progression{display:none!important}
${D}{position:relative!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:stretch!important;height:100%!important;min-height:150px!important;padding:0!important;margin:0!important;border-radius:24px!important;overflow:hidden!important;border:1px solid #293346!important;background:#171e2a!important;font-size:0!important;color:transparent!important;box-shadow:none!important}
${D} .forge-v8-arc,${D}>.forge-v8-label,${D}::before,${D}::after{display:none!important}
${D}>.forge-v8-plus,${D}>.forge-v8-minus{position:static!important;transform:none!important;order:0;flex:1 1 0!important;width:100%!important;min-width:0!important;height:auto!important;min-height:40px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#1c2431!important;color:#c3cddb!important;font-size:28px!important;font-weight:600!important;line-height:1!important;box-shadow:none!important;display:flex!important;align-items:center!important;justify-content:center!important}
${D}>.forge-v8-minus{order:3;background:#141b26!important}
${D}>.forge-v8-plus:active,${D}>.forge-v8-minus:active{background:#26324a!important}
${D}>.forge-v8-unit{order:1;position:static!important;display:block!important;font-size:11px!important;color:#95a3b7!important;text-transform:uppercase!important;letter-spacing:1.2px!important;text-align:center!important;margin:8px 0 0!important;transform:none!important}
${D} input{order:2;position:static!important;transform:none!important;width:100%!important;max-width:none!important;height:auto!important;min-height:48px!important;margin:0 0 6px!important;padding:0!important;border:0!important;background:transparent!important;color:#f3f7fc!important;-webkit-text-fill-color:#f3f7fc!important;text-align:center!important;font-size:clamp(34px,11vw,46px)!important;font-weight:800!important;line-height:1.05!important;box-shadow:none!important;font-variant-numeric:tabular-nums!important}
${D} input:focus{outline:2px solid ${ACC}!important;outline-offset:-4px!important;border-radius:10px!important}
${H} .forge-lb-bottom{grid-row:7;display:grid;grid-template-columns:72px minmax(0,1fr) 72px;gap:10px;align-items:center}
${H} .forge-lb-side{height:72px;border-radius:24px;border:1px solid #3a4556;background:#202a38;color:#f3f7fc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:11px;font-weight:700;padding:0}
${H} .forge-lb-main{height:72px;border-radius:36px;border:0;background:${ACC};color:#142016;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 10px;box-shadow:0 10px 24px rgba(169,242,103,.14);min-width:0}
${H} .forge-lb-main span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${H} .forge-lb-main:disabled{opacity:.55}
${H} button:focus-visible{outline:2px solid ${ACC}!important;outline-offset:2px!important}
body.forge-layout-b.forge-compact-typing #workout.forge-lb-live #forgePremiumShell.forge-b-shell .forge-b-media{display:none!important}
body.forge-layout-b.forge-compact-typing #workout.forge-lb-live.forge-premium-layout #forgePremiumShell.forge-b-shell.forge-b-shell{grid-template-rows:46px 0 50px auto 0 minmax(178px,1fr) 74px!important}
/* Satzpause */
${H} .forge-lb-rest{position:absolute;inset:0;z-index:20;display:none;flex-direction:column;background:#0b1018;padding:16px 16px 10px;box-sizing:border-box}
${S}.forge-lb-resting:not(.forge-lb-rest-min) #forgePremiumShell.forge-b-shell .forge-lb-rest{display:flex}
${H} .forge-lb-rest-head{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:#95a3b7;padding:6px 6px 0}
${H} .forge-lb-rest-mid{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
${H} .forge-lb-rest-kicker{font-size:13px;color:${ACC};font-weight:700;text-transform:uppercase;letter-spacing:2px}
${H} .forge-lb-ring{position:relative;width:min(240px,62vw);aspect-ratio:1}
${H} .forge-lb-ring svg{width:100%;height:100%;display:block}
${H} .forge-lb-ring-txt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
${H} .forge-lb-ring-txt b{font-size:clamp(46px,15vw,62px);font-weight:800;line-height:1;font-variant-numeric:tabular-nums;color:#f3f7fc}
${H} .forge-lb-ring-txt span{font-size:14px;color:#95a3b7;margin-top:6px}
${H} .forge-lb-rest-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
${H} .forge-lb-pill{height:48px;border-radius:24px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font-size:14px;font-weight:700;padding:0 18px;display:flex;align-items:center;gap:8px}
${H} .forge-lb-rest-foot{display:flex;flex-direction:column;gap:10px}
${H} .forge-lb-nextcard{background:#171e2a;border:1px solid #293346;border-radius:22px;padding:14px 16px}
${H} .forge-lb-nextcard small{display:block;font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px}
${H} .forge-lb-nextcard b{display:block;font-size:17px;font-weight:800;margin-top:4px;color:#f3f7fc}
${H} .forge-lb-rest-go{height:68px;border-radius:34px;border:0;background:${ACC};color:#142016;font-size:18px;font-weight:800}
${H} .forge-lb-rest-note{font-size:12px;color:#95a3b7;text-align:center}
@media (max-height:720px){
 ${H}{grid-template-rows:42px minmax(96px,1fr) 46px auto 0px minmax(150px,1.2fr) 64px!important;row-gap:7px!important}
 ${H} .forge-lb-chip{height:44px}
 ${H} .forge-lb-side,${H} .forge-lb-main{height:62px}
 ${H} .forge-lb-info{padding:7px 10px}
}

/* Übersicht: Abschluss-Aktionen */
body.forge-layout-b .forge-lb-ovfoot{display:none}
body.forge-layout-b #workout.forge-lb-live .forge-lb-ovfoot{display:flex;flex-direction:column;gap:10px;margin:14px 0 6px}
body.forge-layout-b .forge-lb-ovfoot p{margin:0;text-align:center;font-size:12px;color:#95a3b7}
body.forge-layout-b .forge-lb-ovfoot button{height:54px;border-radius:27px;font-size:16px;font-weight:700}
body.forge-layout-b .forge-lb-ovfoot .forge-lb-ov-cont{border:1px solid #3a4556;background:#171e2a;color:#f3f7fc}
body.forge-layout-b .forge-lb-ovfoot .forge-lb-ov-end{border:0;background:#f3f7fc;color:#0b1018;font-weight:800}
/* Training fertig */
.forge-lb-finish{position:fixed;inset:0;z-index:2147483000;background:#0b1018;color:#f3f7fc;display:flex;flex-direction:column;padding:calc(22px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box;overflow-y:auto;font-family:Inter,system-ui,sans-serif}
.forge-lb-finish .fin-body{flex:1;display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto}
.forge-lb-finish .fin-hero{border-radius:28px;background:linear-gradient(160deg,#273d2d,#171e2a 65%);border:1px solid #405d39;padding:22px;display:flex;flex-direction:column;gap:16px}
.forge-lb-finish .fin-kick{font-size:13px;color:${ACC};font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
.forge-lb-finish h2{margin:4px 0 0;font-size:28px;font-weight:800;line-height:1.1;color:#f3f7fc}
.forge-lb-finish .fin-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.forge-lb-finish .fin-stats b{display:block;font-size:24px;font-weight:800;font-variant-numeric:tabular-nums}
.forge-lb-finish .fin-stats span{font-size:12px;color:#c3cddb}
.forge-lb-finish .fin-card{background:#171e2a;border:1px solid #293346;border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:10px}
.forge-lb-finish .fin-card small{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px}
.forge-lb-finish .fin-row{display:flex;justify-content:space-between;gap:10px;font-size:15px}
.forge-lb-finish .fin-row em{font-style:normal;color:#95a3b7;white-space:nowrap}
.forge-lb-finish .fin-row em.up{color:${ACC};font-weight:700}
.forge-lb-finish .fin-best{display:flex;align-items:center;gap:12px;background:#1f2530;border:1px solid #6b5426;border-radius:20px;padding:14px 16px}
.forge-lb-finish .fin-best i{width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:#2a2412;display:flex;align-items:center;justify-content:center}
.forge-lb-finish .fin-best b{display:block;font-size:15px;font-weight:800}
.forge-lb-finish .fin-best span{font-size:13px;color:#c3cddb}
.forge-lb-finish .fin-week{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#171e2a;border:1px solid #293346;border-radius:20px;padding:14px 16px}
.forge-lb-finish .fin-week b{display:block;font-size:17px;font-weight:800;margin-top:2px}
.forge-lb-finish .fin-week span{font-size:12px;color:#95a3b7}
.forge-lb-finish .fin-bars{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.forge-lb-finish .fin-bars i{width:24px;height:8px;border-radius:4px;background:#293346;display:block}
.forge-lb-finish .fin-bars i.on{background:${ACC}}
.forge-lb-finish .fin-foot{display:flex;flex-direction:column;gap:8px;max-width:560px;width:100%;margin:14px auto 0}
.forge-lb-finish .fin-done{height:68px;border-radius:34px;border:0;background:${ACC};color:#142016;font-size:18px;font-weight:800}
.forge-lb-finish .fin-more{height:44px;border-radius:22px;border:0;background:transparent;color:#95a3b7;font-size:14px;font-weight:600}
.forge-lb-finish button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
/* Vor dem Start: Tagesform */
body.forge-layout-b .forge-lb-form[hidden]{display:none!important}
body.forge-layout-b .forge-lb-form{margin:12px 0 14px;display:flex;flex-direction:column;gap:10px}
body.forge-layout-b .forge-lb-form-card{border-radius:24px;background:linear-gradient(160deg,#273d2d,#171e2a 60%);border:1px solid #405d39;padding:18px 18px 16px}
body.forge-layout-b .forge-lb-form-card small{font-size:12px;color:${ACC};font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
body.forge-layout-b .forge-lb-form-card strong{display:block;font-size:22px;font-weight:800;line-height:1.2;margin-top:4px;color:#f3f7fc}
body.forge-layout-b .forge-lb-form-card p{margin:4px 0 0;font-size:13px;color:#c3cddb;line-height:1.45}
body.forge-layout-b .forge-lb-form-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
body.forge-layout-b .forge-lb-form-row button{height:64px;border-radius:18px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font-size:24px;font-weight:800;padding:0}
body.forge-layout-b .forge-lb-form-row button[aria-pressed="true"]{border:2px solid ${ACC};background:#1a2a22}
body.forge-layout-b .forge-lb-form-scale{display:flex;justify-content:space-between;font-size:12px;color:#95a3b7;padding:0 4px}
`;

/* ---------- build ---------- */
let nodes=null;
function build(shell){
 const top=el('div','forge-lb-top');
 const list=el('button','forge-lb-round');list.type='button';list.innerHTML=SVG.list;list.setAttribute('aria-label','Alle Übungen anzeigen');
 list.addEventListener('click',()=>$('forgeCompactExercises')?.click());
 const segs=el('div','forge-lb-segs');segs.setAttribute('role','img');
 const clock=el('button','forge-lb-clock');clock.type='button';
 clock.append(el('i'),el('span','','0:00'));
 clock.addEventListener('click',()=>$('forgeLivePause')?.click());
 top.append(list,segs,clock);

 const tech=el('button','forge-lb-tech');tech.type='button';tech.innerHTML=SVG.up+'<span>Technik</span>';
 tech.setAttribute('aria-label','Technik und Muskeln anzeigen');
 tech.addEventListener('click',openTechnique);
 const target=el('div','forge-lb-target');

 const strip=el('div','forge-lb-strip');strip.setAttribute('role','group');strip.setAttribute('aria-label','Sätze dieser Übung');
 const info=el('div','forge-lb-info');

 const bottom=el('div','forge-lb-bottom');
 const swap=el('button','forge-lb-side');swap.type='button';swap.innerHTML=SVG.swap+'<span>Tauschen</span>';
 swap.addEventListener('click',()=>{const f=focus();if(f)window.ForgeExerciseSwap?.openForSession?.(f.i);});
 const main=el('button','forge-lb-main');main.type='button';main.innerHTML=SVG.check+'<span>Satz fertig</span>';
 main.addEventListener('click',()=>{const warm=$('forgePremiumShell')?.classList.contains('forge-v91-warming');(warm?$('forgeV91WarmDone'):document.querySelector('#forgeQuickWorkout .forge-primary-action'))?.click();});
 const next=el('button','forge-lb-side');next.type='button';next.innerHTML=SVG.next+'<span>Nächste</span>';
 next.addEventListener('click',()=>{
  if(next.dataset.mode==='finish'){openOverview();return;}
  heroArrow(1);
 });
 bottom.append(swap,main,next);

 const rest=buildRest();
 shell.append(top,strip,info,bottom,rest.root);
 nodes={shell,top,segs,clock,clockText:clock.querySelector('span'),tech,target,strip,info,bottom,swap,main,mainText:main.querySelector('span'),next,nextText:next.querySelector('span'),rest};
 placeHeroExtras();
 bindSwipe(shell);
}
function placeHeroExtras(){
 const media=nodes.shell.querySelector('.forge-b-media');
 if(media&&nodes.tech.parentNode!==media)media.append(nodes.tech);
 const stack=nodes.shell.querySelector('.forge-b-title-stack');
 if(stack&&nodes.target.parentNode!==stack)stack.append(nodes.target);
}
function buildRest(){
 const root=el('div','forge-lb-rest');root.setAttribute('role','region');root.setAttribute('aria-label','Satzpause');
 const head=el('div','forge-lb-rest-head');const saved=el('span');const net=el('span');head.append(saved,net);
 const mid=el('div','forge-lb-rest-mid');
 const kicker=el('div','forge-lb-rest-kicker','Satzpause');
 const ring=el('div','forge-lb-ring');
 ring.innerHTML='<svg viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="116" fill="none" stroke="#202a38" stroke-width="14"/><circle class="forge-lb-arc" cx="130" cy="130" r="116" fill="none" stroke="'+ACC+'" stroke-width="14" stroke-linecap="round" stroke-dasharray="729" stroke-dashoffset="0" transform="rotate(-90 130 130)"/></svg>';
 const txt=el('div','forge-lb-ring-txt');const big=el('b','','0:00');const of=el('span','','');txt.append(big,of);ring.append(txt);
 const row=el('div','forge-lb-rest-row');
 const add=el('button','forge-lb-pill','+ 30 Sek.');add.type='button';
 add.addEventListener('click',()=>{if(typeof window.forge130RestAdd==='function')window.forge130RestAdd(30);setTimeout(tick,0);});
 const pause=el('button','forge-lb-pill');pause.type='button';pause.innerHTML=SVG.pause+'<span>Training pausieren</span>';
 pause.addEventListener('click',()=>$('forgeLivePause')?.click());
 const adjust=el('button','forge-lb-pill','Werte anpassen');adjust.type='button';
 adjust.addEventListener('click',()=>{$('workout')?.classList.add('forge-lb-rest-min');});
 row.append(add,pause,adjust);
 mid.append(kicker,ring,row);
 const foot=el('div','forge-lb-rest-foot');
 const card=el('div','forge-lb-nextcard');const cs=el('small','','Als Nächstes');const cb=el('b','','');card.append(cs,cb);
 const go=el('button','forge-lb-rest-go','Zum nächsten Satz');go.type='button';
 go.addEventListener('click',()=>{if(typeof window.forge130RestSkip==='function')window.forge130RestSkip();setTimeout(tick,0);});
 const note=el('div','forge-lb-rest-note','Automatische Satzpause · Dauer in den Einstellungen');
 foot.append(card,go,note);
 root.append(head,mid,foot);
 return {root,saved,net,big,of,arc:ring.querySelector('.forge-lb-arc'),ring,pauseText:pause.querySelector('span'),nextText:cb,total:0,last:null};
}

/* ---------- actions ---------- */
function heroArrow(dir){
 const b=document.querySelectorAll('#forgePremiumShell .forge-b-media-arrows button')[dir<0?0:1];
 if(b)b.click();
}
function openOverview(){$('forgeCompactExercises')?.click();}
function openTechnique(){
 // Prefer the exercise's own technique panel inside the overview, fall back to tips.
 const f=focus();
 const more=$('forgeCompactMore');
 if(more){more.click();return;}
 if(f)openOverview();
}
function stepTo(targetJ){
 const p=plan(),nav=window.forge130FocusNavigate;
 const f=focus();if(!p||!f||typeof nav!=='function')return;
 const dir=targetJ>f.j?1:-1;
 for(let k=0;k<40;k++){
  const now=focus();if(!now||now.i!==f.i||now.j===targetJ)break;
  nav(dir);
 }
}
function bindSwipe(shell){
 let t=null;
 shell.addEventListener('touchstart',e=>{
  const media=e.target.closest&&e.target.closest('.forge-b-media,.forge-lb-top');
  if(!media||e.touches.length!==1||e.target.closest('button,input')){t=null;return;}
  t={x:e.touches[0].clientX,y:e.touches[0].clientY,at:Date.now()};
 },{passive:true});
 shell.addEventListener('touchend',e=>{
  if(!t)return;const s=t;t=null;const c=e.changedTouches[0];if(!c)return;
  const dx=c.clientX-s.x,dy=c.clientY-s.y;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5&&Date.now()-s.at<700)heroArrow(dx<0?1:-1);
 },{passive:true});
}

/* ---------- render ---------- */
let lastKey='';
function renderLive(){
 const s=live(),p=plan(),f=focus();
 if(!s||!p||!nodes)return;
 placeHeroExtras();
 const draft=s.workoutDraft&&String(s.workoutDraft.planId)===String(p.id)?s.workoutDraft:null;
 const ex=draft?.exercises||[];
 const i=f?f.i:0,j=f?f.j:-1,cur=ex[i]||{},sets=cur.sets||[];
 // progress segments (plan order as shown by the core)
 const order=typeof window.forge142Order==='function'?window.forge142Order(p):ex.map((_,k)=>k);
 const st=exerciseStates(draft,i);
 const segKey=order.map(k=>st[k]).join(',');
 if(nodes.segs.dataset.key!==segKey){
  nodes.segs.dataset.key=segKey;nodes.segs.replaceChildren(...order.map(k=>{const x=el('span',st[k]||'open');return x;}));
  nodes.segs.setAttribute('aria-label','Übung '+(order.indexOf(i)+1)+' von '+order.length);
 }
 // clock
 const digits=$('workoutDigitalClock')?.textContent||'';
 const sec=parseClock(digits);
 setText(nodes.clockText,sec==null?digits:formatShort(sec));
 const paused=!!s.activeWorkout.forgePausedAt;
 nodes.clock.classList.toggle('paused',paused);
 nodes.clock.setAttribute('aria-label',paused?'Training pausiert, antippen zum Fortsetzen':'Trainingszeit, antippen zum Pausieren');
 // target line
 const pe=p.ex?.[i]||{};
 const unit=pe.unit==='sec'||pe.unit==='seconds'?' Sek.':'';
 setText(nodes.target,'Ziel '+(pe.sets||sets.length)+' × '+(pe.reps??'')+unit);
 // chips
 const warm=draft?.warmup?.exercises?.[i];
 const chips=chipModel(sets,j,warm,nodes.shell.classList.contains('forge-v91-warming'));
 const key=i+'|'+JSON.stringify(chips);
 if(key!==lastKey){
  lastKey=key;
  nodes.strip.replaceChildren(...chips.map(c=>{
   const b=el('button','forge-lb-chip '+(c.current?'current':c.done?'done':c.kind==='warm-add'?'warm-add':'open'));
   b.type='button';b.append(el('b','',c.label),el('span','',c.sub));
   if(c.kind==='set'){b.setAttribute('aria-label','Satz '+(c.j+1)+(c.done?' erledigt':c.current?' aktuell':' offen'));b.addEventListener('click',()=>stepTo(c.j));}
   else if(c.kind==='warm-add'){b.setAttribute('aria-label','Aufwärmsatz hinzufügen');b.addEventListener('click',()=>$('forgeV91WarmAdd')?.click());}
   else {b.setAttribute('aria-label','Aufwärmsatz bearbeiten');b.addEventListener('click',()=>{const e=$('forgeV91WarmEdit');(e&&!e.hidden?e:$('forgeV91WarmAdd'))?.click();});}
   if(c.current)b.setAttribute('aria-current','step');
   return b;
  }));
  const curChip=nodes.strip.querySelector('.current');
  if(curChip&&nodes.strip.scrollWidth>nodes.strip.clientWidth)nodes.strip.scrollLeft=Math.max(0,curChip.offsetLeft-nodes.strip.clientWidth/2+curChip.offsetWidth/2);
 }
 // info line
 const parts=[];
 try{
  if(typeof forge144Data==='function'&&typeof forge144LocalDay==='function'){
   const e=forge144Data()?.checkIns?.[forge144LocalDay()];if(e)parts.push('Tagesform '+e+'/5');
  }
 }catch(e){}
 try{
  if(typeof forgeLastExercise==='function'&&cur.name){
   const last=forgeLastExercise(cur.name);
   const ls=last?.sets?.[Math.max(0,j)]||last?.sets?.[last.sets.length-1];
   if(ls)parts.push('zuletzt '+(fmtKg(ls.kg)?fmtKg(ls.kg)+' kg × ':'')+(ls.reps??'')+(fmtKg(ls.kg)?'':' Wdh.'));
  }
 }catch(e){}
 const infoText=parts.join(' · ');
 if(nodes.info.dataset.text!==infoText){
  nodes.info.dataset.text=infoText;
  if(infoText){nodes.info.innerHTML=SVG.trend;nodes.info.append(document.createTextNode(infoText));}
  else nodes.info.replaceChildren();
 }
 // main action mirrors the native primary button
 const warming=nodes.shell.classList.contains('forge-v91-warming');
 const prim=warming?$('forgeV91WarmDone'):document.querySelector('#forgeQuickWorkout .forge-primary-action');
 const label=(prim?.textContent||'Satz fertig').replace(/^[✓✔\s]+/,'').trim();
 const nice=warming?'Satz A fertig':/^satz abschlie/i.test(label)?'Satz fertig':label;
 setText(nodes.mainText,nice||'Satz fertig');
 nodes.main.disabled=!!prim?.disabled;
 // last exercise -> finish
 const pos=order.indexOf(i),lastEx=pos===order.length-1;
 const mode=lastEx?'finish':'next';
 if(nodes.next.dataset.mode!==mode){
  nodes.next.dataset.mode=mode;
  nodes.next.innerHTML=(lastEx?SVG.flag:SVG.next)+'<span>'+(lastEx?'Beenden':'Nächste')+'</span>';
  nodes.next.setAttribute('aria-label',lastEx?'Training beenden – Übersicht öffnen':'Nächste Übung');
 }
 renderRest(s,p,draft,i,j,cur);
}
function renderRest(s,p,draft,i,j,cur){
 const timer=$('forgeRestTimer'),w=$('workout');
 const running=!!timer?.classList.contains('forge-live-rest-running');
 w.classList.toggle('forge-lb-resting',running);
 const R=nodes.rest;
 if(!running){R.total=0;w.classList.remove('forge-lb-rest-min');return;}
 const remain=parseClock(timer.querySelector('.forge-rest-digits')?.textContent);
 const sel=Number(timer.querySelector('select')?.value)||0;
 if(remain!=null){
  if(!R.total||remain>R.total)R.total=Math.max(remain,sel);
  setText(R.big,formatShort(remain));
  setText(R.of,'von '+formatShort(R.total));
  const frac=R.total?Math.max(0,Math.min(1,remain/R.total)):0;
  R.arc.setAttribute('stroke-dashoffset',String(Math.round(729*(1-frac))));
  R.ring.setAttribute('aria-label','Noch '+formatShort(remain)+' Pause');
 }
 const done=(cur.sets||[]).filter(x=>x&&x.done).length;
 setText(R.saved,(cur.name||'Übung')+' · '+done+' von '+(cur.sets||[]).length+' Sätzen');
 setText(R.net,'Training '+(nodes.clockText.textContent||''));
 const paused=!!s.activeWorkout.forgePausedAt;
 setText(R.pauseText,paused?'Training fortsetzen':'Training pausieren');
 // Next set preview from the focus the core already advanced to.
 const ns=cur.sets?.[j];
 let nextText='Nächste Übung';
 if(ns&&!ns.done)nextText='Satz '+(j+1)+' · '+(fmtKg(ns.kg)?fmtKg(ns.kg)+' kg × ':'')+(ns.reps??'')+(fmtKg(ns.kg)?'':' Wdh.');
 else{
  const order=typeof window.forge142Order==='function'?window.forge142Order(p):[];
  const nx=order[order.indexOf(i)+1];
  if(nx!=null&&draft?.exercises?.[nx])nextText=draft.exercises[nx].name;
  else nextText='Training abschließen';
 }
 setText(R.nextText,nextText);
}

/* ---------- pre-start Tagesform ---------- */
function renderForm(){
 const page=$('workout');if(!page)return;
 let box=page.querySelector('.forge-lb-form');
 const start=[...page.querySelectorAll('button')].find(b=>/Training starten/.test(b.textContent||'')&&b.offsetParent!==null);
 const canForm=typeof forge144SetEnergy==='function'&&typeof forge144Data==='function'&&typeof forge144LocalDay==='function';
 if(live()||!start||!canForm){if(box)box.hidden=true;return;}
 if(!box){
  box=el('div','forge-lb-form');
  const card=el('div','forge-lb-form-card');
  card.append(el('small','','Tagesform'),el('strong','','Wie fühlst du dich heute?'),el('p','','Eine kurze Einschätzung vor dem Training – optional.'));
  const row=el('div','forge-lb-form-row');row.setAttribute('role','group');row.setAttribute('aria-label','Tagesform wählen');
  for(let v=1;v<=5;v++){
   const b=el('button','',String(v));b.type='button';b.dataset.v=String(v);
   b.setAttribute('aria-label','Tagesform '+v+' von 5');
   b.addEventListener('click',()=>{try{forge144SetEnergy(v);}catch(e){}renderForm();});
   row.append(b);
  }
  const scale=el('div','forge-lb-form-scale');scale.append(el('span','','1 = sehr erschöpft'),el('span','','3 = okay'),el('span','','5 = sehr fit'));
  box.append(card,row,scale);
 }
 if(box.nextElementSibling!==start||box.parentNode!==start.parentNode)start.before(box);
 box.hidden=false;
 let energy=0;try{energy=forge144Data()?.checkIns?.[forge144LocalDay()]||0;}catch(e){}
 box.querySelectorAll('.forge-lb-form-row button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.v)===energy)));
}


/* ---------- Übersicht-Abschluss ---------- */
function overviewFooter(){
 const list=$('workoutExercises')?.closest('details');
 if(!list||list.querySelector('.forge-lb-ovfoot'))return;
 const foot=el('div','forge-lb-ovfoot');
 foot.append(el('p','','Reihenfolge ändern und Tauschen gilt nur für heute'));
 const cont=el('button','forge-lb-ov-cont','Weiter trainieren');cont.type='button';
 cont.addEventListener('click',()=>{list.open=false;});
 const end=el('button','forge-lb-ov-end','Training beenden & speichern');end.type='button';
 end.addEventListener('click',()=>{list.open=false;$('saveWorkout')?.click();});
 foot.append(cont,end);
 list.append(foot);
}

/* ---------- Training fertig ---------- */
const TROPHY='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb547" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/></svg>';
function showFinish(){
 const s=typeof state!=='undefined'?state:null;if(!s)return;
 const target=Array.isArray(s.plan)?s.plan.length:0;
 const sum=finishSummary(s.workouts,target);if(!sum)return;
 document.querySelector('.forge-lb-finish')?.remove();
 const root=el('div','forge-lb-finish');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Training gespeichert');
 const body=el('div','fin-body');
 const hero=el('div','fin-hero');
 const head=el('div');head.append(el('div','fin-kick','Geschafft · gespeichert'),el('h2','',sum.title));
 const stats=el('div','fin-stats');
 for(const [v,l] of [[String(sum.minutes),sum.minutes===1?'Minute':'Minuten'],[String(sum.sets),'Sätze'],[sum.volume.toLocaleString('de-DE'),'kg Volumen']]){
  const d=el('div');d.append(el('b','',v),el('span','',l));stats.append(d);
 }
 hero.append(head,stats);body.append(hero);
 if(sum.compare.length){
  const c=el('div','fin-card');c.append(el('small','','Im Vergleich zu letztem Mal'));
  for(const r of sum.compare){const row=el('div','fin-row');row.append(el('span','',r.name),el('em',r.tone==='up'?'up':'',r.text));c.append(row);}
  body.append(c);
 }
 if(sum.best){
  const b=el('div','fin-best');const ic=el('i');ic.innerHTML=TROPHY;const t=el('div');t.append(el('b','','Neue Bestleistung'),el('span','',sum.best.name+' · '+sum.best.text));
  b.append(ic,t);body.append(b);
 }
 const wk=el('div','fin-week');const wt=el('div');wt.append(el('span','','Diese Woche'),el('b','',sum.week>=sum.weekTarget?sum.week+(sum.week===1?' Training':' Trainings')+' · Ziel erreicht':sum.week+' von '+sum.weekTarget+' Trainings'));
 const bars=el('div','fin-bars');for(let k=0;k<Math.min(7,Math.max(sum.weekTarget,sum.week));k++)bars.append(el('i',k<sum.week?'on':''));
 wk.append(wt,bars);body.append(wk);
 const foot=el('div','fin-foot');
 const done=el('button','fin-done','Fertig');done.type='button';
 const more=el('button','fin-more','Zu den Erfolgen');more.type='button';
 const close=()=>{root.remove();document.removeEventListener('keydown',esc,true);};
 const esc=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
 done.addEventListener('click',close);
 more.addEventListener('click',()=>{close();if(typeof window.go==='function')window.go('progress');});
 document.addEventListener('keydown',esc,true);
 foot.append(done,more);
 root.append(body,foot);
 document.body.append(root);
 done.focus({preventScroll:true});
}
let wasLive=false,savedCount=-1;
function watchFinish(){
 const s=typeof state!=='undefined'?state:null;if(!s)return;
 const count=Array.isArray(s.workouts)?s.workouts.length:0;
 const isLive=!!s.activeWorkout;
 if(wasLive&&!isLive&&savedCount>=0&&count>savedCount)showFinish();
 wasLive=isLive;savedCount=count;
}
/* ---------- lifecycle ---------- */
function tick(){
 if(!enabled())return;
 watchFinish();
 const w=$('workout');if(!w)return;
 const shell=$('forgePremiumShell');
 const on=!!(live()&&shell&&w.classList.contains('forge-premium-layout'));
 w.classList.toggle('forge-lb-live',on);
 if(on){
  if(!nodes||nodes.shell!==shell||!shell.contains(nodes.bottom)){nodes=null;lastKey='';shell.querySelectorAll('.forge-lb-top,.forge-lb-strip,.forge-lb-info,.forge-lb-bottom,.forge-lb-rest').forEach(n=>n.remove());build(shell);}
  const box=w.querySelector('.forge-lb-form');if(box)box.hidden=true;
  if(w.scrollTop&&!document.body.classList.contains('forge-compact-typing'))w.scrollTop=0;
  if(workoutVisible()){renderLive();overviewFooter();}
 }else{
  w.classList.remove('forge-lb-resting','forge-lb-rest-min');
  if(workoutVisible())renderForm();
 }
}
function install(){
 if(!document.body||!enabled())return false;
 if(!$('forgeLayoutBWorkoutStyle')){const st=el('style');st.id='forgeLayoutBWorkoutStyle';st.textContent=CSS;document.head.append(st);}
 tick();
 setInterval(()=>{if(document.visibilityState!=='hidden')tick();},400);
 return true;
}
function boot(){
 // Layout B (Phase 1) sets body.forge-layout-b during DOMContentLoaded.
 if(install())return;
 let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
