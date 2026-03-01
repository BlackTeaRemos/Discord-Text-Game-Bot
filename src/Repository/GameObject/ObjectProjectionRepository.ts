import { randomUUID } from 'crypto';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { Log } from '../../Common/Log.js';
import type { IObjectProjection, ProjectionStatus } from '../../Domain/GameObject/Entity/Projection/IObjectProjection.js';
import type { IProjectedParameter } from '../../Domain/GameObject/Entity/Projection/IProjectedParameter.js';
import type { ProjectionDisplayStyle } from '../../Domain/GameObject/Entity/Projection/ProjectionDisplayStyle.js';
import type { IObjectProjectionRepository } from '../../Domain/GameObject/Repository/IObjectProjectionRepository.js';

const PROJECTION_LABEL = `ObjectProjection`;

const REL_PROJECTS = `PROJECTS`;

const REL_HAS_PROJECTION = `HAS_PROJECTION`;

const LOG_TAG = `Repository/GameObject/ObjectProjectionRepository`;

function __GenerateProjectionUid(): string {
    return `proj_${randomUUID().replace(/-/g, ``)}`;
}

function __MapNodeToProjection(properties: Record<string, any>): IObjectProjection {
    return {
        uid: properties.uid,
        objectUid: properties.objectUid,
        templateUid: properties.templateUid,
        organizationUid: properties.organizationUid,
        name: properties.name,
        displayStyle: properties.displayStyle as ProjectionDisplayStyle,
        status: (properties.status as ProjectionStatus) ?? `ACTIVE`,
        autoSync: properties.autoSync === true || properties.autoSync === `true`,
        knownParameters: JSON.parse(properties.known_parameters_json ?? `[]`),
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
    };
}

export class ObjectProjectionRepository implements IObjectProjectionRepository {
    public async Create(options: {
        objectUid: string;
        templateUid: string;
        organizationUid: string;
        name: string;
        displayStyle: ProjectionDisplayStyle;
        autoSync: boolean;
        knownParameters: IProjectedParameter[];
    }): Promise<IObjectProjection> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const uid = __GenerateProjectionUid();
            const now = new Date().toISOString();
            const knownParametersJson = JSON.stringify(options.knownParameters);

            const query = `
                MATCH (obj:GameObject { uid: $objectUid })
                MATCH (org:Organization { uid: $organizationUid })
                CREATE (proj:${PROJECTION_LABEL} {
                    uid: $uid,
                    objectUid: $objectUid,
                    templateUid: $templateUid,
                    organizationUid: $organizationUid,
                    name: $name,
                    displayStyle: $displayStyle,
                    status: 'ACTIVE',
                    autoSync: $autoSync,
                    known_parameters_json: $knownParametersJson,
                    createdAt: $now,
                    updatedAt: $now
                })
                MERGE (proj)-[:${REL_PROJECTS}]->(obj)
                MERGE (org)-[:${REL_HAS_PROJECTION}]->(proj)
                RETURN proj
            `;

            const result = await session.run(query, {
                objectUid: options.objectUid,
                templateUid: options.templateUid,
                organizationUid: options.organizationUid,
                uid,
                name: options.name,
                displayStyle: options.displayStyle,
                autoSync: options.autoSync,
                knownParametersJson,
                now,
            });

            const record = result.records[0];
            if (!record) {
                throw new Error(`Failed to create projection for object "${options.objectUid}" and org "${options.organizationUid}"`);
            }

