import type { IProjectionGroupEntry } from './IProjectionGroupEntry.js';
import type { IDisplayChart } from './IDisplayChart.js';
import type { ICardStyleConfig } from './ICardStyleConfig.js';

/**
 * @brief Full display profile for a single projection style
 *
 * Groups use per entry linked or custom semantics
 * Charts and style config inherit from the base template display config when absent
 */
export interface IProjectionDisplayProfile {
    groups: IProjectionGroupEntry[];
    charts?: IDisplayChart[];
    styleConfig?: ICardStyleConfig;
}
