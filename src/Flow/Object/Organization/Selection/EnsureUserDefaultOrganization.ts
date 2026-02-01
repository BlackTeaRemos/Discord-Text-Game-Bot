import type { UID } from '../../../../Repository/Common/Ids.js';
import { GetUserOrganizations } from '../View/GetUserOrganizations.js';
import { GetUserDefaultOrganization } from './GetUserDefaultOrganization.js';
import { SetUserDefaultOrganization } from './SetUserDefaultOrganization.js';
import type { DefaultOrganizationResult } from './Types.js';

/**
 * Ensure the stored default organization exists in the user's memberships.
 * If none exist, default is cleared.
 * @param discordId Discord user ID. @example '1234567890'
 * @returns Promise<DefaultOrganizationResult> Result with selected default and update flag.
 * @example
 * const result = await EnsureUserDefaultOrganization('123');
 */
export async function EnsureUserDefaultOrganization(discordId: string): Promise<DefaultOrganizationResult> {
    const organizations = await GetUserOrganizations(discordId); // organizations assigned to user

    if (organizations.length === 0) {
        await SetUserDefaultOrganization(discordId, null);
        return { organizationUid: null, updated: true };
    }

    const storedDefault = await GetUserDefaultOrganization(discordId); // stored default organization uid

    if (storedDefault === `user`) {
        return { organizationUid: `user` as UID, updated: false };
    }

    if (storedDefault) {
        const exists = organizations.some(organization => {
            return organization.uid === storedDefault;
        });
        if (exists) {
            return { organizationUid: storedDefault, updated: false };
        }
    }

    const fallback = organizations[0].uid as UID; // fallback to first organization
    await SetUserDefaultOrganization(discordId, fallback);
    return { organizationUid: fallback, updated: true };
}
