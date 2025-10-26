/**
 * Game variable persistence utilities ensure that each game owns a JSON payload stored in Neo4j.
 */
import { neo4jClient } from '../../../../Setup/Neo4j.js';
import { log } from '../../../../Common/Log.js';

/**
 * Persisted game variable response structure.
 * @property gameUid string Game identifier associated with the variable entry. @example 'game_abc'
 * @property payload Record<string, unknown> Stored JSON payload. @example { currentTurn: 1 }
 */
export interface GameVariableResult {
    gameUid: string;
    payload: Record<string, unknown>;
}

/**
 * Persist JSON variables for a game, creating the variable node when missing.
 * @param options Object Arguments describing the game uid and payload.
 * @param options.gameUid string Unique identifier of the game receiving variables. @example 'game_123'
 * @param options.payload Record<string, unknown> JSON payload to store alongside the game. @example { currentTurn: 1 }
 * @returns Promise<GameVariableResult> Stored payload echo with the game uid.
 * @example
 * const result = await CreateGameVariable({ gameUid: 'game_123', payload: { currentTurn: 2 } });
 */
export async function CreateGameVariable(options: {
    gameUid: string;
    payload: Record<string, unknown>;
}): Promise<GameVariableResult> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const normalizedPayload = options.payload ?? {};
        const payloadJson = JSON.stringify(normalizedPayload);
        const result = await session.run(
            `MATCH (game:Game { uid: $gameUid })
            MERGE (game)-[:HAS_VARIABLE_STORE]->(store:GameVariable { game_uid: $gameUid })
            SET store.payload = $payloadJson
            RETURN store`,
            { gameUid: options.gameUid, payloadJson },
        );
        if (result.records.length === 0) {
            throw new Error(`Game ${options.gameUid} not found`);
        }
        return {
            gameUid: options.gameUid,
            payload: normalizedPayload,
        };
    } catch (error) {
        log.error(
            `Failed to persist game variables: ${String(error)}`,
            `Flow/Object/Game/Variable`,
            `CreateGameVariable`,
        );
        throw error;
    } finally {
        await session.close();
    }
}
