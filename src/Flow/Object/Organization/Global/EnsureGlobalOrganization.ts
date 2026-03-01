import { neo4jClient } from '../../../../Setup/Neo4j.js';
import { Log } from '../../../../Common/Log.js';
import type { OrganizationView } from '../../../../Repository/Organization/Organization.js';
import { GetOrganizationHierarchy } from '../View/GetOrganizationHierarchy.js';
import {
    GLOBAL_ORGANIZATION_UID,
    GLOBAL_ORGANIZATION_NAME,
    GLOBAL_ORGANIZATION_FRIENDLY_NAME,
    GLOBAL_ORGANIZATION_CREATED_BY,
} from './Constants.js';

/**
 * Create or retrieve the global organization node.
 * @returns Promise<OrganizationView> Global organization snapshot.
 * @example
 * const globalOrg = await EnsureGlobalOrganization();
 */
export async function EnsureGlobalOrganization(): Promise<OrganizationView> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const createdAt = Date.now(); // creation timestamp
        const query = `
            MERGE (o:Organization { uid: $uid })
            ON CREATE SET
                o.name = $name,
                o.friendly_name = $friendlyName,
                o.parentUid = null,
                o.createdAt = $createdAt,
                o.createdBy = $createdBy
            ON MATCH SET
                o.name = coalesce(o.name, $name),
                o.friendly_name = coalesce(o.friendly_name, $friendlyName)
            RETURN o
        `;

        const result = await session.run(query, {
            uid: GLOBAL_ORGANIZATION_UID,
            name: GLOBAL_ORGANIZATION_NAME,
            friendlyName: GLOBAL_ORGANIZATION_FRIENDLY_NAME,
            createdAt,
            createdBy: GLOBAL_ORGANIZATION_CREATED_BY,
        });

        const record = result.records[0];
        const nodeProperties = record?.get(`o`)?.properties;
        if (!nodeProperties) {
            throw new Error(`Failed to ensure global organization`);
        }

        const hierarchyChain = await GetOrganizationHierarchy(nodeProperties.uid);

        return {
            uid: nodeProperties.uid,
            name: nodeProperties.name,
            friendlyName: nodeProperties.friendly_name,
            parentUid: nodeProperties.parentUid ?? null,
            hierarchyChain,
        };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to ensure global organization`, message, `OrganizationGlobal`);
        throw error;
    } finally {
        await session.close();
    }
}
