// v0.12.1 — selection continuity / established first-team status.
// Good players who earn a place should have realistic manager inertia rather than independent weekly coin flips.

function v121RecentMatches(){
  if(!S?.hist?.length)return [];
  // Robust to history storage order: matchday identifies chronology.
  return [...S.hist].sort((a,b)=>Number(b.md||0)-Number(a.md||0)).slice(0,6);
}
function v121Continuity(c){
  const recent=v121RecentMatches();
  const gap=v118EffectiveAbility()-Number(c?.[1]||70);
  if(!recent.length)return {term:0,status:'Unestablished',gap,apps:0,starts:0,good:0,bad:0};
  const apps=recent.filter(h=>Number(h.mins||0)>0).length;
  const starts=recent.filter(h=>String(h.role||'').toLowerCase().includes('start')||Number(h.mins||0)>=60).length;
  const grades=recent.filter(h=>Number(h.mins||0)>0&&Number.isFinite(Number(h.grade))).map(h=>Number(h.grade));
  const good=grades.filter(g=>g<=3.0).length,bad=grades.filter(g=>g>=4.0).length;
  const veryGood=grades.filter(g=>g<=2.0).length;
  // Establishment requires evidence, not merely raw ability.
  let status='Unestablished',term=0;
  if(gap>=-2&&apps>=3&&good>=2){status='In first-team picture';term=4;}
  if(gap>=0&&apps>=4&&good>=3){status='Established';term=8;}
  if(gap>=5&&apps>=4&&good>=3){status='Key first-team option';term=13;}
  if(starts>=3&&good>=3)term+=3;
  if(veryGood>=2)term+=2;
  // Poor evidence erodes continuity progressively; one bad game does not erase a place.
  term-=bad*3.2;
  if(recent[0]&&Number(recent[0].mins||0)===0&&status!=='Unestablished')term-=1.5;
  return {term:clamp(term,-10,18),status,gap,apps,starts,good,bad};
}

const _v121SelectionChance=selectionChance;
selectionChance=function(c,r){
  const res=_v121SelectionChance(c,r),cont=v121Continuity(c);
  res.continuity=cont.term;res.squadStatus=cont.status;res.continuityDetail=cont;
  res.raw+=cont.term;
  // Established players should be selected consistently, but never guaranteed.
  let continuityFloor=null;
  if(cont.status==='In first-team picture')continuityFloor=50;
  if(cont.status==='Established')continuityFloor=62;
  if(cont.status==='Key first-team option')continuityFloor=72;
  // Bad recent performances already lower cont.term and can lower the floor.
  if(continuityFloor!=null)continuityFloor=clamp(continuityFloor-Math.max(0,cont.bad-1)*7,42,78);
  res.continuityFloor=continuityFloor;
  const floor=Math.max(4,Number(res.commitmentFloor||0),Number(continuityFloor||0));
  res.chance=clamp(Math.max(res.raw,floor),floor,94);
  return res;
};

const _v121Render=render;
render=function(){
  _v121Render();if(!S?.lastSel||!$('ratingsTab'))return;
  const old=document.getElementById('v121Continuity');if(old)old.remove();
  const sd=S.lastSel,d=sd.continuityDetail||{};
  const box=document.createElement('div');box.className='offer';box.id='v121Continuity';
  box.innerHTML='<b>Selection continuity DEBUG</b><br>Status: '+(sd.squadStatus||'Unestablished')+' · continuity '+dh(sd.continuity||0)+(sd.continuityFloor!=null?' · floor '+Number(sd.continuityFloor).toFixed(0)+'%':'')+'<br><span class="muted">Last 6: '+Number(d.apps||0)+' apps · '+Number(d.starts||0)+' starts · '+Number(d.good||0)+' good grades · '+Number(d.bad||0)+' poor grades. Effective ability gap: '+Number(d.gap||0).toFixed(1)+'. A first-team place develops inertia but can be lost through sustained poor performance.</span>';
  $('ratingsTab').appendChild(box);
};
