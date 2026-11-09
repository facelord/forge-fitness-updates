/* FORGE Layout B · Essen, verschlankt (Design „FORGE Layout B – Essen“, E1–E6).
 * E1 Heute: kcal-Ring, Makros, Mahlzeiten des Tages, ein Knopf „Essen hinzufügen“.
 * E2 Hinzufügen-Blatt: Suche, Scannen, „Wie gestern“, Zuletzt/Favoriten mit Sofort-+.
 * E3 Eine Suche: eigene Lebensmittel, Favoriten, Basis + BLS offline, online (Open Food Facts).
 * E4 Menge: Gramm mit Schnellwahl, Mahlzeit nach Uhrzeit, Nährwerte live.
 * E5 Mahlzeit: Einträge ändern/löschen, alle Nährwerte nur hier.
 * E6 Tagesziele, eigene Lebensmittel, Datensicherung im ⋯-Menü.
 * Data: entries in state.foods keep the shape of saveMeal() (ingredients with
 * grams + values per 100 g, totals like nutrientSum()); new entries carry an
 * optional `slot` (breakfast|lunch|dinner|snack). Favourites/recent/products are
 * nutrition-plus's state.forgeNutritionDb, own foods state.customFoods, goals
 * state.targets – no new storage, no native dialogs.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ACC='#a9f267',GOLD='#ffb547';
const SLOTS=Object.freeze([['breakfast','Frühstück','Früh'],['lunch','Mittagessen','Mittag'],['dinner','Abendessen','Abend'],['snack','Snacks','Snack']]);
const SUM_KEYS=Object.freeze(['cal','protein','carbs','fat','sugar','fiber','sat','mono','poly','polyols','addedSugar','fructose']);
const FOOD_KEYS=Object.freeze(['cal','protein','carbs','fat','sugar','fiber','sat','mono','poly','polyols','addedSugar','fructose','salt','starch','trans','omega3']);
const CORE=Object.freeze(['cal','protein','carbs','fat']);

/* ---------- pure helpers (tested) ---------- */
function n(v){if(v===null||v===undefined||v==='')return null;const x=typeof v==='string'?Number(v.replace(',','.')):Number(v);return Number.isFinite(x)&&x>=0?x:null;}
function norm(s){return String(s||'').toLocaleLowerCase('de-DE').normalize('NFD').replace(/[̀-ͯ]/g,'').trim();}
function slotForHour(h){return h<10.5?'breakfast':h<15?'lunch':h>=17.5&&h<22?'dinner':'snack';}
function slotLabel(key,short){const s=SLOTS.find(x=>x[0]===key);return s?(short?s[2]:s[1]):'Weitere Einträge';}
/* Same rule as the core nutrientSum(): a total is known only if every item knows it. */
function sumItems(items){
 const out={};
 for(const k of SUM_KEYS){const known=items.length>0&&items.every(i=>i[k]!==undefined&&i[k]!==null&&i[k]!=='');out[k]=known?items.reduce((v,i)=>v+Number(i[k])*Number(i.grams)/100,0):null;}
 return out;
}
function itemFromFood(food,grams,id){
 const it={id,name:String(food.name).trim(),grams:Number(grams)};
 for(const k of FOOD_KEYS){const v=n(food[k]);if(v!==null)it[k]=v;}
 it.sweetener=food.sweetener||'';
 return it;
}
function itemKcal(it){return Math.round((n(it.cal)||0)*Number(it.grams||0)/100);}
function entryOf(date,slot,items,id){return {id,date,name:slotLabel(slot),slot,ingredients:items,sweetener:[...new Set(items.map(i=>i.sweetener).filter(Boolean))].join(', '),...sumItems(items)};}
/* Add one item to the day's slot meal (or start that meal). Returns a new foods array. */
function addToSlot(foods,date,slot,item,idFn){
 const list=Array.isArray(foods)?foods.slice():[];
 const i=list.findIndex(f=>f&&f.date===date&&f.slot===slot&&Array.isArray(f.ingredients));
 if(i>=0){const items=list[i].ingredients.concat(item);list[i]={...list[i],...entryOf(date,slot,items,list[i].id),name:list[i].name||slotLabel(slot)};}
 else list.push(entryOf(date,slot,[item],idFn()));
 return list;
}
function recomputeEntry(entry){return {...entry,...sumItems(entry.ingredients||[]),sweetener:[...new Set((entry.ingredients||[]).map(i=>i.sweetener).filter(Boolean))].join(', ')};}
function dayGroups(foods,date){
 const day=(Array.isArray(foods)?foods:[]).filter(f=>f&&f.date===date);
 const groups=SLOTS.map(([key])=>({slot:key,label:slotLabel(key),entries:day.filter(f=>f.slot===key)}));
 const other=day.filter(f=>!SLOTS.some(s=>s[0]===f.slot));
 if(other.length)groups.push({slot:'',label:'Weitere Einträge',entries:other});
 return groups.map(g=>({...g,cal:Math.round(g.entries.reduce((a,f)=>a+(n(f.cal)||0),0)),
  names:g.entries.flatMap(f=>Array.isArray(f.ingredients)&&f.ingredients.length?f.ingredients.map(i=>i.name):[f.name||'Mahlzeit'])}));
}
function totals(entries){
 const out={};for(const k of [...SUM_KEYS,'salt']){
  const vals=entries.map(f=>k==='salt'?saltOf(f):f[k]);
  out[k]=entries.length&&vals.every(v=>v!==null&&v!==undefined&&v!=='')?vals.reduce((a,v)=>a+Number(v),0):null;
 }
 return out;
}
function saltOf(entry){
 if(entry.salt!=null)return Number(entry.salt);
 const it=entry.ingredients;if(!Array.isArray(it)||!it.length||!it.every(i=>i.salt!=null))return null;
 return it.reduce((a,i)=>a+Number(i.salt)*Number(i.grams)/100,0);
}
function score(food,q,fav){
 const name=norm(food.name),words=q.split(/\s+/).filter(Boolean);
 if(!words.every(w=>name.includes(w)))return -1;
 let s=name===q?100:name.startsWith(q)?70:name.includes(q)?42:15;
 if(food.source==='custom')s+=14;if(fav)s+=13;if(food.source==='bls')s+=4;
 return s;
}
function foodId(food){return food.id||(food.source||'x')+':'+(food.code||norm(food.name));}
function search(cands,q,favIds,limit){
 q=norm(q);if(q.length<2)return [];
 const seen=new Set();
 // the same food can come from recent, favourites and the base list
 const key=f=>norm(f.name)+'|'+Math.round(Number(f.cal)||0);
 return cands.map(f=>({f,s:score(f,q,favIds&&favIds.has(foodId(f)))})).filter(x=>x.s>=0)
  .sort((a,b)=>b.s-a.s||a.f.name.length-b.f.name.length)
  .filter(x=>{const k=key(x.f);if(seen.has(k))return false;seen.add(k);return true;})
  .slice(0,limit||30).map(x=>x.f);
}
function lastGrams(foods,name){
 const list=Array.isArray(foods)?foods:[];
 for(let i=list.length-1;i>=0;i--){const it=(list[i].ingredients||[]).slice().reverse().find(x=>x&&x.name===name&&Number(x.grams)>0);if(it)return Number(it.grams);}
 return null;
}
function quickAmounts(last){
 const base=[30,50,100,150,200];
 if(last&&!base.includes(last)){base.push(last);base.sort((a,b)=>a-b);if(base.length>5)base.splice(base.indexOf(base.find(v=>v!==last&&v!==100)),1);}
 return base.slice(0,5);
}
function validTargets(t){return ['cal','protein','carbs','fat'].every(k=>Number.isFinite(t[k])&&t[k]>0);}
function validFood(f){
 if(!f||!String(f.name||'').trim())return 'Bitte einen Namen eingeben.';
 if(String(f.name).trim().length>120)return 'Der Name ist zu lang.';
 for(const k of CORE)if(n(f[k])===null)return 'Bitte Kalorien, Eiweiß, Kohlenhydrate und Fett pro 100 g eintragen.';
 if(n(f.cal)>950||['protein','carbs','fat'].some(k=>n(f[k])>100))return 'Die Werte pro 100 g sind zu hoch.';
 return null;
}
function fmtG(v,d){return v===null||v===undefined?'–':Number(v).toLocaleString('de-DE',{maximumFractionDigits:d??0})+' g';}
window.ForgeLayoutBFood=Object.freeze({SLOTS,slotForHour,slotLabel,sumItems,itemFromFood,itemKcal,entryOf,addToSlot,recomputeEntry,dayGroups,totals,saltOf,score,search,lastGrams,quickAmounts,validTargets,validFood,foodId,norm});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function todayStr(){try{if(typeof today==='function')return today();}catch(e){}const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function yesterdayStr(){const d=new Date(todayStr()+'T12:00:00');d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function mkId(){try{if(typeof uid==='function')return uid();}catch(e){}return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function nowSlot(){const d=new Date();return slotForHour(d.getHours()+d.getMinutes()/60);}
function foods(){return Array.isArray(state.foods)?state.foods:(state.foods=[]);}
function store(){try{if(typeof save==='function')save();}catch(e){console.error('FORGE Essen speichern',e);}}
function refresh(){try{if(typeof window.render==='function')window.render();}catch(e){}renderHome();}
function targets(){const t=state.targets||{};return {cal:n(t.cal)||2400,protein:n(t.protein)||150,carbs:n(t.carbs)||260,fat:n(t.fat)||75};}
function db(){
 if(!state.forgeNutritionDb||typeof state.forgeNutritionDb!=='object')state.forgeNutritionDb={favorites:[],recent:[],products:[]};
 const d=state.forgeNutritionDb;['favorites','recent','products'].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[];});return d;
}
function basicFood(name,source,code,fields){const f={name:String(name||'').trim(),source,code:code||''};for(const k of FOOD_KEYS)f[k]=n(fields[k]);f.id=foodId(f);if(fields.sweetener)f.sweetener=fields.sweetener;return f;}
function customFoods(){return Array.isArray(state.customFoods)?state.customFoods:[];}
let bls=[],blsState='idle';
function loadBls(){
 if(blsState!=='idle')return;blsState='loading';
 fetch('./bls-foods.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('BLS');return r.json();}).then(d=>{
  bls=(d&&Array.isArray(d.foods)?d.foods:[]).filter(x=>Array.isArray(x)&&x.length>=6).map(x=>{const v={};['cal','protein','carbs','fat','sugar','fiber','sat','mono','poly','polyols'].forEach((k,i)=>v[k]=x[i+2]);return basicFood(x[1],'bls',x[0],v);});
  blsState='ready';if(sheetState&&sheetState.view==='search')drawSheet();
 }).catch(()=>{blsState='failed';});
}
function candidates(){
 const d=db(),out=[].concat(d.favorites,d.recent,d.products);
 customFoods().forEach((f,i)=>{const x=basicFood(f.name,'custom',String(i),f);x.id='custom:'+norm(f.name);out.push(x);});
 try{if(typeof FOOD_DB!=='undefined')FOOD_DB.forEach((f,i)=>out.push(basicFood(f.name,'base',String(i),f)));}catch(e){}
 return out.concat(bls);
}
function favIds(){return new Set(db().favorites.map(foodId));}
function isFav(food){return favIds().has(foodId(food));}
function toggleFav(food){const d=db(),id=foodId(food);d.favorites=d.favorites.some(f=>foodId(f)===id)?d.favorites.filter(f=>foodId(f)!==id):[food].concat(d.favorites).slice(0,40);store();}
function remember(food){const d=db(),id=foodId(food);d.recent=[food].concat(d.recent.filter(f=>foodId(f)!==id)).slice(0,20);if(food.source==='off')d.products=[food].concat(d.products.filter(f=>foodId(f)!==id)).slice(0,60);store();}
function sourceText(f){return f.source==='bls'?'BLS 4.0':f.source==='off'?'Markenprodukt':f.source==='custom'?'Eigenes Lebensmittel':f.source==='base'?'FORGE Basis':'Gespeichert';}
function per100(f){return CORE.some(k=>n(f[k])===null)?'Werte unvollständig':Math.round(n(f.cal))+' kcal · '+fmtG(n(f.protein),1)+' Eiweiß / 100 g';}
const android=()=>window.ForgeAndroid||null;

