import { neo4jClient } from '../../../Setup/Neo4j.js';
import { Log } from '../../../Common/Log.js';
import type { UID } from '../../../Repository/Common/Ids.js';
import { EnsureUserDefaultOrganization } from './Selection/index.js';

/**
 * Result of membership operation.
 * @property success Whether the operation completed successfully.
 * @property error Error message when failed.
 */
export interface MembershipOperationResult {
    success: boolean;
    error?: string;
}

/**
 * Add a user to an organization by creating BELONGS_TO relationship.
 * @param userDiscordId Discord ID of the user to add. @example '123456789012345678'
 * @param organizationUid Target organization UID. @example 'org_abc123'
 * @returns Promise<MembershipOperationResult> Operation result.
 * @example
 * const result = await AddUserToOrganization('123456789', 'org_abc123');
 */
export async function AddUserToOrganization(
    userDiscordId: string,
    organizationUid: UID,
): Promise<MembershipOperationResult> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })
            MATCH (o:Organization { uid: $orgUid })
            MERGE (u)-[:BELONGS_TO]->(o)
            RETURN u, o
        `;

        const result = await session.run(query, {
            discordId: userDiscordId,
            orgUid: organizationUid,
        });

        if (result.records.length === 0) {
            return {
                success: false,
                error: `User or organization not found`,
            };
        }

        Log.info(
            `User added to organization`,
            `OrganizationMembership`,
            `user=${userDiscordId} org=${organizationUid}`,
        );

        await EnsureUserDefaultOrganization(userDiscordId);

        return { success: true };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to add user to organization`, message, `OrganizationMembership`);
        return { success: false, error: message };
    } finally {
        await session.close();
    }
}

/**
 * Remove a user from an organization by deleting BELONGS_TO relationship.
 * @param userDiscordId Discord ID of the user to remove. @example '123456789012345678'
 * @param organizationUid Target organization UID. @example 'org_abc123'
 * @returns Promise<MembershipOperationResult> Operation result.
 * @example
 * const result = await RemoveUserFromOrganization('123456789', 'org_abc123');
 */
export async function RemoveUserFromOrganization(
    userDiscordId: string,
    organizationUid: UID,
): Promise<MembershipOperationResult> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })-[r:BELONGS_TO]->(o:Organization { uid: $orgUid })
            DELETE r
            RETURN count(r) as deleted
        `;

        const result = await session.run(query, {
            discordId: userDiscordId,
            orgUid: organizationUid,
        });

        const deleted = result.records[0]?.get(`deleted`)?.toNumber() ?? 0;
        if (deleted === 0) {
            return {
                success: false,
                error: `User is not a member of this organization`,
            };
        }

        Log.info(
            `User removed from organization`,
            `OrganizationMembership`,
            `user=${userDiscordId} org=${organizationUid}`,
        );

        await EnsureUserDefaultOrganization(userDiscordId);

        return { success: true };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to remove user from organization`, message, `OrganizationMembership`);
        return { success: false, error: message };
    } finally {
        await session.close();
    }
}

/**
 * Check if a user belongs to a specific organization (direct membership only).
 * @param userDiscordId Discord ID of the user. @example '123456789012345678'
 * @param organizationUid Target organization UID. @example 'org_abc123'
 * @returns Promise<boolean> True if user is a direct member.
 * @example
 * const isMember = await IsUserMemberOfOrganization('123456789', 'org_abc123');
 */
export async function IsUserMemberOfOrganization(
    userDiscordId: string,
    organizationUid: UID,
): Promise<boolean> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })-[:BELONGS_TO]->(o:Organization { uid: $orgUid })
            RETURN count(u) as memberCount
        `;

        const result = await session.run(query, {
            discordId: userDiscordId,
            orgUid: organizationUid,
        });

        const memberCount = result.records[0]?.get(`memberCount`)?.toNumber() ?? 0;
        return memberCount > 0;
    } finally {
        await session.close();
    }
}

/**
 * Get all organization UIDs that a user directly belongs to.
 * Does not include inherited access from hierarchy.
 * @param userDiscordId Discord ID of the user. @example '123456789012345678'
 * @returns Promise<UID[]> List of organization UIDs.
 * @example
 * const orgUids = await GetUserDirectMemberships('123456789');
 */
export async function GetUserDirectMemberships(
    userDiscordId: string,
): Promise<UID[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })-[:BELONGS_TO]->(o:Organization)
            RETURN o.uid as orgUid
        `;

        const result = await session.run(query, { discordId: userDiscordId });
        return result.records.map(record => {
            return record.get(`orgUid`) as UID;
        });
    } finally {
        await session.close();
    }
}

/**
 * Add the creator as a member of the organization during creation.
 * Called automatically after organization creation.
 * @param creatorDiscordId Discord ID of the creator. @example '123456789012345678'
 * @param organizationUid Created organization UID. @example 'org_abc123'
 * @returns Promise<MembershipOperationResult> Operation result.
 */
export async function AddCreatorAsOrganizationMember(
    creatorDiscordId: string,
    organizationUid: UID,
): Promise<MembershipOperationResult> {
    return AddUserToOrganization(creatorDiscordId, organizationUid);
}
