import type { IProjectionDisplayProfile } from '../../Display/IProjectionDisplayProfile.js';

/**
 * @brief Maps display style names to full projection display profiles
 *
 * Each key is a dynamic style name and each value is a complete display profile
 * with group references and optional chart and style overrides
 */
export type ProjectionDisplayConfigMap = Record<string, IProjectionDisplayProfile>;
