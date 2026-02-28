import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Retrieve the organization UID that owns a factory
 * @param uid string Factory UID
 * @returns Promise of string or null Organization UID or null if not found
 * @example
 * const orgUid = await getFactoryOrganizationUid('factory_123');
 */
export async function GetFactoryOrganizationUid(uid: string): Promise<string | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (o:Organization)-[:HAS_FACTORY]->(f:Factory { uid: $uid })
            RETURN o.uid AS orgUid
            LIMIT 1`;
        const result = await session.run(query, { uid });
        const record = result.records[0];
        return record ? String(record.get(`orgUid`)) : null;
    } finally {
        await session.close();
    }
}

/**
 * Remove a Factory node by UID along with its relationships
 * @param uid Factory UID
 * @returns true if deleted or false if not found
 */
export async function RemoveFactory(uid: string): Promise<boolean> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (f:Factory { uid: $uid })
            WITH f
            OPTIONAL MATCH (o)-[r:HAS_FACTORY]->(f)
            DELETE r, f`;
        const result = await session.run(query, { uid });
        // Reads nodesDeleted from result summary
        const deletedCount = result.summary.counters.updates().nodesDeleted;
        return deletedCount > 0;
    } finally {
        await session.close();
    }
}
