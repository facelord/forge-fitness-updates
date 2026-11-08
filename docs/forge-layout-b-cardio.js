/* FORGE Layout B · Cardio live.
 * Workout › Cardio zeigt eine Startkarte (Sportart wählen, Starten, letzte
 * Aktivität, Minuten diese Woche). Die laufende Einheit ist ein Vollbild mit
 * großer Uhr, Pause/Weiter und Beenden. Danach: Dauer, Strecke (Tempo),
 * Schritte, Intensität und Notiz, Kalorien-Schätzung – Speichern.
 * Data: the record has exactly the shape of forgeCardioSave() in
 * state.cardioLogs; sports and MET values are the app's FORGE_SPORTS/FORGE_MET.
 * A running session survives a reload (state.forgeLbCardioRun).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const AMB='#ffb547';

/* ---------- pure helpers (tested) ---------- */
function elapsedMs(run,now){
 if(!run)return 0;
 const base=Math.max(0,Number(run.elapsedMs)||0);
 return base+(run.runningSince?Math.max(0,(now||Date.now())-run.runningSince):0);
}
function hms(ms){const s=Math.max(0,Math.floor(ms/1000));return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0')).join(':');}
function kcal(met,weight,mins){if(!(met>0)||!(weight>0)||!(mins>0))return null;return Math.round(met*3.5*weight/200*mins);}
function pace(km,ms){
 if(!(km>0)||!(ms>0))return '';
 const secPerKm=ms/1000/km;if(secPerKm>3600)return '';
 return Math.floor(secPerKm/60)+':'+String(Math.round(secPerKm%60)).padStart(2,'0').replace('60','59')+' min/km';
}
function speed(km,ms){if(!(km>0)||!(ms>0))return '';return (km/(ms/3600000)).toFixed(1).replace('.',',')+' km/h';}
function parseNum(text){const t=String(text==null?'':text).trim().replace(',','.');if(!t)return null;const n=Number(t);return Number.isFinite(n)?n:NaN;}
/* Same validation as forgeCardioSave(). */
function validate(input){
 if(!Number.isFinite(input.ms)||input.ms<60000||input.ms>86400000)return 'Bitte mindestens eine Minute Trainingszeit erfassen.';
 if(input.km!==null&&(!Number.isFinite(input.km)||input.km<0||input.km>1000))return 'Ungültige Strecke.';
 if(input.steps!==null&&(!Number.isInteger(input.steps)||input.steps<0||input.steps>150000))return 'Ungültige Schrittzahl.';
 if(input.weight!==null&&(!Number.isFinite(input.weight)||input.weight<20||input.weight>400))return 'Bitte ein gültiges Körpergewicht zwischen 20 und 400 kg eintragen.';
 return null;
}
function weekMinutes(logs,now){
 const d=new Date(now||Date.now());d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));
 return Math.round((logs||[]).filter(x=>new Date(x.date)>=d).reduce((a,x)=>a+(Number(x.durationMs)||0),0)/60000);
}
window.ForgeLayoutBCardio=Object.freeze({elapsedMs,hms,kcal,pace,speed,parseNum,validate,weekMinutes});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function sports(){try{return typeof FORGE_SPORTS!=='undefined'?FORGE_SPORTS:[];}catch(e){return [];}}
function metFor(sport,intensity){try{const m=(FORGE_MET[sport]||FORGE_MET.other);return m[{easy:0,moderate:1,hard:2}[intensity]??1];}catch(e){return null;}}
function lastWeight(){try{const w=state.weights&&state.weights.at(-1);return Number(w&&w.value)>0?Number(w.value):null;}catch(e){return null;}}
function sportInfo(key){const s=sports().find(x=>x[0]===key)||sports()[0]||['other','✨','Sport'];return {key:s[0],icon:s[1],name:s[2]};}
function selected(){try{if(typeof forgeSelectedSport!=='undefined'&&forgeSelectedSport)return forgeSelectedSport;}catch(e){}return 'running';}
function choose(key){try{if(typeof forgeCardioChoose==='function'){forgeCardioChoose(key);return;}}catch(e){}}
function run(){try{return state.forgeLbCardioRun||null;}catch(e){return null;}}
function setRun(r){state.forgeLbCardioRun=r;if(typeof save==='function')save();}
const STEP_SPORTS=new Set(['running','walking','hiking']);
const KM_SPORTS=new Set(['running','roadbike','walking','hiking','cycling','swimming','rowing','elliptical']);

