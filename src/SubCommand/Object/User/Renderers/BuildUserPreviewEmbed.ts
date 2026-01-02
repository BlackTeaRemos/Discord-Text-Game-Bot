import { Colors, EmbedBuilder } from 'discord.js';
import type { UserCreateFlowState } from '../../../../Flow/Object/User/CreateState.js';

/**
 * Build the embed showing the live preview of the user being registered.
 * @param state UserCreateFlowState Current mutable flow state. @example BuildUserPreviewEmbed(state)
 * @returns EmbedBuilder Configured embed for the preview message. @example const embed = BuildUserPreviewEmbed(state)
 */
export function BuildUserPreviewEmbed(state: UserCreateFlowState): EmbedBuilder {
    const discordId = state.discordId?.trim() ? state.discordId.trim() : `Not set yet.`;
    const displayName = state.displayName?.trim() ? state.displayName.trim() : `New user`;
    const friendlyName = state.friendlyName?.trim() ? state.friendlyName.trim() : `Not provided`;
    const description = state.description?.trim() ? state.description.trim() : `No description provided yet.`;

    return new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(displayName)
        .setDescription(description)
        .addFields({ name: `Discord ID`, value: discordId, inline: true })
        .addFields({ name: `Friendly name`, value: friendlyName, inline: true });
}
