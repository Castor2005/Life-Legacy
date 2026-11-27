/* LIFE & LEGACY — engine/genetics.js
 * GENETICS PATCH: real-ish inheritance powering looks, traits, disease.
 * One genotype model shared by the player, every NPC, and every baby:
 *  - autosomal loci (Mendelian dominant/recessive + sex-influenced balding),
 *  - X-linked loci (color blindness, thinblood), mitochondrial line (fading-light),
 *  - 7 polygenic scores (-1..1): height/tone/build/cog/beauty/metab/longv.
 * Founders roll from population frequencies; children segregate properly
 * (dad allele + mom allele per locus, midparent + noise for poly). Nothing is
 * ever cloned: every child is probable, never a copy.
 * Load order: after appearance.js (uses its pools), before life.js/world.js.
 * Shared scope: classic scripts, globals (S, LL, GDATA). No save bump —
 * old saves backfill lazily via genesEnsure()/parentsEnsure().
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ---- allele tables ----
 * Genotype = 2-char string ("AA"/"Aa"/"aa"); X = "AY"/"aY"/"AA"/"Aa"/"aa".
 * q = minor-allele frequency in the starting population. */
var GEN_LOCI={
  mc1r:{mode:"AR",q:0.22,eff:"red hair"},
  freck:{mode:"AD",q:0.30,eff:"freckles"}
  ,dimp:{mode:"AD",q:0.35,eff:"dimples"}
  ,het:{mode:"AR",q:0.03,eff:"heterochromia"}
  ,bald:{mode:"SI",q:0.45,eff:"balding"}
  ,hirs:{mode:"AR",q:0.10,eff:"hirsutism"}
  ,twin:{mode:"AD",q:0.15,eff:"twin line"}
  ,hunt:{mode:"AD",q:0.0006,eff:"vantier",dis:"vantier"}
  ,salt:{mode:"AR",q:0.025,eff:"salt-lung",dis:"saltlung"}
};
var GEN_XLOCI={
  xcb:{q:0.08,eff:"color blindness"}
  ,thin:{q:0.012,eff:"thinblood",dis:"thinblood"}
};
var GEN_POLY=["height","tone","build","cog","beauty","metab","longv"];
/* ---- hereditary disease book ----
 * onset = [minAge,maxAge] window; rate = yearly onset probability once at-risk;
 * treat = management path (false = untreatable); cure = world year gene therapy
 * arrives (checked against S.year, so the future can save you). */
var GEN_DIS={
  vantier:{name:"Vantier's decline",via:"a dominant Vantier allele from your bloodline",onset:[35,55],rate:0.06,treat:false,cure:2045,
    sick:{health:-2,happiness:-4,smarts:-3},blurb:"Your hands forget small things. The family calls it Vantier's — it took your grandmother's mind by inches."},
  saltlung:{name:"salt-lung",via:"two salt-lung alleles",onset:[0,12],rate:0.08,treat:"managed",cure:2038,cost:500,
    sick:{health:-4,fitness:-3},blurb:"Every breath rattles. The clinic names it salt-lung — the inherited wet cough."},
  thinblood:{name:"thinblood",via:"an X-linked thinblood allele",onset:[0,99],rate:0.015,treat:"factor",cure:2032,cost:800,
    sick:{health:-2,fitness:-1},blurb:"Cuts that should close keep weeping. Your blood runs thin — it runs in the family."},
  sweetblood:{name:"sweetblood",via:"bloodline sugar-handling plus life",onset:[35,99],rate:0.02,treat:"habit",cure:2030,cost:0,
    sick:{health:-3,fitness:-2},blurb:"Thirst that never ends, crashes after meals. Sweetblood — the family curse, manageable if you move."},
  thickheart:{name:"thickheart",via:"bloodline heart walls plus strain",onset:[45,99],rate:0.018,treat:"statins",cure:2033,cost:600,
    sick:{health:-3,fitness:-2},blurb:"Stairs become mountains; your chest drums wrong. Thickheart — the silent family killer."},
  fading:{name:"fading-light",via:"your mother's mitochondrial line",onset:[20,45],rate:0.05,treat:false,cure:2050,
    sick:{fitness:-4,happiness:-3},blurb:"A tiredness no sleep fixes. Fading-light, passed mother-to-child since forever."}
};
function gAllelePick(g){ return rnd()<0.5?g.charAt(0):g.charAt(1); }
function founderLocus(q){
  var r=rnd(), qq=q*q;
  if(r<qq)return "aa";
  if(r<qq+2*q*(1-q))return "Aa";
  return "AA";
}
function founderX(sex,q){
  if(sex!=="female")return (rnd()<q?"a":"A")+"Y";
  return founderLocus(q);
}
function gPoly(){ return Math.max(-1,Math.min(1,(rnd()+rnd()+rnd()-1.5)*0.8)); }
function founderGenes(sex){
  var L={}, k;
  for(k in GEN_LOCI)L[k]=founderLocus(GEN_LOCI[k].q);
  var X={xcb:founderX(sex,GEN_XLOCI.xcb.q),thin:founderX(sex,GEN_XLOCI.thin.q)};
  var P={}, i;
  for(i=0;i<GEN_POLY.length;i++)P[GEN_POLY[i]]=gPoly();
  return {L:L,X:X,M:(rnd()<0.002?"mF":"m0"),P:P};
}
/* Mendelian segregation: one allele from each parent. X follows the real
 * rules (sons get mother's X; daughters get father's X + one of mother's).
 * Mitochondria are maternal, always. Polygenic = midparent + noise. */
