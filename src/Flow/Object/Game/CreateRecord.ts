import { randomUUID } from 'crypto';
import type { DBObject } from '../../../Repository/Object/Object.js';
import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * @brief Persisted game information stored in Neo4j
 */
export interface Game extends DBObject {
    image: string; // public URL of the game preview image
    serverId: string; // Discord server id owning the game
    parameters: Record<string, any>; // arbitrary game parameters captured during creation
    description?: string; // last known description associated with the game
}

/**
 * @brief Generates a unique game uid using a friendly prefix
 * @param prefix string Prefix attached before the random suffix @example "game"
 * @returns string Newly generated uid @example "game_1a2b3c"
 */
export function GenerateGameUid(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, ``)}`;
}

/**
 * @brief Creates a new Game node linked to a Server and fails if game name already exists for that server
 * @param name string Game name chosen by the user @example "Galaxy League"
 * @param image string URL pointing to the stored preview image @example "https://cdn.example/game.png"
 * @param serverId string Discord server id owning the game @example "123456789012345678"
 * @param uid string Optional client supplied uid
 * @param parameters Record of string to any Optional map of key value parameters
 * @returns Game Persisted game payload from Neo4j
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
        const timestamp = Date.now();

        const existingGameResult = await session.run(
            `
                MATCH (server:Server { id: $serverId })-[:HAS_GAME]->(existing:Game)
                RETURN count(existing) AS existingCount
            `,
            { serverId },
        );

        const existingCount = Number(existingGameResult.records[0]?.get(`existingCount`) ?? 0);
        if (existingCount > 0) {
            throw new Error(`Only one game per server is supported for now.`);
        }

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
            MERGE (game:Game:DBObject:Entity { uid: $uid })
            ON CREATE SET
                game.id = $uid,
                game.name = $name,
                game.friendly_name = $name,
                game.image = $image,
                game.server_id = $serverId,
                game.created_at = $timestamp,
                game.updated_at = $timestamp
            ON MATCH SET
                game.id = $uid,
                game.name = $name,
                game.friendly_name = $name,
                game.image = $image,
                game.server_id = $serverId,
                game.created_at = coalesce(game.created_at, $timestamp),
                game.updated_at = $timestamp
            MERGE (server)-[:HAS_GAME]->(game)
            WITH game, server
            UNWIND $paramEntries AS entry
            MERGE (game)-[:HAS_PARAMETER]->(param:Parameter { key: entry[0], value: entry[1] })
            RETURN game, server.id AS serverId`;
        const params = { uid: gameUid, name, image, serverId, paramEntries, timestamp };
        const result: any = await session.run(query, params);
        const record = result.records[0];
        const gameNode = record.get(`game`);
        const serverIdFromDb = record.get(`serverId`);
        const gameProps = gameNode.properties;
        const descriptionValue = typeof gameParams.description === `string` ? gameParams.description : undefined;
        return {
            uid: gameProps.uid,
            id: gameProps.id ?? gameProps.uid,
            name: gameProps.name,
            friendly_name: gameProps.friendly_name ?? gameProps.name,
            image: gameProps.image,
            serverId: serverIdFromDb,
            parameters: gameParams,
            description: descriptionValue,
        };
    } finally {
        await session.close();
    }
}

export interface UpdateGameOptions {
    name: string;
    image: string;
    parameters?: Record<string, any>;
}

/**
 * @brief Updates an existing Game node while ensuring server uniqueness and parameter synchronization
 * @param uid string Game identifier to update @example "game_123"
 * @param options UpdateGameOptions New game properties to persist @example await UpdateGame('game_123',{ name:'League', image:'https://...' })
 * @returns Game Updated game payload with merged parameters
 */
export async function UpdateGame(uid: string, options: UpdateGameOptions): Promise<Game> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const timestamp = Date.now();
        const existingResult = await session.run(
            `
                MATCH (game:Game { uid: $uid })
                OPTIONAL MATCH (server:Server)-[:HAS_GAME]->(game)
                OPTIONAL MATCH (game)-[:HAS_PARAMETER]->(param:Parameter)
                RETURN game, server.id AS serverId, collect(param) AS params
            `,
            { uid },
        );

        if (existingResult.records.length === 0) {
            throw new Error(`Game not found for update.`);
        }

        const record = existingResult.records[0];
        const serverId = (record.get(`serverId`) as string | null) ?? ``;
        const paramNodes = record.get(`params`) as Array<{ properties: Record<string, unknown> }>;
        const currentParameters: Record<string, any> = {};
        for (const node of paramNodes) {
            if (!node || !node.properties) {
                continue;
            }
            const key = String(node.properties.key ?? ``);
            if (!key) {
                continue;
            }
            currentParameters[key] = node.properties.value;
        }

        const conflictResult = await session.run(
            `
                MATCH (other:Game { name: $name, server_id: $serverId })
                WHERE other.uid <> $uid
                RETURN other LIMIT 1
            `,
            { name: options.name, serverId, uid },
        );
        if (conflictResult.records.length > 0) {
            throw new Error(`Game with this name already exists in the server`);
        }

        const mergedParameters = { ...currentParameters, ...(options.parameters ?? {}) };
        const paramEntries = Object.entries(mergedParameters);

        const updateResult = await session.run(
            `
                MATCH (game:Game { uid: $uid })
                OPTIONAL MATCH (game)-[rel:HAS_PARAMETER]->(existing:Parameter)
                DELETE rel, existing
                WITH game, $paramEntries AS entries
                SET game.name = $name,
                    game.friendly_name = $name,
                    game.image = $image,
                    game.created_at = coalesce(game.created_at, $timestamp),
                    game.updated_at = $timestamp
                FOREACH (entry IN entries |
                    CREATE (game)-[:HAS_PARAMETER]->(:Parameter { key: entry[0], value: entry[1] })
                )
                RETURN game
            `,
            {
                uid,
                name: options.name,
                image: options.image,
                paramEntries,
                timestamp,
            },
        );

        const updatedNode = updateResult.records[0]?.get(`game`);
        if (!updatedNode) {
            throw new Error(`Failed to persist updated game data.`);
        }

        const descriptionValue =
            typeof mergedParameters.description === `string` ? mergedParameters.description : undefined;

        return {
            uid,
            id: updatedNode.properties?.id ?? uid,
            name: options.name,
            friendly_name: updatedNode.properties?.friendly_name ?? options.name,
            image: options.image,
            serverId,
            parameters: mergedParameters,
            description: descriptionValue,
        };
    } finally {
        await session.close();
    }
}
