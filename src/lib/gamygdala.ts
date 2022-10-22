// This is a port of and is based on: https://github.com/broekens/gamygdala/blob/master/js/Gamygdala.js

import { Agent } from "./agent";
import { Belief } from "./belief";
import { Emotion } from "./emotion";
import { Goal } from "./goal";
import { Relation } from "./relation";

// TODO: We should be able to externally decide on how much time passes per tick!

export class Gamygdala
{
    // TODO: This should be a Map<string, Agent>
    agents: Map<string, Agent> = new Map();
    goals: Map<string, Goal> = new Map();
    // Use applyDecay() instead!
    private decayFunction: DecayFn = exponentialDecayFunction; // TODO: Figure out what this is
    decayFactor: number = 0.8;
    lastMillis = Date.now();
    millisPassed: number = 0.0;
    debug = false;

    /**
    * This is the main appraisal engine class taking care of interpreting a situation emotionally.
    * Typically you create one instance of this class and then register all agents (emotional entities) to it,
    * as well as all goals.
    *
    * @class TUDelft.Gamygdala
    * @constructor 
    */
    public constructor() { }

    /**
    * A facilitator method that creates a new Agent and registers it for you
    *
    * @method TUDelft.Gamygdala.createAgent
    * @param {String} agentName The agent with agentName is created
    * @return {TUDelft.Gamygdala.Agent} An agent reference to the newly created agent
    */
    public createAgent(agentName: string): Agent
    {
        const agent = new Agent(agentName);
        this.registerAgent(agent);
        return agent;
    }


    /**
    * A facilitator method to create a goal for a particular agent, that also registers the goal to the agent and gamygdala.
    * This method is thus handy if you want to keep all gamygdala logic internal to Gamygdala.
    * However, if you want to do more sophisticated stuff (e.g., goals for multiple agents, keep track of your own list of goals to also remove them, appraise events per agent without the need for gamygdala to keep track of goals, etc...) this method will probably be doing too much.
    * @method TUDelft.Gamygdala.createGoalForAgent
    * @param {String} agentName The agent's name to which the newly created goal has to be added.
    * @param {String} goalName The goal's name.
    * @param {double} goalUtility The goal's utility.
    * @param {boolean} isMaintenanceGoal Defines if the goal is a maintenance goal or not [optional]. The default is that the goal is an achievement goal, i.e., a goal that once it's likelihood reaches true (1) or false (-1) stays that way.
    * @return {TUDelft.Gamygdala.Goal} - a goal reference to the newly created goal.
    */
    public createGoalForAgent(agentName: string, goalName: string, goalUtility: number, isMaintenanceGoal?: boolean): Goal | null | undefined
    {
        let tempAgent = this.getAgentByName(agentName);
        if (tempAgent == null)
            throw new Error(`Agent with name '${agentName}' does not exist, so I cannot create a goal for it.`);

        let tempGoal = this.getGoalByName(goalName);

        if (tempGoal == null)
        {
            tempGoal = new Goal(goalName, goalUtility);
            this.registerGoal(tempGoal);
        }

        tempAgent.addGoal(tempGoal);

        if (isMaintenanceGoal != null)
            tempGoal.isMaintenanceGoal = isMaintenanceGoal;

        return tempGoal;
    }


    /**
    * A facilitator method to create a relation between two agents. Both source and target have to exist and be registered with this Gamygdala instance.
    * This method is thus handy if you want to keep all gamygdala logic internal to Gamygdala.
    * @method TUDelft.Gamygdala.createRelation
    * @param {String} sourceName The agent who has the relation (the source)
    * @param {String} targetName The agent who is the target of the relation (the target)
    * @param {double} relation The relation (between -1 and 1).
    */
    public createRelation(sourceName: string, targetName: string, relation: number): void
    {
        const source = this.getAgentByName(sourceName);
        const target = this.getAgentByName(targetName);

        if (source && target && relation >= -1 && relation <= 1)
            source.updateRelation(targetName, relation);
        else // TODO: This should not be printed, but properly thrown
            console.log('Error: cannot relate ' + source + '  to ' + target + ' with intensity ' + relation);
    }


