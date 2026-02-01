import type { GameCreateRenderers } from '../../../Flow/Object/Game/CreateTypes.js';
import { BuildControlsContent } from './Renderers/BuildControlsContent.js';
import { RenderPreview } from './Renderers/RenderPreview.js';
import { RenderControls } from './Renderers/RenderControls.js';

/**
 * Shared renderer callbacks used by the command layer to render Discord UI components.
 * @returns GameCreateRenderers Renderer bundle consumed by the game creation flow. @example const renderers = gameCreateRenderers
 */
export const gameCreateRenderers: GameCreateRenderers = {
    BuildControlsContent,
    RenderPreview,
    RenderControls,
};
