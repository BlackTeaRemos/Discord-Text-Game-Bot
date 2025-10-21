import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import { getUserOrganizations } from '../../Flow/Command/Description/getUserOrganizations.js';
import type { TaskFlowState } from './TaskFlowState.js';

function buildOrganizationOptions(orgs: Array<{ uid: string; name: string }>): Array<{ label: string; value: string }> {
    const seen = new Set<string>();
    const options: Array<{ label: string; value: string }> = [];
    for (const org of orgs) {
        const value = String(org.uid ?? ``).trim();
        if (!value || seen.has(value)) {
            continue;
        }
        seen.add(value);
        options.push({ label: org.name.slice(0, 50), value });
        if (options.length >= 25) {
            break;
        }
    }
    return options;
}

export function registerTaskOrganizationStep(
    builder: FlowBuilder<TaskFlowState>,
    interaction: ChatInputCommandInteraction,
): FlowBuilder<TaskFlowState> {
    return builder
        .step(`task_select_org`, `task_org`)
        .prompt(async (ctx: StepContext<TaskFlowState>) => {
            ctx.state.baseInteraction = interaction;
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const orgs = await getUserOrganizations(interaction.user.id);
            if (orgs.length === 0) {
                await interaction.editReply({ content: `You are not linked to any organization.` });
                await ctx.cancel();
                return;
            }
            if (orgs.length === 1) {
                ctx.state.organizationUid = orgs[0].uid;
                ctx.state.organizationName = orgs[0].name;
                await ctx.advance();
                return;
            }
            const options = buildOrganizationOptions(orgs);
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`task_select_org`)
                .setPlaceholder(`Select organization`)
                .addOptions(options as any);
            await interaction.editReply({
                content: `Choose organization to continue.`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
            });
        })
        .onInteraction(async (ctx: StepContext<TaskFlowState>, select) => {
            if (!select.isStringSelectMenu()) {
                return false;
            }
            ctx.state.organizationUid = select.values[0];
            const match = select.component.options?.find(option => {
                return option.value === select.values[0];
            });
            ctx.state.organizationName = match?.label || select.values[0];
            await select.deferUpdate();
            return true;
        })
        .next();
}
