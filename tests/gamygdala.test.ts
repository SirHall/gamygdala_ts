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

test("Larger example", () =>
{
    const engine = new Gamygdala();

    engine.setDecay(0.8, linearDecayFunction);
    engine.setGain(10);

    // Setting up goals
    const jobs = ["code", "devops", "testing", "visual-design", "boss", "make-coffee"];
    const misc = ["drink", "eat", "converse"];

    const macbeth = "Macbeth";
    const antonio = "Antonio";
    const ariel = "Ariel";
    const beatrice = "Beatrice";
    const caliban = "Caliban";
    const duncan = "Duncan";
    const friarLaurence = "Friar Laurence";

    const people = [macbeth, antonio, ariel, beatrice, caliban, duncan, friarLaurence];

    people.forEach(person => engine.createAgent(person));

    // Assign jobs to everyone
    engine.createGoalForAgent(macbeth, "boss", 1.0, true);
    engine.createGoalForAgent(macbeth, "code", 0.2, true);
    engine.createGoalForAgent(antonio, "code", 0.95, true);
    engine.createGoalForAgent(ariel, "code", 0.90, true);
    engine.createGoalForAgent(beatrice, "code", 0.91, true);
    engine.createGoalForAgent(caliban, "devops", 0.8, true);
    engine.createGoalForAgent(duncan, "testing", 0.6, true);
    engine.createGoalForAgent(friarLaurence, "visual-design", 0.99, true);

    // Assign misc
    people.forEach(person => engine.createGoalForAgent(person, "drink", 0.4, true));
    people.forEach(person => engine.createGoalForAgent(person, "eat", 0.2, true));
    people.forEach((person, i) => engine.createGoalForAgent(person, "converse", (i + 1) / people.length));
    engine.createGoalForAgent(duncan, "make-coffee", 0.3);

    // Assign relations
    for (const from of people)
        for (const to of people)
            engine.createRelation(from, to, (Math.random() - 0.5) * 2.0);

    console.log(`### Initial ###\n\n${engine.printAllEmotions()}`);

    // Duncan spilled some coffee on Macbeth!
    engine.appraise(
        new Belief(0.95, duncan, ["boss", "code", "make-coffee", "converse"], [-0.1, -0.06, -1.0, -0.5]),
        engine.getAgentByName(macbeth)
    );

    console.log(`### Post Spill ###\n\n${engine.printAllEmotions()}`);
});