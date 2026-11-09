/* FORGE Layout B · Erinnerungen (Android).
 * - Trainingstag: an Tagen mit geplanter Einheit zur gewählten Uhrzeit
 *   („Heute: Ganzkörper · Einheit A – 5 Übungen, ca. 45 Min.“). Bereits
 *   trainiert → heute keine Erinnerung.
 * - Essen eintragen (optional): täglich zur gewählten Uhrzeit, wenn an dem
 *   Tag noch nichts eingetragen ist.
 * Die App berechnet die nächsten 21 Tage und übergibt sie an Android
 * (ForgeAndroid.scheduleReminders). Android zeigt sie auch, wenn FORGE
 * geschlossen ist, und plant nach einem Neustart neu. Jede Änderung an Plan,
 * Trainings oder Essen plant automatisch neu.
 * Einstellungen liegen in state.forgeReminders (Teil der Datensicherung).
 */
(function(){
'use strict';
const HORIZON=21;
const DEF=Object.freeze({training:{on:false,time:'17:30'},food:{on:false,time:'20:00'}});
function isoOf(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function addDays(iso,n){const [y,m,d]=iso.split('-').map(Number);return isoOf(new Date(y,m-1,d+n,12));}
function validTime(t){return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t||''));}
function settings(raw){
 const r=raw&&typeof raw==='object'?raw:{};
 const pick=(k)=>{const x=r[k]&&typeof r[k]==='object'?r[k]:{};return {on:x.on===true,time:validTime(x.time)?x.time:DEF[k].time};};
 return {training:pick('training'),food:pick('food')};
}
function at(iso,time){const [y,m,d]=iso.split('-').map(Number);const [h,mi]=time.split(':').map(Number);return new Date(y,m-1,d,h,mi,0,0).getTime();}
function minutes(ex){const sets=(ex||[]).reduce((a,e)=>a+Math.max(1,Number(e&&e.sets)||1),0);return sets?Math.max(10,Math.round((sets*2.5+5)/5)*5):0;}
/* Builds the reminder list (pure, tested).
 * input: {settings, now:Date, unitOn(iso)→unit|null, trainedOn(iso)→bool, ateOn(iso)→bool} */
function schedule(input){
 const s=settings(input&&input.settings),now=(input&&input.now)||new Date(),t0=now.getTime();
 const today=isoOf(now),out=[];
 for(let k=0;k<HORIZON;k++){
  const iso=addDays(today,k);
  if(s.training.on){
   const u=input.unitOn?input.unitOn(iso):null;
   const when=at(iso,s.training.time);
   if(u&&when>t0&&!(k===0&&input.trainedOn&&input.trainedOn(iso))){
    const n=(u.ex||[]).length,m=minutes(u.ex);
    out.push({at:when,kind:'training',title:'Heute: '+(u.title||'Training'),text:n+(n===1?' Übung':' Übungen')+(m?' · ca. '+m+' Min.':'')+' – tippe, um zu starten.'});
   }
  }
  if(s.food.on){
   const when=at(iso,s.food.time);
   if(when>t0&&!(k===0&&input.ateOn&&input.ateOn(iso)))out.push({at:when,kind:'food',title:'Essen eintragen',text:'Trag ein, was du heute gegessen hast – dauert nur einen Moment.'});
  }
 }
 return out.sort((a,b)=>a.at-b.at);
}
window.ForgeLayoutBRemind=Object.freeze({schedule,settings,validTime,HORIZON,DEF});
if(typeof document==='undefined')return;

const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
const S=()=>typeof state!=='undefined'?state:null;
function native(){const a=window.ForgeAndroid;return a&&typeof a.scheduleReminders==='function'?a:null;}
function allowed(){const a=native();try{return a&&typeof a.notificationsAllowed==='function'?!!a.notificationsAllowed():!!a;}catch(e){return false;}}
function current(){return settings(S()&&S().forgeReminders);}
function persist(next){const st=S();if(!st)return;st.forgeReminders=next;if(typeof save==='function')save();sync(true);}

function planOpts(){
 const o={};
 try{o.cadence=window.ForgeCadenceSchedule?.getActive?.()||null;o.onDate=window.ForgeCadenceCore?.onDate;}catch(e){}
 try{const wm=typeof window.forge130WeekTrainingMap==='function'?window.forge130WeekTrainingMap():(typeof forge130WeekTrainingMap==='function'?forge130WeekTrainingMap():null);
  if(wm){const t=isoOf(new Date());const T=window.ForgeLayoutBToday;const mon=T?T.addDays(t,-T.weekdayOf(t)):t,sun=T?T.addDays(mon,6):t;o.weekMap=wm;o.sameWeek=iso=>iso>=mon&&iso<=sun;}}catch(e){}
 return o;
}
function unitOn(iso){const T=window.ForgeLayoutBToday;const st=S();if(!T||!st)return null;try{return T.unitOn(st.plan||[],iso,planOpts());}catch(e){return null;}}
function trainedOn(iso){return ((S()&&S().workouts)||[]).some(w=>w&&w.date&&isoOf(new Date(w.date))===iso);}
function ateOn(iso){return ((S()&&S().foods)||[]).some(f=>f&&(f.date===iso||(typeof f.date==='string'&&f.date.slice(0,10)===iso)||(f.time&&isoOf(new Date(f.time))===iso)));}

let lastSent='';
function sync(force){
 const a=native();if(!a||!S())return false;
 let list=[];
 try{list=schedule({settings:current(),now:new Date(),unitOn,trainedOn,ateOn});}catch(e){console.error('FORGE Erinnerungen',e);return false;}
 const json=JSON.stringify(list);
 if(!force&&json===lastSent)return false;
 try{a.scheduleReminders(json);lastSent=json;return true;}catch(e){console.error('FORGE Erinnerungen',e);return false;}
}

/* ---------- sheet ---------- */
const ACC='#a9f267';
const CSS=`
.forge-lb-rm-shade{position:fixed;inset:0;z-index:2147480500;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-rm{background:#0b1018;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:10px 16px calc(20px + env(safe-area-inset-bottom));max-height:92vh;overflow:auto;box-sizing:border-box}
.forge-lb-rm *{box-sizing:border-box}
.forge-lb-rm .rm-h{width:44px;height:5px;border-radius:3px;background:#3a4556;margin:0 auto 10px}
.forge-lb-rm .rm-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
.forge-lb-rm .rm-head strong{font-size:22px;font-weight:800}
.forge-lb-rm .rm-x{width:44px;height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:20px;padding:0}
.forge-lb-rm .rm-text{font-size:13px;color:#95a3b7;line-height:1.5;margin:0 2px 12px}
.forge-lb-rm .rm-card{background:#171e2a;border:1px solid #293346;border-radius:20px;padding:12px 14px;margin-bottom:10px}
.forge-lb-rm .rm-row{display:flex;align-items:center;gap:12px;min-height:48px}
.forge-lb-rm .rm-row>span{flex:1;min-width:0}
.forge-lb-rm .rm-row b{display:block;font-size:16px}
.forge-lb-rm .rm-row small{display:block;font-size:12px;color:#95a3b7;margin-top:2px;line-height:1.35}
.forge-lb-rm .rm-sw{appearance:none;-webkit-appearance:none;width:52px;height:32px;flex:0 0 52px;border-radius:16px;background:#293346;position:relative;margin:0;cursor:pointer;transition:background .15s}
.forge-lb-rm .rm-sw::after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:13px;background:#c3cddb;transition:transform .15s}
.forge-lb-rm .rm-sw:checked{background:${ACC}}.forge-lb-rm .rm-sw:checked::after{transform:translateX(20px);background:#142016}
.forge-lb-rm .rm-time{display:flex;align-items:center;gap:10px;margin-top:8px;border-top:1px solid #222b3a;padding-top:10px}
.forge-lb-rm .rm-time span{flex:1;font-size:14px;color:#c3cddb}
.forge-lb-rm .rm-time input{height:44px;border-radius:12px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:17px;font-weight:700;padding:0 10px;color-scheme:dark}
.forge-lb-rm .rm-time[hidden]{display:none}
.forge-lb-rm .rm-warn{background:#211c12;border:1px solid #6b5426;border-radius:16px;padding:12px 14px;font-size:13px;line-height:1.45;color:#f3dcb0;margin-bottom:10px}
.forge-lb-rm .rm-next{font-size:13px;color:#c3cddb;margin:4px 2px 0;line-height:1.5}
.forge-lb-rm .rm-next b{color:#f3f7fc}
.forge-lb-rm button:focus-visible,.forge-lb-rm input:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
`;
function ensureCss(){if(!$('forgeLayoutBRemindStyle')){const st=el('style');st.id='forgeLayoutBRemindStyle';st.textContent=CSS;document.head.append(st);}}
let shade=null,sheet=null;
function close(){if(shade){shade.remove();shade=null;sheet=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}
function fmtNext(list){
 if(!list.length)return '';
 const n=list[0],d=new Date(n.at),t=isoOf(new Date()),iso=isoOf(d);
 const day=iso===t?'heute':iso===addDays(t,1)?'morgen':d.toLocaleDateString('de-DE',{weekday:'long'});
 return 'Nächste Erinnerung: '+day+', '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+' Uhr – '+String(n.title).replace(/^Heute: /,'');
}
function open(){
 if(!enabled())return false;
 ensureCss();close();
 shade=el('div','forge-lb-rm-shade');shade.addEventListener('click',e=>{if(e.target===shade)close();});
 sheet=el('div','forge-lb-rm');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Erinnerungen');
 shade.append(sheet);document.body.append(shade);document.addEventListener('keydown',onKey,true);
 draw();return true;
}
function draw(){
 if(!sheet)return;
 sheet.textContent='';
 const head=el('div','rm-head');head.append(el('strong','','Erinnerungen'));
 const x=btn('rm-x','×',close);x.setAttribute('aria-label','Schließen');head.append(x);
 sheet.append(el('div','rm-h'),head);
 if(!native()){
  sheet.append(el('p','rm-text','Erinnerungen gibt es in der Android-App. In der Browser- und iPhone-Version kann FORGE keine Mitteilungen senden, wenn die App geschlossen ist.'));
  return;
 }
 const s=current();
 if((s.training.on||s.food.on)&&!allowed()){
  sheet.append(el('div','rm-warn','Mitteilungen sind für FORGE ausgeschaltet. Erlaube sie in den Android-Einstellungen unter Apps › FORGE › Benachrichtigungen.'));
 }
 sheet.append(el('p','rm-text','FORGE erinnert dich auch, wenn die App geschlossen ist. Erinnerungen passen sich automatisch an deinen Plan an.'));
 const card=(key,title,sub,timeLabel)=>{
  const c=el('div','rm-card');
  const row=el('label','rm-row');const sp=el('span');sp.append(el('b','',title),el('small','',sub));
  const sw=el('input','rm-sw');sw.type='checkbox';sw.checked=s[key].on;sw.setAttribute('role','switch');sw.setAttribute('aria-label',title);
  row.append(sp,sw);c.append(row);
  const tr=el('label','rm-time');tr.hidden=!s[key].on;tr.append(el('span','',timeLabel));
  const ti=el('input');ti.type='time';ti.value=s[key].time;ti.setAttribute('aria-label',title+' Uhrzeit');
  ti.addEventListener('change',()=>{if(!validTime(ti.value))return;const n=current();n[key].time=ti.value;persist(n);draw();});
  tr.append(ti);c.append(tr);
  sw.addEventListener('change',()=>{
   const n=current();n[key].on=sw.checked;persist(n);
   if(sw.checked&&!allowed()){try{native().requestNotificationPermission&&native().requestNotificationPermission();}catch(e){}}
   draw();
  });
  return c;
 };
 sheet.append(card('training','Trainingstag','An Tagen mit geplanter Einheit – nicht, wenn du schon trainiert hast.','Uhrzeit'));
 sheet.append(card('food','Essen eintragen','Täglich, wenn an dem Tag noch nichts eingetragen ist.','Uhrzeit'));
 let list=[];try{list=schedule({settings:s,now:new Date(),unitOn,trainedOn,ateOn});}catch(e){}
 const nx=fmtNext(list);if(nx)sheet.append(el('p','rm-next',nx));
 else if(s.training.on&&!s.food.on)sheet.append(el('p','rm-next','In den nächsten drei Wochen ist kein Training geplant.'));
}
window.forgeReminderPermission=function(){if(sheet)draw();sync(true);};

/* ---------- install ---------- */
function install(){
 if(!document.body||!enabled())return false;
 window.forgeOpenReminders=open;
 // Re-plan after anything that can change what is due (debounced; only sends on change).
 let t=null;const later=()=>{clearTimeout(t);t=setTimeout(()=>sync(false),800);};
 const r=window.render;
 if(typeof r==='function'&&!r.__forgeLbRemind){const w=function(){const v=r.apply(this,arguments);later();return v;};w.__forgeLbRemind=true;window.render=w;}
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync(true);});
 window.addEventListener('forge:workout-logged',later);
 setTimeout(()=>sync(true),2500);
 return true;
}
function boot(){if(install())return;let k=0;const tm=setInterval(()=>{if(install()||++k>20)clearInterval(tm);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
