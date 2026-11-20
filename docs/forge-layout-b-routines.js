/* FORGE Layout B · Routinen-Planer (Yoga-Flow · Mobilität · Dehnen · Alles kombiniert).
 * Eigenständig neben dem Krafttraining (13.11.2026, Issue #67):
 *  - frei zusammenstellen, speichern, bearbeiten (Übungen aus dem Mobilitätskatalog)
 *  - Archiv: ältere Routinen ansehen, archivieren, reaktivieren – nichts geht verloren
 *  - Wochentage zuweisen → erscheinen im gemeinsamen Wochenkalender (Plan) und
 *    unter Workout › Mobilität „Heute dran“; Start über den vorhandenen
 *    Mobilitäts-Player (MOB_ROUTINES['forge-r-<id>']).
 * Daten: state.forgeRoutines = [{id,name,kind,items:[[name,sec,cue]],days,archived,createdAt,updatedAt}]
 * Der bestehende Mobilitätsplan (state.mobility) und alle Kraftpläne bleiben unverändert.
 */
(function(){
'use strict';
const KINDS=Object.freeze([['yoga','Yoga-Flow','Ruhige Flows aus Yoga-Haltungen'],['mobility','Mobilität','Gelenke aktiv bewegen'],
 ['stretch','Dehnen','Gehaltene Dehnungen'],['mixed','Alles kombinieren','Yoga, Mobilität und Dehnen gemischt']]);
const KIND_CAT=Object.freeze({yoga:'Yoga',mobility:'Gelenke',stretch:'Dehnen',mixed:'Alle'});
const DAYS=Object.freeze(['Mo','Di','Mi','Do','Fr','Sa','So']);
const MAX_ITEMS=20;
/* #75: Bezug zum Krafttraining pro Routine (alte Routinen = jederzeit). */
const WHEN=Object.freeze([['before','Vor dem Krafttraining','Vor der ersten Kraftübung anbieten'],['after','Nach dem Krafttraining','Nach dem Speichern anbieten'],
 ['both','Vorher und nachher','Vor und nach dem Krafttraining anbieten'],['any','Unabhängig','Jederzeit, an Ruhetagen oder festen Tagen']]);

/* ---------- pure helpers (tested) ---------- */
function kindLabel(k){const x=KINDS.find(y=>y[0]===k);return x?x[1]:'Routine';}
function list(s){return s&&Array.isArray(s.forgeRoutines)?s.forgeRoutines:[];}
function active(rs){return (rs||[]).filter(r=>r&&!r.archived);}
function archived(rs){return (rs||[]).filter(r=>r&&r.archived);}
function forDay(rs,d){return active(rs).filter(r=>Array.isArray(r.days)&&r.days.includes(d));}
function whenOf(r){const w=r&&r.when;return WHEN.some(x=>x[0]===w)?w:'any';}
function whenLabel(w){const x=WHEN.find(y=>y[0]===w);return x?x[1]:WHEN[3][1];}
/* Stabile Reihenfolge: Favoriten zuerst, sonst nach Anlage – Speichern sortiert nichts um. */
function ordered(rs){return (rs||[]).map((r,i)=>[r,i]).sort((a,b)=>(!!b[0].pinned-!!a[0].pinned)||String(a[0].createdAt||'').localeCompare(String(b[0].createdAt||''))||a[1]-b[1]).map(x=>x[0]);}
/* Routinen für „vor“/„nach“ dem Krafttraining an Wochentag d (ohne Tage = bei jedem Training). */
function forWorkout(rs,phase,d){
 return ordered(active(rs).filter(r=>{const w=whenOf(r);if(!(w===phase||w==='both'))return false;
  return !Array.isArray(r.days)||!r.days.length||r.days.includes(d);}));
}
function setPinned(rs,id,flag){return (rs||[]).map(r=>r&&String(r.id)===String(id)?{...r,pinned:!!flag}:r);}
function item(x){return [String(x.name),Math.max(10,Math.round(Number(x.seconds)||30)),x.sides?'je Seite':''];}
function seconds(items){return (items||[]).reduce((a,it)=>a+5+(Number(it[1])||0)*(/je seite/i.test(String(it[2]||''))?2:1)+(/je seite/i.test(String(it[2]||''))?3:0),0);}
function validate(r){
 if(!r||typeof r!=='object')return 'Ungültige Routine.';
 if(!String(r.name||'').trim())return 'Bitte gib der Routine einen Namen.';
 if(!KINDS.some(k=>k[0]===r.kind))return 'Bitte wähle eine Art.';
 if(!Array.isArray(r.items)||!r.items.length)return 'Wähle mindestens eine Übung.';
 if(r.items.length>MAX_ITEMS)return 'Höchstens '+MAX_ITEMS+' Übungen pro Routine.';
 if(!Array.isArray(r.days)||r.days.some(d=>!Number.isInteger(d)||d<0||d>6))return 'Ungültige Wochentage.';
 if(r.when!==undefined&&!WHEN.some(x=>x[0]===r.when))return 'Bitte wähle, wann du die Routine machen möchtest.';
 return '';
}
/* Insert or update one routine; never drops other routines. Returns a new array. */
function upsert(rs,r,now){
 const t=now||new Date().toISOString();
 const clean={id:String(r.id),name:String(r.name).trim().slice(0,60),kind:r.kind,items:r.items.map(x=>x.slice(0,3)),
  days:[...new Set(r.days)].sort((a,b)=>a-b),when:whenOf(r),pinned:!!r.pinned,archived:!!r.archived,createdAt:r.createdAt||t,updatedAt:t};
 const out=(rs||[]).slice();const i=out.findIndex(x=>x&&String(x.id)===clean.id);
 if(i>=0)out[i]={...out[i],...clean,createdAt:out[i].createdAt||clean.createdAt};else out.push(clean);
 return out;
}
function setArchived(rs,id,flag,now){
 return (rs||[]).map(r=>r&&String(r.id)===String(id)?{...r,archived:!!flag,updatedAt:now||new Date().toISOString()}:r);
}
function routineKey(id){return 'forge-r-'+id;}
function newId(){return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
window.ForgeRoutinesCore=Object.freeze({KINDS,KIND_CAT,WHEN,kindLabel,active,archived,forDay,whenOf,whenLabel,ordered,forWorkout,setPinned,item,seconds,validate,upsert,setArchived,routineKey,MAX_ITEMS});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
const $=id=>document.getElementById(id);
const TEAL='#5ee0c8';
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
const S=()=>typeof state!=='undefined'?state:null;
function store(){try{if(typeof save==='function')save();}catch(e){console.error('FORGE Routinen speichern',e);}}
const todayIdx=()=>(new Date().getDay()+6)%7;
let lib=null,libLoading=null;
function loadLib(){
 if(lib)return Promise.resolve(lib);
 if(!libLoading)libLoading=fetch('./exercise-plus-data.json',{cache:'force-cache'}).then(r=>r.json()).then(d=>{
  let l=Array.isArray(d.mobility)?d.mobility:[];
  try{if(window.ForgeMobilityCatalog)l=window.ForgeMobilityCatalog.withExtras(l,typeof FORGE_EX_GUIDES!=='undefined'?FORGE_EX_GUIDES:{});}catch(e){}
  lib=l;return lib;}).catch(()=>{lib=[];return lib;});
 return libLoading;
}
function catOf(n){try{return window.ForgeMobilityCatalog?window.ForgeMobilityCatalog.categoryOf(n):'Gelenke';}catch(e){return 'Gelenke';}}
function thumbSrc(n){
 try{const m=typeof window.forgeMobImage==='function'?window.forgeMobImage(n):null;if(Array.isArray(m)&&m[0])return m[0];}catch(e){}
 try{const fn=window.forgeExerciseIllustrations||window.forgePublicExercisePictures;const html=typeof fn==='function'?fn(n):'';
  if(html){const d=document.createElement('div');d.innerHTML=html;const i=d.querySelector('img');if(i&&i.getAttribute('src'))return i.getAttribute('src');}}catch(e){}
 return '';
}
/* Make every active routine startable by the shared mobility player. */
function register(){
 try{
  if(typeof MOB_ROUTINES==='undefined')return;
  Object.keys(MOB_ROUTINES).filter(k=>k.startsWith('forge-r-')).forEach(k=>delete MOB_ROUTINES[k]);
  list(S()).forEach(r=>{if(r&&Array.isArray(r.items)&&r.items.length)MOB_ROUTINES[routineKey(r.id)]={name:r.name,items:r.items.map(x=>x.slice())};});
 }catch(e){}
}
function startRoutine(id){
 register();close();
 try{if(typeof window.go==='function')window.go('workout');}catch(e){}
 setTimeout(()=>{try{window.ForgeLayoutBMobilityStart?.(routineKey(id));}catch(e){console.error('FORGE Routine starten',e);}},120);
}

const R='.forge-lb-rt';
const CSS=`
${R}{position:fixed;inset:0;z-index:2147481000;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
${R} .rt-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(14px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))}
${R} .rt-top{display:flex;align-items:center;gap:12px;min-height:44px}
${R} .rt-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #22303d;background:#17212b;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0;font-size:20px}
${R} .rt-kick{flex:1;text-align:center;font-size:14px;color:#95a3b7;font-weight:600}
${R} .rt-head{padding:14px 4px 4px}
${R} .rt-head h2{margin:0;font-size:clamp(23px,7vw,28px);font-weight:800;line-height:1.15}
${R} .rt-head p{margin:6px 0 0;font-size:14px;color:#c3cddb;line-height:1.45}
${R} .rt-body{flex:1;min-height:0;overflow-y:auto;padding:12px 0 8px;display:flex;flex-direction:column;gap:10px;scrollbar-width:none}
${R} .rt-body::-webkit-scrollbar{display:none}
${R} .rt-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;height:50px;border-radius:25px;background:#17212b;border:1px solid #22303d;padding:5px;box-sizing:border-box;flex:0 0 auto}
${R} .rt-seg button{border:0;border-radius:20px;background:transparent;color:#95a3b7;font:inherit;font-size:15px;font-weight:700}
${R} .rt-seg button[aria-checked="true"]{background:${TEAL};color:#062420;font-weight:800}
${R} .rt-card{background:#17212b;border:1px solid #22303d;border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:10px;flex:0 0 auto}
${R} .rt-card.archived{opacity:.85;border-style:dashed}
${R} .rt-card small{font-size:12px;color:${TEAL};font-weight:700;text-transform:uppercase;letter-spacing:1.3px}
${R} .rt-card strong{font-size:18px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
${R} .rt-card .rt-meta{font-size:13px;color:#95a3b7}
${R} .rt-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
${R} .rt-days span{height:28px;border-radius:9px;background:#0f1620;color:#5d6a7e;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}
${R} .rt-days span.on{background:#193b39;color:${TEAL}}
${R} .rt-acts{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px}
${R} .rt-acts button,${R} .rt-sec{min-height:44px;border-radius:22px;border:1px solid #2f6a62;background:transparent;color:#f3f7fc;font:inherit;font-size:14px;font-weight:700;padding:0 10px}
${R} .rt-acts button.go{background:${TEAL};border-color:${TEAL};color:#062420;font-weight:800}
${R} .rt-new{min-height:56px;border-radius:28px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:17px;font-weight:800;flex:0 0 auto}
${R} .rt-note{font-size:13px;color:#95a3b7;line-height:1.5;margin:0;padding:0 4px}
${R} .rt-err{font-size:13px;color:#ffb4b8;text-align:center;margin:0}
${R} .rt-kind{min-height:72px;border-radius:18px;border:1px solid #22303d;background:#17212b;color:#f3f7fc;font:inherit;text-align:left;padding:12px 14px;display:flex;flex-direction:column;gap:3px}
${R} .rt-kind b{font-size:16px;font-weight:800}
${R} .rt-kind small{font-size:13px;color:#95a3b7}
${R} .rt-kind[aria-pressed="true"]{border:2px solid ${TEAL};background:#193b39}
${R} .rt-chips{display:flex;gap:6px;overflow-x:auto;flex:0 0 auto;scrollbar-width:none}
${R} .rt-chips::-webkit-scrollbar{display:none}
${R} .rt-chips button{flex:0 0 auto;height:38px;border-radius:19px;border:1px solid #22303d;background:#17212b;color:#c3cddb;font:inherit;font-size:13px;font-weight:600;padding:0 13px}
${R} .rt-chips button[aria-pressed="true"]{background:${TEAL};border-color:${TEAL};color:#062420;font-weight:800}
${R} .rt-ex{display:flex;align-items:center;gap:10px;min-height:56px;border-radius:14px;border:1px solid #22303d;background:#17212b;color:#f3f7fc;font:inherit;text-align:left;padding:6px 10px 6px 6px}
${R} .rt-ex[aria-pressed="true"]{border:2px solid ${TEAL};background:#193b39}
${R} .rt-ex img,${R} .rt-ex i.ph{width:44px;height:44px;flex:0 0 44px;border-radius:10px;object-fit:cover;background:#0f1620}
${R} .rt-ex span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
${R} .rt-ex b{font-size:14px;font-weight:700}
${R} .rt-ex small{font-size:12px;color:#95a3b7}
${R} .rt-ex em{font-style:normal;font-size:12px;font-weight:800;color:${TEAL};min-width:22px;text-align:center}
${R} .rt-sel{display:flex;align-items:center;gap:6px;min-height:46px;border-radius:12px;background:#0f1620;padding:4px 6px 4px 12px;font-size:14px}
${R} .rt-sel span{flex:1;min-width:0}
${R} .rt-sel button{width:40px;height:40px;border-radius:20px;border:1px solid #22303d;background:#17212b;color:#f3f7fc;font-size:16px;padding:0}
${R} .rt-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding-left:4px;margin-top:4px}
${R} .rt-field{height:52px;border-radius:16px;border:1px solid #22303d;background:#17212b;color:#f3f7fc;font:inherit;font-size:16px;padding:0 14px;box-sizing:border-box;width:100%}
${R} .rt-daypick{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
${R} .rt-daypick button{height:48px;border-radius:14px;border:1px solid #22303d;background:#17212b;color:#f3f7fc;font:inherit;font-size:14px;font-weight:700;padding:0}
${R} .rt-daypick button[aria-pressed="true"]{background:${TEAL};border-color:${TEAL};color:#062420}
${R} .rt-foot{display:flex;flex-direction:column;gap:8px;padding-top:8px}
${R} .rt-next{height:58px;border-radius:29px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:17px;font-weight:800}
${R} .rt-next:disabled{opacity:.45}
${R} button:focus-visible{outline:2px solid ${TEAL};outline-offset:2px}
/* Workout › Mobilität: heute geplante Routinen */
.forge-lb-rtoday{background:#17212b;border:1px solid #22303d;border-radius:22px;padding:14px;margin:0 0 14px;display:flex;flex-direction:column;gap:8px;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-rtoday small{font-size:12px;color:${TEAL};font-weight:700;text-transform:uppercase;letter-spacing:1.3px}
.forge-lb-rtoday .rq{display:flex;align-items:center;gap:10px;min-height:52px}
.forge-lb-rtoday .rq span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.forge-lb-rtoday .rq b{font-size:15px}
.forge-lb-rtoday .rq em{font-style:normal;font-size:12px;color:#95a3b7}
.forge-lb-rt .rt-cardhead{display:flex;align-items:flex-start;gap:8px}
.forge-lb-rt .rt-cardhead div{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.forge-lb-rt .rt-star{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #2f6a62;background:transparent;color:#95a3b7;font-size:20px;padding:0}
.forge-lb-rt .rt-star[aria-pressed="true"]{color:#ffd166;border-color:#ffd166}
.forge-lb-rt .rt-when{font-size:12px;color:#c3cddb;background:#0f1620;border-radius:10px;padding:3px 8px;align-self:flex-start}
.forge-lb-rt .rt-whens{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.forge-lb-rt .rt-whens .rt-kind{min-height:64px}
.forge-lb-rtoday .rq-group{font-size:12px;color:#95a3b7;font-weight:700;margin-top:4px}
.forge-lb-rtoffer{position:fixed;inset:0;z-index:2147482500;background:rgba(5,8,13,.78);display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-rtoffer .ro-sheet{background:#0f1a1f;border-top:1px solid #2f6a62;border-radius:26px 26px 0 0;padding:18px 16px calc(20px + env(safe-area-inset-bottom));max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;display:flex;flex-direction:column;gap:10px}
.forge-lb-rtoffer small{font-size:12px;color:${TEAL};font-weight:800;text-transform:uppercase;letter-spacing:1.3px}
.forge-lb-rtoffer h2{margin:0;font-size:22px;font-weight:800}
.forge-lb-rtoffer p{margin:0;font-size:14px;color:#c3cddb;line-height:1.45}
.forge-lb-rtoffer .rq,.forge-lb-finish .forge-lb-rtafter .rq{display:flex;align-items:center;gap:10px;min-height:56px;border-radius:16px;background:#17212b;border:1px solid #22303d;padding:6px 6px 6px 14px}
.forge-lb-rtoffer .rq span,.forge-lb-finish .forge-lb-rtafter .rq span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.forge-lb-rtoffer .rq b,.forge-lb-finish .forge-lb-rtafter .rq b{font-size:15px}
.forge-lb-rtoffer .rq em,.forge-lb-finish .forge-lb-rtafter .rq em{font-style:normal;font-size:12px;color:#95a3b7}
.forge-lb-rtoffer .rq button,.forge-lb-finish .forge-lb-rtafter .rq button{min-height:44px;border-radius:22px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:14px;font-weight:800;padding:0 16px}
.forge-lb-rtoffer .ro-skip{min-height:52px;border-radius:26px;border:1px solid #2f6a62;background:transparent;color:#f3f7fc;font:inherit;font-size:16px;font-weight:700}
.forge-lb-finish .forge-lb-rtafter{border-radius:22px;background:#0f1a1f;border:1px solid #2f6a62;padding:14px;display:flex;flex-direction:column;gap:8px}
.forge-lb-finish .forge-lb-rtafter small{font-size:12px;color:${TEAL};font-weight:800;text-transform:uppercase;letter-spacing:1.3px}
.forge-lb-rtoday .rq button{min-height:44px;border-radius:22px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:14px;font-weight:800;padding:0 16px}
`;
function ensureCss(){if($('forgeLbRoutinesStyle'))return;const st=el('style');st.id='forgeLbRoutinesStyle';st.textContent=CSS;document.head.append(st);}

/* ---------- sheet ---------- */
let root=null,view=null;
function close(){if(root){root.remove();root=null;}view=null;document.removeEventListener('keydown',onKey,true);}
function onKey(e){if(e.key==='Escape'){e.preventDefault();if(view&&view.mode==='edit')openList(view.back||'active');else close();}}
function frame(kicker,onBack){
 ensureCss();
 if(!root){root=el('div','forge-lb-rt');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Routinen');document.body.append(root);document.addEventListener('keydown',onKey,true);}
 root.replaceChildren();
 const inner=el('div','rt-in');root.append(inner);
 const top=el('div','rt-top');
 const back=btn('rt-round','‹',onBack);back.setAttribute('aria-label','Zurück');
 const x=btn('rt-round','✕',close);x.setAttribute('aria-label','Schließen');
 top.append(back,el('div','rt-kick',kicker),x);inner.append(top);
 return inner;
}
function routineMeta(r){return kindLabel(r.kind)+' · '+r.items.length+' '+(r.items.length===1?'Übung':'Übungen')+' · ca. '+Math.max(1,Math.round(seconds(r.items)/60))+' Min.';}
function openList(tab){
 register();
 view={mode:'list',tab:tab==='archive'?'archive':'active'};
 const inner=frame('Routinen',close);
 const head=el('div','rt-head');head.append(el('h2','','Deine Routinen'),el('p','','Yoga-Flow, Mobilität und Dehnen – eigenständig neben deinem Krafttraining.'));inner.append(head);
 const body=el('div','rt-body');inner.append(body);
 const seg=el('div','rt-seg');seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label','Ansicht');
 const all=list(S());
 [['active','Aktiv ('+active(all).length+')'],['archive','Archiv ('+archived(all).length+')']].forEach(([k,t])=>{const b=btn('',t,()=>openList(k));b.setAttribute('role','radio');b.setAttribute('aria-checked',String(view.tab===k));seg.append(b);});
 body.append(seg);
 if(view.tab==='active')body.append(btn('rt-new','+ Neue Routine',()=>openEdit(null)));
 const shown=view.tab==='active'?active(all):archived(all);
 if(!shown.length)body.append(el('p','rt-note',view.tab==='active'?'Noch keine Routine. Lege deinen ersten Yoga-Flow oder deine Dehnroutine an – sie erscheint dann an den gewählten Tagen im Wochenplan.':'Keine archivierten Routinen. Archivierte Routinen bleiben hier erhalten und lassen sich jederzeit reaktivieren.'));
 ordered(shown).forEach(r=>{
  const c=el('div','rt-card'+(r.archived?' archived':''));
  const ch=el('div','rt-cardhead');const cl=el('div');
  cl.append(el('small','',kindLabel(r.kind)),el('strong','',r.name),el('div','rt-meta',routineMeta(r).replace(kindLabel(r.kind)+' · ','')),el('span','rt-when',whenLabel(whenOf(r))));
  ch.append(cl);
  if(!r.archived){const st=btn('rt-star',r.pinned?'★':'☆',()=>{const s=S();s.forgeRoutines=setPinned(list(s),r.id,!r.pinned);store();openList('active');});
   st.setAttribute('aria-pressed',String(!!r.pinned));st.setAttribute('aria-label',(r.pinned?'Favorit entfernen: ':'Als Favorit anheften: ')+r.name);ch.append(st);}
  c.append(ch);
  const d=el('div','rt-days');DAYS.forEach((t,i)=>d.append(el('span',(r.days||[]).includes(i)?'on':'',t)));c.append(d);
  const acts=el('div','rt-acts');
  if(!r.archived){
   const go=btn('go','Starten',()=>startRoutine(r.id));
   acts.append(go,btn('','Bearbeiten',()=>openEdit(r)),btn('','Archivieren',()=>{const s=S();s.forgeRoutines=setArchived(list(s),r.id,true);store();register();openList('active');}));
  }else{
   acts.style.gridTemplateColumns='1fr 1fr';
   acts.append(btn('go','Reaktivieren',()=>{const s=S();s.forgeRoutines=setArchived(list(s),r.id,false);store();register();openList('archive');}),btn('','Ansehen',()=>openEdit(r,true)));
  }
  c.append(acts);body.append(c);
 });
}
function openEdit(r,readOnly){
 const src=r?JSON.parse(JSON.stringify(r)):null;
 view={mode:'edit',back:r&&r.archived?'archive':'active',readOnly:!!readOnly,step:src?1:0,
  d:src||{id:newId(),name:'',kind:'',items:[],days:[],when:'any',pinned:false,archived:false},cat:'',err:''};
 drawEdit();
}
function drawEdit(){
 const v=view;const d=v.d;
 const steps=['kind','items','plan'];const step=steps[v.step];
 const inner=frame((d.createdAt?'Routine bearbeiten':'Neue Routine')+' · '+(v.step+1)+'/3',()=>{if(v.step>0){v.step--;v.err='';drawEdit();}else openList(v.back);});
 const head=el('div','rt-head');const body=el('div','rt-body');const foot=el('div','rt-foot');
 inner.append(head,body,foot);
 let nextLabel='Weiter',canNext=true;
 if(step==='kind'){
  head.append(el('h2','','Welche Art von Routine?'),el('p','','Du kannst jederzeit Übungen aus allen Bereichen dazunehmen.'));
  KINDS.forEach(([k,t,sub])=>{const b=btn('rt-kind','',()=>{if(v.readOnly)return;d.kind=k;if(!d.name||KINDS.some(x=>x[1]===d.name))d.name=t;v.cat='';drawEdit();});b.append(el('b','',t),el('small','',sub));b.setAttribute('aria-pressed',String(d.kind===k));body.append(b);});
  canNext=!!d.kind;
 }else if(step==='items'){
  head.append(el('h2','','Übungen'),el('p','',d.items.length+' ausgewählt · Reihenfolge unten anpassen'));
  const cats=['Alle','Yoga','Gelenke','Dehnen'];const cur=v.cat||KIND_CAT[d.kind]||'Alle';
  const chips=el('div','rt-chips');cats.forEach(cn=>{const b=btn('',cn,()=>{v.cat=cn;drawEdit();});b.setAttribute('aria-pressed',String(cur===cn));chips.append(b);});
  body.append(chips);
  if(d.items.length){
   body.append(el('div','rt-label','Ablauf'));
   d.items.forEach((it,i)=>{const row=el('div','rt-sel');row.append(el('span','',(i+1)+'. '+it[0]+' · '+it[1]+' Sek.'+(it[2]?' je Seite':'')));
    if(!v.readOnly){
     const up=btn('','↑',()=>{if(i>0){[d.items[i-1],d.items[i]]=[d.items[i],d.items[i-1]];drawEdit();}});up.setAttribute('aria-label',it[0]+' nach oben');up.disabled=i===0;
     const dn=btn('','↓',()=>{if(i<d.items.length-1){[d.items[i+1],d.items[i]]=[d.items[i],d.items[i+1]];drawEdit();}});dn.setAttribute('aria-label',it[0]+' nach unten');dn.disabled=i===d.items.length-1;
     const rm=btn('','✕',()=>{d.items.splice(i,1);drawEdit();});rm.setAttribute('aria-label',it[0]+' entfernen');
     row.append(up,dn,rm);}
    body.append(row);});
  }
  body.append(el('div','rt-label','Katalog'));
  const box=el('div');box.style.display='flex';box.style.flexDirection='column';box.style.gap='6px';body.append(box);
  loadLib().then(l=>{
   if(!root||view!==v||steps[v.step]!=='items')return;
   const shown=l.filter(x=>cur==='Alle'||catOf(x.name)===cur);
   box.replaceChildren(...shown.map(x=>{
    const idx=d.items.findIndex(it=>it[0]===x.name);
    const b=btn('rt-ex','',()=>{if(v.readOnly)return;if(idx>=0)d.items.splice(idx,1);else if(d.items.length<MAX_ITEMS)d.items.push(item(x));drawEdit();});
    b.setAttribute('aria-pressed',String(idx>=0));
    const src=thumbSrc(x.name);if(src){const im=el('img');im.src=src;im.alt='';im.loading='lazy';b.append(im);}else b.append(el('i','ph'));
    const t=el('span');t.append(el('b','',x.name),el('small','',catOf(x.name)+' · '+(x.region||'')+' · '+(x.seconds||30)+' Sek.'+(x.sides?' je Seite':'')));
    b.append(t,el('em','',idx>=0?String(idx+1):'+'));return b;}));
   if(!shown.length)box.append(el('p','rt-note','Keine Übungen in dieser Kategorie.'));
  });
  canNext=d.items.length>0;
 }else{
  head.append(el('h2','','Name und Tage'),el('p','','An den gewählten Tagen erscheint die Routine im Wochenplan und unter Workout › Mobilität.'));
  body.append(el('div','rt-label','Name'));
  const inp=el('input','rt-field');inp.value=d.name;inp.maxLength=60;inp.setAttribute('aria-label','Name der Routine');inp.disabled=v.readOnly;
  inp.addEventListener('input',()=>{d.name=inp.value;nb.disabled=!d.name.trim()||v.readOnly;});
  body.append(inp);
  body.append(el('div','rt-label','Wann möchtest du diese Routine machen?'));
  const wg=el('div','rt-whens');
  WHEN.forEach(([k,t,sub])=>{const b=btn('rt-kind','',()=>{if(v.readOnly)return;d.when=k;drawEdit();});b.append(el('b','',t),el('small','',sub));b.setAttribute('aria-pressed',String(whenOf(d)===k));wg.append(b);});
  body.append(wg);
  body.append(el('div','rt-label',whenOf(d)==='any'?'Wochentage (optional)':'Nur an diesen Tagen (optional – sonst bei jedem Krafttraining)'));
  const dp=el('div','rt-daypick');
  DAYS.forEach((t,i)=>{const b=btn('',t,()=>{if(v.readOnly)return;d.days=d.days.includes(i)?d.days.filter(x=>x!==i):d.days.concat(i);drawEdit();});b.setAttribute('aria-pressed',String(d.days.includes(i)));dp.append(b);});
  body.append(dp);
  body.append(el('p','rt-note',routineMeta(d)+'. Krafttraining und dein Mobilitätsplan bleiben unverändert.'));
  nextLabel=v.readOnly?'Zurück zum Archiv':'Routine speichern';canNext=!!d.name.trim()||v.readOnly;
 }
 if(v.err)foot.append(el('p','rt-err',v.err));
 const nb=btn('rt-next',nextLabel,()=>{
  if(step!=='plan'){v.step++;v.err='';drawEdit();return;}
  if(v.readOnly){openList('archive');return;}
  const err=validate(d);if(err){v.err=err;drawEdit();return;}
  const s=S();s.forgeRoutines=upsert(list(s),d);store();register();
  try{if(typeof window.render==='function')window.render();}catch(e){}
  openList('active');
 });
 nb.disabled=!canNext;foot.append(nb);
}

/* ---------- entry points & calendar ---------- */
function planEntry(){
 const rows=document.querySelector('#plan .forge-lb-plan .forge-lb-rows');
 if(!rows||rows.querySelector('.forge-lb-routines'))return;
 const b=el('button','forge-lb-row forge-lb-routines');b.type='button';
 b.innerHTML='<span>Routinen · Yoga, Mobilität, Dehnen</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
 b.addEventListener('click',()=>openList('active'));
 const mob=rows.querySelector('.forge-lb-mobplan');if(mob)mob.after(b);else rows.prepend(b);
}
/* Workout › Mobilität: today's routines with a start button. */
function todayCard(){
 const host=document.querySelector('#workout .forge-lb-mobstart');
 const old=document.querySelector('#workout .forge-lb-rtoday');
 const all=list(S());const rs=ordered(forDay(all,todayIdx()));
 const fav=ordered(active(all).filter(r=>r.pinned&&!rs.includes(r)));
 if(!host||(!rs.length&&!fav.length)){if(old)old.remove();return;}
 const key=rs.concat(fav).map(r=>r.id+':'+r.updatedAt+':'+!!r.pinned).join('|');
 if(old&&old.dataset.key===key&&old.previousElementSibling===host)return;
 ensureCss();
 const c=el('section','forge-lb-rtoday');c.dataset.key=key;c.append(el('small','',rs.length?'Routinen heute':'Deine Favoriten'));
 const row=r=>{const x=el('div','rq');const t=el('span');t.append(el('b','',(r.pinned?'★ ':'')+r.name),el('em','',whenLabel(whenOf(r))+' · '+routineMeta(r)));x.append(t,btn('','Starten',()=>startRoutine(r.id)));return x;};
 rs.forEach(r=>c.append(row(r)));
 if(rs.length&&fav.length)c.append(el('div','rq-group','Favoriten'));
 fav.forEach(r=>c.append(row(r)));
 if(old)old.remove();host.after(c);
}
/* ---------- #75 vor dem Krafttraining anbieten ---------- */
let offer=null;
function closeOffer(){if(offer){offer.remove();offer=null;}}
function preOffer(){
 const s=S();if(!s||!s.activeWorkout||!s.workoutDraft)return;
 const d=s.workoutDraft;if(d.preRoutine)return;
 const done=(d.exercises||[]).some(e=>(e&&e.sets||[]).some(x=>x&&x.done));
 const rs=done?[]:forWorkout(list(s),'before',todayIdx());
 if(!rs.length){d.preRoutine={decided:true,none:true};return;}
 d.preRoutine={decided:false};store();showPre(rs);
}
function decidePre(id){
 const s=S();if(s&&s.workoutDraft)s.workoutDraft.preRoutine={decided:true,routine:id||null,skipped:!id,at:Date.now()};store();closeOffer();
}
function showPre(rs){
 ensureCss();closeOffer();
 offer=el('div','forge-lb-rtoffer');offer.setAttribute('role','dialog');offer.setAttribute('aria-modal','true');offer.setAttribute('aria-label','Routine vor dem Krafttraining');
 const sh=el('div','ro-sheet');
 sh.append(el('small','','Vor dem Krafttraining'),el('h2','',rs.length===1?rs[0].name:'Routine vorab?'),el('p','',rs.length===1?routineMeta(rs[0])+' – danach geht es mit deinem Training weiter.':'Wähle eine Routine oder überspringe sie.'));
 rs.forEach(r=>{const x=el('div','rq');const t=el('span');t.append(el('b','',r.name),el('em','',routineMeta(r)));
  x.append(t,btn('','Jetzt starten',()=>{decidePre(r.id);register();setTimeout(()=>{try{window.ForgeLayoutBMobilityStart?.(routineKey(r.id));}catch(e){}},80);}));sh.append(x);});
 sh.append(btn('ro-skip','Überspringen',()=>decidePre(null)));
 offer.append(sh);document.body.append(offer);
 sh.querySelector('button')?.focus({preventScroll:true});
}
function checkPre(){
 const s=S();
 if(offer&&(!s||!s.activeWorkout||!s.workoutDraft||(s.workoutDraft.preRoutine&&s.workoutDraft.preRoutine.decided))){closeOffer();return;}
 if(!s||!s.activeWorkout||!s.workoutDraft)return;
 const pr=s.workoutDraft.preRoutine;
 if(!pr)preOffer();
 else if(!pr.decided&&!offer){const rs=forWorkout(list(s),'before',todayIdx());if(rs.length)showPre(rs);else decidePre(null);}
}
/* nach erfolgreichem Speichern: Karte im Abschluss-Bildschirm (nie nach „Verwerfen“). */
function afterCard(){
 const fin=document.querySelector('.forge-lb-finish .fin-body');
 if(!fin||fin.querySelector('.forge-lb-rtafter'))return;
 const rs=forWorkout(list(S()),'after',todayIdx());if(!rs.length)return;
 ensureCss();
 const c=el('div','forge-lb-rtafter');c.append(el('small','','Nach dem Training'));
 rs.forEach(r=>{const x=el('div','rq');const t=el('span');t.append(el('b','',r.name),el('em','',routineMeta(r)));
  x.append(t,btn('','Starten',()=>{document.querySelector('.forge-lb-finish')?.remove();startRoutine(r.id);}));c.append(x);});
 c.append(el('p','rt-note','Optional – mit „Fertig“ überspringst du sie heute.'));
 fin.append(c);
}
window.ForgeRoutines=Object.freeze({
 forDay:d=>forDay(list(S()),d).map(r=>({id:r.id,name:r.name,kind:r.kind})),
 start:startRoutine,open:openList,register,
 forWorkout:(phase,d)=>forWorkout(list(S()),phase,d==null?todayIdx():d).map(r=>({id:r.id,name:r.name,kind:r.kind}))
});
function tick(){if(!enabled())return;planEntry();todayCard();checkPre();afterCard();}
function wrapStart(){
 const o=window.startWorkout;if(typeof o!=='function'||o.__forgeRt)return typeof o==='function';
 const w=function(){const r=o.apply(this,arguments);try{if(enabled())checkPre();}catch(e){console.error('FORGE Routine vorher',e);}return r;};
 w.__forgeRt=true;window.startWorkout=w;return true;
}
function install(){
 if(!document.body||!enabled())return false;
 register();wrapStart();tick();setInterval(()=>{if(document.visibilityState!=='hidden'){wrapStart();tick();}},800);
 const fo=new MutationObserver(()=>{if(document.querySelector('.forge-lb-finish'))afterCard();});fo.observe(document.body,{childList:true});
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
