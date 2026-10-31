/* FORGE | 16-point polish: common controls, transparent plan actions, central preferences.
 * Preferences are OPTIONAL (no user profile) and stored in the existing FORGE backup state.
 * The original renderers, session data, and cadence planner remain authoritative.
 */
(function () {
'use strict';
const $=id=>document.getElementById(id);
const make=(tag,cls,label)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(label!==undefined)el.textContent=label;
 return el;
};
const validRest=n=>[45,60,90,120,180].includes(Number(n));
const prefDefaults=Object.freeze({largeText:false,dense:false,weightHints:true,statsVisible:[0,1,2,3]});
function preferences(raw) {
 const p=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const visible=Array.isArray(p.statsVisible)?
  [...new Set(p.statsVisible.filter(n=>Number.isInteger(n)&&n>=0&&n<16))].slice(0,8):
  prefDefaults.statsVisible.slice();
 return {largeText:p.largeText===true,dense:p.dense===true,
  weightHints:p.weightHints!==false,statsVisible:visible.length?visible:[0,1,2,3]};
}
function current(){return preferences(typeof state==='object'?state.forgeUiSettings:null);}
function persist(p) {
 if(typeof state==='undefined'||typeof save!=='function')return false;
 state.forgeUiSettings=preferences(p);
 save();
 apply();
 return true;
}
function labelForTile(tile,index) {
 const label=tile?.querySelector('small')?.textContent?.trim()||
             tile?.getAttribute('aria-label')||'Kennzahl '+(index+1);
 return label.slice(0,70);
}
window.ForgeFlowSettings=Object.freeze({preferences,validRest,labelForTile,isInstalled:()=>installed});
let installed=false,observed=false,frame=false,modal=null,escapeHandler=null;
function apply(){
 const p=current();
 document.body.classList.toggle('forge-readable',p.largeText);
 document.body.classList.toggle('forge-dense',p.dense);
 const tiles=Array.from(document.querySelectorAll('#forgeProgressSummary > .forge-stats-tile'));
 // Never replace chart nodes; show/hide only existing original statistics.
 tiles.forEach((tile,i)=>{tile.hidden=!p.statsVisible.includes(i);});
 const root=$('forgeProgressSummary');
 if(root&&root.querySelectorAll('.forge-stats-tile:not([hidden])').length===0&&tiles.length){
  tiles[0].hidden=false;
 }
}
function row(label,control){
 const r=make('label','forge-settings-row');
 r.append(make('span','',label),control);
 return r;
}
function check(label,enabled,onChange){
 const input=make('input');input.type='checkbox';input.checked=enabled;
 input.addEventListener('change',()=>onChange(input.checked));
 return row(label,input);
}
function section(title){
 const s=make('section','forge-settings-section');
 s.append(make('h3','',title));return s;
}
function dismiss(){
 if(!modal)return;
 if(escapeHandler){document.removeEventListener('keydown',escapeHandler,true);escapeHandler=null;}
 modal.remove();
 document.body.style.overflow=modal.dataset.previousOverflow||'';
 modal=null;
 const trigger=$('forgeSettingsToggle');
 trigger?.focus?.({preventScroll:true});
}
function open(){
 if(modal)return;
 const p=current(),overlay=make('div','forge-settings-overlay');
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','FORGE Einstellungen');
 overlay.dataset.previousOverflow=document.body.style.overflow;
 const sheet=make('div','forge-settings-sheet');
 const header=make('div','forge-settings-head');
 header.append(make('h2','','Einstellungen'));
 const close=make('button','forge-settings-close','✕');
 close.type='button';close.setAttribute('aria-label','Einstellungen schließen');
 close.addEventListener('click',dismiss);header.append(close);sheet.append(header);
 sheet.append(make('p','forge-settings-hint','Nur Bedienung und Anzeige anpassen. Dein persönliches Trainingsprofil kommt später.'));
 const display=section('Darstellung');
 display.append(check('Größere Schrift',p.largeText,v=>persist({...current(),largeText:v})));
 display.append(check('Kompakte Listen',p.dense,v=>persist({...current(),dense:v})));
 sheet.append(display);
 const workout=section('Training');
 workout.append(check('Gewichtsempfehlungen anzeigen',
   typeof window.forge130Settings==='function'?window.forge130Settings().weightHints!==false:p.weightHints,
   v=>{
    if(typeof state!=='undefined'&&typeof save==='function'){
     state.forge130Settings={...(state.forge130Settings||{}),weightHints:v};save();
    }
    persist({...current(),weightHints:v});
   }));
 const rest=row('Satzpause');
 const select=make('select');
 for(const secs of [45,60,90,120,180]){
  const option=make('option','',secs+' Sekunden');option.value=String(secs);
  select.append(option);
 }
 const configured=typeof window.forge130Settings==='function'?window.forge130Settings().restSeconds:90;
 select.value=validRest(configured)?String(configured):'90';
 select.setAttribute('aria-label','Standarddauer der Satzpause');
 select.addEventListener('change',()=>{
  if(validRest(select.value)&&typeof window.forge130SetRestDuration==='function')
   window.forge130SetRestDuration(select.value);
 });
 rest.append(select);workout.append(rest);sheet.append(workout);
 const progress=section('Fortschritt: Kennzahlen auswählen');
 progress.append(make('p','forge-settings-hint','Wähle die Kennzahlen, die auf der Übersichtsseite sichtbar bleiben.'));
 const tiles=Array.from(document.querySelectorAll('#forgeProgressSummary > .forge-stats-tile'));
 if(tiles.length){
  tiles.forEach((tile,i)=>{
   progress.append(check(labelForTile(tile,i),p.statsVisible.includes(i),value=>{
    const next=current().statsVisible.filter(x=>x!==i);
    if(value)next.push(i);
    if(!next.length){alert('Mindestens eine Kennzahl muss sichtbar bleiben.');return renderStatsControls();}
    persist({...current(),statsVisible:next});
   }));
  });
 }else progress.append(make('p','forge-settings-hint','Statistiken werden nach dem ersten Training verfügbar.'));
 sheet.append(progress);
 const data=section('Deine Daten');
 const backup=make('button','forge-settings-action','Backup als Datei exportieren');
 backup.type='button';
 backup.addEventListener('click',()=>{dismiss();if(typeof window.exportData==='function')window.exportData();});
 data.append(backup);
 const restore=make('button','forge-settings-action alt','Datensicherung öffnen');
 restore.type='button';
 restore.addEventListener('click',()=>{
  dismiss();
  if(typeof window.go==='function')window.go('nutrition');
  window.ForgeNutritionSlim?.openPart('backup');
 });
 data.append(restore);
 if(window.ForgeBackupGuard?.recoveryAvailable?.()){
  const recovery=make('button','forge-settings-action alt','Vorherigen Stand wiederherstellen');
  recovery.type='button';
  recovery.addEventListener('click',()=>{dismiss();window.ForgeBackupGuard.restoreRecovery();});
  data.append(recovery);
 }
 data.append(make('p','forge-settings-hint','FORGE speichert lokal. Vor einem Gerätewechsel oder einer Deinstallation ein Backup exportieren.'));
 sheet.append(data);
 const updates=make('button','forge-settings-action alt','App-Updates prüfen');
 updates.type='button';updates.addEventListener('click',()=>{dismiss();$('forge-updates-root')?.querySelector('button')?.click();});
 sheet.append(updates);
 overlay.append(sheet);
 overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
 const esc=e=>{if(e.key==='Escape'&&modal===overlay){e.preventDefault();dismiss();document.removeEventListener('keydown',esc,true);}};
 escapeHandler=esc;document.addEventListener('keydown',esc,true);
 document.body.style.overflow='hidden';
 document.body.append(overlay);modal=overlay;
 close.focus({preventScroll:true});
}
function renderStatsControls(){
 if(modal){dismiss();open();}
}
function polishPlan(){
 const week=$('forgePolishWeek');
 if(week){
  week.querySelectorAll('.forge-polish-day-actions button').forEach(button=>{
   if(button.textContent.trim()==='↔ Verschieben')button.textContent='↔ Nur diese Woche';
  });
 }
 const active=$('forgeActivePlanToggle');
 if(active&&!active.textContent.includes('Abbrechen'))active.setAttribute('aria-label','Aktiven Plan dauerhaft ändern');
 const editor=$('forgeActivePlanEditor');
 if(editor){
  const h=editor.querySelector('.forge-active-editor-header h2');
  if(h)h.setAttribute('aria-label','Dauerhafte Änderungen am aktiven Plan');
 }
}
function schedule(){
 if(frame)return;frame=true;
 const run=()=>{frame=false;apply();polishPlan();};
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);
 else setTimeout(run,0);
}
function css(){
 if($('forgeFlowSettingsStyle'))return;
 const style=make('style');style.id='forgeFlowSettingsStyle';
 style.textContent=[
 '#forgeSettingsToggle{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;background:#20382d;border:1px solid #4e7455;color:#d3fac3;border-radius:12px;font-size:20px;cursor:pointer}',
 '.forge-settings-overlay{position:fixed;inset:0;z-index:21000;background:rgba(0,0,0,.77);display:flex;align-items:flex-end;justify-content:center}',
 '.forge-settings-sheet{background:#122328;border:1px solid #4c655a;border-radius:20px 20px 0 0;width:min(100%,610px);max-height:93dvh;overflow:auto;box-sizing:border-box;padding:18px 18px calc(24px + env(safe-area-inset-bottom));color:#e9f7eb}',
 '.forge-settings-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.forge-settings-head h2{margin:0;font-size:23px}',
 '.forge-settings-close{background:#263c37;color:white;border:1px solid #597568;border-radius:11px;min-width:44px;min-height:44px;font-size:19px}',
 '.forge-settings-section{border-top:1px solid #3b584c;margin:17px 0 0;padding:13px 0 0}',
 '.forge-settings-section h3{font-size:16px;margin:0 0 9px;color:#bff49e}',
 '.forge-settings-hint{font-size:13px;line-height:1.5;color:#b2c4b7;margin:8px 0}',
 '.forge-settings-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:51px;border-bottom:1px solid #2e453d;font-size:14px;line-height:1.4;padding:6px 0}',
 '.forge-settings-row input[type=checkbox]{width:24px;height:24px;flex:none;accent-color:#a8f55d}',
 '.forge-settings-row select{max-width:175px;width:auto;min-height:45px;font-size:14px;color:#e6f7e4;background:#1c3332;border:1px solid #587563}',
 '.forge-settings-action{display:block;width:100%;min-height:49px;border:0;border-radius:11px;background:#a8f55d;color:#11231a;margin:8px 0;font-weight:760;font-size:14px}',
 '.forge-settings-action.alt{background:#234039;color:#e8f3e9;border:1px solid #547561}',
 'body.forge-readable .page{font-size:17px!important}body.forge-readable .page small,body.forge-readable .page .muted,body.forge-readable .page label{font-size:14px!important}',
 'body.forge-readable .page button{font-size:15px!important}body.forge-dense .forge-polish-day{padding-top:7px!important;padding-bottom:7px!important}',
 '#forgeProgressSummary > .forge-stats-tile[hidden]{display:none!important}',
 '@media(min-width:650px){.forge-settings-overlay{align-items:center}.forge-settings-sheet{border-radius:19px;max-height:86dvh}}',
 '@media(prefers-reduced-motion:reduce){.forge-settings-overlay *{scroll-behavior:auto!important}}'
 ].join('\n');
 document.head.append(style);
}
function install(){
 if(installed)return true;
 const header=document.querySelector('header'),plan=$('plan'),stats=$('progress');
 if(!header||!plan||!stats||typeof state==='undefined')return false;
 css();
 const btn=make('button');btn.id='forgeSettingsToggle';btn.type='button';
 btn.textContent='⚙';btn.setAttribute('aria-label','Einstellungen öffnen');
 btn.addEventListener('click',open);
 const parent=header.querySelector('.logo')?.parentElement||header;
 parent.append(btn);
 installed=true;
 apply();polishPlan();
 if(!observed&&typeof MutationObserver==='function'){
  const observer=new MutationObserver(schedule);
  for(const id of ['forgePolishWeek','forgeProgressSummary','forgeActivePlanEditor']){
   const node=$(id);if(node)observer.observe(node,{childList:true,subtree:true});
  }
  observed=true;
 }
 return true;
}
function boot(){
 let tries=0;
 const loop=()=>{if(install())return;if(++tries<60)setTimeout(loop,100);};
 loop();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();