/* FORGE Layout B · Phase 4: Essen (B2-8) und Erfolge (B2-9).
 * Essen: kcal-Ring + Makros, „Schnell eintragen“ (letzte Mahlzeiten),
 *        Mahlzeit wiederholen, heutige Mahlzeiten, Suchen / Scannen.
 * Erfolge: Wochenziel mit Kraft-/Mobilitätstagen, Körpergewicht,
 *          Volumen vs. Vorwoche, Bestwerte zuletzt, Monats-Challenge.
 * Presentation only. Reads state; actions delegate to the existing FORGE
 * functions (repeat meal, editMeal, search, scanner, targets, statistics).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ACC='#a9f267',TEAL='#5ee0c8',GOLD='#ffb547';

/* ---------- pure helpers (tested) ---------- */
function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0;}
function localDay(d){const x=d instanceof Date?d:new Date(d);if(isNaN(x))return '';return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');}
function mondayOf(d){const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
function nutritionSummary(foods,targets,day){
 const list=(Array.isArray(foods)?foods:[]).filter(f=>f&&f.date===day);
 const sum=k=>Math.round(list.reduce((a,f)=>a+num(f[k]),0));
 const t=targets||{};
 return {meals:list.map(f=>({id:f.id,name:f.name||'Mahlzeit',cal:Math.round(num(f.cal))})),
  cal:sum('cal'),protein:sum('protein'),carbs:sum('carbs'),fat:sum('fat'),
  target:{cal:num(t.cal)||2400,protein:num(t.protein)||150,carbs:num(t.carbs)||260,fat:num(t.fat)||75}};
}
/* last distinct meals, newest first (index into foods) */
function recentMeals(foods,limit){
 const list=Array.isArray(foods)?foods:[],seen=new Set(),out=[];
 for(let i=list.length-1;i>=0&&out.length<(limit||3);i--){
  const f=list[i];if(!f||!f.name||seen.has(f.name))continue;seen.add(f.name);out.push({index:i,name:f.name,date:f.date,cal:Math.round(num(f.cal))});
 }
 return out;
}
function weekActivity(workouts,mobility,cardio,now){
 const mon=mondayOf(now),days=[];
 for(let k=0;k<7;k++){const d=new Date(mon);d.setDate(mon.getDate()+k);days.push(localDay(d));}
 const strength=new Set((workouts||[]).map(w=>localDay(w&&w.date)));
 const other=new Set([...(mobility||[]).map(m=>localDay(m&&(m.finishedAt||m.date))),...(cardio||[]).map(c=>localDay(c&&(c.date||c.finishedAt||c.started)))]);
 const today=localDay(now);
 return days.map((d,k)=>({day:['Mo','Di','Mi','Do','Fr','Sa','So'][k],date:d,strength:strength.has(d),other:other.has(d),today:d===today,future:d>today}));
}
function weekVolumes(workouts,now,weeks){
 const out=[];const mon=mondayOf(now);
 for(let k=(weeks||5)-1;k>=0;k--){
  const a=new Date(mon);a.setDate(mon.getDate()-7*k);const b=new Date(a);b.setDate(a.getDate()+7);
  const from=localDay(a),to=localDay(b);let v=0;
  for(const w of workouts||[]){const d=localDay(w&&w.date);if(d>=from&&d<to)for(const e of w.entries||[])for(const s of e.sets||[])v+=num(s.kg)*num(s.reps);}
  out.push(Math.round(v));
 }
 return out;
}
function recentRecords(workouts,limit){
 const best=new Map(),events=[];
 const list=(workouts||[]).map((w,i)=>({w,i,t:Date.parse(w&&w.date)||0})).sort((a,b)=>a.t-b.t||a.i-b.i);
 for(const {w,t} of list)for(const e of w.entries||[]){
  if(!e||!e.name)continue;
  const sets=(e.sets||[]).filter(s=>num(s.kg)>0);if(!sets.length)continue;
  const top=sets.reduce((a,s)=>num(s.kg)>num(a.kg)?s:a,sets[0]);
  const prev=best.get(e.name);
  if(prev!==undefined&&num(top.kg)>prev)events.push({name:e.name,kg:num(top.kg),reps:num(top.reps),t});
  if(prev===undefined||num(top.kg)>prev)best.set(e.name,num(top.kg));
 }
 const seen=new Set();return events.sort((a,b)=>b.t-a.t).filter(e=>!seen.has(e.name)&&seen.add(e.name)).slice(0,limit||3);
}
function fmt(n,d){return Number(n).toLocaleString('de-DE',{maximumFractionDigits:d??1});}
window.ForgeLayoutBPages=Object.freeze({nutritionSummary,recentMeals,weekActivity,weekVolumes,recentRecords,localDay});
if(typeof document==='undefined')return;

/* ---------- shared ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function setText(n,t){if(n&&n.textContent!==t)n.textContent=t;}
function findButton(root,re){return [...(root||document).querySelectorAll('button')].find(b=>re.test((b.textContent||'').trim()));}
const ICON={
 back:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
 search:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>',
 scan:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9v6M11 9v6M14 9v6M17 9v6"/></svg>',
 repeat:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/></svg>',
 plus:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 trophy:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="'+GOLD+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/></svg>'
};
function shortDate(d){return d.toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'}).replace(/\.,/,',');}

const B='body.forge-layout-b';
const CSS=`
${B} :is(#nutrition,#progress).forge-lb-home>:not(.forge-lb-pg):not(.forge-b-pagehead){display:none!important}
${B} :is(#nutrition,#progress):not(.forge-lb-home)>.forge-lb-pg>:not(.forge-lb-pg-back){display:none!important}
${B} :is(#nutrition,#progress).forge-lb-home>.forge-lb-pg>.forge-lb-pg-back{display:none!important}
${B} :is(#nutrition,#progress):not(.forge-lb-home){padding-bottom:150px!important}
${B} .forge-lb-pg{display:flex;flex-direction:column;gap:12px;margin:4px 0 16px;color:#f3f7fc}
${B} .forge-lb-pg-back{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));left:12px;z-index:70;box-shadow:0 8px 22px #000c;height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font-size:14px;font-weight:700;padding:0 14px 0 10px;display:flex;align-items:center;gap:6px}
${B} .forge-lb-pg-head{display:flex;flex-direction:column;gap:2px;padding:6px 60px 0 6px}
${B} .forge-lb-pg-head h2{margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em;color:#f3f7fc}
${B} .forge-lb-pg-head span{font-size:13px;color:#95a3b7}
${B} .forge-lb-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;margin:2px 4px 0}
${B} .forge-lb-card{background:#171e2a;border:1px solid #293346;border-radius:20px}
${B} .forge-lb-sum{border-radius:28px;padding:18px;display:flex;gap:16px;align-items:center}
${B} .forge-lb-kring{position:relative;width:112px;height:112px;flex:0 0 112px}
${B} .forge-lb-kring svg{display:block}
${B} .forge-lb-kring div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
${B} .forge-lb-kring b{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}
${B} .forge-lb-kring span{font-size:11px;color:#95a3b7}
${B} .forge-lb-macros{flex:1;display:flex;flex-direction:column;gap:10px;font-size:13px;min-width:0}
${B} .forge-lb-macro>div:first-child{display:flex;justify-content:space-between;gap:6px}
${B} .forge-lb-macro>div:first-child span:last-child{color:#95a3b7;white-space:nowrap}
${B} .forge-lb-bar{height:6px;border-radius:3px;background:#202a38;margin-top:4px;overflow:hidden}
${B} .forge-lb-bar i{display:block;height:6px;border-radius:3px}
${B} .forge-lb-bar i.mp{background:${TEAL}}
${B} .forge-lb-bar i.mc{background:${GOLD}}
${B} .forge-lb-bar i.mf{background:#c3cddb}
${B} .forge-lb-legend i.s{background:${ACC}}
${B} .forge-lb-legend i.o{background:${TEAL}}
${B} .forge-lb-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
${B} .forge-lb-chips::-webkit-scrollbar{display:none}
${B} .forge-lb-chip2{flex:0 0 auto;height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font-size:13px;font-weight:600;padding:0 14px;max-width:70vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${B} .forge-lb-link{display:flex;align-items:center;gap:12px;padding:12px 14px;color:#f3f7fc;text-align:left;width:100%;box-sizing:border-box}
${B} .forge-lb-link>span{flex:1;display:flex;flex-direction:column;min-width:0}
${B} .forge-lb-link b{font-size:15px;font-weight:700}
${B} .forge-lb-link small{font-size:12px;color:#95a3b7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${B} .forge-lb-list{padding:4px 16px}
${B} .forge-lb-list button,${B} .forge-lb-list>div{display:flex;justify-content:space-between;gap:10px;width:100%;padding:11px 0;border:0;border-bottom:1px solid #293346;background:transparent;color:#f3f7fc;font-size:15px;text-align:left}
${B} .forge-lb-list>:last-child{border-bottom:0}
${B} .forge-lb-list span:last-child{color:#95a3b7;white-space:nowrap}
${B} .forge-lb-list .empty{color:#95a3b7;font-size:14px}
${B} .forge-lb-acts{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}
${B} .forge-lb-acts button{height:60px;border-radius:22px;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px}
${B} .forge-lb-acts .sec{border:1px solid #3a4556;background:#202a38;color:#f3f7fc}
${B} .forge-lb-acts .pri{border:0;background:${ACC};color:#142016;font-weight:800}
${B} .forge-lb-rows{display:flex;flex-direction:column;gap:2px;border-top:1px solid #1d2533;padding-top:4px}
${B} .forge-lb-row{height:50px;border-radius:16px;border:0;background:transparent;color:#95a3b7;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:space-between;padding:0 8px}
${B} .forge-lb-hero2{border-radius:28px;background:linear-gradient(160deg,#273d2d,#171e2a 60%);border:1px solid #405d39;padding:18px;display:flex;flex-direction:column;gap:14px}
${B} .forge-lb-hero2-top{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
${B} .forge-lb-hero2 small{font-size:12px;color:${ACC};font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
${B} .forge-lb-hero2 strong{display:block;font-size:clamp(20px,6vw,24px);font-weight:800;margin-top:4px}
${B} .forge-lb-hero2-top>span{font-size:13px;color:#c3cddb;text-align:right}
${B} .forge-lb-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;text-align:center;font-size:11px;color:#95a3b7}
${B} .forge-lb-wk div{display:flex;flex-direction:column;gap:5px;align-items:center}
${B} .forge-lb-wk i{width:30px;height:30px;border-radius:10px;background:#202a38;box-sizing:border-box;display:block}
${B} .forge-lb-wk i.s{background:${ACC}}
${B} .forge-lb-wk i.o{background:${TEAL}}
${B} .forge-lb-wk i.so{background:linear-gradient(135deg,${ACC} 50%,${TEAL} 50%)}
${B} .forge-lb-wk i.t{border:2px solid ${ACC}}
${B} .forge-lb-legend{display:flex;gap:14px;font-size:12px;color:#c3cddb;flex-wrap:wrap}
${B} .forge-lb-legend span{display:flex;align-items:center;gap:6px}
${B} .forge-lb-legend i{width:10px;height:10px;border-radius:3px;display:block}
${B} .forge-lb-tiles2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
${B} .forge-lb-tile2{padding:14px;color:#f3f7fc;text-align:left;display:flex;flex-direction:column;gap:6px;min-width:0}
${B} .forge-lb-tile2 small{font-size:12px;color:#95a3b7}
${B} .forge-lb-tile2 b{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}
${B} .forge-lb-tile2 svg{width:100%;height:34px;display:block}
${B} .forge-lb-vbars{display:flex;gap:4px;align-items:flex-end;height:34px}
${B} .forge-lb-vbars i{width:14px;border-radius:3px;background:#3a4556;display:block;min-height:3px}
${B} .forge-lb-vbars i:last-child{background:${ACC}}
${B} .forge-lb-recs{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
${B} .forge-lb-recs div{display:flex;justify-content:space-between;gap:10px;font-size:15px}
${B} .forge-lb-recs div b{font-weight:700;white-space:nowrap}
${B} .forge-lb-recs .forge-lb-label{margin:0}
${B} .forge-lb-recs .empty{color:#95a3b7;font-size:14px}
${B} .forge-lb-chal i{width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:#2a2412;display:flex;align-items:center;justify-content:center}
${B} .forge-lb-toast{position:fixed;left:12px;right:12px;bottom:calc(80px + env(safe-area-inset-bottom));z-index:80;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 10px 10px 16px;border-radius:18px;background:#202a38;border:1px solid #3a4556;color:#f3f7fc;font-size:14px;box-shadow:0 10px 26px #000b}
${B} .forge-lb-toast button{height:36px;border-radius:18px;border:0;background:transparent;color:${ACC};font-weight:800;font-size:14px;padding:0 10px}
${B} .forge-lb-pg button:focus-visible,${B} .forge-lb-pg-back:focus-visible{outline:2px solid ${ACC}!important;outline-offset:2px!important}
`;


/* Same operation as the core „Mahlzeit wiederholen“ (forgeRepeatSelectedMeal):
 * copy the chosen entry for today with a new id. */
function repeatMeal(index){
 if(typeof state==='undefined'||!Array.isArray(state.foods))return null;
 const original=state.foods[index];if(!original)return null;
 const copy=JSON.parse(JSON.stringify(original));
 copy.id=typeof uid==='function'?uid():Math.random().toString(36).slice(2,10);
 copy.date=typeof today==='function'?today():localDay(new Date());
 state.foods.push(copy);
 if(typeof save==='function')save();
 if(typeof render==='function')try{render();}catch(e){}
 return copy.id;
}
function undoMeal(id){
 if(typeof state==='undefined'||!Array.isArray(state.foods))return;
 state.foods=state.foods.filter(f=>f.id!==id);
 if(typeof save==='function')save();
 if(typeof render==='function')try{render();}catch(e){}
}
function toast(text,undo){
 document.querySelector('.forge-lb-toast')?.remove();
 const t=el('div','forge-lb-toast');t.setAttribute('role','status');
 t.append(el('span','',text));
 if(undo){const u=el('button','','Rückgängig');u.type='button';u.addEventListener('click',()=>{undo();t.remove();});t.append(u);}
 document.body.append(t);setTimeout(()=>t.remove(),4500);
}
/* ---------- page framework ---------- */
const pages={};
function mount(id,build){pages[id]={build,ui:null};}
function detail(id,action){
 const page=$(id);if(!page)return;
 page.classList.remove('forge-lb-home');window.scrollTo(0,0);
 try{action&&action();}catch(e){console.error('FORGE Layout B '+id,e);}
}
function home(id,scroll){
 const page=$(id);if(!page)return;
 page.classList.add('forge-lb-home');if(scroll)window.scrollTo(0,0);
 const p=pages[id];if(p&&p.ui)p.ui.render(true);
}
function backButton(id,label){
 const b=el('button','forge-lb-pg-back');b.type='button';b.innerHTML=ICON.back+'<span>'+label+'</span>';
 b.addEventListener('click',()=>home(id,true));return b;
}
function attach(page,root){
 const anchor=page.querySelector(':scope > .forge-b-pagehead');
 if(anchor)anchor.after(root);else page.prepend(root);
}

/* ---------- Essen ---------- */
mount('nutrition',page=>{
 // Essen E1–E6 (forge-layout-b-food.js) replaces this page when it is loaded.
 if(typeof window.ForgeLayoutBFoodMount==='function')return window.ForgeLayoutBFoodMount(page,{attach,detail,home});
 const root=el('section','forge-lb-pg');root.setAttribute('aria-label','Essen Übersicht');
 const back=backButton('nutrition','Essen-Übersicht');
 const head=el('div','forge-lb-pg-head');const h=el('h2','','Essen');const date=el('span');head.append(h,date);
 const sum=el('div','forge-lb-card forge-lb-sum');
 const ring=el('div','forge-lb-kring');
 ring.innerHTML='<svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="48" fill="none" stroke="#202a38" stroke-width="11"/><circle class="arc" cx="56" cy="56" r="48" fill="none" stroke="'+ACC+'" stroke-width="11" stroke-linecap="round" stroke-dasharray="302" stroke-dashoffset="302" transform="rotate(-90 56 56)"/></svg>';
 const rt=el('div');const rb=el('b','','0');const rs=el('span','','kcal übrig');rt.append(rb,rs);ring.append(rt);
 const macros=el('div','forge-lb-macros');
 const mk=(label,cls)=>{const m=el('div','forge-lb-macro');const top=el('div');const a=el('span','',label),v=el('span');top.append(a,v);const bar=el('div','forge-lb-bar');const fill=el('i',cls);bar.append(fill);m.append(top,bar);macros.append(m);return {v,fill};};
 const mp=mk('Protein','mp'),mc=mk('Kohlenhydrate','mc'),mf=mk('Fett','mf');
 sum.append(ring,macros);
 sum.setAttribute('role','button');sum.tabIndex=0;
 const openTargets=()=>detail('nutrition',()=>{window.ForgeNutritionSlim?.openPart?.('targets');});
 const quickL=el('div','forge-lb-label','Schnell eintragen');
 const chips=el('div','forge-lb-chips');
 const rep=el('button','forge-lb-card forge-lb-link');rep.type='button';
 const repText=el('span');const repB=el('b','','Mahlzeit wiederholen');const repS=el('small','','Eine frühere Mahlzeit für heute übernehmen');repText.append(repB,repS);
 rep.innerHTML=ICON.repeat;rep.append(repText);
 rep.addEventListener('click',()=>detail('nutrition',()=>{const b=findButton($('nutrition'),/Wiederholen$/);if(b)b.click();else window.ForgeNutritionSlim?.openPart?.('repeat');}));
 const todayL=el('div','forge-lb-label','Heute');
 const list=el('div','forge-lb-card forge-lb-list');
 const acts=el('div','forge-lb-acts');
 const search=el('button','sec');search.type='button';search.innerHTML=ICON.search+'<span>Suchen</span>';
 search.addEventListener('click',()=>detail('nutrition',()=>{const panel=$('forgeNutritionSearchPanel');const input=panel?.querySelector('input[type="search"],input[type="text"],input');panel?.scrollIntoView?.({block:'start'});input?.focus?.({preventScroll:true});}));
 const scan=el('button','pri');scan.type='button';scan.innerHTML=ICON.scan+'<span>Scannen</span>';
 scan.addEventListener('click',()=>detail('nutrition',()=>{const b=findButton($('forgeSlimNutriActions'),/Scannen/)||findButton($('nutrition'),/Barcode scannen|Scannen/);b?.click();}));
 acts.append(search,scan);
 const rows=el('div','forge-lb-rows');
 const row=(label,fn)=>{const b=el('button','forge-lb-row');b.type='button';b.innerHTML='<span>'+label+'</span>'+ICON.chev;b.addEventListener('click',fn);rows.append(b);};
 row('Mahlzeit selbst zusammenstellen',()=>detail('nutrition',()=>{const b=findButton($('forgeSlimNutriActions'),/Mahlzeit erfassen/);if(b)b.click();else window.ForgeNutritionSlim?.openPart?.('compose');}));
 row('Tagesziele anpassen',openTargets);
 row('Alle Nährwerte und Mahlzeiten',()=>detail('nutrition'));
 sum.addEventListener('click',openTargets);
 sum.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openTargets();}});
 root.append(back,head,sum,quickL,chips,rep,todayL,list,acts,rows);
 attach(page,root);
 let key='';
 const render=force=>{
  if(typeof state==='undefined')return;
  const day=typeof today==='function'?today():localDay(new Date());
  const s=nutritionSummary(state.foods,state.targets,day);
  const recent=recentMeals(state.foods,4);
  const k=JSON.stringify([day,s,recent]);
  if(!force&&k===key)return;key=k;
  setText(date,shortDate(new Date()));
  const left=s.target.cal-s.cal;
  setText(rb,fmt(Math.abs(left),0));setText(rs,left>=0?'kcal übrig':'kcal drüber');
  const frac=Math.max(0,Math.min(1,s.cal/s.target.cal));
  ring.querySelector('.arc').setAttribute('stroke-dashoffset',String(Math.round(302*(1-frac))));
  ring.querySelector('.arc').setAttribute('stroke',left>=0?ACC:GOLD);
  sum.setAttribute('aria-label',fmt(s.cal,0)+' von '+fmt(s.target.cal,0)+' Kilokalorien. Antippen, um Tagesziele anzupassen.');
  for(const [m,a,t] of [[mp,s.protein,s.target.protein],[mc,s.carbs,s.target.carbs],[mf,s.fat,s.target.fat]]){
   setText(m.v,fmt(a,0)+' / '+fmt(t,0)+' g');m.fill.style.width=Math.max(0,Math.min(100,Math.round(a/t*100)))+'%';
  }
  chips.replaceChildren(...recent.map(r=>{const b=el('button','forge-lb-chip2','＋ '+r.name);b.type='button';
   b.setAttribute('aria-label',r.name+' für heute eintragen ('+r.cal+' kcal)');
   b.addEventListener('click',()=>{const id=repeatMeal(r.index);if(id){render(true);toast(r.name+' für heute eingetragen',()=>{undoMeal(id);render(true);});}});
   return b;}));
  quickL.hidden=chips.hidden=!recent.length;
  if(recent[0])setText(repS,'Zuletzt: '+recent[0].name+' · '+recent[0].cal+' kcal');
  list.replaceChildren(...(s.meals.length?s.meals.map(m=>{const b=el('button');b.type='button';b.append(el('span','',m.name),el('span','',fmt(m.cal,0)+' kcal'));
   b.setAttribute('aria-label',m.name+', '+m.cal+' kcal – bearbeiten');
   b.addEventListener('click',()=>detail('nutrition',()=>{if(typeof window.editMeal==='function')window.editMeal(m.id);}));return b;}):[el('div','empty','Heute noch nichts eingetragen.')]));
 };
 return {root,render};
});

