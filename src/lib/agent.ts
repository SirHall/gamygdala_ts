import { Belief } from "./belief";
import { Emotion } from "./emotion";
import { Gamygdala, PAD } from "./gamygdala";
import { Goal } from "./goal";
import { Relation } from "./relation";

export class Agent
{
    goals: Map<string, Goal> = new Map();
    currentRelations: Map<string, Relation> = new Map();
    internalState: Emotion[] = [];
    gain: number = 1;
    gamygdalaInstance?: Gamygdala;

    mapPAD: Map<string, PAD> = new Map(
        [
            // The base set provided with Gamygdala
            ["distress", [-0.61, 0.28, -0.36]],
            ["fear", [-0.64, 0.6, -0.43]],
            ["hope", [0.51, 0.23, 0.14]],
            ["joy", [0.76, .48, 0.35]],
            ["satisfaction", [0.87, 0.2, 0.62]],
            ["fear-confirmed", [-0.61, 0.06, -0.32]], // Defeated
            ["disappointment", [-0.61, -0.15, -0.29]],
            ["relief", [0.29, -0.19, -0.28]],
            ["happy-for", [0.64, 0.35, 0.25]],
            ["resentment", [-0.35, 0.35, 0.29]],
            ["pity", [-0.52, 0.02, -0.21]], // Regretful
            ["gloating", [-0.45, 0.48, 0.42]], // Cruel
            ["gratitude", [0.64, 0.16, -0.21]], // Grateful
            ["anger", [-0.51, 0.59, 0.25]],
            ["gratification", [0.69, 0.57, 0.63]], // Triumphant
            ["remorse", [-0.57, 0.28, -0.34]], // Guilty

            // Extended from "external sources"

            // http://www.kaaj.com/psych/scales/emotion.html
            ["bored", [-.65, -.62, -.33]],
            ["curious", [.22, .62, -.01]],
            ["dignified", [.55, .22, .61]],
            ["elated", [.50, .42, .23]],
            ["inhibited", [-.54, -.04, -.41]],
            ["loved", [.87, .54, -.18]],
            ["puzzled", [-.41, .48, -.33]],
            ["sleepy", [.20, -.70, -.44]],
            ["unconcerned", [-.13, -.41, .08]],
            ["violent", [-.50, .62, .38]],
        ]
    );

    /**
    * This is the emotion agent class taking care of emotion management for one entity 
    *
    * @class TUDelft.Gamygdala.Agent
    * @constructor 
    * @param {String} name The name of the agent to be created. This name is used as ref throughout the appraisal engine.
    */
    public constructor(public name: string) { }


    /**
    * Adds a goal to this agent's goal list (so this agent becomes an owner of the goal)
    * @method TUDelft.Gamygdala.Agent.addGoal
    * @param {TUDelft.Gamygdala.Goal} goal The goal to be added.
    */
    public addGoal(goal: Goal)
    {
        // no copy, cause we need to keep the ref,
        // one goal can be shared between agents so that changes to this one goal are reflected in the emotions of all agents sharing the same goal
        this.goals.set(goal.name, goal);
    }

    /**
    * Adds a goal to this agent's goal list (so this agent becomes an owner of the goal)
    * @method TUDelft.Gamygdala.Agent.removeGoal
    * @param {String} goalName The name of the goal to be added. 
    * @return {boolean} True if the goal could be removed, false otherwise.
    */
    private removeGoal(goalName: string): boolean
    {
        return this.goals.delete(goalName);
    }

    /**
    * Checks if this agent owns a goal.
    * @method TUDelft.Gamygdala.Agent.hasGoal
    * @param {String} goalName The name of the goal to be checked.
    * @return {boolean} True if this agent owns the goal, false otherwise.
    */
    public hasGoal(goalName: string): boolean
    {
        return (this.getGoalByName(goalName) != null);
    }

    /**
    * If this agent has a goal with name goalName, this method returns that goal.
    * @method TUDelft.Gamygdala.Agent.getGoalByName
    * @param {String} goalName The name of the goal to be found.
    * @return {TUDelft.Gamygdala.Goal} the reference to the goal.
    */
    public getGoalByName(goalName: string): Goal | undefined
    {
        return this.goals.get(goalName);
    }

    /**
    * Sets the gain for this agent.
    * @method TUDelft.Gamygdala.Agent.setGain
    * @param {double} gain The gain value [0 and 20].
    */
    public setGain(gain: number): void
    {
        if (gain <= 0 || gain > 20) // TODO: Do not log to the console
            console.log('Error: gain factor for appraisal integration must be between 0 and 20');
        else
            this.gain = gain;
    }

