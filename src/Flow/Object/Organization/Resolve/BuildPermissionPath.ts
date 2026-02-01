import type { UID } from '../../../../Repository/Common/Ids.js';

/**
 * Build permission path string from hierarchy chain.
 * @param hierarchyChain Ordered list of organization UIDs from root to target.
 * @returns Permission path string.
 * @example
 * const path = BuildPermissionPath(['org_root', 'org_child']);
 */
export function BuildPermissionPath(hierarchyChain: UID[]): string {
    return hierarchyChain.join(`:`);
}
