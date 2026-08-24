// v0.12.2 — canonical G/A accounting fix.
// The base game stores player events as h.g / h.as and newest history is h[0].
// Earlier replacement layers wrote h.goals / h.assists and sometimes modified the wrong row.

function v122SumTotals(){
  let g=0,a=0;
  for(const h of S.hist||[]){g+=Number(h.g??h.goals??0)||0;a+=Number(h.as??h.assists??0)||0;}
  S.goals=g;S.assists=a;
}

const _v122Sim=sim;
sim=function(){
  if(!S)return _v122Sim();
  const preMatch=Number(S.match||0),preLen=S.hist?.length||0;
  // Preserve all already-finished rows because older wrappers can accidentally touch h[last].
  const oldRows=(S.hist||[]).map(h=>({ref:h,g:Number(h.g??0),as:Number(h.as??0),grade:h.grade,goals:h.goals,assists:h.assists}));
  const out=_v122Sim();
  if(!S.hist||S.hist.length<=preLen||Number(S.match||0)<=preMatch)return out;

  // Restore every row that existed before this match.
  for(const x of oldRows){x.ref.g=x.g;x.ref.as=x.as;x.ref.grade=x.grade;x.ref.goals=x.goals;x.ref.assists=x.assists;}

  const f=S.fx?.[preMatch];if(!f)return out;
  // Base sim unshifts the newly played match; use matchday as an additional safety check.
  let h=S.hist[0];
  if(Number(h?.md)!==Number(f.md))h=(S.hist||[]).find(x=>Number(x.md)===Number(f.md))||h;
  if(!h)return out;

  const mins=Number(h.mins||0),own=v120OwnGoals(f),ga=v120GoalsAgainst(f);
  h.ownGoals=own;h.goalsAgainst=ga;
  const baseGrade=Number(h.baseGrade??h.grade??3.5);
  const ev=mins>0?v120Events(mins,own):{goals:0,assists:0};

  // Canonical base-game fields used by the match table.
  h.g=ev.goals;h.as=ev.assists;
  // Mirror fields kept only for compatibility with newer debug layers.
  h.goals=ev.goals;h.assists=ev.assists;
  if(mins>0)h.grade=v120FinalGrade(baseGrade,ev.goals,ev.assists,ga,mins);

  // One authoritative addition: sum the actual history rows shown in the UI.
  v122SumTotals();
  if(S.delta){S.delta.goals=ev.goals;S.delta.assists=ev.assists;S.delta.grade=h.grade;}
  const played=(S.hist||[]).filter(x=>Number(x.mins||0)>0&&Number.isFinite(Number(x.grade))).map(x=>Number(x.grade));
  if(played.length)S.grades=played;
  render();return out;
};
