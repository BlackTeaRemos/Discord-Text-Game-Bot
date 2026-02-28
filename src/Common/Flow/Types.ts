import type { Interaction, Message } from 'discord.js';
import type { ExecutionContext } from '../../Domain/Command.js';

/**
 * @brief Represents a single step in an interactive flow
 */
export interface FlowStep<State> {
    /**
     * @brief Unique identifier for interaction component expected in this step
     */
    customId?: string | string[]; // optional component ids to match interactions
    /**
     * @brief Optional human readable tag unique per flow definition for referencing this step
     * @example 'selectOrganization'
     */
    tag?: string;
    /**
     * @brief Handler invoked when this step activates to send prompts via interaction or message
     * @example prompts the user with a message and buttons
     */
    prompt: (ctx: StepContext<State>) => Promise<void>;
    /**
     * @brief Handler invoked when a button or modal interaction arrives returning true to advance
     */
    handleInteraction?: (ctx: StepContext<State>, interaction: Interaction) => Promise<boolean>;
    /**
     * @brief Handler invoked when a message arrives returning true to advance
     */
    handleMessage?: (ctx: StepContext<State>, message: Message) => Promise<boolean>;
}

/**
 * @brief Flow instance context passed to step handlers
 */
export interface StepContext<State> {
    userId: string; // discord user id
    state: State; // mutable flow state
    interaction?: Interaction; // the initial or current interaction
    advance: () => Promise<void>; // move to next step
    cancel: () => Promise<void>; // cancel the flow
    /** Execution context for caching and shared state across flow steps */
    executionContext?: ExecutionContext;
    /** Tag assigned to the current step if any */
    tag?: string;
    /** Store arbitrary data for the current step so later tagged steps can reuse it */
    remember: (key: string, value: unknown) => void;
    /** Retrieve stored data from a previous tagged step */
    recall: <T = unknown>(tag: string, key: string) => T | undefined;
    /** Retrieve the recorded details for a previous tagged step */
    getStep: (tag: string) => StepSnapshot<State> | undefined;
}

/**
 * @brief Snapshot describing a previously executed tagged step
 */
export interface StepSnapshot<State> {
    tag: string;
    stepIndex: number;
    data: Record<string, unknown>;
    lastInteraction?: Interaction;
    lastMessage?: Message;
    state: State;
}
