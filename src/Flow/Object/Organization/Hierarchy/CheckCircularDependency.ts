import { neo4jClient } from '../../../../Setup/Neo4j.js';
import { log } from '../../../../Common/Log.js';
import type { UID } from '../../../../Repository/Common/Ids.js';
import type { CircularDependencyCheckResult } from './Types.js';

/**
 * Check if setting a parent organization would create a circular dependency.
 * Validates that the proposed parent is not a descendant of the target organization.
 * @param proposedParentUid UID of the organization to become parent. @example 'org_parent123'
 * @param targetOrganizationUid UID of the organization receiving new parent (null for new organizations). @example 'org_child456'
 * @returns Promise<CircularDependencyCheckResult> Validation result.
 * @example
 * const result = await CheckCircularDependency('org_parent', 'org_child');
 * if (!result.valid) {
 *   console.log(`Cannot set parent: ${result.reason}`);
 * }
 */
export async function CheckCircularDependency(
    proposedParentUid: UID,
    targetOrganizationUid: UID | null,
): Promise<CircularDependencyCheckResult> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const parentExistsQuery = `
            MATCH (p:Organization { uid: $parentUid })
            RETURN p
        `;
        const parentExists = await session.run(parentExistsQuery, { parentUid: proposedParentUid });

        if (parentExists.records.length === 0) {
            return {
                valid: false,
                reason: `Parent organization ${proposedParentUid} does not exist`,
            };
        }

        if (targetOrganizationUid === null) {
            return { valid: true };
        }

        if (proposedParentUid === targetOrganizationUid) {
            return {
                valid: false,
                reason: `Organization cannot be its own parent`,
                chain: [targetOrganizationUid],
            };
        }

        const circularCheckQuery = `
            MATCH (target:Organization { uid: $targetUid })
            MATCH path = (target)-[:PARENT_OF*1..100]->(proposed:Organization { uid: $proposedParentUid })
            RETURN [node IN nodes(path) | node.uid] as chain
            LIMIT 1
        `;

        const circularResult = await session.run(circularCheckQuery, {
            targetUid: targetOrganizationUid,
            proposedParentUid,
        });

        if (circularResult.records.length > 0) {
            const chain = circularResult.records[0].get(`chain`) as UID[];
            return {
                valid: false,
                reason: `Setting ${proposedParentUid} as parent would create circular dependency`,
                chain,
            };
        }

        return { valid: true };
    } catch(error) {
        log.error(
            `Failed to check circular dependency`,
            error instanceof Error ? error.message : String(error),
            `OrganizationHierarchy`,
        );
        return {
            valid: false,
            reason: `Failed to validate hierarchy: ${error instanceof Error ? error.message : String(error)}`,
        };
    } finally {
        await session.close();
    }
}
