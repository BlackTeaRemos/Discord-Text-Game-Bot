import type { Interaction, Message } from 'discord.js';
import type { ExecutionContext } from '../../Domain/Command.js';
import { createExecutionContext } from '../../Domain/index.js';
import type { FlowStep } from './Types.js';
import { FlowInstance } from './Instance.js';
import { FlowBuilder } from './Builder.js';
import { FlowEventBus, FlowLoggingOptions } from './EventBus.js';

/**
 * @brief Coordinates interactive flows per Discord user delegating lifecycle events through the shared event bus
 * @example
 * const manager = new FlowManager();
 * await manager.start('1234567890', interaction, { step: 0 }, steps);
 */
export class FlowManager {
    private flows = new Map<string, FlowInstance<any>>();
    public readonly events = new FlowEventBus<any>();

    /**
     * @brief Enable diagnostic logging for all flow events via the underlying event bus
     * @param options FlowLoggingOptions Optional logging overrides for level source and formatter
     * @returns void No return value and listeners remain active until process exit
     */
    public enableLogging(options?: FlowLoggingOptions<any>): void {
        this.events.registerLoggingDelegates(options);
    }

    /**
     * @brief Start a new flow for the provided user cancelling any existing flow owned by the same user
     * @param userId string Discord snowflake identifying the user
     * @param initialInteraction Interaction Discord interaction used to seed the flow
     * @param initialState State Mutable state object shared across steps
     * @param steps FlowStep array Ordered list of flow steps to execute
     * @param executionContext ExecutionContext Optional execution context shared across steps
     * @returns Promise Resolves once the first prompt has been issued
     */
    public async start<State>(
        userId: string,
        initialInteraction: Interaction,
        initialState: State,
        steps: FlowStep<State>[],
        executionContext?: ExecutionContext,
    ) {
        if (this.flows.has(userId)) {
            await this.flows.get(userId)!.cancel();
        }
        this.events.registerDefaultDelegates();
        const instance = new FlowInstance(userId, initialInteraction, initialState, steps, this, executionContext);
        this.flows.set(userId, instance as FlowInstance<any>);
        await instance.start();
    }

    /**
     * @brief Forward an incoming interaction to the active flow bound to the interaction user
     * @param interaction Interaction Discord interaction instance to process
     * @returns Promise Resolves after flow specific handlers complete
     */
    public async onInteraction(interaction: Interaction) {
        const userId = (interaction as any).user?.id;
        if (!userId) {
            return;
        }
        const instance = this.flows.get(userId);
        if (!instance) {
            return;
        }
        await instance.handleInteraction(interaction);
    }

    /**
     * @brief Forward an incoming message to the active flow bound to the author
     * @param message Message Discord message instance to evaluate
     * @returns Promise Resolves after flow specific handlers finish
     */
    public async onMessage(message: Message) {
        const userId = (message as any).author.id;
        const instance = this.flows.get(userId);
        if (!instance) {
            return;
        }
        await instance.handleMessage(message);
    }

    /**
     * @brief Remove flow tracking for the supplied user typically invoked once a flow completes or is cancelled
     * @param userId string Discord snowflake identifying the user
     * @returns void This method is synchronous and no promise is returned
     */
    public internalRemove(userId: string) {
        this.flows.delete(userId);
    }

    /**
     * @brief Create a FlowBuilder for fluent flow construction
     * @param userId string Discord user identifier
     * @param initialInteraction Interaction Initial Discord interaction that triggered the flow
     * @param initialState State Mutable state seed for the flow
     * @param executionContext ExecutionContext Optional shared execution context
     * @returns FlowBuilder Fluent builder configured for the supplied state shape
     */
    public builder<State>(
        userId: string,
        initialInteraction: Interaction,
        initialState: State,
        executionContext?: ExecutionContext,
    ): FlowBuilder<State> {
        const ctx = executionContext ?? (initialInteraction as any).executionContext;
        return new FlowBuilder(this, userId, initialInteraction, initialState, ctx);
    }
}

/**
 * @brief Shared FlowManager instance used across the application for coordinating user flows
 */
export const flowManager = new FlowManager();
