import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { HierarchyIntegrityResult } from './Types.js';

/**
 * Validate that an organization hierarchy is consistent (no orphans, no cycles).
 * Useful for maintenance and data integrity checks.
 * @returns Promise<HierarchyIntegrityResult> Validation result with any issues found.
 */
export async function ValidateHierarchyIntegrity(): Promise<HierarchyIntegrityResult> {
    const session = await neo4jClient.GetSession(`READ`);
    const issues: string[] = [];

    try {
        const orphanQuery = `
            MATCH (o:Organization)
            WHERE o.parentUid IS NOT NULL
            AND NOT EXISTS {
                MATCH (parent:Organization { uid: o.parentUid })
            }
            RETURN o.uid as orphanUid, o.parentUid as missingParent
        `;

        const orphanResult = await session.run(orphanQuery);
        for (const record of orphanResult.records) {
            const orphanUid = record.get(`orphanUid`);
            const missingParent = record.get(`missingParent`);
            issues.push(`Organization ${orphanUid} references non-existent parent ${missingParent}`);
        }

        const cycleQuery = `
            MATCH (o:Organization)
            WHERE EXISTS {
                MATCH path = (o)-[:PARENT_OF*1..100]->(o)
            }
            RETURN o.uid as cycleNode
        `;

        const cycleResult = await session.run(cycleQuery);
        for (const record of cycleResult.records) {
            const cycleNode = record.get(`cycleNode`);
            issues.push(`Organization ${cycleNode} is part of a circular dependency`);
        }

        const mismatchQuery = `
            MATCH (parent)-[:PARENT_OF]->(child:Organization)
            WHERE child.parentUid <> parent.uid
            RETURN child.uid as childUid, parent.uid as actualParent, child.parentUid as recordedParent
        `;

        const mismatchResult = await session.run(mismatchQuery);
        for (const record of mismatchResult.records) {
            const childUid = record.get(`childUid`);
            const actualParent = record.get(`actualParent`);
            const recordedParent = record.get(`recordedParent`);
            issues.push(
                `Organization ${childUid} has mismatched parent: ` +
                `relationship says ${actualParent} but property says ${recordedParent}`,
            );
        }

        return { valid: issues.length === 0, issues };
    } finally {
        await session.close();
    }
}
