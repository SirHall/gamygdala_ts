import { Agent, Belief, Gamygdala, linearDecayFunction } from "../src/mod";

test("Example execution loop", () =>
{
    const engine = new Gamygdala();

    engine.setDecay(0.8, linearDecayFunction);
    engine.setGain(10);

    const bob = "Bob";
    const sam = "Sam";

    engine.createAgent(bob);
    engine.createAgent("Sam");

    engine.createRelation(bob, sam, 0.2);
    engine.createRelation(sam, bob, 0.1);

    engine.createGoalForAgent(bob, "survive", 1);
    engine.createGoalForAgent(bob, "win", 0.7);
    engine.createGoalForAgent(sam, "survive", 1);
    engine.createGoalForAgent(sam, "win", 0.7);

    engine.applyDecay(1);
    engine.appraise(new Belief(0.1, bob, ["survive"], [-0.2], true));
    engine.applyDecay(1);
});