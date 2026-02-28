import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { ViewUser } from './ViewUser.js';

/**
 * Retrieve a single user by internal uid
 * @param uid string Unique identifier to lookup @example await GetUserByUid('user_123')
 * @returns Promise of ViewUser or null Matching user when found otherwise null @example await GetUserByUid('user_123');
 */
export async function GetUserByUid(uid: string): Promise<ViewUser | null> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const res = await session.run(
            `
            MATCH (u:User { uid: $uid })
            RETURN u
            `,
            { uid },
        );
        if (res.records.length === 0) {
            return null;
        }
        const props = res.records[0].get(`u`).properties;
        return {
            uid: props.uid,
            discord_id: props.discord_id,
            name: props.name,
            friendly_name: props.friendly_name,
            id: props.id,
            image: props.image,
        } as ViewUser;
    } finally {
        await session.close();
    }
}
