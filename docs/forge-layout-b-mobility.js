/* FORGE Layout B · Mobilität live.
 * Workout › Mobilität zeigt eine Startkarte (Routine, Übungen, Dauer, Tage)
 * und startet eine geführte Einheit im Vollbild: Bild, Anleitung, Countdown-
 * Ring, automatische Seitenwechsel („je Seite“), kurze Bereit-Phase vor jeder
 * Übung, Pause / Zurück / Überspringen, Abschluss mit Dauer.
 * Data: the routine comes from mobConfig()/MOB_ROUTINES (incl. the
 * individual mix „forge-custom“). Finishing appends to state.mobility.logs
 * exactly like completeMobility() (plus durationMs) – no new data model.
 * A running session survives a reload (state.forgeLbMobRun).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const TEAL='#5ee0c8';
const PREP=5,SIDE_PREP=3;

/* ---------- pure helpers (tested) ---------- */
function hasSides(item,lib){
 const cue=String(item&&item[2]||'');
 if(/je seite|seite wechseln|pro seite/i.test(cue))return true;
 const x=(lib||[]).find(e=>e.name===(item&&item[0]));
 return !!(x&&x.sides);
}
/* One phase per side; a short prep phase before each exercise and side change. */
function buildPhases(items,lib){
 const out=[];
 (items||[]).forEach((it,i)=>{
  const secs=Math.max(5,Math.round(Number(it[1])||30));
  const meta=it&&typeof it[3]==='object'&&it[3]?it[3]:null;
  const sides=meta&&typeof meta.sides==='boolean'?meta.sides:hasSides(it,lib);
  out.push({kind:'prep',ex:i,secs:meta&&meta.prep>0?Math.round(meta.prep):PREP});
  if(sides){
   out.push({kind:'work',ex:i,secs,side:'Rechts',sideNo:1});
   out.push({kind:'prep',ex:i,secs:SIDE_PREP,sideChange:true});
   out.push({kind:'work',ex:i,secs,side:'Links',sideNo:2});
  }else out.push({kind:'work',ex:i,secs});
 });
 return out;
}
function totalSeconds(items,lib){return buildPhases(items,lib).filter(p=>p.kind==='work').reduce((a,p)=>a+p.secs,0);}
/* ---------- Automatischer Mobilitätsplaner (Fokus · Dauer · Hilfsmittel · Runden) ----------
 * pos: 1 stehend · 2 sitzend · 3 Vierfüßler/kniend · 4 liegend
 * f: B Beine/Hüfte · S Schultern/Oberkörper · R Rumpf/Wirbelsäule
 * req: zwingend nötige Hilfsmittel · opt: optional (Komfort). */
const GEN_EQUIP=Object.freeze([['band','Theraband'],['wand','Wand'],['tuer','Türrahmen'],['rolle','Faszienrolle'],['stab','Gymnastikstab'],['ball','Massageball'],['gurt','Dehngurt']]);
const GEN_OPTIONAL=Object.freeze({matte:'Matte',wand:'Wand zum Festhalten'});
const GEN_FOCUS=Object.freeze([['full','Ganzkörper'],['legs','Beine'],['shoulders','Schultern'],['core','Rumpf']]);
const GEN_MINUTES=Object.freeze([5,10,15,20]);
const M=(name,f,pos,sides,req,opt)=>Object.freeze({name,f,pos,sides,req:req||[],opt:opt||[]});
const GEN_MOVES=Object.freeze([
 M('Sprunggelenk-Mobilisation an der Wand','B',1,true,['wand']),M('Fußkreisen','B',1,true),M('Fußsohle mit Ball mobilisieren','B',1,true,['ball']),
 M('Fersengleiten in Rückenlage','B',4,true,[],['matte']),M('Beinpendel vor und zurück','B',1,true,[],['wand']),M('Seitliches Beinpendel','B',1,true,[],['wand']),
 M('Hüftkreisen im Stand','BR',1,true),M('90/90-Vorbeuge','B',2,true,[],['matte']),M('Hüftkreise im Vierfüßlerstand','BR',3,true,[],['matte']),
 M('Quadrizeps-Dehnung im Stand','B',1,true,[],['wand']),M('Soleus-Dehnung mit gebeugtem Knie','B',1,true,[],['wand']),M('Hamstring-Dehnung mit Gurt','B',4,true,['gurt'],['matte']),
 M('Beckenkippen in Rückenlage','R',4,false,[],['matte']),M('Beckenkreisen im Stand','RB',1,false),M('Knie zur Brust in Rückenlage','RB',4,true,[],['matte']),
 M('Thread the Needle','SR',3,true,[],['matte']),M('Brustwirbelsäulenstreckung über Foam Roller','SR',4,false,['rolle'],['matte']),M('Schulterkreisen','S',1,false),
 M('Schulterheben mit Stab','S',1,false,['stab']),M('Handgelenksmobilisation','S',1,true),M('Kindhaltung','RS',3,false,[],['matte']),
 M('Herabschauender Hund','SBR',3,false,[],['matte']),M('Liegender Twist','R',4,true,[],['matte']),M('Hüftbeuger-Dehnung','BR',3,true,[],['matte']),
 M('Figure-Four-Dehnung','B',4,true,[],['matte']),M('Türrahmen-Brustdehnung','S',1,true,['tuer']),M('Waden-Dehnung','B',1,true,[],['wand']),
 M('Adduktoren-Rockback','B',3,true,[],['matte']),M('Wall Slides','S',1,false,['wand']),M('Cat-Cow','RS',3,false,[],['matte']),
 M('Brustwirbelsäulen-Rotation','SR',3,true,[],['matte']),M('Tiefe Hocke mit Halt','B',1,false,[],['wand']),M('Low Lunge','BR',3,true,[],['matte']),
 M('Krieger II','BS',1,true),M('Sitzende Vorbeuge','BR',2,false,[],['matte']),M('90/90 Hüftwechsel','B',2,false,[],['matte']),
 M('Kindhaltung mit Seitgriff','SR',3,true,[],['matte']),
 M('Schulter-Dislocates mit Theraband','S',1,false,['band']),M('Band-Außenrotation','S',1,true,['band']),M('Hamstring-Dehnung mit Theraband','B',4,true,['band'],['matte']),
 M('Sprunggelenk-Mobilisation mit Theraband','B',3,true,['band'],['matte']),M('Hüftbeuger-Dehnung mit Theraband','BR',3,true,['band'],['matte']),
 M('Handgelenksmobilisation mit Theraband','S',3,true,['band'],['matte'])]);
