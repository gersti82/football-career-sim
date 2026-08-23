// v0.11 SIMPLE TRANSFER TEST LAYER
// Additive: contract lengths 1-5 years; at expiry the player chooses among renewal/transfer offers.
// Transfers are selectable only to clubs in the next simulated Bundesliga season.

function trYears(){const r=Math.random();return r<.12?1:r<.34?2:r<.68?3:r<.90?4:5;}
function trRoleFor(club,perceivedPot){
  const c=ltClub(club),gap=ability()-c[1],upside=(perceivedPot||75)-c[1];
  if(gap>=-3)return 'First-team player';
  if(gap>=-9)return 'Squad player';
  if(gap>=-16||upside>=8)return 'Rotation prospect';
  return 'Development prospect';
}
function trExpectation(role){return role==='First-team player'?'Expected to compete for regular starts':role==='Squad player'?'Challenge established players':role==='Rotation prospect'?'Regular squad involvement and first-team opportunities':'Develop and take opportunities when earned';}
function trPlaying(role){return role==='First-team player'?'Regular first-team competition':role==='Squad player'?'Compete for first-team minutes':role==='Rotation prospect'?'Bench and rotation opportunities':'Youth prospect; first-team chances must be earned';}
function trWage(club,role){const c=ltClub(club),rb={'First-team player':2.0,'Squad player':1.45,'Rotation prospect':1.05,'Development prospect':.75}[role]||1;return Math.max(350,(300+c[2]*15+ability()*8)*rb*(.88+Math.random()*.25));}
function trRenderInitialOffers(){
  if(!$('offers')||!OFFERS?.length)return;
  $('offers').innerHTML='<div class="headline">Your offers</div><p class="muted">Contract lengths now vary from 1-5 years. DEBUG: potential remains visible only for testing.</p>'+OFFERS.map((o,i)=>'<div class="offer"><h3>'+o.club+'</h3><span class="tag">Bundesliga</span><span class="tag">'+o.role+'</span><span class="tag">'+o.years+' year'+(o.years===1?'':'s')+'</span><span class="tag">'+money(o.wage)+'</span><p><b>Expectation:</b> '+o.expect+'<br><b>Playing time:</b> '+o.minutes+'</p><button onclick="sign('+i+')">Sign with '+o.club+'</button></div>').join('');
}
const _trGenerateOffers=generateOffers;
generateOffers=function(){_trGenerateOffers();OFFERS.forEach(o=>o.years=trYears());trRenderInitialOffers();};

const _trSign=sign;
sign=function(i){_trSign(i);S.contractYearsRemaining=S.contract.years;S.contractStartSeason=S.seasonLabel||'2016-17';S.transferOffers=null;S.transferPending=null;render();};

