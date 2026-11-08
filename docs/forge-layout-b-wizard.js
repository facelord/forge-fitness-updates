/* FORGE Layout B · Plan-Assistent als Fenster (Design P2–P5 + Mobilität).
 * Ein Vollbild-Fenster, ein paar Fragen pro Seite, „Weiter“ – kein Scrollen.
 * Kraft:     Vorschlag / Selbst → Ziel, Ort, Erfahrung → Aufteilung → Rhythmus → Name & Erstellen
 * Mobilität: Automatisch / Individuell → Routine bzw. Übungen → Wann & Tage → Speichern
 * Data: the strength plan is produced by the app's own generator (generatePlan,
 * incl. cadence engine) after the wizard fills its original controls. The
 * mobility plan is stored exactly like saveMobility() does; the individual mix
 * uses forgePlusToggleMobilityMix (exercise-plus). No new data model.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ACC='#a9f267',TEAL='#5ee0c8';
const DAYS=Object.freeze(['Mo','Di','Mi','Do','Fr','Sa','So']);
const GOALS=Object.freeze([['muscle','Muskelaufbau'],['strength','Kraft'],['fitness','Allgemeine Fitness'],['fatloss','Fettabbau']]);
const PLACES=Object.freeze([['both','Studio & Zuhause'],['gym','Fitnessstudio'],['home','Zuhause']]);
const LEVELS=Object.freeze([['beginner','Einsteiger'],['intermediate','Fortgeschritten']]);
const SPLITS=Object.freeze([
 ['full','Ganzkörper','Alle großen Muskelgruppen in jeder Einheit.'],
 ['pushpull','Push / Pull','Drücken und Ziehen im Wechsel.'],
 ['upperlower','Oberkörper / Unterkörper','Oberkörper und Beine im Wechsel.'],
 ['ppl','Push / Pull / Legs','Drei Einheiten im Wechsel.'],
 ['mixed','Push / Pull / Beine / Ganzkörper','Vier Einheiten im Wechsel.']]);
const TIMINGS=Object.freeze([['rest','An Ruhetagen','Eigene kurze Einheit an trainingsfreien Tagen'],['after','Nach dem Training','Direkt im Anschluss an dein Krafttraining'],['both','Beides','Ruhetage und nach dem Training']]);

/* ---------- pure helpers (tested) ---------- */
/* Evenly spread n training days over Mo–So (index 0 = Mo). */
function spreadDays(n){
 n=Math.max(1,Math.min(6,Number(n)||3));
 const table={1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,4,5],6:[0,1,2,3,4,5]};
 return table[n].slice();
}
function toggleDay(list,day,max){
 const set=new Set(list||[]);
 if(set.has(day)){if(set.size<=1)return [...set].sort((a,b)=>a-b);set.delete(day);}
 else{if(set.size>=(max||6))return [...set].sort((a,b)=>a-b);set.add(day);}
 return [...set].sort((a,b)=>a-b);
}
function label(list,value){const x=(list||[]).find(e=>e[0]===value);return x?x[1]:'';}
function ownRhythmText(s){
 if(s.mmode==='interval')return 'Alle '+s.mevery+' '+(s.mevery===1?'Tag':'Tage')+' · '+s.munits+' '+(s.munits===1?'Einheit':'Einheiten im Wechsel');
 return (s.mdays||[]).map(d=>DAYS[d]).join(' · ');
}
function everyOptions(current){const base=[2,3,4,5,7];if(Number.isInteger(current)&&current>=1&&current<=14&&!base.includes(current))base.push(current);return base.sort((a,b)=>a-b);}
function rhythmText(s){
 if(s.mode==='interval')return 'Alle '+s.every+' '+(s.every===1?'Tag':'Tage')+' · '+s.units+' '+(s.units===1?'Einheit':'Einheiten')+' im Wechsel';
 return (s.days||[]).map(d=>DAYS[d]).join(' · ');
}
function strengthSummary(s){
 return [['Ziel',label(GOALS,s.goal)],['Trainingsort',label(PLACES,s.place)],['Erfahrung',label(LEVELS,s.level)],['Aufteilung',label(SPLITS,s.split)],['Rhythmus',rhythmText(s)]];
}
function strengthSteps(s){return s.how==='manual'?['how','mdays','mname']:['how','basics','split','rhythm','create'];}
function mobilitySteps(m){return ['how',m.how==='custom'?'pick':'routine','when','save'];}
function canContinue(kind,step,s){
 if(kind==='strength'){
  if(step==='how')return s.how==='auto'||s.how==='manual';
  if(step==='basics')return !!(s.goal&&s.place&&s.level);
  if(step==='split')return !!s.split;
  if(step==='mdays')return s.mmode==='interval'?(s.mevery>=1&&s.mevery<=14&&s.munits>=1&&s.munits<=6&&!!s.manchor):(s.mdays||[]).length>=1&&(s.mdays||[]).length<=7;
  if(step==='rhythm')return s.mode==='interval'?(s.every>=1&&s.every<=14&&s.units>=1&&s.units<=4&&!!s.anchor):(s.days||[]).length>=1;
  return true;
 }
 if(step==='how')return s.how==='auto'||s.how==='custom';
 if(step==='routine')return !!s.routine;
 if(step==='pick')return (s.picked||[]).length>0;
 if(step==='when')return s.timing==='after'||(s.days||[]).length>0;
 return true;
}
window.ForgeLayoutBWizard=Object.freeze({ownRhythmText,everyOptions,spreadDays,toggleDay,rhythmText,strengthSummary,strengthSteps,mobilitySteps,canContinue});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function localDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const ICON={
 back:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 spark:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/></svg>',
 pen:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16z"/></svg>',
 dumbbell:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/></svg>',
 flow:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M12 7v6M7 10l5 3 5-3M9 21l3-8 3 8"/></svg>',
 check:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>'
};

