/* FORGE Layout B · Workout-Seite schlanker (W1–W4).
 * Ersetzt im Modus „Kraft“ die alte Startkarte (Auswahlmenü, Erklärtext,
 * „Weitere Trainingsarten“) durch eine Karte:
 *  - W1 Heute dran: Einheit, Übungen mit Gewicht vom letzten Mal, Tagesform
 *    in einer Zeile, „Training starten“, „Anpassen“.
 *  - W2 Ruhetag / heute erledigt: nächstes Training, Mobilität oder Cardio,
 *    trotzdem trainieren.
 *  - W3 Andere Einheit (nur für heute) + Freies Training aus dem Katalog.
 *  - W4 Anpassen: Einheit bearbeiten, andere Einheit, freies Training,
 *    Training nachtragen (forge-layout-b-log.js), Plan.
 * Starten läuft über startWorkout(); Tagesform über forge144SetEnergy().
 * Freies Training ist eine vorübergehende Einheit (forgeFree, ohne
 * Wochentag), die nach dem Training wieder aus dem Plan entfernt wird.
 */
(function(){
'use strict';
const ACC='#a9f267',TEAL='#5ee0c8',GOLD='#ffb547';
const DAYS=['Mo','Di','Mi','Do','Fr','Sa','So'];
const DAY_FULL=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const FREE_PREFIX='forge-free-';

/* ---------- pure helpers (tested) ---------- */
function isoOf(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function addDays(iso,n){const [y,m,d]=iso.split('-').map(Number);const t=new Date(y,m-1,d+n,12);return isoOf(t);}
function weekdayOf(iso){const [y,m,d]=iso.split('-').map(Number);return (new Date(y,m-1,d,12).getDay()+6)%7;}
function locationLabel(loc){return {gym:'Studio',studio:'Studio',home:'Zuhause',outdoor:'Draußen'}[String(loc||'').toLowerCase()]||'';}
function estimateMinutes(ex){
 const sets=(Array.isArray(ex)?ex:[]).reduce((a,e)=>a+Math.max(1,Number(e&&e.sets)||1),0);
 if(!sets)return 0;return Math.max(10,Math.round((sets*2.5+5)/5)*5);
}
function isFree(p){return !!(p&&(p.forgeFree||String(p.id||'').startsWith(FREE_PREFIX)));}
function realUnits(plan){return (Array.isArray(plan)?plan:[]).filter(p=>p&&!isFree(p));}
/* What is planned on iso? cadence → rotation; weekdays → this week's map (moves) or base weekday. */
function unitOn(plan,iso,opt){
 const units=realUnits(plan);if(!units.length)return null;
 const o=opt||{};
 if(o.cadence&&typeof o.onDate==='function'){
  let hit=null;try{hit=o.onDate(o.cadence,iso);}catch(e){hit=null;}
  return hit?units.find(p=>String(p.id)===String(hit.planId))||null:null;
 }
 const wd=weekdayOf(iso);
 if(o.weekMap&&o.sameWeek&&o.sameWeek(iso)){const p=o.weekMap.get(wd);return p&&!isFree(p)?p:null;}
 return units.find(p=>p.weekday===wd)||null;
}
function nextTraining(plan,fromIso,opt,maxDays){
 for(let k=1;k<=(maxDays||21);k++){const iso=addDays(fromIso,k);const p=unitOn(plan,iso,opt);if(p)return {plan:p,date:iso,offset:k};}
 return null;
}
function whenText(offset,iso){
 if(offset===0)return 'Heute';if(offset===1)return 'Morgen';if(offset===2)return 'Übermorgen';
 if(offset<7)return DAY_FULL[weekdayOf(iso)];
 const [,m,d]=iso.split('-').map(Number);return DAYS[weekdayOf(iso)]+', '+d+'.'+m+'.';
}
function daysSince(lastIso,todayIso){
 if(!lastIso)return null;const a=Date.parse(lastIso.slice(0,10)+'T12:00:00'),b=Date.parse(todayIso+'T12:00:00');
 return Number.isFinite(a)&&Number.isFinite(b)?Math.round((b-a)/86400000):null;
}
function lastDoneText(n){if(n==null)return 'noch nie trainiert';if(n<=0)return 'heute trainiert';if(n===1)return 'zuletzt gestern';return 'zuletzt vor '+n+' Tagen';}
function freeUnit(names,defaults,now){
 const ex=(names||[]).map(n=>{let d=null;try{d=defaults?defaults(n):null;}catch(e){}
  return {name:n,sets:Math.max(1,Number(d&&d.sets)||3),reps:d&&d.reps!=null?d.reps:10,unit:(d&&d.unit)||'reps',...(d&&d.kg!=null?{kg:d.kg}:{})};});
 return {id:FREE_PREFIX+(now||Date.now()),title:'Freies Training',location:'gym',weekday:null,forgeFree:true,ex};
}
function filterNames(names,query){
 const norm=t=>String(t||'').toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss');
 const q=norm(query).trim();if(!q)return names.slice();
 const words=q.split(/\s+/);
 return names.filter(n=>{const h=norm(n);return words.every(w=>h.includes(w));})
  .sort((a,b)=>{const s=n=>norm(n).split(/[^a-z0-9]+/).some(x=>x.startsWith(words[0]))?0:1;return s(a)-s(b);});
}
window.ForgeLayoutBToday=Object.freeze({addDays,weekdayOf,locationLabel,estimateMinutes,isFree,realUnits,unitOn,nextTraining,whenText,daysSince,lastDoneText,freeUnit,filterNames,FREE_PREFIX});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
const $=id=>document.getElementById(id);
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
const S=()=>typeof state!=='undefined'?state:null;
function store(){if(typeof save==='function')save();}
function today(){return isoOf(new Date());}
function cadence(){try{return window.ForgeCadenceSchedule?.getActive?.()||null;}catch(e){return null;}}
function weekMap(){try{return typeof window.forge130WeekTrainingMap==='function'?window.forge130WeekTrainingMap():(typeof forge130WeekTrainingMap==='function'?forge130WeekTrainingMap():null);}catch(e){return null;}}
function opts(){
 const t=today(),mon=addDays(t,-weekdayOf(t)),sun=addDays(mon,6);
 return {cadence:cadence(),onDate:window.ForgeCadenceCore?.onDate,weekMap:weekMap(),sameWeek:iso=>iso>=mon&&iso<=sun};
}
function lastSet(name){
 try{const l=typeof forgeLastExercise==='function'?forgeLastExercise(name):null;const sets=(l&&l.sets)||[];
  let best=null;for(const s of sets){const kg=Number(String((s&&s.kg)??'').replace(',','.'));if(Number.isFinite(kg)&&kg>0&&(!best||kg>best))best=kg;}return best;}catch(e){return null;}
}
function lastDoneIso(p){
 const ws=(S()&&S().workouts)||[];let t=null;
 for(const w of ws){if(w&&w.title===p.title&&w.date&&(!t||w.date>t))t=w.date;}
 return t?isoOf(new Date(t)):null;
}
function trainedToday(){const t=today();return ((S()&&S().workouts)||[]).some(w=>w&&w.date&&isoOf(new Date(w.date))===t);}
function energy(){try{return forge144Data()?.checkIns?.[forge144LocalDay()]||0;}catch(e){return 0;}}
function mode(){const b=document.querySelector('#forge150WorkoutModes button[aria-pressed="true"]');return b?b.dataset.mode||'strength':'strength';}
function live(){return !!(S()&&S().activeWorkout);}
function fmtKg(n){return Number(n).toLocaleString('de-DE',{maximumFractionDigits:2});}
function doseText(e){const unit=e.unit==='sec'||e.unit==='seconds'?' s':'';return (e.sets||1)+'×'+(e.reps??'')+unit;}

const ICON={
 kraft:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/></svg>',
 mob:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M12 7v6l-4 6M12 13l4 6M5 10l7-1 7 1"/></svg>',
 cardio:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>',
 play:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z"/></svg>',
 swap:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#95a3b7" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
 check:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>',
 back:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
};
const T='.forge-lb-today';
const W='body.forge-layout-b #workout';
const CSS=`
${W}.forge-lb-today-on>#forgeCompactIntro,${W}.forge-lb-today-on>.forge150-workout-lead,${W}.forge-lb-today-on>#forgeSlimWorkoutExtras{display:none!important}
${W}.forge-lb-today-on>h1,${W}.forge-lb-today-alt>h1,${W}.forge-lb-today-alt>#forgeCompactIntro,${W}.forge-lb-today-alt>.forge150-workout-lead{display:none!important}
${W}.forge-lb-today-alt #forgeSlimWorkoutExtras{border:0!important;background:transparent!important;padding:0!important;box-shadow:none!important;margin:0!important}
${W}.forge-lb-today-alt #forgeSlimWorkoutExtras>summary,${W}.forge-lb-today-alt #forgeSlimWorkoutExtras .forge149-workout-section>summary,${W}.forge-lb-today-alt #forgeSlimWorkoutExtras #forgeWorkoutHistoryPanel,${W}.forge-lb-today-alt #forgeSlimWorkoutExtras .forge149-workout-section:not([open]){display:none!important}
${W}.forge-lb-today-alt #forgeSlimWorkoutExtras .forge149-workout-section{border:0!important;background:transparent!important;padding:0!important;margin:0!important}
${W}.forge-lb-today-alt #forgeSlimWorkoutExtras .forge149-workout-section>.card{border:0!important;background:transparent!important;padding:0!important;box-shadow:none!important;margin:0!important}
${W}:not(.forge-lb-today-on)>${T}{display:none!important}
${W}.forge-lb-today-on>:not(.forge-lb-brand):not(.forge-lb-wohead):not(#forge150WorkoutModes):not(${T}):not(#forgeWorkoutUndoBanner):not(style):not(script){display:none!important}
${W} #forge150WorkoutModes{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px!important;height:48px;border-radius:24px;background:#171e2a;border:1px solid #293346;padding:4px!important;box-sizing:border-box;margin:6px 0 12px!important}
${W} #forge150WorkoutModes>button{border:0!important;border-radius:20px!important;background:transparent!important;color:#95a3b7!important;font:inherit!important;font-size:14px!important;font-weight:600!important;display:flex!important;align-items:center;justify-content:center;gap:6px;min-height:0!important;height:100%!important;padding:0 4px!important;box-shadow:none!important;flex:none!important}
${W} #forge150WorkoutModes>button[aria-pressed="true"]{background:${ACC}!important;color:#142016!important;font-weight:800!important}
${W} #forge150WorkoutModes>button[data-mode="mobility"][aria-pressed="true"]{background:${TEAL}!important;color:#062420!important}
${W} #forge150WorkoutModes>button[data-mode="cardio"][aria-pressed="true"]{background:${GOLD}!important;color:#2a1a02!important}
${W} .forge-lb-wohead small.forge-lb-date{display:block;font-size:13px;color:#95a3b7;font-weight:500;margin-top:2px}
${T}{display:flex;flex-direction:column;gap:12px;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;margin:0 0 16px}
${T} .td-hero{background:linear-gradient(160deg,#273d2d,#171e2a 62%);border:1px solid #405d39;border-radius:24px;padding:14px 16px 6px;display:flex;flex-direction:column}
${T} .td-hero.rest{background:#171e2a;border-color:#293346;padding-bottom:14px;gap:6px}
${T} .td-top{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:32px}
${T} .td-kick{font-size:12px;color:${ACC};font-weight:800;letter-spacing:1.3px;text-transform:uppercase}
${T} .rest .td-kick{color:#95a3b7}
${T} .td-link{border:0;background:transparent;color:${ACC};font:inherit;font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px;padding:8px 0;min-height:40px}
${T} h2{margin:2px 0 0;font-size:24px;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
${T} .td-meta{font-size:13px;color:#95a3b7;margin:2px 0 8px}
${T} .td-rest-text{font-size:14px;color:#c3cddb;margin:0}
${T} .td-rest-text b{color:#f3f7fc}
${T} .td-ex{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #222b3a}
${T} .td-ex:first-of-type{border-top:0}
${T} .td-ex i{width:24px;height:24px;flex:0 0 24px;border-radius:12px;background:#202a38;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;color:#c3cddb;font-style:normal}
${T} .td-ex span{flex:1;min-width:0;font-size:15px;font-weight:600;overflow-wrap:anywhere}
${T} .td-ex em{font-style:normal;font-size:13px;color:#c3cddb;white-space:nowrap}
${T} .td-ex em b{color:#f3f7fc}
${T} .td-more{border-top:1px solid #222b3a;padding:9px 0 8px;font-size:13px;color:#95a3b7}
${T} .td-more button{border:0;background:transparent;color:${ACC};font:inherit;font-size:13px;font-weight:700;padding:0}
${T} .td-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:8px}
${T} .td-week span{height:40px;border-radius:12px;background:#0f1620;border:1px solid #293346;font-size:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#95a3b7;font-weight:600}
${T} .td-week span.on{background:#2a3a2d;border-color:#405d39}
${T} .td-week span.t{color:#f3f7fc;font-weight:800;border-color:#5b6b80}
${T} .td-week span i{width:6px;height:6px;border-radius:3px;margin-top:3px;background:transparent}
${T} .td-week span.on i{background:${ACC}}
${T} .td-mood{display:flex;align-items:center;gap:8px}
${T} .td-mood>span{flex:1;font-size:14px;color:#c3cddb;line-height:1.2}
${T} .td-mood>span small{display:block;font-size:12px;color:#95a3b7}
${T} .td-mood button{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:16px;font-weight:800;padding:0}
${T} .td-mood button[aria-pressed="true"]{border:2px solid ${ACC};background:#1a2a22}
${T} .td-go{height:60px;border-radius:30px;border:0;background:${ACC};color:#142016;font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px}
${T} .td-row{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
${T} .td-chip{min-height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:14px;font-weight:700;padding:0 16px}
${T} .td-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding:4px 4px 0}
${T} .td-opt{display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:20px;padding:12px 14px;color:#f3f7fc;text-align:left;font:inherit;min-height:68px}
${T} .td-opt>i{width:44px;height:44px;flex:0 0 44px;border-radius:14px;display:flex;align-items:center;justify-content:center}
${T} .td-opt>i.mob{background:#14302d;color:${TEAL}}
${T} .td-opt>i.cardio{background:#2e2410;color:${GOLD}}
${T} .td-opt>span{flex:1;min-width:0}
${T} .td-opt b{display:block;font-size:15px}
${T} .td-opt small{font-size:12px;color:#95a3b7}
${T} .td-sec{min-height:52px;border-radius:26px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;padding:0 16px}
${T} button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
.forge-lb-td-shade{position:fixed;inset:0;z-index:2147480500;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-td-sheet{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:10px 16px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;max-height:calc(100% - 30px - env(safe-area-inset-top))}
.forge-lb-td-sheet .h{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center;flex:0 0 auto}
.forge-lb-td-sheet strong.t{font-size:22px;font-weight:800;line-height:1.2}
.forge-lb-td-sheet p{margin:0;font-size:14px;color:#c3cddb;line-height:1.5}
.forge-lb-td-sheet .scroll{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;scrollbar-width:none;overscroll-behavior:contain}
.forge-lb-td-sheet .scroll::-webkit-scrollbar{display:none}
.forge-lb-td-sheet .unit{display:flex;align-items:center;gap:12px;border:1px solid #293346;background:#171e2a;border-radius:18px;padding:10px 14px 10px 10px;color:#f3f7fc;text-align:left;font:inherit;min-height:66px;flex:0 0 auto}
.forge-lb-td-sheet .unit[aria-pressed="true"]{border:2px solid ${ACC};background:#1a2a22}
.forge-lb-td-sheet .unit>i{width:44px;height:44px;flex:0 0 44px;border-radius:12px;background:#202a38;color:${ACC};font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center;font-style:normal}
.forge-lb-td-sheet .unit>span{flex:1;min-width:0}
.forge-lb-td-sheet .unit b{display:block;font-size:15px;overflow-wrap:anywhere}
.forge-lb-td-sheet .unit small{font-size:12px;color:#95a3b7}
.forge-lb-td-sheet .unit em{font-style:normal;font-size:11px;font-weight:800;color:#142016;background:${ACC};border-radius:10px;padding:4px 8px;white-space:nowrap}
.forge-lb-td-sheet .unit.dash{border-style:dashed;border-color:#3a4556;background:transparent}
.forge-lb-td-sheet .row{display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:12px 14px;color:#f3f7fc;text-align:left;font:inherit;min-height:62px;flex:0 0 auto}
.forge-lb-td-sheet .row>span{flex:1;min-width:0}
.forge-lb-td-sheet .row b{display:block;font-size:15px}
.forge-lb-td-sheet .row small{font-size:12px;color:#95a3b7}
.forge-lb-td-sheet input[type="search"]{height:50px;border-radius:25px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:16px;padding:0 18px;box-sizing:border-box;width:100%;flex:0 0 auto}
.forge-lb-td-sheet .pick{display:flex;align-items:center;gap:12px;border:1px solid #293346;background:#171e2a;border-radius:16px;padding:8px 12px;color:#f3f7fc;text-align:left;font:inherit;font-size:15px;font-weight:600;min-height:52px;flex:0 0 auto}
.forge-lb-td-sheet .pick i{width:26px;height:26px;flex:0 0 26px;border-radius:13px;border:2px solid #3a4556;display:flex;align-items:center;justify-content:center;color:#142016;font-style:normal}
.forge-lb-td-sheet .pick[aria-pressed="true"]{border-color:#405d39;background:#1a2a22}
.forge-lb-td-sheet .pick[aria-pressed="true"] i{background:${ACC};border-color:${ACC}}
.forge-lb-td-sheet .pick span{flex:1;min-width:0;overflow-wrap:anywhere}
.forge-lb-td-sheet .chips{display:flex;flex-wrap:wrap;gap:6px;flex:0 0 auto}
.forge-lb-td-sheet .chips span{font-size:12px;border-radius:12px;background:#1a2a22;border:1px solid #405d39;padding:5px 10px}
.forge-lb-td-sheet .m{height:56px;border-radius:28px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800;flex:0 0 auto}
.forge-lb-td-sheet .m:disabled{opacity:.45}
.forge-lb-td-sheet .s{min-height:50px;border-radius:25px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;flex:1}
.forge-lb-td-sheet .acts{display:flex;gap:8px;flex:0 0 auto}
.forge-lb-td-sheet .acts .m{flex:1}
.forge-lb-td-sheet button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
.forge-lb-td-sheet .note{font-size:12px;color:#95a3b7;text-align:center;margin:0}
`;
function ensureCss(){if(!$('forgeLayoutBTodayCss')){const s=el('style');s.id='forgeLayoutBTodayCss';s.textContent=CSS;document.head.append(s);}}

/* ---------- state of the card ---------- */
let card=null,key='',chosenId=null,chosenDay='',expanded=false;
function chosen(){
 const st=S();if(!st||chosenDay!==today())return null;
 return realUnits(st.plan).find(p=>String(p.id)===String(chosenId))||null;
}
function situation(){
 const st=S();const units=realUnits(st&&st.plan);
 if(!units.length)return {kind:'empty'};
 const o=opts(),t=today();
 const pick=chosen();
 const due=unitOn(st.plan,t,o);
 const next=nextTraining(st.plan,t,o);
 const done=trainedToday();
 if(pick)return {kind:'train',unit:pick,picked:true,due,next};
 if(due&&!done)return {kind:'train',unit:due,due,next};
 const upcoming=next?next.plan:units[0];
 return {kind:done?'done':'rest',unit:upcoming,due,next};
}
function render(force){
 const page=$('workout');if(!page||!card)return;
 const st=S();if(!st)return;
 const sit=situation();
 const k=JSON.stringify([sit.kind,sit.unit&&sit.unit.id,sit.unit&&sit.unit.title,sit.unit&&(sit.unit.ex||[]).map(e=>[e.name,e.sets,e.reps]),sit.next&&sit.next.date,energy(),(st.workouts||[]).length,expanded,today(),!!sit.picked]);
 if(!force&&k===key)return;key=k;
 card.replaceChildren();
 if(sit.kind==='empty'){renderEmpty();return;}
 if(sit.kind==='train')renderTrain(sit);else renderRest(sit);
}
function renderTrain(sit){
 const u=sit.unit;
 const hero=el('div','td-hero');
 const top=el('div','td-top');
 top.append(el('span','td-kick',sit.picked?'Heute gewählt':'Heute dran'));
 const other=btn('td-link','',openUnits);other.innerHTML=ICON.swap+'<span>Andere Einheit</span>';top.append(other);
 hero.append(top,el('h2','',u.title||'Training'));
 const ex=Array.isArray(u.ex)?u.ex:[];
 const loc=locationLabel(u.location);
 hero.append(el('div','td-meta',[ex.length+(ex.length===1?' Übung':' Übungen'),estimateMinutes(ex)?'ca. '+estimateMinutes(ex)+' min':'',loc].filter(Boolean).join(' · ')));
 const SHOW=5,list=expanded?ex:ex.slice(0,SHOW);
 list.forEach((e,i)=>{
  const r=el('div','td-ex');r.append(el('i','',String(i+1)),el('span','',e.name||'Übung'));
  const kg=lastSet(e.name)??(Number(e.kg)>0?Number(e.kg):null);
  const em=el('em','',doseText(e));if(kg){em.append(document.createTextNode(' · '));em.append(el('b','',fmtKg(kg)+' kg'));}
  r.append(em);hero.append(r);
 });
 const more=el('div','td-more');
 if(ex.length>SHOW&&!expanded){more.append(btn('','+ '+(ex.length-SHOW)+(ex.length-SHOW===1?' weitere Übung':' weitere Übungen'),()=>{expanded=true;render(true);}));more.append(document.createTextNode(' · Gewichte vom letzten Mal'));}
 else if(!ex.length)more.textContent='Noch keine Übungen – über „Anpassen“ hinzufügen.';
 else more.textContent='Gewichte vom letzten Mal';
 hero.append(more);
 card.append(hero);
 if(typeof forge144SetEnergy==='function'){
  const mood=el('div','td-mood');mood.setAttribute('role','group');mood.setAttribute('aria-label','Tagesform');
  const lab=el('span','','Tagesform');lab.append(el('small','','optional'));mood.append(lab);
  const cur=energy();
  for(let v=1;v<=5;v++){const b=btn('',String(v),()=>{try{forge144SetEnergy(v);}catch(e){}render(true);});b.setAttribute('aria-label','Tagesform '+v+' von 5');b.setAttribute('aria-pressed',String(cur===v));mood.append(b);}
  card.append(mood);
 }
 const go=btn('td-go','',()=>start(u));go.innerHTML=ICON.play+'<span>Training starten</span>';
 card.append(go);
 const row=el('div','td-row');row.append(btn('td-chip','Anpassen',()=>openAdjust(u)));
 card.append(row);
}
function renderRest(sit){
 const hero=el('div','td-hero rest');
 const top=el('div','td-top');top.append(el('span','td-kick',sit.kind==='done'?'Heute erledigt':'Heute Ruhetag'));
 const other=btn('td-link','',openUnits);other.innerHTML=ICON.swap+'<span>Einheit wählen</span>';top.append(other);
 hero.append(top,el('h2','',sit.kind==='done'?'Stark – Training gespeichert.':'Erholung ist Training.'));
 const p=el('p','td-rest-text');
 if(sit.next){p.append(document.createTextNode('Nächstes Training: '));p.append(el('b','',whenText(sit.next.offset,sit.next.date)+' · '+(sit.next.plan.title||'Training')));}
 else p.textContent='Kein weiteres Training geplant.';
 hero.append(p);
 const t=today(),mon=addDays(t,-weekdayOf(t)),o=opts(),st=S();
 const wk=el('div','td-week');wk.setAttribute('aria-hidden','true');
 for(let i=0;i<7;i++){const iso=addDays(mon,i);const u=unitOn(st.plan,iso,o);const s=el('span',(u?'on':'')+(iso===t?' t':''));s.append(document.createTextNode(DAYS[i]),el('i'));wk.append(s);}
 hero.append(wk);card.append(hero);
 card.append(el('div','td-label','Lust auf etwas Leichtes?'));
 const opt=(cls,icon,title,sub,fn)=>{const b=btn('td-opt','',fn);const i=el('i',cls);i.innerHTML=icon;const s=el('span');s.append(el('b','',title),el('small','',sub));const c=el('span');c.style.flex='0 0 auto';c.innerHTML=ICON.chev;b.append(i,s,c);return b;};
 card.append(opt('mob',ICON.mob,'Mobilität','Geführte Routine mit Timer und Seitenwechsel',()=>switchMode('mobility')));
 card.append(opt('cardio',ICON.cardio,'Lockeres Cardio','Gehen, Rad, Laufen – die Uhr läuft mit',()=>switchMode('cardio')));
 if(sit.unit)card.append(btn('td-sec',(sit.kind==='done'?'Noch eine Einheit: ':'Trotzdem trainieren: ')+(sit.unit.title||'Training'),()=>{chosenId=sit.unit.id;chosenDay=today();render(true);}));
}
function renderEmpty(){
 const hero=el('div','td-hero rest');
 hero.append(el('span','td-kick','Krafttraining'),el('h2','','Noch kein Trainingsplan'),el('p','td-rest-text','Erstelle in einer Minute deinen Plan – oder trainiere frei mit Übungen aus dem Katalog.'));
 card.append(hero);
 card.append(btn('td-go','Plan erstellen',()=>{if(typeof window.ForgeLayoutBWizardOpen==='function')window.ForgeLayoutBWizardOpen('strength');else if(typeof window.go==='function')window.go('plan');}));
 card.append(btn('td-sec','Freies Training',openFree));
}
function switchMode(m){const b=document.querySelector('#forge150WorkoutModes button[data-mode="'+m+'"]');if(b){b.click();setTimeout(()=>window.scrollTo(0,0),60);return;}if(m==='mobility'&&typeof window.ForgeLayoutBMobilityStart==='function')window.ForgeLayoutBMobilityStart('gentle');}

/* ---------- start ---------- */
function start(u){
 const st=S();if(!st||!u)return;
 if(st.activeWorkout){if(typeof window.go==='function')window.go('workout');return;}
 if(st.workoutDraft&&String(st.workoutDraft.planId)!==String(u.id)){
  confirmSheet('Gespeicherten Entwurf verwerfen?','Es gibt noch Eingaben von einer anderen Einheit, die nicht gestartet wurde. Für „'+(u.title||'Training')+'“ beginnst du neu.','Verwerfen & starten',()=>{st.workoutDraft=null;store();closeSheet();doStart(u);});
  return;
 }
 doStart(u);
}
function doStart(u){
 try{
  const ws=$('workoutSelect');
  if(ws&&![...ws.options].some(o=>o.value===String(u.id))){const o=document.createElement('option');o.value=String(u.id);o.textContent=u.title||'Training';ws.append(o);}
  if(typeof window.startWorkout==='function')window.startWorkout(u.id);else if(typeof startWorkout==='function')startWorkout(u.id);
 }catch(e){console.error('FORGE Training starten',e);}
 chosenId=null;expanded=false;key='';
}

/* ---------- free training ---------- */
function catalog(){try{return typeof forge138AvailableNames==='function'?[...new Set(forge138AvailableNames())]:[];}catch(e){return [];}}
function defaults(n){try{return typeof forge138Defaults==='function'?forge138Defaults(n):null;}catch(e){return null;}}
function openFree(){
 const names=catalog();const pick=[];let q='';
 const sh=openSheet('Freies Training');
 sh.append(el('strong','t','Freies Training'),el('p','','Wähle die Übungen für heute. Dein Plan bleibt unverändert.'));
 const search=el('input');search.type='search';search.placeholder='Übung suchen';search.setAttribute('aria-label','Übung suchen');
 const chips=el('div','chips');const list=el('div','scroll');
 const go=btn('m','',()=>{if(!pick.length)return;const u=freeUnit(pick,defaults);startFree(u);});
 const fill=()=>{
  chips.replaceChildren(...pick.map(n=>el('span','',n)));
  list.replaceChildren();
  filterNames(names,q).slice(0,80).forEach(n=>{
   const on=pick.includes(n);const b=btn('pick','',()=>{const i=pick.indexOf(n);if(i>=0)pick.splice(i,1);else pick.push(n);fill();});
   const ic=el('i');if(on)ic.innerHTML=ICON.check;b.append(ic,el('span','',n));b.setAttribute('aria-pressed',String(on));list.append(b);
  });
  if(!list.children.length)list.append(el('p','note','Keine Übung gefunden.'));
  go.textContent=pick.length?'Training starten · '+pick.length+(pick.length===1?' Übung':' Übungen'):'Übungen auswählen';go.disabled=!pick.length;
 };
 search.addEventListener('input',()=>{q=search.value;fill();});
 sh.append(search,chips,list,go);fill();
}
function startFree(u){
 const st=S();if(!st)return;
 const run=()=>{
  closeSheet();
  if(!Array.isArray(st.plan))st.plan=[];
  st.plan=st.plan.filter(p=>!isFree(p));
  st.plan.push(u);store();doStart(u);
  if(!st.activeWorkout){st.plan=st.plan.filter(p=>p!==u);store();}
 };
 if(st.workoutDraft&&!isFree(realUnits(st.plan).find(p=>String(p.id)===String(st.workoutDraft.planId))||{})){
  confirmSheet('Gespeicherten Entwurf verwerfen?','Es gibt noch Eingaben einer Einheit, die nicht gestartet wurde. Das freie Training beginnt neu.','Verwerfen & starten',()=>{st.workoutDraft=null;store();run();});
  return;
 }
 st.workoutDraft=null;run();
}
/* A free unit only lives while its workout runs. */
function cleanupFree(){
 const st=S();if(!st||!Array.isArray(st.plan)||!st.plan.some(isFree))return;
 const activeId=st.activeWorkout&&String(st.activeWorkout.planId);
 const keep=p=>!isFree(p)||String(p.id)===activeId;
 if(st.plan.every(keep))return;
 st.plan=st.plan.filter(keep);
 if(st.workoutDraft&&String(st.workoutDraft.planId).startsWith(FREE_PREFIX)&&String(st.workoutDraft.planId)!==activeId)st.workoutDraft=null;
 store();
}

/* ---------- sheets ---------- */
let sheet=null;
function openSheet(label){
 closeSheet();ensureCss();
 const shade=el('div','forge-lb-td-shade');shade.addEventListener('click',e=>{if(e.target===shade)closeSheet();});
 const s=el('div','forge-lb-td-sheet');s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');s.setAttribute('aria-label',label);
 s.append(el('div','h'));shade.append(s);document.body.append(shade);sheet=shade;
 document.addEventListener('keydown',onKey,true);
 return s;
}
function closeSheet(){if(sheet){sheet.remove();sheet=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSheet();}}
function confirmSheet(title,text,ok,fn){
 const s=openSheet(title);s.append(el('strong','t',title),el('p','',text));
 const a=el('div','acts');a.append(btn('s','Abbrechen',closeSheet),btn('m',ok,fn));s.append(a);
}
function openUnits(){
 const st=S();if(!st)return;
 const sit=situation();const units=realUnits(st.plan);const t=today();
 let sel=sit.unit?String(sit.unit.id):'';
 const s=openSheet('Welche Einheit heute?');
 s.append(el('strong','t','Welche Einheit heute?'),el('p','','Dein Plan bleibt gleich – du tauschst nur das heutige Training.'));
 const list=el('div','scroll');
 const ok=btn('m','',()=>{const u=units.find(p=>String(p.id)===sel);if(!u)return;chosenId=u.id;chosenDay=t;expanded=false;closeSheet();render(true);window.scrollTo(0,0);});
 const fill=()=>{
  list.replaceChildren();
  units.forEach((u,i)=>{
   const b=btn('unit','',()=>{sel=String(u.id);fill();});b.setAttribute('aria-pressed',String(sel===String(u.id)));
   const letter=(String(u.title||'').match(/Einheit\s+([A-Z])\s*$/)||[])[1]||(String.fromCharCode(65+i));
   const sp=el('span');sp.append(el('b','',u.title||'Training'),el('small','',(u.ex||[]).length+' Übungen · '+lastDoneText(daysSince(lastDoneIso(u),t))));
   b.append(el('i','',letter),sp);
   if(sit.due&&String(sit.due.id)===String(u.id))b.append(el('em','','Heute dran'));
   else if(!sit.due&&sit.next&&String(sit.next.plan.id)===String(u.id))b.append(el('em','','Als Nächstes'));
   list.append(b);
  });
  const free=btn('unit dash','',openFree);const sp=el('span');sp.append(el('b','','Freies Training'),el('small','','Übungen selbst aus dem Katalog wählen'));const c=el('span');c.innerHTML=ICON.chev;free.append(sp,c);list.append(free);
  const u=units.find(p=>String(p.id)===sel);
  ok.textContent=u?(u.title||'Einheit')+' übernehmen':'Einheit wählen';ok.disabled=!u;
 };
 fill();s.append(list,ok);
}
function openAdjust(u){
 const s=openSheet('Heutiges Training anpassen');
 s.append(el('strong','t','Heutiges Training anpassen'));
 const row=(t,sub,fn)=>{const b=btn('row','',fn);const sp=el('span');sp.append(el('b','',t),el('small','',sub));const c=el('span');c.innerHTML=ICON.chev;b.append(sp,c);return b;};
 const list=el('div','scroll');
 list.append(row('Übungen dieser Einheit bearbeiten','Tauschen, weglassen, hinzufügen, Sätze ändern',()=>{closeSheet();try{if(typeof window.forgeOpenActivePlanDay==='function')window.forgeOpenActivePlanDay(u.id);}catch(e){console.error(e);}}));
 list.append(row('Andere Einheit wählen','Nur für heute – dein Plan bleibt gleich',()=>{closeSheet();openUnits();}));
 list.append(row('Freies Training','Übungen selbst aus dem Katalog wählen',()=>{closeSheet();openFree();}));
 list.append(row('Training nachtragen','Schon trainiert? Tag, Sätze und Gewichte erfassen',()=>{closeSheet();if(typeof window.forgeOpenLogWorkout==='function')window.forgeOpenLogWorkout(u&&u.id);}));
 list.append(row('Plan bearbeiten','Dauerhaft ändern – öffnet den Plan',()=>{closeSheet();if(typeof window.go==='function')window.go('plan');}));
 s.append(list);
 s.append(el('p','note','Aufwärmsätze und die Reihenfolge für heute änderst du direkt im Training.'));
}
/* ---------- lifecycle ---------- */
function modeIcons(){
 document.querySelectorAll('#forge150WorkoutModes button[data-mode]').forEach(b=>{
  const m=b.dataset.mode;const lab={strength:'Kraft',mobility:'Mobilität',cardio:'Cardio'}[m];const ic={strength:ICON.kraft,mobility:ICON.mob,cardio:ICON.cardio}[m];
  if(!lab||b.dataset.lbIcon===m)return;b.innerHTML=ic+'<span>'+lab+'</span>';b.dataset.lbIcon=m;
 });
}
function headDate(){
 const h=document.querySelector('#workout .forge-lb-wohead h2');if(!h)return;
 let d=h.parentElement.querySelector('small.forge-lb-date');
 if(!d){const wrap=el('div');h.before(wrap);wrap.append(h);d=el('small','forge-lb-date');wrap.append(d);}
 const t=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});if(d.textContent!==t)d.textContent=t;
}
/* After the mode switch; without it (slow start) directly below the page header. */
function place(page){
 const modes=$('forge150WorkoutModes'),head=page.querySelector(':scope > .forge-lb-wohead');
 const anchor=modes&&modes.parentNode===page?modes:head;
 if(anchor){if(anchor.nextElementSibling!==card)anchor.after(card);}
 else if(page.firstElementChild!==card)page.prepend(card);
}
function tick(){
 if(!enabled())return;
 cleanupFree();
 const page=$('workout');if(!page)return;
 ensureCss();modeIcons();headDate();
 const idle=!live();
 const m=mode();
 const on=idle&&m==='strength';
 page.classList.toggle('forge-lb-today-on',on);
 page.classList.toggle('forge-lb-today-alt',idle&&m!=='strength');
 if(!card||!page.contains(card)){
  card=el('section','forge-lb-today');card.setAttribute('aria-label','Heutiges Training');key='';
  place(page);
 }else place(page);
 // Undo after saving lives in the core workout card; keep it reachable at page level.
 const undo=$('forgeWorkoutUndoBanner');if(undo&&undo.previousElementSibling!==card)card.after(undo);
 if(on&&page.classList.contains('active'))render(false);
}
function install(){
 if(!document.body||!enabled()||!$('workout'))return false;
 ensureCss();tick();
 setInterval(()=>{if(document.visibilityState!=='hidden')tick();},500);
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
window.ForgeLayoutBTodayOpenFree=openFree;
window.ForgeLayoutBTodayRender=()=>{key='';render(true);};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
