import type { IParameterValue } from './IParameterValue.js';

/**
 * Represents a point-in-time capture of an object's parameter state.
 * Created after every parameter mutation (turn advance, manual update, etc.).
 *
 * @property uid string Unique identifier for this snapshot. @example 'snap_abc123'
 * @property objectUid string UID of the object this snapshot belongs to. @example 'gobj_def456'
 * @property turn number Game turn at which the snapshot was captured. @example 5
 * @property capturedAt string ISO timestamp of capture. @example '2026-02-19T12:00:00.000Z'
 * @property parameters IParameterValue[] Full parameter state at the time of capture.
 */
export interface IParameterSnapshot {
    /** Unique snapshot identifier. @example 'snap_abc123' */
    uid: string;

    /** UID of the owning game object instance. @example 'gobj_def456' */
    objectUid: string;

    /** Game turn number at capture time. @example 5 */
    turn: number;

    /** ISO timestamp of snapshot creation. @example '2026-02-19T12:00:00.000Z' */
    capturedAt: string;

    /** Complete parameter state at the time of capture. */
    parameters: IParameterValue[];
}
