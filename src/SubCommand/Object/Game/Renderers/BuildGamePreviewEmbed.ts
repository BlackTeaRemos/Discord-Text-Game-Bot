import { Colors, EmbedBuilder } from 'discord.js';
import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';

/**
 * Build the embed showing the live preview of the game being configured.
 * @param state GameCreateFlowState Current mutable flow state. @example BuildGamePreviewEmbed(state)
 * @returns EmbedBuilder Configured embed for the preview message. @example const embed = BuildGamePreviewEmbed(state)
 */
export function BuildGamePreviewEmbed(state: GameCreateFlowState): EmbedBuilder {
    const organization = state.organizationName ?? `Select an organization`;
    const gameName = state.gameName?.trim() ? state.gameName.trim() : `Unnamed game`;
    const description = state.description?.trim() ? state.description.trim() : `No description provided yet.`;
    const imageUrl = state.imageUrl || GameCreateFlowConstants.defaultImageUrl;
    const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setAuthor({ name: organization })
        .setTitle(gameName)
        .setDescription(description)
        .setFooter({ text: `Server ${state.serverId}` })
        .setThumbnail(imageUrl);
    if (!state.organizationUid) {
        embed.setTimestamp(new Date());
    }
    return embed;
}
