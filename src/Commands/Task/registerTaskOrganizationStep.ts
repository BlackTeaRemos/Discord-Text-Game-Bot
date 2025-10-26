import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import type { TaskFlowState } from './TaskFlowState.js';
import { PrepareOrganizationPrompt, ResolveOrganizationName } from '../../SubCommand/Prompt/Organization.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

export function registerTaskOrganizationStep(
    builder: FlowBuilder<TaskFlowState>,
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): FlowBuilder<TaskFlowState> {
    return builder
        .step(`task_select_org`, `task_org`)
        .prompt(async (ctx: StepContext<TaskFlowState>) => {
            ctx.state.baseInteraction = interaction;
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const prompt = await PrepareOrganizationPrompt({
                userId: interaction.user.id,
                customId: `task_select_org`,
                placeholder: `Select organization`,
                promptMessage: `Choose organization to continue.`,
                emptyMessage: `You are not linked to any organization.`,
            });
            if (prompt.status === `empty`) {
                await interaction.editReply({
                    content: prompt.message ?? `You are not linked to any organization.`,
                    components: [],
                });
                await ctx.cancel();
                return;
            }
            if (prompt.status === `auto` && prompt.organization) {
                ctx.state.organizationUid = prompt.organization.uid;
                ctx.state.organizationName = prompt.organization.name;
                await ctx.advance();
                return;
            }
            await interaction.editReply({
                content: prompt.message ?? `Choose organization to continue.`,
                components: prompt.components ?? [],
            });
        })
        .onInteraction(async (ctx: StepContext<TaskFlowState>, select) => {
            if (!select.isStringSelectMenu()) {
                return false;
            }
            ctx.state.organizationUid = select.values[0];
            ctx.state.organizationName =
                (await ResolveOrganizationName(interaction.user.id, select.values[0])) ?? select.values[0];
            await select.deferUpdate();
            return true;
        })
        .next();
}
