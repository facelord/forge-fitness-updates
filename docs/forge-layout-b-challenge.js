/* FORGE Layout B · Monats-Challenge.
 * Jeden Monat ein eigenes FORGE-Workout mit Körpergewicht „auf Zeit“:
 * alle Runden so schnell wie möglich, saubere Ausführung zählt. Du hast den
 * ganzen Monat, um deine Bestzeit zu schlagen. Stufen: Standard und
 * Einsteiger (weniger Wiederholungen) mit getrennten Bestzeiten.
 * Ersetzt in Erfolge die alte Monats-Challenge („X Einheiten im Monat“);
 * das Wochenziel bleibt unverändert.
 * Daten: state.forgeChallenge={results:[{id,wid,month,level,ms,date}]}.
 */
(function(){
'use strict';
const S_=(name,reps,unit)=>({name,reps,unit:unit||'reps'});
const R=(n,moves)=>Array.from({length:n},()=>moves);
/* Twelve FORGE workouts, one per calendar month (index 0 = January). */
const WORKOUTS=Object.freeze([
 {id:'glut',name:'Glut',tag:'Zum Warmwerden ins Jahr',rounds:R(3,[S_('Hampelmann',30),S_('Kniebeuge',15),S_('Liegestütze',10),S_('Bergsteiger',20)])},
 {id:'amboss',name:'Amboss',tag:'Beine und Brust, solide wie Stahl',rounds:R(4,[S_('Kniebeuge',12),S_('Liegestütze',8),S_('Ausfallschritte',10,'side'),S_('Glute Bridge',15)])},
 {id:'funkenflug',name:'Funkenflug',tag:'Kurz, schnell, intensiv',rounds:R(5,[S_('Burpees',8),S_('Bergsteiger',20),S_('Hampelmann',20)])},
 {id:'hammerschlag',name:'Hammerschlag',tag:'Absteigende Leiter 15 – 12 – 9 – 6',rounds:[15,12,9,6].map(n=>[S_('Kniebeuge',n),S_('Liegestütze',Math.round(n*0.67)),S_('Dead Bug',Math.round(n*0.67),'side')])},
 {id:'esse',name:'Esse',tag:'Ganzkörper mit Haltephasen',rounds:R(3,[S_('Bulgarian Split Squat',8,'side'),S_('Pike Push-ups',8),S_('Plank',40,'sec'),S_('Glute Bridge',20)])},
 {id:'klinge',name:'Klinge',tag:'Oberkörper und Rumpf',rounds:R(4,[S_('Liegestütze',10),S_('Reverse Snow Angels',12),S_('Enge Liegestütze',6),S_('Superman Hold',30,'sec')])},
 {id:'zunder',name:'Zunder',tag:'Sommer-Cardio ohne Geräte',rounds:R(5,[S_('Hampelmann',25),S_('Kniebeuge',15),S_('Bergsteiger',20),S_('Burpees',5)])},
 {id:'blasebalg',name:'Blasebalg',tag:'Puls hoch, Beine stark',rounds:R(4,[S_('Ausfallschritte',12,'side'),S_('Burpees',6),S_('Wadenheben',20),S_('Bergsteiger',20)])},
 {id:'haerte',name:'Härte',tag:'Aufsteigende Leiter 5 – 10 – 15',rounds:[5,10,15].map(n=>[S_('Liegestütze',n),S_('Kniebeuge',n*2),S_('Bird Dog',n,'side')])},
 {id:'meissel',name:'Meißel',tag:'Präzision statt Hektik',rounds:R(3,[S_('Bulgarian Split Squat',10,'side'),S_('Pike Push-ups',10),S_('Dead Bug',10,'side'),S_('Plank',45,'sec')])},
 {id:'stahl',name:'Stahl',tag:'Das große Herbst-Finale',rounds:R(5,[S_('Kniebeuge',15),S_('Liegestütze',10),S_('Glute Bridge',15),S_('Bergsteiger',20)])},
 {id:'schmiedefeuer',name:'Schmiedefeuer',tag:'Zum Jahresende alles geben',rounds:R(4,[S_('Burpees',8),S_('Ausfallschritte',10,'side'),S_('Liegestütze',12),S_('Hampelmann',30),S_('Plank',30,'sec')])}
]);
const LEVELS=Object.freeze({std:{label:'Standard',k:1},easy:{label:'Einsteiger',k:0.6}});
function monthKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function workoutFor(d){d=d||new Date();return WORKOUTS[d.getMonth()];}
function scale(n,level){const k=(LEVELS[level]||LEVELS.std).k;return Math.max(1,Math.round(n*k));}
/* Flattened list of steps for the live screen (pure, tested). */
function steps(w,level){
 const out=[];
 w.rounds.forEach((moves,r)=>moves.forEach((m,i)=>out.push({round:r+1,rounds:w.rounds.length,index:i,name:m.name,unit:m.unit,reps:scale(m.reps,level)})));
 return out;
}
function doseText(s){return s.unit==='sec'?s.reps+' Sek.':s.unit==='side'?s.reps+' je Seite':String(s.reps);}
function clock(ms){const t=Math.max(0,Math.round((Number(ms)||0)/1000));const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return (h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(s).padStart(2,'0');}
/* Results of one month and level, best first plus attempts in order (pure, tested). */
function standing(results,month,level){
 const list=(Array.isArray(results)?results:[]).filter(r=>r&&r.month===month&&(r.level||'std')===level&&Number(r.ms)>0);
 const byDate=list.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const best=list.reduce((b,r)=>!b||r.ms<b.ms?r:b,null);
 return {best,attempts:byDate,count:list.length,firstMs:byDate.length?byDate[0].ms:null};
}
/* Best per past month (newest first) for the archive (pure, tested). */
function archive(results,currentMonth){
 const map=new Map();
 (Array.isArray(results)?results:[]).forEach(r=>{
  if(!r||r.month===currentMonth||!(Number(r.ms)>0))return;
  const k=r.month+'|'+(r.level||'std');const b=map.get(k);if(!b||r.ms<b.ms)map.set(k,r);
 });
 return [...map.values()].sort((a,b)=>b.month.localeCompare(a.month)||(a.level||'std').localeCompare(b.level||'std'));
}
function daysLeft(d){d=d||new Date();const end=new Date(d.getFullYear(),d.getMonth()+1,0);return end.getDate()-d.getDate()+1;}
window.ForgeLayoutBChallenge=Object.freeze({WORKOUTS,LEVELS,monthKey,workoutFor,steps,doseText,clock,standing,archive,daysLeft,scale});
if(typeof document==='undefined')return;

/* ---------- DOM ---------- */
const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
const S=()=>typeof state!=='undefined'?state:null;
function results(){const st=S();return st&&st.forgeChallenge&&Array.isArray(st.forgeChallenge.results)?st.forgeChallenge.results:[];}
function newId(){try{if(typeof uid==='function')return uid();}catch(e){}return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function persist(){if(typeof KEY!=='undefined'){localStorage.setItem(KEY,JSON.stringify(S()));return;}if(typeof save==='function')save();}
const thumbCache=new Map();
function thumb(name){
 if(thumbCache.has(name))return thumbCache.get(name);
 let src='';
 try{const fn=window.forgeExerciseIllustrations;const html=typeof fn==='function'?fn(name):'';if(html){const m=String(html).match(/<img[^>]*src="([^"]+)"/);if(m)src=m[1];}}catch(e){}
 thumbCache.set(name,src);return src;
}
const ACC='#a9f267',GOLD='#ffb547',TEAL='#5ee0c8';
const ICON={
 bolt:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
 move:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="M4 22l4-7 3 2 2 5M8 15l1-5 4-2 3 3 3 1M9 10l-3 2"/></svg>'
};
const CSS=`
.forge-lb-ch{position:fixed;inset:0;z-index:2147480100;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
.forge-lb-ch *{box-sizing:border-box}
.forge-lb-ch .ch-head{display:flex;align-items:center;gap:12px;padding:12px 14px 6px;max-width:560px;width:100%;margin:0 auto}
.forge-lb-ch .ch-head small{display:block;font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px}
.forge-lb-ch .ch-head h1{font-size:24px;font-weight:800;margin:0;letter-spacing:-.02em}
.forge-lb-ch .ch-x{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:20px;padding:0}
.forge-lb-ch .ch-body{flex:1;overflow:auto;padding:6px 14px 18px;max-width:560px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.forge-lb-ch .ch-hero{border-radius:24px;padding:18px;background:linear-gradient(135deg,#2a2210,#171e2a 70%);border:1px solid #5a4620}
.forge-lb-ch .ch-hero small{font-size:12px;color:${GOLD};text-transform:uppercase;letter-spacing:1.4px;font-weight:700}
.forge-lb-ch .ch-hero h2{font-size:32px;font-weight:900;margin:4px 0 2px;letter-spacing:-.02em}
.forge-lb-ch .ch-hero p{margin:0;font-size:14px;color:#c3cddb;line-height:1.45}
.forge-lb-ch .ch-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
.forge-lb-ch .ch-stats div{background:#0b1018aa;border-radius:14px;padding:8px 10px}
.forge-lb-ch .ch-stats small{display:block;font-size:11px;color:#95a3b7;text-transform:none;letter-spacing:0;font-weight:500}
.forge-lb-ch .ch-stats b{font-size:18px;font-weight:800}
.forge-lb-ch .ch-seg{display:flex;background:#171e2a;border:1px solid #293346;border-radius:22px;padding:4px;gap:4px}
.forge-lb-ch .ch-seg button{flex:1;min-height:40px;border-radius:18px;border:0;background:transparent;color:#c3cddb;font:inherit;font-size:14px;font-weight:700}
.forge-lb-ch .ch-seg button[aria-pressed="true"]{background:${GOLD};color:#2a1d05}
.forge-lb-ch .ch-card{background:#171e2a;border:1px solid #293346;border-radius:22px;padding:14px}
.forge-lb-ch .ch-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;margin-bottom:8px}
.forge-lb-ch .ch-round{display:flex;flex-direction:column;gap:2px;padding:8px 0;border-top:1px solid #222b3a}
.forge-lb-ch .ch-round:first-of-type{border-top:0;padding-top:0}
.forge-lb-ch .ch-round>b{font-size:13px;color:${GOLD}}
.forge-lb-ch .ch-move{display:flex;justify-content:space-between;gap:10px;font-size:15px;padding:3px 0}
.forge-lb-ch .ch-move span:last-child{font-weight:700;color:#f3f7fc;white-space:nowrap}
.forge-lb-ch .ch-att{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid #222b3a;font-size:14px}
.forge-lb-ch .ch-att:first-of-type{border-top:0}
.forge-lb-ch .ch-att b{font-size:16px;font-variant-numeric:tabular-nums}
.forge-lb-ch .ch-att em{font-style:normal;font-size:12px;font-weight:800;color:${GOLD};margin-left:8px}
.forge-lb-ch .ch-empty{font-size:14px;color:#95a3b7;line-height:1.5;margin:0}
.forge-lb-ch .ch-foot{padding:10px 14px 14px;border-top:1px solid #1d2532;max-width:560px;width:100%;margin:0 auto}
.forge-lb-ch .ch-main{width:100%;height:58px;border-radius:29px;border:0;background:${GOLD};color:#2a1d05;font:inherit;font-size:18px;font-weight:900}
.forge-lb-ch .ch-sec{min-height:48px;border-radius:24px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;padding:0 18px}
.forge-lb-ch .ch-note{font-size:12px;color:#95a3b7;line-height:1.45;margin:8px 2px 0}
/* live */
.forge-lb-ch.live .ch-live{flex:1;display:flex;flex-direction:column;align-items:stretch;gap:12px;padding:10px 16px 16px;max-width:560px;width:100%;margin:0 auto;min-height:0}
.forge-lb-ch .ch-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.forge-lb-ch .ch-top small{font-size:13px;color:#c3cddb;font-weight:700}
.forge-lb-ch .ch-time{font-size:64px;font-weight:900;letter-spacing:-.03em;text-align:center;font-variant-numeric:tabular-nums;line-height:1;margin-top:4px}
.forge-lb-ch .ch-bar{height:8px;border-radius:4px;background:#222b3a;overflow:hidden}
.forge-lb-ch .ch-bar i{display:block;height:100%;background:${GOLD};border-radius:4px;transition:width .25s}
.forge-lb-ch .ch-now{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;background:#171e2a;border:1px solid #293346;border-radius:26px;padding:16px;overflow:hidden}
.forge-lb-ch .ch-img{width:100%;max-width:340px;flex:1;min-height:80px;max-height:240px;border-radius:18px;overflow:hidden;background:#0f1620;display:flex;align-items:center;justify-content:center;color:#5b6b80}
.forge-lb-ch .ch-img img{width:100%;height:100%;object-fit:cover;object-position:left top;display:block}
.forge-lb-ch .ch-reps{font-size:52px;font-weight:900;color:${GOLD};line-height:1}
.forge-lb-ch .ch-name{font-size:24px;font-weight:800;line-height:1.15}
.forge-lb-ch .ch-next{font-size:14px;color:#95a3b7}
.forge-lb-ch .ch-next b{color:#c3cddb}
.forge-lb-ch .ch-done{width:100%;height:72px;border-radius:36px;border:0;background:${ACC};color:#142016;font:inherit;font-size:21px;font-weight:900}
.forge-lb-ch .ch-row{display:flex;gap:10px}
.forge-lb-ch .ch-row button{flex:1}
.forge-lb-ch .ch-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:120px;font-weight:900;color:${GOLD};background:#0b1018ee;z-index:2}
.forge-lb-ch .ch-confirm{background:#211c12;border:1px solid #6b5426;border-radius:18px;padding:14px}
.forge-lb-ch .ch-confirm p{margin:0 0 10px;font-size:14px;line-height:1.45}
.forge-lb-ch .ch-result{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px}
.forge-lb-ch .ch-result small{font-size:13px;color:${GOLD};text-transform:uppercase;letter-spacing:1.4px;font-weight:800}
.forge-lb-ch .ch-result b{font-size:72px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1}
.forge-lb-ch .ch-result p{margin:0;font-size:16px;color:#c3cddb;line-height:1.5}
.forge-lb-ch .ch-pr{font-size:15px;font-weight:900;color:#2a1d05;background:${GOLD};border-radius:16px;padding:6px 14px}
.forge-lb-ch button:focus-visible{outline:2px solid ${GOLD};outline-offset:2px}
@media (max-height:700px){.forge-lb-ch .ch-time{font-size:48px}.forge-lb-ch .ch-reps{font-size:40px}.forge-lb-ch .ch-done{height:62px}}
@media (prefers-reduced-motion:reduce){.forge-lb-ch .ch-bar i{transition:none}}
`;
function ensureCss(){if(!$('forgeLayoutBChallengeStyle')){const st=el('style');st.id='forgeLayoutBChallengeStyle';st.textContent=CSS;document.head.append(st);}}

let root=null,ui=null,timer=null;
function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
function close(){stopTimer();if(root){root.remove();root=null;ui=null;document.removeEventListener('keydown',onKey,true);}try{window.dispatchEvent(new CustomEvent('forge:challenge-changed'));}catch(e){}}
function onKey(e){if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();if(ui&&ui.mode==='live'){ui.confirmQuit=true;drawLive();}else close();}
function open(){
 if(!enabled()||!S())return false;
 ensureCss();close();
 ui={mode:'overview',level:(S().forgeChallenge&&S().forgeChallenge.level)||'std'};
 root=el('div','forge-lb-ch');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Monats-Challenge');
 document.body.append(root);document.addEventListener('keydown',onKey,true);
 drawOverview();return true;
}
function setLevel(l){ui.level=l;const st=S();if(!st.forgeChallenge)st.forgeChallenge={results:[]};st.forgeChallenge.level=l;try{persist();}catch(e){}drawOverview();}
function drawOverview(){
 stopTimer();root.className='forge-lb-ch';root.textContent='';
 const now=new Date(),w=workoutFor(now),mk=monthKey(now),st=standing(results(),mk,ui.level);
 const head=el('div','ch-head');const x=btn('ch-x','×',close);x.setAttribute('aria-label','Zurück');const t=el('div');t.append(el('small','','Erfolge'),el('h1','','Monats-Challenge'));head.append(x,t);
 const body=el('div','ch-body');
 const hero=el('div','ch-hero');
 hero.append(el('small','',now.toLocaleDateString('de-DE',{month:'long',year:'numeric'})+' · auf Zeit'),el('h2','',w.name),el('p','',w.tag+'. Alle Runden so schnell wie möglich – saubere Ausführung zählt. Du hast den ganzen Monat, um deine Bestzeit zu schlagen.'));
 const stats=el('div','ch-stats');
 const stat=(l,v)=>{const d=el('div');d.append(el('small','',l),el('b','',v));stats.append(d);};
 stat('Bestzeit',st.best?clock(st.best.ms):'–');stat('Versuche',String(st.count));stat('Noch',daysLeft(now)+(daysLeft(now)===1?' Tag':' Tage'));
 hero.append(stats);body.append(hero);
 const seg=el('div','ch-seg');seg.setAttribute('role','group');seg.setAttribute('aria-label','Stufe');
 Object.entries(LEVELS).forEach(([k,v])=>{const b=btn('',v.label,()=>setLevel(k));b.setAttribute('aria-pressed',String(ui.level===k));seg.append(b);});
 body.append(seg);
 const plan=el('div','ch-card');plan.append(el('div','ch-label','Ablauf · '+w.rounds.length+' Runden'));
 const allSame=w.rounds.every(r=>JSON.stringify(r)===JSON.stringify(w.rounds[0]));
 const roundsToShow=allSame?[w.rounds[0]]:w.rounds;
 roundsToShow.forEach((moves,r)=>{const box=el('div','ch-round');box.append(el('b','',allSame?w.rounds.length+' × hintereinander':'Runde '+(r+1)));
  moves.forEach(m=>{const s={...m,reps:scale(m.reps,ui.level)};const row=el('div','ch-move');row.append(el('span','',m.name),el('span','',doseText(s)));box.append(row);});plan.append(box);});
 body.append(plan);
 const att=el('div','ch-card');att.append(el('div','ch-label','Deine Versuche im '+now.toLocaleDateString('de-DE',{month:'long'})));
 if(st.attempts.length){st.attempts.slice().reverse().forEach(a=>{const r=el('div','ch-att');const l=el('span','',new Date(a.date).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'}));const v=el('b','',clock(a.ms));if(st.best&&a.id===st.best.id)v.append(el('em','','BESTZEIT'));r.append(l,v);att.append(r);});
  if(st.count>1&&st.best&&st.firstMs>st.best.ms)att.append(el('p','ch-note','Seit deinem ersten Versuch '+clock(st.firstMs-st.best.ms)+' schneller.'));}
 else att.append(el('p','ch-empty','Noch kein Versuch. Starte einmal, um deine Zeit zu setzen – danach jagst du sie den ganzen Monat.'));
 body.append(att);
 const arc=archive(results(),mk);
 if(arc.length){const c=el('div','ch-card');c.append(el('div','ch-label','Vergangene Monate'));
  arc.slice(0,12).forEach(a=>{const [y,m]=a.month.split('-').map(Number);const wo=WORKOUTS[m-1];const r=el('div','ch-att');r.append(el('span','',new Date(y,m-1,1).toLocaleDateString('de-DE',{month:'long',year:'numeric'})+' · '+(wo?wo.name:'')+((a.level||'std')==='easy'?' (Einsteiger)':'')),el('b','',clock(a.ms)));c.append(r);});
  body.append(c);}
 const foot=el('div','ch-foot');foot.append(btn('ch-main',st.count?'Bestzeit jagen':'Challenge starten',startLive));
 foot.append(el('p','ch-note','Tipp: kurz aufwärmen. Die Uhr läuft nach einem 3-2-1-Countdown, nach jeder Übung tippst du auf „Geschafft“.'));
 root.append(head,body,foot);x.focus({preventScroll:true});
}
/* ---------- live ---------- */
function startLive(){
 const w=workoutFor(new Date());
 ui={mode:'live',level:ui.level,w,month:monthKey(new Date()),list:steps(w,ui.level),i:0,start:0,paused:false,pausedAt:0,pausedMs:0,count:3,confirmQuit:false};
 root.className='forge-lb-ch live';root.textContent='';
 drawLive();
 const tick=()=>{if(!ui||ui.mode!=='live')return;
  if(ui.count>0){ui.count--;if(ui.count===0){ui.start=Date.now();}drawLive();return;}
  const t=root.querySelector('.ch-time');if(t)t.textContent=clock(elapsed());};
 timer=setInterval(tick,1000);
}
function elapsed(){if(!ui||!ui.start)return 0;const end=ui.paused?ui.pausedAt:Date.now();return end-ui.start-ui.pausedMs;}
function drawLive(){
 if(!root||!ui)return;root.textContent='';
 const live=el('div','ch-live');
 const cur=ui.list[ui.i],next=ui.list[ui.i+1];
 const top=el('div','ch-top');top.append(el('small','',ui.w.name+' · Runde '+cur.round+' von '+cur.rounds),el('small','',(ui.i+1)+' / '+ui.list.length));
 const time=el('div','ch-time',clock(elapsed()));time.setAttribute('aria-live','off');
 const bar=el('div','ch-bar');const bi=el('i');bi.style.width=Math.round(ui.i/ui.list.length*100)+'%';bar.append(bi);bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuenow',String(ui.i));bar.setAttribute('aria-valuemax',String(ui.list.length));
 const now=el('div','ch-now');
 const img=el('div','ch-img');const src=thumb(cur.name);if(src){const im=el('img');im.src=src;im.alt='';img.append(im);}else img.innerHTML=ICON.move;
 const reps=el('div','ch-reps',doseText(cur));const name=el('div','ch-name',cur.name);
 now.setAttribute('aria-live','polite');now.append(img,reps,name);
 if(next){const n=el('div','ch-next','Danach: ');n.append(el('b','',doseText(next)+' '+next.name));now.append(n);}
 else now.append(el('div','ch-next','Letzte Übung – Endspurt!'));
 live.append(top,time,bar,now);
 if(ui.confirmQuit){
  const c=el('div','ch-confirm');c.append(el('p','','Challenge abbrechen? Dieser Versuch wird nicht gespeichert.'));
  const row=el('div','ch-row');row.append(btn('ch-sec','Weitermachen',()=>{ui.confirmQuit=false;drawLive();}),btn('ch-sec','Abbrechen',()=>drawOverview()));c.append(row);live.append(c);
 }else{
  const done=btn('ch-done',ui.i===ui.list.length-1?'Fertig!':'Geschafft',advance);done.disabled=ui.count>0||ui.paused;
  const row=el('div','ch-row');
  row.append(btn('ch-sec',ui.paused?'Weiter':'Pause',togglePause),btn('ch-sec','Abbrechen',()=>{ui.confirmQuit=true;drawLive();}));
  live.append(done,row);
 }
 root.append(live);
 if(ui.count>0){const c=el('div','ch-count',String(ui.count));c.setAttribute('aria-live','assertive');root.append(c);}
 if(ui.paused){time.textContent=clock(elapsed())+' ⏸';}
}
function togglePause(){if(!ui||!ui.start)return;if(ui.paused){ui.pausedMs+=Date.now()-ui.pausedAt;ui.paused=false;}else{ui.paused=true;ui.pausedAt=Date.now();}drawLive();}
function advance(){
 if(!ui||ui.count>0||ui.paused)return;
 try{navigator.vibrate&&navigator.vibrate(25);}catch(e){}
 if(ui.i<ui.list.length-1){ui.i++;drawLive();return;}
 finish();
}
function finish(){
 const ms=elapsed();stopTimer();
 const st=S();if(!st.forgeChallenge)st.forgeChallenge={results:[]};if(!Array.isArray(st.forgeChallenge.results))st.forgeChallenge.results=[];
 const before=standing(st.forgeChallenge.results,ui.month,ui.level);
 const rec={id:newId(),wid:ui.w.id,month:ui.month,level:ui.level,ms,date:new Date().toISOString()};
 st.forgeChallenge.results.push(rec);
 let saved=true;try{persist();}catch(e){saved=false;st.forgeChallenge.results.pop();}
 const level=ui.level,w=ui.w;
 ui={mode:'result',level};
 root.className='forge-lb-ch';root.textContent='';
 const box=el('div','ch-result');
 const pr=!before.best||ms<before.best.ms;
 box.append(el('small','',w.name+' · '+LEVELS[level].label),el('b','',clock(ms)));
 if(!saved)box.append(el('p','','Speichern fehlgeschlagen – bitte Speicher prüfen.'));
 else if(!before.best)box.append(el('span','ch-pr','Deine erste Zeit!'),el('p','','Jetzt hast du den Monat Zeit, sie zu schlagen.'));
 else if(pr)box.append(el('span','ch-pr','Neue Bestzeit!'),el('p','',clock(before.best.ms-ms)+' schneller als vorher.'));
 else box.append(el('p','',clock(ms-before.best.ms)+' über deiner Bestzeit von '+clock(before.best.ms)+'. Nächstes Mal!'));
 const foot=el('div','ch-foot');foot.append(btn('ch-main','Fertig',()=>{ui={mode:'overview',level};drawOverview();}));
 root.append(box,foot);
 try{window.dispatchEvent(new CustomEvent('forge:challenge-changed'));}catch(e){}
}
/* Summary for the Erfolge card. */
function cardInfo(){
 const now=new Date(),w=workoutFor(now),lvl=(S()&&S().forgeChallenge&&S().forgeChallenge.level)||'std',st=standing(results(),monthKey(now),lvl);
 return {title:'Challenge '+now.toLocaleDateString('de-DE',{month:'long'})+' · '+w.name,
  sub:st.best?'Bestzeit '+clock(st.best.ms)+' · '+st.count+(st.count===1?' Versuch':' Versuche'):'Noch kein Versuch · '+daysLeft(now)+' Tage Zeit'};
}
function install(){if(!document.body||!enabled())return false;window.forgeOpenChallenge=open;window.forgeChallengeCard=cardInfo;return true;}
function boot(){if(install())return;let k=0;const t=setInterval(()=>{if(install()||++k>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
