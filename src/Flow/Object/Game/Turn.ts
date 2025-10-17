import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Get the game for a server.
 * @param serverId Discord server ID
 * @returns Game properties or null if not found
 */
export async function getGameForServer(
    serverId: string,
): Promise<{ uid: string; name: string; image: string; parameters: Record<string, any> } | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const result = await session.run(
            `
            MATCH (server:Server { id: $serverId })-[:HAS_GAME]->(game:Game)
            OPTIONAL MATCH (game)-[:HAS_PARAMETER]->(param:Parameter)
            RETURN game, collect({key: param.key, value: param.value}) AS parameters LIMIT 1`,
            {
                serverId,
            },
        );
        if (result.records.length === 0) {
            return null;
        }
        const record = result.records[0];
        const gameNode = record.get(`game`);
        const parametersArray = record.get(`parameters`);
        const parameters: Record<string, any> = {};
        for (const parameter of parametersArray) {
            parameters[parameter.key] = parameter.value;
        }
        return {
            uid: gameNode.properties.uid,
            name: gameNode.properties.name,
            image: gameNode.properties.image,
            parameters,
        };
    } finally {
        await session.close();
    }
}

/**
 * Update the current turn for a game.
 * @param gameUid Game UID
 * @param newTurn New turn number
 */
export async function updateGameTurn(gameUid: string, newTurn: number): Promise<void> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        await session.run(
            `MATCH (game:Game { uid: $uid })-[:HAS_PARAMETER]->(param:Parameter { key: 'currentTurn' })
            SET param.value = $value`,
            { uid: gameUid, value: newTurn.toString() },
        );
    } finally {
        await session.close();
    }
}
