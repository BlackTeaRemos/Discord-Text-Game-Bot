/** Utility.ts  Central utility types and result wrappers for the VPI system */

/** Central enumeration of all event names flowing through MAIN_EVENT_BUS */
export const EVENT_NAMES = {
    discordReady: `discord:ready`,
    discordError: `discord:error`,
    discordMessageRaw: `discord:message:raw`,
    discordInteraction: `discord:interaction`,
    configLoaded: `config:loaded`,
    configError: `config:error`,
    output: `output`,
    input: `input`,
    systemShutdown: `system:shutdown`,
    commandLoaded: `command.loaded`,
    commandReloaded: `command.reloaded`,
    userCommandExecute: `user:command:execute`,
    userAutocomplete: `user:autocomplete`,
    userComponentInteraction: `user:component:interaction`,
    userFlowInteraction: `user:flow:interaction`,
    userFlowMessage: `user:flow:message`,
} as const;

/** Type union of event string literals */
export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
