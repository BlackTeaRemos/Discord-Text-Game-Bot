import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { UID } from '../../../../Repository/Common/Ids.js';
import type { OrganizationView } from '../../../../Repository/Organization/Organization.js';
import { GetOrganizationHierarchy } from './GetOrganizationHierarchy.js';

/**
 * Get all descendant organizations including recursive children for a given parent
 * @param parentUid Parent organization UID @example 'org_parent123'
 * @returns Promise of OrganizationView array List of all descendant organizations
 * @example
 * const descendants = await GetDescendantOrganizations('org_corp');
 */
export async function GetDescendantOrganizations(parentUid: UID): Promise<OrganizationView[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (parent:Organization { uid: $parentUid })-[:PARENT_OF*1..100]->(descendant:Organization)
            RETURN descendant
        `;

        const result = await session.run(query, { parentUid });
        const descendants: OrganizationView[] = [];

        for (const record of result.records) {
            const properties = record.get(`descendant`).properties;
            const hierarchyChain = await GetOrganizationHierarchy(properties.uid);
            descendants.push({
                uid: properties.uid,
                name: properties.name,
                friendlyName: properties.friendly_name,
                parentUid: properties.parentUid ?? null,
                hierarchyChain,
            });
        }

        return descendants;
    } finally {
        await session.close();
    }
}
