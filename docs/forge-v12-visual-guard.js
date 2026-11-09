/* FORGE V12: last-in-chain visual routing guard. Keeps legacy photos/atlases
 * out of the exercise catalogue and workout when an approved V12 board exists.
 * Mobility is explicitly passed through unchanged.
 */
(function(){
'use strict';
const previousExercise=window.forgeExerciseIllustrations;
const previousPublic=window.forgePublicExercisePictures;
const strength=()=>window.ForgeStrengthBoards;
function wrap(previous){
 return function(name){
  const boards=strength();
  if(boards?.has?.(name))return boards.render(name);
  if(boards?.isStrength?.(name))return '';
  return typeof previous==='function'?previous(name):'';
 };
}
window.forgeExerciseIllustrations=wrap(previousExercise);
// Thumbnails (catalogue, unit editor) ask forgeMobImage first: for strength
// exercises it must not return the old embedded photos.
const previousMob=window.forgeMobImage;
if(typeof previousMob==='function'){
 const mob=function(name){return strength()?.isStrength?.(name)?null:previousMob.apply(this,arguments);};
 mob.forgeV12=true;window.forgeMobImage=mob;
}
window.forgePublicExercisePictures=wrap(previousPublic);
window.ForgeV12VisualGuard=Object.freeze({
 version:'V12.1',
 lookup:name=>strength()?.canonical?.(name)||name,
 render:name=>strength()?.has?.(name)?strength().render(name):''
});
})();
