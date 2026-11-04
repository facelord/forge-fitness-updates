/* FORGE mobility photos – generated at build time; do not edit.
 * Three original panels cropped from user-approved composite exercise cards.
 * Unapproved or absent image sets ALWAYS keep the original offline atlas.
 */
(function(){
'use strict';
const photoAssets={"Sprunggelenk-Mobilisation an der Wand":["./mobility-images/forge_mob_01_start.webp","./mobility-images/forge_mob_01_ende.webp","./mobility-images/forge_mob_01_muskeln.webp"],"Fußkreisen":["./mobility-images/forge_mob_02_start.webp","./mobility-images/forge_mob_02_ende.webp","./mobility-images/forge_mob_02_muskeln.webp"],"Fußsohle mit Ball mobilisieren":["./mobility-images/forge_mob_03_start.webp","./mobility-images/forge_mob_03_ende.webp","./mobility-images/forge_mob_03_muskeln.webp"],"Fersengleiten in Rückenlage":["./mobility-images/forge_mob_04_start.webp","./mobility-images/forge_mob_04_ende.webp","./mobility-images/forge_mob_04_muskeln.webp"],"Beinpendel vor und zurück":["./mobility-images/forge_mob_05_start.webp","./mobility-images/forge_mob_05_ende.webp","./mobility-images/forge_mob_05_muskeln.webp"],"Seitliches Beinpendel":["./mobility-images/forge_mob_06_start.webp","./mobility-images/forge_mob_06_ende.webp","./mobility-images/forge_mob_06_muskeln.webp"],"Hüftkreisen im Stand":["./mobility-images/forge_mob_07_start.webp","./mobility-images/forge_mob_07_ende.webp","./mobility-images/forge_mob_07_muskeln.webp"],"90/90-Vorbeuge":["./mobility-images/forge_mob_08_start.webp","./mobility-images/forge_mob_08_ende.webp","./mobility-images/forge_mob_08_muskeln.webp"],"Hüftkreise im Vierfüßlerstand":["./mobility-images/forge_mob_09_start.webp","./mobility-images/forge_mob_09_ende.webp","./mobility-images/forge_mob_09_muskeln.webp"],"Quadrizeps-Dehnung im Stand":["./mobility-images/forge_mob_10_start.webp","./mobility-images/forge_mob_10_ende.webp","./mobility-images/forge_mob_10_muskeln.webp"],"Soleus-Dehnung mit gebeugtem Knie":["./mobility-images/forge_mob_11_start.webp","./mobility-images/forge_mob_11_ende.webp","./mobility-images/forge_mob_11_muskeln.webp"],"Hamstring-Dehnung mit Gurt":["./mobility-images/forge_mob_12_start.webp","./mobility-images/forge_mob_12_ende.webp","./mobility-images/forge_mob_12_muskeln.webp"],"Beckenkippen in Rückenlage":["./mobility-images/forge_mob_13_start.webp","./mobility-images/forge_mob_13_ende.webp","./mobility-images/forge_mob_13_muskeln.webp"],"Beckenkreisen im Stand":["./mobility-images/forge_mob_14_start.webp","./mobility-images/forge_mob_14_ende.webp","./mobility-images/forge_mob_14_muskeln.webp"],"Knie zur Brust in Rückenlage":["./mobility-images/forge_mob_15_start.webp","./mobility-images/forge_mob_15_ende.webp","./mobility-images/forge_mob_15_muskeln.webp"],"Thread the Needle":["./mobility-images/forge_mob_16_start.webp","./mobility-images/forge_mob_16_ende.webp","./mobility-images/forge_mob_16_muskeln.webp"],"Brustwirbelsäulenstreckung über Foam Roller":["./mobility-images/forge_mob_17_start.webp","./mobility-images/forge_mob_17_ende.webp","./mobility-images/forge_mob_17_muskeln.webp"],"Schulterkreisen":["./mobility-images/forge_mob_18_start.webp","./mobility-images/forge_mob_18_ende.webp","./mobility-images/forge_mob_18_muskeln.webp"],"Schulterheben mit Stab":["./mobility-images/forge_mob_19_start.webp","./mobility-images/forge_mob_19_ende.webp","./mobility-images/forge_mob_19_muskeln.webp"],"Handgelenksmobilisation":["./mobility-images/forge_mob_20_start.webp","./mobility-images/forge_mob_20_ende.webp","./mobility-images/forge_mob_20_muskeln.webp"]};
const previousExercise=window.forgeExerciseIllustrations;
const previousCatalog=window.forgePublicExercisePictures;
const safe=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=['Startposition','Endposition','Beanspruchte Muskelgruppen'];
function render(name){
 const photos=Object.prototype.hasOwnProperty.call(photoAssets,name)?photoAssets[name]:null;
 if(!photos)return '';
 const figures=photos.map((src,i)=>'<figure class="forge-mob-photo"><img src="'+src+'" alt="'+safe(name)+' – '+names[i]+'" tabindex="0" role="button" loading="lazy" decoding="async"/><figcaption>'+names[i]+'</figcaption></figure>').join('');
 return '<div class="forge-mob-photos" data-forge-mob-photo="'+safe(name)+'">'+figures+'</div>';
}
window.forgeExerciseIllustrations=function(name){
 return Object.prototype.hasOwnProperty.call(photoAssets,name)?render(name):(typeof previousExercise==='function'?previousExercise(name):'');
};
window.forgePublicExercisePictures=function(name){
 return Object.prototype.hasOwnProperty.call(photoAssets,name)?render(name):(typeof previousCatalog==='function'?previousCatalog(name):'');
};
window.forgeMobilityPhotoInfo={names:Object.keys(photoAssets),render};
function styles(){
 if(document.getElementById('forgeMobilityPhotoStyle'))return;
 const el=document.createElement('style');el.id='forgeMobilityPhotoStyle';
 el.textContent='.forge-mob-photos{display:grid;grid-template-columns:minmax(0,1fr);gap:9px;margin:10px 0 12px}.forge-mob-photo{margin:0;overflow:hidden;background:#0c1d24;border-radius:11px;border:1px solid #50665f;min-width:0}.forge-mob-photo img{display:block;width:100%;height:auto;object-fit:contain}.forge-mob-photo figcaption{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.forge-mob-photo img:focus-visible{outline:3px solid #9eff00;outline-offset:-3px}.forge-mob-photo:last-child img{object-fit:contain}@media(min-width:650px){.forge-mob-photos{grid-template-columns:repeat(3,minmax(0,1fr))}.forge-mob-photo:last-child{grid-column:auto}}';
 document.head.appendChild(el);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',styles,{once:true});else styles();
})();
