import type { IDisplayGroup } from './IDisplayGroup.js';
import type { IDisplayChart } from './IDisplayChart.js';
import type { IParameterDisplayConfig } from './IParameterDisplayConfig.js';
import type { ICardStyleConfig } from './ICardStyleConfig.js';

/**
 * Complete display configuration for a template.
 * Controls how game objects instantiated from this template
 * are rendered on visual cards.
 */
export interface ITemplateDisplayConfig {
    /** Display groups defining visual sections on the card. Parameters are placed into groups by their category. */
    groups: IDisplayGroup[];

    /** Standalone multi-parameter charts rendered as independent visual blocks. */
    charts?: IDisplayChart[];

    /** Per-parameter display overrides (graph type, visibility, ordering). */
    parameterDisplay: IParameterDisplayConfig[];

    /** Optional visual style overrides. Missing fields fall back to CardTheme defaults. */
    styleConfig?: ICardStyleConfig;
}
