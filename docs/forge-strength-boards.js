/* FORGE: one original, user-approved muscle / start / end / tips board
 * per exercise. Generated from FORGE-KRAFT-TAFELN-QA.json. Offline-safe.
 */
(function(){
'use strict';
const boards={"Beinstrecker":"./strength-boards/beinstrecker.webp","Abduktorenmaschine":"./strength-boards/abduktorenmaschine.webp","Adduktorenmaschine":"./strength-boards/adduktorenmaschine.webp","Einbeiniges rumänisches Kreuzheben":"./strength-boards/einbeiniges-rdl.webp","Brustpresse":"./strength-boards/brustpresse.svg","Butterfly / Pec Deck":"./strength-boards/butterfly-pec-deck.svg","Kabel-Flys":"./strength-boards/kabel-flys.svg","Einarmiges Kurzhantelrudern":"./strength-boards/einarmiges-kurzhantelrudern.svg","Brustgestütztes Rudern":"./strength-boards/brustgestuetztes-rudern.svg","Gerade-Arme-Pulldown":"./strength-boards/gerade-arme-pulldown.svg","Arnold Press":"./strength-boards/arnold-press.svg","Schulter-Außenrotation":"./strength-boards/schulter-aussenrotation.svg"};
const allStrength=Object.freeze(["Abduktorenmaschine","Adduktorenmaschine","Arnold Press","Ausfallschritte","Back Extensions","Bankdrücken","Beinbeuger","Beinpresse","Beinstrecker","Bird Dog","Bizepscurls","Bizepscurls mit Rucksack","Brustgestütztes Rudern","Brustpresse","Butterfly / Pec Deck","Dead Bug","Dips","Dips (Trizepsfokus)","Einarmiges Kurzhantelrudern","Einbeiniges rumänisches Kreuzheben","Enge Liegestütze","Face Pulls","Farmer's Carry","Gerade-Arme-Pulldown","Glute Bridge","Hammer Curls","Hip Thrust","Kabel-Flys","Klimmzüge","Klimmzüge (breiter Griff)","Klimmzüge (enger Griff)","Kniebeuge","Kniebeugen","Kreuzheben","Latziehen","Liegestütze","Pallof Press","Pike Push-ups","Plank","Reverse Flys","Reverse Snow Angels","Rudern am Kabel","Rudern mit Rucksack","Rumänisches Kreuzheben","Schrägbank Kurzhantel","Schulter-Außenrotation","Schulterdrücken","Seitheben","Superman Hold","Trizepsdrücken","Wadenheben","Überkopf-Trizepsstrecken"]);
const strengthSet=new Set(allStrength);
const isStrength=name=>strengthSet.has(name);
const has=name=>Object.prototype.hasOwnProperty.call(boards,name);
const previousExercise=window.forgeExerciseIllustrations;
const previousCatalog=window.forgePublicExercisePictures;
const safe=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(name){
 const file=Object.prototype.hasOwnProperty.call(boards,name)?boards[name]:null;
 if(!file)return '';
 return '<div class="forge-strength-board" data-forge-strength-board="'+safe(name)+'">'+
  '<figure class="forge-strength-board-figure"><img class="forge-strength-board-image"'+
  ' data-forge-strength-board-image="1" src="'+file+'" role="button" tabindex="0"'+
  ' loading="lazy" decoding="async" alt="'+safe(name)+' – Muskeln, Startposition, Endposition, Ausführung und Tipps. Zum Vergrößern tippen." />'+
  '<figcaption>Gesamte Übungsübersicht ansehen · Zum Vergrößern tippen</figcaption>'+
  '</figure></div>';
}
window.forgeExerciseIllustrations=name=>isStrength(name)?render(name):
 (typeof previousExercise==='function'?previousExercise(name):'');
window.forgePublicExercisePictures=name=>isStrength(name)?render(name):
 (typeof previousCatalog==='function'?previousCatalog(name):'');
window.ForgeStrengthBoards=Object.freeze({names:Object.keys(boards),allStrengthNames:allStrength,
 pendingNames:Object.freeze(allStrength.filter(name=>!has(name))),render,has,isStrength,
 isPending:name=>isStrength(name)&&!has(name)});
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
