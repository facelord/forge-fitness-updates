/* FORGE Layout B · App-Rahmen (Entwürfe „Nächste Schritte“ N1–N4).
 * - N1: alte Kopfzeile (FORGE · Lokal gespeichert · Updates · ⚙) entfällt,
 *       jede Seite: Titel + ⋯ (Punkt, wenn ein Update bereitliegt)
 * - N2: ⋯ öffnet ein Blatt: Sicherung, Update, Einstellungen, Backup, Version
 * - N3: Einstellungen im B-Stil (bestehendes Formular, neu gestaltet)
 * - N4: Workout vor dem Start: Titel + ⋯, Kraft / Mobilität / Cardio als Umschalter
 * - Wochenziel kommt aus dem Plan (Trainingstage pro Woche); die doppelten
 *   Ziel-Auswahlen in Erfolge/Challenges werden ausgeblendet.
 * - Tauschen-Blatt im B-Stil.
 * Actions delegate to the existing controls (update trigger, settings, exportData,
 * backup part, page menus). The only write is keeping the weekly goal in line
 * with the plan, via the app's own setters.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ACC='#a9f267',TEAL='#5ee0c8';

/* ---------- pure helpers (tested) ---------- */
/* Training days per week defined by the plan. map: weekday->plan (fixed days),
 * cadence: {every:n} for "alle n Tage". Returns 0 when the plan defines none. */
function planDaysPerWeek(map,cadence){
 if(cadence&&Number(cadence.every)>0)return Math.max(1,Math.min(7,Math.round(7/Number(cadence.every))));
 const n=map&&typeof map.size==='number'?map.size:0;
 return Math.max(0,Math.min(7,n));
}
window.ForgeLayoutBShell=Object.freeze({planDaysPerWeek});
if(typeof document==='undefined')return;

