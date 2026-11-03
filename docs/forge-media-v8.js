/* FORGE V8 · central offline visual registry. Existing movement photos are never
 * overwritten. Combined mobility cards require separate image QA before release.
 */
(function(){
'use strict';
const ENTRIES=[{"id":"strength:brustpresse","name":"Brustpresse","type":"strength","quality":"atlas-schematic-sequence","muscle":"./muscle-atlas-v2/01-brustpresse.svg","combined":null},{"id":"strength:butterfly-pec-deck","name":"Butterfly / Pec Deck","type":"strength","quality":"atlas-schematic-sequence","muscle":"./muscle-atlas-v2/02-butterfly.svg","combined":null},{"id":"strength:kabel-flys","name":"Kabel-Flys","type":"strength","quality":"atlas-schematic-sequence","muscle":"./muscle-atlas-v2/03-kabel-flys.svg","combined":null},{"id":"strength:einarmiges-kurzhantelrudern","name":"Einarmiges Kurzhantelrudern","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/04-einarmiges-rudern.svg","combined":null},{"id":"strength:brustgestutztes-rudern","name":"Brustgestütztes Rudern","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/05-brustgestuetztes-rudern.svg","combined":null},{"id":"strength:gerade-arme-pulldown","name":"Gerade-Arme-Pulldown","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/06-gerade-arme-pulldown.svg","combined":null},{"id":"strength:arnold-press","name":"Arnold Press","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/07-arnold-press.svg","combined":null},{"id":"strength:schulter-au-enrotation","name":"Schulter-Außenrotation","type":"strength","quality":"three-image-photo-sequence","muscle":"embedded-photo-sequence[2]","combined":null},{"id":"strength:hammer-curls","name":"Hammer Curls","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/08-hammer-curls.svg","combined":null},{"id":"strength:uberkopf-trizepsstrecken","name":"Überkopf-Trizepsstrecken","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/09-trizeps-ueberkopf.svg","combined":null},{"id":"strength:hip-thrust","name":"Hip Thrust","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/10-hip-thrust.svg","combined":null},{"id":"strength:beinstrecker","name":"Beinstrecker","type":"strength","quality":"atlas-schematic-sequence","muscle":"./muscle-atlas-v2/11-beinstrecker.svg","combined":null},{"id":"strength:abduktorenmaschine","name":"Abduktorenmaschine","type":"strength","quality":"atlas-schematic-sequence","muscle":"./muscle-atlas-v2/12-abduktoren.svg","combined":null},{"id":"strength:adduktorenmaschine","name":"Adduktorenmaschine","type":"strength","quality":"atlas-schematic-sequence","muscle":"./muscle-atlas-v2/13-adduktoren.svg","combined":null},{"id":"strength:einbeiniges-rumanisches-kreuzheben","name":"Einbeiniges rumänisches Kreuzheben","type":"strength","quality":"atlas-schematic-sequence","muscle":"./muscle-atlas-v2/14-einbeiniges-rdl.svg","combined":null},{"id":"strength:back-extensions","name":"Back Extensions","type":"strength","quality":"atlas-schematic-sequence","muscle":"./muscle-atlas-v2/15-back-extensions.svg","combined":null},{"id":"strength:farmer-s-carry","name":"Farmer's Carry","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/16-farmers-carry.svg","combined":null},{"id":"strength:pallof-press","name":"Pallof Press","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/17-pallof-press.svg","combined":null},{"id":"strength:dead-bug","name":"Dead Bug","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/18-dead-bug.svg","combined":null},{"id":"strength:bird-dog","name":"Bird Dog","type":"strength","quality":"three-image-photo-sequence","muscle":"./muscle-atlas-v2/19-bird-dog.svg","combined":null},{"id":"mobility:sprunggelenk-mobilisation-an-der-wand","name":"Sprunggelenk-Mobilisation an der Wand","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/sprunggelenk-wand.svg","combined":"./mobility-cards/forge_mob_01_karte.webp"},{"id":"mobility:fu-kreisen","name":"Fußkreisen","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/fusskreisen.svg","combined":"./mobility-cards/forge_mob_02_karte.webp"},{"id":"mobility:fu-sohle-mit-ball-mobilisieren","name":"Fußsohle mit Ball mobilisieren","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/fusssohle-ball.svg","combined":"./mobility-cards/forge_mob_03_karte.webp"},{"id":"mobility:fersengleiten-in-ruckenlage","name":"Fersengleiten in Rückenlage","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/fersengleiten.svg","combined":"./mobility-cards/forge_mob_04_karte.webp"},{"id":"mobility:beinpendel-vor-und-zuruck","name":"Beinpendel vor und zurück","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/beinpendel-vorne-hinten.svg","combined":"./mobility-cards/forge_mob_05_karte.webp"},{"id":"mobility:seitliches-beinpendel","name":"Seitliches Beinpendel","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/beinpendel-seitlich.svg","combined":"./mobility-cards/forge_mob_06_karte.webp"},{"id":"mobility:huftkreisen-im-stand","name":"Hüftkreisen im Stand","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/hueftkreisen-stand.svg","combined":"./mobility-cards/forge_mob_07_karte.webp"},{"id":"mobility:90-90-vorbeuge","name":"90/90-Vorbeuge","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/90-90-vorbeuge.svg","combined":"./mobility-cards/forge_mob_08_karte.webp"},{"id":"mobility:huftkreise-im-vierfu-lerstand","name":"Hüftkreise im Vierfüßlerstand","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/hueftkreise-vierfuessler.svg","combined":"./mobility-cards/forge_mob_09_karte.webp"},{"id":"mobility:quadrizeps-dehnung-im-stand","name":"Quadrizeps-Dehnung im Stand","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/quadrizeps-dehnung.svg","combined":"./mobility-cards/forge_mob_10_karte.webp"},{"id":"mobility:soleus-dehnung-mit-gebeugtem-knie","name":"Soleus-Dehnung mit gebeugtem Knie","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/soleus-dehnung.svg","combined":"./mobility-cards/forge_mob_11_karte.webp"},{"id":"mobility:hamstring-dehnung-mit-gurt","name":"Hamstring-Dehnung mit Gurt","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/hamstring-gurt.svg","combined":"./mobility-cards/forge_mob_12_karte.webp"},{"id":"mobility:beckenkippen-in-ruckenlage","name":"Beckenkippen in Rückenlage","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/beckenkippen-liegend.svg","combined":"./mobility-cards/forge_mob_13_karte.webp"},{"id":"mobility:beckenkreisen-im-stand","name":"Beckenkreisen im Stand","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/beckenkreisen-stand.svg","combined":"./mobility-cards/forge_mob_14_karte.webp"},{"id":"mobility:knie-zur-brust-in-ruckenlage","name":"Knie zur Brust in Rückenlage","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/knie-brust.svg","combined":"./mobility-cards/forge_mob_15_karte.webp"},{"id":"mobility:thread-the-needle","name":"Thread the Needle","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/thread-the-needle.svg","combined":"./mobility-cards/forge_mob_16_karte.webp"},{"id":"mobility:brustwirbelsaulenstreckung-uber-foam-roller","name":"Brustwirbelsäulenstreckung über Foam Roller","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/bws-foam-roller.svg","combined":"./mobility-cards/forge_mob_17_karte.webp"},{"id":"mobility:schulterkreisen","name":"Schulterkreisen","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/schulterkreisen.svg","combined":"./mobility-cards/forge_mob_18_karte.webp"},{"id":"mobility:schulterheben-mit-stab","name":"Schulterheben mit Stab","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/schulterheben-stab.svg","combined":"./mobility-cards/forge_mob_19_karte.webp"},{"id":"mobility:handgelenksmobilisation","name":"Handgelenksmobilisation","type":"mobility","quality":"combined-card-requires-individual-start-end-anatomy","muscle":"./mobility-anatomy-v8/handgelenksmobilisation.svg","combined":"./mobility-cards/forge_mob_20_karte.webp"},{"id":"legacy:ausfallschritte","name":"Ausfallschritte","type":"legacy-strength","quality":"legacy-photo-catalog-visual-qa-pending","muscle":"./muscle-premium-vb/ausfallschritte.svg","combined":null},{"id":"legacy:rumanisches-kreuzheben","name":"Rumänisches Kreuzheben","type":"legacy-strength","quality":"legacy-photo-catalog-visual-qa-pending","muscle":"./muscle-premium-vb/rum-kreuzheben.svg","combined":null},{"id":"legacy:bankdrucken","name":"Bankdrücken","type":"legacy-strength","quality":"legacy-photo-catalog-visual-qa-pending","muscle":"./muscle-premium-vb/bankdruecken.svg","combined":null},{"id":"legacy:latziehen","name":"Latziehen","type":"legacy-strength","quality":"legacy-photo-catalog-visual-qa-pending","muscle":"./muscle-premium-vb/latziehen.svg","combined":null},{"id":"legacy:seitheben","name":"Seitheben","type":"legacy-strength","quality":"legacy-photo-catalog-visual-qa-pending","muscle":"./muscle-premium-vb/seitheben.svg","combined":null},{"id":"legacy:plank","name":"Plank","type":"legacy-strength","quality":"legacy-photo-catalog-visual-qa-pending","muscle":"./muscle-premium-vb/plank.svg","combined":null}];
const key=v=>String(v||'').trim().normalize('NFKC').toLocaleLowerCase('de');
const entries=new Map(ENTRIES.map(row=>[key(row.name),Object.freeze(row)]));
const find=name=>entries.get(key(name))||null;
const existingExercise=window.forgeExerciseIllustrations;
const existingPublic=window.forgePublicExercisePictures;
function originalRenderer(fn,name){
 if(typeof fn!=='function')return '';
 try{return fn(name)||'';}catch(error){console.warn('FORGE media unavailable:',name,error);return '';}
}
function renderWith(fn,name){
 const markup=originalRenderer(fn,name);
 const record=find(name);
 if(!markup||!record?.muscle)return markup;
 const root=document.createElement('div');root.innerHTML=markup;
 const figures=Array.from(root.querySelectorAll('figure')).filter(node=>!!node.querySelector('img,svg'));
 if(figures.length<3){
  // Combined mobility cards remain unmodified. Offer an additional detailed
  // body-focus asset without claiming two separate photos already exist.
  if(record.type==='mobility'&&record.combined){
   const figure=document.createElement('figure');
   figure.className='forge-media-v8-mobility-anatomy';
   const img=document.createElement('img');
   img.src=record.muscle;img.alt=name+' – detaillierte anatomische Mobilisationsbereiche';
   img.loading='lazy';img.decoding='async';
   img.className='forge-media-v8-muscle-image';
   figure.append(img);
   const caption=document.createElement('figcaption');
   caption.textContent='Mobilisierte Muskel- und Gelenkbereiche';
   figure.append(caption);root.append(figure);
   return root.innerHTML;
  }
  return markup;
 }
 const third=figures[2],original=third.querySelector('img,svg');
 const info=String(third.querySelector('figcaption')?.textContent||'')+' '+
  String(original?.getAttribute('alt')||'')+' '+String(original?.getAttribute('aria-label')||'');
 if(!original||!/muskel|anatom|beanspruch/i.test(info))return markup;
 const img=document.createElement('img');
 img.src=record.muscle;img.alt=name+' – detaillierte anatomische Muskelgruppenübersicht';
 img.loading='lazy';img.decoding='async';img.className='forge-media-v8-muscle-image';
 original.replaceWith(img);
 third.classList.add('forge-media-v8-muscle-stage');
 third.dataset.forgeMediaV8=record.id;
 return root.innerHTML;
}
if(typeof existingExercise==='function'){
 const use=function(name){return renderWith(existingExercise,name);};
 use.forgeMediaV8=true;window.forgeExerciseIllustrations=use;
}
if(typeof existingPublic==='function'){
 const use=function(name){return renderWith(existingPublic,name);};
 use.forgeMediaV8=true;window.forgePublicExercisePictures=use;
}
function get(name){
 const item=find(name);if(!item)return null;
 return {id:item.id,name:item.name,type:item.type,quality:item.quality,
  start:'existing-catalogue',end:'existing-catalogue',muscle:item.muscle,
  combined:item.combined,independentImages:item.quality==='three-image-photo-sequence'};
}
function imageStatus(){
 const items=ENTRIES.map(x=>({id:x.id,name:x.name,quality:x.quality,muscle:!!x.muscle,combined:!!x.combined}));
 return {count:items.length,items};
}
function styles(){
 if(document.getElementById('forgeMediaV8Styles'))return;
 const style=document.createElement('style');style.id='forgeMediaV8Styles';
 style.textContent=".forge-media-v8-muscle-stage{background:#0b100d!important}.forge-media-v8-muscle-stage .forge-media-v8-muscle-image{display:block!important;object-fit:contain!important;width:100%!important;max-height:320px!important;height:auto!important;background:linear-gradient(160deg,#111b15,#080b09)!important;border:0!important;cursor:zoom-in}.forge-media-v8-muscle-image:focus-visible{outline:2px solid #9eff00;outline-offset:2px} .forge-media-v8-mobility-anatomy{margin:9px 0 12px;padding:8px;border:1px solid #263a2c;border-radius:12px;background:#0d140f;text-align:center}.forge-media-v8-mobility-anatomy figcaption{font:650 11px/1.4 system-ui,sans-serif;color:#bacdb7;padding:4px}";document.head.append(style);
}
window.ForgeMediaV8=Object.freeze({get,find,renderWith,entries:()=>ENTRIES.slice(),imageStatus});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',styles,{once:true});else styles();
})();