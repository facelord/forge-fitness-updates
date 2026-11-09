/* FORGE: one original, user-approved muscle / start / end / tips board
 * per exercise. Generated from FORGE-KRAFT-TAFELN-QA.json. Offline-safe.
 */
(function(){
'use strict';
const boards={"Beinstrecker":"./strength-boards/beinstrecker.webp?v12=7ef3894923c9a6f2","Abduktorenmaschine":"./strength-boards/abduktorenmaschine.webp?v12=85b76542926ca4b0","Adduktorenmaschine":"./strength-boards/adduktorenmaschine.webp?v12=fb122c8993be528e","Einbeiniges rumänisches Kreuzheben":"./strength-boards/einbeiniges-rdl.webp?v12=5f9729cf7818c69a","Brustpresse":"./strength-boards/brustpresse.webp?v12=d4d80a8e84d37c3d","Butterfly / Pec Deck":"./strength-boards/butterfly-pec-deck.webp?v12=e14979eb84115592","Kabel-Flys":"./strength-boards/kabel-flys.webp?v12=223d8b8b244723d6","Einarmiges Kurzhantelrudern":"./strength-boards/einarmiges-kurzhantelrudern.webp?v12=b8ba643c83a7cbff","Brustgestütztes Rudern":"./strength-boards/brustgestuetztes-rudern.webp?v12=ff18983f395d219a","Gerade-Arme-Pulldown":"./strength-boards/gerade-arme-pulldown.webp?v12=22357764ac6fff59","Arnold Press":"./strength-boards/arnold-press.webp?v12=fa414b678cd9a37b","Schulter-Außenrotation":"./strength-boards/schulter-aussenrotation.webp?v12=ead500c656323caf","Hammer Curls":"./strength-boards/hammer-curls.webp?v12=c3ce4d73f44275a6","Überkopf-Trizepsstrecken":"./strength-boards/ueberkopf-trizepsstrecken.webp?v12=6aeb804e4d6e7907","Hip Thrust":"./strength-boards/hip-thrust.webp?v12=5a7b22cbc7b1aabd","Back Extensions":"./strength-boards/back-extensions.webp?v12=f4b066321f4a975b","Farmer's Carry":"./strength-boards/farmers-carry.webp?v12=589b4ce5ee78e724","Pallof Press":"./strength-boards/pallof-press.webp?v12=1a26cd35b743b4f5","Dead Bug":"./strength-boards/dead-bug.webp?v12=d57b6817ac868764","Bird Dog":"./strength-boards/bird-dog.webp?v12=aa328c9aecf6c0c4","Bankdrücken":"./strength-boards/bankdruecken.webp?v12=e4d9f5fc544457d0","Schrägbank Kurzhantel":"./strength-boards/schraegbank-kurzhantel.webp?v12=3bc18228238b0d59","Schulterdrücken":"./strength-boards/schulterdruecken.webp?v12=10b6f9862f98e9c4","Seitheben":"./strength-boards/seitheben.webp?v12=6f1074396a27dbbc","Trizepsdrücken":"./strength-boards/trizepsdruecken.webp?v12=5e0d359d93601795","Latziehen":"./strength-boards/latziehen.webp?v12=31e4c26f3c55e530","Rudern am Kabel":"./strength-boards/rudern-am-kabel.webp?v12=21a23c279113058b","Face Pulls":"./strength-boards/face-pulls.webp?v12=e509a82631cb6763","Bizepscurls":"./strength-boards/bizepscurls.webp?v12=6ae7ef6b93a8e449","Reverse Flys":"./strength-boards/reverse-flys.webp?v12=a1fb0062a1b94f50","Kniebeuge":"./strength-boards/kniebeuge.webp?v12=ea3395e173aaf910","Beinpresse":"./strength-boards/beinpresse.webp?v12=fee9afec79ee5a61","Rumänisches Kreuzheben":"./strength-boards/rumaenisches-kreuzheben.webp?v12=7ad65803f5d5c820","Beinbeuger":"./strength-boards/beinbeuger.webp?v12=eda24e21bee87954","Wadenheben":"./strength-boards/wadenheben.webp?v12=8be569a4ef37c187","Ausfallschritte":"./strength-boards/ausfallschritte.webp?v12=ae3f50740f0dea2b","Liegestütze":"./strength-boards/liegestuetze.webp?v12=b61d3344cd453bc7","Pike Push-ups":"./strength-boards/pike-push-ups.webp?v12=66913dc01c0c90c2","Enge Liegestütze":"./strength-boards/enge-liegestuetze.webp?v12=6a395f2c3a8aef34","Plank":"./strength-boards/plank.webp?v12=0ad2972c2ecc99c3","Superman Hold":"./strength-boards/superman-hold.webp?v12=98f782e27a506f44","Glute Bridge":"./strength-boards/glute-bridge.webp?v12=b997d902210ba9e9","Rudern mit Rucksack":"./strength-boards/rudern-mit-rucksack.webp?v12=239c5fe799c91900","Reverse Snow Angels":"./strength-boards/reverse-snow-angels.webp?v12=627225b8b6f8dbf1","Kreuzheben":"./strength-boards/kreuzheben-langhantel.webp?v12=5f209ed54fb855c4","Klimmzüge":"./strength-boards/klimmzuege-obergriff.webp?v12=3dcde0028088c4b6","Dips":"./strength-boards/dips-am-barren.webp?v12=96d65ad27326859d","Schulterdrücken mit der Langhantel":"./strength-boards/schulterdruecken-langhantel.webp?v12=f2cd475fdd178518","Hängendes Knieheben":"./strength-boards/haengendes-knieheben.webp?v12=456b5f01682dd071","Bulgarian Split Squat":"./strength-boards/bulgarian-split-squat.webp?v12=77a39f2503a3731d","Kabel-Crunches":"./strength-boards/kabel-crunches.webp?v12=4247eb8919c0d38e","Bizepscurls mit Rucksack":"./strength-boards/bizepscurls-mit-rucksack.webp?v12=fef9970efb9c67c8"};
const aliases=Object.freeze({
 "Kreuzheben mit der Langhantel":"Kreuzheben","Klimmzüge mit Obergriff":"Klimmzüge",
 "Dips am Barren":"Dips","Kabel-Crunches am Seilzug":"Kabel-Crunches",
 "Kniebeugen":"Kniebeuge","Bizeps Curls":"Bizepscurls","Bizeps-Curls":"Bizepscurls",
 "Rudern am Kabelzug":"Rudern am Kabel","Rudern am Kabelzug (sitzend)":"Rudern am Kabel",
 "Dips (Trizepsfokus)":"Dips","Dips (Trizeps-Fokus)":"Dips",
 "Dips - Trizeps-Fokus":"Dips","Dips – Trizeps-Fokus":"Dips",
 "Klimmzüge (breiter Griff)":"Klimmzüge","Klimmzüge (enger Griff)":"Klimmzüge"
});
const catalogExtras=Object.freeze([{"name":"Schulterdrücken mit der Langhantel","place":"gym","sets":3,"reps":8,"group":"Schultern & Trizeps","zones":["shoulders","triceps"],"steps":["Stehe mit festem Stand und spanne den Rumpf an.","Halte die Langhantel auf Schulterhöhe und drücke sie kontrolliert über Kopf.","Senke die Hantel langsam zurück zur oberen Brust."],"tip":"Kein Hohlkreuz; Rippen unten halten und die Stange kontrolliert führen."},{"name":"Hängendes Knieheben","place":"gym","sets":3,"reps":12,"group":"Bauch & Core","zones":["core"],"steps":["Hänge mit gestreckten Armen an einer festen Klimmzugstange.","Ziehe die Knie ohne Schwung kontrolliert in Richtung Brust.","Senke die Beine langsam wieder ab."],"tip":"Becken bewusst einrollen, nicht aus dem Schwung arbeiten."},{"name":"Bulgarian Split Squat","place":"gym","sets":3,"reps":10,"group":"Beine & Gesäß","zones":["quads","glutes","hamstrings"],"steps":["Stelle das hintere Bein auf einer stabilen Bank ab.","Beuge das vordere Knie kontrolliert und halte das Becken stabil.","Drücke dich über das vordere Bein wieder hoch und wechsle die Seite."],"tip":"Erst eine stabile Haltung finden, dann Gewicht ergänzen."},{"name":"Kabel-Crunches","place":"gym","sets":3,"reps":12,"group":"Bauch & Core","zones":["core"],"steps":["Knie vor dem hohen Kabelzug und halte das Seil an den Kopfseiten.","Rolle den Oberkörper aus den Bauchmuskeln nach unten ein.","Kehre langsam und kontrolliert in die Ausgangsposition zurück."],"tip":"Arme und Hüfte möglichst ruhig halten; die Bewegung kommt aus dem Bauch."}]);
const allStrength=Object.freeze(["Abduktorenmaschine","Adduktorenmaschine","Arnold Press","Ausfallschritte","Back Extensions","Bankdrücken","Beinbeuger","Beinpresse","Beinstrecker","Bird Dog","Bizepscurls","Bizepscurls mit Rucksack","Brustgestütztes Rudern","Brustpresse","Bulgarian Split Squat","Butterfly / Pec Deck","Dead Bug","Dips","Dips (Trizepsfokus)","Dips am Barren","Einarmiges Kurzhantelrudern","Einbeiniges rumänisches Kreuzheben","Enge Liegestütze","Face Pulls","Farmer's Carry","Gerade-Arme-Pulldown","Glute Bridge","Hammer Curls","Hip Thrust","Hängendes Knieheben","Kabel-Crunches","Kabel-Crunches am Seilzug","Kabel-Flys","Klimmzüge","Klimmzüge (breiter Griff)","Klimmzüge (enger Griff)","Klimmzüge mit Obergriff","Kniebeuge","Kniebeugen","Kreuzheben","Kreuzheben mit der Langhantel","Latziehen","Liegestütze","Pallof Press","Pike Push-ups","Plank","Reverse Flys","Reverse Snow Angels","Rudern am Kabel","Rudern mit Rucksack","Rumänisches Kreuzheben","Schrägbank Kurzhantel","Schulter-Außenrotation","Schulterdrücken","Schulterdrücken mit der Langhantel","Seitheben","Superman Hold","Trizepsdrücken","Wadenheben","Überkopf-Trizepsstrecken"]);
const strengthSet=new Set(allStrength);
const normalized=x=>String(x||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
const aliasIndex=new Map(Object.entries(aliases).map(([k,v])=>[normalized(k),v]));
const canonicalNames=new Map(Object.keys(boards).map(name=>[normalized(name),name]));
const canonical=name=>aliasIndex.get(normalized(name))||canonicalNames.get(normalized(name))||name;
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
  '</figure></div>'+(normalized(name)===normalized('Klimmzüge (enger Griff)')?'<p class="forge-v12-variant-note">Technikbild zeigt den Obergriff mit breiterer Griffweite. Für den engen Griff gibt es noch keine eigene Übungstafel.</p>':'');
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
 pendingNames:Object.freeze(allStrength.filter(name=>!has(name))),canonical,render,has,isStrength,
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
 '.forge-v12-variant-note{margin:5px 0 10px;font-size:12px;color:#d8f1d2;padding:7px 9px;border-left:2px solid #9eff00;background:#101c13}',
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