const W='.forge-lb-wiz';
const CSS=`
${W}{position:fixed;inset:0;z-index:2147481000;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;--wa:${ACC};--won:#142016;--wtint:#1a2a22;--wedge:#405d39;--wgrad:#273d2d}
${W}.mob{--wa:${TEAL};--won:#062420;--wtint:#14302d;--wedge:#2f6a62;--wgrad:#1d3b3a}
${W} .wz-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(16px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom))}
${W} .wz-top{display:flex;align-items:center;gap:12px;min-height:44px}
${W} .wz-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${W} .wz-prog{flex:1;display:flex;gap:6px}
${W} .wz-prog i{flex:1;height:5px;border-radius:3px;background:#293346;display:block}
${W} .wz-prog i.on{background:var(--wa)}
${W} .wz-count{font-size:13px;color:#95a3b7;font-weight:600;min-width:28px;text-align:right}
${W} .wz-kicker{flex:1;text-align:center;font-size:14px;color:#95a3b7;font-weight:600}
${W} .wz-head{padding:18px 6px 4px}
${W} .wz-head h2{margin:0;font-size:clamp(23px,7vw,28px);font-weight:800;line-height:1.15;letter-spacing:-.01em;color:#f3f7fc}
${W} .wz-head p{margin:6px 0 0;font-size:14px;color:#c3cddb;line-height:1.45}
${W} .wz-body{flex:1;min-height:0;overflow-y:auto;padding:14px 0 8px;display:flex;flex-direction:column;gap:14px;scrollbar-width:none}
${W} .wz-body::-webkit-scrollbar{display:none}
${W} .wz-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding-left:4px;margin-bottom:8px}
${W} .wz-grid{display:grid;gap:8px}
${W} .wz-grid.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
${W} .wz-grid.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
${W} .wz-grid.c4{grid-template-columns:repeat(4,minmax(0,1fr))}
${W} .wz-grid.c5{grid-template-columns:repeat(5,minmax(0,1fr))}
${W} .wz-grid.c7{grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
${W} .wz-opt{min-height:50px;border-radius:16px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:600;padding:8px 10px;line-height:1.2}
${W} .wz-opt.sm{font-size:13px}
${W} .wz-opt[aria-pressed="true"],${W} .wz-opt[aria-checked="true"]{border:2px solid var(--wa);background:var(--wtint);font-weight:800}
${W} .wz-opt.day[aria-pressed="true"]{background:var(--wa);color:var(--won);border-color:var(--wa)}
${W} .wz-row{min-height:58px;border-radius:16px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;text-align:left;padding:10px 14px;display:flex;flex-direction:column;justify-content:center;gap:3px}
${W} .wz-row b{font-size:15px;font-weight:700}
${W} .wz-row small{font-size:12px;color:#95a3b7;line-height:1.35}
${W} .wz-row[aria-checked="true"],${W} .wz-row[aria-pressed="true"]{border:2px solid var(--wa);background:var(--wtint)}
${W} .wz-row[aria-checked="true"] small,${W} .wz-row[aria-pressed="true"] small{color:#c3cddb}
${W} .wz-big{flex:1;min-height:150px;max-height:250px;border-radius:28px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;text-align:left;padding:22px;display:flex;flex-direction:column;justify-content:space-between;gap:14px}
${W} .wz-big i{width:52px;height:52px;border-radius:16px;background:#202a38;display:flex;align-items:center;justify-content:center}
${W} .wz-big b{display:block;font-size:22px;font-weight:800}
${W} .wz-big small{display:block;font-size:14px;color:#95a3b7;line-height:1.45;margin-top:6px}
${W} .wz-big[aria-pressed="true"]{border:2px solid var(--wa);background:linear-gradient(160deg,var(--wgrad),#171e2a 65%)}
${W} .wz-big[aria-pressed="true"] i{background:var(--wa);color:var(--won)}
${W} .wz-big[aria-pressed="true"] small{color:#c3cddb}
${W} .wz-big.mob:not([aria-pressed="true"]) i{color:${TEAL}}
${W} .wz-seg{height:54px;border-radius:27px;background:#171e2a;border:1px solid #293346;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:5px;box-sizing:border-box;gap:4px}
${W} .wz-seg button{border:0;border-radius:22px;background:transparent;color:#95a3b7;font:inherit;font-size:15px;font-weight:600}
${W} .wz-seg button[aria-checked="true"]{background:var(--wa);color:var(--won);font-weight:800}
${W} .wz-card,${W} .wz-seg,${W} .wz-sum,${W} .wz-field,${W} .wz-body>div{flex-shrink:0}
${W} .wz-card{background:#171e2a;border:1px solid #293346;border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:10px}
${W} .wz-link{height:44px;border-radius:14px;border:1px solid #293346;background:transparent;color:#f3f7fc;font:inherit;font-size:14px;font-weight:600}
${W} .wz-note{font-size:13px;color:#95a3b7;line-height:1.5;padding:0 6px;margin:0}
${W} .wz-sum{border-radius:24px;background:linear-gradient(160deg,var(--wgrad),#171e2a 65%);border:1px solid var(--wedge);padding:18px;display:flex;flex-direction:column;gap:10px}
${W} .wz-sum small{font-size:13px;color:var(--wa);font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
${W} .wz-sum div{display:flex;justify-content:space-between;gap:12px;font-size:15px}
${W} .wz-sum div span{color:#c3cddb}
${W} .wz-sum div b{text-align:right}
${W} .wz-field{display:flex;flex-direction:column;gap:8px}
${W} .wz-field input,${W} .wz-field select{height:54px;border-radius:16px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:16px;padding:0 16px;box-sizing:border-box;width:100%}
${W} .wz-field input:focus,${W} .wz-field select:focus{outline:2px solid var(--wa);outline-offset:1px}
${W} .wz-chips{flex:0 0 auto;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
${W} .wz-chips::-webkit-scrollbar{display:none}
${W} .wz-chip{flex:0 0 auto;height:38px;border-radius:19px;border:1px solid #293346;background:#171e2a;color:#c3cddb;font:inherit;font-size:13px;font-weight:600;padding:0 12px}
${W} .wz-chip[aria-pressed="true"]{background:var(--wa);color:var(--won);border-color:var(--wa);font-weight:800}
${W} .wz-list{flex:0 0 auto;display:flex;flex-direction:column;gap:8px}
${W} .wz-ex{display:flex;align-items:center;gap:12px;min-height:60px;border-radius:16px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;text-align:left;padding:8px 12px}
${W} .wz-ex span{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
${W} .wz-ex b{font-size:15px;font-weight:700}
${W} .wz-ex small{font-size:12px;color:#95a3b7}
${W} .wz-ex i{width:28px;height:28px;flex:0 0 28px;border-radius:14px;border:2px solid #3a4556;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:var(--won)}
${W} .wz-ex[aria-pressed="true"]{border-color:var(--wa)}
${W} .wz-ex[aria-pressed="true"] i{background:var(--wa);border-color:var(--wa)}
${W} .wz-foot{display:flex;flex-direction:column;gap:10px;padding-top:8px}
${W} .wz-error{font-size:13px;color:#ffb4b8;text-align:center;margin:0}
${W} .wz-next{height:64px;border-radius:32px;border:0;background:var(--wa);color:var(--won);font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px}
${W} .wz-next:disabled{opacity:.45}
${W} .wz-sec{height:52px;border-radius:26px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:16px;font-weight:700}
${W} .wz-done{flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px}
${W} .wz-done-icon{width:72px;height:72px;border-radius:24px;background:var(--wa);color:var(--won);display:flex;align-items:center;justify-content:center}
${W} button:focus-visible{outline:2px solid var(--wa);outline-offset:2px}
@media (max-height:700px){${W} .wz-opt{min-height:44px}${W} .wz-row{min-height:50px}${W} .wz-head{padding-top:10px}${W} .wz-next{height:56px}}
`;

