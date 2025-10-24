import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { ViewUser } from './ViewUser.js';

/**
 * Retrieve a single user by discord identifier.
 * @param discordId string Discord user identifier. @example await GetUserByDiscordId('1234567890')
 * @returns Promise<ViewUser | null> Matching user when found, otherwise null. @example await GetUserByDiscordId('1234567890');
 */
export async function GetUserByDiscordId(discordId: string): Promise<ViewUser | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const res = await session.run(
            `
            MATCH (u:User { discord_id: $discordId })
            RETURN u
            `,
            { discordId },
        );
        if (res.records.length === 0) {
            return null;
        }
        const props = res.records[0].get(`u`).properties;
        return {
            uid: props.uid,
            discord_id: props.discord_id,
            name: props.name,
            friendly_name: props.friendly_name,
            id: props.id,
        } as ViewUser;
    } finally {
        await session.close();
    }
}
