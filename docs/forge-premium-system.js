const STYLES="\n:root{\n --forge-b-bg:#0d0d0d;--forge-b-bg-2:#141414;\n --forge-b-surface:#1a1a1a;--forge-b-surface-raised:#242424;\n --forge-b-accent:#9eff00;--forge-b-accent-soft:rgba(158,255,0,.13);\n --forge-b-text:#fff;--forge-b-muted:#b5b5b5;--forge-b-inactive:#777;\n --forge-b-stroke:rgba(255,255,255,.10);\n --forge-b-shadow:0 12px 30px rgba(0,0,0,.32);\n --forge-b-radius:20px;--forge-b-radius-small:13px;\n --forge-b-touch:44px;--forge-b-gap:12px;\n}\nbody.forge-premium-app{\n color:var(--forge-b-text)!important;\n background:radial-gradient(circle at 12% 12%,rgba(158,255,0,.045),transparent 29%),\n radial-gradient(circle at 85% 72%,rgba(255,255,255,.025),transparent 30%),\n linear-gradient(180deg,#0d0d0d,#141414 52%,#0d0d0d)!important;\n}\nbody.forge-premium-app :is(#plan,#nutrition,#progress){\n color:var(--forge-b-text);min-width:0;\n}\nbody.forge-premium-app :is(#plan,#nutrition,#progress) > .tag,\nbody.forge-premium-app :is(#plan,#nutrition,#progress) > .forge-intro{display:none!important}\nbody.forge-premium-app :is(#plan,#nutrition,#progress) .forge-b-pagehead{\n position:relative;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;\n align-items:center;min-height:47px;padding:1px 0;margin:3px 0 13px;\n}\nbody.forge-premium-app .forge-b-pagehead-logo{\n grid-column:2;font-style:italic;font-weight:950;font-size:23px;letter-spacing:.13em;\n text-align:center;color:var(--forge-b-accent);line-height:1.2;\n text-shadow:0 0 14px rgba(158,255,0,.20);\n}\nbody.forge-premium-app .forge-b-pagehead-action{\n grid-column:3;min-width:44px;min-height:44px;border-radius:50%;\n border:1px solid var(--forge-b-stroke);background:#202020;\n display:grid;place-items:center;color:#fff;font-size:24px;padding:0;\n}\nbody.forge-premium-app :is(#plan,#nutrition,#progress) > h1{\n font-size:clamp(23px,6.3vw,30px)!important;letter-spacing:-.035em!important;\n line-height:1.18!important;font-weight:850!important;color:var(--forge-b-text)!important;\n margin:5px 0 4px!important;\n}\nbody.forge-premium-app .forge-b-page-subtitle{\n font-size:12px;line-height:1.5;color:var(--forge-b-muted);margin:0 0 17px;\n}\nbody.forge-premium-app :is(#plan,#nutrition,#progress) :is(button,input,select,textarea,summary):focus-visible,\nbody.forge-premium-app #nav button:focus-visible{\n outline:2px solid var(--forge-b-accent)!important;outline-offset:2px!important;\n}\nbody.forge-premium-app :is(#plan,#nutrition,#progress) button{touch-action:manipulation}\nbody.forge-premium-app :is(#plan,#nutrition,#progress) .btn:not(.small){\n border-radius:var(--forge-b-radius-small);font-weight:750;\n}\nbody.forge-premium-app :is(#plan,#nutrition,#progress) input,\nbody.forge-premium-app :is(#plan,#nutrition,#progress) select,\nbody.forge-premium-app :is(#plan,#nutrition,#progress) textarea{\n accent-color:var(--forge-b-accent);\n}\nbody.forge-premium-app #nav.forge-simple-nav{\n background:linear-gradient(180deg,rgba(21,21,21,.96),rgba(11,11,11,.99))!important;\n border-top:1px solid var(--forge-b-stroke)!important;\n box-shadow:0 -10px 30px rgba(0,0,0,.35)!important;\n grid-template-columns:repeat(4,minmax(0,1fr))!important;\n}\nbody.forge-premium-app #nav.forge-simple-nav button{\n position:relative;min-height:56px!important;color:var(--forge-b-inactive)!important;\n border-radius:12px!important;background:transparent!important;\n font-size:11px!important;gap:4px!important;\n}\nbody.forge-premium-app #nav.forge-simple-nav button .ico{\n height:22px!important;font-size:22px!important;display:grid!important;place-items:center;\n}\nbody.forge-premium-app #nav.forge-simple-nav button .ico svg{\n display:block;width:21px;height:21px;stroke:currentColor;fill:none;\n stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round;\n}\nbody.forge-premium-app #nav.forge-simple-nav button.active{\n color:var(--forge-b-accent)!important;background:rgba(158,255,0,.055)!important;\n}\nbody.forge-premium-app #nav.forge-simple-nav button.active:before{\n position:absolute;content:\"\";height:3px;top:0;left:25%;width:50%;\n background:var(--forge-b-accent);border-radius:9px;\n box-shadow:0 0 10px rgba(158,255,0,.45);\n}\nbody.forge-premium-app #plan.forge-slim-phase1 .forge-simple-hero{\n border:1px solid var(--forge-b-stroke)!important;border-radius:22px!important;\n background:linear-gradient(140deg,#252525,#161616)!important;\n box-shadow:var(--forge-b-shadow)!important;padding:17px!important;gap:10px;\n}\nbody.forge-premium-app #plan .forge-simple-hero-kicker{\n font-size:11px!important;color:var(--forge-b-accent)!important;letter-spacing:.09em;\n}\nbody.forge-premium-app #plan .forge-simple-hero-title{\n color:white!important;font-size:clamp(19px,5vw,23px)!important;line-height:1.18;\n}\nbody.forge-premium-app #plan .forge-simple-hero-meta{color:var(--forge-b-muted)!important}\nbody.forge-premium-app #plan .forge-simple-hero button{\n color:#101010!important;background:var(--forge-b-accent)!important;\n border:0!important;border-radius:13px!important;min-height:49px!important;\n box-shadow:0 9px 20px rgba(158,255,0,.15)!important;\n}\nbody.forge-premium-app #plan.forge-slim-phase1 #forgeSlimWeek{\n border:0!important;background:transparent!important;margin-top:16px!important;\n}\nbody.forge-premium-app #plan #forgeSlimWeek>h2,\nbody.forge-premium-app #nutrition #forgeSlimNutriMeals h2,\nbody.forge-premium-app #progress #forgeSlimProgressIntro h2{\n font-size:19px!important;color:white!important;letter-spacing:-.025em;\n}\nbody.forge-premium-app #plan.forge-slim-phase1 #forgeSlimWeek .forge-polish-day{\n background:linear-gradient(145deg,#212121,#171717)!important;\n border:1px solid var(--forge-b-stroke)!important;\n border-radius:14px!important;padding:10px!important;\n margin:0 0 8px!important;box-shadow:0 4px 14px rgba(0,0,0,.15)!important;\n}\nbody.forge-premium-app #plan #forgeSlimWeek .forge-polish-day-date{\n border-right:1px solid var(--forge-b-stroke)!important;color:var(--forge-b-muted)!important;\n}\nbody.forge-premium-app #plan #forgeSlimWeek .forge-polish-session-labels strong{color:#fff!important}\nbody.forge-premium-app #plan #forgeSlimWeek .forge-polish-day-actions button{\n background:#292929!important;border:1px solid var(--forge-b-stroke)!important;\n color:#eee!important;border-radius:10px!important;\n}\nbody.forge-premium-app #plan #forgeSlimWeek .forge-polish-week-footer button{\n color:var(--forge-b-accent)!important;\n}\nbody.forge-premium-app #plan.forge-slim-phase1 .forge-slim-tools{\n border:1px solid var(--forge-b-stroke)!important;border-radius:16px!important;\n background:linear-gradient(145deg,#222,#171717)!important;\n padding:2px 12px!important;margin-top:18px!important;\n}\nbody.forge-premium-app #plan .forge-slim-tools>summary{color:#fff!important}\nbody.forge-premium-app #plan .forge-slim-tools .forge-slim-tool-buttons>button{\n color:var(--forge-b-muted)!important;border-color:var(--forge-b-stroke)!important;\n}\nbody.forge-premium-app #plan .forge-slim-tools>summary:after,\nbody.forge-premium-app #plan .forge-slim-tool-buttons>button:after{color:var(--forge-b-accent)!important}\nbody.forge-premium-app #plan #forgeActivePlanEditor,\nbody.forge-premium-app #plan #forgeCatalog,\nbody.forge-premium-app #plan #forge150PlanHub{\n --accent:var(--forge-b-accent);\n}\nbody.forge-premium-app #nutrition.forge-slim-phase3 #forgeSlimNutriToday{margin:0 0 12px!important}\nbody.forge-premium-app #nutrition #forgeSlimNutriToday h2{color:white!important}\nbody.forge-premium-app #nutrition #forgeSlimNutriToday p{color:var(--forge-b-muted)!important}\nbody.forge-premium-app #nutrition.forge-slim-phase3 #nutriTotals{\n border:1px solid var(--forge-b-stroke)!important;border-radius:20px!important;\n padding:13px!important;background:linear-gradient(140deg,#252525,#171717)!important;\n box-shadow:var(--forge-b-shadow)!important;gap:8px 12px!important;\n}\nbody.forge-premium-app #nutrition.forge-slim-phase3 #nutriTotals>div{\n background:#151515!important;border:1px solid rgba(255,255,255,.07)!important;\n border-radius:13px!important;padding:12px!important;\n}\nbody.forge-premium-app #nutrition #nutriTotals .row span:first-child{color:white!important}\nbody.forge-premium-app #nutrition #nutriTotals .bar{\n background:#3e3e3e!important;border-radius:20px!important;\n}\nbody.forge-premium-app #nutrition.forge-slim-phase3 #forgeSlimNutriActions{\n grid-template-columns:repeat(2,minmax(0,1fr));gap:10px!important;margin:14px 0!important;\n}\nbody.forge-premium-app #nutrition.forge-slim-phase3 #forgeSlimNutriActions button{\n min-height:51px!important;border-radius:13px!important;\n background:#202020!important;border:1px solid var(--forge-b-stroke)!important;\n color:#fff!important;\n}\nbody.forge-premium-app #nutrition.forge-slim-phase3 #forgeSlimNutriActions button:first-child{\n background:var(--forge-b-accent)!important;color:#111!important;\n border-color:transparent!important;\n}\nbody.forge-premium-app #nutrition.forge-slim-phase3 #foodList>.exercise{\n border:1px solid var(--forge-b-stroke)!important;\n border-radius:15px!important;padding:13px!important;\n margin:0 0 10px!important;background:#1c1c1c!important;\n}\nbody.forge-premium-app #nutrition.forge-slim-phase3 #forgeNutritionSearchPanel{\n border-top:1px solid var(--forge-b-stroke)!important;\n}\nbody.forge-premium-app #nutrition.forge-slim-phase3 .forge-nutrition-master>details:not([data-food-section=\"today\"])>summary{\n color:#f0f0f0!important;min-height:48px!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 .forge-progress-tabs{\n background:#191919!important;border:1px solid var(--forge-b-stroke)!important;\n border-radius:15px!important;gap:5px!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 .forge-progress-tabs button{\n color:var(--forge-b-muted)!important;background:transparent!important;\n border-radius:11px!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 .forge-progress-tabs button.active{\n background:var(--forge-b-accent)!important;color:#111!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 #forgeProgressSummary>.forge-stats-tile{\n padding:14px!important;border-radius:17px!important;\n border:1px solid var(--forge-b-stroke)!important;\n background:linear-gradient(150deg,#242424,#171717)!important;\n box-shadow:0 7px 19px rgba(0,0,0,.19)!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 #forgeProgressSummary>.forge-stats-tile strong{\n color:white!important;font-size:clamp(20px,5.2vw,25px)!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 #forgeProgressSummary>.forge-stats-tile small{\n color:var(--forge-b-muted)!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 #forgeActivityChart{\n border:1px solid var(--forge-b-stroke)!important;border-radius:20px!important;\n background:linear-gradient(150deg,#222,#151515)!important;\n box-shadow:var(--forge-b-shadow)!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge{\n background:#202020!important;border:1px solid var(--forge-b-stroke)!important;\n border-radius:17px!important;box-shadow:0 8px 20px rgba(0,0,0,.15)!important;\n}\nbody.forge-premium-app #progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:first-child{\n background:linear-gradient(140deg,#292929,#191919)!important;\n border-color:rgba(158,255,0,.32)!important;\n}\nbody.forge-premium-app #progress :is(.forge-slim-progress-more,.forge-stats-fold,.forge-stats-wellness)>summary{\n color:var(--forge-b-text)!important;\n}\n@media(max-width:360px){\n body.forge-premium-app .forge-b-pagehead-logo{font-size:20px}\n body.forge-premium-app #nav.forge-simple-nav button{font-size:10px!important}\n body.forge-premium-app #nutrition.forge-slim-phase3 #nutriTotals{padding:9px!important}\n}\n@media(prefers-reduced-motion:reduce){\n body.forge-premium-app *{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}\n}\n";
/* FORGE Premium Design System · Phase 1.
 * Presentation only: no user-state writes, no storage migrations and no
 * repeated DOM reconciliation while the workout timer is running.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const CONFIG=Object.freeze({
 plan:Object.freeze({title:'Plan',subtitle:'Dein Trainingsplan und deine Trainingswoche',target:'forgeSlimTools'}),
 nutrition:Object.freeze({title:'Essen',subtitle:'Ernährung erfassen und Tagesziele im Blick',target:'nutrition-targets'}),
 progress:Object.freeze({title:'Fortschritt',subtitle:'Deine Entwicklung und Trainingsbilanz',target:'forgeSlimProgressMore'})
});
let installed=false;
function make(tag,cls,text){
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
}
function resolveMenu(pageKey){
 if(pageKey==='nutrition')
  return document.querySelector('#forge-nutrition-master details[data-food-section="targets"]');
 return $(CONFIG[pageKey]?.target);
}
function openMenu(pageKey){
 const target=resolveMenu(pageKey);
 if(!target)return false;
 target.open=true;
 if(typeof target.scrollIntoView==='function')
  target.scrollIntoView({block:'start',behavior:'smooth'});
 return true;
}
function ensureHeader(pageKey){
 const page=$(pageKey);
 if(!page)return false;
 if(page.querySelector(':scope > .forge-b-pagehead'))return true;
 const config=CONFIG[pageKey],header=make('header','forge-b-pagehead');
 header.setAttribute('aria-label',config.title+' – Kopfzeile');
 const logo=make('span','forge-b-pagehead-logo','FORGE');
 header.append(logo);
 const menu=make('button','forge-b-pagehead-action','⋯');
 menu.type='button';menu.setAttribute('aria-label',config.title+' – weitere Einstellungen');
 menu.addEventListener('click',()=>{if(!openMenu(pageKey))menu.blur();});
 header.append(menu);
 page.prepend(header);
 const title=page.querySelector(':scope > h1');
 if(title){
  const subtitle=make('p','forge-b-page-subtitle',config.subtitle);
  title.after(subtitle);
 }
 return true;
}
function injectStyles(){
 if($('forgePremiumSystemStyle'))return;
 const sheet=make('style');sheet.id='forgePremiumSystemStyle';
 sheet.textContent=STYLES;document.head.append(sheet);
}
function install(){
 if(installed)return true;
 if(!$('plan')||!$('nutrition')||!$('progress')||!$('nav'))return false;
 injectStyles();
 for(const pageKey of Object.keys(CONFIG))ensureHeader(pageKey);
 document.body.classList.add('forge-premium-app');
 installed=true;
 return true;
}
function boot(){
 let attempts=0;
 const start=()=>{if(install())return;if(++attempts<60)setTimeout(start,100);};
 start();
}
window.ForgePremiumSystem=Object.freeze({
 CONFIG,openMenu,ensureHeader,isInstalled:()=>installed
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
