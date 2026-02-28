import type { Interaction } from 'discord.js';
import type { ExecutionContext } from '../../Domain/Command.js';
import type { FlowStep } from './Types.js';
import { FlowManager } from './Manager.js';
import { StepBuilder } from './StepBuilder.js';

/**
 * @brief Builder for interactive flows using a fluent API
 * @example
 * await manager
 *   .builder(userId, interaction, {})
 *   .step('choose')
 *   .prompt(async ctx => {...})
 *   .next()
 *   .start();
 */
export class FlowBuilder<State> {
    private steps: FlowStep<State>[] = [];
    private usedTags = new Set<string>();

    constructor(
        private manager: FlowManager,
        private userId: string,
        private initialInteraction: Interaction,
        private initialState: State,
        private executionContext?: ExecutionContext,
    ) {}

    /**
     * @brief Add a new step with an optional component custom id and tag
     * @param customId string or string array or undefined Custom ids to match for component interactions
     * @param tag string or undefined Unique tag identifier that allows later steps to recall this steps context
     * @returns StepBuilder State Step builder for configuring the step
     */
    public step(customId?: string | string[], tag?: string): StepBuilder<State> {
        return new StepBuilder(this, customId, tag);
    }

    /**
     * @brief Collect a configured step into the flow definition
     * @param step FlowStep State Completed step definition from the StepBuilder
     * @returns void Step is stored internally and call chaining is performed by StepBuilder next
     */
    public internalAddStep(step: FlowStep<State>) {
        if (step.tag) {
            if (this.usedTags.has(step.tag)) {
                throw new Error(`Duplicate flow step tag detected: ${step.tag}`);
            }
            this.usedTags.add(step.tag);
        }
        this.steps.push(step);
    }

    /**
     * @brief Start the built flow through the underlying manager
     * @returns Promise void Resolves after FlowManager start completes
     */
    public start(): Promise<void> {
        return this.manager.start(
            this.userId,
            this.initialInteraction,
            this.initialState,
            this.steps,
            this.executionContext,
        );
    }
}