const ICON={
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 play:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
 pause:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
 stop:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
 check:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>'
};
const K='.forge-lb-cardiostart',R='.forge-lb-cardiorun';
const CSS=`
body.forge-layout-b #forgeCardio > :not(.forge-mob-head):not(.forge-lb-cardiostart):not(details){display:none!important}
${K}{background:linear-gradient(160deg,#3a2c12,#171e2a 62%);border:1px solid #6a5328;border-radius:24px;padding:18px;margin:4px 0 14px;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:12px}
${K} .cs-kick{font-size:12px;color:${AMB};font-weight:800;text-transform:uppercase;letter-spacing:1.4px}
${K} h3{margin:0;font-size:22px;font-weight:800;color:#f3f7fc}
${K} .cs-sub{font-size:14px;color:#c3cddb;line-height:1.45}
${K} .cs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
${K} .cs-sport{min-height:64px;border-radius:16px;border:1px solid #293346;background:#0f1620;color:#f3f7fc;font:inherit;font-size:11px;font-weight:600;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px 2px;line-height:1.15;text-align:center}
${K} .cs-sport b{font-size:22px;font-weight:400}
${K} .cs-sport[aria-pressed="true"]{border:2px solid ${AMB};background:#2e2410;font-weight:800}
${K} .cs-more{border:0;background:transparent;color:${AMB};font:inherit;font-size:13px;font-weight:700;padding:4px;align-self:flex-start}
${K} .cs-go{height:60px;border-radius:30px;border:0;background:${AMB};color:#2a1a00;font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px}
${K} .cs-last{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:#c3cddb;background:#0f1620cc;border-radius:14px;padding:10px 12px}
${K} .cs-last b{color:#f3f7fc}
body.forge-layout-b #forgeCardio > details{margin-top:4px}
${R}{position:fixed;inset:0;z-index:2147480200;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
${R} .cr-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(16px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));gap:12px}
${R} .cr-top{display:flex;align-items:center;justify-content:space-between;min-height:44px}
${R} .cr-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${R} .cr-kicker{font-size:14px;color:#95a3b7;font-weight:600}
${R} .cr-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center}
${R} .cr-icon{width:96px;height:96px;border-radius:32px;background:#2e2410;border:1px solid #6a5328;display:flex;align-items:center;justify-content:center;font-size:48px}
${R} .cr-sport{font-size:22px;font-weight:800}
${R} .cr-clock{font-size:clamp(54px,18vw,84px);font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.02em;line-height:1}
${R} .cr-state{font-size:15px;font-weight:700;color:${AMB}}
${R} .cr-state.paused{color:#95a3b7}
${R} .cr-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%}
${R} .cr-stats div{background:#171e2a;border:1px solid #293346;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:2px}
${R} .cr-stats small{font-size:12px;color:#95a3b7}
${R} .cr-stats b{font-size:20px;font-weight:800}
${R} .cr-ctrl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:10px}
${R} .cr-stop{height:64px;border-radius:32px;border:1px solid #4a2630;background:#171e2a;color:#ffc6c6;font:inherit;font-size:17px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px}
${R} .cr-main{height:64px;border-radius:32px;border:0;background:${AMB};color:#2a1a00;font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px}
${R} .cr-head h2{margin:0;font-size:26px;font-weight:800}
${R} .cr-head p{margin:4px 0 0;font-size:14px;color:#c3cddb}
${R} .cr-body{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:12px;scrollbar-width:none;overscroll-behavior:contain}
${R} .cr-body::-webkit-scrollbar{display:none}
${R} .cr-card{flex:0 0 auto;background:#171e2a;border:1px solid #293346;border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:10px}
${R} .cr-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px}
${R} .cr-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
${R} .cr-field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#95a3b7}
${R} .cr-field input{height:50px;border-radius:14px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:17px;font-weight:700;padding:0 14px;box-sizing:border-box;width:100%}
${R} .cr-field input:focus{outline:2px solid ${AMB};outline-offset:1px}
${R} .cr-stepper{display:grid;grid-template-columns:50px minmax(0,1fr) 50px;align-items:center;background:#0f1620;border:1px solid #293346;border-radius:14px}
${R} .cr-stepper button{height:50px;border:0;background:transparent;color:#c3cddb;font:inherit;font-size:22px}
${R} .cr-stepper b{text-align:center;font-size:20px;font-weight:800}
${R} .cr-seg{height:48px;border-radius:24px;background:#0f1620;border:1px solid #293346;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:4px;gap:4px;box-sizing:border-box}
${R} .cr-seg button{border:0;border-radius:20px;background:transparent;color:#95a3b7;font:inherit;font-size:14px;font-weight:600}
${R} .cr-seg button[aria-checked="true"]{background:${AMB};color:#2a1a00;font-weight:800}
${R} .cr-est{font-size:14px;color:#c3cddb;line-height:1.45}
${R} .cr-est b{color:${AMB}}
${R} .cr-err{font-size:13px;color:#ffb4b8;text-align:center;margin:0;min-height:16px}
${R} .cr-sec{height:50px;border-radius:25px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
${R} button:focus-visible,${K} button:focus-visible{outline:2px solid ${AMB};outline-offset:2px}
.forge-lb-cardio-shade{position:fixed;inset:0;z-index:2147480400;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-cardio-sheet{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:12px 16px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box}
.forge-lb-cardio-sheet .h{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center}
.forge-lb-cardio-sheet strong{font-size:22px;font-weight:800}
.forge-lb-cardio-sheet p{margin:0;font-size:14px;color:#c3cddb;line-height:1.5}
.forge-lb-cardio-sheet .m{height:56px;border-radius:28px;border:0;background:${AMB};color:#2a1a00;font:inherit;font-size:17px;font-weight:800}
.forge-lb-cardio-sheet .s{height:50px;border-radius:25px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
.forge-lb-cardio-sheet .d{height:50px;border-radius:25px;border:1px solid #4a2630;background:transparent;color:#ffc6c6;font:inherit;font-size:15px;font-weight:700}
@media (max-height:700px){${R} .cr-icon{width:72px;height:72px;font-size:36px}${R} .cr-main,${R} .cr-stop{height:56px}}
`;
function ensureCss(){if(!$('forgeLayoutBCardioCss')){const s=el('style');s.id='forgeLayoutBCardioCss';s.textContent=CSS;document.head.append(s);}}

