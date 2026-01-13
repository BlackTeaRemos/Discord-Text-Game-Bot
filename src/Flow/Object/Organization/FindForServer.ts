import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Minimal organization data for server lookup
 */
export interface ServerOrganization {
    uid: string; // organization unique identifier
    name: string; // organization display name
}

/**
 * Find the primary organization associated with a Discord server
 * @param serverId string Discord guild id @example '123456789012345678'
 * @returns Promise<ServerOrganization | null> Organization or null if not found
 */
export async function FindOrganizationForServer(serverId: string): Promise<ServerOrganization | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (s:Server { id: $serverId })-[:HAS_ORGANIZATION]->(o:Organization)
            RETURN o.uid AS uid, o.name AS name
            LIMIT 1`;
        const result = await session.run(query, { serverId });
        const record = result.records[0];
        if (!record) {
            return null;
        }
        return {
            uid: String(record.get(`uid`)),
            name: String(record.get(`name`) ?? `Organization`),
        };
    } finally {
        await session.close();
    }
}
