/* FORGE safety block: validated, reversible backup import with pre-import recovery.
 * Uses existing normalizeBackup(), save(), load(), render() and the original state.
 * Nothing is uploaded; the emergency copy is device-local and not a cloud backup.
 */
(function(){
'use strict';
const RECOVERY_KEY='forge-preimport-recovery-v1';
const MAX_BYTES=20*1024*1024;
function unwrap(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 if(['plan','workouts','foods'].every(k=>Array.isArray(value[k])))return value;
 for(const key of ['state','data','backup']){
  const nested=value[key];
  if(nested&&typeof nested==='object'&&!Array.isArray(nested)&&
     ['plan','workouts','foods'].every(k=>Array.isArray(nested[k])))return nested;
 }
 return null;
}
function inspect(value) {
 const d=unwrap(value);
 if(!d)return {ok:false,error:'Keine FORGE-Trainingsdaten gefunden (plan, workouts, foods fehlen).'};
 for(const field of ['plan','workouts','foods']){
  if(d[field].length>100000||d[field].some(x=>!x||typeof x!=='object'||Array.isArray(x))){
   return {ok:false,error:'Ungültige Einträge im Bereich '+field+'.'};
  }
 }
 if(d.weights!==undefined&&!Array.isArray(d.weights))
  return {ok:false,error:'Ungültige Gewichts-Historie.'};
 return {ok:true,data:d,counts:{plans:d.plan.length,workouts:d.workouts.length,meals:d.foods.length}};
}
function recoveryAvailable(){
 try{
  const text=localStorage.getItem(RECOVERY_KEY);
  return !!(text&&inspect(JSON.parse(text)).ok);
 }catch(_){return false;}
}
function captureRecovery(){
 const snapshot=JSON.stringify(state);
 try{localStorage.setItem(RECOVERY_KEY,snapshot);return true;}
 catch(_){return false;}
}
function restoreRecovery(){
 if(typeof state==='undefined'||typeof normalizeBackup!=='function')return false;
 let result;
 try{result=inspect(JSON.parse(localStorage.getItem(RECOVERY_KEY)||'null'));}
 catch(_){result={ok:false};}
 if(!result?.ok){alert('Keine gültige lokale Wiederherstellungskopie vorhanden.');return false;}
 if(!confirm('Aktuellen FORGE-Stand durch die lokale Sicherung vor dem letzten Import ersetzen?'))return false;
 const previous=state;
 try{
  const prepared=normalizeBackup(result.data);
  state=prepared;save();
  if(typeof load==='function'&&JSON.stringify(load())!==JSON.stringify(prepared))
   throw new Error('Die wiederhergestellten Daten konnten nicht dauerhaft gespeichert werden.');
  render();
  alert('FORGE-Daten aus der Sicherung vor dem letzten Import wiederhergestellt.');
  return true;
 }catch(err){
  state=previous;save();
  try{render();}catch(_){}
  alert('Wiederherstellung fehlgeschlagen: '+String(err?.message||err));
  return false;
 }
}
async function guardedImport(event){
 const target=event?.target,file=target?.files?.[0];
 if(!file)return;
 try{
  if(typeof normalizeBackup!=='function'||typeof save!=='function'||typeof render!=='function')
   throw new Error('FORGE ist noch nicht vollständig geladen.');
  if(Number(file.size)>MAX_BYTES)throw new Error('Die Datei ist zu groß (maximal 20 MB).');
  let content;
  try{content=JSON.parse((await file.text()).replace(/^\uFEFF/,''));}
  catch(_){throw new Error('Die Datei ist kein gültiges JSON-Backup.');}
  const examination=inspect(content);
  if(!examination.ok)throw new Error(examination.error);
  const imported=normalizeBackup(examination.data);
  const description=examination.counts.workouts+' Trainings, '+
   examination.counts.plans+' Trainingstage und '+examination.counts.meals+' Mahlzeiten';
  if(!confirm('FORGE-Backup erkannt: '+description+'. Den aktuellen Stand ersetzen?'))return;
  // Never replace existing data when a recovery snapshot cannot be created.
  if(!captureRecovery())throw new Error('Es konnte keine Sicherheitskopie im lokalen Speicher erstellt werden. Bitte zuerst ein FORGE-Backup als Datei exportieren und Speicherplatz freigeben.');
  const previous=state;
  try{
   state=imported;
   save();
   if(typeof load==='function'&&JSON.stringify(load())!==JSON.stringify(imported))
    throw new Error('Import wurde im Gerätespeicher nicht bestätigt.');
   render();
  }catch(err){
   state=previous;
   save();
   try{render();}catch(_){}
   throw new Error('Der vorherige Stand wurde wiederhergestellt. '+String(err?.message||err));
  }
  alert('Import erfolgreich: '+description+'. Eine lokale Wiederherstellungskopie des vorherigen Stands ist unter Einstellungen verfügbar.');
 }catch(err){
  console.error('FORGE import validation',err);
  alert('Backup-Import abgebrochen: '+String(err?.message||err));
 }finally{if(target)target.value='';}
}
let installed=false;
window.ForgeBackupGuard=Object.freeze({unwrap,inspect,recoveryAvailable,restoreRecovery,guardedImport,isInstalled:()=>installed});
function install(){
 if(installed)return;
 if(typeof window.importData!=='function'||typeof state==='undefined'||typeof normalizeBackup!=='function')return;
 window.importData=guardedImport;
 installed=true;
}
function boot(){
 let count=0;
 const tryInit=()=>{install();if(!installed&&++count<40)setTimeout(tryInit,100);};
 tryInit();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();