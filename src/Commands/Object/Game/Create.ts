import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { log } from '../../../Common/Log.js';
import { createGameCreateState } from '../../../Flow/Object/Game/Create.js';
import { GameCreateFlowConstants } from '../../../Flow/Object/Game/CreateState.js';
import { RegisterGameCreateSession } from '../../../SubCommand/Object/Game/GameCreateControls.js';
import { BuildControlsContent } from '../../../SubCommand/Object/Game/Renderers/BuildControlsContent.js';
import { BuildControlRows } from '../../../SubCommand/Object/Game/Renderers/BuildControlRows.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { ObjectViewRenderer } from '../../../Framework/ObjectViewRenderer.js';
import type { ObjectViewPage } from '../../../Framework/ObjectViewTypes.js';
import { CalculatePageCount, GetPageContent } from '../../../Flow/Object/Description/Scope/Types.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Preview a new game before completing creation`);

export const permissionTokens = `object:game:create`;

/**
 * Show a basic game preview embed before starting the interactive flow.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction used to reply with execution context hydrated. @example await ExecuteObjectGameCreate(interaction)
 * @returns Promise<void> Resolves after the preview embed is sent. @example await ExecuteObjectGameCreate(interaction)
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    try {
        const serverId = interaction.guildId;
        if (!serverId) {
            throw new Error(`This command must be used in a server.`);
        }

        const ownerDiscordId = interaction.user.id;
        const state = createGameCreateState({ serverId, ownerDiscordId });
        const renderer = new ObjectViewRenderer(`game_preview`);
        const pages = buildDescriptionPages(state.description, state.gameName);
        const model = {
            id: state.gameUid ?? `pending_game`,
            name: state.gameName,
            friendlyName: state.gameName,
            imageUrl: state.imageUrl ?? GameCreateFlowConstants.defaultImageUrl,
            pages,
        };

        const previewMessage = await renderer.RenderInitial(interaction, model, true);
        if (previewMessage) {
            state.previewMessageId = (previewMessage as any).id;
        }

        const controlsContent = BuildControlsContent(state);
        const controlRows = BuildControlRows(state);
        const controlsMessage = await interaction.followUp({
            content: controlsContent,
            components: controlRows,
            flags: MessageFlags.Ephemeral,
        });

        state.controlsMessageId = controlsMessage.id;

        const bucket = interaction.executionContext.shared.objectGameCreate ?? {};
        bucket.state = state;
        bucket.previewMessageId = state.previewMessageId;
        bucket.controlsMessageId = state.controlsMessageId;
        interaction.executionContext.shared.objectGameCreate = bucket;

        await RegisterGameCreateSession({
            interaction,
            state,
            previewMessageId: state.previewMessageId!,
            controlsMessageId: state.controlsMessageId!,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error); // normalized error message
        log.error(`Failed to execute object game create`, message, `ObjectGameCreateCommand`);
        const response = {
            content: `Unable to start game creation: ${message}`,
            flags: MessageFlags.Ephemeral,
        } as const;
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(response);
            } else {
                await interaction.reply(response);
            }
        } catch {
            // no-op if Discord refuses the message
        }
        throw error instanceof Error ? error : new Error(message);
    }
}

/**
 * Build paginated description pages for the game preview.
 * @param content string raw description text
 * @param title string page title derived from game name
 * @returns ObjectViewPage[] list of paged description segments
 */
function buildDescriptionPages(content: string, title: string): ObjectViewPage[] {
    const totalPages = CalculatePageCount(content);
    const pages = [] as ObjectViewPage[];
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        pages.push({
            title,
            description: GetPageContent(content, pageIndex),
            scopeLabel: `Global`,
            footer: `Description`,
        });
    }
    return pages;
}
