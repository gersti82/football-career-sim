// v0.9.1 calibration layer: club-specific scouting knowledge + role opportunity rebalance.
// Keeps the stable 0.8.2 fixture/match/team UI intact.

function initClubPerceptions(){
  if(!P||!S)return;
  if(!S.perceptions)S.perceptions={};
  Object.entries(CLUBS).forEach(([n,c])=>{
    if(S.perceptions[n])return;
    const own=n===S.club;
    const baseCert=own?62:clamp(12+(P.att+P.rep)*.45+Math.max(0,c[2]-70)*.08,10,30);
    const sigma=own?5.5:12;
    S.perceptions[n]={
      pot:clamp(P.pot+rn()*sigma,65,98),
      certainty:baseCert,
      observations:own?6:0
    };
  });
}
function ownPerception(){initClubPerceptions();return S.perceptions[S.club]}
function observePotential(club,weight,signal){
  initClubPerceptions();
  const p=S.perceptions[club];
  if(!p)return;
  const w=clamp(weight,0,1);
  const noisyEvidence=clamp(P.pot+rn()*(13-p.certainty*.09),65,98);
  // Evidence can move estimates both directions. Strong performances mostly increase attention/certainty,
  // not magically true potential; only a small performance signal nudges the estimate.
  const target=clamp(noisyEvidence+(signal||0)*.12,65,98);
  p.pot=clamp(p.pot*(1-w)+target*w,65,98);
  p.certainty=clamp(p.certainty+3+12*w,5,95);
  p.observations++;
}

// Trust is driven by performance against role expectation. Events already affect the Kicker grade.
function roleTrustDelta(grade,g,as,played,ctx,clean){
  if(!played)return 0;
  const r=ROLE[S.contract.role];
  const vsExpectation=clamp((r.grade-grade)*1.55,-2.8,3.8);
  const excellent=grade<=1.5?1.35:grade<=2.0?.85:grade<=2.5?.30:0;
  const defensive=((P.pos==='GK'||P.pos==='CB')&&clean)?.30:((P.pos==='FB'||P.pos==='DM')&&clean)?.15:0;
  const context=clamp(.90+(ctx.mult-1)*.45,.82,1.18);
  return (vsExpectation+excellent+defensive)*context;
}

// Selection: the manager uses the CURRENT CLUB'S own estimate, not true potential.
// Rotation prospect is now materially different from development prospect.
function selectionChance(c,r){
  const pp=ownPerception();
  const gap=ability()-c[1];
  const perceivedTalent=Math.max(0,pp.pot-78);
  const youth=P.age<=17?Math.max(0,c[3]-60)*.11+perceivedTalent*.09:perceivedTalent*.035;
  const abilityTerm=gap*.34;
  const trustTerm=(P.trust-25)*.31;
  const formTerm=(P.form-50)*.12;
  let roleTerm=r.boost;
  if(S.contract.role==='Rotation prospect')roleTerm+=4.5;
  if(S.contract.role==='Development prospect')roleTerm-=1.5;
  const base=P.age<=17?12:15;
  const raw=base+abilityTerm+trustTerm+formTerm+roleTerm+youth;
  const floor=S.contract.role==='Rotation prospect'?5:(P.age<=17?3:4);
  return {chance:clamp(raw,floor,88),raw,abilityTerm,trustTerm,formTerm,roleTerm,youth,perceivedPot:pp.pot,certainty:pp.certainty};
}

// Each external club owns a different estimate and certainty. Interest can rise or fall.
function market(grade,g,as,c,ctx,clean){
  initClubPerceptions();
  const played=grade!=null;
  const perf=played?clamp((3.35-grade)*7,-8,15):0;
  const standout=played&&grade<=2.0?(2.0-grade)*5+3:0;
  const event=played?(g*2.0+as*.8+(((P.pos==='GK'||P.pos==='CB')&&clean)?.8:0)):0;
  const visibility=P.att*.10+P.rep*.13+c[2]*.035;
  const recent=(perf+standout+event)*clamp(.9+(ctx.mult-1)*.5,.82,1.18);

  // Own club sees training every week, so its estimate gets steadily more certain.
  observePotential(S.club,.08,(P.form-50)*.05);

  Object.entries(CLUBS).forEach(([n,cc])=>{
    if(n===S.club)return;
    let m=S.market[n];
    if(!m)m={score:0,state:'Unaware',delta:0,x:0,need:clamp(55+rn()*18,20,90)};
    const opinion=S.perceptions[n];
    const old=m.score;
    const levelGap=ability()-cc[1];
    const readiness=clamp(55+levelGap*1.7,0,75);
    const upside=clamp((opinion.pot-cc[1]+4)*1.25,0,32);
    const fit=readiness*.32+upside*.43+m.need*.25;
    const discovery=clamp((P.att+P.rep)*.35+recent*.9+visibility+fit*.18,0,100);
    const noticed=discovery>22||old>0;
    let delta;
    if(!noticed){delta=-old*.10}
    else{
      const decay=old*(played?.075:.12);
      const evidence=recent*.18+visibility*.035+fit*.025-1.55;
      delta=evidence-decay;
      if(played&&grade>=4.0)delta-=1.0+(grade-4)*.8;
    }
    const score=clamp(old+delta,0,100);
    const state=score>=55?'Serious interest':score>=38?'Interested':score>=23?'Scouting':score>=10?'Monitoring':score>=3?'Aware':'Unaware';
    // Clubs only learn when there is actual visibility/scouting. Better interest means more observation.
    if(played&&noticed){
      const scoutWeight=state==='Serious interest'?.22:state==='Interested'?.16:state==='Scouting'?.11:state==='Monitoring'?.065:.035;
      observePotential(n,scoutWeight,perf+standout);
    }
    S.market[n]={...m,score,state,delta:score-old,x:discovery,scoutPot:S.perceptions[n].pot,certainty:S.perceptions[n].certainty};
  });
}

// Initialise perceptions only after signing, because there is no current club before that point.
const _v082Sign=sign;
sign=function(i){
  _v082Sign(i);
  initClubPerceptions();
  render();
};

// Debug: true potential plus current club's estimate. External club estimates are in Interest Debug.
const _v082Snap=snap;
snap=function(){
  const x=_v082Snap();
  if(S&&P){const op=ownPerception();x.clubPerceivedPotential=op.pot;x.clubPotentialCertainty=op.certainty}
  return x;
};

// Add club-specific potential/certainty to Interest Debug without touching match/team output.
const _v082Render=render;
render=function(){
  _v082Render();
  if(!S)return;
  initClubPerceptions();
  const mk=Object.entries(S.market).sort((a,b)=>b[1].score-a[1].score);
  $('marketTab').innerHTML='<p class="muted">Each club has its own potential estimate. Pot = perceived potential; Cert = confidence in that estimate. True potential remains debug-only.</p>'+(mk.length?'<div class="scroll"><table><tr><th>Club</th><th>Score</th><th>Δ</th><th>State</th><th>Pot</th><th>Cert</th><th>Trigger</th></tr>'+mk.map(([n,v])=>'<tr><td>'+n+'</td><td>'+v.score.toFixed(1)+'</td><td>'+dh(v.delta)+'</td><td>'+v.state+'</td><td>'+(v.scoutPot??S.perceptions[n].pot).toFixed(1)+'</td><td>'+(v.certainty??S.perceptions[n].certainty).toFixed(0)+'%</td><td>'+v.x.toFixed(1)+'</td></tr>').join('')+'</table></div>':'<p class="muted">No external club has accumulated interest yet.</p>');
};
