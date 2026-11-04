/* FORGE V10.1: vetted position photo pairs and existing anatomy artwork.
 * Generated from FORGE-KRAFT-BLOCK01-QA.json. Pending exercises retain the
 * exact originally embedded pictures as individually addressable offline WebP.
 */
(function(){
'use strict';
const approved={};
const reference={"Brustpresse":["./strength-photos/reference/brustpresse-start.webp","./strength-photos/reference/brustpresse-ende.webp","./muscle-atlas-v2/01-brustpresse.svg"],"Butterfly / Pec Deck":["./strength-photos/reference/butterfly-pec-deck-start.webp","./strength-photos/reference/butterfly-pec-deck-ende.webp","./muscle-atlas-v2/02-butterfly.svg"],"Kabel-Flys":["./strength-photos/reference/kabel-flys-start.webp","./strength-photos/reference/kabel-flys-ende.webp","./muscle-atlas-v2/03-kabel-flys.svg"]};
const visible=Object.assign({},reference,approved);
const fallbackExercise=window.forgeExerciseIllustrations;
const fallbackCatalog=window.forgePublicExercisePictures;
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=['Startposition','Endposition','Beanspruchte Muskelgruppen'];
function render(name){
 const paths=Object.prototype.hasOwnProperty.call(visible,name)?visible[name]:null;
 if(!paths)return '';
 const figures=paths.map((src,i)=>'<figure class="forge-v101-chest-figure'+(i===2?' forge-anatomy-v2-figure':'')+'"><img src="'+src+'" alt="'+safe(name)+' – '+labels[i]+'" tabindex="0" role="button" loading="lazy" decoding="async"><figcaption>'+labels[i]+'</figcaption></figure>').join('');
 return '<div class="forge-v101-chest-grid" data-forge-chest="'+safe(name)+'">'+figures+'</div>';
}
window.forgeExerciseIllustrations=name=>Object.prototype.hasOwnProperty.call(visible,name)?render(name):(typeof fallbackExercise==='function'?fallbackExercise(name):'');
window.forgePublicExercisePictures=name=>Object.prototype.hasOwnProperty.call(visible,name)?render(name):(typeof fallbackCatalog==='function'?fallbackCatalog(name):'');
window.ForgeChestPhotoBlock01=Object.freeze({names:Object.keys(visible),approvedNames:Object.keys(approved),referenceNames:Object.keys(reference),render});
function styles(){
 if(document.getElementById('forgeChestV101Styles'))return;
 const node=document.createElement('style');node.id='forgeChestV101Styles';
 node.textContent='.forge-v101-chest-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0 12px}.forge-v101-chest-figure{margin:0;min-width:0;overflow:hidden;border-radius:12px;background:#102026;border:1px solid #375a4c}.forge-v101-chest-figure img{display:block;width:100%;max-height:400px;object-fit:contain;cursor:zoom-in}.forge-v101-chest-figure img:focus-visible{outline:3px solid #a8f55d;outline-offset:-3px}.forge-v101-chest-figure:last-child{grid-column:1/-1}.forge-v101-chest-figure figcaption{font-size:12px;font-weight:750;text-align:center;color:#e8f4ec;padding:8px 5px}.forge-strength-body:has(.forge-v101-chest-grid)>.forge159-muscles,.forge-strength-body:has(.forge-v101-chest-grid)>.forge-muscle-map{display:none!important}@media(min-width:650px){.forge-v101-chest-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.forge-v101-chest-figure:last-child{grid-column:auto}}';
 document.head.append(node);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',styles,{once:true});else styles();
})();
