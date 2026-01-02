import { neo4jClient } from '../../../Setup/Neo4j.js';
import { Game } from './CreateRecord.js';

/**
 * Retrieve a Game node by UID along with its server reference.
 * @param uid string Game UID @example const game = await GetGame('game_123');
 * @returns Promise<Game | null> Game properties or null if not found.
 */
export async function GetGame(uid: string): Promise<Game | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (g:Game { uid: $uid })
            OPTIONAL MATCH (s:Server)-[:HAS_GAME]->(g)
            OPTIONAL MATCH (g)-[:HAS_PARAMETER]->(param:Parameter)
            RETURN g, s.id AS srvId, collect(param) AS params`;
        const result = await session.run(query, { uid });
        const record = result.records[0];
        if (!record) {
            return null;
        }

        const node = record.get(`g`);
        const props = node.properties;
        const srvId = record.get(`srvId`) as string | null;
        const paramNodes = record.get(`params`) as Array<{ properties: Record<string, unknown> }>;

        const parameters: Record<string, any> = {};
        for (const paramNode of paramNodes ?? []) {
            if (!paramNode || !paramNode.properties) {
                continue;
            }
            const key = String(paramNode.properties.key ?? ``);
            if (!key) {
                continue;
            }
            parameters[key] = paramNode.properties.value;
        }

        const descriptionText = typeof parameters.description === `string` ? parameters.description : undefined;

        return {
            uid: props.uid,
            id: props.id ?? props.uid,
            name: props.name,
            friendly_name: props.friendly_name ?? props.name,
            image: props.image,
            serverId: srvId || ``,
            parameters,
            description: descriptionText,
        };
    } finally {
        await session.close();
    }
}
