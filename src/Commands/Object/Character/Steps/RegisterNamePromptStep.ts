import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowBuilder } from '../../../../Common/Flow/index.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { PromptText } from '../../../../SubCommand/Prompt/TextAsync.js';
import { CHARACTER_NAME_MAX_LENGTH, type CharacterCreateFlowState } from '../CreateFlowTypes.js';

/**
 * Register the character name prompt step.
 * @param builder FlowBuilder<CharacterCreateFlowState> Flow builder to extend.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Triggering interaction.
 * @returns FlowBuilder<CharacterCreateFlowState>
 */
export function RegisterNamePromptStep(
    builder: FlowBuilder<CharacterCreateFlowState>,
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): FlowBuilder<CharacterCreateFlowState> {
    return builder
        .step()
        .prompt(async ctx => {
            try {
                const name = await PromptText({
                    interaction: interaction as unknown as ChatInputCommandInteraction,
                    prompt: `Send the character name. Type **cancel** to abort.`,
                    minLength: 1,
                    maxLength: CHARACTER_NAME_MAX_LENGTH,
                    cancelWords: [`cancel`],
                });

                ctx.state.characterName = name;
                await ctx.advance();
            } catch (error) {
                const message = __NormalizePromptError(error);
                await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral }).catch(() => {
                    return undefined;
                });
                await ctx.cancel();
            }
        })
        .next();
}

function __NormalizePromptError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (message === `User cancelled the text prompt.`) {
        return `Character creation cancelled.`;
    }

    if (message === `User response timeout reached while waiting for text input.`) {
        return `No response received. Character creation cancelled.`;
    }

    return `Character creation failed: ${message}`;
}
