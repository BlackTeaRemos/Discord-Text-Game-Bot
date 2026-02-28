import { randomUUID } from 'crypto';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { log } from '../../Common/Log.js';
import type { IGameObject } from '../../Domain/GameObject/IGameObject.js';
import type { IGameObjectRepository } from '../../Domain/GameObject/IGameObjectRepository.js';
import type { IParameterValue } from '../../Domain/GameObject/IParameterValue.js';
import type { IParameterDefinition } from '../../Domain/GameObject/IParameterDefinition.js';
import { ParameterSnapshotRepository } from './ParameterSnapshotRepository.js';

/** Neo4j node label for game object instances */
const INSTANCE_LABEL = `GameObject`;

/** Relationship linking instance to template */
const REL_INSTANCE_OF = `INSTANCE_OF`;

/** Relationship linking organization to instance */
const REL_OWNS_OBJECT = `OWNS_OBJECT`;

/** Template label for querying */
const TEMPLATE_LABEL = `GameObjectTemplate`;

/**
 * Generate a unique instance UID
 * @returns string Instance uid
 */
function __GenerateInstanceUid(): string {
    return `gobj_${randomUUID().replace(/-/g, ``)}`;
}

/**
 * Map Neo4j node properties to IGameObject
 * @param properties object Node properties
 * @returns IGameObject Mapped instance
 */
function __MapNodeToInstance(properties: Record<string, any>): IGameObject {
    return {
        uid: properties.uid,
        templateUid: properties.templateUid,
        gameUid: properties.gameUid,
        organizationUid: properties.organizationUid,
        name: properties.name,
        parameters: JSON.parse(properties.parameters_json ?? `[]`),
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
    };
}

/**
 * Concrete implementation of IGameObjectRepository using Neo4j
 */
export class GameObjectRepository implements IGameObjectRepository {
    /**
     * Create a game object instance from a template copying default parameter values
     * @param options object Creation parameters
     * @returns IGameObject Persisted instance
     * @example
     * const obj = await repo.Create({ templateUid: 'tpl_abc', gameUid: 'game_xyz', organizationUid: 'org_123' });
     */
    public async Create(options: {
        templateUid: string;
        gameUid: string;
        organizationUid: string;
        name?: string;
    }): Promise<IGameObject> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            // Fetch template to get default parameters
            const templateResult = await session.run(
                `MATCH (tpl:${TEMPLATE_LABEL} { uid: $templateUid }) RETURN tpl`,
                { templateUid: options.templateUid },
            );

            const templateRecord = templateResult.records[0];
            if (!templateRecord) {
                throw new Error(`Template "${options.templateUid}" not found.`);
            }

            const templateProps = templateRecord.get(`tpl`).properties;
            const parameterDefinitions: IParameterDefinition[] = JSON.parse(templateProps.parameters_json ?? `[]`);
            const templateName = templateProps.name as string;

            // Build default parameter values from template definitions
            const defaultParameters: IParameterValue[] = parameterDefinitions.map(definition => {
                return { key: definition.key, value: definition.defaultValue };
            });

            const uid = __GenerateInstanceUid();
            const now = new Date().toISOString();
            const instanceName = options.name ?? templateName;
            const parametersJson = JSON.stringify(defaultParameters);

            const createQuery = `
                MATCH (tpl:${TEMPLATE_LABEL} { uid: $templateUid })
                MATCH (org:Organization { uid: $organizationUid })
                CREATE (obj:${INSTANCE_LABEL} {
                    uid: $uid,
                    templateUid: $templateUid,
                    gameUid: $gameUid,
                    organizationUid: $organizationUid,
                    name: $name,
                    parameters_json: $parametersJson,
                    createdAt: $now,
                    updatedAt: $now
                })
                MERGE (obj)-[:${REL_INSTANCE_OF}]->(tpl)
                MERGE (org)-[:${REL_OWNS_OBJECT}]->(obj)
                RETURN obj
            `;

            const result = await session.run(createQuery, {
                templateUid: options.templateUid,
                organizationUid: options.organizationUid,
                gameUid: options.gameUid,
                uid,
                name: instanceName,
                parametersJson,
                now,
            });

            const record = result.records[0];
            if (!record) {
                throw new Error(`Failed to create instance. Ensure template and organization exist.`);
            }