function inheritX(dadX,momX,sex,key){
  function momPick(){ var m=momX[key]||"AA"; return gAllelePick(m); }
  if(sex!=="female")return momPick()+"Y";
  var d=(dadX[key]||"AY").charAt(0);
  var a=[d,momPick()].sort();
  return a[0]+a[1];
}
function inheritGenes(dad,mom,sex){
  dad=dad||founderGenes("male"); mom=mom||founderGenes("female");
  var L={}, k;
  for(k in GEN_LOCI){
    var dg=(dad.L&&dad.L[k])||"AA", mg=(mom.L&&mom.L[k])||"AA";
    /* canonical allele order (dominant first): a heterozygote is ALWAYS "Aa",
     * never "aA". Order-sensitive readers (carrier checks) and the de novo
     * flip below both depend on this — do not concatenate raw. */
    var pa=gAllelePick(dg), ma=gAllelePick(mg);
    L[k]=(pa===ma)?pa+ma:((pa==="A")?pa+ma:ma+pa);
    /* de novo point mutation: rare, real, keeps bloodlines surprising */
    if(rnd()<0.001){ var mut=(L[k].charAt(0)==="A"?"a":"A")+L[k].charAt(1); L[k]=(mut==="aA")?"Aa":mut; }
  }
  var X={};
  for(k in GEN_XLOCI)X[k]=inheritX(dad.X||{},mom.X||{},sex,k);
  var P={}, i;
  for(i=0;i<GEN_POLY.length;i++){ var p=GEN_POLY[i];
    var dp=(dad.P&&typeof dad.P[p]==="number")?dad.P[p]:0;
    var mp=(mom.P&&typeof mom.P[p]==="number")?mom.P[p]:0;
    P[p]=Math.max(-1,Math.min(1,(dp+mp)/2+(rnd()+rnd()-1)*0.35));
  }
  return {L:L,X:X,M:(mom.M||"m0"),P:P};
}
/* ---- expression: genotype + sex + age -> visible phenotype ---- */
function geneHasA(g){ return g.indexOf("A")>=0; }
function locusOn(L,key,sex){
  var g=L[key]||"AA", m=GEN_LOCI[key].mode;
  if(m==="AD")return geneHasA(g);
  if(m==="AR")return g==="aa";
  if(m==="SI"){ if(sex!=="female")return geneHasA(g); return g==="AA"; }
  return false;
}
function xOn(X,key,sex){
  var g=(X&&X[key])||(sex!=="female"?"AY":"AA");
  if(sex!=="female")return g.charAt(0)==="a";
  return g==="aa";
}
function xCarrier(X,key,sex){
  if(sex!=="female")return false;
  var g=((X&&X[key])||"AA");
  return g==="Aa"||g==="aA"; /* aA tolerated for pre-canonical saves */
}
function genePhenotype(G,sex,age){
  G=G||{L:{},X:{},P:{}}; var L=G.L||{}, X=G.X||{}, P=G.P||{};
  var ph={red:locusOn(L,"mc1r",sex),freck:locusOn(L,"freck",sex),dimp:locusOn(L,"dimp",sex),
    hetero:locusOn(L,"het",sex),hirsute:locusOn(L,"hirs",sex),twinC:locusOn(L,"twin",sex),
    colorblind:xOn(X,"xcb",sex),bald:0};
  /* balding is staged deterministically by age so it never flickers year to year */
  var b=locusOn(L,"bald",sex);
  if(b){
    if(sex!=="female")ph.bald=age<30?0:(age<42?1:(age<58?2:3));
    else ph.bald=age<52?0:1;
  }
  ph.tone=(typeof P.tone==="number")?P.tone:0;
  ph.height=(typeof P.height==="number")?P.height:0;
  ph.build=(typeof P.build==="number")?P.build:0;
  return ph;
}
/* ---- reverse map: custom-life LOOK -> consistent founder genotype ----
 * A player-designed face must mean matching genes, or inheritance lies. */
