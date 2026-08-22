// v0.9 calibration layer: intentionally isolated from the stable 0.8.2 UI/fixture code.
// Keeps working output intact while replacing the formulas most in need of calibration.

// Clubs/managers do not know true potential. Each career gets a noisy perceived estimate.
function ensurePerceivedPotential(){
  if(P && P.perceivedPot==null){
    const uncertainty=P.age<=16?9:P.age<=18?7:5;
    P.perceivedPot=clamp(P.pot+rn()*uncertainty,68,98);
  }
}

// Trust: performance grade is the primary signal. Goals/assists already improve the grade,
// so they are NOT added again here. Defensive clean sheets get only a small contextual bonus.
function roleTrustDelta(grade,g,as,played,ctx,clean){
  if(!played)return 0;
  const r=ROLE[S.contract.role];
  const vsExpectation=clamp((r.grade-grade)*1.55,-2.8,3.8);
  const excellent=grade<=1.5?1.35:grade<=2.0?.85:grade<=2.5?.30:0;
  const defensive=((P.pos==='GK'||P.pos==='CB')&&clean)?.30:((P.pos==='FB'||P.pos==='DM')&&clean)?.15:0;
  // Opponent matters, but trust is not multiplied wildly by prestige.
  const context=clamp(.90+(ctx.mult-1)*.45,.82,1.18);
  return (vsExpectation+excellent+defensive)*context;
}

// Selection still uses current ability, trust, form and role. Potential is now PERCEIVED potential,
// never omniscient true potential. Youth-friendly clubs can still give a raw youngster a chance.
function selectionChance(c,r){
  ensurePerceivedPotential();
  const gap=ability()-c[1];
  const perceivedTalent=Math.max(0,P.perceivedPot-78);
  const youth=P.age<=17?Math.max(0,c[3]-60)*.11+perceivedTalent*.09:perceivedTalent*.035;
  const abilityTerm=gap*.36;
  const trustTerm=(P.trust-25)*.30;
  const formTerm=(P.form-50)*.12;
  const roleTerm=r.boost;
  const base=P.age<=17?11:14;
  const raw=base+abilityTerm+trustTerm+formTerm+roleTerm+youth;
  return {chance:clamp(raw,P.age<=17?3:4,88),raw,abilityTerm,trustTerm,formTerm,roleTerm,youth};
}

// Interest is deliberately harder to gain and can FALL.
// A club has its own scouting opinion, suitability and threshold. Quiet/non-playing weeks decay interest.
function market(grade,g,as,c,ctx,clean){
  ensurePerceivedPotential();
  const played=grade!=null;
  const perf=played?clamp((3.35-grade)*7,-8,15):0;
  const standout=played&&grade<=2.0?(2.0-grade)*5+3:0;
  const event=played?(g*2.0+as*.8+(((P.pos==='GK'||P.pos==='CB')&&clean)?.8:0)):0;
  const visibility=(P.att*.10+P.rep*.13+c[2]*.035);
  const recent=(perf+standout+event)*clamp(.9+(ctx.mult-1)*.5,.82,1.18);

  Object.entries(CLUBS).forEach(([n,cc])=>{
    if(n===S.club)return;
    let m=S.market[n];
    if(!m){
      // Persistent club-specific scouting opinion; true potential remains hidden from club logic.
      const scoutPot=clamp(P.perceivedPot+rn()*5,65,98);
      const need=clamp(55+rn()*18,20,90);
      m={score:0,state:'Unaware',delta:0,x:0,scoutPot,need};
    }
    const old=m.score;
    const levelGap=ability()-cc[1];
    const readiness=clamp(55+levelGap*1.7,0,75);
    const upside=clamp((m.scoutPot-cc[1]+4)*1.25,0,32);
    const fit=(readiness*.32+upside*.43+m.need*.25);

    // Awareness gate: low-profile players are simply not evaluated by every club every week.
    const discovery=clamp((P.att+P.rep)*.35+recent*.9+visibility+fit*.18,0,100);
    const noticed=discovery>22 || old>0;
    let delta;
    if(!noticed){
      delta=-old*.10;
    }else{
      // Natural weekly forgetting is stronger than before. Average/quiet weeks can be negative.
      const decay=old*(played?.075:.12);
      const evidence=recent*.18 + visibility*.035 + fit*.025 - 1.55;
      delta=evidence-decay;
      // Bad performances actively cool interest.
      if(played&&grade>=4.0)delta-=1.0+(grade-4)*.8;
    }
    const score=clamp(old+delta,0,100);
    const state=score>=55?'Serious interest':score>=38?'Interested':score>=23?'Scouting':score>=10?'Monitoring':score>=3?'Aware':'Unaware';
    S.market[n]={...m,score,state,delta:score-old,x:discovery};
  });
}

// Wrap player creation only to initialise the manager/scout perception after offers are generated.
const _v082GenerateOffers=generateOffers;
generateOffers=function(){
  _v082GenerateOffers();
  ensurePerceivedPotential();
};

// Extend debug without changing the established match/team output.
const _v082Snap=snap;
snap=function(){
  const x=_v082Snap();
  ensurePerceivedPotential();
  x.perceivedPotential=P.perceivedPot;
  return x;
};
