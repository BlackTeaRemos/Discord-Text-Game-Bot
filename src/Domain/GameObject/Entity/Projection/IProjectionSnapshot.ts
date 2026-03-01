import type { IProjectedParameter } from './IProjectedParameter.js';

/**
 * @brief Turn scoped snapshot of an organization projection capturing belief state at a specific turn
 */
export interface IProjectionSnapshot {
    /** Unique snapshot identifier @example 'psnap_abc123' */
    uid: string;

    /** UID of the parent IObjectProjection @example 'proj_abc123' */
    projectionUid: string;

    /** Game turn number at capture time @example 5 */
    turn: number;

    /** ISO timestamp of snapshot creation @example '2026-02-19T12:00:00.000Z' */
    capturedAt: string;

    /** Complete projected parameter state at the time of capture */
    parameters: IProjectedParameter[];
}
