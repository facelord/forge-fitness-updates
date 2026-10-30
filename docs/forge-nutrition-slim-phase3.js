/* FORGE UX implementation step 3 of 4: one flat nutrition screen.
 * Keep original nutrient calculations, food list, search, scanner and
 * existing IDs/event handlers. This module only reorganizes their DOM.
 * No food data migration, storage writes or modified meal calculations.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const node=(tag,cls,text)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(text!==undefined)element.textContent=text;
 return element;
};
let installed=false,wrappedEdit=false;
function findPart(key,root=$('forge-nutrition-master')){
 return root?.querySelector('details[data-food-section="'+key+'"]')||null;
}
function openPart(key,root=$('forge-nutrition-master')){
 const section=findPart(key,root);
 if(!section)return false;
 section.open=true;
 section.scrollIntoView?.({behavior:'smooth',block:'nearest'});
 return true;
}
window.ForgeNutritionSlim=Object.freeze({findPart,openPart,isInstalled:()=>installed});
function button(label,kind,handler){
 const b=node('button',kind?'btn alt':'btn',label);
 b.type='button';b.addEventListener('click',handler);return b;
}
function meal(){
 if(!openPart('compose'))return;
 $('mealName')?.focus?.({preventScroll:true});
}
function repeat(){
 openPart('repeat');
}
function scan(){
 const compose=findPart('compose'),photo=findPart('scan',compose);
 if(compose)compose.open=true;
 if(photo)photo.open=true;
 // Reuse scanner.js's one native camera/file-picker action. This call is
 // synchronous within the user's click; don't fake a native camera intent.
 const existing=$('forge-nutrition-master')?.querySelector('.forge-nutrition-scan');
 if(existing)existing.click();
 else $('labelPhoto')?.click();
}
function onEditMeal(){
 if(wrappedEdit||typeof window.editMeal!=='function')return;
 const original=window.editMeal;
 window.editMeal=function(){
  // Previously the editor was always expanded. With its default fold closed,
  // "Bearbeiten" must reveal the same form before the core scrolls to it.
  openPart('compose');
  return original.apply(this,arguments);
 };
 wrappedEdit=true;
}
function style(){
 if($('forgeNutritionSlimPhase3Style'))return;
 const css=node('style');css.id='forgeNutritionSlimPhase3Style';
 css.textContent=[
  '#nutrition.forge-slim-phase3>.tag,#nutrition.forge-slim-phase3>.forge-intro{display:none!important}',
  '#nutrition.forge-slim-phase3>h1{font-size:23px;margin:5px 0 14px}',
  '#nutrition.forge-slim-phase3 #forge-nutrition-master{display:flex!important;flex-direction:column;margin:0!important;padding:0!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;gap:0}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master-head{display:none!important}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master>details[data-food-section="today"]{order:1;border:0!important;padding:0!important}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master>details[data-food-section="today"]>summary{display:none!important}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriToday{order:0;margin:8px 0 6px}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriToday h2{font-size:19px;margin:0 0 4px;color:#eff8ef}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriToday p{margin:0;font-size:12px;color:#aebfb5}',
  '#nutrition.forge-slim-phase3 #nutriTotals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}',
  '#nutrition.forge-slim-phase3 #nutriTotals>div{margin:0!important;padding:11px 0 12px;min-width:0;border-bottom:1px solid #354d44}',
  '#nutrition.forge-slim-phase3 #nutriTotals .row{display:flex;gap:4px;flex-wrap:wrap;align-items:baseline}',
  '#nutrition.forge-slim-phase3 #nutriTotals .row span:first-child{font-weight:750;color:#e8f4e9;font-size:13px}',
  '#nutrition.forge-slim-phase3 #nutriTotals .row .muted{font-size:11px;color:#adbfaf}',
  '#nutrition.forge-slim-phase3 #nutriTotals .bar{margin-top:6px!important;height:6px}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriDetail{margin:5px 0 4px;border:0!important;border-bottom:1px solid #354d44!important;padding:0!important;background:transparent!important}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriDetail>summary{cursor:pointer;color:#c5dac9;padding:12px 2px;min-height:42px;font-size:12px;list-style:none}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriDetail>summary:after{content:"⌄";float:right;color:#a8f55d;font-size:18px}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriDetail[open]>summary:after{content:"⌃"}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriActions{order:2;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 12px}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriActions button{min-height:50px;padding:10px 8px;font-size:13px;line-height:1.35}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriActions button:first-child{grid-column:1/-1;background:#a8f55d!important;color:#12251b!important;font-weight:800}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriMeals{order:3;margin:8px 0 13px;padding:0;border:0}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriMeals h2{font-size:17px;color:#eff8ed;margin:6px 0 9px}',
  '#nutrition.forge-slim-phase3 #foodList{margin:0!important}',
  '#nutrition.forge-slim-phase3 #foodList>.exercise{display:flex!important;background:transparent!important;padding:14px 0!important;margin:0!important;border:0!important;border-bottom:1px solid #344d44!important;border-radius:0!important;gap:9px}',
  '#nutrition.forge-slim-phase3 #foodList>.exercise .btn{min-height:39px;font-size:11px}',
  '#nutrition.forge-slim-phase3 #forgeNutritionSearchPanel{order:4;margin:6px 0 12px!important;padding:16px 0!important;border:0!important;border-top:1px solid #354d44!important;background:transparent!important}',
  '#nutrition.forge-slim-phase3 #forgeNutritionSearchPanel h3{font-size:17px;margin:0 0 10px}',
  '#nutrition.forge-slim-phase3 .forge-nutri-actions{display:grid;grid-template-columns:1fr 1fr}',
  '#nutrition.forge-slim-phase3 .forge-nutri-actions>button:nth-child(2){display:none!important}',
  '#nutrition.forge-slim-phase3 #forgeSlimBarcodeManual{border:0;border-top:1px solid #354d44;margin:9px 0;padding:0}',
  '#nutrition.forge-slim-phase3 #forgeSlimBarcodeManual>summary{cursor:pointer;min-height:42px;padding:12px 1px;color:#c1d2c7;font-size:12px}',
  '#nutrition.forge-slim-phase3 #forgeSlimBarcodeManual .forge-nutri-barcode-line{margin:7px 0 14px}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master>details[data-food-section="compose"]{order:5}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master>details[data-food-section="repeat"]{order:6}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master>details[data-food-section="targets"]{order:7}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master>details[data-food-section="backup"]{order:8}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master>details:not([data-food-section="today"]){border:0!important;border-top:1px solid #354d44!important;border-radius:0!important;background:transparent!important;padding:0!important;margin:0!important}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master>details:not([data-food-section="today"])>summary{min-height:50px!important;padding:13px 2px!important;font-size:14px!important;cursor:pointer}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master .forge-fold-body{background:transparent!important;padding:7px 0 14px!important}',
  '#nutrition.forge-slim-phase3 .forge-nutrition-master .forge-fold-body>.card,#nutrition.forge-slim-phase3 .forge-nutrition-master .forge-food-section-body>.card{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;border-radius:0!important}',
  '#nutrition.forge-slim-phase3 #forgeSlimNutriActions button:focus-visible,#nutrition.forge-slim-phase3 #forgeNutritionSearchPanel button:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
  '@media(max-width:360px){#nutrition.forge-slim-phase3 #nutriTotals{gap:0 8px}#nutrition.forge-slim-phase3 #forgeSlimNutriActions button{font-size:12px}}'
 ].join('\n');
 document.head.append(css);
}
function install(){
 const page=$('nutrition'),master=$('forge-nutrition-master'),search=$('forgeNutritionSearchPanel');
 const today=findPart('today',master),compose=findPart('compose',master);
 const meals=$('foodList'),totals=$('nutriTotals'),detailed=$('dailyDetailed');
 if(!page||!master||!search||!today||!compose||!meals||!totals||!detailed)return false;
 if(installed)return true;
 style();
 page.classList.add('forge-slim-phase3');
 const dayTitle=node('div');dayTitle.id='forgeSlimNutriToday';
 dayTitle.append(node('h2','','Heute auf einen Blick'),node('p','','Kalorien und Makros aus deinen gespeicherten Mahlzeiten.'));
 master.prepend(dayTitle);
 today.open=true;
 // Original calculation and DOM IDs stay in place. Fold only detailed nutrients.
 if(!$('forgeSlimNutriDetail')){
  const details=node('details');details.id='forgeSlimNutriDetail';
  details.append(node('summary','','Alle Nährwerte ansehen'));
  detailed.before(details);details.append(detailed);
 }
 const actions=node('div');actions.id='forgeSlimNutriActions';
 actions.setAttribute('role','group');actions.setAttribute('aria-label','Ernährung schnell erfassen');
 actions.append(button('＋ Mahlzeit erfassen','',meal),
                button('📷 Scannen','alt',scan),
                button('↻ Wiederholen','alt',repeat));
 today.after(actions);
 const history=node('section');history.id='forgeSlimNutriMeals';
 history.setAttribute('aria-label','Heute erfasste Mahlzeiten');
 history.append(node('h2','','Deine Mahlzeiten'));
 history.append(meals); // preserve live core renderer and existing edit/delete actions
 actions.after(history);
 history.after(search);
 // Barcode input remains fully functional but doesn't fill the default screen.
 const barcode=search.querySelector('.forge-nutri-barcode-line');
 if(barcode&&!$('#forgeSlimBarcodeManual')){
  const manual=node('details');manual.id='forgeSlimBarcodeManual';
  manual.append(node('summary','','Barcode manuell eingeben'),barcode);
  search.append(manual);
 }
 // Show the editor only on demand. Do not reset any input or delete any data.
 for(const key of ['compose','repeat','targets','backup']){
  const part=findPart(key,master);
  if(part)part.open=false;
 }
 const repeatPart=findPart('repeat',master);
 if(repeatPart){const s=repeatPart.querySelector(':scope > summary');if(s)s.textContent='↻ Gespeicherte Mahlzeit wiederholen';}
 const composeSummary=compose.querySelector(':scope > summary');
 if(composeSummary)composeSummary.textContent='Mahlzeit zusammenstellen';
 const targets=findPart('targets',master);
 if(targets){const s=targets.querySelector(':scope > summary');if(s)s.textContent='Tagesziele einstellen';}
 const backup=findPart('backup',master);
 if(backup){const s=backup.querySelector(':scope > summary');if(s)s.textContent='Datensicherung und Datenverwaltung';}
 onEditMeal();
 installed=true;return true;
}
function boot(){
 let attempt=0;
 const go=()=>{if(install())return;if(++attempt<80)setTimeout(go,100);};
 go();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
