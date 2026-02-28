import type { PermissionsObject } from '../../../../Common/Permission/Types.js';
import type { DescriptionScopeType } from './Types.js';
import { BuildScopePermissionToken } from './PermissionToken.js';

/**
 * Check if user can view a specific scope without prompting.
 * Returns false instead of throwing when denied.
 * @param scopeType DescriptionScopeType Scope type to check.
 * @param permissions PermissionsObject | undefined User's permission config.
 * @returns boolean True if viewing is allowed.
 */
export function CanViewScope(
    scopeType: DescriptionScopeType,
    permissions?: PermissionsObject,
): boolean {
    if (!permissions) {
        return scopeType === `user`;
    }

    const token = BuildScopePermissionToken(scopeType, `view`);
    const wildcardToken = `description:scope:*:view`;
    const fullWildcard = `description:*`;

    const state = permissions[token] ?? permissions[wildcardToken] ?? permissions[fullWildcard];

    if (state === `allowed` || state === `once`) {
        return true;
    }

    if (scopeType === `user`) {
        return true;
    }

    return false;
}

/**
 * Check if user can edit a specific scope without prompting.
 * @param scopeType DescriptionScopeType Scope type to check.
 * @param permissions PermissionsObject | undefined User's permission config.
 * @returns boolean True if editing is allowed.
 */
export function CanEditScope(
    scopeType: DescriptionScopeType,
    permissions?: PermissionsObject,
): boolean {
    if (!permissions) {
        return scopeType === `user`;
    }

    const token = BuildScopePermissionToken(scopeType, `edit`);
    const wildcardToken = `description:scope:*:edit`;
    const fullWildcard = `description:*`;

    const state = permissions[token] ?? permissions[wildcardToken] ?? permissions[fullWildcard];

    if (state === `allowed` || state === `once`) {
        return true;
    }

    if (scopeType === `user`) {
        return true;
    }

    return false;
}
