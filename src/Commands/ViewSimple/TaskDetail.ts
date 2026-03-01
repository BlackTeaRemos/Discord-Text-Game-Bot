import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TaskListItem } from '../../Domain/Task.js';
import { FetchTaskById } from '../../Flow/Task/Query/FetchTaskById.js';
import { UpdateTaskStatus } from '../../Flow/Task/Command/UpdateTaskStatus.js';
import { FetchDescriptionForObject } from '../../Flow/Object/Description/FetchForObject.js';
import { FetchObjectDetail } from '../../Flow/Object/FetchObjectDetail.js';
import { ResolveObjectActions } from '../../Flow/Object/ResolveObjectActions.js';
import { BuildDetailPages } from '../../Framework/ObjectView/ObjectDetailPageBuilder.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { flowManager } from '../../Common/Flow/Manager.js';
import type { ExecutionContext } from '../../Domain/Command.js';
import { TranslateFromContext, GetCachedLocale } from '../../Services/I18nService.js';
import type { ObjectViewPage } from '../../Framework/ObjectView/ObjectViewTypes.js';

const VIEW_TASK_DETAIL_PREV_ID = `view_task_detail_prev`;
const VIEW_TASK_DETAIL_NEXT_ID = `view_task_detail_next`;
const VIEW_TASK_FINISH_ID = `view_task_finish`;
const VIEW_TASK_CANCEL_ID = `view_task_cancel`;

/**
 * @brief Flow state for task detail viewing with multi page support
 */
interface ViewTaskDetailState {
    task: TaskListItem; // current task item
    baseInteraction: ChatInputCommandInteraction; // original interaction
    organizationName: string; // execution organization label
    organizationUid: string | null; // execution organization uid
    executionContext: ExecutionContext; // interaction execution context
    detailPages: ObjectViewPage[]; // pre built detail pages
    detailPageIndex: number; // current detail page index
}

/**
 * @brief Show task detail with multi page view and status action buttons
 * @param interaction ChatInputCommandInteraction Base interaction
 * @param taskId string Task id to display
 * @param allowOverride boolean Whether viewer can override org scoped visibility
 * @param organizationUid string or null Resolved org UID for scope
 * @param organizationName string Resolved org display name
 * @param executionContext ExecutionContext Interaction execution context
 * @returns void Resolves when detail flow completes
 * @example await ShowTaskDetail(interaction, 'task_123', false, 'org_1', 'Main', ctx)
 */
