import type { FlowStep } from './Types.js';
import type { FlowBuilder } from './Builder.js';
import type { Interaction, Message } from 'discord.js';

/**
 * @brief Helper to build individual flow steps
 * @example
 * builder.step('confirm').prompt(async ctx => {...}).onInteraction(async (ctx, i) => true).next();
 */
export class StepBuilder<State> {
    private step: Partial<FlowStep<State>> = {};

    constructor(
        private builder: FlowBuilder<State>,
        customId?: string | string[],
        tag?: string,
    ) {
        this.step.customId = customId;
        this.step.tag = tag;
    }

    /**
     * @brief Define the prompt handler for this step
     * @param fn prompt callback function Asynchronous callback executed when the step activates
     * @returns this Allows fluent chaining to configure additional handlers
     */
    public prompt(fn: FlowStep<State>[`prompt`]): this {
        this.step.prompt = fn;
        return this;
    }

    /**
     * @brief Define the interaction handler for this step
     * @param fn interaction handler function Handler invoked for matching component interactions
     * @returns this Enables chaining for further configuration
     */
    public onInteraction(
        fn: (
            ctx: Parameters<NonNullable<FlowStep<State>[`handleInteraction`]>>[0],
            interaction: Interaction,
        ) => Promise<boolean>,
    ): this {
        this.step.handleInteraction = fn;
        return this;
    }

    /**
     * @brief Define the message handler for this step
     * @param fn message handler function Handler invoked when a message arrives
     * @returns this Enables fluent chaining
     */
    public onMessage(
        fn: (ctx: Parameters<NonNullable<FlowStep<State>[`handleMessage`]>>[0], message: Message) => Promise<boolean>,
    ): this {
        this.step.handleMessage = fn;
        return this;
    }

    /**
     * @brief Finalize this step and return to the parent builder
     * @returns FlowBuilder State Reference to the owning builder for further configuration
     */
    public next(): FlowBuilder<State> {
        this.builder.internalAddStep(this.step as FlowStep<State>);
        return this.builder;
    }
}
