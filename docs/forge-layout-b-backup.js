/* FORGE Layout B · Datensicherung an einer Stelle.
 * Ein Vollbild-Fenster bündelt, was vorher an vier Stellen lag (⋯-Menü,
 * Einstellungen, Essen-Einstellungen, alte Essen-Seite):
 *  - Automatische Sicherung (Android: Ordner wählen, jetzt sichern, ausschalten)
 *  - Backup als Datei exportieren
 *  - Backup wiederherstellen (mit Vorschau und eigener Bestätigung, ohne Systemdialog)
 *  - Stand vor dem letzten Import zurückholen
 *  - Alle Daten löschen
 * Die Erinnerung „Zeit für eine Sicherung“ erscheint in B als schmale Karte im Plan.
 * Nutzt ForgeAutoBackup / ForgeBackupGuard; Datenformat unverändert.
 */
(function(){
'use strict';
const DAY=86400000;
/* "vor 3 Tagen" style age text (pure, tested). */
function ago(ms,now){
 if(!ms)return 'noch nie';
 const d=Math.floor(((now||Date.now())-ms)/DAY);
 if(d<=0)return 'heute';
 if(d===1)return 'gestern';
 if(d<14)return 'vor '+d+' Tagen';
 if(d<60)return 'vor '+Math.round(d/7)+' Wochen';
 return 'vor '+Math.round(d/30)+' Monaten';
}
/* Headline for the status card (pure, tested). */
function summary(st,now){
 if(!st)return {tone:'muted',title:'Lokal gespeichert',text:'Deine Daten bleiben auf diesem Gerät.'};
 if(st.active)return {tone:'ok',title:'Automatische Sicherung aktiv',text:'Ordner „'+st.folder+'“ · zuletzt '+ago(st.lastAuto,now)};
 if(st.reminder)return {tone:'warn',title:'Zeit für eine Sicherung',text:'Letzte Sicherung: '+ago(st.lastBackup,now)};
 if(st.native)return {tone:'muted',title:'Automatische Sicherung aus',text:'Letzte Sicherung: '+ago(st.lastBackup,now)};
 return {tone:'muted',title:'Lokal gespeichert',text:'Letzte Sicherung: '+ago(st.lastBackup,now)};
}
window.ForgeLayoutBBackup=Object.freeze({ago,summary});
if(typeof document==='undefined')return;

const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function auto(){return window.ForgeAutoBackup&&typeof window.ForgeAutoBackup.status==='function'?window.ForgeAutoBackup:null;}
function guard(){return window.ForgeBackupGuard||null;}
function status(){try{return auto()?auto().status():null;}catch(e){return null;}}
const ACC='#a9f267',WARN='#ffb547';
const ICON={
 x:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 chev:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
 shield:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke-linecap="round"/></svg>',
 warn:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z" stroke-linejoin="round"/><path d="M12 10v4M12 17.5v.01"/></svg>',
 up:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 15v4h14v-4"/></svg>',
 down:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 15v4h14v-4"/></svg>',
 back:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg>',
 folder:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5h6l2 2h10V19H3z"/></svg>'
};
const CSS=`
.forge-lb-bk{position:fixed;inset:0;z-index:2147480400;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
.forge-lb-bk *{box-sizing:border-box}
.forge-lb-bk .bk-head{display:flex;align-items:center;gap:10px;padding:12px 14px 6px}
.forge-lb-bk .bk-head strong{flex:1;font-size:22px;font-weight:800;letter-spacing:-.02em}
.forge-lb-bk .bk-x{width:44px;height:44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
.forge-lb-bk .bk-body{flex:1;overflow:auto;padding:6px 14px 20px;-webkit-overflow-scrolling:touch;max-width:560px;width:100%;margin:0 auto}
.forge-lb-bk .bk-status{display:flex;gap:12px;align-items:flex-start;border-radius:20px;padding:14px;border:1px solid #293346;background:#171e2a}
.forge-lb-bk .bk-status>i{width:44px;height:44px;flex:0 0 44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#202a38;color:#c3cddb}
.forge-lb-bk .bk-status.ok{border-color:#3a5a2f;background:#16211a}.forge-lb-bk .bk-status.ok>i{background:#22361f;color:${ACC}}
.forge-lb-bk .bk-status.warn{border-color:#6b5426;background:#211c12}.forge-lb-bk .bk-status.warn>i{background:#3a2e14;color:${WARN}}
.forge-lb-bk .bk-status b{display:block;font-size:16px}
.forge-lb-bk .bk-status small{display:block;font-size:13px;color:#c3cddb;margin-top:2px;line-height:1.4}
.forge-lb-bk .bk-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;margin:18px 4px 8px}
.forge-lb-bk .bk-text{font-size:13px;color:#95a3b7;line-height:1.5;margin:0 4px 10px}
.forge-lb-bk .bk-box{background:#171e2a;border:1px solid #293346;border-radius:20px;overflow:hidden}
.forge-lb-bk .bk-row{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;padding:10px 14px;border:0;border-top:1px solid #222b3a;background:transparent;color:#f3f7fc;font:inherit;text-align:left}
.forge-lb-bk .bk-row:first-child{border-top:0}
.forge-lb-bk .bk-row>i{width:36px;height:36px;flex:0 0 36px;border-radius:12px;background:#202a38;display:flex;align-items:center;justify-content:center;color:#c3cddb}
.forge-lb-bk .bk-row>span{flex:1;min-width:0}
.forge-lb-bk .bk-row b{display:block;font-size:15px}
.forge-lb-bk .bk-row small{display:block;font-size:12px;color:#95a3b7;margin-top:2px;line-height:1.35}
.forge-lb-bk .bk-row>svg{color:#5b6b80;flex:0 0 auto}
.forge-lb-bk .bk-row:disabled{opacity:.45}
.forge-lb-bk .bk-main{width:100%;height:54px;border-radius:27px;border:0;background:${ACC};color:#142016;font:inherit;font-size:16px;font-weight:800;margin-top:10px}
.forge-lb-bk .bk-sec{width:100%;min-height:48px;border-radius:24px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;margin-top:8px}
.forge-lb-bk .bk-danger{width:100%;min-height:48px;border-radius:24px;border:1px solid #5a2b2b;background:transparent;color:#ff8a7a;font:inherit;font-size:15px;font-weight:700;margin-top:22px}
.forge-lb-bk .bk-msg{font-size:13px;margin:10px 4px 0;line-height:1.45}
.forge-lb-bk .bk-msg.err{color:#ff8a7a}.forge-lb-bk .bk-msg.ok{color:${ACC}}
.forge-lb-bk .bk-msg:empty{display:none}
.forge-lb-bk .bk-confirm{background:#171e2a;border:1px solid #3a4556;border-radius:20px;padding:16px;margin-top:12px}
.forge-lb-bk .bk-confirm b{display:block;font-size:16px;margin-bottom:6px}
.forge-lb-bk .bk-confirm p{font-size:14px;color:#c3cddb;line-height:1.45;margin:0 0 6px}
.forge-lb-bk .bk-confirm .bk-acts{display:flex;gap:10px;margin-top:10px}
.forge-lb-bk .bk-confirm .bk-acts button{flex:1;margin:0}
.forge-lb-bk .bk-confirm .bk-acts .bk-main{height:48px}
.forge-lb-bk .bk-confirm.danger .bk-main{background:#ff8a7a;color:#2a0f0b}
.forge-lb-bk button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
body.forge-layout-b #forgeBackupReminder{display:none!important}
.forge-lb-bkrem{display:flex;align-items:center;gap:12px;background:#211c12;border:1px solid #6b5426;border-radius:20px;padding:12px 14px;margin:0 0 12px;color:#f3f7fc;font-family:Inter,system-ui,sans-serif}
.forge-lb-bkrem>i{color:${WARN};display:flex}
.forge-lb-bkrem>span{flex:1;min-width:0}
.forge-lb-bkrem b{display:block;font-size:15px}
.forge-lb-bkrem small{display:block;font-size:12px;color:#c3cddb}
.forge-lb-bkrem button{min-height:40px;border-radius:20px;border:0;background:${WARN};color:#2a1d05;font:inherit;font-size:13px;font-weight:800;padding:0 14px;flex:0 0 auto}
.forge-lb-bkrem button.l{background:transparent;color:#c3cddb;border:1px solid #6b5426;padding:0 12px}
`;
function ensureCss(){if(!$('forgeLayoutBBackupStyle')){const st=el('style');st.id='forgeLayoutBBackupStyle';st.textContent=CSS;document.head.append(st);}}

let root=null,body=null,msg=null,pendingImport=null,confirmWipe=false,confirmOff=false,confirmRecovery=false,busy=false;
function close(){if(root){root.remove();root=null;body=null;msg=null;pendingImport=null;confirmWipe=false;confirmOff=false;confirmRecovery=false;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}
function say(text,tone){if(msg){msg.textContent=text||'';msg.className='bk-msg '+(tone||'');}}
function open(){
 if(!enabled())return false;
 ensureCss();close();
 root=el('div','forge-lb-bk');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Datensicherung');
 const head=el('div','bk-head');head.append(el('strong','','Datensicherung'));
 const x=btn('bk-x','',close);x.innerHTML=ICON.x;x.setAttribute('aria-label','Schließen');head.append(x);
 body=el('div','bk-body');root.append(head,body);document.body.append(root);
 document.addEventListener('keydown',onKey,true);
 draw();x.focus({preventScroll:true});
 return true;
}
function row(icon,title,sub,fn){const b=btn('bk-row','',fn);const i=el('i');i.innerHTML=icon;const s=el('span');s.append(el('b','',title));if(sub)s.append(el('small','',sub));b.append(i,s);b.insertAdjacentHTML('beforeend',ICON.chev);return b;}
function confirmBox(cls,title,lines,okText,onOk,onCancel){
 const c=el('div','bk-confirm'+(cls?' '+cls:''));c.setAttribute('role','alertdialog');c.append(el('b','',title));
 lines.forEach(t=>c.append(el('p','',t)));
 const a=el('div','bk-acts');a.append(btn('bk-sec','Abbrechen',onCancel),btn('bk-main',okText,onOk));c.append(a);return c;
}
function draw(){
 if(!body)return;
 const keepMsg=msg?[msg.textContent,msg.className]:null;
 body.textContent='';
 const st=status(),sm=summary(st);
 const card=el('div','bk-status '+sm.tone);const ic=el('i');ic.innerHTML=sm.tone==='warn'?ICON.warn:ICON.shield;
 const tx=el('span');tx.append(el('b','',sm.title),el('small','',sm.text));card.append(ic,tx);body.append(card);
 // Automatic backup
 body.append(el('div','bk-label','Automatisch'));
 if(st&&st.native){
  if(st.active){
   body.append(el('p','bk-text','FORGE legt höchstens einmal täglich und nur bei Änderungen eine Sicherung im Ordner ab und behält die letzten 14.'));
   const box=el('div','bk-box');
   box.append(row(ICON.up,'Jetzt sichern','Zuletzt '+ago(st.lastAuto),()=>{if(auto().run(true))say('Sicherung läuft …','ok');else say('Gerade nichts zu sichern.','');draw();}));
   box.append(row(ICON.folder,'Ordner ändern','Aktuell „'+st.folder+'“',()=>auto().chooseFolder()));
   box.append(row(ICON.x,'Automatische Sicherung ausschalten','Gespeicherte Dateien bleiben im Ordner',()=>{confirmOff=true;draw();}));
   body.append(box);
   if(confirmOff)body.append(confirmBox('','Automatische Sicherung ausschalten?',['Bereits gespeicherte Dateien bleiben im Ordner.'],'Ausschalten',()=>{confirmOff=false;auto().clearFolder();draw();},()=>{confirmOff=false;draw();}));
  }else{
   body.append(el('p','bk-text','Wähle einmal einen Ordner, zum Beispiel „Download“ oder einen Google-Drive-Ordner. FORGE sichert dann automatisch – höchstens einmal täglich und nur bei Änderungen.'));
   body.append(btn('bk-main','Ordner wählen und einschalten',()=>auto().chooseFolder()));
  }
  if(st.lastError)body.append(el('p','bk-msg err','Letzter Versuch: '+st.lastError));
 }else{
  body.append(el('p','bk-text','In der Browser-Version kann FORGE nicht selbst speichern. Exportiere regelmäßig eine Datei – FORGE erinnert dich nach 14 Tagen.'));
 }
 // Manual file backup
 body.append(el('div','bk-label','Als Datei'));
 const box=el('div','bk-box');
 box.append(row(ICON.down,'Backup als Datei exportieren','JSON mit allen Trainings, Plänen und Essen'+(st&&st.lastManual?' · zuletzt '+ago(st.lastManual):''),()=>{if(typeof window.exportData==='function'){window.exportData();say('Backup wird erstellt.','ok');setTimeout(draw,600);}}));
 const file=el('input');file.type='file';file.accept='application/json,.json';file.hidden=true;
 file.addEventListener('change',async()=>{
  const f=file.files&&file.files[0];file.value='';if(!f||!guard()||busy)return;
  busy=true;say('Datei wird geprüft …','');
  const res=await guard().readBackupFile(f);busy=false;
  if(!res.ok){pendingImport=null;draw();say('Import abgebrochen: '+res.error,'err');return;}
  pendingImport=res;draw();
 });
 box.append(row(ICON.back,'Backup wiederherstellen','Ersetzt die aktuellen Daten durch eine Datei',()=>file.click()));
 const rec=!!(guard()&&guard().recoveryAvailable&&guard().recoveryAvailable());
 if(rec)box.append(row(ICON.back,'Stand vor dem letzten Import','Macht den letzten Import rückgängig',()=>{confirmRecovery=true;draw();}));
 body.append(box,file);
 if(pendingImport)body.append(confirmBox('','Backup erkannt',[pendingImport.description+'.','Der aktuelle Stand wird ersetzt. Eine Kopie des jetzigen Stands bleibt auf dem Gerät, damit du den Import rückgängig machen kannst.'],'Ersetzen',()=>{
  const r=guard().applyImport(pendingImport.data);const d=pendingImport.description;pendingImport=null;draw();
  say(r.ok?'Import erfolgreich: '+d+'.':'Import fehlgeschlagen. '+r.error,r.ok?'ok':'err');
 },()=>{pendingImport=null;draw();}));
 if(confirmRecovery)body.append(confirmBox('','Stand vor dem letzten Import zurückholen?',['Der aktuelle Stand wird durch die lokale Kopie vor dem letzten Import ersetzt.'],'Zurückholen',()=>{
  confirmRecovery=false;const r=guard().applyRecovery();draw();say(r.ok?'Vorheriger Stand wiederhergestellt.':'Wiederherstellung fehlgeschlagen. '+r.error,r.ok?'ok':'err');
 },()=>{confirmRecovery=false;draw();}));
 msg=el('p','bk-msg');msg.setAttribute('role','status');body.append(msg);
 if(keepMsg){msg.textContent=keepMsg[0];msg.className=keepMsg[1];}
 // Danger zone
 body.append(btn('bk-danger','Alle Daten löschen …',()=>{confirmWipe=true;draw();setTimeout(()=>body&&body.lastElementChild?.scrollIntoView?.({block:'end'}),30);}));
 if(confirmWipe)body.append(confirmBox('danger','Wirklich alle Daten löschen?',['Trainings, Pläne, Essen und Einstellungen werden auf diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen – exportiere vorher ein Backup.'],'Alles löschen',()=>{
  confirmWipe=false;const prev=window.confirm;window.confirm=()=>true;
  try{if(typeof window.resetData==='function')window.resetData();}finally{window.confirm=prev;}
  draw();say('Alle Daten gelöscht.','ok');
 },()=>{confirmWipe=false;draw();}));
}

/* ---------- reminder on the Plan page ---------- */
let rem=null;
function reminder(){
 if(!enabled())return;
 const st=status(),page=$('plan');
 const show=!!(st&&st.reminder&&page&&page.classList.contains('active')&&!(typeof state!=='undefined'&&state&&state.activeWorkout));
 if(!show){if(rem){rem.remove();rem=null;}return;}
 ensureCss();
 if(!rem||!page.contains(rem)){
  rem=el('div','forge-lb-bkrem');rem.setAttribute('role','status');
  const i=el('i');i.innerHTML=ICON.warn;const t=el('span');
  t.append(el('b','','Zeit für eine Sicherung'),el('small','',st.lastBackup?'Letzte Sicherung '+ago(st.lastBackup):'Noch keine Sicherung'));
  rem.append(i,t,btn('','Sichern',open),btn('l','Später',()=>{try{auto().snooze();}catch(e){}reminder();}));
  const head=page.querySelector(':scope > .forge-lb-plan > .forge-lb-plan-head');
  if(head)head.after(rem);else{rem=null;return;}
 }
}

function install(){
 if(!document.body||!enabled())return false;
 window.forgeOpenBackup=open;
 window.addEventListener('forge:backup-changed',()=>{if(root&&!busy)draw();reminder();});
 const plan=$('plan');
 if(plan)new MutationObserver(()=>reminder()).observe(plan,{attributes:true,attributeFilter:['class']});
 setTimeout(reminder,1200);
 return true;
}
function boot(){if(install())return;let k=0;const t=setInterval(()=>{if(install()||++k>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