function trOfferScore(club){
  const c=ltClub(club),m=S.market?.[club],p=S.perceptions?.[club];
  const perceived=p?.pot??clamp(P.pot+rn()*12,65,98),certainty=p?.certainty??12;
  const readiness=clamp(60-Math.abs(ability()-c[1])*1.7,0,60);
  const upside=clamp((perceived-c[1]+5)*1.5,0,40);
  const interest=m?.score||0;
  // Existing interest matters most, but free agents can receive new offers from clubs that rate their upside.
  return interest*.72+readiness*.22+upside*.36+certainty*.05+rn()*6;
}
function trBuildOffers(active){
  const candidates=active.map(club=>({club,score:trOfferScore(club)})).sort((a,b)=>b.score-a.score);
  let chosen=[];
  if(active.includes(S.club))chosen.push({club:S.club,score:trOfferScore(S.club)+8,renewal:true});
  const external=candidates.filter(x=>x.club!==S.club&&x.score>10);
  const desired=2+Math.floor(Math.random()*3); // usually 2-4 external possibilities
  chosen.push(...external.slice(0,desired));
  // Avoid a dead end at contract expiry in the test build.
  if(chosen.length<2)chosen.push(...candidates.filter(x=>!chosen.some(y=>y.club===x.club)).slice(0,2-chosen.length));
  return chosen.map(x=>{
    if(!S.perceptions[x.club])S.perceptions[x.club]={pot:clamp(P.pot+rn()*12,65,98),certainty:12,observations:0};
    const pp=S.perceptions[x.club].pot,role=trRoleFor(x.club,pp),years=trYears();
    return {club:x.club,renewal:!!x.renewal,score:x.score,perceivedPot:pp,certainty:S.perceptions[x.club].certainty,role,years,wage:trWage(x.club,role),expect:trExpectation(role),minutes:trPlaying(role)};
  });
}
function trShowOffers(){
  const card=$('contractTab');if(!card||!S.transferOffers)return;
  card.innerHTML='<div class="offer"><div class="headline">Contract expired — choose an offer</div><p class="muted">Roles are recalculated by each club from current ability and that club’s own perceived potential. Only clubs in the next simulated Bundesliga season are selectable.</p>'+S.transferOffers.map((o,i)=>'<div class="offer"><h3>'+(o.renewal?'Renew with ':'')+o.club+'</h3><span class="tag">'+o.role+'</span><span class="tag">'+o.years+' year'+(o.years===1?'':'s')+'</span><span class="tag">'+money(o.wage)+'</span><p><b>Expectation:</b> '+o.expect+'<br><b>Playing time:</b> '+o.minutes+'<br><b>Club estimate (DEBUG):</b> potential '+o.perceivedPot.toFixed(1)+' · certainty '+o.certainty.toFixed(0)+'%<br><b>Offer score (DEBUG):</b> '+o.score.toFixed(1)+'</p><button onclick="trAccept('+i+')">Accept '+o.club+'</button></div>').join('')+'</div>';
  tab('contract',document.querySelector('.tabs button:nth-child(5)'));
}
async function trPrepareExpiry(){
  const current=S.seasonLabel||'2016-17',idx=LONGTERM_SEASONS.indexOf(current);
  if(idx<0||idx>=LONGTERM_SEASONS.length-1)return false;
  const next=LONGTERM_SEASONS[idx+1],fx=await ltLoadSeason(next),active=ltEnsureWorldForSeason(fx);
  S.transferPending={next,fx,active};S.transferOffers=trBuildOffers(active);trShowOffers();return true;
}
async function trAccept(i){
  if(!S?.transferOffers?.[i]||!S.transferPending)return;
  const o=S.transferOffers[i],pending=S.transferPending,oldClub=S.club;
  S.club=o.club;S.contract={club:o.club,role:o.role,minutes:o.minutes,years:o.years,wage:o.wage,expect:o.expect};
  S.contractYearsRemaining=o.years;S.contractStartSeason=pending.next;
  P.trust=ROLE[o.role]?.trust??30;
  if(!S.perceptions[o.club])S.perceptions[o.club]={pot:clamp(P.pot+rn()*6,65,98),certainty:55,observations:4};
  S.perceptions[o.club].certainty=Math.max(S.perceptions[o.club].certainty,55);
  S.transferOffers=null;S.transferPending=null;
  // Complete the already-prepared season transition without archiving again.
  ltCarryInterest(pending.active);P.age+=1;S.seasonLabel=pending.next;S.fx=pending.fx.filter(f=>f.home===S.club||f.away===S.club);
  if(S.fx.length!==34){alert('Transfer error: '+S.club+' has '+S.fx.length+' fixtures in '+pending.next);return;}
  S.match=0;S.hist=[];ltResetTeam();ltSeasonMarkers();
  $('latest').innerHTML='<b>'+pending.next+' started</b><br>'+P.name+' · '+oldClub+' → '+S.club+' · '+o.role+' · '+o.years+'-year contract';render();
}

// Contract-aware season transition. One contract year is consumed only after a completed season.
const _trLtNextSeason=ltNextSeason;
ltNextSeason=async function(){
  if(!S)return false;
  if(S.transferOffers){trShowOffers();return false;}
  if(S.match<S.fx.length){alert('Finish the current season first.');return false;}
  const current=S.seasonLabel||'2016-17',idx=LONGTERM_SEASONS.indexOf(current);
  if(idx<0||idx>=LONGTERM_SEASONS.length-1)return _trLtNextSeason();
  ltArchiveSeason();
  if(S.contractYearsRemaining==null)S.contractYearsRemaining=S.contract?.years||3;
  S.contractYearsRemaining=Math.max(0,S.contractYearsRemaining-1);
  if(S.contractYearsRemaining===0){await trPrepareExpiry();render();return false;}
  return _trLtNextSeason();
};

const _trRender=render;
render=function(){
  _trRender();if(!S)return;
  if(S.transferOffers){trShowOffers();return;}
  const ct=$('contractTab');if(ct){const years=S.contractYearsRemaining??S.contract?.years??'—';ct.innerHTML+='<div class="offer"><b>Contract status</b><br>Years remaining: '+years+'<br><span class="muted">At expiry, renewal and transfer offers are generated from club-specific scouting knowledge and current career status.</span></div>';}
};