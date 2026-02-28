import type { IParameterSnapshot } from './IParameterSnapshot.js';
import type { IParameterValue } from './IParameterValue.js';

/**
 * Repository contract for persisting and querying parameter snapshots.
 * Each snapshot captures a full parameter state at a specific moment.
 */
export interface IParameterSnapshotRepository {
    /**
     * Capture a snapshot of an object's current parameter state.
     * @param objectUid string Object identifier. @example 'gobj_abc123'
     * @param turn number Current game turn. @example 5
     * @param parameters IParameterValue[] Full parameter state to persist.
     * @returns Promise<IParameterSnapshot> Persisted snapshot record.
     */
    CaptureSnapshot(
        objectUid: string,
        turn: number,
        parameters: IParameterValue[],
    ): Promise<IParameterSnapshot>;

    /**
     * Capture snapshots for multiple objects in a single transaction.
     * @param entries Array of object-uid + turn + parameters triples.
     * @returns Promise<void>
     */
    CaptureSnapshotBatch(
        entries: Array<{ objectUid: string; turn: number; parameters: IParameterValue[] }>,
    ): Promise<void>;

    /**
     * Retrieve the most recent snapshots for an object, ordered newest-first.
     * @param objectUid string Object identifier. @example 'gobj_abc123'
     * @param limit number Maximum snapshots to return, default 20. @example 20
     * @returns Promise<IParameterSnapshot[]> Snapshots ordered by turn descending.
     */
    GetRecentSnapshots(objectUid: string, limit?: number): Promise<IParameterSnapshot[]>;

    /**
     * Retrieve snapshots within a turn range for an object.
     * @param objectUid string Object identifier.
     * @param fromTurn number Start turn (inclusive).
     * @param toTurn number End turn (inclusive).
     * @returns Promise<IParameterSnapshot[]> Snapshots ordered by turn ascending.
     */
    GetSnapshotsByTurnRange(
        objectUid: string,
        fromTurn: number,
        toTurn: number,
    ): Promise<IParameterSnapshot[]>;

    /**
     * Delete all snapshots for a given object. Used on object deletion.
     * @param objectUid string Object identifier.
     * @returns Promise<number> Count of deleted snapshots.
     */
    DeleteAllForObject(objectUid: string): Promise<number>;
}
