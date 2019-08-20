export default interface Pathway {
    pathwayId: number;
    fromStopId: number;
    toStopId: number;
    pathwayMode: number;
    isBidirectional: boolean;
    length?: number | null;
    traversalTime?: number | null;
    stairCount?: number | null;
    maxSlope?: number | null;
    minWidth?: number | null;
    signpostedAs?: string | null;
    reversedSignpostedAs?: string | null;
}

export const PathwayModeOnEdgeLabelMap = [
    "",
    "Walkway", // pathway modes begin from 1
    "Stairs",
    "MovingSidewalk",
    "Escalator",
    "Lift",
    "FareGate",
    "ExitGate"
]

export const PathwayModeColors = [
    "",
    "#000000", // pathway modes begin from 1
    "#6898ee",
    "#888888",
    "#7ecb7d",
    "#f38e1a",
    "#9772c4",
    "#f2565c"
]