const ICON={
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 back:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 plus:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#95a3b7" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#95a3b7" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>',
 scan:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="'+ACC+'" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2M8 8v8M11 8v8M14 8v8M17 8v8"/></svg>',
 again:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="'+ACC+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 108-8 8.5 8.5 0 00-6 2.5L4 8M4 4v4h4M12 8v4l3 2"/></svg>',
 star:'<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
 globe:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="'+ACC+'" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>',
 cam:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="'+ACC+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
};

/* ---------- styles ---------- */
const H='.forge-lb-food',S='.forge-lb-fs';
const CSS=`
${H}{display:flex;flex-direction:column;gap:12px;font-family:Inter,system-ui,sans-serif;color:#f3f7fc;padding-bottom:8px}
${H} .fd-head{display:flex;flex-direction:column;gap:2px;padding:6px 60px 0 4px}
body.forge-layout-b #nutrition.forge-lb-home #forge-nutrition-master,body.forge-layout-b #nutrition.forge-lb-home > #forge-nutrition-master{display:none!important}
${H} .fd-head h2{margin:0;font-size:30px;font-weight:800;letter-spacing:-.01em}
${H} .fd-head span{font-size:13px;color:#95a3b7}
${H} .fd-head span::first-letter{text-transform:uppercase}
${H} .fd-sum{background:linear-gradient(160deg,#273d2d,#171e2a 62%);border:1px solid #405d39;border-radius:24px;padding:16px;display:flex;gap:16px;align-items:center}
${H} .fd-ring{width:112px;height:112px;flex:0 0 112px;position:relative}
${H} .fd-ring>div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
${H} .fd-ring b{font-size:24px;font-weight:800}
${H} .fd-ring span{font-size:11px;color:#c3cddb}
${H} .fd-mac{flex:1;display:flex;flex-direction:column;gap:9px;min-width:0}
${H} .fd-mac>div:first-child{font-size:13px;color:#c3cddb}
${H} .fd-mac>div:first-child b{color:#f3f7fc;font-size:16px}
${H} .fd-bar{display:flex;flex-direction:column;gap:3px}
${H} .fd-bar>div:first-child{display:flex;justify-content:space-between;font-size:12px}
${H} .fd-bar>div:first-child span:last-child{color:#c3cddb}
${H} .fd-bar i{display:block;height:6px;border-radius:3px;background:#293346;overflow:hidden}
${H} .fd-bar i u{display:block;height:6px;border-radius:3px}
${H} .fd-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding:2px 4px 0}
${H} .fd-meal{display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:12px 14px;color:#f3f7fc;text-align:left;font:inherit;min-height:62px}
${H} .fd-meal>span{flex:1;min-width:0}
${H} .fd-meal b{display:block;font-size:15px}
${H} .fd-meal small{display:block;font-size:12px;color:#95a3b7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${H} .fd-meal em{font-style:normal;font-size:15px;font-weight:700;white-space:nowrap}
${H} .fd-meal.empty{background:transparent;border-style:dashed;border-color:#3a4556;color:#c3cddb}
${H} .fd-meal.empty b{color:#f3f7fc}
${H} .fd-add{height:60px;border-radius:30px;border:0;background:${ACC};color:#142016;font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:4px}
${H} button:focus-visible,${S} button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
${S}{position:fixed;inset:0;z-index:2147480300;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
${S}.full{background:#0b1018}
${S} .fs-in{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:10px 16px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;max-height:calc(100% - 36px - env(safe-area-inset-top));min-height:0}
${S}.tall .fs-in{height:calc(100% - 36px - env(safe-area-inset-top))}
${S}.full .fs-in{background:#0b1018;border:0;border-radius:0;height:100%;max-height:none;padding-top:calc(16px + env(safe-area-inset-top))}
${S} .fs-h{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center;flex:0 0 auto}
${S}.full .fs-h{display:none}
${S} .fs-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex:0 0 auto}
${S} .fs-head small{display:block;font-size:13px;color:#95a3b7}
${S} .fs-head h2{margin:0;font-size:24px;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
${S} .fs-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${S} .fs-round.on{color:${ACC}}
${S} .fs-round svg path{fill:currentColor}
${S} .fs-round:not(.on) svg path{fill:none;stroke:currentColor;stroke-width:2}
${S} .fs-search{display:flex;align-items:center;gap:10px;height:54px;flex:0 0 auto;border-radius:16px;border:2px solid ${ACC};background:#0f1620;padding:0 14px;box-sizing:border-box}
${S} .fs-search input{flex:1;min-width:0;border:0;background:transparent;color:#f3f7fc;font:inherit;font-size:16px;outline:none}
${S} .fs-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;flex:0 0 auto}
${S} .fs-tile{min-height:92px;border-radius:20px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:6px;padding:10px 16px;text-align:left;font:inherit}
${S} .fs-tile b{display:block;font-size:15px}
${S} .fs-tile small{font-size:12px;color:#95a3b7}
${S} .fs-tile[aria-pressed="true"]{border:2px solid ${ACC}}
${S} .fs-tabs{height:44px;flex:0 0 auto;border-radius:22px;background:#171e2a;border:1px solid #293346;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:4px;box-sizing:border-box;gap:4px}
${S} .fs-tabs button{border:0;border-radius:18px;background:transparent;color:#95a3b7;font:inherit;font-size:14px;font-weight:600}
${S} .fs-tabs button[aria-selected="true"]{background:#293346;color:#f3f7fc;font-weight:700}
${S} .fs-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;scrollbar-width:none;overscroll-behavior:contain}
${S} .fs-list::-webkit-scrollbar{display:none}
${S} .fs-row{flex:0 0 auto;display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:16px;padding:8px 8px 8px 14px;min-height:60px;box-sizing:border-box}
${S} .fs-row.tap{color:#f3f7fc;font:inherit;text-align:left;padding:12px 14px}
${S} .fs-row>span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
${S} .fs-row b{font-size:15px;font-weight:700;overflow-wrap:anywhere}
${S} .fs-row small{font-size:12px;color:#95a3b7}
${S} .fs-row em{font-style:normal;font-size:11px;font-weight:800;color:#142016;background:${ACC};border-radius:10px;padding:4px 8px}
${S} .fs-row .kc{font-style:normal;font-size:14px;font-weight:700;background:none;color:#f3f7fc;padding:0;white-space:nowrap}
${S} .fs-plus{width:44px;height:44px;flex:0 0 44px;border-radius:14px;border:0;background:#1a2a22;color:${ACC};display:flex;align-items:center;justify-content:center;padding:0}
${S} .fs-sec{flex:0 0 auto;font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding:6px 4px 0}
${S} .fs-dash{flex:0 0 auto;display:flex;align-items:center;gap:12px;background:transparent;border:1px dashed #3a4556;border-radius:16px;padding:12px 14px;color:#f3f7fc;text-align:left;font:inherit}
${S} .fs-dash>span{flex:1;display:flex;flex-direction:column;gap:2px}
${S} .fs-dash b{font-size:15px}
${S} .fs-dash small{font-size:12px;color:#95a3b7}
${S} .fs-hint{flex:0 0 auto;font-size:13px;color:#95a3b7;text-align:center;line-height:1.45;margin:0}
${S} .fs-hint.err{color:#ffb4b8}
${S} .fs-hint.ok{color:${ACC}}
${S} .fs-amt{display:grid;grid-template-columns:56px minmax(0,1fr) 56px;align-items:center;background:#0f1620;border:1px solid #293346;border-radius:18px;flex:0 0 auto}
${S} .fs-amt button{height:64px;border:0;background:transparent;color:#c3cddb;font:inherit;font-size:26px}
${S} .fs-amt label{display:flex;align-items:baseline;justify-content:center;gap:4px}
${S} .fs-amt input{width:110px;border:0;background:transparent;color:#f3f7fc;text-align:center;font:inherit;font-size:34px;font-weight:800;padding:0;-moz-appearance:textfield}
${S} .fs-amt input::-webkit-outer-spin-button,${S} .fs-amt input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
${S} .fs-amt span{font-size:18px;color:#95a3b7;font-weight:700}
${S} .fs-chips{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;flex:0 0 auto}
${S} .fs-chips button{height:40px;border-radius:12px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:13px;font-weight:600}
${S} .fs-chips button[aria-pressed="true"]{border:2px solid ${ACC};background:#1a2a22;font-weight:800}
${S} .fs-macros{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:12px;flex:0 0 auto}
${S} .fs-macros.three{grid-template-columns:repeat(3,minmax(0,1fr))}
${S} .fs-macros b{display:block;font-size:20px;font-weight:800}
${S} .fs-macros b.acc{color:${ACC}}
${S} .fs-macros small{font-size:11px;color:#95a3b7}
${S} .fs-seg{height:46px;flex:0 0 auto;border-radius:23px;background:#171e2a;border:1px solid #293346;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:4px;box-sizing:border-box;gap:4px}
${S} .fs-seg.two{grid-template-columns:repeat(2,minmax(0,1fr))}
${S} .fs-seg button{border:0;border-radius:19px;background:transparent;color:#95a3b7;font:inherit;font-size:13px;font-weight:600}
${S} .fs-seg button[aria-checked="true"]{background:${ACC};color:#142016;font-weight:800}
${S} .fs-main{height:62px;flex:0 0 auto;border-radius:31px;border:0;background:${ACC};color:#142016;font:inherit;font-size:18px;font-weight:800}
${S} .fs-main:disabled{opacity:.45}
${S} .fs-2nd{min-height:50px;flex:0 0 auto;border-radius:25px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;padding:0 16px}
${S} .fs-danger{min-height:50px;flex:0 0 auto;border-radius:25px;border:1px solid #4a2630;background:transparent;color:#ffc6c6;font:inherit;font-size:15px;font-weight:700;padding:0 16px}
${S} .fs-link{flex:0 0 auto;min-height:44px;border:0;background:transparent;color:${ACC};font:inherit;font-size:14px;font-weight:700}
${S} .fs-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;flex:0 0 auto}
${S} .fs-label{flex:0 0 auto;font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;padding:0 4px}
${S} .fs-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;flex:0 0 auto}
${S} .fs-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#95a3b7}
${S} .fs-form label.wide{grid-column:1/-1}
${S} .fs-form input{height:48px;border-radius:14px;border:1px solid #3a4556;background:#0f1620;color:#f3f7fc;font:inherit;font-size:16px;padding:0 12px;box-sizing:border-box;width:100%}
${S} .fs-form input:focus{outline:2px solid ${ACC};outline-offset:1px}
${S} details.fs-all{flex:0 0 auto;background:#171e2a;border:1px solid #293346;border-radius:16px;padding:0 14px}
${S} details.fs-all summary{list-style:none;cursor:pointer;min-height:46px;display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:700}
${S} details.fs-all summary::-webkit-details-marker{display:none}
${S} .fs-grid{display:grid;grid-template-columns:1fr auto;gap:7px 12px;font-size:13px;padding:0 0 12px;color:#c3cddb}
${S} .fs-grid b{color:#f3f7fc}
${S} .fs-goal{display:flex;align-items:center;justify-content:space-between;min-height:62px;border-bottom:1px solid #293346;gap:10px}
${S} .fs-goal:last-child{border-bottom:0}
${S} .fs-goal>span{font-size:15px;font-weight:600}
${S} .fs-goal>div{display:grid;grid-template-columns:44px 104px 44px;align-items:center;background:#0f1620;border-radius:12px}
${S} .fs-goal button{height:44px;border:0;background:transparent;color:#c3cddb;font:inherit;font-size:20px}
${S} .fs-goal input{width:100%;border:0;background:transparent;color:#f3f7fc;text-align:center;font:inherit;font-size:16px;font-weight:800;padding:0}
${S} .fs-box{flex:0 0 auto;background:#171e2a;border:1px solid #293346;border-radius:20px;padding:6px 14px}
${S} .fs-nav{flex:0 0 auto;width:100%;display:flex;align-items:center;justify-content:space-between;min-height:56px;border:0;border-bottom:1px solid #293346;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:600;padding:0;text-align:left}
${S} .fs-nav:last-child{border-bottom:0}
${S} .fs-nav small{display:block;font-size:12px;color:#95a3b7;font-weight:500}
${S} p.fs-text{margin:0;font-size:14px;color:#c3cddb;line-height:1.5;flex:0 0 auto}
.forge-lb-food-toast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147480900;background:#171e2a;border:1px solid #405d39;color:#f3f7fc;border-radius:22px;padding:8px 8px 8px 16px;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 10px 28px #000a;display:flex;align-items:center;gap:10px;width:min(calc(100% - 32px),440px);box-sizing:border-box}
.forge-lb-food-toast span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.forge-lb-food-toast button{min-height:36px;border-radius:18px;border:0;background:#293346;color:${ACC};font:inherit;font-weight:800;padding:0 12px}
@media (max-height:700px){${S} .fs-tile{min-height:76px}${S} .fs-main{height:56px}${S} .fs-amt button{height:56px}}
`;
function ensureCss(){if(!$('forgeLayoutBFoodCss')){const s=el('style');s.id='forgeLayoutBFoodCss';s.textContent=CSS;document.head.append(s);}}
function toast(text,undo){
 document.querySelector('.forge-lb-food-toast')?.remove();
 const t=el('div','forge-lb-food-toast');t.setAttribute('role','status');t.append(el('span','',text));
 if(undo)t.append(btn('','Rückgängig',()=>{undo();t.remove();}));
 document.body.append(t);setTimeout(()=>t.remove(),4500);
}
function snapshot(){return JSON.stringify(foods());}
function undoTo(snap){return ()=>{state.foods=JSON.parse(snap);store();refresh();};}

