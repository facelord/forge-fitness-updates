/* FORGE movement atlas. Forty individual two-stage offline technique schematics.
   Original illustrations, not photos. The old photo library remains intact.
   Every stage is rendered from explicit named movement presets, never guessed
   from unrelated exercise photos. No state mutation, no external image loads.
*/
(function(){
'use strict';
const strength={
 'Brustpresse':['sitting|wide|still|machine','sitting|press|still|machine','Brusthöhe · Griffe vor dem Körper'],
 'Butterfly / Pec Deck':['sitting|flyWide|still|machine','sitting|flyClose|still|machine','Arme bogenförmig vor die Brust'],
 'Kabel-Flys':['standing|flyWide|still|cable','standing|flyClose|still|cable','Ellenbogen leicht gebeugt'],
 'Einarmiges Kurzhantelrudern':['hinge|downOne|still|bench','hinge|rowOne|still|dumbbell','Hantel an die Hüfte ziehen'],
 'Brustgestütztes Rudern':['hinge|down|still|bench','hinge|row|still|dumbbell','Brust abgestützt · Schultern tief'],
 'Gerade-Arme-Pulldown':['standing|reachUp|still|cable','standing|lowPull|still|cable','Arme fast gestreckt'],
 'Arnold Press':['sitting|curl|still|dumbbell','sitting|overhead|still|dumbbell','Drücken und kontrolliert drehen'],
 'Schulter-Außenrotation':['standing|elbowsClose|still|band','standing|rotateOut|still|band','Ellenbogen bleibt am Oberkörper'],
 'Hammer Curls':['standing|down|still|dumbbell','standing|curl|still|dumbbell','Neutralgriff · kein Schwung'],
 'Überkopf-Trizepsstrecken':['standing|behindHead|still|dumbbell','standing|overhead|still|dumbbell','Ellenbogen möglichst ruhig'],
 'Hip Thrust':['bridgeLow|down|still|bench','bridgeHigh|down|still|bench','Hüfte strecken ohne Hohlkreuz'],
 'Beinstrecker':['sitting|rest|kneeBent|machine','sitting|rest|kneeStraight|machine','Knie kontrolliert strecken'],
 'Abduktorenmaschine':['sitting|rest|kneeClose|machine','sitting|rest|kneeWide|machine','Knie gegen Polster nach außen'],
 'Adduktorenmaschine':['sitting|rest|kneeWide|machine','sitting|rest|kneeClose|machine','Knie kontrolliert zusammenführen'],
 'Einbeiniges rumänisches Kreuzheben':['standing|down|oneLeg|dumbbell','hinge|down|rearLeg|dumbbell','Becken gerade · Standbein leicht gebeugt'],
 'Back Extensions':['hinge|handsCross|still|bench','standing|handsCross|still|bench','Nur bis zur neutralen Körperlinie'],
 "Farmer's Carry":['standing|carry|walkA|dumbbell','standing|carry|walkB|dumbbell','Aufrecht und mit kurzen Schritten'],
 'Pallof Press':['standing|pallofClose|still|band','standing|pallofFar|still|band','Rumpf gegen Rotation stabilisieren'],
 'Dead Bug':['lying|armsUp|kneesUp|mat','lying|diagonal|deadBug|mat','Diagonal strecken, Rücken ruhig'],
 'Bird Dog':['allFours|rest|still|mat','allFours|extend|still|mat','Diagonal strecken, Becken stabil']
};
const mobility={
 'Sprunggelenk-Mobilisation an der Wand':['lunge|reachFront|still|wall','lunge|reachFront|kneeForward|wall','Ferse bleibt am Boden'],
 'Fußkreisen':['sitting|rest|kneeStraight|none','sitting|rest|footTurn|none','Fußgelenk kreisen, Unterschenkel ruhig'],
 'Fußsohle mit Ball mobilisieren':['standing|rest|still|ball','standing|rest|footBall|ball','Druck sanft dosieren'],
 'Fersengleiten in Rückenlage':['lying|down|legStraight|mat','lying|down|heelSlide|mat','Ferse kontrolliert Richtung Gesäß ziehen'],
 'Beinpendel vor und zurück':['standing|handsWaist|legFront|none','standing|handsWaist|rearLeg|none','Bein locker aus der Hüfte pendeln'],
 'Seitliches Beinpendel':['standing|handsWaist|legSideIn|none','standing|handsWaist|legSideOut|none','Bein seitlich führen, Rumpf ruhig'],
 'Hüftkreisen im Stand':['standing|holdWall|hipKneeUp|wall','standing|holdWall|hipKneeSide|wall','Knie aus der Hüfte kreisen, Becken stabil'],
 '90/90-Vorbeuge':['sittingFloor|handsFront|still|mat','sittingFloor|reachLow|still|mat','Aus der Hüfte nach vorn neigen'],
 'Hüftkreise im Vierfüßlerstand':['allFours|rest|still|mat','allFours|rest|sideLeg|mat','Becken ruhig halten'],
 'Quadrizeps-Dehnung im Stand':['standing|down|still|none','standing|handFoot|heelBack|none','Knie nebeneinander halten'],
 'Soleus-Dehnung mit gebeugtem Knie':['lunge|down|still|wall','lunge|down|kneeForward|wall','Ferse unten lassen'],
 'Hamstring-Dehnung mit Gurt':['lying|armsUp|legStraight|band','lying|strapHold|legUp|band','Knie nur so weit strecken wie angenehm'],
 'Beckenkippen in Rückenlage':['lying|down|kneesUp|mat','lying|down|pelvisTilt|mat','Becken klein und bewusst kippen'],
 'Beckenkreisen im Stand':['standing|handsWaist|still|none','standing|handsWaist|hipSide|none','Kleine kontrollierte Kreise'],
 'Knie zur Brust in Rückenlage':['lying|down|legStraight|mat','lying|kneeHold|heelSlide|mat','Ein Knie sanft zur Brust ziehen'],
 'Thread the Needle':['allFours|rest|still|mat','allFours|thread|still|mat','Arm unter dem Oberkörper durchführen'],
 'Brustwirbelsäulenstreckung über Foam Roller':['lying|down|kneesUp|foam','lying|overhead|kneesUp|foam','Brustwirbelsäule sanft strecken'],
 'Schulterkreisen':['standing|down|still|none','standing|shrug|still|none','Schultern rückwärts kreisen'],
 'Schulterheben mit Stab':['standing|holdLow|still|stick','standing|overhead|still|stick','Stab kontrolliert anheben'],
 'Handgelenksmobilisation':['standing|elbowsClose|still|none','standing|rotateOut|still|none','Handgelenke schmerzfrei bewegen']
};
const mobilityFocus={
 'Sprunggelenk-Mobilisation an der Wand':['ankle','calves'],
 'Fußkreisen':['ankle','calves'],
 'Fußsohle mit Ball mobilisieren':['plantar'],
 'Fersengleiten in Rückenlage':['quads','hamstrings'],
 'Beinpendel vor und zurück':['hipflexors','glutes','hamstrings'],
 'Seitliches Beinpendel':['glutes','adductors'],
 'Hüftkreisen im Stand':['hipflexors','glutes','hiprotators'],
 '90/90-Vorbeuge':['glutes','hiprotators'],
 'Hüftkreise im Vierfüßlerstand':['glutes','hiprotators'],
 'Quadrizeps-Dehnung im Stand':['quads'],
 'Soleus-Dehnung mit gebeugtem Knie':['soleus'],
 'Hamstring-Dehnung mit Gurt':['hamstrings'],
 'Beckenkippen in Rückenlage':['core','lowerback'],
 'Beckenkreisen im Stand':['core','glutes','hipflexors'],
 'Knie zur Brust in Rückenlage':['glutes','lowerback'],
 'Thread the Needle':['upperback','thoracic'],
 'Brustwirbelsäulenstreckung über Foam Roller':['upperback','thoracic'],
 'Schulterkreisen':['shoulders','upperback'],
 'Schulterheben mit Stab':['shoulders','upperback'],
 'Handgelenksmobilisation':['forearms','wrists']
};
// Muscle groups indicate the primary region mobilized or stretched, not a
// diagnosis or a claim that each highlighted muscle is a prime mover.
const atlas=Object.assign({},strength,mobility);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const armPresets={
 down:[[84,122,82,158],[136,122,138,158]],rest:[[85,115,105,154],[135,115,115,154]],carry:[[82,123,77,160],[138,123,143,160]],
 wide:[[53,101,34,112],[167,101,186,112]],flyWide:[[62,108,35,103],[158,108,185,103]],flyClose:[[77,112,105,110],[143,112,115,110]],
 press:[[79,104,108,98],[141,104,112,98]],curl:[[80,125,89,102],[140,125,131,102]],
 overhead:[[85,64,94,33],[135,64,126,33]],behindHead:[[85,64,106,76],[135,64,114,76]],reachUp:[[68,62,72,35],[152,62,148,35]],
 lowPull:[[79,125,99,147],[141,125,121,147]],row:[[67,126,104,116],[153,126,116,116]],rowOne:[[78,128,108,112],[145,128,147,158]],downOne:[[83,133,81,157],[145,128,147,158]],
 elbowsClose:[[83,114,103,121],[137,114,117,121]],rotateOut:[[77,118,60,109],[143,118,160,109]],
 pallofClose:[[91,119,104,126],[129,119,116,126]],pallofFar:[[89,120,110,118],[131,120,110,118]],
 handsCross:[[85,107,126,113],[135,107,94,113]],handsWaist:[[72,116,94,156],[148,116,126,156]],holdWall:[[80,122,81,155],[151,111,183,107]],
 handsFront:[[80,115,106,155],[140,115,114,155]],reachLow:[[73,127,109,180],[147,127,111,180]],
 handFoot:[[77,135,90,187],[142,119,133,145]],kneeHold:[[90,132,111,175],[130,132,111,175]],
 armsUp:[[86,70,94,38],[134,70,126,38]],diagonal:[[83,64,72,41],[134,98,146,137]],
 holdLow:[[83,124,94,158],[137,124,126,158]],shrug:[[78,112,73,143],[142,112,147,143]],
 strapHold:[[83,105,89,132],[137,105,131,132]],thread:[[80,142,127,161],[141,128,125,159]],
 extend:[[80,140,60,129],[141,140,157,153]]
};
const legPresets={
 still:[[95,211,91,263],[125,211,129,263]],walkA:[[90,213,82,259],[130,213,151,266]],walkB:[[99,211,112,264],[120,211,107,259]],
 kneeBent:[[95,211,89,236],[125,211,132,236]],kneeStraight:[[95,197,81,246],[125,197,139,246]],
 kneeClose:[[102,207,90,239],[118,207,130,239]],kneeWide:[[75,207,67,239],[145,207,153,239]],
 oneLeg:[[99,211,99,262],[137,190,153,220]],rearLeg:[[102,213,102,262],[140,194,174,165]],
 kneeForward:[[86,215,96,262],[141,213,143,263]],heelBack:[[102,212,100,263],[140,197,133,180]],
 legFront:[[100,215,103,267],[127,189,166,221]],legSideIn:[[94,211,94,265],[126,207,126,262]],legSideOut:[[94,211,94,265],[145,218,172,249]],
 hipSide:[[88,210,80,264],[132,215,142,263]],hipKneeUp:[[95,211,91,263],[143,183,148,219]],hipKneeSide:[[95,211,91,263],[173,170,151,213]],footTurn:[[93,195,93,251],[126,200,150,248]],footBall:[[94,211,94,258],[130,203,142,249]],
 sideLeg:[[100,187,93,217],[136,188,167,168]],
 legStraight:[[100,208,75,252],[128,206,150,250]],kneesUp:[[87,198,83,256],[137,198,149,256]],
 heelSlide:[[100,213,72,245],[123,187,139,249]],legUp:[[96,178,89,111],[128,207,151,258]],
 deadBug:[[98,188,105,237],[140,200,167,258]],pelvisTilt:[[94,198,91,257],[136,197,148,257]]
};
// Atlas intentionally uses explicit position choices for each named movement.
function stageShape(name,descriptor,step){
 const [base,armKey,legKey,gear]=descriptor.split('|');
 const arms=armPresets[armKey]||armPresets.down,legs=legPresets[legKey]||legPresets.still;
 const lines=[];
 const fmt=n=>Number(n).toFixed(1);
 const bg=`<defs><linearGradient id="bg${step}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3a4140"/><stop offset=".72" stop-color="#202d30"/><stop offset="1" stop-color="#121b24"/></linearGradient><linearGradient id="skin${step}" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#e1b28b"/><stop offset="1" stop-color="#b47c60"/></linearGradient></defs><rect width="220" height="290" rx="15" fill="url(#bg${step})"/><path d="M0 262H220" stroke="#75807c" stroke-opacity=".35" stroke-width="3"/><path d="M21 0V260M197 0V260" stroke="#66706a" stroke-width="6" opacity=".2"/><path d="M15 45H205" stroke="#7b8278" stroke-width="4" opacity=".13"/>`;
 let floor=`<ellipse cx="110" cy="265" rx="77" ry="9" fill="#080f15" opacity=".46"/>`;
 const bone=(a,b,c,d,w=15,color=`url(#skin${step})`)=>`<path d="M${fmt(a)} ${fmt(b)}L${fmt(c)} ${fmt(d)}" stroke="#343638" stroke-width="${w+3}" stroke-linecap="round"/><path d="M${fmt(a)} ${fmt(b)}L${fmt(c)} ${fmt(d)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
 const shoe=(x,y)=>`<path d="M${x-8} ${y-4}q0 6-10 12h29q3-8-6-12Z" fill="#d8dbd6" stroke="#34404a" stroke-width="2"/>`;
 const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
 let props='';
 if(gear==='machine')props='<path d="M28 58V254H187V58M28 80H187" stroke="#929b91" stroke-width="7" opacity=".48"/><rect x="80" y="190" width="74" height="9" rx="5" fill="#7c8580"/>';
 if(gear==='bench')props='<rect x="62" y="196" width="100" height="11" rx="5" fill="#49545c"/><path d="M74 207L55 258M146 207L165 258" stroke="#6b757c" stroke-width="6"/>';
 if(gear==='cable')props='<path d="M15 45V257M205 45V257" stroke="#adb6ad" stroke-width="5" opacity=".45"/><path d="M15 64L55 101M205 64L165 101" stroke="#8fa59b" stroke-width="2"/>';
 if(gear==='wall')props='<rect x="183" y="20" width="10" height="246" fill="#7b837e" opacity=".55"/>';
 if(gear==='mat'||base==='lying'||base==='bridgeLow'||base==='bridgeHigh'||base==='allFours'||base==='sittingFloor')props+='<rect x="18" y="257" width="185" height="8" rx="4" fill="#8caa9b" opacity=".55"/>';
 if(gear==='foam')props+='<circle cx="116" cy="235" r="14" fill="#687e8a" stroke="#c3d4d0" stroke-width="3"/>';
 if(gear==='ball')props+='<circle cx="145" cy="258" r="10" fill="#94dbe0" stroke="#2f7789" stroke-width="2"/>';
 if(gear==='band')props+='<path d="M11 130H76" stroke="#d4e763" stroke-width="4" stroke-dasharray="8 3"/>';
 let body='';
 if(base==='lying'||base==='bridgeLow'||base==='bridgeHigh'){
  const raised=base==='bridgeHigh';
  const cx=raised?116:110,cy=raised?222:244;
  body+=`<path d="M42 ${raised?227:244}L${cx} ${cy-5}" stroke="#252c31" stroke-width="26" stroke-linecap="round"/>`;
  body+=circle(35,raised?225:242,14,`url(#skin${step})`);
  body+=`<path d="M${cx} ${cy}L151 210L174 255" fill="none" stroke="#252d37" stroke-width="17" stroke-linecap="round"/>`;
  body+=shoe(176,257);
  if(legKey==='legUp')body+=`<path d="M${cx} ${cy}L125 160L128 88" stroke="url(#skin${step})" stroke-width="17" fill="none" stroke-linecap="round"/>`;
  if(legKey==='heelSlide')body+=`<path d="M${cx} ${cy}L136 205L153 251" stroke="url(#skin${step})" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  if(legKey==='pelvisTilt')body+='<path d="M105 230Q118 212 129 227" stroke="#a8f55d" stroke-width="4" fill="none"/>';
  if(legKey==='deadBug'||armKey==='diagonal')body+='<path d="M105 227L148 175L181 144M88 238L75 204L48 186" stroke="#c29274" stroke-width="14" fill="none" stroke-linecap="round"/>';
  body+=`<path d="M73 ${cy-5}L91 ${cy-12}" stroke="url(#skin${step})" stroke-width="13" stroke-linecap="round"/>`;
  if(armKey==='overhead'||armKey==='armsUp'||armKey==='strapHold')body+='<path d="M75 229L55 186L51 169" stroke="url(#skin'+step+')" stroke-width="12" stroke-linecap="round" fill="none"/>';
  if(armKey==='kneeHold')body+='<path d="M76 229L126 207L143 215" stroke="url(#skin'+step+')" stroke-width="11" stroke-linecap="round" fill="none"/>';
 }else if(base==='allFours'){
  body+=`<path d="M83 159L139 145" stroke="#252d35" stroke-width="29" stroke-linecap="round"/>`;
  body+=circle(163,133,13,`url(#skin${step})`);
  body+='<path d="M80 160L69 205L65 249M133 149L147 207L143 250" stroke="#b78c70" stroke-width="17" fill="none" stroke-linecap="round"/>';
  if(armKey==='extend')body+='<path d="M139 147L177 140L203 132M80 160L46 142L18 126" stroke="#cfad8b" stroke-width="15" fill="none" stroke-linecap="round"/>';
  else if(armKey==='thread')body+='<path d="M136 150L115 177L68 177" stroke="#cfad8b" stroke-width="15" fill="none" stroke-linecap="round"/>';
  else body+='<path d="M148 156L159 210L164 251" stroke="#cda27e" stroke-width="13" fill="none" stroke-linecap="round"/>';
  if(legKey==='sideLeg')body+='<path d="M84 161L62 126L32 114" stroke="#c18a6b" stroke-width="16" fill="none" stroke-linecap="round"/>';
 }else{
  const sitting=base==='sitting'||base==='sittingFloor';
  const lunging=base==='lunge';
  const hinging=base==='hinge';
  let shift=hinging?14:0;
  let shoulderY=sitting?87:91;
  let hipY=sitting?170:165;
  // Lean torso and head together on hinges and forward bends.
  let tilt=hinging?40:(armKey==='reachLow'?22:0);
  const torso=`<path d="M88 88Q111 78 132 88L128 159Q111 165 94 159Z" fill="#202a32" stroke="#586168" stroke-width="2"/><path d="M101 90L95 149" stroke="#687378" stroke-opacity=".35" stroke-width="3"/>`;
  const face=`<ellipse cx="110" cy="60" rx="15" ry="18" fill="url(#skin${step})"/><path d="M99 52q13-15 26-5v7q-5-9-12-7-7 2-14 10Z" fill="#252323"/><path d="M105 66h7" stroke="#714c40" stroke-width="1"/>`;
  const legsSvg=(()=>{
   if(lunging){const forward=legKey==='kneeForward';return bone(97,159,forward?102:82,forward?226:209)+bone(forward?102:82,forward?226:209,92,262)+bone(123,159,164,205)+bone(164,205,164,258)+shoe(92,260)+shoe(164,257);}
   if(base==='sittingFloor')return bone(97,161,67,211)+bone(67,211,119,255)+bone(125,161,153,211)+bone(153,211,187,254)+shoe(117,255)+shoe(181,253);
   if(sitting){
    const spread=legKey==='kneeWide',close=legKey==='kneeClose';
    const straight=legKey==='kneeStraight',turned=legKey==='footTurn';
    const aK=spread?54:close?106:87,bK=spread?166:close?114:141;
    const aF=straight?59:turned?60:spread?42:close?108:73,bF=straight?178:turned?174:spread?178:close?113:159;
    const footY=straight?198:turned?225:244;
    return bone(97,162,aK,198,17,'#242e37')+bone(aK,198,aF,footY,15,`url(#skin${step})`)+bone(124,162,bK,199,17,'#242e37')+bone(bK,199,bF,footY,15,`url(#skin${step})`)+shoe(aF,footY)+shoe(bF,footY);
   }
   return legs.map(([kx,ky,ax,ay],i)=>bone(i?124:96,157,kx,ky,17,'#26333b')+bone(kx,ky,ax,ay,15,`url(#skin${step})`)+shoe(ax,ay)).join('');
  })();
  body+=legsSvg;
  body+=`<g transform="rotate(${tilt} 110 160)">${torso}${face}`;
  for(let i=0;i<2;i++){
    const [ex,ey,wx,wy]=arms[i],sx=i===0?92:129;
    body+=bone(sx,94,ex,ey,14)+bone(ex,ey,wx,wy,12);
    if(gear==='dumbbell'||gear==='stick')body+=`<g transform="translate(${wx} ${wy})"><path d="M-15 0H15" stroke="#b1b9ba" stroke-width="4"/>${gear==='dumbbell'?'<rect x="-16" y="-9" width="6" height="18" rx="2" fill="#181d22"/><rect x="10" y="-9" width="6" height="18" rx="2" fill="#181d22"/>':''}</g>`;
  }
  body+='</g>';
  if(gear==='stick')body+='<path d="M82 160L139 160" stroke="#d7be84" stroke-width="5" stroke-linecap="round"/>';
  if(gear==='band'&&armKey==='pallofFar')body+='<path d="M12 128L110 118" stroke="#d8e15d" stroke-width="3" stroke-dasharray="6 4"/>';
  if(gear==='bench'&&hinging)body+='<path d="M55 186L85 166" stroke="#78868b" stroke-width="13" stroke-linecap="round" opacity=".5"/>';
 }
 const nameMarkup=`<title>${safe(name)} – ${step===0?'Startposition':'Endposition'}</title>`;
 const label=step===0?'START':'ENDE';
 return `<svg class="forge162-art" viewBox="0 0 220 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${safe(name)} – ${label}">${nameMarkup}${bg}${floor}${props}${body}<rect x="11" y="12" width="67" height="24" rx="12" fill="#15241d" stroke="#a8f55d"/><text x="44" y="28" font-size="10" fill="#baff82" text-anchor="middle" font-weight="800">${label}</text></svg>`;
}
function muscleAtlas(name){
 let zs=[];
 try{if(typeof FORGE_MUSCLE_ZONES!=='undefined'&&Array.isArray(FORGE_MUSCLE_ZONES[name]))zs=FORGE_MUSCLE_ZONES[name];}catch(_){}
 const active=(...ids)=>ids.some(z=>zs.includes(z));
 const muscle=(part,isOn)=>`<path d="${part}" fill="${isOn?'#f07869':'#889696'}" stroke="#1c292b" stroke-width="2"/>`;
 const torso=muscle('M39 77Q60 66 81 77L77 138Q60 144 43 138Z',active('chest','upperback','core','lowerback'));
 const abs=muscle('M48 111L72 111L69 136L50 136Z',active('abs','core','lowerback'));
 const armL=muscle('M36 85L22 127L29 134L44 98Z',active('biceps','triceps','shoulders'));
 const armR=muscle('M84 85L98 127L91 134L76 98Z',active('biceps','triceps','shoulders'));
 const hip=muscle('M43 139L77 139L81 156L40 156Z',active('glutes','core'));
 const legL=muscle('M44 154L38 207L53 210L59 165Z',active('quads','hamstrings','glutes'));
 const legR=muscle('M76 154L82 207L67 210L61 165Z',active('quads','hamstrings','glutes'));
 const calfL=muscle('M38 210L37 262L49 262L53 210Z',active('calves'));
 const calfR=muscle('M82 210L83 262L71 262L67 210Z',active('calves'));
 return `<figure class="forge162-stage forge162-muscle-stage"><svg class="forge162-art" viewBox="0 0 120 290" role="img" aria-label="${safe(name)} beanspruchte Muskeln" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="290" fill="#202c32"/><ellipse cx="60" cy="42" rx="18" ry="22" fill="#a4aaa8"/>${torso}${abs}${armL}${armR}${hip}${legL}${legR}${calfL}${calfR}<path d="M6 275H114" stroke="#9faa9a" opacity=".55"/></svg><figcaption>3 · Muskeln</figcaption></figure>`;
}

function mobilityAnatomy(name){
 const focus=mobilityFocus[name]||[];
 const on=(...keys)=>keys.some(k=>focus.includes(k));
 const p=(d,active,extra='')=>'<path d="'+d+'" fill="'+(active?'#f07758':'#899497')+'" stroke="#263238" stroke-width="1.3" '+extra+'/>';
 const base='<rect width="220" height="290" fill="#202c32"/><path d="M110 15V270" stroke="#627174" stroke-dasharray="3 5"/>';
 const front='<g aria-label="Vorderseite">'+
  p('M41 22Q43 7 55 6Q68 6 70 22Q70 39 56 42Q41 39 41 22Z',false)+
  p('M34 57Q56 44 78 57L73 124Q55 134 39 124Z',false)+
  p('M38 65L24 107L14 145L24 151L35 115L46 76Z',on('forearms'))+
  p('M74 65L86 107L96 145L86 151L75 115L65 76Z',on('forearms'))+
  p('M17 143L13 155L24 158L25 147Z',on('wrists'))+
  p('M93 143L97 155L86 158L85 147Z',on('wrists'))+
  p('M33 58Q39 53 45 57L45 77Q37 85 31 75Z',on('shoulders'))+
  p('M77 58Q71 53 65 57L65 77Q73 85 79 75Z',on('shoulders'))+
  p('M44 87L68 87L67 120L44 120Z',on('core'))+
  p('M41 118L53 120L55 143L43 147Z',on('hipflexors'))+
  p('M70 118L58 120L56 143L68 147Z',on('hipflexors'))+
  p('M41 140L37 202L52 209L54 146Z',on('quads'))+
  p('M69 140L73 202L58 209L56 146Z',on('quads'))+
  p('M52 149L54 194L56 194L55 149Z',on('adductors'))+
  p('M58 149L56 194L54 194L55 149Z',on('adductors'))+
  p('M37 208L35 261L48 265L52 208Z',false)+
  p('M73 208L75 261L62 265L58 208Z',false)+
  p('M35 257L35 268L48 268L48 257Z',on('ankle'))+
  p('M75 257L75 268L62 268L62 257Z',on('ankle'))+
  p('M35 265L24 276L49 276L48 265Z',on('plantar'))+
  p('M75 265L86 276L61 276L62 265Z',on('plantar'))+
  '</g>';
 const back='<g transform="translate(110 0)" aria-label="Rückseite">'+
  p('M41 22Q43 7 55 6Q68 6 70 22Q70 39 56 42Q41 39 41 22Z',false)+
  p('M34 57Q56 44 78 57L73 124Q55 134 39 124Z',on('upperback','thoracic'))+
  p('M33 58Q39 53 45 57L45 77Q37 85 31 75Z',on('shoulders'))+
  p('M77 58Q71 53 65 57L65 77Q73 85 79 75Z',on('shoulders'))+
  p('M38 65L24 107L14 145L24 151L35 115L46 76Z',on('forearms'))+
  p('M74 65L86 107L96 145L86 151L75 115L65 76Z',on('forearms'))+
  p('M17 143L13 155L24 158L25 147Z',on('wrists'))+
  p('M93 143L97 155L86 158L85 147Z',on('wrists'))+
  p('M46 86L64 86L64 109L46 109Z',on('thoracic'))+
  p('M43 111L67 111L69 130L41 130Z',on('lowerback'))+
  p('M41 127Q54 121 55 143L53 156Q37 153 41 127Z',on('glutes','hiprotators'))+
  p('M69 127Q56 121 55 143L57 156Q73 153 69 127Z',on('glutes','hiprotators'))+
  p('M41 151L37 202L52 209L54 151Z',on('hamstrings'))+
  p('M69 151L73 202L58 209L56 151Z',on('hamstrings'))+
  p('M37 208L35 260L48 264L52 208Z',on('calves','soleus'))+
  p('M73 208L75 260L62 264L58 208Z',on('calves','soleus'))+
  p('M39 237L37 260L46 262L48 237Z',on('soleus'))+
  p('M71 237L73 260L64 262L62 237Z',on('soleus'))+
  p('M35 260L35 268L48 268L48 260Z',on('ankle'))+
  p('M75 260L75 268L62 268L62 260Z',on('ankle'))+
  p('M35 265L24 276L49 276L48 265Z',on('plantar'))+
  p('M75 265L86 276L61 276L62 265Z',on('plantar'))+
  '</g>';
 return '<figure class="forge162-stage forge162-muscle-stage forge162-mobility-anatomy" data-focus="'+focus.join(',')+'">'+
  '<svg class="forge162-art" viewBox="0 0 220 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+safe(name)+' – mobilisierte Muskelgruppen, Vorder- und Rückseite">'+base+front+back+'</svg>'+
  '<figcaption>3 · Muskeln</figcaption></figure>';
}
function illustration(name){
 const d=atlas[name];if(!d)return '';
 return `<div class="forge162-stage-grid${Object.hasOwn(strength,name)?' forge162-strength':' forge162-mobility'}" data-forge-movement="${safe(name)}">`+
 d.slice(0,2).map((stage,i)=>`<figure class="forge162-stage"><div class="forge162-image">${stageShape(name,stage,i)}</div><figcaption>${i===0?'1 · Startposition':'2 · Endposition'}</figcaption></figure>`).join('')+
 (Object.hasOwn(strength,name)?muscleAtlas(name):mobilityAnatomy(name))+
 `</div><p class="forge162-tech-note">${safe(d[2])} · Schematische Technikillustration; die beschriebenen Übungsschritte sind maßgeblich.</p>`;
}
function styles(){if(document.getElementById('forge162Style'))return;const s=document.createElement('style');s.id='forge162Style';s.textContent=`
 #plan .forge162-stage-grid,.forge-plus-item .forge162-stage-grid,.forge-ex-body .forge162-stage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:9px 0 12px}
 .forge162-stage{margin:0;min-width:0;align-self:start;border-radius:12px;overflow:hidden;background:#1e2b31;border:1px solid #40544f}
 .forge162-stage .forge162-art{width:100%;height:auto;display:block;max-height:280px}
 .forge162-stage figcaption{padding:8px 4px 9px;text-align:center;color:#e8f4df;font-size:12px;font-weight:750}
 .forge162-tech-note{font-size:11px;line-height:1.5;color:#aabeba;margin:0 0 11px!important}
 #plan .forge162-stage-grid.forge162-strength,#plan .forge162-stage-grid.forge162-mobility,.forge-plus-item .forge162-stage-grid.forge162-mobility,.forge-ex-body .forge162-stage-grid.forge162-mobility,.forge162-strength,.forge162-mobility{grid-template-columns:repeat(3,minmax(0,1fr))}
 .forge162-strength .forge162-stage .forge162-art{max-height:220px}
 .forge162-muscle-stage .forge162-art{height:155px;width:100%;object-fit:contain;background:#202c32}
 .forge162-stage .forge162-art{user-select:none;pointer-events:none}
 `;document.head.appendChild(s);}
window.forgeExerciseIllustrations=illustration;
const old=window.forgePublicExercisePictures;
if(typeof old==='function'&&!old.forge162){
 const f=function(name){return atlas[name]?illustration(name):old(name);};f.forge162=true;window.forgePublicExercisePictures=f;
}
window.forge162AtlasInfo={strengthNames:Object.keys(strength),mobilityNames:Object.keys(mobility),mobilityFocus,get:illustration};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',styles,{once:true});else styles();
})();