// v0.12.0 — replace attacking-event pipeline and reconcile totals from match history.
// Causal order: underlying performance -> fixed-result events -> final grade -> downstream career effects.
// Opponent strength does NOT determine whether historical team goals exist.

const V120_ATTACK={ST:{g:.40,a:.16},AM:{g:.20,a:.31},CM:{g:.10,a:.22},DM:{g:.045,a:.11},FB:{g:.03,a:.15},CB:{g:.025,a:.025},GK:{g:.001,a:.003}};
const V120_DEF={GK:1.00,CB:.90,DM:.58,FB:.62,CM:.18,AM:.05,ST:0};
function v120OwnGoals(f){return Math.max(0,Number(f.home===S.club?f.hg:f.ag)||0)}
function v120GoalsAgainst(f){return Math.max(0,Number(f.home===S.club?f.ag:f.hg)||0)}
function v120TeamCompetition(){const c=ltClub(S.club),strength=Number(c?.[1]||70);return clamp(1-(strength-65)*.0065,.72,1.08)}
function v120Events(mins,ownGoals){
  if(mins<=0||ownGoals<=0)return {goals:0,assists:0};
  const w=V120_ATTACK[P.pos]||V120_ATTACK.CM,ex=Math.pow(clamp(mins/90,0,1),.72),teamComp=v120TeamCompetition();
  // Relative player quality affects his share of his own team's already-fixed goals; opponent strength is intentionally absent.
  const rel=clamp(1+(v118EffectiveAbility()-Number(ltClub(S.club)?.[1]||70))*.012,.72,1.22);
  let goals=0,assists=0;
  for(let i=0;i<ownGoals;i++){
    const repeat=Math.pow(.58,goals); // diminishing chance for braces/hat-tricks
    if(Math.random()<clamp(w.g*ex*teamComp*rel*repeat,0,.62))goals++;
  }
  for(let i=0;i<Math.max(0,ownGoals-goals);i++){
    const repeat=Math.pow(.70,assists);
    if(Math.random()<clamp(w.a*ex*teamComp*rel*repeat,0,.50))assists++;
  }
  return {goals,assists};
}
function v120FinalGrade(baseGrade,goals,assists,ga,mins){
  if(!mins||!Number.isFinite(baseGrade))return baseGrade;
  let g=baseGrade;
  // Exceptional grades can exist from underlying performance alone. Events improve, never create, that base performance.
  const goalBonus={ST:.72,AM:.78,CM:.82,DM:.88,FB:.90,CB:.98,GK:1.05}[P.pos]||.82;
  const assistBonus={ST:.38,AM:.52,CM:.50,DM:.46,FB:.48,CB:.40,GK:.45}[P.pos]||.45;
  for(let i=0;i<goals;i++)g-=goalBonus*Math.pow(.72,i);
  for(let i=0;i<assists;i++)g-=assistBonus*Math.pow(.78,i);
  const dw=V120_DEF[P.pos]??0;
  if(dw>0){
    if(ga===0)g-=.48*dw;
    else if(ga===1)g-=.08*dw;
    else if(ga===2)g+=.12*dw;
    else g+=(ga-1)*.13*dw;
  }
  return Math.round(clamp(g,1,6)*2)/2;
}
function v120ReconcileTotals(){
  // History is authoritative. This avoids wrapper-order/double-counting bugs across v0.11.6/v0.11.7.
  let goals=0,assists=0,apps=0,mins=0;
  for(const h of S.hist||[]){goals+=Number(h.goals||0);assists+=Number(h.assists||0);mins+=Number(h.mins||0);if(Number(h.mins||0)>0)apps++;}
  S.goals=goals;S.assists=assists;
  // Do not rewrite apps/minutes: season archives/long-term layers may intentionally aggregate them separately.
}

// Wrap the entire existing chain. We snapshot the newly-created row, then overwrite only its events/grade and totals.
const _v120Sim=sim;
sim=function(){
  if(!S)return _v120Sim();
  const preMatch=Number(S.match||0),preLen=S.hist?.length||0;
  const out=_v120Sim();
  if(!S.hist||S.hist.length<=preLen||Number(S.match||0)<=preMatch)return out;
  const h=S.hist[S.hist.length-1],f=S.fx?.[preMatch];if(!h||!f)return out;
  const mins=Number(h.mins||0),own=v120OwnGoals(f),ga=v120GoalsAgainst(f);
  h.ownGoals=own;h.goalsAgainst=ga;
  if(mins<=0){h.goals=0;h.assists=0;v120ReconcileTotals();render();return out;}
  // Existing grade is treated as underlying individual-performance grade before event bonuses.
  const baseGrade=Number(h.grade||3.5),ev=v120Events(mins,own);
  h.baseGrade=baseGrade;h.goals=ev.goals;h.assists=ev.assists;h.grade=v120FinalGrade(baseGrade,ev.goals,ev.assists,ga,mins);
  v120ReconcileTotals();
  if(S.delta){S.delta.goals=ev.goals;S.delta.assists=ev.assists;S.delta.grade=h.grade;}
  // Rebuild season grade list from history where possible so displayed average follows corrected final grades.
  const played=(S.hist||[]).filter(x=>Number(x.mins||0)>0&&Number.isFinite(Number(x.grade))).map(x=>Number(x.grade));
  if(played.length)S.grades=played;
  render();return out;
};
