import { neo4jClient } from '../../../../Setup/Neo4j.js';
import { Log } from '../../../../Common/Log.js';
import type { UID } from '../../../../Repository/Common/Ids.js';
import { CheckCircularDependency } from './CheckCircularDependency.js';
import type { SetParentResult } from './Types.js';

/**
 * Set or change the parent organization for a target organization.
 * Validates against circular dependencies before making changes.
 * Also maintains PARENT_OF relationship in Neo4j.
 * @param targetUid UID of organization to modify. @example 'org_child123'
 * @param newParentUid UID of new parent organization, or null to make root. @example 'org_parent456'
 * @returns Promise<SetParentResult> Operation result.
 * @example
 * const result = await SetOrganizationParent('org_child', 'org_parent');
 */
export async function SetOrganizationParent(
    targetUid: UID,
    newParentUid: UID | null,
): Promise<SetParentResult> {
    if (newParentUid !== null) {
        const circularCheck = await CheckCircularDependency(newParentUid, targetUid);
        if (!circularCheck.valid) {
            return {
                success: false,
                error: circularCheck.reason,
            };
        }
    }

    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const removeOldParentQuery = `
            MATCH (target:Organization { uid: $targetUid })
            OPTIONAL MATCH (oldParent:Organization)-[r:PARENT_OF]->(target)
            DELETE r
            SET target.parentUid = $newParentUid
            RETURN target
        `;

        await session.run(removeOldParentQuery, { targetUid, newParentUid });

        if (newParentUid !== null) {
            const createNewParentQuery = `
                MATCH (parent:Organization { uid: $newParentUid })
                MATCH (target:Organization { uid: $targetUid })
                MERGE (parent)-[:PARENT_OF]->(target)
            `;

            await session.run(createNewParentQuery, { targetUid, newParentUid });
        }

        Log.info(
            `Updated organization parent: ${targetUid}`,
            `OrganizationHierarchy`,
            `newParent=${newParentUid ?? `none`}`,
        );

        return { success: true };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to set organization parent`, message, `OrganizationHierarchy`);
        return { success: false, error: message };
    } finally {
        await session.close();
    }
}
