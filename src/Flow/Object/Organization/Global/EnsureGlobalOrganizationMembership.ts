import { neo4jClient } from '../../../../Setup/Neo4j.js';
import { Log } from '../../../../Common/Log.js';
import type { UID } from '../../../../Repository/Common/Ids.js';
import { CreateUser } from '../../User/Create.js';
import { EnsureGlobalOrganization } from './EnsureGlobalOrganization.js';

/**
 * Result of ensuring global organization membership.
 * @property success Whether the membership exists or was created.
 * @property organizationUid Global organization UID.
 * @property error Error message when failed.
 */
export interface GlobalOrganizationMembershipResult {
    success: boolean;
    organizationUid: UID;
    error?: string;
}

/**
 * Ensure that the provided user is a member of the global organization.
 * Optionally creates a user record when missing.
 * @param discordId string Discord user id to enroll. @example '123456789012345678'
 * @param ensureUserRecord boolean Create a user node when missing. @example true
 * @returns Promise<GlobalOrganizationMembershipResult> Membership operation result.
 * @example
 * const result = await EnsureGlobalOrganizationMembership('123', true);
 */
export async function EnsureGlobalOrganizationMembership(
    discordId: string,
    ensureUserRecord: boolean,
): Promise<GlobalOrganizationMembershipResult> {
    const globalOrganization = await EnsureGlobalOrganization(); // resolved global organization snapshot

    if (ensureUserRecord) {
        await CreateUser({ discordId });
    }

    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })
            MATCH (o:Organization { uid: $orgUid })
            MERGE (u)-[:BELONGS_TO]->(o)
            RETURN o.uid AS orgUid
        `;

        const result = await session.run(query, {
            discordId,
            orgUid: globalOrganization.uid,
        });

        if (result.records.length === 0) {
            return {
                success: false,
                organizationUid: globalOrganization.uid,
                error: `User not found for global membership`,
            };
        }

        return { success: true, organizationUid: globalOrganization.uid };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to ensure global organization membership`, message, `OrganizationGlobal`);
        return {
            success: false,
            organizationUid: globalOrganization.uid,
            error: message,
        };
    } finally {
        await session.close();
    }
}