/* ---------- E1 Heute ---------- */
let homeRoot=null;
function mount(page,fw){
 ensureCss();
 const root=el('section','forge-lb-pg forge-lb-food');root.setAttribute('aria-label','Essen heute');
 fw.attach(page,root);homeRoot=root;
 let key='';
 return {root,render:force=>{if(!force&&key===stateKey())return;key=stateKey();renderHome();}};
}
function stateKey(){try{return JSON.stringify([todayStr(),foods().filter(f=>f.date===todayStr()).map(f=>[f.id,f.cal,f.slot,(f.ingredients||[]).length]),state.targets]);}catch(e){return '';}}
function renderHome(){
 const root=homeRoot;if(!root||typeof state==='undefined')return;
 root.replaceChildren();
 const day=todayStr(),list=foods().filter(f=>f.date===day),t=targets();
 const sum=k=>Math.round(list.reduce((a,f)=>a+(n(f[k])||0),0));
 const cal=sum('cal'),left=t.cal-cal;
 const head=el('div','fd-head');head.append(el('h2','','Essen'),el('span','',new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})));
 const card=el('div','fd-sum');
 const ring=el('div','fd-ring');const frac=Math.max(0,Math.min(1,cal/t.cal));
 ring.innerHTML='<svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="48" fill="none" stroke="#293346" stroke-width="10"/><circle cx="56" cy="56" r="48" fill="none" stroke="'+(left>=0?ACC:GOLD)+'" stroke-width="10" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="'+(301.6*(1-frac)).toFixed(1)+'" transform="rotate(-90 56 56)"/></svg>';
 const rt=el('div');rt.append(el('b','',Math.abs(left).toLocaleString('de-DE')),el('span','',left>=0?'kcal übrig':'kcal drüber'));ring.append(rt);
 ring.setAttribute('role','img');ring.setAttribute('aria-label',cal+' von '+t.cal+' Kilokalorien');
 const mac=el('div','fd-mac');const top=el('div');top.append(el('b','',cal.toLocaleString('de-DE')),document.createTextNode(' von '+t.cal.toLocaleString('de-DE')+' kcal'));mac.append(top);
 [['Eiweiß','protein','#7cc4ff'],['Kohlenhydrate','carbs',GOLD],['Fett','fat','#ff8fa3']].forEach(([label,k,c])=>{
  const b=el('div','fd-bar');const r=el('div');r.append(el('span','',label),el('span','',sum(k)+' / '+t[k]+' g'));
  const tr=el('i');const fill=el('u');fill.style.width=Math.max(0,Math.min(100,Math.round(sum(k)/t[k]*100)))+'%';fill.style.background=c;tr.append(fill);b.append(r,tr);mac.append(b);
 });
 card.append(ring,mac);
 root.append(head,card,el('div','fd-label','Heute gegessen'));
 dayGroups(foods(),day).forEach(g=>{
  if(!g.entries.length){
   const b=btn('fd-meal empty','',()=>openAdd(g.slot));const s=el('span');s.append(el('b','',g.label),el('small','','Noch nichts eingetragen'));b.append(s);b.insertAdjacentHTML('beforeend',ICON.plus);
   b.setAttribute('aria-label',g.label+' hinzufügen');root.append(b);return;
  }
  const b=btn('fd-meal','',()=>openMeal(g.slot));const s=el('span');s.append(el('b','',g.label),el('small','',[...new Set(g.names)].join(', ')));
  b.append(s,el('em','',g.cal.toLocaleString('de-DE')+' kcal'));b.insertAdjacentHTML('beforeend',ICON.chev);
  b.setAttribute('aria-label',g.label+', '+g.cal+' kcal – öffnen');root.append(b);
 });
 const add=btn('fd-add','',()=>openAdd());add.innerHTML=ICON.plus+'<span>Essen hinzufügen</span>';root.append(add);
}