    /**
    * A facilitating method to be able to appraise one event only from the perspective of the current agent (this).
    * Needs an instantiated gamygdala object (automatic when the agent is registered with Gamygdala.registerAgent(agent) to a Gamygdala instance).
    * @method TUDelft.Gamygdala.Agent.appraise
    * @param {TUDelft.Gamygdala.Belief} belief The belief to be appraised.
    */
    public appraise(belief: Belief): void
    {
        if (this.gamygdalaInstance == null)
            throw new Error("Cannot run Agent.apraise until the agent has been given a reference to a gamygdala instance");
        this.gamygdalaInstance.appraise(belief, this);
    }

    public updateEmotionalState(emotion: Emotion): void
    {
        for (var i = 0; i < this.internalState.length; i++)
        {
            if (this.internalState[i].name === emotion.name)
            {
                // Appraisals simply add to the old value of the emotion
                // So repeated appraisals without decay will result in the sum of the appraisals over time
                // To decay the emotional state, call .decay(decayFunction), or simply use the facilitating function in Gamygdala setDecay(timeMS).
                this.internalState[i].intensity = (this.internalState[i].intensity ?? 0) + (emotion.intensity ?? 0);
                return;
            }
        }

        // Copy on keep, we need to maintain a list of current emotions for the state, not a list references to the appraisal engine
        this.internalState.push(new Emotion(emotion.name, emotion.intensity));
    }

    /**
    * This function returns either the state as is (gain=false) or a state based on gained limiter (limited between 0 and 1), of which the gain can be set by using setGain(gain).
    * A high gain factor works well when appraisals are small and rare, and you want to see the effect of these appraisals
    * A low gain factor (close to 0 but in any case below 1) works well for high frequency and/or large appraisals, so that the effect of these is dampened.
    * @method TUDelft.Gamygdala.Agent.getEmotionalState
    * @param {boolean} useGain Whether to use the gain function or not.
    * @return {TUDelft.Gamygdala.Emotion[]} An array of emotions.
    */
    public getEmotionalState(useGain: boolean): Emotion[]
    {
        return !useGain ?
            this.internalState :
            this.internalState.map((emo, i) => new Emotion(emo.name, (this.gain * (this.internalState[i].intensity ?? 0)) / (this.gain * (this.internalState[i].intensity ?? 0) + 1)));
    }

    /**
    * This function returns a summation-based Pleasure Arousal Dominance mapping of the emotional state as is (gain=false), or a PAD mapping based on a gained limiter (limited between 0 and 1), of which the gain can be set by using setGain(gain).
    * It sums over all emotions the equivalent PAD values of each emotion (i.e., [P,A,D]=SUM(Emotion_i([P,A,D])))), which is then gained or not.
    * A high gain factor works well when appraisals are small and rare, and you want to see the effect of these appraisals.
    * A low gain factor (close to 0 but in any case below 1) works well for high frequency and/or large appraisals, so that the effect of these is dampened.
    * @method TUDelft.Gamygdala.Agent.getPADState
    * @param {boolean} useGain Whether to use the gain function or not.
    * @return {double[]} An array of doubles with Pleasure at index 0, Arousal at index [1] and Dominance at index [2].
    */
    public getPADState(useGain: boolean): PAD
    {
        let pad: PAD = [0, 0, 0];

        for (var i = 0; i < this.internalState.length; i++)
        {
            pad[0] += ((this.internalState[i].intensity ?? 0) * (this.mapPAD.get((this.internalState[i].name ?? "NULL"))?.[0] ?? 1));
            pad[1] += ((this.internalState[i].intensity ?? 0) * (this.mapPAD.get((this.internalState[i].name ?? "NULL"))?.[1] ?? 1));
            pad[2] += ((this.internalState[i].intensity ?? 0) * (this.mapPAD.get((this.internalState[i].name ?? "NULL"))?.[2] ?? 1));
        }

        if (useGain)
        {
            pad[0] = (pad[0] >= 0 ? this.gain * pad[0] / (this.gain * pad[0] + 1) : -this.gain * pad[0] / (this.gain * pad[0] - 1));
            pad[1] = (pad[1] >= 0 ? this.gain * pad[1] / (this.gain * pad[1] + 1) : -this.gain * pad[1] / (this.gain * pad[1] - 1));
            pad[2] = (pad[2] >= 0 ? this.gain * pad[2] / (this.gain * pad[2] + 1) : -this.gain * pad[2] / (this.gain * pad[2] - 1));
            return pad;
        }

        return pad;
    }

