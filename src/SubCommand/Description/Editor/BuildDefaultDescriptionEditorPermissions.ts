import type { PermissionsObject } from '../../../Common/Permission/index.js';

/**
 * Build a default permission map for the scoped description editor.
 *
 * This helper is meant for callers that do not have a domain-specific permissions builder.
 * It keeps the baseline behavior consistent across commands.
 *
 * @param canEditGlobal boolean Whether global scope is available and editable. @example false
 * @returns PermissionsObject Permission map used by `CanViewScope` / `CanEditScope`. @example { 'description:scope:user:edit': 'allowed' }
 * @example
 * const permissions = BuildDefaultDescriptionEditorPermissions(true);
 */
export function BuildDefaultDescriptionEditorPermissions(canEditGlobal: boolean): PermissionsObject {
    const permissions: PermissionsObject = {
        [`description:scope:user:view`]: `allowed`,
        [`description:scope:user:edit`]: `allowed`,
        [`description:scope:organization:view`]: `allowed`,
        [`description:scope:organization:edit`]: `allowed`,
    };

    if (canEditGlobal) {
        permissions[`description:scope:global:view`] = `allowed`;
        permissions[`description:scope:global:edit`] = `allowed`;
    }

    return permissions;
}
