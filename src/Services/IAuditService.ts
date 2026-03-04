import type { EventName } from '../Domain/index.js';

export interface IAuditEntry {
    timestamp: number;
    eventName: EventName;
    userId: string | undefined;
    actionIdentifier: string | undefined;
}

export interface IAuditService {
    Start(): void;
    GetRecentEntries(count: number): IAuditEntry[];
}
