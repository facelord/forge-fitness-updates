/* FORGE Layout B · Kraft-Zirkel (#90, 20.11.2026).
 * Mehrere gespeicherte Zirkel aus dem Kraftkatalog, jede Übung wahlweise
 * „Auf Zeit“ (läuft automatisch weiter) oder „Wiederholungen“ (weiter mit „Fertig“),
 * einstellbare Wechselzeit (Standard 10 s), Runden und separate Rundenpause.
 * Eigenständig: eigener Player, eigenes Protokoll (state.forgeCircuitLogs).
 * Normale Kraftpläne, Satzpausen und der Speichern-Ablauf bleiben unberührt.
 * Daten: state.forgeCircuits=[{id,name,items:[{name,mode,secs,reps}],transition,rounds,roundRest,pinned,archived,createdAt,updatedAt}]
 * Laufend: state.forgeCircuitRun={id,name,phases,idx,running,endsAt,left,startedAt,pausedAt,pausedMs,done}
 */
(function(){
'use strict';
const MAX_ITEMS=20;
const SECS=Object.freeze([20,30,40,45,60]);
const TRANSITIONS=Object.freeze([0,5,10,15,20,30]);
const ROUND_RESTS=Object.freeze([0,30,45,60,90,120]);
const DEF=Object.freeze({transition:10,rounds:3,roundRest:60});

/* ---------- pure helpers (tested) ---------- */
const clampInt=(v,min,max,def)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):def;};
function cleanItem(x){
 const mode=x&&x.mode==='reps'?'reps':'time';
 return {name:String(x&&x.name||'').trim().slice(0,90),mode,secs:clampInt(x&&x.secs,5,600,30),reps:clampInt(x&&x.reps,1,200,15)};
}
function validate(c){
 if(!c||typeof c!=='object')return 'Ungültiger Zirkel.';
 if(!String(c.name||'').trim())return 'Bitte gib dem Zirkel einen Namen.';
 if(!Array.isArray(c.items)||!c.items.length)return 'Wähle mindestens eine Übung.';
 if(c.items.length>MAX_ITEMS)return 'Höchstens '+MAX_ITEMS+' Übungen pro Zirkel.';
 if(c.items.some(x=>!String(x&&x.name||'').trim()))return 'Jede Übung braucht einen Namen.';
 return '';
}
function clean(c,now){
 const t=now||new Date().toISOString();
 return {id:String(c.id),name:String(c.name).trim().slice(0,60),items:(c.items||[]).slice(0,MAX_ITEMS).map(cleanItem),
  transition:clampInt(c.transition,0,60,DEF.transition),rounds:clampInt(c.rounds,1,10,DEF.rounds),roundRest:clampInt(c.roundRest,0,600,DEF.roundRest),
  pinned:!!c.pinned,archived:!!c.archived,createdAt:c.createdAt||t,updatedAt:t};
}
function upsert(cs,c,now){
 const x=clean(c,now);const out=(cs||[]).slice();const i=out.findIndex(y=>y&&String(y.id)===x.id);
 if(i>=0)out[i]={...out[i],...x,createdAt:out[i].createdAt||x.createdAt};else out.push(x);
 return out;
}
function duplicate(cs,id,newId,now){
 const src=(cs||[]).find(c=>c&&String(c.id)===String(id));if(!src)return cs;
 return upsert(cs,{...src,id:newId,name:(src.name+' (Kopie)').slice(0,60),pinned:false,archived:false,createdAt:null},now);
}
function setFlag(cs,id,key,flag){return (cs||[]).map(c=>c&&String(c.id)===String(id)?{...c,[key]:!!flag}:c);}
function active(cs){return (cs||[]).filter(c=>c&&!c.archived);}
function archived(cs){return (cs||[]).filter(c=>c&&c.archived);}
function ordered(cs){return (cs||[]).map((c,i)=>[c,i]).sort((a,b)=>(!!b[0].pinned-!!a[0].pinned)||String(a[0].createdAt||'').localeCompare(String(b[0].createdAt||''))||a[1]-b[1]).map(x=>x[0]);}
/* Ablauf: Arbeit → Wechsel → Arbeit …; zwischen Runden NUR die Rundenpause (kein Wechsel davor). */
function phases(c){
 const items=(c&&c.items||[]).map(cleanItem);const out=[];
 const rounds=clampInt(c&&c.rounds,1,10,1),tr=clampInt(c&&c.transition,0,60,DEF.transition),rr=clampInt(c&&c.roundRest,0,600,DEF.roundRest);
 for(let r=0;r<rounds;r++){
  items.forEach((it,k)=>{
   out.push({type:'work',round:r,index:k,name:it.name,mode:it.mode,secs:it.mode==='time'?it.secs:0,reps:it.mode==='reps'?it.reps:0});
   if(k<items.length-1&&tr>0)out.push({type:'switch',round:r,index:k+1,secs:tr,name:items[k+1].name});
  });
  if(r<rounds-1&&rr>0&&items.length)out.push({type:'roundRest',round:r+1,index:0,secs:rr,name:items[0].name});
 }
 return out;
}
function nextWork(ph,idx){for(let i=idx+1;i<ph.length;i++)if(ph[i].type==='work')return ph[i];return null;}
function totalSeconds(c){return phases(c).reduce((a,p)=>a+(p.type==='work'?(p.mode==='time'?p.secs:Math.round(p.reps*2.5)):p.secs),0);}
/* Zeitgesteuerte Phase abgelaufen? Wdh.-Phasen warten immer auf „Fertig“. */
function remaining(run,now){
 if(!run)return 0;const p=run.phases&&run.phases[run.idx];if(!p||!(p.secs>0))return 0;
 if(!run.running)return Math.max(0,Number(run.left)||0);
 return Math.max(0,Math.ceil(((Number(run.endsAt)||0)-(Number(now)||Date.now()))/1000));
}
function itemLabel(it){return it.mode==='reps'?it.reps+' Wdh.':it.secs+' Sek.';}
window.ForgeCircuitCore=Object.freeze({MAX_ITEMS,SECS,TRANSITIONS,ROUND_RESTS,DEF,cleanItem,validate,clean,upsert,duplicate,setFlag,active,archived,ordered,phases,nextWork,totalSeconds,remaining,itemLabel});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
const ACC='#a9f267';
const $=id=>document.getElementById(id);
const S=()=>typeof state!=='undefined'?state:null;
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function store(){try{if(typeof save==='function')save();}catch(e){console.error('FORGE Zirkel speichern',e);}}
const list=()=>{const s=S();return s&&Array.isArray(s.forgeCircuits)?s.forgeCircuits:[];};
const newId=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function catalog(){
 let names=[];try{names=typeof forge138AvailableNames==='function'?forge138AvailableNames():[];}catch(e){}
 const E=window.ForgeLayoutBEditor;
 try{if(E&&E.splitCatalog)names=E.splitCatalog(names,[]).strength;}catch(e){}
 return [...new Set(names)].sort((a,b)=>a.localeCompare(b,'de'));
}
function groupOf(n){try{return window.ForgeLayoutBEditor?.primaryGroup?.({name:n})||'';}catch(e){return '';}}
function thumb(n){
 try{const h=typeof window.forgePublicExercisePictures==='function'?window.forgePublicExercisePictures(n):'';
  if(h){const d=document.createElement('div');d.innerHTML=h;const i=d.querySelector('img');if(i&&i.getAttribute('src'))return i.getAttribute('src');}}catch(e){}
 return '';
}
function clock(sec){sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
function meta(c){return c.items.length+' '+(c.items.length===1?'Übung':'Übungen')+' · '+c.rounds+' '+(c.rounds===1?'Runde':'Runden')+' · Wechsel '+c.transition+' s · ca. '+Math.max(1,Math.round(totalSeconds(c)/60))+' Min.';}
const TEMPLATE=()=>({id:newId(),name:'Core-Zirkel',transition:10,rounds:3,roundRest:60,
 items:['Plank','Bergsteiger','Dead Bug','Bird Dog'].map(n=>({name:n,mode:'time',secs:30,reps:15}))});

const Z='.forge-lb-zk';
const CSS=`
${Z}{position:fixed;inset:0;z-index:2147481000;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
${Z} .zk-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(14px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))}
${Z} .zk-top{display:flex;align-items:center;gap:12px;min-height:44px}
${Z} .zk-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0;font-size:20px}
${Z} .zk-kick{flex:1;text-align:center;font-size:14px;color:#95a3b7;font-weight:600}
${Z} .zk-head{padding:14px 4px 4px}
${Z} .zk-head h2{margin:0;font-size:clamp(23px,7vw,28px);font-weight:800;line-height:1.15}
${Z} .zk-head p{margin:6px 0 0;font-size:14px;color:#c3cddb;line-height:1.45}
${Z} .zk-body{flex:1;min-height:0;overflow-y:auto;padding:12px 0 8px;display:flex;flex-direction:column;gap:10px;scrollbar-width:none}
${Z} .zk-body::-webkit-scrollbar{display:none}
${Z} .zk-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;height:50px;border-radius:25px;background:#171e2a;border:1px solid #293346;padding:5px;box-sizing:border-box;flex:0 0 auto}
${Z} .zk-seg button{border:0;border-radius:20px;background:transparent;color:#95a3b7;font:inherit;font-size:15px;font-weight:700}
${Z} .zk-seg button[aria-checked="true"]{background:${ACC};color:#142016;font-weight:800}
${Z} .zk-card{background:#171e2a;border:1px solid #293346;border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:10px;flex:0 0 auto}
${Z} .zk-card.archived{opacity:.85;border-style:dashed}
${Z} .zk-cardhead{display:flex;align-items:flex-start;gap:8px}
${Z} .zk-cardhead div{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
${Z} .zk-card small{font-size:12px;color:${ACC};font-weight:700;text-transform:uppercase;letter-spacing:1.3px}
${Z} .zk-card strong{font-size:18px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
${Z} .zk-meta{font-size:13px;color:#95a3b7}
${Z} .zk-star{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #3a4556;background:transparent;color:#95a3b7;font-size:20px;padding:0}
${Z} .zk-star[aria-pressed="true"]{color:#ffd166;border-color:#ffd166}
${Z} .zk-acts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
${Z} .zk-acts button{min-height:44px;border-radius:22px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:13px;font-weight:700;padding:0 6px}
${Z} .zk-acts button.go{background:${ACC};border-color:${ACC};color:#142016;font-weight:800}
${Z} .zk-new{min-height:56px;border-radius:28px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800;flex:0 0 auto}
${Z} .zk-tpl{min-height:50px;border-radius:25px;border:1px solid #405d39;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;flex:0 0 auto}
${Z} .zk-note{font-size:13px;color:#95a3b7;line-height:1.5;margin:0;padding:0 4px}
${Z} .zk-err{font-size:13px;color:#ffb4b8;text-align:center;margin:0}
${Z} .zk-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding-left:4px;margin-top:4px}
${Z} .zk-chips{display:flex;gap:6px;overflow-x:auto;flex:0 0 auto;scrollbar-width:none}
${Z} .zk-chips::-webkit-scrollbar{display:none}
${Z} .zk-chips button{flex:0 0 auto;min-height:40px;border-radius:20px;border:1px solid #293346;background:#171e2a;color:#c3cddb;font:inherit;font-size:13px;font-weight:600;padding:0 13px}
${Z} .zk-chips button[aria-pressed="true"]{background:${ACC};border-color:${ACC};color:#142016;font-weight:800}
${Z} .zk-ex{display:flex;align-items:center;gap:10px;min-height:56px;border-radius:14px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;text-align:left;padding:6px 10px 6px 6px}
${Z} .zk-ex[aria-pressed="true"]{border:2px solid ${ACC};background:#1a2a22}
${Z} .zk-ex img,${Z} .zk-ex i.ph{width:44px;height:44px;flex:0 0 44px;border-radius:10px;object-fit:cover;background:#0f1620}
${Z} .zk-ex span{flex:1;min-width:0;font-size:14px;font-weight:700}
${Z} .zk-ex em{font-style:normal;font-size:12px;font-weight:800;color:${ACC};min-width:22px;text-align:center}
${Z} .zk-sel{display:flex;flex-direction:column;gap:8px;border-radius:14px;background:#0f1620;padding:10px}
${Z} .zk-selhead{display:flex;align-items:center;gap:6px}
${Z} .zk-selhead b{flex:1;min-width:0;font-size:14px;overflow-wrap:anywhere}
${Z} .zk-selhead button{width:40px;height:40px;border-radius:20px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font-size:16px;padding:0}
${Z} .zk-mode{display:grid;grid-template-columns:1fr 1fr;gap:4px;border-radius:20px;background:#171e2a;padding:4px}
${Z} .zk-mode button{min-height:40px;border:0;border-radius:16px;background:transparent;color:#95a3b7;font:inherit;font-size:14px;font-weight:700}
${Z} .zk-mode button[aria-checked="true"]{background:${ACC};color:#142016}
${Z} .zk-step{display:flex;align-items:center;gap:8px}
${Z} .zk-step b{flex:1;text-align:center;font-size:20px;font-weight:800;font-variant-numeric:tabular-nums}
${Z} .zk-step button{width:52px;height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
${Z} .zk-field{height:52px;border-radius:16px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:16px;padding:0 14px;box-sizing:border-box;width:100%}
${Z} .zk-foot{display:flex;flex-direction:column;gap:8px;padding-top:8px}
${Z} .zk-next{height:58px;border-radius:29px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800}
${Z} .zk-next:disabled{opacity:.45}
${Z} button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
/* Player */
.forge-lb-zkrun{position:fixed;inset:0;z-index:2147482200;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
.forge-lb-zkrun .zr-in{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(14px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))}
.forge-lb-zkrun .zr-top{display:flex;align-items:center;gap:10px;min-height:44px}
.forge-lb-zkrun .zr-x{height:40px;border-radius:20px;border:1px solid #3a2c33;background:transparent;color:#c9b3ba;font:inherit;font-size:13px;font-weight:700;padding:0 12px}
.forge-lb-zkrun .zr-pos{flex:1;text-align:right;font-size:14px;color:#c3cddb;font-weight:700;font-variant-numeric:tabular-nums}
.forge-lb-zkrun .zr-bar{height:6px;border-radius:3px;background:#293346;overflow:hidden}
.forge-lb-zkrun .zr-bar i{display:block;height:100%;background:${ACC};width:0;transition:width .3s}
.forge-lb-zkrun .zr-phase{font-size:13px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${ACC};text-align:center}
.forge-lb-zkrun .zr-phase.sw{color:#ffd166}
.forge-lb-zkrun .zr-phase.rr{color:#7cc4ff}
.forge-lb-zkrun h2{margin:0;text-align:center;font-size:clamp(24px,7.5vw,32px);font-weight:800;line-height:1.15;overflow-wrap:anywhere}
.forge-lb-zkrun .zr-img{flex:1;min-height:90px;max-height:34vh;border-radius:20px;background:#0f1620;display:flex;align-items:center;justify-content:center;overflow:hidden}
.forge-lb-zkrun .zr-img img{width:100%;height:100%;object-fit:contain}
.forge-lb-zkrun .zr-big{text-align:center;font-size:clamp(64px,22vw,96px);font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.forge-lb-zkrun .zr-sub{text-align:center;font-size:14px;color:#95a3b7}
.forge-lb-zkrun .zr-next{border-radius:16px;background:#171e2a;border:1px solid #293346;padding:10px 14px;font-size:14px;color:#c3cddb}
.forge-lb-zkrun .zr-next b{color:#f3f7fc}
.forge-lb-zkrun .zr-row{display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:8px}
.forge-lb-zkrun .zr-row button{min-height:56px;border-radius:28px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
.forge-lb-zkrun .zr-row button.main{background:${ACC};border-color:${ACC};color:#142016;font-weight:800;font-size:17px}
.forge-lb-zkrun .zr-done{min-height:62px;border-radius:31px;border:0;background:${ACC};color:#142016;font:inherit;font-size:18px;font-weight:800}
.forge-lb-zkrun .zr-sec{min-height:52px;border-radius:26px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
.forge-lb-zkrun .zr-danger{min-height:52px;border-radius:26px;border:1px solid #6b2f3a;background:transparent;color:#ffb3bd;font:inherit;font-size:15px;font-weight:700}
.forge-lb-zkrun .zr-confirm{position:absolute;inset:0;background:rgba(5,8,13,.8);display:flex;flex-direction:column;justify-content:flex-end}
.forge-lb-zkrun .zr-confirm div{background:#121821;border-radius:26px 26px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box}
.forge-lb-zkrun .zr-confirm strong{font-size:20px}
.forge-lb-zkrun .zr-confirm p{margin:0;color:#c3cddb;font-size:14px;line-height:1.45}
.forge-lb-zkcard{background:#171e2a;border:1px solid #293346;border-radius:22px;padding:14px;margin:12px 0 0;display:flex;flex-direction:column;gap:8px;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-zkcard small{font-size:12px;color:${ACC};font-weight:700;text-transform:uppercase;letter-spacing:1.3px}
.forge-lb-zkcard .zq{display:flex;align-items:center;gap:10px;min-height:52px}
.forge-lb-zkcard .zq span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.forge-lb-zkcard .zq b{font-size:15px}
.forge-lb-zkcard .zq em{font-style:normal;font-size:12px;color:#95a3b7}
.forge-lb-zkcard .zq-empty{margin:0;font-size:13px;line-height:1.4;color:#95a3b7}
.forge-lb-zkcard .zq-all{min-height:44px;border-radius:22px;border:1px solid #3a4a2c;background:transparent;color:#eef7e6;font:inherit;font-size:14px;font-weight:700;margin-top:2px}
.forge-lb-zkcard .zq button{min-height:44px;border-radius:22px;border:0;background:${ACC};color:#142016;font:inherit;font-size:14px;font-weight:800;padding:0 16px}
`;
function ensureCss(){if($('forgeLbCircuitStyle'))return;const st=el('style');st.id='forgeLbCircuitStyle';st.textContent=CSS;document.head.append(st);}

/* ---------- Liste & Editor ---------- */
let root=null,view=null;
function close(){if(root){root.remove();root=null;}view=null;document.removeEventListener('keydown',onKey,true);}
function onKey(e){if(e.key!=='Escape')return;e.preventDefault();if(view&&view.mode==='edit'){if(view.step>0){view.step--;drawEdit();}else openList('active');}else close();}
function frame(kicker,onBack){
 ensureCss();
 if(!root){root=el('div','forge-lb-zk');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Kraft-Zirkel');document.body.append(root);document.addEventListener('keydown',onKey,true);}
 root.replaceChildren();
 const inner=el('div','zk-in');root.append(inner);
 const top=el('div','zk-top');
 const back=btn('zk-round','‹',onBack);back.setAttribute('aria-label','Zurück');
 const x=btn('zk-round','✕',close);x.setAttribute('aria-label','Schließen');
 top.append(back,el('div','zk-kick',kicker),x);inner.append(top);
 return inner;
}
function save1(c){const s=S();s.forgeCircuits=upsert(list(),c);store();}
function openList(tab){
 view={mode:'list',tab:tab==='archive'?'archive':'active'};
 const inner=frame('Zirkel',close);
 const head=el('div','zk-head');head.append(el('h2','','Deine Zirkel'),el('p','','Übungen am Stück: auf Zeit oder mit Wiederholungen, mit kurzer Wechselzeit dazwischen.'));inner.append(head);
 const body=el('div','zk-body');inner.append(body);
 if(listMsg){body.append(el('p','zk-err',listMsg));listMsg='';}
 const all=list();
 const seg=el('div','zk-seg');seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label','Ansicht');
 [['active','Aktiv ('+active(all).length+')'],['archive','Archiv ('+archived(all).length+')']].forEach(([k,t])=>{const b=btn('',t,()=>openList(k));b.setAttribute('role','radio');b.setAttribute('aria-checked',String(view.tab===k));seg.append(b);});
 body.append(seg);
 if(view.tab==='active'){
  body.append(btn('zk-new','+ Neuer Zirkel',()=>openEdit(null)));
  if(!active(all).length)body.append(btn('zk-tpl','Vorlage: Core-Zirkel (4 Übungen · 3 Runden)',()=>openEdit(TEMPLATE(),false,true)));
 }
 const shown=ordered(view.tab==='active'?active(all):archived(all));
 if(!shown.length)body.append(el('p','zk-note',view.tab==='active'?'Noch kein Zirkel. Lege z. B. einen Bauch-Zirkel an – jede Übung 30 Sekunden, 10 Sekunden Wechsel.':'Keine archivierten Zirkel.'));
 shown.forEach(c=>{
  const card=el('div','zk-card'+(c.archived?' archived':''));
  const ch=el('div','zk-cardhead');const cl=el('div');
  cl.append(el('small','','Kraft-Zirkel'),el('strong','',c.name),el('div','zk-meta',meta(c)),el('div','zk-meta',c.items.map(it=>it.name+' '+itemLabel(it)).join(' · ')));
  ch.append(cl);
  if(!c.archived){const st=btn('zk-star',c.pinned?'★':'☆',()=>{const s=S();s.forgeCircuits=setFlag(list(),c.id,'pinned',!c.pinned);store();openList('active');});
   st.setAttribute('aria-pressed',String(!!c.pinned));st.setAttribute('aria-label',(c.pinned?'Favorit entfernen: ':'Als Favorit anheften: ')+c.name);ch.append(st);}
  card.append(ch);
  const acts=el('div','zk-acts');
  if(!c.archived){
   acts.append(btn('go','Starten',()=>start(c.id)),btn('','Bearbeiten',()=>openEdit(c)),
    btn('','Kopieren',()=>{const s=S();s.forgeCircuits=duplicate(list(),c.id,newId());store();openList('active');}),
    btn('','Archiv',()=>{const s=S();s.forgeCircuits=setFlag(list(),c.id,'archived',true);store();openList('active');}));
   acts.lastChild.setAttribute('aria-label','Archivieren: '+c.name);
  }else{
   acts.style.gridTemplateColumns='1fr 1fr';
   acts.append(btn('go','Reaktivieren',()=>{const s=S();s.forgeCircuits=setFlag(list(),c.id,'archived',false);store();openList('archive');}));
  }
  card.append(acts);body.append(card);
 });
 const logs=(S()&&S().forgeCircuitLogs)||[];
 if(view.tab==='active'&&logs.length){const l=logs[logs.length-1];body.append(el('p','zk-note','Zuletzt: '+l.name+' · '+new Date(l.date).toLocaleDateString('de-DE')+' · '+l.completedRounds+'/'+l.rounds+' Runden · '+Math.max(1,Math.round((l.durationMs||0)/60000))+' Min.'));}
}
function openEdit(c,readOnly,fromTemplate){
 const src=c?JSON.parse(JSON.stringify(c)):{id:newId(),name:'',items:[],transition:DEF.transition,rounds:DEF.rounds,roundRest:DEF.roundRest};
 view={mode:'edit',step:0,d:src,chip:'Alle',q:'',err:'',isNew:!c||!!fromTemplate};
 drawEdit();
}
function stepper(value,label,dec,inc,aria){
 const row=el('div','zk-step');const v=el('b','',label);
 const m=btn('','−',dec);m.setAttribute('aria-label',aria+' verringern');
 const p=btn('','+',inc);p.setAttribute('aria-label',aria+' erhöhen');
 row.append(m,v,p);return row;
}
function chipRow(options,cur,fmt,onPick,aria){
 const row=el('div','zk-chips');row.setAttribute('role','group');row.setAttribute('aria-label',aria);
 options.forEach(o=>{const b=btn('',fmt(o),()=>onPick(o));b.setAttribute('aria-pressed',String(cur===o));row.append(b);});
 return row;
}
function drawEdit(){
 const v=view,d=v.d;
 const inner=frame((v.isNew?'Neuer Zirkel':'Zirkel bearbeiten')+' · '+(v.step+1)+'/2',()=>{if(v.step>0){v.step--;v.err='';drawEdit();}else openList('active');});
 const head=el('div','zk-head'),body=el('div','zk-body'),foot=el('div','zk-foot');inner.append(head,body,foot);
 let label='Weiter',can=true;
 if(v.step===0){
  head.append(el('h2','','Übungen'),el('p','',d.items.length+' ausgewählt · jede Übung auf Zeit oder mit Wiederholungen'));
  d.items.forEach((it,i)=>{
   it=d.items[i]=cleanItem(it);
   const box=el('div','zk-sel');
   const h=el('div','zk-selhead');h.append(el('b','',(i+1)+'. '+it.name));
   const up=btn('','↑',()=>{if(i>0){[d.items[i-1],d.items[i]]=[d.items[i],d.items[i-1]];drawEdit();}});up.setAttribute('aria-label',it.name+' nach oben');up.disabled=i===0;
   const dn=btn('','↓',()=>{if(i<d.items.length-1){[d.items[i+1],d.items[i]]=[d.items[i],d.items[i+1]];drawEdit();}});dn.setAttribute('aria-label',it.name+' nach unten');dn.disabled=i===d.items.length-1;
   const rm=btn('','✕',()=>{d.items.splice(i,1);drawEdit();});rm.setAttribute('aria-label',it.name+' entfernen');
   h.append(up,dn,rm);box.append(h);
   const mode=el('div','zk-mode');mode.setAttribute('role','radiogroup');mode.setAttribute('aria-label','Ausführung '+it.name);
   [['time','Auf Zeit'],['reps','Wiederholungen']].forEach(([k,t])=>{const b=btn('',t,()=>{it.mode=k;drawEdit();});b.setAttribute('role','radio');b.setAttribute('aria-checked',String(it.mode===k));mode.append(b);});
   box.append(mode);
   if(it.mode==='time'){
    box.append(chipRow(SECS,it.secs,x=>x+' s',x=>{it.secs=x;drawEdit();},'Dauer '+it.name));
    box.append(stepper(it.secs,it.secs+' Sek.',()=>{it.secs=Math.max(5,it.secs-5);drawEdit();},()=>{it.secs=Math.min(600,it.secs+5);drawEdit();},'Dauer '+it.name));
   }else box.append(stepper(it.reps,it.reps+' Wdh.',()=>{it.reps=Math.max(1,it.reps-1);drawEdit();},()=>{it.reps=Math.min(200,it.reps+1);drawEdit();},'Wiederholungen '+it.name));
   body.append(box);
  });
  body.append(el('div','zk-label','Aus dem Kraftkatalog'));
  const q=el('input','zk-field');q.type='search';q.placeholder='Übung suchen';q.value=v.q;q.setAttribute('aria-label','Übung suchen');
  body.append(q);
  const groups=['Alle','Rumpf','Ganzkörper','Beine','Brust','Rücken','Schultern','Arme'];
  body.append(chipRow(groups,v.chip,x=>x,x=>{v.chip=x;drawEdit();},'Muskelgruppe'));
  const box=el('div');box.style.display='flex';box.style.flexDirection='column';box.style.gap='6px';body.append(box);
  const fill=()=>{
   const nq=String(v.q||'').toLowerCase();
   const names=catalog().filter(n=>(v.chip==='Alle'||groupOf(n)===v.chip)&&(!nq||n.toLowerCase().includes(nq))).slice(0,60);
   box.replaceChildren(...names.map(n=>{
    const idx=d.items.findIndex(it=>it.name===n);
    const b=btn('zk-ex','',()=>{if(idx>=0)d.items.splice(idx,1);else if(d.items.length<MAX_ITEMS)d.items.push(cleanItem({name:n,mode:'time',secs:30,reps:15}));drawEdit();});
    b.setAttribute('aria-pressed',String(idx>=0));
    const src=thumb(n);if(src){const im=el('img');im.src=src;im.alt='';im.loading='lazy';b.append(im);}else b.append(el('i','ph'));
    b.append(el('span','',n),el('em','',idx>=0?String(idx+1):'+'));return b;}));
   if(!names.length)box.append(el('p','zk-note','Keine Übung gefunden.'));
  };
  q.addEventListener('input',()=>{v.q=q.value;fill();});fill();
  can=d.items.length>0;
 }else{
  head.append(el('h2','','Name, Runden und Wechsel'),el('p','',meta({...d,items:d.items.map(cleanItem),transition:d.transition,rounds:d.rounds,roundRest:d.roundRest})));
  body.append(el('div','zk-label','Name'));
  const inp=el('input','zk-field');inp.value=d.name;inp.maxLength=60;inp.placeholder='z. B. Bauch 10 Min.';inp.setAttribute('aria-label','Name des Zirkels');
  inp.addEventListener('input',()=>{d.name=inp.value;nb.disabled=!d.name.trim();});body.append(inp);
  body.append(el('div','zk-label','Runden'));
  body.append(stepper(d.rounds,d.rounds+' '+(d.rounds===1?'Runde':'Runden'),()=>{d.rounds=Math.max(1,d.rounds-1);drawEdit();},()=>{d.rounds=Math.min(10,d.rounds+1);drawEdit();},'Runden'));
  body.append(el('div','zk-label','Wechselzeit zwischen den Übungen'));
  body.append(chipRow(TRANSITIONS,d.transition,x=>x?x+' s':'keine',x=>{d.transition=x;drawEdit();},'Wechselzeit'));
  body.append(el('div','zk-label','Pause zwischen den Runden'));
  body.append(chipRow(ROUND_RESTS,d.roundRest,x=>x?x+' s':'keine',x=>{d.roundRest=x;drawEdit();},'Rundenpause'));
  body.append(el('p','zk-note','Übungen auf Zeit wechseln automatisch, bei Wiederholungen tippst du „Fertig“. Deine Kraftpläne bleiben unverändert.'));
  label='Zirkel speichern';can=!!String(d.name||'').trim();
 }
 if(v.err)foot.append(el('p','zk-err',v.err));
 const nb=btn('zk-next',label,()=>{
  if(v.step===0){v.step=1;v.err='';drawEdit();return;}
  const err=validate(d);if(err){v.err=err;drawEdit();return;}
  save1(d);openList('active');
 });
 nb.disabled=!can;foot.append(nb);
}

/* ---------- Player ---------- */
let pr=null,timer=null,wake=null;
const run=()=>{const s=S();return s&&s.forgeCircuitRun||null;};
function setRun(r){const s=S();if(!s)return;s.forgeCircuitRun=r;store();}
function phaseStart(r,idx,running){
 const p=r.phases[idx];r.idx=idx;
 if(!p){r.done=true;r.running=false;r.endsAt=0;r.left=0;return r;}
 r.left=p.secs||0;r.running=!!running;
 r.endsAt=p.secs>0&&running?Date.now()+p.secs*1000:0;
 return r;
}
let listMsg='';
function start(id){
 const c=list().find(x=>x&&String(x.id)===String(id));if(!c)return;
 const s=S();
 if(s&&s.activeWorkout){listMsg='Bitte beende oder verwirf zuerst das laufende Krafttraining.';openList('active');return;}
 close();
 const ph=phases(c);if(!ph.length)return;
 const r={id:c.id,name:c.name,rounds:c.rounds,itemsCount:c.items.length,phases:ph,idx:0,running:true,endsAt:0,left:0,startedAt:Date.now(),pausedAt:0,pausedMs:0,done:false};
 phaseStart(r,0,true);setRun(r);openRun();
}
function advance(to){
 const r=run();if(!r)return;
 const target=typeof to==='number'?to:r.idx+1;
 if(target>=r.phases.length){r.done=true;r.running=false;r.endsAt=0;r.idx=r.phases.length;setRun(r);drawRun();return;}
 const keepPaused=!r.running;
 phaseStart(r,Math.max(0,target),!keepPaused);
 setRun(r);drawRun();
 try{navigator.vibrate?.(r.phases[r.idx]&&r.phases[r.idx].type==='work'?[120]:[60]);}catch(e){}
}
function back(){
 const r=run();if(!r)return;
 let i=r.idx-1;while(i>0&&r.phases[i].type!=='work')i--;
 advance(Math.max(0,i));
}
function togglePause(){
 const r=run();if(!r||r.done)return;const p=r.phases[r.idx];
 if(r.running){if(p&&p.secs>0){r.left=remaining(r);r.endsAt=0;}r.running=false;r.pausedAt=Date.now();}
 else{if(p&&p.secs>0)r.endsAt=Date.now()+Math.max(1,r.left)*1000;r.pausedMs=(r.pausedMs||0)+(r.pausedAt?Date.now()-r.pausedAt:0);r.pausedAt=0;r.running=true;}
 setRun(r);drawRun();
}
function confirmBox(title,text,yes,yesLabel,noLabel){
 const box=el('div','zr-confirm');const d=el('div');
 d.append(el('strong','',title),el('p','',text));
 const keep=btn('zr-done',noLabel,()=>box.remove());const drop=btn('zr-danger',yesLabel,()=>{box.remove();yes();});
 d.append(keep,drop);box.append(d);pr.append(box);keep.focus({preventScroll:true});
}
function abort(){
 confirmBox('Zirkel abbrechen?','Dieser Durchgang wird nicht gespeichert.',()=>{setRun(null);closeRun();},'Zirkel verwerfen','Weitermachen');
}
function finishSave(){
 const r=run();const s=S();if(!r||!s)return;
 const net=Math.max(0,Date.now()-r.startedAt-(r.pausedMs||0));
 const works=r.phases.filter((p,i)=>p.type==='work'&&i<Math.min(r.idx,r.phases.length));
 const completedRounds=r.done?r.rounds:Math.max(0,(r.phases[r.idx]||{round:0}).round);
 s.forgeCircuitLogs=Array.isArray(s.forgeCircuitLogs)?s.forgeCircuitLogs:[];
 s.forgeCircuitLogs.push({id:'zl'+Date.now().toString(36),circuitId:r.id,name:r.name,date:new Date().toISOString(),durationMs:net,rounds:r.rounds,completedRounds,
  exercises:works.map(p=>({name:p.name,mode:p.mode,secs:p.secs,reps:p.reps,round:p.round}))});
 if(s.forgeCircuitLogs.length>200)s.forgeCircuitLogs=s.forgeCircuitLogs.slice(-200);
 s.forgeCircuitRun=null;store();closeRun();
 try{window.dispatchEvent(new CustomEvent('forge:circuit-logged'));}catch(e){}
}
function closeRun(){
 if(timer){clearInterval(timer);timer=null;}
 if(pr){pr.remove();pr=null;}document.body.classList.remove('forge-lb-zkrun-open');
 try{wake?.release?.();}catch(e){}wake=null;
}
function openRun(){
 ensureCss();
 if(!pr){pr=el('div','forge-lb-zkrun');pr.setAttribute('role','dialog');pr.setAttribute('aria-modal','true');pr.setAttribute('aria-label','Kraft-Zirkel läuft');document.body.append(pr);document.body.classList.add('forge-lb-zkrun-open');
  try{navigator.wakeLock?.request('screen').then(w=>{wake=w;}).catch(()=>{});}catch(e){}}
 drawRun();
 if(!timer)timer=setInterval(tickRun,250);
}
function drawRun(){
 const r=run();if(!pr)return;if(!r){closeRun();return;}
 pr.replaceChildren();const inner=el('div','zr-in');pr.append(inner);
 const top=el('div','zr-top');
 const x=btn('zr-x','✕ Abbrechen',abort);x.setAttribute('aria-label','Zirkel abbrechen');
 if(r.done){
  top.append(el('div','zr-pos',r.name));inner.append(top);
  inner.append(el('div','zr-phase','Geschafft'),el('h2','',r.name));
  const net=Math.max(0,Date.now()-r.startedAt-(r.pausedMs||0));
  inner.append(el('div','zr-sub',r.rounds+' '+(r.rounds===1?'Runde':'Runden')+' · '+r.itemsCount+' Übungen · '+clock(net/1000)+' Min.'));
  inner.append(el('div','zr-img'));
  inner.append(btn('zr-done','Speichern',finishSave));
  const drop=btn('zr-sec','Nicht speichern',()=>confirmBox('Nicht speichern?','Der Zirkel wird nicht protokolliert.',()=>{setRun(null);closeRun();},'Verwerfen','Zurück'));
  inner.append(drop);return;
 }
 const p=r.phases[r.idx];const works=r.phases.filter(q=>q.type==='work');
 const workNo=r.phases.slice(0,r.idx+1).filter(q=>q.type==='work').length;
 const pos=el('div','zr-pos','Runde '+(p.round+1)+'/'+r.rounds+' · Übung '+(p.type==='work'?p.index+1:Math.min(p.index+1,r.itemsCount))+'/'+r.itemsCount);
 top.append(x,pos);inner.append(top);
 const bar=el('div','zr-bar');const bi=el('i');bi.style.width=Math.round(workNo/Math.max(1,works.length)*100)+'%';bar.append(bi);inner.append(bar);
 const nxt=p.type==='work'?nextWork(r.phases,r.idx):p;
 if(p.type==='work'){
  inner.append(el('div','zr-phase',p.mode==='time'?'Arbeit · '+p.secs+' s':'Wiederholungen'),el('h2','',p.name));
 }else{
  inner.append(el('div','zr-phase '+(p.type==='switch'?'sw':'rr'),p.type==='switch'?'Wechsel · '+p.secs+' s':'Rundenpause'),el('h2','','Gleich: '+p.name));
 }
 const im=el('div','zr-img');const src=thumb(p.name);if(src){const i=el('img');i.src=src;i.alt=p.name;im.append(i);}inner.append(im);
 const big=el('div','zr-big');big.id='forgeZkBig';
 big.textContent=p.type==='work'&&p.mode==='reps'?String(p.reps):clock(remaining(r));
 inner.append(big);
 inner.append(el('div','zr-sub',p.type==='work'&&p.mode==='reps'?'Wiederholungen · weiter mit „Fertig“':(r.running?'läuft':'pausiert')));
 if(nxt&&p.type==='work'){const n=el('div','zr-next');n.append(document.createTextNode('Als Nächstes: '),el('b','',nxt.name+' · '+(nxt.mode==='reps'?nxt.reps+' Wdh.':nxt.secs+' s')));inner.append(n);}
 else if(!nxt&&p.type==='work'){inner.append(el('div','zr-next','Letzte Übung'));}
 if(p.type==='work'&&p.mode==='reps'){
  const done=btn('zr-done','Fertig',()=>advance());done.setAttribute('aria-label','Übung fertig, weiter');inner.append(done);
 }
 const row=el('div','zr-row');
 const b1=btn('','Zurück',back);b1.disabled=r.idx===0;
 const b2=btn('main',r.running?'Pause':'Weiter',togglePause);b2.setAttribute('aria-label',r.running?'Zirkel pausieren':'Zirkel fortsetzen');
 const b3=btn('','Überspringen',()=>advance());
 row.append(b1,b2,b3);inner.append(row);
}
function tickRun(){
 const r=run();if(!r){closeRun();return;}if(!pr||r.done)return;
 const p=r.phases[r.idx];if(!p)return;
 if(r.running&&p.secs>0){
  const left=remaining(r);
  if(left<=0){advance();return;}
  const b=$('forgeZkBig');if(b)b.textContent=clock(left);
 }
}
/* Rückkehr aus dem Hintergrund: höchstens eine Phase weiter, dann pausiert (kein Sprung über mehrere Übungen). */
function onVisible(){
 const r=run();if(!r||r.done)return;const p=r.phases[r.idx];
 if(r.running&&p&&p.secs>0&&Date.now()>(r.endsAt||0)+1500){
  phaseStart(r,r.idx+1,true);
  const q=r.phases[r.idx];if(q&&q.secs>0){r.running=false;r.left=q.secs;r.endsAt=0;r.pausedAt=Date.now();}
  setRun(r);
 }
 if(!pr)openRun();else drawRun();
}

/* ---------- Einstiege ---------- */
function planEntry(){
 const rows=document.querySelector('#plan .forge-lb-plan .forge-lb-rows');
 if(!rows||rows.querySelector('.forge-lb-circuits'))return;
 const b=el('button','forge-lb-row forge-lb-circuits');b.type='button';
 b.innerHTML='<span>Zirkel · Kraft & Bauch am Stück</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
 b.addEventListener('click',()=>openList('active'));
 const after=rows.querySelector('.forge-lb-routines')||rows.querySelector('.forge-lb-mobplan');if(after)after.after(b);else rows.prepend(b);
}
/* Workout (Kraft, ohne laufendes Training): eigene Zirkel mit Schnellstart – Favoriten zuerst.
   Am Ruhetag an der Stelle der früheren „Lust auf etwas Leichtes?“-Auswahl (.td-zkslot). */
const ZQ_MAX=4;
function quickCard(){
 const s=S();const old=document.querySelector('#workout .forge-lb-zkcard');
 const host=document.querySelector('#workout .forge-lb-today, #workout .forge-lb-wtoday');
 const slot=host&&host.querySelector('.td-zkslot');
 const all=active(list());const fav=ordered(all.filter(c=>c.pinned));const rest=ordered(all.filter(c=>!c.pinned));
 if(!host||(s&&s.activeWorkout)||(!all.length&&!slot)){if(old)old.remove();return;}
 const key=fav.concat(rest).map(c=>c.id+':'+c.updatedAt+':'+!!c.pinned).join('|')+'#'+(slot?'slot':'end');
 if(old&&old.dataset.key===key&&host.contains(old))return;
 ensureCss();
 const c=el('section','forge-lb-zkcard');c.dataset.key=key;c.append(el('small','','Deine Zirkel'));
 const row=z=>{const r=el('div','zq');const t=el('span');t.append(el('b','',(z.pinned?'★ ':'')+z.name),el('em','',meta(z)));r.append(t,btn('','Starten',()=>start(z.id)));return r;};
 fav.concat(rest).slice(0,ZQ_MAX).forEach(z=>c.append(row(z)));
 if(!all.length)c.append(el('p','zq-empty','Kurze Zirkel für zu Hause oder unterwegs – mit Timer, Runden und Pausen.'));
 c.append(btn('zq-all',!all.length?'Zirkel erstellen':all.length>ZQ_MAX?'Alle '+all.length+' Zirkel anzeigen':'Zirkel verwalten',()=>{if(!all.length)openEdit(null);else openList('active');}));
 if(old)old.remove();if(slot)slot.append(c);else host.append(c);
}
window.ForgeCircuits=Object.freeze({open:openList,start,edit:id=>{const c=list().find(x=>x&&String(x.id)===String(id));if(c)openEdit(c);}});
function tick(){if(!enabled())return;planEntry();quickCard();const r=run();if(r&&!pr)openRun();}
function install(){
 if(!document.body||!enabled())return false;
 tick();setInterval(()=>{if(document.visibilityState!=='hidden')tick();},900);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')onVisible();});
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