/* ---------- sheet framework ---------- */
let sheetEl=null,sheetState=null;
function openSheet(st){
 ensureCss();loadBls();
 if(!sheetEl){
  sheetEl=el('div','forge-lb-fs');sheetEl.setAttribute('role','dialog');sheetEl.setAttribute('aria-modal','true');
  sheetEl.addEventListener('click',e=>{if(e.target===sheetEl)back();});
  document.body.append(sheetEl);document.addEventListener('keydown',onKey,true);
 }
 if(sheetState&&st.push!==false)st.prev=sheetState;
 sheetState=st;drawSheet();
}
function closeSheet(){if(sheetEl){sheetEl.remove();sheetEl=null;sheetState=null;document.removeEventListener('keydown',onKey,true);}}
function back(){if(sheetState&&sheetState.prev){sheetState=sheetState.prev;drawSheet();}else closeSheet();}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();}}
function frame(kind,label){
 sheetEl.className='forge-lb-fs'+(kind?' '+kind:'');sheetEl.setAttribute('aria-label',label);
 sheetEl.replaceChildren();const inner=el('div','fs-in');inner.append(el('div','fs-h'));sheetEl.append(inner);return inner;
}
function headRow(kicker,title,right){
 const h=el('div','fs-head');const t=el('div');if(kicker)t.append(el('small','',kicker));t.append(el('h2','',title));h.append(t);
 if(right)h.append(right);else{const x=btn('fs-round','',back);x.innerHTML=sheetState&&sheetState.prev?ICON.back:ICON.x;x.setAttribute('aria-label',sheetState&&sheetState.prev?'Zurück':'Schließen');h.append(x);}
 return h;
}
function drawSheet(){
 if(!sheetEl||!sheetState)return;
 const v=sheetState.view;
 try{
  if(v==='add')drawAdd();else if(v==='amount')drawAmount();else if(v==='meal')drawMeal();else if(v==='item')drawItem();
  else if(v==='scan')drawScan();else if(v==='custom')drawCustom();else if(v==='goals')drawGoals();else if(v==='mine')drawMine();
  else if(v==='backup')drawBackup();else if(v==='confirm')drawConfirm();
 }catch(e){console.error('FORGE Essen',e);}
}

/* ---------- E2 / E3 hinzufügen + suchen ---------- */
function openAdd(slot,q){openSheet({view:'add',slot:slot||nowSlot(),tab:'recent',q:q||'',push:false});}
function drawAdd(){
 const st=sheetState,searching=norm(st.q).length>=2;
 const inner=frame('tall','Essen hinzufügen');
 inner.append(headRow(slotLabel(st.slot)+(st.slot===nowSlot()?' · jetzt':''),'Essen hinzufügen'));
 const lab=el('label','fs-search');lab.innerHTML=ICON.search;
 const input=el('input');input.type='search';input.placeholder='Lebensmittel suchen';input.setAttribute('aria-label','Lebensmittel suchen');input.value=st.q;input.autocomplete='off';
 lab.append(input);inner.append(lab);
 const body=el('div','fs-list');
 input.addEventListener('input',()=>{const was=norm(st.q).length>=2;st.q=input.value;const now=norm(st.q).length>=2;if(was!==now){drawSheet();const i=sheetEl.querySelector('.fs-search input');i.focus();i.setSelectionRange(i.value.length,i.value.length);}else fillBody();});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}});
 if(!searching){
  const tiles=el('div','fs-tiles');
  const sc=btn('fs-tile','',()=>openSheet({view:'scan',slot:st.slot}));sc.innerHTML=ICON.scan;const scT=el('span');scT.append(el('b','','Scannen'),el('small','','Barcode oder Nährwerttabelle'));sc.append(scT);
  const yest=foods().filter(f=>f.date===yesterdayStr());
  const ys=yest.filter(f=>f.slot===st.slot);
  const ag=btn('fs-tile','',()=>{st.tab=st.tab==='yesterday'?'recent':'yesterday';drawSheet();});ag.innerHTML=ICON.again;ag.setAttribute('aria-pressed',String(st.tab==='yesterday'));
  const agT=el('span');agT.append(el('b','','Wie gestern'),el('small','',!yest.length?'Gestern nichts eingetragen':ys.length?slotLabel(st.slot)+' von gestern':yest.length+' '+(yest.length===1?'Eintrag':'Einträge')+' von gestern'));ag.append(agT);
  if(!yest.length)ag.disabled=true;
  tiles.append(sc,ag);inner.append(tiles);
  if(st.tab!=='yesterday'){
   const tabs=el('div','fs-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Liste');
   [['recent','Zuletzt'],['fav','Favoriten']].forEach(([k,t])=>{const b=btn('',t,()=>{st.tab=k;drawSheet();});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(st.tab===k));tabs.append(b);});
   inner.append(tabs);
  }
 }
 inner.append(body);
 const hint=el('p','fs-hint');inner.append(hint);
 function fillBody(){
  body.replaceChildren();hint.className='fs-hint';hint.textContent='';
  if(norm(st.q).length>=2){
   const res=search(candidates(),st.q,favIds(),30);
   const mine=res.filter(f=>f.source==='custom'||isFav(f)||db().recent.some(r=>foodId(r)===foodId(f)));
   const rest=res.filter(f=>!mine.includes(f));
   if(mine.length){body.append(el('div','fs-sec','Deine Lebensmittel'));mine.forEach(f=>body.append(foodRow(f,false)));}
   if(rest.length){body.append(el('div','fs-sec','Bibliothek'));rest.forEach(f=>body.append(foodRow(f,false)));}
   if(!res.length)body.append(el('p','fs-hint',blsState==='loading'?'Bibliothek wird geladen …':'Nichts gefunden – online suchen oder eigenes Lebensmittel anlegen.'));
   const on=btn('fs-dash','',()=>onlineSearch(st.q,hint));on.innerHTML=ICON.globe;const ot=el('span');ot.append(el('b','','Online nach Markenprodukten suchen'),el('small','',android()&&typeof android().queryFoodFacts==='function'?'Open Food Facts':'Nur in der Android-App mit Internet'));on.append(ot);
   const own=btn('fs-dash','',()=>openSheet({view:'custom',slot:st.slot,draft:{name:st.q.trim()}}));own.innerHTML=ICON.plus;const owt=el('span');owt.append(el('b','','Eigenes Lebensmittel anlegen'),el('small','','Werte von der Packung eintippen oder abfotografieren'));own.append(owt);
   body.append(on,own);
   if(st.online&&st.online.length){body.append(el('div','fs-sec','Markenprodukte (Open Food Facts)'));st.online.forEach(f=>body.append(foodRow(f,false)));}
   return;
  }
  if(st.tab==='yesterday'){
   const yest=foods().filter(f=>f.date===yesterdayStr());
   body.append(el('div','fs-sec','Gestern'));
   yest.forEach(f=>{
    const r=el('div','fs-row');const s=el('span');s.append(el('b','',f.slot?slotLabel(f.slot)+(f.name&&f.name!==slotLabel(f.slot)?' · '+f.name:''):(f.name||'Mahlzeit')),el('small','',Math.round(n(f.cal)||0)+' kcal'+(Array.isArray(f.ingredients)&&f.ingredients.length?' · '+f.ingredients.map(i=>i.name).join(', '):'')));
    const p=btn('fs-plus','',()=>copyEntry(f,st.slot));p.innerHTML=ICON.plus;p.setAttribute('aria-label',(f.name||'Mahlzeit')+' für heute übernehmen');
    r.append(s,p);body.append(r);
   });
   hint.textContent='+ übernimmt den Eintrag für heute ('+slotLabel(st.slot)+').';
   return;
  }
  const list=st.tab==='fav'?db().favorites:db().recent;
  if(!list.length)body.append(el('p','fs-hint',st.tab==='fav'?'Noch keine Favoriten. Beim Eintragen den Stern antippen.':'Hier erscheinen die Lebensmittel, die du zuletzt eingetragen hast.'));
  list.forEach(f=>body.append(foodRow(f,true)));
  if(list.length)hint.textContent='+ übernimmt die letzte Menge · Zeile antippen ändert sie';
 }
 fillBody();
 if(!sheetState.noFocus&&searching)requestAnimationFrame(()=>input.focus());
}
function foodRow(f,quick){
 const st=sheetState;
 const last=lastGrams(foods(),f.name);
 const complete=CORE.every(k=>n(f[k])!==null);
 if(quick&&complete){
  const r=el('div','fs-row');const s=el('span');const g=last||100;
  s.append(el('b','',f.name),el('small','',g+' g · '+Math.round(n(f.cal)*g/100)+' kcal'+(n(f.protein)?' · '+Math.round(n(f.protein)*g/100)+' g Eiweiß':'')));
  const open=btn('','',()=>openSheet({view:'amount',slot:st.slot,food:f,grams:g}));
  open.style.cssText='flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;padding:4px 0';
  open.setAttribute('aria-label',f.name+' – Menge wählen');open.append(...s.childNodes);
  const p=btn('fs-plus','',()=>addFood(f,g,st.slot,true));p.innerHTML=ICON.plus;p.setAttribute('aria-label',f.name+' '+g+' g hinzufügen');
  r.append(open,p);return r;
 }
 const b=btn('fs-row tap','',()=>openSheet({view:'amount',slot:st.slot,food:f,grams:last||100}));
 const s=el('span');s.append(el('b','',f.name),el('small','',(last?'Zuletzt '+last+' g · ':'')+per100(f)+' · '+sourceText(f)));b.append(s);
 if(isFav(f))b.append(el('em','','Favorit'));else b.insertAdjacentHTML('beforeend',ICON.chev);
 return b;
}
function addFood(food,grams,slot,fromQuick){
 const snap=snapshot();
 const item=itemFromFood(food,grams,mkId());
 state.foods=addToSlot(foods(),todayStr(),slot,item,mkId);
 remember(food);store();refresh();
 if(fromQuick&&sheetState){drawSheet();}
 toast(food.name+' · '+grams+' g → '+slotLabel(slot),undoTo(snap));
}
function copyEntry(entry,slot){
 const snap=snapshot();
 const copy=JSON.parse(JSON.stringify(entry));copy.id=mkId();copy.date=todayStr();copy.slot=slot;
 if(Array.isArray(copy.ingredients))copy.ingredients=copy.ingredients.map(i=>({...i,id:mkId()}));
 if(copy.name===slotLabel(entry.slot))copy.name=slotLabel(slot);
 state.foods=foods().concat(copy);store();refresh();
 toast((entry.name||'Mahlzeit')+' für heute übernommen',undoTo(snap));
}

