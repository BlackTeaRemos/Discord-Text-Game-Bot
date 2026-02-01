import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { UID } from '../../../../Repository/Common/Ids.js';
import type { OrganizationView } from '../../../../Repository/Organization/Organization.js';
import { GetOrganizationHierarchy } from './GetOrganizationHierarchy.js';

/**
 * Get all child organizations for a given parent organization.
 * @param parentUid Parent organization UID. @example 'org_parent123'
 * @returns Promise<OrganizationView[]> List of direct child organizations.
 * @example
 * const children = await GetChildOrganizations('org_parent123');
 */
export async function GetChildOrganizations(parentUid: UID): Promise<OrganizationView[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (child:Organization { parentUid: $parentUid })
            RETURN child
        `;

        const result = await session.run(query, { parentUid });
        const children: OrganizationView[] = [];

        for (const record of result.records) {
            const properties = record.get(`child`).properties;
            const hierarchyChain = await GetOrganizationHierarchy(properties.uid);
            children.push({
                uid: properties.uid,
                name: properties.name,
                friendlyName: properties.friendly_name,
                parentUid: properties.parentUid ?? null,
                hierarchyChain,
            });
        }

        return children;
    } finally {
        await session.close();
    }
}
