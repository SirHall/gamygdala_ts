import { Emotion } from "./emotion";
import { Gamygdala } from "./gamygdala";

export class Relation
{

    // TODO: Should this be a Map?
    emotionList: Emotion[] = [];

    /**
    * This is the class that represents a relation one agent has with other agents.
    * It's main role is to store and manage the emotions felt for a target agent (e.g angry at, or pity for).
    * Each agent maintains a list of relations, one relation for each target agent.
    * @class TUDelft.Gamygdala.Relation
    * @constructor 
    * @param {String} agentName The agent who is the target of the relation.
    * @param {double} relation The relation [-1 and 1].
    */
    public constructor(public agentName: string, public like: number) { }

    public addEmotion(emotion: Emotion)
    {
        let added = false;
        for (const ourEmotion of this.emotionList)
        {
            if (ourEmotion.name === emotion.name)
            {
                // if (this.emotionList[i].intensity < emotion.intensity)
                //     this.emotionList[i].intensity = emotion.intensity;
                ourEmotion.intensity = (ourEmotion.intensity ?? 0) + (emotion.intensity ?? 0);
                added = true;
            }
        }

        if (added === false)
        {
            // Copy on keep, we need to maintain a list of current emotions for the relation, not a list refs to the appraisal engine
            this.emotionList.push(new Emotion(emotion.name, emotion.intensity));
        }
    };

    public decay(gamygdalaInstance: Gamygdala)
    {
        for (let i = 0; i < this.emotionList.length; i++)
        {
            let newIntensity = gamygdalaInstance.applyDecay(this.emotionList[i].intensity ?? 0);

            if (newIntensity < 0)
            {
                // This emotion has decayed below zero, we need to remove it.
                this.emotionList.splice(i, 1);
            }
            else
            {
                this.emotionList[i].intensity = newIntensity;
            }
        }
    };
}