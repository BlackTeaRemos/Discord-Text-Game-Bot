import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { ScopedDescription } from './Types.js';

/**
 * Options for resolving a priority-scoped description.
 * @property objectType string Category of the described object. @example 'game'
 * @property objectUid string Unique identifier of the described object. @example 'game_123'
 * @property userUid string Discord user id requesting the view. @example '123456789012345678'
 * @property organizationUids string[] Organization uids the user belongs to. @example ['org_1','org_2']
 */
export interface GetPriorityScopedDescriptionOptions {
    objectType: string;
    objectUid: string;
    userUid: string;
    organizationUids: string[];
}

/**
 * Resolve a scoped description for an object using strict priority:
 * user > organization > global.
 *
 * If multiple organization scoped descriptions exist, the newest (createdAt, then version) wins.
 * @param options GetPriorityScopedDescriptionOptions Query options.
 * @returns Promise<ScopedDescription | null> The best matching description or null. @example const d = await GetPriorityScopedDescription({...})
 */
export async function GetPriorityScopedDescription(
    options: GetPriorityScopedDescriptionOptions,
): Promise<ScopedDescription | null> {
    const session = await neo4jClient.GetSession(`READ`);

    try {
        const orgUids = Array.isArray(options.organizationUids) ? options.organizationUids : [];

        const query = `
            MATCH (d:ScopedDescription { objectType: $objectType, objectUid: $objectUid })
            WHERE (d.scopeType = 'user' AND d.scopeUid = $userUid)
               OR (d.scopeType = 'organization' AND d.scopeUid IN $orgUids)
               OR (d.scopeType = 'global' AND d.scopeUid = '__global__')
            WITH d,
                CASE d.scopeType
                    WHEN 'user' THEN 3
                    WHEN 'organization' THEN 2
                    WHEN 'global' THEN 1
                    ELSE 0
                END AS priority
            ORDER BY priority DESC, d.createdAt DESC, d.version DESC
            RETURN d
            LIMIT 1
        `;

        const result = await session.run(query, {
            objectType: options.objectType,
            objectUid: options.objectUid,
            userUid: options.userUid,
            orgUids,
        });

        if (result.records.length === 0) {
            return null;
        }

        const properties = result.records[0].get(`d`).properties;

        return {
            uid: String(properties.uid),
            objectType: String(properties.objectType),
            objectUid: String(properties.objectUid),
            scopeType: properties.scopeType as ScopedDescription[`scopeType`],
            scopeUid: properties.scopeUid === `__global__` ? null : String(properties.scopeUid),
            content: String(properties.content ?? ``),
            version: Number(properties.version ?? 1),
            createdBy: String(properties.createdBy ?? ``),
            createdAt: String(properties.createdAt ?? new Date().toISOString()),
        };
    } finally {
        await session.close();
    }
}
