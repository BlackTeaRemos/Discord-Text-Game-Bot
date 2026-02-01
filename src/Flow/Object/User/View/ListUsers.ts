import { neo4jClient } from '../../../../Setup/Neo4j.js';
import type { ViewUser } from './ViewUser.js';

/**
 * Retrieve all users from the database, ordered by name.
 * @returns Promise<ViewUser[]> Ordered collection of user view projections. @example await ListUsers();
 */
export async function ListUsers(): Promise<ViewUser[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const res = await session.run(
            `
            MATCH (u:User)
            RETURN u
            ORDER BY u.name
            `,
        );
        return res.records.map(record => {
            const props = record.get(`u`).properties;
            return {
                uid: props.uid,
                discord_id: props.discord_id,
                name: props.name,
                friendly_name: props.friendly_name,
                id: props.id,
            } as ViewUser;
        });
    } finally {
        await session.close();
    }
}