/* ---------- online + barcode + OCR (native bridge, same as nutrition-plus) ---------- */
let request=null,lastOnline=0,pendingScan=null,pendingOcr=null;
function productFromOff(o){
 if(!o||!o.nutriments)return null;const m=o.nutriments;
 let kcal=n(m['energy-kcal_100g']);if(kcal===null&&n(m.energy_100g)!==null)kcal=Math.round(n(m.energy_100g)/4.184);
 const name=(o.product_name_de||o.product_name||'').trim(),brand=(o.brands||'').trim();if(!name)return null;
 const f=basicFood((brand&&!norm(name).includes(norm(brand))?brand+' · ':'')+name,'off',String(o.code||''),{cal:kcal,protein:m.proteins_100g,carbs:m.carbohydrates_100g,fat:m.fat_100g,sugar:m.sugars_100g,fiber:m.fiber_100g,sat:m['saturated-fat_100g'],mono:m['monounsaturated-fat_100g'],poly:m['polyunsaturated-fat_100g'],polyols:m.polyols_100g,salt:m.salt_100g,starch:m.starch_100g,trans:m['trans-fat_100g'],omega3:m['omega-3-fat_100g'],fructose:m.fructose_100g});
 f.brand=brand;return f;
}
function onlineSearch(q,hint){
 const a=android();
 const say=(t,c)=>{if(hint){hint.textContent=t;hint.className='fs-hint'+(c?' '+c:'');}};
 if(!a||typeof a.queryFoodFacts!=='function'){say('Die Online-Suche gibt es nur in der Android-App mit Internet.','err');return;}
 if(norm(q).length<3){say('Für die Online-Suche mindestens 3 Zeichen eingeben.','err');return;}
 if(request){say('Eine Anfrage läuft bereits …');return;}
 if(Date.now()-lastOnline<6500){say('Bitte kurz warten – Open Food Facts erlaubt nur wenige Anfragen.','err');return;}
 lastOnline=Date.now();request={id:'lbfood'+lastOnline,byBarcode:false};say('Suche bei Open Food Facts …');
 try{a.queryFoodFacts(String(q),request.id,false);}catch(e){request=null;say('Online-Suche konnte nicht gestartet werden.','err');}
}
function barcodeLookup(code){
 const st=sheetState;
 const local=db().products.find(p=>String(p.code)===code);
 if(local){openSheet({view:'amount',slot:st?st.slot:nowSlot(),food:local,grams:lastGrams(foods(),local.name)||100});return;}
 const a=android();
 if(!a||typeof a.queryFoodFacts!=='function'){scanMsg('Produkt nicht gespeichert – die Online-Abfrage gibt es nur in der Android-App.','err');return;}
 if(request){scanMsg('Eine Anfrage läuft bereits …');return;}
 request={id:'lbfood'+Date.now(),byBarcode:true};scanMsg('Suche Barcode '+code+' …');
 try{a.queryFoodFacts(code,request.id,true);}catch(e){request=null;scanMsg('Abfrage konnte nicht gestartet werden.','err');}
}
function scanMsg(t,c){const h=sheetEl?.querySelector('.fs-hint');if(h){h.textContent=t;h.className='fs-hint'+(c?' '+c:'');}}
function wrapBridge(){
 const offPrev=window.forgeOffApiResponse;
 if(!offPrev||!offPrev.__forgeLBFood){
  const f=function(id,result){
   if(!request||request.id!==id)return typeof offPrev==='function'?offPrev.apply(this,arguments):undefined;
   const byBarcode=request.byBarcode;request=null;
   try{
    if(typeof result==='string')result=JSON.parse(result);
    if(result&&result.error){scanMsg('Open Food Facts: '+String(result.error).slice(0,120),'err');return;}
    const raw=byBarcode?(result&&result.status===1?[result.product]:[]):(result&&Array.isArray(result.products)?result.products:[]);
    const list=raw.map(productFromOff).filter(Boolean);
    if(byBarcode){
     if(!list.length){scanMsg('Produkt nicht gefunden oder ohne Nährwerte. Fotografiere stattdessen die Nährwerttabelle.','err');return;}
     openSheet({view:'amount',slot:sheetState?sheetState.slot:nowSlot(),food:list[0],grams:100,note:'Gefunden per Barcode – Angaben bitte prüfen.'});return;
    }
    if(sheetState&&sheetState.view==='add'){sheetState.online=list;drawSheet();scanMsg(list.length?list.length+' Markenprodukte gefunden – Angaben prüfen.':'Keine Markenprodukte gefunden.',list.length?'ok':'err');}
   }catch(e){scanMsg('Online-Daten konnten nicht gelesen werden.','err');}
  };
  f.__forgeLBFood=true;window.forgeOffApiResponse=f;
 }
 const bcPrev=window.forgeBarcodeDetected;
 if(!bcPrev||!bcPrev.__forgeLBFood){
  const f=function(value){
   if(!pendingScan)return typeof bcPrev==='function'?bcPrev.apply(this,arguments):undefined;
   pendingScan=null;const code=String(value||'').trim();
   if(!/^\d{8,14}$/.test(code)){scanMsg('Nur EAN-/GTIN-Barcodes von Lebensmitteln werden unterstützt.','err');return;}
   barcodeLookup(code);
  };
  f.__forgeLBFood=true;window.forgeBarcodeDetected=f;
 }
 const errPrev=window.forgeBarcodeScanError;
 if(!errPrev||!errPrev.__forgeLBFood){
  const f=function(error){if(!pendingScan)return typeof errPrev==='function'?errPrev.apply(this,arguments):undefined;pendingScan=null;scanMsg('Kamera nicht verfügbar – Barcode unten eintippen.','err');};
  f.__forgeLBFood=true;window.forgeBarcodeScanError=f;
 }
 const ocrPrev=window.forgeNutritionOcrResult;
 if(!ocrPrev||!ocrPrev.__forgeLBFood){
  const f=function(result,error){
   if(!pendingOcr)return typeof ocrPrev==='function'?ocrPrev.apply(this,arguments):undefined;
   pendingOcr=null;
   if(error){scanMsg('Texterkennung fehlgeschlagen: '+String(error).slice(0,80),'err');return;}
   const vals=parseLabel(String(result||''));
   if(!vals){scanMsg('Keine Nährwerte erkannt – bitte schärfer fotografieren oder eintippen.','err');return;}
   if(sheetState&&sheetState.view==='custom'){Object.assign(sheetState.draft,vals);drawSheet();scanMsg('Werte erkannt – bitte mit der Packung vergleichen.','ok');}
  };
  f.__forgeLBFood=true;window.forgeNutritionOcrResult=f;
 }
}
/* Uses the app's own label parser (parseLabelText) on its hidden form fields. */
function parseLabel(text){
 const ocr=$('ocrText');if(!ocr||typeof parseLabelText!=='function')return null;
 const ids={cal:'ingredientCal',protein:'ingredientProtein',carbs:'ingredientCarbs',fat:'ingredientFat',sugar:'ingredientSugar',fiber:'ingredientFiber',sat:'ingredientSat'};
 const before={};for(const [k,id] of Object.entries(ids)){const i=$(id);before[k]=i?i.value:'';if(i)i.value='';}
 ocr.value=text;
 try{parseLabelText();}catch(e){}
 const out={};let got=0;
 for(const [k,id] of Object.entries(ids)){const i=$(id);const v=i?n(i.value):null;if(v!==null){out[k]=v;got++;}if(i)i.value=before[k];}
 return got?out:null;
}
function drawScan(){
 const st=sheetState;const a=android();
 const inner=frame('','Scannen');inner.append(headRow(slotLabel(st.slot),'Scannen'));
 const can=a&&typeof a.scanBarcode==='function';
 const bc=btn('fs-dash','',()=>{if(!can){scanMsg('Die Barcode-Kamera gibt es nur in der Android-App.','err');return;}pendingScan={at:Date.now()};scanMsg('Kamera öffnet sich …');try{a.scanBarcode();}catch(e){pendingScan=null;scanMsg('Kamera konnte nicht geöffnet werden.','err');}});
 bc.innerHTML=ICON.scan;const bt=el('span');bt.append(el('b','','Barcode scannen'),el('small','',can?'Markenprodukt über Open Food Facts finden':'Nur in der Android-App'));bc.append(bt);
 const ph=btn('fs-dash','',()=>openSheet({view:'custom',slot:st.slot,draft:{},photo:true}));ph.innerHTML=ICON.cam;const pt=el('span');pt.append(el('b','','Nährwerttabelle fotografieren'),el('small','','Werte werden erkannt, du prüfst sie'));ph.append(pt);
 inner.append(bc,ph,el('div','fs-label','Oder Barcode eintippen'));
 const form=el('div','fs-form');const l=el('label','wide');const i=el('input');i.inputMode='numeric';i.maxLength=14;i.placeholder='EAN/GTIN, 8–14 Ziffern';i.setAttribute('aria-label','Barcode eingeben');l.append(i);form.append(l);inner.append(form);
 inner.append(btn('fs-2nd','Barcode suchen',()=>{const c=i.value.trim();if(!/^\d{8,14}$/.test(c)){scanMsg('Der Barcode hat 8 bis 14 Ziffern.','err');return;}barcodeLookup(c);}));
 inner.append(el('p','fs-hint',''));
}

