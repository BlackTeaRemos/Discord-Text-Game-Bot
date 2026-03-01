import { randomUUID } from 'crypto';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { Log } from '../../Common/Log.js';
import type { IProjectionSnapshot } from '../../Domain/GameObject/Entity/Projection/IProjectionSnapshot.js';
import type { IProjectedParameter } from '../../Domain/GameObject/Entity/Projection/IProjectedParameter.js';
import type { IProjectionSnapshotRepository } from '../../Domain/GameObject/Repository/IProjectionSnapshotRepository.js';

const SNAPSHOT_LABEL = `ProjectionSnapshot`;

const REL_SNAPSHOT_OF = `PROJECTION_SNAPSHOT_OF`;

const LOG_TAG = `Repository/GameObject/ProjectionSnapshotRepository`;

function __GenerateSnapshotUid(): string {
    return `psnap_${randomUUID().replace(/-/g, ``)}`;
}

function __MapNodeToSnapshot(properties: Record<string, any>): IProjectionSnapshot {
    return {
        uid: properties.uid,
        projectionUid: properties.projectionUid,
        turn: typeof properties.turn === `number` ? properties.turn : Number(properties.turn),
        capturedAt: properties.capturedAt,
        parameters: JSON.parse(properties.parameters_json ?? `[]`),
    };
}

export class ProjectionSnapshotRepository implements IProjectionSnapshotRepository {
    public async CaptureSnapshot(
        projectionUid: string,
        turn: number,
        parameters: IProjectedParameter[],
    ): Promise<IProjectionSnapshot> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const snapshotUid = __GenerateSnapshotUid();
            const now = new Date().toISOString();
            const parametersJson = JSON.stringify(parameters);

            const query = `
                MATCH (proj:ObjectProjection { uid: $projectionUid })
                CREATE (snap:${SNAPSHOT_LABEL} {
                    uid: $snapshotUid,
                    projectionUid: $projectionUid,
                    turn: $turn,
                    capturedAt: $now,
                    parameters_json: $parametersJson
                })
                CREATE (snap)-[:${REL_SNAPSHOT_OF}]->(proj)
                RETURN snap
            `;

            const result = await session.run(query, {
                projectionUid,
                snapshotUid,
                turn,
                now,
                parametersJson,
            });

            const record = result.records[0];
            if (!record) {
                throw new Error(`Failed to capture projection snapshot for "${projectionUid}"`);
            }

            return __MapNodeToSnapshot(record.get(`snap`).properties);
        } catch (error) {
            Log.error(`Failed to capture projection snapshot: ${String(error)}`, LOG_TAG, `CaptureSnapshot`);
            throw error;
        } finally {
            await session.close();
        }
    }

    public async CaptureSnapshotBatch(
        entries: Array<{
            projectionUid: string;
            turn: number;
            parameters: IProjectedParameter[];
        }>,
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
                    MATCH (proj:ObjectProjection { uid: $projectionUid })
                    CREATE (snap:${SNAPSHOT_LABEL} {
                        uid: $snapshotUid,
                        projectionUid: $projectionUid,
                        turn: $turn,
                        capturedAt: $now,
                        parameters_json: $parametersJson
                    })
                    CREATE (snap)-[:${REL_SNAPSHOT_OF}]->(proj)
                    `,
                    {
                        projectionUid: entry.projectionUid,
                        snapshotUid,
                        turn: entry.turn,
                        now,
                        parametersJson,
                    },
                );
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            Log.error(`Batch projection snapshot failed: ${String(error)}`, LOG_TAG, `CaptureSnapshotBatch`);
            throw error;
        } finally {
            await session.close();
        }
    }

    public async GetRecentSnapshots(
        projectionUid: string,
        limit: number = 20,
    ): Promise<IProjectionSnapshot[]> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);

            const result = await session.run(
                `
                MATCH (snap:${SNAPSHOT_LABEL} { projectionUid: $projectionUid })
                RETURN snap ORDER BY snap.turn DESC LIMIT ${safeLimit}
                `,
                { projectionUid },
            );

            return result.records.map(record => {
                return __MapNodeToSnapshot(record.get(`snap`).properties);
            });
        } finally {
            await session.close();
        }
    }

    public async GetSnapshotsByTurnRange(
        projectionUid: string,
        fromTurn: number,
        toTurn: number,
    ): Promise<IProjectionSnapshot[]> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const result = await session.run(
                `
                MATCH (snap:${SNAPSHOT_LABEL} { projectionUid: $projectionUid })
                WHERE snap.turn >= $fromTurn AND snap.turn <= $toTurn
                RETURN snap ORDER BY snap.turn ASC
                `,
                { projectionUid, fromTurn, toTurn },
            );

            return result.records.map(record => {
                return __MapNodeToSnapshot(record.get(`snap`).properties);
            });
        } finally {
            await session.close();
        }
    }

    public async DeleteAllForProjection(projectionUid: string): Promise<number> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const result = await session.run(
                `
                MATCH (snap:${SNAPSHOT_LABEL} { projectionUid: $projectionUid })
                DETACH DELETE snap
                RETURN count(snap) AS deleted
                `,
                { projectionUid },
            );

            const record = result.records[0];
            return record ? record.get(`deleted`).toNumber() : 0;
        } catch (error) {
            Log.error(`Failed to delete projection snapshots: ${String(error)}`, LOG_TAG, `DeleteAllForProjection`);
            throw error;
        } finally {
            await session.close();
        }
    }
}
