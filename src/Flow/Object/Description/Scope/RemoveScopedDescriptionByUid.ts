import { neo4jClient } from '../../../../Setup/Neo4j.js';

/**
 * Remove a scoped description record by its UID.
 * @param uid string Scoped description UID. @example 'sdesc_abc123'
 * @returns Promise<boolean> True when a record was removed, false when not found. @example const removed = await RemoveScopedDescriptionByUid('sdesc_1')
 */
export async function RemoveScopedDescriptionByUid(uid: string): Promise<boolean> {
    const session = await neo4jClient.GetSession(`WRITE`);

    try {
        const query = `
            MATCH (d:ScopedDescription { uid: $uid })
            WITH d
            LIMIT 1
            DETACH DELETE d
            RETURN true AS removed
        `;

        const result = await session.run(query, { uid });
        return result.records.length > 0;
    } finally {
        await session.close();
    }
}
