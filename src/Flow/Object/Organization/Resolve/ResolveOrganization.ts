import { log } from '../../../../Common/Log.js';
import { GetOrganizationByUid } from '../View/GetOrganizationByUid.js';
import { GetUserOrganizations } from '../View/GetUserOrganizations.js';
import type { OrganizationResolveOptions, OrganizationResolveResult } from './Types.js';
import { BuildPermissionPath } from './BuildPermissionPath.js';
import { RequestApprovalIfAvailable } from './RequestApprovalIfAvailable.js';

/**
 * Resolve whether a user can perform an action from an organization's viewpoint.
 * Checks both direct membership and inherited access through hierarchy.
 *
 * Permission token format: organization:{rootOrg}:{parentOrg}:{childOrg}:{action}
 * A user in a parent org can access child org resources (prefix matching).
 * A user in a child org CANNOT access parent org resources.
 *
 * @param options OrganizationResolveOptions Resolution configuration.
 * @returns Promise<OrganizationResolveResult> Resolution outcome.
 *
 * @example
 * const result = await ResolveOrganization({
 *   context: {
 *     organizationUid: 'org_3rd_division',
 *     userId: '123456789',
 *     action: 'view'
 *   }
 * });
 */
export async function ResolveOrganization(
    options: OrganizationResolveOptions,
): Promise<OrganizationResolveResult> {
    const { context } = options;
    const { organizationUid, userId, action } = context;

    log.debug(
        `Resolving organization permission`,
        `OrganizationResolve`,
        `org=${organizationUid} user=${userId} action=${action}`,
    );

    const targetOrganization = await GetOrganizationByUid(organizationUid);
    if (!targetOrganization) {
        return {
            allowed: false,
            reason: `Organization ${organizationUid} not found`,
        };
    }

    const userOrganizations = await GetUserOrganizations(userId);
    if (userOrganizations.length === 0) {
        log.debug(
            `User has no organization memberships`,
            `OrganizationResolve`,
            `user=${userId}`,
        );
        return await RequestApprovalIfAvailable(
            options,
            targetOrganization,
            `User does not belong to any organization`,
        );
    }

    const targetHierarchy = targetOrganization.hierarchyChain;
    const targetPermissionPath = BuildPermissionPath(targetHierarchy);

    for (const userOrganization of userOrganizations) {
        const userHierarchy = userOrganization.hierarchyChain;
        const userPermissionPath = BuildPermissionPath(userHierarchy);

        if (targetPermissionPath.startsWith(userPermissionPath)) {
            log.info(
                `Permission granted via hierarchy match`,
                `OrganizationResolve`,
                `user=${userId} org=${organizationUid} matchedVia=${userOrganization.uid}`,
            );

            return {
                allowed: true,
                matchedOrganization: userOrganization,
            };
        }
    }

    log.debug(
        `No hierarchy match found for user organizations`,
        `OrganizationResolve`,
        `user=${userId} target=${organizationUid}`,
    );

    return await RequestApprovalIfAvailable(
        options,
        targetOrganization,
        `User's organizations do not have access to ${targetOrganization.friendlyName}`,
    );
}