function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const ICON={
 heart:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M5.5 12h3l1.5-2.5 2 5 1.5-2.5h5"/></svg>',
 bell:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
 dots:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 shield:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
 down:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
 gear:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
 file:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
 page:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16z"/></svg>',
 info:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>',
 chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#95a3b7" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
};
const B='body.forge-layout-b';
const CSS=`
${B}>header{display:none!important}
${B}>main{padding-top:calc(8px + env(safe-area-inset-top))!important}
${B} .page>.forge-b-pagehead{position:absolute!important;top:calc(14px + env(safe-area-inset-top));right:14px;left:auto!important;width:auto!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;z-index:30}
${B} .page{position:relative}
${B} .page>.forge-b-pagehead>.forge-b-pagehead-logo{display:none!important}
${B} .forge-b-pagehead-action,${B} .forge-lb-wohead button{width:44px!important;height:44px!important;min-height:0!important;border-radius:22px!important;border:1px solid #293346!important;background:#171e2a!important;color:#f3f7fc!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;font-size:0!important;position:relative}
${B} .forge-b-pagehead-action svg{display:block}
${B} .forge-lb-dot{position:absolute;top:8px;right:8px;width:9px;height:9px;border-radius:5px;background:${ACC};border:2px solid #171e2a;display:none}
${B}.forge-lb-update .forge-lb-dot{display:block}
/* Menü-Blatt */
.forge-lb-sheet-wrap{position:fixed;inset:0;z-index:2147482000;background:rgba(5,8,13,.72);display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif}
.forge-lb-sheet{background:#111723;color:#f3f7fc;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:10px 16px calc(22px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-height:88vh;overflow-y:auto;box-sizing:border-box;max-width:560px;width:100%;margin:0 auto;animation:forgeLbUp .22s ease-out}
@keyframes forgeLbUp{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.forge-lb-sheet{animation:none}}
.forge-lb-handle{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center}
.forge-lb-sheet-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
.forge-lb-sheet-head strong{font-size:22px;font-weight:800}
.forge-lb-sheet-head small{display:block;font-size:13px;color:#95a3b7;font-weight:500}
.forge-lb-x{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
.forge-lb-mcard{display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:14px;color:#f3f7fc;text-align:left;width:100%;box-sizing:border-box;font:inherit}
.forge-lb-mcard.hi{background:#1a2a22;border-color:#405d39}
.forge-lb-mcard.warn{background:#211c12;border-color:#6b5426}
.forge-lb-mcard.warn i{background:#3a2e14;color:#ffb547}
.forge-lb-mcard i{width:40px;height:40px;flex:0 0 40px;border-radius:12px;background:#1a2a22;color:${ACC};display:flex;align-items:center;justify-content:center}
.forge-lb-mcard.hi i{background:${ACC};color:#142016}
.forge-lb-mcard span{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.forge-lb-mcard b{font-size:15px;font-weight:700}
.forge-lb-mcard small{font-size:12px;color:#95a3b7}
.forge-lb-mcard.hi small{color:#c3cddb}
.forge-lb-mlist{background:#171e2a;border:1px solid #293346;border-radius:18px;padding:4px 14px}
.forge-lb-mlist button{width:100%;min-height:52px;border:0;border-bottom:1px solid #293346;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;display:flex;align-items:center;gap:12px;padding:0;text-align:left}
.forge-lb-mlist button:last-child{border-bottom:0}
.forge-lb-mlist button>span{flex:1}
.forge-lb-mlist em{font-style:normal;font-size:13px;color:#95a3b7}
.forge-lb-mnote{font-size:12px;color:#95a3b7;text-align:center}
.forge-lb-sheet button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
/* Einstellungen (bestehendes Blatt, B-Stil) */
${B} .forge-settings-overlay{background:rgba(5,8,13,.72)!important;align-items:flex-end!important}
${B} .forge-settings-sheet{background:#0b1018!important;border:0!important;border-top:1px solid #3a4556!important;border-radius:28px 28px 0 0!important;padding:16px 16px calc(24px + env(safe-area-inset-bottom))!important;font-family:Inter,system-ui,sans-serif!important;color:#f3f7fc!important;box-shadow:none!important;max-width:560px!important}
${B} .forge-settings-sheet h2{font-size:28px!important;font-weight:800!important;letter-spacing:-.01em}
${B} .forge-settings-sheet>p,${B} .forge-settings-hint{color:#95a3b7!important;font-size:13px!important}
${B} .forge-settings-section{background:#171e2a!important;border:1px solid #293346!important;border-radius:20px!important;padding:6px 16px 10px!important;margin:12px 0 0!important;box-shadow:none!important}
${B} .forge-settings-section h3{font-size:12px!important;color:#95a3b7!important;text-transform:uppercase;letter-spacing:1.3px;font-weight:700!important;margin:10px 0 2px!important}
${B} .forge-settings-row{min-height:54px!important;border-bottom:1px solid #293346!important;padding:6px 0!important;font-size:15px!important;font-weight:600!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;background:none!important;border-radius:0!important}
${B} .forge-settings-row:last-child{border-bottom:0!important}
${B} .forge-settings-sheet input[type=checkbox]{appearance:none!important;-webkit-appearance:none!important;width:50px!important;height:30px!important;flex:0 0 50px!important;border-radius:15px!important;background:#293346!important;position:relative!important;margin:0!important;border:0!important;cursor:pointer;transition:background .15s}
${B} .forge-settings-sheet input[type=checkbox]::after{content:"";position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:12px;background:#95a3b7;transition:transform .15s,background .15s}
${B} .forge-settings-sheet input[type=checkbox]:checked{background:${ACC}!important}
${B} .forge-settings-sheet input[type=checkbox]:checked::after{transform:translateX(20px);background:#142016}
${B} .forge-settings-sheet input[type=checkbox]:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
${B} .forge-settings-sheet select{height:44px!important;border-radius:14px!important;border:1px solid #293346!important;background:#141b26!important;color:#f3f7fc!important;font:inherit!important;font-size:14px!important;padding:0 12px!important}
${B} .forge-settings-action{height:52px!important;border-radius:26px!important;font-weight:700!important;font-size:15px!important}
${B} .forge-settings-action:not(.alt){background:${ACC}!important;color:#142016!important;border:0!important}
${B} .forge-settings-action.alt{background:#171e2a!important;color:#f3f7fc!important;border:1px solid #3a4556!important}
/* Wochenziel kommt aus dem Plan */
${B} #progress details.forge-lb-goal-dup{display:none!important}
${B} #progress details:has(> .disclosure-body > .card #forgeWeeklyGoal),${B} #progress details:has(> .forge144-targets){display:none!important}
/* Marke + Slogan über jeder Hauptseite */
@font-face{font-family:'FORGE Exo 2';src:url('./fonts/Exo2-ExtraBold-FORGE.woff') format('woff');font-weight:800;font-style:normal;font-display:block}
${B} :is(#plan,#workout,#nutrition,#progress){position:relative}
${B} .page>.forge-lb-brand{display:flex;flex-direction:column;justify-content:center;gap:2px;min-height:44px;margin:6px 0 6px;padding:0 58px 0 6px;font-family:Inter,system-ui,sans-serif;pointer-events:none}
${B} .page>.forge-lb-brand b{font-family:'FORGE Exo 2',Inter,system-ui,sans-serif;font-size:clamp(18px,5.2vw,20px);font-weight:800;letter-spacing:.08em;color:${ACC};line-height:1.05}
${B} .page>.forge-lb-brand span{font-size:clamp(13px,3.6vw,14px);color:#a3b0c2;letter-spacing:.01em;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${B} .page>.forge-lb-brand.forge-lb-reveal>*{animation:forgeLbReveal .45s cubic-bezier(.2,.7,.2,1) both}
${B} .page>.forge-lb-brand.forge-lb-reveal>span{animation-delay:.06s}
@keyframes forgeLbReveal{from{clip-path:inset(0 100% 0 0);opacity:.2}to{clip-path:inset(0 0 0 0);opacity:1}}
@media(prefers-reduced-motion:reduce){${B} .page>.forge-lb-brand.forge-lb-reveal>*{animation:none}}
/* ⋯ sitzt oben rechts auf Höhe der Marke – nie über Karten oder Werten */
${B} :is(#plan,#nutrition,#progress).page.page>.forge-b-pagehead{position:absolute!important;top:var(--forge-lb-head-top,6px)!important;right:4px!important;left:auto!important;width:44px!important;height:44px!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;z-index:9!important}
${B} :is(#plan,#nutrition,#progress).page.page>.forge-b-pagehead .forge-b-pagehead-action{position:absolute!important;top:0!important;right:0!important}
${B} :is(#plan,#nutrition,#progress).page.page>.forge-b-pagehead .forge-b-pagehead-logo{display:none!important}
${B} :is(#plan,#nutrition,#progress).forge-unified>h1{padding-right:0!important}
${B} #workout>.forge-lb-wohead .forge-lb-menu-btn{position:absolute;top:var(--forge-lb-head-top,6px);right:4px;z-index:9}
${B} #workout.forge-lb-live>.forge-lb-brand,${B} #workout.forge-compact-live>.forge-lb-brand,${B}.forge-compact-typing .page>.forge-lb-brand{display:none}
/* Workout vor dem Start */
${B} #workout>.forge-lb-wohead{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 2px 4px 6px}
${B} #workout>.forge-lb-wohead h2{margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em;color:#f3f7fc}
${B} #workout.forge-lb-live>.forge-lb-wohead,${B} #workout.forge-compact-live>.forge-lb-wohead{display:none}
${B} #forge150WorkoutModes{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;height:52px!important;padding:5px!important;border-radius:26px!important;background:#171e2a!important;border:1px solid #293346!important;box-sizing:border-box!important;margin:6px 0 14px!important}
${B} #forge150WorkoutModes button{height:100%!important;min-height:0!important;border:0!important;border-radius:21px!important;background:transparent!important;color:#95a3b7!important;font-size:14px!important;font-weight:600!important;box-shadow:none!important;padding:0 4px!important}
${B} #forge150WorkoutModes button.active,${B} #forge150WorkoutModes button[aria-pressed="true"],${B} #forge150WorkoutModes button[aria-selected="true"]{background:${ACC}!important;color:#142016!important;font-weight:800!important}
${B} #forge150WorkoutModes button[data-mode="mobility"].active,${B} #forge150WorkoutModes button[data-mode="mobility"][aria-pressed="true"],${B} #forge150WorkoutModes button[data-mode="mobility"][aria-selected="true"]{background:${TEAL}!important;color:#062420!important}
/* Tauschen-Blatt */
${B} .forge-swap-sheet{background:#111723!important;border-top:1px solid #3a4556!important;border-radius:28px 28px 0 0!important;font-family:Inter,system-ui,sans-serif!important}
${B} .forge-swap-brand{display:none!important}
${B} .forge-swap-head{justify-content:flex-end!important}
${B} .forge-swap-title{font-size:22px!important;font-weight:800!important;line-height:1.2!important}
${B} .forge-swap-item{background:#171e2a!important;border:1px solid #293346!important;border-radius:18px!important}
${B} .forge-swap-item[aria-selected="true"]{border:2px solid ${ACC}!important}
${B} .forge-swap-thumb{border-radius:12px!important;overflow:hidden}
`;

