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
import { randomUUID } from 'crypto';
import type { ObjectViewModel, ObjectViewPage, ObjectViewResolver } from './ObjectViewTypes.js';
import { ResolveObjectViewTheme } from './ObjectViewTheme.js';
import { Translate } from '../Services/I18nService.js';

interface ObjectViewSession {
    pages: ObjectViewPage[];
    model: ObjectViewModel;
    index: number;
    resolver?: ObjectViewResolver;
    message?: Message<boolean>;
    timeoutMs: number;
    deleteOnTimeout: boolean;
    timer?: NodeJS.Timeout;
    ephemeral: boolean;
}

export class ObjectViewRenderer {
    private readonly _sessions = new Map<string, ObjectViewSession>();
    private readonly _customIdPrefix: string;

    constructor(customIdPrefix = `obj_view`) {
        this._customIdPrefix = customIdPrefix;
    }

    /** Send initial view; arms timeout. */
    async RenderInitial(
        interaction: ChatInputCommandInteraction,
        model: ObjectViewModel,
        ephemeral = true,
        resolver?: ObjectViewResolver,
        timeoutMs = 5 * 60 * 1000,
        deleteOnTimeout = false,
    ): Promise<Message<boolean> | void> {
        const sessionId = this.__createSession(model, resolver, ephemeral, timeoutMs, deleteOnTimeout);
        const page = this.__getPage(sessionId, 0);
        const reply: InteractionReplyOptions = {
            embeds: [this.__buildEmbed(model, page, 0)],
            components: this.__buildControls(sessionId, model.pages.length, 0),
            ephemeral,
        };
        const send = interaction.replied || interaction.deferred ? interaction.followUp(reply) : interaction.reply(reply);
        const msg = (await send) as Message<boolean> | void;
        this.__armTimeout(sessionId, msg as Message<boolean> | undefined);
        return msg;
    }

    /** Handle pagination button; refresh data if resolver is provided. */
    async HandleInteraction(interaction: ButtonInteraction): Promise<boolean> {
        const [prefix, sessionId, action] = (interaction.customId || ``).split(`:`);
        if (prefix !== this._customIdPrefix || !sessionId || !action) {
            return false;
        }
        const session = this._sessions.get(sessionId);
        if (!session) {
            return false;
        }
        await this.__refreshSession(sessionId);
        if (action === `prev`) {
            session.index = Math.max(0, session.index - 1);
        }
        if (action === `next`) {
            session.index = Math.min(session.pages.length - 1, session.index + 1);
        }
        const page = this.__getPage(sessionId, session.index);
        await interaction.update({
            embeds: [this.__buildEmbed(session.model, page, session.index)],
            components: this.__buildControls(sessionId, session.pages.length, session.index),
        });
        this.__armTimeout(sessionId, session.message);
        return true;
    }

    private __createSession(
        model: ObjectViewModel,
        resolver: ObjectViewResolver | undefined,
        ephemeral: boolean,
        timeoutMs: number,
        deleteOnTimeout: boolean,
    ): string {
        const sessionId = `${this._customIdPrefix}_${randomUUID()}`;
        this._sessions.set(sessionId, { model, pages: model.pages, index: 0, resolver, timeoutMs, deleteOnTimeout, ephemeral });
        return sessionId;
    }

    private __armTimeout(sessionId: string, message?: Message<boolean>): void {
        const session = this._sessions.get(sessionId);
        if (!session) {
            return;
        }
        session.message = message;
        if (session.timer) {
            clearTimeout(session.timer);
        }
        session.timer = setTimeout(() => {
            this.__expireSession(sessionId).catch(() => {});
        }, session.timeoutMs);
    }

    private async __expireSession(sessionId: string): Promise<void> {
        const session = this._sessions.get(sessionId);
        if (!session) {
            return;
        }
        this._sessions.delete(sessionId);
        if (session.ephemeral) {
            return;
        }
        const msg = session.message;
        if (!msg) {
            return;
        }
        try {
            if (session.deleteOnTimeout) {
                await msg.delete();
            } else {
                await msg.edit({ components: [] });
            }
        } catch {}
    }

    private async __refreshSession(sessionId: string): Promise<void> {
        const session = this._sessions.get(sessionId);
        if (!session?.resolver) {
            return;
        }
        const fresh = await session.resolver();
        session.model = fresh;
        session.pages = fresh.pages;
        session.index = Math.min(session.index, Math.max(0, session.pages.length - 1));
    }

    private __getPage(sessionId: string, index: number): ObjectViewPage {
        const session = this._sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        return session.pages[index] ?? session.pages[0];
    }

    private __buildEmbed(model: ObjectViewModel, page: ObjectViewPage, index: number): EmbedBuilder {
        const theme = ResolveObjectViewTheme(model.objectType);
        const resolvedColor = model.color ?? theme.color;
        const titleText = `${theme.accentEmoji} ${page.title || model.name}`;

        const embed = new EmbedBuilder()
            .setTitle(titleText)
            .setDescription(page.description)
            .setColor(resolvedColor);

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

    private __buildControls(sessionId: string, totalPages: number, index: number) {
        if (totalPages <= 1) {
            return [];
        }
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
        return [new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next)];
    }
}
