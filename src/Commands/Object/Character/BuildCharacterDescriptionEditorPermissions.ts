import type { PermissionsObject } from '../../../Common/Permission/index.js';

/**
 * Build the permission set passed to the description editor flow.
 * This mirrors the default behavior in the existing description create command.
 * @param canEditGlobal boolean Whether global scope should be editable. @example true
 * @returns PermissionsObject Permission map for scope view/edit. @example { 'description:scope:user:edit': 'allowed' }
 */
export function BuildCharacterDescriptionEditorPermissions(canEditGlobal: boolean): PermissionsObject {
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
