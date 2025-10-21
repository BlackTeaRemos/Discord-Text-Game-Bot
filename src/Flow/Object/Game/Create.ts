import { randomUUID } from 'crypto';
import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Properties returned for a Game
 */
export interface Game {
    uid: string;
    name: string;
    image: string;
    serverId: string;
    parameters: Record<string, any>;
}

/**
 * Generate a unique game UID.
 * @param prefix UID prefix
 * @returns generated UID string
 */
export function GenerateGameUid(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, ``)}`;
}

/**
 * Create a new Game node linked to a Server. Fails if game name already exists for that server.
 * @param name Game name
 * @param image URL of game image
 * @param serverId Discord server ID
 * @param uid Optional UID; if not provided, a new one is generated
 * @param parameters Optional parameters JSON; defaults to { currentTurn: 1 }
 * @returns The created game properties
 */
export async function CreateGame(
    name: string,
    image: string,
    serverId: string,
    uid?: string,
    parameters?: Record<string, any>,
): Promise<Game> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const checkQuery = `
            MATCH (game:Game { name: $name, server_id: $serverId })
            RETURN game LIMIT 1`;
        const checkResult = await session.run(checkQuery, { name, serverId });
        if (checkResult.records.length > 0) {
            throw new Error(`Game with this name already exists in the server`);
        }
        const gameUid = uid || GenerateGameUid(`game`);
        const gameParams = parameters || { currentTurn: 1 };
        const paramEntries = Object.entries(gameParams);
        const query = `
            MERGE (server:Server { id: $serverId })
            MERGE (game:Game { uid: $uid })
            SET game.name = $name, game.image = $image, game.server_id = $serverId
            MERGE (server)-[:HAS_GAME]->(game)
            WITH game
            UNWIND $paramEntries AS entry
            MERGE (game)-[:HAS_PARAMETER]->(param:Parameter { key: entry[0], value: entry[1] })
            RETURN game, server.id AS serverId`;
        const params = { uid: gameUid, name, image, serverId, paramEntries };
        const result: any = await session.run(query, params);
        const record = result.records[0];
        const gameNode = record.get(`game`);
        const serverIdFromDb = record.get(`serverId`);
        const gameProps = gameNode.properties;
        return {
            uid: gameProps.uid,
            name: gameProps.name,
            image: gameProps.image,
            serverId: serverIdFromDb,
            parameters: gameParams, // still return as record
        };
    } finally {
        await session.close();
    }
}