    /**
    * This function prints to the console either the state as is (gain=false) or a state based on gained limiter (limited between 0 and 1), of which the gain can be set by using setGain(gain).
    * A high gain factor works well when appraisals are small and rare, and you want to see the effect of these appraisals
    * A low gain factor (close to 0 but in any case below 1) works well for high frequency and/or large appraisals, so that the effect of these is dampened.
    * @method TUDelft.Gamygdala.Agent.printEmotionalState
    * @param {boolean} useGain Whether to use the gain function or not.
    */
    public printEmotionalState(useGain: boolean): void
    {
        let output = this.name + ' feels ';
        const emotionalState = this.getEmotionalState(useGain);

        let i;
        for (i = 0; i < emotionalState.length; i++)
            output += emotionalState[i].name + ":" + emotionalState[i].intensity + ", ";

        if (i > 0)
            console.log(output);
    };

    /**
    * Sets the relation this agent has with the agent defined by agentName. If the relation does not exist, it will be created, otherwise it will be updated.
    * @method TUDelft.Gamygdala.Agent.updateRelation
    * @param {String} targetAgentName The agent who is the target of the relation.
    * @param {double} like The relation (between -1 and 1).
    */
    public updateRelation(targetAgentName: string, like: number)
    {
        // This relation does not exist, just add it.
        if (!this.hasRelationWith(targetAgentName))
        {
            this.currentRelations.set(targetAgentName, new Relation(targetAgentName, like));
            return;
        }

        //The relation already exists, update it.
        let relation = this.getRelation(targetAgentName);
        if (relation != null)
            relation.like = like;
    }

    /**
    * Checks if this agent has a relation with the agent defined by agentName.
    * @method TUDelft.Gamygdala.Agent.hasRelationWith
    * @param {String} agentName The agent who is the target of the relation.
    * @return {boolean} True if the relation exists, otherwise false.
    */
    public hasRelationWith(agentName: string): boolean
    {
        return this.currentRelations.has(agentName);
    }

    /**
    * Returns the relation object this agent has with the agent defined by agentName.
    * @method TUDelft.Gamygdala.Agent.getRelation
    * @param {String} targetAgentName The agent who is the target of the relation.
    */
    public getRelation(targetAgentName: string): Relation | undefined
    {
        return this.currentRelations.get(targetAgentName);
    }

    /**
    * Returns the relation object this agent has with the agent defined by agentName.
    * @method TUDelft.Gamygdala.Agent.printRelations
    * @param {String} [agentName] The agent who is the target of the relation will only be printed, or when omitted all relations are printed.
    */
    public printRelations(agentName?: string): void
    {
        var output = this.name + ' has the following sentiments:\n   ';
        var i;

        let opinionsText = Array.from(this.currentRelations.entries())
            .filter(([targetName]) => agentName == null ? true : targetName === agentName)
            .map(([targetName, relation]) =>
                `${relation.emotionList.map(emotion => `${emotion.name}(${emotion.intensity}) `)} for ${targetName}`
            ).join(", and\n    ");

        if (opinionsText.length > 0) // There is atleast one character generated
            console.log(output + opinionsText);
    }

    /**
    * This method decays the emotional state and relations according to the decay factor and function defined in gamygdala. 
    * Typically this is called automatically when you use startDecay() in Gamygdala, but you can use it yourself if you want to manage the timing.
    * This function is keeping track of the millis passed since the last call, and will (try to) keep the decay close to the desired decay factor, regardless the time passed
    * So you can call this any time you want (or, e.g., have the game loop call it, or have e.g., Phaser call it in the plugin update, which is default now).
    * Further, if you want to tweak the emotional intensity decay of individual agents, you should tweak the decayFactor per agent not the "frame rate" of the decay (as this doesn't change the rate).
    * @method TUDelft.Gamygdala.decayAll
    * @param {TUDelft.Gamygdala} gamygdalaInstance A reference to the correct gamygdala instance that contains the decayFunction property to be used )(so you could use different gamygdala instances to manage different groups of  agents)
    */
    public decay(gamygdalaInstance: Gamygdala)
    {
        for (let i = 0; i < this.internalState.length; i++)
        {
            var newIntensity = gamygdalaInstance.applyDecay((this.internalState[i].intensity ?? 0));

            if (newIntensity < 0)
                this.internalState.splice(i, 1);
            else
                this.internalState[i].intensity = newIntensity;
        }

        for (const [targetName, relation] of this.currentRelations)
            relation.decay(gamygdalaInstance);
    }
}