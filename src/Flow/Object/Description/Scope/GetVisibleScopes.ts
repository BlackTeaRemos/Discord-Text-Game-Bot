import { GetUserOrganizations } from '../../../Command/Description/GetUserOrganizations.js';
import type { DescriptionScope } from './Types.js';

/**
 * Options for resolving visible scopes.
 * @property userUid string Discord user id requesting scopes. @example '123456789012345678'
 * @property canEditGlobal boolean Whether user has permission for global scope. @example true
 */
export interface GetVisibleScopesOptions {
    userUid: string;
    canEditGlobal: boolean;
}

/**
 * Resolve all description scopes visible to a user.
 * Returns global scope (if permitted), organization scopes (if member), and personal scope.
 * @param options GetVisibleScopesOptions User context for scope resolution.
 * @returns Promise<DescriptionScope[]> Array of accessible scopes ordered by visibility breadth.
 * @example const scopes = await GetVisibleScopes({ userUid: '123', canEditGlobal: false });
 */
export async function GetVisibleScopes(options: GetVisibleScopesOptions): Promise<DescriptionScope[]> {
    const scopes: DescriptionScope[] = [];

    if (options.canEditGlobal) {
        scopes.push({
            scopeType: `global`,
            scopeUid: null,
            label: `Official Description`,
        });
    }

    const organizations = await GetUserOrganizations(options.userUid);
    for (const organization of organizations) {
        scopes.push({
            scopeType: `organization`,
            scopeUid: organization.uid,
            label: `${organization.name} Notes`,
        });
    }

    scopes.push({
        scopeType: `user`,
        scopeUid: options.userUid,
        label: `Personal Notes`,
    });

    return scopes;
}