            return __MapNodeToInstance(record.get(`obj`).properties);
        } catch(error) {
            log.error(`Failed to create game object: ${String(error)}`, `Repository/GameObject`, `Create`);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Retrieve a game object by uid
     * @param uid string Instance identifier
     * @returns IGameObject or null Instance or null
     */
    public async GetByUid(uid: string): Promise<IGameObject | null> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const result = await session.run(
                `MATCH (obj:${INSTANCE_LABEL} { uid: $uid }) RETURN obj`,
                { uid },
            );

            const record = result.records[0];
            if (!record) {
                return null;
            }

            return __MapNodeToInstance(record.get(`obj`).properties);
        } finally {
            await session.close();
        }
    }

    /**
     * List game objects for a game optionally filtered
     * @param gameUid string Game identifier
     * @param filters object Optional filters for organization or template
     * @returns IGameObject array Matching instances
     */
    public async ListByGame(
        gameUid: string,
        filters?: { organizationUid?: string; templateUid?: string },
    ): Promise<IGameObject[]> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const conditions: string[] = [`obj.gameUid = $gameUid`];
            const params: Record<string, any> = { gameUid };

            if (filters?.organizationUid) {
                conditions.push(`obj.organizationUid = $organizationUid`);
                params.organizationUid = filters.organizationUid;
            }

            if (filters?.templateUid) {
                conditions.push(`obj.templateUid = $templateUid`);
                params.templateUid = filters.templateUid;
            }

            const query = `
                MATCH (obj:${INSTANCE_LABEL})
                WHERE ${conditions.join(` AND `)}
                RETURN obj ORDER BY obj.name
            `;

            const result = await session.run(query, params);

            return result.records.map(record => {
                return __MapNodeToInstance(record.get(`obj`).properties);
            });
        } finally {
            await session.close();
        }
    }

    /**
     * Search game objects by name within a game scope using case insensitive partial match
     * @param gameUid string Game identifier
     * @param searchTerm string Partial name to match
     * @param limit number Maximum results to return with default 25
     * @returns IGameObject array Matching instances
     * @example
     * const results = await repo.SearchByName('game_abc', 'fact', 10);
     */
    public async SearchByName(
        gameUid: string,
        searchTerm: string,
        limit: number = 25,
    ): Promise<IGameObject[]> {
        const session = await neo4jClient.GetSession(`READ`);
        try {
            const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 25);

            const query = `
                MATCH (obj:${INSTANCE_LABEL})
                WHERE obj.gameUid = $gameUid
                  AND toLower(obj.name) CONTAINS toLower($searchTerm)
                RETURN obj ORDER BY obj.name LIMIT ${safeLimit}
            `;

            const result = await session.run(query, {
                gameUid,
                searchTerm,
            });

            return result.records.map(record => {
                return __MapNodeToInstance(record.get(`obj`).properties);
            });
        } finally {
            await session.close();
        }
    }

    /**
     * Update parameter values on an instance using merge semantics
     * @param uid string Object uid
     * @param parameters IParameterValue array New and updated parameter values
     * @returns IGameObject Updated instance
     */
    public async UpdateParameters(uid: string, parameters: IParameterValue[]): Promise<IGameObject> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            // Fetch current parameters
            const current = await this.GetByUid(uid);
            if (!current) {
                throw new Error(`Game object "${uid}" not found.`);
            }

            // Merge where incoming values override existing by key
            const parameterMap = new Map<string, IParameterValue>();
            for (const existingParameter of current.parameters) {
                parameterMap.set(existingParameter.key, existingParameter);
            }
            for (const updatedParameter of parameters) {
                parameterMap.set(updatedParameter.key, updatedParameter);
            }

            const mergedParameters = Array.from(parameterMap.values());
            const parametersJson = JSON.stringify(mergedParameters);
            const now = new Date().toISOString();

            const result = await session.run(
                `MATCH (obj:${INSTANCE_LABEL} { uid: $uid })
                 SET obj.parameters_json = $parametersJson, obj.updatedAt = $now
                 RETURN obj`,
                { uid, parametersJson, now },
            );

            const record = result.records[0];
            if (!record) {
                throw new Error(`Failed to update parameters for "${uid}".`);
            }

            const updatedInstance = __MapNodeToInstance(record.get(`obj`).properties);

            // Capture parameter snapshot as fire and forget since failure must not break update
            try {
                const snapshotRepository = new ParameterSnapshotRepository();
                await snapshotRepository.CaptureSnapshot(uid, 0, mergedParameters);
            } catch (snapshotError) {
                log.error(
                    `Snapshot capture failed after UpdateParameters: ${String(snapshotError)}`,
                    `Repository/GameObject`,
                    `UpdateParameters`,
                );
            }

            return updatedInstance;
        } catch(error) {
            log.error(`Failed to update parameters: ${String(error)}`, `Repository/GameObject`, `UpdateParameters`);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Batch update parameters for multiple objects in a single transaction
     * @param updates array Object uid and parameter pairs
     * @returns void
     */
    public async BatchUpdateParameters(
        updates: Array<{ objectUid: string; parameters: IParameterValue[] }>,
    ): Promise<void> {
        const session = await neo4jClient.GetSession(`WRITE`);
        const transaction = session.beginTransaction();
        try {
            const now = new Date().toISOString();

            for (const update of updates) {
                // For batch this is a direct set not merge with existing
                // The caller turn engine provides the complete parameter state
                const parametersJson = JSON.stringify(update.parameters);

                await transaction.run(
                    `MATCH (obj:${INSTANCE_LABEL} { uid: $uid })
                     SET obj.parameters_json = $parametersJson, obj.updatedAt = $now`,
                    { uid: update.objectUid, parametersJson, now },
                );
            }

            await transaction.commit();
        } catch(error) {
            await transaction.rollback();
            log.error(`Batch parameter update failed: ${String(error)}`, `Repository/GameObject`, `BatchUpdate`);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Delete a game object instance
     * @param uid string Object uid
     * @returns boolean True if deleted
     */
    public async Delete(uid: string): Promise<boolean> {
        const session = await neo4jClient.GetSession(`WRITE`);
        try {
            const result = await session.run(
                `MATCH (obj:${INSTANCE_LABEL} { uid: $uid }) DETACH DELETE obj RETURN count(obj) AS deleted`,
                { uid },
            );

            const deletedCount = result.records[0]?.get(`deleted`)?.toNumber?.() ?? 0;
            return deletedCount > 0;
        } finally {
            await session.close();
        }
    }
}