/* ---------- E4 Menge ---------- */
function drawAmount(){
 const st=sheetState,f=st.food;
 if(st.vals===undefined)st.vals={};
 const missing=CORE.filter(k=>n(f[k])===null&&n(st.vals[k])===null);
 const val=k=>n(f[k])!==null?n(f[k]):n(st.vals[k]);
 const inner=frame('','Menge wählen');
 const star=btn('fs-round'+(isFav(f)?' on':''),'',()=>{toggleFav(f);drawSheet();});star.innerHTML=ICON.star;star.setAttribute('aria-label',isFav(f)?'Als Favorit entfernen':'Als Favorit merken');star.setAttribute('aria-pressed',String(isFav(f)));
 const right=el('div');right.style.cssText='display:flex;gap:8px';const x=btn('fs-round','',back);x.innerHTML=ICON.back;x.setAttribute('aria-label','Zurück');right.append(star,x);
 inner.append(headRow(val('cal')!==null?Math.round(val('cal'))+' kcal / 100 g · '+sourceText(f):sourceText(f),f.name,right));
 if(st.note)inner.append(el('p','fs-hint ok',st.note));
 if(missing.length){
  inner.append(el('p','fs-hint err','Hier fehlen Werte pro 100 g – bitte von der Packung ergänzen.'));
  const form=el('div','fs-form');
  missing.forEach(k=>{const l=el('label','',{cal:'Kalorien (kcal)',protein:'Eiweiß (g)',carbs:'Kohlenhydrate (g)',fat:'Fett (g)'}[k]);const i=el('input');i.inputMode='decimal';i.value=st.vals[k]??'';i.addEventListener('change',()=>{st.vals[k]=i.value;drawSheet();});l.append(i);form.append(l);});
  inner.append(form);
 }
 const amt=el('div','fs-amt');
 const minus=btn('','−',()=>{st.grams=Math.max(1,Math.round((Number(st.grams)||0)-10));drawSheet();});minus.setAttribute('aria-label','10 g weniger');
 const plus=btn('','+',()=>{st.grams=Math.min(5000,Math.round((Number(st.grams)||0)+10));drawSheet();});plus.setAttribute('aria-label','10 g mehr');
 const lab=el('label');const inp=el('input');inp.type='number';inp.inputMode='decimal';inp.min='1';inp.max='5000';inp.value=String(st.grams);inp.setAttribute('aria-label','Menge in Gramm');
 inp.addEventListener('input',()=>{const g=n(inp.value);if(g!==null&&g>0){st.grams=Math.min(5000,g);updateMacros();}});
 lab.append(inp,el('span','','g'));amt.append(minus,lab,plus);inner.append(amt);
 const chips=el('div','fs-chips');
 quickAmounts(lastGrams(foods(),f.name)).forEach(g=>{const b=btn('',g+' g',()=>{st.grams=g;drawSheet();});b.setAttribute('aria-pressed',String(Number(st.grams)===g));chips.append(b);});
 inner.append(chips);
 const mac=el('div','fs-macros');inner.append(mac);
 function updateMacros(){
  const g=Number(st.grams)||0;mac.replaceChildren();
  [['kcal','cal',true],['Eiweiß','protein'],['Kohlenh.','carbs'],['Fett','fat']].forEach(([label,k,acc])=>{const d=el('div');const v=val(k);d.append(el('b',acc?'acc':'',v===null?'–':Math.round(v*g/100)+(acc?'':' g')),el('small','',label));mac.append(d);});
  const go=sheetEl.querySelector('.fs-main');if(go)go.textContent=Math.round(g)+' g hinzufügen';
 }
 inner.append(el('div','fs-label','Mahlzeit'));
 const seg=el('div','fs-seg');seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label','Mahlzeit');
 SLOTS.forEach(([k,,short])=>{const b=btn('',short,()=>{st.slot=k;drawSheet();});b.setAttribute('role','radio');b.setAttribute('aria-checked',String(st.slot===k));seg.append(b);});
 inner.append(seg);
 const err=el('p','fs-hint');inner.append(err);
 const go=btn('fs-main','',()=>{
  const g=Number(st.grams);
  if(!(g>0&&g<=5000)){err.textContent='Bitte eine Menge zwischen 1 und 5000 g eingeben.';err.className='fs-hint err';return;}
  const food={...f};for(const k of CORE)if(n(food[k])===null)food[k]=n(st.vals[k]);
  if(CORE.some(k=>n(food[k])===null)){err.textContent='Bitte die fehlenden Werte pro 100 g eintragen.';err.className='fs-hint err';return;}
  addFood(food,Math.round(g*10)/10,st.slot,false);
  if(st.compose){openSheet({view:'add',slot:st.slot,tab:'recent',q:'',push:false});}
  else closeSheet();
 });
 inner.append(go);
 inner.append(btn('fs-link','',()=>{st.compose=true;go.click();}));
 inner.lastChild.textContent='Weitere Zutat dazu (Mahlzeit zusammenstellen)';
 updateMacros();
}

