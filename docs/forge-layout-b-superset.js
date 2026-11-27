/* FORGE Layout B · Supersatz (#118).
 * Zwei reguläre Kraftübungen eines Trainings werden gekoppelt: Satz A fertig →
 * sofort Satz B (keine Pause), erst nach B die normale Satzpause. Nach der
 * letzten B-Runde geht es ohne Pause zur nächsten Übung.
 *
 * Speicherorte
 *  - Nur dieses Training (Standard): state.activeWorkout.supersets = [[a,b],…]
 *    (Indizes der Plan-Übungen, a = A, b = B). Gilt nur für die laufende Einheit.
 *  - Dauerhaft im Plan (optional): Feld `superset` (Kennung) und `supersetRole`
 *    ('A'|'B') an beiden Plan-Übungen. Andere Plan-Daten bleiben unverändert.
 * Sätze, Gewichte und Verlauf bleiben je Übung getrennt – es wird nur die
 * Reihenfolge der Satzfolge und der Pausenstart gesteuert.
 */
(function(){
'use strict';
function isCircuit(name){return /^Zirkel:/.test(String(name||''));}
function exOf(p){return p&&Array.isArray(p.ex)?p.ex:[];}
/* Paare aus dem Plan (dauerhaft gespeichert). */
function planPairs(p){
 const groups=new Map();
 exOf(p).forEach((e,i)=>{const id=e&&typeof e.superset==='string'&&e.superset?e.superset:'';if(!id)return;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);});
 const out=[];
 groups.forEach(list=>{
  if(list.length!==2)return;
  const ex=exOf(p);let [a,b]=list;
  if(ex[a].supersetRole==='B'&&ex[b].supersetRole!=='B')[a,b]=[b,a];
  out.push([a,b]);
 });
 return out;
}
/* Gültige Paare: zwei verschiedene, vorhandene Übungen, keine Zirkel, jede Übung höchstens einmal. */
function clean(pairs,p,names){
 const n=exOf(p).length,used=new Set(),out=[];
 (Array.isArray(pairs)?pairs:[]).forEach(x=>{
  if(!Array.isArray(x)||x.length!==2)return;
  const a=Number(x[0]),b=Number(x[1]);
  if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||a<0||b<0||a>=n||b>=n)return;
  if(used.has(a)||used.has(b))return;
  const nm=k=>(names&&names[k])||exOf(p)[k].name;
  if(isCircuit(nm(a))||isCircuit(nm(b)))return;
  used.add(a);used.add(b);out.push([a,b]);
 });
 return out;
}
/* Wirksame Paare: eigene Wahl dieser Einheit hat Vorrang, sonst der Plan. */
function pairsFor(p,active,draft){
 const names=draft&&Array.isArray(draft.exercises)?draft.exercises.map(e=>e&&e.name):null;
 const own=active&&Array.isArray(active.supersets)&&String(active.planId)===String(p&&p.id)?active.supersets:null;
 return clean(own||planPairs(p),p,names);
}
function roleOf(pairs,i){
 for(const [a,b] of pairs){if(a===i)return {a,b,role:'A'};if(b===i)return {a,b,role:'B'};}
 return null;
}
function setCount(p,draft,i){const d=draft&&draft.exercises&&draft.exercises[i];const n=Number(exOf(p)[i]&&exOf(p)[i].sets)||0;return Math.max(n,d&&Array.isArray(d.sets)?d.sets.length:0);}
function isDone(draft,i,j){return !!(draft&&draft.exercises&&draft.exercises[i]&&draft.exercises[i].sets&&draft.exercises[i].sets[j]&&draft.exercises[i].sets[j].done);}
function pendingSets(p,draft,i){const out=[];for(let j=0;j<setCount(p,draft,i);j++)if(!isDone(draft,i,j))out.push(j);return out;}
function pick(list){return list[0];} // immer der erste offene Satz – keine Lücken, nichts doppelt
/* Was passiert nach dem abgeschlossenen Arbeitssatz (i,j)?
 *  toB      → direkt zum B-Satz, keine Pause
 *  restToA  → gemeinsame Pause, danach nächster A-Satz
 *  endPair  → Supersatz fertig: ohne Pause zur nächsten Übung
 *  null     → normale FORGE-Logik (z. B. übrige Einzelsätze bei ungleicher Satzzahl) */
