import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Fetch global description content for an object
 * @param objectUid string Object unique identifier @example 'game_abc123'
 * @param userUid string User identifier for scope fallback @example '123456789'
 * @returns Promise<string | null> Description content or null
 */
export async function FetchDescriptionForObject(
    objectUid: string,
    userUid: string,
): Promise<string | null> {
    const session = await neo4jClient.GetSession(`READ`);

    try {
        const query = `
            MATCH (d:ScopedDescription { objectUid: $objectUid })
            WHERE d.scopeType IN ['global', 'user', 'organization']
            RETURN d.content AS content, d.scopeType AS scopeType
            ORDER BY 
                CASE d.scopeType 
                    WHEN 'global' THEN 1 
                    WHEN 'organization' THEN 2 
                    WHEN 'user' THEN 3 
                    ELSE 4 
                END
            LIMIT 1`;

        const result = await session.run(query, { objectUid, userUid });

        if (result.records.length === 0) {
            return null;
        }

        const content = result.records[0].get(`content`);
        return content ? String(content) : null;
    } finally {
        await session.close();
    }
}
