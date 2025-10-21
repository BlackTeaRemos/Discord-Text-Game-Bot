import { getOrganizationWithMembers } from '../../Flow/Object/Organization/View.js';

export const EXECUTOR_UNASSIGNED_VALUE = `__unassigned`;

export interface ExecutorOption {
    label: string;
    value: string;
}

function makeLabel(name?: string | null, fallback?: string): string {
    if (name && name.trim().length > 0) {
        return name.trim().slice(0, 50);
    }
    return (fallback ?? `Unknown user`).slice(0, 50);
}

export async function buildExecutorOptions(
    organizationUid: string,
    requesterDiscordId: string,
): Promise<ExecutorOption[]> {
    const options: ExecutorOption[] = [];
    const seen = new Set<string>();

    const addOption = (label: string, value: string) => {
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) {
            return;
        }
        seen.add(trimmed);
        options.push({ label: label.slice(0, 50), value: trimmed });
    };

    addOption(`Leave unassigned`, EXECUTOR_UNASSIGNED_VALUE);
    addOption(`Assign to me`, requesterDiscordId);

    try {
        const organization = await getOrganizationWithMembers(organizationUid);
        const members = organization?.users ?? [];
        for (const member of members) {
            const discordId = String(member.discord_id ?? ``);
            if (!discordId || discordId === requesterDiscordId) {
                continue;
            }
            const label = makeLabel(member.friendly_name ?? member.name, discordId);
            addOption(label, discordId);
            if (options.length >= 25) {
                break;
            }
        }
    } catch {}

    return options.slice(0, 25);
}

export function resolveExecutorSelection(selection: string): string | null {
    return selection === EXECUTOR_UNASSIGNED_VALUE ? null : selection;
}
