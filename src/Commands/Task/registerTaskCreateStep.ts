import { EmbedBuilder } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { CreateTaskRecord } from '../../Flow/Task/CreateTaskRecord.js';
import type { TaskFlowState } from './TaskFlowState.js';


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
    const gameUid = ctx.state.gameUid;
    const turnNumber = ctx.state.currentTurn ?? null;
    const description = ctx.state.description;
    if (!baseInteraction || !orgUid || !description) {
        await ctx.cancel();
        return;
    }

    const task = await CreateTaskRecord(neo4jClient, {
        organizationUid: orgUid,
        gameUid: gameUid ?? null,
        turnNumber,
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
            { name: `Turn`, value: task.turnNumber ? String(task.turnNumber) : `Unassigned`, inline: true },
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
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
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
        .onMessage(async(ctx: StepContext<TaskFlowState>, message) => {
            if (ctx.state.action !== `create`) {
                return false;
            }
            const baseInteraction = ctx.state.baseInteraction;
            const orgUid = ctx.state.organizationUid;
            if (!baseInteraction || !orgUid) {
                await ctx.cancel();
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
            await __FinalizeTaskCreation(ctx, message.author.id);
            return true;
        })
        .next();
}