function nextAfter(pairs,p,draft,i,j){
 const r=roleOf(pairs,i);if(!r)return null;
 const pa=pendingSets(p,draft,r.a),pb=pendingSets(p,draft,r.b);
 if(r.role==='A'){
  if(!pb.length)return null;
  return {action:'toB',focus:{i:r.b,j:pick(pb,j)}};
 }
 if(pa.length)return {action:'restToA',focus:{i:r.a,j:pick(pa,j+1)}};
 if(pb.length)return null;
 return {action:'endPair'};
}
/* Hinweis bei unterschiedlicher Satzzahl – keine stillen Änderungen. */
function countHint(p,a,b){
 const sa=Number(exOf(p)[a]&&exOf(p)[a].sets)||0,sb=Number(exOf(p)[b]&&exOf(p)[b].sets)||0;
 if(!sa||!sb||sa===sb)return '';
 const more=sa>sb?'A':'B',diff=Math.abs(sa-sb);
 return 'A hat '+sa+', B hat '+sb+' Sätze. '+(diff===1?'Der übrige Satz':'Die übrigen '+diff+' Sätze')+' von '+more+' '+(diff===1?'läuft':'laufen')+' danach einzeln.';
}
function sharedRest(R,p,draft,a,b){const v=[R.restFor(p,a,draft),R.restFor(p,b,draft)].filter(x=>x);return v.length?Math.max(...v):null;}
function add(pairs,a,b){return pairs.filter(x=>x[0]!==a&&x[1]!==a&&x[0]!==b&&x[1]!==b).concat([[a,b]]);}
function remove(pairs,i){return pairs.filter(x=>x[0]!==i&&x[1]!==i);}
function swap(pairs,i){return pairs.map(x=>x[0]===i||x[1]===i?[x[1],x[0]]:x);}
function newId(now){return 'ss-'+Number(now||Date.now()).toString(36)+Math.floor(Math.random()*1296).toString(36);}
/* Plan dauerhaft ändern: nur die beiden Felder an den beteiligten Übungen. */
function applyToPlan(p,pairs){
 exOf(p).forEach(e=>{if(e&&e.superset){delete e.superset;delete e.supersetRole;}});
 pairs.forEach(([a,b])=>{const id=newId();exOf(p)[a].superset=id;exOf(p)[a].supersetRole='A';exOf(p)[b].superset=id;exOf(p)[b].supersetRole='B';});
 return p;
}
const api={sharedRest,isCircuit,planPairs,clean,pairsFor,roleOf,pendingSets,nextAfter,countHint,add,remove,swap,applyToPlan};
window.ForgeSuperset=api;
if(typeof document==='undefined')return;

