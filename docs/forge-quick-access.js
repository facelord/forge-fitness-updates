/* FORGE | quick-access polishing without duplicating meal or exercise data sources.
 * Favorites are saved in FORGE's existing state, and recent meals are exact copies
 * of past entries (including portion sizes), explicitly marked as repeats.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,label)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(label!==undefined)x.textContent=label;return x;};
function cleanFavorites(input){
 return Array.isArray(input)?[...new Set(input.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))].slice(0,150):[];
}
function recentMeals(input,limit=3){
 const meals=Array.isArray(input)?input:[];
 const found=[],names=new Set();
 for(let i=meals.length-1;i>=0&&found.length<limit;i--){
  const meal=meals[i];
  if(!meal||typeof meal!=='object'||typeof meal.name!=='string'||!meal.name.trim())continue;
  const name=meal.name.trim().toLocaleLowerCase('de-DE');
  if(names.has(name))continue;
  names.add(name);found.push(meal);
 }
 return found;
}
function copyMeal(meal,id,date){
 const copy=JSON.parse(JSON.stringify(meal));
 copy.id=id;copy.date=date;return copy;
}
window.ForgeQuickAccess=Object.freeze({cleanFavorites,recentMeals,copyMeal,isInstalled:()=>installed});
let installed=false,observing=false,filterFavorites=false,recentUndo=null,scheduled=false;
function favorites(){return cleanFavorites(typeof state==='object'?state.forgeExerciseFavorites:null);}
function isFavorite(name){return favorites().includes(name);}
function toggleFavorite(name){
 if(!name||typeof state==='undefined'||typeof save!=='function')return;
 const current=favorites();
 state.forgeExerciseFavorites=current.includes(name)?current.filter(x=>x!==name):[...current,name];
 save();updateCatalog();
}
function exerciseName(item){
 const existing=item.dataset.forgeFavoriteName;if(existing)return existing;
 const summary=item.querySelector(':scope > summary');if(!summary)return '';
 const cloned=summary.cloneNode(true);
 cloned.querySelectorAll('.forge-quick-star').forEach(x=>x.remove());
 const name=(cloned.querySelector('strong')||cloned.querySelector('span')||cloned).textContent.trim().replace(/\s+/g,' ');
 const safe=name.slice(0,160);
 item.dataset.forgeFavoriteName=safe;
 return safe;
}
function updateCatalog(){
 const results=$('forgeCatalogResults');
 if(!results)return;
 const list=Array.from(results.children).filter(x=>x.tagName==='DETAILS');
 list.forEach(item=>{
  const name=exerciseName(item),summary=item.querySelector(':scope > summary');
  if(!name||!summary)return;
  let star=summary.querySelector('.forge-quick-star');
  if(!star){
   star=el('button','forge-quick-star');star.type='button';
   star.setAttribute('aria-label',name+' als Favorit markieren');
   star.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();toggleFavorite(name);
   });
   summary.append(star);
  }
  const marked=isFavorite(name);
  if(star.textContent!==(marked?'★':'☆'))star.textContent=marked?'★':'☆';
  star.setAttribute('aria-pressed',String(marked));
  star.setAttribute('aria-label',(marked?'Aus Favoriten entfernen: ':'Als Favorit merken: ')+name);
  item.hidden=filterFavorites&&!marked;
 });
 const control=$('forgeQuickFavoritesToggle');
 if(control){
  control.textContent=filterFavorites?'★ Alle Übungen anzeigen':'☆ Nur Favoriten';
  control.setAttribute('aria-pressed',String(filterFavorites));
 }
}
function installCatalog(){
 const catalog=$('forgeCatalog'),results=$('forgeCatalogResults'),choices=$('forgeCatalogCategoryChoices');
 if(!catalog||!results||!choices)return false;
 if(!$('forgeQuickFavoritesBar')){
  const bar=el('div','forge-quick-favorites');bar.id='forgeQuickFavoritesBar';
  const button=el('button','btn alt small','☆ Nur Favoriten');
  button.id='forgeQuickFavoritesToggle';button.type='button';
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{filterFavorites=!filterFavorites;updateCatalog();});
  bar.append(button);
  choices.after(bar);
 }
 updateCatalog();
 return true;
}
function repeatMeal(meal){
 if(!meal||!Array.isArray(state?.foods)||typeof save!=='function'||typeof render!=='function')return;
 const id=typeof uid==='function'?uid():'repeat-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const date=typeof today==='function'?today():new Date().toLocaleDateString('sv-SE');
 const copy=copyMeal(meal,id,date);
 state.foods.push(copy);recentUndo=id;
 save();render();refreshMeals();
}
function undo(){
 if(!recentUndo||!Array.isArray(state?.foods))return;
 state.foods=state.foods.filter(x=>x.id!==recentUndo);
 recentUndo=null;save();render();refreshMeals();
}
function refreshMeals(){
 const root=$('forgeQuickRecentMeals');
 if(!root||!Array.isArray(state?.foods))return;
 const items=recentMeals(state.foods,3);
 root.replaceChildren();
 if(!items.length){root.hidden=true;return;}root.hidden=false;
 root.append(el('h3','','Zuletzt verwendet'));
 const hint=el('p','forge-quick-note','Erneut hinzufügen übernimmt die zuletzt gespeicherte Portion.');
 root.append(hint);
 for(const meal of items){
  const row=el('div','forge-quick-meal');
  row.append(el('span','',meal.name));
  const repeat=el('button','btn alt small','＋ Erneut');
  repeat.type='button';repeat.setAttribute('aria-label',meal.name+' mit letzter Portion erneut erfassen');
  repeat.addEventListener('click',()=>repeatMeal(meal));
  row.append(repeat);root.append(row);
 }
 if(recentUndo&&state.foods.some(x=>x.id===recentUndo)){
  const revert=el('button','forge-quick-undo','↶ Letzte Wiederholung rückgängig');
  revert.type='button';revert.addEventListener('click',undo);root.append(revert);
 }
}
function installMeals(){
 const actions=$('forgeSlimNutriActions');
 if(!actions)return false;
 if(!$('forgeQuickRecentMeals')){
  const root=el('section','forge-quick-recents');root.id='forgeQuickRecentMeals';
  actions.after(root);
 }
 refreshMeals();
 return true;
}
function schedule(){
 if(scheduled)return;
 scheduled=true;
 const fn=()=>{scheduled=false;updateCatalog();refreshMeals();};
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(fn);
 else setTimeout(fn,0);
}
function styles(){
 if($('forgeQuickAccessStyle'))return;
 const style=el('style');style.id='forgeQuickAccessStyle';
 style.textContent=[
 '#forgeCatalog .forge-quick-favorites{display:flex;justify-content:flex-start;margin:4px 0 8px}',
 '#forgeCatalog .forge-quick-favorites button{min-height:44px;font-size:13px!important}',
 '#forgeCatalog .forge-quick-star{display:inline-flex;align-items:center;justify-content:center;flex:none;min-width:43px;min-height:43px;color:#c7f38e;background:#243c34;border:1px solid #4f725a;border-radius:10px;font-size:24px;cursor:pointer}',
 '#forgeCatalog .forge-quick-star[aria-pressed=true]{color:#a8f55d}',
 '#forgeCatalogResults>details[hidden]{display:none!important}',
 '#nutrition .forge-quick-recents{margin:7px 0 14px;border-top:1px solid #344d41;padding:10px 0 0}',
 '#nutrition .forge-quick-recents[hidden]{display:none!important}',
 '#nutrition .forge-quick-recents h3{font-size:15px;margin:0 0 4px;color:#eef7eb}',
 '#nutrition .forge-quick-note{font-size:12px;color:#a9beb0;margin:0 0 8px}',
 '#nutrition .forge-quick-meal{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #2f493e;font-size:13px}',
 '#nutrition .forge-quick-meal span{min-width:0;overflow-wrap:anywhere}',
 '#nutrition .forge-quick-meal button{flex:none;min-height:44px;font-size:12px}',
 '#nutrition .forge-quick-undo{min-height:44px;background:none;border:0;color:#b8eb9f;padding:6px 0;font-size:12px}'
 ].join('\n');document.head.append(style);
}
function boot(){
 let count=0;
 const init=()=>{
  const a=installCatalog(),b=installMeals();
  if(!a||!b){if(++count<60)setTimeout(init,150);return;}
  styles();
  installed=true;
  if(!observing&&typeof MutationObserver==='function'){
   const observer=new MutationObserver(schedule);
   observer.observe($('forgeCatalogResults'),{childList:true,subtree:true});
   observer.observe($('foodList'),{childList:true,subtree:true});
   observing=true;
  }
 };
 init();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();