function genesForAppearance(ap,sex){
  var G=founderGenes(sex), L=G.L;
  function setAA(k,v){ L[k]=v; }
  var hc=String((ap&&ap.haircolor)||"");
  if(/red|copper|strawberry|auburn/.test(hc))setAA("mc1r","aa");
  else if(rnd()<0.8)setAA("mc1r",rnd()<0.3?"Aa":"AA");
  var mk=String((ap&&ap.marks)||"");
  if(/freckle/.test(mk))setAA("freck","Aa");
  if(/dimple/.test(mk)||/cleft/.test(mk))setAA("dimp","Aa");
  var ey=String((ap&&ap.eyes)||"");
  if(/heterochromia/.test(ey))setAA("het","aa");
  if(sex!=="female"&&ap&&(ap.hairstyle==="balding"||ap.hairlen==="shaved/bald"))setAA("bald","Aa");
  if(sex==="female"&&ap&&ap.facial&&ap.facial!=="clean-shaven")setAA("hirs","aa");
  return G;
}
/* ---- phenotype -> appearance (founders, babies, heirs) ---- */
function tonePick(pool,tone){
  var order=SKINS, p=pool.filter(function(s){return order.indexOf(s)>=0;});
  p.sort(function(a,b){return order.indexOf(a)-order.indexOf(b);});
  if(!p.length)return pick(pool);
  var i=Math.round((p.length-1)*(0.5-tone*0.35)+(rnd()+rnd()-1)*1.2);
  return p[Math.max(0,Math.min(p.length-1,i))];
}
function heightPick(h){
  var i=Math.round(3+h*2.5+(rnd()+rnd()-1)*1.1);
  return HEIGHTS[Math.max(0,Math.min(HEIGHTS.length-1,i))];
}
var GEN_MASS=["lean build","slender build","petite frame","soft build","wiry build","athletic build","tall lanky frame","stocky build","muscular build","powerful build","brawny build","heavyset build"];
function buildPick(b){
  var i=Math.round((GEN_MASS.length-1)*(0.5+b*0.35)+(rnd()+rnd()-1)*1.2);
  return BUILDS.indexOf(GEN_MASS[Math.max(0,Math.min(GEN_MASS.length-1,i))])>=0?GEN_MASS[Math.max(0,Math.min(GEN_MASS.length-1,i))]:pick(BUILDS);
}
function applyGenePhenotype(ap,G,sex,age){
  if(!ap||!G)return ap;
  var ph=genePhenotype(G,sex,age==null?0:age);
  try{
    if(ph.red&&/red|copper|strawberry|auburn/.test(String(ap.haircolor||""))===false)
      ap.haircolor=pick(["red","copper","auburn","strawberry blonde"]);
    if(ph.freck&&(ap.marks==="none"||!ap.marks))ap.marks="freckles";
    if(ph.dimp&&(ap.marks==="none"||!ap.marks))ap.marks=rnd()<0.7?"dimples":"cleft chin";
    if(ph.hetero)ap.eyes=pick(["heterochromia (brown & green eyes)","heterochromia (blue & brown eyes)"]);
  }catch(e){}
  return ap;
}
/* A child picks each axis from one parent or the other, with a small
 * mutation reroll biased by their own polygenic scores — probable, never copy. */
