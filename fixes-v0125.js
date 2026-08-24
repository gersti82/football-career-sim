// v0.12.5 — breakout scouting + authoritative season statistics.
// Obvious young breakout players should attract major clubs even though elite clubs normally build interest slowly.
// Season archive statistics are calculated directly from that season's canonical match rows.

function v125SeasonStats(){
  const rows=(S?.hist||[]).filter(h=>Number(h.mins||0)>0);
  const mins=rows.reduce((n,h)=>n+(Number(h.mins)||0),0);
  const goals=rows.reduce((n,h)=>n+(Number(h.g??h.goals??0)||0),0);
  const assists=rows.reduce((n,h)=>n+(Number(h.as??h.assists??0)||0),0);
  const grades=rows.map(h=>Number(h.grade)).filter(Number.isFinite);
  return {apps:rows.length,mins,goals,assists,grades,avg:grades.length?grades.reduce((a,b)=>a+b,0)/grades.length:null};
}

// Replace the long-term archive calculation. S.grades is no longer a safe season boundary because newer
// grading layers rebuild it from current history; current-season history itself is authoritative.
ltArchiveSeason=function(){
  if(!S)return;
  if(!S.seasonHistory)S.seasonHistory=[];
  const label=S.seasonLabel||'2016-17';
  if(S.seasonHistory.some(x=>x.season===label))return;
  const st=v125SeasonStats();
  S.seasonHistory.push({
    season:label,club:S.club,age:P.age,
    apps:st.apps,mins:st.mins,goals:st.goals,assists:st.assists,
    avg:st.avg!=null?st.avg.toFixed(2):'—',ability:ability().toFixed(1),teamPts:S.team?.pts||0
  });
};

function v125BreakoutSignal(club){
  const st=v125SeasonStats();
  if(st.apps<4||st.mins<180)return {boost:0,signal:0,...st};
  const p=S.perceptions?.[club];
  if(!p)return {boost:0,signal:0,...st};
  const involvements=st.goals+st.assists;
  const perApp=involvements/Math.max(1,st.apps);
  const production=clamp(perApp*2.0,0,1.7);
  const volume=clamp((involvements-4)/14,0,1.25);
  const potential=clamp((Number(p.pot||0)-80)/10,0,1.35);
  const grade=st.avg==null?0:clamp((3.15-st.avg)*.55,0,.70);
  const age=P.age<=19?1.20:P.age<=21?1.08:.92;
  // High potential alone is not enough; the special acceleration is for players producing first-team evidence.
  const signal=(production*.80+volume*.70+potential*.90+grade*.45)*age;
  // Once the evidence is unmistakable, elite clubs no longer suffer the normal large-club discovery penalty.
  const size=clubScoutingProfile(club).size;
  const prestigeRecognition=.90+size*.10;
  const boost=clamp(Math.max(0,signal-1.15)*.68*prestigeRecognition,0,2.25);
  return {boost,signal,...st,involvements,perApp,potentialEstimate:Number(p.pot||0)};
}

function v125ApplyBreakoutInterest(){
  if(!S?.market||!S?.perceptions)return;
  Object.entries(S.market).forEach(([club,m])=>{
    if(club===S.club)return;
    const b=v125BreakoutSignal(club);
    if(b.boost<=0)return;
    const old=Number(m.score||0),score=clamp(old+b.boost,0,100);
    m.score=score;m.delta=Number(m.delta||0)+(score-old);
    m.interestLabel=v116InterestLabel(score);m.state=m.interestLabel;
    m.breakoutBoost=b.boost;m.breakoutSignal=b.signal;
  });
}

// Apply breakout recognition only after the full match/event pipeline has finalized the canonical row.
const _v125Sim=sim;
sim=function(){
  if(!S)return _v125Sim();
  const preMatch=Number(S.match||0),preLen=S.hist?.length||0;
  const out=_v125Sim();
  if(S.hist?.length>preLen&&Number(S.match||0)>preMatch){
    v125ApplyBreakoutInterest();
    render();
  }
  return out;
};

// Debug note so calibration is visible without changing the existing interest table structure.
const _v125Render=render;
render=function(){
  _v125Render();if(!S||!$('marketTab'))return;
  const old=document.getElementById('v125BreakoutDebug');if(old)old.remove();
  const st=v125SeasonStats(),best=Object.keys(S.market||{}).map(c=>({c,...v125BreakoutSignal(c)})).sort((a,b)=>b.boost-a.boost)[0];
  const d=document.createElement('div');d.className='offer';d.id='v125BreakoutDebug';
  d.innerHTML='<b>Breakout scouting DEBUG</b><br>Season: '+st.apps+' apps · '+st.goals+' goals · '+st.assists+' assists'+(st.avg!=null?' · avg '+st.avg.toFixed(2):'')+(best?' · strongest breakout boost '+best.boost.toFixed(2)+' / match':'')+'<br><span class="muted">Elite clubs still build ordinary interest slowly, but exceptional young first-team production plus a high perceived potential accelerates their interest materially.</span>';
  $('marketTab').appendChild(d);
};
