// v0.11.7 HOTFIX — goal/assist accounting.
// v0.11.6 used the wrong history row and then rewrote career totals after the base simulation.
// This layer uses the just-played fixture as the single source of truth and reconciles totals exactly once.

const _v117Sim=sim;
sim=function(){
  if(!S)return _v117Sim();
  const preGoals=Number(S.goals||0),preAssists=Number(S.assists||0),preMatch=Number(S.match||0);
  const out=_v117Sim();
  if(!S.hist?.length || Number(S.match||0)<=preMatch)return out;

  // The base game appends match history, so the newly played match is the LAST row.
  const h=S.hist[S.hist.length-1];
  const f=S.fx?.[preMatch];
  if(!h||!f)return out;

  const ownGoals=Math.max(0,Number(f.home===S.club?f.hg:f.ag)||0);
  h.ownGoals=ownGoals;

  // Re-roll only the player's involvement, never the team result.
  // Preserve the post-match grade as the performance signal but never allow impossible events.
  const pos=V116_ATTACK[P.pos]||V116_ATTACK.CM;
  const mins=clamp(Number(h.mins||0),0,90);
  let goals=0,assists=0;
  if(mins>0&&ownGoals>0){
    const exposure=Math.pow(mins/90,.72);
    const grade=Number(h.grade||3.5);
    const perf=clamp(1+(3.5-grade)*.12,.72,1.28);
    const quality=clamp(.88+(ability()-ltClub(S.club)[1])*.012,.72,1.18);
    for(let i=0;i<ownGoals;i++)if(Math.random()<clamp(pos.goal*exposure*perf*quality,0,.72))goals++;
    // A player cannot assist his own goal; allocate assists only from the remaining team goals.
    for(let i=0;i<Math.max(0,ownGoals-goals);i++)if(Math.random()<clamp(pos.assist*exposure*perf*quality,0,.62))assists++;
  }

  h.goals=goals;h.assists=assists;
  // Career totals are reconciled from the values before this match, removing any base/v0.11.6 double counting.
  S.goals=preGoals+goals;S.assists=preAssists+assists;
  if(S.delta){S.delta.goals=goals;S.delta.assists=assists;}

  // If the latest-match output contains event fields, refresh it so UI and career totals agree immediately.
  render();
  return out;
};
