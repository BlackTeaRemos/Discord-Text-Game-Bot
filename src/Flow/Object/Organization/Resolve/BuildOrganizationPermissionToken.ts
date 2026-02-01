import type { UID } from '../../../../Repository/Common/Ids.js';
import type { TokenSegmentInput } from '../../../../Common/Permission/index.js';
import { GetOrganizationHierarchy } from '../View/GetOrganizationHierarchy.js';

/**
 * Build a permission token for organization-scoped actions.
 * Token represents the full hierarchy path plus the action.
 * @param organizationUid Target organization UID.
 * @param action Action being performed.
 * @param additionalSegments Optional extra token segments.
 * @returns Promise<TokenSegmentInput[]> Permission token array.
 * @example
 * const token = await BuildOrganizationPermissionToken('org_abc', 'edit', ['field']);
 * // Returns: ['organization', 'org_root', 'org_parent', 'org_abc', 'edit', 'field']
 */
export async function BuildOrganizationPermissionToken(
    organizationUid: UID,
    action: string,
    additionalSegments: string[] = [],
): Promise<TokenSegmentInput[]> {
    const hierarchy = await GetOrganizationHierarchy(organizationUid);

    return [
        `organization`,
        ...hierarchy,
        action,
        ...additionalSegments,
    ];
}
