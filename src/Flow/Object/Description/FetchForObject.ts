import { GetPriorityScopedDescription } from './Scope/GetPriorityScopedDescription.js';

/**
 * Options for fetching a priority-resolved description for an object.
 * @property objectUid string Object unique identifier. @example 'game_abc123'
 * @property objectType string Category of the described object. @example 'game'
 * @property userUid string Discord user id requesting the view. @example '123456789'
 * @property organizationUids string[] Organization UIDs the user belongs to. @example ['org_1']
 */
export interface IFetchDescriptionOptions {
    /** Unique identifier of the described object. @example 'game_abc123' */
    objectUid: string;

    /** Category of the described object. @example 'game' */
    objectType: string;

    /** Discord user id requesting the view. @example '123456789' */
    userUid: string;

    /** Organization UIDs visible to the user. @example ['org_1'] */
    organizationUids: string[];
}

/**
 * Fetch the highest-priority scoped description content for an object.
 * Resolution order: user > organization > global.
 * Delegates to GetPriorityScopedDescription with proper scope filtering
 * to prevent information leaks across organizations or users.
 *
 * @param options IFetchDescriptionOptions Query options with scope ownership.
 * @returns Promise<string | null> Description content string, or null if none found.
 * @example
 * const content = await FetchDescriptionForObject({
 *   objectUid: 'game_abc123',
 *   objectType: 'game',
 *   userUid: '123456789',
 *   organizationUids: ['org_1'],
 * });
 */
export async function FetchDescriptionForObject(
    options: IFetchDescriptionOptions,
): Promise<string | null> {
    const result = await GetPriorityScopedDescription({
        objectType: options.objectType,
        objectUid: options.objectUid,
        userUid: options.userUid,
        organizationUids: options.organizationUids,
    });

    if (!result) {
        return null;
    }

    return result.content || null;
}
