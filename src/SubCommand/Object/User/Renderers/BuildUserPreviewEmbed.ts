import { Colors, EmbedBuilder } from 'discord.js';
import type { UserCreateFlowState } from '../../../../Flow/Object/User/CreateState.js';
import { Translate } from '../../../../Services/I18nService.js';

/**
 * Build the embed showing the live preview of the user being registered.
 * @param state UserCreateFlowState Current mutable flow state. @example BuildUserPreviewEmbed(state)
 * @returns EmbedBuilder Configured embed for the preview message. @example const embed = BuildUserPreviewEmbed(state)
 */
export function BuildUserPreviewEmbed(state: UserCreateFlowState): EmbedBuilder {
    const discordId = state.discordId?.trim() ? state.discordId.trim() : Translate(`userCreate.preview.discordNotSet`);
    const displayName = state.displayName?.trim() ? state.displayName.trim() : Translate(`userCreate.preview.newUser`);
    const friendlyName = state.friendlyName?.trim() ? state.friendlyName.trim() : Translate(`userCreate.preview.friendlyNotProvided`);
    const description = state.description?.trim() ? state.description.trim() : Translate(`userCreate.preview.noDescription`);

    return new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(displayName)
        .setDescription(description)
        .addFields({ name: Translate(`userCreate.preview.discordIdLabel`), value: discordId, inline: true })
        .addFields({ name: Translate(`userCreate.preview.friendlyNameLabel`), value: friendlyName, inline: true });
}
