import { randomUUID } from 'crypto';
import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Persisted game information stored in Neo4j.
 * @property uid string Unique identifier assigned to the game. @example "game_abcd"
 * @property name string Game name shown to players. @example "Galaxy League"
 * @property image string Public URL of the game preview image. @example "https://cdn.example/game.png"
 * @property serverId string Discord server id owning the game. @example "123456789012345678"
 * @property parameters Record<string, any> Arbitrary game parameters captured during creation.
 */
export interface Game {
    uid: string;
    name: string;
    image: string;
    serverId: string;
    parameters: Record<string, any>;
}

/**
 * Generate a unique game uid using a friendly prefix.
 * @param prefix string Prefix attached before the random suffix. @example "game"
 * @returns string Newly generated uid. @example "game_1a2b3c"
 */
export function GenerateGameUid(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, ``)}`;
}

/**
 * Create a new Game node linked to a Server. Fails if game name already exists for that server.
 * @param name string Game name chosen by the user. @example "Galaxy League"
 * @param image string URL pointing to the stored preview image. @example "https://cdn.example/game.png"
 * @param serverId string Discord server id owning the game. @example "123456789012345678"
 * @param uid string | undefined Optional client supplied uid.
 * @param parameters Record<string, any> | undefined Optional map of key-value parameters.
 * @returns Promise<Game> Persisted game payload from Neo4j.
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
            WITH game, server
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
            parameters: gameParams,
        };
    } finally {
        await session.close();
    }
}
