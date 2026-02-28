import { FlowManager as CoreFlowManager } from '../Common/Flow/Manager.js';
export type { FlowStep, StepContext } from '../Common/Flow/Types.js';
export { FlowEventBus } from '../Common/Flow/EventBus.js';

/**
 * Singleton FlowManager leveraged by commands and event handlers
 * @example
 * await flowManager.builder(userId, interaction, {}).step('example').prompt(async ctx => {...}).next().start();
 */
export const flowManager = new CoreFlowManager();

// Reexport the class for consumers that need to create isolated managers such as tests
export { CoreFlowManager as FlowManager };
