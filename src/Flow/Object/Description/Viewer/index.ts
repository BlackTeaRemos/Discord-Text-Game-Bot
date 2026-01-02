// Types (DescriptionObjectReference comes from Scope, not re-exported here to avoid conflict)
export type {
    DescriptionViewerState,
    DescriptionViewerOptions,
    DescriptionViewerResult,
    ViewerEditCallback,
} from './Types.js';

// State utilities
export { CreateViewerState, CloneViewerState } from './ViewerState.js';

// Preview building
export {
    BuildViewerPreview,
    VIEWER_PAGE_PREV_BUTTON_ID,
    VIEWER_PAGE_NEXT_BUTTON_ID,
    VIEWER_EDIT_BUTTON_ID,
} from './ViewerPreview.js';
export type { ViewerPreviewResult, ViewerPreviewOptions } from './ViewerPreview.js';

// Scope handling
export {
    HandleViewerFlowLoop,
    HandleViewerScopeSelection,
    LoadViewerDescriptionForScope,
    VIEWER_INTERACTION_TIMEOUT_MS,
} from './ViewerScopeHandler.js';

// Navigation handling
export {
    HandleViewerPreviewLoop,
    HandleViewerButtonInteraction,
    UpdateViewerPreview,
} from './ViewerNavigationHandler.js';

// Main flow entry point
export { RunDescriptionViewerFlow } from './DescriptionViewerFlow.js';
