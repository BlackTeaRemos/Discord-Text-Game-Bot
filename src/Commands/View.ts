/**
 * View command - re-exports from modular implementation.
 * This file is kept for backward compatibility with existing imports.
 * @deprecated Import from './View/index.js' instead. This shim will be removed in the next major release.
 */
import { log } from '../Common/Log.js';

log.warn('DEPRECATION: Importing from "src/Commands/View" is deprecated and will be removed in the next major release. Please import from "./Commands/View/index.js" instead.');

export { data, permissionTokens, execute, HandleViewGameActionInteraction, __viewCommandTesting } from './View/index.js';
export { HandleViewDescriptionActionInteraction } from './View/index.js';
export { HandleViewParameterActionInteraction } from './View/index.js';

