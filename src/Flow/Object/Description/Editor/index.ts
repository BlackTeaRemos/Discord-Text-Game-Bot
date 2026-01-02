// Re-export Viewer for consumers who want read-only flow
export { RunDescriptionViewerFlow } from '../Viewer/index.js';
export type {
    DescriptionViewerOptions,
    DescriptionViewerState,
    DescriptionViewerResult,
    ViewerEditCallback,
} from '../Viewer/index.js';

// Scope selector (shared between viewer and editor)
export { BuildScopeSelectorComponent, ResolveScopeFromSelection, SCOPE_SELECTOR_CUSTOM_ID } from './ScopeSelectorComponent.js';
export { BuildPaginatedPreview, PAGE_PREV_BUTTON_ID, PAGE_NEXT_BUTTON_ID, EDIT_BUTTON_ID } from './PaginatedPreview.js';
export type { PaginatedPreviewResult } from './PaginatedPreview.js';
export { BuildEditorModal, ExtractModalContent, EDITOR_MODAL_ID, EDITOR_CONTENT_FIELD_ID } from './EditorModalBuilder.js';
export type { EditorModalOptions } from './EditorModalBuilder.js';
export { BuildDefaultDescriptionEditorPermissions } from './BuildDefaultDescriptionEditorPermissions.js';
export { RunDescriptionEditorFlow } from './DescriptionEditorFlow.js';

// Legacy handlers removed - use Viewer equivalents:
// HandleFlowLoop -> HandleViewerFlowLoop
// HandleScopeSelection -> HandleViewerScopeSelection
// LoadDescriptionForScope -> LoadViewerDescriptionForScope
// HandlePreviewLoop -> HandleViewerPreviewLoop
// HandleButtonInteraction -> HandleViewerButtonInteraction
// UpdatePreview -> UpdateViewerPreview
// HandleEditTrigger -> (inline in DescriptionEditorFlow)
// HandleModalSubmit -> (inline in DescriptionEditorFlow)
