/**
 * Encode and decode task status values for Discord custom ids.
 * Custom ids must be stable and must preserve underscores.
 */

const TASK_STATUS_BUTTON_PREFIX = `task_status_btn_`;

/**
 * Create a stable button custom id for a status value.
 * @param status string Task status. @example 'in_progress'
 * @returns string Custom id. @example 'task_status_btn_aW5fcHJvZ3Jlc3M'
 */
export function MakeTaskStatusButtonId(status: string): string {
    const safeStatus = String(status ?? ``);
    const encoded = Buffer.from(safeStatus, `utf8`).toString(`base64url`);
    return `${TASK_STATUS_BUTTON_PREFIX}${encoded}`;
}

/**
 * Parse a status value back from a custom id.
 * @param customId string Incoming Discord custom id. @example 'task_status_btn_aW5fcHJvZ3Jlc3M'
 * @returns string | null Parsed status or null if not a status button id. @example 'in_progress'
 */
export function ParseTaskStatusButtonId(customId: string): string | null {
    const raw = String(customId ?? ``);
    if (!raw.startsWith(TASK_STATUS_BUTTON_PREFIX)) {
        return null;
    }
    const payload = raw.slice(TASK_STATUS_BUTTON_PREFIX.length);
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
