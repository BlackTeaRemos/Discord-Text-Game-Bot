// Description exports
export { BuildDescriptionDefinition, buildDescriptionUid, sanitizeDescriptionText } from './BuildDefinition.js';
export type { DescriptionDefinition, DescriptionDefinitionOptions } from './BuildDefinition.js';

// Scoped description system (canonical)
export * from './Scope/index.js';

// Composer (text collection without persistence)
export * from './Composer/index.js';

// Viewer (read-only description display)
export * from './Viewer/index.js';

// Editor (extends viewer with editing capability and persistence)
export * from './Editor/index.js';
