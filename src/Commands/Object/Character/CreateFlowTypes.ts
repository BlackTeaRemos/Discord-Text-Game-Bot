import type { PermissionsObject } from '../../../Common/Permission/index.js';

/**
 * Shared state for the interactive character creation flow.
 */
export interface CharacterCreateFlowState {
    organizationUid: string | null;
    organizationName: string | null;
    characterName: string | null;
}

/**
 * Permission set used by the description editor that runs after character creation.
 */
export type CharacterDescriptionEditorPermissions = PermissionsObject;

export const CHARACTER_SELECT_ORGANIZATION_ID = `character_create_select_org`;
export const CHARACTER_NO_ORGANIZATION_VALUE = `__none__`;

export const CHARACTER_NAME_MAX_LENGTH = 64;
