// v0.11.9 — pre-contract player test setup.
// Test attributes are edited BEFORE generateOffers(), so initial club offers/roles are generated from them.

function v119Num(id,fallback){const e=document.getElementById(id),v=e?Number(e.value):NaN;return Number.isFinite(v)?v:fallback;}
function v119SetupDefaults(){
  const age=Number($('age')?.value||16),base={16:55,17:58,18:61,19:64,20:66}[age]||55;
  const pr=$('profile')?.value||'balanced';let t=base,ph=base,m=base;
  if(pr==='technical'){t+=5;ph-=2;m+=2}if(pr==='physical'){ph+=5;t-=1}if(pr==='mental'){m+=5;ph-=1}
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=Math.round(v)};
  set('preT',t);set('prePh',ph);set('preM',m);set('prePot',Math.max(76,base+27));set('preProf',70);set('preForm',50);set('preTrust',25);set('preConf',50);set('preRep',age<=17?4:7);set('preAtt',age<=17?3:5);
  v119Preview();
}
function v119Preview(){const t=v119Num('preT',55),ph=v119Num('prePh',55),m=v119Num('preM',55),a=t*.42+ph*.25+m*.33,e=document.getElementById('preAbility');if(e)e.textContent=a.toFixed(1);}
function v119InstallSetup(){
  const setup=$('setup');if(!setup||document.getElementById('prePlayerTest'))return;
  const btn=setup.querySelector('button[onclick="generateOffers()"]');if(!btn)return;
  const d=document.createElement('div');d.id='prePlayerTest';d.className='offer';
  d.innerHTML='<div class="headline">Player attributes · DEBUG</div><p class="muted">Set the player before generating offers. Clubs will use these values when deciding whether to offer a contract and which role to propose.</p><div class="grid">'+
  [['Technical','preT',55],['Physical','prePh',55],['Mental','preM',55],['Potential','prePot',82],['Professionalism','preProf',70],['Form','preForm',50],['Trust baseline','preTrust',25],['Confidence','preConf',50],['Reputation','preRep',4],['Attention','preAtt',3]].map(x=>'<div><label>'+x[0]+'</label><input type="number" id="'+x[1]+'" value="'+x[2]+'" oninput="v119Preview()"></div>').join('')+'</div><p><b>Calculated ability:</b> <span id="preAbility">55.0</span></p><button type="button" class="secondary" onclick="v119SetupDefaults()">Reset from age/profile</button>';
  setup.insertBefore(d,btn);
  $('age')?.addEventListener('change',v119SetupDefaults);$('profile')?.addEventListener('change',v119SetupDefaults);v119SetupDefaults();
}

// Replace initial offer generation only. Long-term transfer offers remain handled by transfer-v011.
generateOffers=function(){
  const age=+$('age').value;
  P={name:$('name').value||'Player',age,pos:$('pos').value,
    t:clamp(v119Num('preT',55),1,99),ph:clamp(v119Num('prePh',55),1,99),m:clamp(v119Num('preM',55),1,99),
    pot:clamp(v119Num('prePot',82),1,99),professionalism:clamp(v119Num('preProf',70),1,100),prof:clamp(v119Num('preProf',70),1,100),
    form:clamp(v119Num('preForm',50),0,100),trust:clamp(v119Num('preTrust',25),0,100),confidence:clamp(v119Num('preConf',50),0,100),conf:clamp(v119Num('preConf',50),0,100),
    rep:clamp(v119Num('preRep',age<=17?4:7),0,100),att:clamp(v119Num('preAtt',age<=17?3:5),0,100),fit:100};
  P.pot=Math.max(P.pot,ability());
  const a=ability();
  let pool=Object.entries(CLUBS).map(([n,c])=>{
    const readiness=a-c[1],potentialFit=P.pot-c[1],visibility=P.rep*.10+P.att*.08;
    return {n,c,score:38-Math.abs(readiness)*.78+c[3]*.24+Math.max(0,potentialFit)*.72+visibility+rn()*8};
  }).sort((a,b)=>b.score-a.score).slice(0,12);
  OFFERS=[];
  while(OFFERS.length<4&&pool.length){
    const z=pool.splice(Math.floor(Math.random()*Math.min(pool.length,7)),1)[0],gap=a-z.c[1];
    let role=gap>=-2?'First-team player':gap>=-6?'Squad player':gap>=-13?'Rotation prospect':'Development prospect';
    // Very high perceived upside can improve a youth offer by one tier, but not directly to first-team status.
    if(P.age<=18&&P.pot-z.c[1]>=15&&role==='Development prospect')role='Rotation prospect';
    const minutes=role==='First-team player'?'Expected to compete for regular starts':role==='Squad player'?'Compete for first-team minutes':role==='Rotation prospect'?'Bench and cameo opportunities with a path to more':'Youth development; first-team chances must be earned';
    const years=1+Math.floor(Math.random()*5),wage=350+z.c[2]*13+Math.max(0,a-55)*22+Math.random()*350;
    OFFERS.push({club:z.n,role,minutes,years,wage,expect:role==='First-team player'?'Establish yourself in the first team':role==='Squad player'?'Challenge established players':role==='Rotation prospect'?'Impress when opportunities arrive':'Develop toward senior football'});
  }
  $('setup').classList.add('hidden');$('offers').classList.remove('hidden');
  $('offers').innerHTML='<div class="headline">Your offers</div><p class="muted">DEBUG: these offers were generated from the attributes you set. Ability '+a.toFixed(1)+' · potential '+P.pot.toFixed(1)+' · professionalism '+P.professionalism.toFixed(0)+'.</p>'+OFFERS.map((o,i)=>'<div class="offer"><h3>'+o.club+'</h3><span class="tag">Bundesliga</span><span class="tag">'+o.role+'</span><span class="tag">'+o.years+' year'+(o.years===1?'':'s')+'</span><span class="tag">'+money(o.wage)+'</span><p><b>Expectation:</b> '+o.expect+'<br><b>Playing time:</b> '+o.minutes+'</p><button onclick="sign('+i+')">Sign with '+o.club+'</button></div>').join('');
};

// Remove the in-career editor from v0.11.8; setup belongs at creation stage for controlled tests.
const _v119Render=render;
render=function(){_v119Render();const d=document.getElementById('v118Setup');if(d)d.remove();};

// The base setup appears asynchronously after historical fixtures load; install immediately and once after load.
v119InstallSetup();setTimeout(v119InstallSetup,600);setTimeout(v119InstallSetup,1600);
