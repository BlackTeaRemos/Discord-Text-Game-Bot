/**
 * Retrieve organizations a user belongs to
 */

import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { OrganizationView } from '../../../../Repository/Organization/Organization.js';
import { GetOrganizationHierarchy } from './GetOrganizationHierarchy.js';

/**
 * Get all organizations a user belongs to including inherited access from hierarchy
 * @param discordId Users Discord identifier @example '123456789012345678'
 * @returns Promise of OrganizationView array List of organizations user has access to
 * @example
 * const organizations = await GetUserOrganizations('123456789');
 */
export async function GetUserOrganizations(discordId: string): Promise<OrganizationView[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })-[:BELONGS_TO]->(o:Organization)
            RETURN o
        `;

        const result = await session.run(query, { discordId });
        const organizations: OrganizationView[] = [];

        for (const record of result.records) {
            const properties = record.get(`o`).properties;
            const hierarchyChain = await GetOrganizationHierarchy(properties.uid);
            organizations.push({
                uid: properties.uid,
                name: properties.name,
                friendlyName: properties.friendly_name,
                parentUid: properties.parentUid ?? null,
                hierarchyChain,
            });
        }

        return organizations;
    } finally {
        await session.close();
    }
}