    /**
    * A facilitator method to appraise an event. It takes in the same as what the new Belief(...) takes in, creates a belief and appraises it for all agents that are registered.
    * This method is thus handy if you want to keep all gamygdala logic internal to Gamygdala.
    * @method TUDelft.Gamygdala.appraiseBelief
    * @param {double} likelihood The likelihood of this belief to be true.
    * @param {String} causalAgentName The agent's name of the causal agent of this belief.
    * @param {String[]} affectedGoalNames An array of affected goals' names.
    * @param {double[]} goalCongruences An array of the affected goals' congruences (i.e., the extend to which this event is good or bad for a goal [-1,1]).
    * @param {boolean} [isIncremental] Incremental evidence enforces gamygdala to see this event as incremental evidence for (or against) the list of goals provided, i.e, it will add or subtract this belief's likelihood*congruence from the goal likelihood instead of using the belief as "state" defining the absolute likelihood
    */
    public appraiseBelief(likelihood: number, causalAgentName: string, affectedGoalNames: string[], goalCongruences: number[], isIncremental?: boolean): void
    {
        this.appraise(new Belief(likelihood, causalAgentName, affectedGoalNames, goalCongruences, isIncremental));
    }

    /**
    * Facilitator method to print all emotional states to the console.	
    * @method TUDelft.Gamygdala.printAllEmotions
    * @param {boolean} gain Whether you want to print the gained (true) emotional states or non-gained (false).
    */
    public printAllEmotions(gain: boolean): void
    {
        for (const [agentName, agent] of this.agents)
        {
            agent.printEmotionalState(gain);
            agent.printRelations();
        }
    }

    /**
    * Facilitator to set the gain for the whole set of agents known to TUDelft.Gamygdala.
    * For more realistic, complex games, you would typically set the gain for each agent type separately, to finetune the intensity of the response.
    * @method TUDelft.Gamygdala.setGain
    * @param {double} gain The gain value [0 and 20].
    */
    public setGain(gain: number)
    {
        for (const [agentName, agent] of this.agents)
            agent.setGain(gain);
    }


    /**
    * Sets the decay factor and function for emotional decay.
    * It sets the decay factor and type for emotional decay, so that an emotion will slowly get lower in intensity.
    * Whenever decayAll is called, all emotions for all agents are decayed according to the factor and function set here.
    * @method TUDelft.Gamygdala.setDecay
    * @param {double} decayFactor The decayfactor used. A factor of 1 means no decay, a factor 
    * @param {function} decayFunction The decay function tobe used. choose between linearDecay or exponentialDecay (see the corresponding methods)
    */
    public setDecay(decayFactor: number, decayFunction: DecayFn)
    {
        this.decayFunction = decayFunction;
        this.decayFactor = decayFactor;
    }

    /**
    * This starts the actual gamygdala decay process. It simply calls decayAll() at the specified interval.
    * The timeMS only defines the interval at which to decay, not the rate over time, that is defined by the decayFactor and function.
    * For more complex games (e.g., games where agents are not active when far away from the player, or games that do not need all agents to decay all the time) you should yourself choose when to decay agents individually.
    * To do so you can simply call the agent.decay() method (see the agent class).
    * @param {int} timeMS The "framerate" of the decay in milliseconds. 
    */
    public startDecay(timeMS: number)
    {
        setInterval(() => this.decayAll(), timeMS);
    }


    ////////////////////////////////////////////////////////
    // Below this is more detailed gamygdala stuff to use it more flexibly.
    ////////////////////////////////////////////////////////

    /**
    * For every entity in your game (usually NPC's, but can be the player character too) you have to first create an Agent object and then register it using this method.
    * Registering the agent makes sure that Gamygdala will be able to emotionally interpret incoming Beliefs about the game state for that agent.
    * @method TUDelft.Gamygdala.registerAgent
    * @param {TUDelft.Gamygdala.Agent} agent The agent to be registered
    */
    public registerAgent(agent: Agent): void
    {
        this.agents.set(agent.name, agent);
        agent.gamygdalaInstance = this;
    }


