/* FORGE V10.5 – quality-approved machine photos only.
 * Pending exercises remain on the previous catalog images. Build generated.
 */
(function(){
'use strict';
const approved={};
const prevExercise=window.forgeExerciseIllustrations;
const prevCatalog=window.forgePublicExercisePictures;
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const captions=['Startposition','Endposition','Beanspruchte Muskelgruppen'];
function render(name){
 if(!Object.prototype.hasOwnProperty.call(approved,name))return '';
 return '<div class="forge-v101-chest-grid forge-v105-strength-grid" data-forge-strength="'+escape(name)+'">'+
  approved[name].map((src,i)=>'<figure class="forge-v101-chest-figure'+(i===2?' forge-anatomy-v2-figure':'')+'">'+
  '<img src="'+src+'" alt="'+escape(name)+' – '+captions[i]+'" role="button" tabindex="0" loading="lazy" decoding="async">'+
  '<figcaption>'+captions[i]+'</figcaption></figure>').join('')+'</div>';
}
window.forgeExerciseIllustrations=name=>Object.prototype.hasOwnProperty.call(approved,name)?
 render(name):(typeof prevExercise==='function'?prevExercise(name):'');
window.forgePublicExercisePictures=name=>Object.prototype.hasOwnProperty.call(approved,name)?
 render(name):(typeof prevCatalog==='function'?prevCatalog(name):'');
window.ForgeStrengthBlock02=Object.freeze({names:Object.keys(approved),approvedNames:Object.keys(approved),render});
})();
