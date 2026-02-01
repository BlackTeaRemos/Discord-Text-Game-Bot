/**
 * Retrieve a single organization by UID.
 */

import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { UID } from '../../../../Repository/Common/Ids.js';
import type { OrganizationView } from '../../../../Repository/Organization/Organization.js';
import { GetOrganizationHierarchy } from './GetOrganizationHierarchy.js';

/**
 * Retrieve a single organization by UID.
 * @param uid Organization unique identifier. @example 'org_abc123'
 * @returns Promise<OrganizationView | null> Organization data or null if not found.
 * @example
 * const organization = await GetOrganizationByUid('org_abc123');
 */
export async function GetOrganizationByUid(uid: UID): Promise<OrganizationView | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (o:Organization { uid: $uid })
            RETURN o
        `;

        const result = await session.run(query, { uid });
        if (result.records.length === 0) {
            return null;
        }

        const nodeProperties = result.records[0].get(`o`).properties;
        const hierarchyChain = await GetOrganizationHierarchy(uid);

        return {
            uid: nodeProperties.uid,
            name: nodeProperties.name,
            friendlyName: nodeProperties.friendly_name,
            parentUid: nodeProperties.parentUid ?? null,
            hierarchyChain,
        };
    } finally {
        await session.close();
    }
}
