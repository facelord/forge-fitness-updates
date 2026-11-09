/* FORGE Layout B · Training nachtragen.
 * Ein Vollbild-Fenster, um ein bereits absolviertes Krafttraining zu erfassen:
 * Einheit, Tag (heute / gestern / vorgestern / anderes Datum), optional Dauer,
 * und pro Übung die Sätze mit kg und Wiederholungen (oder Sekunden).
 * Der Datensatz hat dasselbe Format wie finishWorkout() und wird nach Datum
 * einsortiert, damit "letztes Training", Rekorde und Verlauf stimmen.
 * Der laufende Trainings-Entwurf wird nicht angefasst.
 */
(function(){
'use strict';
const MAX_SETS=10;
function isoOf(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function addDays(iso,n){const [y,m,d]=iso.split('-').map(Number);return isoOf(new Date(y,m-1,d+n));}
function num(v){const n=Number(String(v??'').trim().replace(',','.'));return Number.isFinite(n)?n:NaN;}
/* Saved date: today keeps the current time; earlier days are stored at 18:00 local time. */
function dateFor(iso,now){
 now=now||new Date();
 if(iso===isoOf(now))return now.toISOString();
 const [y,m,d]=iso.split('-').map(Number);
 return new Date(y,m-1,d,18,0,0).toISOString();
}
function validDay(iso,todayIso){return /^\d{4}-\d{2}-\d{2}$/.test(String(iso||''))&&iso<=todayIso&&iso>=addDays(todayIso,-366);}
/* Rows of the form for one plan unit. last(name) → {sets:[{kg,reps}]} | null; isTime(name,ex) → bool. */
function formFor(unit,last,isTime){
 return ((unit&&unit.ex)||[]).map(e=>{
  const time=!!(isTime&&isTime(e.name,e));
  const prev=(last&&last(e.name))||null;
  const prevSets=(prev&&Array.isArray(prev.sets))?prev.sets:[];
  const count=Math.min(MAX_SETS,Math.max(1,Number(e.sets)||prevSets.length||3));
  const target=String(e.reps??'').match(/\d+/);
  return {name:e.name,unit:time?'sec':'reps',sets:Array.from({length:count},(_,i)=>{
   const p=prevSets[i]||prevSets[prevSets.length-1]||null;
   const kg=p&&Number(p.kg)>0?Number(p.kg):(Number(e.kg)>0?Number(e.kg):0);
   const reps=p&&Number(p.reps)>0?Number(p.reps):(target?Number(target[0]):(time?30:10));
   return {kg:kg?String(kg).replace('.',','):'',reps:String(reps),done:true};
  })};
 });
}
/* Builds the workout record. Returns {ok,record} or {ok:false,reason}. */
function buildRecord(input){
 const {unit,rows,day,todayIso,minutes,id,now}=input||{};
 if(!unit)return {ok:false,reason:'Bitte wähle eine Einheit.'};
 if(!validDay(day,todayIso))return {ok:false,reason:'Bitte wähle einen Tag in den letzten 12 Monaten.'};
 const entries=(rows||[]).map(r=>({name:r.name,unit:r.unit==='sec'?'sec':'reps',
  sets:(r.sets||[]).filter(s=>s&&s.done!==false&&num(s.reps)>0)
   .map(s=>({kg:Math.max(0,Math.round((num(s.kg)||0)*100)/100),reps:Math.round(num(s.reps))}))}));
 const count=entries.reduce((n,e)=>n+e.sets.length,0);
 if(!count)return {ok:false,reason:'Trage mindestens einen Satz mit Wiederholungen ein.'};
 const mins=num(minutes);
 const durationMs=Number.isFinite(mins)&&mins>0&&mins<=600?Math.round(mins*60000):null;
 return {ok:true,count,record:{id,date:dateFor(day,now),title:unit.title||'Training',entries,warmup:null,warmupExerciseNames:{},
  durationMs,strengthDurationMs:durationMs,mobilityDurationMs:0,logged:true}};
}
/* Index at which a record keeps workouts in chronological order. */
function insertIndex(workouts,dateIso){
 let i=(workouts||[]).length;
 while(i>0&&String(workouts[i-1]&&workouts[i-1].date||'')>dateIso)i--;
 return i;
}
function dayLabel(iso,todayIso){
 if(iso===todayIso)return 'Heute';
 if(iso===addDays(todayIso,-1))return 'Gestern';
 if(iso===addDays(todayIso,-2))return 'Vorgestern';
 const [y,m,d]=iso.split('-').map(Number);
 return new Date(y,m-1,d).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'});
}
window.ForgeLayoutBLog=Object.freeze({formFor,buildRecord,insertIndex,dateFor,validDay,dayLabel,addDays,MAX_SETS});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
const S=()=>typeof state!=='undefined'?state:null;
const STORE_KEY=()=>typeof KEY!=='undefined'?KEY:null;
function today(){return isoOf(new Date());}
function units(){return ((S()&&S().plan)||[]).filter(p=>p&&Array.isArray(p.ex)&&p.ex.length&&!p.forgeFree&&!String(p.id||'').startsWith('forge-free-'));}
function lastOf(name){try{return typeof forgeLastExercise==='function'?forgeLastExercise(name):null;}catch(e){return null;}}
function isTime(name,ex){try{return typeof forgeTimeIsExercise==='function'?forgeTimeIsExercise(name,ex):false;}catch(e){return false;}}
function newId(){try{if(typeof uid==='function')return uid();}catch(e){}return 'log-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function refresh(){try{if(typeof render==='function')render();}catch(e){console.error(e);}}

const ACC='#a9f267';
const CSS=`
.forge-lb-log{position:fixed;inset:0;z-index:2147480600;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
.forge-lb-log *{box-sizing:border-box}
.forge-lb-log .lg-head{display:flex;align-items:center;gap:10px;padding:12px 14px 8px}
.forge-lb-log .lg-head strong{flex:1;font-size:20px;font-weight:800;letter-spacing:-.02em}
.forge-lb-log .lg-x{width:44px;height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:20px;line-height:1;padding:0}
.forge-lb-log .lg-body{flex:1;overflow:auto;padding:4px 14px 16px;-webkit-overflow-scrolling:touch}
.forge-lb-log .lg-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;margin:14px 4px 8px}
.forge-lb-log .lg-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
.forge-lb-log .lg-chips::-webkit-scrollbar{display:none}
.forge-lb-log .lg-chips.lg-wrap{flex-wrap:wrap;overflow:visible}
.forge-lb-log .lg-chip{flex:0 0 auto;min-height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:14px;font-weight:700;padding:0 16px;white-space:nowrap}
.forge-lb-log .lg-chip[aria-pressed="true"]{border:2px solid ${ACC};background:#1f2c1c;color:${ACC}}
.forge-lb-log .lg-other{position:relative;display:inline-flex;align-items:center;overflow:hidden}
.forge-lb-log .lg-date{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;padding:0;margin:0;color-scheme:dark;cursor:pointer}
.forge-lb-log .lg-dur{display:flex;align-items:center;gap:10px;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:8px 14px}
.forge-lb-log .lg-dur span{flex:1;font-size:15px;font-weight:600}
.forge-lb-log .lg-dur small{display:block;font-size:12px;color:#95a3b7;font-weight:500}
.forge-lb-log input.lg-num{width:72px;height:44px;border-radius:12px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:16px;font-weight:700;text-align:center;padding:0 4px}
.forge-lb-log input.lg-num:focus{outline:2px solid ${ACC};outline-offset:1px;border-color:transparent}
.forge-lb-log .lg-gap{height:10px}
.forge-lb-log .lg-ex{background:#171e2a;border:1px solid #293346;border-radius:20px;padding:12px 12px 8px;margin-bottom:10px}
.forge-lb-log .lg-ex>b{display:block;font-size:16px;margin:0 2px 8px;overflow-wrap:anywhere}
.forge-lb-log .lg-cols,.forge-lb-log .lg-set{display:grid;grid-template-columns:34px 1fr 1fr 44px;gap:8px;align-items:center}
.forge-lb-log .lg-cols{font-size:11px;color:#95a3b7;text-transform:uppercase;letter-spacing:1px;padding:0 0 4px}
.forge-lb-log .lg-cols span:nth-child(2),.forge-lb-log .lg-cols span:nth-child(3){text-align:center}
.forge-lb-log .lg-set{padding:4px 0}
.forge-lb-log .lg-set>i{font-style:normal;font-size:13px;font-weight:800;color:#c3cddb;text-align:center}
.forge-lb-log .lg-set input.lg-num{width:100%}
.forge-lb-log .lg-ok{width:44px;height:44px;border-radius:22px;border:1px solid #3a4556;background:transparent;color:#5b6b80;font:inherit;font-size:18px;font-weight:800;padding:0}
.forge-lb-log .lg-ok[aria-pressed="true"]{background:${ACC};border-color:${ACC};color:#142016}
.forge-lb-log .lg-set.off input{opacity:.4}
.forge-lb-log .lg-setbtns{display:flex;gap:8px;margin-top:4px}
.forge-lb-log .lg-small{min-height:40px;border-radius:20px;border:1px solid #293346;background:transparent;color:#c3cddb;font:inherit;font-size:13px;font-weight:700;padding:0 14px}
.forge-lb-log .lg-small:disabled{opacity:.35}
.forge-lb-log .lg-empty{color:#95a3b7;font-size:14px;padding:12px 4px}
.forge-lb-log .lg-foot{padding:10px 14px 14px;border-top:1px solid #1d2532;background:#0b1018}
.forge-lb-log .lg-msg{min-height:0;font-size:13px;color:#ff8a7a;margin:0 4px 8px}
.forge-lb-log .lg-msg:empty{display:none}
.forge-lb-log .lg-save{width:100%;height:56px;border-radius:28px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800}
.forge-lb-log .lg-save:disabled{opacity:.45}
.forge-lb-log button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
.forge-lb-log-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147480700;background:#171e2a;border:1px solid #3a4f2f;color:#f3f7fc;border-radius:16px;padding:12px 16px;font:600 14px Inter,system-ui,sans-serif;max-width:calc(100vw - 32px);box-shadow:0 10px 30px #0009}
`;
function ensureCss(){if(!$('forgeLayoutBLogStyle')){const st=el('style');st.id='forgeLayoutBLogStyle';st.textContent=CSS;document.head.append(st);}}

let root=null,form=null;
function close(){if(root){root.remove();root=null;document.removeEventListener('keydown',onKey,true);}form=null;}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}
function toast(text){const t=el('div','forge-lb-log-toast',text);t.setAttribute('role','status');document.body.append(t);setTimeout(()=>t.remove(),3200);}

function open(unitId){
 if(!S())return false;
 ensureCss();close();
 const list=units();
 const first=list.find(u=>String(u.id)===String(unitId))||list[0]||null;
 form={unitId:first?first.id:null,day:today(),minutes:'',rows:first?formFor(first,lastOf,isTime):[]};
 root=el('div','forge-lb-log');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Training nachtragen');
 const head=el('div','lg-head');head.append(el('strong','','Training nachtragen'));
 const x=btn('lg-x','×',close);x.setAttribute('aria-label','Schließen');head.append(x);
 const body=el('div','lg-body'),foot=el('div','lg-foot');
 const msg=el('p','lg-msg');msg.setAttribute('role','alert');
 const saveBtn=btn('lg-save','Training speichern',()=>commit(msg));
 foot.append(msg,saveBtn);
 root.append(head,body,foot);document.body.append(root);
 document.addEventListener('keydown',onKey,true);
 draw(body,saveBtn);
 return true;
}
function draw(body,saveBtn){
 const list=units(),t=today();body.textContent='';
 if(!list.length){body.append(el('p','lg-empty','Du hast noch keinen Kraftplan. Erstelle zuerst einen Plan, dann kannst du Trainings nachtragen.'));saveBtn.disabled=true;return;}
 saveBtn.disabled=false;
 body.append(el('div','lg-label','Einheit'));
 const uc=el('div','lg-chips');
 list.forEach(u=>{const b=btn('lg-chip',u.title||'Einheit',()=>{form.unitId=u.id;form.rows=formFor(u,lastOf,isTime);draw(body,saveBtn);});b.setAttribute('aria-pressed',String(String(u.id)===String(form.unitId)));uc.append(b);});
 body.append(uc);
 body.append(el('div','lg-label','Wann'));
 const dc=el('div','lg-chips lg-wrap');
 const quick=[t,addDays(t,-1),addDays(t,-2)];
 quick.forEach(iso=>{const b=btn('lg-chip',dayLabel(iso,t),()=>{form.day=iso;draw(body,saveBtn);});b.setAttribute('aria-pressed',String(form.day===iso));dc.append(b);});
 const custom=!quick.includes(form.day);
 const other=el('label','lg-chip lg-other');other.setAttribute('aria-pressed',String(custom));
 other.append(el('span','',custom?dayLabel(form.day,t):'Anderes Datum'));
 const pick=el('input','lg-date');pick.type='date';pick.max=t;pick.min=addDays(t,-366);pick.value=form.day;pick.setAttribute('aria-label','Anderes Datum wählen');
 pick.addEventListener('change',()=>{if(validDay(pick.value,t)){form.day=pick.value;draw(body,saveBtn);}});
 pick.addEventListener('click',()=>{try{pick.showPicker&&pick.showPicker();}catch(e){}});
 other.append(pick);
 dc.append(other);body.append(dc);
 const dur=el('label','lg-dur');const ds=el('span','','Dauer');ds.append(el('small','','Minuten, optional'));
 const di=el('input','lg-num');di.type='number';di.inputMode='numeric';di.min='1';di.max='600';di.placeholder='–';di.value=form.minutes;di.setAttribute('aria-label','Dauer in Minuten');
 di.addEventListener('input',()=>{form.minutes=di.value;});
 dur.append(ds,di);body.append(el('div','lg-gap'),dur);
 body.append(el('div','lg-label','Übungen'));
 form.rows.forEach((r)=>{
  const card=el('div','lg-ex');card.append(el('b','',r.name));
  const cols=el('div','lg-cols');cols.append(el('span','','Satz'),el('span','','kg'),el('span','',r.unit==='sec'?'Sek.':'Wdh.'),el('span','',''));card.append(cols);
  const setsBox=el('div');
  const drawSets=()=>{
   setsBox.textContent='';
   r.sets.forEach((s,i)=>{
    const row=el('div','lg-set'+(s.done===false?' off':''));
    const kg=el('input','lg-num');kg.type='text';kg.inputMode='decimal';kg.value=s.kg;kg.placeholder='0';kg.setAttribute('aria-label',r.name+' Satz '+(i+1)+' kg');
    kg.addEventListener('input',()=>{s.kg=kg.value;});
    const rp=el('input','lg-num');rp.type='text';rp.inputMode='numeric';rp.value=s.reps;rp.placeholder='0';rp.setAttribute('aria-label',r.name+' Satz '+(i+1)+(r.unit==='sec'?' Sekunden':' Wiederholungen'));
    rp.addEventListener('input',()=>{s.reps=rp.value;});
    const ok=btn('lg-ok','✓',()=>{s.done=s.done===false;drawSets();});ok.setAttribute('aria-pressed',String(s.done!==false));ok.setAttribute('aria-label','Satz '+(i+1)+(s.done!==false?' wird gespeichert':' wird nicht gespeichert'));
    row.append(el('i','',String(i+1)),kg,rp,ok);setsBox.append(row);
   });
   minus.disabled=r.sets.length<=1;plus.disabled=r.sets.length>=MAX_SETS;
  };
  const sb=el('div','lg-setbtns');
  const minus=btn('lg-small','− Satz',()=>{if(r.sets.length>1){r.sets.pop();drawSets();}});
  const plus=btn('lg-small','+ Satz',()=>{if(r.sets.length<MAX_SETS){const l=r.sets[r.sets.length-1]||{kg:'',reps:'10'};r.sets.push({kg:l.kg,reps:l.reps,done:true});drawSets();}});
  sb.append(minus,plus);
  card.append(setsBox,sb);drawSets();body.append(card);
 });
}
function commit(msg){
 const st=S();if(!st||!form)return false;
 const unit=units().find(u=>String(u.id)===String(form.unitId));
 const res=buildRecord({unit,rows:form.rows,day:form.day,todayIso:today(),minutes:form.minutes,id:newId(),now:new Date()});
 if(!res.ok){msg.textContent=res.reason;return false;}
 if(!Array.isArray(st.workouts))st.workouts=[];
 const before=st.workouts.slice();
 st.workouts.splice(insertIndex(st.workouts,res.record.date),0,res.record);
 const key=STORE_KEY();
 try{
  if(key){
   localStorage.setItem(key,JSON.stringify(st));
   const back=JSON.parse(localStorage.getItem(key)||'null');
   if(!back||!Array.isArray(back.workouts)||!back.workouts.some(w=>w&&w.id===res.record.id))throw new Error('not persisted');
  }else if(typeof save==='function')save();
 }catch(e){
  console.error('FORGE log workout failed:',e);
  st.workouts=before;
  msg.textContent='Speichern nicht möglich. Bitte prüfe den Speicher des Geräts.';
  return false;
 }
 const label=dayLabel(form.day,today());
 close();refresh();
 toast('Training nachgetragen · '+label+' · '+res.count+(res.count===1?' Satz':' Sätze'));
 try{window.dispatchEvent(new CustomEvent('forge:workout-logged',{detail:{id:res.record.id}}));}catch(e){}
 return true;
}
window.forgeOpenLogWorkout=open;
})();