    /**
    * Simple agent getter by name.
    * @method TUDelft.Gamygdala.getAgentByName
    * @param {String} agentName The name of the agent to be found.
    * @return {TUDelft.Gamygdala.Agent} null or an agent reference that has the name property equal to the agentName argument
    */
    public getAgentByName(agentName: string): Agent | undefined
    {
        // TODO: Rewrite such that this.agents is a Map<string, Agent>
        return this.agents.get(agentName);
    }


    /**
    * For every goal that NPC's or player characters can have you have to first create a Goal object and then register it using this method.
    * Registering the goals makes sure that Gamygdala will be able to find the correct goal references when a Beliefs about the game state comes in.
    * @method TUDelft.Gamygdala.registerGoal
    * @param {TUDelft.Gamygdala.Goal} goal The goal to be registered.
    */
    public registerGoal(goal: Goal): void
    {
        if (this.goals.has(goal.name))
            throw new Error("Failed adding a second goal with the same name: " + goal.name);

        this.goals.set(goal.name, goal);
    }


    /**
    * Simple goal getter by name.
    * @method TUDelft.Gamygdala.getGoalByName
    * @param {String} goalName The name of the goal to be found.
    * @return {TUDelft.Gamygdala.Goal} null or a goal reference that has the name property equal to the goalName argument
    */
    public getGoalByName(goalName: string): Goal | undefined
    {
        // TODO: Rewrite such that this.goals is a Map<string, Goal>
        return this.goals.get(goalName);
    }


