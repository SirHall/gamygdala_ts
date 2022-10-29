
export class Emotion
{
    /**
    * This class is mainly a data structure to store an emotion with its intensity
    * @class TUDelft.Gamygdala.Emotion
    * @constructor
    * @param {String} name The string ref of the emotion
    * @param {double} intensity The intensity at which the emotion is set upon construction.
    */
    constructor(public name: string, public intensity: number) { }
}