/* ---------- ⋯ menu ---------- */
let passThrough=false,sheet=null;
function closeSheet(){if(sheet){sheet.remove();sheet=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key==='Escape'){e.preventDefault();closeSheet();}}
function pageOf(btn){return btn.closest('.page')?.id||document.querySelector('.page.active')?.id||'plan';}
const PAGE_ROW={plan:'Wochenplan-Einstellungen',nutrition:'Tagesziele anpassen',progress:'Statistiken und Verlauf',workout:'Trainingsoptionen'};
function openPageTarget(pageId,btn){
 const page=$(pageId);if(!page)return;
 page.classList.remove('forge-lb-plan-home','forge-lb-home');
 window.scrollTo(0,0);
 if(btn&&btn.classList.contains('forge-b-pagehead-action')){passThrough=true;try{btn.click();}finally{passThrough=false;}}
}
function updateTrigger(){return document.querySelector('.forge-upd-trigger');}
function hasUpdate(){return !!updateTrigger()?.classList.contains('forge-upd-available');}
function versionText(){
 try{const n=window.ForgeAndroid;const name=n?.getAppVersionName?.();if(name)return String(name);const code=n?.getAppVersionCode?.();if(code)return 'Build '+code;}catch(e){}
 return '';
}
function openMenu(btn){
 closeSheet();
 const pageId=pageOf(btn);
 const wrap=el('div','forge-lb-sheet-wrap');
 const s=el('div','forge-lb-sheet');s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');s.setAttribute('aria-label','FORGE Menü');
 const head=el('div','forge-lb-sheet-head');const ht=el('div');ht.append(el('strong','','FORGE'));
 const x=el('button','forge-lb-x');x.type='button';x.innerHTML=ICON.x;x.setAttribute('aria-label','Menü schließen');x.addEventListener('click',closeSheet);
 head.append(ht,x);
 const bk=typeof window.forgeOpenBackup==='function';
 let sm={tone:'muted',title:'Lokal gespeichert',text:'Deine Daten bleiben auf diesem Gerät.'};
 try{if(bk&&window.ForgeLayoutBBackup&&window.ForgeAutoBackup?.status)sm=window.ForgeLayoutBBackup.summary(window.ForgeAutoBackup.status());}catch(e){}
 const status=el(bk?'button':'div','forge-lb-mcard'+(sm.tone==='warn'?' warn':''));if(bk){status.type='button';status.addEventListener('click',()=>{closeSheet();window.forgeOpenBackup();});}
 const si=el('i');si.innerHTML=ICON.shield;const st=el('span');
 st.append(el('b','',sm.title),el('small','',sm.text));status.append(si,st);
 const upd=el('button','forge-lb-mcard'+(hasUpdate()?' hi':''));upd.type='button';const ui=el('i');ui.innerHTML=ICON.down;const ut=el('span');
 ut.append(el('b','',hasUpdate()?'Update installieren':'Nach Updates suchen'),el('small','',hasUpdate()?'Eine neue FORGE-Version liegt bereit':'Prüft, ob eine neue Version bereitliegt'));
 upd.append(ui,ut);upd.addEventListener('click',()=>{closeSheet();updateTrigger()?.click();});
 const list=el('div','forge-lb-mlist');
 const row=(icon,label,fn,extra)=>{const b=el('button');b.type='button';b.innerHTML=icon;const t=el('span','',label);b.append(t);if(extra)b.append(el('em','',extra));else b.insertAdjacentHTML('beforeend',ICON.chev);b.addEventListener('click',()=>{closeSheet();fn();});list.append(b);};
 const food=typeof window.ForgeLayoutBFoodOpen==='function';
 if(pageId==='nutrition'&&food)row(ICON.page,'Tagesziele & eigene Lebensmittel',()=>window.ForgeLayoutBFoodOpen('goals'));
 else if(PAGE_ROW[pageId]&&btn&&btn.classList.contains('forge-b-pagehead-action'))row(ICON.page,PAGE_ROW[pageId],()=>openPageTarget(pageId,btn));
 if(typeof window.forgeOpenReminders==='function')row(ICON.bell,'Erinnerungen',()=>window.forgeOpenReminders());
 if(typeof window.forgeOpenHealth==='function'&&window.forgeHealthAvailable&&window.forgeHealthAvailable())row(ICON.heart,'Health Connect',()=>window.forgeOpenHealth());
 row(ICON.gear,'Einstellungen',()=>$('forgeSettingsToggle')?.click());
 if(bk)row(ICON.file,'Datensicherung',()=>window.forgeOpenBackup());
 else row(ICON.file,'Datensicherung',()=>{if(food){window.ForgeLayoutBFoodOpen('backup');return;}if(typeof window.go==='function')window.go('nutrition');const n=$('nutrition');n?.classList.remove('forge-lb-home');window.ForgeNutritionSlim?.openPart?.('backup');});
 const v=versionText();
 if(v){const b=el('button');b.type='button';b.innerHTML=ICON.info;b.append(el('span','','Version'),el('em','',v));b.disabled=true;list.append(b);}
 s.append(el('div','forge-lb-handle'),head,status,upd,list,el('div','forge-lb-mnote','FORGE speichert lokal. Vor einem Gerätewechsel ein Backup exportieren.'));
 wrap.append(s);
 wrap.addEventListener('click',e=>{if(e.target===wrap)closeSheet();});
 document.body.append(wrap);sheet=wrap;
 document.addEventListener('keydown',onKey,true);
 x.focus({preventScroll:true});
}
function interceptMenu(e){
 if(passThrough||!enabled())return;
 const btn=e.target.closest&&e.target.closest('.forge-b-pagehead-action,.forge-lb-menu-btn');
 if(!btn)return;
 e.preventDefault();e.stopImmediatePropagation();
 openMenu(btn);
}
function decorateMenuButtons(){
 document.querySelectorAll('.forge-b-pagehead-action').forEach(b=>{
  if(b.dataset.forgeLb)return;b.dataset.forgeLb='1';
  b.innerHTML=ICON.dots+'<span class="forge-lb-dot" aria-hidden="true"></span>';
  b.setAttribute('aria-label','Menü: Sicherung, Updates, Einstellungen');
 });
 document.body.classList.toggle('forge-lb-update',hasUpdate());
}

