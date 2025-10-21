import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * Retrieve unique organizations for user with deduplication.
 * @param discordId string User discord id. @example '123456789012345678'
 * @returns Promise<Array<{ uid: string; name: string }>> Deduplicated organization list. @example [{ uid: 'org_1', name: 'Acme Corp' }]
 */
export async function getUserOrganizations(discordId: string): Promise<Array<{ uid: string; name: string }>> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const res = await session.run(
            `MATCH (u:User { discord_id: $discordId })-[:BELONGS_TO]->(o:Organization)
             RETURN DISTINCT o.uid AS uid, o.name AS name
             ORDER BY o.name`,
            { discordId },
        );
        const seen = new Set<string>();
        const orgs: Array<{ uid: string; name: string }> = [];
        for (const r of res.records) {
            const uid = String(r.get(`uid`));
            if (!seen.has(uid)) {
                seen.add(uid);
                orgs.push({ uid, name: String(r.get(`name`)) });
            }
        }
        return orgs;
    } finally {
        await session.close();
    }
}

/**
 * Get organization details and auto-select if user has exactly one.
 * @param discordId string User discord id. @example '123456789012345678'
 * @returns Promise<{ selected: boolean; orgUid?: string; orgName?: string; orgs: Array<{ uid: string; name: string }> }> Selection result with org list. @example { selected: true, orgUid: 'org_1', orgName: 'Acme', orgs: [...] }
 */
export async function getOrganizationSelection(discordId: string): Promise<{
    selected: boolean;
    orgUid?: string;
    orgName?: string;
    orgs: Array<{ uid: string; name: string }>;
}> {
    const orgs = await getUserOrganizations(discordId);
    if (orgs.length === 1) {
        return {
            selected: true,
            orgUid: orgs[0].uid,
            orgName: orgs[0].name,
            orgs,
        };
    }
    return {
        selected: false,
        orgs,
    };
}
