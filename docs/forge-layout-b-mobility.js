/* FORGE Layout B · Mobilität live.
 * Workout › Mobilität zeigt eine Startkarte (Routine, Übungen, Dauer, Tage)
 * und startet eine geführte Einheit im Vollbild: Bild, Anleitung, Countdown-
 * Ring, automatische Seitenwechsel („je Seite“), kurze Bereit-Phase vor jeder
 * Übung, Pause / Zurück / Überspringen, Abschluss mit Dauer.
 * Data: the routine comes from mobConfig()/MOB_ROUTINES (incl. the
 * individual mix „forge-custom“). Finishing appends to state.mobility.logs
 * exactly like completeMobility() (plus durationMs) – no new data model.
 * A running session survives a reload (state.forgeLbMobRun).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const TEAL='#5ee0c8';
const PREP=5,SIDE_PREP=3;

/* ---------- pure helpers (tested) ---------- */
function hasSides(item,lib){
 const cue=String(item&&item[2]||'');
 if(/je seite|seite wechseln|pro seite/i.test(cue))return true;
 const x=(lib||[]).find(e=>e.name===(item&&item[0]));
 return !!(x&&x.sides);
}
/* One phase per side; a short prep phase before each exercise and side change. */
function buildPhases(items,lib){
 const out=[];
 (items||[]).forEach((it,i)=>{
  const secs=Math.max(5,Math.round(Number(it[1])||30));
  const sides=hasSides(it,lib);
  out.push({kind:'prep',ex:i,secs:PREP});
  if(sides){
   out.push({kind:'work',ex:i,secs,side:'Rechts',sideNo:1});
   out.push({kind:'prep',ex:i,secs:SIDE_PREP,sideChange:true});
   out.push({kind:'work',ex:i,secs,side:'Links',sideNo:2});
  }else out.push({kind:'work',ex:i,secs});
 });
 return out;
}
function totalSeconds(items,lib){return buildPhases(items,lib).filter(p=>p.kind==='work').reduce((a,p)=>a+p.secs,0);}
function minutesLabel(sec){return 'ca. '+Math.max(1,Math.round(sec/60))+' Min.';}
function clock(sec){sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
function firstPhaseOf(phases,ex){const i=phases.findIndex(p=>p.ex===ex);return i<0?phases.length:i;}
function isToday(cfg,weekday,trainedToday){
 if(!cfg||!cfg.enabled)return false;
 const days=Array.isArray(cfg.weekdays)?cfg.weekdays:[];
 if(cfg.timing==='after')return !!trainedToday;
 if(cfg.timing==='both')return days.includes(weekday)||!!trainedToday;
 return days.includes(weekday);
}
window.ForgeLayoutBMobility=Object.freeze({hasSides,buildPhases,totalSeconds,minutesLabel,clock,firstPhaseOf,isToday,PREP,SIDE_PREP});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function cfg(){try{return typeof mobConfig==='function'?mobConfig():(state.mobility||{});}catch(e){return {};}}
function routines(){try{return typeof MOB_ROUTINES!=='undefined'?MOB_ROUTINES:{};}catch(e){return {};}}
function routine(){const c=cfg();const r=routines()[c.routine||'gentle'];return r&&Array.isArray(r.items)&&r.items.length?{key:c.routine||'gentle',name:r.name,items:r.items}:null;}
let lib=null;
function loadLib(){if(lib)return Promise.resolve(lib);return fetch('./exercise-plus-data.json',{cache:'force-cache'}).then(r=>r.json()).then(d=>{lib=Array.isArray(d.mobility)?d.mobility:[];return lib;}).catch(()=>{lib=[];return lib;});}
function guide(name){
 try{if(typeof FORGE_EX_GUIDES!=='undefined'&&FORGE_EX_GUIDES[name])return {steps:FORGE_EX_GUIDES[name][0]||[],tip:FORGE_EX_GUIDES[name][1]||''};}catch(e){}
 const x=(lib||[]).find(e=>e.name===name);
 return x?{steps:x.steps||[],tip:x.tip||''}:{steps:[],tip:''};
}
function images(name){
 try{const m=typeof forgeMobImage==='function'?forgeMobImage(name):null;if(Array.isArray(m)&&m.length)return m.slice(0,2);}catch(e){}
 try{
  const fn=window.forgeExerciseIllustrations||window.forgePublicExercisePictures;
  const html=typeof fn==='function'?fn(name):'';
  if(html){const d=document.createElement('div');d.innerHTML=html;const src=[...d.querySelectorAll('img')].map(i=>i.getAttribute('src')).filter(Boolean);if(src.length)return src.slice(0,1);}
 }catch(e){}
 return [];
}
function localDay(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const todayIdx=()=>(new Date().getDay()+6)%7;
function trainedToday(){
 try{const t=localDay(new Date());return (state.workouts||[]).some(w=>w&&w.date&&localDay(new Date(w.date))===t);}catch(e){return false;}
}
function store(){try{if(typeof save==='function')save();}catch(e){console.error('FORGE Mobilität speichern',e);}}

const ICON={
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 play:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
 pause:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
 prev:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
 next:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
 flow:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M12 7v6M7 10l5 3 5-3M9 21l3-8 3 8"/></svg>',
 check:'<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>'
};

const K='.forge-lb-mobstart',R='.forge-lb-mobrun';
const CSS=`
${K}{background:linear-gradient(160deg,#1d3b3a,#171e2a 62%);border:1px solid #2f6a62;border-radius:24px;padding:18px;margin:4px 0 14px;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:12px}
${K} .ms-kick{font-size:12px;color:${TEAL};font-weight:800;text-transform:uppercase;letter-spacing:1.4px}
${K} h3{margin:0;font-size:22px;font-weight:800;line-height:1.2;color:#f3f7fc}
${K} .ms-sub{font-size:14px;color:#c3cddb}
${K} .ms-list{display:flex;flex-direction:column;gap:6px}
${K} .ms-row{display:flex;align-items:center;gap:10px;background:#0f1620cc;border-radius:14px;padding:6px 12px 6px 6px}
${K} .ms-th{width:40px;height:40px;flex:0 0 40px;border-radius:10px;overflow:hidden;background:#202a38;display:flex;align-items:center;justify-content:center;color:${TEAL}}
${K} .ms-th img{width:100%;height:100%;object-fit:cover;display:block}
${K} .ms-row b{flex:1;font-size:14px;font-weight:600;min-width:0;overflow-wrap:anywhere;hyphens:auto}
${K} .ms-row em{flex:0 0 auto;font-style:normal;font-size:12px;color:#95a3b7;white-space:nowrap}
${K} .ms-go{height:60px;border-radius:30px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px}
${K} .ms-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;margin-top:4px}
${K} .ms-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
${K} .ms-tile{min-height:72px;border-radius:18px;border:1px solid #293346;background:#0f1620;color:#f3f7fc;font:inherit;text-align:left;padding:10px 12px;display:flex;flex-direction:column;justify-content:center;gap:2px}
${K} .ms-tile b{font-size:15px;font-weight:700;overflow-wrap:anywhere}
${K} .ms-tile span{font-size:12px;color:#95a3b7}
${K} .ms-sec{height:46px;border-radius:23px;border:1px solid #2f6a62;background:transparent;color:#f3f7fc;font:inherit;font-size:14px;font-weight:700}
${K} .ms-meta{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
${K} .ms-meta span{font-size:12px;border-radius:12px;background:#0f1620;color:#c3cddb;padding:5px 0;text-align:center}
${K} .ms-meta span.on{background:${TEAL};color:#062420;font-weight:800}
body.forge-layout-b #mobWorkout .forge-lb-mob-hidden{display:none!important}
${R}{position:fixed;inset:0;z-index:2147480200;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
${R} .mr-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(14px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));gap:10px}
${R} .mr-top{display:flex;align-items:center;gap:12px;min-height:44px}
${R} .mr-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${R} .mr-prog{flex:1;display:flex;gap:4px}
${R} .mr-prog i{flex:1;height:5px;border-radius:3px;background:#293346;display:block}
${R} .mr-prog i.done{background:${TEAL}}
${R} .mr-prog i.cur{background:linear-gradient(90deg,${TEAL} var(--p,0%),#293346 var(--p,0%))}
${R} .mr-count{font-size:13px;color:#95a3b7;font-weight:600;min-width:34px;text-align:right}
${R} .mr-media{flex:1 1 auto;min-height:120px;border-radius:22px;overflow:hidden;background:#10161f;display:flex;flex-direction:column;gap:4px;position:relative}
${R} .mr-media img{min-height:0}
${R} .mr-media img{flex:1;min-width:0;height:100%;object-fit:contain;display:block;background:#10161f}
${R} .mr-media.none{align-items:center;justify-content:center;color:#2f6a62}
${R} .mr-badge{position:absolute;left:10px;top:10px;height:28px;border-radius:14px;background:#0b1018d9;color:${TEAL};font-size:12px;font-weight:800;padding:0 12px;display:flex;align-items:center}
${R} .mr-name{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
${R} .mr-name h2{margin:0;font-size:clamp(21px,6.4vw,26px);font-weight:800;line-height:1.15;overflow-wrap:anywhere}
${R} .mr-name small{display:block;font-size:13px;color:#95a3b7;margin-top:3px}
${R} .mr-how{flex:0 0 auto;border:0;background:transparent;color:${TEAL};font:inherit;font-size:13px;font-weight:700;padding:6px 0;white-space:nowrap}
${R} .mr-timer{display:flex;align-items:center;gap:16px;background:#171e2a;border:1px solid #293346;border-radius:22px;padding:12px 16px}
${R} .mr-ring{width:96px;height:96px;flex:0 0 96px;position:relative}
${R} .mr-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
${R} .mr-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;font-variant-numeric:tabular-nums}
${R} .mr-state{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
${R} .mr-state strong{font-size:17px;font-weight:800}
${R} .mr-state span{font-size:13px;color:#95a3b7;line-height:1.4}
${R} .mr-state.prep strong{color:#ffb547}
${R} .mr-ctrl{display:grid;grid-template-columns:56px minmax(0,1fr) 56px;gap:10px;align-items:center}
${R} .mr-side{height:56px;border-radius:28px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${R} .mr-side:disabled{opacity:.35}
${R} .mr-main{height:64px;border-radius:32px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px}
${R} .mr-done{flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px}
${R} .mr-done-icon{width:76px;height:76px;border-radius:26px;background:${TEAL};color:#062420;display:flex;align-items:center;justify-content:center}
${R} .mr-done h2{margin:0;font-size:28px;font-weight:800}
${R} .mr-sum{border-radius:22px;background:linear-gradient(160deg,#1d3b3a,#171e2a 65%);border:1px solid #2f6a62;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
${R} .mr-sum div{display:flex;justify-content:space-between;gap:12px;font-size:15px}
${R} .mr-sum span{color:#c3cddb}
${R} .mr-sec{height:52px;border-radius:26px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:16px;font-weight:700}
${R} button:focus-visible,${K} button:focus-visible{outline:2px solid ${TEAL};outline-offset:2px}
.forge-lb-mob-shade{position:fixed;inset:0;z-index:2147480400;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-mob-sheet{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:12px 16px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;max-height:86vh}
.forge-lb-mob-sheet .h{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center;flex:0 0 auto}
.forge-lb-mob-sheet strong{font-size:22px;font-weight:800}
.forge-lb-mob-sheet p{margin:0;font-size:14px;color:#c3cddb;line-height:1.5}
.forge-lb-mob-sheet ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.5;color:#c3cddb;overflow-y:auto}
.forge-lb-mob-sheet .tip{background:#14302d;border-radius:14px;padding:10px 12px;font-size:13px;color:#d6f7f0}
.forge-lb-mob-sheet .m{height:56px;border-radius:28px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:17px;font-weight:800}
.forge-lb-mob-sheet .s{height:50px;border-radius:25px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
.forge-lb-mob-sheet .d{height:50px;border-radius:25px;border:1px solid #4a2630;background:transparent;color:#ffc6c6;font:inherit;font-size:15px;font-weight:700}
@media (max-height:700px){${R} .mr-ring{width:80px;height:80px;flex-basis:80px}${R} .mr-ring b{font-size:22px}${R} .mr-main{height:56px}${R} .mr-side{height:50px}}
`;
function ensureCss(){if(!$('forgeLayoutBMobilityCss')){const s=el('style');s.id='forgeLayoutBMobilityCss';s.textContent=CSS;document.head.append(s);}}

/* ---------- start card in Workout › Mobilität ---------- */
function thumb(name){const t=el('span','ms-th');const src=images(name)[0];if(src){const i=el('img');i.src=src;i.alt='';i.loading='lazy';t.append(i);}else t.innerHTML=ICON.flow;return t;}
function renderCard(){
 if(!enabled())return;
 const host=$('mobWorkout');if(!host)return;
 ensureCss();
 let card=host.parentElement.querySelector(':scope > .forge-lb-mobstart');
 if(!card){card=el('section','forge-lb-mobstart');host.before(card);}
 card.replaceChildren();
 const c=cfg(),r=routine();
 if(!c.enabled||!r){
  // W5: start a routine right away – a plan is optional.
  const all=routines(),keys=Object.keys(all).filter(k=>all[k]&&Array.isArray(all[k].items)&&all[k].items.length);
  const first=keys.includes('gentle')?'gentle':keys[0];
  if(!first){
   card.append(el('div','ms-kick','Mobilität'),el('h3','','Noch kein Mobilitätsplan'));
   card.append(btn('ms-go','Mobilitätsplan erstellen',()=>{if(typeof window.ForgeLayoutBWizardOpen==='function')window.ForgeLayoutBWizardOpen('mobility');}));
   hideLegacy();return;
  }
  const fr=all[first];
  card.append(el('div','ms-kick',run()?'Läuft gerade':'Schnell starten'),el('h3','',run()?(run().name||fr.name):fr.name));
  card.append(el('div','ms-sub',fr.items.length+' Übungen · '+minutesLabel(totalSeconds(fr.items,lib))+' · geführt mit Timer und Seitenwechsel'));
  const go=btn('ms-go','',()=>startRun(first));go.innerHTML=ICON.play+'<span>'+(run()?'Mobilität fortsetzen':'Jetzt starten')+'</span>';card.append(go);
  const others=keys.filter(k=>k!==first);
  if(others.length){
   card.append(el('div','ms-label','Andere Routine'));
   const grid=el('div','ms-grid');
   others.forEach(k=>{const r=all[k];const b=btn('ms-tile','',()=>startRun(k));b.append(el('b','',r.name),el('span','',r.items.length+' Übungen · '+minutesLabel(totalSeconds(r.items,lib))));grid.append(b);});
   card.append(grid);
  }
  card.append(btn('ms-sec','Mobilitätsplan erstellen',()=>{if(typeof window.ForgeLayoutBWizardOpen==='function')window.ForgeLayoutBWizardOpen('mobility');}));
  hideLegacy();return;
 }
 const today=isToday(c,todayIdx(),trainedToday());
 const logs=Array.isArray(c.logs)?c.logs:[];
 const done=logs.some(l=>l&&l.date&&localDay(new Date(l.date))===localDay(new Date()));
 card.append(el('div','ms-kick',done?'Heute erledigt ✓':today?'Heute dran':'Mobilität'));
 card.append(el('h3','',r.name));
 card.append(el('div','ms-sub',r.items.length+' Übungen · '+minutesLabel(totalSeconds(r.items,lib))+' · '+(c.timing==='after'?'nach dem Krafttraining':c.timing==='both'?'Ruhetage & nach dem Training':'an Ruhetagen')));
 if(c.timing!=='after'){
  const meta=el('div','ms-meta');['Mo','Di','Mi','Do','Fr','Sa','So'].forEach((d,i)=>{const s=el('span',(c.weekdays||[]).includes(i)?'on':'',d);meta.append(s);});card.append(meta);
 }
 const list=el('div','ms-list');
 r.items.forEach(it=>{const row=el('div','ms-row');row.append(thumb(it[0]),el('b','',it[0]),el('em','',it[1]+' Sek.'+(hasSides(it,lib)?' je Seite':'')));list.append(row);});
 card.append(list);
 const go=btn('ms-go','',()=>startRun());go.innerHTML=ICON.play+'<span>'+(run()?'Mobilität fortsetzen':done?'Noch einmal starten':'Mobilität starten')+'</span>';
 card.append(go);
 card.append(btn('ms-sec','Routine ändern',()=>{if(typeof window.ForgeLayoutBWizardOpen==='function')window.ForgeLayoutBWizardOpen('mobility');}));
 if(logs.length)card.append(el('div','ms-sub',logs.length+'× erledigt'));
 hideLegacy();
}
/* The legacy routine list and „Routine abgeschlossen“ are replaced by the card;
   scheduled videos stay visible. */
function hideLegacy(){
 const host=$('mobWorkout');if(!host)return;
 const kids=[...host.children];
 const h3=kids.find(k=>k.tagName==='H3'&&/Eigene Mobilitätsübungen/.test(k.textContent));
 let hiding=false;
 kids.forEach((k,i)=>{
  if(k===h3)hiding=true;
  const intro=i===0&&k.tagName==='P'&&/Video-Wochenplan erscheinen/.test(k.textContent);
  const empty=k.tagName==='P'&&/Noch keine Videos geplant/.test(k.textContent);
  k.classList.toggle('forge-lb-mob-hidden',hiding||intro||empty);
 });
}

/* ---------- live session ---------- */
let root=null,timer=null,wake=null;
function run(){try{return state.forgeLbMobRun||null;}catch(e){return null;}}
function setRun(r){state.forgeLbMobRun=r;store();}
function phasesOf(r){return buildPhases(r.items,lib);}
function remaining(r){
 if(!r)return 0;
 if(r.running&&r.endsAt)return Math.max(0,(r.endsAt-Date.now())/1000);
 return Math.max(0,Number(r.left)||0);
}
function startRun(key){
 if(!enabled())return;
 const existing=run();
 if(existing&&Array.isArray(existing.items)&&existing.items.length){openRun();return;}
 let r=routine();
 if(typeof key==='string'){const x=routines()[key];if(x&&Array.isArray(x.items)&&x.items.length)r={key,name:x.name,items:x.items};}
 if(!r)return;
 loadLib().then(()=>{
  const ph=buildPhases(r.items,lib);
  setRun({routine:r.key,name:r.name,items:r.items.map(x=>x.slice()),phase:0,running:true,endsAt:Date.now()+ph[0].secs*1000,left:ph[0].secs,startedAt:Date.now(),pausedMs:0,pausedAt:0});
  openRun();
 });
}
function openRun(){
 ensureCss();
 if(!root){
  root=el('div','forge-lb-mobrun');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Mobilität');
  document.body.append(root);document.body.classList.add('forge-lb-mobrun-open');
 }
 try{navigator.wakeLock?.request('screen').then(w=>{wake=w;}).catch(()=>{});}catch(e){}
 if(!timer)timer=setInterval(tick,250);
 render();
}
function closeRun(){
 if(timer){clearInterval(timer);timer=null;}
 try{wake?.release?.();}catch(e){}wake=null;
 closeSheet();
 if(root){root.remove();root=null;}
 document.body.classList.remove('forge-lb-mobrun-open');
 renderCard();
}
function buzz(p){try{navigator.vibrate?.(p);}catch(e){}}
function goPhase(i,keepRunning){
 const r=run();if(!r)return;
 const ph=phasesOf(r);
 if(i>=ph.length){finishRun();return;}
 i=Math.max(0,i);
 const running=keepRunning===undefined?r.running:keepRunning;
 r.phase=i;r.left=ph[i].secs;r.endsAt=running?Date.now()+ph[i].secs*1000:0;r.running=running;
 if(!running&&!r.pausedAt)r.pausedAt=Date.now();
 if(running&&r.pausedAt){r.pausedMs=(r.pausedMs||0)+(Date.now()-r.pausedAt);r.pausedAt=0;}
 setRun(r);render();
}
function tick(){
 const r=run();if(!r||!root){return;}
 if(r.done)return;
 const left=remaining(r);
 if(r.running&&left<=0){
  const ph=phasesOf(r);const cur=ph[r.phase];
  buzz(cur&&cur.kind==='work'?[220,90,220]:[120]);
  goPhase(r.phase+1,true);return;
 }
 const b=root.querySelector('.mr-ring b');if(b)b.textContent=clock(left);
 const arc=root.querySelector('.mr-ring .arc');
 if(arc){const ph=phasesOf(r)[r.phase];const f=ph?1-left/ph.secs:0;arc.setAttribute('stroke-dashoffset',String(CIRC*(1-Math.min(1,Math.max(0,f)))));}
 const cur=root.querySelector('.mr-prog i.cur');
 if(cur){const ph=phasesOf(r);const ex=ph[r.phase]?.ex;const parts=ph.filter(p=>p.ex===ex);const before=parts.slice(0,parts.indexOf(ph[r.phase])).reduce((a,p)=>a+p.secs,0);const all=parts.reduce((a,p)=>a+p.secs,0);cur.style.setProperty('--p',Math.round((before+(ph[r.phase].secs-left))/all*100)+'%');}
}
function toggle(){
 const r=run();if(!r)return;
 if(r.running){r.left=remaining(r);r.running=false;r.endsAt=0;r.pausedAt=Date.now();}
 else{r.running=true;r.endsAt=Date.now()+Math.max(1,r.left)*1000;if(r.pausedAt){r.pausedMs=(r.pausedMs||0)+(Date.now()-r.pausedAt);r.pausedAt=0;}}
 setRun(r);render();
}
function stepExercise(delta){
 const r=run();if(!r)return;
 const ph=phasesOf(r);const ex=ph[r.phase]?.ex||0;
 const target=Math.max(0,Math.min(r.items.length,ex+delta));
 if(target>=r.items.length){finishRun();return;}
 goPhase(firstPhaseOf(ph,target));
}
const CIRC=2*Math.PI*44;
function render(){
 const r=run();if(!root)return;
 if(!r){closeRun();return;}
 root.replaceChildren();
 const inner=el('div','mr-in');root.append(inner);
 if(r.done){renderDone(inner,r);return;}
 const ph=phasesOf(r);const p=ph[r.phase]||ph[0];const item=r.items[p.ex];
 const top=el('div','mr-top');
 const x=btn('mr-round','',askEnd);x.innerHTML=ICON.x;x.setAttribute('aria-label','Mobilität beenden');
 const prog=el('div','mr-prog');r.items.forEach((_,i)=>{const s=el('i',i<p.ex?'done':i===p.ex?'cur':'');prog.append(s);});
 top.append(x,prog,el('div','mr-count',(p.ex+1)+'/'+r.items.length));inner.append(top);
 const media=el('div','mr-media');const imgs=images(item[0]);
 if(imgs.length)imgs.forEach(src=>{const i=el('img');i.src=src;i.alt=item[0];media.append(i);});else{media.classList.add('none');media.innerHTML=ICON.flow.replace('width="22" height="22"','width="64" height="64"');}
 if(p.side)media.append(el('span','mr-badge','Seite '+p.sideNo+' von 2 · '+p.side));
 inner.append(media);
 const nm=el('div','mr-name');const t=el('div');t.append(el('h2','',item[0]),el('small','',item[1]+' Sek.'+(hasSides(item,lib)?' je Seite':'')+(item[2]?' · '+item[2]:'')));
 nm.append(t,btn('mr-how','Anleitung',()=>howSheet(item)));inner.append(nm);
 const tm=el('div','mr-timer');
 const ring=el('div','mr-ring');
 ring.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#293346" stroke-width="8"/><circle class="arc" cx="50" cy="50" r="44" fill="none" stroke="'+(p.kind==='prep'?'#ffb547':TEAL)+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+CIRC+'" stroke-dashoffset="'+CIRC+'"/></svg>';
 ring.append(el('b','',clock(remaining(r))));
 const st=el('div','mr-state'+(p.kind==='prep'?' prep':''));
 if(p.kind==='prep'){
  st.append(el('strong','',p.sideChange?'Seite wechseln':'Bereit machen'),el('span','',p.sideChange?'Gleich geht es mit der linken Seite weiter.':'Gleich: '+item[0]+'. Position einnehmen.'));
 }else{
  const nextEx=r.items[p.ex+1];
  st.append(el('strong','',r.running?(p.side?p.side+' halten':'Läuft'):'Pausiert'),el('span','',nextEx?'Danach: '+nextEx[0]:'Letzte Übung'));
 }
 tm.append(ring,st);inner.append(tm);
 const ctrl=el('div','mr-ctrl');
 const back=btn('mr-side','',()=>stepExercise(-1));back.innerHTML=ICON.prev;back.setAttribute('aria-label','Vorherige Übung');back.disabled=p.ex===0;
 const main=btn('mr-main','',toggle);main.innerHTML=(r.running?ICON.pause:ICON.play)+'<span>'+(r.running?'Pause':'Weiter')+'</span>';
 const fwd=btn('mr-side','',()=>stepExercise(1));fwd.innerHTML=ICON.next;fwd.setAttribute('aria-label',p.ex===r.items.length-1?'Abschließen':'Übung überspringen');
 ctrl.append(back,main,fwd);inner.append(ctrl);
 tick();
}
function netMs(r){const end=r.finishedAt||Date.now();const paused=(r.pausedMs||0)+(r.pausedAt?end-r.pausedAt:0);return Math.max(0,end-r.startedAt-paused);}
function finishRun(){
 const r=run();if(!r)return;
 if(r.pausedAt){r.pausedMs=(r.pausedMs||0)+(Date.now()-r.pausedAt);r.pausedAt=0;}
 r.running=false;r.endsAt=0;r.done=true;r.finishedAt=Date.now();
 const ph=phasesOf(r);r.reached=Math.min(r.items.length,(ph[r.phase]?.ex??r.items.length-1)+1);
 setRun(r);buzz([200,80,200,80,300]);render();
}
function renderDone(inner,r){
 const box=el('div','mr-done');
 const ic=el('div','mr-done-icon');ic.innerHTML=ICON.check;
 box.append(ic,el('h2','','Mobilität erledigt'));
 const sum=el('div','mr-sum');
 const mins=Math.max(1,Math.round(netMs(r)/60000));
 [['Routine',r.name],['Übungen',(r.reached||r.items.length)+' von '+r.items.length],['Dauer',mins+' Min.']].forEach(([k,v])=>{const d=el('div');d.append(el('span','',k),el('b','',v));sum.append(d);});
 box.append(sum);inner.append(box);
 const save=btn('mr-main','Speichern',()=>saveRun(true));save.innerHTML=ICON.check.replace('width="30" height="30"','width="22" height="22"')+'<span>Speichern</span>';
 inner.append(save,btn('mr-sec','Nicht speichern',()=>{setRun(null);closeRun();}));
}
/* Same record as completeMobility(), plus the measured duration. */
function saveRun(){
 const r=run();if(!r)return;
 try{
  const m=cfg();const logs=Array.isArray(m.logs)?m.logs.slice():[];
  logs.push({date:new Date(r.finishedAt||Date.now()).toISOString(),routine:r.routine,durationMs:netMs(r),exercises:r.reached||r.items.length});
  state.mobility={...m,logs};
  state.forgeLbMobRun=null;store();
  try{if(typeof window.render==='function')window.render();}catch(e){}
 }catch(e){console.error('FORGE Mobilität',e);}
 closeRun();
 // Stay on Workout › Mobilität so the updated card („Heute erledigt“) is visible.
 try{if(typeof window.go==='function')window.go('workout');document.querySelector('#forge150WorkoutModes button[data-mode="mobility"]')?.click();
  let n=document.querySelector('.forge-lb-mobstart');while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}
  setTimeout(()=>document.querySelector('.forge-lb-mobstart')?.scrollIntoView?.({block:'start'}),60);}catch(e){}
 toast('Mobilität gespeichert');
}
function toast(text){
 const t=el('div','',text);t.setAttribute('role','status');
 t.style.cssText='position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147480900;background:#171e2a;border:1px solid #2f6a62;color:#f3f7fc;border-radius:22px;padding:12px 18px;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 10px 28px #000a';
 document.body.append(t);setTimeout(()=>t.remove(),2400);
}

/* ---------- sheets ---------- */
let sheet=null;
function openSheet(label,build){
 closeSheet();
 const shade=el('div','forge-lb-mob-shade');shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-label',label);
 const s=el('div','forge-lb-mob-sheet');s.append(el('div','h'));shade.append(s);
 shade.addEventListener('click',e=>{if(e.target===shade)closeSheet();});
 document.body.append(shade);sheet=shade;build(s);
}
function closeSheet(){if(sheet){sheet.remove();sheet=null;}}
function howSheet(item){
 const g=guide(item[0]);
 openSheet('Anleitung: '+item[0],s=>{
  s.append(el('strong','',item[0]));
  if(item[2])s.append(el('p','',item[2]));
  if(g.steps.length){const ol=el('ol');g.steps.forEach(x=>ol.append(el('li','',x)));s.append(ol);}
  else s.append(el('p','','Ruhig und schmerzfrei bewegen. Nur so weit gehen, wie es angenehm ist.'));
  if(g.tip)s.append(el('div','tip',g.tip));
  s.append(btn('s','Schließen',closeSheet));
 });
}
function askEnd(){
 const r=run();if(!r)return;
 const ph=phasesOf(r);const ex=ph[r.phase]?.ex||0;
 openSheet('Mobilität beenden?',s=>{
  s.append(el('strong','','Mobilität beenden?'));
  s.append(el('p','',ex>0?'Du hast '+ex+' von '+r.items.length+' Übungen geschafft.':'Du bist noch bei der ersten Übung.'));
  if(ex>0)s.append(btn('m','Beenden & speichern',()=>{closeSheet();finishRun();}));
  s.append(btn('s','Weitermachen',closeSheet));
  s.append(btn('d','Abbrechen ohne Speichern',()=>{closeSheet();setRun(null);closeRun();}));
 });
}

/* ---------- install ---------- */
function install(){
 if(!document.body||!enabled())return false;
 if(typeof window.renderMobility==='function'&&!window.renderMobility.__forgeLB){
  const prev=window.renderMobility;
  const f=function(){const out=prev.apply(this,arguments);try{renderCard();}catch(e){console.error('FORGE B Mobilität',e);}return out;};
  f.__forgeLB=true;window.renderMobility=f;
 }
 loadLib().then(()=>{renderCard();if(run())openRun();});
 renderCard();
 window.ForgeLayoutBMobilityStart=startRun;
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
