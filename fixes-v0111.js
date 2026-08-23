// v0.11.1 targeted fixes. Additive: no protected UI/functionality removed.

// Perceived potential is an uncertain scouting estimate, not a direct noisy copy of hidden true potential.
// Outside clubs initially anchor on observable ability/age/reputation and only move gradually with evidence.
function ppInitialEstimate(club,own){
  const c=ltClub(club),ab=ability();
  if(own)return clamp(P.pot+rn()*5,Math.max(ab,55),96);
  const ageUpside=P.age<=17?12:P.age<=19?9:P.age<=21?6:3;
  const visible=ab+ageUpside+P.rep*.055+P.att*.035+rn()*7;
  return clamp(visible,Math.max(55,ab-2),92);
}
function ppRecalibrateExisting(){
  if(!S?.perceptions)return;
  Object.entries(S.perceptions).forEach(([n,p])=>{
    if(n===S.club)return;
    // Low-certainty extreme estimates are corrected immediately; established scouting opinions move less.
    const anchor=ppInitialEstimate(n,false),cert=p.certainty||10;
    const keep=clamp((cert-10)/85,.08,.72);
    p.pot=clamp(anchor*(1-keep)+Math.min(p.pot,94)*keep,Math.max(55,ability()-2),94);
    p.scoutPot=p.pot;
  });
}

// Override initialisation for newly encountered clubs with calibrated estimates.
initClubPerceptions=function(){
  if(!P||!S)return;if(!S.perceptions)S.perceptions={};
  Object.entries(CLUBS).forEach(([n,c])=>{
    if(S.perceptions[n])return;const own=n===S.club;
    const baseCert=own?62:clamp(10+(P.att+P.rep)*.30+Math.max(0,c[2]-70)*.05,8,24);
    S.perceptions[n]={pot:ppInitialEstimate(n,own),certainty:baseCert,observations:own?6:0};
  });
};
observePotential=function(club,weight,signal){
  initClubPerceptions();const p=S.perceptions[club];if(!p)return;
  const own=club===S.club,w=clamp(weight,0,1),ab=ability();
  // Scouts infer upside from age, current level and repeated evidence. Hidden P.pot is used only as a weak
  // long-run truth signal; one match can never make an ordinary prospect look like a 97-rated generational talent.
  const truthWeight=own?.48:clamp((p.certainty-10)/170,.04,.32);
  const observable=ppInitialEstimate(club,own);
  const truth=clamp(P.pot+rn()*(own?4:8),Math.max(55,ab-2),own?97:95);
  const perfNudge=clamp((signal||0)*.055,-1.2,1.6);
  const target=clamp(observable*(1-truthWeight)+truth*truthWeight+perfNudge,Math.max(55,ab-2),own?97:95);
  p.pot=clamp(p.pot*(1-w)+target*w,Math.max(55,ab-2),own?97:95);
  p.certainty=clamp(p.certainty+2+10*w,5,95);p.observations++;
};

// New-season clubs must use the same calibrated perception model.
const _fixLtEnsureWorld=ltEnsureWorldForSeason;
ltEnsureWorldForSeason=function(fx){
  const active=ltSeasonClubs(fx);active.forEach(ltClub);if(!S.perceptions)S.perceptions={};
  active.forEach(n=>{
    if(!S.perceptions[n])S.perceptions[n]={pot:ppInitialEstimate(n,n===S.club),certainty:n===S.club?62:clamp(10+(P.att+P.rep)*.30,8,24),observations:n===S.club?6:0};
    if(n!==S.club&&!S.market[n])S.market[n]={score:0,state:'Unaware',delta:0,x:0,need:clamp(55+rn()*18,20,90)};
  });return active;
};

// Repair event generation at the source by wrapping sim and constraining the newly-created match record.
// The player's goals can never exceed his team's goals; assists can only exist for team goals and cannot
// exceed the number of team goals available to be assisted.
const _fixSim=sim;
sim=function(){
  if(!S)return _fixSim();
  const beforeHist=S.hist?.length||0,beforeG=S.goals||0,beforeA=S.assists||0,beforeGrades=S.grades?.length||0;
  const out=_fixSim();
  if(!S.hist||S.hist.length<=beforeHist)return out;
  const h=S.hist[0];if(!h)return out;
  const fx=S.fx[S.match-1];if(!fx)return out;
  const teamGoals=fx.home===S.club?fx.hg:fx.ag;
  const oldG=Number(h.g||0),oldA=Number(h.as||0);
  const newG=Math.min(oldG,teamGoals);
  // An assist requires a team goal scored by somebody; a player cannot assist his own goal.
  const assistable=Math.max(0,teamGoals-newG);
  const newA=Math.min(oldA,assistable);
  if(newG!==oldG||newA!==oldA){
    S.goals=Math.max(beforeG,(S.goals||0)-(oldG-newG));S.assists=Math.max(beforeA,(S.assists||0)-(oldA-newA));
    h.g=newG;h.as=newA;
    // Keep displayed G/A and career totals logically consistent. Grade is left unchanged to avoid rewriting
    // the protected match-rating formula in this targeted fix.
  }
  return out;
};

const _fixSign=sign;
sign=function(i){_fixSign(i);ppRecalibrateExisting();render();};
