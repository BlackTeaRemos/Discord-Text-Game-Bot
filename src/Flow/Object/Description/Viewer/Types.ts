import type { ButtonInteraction } from 'discord.js';
import type { PermissionsObject } from '../../../../Common/Permission/types.js';
import type { DescriptionScope, DescriptionObjectReference } from '../Scope/Types.js';

// Re-export for convenience
export type { DescriptionObjectReference } from '../Scope/Types.js';

/**
 * Runtime state for the description viewer.
 * @property objectReference DescriptionObjectReference Target object being described.
 * @property availableScopes DescriptionScope[] Scopes the user can access.
 * @property selectedScope DescriptionScope | null Currently selected scope for viewing.
 * @property currentContent string The description text for selected scope.
 * @property currentPage number Zero-based page index for paginated preview.
 * @property totalPages number Total pages for current content.
 * @property userUid string Discord user id of the viewer.
 * @property organizationUid string | null Organization uid if user belongs to one.
 * @property permissions PermissionsObject | undefined User permission configuration for scope filtering.
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
 * Configuration options for the description viewer flow.
 * @property objectType string Category of the target object. @example 'vehicle'
 * @property objectUid string Unique identifier of the target object. @example 'vehicle_123'
 * @property userUid string Discord user id invoking the flow. @example '123456789012345678'
 * @property organizationUid string | null Organization uid if user is member. @example 'org_abc'
 * @property canEditGlobal boolean Whether user can modify global description. @example false
 * @property permissions PermissionsObject | undefined User's permission configuration.
 * @property showEditButton boolean Whether to display the edit button. @example true
 * @property onEditRequest ViewerEditCallback | undefined Callback when edit button is clicked.
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
 * Callback invoked when edit button is clicked in viewer.
 * @param state DescriptionViewerState Current viewer state at edit request time.
 * @param interaction ButtonInteraction The button interaction that triggered edit.
 * @returns Promise<DescriptionViewerState> Updated state after edit completes.
 */
export type ViewerEditCallback = (
    state: DescriptionViewerState,
    interaction: ButtonInteraction,
) => Promise<DescriptionViewerState>;

/**
 * Result returned from viewer flow.
 * @property completed boolean Whether flow finished normally (true) or timed out (false).
 * @property finalState DescriptionViewerState State at flow termination.
 */
export interface DescriptionViewerResult {
    completed: boolean;
    finalState: DescriptionViewerState;
}