/* ---------- state per session ---------- */
let root=null,flow=null;
function defaultsStrength(){
 const v=id=>$(id)?.value;
 let days=spreadDays(3);
 try{if(typeof chosenDays==='function'){const d=chosenDays();if(Array.isArray(d)&&d.length)days=d.slice().sort((a,b)=>a-b);}}catch(e){}
 let cad=null;try{cad=typeof state!=='undefined'&&state.settings&&state.settings.cadence&&state.settings.cadence.mode==='interval'&&state.plan.length?state.settings.cadence:null;}catch(e){}
 const out={kind:'strength',how:'auto',goal:v('goal')||'muscle',place:v('place')||'gym',level:v('level')||'beginner',split:v('split')||'full',
  mode:'weekdays',days,every:3,units:3,anchor:localDate(new Date()),name:'',
  mdays:days.slice(),mplace:v('place')==='home'?'home':'gym',mmode:'weekdays',mevery:3,munits:3,manchor:localDate(new Date())};
 // Keep the rhythm the person already trains with (e.g. every 4 days).
 if(cad&&Number.isInteger(cad.every)){
  const n=Array.isArray(cad.planOrder)?cad.planOrder.length:3;
  out.mode='interval';out.every=cad.every;out.units=Math.max(1,Math.min(4,n));
  out.mmode='interval';out.mevery=cad.every;out.munits=Math.max(1,Math.min(6,n));
 }
 return out;
}
function defaultsMobility(){
 let cfg={};try{cfg=typeof mobConfig==='function'?mobConfig():{};}catch(e){}
 let rest=[];try{rest=typeof mobRestSuggestion==='function'?mobRestSuggestion():[];}catch(e){}
 let picked=[];try{picked=typeof window.forgePlusMobilityMixNames==='function'?window.forgePlusMobilityMixNames():[];}catch(e){}
 return {kind:'mobility',how:cfg.routine==='forge-custom'?'custom':'auto',routine:cfg.routine&&cfg.routine!=='forge-custom'?cfg.routine:'gentle',
  picked,timing:cfg.timing||'rest',days:(cfg.weekdays&&cfg.weekdays.length?cfg.weekdays:rest).slice(),region:'Alle'};
}
function steps(){
 if(!flow.kind)return ['type'];
 const list=flow.kind==='strength'?strengthSteps(flow.s):mobilitySteps(flow.s);
 return flow.fromType?['type',...list]:list;
}

