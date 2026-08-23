// v0.10 LONG-TERM TEST LAYER
// Additive only: does not replace protected v0.9.1 formulas or existing tabs.
// Historical Bundesliga fixture/results are loaded from OpenFootball for 2017/18-2024/25.

const LONGTERM_SEASONS=['2016-17','2017-18','2018-19','2019-20','2020-21','2021-22','2022-23','2023-24','2024-25'];
const LT_ALIAS={
 'Bayern München':'Bayern Munich','Bayern Munich':'Bayern Munich','RB Leipzig':'RB Leipzig','Borussia Dortmund':'Borussia Dortmund','1899 Hoffenheim':'Hoffenheim','TSG 1899 Hoffenheim':'Hoffenheim','Hoffenheim':'Hoffenheim','1. FC Köln':'FC Cologne','FC Köln':'FC Cologne','Hertha BSC':'Hertha Berlin','Hertha Berlin':'Hertha Berlin','SC Freiburg':'Freiburg','Freiburg':'Freiburg','Werder Bremen':'Werder Bremen','Bor. Mönchengladbach':'Borussia Monchengladbach','Borussia Mönchengladbach':'Borussia Monchengladbach','Borussia Monchengladbach':'Borussia Monchengladbach','FC Schalke 04':'Schalke 04','Schalke 04':'Schalke 04','Eintracht Frankfurt':'Eintracht Frankfurt','Bayer Leverkusen':'Bayer Leverkusen','FC Augsburg':'Augsburg','Augsburg':'Augsburg','Hamburger SV':'Hamburg','Hamburg':'Hamburg','1. FSV Mainz 05':'Mainz 05','Mainz 05':'Mainz 05','VfL Wolfsburg':'Wolfsburg','Wolfsburg':'Wolfsburg','FC Ingolstadt 04':'Ingolstadt','Ingolstadt':'Ingolstadt','SV Darmstadt 98':'Darmstadt 98','Darmstadt 98':'Darmstadt 98',
 'VfB Stuttgart':'Stuttgart','Hannover 96':'Hannover 96','Fortuna Düsseldorf':'Fortuna Dusseldorf','Fortuna Düsseldorf 1895':'Fortuna Dusseldorf','1. FC Nürnberg':'Nurnberg','Nürnberg':'Nurnberg','SC Paderborn 07':'Paderborn','Paderborn':'Paderborn','1. FC Union Berlin':'Union Berlin','Union Berlin':'Union Berlin','Arminia Bielefeld':'Arminia Bielefeld','VfL Bochum':'Bochum','Bochum':'Bochum','SpVgg Greuther Fürth':'Greuther Furth','Greuther Fürth':'Greuther Furth','Greuther Furth':'Greuther Furth','Holstein Kiel':'Holstein Kiel','1. FC Heidenheim':'Heidenheim','1. FC Heidenheim 1846':'Heidenheim','Heidenheim':'Heidenheim','FC St. Pauli':'St. Pauli','St. Pauli':'St. Pauli'
};
const LT_CLUB_DEFAULT=[72,68,65,76];
let LT_CACHE={};
function ltClub(name){
  if(!CLUBS[name])CLUBS[name]=LT_CLUB_DEFAULT.slice();
  return CLUBS[name];
}
function ltParse(t){
  let md=0,o=[];
  for(const raw of t.split(/\r?\n/)){
    const z=raw.match(/Matchday\s+(\d+)/i);if(z){md=+z[1];continue}
    const x=raw.match(/^\s*(?:\w{3}\s+\w{3}\s+\d{1,2}\s+)?(?:\d{1,2}:\d{2}\s+)?(.+?)\s{2,}v\s+(.+?)\s{2,}(\d+)-(\d+)(?:\s|$)/);
    if(x){const h=LT_ALIAS[x[1].trim()]||x[1].trim(),a=LT_ALIAS[x[2].trim()]||x[2].trim();o.push({md,home:h,away:a,hg:+x[3],ag:+x[4]});}
  }
  return o;
}
async function ltLoadSeason(season){
  if(LT_CACHE[season])return LT_CACHE[season];
  const u='https://raw.githubusercontent.com/openfootball/deutschland/master/'+season+'/1-bundesliga.txt';
  const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('Could not load '+season);
  const fx=ltParse(await r.text());if(fx.length<300)throw Error(season+' parsed only '+fx.length+' fixtures');
  LT_CACHE[season]=fx;return fx;
}
function ltResetTeam(){S.team={p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0};}
function ltArchiveSeason(){
  if(!S.seasonHistory)S.seasonHistory=[];
  const grades=S.grades.slice(S.seasonGradeStart||0);
  S.seasonHistory.push({season:S.seasonLabel,club:S.club,age:P.age,apps:S.apps-(S.seasonAppsStart||0),mins:S.mins-(S.seasonMinsStart||0),goals:S.goals-(S.seasonGoalsStart||0),assists:S.assists-(S.seasonAssistsStart||0),avg:grades.length?(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(2):'—',ability:ability().toFixed(1),teamPts:S.team.pts});
}
function ltSeasonMarkers(){S.seasonAppsStart=S.apps;S.seasonMinsStart=S.mins;S.seasonGoalsStart=S.goals;S.seasonAssistsStart=S.assists;S.seasonGradeStart=S.grades.length;}
async function ltNextSeason(){
  if(!S)return;
  if(S.match<S.fx.length){alert('Finish the current season first.');return;}
  ltArchiveSeason();
  const idx=LONGTERM_SEASONS.indexOf(S.seasonLabel||'2016-17');
  if(idx<0||idx>=LONGTERM_SEASONS.length-1){alert('Long-term historical test currently ends after 2024/25.');render();return;}
  const next=LONGTERM_SEASONS[idx+1],fx=await ltLoadSeason(next);
  P.age+=1;
  S.seasonLabel=next;
  // If current club was relegated, keep the career test moving by attaching the player to a Bundesliga club
  // with the highest existing interest. This is test scaffolding, not the final transfer/relegation system.
  let club=S.club;
  if(!fx.some(f=>f.home===club||f.away===club)){
    const candidates=[...new Set(fx.flatMap(f=>[f.home,f.away]))];
    candidates.forEach(ltClub);
    const ranked=candidates.map(n=>({n,s:S.market[n]?.score||0})).sort((a,b)=>b.s-a.s);
    club=ranked[0]?.n||candidates[Math.floor(Math.random()*candidates.length)];
    S.club=club;S.contract={...S.contract,club};P.trust=Math.max(20,P.trust*.72);
  }
  [...new Set(fx.flatMap(f=>[f.home,f.away]))].forEach(ltClub);
  S.fx=fx.filter(f=>f.home===S.club||f.away===S.club);S.match=0;S.hist=[];ltResetTeam();ltSeasonMarkers();
  // Keep scouting history, player development, reputation, attention and contract role for long-term observation.
  if(S.perceptions&&!S.perceptions[S.club])S.perceptions[S.club]={pot:clamp(P.pot+rn()*6,65,98),certainty:55,observations:4};
  $('latest').innerHTML='<b>'+next+' started</b><br>'+P.name+' is now '+P.age+' · '+S.club;
  render();
}
async function ltSimYears(){
  if(!S)return;
  for(let y=0;y<3;y++){
    while(S.match<S.fx.length)sim();
    const idx=LONGTERM_SEASONS.indexOf(S.seasonLabel||'2016-17');
    if(idx>=LONGTERM_SEASONS.length-1)break;
    await ltNextSeason();
  }
  render();
}
const _ltSign=sign;
sign=function(i){_ltSign(i);S.seasonLabel='2016-17';S.seasonHistory=[];ltSeasonMarkers();render();};
const _ltRender=render;
render=function(){
  _ltRender();if(!S)return;
  const simCard=$('latest')?.parentElement;if(simCard&&!document.getElementById('ltControls')){
    const d=document.createElement('div');d.id='ltControls';d.innerHTML='<div class="grid"><button class="secondary" onclick="ltNextSeason()">Next season</button><button class="secondary" onclick="ltSimYears()">Sim 3 seasons</button></div><div id="ltSeason" class="muted" style="margin-top:8px"></div>';simCard.appendChild(d);
  }
  if($('ltSeason'))$('ltSeason').textContent='Season '+(S.seasonLabel||'2016-17')+' · age '+P.age+' · historical Bundesliga long-term test';
  if(S.seasonHistory?.length){
    $('contractTab').innerHTML += '<div class="offer"><div class="headline">Career seasons</div><div class="scroll"><table><tr><th>Season</th><th>Club</th><th>Age</th><th>Apps</th><th>Min</th><th>G/A</th><th>Note</th><th>Ability</th><th>Pts</th></tr>'+S.seasonHistory.map(x=>'<tr><td>'+x.season+'</td><td>'+x.club+'</td><td>'+x.age+'</td><td>'+x.apps+'</td><td>'+x.mins+'</td><td>'+x.goals+'/'+x.assists+'</td><td>'+x.avg+'</td><td>'+x.ability+'</td><td>'+x.teamPts+'</td></tr>').join('')+'</table></div></div>';
  }
};