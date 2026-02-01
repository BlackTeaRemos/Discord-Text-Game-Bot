import type { TokenSegmentInput } from '../../../../Common/Permission/index.js';

const USER_PERMISSION_PREFIX = `user`;

/**
 * Build a permission token for user-scoped actions.
 * @param userId Target user's Discord ID.
 * @param action Action being performed.
 * @param additionalSegments Optional extra token segments.
 * @returns TokenSegmentInput[] Permission token array.
 * @example
 * const token = BuildUserPermissionToken('123456', 'edit');
 * // Returns: ['user', '123456', 'edit']
 */
export function BuildUserPermissionToken(
    userId: string,
    action: string,
    additionalSegments: string[] = [],
): TokenSegmentInput[] {
    return [
        USER_PERMISSION_PREFIX,
        userId,
        action,
        ...additionalSegments,
    ];
}
