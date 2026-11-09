/* FORGE Layout B · Erfolge R2–R7.
 * Ein Vollbild-Fenster mit den Ansichten
 *  - Trainingsverlauf (Kraft, Mobilität, Cardio, nach Wochen gruppiert) und
 *    Training im Detail (Sätze, Rekorde, Vergleich zum letzten Mal),
 *  - Körpergewicht (Verlauf, −/+ eintragen),
 *  - Rekorde & Fortschritt (bester Satz, geschätztes Maximum nach Epley),
 *  - Muskeln & Erholung (Sätze pro Muskelgruppe, Erholungsschätzung),
 *  - Archivierte Pläne (ansehen, wieder aktivieren über reactivatePlan).
 * Reads the existing state (workouts, weights, mobility, cardio, planArchive);
 * confirmations are in-app sheets, never native dialogs.
 */
(function(){
'use strict';
const ACC='#a9f267',TEAL='#5ee0c8',GOLD='#ffb547';
const GROUPS=Object.freeze(['Beine','Rücken','Brust','Schultern','Arme','Rumpf']);
const TARGET=Object.freeze([10,20]);
const RECOVERY_H=48;

/* ---------- pure helpers (tested) ---------- */
function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0;}
function localDay(d){const x=d instanceof Date?d:new Date(d);if(isNaN(x))return '';return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');}
function mondayOf(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
function normalize(t){return String(t||'').toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').trim();}
function e1rm(kg,reps){kg=num(kg);reps=num(reps);if(kg<=0||reps<=0)return 0;return reps===1?kg:kg*(1+reps/30);}
function validSets(e){return (e&&Array.isArray(e.sets)?e.sets:[]).filter(s=>s&&num(s.reps)>0&&num(s.kg)>=0);}
function workoutVolume(w){let v=0;for(const e of (w&&w.entries)||[])for(const s of validSets(e))v+=num(s.kg)*num(s.reps);return Math.round(v);}
function workoutSetCount(w){let n=0;for(const e of (w&&w.entries)||[])n+=validSets(e).length;return n;}
function topSet(sets){let best=null;for(const s of sets||[]){if(!best||num(s.kg)>num(best.kg)||(num(s.kg)===num(best.kg)&&num(s.reps)>num(best.reps)))best=s;}return best;}
function fmtDur(ms){const m=Math.round(num(ms)/60000);if(m<60)return m+' min';return Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min';}
function fmtNum(n,d){return Number(n).toLocaleString('de-DE',{maximumFractionDigits:d??1});}
function keyOf(w,i){return w&&w.id?String(w.id):'i'+i;}
/* workouts in time order with their storage index */
function ordered(workouts){
 return (Array.isArray(workouts)?workouts:[]).map((w,i)=>({w,i,t:Date.parse(w&&w.date)})).filter(x=>Number.isFinite(x.t)).sort((a,b)=>a.t-b.t||a.i-b.i);
}
/* key → exercise names with a new heaviest top set (only after a first record exists) */
function prMap(workouts){
 const best=new Map(),out=new Map();
 for(const {w,i} of ordered(workouts)){
  const prs=new Set();
  for(const e of w.entries||[]){
   if(!e||!e.name)continue;const top=topSet(validSets(e).filter(s=>num(s.kg)>0));if(!top)continue;
   const prev=best.get(e.name);
   if(prev!==undefined&&num(top.kg)>prev)prs.add(e.name);
   if(prev===undefined||num(top.kg)>prev)best.set(e.name,num(top.kg));
  }
  out.set(keyOf(w,i),prs);
 }
 return out;
}
/* comparison of one exercise to the previous workout that contained it */
function compareToPrevious(workouts,index,name){
 const list=ordered(workouts);const pos=list.findIndex(x=>x.i===index);if(pos<0)return {kind:'none',text:''};
 const cur=topSet(validSets((list[pos].w.entries||[]).find(e=>e&&e.name===name)));
 for(let k=pos-1;k>=0;k--){
  const e=(list[k].w.entries||[]).find(x=>x&&x.name===name);const prev=topSet(validSets(e));
  if(!prev)continue;if(!cur)return {kind:'none',text:''};
  const dk=Math.round((num(cur.kg)-num(prev.kg))*100)/100,dr=num(cur.reps)-num(prev.reps);
  if(dk>0)return {kind:'up',text:'+'+fmtNum(dk,2)+' kg zum letzten Mal'};
  if(dk<0)return {kind:'down',text:'−'+fmtNum(-dk,2)+' kg zum letzten Mal'};
  if(dr>0)return {kind:'up',text:'+'+dr+' Wdh. zum letzten Mal'};
  if(dr<0)return {kind:'down',text:'−'+(-dr)+' Wdh. zum letzten Mal'};
  return {kind:'same',text:'wie letztes Mal'};
 }
 return {kind:'first',text:'zum ersten Mal'};
}
const MOB_NAMES={gentle:'Sanfte Mobilität',hips:'Hüfte & Beine',back:'Rücken & Schultern',full:'Ganzkörper','forge-custom':'Individuell'};
/* one list of strength, mobility and cardio sessions, newest first */
function historyItems(st,prs,routineName){
 const out=[];const w=Array.isArray(st&&st.workouts)?st.workouts:[];
 const pm=prs||prMap(w);
 w.forEach((x,i)=>{const t=Date.parse(x&&x.date);if(!Number.isFinite(t))return;
  const sets=workoutSetCount(x),vol=workoutVolume(x);
  out.push({kind:'strength',key:keyOf(x,i),index:i,t,title:x.title||'Training',
   sub:[x.durationMs?fmtDur(x.durationMs):'',sets+(sets===1?' Satz':' Sätze'),vol?fmtNum(vol,0)+' kg':''].filter(Boolean).join(' · '),
   ms:num(x.strengthDurationMs||x.durationMs),prs:(pm.get(keyOf(x,i))||new Set()).size});});
 const logs=Array.isArray(st&&st.mobility&&st.mobility.logs)?st.mobility.logs:[];
 logs.forEach((x,i)=>{const t=Date.parse(x&&x.date);if(!Number.isFinite(t))return;
  const name=(routineName&&routineName(x.routine))||MOB_NAMES[x.routine]||'Routine';
  out.push({kind:'mobility',key:'m'+i,index:i,t,title:'Mobilität · '+name,
   sub:[x.durationMs?fmtDur(x.durationMs):'',x.exercises?x.exercises+' Übungen':''].filter(Boolean).join(' · '),ms:num(x.durationMs),prs:0});});
 const vids=Array.isArray(st&&st.mobilityVideoSessions)?st.mobilityVideoSessions:[];
 vids.forEach((x,i)=>{const t=Date.parse(x&&(x.finishedAt||x.date));if(!Number.isFinite(t))return;
  out.push({kind:'mobility',key:'v'+i,index:i,t,title:'Mobilität · '+(x.title||'Video'),sub:x.durationMs?fmtDur(x.durationMs):'',ms:num(x.durationMs),prs:0,video:true});});
 const car=Array.isArray(st&&st.cardioLogs)?st.cardioLogs:[];
 car.forEach((x,i)=>{const t=Date.parse(x&&x.date);if(!Number.isFinite(t))return;
  const km=x.km!=null&&num(x.km)>0?num(x.km):null,min=num(x.durationMs)/60000;
  out.push({kind:'cardio',key:'c'+i,index:i,t,title:x.title||'Cardio',
   sub:[x.durationMs?fmtDur(x.durationMs):'',km!=null?fmtNum(km,1)+' km':'',km!=null&&min>0?fmtNum(km/(min/60),1)+' km/h':'',x.steps?fmtNum(x.steps,0)+' Schritte':''].filter(Boolean).join(' · '),
   ms:num(x.durationMs),prs:0});});
 return out.sort((a,b)=>b.t-a.t);
}
function weekGroups(items,now){
 const mon=mondayOf(now||new Date()).getTime(),W=7*86400000,groups=[];
 for(const it of items||[]){
  const k=Math.max(0,Math.floor((mon+W-1-it.t)/W));
  let g=groups[groups.length-1];
  if(!g||g.k!==k){
   const a=new Date(mon-k*W),b=new Date(mon-k*W+6*86400000);
   const label=k===0?'Diese Woche':k===1?'Letzte Woche':a.getDate()+'.'+(a.getMonth()+1)+'. – '+b.getDate()+'.'+(b.getMonth()+1)+'.';
   g={k,label,items:[],ms:0};groups.push(g);
  }
  g.items.push(it);g.ms+=num(it.ms);
 }
 return groups;
}
function weightSeries(weights,days,now){
 const from=days?(now||new Date()).getTime()-days*86400000:-Infinity;
 return (Array.isArray(weights)?weights:[]).map((x,i)=>({t:Date.parse(x&&x.date),v:num(x&&x.value),i})).filter(x=>Number.isFinite(x.t)&&x.v>0&&x.t>=from).sort((a,b)=>a.t-b.t||a.i-b.i);
}
function stepWeight(v,delta){const n=Math.round((num(v)+delta)*10)/10;return Math.max(20,Math.min(400,n));}
function validWeight(v){const n=num(v);return n>=20&&n<=400;}
function exerciseNames(workouts){
 const m=new Map();
 for(const {w,t} of ordered(workouts))for(const e of w.entries||[]){
  if(!e||!e.name||!validSets(e).some(s=>num(s.kg)>0))continue;const x=m.get(e.name)||{n:0,t:0};x.n++;x.t=t;m.set(e.name,x);
 }
 return [...m.entries()].sort((a,b)=>b[1].n-a[1].n||b[1].t-a[1].t).map(x=>x[0]);
}
function exerciseRecords(workouts,name){
 const history=[];let heaviest=null,mostReps=null,bestVolume=null,bestE1=null;
 for(const {w,t} of ordered(workouts)){
  const e=(w.entries||[]).find(x=>x&&x.name===name);const sets=validSets(e).filter(s=>num(s.kg)>0);if(!sets.length)continue;
  let vol=0,e1=0,e1set=null;
  for(const s of sets){
   vol+=num(s.kg)*num(s.reps);const v=e1rm(s.kg,s.reps);if(v>e1){e1=v;e1set=s;}
   if(!heaviest||num(s.kg)>heaviest.kg||(num(s.kg)===heaviest.kg&&num(s.reps)>heaviest.reps))heaviest={kg:num(s.kg),reps:num(s.reps),t};
   if(!mostReps||num(s.reps)>mostReps.reps||(num(s.reps)===mostReps.reps&&num(s.kg)>mostReps.kg))mostReps={kg:num(s.kg),reps:num(s.reps),t};
  }
  history.push({t,e1rm:Math.round(e1*10)/10,kg:num(e1set.kg),reps:num(e1set.reps),volume:Math.round(vol)});
  if(!bestVolume||vol>bestVolume.v)bestVolume={v:Math.round(vol),t};
  if(!bestE1||e1>bestE1.v)bestE1={v:Math.round(e1*10)/10,t};
 }
 return {history,heaviest,mostReps,bestVolume,bestE1};
}
const GROUP_RE=[['Brust',/brust|bankdruck|chest|butterfly|fly|liegestutz|push.?up|dips/],['Rücken',/rucken|latissimus|\blat|nacken|rudern|row|klimmzug|pull.?up|latzug|kreuzheben|deadlift/],
 ['Beine',/bein|oberschenkel|gesass|wade|quadrizeps|hufte|kniebeug|squat|lunge|ausfallschritt|hip thrust|glute/],['Schultern',/schulter|delta|seitheben|frontheben|overhead|shoulder/],
 ['Arme',/bizeps|trizeps|unterarm|arme|curl|pushdown|skullcrusher/],['Rumpf',/rumpf|bauch|core|plank|crunch|sit.?up|leg raise/]];
/* primary muscle group: from the guide's first muscle, else from the exercise name */
function muscleGroupFor(name,guideText){
 const primary=normalize(String(guideText||'').split(/[,;]/)[0]);
 for(const src of [primary,normalize(name)]){if(!src)continue;for(const [g,re] of GROUP_RE)if(re.test(' '+src+' '))return g;}
 return '';
}
function muscleWeek(workouts,now,groupFor){
 const end=(now||new Date()).getTime(),from=end-7*86400000;
 const sets=Object.fromEntries(GROUPS.map(g=>[g,0])),last={};
 for(const {w,t} of ordered(workouts)){
  for(const e of w.entries||[]){
   if(!e||!e.name)continue;const n=validSets(e).length;if(!n)continue;
   const g=(groupFor||muscleGroupFor)(e.name);if(!g)continue;
   if(t>=from&&t<=end)sets[g]+=n;
   if(t<=end&&(!last[g]||t>last[g]))last[g]=t;
  }
 }
 return {sets,last};
}
function recoveryText(lastT,now){
 if(!lastT)return null;const left=lastT+RECOVERY_H*3600000-(now||new Date()).getTime();
 if(left<=0)return {ready:true,text:'bereit'};
 const h=Math.ceil(left/3600000);
 return {ready:false,text:h>=20?'noch ca. '+Math.round(h/24)+(Math.round(h/24)===1?' Tag':' Tage'):'noch ca. '+h+' Std.'};
}
function weekTimes(st,now){
 const mon=mondayOf(now||new Date()).getTime();const inWeek=t=>Number.isFinite(t)&&t>=mon;
 let strength=0,cardio=0,mobility=0;
 for(const w of (st&&st.workouts)||[])if(inWeek(Date.parse(w&&w.date)))strength+=num(w.strengthDurationMs||w.durationMs);
 for(const c of (st&&st.cardioLogs)||[])if(inWeek(Date.parse(c&&c.date)))cardio+=num(c.durationMs);
 for(const m of (st&&st.mobility&&st.mobility.logs)||[])if(inWeek(Date.parse(m&&m.date)))mobility+=num(m.durationMs);
 for(const m of (st&&st.mobilityVideoSessions)||[])if(inWeek(Date.parse(m&&(m.finishedAt||m.date))))mobility+=num(m.durationMs);
 return {strength,cardio,mobility};
}
const MONTHS=['Jan','Feb','März','Apr','Mai','Juni','Juli','Aug','Sept','Okt','Nov','Dez'];
function monthRange(a,b){
 const x=Date.parse(a),y=Date.parse(b);const m=t=>MONTHS[new Date(t).getMonth()];
 if(!Number.isFinite(x)&&!Number.isFinite(y))return '';
 if(!Number.isFinite(x))return 'bis '+m(y)+' '+new Date(y).getFullYear();
 if(!Number.isFinite(y))return 'seit '+m(x);
 const sameYear=new Date(x).getFullYear()===new Date(y).getFullYear();
 const ma=m(x),mb=m(y);
 if(ma===mb&&sameYear)return ma+' '+new Date(y).getFullYear();
 return ma+(sameYear?'':' '+new Date(x).getFullYear())+' – '+mb+' '+new Date(y).getFullYear();
}
function rhythmText(settings,units){
 const c=settings&&settings.cadence;
 if(c&&c.mode==='interval'&&num(c.every)>0)return 'alle '+num(c.every)+' Tage · '+units+(units===1?' Einheit':' Einheiten im Wechsel');
 return units+(units===1?' Tag':' Tage')+' pro Woche';
}
function trainingsBetween(workouts,from,to){
 const a=Date.parse(from),b=Date.parse(to);
 return (Array.isArray(workouts)?workouts:[]).filter(w=>{const t=Date.parse(w&&w.date);return Number.isFinite(t)&&(!Number.isFinite(a)||t>=a)&&(!Number.isFinite(b)||t<=b);}).length;
}
window.ForgeLayoutBProgress=Object.freeze({e1rm,workoutVolume,workoutSetCount,topSet,fmtDur,prMap,compareToPrevious,historyItems,weekGroups,weightSeries,stepWeight,validWeight,
 exerciseNames,exerciseRecords,muscleGroupFor,muscleWeek,recoveryText,weekTimes,monthRange,rhythmText,trainingsBetween,GROUPS,TARGET});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
const $=id=>document.getElementById(id);
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
const S=()=>typeof state!=='undefined'?state:{};
function store(){if(typeof save==='function')save();}
function refreshApp(){try{if(typeof window.render==='function')window.render();}catch(e){console.error('FORGE Erfolge',e);}}
function guideFor(name){try{if(typeof FORGE_STRENGTH_GUIDES!=='undefined'&&Array.isArray(FORGE_STRENGTH_GUIDES[name]))return FORGE_STRENGTH_GUIDES[name][0];}catch(e){}return '';}
const groupCache=new Map();
function groupOf(name){if(!groupCache.has(name))groupCache.set(name,muscleGroupFor(name,guideFor(name)));return groupCache.get(name);}
function routineName(key){try{if(typeof MOB_ROUTINES!=='undefined'&&MOB_ROUTINES[key])return MOB_ROUTINES[key].name;}catch(e){}return '';}
function dateLong(t,withTime){const d=new Date(t);let s=d.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});if(withTime)s+=' · '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});return s;}
function dateShort(t){return new Date(t).toLocaleDateString('de-DE',{day:'numeric',month:'long'});}
function withConfirm(fn){const c=window.confirm,a=window.alert;window.confirm=()=>true;window.alert=()=>{};try{return fn();}finally{window.confirm=c;window.alert=a;}}

const ICON={
 back:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#95a3b7" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
};
const R='.forge-lb-prog';
const CSS=`
${R}{position:fixed;inset:0;z-index:2147480000;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
${R} .pr-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(16px + env(safe-area-inset-top)) 16px 0}
${R} .pr-top{display:flex;align-items:center;gap:12px}
${R} .pr-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${R} .pr-top small{display:block;font-size:13px;color:#95a3b7}
${R} .pr-top h1{margin:0;font-size:24px;font-weight:800;line-height:1.15}
${R} .pr-body{flex:1;min-height:0;overflow-y:auto;padding:12px 0 calc(24px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;scrollbar-width:none;overscroll-behavior:contain}
${R} .pr-body::-webkit-scrollbar{display:none}
${R} .pr-seg{height:44px;flex:0 0 auto;border-radius:22px;background:#171e2a;border:1px solid #293346;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);padding:4px;box-sizing:border-box;gap:4px}
${R} .pr-seg button{border:0;border-radius:18px;background:transparent;color:#95a3b7;font:inherit;font-size:13px;font-weight:600;padding:0 2px}
${R} .pr-seg button[aria-checked="true"]{background:${ACC};color:#142016;font-weight:800}
${R} .pr-group{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding:6px 4px 0}
${R} .pr-group span+span{text-transform:none;letter-spacing:0}
${R} .pr-item{display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:10px 14px 10px 10px;color:#f3f7fc;text-align:left;font:inherit;flex:0 0 auto;min-height:66px}
${R} .pr-date{width:44px;height:44px;flex:0 0 44px;border-radius:12px;background:#1a2a22;color:${ACC};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:700;line-height:1.1}
${R} .pr-date b{font-size:16px}
${R} .pr-date.mobility{background:#14302d;color:${TEAL}}
${R} .pr-date.cardio{background:#2e2410;color:${GOLD}}
${R} .pr-item>span:not(.pr-date):not(.pr-badge){flex:1;min-width:0}
${R} .pr-item b.t{display:block;font-size:15px;overflow-wrap:anywhere}
${R} .pr-item small{font-size:12px;color:#95a3b7}
${R} .pr-badge{font-size:11px;font-weight:800;color:#142016;background:${ACC};border-radius:10px;padding:4px 7px;white-space:nowrap}
${R} .pr-more{min-height:48px;border-radius:24px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;flex:0 0 auto}
${R} .pr-empty{font-size:14px;color:#95a3b7;text-align:center;padding:28px 12px;line-height:1.5}
${R} .pr-card{flex:0 0 auto;background:#171e2a;border:1px solid #293346;border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:10px}
${R} .pr-card.hl{border-color:#405d39;background:linear-gradient(160deg,#273d2d,#171e2a 60%)}
${R} .pr-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px}
${R} .pr-note{font-size:12px;color:#95a3b7;line-height:1.5;margin:0;text-align:center}
${R} .pr-big{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
${R} .pr-big strong{font-size:44px;font-weight:800;line-height:1}
${R} .pr-big span{font-size:18px;color:#c3cddb;font-weight:700}
${R} .pr-big em{font-style:normal;font-size:14px;font-weight:700;margin-left:auto}
${R} .pr-chart{width:100%;height:150px;display:block}
${R} .pr-axis{display:flex;justify-content:space-between;font-size:11px;color:#95a3b7}
${R} .pr-step{display:grid;grid-template-columns:56px 1fr 56px;gap:10px;align-items:center}
${R} .pr-step button{height:56px;border-radius:28px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:24px;font-weight:700}
${R} .pr-step label{display:flex;align-items:baseline;justify-content:center;gap:4px}
${R} .pr-step input{width:110px;background:transparent;border:0;border-bottom:2px solid #3a4556;color:#f3f7fc;font:inherit;font-size:32px;font-weight:800;text-align:center;padding:2px 0}
${R} .pr-main{height:56px;border-radius:28px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800;flex:0 0 auto}
${R} .pr-main:disabled{opacity:.45}
${R} .pr-sec{min-height:48px;border-radius:24px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;padding:0 14px;flex:1}
${R} .pr-list{display:flex;flex-direction:column}
${R} .pr-list>div{display:flex;justify-content:space-between;gap:10px;padding:10px 2px;border-top:1px solid #222b3a;font-size:14px}
${R} .pr-list>div:first-child{border-top:0}
${R} .pr-list span{color:#c3cddb;flex:1;min-width:0}
${R} .pr-list b{white-space:nowrap}
${R} .pr-list small{color:#95a3b7;font-size:12px;margin-left:6px}
${R} .pr-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;flex:0 0 auto;padding:2px 0}
${R} .pr-chips::-webkit-scrollbar{display:none}
${R} .pr-chips button{flex:0 0 auto;height:40px;border-radius:20px;border:1px solid #293346;background:#171e2a;color:#c3cddb;font:inherit;font-size:14px;font-weight:600;padding:0 14px;white-space:nowrap}
${R} .pr-chips button[aria-pressed="true"]{background:${ACC};color:#142016;border-color:${ACC};font-weight:800}
${R} .pr-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:0 0 auto}
${R} .pr-two .pr-card{gap:4px}
${R} .pr-two b{font-size:22px;font-weight:800}
${R} .pr-two small{font-size:12px;color:#95a3b7}
${R} .pr-bar{display:grid;grid-template-columns:84px 1fr 30px;gap:10px;align-items:center;font-size:14px}
${R} .pr-bar i{display:block;height:12px;border-radius:6px;background:#0f1620;position:relative;overflow:hidden}
${R} .pr-bar i u{position:absolute;inset:0 auto 0 0;border-radius:6px;background:${GOLD}}
${R} .pr-bar i u.ok{background:${ACC}}
${R} .pr-bar i u.hi{background:${TEAL}}
${R} .pr-bar b{text-align:right}
${R} .pr-rec{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:14px;background:#0f1620;font-size:14px}
${R} .pr-rec em{font-style:normal;font-weight:700}
${R} .pr-rec em.ready{color:${ACC}}
${R} .pr-rec em.wait{color:${GOLD}}
${R} .pr-three{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex:0 0 auto}
${R} .pr-three div{background:#171e2a;border:1px solid #293346;border-radius:18px;padding:12px 10px;display:flex;flex-direction:column;gap:2px}
${R} .pr-three b{font-size:17px;font-weight:800}
${R} .pr-three small{font-size:12px;color:#95a3b7}
${R} .pr-plan{display:flex;flex-direction:column;gap:4px}
${R} .pr-plan b{font-size:17px;font-weight:800}
${R} .pr-plan small{font-size:13px;color:#95a3b7}
${R} .pr-acts{display:flex;gap:8px}
${R} .pr-acts .pr-main{height:48px;flex:1;font-size:15px}
${R} .pr-toast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147481000;background:#1a2a22;border:1px solid #405d39;color:#f3f7fc;border-radius:16px;padding:10px 16px;font-size:14px;font-weight:700;max-width:90vw}
${R} button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
.forge-lb-prog-shade{position:fixed;inset:0;z-index:2147480500;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-prog-sheet{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:10px 16px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;max-height:calc(100% - 36px - env(safe-area-inset-top));overflow-y:auto;scrollbar-width:none;overscroll-behavior:contain}
.forge-lb-prog-sheet::-webkit-scrollbar{display:none}
.forge-lb-prog-sheet .h{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center;flex:0 0 auto}
.forge-lb-prog-sheet .hd{display:flex;justify-content:space-between;align-items:center;gap:10px}
.forge-lb-prog-sheet .hd small{display:block;font-size:13px;color:#95a3b7}
.forge-lb-prog-sheet .hd h2,.forge-lb-prog-sheet strong.t{margin:0;font-size:22px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
.forge-lb-prog-sheet .x{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
.forge-lb-prog-sheet p{margin:0;font-size:14px;color:#c3cddb;line-height:1.5}
.forge-lb-prog-sheet .st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.forge-lb-prog-sheet .st div{background:#171e2a;border:1px solid #293346;border-radius:16px;padding:10px;display:flex;flex-direction:column;gap:2px}
.forge-lb-prog-sheet .st b{font-size:20px;font-weight:800}
.forge-lb-prog-sheet .st small{font-size:12px;color:#95a3b7}
.forge-lb-prog-sheet .ex{background:#171e2a;border:1px solid #293346;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:8px}
.forge-lb-prog-sheet .ex.pr{border-color:#405d39}
.forge-lb-prog-sheet .ex .n{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.forge-lb-prog-sheet .ex .n b{font-size:15px;overflow-wrap:anywhere}
.forge-lb-prog-sheet .ex .n em{font-style:normal;font-size:12px;font-weight:700;color:#95a3b7;white-space:nowrap}
.forge-lb-prog-sheet .ex .n em.up{color:${ACC}}
.forge-lb-prog-sheet .ex .n em.pr{color:#142016;background:${ACC};border-radius:10px;padding:3px 7px}
.forge-lb-prog-sheet .ex .n em.down{color:${GOLD}}
.forge-lb-prog-sheet .sets{display:flex;flex-wrap:wrap;gap:6px}
.forge-lb-prog-sheet .sets span{font-size:13px;border-radius:10px;background:#0f1620;border:1px solid #293346;padding:5px 9px;color:#c3cddb}
.forge-lb-prog-sheet .sets span.top{border-color:${ACC};color:${ACC};font-weight:800}
.forge-lb-prog-sheet .info{font-size:13px;color:#c3cddb;background:#0f1620;border-radius:14px;padding:10px 12px;line-height:1.45}
.forge-lb-prog-sheet .acts{display:flex;gap:8px}
.forge-lb-prog-sheet .m{height:56px;border-radius:28px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800;flex:1}
.forge-lb-prog-sheet .s{min-height:50px;border-radius:25px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;flex:1}
.forge-lb-prog-sheet .s.danger{color:#ffb4b8;border-color:#5a3438}
.forge-lb-prog-sheet .m.danger{background:#ff8a92;color:#2a0d10}
.forge-lb-prog-sheet .link{border:0;background:transparent;color:${ACC};font:inherit;font-size:14px;font-weight:700;padding:6px 2px;text-align:left}
.forge-lb-prog-sheet .unit{background:#171e2a;border:1px solid #293346;border-radius:16px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.forge-lb-prog-sheet .unit b{font-size:15px}
.forge-lb-prog-sheet .unit div{display:flex;justify-content:space-between;font-size:13px;color:#c3cddb;gap:8px}
.forge-lb-prog-sheet button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
`;
function ensureCss(){if(!$('forgeLayoutBProgressCss')){const s=el('style');s.id='forgeLayoutBProgressCss';s.textContent=CSS;document.head.append(s);}}

/* ---------- window ---------- */
const VIEWS={history:['Erfolge','Trainingsverlauf'],weight:['Erfolge','Körpergewicht'],records:['Erfolge','Rekorde & Fortschritt'],muscles:['Erfolge · diese Woche','Muskeln & Erholung'],archive:['Plan','Archivierte Pläne']};
let root=null,ui=null,sheet=null;
function open(view){
 if(!enabled()||!VIEWS[view])return false;
 ensureCss();close();
 ui={view,filter:'all',limit:40,range:30,exercise:'',weight:null};
 root=el('div','forge-lb-prog');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.dataset.view=view;
 document.body.append(root);document.addEventListener('keydown',onKey,true);
 render();return true;
}
function close(){closeSheet();if(root){root.remove();root=null;ui=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();if(sheet)closeSheet();else close();}
function toast(text){if(!root)return;root.querySelector('.pr-toast')?.remove();const t=el('div','pr-toast',text);t.setAttribute('role','status');root.append(t);setTimeout(()=>t.remove(),2400);}
function render(){
 if(!root||!ui)return;
 const [kicker,title]=VIEWS[ui.view];
 root.setAttribute('aria-label',title);
 const prevScroll=root.querySelector('.pr-body')?.scrollTop||0;
 const inner=el('div','pr-in');
 const top=el('div','pr-top');const back=btn('pr-round','',close);back.innerHTML=ICON.back;back.setAttribute('aria-label','Zurück');
 const hd=el('div');hd.append(el('small','',kicker),el('h1','',title));top.append(back,hd);
 const body=el('div','pr-body');
 try{({history:renderHistory,weight:renderWeight,records:renderRecords,muscles:renderMuscles,archive:renderArchive})[ui.view](body);}
 catch(e){console.error('FORGE Erfolge',e);body.replaceChildren(el('div','pr-empty','Diese Ansicht konnte nicht geladen werden.'));}
 inner.append(top,body);root.replaceChildren(inner);
 body.scrollTop=prevScroll;
}
function seg(options,current,onPick,label){
 const s=el('div','pr-seg');s.setAttribute('role','radiogroup');s.setAttribute('aria-label',label);
 options.forEach(([v,t])=>{const b=btn('',t,()=>onPick(v));b.setAttribute('role','radio');b.setAttribute('aria-checked',String(v===current));s.append(b);});
 return s;
}

/* R2 · Trainingsverlauf */
function renderHistory(body){
 const st=S(),prs=prMap(st.workouts);
 const all=historyItems(st,prs,routineName);
 const items=ui.filter==='all'?all:all.filter(x=>x.kind===ui.filter);
 body.append(seg([['all','Alle'],['strength','Kraft'],['mobility','Mobilität'],['cardio','Cardio']],ui.filter,v=>{ui.filter=v;ui.limit=40;render();},'Filter'));
 if(!items.length){body.append(el('div','pr-empty',ui.filter==='all'?'Noch keine Einheiten gespeichert. Nach deinem ersten Training erscheint es hier.':'Für diesen Filter gibt es noch keine Einheiten.'));return;}
 for(const g of weekGroups(items.slice(0,ui.limit),new Date())){
  const h=el('div','pr-group');h.append(el('span','',g.label),el('span','',g.items.length+(g.items.length===1?' Einheit':' Einheiten')+(g.ms?' · '+fmtDur(g.ms):'')));body.append(h);
  for(const it of g.items){
   const b=btn('pr-item','',()=>openItem(it));b.dataset.kind=it.kind;
   const d=new Date(it.t);const dt=el('span','pr-date '+it.kind);dt.append(el('b','',String(d.getDate())),document.createTextNode(MONTHS[d.getMonth()]));
   const tx=el('span');tx.append(el('b','t',it.title),el('small','',it.sub));
   b.append(dt,tx);
   if(it.prs){b.append(el('span','pr-badge',it.prs+' PR'));}else{const c=el('span');c.innerHTML=ICON.chev;b.append(c);}
   b.setAttribute('aria-label',dateLong(it.t)+': '+it.title+(it.sub?', '+it.sub:'')+(it.prs?', '+it.prs+' neue Rekorde':''));
   body.append(b);
  }
 }
 if(items.length>ui.limit)body.append(btn('pr-more','Ältere Einheiten laden',()=>{ui.limit+=40;render();}));
}
function openItem(it){if(it.kind==='strength')openWorkout(it.index);else openSession(it);}

/* R3 · Training im Detail */
function planUnitFor(w){const p=(S().plan||[]).find(x=>x&&x.title===w.title);return p||null;}
function openWorkout(index){
 const st=S(),w=(st.workouts||[])[index];if(!w)return;
 const prs=prMap(st.workouts).get(keyOf(w,index))||new Set();
 const t=Date.parse(w.date);
 const sh=openSheet(w.title||'Training');
 const hd=el('div','hd');const ht=el('div');ht.append(el('small','',dateLong(t,true)),el('h2','',w.title||'Training'));
 const x=btn('x','',closeSheet);x.innerHTML=ICON.x;x.setAttribute('aria-label','Schließen');hd.append(ht,x);
 const stats=el('div','st');
 [[w.durationMs?String(Math.round(num(w.durationMs)/60000)):'–','Minuten'],[String(workoutSetCount(w)),'Sätze'],[fmtNum(workoutVolume(w),0),'kg Volumen']].forEach(([v,k])=>{const d=el('div');d.append(el('b','',v),el('small','',k));stats.append(d);});
 sh.append(hd,stats);
 const entries=(w.entries||[]).filter(e=>e&&e.name);
 const cards=entries.map(e=>{
  const sets=validSets(e);const c=el('div','ex'+(prs.has(e.name)?' pr':''));
  const n=el('div','n');n.append(el('b','',e.name));
  if(prs.has(e.name))n.append(el('em','pr','Neuer Rekord'));
  else{const cmp=compareToPrevious(st.workouts,index,e.name);if(cmp.text)n.append(el('em',cmp.kind,cmp.text));}
  const top=prs.has(e.name)?topSet(sets.filter(s=>num(s.kg)>0)):null;
  const sl=el('div','sets');
  if(sets.length)sets.forEach(s=>sl.append(el('span',s===top?'top':'',(num(s.kg)?fmtNum(num(s.kg),2)+' × ':'')+num(s.reps)+(num(s.kg)?'':' Wdh.'))));
  else sl.append(el('span','','keine Sätze erfasst'));
  c.append(n,sl);return c;
 });
 const SHOW=4;
 cards.forEach((c,i)=>{if(i>=SHOW)c.hidden=true;sh.append(c);});
 if(cards.length>SHOW){const more=btn('link','+ '+(cards.length-SHOW)+(cards.length-SHOW===1?' weitere Übung':' weitere Übungen'),()=>{cards.forEach(c=>c.hidden=false);more.remove();});sh.append(more);}
 if(!cards.length)sh.append(el('p','','Für dieses Training sind keine Übungen gespeichert.'));
 const rec=st.recoveryLogs&&st.recoveryLogs[localDay(t)];
 if(rec){
  const sl=['sehr schlecht','schlecht','okay','gut','sehr gut'][num(rec.sleep)-1],en=['sehr niedrig','niedrig','mittel','hoch','sehr hoch'][num(rec.energy)-1],so=['starker Muskelkater','Muskelkater','etwas Muskelkater','kaum Muskelkater','kein Muskelkater'][num(rec.soreness)-1];
  const parts=[sl&&'Schlaf '+sl,en&&'Energie '+en,so].filter(Boolean);
  if(parts.length)sh.append(el('div','info','Tagesform: '+parts.join(' · ')));
 }
 const acts=el('div','acts');
 acts.append(btn('s danger','Training löschen',()=>confirmSheet('Training löschen?','„'+(w.title||'Training')+'“ vom '+dateShort(t)+' wird aus deinem Verlauf entfernt. Rekorde und Statistiken werden neu berechnet.','Löschen',true,()=>deleteWorkout(w,index))));
 const unit=planUnitFor(w);
 if(unit&&!st.activeWorkout&&!(st.workoutDraft&&st.workoutDraft.planId!==unit.id))acts.append(btn('m','Wiederholen',()=>repeatWorkout(unit)));
 sh.append(acts);
}
function deleteWorkout(w,index){
 const st=S();const list=Array.isArray(st.workouts)?st.workouts:[];
 const before=list.slice();
 const pos=w.id?list.findIndex(x=>x&&x.id===w.id):(list[index]===w?index:-1);if(pos<0){closeSheet();render();return;}
 try{st.workouts=list.filter((_,i)=>i!==pos);store();}
 catch(e){console.error('FORGE Training löschen',e);st.workouts=before;toast('Löschen fehlgeschlagen.');return;}
 closeSheet();refreshApp();render();toast('Training gelöscht');
}
function repeatWorkout(unit){
 close();
 try{if(typeof window.startWorkout==='function')window.startWorkout(unit.id);else if(typeof startWorkout==='function')startWorkout(unit.id);}
 catch(e){console.error('FORGE Wiederholen',e);}
}
function openSession(it){
 const st=S();
 const sh=openSheet(it.title);
 const hd=el('div','hd');const ht=el('div');ht.append(el('small','',dateLong(it.t,true)),el('h2','',it.title));
 const x=btn('x','',closeSheet);x.innerHTML=ICON.x;x.setAttribute('aria-label','Schließen');hd.append(ht,x);sh.append(hd);
 const stats=el('div','st');
 const add=(v,k)=>{const d=el('div');d.append(el('b','',v),el('small','',k));stats.append(d);};
 if(it.kind==='cardio'){
  const c=(st.cardioLogs||[])[it.index]||{};
  add(String(Math.round(num(c.durationMs)/60000)),'Minuten');
  if(c.km!=null&&num(c.km)>0)add(fmtNum(num(c.km),1),'km');
  if(c.steps)add(fmtNum(c.steps,0),'Schritte');
  if(c.kcalEstimate)add('≈ '+Math.round(num(c.kcalEstimate)),'kcal geschätzt');
  if(c.avgHr)add(String(c.avgHr),'Ø Puls');
  sh.append(stats);
  if(c.note)sh.append(el('div','info',c.note));
  const acts=el('div','acts');
  acts.append(btn('s danger','Aktivität löschen',()=>confirmSheet('Aktivität löschen?','„'+(c.title||'Cardio')+'“ vom '+dateShort(it.t)+' wird aus deinem Verlauf entfernt.','Löschen',true,()=>{
   const before=st.cardioLogs;st.cardioLogs=(st.cardioLogs||[]).filter(y=>y!==c);
   try{store();}catch(e){st.cardioLogs=before;toast('Löschen fehlgeschlagen.');return;}
   closeSheet();refreshApp();render();toast('Aktivität gelöscht');})));
  sh.append(acts);
 }else{
  const m=it.video?(st.mobilityVideoSessions||[])[it.index]||{}:((st.mobility&&st.mobility.logs)||[])[it.index]||{};
  add(String(Math.round(num(m.durationMs)/60000)),'Minuten');
  if(m.exercises)add(String(m.exercises),'Übungen');
  sh.append(stats);
  sh.append(el('p','',it.video?'Mobilität per Video.':'Mobilitäts-Routine aus FORGE.'));
 }
}

/* R4 · Körpergewicht */
function renderWeight(body){
 const st=S(),all=weightSeries(st.weights),last=all[all.length-1];
 if(ui.weight==null)ui.weight=last?last.v:75;
 const series=weightSeries(st.weights,ui.range,new Date());
 const card=el('div','pr-card hl');
 if(last){
  card.append(el('div','pr-label','Zuletzt · '+new Date(last.t).toLocaleDateString('de-DE',{weekday:'long'})));
  const big=el('div','pr-big');big.append(el('strong','',fmtNum(last.v,1)),el('span','','kg'));
  if(series.length>1){const d=Math.round((series[series.length-1].v-series[0].v)*10)/10;const em=el('em','',(d>0?'+':d<0?'−':'±')+fmtNum(Math.abs(d),1)+' kg');em.style.color=d<0?TEAL:d>0?GOLD:'#c3cddb';big.append(em);}
  card.append(big);
  card.append(chartSvg(series.map(p=>({t:p.t,v:p.v})),TEAL,'Gewichtsverlauf'));
  if(series.length>1){const ax=el('div','pr-axis');ax.append(el('span','',dateShort(series[0].t)),el('span','',dateShort(series[series.length-1].t)));card.append(ax);}
 }else card.append(el('div','pr-empty','Noch kein Gewicht eingetragen. Trag unten dein heutiges Gewicht ein.'));
 body.append(card);
 if(all.length>1)body.append(seg([[30,'4 Wochen'],[91,'3 Monate'],[0,'Alles']],ui.range,v=>{ui.range=v;render();},'Zeitraum'));
 const entry=el('div','pr-card');entry.append(el('div','pr-label','Heute eintragen'));
 const step=el('div','pr-step');
 const input=el('input');input.type='text';input.inputMode='decimal';input.value=fmtNum(ui.weight,1);input.setAttribute('aria-label','Gewicht in kg');
 const saveB=btn('pr-main','Gewicht speichern',()=>saveWeightEntry());
 const sync=()=>{saveB.disabled=!validWeight(ui.weight);};
 input.addEventListener('input',()=>{ui.weight=num(input.value);sync();});
 const minus=btn('','−',()=>{ui.weight=stepWeight(ui.weight,-0.1);input.value=fmtNum(ui.weight,1);sync();});minus.setAttribute('aria-label','100 g weniger');
 const plus=btn('','+',()=>{ui.weight=stepWeight(ui.weight,0.1);input.value=fmtNum(ui.weight,1);sync();});plus.setAttribute('aria-label','100 g mehr');
 const lab=el('label');lab.append(input,el('span','','kg'));
 step.append(minus,lab,plus);entry.append(step,saveB);sync();
 body.append(entry);
 if(all.length){
  const lc=el('div','pr-card');lc.append(el('div','pr-label','Letzte Einträge'));const list=el('div','pr-list');
  all.slice(-5).reverse().forEach(p=>{const r=el('div');r.append(el('span','',new Date(p.t).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'})),el('b','',fmtNum(p.v,1)+' kg'));list.append(r);});
  lc.append(list);body.append(lc);
 }
}
function saveWeightEntry(){
 const st=S(),v=Math.round(num(ui.weight)*10)/10;if(!validWeight(v)){toast('Bitte Gewicht zwischen 20 und 400 kg eingeben.');return;}
 if(!Array.isArray(st.weights))st.weights=[];
 st.weights.push({date:new Date().toISOString(),value:v});
 try{store();}catch(e){st.weights.pop();toast('Speichern fehlgeschlagen.');return;}
 refreshApp();render();toast(fmtNum(v,1)+' kg gespeichert');
}
function chartSvg(points,color,label){
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 320 150');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','pr-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',label);
 if(points.length<2)return svg;
 const vs=points.map(p=>p.v),lo=Math.min(...vs),hi=Math.max(...vs),r=Math.max(.5,hi-lo);
 const t0=points[0].t,t1=points[points.length-1].t,tr=Math.max(1,t1-t0);
 const xy=points.map(p=>[6+((p.t-t0)/tr)*308,134-((p.v-lo)/r)*118]);
 const area=document.createElementNS(ns,'path');area.setAttribute('d','M'+xy.map(p=>p.map(n=>n.toFixed(1)).join(' ')).join(' L')+' L314 146 L6 146 Z');area.setAttribute('fill',color);area.setAttribute('opacity','.12');
 const line=document.createElementNS(ns,'path');line.setAttribute('d','M'+xy.map(p=>p.map(n=>n.toFixed(1)).join(' ')).join(' L'));
 line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('stroke-width','3');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');line.setAttribute('vector-effect','non-scaling-stroke');
 svg.append(area,line);return svg;
}

/* R5 · Rekorde & Fortschritt */
function renderRecords(body){
 const st=S(),names=exerciseNames(st.workouts);
 if(!names.length){body.append(el('div','pr-empty','Sobald du Sätze mit Gewicht speicherst, siehst du hier deine Rekorde und deinen Fortschritt.'));return;}
 if(!names.includes(ui.exercise))ui.exercise=names[0];
 const chips=el('div','pr-chips');chips.setAttribute('aria-label','Übung');
 names.slice(0,16).forEach(n=>{const b=btn('',n,()=>{ui.exercise=n;render();});b.setAttribute('aria-pressed',String(n===ui.exercise));chips.append(b);});
 if(!names.slice(0,16).includes(ui.exercise)){const b=btn('',ui.exercise);b.setAttribute('aria-pressed','true');chips.prepend(b);}
 body.append(chips);
 const r=exerciseRecords(st.workouts,ui.exercise);
 const two=el('div','pr-two');
 const c1=el('div','pr-card hl');c1.append(el('small','','Bester Satz'),el('b','',fmtNum(r.heaviest.kg,2)+' kg × '+r.heaviest.reps),el('small','',dateShort(r.heaviest.t)));
 const c2=el('div','pr-card');c2.append(el('small','','Geschätztes Maximum'),el('b','',fmtNum(Math.round(r.bestE1.v),0)+' kg'),el('small','','für 1 Wiederholung'));
 two.append(c1,c2);body.append(two);
 const hist=r.history.slice(-10);
 const cc=el('div','pr-card');const hh=el('div','pr-group');hh.style.padding='0';hh.append(el('span','','Geschätztes Maximum'),el('span','','letzte '+hist.length+(hist.length===1?' Training':' Trainings')));cc.append(hh);
 if(hist.length>1){
  cc.append(chartSvg(hist.map(h=>({t:h.t,v:h.e1rm})),ACC,'Verlauf geschätztes Maximum'));
  const ax=el('div','pr-axis');ax.append(el('span','',fmtNum(Math.round(hist[0].e1rm),0)+' kg · '+MONTHS[new Date(hist[0].t).getMonth()]),el('span','',fmtNum(Math.round(hist[hist.length-1].e1rm),0)+' kg · '+dateShort(hist[hist.length-1].t)));cc.append(ax);
 }else cc.append(el('p','pr-note','Ab dem zweiten Training mit dieser Übung siehst du hier deinen Verlauf.'));
 body.append(cc);
 const rc=el('div','pr-card');rc.append(el('div','pr-label','Rekorde'));const list=el('div','pr-list');
 const row=(k,t,v)=>{const d=el('div');const s=el('span','',k);s.append(el('small','',dateShort(t)));d.append(s,el('b','',v));list.append(d);};
 row('Schwerster Satz',r.heaviest.t,fmtNum(r.heaviest.kg,2)+' kg × '+r.heaviest.reps);
 row('Meiste Wiederholungen',r.mostReps.t,fmtNum(r.mostReps.kg,2)+' kg × '+r.mostReps.reps);
 row('Meistes Volumen in einem Training',r.bestVolume.t,fmtNum(r.bestVolume.v,0)+' kg');
 rc.append(list);body.append(rc);
 body.append(el('p','pr-note','Geschätztes Maximum nach der Epley-Formel – ein Richtwert, kein Test.'));
}

/* R6 · Muskeln & Erholung */
function renderMuscles(body){
 const st=S(),now=new Date(),mw=muscleWeek(st.workouts,now,groupOf);
 const card=el('div','pr-card');const hh=el('div','pr-group');hh.style.padding='0';hh.append(el('span','','Sätze pro Muskelgruppe'),el('span','','Ziel '+TARGET[0]+'–'+TARGET[1]));card.append(hh);
 const max=Math.max(TARGET[1],...Object.values(mw.sets));
 GROUPS.slice().sort((a,b)=>mw.sets[b]-mw.sets[a]).forEach(g=>{
  const n=mw.sets[g];const r=el('div','pr-bar');const bar=el('i');const u=el('u',n>TARGET[1]?'hi':n>=TARGET[0]?'ok':'');u.style.width=Math.round(n/max*100)+'%';bar.append(u);
  r.append(el('span','',g),bar,el('b','',String(n)));r.setAttribute('aria-label',g+': '+n+' Sätze');card.append(r);
 });
 card.append(el('p','pr-note','Grün: im Zielbereich · Orange: noch darunter · Türkis: darüber'));
 body.append(card);
 const rec=el('div','pr-card');rec.append(el('div','pr-label','Erholung'));
 const trained=GROUPS.filter(g=>mw.last[g]&&now.getTime()-mw.last[g]<7*86400000).map(g=>({g,r:recoveryText(mw.last[g],now),t:mw.last[g]})).sort((a,b)=>b.t-a.t);
 if(trained.length)trained.forEach(x=>{const d=el('div','pr-rec');d.append(el('span','',x.g),el('em',x.r.ready?'ready':'wait',x.r.text));rec.append(d);});
 else rec.append(el('p','pr-note','In den letzten 7 Tagen kein Krafttraining gespeichert.'));
 body.append(rec);
 const tm=weekTimes(st,now);const three=el('div','pr-three');
 [[tm.strength,'Krafttraining'],[tm.cardio,'Cardio'],[tm.mobility,'Mobilität']].forEach(([ms,k])=>{const d=el('div');d.append(el('b','',ms?fmtDur(ms).replace(' min',' min'):'–'),el('small','',k));three.append(d);});
 body.append(el('div','pr-label','Trainingszeit diese Woche'),three);
 body.append(el('p','pr-note','Sätze der letzten 7 Tage, gezählt für die Hauptmuskelgruppe jeder Übung. Erholung ist eine Schätzung (rund 48 Stunden), keine Messung.'));
}

/* R7 · Archivierte Pläne */
function renderArchive(body){
 const st=S(),plan=Array.isArray(st.plan)?st.plan:[],arch=Array.isArray(st.planArchive)?st.planArchive:[];
 if(plan.length){
  const c=el('div','pr-card hl');const p=el('div','pr-plan');
  const since=Date.parse(st.activePlanStarted);
  p.append(el('small','',Number.isFinite(since)?'Aktiv seit '+dateShort(since):'Aktiver Plan'),el('b','',st.activePlanName||'Aktueller Trainingsplan'),
   el('small','',rhythmText(st.settings,plan.length)+(Number.isFinite(since)?' · '+trainingsBetween(st.workouts,st.activePlanStarted,null)+' Trainings':'')));
  c.append(p);body.append(c);
 }
 body.append(el('div','pr-label','Früher genutzt'));
 if(!arch.length){body.append(el('div','pr-empty','Noch keine archivierten Pläne. Wenn du einen neuen Plan erstellst, wird der bisherige hier aufbewahrt.'));}
 arch.forEach(a=>{
  const c=el('div','pr-card');const p=el('div','pr-plan');const units=Array.isArray(a.plan)?a.plan.length:0;
  p.append(el('b','',a.name||'Trainingsplan'),el('small','',[monthRange(a.started,a.ended),units?rhythmText(a.settings,units):'',trainingsBetween(st.workouts,a.started,a.ended)+' Trainings'].filter(Boolean).join(' · ')));
  const acts=el('div','pr-acts');
  acts.append(btn('pr-sec','Ansehen',()=>viewArchived(a)),btn('pr-main','Wieder aktivieren',()=>askReactivate(a)));
  c.append(p,acts);body.append(c);
 });
 body.append(el('p','pr-note','Beim Aktivieren wird dein aktueller Plan automatisch archiviert. Deine Trainings bleiben immer erhalten.'));
}
function viewArchived(a){
 const sh=openSheet(a.name||'Trainingsplan');
 const hd=el('div','hd');const ht=el('div');ht.append(el('small','',monthRange(a.started,a.ended)||'Archivierter Plan'),el('h2','',a.name||'Trainingsplan'));
 const x=btn('x','',closeSheet);x.innerHTML=ICON.x;x.setAttribute('aria-label','Schließen');hd.append(ht,x);sh.append(hd);
 const units=Array.isArray(a.plan)?a.plan:[];
 if(!units.length)sh.append(el('p','','Dieser Plan enthält keine Einheiten.'));
 units.forEach(u=>{const c=el('div','unit');c.append(el('b','',u.title||'Einheit'));
  (u.ex||[]).forEach(e=>{const r=el('div');r.append(el('span','',e.name||'Übung'),el('span','',(e.sets||1)+' × '+(e.reps??'')+(e.unit==='sec'||e.unit==='seconds'?' Sek.':'')));c.append(r);});
  if(!(u.ex||[]).length){const r=el('div');r.append(el('span','','Noch keine Übungen'));c.append(r);}
  sh.append(c);});
 const acts=el('div','acts');acts.append(btn('m','Wieder aktivieren',()=>askReactivate(a)));sh.append(acts);
}
function askReactivate(a){
 const has=(S().plan||[]).length>0;
 confirmSheet('Plan wieder aktivieren?',has?'„'+(a.name||'Trainingsplan')+'“ wird dein aktiver Plan. Dein aktueller Plan wird automatisch archiviert – deine Trainings bleiben erhalten.':'„'+(a.name||'Trainingsplan')+'“ wird dein aktiver Plan.','Aktivieren',false,()=>reactivate(a));
}
function reactivate(a){
 const st=S();
 if(typeof reactivatePlan!=='function'){toast('Aktivieren ist gerade nicht möglich.');return;}
 let snap=null;try{snap=structuredClone({plan:st.plan,planArchive:st.planArchive,settings:st.settings,activePlanId:st.activePlanId,activePlanName:st.activePlanName,activePlanStarted:st.activePlanStarted,hasDeactivatedPlan:st.hasDeactivatedPlan});}catch(e){}
 try{withConfirm(()=>reactivatePlan(a.id));try{st.forgeWeekMoves={};}catch(e){}}
 catch(e){console.error('FORGE Plan aktivieren',e);if(snap)Object.assign(st,snap);store();toast('Aktivieren fehlgeschlagen.');return;}
 closeSheet();refreshApp();render();toast('„'+(a.name||'Trainingsplan')+'“ ist jetzt aktiv');
}

/* ---------- sheets ---------- */
function openSheet(label){
 closeSheet();
 const shade=el('div','forge-lb-prog-shade');shade.addEventListener('click',e=>{if(e.target===shade)closeSheet();});
 const s=el('div','forge-lb-prog-sheet');s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');s.setAttribute('aria-label',label);
 s.append(el('div','h'));shade.append(s);document.body.append(shade);sheet=shade;
 if(!root)document.addEventListener('keydown',onKey,true);
 return s;
}
function closeSheet(){if(sheet){sheet.remove();sheet=null;if(!root)document.removeEventListener('keydown',onKey,true);}}
function confirmSheet(title,text,okText,danger,fn){
 const s=openSheet(title);
 s.append(el('strong','t',title),el('p','',text));
 const acts=el('div','acts');acts.append(btn('s','Abbrechen',closeSheet),btn('m'+(danger?' danger':''),okText,fn));s.append(acts);
 requestAnimationFrame(()=>s.querySelector('.m')?.focus?.());
}

window.ForgeLayoutBProgressOpen=open;
window.ForgeLayoutBProgressClose=close;
})();
