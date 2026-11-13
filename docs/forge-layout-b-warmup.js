/* FORGE Layout B · Allgemeines Warm-up vor dem Krafttraining (13.11.2026, Issue #66).
 * Nach dem Trainingsstart – vor der ersten Kraftübung – optional 5/10/15/20 Min.
 * oder frei: Laufband/Gehen/Joggen, Fahrrad/Ergometer, Rudern, Crosstrainer,
 * dynamische Mobilisation, Sonstiges. Countdown mit Pause/Fertig/Überspringen.
 * „Überspringen“ ist vor UND während des Timers sichtbar und führt sofort
 * (ohne Rückfrage) zur ersten Übung; übersprungen = nicht erledigt, 0 Minuten.
 * Daten: workoutDraft.warmup.general (vorhandenes Modell, landet beim Speichern
 * in workouts[].warmup) – getrennt von Arbeitssätzen und Kraftstatistik.
 * Laufender Timer überlebt einen Neustart (state.forgeLbWarmup).
 */
(function(){
'use strict';
const TYPES=Object.freeze([
 ['treadmill','Laufband / Gehen / Joggen'],['bike','Fahrrad / Ergometer'],['rower','Rudern'],
 ['crosstrainer','Crosstrainer'],['dynamic','Dynamische Mobilisation'],['other','Sonstiges']]);
const MINUTES=Object.freeze([5,10,15,20]);

/* ---------- pure helpers (tested) ---------- */
function typeLabel(t){const x=TYPES.find(y=>y[0]===t);return x?x[1]:'Allgemeines Aufwärmen';}
/* Should the warm-up screen be offered for this draft? Only before anything was logged. */
function shouldOffer(draft){
 if(!draft||typeof draft!=='object')return false;
 const g=draft.warmup&&draft.warmup.general;
 if(g&&(g.decided||g.done||g.skipped))return false;
 const ex=Array.isArray(draft.exercises)?draft.exercises:[];
 if(ex.some(e=>Array.isArray(e&&e.sets)&&e.sets.some(s=>s&&s.done)))return false;
 const w=draft.warmup&&draft.warmup.exercises||{};
 if(Object.values(w).some(x=>x&&Array.isArray(x.sets)&&x.sets.some(s=>s&&s.done)))return false;
 return true;
}
function clampMinutes(m){m=Math.round(Number(m)||0);return Math.max(1,Math.min(90,m));}
/* Record for workoutDraft.warmup.general after finishing (seconds actually done). */
function finished(type,plannedMin,seconds){
 const sec=Math.max(0,Math.round(Number(seconds)||0));
 return {type,minutes:Math.max(1,Math.round(sec/60)),plannedMinutes:clampMinutes(plannedMin),seconds:sec,done:true,skipped:false,decided:true,source:'general-warmup'};
}
function skipped(){return {type:'none',minutes:0,seconds:0,done:false,skipped:true,decided:true,source:'general-warmup'};}
function remaining(t,now){
 if(!t)return 0;
 if(t.running&&t.endsAt)return Math.max(0,(t.endsAt-(now||Date.now()))/1000);
 return Math.max(0,Number(t.left)||0);
}
window.ForgeLayoutBWarmup=Object.freeze({TYPES,MINUTES,typeLabel,shouldOffer,clampMinutes,finished,skipped,remaining});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
const $=id=>document.getElementById(id);
const ACC='#a9f267';
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
const S=()=>typeof state!=='undefined'?state:null;
function store(){try{if(typeof save==='function')save();}catch(e){console.error('FORGE Warm-up speichern',e);}}
function live(){const s=S();return s&&s.activeWorkout&&s.workoutDraft?s:null;}
function pref(){const s=S();const p=s&&s.forgeWarmupPref||{};return {type:TYPES.some(t=>t[0]===p.type)?p.type:'treadmill',minutes:clampMinutes(p.minutes||10)};}
// History labels for the new types (existing FORGE140 map shows done warm-ups in the log).
try{if(typeof FORGE140_WARMUP_TYPES!=='undefined')TYPES.forEach(([k,t])=>{FORGE140_WARMUP_TYPES[k]=t;});}catch(e){}

const CSS=`
.forge-lb-wu{position:fixed;inset:0;z-index:2147481500;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
.forge-lb-wu .wu-in{flex:1;min-height:0;display:flex;flex-direction:column;gap:14px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));overflow-y:auto}
.forge-lb-wu .wu-top{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px}
.forge-lb-wu .wu-kick{font-size:12px;color:${ACC};font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
.forge-lb-wu h2{margin:2px 0 0;font-size:clamp(24px,7vw,30px);font-weight:800;line-height:1.15}
.forge-lb-wu p{margin:0;font-size:14px;color:#c3cddb;line-height:1.45}
.forge-lb-wu .wu-skip{min-height:44px;border-radius:22px;border:2px solid ${ACC};background:transparent;color:${ACC};font:inherit;font-size:15px;font-weight:800;padding:0 18px;white-space:nowrap}
.forge-lb-wu .wu-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;margin:4px 0 -4px 4px}
.forge-lb-wu .wu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.forge-lb-wu .wu-grid.c5{grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.forge-lb-wu .wu-grid.c5 .wu-opt{font-size:13px;padding:6px 4px;white-space:nowrap}
.forge-lb-wu .wu-opt{min-height:52px;border-radius:16px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:14px;font-weight:600;padding:8px 10px;line-height:1.2}
.forge-lb-wu .wu-opt[aria-pressed="true"]{border:2px solid ${ACC};background:#1a2a22;font-weight:800}
.forge-lb-wu .wu-free{display:flex;align-items:center;gap:8px;min-height:52px;border-radius:16px;border:1px solid #293346;background:#171e2a;padding:0 12px}
.forge-lb-wu .wu-free input{width:64px;height:40px;border-radius:10px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:17px;font-weight:700;text-align:center}
.forge-lb-wu .wu-go{height:60px;border-radius:30px;border:0;background:${ACC};color:#142016;font:inherit;font-size:18px;font-weight:800;margin-top:auto}
.forge-lb-wu .wu-ring{align-self:center;position:relative;width:min(64vw,260px);aspect-ratio:1}
.forge-lb-wu .wu-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.forge-lb-wu .wu-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(44px,14vw,60px);font-weight:800;font-variant-numeric:tabular-nums}
.forge-lb-wu .wu-state{text-align:center;font-size:15px;color:#c3cddb}
.forge-lb-wu .wu-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.forge-lb-wu .wu-sec{height:56px;border-radius:28px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:16px;font-weight:700}
`;
function ensureCss(){if($('forgeLbWarmupStyle'))return;const st=el('style');st.id='forgeLbWarmupStyle';st.textContent=CSS;document.head.append(st);}

let root=null,timer=null,sel=null,wake=null;
function general(){const s=live();if(!s)return null;const d=s.workoutDraft;if(!d.warmup||typeof d.warmup!=='object')d.warmup={general:{type:'none',minutes:5,done:false},exercises:{}};if(!d.warmup.exercises)d.warmup.exercises={};return d.warmup;}
function close(){if(timer){clearInterval(timer);timer=null;}try{wake?.release?.();}catch(e){}wake=null;if(root){root.remove();root=null;}document.body.classList.remove('forge-lb-wu-open');}
function toWorkout(){close();try{if(typeof window.renderWorkout==='function')window.renderWorkout();else if(typeof window.render==='function')window.render();}catch(e){}}
function skip(){
 const s=S();const w=general();if(w)w.general=skipped();if(s)s.forgeLbWarmup=null;store();toWorkout();
}
function finish(){
 const s=S();const t=s&&s.forgeLbWarmup;const w=general();
 if(t&&w){const done=Math.max(0,t.minutes*60-remaining(t));w.general=finished(t.type,t.minutes,done);}
 if(s){s.forgeLbWarmup=null;s.forgeWarmupPref={type:t?t.type:pref().type,minutes:t?t.minutes:pref().minutes};}
 store();toWorkout();
}
function start(){
 const s=S();if(!s||!sel)return;
 const minutes=clampMinutes(sel.minutes);
 s.forgeLbWarmup={type:sel.type,minutes,running:true,startedAt:Date.now(),endsAt:Date.now()+minutes*60000,left:minutes*60};
 s.forgeWarmupPref={type:sel.type,minutes};store();render();
}
function toggle(){
 const s=S();const t=s&&s.forgeLbWarmup;if(!t)return;
 if(t.running){t.left=remaining(t);t.running=false;t.endsAt=0;}else{t.running=true;t.endsAt=Date.now()+Math.max(1,t.left)*1000;}
 store();render();
}
function clock(sec){sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
const CIRC=2*Math.PI*44;
function render(){
 if(!root)return;
 const s=S();const t=s&&s.forgeLbWarmup;
 root.replaceChildren();
 const inner=el('div','wu-in');root.append(inner);
 const top=el('div','wu-top');const h=el('div');
 h.append(el('div','wu-kick',t?typeLabel(t.type):'Vor dem Krafttraining'),el('h2','',t?'Warm-up läuft':'Allgemeines Warm-up'));
 const sk=btn('wu-skip','Überspringen',skip);sk.setAttribute('aria-label','Warm-up überspringen und direkt zur ersten Übung');
 top.append(h,sk);inner.append(top);
 if(!t){
  if(!sel)sel=pref();
  inner.append(el('p','','Optional: z. B. 10 Minuten locker auf dem Laufband. Danach geht es mit den Aufwärmsätzen der ersten Übung weiter.'));
  inner.append(el('div','wu-label','Womit?'));
  const g=el('div','wu-grid');
  TYPES.forEach(([k,txt])=>{const b=btn('wu-opt',txt,()=>{sel.type=k;render();});b.setAttribute('aria-pressed',String(sel.type===k));g.append(b);});
  inner.append(g);
  inner.append(el('div','wu-label','Wie lange?'));
  const m=el('div','wu-grid c5');
  MINUTES.forEach(n=>{const b=btn('wu-opt',n+' Min.',()=>{sel.minutes=n;render();});b.setAttribute('aria-pressed',String(sel.minutes===n));m.append(b);});
  const free=MINUTES.includes(sel.minutes)?null:sel.minutes;
  const fb=btn('wu-opt',free?free+' Min.':'Frei',()=>{sel.freeOpen=true;render();});fb.setAttribute('aria-pressed',String(!!free));m.append(fb);
  inner.append(m);
  if(sel.freeOpen||free){
   const f=el('label','wu-free');const inp=el('input');inp.type='number';inp.inputMode='numeric';inp.min='1';inp.max='90';inp.value=String(sel.minutes);inp.setAttribute('aria-label','Minuten frei wählen');
   inp.addEventListener('change',()=>{sel.minutes=clampMinutes(inp.value);sel.freeOpen=true;render();});
   f.append(el('span','','Minuten:'),inp);inner.append(f);
  }
  const go=btn('wu-go','Warm-up starten · '+clampMinutes(sel.minutes)+' Min.',start);inner.append(go);
  return;
 }
 const left=remaining(t);
 const ring=el('div','wu-ring');
 ring.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#293346" stroke-width="7"/><circle class="arc" cx="50" cy="50" r="44" fill="none" stroke="'+ACC+'" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+CIRC+'" stroke-dashoffset="'+(CIRC*(1-(1-left/(t.minutes*60))))+'"/></svg>';
 ring.append(el('b','',clock(left)));inner.append(ring);
 inner.append(el('div','wu-state',t.running?t.minutes+' Min. geplant · danach weiter mit der ersten Übung':'Pausiert'));
 const row=el('div','wu-row');
 row.append(btn('wu-sec',t.running?'Pause':'Weiter',toggle),btn('wu-sec','Fertig',finish));
 inner.append(row);
 if(!timer)timer=setInterval(tick,250);
}
function tick(){
 const s=S();const t=s&&s.forgeLbWarmup;if(!t||!root)return;
 const left=remaining(t);
 if(t.running&&left<=0){try{navigator.vibrate?.([220,90,220]);}catch(e){}finish();return;}
 const b=root.querySelector('.wu-ring b');if(b)b.textContent=clock(left);
 const arc=root.querySelector('.wu-ring .arc');if(arc)arc.setAttribute('stroke-dashoffset',String(CIRC*(left/(t.minutes*60))));
}
function open(){
 if(root)return;ensureCss();
 root=el('div','forge-lb-wu');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Allgemeines Warm-up');
 document.body.append(root);document.body.classList.add('forge-lb-wu-open');
 try{navigator.wakeLock?.request('screen').then(w=>{wake=w;}).catch(()=>{});}catch(e){}
 sel=null;render();
}
function check(){
 if(!enabled())return;
 const s=live();
 if(!s){if(root)close();return;}
 const pageVisible=$('workout')&&$('workout').classList.contains('active');
 if(s.forgeLbWarmup){if(!root&&pageVisible)open();return;}
 if(!root&&pageVisible&&shouldOffer(s.workoutDraft))open();
}
function install(){
 if(!document.body||!enabled())return false;
 check();setInterval(()=>{if(document.visibilityState!=='hidden')check();},500);
 window.ForgeLayoutBWarmupOpen=open;
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
