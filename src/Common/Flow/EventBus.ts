import ComplexEventEmitter, { EventIdentifier } from '../ComplexEventEmitter.js';
import { LogLevel, Log } from '../Log.js';
import type { FlowStep } from './Types.js';
import {
    anyAdvanceId,
    anyCancelId,
    anyStepInteractionId,
    anyStepMessageId,
    anyStepPromptId,
    FlowAdvancePayload,
    FlowCancelPayload,
    FlowInteractionPayload,
    FlowMessagePayload,
    FlowPromptPayload,
} from './Events.js';

/**
 * Provides a typed structure describing the event being logged by FlowEventBus registerLoggingDelegates
 */
export type FlowLoggingEvent<State> =
    | { kind: `prompt`; payload: FlowPromptPayload<State> }
    | { kind: `interaction`; payload: FlowInteractionPayload<State> }
    | { kind: `message`; payload: FlowMessagePayload<State> }
    | { kind: `advance`; payload: FlowAdvancePayload<State> }
    | { kind: `cancel`; payload: FlowCancelPayload<State> };

/**
 * Options controlling how flow logging delegates behave
 * @tparam State Flow state shared between steps
 */
export interface FlowLoggingOptions<State> {
    level?: LogLevel;
    source?: string;
    formatter?: (event: FlowLoggingEvent<State>) => string;
}

const DEFAULT_LOG_SOURCE = `FlowEventBus`;

function defaultFlowLogFormatter<State>(event: FlowLoggingEvent<State>): string {
    switch (event.kind) {
        case `prompt`:
            return `Prompt step ${event.payload.stepIndex} for ${event.payload.userId}`;
        case `interaction`:
            return `Interaction on step ${event.payload.stepIndex} for ${event.payload.userId}`;
        case `message`:
            return `Message on step ${event.payload.stepIndex} for ${event.payload.userId}`;
        case `advance`:
            return `Advance from step ${event.payload.fromStepIndex} for ${event.payload.userId}`;
        case `cancel`:
            return `Cancel flow for ${event.payload.userId}`;
        default:
            return `Unknown flow event`;
    }
}

/**
 * FlowEventBus wraps ComplexEventEmitter to dispatch flow lifecycle and step events
 */
export class FlowEventBus<State> extends ComplexEventEmitter<any> {
    private loggingRegistered = false; // ensures debug listeners are attached once
    private defaultDelegatesRegistered = false; // prevents duplicate default listeners

    /**
     * Emit a typed event
     */
    public emitEvent(eventId: EventIdentifier, payload: any) {
        this.emit(eventId, payload);
    }

    /**
     * Register default listeners that call step handlers which can be overridden by the app
     */
    public registerDefaultDelegates() {
        if (this.defaultDelegatesRegistered) {
            return;
        }
        this.defaultDelegatesRegistered = true;
        // Prompt handler invokes step prompt for the context
        this.on(anyStepPromptId, (payload: FlowPromptPayload<State>) => {
            const { step, ctx } = payload;
            void step.prompt(ctx);
        });

        // Interaction handler calls step handleInteraction and advances if successful
        this.on(anyStepInteractionId, (payload: FlowInteractionPayload<State>) => {
            const { step, ctx, interaction } = payload;
            if (!step.handleInteraction) {
                return;
            }
            void (async() => {
                const ok = await step.handleInteraction!(ctx, interaction);
                if (ok) {
                    await ctx.advance();
                }
            })();
        });

        // Message handler calls step handleMessage and advances if successful
        this.on(anyStepMessageId, (payload: FlowMessagePayload<State>) => {
            const { step, ctx, message } = payload;
            if (!step.handleMessage) {
                return;
            }
            void (async() => {
                const ok = await step.handleMessage!(ctx, message);
                if (ok) {
                    await ctx.advance();
                }
            })();
        });
        // Advance and Cancel events are emitted for observability with no default behavior
    }

    /**
     * Attach debug logging listeners for every flow event
     * @param options FlowLoggingOptions Optional configuration controlling log level source and message formatting
     * @returns void No return value
     * @example
     * flowManager.events.registerLoggingDelegates({
     *     formatter: event => `Flow ${event.kind} by ${event.payload.userId}`,
     * });
     */
    public registerLoggingDelegates(options: FlowLoggingOptions<State> = {}): void {
        if (this.loggingRegistered) {
            return;
        }
        const level = options.level ?? LogLevel.Debug;
        const source = options.source ?? DEFAULT_LOG_SOURCE;
        const formatter = options.formatter ?? defaultFlowLogFormatter;
        const emitLog = (event: FlowLoggingEvent<State>) => {
            const message = formatter(event);
            if (!message) {
                return;
            }
            Log(level, message, source);
        };

        this.on(anyStepPromptId, (payload: FlowPromptPayload<State>) => {
            return emitLog({ kind: `prompt`, payload });
        });
        this.on(anyStepInteractionId, (payload: FlowInteractionPayload<State>) => {
            return emitLog({ kind: `interaction`, payload });
        },
        );
        this.on(anyStepMessageId, (payload: FlowMessagePayload<State>) => {
            return emitLog({ kind: `message`, payload });
        });
        this.on(anyAdvanceId, (payload: FlowAdvancePayload<State>) => {
            return emitLog({ kind: `advance`, payload });
        });
        this.on(anyCancelId, (payload: FlowCancelPayload<State>) => {
            return emitLog({ kind: `cancel`, payload });
        });

        this.loggingRegistered = true;
    }
}