function inheritAppearance(dadAp,momAp,childG,sex){
  var d=dadAp||{}, m=momAp||{};
  function one(dv,mv,mut){
    if(rnd()<0.08)return mut();
    return rnd()<0.5?(dv||mv):(mv||dv);
  }
  var ap={
    skin:one(d.skin,m.skin,function(){return tonePick(SKINS,(childG.P||{}).tone||0);}),
    hair:one(d.hair,m.hair,function(){return pick(HAIRS);}),
    eyes:one(d.eyes,m.eyes,function(){return pick(EYES);}),
    build:one(d.build,m.build,function(){return buildPick((childG.P||{}).build||0);}),
    height:one(d.height,m.height,function(){return heightPick((childG.P||{}).height||0);}),
    figure:one(d.figure,m.figure,function(){return pick(FIGURES);}),
    hairstyle:one(d.hairstyle,m.hairstyle,function(){return pick(["straight","wavy","curly","coily","braids","pixie cut","bob","long loose waves","side part","ponytail","bun","messy"]);}),
    haircolor:one(d.haircolor,m.haircolor,function(){return pick(["jet black","dark brown","chestnut","light brown","golden blonde","dirty blonde"]);}),
    hairlen:one(d.hairlen,m.hairlen,function(){return pick(["short","chin-length","medium","shoulder-length"]);}),
    face:one(d.face,m.face,function(){return pick(FACES);}),
    facial:"clean-shaven",
    marks:one(d.marks,m.marks,function(){return rnd()<0.86?"none":pick(["birthmark","freckles","dimples","mole","cleft chin"]);}),
    style:one(d.style,m.style,function(){return pick(STYLES);}),
    voice:one(d.voice,m.voice,function(){return pick(["soft voice","clear voice","melodic voice","husky voice","high-pitched voice"]);})
  };
  applyGenePhenotype(ap,childG,sex,0);
  /* babies are born clean: no adult styling, ever */
  sanitizeKidAp(ap);
  return ap;
}
function sanitizeKidAp(ap){
  if(!ap)return;
  ap.facial="clean-shaven";
  if(isVividHair(ap.haircolor))ap.haircolor="dark brown";
  try{
    if(ADULT_MARKS.indexOf(ap.marks)>=0)ap.marks="none";
    if(ADULT_HAIR.indexOf(ap.hairstyle)>=0)ap.hairstyle="messy";
    if(ap.hairlen==="very long")ap.hairlen="long";
  }catch(e){}
}
/* ---- sex-aware creation gates ---- */
function facialAllowed(sex,G){
  if(sex!=="female")return true;
  try{ return locusOn((G&&(G.L||{})),"hirs",sex); }catch(e){ return false; }
}
function figureFor(sex){
  if(sex==="male")return FIGURES.filter(function(f){return ["curvy","hourglass","pear-shaped","full-figured"].indexOf(f)<0;});
  if(sex==="female")return FIGURES.filter(function(f){return ["barrel-chested","rectangular"].indexOf(f)<0;});
  return FIGURES.slice();
}
/* ---- congenital trait inheritance (the mental-effecting kind too) ----
 * genius/beautiful/robust/frail/titan pass from carrier parents ~30%;
 * high midparent cog can spark genius; tiny de novo rate keeps it alive. */
var GEN_CONG=["genius","beautiful","robust","frail","titan"];
function inheritTraits(dadT,momT,dCog,mCog){
  var out=[], i;
  dadT=dadT||[]; momT=momT||[];
  for(i=0;i<GEN_CONG.length;i++){ var t=GEN_CONG[i];
    var has=dadT.indexOf(t)>=0||momT.indexOf(t)>=0;
    var both=dadT.indexOf(t)>=0&&momT.indexOf(t)>=0;
    if(has&&rnd()<(both?0.55:0.30))out.push(t);
  }
  var cog=((+dCog||0)+(+mCog||0))/2;
  if(out.indexOf("genius")<0&&cog>0.4&&rnd()<0.15)out.push("genius");
  if(!out.length&&rnd()<0.02)out.push(pick(GEN_CONG));
  return out;
}
/* ---- disease risk: who is at-risk / carrier / sick ---- */
function disAtRisk(G,sex,id){
  G=G||{L:{},X:{},P:{},M:"m0"};
  try{
    if(id==="vantier")return locusOn(G.L,"hunt",sex);
    if(id==="saltlung")return (G.L.salt||"AA")==="aa";
    if(id==="thinblood")return xOn(G.X,"thin",sex);
    if(id==="fading")return (G.M||"m0")==="mF";
    if(id==="sweetblood")return (G.P&&G.P.metab<=-0.25);
    if(id==="thickheart")return (G.P&&G.P.longv<=-0.2);
  }catch(e){}
  return false;
}
function disCarrier(G,sex,id){
  G=G||{L:{},X:{},P:{}};
  try{
    if(id==="saltlung")return (function(g){ return g==="Aa"||g==="aA"; })((G.L.salt||"AA"));
    if(id==="thinblood")return xCarrier(G.X,"thin",sex);
    if(id==="fading")return false;
    if(id==="vantier")return false;
    if(id==="sweetblood")return (G.P&&G.P.metab<0&&G.P.metab>-0.25);
    if(id==="thickheart")return (G.P&&G.P.longv<0&&G.P.longv>-0.2);
  }catch(e){}
  return false;
}
/* ---- disease -> mortality: the calculator prices the crisis ----
 * Unmanaged sickness makes the saving throw harder (managed/cured blood does
 * not — treatment is the counterplay). Both the live modal and the silent
 * auto-roll read deathSaveDC, so one hook covers both. */
function genCrisisMod(){
  var out={dc:0,names:[]};
  try{
    if(!S||!S.genDx)return out;
    for(var id in GEN_DIS){
      var st=S.genDx[id];
      if(st&&st.st==="sick"){ out.dc++; out.names.push(GEN_DIS[id].name); }
    }
    if(out.dc>3)out.dc=3;
  }catch(e){}
  return out;
}
/* Disease-aware cause: an unmanaged sickness writes its own ending instead
 * of a generic accident — the bloodline the calculator tracked is the story. */