/* ---------- open / close ---------- */
function open(kind){
 if(!enabled())return false;
 if(typeof state!=='undefined'&&state&&state.activeWorkout){
  // Same guard as the generator: no plan change during a running workout.
  flow={kind:null,s:{},step:0,fromType:false,error:'Bitte zuerst dein laufendes Workout abschließen.'};
 }else{
  flow={kind:kind||null,s:kind==='mobility'?defaultsMobility():kind==='strength'?defaultsStrength():{},step:0,fromType:!kind,error:''};
 }
 if(!$('forgeLayoutBWizardStyle')){const st=el('style');st.id='forgeLayoutBWizardStyle';st.textContent=CSS;document.head.append(st);}
 close();
 root=el('div','forge-lb-wiz');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 document.body.append(root);
 document.addEventListener('keydown',onKey,true);
 render();
 return true;
}
function close(){if(root){root.remove();root=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key==='Escape'){e.preventDefault();back();}}
function back(){
 if(!flow||flow.done){close();return;}
 flow.error='';
 if(flow.step>0){flow.step--;if(steps()[flow.step]==='type'){flow.kind=null;}render();return;}
 close();
}
function next(){
 const list=steps(),step=list[flow.step];
 flow.error='';
 if(step==='type'){return;}
 if(!canContinue(flow.kind,step,flow.s)){render();return;}
 if(step==='mname'){openOwnPlan();return;}
 if(step==='create'){createStrength();return;}
 if(step==='save'){saveMobilityPlan();return;}
 flow.step++;render();
}
function chooseType(kind){
 flow.kind=kind;flow.s=kind==='mobility'?defaultsMobility():defaultsStrength();
 flow.step=1;render();
}

/* ---------- actions on the app ---------- */
function setSelect(id,value){const s=$(id);if(!s)return false;s.value=String(value);s.dispatchEvent(new Event('change',{bubbles:true}));return s.value===String(value);}
function withAlerts(fn){
 const prev=window.alert,msgs=[];
 window.alert=m=>{msgs.push(String(m));};
 try{fn();}finally{window.alert=prev;}
 return msgs;
}
function createStrength(){
 const s=flow.s;
 setSelect('goal',s.goal);setSelect('place',s.place);setSelect('level',s.level);setSelect('split',s.split);
 const cad=$('forgeCadenceAuto');
 const modeSel=cad?.querySelector('[data-forge-cadence-mode]');
 if(modeSel){modeSel.value=s.mode;modeSel.dispatchEvent(new Event('change',{bubbles:true}));}
 if(s.mode==='interval'){
  const every=cad?.querySelector('[data-forge-cadence-every]');if(every){every.value=String(s.every);every.dispatchEvent(new Event('change',{bubbles:true}));}
  const anchor=cad?.querySelector('[data-forge-cadence-anchor]');if(anchor){anchor.value=s.anchor;anchor.dispatchEvent(new Event('change',{bubbles:true}));}
  setSelect('days',s.units);
  const unit=$('forgePlanV2NewUnitCount');if(unit){unit.value=String(s.units);}
 }else{
  setSelect('days',s.days.length);
  try{selectedTrainingDays=s.days.slice();if(typeof renderDayChoices==='function')renderDayChoices();}catch(e){}
 }
 const name=$('generatedPlanName');if(name)name.value=s.name||'';
 const before=typeof state!=='undefined'?state.activePlanId:null;
 const msgs=withAlerts(()=>{if(typeof window.generatePlan==='function')window.generatePlan();});
 if(state.activePlanId&&state.activePlanId!==before){
  flow.done={title:'Dein Plan ist bereit',text:(state.activePlanName||'Neuer Plan')+' · '+state.plan.length+' '+(state.plan.length===1?'Einheit':'Einheiten'),rows:strengthSummary(s)};
  try{typeof renderPlan==='function'&&renderPlan();}catch(e){}
 }else{
  flow.error=msgs.find(m=>!/Neuer/.test(m))||'Der Plan konnte nicht erstellt werden.';
 }
 render();
}
/* „Individuell“: rhythm and place here, exercises in the unit editor (P6/P7). */
function openOwnPlan(){
 const s=flow.s;
 if(typeof window.ForgeLayoutBEditorDraft!=='function'){flow.error='Der Plan-Editor ist noch nicht geladen. Bitte erneut versuchen.';render();return;}
 const opened=window.ForgeLayoutBEditorDraft({mode:s.mmode,days:s.mdays,every:s.mevery,units:s.munits,anchor:s.manchor,location:s.mplace,name:s.name});
 if(opened)close();else{flow.error='Der Plan-Editor konnte nicht geöffnet werden.';render();}
}
function saveMobilityPlan(){
 const m=flow.s;
 if(m.how==='custom'){
  const now=typeof window.forgePlusMobilityMixNames==='function'?window.forgePlusMobilityMixNames():[];
  const want=new Set(m.picked);
  if(typeof window.forgePlusToggleMobilityMix==='function'){
   now.filter(n=>!want.has(n)).forEach(n=>window.forgePlusToggleMobilityMix(n));
   m.picked.filter(n=>!now.includes(n)).forEach(n=>window.forgePlusToggleMobilityMix(n));
  }
 }
 const routine=m.how==='custom'?'forge-custom':m.routine;
 try{
  const old=typeof mobConfig==='function'?mobConfig():{logs:[]};
  // Same record as saveMobility(); the separate strength plan stays unchanged.
  state.mobility={...old,enabled:true,routine,timing:m.timing,weekdays:m.timing==='after'?(old.weekdays||[]):m.days.slice().sort((a,b)=>a-b),logs:old.logs||[]};
  try{mobSelectedDays=state.mobility.weekdays.slice();}catch(e){}
  const sel=$('mobRoutine');if(sel){if(![...sel.options].some(o=>o.value===routine)){const o=el('option','',routine);o.value=routine;sel.append(o);}sel.value=routine;}
  const t=$('mobTiming');if(t)t.value=m.timing;
  if(typeof save==='function')save();
  if(typeof window.render==='function')try{window.render();}catch(e){}
  const r=typeof MOB_ROUTINES!=='undefined'?MOB_ROUTINES[routine]:null;
  flow.done={title:'Mobilitätsplan gespeichert',text:(r?.name||'Mobilität')+' · '+(r?.items?.length||m.picked.length)+' Übungen',
   rows:[['Wann',label(TIMINGS,m.timing)],...(m.timing==='after'?[]:[['Tage',m.days.map(d=>DAYS[d]).join(' · ')]]),['Krafttraining','bleibt unverändert']]};
 }catch(e){flow.error='Der Mobilitätsplan konnte nicht gespeichert werden.';}
 render();
}

