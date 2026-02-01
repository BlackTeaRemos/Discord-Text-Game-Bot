/**
 * View command - re-exports from modular implementation.
 * This file is kept for backward compatibility with existing imports.
 * @deprecated Import from './ViewSimple/index.js' instead. This shim will be removed in the next major release.
 */
import { log } from '../Common/Log.js';

log.warning('DEPRECATION: Importing from "src/Commands/View" is deprecated and will be removed in the next major release. Please import from "./Commands/ViewSimple/index.js" instead.', 'View');

export { data, permissionTokens, execute } from './ViewSimple/index.js';

