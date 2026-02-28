import type { ButtonInteraction } from 'discord.js';
import type { PermissionsObject } from '../../../Common/Permission/Types.js';
import type { DescriptionScope, DescriptionObjectReference } from '../../../Flow/Object/Description/Scope/Types.js';

// Forwarded export for convenience
export type { DescriptionObjectReference } from '../../../Flow/Object/Description/Scope/Types.js';

/**
 * Runtime state for the description viewer
 */
export interface DescriptionViewerState {
    objectReference: DescriptionObjectReference;
    availableScopes: DescriptionScope[];
    selectedScope: DescriptionScope | null;
    currentContent: string;
    currentPage: number;
    totalPages: number;
    userUid: string;
    organizationUid: string | null;
    permissions?: PermissionsObject;
}

/**
 * Configuration options for the description viewer flow
 */
export interface DescriptionViewerOptions {
    objectType: string;
    objectUid: string;
    userUid: string;
    organizationUid: string | null;
    canEditGlobal: boolean;
    permissions?: PermissionsObject;
    showEditButton: boolean;
    onEditRequest?: ViewerEditCallback;
}

/**
 * Callback invoked when edit button is clicked in viewer
 * @param state DescriptionViewerState Current viewer state at edit request time
 * @param interaction ButtonInteraction The button interaction that triggered edit
 * @returns Promise_DescriptionViewerState Updated state after edit completes
 */
export type ViewerEditCallback = (
    state: DescriptionViewerState,
    interaction: ButtonInteraction,
) => Promise<DescriptionViewerState>;

/**
 * Result returned from viewer flow
 */
export interface DescriptionViewerResult {
    completed: boolean;
    finalState: DescriptionViewerState;
}
