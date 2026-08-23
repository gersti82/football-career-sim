// v0.11.2 targeted selection + career visibility calibration.
// Additive layer: preserves match output, historical fixtures, team stats, scouting, contracts and transfers.

// ----- Recent first-team performance -> next selection -----
function selGradeImpact(grade){
  if(grade==null||grade==='—')return 0;
  grade=Number(grade);
  if(grade<=1.5)return 7.5;
  if(grade<=2.0)return 6.0;
  if(grade<=2.5)return 3.5;
  if(grade<=3.0)return 1.5;
  if(grade<=3.5)return 0;
  if(grade<=4.0)return -2.5;
  if(grade<=4.5)return -4.5;
  return -6.0;
}
function recentFirstTeamMomentum(){
  if(!S?.hist?.length)return 0;
  // Last five TEAM matches. A good appearance matters immediately but naturally decays when no further
  // first-team evidence arrives. Minutes only change evidence strength modestly because playing time is
  // not controlled by the player.
  let total=0;
  for(let i=0;i<Math.min(5,S.hist.length);i++){
    const h=S.hist[i];
    if(!h||h.grade==='—'||h.grade==null)continue;
    const recency=[1,.72,.50,.32,.18][i]||0;
    const mins=Number(h.mins||0);
    const evidence=.78+.22*clamp(mins/90,0,1); // 20-min cameo still counts ~83% as strongly as a full match.
    total+=selGradeImpact(h.grade)*recency*evidence;
  }
  return clamp(total,-8,10);
}

// Replace only selectionChance. Compared with the protected v0.9.1 formula this adds:
// 1) stronger youth-policy interaction when the player is already close to squad level;
// 2) recent first-team performance momentum.
selectionChance=function(c,r){
  const pp=ownPerception();
  const gap=ability()-c[1];
  const perceivedTalent=Math.max(0,pp.pot-78);

  // Basic youth/talent signal retained from the stable model.
  const baseYouth=P.age<=17?Math.max(0,c[3]-60)*.10+perceivedTalent*.085:perceivedTalent*.03;

  // Youth-friendly teams should genuinely use near-ready youngsters. This only becomes strong when the
  // player's current ability is reasonably close to the squad level; it cannot rescue a player 20 points below it.
  const nearReady=clamp((gap+15)/15,0,1); // -15 gap = 0; level with squad = 1
  const youthCulture=clamp((c[3]-55)/40,0,1);
  const youthOpportunity=P.age<=18?nearReady*youthCulture*10:nearReady*youthCulture*4;

  const abilityTerm=gap*.34;
  const trustTerm=(P.trust-25)*.31;
  const formTerm=(P.form-50)*.12;
  let roleTerm=r.boost;
  if(S.contract.role==='Rotation prospect')roleTerm+=4.5;
  if(S.contract.role==='Development prospect')roleTerm-=1.5;
  const momentum=recentFirstTeamMomentum();
  const base=P.age<=17?12:15;
  const raw=base+abilityTerm+trustTerm+formTerm+roleTerm+baseYouth+youthOpportunity+momentum;
  const floor=S.contract.role==='Rotation prospect'?5:(P.age<=17?3:4);
  return {chance:clamp(raw,floor,90),raw,abilityTerm,trustTerm,formTerm,roleTerm,youth:baseYouth+youthOpportunity,youthBase:baseYouth,youthOpportunity,momentum,perceivedPot:pp.pot,certainty:pp.certainty};
};

