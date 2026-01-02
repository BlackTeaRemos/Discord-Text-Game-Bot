import { randomUUID } from 'crypto';
import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { DescriptionScope, ScopedDescription } from './Types.js';

/**
 * Options for saving a scoped description.
 * @property objectType string Category of the target object. @example 'vehicle'
 * @property objectUid string Unique identifier of the target object. @example 'vehicle_123'
 * @property scope DescriptionScope The scope to save description under.
 * @property content string Description text to persist. @example 'Heavy armored transport...'
 * @property createdBy string Discord user id of the author. @example '123456789012345678'
 */
export interface SaveScopedDescriptionOptions {
    objectType: string;
    objectUid: string;
    scope: DescriptionScope;
    content: string;
    createdBy: string;
}

/**
 * Result of a save operation.
 * @property description ScopedDescription The saved description record.
 * @property isNew boolean True if a new record was created, false if existing was updated.
 */
export interface SaveScopedDescriptionResult {
    description: ScopedDescription;
    isNew: boolean;
}

/**
 * Generate unique description identifier.
 * @returns string Identifier prefixed with 'sdesc_'. @example 'sdesc_abc123def456'
 */
function GenerateScopedDescriptionUid(): string {
    return `sdesc_${randomUUID().replace(/-/g, ``)}`;
}

/**
 * Save or update a scoped description for an object.
 * Creates new record if none exists, otherwise increments version.
 * @param options SaveScopedDescriptionOptions Data for the description to save.
 * @returns Promise<SaveScopedDescriptionResult> Saved description and creation status.
 * @example const result = await SaveScopedDescription({ objectType: 'vehicle', ... });
 */
export async function SaveScopedDescription(options: SaveScopedDescriptionOptions): Promise<SaveScopedDescriptionResult> {
    const session = await neo4jClient.GetSession(`WRITE`);
    const scopeUidParam = options.scope.scopeUid ?? `__global__`;
    const nowTimestamp = new Date().toISOString();

    try {
        const existingQuery = `
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

        const existingResult = await session.run(existingQuery, {
            objectType: options.objectType,
            objectUid: options.objectUid,
            scopeType: options.scope.scopeType,
            scopeUid: scopeUidParam,
        });

        if (existingResult.records.length === 0) {
            const newUid = GenerateScopedDescriptionUid();
            const createQuery = `
                CREATE (d:ScopedDescription {
                    uid: $uid,
                    objectType: $objectType,
                    objectUid: $objectUid,
                    scopeType: $scopeType,
                    scopeUid: $scopeUid,
                    content: $content,
                    version: 1,
                    createdBy: $createdBy,
                    createdAt: $createdAt
                })
                RETURN d
            `;

            const createResult = await session.run(createQuery, {
                uid: newUid,
                objectType: options.objectType,
                objectUid: options.objectUid,
                scopeType: options.scope.scopeType,
                scopeUid: scopeUidParam,
                content: options.content,
                createdBy: options.createdBy,
                createdAt: nowTimestamp,
            });

            const properties = createResult.records[0].get(`d`).properties;

            return {
                description: {
                    uid: String(properties.uid),
                    objectType: String(properties.objectType),
                    objectUid: String(properties.objectUid),
                    scopeType: properties.scopeType as ScopedDescription[`scopeType`],
                    scopeUid: properties.scopeUid === `__global__` ? null : String(properties.scopeUid),
                    content: String(properties.content),
                    version: Number(properties.version),
                    createdBy: String(properties.createdBy),
                    createdAt: String(properties.createdAt),
                },
                isNew: true,
            };
        }

        const existingProperties = existingResult.records[0].get(`d`).properties;
        const existingUid = String(existingProperties.uid);
        const nextVersion = Number(existingProperties.version ?? 1) + 1;

        const updateQuery = `
            MATCH (d:ScopedDescription { uid: $uid })
            SET d.content = $content,
                d.version = $version,
                d.createdBy = $createdBy,
                d.createdAt = $createdAt
            RETURN d
        `;

        const updateResult = await session.run(updateQuery, {
            uid: existingUid,
            content: options.content,
            version: nextVersion,
            createdBy: options.createdBy,
            createdAt: nowTimestamp,
        });

        const updatedProperties = updateResult.records[0].get(`d`).properties;

        return {
            description: {
                uid: String(updatedProperties.uid),
                objectType: String(updatedProperties.objectType),
                objectUid: String(updatedProperties.objectUid),
                scopeType: updatedProperties.scopeType as ScopedDescription[`scopeType`],
                scopeUid: updatedProperties.scopeUid === `__global__` ? null : String(updatedProperties.scopeUid),
                content: String(updatedProperties.content),
                version: Number(updatedProperties.version),
                createdBy: String(updatedProperties.createdBy),
                createdAt: String(updatedProperties.createdAt),
            },
            isNew: false,
        };
    } finally {
        await session.close();
    }
}
