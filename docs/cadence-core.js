/* Calendar-safe, dependency-free training cadence math used by FORGE. 
   Use UTC date ordinals, never milliseconds between local midnights (DST!). */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ForgeCadenceCore=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const MS=86400000;
  function toOrdinal(iso){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))throw Error('Datum muss JJJJ-MM-TT sein');
    const [y,m,d]=iso.split('-').map(Number),v=Date.UTC(y,m-1,d);
    const check=new Date(v);
    if(check.getUTCFullYear()!==y||check.getUTCMonth()+1!==m||check.getUTCDate()!==d)
      throw Error('Ungültiges Kalenderdatum');
    return Math.floor(v/MS);
  }
  function fromOrdinal(n){return new Date(n*MS).toISOString().slice(0,10);}
  function localToday(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
  function validate(c){
    if(!c||c.mode!=='interval'||!Number.isInteger(c.every)||c.every<1||c.every>14)throw Error('Intervall muss 1 bis 14 Tage betragen');
    toOrdinal(c.anchor);
    if(!Array.isArray(c.planOrder)||!c.planOrder.length||!c.planOrder.every(x=>typeof x==='string'&&x.length))throw Error('Fehlende Trainingseinheiten');
    return c;
  }
  function onDate(c,iso){
    validate(c);
    const delta=toOrdinal(iso)-toOrdinal(c.anchor);
    if(delta<0||delta%c.every!==0)return null;
    const index=delta/c.every;
    return {date:iso,step:index,planId:c.planOrder[index%c.planOrder.length]};
  }
  function next(c,iso){
    validate(c);
    const diff=toOrdinal(iso)-toOrdinal(c.anchor);
    const step=Math.max(0,Math.ceil(diff/c.every));
    const date=fromOrdinal(toOrdinal(c.anchor)+step*c.every);
    return {date,step,planId:c.planOrder[step%c.planOrder.length]};
  }
  function upcoming(c,iso,count=4){
    const list=[],first=next(c,iso);
    for(let i=0;i<count;i++){
      const step=first.step+i;
      list.push({date:fromOrdinal(toOrdinal(c.anchor)+step*c.every),step,planId:c.planOrder[step%c.planOrder.length]});
    }
    return list;
  }
  function week(c,iso){
    const n=toOrdinal(iso);const dow=(new Date(n*MS).getUTCDay()+6)%7,mon=n-dow;
    return Array.from({length:7},(_,i)=>({date:fromOrdinal(mon+i),weekday:i,event:onDate(c,fromOrdinal(mon+i))}));
  }
  return Object.freeze({toOrdinal,fromOrdinal,localToday,validate,onDate,next,upcoming,week});
});