// ----- Attention / reputation calibration -----
// The base prototype was designed for one-season testing and compounds visibility too quickly over several years.
// Keep both values meaningful: attention = current public visibility (more volatile), reputation = established standing.
function visibilityCaps(){
  const age=P.age;
  // A teenager can become famous, but 100 requires truly extraordinary evidence rather than normal substitute football.
  return {
    attention:age<=17?72:age<=19?82:age<=21?90:96,
    reputation:age<=17?48:age<=19?62:age<=21?76:92
  };
}
function allowedVisibilityGain(h,teamPrestige){
  if(!h||h.grade==='—'||h.grade==null)return {att:0,rep:0};
  const grade=Number(h.grade),quality=clamp((3.5-grade),-1.5,2.5);
  const goals=Number(h.g||0),assists=Number(h.as||0);
  const standout=grade<=2?1.0:grade<=2.5?.4:0;
  const young=P.age<=18&&grade<=2.5?.45:0;
  const prestige=.65+(teamPrestige||65)/180;
  // Typical decent cameo: small fractions. Exceptional games can still create a visible jump.
  const att=clamp((Math.max(0,quality)*.42+goals*.65+assists*.28+standout+young)*prestige,0,4.0);
  const rep=clamp((Math.max(0,quality)*.16+goals*.20+assists*.10+standout*.22+young*.12)*prestige,0,1.25);
  return {att,rep};
}

const _v112Sim=sim;
sim=function(){
  if(!P||!S)return _v112Sim();
  const beforeAtt=P.att,beforeRep=P.rep,beforeHist=S.hist?.length||0;
  const out=_v112Sim();
  if(!S.hist||S.hist.length<=beforeHist)return out;
  const h=S.hist[0],prestige=CLUBS[S.club]?.[2]||65;
  const allow=allowedVisibilityGain(h,prestige),caps=visibilityCaps();
  // Quiet/non-selected weeks cool attention slightly; reputation is sticky but can no longer inflate automatically.
  if(!h||h.grade==='—'||h.grade==null){
    P.att=clamp(beforeAtt*.992,0,caps.attention);
    P.rep=clamp(beforeRep*.999,0,caps.reputation);
  }else{
    P.att=clamp(beforeAtt+allow.att,0,caps.attention);
    P.rep=clamp(beforeRep+allow.rep,0,caps.reputation);
  }
  // Keep delta debug consistent with the corrected final values.
  if(S.delta){S.delta.attention=P.att-beforeAtt;S.delta.reputation=P.rep-beforeRep;}
  return out;
};

// ----- Contract renewal / role promotion trust bug -----
// transfer-v011 trAccept resets trust to ROLE baseline for every accepted offer. That is reasonable after changing
// club, but wrong for a renewal: the same manager/club should not forget trust the player already earned.
const _v112TrAccept=trAccept;
trAccept=async function(i){
  if(!S?.transferOffers?.[i])return _v112TrAccept(i);
  const offer=S.transferOffers[i],sameClub=offer.club===S.club,oldTrust=P.trust,oldRole=S.contract?.role;
  await _v112TrAccept(i);
  if(sameClub&&S){
    const rank={'Development prospect':0,'Rotation prospect':1,'Squad player':2,'First-team player':3};
    const promoted=(rank[offer.role]??0)>(rank[oldRole]??0);
    // Preserve earned trust; a promotion can add a small acknowledgement bonus, never reduce it.
    P.trust=clamp(Math.max(P.trust,oldTrust)+(promoted?2:0),5,95);
    render();
  }
};

// Debug extension: show the newly explicit selection components without removing existing debug content.
const _v112Render=render;
render=function(){
  _v112Render();
  if(!S)return;
  const sd=S.lastSel;
  if(sd&&$('ratingsTab')){
    const box=document.createElement('div');box.className='offer';box.id='v112SelectionDebug';
    box.innerHTML='<b>Selection momentum DEBUG</b><br>Recent first-team performance: '+(sd.momentum??recentFirstTeamMomentum()).toFixed(2)+' pts<br>Youth near-ready opportunity: '+(sd.youthOpportunity??0).toFixed(2)+' pts<br><span class="muted">Good first-team grades increase the next selection chance; poor grades reduce it. Youth policy has its strongest effect when current ability is already near squad level.</span>';
    const old=$('v112SelectionDebug');if(old)old.remove();$('ratingsTab').appendChild(box);
  }
};
