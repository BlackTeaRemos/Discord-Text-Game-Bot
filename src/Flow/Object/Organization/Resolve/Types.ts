import type { UID } from '../../../../Repository/Common/Ids.js';
import type { OrganizationView } from '../../../../Repository/Organization/Organization.js';
import type { PermissionDecision, PermissionsObject, TokenSegmentInput } from '../../../../Common/Permission/index.js';
import type { IFlowMember, FlowMemberProvider } from '../../../../Common/Type/FlowContext.js';

/**
 * Context for organization permission resolution.
 * @property organizationUid Target organization UID to check permission for.
 * @property userId Discord user ID requesting the action.
 * @property action Action being performed (maps to permission token suffix).
 * @property additionalToken Optional extra context for permission token.
 */
export interface OrganizationResolveContext {
    organizationUid: UID;
    userId: string;
    action: string;
    additionalToken?: string;
}

/**
 * Result of organization permission resolution.
 * @property allowed Whether the action is permitted.
 * @property reason Explanation when denied.
 * @property matchedOrganization Organization that granted access (if any).
 * @property requiresApproval Whether admin approval could grant access.
 * @property decision Admin decision if approval was requested.
 */
export interface OrganizationResolveResult {
    allowed: boolean;
    reason?: string;
    matchedOrganization?: OrganizationView;
    requiresApproval?: boolean;
    decision?: PermissionDecision;
}

/**
 * Payload sent to approval handler when organization access requires admin approval.
 * @property tokens Array of token segments to approve.
 * @property reason Optional reason for approval prompt.
 */
export interface OrganizationApprovalPayload {
    tokens: TokenSegmentInput[][];
    reason?: string;
}

/**
 * Approval handler signature for organization permission requests.
 * @param payload OrganizationApprovalPayload Approval payload details.
 * @returns Promise<PermissionDecision | undefined> Approval decision.
 */
/* eslint-disable no-unused-vars */
export interface OrganizationApprovalHandler {
    (payload: OrganizationApprovalPayload): Promise<PermissionDecision | undefined>;
}
/* eslint-enable no-unused-vars */

/**
 * Options for organization permission resolution.
 * @property context Resolution context with organization and user info.
 * @property permissions Optional explicit permission overrides.
 * @property member Optional pre-resolved flow member.
 * @property memberProvider Optional callback to fetch member lazily.
 * @property requestApproval Optional callback to request admin approval.
 * @property skipApproval When true, skip approval flow entirely.
 */
export interface OrganizationResolveOptions {
    context: OrganizationResolveContext;
    permissions?: PermissionsObject;
    member?: IFlowMember | null;
    memberProvider?: FlowMemberProvider;
    requestApproval?: OrganizationApprovalHandler;
    skipApproval?: boolean;
}
