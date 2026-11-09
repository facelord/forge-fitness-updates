/* FORGE Layout B · Pausenzeit pro Übung.
 * Eine Plan-Übung kann ein eigenes Feld `rest` (Sekunden) haben. Ohne Feld gilt
 * die allgemeine Satzpause aus den Einstellungen (forge130Settings().restSeconds).
 * Nach einem Arbeitssatz startet der Kern den Pausentimer (forge130AfterSetDone →
 * forge130StartRest); diese Schicht setzt danach nur die Dauer auf den Wert der
 * Übung, deren Satz gerade abgeschlossen wurde. Aufwärmsätze behalten die
 * allgemeine Pause. Kein neues Speicherformat außer dem optionalen Feld `rest`.
 */
(function(){
'use strict';
const STEPS=Object.freeze([0,30,45,60,75,90,120,150,180,240,300]); // 0 = Standard
function clock(sec){const s=Math.max(0,Math.round(Number(sec)||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function valid(sec){const n=Number(sec);return Number.isInteger(n)&&n>=15&&n<=600;}
/* Label for the editor: "Standard (1:30)" or "2:00". */
function label(sec,def){return valid(sec)?clock(sec):'Standard ('+clock(def||90)+')';}
/* Next value (dir ±1) starting from the general pause `def` when unset.
 * Landing on the general value returns 0 = "Standard". */
function step(cur,dir,def){
 const d=valid(def)?Number(def):90;
 const c=valid(cur)?Number(cur):d;
 const list=STEPS.filter(v=>v>0);
 let next=dir>0?list.find(v=>v>c):list.slice().reverse().find(v=>v<c);
 if(next===undefined)next=dir>0?list[list.length-1]:list[0];
 return next===d?0:next;
}
/* Seconds for exercise i of plan p, or null when the general value applies. */
function restFor(p,i){const e=p&&Array.isArray(p.ex)?p.ex[i]:null;return e&&valid(e.rest)?Number(e.rest):null;}
window.ForgeLayoutBRest=Object.freeze({STEPS,clock,valid,label,step,restFor});
if(typeof document==='undefined')return;

let justDone=null; // {planId,i,at}
function wrap(){
 const after=window.forge130AfterSetDone,start=window.forge130StartRest;
 if(typeof after==='function'&&!after.__forgeLbRest){
  const w=function(i,j){
   try{justDone={planId:typeof workoutSelect!=='undefined'?workoutSelect.value:null,i:Number(i),at:Date.now()};}catch(e){justDone=null;}
   try{return after.apply(this,arguments);}finally{justDone=null;}
  };
  w.__forgeLbRest=true;window.forge130AfterSetDone=w;
 }
 if(typeof start==='function'&&!start.__forgeLbRest){
  const w=function(){
   const r=start.apply(this,arguments);
   try{
    const st=typeof state!=='undefined'?state:null;
    if(st&&st.forgeRest&&justDone&&Date.now()-justDone.at<2000){
     const p=(st.plan||[]).find(x=>String(x.id)===String(justDone.planId));
     const sec=restFor(p,justDone.i);
     if(sec&&sec!==st.forgeRest.seconds){
      st.forgeRest.endAt=Date.now()+sec*1000;st.forgeRest.seconds=sec;st.forgeRest.perExercise=true;
      if(typeof save==='function')save();
      if(typeof forge130RenderRest==='function')forge130RenderRest();
     }
    }
   }catch(e){console.error('FORGE Pause pro Übung',e);}
   return r;
  };
  w.__forgeLbRest=true;window.forge130StartRest=w;
 }
 return typeof window.forge130AfterSetDone==='function'&&window.forge130AfterSetDone.__forgeLbRest&&typeof window.forge130StartRest==='function'&&window.forge130StartRest.__forgeLbRest;
}
function boot(){if(wrap())return;let k=0;const t=setInterval(()=>{if(wrap()||++k>40)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
