import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionReplyOptions,
    Message,
} from 'discord.js';
import type { ObjectViewModel, ObjectViewPage, ObjectViewResolver } from './ObjectViewTypes.js';
import { ResolveObjectViewTheme } from './ObjectViewThemeRegistry.js';
import './ObjectViewThemeDefaults.js';
import { Translate } from '../Services/I18nService.js';
import { ObjectViewSessionManager } from './ObjectViewSessionManager.js';
import { ResolveSectionAnchors } from './ResolveSectionAnchors.js';

/**
 * Renders paginated Discord embeds for object views and dispatches component interactions
 * Uses ObjectViewSessionManager for session lifecycle, focuses solely on rendering and routing
 */
export class ObjectViewRenderer {
    private static readonly __registry = new Map<string, ObjectViewRenderer>();
    private readonly _sessionManager: ObjectViewSessionManager;
    private readonly _customIdPrefix: string;

    /**
     * @param customIdPrefix string Prefix for component custom IDs, defaults to 'obj_view'
     *
     * @example
     * const renderer = new ObjectViewRenderer('game_view');
     */
    constructor(customIdPrefix = `obj_view`) {
        this._customIdPrefix = customIdPrefix;
        this._sessionManager = new ObjectViewSessionManager(customIdPrefix);
        ObjectViewRenderer.__registry.set(customIdPrefix, this);
    }

    /**
     * Dispatch an interaction to the correct renderer instance
     * Tries all registered renderers until one handles the interaction
     *
     * @param interaction ButtonInteraction Incoming button interaction
     * @returns Promise<boolean> True if any renderer handled it
     *
     * @example
     * const handled = await ObjectViewRenderer.DispatchInteraction(interaction);
     */
    static async DispatchInteraction(interaction: ButtonInteraction): Promise<boolean> {
        for (const renderer of ObjectViewRenderer.__registry.values()) {
            const handled = await renderer.HandleInteraction(interaction);
            if (handled) {
                return true;
            }
        }
        return false;
    }

    /**
     * Send the initial view reply, arming the session timeout
     *
     * @param interaction ChatInputCommandInteraction The originating slash command interaction
     * @param model ObjectViewModel The view model to render
     * @param ephemeral boolean Whether the reply is ephemeral
     * @param resolver ObjectViewResolver | undefined Optional data refresher
     * @param timeoutMs number Session timeout in milliseconds
     * @param deleteOnTimeout boolean Delete message on timeout
     * @returns Promise<Message | void> The sent message if available
     */
    async RenderInitial(
        interaction: ChatInputCommandInteraction,
        model: ObjectViewModel,
        ephemeral = true,
        resolver?: ObjectViewResolver,
        timeoutMs = 5 * 60 * 1000,
        deleteOnTimeout = false,
    ): Promise<Message<boolean> | void> {
        const sessionId = this._sessionManager.Create(model, resolver, ephemeral, timeoutMs, deleteOnTimeout);
        const page = this._sessionManager.GetPage(sessionId, 0);
        const reply: InteractionReplyOptions = {
            embeds: [this.__buildEmbed(model, page, 0)],
            components: this.__buildControls(sessionId, model.pages, 0),
            files: model.files ?? [],
            ephemeral,
        };
        const send = interaction.replied || interaction.deferred
            ? interaction.followUp(reply)
            : interaction.reply(reply);
        const message = (await send) as Message<boolean> | void;
        this._sessionManager.ArmTimeout(sessionId, message as Message<boolean> | undefined);
        return message;
    }