/* ---------- Laufzeit ---------- */
function $(id){return document.getElementById(id);}
function S(){return typeof state!=='undefined'?state:null;}
function livePlan(){
 const s=S();if(!s||!s.activeWorkout)return null;
 return (s.plan||[]).find(x=>String(x.id)===String(s.activeWorkout.planId))||null;
}
function liveDraft(p){const s=S();return s&&s.workoutDraft&&String(s.workoutDraft.planId)===String(p&&p.id)?s.workoutDraft:null;}
function current(){const s=S(),p=livePlan();if(!s||!p)return [];return pairsFor(p,s.activeWorkout,liveDraft(p));}
function nameAt(p,i){const d=liveDraft(p);return (d&&d.exercises&&d.exercises[i]&&d.exercises[i].name)||(exOf(p)[i]&&exOf(p)[i].name)||'Übung';}
function persist(){try{if(typeof save==='function')save();}catch(e){console.error('FORGE Supersatz speichern',e);}}
function refresh(){
 try{if(typeof forge130RenderFocus==='function')forge130RenderFocus();}catch(e){}
 try{if(typeof forge130RenderRest==='function')forge130RenderRest();}catch(e){}
 try{window.ForgeLayoutBWorkoutRender&&window.ForgeLayoutBWorkoutRender();}catch(e){}
}
let wrapped=false;
function wrap(){
 if(wrapped)return true;
 const after=window.forge130AfterSetDone;if(typeof after!=='function')return false;
 const w=function(i,j){
  const s=S(),p=livePlan();
  let plan=null;
  try{if(s&&p&&s.activeWorkout&&!s.activeWorkout.forgePausedAt)plan=nextAfter(current(),p,liveDraft(p),Number(i),Number(j));}catch(e){console.error('FORGE Supersatz',e);plan=null;}
  if(!plan)return after.apply(this,arguments);
  if(plan.action==='toB'){
   // A erledigt → sofort B, ausdrücklich ohne Satzpause.
   s.activeWorkout.focus=plan.focus;s.forgeRest=null;s.activeWorkout.supersetStep={i:plan.focus.i,at:Date.now()};
   persist();refresh();return;
  }
  const r=after.apply(this,arguments);
  try{
   if(plan.action==='restToA'){
    s.activeWorkout.focus=plan.focus;
    // Gemeinsame Pause: eigene Pause von A oder B (die längere), sonst die allgemeine Satzpause.
    const R=window.ForgeLayoutBRest,sec=R?sharedRest(R,p,liveDraft(p),plan.focus.i,Number(i)):null;
    if(sec&&s.forgeRest&&sec!==s.forgeRest.seconds){s.forgeRest.endAt=Date.now()+sec*1000;s.forgeRest.seconds=sec;s.forgeRest.perExercise=true;}
    if(s.forgeRest)s.forgeRest.superset=true;
    persist();refresh();
   }
   else if(plan.action==='endPair'){s.forgeRest=null;persist();refresh();}
  }catch(e){console.error('FORGE Supersatz',e);}
  return r;
 };
 w.__forgeSuperset=true;
 // Kennzeichen anderer Schichten (z. B. Pause pro Übung) bleiben sichtbar.
 Object.keys(after).forEach(k=>{try{w[k]=after[k];}catch(e){}});
 window.forge130AfterSetDone=w;wrapped=true;return true;
}

