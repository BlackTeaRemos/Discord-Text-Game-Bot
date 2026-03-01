import { neo4jClient } from '../../../../Setup/Neo4j.js';
import { Log } from '../../../../Common/Log.js';

export interface AssignObjectToOrganizationResult {
    success: boolean;
    error?: string;
}

/**
 * Assign any object to an organization via BELONGS_TO relationship.
 * @param objectUid string Object uid to assign. @example 'char_abc123'
 * @param organizationUid string Target organization uid. @example 'org_abc123'
 * @returns Promise<AssignObjectToOrganizationResult> Operation result. @example { success: true }
 */
export async function AssignObjectToOrganization(
    objectUid: string,
    organizationUid: string,
): Promise<AssignObjectToOrganizationResult> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (o:Organization { uid: $organizationUid })
            MATCH (n { uid: $objectUid })
            MERGE (n)-[:BELONGS_TO]->(o)
            SET n.organization_uid = $organizationUid
            RETURN n`;

        const result = await session.run(query, { objectUid, organizationUid });
        if (result.records.length === 0) {
            return { success: false, error: `Object or organization not found` };
        }

        Log.info(
            `Object assigned to organization`,
            `OrganizationAssignObject`,
            `object=${objectUid} org=${organizationUid}`,
        );

        return { success: true };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to assign object to organization`, message, `OrganizationAssignObject`);
        return { success: false, error: message };
    } finally {
        await session.close();
    }
}
