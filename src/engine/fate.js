/* LIFE & LEGACY — engine/fate.js
 * The Universe Will: a top-level layer above the old fate table (nemesis/ill/
 * trust in life.js yearlyFate). Where yearlyFate tracks personal fortunes,
 * fateWill tracks the UNIVERSE's stance toward you — a slow tide (-100..100)
 * that rises with a luminous life (high karma, prestige, renown) and sinks
 * with a dark one. At the extremes it intervenes: boons and trials, plus
 * milestone omens at life's hinge ages. Everything is tiny, logged, and
 * lazy-ensured (no save bump; old saves grow the fields on first tick).
 * Load order: after history.js (uses historyEra for flavor), called once per
 * year from runYearlySocialSystems in yearly.js. Shared scope: classic scripts.
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
var FATE_MILESTONES=[18,21,30,40,50,65,80,100];
function fateEnsure(){
  try{
    if(!S||typeof S!=="object")return null;
    if(!S.fate||typeof S.fate!=="object")S.fate={nemesis:false,ill:false,trust:false};
    var F=S.fate;
    if(typeof F.tide!=="number")F.tide=0;
    if(typeof F.boons!=="number")F.boons=0;
    if(typeof F.trials!=="number")F.trials=0;
    if(typeof F.lastBoon!=="number")F.lastBoon=-99;
    if(typeof F.lastTrial!=="number")F.lastTrial=-99;
    if(typeof F.omen!=="string")F.omen="";
    if(typeof F.omenAge!=="number")F.omenAge=0;
    if(!F.mile||typeof F.mile!=="object")F.mile={};
    return F;
  }catch(e){ return null; }
}
function fateTideWord(){
  try{
    var t=(S&&S.fate&&typeof S.fate.tide==="number")?S.fate.tide:0;
    if(t>=60)return "radiant";
    if(t>=25)return "warming";
    if(t>-25)return "still";
    if(t>-60)return "cooling";
    return "dark";
  }catch(e){ return "still"; }
}
function fateChipHTML(){
  try{
    if(!S||!S.alive)return "";
    fateEnsure();
    var w=fateTideWord();
    var icon=w==="radiant"?"🌌":(w==="dark"?"🌑":(w==="still"?"🌗":(w==="warming"?"🌅":"🌇")));
    return '<span class="dynch" title="The Universe Will: '+w+' (boons '+S.fate.boons+' · trials '+S.fate.trials+')">'+icon+' '+w+'</span>';
  }catch(e){ return ""; }
}
/* One tick per year. silent years (fast-forward/jail-path skips) still drift
 * the tide but never log or pay out — fate keeps its books either way. */
function fateWill(silent){
  var F=fateEnsure(); if(!F||!S||!S.alive)return;
  try{
    if(S.perYear&&S.perYear.fateWill)return;
    try{ S.perYear.fateWill=1; }catch(e){}
    var karma=(S.stats&&typeof S.stats.karma==="number")?S.stats.karma:50;
    var prestige=(typeof S.prestige==="number")?S.prestige:0;
    var renown=(typeof S.renown==="number")?S.renown:0;
    var drift=(karma-50)/12+Math.max(-20,Math.min(20,prestige/60))+Math.max(-10,Math.min(10,renown/20));
    F.tide=Math.max(-100,Math.min(100,Math.round(F.tide*0.92+drift)));
    if(silent)return;
    var tidem=fateTideWord();
    /* milestone omens: hinge ages get a line from the universe + a breath of luck */
    if(FATE_MILESTONES.indexOf(S.age)>=0&&!F.mile[S.age]){
      F.mile[S.age]=1;
      var line=fateOmenLine(tidem);
      F.omen=line; F.omenAge=S.age;
      S.stats.happiness=clamp100(S.stats.happiness+2);
      pushLog(S.age,tidem==="dark"?"🌑":"🌌","Fate omen at "+S.age+": "+line,"event");
      return;
    }
    /* boons and trials: extremes intervene, at most every 4 years each */
    if(F.tide>=55&&S.year-F.lastBoon>=4){
      F.lastBoon=S.year; F.boons++;
      var b=Math.floor(rnd()*3), txt="";
      if(b===0){ S.stats.happiness=clamp100(S.stats.happiness+4); txt="Fortune smiles without reason: +4 happiness."; }
      else if(b===1){ var g=Math.max(200,Math.min(1500,Math.round(netWorth()*0.02)+200)); S.money+=g; S.totalEarned+=g; txt="Found money, honest kind: +"+fmt$(g)+"."; }
      else { S.prestige+=3; txt="Your name travels well this year: +3 prestige."; }
      F.omen="The universe leans your way."; F.omenAge=S.age;
      pushLog(S.age,"🌌","Boon: "+txt,"good");
    } else if(F.tide<=-55&&S.year-F.lastTrial>=4){
      F.lastTrial=S.year; F.trials++;
      var t2=Math.floor(rnd()*3), txt2="";
      if(t2===0){ S.stats.happiness=clamp100(S.stats.happiness-4); txt2="Grey days with no name: -4 happiness."; }
      else if(t2===1&&S.money>500){ var l=Math.min(S.money-100,Math.max(100,Math.round(netWorth()*0.02))); S.money-=l; txt2="A careless loss stings: -"+fmt$(l)+"."; }
      else { S.stress=clamp100(S.stress+5); txt2="Static in the air: +5 stress."; }
      F.omen="The universe watches, arms crossed."; F.omenAge=S.age;
      pushLog(S.age,"🌑","Trial: "+txt2,"bad");
    } else if(rnd()<0.06){
      /* faint static: the Will turns over in its sleep (pure flavor, no fx) */
      var murmur=pick(["Somewhere, a door you never opened clicks shut.","The stars keep their own counsel tonight.","A stranger thinks of you kindly and moves on.","The wind changes over your house.","Your name is spoken well where you cannot hear it.","Coincidence winks and keeps walking."]);
      pushLog(S.age,"🌗","Murmur of the Will: "+murmur,"event");
    }
  }catch(e){}
}
function fateOmenLine(tidew){
  try{
    var era=""; try{ era=historyEra(S.year); }catch(e){}
    if(tidew==="radiant")return "a bright road through "+era+" — walk tall.";
    if(tidew==="warming")return "fair winds gathering over "+era+".";
    if(tidew==="cooling")return "grey water ahead in "+era+" — mind your compass.";
    if(tidew==="dark")return "a hard winter inside "+era+" — endure, and keep kind.";
    return "still water in "+era+" — the choice is wholly yours.";
  }catch(e){ return "the choice is wholly yours."; }
}
LL.files.push("fate");