/* ---------- Bedienung im Live-Training ---------- */
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
let wrapEl=null;
function closeSheet(){if(wrapEl){wrapEl.remove();wrapEl=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSheet();}}
function openSheet(label,fill){
 closeSheet();styles();
 const wr=el('div','forge-lb-sheet-wrap forge-ss-wrap');const sh=el('div','forge-lb-sheet forge-ss-sheet');
 sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label',label);
 sh.append(el('div','forge-lb-handle'));fill(sh);wr.append(sh);
 wr.addEventListener('click',e=>{if(e.target===wr)closeSheet();});
 document.body.append(wr);wrapEl=wr;document.addEventListener('keydown',onKey,true);
 sh.querySelector('button')?.focus({preventScroll:true});
}
function head(sh,kicker,title){
 const h=el('div','forge-lb-sheet-head');const t=el('div');t.append(el('small','',kicker),el('strong','',title));
 const x=btn('forge-lb-x','✕',closeSheet);x.setAttribute('aria-label','Schließen');h.append(t,x);sh.append(h);
}
function setPairs(next,permanent){
 const s=S(),p=livePlan();if(!s||!p)return;
 s.activeWorkout.supersets=next.map(x=>x.slice());
 if(permanent)applyToPlan(p,next);
 persist();refresh();
}
function focusIndex(){const s=S(),p=livePlan();if(!s||!p)return -1;try{const f=typeof forge130CurrentFocus==='function'?forge130CurrentFocus(p):s.activeWorkout.focus;return f?f.i:-1;}catch(e){return -1;}}
function openCreate(i){
 const s=S(),p=livePlan();if(!s||!p||i<0)return;
 const d=liveDraft(p),pairs=current();
 const order=typeof window.forge142Order==='function'?window.forge142Order(p):exOf(p).map((_,k)=>k);
 const own=pendingSets(p,d,i).length;
 openSheet('Supersatz erstellen',sh=>{
  head(sh,'Supersatz · A = '+nameAt(p,i),'Mit welcher Übung koppeln?');
  sh.append(el('p','forge-ss-note','Nach jedem Satz von A geht es direkt zu B. Die Pause kommt erst nach B.'));
  if(!own){sh.append(el('p','forge-ss-warn','Alle Sätze von '+nameAt(p,i)+' sind schon erledigt – ein Supersatz ist hier nicht mehr sinnvoll.'));return;}
  let permanent=false;
  const list=el('div','forge-ss-list');
  const cands=order.filter(k=>k!==i&&!isCircuit(nameAt(p,k)));
  cands.forEach(k=>{
   const open=pendingSets(p,d,k).length,total=setCount(p,d,k);
   const taken=roleOf(pairs,k);
   const b=btn('forge-ss-opt','',()=>{
    if(!open)return;
    setPairs(add(current(),i,k),permanent);closeSheet();
    toast('Supersatz für '+(permanent?'diesen Plan':'dieses Training')+' verbunden · Pause erst nach B');
   });
   b.disabled=!open;
   const t=el('span');t.append(el('b','',nameAt(p,k)),el('small','',open?(open+' von '+total+' Sätzen offen'+(taken?' · ersetzt bisherigen Supersatz':'')):'Alle Sätze erledigt'));
   b.append(t,el('em','',open?'B':'–'));
   const hint=countHint({ex:[{sets:own},{sets:open}]},0,1);if(open&&hint){const hs=el('small','forge-ss-diff',hint);t.append(hs);}
   list.append(b);
  });
  if(!cands.length)list.append(el('p','forge-ss-warn','In diesem Training gibt es keine weitere Kraftübung zum Koppeln.'));
  sh.append(list);
  const perm=el('label','forge-ss-perm');const cb=el('input');cb.type='checkbox';cb.addEventListener('change',()=>{permanent=cb.checked;});
  perm.append(cb,el('span','','Auch dauerhaft im Plan speichern'));sh.append(perm);
  sh.append(el('small','forge-ss-foot','Standard: gilt nur für dieses Training. Der Plan bleibt unverändert.'));
 });
}
function openManage(i){
 const s=S(),p=livePlan();if(!s||!p)return;
 const pairs=current(),r=roleOf(pairs,i);if(!r){openCreate(i);return;}
 const inPlan=planPairs(p).some(x=>(x[0]===r.a&&x[1]===r.b)||(x[0]===r.b&&x[1]===r.a));
 openSheet('Supersatz bearbeiten',sh=>{
  head(sh,'Supersatz','A '+nameAt(p,r.a)+' · B '+nameAt(p,r.b));
  const d=liveDraft(p);
  sh.append(el('p','forge-ss-note','A: '+pendingSets(p,d,r.a).length+' offen · B: '+pendingSets(p,d,r.b).length+' offen. Pause erst nach B, nach der letzten Runde keine Pause.'));
  const h=countHint(p,r.a,r.b);if(h)sh.append(el('p','forge-ss-diff',h));
  sh.append(btn('forge-lb-sheet-sec','Reihenfolge A/B tauschen',()=>{setPairs(swap(current(),i),false);closeSheet();toast('A und B getauscht');}));
  sh.append(btn('forge-lb-sheet-sec','Partner wechseln',()=>{setPairs(remove(current(),i),false);openCreate(i);}));
  sh.append(btn('forge-lb-sheet-danger','Supersatz trennen'+(inPlan?' (nur dieses Training)':''),()=>{setPairs(remove(current(),i),false);closeSheet();toast('Supersatz getrennt · Sätze bleiben erhalten');}));
  if(inPlan)sh.append(btn('forge-lb-sheet-danger','Auch aus dem Plan entfernen',()=>{const next=remove(current(),i);setPairs(next,false);applyToPlan(p,planPairs(p).filter(x=>x[0]!==r.a&&x[1]!==r.a&&x[0]!==r.b&&x[1]!==r.b));persist();closeSheet();toast('Supersatz aus dem Plan entfernt');}));
  else sh.append(btn('forge-lb-sheet-sec','Dauerhaft im Plan speichern',()=>{applyToPlan(p,planPairs(p).filter(x=>!x.includes(r.a)&&!x.includes(r.b)).concat([[r.a,r.b]]));persist();closeSheet();toast('Supersatz im Plan gespeichert');}));
 });
}
function toast(text){
 try{if(typeof window.forgeToast==='function'){window.forgeToast(text);return;}}catch(e){}
 const t=el('div','forge-ss-toast',text);t.setAttribute('role','status');document.body.append(t);setTimeout(()=>t.remove(),2400);
}
/* Für den Workout-Screen: Text der Kopplung und Aktion fürs Haupt-Label. */
function liveInfo(i){
 const p=livePlan();if(!p||i<0)return null;
 const r=roleOf(current(),i);if(!r)return null;
 const d=liveDraft(p),pb=pendingSets(p,d,r.b),pa=pendingSets(p,d,r.a);
 const round=r.role==='A'?setCount(p,d,r.a)-pa.length+1:setCount(p,d,r.b)-pb.length+1;
 return {role:r.role,a:r.a,b:r.b,partner:nameAt(p,r.role==='A'?r.b:r.a),
  text:'Supersatz '+r.role+(Number.isFinite(round)&&round>0?' · Runde '+round:'')+' · '+(r.role==='A'?'dann B':'dann Pause'),
  toB:r.role==='A'&&pb.length>0};
}
let css=false;
function styles(){
 if(css)return;css=true;
 const st=document.createElement('style');st.id='forge-superset-css';
 st.textContent=[
  '.forge-ss-chip{position:absolute;left:12px;top:12px;z-index:3;height:36px;border-radius:18px;border:0;background:rgba(11,16,24,.72);color:#f3f7fc;font:700 12px/1 Inter,system-ui,sans-serif;padding:0 12px;display:flex;align-items:center;gap:6px;backdrop-filter:blur(6px)}',
  '.forge-ss-chip.on{background:#c8f169;color:#142016}',
  '.forge-ss-tag{flex:1 1 auto;min-width:0;text-align:left;border:0;border-radius:10px;background:#2b3a1c;color:#d9f59a;font:700 12px/1 Inter,system-ui,sans-serif;padding:6px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.forge-ss-sheet .forge-ss-note{margin:0;color:#c3cddb;font-size:14px;line-height:1.45}',
  '.forge-ss-warn{margin:0;color:#ffd38a;font-size:14px;line-height:1.4}',
  '.forge-ss-diff{display:block;margin:4px 0 0;color:#ffd38a;font-size:12px;line-height:1.35}',
  '.forge-ss-list{display:flex;flex-direction:column;gap:8px}',
  '.forge-ss-opt{display:flex;align-items:center;gap:12px;text-align:left;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:12px 14px;color:#f3f7fc;font:inherit;min-height:56px}',
  '.forge-ss-opt:disabled{opacity:.5}',
  '.forge-ss-opt span{flex:1;min-width:0}.forge-ss-opt b{display:block;font-size:15px}.forge-ss-opt small{display:block;color:#95a3b7;font-size:12px;margin-top:2px}',
  '.forge-ss-opt em{font-style:normal;font-weight:800;width:32px;height:32px;border-radius:16px;background:#2b3a1c;color:#d9f59a;display:flex;align-items:center;justify-content:center}',
  '.forge-ss-perm{display:flex;gap:10px;align-items:center;font-size:15px;color:#f3f7fc;padding:6px 2px}.forge-ss-perm input{width:22px;height:22px;accent-color:#c8f169}',
  '.forge-ss-foot{color:#95a3b7;font-size:12px}',
  '.forge-ss-toast{position:fixed;left:50%;top:calc(64px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;background:#171e2a;color:#f3f7fc;border:1px solid #3a4556;border-radius:14px;padding:10px 14px;font:600 14px/1.3 Inter,system-ui,sans-serif;max-width:86vw}'
 ].join('\n');
 document.head.append(st);
}
window.ForgeSupersetUI=Object.freeze({openCreate,openManage,liveInfo,focusIndex,styles,closeSheet});
function boot(){styles();if(wrap())return;let k=0;const t=setInterval(()=>{if(wrap()||++k>40)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
