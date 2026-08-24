// v0.11.3 targeted calibration: club-size-aware interest + minutes-based development.
// Additive only. No existing UI, fixture, transfer, contract or match-output functionality removed.

// ----- Club interest: smaller clubs retain interest longer; elite clubs build more slowly -----
// Prestige is used as the temporary proxy for club size until the Transfermarkt-based club model replaces it.
function clubScoutingProfile(club){
  const c=ltClub(club),prestige=clamp(c[2]||65,50,100);
  const size=(prestige-50)/50; // 0 = small, 1 = elite
  return {
    size,
    build:1.18-size*.48,          // small ~1.18, elite ~0.70
    playedDecay:.040+size*.055,   // small ~4%, elite ~9.5%
    quietDecay:.060+size*.075,    // small ~6%, elite ~13.5%
    discoveryGate:20+size*8       // elite clubs require a stronger signal to begin tracking
  };
}

// Replace only market() with the same v0.9.1 structure plus club-specific persistence/build speed.
market=function(grade,g,as,c,ctx,clean){
  initClubPerceptions();
  const played=grade!=null;
  const perf=played?clamp((3.35-grade)*7,-8,15):0;
  const standout=played&&grade<=2.0?(2.0-grade)*5+3:0;
  const event=played?(g*2.0+as*.8+(((P.pos==='GK'||P.pos==='CB')&&clean)?.8:0)):0;
  const visibility=P.att*.10+P.rep*.13+c[2]*.035;
  const recent=(perf+standout+event)*clamp(.9+(ctx.mult-1)*.5,.82,1.18);
  observePotential(S.club,.08,(P.form-50)*.05);

  Object.entries(CLUBS).forEach(([n,cc])=>{
    if(n===S.club)return;
    let m=S.market[n];
    if(!m)m={score:0,state:'Unaware',delta:0,x:0,need:clamp(55+rn()*18,20,90)};
    const opinion=S.perceptions[n],profile=clubScoutingProfile(n),old=m.score;
    const levelGap=ability()-cc[1];
    const readiness=clamp(55+levelGap*1.7,0,75);
    const upside=clamp((opinion.pot-cc[1]+4)*1.25,0,32);
    const fit=readiness*.32+upside*.43+m.need*.25;
    const discovery=clamp((P.att+P.rep)*.35+recent*.9+visibility+fit*.18,0,100);
    const noticed=discovery>profile.discoveryGate||old>0;
    let delta;
    if(!noticed){
      // No existing interest means nothing to decay; established interest fades according to club profile.
      delta=-old*profile.quietDecay;
    }else{
      const decay=old*(played?profile.playedDecay:profile.quietDecay);
      // Smaller clubs are more willing to keep attainable prospects on the list; elite clubs require repeated proof.
      const rawEvidence=recent*.18+visibility*.035+fit*.025-1.55;
      const evidence=rawEvidence*profile.build;
      delta=evidence-decay;
      if(played&&grade>=4.0)delta-=1.0+(grade-4)*.8;
    }
    const score=clamp(old+delta,0,100);
    const state=score>=55?'Serious interest':score>=38?'Interested':score>=23?'Scouting':score>=10?'Monitoring':score>=3?'Aware':'Unaware';
    if(played&&noticed){
      const scoutWeight=state==='Serious interest'?.22:state==='Interested'?.16:state==='Scouting'?.11:state==='Monitoring'?.065:.035;
      observePotential(n,scoutWeight,perf+standout);
    }
    S.market[n]={...m,score,state,delta:score-old,x:discovery,scoutPot:S.perceptions[n].pot,certainty:S.perceptions[n].certainty,buildFactor:profile.build,decayRate:played?profile.playedDecay:profile.quietDecay};
  });
};

// ----- Development: actual first-team minutes matter, especially for young players -----
// The protected prototype treats every appearance almost equally (0.95) and no appearance as 0.78.
// We rescale ONLY the development increment created by sim(), leaving training/form/trust etc. untouched.
function developmentExposureFactor(minutes,age){
  const m=clamp(Number(minutes||0),0,90);
  const x=m/90;
  // Players still develop through training without match minutes, but competitive football becomes increasingly valuable.
  if(age<=18)return .58 + .82*Math.pow(x,.72); // 0m=.58, 20m≈.84, 45m≈1.08, 90m=1.40
  if(age<=21)return .62 + .63*Math.pow(x,.78); // 0m=.62, 90m=1.25
  if(age<=24)return .68 + .42*Math.pow(x,.82); // 0m=.68, 90m=1.10
  return .72 + .28*Math.pow(x,.85);             // older players: minutes matter less for raw growth
}

const _v113Sim=sim;
sim=function(){
  if(!P||!S)return _v113Sim();
  const bt=P.t,bp=P.ph,bm=P.m,beforeHist=S.hist?.length||0;
  const out=_v113Sim();
  if(!S.hist||S.hist.length<=beforeHist)return out;
  const h=S.hist[0],mins=Number(h?.mins||0);
  const played=mins>0;
  const oldFactor=played?.95:.78;
  const target=developmentExposureFactor(mins,P.age);
  const ratio=target/oldFactor;
  // t/ph/m are changed by the base sim's development step; rescale that increment to the new exposure model.
  const dt=P.t-bt,dp=P.ph-bp,dm=P.m-bm;
  P.t=bt+dt*ratio;P.ph=bp+dp*ratio;P.m=bm+dm*ratio;
  if(S.delta){
    S.delta.ability=ability()-(bt*.42+bp*.25+bm*.33);
    S.delta.technical=P.t-bt;S.delta.physical=P.ph-bp;S.delta.mental=P.m-bm;
  }
  h.devExposure=target;
  return out;
};

// Debug-only additions; existing tables remain intact.
const _v113Render=render;
render=function(){
  _v113Render();if(!S)return;
  const h=S.hist?.[0];
  if(h&&$('ratingsTab')){
    const old=$('v113DevDebug');if(old)old.remove();
    const d=document.createElement('div');d.className='offer';d.id='v113DevDebug';
    d.innerHTML='<b>Development exposure DEBUG</b><br>Last match minutes: '+Number(h.mins||0)+' · exposure factor: '+Number(h.devExposure??developmentExposureFactor(h.mins,P.age)).toFixed(2)+'<br><span class="muted">Young players still develop in training at 0 minutes, but sustained first-team minutes now accelerate ability growth materially.</span>';
    $('ratingsTab').appendChild(d);
  }
  if($('marketTab')){
    const note=document.createElement('div');note.className='offer';note.id='v113InterestNote';
    note.innerHTML='<b>Club-size scouting DEBUG</b><br><span class="muted">Smaller clubs retain attainable prospects longer. High-prestige clubs require stronger repeated evidence and build interest more slowly.</span>';
    const prior=$('v113InterestNote');if(prior)prior.remove();$('marketTab').appendChild(note);
  }
};
