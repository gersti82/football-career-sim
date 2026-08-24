// v0.12.4 — career G/A persistence + realistic starter substitution minutes.
// Goals/assists stay career totals across season history resets.
// Starters normally play 65-90 minutes, with a smaller chance of an early substitution.

function v124SeasonEventSum(){
  let g=0,a=0;
  for(const h of S?.hist||[]){g+=Number(h.g??h.goals??0)||0;a+=Number(h.as??h.assists??0)||0;}
  return {g,a};
}

// Replace v0.12.2 total reconciler: career base + current-season history.
v122SumTotals=function(){
  if(!S)return;
  const z=v124SeasonEventSum();
  S.goals=Number(S.careerGoalsBase||0)+z.g;
  S.assists=Number(S.careerAssistsBase||0)+z.a;
};

// Initialise explicit career carry-forward values.
const _v124Sign=sign;
sign=function(i){
  const out=_v124Sign(i);
  if(S){S.careerGoalsBase=0;S.careerAssistsBase=0;v122SumTotals();render();}
  return out;
};

// Before a successful new-season transition, bank this season's events because ltNextSeason clears S.hist.
const _v124LtNextSeason=ltNextSeason;
ltNextSeason=async function(){
  if(!S)return _v124LtNextSeason();
  const oldLabel=S.seasonLabel,oldMatch=S.match,oldFxLen=S.fx?.length||0;
  const season=v124SeasonEventSum();
  const oldBaseG=Number(S.careerGoalsBase||0),oldBaseA=Number(S.careerAssistsBase||0);
  const out=await _v124LtNextSeason();
  // Only bank when an actual season transition happened.
  if(S && S.seasonLabel!==oldLabel){
    S.careerGoalsBase=oldBaseG+season.g;
    S.careerAssistsBase=oldBaseA+season.a;
    v122SumTotals();render();
  }
  return out;
};

function v124IsStart(h){
  const role=String(h?.role||'').toLowerCase();
  return role.includes('start') || Number(h?.mins||0)>=60 && role!=='sub';
}
function v124StarterMinutes(){
  // ~12% early substitution (injury/tactical/poor game), otherwise normal 65-90 minute exit.
  if(Math.random()<.12)return Math.round(25+Math.random()*39); // 25-64
  // Bias toward later substitutions; full 90 remains common.
  const x=Math.pow(Math.random(),.58);
  let m=Math.round(65+x*25);
  if(Math.random()<.22)m=90;
  return clamp(m,65,90);
}

const _v124Sim=sim;
sim=function(){
  if(!S)return _v124Sim();
  const preLen=S.hist?.length||0,preMins=Number(S.mins||0),preMatch=Number(S.match||0);
  const out=_v124Sim();
  if(!S.hist||S.hist.length<=preLen||Number(S.match||0)<=preMatch)return out;
  const f=S.fx?.[preMatch];
  let h=S.hist[0];if(f&&Number(h?.md)!==Number(f.md))h=(S.hist||[]).find(x=>Number(x.md)===Number(f.md))||h;
  if(!h||!v124IsStart(h))return out;

  const oldM=Number(h.mins||0);
  // Keep already sensible starter minutes. Only repair unrealistically short/ambiguous starts.
  if(oldM>=65&&oldM<=90){h.substitutionMinute=oldM<90?oldM:null;return out;}
  const newM=v124StarterMinutes();
  h.originalMinutesDebug=oldM;h.mins=newM;h.substitutionMinute=newM<90?newM:null;
  // S.mins is a career counter, so adjust only by the delta for this match.
  S.mins=Math.max(0,Number(S.mins||0)+(newM-oldM));

  // Recalculate attacking involvement with the corrected exposure and keep canonical event fields/totals aligned.
  if(f){
    const own=v120OwnGoals(f),ga=v120GoalsAgainst(f),baseGrade=Number(h.baseGrade??h.grade??3.5);
    const ev=v120Events(newM,own);h.g=ev.goals;h.as=ev.assists;h.goals=ev.goals;h.assists=ev.assists;
    h.grade=v120FinalGrade(baseGrade,ev.goals,ev.assists,ga,newM);
    v122SumTotals();
    // Trust is recalculated from the corrected final match record; minutes themselves are not a trust input.
    const training=Number(h.trainingTrustDelta??v123TrainingTrust()),match=v123MatchTrust(h,f,Math.max(0,S.goals-ev.goals)),total=training+match;
    const previousTotal=Number(h.trustDelta||0);
    P.trust=clamp(Number(P.trust||0)-previousTotal+total,5,95);
    h.trustDelta=total;h.td=total;h.matchTrustDelta=match;h.trainingTrustDelta=training;
    if(S.delta){S.delta.goals=ev.goals;S.delta.assists=ev.assists;S.delta.trust=total;S.delta.matchTrust=match;S.delta.trainingTrust=training;}
  }
  render();return out;
};
