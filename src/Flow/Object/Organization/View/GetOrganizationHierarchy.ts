/**
 * Build hierarchy chain from root to a target organization.
 */

import { neo4jClient } from '../../../../Setup/Neo4j.js';
import { log } from '../../../../Common/Log.js';
import type { UID } from '../../../../Repository/Common/Ids.js';

/**
 * Build the hierarchy chain from root organization to specified target.
 * Returns ordered list of UIDs from root to target.
 * @param uid Target organization UID. @example 'org_abc123'
 * @returns Promise<UID[]> Ordered list from root to target.
 * @example
 * const chain = await GetOrganizationHierarchy('org_abc123');
 */
export async function GetOrganizationHierarchy(uid: UID): Promise<UID[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (target:Organization { uid: $uid })
            CALL {
                WITH target
                MATCH path = (ancestor:Organization)-[:PARENT_OF*0..100]->(target)
                WHERE ancestor.parentUid IS NULL
                RETURN path
                ORDER BY length(path) DESC
                LIMIT 1
            }
            RETURN [node IN nodes(path) | node.uid] as chain
        `;

        const result = await session.run(query, { uid });
        if (result.records.length === 0) {
            const simpleQuery = `
                MATCH (o:Organization { uid: $uid })
                OPTIONAL MATCH path = (root:Organization)-[:PARENT_OF*0..100]->(o)
                WHERE root.parentUid IS NULL
                WITH o, path
                ORDER BY CASE WHEN path IS NULL THEN 0 ELSE length(path) END DESC
                LIMIT 1
                RETURN CASE
                    WHEN path IS NULL THEN [o.uid]
                    ELSE [node IN nodes(path) | node.uid]
                END as chain
            `;

            const simpleResult = await session.run(simpleQuery, { uid });
            if (simpleResult.records.length === 0) {
                return [uid];
            }
            return simpleResult.records[0].get(`chain`) as UID[];
        }

        return result.records[0].get(`chain`) as UID[];
    } catch(error) {
        log.warning(
            `Failed to build hierarchy chain for ${uid}`,
            `OrganizationView`,
            error instanceof Error ? error.message : String(error),
        );
        return [uid];
    } finally {
        await session.close();
    }
}
