/**
 * Retrieve an organization with its members
 */

import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { UID } from '../../../../Repository/Common/Ids.js';
import type { OrganizationView, OrganizationWithMembers } from '../../../../Repository/Organization/Organization.js';
import { GetOrganizationHierarchy } from './GetOrganizationHierarchy.js';

/**
 * Retrieve an organization with its members
 * @param uid Organization unique identifier @example 'org_abc123'
 * @returns Promise of OrganizationWithMembers or null Organization with member list or null
 * @example
 * const organization = await GetOrganizationWithMembers('org_abc123');
 */
export async function GetOrganizationWithMembers(uid: UID): Promise<OrganizationWithMembers | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (o:Organization { uid: $uid })
            OPTIONAL MATCH (u:User)-[:BELONGS_TO]->(o)
            RETURN o, collect(u) as users
        `;

        const result = await session.run(query, { uid });
        const record = result.records[0];
        if (!record) {
            return null;
        }

        const organizationNode = record.get(`o`).properties;
        const userNodes = record.get(`users`) as any[];
        const hierarchyChain = await GetOrganizationHierarchy(uid);

        const organization: OrganizationView = {
            uid: organizationNode.uid,
            name: organizationNode.name,
            friendlyName: organizationNode.friendly_name,
            parentUid: organizationNode.parentUid ?? null,
            hierarchyChain,
        };

        const users = userNodes
            .filter(node => {
                return node !== null;
            })
            .map(node => {
                const properties = node.properties;
                return {
                    uid: properties.uid,
                    discordId: properties.discord_id,
                    name: properties.name,
                    friendlyName: properties.friendly_name,
                };
            });

        return { organization, users };
    } finally {
        await session.close();
    }
}