/* Band-Variante und Grundübung nie zusammen in einer Routine. */
const GEN_TWIN=Object.freeze((()=>{const m={};[['Handgelenksmobilisation mit Theraband','Handgelenksmobilisation'],['Hamstring-Dehnung mit Theraband','Hamstring-Dehnung mit Gurt'],['Hüftbeuger-Dehnung mit Theraband','Hüftbeuger-Dehnung'],['Sprunggelenk-Mobilisation mit Theraband','Sprunggelenk-Mobilisation an der Wand']].forEach(([a,b])=>{m[a]=b;m[b]=a;});return m;})());
const GEN_FIRST_PREP=5,GEN_PREP=8,GEN_POS_PREP=10,GEN_ROUND_PREP=10,GEN_SIDE_PREP=SIDE_PREP;
function genRng(seed){let a=(Number(seed)>>>0)||1;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function genShuffle(list,rnd){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const FOCUS_LETTER={legs:'B',shoulders:'S',core:'R'};
/* equip: 'none' (ohne Hilfsmittel) or a list of available keys. Every required item must be available. */
function genPool(focus,equip,moves){
 const have=equip==='none'?[]:(Array.isArray(equip)?equip:[]);
 const L=FOCUS_LETTER[focus];
 return (moves||GEN_MOVES).filter(m=>(!L||m.f.includes(L))&&m.req.every(r=>have.includes(r)));
}
function genWorkLimits(m){return m.sides?[15,30,25]:[30,60,45];}
/* Seconds of one round for the given moves and work seconds (prep + work + side change). */
function genRoundFixed(list){
 let t=0;list.forEach((m,i)=>{t+=i===0?0:(list[i-1].pos!==m.pos?GEN_POS_PREP:GEN_PREP);if(m.sides)t+=GEN_SIDE_PREP;});return t;
}
function genOrder(list,rnd){
 const byPos=[1,2,3,4].map(p=>genShuffle(list.filter(m=>m.pos===p),rnd));
 const down=rnd()<.5;return (down?byPos:byPos.reverse()).flat();
}
/* Builds a plan for focus/minutes/equipment. avoid: names to leave out if the pool allows (Neu generieren). */
function generateMobility(opts){
 const o=opts||{};const minutes=GEN_MINUTES.includes(Number(o.minutes))?Number(o.minutes):10;
 const focus=GEN_FOCUS.some(f=>f[0]===o.focus)?o.focus:'full';
 const equip=o.equip==='none'?'none':(Array.isArray(o.equip)?o.equip.slice():'none');
 const rnd=genRng(o.seed||Date.now());
 const pool=genPool(focus,equip,o.moves);
 if(pool.length<3)return {ok:false,reason:'Für diese Auswahl gibt es zu wenige passende Übungen. Wähle einen anderen Fokus oder mehr Hilfsmittel.',pool:pool.length};
 const avoid=new Set(o.avoid||[]);
 const fresh=genShuffle(pool.filter(m=>!avoid.has(m.name)),rnd),old=genShuffle(pool.filter(m=>avoid.has(m.name)),rnd);
 const twins=new Set();const ranked=fresh.concat(old).filter(m=>{const t=GEN_TWIN[m.name];if(t&&twins.has(t))return false;twins.add(m.name);return true;});
 const target=minutes*60-GEN_FIRST_PREP;
 const nominal=m=>(m.sides?2*genWorkLimits(m)[2]:genWorkLimits(m)[2])+(m.sides?GEN_SIDE_PREP:0)+GEN_PREP;
 const maxOf=m=>(m.sides?2*genWorkLimits(m)[1]:genWorkLimits(m)[1])+(m.sides?GEN_SIDE_PREP:0)+GEN_PREP;
 // rounds: as few as possible, but a round should not need more moves than the pool has
 let rounds=1,k=0;
 for(rounds=1;rounds<=4;rounds++){
  let acc=0;k=0;while(k<ranked.length&&acc*rounds<target){acc+=nominal(ranked[k]);k++;}
  if(acc*rounds>=target*0.9||ranked.slice(0,k).reduce((a,m)=>a+maxOf(m),0)*rounds>=target)break;
 }
 rounds=Math.min(rounds,4);
 const chosen=genOrder(ranked.slice(0,Math.max(3,k)),rnd);
 // fixed time: preps, side changes, round transitions
 const fixedRound=genRoundFixed(chosen);
 const fixed=fixedRound*rounds+(rounds-1)*GEN_ROUND_PREP;
 const budget=Math.max(0,target-fixed);
 // distribute work seconds proportionally to nominal, within limits, in 5 s steps
 const units=chosen.map(m=>m.sides?2:1);const nom=chosen.map(m=>genWorkLimits(m)[2]);
 const nomTotal=chosen.reduce((a,m,i)=>a+nom[i]*units[i],0)*rounds;
 const scale=nomTotal?budget/nomTotal:1;
 const secs=chosen.map((m,i)=>{const [lo,hi]=genWorkLimits(m);return Math.min(hi,Math.max(lo,Math.round(nom[i]*scale/5)*5));});
 // fine-tune in 5 s steps so the honest total lands as close as possible to the chosen duration
 const fullTarget=minutes*60;
 const totalOf=()=>GEN_FIRST_PREP+fixed+chosen.reduce((a,m,i)=>a+secs[i]*units[i],0)*rounds;
 for(let guard=0;guard<400;guard++){
  const diff=totalOf()-fullTarget;if(Math.abs(diff)<5)break;
  let best=-1,bestGain=0;
  chosen.forEach((m,i)=>{const [lo,hi]=genWorkLimits(m);const step=diff>0?-5:5;const nv=secs[i]+step;if(nv<lo||nv>hi)return;
   const nd=Math.abs(diff+step*units[i]*rounds);const gain=Math.abs(diff)-nd;if(gain>bestGain){bestGain=gain;best=i;}});
  if(best<0)break;secs[best]+=diff>0?-5:5;
 }
 const items=[];
 for(let r=0;r<rounds;r++){
  const seq=r%2?chosen.map((m,i)=>[m,secs[i]]).reverse():chosen.map((m,i)=>[m,secs[i]]);
  seq.forEach(([m,sec],j)=>{
   const prevM=j?seq[j-1][0]:null;
   const prep=r===0&&j===0?GEN_FIRST_PREP:j===0?GEN_ROUND_PREP:(prevM.pos!==m.pos?GEN_POS_PREP:GEN_PREP);
   items.push([m.name,sec,m.sides?'je Seite':'',{prep,sides:m.sides,round:r+1,rounds,pos:m.pos}]);
  });
 }
 const total=items.reduce((a,it)=>a+it[3].prep+(it[3].sides?2*it[1]+GEN_SIDE_PREP:it[1]),0);
 const need=[...new Set(chosen.flatMap(m=>m.req))];
 const optional=[...new Set(chosen.flatMap(m=>m.opt))].filter(x=>!need.includes(x));
 return {ok:true,focus,minutes,equip,rounds,moves:chosen.map(m=>m.name),items,total,need,optional,
  name:'Automatisch · '+GEN_FOCUS.find(f=>f[0]===focus)[1]+' · '+minutes+' Min.'};
}
/* Swap one move for another fitting one (same focus/equipment), keeping times and rounds. */
function replaceMove(plan,name,seed){
 if(!plan||!plan.ok)return plan;
 const pool=genPool(plan.focus,plan.equip).filter(m=>!plan.moves.includes(m.name)&&!(GEN_TWIN[m.name]&&GEN_TWIN[m.name]!==name&&plan.moves.includes(GEN_TWIN[m.name])));
 if(!pool.length)return null;
 const old=GEN_MOVES.find(m=>m.name===name);const rnd=genRng(seed||Date.now());
 const same=pool.filter(m=>old&&m.pos===old.pos&&m.sides===old.sides);
 const pick=genShuffle(same.length?same:pool,rnd)[0];
 const items=plan.items.map(it=>{
  if(it[0]!==name)return it;
  const [lo,hi]=genWorkLimits(pick);const per=pick.sides===it[3].sides?it[1]:pick.sides?Math.round(it[1]/2/5)*5:it[1]*2;
  return [pick.name,Math.min(hi,Math.max(lo,per)),pick.sides?'je Seite':'',{...it[3],sides:pick.sides,pos:pick.pos}];
 });
 const moves=plan.moves.map(n=>n===name?pick.name:n);
 const chosen=moves.map(n=>GEN_MOVES.find(m=>m.name===n)).filter(Boolean);
 const need=[...new Set(chosen.flatMap(m=>m.req))];
 const total=items.reduce((a,it)=>a+it[3].prep+(it[3].sides?2*it[1]+GEN_SIDE_PREP:it[1]),0);
 return {...plan,items,moves,need,optional:[...new Set(chosen.flatMap(m=>m.opt))].filter(x=>!need.includes(x)),total};
}
function equipLabel(k){const e=GEN_EQUIP.find(x=>x[0]===k);return e?e[1]:GEN_OPTIONAL[k]||k;}
function minutesLabel(sec){return 'ca. '+Math.max(1,Math.round(sec/60))+' Min.';}
function clock(sec){sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
function firstPhaseOf(phases,ex){const i=phases.findIndex(p=>p.ex===ex);return i<0?phases.length:i;}
function isToday(cfg,weekday,trainedToday){
 if(!cfg||!cfg.enabled)return false;
 const days=Array.isArray(cfg.weekdays)?cfg.weekdays:[];
 if(cfg.timing==='after')return !!trainedToday;
 if(cfg.timing==='both')return days.includes(weekday)||!!trainedToday;
 return days.includes(weekday);
}
/* ---------- Mobilitätskatalog: Gelenke · Yoga · Dehnen ---------- */
const CATEGORIES=Object.freeze(['Gelenke','Yoga','Dehnen']);
const STRETCH=new Set(['Hamstring-Dehnung mit Theraband','Hüftbeuger-Dehnung mit Theraband','90/90-Vorbeuge','Quadrizeps-Dehnung im Stand','Soleus-Dehnung mit gebeugtem Knie','Hamstring-Dehnung mit Gurt','Knie zur Brust in Rückenlage',
 'Hüftbeuger-Dehnung','Figure-Four-Dehnung','Türrahmen-Brustdehnung','Waden-Dehnung']);
const YOGA=new Set(['Kindhaltung','Herabschauender Hund','Liegender Twist']);
function categoryOf(name){return YOGA.has(name)?'Yoga':STRETCH.has(name)?'Dehnen':'Gelenke';}
/* Moves that already live (with photos and guides) in the guided routines; now also in the catalogue. */
const EXTRA_DEFS=Object.freeze([
 ['Kindhaltung','Rücken','static',60,false],['Herabschauender Hund','Ganzkörper','static',45,false],['Liegender Twist','Wirbelsäule','static',45,true],
 ['Hüftbeuger-Dehnung','Hüfte','static',45,true],['Figure-Four-Dehnung','Gesäß','static',45,true],['Türrahmen-Brustdehnung','Brust','static',45,true],
 ['Waden-Dehnung','Waden','static',45,true],['Adduktoren-Rockback','Hüfte','dynamic',60,true],['Wall Slides','Schultern','dynamic',60,false]]);
/* Theraband-Mobilität (Freitag 13.11.): eigene freigegebene Übungstafeln + Anleitung. */
const BAND_DEFS=Object.freeze([
 ['Schulter-Dislocates mit Theraband','Schultern','dynamic',40,false,'band-schulter-dislocates',['Band weit greifen, Arme vor dem Oberkörper.','Arme langsam und nahezu gestreckt über den Kopf nach hinten führen.','Nur so weit, wie es schmerzfrei geht, und kontrolliert zurück.'],'Griff breiter wählen, wenn die Schultern zwicken; Rumpf stabil, kein Hohlkreuz.'],
 ['Band-Außenrotation','Schultern','dynamic',40,true,'band-aussenrotation',['Band seitlich auf Ellbogenhöhe sicher befestigen.','Ellbogen im 90°-Winkel am Körper, Unterarm langsam nach außen drehen.','Kontrolliert zurückführen und Seiten wechseln.'],'Ellbogen bleibt am Körper; kleine, saubere Bewegung.'],
 ['Hamstring-Dehnung mit Theraband','Hinterer Oberschenkel','static',30,true,'band-hamstring-dehnung',['Auf den Rücken legen und das Band um einen Fuß führen.','Bein mit beiden Bandenden langsam gestreckt anheben.','Dehnung 20–30 Sekunden ruhig halten, dann Seite wechseln.'],'Becken und anderes Bein bleiben am Boden; nicht ruckartig ziehen.'],
 ['Sprunggelenk-Mobilisation mit Theraband','Sprunggelenk','dynamic',35,true,'band-sprunggelenk-mobilisation',['Band tief vor dem Sprunggelenk anlegen und hinten sicher befestigen.','Im halben Kniestand das vordere Knie langsam über die Zehen nach vorn schieben.','Ferse bleibt am Boden; zurück und Seite wechseln.'],'Ohne Federn bewegen, nur im schmerzfreien Bereich.'],
 ['Hüftbeuger-Dehnung mit Theraband','Hüfte','static',30,true,'band-hueftbeuger-dehnung',['Band hoch um die Hüfte des hinteren Beins legen und hinten sicher befestigen.','Im halben Kniestand Gesäß anspannen und Becken leicht nach hinten kippen.','Hüfte sanft nach vorn schieben, 20–30 Sekunden halten, Seite wechseln.'],'Kein Hohlkreuz; Oberkörper bleibt aufrecht.'],
 ['Handgelenksmobilisation mit Theraband','Handgelenke','dynamic',35,true,'band-handgelenksmobilisation',['Leichtes Band knapp oberhalb des Handgelenks anlegen und sicher befestigen.','Im Vierfüßlerstand die Handfläche flach aufsetzen.','Oberkörper langsam vor und zurück verlagern, dann Seite wechseln.'],'Ellbogen ruhig halten; nur schmerzfrei bewegen.']]);
const BAND_IMAGES=Object.freeze(Object.fromEntries(BAND_DEFS.map(d=>[d[0],'./mobility-boards/'+d[5]+'.webp'])));
function bandExtras(){return BAND_DEFS.map(([name,region,mode,seconds,sides,,steps,tip])=>({name,region,mode,amount:mode==='dynamic'?10:1,seconds,sides,steps:steps.slice(),tip,category:categoryOf(name),source:'band',equipment:'Theraband'}));}
function extras(guides){
 const g=guides||{};
 return EXTRA_DEFS.map(([name,region,mode,seconds,sides])=>{const x=Array.isArray(g[name])?g[name]:[[],''];
  return {name,region,mode,amount:mode==='dynamic'?10:1,seconds,sides,steps:Array.isArray(x[0])?x[0].slice():[],tip:String(x[1]||''),category:categoryOf(name),source:'routine'};}).concat(bandExtras());
}
function withExtras(list,guides){const have=new Set((list||[]).map(x=>x.name));return (list||[]).concat(extras(guides).filter(x=>!have.has(x.name)));}
/* ---------- Video-Bibliothek ---------- */
const VIDEO_AREAS=Object.freeze([['hips','Hüfte'],['upper','Oberkörper'],['back','Rücken'],['legs','Beine'],['full','Ganzkörper']]);
const VIDEO_MINS=Object.freeze([5,10,15,20,30]);
function videoList(catalog){
 const out=[],seen=new Set();
 for(const [key,items] of Object.entries(catalog||{})){
  const m=/^(\w+)-(\d+)$/.exec(key);if(!m||!Array.isArray(items))continue;
  items.forEach((v,idx)=>{if(!v||!v.url||seen.has(v.url))return;seen.add(v.url);
   const id=(/[?&]v=([\w-]{6,})/.exec(v.url)||[])[1]||'';
   out.push({id,url:v.url,title:String(v.title||'Video'),creator:String(v.creator||''),area:m[1],mins:Number(m[2]),idx,yoga:/yoga/i.test(String(v.title||''))});});
 }
 return out;
}
function filterVideos(list,f){
 const q=String(f&&f.q||'').toLocaleLowerCase('de').trim();
 return (list||[]).filter(v=>(!f||!f.area||f.area==='all'||v.area===f.area)&&(!f||!f.mins||v.mins===Number(f.mins))&&(!q||(v.title+' '+v.creator).toLocaleLowerCase('de').includes(q)));
}
/* Weekly plan keeps the first two videos per area+duration (legacy videoCandidates). */
function plannable(v){return !!v&&v.idx<2;}
function assignVideo(assignments,day,v){
 const list=(Array.isArray(assignments)?assignments:[]).filter(a=>a&&a.day!==day);
 list.push({day,goal:v.area,mins:v.mins,choice:v.idx,timing:'separate'});
 return list.sort((a,b)=>a.day-b.day);
}
window.ForgeMobilityCatalog=Object.freeze({CATEGORIES,categoryOf,extras,withExtras,BAND_IMAGES});
/* Thumbnails, Katalog und Anleitung fragen forgeMobImage(): Band-Tafeln zuerst. */
try{const prevMob=typeof window.forgeMobImage==='function'?window.forgeMobImage:null;
 if(!(prevMob&&prevMob.forgeBand)){const f=function(name){return BAND_IMAGES[name]?[BAND_IMAGES[name]]:(prevMob?prevMob.apply(this,arguments):null);};f.forgeBand=true;window.forgeMobImage=f;}}catch(e){}
try{if(typeof window.forgePlusRegisterMobility==='function'&&typeof FORGE_EX_GUIDES!=='undefined')window.forgePlusRegisterMobility(extras(FORGE_EX_GUIDES));}catch(e){}
function registerAutoRoutine(){
 try{const a=typeof state!=='undefined'&&state&&state.forgeMobAuto;
  if(typeof MOB_ROUTINES!=='undefined'&&a&&Array.isArray(a.items)&&a.items.length)MOB_ROUTINES['forge-auto']={name:String(a.name||'Automatisch'),items:a.items.map(x=>x.slice())};}catch(e){}
}
registerAutoRoutine();
window.ForgeMobilityGenerator=Object.freeze({registerAutoRoutine,GEN_MOVES,GEN_EQUIP,GEN_FOCUS,GEN_MINUTES,genPool,generateMobility,replaceMove,equipLabel,GEN_PREP,GEN_POS_PREP,GEN_ROUND_PREP});
window.ForgeLayoutBMobility=Object.freeze({hasSides,buildPhases,totalSeconds,minutesLabel,clock,firstPhaseOf,isToday,PREP,SIDE_PREP,
 categoryOf,extras,withExtras,videoList,filterVideos,plannable,assignVideo,VIDEO_AREAS,VIDEO_MINS});
if(typeof document==='undefined')return;

/* ---------- environment ---------- */
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function cfg(){try{return typeof mobConfig==='function'?mobConfig():(state.mobility||{});}catch(e){return {};}}
function routines(){try{return typeof MOB_ROUTINES!=='undefined'?MOB_ROUTINES:{};}catch(e){return {};}}
function routine(){const c=cfg();const r=routines()[c.routine||'gentle'];return r&&Array.isArray(r.items)&&r.items.length?{key:c.routine||'gentle',name:r.name,items:r.items}:null;}
let lib=null;
function guides(){try{return typeof FORGE_EX_GUIDES!=='undefined'?FORGE_EX_GUIDES:{};}catch(e){return {};}}
function loadLib(){if(lib)return Promise.resolve(lib);return fetch('./exercise-plus-data.json',{cache:'force-cache'}).then(r=>r.json()).then(d=>{lib=withExtras(Array.isArray(d.mobility)?d.mobility:[],guides());return lib;}).catch(()=>{lib=[];return lib;});}
function guide(name){
 try{if(typeof FORGE_EX_GUIDES!=='undefined'&&FORGE_EX_GUIDES[name])return {steps:FORGE_EX_GUIDES[name][0]||[],tip:FORGE_EX_GUIDES[name][1]||''};}catch(e){}
 const x=(lib||[]).find(e=>e.name===name);
 return x?{steps:x.steps||[],tip:x.tip||''}:{steps:[],tip:''};
}
function images(name){
 if(BAND_IMAGES[name])return [BAND_IMAGES[name]];
 try{const m=typeof forgeMobImage==='function'?forgeMobImage(name):null;if(Array.isArray(m)&&m.length)return m.slice(0,2);}catch(e){}
 try{
  const fn=window.forgeExerciseIllustrations||window.forgePublicExercisePictures;
  const html=typeof fn==='function'?fn(name):'';
  if(html){const d=document.createElement('div');d.innerHTML=html;const src=[...d.querySelectorAll('img')].map(i=>i.getAttribute('src')).filter(Boolean);if(src.length)return src.slice(0,1);}
 }catch(e){}
 return [];
}
function localDay(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const todayIdx=()=>(new Date().getDay()+6)%7;
function trainedToday(){
 try{const t=localDay(new Date());return (state.workouts||[]).some(w=>w&&w.date&&localDay(new Date(w.date))===t);}catch(e){return false;}
}
function store(){try{if(typeof save==='function')save();}catch(e){console.error('FORGE Mobilität speichern',e);}}

const ICON={
 x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 play:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
 pause:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
 prev:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
 next:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
 flow:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M12 7v6M7 10l5 3 5-3M9 21l3-8 3 8"/></svg>',
 video:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>',
 back:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>',
 check:'<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L19 7"/></svg>'
};

const K='.forge-lb-mobstart',R='.forge-lb-mobrun';
const CSS=`
${K}{background:linear-gradient(160deg,#1d3b3a,#171e2a 62%);border:1px solid #2f6a62;border-radius:24px;padding:18px;margin:4px 0 14px;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:12px}
${K} .ms-kick{font-size:12px;color:${TEAL};font-weight:800;text-transform:uppercase;letter-spacing:1.4px}
${K} h3{margin:0;font-size:22px;font-weight:800;line-height:1.2;color:#f3f7fc}
${K} .ms-sub{font-size:14px;color:#c3cddb}
${K} .ms-list{display:flex;flex-direction:column;gap:6px}
${K} .ms-row{display:flex;align-items:center;gap:10px;background:#0f1620cc;border-radius:14px;padding:6px 12px 6px 6px}
${K} .ms-th{width:40px;height:40px;flex:0 0 40px;border-radius:10px;overflow:hidden;background:#202a38;display:flex;align-items:center;justify-content:center;color:${TEAL}}
${K} .ms-th img{width:100%;height:100%;object-fit:cover;display:block}
${K} .ms-row b{flex:1;font-size:14px;font-weight:600;min-width:0;overflow-wrap:anywhere;hyphens:auto}
${K} .ms-row em{flex:0 0 auto;font-style:normal;font-size:12px;color:#95a3b7;white-space:nowrap}
${K} .ms-go{height:60px;border-radius:30px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px}
${K} .ms-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px;margin-top:4px}
${K} .ms-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
${K} .ms-tile{min-height:72px;border-radius:18px;border:1px solid #293346;background:#0f1620;color:#f3f7fc;font:inherit;text-align:left;padding:10px 12px;display:flex;flex-direction:column;justify-content:center;gap:2px}
${K} .ms-tile b{font-size:15px;font-weight:700;overflow-wrap:anywhere}
${K} .ms-tile span{font-size:12px;color:#95a3b7}
${K} .ms-sec{height:46px;border-radius:23px;border:1px solid #2f6a62;background:transparent;color:#f3f7fc;font:inherit;font-size:14px;font-weight:700}
${K} .ms-meta{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
${K} .ms-meta span{font-size:12px;border-radius:12px;background:#0f1620;color:#c3cddb;padding:5px 0;text-align:center}
${K} .ms-meta span.on{background:${TEAL};color:#062420;font-weight:800}
body.forge-layout-b #mobWorkout .forge-lb-mob-hidden{display:none!important}
body.forge-layout-b #forgeVideoLibrary,body.forge-layout-b #forge149MobilityCard>.forge-mob-head{display:none!important}
${K} .ms-link{border:0;background:transparent;color:${TEAL};font:inherit;font-size:14px;font-weight:700;padding:8px 2px;min-height:44px;text-align:center}
.forge-lb-mobvideo{width:100%;display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:20px;padding:12px 14px;margin:0 0 14px;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;text-align:left;min-height:68px;box-sizing:border-box}
.forge-lb-mobvideo>i{width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:#14302d;color:${TEAL};display:flex;align-items:center;justify-content:center}
.forge-lb-mobvideo>span:not(.mv-chev){flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.forge-lb-mobvideo b{font-size:15px;font-weight:700}
.forge-lb-mobvideo small{font-size:12px;color:#95a3b7}
.forge-lb-mobvideo .mv-chev{color:#95a3b7;display:flex}
.forge-lb-vshade{position:fixed;inset:0;z-index:2147480400;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-vsheet{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;height:calc(100% - 24px - env(safe-area-inset-top));display:flex;flex-direction:column;padding:10px 16px calc(14px + env(safe-area-inset-bottom))}
.forge-lb-vsheet .vs-handle{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center;flex:0 0 auto}
.forge-lb-vsheet .vs-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0 6px;flex:0 0 auto}
.forge-lb-vsheet h2{margin:0;font-size:22px;font-weight:800;line-height:1.2}
.forge-lb-vsheet .vs-top small{display:block;font-size:13px;color:#95a3b7;margin-top:2px}
.forge-lb-vsheet .vs-x{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
.forge-lb-vsheet .vs-back{border:0;background:transparent;color:${TEAL};font:inherit;font-size:14px;font-weight:700;display:flex;align-items:center;gap:4px;padding:0;min-height:44px}
.forge-lb-vsheet .vs-body{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:4px 0 8px;scrollbar-width:none;overscroll-behavior:contain}
.forge-lb-vsheet .vs-body::-webkit-scrollbar{display:none}
.forge-lb-vsheet .vs-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;flex:0 0 auto;padding:1px 0}
.forge-lb-vsheet .vs-chips::-webkit-scrollbar{display:none}
.forge-lb-vsheet .vs-chips button{flex:0 0 auto;height:40px;border-radius:20px;border:1px solid #293346;background:#171e2a;color:#c3cddb;font:inherit;font-size:14px;font-weight:600;padding:0 14px;white-space:nowrap}
.forge-lb-vsheet .vs-chips button[aria-pressed="true"]{background:${TEAL};border-color:${TEAL};color:#062420;font-weight:800}
.forge-lb-vsheet .vs-search{display:flex;align-items:center;gap:8px;height:48px;border-radius:24px;border:1px solid #293346;background:#171e2a;padding:0 14px;color:#95a3b7;flex:0 0 auto}
.forge-lb-vsheet .vs-search input{flex:1;min-width:0;border:0;background:transparent;color:#f3f7fc;font:inherit;font-size:16px;outline:none}
.forge-lb-vsheet .vs-count{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.2px;padding:2px 2px 0}
.forge-lb-vsheet .vs-list{display:flex;flex-direction:column;gap:8px}
.forge-lb-vsheet .vs-card{display:flex;align-items:center;gap:12px;background:#171e2a;border:1px solid #293346;border-radius:18px;padding:8px 12px 8px 8px;color:#f3f7fc;font:inherit;text-align:left;min-height:72px}
.forge-lb-vsheet .vs-thumb{width:96px;height:54px;flex:0 0 96px;border-radius:10px;overflow:hidden;background:#14302d;display:flex;align-items:center;justify-content:center;color:${TEAL}}
.forge-lb-vsheet .vs-thumb img,.forge-lb-vsheet .vs-hero img{width:100%;height:100%;object-fit:cover;display:block}
.forge-lb-vsheet .vs-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.forge-lb-vsheet .vs-t b{font-size:15px;font-weight:700;overflow-wrap:anywhere}
.forge-lb-vsheet .vs-t small{font-size:12px;color:#95a3b7}
.forge-lb-vsheet .vs-hero{position:relative;width:100%;aspect-ratio:16/9;border-radius:18px;overflow:hidden;background:#14302d;display:flex;align-items:center;justify-content:center;color:${TEAL};flex:0 0 auto;cursor:pointer}
.forge-lb-vsheet .vs-play{position:absolute;width:60px;height:60px;border-radius:30px;background:rgba(11,16,24,.72);color:#f3f7fc;display:flex;align-items:center;justify-content:center}
.forge-lb-vsheet .vs-meta{font-size:14px;color:${TEAL};font-weight:600}
.forge-lb-vsheet .vs-note{margin:0;font-size:13px;color:#95a3b7;line-height:1.45}
.forge-lb-vsheet .vs-go{height:56px;border-radius:28px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:17px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;flex:0 0 auto}
.forge-lb-vsheet .vs-sec{min-height:50px;border-radius:25px;border:1px solid #2f6a62;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;flex:0 0 auto}
.forge-lb-vsheet .vs-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.2px}
.forge-lb-vsheet .vs-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.forge-lb-vsheet .vs-days button{height:46px;border-radius:14px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:14px;font-weight:700;padding:0}
.forge-lb-vsheet .vs-days button.busy{border-color:#2f6a62;background:#14302d}
.forge-lb-vsheet .vs-toast{background:#14302d;border:1px solid #2f6a62;border-radius:14px;padding:10px 12px;font-size:14px;font-weight:700;color:#d6f7f0}
.forge-lb-vsheet button:focus-visible{outline:2px solid ${TEAL};outline-offset:2px}
${R}{position:fixed;inset:0;z-index:2147480200;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column}
${R} .mr-in{flex:1;min-height:0;display:flex;flex-direction:column;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;padding:calc(14px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));gap:10px}
${R} .mr-top{display:flex;align-items:center;gap:12px;min-height:44px}
${R} .mr-round{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${R} .mr-prog{flex:1;display:flex;gap:4px}
${R} .mr-prog i{flex:1;height:5px;border-radius:3px;background:#293346;display:block}
${R} .mr-prog i.done{background:${TEAL}}
${R} .mr-prog i.cur{background:linear-gradient(90deg,${TEAL} var(--p,0%),#293346 var(--p,0%))}
${R} .mr-count{font-size:13px;color:#95a3b7;font-weight:600;min-width:34px;text-align:right}
${R} .mr-media{flex:1 1 auto;min-height:120px;border-radius:22px;overflow:hidden;background:#10161f;display:flex;flex-direction:column;gap:4px;position:relative}
${R} .mr-media img{min-height:0}
${R} .mr-media img{flex:1;min-width:0;height:100%;object-fit:contain;display:block;background:#10161f}
${R} .mr-media.none{align-items:center;justify-content:center;color:#2f6a62}
${R} .mr-badge{position:absolute;left:10px;top:10px;height:28px;border-radius:14px;background:#0b1018d9;color:${TEAL};font-size:12px;font-weight:800;padding:0 12px;display:flex;align-items:center}
${R} .mr-name{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
${R} .mr-name h2{margin:0;font-size:clamp(21px,6.4vw,26px);font-weight:800;line-height:1.15;overflow-wrap:anywhere}
${R} .mr-name small{display:block;font-size:13px;color:#95a3b7;margin-top:3px}
${R} .mr-how{flex:0 0 auto;border:0;background:transparent;color:${TEAL};font:inherit;font-size:13px;font-weight:700;padding:6px 0;white-space:nowrap}
${R} .mr-timer{display:flex;align-items:center;gap:16px;background:#171e2a;border:1px solid #293346;border-radius:22px;padding:12px 16px}
${R} .mr-ring{width:96px;height:96px;flex:0 0 96px;position:relative}
${R} .mr-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
${R} .mr-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;font-variant-numeric:tabular-nums}
${R} .mr-state{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
${R} .mr-state strong{font-size:17px;font-weight:800}
${R} .mr-state span{font-size:13px;color:#95a3b7;line-height:1.4}
${R} .mr-state.prep strong{color:#ffb547}
${R} .mr-ctrl{display:grid;grid-template-columns:56px minmax(0,1fr) 56px;gap:10px;align-items:center}
${R} .mr-side{height:56px;border-radius:28px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;display:flex;align-items:center;justify-content:center;padding:0}
${R} .mr-side:disabled{opacity:.35}
${R} .mr-main{height:64px;border-radius:32px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px}
${R} .mr-done{flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px}
${R} .mr-done-icon{width:76px;height:76px;border-radius:26px;background:${TEAL};color:#062420;display:flex;align-items:center;justify-content:center}
${R} .mr-done h2{margin:0;font-size:28px;font-weight:800}
${R} .mr-sum{border-radius:22px;background:linear-gradient(160deg,#1d3b3a,#171e2a 65%);border:1px solid #2f6a62;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
${R} .mr-sum div{display:flex;justify-content:space-between;gap:12px;font-size:15px}
${R} .mr-sum span{color:#c3cddb}
${R} .mr-sec{height:52px;border-radius:26px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:16px;font-weight:700}
${R} button:focus-visible,${K} button:focus-visible{outline:2px solid ${TEAL};outline-offset:2px}
.forge-lb-mob-shade{position:fixed;inset:0;z-index:2147480400;background:#05080dcc;display:flex;flex-direction:column;justify-content:flex-end;font-family:Inter,system-ui,sans-serif;color:#f3f7fc}
.forge-lb-mob-sheet{background:#111723;border-top:1px solid #3a4556;border-radius:28px 28px 0 0;padding:12px 16px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;max-height:86vh}
.forge-lb-mob-sheet .h{width:44px;height:5px;border-radius:3px;background:#3a4556;align-self:center;flex:0 0 auto}
.forge-lb-mob-sheet strong{font-size:22px;font-weight:800}
.forge-lb-mob-sheet p{margin:0;font-size:14px;color:#c3cddb;line-height:1.5}
.forge-lb-mob-sheet ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.5;color:#c3cddb;overflow-y:auto}
.forge-lb-mob-sheet .tip{background:#14302d;border-radius:14px;padding:10px 12px;font-size:13px;color:#d6f7f0}
.forge-lb-mob-sheet .m{height:56px;border-radius:28px;border:0;background:${TEAL};color:#062420;font:inherit;font-size:17px;font-weight:800}
.forge-lb-mob-sheet .s{height:50px;border-radius:25px;border:1px solid #3a4556;background:#171e2a;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
.forge-lb-mob-sheet .d{height:50px;border-radius:25px;border:1px solid #4a2630;background:transparent;color:#ffc6c6;font:inherit;font-size:15px;font-weight:700}
@media (max-height:700px){${R} .mr-ring{width:80px;height:80px;flex-basis:80px}${R} .mr-ring b{font-size:22px}${R} .mr-main{height:56px}${R} .mr-side{height:50px}}
`;
function ensureCss(){if(!$('forgeLayoutBMobilityCss')){const s=el('style');s.id='forgeLayoutBMobilityCss';s.textContent=CSS;document.head.append(s);}}

/* ---------- start card in Workout › Mobilität ---------- */
function thumb(name){const t=el('span','ms-th');const src=images(name)[0];if(src){const i=el('img');i.src=src;i.alt='';i.loading='lazy';t.append(i);}else t.innerHTML=ICON.flow;return t;}
let showList=false;
function toPlan(){
 try{if(typeof window.go==='function')window.go('plan');}catch(e){}
 setTimeout(()=>{if(typeof window.ForgeLayoutBWizardOpen==='function')window.ForgeLayoutBWizardOpen('mobility');},120);
}
/* Training › Mobilität: genau eine Routine-Karte + Videokachel. Pläne entstehen nur im Plan. */
function renderCard(){
 if(!enabled())return;
 const host=$('mobWorkout');if(!host)return;
 ensureCss();
 let card=host.parentElement.querySelector(':scope > .forge-lb-mobstart');
 if(!card){card=el('section','forge-lb-mobstart');host.before(card);}
 card.replaceChildren();
 const c=cfg(),r=routine();
 if(!c.enabled||!r){
  card.append(el('div','ms-kick',run()?'Läuft gerade':'Deine Mobilitätsroutine'),el('h3','',run()?(run().name||'Mobilität'):'Noch keine Routine'));
  if(run()){
   const go=btn('ms-go','',()=>startRun());go.innerHTML=ICON.play+'<span>Mobilität fortsetzen</span>';card.append(go);
  }else{
   card.append(el('div','ms-sub','Lege deine Routine im Plan fest – an festen Tagen oder nach dem Krafttraining.'));
   card.append(btn('ms-go','Routine im Plan erstellen',toPlan));
   const g=routines().gentle;
   if(g&&Array.isArray(g.items)&&g.items.length)card.append(btn('ms-link','Ohne Plan: '+g.name+' ('+minutesLabel(totalSeconds(g.items,lib))+') starten',()=>startRun('gentle')));
  }
  videoTile(card);hideLegacy();return;
 }
 const today=isToday(c,todayIdx(),trainedToday());
 const logs=Array.isArray(c.logs)?c.logs:[];
 const done=logs.some(l=>l&&l.date&&localDay(new Date(l.date))===localDay(new Date()));
 card.append(el('div','ms-kick',done?'Heute erledigt ✓':today?'Heute dran':'Deine Mobilitätsroutine'));
 card.append(el('h3','',r.name));
 const rounds=Math.max(1,...r.items.map(it=>it&&it[3]&&it[3].rounds||1));const uniq=r.items.filter(it=>!(it&&it[3]&&it[3].round>1));
 card.append(el('div','ms-sub',uniq.length+' Übungen'+(rounds>1?' · '+rounds+' Runden':'')+' · '+minutesLabel(rounds>1||r.items.some(it=>it&&it[3])?buildPhases(r.items,lib).reduce((a,p)=>a+p.secs,0):totalSeconds(r.items,lib))+' · '+(c.timing==='after'?'nach dem Krafttraining':c.timing==='both'?'Ruhetage & nach dem Training':'an Ruhetagen')));
 if(c.timing!=='after'){
  const meta=el('div','ms-meta');['Mo','Di','Mi','Do','Fr','Sa','So'].forEach((d,i)=>{const s=el('span',(c.weekdays||[]).includes(i)?'on':'',d);meta.append(s);});card.append(meta);
 }
 const go=btn('ms-go','',()=>startRun());go.innerHTML=ICON.play+'<span>'+(run()?'Mobilität fortsetzen':done?'Noch einmal starten':'Mobilität starten')+'</span>';
 card.append(go);
 const tog=btn('ms-sec',showList?'Routine einklappen':'Routine ansehen',()=>{showList=!showList;renderCard();});tog.setAttribute('aria-expanded',String(showList));
 card.append(tog);
 if(showList){
  const list=el('div','ms-list');
  r.items.filter(it=>!(it&&it[3]&&it[3].round>1)).forEach(it=>{const row=el('div','ms-row');row.append(thumb(it[0]),el('b','',it[0]),el('em','',it[1]+' Sek.'+(hasSides(it,lib)?' je Seite':'')));list.append(row);});
  card.append(list);
 }
 if(logs.length)card.append(el('div','ms-sub',logs.length+'× erledigt'));
 videoTile(card);hideLegacy();
}
function videoCatalog(){try{return typeof MOB_VIDEO_CATALOG!=='undefined'?MOB_VIDEO_CATALOG:{};}catch(e){return {};}}
function videoTile(card){
 const n=videoList(videoCatalog()).length;
 let tile=card.parentElement.querySelector(':scope > .forge-lb-mobvideo');
 if(!n){tile?.remove();return;}
 if(!tile){tile=btn('forge-lb-mobvideo','',()=>openVideos());card.after(tile);}
 else if(tile.previousElementSibling!==card)card.after(tile);
 tile.replaceChildren();
 const i=el('i');i.innerHTML=ICON.video;const t=el('span');t.append(el('b','','Yoga & Mobilitätsvideos'),el('small','',n+' Videos · 5–30 Min.'));
 const c=el('span','mv-chev');c.innerHTML=ICON.next;
 tile.append(i,t,c);
}
/* ---------- Video-Bibliothek (Bottom Sheet) ---------- */
let vsheet=null,vstate=null;
const AREA_NAME=Object.fromEntries(VIDEO_AREAS);
function openUrl(url){
 try{if(window.ForgeAndroid&&typeof window.ForgeAndroid.openExternal==='function'){window.ForgeAndroid.openExternal(url);return;}}catch(e){}
 try{window.open(url,'_blank','noopener');}catch(e){}
}
function closeVideos(){if(vsheet){vsheet.remove();vsheet=null;vstate=null;document.removeEventListener('keydown',vKey,true);}}
function vKey(e){if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();if(vstate&&vstate.detail){vstate.detail=null;vstate.plan=false;renderVideos();}else closeVideos();}
function openVideos(){
 if(!enabled())return false;
 ensureCss();closeVideos();
 vstate={area:'all',mins:0,q:'',detail:null,plan:false,toast:''};
 vsheet=el('div','forge-lb-vshade');vsheet.addEventListener('click',e=>{if(e.target===vsheet)closeVideos();});
 document.body.append(vsheet);document.addEventListener('keydown',vKey,true);
 renderVideos();return true;
}
function thumbFor(v,cls){
 const t=el('span',cls);
 if(v.id){const i=el('img');i.alt='';i.loading='lazy';i.src='https://i.ytimg.com/vi/'+v.id+'/mqdefault.jpg';i.addEventListener('error',()=>{i.remove();t.classList.add('none');t.innerHTML=ICON.video;});t.append(i);}
 else{t.classList.add('none');t.innerHTML=ICON.video;}
 return t;
}
function chipRow(label,items,cur,pick){
 const row=el('div','vs-chips');row.setAttribute('role','group');row.setAttribute('aria-label',label);
 items.forEach(([v,t])=>{const b=btn('',t,()=>pick(v));b.setAttribute('aria-pressed',String(String(v)===String(cur)));row.append(b);});
 return row;
}
function renderVideos(){
 if(!vsheet||!vstate)return;
 const all=videoList(videoCatalog());
 const sh=el('div','forge-lb-vsheet');sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');
 sh.append(el('div','vs-handle'));
 const x=btn('vs-x','',closeVideos);x.innerHTML=ICON.x;x.setAttribute('aria-label','Schließen');
 if(vstate.detail){
  const v=vstate.detail;sh.setAttribute('aria-label',v.title);
  const top=el('div','vs-top');const back=btn('vs-back','',()=>{vstate.detail=null;vstate.plan=false;renderVideos();});back.innerHTML=ICON.back+'<span>Zurück zur Bibliothek</span>';top.append(back,x);sh.append(top);
  const body=el('div','vs-body');
  const hero=thumbFor(v,'vs-hero');const play=el('i','vs-play');play.innerHTML=ICON.play;hero.append(play);hero.addEventListener('click',()=>openUrl(v.url));
  body.append(hero,el('h2','',v.title));
  body.append(el('div','vs-meta',[v.creator,v.mins+' Min.',AREA_NAME[v.area]||'',v.yoga?'Yoga':'Mobilität'].filter(Boolean).join(' · ')));
  body.append(el('p','vs-note','Das Video öffnet sich in YouTube. Verfügbarkeit und genaue Länge können abweichen.'));
  const go=btn('vs-go','',()=>openUrl(v.url));go.innerHTML=ICON.play+'<span>Video starten</span>';body.append(go);
  if(plannable(v)){
   if(!vstate.plan)body.append(btn('vs-sec','Für Wochenplan vormerken',()=>{vstate.plan=true;renderVideos();}));
   else{
    body.append(el('div','vs-label','An welchem Tag?'));
    const cur=(typeof state!=='undefined'&&Array.isArray(state.videoAssignments))?state.videoAssignments:[];
    const days=el('div','vs-days');
    ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach((d,i)=>{const has=cur.find(a=>a&&a.day===i);
     const b=btn('',d,()=>{try{state.videoAssignments=assignVideo(cur,i,v);store();if(typeof window.render==='function')window.render();}catch(e){console.error('FORGE Video vormerken',e);}
      vstate.plan=false;vstate.toast='Für '+['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][i]+' vorgemerkt';renderVideos();});
     if(has)b.classList.add('busy');b.setAttribute('aria-label',d+(has?' (ersetzt das vorgemerkte Video)':''));days.append(b);});
    body.append(days,el('p','vs-note','Ein schon vorgemerktes Video an diesem Tag wird ersetzt. Ändern kannst du das im Plan.'));
   }
  }
  if(vstate.toast){body.append(el('div','vs-toast',vstate.toast));vstate.toast='';}
  sh.append(body);
 }else{
  sh.setAttribute('aria-label','Video-Bibliothek');
  const top=el('div','vs-top');const h=el('div');h.append(el('h2','','Video-Bibliothek'),el('small','','Yoga & Mobilität · öffnet in YouTube'));top.append(h,x);sh.append(top);
  const body=el('div','vs-body');
  body.append(chipRow('Bereich',[['all','Alle'],...VIDEO_AREAS],vstate.area,v=>{vstate.area=v;renderVideos();}));
  body.append(chipRow('Dauer',[[0,'Alle'],...VIDEO_MINS.map(m=>[m,m+' Min.'])],vstate.mins,v=>{vstate.mins=Number(v);renderVideos();}));
  const lab=el('label','vs-search');lab.innerHTML=ICON.search;const inp=el('input');inp.type='search';inp.placeholder='Video suchen';inp.value=vstate.q;inp.setAttribute('aria-label','Video suchen');
  inp.addEventListener('input',()=>{vstate.q=inp.value;fillList();});lab.append(inp);body.append(lab);
  const count=el('div','vs-count');const list=el('div','vs-list');body.append(count,list);
  const fillList=()=>{
   const shown=filterVideos(all,vstate);
   count.textContent=shown.length+(shown.length===1?' Video':' Videos');
   list.replaceChildren(...shown.map(v=>{const b=btn('vs-card','',()=>{vstate.detail=v;renderVideos();});
    const t=el('span','vs-t');t.append(el('b','',v.title),el('small','',[v.creator,v.mins+' Min.',AREA_NAME[v.area]||''].filter(Boolean).join(' · ')));
    b.append(thumbFor(v,'vs-thumb'),t);return b;}));
   if(!shown.length)list.append(el('p','vs-note','Keine Videos für diese Auswahl.'));
  };
  fillList();sh.append(body);
 }
 vsheet.replaceChildren(sh);
}
window.ForgeLayoutBMobilityVideos=openVideos;
/* The legacy routine list and „Routine abgeschlossen“ are replaced by the card;
   scheduled videos stay visible. */
function hideLegacy(){
 const host=$('mobWorkout');if(!host)return;
 const kids=[...host.children];
 const h3=kids.find(k=>k.tagName==='H3'&&/Eigene Mobilitätsübungen/.test(k.textContent));
 let hiding=false;
 kids.forEach((k,i)=>{
  if(k===h3)hiding=true;
  const intro=i===0&&k.tagName==='P'&&/Video-Wochenplan erscheinen/.test(k.textContent);
  const empty=k.tagName==='P'&&/Noch keine Videos geplant/.test(k.textContent);
  k.classList.toggle('forge-lb-mob-hidden',hiding||intro||empty);
 });
}

/* ---------- live session ---------- */
let root=null,timer=null,wake=null;
function run(){try{return state.forgeLbMobRun||null;}catch(e){return null;}}
function setRun(r){state.forgeLbMobRun=r;store();}
function phasesOf(r){return buildPhases(r.items,lib);}
function remaining(r){
 if(!r)return 0;
 if(r.running&&r.endsAt)return Math.max(0,(r.endsAt-Date.now())/1000);
 return Math.max(0,Number(r.left)||0);
}
function startRun(key){
 if(!enabled())return;
 const existing=run();
 if(existing&&Array.isArray(existing.items)&&existing.items.length){openRun();return;}
 let r=routine();
 if(typeof key==='string'){const x=routines()[key];if(x&&Array.isArray(x.items)&&x.items.length)r={key,name:x.name,items:x.items};}
 if(!r)return;
 loadLib().then(()=>{
  const ph=buildPhases(r.items,lib);
  setRun({routine:r.key,name:r.name,items:r.items.map(x=>x.slice()),phase:0,running:true,endsAt:Date.now()+ph[0].secs*1000,left:ph[0].secs,startedAt:Date.now(),pausedMs:0,pausedAt:0});
  openRun();
 });
}
function openRun(){
 ensureCss();
 if(!root){
  root=el('div','forge-lb-mobrun');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Mobilität');
  document.body.append(root);document.body.classList.add('forge-lb-mobrun-open');
 }
 try{navigator.wakeLock?.request('screen').then(w=>{wake=w;}).catch(()=>{});}catch(e){}
 if(!timer)timer=setInterval(tick,250);
 render();
}
function closeRun(){
 if(timer){clearInterval(timer);timer=null;}
 try{wake?.release?.();}catch(e){}wake=null;
 closeSheet();
 if(root){root.remove();root=null;}
 document.body.classList.remove('forge-lb-mobrun-open');
 renderCard();
}
function buzz(p){try{navigator.vibrate?.(p);}catch(e){}}
function goPhase(i,keepRunning){
 const r=run();if(!r)return;
 const ph=phasesOf(r);
 if(i>=ph.length){finishRun();return;}
 i=Math.max(0,i);
 const running=keepRunning===undefined?r.running:keepRunning;
 r.phase=i;r.left=ph[i].secs;r.endsAt=running?Date.now()+ph[i].secs*1000:0;r.running=running;
 if(!running&&!r.pausedAt)r.pausedAt=Date.now();
 if(running&&r.pausedAt){r.pausedMs=(r.pausedMs||0)+(Date.now()-r.pausedAt);r.pausedAt=0;}
 setRun(r);render();
}
function tick(){
 const r=run();if(!r||!root){return;}
 if(r.done)return;
 const left=remaining(r);
 if(r.running&&left<=0){
  const ph=phasesOf(r);const cur=ph[r.phase];
  buzz(cur&&cur.kind==='work'?[220,90,220]:[120]);
  goPhase(r.phase+1,true);return;
 }
 const b=root.querySelector('.mr-ring b');if(b)b.textContent=clock(left);
 const arc=root.querySelector('.mr-ring .arc');
 if(arc){const ph=phasesOf(r)[r.phase];const f=ph?1-left/ph.secs:0;arc.setAttribute('stroke-dashoffset',String(CIRC*(1-Math.min(1,Math.max(0,f)))));}
 const cur=root.querySelector('.mr-prog i.cur');
 if(cur){const ph=phasesOf(r);const ex=ph[r.phase]?.ex;const parts=ph.filter(p=>p.ex===ex);const before=parts.slice(0,parts.indexOf(ph[r.phase])).reduce((a,p)=>a+p.secs,0);const all=parts.reduce((a,p)=>a+p.secs,0);cur.style.setProperty('--p',Math.round((before+(ph[r.phase].secs-left))/all*100)+'%');}
}
function toggle(){
 const r=run();if(!r)return;
 if(r.running){r.left=remaining(r);r.running=false;r.endsAt=0;r.pausedAt=Date.now();}
 else{r.running=true;r.endsAt=Date.now()+Math.max(1,r.left)*1000;if(r.pausedAt){r.pausedMs=(r.pausedMs||0)+(Date.now()-r.pausedAt);r.pausedAt=0;}}
 setRun(r);render();
}
function stepExercise(delta){
 const r=run();if(!r)return;
 const ph=phasesOf(r);const ex=ph[r.phase]?.ex||0;
 const target=Math.max(0,Math.min(r.items.length,ex+delta));
 if(target>=r.items.length){finishRun();return;}
 goPhase(firstPhaseOf(ph,target));
}
const CIRC=2*Math.PI*44;
function render(){
 const r=run();if(!root)return;
 if(!r){closeRun();return;}
 root.replaceChildren();
 const inner=el('div','mr-in');root.append(inner);
 if(r.done){renderDone(inner,r);return;}
 const ph=phasesOf(r);const p=ph[r.phase]||ph[0];const item=r.items[p.ex];
 const top=el('div','mr-top');
 const x=btn('mr-round','',askEnd);x.innerHTML=ICON.x;x.setAttribute('aria-label','Mobilität beenden');
 const prog=el('div','mr-prog');r.items.forEach((_,i)=>{const s=el('i',i<p.ex?'done':i===p.ex?'cur':'');prog.append(s);});
 top.append(x,prog,el('div','mr-count',(p.ex+1)+'/'+r.items.length));inner.append(top);
 const media=el('div','mr-media');const imgs=images(item[0]);
 if(imgs.length)imgs.forEach(src=>{const i=el('img');i.src=src;i.alt=item[0];media.append(i);});else{media.classList.add('none');media.innerHTML=ICON.flow.replace('width="22" height="22"','width="64" height="64"');}
 if(p.side)media.append(el('span','mr-badge','Seite '+p.sideNo+' von 2 · '+p.side));
 inner.append(media);
 const nm=el('div','mr-name');const t=el('div');t.append(el('h2','',item[0]),el('small','',(item[3]&&item[3].rounds>1?'Runde '+item[3].round+'/'+item[3].rounds+' · ':'')+item[1]+' Sek.'+(hasSides(item,lib)?' je Seite':'')+(item[2]&&!(item[3]&&item[2]==='je Seite')?' · '+item[2]:'')));
 nm.append(t,btn('mr-how','Anleitung',()=>howSheet(item)));inner.append(nm);
 const tm=el('div','mr-timer');
 const ring=el('div','mr-ring');
 ring.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#293346" stroke-width="8"/><circle class="arc" cx="50" cy="50" r="44" fill="none" stroke="'+(p.kind==='prep'?'#ffb547':TEAL)+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+CIRC+'" stroke-dashoffset="'+CIRC+'"/></svg>';
 ring.append(el('b','',clock(remaining(r))));
 const st=el('div','mr-state'+(p.kind==='prep'?' prep':''));
 if(p.kind==='prep'){
  st.append(el('strong','',p.sideChange?'Seite wechseln':'Bereit machen'),el('span','',p.sideChange?'Gleich geht es mit der linken Seite weiter.':'Gleich: '+item[0]+'. Position einnehmen.'));
 }else{
  const nextEx=r.items[p.ex+1];
  st.append(el('strong','',r.running?(p.side?p.side+' halten':'Läuft'):'Pausiert'),el('span','',nextEx?'Danach: '+nextEx[0]:'Letzte Übung'));
 }
 tm.append(ring,st);inner.append(tm);
 const ctrl=el('div','mr-ctrl');
 const back=btn('mr-side','',()=>stepExercise(-1));back.innerHTML=ICON.prev;back.setAttribute('aria-label','Vorherige Übung');back.disabled=p.ex===0;
 const main=btn('mr-main','',toggle);main.innerHTML=(r.running?ICON.pause:ICON.play)+'<span>'+(r.running?'Pause':'Weiter')+'</span>';
 const fwd=btn('mr-side','',()=>stepExercise(1));fwd.innerHTML=ICON.next;fwd.setAttribute('aria-label',p.ex===r.items.length-1?'Abschließen':'Übung überspringen');
 ctrl.append(back,main,fwd);inner.append(ctrl);
 tick();
}
function netMs(r){const end=r.finishedAt||Date.now();const paused=(r.pausedMs||0)+(r.pausedAt?end-r.pausedAt:0);return Math.max(0,end-r.startedAt-paused);}
function finishRun(){
 const r=run();if(!r)return;
 if(r.pausedAt){r.pausedMs=(r.pausedMs||0)+(Date.now()-r.pausedAt);r.pausedAt=0;}
 r.running=false;r.endsAt=0;r.done=true;r.finishedAt=Date.now();
 const ph=phasesOf(r);r.reached=Math.min(r.items.length,(ph[r.phase]?.ex??r.items.length-1)+1);
 setRun(r);buzz([200,80,200,80,300]);render();
}
function renderDone(inner,r){
 const box=el('div','mr-done');
 const ic=el('div','mr-done-icon');ic.innerHTML=ICON.check;
 box.append(ic,el('h2','','Mobilität erledigt'));
 const sum=el('div','mr-sum');
 const mins=Math.max(1,Math.round(netMs(r)/60000));
 [['Routine',r.name],['Übungen',(r.reached||r.items.length)+' von '+r.items.length],['Dauer',mins+' Min.']].forEach(([k,v])=>{const d=el('div');d.append(el('span','',k),el('b','',v));sum.append(d);});
 box.append(sum);inner.append(box);
 const save=btn('mr-main','Speichern',()=>saveRun(true));save.innerHTML=ICON.check.replace('width="30" height="30"','width="22" height="22"')+'<span>Speichern</span>';
 inner.append(save,btn('mr-sec','Nicht speichern',()=>{setRun(null);closeRun();}));
}
/* Same record as completeMobility(), plus the measured duration. */
function saveRun(){
 const r=run();if(!r)return;
 try{
  const m=cfg();const logs=Array.isArray(m.logs)?m.logs.slice():[];
  logs.push({date:new Date(r.finishedAt||Date.now()).toISOString(),routine:r.routine,durationMs:netMs(r),exercises:r.reached||r.items.length});
  state.mobility={...m,logs};
  state.forgeLbMobRun=null;store();
  try{if(typeof window.render==='function')window.render();}catch(e){}
 }catch(e){console.error('FORGE Mobilität',e);}
 closeRun();
 // Stay on Workout › Mobilität so the updated card („Heute erledigt“) is visible.
 try{if(typeof window.go==='function')window.go('workout');document.querySelector('#forge150WorkoutModes button[data-mode="mobility"]')?.click();
  let n=document.querySelector('.forge-lb-mobstart');while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}
  setTimeout(()=>document.querySelector('.forge-lb-mobstart')?.scrollIntoView?.({block:'start'}),60);}catch(e){}
 toast('Mobilität gespeichert');
}
function toast(text){
 const t=el('div','',text);t.setAttribute('role','status');
 t.style.cssText='position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147480900;background:#171e2a;border:1px solid #2f6a62;color:#f3f7fc;border-radius:22px;padding:12px 18px;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 10px 28px #000a';
 document.body.append(t);setTimeout(()=>t.remove(),2400);
}

/* ---------- sheets ---------- */
let sheet=null;
function openSheet(label,build){
 closeSheet();
 const shade=el('div','forge-lb-mob-shade');shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-label',label);
 const s=el('div','forge-lb-mob-sheet');s.append(el('div','h'));shade.append(s);
 shade.addEventListener('click',e=>{if(e.target===shade)closeSheet();});
 document.body.append(shade);sheet=shade;build(s);
}
function closeSheet(){if(sheet){sheet.remove();sheet=null;}}
function howSheet(item){
 const g=guide(item[0]);
 openSheet('Anleitung: '+item[0],s=>{
  s.append(el('strong','',item[0]));
  if(item[2])s.append(el('p','',item[2]));
  if(g.steps.length){const ol=el('ol');g.steps.forEach(x=>ol.append(el('li','',x)));s.append(ol);}
  else s.append(el('p','','Ruhig und schmerzfrei bewegen. Nur so weit gehen, wie es angenehm ist.'));
  if(g.tip)s.append(el('div','tip',g.tip));
  s.append(btn('s','Schließen',closeSheet));
 });
}
function askEnd(){
 const r=run();if(!r)return;
 const ph=phasesOf(r);const ex=ph[r.phase]?.ex||0;
 openSheet('Mobilität beenden?',s=>{
  s.append(el('strong','','Mobilität beenden?'));
  s.append(el('p','',ex>0?'Du hast '+ex+' von '+r.items.length+' Übungen geschafft.':'Du bist noch bei der ersten Übung.'));
  if(ex>0)s.append(btn('m','Beenden & speichern',()=>{closeSheet();finishRun();}));
  s.append(btn('s','Weitermachen',closeSheet));
  s.append(btn('d','Abbrechen ohne Speichern',()=>{closeSheet();setRun(null);closeRun();}));
 });
}

/* ---------- install ---------- */
function install(){
 if(!document.body||!enabled())return false;
 if(typeof window.renderMobility==='function'&&!window.renderMobility.__forgeLB){
  const prev=window.renderMobility;
  const f=function(){const out=prev.apply(this,arguments);try{renderCard();}catch(e){console.error('FORGE B Mobilität',e);}return out;};
  f.__forgeLB=true;window.renderMobility=f;
 }
 loadLib().then(()=>{renderCard();if(run())openRun();});
 renderCard();
 window.ForgeLayoutBMobilityStart=startRun;
 return true;
}
function boot(){if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
