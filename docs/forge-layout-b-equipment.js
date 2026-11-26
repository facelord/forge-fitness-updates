/* FORGE Layout B · Geräte & Hilfsmittel für Training zuhause (#70, 20.11.2026).
 * „Zuhause“ heißt nicht mehr automatisch „nur Körpergewicht“: Wer Kurzhanteln,
 * Bank, Bänder, Klimmzugstange usw. hat, bekommt im automatischen Plan passende
 * Übungen aus dem bestehenden Katalog – nie eine Übung, für die ein Gerät fehlt.
 * Gym-Einheiten, bestehende Pläne und Trainingsprotokolle bleiben unverändert.
 * Daten: state.forgeHomeEquipment={items:[...],updatedAt}; state.settings.homeEquipment (Plan-Bezug).
 */
(function(){
'use strict';
const OPTIONS=Object.freeze([
 ['dumbbells','Kurzhanteln'],['barbell','Langhantel + Gewichte'],['bench','Trainingsbank'],['band','Widerstandsbänder / Theraband'],
 ['pullupbar','Klimmzugstange'],['dipbars','Dip-Barren'],['cable','Kabelzug / Turm'],['machine','Kraftstation / Multigym'],
 ['kettlebell','Kettlebell'],['mat','Fitnessmatte']]);
const KEYS=Object.freeze(OPTIONS.map(o=>o[0]));
/* Im Katalog gibt es (noch) keine Übung, die diese Geräte zwingend braucht. */
const NO_EXERCISES=Object.freeze(['kettlebell','mat']);
/* Erforderliche Geräte je Katalogübung ([] = ohne Geräte machbar). Unbekannte Namen: null. */
const REQ=(()=>{const m=Object.create(null);const set=(req,names)=>names.forEach(n=>{m[n]=req;});
 set([],['Liegestütze','Enge Liegestütze','Pike Push-ups','Plank','Kniebeugen','Ausfallschritte','Glute Bridge','Wadenheben','Superman Hold','Reverse Snow Angels',
  'Rudern mit Rucksack','Bizepscurls mit Rucksack','Burpees','Hampelmann','Bergsteiger','Bird Dog','Dead Bug','Einbeiniges rumänisches Kreuzheben','Bulgarian Split Squat','Plank Jacks','Bear Plank Knee Taps','Spiderman Planks','Cross-Body Mountain Climbers','Russian Twist','Plank Hip Twists']);
 set(['dumbbells'],['Bizepscurls','Hammer Curls','Seitheben','Arnold Press','Schulterdrücken','Überkopf-Trizepsstrecken','Einarmiges Kurzhantelrudern','Reverse Flys',"Farmer's Carry"]);
 set(['dumbbells','bench'],['Schrägbank Kurzhantel','Kurzhantel-Flys']);
 set(['barbell'],['Kniebeuge','Kreuzheben','Rumänisches Kreuzheben','Schulterdrücken mit der Langhantel']);
 set(['barbell','bench'],['Bankdrücken','Negatives Bankdrücken','Hip Thrust','Skull Crushers mit SZ-Stange']);
 set(['pullupbar'],['Klimmzüge','Klimmzüge (breiter Griff)','Klimmzüge (enger Griff)','Hängendes Knieheben']);
 set(['dipbars'],['Dips','Dips (Trizepsfokus)']);
 set(['band'],['Band-Brustpresse','Band-Rudern','Pull-Aparts mit Theraband','Band-Kniebeuge mit Theraband','Monster Walks mit Miniband','Face Pulls mit Theraband',
  'Band-Seitheben mit Theraband','Bizeps-Curls mit Theraband','Band-Trizepsdrücken mit Theraband','Band-Pallof-Press']);
 set(['cable'],['Latziehen','Rudern am Kabel','Face Pulls','Trizepsdrücken','Kabel-Flys','Kabel-Crunches','Gerade-Arme-Pulldown','Pallof Press','Schulter-Außenrotation']);
 set(['machine'],['Beinpresse','Beinstrecker','Beinbeuger','Brustpresse','Butterfly / Pec Deck','Abduktorenmaschine','Adduktorenmaschine','Brustgestütztes Rudern','Back Extensions']);
 return Object.freeze(m);})();
/* Zuhause-Grundübung → bessere Variante, sobald die Geräte da sind (Reihenfolge = Vorrang). */
const UPGRADE=Object.freeze({
 'Kniebeugen':[['Kniebeuge',['barbell']],['Band-Kniebeuge mit Theraband',['band']]],
 'Ausfallschritte':[['Bulgarian Split Squat',['bench']]],
 'Glute Bridge':[['Hip Thrust',['barbell','bench']]],
 'Liegestütze':[['Bankdrücken',['barbell','bench']],['Schrägbank Kurzhantel',['dumbbells','bench']],['Brustpresse',['machine']],['Band-Brustpresse',['band']]],
 'Enge Liegestütze':[['Dips (Trizepsfokus)',['dipbars']],['Trizepsdrücken',['cable']],['Überkopf-Trizepsstrecken',['dumbbells']],['Band-Trizepsdrücken mit Theraband',['band']]],
 'Rudern mit Rucksack':[['Einarmiges Kurzhantelrudern',['dumbbells']],['Rudern am Kabel',['cable']],['Brustgestütztes Rudern',['machine']],['Band-Rudern',['band']]],
 'Reverse Snow Angels':[['Klimmzüge',['pullupbar']],['Latziehen',['cable']],['Pull-Aparts mit Theraband',['band']]],
 'Pike Push-ups':[['Schulterdrücken',['dumbbells']],['Schulterdrücken mit der Langhantel',['barbell']],['Band-Seitheben mit Theraband',['band']]],
 'Bizepscurls mit Rucksack':[['Bizepscurls',['dumbbells']],['Bizeps-Curls mit Theraband',['band']]]
});
function clean(items){return [...new Set((Array.isArray(items)?items:[]).filter(k=>KEYS.includes(k)))];}
function required(name){const r=REQ[String(name||'')];return r?r.slice():null;}
/* true = machbar, false = Gerät fehlt, null = unbekannte (eigene) Übung → nicht blockieren. */
function fits(name,items){const r=REQ[String(name||'')];if(!r)return null;const have=clean(items);return r.every(k=>have.includes(k));}
function missing(name,items){const r=REQ[String(name||'')]||[];const have=clean(items);return r.filter(k=>!have.includes(k));}
function label(k){const o=OPTIONS.find(x=>x[0]===k);return o?o[1]:k;}
function summary(items){const c=clean(items);return c.length?c.map(label).join(', '):'Nur Körpergewicht';}
/* Eine Zuhause-Einheit an die Geräte anpassen (pure). defaults(name) liefert {sets,reps}. */
function adaptUnit(unit,items,defaults){
 const have=clean(items);
 const ex=(unit&&Array.isArray(unit.ex)?unit.ex:[]).map(e=>({...e}));
 const used=new Set(ex.map(e=>e.name));
 const out=ex.map(e=>{
  const ups=UPGRADE[e.name]||[];
  for(const [name,req] of ups){
   if(used.has(name)||!req.every(k=>have.includes(k)))continue;
   used.delete(e.name);used.add(name);
   const d=typeof defaults==='function'?defaults(name):null;
   const next={...e,name};if(d&&Number(d.sets))next.sets=Number(d.sets);if(d&&d.reps!=null)next.reps=d.reps;
   delete next.unit;return next;
  }
  // Nie eine Übung behalten, für die ein Gerät fehlt.
  if(fits(e.name,have)===false){
   const alt=Object.entries(UPGRADE).find(([base,list])=>list.some(([n])=>n===e.name));
   if(alt&&!used.has(alt[0])){used.delete(e.name);used.add(alt[0]);const d=typeof defaults==='function'?defaults(alt[0]):null;return {...e,name:alt[0],...(d?{sets:Number(d.sets)||e.sets,reps:d.reps}:{})};}
  }
  return e;
 });
 return {...unit,ex:out};
}
function adaptPlan(plan,items,defaults){return (Array.isArray(plan)?plan:[]).map(u=>u&&u.location==='home'?adaptUnit(u,items,defaults):u);}
/* Gespeicherte Auswahl (Profil) – nur lesen/schreiben, wenn der App-Zustand existiert. */
const S=()=>{try{return typeof state!=='undefined'?state:null;}catch(e){return null;}};
function saved(){const s=S();return clean(s&&s.forgeHomeEquipment&&s.forgeHomeEquipment.items);}
function hasSaved(){const s=S();return !!(s&&s.forgeHomeEquipment&&Array.isArray(s.forgeHomeEquipment.items));}
function remember(items){const s=S();if(!s)return;s.forgeHomeEquipment={items:clean(items),updatedAt:new Date().toISOString()};}
window.ForgeHomeEquipment=Object.freeze({OPTIONS,KEYS,NO_EXERCISES,REQ,UPGRADE,clean,required,fits,missing,label,summary,adaptUnit,adaptPlan,saved,hasSaved,remember});
})();
