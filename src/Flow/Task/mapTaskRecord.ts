import type { TaskListItem, TaskStatus } from '../../Domain/Task.js';
import { DEFAULT_TASK_STATUS } from './taskConstants.js';

export interface TaskQueryRow {
    task: { properties: Record<string, any> };
    organization?: { properties?: Record<string, any> } | null;
    creator?: { properties?: Record<string, any> } | null;
    executor?: { properties?: Record<string, any> } | null;
}

function PickName(node?: { properties?: Record<string, any> } | null): string | undefined {
    if (!node?.properties) {
        return undefined;
    }
    const friendly = node.properties.friendly_name ?? node.properties.friendlyName;
    if (friendly) {
        return String(friendly);
    }
    const label = node.properties.name ?? node.properties.label;
    return label ? String(label) : undefined;
}

function ToStatus(value: unknown): TaskStatus {
    return String(value ?? DEFAULT_TASK_STATUS) as TaskStatus;
}

/**
 * Resolve short description from stored properties
 * @param taskProps Record<string, any> Task node properties example { short_description: 'Fix bug' }
 * @returns string Short description value example Fix bug
 */
function ResolveShortDescription(taskProps: Record<string, any>): string {
    const stored = taskProps.short_description ?? taskProps.shortDescription;
    if (stored !== undefined && stored !== null) {
        return String(stored).trim();
    }

    const description = String(taskProps.description ?? ``).trim();
    if (!description) {
        return ``;
    }

    const firstLine = description.split(/\r?\n/)[0] ?? ``;
    const sentenceMatch = firstLine.match(/^[\s\S]*?[.!?](?=\s|$)/);
    let candidate = (sentenceMatch?.[0] ?? firstLine).trim();

    const words = candidate.split(/\s+/).filter(Boolean);
    if (words.length > 5) {
        candidate = words.slice(0, 5).join(` `);
    }
    if (candidate.length > 32) {
        candidate = candidate.slice(0, 32).trim();
    }
    return candidate;
}

export function MapTaskRecord(row: TaskQueryRow): TaskListItem {
    const taskProps = row.task.properties ?? {};
    const createdAt = Number(taskProps.created_at ?? taskProps.createdAt ?? Date.now());
    const updatedAt = Number(taskProps.updated_at ?? taskProps.updatedAt ?? createdAt);
    const version = Number(taskProps.version ?? 1);
    const rawTurn = taskProps.turn_number ?? taskProps.turnNumber;
    const parsedTurn = rawTurn === undefined || rawTurn === null ? null : Number(rawTurn);
    return {
        id: String(taskProps.id),
        organizationUid: String(taskProps.organization_uid ?? ``),
        gameUid: taskProps.game_uid ? String(taskProps.game_uid) : null,
        turnNumber: Number.isFinite(parsedTurn) && parsedTurn !== null ? parsedTurn : null,
        creatorDiscordId: String(taskProps.creator_discord_id ?? ``),
        executorDiscordId: taskProps.executor_discord_id ? String(taskProps.executor_discord_id) : null,
        objectUid: taskProps.object_uid ? String(taskProps.object_uid) : null,
        shortDescription: ResolveShortDescription(taskProps),
        description: String(taskProps.description ?? ``),
        status: ToStatus(taskProps.status),
        createdAt,
        updatedAt,
        version,
        organizationName: PickName(row.organization),
        creatorName: PickName(row.creator),
        executorName: PickName(row.executor),
    };
}
