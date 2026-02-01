import { neo4jClient } from '../../../Setup/Neo4j.js';

const REL_SELECTED_GAME = `SELECTED_GAME`;

/**
 * Set a user's active game selection.
 * Stores a single relationship from User to Game.
 * @param discordId string Discord user id. @example '123456789012345678'
 * @param gameUid string Game uid to select. @example 'game_abc123'
 * @returns Promise<void>
 */
export async function SetUserActiveGame(discordId: string, gameUid: string): Promise<void> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })
            OPTIONAL MATCH (u)-[oldRel:${REL_SELECTED_GAME}]->(:Game)
            DELETE oldRel
            WITH u
            MATCH (g:Game { uid: $gameUid })
            MERGE (u)-[:${REL_SELECTED_GAME}]->(g)`;
        await session.run(query, { discordId, gameUid });
    } finally {
        await session.close();
    }
}

/**
 * Get a user's active game selection.
 * @param discordId string Discord user id. @example '123456789012345678'
 * @returns Promise<{ uid: string; name: string } | null> Selected game or null.
 */
export async function GetUserActiveGame(
    discordId: string,
): Promise<{ uid: string; name: string } | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })-[:${REL_SELECTED_GAME}]->(g:Game)
            RETURN g.uid AS uid, g.name AS name
            LIMIT 1`;
        const result = await session.run(query, { discordId });
        const record = result.records[0];
        if (!record) {
            return null;
        }
        return {
            uid: String(record.get(`uid`)),
            name: String(record.get(`name`) ?? `Game`),
        };
    } finally {
        await session.close();
    }
}
