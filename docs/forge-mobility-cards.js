/* FORGE verified single-card mobility visuals. 2026-10-30
 * One complete single-exercise card contains start/end poses and anatomy.
 * Only exact known mobility names are changed; all other renderers delegate.
 * Card files live in Android offline assets; no network image requests.
 */
(function(){
 'use strict';
 const verified=Object.freeze({
  "Sprunggelenk-Mobilisation an der Wand":"forge_mob_01_karte.webp",
  "Fußkreisen":"forge_mob_02_karte.webp",
  "Fußsohle mit Ball mobilisieren":"forge_mob_03_karte.webp",
  "Fersengleiten in Rückenlage":"forge_mob_04_karte.webp",
  "Beinpendel vor und zurück":"forge_mob_05_karte.webp",
  "Seitliches Beinpendel":"forge_mob_06_karte.webp",
  "Hüftkreisen im Stand":"forge_mob_07_karte.webp",
  "90/90-Vorbeuge":"forge_mob_08_karte.webp",
  "Hüftkreise im Vierfüßlerstand":"forge_mob_09_karte.webp",
  "Quadrizeps-Dehnung im Stand":"forge_mob_10_karte.webp",
  "Soleus-Dehnung mit gebeugtem Knie":"forge_mob_11_karte.webp",
  "Hamstring-Dehnung mit Gurt":"forge_mob_12_karte.webp",
  "Beckenkippen in Rückenlage":"forge_mob_13_karte.webp",
  "Beckenkreisen im Stand":"forge_mob_14_karte.webp",
  "Knie zur Brust in Rückenlage":"forge_mob_15_karte.webp",
  "Thread the Needle":"forge_mob_16_karte.webp",
  "Brustwirbelsäulenstreckung über Foam Roller":"forge_mob_17_karte.webp",
  "Schulterkreisen":"forge_mob_18_karte.webp",
  "Schulterheben mit Stab":"forge_mob_19_karte.webp",
  "Handgelenksmobilisation":"forge_mob_20_karte.webp"
 });
 const previousAtlas=window.forgeExerciseIllustrations;
 const previousPublic=window.forgePublicExercisePictures;
 let zoomInstance=0;
 const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function card(name){
  const asset=Object.prototype.hasOwnProperty.call(verified,name)?verified[name]:null;
  if(!asset)return '';
  const id='forge-mob-zoom-'+(++zoomInstance);
  return '<figure class="forge-mob-single-card" data-forge-mob-single-card="'+escapeText(name)+'">'+
   '<input class="forge-mob-zoom-toggle" type="checkbox" id="'+id+'" aria-label="Übungskarte vergrößern: '+escapeText(name)+'">'+
   '<label class="forge-mob-zoom-control" for="'+id+'">Bilddetails vergrößern · anschließend seitlich wischen</label>'+
   '<div class="forge-mob-card-scroll" role="region" tabindex="0" aria-label="Übungskarte seitlich verschiebbar">'+
   '<img loading="lazy" decoding="async" src="./mobility-cards/'+asset+'" alt="'+escapeText(name)+' – FORGE Übungskarte: Startposition, Endposition und beanspruchte Muskulatur"></div>'+
   '<figcaption>'+escapeText(name)+' · Startposition / Endposition / Muskulatur</figcaption></figure>';
 }
 window.forgeExerciseIllustrations=function(name){return Object.prototype.hasOwnProperty.call(verified,name)?card(name):(typeof previousAtlas==='function'?previousAtlas(name):'');};
 window.forgePublicExercisePictures=function(name){return Object.prototype.hasOwnProperty.call(verified,name)?card(name):(typeof previousPublic==='function'?previousPublic(name):'');};
 window.forgeMobilitySingleCards=Object.freeze({names:Object.keys(verified),card});
 function styles(){
  if(document.getElementById('forgeMobSingleCardStyle'))return;
  const style=document.createElement('style');style.id='forgeMobSingleCardStyle';
  style.textContent='.forge-mob-single-card{margin:10px 0 14px;background:#08191e;border:1px solid #47685f;border-radius:13px;overflow:hidden;max-width:100%}.forge-mob-zoom-toggle{position:absolute;opacity:0;width:1px;height:1px}.forge-mob-zoom-control{display:block;padding:9px 10px;min-height:36px;box-sizing:border-box;text-align:center;background:#153a34;color:#def5ea;font-size:12px;font-weight:700;cursor:pointer}.forge-mob-zoom-toggle:checked+.forge-mob-zoom-control{background:#127f5e;color:#fff}.forge-mob-zoom-toggle:focus-visible+.forge-mob-zoom-control{outline:2px solid #c9fce4;outline-offset:-3px}.forge-mob-card-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:thin}.forge-mob-card-scroll img{width:100%;height:auto;display:block;object-fit:contain}.forge-mob-zoom-toggle:checked~.forge-mob-card-scroll img{width:max(100%,1100px);max-width:none}.forge-mob-single-card figcaption{color:#dcece8;text-align:center;font-size:11px;font-weight:700;padding:7px 8px 9px;background:#0e2229}';
  document.head.appendChild(style);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',styles,{once:true});else styles();
})();
