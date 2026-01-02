import { EmbedBuilder, MessageFlags, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import { ListTaggedParameterTags, GetLatestTaggedParameterByTag } from '../../Flow/Object/Parameter/index.js';
import { ResolveParameterParser } from '../../Flow/Command/Parameter/Parser/index.js';
import { VIEW_PARAMETER_BUTTON_ID, ParseViewParameterButtonId } from './ParameterActionId.js';

const VIEW_PARAMETER_TAG_SELECT_ID = `view_parameters_select_tag`;

/**
 * Handle parameter view button interactions.
 * @param interaction ButtonInteraction Button interaction.
 * @returns Promise<boolean> True if handled.
 */
export async function HandleViewParameterActionInteraction(interaction: ButtonInteraction): Promise<boolean> {
    if (!interaction.customId.startsWith(`${VIEW_PARAMETER_BUTTON_ID}:`)) {
        return false;
    }

    let type: any;
    let id: string;
    try {
        const parsed = ParseViewParameterButtonId(interaction.customId);
        type = parsed.type;
        id = parsed.id;
    } catch {
        return false;
    }

    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        const tags = await ListTaggedParameterTags({ objectType: type, objectUid: id });
        if (tags.length === 0) {
            await interaction.editReply({ content: `No parameters found for this object.`, components: [] });
            return true;
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId(VIEW_PARAMETER_TAG_SELECT_ID)
            .setPlaceholder(`Select parameter tag`)
            .addOptions(
                tags.slice(0, 25).map(tagItem => {
                    return { label: tagItem.tag.slice(0, 100), value: tagItem.tag } as any;
                }),
            );

        await interaction.editReply({
            content: `Select which parameters you want to view.`,
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
        });

        const message = await interaction.fetchReply();

        let selectedTag: string;
        try {
            const collected = await message.awaitMessageComponent({
                filter: component => {
                    return component.user.id === interaction.user.id && component.customId === VIEW_PARAMETER_TAG_SELECT_ID;
                },
                time: 60_000,
            });

            if (!collected.isStringSelectMenu()) {
                await interaction.editReply({ content: `Invalid selection.`, components: [] });
                return true;
            }

            await collected.deferUpdate();
            selectedTag = collected.values[0];
        } catch {
            await interaction.editReply({ content: `Selection timed out.`, components: [] });
            return true;
        }

        const latest = await GetLatestTaggedParameterByTag({ objectType: type, objectUid: id, tag: selectedTag });
        if (!latest) {
            await interaction.editReply({ content: `No data found for tag: ${selectedTag}`, components: [] });
            return true;
        }

        let payload: unknown;
        try {
            payload = JSON.parse(latest.payload_json);
        } catch {
            payload = latest.payload_json;
        }

        const parser = ResolveParameterParser(selectedTag);
        const rendered = await parser({ objectType: type, objectUid: id, tag: selectedTag, payload });

        const embed = new EmbedBuilder().setColor(`Blue`).setTitle(rendered.title).setDescription(rendered.content);

        await interaction.editReply({ content: ``, embeds: [embed], components: [] });
        return true;
    } catch {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply({ content: `Failed to view parameters.`, flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.followUp({ content: `Failed to view parameters.`, flags: MessageFlags.Ephemeral });
            return true;
        } catch {
            return true;
        }
    }
}