/* ---------- workout pre-start head ---------- */
const BRAND_PAGES=['plan','workout','nutrition','progress'];
const SLOGAN='Schmiede, was in dir steckt';
function brand(){
 for(const id of BRAND_PAGES){
  const page=$(id);if(!page)continue;
  let b=page.querySelector(':scope > .forge-lb-brand');
  if(!b){b=el('div','forge-lb-brand');b.setAttribute('aria-label','FORGE – '+SLOGAN);b.append(el('b','','FORGE'),el('span','',SLOGAN));}
  if(page.firstElementChild!==b)page.prepend(b);
  if(!b.offsetParent)continue;
  const top=(b.offsetTop+Math.max(0,(b.offsetHeight-44)/2))+'px';if(page.style.getPropertyValue('--forge-lb-head-top')!==top)page.style.setProperty('--forge-lb-head-top',top);
 }
}
/* Marke + Slogan beim Tabwechsel einmal von links enthüllen */
let lastPage='';
function reveal(){
 const page=document.querySelector('.page.active');const id=page?.id||'';
 if(id===lastPage)return;const first=!lastPage;lastPage=id;
 if(first||!BRAND_PAGES.includes(id))return;
 const b=page.querySelector(':scope > .forge-lb-brand');if(!b)return;
 b.classList.remove('forge-lb-reveal');void b.offsetWidth;b.classList.add('forge-lb-reveal');
}
function watchTabs(){
 const mo=new MutationObserver(reveal);
 BRAND_PAGES.forEach(id=>{const p=$(id);if(p)mo.observe(p,{attributes:true,attributeFilter:['class']});});
 reveal();
}
function workoutHead(){
 const w=$('workout');if(!w||w.querySelector(':scope > .forge-lb-wohead'))return;
 const h=el('div','forge-lb-wohead');h.append(el('h2','','Workout'));
 const b=el('button','forge-lb-menu-btn');b.type='button';b.innerHTML=ICON.dots+'<span class="forge-lb-dot" aria-hidden="true"></span>';
 b.setAttribute('aria-label','Menü: Sicherung, Updates, Einstellungen');
 h.append(b);w.prepend(h);
}