    /**
    * This method is the main emotional interpretation logic entry point. It performs the complete appraisal of a single event (belief) for all agents (affectedAgent=null) or for only one agent (affectedAgent=true)
    * if affectedAgent is set, then the complete appraisal logic is executed including the effect on relations (possibly influencing the emotional state of other agents),
    * but only if the affected agent (the one owning the goal) == affectedAgent
    * this is sometimes needed for efficiency, if you as a game developer know that particular agents can never appraise an event, then you can force Gamygdala to only look at a subset of agents.
    * Gamygdala assumes that the affectedAgent is indeed the only goal owner affected, that the belief is well-formed, and will not perform any checks, nor use Gamygdala's list of known goals to find other agents that share this goal (!!!)
    * @method TUDelft.Gamygdala.appraise 
    * @param {TUDelft.Gamygdala.Belief} belief The current event, in the form of a Belief object, to be appraised
    * @param {TUDelft.Gamygdala.Agent} [affectedAgent] The reference to the agent who needs to appraise the event. If given, this is the appraisal perspective (see explanation above).
    */
    public appraise(belief: Belief, affectedAgent?: Agent)
    {
        if (affectedAgent == null)
        {
            //check all
            if (this.debug)
                console.log(belief);

            if (belief.goalCongruences.length != belief.affectedGoalNames.length)
            {
                console.log("Error: the congruence list was not of the same length as the affected goal list");
                return false; // The congruence list must be of the same length as the affected goals list.   
            }

            if (this.goals.size == 0)
            {
                console.log("Warning: no goals registered to Gamygdala, all goals to be considered in appraisal need to be registered.");
                return false; // No goals registered to GAMYGDALA.   
            }


            for (var i = 0; i < belief.affectedGoalNames.length; i++)
            {
                //Loop through every goal in the list of affected goals by this event.
                var currentGoal = this.getGoalByName(belief.affectedGoalNames[i]);

                if (currentGoal != null)
                {
                    //the goal exists, appraise it
                    var utility = currentGoal.utility;
                    var deltaLikelihood = this.calculateDeltaLikelihood(currentGoal, belief.goalCongruences[i], belief.likelihood, belief.isIncremental);
                    //var desirability = belief.goalCongruences[i] * utility;
                    var desirability = deltaLikelihood * utility;
                    if (this.debug)
                        console.log('Evaluated goal: ' + currentGoal.name + '(' + utility + ', ' + deltaLikelihood + ')');

                    //now find the owners, and update their emotional states

                    for (const [ownerAgentName, ownerAgent] of this.agents)
                    {
                        if (!ownerAgent.hasGoal(currentGoal.name))
                            continue;

                        if (this.debug)
                            console.log('....owned by ' + ownerAgent.name);

                        this.evaluateInternalEmotion(utility, deltaLikelihood, currentGoal.likelihood, ownerAgent);
                        this.agentActions(ownerAgent.name, belief.causalAgentName, ownerAgent.name, desirability, utility, deltaLikelihood);

                        // Now check if anyone has a relation to this goal owner, and update the social emotions accordingly.
                        for (const [targetAgentName, targetAgent] of this.agents)
                        {
                            var relation = targetAgent.getRelation(ownerAgent.name);
                            if (relation != null)
                            {
                                if (this.debug)
                                {
                                    console.log(targetAgent.name + ' has a relationship with ' + ownerAgent.name);
                                    console.log(relation);
                                }

                                // The agent has relationship with the goal owner which has nonzero utility, add relational effects to the relations for agent[k]. 
                                this.evaluateSocialEmotion(utility, desirability, deltaLikelihood, relation, targetAgent);
                                // Also add remorse and gratification if conditions are met within (i.e., agent[k] did something bad/good for owner)
                                this.agentActions(ownerAgent.name, belief.causalAgentName, targetAgent.name, desirability, utility, deltaLikelihood);
                            } else
                            {
                                if (this.debug)
                                    console.log(targetAgent.name + ' has NO relationship with ' + ownerAgent.name);
                            }
                        }

                    }
                }
            }
        } else
        {
            // Check only affectedAgent (which can be much faster) and does not involve console output nor checks
            for (var i = 0; i < belief.affectedGoalNames.length; i++)
            {
                //Loop through every goal in the list of affected goals by this event.
                var currentGoal = affectedAgent.getGoalByName(belief.affectedGoalNames[i]);
                if (currentGoal == null)
                    throw new Error(`Could not find a currentGoal of name '${belief.affectedGoalNames[i]}'`);
                var utility = currentGoal.utility;
                var deltaLikelihood = this.calculateDeltaLikelihood(currentGoal, belief.goalCongruences[i], belief.likelihood, belief.isIncremental);
                //var desirability = belief.goalCongruences[i] * utility;
                var desirability = deltaLikelihood * utility;
                //assume affectedAgent is the only owner to be considered in this appraisal round.

                var owner = affectedAgent;

                this.evaluateInternalEmotion(utility, deltaLikelihood, currentGoal.likelihood, owner);
                this.agentActions(owner.name, belief.causalAgentName, owner.name, desirability, utility, deltaLikelihood);
                //now check if anyone has a relation to this goal owner, and update the social emotions accordingly.
                for (const [agentName, agent] of this.agents)
                {
                    var relation = agent.getRelation(owner.name);
                    if (relation != null)
                    {
                        if (this.debug)
                        {
                            console.log(agent.name + ' has a relationship with ' + owner.name);
                            console.log(relation);
                        }
                        //The agent has relationship with the goal owner which has nonzero utility, add relational effects to the relations for agent[k]. 
                        this.evaluateSocialEmotion(utility, desirability, deltaLikelihood, relation, agent);
                        //also add remorse and gratification if conditions are met within (i.e., agent[k] did something bad/good for owner)
                        this.agentActions(owner.name, belief.causalAgentName, agent.name, desirability, utility, deltaLikelihood);
                    } else
                    {
                        if (this.debug)
                            console.log(agent.name + ' has NO relationship with ' + owner.name);
                    }
                }
            }
        }

        //print the emotions to the console for debugging
        if (this.debug)
        {
            this.printAllEmotions(false);
            //this.printAllEmotions(true);
        }
    }


    /**
    * This method decays for all registered agents the emotional state and relations. It performs the decay according to the time passed, so longer intervals between consecutive calls result in bigger clunky steps.
    * Typically this is called automatically when you use startDecay(), but you can use it yourself if you want to manage the timing.
    * This function is keeping track of the millis passed since the last call, and will (try to) keep the decay close to the desired decay factor, regardless the time passed
    * So you can call this any time you want (or, e.g., have the game loop call it, or have e.g., Phaser call it in the plugin update, which is default now).
    * Further, if you want to tweak the emotional intensity decay of individual agents, you should tweak the decayFactor per agent not the "frame rate" of the decay (as this doesn't change the rate).
    * @method TUDelft.Gamygdala.decayAll
    */
    public decayAll(): void
    {
        this.millisPassed = Date.now() - this.lastMillis;
        this.lastMillis = Date.now();
        this.agents.forEach(agent => agent.decay(this));
    }


