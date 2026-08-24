// v0.11.4 targeted selection-role calibration.
// First-team player is a meaningful club commitment when the player is near squad level.
// It does not guarantee selection forever: poor performances, falling trust and poor form can erode the advantage.

function firstTeamCommitmentFloor(c,momentum){
  const gap=ability()-c[1];
  if(S.contract?.role!=='First-team player'||gap<-8)return null;
  // A genuine first-team contract starts around the mid-50s when the player is near squad level.
  // Good evidence can strengthen it; poor evidence can push it well below 50.
  const closeness=clamp((gap+8)/8,0,1);                 // -8 => 0, level => 1
  const trustAdj=clamp((P.trust-50)*.18,-6,7);
  const formAdj=clamp((P.form-50)*.08,-4,4);
  const perfAdj=momentum>=0?clamp(momentum*.55,0,5):clamp(momentum*1.8,-14,0);
  return clamp(51+closeness*7+trustAdj+formAdj+perfAdj,32,70);
}

// Replace only the selection calculation from v0.11.2. All existing components remain visible and active.
selectionChance=function(c,r){
  const pp=ownPerception();
  const gap=ability()-c[1];
  const perceivedTalent=Math.max(0,pp.pot-78);
  const baseYouth=P.age<=17?Math.max(0,c[3]-60)*.10+perceivedTalent*.085:perceivedTalent*.03;
  const nearReady=clamp((gap+15)/15,0,1);
  const youthCulture=clamp((c[3]-55)/40,0,1);
  const youthOpportunity=P.age<=18?nearReady*youthCulture*10:nearReady*youthCulture*4;
  const abilityTerm=gap*.34;
  const trustTerm=(P.trust-25)*.31;
  const formTerm=(P.form-50)*.12;
  let roleTerm=r.boost;
  // Role hierarchy must materially change selection expectation.
  if(S.contract.role==='First-team player')roleTerm=32;
  else if(S.contract.role==='Squad player')roleTerm=12;
  else if(S.contract.role==='Rotation prospect')roleTerm=4.5;
  else if(S.contract.role==='Development prospect')roleTerm=-6.5;
  const momentum=recentFirstTeamMomentum();
  const base=P.age<=17?12:15;
  const raw=base+abilityTerm+trustTerm+formTerm+roleTerm+baseYouth+youthOpportunity+momentum;
  let floor=S.contract.role==='Rotation prospect'?5:(P.age<=17?3:4);
  const commitmentFloor=firstTeamCommitmentFloor(c,momentum);
  if(commitmentFloor!=null)floor=Math.max(floor,commitmentFloor);
  return {chance:clamp(Math.max(raw,floor),floor,92),raw,abilityTerm,trustTerm,formTerm,roleTerm,youth:baseYouth+youthOpportunity,youthBase:baseYouth,youthOpportunity,momentum,commitmentFloor,perceivedPot:pp.pot,certainty:pp.certainty};
};

const _v114Render=render;
render=function(){
  _v114Render();if(!S)return;
  const sd=S.lastSel;if(!sd||!$('ratingsTab'))return;
  const old=$('v114RoleDebug');if(old)old.remove();
  const d=document.createElement('div');d.className='offer';d.id='v114RoleDebug';
  d.innerHTML='<b>Role commitment DEBUG</b><br>Role contribution: '+Number(sd.roleTerm||0).toFixed(1)+' pts'+(sd.commitmentFloor!=null?' · first-team commitment floor: '+Number(sd.commitmentFloor).toFixed(1)+'%':'')+'<br><span class="muted">A near-squad-level First-team Player should normally begin above 50% selection probability. Poor grades reduce recent-performance momentum and can lower that commitment; good performances preserve or strengthen it.</span>';
  $('ratingsTab').appendChild(d);
};