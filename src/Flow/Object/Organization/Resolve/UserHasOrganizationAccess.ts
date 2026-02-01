import type { UID } from '../../../../Repository/Common/Ids.js';
import { ResolveOrganization } from './ResolveOrganization.js';

/**
 * Check if a user has access to an organization either directly or via hierarchy.
 * Simpler version of ResolveOrganization for quick checks.
 * @param organizationUid Target organization UID. @example 'org_abc123'
 * @param userId Discord user ID. @example '123456789'
 * @returns Promise<boolean> True if user has access.
 * @example
 * const hasAccess = await UserHasOrganizationAccess('org_abc123', '123456789');
 */
export async function UserHasOrganizationAccess(
    organizationUid: UID,
    userId: string,
): Promise<boolean> {
    const result = await ResolveOrganization({
        context: {
            organizationUid,
            userId,
            action: `access`,
        },
        skipApproval: true,
    });

    return result.allowed;
}