/* ---------- start card ---------- */
let showAll=false;
const MAIN=['running','cycling','walking','hiking','swimming','roadbike','elliptical','other'];
function renderCard(){
 if(!enabled())return;
 const host=$('forgeCardio');if(!host)return;
 ensureCss();
 let card=host.querySelector(':scope > .forge-lb-cardiostart');
 if(!card){card=el('section','forge-lb-cardiostart');const head=host.querySelector(':scope > .forge-mob-head');if(head)head.after(card);else host.prepend(card);}
 card.replaceChildren();
 const sel=selected(),info=sportInfo(sel);
 const logs=Array.isArray(state.cardioLogs)?state.cardioLogs:[];
 card.append(el('div','cs-kick','Cardio & Sport'),el('h3','',run()?'Aktivität läuft':'Was machst du heute?'));
 const g=el('div','cs-grid');g.setAttribute('role','radiogroup');g.setAttribute('aria-label','Sportart');
 const list=showAll?sports():sports().filter(s=>MAIN.includes(s[0])||s[0]===sel);
 list.forEach(([key,icon,name])=>{
  const b=btn('cs-sport','',()=>{choose(key);renderCard();});b.setAttribute('role','radio');b.setAttribute('aria-pressed',String(key===sel));b.setAttribute('aria-checked',String(key===sel));
  b.append(el('b','',icon),document.createTextNode(name));g.append(b);
 });
 card.append(g);
 if(sports().length>list.length||showAll)card.append(btn('cs-more',showAll?'Weniger Sportarten':'Alle '+sports().length+' Sportarten',()=>{showAll=!showAll;renderCard();}));
 const go=btn('cs-go','',startRun);go.innerHTML=ICON.play+'<span>'+(run()?'Zur laufenden Aktivität':info.name+' starten')+'</span>';card.append(go);
 const week=weekMinutes(logs);
 if(logs.length){
  const l=logs[logs.length-1];const r=el('div','cs-last');
  const a=el('span');a.append(document.createTextNode('Zuletzt: '),el('b','',l.title||'Sport'),document.createTextNode(' · '+Math.round((Number(l.durationMs)||0)/60000)+' Min.'+(l.km!=null?' · '+String(l.km).replace('.',',')+' km':'')));
  r.append(a,el('span','',week+' Min. diese Woche'));card.append(r);
 }else card.append(el('div','cs-sub','Die Uhr läuft weiter, auch wenn du die App kurz verlässt. Strecke und Schritte trägst du am Ende ein.'));
}

