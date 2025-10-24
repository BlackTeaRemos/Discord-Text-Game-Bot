import { ChatInputCommandInteraction, MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import { createGameCreateState } from '../../../Flow/Object/Game/Create.js';
import { FinalizeGameCreation } from '../../../Flow/Object/Game/CreateFinalize.js';
import { SetGameImageUrl } from '../../../Flow/Object/Game/CreateImage.js';
import { resolveGameCreatePermissions } from '../../../Flow/Command/GameCreateFlow.js';
import { RequestPermissionFromAdmin } from '../../../SubCommand/Permission/PermissionUI.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Create a new game immediately using provided details`)
    .addStringOption(option => {
        return option
            .setName(`name`)
            .setDescription(`Optional default game name to prefill in the editor`)
            .setMaxLength(100)
            .setRequired(false);
    })
    .addStringOption(option => {
        return option
            .setName(`description`)
            .setDescription(`Optional short description shown on the game overview`)
            .setMaxLength(1024)
            .setRequired(false);
    })
    .addStringOption(option => {
        return option
            .setName(`image_url`)
            .setDescription(`Direct URL of the preview image (http/https)`)
            .setMaxLength(512)
            .setRequired(false);
    });

export const permissionTokens = `object:game:create`;

/**
 * Create a game record using command parameters without interactive modals.
 * @param interaction ChatInputCommandInteraction Slash subcommand interaction from Discord. @example await execute(interaction)
 * @returns Promise<void> Resolves after the game is created or an error message is sent. @example await execute(interaction)
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({ content: `This command must be used in a server.`, flags: MessageFlags.Ephemeral });
        return;
    }
    const nameOption = interaction.options.getString(`name`)?.trim() || undefined;
    const descriptionOption = interaction.options.getString(`description`)?.trim() || undefined;
    const imageOption = interaction.options.getString(`image_url`)?.trim() || undefined;

    if (imageOption && !/^https?:\/\//i.test(imageOption)) {
        await interaction.reply({ content: `Image URL must start with http or https.`, flags: MessageFlags.Ephemeral });
        return;
    }

    const permission = await resolveGameCreatePermissions(interaction, { serverId });
    if (!permission.allowed) {
        if (permission.requiresApproval) {
            const tokens = permission.tokens ?? [];
            if (tokens.length === 0) {
                await interaction.reply({
                    content: `Approval required but no permission tokens were supplied. Contact an administrator.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const decision = await RequestPermissionFromAdmin(interaction, {
                tokens,
                reason: permission.reason,
            });
            if (decision === `approve_once` || decision === `approve_forever`) {
                // continue
            } else if (decision === `timeout`) {
                await interaction.reply({
                    content: `No administrator responded in time. Try again later.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            } else if (decision === `no_admin`) {
                await interaction.reply({
                    content: `No eligible administrator could be contacted. Ask an admin to review permissions.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            } else {
                await interaction.reply({
                    content: `Permission request was denied. Adjust details or contact an administrator.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        } else {
            const reason = permission.reason ?? `Permission denied for game creation.`;
            await interaction.reply({ content: reason, flags: MessageFlags.Ephemeral });
            return;
        }
    }

    const state = createGameCreateState({ serverId, defaultName: nameOption });
    if (nameOption) {
        state.gameName = nameOption;
    }
    if (descriptionOption) {
        state.description = descriptionOption;
    }
    if (imageOption) {
        SetGameImageUrl(state, imageOption);
    }

    const result = await FinalizeGameCreation(state);
    if (!result.success || !result.game) {
        await interaction.reply({
            content: `Game creation failed: ${result.error ?? `Unknown error.`}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.reply({
        content: `Game created with uid ${result.game.uid} and name '${result.game.name}'.`,
        flags: MessageFlags.Ephemeral,
    });
}
