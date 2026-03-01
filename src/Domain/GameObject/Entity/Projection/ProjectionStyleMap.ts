import type { ICardStyleConfig } from '../../Display/ICardStyleConfig.js';
import type { ProjectionDisplayStyle } from './ProjectionDisplayStyle.js';

/**
 * @brief Maps each ProjectionDisplayStyle to card style overrides for per perspective rendering
 */
export type ProjectionStyleMap = Record<ProjectionDisplayStyle, Partial<ICardStyleConfig>>;