export async function ShowTaskDetail(
    interaction: ChatInputCommandInteraction,
    taskId: string,
    allowOverride: boolean,
    organizationUid: string | null,
    organizationName: string,
    executionContext: ExecutionContext,
): Promise<void> {
    const task = await FetchTaskById(neo4jClient, {
        taskId,
        organizationUid: organizationUid ?? ``,
        viewerDiscordId: interaction.user.id,
        allowOverride,
    });

    if (!task) {
        await interaction.editReply({
            content: TranslateFromContext(executionContext, `commands.view.task.errors.notFoundOrDenied`),
        });
        return;
    }

    const detail = await FetchObjectDetail(task.id, true);
    const organizationUidsForScope = organizationUid ? [organizationUid] : [];
    const scopedDescription = await FetchDescriptionForObject({
        objectUid: task.id,
        objectType: `task`,
        userUid: interaction.user.id,
        organizationUids: organizationUidsForScope,
    });
    const displayDescription = scopedDescription || task.description || null;
    const noDescription = TranslateFromContext(executionContext, `commands.view.task.labels.noDescription`);
    const actions = ResolveObjectActions(`task`, task.id);

    const viewModel = BuildDetailPages({
        detail: detail ?? {
            uid: task.id,
            labels: [`Task`],
            properties: { name: task.shortDescription || task.id, status: task.status },
            parameters: {},
            relationships: [],
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            parameterHistory: [],
        },
        objectType: `task`,
        description: displayDescription,
        organizationName,
        actions,
        noDescriptionLabel: noDescription,
        overviewLabels: {
            type: TranslateFromContext(executionContext, `commands.view.object.labels.type`),
            organization: TranslateFromContext(executionContext, `objectRegistry.task.organization`),
            createdAt: TranslateFromContext(executionContext, `commands.view.object.detail.createdAt`),
            updatedAt: TranslateFromContext(executionContext, `commands.view.object.detail.updatedAt`),
            owner: TranslateFromContext(executionContext, `commands.view.object.detail.owner`),
            userScope: TranslateFromContext(executionContext, `commands.view.common.user`),
            propertiesTitle: TranslateFromContext(executionContext, `commands.view.object.detail.propertiesTitle`),
            relationshipsTitle: TranslateFromContext(executionContext, `commands.view.object.detail.relationshipsTitle`),
            actionsTitle: TranslateFromContext(executionContext, `commands.view.object.detail.actionsTitle`),
        },
        locale: GetCachedLocale(executionContext),
    });

    // Inject status field into first page
    const statusLabel = TranslateFromContext(executionContext, `objectRegistry.task.status`);
    if (viewModel.pages[0]) {
        viewModel.pages[0].fields = viewModel.pages[0].fields ?? [];
        viewModel.pages[0].fields.unshift({ name: statusLabel, value: String(task.status), inline: true });
    }

    const initialState: ViewTaskDetailState = {
        task,
        baseInteraction: interaction,
        organizationName,
        organizationUid,
        executionContext,
        detailPages: viewModel.pages,
        detailPageIndex: 0,
    };

    await flowManager
        .builder(interaction.user.id, interaction, initialState)
        .step([VIEW_TASK_DETAIL_PREV_ID, VIEW_TASK_DETAIL_NEXT_ID, VIEW_TASK_FINISH_ID, VIEW_TASK_CANCEL_ID], `view_task_detail`)
        .prompt(async ctx => {
            await __RenderTaskDetail(ctx.state);
        })
        .onInteraction(async (ctx, incomingInteraction) => {
            if (!incomingInteraction.isButton()) {
                return false;
            }

            if (incomingInteraction.customId === VIEW_TASK_DETAIL_PREV_ID) {
                ctx.state.detailPageIndex = Math.max(0, ctx.state.detailPageIndex - 1);
                await incomingInteraction.deferUpdate();
                await __RenderTaskDetail(ctx.state);
                return false;
            }

            if (incomingInteraction.customId === VIEW_TASK_DETAIL_NEXT_ID) {
                ctx.state.detailPageIndex = Math.min(ctx.state.detailPages.length - 1, ctx.state.detailPageIndex + 1);
                await incomingInteraction.deferUpdate();
                await __RenderTaskDetail(ctx.state);
                return false;
            }

            let nextStatus: string | null = null;
            if (incomingInteraction.customId === VIEW_TASK_FINISH_ID) {
                nextStatus = `complete`;
            } else if (incomingInteraction.customId === VIEW_TASK_CANCEL_ID) {
                nextStatus = `failed`;
            }

            if (!nextStatus) {
                return false;
            }

            await incomingInteraction.deferUpdate();

            const updated = await UpdateTaskStatus(neo4jClient, {
                taskId: ctx.state.task.id,
                organizationUid: organizationUid ?? ``,
                viewerDiscordId: interaction.user.id,
                status: nextStatus as any,
                allowOverride,
            });

            if (!updated) {
                await interaction.followUp({
                    content: TranslateFromContext(executionContext, `commands.view.task.errors.updateFailed`),
                    flags: MessageFlags.Ephemeral,
                });
                return false;
            }

            ctx.state.task = updated;
            await __RenderTaskDetail(ctx.state);
            return false;
        })
        .next()
        .start();
}

/**
 * @brief Render a single task detail page from pre built pages
 * @param state ViewTaskDetailState Current detail state with pages
 * @returns void Resolves when reply is updated
 */
async function __RenderTaskDetail(state: ViewTaskDetailState): Promise<void> {
    const page = state.detailPages[state.detailPageIndex] ?? state.detailPages[0];
    const totalPages = state.detailPages.length;

    const embed = new EmbedBuilder()
        .setTitle(page.title || TranslateFromContext(state.executionContext, `commands.view.task.labels.detailTitle`, {
            params: { id: state.task.id },
        }))
        .setDescription(page.description)
        .setColor(`Blue`);

    if (page.fields?.length) {
        for (const field of page.fields) {
            embed.addFields({ name: field.name, value: field.value, inline: field.inline ?? false });
        }
    }

    if (totalPages > 1) {
        embed.setFooter({ text: `${state.detailPageIndex + 1}/${totalPages}` });
    }

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    if (totalPages > 1) {
        const prevButton = new ButtonBuilder()
            .setCustomId(VIEW_TASK_DETAIL_PREV_ID)
            .setLabel(TranslateFromContext(state.executionContext, `commands.view.task.actions.previous`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(state.detailPageIndex === 0);
        const nextButton = new ButtonBuilder()
            .setCustomId(VIEW_TASK_DETAIL_NEXT_ID)
            .setLabel(TranslateFromContext(state.executionContext, `commands.view.task.actions.next`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(state.detailPageIndex >= totalPages - 1);
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton));
    }

    const finishButton = new ButtonBuilder()
        .setCustomId(VIEW_TASK_FINISH_ID)
        .setLabel(TranslateFromContext(state.executionContext, `commands.view.task.actions.finish`))
        .setStyle(ButtonStyle.Success);
    const cancelButton = new ButtonBuilder()
        .setCustomId(VIEW_TASK_CANCEL_ID)
        .setLabel(TranslateFromContext(state.executionContext, `commands.view.task.actions.cancel`))
        .setStyle(ButtonStyle.Danger);
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(finishButton, cancelButton));

    await state.baseInteraction.editReply({
        embeds: [embed],
        components: rows,
    });
}
