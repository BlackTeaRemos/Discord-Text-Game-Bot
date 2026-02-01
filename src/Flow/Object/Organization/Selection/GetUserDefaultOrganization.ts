import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { UID } from '../../../../Repository/Common/Ids.js';

/**
 * Get the default organization UID for a Discord user.
 * @param discordId Discord user ID. @example '1234567890'
 * @returns Promise<UID | null> Default organization UID or null.
 * @example
 * const defaultOrg = await GetUserDefaultOrganization('123');
 */
export async function GetUserDefaultOrganization(discordId: string): Promise<UID | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })
            RETURN u.defaultOrganizationUid as defaultOrg
        `;

        const result = await session.run(query, { discordId });
        if (result.records.length === 0) {
            return null;
        }

        const value = result.records[0].get(`defaultOrg`);
        return value ? String(value) as UID : null;
    } finally {
        await session.close();
    }
}
