import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandExecutionContext, ExecutionContext } from '../Domain/index.js';
import { flowManager } from './Flow/Manager.js';
import type { InteractionExecutionContextCarrier } from './Type/Interaction.js';

/**
 * @brief Utility functions bridging Discord commands and the execution context system
 */

/**
 * @brief Creates a CommandExecutionContext from a hydrated Discord ChatInputCommandInteraction
 *
 * @param interaction InteractionExecutionContextCarrier Discord interaction with execution context attached
 * @param correlationId string Optional correlation ID for tracing
 * @returns CommandExecutionContext with execution context populated
 *
 * @example
 * export async function execute(
 *   interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
 * ) {
 *   const ctx = createCommandContext(interaction);
 *
 *   // Use execution context to avoid recomputation
 *   const expensiveData = await ctx.executionContext.getOrCompute(
 *     'expensive-query',
 *     () => performExpensiveQuery()
 *   );
 *
 *   await ctx.reply(`Result: ${expensiveData}`);
 * }
 */
export function createCommandContext(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
    correlationId?: string,
): CommandExecutionContext {
    // Use the execution context that the interaction handler attaches which is always present
    const executionContext = interaction.executionContext;

    return {
        guildId: interaction.guildId || ``,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        options: Object.fromEntries(
            interaction.options.data.map(option => {
                return [option.name, option.value];
            }),
        ),
        reply: async message => {
            // Use reply for initial response and followUp for subsequent or deferred
            const isInitial = !interaction.replied && !interaction.deferred;
            if (isInitial) {
                if (typeof message === `string`) {
                    return await interaction.reply({ content: message });
                }
                return await interaction.reply(message);
            } else {
                // Fallback to followUp for later responses
                if (typeof message === `string`) {
                    return await interaction.followUp({ content: message });
                }
                return await interaction.followUp(message);
            }
        },
        executionContext,
    };
}

/**
 * @brief Creates execution context and passes it to flow manager for commands using flows
 *
 * @param interaction InteractionExecutionContextCarrier Discord interaction carrying execution context
 * @param flowBuilderFn Function that uses the flow builder
 * @param correlationId string Optional correlation ID
 *
 * @example
 * export async function execute(
 *   interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
 * ) {
 *   await executeWithContext(interaction, (flowManager, executionContext) =>
 *     flowManager
 *       .builder(interaction.user.id, interaction, {}, executionContext)
 *       .step('my_step')
 *       .prompt(async ctx => {
 *         // ctx.executionContext is available here
 *         const cached = await ctx.executionContext?.getOrCompute('key', () => 'value');
 *         // ... rest of flow
 *       })
 *       .next()
 *       .start()
 *   );
 * }
 */
export async function executeWithContext(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
    flowBuilderFn: (flowManager: any, executionContext: any) => Promise<void>,
    correlationId?: string,
): Promise<void> {
    // The interaction handler guarantees executionContext is attached as the concrete ExecutionContext type
    const executionContext = interaction.executionContext;
    await flowBuilderFn(flowManager, executionContext);
}
