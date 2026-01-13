/**
 * Encode and decode task action values for Discord custom ids
 * Custom ids must be stable and must preserve underscores
 */

const TASK_ACTION_BUTTON_PREFIX = `task_action_btn_`;

/**
 * Create a stable button custom id for a task action value
 * @param action string Task action. @example 'view_org'
 * @returns string Custom id. @example 'task_action_btn_dmlld19vcmc'
 */
export function MakeTaskActionButtonId(action: string): string {
    const safeAction = String(action ?? ``);
    const encoded = Buffer.from(safeAction, `utf8`).toString(`base64url`);
    return `${TASK_ACTION_BUTTON_PREFIX}${encoded}`;
}

/**
 * Parse a task action value back from a custom id
 * @param customId string Incoming Discord custom id. @example 'task_action_btn_dmlld19vcmc'
 * @returns string | null Parsed action or null if not a task action button id. @example 'view_org'
 */
export function ParseTaskActionButtonId(customId: string): string | null {
    const raw = String(customId ?? ``);
    if (!raw.startsWith(TASK_ACTION_BUTTON_PREFIX)) {
        return null;
    }

    const payload = raw.slice(TASK_ACTION_BUTTON_PREFIX.length);
    if (!payload) {
        return null;
    }

    try {
        const decoded = Buffer.from(payload, `base64url`).toString(`utf8`);
        const trimmed = decoded.trim();
        return trimmed.length > 0 ? trimmed : null;
    } catch {
        return null;
    }
}
