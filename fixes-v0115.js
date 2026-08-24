// v0.11.5 targeted fixes: persistent scouting + relegation contract clause.
// Additive only; no match, selection, development or visibility formulas changed.

// ----- Persistent market memory -----
// Some promoted/relegated club keys and seasonal world refreshes can leave market entries absent.
// Keep a career-long copy and merge it back instead of allowing a season transition to recreate clubs at zero.
function v115SaveMarketMemory(){
  if(!S)return;
  if(!S.marketMemory)S.marketMemory={};
  Object.entries(S.market||{}).forEach(([club,m])=>{
    const old=S.marketMemory[club];
    // Latest state wins, but never replace an established historical score with a newly-created zero entry.
    if(!old || (m.score||0)>0 || (old.score||0)<=0){S.marketMemory[club]={...m};}
  });
}
function v115RestoreMarketMemory(){
  if(!S)return;
  if(!S.market)S.market={};
  Object.entries(S.marketMemory||{}).forEach(([club,mem])=>{
    const cur=S.market[club];
    if(!cur || ((cur.score||0)===0 && (mem.score||0)>0))S.market[club]={...mem,delta:0};
  });
}

const _v115Market=market;
market=function(...args){v115RestoreMarketMemory();const out=_v115Market(...args);v115SaveMarketMemory();return out;};

// Preserve interest around world/season refreshes as well.
const _v115EnsureWorld=ltEnsureWorldForSeason;
ltEnsureWorldForSeason=function(fx){v115SaveMarketMemory();const active=_v115EnsureWorld(fx);v115RestoreMarketMemory();return active;};

// ----- Relegation clause -----
// If the current club is not in the next simulated Bundesliga season, the current contract cannot simply
// continue in this test build. Instead the player enters the transfer market, regardless of years remaining.
async function v115PrepareRelegationOffers(){
  const current=S.seasonLabel||'2016-17',idx=LONGTERM_SEASONS.indexOf(current);
  if(idx<0||idx>=LONGTERM_SEASONS.length-1)return false;
  const next=LONGTERM_SEASONS[idx+1],fx=await ltLoadSeason(next),active=ltEnsureWorldForSeason(fx);
  if(active.includes(S.club))return false;
  v115SaveMarketMemory();
  S.transferPending={next,fx,active,relegation:true,relegatedClub:S.club};
  // The relegated club cannot be selected because its league is not simulated. Generate offers from playable clubs.
  S.transferOffers=trBuildOffers(active).map(o=>({...o,renewal:false}));
  S.transferReason='relegation';
  trShowOffers();
  return true;
}

// Override only the season-transition decision. Contract expiry still behaves exactly as before.
const _v115LtNextSeason=ltNextSeason;
ltNextSeason=async function(){
  if(!S)return false;
  if(S.transferOffers){trShowOffers();return false;}
  if(S.match<S.fx.length){alert('Finish the current season first.');return false;}
  const current=S.seasonLabel||'2016-17',idx=LONGTERM_SEASONS.indexOf(current);
  if(idx>=0&&idx<LONGTERM_SEASONS.length-1){
    const next=LONGTERM_SEASONS[idx+1],fx=await ltLoadSeason(next),active=ltSeasonClubs(fx);
    if(!active.includes(S.club)){
      ltArchiveSeason();
      // Consume the completed contract year, but relegation triggers offers even if time remains.
      if(S.contractYearsRemaining==null)S.contractYearsRemaining=S.contract?.years||3;
      S.contractYearsRemaining=Math.max(0,S.contractYearsRemaining-1);
      await v115PrepareRelegationOffers();render();return false;
    }
  }
  return _v115LtNextSeason();
};

// Reword offer screen for relegation-triggered market entry.
const _v115TrShowOffers=trShowOffers;
trShowOffers=function(){
  if(!S?.transferOffers)return _v115TrShowOffers();
  if(S.transferReason!=='relegation')return _v115TrShowOffers();
  const card=$('contractTab');if(!card)return;
  const relegated=S.transferPending?.relegatedClub||S.club;
  card.innerHTML='<div class="offer"><div class="headline">Relegation — new club required</div><p><b>'+relegated+'</b> will play outside the currently simulated Bundesliga next season.</p><p class="muted">For this test version, your contract cannot continue in a non-simulated league. A relegation clause releases you to consider offers from playable clubs. Existing scouting interest and each club’s perceived potential are retained.</p>'+S.transferOffers.map((o,i)=>'<div class="offer"><h3>'+o.club+'</h3><span class="tag">'+o.role+'</span><span class="tag">'+o.years+' year'+(o.years===1?'':'s')+'</span><span class="tag">'+money(o.wage)+'</span><p><b>Expectation:</b> '+o.expect+'<br><b>Playing time:</b> '+o.minutes+'<br><b>Club estimate (DEBUG):</b> potential '+o.perceivedPot.toFixed(1)+' · certainty '+o.certainty.toFixed(0)+'%<br><b>Offer score (DEBUG):</b> '+o.score.toFixed(1)+'</p><button onclick="trAccept('+i+')">Accept '+o.club+'</button></div>').join('')+'</div>';
  tab('contract',document.querySelector('.tabs button:nth-child(5)'));
};

// Clear reason after an offer is accepted, while preserving market memory.
const _v115TrAccept=trAccept;
trAccept=async function(i){v115SaveMarketMemory();const out=await _v115TrAccept(i);if(S){S.transferReason=null;v115RestoreMarketMemory();v115SaveMarketMemory();render();}return out;};

// Initialise career memory after signing.
const _v115Sign=sign;
sign=function(i){const out=_v115Sign(i);if(S){S.marketMemory={};v115SaveMarketMemory();}return out;};