/* ---------- mobility library ---------- */
let mobLib=null;
function loadMobLib(){
 if(mobLib)return Promise.resolve(mobLib);
 return fetch('./exercise-plus-data.json',{cache:'force-cache'}).then(r=>r.json()).then(d=>{mobLib=Array.isArray(d.mobility)?d.mobility:[];return mobLib;}).catch(()=>{mobLib=[];return mobLib;});
}

/* ---------- rendering ---------- */
function opt(text,on,fn,cls){const b=el('button','wz-opt'+(cls?' '+cls:''),text);b.type='button';b.setAttribute('aria-pressed',String(!!on));b.addEventListener('click',fn);return b;}
function group(title,cols,items){const g=el('div');g.append(el('div','wz-label',title));const grid=el('div','wz-grid c'+cols);items.forEach(i=>grid.append(i));g.append(grid);return g;}
function render(){
 if(!root||!flow)return;
 const list=steps(),step=list[flow.step]||list[0];
 root.className='forge-lb-wiz'+(flow.kind==='mobility'?' mob':'');
 const inner=el('div','wz-in');
 // top bar
 const top=el('div','wz-top');
 const b=el('button','wz-round');b.type='button';b.innerHTML=flow.step>0&&!flow.done?ICON.back:ICON.x;
 b.setAttribute('aria-label',flow.step>0&&!flow.done?'Zurück':'Schließen');b.addEventListener('click',back);
 top.append(b);
 const counted=list.filter(x=>x!=='type'&&x!=='how');
 const idx=counted.indexOf(step);
 if(idx>=0&&!flow.done){
  const prog=el('div','wz-prog');prog.setAttribute('aria-label','Schritt '+(idx+1)+' von '+counted.length);
  counted.forEach((_,k)=>prog.append(el('i',k<=idx?'on':'')));
  top.append(prog,el('div','wz-count',(idx+1)+'/'+counted.length));
 }else{
  top.append(el('div','wz-kicker',flow.kind==='mobility'?'Mobilitätsplan':flow.kind==='strength'?'Neuer Plan':'Neuer Plan'));
  top.append(el('div','wz-count',''));
 }
 inner.append(top);
 if(flow.done){renderDone(inner);root.replaceChildren(inner);return;}
 if(!flow.kind&&flow.error){
  const h=el('div','wz-head');h.append(el('h2','','Gerade nicht möglich'),el('p','',flow.error));inner.append(h);
  const f=el('div','wz-foot');const c=el('button','wz-next','Verstanden');c.type='button';c.addEventListener('click',close);f.append(c);
  inner.append(el('div','wz-body'),f);root.replaceChildren(inner);return;
 }
 const head=el('div','wz-head'),body=el('div','wz-body'),foot=el('div','wz-foot');
 let nextLabel='Weiter',showNext=true;
 const s=flow.s;
 if(step==='type'){
  head.append(el('h2','','Was möchtest du planen?'),el('p','','Krafttraining und Mobilität sind getrennte Pläne – du kannst beide haben.'));
  const k=bigCard(ICON.dumbbell,'Krafttraining','Ziel, Aufteilung und Trainingstage – FORGE stellt die Übungen zusammen.',false,()=>chooseType('strength'));
  const m=bigCard(ICON.flow,'Mobilität','Automatische Routine oder deine eigenen Übungen, an Ruhetagen oder nach dem Training.',false,()=>chooseType('mobility'),'mob');
  body.style.justifyContent='flex-end';body.append(k,m);showNext=false;
 }else if(flow.kind==='strength'){
  if(step==='how'){
   head.append(el('h2','','Neuen Trainingsplan erstellen'),el('p','','Automatisch zusammenstellen oder komplett selbst gestalten.'));
   body.style.justifyContent='flex-end';
   body.append(bigCard(ICON.spark,'Automatisch','4 kurze Schritte. FORGE schlägt Übungen vor, danach kannst du jede Einheit frei anpassen.',s.how==='auto',()=>{s.how='auto';render();}),
    bigCard(ICON.pen,'Individuell','Trainingstage oder „alle X Tage“ festlegen und die Übungen selbst aus dem Katalog wählen.',s.how==='manual',()=>{s.how='manual';render();}));
   body.append(el('p','wz-note','Dein aktueller Plan bleibt aktiv, bis der neue erstellt ist. Danach wird er archiviert.'));
   nextLabel='Weiter';
  }else if(step==='mdays'){
   head.append(el('h2','','Wann trainierst du?'),el('p','',s.mmode==='interval'?'Die Einheiten wechseln sich ab – die Übungen wählst du gleich selbst.':'Jeder Tag wird eine eigene Einheit – die Übungen wählst du gleich selbst.'));
   const seg=el('div','wz-seg');seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label','Trainingsrhythmus');
   [['weekdays','Feste Wochentage'],['interval','Alle X Tage']].forEach(([v,t])=>{const x=el('button','',t);x.type='button';x.setAttribute('role','radio');x.setAttribute('aria-checked',String(s.mmode===v));x.addEventListener('click',()=>{s.mmode=v;render();});seg.append(x);});
   body.append(seg);
   if(s.mmode==='interval'){
    const ev=everyOptions(s.mevery);
    const c1=el('div','wz-card');c1.append(group('Alle wie viele Tage?',ev.length<=5?ev.length:3,ev.map(n=>opt(String(n),s.mevery===n,()=>{s.mevery=n;render();}))));
    const c2=el('div','wz-card');c2.append(group('Verschiedene Einheiten im Wechsel',3,[1,2,3,4,5,6].map(n=>opt(n===1?'Nur A':'A–'+String.fromCharCode(64+n),s.munits===n,()=>{s.munits=n;render();},'sm'))));
    const f=el('label','wz-field');f.append(el('span','wz-label','Erster Trainingstag'));const inp=el('input');inp.type='date';inp.value=s.manchor;inp.addEventListener('change',()=>{s.manchor=inp.value;render();});f.append(inp);
    body.append(c1,c2,f);
   }else{
    const c=el('div','wz-card');c.append(group('Deine Trainingstage',7,DAYS.map((d,i)=>opt(d,s.mdays.includes(i),()=>{s.mdays=s.mdays.includes(i)?s.mdays.filter(x=>x!==i):s.mdays.concat(i).sort((a,b)=>a-b);render();},'day sm'))));
    c.append(el('p','wz-note',s.mdays.length?s.mdays.length+' '+(s.mdays.length===1?'Trainingstag':'Trainingstage')+' pro Woche':'Tippe mindestens einen Tag an.'));
    body.append(c);
   }
  }else if(step==='mname'){
   head.append(el('h2','','Wie soll dein Plan heißen?'),el('p','',s.mmode==='interval'?'Danach wählst du für jede Einheit die Übungen aus dem Katalog.':'Danach wählst du für jeden Tag die Übungen aus dem Katalog.'));
   const sum=el('div','wz-sum');sum.append(el('small','','Deine Auswahl'));
   [['Rhythmus',ownRhythmText(s)],['Übungen','wählst du selbst']].forEach(([k,v])=>{const r=el('div');r.append(el('span','',k),el('b','',v));sum.append(r);});
   const f=el('label','wz-field');f.append(el('span','wz-label','Name deines Plans (optional)'));
   const inp=el('input');inp.type='text';inp.maxLength=70;inp.placeholder='Zum Beispiel „Mein 3er-Split“';inp.value=s.name||'';inp.autocomplete='off';
   inp.addEventListener('input',()=>{s.name=inp.value;});f.append(inp);
   const place=group('Trainingsort',2,[['gym','Fitnessstudio'],['home','Zuhause']].map(([v,t])=>opt(t,s.mplace===v,()=>{s.mplace=v;render();})));
   body.append(sum,place,f);
   nextLabel='Übungen auswählen';
  }else if(step==='basics'){
   head.append(el('h2','','Was möchtest du trainieren?'),el('p','','Wähle, was zu deinem Alltag passt. Alles lässt sich später ändern.'));
   body.append(group('Dein Ziel',2,GOALS.map(([v,t])=>opt(t,s.goal===v,()=>{s.goal=v;render();}))));
   body.append(group('Trainingsort',3,PLACES.map(([v,t])=>opt(t,s.place===v,()=>{s.place=v;render();},'sm'))));
   body.append(group('Erfahrung',2,LEVELS.map(([v,t])=>opt(t,s.level===v,()=>{s.level=v;render();}))));
  }else if(step==='split'){
   head.append(el('h2','','Wie teilst du dein Training auf?'),el('p','','FORGE wählt die Übungen passend zur Aufteilung.'));
   const g=el('div','wz-list');g.setAttribute('role','radiogroup');g.setAttribute('aria-label','Aufteilung');
   SPLITS.forEach(([v,t,d])=>{const r=el('button','wz-row');r.type='button';r.setAttribute('role','radio');r.setAttribute('aria-checked',String(s.split===v));r.append(el('b','',t),el('small','',d));r.addEventListener('click',()=>{s.split=v;render();});g.append(r);});
   body.append(g);
  }else if(step==='rhythm'){
   head.append(el('h2','','Wann möchtest du trainieren?'),el('p','','Feste Wochentage oder zum Beispiel alle drei Tage.'));
   const seg=el('div','wz-seg');seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label','Trainingsrhythmus');
   [['weekdays','Feste Wochentage'],['interval','Alle X Tage']].forEach(([v,t])=>{const x=el('button','',t);x.type='button';x.setAttribute('role','radio');x.setAttribute('aria-checked',String(s.mode===v));x.addEventListener('click',()=>{s.mode=v;render();});seg.append(x);});
   body.append(seg);
   if(s.mode==='weekdays'){
    const c1=el('div','wz-card');c1.append(group('Wie viele Trainingstage?',5,[2,3,4,5,6].map(n=>opt(String(n),s.days.length===n,()=>{s.days=spreadDays(n);render();}))));
    const c2=el('div','wz-card');c2.append(group('Deine Wochentage',7,DAYS.map((d,i)=>opt(d,s.days.includes(i),()=>{s.days=toggleDay(s.days,i,6);render();},'day sm'))));
    const even=el('button','wz-link','↻ Wochentage gleichmäßig verteilen');even.type='button';even.addEventListener('click',()=>{s.days=spreadDays(s.days.length);render();});c2.append(even);
    body.append(c1,c2,el('p','wz-note','Die Einheiten wiederholen sich jede Kalenderwoche.'));
   }else{
    const c1=el('div','wz-card');c1.append(group('Alle wie viele Tage?',5,[2,3,4,5,7].map(n=>opt(String(n),s.every===n,()=>{s.every=n;render();}))));
    const c2=el('div','wz-card');c2.append(group('Verschiedene Einheiten im Wechsel',4,[1,2,3,4].map(n=>opt(String(n),s.units===n,()=>{s.units=n;render();}))));
    const f=el('label','wz-field');f.append(el('span','wz-label','Erster Trainingstag'));const inp=el('input');inp.type='date';inp.value=s.anchor;inp.addEventListener('change',()=>{s.anchor=inp.value;});f.append(inp);
    body.append(c1,c2,f);
   }
  }else if(step==='create'){
   head.append(el('h2','','Deinen Plan erstellen'),el('p','','FORGE schlägt Übungen vor – danach kannst du jede Einheit frei anpassen.'));
   const sum=el('div','wz-sum');sum.append(el('small','','Deine Auswahl'));
   strengthSummary(s).forEach(([k,v])=>{const r=el('div');r.append(el('span','',k),el('b','',v));sum.append(r);});
   const ch=el('button','wz-link','Ändern');ch.type='button';ch.style.alignSelf='flex-start';ch.style.padding='0 16px';ch.addEventListener('click',()=>{flow.step=steps().indexOf('basics');render();});sum.append(ch);
   const f=el('label','wz-field');f.append(el('span','wz-label','Name deines Plans (optional)'));
   const inp=el('input');inp.type='text';inp.maxLength=70;inp.placeholder='Zum Beispiel „Mein Krafttraining“';inp.value=s.name||'';inp.autocomplete='off';
   inp.addEventListener('input',()=>{s.name=inp.value;});f.append(inp);
   body.append(sum,f);
   foot.append(el('p','wz-note','Ein bestehender Plan wird archiviert. Gespeicherte Trainings bleiben erhalten.'));
   nextLabel='Meinen Plan erstellen';
  }
 }else{
  if(step==='how'){
   head.append(el('h2','','Mobilitätsplan erstellen'),el('p','','Eine fertige Routine oder deine eigenen Übungen.'));
   body.style.justifyContent='flex-end';
   body.append(bigCard(ICON.spark,'Automatisch','FORGE wählt eine passende Routine – du entscheidest nur Schwerpunkt und Zeitpunkt.',s.how==='auto',()=>{s.how='auto';render();},'mob'),
    bigCard(ICON.pen,'Individuell','Stelle deinen eigenen Mobilitätsmix aus dem Übungskatalog zusammen.',s.how==='custom',()=>{s.how='custom';render();},'mob'));
   body.append(el('p','wz-note','Dein Krafttrainingsplan bleibt unverändert.'));
  }else if(step==='routine'){
   head.append(el('h2','','Worauf möchtest du dich konzentrieren?'),el('p','','Jede Routine dauert nur wenige Minuten.'));
   const g=el('div','wz-list');g.setAttribute('role','radiogroup');g.setAttribute('aria-label','Routine');
   const R=typeof MOB_ROUTINES!=='undefined'?MOB_ROUTINES:{};
   ['gentle','yoga','hips','upper'].filter(k=>R[k]).forEach(k=>{
    const r=R[k],min=Math.max(1,Math.ceil(r.items.reduce((a,i)=>a+(Number(i[1])||0),0)/60));
    const x=el('button','wz-row');x.type='button';x.setAttribute('role','radio');x.setAttribute('aria-checked',String(s.routine===k));
    x.append(el('b','',r.name),el('small','',r.items.length+' Übungen · ca. '+min+' Min. · '+r.items.slice(0,3).map(i=>i[0]).join(', ')));
    x.addEventListener('click',()=>{s.routine=k;render();});g.append(x);
   });
   body.append(g);
  }else if(step==='pick'){
   head.append(el('h2','','Deine Übungen'),el('p','','Tippe an, was in deinen Mix soll. '+s.picked.length+' ausgewählt.'));
   const chips=el('div','wz-chips');const lst=el('div','wz-list');
   body.append(chips,lst);
   loadMobLib().then(lib=>{
    if(!root||steps()[flow.step]!=='pick')return;
    const regions=['Alle',...new Set(lib.map(x=>x.region))];
    chips.replaceChildren(...regions.map(r=>{const c=el('button','wz-chip',r);c.type='button';c.setAttribute('aria-pressed',String(s.region===r));c.addEventListener('click',()=>{s.region=r;render();});return c;}));
    const shown=lib.filter(x=>s.region==='Alle'||x.region===s.region);
    lst.replaceChildren(...shown.map(x=>{
     const on=s.picked.includes(x.name);
     const b=el('button','wz-ex');b.type='button';b.setAttribute('aria-pressed',String(on));
     const t=el('span');t.append(el('b','',x.name),el('small','',x.region+' · '+(x.seconds?x.seconds+' Sek.':'')+(x.sides?' · je Seite':'')));
     const i=el('i');if(on)i.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>';
     b.append(t,i);b.addEventListener('click',()=>{s.picked=on?s.picked.filter(n=>n!==x.name):s.picked.concat(x.name);render();});
     return b;
    }));
    if(!lib.length)lst.append(el('p','wz-note','Der Übungskatalog konnte nicht geladen werden.'));
   });
   nextLabel=s.picked.length?'Weiter mit '+s.picked.length+' '+(s.picked.length===1?'Übung':'Übungen'):'Weiter';
  }else if(step==='when'){
   head.append(el('h2','','Wann möchtest du mobilisieren?'),el('p','','An freien Tagen, direkt nach dem Krafttraining oder beides.'));
   const g=el('div','wz-list');g.setAttribute('role','radiogroup');g.setAttribute('aria-label','Zeitpunkt');
   TIMINGS.forEach(([v,t,d])=>{const r=el('button','wz-row');r.type='button';r.setAttribute('role','radio');r.setAttribute('aria-checked',String(s.timing===v));r.append(el('b','',t),el('small','',d));r.addEventListener('click',()=>{s.timing=v;render();});g.append(r);});
   body.append(g);
   if(s.timing!=='after'){
    const c=el('div','wz-card');c.append(group('An welchen Tagen?',7,DAYS.map((d,i)=>opt(d,s.days.includes(i),()=>{s.days=s.days.includes(i)?s.days.filter(x=>x!==i):s.days.concat(i).sort((a,b)=>a-b);render();},'day sm'))));
    body.append(c);
   }
  }else if(step==='save'){
   head.append(el('h2','','Mobilitätsplan speichern'),el('p','','Du findest ihn danach im Wochenplan und im Workout unter „Mobilität“.'));
   const sum=el('div','wz-sum');sum.append(el('small','','Deine Auswahl'));
   const R=typeof MOB_ROUTINES!=='undefined'?MOB_ROUTINES:{};
   const rows=[['Art',s.how==='custom'?'Individuell':'Automatisch'],[s.how==='custom'?'Übungen':'Routine',s.how==='custom'?s.picked.length+' ausgewählt':(R[s.routine]?.name||'')],['Wann',label(TIMINGS,s.timing)]];
   if(s.timing!=='after')rows.push(['Tage',s.days.map(d=>DAYS[d]).join(' · ')]);
   rows.forEach(([k,v])=>{const r=el('div');r.append(el('span','',k),el('b','',v));sum.append(r);});
   body.append(sum);
   nextLabel='Mobilitätsplan speichern';
  }
 }
 if(flow.error)foot.prepend(el('p','wz-error',flow.error));
 if(showNext){
  const n=el('button','wz-next');n.type='button';
  if(step==='create'||step==='save')n.innerHTML=ICON.check;
  n.append(document.createTextNode(nextLabel));
  n.disabled=!canContinue(flow.kind,step,s);
  n.addEventListener('click',next);foot.append(n);
 }
 inner.append(head,body,foot);
 root.setAttribute('aria-label',(head.querySelector('h2')?.textContent)||'Plan erstellen');
 root.replaceChildren(inner);
 const focusTarget=inner.querySelector('.wz-head h2');if(focusTarget){focusTarget.tabIndex=-1;focusTarget.focus({preventScroll:true});}
}
function bigCard(icon,title,text,on,fn,cls){
 const b=el('button','wz-big'+(cls?' '+cls:''));b.type='button';b.setAttribute('aria-pressed',String(!!on));
 const i=el('i');i.innerHTML=icon;const t=el('span');t.append(el('b','',title),el('small','',text));
 b.append(i,t);b.addEventListener('click',fn);return b;
}
function renderDone(inner){
 const d=flow.done;
 const box=el('div','wz-done');
 const ic=el('div','wz-done-icon');ic.innerHTML=ICON.check;
 const h=el('div','wz-head');h.style.padding='0 4px';h.append(el('h2','',d.title),el('p','',d.text));
 const sum=el('div','wz-sum');d.rows.forEach(([k,v])=>{const r=el('div');r.append(el('span','',k),el('b','',v));sum.append(r);});
 box.append(ic,h,sum);
 const foot=el('div','wz-foot');
 const ok=el('button','wz-next','Zur Plan-Übersicht');ok.type='button';
 ok.addEventListener('click',()=>{close();if(typeof window.go==='function')window.go('plan');});
 foot.append(ok);
 if(flow.kind==='strength'){
  const mob=el('button','wz-sec','Auch einen Mobilitätsplan erstellen');mob.type='button';mob.addEventListener('click',()=>{open('mobility');});foot.append(mob);
 }
 inner.append(box,foot);
}

