# Football Career Simulator — Protected Baseline

Baseline established after v0.9.1 stabilization.

## Core rule
Working functionality is protected. New features may extend existing behavior but must not remove, hide, or replace working functionality unless that change is explicitly intended and agreed.

## Protected player/career features
- Player creation with name, age, position and profile.
- Age-based starting current ability.
- Independent hidden true potential (visible only in DEBUG for now).
- 3–4 starting contract offers from clubs in the simulated 2016/17 Bundesliga.
- Offer details: club, expected role, expectation, playing-time description, salary and contract length.
- Expected-role effect on selection and performance expectations.
- Weekly training even when the player is not selected.
- Training changes form, trust, confidence, fitness and development.
- Match selection probability with visible DEBUG breakdown.
- Rotation Prospect has materially more opportunity than Development Prospect.
- Match role: not selected / substitute / starter.
- Playing minutes are not used as a manager-trust input.
- Kicker-style 1.0–6.0 grades in 0.5 steps.
- Goals and assists improve the match grade.
- Defensive/GK clean-sheet contribution to grade.
- Strong performances can increase manager trust without goals.
- Opponent context influences career impact.
- Player development continues without first-team appearances.

## Protected historical/team features
- Real 2016/17 Bundesliga fixture list and results.
- Matchday, opponent, home/away and historical result displayed for every simulated match.
- Team season statistics remain visible: played, points, W-D-L, goals, goal difference and points/game.
- Club profile remains visible in Team Stats: Development, Squad strength, Prestige / attention and Youth policy.

## Protected scouting/market features
- Only currently simulated clubs can offer/scout in this prototype.
- Each club has its own perceived potential estimate.
- Each club has its own certainty level for that estimate.
- The player's own club gains certainty faster because it observes training.
- External clubs gain information through visibility and scouting.
- True potential is never directly used as a club's known value.
- Interest can rise, stagnate or fall.
- Quiet weeks and poor performances can reduce interest.
- Interest stages: Unaware, Aware, Monitoring, Scouting, Interested, Serious interest.
- Interest DEBUG shows score, weekly delta, state, perceived potential, certainty and trigger.

## Protected UI/debug features
- Matches tab.
- Team Stats tab.
- Interest Debug tab.
- Ratings Debug tab with current values and last deltas.
- Contract tab.
- Ability DEBUG display.
- Current club perceived potential and certainty visible in Ratings Debug.

## Change procedure
Before every future gameplay update:
1. Read the current files from `main`.
2. Make the smallest isolated change possible.
3. Do not reconstruct existing functionality from memory.
4. Compare the change against this baseline.
5. If a protected item disappears or changes unintentionally, restore it before adding further features.

## Current architecture
- `index.html`: loader for the frozen v0.8.2 base game.
- Frozen v0.8.2 HTML commit: `e9a7f1e8e5d25f81a9e9695d24f4349f28d1f003`.
- `model-v09.js`: isolated calibration/scouting/selection layer plus additive UI extensions.

The next structural refactor should move data and formulas into dedicated modules only after parity with this baseline has been verified.