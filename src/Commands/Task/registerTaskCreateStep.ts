import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { createTaskRecord } from '../../Flow/Task/createTaskRecord.js';
import type { TaskFlowState } from './TaskFlowState.js';
import { buildExecutorOptions, resolveExecutorSelection } from './taskExecutorOptions.js';

const EXECUTOR_SELECT_ID = `task_create_executor`; // string guild component id for executor select menu

/**
 * Finishes task creation by persisting the record and updating the Discord response.
 * @param ctx StepContext<TaskFlowState> - Flow context tracking Discord interaction state. @example ctx.state.action
 * @param executorDiscordId string | null - Discord user id selected as executor or null to keep unassigned. @example '1234567890'
 * @returns Promise<void> - Resolves after the reply is updated and the flow cancels. @example await __FinalizeTaskCreation(ctx, null);
 * @example await __FinalizeTaskCreation(ctx, '1234567890');
 */
async function __FinalizeTaskCreation(
    ctx: StepContext<TaskFlowState>,
    executorDiscordId: string | null,
): Promise<void> {
    const baseInteraction = ctx.state.baseInteraction;
    const orgUid = ctx.state.organizationUid;
    const description = ctx.state.description;
    if (!baseInteraction || !orgUid || !description) {
        await ctx.cancel();
        return;
    }

    const task = await createTaskRecord(neo4jClient, {
        organizationUid: orgUid,
        creatorDiscordId: baseInteraction.user.id,
        description,
        executorDiscordId,
    });

    const embed = new EmbedBuilder()
        .setTitle(`Task created`)
        .setDescription(task.description)
        .addFields(
            { name: `Task ID`, value: task.id, inline: true },
            { name: `Status`, value: task.status, inline: true },
            {
                name: `Executor`,
                value: task.executorName ? `${task.executorName} (${task.executorDiscordId})` : `Unassigned`,
                inline: false,
            },
        );

    ctx.state.latestTask = task;
    ctx.state.awaitingAssignment = false;
    ctx.state.description = undefined;
    ctx.state.executorDiscordId = executorDiscordId;

    await baseInteraction.editReply({ content: `Task created successfully.`, embeds: [embed], components: [] });
    await ctx.cancel();
}

/**
 * Adds the create task interaction step workflow to the provided flow builder.
 * @param builder FlowBuilder<TaskFlowState> - Builder used to register flow steps for task commands. @example registerTaskCreateStep(flowBuilder)
 * @returns FlowBuilder<TaskFlowState> - Same builder instance for continued chaining. @example registerTaskCreateStep(flowBuilder).step('next', 'next')
 * @example registerTaskCreateStep(flowBuilder);
 */
export function registerTaskCreateStep(builder: FlowBuilder<TaskFlowState>): FlowBuilder<TaskFlowState> {
    return builder
        .step(`task_create`, `task_create`)
        .prompt(async (ctx: StepContext<TaskFlowState>) => {
            if (ctx.state.action !== `create`) {
                await ctx.advance();
                return;
            }
            const baseInteraction = ctx.state.baseInteraction;
            if (!baseInteraction || !ctx.state.organizationUid) {
                await ctx.cancel();
                return;
            }
            ctx.state.awaitingAssignment = false;
            ctx.state.description = undefined;
            await baseInteraction.editReply({
                content: `Send task description as a message. Type **cancel** to abort.`,
                components: [],
            });
        })
        .onMessage(async (ctx: StepContext<TaskFlowState>, message) => {
            if (ctx.state.action !== `create`) {
                return false;
            }
            const baseInteraction = ctx.state.baseInteraction;
            const orgUid = ctx.state.organizationUid;
            if (!baseInteraction || !orgUid) {
                await ctx.cancel();
                return false;
            }
            if (ctx.state.awaitingAssignment ?? false) {
                await message.reply(`Select executor from the menu above or type **cancel** to stop.`);
                return false;
            }
            const content = message.content?.trim();
            if (!content) {
                await message.reply(`Provide non-empty task description.`);
                return false;
            }
            if (content.toLowerCase() === `cancel`) {
                await baseInteraction.editReply({ content: `Task creation cancelled.`, components: [] });
                await ctx.cancel();
                return true;
            }
            ctx.state.description = content;
            const options = await buildExecutorOptions(orgUid, message.author.id);
            if (options.length <= 1) {
                await __FinalizeTaskCreation(ctx, message.author.id);
                return true;
            }
            ctx.state.awaitingAssignment = true;
            // Interaction prompting the creator to pick a task executor before finalizing creation.
            const menu = new StringSelectMenuBuilder()
                .setCustomId(EXECUTOR_SELECT_ID)
                .setPlaceholder(`Select executor`)
                .addOptions(options as any);
            await baseInteraction.editReply({
                content: `Select executor for this task or choose to leave it unassigned.`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
            });
            return false;
        })
        .onInteraction(async (ctx: StepContext<TaskFlowState>, interaction) => {
            if (ctx.state.action !== `create`) {
                return false;
            }
            if (!interaction.isStringSelectMenu() || interaction.customId !== EXECUTOR_SELECT_ID) {
                return false;
            }
            ctx.state.executorDiscordId = resolveExecutorSelection(interaction.values[0]);
            await interaction.deferUpdate();
            await __FinalizeTaskCreation(ctx, ctx.state.executorDiscordId ?? null);
            return true;
        })
        .next();
}