/* ---------- E5 Mahlzeit ---------- */
function openMeal(slot){openSheet({view:'meal',slot,push:false});}
function mealEntries(slot){const day=todayStr();return foods().filter(f=>f.date===day&&(slot?f.slot===slot:!SLOTS.some(s=>s[0]===f.slot)));}
function drawMeal(){
 const st=sheetState,entries=mealEntries(st.slot);
 if(!entries.length){closeSheet();renderHome();return;}
 const tt=totals(entries);
 const inner=frame('tall',slotLabel(st.slot));
 inner.append(headRow('Heute',(st.slot?slotLabel(st.slot):'Weitere Einträge')+' · '+Math.round(tt.cal||0).toLocaleString('de-DE')+' kcal'));
 const mac=el('div','fs-macros three');[['Eiweiß','protein'],['Kohlenhydrate','carbs'],['Fett','fat']].forEach(([l,k])=>{const d=el('div');d.append(el('b','',fmtG(tt[k])),el('small','',l));mac.append(d);});inner.append(mac);
 const body=el('div','fs-list');
 entries.forEach(entry=>{
  if(Array.isArray(entry.ingredients)&&entry.ingredients.length){
   if(entries.length>1&&entry.name&&entry.name!==slotLabel(entry.slot))body.append(el('div','fs-sec',entry.name));
   entry.ingredients.forEach(it=>{
    const b=btn('fs-row tap','',()=>openSheet({view:'item',slot:st.slot,entryId:entry.id,itemId:it.id,grams:Number(it.grams)}));
    const s=el('span');s.append(el('b','',it.name),el('small','',fmtG(Number(it.grams),1)));b.append(s,el('em','kc',itemKcal(it)+' kcal'));
    b.setAttribute('aria-label',it.name+', '+it.grams+' g – ändern');body.append(b);
   });
  }else{
   const b=btn('fs-row tap','',()=>openSheet({view:'item',slot:st.slot,entryId:entry.id,itemId:null}));
   const s=el('span');s.append(el('b','',entry.name||'Mahlzeit'),el('small','','Eintrag'));b.append(s,el('em','kc',Math.round(n(entry.cal)||0)+' kcal'));body.append(b);
  }
 });
 body.append(el('p','fs-hint','Eintrag antippen: Menge ändern oder löschen'));
 const det=el('details','fs-all');const sm=el('summary','','Alle Nährwerte');det.append(sm);
 const grid=el('div','fs-grid');
 [['davon gesättigte Fette','sat'],['einfach ungesättigt','mono'],['mehrfach ungesättigt','poly'],['davon Zucker','sugar'],['Ballaststoffe','fiber'],['Salz','salt']].forEach(([l,k])=>{grid.append(el('span','',l),el('b','',tt[k]===null?'keine Angabe':fmtG(tt[k],1)));});
 det.append(grid);body.append(det);
 inner.append(body);
 const pair=el('div','fs-pair');
 pair.append(btn('fs-danger','Mahlzeit löschen',()=>openSheet({view:'confirm',title:'Mahlzeit löschen?',text:'Alle Einträge von „'+slotLabel(st.slot)+'“ heute werden entfernt.',ok:'Löschen',danger:true,action:()=>{const snap=snapshot();const ids=new Set(entries.map(e=>e.id));state.foods=foods().filter(f=>!ids.has(f.id));store();refresh();closeSheet();toast(slotLabel(st.slot)+' gelöscht',undoTo(snap));}})));
 pair.append(btn('fs-main','Zutat hinzufügen',()=>openSheet({view:'add',slot:st.slot||nowSlot(),tab:'recent',q:'',push:false})));
 pair.lastChild.style.height='50px';pair.lastChild.style.fontSize='15px';
 inner.append(pair);
}
function drawItem(){
 const st=sheetState;const entry=foods().find(f=>f.id===st.entryId);if(!entry){back();return;}
 const it=st.itemId?(entry.ingredients||[]).find(i=>i.id===st.itemId):null;
 const inner=frame('',it?it.name:(entry.name||'Eintrag'));
 inner.append(headRow(slotLabel(entry.slot),it?it.name:(entry.name||'Eintrag')));
 if(it){
  const amt=el('div','fs-amt');
  const minus=btn('','−',()=>{st.grams=Math.max(1,Math.round(st.grams-10));drawSheet();});minus.setAttribute('aria-label','10 g weniger');
  const plus=btn('','+',()=>{st.grams=Math.min(5000,Math.round(st.grams+10));drawSheet();});plus.setAttribute('aria-label','10 g mehr');
  const lab=el('label');const inp=el('input');inp.type='number';inp.inputMode='decimal';inp.value=String(st.grams);inp.setAttribute('aria-label','Menge in Gramm');
  inp.addEventListener('change',()=>{const g=n(inp.value);if(g!==null&&g>0){st.grams=Math.min(5000,g);drawSheet();}});
  lab.append(inp,el('span','','g'));amt.append(minus,lab,plus);inner.append(amt);
  inner.append(el('p','fs-hint',Math.round((n(it.cal)||0)*st.grams/100)+' kcal · '+Math.round((n(it.protein)||0)*st.grams/100)+' g Eiweiß'));
  inner.append(btn('fs-main','Menge speichern',()=>{
   const snap=snapshot();
   state.foods=foods().map(f=>f.id!==entry.id?f:recomputeEntry({...f,ingredients:f.ingredients.map(i=>i.id===it.id?{...i,grams:Math.round(st.grams*10)/10}:i)}));
   store();refresh();back();toast(it.name+' · '+st.grams+' g gespeichert',undoTo(snap));
  }));
 }else inner.append(el('p','fs-text',Math.round(n(entry.cal)||0)+' kcal · '+fmtG(n(entry.protein))+' Eiweiß · '+fmtG(n(entry.carbs))+' Kohlenhydrate · '+fmtG(n(entry.fat))+' Fett'));
 inner.append(btn('fs-danger',it?'Aus der Mahlzeit entfernen':'Eintrag löschen',()=>{
  const snap=snapshot();
  if(it&&entry.ingredients.length>1)state.foods=foods().map(f=>f.id!==entry.id?f:recomputeEntry({...f,ingredients:f.ingredients.filter(i=>i.id!==it.id)}));
  else state.foods=foods().filter(f=>f.id!==entry.id);
  store();refresh();back();toast((it?it.name:entry.name||'Eintrag')+' entfernt',undoTo(snap));
 }));
}
function drawConfirm(){
 const st=sheetState;const inner=frame('',st.title);
 inner.append(headRow('',st.title));inner.append(el('p','fs-text',st.text));
 inner.append(btn(st.danger?'fs-danger':'fs-main',st.ok,()=>st.action()));
 inner.append(btn('fs-2nd','Abbrechen',back));
}

/* ---------- eigenes Lebensmittel (E3) ---------- */
function drawCustom(){
 const st=sheetState,d=st.draft||(st.draft={});
 const inner=frame('tall','Eigenes Lebensmittel');
 inner.append(headRow(st.editIndex!=null?'Eigenes Lebensmittel bearbeiten':'Pro 100 g, wie auf der Packung',st.editIndex!=null?d.name||'Lebensmittel':'Eigenes Lebensmittel'));
 const body=el('div','fs-list');
 const a=android(),canOcr=a&&typeof a.scanNutritionImage==='function';
 const ph=btn('fs-dash','',()=>{if(!canOcr){scanMsg('Das Erkennen von Fotos gibt es nur in der Android-App – Werte bitte eintippen.','err');return;}pick.click();});
 ph.innerHTML=ICON.cam;const pt=el('span');pt.append(el('b','','Nährwerttabelle fotografieren'),el('small','',canOcr?'Werte werden erkannt, du prüfst sie':'Nur in der Android-App'));ph.append(pt);
 const pick=el('input');pick.type='file';pick.accept='image/*';pick.setAttribute('capture','environment');pick.hidden=true;
 pick.addEventListener('change',()=>{const file=pick.files&&pick.files[0];if(file)ocrFile(file);});
 body.append(ph,pick);
 const form=el('div','fs-form');
 const field=(label,key,wide,mode)=>{const l=el('label',wide?'wide':'',label);const i=el('input');i.type='text';i.inputMode=mode||'decimal';i.value=d[key]??'';i.addEventListener('input',()=>{d[key]=i.value;});if(key==='name')i.autocomplete='off';l.append(i);form.append(l);};
 field('Name','name',true,'text');
 field('Kalorien (kcal)','cal');field('Eiweiß (g)','protein');field('Kohlenhydrate (g)','carbs');field('Fett (g)','fat');
 body.append(form,el('div','fs-label','Optional'));
 const f2=el('div','fs-form');const field2=(label,key)=>{const l=el('label','',label);const i=el('input');i.type='text';i.inputMode='decimal';i.value=d[key]??'';i.addEventListener('input',()=>{d[key]=i.value;});l.append(i);f2.append(l);};
 field2('davon Zucker (g)','sugar');field2('Ballaststoffe (g)','fiber');field2('gesättigte Fette (g)','sat');field2('Salz (g)','salt');
 body.append(f2);inner.append(body);
 inner.append(el('p','fs-hint',''));
 inner.append(btn('fs-main','Speichern',()=>{
  const food={name:String(d.name||'').trim()};for(const k of ['cal','protein','carbs','fat','sugar','fiber','sat','salt']){const v=n(d[k]);if(v!==null)food[k]=v;}
  const issue=validFood(food);if(issue){scanMsg(issue,'err');return;}
  const list=customFoods().filter((x,i)=>i!==st.editIndex&&norm(x.name)!==norm(food.name));
  const keep=st.editIndex!=null?customFoods()[st.editIndex]:null;
  state.customFoods=list.concat({...(keep||{}),...food});store();
  const asFood=basicFood(food.name,'custom','',food);asFood.id='custom:'+norm(food.name);
  if(st.editIndex!=null||st.fromMine){back();toast(food.name+' gespeichert');return;}
  openSheet({view:'amount',slot:st.slot||nowSlot(),food:asFood,grams:100,note:'Gespeichert unter „Eigene Lebensmittel“.',push:false});
 }));
 if(st.photo&&!st.photoAsked){st.photoAsked=true;if(canOcr)setTimeout(()=>pick.click(),50);}
}
function ocrFile(file){
 const a=android();if(!a)return;
 const img=new Image();const url=URL.createObjectURL(file);
 img.onload=()=>{
  try{
   const scale=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
   const ctx=c.getContext('2d');ctx.filter='grayscale(1) contrast(1.5)';ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
   pendingOcr={at:Date.now()};scanMsg('Nährwerttabelle wird gelesen …');a.scanNutritionImage(c.toDataURL('image/jpeg',0.82));
  }catch(e){pendingOcr=null;scanMsg('Foto konnte nicht gelesen werden.','err');}
 };
 img.onerror=()=>{scanMsg('Foto konnte nicht geöffnet werden.','err');};
 img.src=url;
}

