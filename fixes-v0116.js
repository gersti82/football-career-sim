// v0.11.6 targeted career-market + attacking-event calibration.
// Additive only: separates scouting knowledge from interest, blocks low-interest offers,
// and reallocates player goal/assist involvement according to position and actual team goals.

const V116_ATTACK={
  ST:{goal:.44,assist:.20},AM:{goal:.24,assist:.34},CM:{goal:.13,assist:.25},DM:{goal:.07,assist:.13},
  FB:{goal:.045,assist:.18},CB:{goal:.035,assist:.035},GK:{goal:.002,assist:.004}
};
function v116ScoutingStatus(club){
  const p=S.perceptions?.[club],obs=p?.observations||0,cert=p?.certainty||0;
  if(obs<=0&&cert<18)return 'Unknown';
  if(obs<2&&cert<28)return 'Aware';
  if(obs<5&&cert<48)return 'Monitoring';
  if(obs<10&&cert<70)return 'Actively scouting';
  return 'Well scouted';
}
function v116InterestLabel(x){return x<5?'Not interested':x<20?'Low':x<40?'Moderate':x<60?'Interested':x<80?'Strong':'Very strong';}

// Re-label market state as actual interest only. Scouting status is stored separately.
const _v116Market=market;
market=function(...args){
  const out=_v116Market(...args);
  Object.entries(S.market||{}).forEach(([club,m])=>{
    m.scouting=v116ScoutingStatus(club);
    m.interestLabel=v116InterestLabel(m.score||0);
    m.state=m.interestLabel;
  });
  return out;
};

// Position-based goal/assist allocation. Base sim already guarantees the player cannot exceed team goals;
// this recalibrates involvement after the match using the actual goals available to his team.
function v116ReallocateAttack(h){
  if(!h||!h.mins)return;
  const pos=V116_ATTACK[P.pos]||V116_ATTACK.CM;
  const ownGoals=Number(h.ownGoals ?? h.teamGoals ?? h.gf ?? 0);
  if(!Number.isFinite(ownGoals)||ownGoals<=0){h.goals=0;h.assists=0;return;}
  const mins=clamp(Number(h.mins||0),0,90),exposure=Math.pow(mins/90,.72);
  const grade=Number(h.grade||3.5),perf=clamp(1+(3.5-grade)*.12,.72,1.28);
  const quality=clamp(.88+(ability()-ltClub(S.club)[1])*.012,.72,1.18);
  let goals=0,assists=0;
  for(let i=0;i<ownGoals;i++){
    if(Math.random()<clamp(pos.goal*exposure*perf*quality,0,.72))goals++;
  }
  const remaining=Math.max(0,ownGoals-goals);
  for(let i=0;i<remaining;i++){
    if(Math.random()<clamp(pos.assist*exposure*perf*quality,0,.62))assists++;
  }
  h.goals=goals;h.assists=assists;
}

const _v116Sim=sim;
sim=function(){
  if(!S)return _v116Sim();
  const oldG=S.goals||0,oldA=S.assists||0,before=S.hist?.length||0;
  const out=_v116Sim();
  if(!S.hist||S.hist.length<=before)return out;
  const h=S.hist[0],baseG=Number(h.goals||0),baseA=Number(h.assists||0);
  // Infer player's team goals from fixture result when older layers did not store it explicitly.
  if(h.ownGoals==null){
    const f=S.fx?.[Math.max(0,S.match-1)];
    if(f)h.ownGoals=f.home===S.club?f.hg:f.ag;
  }
  v116ReallocateAttack(h);
  S.goals=oldG+Number(h.goals||0);S.assists=oldA+Number(h.assists||0);
  if(S.delta){S.delta.goals=(h.goals||0);S.delta.assists=(h.assists||0);}
  return out;
};

// Offers: actual interest is now a gate, not just one ingredient in an offer score.
// Renewal is allowed independently because the current club has daily internal knowledge.
const _v116TrBuildOffers=trBuildOffers;
trBuildOffers=function(active){
  const raw=_v116TrBuildOffers(active);
  let filtered=raw.filter(o=>o.renewal || (S.market?.[o.club]?.score||0)>=30);
  // No forced external offers. A player can legitimately have only a renewal, or no external options.
  return filtered;
};

// Debug UI: explicitly separate knowledge from desire and explain Trigger.
const _v116Render=render;
render=function(){
  _v116Render();if(!S)return;
  if($('marketTab')){
    const mk=Object.entries(S.market||{}).sort((a,b)=>(b[1].score||0)-(a[1].score||0));
    $('marketTab').innerHTML='<p class="muted"><b>Scouting</b> = how well the club knows the player. <b>Interest</b> = how much the club currently wants him. <b>Trigger</b> = this week’s discovery/visibility signal used to decide whether the club notices or continues tracking him; it is not interest.</p>'+(mk.length?'<div class="scroll"><table><tr><th>Club</th><th>Interest</th><th>Δ</th><th>Interest state</th><th>Scouting</th><th>Pot</th><th>Cert</th><th>Trigger</th></tr>'+mk.map(([n,v])=>'<tr><td>'+n+'</td><td>'+Number(v.score||0).toFixed(1)+'%</td><td>'+dh(v.delta||0)+'</td><td>'+v116InterestLabel(v.score||0)+'</td><td>'+v116ScoutingStatus(n)+'</td><td>'+Number(v.scoutPot??S.perceptions?.[n]?.pot??0).toFixed(1)+'</td><td>'+Number(v.certainty??S.perceptions?.[n]?.certainty??0).toFixed(0)+'%</td><td>'+Number(v.x||0).toFixed(1)+'</td></tr>').join('')+'</table></div>':'<p class="muted">No clubs are currently tracking the player.</p>');
  }
};
