/* FORGE Layout B · Einheit bearbeiten (Design P6) und Übungskatalog (Design P7).
 * P6: Vollbild-Fenster. Oben die Einheiten als Reiter, darunter die Übungen
 *     der gewählten Einheit. Eine Übung ist aufgeklappt (Sätze/Wdh. mit − / +,
 *     Alternative, Entfernen, Reihenfolge), die anderen sind kompakte Zeilen.
 *     „Plan speichern“ übernimmt alle geänderten Einheiten auf einmal.
 * P7: Blatt „Weitere Übung auswählen“ mit Kraft/Mobilität, Suche und
 *     Bildkarten. Antippen übernimmt die Übung (oder ersetzt sie).
 *     Aus der Plan-Übersicht geöffnet zeigt es die Technik der Übung.
 * Data: staging, validation and the verified commit are the active-plan
 * editor's own (ForgeActivePlanEdit.cloneEdit / validateEdit / commitStaged),
 * defaults come from forge138Defaults – no new data model, no native dialogs.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ACC='#a9f267',TEAL='#5ee0c8';
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_EX=15,MAX_SETS=15,MAX_REPS=999;

/* ---------- pure helpers (tested) ---------- */
function unitLetter(i){return LETTERS[i]||String(i+1);}
function stepValue(v,delta,min,max){
 let n=Math.round(Number(v));if(!Number.isFinite(n))n=min;
 return Math.max(min,Math.min(max,n+delta));
}
function doseText(ex){return (Number(ex&&ex.sets)||0)+' × '+(Number(ex&&ex.reps)||0);}
/* "Brust, vordere Schulter; Trizeps" → "Brust · vordere Schulter" */
function muscleLabel(guideText,group,region){
 const parts=String(guideText||'').split(/[,;]/).map(x=>x.trim()).filter(Boolean);
 if(parts.length)return parts.slice(0,2).map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' · ');
 if(group)return String(group).replace(/\s*&\s*/g,' · ');
 return region?String(region):'';
}
function normalize(t){return String(t||'').toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').trim();}
function splitCatalog(names,mobilityNames){
 const mob=new Set(mobilityNames||[]);
 const all=[...new Set(names||[])];
 return {strength:all.filter(n=>!mob.has(n)),mobility:all.filter(n=>mob.has(n))};
}
function filterCatalog(items,query){
 const q=normalize(query);if(!q)return items.slice();
 const words=q.split(/\s+/);
 // Word-start hits first ("Rücken" → Rudern before Bankdrücken), then plain substrings.
 const scored=[];
 items.forEach((it,i)=>{
  const hay=normalize(it.name+' '+(it.label||''));
  if(!words.every(w=>hay.includes(w)))return;
  const starts=hay.split(/[^a-z0-9]+/);
  scored.push({it,i,s:words.every(w=>starts.some(x=>x.startsWith(w)))?0:1});
 });
 return scored.sort((a,b)=>a.s-b.s||a.i-b.i).map(x=>x.it);
}
const MUSCLE_CHIPS=Object.freeze([['Alle',''],['Brust','brust'],['Rücken','rucken|latissimus|lat |nacken'],['Beine','bein|oberschenkel|gesass|wade|quadrizeps|hufte'],['Schultern','schulter|delta'],['Arme','bizeps|trizeps|unterarm|arme'],['Rumpf','rumpf|bauch|core|rumpfstabil']]);
function matchesChip(item,chip){
 const c=MUSCLE_CHIPS.find(x=>x[0]===chip);if(!c||!c[1])return true;
 const hay=' '+normalize(item.name+' '+(item.label||''))+' ';
 return new RegExp(c[1]).test(hay);
}
function moveItem(list,from,to){
 const a=list.slice();if(from<0||from>=a.length||to<0||to>=a.length)return a;
 const [x]=a.splice(from,1);a.splice(to,0,x);return a;
}
function unitDirty(x){
 if(!x)return false;
 return JSON.stringify({title:x.title,location:x.location,ex:x.ex.map(e=>({...e,sets:Number(e.sets),reps:Number(e.reps)}))})!==x.baseline;
}
const DAY_SHORT=Object.freeze(['Mo','Di','Mi','Do','Fr','Sa','So']);
const DAY_FULL=Object.freeze(['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']);
/* Own plan from scratch: one unit per chosen weekday. */
function draftUnits(days,location){
 return [...new Set(days||[])].filter(d=>Number.isInteger(d)&&d>=0&&d<=6).sort((a,b)=>a-b)
  .map(d=>({id:'draft-'+d,weekday:d,label:DAY_FULL[d],short:DAY_SHORT[d],title:DAY_FULL[d],location:location==='home'?'home':'gym',ex:[]}));
}
/* Rolling plan („alle X Tage“): ordered units A, B, C … instead of weekdays. */
function draftSlots(count,location){
 // The rotation engine (cadence.js) supports 1–4 units in a rolling plan.
 const n=Math.max(1,Math.min(4,Math.round(Number(count))||1));
 return Array.from({length:n},(_,i)=>({id:'draft-u'+i,weekday:i,slot:true,label:'Einheit '+unitLetter(i),short:unitLetter(i),title:'Einheit '+unitLetter(i),location:location==='home'?'home':'gym',ex:[]}));
}
/* The cadence object exactly as cadence.js stores it after plan creation. */
function draftCadence(plan,every,anchor){
 return {mode:'interval',every:Number(every),anchor:String(anchor),planOrder:plan.slice().sort((a,b)=>a.weekday-b.weekday).map(p=>p.id)};
}
function draftIssue(units){
 if(!units||!units.length)return 'Wähle mindestens einen Trainingstag.';
 for(const u of units){
  const day=u.label||DAY_FULL[u.weekday]||'Ein Tag';
  if(!u.ex.length)return day+' braucht noch mindestens eine Übung.';
  if(u.ex.length>MAX_EX)return day+': maximal '+MAX_EX+' Übungen.';
  const names=u.ex.map(e=>String(e.name||'').trim());
  if(names.some(n=>!n))return day+': Übung ohne Namen.';
  if(new Set(names).size!==names.length)return day+': Jede Übung nur einmal.';
  if(u.ex.some(e=>!(Number(e.sets)>=1&&Number(e.sets)<=MAX_SETS&&Number(e.reps)>=1&&Number(e.reps)<=MAX_REPS)))return day+': Sätze 1–15 und Wiederholungen 1–999.';
 }
 return null;
}
/* Same shape as the app's own manualSavePlan(). */
function draftPlan(units,name,idFn){
 const label=String(name||'').trim().slice(0,70)||'Mein individueller Trainingsplan';
 return units.slice().sort((a,b)=>a.weekday-b.weekday).map(u=>({id:idFn(),weekday:u.weekday,type:'full',title:label+' · '+(u.label||DAY_FULL[u.weekday]),location:u.location==='home'?'home':'gym',
  ex:u.ex.map(e=>({name:String(e.name).trim(),sets:Number(e.sets),reps:Number(e.reps),unit:e.unit||'auto'}))}));
}
/* Own exercises (not in the catalog) that a plan already contains may stay when
   the plan is edited; the core validator only knows catalog names. */
function ownExercisesOk(x,catalog,existing){
 const cat=new Set(catalog||[]),old=new Set(existing||[]);
 const names=(x&&x.ex||[]).map(e=>e&&e.name);
 if(!names.length||new Set(names).size!==names.length)return false;
 return names.some(n=>!cat.has(n))&&names.every(n=>cat.has(n)||old.has(n));
}
window.ForgeLayoutBEditor=Object.freeze({ownExercisesOk,draftUnits,draftSlots,draftCadence,draftIssue,draftPlan,unitLetter,stepValue,doseText,muscleLabel,normalize,splitCatalog,filterCatalog,matchesChip,MUSCLE_CHIPS,moveItem,unitDirty});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
const plans=()=>typeof state!=='undefined'&&state&&Array.isArray(state.plan)?state.plan:[];
const planById=id=>plans().find(p=>String(p.id)===String(id));
const api=()=>window.ForgeActivePlanEdit;
function catalogNames(){try{return typeof forge138AvailableNames==='function'?forge138AvailableNames():[];}catch(e){return [];}}
function defaultsFor(name){try{if(typeof forge138Defaults==='function')return structuredClone(forge138Defaults(name));}catch(e){}return {name,sets:3,reps:10};}
function guideFor(name){try{if(typeof FORGE_STRENGTH_GUIDES!=='undefined'&&Array.isArray(FORGE_STRENGTH_GUIDES[name]))return FORGE_STRENGTH_GUIDES[name];}catch(e){}return null;}
function groupFor(name){try{if(typeof FORGE_131_EXERCISES!=='undefined')return FORGE_131_EXERCISES.find(e=>e.name===name)?.group||'';}catch(e){}return '';}
let mobLib=null,mobLoading=null;
function loadMobLib(){
 if(mobLib)return Promise.resolve(mobLib);
 if(!mobLoading)mobLoading=fetch('./exercise-plus-data.json',{cache:'force-cache'}).then(r=>r.json()).then(d=>{mobLib=Array.isArray(d.mobility)?d.mobility:[];try{if(window.ForgeMobilityCatalog)mobLib=window.ForgeMobilityCatalog.withExtras(mobLib,typeof FORGE_EX_GUIDES!=='undefined'?FORGE_EX_GUIDES:{});}catch(e){}return mobLib;}).catch(()=>{mobLib=[];return mobLib;});
 return mobLoading;
}
function labelFor(name){
 const m=(mobLib||[]).find(x=>x.name===name);
 return muscleLabel(guideFor(name)?.[0],groupFor(name),m?.region);
}
const thumbCache=new Map();
function thumbHtml(name){
 if(thumbCache.has(name))return thumbCache.get(name);
 let out='';
 try{
  const mob=typeof window.forgeMobImage==='function'?window.forgeMobImage(name):(typeof forgeMobImage==='function'?forgeMobImage(name):null);
  if(Array.isArray(mob)&&mob[0])out='<img src="'+String(mob[0]).replace(/"/g,'&quot;')+'" alt="" loading="lazy" decoding="async">';
 }catch(e){}
 if(!out)try{
  const fn=window.forgeExerciseIllustrations||window.forgePublicExercisePictures;
  const html=typeof fn==='function'?fn(name):'';
  if(typeof html==='string'&&html){
   const box=document.createElement('div');box.innerHTML=html;
   const pick=box.querySelector('img')||box.querySelector('svg');
   if(pick){pick.removeAttribute('tabindex');pick.removeAttribute('role');pick.removeAttribute('width');pick.removeAttribute('height');
    if(pick.tagName.toLowerCase()==='img'){pick.setAttribute('loading','lazy');pick.setAttribute('decoding','async');pick.setAttribute('alt','');}
    else pick.setAttribute('aria-hidden','true');
    out=pick.outerHTML;}
  }
 }catch(e){}
 thumbCache.set(name,out);return out;
}
function thumb(name,cls){const t=el('span',cls);const h=thumbHtml(name);if(h)t.innerHTML=h;else t.classList.add('none');return t;}

const ICON={
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 plus:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 up:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
 down:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#95a3b7" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>',
 check:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>'
};

const E='.forge-lb-ed',C='.forge-lb-cat';
const CSS=`
${E}{position:fixed;inset:0;z-index:2147480000;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
${E} .ed-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(16px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom))}
${E} .ed-top{display:flex;align-items:center;justify-content:space-between;min-height:44px}
${E} .ed-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${E} .ed-kicker{font-size:14px;color:#95a3b7;font-weight:600}
${E} .ed-tabs{margin-top:14px;flex:0 0 auto;min-height:52px;border-radius:26px;background:#171e2a;border:1px solid #293346;display:flex;padding:5px;box-sizing:border-box;gap:4px;overflow-x:auto;scrollbar-width:none}
${E} .ed-tabs::-webkit-scrollbar{display:none}
${E} .ed-tabs button{flex:1 0 auto;min-width:0;max-width:100%;border:0;border-radius:22px;background:transparent;color:#95a3b7;font:inherit;font-size:14px;font-weight:600;padding:0 14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative}
${E} .ed-tabs.two button{flex:1 1 0}
${E} .ed-tabs button[aria-selected="true"]{background:${ACC};color:#142016;font-weight:800}
${E} .ed-tabs button.dirty::after{content:'';position:absolute;top:8px;right:8px;width:7px;height:7px;border-radius:4px;background:#ffb547}
${E} .ed-title{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 4px 0}
${E} .ed-title h1{margin:0;font-size:24px;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
${E} .ed-title small{display:block;font-size:13px;color:#95a3b7;margin-top:2px}
${E} .ed-pill{height:40px;flex:0 0 auto;border-radius:20px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:13px;font-weight:700;padding:0 14px}
${E} .ed-list{flex:1;min-height:0;overflow-y:auto;padding:14px 0 10px;display:flex;flex-direction:column;gap:8px;scrollbar-width:none;overscroll-behavior:contain}
${E} .ed-list::-webkit-scrollbar{display:none}
${E} .ed-row{flex:0 0 auto;display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:8px 14px 8px 8px;color:#f3f7fc;text-align:left;font:inherit;min-height:60px}
${E} .ed-row b{flex:1;font-size:15px;font-weight:600;min-width:0;overflow-wrap:anywhere}
${E} .ed-row em{font-style:normal;font-size:13px;color:#95a3b7;white-space:nowrap}
${E} .ed-th{width:44px;height:44px;flex:0 0 44px;border-radius:10px;overflow:hidden;background:#202a38;display:flex;align-items:center;justify-content:center}
${E} .ed-th img,${E} .ed-th svg,${C} .cat-img img,${C} .cat-img svg{width:100%;height:100%;object-fit:cover;display:block}
${E} .ed-th svg,${C} .cat-img svg{object-fit:contain;background:#e9eef4}
${E} .ed-th.none::after,${C} .cat-img.none::after{content:'';width:40%;height:40%;border-radius:50%;border:2px solid #3a4556}
${E} .ed-card{flex:0 0 auto;background:#171e2a;border:2px solid ${ACC};border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:12px}
${E} .ed-card-head{display:flex;align-items:center;gap:12px}
${E} .ed-card-head .ed-th{width:52px;height:52px;flex-basis:52px;border-radius:12px}
${E} .ed-card-head b{flex:1;font-size:16px;font-weight:800;min-width:0;overflow-wrap:anywhere}
${E} .ed-move{display:flex;gap:6px}
${E} .ed-move button{width:36px;height:36px;border-radius:12px;border:1px solid #293346;background:#0f1620;color:#c3cddb;display:flex;align-items:center;justify-content:center;padding:0}
${E} .ed-move button:disabled{opacity:.3}
${E} .ed-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
${E} .ed-step{display:flex;flex-direction:column;gap:4px;min-width:0}
${E} .ed-step>span{font-size:11px;color:#95a3b7;padding-left:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${E} .ed-stepper{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;background:#0f1620;border:1px solid #293346;border-radius:14px}
${E} .ed-stepper button{height:44px;border:0;background:transparent;color:#c3cddb;font:inherit;font-size:20px;padding:0}
${E} .ed-stepper button:disabled{opacity:.3}
${E} .ed-stepper input{width:100%;min-width:0;border:0;background:transparent;color:#f3f7fc;text-align:center;font:inherit;font-size:18px;font-weight:800;padding:0;-moz-appearance:textfield}
${E} .ed-stepper input::-webkit-outer-spin-button,${E} .ed-stepper input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
${E} .ed-acts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
${E} .ed-alt{height:44px;border-radius:14px;border:1px solid #3a4556;background:#202a38;color:#f3f7fc;font:inherit;font-size:13px;font-weight:700}
${E} .ed-del{height:44px;border-radius:14px;border:1px solid #4a2630;background:transparent;color:#ffc6c6;font:inherit;font-size:13px;font-weight:700}
${E} .ed-del:disabled{opacity:.4}
${E} .ed-add{flex:0 0 auto;height:50px;border-radius:18px;border:1px dashed #3a4556;background:transparent;color:#c3cddb;font:inherit;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px}
${E} .ed-add:disabled{opacity:.4}
${E} .ed-foot{display:flex;flex-direction:column;gap:8px;padding-top:6px}
${E} .ed-status{font-size:12px;color:#ffb547;text-align:center;font-weight:600;min-height:15px;margin:0}
${E} .ed-status.err{color:#ffb4b8}
${E} .ed-status.ok{color:${ACC}}
${E} .ed-save{height:64px;border-radius:32px;border:0;background:${ACC};color:#142016;font:inherit;font-size:18px;font-weight:800}
${E} .ed-save.quiet{background:#171e2a;color:#f3f7fc;border:1px solid #3a4556}
${E} .ed-tabs button.empty{color:#6f7d90}
${E} .ed-hint{flex:0 0 auto;margin:6px 4px;font-size:14px;color:#95a3b7;line-height:1.5;text-align:center}
${C} .cat-own{grid-column:1/-1;border-radius:18px;border:1px dashed #3a4556;background:transparent;color:#f3f7fc;font:inherit;text-align:left;padding:14px 16px;display:flex;flex-direction:column;gap:3px}
${C} .cat-own b{font-size:15px;font-weight:700}
${C} .cat-own small{font-size:12px;color:#95a3b7}
${E} .ed-empty{margin:auto 0;font-size:15px;color:#c3cddb;text-align:center;line-height:1.5;padding:0 12px}
${E} button:focus-visible,${C} button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
.forge-lb-ed-shade{position:fixed;inset:0;z-index:2147480500;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-ed-sheet{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:10px 16px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box}
.forge-lb-ed-sheet .sh-handle{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center;flex:0 0 auto}
.forge-lb-ed-sheet .sh-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.forge-lb-ed-sheet .sh-head small{display:block;font-size:13px;color:#95a3b7}
.forge-lb-ed-sheet .sh-head strong{display:block;font-size:22px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
.forge-lb-ed-sheet .sh-x{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
.forge-lb-ed-sheet p{margin:0;font-size:14px;color:#c3cddb;line-height:1.5}
.forge-lb-ed-sheet .sh-main{height:58px;border-radius:29px;border:0;background:${ACC};color:#142016;font:inherit;font-size:17px;font-weight:800}
.forge-lb-ed-sheet .sh-sec{height:52px;border-radius:26px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:16px;font-weight:700}
.forge-lb-ed-sheet .sh-danger{height:52px;border-radius:26px;border:1px solid #4a2630;background:transparent;color:#ffc6c6;font:inherit;font-size:16px;font-weight:700}
.forge-lb-ed-sheet label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.2px}
.forge-lb-ed-sheet input[type=text]{height:54px;border-radius:16px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:16px;padding:0 16px;box-sizing:border-box;width:100%;text-transform:none;letter-spacing:0}
.forge-lb-ed-sheet .sh-seg,${C} .cat-seg{height:52px;flex:0 0 auto;border-radius:26px;background:#171e2a;border:1px solid #293346;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:5px;box-sizing:border-box;gap:4px}
.forge-lb-ed-sheet .sh-seg button,${C} .cat-seg button{border:0;border-radius:22px;background:transparent;color:#95a3b7;font:inherit;font-size:14px;font-weight:600}
.forge-lb-ed-sheet .sh-seg button[aria-checked="true"],${C} .cat-seg button[aria-selected="true"]{background:var(--ca,${ACC});color:var(--con,#142016);font-weight:800}
${C}{top:0;padding-top:calc(36px + env(safe-area-inset-top))}
${C} .forge-lb-ed-sheet{flex:1;min-height:0;padding-bottom:calc(16px + env(safe-area-inset-bottom))}
${C}.mob{--ca:${TEAL};--con:#062420}
${C} .cat-seg[hidden],${C} .cat-chips[hidden]{display:none}
${C} .cat-chips{flex:0 0 auto;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}
${C} .cat-chips::-webkit-scrollbar{display:none}
${C} .cat-chips button{flex:0 0 auto;height:36px;border-radius:18px;border:1px solid #293346;background:#171e2a;color:#c3cddb;font:inherit;font-size:13px;font-weight:600;padding:0 13px}
${C} .cat-chips button[aria-pressed="true"]{background:var(--ca,${ACC});color:var(--con,#142016);border-color:var(--ca,${ACC});font-weight:800}
${C} .cat-search{flex-direction:row;display:flex;align-items:center;gap:10px;height:52px;flex:0 0 auto;border-radius:16px;border:1px solid #3a4556;background:#0f1620;padding:0 14px;box-sizing:border-box;text-transform:none;letter-spacing:0}
${C} .cat-search input{flex:1;min-width:0;border:0;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;outline:none}
${C} .cat-grid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:max-content;gap:10px;align-content:start;scrollbar-width:none;overscroll-behavior:contain}
${C} .cat-grid::-webkit-scrollbar{display:none}
${C} .cat-card{border-radius:18px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;padding:0;overflow:hidden;text-align:left;display:flex;flex-direction:column;font:inherit;position:relative}
${C} .cat-card:disabled{opacity:.45}
${C} .cat-img{flex:0 0 112px;width:100%;height:112px;background:#202a38;display:flex;align-items:center;justify-content:center;overflow:hidden}
${C} .cat-txt{padding:10px 12px 12px;display:flex;flex-direction:column;gap:2px}
${C} .cat-txt b{font-size:14px;font-weight:700;line-height:1.25}
${C} .cat-txt small{font-size:12px;color:#95a3b7;line-height:1.3}
${C} .cat-in{position:absolute;top:8px;right:8px;height:24px;border-radius:12px;background:var(--ca,${ACC});color:var(--con,#142016);font-size:11px;font-weight:800;padding:0 8px;display:flex;align-items:center;gap:4px}
${C} .cat-more{grid-column:1/-1;height:48px;border-radius:16px;border:1px solid #293346;background:transparent;color:#c3cddb;font:inherit;font-size:14px;font-weight:600}
${C} .cat-hint{font-size:13px;color:#95a3b7;text-align:center;flex:0 0 auto}
${C} .cat-none{grid-column:1/-1;font-size:14px;color:#95a3b7;text-align:center;padding:30px 10px}
${C} .tech-img{flex:0 0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
${C} .tech-card{flex:0 0 auto}
${C} .tech-img img{width:100%;border-radius:14px;display:block}
${C} .tech-card{background:#171e2a;border:1px solid #293346;border-radius:18px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.45;color:#c3cddb}
${C} .tech-card small{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.2px}
${C} .tech-body{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:10px;scrollbar-width:none}
@media (max-height:700px){${E} .ed-save{height:56px}${E} .ed-title h1{font-size:21px}${C} .cat-img{height:92px;flex-basis:92px}}
`;
function ensureCss(){if(!$('forgeLayoutBEditorCss')){const s=el('style');s.id='forgeLayoutBEditorCss';s.textContent=CSS;document.head.append(s);}}

/* ---------- editor state ---------- */
let root=null,ed=null;
const unitList=()=>ed&&ed.draft?ed.draft.units:plans();
function stagedFor(id){
 if(ed.draft)return ed.draft.units.find(u=>u.id===id)||null;
 if(!ed.staged.has(id)){const p=planById(id);if(!p)return null;ed.staged.set(id,api().cloneEdit(p));}
 return ed.staged.get(id);
}
function dirtyIds(){
 if(ed.draft)return ed.draft.units.filter(u=>u.ex.length).map(u=>u.id);
 return [...ed.staged.entries()].filter(([,x])=>unitDirty(x)).map(([id])=>id);
}
function openDraft(opts){
 if(!enabled())return false;
 const interval=opts&&opts.mode==='interval';
 if(interval){
  try{window.ForgeCadenceCore?.validate({mode:'interval',every:Number(opts.every),anchor:opts.anchor,planOrder:['x']});}catch(e){return false;}
 }
 const units=interval?draftSlots(opts.units,opts.location):draftUnits(opts&&opts.days,opts&&opts.location);
 if(!units.length)return false;
 ensureCss();closeEditor(true);
 ed={unit:units[0].id,open:0,staged:new Map(),status:'',tone:'',draft:{units,name:String(opts.name||''),mode:interval?'interval':'weekdays',every:Number(opts.every)||0,anchor:String(opts.anchor||'')}};
 root=el('div','forge-lb-ed');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Neuen Plan zusammenstellen');
 document.body.append(root);document.body.classList.add('forge-lb-ed-open');
 document.addEventListener('keydown',onKey,true);
 if(typeof state!=='undefined'&&state.activeWorkout)ed.blocked=true;
 render();
 loadMobLib().then(()=>{if(root&&ed)render();});
 return true;
}

function openEditor(unitId,exerciseIndex){
 if(!enabled()||!api())return false;
 const list=plans();
 if(!list.length){if(typeof window.ForgeLayoutBWizardOpen==='function')return window.ForgeLayoutBWizardOpen('strength');return false;}
 ensureCss();closeEditor(true);
 const id=String(list.some(p=>String(p.id)===String(unitId))?unitId:list[0].id);
 ed={unit:id,open:Number.isInteger(Number(exerciseIndex))?Number(exerciseIndex):0,staged:new Map(),status:'',tone:''};
 root=el('div','forge-lb-ed');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Plan bearbeiten');
 document.body.append(root);document.body.classList.add('forge-lb-ed-open');
 document.addEventListener('keydown',onKey,true);
 if(typeof state!=='undefined'&&state.activeWorkout){ed.blocked=true;}
 render();
 loadMobLib().then(()=>{if(root&&ed)render();});
 return true;
}
function closeEditor(force){
 if(!root)return true;
 if(!force&&ed&&dirtyIds().length){askDiscard();return false;}
 closeSheet();root.remove();root=null;ed=null;
 document.body.classList.remove('forge-lb-ed-open');
 document.removeEventListener('keydown',onKey,true);
 return true;
}
function onKey(e){
 if(e.key!=='Escape')return;
 e.preventDefault();e.stopPropagation();
 if(sheet)closeSheet();else closeEditor(false);
}

function render(){
 if(!root||!ed)return;
 const keepScroll=root.querySelector('.ed-list')?.scrollTop||0;
 root.replaceChildren();
 const inner=el('div','ed-in');root.append(inner);
 const top=el('div','ed-top');
 const x=btn('ed-round','',()=>closeEditor(false));x.innerHTML=ICON.x;x.setAttribute('aria-label','Planbearbeitung abbrechen und schließen');
 top.append(x,el('div','ed-kicker',ed.draft?'Neuer Plan · Übungen wählen':'Plan bearbeiten'),el('div','',''));top.lastChild.style.width='44px';
 inner.append(top);
 if(ed.blocked){
  inner.append(el('p','ed-empty','Während eines laufenden Trainings bleibt der Plan unverändert. Beende zuerst dein Workout.'));
  const f=el('div','ed-foot');f.append(btn('ed-save quiet','Schließen',()=>closeEditor(true)));inner.append(f);return;
 }
 const list=unitList();
 if(!list.some(p=>String(p.id)===ed.unit))ed.unit=String(list[0].id);
 const tabs=el('div','ed-tabs'+(list.length===2?' two':''));tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Trainingseinheit auswählen');
 list.forEach((p,i)=>{
  const id=String(p.id),x=ed.staged.get(id);
  const label=ed.draft?p.short+(p.ex.length?' · '+p.ex.length:''):unitLetter(i)+' · '+((x?x.title:p.title)||'Einheit '+(i+1));
  const b=btn(!ed.draft&&unitDirty(x)?'dirty':(ed.draft&&!p.ex.length?'empty':''),label,()=>{if(ed.unit===id)return;ed.unit=id;ed.open=0;render();});
  b.setAttribute('role','tab');b.setAttribute('aria-selected',String(id===ed.unit));
  tabs.append(b);
 });
 inner.append(tabs);
 const w=stagedFor(ed.unit);
 const head=el('div','ed-title');const t=el('div');
 t.append(el('h1','',w.title||'Einheit'),el('small','',w.ex.length+' '+(w.ex.length===1?'Übung':'Übungen')+' · '+(w.location==='home'?'Zuhause':'Fitnessstudio')));
 const ren=btn('ed-pill',ed.draft?'Ort ändern':'Umbenennen',()=>renameSheet(w));ren.setAttribute('aria-label',ed.draft?'Trainingsort ändern':'Trainingseinheit umbenennen');
 head.append(t,ren);inner.append(head);

 const body=el('div','ed-list');
 if(ed.open>=w.ex.length)ed.open=w.ex.length-1;
 w.ex.forEach((ex,i)=>body.append(i===ed.open?exerciseCard(w,ex,i):exerciseRow(ex,i)));
 if(!w.ex.length)body.append(el('p','ed-hint','Noch keine Übungen für '+(w.label||'diese Einheit')+'. Wähle die erste aus dem Katalog.'));
 const add=btn('ed-add','',()=>openCatalog({mode:'add',unit:w}));
 add.innerHTML=ICON.plus+'<span>'+(w.ex.length?'Weitere Übung auswählen':'Übung auswählen')+'</span>';
 if(w.ex.length>=MAX_EX){add.disabled=true;add.lastChild.textContent='Maximal '+MAX_EX+' Übungen';}
 body.append(add);inner.append(body);
 requestAnimationFrame(()=>{body.scrollTop=keepScroll;});

 const foot=el('div','ed-foot');
 if(ed.draft){
  const issue=draftIssue(ed.draft.units);
  const st=el('p','ed-status'+(ed.tone?' '+ed.tone:''),ed.status||(issue?'':'Alle Tage gefüllt'));st.setAttribute('role','status');
  if(!ed.status&&!issue)st.classList.add('ok');
  const save=btn('ed-save'+(issue?' quiet':''),'Plan erstellen',createDraft);
  foot.append(st,save);inner.append(foot);return;
 }
 const dirty=dirtyIds();
 const st=el('p','ed-status'+(ed.tone?' '+ed.tone:''),ed.status||(dirty.length?'Noch nicht gespeichert':''));st.setAttribute('role','status');
 const save=btn('ed-save'+(dirty.length?'':' quiet'),dirty.length?'Plan speichern':'Fertig',()=>dirtyIds().length?saveAll():closeEditor(true));
 foot.append(st,save);inner.append(foot);
}
function exerciseRow(ex,i){
 const r=btn('ed-row','',()=>{ed.open=i;ed.status='';ed.tone='';render();});
 r.setAttribute('aria-label',ex.name+', '+doseText(ex)+' – bearbeiten');
 r.append(thumb(ex.name,'ed-th'),el('b','',ex.name),el('em','',doseText(ex)));
 return r;
}
function stepper(label,ex,key,max){
 const box=el('div','ed-step');box.append(el('span','',label));
 const s=el('div','ed-stepper');
 const minus=btn('','−'),plus=btn('','+');
 const input=el('input');input.type='number';input.inputMode='numeric';input.min='1';input.max=String(max);input.value=String(ex[key]);
 input.setAttribute('aria-label',label);
 minus.setAttribute('aria-label',label+' verringern');plus.setAttribute('aria-label',label+' erhöhen');
 const sync=()=>{minus.disabled=Number(ex[key])<=1;plus.disabled=Number(ex[key])>=max;};
 const set=v=>{ex[key]=v;input.value=String(v);sync();changed();};
 minus.addEventListener('click',()=>set(stepValue(ex[key],-1,1,max)));
 plus.addEventListener('click',()=>set(stepValue(ex[key],1,1,max)));
 input.addEventListener('change',()=>set(stepValue(input.value,0,1,max)));
 sync();s.append(minus,input,plus);box.append(s);return box;
}
function changed(){
 ed.status='';ed.tone='';
 if(ed.draft)return;
 const dirty=dirtyIds();
 const st=root?.querySelector('.ed-status');if(st){st.className='ed-status';st.textContent=dirty.length?'Noch nicht gespeichert':'';}
 const sv=root?.querySelector('.ed-save');if(sv){sv.className='ed-save'+(dirty.length?'':' quiet');sv.textContent=dirty.length?'Plan speichern':'Fertig';}
 root?.querySelectorAll('.ed-tabs button').forEach((b,i)=>{const p=plans()[i];b.classList.toggle('dirty',!!p&&unitDirty(ed.staged.get(String(p.id))));});
}
function exerciseCard(w,ex,i){
 const c=el('div','ed-card');
 const h=el('div','ed-card-head');h.append(thumb(ex.name,'ed-th'),el('b','',ex.name));
 const mv=el('div','ed-move');
 const up=btn('','',()=>{w.ex=moveItem(w.ex,i,i-1);ed.open=i-1;render();});up.innerHTML=ICON.up;up.disabled=i===0;up.setAttribute('aria-label','Nach oben');
 const dn=btn('','',()=>{w.ex=moveItem(w.ex,i,i+1);ed.open=i+1;render();});dn.innerHTML=ICON.down;dn.disabled=i===w.ex.length-1;dn.setAttribute('aria-label','Nach unten');
 mv.append(up,dn);h.append(mv);c.append(h);
 const steps=el('div','ed-steps');
 steps.append(stepper('Sätze',ex,'sets',MAX_SETS),stepper('Wiederholungen / Sekunden',ex,'reps',MAX_REPS));
 c.append(steps);
 const acts=el('div','ed-acts');
 acts.append(btn('ed-alt','Alternative Übung',()=>openCatalog({mode:'replace',unit:w,index:i})));
 const del=btn('ed-del','Entfernen',()=>{
  if(w.ex.length<=1&&!ed.draft)return;
  w.ex.splice(i,1);ed.open=Math.max(0,Math.min(i,w.ex.length-1));ed.status=ed.draft?'„'+ex.name+'“ entfernt':'„'+ex.name+'“ entfernt – erst „Plan speichern“ übernimmt es.';ed.tone='';render();
 });
 if(w.ex.length<=1&&!ed.draft){del.disabled=true;del.title='Mindestens eine Übung muss bleiben';}
 acts.append(del);c.append(acts);
 return c;
}
function saveAll(){
 const ids=dirtyIds();if(!ids.length){closeEditor(true);return;}
 const a=api();
 for(const id of ids){
  const p=planById(id),x=ed.staged.get(id);
  let res=a.commitStaged(p,x);
  if(!res.ok&&ownExercisesOk(x,catalogNames(),plans().flatMap(q=>q.ex.map(e=>e.name))))res=commitOwn(p,x);
  if(!res.ok){
   ed.unit=id;ed.status=(plans().length>1?(p?.title||'Einheit')+': ':'')+res.reason;ed.tone='err';
   // Units committed before this one stay saved; refresh their baselines.
   ids.slice(0,ids.indexOf(id)).forEach(done=>{const q=planById(done);if(q)ed.staged.set(done,a.cloneEdit(q));});
   render();return;
  }
 }
 closeEditor(true);
 try{if(typeof window.render==='function')window.render();}catch(e){console.error('FORGE: Ansicht nach Planspeichern',e);}
 toast(ids.length>1?'Plan gespeichert · '+ids.length+' Einheiten geändert':'Plan gespeichert');
}
function createDraft(){
 const issue=draftIssue(ed.draft.units);
 if(issue){
  ed.status=issue;ed.tone='err';
  const bad=ed.draft.units.find(u=>!u.ex.length);if(bad)ed.unit=bad.id;
  render();return;
 }
 if(plans().length){
  openSheet('Neuen Plan aktivieren?',s=>{
   s.append(sheetHead('','Neuen Plan aktivieren?'));
   s.append(el('p','','Dein aktueller Plan „'+((typeof state!=='undefined'&&state.activePlanName)||'Trainingsplan')+'“ wird archiviert. Deine gespeicherten Trainings bleiben erhalten.'));
   s.append(btn('sh-main','Plan aktivieren',()=>{closeSheet();activateDraft();}));
   s.append(btn('sh-sec','Zurück',closeSheet));
  });
  return;
 }
 activateDraft();
}
function activateDraft(){
 if(typeof state==='undefined'||state.activeWorkout){ed.status='Bitte zuerst dein laufendes Workout abschließen.';ed.tone='err';render();return;}
 const mkId=()=>typeof uid==='function'?uid():Date.now().toString(36)+Math.random().toString(36).slice(2);
 const name=String(ed.draft.name||'').trim().slice(0,70)||'Mein individueller Trainingsplan';
 const raw=(()=>{try{return localStorage.getItem(KEY);}catch(e){return null;}})();
 const snapshot=JSON.stringify({moves:state.forgeWeekMoves===undefined?null:state.forgeWeekMoves,plan:state.plan,settings:state.settings,archive:state.planArchive,id:state.activePlanId,name:state.activePlanName,started:state.activePlanStarted,off:state.hasDeactivatedPlan});
 try{
  if(typeof archiveCurrentPlan==='function'&&state.plan.length)archiveCurrentPlan();
  const plan=draftPlan(ed.draft.units,name,mkId);
  let cad=null;
  if(ed.draft.mode==='interval'){
   cad=draftCadence(plan,ed.draft.every,ed.draft.anchor);
   if(window.ForgeCadenceCore)window.ForgeCadenceCore.validate(cad);
  }
  state.plan=plan;
  state.settings={...state.settings,days:plan.length,weekdays:plan.map(d=>d.weekday),split:'full',cadence:cad};
  // Old temporary weekday moves belong to the archived plan.
  state.forgeWeekMoves=null;
  state.hasDeactivatedPlan=false;state.activePlanId=mkId();state.activePlanName=name;state.activePlanStarted=new Date().toISOString();
  save();
 }catch(err){
  console.error('FORGE: eigener Plan',err);
  try{const o=JSON.parse(snapshot);state.plan=o.plan;state.settings=o.settings;state.forgeWeekMoves=o.moves;if(o.archive!==undefined)state.planArchive=o.archive;state.activePlanId=o.id;state.activePlanName=o.name;state.activePlanStarted=o.started;state.hasDeactivatedPlan=o.off;
   if(raw!=null)localStorage.setItem(KEY,raw);}catch(e){}
  ed.status='Der Plan konnte nicht gespeichert werden. Dein bisheriger Plan bleibt aktiv.';ed.tone='err';render();return;
 }
 const n=state.plan.length;
 const rhythm=ed.draft.mode==='interval'?'alle '+ed.draft.every+' Tage · '+n+' '+(n===1?'Einheit':'Einheiten im Wechsel'):'';
 closeEditor(true);
 try{if(typeof window.render==='function')window.render();}catch(e){console.error('FORGE: Ansicht nach Planerstellung',e);}
 try{if(typeof window.go==='function')window.go('plan');}catch(e){}
 toast('„'+name+'“ ist aktiv · '+(rhythm||(n+' '+(n===1?'Trainingstag':'Trainingstage'))));
}
/* Same guards and verified write as ForgeActivePlanEdit.commitStaged, for
   plans that contain own exercises created with „Individuell“. */
function commitOwn(p,x){
 if(!p||state.activeWorkout)return {ok:false,reason:'Ein laufendes Training darf nicht verändert werden.'};
 const title=String(x.title||'').trim();
 if(!title||title.length>90)return {ok:false,reason:'Bitte einen gültigen Namen eingeben.'};
 if(!['gym','home'].includes(x.location))return {ok:false,reason:'Ungültiger Trainingsort.'};
 if(x.ex.length<1||x.ex.length>MAX_EX)return {ok:false,reason:'Der Plan benötigt 1 bis 15 Übungen.'};
 const ex=x.ex.map(e=>({...e,sets:Number(e.sets),reps:Number(e.reps)}));
 if(ex.some(e=>!Number.isInteger(e.sets)||e.sets<1||e.sets>MAX_SETS||!Number.isInteger(e.reps)||e.reps<1||e.reps>MAX_REPS))return {ok:false,reason:'Sätze 1–15 und Wiederholungen 1–999 eingeben.'};
 const changing=JSON.stringify(p.ex)!==JSON.stringify(ex);
 if(changing&&state.workoutDraft&&String(state.workoutDraft.planId)===String(p.id))return {ok:false,reason:'Für diesen Trainingstag existiert ein gespeicherter Trainingsentwurf. Bitte zuerst abschließen. Der Entwurf bleibt erhalten.'};
 const backup={title:p.title,location:p.location,ex:structuredClone(p.ex),last:state.forge138LastEdit==null?null:structuredClone(state.forge138LastEdit)};
 let raw=null;
 try{
  raw=localStorage.getItem(KEY);
  if(changing)state.forge138LastEdit={planId:p.id,ex:structuredClone(p.ex)};
  p.title=title;p.location=x.location;p.ex=structuredClone(ex);save();
  const copy=JSON.parse(localStorage.getItem(KEY)||'null')?.plan?.find(q=>String(q.id)===String(p.id));
  if(!copy||JSON.stringify(copy.ex)!==JSON.stringify(p.ex)||copy.title!==p.title)throw Error('verify');
  return {ok:true};
 }catch(err){
  console.error('FORGE Plan speichern fehlgeschlagen',err);
  p.title=backup.title;p.location=backup.location;p.ex=backup.ex;state.forge138LastEdit=backup.last;
  try{if(raw==null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,raw);}catch(e){}
  return {ok:false,reason:'Speichern fehlgeschlagen. Der bisherige Plan bleibt erhalten.'};
 }
}
function toast(text){
 const t=el('div','',text);t.setAttribute('role','status');
 t.style.cssText='position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147480900;background:#171e2a;border:1px solid #3a4556;color:#f3f7fc;border-radius:22px;padding:12px 18px;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 10px 28px #000a';
 document.body.append(t);setTimeout(()=>t.remove(),2600);
}

/* ---------- sheets ---------- */
let sheet=null;
function openSheet(label,build,extraCls){
 closeSheet();
 const shade=el('div','forge-lb-ed-shade'+(extraCls?' '+extraCls:''));shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-label',label);
 const s=el('div','forge-lb-ed-sheet');s.append(el('div','sh-handle'));
 shade.append(s);shade.addEventListener('click',e=>{if(e.target===shade)closeSheet();});
 document.body.append(shade);sheet=shade;
 if(!root)document.addEventListener('keydown',onKey,true);
 build(s);
 return s;
}
function closeSheet(){
 if(!sheet)return;sheet.remove();sheet=null;
 if(!root)document.removeEventListener('keydown',onKey,true);
}
function sheetHead(kicker,title){
 const h=el('div','sh-head');const t=el('div');if(kicker)t.append(el('small','',kicker));t.append(el('strong','',title));
 const x=btn('sh-x','',closeSheet);x.innerHTML=ICON.x;x.setAttribute('aria-label','Schließen');
 h.append(t,x);return h;
}
function askDiscard(){
 const draft=!!ed?.draft;
 openSheet('Änderungen verwerfen?',s=>{
  s.append(sheetHead('',draft?'Neuen Plan verwerfen?':'Änderungen verwerfen?'));
  s.append(el('p','',draft?'Deine ausgewählten Übungen gehen verloren. Dein aktueller Plan bleibt unverändert.':'Du hast Änderungen am Plan, die noch nicht gespeichert sind.'));
  if(!draft)s.append(btn('sh-main','Plan speichern',()=>{closeSheet();saveAll();}));
  s.append(btn('sh-danger','Verwerfen',()=>{closeSheet();closeEditor(true);}));
  s.append(btn('sh-sec','Weiter bearbeiten',closeSheet));
 });
}
function renameSheet(w){
 openSheet('Trainingseinheit umbenennen',s=>{
  s.append(sheetHead(ed.draft?w.label:'Trainingseinheit',ed.draft?'Trainingsort':'Name & Trainingsort'));
  const lab=el('label','','Name');const input=el('input');input.type='text';input.maxLength=90;input.value=w.title;lab.append(input);if(!ed.draft)s.append(lab);
  let loc=w.location;
  const seg=el('div','sh-seg');seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label','Trainingsort');
  [['gym','Fitnessstudio'],['home','Zuhause']].forEach(([v,txt])=>{const b=btn('',txt,()=>{loc=v;seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-checked',String(x===b)));});b.setAttribute('role','radio');b.setAttribute('aria-checked',String(v===loc));seg.append(b);});
  s.append(seg);
  const err=el('p','');err.style.color='#ffb4b8';s.append(err);
  s.append(btn('sh-main','Übernehmen',()=>{
   const name=String(input.value||'').trim().slice(0,90);
   if(!name){err.textContent='Bitte einen Namen eingeben.';input.focus();return;}
   w.title=name;w.location=loc;closeSheet();render();
  }));
  if(!ed.draft)setTimeout(()=>input.focus(),60);
 });
}

/* ---------- P7 catalog ---------- */
let cat=null;
function catItems(){
 const names=catalogNames();
 const mobNames=(mobLib||[]).map(x=>x.name);
 const parts=splitCatalog(names,mobNames);
 // Plan units take catalog names only; mobility moves are browsed from their own library.
 const list=cat.tab==='mobility'?mobNames:parts.strength;
 return list.map(name=>({name,label:labelFor(name)}));
}
function openCatalog(opts){
 ensureCss();
 const ex=opts.mode==='replace'?opts.unit.ex[opts.index]:null;
 let tab=opts.mode==='browse'&&opts.tab==='mobility'?'mobility':'strength';
 cat={chip:'Alle',...opts,tab,query:opts.query||'',limit:40};
 const title=opts.mode==='add'?'Weitere Übung auswählen':opts.mode==='replace'?'Alternative für '+ex.name:'Alle Übungen';
 openSheet('Übungskatalog',s=>{
  s.append(sheetHead('Übungskatalog',title));
  const seg=el('div','cat-seg');seg.hidden=opts.mode!=='browse';seg.setAttribute('role','tablist');seg.setAttribute('aria-label','Kategorie');
  [['strength','Kraftübungen'],['mobility','Mobilität']].forEach(([v,txt])=>{
   const b=btn('',txt,()=>{cat.tab=v;cat.limit=40;cat.chip='Alle';cat.query='';input.value='';chips.hidden=v!=='strength';mchips.hidden=v!=='mobility';cat.mcat='Alle';mchips.querySelectorAll('button').forEach((x,k)=>x.setAttribute('aria-pressed',String(k===0)));chips.querySelectorAll('button').forEach((x,k)=>x.setAttribute('aria-pressed',String(k===0)));sheet.classList.toggle('mob',v==='mobility');seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',String(x===b)));input.placeholder=placeholder();input.setAttribute('aria-label',placeholder());fill();});
   b.setAttribute('role','tab');b.setAttribute('aria-selected',String(v===cat.tab));seg.append(b);
  });
  s.append(seg);
  const placeholder=()=>cat.tab==='mobility'?'Mobilitätsübung oder Körperregion suchen':'Kraftübung oder Muskelgruppe suchen';
  const lab=el('label','cat-search');lab.innerHTML=ICON.search;
  const input=el('input');input.type='search';input.value=cat.query;input.placeholder=placeholder();input.setAttribute('aria-label',placeholder());
  input.addEventListener('input',()=>{cat.query=input.value;cat.limit=40;fill();});
  lab.append(input);s.append(lab);
  const mchips=el('div','cat-chips');mchips.setAttribute('role','group');mchips.setAttribute('aria-label','Mobilität: Kategorie');mchips.hidden=cat.tab!=='mobility';
  cat.mcat=cat.mcat||'Alle';
  ['Alle','Gelenke','Yoga','Dehnen'].forEach(name=>{const b=btn('',name,()=>{cat.mcat=name;cat.limit=40;mchips.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));fill();});b.setAttribute('aria-pressed',String(name===cat.mcat));mchips.append(b);});
  const chips=el('div','cat-chips');chips.setAttribute('role','group');chips.setAttribute('aria-label','Muskelgruppe');chips.hidden=cat.tab!=='strength';
  MUSCLE_CHIPS.forEach(([name])=>{const b=btn('',name,()=>{cat.chip=name;cat.limit=40;chips.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));fill();});b.setAttribute('aria-pressed',String(name===cat.chip));chips.append(b);});
  s.append(chips,mchips);
  const grid=el('div','cat-grid');s.append(grid);
  s.append(el('div','cat-hint',opts.mode==='browse'?'Antippen zeigt Technik und Muskeln':opts.mode==='replace'?'Antippen ersetzt die Übung in der Einheit':'Antippen übernimmt die Übung in die Einheit'));
  cat.grid=grid;
  fill();
  if(!mobLib)loadMobLib().then(()=>{if(cat&&cat.grid===grid)fill();});
 },'forge-lb-cat'+(tab==='mobility'?' mob':''));
}
function fill(){
 const grid=cat.grid;if(!grid)return;
 grid.replaceChildren();grid.scrollTop=0;
 if(cat.tab==='mobility'&&!mobLib){grid.append(el('div','cat-none','Mobilitätsübungen werden geladen …'));return;}
 const catOf=n=>{try{return window.ForgeMobilityCatalog?window.ForgeMobilityCatalog.categoryOf(n):'Gelenke';}catch(e){return 'Gelenke';}};
 const items=filterCatalog(catItems(),cat.query).filter(it=>cat.tab==='strength'?matchesChip(it,cat.chip):(!cat.mcat||cat.mcat==='Alle'||catOf(it.name)===cat.mcat));
 const inUnit=new Set(cat.unit?cat.unit.ex.map(e=>e.name):[]);
 const q=String(cat.query||'').trim();
 if(ed&&ed.draft&&cat.unit&&cat.mode!=='browse'&&q.length>=2&&!items.some(it=>normalize(it.name)===normalize(q))&&!inUnit.has(q)){
  const own=btn('cat-own','',()=>pickExercise(q.slice(0,80),true));
  own.append(el('b','','„'+q.slice(0,80)+'“ als eigene Übung'),el('small','','Nicht im Katalog – ohne Bild und Anleitung'));
  grid.append(own);
 }
 if(!items.length){if(grid.children.length)return;grid.append(el('div','cat-none',cat.query||cat.chip!=='Alle'?'Keine passende Übung gefunden.':'Keine Übungen in dieser Kategorie.'));return;}
 items.slice(0,cat.limit).forEach(it=>{
  const already=inUnit.has(it.name);
  const card=btn('cat-card','',()=>pickExercise(it.name));
  card.append(thumb(it.name,'cat-img'));
  const tx=el('span','cat-txt');tx.append(el('b','',it.name));if(it.label)tx.append(el('small','',it.label));card.append(tx);
  if(already&&cat.mode!=='browse'){card.disabled=true;const tag=el('span','cat-in');tag.innerHTML=ICON.check+'<span>Im Plan</span>';card.append(tag);card.setAttribute('aria-label',it.name+' – bereits in der Einheit');}
  grid.append(card);
 });
 if(items.length>cat.limit){
  grid.append(btn('cat-more','Weitere '+Math.min(40,items.length-cat.limit)+' von '+(items.length-cat.limit)+' anzeigen',()=>{const y=grid.scrollTop;cat.limit+=40;fill();grid.scrollTop=y;}));
 }
}
function pickExercise(name,custom){
 if(cat.mode==='browse'){techSheet(name);return;}
 const w=cat.unit;if(!w)return;
 if(w.ex.some(e=>e.name===name))return;
 if(cat.mode==='replace'){
  const ex=w.ex[cat.index];if(!ex)return;
  const old=ex.name;ex.name=name;
  ed.open=cat.index;ed.status='„'+old+'“ ersetzt durch „'+name+'“';ed.tone='';
 }else{
  if(w.ex.length>=MAX_EX)return;
  const d=custom?{name,sets:3,reps:10}:defaultsFor(name);if(ed.draft)d.unit=d.unit||'auto';
  w.ex.push(d);ed.open=w.ex.length-1;ed.status='„'+name+'“ hinzugefügt';ed.tone='';
 }
 cat=null;closeSheet();render();
 requestAnimationFrame(()=>root?.querySelector('.ed-card')?.scrollIntoView?.({block:'nearest'}));
}
function techSheet(name){
 const back={...cat};
 const guide=guideFor(name);
 let pics='';try{const fn=window.forgePublicExercisePictures;pics=typeof fn==='function'?String(fn(name)||''):'';}catch(e){}
 let mob=null;try{mob=typeof window.forgeMobImage==='function'?window.forgeMobImage(name):(typeof forgeMobImage==='function'?forgeMobImage(name):null);}catch(e){}
 const m=(mobLib||[]).find(x=>x.name===name);
 openSheet('Technik: '+name,s=>{
  const h=sheetHead('Technik',name);
  h.querySelector('.sh-x').setAttribute('aria-label','Zurück zum Katalog');
  h.querySelector('.sh-x').onclick=()=>openCatalog(back);
  s.append(h);
  const body=el('div','tech-body');
  if(Array.isArray(mob)&&mob.length){const g=el('div','tech-img');mob.slice(0,2).forEach(src=>{const i=el('img');i.src=src;i.alt=name;i.loading='lazy';g.append(i);});body.append(g);}
  else if(pics){const g=el('div','tech-img');g.innerHTML=pics;g.querySelectorAll('img').forEach((x,k)=>{if(k>1)x.remove();});if(!g.querySelector('img'))g.innerHTML='';else body.append(g);}
  const card=(k,txt)=>{const c=el('div','tech-card');c.append(el('small','',k));if(Array.isArray(txt))txt.forEach((t,i)=>c.append(el('span','',(i+1)+'. '+t)));else c.append(el('span','',txt));body.append(c);};
  if(guide){card('Trainiert',guide[0]||'');card('Ausführung',guide.slice(1,4));if(guide[4])card('Tipp',guide[4]);}
  else if(m){if(m.region)card('Körperregion',m.region);if(Array.isArray(m.steps)&&m.steps.length)card('Ausführung',m.steps.slice(0,4));if(m.tip)card('Tipp',m.tip);}
  else body.append(el('p','','Für diese Übung liegt noch keine geprüfte Einzelanleitung vor.'));
  s.append(body);
  s.append(btn('sh-sec','Zurück zum Katalog',()=>openCatalog(back)));
 },'forge-lb-cat');
}
function openBrowse(){if(!enabled())return false;loadMobLib();cat=null;openCatalog({mode:'browse',unit:null});return true;}

/* ---------- entry points ---------- */
function intercept(e){
 if(!enabled())return;
 const t=e.target.closest&&e.target.closest('button');if(!t||!t.closest('#plan'))return;
 const txt=(t.textContent||'').trim();
 if(t.classList.contains('forge-lb-tile')&&/Plan bearbeiten/.test(txt)){
  e.preventDefault();e.stopImmediatePropagation();openEditor();return;
 }
 if(t.classList.contains('forge-lb-row')&&/^Übungskatalog/.test(txt)){
  e.preventDefault();e.stopImmediatePropagation();openBrowse();
 }
}
function wrapGlobals(){
 const day=window.forgeOpenActivePlanDay,exf=window.forgeOpenActivePlanExercise,tog=window.forgeOpenActivePlanEditor;
 if(typeof day==='function'&&!day.__forgeLB){
  const f=function(id){return enabled()?openEditor(id):day.apply(this,arguments);};f.__forgeLB=true;window.forgeOpenActivePlanDay=f;
 }
 if(typeof exf==='function'&&!exf.__forgeLB){
  const f=function(id,index){if(!enabled())return exf.apply(this,arguments);if(typeof state!=='undefined'&&state.activeWorkout)return false;return openEditor(id,index);};f.__forgeLB=true;window.forgeOpenActivePlanExercise=f;
 }
 if(typeof tog==='function'&&!tog.__forgeLB){
  const f=function(){return enabled()?openEditor():tog.apply(this,arguments);};f.__forgeLB=true;window.forgeOpenActivePlanEditor=f;
 }
}
function install(){
 if(!document.body||!enabled())return false;
 document.addEventListener('click',intercept,true);
 wrapGlobals();setTimeout(wrapGlobals,1500);
 window.ForgeLayoutBEditorOpen=openEditor;window.ForgeLayoutBEditorDraft=openDraft;window.ForgeLayoutBCatalogOpen=openBrowse;
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
