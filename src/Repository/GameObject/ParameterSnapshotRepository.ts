import { randomUUID } from 'crypto';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { log } from '../../Common/Log.js';
import type { IParameterSnapshot } from '../../Domain/GameObject/Entity/IParameterSnapshot.js';
import type { IParameterSnapshotRepository } from '../../Domain/GameObject/Repository/IParameterSnapshotRepository.js';
import type { IParameterValue } from '../../Domain/GameObject/Entity/IParameterValue.js';

/** Neo4j node label for snapshot records */
const SNAPSHOT_LABEL = `ParameterSnapshot`;

/** Relationship linking snapshot to the source object */
const REL_SNAPSHOT_OF = `SNAPSHOT_OF`;

/** Module level log tag */
const LOG_TAG = `Repository/GameObject/ParameterSnapshotRepository`;

/**
 * @brief Generate a unique snapshot UID
 * @returns string Snapshot uid @example 'snap_a1b2c3d4e5'
 */
function __GenerateSnapshotUid(): string {
    return `snap_${randomUUID().replace(/-/g, ``)}`;
}

/**
 * @brief Map Neo4j node properties to IParameterSnapshot
 * @param properties Record_string_any Neo4j node properties
 * @returns IParameterSnapshot Mapped snapshot domain object
 */
function __MapNodeToSnapshot(properties: Record<string, any>): IParameterSnapshot {
    return {
        uid: properties.uid,
        objectUid: properties.objectUid,
        turn: typeof properties.turn === `number` ? properties.turn : Number(properties.turn),
        capturedAt: properties.capturedAt,
        parameters: JSON.parse(properties.parameters_json ?? `[]`),
    };
}

/**
 * @brief Concrete Neo4j implementation of IParameterSnapshotRepository storing ParameterSnapshot nodes linked to GameObjects via SNAPSHOT_OF
 */
export class ParameterSnapshotRepository implements IParameterSnapshotRepository {
    /**
     * @brief Capture a single snapshot for an object
     * @param objectUid string Object identifier @example 'gobj_abc123'
     * @param turn number Current game turn @example 5
     * @param parameters IParameterValue_array Full parameter state
     * @returns Promise_IParameterSnapshot Persisted snapshot
     */
    public async CaptureSnapshot(
        objectUid: string,
        turn: number,
        parameters: IParameterValue[],
    ): Promise<IParameterSnapshot> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const snapshotUid = __GenerateSnapshotUid();
            const now = new Date().toISOString();
            const parametersJson = JSON.stringify(parameters);

            const query = `
                MATCH (obj { uid: $objectUid })
                CREATE (snap:${SNAPSHOT_LABEL} {
                    uid: $snapshotUid,
                    objectUid: $objectUid,
                    turn: $turn,
                    capturedAt: $now,
                    parameters_json: $parametersJson
                })
                CREATE (snap)-[:${REL_SNAPSHOT_OF}]->(obj)
                RETURN snap
            `;

            const result = await session.run(query, {
                objectUid,
                snapshotUid,
                turn,
                now,
                parametersJson,
            });

            const record = result.records[0];
            if (!record) {
                throw new Error(`Failed to capture snapshot for object "${objectUid}".`);
            }

            return __MapNodeToSnapshot(record.get(`snap`).properties);
        } catch(error) {
            log.error(`Failed to capture snapshot: ${String(error)}`, LOG_TAG, `CaptureSnapshot`);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * @brief Capture snapshots for multiple objects in a single transaction
     * @param entries Array of objectUid and turn and parameters triples
     * @returns Promise_void
     */
    public async CaptureSnapshotBatch(
        entries: Array<{ objectUid: string; turn: number; parameters: IParameterValue[] }>,
    ): Promise<void> {
        if (entries.length === 0) {
            return;
        }

        const session = await neo4jClient.GetSession(`WRITE`);
        const transaction = session.beginTransaction();
        try {
            const now = new Date().toISOString();

            for (const entry of entries) {
                const snapshotUid = __GenerateSnapshotUid();
                const parametersJson = JSON.stringify(entry.parameters);

                await transaction.run(
                    `
                    MATCH (obj { uid: $objectUid })
                    CREATE (snap:${SNAPSHOT_LABEL} {
                        uid: $snapshotUid,
                        objectUid: $objectUid,
                        turn: $turn,
                        capturedAt: $now,
                        parameters_json: $parametersJson
                    })
                    CREATE (snap)-[:${REL_SNAPSHOT_OF}]->(obj)
                    `,
                    {
                        objectUid: entry.objectUid,
                        snapshotUid,
                        turn: entry.turn,
                        now,
                        parametersJson,
                    },
                );
            }

            await transaction.commit();
            log.info(`Captured ${entries.length} parameter snapshots.`, LOG_TAG);
        } catch(error) {
            await transaction.rollback();
            log.error(`Batch snapshot capture failed: ${String(error)}`, LOG_TAG, `CaptureSnapshotBatch`);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * @brief Retrieve recent snapshots for an object ordered newest first
     * @param objectUid string Object identifier
     * @param limit number Maximum snapshots to return defaulting to 20
     * @returns Promise_IParameterSnapshot_array Recent snapshots
     */
    public async GetRecentSnapshots(objectUid: string, limit: number = 20): Promise<IParameterSnapshot[]> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);

            const query = `
                MATCH (snap:${SNAPSHOT_LABEL} { objectUid: $objectUid })
                RETURN snap
                ORDER BY snap.turn DESC
                LIMIT ${safeLimit}
            `;

            const result = await session.run(query, { objectUid });

            return result.records.map(record => {
                return __MapNodeToSnapshot(record.get(`snap`).properties);
            });
        } finally {
            await session.close();
        }
    }

    /**
     * @brief Retrieve snapshots within a turn range
     * @param objectUid string Object identifier
     * @param fromTurn number Start turn inclusive
     * @param toTurn number End turn inclusive
     * @returns Promise_IParameterSnapshot_array Snapshots ordered by turn ascending
     */
    public async GetSnapshotsByTurnRange(
        objectUid: string,
        fromTurn: number,
        toTurn: number,
    ): Promise<IParameterSnapshot[]> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const query = `
                MATCH (snap:${SNAPSHOT_LABEL} { objectUid: $objectUid })
                WHERE snap.turn >= $fromTurn AND snap.turn <= $toTurn
                RETURN snap
                ORDER BY snap.turn ASC
            `;

            const result = await session.run(query, { objectUid, fromTurn, toTurn });

            return result.records.map(record => {
                return __MapNodeToSnapshot(record.get(`snap`).properties);
            });
        } finally {
            await session.close();
        }
    }

    /**
     * @brief Delete all snapshots for a given object
     * @param objectUid string Object identifier
     * @returns Promise_number Count of deleted snapshots
     */
    public async DeleteAllForObject(objectUid: string): Promise<number> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const result = await session.run(
                `
                MATCH (snap:${SNAPSHOT_LABEL} { objectUid: $objectUid })
                DETACH DELETE snap
                RETURN count(snap) AS deleted
                `,
                { objectUid },
            );

            const deletedCount = result.records[0]?.get(`deleted`)?.toNumber?.() ?? 0;
            return deletedCount;
        } finally {
            await session.close();
        }
    }
}
