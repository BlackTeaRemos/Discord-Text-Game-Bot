import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowBuilder } from '../../../../Common/Flow/index.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { PrepareOrganizationPrompt, ResolveOrganizationName } from '../../../../SubCommand/Prompt/Organization.js';
import {
    CHARACTER_NO_ORGANIZATION_VALUE,
    CHARACTER_SELECT_ORGANIZATION_ID,
    type CharacterCreateFlowState,
} from '../CreateFlowTypes.js';

/**
 * Register the organization selection step for character creation.
 * @param builder FlowBuilder<CharacterCreateFlowState> Flow builder to extend. @example RegisterOrganizationSelectionStep(builder, interaction)
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Triggering interaction. @example interaction
 * @returns FlowBuilder<CharacterCreateFlowState> Updated builder.
 */
export function RegisterOrganizationSelectionStep(
    builder: FlowBuilder<CharacterCreateFlowState>,
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): FlowBuilder<CharacterCreateFlowState> {
    return builder
        .step(CHARACTER_SELECT_ORGANIZATION_ID)
        .prompt(async ctx => {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }

            const prompt = await PrepareOrganizationPrompt({
                userId: interaction.user.id,
                customId: CHARACTER_SELECT_ORGANIZATION_ID,
                placeholder: `Select organization (optional)`,
                promptMessage: `Select an organization for your character, or choose none.`,
                emptyMessage: `No organizations found. Creating an independent character.`,
            });

            if (prompt.status === `empty`) {
                ctx.state.organizationUid = null;
                ctx.state.organizationName = null;
                await interaction.editReply({
                    content: prompt.message ?? `Creating an independent character.`,
                    components: [],
                });
                await ctx.advance();
                return;
            }

            if (prompt.status === `auto` && prompt.organization) {
                ctx.state.organizationUid = prompt.organization.uid;
                ctx.state.organizationName = prompt.organization.name;
                await interaction.editReply({
                    content: `Using organization: ${prompt.organization.name}`,
                    components: [],
                });
                await ctx.advance();
                return;
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId(CHARACTER_SELECT_ORGANIZATION_ID)
                .setPlaceholder(`Select organization (optional)`)
                .addOptions({ label: `No organization`, value: CHARACTER_NO_ORGANIZATION_VALUE } as any)
                .addOptions(
                    prompt.selection.orgs.slice(0, 24).map(org => {
                        return { label: org.name.slice(0, 100), value: org.uid } as any;
                    }),
                );

            await interaction.editReply({
                content: prompt.message ?? `Select an organization for the character.`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
            });
        })
        .onInteraction(async (ctx, select: any) => {
            if (!select.isStringSelectMenu() || select.customId !== CHARACTER_SELECT_ORGANIZATION_ID) {
                return false;
            }

            const selectedValue = select.values[0];
            if (selectedValue === CHARACTER_NO_ORGANIZATION_VALUE) {
                ctx.state.organizationUid = null;
                ctx.state.organizationName = null;
            } else {
                ctx.state.organizationUid = selectedValue;
                ctx.state.organizationName =
                    (await ResolveOrganizationName(interaction.user.id, selectedValue)) || selectedValue;
            }

            await select.deferUpdate();
            return true;
        })
        .next();
}
