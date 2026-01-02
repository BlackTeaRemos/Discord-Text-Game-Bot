import { MessageFlags } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import { RunDescriptionEditorFlow } from '../../Flow/Object/Description/Editor/index.js';
import { VIEW_DESCRIPTION_EDIT_BUTTON_ID } from './DescriptionActionRows.js';

/**
 * Handle view description action buttons.
 * @param interaction ButtonInteraction Button interaction from Discord.
 * @returns Promise<boolean> True when handled.
 */
export async function HandleViewDescriptionActionInteraction(interaction: ButtonInteraction): Promise<boolean> {
    if (!interaction.customId.startsWith(`${VIEW_DESCRIPTION_EDIT_BUTTON_ID}:`)) {
        return false;
    }

    const parts = interaction.customId.split(`:`);
    if (parts.length < 3) {
        return false;
    }

    const viewType = parts[1];
    const objectUid = parts.slice(2).join(`:`);

    const objectType = viewType === `building` ? `factory` : viewType;
    const canEditGlobal = interaction.memberPermissions?.has(`Administrator`) ?? false;

    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        await RunDescriptionEditorFlow(interaction, {
            objectType,
            objectUid,
            userUid: interaction.user.id,
            organizationUid: null,
            canEditGlobal,
        });

        return true;
    } catch(error) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
                content: `Failed to open description editor.`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        await interaction.followUp({
            content: `Failed to open description editor.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }
}
