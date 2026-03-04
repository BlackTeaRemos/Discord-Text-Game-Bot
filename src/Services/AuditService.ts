import { Log } from '../Common/Log.js';
import { MAIN_EVENT_BUS } from '../Events/MainEventBus.js';
import { EVENT_NAMES } from '../Domain/index.js';
import type { EventName } from '../Domain/index.js';
import type { IAuditEntry, IAuditService } from './IAuditService.js';

const LOG_TAG = `AuditService`;
const MAX_RING_BUFFER_SIZE = 2000;

const SAMPLED_EVENTS = new Set<string>([
    EVENT_NAMES.output,
    EVENT_NAMES.input,
    EVENT_NAMES.discordMessageRaw,
    EVENT_NAMES.discordInteraction,
]);

const SAMPLE_RATE = 10;

export class AuditService implements IAuditService {
    private _entries: IAuditEntry[] = [];
    private _sampleCounters: Map<string, number> = new Map();

    public Start(): void {
        MAIN_EVENT_BUS.On(EVENT_NAMES.userCommandExecute, (commandName: string, userId: string) => {
            this.Record(EVENT_NAMES.userCommandExecute, userId, commandName);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.userAutocomplete, (commandName: string, userId: string) => {
            this.Record(EVENT_NAMES.userAutocomplete, userId, commandName);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.userComponentInteraction, (interactionId: string, userId: string) => {
            this.Record(EVENT_NAMES.userComponentInteraction, userId, interactionId);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.userFlowInteraction, (interactionId: string, userId: string) => {
            this.Record(EVENT_NAMES.userFlowInteraction, userId, interactionId);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.userFlowMessage, (messageId: string, userId: string) => {
            this.Record(EVENT_NAMES.userFlowMessage, userId, messageId);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.discordReady, () => {
            this.Record(EVENT_NAMES.discordReady, undefined, undefined);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.discordError, (err: unknown) => {
            this.Record(EVENT_NAMES.discordError, undefined, String(err));
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.configLoaded, () => {
            this.Record(EVENT_NAMES.configLoaded, undefined, undefined);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.configError, (err: unknown) => {
            this.Record(EVENT_NAMES.configError, undefined, String(err));
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.commandLoaded, (payload: { id: string; version: string }) => {
            this.Record(EVENT_NAMES.commandLoaded, undefined, payload.id);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.commandReloaded, (payload: { id: string; version: string }) => {
            this.Record(EVENT_NAMES.commandReloaded, undefined, payload.id);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.systemShutdown, () => {
            this.Record(EVENT_NAMES.systemShutdown, undefined, undefined);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.output, (message: string) => {
            this.Record(EVENT_NAMES.output, undefined, message.substring(0, 80));
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.input, (data: string) => {
            this.Record(EVENT_NAMES.input, undefined, data.substring(0, 80));
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.discordMessageRaw, (message: { id?: string; author?: { id?: string } }) => {
            this.Record(EVENT_NAMES.discordMessageRaw, message.author?.id, message.id);
        });

        MAIN_EVENT_BUS.On(EVENT_NAMES.discordInteraction, (interaction: { id?: string; user?: { id?: string } }) => {
            this.Record(EVENT_NAMES.discordInteraction, interaction.user?.id, interaction.id);
        });

        Log.info(`Audit listeners registered for all event bus events`, LOG_TAG);
    }

    public GetRecentEntries(count: number): IAuditEntry[] {
        const safeCount = Math.max(0, Math.min(count, this._entries.length));
        return this._entries.slice(-safeCount);
    }

    private Record(eventName: EventName, userId: string | undefined, actionIdentifier: string | undefined): void {
        if (SAMPLED_EVENTS.has(eventName)) {
            const current = (this._sampleCounters.get(eventName) ?? 0) + 1;
            this._sampleCounters.set(eventName, current);
            if (current % SAMPLE_RATE !== 0) {
                return;
            }
        }

        const entry: IAuditEntry = {
            timestamp: Date.now(),
            eventName,
            userId,
            actionIdentifier,
        };

        this._entries.push(entry);

        if (this._entries.length > MAX_RING_BUFFER_SIZE) {
            this._entries.splice(0, this._entries.length - MAX_RING_BUFFER_SIZE);
        }

        Log.info(`[${eventName}] user=${userId ?? `unknown`} action=${actionIdentifier ?? `none`}`, LOG_TAG);
    }
}

export const auditService = new AuditService();
