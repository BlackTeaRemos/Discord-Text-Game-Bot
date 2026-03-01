import type { IParameterDisplayConfig } from './IParameterDisplayConfig.js';

/**
 * @brief A group reference within a projection display profile
 *
 * Linked entries inherit the base config group definition and its parameter display settings
 * Custom entries define their own group layout and parameter assignments
 */
export interface IProjectionGroupEntry {
    key: string;
    linked: boolean;
    label?: string;
    iconUrl?: string;
    sortOrder?: number;
    parameterDisplay?: IParameterDisplayConfig[];
}