/* ---------- weekly goal from plan ---------- */
let goalKey='';
function syncGoal(){
 if(typeof state==='undefined'||!state)return;
 let map=null,cad=null;
 try{map=typeof window.forge130WeekTrainingMap==='function'?window.forge130WeekTrainingMap():null;}catch(e){}
 try{cad=window.ForgeCadenceSchedule?.getActive?.()||null;}catch(e){}
 const days=planDaysPerWeek(map,cad&&cad.every?cad:null);
 // Hide the duplicate goal pickers (they live in the plan now).
 document.querySelectorAll('#progress details').forEach(d=>{
  const t=d.querySelector(':scope > summary')?.textContent||'';
  if(/Wochenziel/.test(t))d.classList.add('forge-lb-goal-dup');
 });
 if(!days)return;
 const key=days+'|'+(state.forgeMotivation?.strengthGoal)+'|'+(state.challengeSettings?.weeklyGoal);
 if(key===goalKey)return;goalKey=key;
 let changed=false;
 try{
  if(typeof forge144Data==='function'){const m=forge144Data();if(m.strengthGoal!==days){m.strengthGoal=days;changed=true;}}
  if(!state.challengeSettings||state.challengeSettings.weeklyGoal!==days){state.challengeSettings={...(state.challengeSettings||{}),weeklyGoal:days};changed=true;}
  if(changed&&typeof save==='function')save();
 }catch(e){}
}