    /**
     * Handle a pagination or section jump button interaction
     * Routes to the correct session and updates the embed
     *
     * @param interaction ButtonInteraction Incoming button interaction
     * @returns Promise<boolean> True if this renderer handled the interaction
     */
    async HandleInteraction(interaction: ButtonInteraction): Promise<boolean> {
        const [prefix, sessionId, action] = (interaction.customId || ``).split(`:`);
        if (prefix !== this._customIdPrefix || !sessionId || !action) {
            return false;
        }
        const session = this._sessionManager.Get(sessionId);
        if (!session) {
            return false;
        }

        await this._sessionManager.Refresh(sessionId);
        if (action === `prev`) {
            session.index = Math.max(0, session.index - 1);
        }
        if (action === `next`) {
            session.index = Math.min(session.pages.length - 1, session.index + 1);
        }
        if (action.startsWith(`jump_`)) {
            const targetIndex = parseInt(action.slice(5), 10);
            if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < session.pages.length) {
                session.index = targetIndex;
            }
        }
        const page = this._sessionManager.GetPage(sessionId, session.index);
        await interaction.update({
            embeds: [this.__buildEmbed(session.model, page, session.index)],
            components: this.__buildControls(sessionId, session.pages, session.index),
            files: session.model.files ?? [],
        });
        this._sessionManager.ArmTimeout(sessionId, session.message);
        return true;
    }

    /**
     * Build a Discord embed from a view model and page
     */
    private __buildEmbed(model: ObjectViewModel, page: ObjectViewPage, index: number): EmbedBuilder {
        const theme = ResolveObjectViewTheme(model.objectType);
        const resolvedColor = model.color ?? theme.color;
        const titleText = `${theme.accentEmoji} ${page.title || model.name}`;

        const embed = new EmbedBuilder()
            .setTitle(titleText)
            .setColor(resolvedColor);

        if (page.description) {
            embed.setDescription(page.description);
        }

        if (page.fields?.length) {
            for (const field of page.fields) {
                embed.addFields({ name: field.name, value: field.value, inline: field.inline ?? false });
            }
        }

        const footerParts: string[] = [];
        if (page.scopeLabel) {
            footerParts.push(page.scopeLabel);
        }
        footerParts.push(Translate(`objectView.pageIndicator`, { params: { index: index + 1, total: model.pages.length } }));
        if (page.footer) {
            footerParts.push(page.footer);
        }
        if (footerParts.length) {
            embed.setFooter({ text: footerParts.join(` • `) });
        }

        const thumbnailUrl = page.thumbnailUrl ?? model.thumbnailUrl ?? theme.thumbnailUrl;
        if (thumbnailUrl) {
            embed.setThumbnail(thumbnailUrl);
        }

        if (page.imageUrl || model.imageUrl) {
            embed.setImage(page.imageUrl ?? model.imageUrl ?? ``);
        }

        if (page.timestamp) {
            embed.setTimestamp(page.timestamp);
        }

        if (model.friendlyName) {
            embed.setAuthor({ name: model.friendlyName });
        }

        return embed;
    }

    private __buildControls(
        sessionId: string,
        pages: ObjectViewPage[],
        index: number,
    ): ActionRowBuilder<ButtonBuilder>[] {
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        const totalPages = pages.length;

        if (totalPages > 1) {
            const prev = new ButtonBuilder()
                .setCustomId(`${this._customIdPrefix}:${sessionId}:prev`)
                .setLabel(Translate(`objectView.prev`))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(index === 0);
            const next = new ButtonBuilder()
                .setCustomId(`${this._customIdPrefix}:${sessionId}:next`)
                .setLabel(Translate(`objectView.next`))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(index >= totalPages - 1);
            rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next));
        }

        // Section quick-nav row below pagination
        const sectionAnchors = ResolveSectionAnchors(pages);
        if (sectionAnchors.length > 0 && totalPages > 1) {
            // Determine which section the current page belongs to
            const currentSection = pages[index]?.section
                ?? sectionAnchors.findLast(anchor => { return anchor.pageIndex <= index; })?.section;

            const sectionButtons = sectionAnchors.map(anchor => {
                const label = Translate(`objectView.section.${anchor.section}`);
                const isActive = anchor.section === currentSection;
                return new ButtonBuilder()
                    .setCustomId(`${this._customIdPrefix}:${sessionId}:jump_${anchor.pageIndex}`)
                    .setLabel(label)
                    .setStyle(isActive ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(isActive);
            });
            // Discord allows max 5 buttons per row
            rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...sectionButtons.slice(0, 5)));
        }

        return rows;
    }
}
