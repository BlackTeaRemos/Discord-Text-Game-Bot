import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { RemoveFactory, GetFactoryOrganizationUid } from '../../../Flow/Object/Building/Remove.js';
import { log } from '../../../Common/Log.js';
import { createCommandContext } from '../../../Common/ExecutionContextHelpers.js';
import { resolve, type TokenSegmentInput } from '../../../Common/permission/index.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`remove`)
    .setDescription(`Remove a factory`)
    .addStringOption(o => {
        return o.setName(`uid`).setDescription(`Factory UID`).setRequired(true);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `building`, `remove`]];

export async function execute(interaction: ChatInputCommandInteraction) {
    const ctx = createCommandContext(interaction);

    const uid = interaction.options.getString(`uid`, true).trim();
    try {
        const orgUid = await GetFactoryOrganizationUid(uid);
        if (!orgUid) {
            return await ctx.reply({ content: `Factory not found`, flags: MessageFlags.Ephemeral });
        }

        const member = interaction.guild
            ? await interaction.guild.members.fetch(interaction.user.id).catch(() => {
                return null;
            })
            : null;

        const permissionResult = await resolve([[`object`, `building`, `remove`]]);

        if (!permissionResult.success) {
            const denialReason = permissionResult.detail.reason ?? `Permission denied.`;
            return await ctx.reply({ content: denialReason, flags: MessageFlags.Ephemeral });
        }

        const deleted = await RemoveFactory(uid);
        if (!deleted) {
            return await ctx.reply({ content: `Factory not found`, flags: MessageFlags.Ephemeral });
        }
        return await ctx.reply({ content: `Factory ${uid} removed.`, flags: MessageFlags.Ephemeral });
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Error removing factory`, errorMessage, `removeFactory`);
        return await ctx.reply({ content: `Error removing factory`, flags: MessageFlags.Ephemeral });
    }
}
