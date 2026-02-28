/** Utility.ts  Central utility types and result wrappers for the VPI system */

/** Central enumeration of well known event names for typed event bus helpers */
export const EVENT_NAMES = {
    guildProvisioned: `guild.provisioned`,
    objectCreated: `object.created`,
    objectUpdated: `object.updated`,
    objectDeleted: `object.deleted`,
    indexUpdated: `index.updated`,
    commandLoaded: `command.loaded`,
    commandReloaded: `command.reloaded`,
    editSessionStarted: `edit.session.started`,
    editSessionEnded: `edit.session.ended`,
    securityPolicyCheck: `security.policyCheck`,
    automationTaskExecuted: `automation.task.executed`,
    automationViewGenerated: `automation.view.generated`,
    triggerExecuted: `trigger.executed`,
    scriptExecuted: `script.executed`,
} as const;

/** Type union of event string literals */
export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
