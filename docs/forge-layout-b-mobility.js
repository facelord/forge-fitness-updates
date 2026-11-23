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
const GEN_FOCUS=Object.freeze([['full','Ganzkörper'],['legs','Beine'],['shoulders','Schultern'],['core','Rumpf'],['back','Rücken']]);
const GEN_MINUTES=Object.freeze([5,10,15,20]);
const M=(name,f,pos,sides,req,opt)=>Object.freeze({name,f,pos,sides,req:req||[],opt:opt||[]});
const GEN_MOVES=Object.freeze([
 M('Sprunggelenk-Mobilisation an der Wand','B',1,true,['wand']),M('Fußkreisen','B',1,true),M('Fußsohle mit Ball mobilisieren','B',1,true,['ball']),
 M('Fersengleiten in Rückenlage','B',4,true,[],['matte']),M('Beinpendel vor und zurück','B',1,true,[],['wand']),M('Seitliches Beinpendel','B',1,true,[],['wand']),
 M('Hüftkreisen im Stand','BR',1,true),M('90/90-Vorbeuge','B',2,true,[],['matte']),M('Hüftkreise im Vierfüßlerstand','BR',3,true,[],['matte']),
 M('Quadrizeps-Dehnung im Stand','B',1,true,[],['wand']),M('Soleus-Dehnung mit gebeugtem Knie','B',1,true,[],['wand']),M('Hamstring-Dehnung mit Gurt','B',4,true,['gurt'],['matte']),
 M('Beckenkippen in Rückenlage','RU',4,false,[],['matte']),M('Beckenkreisen im Stand','RBU',1,false),M('Knie zur Brust in Rückenlage','RBU',4,true,[],['matte']),
 M('Thread the Needle','SRU',3,true,[],['matte']),M('Brustwirbelsäulenstreckung über Foam Roller','SRU',4,false,['rolle'],['matte']),M('Schulterkreisen','S',1,false),
 M('Schulterheben mit Stab','S',1,false,['stab']),M('Handgelenksmobilisation','S',1,true),M('Kindhaltung','RSU',3,false,[],['matte']),
 M('Herabschauender Hund','SBRU',3,false,[],['matte']),M('Liegender Twist','RU',4,true,[],['matte']),M('Hüftbeuger-Dehnung','BR',3,true,[],['matte']),
 M('Figure-Four-Dehnung','B',4,true,[],['matte']),M('Türrahmen-Brustdehnung','S',1,true,['tuer']),M('Waden-Dehnung','B',1,true,[],['wand']),
 M('Adduktoren-Rockback','B',3,true,[],['matte']),M('Wall Slides','SU',1,false,['wand']),M('Cat-Cow','RSU',3,false,[],['matte']),
 M('Brustwirbelsäulen-Rotation','SRU',3,true,[],['matte']),M('Tiefe Hocke mit Halt','B',1,false,[],['wand']),M('Low Lunge','BR',3,true,[],['matte']),
 M('Krieger II','BS',1,true),M('Sitzende Vorbeuge','BRU',2,false,[],['matte']),M('90/90 Hüftwechsel','B',2,false,[],['matte']),
 M('Kindhaltung mit Seitgriff','SRU',3,true,[],['matte']),
 M('Schulter-Dislocates mit Theraband','SU',1,false,['band']),M('Band-Außenrotation','S',1,true,['band']),M('Hamstring-Dehnung mit Theraband','B',4,true,['band'],['matte']),
 M('Sprunggelenk-Mobilisation mit Theraband','B',3,true,['band'],['matte']),M('Hüftbeuger-Dehnung mit Theraband','BR',3,true,['band'],['matte']),
 M('Handgelenksmobilisation mit Theraband','S',3,true,['band'],['matte']),
 M('Thoraxrotation im Vierfüßlerstand','SRU',3,true,[],['matte']),M('Seitliche Rumpfneigung im Stand','R',1,true),
 M('Brustwirbelsäulen-Extension im Stand','SRU',1,false),M('Handgelenksmobilisation im Vierfüßlerstand','S',3,false,[],['matte'])]);
