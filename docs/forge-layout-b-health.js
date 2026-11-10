/* FORGE Layout B · Health Connect (Schritt 1: Schritte + Gewicht).
 * Weg der Daten: Uhr → Zepp (oder eine andere App) → Health Connect → FORGE.
 * FORGE liest nur (Android 14+): tägliche Schritte der letzten 60 Tage und
 * Gewichtseinträge der letzten 12 Monate. Gewichte werden in den Verlauf
 * übernommen (ein Wert pro Tag, eigene Einträge haben Vorrang), Schritte
 * erscheinen in Erfolge. Abgleich beim Öffnen der App, höchstens alle 30 Min.
 * Schritt 2: Läufe, Radfahrten usw. von der Uhr werden als Cardio übernommen
 * (mit Puls und Strecke), und FORGE-Krafttrainings bekommen den Puls aus
 * genau ihrer Trainingszeit (Ø / max).
 * Daten: state.healthSteps={updated,days:[{date,count}]},
 *        übernommene Gewichte in state.weights mit source:'health'.
 */
(function(){
'use strict';
const SYNC_GAP=30*60*1000;
function isoLocal(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
/* Merge Health Connect weights into the app's list (pure, tested).
 * One value per day; a day that already has an own entry is left alone. */
function mergeWeights(existing,incoming){
 const list=(Array.isArray(existing)?existing:[]).slice();
 const days=new Set(list.filter(w=>w&&w.date).map(w=>isoLocal(new Date(w.date))));
 const byDay=new Map();
 (Array.isArray(incoming)?incoming:[]).forEach(w=>{
  const kg=Number(w&&w.kg);if(!(kg>=20&&kg<=400)||!w.time)return;
  const t=new Date(w.time);if(isNaN(t))return;
  const d=isoLocal(t);const prev=byDay.get(d);
  if(!prev||t>new Date(prev.time))byDay.set(d,{time:t.toISOString(),kg});
 });
 let added=0;
 byDay.forEach((w,d)=>{if(days.has(d))return;list.push({date:w.time,value:Math.round(w.kg*10)/10,source:'health'});added++;});
 list.sort((a,b)=>String(a&&a.date).localeCompare(String(b&&b.date)));
 return {list,added};
}
/* Steps summary (pure, tested). */
function stepsSummary(days,todayIso){
 const list=(Array.isArray(days)?days:[]).filter(d=>d&&d.date&&Number(d.count)>=0);
 const map=new Map(list.map(d=>[d.date,Number(d.count)]));
 const last7=[];const [y,m,dd]=todayIso.split('-').map(Number);
 for(let i=6;i>=0;i--){const d=isoLocal(new Date(y,m-1,dd-i));last7.push({date:d,count:map.has(d)?map.get(d):null});}
 const known=last7.filter(d=>d.count!==null&&d.date!==todayIso);
 return {today:map.has(todayIso)?map.get(todayIso):null,avg7:known.length?Math.round(known.reduce((a,d)=>a+d.count,0)/known.length):null,last7};
}
const SPORT_NAMES={running:'Joggen',cycling:'Radfahren',walking:'Spazieren',hiking:'Wandern',swimming:'Schwimmen',rowing:'Rudern',elliptical:'Crosstrainer',tennis:'Tennis',badminton:'Badminton',tabletennis:'Tischtennis',football:'Fußball',basketball:'Basketball',volleyball:'Volleyball'};
/* Time windows of FORGE workouts in the last 30 days (pure, tested). */
function workoutWindows(workouts,now){
 const t0=(now||new Date()).getTime()-30*864e5,out=[];
 (Array.isArray(workouts)?workouts:[]).forEach(w=>{
  const end=Date.parse(w&&w.date),ms=Number(w&&(w.durationMs||w.strengthDurationMs));
  if(!w||!w.id||!Number.isFinite(end)||end<t0||!(ms>=5*60000)||ms>6*3600000)return;
  out.push({id:String(w.id),start:new Date(end-ms).toISOString(),end:new Date(end).toISOString()});
 });
 return out.slice(-40);
}
/* Cardio sessions from the watch → FORGE cardio log; skips ones already logged in FORGE (pure, tested). */
function importSessions(logs,sessions){
 const list=(Array.isArray(logs)?logs:[]).slice();let added=0,updated=0;
 const spans=list.filter(x=>x&&x.date).map(x=>{const e=Date.parse(x.date),d=Number(x.durationMs)||0;return [e-d,e];});
 (Array.isArray(sessions)?sessions:[]).forEach(se=>{
  const st=Date.parse(se&&se.start),en=Date.parse(se&&se.end);if(!Number.isFinite(st)||!(en>st)||!SPORT_NAMES[se.sport])return;
  const id='hc-'+st;const rec={id,date:new Date(en).toISOString(),sport:se.sport,title:se.title&&String(se.title).trim()||SPORT_NAMES[se.sport],
   durationMs:en-st,km:se.meters>0?Math.round(se.meters/10)/100:null,steps:null,avgHr:se.hrAvg>0?Math.round(se.hrAvg):null,maxHr:se.hrMax>0?Math.round(se.hrMax):null,
   kcalEstimate:null,met:null,weightKg:null,intensity:'',note:'Von der Uhr (Health Connect)',source:'health'};
  const at=list.findIndex(x=>x&&x.id===id);
  if(at>=0){list[at]={...list[at],...rec};updated++;return;}
  if(spans.some(([a,b])=>Math.min(b,en)-Math.max(a,st)>Math.min(en-st,b-a)/2))return; // already logged (in FORGE or before)
  list.push(rec);spans.push([st,en]);added++;
 });
 list.sort((a,b)=>String(a&&a.date).localeCompare(String(b&&b.date)));
 return {list,added,updated};
}
/* Heart rate per FORGE workout (pure, tested). */
function applyHeartRate(workouts,windows){
 let n=0;const map=new Map((Array.isArray(windows)?windows:[]).filter(w=>w&&w.id&&w.hrAvg>0).map(w=>[String(w.id),w]));
 (Array.isArray(workouts)?workouts:[]).forEach(w=>{const h=w&&map.get(String(w.id));if(!h)return;w.hr={avg:Math.round(h.hrAvg),max:Math.round(h.hrMax)||null,source:'health'};n++;});
 return n;
}
window.ForgeLayoutBHealth=Object.freeze({mergeWeights,stepsSummary,isoLocal,workoutWindows,importSessions,applyHeartRate,SPORT_NAMES});
if(typeof document==='undefined')return;

const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
const S=()=>typeof state!=='undefined'?state:null;
function native(){const a=window.ForgeAndroid;return a&&typeof a.healthStatus==='function'?a:null;}
function status(){const a=native();if(!a)return 'web';try{return String(a.healthStatus()||'unsupported');}catch(e){return 'unsupported';}}
function persist(){if(typeof KEY!=='undefined'){localStorage.setItem(KEY,JSON.stringify(S()));return;}if(typeof save==='function')save();}
const fmtInt=n=>Number(n).toLocaleString('de-DE');
let syncing=false,lastResult=null;
function sync(force){
 const a=native();if(!a||syncing||!S())return false;
 const st=status();if(st!=='granted'&&st!=='partial')return false;
 const h=S().healthSteps;if(!force&&h&&Date.now()-Number(h.updated||0)<SYNC_GAP)return false;
 syncing=true;draw();
 try{a.readHealth(60);}catch(e){syncing=false;draw();return false;}
 try{if(typeof a.readHealthSessions==='function')a.readHealthSessions(JSON.stringify(workoutWindows(S().workouts,new Date())));}catch(e){}
 setTimeout(()=>{if(syncing){syncing=false;draw();}},20000);
 return true;
}
window.forgeHealthData=function(json){
 syncing=false;
 let d=null;try{d=JSON.parse(json);}catch(e){}
 const st=S();
 if(d&&st){
  if(Array.isArray(d.steps))st.healthSteps={updated:Date.now(),days:d.steps.filter(x=>x&&x.date).slice(-60)};
  let added=0;
  if(Array.isArray(d.weights)&&d.weights.length){const m=mergeWeights(st.weights,d.weights);st.weights=m.list;added=m.added;}
  try{persist();}catch(e){}
  lastResult={added,steps:(d.steps||[]).length,weights:(d.weights||[]).length,error:d.stepsError||d.weightError||''};
  try{if(typeof render==='function')render();}catch(e){}
 }
 draw();
};
window.forgeHealthSessions=function(json){
 let d=null;try{d=JSON.parse(json);}catch(e){}
 const st=S();if(!d||!st)return;
 const im=importSessions(st.cardioLogs,d.sessions);st.cardioLogs=im.list;
 const hr=applyHeartRate(st.workouts,d.windows);
 try{persist();}catch(e){}
 lastSessions={added:im.added,hr,error:d.sessionError||''};
 try{if(typeof render==='function')render();}catch(e){}
 draw();
};
let lastSessions=null;
window.forgeHealthPermission=function(){draw();sync(true);};

/* ---------- sheet ---------- */
const ACC='#a9f267',TEAL='#5ee0c8';
const CSS=`
.forge-lb-hc-shade{position:fixed;inset:0;z-index:2147480500;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-hc{background:#0b1018;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:10px 16px calc(20px + env(safe-area-inset-bottom));max-height:92vh;overflow:auto;box-sizing:border-box}
.forge-lb-hc *{box-sizing:border-box}
.forge-lb-hc .hc-h{width:44px;height:5px;border-radius:3px;background:#3a4556;margin:0 auto 10px}
.forge-lb-hc .hc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.forge-lb-hc .hc-head strong{font-size:22px;font-weight:800}
.forge-lb-hc .hc-x{width:44px;height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:20px;padding:0}
.forge-lb-hc .hc-text{font-size:14px;color:#c3cddb;line-height:1.5;margin:0 2px 12px}
.forge-lb-hc .hc-flow{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;font-size:13px;font-weight:700;margin:0 0 14px}
.forge-lb-hc .hc-flow span{background:#171e2a;border:1px solid #293346;border-radius:12px;padding:6px 10px}
.forge-lb-hc .hc-flow span.f{border-color:${ACC};color:${ACC}}
.forge-lb-hc .hc-flow i{font-style:normal;color:#5b6b80}
.forge-lb-hc .hc-card{background:#171e2a;border:1px solid #293346;border-radius:20px;padding:14px;margin-bottom:10px}
.forge-lb-hc .hc-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;margin-bottom:8px}
.forge-lb-hc .hc-big{display:flex;align-items:baseline;gap:8px}
.forge-lb-hc .hc-big b{font-size:34px;font-weight:900}
.forge-lb-hc .hc-big span{font-size:14px;color:#c3cddb}
.forge-lb-hc .hc-bars{display:flex;align-items:flex-end;gap:6px;height:64px;margin-top:10px}
.forge-lb-hc .hc-bars div{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end}
.forge-lb-hc .hc-bars i{display:block;width:100%;border-radius:6px 6px 3px 3px;background:${TEAL};min-height:3px}
.forge-lb-hc .hc-bars i.t{background:${ACC}}
.forge-lb-hc .hc-bars small{font-size:10px;color:#95a3b7}
.forge-lb-hc ol{margin:0;padding-left:20px;font-size:14px;line-height:1.6;color:#c3cddb}
.forge-lb-hc ol b{color:#f3f7fc}
.forge-lb-hc .hc-main{width:100%;height:54px;border-radius:27px;border:0;background:${ACC};color:#142016;font:inherit;font-size:16px;font-weight:800;margin-top:6px}
.forge-lb-hc .hc-sec{width:100%;min-height:48px;border-radius:24px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;margin-top:8px}
.forge-lb-hc .hc-note{font-size:12px;color:#95a3b7;line-height:1.45;margin:10px 2px 0}
.forge-lb-hc .hc-ok{font-size:13px;color:${ACC};margin:8px 2px 0}
.forge-lb-hc .hc-err{font-size:13px;color:#ff8a7a;margin:8px 2px 0}
.forge-lb-hc button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
`;
function ensureCss(){if(!$('forgeLayoutBHealthStyle')){const st=el('style');st.id='forgeLayoutBHealthStyle';st.textContent=CSS;document.head.append(st);}}
let shade=null,sheet=null;
function close(){if(shade){shade.remove();shade=null;sheet=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}
function open(){
 if(!enabled())return false;
 ensureCss();close();
 shade=el('div','forge-lb-hc-shade');shade.addEventListener('click',e=>{if(e.target===shade)close();});
 sheet=el('div','forge-lb-hc');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Health Connect');
 shade.append(sheet);document.body.append(shade);document.addEventListener('keydown',onKey,true);
 draw();sync(false);return true;
}
function draw(){
 if(!sheet)return;
 sheet.textContent='';
 const head=el('div','hc-head');head.append(el('strong','','Health Connect'));
 const x=btn('hc-x','×',close);x.setAttribute('aria-label','Schließen');head.append(x);
 sheet.append(el('div','hc-h'),head);
 const flow=el('div','hc-flow');flow.setAttribute('aria-label','Uhr, dann Zepp, dann Health Connect, dann FORGE');
 ['Uhr','Zepp','Health Connect','FORGE'].forEach((t,i)=>{if(i)flow.append(el('i','','→'));flow.append(el('span',t==='FORGE'?'f':'',t));});
 sheet.append(flow);
 const st=status();
 if(st==='web'){sheet.append(el('p','hc-text','Health Connect gibt es in der Android-App. In der Browser- und iPhone-Version kann FORGE diese Daten nicht lesen.'));return;}
 if(st==='unsupported'){sheet.append(el('p','hc-text','Auf diesem Handy ist Health Connect nicht im System eingebaut (dafür braucht FORGE Android 14 oder neuer).'));return;}
 if(st!=='granted'&&st!=='partial'){
  sheet.append(el('p','hc-text','FORGE kann Schritte, Gewicht, Puls und Trainings (Laufen, Rad, …) aus Health Connect lesen – zum Beispiel von deiner Uhr über die Zepp-App. FORGE liest nur und schreibt nichts zurück.'));
  const c=el('div','hc-card');c.append(el('div','hc-label','So geht’s'));
  const ol=el('ol');
  const li=(...parts)=>{const l=el('li');parts.forEach(p=>typeof p==='string'?l.append(p):l.append(p));ol.append(l);};
  li('In der Zepp-App: ',el('b','','Profil › Drittanbieter-Konten verknüpfen › Health Connect'),' einschalten.');
  li('Hier auf ',el('b','','Verbinden'),' tippen und alles erlauben.');
  c.append(ol);sheet.append(c);
  sheet.append(btn('hc-main','Verbinden',()=>{try{native().requestHealthPermissions();}catch(e){}}));
  return;
 }
 const h=S()&&S().healthSteps;
 const sum=stepsSummary(h&&h.days,isoLocal(new Date()));
 const c=el('div','hc-card');c.append(el('div','hc-label','Schritte'));
 const big=el('div','hc-big');big.append(el('b','',sum.today!==null?fmtInt(sum.today):'–'),el('span','','heute'+(sum.avg7!==null?' · Ø '+fmtInt(sum.avg7)+' / Tag':'')));c.append(big);
 const mx=Math.max(1,...sum.last7.map(d=>d.count||0));const bars=el('div','hc-bars');
 sum.last7.forEach((d,i)=>{const b=el('div');const bar=el('i',i===6?'t':'');bar.style.height=Math.max(3,Math.round((d.count||0)/mx*48))+'px';
  b.append(bar,el('small','',new Date(d.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short'}).slice(0,2)));bars.append(b);});
 bars.setAttribute('aria-label','Schritte der letzten sieben Tage');c.append(bars);sheet.append(c);
 const wc=(S().weights||[]).filter(w=>w&&w.source==='health').length;
 const w=el('div','hc-card');w.append(el('div','hc-label','Gewicht'));
 w.append(el('p','hc-text',wc?wc+(wc===1?' Gewichtswert':' Gewichtswerte')+' aus Health Connect im Verlauf (Erfolge › Körpergewicht). Eigene Einträge haben Vorrang.':'Noch keine Gewichtswerte aus Health Connect. Sobald Zepp oder deine Waage welche liefert, erscheinen sie im Verlauf.'));
 sheet.append(w);
 const watch=(S().cardioLogs||[]).filter(x=>x&&x.source==='health').length,hrN=(S().workouts||[]).filter(x=>x&&x.hr&&x.hr.source==='health').length;
 const wc2=el('div','hc-card');wc2.append(el('div','hc-label','Von der Uhr'));
 wc2.append(el('p','hc-text',(watch?watch+(watch===1?' Einheit':' Einheiten')+' (Laufen, Rad, …) als Cardio übernommen':'Noch keine Läufe oder Radfahrten von der Uhr')+' · '+(hrN?'Puls bei '+hrN+(hrN===1?' Training':' Trainings'):'Puls erscheint nach dem Training, sobald die Uhr synchronisiert hat')+'.'));
 sheet.append(wc2);
 sheet.append(btn('hc-main',syncing?'Wird abgeglichen …':'Jetzt abgleichen',()=>sync(true)));
 if(syncing)sheet.lastChild.disabled=true;
 if(lastResult){
  if(lastResult.error)sheet.append(el('p','hc-err','Nicht alles konnte gelesen werden: '+lastResult.error));
  else sheet.append(el('p','hc-ok','Abgeglichen'+(lastResult.added?' · '+lastResult.added+' neue Gewichtswerte':'')+'.'));
 }
 if(lastSessions&&lastSessions.added)sheet.append(el('p','hc-ok',lastSessions.added+' neue Einheiten von der Uhr übernommen.'));
 if(st==='partial')sheet.append(el('p','hc-note','Nicht alle Berechtigungen sind erteilt. Für Puls und Läufe von der Uhr tippe auf „Weitere Daten erlauben“.'));
 if(st==='partial')sheet.append(btn('hc-sec','Weitere Daten erlauben',()=>{try{native().requestHealthPermissions();}catch(e){}}));
 sheet.append(btn('hc-sec','Berechtigungen verwalten',()=>{try{native().openHealthSettings();}catch(e){}}));
 if(h&&h.updated)sheet.append(el('p','hc-note','Zuletzt abgeglichen: '+new Date(h.updated).toLocaleString('de-DE',{weekday:'short',hour:'2-digit',minute:'2-digit'})+' Uhr. Zepp gibt neue Werte oft erst nach dem Synchronisieren der Uhr weiter.'));
}
/* Summary for the Erfolge row. */
function rowText(){const h=S()&&S().healthSteps;if(!h)return null;const s=stepsSummary(h.days,isoLocal(new Date()));return s.today!==null?fmtInt(s.today)+' heute':null;}
function install(){
 if(!document.body||!enabled())return false;
 window.forgeOpenHealth=open;window.forgeHealthRowText=rowText;window.forgeHealthAvailable=()=>!!native();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync(false);});
 setTimeout(()=>sync(false),3000);
 return true;
}
function boot(){if(install())return;let k=0;const t=setInterval(()=>{if(install()||++k>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
