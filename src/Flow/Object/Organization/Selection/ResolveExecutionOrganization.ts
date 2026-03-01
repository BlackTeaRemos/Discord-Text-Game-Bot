import type { UID } from '../../../../Repository/Common/Ids.js';
import { Log } from '../../../../Common/Log.js';
import { GetUserOrganizations } from '../View/GetUserOrganizations.js';
import {
    EnsureGlobalOrganization,
    EnsureGlobalOrganizationMembership,
    GLOBAL_ORGANIZATION_NAME,
} from '../Global/index.js';
import { GetUserDefaultOrganization } from './GetUserDefaultOrganization.js';
import { SetUserDefaultOrganization } from './SetUserDefaultOrganization.js';
import type { ExecutionOrganizationResult } from './Types.js';

/**
 * Resolve the execution organization from requested and stored defaults.
 * Falls back to a user-scope when no organizations exist.
 * @param userId Discord user ID. @example '1234567890'
 * @param requestedOrganizationUid Optional requested organization UID. @example 'org_abc123'
 * @returns Promise<ExecutionOrganizationResult> Execution scope resolution result.
 * @example
 * const result = await ResolveExecutionOrganization('123', 'org_abc123');
 */
export async function ResolveExecutionOrganization(
    userId: string,
    requestedOrganizationUid?: UID | null,
): Promise<ExecutionOrganizationResult> {
    try {
        const requestedValue = requestedOrganizationUid?.trim() ?? null; // requested organization selector

        if (requestedValue === GLOBAL_ORGANIZATION_NAME) {
            const globalOrganization = await EnsureGlobalOrganization(); // global organization snapshot
            await EnsureGlobalOrganizationMembership(userId, true);
            return {
                scopeType: `organization`,
                organizationUid: globalOrganization.uid,
                organizationName: globalOrganization.friendlyName || globalOrganization.name,
                source: `requested`,
            };
        }

        if (requestedValue === `user`) {
            return {
                scopeType: `user`,
                organizationUid: null,
                organizationName: `User`,
                source: `requested`,
            };
        }

        await EnsureGlobalOrganizationMembership(userId, true);

        const organizations = await GetUserOrganizations(userId); // organizations assigned to user

        if (organizations.length === 0) {
            await SetUserDefaultOrganization(userId, null);
            return {
                scopeType: `user`,
                organizationUid: null,
                organizationName: `User`,
                source: `none`,
            };
        }

        if (requestedValue) {
            const requested = organizations.find(organization => {
                return organization.uid === requestedValue;
            });
            if (requested) {
                return {
                    scopeType: `organization`,
                    organizationUid: requested.uid,
                    organizationName: requested.friendlyName || requested.name,
                    source: `requested`,
                };
            }
        }

        const storedDefault = await GetUserDefaultOrganization(userId);
        if (storedDefault === `user`) {
            return {
                scopeType: `user`,
                organizationUid: null,
                organizationName: `User`,
                source: `default`,
            };
        }

        if (storedDefault) {
            const found = organizations.find(organization => {
                return organization.uid === storedDefault;
            });
            if (found) {
                return {
                    scopeType: `organization`,
                    organizationUid: found.uid,
                    organizationName: found.friendlyName || found.name,
                    source: `default`,
                };
            }
        }

        const fallback = organizations[0]; // fallback organization when default missing
        await SetUserDefaultOrganization(userId, fallback.uid as UID);
        return {
            scopeType: `organization`,
            organizationUid: fallback.uid,
            organizationName: fallback.friendlyName || fallback.name,
            source: `fallback`,
        };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to resolve execution organization`, message, `OrganizationSelection`);
        return {
            scopeType: `user`,
            organizationUid: null,
            organizationName: `User`,
            source: `none`,
        };
    } finally {
        // no cleanup required
    }
}
