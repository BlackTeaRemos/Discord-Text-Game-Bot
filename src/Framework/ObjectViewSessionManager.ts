import { randomUUID } from 'crypto';
import type { Message } from 'discord.js';
import type { ObjectViewModel, ObjectViewPage, ObjectViewResolver } from './ObjectViewTypes.js';

/**
 * Tracks a single active object view session with pagination state and timeout
 * @property pages ObjectViewPage[] Current page set
 * @property model ObjectViewModel Current view model
 * @property index number Active page index
 * @property resolver ObjectViewResolver | undefined Optional data refresher
 * @property message Message | undefined Discord message reference for editing
 * @property timeoutMs number Session expiry duration in milliseconds
 * @property deleteOnTimeout boolean Whether to delete the message on expiry
 * @property timer NodeJS.Timeout | undefined Active expiry timer
 * @property ephemeral boolean Whether the original reply was ephemeral
 */
export interface ObjectViewSession {
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

/**
 * Manages the lifecycle of object view sessions including creation, pagination, timeout, and cleanup
 * Each session is identified by a unique UUID-based string prefixed with the renderer's custom ID
 */
export class ObjectViewSessionManager {
    private readonly _sessions = new Map<string, ObjectViewSession>();
    private readonly _idPrefix: string;

    /**
     * @param idPrefix string Prefix for session IDs, typically the renderer's customIdPrefix
     *
     * @example
     * const manager = new ObjectViewSessionManager('obj_view');
     */
    constructor(idPrefix: string) {
        this._idPrefix = idPrefix;
    }

    /**
     * Create a new session for a view model and return its unique session ID
     *
     * @param model ObjectViewModel The view model to display
     * @param resolver ObjectViewResolver | undefined Optional data refresher
     * @param ephemeral boolean Whether the reply is ephemeral
     * @param timeoutMs number Session timeout in milliseconds
     * @param deleteOnTimeout boolean Delete message on timeout
     * @returns string Unique session ID
     *
     * @example
     * const sessionId = manager.Create(model, undefined, true, 300000, false);
     */
    public Create(
        model: ObjectViewModel,
        resolver: ObjectViewResolver | undefined,
        ephemeral: boolean,
        timeoutMs: number,
        deleteOnTimeout: boolean,
    ): string {
        const sessionId = `${this._idPrefix}_${randomUUID()}`;
        this._sessions.set(sessionId, {
            model,
            pages: model.pages,
            index: 0,
            resolver,
            timeoutMs,
            deleteOnTimeout,
            ephemeral,
        });
        return sessionId;
    }

    /**
     * Retrieve a session by its ID
     *
     * @param sessionId string Session identifier
     * @returns ObjectViewSession | undefined The session if found
     */
    public Get(sessionId: string): ObjectViewSession | undefined {
        return this._sessions.get(sessionId);
    }

    /**
     * Retrieve a specific page from a session, falling back to page 0 if out of bounds
     *
     * @param sessionId string Session identifier
     * @param pageIndex number Zero-based page index
     * @returns ObjectViewPage The resolved page
     */
    public GetPage(sessionId: string, pageIndex: number): ObjectViewPage {
        const session = this._sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        return session.pages[pageIndex] ?? session.pages[0];
    }

    /**
     * Refresh session data from the resolver if one is registered
     * Updates model, pages, and clamps index to valid range
     *
     * @param sessionId string Session identifier
     */
    public async Refresh(sessionId: string): Promise<void> {
        const session = this._sessions.get(sessionId);
        if (!session?.resolver) {
            return;
        }
        const fresh = await session.resolver();
        session.model = fresh;
        session.pages = fresh.pages;
        session.index = Math.min(session.index, Math.max(0, session.pages.length - 1));
    }

    /**
     * Arm or re-arm the session timeout, storing the message reference for later cleanup
     *
     * @param sessionId string Session identifier
     * @param message Message | undefined Discord message to clean up on expiry
     */
    public ArmTimeout(sessionId: string, message?: Message<boolean>): void {
        const session = this._sessions.get(sessionId);
        if (!session) {
            return;
        }
        session.message = message;
        if (session.timer) {
            clearTimeout(session.timer);
        }
        session.timer = setTimeout(() => {
            this.__expire(sessionId).catch(() => {});
        }, session.timeoutMs);
    }

    /**
     * Expire and clean up a session, optionally deleting or disabling the Discord message
     *
     * @param sessionId string Session identifier
     */
    private async __expire(sessionId: string): Promise<void> {
        const session = this._sessions.get(sessionId);
        if (!session) {
            return;
        }
        this._sessions.delete(sessionId);
        if (session.ephemeral) {
            return;
        }
        const message = session.message;
        if (!message) {
            return;
        }
        try {
            if (session.deleteOnTimeout) {
                await message.delete();
            } else {
                await message.edit({ components: [] });
            }
        } catch {
            // Message may already be deleted
        }
    }
}
