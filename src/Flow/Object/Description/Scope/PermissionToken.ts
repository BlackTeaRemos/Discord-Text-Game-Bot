import type { DescriptionScopeType } from './Types.js';

/**
 * Permission action types for description scopes.
 */
export type DescriptionPermissionAction = `view` | `edit`;

/**
 * Build permission token for a description scope action.
 * Format: description:scope:{scopeType}:{action}
 * @param scopeType DescriptionScopeType The scope type. @example 'organization'
 * @param action DescriptionPermissionAction The action being performed. @example 'edit'
 * @returns string Permission token string. @example 'description:scope:organization:edit'
 */
export function BuildScopePermissionToken(
    scopeType: DescriptionScopeType,
    action: DescriptionPermissionAction,
): string {
    return `description:scope:${scopeType}:${action}`;
}

/**
 * Build permission token for global scope specifically.
 * @param action DescriptionPermissionAction The action. @example 'edit'
 * @returns string Permission token. @example 'description:scope:global:edit'
 */
export function BuildGlobalScopeToken(action: DescriptionPermissionAction): string {
    return BuildScopePermissionToken(`global`, action);
}