/* ---------- Erfolge ---------- */
mount('progress',page=>{
 const root=el('section','forge-lb-pg');root.setAttribute('aria-label','Erfolge Übersicht');
 const back=backButton('progress','Erfolge-Übersicht');
 const head=el('div','forge-lb-pg-head');const h=el('h2','','Erfolge');const month=el('span');head.append(h,month);
 const hero=el('div','forge-lb-hero2');
 const top=el('div','forge-lb-hero2-top');const tl=el('div');const tk=el('small','','Diese Woche');const tv=el('strong');tl.append(tk,tv);const tr=el('span');top.append(tl,tr);
 const wk=el('div','forge-lb-wk');wk.setAttribute('role','img');
 const legend=el('div','forge-lb-legend');legend.innerHTML='<span><i class="s"></i>Kraft</span><span><i class="o"></i>Mobilität / Cardio</span>';
 hero.append(top,wk,legend);
 const tiles=el('div','forge-lb-tiles2');
 const tw=el('button','forge-lb-card forge-lb-tile2');tw.type='button';const twl=el('small','','Körpergewicht'),twv=el('b','','–');tw.append(twl,twv);
 const spark=document.createElementNS('http://www.w3.org/2000/svg','svg');spark.setAttribute('viewBox','0 0 130 34');spark.setAttribute('preserveAspectRatio','none');spark.setAttribute('aria-hidden','true');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('fill','none');path.setAttribute('stroke',TEAL);path.setAttribute('stroke-width','2.5');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');spark.append(path);tw.append(spark);
 tw.addEventListener('click',()=>detail('progress',()=>{const i=$('bodyWeight');i?.scrollIntoView?.({block:'center'});i?.focus?.({preventScroll:true});}));
 const tv2=el('button','forge-lb-card forge-lb-tile2');tv2.type='button';const tvl=el('small','','Volumen vs. Vorwoche'),tvv=el('b','','–');const bars=el('div','forge-lb-vbars');tv2.append(tvl,tvv,bars);
 tv2.addEventListener('click',()=>detail('progress'));
 tiles.append(tw,tv2);
 const recs=el('div','forge-lb-card forge-lb-recs');
 const chal=el('button','forge-lb-card forge-lb-link forge-lb-chal');chal.type='button';
 const ci=el('i');ci.innerHTML=ICON.trophy;const ct=el('span');const cb=el('b','','Challenge');const cs=el('small','','');ct.append(cb,cs);chal.append(ci,ct);
 chal.addEventListener('click',()=>detail('progress',()=>{findButton($('progress'),/Challenges/)?.click();}));
 const rows=el('div','forge-lb-rows');
 const row=(label,fn)=>{const b=el('button','forge-lb-row');b.type='button';b.innerHTML='<span>'+label+'</span>'+ICON.chev;b.addEventListener('click',fn);rows.append(b);};
 row('Alle Statistiken und Verlauf',()=>detail('progress',()=>{findButton($('progress'),/Statistiken/)?.click();}));
 row('Körpergewicht eintragen',()=>tw.click());
 row('Alle Challenges',()=>chal.click());
 root.append(back,head,hero,tiles,recs,chal,rows);
 attach(page,root);
 let key='';
 const render=force=>{
  if(typeof state==='undefined')return;
  const now=new Date();
  const w=state.workouts||[],mob=state.mobilityVideoSessions||[],car=state.cardioLogs||[],weights=state.weights||[];
  let goal=3;try{goal=typeof forge144Data==='function'?forge144Data().strengthGoal||3:3;}catch(e){}
  const chEl=$('forgeMonthlyChallenge');
  const chText=chEl?[chEl.querySelector('.head b')?.textContent||'',chEl.querySelector('.foot span')?.textContent||'',chEl.querySelector('.detail')?.textContent||''].join('|'):'';
  const k=JSON.stringify([localDay(now),w.length,mob.length,car.length,weights.length,goal,chText,weights.slice(-1)]);
  if(!force&&k===key)return;key=k;
  setText(month,now.toLocaleDateString('de-DE',{month:'long'}));
  const act=weekActivity(w,mob,car,now);
  const done=act.filter(d=>d.strength).length;
  setText(tv,done>=goal?done+(done===1?' Training':' Trainings')+' · Ziel erreicht':done+' von '+goal+' Trainings');
  const restDays=act.filter(d=>d.future||d.today).length;
  setText(tr,done>=goal?'stark!':'noch '+(goal-done)+(restDays?' bis Sonntag':''));
  wk.replaceChildren(...act.map(d=>{const c=el('div');const i=el('i',(d.strength&&d.other?'so':d.strength?'s':d.other?'o':'')+(d.today?' t':''));c.append(i,document.createTextNode(d.day));return c;}));
  wk.setAttribute('aria-label','Diese Woche '+done+' Krafttrainings, '+act.filter(d=>d.other).length+' Tage Mobilität oder Cardio');
  const vals=weights.map(x=>num(x&&x.value)).filter(v=>v>0).slice(-8);
  if(vals.length){
   setText(twv,fmt(vals[vals.length-1],1)+' kg');
   const lo=Math.min(...vals),hi=Math.max(...vals),r=Math.max(.5,hi-lo);
   path.setAttribute('d',vals.length>1?vals.map((v,i)=>(i?'L':'M')+Math.round(2+i*(126/(vals.length-1)))+' '+Math.round(30-((v-lo)/r)*26)).join(' '):'M2 17 L128 17');
  }else{setText(twv,'eintragen');path.setAttribute('d','');}
  const vol=weekVolumes(w,now,5),cur=vol[vol.length-1],prev=vol[vol.length-2];
  setText(tvv,prev>0?(cur>=prev?'+':'−')+fmt(Math.abs(Math.round((cur-prev)/prev*100)),0)+' %':cur>0?fmt(cur,0)+' kg':'–');
  const mx=Math.max(1,...vol);
  bars.replaceChildren(...vol.map(v=>{const i=el('i');i.style.height=Math.max(3,Math.round(v/mx*34))+'px';return i;}));
  const rr=recentRecords(w,3);
  recs.replaceChildren(el('div','forge-lb-label','Bestwerte zuletzt'),...(rr.length?rr.map(r=>{const d=el('div');d.append(el('span','',r.name),el('b','',fmt(r.kg,2)+' kg × '+r.reps));return d;}):[el('div','empty','Neue Bestwerte erscheinen hier nach deinen Trainings.')]));
  
  if(chEl){const goalTxt=((chEl.querySelector('.detail')?.textContent||'').match(/\d+\s+Einheiten/)||['Monatsziel'])[0];setText(cb,'Challenge: '+goalTxt+' im '+now.toLocaleDateString('de-DE',{month:'long'}));setText(cs,(chEl.querySelector('.foot span')?.textContent||'')+' geschafft');chal.hidden=false;}
  else chal.hidden=true;
 };
 return {root,render};
});

