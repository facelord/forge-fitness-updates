/* FORGE mobility photos – generated at build time; do not edit.
 * Only individually approved start / end / anatomy triptychs are shown.
 * Unapproved or absent image sets ALWAYS keep the original offline atlas.
 */
(function(){
'use strict';
const photoAssets={};
const previousExercise=window.forgeExerciseIllustrations;
const previousCatalog=window.forgePublicExercisePictures;
const safe=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=['Startposition','Endposition','Beanspruchte Muskelgruppen'];
function render(name){
 const photos=Object.prototype.hasOwnProperty.call(photoAssets,name)?photoAssets[name]:null;
 if(!photos)return '';
 const figures=photos.map((src,i)=>'<figure class="forge-mob-photo"><img src="'+src+'" alt="'+safe(name)+' – '+names[i]+'" loading="lazy" decoding="async"/><figcaption>'+names[i]+'</figcaption></figure>').join('');
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
 el.textContent='.forge-mob-photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0 12px}.forge-mob-photo{margin:0;overflow:hidden;background:#0c1d24;border-radius:11px;border:1px solid #50665f;min-width:0}.forge-mob-photo img{display:block;width:100%;height:auto;object-fit:contain}.forge-mob-photo figcaption{padding:7px 4px;text-align:center;font-size:11px;font-weight:700;color:#e1eee7}.forge-mob-photo:last-child{grid-column:1/-1}.forge-mob-photo:last-child img{max-height:300px;object-fit:contain}@media(min-width:650px){.forge-mob-photos{grid-template-columns:repeat(3,minmax(0,1fr))}.forge-mob-photo:last-child{grid-column:auto}}';
 document.head.appendChild(el);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',styles,{once:true});else styles();
})();
