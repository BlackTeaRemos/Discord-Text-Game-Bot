import type { DescriptionViewerState, DescriptionViewerOptions } from './Types.js';
import type { DescriptionScope } from '../Scope/Types.js';

/**
 * Initialize viewer state from options and available scopes.
 * @param options DescriptionViewerOptions Configuration for the viewer flow.
 * @param availableScopes DescriptionScope[] Scopes the user can access.
 * @returns DescriptionViewerState Initialized state ready for the viewer loop.
 * @example const state = CreateViewerState(options, scopes);
 */
export function CreateViewerState(
    options: DescriptionViewerOptions,
    availableScopes: DescriptionScope[],
): DescriptionViewerState {
    return {
        objectReference: {
            objectType: options.objectType,
            objectUid: options.objectUid,
        },
        availableScopes,
        selectedScope: null,
        currentContent: ``,
        currentPage: 0,
        totalPages: 1,
        userUid: options.userUid,
        organizationUid: options.organizationUid,
        permissions: options.permissions,
    };
}

/**
 * Clone viewer state for immutable updates.
 * @param state DescriptionViewerState State to clone.
 * @returns DescriptionViewerState Deep copy of state.
 */
export function CloneViewerState(state: DescriptionViewerState): DescriptionViewerState {
    return {
        objectReference: { ...state.objectReference },
        availableScopes: [...state.availableScopes],
        selectedScope: state.selectedScope ? { ...state.selectedScope } : null,
        currentContent: state.currentContent,
        currentPage: state.currentPage,
        totalPages: state.totalPages,
        userUid: state.userUid,
        organizationUid: state.organizationUid,
        permissions: state.permissions ? { ...state.permissions } : undefined,
    };
}
