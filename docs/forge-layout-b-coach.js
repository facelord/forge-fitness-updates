/* FORGE Layout B · Coach verständlich + Notizen fürs nächste Mal (#115).
 *
 * Coach: dieselbe feste Regel wie der Kern (forge130LoadSuggestion) – keine
 * „KI“. Steigerung erst, wenn die letzten zwei Einheiten dieser Übung alle
 * Soll-Sätze mit mindestens den Soll-Wiederholungen hatten, mit Gewicht > 0 und
 * ohne zuletzt gesenktes Gewicht. Schritt +2,5 kg (große Beinübungen +5 kg).
 * Diese Schicht erklärt nur, warum (noch) nicht gesteigert wird, und lässt den
 * Nutzer entscheiden: Übernehmen / Später / Nicht übernehmen. Sie ändert nie
 * selbst Gewichte, Sätze oder den Plan.
 *
 * Notizen: state.forgeExerciseNotes[Übungsname] = {text, goal, updatedAt}
 *  goal: 'up' (+2,5 kg) | 'same' | 'down' (−2,5 kg) | 'tech' | ''
 * Je Übung genau eine fortlaufende „fürs nächste Mal“-Notiz; Trainingseinträge
 * in der Historie bleiben unverändert.
 */
(function(){
'use strict';
const GOALS=Object.freeze({up:'Nächstes Mal +2,5 kg versuchen',same:'Gleiches Gewicht',down:'Gewicht reduzieren',tech:'Technik verbessern'});
const GOAL_SHORT=Object.freeze({up:'+2,5 kg',same:'gleiches Gewicht',down:'−2,5 kg',tech:'Technik verbessern'});
function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:NaN;}
function kgText(v){const n=Math.round(Number(v)*100)/100;return Number.isFinite(n)?String(n).replace('.',','):'';}
function bigLift(name){return /Kniebeug|Beinpresse|Kreuzheben|Ausfallschritt|Wadenheben/.test(String(name||''));}
/* rows: neueste zuerst, je {sets:[{kg,reps}]} */
function explain(rows,name,targetSets,targetReps,opts){
 const o=opts||{};const T=Math.max(1,Number(targetSets)||1),R=Number(targetReps)||0;
 if(o.timed)return {status:'timed',ok:0,text:'Zeitübung: Fortschritt über längere Haltezeit – kein Gewichtsvorschlag.'};
 const list=(Array.isArray(rows)?rows:[]).filter(r=>r&&Array.isArray(r.sets)&&r.sets.length).slice(0,2);
 if(!R)return {status:'none',ok:0,text:'Kein festes Wiederholungsziel – der Coach bewertet nur Ziele mit Wiederholungen.'};
 if(!list.length)return {status:'first',ok:0,text:'Erste Einheit: Trag deine Sätze ein. Nach 2 vollständigen Einheiten ('+T+'×'+R+') schlägt der Coach eine Steigerung vor.'};
 const full=r=>r.sets.length>=T&&r.sets.slice(0,T).every(s=>num(s.kg)>0&&num(s.reps)>=R);
 const bw=list[0].sets.slice(0,T).every(s=>!(num(s.kg)>0));
 if(bw)return {status:'bodyweight',ok:0,text:'Körpergewicht: Steigere über mehr Wiederholungen oder eine schwerere Variante – kein Fantasiegewicht.'};
 const last=list[0],ls=last.sets.slice(0,T);
 const lastKg=num(ls[0]&&ls[0].kg);
 if(!full(last)){
  const short=ls.find(s=>num(s.reps)<R);
  const why=last.sets.length<T?'Letzte Einheit: '+last.sets.length+' statt '+T+' Sätze.':short?'Letzte Einheit: '+(Number.isFinite(num(short.reps))?num(short.reps):0)+' statt '+R+' Wdh.':'Letzte Einheit nicht vollständig.';
  return {status:'build',ok:0,kg:lastKg,text:why+' Gewicht halten und Wiederholungen aufbauen – 0 von 2 Erfolgen.'};
 }
 const step=bigLift(name)?5:2.5;
 if(list.length<2||!full(list[1]))return {status:'once',ok:1,kg:lastKg,step,text:'1 von 2 Erfolgen: Schaffe '+T+'×'+R+' mit '+kgText(lastKg)+' kg noch einmal, dann schlägt der Coach +'+kgText(step)+' kg vor.'};
 const dropped=list[1].sets.slice(0,T).some((s,k)=>num(ls[k]&&ls[k].kg)<num(s.kg));
 if(dropped)return {status:'dropped',ok:1,kg:lastKg,step,text:'Gewicht wurde zuletzt reduziert: '+T+'×'+R+' mit '+kgText(lastKg)+' kg noch einmal bestätigen, dann folgt die Steigerung.'};
 const pct=lastKg>0?Math.round(step/lastKg*1000)/10:0;
 const out={status:'raise',ok:2,kg:lastKg,step,target:Math.round((lastKg+step)*2)/2,
  text:'Coach empfiehlt '+kgText(Math.round((lastKg+step)*2)/2)+' kg statt '+kgText(lastKg)+' kg, weil du 2× '+T+'×'+R+' geschafft hast.'};
 if(pct>5)out.note='+'+kgText(step)+' kg sind '+String(pct).replace('.',',')+' % mehr. Wenn das zu viel ist: Gewicht halten und 1–2 Wiederholungen mehr schaffen.';
 return out;
}
/* Gewicht zum Notiz-Ziel – nur Anzeige/Übernahme auf Wunsch, nie automatisch. */
function goalKg(goal,lastKg){
 const k=num(lastKg);if(!(k>0))return null;
 if(goal==='up')return Math.round((k+2.5)*2)/2;
 if(goal==='down')return Math.max(0,Math.round((k-2.5)*2)/2);
 if(goal==='same')return k;
 return null;
}
function cleanNote(n){
 if(!n||typeof n!=='object')return null;
 const text=String(n.text||'').slice(0,280).trim(),goal=GOALS[n.goal]?n.goal:'';
 if(!text&&!goal)return null;
 return {text,goal,updatedAt:String(n.updatedAt||'')};
}
/* Erinnerung vor dem ersten Satz: nur Notizen aus einer früheren Einheit. */
function remindFor(note,startedAt,seen){
 const n=cleanNote(note);if(!n||seen)return null;
 const t=Date.parse(n.updatedAt);if(Number.isFinite(t)&&Number(startedAt)>0&&t>=Number(startedAt))return null;
 return n;
}
function noteLine(n,lastKg){
 if(!n)return '';
 const parts=[];
 if(n.goal){const g=goalKg(n.goal,lastKg);parts.push('Dein Ziel: '+GOAL_SHORT[n.goal]+(g!=null&&n.goal!=='same'?' ('+kgText(g)+' kg)':''));}
 if(n.text)parts.push('Deine Notiz: '+n.text);
 return parts.join(' · ');
}
const api={GOALS,GOAL_SHORT,explain,goalKg,cleanNote,remindFor,noteLine,kgText,bigLift};
window.ForgeCoach=api;
if(typeof document==='undefined')return;

/* ---------- Laufzeit ---------- */
function S(){return typeof state!=='undefined'?state:null;}
function livePlan(){const s=S();if(!s||!s.activeWorkout)return null;return (s.plan||[]).find(x=>String(x.id)===String(s.activeWorkout.planId))||null;}
function draft(p){const s=S();return s&&s.workoutDraft&&String(s.workoutDraft.planId)===String(p&&p.id)?s.workoutDraft:null;}
function exName(p,i){const d=draft(p);return (d&&d.exercises&&d.exercises[i]&&d.exercises[i].name)||(p.ex[i]&&p.ex[i].name)||'';}
function notes(){const s=S();if(!s)return {};if(!s.forgeExerciseNotes||typeof s.forgeExerciseNotes!=='object')s.forgeExerciseNotes={};return s.forgeExerciseNotes;}
function persist(){try{if(typeof save==='function')save();}catch(e){console.error('FORGE Notiz speichern',e);}}
function history(name){
 try{if(typeof forge130HistoricalSets==='function')return forge130HistoricalSets(name);}catch(e){}
 const s=S();return ((s&&s.workouts)||[]).slice().reverse().map(w=>({sets:((w.entries||[]).find(e=>e.name===name)||{}).sets||[]})).filter(w=>w.sets.length);
}
function timed(p,i){const pe=p.ex[i]||{};if(pe.unit==='sec'||pe.unit==='seconds')return true;try{return typeof forgeTimeIsExercise==='function'&&!!forgeTimeIsExercise(exName(p,i),pe);}catch(e){return false;}}
function aw(){const s=S();return s&&s.activeWorkout;}
function sessionFlag(key,name,val){const a=aw();if(!a)return false;a[key]=a[key]&&typeof a[key]==='object'?a[key]:{};if(val===undefined)return !!a[key][name];a[key][name]=!!val;persist();return val;}
function coachFor(i){
 const p=livePlan();if(!p||!p.ex[i])return null;
 const name=exName(p,i),pe=p.ex[i];
 const c=explain(history(name),name,Number(pe.sets),parseInt(String(pe.reps??''),10),{timed:timed(p,i)});
 const s=S(),sig=c.status+'|'+(c.target||'')+'|'+(c.kg||'');
 const dismissed=!!(s&&s.forgeCoachDismiss&&s.forgeCoachDismiss[name]===sig);
 return Object.assign({name,sig,dismissed,later:sessionFlag('coachLater',name)},c);
}
function lastKgOf(name){const r=history(name)[0];const v=r&&r.sets&&r.sets[0]?num(r.sets[0].kg):NaN;return Number.isFinite(v)?v:null;}
/* Für die Zeile im Workout: Erinnerung (vorheriges Training) hat Vorrang. */
function liveLine(i){
 const p=livePlan(),a=aw();if(!p||!a)return null;
 const name=exName(p,i),d=draft(p);
 const anyDone=!!(d&&d.exercises&&d.exercises[i]&&(d.exercises[i].sets||[]).some(x=>x&&x.done));
 const n=cleanNote(notes()[name]);
 const rem=!anyDone?remindFor(n,a.startedAt,sessionFlag('noteSeen',name)):null;
 if(rem)return {kind:'note',text:'📝 '+noteLine(rem,lastKgOf(name))};
 if(anyDone)return n?{kind:'has',text:''}:null;
 const c=coachFor(i);
 if(c&&!c.dismissed&&!c.later&&c.status!=='raise'&&c.status!=='timed'&&c.status!=='none')return {kind:'coach',note:!!n,text:'Coach: '+(c.ok+' von 2')};
 return n?{kind:'has',text:''}:null;
}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
let wrapEl=null;
function closeSheet(){if(wrapEl){wrapEl.remove();wrapEl=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSheet();}}
/* Gewicht für die offenen Sätze dieser Übung setzen – nur auf ausdrücklichen Tipp. */
function applyKg(i,kg){
 const box=typeof workoutExercises!=='undefined'?workoutExercises:document.getElementById('workoutExercises');
 const d=draft(livePlan());let n=0;
 (d&&d.exercises&&d.exercises[i]?d.exercises[i].sets:[]).forEach((x,j)=>{
  if(x&&x.done)return;
  const inp=box&&box.querySelector('[data-ex="'+i+'"][data-set="'+j+'"][data-field="kg"]');if(inp){inp.value=String(kg);n++;}
 });
 try{if(typeof forgeSaveWorkoutDraft==='function')forgeSaveWorkoutDraft();}catch(e){}
 const q=document.getElementById('forge130QuickKg');if(q){q.value=String(kg);q.dispatchEvent(new Event('input',{bubbles:true}));}
 try{if(typeof forge130RenderFocus==='function')forge130RenderFocus();}catch(e){}
 return n;
}
function open(i){
 const p=livePlan();if(!p||!p.ex[i])return;
 const name=exName(p,i),c=coachFor(i);
 sessionFlag('noteSeen',name,true);
 closeSheet();styles();
 const wr=el('div','forge-lb-sheet-wrap forge-cn-wrap');const sh=el('div','forge-lb-sheet forge-cn-sheet');
 sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-label','Coach und Notiz');
 sh.append(el('div','forge-lb-handle'));
 const h=el('div','forge-lb-sheet-head');const t=el('div');t.append(el('small','','Coach & Notiz'),el('strong','',name));
 h.append(t,btn('forge-lb-x','✕',closeSheet));h.lastChild.setAttribute('aria-label','Schließen');sh.append(h);
 // Coach
 if(c){
  const box=el('div','forge-cn-card');box.append(el('small','','Empfehlung · Coach-Regel'),el('b','',c.text));
  if(c.note)box.append(el('p','',c.note));
  box.append(el('p','forge-cn-rule','Regel: Steigerung, wenn du 2 Einheiten hintereinander alle Sätze mit dem Wiederholungsziel schaffst. Aufwärmsätze zählen nicht.'));
  if(c.status==='raise'){
   const d=draft(p),started=!!(d&&d.exercises&&d.exercises[i]&&(d.exercises[i].sets||[]).some(x=>x&&x.done));
   const row=el('div','forge-cn-acts');
   const take=btn('forge-cn-main','Übernehmen ('+kgText(c.target)+' kg)',()=>{applyKg(i,c.target);closeSheet();});
   take.disabled=false;
   row.append(take,btn('forge-cn-sec','Später',()=>{sessionFlag('coachLater',name,true);closeSheet();}),
    btn('forge-cn-sec','Nicht übernehmen',()=>{const s=S();s.forgeCoachDismiss=s.forgeCoachDismiss&&typeof s.forgeCoachDismiss==='object'?s.forgeCoachDismiss:{};s.forgeCoachDismiss[name]=c.sig;persist();closeSheet();}));
   box.append(row);
   if(started)box.append(el('p','forge-cn-rule','Gilt nur für die noch offenen Sätze – erledigte Sätze bleiben unverändert.'));
  }
  sh.append(box);
 }
 // Notiz
 const n=cleanNote(notes()[name])||{text:'',goal:'',updatedAt:''};
 const nb=el('div','forge-cn-card');nb.append(el('small','','Mein Ziel · Notiz für nächstes Mal'));
 const last=lastKgOf(name);
 const goals=el('div','forge-cn-goals');
 let cur={text:n.text,goal:n.goal};
 const stamp=el('p','forge-cn-stamp',n.updatedAt?'Zuletzt geändert: '+new Date(n.updatedAt).toLocaleDateString('de-DE'):'');
 const store=()=>{
  const all=notes();
  const clean=cleanNote({text:cur.text,goal:cur.goal,updatedAt:new Date().toISOString()});
  if(clean)all[name]=clean;else delete all[name];
  persist();stamp.textContent=clean?'Gespeichert · '+new Date().toLocaleDateString('de-DE'):'Notiz gelöscht';
  draw();
 };
 const takeBox=el('div','forge-cn-acts');
 const draw=()=>{
  const tg=goalKg(cur.goal,last);takeBox.replaceChildren(...(cur.goal&&tg!=null&&cur.goal!=='same'?[btn('forge-cn-sec','Mein Ziel jetzt übernehmen ('+kgText(tg)+' kg)',()=>{applyKg(i,tg);closeSheet();})]:[]));
  goals.replaceChildren(...Object.keys(GOALS).map(k=>{
  const g=goalKg(k,last);const b=btn('forge-cn-goal'+(cur.goal===k?' on':''),GOALS[k]+(g!=null&&k!=='same'?' ('+kgText(g)+' kg)':''),()=>{cur.goal=cur.goal===k?'':k;store();});
  b.setAttribute('aria-pressed',String(cur.goal===k));return b;}));};
 draw();nb.append(goals);
 const ta=el('textarea','forge-cn-text');ta.rows=3;ta.maxLength=280;ta.placeholder='z. B. Mehr Gewicht versuchen, Technik kontrollieren …';ta.value=n.text;
 ta.setAttribute('aria-label','Notiz für das nächste Mal');
 let tm=null;ta.addEventListener('input',()=>{cur.text=ta.value;clearTimeout(tm);tm=setTimeout(store,400);});
 ta.addEventListener('blur',()=>{if(tm){clearTimeout(tm);tm=null;store();}});
 nb.append(ta,stamp);
 nb.append(takeBox);
 nb.append(btn('forge-cn-del','Notiz löschen',()=>{cur={text:'',goal:''};ta.value='';store();}));
 sh.append(nb);
 wr.append(sh);wr.addEventListener('click',e=>{if(e.target===wr)closeSheet();});
 document.body.append(wr);wrapEl=wr;document.addEventListener('keydown',onKey,true);
}
let css=false;
function styles(){
 if(css)return;css=true;
 const st=document.createElement('style');st.id='forge-coach-css';
 st.textContent=[
  '.forge-cn-btn{flex:0 0 auto;margin-left:auto;border:1px solid #3a4556;border-radius:10px;background:#171e2a;color:#f3f7fc;font:700 12px/1 Inter,system-ui,sans-serif;padding:4px 8px;white-space:nowrap}',
  '.forge-cn-btn.has{border-color:#c8f169;color:#d9f59a}',
  '.forge-cn-line{flex:1;min-width:0;border:0;background:transparent;color:#ffe2a0;font:600 13px/1.3 Inter,system-ui,sans-serif;text-align:left;padding:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.forge-cn-line.coach{color:#c3cddb}',
  '.forge-cn-card{background:#171e2a;border:1px solid #293346;border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:8px}',
  '.forge-cn-card>small{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.2px}',
  '.forge-cn-card b{font-size:16px;line-height:1.35}.forge-cn-card p{margin:0;font-size:14px;line-height:1.4;color:#c3cddb}',
  '.forge-cn-rule{font-size:12px!important;color:#95a3b7!important}',
  '.forge-cn-acts,.forge-cn-goals{display:flex;flex-wrap:wrap;gap:8px}',
  '.forge-cn-main{min-height:46px;border-radius:23px;border:0;background:#c8f169;color:#142016;font:800 15px/1 Inter,system-ui,sans-serif;padding:0 16px}',
  '.forge-cn-sec{min-height:44px;border-radius:22px;border:1px solid #3a4556;background:#111723;color:#f3f7fc;font:700 14px/1 Inter,system-ui,sans-serif;padding:0 14px}',
  '.forge-cn-goal{min-height:40px;border-radius:20px;border:1px solid #3a4556;background:#111723;color:#f3f7fc;font:600 13px/1.2 Inter,system-ui,sans-serif;padding:6px 12px;text-align:left}',
  '.forge-cn-goal.on{background:#2b3a1c;border-color:#c8f169;color:#d9f59a}',
  '.forge-cn-text{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid #3a4556;background:#0b1018;color:#f3f7fc;font:15px/1.4 Inter,system-ui,sans-serif;padding:10px 12px;resize:vertical}',
  '.forge-cn-stamp{font-size:12px!important;color:#95a3b7!important;min-height:14px}',
  '.forge-cn-del{align-self:flex-start;border:0;background:transparent;color:#ffb3bd;font:700 13px/1 Inter,system-ui,sans-serif;padding:6px 0}'
 ].join('\n');
 document.head.append(st);
}
window.ForgeCoachUI=Object.freeze({open,liveLine,coachFor,applyKg,closeSheet,styles});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',styles,{once:true});else styles();
})();
