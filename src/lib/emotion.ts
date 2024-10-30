
export interface Emotion<Name extends string> 
{
    // The string ref of the emotion
    name: Name;
    // The intensity at which the emotion is set upon construction.
    intensity: number;
}