export const metricDefinitions = {
    fairnessScore: "A 0-100 summary of how balanced outcomes are across protected groups.",
    demographicParity: "Demographic parity compares approval or selection rates across groups.",
    disparateImpact: "Disparate impact is the lowest group selection rate divided by the highest group selection rate.",
    confidence: "Confidence reflects dataset size, group balance, and whether the results are reliable enough to interpret.",
    selectionRate: "Selection rate is the share of rows in a group with a positive outcome or prediction.",
    adjustmentCap: "The cap limits how many eligible rows FairLens can adjust in each affected group.",
    targetIntensity: "Target intensity controls how far the simulation moves toward balanced group outcomes.",
} as const;