/* Band-Variante und Grundübung nie zusammen in einer Routine. */
const GEN_TWIN=Object.freeze((()=>{const m={};[['Handgelenksmobilisation mit Theraband','Handgelenksmobilisation'],['Hamstring-Dehnung mit Theraband','Hamstring-Dehnung mit Gurt'],['Hüftbeuger-Dehnung mit Theraband','Hüftbeuger-Dehnung'],['Sprunggelenk-Mobilisation mit Theraband','Sprunggelenk-Mobilisation an der Wand']].forEach(([a,b])=>{m[a]=b;m[b]=a;});return m;})());
const GEN_FIRST_PREP=5,GEN_PREP=8,GEN_POS_PREP=10,GEN_ROUND_PREP=10,GEN_SIDE_PREP=SIDE_PREP;
function genRng(seed){let a=(Number(seed)>>>0)||1;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function genShuffle(list,rnd){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const FOCUS_LETTER={legs:'B',shoulders:'S',core:'R',back:'U'};
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
/* Yoga 2.0 (#72, 22.11.2026): Yoga-Bibliothek mit Metadaten für Katalog, Suche und Flow-Planer.
 * [Name, Aliasse, Phase, Level, Region, Modus, Sek., je Seite, Fokus, Schritte, Tipp, Tafel-Nr.]
 * Phase: 0 Ankommen · 1 Aufwärmen (Vierfüßler/Knie) · 2 Stand · 3 Boden · 4 Abschluss (Rückenlage) · 5 Endentspannung
 * Level: 1 Einsteiger · 2 Mittel · 3 Fortgeschritten. Fokus: g Ganzkörper · r Rücken · h Hüfte · b Beweglichkeit · e Entspannung · m Morgen-Energie
 * Bestehende Übungen (Kindhaltung, Cat-Cow, Low Lunge …) werden nur getaggt – keine Dubletten. */
const YOGA_POSES=Object.freeze([
 ['Leichter Sitz','Sukhasana · Schneidersitz · Easy Pose',0,1,'Atmung & Haltung','static',60,false,'gre',['Im Schneidersitz auf die Matte oder ein Kissen setzen.','Becken leicht aufrichten, Wirbelsäule lang, Schultern sinken.','Hände auf die Knie legen und ruhig durch die Nase atmen.'],'Knie höher als die Hüfte? Auf ein Kissen oder einen Block setzen.',1],
 ['Berghaltung','Tadasana · Mountain Pose',2,1,'Ganzkörper','static',30,false,'gm',['Hüftbreit stehen, Gewicht gleichmäßig auf beiden Füßen.','Beine aktiv, Becken neutral, Brustbein sanft heben.','Schultern locker, Scheitel nach oben, ruhig atmen.'],'Knie nicht durchdrücken.',2],
 ['Gestreckter Berg','Urdhva Hastasana · Arme nach oben',2,1,'Schultern & Flanken','static',20,false,'gm',['Aus der Berghaltung die Arme seitlich nach oben führen.','Arme lang strecken, Schultern weg von den Ohren.','Rippen bleiben unten, kein Hohlkreuz.'],'Arme schulterbreit lassen, wenn die Schultern eng sind.',3],
 ['Stehende Vorbeuge','Uttanasana · Forward Fold',2,1,'Beinrückseite & Rücken','static',30,false,'rbe',['Aus der Hüfte nach vorn beugen.','Knie bei Bedarf beugen, Hände zu Boden, Schienbein oder Block.','Kopf und Nacken locker hängen lassen.'],'Mit gebeugten Knien wieder hochrollen.',4],
 ['Halbe stehende Vorbeuge','Ardha Uttanasana · Halfway Lift',2,1,'Rücken & Beinrückseite','static',20,false,'rm',['Aus der Vorbeuge den Oberkörper halb anheben.','Hände an die Schienbeine oder auf Blöcke.','Rücken lang, Blick zum Boden.'],'Knie leicht beugen, damit der Rücken gerade bleibt.',5],
 ['Stuhlhaltung','Utkatasana · Chair Pose',2,1,'Beine & Gesäß','static',30,false,'gm',['Füße hüftbreit, Becken nach hinten unten schieben.','Knie zeigen in Richtung Zehen.','Arme nach oben, Brustbein heben, Rumpf aktiv.'],'Weniger tief gehen, wenn die Knie zwicken.',6],
 ['Hoher Ausfallschritt','High Lunge · Crescent Lunge',2,1,'Hüfte & Beine','static',30,true,'hgm',['Großer Schritt nach vorn, vorderes Knie über dem Sprunggelenk.','Hinteres Bein lang, Ferse nach hinten schieben.','Oberkörper aufrichten, Arme nach oben.'],'Hinteres Knie bei Bedarf auf der Matte ablegen.',7],
 ['Krieger I','Virabhadrasana I · Warrior I',2,1,'Beine & Hüfte','static',30,true,'gm',['Langer Schritt, hinterer Fuß ca. 45° ausgedreht.','Vorderes Knie über dem Sprunggelenk beugen, Becken nach vorn.','Arme nach oben strecken, Schultern locker.'],'Schritt verkürzen, wenn das Becken nicht nach vorn zeigt.',9],
 ['Krieger II','Virabhadrasana II · Warrior II',2,1,'Beine & Hüfte','static',30,true,'ghm',['Breiter Stand, vorderer Fuß nach vorn, hinterer leicht einwärts.','Vorderes Knie über dem Sprunggelenk beugen.','Arme auf Schulterhöhe ausstrecken, Blick über die vordere Hand.'],'Knie nicht nach innen fallen lassen.',10],
 ['Umgekehrter Krieger','Viparita Virabhadrasana · Reverse Warrior',2,1,'Flanke & Hüfte','static',25,true,'bm',['Aus dem Krieger II starten.','Hintere Hand locker auf den hinteren Oberschenkel legen.','Vorderen Arm lang über den Kopf führen, Flanke öffnen.'],'Nicht auf das hintere Bein stützen.',11],
 ['Gestreckter Seitenwinkel','Utthita Parsvakonasana · Extended Side Angle',2,1,'Flanke & Beine','static',30,true,'bg',['Aus dem Krieger II den Unterarm auf den vorderen Oberschenkel legen.','Oberen Arm lang über den Kopf strecken.','Brust geöffnet, Becken stabil.'],'Unterarm ablegen statt die Hand zum Boden zu zwingen.',12],
 ['Dreieckshaltung','Trikonasana · Triangle Pose',2,1,'Flanke & Beinrückseite','static',30,true,'bg',['Breiter Stand, vorderes Bein gestreckt.','Aus der Hüfte zur Seite neigen, untere Hand ans Schienbein oder auf einen Block.','Oberen Arm nach oben strecken.'],'Vorderes Knie nicht überstrecken.',13],
 ['Göttinnenhaltung','Utkata Konasana · Goddess Pose',2,1,'Beine & Innenschenkel','static',30,false,'hg',['Breiter Stand, Füße leicht nach außen.','Knie in Richtung Zehen beugen, Becken sinkt.','Oberkörper aufrecht, Hände vor der Brust.'],'Weniger tief beugen, wenn die Knie zwicken.',30],
 ['Seitlicher Yoga-Ausfallschritt','Skandasana · Side Lunge',2,2,'Innenschenkel & Hüfte','static',25,true,'hb',['Sehr breiter Stand, Gewicht zu einer Seite verlagern.','Ein Knie beugen, das andere Bein bleibt gestreckt.','Hände vor dem Körper abstützen, Rücken lang.'],'Hände auf Blöcke stützen, wenn es zu tief ist.',31],
 ['Stehende Grätsche mit Vorbeuge','Prasarita Padottanasana · Wide-Legged Forward Fold',2,1,'Beinrückseite & Innenschenkel','static',30,false,'be',['Breiter Stand, Füße parallel.','Aus der Hüfte nach vorn beugen, Hände zum Boden oder auf Blöcke.','Kopf locker, Rücken lang.'],'Langsam und mit gebeugten Knien aufrichten.',32],
 ['Pyramidenhaltung','Parsvottanasana · Pyramid Pose',2,1,'Beinrückseite','static',25,true,'b',['Kurzer Schritt, beide Beine gestreckt, Becken nach vorn.','Mit langem Rücken über das vordere Bein beugen.','Hände auf Blöcke oder ans Schienbein.'],'Vorderes Knie leicht gebeugt lassen.',33],
 ['Gedrehtes Dreieck','Parivrtta Trikonasana · Revolved Triangle',2,2,'Wirbelsäule & Beinrückseite','static',25,true,'rb',['Aus der Pyramide die Gegenhand auf einen Block neben den vorderen Fuß.','Oberkörper aufdrehen, oberen Arm nach oben.','Becken bleibt möglichst gerade.'],'Mit Block und kürzerem Schritt üben.',34],
 ['Gedrehter Seitwinkel','Parivrtta Parsvakonasana · Revolved Side Angle',2,2,'Wirbelsäule & Hüfte','static',25,true,'rb',['Aus dem Ausfallschritt die Hände vor der Brust zusammenlegen.','Ellbogen außen an den vorderen Oberschenkel drehen.','Brustkorb öffnen, Blick nach oben.'],'Hinteres Knie bei Bedarf ablegen.',35],
 ['Halbmond','Ardha Chandrasana · Half Moon',2,2,'Balance & Hüfte','static',20,true,'gb',['Aus dem Dreieck die untere Hand auf einen Block vor den Fuß.','Hinteres Bein auf Hüfthöhe anheben.','Oberkörper und Becken öffnen, oberen Arm strecken.'],'Mit dem Rücken an einer Wand üben.',36],
 ['Tänzer','Natarajasana · Dancer Pose',2,2,'Balance & Hüftbeuger','static',20,true,'gb',['Auf einem Bein stehen, den anderen Fuß hinten greifen.','Fuß in die Hand drücken, Oberkörper leicht nach vorn.','Freien Arm nach vorn strecken.'],'Mit Gurt oder an der Wand üben.',37],
 ['Tiefe Yoga-Hocke','Malasana · Garland Pose',2,1,'Hüfte & Sprunggelenke','static',30,false,'hb',['Füße etwas weiter als hüftbreit, Zehen leicht nach außen.','Tief in die Hocke sinken, Fersen am Boden oder auf einer Decke.','Hände vor der Brust, Ellbogen innen an den Knien.'],'Block unter das Gesäß legen.',29],
 ['Krähe','Bakasana · Crow Pose',2,3,'Arme & Rumpf','static',15,false,'g',['Aus der Hocke die Hände schulterbreit aufsetzen.','Knie hoch an die Oberarme, Gewicht nach vorn.','Füße nacheinander kurz abheben.'],'Kissen vor den Kopf legen; nur mit Vorerfahrung.',38],
 ['Kobra','Bhujangasana · Cobra Pose',3,1,'Rücken & Brust','static',20,false,'rm',['Bauchlage, Hände neben dem Brustkorb.','Brustbein sanft anheben, Ellbogen nah am Körper.','Becken und Beine bleiben am Boden.'],'Nur im schmerzfreien Bereich hochkommen.',14],
 ['Sphinx','Salamba Bhujangasana · Sphinx Pose',3,1,'Rücken & Brust','static',45,false,'re',['Bauchlage, Ellbogen unter den Schultern.','Unterarme parallel, Brust sanft anheben.','Nacken lang, ruhig atmen.'],'Ellbogen weiter nach vorn setzen für weniger Rückbeuge.',15],
 ['Heuschrecke','Salabhasana · Locust Pose',3,2,'Rückenstrecker & Gesäß','static',20,false,'rg',['Bauchlage, Arme neben dem Körper.','Brust und Beine gleichzeitig leicht anheben.','Nacken lang, Blick zum Boden.'],'Erst nur Oberkörper oder nur Beine anheben.',16],
 ['Bogen','Dhanurasana · Bow Pose',3,2,'Rücken & Brust','static',20,false,'rb',['Bauchlage, Knie beugen, Fußgelenke greifen.','Füße in die Hände drücken, Brust und Oberschenkel anheben.','Ruhig weiteratmen.'],'Halber Bogen: nur ein Bein greifen; oder Gurt nutzen.',17],
 ['Kamel','Ustrasana · Camel Pose',3,2,'Brust & Hüftbeuger','static',20,false,'b',['Aufrecht knien, Hüfte über den Knien.','Hände an den unteren Rücken legen.','Brustbein heben und nur so weit zurückbeugen, wie es angenehm ist.'],'Hände am Rücken lassen; Kopf nicht fallen lassen.',18],
 ['Halber Spagat','Ardha Hanumanasana · Half Split',3,1,'Beinrückseite','static',30,true,'bh',['Aus dem tiefen Ausfallschritt das Gesäß nach hinten schieben.','Vorderes Bein strecken, Zehen anziehen.','Mit langem Rücken über das Bein beugen.'],'Hände auf Blöcke stützen.',26],
 ['Eidechsenhaltung','Utthan Pristhasana · Lizard Pose',3,2,'Hüfte','static',30,true,'hb',['Aus dem Ausfallschritt beide Hände innen neben den vorderen Fuß.','Hinteres Knie ablegen.','Becken sinken lassen, ruhig atmen.'],'Hände auf Blöcke, Knie gepolstert.',25],
 ['Ganzer Spagat','Hanumanasana · Full Split',3,3,'Beinrückseite & Hüftbeuger','static',30,true,'b',['Aus dem halben Spagat das vordere Bein langsam nach vorn gleiten lassen.','Blöcke unter die Hände, Becken gerade.','Nur so weit, wie es ohne Schmerz geht.'],'Block oder Kissen unter das Becken legen.',27],
 ['Froschhaltung','Mandukasana · Frog Pose',3,2,'Innenschenkel','static',45,false,'h',['Im Vierfüßlerstand die Knie weit öffnen.','Unterschenkel parallel, Füße ausgedreht.','Becken langsam nach hinten sinken lassen.'],'Knie gut polstern; nicht ins Ziehen hineinfedern.',28],
 ['Delfin','Ardha Pincha Mayurasana · Dolphin Pose',3,2,'Schultern & Beinrückseite','static',30,false,'g',['Im Vierfüßlerstand die Unterarme ablegen.','Zehen aufstellen und das Gesäß nach oben schieben.','Schultern aktiv vom Boden wegdrücken.'],'Knie gebeugt lassen.',42],
 ['Seitstütz','Vasisthasana · Side Plank',3,2,'Rumpf & Schultern','static',20,true,'g',['Aus dem hohen Stütz auf eine Hand und die Fußkante drehen.','Hand unter der Schulter, Körper in einer Linie.','Oberen Arm nach oben strecken.'],'Unteres Knie ablegen.',40],
 ['Taube','Eka Pada Rajakapotasana · Pigeon Pose',3,2,'Hüfte & Gesäß','static',45,true,'he',['Aus dem Hund ein Knie hinter das Handgelenk bringen.','Hinteres Bein lang nach hinten strecken.','Becken gerade, Oberkörper aufrecht oder auf die Unterarme.'],'Kissen unter die Hüfte; bei Knieschmerz lieber die Figure-Four-Dehnung.',20],
 ['Schmetterling','Baddha Konasana · Bound Angle',3,1,'Innenschenkel & Hüfte','static',45,false,'he',['Aufrecht sitzen, Fußsohlen zusammen.','Knie locker nach außen sinken lassen.','Aus der Hüfte leicht nach vorn neigen.'],'Kissen unter die Knie oder das Gesäß.',21],
 ['Drehsitz','Ardha Matsyendrasana · Seated Twist',3,1,'Wirbelsäule','static',30,true,'rb',['Aufrecht sitzen, ein Bein über das andere stellen.','Mit dem Einatmen lang werden, mit dem Ausatmen drehen.','Hintere Hand stützt hinter dem Gesäß.'],'Unteres Bein gestreckt lassen.',22],
 ['Sitzende Grätsche','Upavistha Konasana · Wide Seated Fold',3,1,'Innenschenkel & Beinrückseite','static',45,false,'be',['Beine weit gegrätscht, Zehen zeigen nach oben.','Aufrecht sitzen, dann mit langem Rücken nach vorn neigen.','Hände vor dem Körper abstützen.'],'Auf ein Kissen setzen und Knie leicht beugen.',23],
 ['Sitzende Vorbeuge','Paschimottanasana · Seated Forward Fold',3,1,'Beinrückseite & Rücken','static',45,false,'re',['Aufrecht sitzen, Beine nach vorn gestreckt.','Mit langem Rücken aus der Hüfte nach vorn beugen.','Hände an Schienbeine oder Füße.'],'Knie beugen oder Decke unter das Gesäß.',null],
 ['Boot','Navasana · Boat Pose',3,2,'Rumpf','static',20,false,'g',['Sitzen, Knie gebeugt, Oberkörper leicht zurück.','Füße anheben, Schienbeine parallel zum Boden.','Arme nach vorn, Rücken lang.'],'Hände neben dem Gesäß abstützen.',39],
 ['Brücke','Setu Bandha Sarvangasana · Bridge Pose',4,1,'Gesäß & Rücken','static',30,false,'rg',['Rückenlage, Füße hüftbreit nah am Gesäß.','Becken mit dem Ausatmen anheben.','Knie parallel, Nacken entspannt; langsam abrollen.'],'Block unter das Kreuzbein für die gestützte Variante.',19],
 ['Fisch','Matsyasana · Fish Pose',4,2,'Brust','static',20,false,'b',['Rückenlage, Hände unter das Gesäß.','Auf die Unterarme stützen und die Brust heben.','Kopf nur leicht ablegen, Gewicht auf den Unterarmen.'],'Bei Nackenproblemen Kopf auf ein Kissen.',46],
 ['Glückliches Baby','Ananda Balasana · Happy Baby',4,1,'Hüfte & unterer Rücken','static',45,false,'he',['Rückenlage, Knie zur Brust ziehen.','Außenkanten der Füße greifen, Knie neben den Brustkorb.','Kreuzbein bleibt am Boden.'],'Kniekehlen statt Füße greifen.',24],
 ['Beine an der Wand','Viparita Karani · Legs up the Wall',4,1,'Entspannung','static',120,false,'e',['Seitlich an eine Wand setzen.','Beine an der Wand hochlegen, Rücken auf die Matte.','Arme locker neben den Körper.'],'Kissen unter das Becken; bei Kribbeln Beine absenken.',50],
 ['Endentspannung','Savasana · Totenstellung · Corpse Pose',5,1,'Entspannung','static',180,false,'e',['Auf den Rücken legen, Beine locker auseinander.','Arme neben dem Körper, Handflächen nach oben.','Augen schließen und den Atem einfach fließen lassen.'],'Kissen unter die Knie, Decke zum Zudecken.',null],
 ['Kopfstand','Sirsasana · Headstand',2,3,'Schultern & Rumpf','static',20,false,'',['Unterarme ablegen, Hände verschränken.','Kopf nur leicht aufsetzen, Hüfte über die Schultern bringen.','Beine kontrolliert heben.'],'Nur mit Erfahrung und Anleitung; Nacken nie belasten.',41],
 ['Unterarmstand','Pincha Mayurasana · Forearm Stand',2,3,'Schultern & Rumpf','static',20,false,'',['Delfin-Position einnehmen.','Ein Bein kontrolliert nach oben strecken.','Zweites Bein nachführen, Kopf bleibt frei.'],'Nur mit Erfahrung, zunächst an der Wand.',43],
 ['Handstand','Adho Mukha Vrksasana',2,3,'Arme & Rumpf','static',15,false,'',['Hände schulterbreit, Finger gespreizt.','Aus dem Ausfallschritt kontrolliert hochschwingen.','Körper in einer Linie halten.'],'Zuerst an der Wand üben.',44],
 ['Rad','Urdhva Dhanurasana · Wheel Pose',4,3,'Brust & Schultern','static',15,false,'',['Rückenlage, Füße nah am Gesäß, Hände neben den Ohren.','Erst Becken, dann Brust anheben.','Arme strecken, ruhig atmen.'],'Zuerst die Brücke sicher beherrschen.',45]
]);
/* Bestehende Übungen, die zusätzlich unter Yoga erscheinen (Multi-Tagging, keine Dubletten). */
const YOGA_TAGS=Object.freeze([
 ['Cat-Cow','Katze-Kuh · Marjaryasana-Bitilasana',1,1,'mr',null],
 ['Kindhaltung','Balasana · Child’s Pose',1,1,'re',null],
 ['Herabschauender Hund','Adho Mukha Svanasana · Downward Dog',1,1,'gm',null],
 ['Low Lunge','Tiefer Ausfallschritt · Anjaneyasana',1,1,'hm',8],
 ['Liegender Twist','Liegende Wirbelsäulendrehung · Supta Matsyendrasana',4,1,'re',47],
 ['Figure-Four-Dehnung','Nadelöhr in Rückenlage · Sucirandhrasana',4,1,'he',48],
 ['Knie zur Brust in Rückenlage','Knie zur Brust · Apanasana',4,1,'re',49]]);
/* ---------- Mobilitätskatalog: Gelenke · Yoga · Dehnen ---------- */
const CATEGORIES=Object.freeze(['Gelenke','Yoga','Dehnen']);
const STRETCH=new Set(['Hamstring-Dehnung mit Theraband','Hüftbeuger-Dehnung mit Theraband','90/90-Vorbeuge','Quadrizeps-Dehnung im Stand','Soleus-Dehnung mit gebeugtem Knie','Hamstring-Dehnung mit Gurt','Knie zur Brust in Rückenlage',
 'Hüftbeuger-Dehnung','Figure-Four-Dehnung','Türrahmen-Brustdehnung','Waden-Dehnung','Seitliche Rumpfneigung im Stand']);
const YOGA=new Set(['Kindhaltung','Herabschauender Hund','Liegender Twist'].concat(YOGA_POSES.map(p=>p[0])));
function categoryOf(name){return YOGA.has(name)?'Yoga':STRETCH.has(name)?'Dehnen':'Gelenke';}
/* Moves that already live (with photos and guides) in the guided routines; now also in the catalogue. */
const EXTRA_DEFS=Object.freeze([
 ['Kindhaltung','Rücken','static',60,false],['Herabschauender Hund','Ganzkörper','static',45,false],['Liegender Twist','Wirbelsäule','static',45,true],
 ['Hüftbeuger-Dehnung','Hüfte','static',45,true],['Figure-Four-Dehnung','Gesäß','static',45,true],['Türrahmen-Brustdehnung','Brust','static',45,true],
 ['Waden-Dehnung','Waden','static',45,true],['Adduktoren-Rockback','Hüfte','dynamic',60,true],['Wall Slides','Schultern','dynamic',60,false],
 ['Cat-Cow','Wirbelsäule','dynamic',60,false],['Low Lunge','Hüfte','static',45,true],['90/90 Hüftwechsel','Hüfte','dynamic',60,false]]);
/* Theraband-Mobilität (Freitag 13.11.): eigene freigegebene Übungstafeln + Anleitung. */
const BAND_DEFS=Object.freeze([
 ['Schulter-Dislocates mit Theraband','Schultern','dynamic',40,false,'band-schulter-dislocates',['Band weit greifen, Arme vor dem Oberkörper.','Arme langsam und nahezu gestreckt über den Kopf nach hinten führen.','Nur so weit, wie es schmerzfrei geht, und kontrolliert zurück.'],'Griff breiter wählen, wenn die Schultern zwicken; Rumpf stabil, kein Hohlkreuz.'],
 ['Band-Außenrotation','Schultern','dynamic',40,true,'band-aussenrotation',['Band seitlich auf Ellbogenhöhe sicher befestigen.','Ellbogen im 90°-Winkel am Körper, Unterarm langsam nach außen drehen.','Kontrolliert zurückführen und Seiten wechseln.'],'Ellbogen bleibt am Körper; kleine, saubere Bewegung.'],
 ['Hamstring-Dehnung mit Theraband','Hinterer Oberschenkel','static',30,true,'band-hamstring-dehnung',['Auf den Rücken legen und das Band um einen Fuß führen.','Bein mit beiden Bandenden langsam gestreckt anheben.','Dehnung 20–30 Sekunden ruhig halten, dann Seite wechseln.'],'Becken und anderes Bein bleiben am Boden; nicht ruckartig ziehen.'],
 ['Sprunggelenk-Mobilisation mit Theraband','Sprunggelenk','dynamic',35,true,'band-sprunggelenk-mobilisation',['Band tief vor dem Sprunggelenk anlegen und hinten sicher befestigen.','Im halben Kniestand das vordere Knie langsam über die Zehen nach vorn schieben.','Ferse bleibt am Boden; zurück und Seite wechseln.'],'Ohne Federn bewegen, nur im schmerzfreien Bereich.'],
 ['Hüftbeuger-Dehnung mit Theraband','Hüfte','static',30,true,'band-hueftbeuger-dehnung',['Band hoch um die Hüfte des hinteren Beins legen und hinten sicher befestigen.','Im halben Kniestand Gesäß anspannen und Becken leicht nach hinten kippen.','Hüfte sanft nach vorn schieben, 20–30 Sekunden halten, Seite wechseln.'],'Kein Hohlkreuz; Oberkörper bleibt aufrecht.'],
 ['Handgelenksmobilisation mit Theraband','Handgelenke','dynamic',35,true,'band-handgelenksmobilisation',['Leichtes Band knapp oberhalb des Handgelenks anlegen und sicher befestigen.','Im Vierfüßlerstand die Handfläche flach aufsetzen.','Oberkörper langsam vor und zurück verlagern, dann Seite wechseln.'],'Ellbogen ruhig halten; nur schmerzfrei bewegen.']]);
/* Mobilität V13 (13.11.): freigegebene Ganztafeln. Neue Übungen nur dort, wo es noch keine gibt;
 * die übrigen Zusatztafeln hängen an der bestehenden Übung (Name, Timer, Pläne bleiben unverändert). */
const NEW_DEFS=Object.freeze([
 ['Thoraxrotation im Vierfüßlerstand','Brustwirbelsäule','dynamic',45,true,['Im Vierfüßlerstand Hände unter die Schultern und Knie unter die Hüften stellen.','Eine Hand an den Hinterkopf legen, der Ellbogen zeigt zur Seite.','Oberkörper kontrolliert zur geöffneten Seite aufdrehen, der Blick folgt dem Ellbogen.','Langsam zurück, 8–12 Wiederholungen, dann Seite wechseln.'],'Becken bleibt ruhig und gerade; die Drehung kommt aus der Brustwirbelsäule.'],
 ['Seitliche Rumpfneigung im Stand','Seitlicher Rumpf','static',30,true,['Aufrecht und hüftbreit hinstellen.','Einen Arm über den Kopf führen und den Oberkörper zur Gegenseite neigen.','Die andere Hand locker am Oberschenkel abgleiten lassen.','20–30 Sekunden ruhig halten, dann Seite wechseln.'],'Nur zur Seite neigen, nicht nach vorn oder hinten kippen.'],
 ['Brustwirbelsäulen-Extension im Stand','Brustwirbelsäule','dynamic',40,false,['Aufrecht stehen, Füße hüftbreit, Knie leicht gelöst.','Hände in die Hüften oder an den unteren Rücken legen.','Brustkorb sanft anheben und den Blick leicht nach oben richten.','2–3 Sekunden halten und kontrolliert zurück, 8–12 Wiederholungen.'],'Bewegung aus dem oberen Rücken, kein Hohlkreuz im unteren Rücken.'],
 ['Handgelenksmobilisation im Vierfüßlerstand','Handgelenke','dynamic',35,false,['Im Vierfüßlerstand starten.','Hände flach aufsetzen, die Finger zeigen nach vorn.','Gewicht langsam nach vorn verlagern und wieder zurück.','8–12 ruhige Wiederholungen.'],'Handballen bleiben am Boden; nur so weit, wie es schmerzfrei geht.']]);
const V13_BOARDS=Object.freeze({
 'Sprunggelenk-Mobilisation an der Wand':'v13-01-sprunggelenk-mobilisation-wand','Fußkreisen':'v13-02-fusskreisen','Fußsohle mit Ball mobilisieren':'v13-03-fusssohle-mit-ball',
 'Fersengleiten in Rückenlage':'v13-04-fersengleiten-rueckenlage','Beinpendel vor und zurück':'v13-05-beinpendel-vor-zurueck','Seitliches Beinpendel':'v13-06-beinpendel-seitlich',
 'Hüftkreisen im Stand':'v13-07-hueftkreisen-stand','90/90-Vorbeuge':'v13-08-90-90-vorbeuge','Hüftkreise im Vierfüßlerstand':'v13-09-hueftkreise-vierfuessler',
 'Quadrizeps-Dehnung im Stand':'v13-10-quadrizeps-dehnung-stand','Soleus-Dehnung mit gebeugtem Knie':'v13-11-soleus-dehnung-gebeugtes-knie','Hamstring-Dehnung mit Gurt':'v13-12-hamstring-dehnung-gurt',
 'Beckenkippen in Rückenlage':'v13-13-beckenkippen-rueckenlage','Beckenkreisen im Stand':'v13-14-beckenkreisen-stand','Knie zur Brust in Rückenlage':'v13-15-knie-zur-brust-rueckenlage',
 'Thread the Needle':'v13-16-thread-the-needle','Brustwirbelsäulenstreckung über Foam Roller':'v13-17-bws-streckung-foam-roller','Schulterkreisen':'v13-18-schulterkreisen',
 'Schulterheben mit Stab':'v13-19-schulterheben-stab',
 'Cat-Cow':'v13-e01-katzen-kuh-cat-cow','Liegender Twist':'v13-e02-wirbelsaeulenrotation-liegend','Thoraxrotation im Vierfüßlerstand':'v13-e03-thoraxrotation-vierfuessler',
 'Seitliche Rumpfneigung im Stand':'v13-e04-seitliche-rumpfneigung-stand','Low Lunge':'v13-e05-hueftoeffner-ausfallschritt','90/90 Hüftwechsel':'v13-e06-90-90-hueftmobilisation-seitenwechsel',
 'Brustwirbelsäulen-Extension im Stand':'v13-e07-bws-extension-stand','Figure-Four-Dehnung':'v13-e08-hueftoeffner-figure-four','Handgelenksmobilisation im Vierfüßlerstand':'v16-handgelenk-vierfuessler',
 /* V16 Bild-QA (22.11.): neue, geprüfte Tafeln für bestehende Übungen. Alte Fotos/Karten bleiben als Datei erhalten. */
 'Kindhaltung':'v16-kindhaltung','Handgelenksmobilisation':'v16-handgelenksmobilisation','Herabschauender Hund':'v16-herabschauender-hund','Sitzende Vorbeuge':'v16-sitzende-vorbeuge','Hüftbeuger-Dehnung':'v16-hueftbeuger-halbkniestand','Waden-Dehnung':'v16-waden-dehnung-wand','Adduktoren-Rockback':'v16-adduktoren-rockback','Türrahmen-Brustdehnung':'v16-tuerrahmen-brustdehnung','Wall Slides':'v16-wall-slides','Krieger II':'yoga-10-krieger-ii'});
/* Diese Tafeln tragen „KI-generiert“ bereits im Bild – dort keine zweite Kennzeichnung. */
/* Yoga 50 (V16 Bild-QA 22.11.): [Nr, Name, Sanskrit, Datei]. Stabile ID = 'yoga-NN'. Noch keine eigenen Katalogeinträge (Yoga 2.0, #72). */
const YOGA_50=Object.freeze([
 [1,'Leichter Sitz','Sukhasana','yoga-01-leichter-sitz'],
 [2,'Berghaltung','Tadasana','yoga-02-berghaltung'],
 [3,'Gestreckter Berg','Urdhva Hastasana','yoga-03-gestreckter-berg'],
 [4,'Stehende Vorbeuge','Uttanasana','yoga-04-stehende-vorbeuge'],
 [5,'Halbe stehende Vorbeuge','Ardha Uttanasana','yoga-05-halbe-stehende-vorbeuge'],
 [6,'Stuhlhaltung','Utkatasana','yoga-06-stuhlhaltung'],
 [7,'Hoher Ausfallschritt','High Lunge','yoga-07-hoher-ausfallschritt'],
 [8,'Tiefer Ausfallschritt','Anjaneyasana','yoga-08-tiefer-ausfallschritt'],
 [9,'Krieger I','Virabhadrasana I','yoga-09-krieger-i'],
 [10,'Krieger II','Virabhadrasana II','yoga-10-krieger-ii'],
 [11,'Umgekehrter Krieger','Reverse Warrior','yoga-11-umgekehrter-krieger'],
 [12,'Gestreckter Seitenwinkel','Utthita Parsvakonasana','yoga-12-gestreckter-seitenwinkel'],
 [13,'Dreieckshaltung','Trikonasana','yoga-13-dreieckshaltung'],
 [14,'Kobra','Bhujangasana','yoga-14-kobra'],
 [15,'Sphinx','Salamba Bhujangasana','yoga-15-sphinx'],
 [16,'Heuschrecke','Salabhasana','yoga-16-heuschrecke'],
 [17,'Bogen','Dhanurasana','yoga-17-bogen'],
 [18,'Kamel','Ustrasana','yoga-18-kamel'],
 [19,'Brücke','Setu Bandha Sarvangasana','yoga-19-bruecke'],
 [20,'Taube','Eka Pada Rajakapotasana','yoga-20-taube'],
 [21,'Schmetterling','Baddha Konasana','yoga-21-schmetterling'],
 [22,'Drehsitz','Ardha Matsyendrasana','yoga-22-drehsitz'],
 [23,'Sitzende Grätsche','Upavistha Konasana','yoga-23-sitzende-graetsche'],
 [24,'Glückliches Baby','Ananda Balasana','yoga-24-glueckliches-baby'],
 [25,'Eidechsenhaltung','Utthan Pristhasana','yoga-25-eidechsenhaltung'],
 [26,'Halber Spagat','Ardha Hanumanasana','yoga-26-halber-spagat'],
 [27,'Ganzer Spagat','Hanumanasana','yoga-27-ganzer-spagat'],
 [28,'Froschhaltung','Mandukasana','yoga-28-froschhaltung'],
 [29,'Tiefe Yoga-Hocke','Malasana','yoga-29-tiefe-yoga-hocke'],
 [30,'Göttinnenhaltung','Utkata Konasana','yoga-30-goettinnenhaltung'],
 [31,'Seitlicher Yoga-Ausfallschritt','Skandasana','yoga-31-seitlicher-yoga-ausfallschritt'],
 [32,'Stehende Grätsche mit Vorbeuge','Prasarita Padottanasana','yoga-32-stehende-graetsche-mit-vorbeuge'],
 [33,'Pyramidenhaltung','Parsvottanasana','yoga-33-pyramidenhaltung'],
 [34,'Gedrehtes Dreieck','Parivrtta Trikonasana','yoga-34-gedrehtes-dreieck'],
 [35,'Gedrehter Seitwinkel','Parivrtta Parsvakonasana','yoga-35-gedrehter-seitwinkel'],
 [36,'Halbmond','Ardha Chandrasana','yoga-36-halbmond'],
 [37,'Tänzer','Natarajasana','yoga-37-taenzer'],
 [38,'Krähe','Bakasana','yoga-38-kraehe'],
 [39,'Boot','Navasana','yoga-39-boot'],
 [40,'Seitstütz','Vasisthasana','yoga-40-seitstuetz'],
 [41,'Kopfstand','Sirsasana','yoga-41-kopfstand'],
 [42,'Delfin','Ardha Pincha Mayurasana','yoga-42-delfin'],
 [43,'Unterarmstand','Pincha Mayurasana','yoga-43-unterarmstand'],
 [44,'Handstand','Adho Mukha Vrksasana','yoga-44-handstand'],
 [45,'Rad','Urdhva Dhanurasana','yoga-45-rad'],
 [46,'Fisch','Matsyasana','yoga-46-fisch'],
 [47,'Liegende Wirbelsäulendrehung','Supta Matsyendrasana','yoga-47-liegende-wirbelsaeulendrehung'],
 [48,'Nadelöhr in Rückenlage','Sucirandhrasana','yoga-48-nadeloehr-in-rueckenlage'],
 [49,'Knie zur Brust','Apanasana','yoga-49-knie-zur-brust'],
 [50,'Beine an der Wand','Viparita Karani','yoga-50-beine-an-der-wand']
].map(([nr,name,sanskrit,file])=>Object.freeze({id:'yoga-'+String(nr).padStart(2,'0'),nr,name,sanskrit,src:'./mobility-boards/'+file+'.webp'})));
const BOARD_LABELED=Object.freeze(new Set(['v13-10-quadrizeps-dehnung-stand','v13-11-soleus-dehnung-gebeugtes-knie','v13-12-hamstring-dehnung-gurt','v13-13-beckenkippen-rueckenlage',
 'v13-14-beckenkreisen-stand','v13-15-knie-zur-brust-rueckenlage','v13-16-thread-the-needle','v13-17-bws-streckung-foam-roller','v13-18-schulterkreisen','v13-19-schulterheben-stab',
 'v13-e08-hueftoeffner-figure-four','v13-e09-handgelenk-vierfuessler','v16-kindhaltung','v16-handgelenksmobilisation','v16-herabschauender-hund','v16-sitzende-vorbeuge','v16-hueftbeuger-halbkniestand','v16-waden-dehnung-wand','v16-adduktoren-rockback','v16-tuerrahmen-brustdehnung','v16-wall-slides','yoga-10-krieger-ii','v16-handgelenk-vierfuessler'].map(b=>'./mobility-boards/'+b+'.webp').concat(YOGA_50.map(y=>y.src))));
const BAND_IMAGES=Object.freeze(Object.assign(Object.fromEntries(YOGA_50.filter(y=>!V13_BOARDS[y.name]).map(y=>[y.name,y.src])),Object.fromEntries(Object.entries(V13_BOARDS).map(([n,b])=>[n,'./mobility-boards/'+b+'.webp'])),
 Object.fromEntries(BAND_DEFS.map(d=>[d[0],'./mobility-boards/'+d[5]+'.webp']))));
const MOB_BOARDS=BAND_IMAGES;
function boardLabeled(src){return BOARD_LABELED.has(String(src||''));}
function boardHtml(name){
 const src=MOB_BOARDS[name];if(!src)return '';
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<div class="forge-strength-board forge-mob-board" data-forge-mob-board="'+esc(name)+'"><figure class="forge-strength-board-figure"><span class="forge-sb-frame"><img class="forge-strength-board-image" src="'+esc(src)+'" alt="'+esc(name)+' – FORGE Übungstafel; antippen zum Vergrößern" role="button" tabindex="0" loading="lazy" decoding="async">'+
  (boardLabeled(src)?'':'<span class="forge-ai-badge" role="note" aria-label="Hinweis: KI-generierte Abbildung">KI-generiert</span>')+'</span><figcaption>Gesamte Übungsübersicht ansehen · Zum Vergrößern tippen</figcaption></figure></div>';
}
function newExtras(){return NEW_DEFS.map(([name,region,mode,seconds,sides,steps,tip])=>({name,region,mode,amount:mode==='dynamic'?10:1,seconds,sides,steps:steps.slice(),tip,category:categoryOf(name),source:'board'}));}
function bandExtras(){return BAND_DEFS.map(([name,region,mode,seconds,sides,,steps,tip])=>({name,region,mode,amount:mode==='dynamic'?10:1,seconds,sides,steps:steps.slice(),tip,category:categoryOf(name),source:'band',equipment:'Theraband'}));}
function extras(guides){
 const g=guides||{};
 return EXTRA_DEFS.map(([name,region,mode,seconds,sides])=>{const x=Array.isArray(g[name])?g[name]:[[],''];
  return {name,region,mode,amount:mode==='dynamic'?10:1,seconds,sides,steps:Array.isArray(x[0])?x[0].slice():[],tip:String(x[1]||''),category:categoryOf(name),source:'routine'};}).concat(bandExtras(),newExtras(),yogaExtras().filter(x=>!EXTRA_DEFS.some(d=>d[0]===x.name)));
}
function withExtras(list,guides){const have=new Set((list||[]).map(x=>x.name));return (list||[]).concat(extras(guides).filter(x=>!have.has(x.name)));}
const YOGA_NEVER_AUTO=new Set(['Kopfstand','Unterarmstand','Handstand','Rad']);
const YOGA_META=Object.freeze((()=>{const m=Object.create(null);
 YOGA_POSES.forEach(([name,alias,phase,level,region,mode,seconds,sides,focus,steps,tip,nr])=>{m[name]=Object.freeze({name,alias,phase,level,region,mode,seconds,sides,focus,nr,existing:false});});
 YOGA_TAGS.forEach(([name,alias,phase,level,focus,nr])=>{m[name]=Object.freeze({name,alias,phase,level,focus,nr,existing:true});});
 return m;})());
const YOGA_LEVELS=Object.freeze([[1,'Einsteiger'],[2,'Mittel'],[3,'Fortgeschritten']]);
const YOGA_FOCUS=Object.freeze([['g','Ganzkörper'],['r','Rücken'],['h','Hüfte'],['b','Beweglichkeit'],['e','Entspannung'],['m','Morgen-Energie']]);
const YOGA_MINUTES=Object.freeze([10,15,20,30,45]);
function categoriesOf(name){const c=categoryOf(name);return YOGA_META[name]&&c!=='Yoga'?[c,'Yoga']:[c];}
function inCategory(name,cat){return !cat||cat==='Alle'||categoriesOf(name).includes(cat);}
function yogaAlias(name){const y=YOGA_META[name];return y?y.alias:'';}
function yogaLevel(name){const y=YOGA_META[name];return y?y.level:0;}
function yogaExtras(){return YOGA_POSES.map(([name,alias,phase,level,region,mode,seconds,sides,focus,steps,tip])=>({name,region,mode,amount:mode==='dynamic'?10:1,seconds,sides,steps:steps.slice(),tip,category:'Yoga',source:'yoga',alias,level}));}
/* Dauer eines Routinen-Eintrags wie im Player (ForgeRoutinesCore.seconds): 5 s Übergang, je Seite doppelt + 3 s Wechsel. */
function itemSecs(sec,sides){return 5+sec*(sides?2:1)+(sides?3:0);}
function rng(seed){let s=(Number(seed)>>>0)||1;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function sidesOf(name){const y=YOGA_META[name];if(!y)return false;if(!y.existing)return !!y.sides;return ['Low Lunge','Liegender Twist','Figure-Four-Dehnung'].includes(name);}
function baseSec(name){const y=YOGA_META[name];if(y&&!y.existing)return y.seconds;return {'Cat-Cow':60,'Kindhaltung':60,'Herabschauender Hund':45,'Low Lunge':45,'Liegender Twist':45,'Figure-Four-Dehnung':45,'Knie zur Brust in Rückenlage':45}[name]||30;}
/* Haltezeiten so skalieren, dass die Gesamtdauer zur Zielzeit passt (5-s-Raster, sinnvolle Grenzen). */
function fitTimes(names,minutes){
 const target=Math.round(Number(minutes)*60);
 const isRest=n=>n==='Endentspannung'||n==='Beine an der Wand';
 let secs=names.map(baseSec);
 for(let k=0;k<8;k++){
  const fixed=names.reduce((a,n,i)=>a+itemSecs(0,sidesOf(n)),0);
  const cur=names.reduce((a,n,i)=>a+secs[i]*(sidesOf(n)?2:1),0);
  const f=Math.max(.3,(target-fixed)/Math.max(1,cur));
  secs=secs.map((s,i)=>{const n=names[i];const lo=isRest(n)?60:15,hi=isRest(n)?600:(YOGA_META[n]&&YOGA_META[n].level>=2?60:120);
   return Math.min(hi,Math.max(lo,Math.round(s*f/5)*5));});
  const tot=names.reduce((a,n,i)=>a+itemSecs(secs[i],sidesOf(n)),0);
  if(Math.abs(tot-target)<=Math.max(30,target*.05))break;
 }
 return names.map((n,i)=>[n,secs[i],sidesOf(n)?'je Seite':'']);
}
function flowSeconds(items){return (items||[]).reduce((a,it)=>a+itemSecs(Number(it[1])||0,/je seite/i.test(String(it[2]||''))),0);}
/* Kuratierte Einsteiger-Vorlagen (#72). Der Morgen-Flow ist das Abnahmebeispiel aus dem Issue. */
const YOGA_TEMPLATES=Object.freeze([
 ['morgen','Morgen-Flow',10,['Leichter Sitz','Cat-Cow','Kindhaltung','Herabschauender Hund','Low Lunge','Berghaltung','Krieger II','Stehende Vorbeuge','Endentspannung']],
 ['ruecken','Sanft für Rücken & Hüfte',15,['Leichter Sitz','Cat-Cow','Kindhaltung','Sphinx','Low Lunge','Halber Spagat','Schmetterling','Brücke','Knie zur Brust in Rückenlage','Liegender Twist','Endentspannung']],
 ['abend','Abend-Entspannung',15,['Leichter Sitz','Kindhaltung','Sitzende Vorbeuge','Schmetterling','Glückliches Baby','Figure-Four-Dehnung','Liegender Twist','Beine an der Wand','Endentspannung']]]);
function yogaTemplate(id){const t=YOGA_TEMPLATES.find(x=>x[0]===id);return t?{id:t[0],name:t[1],minutes:t[2],items:fitTimes(t[3],t[2])}:null;}
/* Automatischer Flow: Ankommen → Aufwärmen → Stand → Boden → Abschluss → Endentspannung.
 * Nie zurück in eine frühere Phase (kein Stehen→Liegen→Stehen), keine Dubletten, beidseitige Posen je Seite,
 * Umkehrhaltungen (Kopf-/Hand-/Unterarmstand, Rad) nie automatisch. */
function yogaFlow(opts){
 const o=opts||{};const level=[1,2,3].includes(Number(o.level))?Number(o.level):1;
 const focus=YOGA_FOCUS.some(f=>f[0]===o.focus)?o.focus:'g';const minutes=YOGA_MINUTES.includes(Number(o.minutes))?Number(o.minutes):15;
 const r=rng(o.seed||1);
 const pool=Object.values(YOGA_META).filter(y=>y.level<=level&&!YOGA_NEVER_AUTO.has(y.name)&&y.name!=='Beine an der Wand'||(y.name==='Beine an der Wand'&&focus==='e'));
 const score=y=>(y.focus.includes(focus)?2:0)+(focus==='g'?.5:0)+r();
 const cap=Math.min(20,{10:9,15:11,20:13,30:16,45:19}[minutes]);
 const share={g:[1,3,4,2,1],r:[1,3,2,3,2],h:[1,3,3,3,1],b:[1,2,4,3,1],e:[1,2,0,4,3],m:[1,3,5,1,1]}[focus];
 const sum=share.reduce((a,b)=>a+b,0);const slots=cap-2;// Ankommen + Endentspannung fest
 const want=share.slice(1).map(s=>s?Math.max(1,Math.round(slots*s/(sum-share[0]))):0);
 while(want.reduce((a,b)=>a+b,0)>slots){const i=want.indexOf(Math.max(...want));want[i]--;}
 const pick=(phase,n,fixedFirst)=>{
  const c=pool.filter(y=>y.phase===phase);const out=[];
  (fixedFirst||[]).forEach(f=>{const y=c.find(x=>x.name===f);if(y&&out.length<n)out.push(y);});
  c.filter(y=>!out.includes(y)).map(y=>[score(y),y]).sort((a,b)=>b[0]-a[0]).slice(0,n-out.length).forEach(x=>out.push(x[1]));
  // feste, sinnvolle Reihenfolge innerhalb der Phase (Tafel-Nr. folgt der Sequenzlogik)
  const ord=y=>y.name==='Cat-Cow'?0:y.name==='Kindhaltung'?1:y.name==='Herabschauender Hund'?2:y.name==='Low Lunge'?3:(y.nr||60);
  return out.sort((a,b)=>ord(a)-ord(b));
 };
 const names=['Leichter Sitz'].concat(
  pick(1,want[0],['Cat-Cow','Herabschauender Hund']),
  want[1]?pick(2,want[1],['Berghaltung']):[],
  pick(3,want[2]),
  pick(4,want[3]),
  ['Endentspannung']).map(y=>typeof y==='string'?y:y.name);
 // Voraussetzungen: Haltungen, die aus einer anderen heraus aufgebaut werden, bekommen diese davor.
 const PRE={'Umgekehrter Krieger':'Krieger II','Gestreckter Seitenwinkel':'Krieger II','Dreieckshaltung':'Krieger II','Halbmond':'Dreieckshaltung','Gedrehtes Dreieck':'Pyramidenhaltung',
  'Halber Spagat':'Low Lunge','Eidechsenhaltung':'Low Lunge','Ganzer Spagat':'Halber Spagat','Taube':'Herabschauender Hund','Krähe':'Tiefe Yoga-Hocke','Gedrehter Seitwinkel':'Hoher Ausfallschritt'};
 let list=[...new Set(names)];
 for(let k=0;k<3;k++){const add=[];list.forEach(n=>{const p=PRE[n];if(p&&!list.includes(p)&&!add.includes(p)&&YOGA_META[p]&&YOGA_META[p].level<=level)add.push(p);});if(!add.length)break;
  const all=list.concat(add);const ph=n=>YOGA_META[n].phase;const ord=n=>n==='Leichter Sitz'?-1:n==='Cat-Cow'?0:n==='Kindhaltung'?1:n==='Herabschauender Hund'?2:n==='Low Lunge'?3:n==='Endentspannung'?99:(YOGA_META[n].nr||60);
  list=all.sort((a,b)=>ph(a)-ph(b)||ord(a)-ord(b));}
 while(list.length>20){const i=list.findIndex((n,j)=>j>0&&j<list.length-1&&!Object.values(PRE).includes(n));list.splice(i>0?i:1,1);}
 return fitTimes(list,minutes);
}
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
 return (list||[]).filter(v=>(!f||!f.kind||f.kind==='all'||(f.kind==='yoga'?v.yoga:!v.yoga))&&(!f||!f.area||f.area==='all'||v.area===f.area)&&(!f||!f.mins||v.mins===Number(f.mins))&&(!q||(v.title+' '+v.creator).toLocaleLowerCase('de').includes(q)));
}
/* Weekly plan keeps the first two videos per area+duration (legacy videoCandidates). */
function plannable(v){return !!v&&v.idx<2;}
function assignVideo(assignments,day,v){
 const list=(Array.isArray(assignments)?assignments:[]).filter(a=>a&&a.day!==day);
 list.push({day,goal:v.area,mins:v.mins,choice:v.idx,timing:'separate'});
 return list.sort((a,b)=>a.day-b.day);
}
function yogaBoard(q){const k=String(q||'').trim().toLowerCase();return YOGA_50.find(y=>y.id===k||y.name.toLowerCase()===k||y.sanskrit.toLowerCase()===k)||null;}
window.ForgeYoga=Object.freeze({POSES:YOGA_POSES,TAGS:YOGA_TAGS,META:YOGA_META,LEVELS:YOGA_LEVELS,FOCUS:YOGA_FOCUS,MINUTES:YOGA_MINUTES,TEMPLATES:YOGA_TEMPLATES,NEVER_AUTO:[...YOGA_NEVER_AUTO],
 flow:yogaFlow,template:yogaTemplate,fitTimes,flowSeconds,alias:yogaAlias,level:yogaLevel});
window.ForgeMobilityCatalog=Object.freeze({CATEGORIES,categoryOf,categoriesOf,inCategory,yogaAlias,yogaLevel,extras,withExtras,BAND_IMAGES,MOB_BOARDS,NEW_DEFS,YOGA_50,yogaBoard,boardHtml,boardLabeled});
/* Katalog/Detail: freigegebene Tafel statt der alten Einzelpanels (letzter Renderer für diese Namen). */
try{['forgeExerciseIllustrations','forgePublicExercisePictures'].forEach(k=>{const prev=window[k];if(prev&&prev.forgeMobBoards)return;
 const f=function(name){return MOB_BOARDS[name]?boardHtml(name):(typeof prev==='function'?prev.apply(this,arguments):'');};f.forgeMobBoards=true;window[k]=f;});}catch(e){}
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
${K}.ms-compact{gap:4px}${K}.ms-compact .ms-link{min-height:40px;padding:4px 2px;font-size:13px;color:#8fd8c8;text-align:left}
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
.forge-lb-vsheet .vs-kind{display:grid;grid-template-columns:1fr 1fr;gap:4px;height:52px;border-radius:26px;background:#171e2a;border:1px solid #293346;padding:5px;box-sizing:border-box;flex:0 0 auto}
.forge-lb-vsheet .vs-kind button{border:0;border-radius:21px;background:transparent;color:#95a3b7;font:inherit;font-size:15px;font-weight:700}
.forge-lb-vsheet .vs-kind button[aria-checked="true"]{background:${TEAL};color:#062420;font-weight:800}
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
${R} .mr-ai{position:absolute;right:10px;bottom:10px;font-size:11px;font-weight:600;color:#d8dfdb;background:rgba(5,9,10,.78);border:1px solid rgba(255,255,255,.18);border-radius:7px;padding:3px 7px;pointer-events:none}
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
function ownRoutines(){try{return (Array.isArray(state.forgeRoutines)?state.forgeRoutines:[]).some(r=>r&&!r.archived);}catch(e){return false;}}
function renderCard(){
 if(!enabled())return;
 const host=$('mobWorkout');if(!host)return;
 ensureCss();
 let card=host.parentElement.querySelector(':scope > .forge-lb-mobstart');
 if(!card){card=el('section','forge-lb-mobstart');host.before(card);}
 card.replaceChildren();card.classList.remove('ms-compact');
 const c=cfg(),r=routine();
 if(!c.enabled||!r){
  card.append(el('div','ms-kick',run()?'Läuft gerade':'Deine Mobilitätsroutine'),el('h3','',run()?(run().name||'Mobilität'):'Noch keine Routine'));
  if(run()){
   const go=btn('ms-go','',()=>startRun());go.innerHTML=ICON.play+'<span>Mobilität fortsetzen</span>';card.append(go);
  }else if(ownRoutines()){
   card.classList.add('ms-compact');card.firstChild.textContent='Deine Mobilität';card.querySelector('h3').remove();
   card.append(btn('ms-link','+ Mobilitätsplan im Plan erstellen',toPlan));
   const g=routines().gentle;
   if(g&&Array.isArray(g.items)&&g.items.length)card.append(btn('ms-link','Ohne Plan: '+g.name+' ('+minutesLabel(totalSeconds(g.items,lib))+') starten',()=>startRun('gentle')));
  }else{
   card.append(el('div','ms-sub','Lege deine Routine im Plan fest – an festen Tagen oder nach dem Krafttraining.'));
   card.append(btn('ms-go','Routine im Plan erstellen',toPlan));
   const g=routines().gentle;
   if(g&&Array.isArray(g.items)&&g.items.length)card.append(btn('ms-link','Ohne Plan: '+g.name+' ('+minutesLabel(totalSeconds(g.items,lib))+') starten',()=>startRun('gentle')));
  }
  videoTile(card);hideLegacy();try{window.ForgeRoutinesTodayCard?.();}catch(e){}return;
 }
 const today=isToday(c,todayIdx(),trainedToday());
 const logs=Array.isArray(c.logs)?c.logs:[];
 const done=logs.some(l=>l&&l.date&&localDay(new Date(l.date))===localDay(new Date()));
 card.append(el('div','ms-kick',done?'Heute erledigt ✓':today?'Heute dran':'Deine Mobilitätsroutine'));
 card.append(el('h3','',r.name));
 const rounds=Math.max(1,...r.items.map(it=>it&&it[3]&&it[3].rounds||1));const uniq=r.items.filter(it=>!(it&&it[3]&&it[3].round>1));
 card.append(el('div','ms-sub',uniq.length+' Übungen'+(rounds>1?' · '+rounds+' Runden':'')+' · '+minutesLabel(rounds>1||r.items.some(it=>it&&it[3])?buildPhases(r.items,lib).reduce((a,p)=>a+p.secs,0):totalSeconds(r.items,lib))+' · '+(c.timing==='after'?'nach dem Krafttraining':c.timing==='both'?'Ruhetage & nach dem Training':'an Ruhetagen')));
 if(false){
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
 videoTile(card);hideLegacy();try{window.ForgeRoutinesTodayCard?.();}catch(e){}
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
 vstate={kind:'yoga',area:'all',mins:0,q:'',detail:null,plan:false,toast:''};
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
  const kind=el('div','vs-kind');kind.setAttribute('role','radiogroup');kind.setAttribute('aria-label','Art');
  [['yoga','Yoga'],['mob','Mobilität']].forEach(([k,t])=>{const b=btn('',t,()=>{vstate.kind=k;renderVideos();});b.setAttribute('role','radio');b.setAttribute('aria-checked',String(vstate.kind===k));kind.append(b);});
  body.append(kind);
  body.append(el('div','vs-label','Dauer'),chipRow('Dauer',[[0,'Alle'],...VIDEO_MINS.map(m=>[m,m+' Min.'])],vstate.mins,v=>{vstate.mins=Number(v);renderVideos();}));
  body.append(el('div','vs-label','Schwerpunkt'),chipRow('Schwerpunkt',[['all','Alle'],...VIDEO_AREAS],vstate.area,v=>{vstate.area=v;renderVideos();}));
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
 if(!root||!root.isConnected){
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
 if(imgs.length){imgs.forEach(src=>{const i=el('img');i.src=src;i.alt=item[0];media.append(i);});if(imgs.some(x=>/mobility-boards\//.test(x)&&!boardLabeled(x))){const ai=el('span','mr-ai','KI-generiert');ai.setAttribute('role','note');media.append(ai);}}else{media.classList.add('none');media.innerHTML=ICON.flow.replace('width="22" height="22"','width="64" height="64"');}
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