/* ---------- E6 Ziele, eigene Lebensmittel, Datensicherung ---------- */
function openGoals(){ensureCss();openSheet({view:'goals',push:false});}
function drawGoals(){
 const st=sheetState;if(!st.t)st.t={...targets()};
 const inner=frame('full','Tagesziele Essen');
 inner.append(headRow('Einstellungen','Tagesziele Essen'));
 inner.append(el('p','fs-text','Gelten für jeden Tag. Der Ring auf „Essen“ zählt dagegen.'));
 const box=el('div','fs-box');
 [['Kalorien','cal',50,' kcal'],['Eiweiß','protein',5,' g'],['Kohlenhydrate','carbs',5,' g'],['Fett','fat',5,' g']].forEach(([label,k,step])=>{
  const row=el('div','fs-goal');row.append(el('span','',label));
  const ctl=el('div');const m=btn('','−',()=>{st.t[k]=Math.max(step,Math.round((st.t[k]-step)/step)*step);drawSheet();});m.setAttribute('aria-label',label+' verringern');
  const i=el('input');i.type='number';i.inputMode='numeric';i.value=String(st.t[k]);i.setAttribute('aria-label',label);i.addEventListener('change',()=>{const v=n(i.value);if(v!==null)st.t[k]=Math.round(v);});
  const p=btn('','+',()=>{st.t[k]=Math.round((st.t[k]+step)/step)*step;drawSheet();});p.setAttribute('aria-label',label+' erhöhen');
  ctl.append(m,i,p);row.append(ctl);box.append(row);
 });
 inner.append(box);
 const kcalFromMacros=Math.round(st.t.protein*4+st.t.carbs*4+st.t.fat*9);
 inner.append(el('p','fs-hint',kcalFromMacros+' kcal ergeben sich aus den Makros ('+(kcalFromMacros>st.t.cal?'+':'')+(kcalFromMacros-st.t.cal)+' zum Kalorienziel).'));
 inner.append(el('div','fs-label','Ebenfalls hier'));
 const nav=el('div','fs-box');
 const r1=btn('fs-nav','',()=>openSheet({view:'mine'}));const r1s=el('span');r1s.append(document.createTextNode('Eigene Lebensmittel verwalten'),el('small','',customFoods().length+' gespeichert'));r1.append(r1s);r1.insertAdjacentHTML('beforeend',ICON.chev);
 const r2=btn('fs-nav','',()=>openSheet({view:'backup'}));const r2s=el('span');r2s.append(document.createTextNode('Datensicherung & Export'),el('small','','Backup als Datei, wiederherstellen'));r2.append(r2s);r2.insertAdjacentHTML('beforeend',ICON.chev);
 nav.append(r1,r2);inner.append(nav);
 const spacer=el('div');spacer.style.flex='1';inner.append(spacer);
 const err=el('p','fs-hint');inner.append(err);
 inner.append(btn('fs-main','Ziele speichern',()=>{
  const t={cal:Number(st.t.cal),protein:Number(st.t.protein),carbs:Number(st.t.carbs),fat:Number(st.t.fat)};
  if(!validTargets(t)){err.textContent='Bitte gültige positive Ziele eingeben.';err.className='fs-hint err';return;}
  state.targets=t;store();refresh();closeSheet();toast('Tagesziele gespeichert');
 }));
}
function drawMine(){
 const inner=frame('full','Eigene Lebensmittel');
 inner.append(headRow('Einstellungen','Eigene Lebensmittel'));
 const body=el('div','fs-list');
 const list=customFoods();
 if(!list.length)body.append(el('p','fs-hint','Noch keine eigenen Lebensmittel. Lege eins an oder fotografiere eine Nährwerttabelle.'));
 list.forEach((f,i)=>{
  const r=el('div','fs-row');
  const ed=btn('','',()=>openSheet({view:'custom',editIndex:i,fromMine:true,draft:{name:f.name,cal:f.cal,protein:f.protein,carbs:f.carbs,fat:f.fat,sugar:f.sugar,fiber:f.fiber,sat:f.sat,salt:f.salt}}));
  ed.style.cssText='flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;padding:4px 0';
  ed.append(el('b','',f.name),el('small','',per100(f)));ed.setAttribute('aria-label',f.name+' bearbeiten');
  const del=btn('fs-plus','',()=>openSheet({view:'confirm',title:'„'+f.name+'“ löschen?',text:'Das eigene Lebensmittel wird entfernt. Bereits eingetragene Mahlzeiten bleiben unverändert.',ok:'Löschen',danger:true,action:()=>{state.customFoods=customFoods().filter((_,j)=>j!==i);store();back();toast(f.name+' gelöscht');}}));
  del.innerHTML=ICON.x;del.style.background='#2a171c';del.style.color='#ffc6c6';del.setAttribute('aria-label',f.name+' löschen');
  r.append(ed,del);body.append(r);
 });
 inner.append(body);
 inner.append(btn('fs-main','Neues Lebensmittel anlegen',()=>openSheet({view:'custom',fromMine:true,draft:{}})));
}
function drawBackup(){
 const inner=frame('full','Datensicherung');
 inner.append(headRow('Einstellungen','Datensicherung'));
 inner.append(el('p','fs-text','Alle Daten bleiben auf diesem Gerät. Exportiere nach wichtigen Änderungen eine Sicherung, besonders vor einem Handywechsel.'));
 const box=el('div','fs-box');
 const ex=btn('fs-nav','',()=>{if(typeof window.exportData==='function')window.exportData();});const exs=el('span');exs.append(document.createTextNode('Backup als Datei exportieren'),el('small','','JSON-Datei mit allen Trainings, Plänen und Essen'));ex.append(exs);ex.insertAdjacentHTML('beforeend',ICON.chev);
 const im=btn('fs-nav','',()=>file.click());const ims=el('span');ims.append(document.createTextNode('Backup wiederherstellen'),el('small','','Ersetzt die aktuellen Daten durch die Datei'));im.append(ims);im.insertAdjacentHTML('beforeend',ICON.chev);
 const file=el('input');file.type='file';file.accept='application/json,.json';file.hidden=true;
 file.addEventListener('change',e=>{if(typeof window.importData==='function'){Promise.resolve(window.importData(e)).finally(()=>{closeSheet();refresh();});}});
 const more=btn('fs-nav','',()=>{closeSheet();if(typeof window.go==='function')window.go('nutrition');$('nutrition')?.classList.remove('forge-lb-home');window.ForgeNutritionSlim?.openPart?.('backup');});const ms=el('span');ms.append(document.createTextNode('Erweiterte Sicherung'),el('small','','Automatische Sicherung und weitere Optionen'));more.append(ms);more.insertAdjacentHTML('beforeend',ICON.chev);
 box.append(ex,im,more);inner.append(box,file);
 const spacer=el('div');spacer.style.flex='1';inner.append(spacer);
 inner.append(btn('fs-danger','Alle Daten löschen …',()=>openSheet({view:'confirm',title:'Wirklich alle Daten löschen?',text:'Trainings, Pläne, Essen und Einstellungen werden auf diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen – exportiere vorher ein Backup.',ok:'Alles löschen',danger:true,action:()=>{
  const prev=window.confirm;window.confirm=()=>true;try{if(typeof window.resetData==='function')window.resetData();}finally{window.confirm=prev;}closeSheet();refresh();toast('Alle Daten gelöscht');}})));
}

/* ---------- install ---------- */
function install(){
 if(!document.body||!enabled())return false;
 wrapBridge();setTimeout(wrapBridge,1500);
 window.ForgeLayoutBFoodOpen=(what,arg)=>{if(!enabled())return false;ensureCss();if(what==='goals')openGoals();else if(what==='backup')openSheet({view:'backup',push:false});else if(what==='mine')openSheet({view:'mine',push:false});else openAdd(arg);return true;};
 return true;
}
window.ForgeLayoutBFoodMount=mount;
function boot(){if(install())return;let k=0;const t=setInterval(()=>{if(install()||++k>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
