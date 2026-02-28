import type { IParameterValue } from './IParameterValue.js';

/**
 * Snapshot capturing parameter state for a single object after every mutation
 */
export interface IParameterSnapshot {
    /** Unique snapshot identifier @example 'snap_abc123' */
    uid: string;

    /** UID of the owning game object instance @example 'gobj_def456' */
    objectUid: string;

    /** Game turn number at capture time @example 5 */
    turn: number;

    /** ISO timestamp of snapshot creation @example '2026-02-19T12:00:00.000Z' */
    capturedAt: string;

    /** Complete parameter state at the time of capture */
    parameters: IParameterValue[];
}
