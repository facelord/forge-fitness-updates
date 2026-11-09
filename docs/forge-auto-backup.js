/* FORGE automatic backup.
 * Android: the user chooses one folder once (e.g. Download or a Google Drive folder).
 * FORGE then writes the same JSON as "JSON exportieren" at most once a day, only when
 * the data changed, and keeps the newest 14 files. Web/iPhone: a reminder after
 * 14 days without a backup. Training data itself is never modified here.
 */
(function(){
'use strict';
const META_KEY='forge_auto_backup_v1';
const HOUR=3600000,DAY=24*HOUR;
const MIN_GAP=20*HOUR,REMIND_AFTER=14*DAY,SNOOZE=3*DAY;
let pending=false,lastError='';
const $=id=>document.getElementById(id);
function make(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function now(){return Date.now();}
function readMeta(){
 try{const m=JSON.parse(localStorage.getItem(META_KEY)||'{}');return m&&typeof m==='object'&&!Array.isArray(m)?m:{};}
 catch(e){return {};}
}
function writeMeta(patch){
 const next={...readMeta(),...patch};
 try{localStorage.setItem(META_KEY,JSON.stringify(next));}catch(e){}
 return next;
}
function native(){
 const a=window.ForgeAndroid;
 return a&&typeof a.writeAutoBackup==='function'&&typeof a.getBackupFolderName==='function'
  &&typeof a.chooseBackupFolder==='function'?a:null;
}
function folderName(){
 const a=native();if(!a)return '';
 try{return String(a.getBackupFolderName()||'');}catch(e){return '';}
}
function appState(){
 try{return typeof state!=='undefined'&&state&&typeof state==='object'?state:null;}catch(e){return null;}
}
function hasData(s){
 return !!s&&['workouts','foods','plan','weights'].some(k=>Array.isArray(s[k])&&s[k].length>0);
}
function fingerprint(text){
 let h=0x811c9dc5;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
 return text.length+':'+h.toString(16);
}
function localDate(ms){
 const d=new Date(ms),p=n=>String(n).padStart(2,'0');
 return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function fileName(ms){return 'FORGE-Sicherung-'+localDate(ms)+'.json';}
function formatTime(ms){
 if(!ms)return 'noch nie';
 try{return new Date(ms).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
 catch(e){return localDate(ms);}
}
function lastBackup(m){return Math.max(Number(m.lastAuto)||0,Number(m.lastManual)||0);}

/* Decide whether an automatic backup should run now (pure, exported for tests). */
function shouldRun(meta,print,at,force){
 if(force)return true;
 if(at-(Number(meta.lastAuto)||0)<MIN_GAP)return false;
 return print!==meta.lastHash;
}
function run(force){
 const a=native(),s=appState();
 if(!a||pending||!hasData(s)||!folderName())return false;
 const at=now(),meta=readMeta();
 // Cheap check first: never serialize more than needed while the app is used.
 if(!force&&at-(Number(meta.lastAuto)||0)<MIN_GAP)return false;
 let text;
 try{text=JSON.stringify(s,null,2);}catch(e){return false;}
 const print=fingerprint(text);
 if(!shouldRun(meta,print,at,force))return false;
 pending=true;lastError='';
 writeMeta({pendingHash:print,pendingAt:at});
 try{a.writeAutoBackup(fileName(at),text);}
 catch(e){pending=false;lastError='Sicherung nicht möglich';render();return false;}
 render();
 return true;
}
window.forgeAutoBackupResult=function(payload){
 pending=false;
 let r={};try{r=JSON.parse(payload||'{}');}catch(e){}
 const meta=readMeta();
 if(r&&r.ok){
  writeMeta({lastAuto:Number(meta.pendingAt)||now(),lastHash:meta.pendingHash||'',lastName:String(r.name||''),snoozeUntil:0});
  lastError='';
 }else lastError=String(r&&r.error||'Sicherung fehlgeschlagen');
 render();
};
window.forgeAutoBackupFolderChanged=function(name){
 render();
 if(name)run(true);
};
window.forgeManualBackupSaved=function(){writeMeta({lastManual:now(),snoozeUntil:0});render();};

function wrapExport(){
 const original=window.exportData;
 if(typeof original!=='function'||original.__forgeAutoBackup)return;
 const wrapped=function(){
  const result=original.apply(this,arguments);
  // Android reports the saved file via forgeManualBackupSaved; browsers download directly.
  if(!native())window.forgeManualBackupSaved();
  return result;
 };
 wrapped.__forgeAutoBackup=true;
 window.exportData=wrapped;
}

function backupCard(){
 const button=document.querySelector('button[onclick="exportData()"]');
 return button?button.closest('.card')||button.parentElement:null;
}
function statusText(){
 const meta=readMeta();
 if(!native())return 'In der Browser-Version kann FORGE nicht selbst speichern. Du wirst alle 14 Tage an eine Sicherung erinnert. Letzte Sicherung: '+formatTime(lastBackup(meta))+'.';
 const folder=folderName();
 if(!folder)return 'Aus. Wähle einmal einen Ordner, zum Beispiel „Download“ oder einen Google-Drive-Ordner. FORGE legt dort dann höchstens einmal täglich und nur bei Änderungen eine Sicherung ab und behält die letzten 14.';
 if(pending)return 'Sicherung läuft …';
 return 'Aktiv · Ordner „'+folder+'“ · Letzte automatische Sicherung: '+formatTime(Number(meta.lastAuto)||0)+'. Die letzten 14 Sicherungen bleiben erhalten.';
}
function render(){
 try{window.dispatchEvent(new CustomEvent('forge:backup-changed'));}catch(e){}
 const card=backupCard();
 if(!card)return;
 const notice=card.querySelector('p.notice');
 if(notice&&!notice.dataset.forgeAutoBackup){
  notice.dataset.forgeAutoBackup='1';
  notice.textContent='Alle Daten liegen nur auf diesem Gerät. Die automatische Sicherung schützt dich bei Handyverlust oder Neuinstallation. Zusätzlich kannst du jederzeit eine JSON-Datei exportieren und wieder importieren.';
 }
 let box=$('forgeAutoBackup');
 if(!box){
  box=make('div','forge-auto-backup');box.id='forgeAutoBackup';
  box.append(make('h3','','Automatische Sicherung'),make('p','forge-auto-backup-status'),make('p','forge-auto-backup-error'),make('div','row forge-auto-backup-actions'));
  if(notice)notice.after(box);else card.append(box);
 }
 box.querySelector('.forge-auto-backup-status').textContent=statusText();
 const err=box.querySelector('.forge-auto-backup-error');
 err.textContent=lastError?'Letzter Versuch: '+lastError:'';err.hidden=!lastError;
 const actions=box.querySelector('.forge-auto-backup-actions');
 actions.replaceChildren();
 const a=native(),folder=folderName();
 const add=(label,cls,fn)=>{const b=make('button','btn small '+cls,label);b.type='button';b.addEventListener('click',fn);actions.append(b);return b;};
 if(a&&folder){
  add('Jetzt sichern','',()=>run(true)).disabled=pending||!hasData(appState());
  add('Ordner ändern','alt',()=>a.chooseBackupFolder());
  add('Ausschalten','alt',()=>{if(confirm('Automatische Sicherung ausschalten? Bereits gespeicherte Dateien bleiben im Ordner.'))a.clearBackupFolder();});
 }else if(a){
  add('Ordner wählen','',()=>a.chooseBackupFolder());
 }
 renderReminder();
}

/* Reminder when no automatic backup is active (pure decision exported for tests). */
function needsReminder(meta,at,active,data){
 if(active||!data)return false;
 if(at<(Number(meta.snoozeUntil)||0))return false;
 const since=Math.max(lastBackup(meta),Number(meta.firstSeen)||at);
 return at-since>=REMIND_AFTER;
}
function renderReminder(){
 const meta=readMeta(),at=now();
 const show=needsReminder(meta,at,!!folderName(),hasData(appState()));
 let banner=$('forgeBackupReminder');
 if(!show){if(banner)banner.remove();return;}
 const main=document.querySelector('main');
 if(!main)return;
 if(!banner){
  banner=make('div','card forge-backup-reminder');banner.id='forgeBackupReminder';
  banner.setAttribute('role','status');
  main.prepend(banner);
 }
 banner.replaceChildren();
 banner.append(make('strong','','Zeit für eine Sicherung'),
  make('p','',lastBackup(meta)?'Deine letzte Sicherung ist vom '+formatTime(lastBackup(meta))+'. Ohne Sicherung sind deine Daten bei Handyverlust weg.':'Du hast noch keine Sicherung. Ohne Sicherung sind deine Daten bei Handyverlust weg.'));
 const row=make('div','row');
 const primary=make('button','btn small',native()?'Automatische Sicherung einrichten':'Jetzt sichern');
 primary.type='button';
 primary.addEventListener('click',()=>{const a=native();if(a)a.chooseBackupFolder();else if(typeof window.exportData==='function')window.exportData();});
 const later=make('button','btn alt small','Später');
 later.type='button';
 later.addEventListener('click',()=>{writeMeta({snoozeUntil:now()+SNOOZE});renderReminder();});
 row.append(primary,later);banner.append(row);
}
function addStyles(){
 if($('forgeAutoBackupStyle'))return;
 const style=make('style');style.id='forgeAutoBackupStyle';
 style.textContent='#forgeAutoBackup{margin:14px 0;padding:14px;border:1px solid var(--line,#293346);border-radius:14px;background:#111a24}'+
  '#forgeAutoBackup h3{margin:0 0 6px}#forgeAutoBackup p{margin:0 0 10px;line-height:1.5;font-size:13px}'+
  '#forgeAutoBackup .forge-auto-backup-error{color:#ffc6c6}#forgeAutoBackup .row{flex-wrap:wrap;justify-content:flex-start}'+
  '#forgeAutoBackup .btn,.forge-backup-reminder .btn{min-height:44px}'+
  '.forge-backup-reminder{border-color:#6b5426;background:#1f2530}.forge-backup-reminder p{margin:6px 0 10px;font-size:13px;line-height:1.5}'+
  '.forge-backup-reminder .row{flex-wrap:wrap;justify-content:flex-start}';
 document.head.append(style);
}
function init(){
 const meta=readMeta();
 if(!meta.firstSeen)writeMeta({firstSeen:now()});
 addStyles();wrapExport();render();
 setTimeout(()=>run(false),4000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')run(false);else render();});
}
/* Status for Layout B's Datensicherung (no DOM). */
function status(){
 const meta=readMeta(),a=native(),folder=folderName(),at=now();
 return {native:!!a,folder,active:!!(a&&folder),pending,lastError,
  lastAuto:Number(meta.lastAuto)||0,lastManual:Number(meta.lastManual)||0,lastBackup:lastBackup(meta),
  hasData:hasData(appState()),reminder:needsReminder(meta,at,!!folder,hasData(appState())),text:statusText(),formatTime};
}
function chooseFolder(){const a=native();if(a)a.chooseBackupFolder();return !!a;}
function clearFolder(){const a=native();if(a&&typeof a.clearBackupFolder==='function')a.clearBackupFolder();return !!a;}
function snooze(){writeMeta({snoozeUntil:now()+SNOOZE});renderReminder();render();}
window.ForgeAutoBackup={run,render,shouldRun,needsReminder,fingerprint,fileName,META_KEY,MIN_GAP,REMIND_AFTER,status,chooseFolder,clearFolder,snooze};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