function genDeathCause(){
  try{
    if(!S||!S.genDx)return null;
    var order=["thickheart","saltlung","thinblood","vantier","fading","sweetblood"];
    var label={
      thickheart:"a sudden heart failure (thickheart, unmanaged)",
      saltlung:"salt-lung failure — the wet cough wins (salt-lung, unmanaged)",
      thinblood:"a thinblood bleed that would not close",
      vantier:"Vantier's final decline",
      fading:"the fading-light — you fall asleep and do not wake",
      sweetblood:"a sweetblood collapse"
    };
    for(var i=0;i<order.length;i++){
      var st=S.genDx[order[i]];
      if(st&&st.st==="sick")return label[order[i]];
    }
  }catch(e){}
  return null;
}
/* ---- save-shape: genes + disease chart ride on S, backfilled, never bump ---- */
function genesEnsure(){
  if(!S)return null;
  if(!S.genes||!S.genes.L)S.genes=founderGenes(S.gender||"male");
  if(!S.genDx||typeof S.genDx!=="object")S.genDx={};
  var id;
  for(id in GEN_DIS){
    if(!S.genDx[id]){
      var carrier=disCarrier(S.genes,S.gender,id), risk=disAtRisk(S.genes,S.gender,id);
      S.genDx[id]={st:risk?"atrisk":(carrier?"carrier":"clear"),known:false};
    }
  }
  /* canonical-order repair (pre-fix saves may store "aA"): normalize the
   * stored genotype, then upgrade any genDx that was computed from the
   * misordered string. Only upgrades (clear->carrier/atrisk); diagnosed
   * states (sick/managed/cured) are never auto-touched, never downgraded. */
  try{
    for(var lk in S.genes.L){ if(S.genes.L[lk]==="aA")S.genes.L[lk]="Aa"; }
    var rank={clear:0,carrier:1,atrisk:2};
    for(var hid in GEN_DIS){
      var hst=S.genDx[hid]; if(!hst)continue;
      if(hst.st==="sick"||hst.st==="managed"||hst.st==="cured")continue;
      var hc=disCarrier(S.genes,S.gender,hid), hr=disAtRisk(S.genes,S.gender,hid);
      var want=hr?"atrisk":(hc?"carrier":"clear");
      if((rank[want]||0)>(rank[hst.st]||0))hst.st=want;
    }
  }catch(e){}
  /* polygenic scores drift for very old saves that predate them */
  try{
    var i; for(i=0;i<GEN_POLY.length;i++){ var p=GEN_POLY[i];
      if(!S.genes.P||typeof S.genes.P[p]!=="number")S.genes.P[p]=gPoly(); }
  }catch(e){}
  return S.genes;
}
/* carrier/appearance lookup for a mother by name (partner, friend, anyone).
 * Caches founder genes onto the live record so every pregnancy agrees. */
function carrierGenesFor(name){
  if(!name)return founderGenes("female");
  try{
    var R=S&&S.relationships;
    if(R&&R.partner&&R.partner.name===name){
      if(!R.partner.genes)R.partner.genes=founderGenes("female");
      return R.partner.genes;
    }
    var arr=R?((R.friends||[]).concat(R.siblings||[]).concat(R.children||[])):[];
    for(var i=0;i<arr.length;i++)if(arr[i].name===name){
      if(!arr[i].genes)arr[i].genes=founderGenes("female");
      return arr[i].genes;
    }
    if(S&&S.world&&S.world.npcs)for(var j=0;j<S.world.npcs.length;j++){
      var n=S.world.npcs[j];
      if(n.name===name){ if(!n.genes)n.genes=founderGenes(n.sex||"female"); return n.genes; }
    }
  }catch(e){}
  return founderGenes("female");
}
function carrierApFor(name){
  try{
    var R=S&&S.relationships;
    if(R&&R.partner&&R.partner.name===name){
      if(!R.partner.appearance){
        var pg=R.partner.genes||founderGenes("female");
        R.partner.appearance=applyGenePhenotype(genAppearance("female","Mixed"),pg,25);
        sanitizeKidAp(R.partner.appearance);
      }
      return R.partner.appearance;
    }
    if(S&&S.world&&S.world.npcs)for(var j=0;j<S.world.npcs.length;j++){
      var n=S.world.npcs[j];
      if(n.name===name){
        if(!n.appearance){
          n.appearance=applyGenePhenotype(genAppearance(n.sex||"female","Mixed"),n.genes||founderGenes(n.sex||"female"),n.sex||"female",25);
          sanitizeKidAp(n.appearance);
        }
        return n.appearance;
      }
    }
  }catch(e){}
  return null;
}
function twinChance(momG){
  try{ if(locusOn((momG&&(momG.L||{})),"twin","female"))return 0.28; }catch(e){}
  return 0.12;
}
/* ---- genetic-parent roles (not player-role assumptions) ----
 * The carrier is the genetic MOTHER unless proven male — the case that
 * matters is a female player whose partner carries: then SHE is the mother
 * (mitochondria + maternal X must come from her) and he is the father.
 * Same-sex edges fall back to a founder donor/surrogate rather than
 * assigning one partner both roles. Name-list inference is exact for
 * generated names (partnerName draws from FEM/MALE); NPC records carry sex
 * directly; default true preserves every historical call path. */