/* ---------- error notice ----------
 * Shows errors that forgeReportError() / window.onerror collected, so a
 * broken sub-view never goes unnoticed (the user can send a screenshot). */
const shownErrors=new Set();
function errorNotice(entry){
 if(!entry||!document.body)return;
 const k=(entry.where||'')+'|'+(entry.message||'');if(shownErrors.has(k))return;shownErrors.add(k);
 let bar=$('forgeLbErrorBar');
 if(!bar){
  bar=el('div','forge-lb-errbar');bar.id='forgeLbErrorBar';bar.setAttribute('role','alert');
  const st=el('style');st.textContent='.forge-lb-errbar{position:fixed;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top));z-index:2147483000;background:#2a1418;border:1px solid #6b2a33;color:#ffe3e6;border-radius:16px;padding:10px 12px;font:13px/1.4 Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}.forge-lb-errbar b{font-size:14px}.forge-lb-errbar pre{margin:0;white-space:pre-wrap;word-break:break-word;font-size:11px;color:#ffc9cf}.forge-lb-errbar .r{display:flex;gap:8px;justify-content:flex-end}.forge-lb-errbar button{min-height:36px;border-radius:18px;border:1px solid #6b2a33;background:transparent;color:#ffe3e6;font:inherit;font-weight:700;padding:0 14px}';
  bar.append(st);document.body.append(bar);
 }
 const box=el('div');box.append(el('b','','Ein Teil der App hatte einen Fehler'),el('div','',(entry.where?entry.where+': ':'')+entry.message));
 const pre=el('pre',' ',entry.stack||'');pre.hidden=true;box.append(pre);
 const row=el('div','r');
 const more=el('button','','Details');more.type='button';more.addEventListener('click',()=>{pre.hidden=!pre.hidden;});
 const x=el('button','','Schließen');x.type='button';x.addEventListener('click',()=>{box.remove();if(!bar.querySelector('div'))bar.remove();});
 row.append(more,x);box.append(row);bar.append(box);
}
function watchErrors(){
 (window.__forgeErrors||[]).forEach(errorNotice);
 document.addEventListener('forge:error',e=>errorNotice(e.detail));
 const report=(where,err)=>{if(typeof window.forgeReportError==='function')window.forgeReportError(where,err);else errorNotice({where,message:String(err&&err.message||err),stack:String(err&&err.stack||'')});};
 window.addEventListener('error',e=>{if(!e||!e.error)return;report('Skript',e.error);});
 window.addEventListener('unhandledrejection',e=>{const r=e&&e.reason;if(r instanceof Error)report('Hintergrund',r);});
}

/* ---------- lifecycle ---------- */
function tick(){
 if(!enabled())return;
 decorateMenuButtons();workoutHead();brand();syncGoal();
}
function install(){
 if(!document.body||!enabled())return false;
 if(!$('forgeLayoutBShellStyle')){const st=el('style');st.id='forgeLayoutBShellStyle';st.textContent=CSS;document.head.append(st);}
 document.addEventListener('click',interceptMenu,true);
 try{watchErrors();}catch(e){}
 tick();try{watchTabs();}catch(e){}setInterval(()=>{if(document.visibilityState!=='hidden')tick();},800);
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
