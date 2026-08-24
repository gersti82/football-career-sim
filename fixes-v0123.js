// v0.12.3 — trust calculation consistency fix.
// Recompute trust AFTER the canonical final grade + G/A are known, and expose one authoritative total delta.

function v123MatchTrust(h,f,preCareerGoals){
  if(!h||Number(h.mins||0)<=0)return 0;
  const grade=Number(h.grade||3.5),g=Number(h.g||0),a=Number(h.as||0);
  const role=ROLE[S.contract?.role]||ROLE['Rotation prospect'];
  const opp=f?(f.home===S.club?f.away:f.home):null,ctx=opp?contextFactor(opp):{mult:1,strength:70};
  const clean=f?v120GoalsAgainst(f)===0:false;
  // Performance versus role expectation. A 3.5 is neutral for a Rotation Prospect but mildly negative for a First-team Player.
  const quality=clamp((role.grade-grade)*1.45,-2.6,3.8);
  const excellent=grade<=1.5?1.45:grade<=2.0?.95:grade<=2.5?.35:0;
  // Goals/assists always help trust. Rare goals by defensive positions are worth a little more.
  const goalW={ST:.95,AM:1.00,CM:1.05,DM:1.15,FB:1.20,CB:1.30,GK:1.45}[P.pos]||1.0;
  const assistW={ST:.45,AM:.58,CM:.62,DM:.58,FB:.62,CB:.48,GK:.55}[P.pos]||.55;
  const events=g*goalW+a*assistW;
  const firstGoal=(preCareerGoals===0&&g>0)?.65:0;
  const defensive=((P.pos==='GK'||P.pos==='CB')&&clean)?.55:((P.pos==='DM'||P.pos==='FB')&&clean)?.30:0;
  const young=P.age<=18&&grade<=2.5?.25:0;
  return clamp((quality+excellent+events+firstGoal+defensive+young)*clamp(ctx.mult,.85,1.18),-4.5,7.0);
}
function v123TrainingTrust(){
  const base=Number(S.lastTrain?.trustDelta||0);
  const prof=clamp((v118Professionalism()-50)/50*.22,-.22,.22);
  return base+prof;
}

const _v123Sim=sim;
sim=function(){
  if(!S||!P)return _v123Sim();
  const preTrust=Number(P.trust||0),preGoals=Number(S.goals||0),preMatch=Number(S.match||0),preLen=S.hist?.length||0;
  const out=_v123Sim();
  if(!S.hist||S.hist.length<=preLen||Number(S.match||0)<=preMatch)return out;
  const f=S.fx?.[preMatch];
  let h=S.hist[0];if(f&&Number(h?.md)!==Number(f.md))h=(S.hist||[]).find(x=>Number(x.md)===Number(f.md))||h;
  if(!h)return out;

  const training=v123TrainingTrust(),match=v123MatchTrust(h,f,preGoals),total=training+match;
  P.trust=clamp(preTrust+total,5,95);
  // Canonical fields for all current/legacy UI paths.
  h.trustDelta=total;h.td=total;h.matchTrustDelta=match;h.trainingTrustDelta=training;
  S.lastRoleDelta=match;
  if(S.delta){S.delta.trust=total;S.delta.matchTrust=match;S.delta.trainingTrust=training;}
  render();return out;
};

const _v123Render=render;
render=function(){
  _v123Render();if(!S||!$('ratingsTab'))return;
  const h=S.hist?.[0];if(!h)return;
  const old=document.getElementById('v123TrustDebug');if(old)old.remove();
  const d=document.createElement('div');d.className='offer';d.id='v123TrustDebug';
  d.innerHTML='<b>Trust delta DEBUG</b><br>Total: '+dh(Number(h.trustDelta||0))+' · match: '+dh(Number(h.matchTrustDelta||0))+' · training: '+dh(Number(h.trainingTrustDelta||0))+'<br><span class="muted">The match table and Ratings Debug now use the same total trust delta. Final grade, goals/assists, clean sheets and opponent context are evaluated before trust is applied. Minutes do not directly affect trust.</span>';
  $('ratingsTab').appendChild(d);
};
