import type { PermissionsObject } from '../../../Common/Permission/Types.js';

/**
 * Options for the description composer flow.
 * Composer collects description text without persistence.
 * @property initialContent string | undefined Starting text to edit. @example 'Current description...'
 * @property maxLength number | undefined Maximum character limit. @example 4000
 * @property prompt string | undefined Custom prompt message. @example 'Enter your description:'
 * @property cancelWords string[] | undefined Words that cancel input. @example ['cancel', 'abort']
 * @property timeoutMs number | undefined Input timeout in milliseconds. @example 300000
 * @property userUid string Discord user id composing the description. @example '123456789012345678'
 * @property organizationUid string | null Organization uid if user belongs to one. @example 'org_abc'
 * @property canEditGlobal boolean Whether user can compose for global scope. @example false
 * @property permissions PermissionsObject | undefined User's permission configuration.
 */
export interface DescriptionComposerOptions {
    initialContent?: string;
    maxLength?: number;
    prompt?: string;
    cancelWords?: string[];
    timeoutMs?: number;
    userUid: string;
    organizationUid: string | null;
    canEditGlobal: boolean;
    permissions?: PermissionsObject;
}

/**
 * Result returned from the description composer flow.
 * @property success boolean Whether composition completed successfully.
 * @property content string | null The composed description text, null if cancelled.
 * @property cancelled boolean Whether user explicitly cancelled.
 * @property timedOut boolean Whether input timed out.
 */
export interface DescriptionComposerResult {
    success: boolean;
    content: string | null;
    cancelled: boolean;
    timedOut: boolean;
}
