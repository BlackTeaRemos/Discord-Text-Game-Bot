import type { OrganizationView } from '../../../../Repository/Organization/Organization.js';
import type { TokenSegmentInput } from '../../../../Common/Permission/index.js';
import type { OrganizationResolveOptions, OrganizationResolveResult } from './Types.js';

/**
 * Request admin approval if available, otherwise return denial.
 * @param options OrganizationResolveOptions Resolution configuration.
 * @param targetOrganization Organization target metadata.
 * @param reason Denial reason for approval request.
 * @returns Promise<OrganizationResolveResult> Resolution result.
 */
export async function RequestApprovalIfAvailable(
    options: OrganizationResolveOptions,
    targetOrganization: OrganizationView,
    reason: string,
): Promise<OrganizationResolveResult> {
    const { requestApproval, skipApproval, context } = options;

    if (skipApproval || !requestApproval) {
        return {
            allowed: false,
            reason,
            requiresApproval: true,
        };
    }

    const permissionToken: TokenSegmentInput[] = [
        `organization`,
        ...targetOrganization.hierarchyChain,
        context.action,
    ];

    if (context.additionalToken) {
        permissionToken.push(context.additionalToken);
    }

    const decision = await requestApproval({
        tokens: [permissionToken],
        reason: `User ${context.userId} wants to execute ${context.action} from ${targetOrganization.friendlyName}. Allow?`,
    });

    if (decision === `approve_once` || decision === `approve_forever`) {
        return {
            allowed: true,
            matchedOrganization: targetOrganization,
            decision,
        };
    }

    return {
        allowed: false,
        reason,
        requiresApproval: true,
        decision,
    };
}
