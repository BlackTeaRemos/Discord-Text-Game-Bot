export {
    RegisterObjectViewTheme,
    ResolveObjectViewTheme,
    ClearObjectViewThemes,
} from './ObjectViewThemeRegistry.js';

export type { ObjectViewThemeDefinition } from './ObjectViewThemeRegistry.js';

// Side effect import that registers built in themes
import './ObjectViewThemeDefaults.js';