    ////////////////////////////////////////////////////////
    //Below this is internal gamygdala stuff not to be used publicly (i.e., never call these methods).
    ////////////////////////////////////////////////////////


    private calculateDeltaLikelihood(goal: Goal, congruence: number, likelihood: number, isIncremental?: boolean): number
    {
        // Defines the change in a goal's likelihood due to the congruence and likelihood of a current event.
        // We cope with two types of beliefs: incremental and absolute beliefs. Incrementals have their likelihood added to the goal, absolute define the current likelihood of the goal
        // And two types of goals: maintenance and achievement. If an achievement goal (the default) is -1 or 1, we can't change it any more (unless externally and explicitly by changing the goal.likelihood).
        var oldLikelihood = goal.likelihood;
        var newLikelihood;
        if (goal.isMaintenanceGoal == false && (oldLikelihood >= 1 || oldLikelihood <= -1))
            return 0;

        if (goal.calculateLikelyhood !== false)
        {
            // If the goal has an associated function to calculate the likelyhood that the goal is true, then use that function, 
            newLikelihood = goal.calculateLikelyhood();
        } else
        {
            // Otherwise use the event encoded updates.
            newLikelihood = isIncremental === true ?
                Math.max(Math.min(oldLikelihood + likelihood * congruence, 1), -1) :
                (congruence * likelihood + 1.0) / 2.0;
        }

        goal.likelihood = newLikelihood;

        return oldLikelihood != null ? newLikelihood - oldLikelihood : newLikelihood;

    }

    evaluateInternalEmotion(utility: number, deltaLikelihood: number, likelihood: number, agent: Agent)
    {
        //This method evaluates the event in terms of internal emotions that do not need relations to exist, such as hope, fear, etc..

        var emotions = [];

        let positive = utility >= 0 ? deltaLikelihood >= 0 : deltaLikelihood < 0;

        if (likelihood > 0 && likelihood < 1)
        {
            emotions.push(positive === true ? "hope" : "fear");
        } else if (likelihood === 1)
        {
            if (utility >= 0)
            {
                if (deltaLikelihood < 0.5)
                    emotions.push('satisfaction');
                emotions.push('joy');
            }
            else
            {
                if (deltaLikelihood < 0.5)
                    emotions.push('fear-confirmed');
                emotions.push('distress');
            }
        } else if (likelihood === 0)
        {
            if (utility >= 0)
            {
                if (deltaLikelihood > 0.5)
                    emotions.push('disappointment');
                emotions.push('distress');
            } else
            {
                if (deltaLikelihood > 0.5)
                    emotions.push('relief');
                emotions.push('joy');
            }
        }

        let intensity = Math.abs(utility * deltaLikelihood);

        if (intensity != 0)
        {
            for (const emotion of emotions)
                agent.updateEmotionalState(new Emotion(emotion, intensity));
        }
    }

    private evaluateSocialEmotion(utility: number, desirability: number, deltaLikelihood: number, relation: Relation, agent: Agent)
    {
        // This function is used to evaluate happy-for, pity, gloating or resentment.
        // Emotions that arise when we evaluate events that affect goals of others.
        // The desirability is the desirability from the goal owner's perspective.
        // The agent is the agent getting evaluated (the agent that gets the social emotion added to his emotional state).
        // The relation is a relation object between the agent being evaluated and the goal owner of the affected goal.
        var emotion = new Emotion(undefined, undefined);

        emotion.name = desirability >= 0 ?
            (relation.like >= 0 ? 'happy-for' : 'resentment') :
            (relation.like >= 0 ? 'pity' : 'gloating');

        emotion.intensity = Math.abs(utility * deltaLikelihood * relation.like);

        if (emotion.intensity != 0)
        {
            relation.addEmotion(emotion);
            agent.updateEmotionalState(emotion);  //also add relation emotion the emotion to the emotional state
        }
    }