function inferSexByName(nm){
  try{
    var first=String(nm||"").split(" ")[0];
    if(typeof FEM!=="undefined"&&FEM.indexOf(first)>=0)return "female";
    if(typeof MALE!=="undefined"&&MALE.indexOf(first)>=0)return "male";
  }catch(e){}
  return null;
}
function carrierFemaleFor(name){
  try{
    var R=S&&S.relationships;
    if(R&&R.partner&&R.partner.name===name){
      if(R.partner.sex==="male")return false;
      if(R.partner.sex==="female")return true;
      var s=inferSexByName(name);
      if(s)return s==="female";
      return true;
    }
    if(S&&S.world&&S.world.npcs)for(var j=0;j<S.world.npcs.length;j++){
      var n=S.world.npcs[j];
      if(n.name===name&&n.sex)return n.sex!=="male";
    }
    var s2=inferSexByName(name);
    if(s2)return s2==="female";
  }catch(e){}
  return true;
}
/* ---- parents: real people with names, traits, genes, ongoing lives ----
 * The emergency fix: "Mom"/"Dad" were display strings. Now R.mom/R.dad are
 * person records chained into the family genome (grandparents -> parents ->
 * you -> siblings share the same draw). momAge/dadAge stay the numeric truth
 * for every legacy reader; records mirror them. */
function rollParentTraits(){ return inheritTraits(pick([[],["patient"]]),pick([[],["diligent"]]),0,0).concat([]); }
function parentsEnsure(){
  if(!S||!S.relationships)return;
  var R=S.relationships, i;
  /* grandparents gain genomes first: they are the top of the calculator */
  try{
    for(i=0;i<(R.grandparents||[]).length;i++){ var g=R.grandparents[i];
      if(!g.genes)g.genes=founderGenes(g.sex||"female");
    }
  }catch(e){}
  function gpPair(side){
    var a=null,b=null;
    try{
      for(var i=0;i<(R.grandparents||[]).length;i++){ var g=R.grandparents[i];
        if(g.side!==side)continue;
        if(g.sex==="female")a=g; else b=g;
      }
    }catch(e){}
    return [a&&a.genes?a.genes:founderGenes("female"),b&&b.genes?b.genes:founderGenes("male")];
  }
  function mkParent(key,sex,age){
    var rec=R[key];
    if(!rec||typeof rec!=="object"||!rec.name){
      var np=null;
      try{ np=wFindNPC(key==="mom"?"Mom":"Dad"); }catch(e){}
      var nm=(np&&np.name&&(np.name!=="Mom"&&np.name!=="Dad"))?np.name:rNameG(sex);
      var side=gpPair(key==="mom"?"maternal":"paternal");
      rec={name:nm,sex:sex,traits:rollTraits(),genes:inheritGenes(side[1],side[0],sex),alive:age>-100,npcId:(np&&np.id)||null};
      R[key]=rec;
      try{ if(np){ np.name=nm; np.sex=sex; np.role="parent"; np.genes=rec.genes; np.traits=rec.traits.slice(); } }catch(e){}
    }
    if(!rec.genes){
      var s2=gpPair(key==="mom"?"maternal":"paternal");
      rec.genes=inheritGenes(s2[1],s2[0],rec.sex||sex);
    }
    if(!rec.traits||!rec.traits.length)rec.traits=rollTraits();
    if(!rec.name)rec.name=rNameG(rec.sex||sex);
    rec.age=age; rec.alive=age>-100; rec.rel=R.parentRel;
    return rec;
  }
  R.mom=mkParent("mom","female",R.momAge);
  R.dad=mkParent("dad","male",R.dadAge);
  try{
    if(S&&S.world&&S.world.npcs)for(var j=0;j<S.world.npcs.length;j++){
      var n=S.world.npcs[j];
      if(n.name==="Mom"||n.name==="Dad"){
        var rk=n.name==="Mom"?"mom":"dad";
        n.name=R[rk].name; n.sex=R[rk].sex; n.role="parent"; n.genes=R[rk].genes; n.traits=(R[rk].traits||[]).slice();
        R[rk].npcId=n.id;
      }
    }
  }catch(e){}
  /* the player's own genome descends from these two people, not from thin air */
  try{
    if(S&&(!S.genes||!S.genes.L)){
      S.genes=inheritGenes(R.dad.genes,R.mom.genes,S.gender||"male");
      if(S.genDx)S.genDx={};
      genesEnsure();
    }
  }catch(e){}
  /* siblings share the same parental draw: family resemblance is real */
  try{
    for(var k=0;k<(R.siblings||[]).length;k++){ var sb=R.siblings[k];
      if(!sb.genes)sb.genes=inheritGenes(R.dad.genes,R.mom.genes,sb.sex||"male");
      if(!sb.sex)sb.sex=pick(["male","female"]);
    }
  }catch(e){}
}
/* per-NPC stable portrait seed: every face gets its own identity, forever.
 * (chatArt used to paint every NPC with the PLAYER's seed.) */
