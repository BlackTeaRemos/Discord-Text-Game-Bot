import type { IProjectionSnapshot } from '../Entity/Projection/IProjectionSnapshot.js';
import type { IProjectedParameter } from '../Entity/Projection/IProjectedParameter.js';

/**
 * @brief Repository contract for persisting and querying projection snapshots capturing belief state at specific turns
 */
export interface IProjectionSnapshotRepository {
    /**
     * @brief Capture a snapshot of a projection current belief state
     * @param projectionUid string Projection identifier @example 'proj_abc123'
     * @param turn number Current game turn @example 5
     * @param parameters IProjectedParameter_array Full projected parameter state to persist
     * @returns Promise_IProjectionSnapshot Persisted snapshot record
     */
    CaptureSnapshot(
        projectionUid: string,
        turn: number,
        parameters: IProjectedParameter[],
    ): Promise<IProjectionSnapshot>;

    /**
     * @brief Capture snapshots for multiple projections in a single transaction
     * @param entries Array of projectionUid and turn and parameters triples
     * @returns Promise_void
     */
    CaptureSnapshotBatch(
        entries: Array<{
            projectionUid: string;
            turn: number;
            parameters: IProjectedParameter[];
        }>,
    ): Promise<void>;

    /**
     * @brief Retrieve the most recent snapshots for a projection ordered newest first
     * @param projectionUid string Projection identifier
     * @param limit number Maximum snapshots to return defaulting to 20
     * @returns Promise_IProjectionSnapshot_array Snapshots ordered by turn descending
     */
    GetRecentSnapshots(
        projectionUid: string,
        limit?: number,
    ): Promise<IProjectionSnapshot[]>;

    /**
     * @brief Retrieve snapshots within a turn range for a projection
     * @param projectionUid string Projection identifier
     * @param fromTurn number Start turn inclusive
     * @param toTurn number End turn inclusive
     * @returns Promise_IProjectionSnapshot_array Snapshots ordered by turn ascending
     */
    GetSnapshotsByTurnRange(
        projectionUid: string,
        fromTurn: number,
        toTurn: number,
    ): Promise<IProjectionSnapshot[]>;

    /**
     * @brief Delete all snapshots for a given projection
     * @param projectionUid string Projection identifier
     * @returns Promise_number Count of deleted snapshots
     */
    DeleteAllForProjection(projectionUid: string): Promise<number>;
}
