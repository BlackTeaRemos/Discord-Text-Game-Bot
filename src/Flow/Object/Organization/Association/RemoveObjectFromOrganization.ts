import { neo4jClient } from '../../../../Setup/Neo4j.js';
import { log } from '../../../../Common/Log.js';

export interface RemoveObjectFromOrganizationResult {
    success: boolean;
    error?: string;
}

/**
 * Remove any object association from an organization.
 * @param objectUid string Object uid to unassign. @example 'char_abc123'
 * @param organizationUid string Target organization uid. @example 'org_abc123'
 * @returns Promise<RemoveObjectFromOrganizationResult> Operation result. @example { success: true }
 */
export async function RemoveObjectFromOrganization(
    objectUid: string,
    organizationUid: string,
): Promise<RemoveObjectFromOrganizationResult> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (n { uid: $objectUid })-[r:BELONGS_TO]->(o:Organization { uid: $organizationUid })
            DELETE r
            SET n.organization_uid = null
            RETURN count(r) as deleted`;

        const result = await session.run(query, { objectUid, organizationUid });
        const deleted = result.records[0]?.get(`deleted`)?.toNumber?.() ?? 0;
        if (deleted === 0) {
            return { success: false, error: `Object is not associated with organization` };
        }

        log.info(
            `Object removed from organization`,
            `OrganizationRemoveObject`,
            `object=${objectUid} org=${organizationUid}`,
        );

        return { success: true };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to remove object from organization`, message, `OrganizationRemoveObject`);
        return { success: false, error: message };
    } finally {
        await session.close();
    }
}