function npcSeed(n){
  if(!n)return 1;
  if(n.imgSeed)return n.imgSeed;
  var s=String(n.id||n.name||"x"), h=0, i;
  for(i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;
  n.imgSeed=1+Math.abs(h)%999999;
  return n.imgSeed;
}
/* gene-flavored look notes for NPC portrait prompts (red hair, hetero, ...) */
function npcLookBits(n){
  try{
    if(!n||!n.genes)return "";
    var ph=genePhenotype(n.genes,n.sex||"female",n.age||25), bits=[];
    if(ph.red)bits.push("natural red hair");
    if(ph.hetero)bits.push("heterochromatic eyes");
    if(ph.freck)bits.push("freckles");
    if(ph.dimp)bits.push("dimples");
    if(bits.length)return " ("+bits.join(", ")+")";
  }catch(e){}
  return "";
}
/* ---- the hidden calculator's yearly heartbeat ----
 * Balding arrives, hirsutism emerges, diseases smolder or strike.
 * Silent years never DIAGNOSE (no modal can open) — they only progress. */
function yearlyGenetics(silent){
  if(!S||!S.alive)return;
  try{ genesEnsure(); parentsEnsure(); }catch(e){}
  var ph=null;
  try{ ph=genePhenotype(S.genes,S.gender,S.age); }catch(e){}
  /* male-pattern staging + hirsute emergence, logged once, applied always */
  try{
    if(ph&&ph.bald>=2&&S.age>=30&&S.appearance){
      if(S.appearance.hairstyle!=="balding"&&S.appearance.hairstyle!=="shaved head"){
        S.appearance.hairstyle="balding";
        if(!silent&&!S.flags.baldNoted){ S.flags.baldNoted=true;
          pushLog(S.age,"🪞","The mirror reports thinning on top — the family hairline claims another. Your hairline is receding.","event"); }
      }
    }
    if(S.gender==="female"&&ph&&ph.hirsute&&S.age>=15&&!S.flags.hirsNoted&&S.appearance){
      S.flags.hirsNoted=true;
      if(!silent)pushLog(S.age,"🪞","Downy hair darkens on your upper lip — the family hirsutism. Wax it, own it, or ignore it.","event");
      if(S.appearance.facial==="clean-shaven"&&rnd()<0.5)S.appearance.facial="light stubble";
    }
  }catch(e){}
  /* disease progression + rare surprise onsets (at-risk only, one per year) */
  try{
    var id, D;
    for(id in GEN_DIS){
      D=GEN_DIS[id]; var st=S.genDx[id]||{st:"clear",known:false};
      if(st.st==="sick"||st.st==="managed"){
        var mg=st.st==="managed";
        var dr=mg?0.5:1;
        if(D.sick.health)S.stats.health=clamp100(S.stats.health+D.sick.health*0.4*dr);
        if(D.sick.fitness)gainStat("fitness",D.sick.fitness*0.4*dr);
        if(D.sick.happiness)gainStat("happiness",(D.sick.happiness||0)*0.4*dr);
        if(D.sick.smarts)gainStat("smarts",D.sick.smarts*0.4*dr);
        if(mg&&D.cost&&!silent){
          if(S.money>=D.cost){ S.money-=D.cost; }
          else { st.st="sick"; pushLog(S.age,"💸","You can't afford the "+D.name+" treatment — the condition slips its leash.","bad"); }
        }
        if(id==="thickheart"&&st.st==="sick"&&rnd()<0.02){ die("a sudden heart failure ("+D.name+")"); return; }
        continue;
      }
      if(st.st!=="atrisk")continue;
      if(S.age<D.onset[0]||S.age>D.onset[1])continue;
      if(id==="sweetblood"&&S.stats.fitness>=65)continue; /* moving beats the bloodline */
      if(S.perYear.genEv)continue;
      var p=D.rate;
      if(rnd()<p){
        if(silent)continue; /* defer the reveal to a lived year */
        S.perYear.genEv=true;
        diagnoseDisease(id);
        return;
      }
    }
  }catch(e){}
}
/* sudden cardiac contribution for the mortality dice (thickheart, unmanaged) */
function genHeartRisk(){
  try{
    if(S&&S.genDx&&S.genDx.thickheart&&S.genDx.thickheart.st==="sick")return 0.02;
  }catch(e){}
  return 0;
}
/* longevity polygenes bend the age curve, not fate: fit blood, easier years */
function genLongvBend(){
  try{
    var l=S&&S.genes&&S.genes.P&&S.genes.P.longv;
    if(typeof l==="number")return 1-0.15*l;
  }catch(e){}
  return 1;
}
function diagnoseDisease(id){
  var D=GEN_DIS[id]; if(!D)return;
  S.genDx[id]={st:"sick",known:true};
  var cureOk=S.year>=D.cure;
  var txt="You are "+S.firstName+" "+S.lastName+", age "+S.age+". "+D.blurb+" It runs in "+(id==="fading"?"your mother's line":"your blood")+" ("+D.via+") — the calculator was right all along.";
  var ch=[];
  if(D.treat){
    var label=D.treat==="habit"?"🏃 Change your life":"💊 Begin treatment";
    var hint=D.treat==="habit"?"move daily — fitness holds it back":("$"+D.cost+"/yr while you can pay");
    ch.push({label:label,hint:hint,fx:function(){
      S.genDx[id]={st:"managed",known:true};
      pushLog(S.age,"💊",D.name+", managed. The bloodline doesn't get the last word today.","good");
      return "Treatment begins. The numbers stabilize.";
    }});
  } else {
    ch.push({label:"🧬 Face it head-on",hint:"no treatment exists — grit only",fx:function(){
      pushLog(S.age,"🧬","No treatment exists for "+D.name+". You learn its shape and walk on anyway. +prestige for courage.","event");
      S.prestige+=5;
      return "You carry it. It doesn't carry you.";
    }});
  }
  if(cureOk){
    ch.push({label:"✨ Gene therapy ("+D.cure+")",hint:"$25,000 — the future cures the past",fx:function(){
      if(S.money<25000){ toast("Gene therapy costs $25,000 — out of reach."); return "Out of reach. The clinic quotes $25,000."; }
      S.money-=25000; S.genDx[id]={st:"cured",known:true}; S.prestige+=10;
      pushLog(S.age,"✨","Gene therapy ("+D.cure+") rewrites what your grandparents gave you. "+D.name+": CURED. Medicine 1, fate 0.","milestone");
      return "Cured. The bloodline ends here.";
    }});
  }
  ch.push({label:"🙈 Ignore it",hint:"the disease runs free",fx:function(){
    pushLog(S.age,"🙈","You ignore the "+D.name+" diagnosis. It won't ignore you.","bad");
    return "Denial, sustained.";
  }});
  showEvent({title:"🧬 "+D.name+" — the blood test",text:function(){return txt;},choices:ch});
}
/* 🩺 doctor-visit screening: the hidden becomes known (called by the doctor verb) */
function screenGenetics(){
  if(!S)return "No blood to draw.";
  try{ genesEnsure(); }catch(e){}
  var found=[], id;
  for(id in GEN_DIS){
    var st=S.genDx[id];
    if(st&&(st.st==="carrier"||st.st==="atrisk"||st.st==="sick"||st.st==="managed")&&!st.known){
      st.known=true; found.push(GEN_DIS[id].name+" ("+st.st+")");
    }
  }
  if(!found.length)return "Bloodline screening: nothing lurking that you don't already know about.";
  return "Bloodline screening reveals: "+found.join(" · ")+". Knowledge is leverage.";
}
/* one-line bloodline for the Family tab (known markers only — the rest hides) */
function genomeSummary(){
  try{
    genesEnsure();
    var bits=[], hid=0, id;
    var ph=genePhenotype(S.genes,S.gender,S.age);
    if(ph.red)bits.push("red hair"); if(ph.freck)bits.push("freckles"); if(ph.dimp)bits.push("dimples");
    if(ph.hetero)bits.push("heterochromia"); if(ph.twinC)bits.push("twin line"); if(ph.colorblind)bits.push("color-blind");
    if(ph.hirsute)bits.push("hirsutism");
    for(id in GEN_DIS){
      var st=S.genDx[id];
      if(!st)continue;
      if(st.known&&(st.st==="carrier"||st.st==="atrisk"||st.st==="sick"||st.st==="managed"||st.st==="cured"))
        bits.push(GEN_DIS[id].name+":"+st.st);
      else if(st.st!=="clear")hid++;
    }
    var s=bits.length?bits.join(" · "):"unremarkable blood";
    if(hid>0)s+=" · "+hid+" hidden marker"+(hid>1?"s":"")+" (🩺 screen at a doctor)";
    return s;
  }catch(e){ return "bloodline uncharted"; }
}

LL.files.push("genetics"); /* end-of-file registration: counts as loaded only after this file fully ran */