/* ---------- lifecycle ---------- */
function tick(){
 if(!enabled())return;
 for(const id of Object.keys(pages)){
  const page=$(id);if(!page)continue;const p=pages[id];
  if(!p.ui||!page.contains(p.ui.root)){page.querySelectorAll(':scope > .forge-lb-pg').forEach(n=>n.remove());p.ui=p.build(page);page.classList.add('forge-lb-home');}
  if(page.classList.contains('active'))p.ui.render(false);
 }
}
function wrapGo(){
 const prior=window.go;
 if(typeof prior!=='function'||prior.forgeLbPages)return;
 const w=function(p){const r=prior.apply(this,arguments);if(pages[p]&&enabled())home(p,false);return r;};
 w.forgeLbPages=true;w.forgeLbPlan=prior.forgeLbPlan;w.forgeLayoutB=prior.forgeLayoutB;window.go=w;try{go=w;}catch(e){}
}
function install(){
 if(!document.body||!enabled())return false;
 if(!$('forgeLayoutBPagesStyle')){const st=el('style');st.id='forgeLayoutBPagesStyle';st.textContent=CSS;document.head.append(st);}
 tick();wrapGo();setTimeout(wrapGo,1000);
 setInterval(()=>{if(document.visibilityState!=='hidden')tick();},700);
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
