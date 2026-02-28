import type { IParameterSnapshot } from '../Entity/IParameterSnapshot.js';
import type { IParameterValue } from '../Entity/IParameterValue.js';

/**
 * @brief Repository contract for persisting and querying parameter snapshots capturing full state at specific moments
 */
export interface IParameterSnapshotRepository {
    /**
     * @brief Capture a snapshot of an objects current parameter state
     * @param objectUid string Object identifier @example 'gobj_abc123'
     * @param turn number Current game turn @example 5
     * @param parameters IParameterValue_array Full parameter state to persist
     * @returns Promise_IParameterSnapshot Persisted snapshot record
     */
    CaptureSnapshot(
        objectUid: string,
        turn: number,
        parameters: IParameterValue[],
    ): Promise<IParameterSnapshot>;

    /**
     * @brief Capture snapshots for multiple objects in a single transaction
     * @param entries Array of objectUid and turn and parameters triples
     * @returns Promise_void
     */
    CaptureSnapshotBatch(
        entries: Array<{ objectUid: string; turn: number; parameters: IParameterValue[] }>,
    ): Promise<void>;

    /**
     * @brief Retrieve the most recent snapshots for an object ordered newest first
     * @param objectUid string Object identifier @example 'gobj_abc123'
     * @param limit number Maximum snapshots to return defaulting to 20 @example 20
     * @returns Promise_IParameterSnapshot_array Snapshots ordered by turn descending
     */
    GetRecentSnapshots(objectUid: string, limit?: number): Promise<IParameterSnapshot[]>;

    /**
     * @brief Retrieve snapshots within a turn range for an object
     * @param objectUid string Object identifier
     * @param fromTurn number Start turn inclusive
     * @param toTurn number End turn inclusive
     * @returns Promise_IParameterSnapshot_array Snapshots ordered by turn ascending
     */
    GetSnapshotsByTurnRange(
        objectUid: string,
        fromTurn: number,
        toTurn: number,
    ): Promise<IParameterSnapshot[]>;

    /**
     * @brief Delete all snapshots for a given object used on object deletion
     * @param objectUid string Object identifier
     * @returns Promise_number Count of deleted snapshots
     */
    DeleteAllForObject(objectUid: string): Promise<number>;
}