    private agentActions(affectedName: string, causalName: string, selfName: string, desirability: number, utility: number, deltaLikelihood: number)
    {
        if (causalName == null || causalName == '')
            return;

        // If the causal agent is null or empty, then we we assume the event was not caused by an agent.
        // There are three cases here.
        // The affected agent is SELF and causal agent is other.
        // The affected agent is SELF and causal agent is SELF.
        // The affected agent is OTHER and causal agent is SELF.
        var emotion = new Emotion(undefined, undefined);
        let relation;
        if (affectedName === selfName && selfName != causalName)
        {
            //Case one 
            emotion.name = desirability >= 0 ? 'gratitude' : 'anger';
            emotion.intensity = Math.abs(utility * deltaLikelihood);
            let self = this.getAgentByName(selfName);
            if (self == null)
                throw new Error(`Could not find self agent with name ${selfName}`);

            if (self.hasRelationWith(causalName))
            {
                relation = self.getRelation(causalName);
            }
            else
            {
                self.updateRelation(causalName, 0.0);
                relation = self.getRelation(causalName);
            }

            if (relation == null)
                throw new Error(`Could not find relation with causalName ${causalName}`);

            relation.addEmotion(emotion);
            self.updateEmotionalState(emotion);  //also add relation emotion the emotion to the emotional state
        }
        if (affectedName === selfName && selfName === causalName)
        {
            // Case two
            // This case is not included in TUDelft.Gamygdala.
            // This should include pride and shame
        }
        if (affectedName != selfName && causalName === selfName)
        {
            // Case three
            if (this.getAgentByName(causalName)?.hasRelationWith(affectedName))
            {
                let relation = this.getAgentByName(causalName)?.getRelation(affectedName);

                if (relation == null)
                    throw new Error(`Could not find agent by name ${causalName} with relation to ${affectedName} in case three of agentActions`);

                if (desirability >= 0)
                {
                    if (relation.like >= 0)
                    {
                        emotion.name = 'gratification';
                        emotion.intensity = Math.abs(utility * deltaLikelihood * relation.like);
                        relation.addEmotion(emotion);
                        this.getAgentByName(causalName)?.updateEmotionalState(emotion);  //also add relation emotion the emotion to the emotional state
                    }
                }
                else
                {
                    if (relation.like >= 0)
                    {
                        emotion.name = 'remorse';
                        emotion.intensity = Math.abs(utility * deltaLikelihood * relation.like);
                        relation.addEmotion(emotion);
                        this.getAgentByName(causalName)?.updateEmotionalState(emotion); // Also add relation emotion the emotion to the emotional state
                    }

                }

            }
        }
    }

    public applyDecay(value: number): number
    {
        return this.decayFunction(value, this.decayFactor, this.millisPassed);
    }
}

export type PAD = [number, number, number];

export type DecayFn = (value: number, decayFactor: number, millisPassed: number) => number;

/** 
 * A linear decay function that will decrease the emotion intensity of an emotion every tick by a constant defined by the decayFactor in the gamygdala instance.
 * You can set Gamygdala to use this function for all emotion decay by calling setDecay() and passing this function as second parameter. This function is not to be called directly.
 * 
 * Assumes the decay of the emotional state intensity is linear with a factor equal to decayFactor per second.
 * @method TUDelft.Gamygdala.linearDecay 
 */
export const linearDecayFunction: DecayFn = (value, decayFactor, msPassed) => value - decayFactor * (msPassed / 1_000);

/** 
 * An exponential decay function that will decrease the emotion intensity of an emotion every tick by a factor defined by the decayFactor in the gamygdala instance.
 * You can set Gamygdala to use this function for all emotion decay by calling setDecay() and passing this function as second parameter. This function is not to be called directly.
 *
 * Assumes the decay of the emotional state intensity is exponential with a factor equal to decayFactor per second.
 * @method TUDelft.Gamygdala.exponentialDecay 
 */
export const exponentialDecayFunction: DecayFn = (value, decayFactor, msPassed) => value * Math.pow(decayFactor, msPassed / 1000);