            return __MapNodeToProjection(record.get(`proj`).properties);
        } catch (error) {
            Log.error(`Failed to create projection: ${String(error)}`, LOG_TAG, `Create`);
            throw error;
        } finally {
            await session.close();
        }
    }

    public async GetByUid(uid: string): Promise<IObjectProjection | null> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const result = await session.run(
                `MATCH (proj:${PROJECTION_LABEL} { uid: $uid }) RETURN proj`,
                { uid },
            );

            const record = result.records[0];
            if (!record) {
                return null;
            }

            return __MapNodeToProjection(record.get(`proj`).properties);
        } finally {
            await session.close();
        }
    }

    public async GetByOrganizationAndObject(
        organizationUid: string,
        objectUid: string,
    ): Promise<IObjectProjection | null> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const result = await session.run(
                `MATCH (proj:${PROJECTION_LABEL} { organizationUid: $organizationUid, objectUid: $objectUid }) RETURN proj`,
                { organizationUid, objectUid },
            );

            const record = result.records[0];
            if (!record) {
                return null;
            }

            return __MapNodeToProjection(record.get(`proj`).properties);
        } finally {
            await session.close();
        }
    }

    public async ListByOrganization(
        organizationUid: string,
        filters?: { status?: ProjectionStatus; templateUid?: string },
    ): Promise<IObjectProjection[]> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const conditions: string[] = [`proj.organizationUid = $organizationUid`];
            const params: Record<string, any> = { organizationUid };

            if (filters?.status) {
                conditions.push(`proj.status = $status`);
                params.status = filters.status;
            }

            if (filters?.templateUid) {
                conditions.push(`proj.templateUid = $templateUid`);
                params.templateUid = filters.templateUid;
            }

            const query = `
                MATCH (proj:${PROJECTION_LABEL})
                WHERE ${conditions.join(` AND `)}
                RETURN proj ORDER BY proj.name
            `;

            const result = await session.run(query, params);

            return result.records.map(record => {
                return __MapNodeToProjection(record.get(`proj`).properties);
            });
        } finally {
            await session.close();
        }
    }

    public async ListByObject(
        objectUid: string,
        filters?: { autoSync?: boolean; status?: ProjectionStatus },
    ): Promise<IObjectProjection[]> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const conditions: string[] = [`proj.objectUid = $objectUid`];
            const params: Record<string, any> = { objectUid };

            if (filters?.autoSync !== undefined) {
                conditions.push(`proj.autoSync = $autoSync`);
                params.autoSync = filters.autoSync;
            }

            if (filters?.status) {
                conditions.push(`proj.status = $status`);
                params.status = filters.status;
            }

            const query = `
                MATCH (proj:${PROJECTION_LABEL})
                WHERE ${conditions.join(` AND `)}
                RETURN proj ORDER BY proj.organizationUid
            `;

            const result = await session.run(query, params);

            return result.records.map(record => {
                return __MapNodeToProjection(record.get(`proj`).properties);
            });
        } finally {
            await session.close();
        }
    }

    public async UpdateKnownParameters(
        uid: string,
        knownParameters: IProjectedParameter[],
    ): Promise<IObjectProjection> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const now = new Date().toISOString();
            const knownParametersJson = JSON.stringify(knownParameters);

            const result = await session.run(
                `
                MATCH (proj:${PROJECTION_LABEL} { uid: $uid })
                SET proj.known_parameters_json = $knownParametersJson,
                    proj.updatedAt = $now
                RETURN proj
                `,
                { uid, knownParametersJson, now },
            );

            const record = result.records[0];
            if (!record) {
                throw new Error(`Projection "${uid}" not found`);
            }

            return __MapNodeToProjection(record.get(`proj`).properties);
        } catch (error) {
            Log.error(`Failed to update projection parameters: ${String(error)}`, LOG_TAG, `UpdateKnownParameters`);
            throw error;
        } finally {
            await session.close();
        }
    }

    public async UpdateMetadata(
        uid: string,
        fields: {
            name?: string;
            displayStyle?: ProjectionDisplayStyle;
            autoSync?: boolean;
            status?: ProjectionStatus;
        },
    ): Promise<IObjectProjection> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const setClauses: string[] = [`proj.updatedAt = $now`];
            const params: Record<string, any> = { uid, now: new Date().toISOString() };

            if (fields.name !== undefined) {
                setClauses.push(`proj.name = $name`);
                params.name = fields.name;
            }

            if (fields.displayStyle !== undefined) {
                setClauses.push(`proj.displayStyle = $displayStyle`);
                params.displayStyle = fields.displayStyle;
            }

            if (fields.autoSync !== undefined) {
                setClauses.push(`proj.autoSync = $autoSync`);
                params.autoSync = fields.autoSync;
            }

            if (fields.status !== undefined) {
                setClauses.push(`proj.status = $status`);
                params.status = fields.status;
            }

            const result = await session.run(
                `
                MATCH (proj:${PROJECTION_LABEL} { uid: $uid })
                SET ${setClauses.join(`, `)}
                RETURN proj
                `,
                params,
            );

            const record = result.records[0];
            if (!record) {
                throw new Error(`Projection "${uid}" not found`);
            }

            return __MapNodeToProjection(record.get(`proj`).properties);
        } catch (error) {
            Log.error(`Failed to update projection metadata: ${String(error)}`, LOG_TAG, `UpdateMetadata`);
            throw error;
        } finally {
            await session.close();
        }
    }

    public async BatchUpdateKnownParameters(
        updates: Array<{
            projectionUid: string;
            knownParameters: IProjectedParameter[];
        }>,
    ): Promise<void> {
        if (updates.length === 0) {
            return;
        }

        const session = await neo4jClient.GetSession(`WRITE`);
        const transaction = session.beginTransaction();
        try {
            const now = new Date().toISOString();

            for (const update of updates) {
                const knownParametersJson = JSON.stringify(update.knownParameters);

                await transaction.run(
                    `
                    MATCH (proj:${PROJECTION_LABEL} { uid: $uid })
                    SET proj.known_parameters_json = $knownParametersJson,
                        proj.updatedAt = $now
                    `,
                    { uid: update.projectionUid, knownParametersJson, now },
                );
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            Log.error(`Batch projection update failed: ${String(error)}`, LOG_TAG, `BatchUpdateKnownParameters`);
            throw error;
        } finally {
            await session.close();
        }
    }

    public async MarkDestroyedByObject(objectUid: string): Promise<number> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const now = new Date().toISOString();

            const result = await session.run(
                `
                MATCH (proj:${PROJECTION_LABEL} { objectUid: $objectUid })
                WHERE proj.status <> 'DESTROYED'
                SET proj.status = 'DESTROYED',
                    proj.autoSync = false,
                    proj.updatedAt = $now
                RETURN count(proj) AS affected
                `,
                { objectUid, now },
            );

            const record = result.records[0];
            return record ? record.get(`affected`).toNumber() : 0;
        } catch (error) {
            Log.error(`Failed to mark projections destroyed: ${String(error)}`, LOG_TAG, `MarkDestroyedByObject`);
            throw error;
        } finally {
            await session.close();
        }
    }
}