/* ---------- entry points ---------- */
function intercept(e){
 if(!enabled())return;
 const t=e.target.closest&&e.target.closest('button');if(!t)return;
 const txt=(t.textContent||'').trim();
 const inPlan=t.closest('#plan');
 let kind=null;
 if(t.classList.contains('forge-lb-tile')&&/Neuer Plan/.test(txt))kind='any';
 else if(t.classList.contains('forge-lb-start')&&$('forgeSimpleHeroAction')?.dataset.action==='create')kind='strength';
 else if(t.classList.contains('forge-lb-mobplan'))kind='mobility';
 if(!kind||!inPlan&&!t.classList.contains('forge-lb-mobplan'))return;
 e.preventDefault();e.stopImmediatePropagation();
 open(kind==='any'?null:kind);
}
function mobilityEntry(){
 const rows=document.querySelector('#plan .forge-lb-plan .forge-lb-rows');
 if(!rows||rows.querySelector('.forge-lb-mobplan'))return;
 const b=el('button','forge-lb-row forge-lb-mobplan');b.type='button';
 b.innerHTML='<span>Mobilitätsplan</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
 rows.prepend(b);
}
function install(){
 if(!document.body||!enabled())return false;
 document.addEventListener('click',intercept,true);
 setInterval(()=>{if(document.visibilityState!=='hidden')mobilityEntry();},800);
 mobilityEntry();
 window.ForgeLayoutBWizardOpen=open;
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
