import { ChatInputCommandInteraction, MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { FlowManager } from '../../../Common/Flow/Manager.js';
import { flowManager as sharedFlowManager } from '../../../Common/Flow/Manager.js';
import { StartGameCreateFlow, createGameCreateState } from '../../../Flow/Object/Game/Create.js';
import type { GameCreateFlowState } from '../../../Flow/Object/Game/CreateState.js';
import { gameCreateRenderers } from '../../../SubCommand/Object/Game/CreateRenderers.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Start interactive game creation flow`)
    .addStringOption(option => {
        return option
            .setName(`name`)
            .setDescription(`Optional default game name to prefill in the editor`)
            .setMaxLength(100)
            .setRequired(false);
    });

export const permissionTokens = `object:game:create`;

/**
 * Launch the interactive game creation UI that renders preview and control buttons.
 * @param interaction ChatInputCommandInteraction Slash subcommand interaction from Discord. @example await execute(interaction)
 * @returns Promise<void> Resolves after the flow is scheduled. @example await execute(interaction)
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({ content: `This command must be used in a server.`, flags: MessageFlags.Ephemeral });
        return;
    }
    const defaultName = interaction.options.getString(`name`) ?? undefined;
    const state = createGameCreateState({ serverId, defaultName });
    const fm = sharedFlowManager as FlowManager;
    const builder = fm.builder<GameCreateFlowState>(interaction.user.id, interaction, state);
    const configured = StartGameCreateFlow({
        builder,
        memorySeed: {
            interaction,
            renderers: gameCreateRenderers,
        },
        serverId,
        defaultName,
    });
    await configured.start();
}