/* ---------- live session ---------- */
let root=null,timer=null,wake=null,form=null;
function startRun(){
 if(!enabled())return;
 if(!run()){const s=selected();setRun({sport:s,startedAt:Date.now(),elapsedMs:0,runningSince:Date.now(),phase:'run'});}
 openRun();
}
function openRun(){
 ensureCss();
 if(!root){root=el('div','forge-lb-cardiorun');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Cardio');document.body.append(root);}
 try{navigator.wakeLock?.request('screen').then(w=>{wake=w;}).catch(()=>{});}catch(e){}
 if(!timer)timer=setInterval(tick,500);
 render();
}
function closeRun(){
 if(timer){clearInterval(timer);timer=null;}
 try{wake?.release?.();}catch(e){}wake=null;form=null;closeSheet();
 if(root){root.remove();root=null;}
 renderCard();
}
function tick(){
 const r=run();if(!root||!r||r.phase!=='run')return;
 const ms=elapsedMs(r);
 const c=root.querySelector('.cr-clock');if(c)c.textContent=hms(ms);
 const k=root.querySelector('[data-k="kcal"]');if(k){const v=kcal(metFor(r.sport,'moderate'),lastWeight(),ms/60000);k.textContent=v==null?'–':String(v);}
 const m=root.querySelector('[data-k="min"]');if(m)m.textContent=String(Math.floor(ms/60000));
}
function toggle(){
 const r=run();if(!r)return;
 if(r.runningSince){r.elapsedMs=elapsedMs(r);r.runningSince=null;}else r.runningSince=Date.now();
 setRun(r);render();
}
function toFinish(){
 const r=run();if(!r)return;
 if(r.runningSince){r.elapsedMs=elapsedMs(r);r.runningSince=null;}
 r.phase='finish';setRun(r);form=null;render();
}
function render(){
 const r=run();if(!root)return;if(!r){closeRun();return;}
 root.replaceChildren();
 const inner=el('div','cr-in');root.append(inner);
 const info=sportInfo(r.sport);
 if(r.phase==='finish'){renderFinish(inner,r,info);return;}
 const top=el('div','cr-top');
 const x=btn('cr-round','',()=>{closeRun();});x.innerHTML=ICON.x;x.setAttribute('aria-label','Minimieren – die Uhr läuft weiter');
 top.append(x,el('div','cr-kicker','Cardio'),el('div',''));top.lastChild.style.width='44px';inner.append(top);
 const hero=el('div','cr-hero');
 hero.append(el('div','cr-icon',info.icon),el('div','cr-sport',info.name),el('div','cr-clock',hms(elapsedMs(r))),el('div','cr-state'+(r.runningSince?'':' paused'),r.runningSince?'Läuft':'Pausiert'));
 const st=el('div','cr-stats');
 const a=el('div');a.append(el('small','','Minuten'));const am=el('b','','0');am.dataset.k='min';a.append(am);
 const b=el('div');b.append(el('small','','kcal (geschätzt)'));const bk=el('b','','–');bk.dataset.k='kcal';b.append(bk);
 st.append(a,b);hero.append(st);inner.append(hero);
 const ctrl=el('div','cr-ctrl');
 const stop=btn('cr-stop','',toFinish);stop.innerHTML=ICON.stop+'<span>Beenden</span>';
 const main=btn('cr-main','',toggle);main.innerHTML=(r.runningSince?ICON.pause:ICON.play)+'<span>'+(r.runningSince?'Pause':'Weiter')+'</span>';
 ctrl.append(stop,main);inner.append(ctrl);
 tick();
}
function renderFinish(inner,r,info){
 if(!form)form={mins:Math.max(1,Math.round(elapsedMs(r)/60000)),km:'',steps:'',intensity:'moderate',note:'',weight:lastWeight(),error:''};
 const head=el('div','cr-head');head.append(el('h2','',info.icon+' '+info.name+' beendet'),el('p','','Gemessen: '+hms(elapsedMs(r))+' – ergänze, was du weißt.'));inner.append(head);
 const body=el('div','cr-body');inner.append(body);
 const c1=el('div','cr-card');c1.append(el('div','cr-label','Dauer (Minuten)'));
 const stp=el('div','cr-stepper');const minus=btn('','−',()=>{form.mins=Math.max(1,form.mins-1);upd();});const plus=btn('','+',()=>{form.mins=Math.min(1440,form.mins+1);upd();});
 minus.setAttribute('aria-label','Eine Minute weniger');plus.setAttribute('aria-label','Eine Minute mehr');
 const mv=el('b','',String(form.mins));stp.append(minus,mv,plus);c1.append(stp);body.append(c1);
 const c2=el('div','cr-card');
 const row=el('div','cr-row');
 const field=(label,key,mode,ph)=>{const f=el('label','cr-field');f.append(document.createTextNode(label));const i=el('input');i.type='text';i.inputMode=mode;i.placeholder=ph;i.value=form[key]||'';i.addEventListener('input',()=>{form[key]=i.value;upd(true);});f.append(i);return f;};
 if(KM_SPORTS.has(r.sport))row.append(field('Strecke (km)','km','decimal','z. B. 5,2'));
 if(STEP_SPORTS.has(r.sport))row.append(field('Schritte','steps','numeric','optional'));
 if(row.children.length){c2.append(el('div','cr-label','Optional'),row);}
 const pv=el('div','cr-est');c2.append(pv);
 if(row.children.length)body.append(c2);
 const c3=el('div','cr-card');c3.append(el('div','cr-label','Wie anstrengend war es?'));
 const seg=el('div','cr-seg');seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label','Intensität');
 [['easy','Locker'],['moderate','Normal'],['hard','Intensiv']].forEach(([v,t])=>{const b=btn('',t,()=>{form.intensity=v;seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-checked',String(x===b)));upd();});b.setAttribute('role','radio');b.setAttribute('aria-checked',String(form.intensity===v));seg.append(b);});
 c3.append(seg);
 if(!lastWeight()){const f=field('Körpergewicht (kg) für die Kalorien','weight','decimal','z. B. 80');c3.append(f);}
 const ke=el('div','cr-est');c3.append(ke);body.append(c3);
 const c4=el('div','cr-card');const nf=el('label','cr-field');nf.append(document.createTextNode('Notiz (optional)'));const ni=el('input');ni.type='text';ni.maxLength=120;ni.placeholder='z. B. lockere Runde';ni.value=form.note;ni.addEventListener('input',()=>{form.note=ni.value;});nf.append(ni);c4.append(nf);body.append(c4);
 const err=el('p','cr-err',form.error);err.setAttribute('role','status');inner.append(err);
 const save=btn('cr-main','',saveRun);save.innerHTML=ICON.check+'<span>Speichern</span>';inner.append(save);
 inner.append(btn('cr-sec','Weiter aufzeichnen',()=>{const r2=run();r2.phase='run';r2.runningSince=Date.now();setRun(r2);form=null;render();}));
 const discard=btn('cr-sec','Verwerfen',askDiscard);discard.style.color='#ffc6c6';discard.style.borderColor='#4a2630';inner.append(discard);
 function upd(soft){
  mv.textContent=String(form.mins);
  const km=parseNum(form.km),ms=form.mins*60000;
  pv.textContent=km>0?'Tempo '+pace(km,ms)+' · '+speed(km,ms):'Mit Strecke siehst du Tempo und Geschwindigkeit.';
  const w=lastWeight()||parseNum(form.weight);
  const k=kcal(metFor(r.sport,form.intensity),w,form.mins);
  ke.innerHTML='';
  if(k!=null){ke.append(document.createTextNode('≈ '));ke.append(el('b','',k+' kcal'));ke.append(document.createTextNode(' geschätzt (MET '+metFor(r.sport,form.intensity)+(w?' · '+w+' kg':'')+')'));}
  else ke.textContent='Für die Kalorien-Schätzung fehlt dein Körpergewicht.';
  if(!soft&&form.error){form.error='';err.textContent='';}
 }
 upd();
}
function saveRun(){
 const r=run();if(!r||!form)return;
 const km=parseNum(form.km),steps=parseNum(form.steps),wIn=lastWeight()?null:parseNum(form.weight);
 const input={ms:form.mins*60000,km:km===null?null:km,steps:steps===null?null:steps,weight:wIn===null?null:wIn};
 const issue=validate(input);
 if(issue){form.error=issue;render();return;}
 const info=sportInfo(r.sport);
 const weight=lastWeight()||input.weight;
 const met=metFor(r.sport,form.intensity);
 const k=kcal(met,weight,form.mins);
 const logs=Array.isArray(state.cardioLogs)?state.cardioLogs:[];
 const rec={id:'cardio-'+Date.now(),date:new Date().toISOString(),sport:r.sport,title:info.name,durationMs:Math.round(input.ms),km:input.km,steps:input.steps,
  avgHr:null,maxHr:null,kcalEstimate:k,met:k!=null?met:null,weightKg:k!=null?weight:null,intensity:form.intensity,note:String(form.note||'').trim().slice(0,120)};
 try{
  state.cardioLogs=logs.concat(rec);state.forgeLbCardioRun=null;
  if(typeof save==='function')save();
 }catch(e){
  console.error('FORGE Cardio speichern',e);state.cardioLogs=logs;state.forgeLbCardioRun=r;
  form.error='Speichern fehlgeschlagen. Bitte erneut versuchen.';render();return;
 }
 try{if(typeof window.render==='function')window.render();}catch(e){}
 closeRun();
 try{if(typeof window.go==='function')window.go('workout');document.querySelector('#forge150WorkoutModes button[data-mode="cardio"]')?.click();
  let n=document.querySelector('.forge-lb-cardiostart');while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}
  setTimeout(()=>document.querySelector('.forge-lb-cardiostart')?.scrollIntoView?.({block:'start'}),80);}catch(e){}
 toast(info.name+' gespeichert · '+form_mins(rec)+' Min.');
}
function form_mins(rec){return Math.round(rec.durationMs/60000);}
function toast(text){
 const t=el('div','',text);t.setAttribute('role','status');
 t.style.cssText='position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147480900;background:#171e2a;border:1px solid #6a5328;color:#f3f7fc;border-radius:22px;padding:12px 18px;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 10px 28px #000a';
 document.body.append(t);setTimeout(()=>t.remove(),2400);
}
let sheet=null;
function closeSheet(){if(sheet){sheet.remove();sheet=null;}}
function askDiscard(){
 closeSheet();
 const shade=el('div','forge-lb-cardio-shade');shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-label','Aktivität verwerfen?');
 const s=el('div','forge-lb-cardio-sheet');shade.append(s);shade.addEventListener('click',e=>{if(e.target===shade)closeSheet();});
 s.append(el('div','h'),el('strong','','Aktivität verwerfen?'),el('p','','Die gemessene Zeit wird nicht gespeichert.'));
 s.append(btn('d','Verwerfen',()=>{closeSheet();setRun(null);closeRun();}),btn('s','Zurück',closeSheet));
 document.body.append(shade);sheet=shade;
}

/* ---------- install ---------- */
function install(){
 if(!document.body||!enabled())return false;
 if(typeof window.renderForgeCardio==='function'&&!window.renderForgeCardio.__forgeLB){
  const prev=window.renderForgeCardio;
  const f=function(){const out=prev.apply(this,arguments);try{renderCard();}catch(e){console.error('FORGE B Cardio',e);}return out;};
  f.__forgeLB=true;window.renderForgeCardio=f;
 }
 renderCard();
 const r=run();if(r)openRun();
 window.ForgeLayoutBCardioStart=startRun;
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
