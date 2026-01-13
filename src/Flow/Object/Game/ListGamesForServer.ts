import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Minimal game listing item for selection prompts.
 */
export interface ServerGameListItem {
    uid: string; // game uid
    name: string; // game display name
}

/**
 * List games registered for a Discord server.
 * @param serverId string Discord guild id. @example '123456789012345678'
 * @returns Promise<ServerGameListItem[]> Games for the server ordered by name. @example [{ uid: 'game_1', name: 'Alpha' }]
 */
export async function ListGamesForServer(serverId: string): Promise<ServerGameListItem[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (s:Server { id: $serverId })-[:HAS_GAME]->(g:Game)
            RETURN g.uid AS uid, g.name AS name
            ORDER BY coalesce(g.created_at, 0) ASC, g.name
            LIMIT 1`;
        const result = await session.run(query, { serverId });
        return result.records.map(record => {
            return {
                uid: String(record.get(`uid`)),
                name: String(record.get(`name`) ?? `Game`),
            };
        });
    } finally {
        await session.close();
    }
}
