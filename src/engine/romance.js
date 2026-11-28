/* LIFE & LEGACY — engine/romance.js (v0.1.05 Choose your person)
 * Answers "who do I get to be with?": Find date now opens a suitors modal —
 * three faces you can look over BEFORE committing, each with two paths:
 * 💘 Ask out (dating → the partner slot) or 🔥 Keep casual (lovers list,
 * no partner slot touched). Taken players get honest options: leave your
 * partner for someone new, or risk an affair (jealousy roll, consequences).
 * Plus three verbs the UI never had: 💔 Break up (end an unmarried
 * partnership cleanly), 💘 Commit (promote a lover to partner), 🚶 End fling
 * (drop the latest casual thing). Lovers sync into world NPCs so they show
 * in the Family roster with a chat button, like everyone who matters.
 * No new save shape: partner slot, S.sex.lovers and NPC sync already exist;
 * suitors live on window.__suitors (transient, never saved). Silent-safe:
 * verbs are player-only, never called by ticks.
 * Shared scope: classic script, globals (S, LL). Load order = index.html
 * order (after actions.js). Registered in boot EXPECT_FILES.
 */
function romVibePool(){ return ["ambitious","soft-spoken","rowdy","bookish","charming","brooding","sunny","mischievous","grounded","wild-hearted","old-souled","restless","tender","bold","witty","patient"]; }
function romJobPool(){ return ["barista","student","mechanic","nurse","musician","coder","server","athlete","artist","drifter","baker","driver"]; }
function romLooksWord(l){ return l>=80?"striking":(l>=60?"cute":(l>=40?"unremarkable":"rough-around-the-edges")); }
function makeSuitors(){
  var out=[], i, g;
  for(i=0;i<3;i++){
    g=partnerGender();
    var nm=rNameG(g), age=S.age+Math.floor(rnd()*9)-3;
    if(S.age<18) age=Math.max(14,Math.min(19,S.age+Math.floor(rnd()*5)-2));
    else age=Math.max(18,age);
    var looks=1+Math.floor(rnd()*100);
    var sit=S.age<18?"in school":romJobPool()[Math.floor(rnd()*romJobPool().length)];
    out.push({name:nm,sex:inferSexByName(nm),age:age,looks:looks,
      vibe:romVibePool()[Math.floor(rnd()*romVibePool().length)]+" · "+romLooksWord(looks)+" · "+sit});
  }
  /* unique first names within the trio — no "Ivan Kim + Ivan Novak" tables */
  var seen={};
  for(i=0;i<out.length;i++){
    var tries=0;
    while(seen[out[i].name.split(" ")[0]]&&tries<6){
      g=partnerGender(); out[i].name=rNameG(g); out[i].sex=inferSexByName(out[i].name); tries++;
    }
    seen[out[i].name.split(" ")[0]]=1;
  }
  return out;
}
function openSuitors(){
  try{
    window.__suitors=makeSuitors();
    renderSuitors();
    openModal("suitorsModal");
  }catch(e){ try{ toast("No one interesting around right now."); }catch(e2){} }
}
function renderSuitors(){
  try{
    var st=window.__suitors||[], taken=!!(S.relationships&&S.relationships.partner);
    var sub=$("suitorsSub");
    if(sub)sub.textContent=taken?("With "+S.relationships.partner.name+" — ask someone new and it's a choice with consequences."):"Three new faces. Look them over, then decide what you want.";
    var L=$("suitorsList"); if(!L)return;
    if(!st.length){ L.innerHTML='<div class="sub">Everyone drifted off. Close and look again later.</div>'; return; }
    var h="";
    for(var i=0;i<st.length;i++){
      var s=st[i], sym=s.sex==="female"?"♀":"♂";
      var askLbl=taken?("💘 Leave "+esc(S.relationships.partner.name.split(" ")[0])+" for "+esc(s.name.split(" ")[0])):"💘 Ask out";
      var casOk=S.age>=16;
      var face=""; try{ face=npcFaceHTML(s.name,true,true); }catch(e){}
      var vibeLines=String(s.vibe||"").split(/[·•]/).map(function(x){return x.trim();}).filter(Boolean);
      h+='<div class="slot suitface" style="margin-bottom:6px;text-align:center"><div class="grow">'+face
        +'<b class="suitname">'+sym+" "+esc(s.name)+", "+s.age+'</b>'
        +vibeLines.slice(0,3).map(function(v){return '<small class="suitvibe">'+esc(v)+'</small>';}).join("")
        +'</div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;justify-content:center">'
        +'<button class="mini" data-sidx="'+i+'" data-sact="ask">'+askLbl+'</button>'
        +(casOk?'<button class="mini" data-sidx="'+i+'" data-sact="cas">🔥 Keep casual</button>':'<button class="mini" data-sidx="'+i+'" data-sact="casyoung" title="Casual flings unlock at 16">🔥 16+</button>')
        +'</div></div>';
    }
    L.innerHTML=h;
    var btns=L.querySelectorAll("[data-sidx]");
    for(var b=0;b<btns.length;b++)(function(el){
      el.onclick=function(){
        var i=+el.getAttribute("data-sidx"), a=el.getAttribute("data-sact");
        if(a==="ask")suitorAsk(i);
        else if(a==="cas")suitorCasual(i);
        else toast("🔥 Casual flings unlock at 16 — dating is fine now.");
      };
    })(btns[b]);
  }catch(e){}
}
function romAskOdds(st){
  var g=S.stats, bar=70+(st.looks>=80?10:0)-(st.looks<=35?10:0);
  return (g.looks+g.social>bar)||S.flags.charming||hasTrait("lustful")||hasTrait("beautiful")||rnd()<0.4;
}
function suitorAsk(i){
  try{
    var st=(window.__suitors||[])[i]; if(!st)return;
    var R=S.relationships;
    if(R.partner){
      var ex=R.partner.name;
      R.partner=null;
      gainStat("happiness",-6);
      gainLog("💔","Left "+ex+" for a stranger across the room. Cold — but honest.","bad");
    }
    if(romAskOdds(st)){
      R.partner={name:st.name,rel:60,married:false,age:st.age,sex:st.sex};
      S.ach.partners++;
      gainStat("happiness",10); S.prestige+=5;
      try{ wSyncNPCs(); }catch(e){}
      try{ window.__suitors=[]; }catch(e){}
      closeModal("suitorsModal");
      gainLog("💘",st.name+" said yes! ("+st.vibe+") Sparks fly.","good");
    }else{
      try{ window.__suitors.splice(i,1); }catch(e){}
      gainStat("happiness",-5);
      gainLog("💔","Shot your shot with "+st.name+"… and missed. They walk away smiling, but it's a no.","bad");
      renderSuitors();
    }
    autosave(); render();
  }catch(e){}
}
function suitorCasual(i){
  try{
    if(S.age<16){ toast("🔥 Casual flings unlock at 16."); return; }
    var st=(window.__suitors||[])[i]; if(!st)return;
    var sx=sexEnsure();
    if(sx.lovers.length>=8){ toast("🔥 Your plate is full — end a fling first!"); return; }
    if(sx.lovers.indexOf(st.name)<0){ sx.lovers.push(st.name); sx.lovers=sx.lovers.slice(-8); sx.partners++; }
    var R=S.relationships;
    if(!R.partner){
      S.ach.partners++;
      gainStat("happiness",6);
      try{ wSyncNPCs(); }catch(e){}
      try{ window.__suitors=[]; }catch(e){}
      closeModal("suitorsModal");
      gainLog("🔥","No strings with "+st.name+" ("+st.vibe+"). Fun is fun.","event");
    }else{
      /* affair: stolen moments, then a jealousy roll */
      var g=S.stats, ch=0.35-(R.partner.rel>=80?0.15:0)-(g.social>=70?0.10:0)-(hasTrait("lustful")?0.10:0);
      ch=Math.max(0.05,Math.min(0.6,ch));
      gainKarma(-4);
      if(rnd()<ch){
        var exn=R.partner.name;
        R.partner=null;
        gainStat("happiness",-12); S.prestige=Math.max(0,S.prestige-10);
        try{ window.__suitors=[]; }catch(e){}
        closeModal("suitorsModal");
        gainLog("💔","Caught. "+exn+" finds out about "+st.name+" and walks — the scandal writes itself.","bad");
      }else{
        R.partner.rel=clamp100(R.partner.rel-8);
        try{ window.__suitors=[]; }catch(e){}
        closeModal("suitorsModal");
        gainLog("🌙","Stolen moments with "+st.name+". Nobody knows… yet. ("+R.partner.name+" −8)","event");
      }
    }
    autosave(); render();
  }catch(e){}
}
function partnerBreakup(){
  try{
    var R=S.relationships;
    if(!R.partner){ toast("Single — nothing to end."); return; }
    if(R.partner.married){ toast("That's called divorce — see 💔 Divorce."); return; }
    var ex=R.partner.name; R.partner=null;
    gainStat("happiness",-8); S.stress=clamp100(S.stress+4);
    gainLog("💔","Split from "+ex+". Clean, more or less. The songs will hurt for a week.","bad");
    autosave(); render();
  }catch(e){}
}
function loverCommit(){
  try{
    var R=S.relationships, sx=sexEnsure();
    if(R.partner){ toast("You're already taken! 💘"); return; }
    if(!sx.lovers.length){ toast("No casual flings — meet someone first! 💘"); return; }
    var nm=sx.lovers.pop();
    R.partner={name:nm,rel:65,married:false,age:S.age,sex:inferSexByName(nm)};
    S.ach.partners++;
    gainStat("happiness",8);
    try{ wSyncNPCs(); }catch(e){}
    gainLog("💘","Asked "+nm+" to be yours — properly. Yes. The fling becomes the thing.","good");
    autosave(); render();
  }catch(e){}
}
function loverDump(){
  try{
    var sx=sexEnsure();
    if(!sx.lovers.length){ toast("No casual flings going."); return; }
    var nm=sx.lovers.pop();
    gainStat("happiness",-2);
    gainLog("🚶","Ended the fling with "+nm+". No scene, just distance.","event");
    autosave(); render();
  }catch(e){}
}
LL.files.push("romance"); /* end-of-file registration: counts as loaded only after this file fully ran */
