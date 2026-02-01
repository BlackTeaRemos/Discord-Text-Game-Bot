import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { UID } from '../../../../Repository/Common/Ids.js';

/**
 * Set the default organization UID for a Discord user.
 * @param discordId Discord user ID. @example '1234567890'
 * @param organizationUid Organization UID to set, or null to clear. @example 'org_abc123'
 * @returns Promise<void> Resolves when stored.
 * @example
 * await SetUserDefaultOrganization('123', 'org_abc123');
 */
export async function SetUserDefaultOrganization(
    discordId: string,
    organizationUid: UID | null,
): Promise<void> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MERGE (u:User { discord_id: $discordId })
            SET u.defaultOrganizationUid = $organizationUid
            RETURN u
        `;

        await session.run(query, { discordId, organizationUid });
    } finally {
        await session.close();
    }
}
