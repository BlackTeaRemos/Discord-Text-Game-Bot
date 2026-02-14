/**
 * Re-export barrel for ObjectViewTheme subsystem
 * Registry mechanism lives in ObjectViewThemeRegistry
 * Built-in registrations live in ObjectViewThemeDefaults (side-effect import)
 */
export {
    RegisterObjectViewTheme,
    ResolveObjectViewTheme,
    ClearObjectViewThemes,
} from './ObjectViewThemeRegistry.js';

export type { ObjectViewThemeDefinition } from './ObjectViewThemeRegistry.js';

// Side-effect: register built-in themes on import
import './ObjectViewThemeDefaults.js';
