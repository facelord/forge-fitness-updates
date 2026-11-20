/* FORGE Layout B · external calendar sync (Android only).
 * Explicit opt-in. Nothing is written to an Android calendar until the user
 * grants permissions, selects a calendar, and activates sync.
 * Never write native calendar appointments from the PWA.
 */
(function(){
'use strict';
const ACC='#a9f267',HORIZON=56;
const DEF=Object.freeze({enabled:false,calendarId:'',time:'18:00',minutes:60,lastSynced:''});
const $=id=>document.getElementById(id);
const el=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node;};
function isoOf(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function addDays(iso,n){const [y,m,d]=iso.split('-').map(Number);return isoOf(new Date(y,m-1,d+n,12));}
function validTime(x){return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(x||''));}
function settings(x){
 const s=x&&typeof x==='object'?x:{},minutes=Number(s.minutes);
 return {enabled:s.enabled===true,calendarId:/^[1-9]\d*$/.test(String(s.calendarId||''))?String(s.calendarId):'',
  time:validTime(s.time)?s.time:DEF.time,minutes:[30,45,60,75,90,120,150,180].includes(minutes)?minutes:DEF.minutes,
  lastSynced:typeof s.lastSynced==='string'?s.lastSynced.slice(0,40):''};
}
function buildEvents(now,opts,resolve){
 const cfg=settings(opts);if(!cfg.calendarId)throw Error('Kalenderziel fehlt');
 const events=[],start=isoOf(now);
 for(let i=0;i<HORIZON;i++){
  const date=addDays(start,i),plan=resolve(date);
  if(!plan)continue;
  const id=String(plan.id||'');
  if(!id||id.length>110)continue;
  const title='FORGE · '+String(plan.title||'Training').trim().slice(0,76);
  events.push({key:id+'|'+date,date,time:cfg.time,minutes:cfg.minutes,
    title:title.slice(0,100),count:Array.isArray(plan.ex)?plan.ex.length:0,
    location:plan.location==='home'?'home':plan.location==='gym'?'gym':''});
 }
 return {version:1,calendarId:Number(cfg.calendarId),events};
}
window.ForgeLayoutBCalendar=Object.freeze({settings,buildEvents,validTime,HORIZON});
if(typeof document==='undefined')return;

let shade=null,lastSent='',inFlight=false,lastError='';
const stateRef=()=>typeof state==='object'&&state?state:null;
const bridge=()=>window.ForgeAndroid&&typeof window.ForgeAndroid.syncTrainingCalendar==='function'?window.ForgeAndroid:null;
const enabled=()=>!!document.body?.classList.contains('forge-layout-b');
const cfg=()=>settings(stateRef()?.forgeCalendarSettings);
function saveCfg(next){
 const st=stateRef();if(!st)return;
 st.forgeCalendarSettings=settings(next);
 if(typeof save==='function')save();
}
function plannedOn(iso){
 const S=stateRef(),T=window.ForgeLayoutBToday;if(!S||!T)return null;
 const opt={};
 try{opt.cadence=window.ForgeCadenceSchedule?.getActive?.()||null;opt.onDate=window.ForgeCadenceCore?.onDate;}catch(e){}
 try{
  const map=typeof window.forge130WeekTrainingMap==='function'?window.forge130WeekTrainingMap():
            typeof forge130WeekTrainingMap==='function'?forge130WeekTrainingMap():null;
  if(map){
   const today=isoOf(new Date()),monday=T.addDays(today,-T.weekdayOf(today)),sunday=T.addDays(monday,6);
   opt.weekMap=map;opt.sameWeek=date=>date>=monday&&date<=sunday;
  }
 }catch(e){}
 try{return T.unitOn(S.plan||[],iso,opt);}catch(e){console.warn('FORGE calendar schedule',e);return null;}
}
function calendarList(){
 const b=bridge();if(!b||!b.calendarPermissionGranted?.())return [];
 try{
  const value=JSON.parse(b.listCalendars());
  return Array.isArray(value)?value.filter(c=>Number(c.id)>0):[];
 }catch(e){return [];}
}
function sync(force=false){
 const b=bridge(),s=cfg();
 if(!b||!s.enabled||!s.calendarId||inFlight)return false;
 try{
  if(!b.calendarPermissionGranted())return false;
  const payload=JSON.stringify(buildEvents(new Date(),s,plannedOn));
  if(!force&&payload===lastSent)return false;
  inFlight=true;clearTimeout(window.__forgeCalInFlight);window.__forgeCalInFlight=setTimeout(()=>{inFlight=false;},30000);
  b.syncTrainingCalendar(payload);
  lastSent=payload;
  return true;
 }catch(e){inFlight=false;lastSent='';lastError='Kalendersynchronisierung nicht möglich.';return false;}
}
window.forgeCalendarSyncResult=function(json){
 inFlight=false;
 let result;try{result=JSON.parse(json);}catch(e){result={ok:false,error:'Ungültige Kalenderantwort'};}
 if(result.ok){
  lastError='';
  const next={...cfg(),lastSynced:new Date().toLocaleString('de-DE')};
  saveCfg(next);
 }else{lastSent='';lastError=result.error||'Kalendersynchronisierung fehlgeschlagen';}
 if(shade)draw();
};
window.forgeCalendarPermissionChanged=function(){lastSent='';if(shade)draw();if(cfg().enabled)sync(true);};
window.forgeOpenCalendarSync=open;

const CSS=`
.forge-calendar-shade{position:fixed;inset:0;z-index:2147480500;display:flex;flex-direction:column;justify-content:flex-end;background:#05080dcc;color:#f3f7fc;font-family:Inter,system-ui,sans-serif}
.forge-calendar-sheet{background:#0b1018;border-top:1px solid #405443;border-radius:26px 26px 0 0;padding:18px 16px calc(24px + env(safe-area-inset-bottom));width:100%;max-width:560px;max-height:92vh;overflow-y:auto;margin:auto auto 0;box-sizing:border-box}
.forge-calendar-sheet h2{font-size:23px;margin:2px 0 8px}
.forge-calendar-sheet p{font-size:13px;color:#b7c7c0;line-height:1.5}
.forge-calendar-sheet .fc-row{margin:12px 0;display:flex;flex-direction:column;gap:7px}
.forge-calendar-sheet label{font-size:12px;color:#a9f267;font-weight:750}
.forge-calendar-sheet input,.forge-calendar-sheet select{height:52px;background:#141e1e;border:1px solid #4a6156;border-radius:14px;color:#f3f7fc;font:inherit;font-size:15px;padding:0 12px;box-sizing:border-box;width:100%}
.forge-calendar-sheet button{border:1px solid #436047;border-radius:14px;background:#192725;color:#f3f7fc;min-height:48px;padding:10px 14px;font:inherit;font-size:14px;font-weight:700}
.forge-calendar-sheet button.fc-main{background:#9eff00;color:#101b16;border:0;width:100%}
.forge-calendar-sheet button.fc-main:disabled{background:#344438;color:#aab8ac}
.forge-calendar-sheet .fc-hr{border-top:1px solid #26372c;margin:14px 0}
.forge-calendar-sheet .fc-status{font-size:13px;color:#b7c7c0;margin:10px 0}
.forge-calendar-sheet .fc-error{color:#ffb2b2}
`;
function ensureStyle(){if($('forgeCalendarSyncStyle'))return;const s=el('style');s.id='forgeCalendarSyncStyle';s.textContent=CSS;document.head.append(s);}
function close(){if(shade){shade.remove();shade=null;document.removeEventListener('keydown',esc,true);}}
function esc(e){if(e.key==='Escape'){e.preventDefault();close();}}
function open(){
 if(!enabled())return false;
 ensureStyle();close();
 shade=el('div','forge-calendar-shade');
 shade.addEventListener('click',e=>{if(e.target===shade)close();});
 document.body.append(shade);
 document.addEventListener('keydown',esc,true);
 draw();return true;
}
function button(text,fn,main=false){const b=el('button',main?'fc-main':'',text);b.type='button';b.addEventListener('click',fn);return b;}
function field(root,name,control){const box=el('div','fc-row');const label=el('label','',name);
 const id='fc-'+name.replace(/[^a-zA-Z]+/g,'-');control.id=id;label.htmlFor=id;box.append(label,control);root.append(box);}
function draw(){
 if(!shade)return;
 const s=cfg(),b=bridge(),hasNative=!!b,permitted=!!(b&&b.calendarPermissionGranted?.());
 const calendars=permitted?calendarList():[];
 shade.replaceChildren();
 const box=el('div','forge-calendar-sheet');
 const head=el('div');head.style.display='flex';head.style.justifyContent='space-between';head.style.alignItems='center';
 head.append(el('h2','','Kalender synchronisieren'),button('Schließen',close));box.append(head);
 box.append(el('p','','FORGE trägt geplante Trainingseinheiten in deinen ausgewählten Geräte- oder Google-Kalender ein. Dort kannst du sie auch in deiner persönlichen TimeTree-Ansicht anzeigen.'));
 if(!hasNative){
  box.append(el('p','fc-error','Automatische Kalendersynchronisierung ist in der Android-App verfügbar, nicht in der Web-Version.'));
  shade.append(box);return;
 }
 if(!permitted){
  box.append(el('p','','Für die automatische Übertragung wird erst nach deiner Freigabe Zugriff auf den Android-Kalender benötigt.'));
  box.append(button('Kalenderzugriff erlauben',()=>b.requestCalendarPermission(),true));
  shade.append(box);return;
 }
 const select=el('select');const empty=el('option','','Kalender auswählen');empty.value='';select.append(empty);
 calendars.forEach(c=>{const o=el('option','',c.name+' · '+c.account+(c.google?' (Google)':''));o.value=String(c.id);select.append(o);});
 select.value=s.calendarId;
 select.addEventListener('change',()=>{saveCfg({...cfg(),calendarId:select.value,enabled:false,lastSynced:''});lastSent='';lastError='';draw();});
 field(box,'Zielkalender',select);
 if(!calendars.length)box.append(el('p','fc-error','Kein beschreibbarer Kalender vorhanden. Bitte Google Kalender auf diesem Gerät aktivieren.'));
 const time=el('input');time.type='time';time.value=s.time;
 time.addEventListener('change',()=>{saveCfg({...cfg(),time:validTime(time.value)?time.value:DEF.time});lastSent='';sync(true);draw();});
 field(box,'Uhrzeit für Trainingseinträge',time);
 const duration=el('select');
 [30,45,60,75,90,120,150,180].forEach(x=>{const o=el('option','',x+' Minuten');o.value=String(x);duration.append(o);});
 duration.value=String(s.minutes);
 duration.addEventListener('change',()=>{saveCfg({...cfg(),minutes:Number(duration.value)});lastSent='';sync(true);draw();});
 field(box,'Geplante Dauer',duration);
 box.append(el('div','fc-hr'));
 if(s.enabled){
  box.append(el('p','','Automatische Synchronisierung ist aktiv. Bei Änderungen am Plan aktualisiert FORGE seine zukünftigen Termine beim nächsten Abgleich. Deine eigenen Kalendereinträge bleiben unberührt – FORGE ändert nur Termine, die es selbst angelegt hat.'));
  box.append(button('Jetzt synchronisieren',()=>{lastSent='';sync(true);draw();},true));
  box.append(button('Automatische Synchronisierung ausschalten',()=>{
    saveCfg({...cfg(),enabled:false});lastSent='';inFlight=false;lastError='';draw();
  }));
 }else{
  box.append(el('p','','Die Funktion ist standardmäßig ausgeschaltet. Erst mit „Synchronisierung aktivieren“ werden FORGE-Termine geschrieben.'));
  const activate=button('Synchronisierung aktivieren',()=>{
    if(!cfg().calendarId)return;
    saveCfg({...cfg(),enabled:true});lastSent='';lastError='';
    sync(true);draw();
  },true);
  activate.disabled=!s.calendarId||!calendars.length;box.append(activate);
 }
 box.append(el('p','','Synchronisiert werden die nächsten 8 Wochen. Vergangene Trainingstermine bleiben erhalten. Beim Ausschalten bleiben bereits angelegte Kalendereinträge bestehen; FORGE ändert sie dann nicht mehr.'));
 if(s.lastSynced)box.append(el('p','fc-status','Letzter erfolgreicher Abgleich: '+s.lastSynced));
 if(lastError)box.append(el('p','fc-status fc-error',lastError));
 shade.append(box);
}
function install(){
 if(!enabled())return false;
 let timer=null;const later=()=>{clearTimeout(timer);timer=setTimeout(()=>sync(false),950);};
 const original=window.render;
 if(typeof original==='function'&&!original.__forgeCalendarSync){
  const wrap=function(){const v=original.apply(this,arguments);later();return v;};
  wrap.__forgeCalendarSync=true;window.render=wrap;
 }
 window.addEventListener('forge:workout-logged',later);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync(false);});
 setTimeout(()=>sync(true),2300);
 return true;
}
function boot(){if(install())return;let tries=0;const t=setInterval(()=>{if(install()||++tries>30)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
