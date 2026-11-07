/* FORGE: one original, user-approved muscle / start / end / tips board
 * per exercise. Generated from FORGE-KRAFT-TAFELN-QA.json. Offline-safe.
 */
(function(){
'use strict';
const boards={"Beinstrecker":"./strength-boards/beinstrecker.webp","Abduktorenmaschine":"./strength-boards/abduktorenmaschine.webp","Adduktorenmaschine":"./strength-boards/adduktorenmaschine.webp","Einbeiniges rumänisches Kreuzheben":"./strength-boards/einbeiniges-rdl.webp","Brustpresse":"./strength-boards/brustpresse.svg","Butterfly / Pec Deck":"./strength-boards/butterfly-pec-deck.svg","Kabel-Flys":"./strength-boards/kabel-flys.svg","Einarmiges Kurzhantelrudern":"./strength-boards/einarmiges-kurzhantelrudern.svg","Brustgestütztes Rudern":"./strength-boards/brustgestuetztes-rudern.svg","Gerade-Arme-Pulldown":"./strength-boards/gerade-arme-pulldown.svg","Arnold Press":"./strength-boards/arnold-press.svg","Schulter-Außenrotation":"./strength-boards/schulter-aussenrotation.svg","Hammer Curls":"./strength-boards/hammer-curls.svg","Überkopf-Trizepsstrecken":"./strength-boards/ueberkopf-trizepsstrecken.svg","Hip Thrust":"./strength-boards/hip-thrust.svg","Back Extensions":"./strength-boards/back-extensions.svg","Farmer's Carry":"./strength-boards/farmers-carry.svg","Pallof Press":"./strength-boards/pallof-press.svg","Dead Bug":"./strength-boards/dead-bug.svg","Bird Dog":"./strength-boards/bird-dog.svg","Bankdrücken":"./strength-boards/bankdruecken.webp","Schrägbank Kurzhantel":"./strength-boards/schraegbank-kurzhantel.webp","Schulterdrücken":"./strength-boards/schulterdruecken.webp","Seitheben":"./strength-boards/seitheben.webp","Trizepsdrücken":"./strength-boards/trizepsdruecken.webp","Latziehen":"./strength-boards/latziehen.webp","Rudern am Kabel":"./strength-boards/rudern-am-kabel.webp","Face Pulls":"./strength-boards/face-pulls.webp","Bizepscurls":"./strength-boards/bizepscurls.webp","Reverse Flys":"./strength-boards/reverse-flys.webp","Kniebeuge":"./strength-boards/kniebeuge.webp","Beinpresse":"./strength-boards/beinpresse.webp","Rumänisches Kreuzheben":"./strength-boards/rumaenisches-kreuzheben.webp","Beinbeuger":"./strength-boards/beinbeuger.webp","Wadenheben":"./strength-boards/wadenheben.webp","Ausfallschritte":"./strength-boards/ausfallschritte.webp","Liegestütze":"./strength-boards/liegestuetze.webp","Pike Push-ups":"./strength-boards/pike-push-ups.webp","Enge Liegestütze":"./strength-boards/enge-liegestuetze.webp","Plank":"./strength-boards/plank.webp","Superman Hold":"./strength-boards/superman-hold.webp","Glute Bridge":"./strength-boards/glute-bridge.webp","Rudern mit Rucksack":"./strength-boards/rudern-mit-rucksack.webp","Reverse Snow Angels":"./strength-boards/reverse-snow-angels.webp","Kreuzheben":"./strength-boards/kreuzheben-langhantel.webp","Klimmzüge":"./strength-boards/klimmzuege-obergriff.webp","Dips":"./strength-boards/dips-am-barren.webp","Schulterdrücken mit der Langhantel":"./strength-boards/schulterdruecken-langhantel.webp","Hängendes Knieheben":"./strength-boards/haengendes-knieheben.webp","Bulgarian Split Squat":"./strength-boards/bulgarian-split-squat.webp","Kabel-Crunches":"./strength-boards/kabel-crunches.webp","Bizepscurls mit Rucksack":"./strength-boards/bizepscurls-mit-rucksack.webp"};
const aliases=Object.freeze({"Kreuzheben mit der Langhantel":"Kreuzheben","Klimmzüge mit Obergriff":"Klimmzüge","Dips am Barren":"Dips","Kabel-Crunches am Seilzug":"Kabel-Crunches"});
const catalogExtras=Object.freeze([{"name":"Schulterdrücken mit der Langhantel","place":"gym","sets":3,"reps":8,"group":"Schultern & Trizeps","zones":["shoulders","triceps"],"steps":["Stehe mit festem Stand und spanne den Rumpf an.","Halte die Langhantel auf Schulterhöhe und drücke sie kontrolliert über Kopf.","Senke die Hantel langsam zurück zur oberen Brust."],"tip":"Kein Hohlkreuz; Rippen unten halten und die Stange kontrolliert führen."},{"name":"Hängendes Knieheben","place":"gym","sets":3,"reps":12,"group":"Bauch & Core","zones":["core"],"steps":["Hänge mit gestreckten Armen an einer festen Klimmzugstange.","Ziehe die Knie ohne Schwung kontrolliert in Richtung Brust.","Senke die Beine langsam wieder ab."],"tip":"Becken bewusst einrollen, nicht aus dem Schwung arbeiten."},{"name":"Bulgarian Split Squat","place":"gym","sets":3,"reps":10,"group":"Beine & Gesäß","zones":["quads","glutes","hamstrings"],"steps":["Stelle das hintere Bein auf einer stabilen Bank ab.","Beuge das vordere Knie kontrolliert und halte das Becken stabil.","Drücke dich über das vordere Bein wieder hoch und wechsle die Seite."],"tip":"Erst eine stabile Haltung finden, dann Gewicht ergänzen."},{"name":"Kabel-Crunches","place":"gym","sets":3,"reps":12,"group":"Bauch & Core","zones":["core"],"steps":["Knie vor dem hohen Kabelzug und halte das Seil an den Kopfseiten.","Rolle den Oberkörper aus den Bauchmuskeln nach unten ein.","Kehre langsam und kontrolliert in die Ausgangsposition zurück."],"tip":"Arme und Hüfte möglichst ruhig halten; die Bewegung kommt aus dem Bauch."}]);
const allStrength=Object.freeze(["Abduktorenmaschine","Adduktorenmaschine","Arnold Press","Ausfallschritte","Back Extensions","Bankdrücken","Beinbeuger","Beinpresse","Beinstrecker","Bird Dog","Bizepscurls","Bizepscurls mit Rucksack","Brustgestütztes Rudern","Brustpresse","Bulgarian Split Squat","Butterfly / Pec Deck","Dead Bug","Dips","Dips (Trizepsfokus)","Dips am Barren","Einarmiges Kurzhantelrudern","Einbeiniges rumänisches Kreuzheben","Enge Liegestütze","Face Pulls","Farmer's Carry","Gerade-Arme-Pulldown","Glute Bridge","Hammer Curls","Hip Thrust","Hängendes Knieheben","Kabel-Crunches","Kabel-Crunches am Seilzug","Kabel-Flys","Klimmzüge","Klimmzüge (breiter Griff)","Klimmzüge (enger Griff)","Klimmzüge mit Obergriff","Kniebeuge","Kniebeugen","Kreuzheben","Kreuzheben mit der Langhantel","Latziehen","Liegestütze","Pallof Press","Pike Push-ups","Plank","Reverse Flys","Reverse Snow Angels","Rudern am Kabel","Rudern mit Rucksack","Rumänisches Kreuzheben","Schrägbank Kurzhantel","Schulter-Außenrotation","Schulterdrücken","Schulterdrücken mit der Langhantel","Seitheben","Superman Hold","Trizepsdrücken","Wadenheben","Überkopf-Trizepsstrecken"]);
const strengthSet=new Set(allStrength);
const canonical=name=>Object.prototype.hasOwnProperty.call(aliases,name)?aliases[name]:name;
const has=name=>Object.prototype.hasOwnProperty.call(boards,canonical(name));
const isStrength=name=>strengthSet.has(name)||has(name);
const previousExercise=window.forgeExerciseIllustrations;
const previousCatalog=window.forgePublicExercisePictures;
const previousMuscleMap=window.forgeMuscleMap;
const safe=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(name){
 const file=has(name)?boards[canonical(name)]:null;
 if(!file)return '';
 return '<div class="forge-strength-board" data-forge-strength-board="'+safe(name)+'">'+
  '<figure class="forge-strength-board-figure"><img class="forge-strength-board-image"'+
  ' data-forge-strength-board-image="1" src="'+file+'" role="button" tabindex="0"'+
  ' loading="lazy" decoding="async" alt="'+safe(name)+' – Muskeln, Startposition, Endposition, Ausführung und Tipps. Zum Vergrößern tippen." />'+
  '<figcaption>Gesamte Übungsübersicht ansehen · Zum Vergrößern tippen</figcaption>'+
  '</figure></div>';
}
function registerExtraExercises(){
 const list=(typeof FORGE_131_EXERCISES!=='undefined'&&Array.isArray(FORGE_131_EXERCISES))?FORGE_131_EXERCISES:window.FORGE_131_EXERCISES;
 if(!Array.isArray(list))return;
 const known=new Set(list.map(e=>e.name));
 for(const e of catalogExtras){
  if(!known.has(e.name)){list.push({name:e.name,type:e.place,sets:e.sets,reps:e.reps,group:e.group});known.add(e.name);}
  if(typeof FORGE_MUSCLE_ZONES!=='undefined')FORGE_MUSCLE_ZONES[e.name]=e.zones;
  else if(window.FORGE_MUSCLE_ZONES)window.FORGE_MUSCLE_ZONES[e.name]=e.zones;
  if(typeof FORGE_STRENGTH_GUIDES!=='undefined')FORGE_STRENGTH_GUIDES[e.name]=[e.group,...e.steps,e.tip];
  else if(window.FORGE_STRENGTH_GUIDES)window.FORGE_STRENGTH_GUIDES[e.name]=[e.group,...e.steps,e.tip];
 }
}
registerExtraExercises();
document.addEventListener('forge:mobility-ready',registerExtraExercises,{once:true});
window.forgeExerciseIllustrations=name=>isStrength(name)?render(name):
 (typeof previousExercise==='function'?previousExercise(name):'');
window.forgePublicExercisePictures=name=>isStrength(name)?render(name):
 (typeof previousCatalog==='function'?previousCatalog(name):'');
window.ForgeStrengthBoards=Object.freeze({names:Object.keys(boards),allStrengthNames:allStrength,
 pendingNames:Object.freeze(allStrength.filter(name=>!has(name))),render,has,isStrength,
 isPending:name=>isStrength(name)&&!has(name)});
// A complete approved board already contains the anatomy. Do not append the old,
// oversized 'Beanspruchte Muskelgruppen' accordion below it in the catalogue.
// Keep the original map available for mobility and exercises without an approved board.
if(typeof previousMuscleMap==='function'){
 window.forgeMuscleMap=function(name){
  return has(name)?'':previousMuscleMap.apply(this,arguments);
 };
}
function style(){
 if(document.getElementById('forge-strength-board-styles'))return;
 const tag=document.createElement('style');
 tag.id='forge-strength-board-styles';
 tag.textContent=[
 '.forge-strength-board{display:block!important;width:100%;min-width:0;max-width:100%;margin:8px 0 12px}',
 '.forge-strength-board-figure{display:block!important;min-width:0;margin:0!important;overflow:hidden;border-radius:14px;background:#020908;border:1px solid #315432}',
 '.forge-strength-board-image{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:1448/1086!important;object-fit:contain!important;object-position:center!important;cursor:zoom-in}',
 '.forge-strength-board-image:focus-visible{outline:3px solid #9eff00;outline-offset:-3px}',
 '.forge-strength-board-figure figcaption{margin:0;padding:7px 9px 9px!important;font-size:12px;text-align:center;color:#ddf9d4;background:#0b1510}',
 '#workout.forge-premium-layout #forgePremiumHero .forge-b-main-photo.forge-strength-board-hero{mask-image:none!important;-webkit-mask-image:none!important;background:#030b08!important}',
 '#workout.forge-premium-layout #forgePremiumHero .forge-b-main-photo.forge-strength-board-hero img.forge-b-photo{filter:none!important;object-fit:contain!important;object-position:center!important;cursor:zoom-in}',
 '#workout.forge-premium-layout #forgePremiumHero .forge-b-main-photo.forge-strength-board-hero ~ .forge-b-media-shade{pointer-events:none!important}'
 ].join('\n');
 document.head.append(tag);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',style,{once:true});
else style();
})();
