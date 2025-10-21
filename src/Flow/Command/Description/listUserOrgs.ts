import { neo4jClient } from '../../../Setup/Neo4j.js';

/**
 * List organizations a user belongs to.
 * @param discordId string Discord id of the user
 * @returns Promise<Array<{ uid: string; name: string }>>
 */
export async function listUserOrgs(discordId: string) {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const res = await session.run(
            `MATCH (u:User { discord_id: $discordId })-[:BELONGS_TO]->(o:Organization) RETURN DISTINCT o.uid AS uid, o.name AS name`,
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
