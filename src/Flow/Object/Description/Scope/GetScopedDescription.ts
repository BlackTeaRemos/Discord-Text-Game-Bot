import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { DescriptionScope, ScopedDescription } from './Types.js';

/**
 * Options for fetching a scoped description.
 * @property objectType string Category of the target object. @example 'vehicle'
 * @property objectUid string Unique identifier of the target object. @example 'vehicle_123'
 * @property scope DescriptionScope The scope to fetch description for.
 */
export interface GetScopedDescriptionOptions {
    objectType: string;
    objectUid: string;
    scope: DescriptionScope;
}

/**
 * Fetch the latest description for a specific object and scope combination.
 * Returns null if no description exists for the given scope.
 * @param options GetScopedDescriptionOptions Target object and scope to query.
 * @returns Promise<ScopedDescription | null> Description record or null if not found.
 * @example const desc = await GetScopedDescription({ objectType: 'vehicle', objectUid: 'v_1', scope });
 */
export async function GetScopedDescription(options: GetScopedDescriptionOptions): Promise<ScopedDescription | null> {
    const session = await neo4jClient.GetSession(`READ`);

    try {
        const query = `
            MATCH (d:ScopedDescription {
                objectType: $objectType,
                objectUid: $objectUid,
                scopeType: $scopeType,
                scopeUid: $scopeUid
            })
            RETURN d
            ORDER BY d.version DESC
            LIMIT 1
        `;

        const scopeUidParam = options.scope.scopeUid ?? `__global__`;

        const result = await session.run(query, {
            objectType: options.objectType,
            objectUid: options.objectUid,
            scopeType: options.scope.scopeType,
            scopeUid: scopeUidParam,
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
