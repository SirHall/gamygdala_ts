# gamygdala_ts

A TypeScript port of **GAMYGDALA**, an emotion engine for games: you give agents (characters) goals and relationships,
feed it events as beliefs, and it works out what each agent feels about them, with emotions that fade over time.

Ported from the original JavaScript in October 2022 (with a few additions), dependencies refreshed in October 2024.
MIT licensed.

## Based on

- **Original implementation:** [broekens/gamygdala](https://github.com/broekens/gamygdala) (JavaScript, by Joost
  Broekens, TU Delft). This port follows `js/Gamygdala.js` there; the doc comments still use the original's
  `TUDelft.Gamygdala.*` names.
- **Research:** Alexandru Popescu, Joost Broekens and Maarten van Someren, "GAMYGDALA: An Emotion Engine for Games",
  *IEEE Transactions on Affective Computing* 5(1), 32–44, 2014 (doi:10.1109/T-AFFC.2013.24).
- **The models behind it:** the OCC appraisal model of emotion (Andrew Ortony, Gerald Clore and Allan Collins, *The
  Cognitive Structure of Emotions*, Cambridge University Press, 1988), which decides which emotion an event causes from
  the agent's goals and relations; and the PAD (Pleasure–Arousal–Dominance) model (Albert Mehrabian), into which the
  emotions are summed to give one overall mood per agent.

## How it works

- **Agents** are the emotional entities (characters). Each has goals, relations to other agents, and an emotional
  state.
- **Goals** have a utility (how much the agent wants them, from -1 to 1) and a likelihood of coming true. A goal is an
  achievement goal (once it is true or false it stays so) or a maintenance goal.
- **Relations** say how much one agent likes another (-1 to 1); they decide how an agent feels about what happens to
  others.
- **Beliefs** are the events you appraise: how likely the event is, which agent caused it, which goals it affects and how
  good or bad it is for each (congruence, -1 to 1). Evidence can be absolute or incremental.
- **Appraisal** turns each belief into emotions:
  - for the agent's own goals: hope, fear, joy, distress, satisfaction, fear-confirmed, disappointment, relief;
  - about the agent who caused it: gratitude, anger, gratification, remorse;
  - about other agents' fortunes, through relations: happy-for, resentment, pity, gloating.
- **Decay** fades emotions over time (linear or exponential, with a decay factor); **gain** scales the intensities
  reported.
- Each agent's emotions can be read as a list or summed into a single **PAD** value.

## Use

```ts
import { Belief, Gamygdala, linearDecayFunction } from "gamygdala_ts";

const engine = new Gamygdala();
engine.setDecay(0.8, linearDecayFunction);
engine.setGain(10);

engine.createAgent("Bob");
engine.createAgent("Sam");
engine.createRelation("Bob", "Sam", 0.2);   // Bob likes Sam a little
engine.createGoalForAgent("Bob", "survive", 1);
engine.createGoalForAgent("Sam", "survive", 1);

// Sam did something that makes Bob surviving a bit less likely
engine.appraise(new Belief(0.1, "Sam", ["survive"], [-0.2], true));
engine.applyDecay(1);                        // advance time

const bob = engine.getAgentByName("Bob")!;
console.log(bob.getEmotionalState(true));    // emotions with gain applied
console.log(bob.getPADState(true));          // overall pleasure/arousal/dominance
```

## Layout

| Path | What |
|---|---|
| `src/lib/gamygdala.ts` | the engine: agents, goals, relations, appraisal, decay, gain |
| `src/lib/agent.ts` | an agent's goals, relations and emotional state (and its PAD value) |
| `src/lib/belief.ts`, `goal.ts`, `relation.ts`, `emotion.ts` | the data types |
| `src/mod.ts` | the package's exports |
| `tests/gamygdala.test.ts` | example runs (two agents; a larger office scenario) |

## Build and test

```sh
npm install
npm run build   # tsc -> dist/
npm test        # jest
```

One dependency: [mnemonist](https://github.com/Yomguithereal/mnemonist) (a max-heap for sorting emotions).
